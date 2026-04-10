import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const releaseUploadNotes = require('../scripts/release-upload-notes.js');
const metadataPath = path.resolve(
  process.cwd(),
  '.skills',
  'ospec-release-notes',
  'releases',
  '8.8.8.json',
);

describe('release upload notes helpers', () => {
  it('resolves the local release metadata path under the release skill directory', () => {
    expect(releaseUploadNotes.getReleaseMetadataPath('8.8.8')).toBe(
      metadataPath,
    );
  });

  it('parses the GitHub repository owner and name from package metadata', () => {
    expect(
      releaseUploadNotes.parseGitHubRepository(
        'https://github.com/clawplays/ospec',
      ),
    ).toEqual({
      owner: 'clawplays',
      repo: 'ospec',
    });
  });

  it('prefers the GitHub repository URL over homepage metadata for uploads', () => {
    expect(releaseUploadNotes.resolveRepositoryUrl()).toBe(
      'https://github.com/clawplays/ospec',
    );
  });

  it('reads the local release metadata file for upload', () => {
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          name: '8.8.8 - Local release title',
          body: 'Local release body',
        },
        null,
        2,
      ),
      'utf8',
    );

    const metadata = releaseUploadNotes.readReleaseMetadata('8.8.8');

    expect(metadata).toEqual({
      metadataPath,
      name: '8.8.8 - Local release title',
      body: 'Local release body',
    });
  });
});

afterAll(() => {
  if (fs.existsSync(metadataPath)) {
    fs.rmSync(metadataPath, { force: true });
  }
  const releaseDir = path.dirname(metadataPath);
  if (fs.existsSync(releaseDir) && fs.readdirSync(releaseDir).length === 0) {
    fs.rmdirSync(releaseDir);
  }
});
