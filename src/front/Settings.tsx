import React from 'react';
import {useIntl} from 'react-intl';

import {useSelector, useDispatch, Settings, settingsSlice} from './store';
import {localizedDirections, localizedMonths} from './Intl';
import {categoriesGlider, categoriesScore, directionsWind, namesMonth} from '../lib/types';

import iconUncleSam from './jpg/uncle_sam.jpg';

export function fetchFilters(settings: Settings): string {
    let wind = '';
    for (const w in directionsWind)
        if (settings.wind[directionsWind[w]]) wind += '1';
        else wind += '0';

    let cat = '';
    for (const c in categoriesGlider)
        if (settings.category[categoriesGlider[c]]) cat += '1';
        else cat += '0';

    let score = '';
    for (const s in categoriesScore)
        if (settings.score[s]) score += '1';
        else score += '0';

    let month = '';
    for (const m in namesMonth)
        if (settings.month[namesMonth[m]]) month += '1';
        else month += '0';

    return `&wind=${wind}&cat=${cat}&score=${score}&month=${month}&order=${settings.mode}`;
}

function ModeButton(props: {label: string; mode: Settings['mode']}) {
    const mode = useSelector((state) => state.settings.mode);
    const dispatch = useDispatch();

    return (
        <button
            type='button'
            className={`btn btn-primary ${mode === props.mode ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setMode(props.mode))}
        >
            {props.label}
        </button>
    );
}

function CategoryButton(props: {cat: typeof categoriesGlider[number]}) {
    const setting = useSelector((state) => state.settings.category[props.cat]);
    const dispatch = useDispatch();

    return (
        <button
            type='button'
            className={`btn btn-primary ${setting ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setCategory({cat: props.cat, val: !setting}))}
        >
            {props.cat}
        </button>
    );
}

function WindButton(props: {wind: typeof directionsWind[number]}) {
    const setting = useSelector((state) => state.settings.wind[props.wind]);
    const dispatch = useDispatch();
    const intl = useIntl();

    return (
        <button
            type='button'
            className={`badge btn btn-primary ${setting ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setWind({wind: props.wind, val: !setting}))}
        >
            {localizedDirections(intl)[props.wind]}
        </button>
    );
}

function MonthButton(props: {month: typeof namesMonth[number]}) {
    const intl = useIntl();
    const setting = useSelector((state) => state.settings.month[props.month]);
    const dispatch = useDispatch();

    return (
        <button
            type='button'
            className={`badge btn btn-primary ${setting ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setMonth({month: props.month, val: !setting}))}
        >
            {localizedMonths(intl)[props.month]}
        </button>
    );
}

function ScoreButton(props: {scoreGroup: number}) {
    const setting = useSelector((state) => state.settings.score[props.scoreGroup]);
    const dispatch = useDispatch();
    const group = categoriesScore[props.scoreGroup];

    return (
        <button
            type='button'
            className={`badge btn btn-primary ${setting ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setScoreGroup({group: props.scoreGroup, val: !setting}))}
        >
            {group.from && group.to && `${group.from}-${group.to}`}
            {!group.from && group.to && `<${group.to}`}
            {group.from && !group.to && `>${group.from}`}
        </button>
    );
}

export default function SettingsGroup() {
    const intl = useIntl();
    return (
        <React.Fragment>
            <div className='btn-group m-1 p-1' role='group'>
                <ModeButton label={intl.formatMessage({defaultMessage: 'Score', id: 'oLkLww'})} mode='score' />
                <ModeButton label={intl.formatMessage({defaultMessage: 'Flights', id: 'g0CIY6'})} mode='flights' />
                <ModeButton label={intl.formatMessage({defaultMessage: 'Average', id: 'FnRTEV'})} mode='avg' />
            </div>
            <div className='d-flex flex-row justify-content-around'>
                <div className='btn-group m-1 p-1' role='group'>
                    <table>
                        <tbody>
                            <tr>
                                <td align='left'>
                                    <WindButton wind='NW' />
                                </td>
                                <td>
                                    <WindButton wind='N' />
                                </td>
                                <td align='right'>
                                    <WindButton wind='NE' />
                                </td>
                            </tr>
                            <tr>
                                <td align='left'>
                                    <WindButton wind='W' />
                                </td>
                                <td>&#129517;</td>
                                <td align='right'>
                                    <WindButton wind='E' />
                                </td>
                            </tr>
                            <tr>
                                <td align='left'>
                                    <WindButton wind='SW' />
                                </td>
                                <td>
                                    <WindButton wind='S' />
                                </td>
                                <td align='right'>
                                    <WindButton wind='SE' />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='d-flex flex-column align-items-center'>
                    <img height='80px' width='60px' src={iconUncleSam} />
                    <small>
                        <strong>{intl.formatMessage({defaultMessage: 'YOU?', id: 'bVgjEz'})}</strong>&nbsp;
                        {intl.formatMessage({defaultMessage: 'Are you a sponsor?', id: 'A8mNJ7'})}
                    </small>
                </div>
            </div>
            <div className='btn-group m-1 p-1' role='group'>
                {categoriesGlider.map((c, i) => (
                    <CategoryButton key={i} cat={c} />
                ))}
            </div>
            <div className='btn-group mt-1 mb-0 px-1 pt-1 pb-0 flex-wrap' role='group'>
                {namesMonth.slice(0, 6).map((m, i) => (
                    <MonthButton key={i} month={m} />
                ))}
            </div>
            <div className='btn-group mt-0 mb-1 px-1 pt-0 pb-1 flex-wrap' role='group'>
                {namesMonth.slice(6, 12).map((m, i) => (
                    <MonthButton key={i} month={m} />
                ))}
            </div>
            <div className='btn-group m-1 p-1' role='group'>
                {categoriesScore.map((_, i) => (
                    <ScoreButton key={i} scoreGroup={i} />
                ))}
            </div>
        </React.Fragment>
    );
}
