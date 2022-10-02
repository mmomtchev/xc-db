import * as fs from 'fs';

import * as db from './db';

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const filt = data.features.filter((f) => f.properties.o === 'FF' || f.properties.o === 'XU');

async function main() {
    for (const launch of filt) {
        const r = await db.query('SELECT * FROM launch_official WHERE name = ?', [launch.properties.n]);
        if (r.length === 0)
            await db.query('INSERT INTO launch_official (name, lat, lng) VALUES (SUBSTRING(?, 1, 80), ?, ?)', [
                launch.properties.n,
                launch.geometry.coordinates[1],
                launch.geometry.coordinates[0]
            ]);
    }
    db.close();
}

main();
