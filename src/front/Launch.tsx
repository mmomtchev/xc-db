import React from 'react';

import { useSelector } from './store';
import Info from './Info';

export function Launch() {
    const launch = useSelector(state => state.launch.value);
    if (!launch) return <div></div>;
        
    return (
        <div className='infobox d-flex flex-column justify-content-start'>
            <Info label='Décollage' text={launch.name || `Déco ${launch.id.toString()}`} />
            <Info label='Vols déclarés' text={launch.flights.toString()} />
            <Info label='Score cumulatif' text={launch.score.toFixed(2)} />
            <Info label='Score moyen' text={(launch.score / launch.flights).toFixed(2)} />
        </div>
    );
}
