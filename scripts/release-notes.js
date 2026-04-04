#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${output}`);
  }

  return (result.stdout || '').trim();
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '').trim();
}

function git(args) {
  return run('git', args);
}

function tryGit(args) {
  return tryRun('git', args);
}

function resolveTag(args) {
  return args.tag || process.env.RELEASE_TAG || packageJson.version;
}

function resolvePreviousTag(tag, explicitPreviousTag) {
  if (explicitPreviousTag) {
    return explicitPreviousTag;
  }

  const tagRef = tryGit(['rev-parse', '--verify', `refs/tags/${tag}`]);
  if (tagRef) {
    return tryGit(['describe', '--tags', '--abbrev=0', `${tag}^`]);
  }

  return tryGit(['describe', '--tags', '--abbrev=0', 'HEAD']);
}

function getCommitLines(previousTag) {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const raw = git(['log', '--no-merges', '--pretty=format:%h%x09%s', range]);

  if (!raw) {
    return ['- No non-merge commits found in this release range.'];
  }

  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [hash, ...subjectParts] = line.split('\t');
      const subject = subjectParts.join('\t').trim();
      return `- \`${hash}\` ${subject}`;
    });
}

function buildReleaseNotes(tag, previousTag, commitLines) {
  const body = [
    `OSpec CLI release \`${tag}\` is now available on npm as \`${packageJson.name}\`.`,
    '',
    '## Upgrade',
    '',
    '```bash',
    `npm install -g ${packageJson.name}@${tag}`,
    'ospec update',
    '```',
    '',
    '## Notes',
    '',
    '- Existing OSpec projects should run `ospec update` after upgrading the CLI.',
    '- Release tags use bare semantic versions such as `0.3.7`, without a `v` prefix.',
    '',
    '## Git History',
    ''
  ];

  if (previousTag) {
    body.push(`Range: \`${previousTag}..${tag}\``);
    body.push('');
  }

  body.push(...commitLines);
  return `${body.join('\n')}\n`;
}

function writeOutput(outputPath, content) {
  fs.writeFileSync(path.resolve(rootDir, outputPath), content, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tag = resolveTag(args);
  const previousTag = resolvePreviousTag(tag, args['previous-tag']);
  const commitLines = getCommitLines(previousTag);
  const body = buildReleaseNotes(tag, previousTag, commitLines);

  if (args.output) {
    writeOutput(args.output, body);
    return;
  }

  process.stdout.write(body);
}

main();
