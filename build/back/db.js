"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.close = exports.query = exports.connect = void 0;
const mysql = __importStar(require("mysql"));
const conf_1 = __importDefault(require("./conf"));
let db;
function connect() {
    if (!db) {
        db = mysql.createConnection({
            database: conf_1.default.db.db,
            host: conf_1.default.db.host,
            user: conf_1.default.db.user,
            //password: config.db.pass
        });
        db.connect(function (err) {
            if (err)
                throw err;
            console.log('Connected!', conf_1.default.db);
        });
    }
}
exports.connect = connect;
function query(sql, args) {
    if (!db)
        connect();
    return new Promise((resolve, reject) => {
        db.query(sql, args, (err, res) => {
            if (err)
                reject(err);
            resolve(res);
        });
    });
}
exports.query = query;
function close() {
    if (!db)
        return;
    db.destroy();
    db = undefined;
}
exports.close = close;
