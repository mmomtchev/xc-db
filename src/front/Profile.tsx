import React from 'react';

import round from '../lib/round';
import {flightData, useDispatch, useSelector} from './store';

import pacman from './svg/pacman.svg';
import config from '../config.json';
import {FlightSegment} from '../lib/flight';
import {debug} from '../lib/debug';
import {fetchFilters} from './Settings';

function tpLine(ctx: CanvasRenderingContext2D, height: number, label: string, x: number) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.font = '30px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"';
    ctx.fillStyle = '#333333';
    ctx.textAlign = x < 900 ? 'left' : 'right';
    ctx.fillText(label, x < 900 ? x + 2 : x - 2, height - 4);
}

function altLine(ctx: CanvasRenderingContext2D, altScaling: (number) => number, alt: number) {
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 1;
    const y = altScaling(alt);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(config.tracklog.points, y);
    ctx.stroke();
    ctx.font = '20px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    if (alt > 0) ctx.fillText(`${alt}m`, 2, y - 10);
}

function segmentTrack(
    ctx: CanvasRenderingContext2D,
    altScaling: (number) => number,
    start: number,
    segment: number[],
    fill?: boolean
) {
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(start, altScaling(segment[0]));
    for (let i = 0; i < segment.length; i++) {
        ctx.lineTo(start + i, altScaling(segment[i]));
        if (fill) {
            ctx.lineTo(start + i, altScaling(0));
            ctx.moveTo(start + i, altScaling(segment[i]));
        }
    }
    ctx.stroke();
}

export default function Profile() {
    const ref = React.useRef<HTMLCanvasElement>();
    const url = useSelector((state) => state.flightData.profileUrl);
    const settings = useSelector((state) => state.settings);
    const dispatch = useDispatch();
    const [spinner, setSpinner] = React.useState(false);

    React.useEffect(() => {
        if (!url) return;
        const controller = new AbortController();
        setSpinner(true);
        fetch(url + '?' + fetchFilters(settings), {signal: controller.signal})
            .then((res) => res.json())
            .then((segments: FlightSegment[]) => {
                debug('loading point', url);
                dispatch(flightData.actions.loadProfile(segments));
                const ctx = ref.current.getContext('2d');
                const height = ref.current.height;
                ctx.clearRect(0, 0, ref.current.width, height);
                if (segments.length > 0) {
                    debug('loaded point - drawing', segments);

                    // Draw the TP lines
                    const points = ['TP1', 'TP2', 'TP3', ''];
                    tpLine(ctx, height, 'Bouclage', segments[0].start);
                    for (let s = 0; s < 4; s++) {
                        tpLine(ctx, height, points[s], segments[s].finish);
                    }

                    // Draw the altitude lines
                    const altMax = Math.min(
                        round(
                            Math.max(
                                Math.max.apply(null, segments.map((s) => s.max).flat()) || -Infinity,
                                Math.max.apply(null, segments.map((s) => s.alt).flat()) || -Infinity
                            ) + 500,
                            1000
                        ),
                        5000
                    );
                    const altMin = Math.max(
                        round(
                            Math.min(
                                Math.min.apply(null, segments.map((s) => s.min).flat()) || Infinity,
                                Math.min.apply(null, segments.map((s) => s.alt).flat()) || Infinity
                            ) - 500,
                            1000
                        ),
                        0
                    );
                    const altScaling = (x: number) => height * ((altMax - x) / altMax);
                    for (let i = 0; i <= altMax; i += 500) {
                        altLine(ctx, altScaling, i);
                    }

                    for (const s of segments) {
                        ctx.strokeStyle = '#800000';
                        if (s.min) segmentTrack(ctx, altScaling, s.start, s.min);
                        if (s.max) segmentTrack(ctx, altScaling, s.start, s.max);
                        ctx.strokeStyle = '#ff0000';
                        if (s.alt) segmentTrack(ctx, altScaling, s.start, s.alt);
                        ctx.fillStyle = '#333333';
                        ctx.strokeStyle = '#000000';
                        if (s.terrain) segmentTrack(ctx, altScaling, s.start, s.terrain, true);
                    }
                }
            })
            // eslint-disable-next-line no-console
            .catch((e) => console.error(e))
            .then(() => setSpinner(false));
        return () => controller.abort();
    }, [dispatch, url, settings]);

    return (
        <React.Fragment>
            {spinner && <img className='profile' src={pacman} />}
            <canvas
                className='profile'
                hidden={spinner}
                width={config.tracklog.points}
                height={config.tracklog.points / 2}
                ref={ref}
            />
        </React.Fragment>
    );
}
