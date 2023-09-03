import * as db from '../lib/db';

// This is an implementation of an algorithm inspired by K-means clustering
// The main difference is that in K-means clustering the number of classes is predetermined
// In this version, it is the maximum variability of the classes that is predetermined

// The algorithm is performed on two different elements:
// * routes - where we group similar flights
// * launches - where we detect places where lots of people have launched

const clustering = {
    route: {
        view: 'route_info',
        table: 'route',
        id: 'route_id',
        querySQL:
            // We can't have an index on the great circle distance
            // but we can eliminate very early most of the points
            'p1_lat BETWEEN (? - 0.1) AND (? + 0.1) AND p1_lng BETWEEN (? - 0.2) AND (? + 0.2)' +
            ' AND great_circle(p1_lat, p1_lng, ?, ?) < sup(? * 0.05, 3)' +
            ' AND great_circle(p2_lat, p2_lng, ?, ?) < sup(? * 0.05, 3)' +
            ' AND great_circle(p3_lat, p3_lng, ?, ?) < sup(? * 0.05, 3)',
        queryArgs: [
            'c1_lat',
            'c1_lat',
            'c1_lng',
            'c1_lng',
            'c1_lat',
            'c1_lng',
            'avg_distance',
            'c2_lat',
            'c2_lng',
            'avg_distance',
            'c3_lat',
            'c3_lng',
            'avg_distance'
        ]
    },
    launch: {
        view: 'launch_info',
        table: 'launch',
        id: 'launch_id',
        querySQL:
            'launch_lat BETWEEN (? - 0.1) AND (? + 0.1) AND launch_lng BETWEEN (? - 0.2) AND (? + 0.2)' +
            ' AND great_circle(launch_lat, launch_lng, ?, ?) < 3',
        queryArgs: ['lat', 'lat', 'lng', 'lng', 'lat', 'lng']
    }
};

let totalFlightsReclustered = 0;

// This is not very fast but it is meant to be run once per day
// It performs reanalysis of the clusters after adding new flights

async function recluster(element: 'launch' | 'route', id: number): Promise<number[]> {
    const el = (await db.query(`SELECT * FROM ${clustering[element].view} WHERE id = ?`, [id]))[0];
    if (!el) {
        console.log(`${element} ${id} has been nulled`);
        return [];
    }
    console.log(`reclustering ${id} (${el['flights']} flights)`);

    const affected = await db.query(
        `SELECT ${clustering[element].id} FROM flight NATURAL JOIN flight_extra` +
            ` LEFT JOIN ${clustering[element].view} ON (flight.${clustering[element].id} = ${clustering[element].view}.id)` +
            ' WHERE flights < ?' +
            ` AND ${clustering[element].querySQL}`,
        [el['flights'], ...clustering[element].queryArgs.map((a) => el[a])]
    );
    console.log(`affect: ${el['id']} ${affected.length} flights`);

    await db.query('START TRANSACTION');

    const add = await db.query(
        'UPDATE flight NATURAL JOIN flight_extra' +
            ` LEFT JOIN ${clustering[element].view} ON (flight.${clustering[element].id} = ${clustering[element].view}.id)` +
            ` SET ${clustering[element].id} = ?` +
            ` WHERE (${clustering[element].id} IS NULL OR flights <= ?)` +
            ` AND ${clustering[element].querySQL}`,
        [el['id'], el['flights'], ...clustering[element].queryArgs.map((a) => el[a])]
    );
    console.log(`grow: ${el['id']} +${add['changedRows']} flights`);
    if (add['changedRows'] === 0) return [];

    const remove = await db.query(
        `UPDATE flight NATURAL JOIN flight_extra SET ${clustering[element].id} = NULL WHERE ${clustering[element].id} = ? ` +
            ` AND NOT (${clustering[element].querySQL})`,
        [el['id'], ...clustering[element].queryArgs.map((a) => el[a])]
    );
    console.log(`reduce: ${el['id']} -${remove['changedRows']} flights`);

    const prune = await db.query(
        `DELETE FROM ${clustering[element].table} WHERE id NOT IN ` +
            `(SELECT DISTINCT ${clustering[element].id} FROM flight WHERE ${clustering[element].id} IS NOT NULL)`
    );
    console.log(`prune ${element}s: ${prune['changedRows']} ${element}s`);

    if (add['changedRows'] < remove['changedRows'] + prune['changedRows']) {
        // Commit only if the new classification has better grouping
        // This ensures that algorithm convergences
        console.log('Non-convergent modification, rolling back');
        await db.query('ROLLBACK');
        return [];
    }
    await db.query('COMMIT');

    const r = affected.map((x) => x[clustering[element].id]);
    r.push(id);
    totalFlightsReclustered += add['changedRows'] + remove['changedRows'] + prune['changedRows'];
    return r;
}

async function create(element: 'launch' | 'route'): Promise<number | null> {
    let r = await db.query(`SELECT * FROM flight WHERE ${clustering[element].id} IS NULL LIMIT 1`);
    if (r.length === 0) {
        console.warn('No more unclassified flights');
        return null;
    }
    const flightId = r[0]['id'];

    r = await db.query(`INSERT INTO ${clustering[element].table} () VALUES ()`);
    const id = r['insertId'];
    console.log(`created ${element} ${id} for flight ${flightId}`);

    r = await db.query(`UPDATE flight SET ${clustering[element].id} = ? WHERE id = ?`, [id, flightId]);
    return id;
}

async function run(element: 'launch' | 'route', ids: number[]) {
    let affected: number[] = ids;

    while (affected.length > 0) {
        console.log(`Reclustering ${element}s ${affected}`);
        const next: number[] = [];
        for (const r of affected) {
            const more = await recluster(element, r);
            if (more.length === 0) continue;
            console.log(`Affected ${element}s: ${more}`);
            next.push(...more);
        }
        console.log('--');
        affected = next.filter((v, i, a) => a.indexOf(v) === i);
    }
    console.log('==================');
}

async function main(element: 'launch' | 'route', id?: string) {
    if (id) {
        await run(element, [+id]);
        return;
    }
    const all = (await db.query(`SELECT id FROM ${clustering[element].view}`)).map((x) => x['id']);
    await run(element, all);

    do {
        const created = await create(element);
        if (!created) break;
        await run(element, [created]);
    } while (true);
}

if (!process.argv[2] || (process.argv[2] !== 'route' && process.argv[2] !== 'launch'))
    throw new Error('No element given');

main(process.argv[2], process.argv[3])
    .catch((e) => {
        console.error(e);
    })
    .finally(() => {
        db.close();
        console.log(`Total flights reclustered ${totalFlightsReclustered}`);
        if (totalFlightsReclustered > 0) process.exit(0);
        else process.exit(1);
    });
