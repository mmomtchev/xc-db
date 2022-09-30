import React from 'react';
import {CSSTransition} from 'react-transition-group';

import Info from './Info';
import {FlightList} from './MenuFlights';
import {RouteInfo, useDispatch, useSelector, SQLRouteInfo, SQLFlightInfo, flightData} from './store';

import pacman from './svg/pacman.svg';

export function RouteList() {
    const routesRef = React.useRef(null);
    const [loading, setLoading] = React.useState(false);

    const launch = useSelector((state) => state.flightData.launch);
    const routes = useSelector((state) => state.flightData.routesList);
    const dispatch = useDispatch();

    React.useEffect(() => {
        if (launch?.id) {
            setLoading(true);
            fetch(`${process.env.REACT_APP_XCDB_SERVER}/route/launch/${launch.id}`)
                .then((res) => res.json())
                .then((json) => {
                    console.log('RoutesList', launch.id, json);
                    const decoded = json.map(SQLRouteInfo);
                    dispatch(flightData.actions.loadRouteList(decoded));
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
            dispatch(flightData.actions.clearRouteList());
        }
    }, [dispatch, launch?.id]);

    if (launch?.id === undefined) return <div></div>;

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
    const launch = useSelector((state) => state.flightData.launch);
    const route = useSelector((state) => state.flightData.route);
    const dispatch = useDispatch();

    const [inFlights, setInFlights] = React.useState(false);
    const flightsRef = React.useRef(null);

    //console.log('render', inFlights, route?.id);

    return (
        <div
            className='infobox route d-flex flex-column justify-content-start rounded-2 m-1 p-2 border'
            onClick={() => {
                if (route?.id === props.route.id) {
                    setInFlights(false);
                } else {
                    setInFlights(false);
                    dispatch(flightData.actions.loadRoute(props.route));
                    fetch(`${process.env.REACT_APP_XCDB_SERVER}/flight/route/${props.route.id}/launch/${launch.id}`)
                        .then((res) => res.json())
                        .then((json) => {
                            console.log('Flights', props.route.id, launch.id, json);
                            const flights = json.map(SQLFlightInfo);
                            setInFlights(true);
                            dispatch(flightData.actions.loadFlights(flights));
                            dispatch(flightData.actions.spinnerProfile(true));
                        })
                        .then(() =>
                            fetch(
                                `${process.env.REACT_APP_XCDB_SERVER}/point/route/${props.route.id}/launch/${launch.id}`
                            )
                        )
                        .then((res) => res.json())
                        .then((json) => {
                            console.log('Points', props.route.id, launch.id, json);
                            dispatch(flightData.actions.loadProfile(json));
                            dispatch(flightData.actions.spinnerProfile(false));
                        });
                }
            }}
        >
            <Info label='Score maximal' text={props.route.maxScore.toFixed(2)} />
            <Info label='Score moyen' text={props.route.avgScore.toFixed(2)} />
            <Info label='Vols' text={props.route.flights.toFixed(0)} />
            <Info label='Dont avec les critères' text={props.route.flightsLaunch.toFixed(0)} />
            {route?.id === props.route.id && (
                <CSSTransition
                    nodeRef={flightsRef}
                    in={inFlights}
                    timeout={300}
                    classNames='animated-list'
                    unmountOnExit
                    onExited={() => {
                        dispatch(flightData.actions.clearRoute());
                    }}
                >
                    <FlightList ref={flightsRef} />
                </CSSTransition>
            )}
        </div>
    );
}
