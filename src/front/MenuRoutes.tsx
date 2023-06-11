import React from 'react';
import {useMatch, useNavigate} from 'react-router-dom';
import {useIntl} from 'react-intl';
import {CSSTransition} from 'react-transition-group';

import Info from './Info';
import WindRose from './WindRose';
import {FlightList} from './MenuFlights';
import {fetchFilters} from './Settings';
import {RouteInfo, useDispatch, useSelector, SQLRouteInfo, flightData, serverUrl} from './store';
import {scrollIntoViewIfNeeded} from './lib';
import {debug} from '../lib/debug';

import pacman from './svg/pacman.svg';

export function RouteList() {
    const routesRef = React.useRef(null);
    const [loading, setLoading] = React.useState(false);

    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
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
    const flightId = parseInt(useMatch('/launch/:launch/route/:route/flight/:flight/*')?.params?.flight || '') || null;
    const routeId = parseInt(useMatch('/launch/:launch/route/:route/*')?.params?.route || '') || null;
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
    const route = useSelector((state) => state.flightData.route);
    const flightsUnrolled = useSelector((state) => state.flightData.flightsUnrolled);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const intl = useIntl();

    const ref = React.useRef<HTMLDivElement>(null);

    const onClickRoll = React.useCallback(() => dispatch(flightData.actions.rollFlights()), [dispatch]);
    const onClickUnroll = React.useCallback(() => dispatch(flightData.actions.unrollFlights()), [dispatch]);

    React.useEffect(() => {
        if (routeId !== null && routeId === props.route.id && routeId !== route?.id)
            dispatch(flightData.actions.loadRoute(props.route));
    }, [routeId, props.route, route, dispatch]);

    React.useLayoutEffect(() => {
        if (routeId !== null && routeId === props.route.id && ref.current && !flightId)
            scrollIntoViewIfNeeded(ref.current);
    });

    return (
        <div
            ref={ref}
            className='infobox route d-flex flex-column justify-content-start rounded-2 m-1 p-2 border'
            onClick={React.useCallback(() => {
                if (routeId !== props.route.id) {
                    navigate(`/launch/${launchId}/route/${props.route.id}`);
                } else {
                    dispatch(flightData.actions.rollRoute());
                }
            }, [props.route, routeId, launchId, navigate, dispatch])}
        >
            <Info
                label={intl.formatMessage({defaultMessage: 'Max score', id: 'ojsSBF'})}
                text={props.route.maxScore.toFixed(2)}
            />
            <Info
                label={intl.formatMessage({defaultMessage: 'Average score', id: '/0WDGe'})}
                text={props.route.avgScore.toFixed(2)}
            />
            <Info
                label={intl.formatMessage({defaultMessage: 'Flights', id: 'g0CIY6'})}
                text={props.route.flights.toFixed(0)}
            />
            <Info
                label={intl.formatMessage({defaultMessage: 'Matching launch/selection', id: 'Iwz+XF'})}
                text={props.route.flightsSelected.toFixed(0)}
            />
            {props.route.wind && (
                <Info label={intl.formatMessage({defaultMessage: 'Wind distribution', id: 'Z3+fag'})}>
                    <WindRose className='wind-rose' color='black' wind={props.route.wind} />
                </Info>
            )}
            {flightsUnrolled ? (
                <>
                    <div className='align-self-center mb-2'>
                        <button className='btn btn-primary' onClick={onClickRoll}>
                            {intl.formatMessage({defaultMessage: 'Hide flights', id: 'U/1MQI'})}
                        </button>
                    </div>
                    {routeId !== null && routeId === props.route.id && <FlightList />}
                </>
            ) : (
                <div className='align-self-center'>
                    <button className='btn btn-primary' onClick={onClickUnroll}>
                        {intl.formatMessage({defaultMessage: 'Unroll flights', id: 'sB2LtZ'})}
                    </button>
                </div>
            )}
        </div>
    );
}
