import React from 'react';
import {fromLonLat} from 'ol/proj';
import {Feature} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import {RFeatureUIEvent, RLayerCluster, RLayerVector, RLayerVectorImage, RMap, ROSM, RStyle} from 'rlayers';

import iconLaunch from './svg/icon-paraglide.svg';

import 'ol/ol.css';
import {useDispatch, LaunchInfo, useSelector, Settings, flightData} from './store';
import MapRoute from './MapRoute';
import MapTrack from './MapTrack';

const Forclaz = fromLonLat([6.2463, 45.8131]);
const reader = new GeoJSON({featureProjection: 'EPSG:4326'});

const iconSizes = [
    [0.15, 0.15],
    [0.3, 0.3],
    [0.5, 0.5]
];

const categories: Record<Settings['mode'], number[]> = {
    score: [10000, 2500],
    flights: [500, 50],
    avg: [100, 50]
};

function getSizeClass(mode: Settings['mode'], value: number): 0 | 1 | 2 {
    if (value > categories[mode][0]) return 2;
    else if (value > categories[mode][1]) return 1;
    else return 0;
}

function getValue(mode: Settings['mode'], feature: Feature): number {
    switch (mode) {
        case 'avg':
            return feature.get('score') / feature.get('flights');
        case 'flights':
            return feature.get('flights');
        case 'score':
            return feature.get('score');
    }
}

function cursorPointer(ev) {
    ev.map.getTarget().style.cursor = 'pointer';
}
function cursorDefault(ev) {
    ev.map.getTarget().style.cursor = '';
}

export function Map() {
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings);
    const routes = useSelector((state) => state.flightData.routesList);
    const route = useSelector((state) => state.flightData.route);
    const segments = useSelector((state) => state.flightData.profile);

    const click = React.useCallback(
        (ev: RFeatureUIEvent) => {
            const all = ev.target.get('features') as Feature[];
            const f = all.reduce((a, x) => (getValue(settings.mode, x) > getValue(settings.mode, a) ? x : a), all[0]);
            fetch(`${process.env.REACT_APP_XCDB_SERVER}/launch/${f.get('id')}`)
                .then((res) => res.json())
                .then((json: LaunchInfo) => {
                    dispatch(flightData.actions.loadLaunch(json));
                })
                .catch((e) => console.error(e));
        },
        [dispatch, settings.mode]
    );

    const style = React.useCallback(
        (feature, resoltuion) => {
            let v = 0;
            if (feature.get('features')) {
                v = feature
                    .get('features')
                    .reduce((a, x) => (getValue(settings.mode, x) > a ? getValue(settings.mode, x) : a), 0);
            } else {
                v = getValue(settings.mode, feature);
            }
            return <RStyle.RIcon src={iconLaunch} scale={iconSizes[getSizeClass(settings.mode, v)]} />;
        },
        [settings.mode]
    );

    return (
        <RMap className='map' initial={{center: Forclaz, zoom: 7}}>
            <ROSM />
            <RLayerCluster
                zIndex={20}
                format={reader}
                url={`${process.env.REACT_APP_XCDB_SERVER}/launch/list`}
                onClick={click}
                onPointerEnter={cursorPointer}
                onPointerLeave={cursorDefault}
                distance={50}
            >
                <RStyle.RStyle render={style} />
            </RLayerCluster>
            <RLayerVectorImage zIndex={10}>
                <RStyle.RStyle>
                    <RStyle.RStroke color='#0000FF40' width={1} />
                </RStyle.RStyle>
                {routes.map((r, i) => (
                    <MapRoute key={i} route={r} />
                ))}
            </RLayerVectorImage>
            {route ? (
                <RLayerVector zIndex={30}>
                    <RStyle.RStyle>
                        <RStyle.RStroke color='red' width={3} />
                    </RStyle.RStyle>
                    <MapRoute route={route} highlight={true} />
                </RLayerVector>
            ) : null}
            <RLayerVector zIndex={50}>
                <RStyle.RStyle>
                    <RStyle.RStroke color='blue' width={3} />
                </RStyle.RStyle>
                {segments.length > 0 ? <MapTrack /> : null}
            </RLayerVector>
        </RMap>
    );
}

export default Map;
