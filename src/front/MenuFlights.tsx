import React from 'react';

import {useSelector, FlightInfo} from './store';

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
    return (
        <div className='infobox flight d-flex flex-column text-bg-dark border rounded-1 p-1'>
            <div className='pilot fw-bold mr-1'>
                <a className='text-light' href={props.flight.pilotUrl}>
                    {props.flight.pilotName}
                </a>
            </div>
            <div className='pilot fw-bold mr-1 align-self-end badge'>{new Date(props.flight.date).toDateString()}</div>
            <div className='score d-flex flex-row justify-content-between'>
                <span className='fw-bold'>{props.flight.category}</span>
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
