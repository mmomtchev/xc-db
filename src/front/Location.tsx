import React from 'react';
import * as queryMVT from 'query-mvt';
import {LRUCache} from 'lru-cache';

import pacman from './svg/pacman.svg';

const cache = new LRUCache<string, Promise<string>>({max: 1024});
const queue = new queryMVT.Queue(8, 10);
const naturalMetadata = queryMVT.acquire('https://velivole.b-cdn.net/tiles/natural/metadata.json');

export function coordsToString(lon: number, lat: number) {
    return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`;
}

export function Location(props: {lon: number; lat: number}) {
    const coords = coordsToString(props.lon, props.lat);
    const cachedName = cache.get(coords);
    const [name, setName] = React.useState(null);
    const ref = React.useRef<HTMLDivElement>();
    const [observer] = React.useState(
        new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting) {
                if (cachedName) {
                    cachedName.then((name) => setName(name));
                    return;
                }
                const village = queryMVT.search({
                    url: 'https://www.qwant.com/maps/tiles/ozbasemap/{z}/{x}/{y}.pbf',
                    lon: props.lon,
                    lat: props.lat,
                    filter: (f) => f.properties['class'] === 'village',
                    maxFeatures: 1,
                    maxRadius: 5,
                    metadata: queryMVT.constants.EPSG3857,
                    queue
                });
                const natural = naturalMetadata.then((metadata) =>
                    queryMVT.search({
                        url: 'https://velivole.b-cdn.net/tiles/natural/{z}/{x}/{y}.pbf',
                        lon: props.lon,
                        lat: props.lat,
                        metadata,
                        maxFeatures: 1,
                        maxRadius: 5,
                        queue
                    })
                );
                const nameq = Promise.all([village, natural]).then((r) => {
                    if (r[1][0].distance <= r[0][0].distance) {
                        return r[1][0].feature.properties['name'];
                    }
                    if (r[0][0].distance <= r[1][0].distance) {
                        return r[0][0].feature.properties['name'];
                    }
                    return undefined;
                });
                cache.set(coords, nameq);
                nameq.then((n) => setName(n));
            }
        })
    );

    React.useEffect(() => {
        const target = ref.current;
        if (target) {
            observer.observe(target);
            return () => observer.unobserve(target);
        }
    });

    return (
        <div ref={ref}>
            <em>
                {name ? (
                    name
                ) : (
                    <>
                        {coords}
                        <img className='ms-2 inline-icon' src={pacman} />
                    </>
                )}
            </em>
        </div>
    );
}
