import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import IGCParser from 'igc-parser';
import { solver, scoringRules as scoring, Solution } from 'igc-xc-score';

import * as db from './db';

function triId(flight: IGCParser.IGCFile) {
    const top = flight.fixes.reduce((a: IGCParser.BRecord, x) =>
        (x.gpsAltitude || x.pressureAltitude) > (a.gpsAltitude || a.pressureAltitude) ? x : a,
        flight.fixes[0]);

    return [
        top.timestamp,
        top.latitude,
        top.longitude,
        (top.gpsAltitude || top.pressureAltitude)
    ];
}

function triHash(flight: IGCParser.IGCFile, score: Solution) {
    const id = triId(flight);
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(id));
    return hash.digest('hex');
}

async function importFlight(file: string) {
    const descJSON = fs.readFileSync(path.resolve(path.dirname(file), path.basename(file, '.igc') + '.json'), 'utf8');
    const desc = JSON.parse(descJSON);
    if (desc.type.toLowerCase() !== 'tri' && desc.type.toLowerCase() !== 'fai') {
        console.log(`${file}: type code is ${desc.type}`);
        return;
    }
    const igcData = fs.readFileSync(file, 'utf8');
    const flight = IGCParser.parse(igcData, { lenient: true });
    const score = solver(flight, scoring.FFVL, { trim: true }).next().value;

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
    const launch = await db.query('SELECT id, name, sub, distance(lat, lng, ?, ?) AS launch_distance FROM launch ORDER BY launch_distance ASC LIMIT 1',
        [launchFix.latitude, launchFix.longitude]);
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
