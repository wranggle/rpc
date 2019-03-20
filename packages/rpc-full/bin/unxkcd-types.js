#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const packageDir = path.resolve(__dirname, '..');
const distDir = path.join(packageDir, 'dist');


fs.copyFileSync(path.join(distDir, '@wranggle/index.d.ts'), path.join(distDir, 'index.d.ts'));
