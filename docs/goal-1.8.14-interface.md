# Goal workflow interface changes in 1.8.14

OSpec 1.8.14 closes the multi-review lease-boundary and scheduler-ordering race exposed by a resumed cross-task repair Goal.

## Controller poll lease tolerance

`loop run --once` may renew an already-claimed `running` item when the poll arrives no more than 60 seconds after `leaseExpiresAt`. This is a controller observation tolerance equal to one bounded native wait, not an executor result grace period.

- `loop finalize` and legacy result submission still reject an expired lease unless a controller poll renewed it first.
- `loop recover`, `loop resume`, and an absent controller do not revive an orphan.
- `absoluteExpiresAt` is never extended.
- Polls later than the tolerance follow ordinary orphan recovery.

No persisted schema change is required. `controllerObservedAt` continues to record the successful renewal.

## Cross-task owner review barrier

`TaskGraphExecutionService.readCrossTaskRepairOwnerIds()` reads the declared owner IDs already frozen into retry provenance. Loop filters that set against completed tasks whose reviews are not approved.

While the set is non-empty:

- pending owner reviews are dispatched before new implementation or retryable worker actions;
- owner `NEEDS_CHANGES` decisions route through ordinary convergence-aware repair first;
- other conflict-safe pending reviewers may remain in the same review batch;
- malformed retry provenance blocks task-graph inspection instead of silently discarding the owner gate.

Once the owner reviews are approved, the existing implementation, retry, final-review, verification, and external-blocker behavior is unchanged.
