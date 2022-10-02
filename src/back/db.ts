import * as mysql from 'mysql';

import config from '../config.json';

let db: mysql.Connection;

export function connect() {
    if (!db) {
        db = mysql.createConnection({
            database: config.db.db,
            host: config.db.host,
            user: config.db.user
            //password: config.db.pass
        });

        db.connect(function (err) {
            if (err) throw err;
            console.log('Connected!', config.db);
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

export function close() {
    if (!db) return;
    db.destroy();
    db = undefined;
}
