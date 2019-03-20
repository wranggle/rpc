const path = require('path');
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
  input: 'out/@wranggle/index.js', // if tsc output switches to folders with "src" look for a bad export: 'out/@wranggle/rpc-full/src/wranggle-rpc.js',
  output: [
    {
      file: 'dist/wranggle-rpc.umd.min.js',
      format: 'umd',
      name: 'WranggleRpc',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: 'dist/wranggle-rpc.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
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
