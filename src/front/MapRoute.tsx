import { fromLonLat } from 'ol/proj';
import { Circle, LineString } from 'ol/geom';
import { RFeature } from 'rlayers';

import { RouteInfo } from './store';
import React from 'react';

export default function MapRoute(props: { route: RouteInfo; }) {
    return (
        <React.Fragment>
            <RFeature geometry={new Circle(fromLonLat(props.route.tp[0]), 3000)} />;
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[0]), fromLonLat(props.route.tp[1])])} />;
            <RFeature geometry={new Circle(fromLonLat(props.route.tp[1]), 3000)} />;
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[1]), fromLonLat(props.route.tp[2])])} />;
            <RFeature geometry={new Circle(fromLonLat(props.route.tp[2]), 3000)} />;
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[2]), fromLonLat(props.route.tp[0])])} />;
        </React.Fragment>
    );
}
