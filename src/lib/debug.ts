/* eslint-disable no-console */
export const debug = process.env.NODE_ENV === 'production' ? () => undefined : console.debug.bind(console);
