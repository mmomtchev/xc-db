import React from 'react';

import {useSelector, useDispatch, Settings, settingsSlice, categoriesGlider, categoriesScore} from './store';

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
