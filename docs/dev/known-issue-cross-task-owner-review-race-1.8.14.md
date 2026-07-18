# Known Issue: Cross-Task Owner Review Could Lose Its Action at the Lease Boundary

## Status

- State: fixed in 1.8.14
- First confirmed: 2026-07-18
- Affected release: 1.8.13
- Severity: high continuation and review-ordering impact
- Components: Loop executor leases, multi-item review batches, cross-task repair owner provenance, scheduler ordering

## Confirmed incident

A Mobile Goal correctly routed a task-27 finding through a validator owned by a completed evidence-tooling task. The repair invalidated both approvals, so iteration 145 emitted two independent reviewers. The task-27 reviewer finalized first. The owner reviewer remained active while the next controller tick reached the five-minute short-lease boundary.

Scheduling and lock overhead placed the observation just beyond that boundary. Loop expired the owner item before its native result arrived, then selected task-28 because ordinary dispatchable implementation was evaluated before completed-task review work. The owner reviewer subsequently wrote a valid `NEEDS_CHANGES` artifact, but iteration 146 had already replaced the pending action, so its original finalize command failed with `Unknown action item for the current pending action`.

The task-27 repair remained valid. The new owner finding was also real: the shared validator did not bind guard metadata to the canonical requested route. Downstream work therefore had to remain stopped until the owner was repaired and independently approved.

## 1.8.14 resolution

1. A successful `loop run --once` controller poll may renew an already-claimed running item for up to 60 seconds after its short lease boundary.
2. The tolerance matches one maximum bounded native wait. It does not accept a direct late executor result, revive an item after the tolerance, or move `absoluteExpiresAt`.
3. Retry provenance is scanned for declared `crossTaskScopeOwnerIds`. Malformed owner history fails closed.
4. Any completed recorded owner without an approved review becomes a scheduling barrier before new implementation and retryable worker work.
5. Other pending conflict-safe reviewers may still share the review batch, preserving review parallelism.
6. Once every owner is approved, normal dispatch and retry ordering resumes.

## Recovery of the confirmed Goal

After installing 1.8.14, non-forced recovery may expire the unclaimed task-28 action. The owner barrier then emits a fresh Loop-owned task-01 review instead of retrying task-28. Its valid finding routes through the ordinary task-review repair and independent re-review. Task-28 becomes eligible only after the owner approval is current. No historical artifact, checklist item, or external task-21 evidence needs manual rewriting.

## Regression coverage

- A poll 30 seconds past the short lease renews the same claimed reviewer and preserves the pending multi-item action.
- A poll more than 60 seconds past the short lease still expires and requeues a true orphan.
- Direct executor results after lease expiry remain rejected unless a valid controller poll renewed the claim first.
- In a three-task chain, the dependent and owner reviewers can run together; one sibling may finalize first without releasing the batch.
- An owner `NEEDS_CHANGES` result routes to owner repair before the already-dispatchable third task.
- The absolute action deadline remains unchanged across all controller renewals.
