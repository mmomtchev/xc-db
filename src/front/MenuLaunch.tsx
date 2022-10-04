import React from 'react';
import {useMatch} from 'react-router-dom';

import {flightData, LaunchInfo, serverUrl, useDispatch, useSelector} from './store';
import Info from './Info';
import {debug} from '../lib/debug';
import {fetchFilters} from './Settings';

export function Launch() {
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch) || null;
    const launch = useSelector((state) => state.flightData.launch);
    const settings = useSelector((state) => state.settings);
    const dispatch = useDispatch();

    React.useEffect(() => {
        if (!launchId) return;
        const controller = new AbortController();
        debug('loading launch', launchId, fetchFilters(settings));
        fetch(`${serverUrl}/launch/${launchId}?${fetchFilters(settings)}`, {signal: controller.signal})
            .then((res) => res.json())
            .then((json: LaunchInfo) => {
                debug('loaded launch', launchId);
                dispatch(flightData.actions.loadLaunch(json));
            })
            .catch((e) => {
                dispatch(flightData.actions.clearRouteList());
                // eslint-disable-next-line no-console
                console.error(e);
            });
        return () => controller.abort();
    }, [dispatch, launchId, settings]);

    const onClick = React.useCallback(() => dispatch(flightData.actions.rollRoute()), [dispatch]);

    if (!launch) return <div className='infobox launch m-2'>Choissisez un décollage sur la carte</div>;

    return (
        <div
            className='infobox launch d-flex flex-column justify-content-start rounded-2 m-1 p-2 text-bg-dark'
            onClick={onClick}
        >
            <p className='fw-bold'>{launch.name || `Déco ${launch.id.toString()}`}</p>
            <Info label='Vols déclarés' text={launch.flights.toString()} />
            <Info label='Score cumulatif' text={launch.score.toFixed(2)} />
            <Info label='Score moyen' text={(launch.score / launch.flights).toFixed(2)} />
        </div>
    );
}
