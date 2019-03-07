#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const packageDir = path.resolve(__dirname, '..');
const distDir = path.join(packageDir, 'dist');

const typingsBasename = 'wranggle-rpc.d.ts';

// note: rather than rewriting the d.ts file path, am trying to write it out to dist/@wranggle then moving the main wranggle-rpc.d.ts next to it so things resolve. All very hacky and annoying though, need to improve things later
// const wrong = fs.readFileSync(path.join(distDir, `rpc-full/src/${typingsBasename}`), 'utf8');
// const content = wrong.replace(/from 'rpc-/g, "from '.\/rpc-");
// .replace('module "rpc-core/src/core"', 'module "@wranggle/rpc"');
// fs.writeFileSync(path.join(distDir, typingsBasename), content);

fs.copyFileSync(path.join(distDir, `\@wranggle/rpc-full/src/${typingsBasename}`), path.join(distDir, typingsBasename));
