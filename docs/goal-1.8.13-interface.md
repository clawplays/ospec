# Goal workflow interface changes in 1.8.13

OSpec 1.8.13 resolves the scheduler and verification issues exposed after three real Goals resumed successfully on 1.8.12.

## Prerequisite review ordering

Retryable worker failures no longer bypass dependency review gates. Loop collects `waiting_for_task_review:<task-id>` reasons from both ordinary review repairs and retryable blocked tasks, emits fresh Loop-owned prerequisite review actions first, and retries the dependent worker only after authoritative reviewer executor provenance exists.

## Cross-task repair routing

Structured findings may name repair paths outside the reviewed task only when every additional path overlaps a target declared by another completed task. Unknown paths, unfinished owners, absolute paths, traversal, and unbound legacy reviews remain blocked.

The retry record adds:

- `crossTaskScopeOwnerIds`
- `repairScopeSnapshots`
- the SHA-256 `repairScopeSnapshotHash` for the complete multi-owner scope

The repair worker remains limited to that frozen scope. When it changes another owner's target, normal snapshot freshness invalidates the stale approval and Loop emits a fresh independent owner review.

## Controller-observed lease renewal

Explicit executor heartbeat remains supported and is still required to claim an action. After claim, each successful bounded `loop run --once` poll records `controllerObservedAt` and renews the short lease while preserving `absoluteExpiresAt`. A controller that stops polling cannot keep an orphan alive, and no poll can extend the absolute implementation, review, or verification deadline.

## Broad Docker verification warning

Worker packets identify an unscoped full `docker compose up --build` or `docker-compose up --build`. The warning requires inspection of repository release guidance and explicit service names when the task does not require every service. OSpec does not silently rewrite project commands or pretend a narrower verification passed.
