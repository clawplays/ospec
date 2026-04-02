#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const cjsEntry = path.join(rootDir, 'build-index-auto.cjs');
const distEntry = path.join(rootDir, 'dist', 'tools', 'build-index.js');

if (fs.existsSync(cjsEntry)) {
  require(cjsEntry);
} else if (fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  throw new Error('Cannot find build index entry. Expected build-index-auto.cjs or dist/tools/build-index.js');
}
