import React from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {IntlProvider} from 'react-intl';
import ReactGA from 'react-ga';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';

import App from './front/App';
import {store, setRouter} from './front/store';
import {Provider} from 'react-redux';

import fr from './compiled-lang/fr.json';
import en from './compiled-lang/en.json';

const userLang = (navigator.language || 'en-US').split('-')[0];
const messages = {fr, en};

if (process.env.REACT_APP_XCDB_GA) {
    ReactGA.initialize(process.env.REACT_APP_XCDB_GA);
    ReactGA.pageview(window.location.pathname + window.location.search);
}

const router = createBrowserRouter([
    {
        path: '/*',
        element: <App />
    }
]);
setRouter(router);
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <IntlProvider locale={userLang} defaultLocale='en' messages={messages[userLang]}>
                <RouterProvider router={router} />
            </IntlProvider>
        </Provider>
    </React.StrictMode>
);
