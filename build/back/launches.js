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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const db = __importStar(require("./db"));
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const filt = data.features.filter((f) => f.properties.o === 'FF' || f.properties.o === 'XU');
async function main() {
    for (const launch of filt) {
        await db.query('INSERT INTO launch (name, sub, lat, lng) VALUES (SUBSTRING(?, 1, 40), SUBSTRING(?, 1, 40), ?, ?)', [launch.properties.n, launch.properties.s, launch.geometry.coordinates[1], launch.geometry.coordinates[0]]);
    }
    db.close();
}
main();
