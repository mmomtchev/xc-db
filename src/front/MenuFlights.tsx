import React, {useCallback} from 'react';
import {useMatch, useNavigate} from 'react-router-dom';
import {useIntl} from 'react-intl';
import {windSVG} from '../lib/wind-svg';
import {CSSTransition} from 'react-transition-group';

import {useSelector, FlightInfo, useDispatch, flightData, SQLFlightInfo, serverUrl} from './store';
import {directionsWind} from '../lib/types';
import {scrollIntoViewIfNeeded} from './lib';
import {fetchFilters} from './Settings';
import {debug} from '../lib/debug';

export function FlightList() {
    const flights = useSelector((state) => state.flightData.flights);
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
    const routeId = parseInt(useMatch('/launch/:launch/route/:route/*')?.params?.route || '') || null;

    const settings = useSelector((state) => state.settings);
    const routeUnrolled = useSelector((state) => state.flightData.routeUnrolled);
    const dispatch = useDispatch();
    const flightsRef = React.useRef<HTMLDivElement>(null);
    const flightsUnrolled = useSelector((state) => state.flightData.flightsUnrolled);
    const intl = useIntl();

    const show = React.useMemo(() => routeUnrolled && flightsUnrolled, [routeUnrolled, flightsUnrolled]);
    const onClickRoll = React.useCallback(
        (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            e.stopPropagation();
            dispatch(flightData.actions.rollFlights());
        },
        [dispatch]
    );
    const onClickUnroll = React.useCallback(
        (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            e.stopPropagation();
            dispatch(flightData.actions.unrollFlights());
        },
        [dispatch]
    );

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
                dispatch(flightData.actions.unrollRoute());
            })
            // eslint-disable-next-line no-console
            .catch((e) => console.error(e));
        return () => controller.abort();
    }, [routeId, launchId, settings, dispatch]);

    return (
        <>
            {flightsUnrolled ? (
                <>
                    <div className='align-self-center mb-2'>
                        <button className='btn btn-dark' onClick={onClickRoll}>
                            {intl.formatMessage({defaultMessage: 'Hide flights', id: 'U/1MQI'})}
                        </button>
                    </div>
                </>
            ) : (
                <div className='align-self-center'>
                    <button className='btn btn-dark' onClick={onClickUnroll}>
                        {intl.formatMessage({defaultMessage: 'Unroll flights', id: 'sB2LtZ'})}
                    </button>
                </div>
            )}
            <CSSTransition
                nodeRef={flightsRef}
                in={show}
                timeout={300}
                classNames='animated-list'
                unmountOnExit
                onExited={React.useCallback(() => {
                    if (!routeUnrolled) dispatch(flightData.actions.clearRoute());
                }, [dispatch, routeUnrolled])}
            >
                <div ref={flightsRef} className='infobox flight-list'>
                    {React.useMemo(() => flights.map((f, i) => <Flight key={i} flight={f} />), [flights])}
                </div>
            </CSSTransition>
        </>
    );
}

export function Flight(props: {flight: FlightInfo}) {
    const launch = useSelector((state) => state.flightData.launch);
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
    const routeId = parseInt(useMatch('/launch/:launch/route/:route/*')?.params?.route || '') || null;
    const flightId = parseInt(useMatch('/launch/:launch/route/:route/flight/:flight/*')?.params?.flight || '') || null;
    const navigate = useNavigate();
    const intl = useIntl();
    const active = React.useMemo(
        () => (props.flight.id === flightId ? 'border border-4 border-primary' : 'border'),
        [props.flight.id, flightId]
    );

    const ref = React.useRef<HTMLDivElement>(null);
    React.useLayoutEffect(() => {
        if (flightId !== null && flightId === props.flight.id && ref.current) scrollIntoViewIfNeeded(ref.current);
    });

    return (
        <div
            ref={ref}
            className={`infobox flight d-flex flex-column text-bg-dark ${active} rounded-1 p-1`}
            onClick={useCallback(
                (e) => {
                    e.stopPropagation();
                    navigate(`/launch/${launchId}/route/${routeId}/flight/${props.flight.id}`);
                },
                [props.flight.id, launchId, routeId, navigate]
            )}
        >
            <div className='d-flex flex-row justify-content-between pilot fw-bold'>
                <strong>{props.flight.pilotName}</strong>
                <a
                    className='text-light text-decoration-none'
                    href={props.flight.flightUrl}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(e) => e.stopPropagation()}
                >
                    &#x2299;
                </a>
            </div>
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
                <div className='fw-bold'>{intl.formatDate(new Date(props.flight.date))}</div>
            </div>
            <div className='score d-flex flex-row justify-content-between'>
                <span className='fw-bold'>{props.flight.category}</span>
                &nbsp;
                {props.flight.launch_id !== launch.id ? (
                    <del className='border rounded-2'>
                        {intl.formatMessage({defaultMessage: 'launch', id: 'TS8xq9'})}
                    </del>
                ) : (
                    <div></div>
                )}
                &nbsp;
                <span>{props.flight.glider}</span>
            </div>
            <div className='score d-flex flex-row justify-content-between'>
                <span className='fw-bold'>{props.flight.score.toFixed(2)} pts</span>
                &nbsp;
                <span className='badge fw-bold border border-1 border-secondary rounded-2'>
                    {props.flight.type === 'FAI' ? 'FAI' : ''}
                </span>
                &nbsp;
                <span className='fw-bold'>{props.flight.distance.toFixed(2)} km</span>
            </div>
        </div>
    );
}
