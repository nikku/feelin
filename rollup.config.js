import typescript from '@rollup/plugin-typescript';

import terser from '@rollup/plugin-terser';

import pkg from './package.json';


const input = pkg.source;

const external = [
  'lezer',
  'lezer-feel',
  'luxon'
];

export default [

  // library builds
  {
    input,
    output: [
      {
        file: pkg.exports['.'],
        format: 'es',
        sourcemap: true
      }
    ],
    external,
    plugins: [
      typescript()
    ]
  },

  // test build (minified)
  {
    input,
    output: [
      {
        file: 'tmp/feelin.min.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external,
    plugins: [
      typescript(),
      terser()
    ]
  }
];