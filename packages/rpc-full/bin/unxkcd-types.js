#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const typingsBasename = 'wranggle-rpc.d.ts';

const wrong = fs.readFileSync(path.join(distDir, `rpc-full/src/${typingsBasename}`), 'utf8');
const content = wrong.replace(/from 'rpc-/g, "from '.\/rpc-");
// .replace('module "rpc-core/src/core"', 'module "@wranggle/rpc"');
fs.writeFileSync(path.join(distDir, typingsBasename), content);
