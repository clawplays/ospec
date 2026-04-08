#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const GLOB_META_PATTERN = /[*?[{!]/;

const requiredRepoPaths = [
  ".eslintrc.cjs",
  "README.md",
  "SKILL.md",
  "agents/openai.yaml",
  "dist/cli.js",
  "dist/index.js",
  "dist/tools/build-index.js",
  "scripts/postinstall.js",
  "scripts/strip-sourcemap-refs.js",
  "tests",
];

function resolveEntryCheckPath(entry) {
  const normalized = entry.replace(/\\/g, "/");
  if (!GLOB_META_PATTERN.test(normalized)) {
    return normalized;
  }

  const concreteSegments = [];
  for (const segment of normalized.split("/")) {
    if (GLOB_META_PATTERN.test(segment)) {
      break;
    }
    concreteSegments.push(segment);
  }

  return concreteSegments.join("/");
}

function pathExists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function collectMissingPaths(pathsToCheck, label) {
  const missing = [];
  for (const relativePath of pathsToCheck) {
    if (!relativePath) {
      continue;
    }
    if (!pathExists(relativePath)) {
      missing.push(`${label}: ${relativePath}`);
    }
  }
  return missing;
}

function validatePackageFiles() {
  const fileEntries = Array.isArray(packageJson.files) ? packageJson.files : [];
  const fileTargets = fileEntries.map(resolveEntryCheckPath);
  return collectMissingPaths(fileTargets, "package.json files entry");
}

function validateRepoPaths() {
  return collectMissingPaths(requiredRepoPaths, "required repository path");
}

function validateRepository() {
  return [...validateRepoPaths(), ...validatePackageFiles()];
}

function printValidationResult(missing) {
  if (missing.length > 0) {
    console.error("[ospec] repository validation failed");
    for (const item of missing) {
      console.error(`- ${item}`);
    }
    return 1;
  }

  console.log("[ospec] repository validation passed");
  return 0;
}

function main() {
  const missing = validateRepository();

  return printValidationResult(missing);
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  printValidationResult,
  validateRepository,
};
