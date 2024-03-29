/* eslint-disable no-console */
import * as path from 'path';
import * as fs from 'fs';
import * as mysql from 'mysql';

export const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config.json'), 'utf-8'));

let db: mysql.Connection;
let pool: mysql.Pool;

async function connect() {
    if (!db) {
        db = mysql.createConnection({
            database: config.db.db,
            host: config.db.host,
            user: config.db.user,
            password: config.db.pass,
            charset: 'utf8mb4_unicode_520_ci'
        });

        return new Promise<void>((res, rej) => {
            db.connect(function (err) {
                if (err) rej(err);
                console.log('Connected!', config.db);
                res();
            });
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
            password: config.db.pass,
            charset: 'utf8mb4_unicode_520_ci'
        });
    }
}

export async function query(sql, args?: unknown[]): Promise<unknown[]> {
    if (!db) await connect();
    let hash;

    return new Promise((resolve, reject) => {
        if (process.env.DEBUG) {
            hash = (Math.random() + 1).toString(36).substring(7);
            console.time(hash + ':' + sql);
        }
        const q = db.query(sql, args, (err, res) => {
            if (process.env.DEBUG) {
                console.timeEnd(hash + ':' + sql);
            }
            if (err) {
                try {
                    db.destroy();
                } catch (e) {
                    console.error(e);
                }
                db = null;
                reject(err);
            }
            resolve(res);
        });
        if (process.env.DEBUG) console.debug(q.sql);
    });
}

export function poolQuery(sql, args?: unknown[]): Promise<unknown[]> {
    if (!pool) createPool();
    let hash;

    return new Promise((resolve, reject) => {
        if (process.env.DEBUG) {
            hash = (Math.random() + 1).toString(36).substring(7);
            console.time(hash + ':' + sql);
        }
        pool.query(sql, args, (err, res) => {
            if (process.env.DEBUG) {
                console.timeEnd(hash + ':' + sql);
            }
            if (err) reject(err);
            resolve(res);
        });
    });
}

export function close() {
    if (db) {
        db.destroy();
        db = undefined;
    }
}
