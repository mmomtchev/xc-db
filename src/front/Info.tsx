import React from 'react';

export default function Info(props: {label: string; text: string}) {
    return (
        <p className='info d-flex flex-row justify-content-between align-items-center'>
            <span className='label'>{props.label}</span>
            {props.text ? <span className='value'>{props.text}</span> : props.children}
        </p>
    );
}
