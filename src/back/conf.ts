import * as fs from 'fs';
import * as path from 'path';

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'config.json'), 'utf8'));

export default config;
