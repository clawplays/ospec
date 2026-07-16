# Known Issue: Resumed Goals Could Not Distinguish Their Dirty Workspace

## Status

- State: fixed in 1.8.8
- First confirmed: 2026-07-16
- Affected releases: 1.8.7 and earlier Goal workspace checks
- Severity: high availability impact; fail-closed behavior prevented unsafe dispatch, but valid Goals could not continue
- Component: `ospec update`, Goal workspace inspection, bootstrap routing, and Loop gate persistence

## Confirmed Incident

The failure was confirmed in the stopped Dev worktree:

```text
Project: D:\OPMProjs\ompv4
Goal: implement-mobile-figma-derived-workflows
Observed task: task-16
Task status: DONE
Task review: NEEDS_CHANGES
Workspace status: needs_isolation
Uncommitted paths: 14
```

The 14 paths contained a mixture of real Goal implementation work and files refreshed by `ospec update`. The Goal was not clean because it was already executing, but the workspace gate had no durable way to distinguish those legitimate paths from unrelated user edits. It therefore treated every path outside the Goal control directory as unowned and returned `needs_isolation`.

The same release exposed a second recovery boundary in the stopped Web worktree:

```text
Project: C:\Users\Chaos\orca\workspaces\ompv4\web-web-aim-platform-logic
Goal: web-aim-platform-logic
Observed task: task-4
Task status: DONE
Task review: PENDING
Workspace status: needs_isolation
Uncommitted implementation paths: 23
Tracked build metadata: apps/web/tsconfig.tsbuildinfo
```

The implementation paths belonged to non-`PENDING` task targets. The remaining tracked `tsconfig.tsbuildinfo` was rewritten by the completed task's declared `npm run build:web` verification. Treating every `*.tsbuildinfo` path as safe would be too broad, but rejecting this exact package-local output would still prevent the dedicated Goal worktree from reaching task review.

Stopping the Dev controller was correct. Deleting, committing, resetting, or moving all 14 files merely to satisfy the gate would have risked losing valid implementation state or mixing an incomplete Goal into repository history.

## Root Cause

### Workspace readiness modeled cleanliness, not ownership

The old check accepted a clean Git worktree and rejected a dirty one. That is sufficient before a new Goal starts, but not when resuming an existing Goal whose workers have already edited target files.

### Task state was not used as a path ownership source

The task graph already records every task's `target_files` and lifecycle status. The workspace check did not use non-`PENDING` task targets to identify paths that the Goal had legitimately begun to own.

`PENDING` targets must remain excluded. Treating every planned target as owned would allow unrelated edits to future task files to bypass isolation before OSpec dispatches those tasks.

### Declared build verification could update tracked package metadata

A started task may run a declared build or typecheck command after editing its target files. TypeScript can then update `tsconfig.tsbuildinfo` next to the nearest owning `tsconfig.json`. That exact generated path is a consequence of the task verification, but it is not normally a business-code target and older task graphs did not list it.

### `ospec update` did not leave exact provenance

An update can refresh `.skillrc`, managed guidance, tooling, hooks, plugin assets, legacy knowledge paths, and archive layout. The command reported aggregate created/refreshed paths to the console but did not persist the exact resulting content hashes. A later workspace check could not prove which dirty files were produced by that update.

### Hard gates looked like an active Loop

Several Loop gates returned without work but left state looking like `running` at step `gate`. Operators could reasonably interpret that as an action still making progress and continue observing it. A real hard gate needs a durable, resumable status distinct from active execution.

### Legacy document syntax could regress bootstrap routing

The bootstrap draft detector treated every angle-bracket token as a placeholder. Valid technical notation such as canonical `<route>.json` could make an already executing Goal look like it still needed design or planning work.

## 1.8.8 Fix Contract

### Goal-owned dirty paths

Workspace inspection derives exact owned paths from `target_files` of tasks whose status is no longer `PENDING`. Changes under those paths are reported separately as Goal-owned and do not force isolation.

For a non-`PENDING` task that declares a build, typecheck, or `tsc` verification command, inspection also derives only the default `tsconfig.tsbuildinfo` beside the nearest `tsconfig.json` that owns one of that task's targets. These entries are reported separately as task-generated. There is no extension wildcard: unrelated `*.tsbuildinfo`, metadata outside the task's package, generated files for `PENDING` tasks, and other build outputs remain blocking.

### Hash-bound update provenance

`ospec update` writes `.ospec/update-provenance.json` after all project mutations. The artifact records:

- the CLI version that performed the update;
- every created, refreshed, migrated, or removed managed path;
- `file` or `missing` state for each path;
- a SHA-256 content hash for each file.

Archive moves record both the missing source and every file under the destination. A workspace check accepts an update-managed dirty path only when the provenance belongs to the current CLI and its current filesystem state matches exactly.

The workspace artifact binds the provenance hash when it uses that proof. Any later provenance or managed-file change invalidates the inspection. Stale provenance that was not used to accept a dirty path does not block an otherwise valid clean or Goal-owned workspace.

### Unknown paths still fail closed

Ordinary dirty paths, `PENDING` task targets, unsafe provenance paths, duplicate provenance records, version mismatch, hash mismatch, and post-inspection changes still return `needs_isolation`. This release does not turn `ospec update` into a blanket dirty-worktree bypass.

### Durable blocked Loop state

A hard Loop gate now persists `status: blocked` and returns `stopped: true`. `ospec loop resume` can move `blocked` back to `idle` after the operator resolves the gate, but the next tick evaluates the same safety condition again. Resume never bypasses the gate.

### Bootstrap compatibility

Valid angle-bracket technical notation no longer marks a document as draft. When durable task execution or dispatch has already started, legacy draft-marked core documents do not route the Goal backwards ahead of its execution state.

## Operator Recovery

For a Goal stopped on the old workspace gate:

1. Leave existing implementation files intact.
2. Upgrade the project CLI to 1.8.8 or later.
3. Run `ospec update` once so current managed files receive current-version provenance.
4. Run `ospec execute workspace <goal-path>` and inspect the Goal-owned, task-generated, update-managed, and blocking groups.
5. Resolve only paths still listed as blocking.
6. Run `ospec loop resume <goal-path>`, then continue with the next normal controller tick.

An update performed by an older CLI cannot retroactively prove its output. Running the current update again is what creates the trusted hash snapshot. Never hand-author the provenance artifact or add unrelated paths to it.

## Acceptance Criteria

1. Dirty targets of `IN_PROGRESS`, `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED` tasks can be classified as Goal-owned.
2. Dirty targets belonging only to `PENDING` tasks remain blocking.
3. A current `ospec update` output is accepted only at the exact recorded hash.
4. Tampering with either an accepted managed file or its provenance invalidates workspace evidence.
5. Stale unused provenance does not block a clean or otherwise Goal-owned workspace.
6. Created, refreshed, removed, renamed, directory, plugin, knowledge, and archive-migration outputs are represented without granting a parent-directory wildcard.
7. An unrelated dirty path still returns `needs_isolation`.
8. Nested projects normalize task and update paths relative to the Git root correctly.
9. A hard gate persists `blocked`, reports `stopped: true`, and can be reevaluated after explicit resume.
10. Existing Goals containing technical syntax such as `<route>.json` do not route backwards to design after execution has started.
11. A started task's declared TypeScript build may retain only its exact package-local `tsconfig.tsbuildinfo`; the same filename outside that package and all generated paths for `PENDING` tasks remain blocking.

## Relevant Code Areas

- `src/commands/UpdateCommand.ts`: update provenance generation.
- `src/core/constants.ts`: managed provenance filename.
- `src/services/TaskGraphExecutionService.ts`: workspace ownership, evidence validation, bootstrap compatibility, and reports.
- `src/services/LoopService.ts`: blocked status and initial action claim window.
- `src/services/templates/ProjectTemplateBuilder.ts` and `assets/`: generated recovery guidance.
- `tests/services/workspace-readiness.test.mjs`: ownership and tamper boundaries.
- `tests/upgrade/update-command-characterization.test.mjs`: provenance generation and migration coverage.

## Non-Goals

This fix does not commit, reset, stash, move, or delete project files. It does not restart the stopped Dev Goal. It also does not fully solve multi-child heartbeat fairness; that remains tracked separately.
