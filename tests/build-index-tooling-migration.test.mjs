import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InitCommand } from '../dist/commands/InitCommand.js';
import { UpdateCommand } from '../dist/commands/UpdateCommand.js';

const tempDirs = [];

function trackTempDir(dirPath) {
  tempDirs.push(dirPath);
  return dirPath;
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout || ''}${result.stderr || ''}`);
  }

  return result;
}

function getLegacyHookContent(event) {
  return [
    '#!/bin/sh',
    '',
    'if [ -f "build-index-auto.cjs" ]; then',
    '  OSPEC_BUILD_INDEX_SCRIPT="build-index-auto.cjs"',
    'elif [ -f "build-index-auto.js" ]; then',
    '  OSPEC_BUILD_INDEX_SCRIPT="build-index-auto.js"',
    'else',
    '  echo "[ospec] build-index-auto.cjs not found, skip hook check"',
    '  exit 0',
    'fi',
    '',
    `node "$OSPEC_BUILD_INDEX_SCRIPT" hook-check ${event}`,
    '',
  ].join('\n');
}

async function initializeProject(projectRoot, { git = false } = {}) {
  if (git) {
    runCommand('git', ['init'], projectRoot);
  }

  vi.spyOn(InitCommand.prototype, 'syncInstalledSkills').mockResolvedValue({ codex: [], claude: [] });
  const command = new InitCommand();
  await command.execute(projectRoot, {
    summary: 'tooling migration fixture',
    techStack: ['node', 'eslint'],
  });
}

async function updateProject(projectRoot) {
  vi.spyOn(UpdateCommand.prototype, 'syncInstalledSkills').mockResolvedValue({ codex: [], claude: [] });
  const command = new UpdateCommand();
  await command.execute(projectRoot);
}

afterEach(async () => {
  vi.restoreAllMocks();

  while (tempDirs.length > 0) {
    const dirPath = tempDirs.pop();
    await fs.remove(dirPath);
  }
});

describe('build index tooling migration', () => {
  it('initializes the managed build-index script under .ospec/tools', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const projectRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-build-index-init-')));
    await initializeProject(projectRoot, { git: true });

    expect(await fs.pathExists(path.join(projectRoot, '.ospec', 'tools', 'build-index-auto.cjs'))).toBe(true);
    expect(await fs.pathExists(path.join(projectRoot, 'build-index-auto.cjs'))).toBe(false);
    expect(await fs.pathExists(path.join(projectRoot, 'build-index-auto.js'))).toBe(false);

    const templateHook = await fs.readFile(
      path.join(projectRoot, '.ospec', 'templates', 'hooks', 'pre-commit'),
      'utf8'
    );
    const installedHook = await fs.readFile(path.join(projectRoot, '.git', 'hooks', 'pre-commit'), 'utf8');

    expect(templateHook).toContain('.ospec/tools/build-index-auto.cjs');
    expect(installedHook).toContain('.ospec/tools/build-index-auto.cjs');
  });

  it('migrates legacy root build-index-auto.cjs into .ospec/tools during update', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const projectRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-build-index-update-cjs-')));
    await initializeProject(projectRoot, { git: true });

    const managedScriptPath = path.join(projectRoot, '.ospec', 'tools', 'build-index-auto.cjs');
    const legacyScriptPath = path.join(projectRoot, 'build-index-auto.cjs');

    await fs.move(managedScriptPath, legacyScriptPath);
    await fs.writeFile(
      path.join(projectRoot, '.ospec', 'templates', 'hooks', 'pre-commit'),
      getLegacyHookContent('pre-commit'),
      'utf8'
    );
    await fs.writeFile(
      path.join(projectRoot, '.ospec', 'templates', 'hooks', 'post-merge'),
      getLegacyHookContent('post-merge'),
      'utf8'
    );
    await fs.writeFile(path.join(projectRoot, '.git', 'hooks', 'pre-commit'), getLegacyHookContent('pre-commit'), 'utf8');
    await fs.writeFile(path.join(projectRoot, '.git', 'hooks', 'post-merge'), getLegacyHookContent('post-merge'), 'utf8');

    await updateProject(projectRoot);

    expect(await fs.pathExists(managedScriptPath)).toBe(true);
    expect(await fs.pathExists(legacyScriptPath)).toBe(false);

    const templateHook = await fs.readFile(
      path.join(projectRoot, '.ospec', 'templates', 'hooks', 'pre-commit'),
      'utf8'
    );
    const installedHook = await fs.readFile(path.join(projectRoot, '.git', 'hooks', 'pre-commit'), 'utf8');

    expect(templateHook).toMatch(/if \[ -f "\.ospec\/tools\/build-index-auto\.cjs" \]/);
    expect(templateHook).toContain('OSPEC_BUILD_INDEX_SCRIPT=".ospec/tools/build-index-auto.cjs"');
    expect(installedHook).toMatch(/if \[ -f "\.ospec\/tools\/build-index-auto\.cjs" \]/);
    expect(installedHook).toContain('OSPEC_BUILD_INDEX_SCRIPT=".ospec/tools/build-index-auto.cjs"');
  });

  it('migrates legacy root build-index-auto.js into .ospec/tools during update', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const projectRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-build-index-update-js-')));
    await initializeProject(projectRoot);

    const managedScriptPath = path.join(projectRoot, '.ospec', 'tools', 'build-index-auto.cjs');
    const legacyScriptPath = path.join(projectRoot, 'build-index-auto.js');

    await fs.move(managedScriptPath, legacyScriptPath);
    await updateProject(projectRoot);

    expect(await fs.pathExists(managedScriptPath)).toBe(true);
    expect(await fs.pathExists(legacyScriptPath)).toBe(false);
  });
});
