import React from 'react';
import {useMatch} from 'react-router-dom';
import {useIntl} from 'react-intl';

import {flightData, LaunchInfo, serverUrl, useDispatch, useSelector} from './store';
import Info from './Info';
import {debug} from '../lib/debug';
import {fetchFilters} from './Settings';
import WindRose from './WindRose';

export function Launch() {
    const launchId = parseInt(useMatch('/launch/:launch/*')?.params?.launch || '') || null;
    const launch = useSelector((state) => state.flightData.launch);
    const settings = useSelector((state) => state.settings);
    const dispatch = useDispatch();
    const intl = useIntl();

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
                // eslint-disable-next-line no-console
                console.error(e);
            });
        return () => controller.abort();
    }, [dispatch, launchId, settings]);

    const onClick = React.useCallback(() => dispatch(flightData.actions.rollRoute()), [dispatch]);

    if (!launch)
        return (
            <div className='infobox launch m-2'>
                {intl.formatMessage({defaultMessage: 'Select a launch location on the map', id: 'gAb0kG'})}
            </div>
        );

    return (
        <div
            className='infobox launch d-flex flex-column justify-content-start rounded-2 m-1 p-2 text-bg-dark'
            onClick={onClick}
        >
            <p className='fw-bold'>
                {launch.name ||
                    `${intl.formatMessage({defaultMessage: 'launch', id: 'TS8xq9'})} ${launch.id.toString()}`}
            </p>
            <Info
                label={intl.formatMessage({defaultMessage: 'Declared flights', id: 'JNzOh2'})}
                text={launch.flights.toString()}
            />
            <Info
                label={intl.formatMessage({defaultMessage: 'Total score', id: 'me6E3h'})}
                text={launch.score.toFixed(2)}
            />
            <Info
                label={intl.formatMessage({defaultMessage: 'Average score', id: '/0WDGe'})}
                text={(launch.score / launch.flights).toFixed(2)}
            />
            <Info label={intl.formatMessage({defaultMessage: 'Yearly average wind', id: '88r8IX'})}>
                <WindRose className='wind-rose' wind={launch.wind} />
            </Info>
        </div>
    );
}
