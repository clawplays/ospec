import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerifyCommand } from '../dist/commands/VerifyCommand.js';
import { services } from '../dist/services/index.js';

const tempDirs = [];
const buildIndexPath = path.resolve(process.cwd(), 'dist', 'tools', 'build-index.js');

function trackTempDir(dirPath) {
  tempDirs.push(dirPath);
  return dirPath;
}

function findCheck(result, name) {
  return result.checks.find(check => check.name === name);
}

async function writeText(filePath, content) {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
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

afterEach(async () => {
  vi.restoreAllMocks();

  while (tempDirs.length > 0) {
    const dirPath = tempDirs.pop();
    await fs.remove(dirPath);
  }
});

describe('tasks and verification validation', () => {
  it('fails tasks analysis when frontmatter is malformed', async () => {
    const tempRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-tasks-validate-')));
    const tasksPath = path.join(tempRoot, 'tasks.md');

    await writeText(
      tasksPath,
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'optional_steps: [demo-step',
        '---',
        '## Task Checklist',
        '- [ ] Implement the change',
      ].join('\n')
    );

    const result = await services.projectService.analyzeChecklistDocument(tasksPath, 'tasks.md', []);

    expect(result.checklistComplete).toBe(false);
    expect(findCheck(result, 'tasks.md.frontmatter')).toMatchObject({ status: 'fail' });
    expect(findCheck(result, 'tasks.md.required_fields')).toMatchObject({ status: 'fail' });
    expect(findCheck(result, 'tasks.md.checklist')).toMatchObject({ status: 'fail' });
  });

  it('fails tasks analysis when checklist structure is rewritten away', async () => {
    const tempRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-tasks-structure-')));
    const tasksPath = path.join(tempRoot, 'tasks.md');

    await writeText(
      tasksPath,
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'optional_steps: []',
        '---',
        '## Task Checklist',
        '- 1. Implement the change',
        '- 2. Run verification',
      ].join('\n')
    );

    const result = await services.projectService.analyzeChecklistDocument(tasksPath, 'tasks.md', []);

    expect(result.checklistComplete).toBe(false);
    expect(findCheck(result, 'tasks.md.frontmatter')).toMatchObject({ status: 'pass' });
    expect(findCheck(result, 'tasks.md.required_fields')).toMatchObject({ status: 'pass' });
    expect(findCheck(result, 'tasks.md.checklist')).toMatchObject({ status: 'fail' });
  });

  it('fails verification analysis when checklist structure is missing', async () => {
    const tempRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-verification-structure-')));
    const verificationPath = path.join(tempRoot, 'verification.md');

    await writeText(
      verificationPath,
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'status: verifying',
        'optional_steps: []',
        'passed_optional_steps: []',
        '---',
        '## Automated Checks',
        '- build passed',
        '- tests passed',
      ].join('\n')
    );

    const result = await services.projectService.analyzeVerificationDocument(verificationPath, []);

    expect(result.checklistComplete).toBe(false);
    expect(findCheck(result, 'verification.md.frontmatter')).toMatchObject({ status: 'pass' });
    expect(findCheck(result, 'verification.md.required_fields')).toMatchObject({ status: 'pass' });
    expect(findCheck(result, 'verification.md.checklist')).toMatchObject({ status: 'fail' });
  });

  it('makes verify fail when tasks frontmatter is malformed', async () => {
    const projectRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-verify-command-')));
    const featureDir = path.join(projectRoot, 'changes', 'active', 'demo-change');

    await fs.ensureDir(featureDir);
    await fs.writeJson(
      path.join(projectRoot, '.skillrc'),
      await services.configManager.createDefaultConfig('full'),
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(featureDir, 'state.json'),
      {
        feature: 'demo-change',
        status: 'verifying',
        current_step: 'verification',
        completed: [],
        pending: [],
        blocked_by: [],
      },
      { spaces: 2 }
    );
    await writeText(
      path.join(featureDir, 'proposal.md'),
      [
        '---',
        'name: demo-change',
        'status: active',
        'created: 2026-04-04',
        'affects: []',
        'flags: []',
        '---',
        '# Proposal',
      ].join('\n')
    );
    await writeText(
      path.join(featureDir, 'tasks.md'),
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'optional_steps: [demo-step',
        '---',
        '## Task Checklist',
        '- [ ] Implement the change',
      ].join('\n')
    );
    await writeText(
      path.join(featureDir, 'verification.md'),
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'status: verifying',
        'optional_steps: []',
        'passed_optional_steps: []',
        '---',
        '## Automated Checks',
        '- [x] build passed',
      ].join('\n')
    );

    vi.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit:${code}`);
    });

    const command = new VerifyCommand();
    await expect(command.execute(featureDir)).rejects.toThrow('process.exit:1');
  });

  it('fails hook-check when staged tasks.md frontmatter is malformed', async () => {
    const projectRoot = trackTempDir(await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-hook-check-')));
    const featureDir = path.join(projectRoot, 'changes', 'active', 'demo-change');
    const config = await services.configManager.createDefaultConfig('full');

    config.hooks['index-check'] = 'off';

    await fs.ensureDir(featureDir);
    await fs.writeJson(path.join(projectRoot, '.skillrc'), config, { spaces: 2 });
    await fs.writeJson(
      path.join(featureDir, 'state.json'),
      {
        feature: 'demo-change',
        status: 'verifying',
        current_step: 'verification',
        completed: [],
        pending: [],
        blocked_by: [],
      },
      { spaces: 2 }
    );
    await writeText(
      path.join(featureDir, 'proposal.md'),
      [
        '---',
        'name: demo-change',
        'status: active',
        'created: 2026-04-04',
        'affects: []',
        'flags: []',
        '---',
        '# Proposal',
      ].join('\n')
    );
    await writeText(
      path.join(featureDir, 'tasks.md'),
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'optional_steps: [demo-step',
        '---',
        '## Task Checklist',
        '- [ ] Implement the change',
      ].join('\n')
    );
    await writeText(
      path.join(featureDir, 'verification.md'),
      [
        '---',
        'feature: demo-change',
        'created: 2026-04-04',
        'status: verifying',
        'optional_steps: []',
        'passed_optional_steps: []',
        '---',
        '## Automated Checks',
        '- [x] build passed',
      ].join('\n')
    );

    runCommand('git', ['init'], projectRoot);
    runCommand('git', ['config', 'user.name', 'Codex'], projectRoot);
    runCommand('git', ['config', 'user.email', 'codex@example.com'], projectRoot);
    runCommand('git', ['add', 'changes/active/demo-change/tasks.md'], projectRoot);

    const result = spawnSync('node', [buildIndexPath, 'hook-check', 'pre-commit'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;

    expect(result.status).toBe(1);
    expect(output).toContain('tasks.md.frontmatter');
    expect(output).toContain('hook blocked by current hook policy');
  });
});
