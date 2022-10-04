import React from 'react';
import {CSSTransition} from 'react-transition-group';
import {debug} from '../lib/debug';

import Info from './Info';
import {FlightList} from './MenuFlights';
import {fetchFilters} from './Settings';
import {RouteInfo, useDispatch, useSelector, SQLRouteInfo, flightData, serverUrl} from './store';

import pacman from './svg/pacman.svg';

export function RouteList() {
    const routesRef = React.useRef(null);
    const [loading, setLoading] = React.useState(false);

    const launchId = useSelector((state) => state.flightData.launchId);
    const routes = useSelector((state) => state.flightData.routesList);
    const settings = useSelector((state) => state.settings);
    const dispatch = useDispatch();

    React.useEffect(() => {
        if (launchId) {
            setLoading(true);
            const controller = new AbortController();
            debug('loading route/launch', launchId, settings);
            fetch(`${serverUrl}/route/launch/${launchId}?${fetchFilters(settings)}`, {signal: controller.signal})
                .then((res) => res.json())
                .then((json) => {
                    debug('loaded route/launch', launchId, json);
                    const decoded = json.map(SQLRouteInfo);
                    dispatch(flightData.actions.loadRouteList(decoded));
                })
                .finally(() => setLoading(false));
            return () => controller.abort();
        } else {
            setLoading(false);
            dispatch(flightData.actions.clearRouteList());
        }
    }, [dispatch, launchId, settings]);

    if (launchId === null) return null;

    return (
        <div className='infobox route-list rounded-2 m-1 p-2 border'>
            {loading && <img src={pacman} />}
            {routes.length > 0 && <span>Triangles</span>}
            <CSSTransition nodeRef={routesRef} in={!loading} timeout={300} classNames='animated-list' unmountOnExit>
                <div ref={routesRef}>
                    {routes.map((r, i) => (
                        <Route key={i} route={r} />
                    ))}
                </div>
            </CSSTransition>
        </div>
    );
}

export function Route(props: {route: RouteInfo}) {
    const routeId = useSelector((state) => state.flightData.routeId);
    const dispatch = useDispatch();

    return (
        <div
            className='infobox route d-flex flex-column justify-content-start rounded-2 m-1 p-2 border'
            onClick={React.useCallback(() => {
                if (routeId !== props.route.id) {
                    dispatch(flightData.actions.setRoute(props.route.id));
                    dispatch(flightData.actions.loadRoute(props.route));
                } else {
                    dispatch(flightData.actions.rollRoute());
                }
            }, [props.route, routeId, dispatch])}
        >
            <Info label='Score maximal' text={props.route.maxScore.toFixed(2)} />
            <Info label='Score moyen' text={props.route.avgScore.toFixed(2)} />
            <Info label='Vols' text={props.route.flights.toFixed(0)} />
            <Info label='Dont affichés' text={props.route.flightsSelected.toFixed(0)} />
            {routeId === props.route.id && <FlightList />}
        </div>
    );
}
