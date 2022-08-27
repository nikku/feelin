import typescript from '@rollup/plugin-typescript';

import pkg from './package.json';


const srcEntry = pkg.source;

export default [
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
  }
];