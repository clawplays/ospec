# Issue Automation Protocol

## Status

This document defines the repository protocol for a future local-only issue automation tool.

Current status:

- OSpec does not ship a built-in `issue` command
- this repository does not include the automation program itself
- the automation program is expected to run locally, outside this repository
- this document is the contract that the local automation must follow

## Goals

The local automation should be able to:

1. fetch or inspect the current GitHub issue list
2. select one issue to work on
3. create a dedicated git branch for that issue
4. implement the fix in the repository
5. add or update regression tests under `tests/`
6. run verification before handoff
7. produce a concise implementation and validation summary

## Non-Goals

This protocol does not require the automation to:

- close GitHub issues automatically before review
- bypass human review
- auto-merge pull requests
- rewrite unrelated tests or docs
- force `ospec update` or archive old changes automatically

## Local-Only Rule

The automation program itself should stay outside this repository until the workflow is stable.

Repository-managed content:

- this protocol document
- regression tests added for specific fixes
- source changes required to resolve the issue

Local-only content:

- GitHub tokens
- personal scripts, wrappers, or launchers
- machine-specific paths
- local prompt packs or agent orchestration files

## Required Preconditions

Before the automation starts work on an issue, it must confirm:

- the repository is clean, or the user explicitly accepts the current dirty state
- the base branch is known, normally `main`
- GitHub issue access is available
- local test tooling is available
- the issue is still open

If any of those checks fail, the automation should stop and report the blocker.

## Issue Intake

For each issue, the automation should capture at least:

- issue number
- issue title
- issue URL
- current issue body
- current repository HEAD and base branch

It should then restate the issue in repository terms:

- affected files or subsystems
- expected behavior
- current behavior
- likely verification scope

## Branch Policy

Each issue should use a dedicated branch.

Recommended branch format:

```text
issue/<number>-<short-slug>
```

Examples:

```text
issue/5-tasks-md-checklist-format
issue/6-tasks-md-validation-frontmatter
```

The automation should:

1. fetch the latest base branch
2. create the issue branch from the latest base branch
3. keep all issue-specific work on that branch

## Fix Workflow

The automation should follow this order:

1. inspect the issue and reproduce the behavior
2. identify the smallest correct fix
3. implement the code change
4. add or update regression coverage under `tests/`
5. run targeted verification
6. run broader verification when the change touches shared workflow paths
7. summarize changed files, test results, and residual risks

## Testing Policy

Every issue fix should leave behind regression coverage when practical.

Expected rules:

- prefer focused tests in `tests/`
- keep regression tests close to the fixed behavior
- do not rely only on one-off manual validation
- if the fix affects shared workflow behavior, also run a broader smoke check

Examples of broader verification:

```bash
npx vitest run tests/<targeted-test>.mjs
node scripts/release-smoke.js
```

If broader verification is skipped, the automation should explain why.

## Validation Output

Before handoff, the automation should produce:

- issue number and title
- branch name
- changed files
- added or updated tests
- commands that were run
- pass/fail result for each command
- remaining risks or assumptions

## Closeout Policy

The automation should not close the GitHub issue only because code was written locally.

Recommended closeout order:

1. fix the issue on the issue branch
2. run regression checks
3. hand off for review or open a PR
4. close the issue only after the fix is accepted

## Recommended Local Tool Shape

The local automation program can be implemented later using any local stack, but it should expose a flow equivalent to:

1. list issues
2. pick issue
3. create branch
4. run fix workflow
5. run validation
6. print handoff summary

Possible local integrations:

- GitHub CLI
- GitHub REST API
- Codex or Claude orchestration
- local PowerShell or Node.js wrappers

## Minimum Acceptance For Future Implementation

A future implementation should not be considered complete until it can demonstrate all of the following:

- reads the live open issue list
- creates an issue branch correctly
- preserves unrelated local work
- updates repository files without destructive git actions
- adds or updates regression coverage in `tests/`
- runs validation commands and reports the results
- leaves the repository ready for human review
