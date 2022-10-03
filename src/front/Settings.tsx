import React from 'react';

import {useSelector, useDispatch, Settings, settingsSlice} from './store';
import {categoriesGlider, categoriesScore, directionsWind} from '../lib/types';

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
        if (settings.category[categoriesGlider[s]]) score += '1';
        else score += '0';

    return `&wind=${wind}&cat=${cat}&score=${score}&order=${settings.mode}`;
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

    return (
        <button
            type='button'
            className={`badge btn btn-primary ${setting ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setWind({wind: props.wind, val: !setting}))}
        >
            {props.wind}
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
    return (
        <React.Fragment>
            <div className='btn-group m-1 p-1' role='group'>
                <ModeButton label='Score' mode='score' />
                <ModeButton label='Vols' mode='flights' />
                <ModeButton label='Moyenne' mode='avg' />
            </div>
            <div className='btn-group m-1 p-1' role='group'>
                <table>
                    <tbody>
                        <tr>
                            <td align='left'>
                                <WindButton wind='NO' />
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
                                <WindButton wind='O' />
                            </td>
                            <td>&#129517;</td>
                            <td align='right'>
                                <WindButton wind='E' />
                            </td>
                        </tr>
                        <tr>
                            <td align='left'>
                                <WindButton wind='SO' />
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
            <div className='btn-group m-1 p-1' role='group'>
                {categoriesGlider.map((c, i) => (
                    <CategoryButton key={i} cat={c} />
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
