import * as path from 'path';
import express, {Request} from 'express';
import cors from 'cors';
import gdal from 'gdal-async';

import * as db from './db';
import {Point, triPoints, triScaleSegments, triSegmentFlight, interpolate} from '../lib/flight';
import config from '../config.json';
import {terrainUnderPath} from '../lib/dem';
import {categoriesGlider, categoriesScore, directionsWind} from '../lib/types';

const app = express();
app.use(cors());

function filters(req: Request, table?: string): string {
    const selector = table ? `${table}.` : '';
    const clauses: string[] = [];
    for (const p of Object.keys(req.query)) {
        switch (p) {
            case 'wind':
                {
                    const windClauses = [];
                    for (const wind in directionsWind) {
                        if (+req.query['wind'][wind] === 1)
                            windClauses.push(
                                `(${selector}wind_direction + 22.5) % 360 BETWEEN ${+wind * 45} AND ${(+wind + 1) * 45}`
                            );
                    }
                    clauses.push(`( ${windClauses.join(' OR ')} )`);
                }
                break;
            case 'score':
                {
                    const scoreClauses = [];
                    for (const group in categoriesScore) {
                        if (+req.query['score'][group] === 1)
                            scoreClauses.push(
                                `${selector}score BETWEEN ${categoriesScore[group].from || 0} AND ${
                                    categoriesScore[group].to || 1e6
                                }`
                            );
                    }
                    clauses.push(`( ${scoreClauses.join(' OR ')} )`);
                }
                break;
            case 'cat':
                {
                    const categoryClauses = [];
                    for (const cat in categoriesGlider) {
                        if (+req.query['cat'][cat] === 1)
                            categoryClauses.push(`${selector}category = '${categoriesGlider[cat]}'`);
                    }
                    clauses.push(`( ${categoryClauses.join(' OR ')} )`);
                }
                break;
        }
    }

    return clauses.length > 0 ? clauses.join(' AND ') : '';
}

function ordering(req: Request): string {
    switch (req.query.order) {
        case 'score':
            return ' ORDER BY score DESC';
        default:
        case 'flights':
            return ' ORDER BY flights DESC';
        case 'avg':
            return ' ORDER BY score * flights DESC';
    }
}

app.get('/geojson/launch/list', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT launch_info.id as id, count(flight_info.launch_id) as flights, sum(flight_info.score) as score, lat, lng' +
            ' FROM launch_info LEFT JOIN flight_info ON (launch_info.id = flight_info.launch_id)' +
            ` WHERE ${filters(req, 'flight_info')}` +
            ' GROUP BY launch_info.id HAVING flights > 0 ORDER BY score DESC'
    );
    const geojson = {
        type: 'FeatureCollection',
        features: r.map((row) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [row['lng'], row['lat']]
            },
            properties: {
                id: row['id'],
                name: row['name'],
                flights: row['flights'],
                score: row['score']
            }
        }))
    };
    res.json(geojson);
});

app.get('/launch/search/:str', async (req, res) => {
    const query = `%${req.params.str}%`;
    const r = await db.poolQuery('SELECT * FROM launch WHERE name LIKE ? OR sub LIKE ? LIMIT 1000', [query, query]);
    res.json(r);
});

app.get('/launch/:id', async (req, res) => {
    const launch = (await db.poolQuery('SELECT * FROM launch_info WHERE id = ?', [req.params.id]))[0];
    if (!launch) return res.json({});
    const name = await db.poolQuery(
        'SELECT name, great_circle(lat, lng, ?, ?) AS launch_distance FROM launch_official ORDER BY launch_distance ASC LIMIT 1',
        [launch['lat'], launch['lng']]
    );
    if (!name[0]) throw new Error('launches not initialized');
    if (name[0]['launch_distance'] < 3) {
        launch['name'] = name[0]['name'];
    }
    res.json(launch);
});

app.get('/flight/list', async (req, res) => {
    const r = await db.poolQuery(`SELECT * FROM flight_info WHERE ${filters(req)} ORDER BY SCORE LIMIT 1000`);
    res.json(r);
});

app.get('/flight/:id', async (req, res) => {
    const r = await db.poolQuery('SELECT * FROM flight_info WHERE id = ?', [req.params.id]);
    res.json(r);
});

app.get('/flight/launch/:launch', async (req, res) => {
    const r = await db.poolQuery(`SELECT * FROM flight_info WHERE launch_id = ? AND ${filters(req)} ORDER BY SCORE`, [
        req.params.launch
    ]);
    res.json(r);
});

app.get('/flight/route/:route/launch/:launch', async (req, res) => {
    const r = await db.poolQuery(
        `SELECT * FROM flight_info WHERE route_id = ? AND launch_id = ? AND ${filters(req)} ORDER BY SCORE`,
        [req.params.route, req.params.launch]
    );
    res.json(r);
});

app.get('/flight/route/:route', async (req, res) => {
    const r = await db.poolQuery(`SELECT * FROM flight_info WHERE route_id = ? AND ${filters(req)} ORDER BY SCORE`, [
        req.params.route
    ]);
    res.json(r);
});

app.get('/route/list', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT route_info.*, count(*) AS flights_selected FROM route_info JOIN flight_info' +
            ` WHERE ${filters(req, 'flight_info')} GROUP BY route_info.id ${ordering(req)} LIMIT 1000`
    );
    res.json(r);
});

app.get('/route/launch/:launch', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT route_info.*, count(*) AS flights_selected' +
            ' FROM flight_info JOIN route_info ON (flight_info.route_id = route_info.id)' +
            ` WHERE launch_id = ? AND ${filters(req)} GROUP BY route_id ${ordering(req)}`,
        [req.params.launch]
    );
    res.json(r);
});

// Produce an aggregated vertical profile of all flights on a route
app.get(['/point/route/:route/launch/:launch', '/point/route/:route'], async (req, res) => {
    const flights =
        req.params.launch !== undefined
            ? await db.poolQuery(`SELECT * from flight_info WHERE launch_id = ? AND route_id = ? AND ${filters(req)}`, [
                  req.params.launch,
                  req.params.route
              ])
            : await db.poolQuery(`SELECT * from flight_info WHERE route_id = ? AND ${filters(req)}`, [
                  req.params.route
              ]);
    if (flights.length === 0) return res.json([]);
    const flight_segments: Point[][][] = [];
    {
        // This one can return tens, even hundreds of MBs of data - so no JOINs
        const points =
            req.params.launch !== undefined
                ? await db.poolQuery(
                      'SELECT flight_info.id as flight_id, point.id, alt' +
                          ' FROM flight_info LEFT JOIN point ON (flight_info.id = point.flight_id) ' +
                          ` WHERE launch_id = ? AND route_id = ? AND ${filters(req, 'flight_info')}`,
                      [req.params.launch, req.params.route]
                  )
                : await db.poolQuery(
                      'SELECT flight_info.id as flight_id, point.id, alt' +
                          ' FROM flight_info LEFT JOIN point ON (flight_info.id = point.flight_id) ' +
                          ` WHERE route_id = ? AND ${filters(req)}`,
                      [req.params.route]
                  );
        const flight_points = {};
        for (let i = 0; i < flights.length; i++) {
            flight_points[flights[i]['id']] = [];
        }
        for (let i = 0; i < points.length; i++) {
            flight_points[points[i]['flight_id']][points[i]['id']] = points[i];
        }
        for (const id of Object.keys(flight_points)) {
            const f = flights.find((x) => x['id'] == id);
            flight_segments.push(triSegmentFlight(f, flight_points[id]));
        }
    }
    const best = flights[0];

    // Place the 3 TPs of the best flight on the 1024 point linear scale
    const segments = triScaleSegments(best);

    // Fill each segment
    for (let i = 0; i < triPoints.length - 1; i++) {
        segments[i].alt = Array(segments[i].finish - segments[i].start).fill(0);
        segments[i].min = Array(segments[i].finish - segments[i].start).fill(Infinity);
        segments[i].max = Array(segments[i].finish - segments[i].start).fill(-Infinity);
        for (const f of flight_segments) {
            const seg = interpolate(f[i], segments[i].finish - segments[i].start);
            for (const p in seg) {
                const alt = seg[p] ? seg[p].alt : 0;
                segments[i].alt[p] += alt;
                segments[i].min[p] = Math.min(segments[i].min[p], alt);
                segments[i].max[p] = Math.max(segments[i].max[p], alt);
            }
        }
        for (const p in segments[i].alt) {
            segments[i].alt[p] = Math.round(segments[i].alt[p] / flights.length);
        }
    }

    res.json(segments);
});

app.get('/point/flight/:flight', async (req, res) => {
    const flight = (await db.poolQuery('SELECT * from flight_info WHERE id = ?', [req.params.flight]))[0];
    const points = await db.poolQuery(
        'SELECT flight.id as flight_id, point.id, alt, lat, lng' +
            ' FROM flight LEFT JOIN point ON (flight.id = point.flight_id) WHERE flight.id = ?',
        [req.params.flight]
    );
    const flight_points = triSegmentFlight(flight, points);
    const segments = triScaleSegments(flight);

    for (let i = 0; i < triPoints.length - 1; i++) {
        const seg = interpolate(flight_points[i], segments[i].finish - segments[i].start);
        await terrainUnderPath(seg);
        segments[i].alt = seg.map((x) => x.alt);
        segments[i].terrain = seg.map((x) => x.terrain);
        segments[i].lat = seg.map((x) => x.lat);
        segments[i].lng = seg.map((x) => x.lng);
    }

    res.json(segments);
});

app.get('/height', async (req, res) => {
    const lat = +req.query.lat;
    const lng = +req.query.lng;
    const file = `${lat > 0 ? 'N' : 'S'}${Math.floor(lat).toFixed(0)}${lng > 0 ? 'E' : 'W'}${Math.floor(lng)
        .toFixed(0)
        .padStart(3, '0')}.hgt`;
    const ds = gdal.open(path.resolve(config.dbserver.srtm_dir, file));
    const xform = new gdal.CoordinateTransformation(gdal.SpatialReference.fromEPSG(4326), ds);
    const pt = xform.transformPoint(lng, lat);
    const data = ds.bands.get(1).pixels.read(Math.round(pt.x), Math.round(pt.y), 1, 1);
    res.json({height: data[0]});
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Invalid request');
});

app.listen(config.dbserver.port, () => {
    console.log(`xcdb dbserver listening on port ${config.dbserver.port}`);
});
