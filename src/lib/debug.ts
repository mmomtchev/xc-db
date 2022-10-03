/* eslint-disable no-console */
export const debug = process.env.NODE_ENV === 'production' ? () => undefined : (...args) => console.log(...args);
