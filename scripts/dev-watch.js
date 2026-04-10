#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_SCRIPT = path.join(__dirname, 'build-dist.js');
const RELEVANT_PREFIXES = [
  'src/',
  'scripts/',
  'tsconfig.json',
];

let child = null;
let buildRunning = false;
let rebuildPending = false;
let debounceTimer = null;

function isRelevantPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  if (!normalized) {
    return false;
  }
  if (
    normalized.startsWith('dist/') ||
    normalized.startsWith('node_modules/') ||
    normalized.startsWith('.git/')
  ) {
    return false;
  }
  return RELEVANT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );
}

function runBuild() {
  if (buildRunning) {
    rebuildPending = true;
    return;
  }

  buildRunning = true;
  console.log('[ospec] running dist rebuild watcher');

  child = spawn(process.execPath, [BUILD_SCRIPT], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    buildRunning = false;
    child = null;
    if (code !== 0) {
      console.error(`[ospec] build failed with exit code ${code ?? 1}`);
    }
    if (rebuildPending) {
      rebuildPending = false;
      runBuild();
    }
  });
}

function scheduleBuild(filePath) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    console.log(`[ospec] change detected: ${filePath}`);
    runBuild();
  }, 100);
}

fs.watch(ROOT_DIR, { recursive: true }, (_eventType, filePath) => {
  if (!isRelevantPath(filePath)) {
    return;
  }
  scheduleBuild(filePath);
});

for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (child && !child.killed) {
      child.kill(event);
    }
  });
}

runBuild();
