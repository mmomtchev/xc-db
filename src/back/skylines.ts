// Generate skylines

// Very slow but meant to be run once every month or so

import * as gdal from 'gdal-async';
import config from './conf';
import * as db from './db';

if (!process.argv[2]) {
    console.log('no output file name');
    process.exit(1);
}

const gtiff = gdal.drivers.get('GeoTiff');
const ds = gtiff.create(
    process.argv[1],
    (config.skylines.extent[2] - config.skylines.extent[0]) / config.skylines.pixelSize[0],
    (config.skylines.extent[1] - config.skylines.extent[3]) / config.skylines.pixelSize[1],
    1,
    gdal.GDT_Byte as unknown as  number,
    {}
);

ds.rasterSize