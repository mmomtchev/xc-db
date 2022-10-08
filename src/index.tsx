import React from 'react';
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {IntlProvider} from 'react-intl';
import ReactGA from 'react-ga';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.js';
import './index.css';

import App from './front/App';
import {store, setRouter} from './front/store';
import {Provider} from 'react-redux';

import reportWebVitals from './front/reportWebVitals';

import fr from './compiled-lang/fr.json';
import en from './compiled-lang/en.json';

const userLang = (navigator.language || 'en-US').split('-')[0];
const messages = {fr, en};

if (process.env.REACT_APP_XCDB_GA) {
    ReactGA.initialize(process.env.REACT_APP_XCDB_GA);
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
