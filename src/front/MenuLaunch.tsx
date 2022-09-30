import React from 'react';

import {flightData, useDispatch, useSelector} from './store';
import Info from './Info';

export function Launch() {
    const launch = useSelector((state) => state.flightData.launch);
    const dispatch = useDispatch();
    if (!launch) return <div></div>;

    return (
        <div
            className='infobox launch d-flex flex-column justify-content-start rounded-2 m-1 p-2 text-bg-dark'
            onClick={() => dispatch(flightData.actions.clearRoute())}
        >
            <p className='fw-bold'>{launch.name || `Déco ${launch.id.toString()}`}</p>
            <Info label='Vols déclarés' text={launch.flights.toString()} />
            <Info label='Score cumulatif' text={launch.score.toFixed(2)} />
            <Info label='Score moyen' text={(launch.score / launch.flights).toFixed(2)} />
        </div>
    );
}
