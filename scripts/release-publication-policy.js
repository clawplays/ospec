const RELEASE_REPO_EXCLUDED_PREFIXES = [
  'tests/',
  'docs/checkpoint-plugin-spec',
  'docs/stitch-plugin-spec',
  'docs/issue-automation.md',
  'docs/dev/',
  'docs/benchmarks/',
  'docs/goal-1.8.',
  'docs/change-1.8.',
];

function normalizePublicationPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '');
}

function isPrivateSourceOnlyPath(relativePath) {
  const normalizedPath = normalizePublicationPath(relativePath);
  return RELEASE_REPO_EXCLUDED_PREFIXES.some((prefix) =>
    normalizedPath.startsWith(prefix),
  );
}

module.exports = {
  RELEASE_REPO_EXCLUDED_PREFIXES,
  isPrivateSourceOnlyPath,
  normalizePublicationPath,
};
