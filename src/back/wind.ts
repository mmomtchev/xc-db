import * as gdal from 'gdal-async';
import 'ndarray-gdal';

import * as db from './db';

async function main() {
    const buffer = {};

    const ds = gdal.open(process.argv[2]);
    const geo = ds.geoTransform;
    for (const band of ds.bands) {
        const meta = band.getMetadata();
        const data = band.pixels.readArray();
        if (!buffer[meta.GRIB_VALID_TIME]) buffer[meta.GRIB_VALID_TIME] = {};

        if (meta.GRIB_ELEMENT === 'U') buffer[meta.GRIB_VALID_TIME].u = data;
        else if (meta.GRIB_ELEMENT === 'V') buffer[meta.GRIB_VALID_TIME].v = data;
        else throw new Error(`Invalid element ${meta}`);

        if (buffer[meta.GRIB_VALID_TIME].u && buffer[meta.GRIB_VALID_TIME].v) {
            const date = new Date(+meta.GRIB_VALID_TIME * 1000);
            console.log(`Writing ${date}`);
            const points = [];
            for (let y = 0; y < data.shape[0]; y++)
                for (let x = 0; x < data.shape[1]; x++) {
                    const lat = geo[3] + (x + 0.5) * geo[4] + (y + 0.5) * geo[5];
                    const lng = geo[0] + (x + 0.5) * geo[1] + (y + 0.5) * geo[2];
                    const u = buffer[meta.GRIB_VALID_TIME].u.get(y, x);
                    const v = buffer[meta.GRIB_VALID_TIME].v.get(y, x);
                    const speed = Math.sqrt(u * u + v * v) * 3.6;
                    const dir = (270 - (180 / Math.PI) * Math.atan2(v, u)) % 360;

                    points.push([lat, lng, date, speed, dir]);
                }
            await db.query('INSERT INTO wind (lat, lng, date, speed, direction) VALUES ?', [points]);
            delete buffer[meta.GRIB_VALID_TIME];
        }
    }
}

main().then(() => db.close());
