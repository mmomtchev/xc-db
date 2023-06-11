import React from 'react';
import {useIntl} from 'react-intl';

import './css/App.css';
import './css/animated-list.css';

import {Launch} from './MenuLaunch';
import {RouteList} from './MenuRoutes';
import Map from './Map';
import Profile from './Profile';
import Settings from './Settings';
import {serverUrl} from './store';

function App() {
    const [backVersion, setBackVersion] = React.useState('connecting...');

    React.useEffect(() => {
        const controller = new AbortController();
        fetch(`${serverUrl}/version`, {signal: controller.signal})
            .then((res) => res.json())
            .then((json) => setBackVersion(json.version));
        return () => controller.abort();
    }, []);
    const intl = useIntl();

    return (
        <div className='main'>
            <header className='header bg-dark'>
                <div className='d-flex flex-row justify-content-around align-items-center'>
                    <div className='d-flex flex-row'>
                        <h1 className='m-0 p-0'>
                            XC-DB <sup>alpha</sup>
                        </h1>
                        <small className='ms-3 m-0 p-0 ms-1'>
                            <p className='m-0'>front: {process.env.REACT_APP_BUILD || 'development'}</p>
                            <p className='m-0'>back: {backVersion}</p>
                        </small>
                    </div>
                    <div>
                        {intl.formatMessage({defaultMessage: 'a project by', id: 'RXBcq1'})}&nbsp;
                        <a className='text-light' href='https://www.velivole.fr'>
                            velivole.fr
                        </a>
                    </div>
                </div>
            </header>
            <div className='d-flex flex-row'>
                <div className='left-menu left-margin d-flex flex-column'>
                    <Settings />
                    <Launch />
                    <RouteList />
                </div>
                <div className='d-flex flex-column w-100'>
                    <Map />
                    <Profile />
                </div>
            </div>
            <footer className='m-0 p-0 px-2 footer tiny'>
                <small className='d-flex flex-row justify-content-between align-items-center'>
                    <p className='m-0 p-0'>
                        Copyleft Momtchil Momtchev 2022, <a href='https://github.com/mmomtchev/xc-db'>Source code</a>
                        &nbsp;under&nbsp;
                        <a href='https://www.gnu.org/licenses/gpl-3.0.en.html'>GPL license</a>
                    </p>
                    <p className='m-0 p-0'>
                        Copyleft Momtchil Momtchev 2022, API content is licensed under&nbsp;
                        <a href='https://creativecommons.org/licenses/by/4.0/'>
                            CC license&nbsp;
                            <img src='https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/by.svg' />
                        </a>
                    </p>
                    <p className='m-0 p-0'>
                        <a href='https://thenounproject.com/icon/paragliding-1282369/'>icon</a> by&nbsp;
                        <a href='https://thenounproject.com/Luis/'>Luis Prado</a> from the&nbsp;
                        <a href='https://thenounproject.com'>NounProject.com</a>
                    </p>
                </small>
            </footer>
        </div>
    );
}

export default App;
