import * as fs from 'fs';
import * as path from 'path';
import {pymport, proxify} from 'pymport';

if (process.argv.length < 4) {
    console.log('Usage: node download_wind <YEAR> <FILE>.grib');
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json'), 'utf-8'));
const cds = proxify(pymport('cdsapi'));
const client = cds.Client();

// Copernicus uses TOP,LEFT,BOTTOM,RIGHT
// We use LEFT,TOP,RIGHT,BOTTOM
const extent = [config.map.extent[0][1], config.map.extent[0][0], config.map.extent[1][1], config.map.extent[1][0]];

client.retrieve(
    'reanalysis-era5-pressure-levels',
    {
        product_type: 'reanalysis',
        format: 'grib',
        area: extent,
        time: '13:00',
        day: Array.from({length: 31}, (_, i) => i + 1),
        month: Array.from({length: 12}, (_, i) => i + 1),
        year: process.argv[2],
        pressure_level: '600',
        variable: ['u_component_of_wind', 'v_component_of_wind']
    },
    process.argv[3]
);
