import {fromLonLat} from 'ol/proj';
import {Point, Circle, LineString} from 'ol/geom';
import {RFeature, RStyle} from 'rlayers';

import {RouteInfo} from './store';
import React from 'react';

export default function MapRoute(props: {route: RouteInfo; highlight?: boolean}) {
    const radius = Math.max(3000, props.route.avgDistance * 0.05 * 1000);
    return (
        <React.Fragment>
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[0]), fromLonLat(props.route.tp[1])])} />
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[1]), fromLonLat(props.route.tp[2])])} />
            <RFeature geometry={new LineString([fromLonLat(props.route.tp[2]), fromLonLat(props.route.tp[0])])} />
            {props.highlight ? (
                <React.Fragment>
                    {[0, 1, 2].map((i) => (
                        <React.Fragment key={i}>
                            <RFeature geometry={new Circle(fromLonLat(props.route.tp[i]), radius)} />
                            <RFeature geometry={new Point(fromLonLat(props.route.tp[i]))}>
                                <RStyle.RStyle>
                                    <RStyle.RText text={`TP${i + 1}`} font='bold 25px sans-serif' />
                                </RStyle.RStyle>
                            </RFeature>
                        </React.Fragment>
                    ))}
                </React.Fragment>
            ) : null}
        </React.Fragment>
    );
}
