# OSpec Version Bump Instructions

This document is used to record the version upgrade process for this release repository. In the future, if only "bump version" or "bump one version" is mentioned, it will be treated as **patch +1** by default, unless otherwise explicitly stated to bump `minor` or `major`.

## Scope

- OSpec CLI release repository
- Scenarios where the release version number and the externally displayed version number need to be synchronized
- Users commit to Git themselves; this process does not automatically commit

## Default Rules

- `bump one version` = `patch +1`
- Example: `0.6.0 -> 0.6.1`
- If the user explicitly says to bump the minor version, use `minor`
- If the user explicitly says to bump the major version, use `major`

## Files to Synchronize

Every version bump must check and synchronize the following locations:

1. `package.json`
2. `package-lock.json`
3. `dist/cli.js`
4. `docs/usage.md`
5. `docs/usage.zh-CN.md`

## Standard Operation Steps

### 1. Confirm Current Version

Check the current CLI version in the following files first:

- `package.json`
- `package-lock.json`
- `dist/cli.js`
- `docs/usage.md`
- `docs/usage.zh-CN.md`

### 2. Upgrade `package.json` and `package-lock.json`

Recommended command:

```bash
npm version patch --no-git-tag-version
```

To bump the minor or major version, use:

```bash
npm version minor --no-git-tag-version
```

```bash
npm version major --no-git-tag-version
```

### 3. Synchronize CLI Constant Version

Change `CLI_VERSION` in `dist/cli.js` to the new version.

### 4. Synchronize Version Display in External Docs

Update the CLI version display in the following files:

- `docs/usage.md`
- `docs/usage.zh-CN.md`

The main README currently does not display the CLI version number, so modifying the README is not required here.

Only update the CLI version; do not change other protocol or skill versions unless specifically requested.

### 5. Perform Minimal Validation

At minimum, execute:

```bash
node dist/cli.js --version
```

Confirm that the output of the new version is correct.

If necessary, execute additionally:

```bash
npm run release:smoke
```

### 6. Delivery Instructions

Report to the user upon completion:

- What version was bumped from and to
- Which files were modified
- Whether minimal validation has been performed
- Git commits are to be completed by the user themselves

## Repository Conventions

- In the future, if the user only says "bump version" or "bump one version", it will be `patch +1` by default
- Unless explicitly requested by the user, do not automatically create Git tags or automatically commit to Git
- If new version display locations are added to the repository in the future, add them to this document
