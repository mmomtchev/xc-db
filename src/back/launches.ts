import * as fs from 'fs';

import * as db from './db';

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const filt = data.features.filter((f) => f.properties.o === 'FF' || f.properties.o === 'XU');

async function main() {
    for (const launch of filt) {
        await db.query('INSERT INTO launch (name, sub, lat, lng) VALUES (SUBSTRING(?, 1, 40), SUBSTRING(?, 1, 40), ?, ?)',
            [launch.properties.n, launch.properties.s, launch.geometry.coordinates[1], launch.geometry.coordinates[0]],);
    }
    db.close();
}

main();
