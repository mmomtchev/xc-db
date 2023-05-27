import * as path from 'path';
import express, {Request} from 'express';
import cors from 'cors';
import responseTime from 'response-time';
import gdal from 'gdal-async';
import vtpbf from 'vt-pbf';
import toBuffer from 'typedarray-to-buffer';

import * as db from '../lib/db';
import {Point, triPoints, fullPoints, scaleSegments, segmentFlight, interpolate} from '../lib/flight';
import {terrainUnderPath} from '../lib/dem';
import {categoriesGlider, categoriesScore, directionsWind, namesMonth} from '../lib/types';
import {tileToLongitude, tileToLatitude, pointDecimation, latToTileTransformer, lngToTileTransformer} from '../lib/geo';

const version = global.__BUILD__ === undefined ? 'development' : global.__BUILD__;
const app = express();
app.use(cors());
if (process.env.DEBUG) {
    app.use(
        responseTime(((req, res, time) => {
            console.debug(req.method, req.url, time.toFixed(2) + 'ms');
        }) as unknown) as (req: Express.Request, res: Express.Response) => void
    );
}

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
            case 'month':
                {
                    const monthClauses = [];
                    for (const month in namesMonth) {
                        if (+req.query['month'][month] === 1) monthClauses.push(`(${selector}month = ${+month + 1})`);
                    }
                    clauses.push(`( ${monthClauses.join(' OR ')} )`);
                }
                break;
        }
    }

    return clauses.length > 0 ? clauses.join(' AND ') : 'TRUE';
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

app.get('/version', (req, res) => {
    res.json({version});
});

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

app.get('/launch/:id([0-9]+)', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT launch_info.*, cardinal_direction(direction) AS cardinal,count(*) AS occurrence' +
            ' FROM launch_info LEFT JOIN wind ON (ROUND(launch_info.lat * 4)/4 = wind.lat AND ROUND(launch_info.lng * 4)/4 = wind.lng)' +
            ' WHERE id=? GROUP BY cardinal ORDER BY cardinal ASC',
        [req.params.id]
    );
    const launch = r[0];
    if (!launch) return res.json({});
    const name = await db.poolQuery(
        'SELECT name, great_circle(lat, lng, ?, ?) AS launch_distance FROM launch_official ORDER BY launch_distance ASC LIMIT 1',
        [launch['lat'], launch['lng']]
    );
    if (!name[0]) throw new Error('launches not initialized');
    if (name[0]['launch_distance'] < 3) {
        launch['name'] = name[0]['name'];
    }
    launch['wind'] = r.map((l) => l['occurrence']);
    delete launch['occurrence'];
    delete launch['cardinal'];
    res.json(launch);
});

app.get('/flight/list', async (req, res) => {
    const r = await db.poolQuery(`SELECT * FROM flight_info WHERE ${filters(req)} ORDER BY score DESC LIMIT 1000`);
    res.json(r);
});

app.get('/flight/:id([0-9]+)', async (req, res) => {
    const r = await db.poolQuery('SELECT * FROM flight_info WHERE id = ?', [req.params.id]);
    res.json(r);
});

app.get('/flight/launch/:launch([0-9]+)', async (req, res) => {
    const r = await db.poolQuery(
        `SELECT * FROM flight_info WHERE launch_id = ? AND ${filters(req)} ORDER BY score DESC`,
        [req.params.launch]
    );
    res.json(r);
});

app.get('/flight/route/:route([0-9]+)/launch/:launch([0-9]+)', async (req, res) => {
    const r = await db.poolQuery(
        `SELECT * FROM flight_info WHERE route_id = ? AND launch_id = ? AND ${filters(req)} ORDER BY score DESC`,
        [req.params.route, req.params.launch]
    );
    res.json(r);
});

app.get('/flight/route/:route([0-9]+)', async (req, res) => {
    const r = await db.poolQuery(
        `SELECT * FROM flight_info WHERE route_id = ? AND ${filters(req)} ORDER BY score DESC`,
        [req.params.route]
    );
    res.json(r);
});

app.get('/route/list', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT route_info.*, COUNT(*) AS flights_selected FROM route_info JOIN flight_info' +
            ` WHERE ${filters(req, 'flight_info')} GROUP BY route_info.id ${ordering(req)} LIMIT 1000`
    );
    res.json(r);
});

app.get('/route/launch/:launch([0-9]+)', async (req, res) => {
    const r = await db.poolQuery(
        'SELECT route_info.*, COUNT(*) AS flights_selected,' +
            ' wind_distribution(wind_direction) AS wind_directions' +
            ' FROM flight_info JOIN route_info ON (flight_info.route_id = route_info.id)' +
            ` WHERE launch_id = ? AND ${filters(req)} GROUP BY route_id ${ordering(req)}`,
        [req.params.launch]
    );
    res.json(r);
});

// Produce an aggregated vertical profile of all flights on a route
app.get(['/point/route/:route([0-9]+)/launch/:launch([0-9]+)', '/point/route/:route([0-9]+)'], async (req, res) => {
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
            flight_segments.push(segmentFlight(triPoints, f, flight_points[id]));
        }
    }
    const best = flights[0];

    // Place the 3 TPs of the best flight on the 1024 point linear scale
    const segments = scaleSegments(triPoints, best);

    // Fill each segment
    for (let i = 0; i < triPoints.length - 1; i++) {
        segments[i].alt = Array(segments[i].finish - segments[i].start).fill(0);
        segments[i].min = Array(segments[i].finish - segments[i].start).fill(Infinity);
        segments[i].max = Array(segments[i].finish - segments[i].start).fill(-Infinity);
        for (const f of flight_segments) {
            const seg = interpolate(f[i], segments[i].finish - segments[i].start);
            for (let p = 0; p < seg.length; p++) {
                const alt = seg[p] ? seg[p].alt : 0;
                segments[i].alt[p] += alt;
                segments[i].min[p] = Math.min(segments[i].min[p], alt);
                segments[i].max[p] = Math.max(segments[i].max[p], alt);
            }
        }
        for (let p = 0; p < segments[i].alt.length; p++) {
            segments[i].alt[p] = Math.round(segments[i].alt[p] / flights.length);
        }
    }

    res.json(segments);
});

app.get('/point/flight/:flight([0-9]+)', async (req, res) => {
    const flight = (await db.poolQuery('SELECT * from flight_info WHERE id = ?', [req.params.flight]))[0];
    const points = await db.poolQuery(
        'SELECT flight.id as flight_id, point.id, alt, lat, lng' +
            ' FROM flight LEFT JOIN point ON (flight.id = point.flight_id) WHERE flight.id = ?',
        [req.params.flight]
    );
    const flight_points = [];
    for (let i = 0; i < points.length; i++) {
        flight_points[points[i]['id']] = points[i];
    }
    const flight_segments = segmentFlight(fullPoints, flight, flight_points);
    const segments = scaleSegments(fullPoints, flight);

    for (let i = 0; i < fullPoints.length - 1; i++) {
        const seg = interpolate(flight_segments[i], segments[i].finish - segments[i].start);
        await terrainUnderPath(seg);
        segments[i].alt = seg.map((x) => x.alt);
        segments[i].terrain = seg.map((x) => x.terrain);
        segments[i].lat = seg.map((x) => x.lat);
        segments[i].lng = seg.map((x) => x.lng);
    }

    res.json(segments);
});

app.get('/:format(mvt|geojson)/point/route/:route([0-9]+)/:z([0-9]+)/:y([0-9]+)/:x([0-9]+)', async (req, res) => {
    const x = +req.params.x;
    const y = +req.params.y;
    const z = +req.params.z;

    const left = tileToLongitude(z, x);
    const right = tileToLongitude(z, x + 1);
    const top = tileToLatitude(z, y);
    const bottom = tileToLatitude(z, y + 1);

    const r = await db.poolQuery(
        'SELECT flight_id,lat,lng from point JOIN flight_info ON (point.flight_id = flight_info.id)' +
            ` WHERE route_id = ? AND ${filters(req)}` +
            ' AND (lat BETWEEN ? AND ?) AND (lng BETWEEN ? AND ?) LIMIT 1000000',
        [req.params.route, bottom, top, left, right]
    );

    const simplified = pointDecimation(z, left, top, r as Point[]);

    switch (req.params.format) {
        case 'mvt':
            {
                // MVT expects tile pixel coordinates (4096x4096 inside each tile)
                const lngToTile = lngToTileTransformer(z, left);
                const latToTile = latToTileTransformer(z, top);
                const geojsonLike = {
                    features: simplified.map((row) => ({
                        type: 1,
                        geometry: [[lngToTile(row['lng']), latToTile(row['lat'])]],
                        tags: {
                            d: row['alt']
                        }
                    }))
                };

                const pbf = toBuffer(vtpbf.fromGeojsonVt({geojsonLayer: geojsonLike}));
                res.setHeader('Content-Type', 'application/octet-stream');
                res.end(pbf);
            }
            break;
        case 'geojson':
            {
                const geojson = {
                    type: 'FeatureCollection',
                    features: simplified.map((row) => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [row['lng'], row['lat']]
                        },
                        properties: {
                            d: row['alt']
                        }
                    }))
                };
                res.json(geojson);
            }
            break;
        default:
            throw new Error('invalid format');
    }
});

app.get('/height', async (req, res) => {
    const lat = +req.query.lat;
    const lng = +req.query.lng;
    const file = `${lat > 0 ? 'N' : 'S'}${Math.floor(lat).toFixed(0)}${lng > 0 ? 'E' : 'W'}${Math.floor(lng)
        .toFixed(0)
        .padStart(3, '0')}.hgt.zip`;
    const ds = gdal.open(path.resolve(db.config.dbserver.srtm_dir, file));
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

app.listen(db.config.dbserver.port, () => {
    console.log(`xcdb dbserver ${version} listening on port ${db.config.dbserver.port}`);
});
