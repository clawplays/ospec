#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const allowedReleaseFiles = [
  'package.json',
  'package-lock.json',
  'dist/cli.js',
  'docs/usage.md',
  'docs/usage.zh-CN.md',
];
const releaseLevels = new Set(['patch', 'minor', 'major']);

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--')) {
      args._.push(current);
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
    shell: options.shell ?? false,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${output}`);
  }

  return output;
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: 'utf8',
    shell: options.shell ?? false,
  });

  if (result.status !== 0) {
    return null;
  }

  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function runNpm(args) {
  if (process.platform === 'win32') {
    return run('cmd.exe', ['/d', '/s', '/c', 'npm', ...args]);
  }

  return run('npm', args);
}

function git(args) {
  return run('git', args);
}

function tryGit(args) {
  return tryRun('git', args);
}

function readVersion() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
}

function incrementVersion(version, level) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported version format for automated release cut: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (level === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  }

  if (level === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  if (level === 'major') {
    return `${major + 1}.0.0`;
  }

  throw new Error(`Unsupported release level: ${level}`);
}

function currentBranch() {
  return git(['rev-parse', '--abbrev-ref', 'HEAD']);
}

function getStatusEntries() {
  const output = git(['status', '--porcelain']);
  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const status = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const file = rawPath.includes(' -> ') ? rawPath.split(' -> ')[1] : rawPath;
      return { status, file };
    });
}

function ensureCleanWorktree() {
  const entries = getStatusEntries();
  if (entries.length > 0) {
    const files = entries.map(entry => `${entry.status} ${entry.file}`).join('\n');
    throw new Error(`Release cut requires a clean working tree.\n${files}`);
  }
}

function ensureTagAvailable(tag, remote, checkRemote) {
  if (tryGit(['rev-parse', '--verify', `refs/tags/${tag}`])) {
    throw new Error(`Local tag already exists: ${tag}`);
  }

  if (checkRemote) {
    const remoteTag = tryGit(['ls-remote', '--tags', remote, tag]);
    if (remoteTag) {
      throw new Error(`Remote tag already exists on ${remote}: ${tag}`);
    }
  }
}

function assertExpectedReleaseFiles() {
  const entries = getStatusEntries();
  const files = entries.map(entry => entry.file);
  const unexpected = files.filter(file => !allowedReleaseFiles.includes(file));

  if (unexpected.length > 0) {
    throw new Error(`Unexpected files changed during release cut:\n${unexpected.join('\n')}`);
  }

  const missing = allowedReleaseFiles.filter(file => !files.includes(file));
  if (missing.length > 0) {
    throw new Error(`Expected release files were not updated:\n${missing.join('\n')}`);
  }
}

function verifyBuiltVersion(version) {
  const output = run('node', ['dist/cli.js', '--version']);
  if (!output.includes(version)) {
    throw new Error(`CLI version output does not include ${version}\n${output}`);
  }
}

function runReleaseChecks(version) {
  verifyBuiltVersion(version);
  runNpm(['run', 'release:check']);
  runNpm(['run', 'release:smoke']);
  runNpm(['run', 'release:notes', '--', '--tag', version]);
}

function stageReleaseFiles() {
  git(['add', '--', ...allowedReleaseFiles]);
}

function commitRelease(version, template) {
  const message = template.replace(/\{version\}/g, version);
  git(['commit', '-m', message]);
  return message;
}

function createTag(tag) {
  git(['tag', tag]);
}

function pushRelease(remote, branch, tag) {
  git(['push', remote, branch]);
  git(['push', remote, tag]);
}

function printPlan(details) {
  console.log(`[release:cut] branch: ${details.branch}`);
  console.log(`[release:cut] current version: ${details.currentVersion}`);
  console.log(`[release:cut] next version: ${details.nextVersion}`);
  console.log(`[release:cut] commit message: ${details.commitMessage}`);
  console.log(`[release:cut] push enabled: ${details.push ? 'yes' : 'no'}`);
  if (details.push) {
    console.log(`[release:cut] remote: ${details.remote}`);
  }
}

function usage() {
  console.error('Usage: node scripts/release-cut.js <patch|minor|major> [--push] [--remote origin] [--commit-message "Release {version}"] [--dry-run]');
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const level = args._[0];
  const push = Boolean(args.push);
  const dryRun = Boolean(args['dry-run']);
  const remote = args.remote || 'origin';
  const branch = currentBranch();
  const commitMessage = args['commit-message'] || 'Release {version}';

  if (!releaseLevels.has(level)) {
    usage();
  }

  ensureCleanWorktree();

  if (push && branch !== 'main') {
    throw new Error(`Release push is only allowed from main. Current branch: ${branch}`);
  }

  const currentVersion = readVersion();
  const nextVersion = incrementVersion(currentVersion, level);

  ensureTagAvailable(nextVersion, remote, push);

  printPlan({
    branch,
    currentVersion,
    nextVersion,
    commitMessage: commitMessage.replace(/\{version\}/g, nextVersion),
    push,
    remote,
  });

  if (dryRun) {
    return;
  }

  try {
    runNpm(['version', level, '--no-git-tag-version']);
    const actualVersion = readVersion();

    if (actualVersion !== nextVersion) {
      throw new Error(`Expected bumped version ${nextVersion}, got ${actualVersion}`);
    }

    assertExpectedReleaseFiles();
    runReleaseChecks(actualVersion);
    stageReleaseFiles();
    const finalCommitMessage = commitRelease(actualVersion, commitMessage);
    createTag(actualVersion);

    if (push) {
      pushRelease(remote, branch, actualVersion);
    }

    console.log(`[release:cut] committed ${finalCommitMessage}`);
    console.log(`[release:cut] created tag ${actualVersion}`);
    if (push) {
      console.log(`[release:cut] pushed ${branch} and tag ${actualVersion} to ${remote}`);
    } else {
      console.log(`[release:cut] push skipped; publish with: git push ${remote} ${branch} && git push ${remote} ${actualVersion}`);
    }
  } catch (error) {
    console.error(`[release:cut] ${error.message}`);
    console.error('[release:cut] Working tree has been left in place for inspection.');
    process.exit(1);
  }
}

main();
