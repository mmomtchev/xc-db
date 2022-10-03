import resolve from '@rollup/plugin-node-resolve';
import native from 'rollup-plugin-natives';
import copy from 'rollup-plugin-copy';
import builtins from 'builtin-modules';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
    {
        input: 'build/back/dbserver.js',
        output: {
            file: 'build/prod/dbserver.js',
            format: 'cjs',
            exports: 'auto',
            compact: true
        },
        external: builtins,
        plugins: [
            native({
                copyTo: 'build/prod/lib',
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
            }),
            resolve({
                preferBuiltins: true
            }),
            commonjs({
                include: ['node_modules/**', 'build/**']
            }),
            json()
        ]
    },
    ...['classify.js', 'import.js', 'wind.js', 'launches.js'].map((f) => ({
        input: `build/back/${f}`,
        output: {
            file: `build/prod/${f}`,
            format: 'cjs',
            exports: 'auto',
            compact: true
        },
        external: builtins,
        plugins: [
            resolve({
                preferBuiltins: true
            }),
            commonjs({
                include: ['node_modules/**', 'build/**']
            }),
            json()
        ]
    }))
];
