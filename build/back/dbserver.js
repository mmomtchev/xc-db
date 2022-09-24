"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const conf_1 = __importDefault(require("./conf"));
const db = __importStar(require("./db"));
const app = (0, express_1.default)();
app.get('/launch/list', async (req, res) => {
    const r = await db.query('SELECT * FROM launch LIMIT 100');
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/launch/search/:str', async (req, res) => {
    const query = `%${req.params.str}%`;
    const r = await db.query('SELECT * FROM launch WHERE name LIKE ? OR sub LIKE ? LIMIT 100', [query, query]);
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/launch/:id', async (req, res) => {
    const r = await db.query('SELECT * FROM launch WHERE id = ?', [req.params.id]);
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/flight/list', async (req, res) => {
    const r = await db.query('SELECT * FROM flight ORDER BY score DESC LIMIT 100');
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/flight/:id', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE id = ?', [req.params.id]);
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/flight/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE launch_id = ?', [req.params.launch]);
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/flight/route/:route', async (req, res) => {
    const r = await db.query('SELECT * FROM flight WHERE route_id = ?', [req.params.route]);
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/route/list', async (req, res) => {
    const r = await db.query('SELECT route.id, ' +
        'AVG(p1_lat) as c1_lat, AVG(p1_lng) as c1_lng, AVG(p2_lat) as c2_lat, AVG(p2_lng) as c2_lng, AVG(p3_lat) as c3_lat, AVG(p3_lng) as c3_lng, ' +
        'MAX(score) AS maxscore, AVG(score) as score, COUNT(*) AS num ' +
        'FROM route LEFT JOIN flight ON (route.id = flight.route_id) GROUP BY route.id ORDER BY num DESC LIMIT 100');
    res.send(JSON.stringify(r));
    res.send();
});
app.get('/route/launch/:launch', async (req, res) => {
    const r = await db.query('SELECT route.id, ' +
        'AVG(p1_lat) as c1_lat, AVG(p1_lng) as c1_lng, AVG(p2_lat) as c2_lat, AVG(p2_lng) as c2_lng, AVG(p3_lat) as c3_lat, AVG(p3_lng) as c3_lng, ' +
        'MAX(score) AS maxscore, AVG(score) as score, COUNT(*) AS num ' +
        'FROM route LEFT JOIN flight ON (route.id = flight.route_id) WHERE launch_id = ? GROUP BY route.id ORDER BY num DESC', [req.params.launch]);
    res.send(JSON.stringify(r));
    res.send();
});
app.listen(conf_1.default.dbserver.port, () => {
    console.log(`Example app listening on port ${conf_1.default.dbserver.port}`);
});
