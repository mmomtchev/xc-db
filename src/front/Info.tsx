export default function Info(props: { label: string, text: string; }) {
    return (
        <p className='info d-flex flex-row justify-content-between'>
            <span className='label'>{props.label}</span>
            <span className='value'>{props.text}</span>
        </p>
    );
}
