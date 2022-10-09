import ndarray from 'ndarray';

import {config} from './db';
import {Point} from '../lib/flight';

/** Tile number to longitude for the zoom level in EPSG:3857 (Web Mercator) */
export function tileToLongitude(zoom: number, x: number): number {
    return (x / 2 ** zoom) * 360 - 180;
}

/** Tile number to latitude for the zoom level in EPSG:3857 (Web Mercator) */
export function tileToLatitude(zoom: number, y: number): number {
    return (Math.atan(Math.sinh(Math.PI - (y / 2 ** zoom) * 2 * Math.PI)) * 180) / Math.PI;
}

const vectorTileSize = 4096;

/**
 * Longitude to coordinates relative to the tile (4096x4096)
 * 2-step transformer to avoid repeating calculations that depend only on the tile position
 **/
export function lngToTileTransformer(zoom: number, left: number): (lng: number) => number {
    const tileGeoSize = 360 / 2 ** zoom;
    return (lng) => ((lng - left) / tileGeoSize) * vectorTileSize;
}

function webMercatorLatitudeProjection(zoomSize: number, lat: number) {
    return (
        (vectorTileSize / (2 * Math.PI)) *
        zoomSize *
        (Math.PI - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2)))
    );
}

/**
 * Latitude to coordinates relative to the tile (4096x4096)
 * 2-step transformer
 */
export function latToTileTransformer(zoom: number, top: number): (lat: number) => number {
    // This works by applying the Web Mercator projection to both the top of the tile and the given latitude
    // and finding the difference
    const zoomSize = 2 ** zoom;
    const topProjected = webMercatorLatitudeProjection(zoomSize, top);

    return (lat) => webMercatorLatitudeProjection(zoomSize, lat) - topProjected;
}

const tileSize = config.skylines.resolution;
/**
 * O(n) point decimation for the specified zoom level if it was to be displayed as a 128px wide image
 * (yes, we are cheap, we will do more when we have a sponsor)
 **/
export function pointDecimation(zoom: number, left: number, top: number, p: Point[]): Point[] {
    const raster = ndarray(new Uint8Array(tileSize * tileSize), [tileSize, tileSize]);

    // Rasterize
    const tileGeoSize = 360 / tileSize / 2 ** zoom;
    for (let i = 0; i < p.length; i++) {
        const x = Math.floor((p[i].lng - left) / tileGeoSize);
        const y = Math.floor((top - p[i].lat) / tileGeoSize);
        const density = raster.get(y, x);
        raster.set(y, x, density + 1 > 255 ? 255 : density + 1);
    }

    // Vectorize
    const target = [] as Point[];
    for (let y = 0; y < tileSize; y++) {
        const lat = top - (y + 0.5) * tileGeoSize;
        for (let x = 0; x < tileSize; x++) {
            const density = raster.get(y, x);
            if (density > 0) {
                const lng = (x + 0.5) * tileGeoSize + left;
                target.push({lat, lng, alt: density});
            }
        }
    }

    return target;
}
