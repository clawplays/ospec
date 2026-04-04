# Releasing

This document is for maintainers of the OSpec release repository.

## Release Trigger

npm publishing is automated by GitHub Actions in [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml).

Normal pushes to `main` do not publish.

Only a pushed version tag such as `0.3.1` triggers npm publishing.

Version tags should remain bare semantic versions. Do not use a `v` prefix.

## Standard Release Flow

1. Bump the package version.
2. Verify the packaged release.
3. Commit the version change.
4. Push the commit to `main`.
5. Create and push the matching version tag.
6. Let GitHub Actions publish to npm.
7. Upload the matching GitHub Release notes from your local release metadata file.

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
- does not upload GitHub Release notes; that stays a separate local step

`release:notes` now generates a structured release title and a user-facing release body with `New`, `Improved`, `Fixed`, and `Docs` sections.
If a local `.skills/ospec-release-notes/releases/<version>.json` file exists for the release tag, local preview commands use that metadata first.
GitHub Actions no longer creates GitHub Releases for this repository.

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

For higher-quality wording, generate a local release metadata file before tagging in your local `.skills/` directory:

```bash
.skills/ospec-release-notes/releases/<version>.json
```

Recommended local flow:

1. ask Codex to generate release notes for the target version using your local release-notes skill
2. review or edit `.skills/ospec-release-notes/releases/<version>.json`
3. cut and push the release as usual
4. run `npm run release:upload-notes -- --tag <version>` to create or update the GitHub Release from the local file

End-to-end AI-assisted maintainers flow:

1. ask Codex to prepare the next version bump and draft local release notes
2. let Codex run the release bump, checks, commit, tag, and push flow
3. let Codex run `npm run release:upload-notes -- --tag <version>` after the tag is on the remote

`npm run release:notes` previews the generated release title and release body locally before you commit or push.
`npm run release:upload-notes -- --tag <version>` uploads the local file to GitHub using your local GitHub credentials.

## Required Repository Setup

Configure npm Trusted Publishing for this package and repository before using the workflow.

This workflow uses GitHub Actions OIDC and does not require `NPM_TOKEN`.
