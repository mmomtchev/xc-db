import { configureStore, createSlice } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useSelector as _useSelector, useDispatch as _useDispatch } from 'react-redux';

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
    maxScore: number;
    avgScore: number;
    avgDistance: number;
    tp: number[][];
};

export type Settings = {
    mode: 'score' | 'avg' | 'flights';
};

export const launchSlice = createSlice({
    name: 'launch',
    initialState: {
        value: null as LaunchInfo
    },
    reducers: {
        load: (state, action) => {
            state.value = action.payload;
        }
    }
});

export const routesListSlice = createSlice({
    name: 'routesList',
    initialState: {
        value: [] as RouteInfo[]
    },
    reducers: {
        load: (state, action) => {
            state.value = action.payload;
        },
        empty: (state) => {
            state.value = [];
        },
    }
});

export const routeSlice = createSlice({
    name: 'route',
    initialState: {
        value: null as RouteInfo
    },
    reducers: {
        load: (state, action) => {
            state.value = action.payload;
        }
    }
});

export const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        value: {
            mode: 'score'
        } as Settings
    },
    reducers: {
        setMode: (state, action) => {
            state.value.mode = action.payload;
        }
    }
});

export const store = configureStore({
    reducer: {
        settings: settingsSlice.reducer,
        launch: launchSlice.reducer,
        routesList: routesListSlice.reducer,
        route: routeSlice.reducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useDispatch: () => AppDispatch = _useDispatch;
export const useSelector: TypedUseSelectorHook<RootState> = _useSelector;
