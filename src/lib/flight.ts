import GeographicLib from 'geographiclib';

import {config} from './db';

const geod = GeographicLib.Geodesic.WGS84;

export const triPoints = ['e1', 'p1', 'p2', 'p3', 'e2'];
export const fullPoints = ['launch', 'e1', 'p1', 'p2', 'p3', 'e2', 'landing'];

// The point of this type is to avoid transferring huge arrays of GeoJSON objects
// between the front-end and the back-end
export type FlightSegment = {
    d: number;
    start: number;
    finish: number;
    lng: number[];
    lat: number[];
    terrain?: number[];
    alt?: number[];
    max?: number[];
    min?: number[];
    startName: string;
    finishName: string;
};

export type Point = {
    lat: number;
    lng: number;
    alt: number;
    terrain?: number;
    max?: number;
    min?: number;
    time?: number;
};

// interpolate array to size elements (using nearest neighbor)
export function interpolate(array: Point[], size: number): Point[] {
    if (size === 0) size = 1;
    const r = [];
    for (let i = 0; i < size; i++) {
        const nn = Math.round((i * (array.length - 1)) / size);
        r[i] = array[nn];
    }
    return r;
}

export function segmentFlight(tp: string[], flight: unknown, points: unknown[]): Point[][] {
    const segments: Point[][] = [];
    for (let i = 0; i < tp.length - 1; i++)
        segments.push(
            points
                .slice(flight[`${tp[i]}_point`], flight[`${tp[i + 1]}_point`] + 1)
                .map((x) => ({alt: x['alt'], lat: x['lat'], lng: x['lng'], time: x['time']}))
        );
    return segments;
}

export function scaleSegments(tp: string[], flight: unknown): FlightSegment[] {
    const segments: FlightSegment[] = [];
    let distance = 0;
    for (let i = 0; i < tp.length - 1; i++) {
        const d =
            geod.Inverse(
                flight[`${tp[i]}_lat`],
                flight[`${tp[i]}_lng`],
                flight[`${tp[i + 1]}_lat`],
                flight[`${tp[i + 1]}_lng`]
            ).s12 / 1000;
        distance += d;
        segments[i] = {d, startName: tp[i], finishName: tp[i + 1]} as FlightSegment;
    }

    const step = distance / config.tracklog.points;
    let start = 0;
    let current_distance = 0;
    for (let i = 0; i < tp.length - 1; i++) {
        current_distance += segments[i].d;
        const finish = Math.round(current_distance / step);
        segments[i].start = start;
        segments[i].finish = finish;
        start = finish;
    }

    return segments;
}
