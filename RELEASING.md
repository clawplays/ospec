# Releasing

This document is for maintainers of the OSpec release repository.

## Release Trigger

npm publishing is automated by GitHub Actions in [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml).

Normal pushes to `main` do not publish.

Only a pushed version tag such as `v0.3.1` triggers a release.

## Standard Release Flow

1. Bump the package version.
2. Verify the packaged release.
3. Commit the version change.
4. Push the commit to `main`.
5. Create and push the matching version tag.
6. Let GitHub Actions publish to npm.

## Bump Version

Patch release:

```bash
npm run release:bump:patch
```

Minor release:

```bash
npm run release:bump:minor
```

Major release:

```bash
npm run release:bump:major
```

The version bump updates:

- `package.json`
- `package-lock.json`
- `dist/cli.js`
- `docs/usage.md`
- `docs/usage.zh-CN.md`

## Verify Before Publish

Minimum verification:

```bash
node dist/cli.js --version
npm run release:check
```

Recommended verification:

```bash
npm run release:smoke
```

## Publish

After the version bump is committed on `main`, create and push the matching tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Example:

```bash
git tag v0.3.1
git push origin v0.3.1
```

The workflow rejects the release if the Git tag does not exactly match `package.json`.

## Required Repository Setup

Add `NPM_TOKEN` to the GitHub repository secrets before using the workflow.
