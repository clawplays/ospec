# GitHub Workflow Automation Protocol

## Status

This document defines the repository protocol for a future local-only GitHub workflow automation tool.

Current status:

- OSpec does not ship a built-in issue or PR workflow command
- this repository does not include the automation program itself
- the automation program is expected to run locally, outside this repository
- this document is the contract that the local automation must follow

## Goals

The local automation should be able to:

1. fetch or inspect the current GitHub issue list and PR list
2. start from either an issue or a PR
3. create a dedicated git branch for an issue when needed
4. review, repair, or complete an existing PR when needed
5. implement the fix in the repository
6. add or update regression tests under `tests/`
7. run verification before handoff
8. run a post-fix confirmation pass after the first green test run
9. produce a concise implementation and validation summary
10. continue through GitHub closeout when the user requests the full lifecycle

## Non-Goals

This protocol does not require the automation to:

- close GitHub issues before the fix reaches the default branch
- bypass human review
- bypass branch protection, merge queues, or required checks
- fake PR approval when repository policy requires a real reviewer
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
- push access and PR or merge permissions are available when full GitHub closeout is requested

If any of those checks fail, the automation should stop and report the blocker.

## Intake Modes

The automation should support both entry modes and state which one it is using.

### Issue-First

Use this mode when the user starts from an issue number, the issue list, or a bug report that should become an issue-driven fix.

### PR-First

Use this mode when the user starts from a PR number, asks to review someone else's PR, or wants automation to finish an existing PR.

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

## PR Intake

For each PR, the automation should capture at least:

- PR number
- PR title
- PR URL
- PR author
- base branch and head branch
- PR body
- current review state and checks
- linked issue state when present

It should then restate the PR in repository terms:

- changed files and affected behavior
- review findings or suspected gaps
- likely verification scope
- whether direct branch updates are possible

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
2. create the issue branch from the latest base branch when starting from an issue
3. keep all issue-specific work on that branch
4. when starting from a PR, prefer the PR head branch if safe and writable
5. when direct PR branch updates are not possible, create a helper branch such as `pr/<number>-<short-slug>` from the PR head and report that choice

## Fix Workflow

The automation should follow this order:

1. inspect the issue or PR and reproduce the behavior when practical
2. identify the smallest correct fix or the correct review outcome
3. implement the code change when a fix is needed
4. add or update regression coverage under `tests/`
5. run targeted verification
6. run broader verification when the change touches shared workflow paths
7. run a post-fix confirmation pass
8. summarize changed files, test results, review outcome, and residual risks

## Post-Fix Confirmation

After the first successful verification pass, the automation should run one more confirmation pass before handoff or merge.

Required checks:

- re-read the changed files and confirm the final output shape matches the issue expectation
- run `git diff --check`
- rerun the new or changed regression tests directly
- rerun broader smoke verification when the change touched shared workflow, generators, templates, or validation logic
- when the fix changes generated output, run one direct output probe to confirm the broken pattern is absent and the expected pattern is present

The first green command run is not enough for template, generator, validation, or shared-workflow fixes.

## Testing Policy

Every issue fix or PR-targeted behavior fix should leave behind regression coverage when practical.

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

- entry mode: `issue-first` or `pr-first`
- issue number and title
- issue URL
- PR number and title when applicable
- PR URL when applicable
- branch name
- changed files
- added or updated tests
- commands that were run
- pass/fail result for each command
- post-fix confirmation commands and pass/fail result
- PR URL or merge commit when GitHub closeout was performed
- PR review gate status and whether automation is blocked on human review
- authenticated review identity that was used and whether GitHub accepted it
- issue comment, merge, and close status
- remaining risks or assumptions

## Closeout Policy

The automation should not close the GitHub issue only because code was written locally or because the fix exists only on the issue branch.

Recommended closeout order:

1. fix the issue on the issue branch, or review and repair the PR branch or helper branch
2. run regression checks and post-fix confirmation
3. push the working branch
4. create or update the PR to the default branch
5. when issue-first, link the PR to the issue with a closing keyword such as `Fixes #5` or `Closes #5`
6. comment on the issue or PR with a concise status summary and validation results
7. merge the PR after required checks or review pass
8. verify the default branch contains the fix
9. close the linked issue only after the fix is on the default branch

Preferred GitHub behavior:

- prefer the PR-based flow over a direct local merge to `main`
- rely on linked-PR auto-close when repository settings support it
- explicitly close the issue after merge only when auto-close does not trigger
- if the workflow stops before merge, leave the issue open and post a status comment instead of closing it

## Review Gate

PR review and branch protection must be treated as an explicit gate.

After creating the PR, the automation should:

1. inspect the PR merge state, review decision, and checks
2. request review or report the required reviewer when the repository policy expects it
3. stop and report a blocker when human review is required and not yet satisfied
4. resume merge and closeout only after the required review and checks pass

This means the workflow can be fully automatic only when repository policy allows the current actor to satisfy the review gate. If another human review is required, the workflow is semi-automatic: it prepares the branch, PR, tests, and issue comment, then pauses until review is complete.

## Authenticated Review Identity

When full automation is requested, the automation should continue with an AI review pass rather than stopping at the first review prompt.

Required behavior:

1. review the diff, issue scope, and validation results locally
2. publish the review using the authenticated GitHub identity
3. verify whether that identity actually satisfies the repository review gate
4. if the authenticated identity is also the PR author, expect that GitHub may reject self-approval and verify the real result instead of assuming success
5. if self-approval is rejected, switch to a second authenticated reviewer identity or an explicitly allowed admin merge path
6. if neither is available, stop and report the blocker

Default authenticated identity is the current `gh auth` account. In this repository that is commonly `clawplays` for comments, PR creation, merge attempts, and closeout actions. That does not guarantee `clawplays` can approve a PR that `clawplays` authored.

The workflow is only fully automatic when at least one valid review path exists:

- a second authenticated reviewer identity that can approve
- a repository policy that accepts the current actor's approval
- an explicitly allowed admin merge path that can bypass the review gate

## Recommended Local Tool Shape

The local automation program can be implemented later using any local stack, but it should expose a flow equivalent to:

1. list issues and PRs
2. pick an issue or PR
3. create or select a working branch
4. run fix or review workflow
5. run validation
6. run post-fix confirmation
7. comment on the issue or PR and create or update a PR when full lifecycle mode is requested
8. merge and close when repository policy allows it
9. print handoff summary

Possible local integrations:

- GitHub CLI
- GitHub REST API
- Codex or Claude orchestration
- local PowerShell or Node.js wrappers

## Minimum Acceptance For Future Implementation

A future implementation should not be considered complete until it can demonstrate all of the following:

- reads the live open issue list
- reads the live open PR list
- creates an issue branch correctly
- can inspect and review an existing PR correctly
- preserves unrelated local work
- updates repository files without destructive git actions
- adds or updates regression coverage in `tests/`
- runs validation commands and reports the results
- runs a post-fix confirmation pass
- can comment on the issue and create a linked PR when full lifecycle mode is requested
- detects PR review requirements and pauses or resumes correctly at the review gate
- verifies whether the authenticated review identity actually satisfies GitHub approval rules
- closes the issue only after the fix reaches the default branch
- leaves the repository ready for human review or merged closeout, depending on the requested mode
