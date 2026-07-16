# Goal workflow interface changes in 1.8.6

OSpec 1.8.6 keeps older Goal artifacts readable while preventing completed or long-running native actions from being mistaken for stalled controller work.

## Polling is not an action timeout

The 60-second native wait limit is a controller polling boundary, not a child runtime limit. Codex/GPT `wait_agent`, Claude Task polling, and other native waits return control at least once per minute so the controller can persist completed siblings, refresh live heartbeats, and re-tick OSpec. A child may continue across many polls.

Each action now has an absolute runtime deadline in addition to its renewable heartbeat lease. Defaults are 120 minutes for implementation, 60 minutes for task/final review, and 60 minutes for verification. Configure them with:

```bash
ospec loop configure <goal> \
  --implementation-max-runtime-minutes 120 \
  --review-max-runtime-minutes 60 \
  --verification-max-runtime-minutes 60 \
  --evidence-result-grace-minutes 5
```

A heartbeat may renew the short lease but cannot extend the absolute action deadline. Expiry is item-scoped, so a stalled child does not discard completed siblings.

## Evidence and executor result are committed together

Emitted actions use `ospec loop finalize` as their `resultCommand`. A successful finalize first validates the authoritative durable evidence for that exact action and executor, then records the executor result. Failed and timed-out results remain recordable without successful evidence so retry diagnostics are not lost. The legacy `ospec loop result` command remains readable and supported.

If authoritative evidence arrives before the executor result, the controller records `evidenceReadyAt` and allows a configurable result grace period. Heartbeat and absolute runtime expiry do not preempt that already-started grace period. If no result arrives, only that item is released with `evidence_complete_executor_result_missing`.

## Review freshness and reuse

Task-review target snapshots now distinguish files, directories, and missing paths. Directory snapshots hash the sorted recursive tree, including nested file content and empty directories. Symbolic links, junctions, unsupported entries, and project-root escapes fail closed. A legacy snapshot that treated a real directory as a missing file is stale and receives a fresh review.

Fully proven `APPROVED` and `APPROVED_WITH_CONCERNS` task reviews enter an immutable context cache. The context binds the task contract, graph contract, target tree hash, verification commands, and upstream regression obligations. Accidental pending-state rewrites can reuse that approval only while the complete context still matches. `NEEDS_CHANGES`, incomplete provenance, and changed task/tree/regression context are never restored.

## Scheduling and task graph contract

Conflict-safe selection now evaluates rotated graph starts and keeps the largest discovered safe batch, preserving original graph order in the emitted result. It does not raise `maxParallel`, exceed reported capacity, or bypass dependency/file-conflict checks.

New templates use `contract_version: "1.8.6"`. Every `parallelizable: false` task in a 1.8.6+ graph requires a non-empty `serial_reason`; 1.8.5 and older graphs remain readable. The 1.8.5 `scope_reason` rule for tasks with more than six targets remains in force.
