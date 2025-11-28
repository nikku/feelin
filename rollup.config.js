import typescript from '@rollup/plugin-typescript';

import terser from '@rollup/plugin-terser';

import pkg from './package.json';


const srcEntry = pkg.source;

export default [

  // library builds
  {
    input: srcEntry,
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true
      }
    ],
    external: [
      'lezer',
      'lezer-feel',
      'luxon'
    ],
    plugins: [
      typescript()
    ]
  },

  // test build (minified)
  {
    input: srcEntry,
    output: [
      {
        file: 'tmp/feelin.min.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external: [
      'lezer',
      'lezer-feel',
      'luxon'
    ],
    plugins: [
      typescript(),
      terser()
    ]
  }
];