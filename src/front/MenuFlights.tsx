import React, {useCallback} from 'react';
import {windSVG} from '../lib/wind-svg';
import {CSSTransition} from 'react-transition-group';

import {useSelector, FlightInfo, useDispatch, flightData, SQLFlightInfo, serverUrl} from './store';
import {directionsWind} from '../lib/types';
import {debug} from '../lib/debug';
import {fetchFilters} from './Settings';

export function FlightList() {
    const flights = useSelector((state) => state.flightData.flights);
    const routeId = useSelector((state) => state.flightData.routeId);
    const launchId = useSelector((state) => state.flightData.launchId);
    const settings = useSelector((state) => state.settings);
    const dispatch = useDispatch();
    const [inFlights, setInFlights] = React.useState(false);
    const flightsRef = React.useRef<HTMLDivElement>();

    React.useEffect(() => {
        if (!routeId) return;
        const controller = new AbortController();
        debug('loading flight/route', {launchId, routeId, filters: fetchFilters(settings)});
        fetch(`${serverUrl}/flight/route/${routeId}?${fetchFilters(settings)}`, {signal: controller.signal})
            .then((res) => res.json())
            .then((json) => {
                debug('loaded flight/route', {launchId, routeId});
                const flights = json.map(SQLFlightInfo);
                dispatch(flightData.actions.loadFlights(flights));
                setInFlights(true);
                dispatch(flightData.actions.setProfile(`${serverUrl}/point/route/${routeId}`));
            })
            // eslint-disable-next-line no-console
            .catch((e) => console.error(e));
        return () => controller.abort();
    }, [routeId, launchId, settings, dispatch]);

    return (
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
            <div ref={flightsRef} className='infobox flight-list'>
                {flights.map((f, i) => (
                    <Flight key={i} flight={f} />
                ))}
            </div>
        </CSSTransition>
    );
}

export function Flight(props: {flight: FlightInfo}) {
    const launch = useSelector((state) => state.flightData.launch);
    const dispatch = useDispatch();

    return (
        <div
            className='infobox flight d-flex flex-column text-bg-dark border rounded-1 p-1'
            onClick={useCallback(
                (e) => {
                    e.stopPropagation();
                    dispatch(flightData.actions.setProfile(`${serverUrl}/point/flight/${props.flight.id}`));
                },
                [dispatch, props.flight.id]
            )}
        >
            <a
                className='pilot fw-bold mr-1 text-light'
                href={props.flight.flightUrl}
                target='_blank'
                rel='noreferrer'
                onClick={(e) => e.stopPropagation()}
            >
                {props.flight.pilotName}
            </a>
            <div className='d-flex flex-row justify-content-between badge'>
                <div className='fw-bold'>
                    {props.flight.windDirection !== null ? (
                        <span>
                            {directionsWind[Math.floor(((props.flight.windDirection + 22.5) % 360) / 45)]}
                            &nbsp;
                            <svg
                                width={16}
                                height={16}
                                dangerouslySetInnerHTML={{
                                    __html: windSVG({
                                        direction: props.flight.windDirection,
                                        inner: 'white',
                                        outer: 'white'
                                    })
                                }}
                            />
                        </span>
                    ) : (
                        <span></span>
                    )}
                </div>
                <div className='fw-bold'>{new Date(props.flight.date).toDateString()}</div>
            </div>
            <div className='score d-flex flex-row justify-content-between'>
                <span className='fw-bold'>{props.flight.category}</span>
                &nbsp;
                {props.flight.launch_id !== launch.id ? (
                    <div className='border rounded-2'>déco différent</div>
                ) : (
                    <div></div>
                )}
                &nbsp;
                <span>{props.flight.glider}</span>
            </div>
            <div className='score d-flex flex-row justify-content-between'>
                <span className='fw-bold'>{props.flight.score.toFixed(2)} pts</span>
                &nbsp;
                <span className='badge fw-bold border rounded-2'>{props.flight.type === 'FAI' ? 'FAI' : ''}</span>
                &nbsp;
                <span className='fw-bold'>{props.flight.distance.toFixed(2)} km</span>
            </div>
        </div>
    );
}
