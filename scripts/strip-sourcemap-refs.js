#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const TARGET_SUFFIXES = ['.js', '.d.ts'];
const SOURCE_MAP_LINE = /^\/\/# sourceMappingURL=.*$/;

function shouldProcess(filePath) {
  return TARGET_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
}

function stripSourceMapReference(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) {
    return { changed: false, content };
  }

  const lastLine = lines.at(-1) === '' ? lines.at(-2) : lines.at(-1);
  if (!lastLine || !SOURCE_MAP_LINE.test(lastLine)) {
    return { changed: false, content };
  }

  const filteredLines = lines.filter((line, index) => {
    const isTrailingEmptyLine = index === lines.length - 1 && line === '';
    if (isTrailingEmptyLine) {
      return true;
    }
    return !SOURCE_MAP_LINE.test(line);
  });

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const nextContent = filteredLines
    .join(newline)
    .replace(new RegExp(`${newline}+$`), newline);
  return { changed: nextContent !== content, content: nextContent };
}

function walk(dirPath, results = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }
    if (shouldProcess(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : DIST_DIR;
  return stripDistSourceMapReferences(targetDir);
}

function stripDistSourceMapReferences(targetDir = DIST_DIR, options = {}) {
  if (!fs.existsSync(targetDir)) {
    return 0;
  }

  let changedFiles = 0;
  for (const filePath of walk(targetDir)) {
    const currentContent = fs.readFileSync(filePath, 'utf8');
    const result = stripSourceMapReference(currentContent);
    if (!result.changed) {
      continue;
    }
    fs.writeFileSync(filePath, result.content, 'utf8');
    changedFiles += 1;
  }

  if (changedFiles > 0 && options.silent !== true) {
    console.log(
      `[ospec] stripped sourceMappingURL from ${changedFiles} dist files`,
    );
  }

  return changedFiles;
}

if (require.main === module) {
  main();
}

module.exports = {
  stripDistSourceMapReferences,
  stripSourceMapReference,
};
