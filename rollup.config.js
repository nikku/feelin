import nodeResolve from '@rollup/plugin-node-resolve';

import commonjs from '@rollup/plugin-commonjs';

import { terser } from 'rollup-plugin-terser';


import pkg from './package.json';

function pgl(plugins=[]) {
  return plugins;
}

const srcEntry = pkg.source;

const umdDist = pkg['umd:main'];

const umdName = 'ModdleXML';

export default [
  // browser-friendly UMD build
  {
    input: srcEntry,
    output: {
      file: umdDist.replace(/\.js$/, '.prod.js'),
      format: 'umd',
      name: umdName
    },
    plugins: pgl([
      nodeResolve(),
      commonjs(),
      terser()
    ])
  },
  {
    input: srcEntry,
    output: {
      file: umdDist,
      format: 'umd',
      name: umdName
    },
    plugins: pgl([
      nodeResolve(),
      commonjs()
    ])
  },
  {
    input: srcEntry,
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    external: [
      'lezer'
    ],
    plugins: pgl()
  }
];