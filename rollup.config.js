import {execSync} from 'child_process';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import native from 'rollup-plugin-natives';
import copy from 'rollup-plugin-copy';
import builtins from 'builtin-modules';
import commonjs from '@rollup/plugin-commonjs';
import replace from 'rollup-plugin-replace';
import json from '@rollup/plugin-json';

const shared = [
    typescript({
        tsconfig: false,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        target: 'es2022',
        include: ['src/back/*.ts', 'src/lib/*.ts']
    }),
    resolve({
        preferBuiltins: true
    }),
    replace({
        "require('readable-stream/transform')": "require('stream').Transform",
        'require("readable-stream/transform")': 'require("stream").Transform',
        'readable-stream': 'stream',
        'global.__BUILD__': JSON.stringify(execSync('echo -n `git rev-parse --short HEAD` `date +%Y-%m-%d`').toString())
    }),
    commonjs({
        include: ['node_modules/**', 'src/**']
    }),
    json()
];

const gdal = [
    native({
        copyTo: 'build/back/lib',
        destDir: './lib'
    }),
    copy({
        targets: [
            {
                src: 'node_modules/gdal-async/deps/libgdal/gdal/data',
                dest: 'build/deps/libgdal/gdal'
            },
            {
                src: 'node_modules/gdal-async/deps/libproj/proj/data',
                dest: 'build/deps/libproj/proj'
            }
        ]
    })
];

export default [
    ...['dbserver', 'wind'].map((f) => ({
        input: `src/back/${f}.ts`,
        output: {
            file: `build/back/${f}.js`,
            format: 'cjs',
            exports: 'auto',
            compact: true
        },
        external: builtins,
        plugins: [...gdal, ...shared]
    })),
    ...['classify', 'import', 'launches'].map((f) => ({
        input: `src/back/${f}.ts`,
        output: {
            file: `build/back/${f}.js`,
            format: 'cjs',
            exports: 'auto',
            compact: true
        },
        external: builtins,
        plugins: shared
    }))
];
