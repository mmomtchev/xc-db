import {fromLonLat} from 'ol/proj';
import {Circle, Point, LineString} from 'ol/geom';
import {RFeature, RStyle} from 'rlayers';

import {useSelector} from './store';
import React from 'react';

export default function MapTrack() {
    const ref = React.useRef<HTMLCanvasElement>();
    const segments = useSelector((state) => state.flightData.profile);
    if (!segments.length || !segments[0].lat || !segments[0].lng) return <React.Fragment />;

    return (
        <React.Fragment>
            {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                    <RFeature
                        geometry={
                            new LineString([
                                fromLonLat([segments[i].lng[0], segments[i].lat[0]]),
                                fromLonLat([
                                    segments[i + 1 === 4 ? 1 : i + 1].lng[0],
                                    segments[i + 1 === 4 ? 1 : i + 1].lat[0]
                                ])
                            ])
                        }
                    />
                    <RFeature geometry={new Circle(fromLonLat([segments[i].lng[0], segments[i].lat[0]]), 300)} />
                </React.Fragment>
            ))}
            {segments.map((seg, i) => (
                <RFeature
                    key={i}
                    geometry={new LineString(seg.lat.map((_, i) => fromLonLat([seg.lng[i], seg.lat[i]])))}
                >
                    <RStyle.RStyle>
                        <RStyle.RStroke color='black' width={3} />
                    </RStyle.RStyle>
                </RFeature>
            ))}
            <RFeature geometry={new Point(fromLonLat([segments[0].lng[0], segments[0].lat[0]]))}>
                <RStyle.RStyle>
                    <RStyle.RText text='&#10148;' font='bold 25px sans-serif'>
                        <RStyle.RStroke color='black' width={3} />
                        <RStyle.RFill color='#333333' />
                    </RStyle.RText>
                </RStyle.RStyle>
            </RFeature>
            <RFeature
                geometry={
                    new Point(
                        fromLonLat([
                            segments[3].lng[segments[3].lng.length - 1],
                            segments[3].lat[segments[3].lat.length - 1]
                        ])
                    )
                }
            >
                <RStyle.RStyle>
                    <RStyle.RText text='&#9633;' font='bold 25px sans-serif'>
                        <RStyle.RStroke color='black' width={3} />
                        <RStyle.RFill color='#333333' />
                    </RStyle.RText>
                </RStyle.RStyle>
            </RFeature>
        </React.Fragment>
    );
}
