# Known Issue: Dependent Repair Can Deadlock on a Manual Review Dispatch

## Status

- State: fixed in 1.8.10
- First confirmed: 2026-07-17
- Affected release: 1.8.9
- Severity: critical continuation impact; a valid Goal cannot advance without framework changes
- Components: Loop repair scheduling, prerequisite task reviews, manual task-review dispatch, executor provenance, and recovery

## Confirmed Incident

The failure was confirmed in the resumed Web Goal:

```text
Project: C:\Users\Chaos\orca\workspaces\ompv4\web-web-aim-platform-logic
Goal: web-aim-platform-logic
CLI: 1.8.9
Blocked repair task: task-4
Pending prerequisite review: task-1
```

The old malformed task-4 repair executor was correctly expired by 1.8.9 recovery without consuming another repair round. The next normal tick then attempted to prepare task-4 repair and failed at the dispatchability gate:

```text
Task task-4 is not dispatchable.
Run ospec execute review [change-path] --task task-1 before dispatching dependent work.
```

The operator followed that exact instruction. A fresh independent task-1 regression review completed with:

```text
decision: APPROVED
findings: []
focused tests: 31/31 passed
```

The review content, current target snapshot, structured findings, and dispatch identity were present. No task-4 repair round was consumed. Nevertheless, task-1 remained `review=PENDING` in the task graph.

The fresh review dispatch had the following impossible combination:

```text
requiresExecutorProvenance: true
loopActionId: null
loopActionItemId: null
reviewerExecutorId: null
reviewerClaimedAt: null
reviewerCompletedAt: null
reviewerSucceeded: null
```

The packet told the reviewer to update the artifact and run only `ospec execute sync`. `sync` cannot create the missing Loop lifecycle provenance, so the approved review could never become authoritative.

## Deadlock Sequence

```text
task-4 has NEEDS_CHANGES
  -> task-1 regression review becomes PENDING
  -> Loop prioritizes eligible task-4 repair before pending reviews
  -> task-4 dispatch rejects its unapproved task-1 dependency
  -> error instructs operator to run manual task-1 review
  -> manual review resolves a runtime adapter and requires executor provenance
  -> no Loop action exists to bind, claim, or complete that executor
  -> sync leaves task-1 PENDING
  -> next tick selects task-4 repair again
```

Without a framework fix or unsafe artifact forgery, the Goal cannot advance.

## Root Causes

### Repair scheduling ignores pending prerequisite reviews

`LoopService` builds `needsRepair` from completed tasks whose reviews are `NEEDS_CHANGES` and processes eligible repairs before `pendingReviewTasks`. The repair candidate set is not filtered by current dispatchability or by the review readiness of its dependency closure.

As a result, a dependent repair can be selected even though an upstream task review is `PENDING`. `retryWorkerRuns()` reaches the lower dispatch gate and throws instead of returning a schedulable prerequisite review action.

### Manual task-review dispatch has an unsatisfiable provenance contract

`TaskGraphExecutionService.reviewUnlocked()` sets `requiresExecutorProvenance=true` whenever the active controller session resolves an executable independent review adapter. That is correct for a Loop-owned reviewer, but the manual `ospec execute review` path does not create or bind a Loop action.

Task-review executor claim and completion are internal Loop lifecycle methods. Unlike document review, the task-review CLI exposes no standalone claim/heartbeat/complete lifecycle. The generated packet nevertheless says to hand the packet to a reviewer and then run `ospec execute sync`.

`validateTaskReviewEvidence()` correctly rejects the result because the dispatch has no Loop action, action item, claimed executor, or completion. The security check is correct; dispatch creation and operator guidance made the contract impossible to satisfy.

## Required Fix

### Schedule prerequisite reviews before dependent repairs

Before selecting a `NEEDS_CHANGES` task for repair, compute whether the task is currently dispatchable under dependency-review rules. If an upstream terminal task requires a fresh review, emit that prerequisite review action first. Do not call `retryWorkerRuns()` for a task that the same report says is not dispatchable.

The scheduler must preserve conflict safety and should handle the full dependency closure, not only a direct parent.

### Make manual task-review provenance reachable

Choose one explicit contract and keep generation, instructions, and validation consistent:

1. Preferably, make `ospec execute review --task` atomically create or adopt a Loop-owned review action when an executable controller adapter is selected, so the normal heartbeat/finalize lifecycle can bind real executor provenance.
2. If the command is intentionally manual or human-reviewed, create an explicit manual-review mode that does not claim Loop executor provenance and records independent human provenance under a separate validated contract.
3. If neither is possible, do not create a dispatch that requires unreachable provenance. Return a non-mutating instruction to run the Loop controller path.

Do not weaken `validateTaskReviewEvidence()` by accepting null or hand-authored executor fields.

### Recover already completed fresh reviews

For an existing 1.8.9 dispatch with valid current snapshot, APPROVED decision, structured findings, and null Loop lifecycle fields, recovery must either:

- transactionally adopt the dispatch into a fresh Loop review action and require a real independent executor to confirm/finalize it; or
- supersede it with a fresh Loop-bound review dispatch without changing task implementation state or consuming a task repair round.

Recovery must never invent executor identity, backdate timestamps, or treat the existing unbound approval as authoritative by itself.

### Improve diagnostics

`ospec execute sync` should report that an otherwise complete review is awaiting Loop executor provenance and provide the exact next command. It must not silently leave the task graph at `PENDING` after printing generic success.

## Acceptance Criteria

1. A repair task whose prerequisite terminal task has `review=PENDING` causes the prerequisite review to be scheduled before repair.
2. No repair dispatch is attempted for a task that the current report marks non-dispatchable.
3. Direct and transitive prerequisite review closures are handled deterministically.
4. A Loop-owned manual review command has a reachable bind, claim, heartbeat, complete, and finalize lifecycle.
5. A genuinely manual/human review never advertises or requires Loop executor provenance.
6. Generated review packet instructions exactly match the selected lifecycle.
7. `sync` reports incomplete executor provenance with an actionable next instruction.
8. Existing valid Loop-bound review provenance and tamper rejection do not regress.
9. Recovery of an unbound 1.8.9 review does not consume a repair round or alter implementation files.
10. Stale snapshots, stale dispatch pointers, forged executor IDs, missing findings, and mismatched controller sessions remain rejected.

## Regression Tests

Add tests for:

- task A terminal with a pending fresh review and task B `NEEDS_CHANGES` depending on A;
- Loop tick selecting A review before B repair;
- a transitive A -> B -> C dependency where C needs repair and A needs review;
- manual task-review dispatch with native and CLI adapters;
- packet instructions for Loop-owned versus explicit human review;
- sync diagnostics when decision evidence exists but executor provenance is incomplete;
- recovery/adoption or safe supersession of a 1.8.9 unbound APPROVED review;
- unchanged task repair-round accounting across the recovery;
- continued rejection of forged or stale provenance.

## Relevant Code Areas

- `src/services/LoopService.ts`: repair versus pending-review scheduling order.
- `src/services/TaskGraphExecutionService.ts`: review dispatch creation, Loop binding, executor lifecycle, evidence validation, and dispatchability.
- `src/commands/ExecuteCommand.ts`: task-review CLI contract and sync diagnostics.
- `tests/services/loop-controller-resilience.test.mjs`: dependency-aware scheduling.
- `tests/services/task-graph-review-dispatch-provenance.test.ts`: manual and Loop-bound review provenance.
- `tests/services/loop-evidence-readiness.test.mjs`: executor lifecycle and tamper boundaries.

## Pre-1.8.10 Operator Guidance

Do not hand-fill `loop_action_id`, executor identity, or timestamps, and do not mark task-1 approved directly in the task graph. Preserve the completed review and all current files. Upgrade before asking OSpec to emit a fresh Loop-owned task-1 review action.

## 1.8.10 Resolution

Loop repair scheduling now inspects each repair candidate's current graph blockers. Pending prerequisite reviews are issued first, while repairs blocked by unfinished dependencies, review gates, or running conflicts are excluded from the retry batch. Controller-owned Goals reject `ospec execute review` before creating an unbound dispatch and direct the controller to `ospec loop tick` instead.

An existing 1.8.9 approval with missing Loop executor provenance remains non-authoritative. `sync` reports the exact provenance failure, and the next Loop tick safely supersedes it with a fresh Loop-owned review. No executor identity is invented and no task repair round is consumed.
