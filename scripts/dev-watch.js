#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const validateScriptPath = path.join(__dirname, "validate-repo.js");
const stripSourceMapScriptPath = path.join(
  __dirname,
  "strip-sourcemap-refs.js",
);
const watchTargets = [
  ".eslintrc.cjs",
  "README.md",
  "SKILL.md",
  "package.json",
  "skill.yaml",
  "scripts",
  "tests",
];

let runTimer = null;
let runInProgress = false;
let rerunRequested = false;
const watchers = [];

function runNodeScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error(
        `[ospec] failed to run ${path.basename(scriptPath)}: ${error.message}`,
      );
      resolve(1);
    });

    child.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function runMaintenance() {
  if (runInProgress) {
    rerunRequested = true;
    return;
  }

  runInProgress = true;
  console.log("[ospec] running repository maintenance checks");

  const validateCode = await runNodeScript(validateScriptPath);
  if (validateCode === 0) {
    await runNodeScript(stripSourceMapScriptPath);
  }

  runInProgress = false;
  if (rerunRequested) {
    rerunRequested = false;
    scheduleRun("queued change");
  }
}

function scheduleRun(reason) {
  if (runTimer) {
    clearTimeout(runTimer);
  }

  console.log(`[ospec] change detected: ${reason}`);
  runTimer = setTimeout(() => {
    runTimer = null;
    void runMaintenance();
  }, 100);
}

function shouldIgnore(relativePath) {
  return (
    relativePath.startsWith(".git/") || relativePath.startsWith("node_modules/")
  );
}

function watchPath(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }
  const watcher = fs.watch(absolutePath, (_eventType, filename) => {
    const nextPath = filename
      ? path.join(relativePath, filename.toString()).replace(/\\/g, "/")
      : relativePath;
    if (shouldIgnore(nextPath)) {
      return;
    }
    scheduleRun(nextPath);
  });

  watcher.on("error", (error) => {
    console.warn(
      `[ospec] watch disabled for ${relativePath}: ${error.message}`,
    );
    try {
      watcher.close();
    } catch (_closeError) {
      // Ignore watcher close failures during teardown.
    }
  });

  watchers.push(watcher);
}

function initializeWatchers() {
  for (const relativePath of watchTargets) {
    watchPath(relativePath);
  }
}

initializeWatchers();
void runMaintenance();

for (const event of ["SIGINT", "SIGTERM"]) {
  process.on(event, () => {
    if (runTimer) {
      clearTimeout(runTimer);
    }
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  });
}
