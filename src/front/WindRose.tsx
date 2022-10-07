import React from 'react';
import {useIntl} from 'react-intl';
import {directionsWind} from '../lib/types';
import {localizedDirections} from './Intl';

const radius = 100;

export default function WindRose(props: {className: string; color?: string; radius: number; wind: number[]}) {
    const ref = React.useRef<HTMLCanvasElement>(null);
    const intl = useIntl();

    React.useEffect(() => {
        if (!ref.current) return;
        const ctx = ref.current.getContext('2d');
        if (!ctx) return;
        const height = ref.current.height;
        ctx.clearRect(0, 0, ref.current.width, height);

        // Mathematical coordinates to circle coordinates
        const mapX = (x: number) => x + radius;
        const mapY = (y: number) => radius - y;

        ctx.strokeStyle = props.color || 'white';
        ctx.fillStyle = props.color || 'white';
        ctx.lineWidth = 5;

        ctx.beginPath();
        const max = Math.max(...props.wind);
        let first = 0;
        for (let i = 0; i < props.wind.length; i++) {
            const angle = i * (Math.PI / 4);
            const r = radius * (props.wind[i] / max);
            if (i === 0) {
                first = {x: mapX(Math.sin(angle) * r), y: mapY(Math.cos(angle) * r)};
                ctx.moveTo(first.x, first.y);
            } else {
                ctx.lineTo(mapX(Math.sin(angle) * r), mapY(Math.cos(angle) * r));
            }
        }
        ctx.lineTo(first.x, first.y);
        ctx.stroke();

        for (let i = 0; i < directionsWind.length; i += 2) {
            const angle = i * (Math.PI / 4);
            const x = Math.sin(angle) * radius;
            const y = Math.cos(angle) * radius;

            ctx.font = `${radius / 2}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue"`;
            ctx.textAlign = Math.abs(x) < 0.01 ? 'center' : x > 0 ? 'right' : 'left';
            ctx.textBaseline = Math.abs(y) < 0.01 ? 'middle' : y > 0 ? 'top' : 'bottom';
            ctx.fillText(localizedDirections(intl)[directionsWind[i]], mapX(x), mapY(y));
        }

        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(radius, radius, 1, 0, 2 * Math.PI);
        ctx.stroke();
    }, [ref, props.wind, props.color, intl]);

    return <canvas className={props.className} width={2 * radius} height={2 * radius} ref={ref} />;
}
