import * as path from 'path';
import * as fs from 'fs';
import * as mysql from 'mysql';

export const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json'), 'utf-8'));

let db: mysql.Connection;
let pool: mysql.Pool;

function connect() {
    if (!db) {
        db = mysql.createConnection({
            database: config.db.db,
            host: config.db.host,
            user: config.db.user,
            password: config.db.pass
        });

        db.connect(function (err) {
            if (err) throw err;
            console.log('Connected!', config.db);
        });
    }
}

function createPool() {
    if (!pool) {
        pool = mysql.createPool({
            connectionLimit: 4,
            database: config.db.db,
            host: config.db.host,
            user: config.db.user,
            password: config.db.pass
        });
    }
}

export function query(sql, args?: unknown[]): Promise<unknown[]> {
    if (!db) connect();

    return new Promise((resolve, reject) => {
        const q = db.query(sql, args, (err, res) => {
            if (err) reject(err);
            resolve(res);
        });
        if (process.env.DEBUG) console.debug(q.sql);
    });
}

export function poolQuery(sql, args?: unknown[]): Promise<unknown[]> {
    if (!pool) createPool();

    return new Promise((resolve, reject) => {
        if (process.env.DEBUG) {
            console.time(sql);
        }
        const q = pool.query(sql, args, (err, res) => {
            if (err) reject(err);
            resolve(res);
        });
        if (process.env.DEBUG) {
            console.timeEnd(sql);
        }
    });
}

export function close() {
    if (db) {
        db.destroy();
        db = undefined;
    }
}
