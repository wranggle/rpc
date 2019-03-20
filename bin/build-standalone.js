#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const util = require('util');
const child_process = require('child_process');

const promiseFileExists = util.promisify(fs.exists);
const promiseExec = util.promisify(child_process.exec);

const monoRootDir = path.resolve(__dirname, '..');
const binDir = path.join(monoRootDir, 'node_modules/.bin');
const tscPath = path.join(binDir, 'tsc');


async function buildAll(baseLibName) {
  const packageDir = path.join(monoRootDir, `packages/rpc-${baseLibName}`);
  const entryPath = path.join(packageDir, `src/index.ts`);
  if (!await promiseFileExists(entryPath)) {
    return Promise.reject('Expected entry file is missing:', entryPath);
  }
  const distDir = path.join(packageDir, `dist`);
  const buildInfo = {
    baseLibName,
    packageDir,
    distDir,
  };
  return Promise.all([
    _buildEs2015(buildInfo),
    _buildCommonJs(buildInfo),
  ]);
}


function _buildEs2015(opts) {
  const { packageDir, distDir } = opts;
  const command = _tscCommand({
    packageDir,
    module: 'es2015',
    target: 'es2015',
    outDir: path.join(distDir,'es2015')
  });
  console.log('ES2015 build running:', command);
  return promiseExec(command, { cwd: packageDir });
}

function _buildCommonJs(opts) {
  const { packageDir, distDir } = opts;
  const command = _tscCommand({
    packageDir,
    module: 'commonjs',
    target: 'es5',
    outDir: path.join(distDir,'cjs')
  });
  console.log('CommonJs build running:', command);
  return promiseExec(command, { cwd: packageDir });
}

function _tscCommand({ packageDir, module, target, outDir }) {
  return `${tscPath} --project ${packageDir} --module ${module} --target ${target} --outDir ${outDir}`;
}

const baseLibName = process.argv[2]; // without the "rpc-" prefix
buildAll(baseLibName)
  .then(() => console.log('Done'))
  .catch((err) => console.error('Build failed', err));
