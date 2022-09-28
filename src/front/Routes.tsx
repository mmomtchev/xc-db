import React from 'react';

import Info from './Info';
import { RouteInfo, routeSlice, routesListSlice, useDispatch, useSelector } from './store';

export function RouteList() {
    const launch = useSelector(state => state.launch.value);
    const routes = useSelector(state => state.routesList.value);
    const dispatch = useDispatch();

    React.useEffect(() => {
        if (launch?.id)
            fetch(`${process.env.REACT_APP_XCDB_SERVER}/route/launch/${launch.id}`)
                .then((res) => res.json())
                .then((json) => {
                    console.log('RoutesList', launch.id, json);
                    const decoded = json.map((route) => ({
                        id: route.id,
                        flights: route.num,
                        maxScore: route.maxscore,
                        avgScore: route.score,
                        tp: [
                            [route.c1_lng, route.c1_lat],
                            [route.c2_lng, route.c2_lat],
                            [route.c3_lng, route.c3_lat],
                        ]
                    })) as RouteInfo[];
                    dispatch(routesListSlice.actions.load(decoded));
                });
        else
            dispatch(routesListSlice.actions.empty());
    }, [dispatch, launch?.id]);

    return (
        <div className='infobox route-list'>
            Trajets
            {
                routes.map((r, i) => <Route key={i} route={r} />)
            }
        </div>
    );
}

export function Route(props: { route: RouteInfo; }) {
    const dispatch = useDispatch();

    if (!props.route)
        return <div></div>;

    return (
        <div className='infobox route d-flex flex-column justify-content-start' onClick={() => {
            fetch(`${process.env.REACT_APP_XCDB_SERVER}/flight/route/${props.route.id}`)
                .then((res) => res.json())
                .then((json) => {
                    console.log('Route', props.route.id, json);
                    dispatch(routeSlice.actions.load(json));
                });
        }}>
            <Info label='Score maximal' text={props.route.maxScore.toFixed(2)} />
            <Info label='Score moyen' text={props.route.avgScore.toFixed(2)} />
            <Info label='Réalisations' text={props.route.flights.toFixed(0)} />
        </div>
    );
}
