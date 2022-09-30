import * as path from 'path';
import express from 'express';
import cors from 'cors';
import gdal from 'gdal-async';
import GeographicLib from 'geographiclib';

import config from './conf';
import * as db from './db';
import interpolate from '../lib/interpolate';

const app = express();
app.use(cors());
const geod = GeographicLib.Geodesic.WGS84;

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
app.get('/point/route/:route/launch/:launch', async (req, res) => {
    const triPoints = ['e1', 'p1', 'p2', 'p3', 'e2'];

    const flights = await db.query(
        'SELECT * from flight_info WHERE launch_id = ? AND route_id = ? ORDER BY score DESC',
        [req.params.launch, req.params.route]
    );
    const flight_segments = [];
    {
        // This one can return tens, even hundreds of MBs of data - so no JOINs
        const points = await db.query(
            'SELECT flight.id as flight_id, point.id, alt' +
                ' FROM flight LEFT JOIN point ON (flight.id = point.flight_id) WHERE launch_id = ? AND route_id = ?',
            [req.params.launch, req.params.route]
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
            const segments = [];
            for (let i = 0; i < triPoints.length - 1; i++)
                segments.push(
                    flight_points[id]
                        .slice(f[`${triPoints[i]}_point`], f[`${triPoints[i + 1]}_point`] + 1)
                        .map((x) => x['alt'])
                );
            flight_segments.push(segments);
        }
    }
    const best = flights[0];
    const route = (await db.query('SELECT * from route_info WHERE id = ?', [req.params.route]))[0];
    console.log('flights', flights);
    console.log('route', route);
    console.log('flight_points', flight_segments);

    // Place the 3 TPs of the best flight on the 512 point linear scale
    const segments = [];
    let distance = 0;
    for (let i = 0; i < triPoints.length - 1; i++) {
        const d =
            geod.Inverse(
                best[`${triPoints[i]}_lat`],
                best[`${triPoints[i]}_lng`],
                best[`${triPoints[i + 1]}_lat`],
                best[`${triPoints[i + 1]}_lng`]
            ).s12 / 1000;
        distance += d;
        segments[i] = {d};
    }

    const step = distance / config.tracklog.points;
    console.log('step', step);
    let start = 0;
    let current_distance = 0;
    for (let i = 0; i < triPoints.length - 1; i++) {
        current_distance += segments[i].d;
        const finish = Math.round(current_distance / step);
        segments[i].start = start;
        segments[i].finish = finish;
        start = finish;
    }
    console.log('segments', distance, best['distance'], segments);

    // Fill each segment
    for (let i = 0; i < triPoints.length - 1; i++) {
        segments[i].avg = Array(segments[i].finish - segments[i].start).fill(0);
        segments[i].min = Array(segments[i].finish - segments[i].start).fill(Infinity);
        segments[i].max = Array(segments[i].finish - segments[i].start).fill(-Infinity);
        for (const f of flight_segments) {
            const seg = interpolate(f[i], segments[i].finish - segments[i].start);
            for (const p in seg) {
                segments[i].avg[p] += seg[p];
                segments[i].min[p] = Math.min(segments[i].min[p], seg[p]);
                segments[i].max[p] = Math.max(segments[i].max[p], seg[p]);
            }
        }
        for (const p in segments[i].avg) {
            segments[i].avg[p] = Math.round(segments[i].avg[p] / flights.length);
        }
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
