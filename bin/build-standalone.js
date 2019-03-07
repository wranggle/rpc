#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const util = require('util');
const child_process = require('child_process');
const camelCase = require('lodash/camelCase');

const promiseFileExists = util.promisify(fs.exists);
const promiseExec = util.promisify(child_process.exec);

const monoRootDir = path.resolve(__dirname, '..');
const binDir = path.join(monoRootDir, 'node_modules/.bin');
const tscPath = path.join(binDir, 'tsc');
const rollupPath = path.join(binDir, 'rollup');


const LibraryNameOverrideByBaseName = {
  core: 'WranggleRpc',
};

async function buildAll(baseLibName) {
  const packageDir = path.join(monoRootDir, `packages/rpc-${baseLibName}`);
  const distDir = path.join(packageDir, `dist`);
  const entryPath = path.join(packageDir, `src/${baseLibName}.ts`);
  const es2015DistDir = path.join(distDir, 'es2015');
  if (await promiseFileExists(entryPath)) {
    const buildInfo = {
      baseLibName,
      packageDir,
      distDir,
      es2015DistDir,
    };
    await Promise.all([
      _buildEs2015(buildInfo),
      _buildCommonJs(buildInfo),
    ]);
    // await _buildUmd(buildInfo); // don't want to bundle in dependencies... maybe skip UMD for all but full dist?
  } else {
    return Promise.reject('Expected entry file is missing:', entryPath);
  }
}


function _buildEs2015(opts) {
  const { packageDir, es2015DistDir } = opts;
  const command = `${tscPath} --project ${packageDir} --module es2015 --target es2015 --outDir ${es2015DistDir}`;
  console.log('ES2015 build running:', command);
  return promiseExec(command, { cwd: packageDir });
}

function _buildCommonJs(opts) {
  const { packageDir, distDir } = opts;
  const outDir = path.join(distDir, 'cjs');
  const command = `${tscPath} --project ${packageDir} --module commonjs --target es5 --outDir ${outDir}`;
  console.log('ES2015 build running:', command);
  return promiseExec(command, { cwd: packageDir });
}

function _buildUmd(opts) {
  const { baseLibName, es2015DistDir, packageDir, entryPath, distDir } = opts;
  const distPath = path.join(distDir, `${baseLibName}.umd.js`);
  const jsEntryPath = path.join(es2015DistDir, `${baseLibName}.js`);
  const command = `${rollupPath} ${jsEntryPath} --format umd --name ${_umdLibName(baseLibName)} --sourceMap --output ${ distPath }`;
  console.log('UMD build running:', command);
  return promiseExec(command, { cwd: packageDir });
}

function _umdLibName(baseLibName) {
  let res = LibraryNameOverrideByBaseName[baseLibName];
  if (!res) {
    res = camelCase(baseLibName);
    res = res[0].toUpperCase() + res.slice(1);
  }
  return res;
}


const baseLibName = process.argv[2]; // without the "rpc-" prefix
buildAll(baseLibName)
  .then(() => console.log('Done'))
  .catch((err) => console.error('Build failed', err));

