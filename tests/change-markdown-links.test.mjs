import fs from './helpers/fs-compat.mjs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { services } from '../dist/services/index.js';

const tempDirs = [];

function trackTempDir(dirPath) {
  tempDirs.push(dirPath);
  return dirPath;
}

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dirPath = tempDirs.pop();
    await fs.remove(dirPath);
  }
});

describe('change markdown links', () => {
  it('generates repo-doc links relative to the change document', () => {
    const projectRoot = path.resolve('C:/repo');
    const documentPath = path.join(
      projectRoot,
      'changes',
      'active',
      'demo-change',
      'tasks.md',
    );
    const overviewPath = 'docs/project/overview.md';
    const expectedHref = '../../../docs/project/overview.md';

    const output = services.templateEngine.generateTasksTemplate({
      feature: 'demo-change',
      documentLanguage: 'en-US',
      projectRoot,
      documentPath,
      projectContext: {
        projectDocs: [
          {
            title: 'Project overview',
            path: overviewPath,
          },
        ],
      },
    });

    expect(output).toContain(`[${overviewPath}](${expectedHref})`);
  });

  it('rebases moved change markdown links without touching internal links', async () => {
    const tempRoot = trackTempDir(
      await fs.mkdtemp(path.join(os.tmpdir(), 'ospec-link-unit-')),
    );
    const previousChangePath = path.join(
      tempRoot,
      'changes',
      'active',
      'demo-change',
    );
    const nextChangePath = path.join(
      tempRoot,
      'changes',
      'archived',
      '2026-04',
      '2026-04-04',
      'demo-change',
    );

    await fs.ensureDir(previousChangePath);
    await fs.ensureDir(nextChangePath);

    const previousTasksPath = path.join(previousChangePath, 'tasks.md');
    const nextTasksPath = path.join(nextChangePath, 'tasks.md');
    const externalTargetPath = path.join(
      tempRoot,
      'docs',
      'project',
      'overview.md',
    );

    await fs.ensureDir(path.dirname(externalTargetPath));
    await fs.writeFile(externalTargetPath, '# overview\n', 'utf8');

    const originalTasks = [
      '# Tasks',
      '',
      '- External: [docs/project/overview.md](../../../docs/project/overview.md)',
      '- Internal: [verification.md](verification.md)',
      '',
    ].join('\n');

    await fs.writeFile(previousTasksPath, originalTasks, 'utf8');
    await fs.writeFile(nextTasksPath, originalTasks, 'utf8');
    await fs.writeFile(
      path.join(nextChangePath, 'verification.md'),
      '# Verification\n',
      'utf8',
    );

    await services.projectService.rebaseMovedChangeMarkdownLinks(
      previousChangePath,
      nextChangePath,
    );

    const updatedTasks = await fs.readFile(nextTasksPath, 'utf8');
    const expectedExternalHref = toPosix(
      path.relative(nextChangePath, externalTargetPath),
    );

    expect(updatedTasks).toContain(
      `[docs/project/overview.md](${expectedExternalHref})`,
    );
    expect(updatedTasks).toContain('[verification.md](verification.md)');
  });
});
