#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));
const RELEASE_OVERRIDE_DIR = path.join(rootDir, '.skills', 'ospec-release-notes', 'releases');

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
    input: options.input,
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
    input: options.input,
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || '').trim();
}

function resolveTag(args) {
  return args.tag || packageJson.version;
}

function normalizeRepoUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().replace(/^git\+/, '').replace(/\.git$/, '');
  if (trimmed.startsWith('git@github.com:')) {
    return `https://github.com/${trimmed.slice('git@github.com:'.length)}`;
  }

  return trimmed;
}

function resolveRepositoryUrl() {
  const candidates = [
    packageJson.homepage,
    typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository?.url,
    packageJson.bugs?.url,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRepoUrl(candidate);
    if (normalized) {
      return normalized.replace(/\/+$/, '');
    }
  }

  throw new Error('Unable to resolve GitHub repository URL from package.json');
}

function parseGitHubRepository(repositoryUrl) {
  const match = repositoryUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  if (!match) {
    throw new Error(`Unsupported GitHub repository URL: ${repositoryUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

function getReleaseMetadataPath(tag) {
  return path.join(RELEASE_OVERRIDE_DIR, `${tag}.json`);
}

function readReleaseMetadata(tag) {
  const metadataPath = getReleaseMetadataPath(tag);
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Local release metadata not found: ${metadataPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';

  if (!name || !body) {
    throw new Error(`Local release metadata must include non-empty "name" and "body": ${metadataPath}`);
  }

  return {
    metadataPath,
    name,
    body,
  };
}

function ensureRemoteTagExists(tag) {
  const output = tryRun('git', ['ls-remote', '--tags', 'origin', tag], { cwd: rootDir });
  if (!output) {
    throw new Error(`Remote tag ${tag} was not found on origin. Push the tag before uploading release notes.`);
  }
}

function getGitCredentialAuth(repositoryUrl) {
  const token = String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
  if (token) {
    return { mode: 'bearer', token };
  }

  const host = new URL(repositoryUrl).host;
  const pathName = new URL(repositoryUrl).pathname.replace(/^\/+/, '');
  const request = `protocol=https\nhost=${host}\npath=${pathName}\n\n`;
  const output = run('git', ['credential', 'fill'], { cwd: rootDir, input: request });
  const credentialMap = {};

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('=')) {
      continue;
    }
    const [key, value] = line.split('=', 2);
    credentialMap[key] = value;
  }

  if (!credentialMap.username || !credentialMap.password) {
    throw new Error(`No usable GitHub credentials found for ${repositoryUrl}`);
  }

  return {
    mode: 'basic',
    username: credentialMap.username,
    password: credentialMap.password,
  };
}

function buildHeaders(auth) {
  if (auth.mode === 'bearer') {
    return {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ospec-release-upload',
    };
  }

  const pair = `${auth.username}:${auth.password}`;
  const encoded = Buffer.from(pair, 'utf8').toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ospec-release-upload',
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : {};

  if (!response.ok) {
    const error = new Error(`GitHub API request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function uploadReleaseNotes(options) {
  const tag = resolveTag(options.args || {});
  const repositoryUrl = resolveRepositoryUrl();
  const repository = parseGitHubRepository(repositoryUrl);
  const metadata = readReleaseMetadata(tag);
  ensureRemoteTagExists(tag);
  const prerelease = tag.includes('-');
  const payload = {
    tag_name: tag,
    name: metadata.name,
    body: metadata.body,
    draft: false,
    prerelease,
    ...(prerelease ? {} : { make_latest: 'legacy' }),
  };

  if (options.args?.['dry-run']) {
    return {
      mode: 'dry-run',
      tag,
      repository,
      metadataPath: metadata.metadataPath,
      payload,
    };
  }

  const auth = getGitCredentialAuth(repositoryUrl);
  const headers = buildHeaders(auth);
  const baseUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}/releases`;

  try {
    const existing = await requestJson(`${baseUrl}/tags/${tag}`, {
      method: 'GET',
      headers,
    });

    const updated = await requestJson(`${baseUrl}/${existing.id}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        body: payload.body,
        draft: payload.draft,
        prerelease: payload.prerelease,
        ...(prerelease ? {} : { make_latest: 'legacy' }),
      }),
    });

    return {
      mode: 'updated',
      tag,
      repository,
      metadataPath: metadata.metadataPath,
      htmlUrl: updated.html_url,
      name: updated.name,
    };
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    const created = await requestJson(baseUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return {
      mode: 'created',
      tag,
      repository,
      metadataPath: metadata.metadataPath,
      htmlUrl: created.html_url,
      name: created.name,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await uploadReleaseNotes({ args });

  if (result.mode === 'dry-run') {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[release:upload-notes] ${result.mode} GitHub Release ${result.tag}`);
  console.log(`[release:upload-notes] title: ${result.name}`);
  console.log(`[release:upload-notes] source: ${result.metadataPath}`);
  console.log(`[release:upload-notes] url: ${result.htmlUrl}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`[release:upload-notes] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  getReleaseMetadataPath,
  parseGitHubRepository,
  readReleaseMetadata,
  resolveRepositoryUrl,
  uploadReleaseNotes,
};
