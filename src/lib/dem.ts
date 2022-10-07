import * as path from 'path';
import gdal from 'gdal-async';
import {NdArray} from 'ndarray';
import 'ndarray-gdal';
import {Point} from './flight';

import config from '../config.json';

const last = {
    file: '',
    ds: null as gdal.Dataset,
    xform: null as gdal.CoordinateTransformation,
    data: null as NdArray
};

export async function terrainUnderPath(track: Point[]) {
    for (const p of track) {
        let ds: gdal.Dataset;
        let xform: gdal.CoordinateTransformation;
        let data: NdArray;

        const file = `${p.lat > 0 ? 'N' : 'S'}${Math.floor(p.lat).toFixed(0)}${p.lng > 0 ? 'E' : 'W'}${Math.floor(p.lng)
            .toFixed(0)
            .padStart(3, '0')}.hgt`;
        try {
            if (file !== last.file) {
                ds = await gdal.openAsync(path.resolve(config.dbserver.srtm_dir, file));
                xform = new gdal.CoordinateTransformation(gdal.SpatialReference.fromEPSG(4326), ds);
                data = await ds.bands.get(1).pixels.readArrayAsync();
            } else {
                ds = last.ds;
                xform = last.xform;
                data = last.data;
            }
            const pt = xform.transformPoint(p.lng, p.lat);
            p.terrain = data.get(Math.round(pt.y), Math.round(pt.x));

            last.file = file;
            last.ds = ds;
            last.xform = xform;
            last.data = data;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            p.terrain = null;
        }
    }
}
