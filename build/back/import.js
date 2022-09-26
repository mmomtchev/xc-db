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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const igc_parser_1 = __importDefault(require("igc-parser"));
const igc_xc_score_1 = require("igc-xc-score");
const db = __importStar(require("./db"));
function triId(flight) {
    const top = flight.fixes.reduce((a, x) => (x.gpsAltitude || x.pressureAltitude) > (a.gpsAltitude || a.pressureAltitude) ? x : a, flight.fixes[0]);
    return [
        top.timestamp,
        top.latitude,
        top.longitude,
        (top.gpsAltitude || top.pressureAltitude)
    ];
}
function triHash(flight, score) {
    const id = triId(flight);
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(id));
    return hash.digest('hex');
}
async function importFlight(file) {
    const descJSON = fs.readFileSync(path.resolve(path.dirname(file), path.basename(file, '.igc') + '.json'), 'utf8');
    const desc = JSON.parse(descJSON);
    if (desc.type.toLowerCase() !== 'tri' && desc.type.toLowerCase() !== 'fai') {
        console.log(`${file}: type code is ${desc.type}`);
        return;
    }
    const igcData = fs.readFileSync(file, 'utf8');
    const flight = igc_parser_1.default.parse(igcData, { lenient: true });
    const score = (0, igc_xc_score_1.solver)(flight, igc_xc_score_1.scoringRules.FFVL, { trim: true }).next().value;
    if (score.opt.scoring.code !== 'tri' && score.opt.scoring.code !== 'fai') {
        console.log(`!!!!!!!!!!!!! ${file}: type code is ${score.opt.scoring.code} / ${score.opt.scoring.name} / ${desc}`);
        return;
    }
    const hash = triHash(flight, score);
    let r = await db.query('SELECT * FROM flight WHERE HEX(hash) = ?', [hash]);
    if (r.length > 0) {
        console.warn(`${file} : ${score.score} points, ${hash} already present`);
        return;
    }
    const launchFix = flight.fixes[score.opt['launch']];
    const launch = await db.query('SELECT id, name, sub, distance(lat, lng, ?, ?) AS launch_distance FROM launch ORDER BY launch_distance ASC LIMIT 1', [launchFix.latitude, launchFix.longitude]);
    console.log(`${file}: launch ${launch[0]['id']} from ${launch[0]['name']} / ${launch[0]['sub']}, distance ${(launch[0]['launch_distance']).toFixed(3)}km`);
    let launchId = launch[0]['id'];
    if (launch[0]['launch_distance'] > 1) {
        console.log(`${file}: cannot identify launch`);
        launchId = null;
    }
    r = await db.query('INSERT INTO flight (hash, launch_id, p1_lat, p1_lng, p2_lat, p2_lng, p3_lat, p3_lng, score, distance, category, wing)'
        + ' VALUES ( UNHEX(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )', [
        hash, launchId,
        score.scoreInfo.tp[0].y, score.scoreInfo.tp[0].x,
        score.scoreInfo.tp[1].y, score.scoreInfo.tp[1].x,
        score.scoreInfo.tp[2].y, score.scoreInfo.tp[2].x,
        score.score, score.scoreInfo.distance,
        desc.category || 'X', desc.wing || 'Glider'
    ]);
    const flightId = r['insertId'];
    const points = [];
    for (let fixId = score.opt['launch']; fixId <= score.opt['landing']; fixId++) {
        const fix = flight.fixes[fixId];
        points.push([
            fixId, flightId, fix.latitude, fix.longitude, fix.gpsAltitude || fix.pressureAltitude, new Date(fix.timestamp)
        ]);
    }
    await db.query('INSERT INTO point (id, flight_id, lat, lng, alt, time) VALUES ?', [points]);
    console.log(`${file}: added ${points.length}/${flight.fixes.length} points from flight ${flightId}`);
}
importFlight(process.argv[2]).finally(() => db.close());
