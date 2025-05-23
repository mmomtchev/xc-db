import React from 'react';
import {useMatch, useNavigate} from 'react-router-dom';
import {fromLonLat} from 'ol/proj';
import {Feature} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import MVT from 'ol/format/MVT';
import {boundingExtent} from 'ol/extent';
import {
    RFeatureUIEvent,
    RLayerCluster,
    RLayerTile,
    RLayerVector,
    RLayerVectorImage,
    RLayerVectorTile,
    RMap,
    ROSM,
    RStyle
} from 'rlayers';
import {RLayers} from 'rlayers/control';

import config from '../config.json';
import pacman from './svg/pacman.svg';
import iconLaunch from './svg/icon-paraglide.svg';
import iconLaunchActive from './svg/icon-paraglide-active.svg';

import 'ol/ol.css';
import {useSelector, Settings, serverUrl} from './store';
import MapRoute from './MapRoute';
import MapTrack from './MapTrack';
import {fetchFilters} from './Settings';
import {Circle, Fill, Icon, Style} from 'ol/style';
import {Geometry} from 'ol/geom';

const Forclaz = fromLonLat([6.2463, 45.8131]);
const geojson = new GeoJSON({featureProjection: 'EPSG:4326'});
const mvt = new MVT();
const extent = boundingExtent([fromLonLat(config.map.extent[0]), fromLonLat(config.map.extent[1])]);

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

const layersButton = <button>&#9776;</button>;

const skyLinesStyles: Style[] = Array(256);
const launchStyles: Record<string, Style[]> = {active: [], notactive: []};
function launchStyle(mode, launchId, feature, _) {
    let v = 0;
    let selected = false;
    if (feature.get('features')) {
        v = feature.get('features').reduce((a, x) => (getValue(mode, x) > a ? getValue(mode, x) : a), 0);
        selected = feature.get('features').reduce((a, x) => a || x.get('id') == launchId, false);
    } else {
        v = getValue(mode, feature);
        selected = feature.get('id') == launchId;
    }
    const klass = getSizeClass(mode, v);
    if (selected) {
        if (!launchStyles.active[klass]) {
            launchStyles.active[klass] = new Style({image: new Icon({src: iconLaunchActive, scale: iconSizes[klass]})});
        }
        return launchStyles.active[klass];
    }
    if (!launchStyles.notactive[klass]) {
        launchStyles.notactive[klass] = new Style({image: new Icon({src: iconLaunch, scale: iconSizes[klass]})});
    }
    return launchStyles.notactive[klass];
}

export function Map() {
    const settings = useSelector((state) => state.settings);
    const routes = useSelector((state) => state.flightData.routesList);
    const route = useSelector((state) => state.flightData.route);
    const segments = useSelector((state) => state.flightData.profile);
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
    const [mapSpinner, setMapSpinner] = React.useState(true);

    const navigate = useNavigate();
    const click = React.useCallback(
        (ev: RFeatureUIEvent<Feature<Geometry>>) => {
            const all = ev.target.get('features') as Feature[];
            const f = all.reduce((a, x) => (getValue(settings.mode, x) > getValue(settings.mode, a) ? x : a), all[0]);
            navigate(`/launch/${f.get('id')}`);
        },
        [navigate, settings.mode]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const style = React.useCallback(launchStyle.bind(null, settings.mode, launchId), [(settings.mode, launchId)]);

    const featuresUrl = `${serverUrl}/geojson/launch/list?${fetchFilters(settings)}`;
    React.useEffect(() => setMapSpinner(true), [featuresUrl]);

    return (
        <>
            <img
                className='map position-fixed align-self-center'
                style={{zIndex: 5000, display: mapSpinner ? 'initial' : 'none'}}
                src={pacman}
            ></img>
            <RMap className='map' initial={{center: Forclaz, zoom: 7}} extent={extent}>
                <RLayers element={layersButton}>
                    <ROSM properties={{label: 'OSM'}} />
                    <RLayerTile
                        properties={{label: 'OpenTopo'}}
                        url='https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png'
                        attributions='Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)'
                    />
                </RLayers>
                <RLayerCluster
                    zIndex={20}
                    format={geojson}
                    url={featuresUrl}
                    onClick={click}
                    onPointerEnter={cursorPointer}
                    onPointerLeave={cursorDefault}
                    onFeaturesLoadEnd={() => void setMapSpinner(false)}
                    distance={50}
                    style={style}
                />
                <RLayerVectorImage zIndex={10}>
                    <RStyle.RStyle>
                        <RStyle.RStroke color='#0000FF40' width={1} />
                    </RStyle.RStyle>
                    {React.useMemo(
                        () => (route && route.id ? null : routes.map((r, i) => <MapRoute key={i} route={r} />)),
                        [routes, route]
                    )}
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
                        <RStyle.RStroke color='cornflowerblue' width={3} />
                    </RStyle.RStyle>
                    {React.useMemo(() => (segments.length > 0 ? <MapTrack /> : <React.Fragment />), [segments])}
                </RLayerVector>
                {route && route.id ? (
                    <RLayerVectorTile
                        format={mvt}
                        opacity={0.5}
                        url={`${serverUrl}/mvt/point/route/${route.id}/{z}/{y}/{x}/?${fetchFilters(settings)}`}
                        style={(feature) => {
                            const density = Math.round(+feature.getProperties().d / 1.5 + 63);
                            if (!density) return skyLinesStyles[0];
                            if (!skyLinesStyles[density]) {
                                const color = `${density.toString(16).padStart(2, '0')}`;
                                skyLinesStyles[density] = new Style({
                                    image: new Circle({
                                        radius: 5,
                                        fill: new Fill({color: `#0000${color}${color}`})
                                    }),
                                    zIndex: 10
                                });
                            }
                            return skyLinesStyles[density];
                        }}
                    />
                ) : null}
            </RMap>
        </>
    );
}

export default Map;
