import React from 'react';
import './css/App.css';
import './css/animated-list.css';

import {Launch} from './MenuLaunch';
import {RouteList} from './MenuRoutes';
import Map from './Map';
import Profile from './Profile';
import Settings from './Settings';

function App() {
    return (
        <div className='main'>
            <header className='header bg-dark'>
                <div className='d-flex flex-row justify-content-around'>
                    <div>
                        <h1>
                            XC-DB <sup>alpha</sup>
                        </h1>
                    </div>
                    <div></div>
                    <div>
                        <small>
                            un projet de&nbsp;
                            <a className='text-light' href='https://www.velivole.fr'>
                                velivole.fr
                            </a>
                        </small>
                    </div>
                </div>
            </header>
            <div className='d-flex flex-row'>
                <div className='left-menu d-flex flex-column'>
                    <Settings />
                    <Launch />
                    <RouteList />
                </div>
                <div className='d-flex flex-column w-100'>
                    <Map />
                    <Profile />
                </div>
            </div>
        </div>
    );
}

export default App;
