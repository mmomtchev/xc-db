
import express from 'express';
import cors from 'cors';

import config from './conf';
import * as db from './db';

const app = express();
app.use(cors());

app.get('/launch/list', async (req, res) => {
    const r = await db.query('SELECT launch.id as id, launch.name as name, count(flight.launch_id) as flights, sum(flight.score) as score, lat, lng ' +
        'FROM launch LEFT JOIN flight ON (launch.id = flight.launch_id) GROUP BY launch.name HAVING flights > 0 ORDER BY score DESC');
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
    const r = await db.query('SELECT * FROM launch WHERE id = ? OR name = ?', [req.params.id, req.params.id]);
    res.json(r);
});

app.get('/flight/list', async (req, res) => {
    const r = await db.query('SELECT * FROM flight ORDER BY score DESC LIMIT 100');
    res.json(r);
});

app.get('/flight/:id', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE id = ?', [req.params.id]);
    res.json(r);
});

app.get('/flight/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE launch_id = ?', [req.params.launch]);
    res.json(r);
});

app.get('/flight/route/:route', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE route_id = ?', [req.params.route]);
    res.json(r);
});

app.get('/route/list', async (req, res) => {
    const r = await db.query('SELECT route.id, ' +
        'AVG(p1_lat) as c1_lat, AVG(p1_lng) as c1_lng, AVG(p2_lat) as c2_lat, AVG(p2_lng) as c2_lng, AVG(p3_lat) as c3_lat, AVG(p3_lng) as c3_lng, ' +
        'MAX(score) AS maxscore, AVG(score) as score, COUNT(*) AS num ' +
        'FROM route LEFT JOIN flight ON (route.id = flight.route_id) GROUP BY route.id ORDER BY num DESC LIMIT 100');
    res.json(r);
});

app.get('/route/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT route.id, ' +
        'AVG(p1_lat) as c1_lat, AVG(p1_lng) as c1_lng, AVG(p2_lat) as c2_lat, AVG(p2_lng) as c2_lng, AVG(p3_lat) as c3_lat, AVG(p3_lng) as c3_lng, ' +
        'MAX(score) AS maxscore, AVG(score) as score, COUNT(*) AS num ' +
        'FROM route LEFT JOIN flight ON (route.id = flight.route_id) WHERE launch_id = ? GROUP BY route.id ORDER BY num DESC', [req.params.launch]);
    res.json(r);
});

app.listen(config.dbserver.port, () => {
    console.log(`Example app listening on port ${config.dbserver.port}`);
});
