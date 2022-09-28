import React from 'react';
import './css/App.css';

import { useSelector, useDispatch, Settings, settingsSlice } from './store';
import { Launch } from './Launch';
import { RouteList } from './Routes';
import Map from './Map';

function ModeButton(props: { label: string, mode: Settings['mode']; }) {
    const settings = useSelector(state => state.settings.value);
    const dispatch = useDispatch();

    return (
        <button
            type='button'
            className={`btn btn-primary ${settings.mode === props.mode ? 'active' : ''}`}
            onClick={() => dispatch(settingsSlice.actions.setMode(props.mode))}
        >
            {props.label}
        </button>
    );
}

function App() {
    return (
        <div className='main'>
            <header className='header'>
                <div className='d-flex flex-row justify-content-around'>
                    <div><h1>XC-DB</h1></div>
                    <div><small>un projet de velivole.fr</small></div>
                </div>
            </header>
            <div className='d-flex flex-row'>
                <div className='left-menu d-flex flex-column'>
                    <div className='btn-group m-1 p-1' role='group'>
                        <ModeButton label='Score' mode='score' />
                        <ModeButton label='Vols' mode='flights' />
                        <ModeButton label='Moyenne' mode='avg' />
                    </div>
                    <Launch />
                    <RouteList />
                </div>
                <Map />
            </div>
        </div>
    );
}

export default App;
