#!/usr/bin/env node

const { spawn } = require('child_process');
const { stripDistSourceMapReferences } = require('./strip-sourcemap-refs.js');

const WATCH_READY_PATTERN = /Watching for file changes\./;
const WATCH_ARGS = ['--watch', ...process.argv.slice(2)];
const TSC_BIN = require.resolve('typescript/bin/tsc');

let outputBuffer = '';
let stripTimer = null;

function scheduleStrip() {
  if (stripTimer) {
    clearTimeout(stripTimer);
  }

  stripTimer = setTimeout(() => {
    stripTimer = null;
    try {
      stripDistSourceMapReferences();
    } catch (error) {
      console.error(`[ospec] failed to strip sourceMappingURL during watch: ${error.message}`);
    }
  }, 50);
}

function handleCompilerOutput(targetStream, chunk) {
  const text = chunk.toString();
  targetStream.write(text);
  outputBuffer = `${outputBuffer}${text}`.slice(-512);
  if (WATCH_READY_PATTERN.test(outputBuffer)) {
    outputBuffer = '';
    scheduleStrip();
  }
}

const child = spawn(process.execPath, [TSC_BIN, ...WATCH_ARGS], {
  cwd: process.cwd(),
  stdio: ['inherit', 'pipe', 'pipe'],
});

child.stdout.on('data', chunk => handleCompilerOutput(process.stdout, chunk));
child.stderr.on('data', chunk => handleCompilerOutput(process.stderr, chunk));

child.on('exit', (code, signal) => {
  if (stripTimer) {
    clearTimeout(stripTimer);
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => {
    if (!child.killed) {
      child.kill(event);
    }
  });
}
