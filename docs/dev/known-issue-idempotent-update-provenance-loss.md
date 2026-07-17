# Known Issue: Repeated Update Can Lose Managed-File Provenance

## Status

- State: fixed in 1.8.10
- First confirmed: 2026-07-17
- Affected release: 1.8.9
- Severity: high continuation impact; fail-closed workspace inspection can stop a valid resumed Goal
- Components: `ospec update`, update provenance, and Goal workspace ownership

## Confirmed Incident

The issue was confirmed while resuming the Dev Goal:

```text
Project: D:\OPMProjs\ompv4
Goal: implement-mobile-figma-derived-workflows
CLI: 1.8.9
Workspace status: needs_isolation
Blocking path: .ospec/for-ai/workflow-conventions.md
```

The blocking file was not a user-authored or unrelated change. Its SHA-256 exactly matched the current 1.8.9 localized release asset:

```text
64DB4D4E14797D5032F3C1DDDC32916A31DDEC403177CC36837374CC7EA57689
```

The same update provenance accepted `.ospec/for-ai/ai-guide.md`, `.ospec/for-ai/execution-protocol.md`, `.ospec/asset-sources.json`, and `.skillrc`, but omitted `.ospec/for-ai/workflow-conventions.md`. Workspace inspection therefore classified the exact current managed asset as an unowned dirty path.

This provenance defect was not the reason the Goal had no dispatchable task. `task-21-extract-model3d` remained under a real external Android/device evidence gate, and all later tasks depended on it. The defect is nevertheless a separate hard workspace gate that can prevent otherwise valid Goals from continuing.

## Root Cause

`ProjectService.syncProtocolGuidance()` synchronizes every managed guidance asset and returns three sets: `createdFiles`, `refreshedFiles`, and `skippedFiles`. A repeated update sees an already-current asset as `skipped`.

`UpdateCommand.execute()` constructs `.ospec/update-provenance.json` from only the paths created or refreshed during the current invocation, plus migration and tooling mutations. It does not include current managed assets reported as skipped. It then replaces the prior provenance file instead of retaining still-valid entries.

The result is non-idempotent ownership metadata:

```text
first update:  asset refreshed -> provenance contains path
second update: asset identical -> asset is skipped
second write:  provenance is replaced without path
workspace:     Git still reports asset dirty relative to repository HEAD
workspace:     current managed asset is misclassified as unowned
```

The content synchronization is correct. The provenance snapshot loses ownership coverage on a later no-op update.

## Required Fix

Update provenance must describe the complete current-version managed result that `ospec update` can prove, not only files mutated by the latest invocation.

The implementation should:

1. Include skipped direct-copy and generated managed assets when their current filesystem content exactly matches the current package-generated result.
2. Preserve valid prior records only when the current CLI can independently revalidate their path, kind, and SHA-256; never trust or blindly merge an older provenance record.
3. Continue recording created, refreshed, migrated, removed, and archive-moved paths as today.
4. Keep path normalization and Git-root containment checks unchanged.
5. Never grant ownership to user-modified managed-looking files whose current hash does not match the result produced or verified by the current update.
6. Rewrite provenance deterministically so a second no-op `ospec update` produces equivalent managed-file coverage.

## Acceptance Criteria

1. Running `ospec update` twice retains provenance for every current managed asset proven by the first run.
2. A managed asset dirty relative to Git HEAD but identical to the current package asset remains `update-managed` after a second no-op update.
3. `workflow-conventions.md` and every other localized direct-copy guidance file receive the same provenance treatment.
4. User-modified content under a managed target remains blocking unless the update actually replaces it with the current managed result.
5. Stale CLI versions, hash mismatches, duplicate records, unsafe paths, and paths outside the repository remain rejected.
6. Nested and classic layouts normalize paths consistently.
7. Repeated updates produce stable ordering and do not progressively shrink the provenance file.
8. Existing archive migration, plugin asset, tooling, and missing-path provenance behavior does not regress.

## Regression Tests

Add coverage that:

- initializes a Git-backed nested project;
- replaces `workflow-conventions.md` with an older version;
- runs `ospec update` and verifies the refreshed file and provenance record;
- runs `ospec update` again without changing files;
- verifies the record and SHA-256 remain present;
- runs workspace inspection and verifies the dirty file is `update-managed`, not blocking;
- tampers with the file after update and verifies workspace inspection fails closed.

## Relevant Code Areas

- `src/commands/UpdateCommand.ts`: provenance candidate collection and replacement.
- `src/services/ProjectService.ts`: protocol sync result aggregation.
- `src/services/ProjectAssetService.ts`: direct-copy created/refreshed/skipped classification.
- `src/services/TaskGraphExecutionService.ts`: update-managed workspace validation.
- `tests/upgrade/update-command-characterization.test.mjs`: repeated-update provenance coverage.
- `tests/services/workspace-readiness.test.mjs`: ownership and tamper regression coverage.

## Pre-1.8.10 Operator Workaround

Do not hand-edit `.ospec/update-provenance.json`. On an affected release, retain the managed files and treat an exact current-package hash match as diagnostic evidence only. Upgrade and regenerate complete provenance before resuming a blocked Goal.

## 1.8.10 Resolution

Protocol and tooling sync now return separately verified managed paths, including exact current assets that required no write. Plugin synchronization reports created, refreshed, skipped, and verified paths instead of losing overwritten existing assets. A repeated update also retains a same-version provenance record only while its normalized path, file/missing kind, and SHA-256 still match exactly. User-modified files fail that revalidation and are not carried forward.
