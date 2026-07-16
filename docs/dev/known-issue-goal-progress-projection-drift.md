# Known Issue: Goal Progress Can Drift Across Evidence, Task Graph, and tasks.md

## Status

- State: fixed
- First confirmed: 2026-07-16
- Affected release: 1.8.6 and earlier Goal task-graph execution
- Fixed release: 1.8.7
- Severity: high for completion and operator trust; running task work remains recoverable from durable evidence
- Component: task completion, task-review synchronization, checklist projection, verification, and archive gates

## Summary

An OSpec Goal currently exposes progress through several durable artifacts:

1. worker dispatch and completion records;
2. task review Markdown and structured findings;
3. `artifacts/loop/state.json` and its progress fingerprint;
4. `artifacts/agents/task-graph.json`;
5. the human-facing `tasks.md` checklist.

These surfaces are intended to describe one workflow, but OSpec 1.8.6 does not keep them as one consistent projection.

Two related failures were confirmed:

- implementation completion and review synchronization update `task-graph.json` but never update the corresponding task checkbox in `tasks.md`;
- valid review artifacts and the Loop progress fingerprint can say `APPROVED` while the raw task graph still contains `review.decision: PENDING` for the same completed task.

The first failure is deterministic in the current implementation. `tasks.md` is created or edited during planning, then remains a plan-time snapshot while the Goal runs. The second failure is intermittent and shows that artifact-derived review state can be consumed by the Loop without being durably preserved in the raw graph, or can be overwritten by a later graph mutation based on an older snapshot.

This is not merely cosmetic. `ArchiveGate` rejects a change when `tasks.md` still has unchecked items. A Goal can therefore implement and review its tasks successfully but still fail verification/finalization, or enter a no-progress stop near the end, because its human-facing checklist never advanced.

## Resolution In 1.8.7

OSpec 1.8.7 adds an idempotent Goal progress reconciler under the existing task-graph mutation lease. It validates current review provenance, repairs stale raw graph decisions, projects accepted `task-*` entries into exact matching `tasks.md` checklist lines, and writes `artifacts/agents/progress-projection.json` with source hashes and structured diagnostics.

The reconciler runs during worker-status sync, review-cache restoration, bootstrap, Loop resume/tick, verification, finalize, archive preflight, and explicit execution status. Existing 1.8.6 Goals are backfilled from durable evidence without worker or reviewer redispatch.

Only `DONE` or `DONE_WITH_CONCERNS` tasks with `APPROVED` or `APPROVED_WITH_CONCERNS` current review evidence are checked. Pending, invalidated, blocked, and `NEEDS_CHANGES` tasks are unchecked. Internal `repair-final-*` tasks are not mistaken for plan checklist items. Duplicate, unknown, missing accepted, or ambiguous `task-*` lines fail closed and retain the original Markdown for operator repair.

`tasks.md` is written through same-directory atomic replacement. The graph is written first and the projection record last, so a crash between files is detected and repaired by the next idempotent reconciliation.

## Confirmed Incidents

Two live Goals running OSpec 1.8.6 confirmed the issue on 2026-07-16.

### Mobile Goal

```text
Goal: implement-mobile-figma-derived-workflows
Path: D:\OPMProjs\ompv4\.ospec\changes\active\implement-mobile-figma-derived-workflows
OSpec: 1.8.6
```

At 16:14 +08:00:

```text
tasks.md modified:       2026-07-14 17:33:26 +08:00
task checkboxes:         0 checked / 32 total
task-graph modified:     2026-07-16 15:58:10 +08:00
accepted task outcomes:  tasks 01-15 plus task 22
active work:             task-16 repair after NEEDS_CHANGES
Loop noProgressCount:    0
```

The active repair was legitimate. It was removing fabricated Pad statistics and fixed dates, replacing unsupported detail with real data or explicit unavailable states, and deleting the old duplicate `projectHome` renderer. The Goal was progressing even though `tasks.md` still showed every task as untouched.

The same Goal also demonstrated raw graph review drift:

```text
task-03 review.md:              APPROVED
task-03 Loop fingerprint:       DONE:APPROVED
task-03 task-graph decision:    PENDING

task-15 review.md:              APPROVED
task-15 Loop fingerprint:       DONE:APPROVED
task-15 task-graph decision:    PENDING
```

The review artifacts retained exact review dispatch ids and reviewed timestamps. The Loop fingerprint correctly consumed them. Only the raw graph projection was stale.

### Web Goal

```text
Goal: web-aim-platform-logic
Authoritative worktree: C:\Users\Chaos\orca\workspaces\ompv4\web-web-aim-platform-logic
Change: .ospec\changes\active\web-aim-platform-logic
OSpec: 1.8.6
```

At 16:14 +08:00:

```text
tasks.md modified:       2026-07-15 11:44:04 +08:00
all checkboxes:          0 checked / 15 total
task checkboxes:         0 checked / 9 total
workflow checkboxes:     0 checked / 6 total
completed and approved:  task-1, task-2, task-3, task-5, task-6, task-7
implemented:             task-8, awaiting independent review
pending:                 task-4 and task-9
Loop noProgressCount:    0
```

The controller had already repaired and re-reviewed task-7 once, accepted it as `APPROVED_WITH_CONCERNS`, advanced to task-8 review, and issued no duplicate task or reviewer. The zero-percent `tasks.md` display was therefore demonstrably false.

## Source Evidence

Goal mutations write the task graph but do not project the result into `tasks.md`:

- `TaskGraphExecutionService.dispatchUnlocked` sets the task to `IN_PROGRESS` and writes `report.graphPath`.
- `TaskGraphExecutionService.completeUnlocked` sets the terminal task status, resets the current task review, and writes `report.graphPath`.
- `TaskGraphExecutionService.syncTaskReviewStateFromArtifacts` reads review artifacts and writes review decisions to `task-graph.json` when it detects a change.
- no Goal execution path writes task checkbox state to `tasks.md`.
- the only direct `tasks.md` writes found in the source create the initial file in `TemplateGenerator` and `NewCommand`.

At the same time, `ArchiveGate` explicitly reports `tasks.md still has unchecked items`. The runtime therefore treats `tasks.md` as both a static plan-time derivative and a terminal completion gate, which is an inconsistent ownership contract.

## Root Cause

### 1. No durable progress projection owns tasks.md

The planning contract says that `tasks.md` is derived from the task graph, but execution treats only the JSON graph as mutable. There is no idempotent projection service that maps task ids and accepted review outcomes back to Markdown checkboxes.

Worker packets correctly exclude `tasks.md` from implementation scope, and reviewers are read-only. As a result, no actor is authorized or instructed to update the checklist during normal execution.

### 2. Completion and review mutations are graph-local

Dispatch, completion, retry, and review synchronization each mutate graph JSON independently. They do not update one versioned progress aggregate and regenerate all projections from it in the same mutation lease.

### 3. Review state has more than one read model

The Loop can derive effective review decisions from current review artifacts when building its progress fingerprint. Raw graph consumers can still read an older `review.decision`. A later graph write can preserve or reintroduce the stale value if it starts from an older raw snapshot.

### 4. The archive gate trusts a stale derivative

The archive gate parses `tasks.md` directly. It cannot distinguish an intentionally pending task from a terminal accepted task whose checkbox was never projected. It consequently blocks correct work using stale presentation state.

## User Impact

- Users see zero progress after hours or days of real implementation and review work.
- Operators can incorrectly conclude that a controller is stuck and interrupt healthy workers.
- Status tools disagree about whether a review is pending or approved.
- Repair and downstream eligibility can be harder to audit when raw graph review fields are stale.
- Final verification or archive can stop on unchecked tasks after all implementation work has completed.
- A controller may repeatedly report no progress near completion if verification keeps observing the same stale checklist blocker.
- Manual bulk checking is unsafe because `DONE` with `PENDING` or `NEEDS_CHANGES` review is not accepted completion.

## Current Operational Guidance

Do not terminate a healthy implementation or review action solely because `tasks.md` is stale. The live action remains governed by exact dispatch/review evidence, heartbeat ownership, leases, and the Loop fingerprint.

For an active 1.8.6 Goal:

1. Let the current worker or reviewer finish and finalize under its existing action ownership.
2. Continue normal task execution while `noProgressCount` remains zero and action ids are not duplicated.
3. Do not manually check every item in `tasks.md` while tasks are still running.
4. Before final verification/finalization/archive, upgrade to a release that can reconcile legacy Goal progress, or run a narrowly reviewed one-time reconciliation tool supplied by that release.
5. Reconcile from durable evidence, not from chat summaries or worker claims.
6. Keep a task unchecked when its implementation is only `IN_PROGRESS`, its review is `PENDING`, or its current decision is `NEEDS_CHANGES` or `BLOCKED`.
7. Preserve non-task workflow checkboxes until their own gates have actually passed.

Without a runtime fix or an explicit evidence-based reconciliation, these Goals may finish implementation but cannot cleanly finalize/archive. They do not necessarily execute forever; they are more likely to stop at verification, no-progress, or archive gates with a misleading unchecked-task error.

## Implemented Fix Contract

### 1. Add one authoritative Goal progress reconciler

Implement an idempotent service that runs under the existing task-graph mutation lease and computes effective task state from:

- exact active dispatch/completion records;
- current task review artifacts and structured findings;
- task graph status and retry generation;
- context-bound review cache provenance when reuse is valid.

The service must persist the corrected raw graph and then update derived human-facing progress.

### 2. Project accepted tasks into tasks.md by exact task id

Update only checklist lines that can be matched to one exact task id. Support existing forms such as:

```text
- [ ] task-7 ...
- [ ] `task-16-extract-project-home`: ...
```

Do not rewrite surrounding prose, reorder tasks, normalize unrelated formatting, or mark generic workflow checklist items from task status.

A task checkbox becomes checked only when its current generation is accepted:

- implementation status is `DONE` or `DONE_WITH_CONCERNS`; and
- the required task review is `APPROVED` or `APPROVED_WITH_CONCERNS`.

It remains or becomes unchecked for `PENDING`, `IN_PROGRESS`, `NEEDS_CONTEXT`, `BLOCKED`, `NEEDS_CHANGES`, expired/requeued work, or a review invalidated by a new implementation generation.

### 3. Reconcile at every relevant boundary

Run reconciliation after:

- dispatch and retry;
- worker completion;
- task review synchronization;
- review-cache restoration;
- Loop recovery or generation replacement;
- bootstrap/resume of an existing Goal;
- immediately before verification and finalize/archive preflight.

The operation must be safe to repeat after process crashes.

### 4. Make graph and checklist writes crash-consistent

Use the task-graph mutation lease, same-directory atomic replacement, and rollback or a durable projection generation marker. A crash must not leave a checked task paired with an older unaccepted graph generation.

Persist a projection record containing at least:

- source graph/evidence generation or hashes;
- projection timestamp;
- checked, unchecked, unmatched, and ambiguous task ids;
- whether raw graph review drift was repaired;
- warnings for duplicate or missing task ids in Markdown.

### 5. Fail closed on ambiguous Markdown

If two checklist lines map to the same task id, an accepted graph task is absent from `tasks.md`, or one checklist line ambiguously contains multiple task ids, do not guess. Report a structured blocker that identifies the lines and ids.

### 6. Repair legacy Goals automatically

OSpec 1.8.7 can resume a 1.8.6 Goal with stale checkboxes and stale raw review decisions. Bootstrap or the first safe Loop tick reconciles existing durable evidence without redispatching implementation or review work.

Do not require users to recreate the Goal, discard review history, or manually edit every checkbox.

### 7. Improve status output

Status should report the progress source and any drift, for example:

```text
accepted tasks: 16/32
tasks.md projected: 16/32
raw graph review repairs: 2
unmatched checklist ids: 0
projection state: current
```

When drift exists, report it before claiming that the Goal has made no progress.

## Acceptance Criteria

1. Completing and approving a task checks exactly its matching `tasks.md` item.
2. `DONE` with a pending review remains unchecked.
3. `NEEDS_CHANGES` after an earlier approval unchecks the current task generation.
4. `APPROVED_WITH_CONCERNS` checks the task while preserving the concern in review artifacts.
5. A retry or repair never checks a task until the repaired generation is independently accepted.
6. Backticked and plain task ids are both matched without rewriting unrelated Markdown.
7. Generic workflow checklist items are not inferred from task completion.
8. Review artifact `APPROVED` plus stale raw graph `PENDING` is reconciled to `APPROVED` atomically.
9. A later graph mutation cannot reintroduce an older review decision.
10. Reconciliation is idempotent across repeated sync, resume, and controller restart.
11. Duplicate, missing, or ambiguous task ids fail closed with line-specific diagnostics.
12. Existing 1.8.6 Goals are backfilled without task or review redispatch.
13. Archive preflight passes after all real task and workflow gates pass, without manual bulk checkbox editing.
14. Archive preflight still blocks genuinely pending, blocked, or unreviewed tasks.
15. Concurrent completion/review mutations cannot lose a newer checklist projection.
16. A crash between graph and Markdown writes is detected and repaired on the next resume.

## Regression Tests

Add service and end-to-end coverage for:

- dispatch, completion, review approval, `NEEDS_CHANGES`, repair, and re-approval transitions;
- `DONE_WITH_CONCERNS` plus `APPROVED_WITH_CONCERNS`;
- backticked long task ids and plain short task ids;
- mixed task and workflow checklists;
- two task ids with common prefixes such as `task-1` and `task-10`;
- duplicate or missing task checklist entries;
- review artifacts newer than raw graph decisions;
- a graph mutation after review sync that must preserve the newer decision;
- controller restart and reconciliation idempotency;
- atomic-write interruption and projection-generation recovery;
- legacy 1.8.6 fixtures with every checkbox unchecked but many approved tasks;
- archive preflight before and after reconciliation;
- no worker/reviewer redispatch caused solely by progress projection repair.

Replay both confirmed incident shapes:

- the 32-task Mobile Goal with accepted tasks 01-15 and 22, task-16 under repair, and stale task-03/task-15 raw review decisions;
- the 9-task Web Goal with six accepted tasks, task-8 awaiting review, and all 15 task/workflow checkboxes unchecked.

## Relevant Code Areas

- `src/services/TaskGraphExecutionService.ts`: dispatch, completion, review synchronization, graph mutation leases, and a new progress reconciler.
- `src/services/LoopService.ts`: effective progress fingerprint, resume/recovery boundaries, and drift diagnostics.
- `src/workflow/ArchiveGate.ts`: consume reconciled progress and distinguish stale projection from genuine incomplete work.
- `src/services/VerificationService.ts`: pre-verification reconciliation and checklist diagnostics.
- `src/commands/ExecuteCommand.ts` and status/progress commands: expose reconciliation results.
- `tests/services/task-graph-execution-service-characterization.test.mjs`: task/checklist projection and raw review drift.
- `tests/services/loop-controller-integration.test.mjs`: running Goal, restart, repair, and legacy backfill behavior.
- `tests/workflow/workflow-behavior-characterization.test.mjs`: archive gating after reconciliation.

## Release Guidance

Upgrade affected Goals to 1.8.7 or later before resuming them. The first bootstrap, resume, tick, sync, verify, or finalize boundary reconciles durable 1.8.6 evidence automatically. Inspect `artifacts/agents/progress-projection.json` if reconciliation reports a blocked duplicate, unknown, missing, or ambiguous task ID; do not bulk-check tasks manually.
