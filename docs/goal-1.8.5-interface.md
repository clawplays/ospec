# Goal workflow interface changes in 1.8.5

OSpec 1.8.5 keeps older Goal artifacts readable while tightening review freshness, native child liveness, implementation concurrency, and task boundaries.

## Task-review freshness

A task review is authoritative for its target-file snapshot. If that snapshot is unchanged, unrelated Git HEAD movement no longer invalidates the approval. If target files changed, the 1.8.4 downstream-attribution rules still apply. Final review remains stricter: both its complete target snapshot and Git HEAD must match.

## Bounded native child lifecycle

Every `runtimeAdapter.selected.nativeSubagent` adds:

```ts
interface RuntimeNativeSubagentContractV185 {
  pollIntervalMs: 30000;
  maxWaitMs: 60000;
  heartbeatBeforeDue: true;
  persistResultsIncrementally: true;
  retickAfterPoll: true;
}
```

These fields apply to Codex/GPT, Claude, Gemini, OpenCode, Cursor, and Copilot adapters. Codex/GPT use bounded `wait_agent`; Claude uses bounded background Task polling when available. A controller must never make one indefinite wait. It refreshes each live action before `heartbeatDueAt`, records every finished child immediately, and re-runs `loop run --once --json` after each poll.

`LoopActionItem` now includes its initial `heartbeatDueAt`, so the returned action and durable `pending.itemStates[]` expose the same first renewal deadline.

## Scheduling protection

When a parallel native harness does not report capacity, implementation batches are capped at two actions. This does not cap independent task-review batches, which continue to use graph conflicts, configured `maxParallel`, token funding, and any reported native capacity. `batchDiagnostics.deferredReasons` reports `unknown_implementation_capacity_cap` when this guard reduces a batch.

New task-graph templates use `contract_version: "1.8.5"`. A task with more than six `target_files` must be split or include a non-empty `scope_reason` explaining why one worker owns an atomic bounded scope. Older task graphs remain readable; broad legacy tasks receive plan-review guidance rather than a new schema requirement.

## Compatibility

All new runtime fields are additive. Missing native wait fields in serialized older artifacts remain readable. Existing `serial_reason`, repair-round, downstream review carry-forward, and final-review blocker rules are unchanged.
