// Stolen from velivole.fr
import * as matrix from 'transformation-matrix';

function windArrowMarker(color) {
    return `<marker id="arrowhead-${color}" markerWidth="3" markerHeight="3" refX="0" refY="1.5" orient="auto">
        <polygon stroke="none" fill="${color}" points="0 0, 3 1.5, 0 3" />
</marker>
`;
}

export function windMatrix(rotation, scalex, scaley) {
    return matrix.toSVG(
        matrix.compose([
            matrix.translate(8, 8),
            matrix.rotate((rotation * Math.PI) / 180, 0, 0),
            matrix.scale(scalex, scaley),
            matrix.translate(-8, -8)
        ])
    );
}

export function windSVG(style) {
    const scalex = 1;
    const scaley = 1;
    return renderSVG({
        ...style,
        transform: windMatrix(style.direction, scalex, scaley)
    });
}

export function renderSVG(style) {
    const outer = style.outer || 'white';
    const inner = style.inner || 'black';
    const transformHead = style.transform ? `<g width="100%" height="100%" transform="${style.transform}">` : '';
    const transformEnd = style.transform ? '</g>' : '';
    const cssClass = `class="no-events wind-arrow ${style.cssClass || ''}"`;
    const secondLine = inner !== outer;

    const defs = `<defs id="wind-svg-defs">${windArrowMarker(outer)} ${
        secondLine ? windArrowMarker(inner) : ''
    }</defs>`;
    const line1 = `<line x1="8" y1="0" x2="8" y2="10" class="wind-arrow-outer" stroke="${outer}" stroke-width="2" marker-end="url(#arrowhead-${outer})" />`;
    const line2 = secondLine
        ? `<line x1="8" y1="0.5" x2="8" y2="10.5" class="wind-arrow-inner" stroke="${inner}" stroke-width="1.5" marker-end="url(#arrowhead-${inner})" />`
        : '';

    const svg = `<?xml version="1.0" encoding="iso-8859-1"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" ${cssClass} width="16" height="16" viewbox="0 0 16 16">
${defs}
${transformHead}
${line1}
${line2}
${transformEnd}
</svg>
`;

    return svg;
}
