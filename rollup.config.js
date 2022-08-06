import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';


import pkg from './package.json';

const srcEntry = pkg.source;

const umdDist = pkg['umd:main'];

const umdName = 'Feelin';

export default [

  // browser-friendly UMD build
  {
    input: srcEntry,
    output: {
      file: umdDist.replace(/\.js$/, '.prod.js'),
      format: 'umd',
      name: umdName
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
      terser()
    ]
  },
  {
    input: srcEntry,
    output: {
      file: umdDist,
      format: 'umd',
      name: umdName
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript()
    ]
  },
  {
    input: srcEntry,
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    external: [
      'lezer',
      'lezer-feel',
      'luxon'
    ],
    plugins: [
      typescript()
    ]
  }
];