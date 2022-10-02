import * as path from 'path';
import express from 'express';
import cors from 'cors';
import gdal from 'gdal-async';

import * as db from './db';
import {Point, triPoints, triScaleSegments, triSegmentFlight, interpolate} from '../lib/flight';
import config from '../config.json';
import {terrainUnderPath} from '../lib/dem';

const app = express();
app.use(cors());

app.get('/launch/list', async (req, res) => {
    const r = await db.query(
        'SELECT launch_info.id as id, count(flight.launch_id) as flights, sum(flight.score) as score, lat, lng ' +
            'FROM launch_info LEFT JOIN flight ON (launch_info.id = flight.launch_id) GROUP BY launch_info.id HAVING flights > 0 ORDER BY score DESC'
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
    const r = await db.query('SELECT * FROM launch WHERE name LIKE ? OR sub LIKE ? LIMIT 100', [query, query]);
    res.json(r);
});

app.get('/launch/:id', async (req, res) => {
    const launch = (await db.query('SELECT * FROM launch_info WHERE id = ?', [req.params.id]))[0];
    if (!launch) return res.json({});
    const name = await db.query(
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
    const r = await db.query('SELECT * FROM flight_info ORDER BY score DESC LIMIT 100');
    res.json(r);
});

app.get('/flight/:id', async (req, res) => {
    const r = await db.query('SELECT * FROM flight_info WHERE id = ?', [req.params.id]);
    res.json(r);
});

app.get('/flight/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT * FROM flight_info WHERE launch_id = ? ORDER BY score DESC', [req.params.launch]);
    res.json(r);
});

app.get('/flight/route/:route/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT * FROM flight_info WHERE route_id = ? AND launch_id = ? ORDER BY score DESC', [
        req.params.route,
        req.params.launch
    ]);
    res.json(r);
});

app.get('/flight/route/:route', async (req, res) => {
    const r = await db.query('SELECT * FROM flight_info WHERE route_id = ? ORDER BY score DESC', [req.params.route]);
    res.json(r);
});

app.get('/route/list', async (req, res) => {
    const r = await db.query('SELECT * FROM route_info ORDER BY flights DESC LIMIT 100');
    res.json(r);
});

app.get('/route/launch/:launch', async (req, res) => {
    const r = await db.query(
        'SELECT *,count(*) AS flights_launch' +
            ' FROM flight JOIN route_info ON (flight.route_id = route_info.id)' +
            ' WHERE launch_id = ? GROUP BY route_id ORDER BY flights_launch DESC',
        [req.params.launch]
    );
    res.json(r);
});

// Produce an aggregated vertical profile of all flights on a route
app.get(['/point/route/:route/launch/:launch', '/point/route/:route'], async (req, res) => {
    const flights =
        req.params.launch !== undefined
            ? await db.query('SELECT * from flight_info WHERE launch_id = ? AND route_id = ? ORDER BY score DESC', [
                  req.params.launch,
                  req.params.route
              ])
            : await db.query('SELECT * from flight_info WHERE route_id = ? ORDER BY score DESC', [req.params.route]);
    const flight_segments: Point[][][] = [];
    {
        // This one can return tens, even hundreds of MBs of data - so no JOINs
        const points =
            req.params.launch !== undefined
                ? await db.query(
                      'SELECT flight.id as flight_id, point.id, alt' +
                          ' FROM flight LEFT JOIN point ON (flight.id = point.flight_id) WHERE launch_id = ? AND route_id = ?',
                      [req.params.launch, req.params.route]
                  )
                : await db.query(
                      'SELECT flight.id as flight_id, point.id, alt' +
                          ' FROM flight LEFT JOIN point ON (flight.id = point.flight_id) WHERE route_id = ?',
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
    const route = (await db.query('SELECT * from route_info WHERE id = ?', [req.params.route]))[0];
    console.log('flights', flights);
    console.log('route', route);
    console.log('flight_points', flight_segments);

    // Place the 3 TPs of the best flight on the 1024 point linear scale
    const segments = triScaleSegments(best);
    console.log('segments', best['distance'], segments);

    // Fill each segment
    for (let i = 0; i < triPoints.length - 1; i++) {
        segments[i].alt = Array(segments[i].finish - segments[i].start).fill(0);
        segments[i].min = Array(segments[i].finish - segments[i].start).fill(Infinity);
        segments[i].max = Array(segments[i].finish - segments[i].start).fill(-Infinity);
        for (const f of flight_segments) {
            const seg = interpolate(f[i], segments[i].finish - segments[i].start);
            for (const p in seg) {
                segments[i].alt[p] += seg[p].alt;
                segments[i].min[p] = Math.min(segments[i].min[p], seg[p].alt);
                segments[i].max[p] = Math.max(segments[i].max[p], seg[p].alt);
            }
        }
        for (const p in segments[i].alt) {
            segments[i].alt[p] = Math.round(segments[i].alt[p] / flights.length);
        }
    }

    res.json(segments);
});

app.get('/point/flight/:flight', async (req, res) => {
    const flight = (await db.query('SELECT * from flight_info WHERE id = ?', [req.params.flight]))[0];
    const points = await db.query(
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
