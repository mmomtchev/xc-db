import React, {useContext, useEffect} from 'react';
import {fromLonLat, getPointResolution} from 'ol/proj';
import {boundingExtent} from 'ol/extent';
import {Point, Circle, LineString} from 'ol/geom';
import {RFeature, RStyle, RContext} from 'rlayers';

import {RouteInfo} from './store';

RFeature.hitTolerance = 10;

export default function MapRoute(props: {route: RouteInfo; highlight?: boolean}) {
    const context = useContext(RContext);
    const pointRes = getPointResolution(context.map!.getView().getProjection(), 1, fromLonLat(props.route.tp[0]));
    const radius = Math.max(3000, props.route.avgDistance * 0.05 * 1000) / pointRes;

    useEffect(() => {
        if (props.highlight) {
            const routeExtent = boundingExtent(props.route.tp.map((c) => fromLonLat(c)));
            context.map.getView().fit(routeExtent, {padding: [50, 50, 50, 50], duration: 750});
        }
    }, [props.route.tp, props.highlight, context.map]);

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
                                <RStyle.RStyle zIndex={1000}>
                                    <RStyle.RText text={`TP${i + 1}`} font='bold 25px sans-serif'>
                                        <RStyle.RStroke color='black' width={3} />
                                        <RStyle.RFill color='red' />
                                    </RStyle.RText>
                                </RStyle.RStyle>
                            </RFeature>
                        </React.Fragment>
                    ))}
                </React.Fragment>
            ) : null}
        </React.Fragment>
    );
}
