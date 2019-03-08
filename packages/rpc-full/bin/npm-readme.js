#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rpcFullDir = path.resolve(__dirname, '..');
const monoRepoDir = path.resolve(rpcFullDir, '../..');


/**
 * The README in packages/rpc-full is used as the README in npm (@wranggle/rpc) so this script copies the root README (github visible)
 * into rpc-full.
 */
function useRootReadmeForDistReadme() {
  const actualReadme = fs.readFileSync(path.join(monoRepoDir, 'README.md'), 'utf8');
  const generatedReadme = [
    '<!-- GENERATED FILE: DO NOT EDIT. The actual source is located in the root repository: wranggle/rpc/README.md -->',
    actualReadme
  ].join('\n\n');
  fs.writeFileSync(path.join(rpcFullDir, 'README.md'), generatedReadme);
}



useRootReadmeForDistReadme();
