// interpolate array to size elements (using nearest neighbor)
export default function interpolate(array: number[], size: number): number[] {
    const r = [];
    for (let i = 0; i < size; i++) {
        r[i] = array[Math.round((i * (array.length - 1)) / size)];
    }
    return r;
}
