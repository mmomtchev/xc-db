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
Object.defineProperty(exports, "__esModule", { value: true });
const db = __importStar(require("./db"));
async function recluster(routeId) {
    console.log(`Reclustering for route ${routeId}`);
    let route = (await db.query('SELECT AVG(p1_lat) as c1_lat, AVG(p1_lng) as c1_lng, AVG(p2_lat) as c2_lat, AVG(p2_lng) as c2_lng, AVG(p3_lat) as c3_lat, AVG(p3_lng) as c3_lng FROM flight WHERE route_id = ?', [
        routeId
    ]))[0];
    /*console.log(route);
    console.log(await db.query('SELECT * FROM flight WHERE distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3', [
        route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]));*/
    const add = await db.query('UPDATE flight SET route_id = ? WHERE distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3', [
        routeId, route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]);
    console.log(`Added ${add['changedRows']} flights`);
    const remove = await db.query('UPDATE flight SET route_id = NULL WHERE route_id = ? AND NOT (distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3)', [
        routeId, route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]);
    console.log(`Removed ${remove['changedRows']} flights`);
    return (add['changedRows'] + remove['changedRows']) > 0;
}
async function classify() {
    let r = await db.query('SELECT * FROM flight WHERE route_id IS NULL LIMIT 1');
    if (r.length === 0) {
        console.warn('No more unclassified flights');
        return false;
    }
    const flightId = r[0]['id'];
    r = await db.query('INSERT INTO route () VALUES ()');
    const routeId = r['insertId'];
    console.log(`created route ${routeId} for flight ${flightId}`);
    r = await db.query('UPDATE flight SET route_id = ? WHERE id = ?', [routeId, flightId]);
    return true;
}
async function main() {
    do {
        if (!(await classify()))
            break;
        const routes = await db.query('SELECT id FROM route');
        for (const r of routes)
            while (await recluster(r['id']))
                ;
    } while (true);
}
main();
