import nodeResolve from '@rollup/plugin-node-resolve';

import commonjs from '@rollup/plugin-commonjs';

import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/parser.js',
  output: {
    format: 'cjs',
    file: './dist/index.js'
  },
  external(id) { return !/^[\.\/]/.test(id) },
  plugins: [
    process.env.NODE_ENV === 'production' && terser(),
    nodeResolve(),
    commonjs()
  ]
}