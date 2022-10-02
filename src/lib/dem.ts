import * as path from 'path';
import gdal from 'gdal-async';
import {NdArray} from 'ndarray';
import 'ndarray-gdal';
import {Point} from './flight';

import config from '../config.json';

let lastSRTMFile = '';
let lastSRTMds: gdal.Dataset = null;
let lastSRTMxform: gdal.CoordinateTransformation = null;
let lastSRTMData: NdArray = null;

export async function terrainUnderPath(track: Point[]) {
    for (const p of track) {
        const file = `${p.lat > 0 ? 'N' : 'S'}${Math.floor(p.lat).toFixed(0)}${p.lng > 0 ? 'E' : 'W'}${Math.floor(p.lng)
            .toFixed(0)
            .padStart(3, '0')}.hgt`;
        if (file !== lastSRTMFile) {
            lastSRTMFile = file;
            try {
                lastSRTMds = await gdal.openAsync(path.resolve(config.dbserver.srtm_dir, lastSRTMFile));
                lastSRTMxform = new gdal.CoordinateTransformation(gdal.SpatialReference.fromEPSG(4326), lastSRTMds);
                lastSRTMData = await lastSRTMds.bands.get(1).pixels.readArrayAsync();
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
                lastSRTMData = null;
            }
        }
        if (lastSRTMData) {
            const pt = lastSRTMxform.transformPoint(p.lng, p.lat);
            p.terrain = lastSRTMData.get(Math.round(pt.y), Math.round(pt.x));
        }
    }
}
