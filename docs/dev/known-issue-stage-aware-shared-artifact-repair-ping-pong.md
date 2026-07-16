# Known Issue: Stage-Blind Repairs Can Ping-Pong a Shared Artifact

## Status

- State: open
- First confirmed: 2026-07-16
- Affected release: 1.8.6 and earlier shared-target review/repair routing
- Severity: high for completion; repeated valid-looking repairs can prevent a Goal from converging
- Component: review invalidation, stale finding eligibility, transitive downstream attribution, and shared artifact ownership

## Summary

Two tasks in a valid dependency chain can intentionally write the same durable artifact at different workflow stages. An upstream source task may establish a record as `ready_for_implementation`; a downstream implementation/acceptance task may later enrich that same record to `accepted` with comparison evidence.

OSpec can currently treat the downstream enrichment as a regression against the upstream task's literal expected result. A retained upstream `NEEDS_CHANGES` finding can then dispatch a repair after the downstream task has completed and downgrade the artifact back to its source-stage form. Re-reviewing the downstream task requires restoring the acceptance fields, which can reactivate the upstream repair again.

Each individual review can be internally correct for its isolated packet while the Goal as a whole oscillates:

```text
source task:     ready_for_implementation, no comparison claims
downstream task: accepted, comparison evidence present
source repair:   remove downstream acceptance metadata
downstream repair: restore downstream acceptance metadata
repeat
```

This is not solved by serial execution. Serialization prevents concurrent writes, but it does not establish which stage owns the final value or invalidate stale repair intent.

## Confirmed Incident

The issue was observed in the active 1.8.6 Goal:

```text
Goal: implement-mobile-figma-derived-workflows
Path: D:\OPMProjs\ompv4\.ospec\changes\active\implement-mobile-figma-derived-workflows
Shared artifact: artifacts/figma/lineage/overview.json
```

The relevant dependency chain is transitive and explicit:

```text
task-03-lineage-core
  -> task-13-lineage-source-index
    -> task-15-extract-overview
```

Both task-03 and task-15 list `artifacts/figma/lineage/overview.json` in `target_files`.

Their stage contracts differ:

- task-03 requires source nodes, context, source screenshots, tokens/assets/states, and `ready_for_implementation`.
- task-15 requires implemented Phone/Pad overview behavior, comparison screenshots, and an accepted comparison review state.

This progression is intentional. The approved task-13 review already described the correct temporal rule: its frozen source snapshot contained 52 `ready_for_implementation` records, while the current downstream overview fragment had advanced to `accepted`; that downstream time difference did not invalidate task-13, and final accepted canonical state belongs to task-31 aggregation.

### Observed oscillation

An earlier task-03 repair recorded this result:

```text
dispatch: dispatch-2026-07-15T18-29-28-931Z-task-03-lineage-core-3c076f85
summary: restore overview Phone/Pad to source-stage ready_for_implementation and remove comparison/1:1 acceptance fields
```

After downstream task-15 work restored acceptance behavior, the retained task-03 repair path ran again:

```text
2026-07-16 14:22 +08:00  task-15 review APPROVED
2026-07-16 14:23 +08:00  task-03 repair action 96 dispatched
2026-07-16 14:32 +08:00  task-03 repair completed after removing comparison/1:1 fields
2026-07-16 14:43 +08:00  task-03 review APPROVED at ready_for_implementation
2026-07-16 14:43 +08:00  task-15 regression re-review dispatched
2026-07-16 14:59 +08:00  task-15 re-review NEEDS_CHANGES
```

The task-15 finding is the exact inverse of the completed task-03 repair:

```text
F-001 high: overview Phone/Pad regressed to ready_for_implementation,
comparison screenshots are no longer bound, and comparison validation requires accepted.
```

The source-stage validator passes after task-03 repair, while the comparison-stage validator fails. Restoring task-15 acceptance would make the comparison-stage validator pass but can once again make a literal task-03 review regard the downstream fields as unsupported source claims.

This is a convergence failure. Raising repair-round limits only allows more oscillation and is not a solution.

### Final outcome of the observed cycle

The live 1.8.6 Goal did eventually converge after one more task-15 repair:

```text
2026-07-16 15:02 +08:00  task-15 repair action 99 dispatched
2026-07-16 15:11 +08:00  source and comparison validation evidence completed
2026-07-16 15:11 +08:00  original executor finalized successfully
2026-07-16 15:12 +08:00  task-03 remained DONE:APPROVED
2026-07-16 15:12 +08:00  task-15 returned to DONE:APPROVED
2026-07-16 15:12 +08:00  Loop advanced to task-16 instead of repairing task-03 again
```

Task-15's current review artifact was restored from the iteration-95 approved review, with its original dispatch id, target snapshot hash, reviewer executor, and completion timestamps intact. A matching entry exists in `artifacts/reviews/cache/task/task-15-extract-overview/`. This is consistent with the 1.8.6 context-bound approval cache recognizing that the repair restored the exact previously approved context; it did not fabricate a new review or accept the worker's self-review.

The recovery prevented an infinite cycle in this exact case, but it depended on returning to a cached approved snapshot. A repair that produces an equivalent but not byte/context-identical final state, or a Goal without the earlier cache entry, can still oscillate. Stale repair dispatch also consumed a full repair and re-review cycle before the cache could recover.

The task run log moved directly from implementation action 99 to task-16 action 100 and did not emit an explicit task-review cache event comparable to document review's `reviewCacheHit`, `reviewCacheSource`, and duration fields. Operators must infer the safe reuse from the old review provenance and cache file. This observability gap makes correct cache reuse look like an unsafe skipped independent review.

## Root Cause

The current runtime has path and dependency attribution but no durable stage ownership for values inside a shared artifact.

Several mechanisms interact:

1. Review findings are bound to a task snapshot, but repair eligibility can survive later transitive downstream edits to the same path.
2. A repair packet restates the isolated task expected result without declaring the allowed downstream terminal state.
3. Review invalidation can treat a monotonic downstream enrichment as an upstream regression.
4. `target_files` expresses path-level write scope, not field-level or stage-level ownership.
5. The controller has no pre-dispatch contradiction check for a pending repair whose requested output would violate an already completed descendant contract.

The task graph is serially ordered through task-13, so this is not simply a missing dependency edge. The missing concept is that source-stage assertions are evaluated against a frozen stage snapshot while the live artifact is allowed to advance monotonically under a descendant owner.

## User Impact

- A Goal can consume repair rounds without approaching completion.
- Review decisions alternate between `APPROVED` and `NEEDS_CHANGES` on the same file.
- Users are asked to raise `maxTaskRepairRounds` even though additional rounds cannot resolve the contradiction.
- Correct downstream evidence can be deleted by a stale upstream repair.
- Final validation alternates between source-stage success and comparison-stage success.
- Runtime and reviewer activity appears productive, so the loop can run for hours before the cycle is recognized.

## Current Recovery For An Active Goal

Stop automatic repair before authorizing more rounds. Inspect the dependency chain and choose the final stage owner.

For the confirmed Goal:

1. Preserve task-03's approved source-stage result as a frozen historical contract.
2. Let task-15 restore accepted Phone/Pad comparison metadata while retaining task-03's canonical node, context, and source screenshot fields.
3. Treat the accepted record as a monotonic downstream enrichment, not a task-03 regression.
4. Supersede the old task-03 repair finding for the live artifact generation.
5. Re-review task-15 once, then continue to task-31 final visual aggregation.
6. Do not dispatch another task-03 repair merely because the live `review_status` is now `accepted` rather than `ready_for_implementation`.

If the schema cannot represent source provenance and comparison acceptance without overloading one status field, split the artifacts before continuing: keep immutable source lineage in the task-03-owned artifact and comparison/acceptance state in a task-15- or task-31-owned artifact.

Do not solve the incident by deleting review history, raising repair limits, ignoring failed comparison validation, or accepting both contradictory findings as simultaneously actionable.

## Required Fix

### 1. Revalidate a finding before repair dispatch

Before dispatching any task-review repair, compare the finding's review generation and target snapshot with the current artifact lineage. If a completed transitive downstream task changed a repair path after the finding was created, the old finding cannot be executed automatically.

The controller must either:

- prove the downstream change still violates the upstream invariant and issue a new context-aware review;
- classify the change as allowed downstream enrichment and supersede the stale finding; or
- stop at a contract-conflict gate for explicit resolution.

### 2. Model stage-aware artifact ownership

Extend task contracts with an artifact-stage claim, for example:

```json
{
  "path": "artifacts/figma/lineage/overview.json",
  "stage": "source",
  "mode": "establish",
  "terminal_fields": ["source_node_id", "source_context", "source_screenshot"]
}
```

and for the descendant:

```json
{
  "path": "artifacts/figma/lineage/overview.json",
  "stage": "comparison",
  "mode": "enrich",
  "requires_stage": "source",
  "terminal_fields": ["comparison_screenshots", "review_status", "review_conclusion"]
}
```

A downstream `enrich` operation may advance permitted fields without invalidating the frozen upstream stage. It must not alter upstream-owned provenance fields.

### 3. Detect contradictory repair intent

Before mutation, build the requested postcondition for every pending repair. If an upstream repair would remove or downgrade fields required by a completed descendant, fail closed with a diagnostic naming:

- upstream and downstream task ids;
- shared path and fields;
- finding/review generations;
- conflicting expected values;
- dependency path;
- proposed recovery owner.

Use a stop reason such as `stage_contract_conflict`, not `task_review_repair_limit`.

### 4. Preserve frozen stage approvals

An upstream approval should remain valid when every changed path is attributable to a completed transitive downstream task and upstream-owned invariant fields remain unchanged. Evaluation must compare the upstream contract against its frozen stage snapshot plus declared invariant fields, not require the live artifact to equal the earlier intermediate state byte for byte.

Genuine changes to canonical source node, source screenshot, source context, schema, or other upstream invariants must still invalidate the upstream approval.

### 5. Transfer context into downstream review

The downstream review packet should state both:

- upstream fields that must remain unchanged; and
- downstream fields that are expected to advance.

Wording such as "upstream regression obligation" is insufficient if the reviewer can interpret `accepted` as violating an upstream literal `ready_for_implementation` result. The packet needs the stage transition contract.

### 6. Record task-review cache reuse explicitly

When an approved task review is restored from a context-bound cache, append a durable run-log event containing:

- task id and current iteration;
- cache hit and source;
- cached review dispatch and reviewer provenance;
- cached and current target/context hashes;
- the equality checks that authorized reuse;
- upstream regression obligations included in the context key.

Status output should distinguish `APPROVED (fresh review)` from `APPROVED (context-bound cache reuse)` without changing the decision semantics.

## Acceptance Criteria

1. A source task can approve a frozen `ready_for_implementation` stage and a transitive descendant can later advance the live record to `accepted` without invalidating that approval.
2. The descendant cannot modify canonical source provenance fields without invalidating the source approval.
3. A stale upstream finding cannot dispatch a repair after a completed descendant changed the same path unless a fresh context-aware review confirms it remains actionable.
4. The controller detects an upstream repair that would remove required descendant fields and stops with `stage_contract_conflict` before mutation.
5. Source and comparison validators can both pass against the intended final artifact model, or the model is split into separately owned artifacts.
6. Review packets distinguish frozen stage state, invariant fields, and expected downstream enrichment.
7. Repair-round counters do not increase for a detected stage conflict.
8. Restarting the controller preserves superseded-finding and stage-ownership decisions durably.
9. Existing path-conflict serialization and shared-file regression obligations continue to work.
10. Genuine downstream regressions of upstream invariant fields still force independent re-review.
11. Legacy task graphs without stage claims remain readable and fail with an actionable ambiguity diagnostic when contradictory shared-file postconditions are detected.
12. The confirmed task-03/task-15 scenario converges after one task-15 repair and review without another task-03 repair.
13. Exact task-review cache reuse emits a durable event with source review provenance and context hashes.
14. A near-match or context change cannot reuse the cache and must dispatch an independent review.

## Regression Tests

Add controller and task-graph tests for:

- source `ready_for_implementation` followed by downstream `accepted` enrichment;
- a stale source finding whose path changed under a completed transitive descendant;
- an upstream repair attempting to delete descendant comparison fields;
- a downstream edit that changes only allowed enrichment fields;
- a downstream edit that changes a canonical source node and must invalidate upstream approval;
- restart after a finding is superseded;
- two validators for source and comparison stages;
- legacy graphs with path overlap but no stage metadata;
- interaction with task repair limits so contract conflicts do not consume rounds;
- final aggregation that owns terminal accepted state after multiple intermediate tasks.
- exact approved snapshot restoration with an observable task-review cache hit;
- target, contract, or upstream-obligation mismatch that rejects cache reuse.

## Relevant Code Areas

- `src/services/LoopService.ts`: `NEEDS_CHANGES` repair eligibility, stale finding checks, gate reasons, and repair action issuance.
- `src/services/TaskGraphExecutionService.ts`: transitive dependency attribution, review invalidation, shared-target contracts, retry records, and review packages.
- task graph schema and validators for stage-aware artifact claims.
- `tests/services/loop-controller-integration.test.mjs`: convergence and stale repair routing.
- `tests/services/task-graph-execution-service-characterization.test.mjs`: dependency, shared path, and compatibility behavior.
- generated review/repair packets that communicate stage transitions.

## Release Guidance

Treat this as a runtime correctness fix requiring a new release. A documentation-only warning is not sufficient because the current controller can automatically mutate a valid downstream artifact. Ship with migration-compatible schema handling, focused convergence tests, full Loop regression, generated protocol updates, and a live replay of the confirmed source-to-accepted sequence.
