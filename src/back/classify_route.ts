import * as db from './db';

async function recluster(routeId: number): Promise<number[]> {
    const route = (await db.query('SELECT * FROM route_info WHERE id = ?', [routeId]))[0];
    if (!route) {
        console.log(`route ${routeId} has been nulled`);
        return [];
    }
    console.log(`reclustering ${routeId} (${route['flights']} flights)`);

    const affected = await db.query('SELECT route_id FROM flight LEFT JOIN route_info ON (flight.route_id = route_info.id)' +
        ' WHERE flights < ?' +
        ' AND distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3', [
        route['flights'],
        route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]);
    console.log(`affect: ${route['id']} ${affected.length} flights`);

    const add = await db.query('UPDATE flight LEFT JOIN route_info ON (flight.route_id = route_info.id) SET route_id = ?' +
        ' WHERE (route_id IS NULL OR flights < ?)' +
        ' AND distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3', [
        route['id'],
        route['flights'],
        route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]);
    console.log(`grow: ${route['id']} +${add['changedRows']} flights`);
    if (add['changedRows'] === 0)
        return [];

    const remove = await db.query('UPDATE flight SET route_id = NULL WHERE route_id = ? ' +
        'AND NOT (distance(p1_lat, p1_lng, ?, ?) < 3 AND distance(p2_lat, p2_lng, ?, ?) < 3 AND distance(p3_lat, p3_lng, ?, ?) < 3)', [
        route['id'], route['c1_lat'], route['c1_lng'], route['c2_lat'], route['c2_lng'], route['c3_lat'], route['c3_lng']
    ]);
    console.log(`reduce: ${route['id']} -${remove['changedRows']} flights`);

    const prune = await db.query('DELETE FROM route WHERE id NOT IN (SELECT DISTINCT route_id FROM flight WHERE route_id IS NOT NULL)');
    console.log(`prune routes: ${prune['changedRows']} routes`);

    const r = affected.map(x => x['route_id']);
    r.push(routeId);
    return r;
}

async function create(): Promise<number | null> {
    let r = await db.query('SELECT * FROM flight WHERE route_id IS NULL LIMIT 1');
    if (r.length === 0) {
        console.warn('No more unclassified flights');
        return null;
    }
    const flightId = r[0]['id'];

    r = await db.query('INSERT INTO route () VALUES ()');
    const routeId = r['insertId'];
    console.log(`created route ${routeId} for flight ${flightId}`);

    r = await db.query('UPDATE flight SET route_id = ? WHERE id = ?', [routeId, flightId]);
    return routeId;
}

async function process(ids: number[]) {
    let affected: number[] = ids;

    while (affected.length > 0) {
        console.log(`Reclustering routes ${affected}`);
        const next: number[] = [];
        for (const r of affected) {
            const more = await recluster(r);
            if (more.length === 0) continue;
            console.log(`Affected routes: ${more}`);
            next.push(...more);
        }
        console.log('--');
        affected = next;
    }
    console.log('==================');
}

async function main() {
    const all = (await db.query('SELECT id FROM route_info')).map((x) => x['id']);
    await process(all);

    do {
        const created = await create();
        if (!created)
            break;
        await process([created]);

    } while (true);
}

main().finally(() => db.close());
