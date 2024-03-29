import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import IGCParser from 'igc-parser';
import {solver, scoringRules as scoring} from 'igc-xc-score';

import * as db from '../lib/db';

function triId(flight: IGCParser.IGCFile) {
    const top = flight.fixes.reduce(
        (a: number, _, i: number) =>
            (flight.fixes[i].gpsAltitude || flight.fixes[i].pressureAltitude) >
            (flight.fixes[a].gpsAltitude || flight.fixes[a].pressureAltitude)
                ? i
                : a,
        0
    );

    return [
        flight.fixes[top].timestamp.toString(),
        flight.fixes[top].latitude.toFixed(6),
        flight.fixes[top].longitude.toFixed(6),
        (flight.fixes[top].gpsAltitude || flight.fixes[top].pressureAltitude).toString(),
        flight.fixes[top + 1].timestamp.toString(),
        flight.fixes[top + 1].latitude.toFixed(6),
        flight.fixes[top + 1].longitude.toFixed(6),
        (flight.fixes[top + 1].gpsAltitude || flight.fixes[top].pressureAltitude).toString()
    ];
}

function triHash(flight: IGCParser.IGCFile) {
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
    const flight = IGCParser.parse(igcData, {lenient: true});
    const hash = triHash(flight);
    let r = await db.query('SELECT * FROM flight WHERE HEX(hash) = ?', [hash]);
    if (r.length > 0) {
        console.warn(`${file} : ${flight.pilot}/${flight.date}: ${hash} already present`);
        return;
    }

    const score = solver(flight, scoring.FFVL, {trim: true}).next().value;
    const fixes = score.opt.flight.filtered;

    if (score.opt.scoring.code !== 'tri' && score.opt.scoring.code !== 'fai') {
        console.log(
            `!!!!!!!!!!!!! ${file}: type code is ${score.opt.scoring.code} / ${score.opt.scoring.name} / ${desc}`
        );
        return;
    }

    const launch = score.opt['launch'];
    const launchFix = fixes[launch];
    const landing = score.opt['landing'];
    const landingFix = fixes[landing];

    await db.query('START TRANSACTION');
    try {
        r = await db.query(
            'INSERT INTO flight (hash, launch_point, landing_point, ' +
                ' p1_point, p2_point, p3_point, e1_point, e2_point, score, distance, category, type)' +
                ' VALUES ( UNHEX(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )',
            [
                hash,
                launch,
                landing,
                score.scoreInfo.tp[0].r,
                score.scoreInfo.tp[1].r,
                score.scoreInfo.tp[2].r,
                score.scoreInfo.cp.in.r,
                score.scoreInfo.cp.out.r,
                score.score,
                score.scoreInfo.distance,
                desc.category,
                desc.type.toUpperCase()
            ]
        );
        const flightId = r['insertId'];
        await db.query(
            'INSERT INTO flight_extra (id, glider, pilot_url, flight_url, pilot_name, date,' +
                ' launch_lat, launch_lng, landing_lat, landing_lng,' +
                ' p1_lat, p1_lng, p2_lat, p2_lng, p3_lat, p3_lng, e1_lat, e1_lng, e2_lat, e2_lng)' +
                ' VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )',
            [
                flightId,
                desc.glider,
                desc.pilot_url,
                desc.flight_url,
                desc.pilot_name,
                new Date(fixes[0].timestamp),
                launchFix.latitude,
                launchFix.longitude,
                landingFix.latitude,
                landingFix.longitude,
                score.scoreInfo.tp[0].y,
                score.scoreInfo.tp[0].x,
                score.scoreInfo.tp[1].y,
                score.scoreInfo.tp[1].x,
                score.scoreInfo.tp[2].y,
                score.scoreInfo.tp[2].x,
                score.scoreInfo.cp.in.y,
                score.scoreInfo.cp.in.x,
                score.scoreInfo.cp.out.y,
                score.scoreInfo.cp.out.x
            ]
        );

        const points = [];
        for (let fixId = score.opt['launch']; fixId <= score.opt['landing']; fixId++) {
            const fix = fixes[fixId];
            if (!(fix.gpsAltitude || fix.pressureAltitude)) continue;
            points.push([
                fixId,
                flightId,
                fix.latitude,
                fix.longitude,
                fix.gpsAltitude || fix.pressureAltitude,
                new Date(fix.timestamp)
            ]);
        }
        await db.query('INSERT INTO point (id, flight_id, lat, lng, alt, time) VALUES ?', [points]);
        await db.query('COMMIT');
        console.log(`${file}: added ${points.length}/${fixes.length} points from flight ${flightId}`);
    } catch (e) {
        console.error(`${file}: transaction failed, rolling back: ${e}`);
        await db.query('ROLLBACK');
    }
}

async function main() {
    let arg = 2;
    while (process.argv[arg]) {
        try {
            await importFlight(process.argv[arg++]).catch((e) => console.error(process.argv[arg - 1], e));
        } catch (e) {
            console.error(process.argv[arg - 1], e);
        }
    }
}

main().finally(() => db.close());
