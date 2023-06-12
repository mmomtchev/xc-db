import {fromLonLat} from 'ol/proj';
import {Circle, Point, LineString} from 'ol/geom';
import {RFeature, RStyle} from 'rlayers';

import {useSelector} from './store';
import React from 'react';

function TriangleSide(props: {start: [number, number]; finish: [number, number]}) {
    return (
        <>
            <RFeature geometry={new LineString([fromLonLat(props.start), fromLonLat(props.finish)])}>
                <RStyle.RStyle>
                    <RStyle.RStroke color='yellow' width={5} />
                </RStyle.RStyle>
            </RFeature>
            <RFeature geometry={new Circle(fromLonLat(props.start), 1000)}>
                <RStyle.RStyle>
                    <RStyle.RStroke color='yellow' width={5} />
                </RStyle.RStyle>
            </RFeature>
        </>
    );
}

export default function MapTrack() {
    const segments = useSelector((state) => state.flightData.profile);
    if (!segments.length || !segments[0].lat || !segments[0].lng) return <React.Fragment />;

    return (
        <React.Fragment>
            {/* Triangle sides */}
            {[2, 3, 4].map((i) => (
                <React.Fragment key={i}>
                    <TriangleSide
                        start={[segments[i].lng[0], segments[i].lat[0]]}
                        finish={[
                            segments[i === 4 ? 2 : i].lng[i === 4 ? 0 : segments[i].lng.length - 1],
                            segments[i === 4 ? 2 : i].lat[i === 4 ? 0 : segments[i].lng.length - 1]
                        ]}
                    />
                </React.Fragment>
            ))}
            {/* Flight track */}
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
            {/* Launch */}
            <RFeature geometry={new Point(fromLonLat([segments[0].lng[0], segments[0].lat[0]]))}>
                <RStyle.RStyle>
                    <RStyle.RText text='&#10148;' font='bold 25px sans-serif'>
                        <RStyle.RStroke color='black' width={3} />
                        <RStyle.RFill color='#333333' />
                    </RStyle.RText>
                </RStyle.RStyle>
            </RFeature>
            {/* Landing */}
            <RFeature
                geometry={
                    new Point(
                        fromLonLat([
                            segments[4].lng[segments[4].lng.length - 1],
                            segments[4].lat[segments[4].lat.length - 1]
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
            {/* Triangle closing */}
            <RFeature geometry={new Point(fromLonLat([segments[1].lng[0], segments[1].lat[0]]))}>
                <RStyle.RStyle>
                    <RStyle.RText text='[' font='bold 25px sans-serif'>
                        <RStyle.RStroke color='black' width={3} />
                        <RStyle.RFill color='#333333' />
                    </RStyle.RText>
                </RStyle.RStyle>
            </RFeature>
            <RFeature geometry={new Point(fromLonLat([segments[5].lng[0], segments[5].lat[0]]))}>
                <RStyle.RStyle>
                    <RStyle.RText text=']' font='bold 25px sans-serif'>
                        <RStyle.RStroke color='black' width={3} />
                        <RStyle.RFill color='#333333' />
                    </RStyle.RText>
                </RStyle.RStyle>
            </RFeature>
        </React.Fragment>
    );
}
