#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));
const RELEASE_OVERRIDE_DIR = path.join(rootDir, 'releases');

const SECTION_ORDER = ['new', 'improved', 'fixed', 'docs'];
const SECTION_TITLES = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
  docs: 'Docs',
};
const TITLE_PRIORITY = ['fixed', 'new', 'improved', 'docs'];

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

function isReleaseCommit(subject) {
  return /^Release \d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(subject);
}

function getCommitFiles(hash) {
  const output =
    tryGit(['diff-tree', '--no-commit-id', '--name-only', '-r', hash]) || '';
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getCommitEntries(previousTag) {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const raw = git([
    'log',
    '--no-merges',
    '--pretty=format:%H%x09%h%x09%s',
    range,
  ]);

  if (!raw) {
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fullHash, shortHash, ...subjectParts] = line.split('\t');
      const subject = subjectParts.join('\t').trim();
      return {
        fullHash,
        hash: shortHash,
        subject,
        files: getCommitFiles(fullHash),
      };
    })
    .filter((entry) => !isReleaseCommit(entry.subject));
}

function normalizeRepoUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url
    .trim()
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');
  if (trimmed.startsWith('git@github.com:')) {
    return `https://github.com/${trimmed.slice('git@github.com:'.length)}`;
  }

  return trimmed;
}

function resolveRepositoryUrl() {
  const candidates = [
    typeof packageJson.repository === 'string'
      ? packageJson.repository
      : packageJson.repository?.url,
    packageJson.bugs?.url,
    packageJson.homepage,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRepoUrl(candidate);
    if (normalized) {
      return normalized.replace(/\/+$/, '');
    }
  }

  return '';
}

function normalizeCommitText(subject) {
  const trimmed = String(subject || '').trim();
  if (!trimmed) {
    return '';
  }

  const withoutPrefix = trimmed.replace(
    /^(feat|feature|fix|docs?|refactor|perf|test|chore|ci|build|style)(\([^)]+\))?!?:\s*/i,
    '',
  );
  const normalized = withoutPrefix
    .replace(/\bai\b/g, 'AI')
    .replace(/\bospec\b/gi, 'OSpec')
    .replace(/\.md\b/g, '.md');

  return (
    normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/\.$/, '')
  );
}

function isDocsCommit(entry) {
  const subject = entry.subject.toLowerCase();
  if (/^docs?(\(|:|\b)/.test(subject)) {
    return true;
  }

  return (
    entry.files.length > 0 &&
    entry.files.every(
      (file) =>
        file.startsWith('docs/') ||
        /^README(\.|$)/i.test(path.basename(file)) ||
        file === 'RELEASING.md',
    )
  );
}

function classifyCommit(entry) {
  const subject = entry.subject.toLowerCase();

  if (isDocsCommit(entry)) {
    return 'docs';
  }

  if (
    /^test(\(|:|\b)|\bcoverage\b|\bhook-check\b/.test(subject) ||
    (entry.files.length > 0 &&
      entry.files.every((file) => file.startsWith('tests/')))
  ) {
    return 'improved';
  }

  if (
    /^fix(\(|:|\b)|\bbug\b|\bbugfix\b|\bregression\b|\bstabiliz(e|ing)\b|\bprevent\b|\bpreserve\b|\bstrict\b|\bcorrect\b/.test(
      subject,
    )
  ) {
    return 'fixed';
  }

  if (
    /^feat(\(|:|\b)|\bfeature\b|\badd\b|\bimplement\b|\bintroduc(e|ing)\b|\blaunch\b|\bqueue service\b/.test(
      subject,
    )
  ) {
    return 'new';
  }

  if (
    /^refactor(\(|:|\b)|^perf(\(|:|\b)|^test(\(|:|\b)|^chore(\(|:|\b)|^ci(\(|:|\b)|^build(\(|:|\b)|\bimprov(e|ed|ing)\b|\boptimi[sz]e\b|\bexpand\b|\benhance\b|\bautomate\b|\bcoverage\b|\bworkflow\b|\brelease\b/.test(
      subject,
    )
  ) {
    return 'improved';
  }

  return 'improved';
}

function dedupe(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const normalized = item.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function buildFallbackSections(commits) {
  const sections = {
    new: [],
    improved: [],
    fixed: [],
    docs: [],
  };

  for (const commit of commits) {
    const category = classifyCommit(commit);
    sections[category].push(normalizeCommitText(commit.subject));
  }

  for (const key of SECTION_ORDER) {
    sections[key] = dedupe(sections[key]);
  }

  return sections;
}

function firstNonEmptySection(sections) {
  for (const key of TITLE_PRIORITY) {
    if (sections[key] && sections[key].length > 0) {
      return key;
    }
  }
  return null;
}

function buildFallbackTitleSuffix(sections) {
  const primarySection = firstNonEmptySection(sections);
  if (!primarySection) {
    return 'Maintenance updates';
  }

  const primaryBullet = sections[primarySection][0];
  if (!primaryBullet) {
    return 'Maintenance updates';
  }

  return primaryBullet;
}

function formatCountLabel(sectionKey, count) {
  const singular = {
    new: 'new feature',
    improved: 'improvement',
    fixed: 'fix',
    docs: 'documentation update',
  };
  const plural = {
    new: 'new features',
    improved: 'improvements',
    fixed: 'fixes',
    docs: 'documentation updates',
  };

  return `${count} ${count === 1 ? singular[sectionKey] : plural[sectionKey]}`;
}

function joinNaturalLanguage(parts) {
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function buildFallbackSummary(sections) {
  const primarySection = firstNonEmptySection(sections);
  const primaryBullet = primarySection ? sections[primarySection][0] : '';
  const counts = SECTION_ORDER.filter(
    (key) => sections[key] && sections[key].length > 0,
  ).map((key) => formatCountLabel(key, sections[key].length));

  if (!primaryBullet && counts.length === 0) {
    return 'This release includes internal maintenance and packaging updates.';
  }

  const lines = [];
  if (primaryBullet) {
    lines.push(`Highlights: ${primaryBullet}.`);
  }

  if (counts.length > 0) {
    lines.push(`This release includes ${joinNaturalLanguage(counts)}.`);
  }

  return lines.join(' ');
}

function buildCompareUrl(previousTag, tag, repositoryUrl) {
  if (!repositoryUrl) {
    return '';
  }

  if (previousTag) {
    return `${repositoryUrl}/compare/${previousTag}...${tag}`;
  }

  return `${repositoryUrl}/releases/tag/${tag}`;
}

function buildFallbackDraft(tag, previousTag, commits, repositoryUrl) {
  const sections = buildFallbackSections(commits);
  return {
    titleSuffix: buildFallbackTitleSuffix(sections),
    summary: buildFallbackSummary(sections),
    sections,
    compareUrl: buildCompareUrl(previousTag, tag, repositoryUrl),
  };
}

function normalizeStructuredDraft(input, fallbackDraft) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const normalized = {
    titleSuffix:
      typeof input.title_suffix === 'string' &&
      input.title_suffix.trim().length > 0
        ? input.title_suffix.trim()
        : fallbackDraft.titleSuffix,
    summary:
      typeof input.summary === 'string' && input.summary.trim().length > 0
        ? input.summary.trim()
        : fallbackDraft.summary,
    sections: {},
  };

  for (const key of SECTION_ORDER) {
    const items = Array.isArray(input[key]) ? input[key] : [];
    normalized.sections[key] = dedupe(
      items.map((item) => String(item || '').trim()).filter(Boolean),
    );
  }

  const hasAnySection = SECTION_ORDER.some(
    (key) => normalized.sections[key].length > 0,
  );
  if (!hasAnySection) {
    normalized.sections = fallbackDraft.sections;
  }

  return normalized;
}

function buildReleaseBody(tag, draft, packageName) {
  const lines = [draft.summary, ''];

  for (const key of SECTION_ORDER) {
    const items = draft.sections[key] || [];
    if (items.length === 0) {
      continue;
    }

    lines.push(`## ${SECTION_TITLES[key]}`);
    lines.push('');
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  lines.push('## Upgrade');
  lines.push('');
  lines.push('```bash');
  lines.push(`npm install -g ${packageName}@${tag}`);
  lines.push('ospec update');
  lines.push('```');
  lines.push('');

  if (draft.compareUrl) {
    lines.push(`**Full Changelog**: ${draft.compareUrl}`);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function buildReleasePayload(tag, previousTag, commits, repositoryUrl, draft) {
  const releaseDraft =
    draft || buildFallbackDraft(tag, previousTag, commits, repositoryUrl);
  return {
    name: `${tag} - ${releaseDraft.titleSuffix}`.trim(),
    body: buildReleaseBody(tag, releaseDraft, packageJson.name),
    compareUrl: releaseDraft.compareUrl,
    summary: releaseDraft.summary,
    sections: releaseDraft.sections,
  };
}

function getReleaseOverridePath(tag) {
  return path.join(RELEASE_OVERRIDE_DIR, `${tag}.json`);
}

function loadReleaseOverride(tag, previousTag, repositoryUrl, fallbackDraft) {
  const overridePath = getReleaseOverridePath(tag);
  if (!fs.existsSync(overridePath)) {
    return null;
  }

  const raw = fs.readFileSync(overridePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (
    typeof parsed.name === 'string' &&
    parsed.name.trim().length > 0 &&
    typeof parsed.body === 'string' &&
    parsed.body.trim().length > 0
  ) {
    return {
      source: 'override',
      name: parsed.name.trim(),
      body: `${parsed.body.trim()}\n`,
      compareUrl:
        typeof parsed.compareUrl === 'string' &&
        parsed.compareUrl.trim().length > 0
          ? parsed.compareUrl.trim()
          : buildCompareUrl(previousTag, tag, repositoryUrl),
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      sections: {},
    };
  }

  const normalized = normalizeStructuredDraft(parsed, fallbackDraft);
  if (!normalized) {
    return null;
  }

  return {
    source: 'override',
    ...buildReleasePayload(tag, previousTag, [], repositoryUrl, {
      ...fallbackDraft,
      ...normalized,
      compareUrl:
        typeof parsed.compareUrl === 'string' &&
        parsed.compareUrl.trim().length > 0
          ? parsed.compareUrl.trim()
          : fallbackDraft.compareUrl,
    }),
  };
}

async function createReleaseMetadata(options = {}) {
  const tag = options.tag;
  const previousTag = options.previousTag || '';
  const commits = Array.isArray(options.commits) ? options.commits : [];
  const repositoryUrl = options.repositoryUrl || '';

  const fallbackDraft = buildFallbackDraft(
    tag,
    previousTag,
    commits,
    repositoryUrl,
  );
  const override = loadReleaseOverride(
    tag,
    previousTag,
    repositoryUrl,
    fallbackDraft,
  );
  if (override) {
    return override;
  }

  return {
    source: 'fallback',
    ...buildReleasePayload(
      tag,
      previousTag,
      commits,
      repositoryUrl,
      fallbackDraft,
    ),
  };
}

function writeOutput(outputPath, content) {
  fs.writeFileSync(path.resolve(rootDir, outputPath), content, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tag = resolveTag(args);
  const previousTag = resolvePreviousTag(tag, args['previous-tag']);
  const commits = getCommitEntries(previousTag);
  const repositoryUrl = resolveRepositoryUrl();
  const metadata = await createReleaseMetadata({
    tag,
    previousTag,
    commits,
    repositoryUrl,
  });

  if (args.format === 'json') {
    const json = JSON.stringify(metadata, null, 2);
    if (args.output) {
      writeOutput(args.output, json);
      return;
    }
    process.stdout.write(json);
    return;
  }

  const preview = [`Title: ${metadata.name}`, '', metadata.body].join('\n');
  if (args.output) {
    writeOutput(args.output, preview);
    return;
  }

  process.stdout.write(preview);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[release:notes] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildCompareUrl,
  buildFallbackDraft,
  buildFallbackSections,
  buildReleaseBody,
  buildReleasePayload,
  classifyCommit,
  createReleaseMetadata,
  getCommitEntries,
  normalizeCommitText,
  normalizeStructuredDraft,
  resolvePreviousTag,
  resolveRepositoryUrl,
};
