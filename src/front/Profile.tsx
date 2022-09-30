import React from 'react';

import round from '../lib/round';
import {RouteInfo, useSelector} from './store';

import pacman from './svg/pacman.svg';
import config from '../config.json';

function tp(ctx: CanvasRenderingContext2D, height: number, label: string, x: number) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.font = '30px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 2, height - 4);
}

function altLine(ctx: CanvasRenderingContext2D, height: number, altScaling: (number) => number, alt: number) {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    const y = altScaling(alt);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(config.tracklog.points, y);
    ctx.stroke();
    ctx.font = '20px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.fillText(`${alt}m`, 2, y - 10);
}

function segmentTrack(ctx: CanvasRenderingContext2D, altScaling: (number) => number, start: number, segment: number[]) {
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(start, altScaling(segment[0]));
    for (let i = 0; i < segment.length; i++) {
        ctx.lineTo(start + i, altScaling(segment[i]));
    }
    ctx.stroke();
}

export default function Profile() {
    const ref = React.useRef<HTMLCanvasElement>();
    const segments = useSelector((state) => state.flightData.profile);
    const spinner = useSelector((state) => state.flightData.spinnerProfile);

    React.useEffect(() => {
        if (ref.current) {
            const ctx = ref.current.getContext('2d');
            const height = ref.current.height;
            ctx.clearRect(0, 0, ref.current.width, height);
            if (segments.length === 4) {
                console.log('drawing', height, segments);

                // Draw the TP lines
                const points = ['TP1', 'TP2', 'TP3', ''];
                tp(ctx, height, '', segments[0].start);
                for (let s = 0; s < 4; s++) {
                    tp(ctx, height, points[s], segments[s].finish);
                }

                // Draw the altitude lines
                const altMax = Math.min(
                    round(Math.max.apply(null, segments.map((s) => s.max).flat()) + 500, 1000),
                    5000
                );
                const altMin = Math.max(round(Math.min.apply(null, segments.map((s) => s.min).flat()) - 500, 1000), 0);
                const altScaling = (x: number) => height * ((altMax - x) / altMax);
                for (let i = 0; i <= altMax; i += 500) {
                    altLine(ctx, height, altScaling, i);
                }

                for (const s of segments) {
                    ctx.strokeStyle = '#800000';
                    segmentTrack(ctx, altScaling, s.start, s.min);
                    ctx.strokeStyle = '#ff0000';
                    segmentTrack(ctx, altScaling, s.start, s.avg);
                    ctx.strokeStyle = '#800000';
                    segmentTrack(ctx, altScaling, s.start, s.max);
                }
            }
        }
    }, [segments]);

    return (
        <React.Fragment>
            {spinner && <img className='profile' src={pacman} />}
            {segments.length > 0 && (
                <canvas
                    className='profile'
                    width={config.tracklog.points}
                    height={config.tracklog.points / 2}
                    ref={ref}
                />
            )}
        </React.Fragment>
    );
}
