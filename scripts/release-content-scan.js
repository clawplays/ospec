#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const blockedTerms = [
  {
    label: 'external reference label',
    value: ['super', 'powers'].join(''),
  },
  {
    label: 'local source directory label',
    value: ['ospec', 'src'].join('-'),
  },
];
const defaultRoots = [
  'assets',
  'dist',
  'agents',
  'docs',
  'releases',
  'plugins',
  'SKILL.md',
  'skill.yaml',
  'README.md',
  'package.json',
  'package-lock.json',
  path.join('scripts', 'postinstall.js'),
];
const ignoredDirs = new Set(['.git', '.tmp', 'node_modules', '.ospec']);
const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.txt',
  '.yaml',
  '.yml',
]);

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(targetPath, output) {
  if (!(await pathExists(targetPath))) {
    return;
  }
  const stats = await fsp.stat(targetPath);
  if (stats.isFile()) {
    if (
      textExtensions.has(path.extname(targetPath)) ||
      path.basename(targetPath) === 'README'
    ) {
      output.push(targetPath);
    }
    return;
  }
  if (!stats.isDirectory()) {
    return;
  }
  if (ignoredDirs.has(path.basename(targetPath))) {
    return;
  }
  const entries = await fsp.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    await collectFiles(path.join(targetPath, entry.name), output);
  }
}

async function main() {
  const files = [];
  for (const relativeRoot of defaultRoots) {
    await collectFiles(path.join(rootDir, relativeRoot), files);
  }

  const findings = [];
  for (const filePath of files) {
    const content = await fsp.readFile(filePath, 'utf8');
    const lower = content.toLowerCase();
    for (const term of blockedTerms) {
      const index = lower.indexOf(term.value);
      if (index === -1) {
        continue;
      }
      const line = content.slice(0, index).split(/\r?\n/).length;
      findings.push({
        file: path.relative(rootDir, filePath).replace(/\\/g, '/'),
        line,
        label: term.label,
      });
    }
  }

  if (findings.length > 0) {
    console.error('[release:scan] blocked publication text found:');
    for (const finding of findings) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.label})`);
    }
    process.exit(1);
  }

  console.log(
    `[release:scan] scanned ${files.length} publication file(s); no blocked labels found`,
  );
}

main().catch((error) => {
  console.error(`[release:scan] ${error.message}`);
  process.exit(1);
});
