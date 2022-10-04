import {configureStore, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useSelector as _useSelector, useDispatch as _useDispatch} from 'react-redux';
import {FlightSegment} from '../lib/flight';
import {categoriesGlider, categoryGlider, directionsWind, directionWind} from '../lib/types';

export const serverUrl = `${
    process.env.REACT_APP_XCDB_SERVER || (process.env.NODE_ENV === 'development' ? 'http://localhost:8040' : '/api')
}`;

export type LaunchInfo = {
    id: number;
    name?: string;
    lat: number;
    lng: number;
    flights: number;
    score: number;
};

export type RouteInfo = {
    id: number;
    flights: number;
    flightsSelected: number;
    maxScore: number;
    avgScore: number;
    avgDistance: number;
    maxDistance: number;
    tp: number[][];
};

export const SQLRouteInfo = (route) =>
    ({
        id: route.id,
        launch_id: route.launch_id,
        flights: route.flights,
        flightsSelected: route.flights_selected,
        maxScore: route.max_score,
        avgScore: route.avg_score,
        maxDistance: route.max_distance,
        avgDistance: route.avg_distance,
        tp: [
            [route.c1_lng, route.c1_lat],
            [route.c2_lng, route.c2_lat],
            [route.c3_lng, route.c3_lat]
        ]
    } as RouteInfo);

export type FlightInfo = {
    route_id: number;
    id: number;
    launch_id: number;
    type: 'FAI' | 'TRI';
    pilotName: string;
    pilotUrl: string;
    flightUrl: string;
    category: string;
    glider: string;
    distance: number;
    score: number;
    date: number;
    tp: number[][];
    launch: number[];
    ep: number[][];
    windDirection: number;
};

export const SQLFlightInfo = (flight) =>
    ({
        route_id: flight.route_id,
        id: flight.id,
        launch_id: flight.launch_id,
        type: flight.type,
        pilotName: flight.pilot_name,
        pilotUrl: flight.pilot_url,
        flightUrl: flight.flight_url,
        category: flight.category,
        glider: flight.glider,
        distance: flight.distance,
        score: flight.score,
        windDirection: flight.wind_direction,
        date: Date.parse(flight.date),
        tp: [
            [flight.p1_lng, flight.p1_lat],
            [flight.p2_lng, flight.p2_lat],
            [flight.p3_lng, flight.p3_lat]
        ],
        launch: [flight.launch_lng, flight.launch_lat],
        ep: [
            [flight.e1_lng, flight.e1_lat],
            [flight.e2_lng, flight.e2_lat]
        ]
    } as FlightInfo);

export type Settings = {
    mode: 'score' | 'avg' | 'flights';
    category: categoryGlider;
    wind: directionWind;
    score: boolean[];
};

export const flightData = createSlice({
    name: 'flightData',
    initialState: {
        launch: null as LaunchInfo,
        launchId: null as number,
        routesList: [] as RouteInfo[],
        route: null as RouteInfo,
        routeId: null as number,
        routeUnrolled: false,
        flights: [] as FlightInfo[],
        profileId: {type: null as null | 'flight' | 'route', id: null as number},
        profile: [] as FlightSegment[]
    },
    reducers: {
        loadLaunch: (state, action: PayloadAction<LaunchInfo>) => {
            state.launch = action.payload;
        },
        setLaunch: (state, action: PayloadAction<number>) => {
            state.launchId = action.payload;
            flightData.caseReducers.clearRouteList(state);
        },
        loadRouteList: (state, action: PayloadAction<RouteInfo[]>) => {
            state.routesList = action.payload;
            if (state.route?.id && !state.routesList.find((r) => r.id === state.route.id))
                flightData.caseReducers.clearRoute(state);
        },
        clearRouteList: (state) => {
            state.routesList = [];
            flightData.caseReducers.clearRoute(state);
        },
        setRoute: (state, action: PayloadAction<number>) => {
            state.routeId = action.payload;
            flightData.caseReducers.clearFlights(state);
        },
        loadRoute: (state, action: PayloadAction<RouteInfo>) => {
            state.route = action.payload;
            flightData.caseReducers.clearFlights(state);
        },
        clearRoute: (state) => {
            state.route = null;
            state.routeId = null;
            flightData.caseReducers.clearFlights(state);
        },
        rollRoute: (state) => {
            state.routeUnrolled = false;
        },
        unrollRoute: (state) => {
            state.routeUnrolled = true;
        },
        loadFlights: (state, action: PayloadAction<FlightInfo[]>) => {
            state.flights = action.payload;
            flightData.caseReducers.clearProfile(state);
        },
        clearFlights: (state) => {
            state.flights = [];
            flightData.caseReducers.clearProfile(state);
        },
        setProfileFlight: (state, action: PayloadAction<number>) => {
            state.profileId = {type: 'flight', id: action.payload};
        },
        setProfileRoute: (state, action: PayloadAction<number>) => {
            state.profileId = {type: 'route', id: action.payload};
        },
        loadProfile: (state, action: PayloadAction<FlightSegment[]>) => {
            state.profile = action.payload;
        },
        clearProfile: (state) => {
            state.profileId = {type: null, id: null};
            state.profile = [];
        }
    }
});

function initialSettings() {
    const settings = {
        mode: 'flights',
        category: {
            A: true,
            B: true,
            C: true,
            D: true,
            K: true,
            O: true,
            bi: true
        },
        wind: {
            N: true,
            NE: true,
            E: true,
            SE: true,
            S: true,
            SO: true,
            O: true,
            NO: true
        },
        score: [true, true, true, true, true]
    } as Settings;

    if (window.localStorage)
        for (const setting of Object.keys(settings)) {
            try {
                const val = localStorage.getItem(setting);
                if (val) settings[setting] = JSON.parse(val);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }

    return settings;
}

export const settingsSlice = createSlice({
    name: 'settings',
    initialState: initialSettings(),
    reducers: {
        setMode: (state, action: PayloadAction<Settings['mode']>) => {
            state.mode = action.payload;
            if (window.localStorage) localStorage.setItem('mode', JSON.stringify(state.mode));
        },
        setCategory: (state, action: PayloadAction<{cat: typeof categoriesGlider[number]; val: boolean}>) => {
            state.category[action.payload.cat] = action.payload.val;
            if (window.localStorage) localStorage.setItem('category', JSON.stringify(state.category));
        },
        setWind: (state, action: PayloadAction<{wind: typeof directionsWind[number]; val: boolean}>) => {
            state.wind[action.payload.wind] = action.payload.val;
            if (window.localStorage) localStorage.setItem('wind', JSON.stringify(state.wind));
        },
        setScoreGroup: (state, action: PayloadAction<{group: number; val: boolean}>) => {
            state.score[action.payload.group] = action.payload.val;
            if (window.localStorage) localStorage.setItem('score', JSON.stringify(state.score));
        }
    }
});

export const store = configureStore({
    reducer: {
        settings: settingsSlice.reducer,
        flightData: flightData.reducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useDispatch: () => AppDispatch = _useDispatch;
export const useSelector: TypedUseSelectorHook<RootState> = _useSelector;
