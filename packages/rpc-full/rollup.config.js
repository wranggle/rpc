const path = require('path');
const ts = require('typescript');
import resolve from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';
import { terser } from "rollup-plugin-terser";
import globals from 'rollup-plugin-node-globals'
// import typescript from 'rollup-plugin-typescript2';
// todo: import sourceMaps from 'rollup-plugin-sourcemaps'

const rootDir = path.resolve(__dirname, '../..');
const packagesDir = path.join(rootDir, 'packages');
// const nodeModulesDir = path.join(rootDir, 'node_modules');


export default {
  // I gave up on the rollup plugin for typescript. Rollup must run after tsc compilation. (see commented typescript plugin code below)
  input: 'out/@wranggle/rpc-full/src/wranggle-rpc.js',
  // input: 'src/wranggle-rpc.ts',
  output: [
    {
      file: 'dist/wranggle-rpc.min.js',
      format: 'umd',
      name: 'WranggleRpc',
      exports: 'named',
    },
    {
      file: 'dist/wranggle-rpc.cjs.js',
      format: 'cjs',
      exports: 'default'
    }
  ],
  // todo: if any large-ish dependencies are added, will need to use external option, and/or the "jail" or "only" options on resolve plugin
  // external: [
  //   ...Object.keys(pkg.dependencies || {}),
  //   ...Object.keys(pkg.peerDependencies || {}),
  // ],

  plugins: [
    includePaths({
      include: {},
      paths: [ 'out' ], // path.resolve(projectDir, 'out')
      extensions: ['.js', '.json'],
      external: [],
    }),
    resolve({
      jsnext: true,
      browser: true,
    }),
    commonjs(),
    globals(),
    terser(),
  ],
  
}
