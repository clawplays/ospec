# Known Issue: Parallel Tasks Can Race Through Shared Verification Resources

## Status

- State: open
- First confirmed: 2026-07-16
- Affected release: 1.8.6 and earlier task-graph schedulers
- Severity: high for evidence integrity; medium for runtime stability
- Component: Goal loop batch selection and task verification

## Summary

OSpec currently decides whether implementation tasks can run in parallel from task dependencies, `parallelizable`, `conflicts_with`, target-file overlap, configured limits, token funding, and harness capacity. It does not model resources mutated by each task's `verification_commands`.

Two tasks can therefore be source-file-safe but verification-unsafe. When their native workers run broad build, test, capture, or development-server commands in the same worktree, those commands may concurrently mutate the same generated directory, cache, coverage database, port, process, or temporary filesystem object. The workers can fail intermittently, corrupt one another's output, or both report success from evidence that was not produced in isolation.

This is not fixed by putting the Goal in one isolated worktree. A single worktree isolates the Goal from other branches, but all workers in the Goal still share that worktree's generated state.

## Confirmed Incident

The issue was observed on the active Goal `web-aim-platform-logic` in the isolated worktree:

```text
C:\Users\Chaos\orca\workspaces\ompv4\web-web-aim-platform-logic
branch: ospec/web-aim-platform-logic
OSpec: 1.8.6
loop action: loop-action-9-1784178006234
```

At 2026-07-16 13:00:06 +08:00, the Loop emitted two implementation repair items in one batch:

```text
worker-9-task-2 -> /root/repair_loop9_task2
worker-9-task-3 -> /root/repair_loop9_task3
```

Their implementation targets were sufficiently disjoint for the current file-conflict selector, but both task packets required:

```text
npm run build:web
npm run lint:web
```

Both workers ran `next build` in the same worktree around 13:06. The processes overlapped while writing `apps/web/.next`. The verification wrappers also shared a temporary `apps/web/node_modules` junction. One worker reached ESLint while the other Next build was still running. The controller continued to heartbeat both workers and later recorded successful executor results, so lifecycle durability worked, but the overlapping build evidence itself was not trustworthy.

After the problem was reported to the active controller, task-2 explicitly recorded:

```text
Parallel worker build is self-check only; controller serial verification pending.
```

That is the correct incident-level mitigation, not a scheduler fix.

The controller then changed the Goal configuration to:

```text
maxParallel: 1
maxParallelReason: Shared web verification uses apps/web/.next and the same node_modules dependency tree; build:web and lint:web must run serially.
```

After both repair workers completed, the controller ran and recorded the authoritative commands serially:

```text
2026-07-16 13:25:11 +08:00  npm run build:web  PASSED  exit 0
2026-07-16 13:25:13 +08:00  npm run lint:web   PASSED  exit 0
target snapshot: 731039c28db5cbf86b1f063f46090b08bf710fc6a5a623ceead81da5b0980a94
```

Only after those records were durable did the Loop enter iteration 10 and issue the next task review with one review item. This confirms the workaround restores trustworthy evidence. It does not make the original parallel batch safe and does not remove the need for a scheduler-level fix.

## Why Existing Safety Checks Miss It

The current conflict-safe selector reasons about implementation ownership. `target_files` describes files a worker may edit; it does not describe files, ports, caches, or processes mutated by verification commands.

Examples of hidden exclusive resources include:

- Next.js `.next`, Vite caches, TypeScript build info, Gradle directories, and compiler output;
- coverage files, test snapshots, browser artifacts, screenshots, and trace directories;
- fixed ports and long-running development servers;
- temporary symlinks or junctions such as a workspace-local `node_modules` link;
- databases, emulators, device sessions, Docker names, and shared service state;
- package-manager locks or caches changed by install and build scripts.

Command equality is useful evidence but is not a complete resource model. Identical commands usually conflict when they write the same output, while different commands may still share a cache, port, or temporary link.

## User Impact

- Flaky worker failures that disappear when rerun serially.
- False confidence when both workers exit zero after reading or overwriting shared generated output.
- Corrupted or incomplete build artifacts used by later review or verification.
- Lost time from repeated repair/review cycles caused by nondeterministic verification.
- Junction or symlink removal by one worker while another worker still depends on it.
- Misleading `parallel-safe` diagnostics because only implementation files were considered.

The most serious impact is evidence integrity: a successful child lifecycle result does not prove that its verification ran against a stable workspace.

## Current Workaround

For an already-running batch:

1. Let in-flight workers finish unless they are actively damaging non-generated state.
2. Treat overlapping broad verification results as worker self-checks only.
3. After every worker has stopped editing, remove stale generated output when appropriate.
4. Run the authoritative build/test/lint commands once, serially, from the stable Goal worktree.
5. Record only that serial result as verification evidence before task review advances.

For future batches, set `maxParallel=1` or mark affected tasks serial when they share a mutating verification resource. This is safe but reduces implementation throughput, so it should remain a workaround rather than the final design.

## Required Fix

OSpec must include verification-side-effect conflicts in batch safety. A complete solution should preserve parallel implementation where possible while preventing concurrent use of exclusive verification resources.

### Phase 1: fail-safe scheduling

Add a normalized verification-resource claim to task contracts. A possible shape is:

```json
{
  "verification_resources": [
    { "key": "path:apps/web/.next", "mode": "exclusive" },
    { "key": "junction:apps/web/node_modules", "mode": "exclusive" },
    { "key": "port:8110", "mode": "exclusive" }
  ]
}
```

Batch selection must reject two tasks when either task claims the same resource exclusively. Resource keys must be canonical, project-relative where applicable, and resistant to path aliasing, traversal, and symlink/junction escapes.

For legacy graphs without explicit claims, use a conservative compatibility rule:

- detect identical normalized broad verification commands in the same worktree;
- treat known mutating command families such as build, coverage, e2e/capture, dev-server, emulator, and install as exclusive unless the task explicitly proves isolation;
- emit a diagnostic instead of silently assuming safety.

The diagnostic should name the tasks, normalized commands, inferred/declared resource key, worktree, and deferral reason such as `verification_resource_conflict`.

### Phase 2: preserve throughput

Do not permanently serialize implementation just because final verification is shared. Split the controller cycle into:

1. parallel scoped implementation and focused task-local checks;
2. a barrier after all batch workers have persisted implementation evidence;
3. one serial or deduplicated authoritative verification action for shared commands;
4. attribution of that immutable verification result to every covered task snapshot;
5. task review only after the shared verification result is current for all covered snapshots.

This allows task-2 and task-3 to edit disjoint source files concurrently while running `build:web` only once after both edits settle.

### Phase 3: optional isolated verification

Where the project supports it, the scheduler may run verification in per-worker worktrees or with command-specific output directories. Isolation must be proven, not inferred from worker identity. Per-worker isolation is an optimization and must not replace resource conflict validation.

## Non-Solutions

- A Goal-level worktree alone: workers still share generated state inside it.
- Heartbeats or longer deadlines: they preserve ownership but do not make commands concurrency-safe.
- Marking every task `parallelizable: false`: safe but causes a broad performance regression.
- Trusting two exit-code-zero builds: overlapping generated output invalidates the independence of the evidence.
- Comparing only `verification_commands` strings: different commands can mutate the same resource.
- Ignoring generated directories because they are Git-ignored: Git ownership and runtime resource ownership are different concerns.

## Acceptance Criteria

The optimization is complete only when all of the following hold:

1. Two tasks with disjoint `target_files` but the same exclusive verification resource are not emitted as concurrently executable verification work in one worktree.
2. Two tasks with disjoint implementation files can still implement concurrently when their shared authoritative verification is deferred behind a batch barrier.
3. An identical broad build command is deduplicated or serialized, and its result is bound to the combined stable target snapshot.
4. Different commands that declare the same port, output directory, cache, database, emulator, or junction conflict correctly.
5. Read-only or proven-isolated verification remains parallel-capable.
6. Diagnostics explain exactly which resource caused serialization and do not report a generic graph conflict.
7. Legacy task graphs remain readable and fail conservatively for known mutating shared commands.
8. L3 allowlist validation still applies to every deferred or consolidated verification command.
9. A failed shared verification invalidates every covered task result and routes bounded repair without duplicating unaffected implementation work.
10. Controller restart, heartbeat recovery, and `loop finalize` preserve the verification barrier without duplicate command execution.

## Regression Tests

Add controller integration tests covering:

- two Next.js tasks with disjoint source targets and shared `path:apps/web/.next`;
- two commands with different text but the same declared port or output directory;
- two read-only checks sharing a resource in `shared` mode;
- legacy tasks with duplicate `npm run build:web` commands;
- parallel implementation followed by one deduplicated serial build;
- restart while waiting at the verification barrier;
- one worker failure before the barrier and one shared verification failure after it;
- diagnostics and `lastBatchDiagnostics.deferredReasons` containing `verification_resource_conflict`;
- L3 command/path policy enforcement for the consolidated verification action.

## Relevant Code Areas

- `src/services/LoopService.ts`: batch preparation, action emission, diagnostics, and verification routing.
- `src/services/TaskGraphExecutionService.ts`: task graph schema, conflict-safe selection, dispatch/retry transactions, and workspace safety.
- `tests/services/loop-controller-integration.test.mjs`: controller batch, barrier, restart, and lifecycle coverage.
- `tests/services/task-graph-execution-service-characterization.test.mjs`: graph validation and conflict selection.
- `docs/dev/loop-execution-model-contract.md`: scheduling and evidence contract after the fix is designed.

## Release Guidance

Treat the scheduler fix as a behavioral change that requires a new release. Do not claim it merely by documenting the workaround. The release must include source changes, migration behavior for existing task graphs, focused regression tests, full Loop regression, generated assets, package smoke tests, and an explicit release-note entry.
