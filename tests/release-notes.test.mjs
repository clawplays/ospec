import { createRequire } from 'module';
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const releaseNotes = require('../scripts/release-notes.js');
const overridePath = path.resolve(process.cwd(), '.skills', 'ospec-release-notes', 'releases', '9.9.9.json');

describe('release notes generation', () => {
  it('groups commits into user-facing sections and drops raw git history output', () => {
    const commits = [
      {
        hash: 'f7dc793',
        subject: 'fix document language detection for chinese projects',
        files: ['dist/services/ProjectService.js', 'tests/document-language-detection.test.mjs'],
      },
      {
        hash: '83ffbc4',
        subject: 'Add hook-check regression coverage',
        files: ['tests/tasks-validation-structure.test.mjs'],
      },
      {
        hash: '225942c',
        subject: 'docs: expand GitHub workflow automation protocol',
        files: ['docs/usage.md', 'docs/usage.zh-CN.md'],
      },
      {
        hash: '461b2f4',
        subject: 'feat: add automated release cut command',
        files: ['scripts/release-cut.js', 'package.json'],
      },
    ];

    const metadata = releaseNotes.buildReleasePayload(
      '0.3.8',
      '0.3.7',
      commits,
      'https://github.com/clawplays/ospec'
    );

    expect(metadata.name).toBe('0.3.8 - Fix document language detection for chinese projects');
    expect(metadata.body).toContain('## New');
    expect(metadata.body).toContain('## Improved');
    expect(metadata.body).toContain('## Fixed');
    expect(metadata.body).toContain('## Docs');
    expect(metadata.body).not.toContain('## Git History');
    expect(metadata.body).not.toContain('Range:');
    expect(metadata.body).toContain('**Full Changelog**: https://github.com/clawplays/ospec/compare/0.3.7...0.3.8');
  });

  it('classifies docs-only changes from changed files even without docs prefix', () => {
    const category = releaseNotes.classifyCommit({
      subject: 'Expand release workflow guidance',
      files: ['docs/usage.md', 'README.md'],
    });

    expect(category).toBe('docs');
  });

  it('creates fallback metadata when no local override is present', async () => {
    const metadata = await releaseNotes.createReleaseMetadata({
      tag: '0.3.9',
      previousTag: '0.3.8',
      repositoryUrl: 'https://github.com/clawplays/ospec',
      commits: [
        {
          hash: 'abc1234',
          subject: 'feat: implement structured release titles',
          files: ['scripts/release-notes.js', '.github/workflows/publish-npm.yml'],
        },
        {
          hash: 'def5678',
          subject: 'fix: keep existing documentLanguage during update',
          files: ['dist/services/ProjectService.js'],
        },
      ],
    });

    expect(metadata.source).toBe('fallback');
    expect(metadata.name).toContain('0.3.9 -');
    expect(metadata.body).toContain('## New');
    expect(metadata.body).toContain('## Fixed');
    expect(metadata.body).toContain('## Upgrade');
  });

  it('prefers committed local release metadata when present', async () => {
    fs.mkdirSync(path.dirname(overridePath), { recursive: true });
    fs.writeFileSync(
      overridePath,
      JSON.stringify(
        {
          name: '9.9.9 - Local AI-authored release notes',
          body: [
            'Local release summary.',
            '',
            '## New',
            '',
            '- Add a manually curated release title',
            '',
            '## Upgrade',
            '',
            '```bash',
            'npm install -g @clawplays/ospec-cli@9.9.9',
            'ospec update',
            '```',
          ].join('\n'),
        },
        null,
        2
      ),
      'utf8'
    );

    const metadata = await releaseNotes.createReleaseMetadata({
      tag: '9.9.9',
      previousTag: '9.9.8',
      repositoryUrl: 'https://github.com/clawplays/ospec',
      commits: [
        {
          hash: 'abc1234',
          subject: 'fix: this should be ignored when override exists',
          files: ['scripts/release-notes.js'],
        },
      ],
    });

    expect(metadata.source).toBe('override');
    expect(metadata.name).toBe('9.9.9 - Local AI-authored release notes');
    expect(metadata.body).toContain('Local release summary.');
  });
});

afterAll(() => {
  if (fs.existsSync(overridePath)) {
    fs.rmSync(overridePath, { force: true });
  }
  const releaseDir = path.dirname(overridePath);
  if (fs.existsSync(releaseDir) && fs.readdirSync(releaseDir).length === 0) {
    fs.rmdirSync(releaseDir);
  }
});
