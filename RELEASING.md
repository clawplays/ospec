# Releasing

This document is for maintainers of the OSpec release repository.

## Release Trigger

npm publishing is automated by GitHub Actions in [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml).

Normal pushes to `main` do not publish.

Only a pushed version tag such as `0.3.1` triggers a release.

GitHub Releases are created from the same bare version tag. Do not use a `v` prefix.

## Standard Release Flow

1. Bump the package version.
2. Verify the packaged release.
3. Commit the version change.
4. Push the commit to `main`.
5. Create and push the matching version tag.
6. Let GitHub Actions publish to npm.
7. Let GitHub Actions create or update the matching GitHub Release page.

## One-Command Release Cut

Cut a local patch release:

```bash
npm run release:cut:patch
```

Cut and push a patch release:

```bash
npm run release:cut:patch -- --push
```

Generic form:

```bash
npm run release:cut -- patch
npm run release:cut -- minor --push
npm run release:cut -- major --push
```

What `release:cut` does:

- requires a clean working tree
- bumps the version and syncs release-facing files
- runs `node dist/cli.js --version`
- runs `npm run release:check`
- runs `npm run release:smoke`
- runs `npm run release:notes`
- commits the release as `Release X.Y.Z`
- creates the matching bare Git tag `X.Y.Z`
- optionally pushes `main` and the tag when you pass `--push`

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
npm run release:notes
```

## Publish

If you did not use `release:cut -- --push`, after the version bump is committed on `main`, create and push the matching tag:

```bash
git tag X.Y.Z
git push origin X.Y.Z
```

Example:

```bash
git tag 0.3.1
git push origin 0.3.1
```

The workflow rejects the release if the Git tag does not exactly match `package.json`.

The workflow also creates the GitHub Release page for that tag, prepends upgrade instructions, and appends generated release notes using [`.github/release.yml`](.github/release.yml).

`npm run release:notes` previews the release intro and Git history locally before you commit or push.

## Required Repository Setup

Configure npm Trusted Publishing for this package and repository before using the workflow.

This workflow uses GitHub Actions OIDC and does not require `NPM_TOKEN`.
