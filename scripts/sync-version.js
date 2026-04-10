#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const updates = [
  {
    file: 'dist/cli.js',
    replacements: [
      {
        pattern: /const CLI_VERSION = '[^']+';/,
        value: `const CLI_VERSION = '${version}';`,
      },
    ],
  },
  {
    file: 'docs/usage.md',
    replacements: [
      {
        pattern: /npm install -g @clawplays\/ospec-cli@[^\s`]+/g,
        value: `npm install -g @clawplays/ospec-cli@${version}`,
      },
    ],
  },
  {
    file: 'docs/usage.zh-CN.md',
    replacements: [
      {
        pattern: /npm install -g @clawplays\/ospec-cli@[^\s`]+/g,
        value: `npm install -g @clawplays/ospec-cli@${version}`,
      },
    ],
  },
];

for (const update of updates) {
  const filePath = path.join(rootDir, update.file);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const replacement of update.replacements) {
    if (!content.match(replacement.pattern)) {
      throw new Error(
        `Pattern not found in ${update.file}: ${replacement.pattern}`,
      );
    }
    content = content.replace(replacement.pattern, replacement.value);
  }
  fs.writeFileSync(filePath, content);
}

console.log(`[release] synced version ${version} to release-facing files`);
