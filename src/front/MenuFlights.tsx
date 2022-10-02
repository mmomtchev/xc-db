import React from 'react';
import {windSVG} from '../lib/wind-svg';

import {useSelector, FlightInfo, useDispatch, flightData, directionsWind} from './store';

export const FlightList = React.forwardRef((_, ref: React.ForwardedRef<HTMLDivElement>) => {
    const flights = useSelector((state) => state.flightData.flights);

    return (
        <div ref={ref} className='infobox flight-list'>
            {flights.map((f, i) => (
                <Flight key={i} flight={f} />
            ))}
        </div>
    );
});

export function Flight(props: {flight: FlightInfo}) {
    const launch = useSelector((state) => state.flightData.launch);
    const dispatch = useDispatch();

    return (
        <div
            className='infobox flight d-flex flex-column text-bg-dark border rounded-1 p-1'
            onClick={(e) => {
                e.stopPropagation();
                dispatch(flightData.actions.spinnerProfile(true));
                fetch(`${process.env.REACT_APP_XCDB_SERVER}/point/flight/${props.flight.id}`)
                    .then((res) => res.json())
                    .then((json) => {
                        console.log('Load points', props.flight.id);
                        dispatch(flightData.actions.loadProfile(json));
                    })
                    .catch((e) => console.error(e))
                    .then(() => dispatch(flightData.actions.spinnerProfile(false)));
            }}
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
                    {directionsWind[Math.floor(((props.flight.windDirection + 22.5) % 360) / 45)]}
                    &nbsp;
                    <svg
                        width={16}
                        height={16}
                        dangerouslySetInnerHTML={{
                            __html: windSVG({direction: props.flight.windDirection, inner: 'white', outer: 'white'})
                        }}
                    />
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
