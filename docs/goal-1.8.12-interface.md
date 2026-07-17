# Goal workflow interface changes in 1.8.12

OSpec 1.8.12 fixes three continuation failures reproduced from real Web, AIHub, and Mobile Goals without weakening review, workspace, or final evidence gates.

## Case-stable repair scope binding

Task repair now applies the same normalized comparison key to review snapshot paths and finding repair scopes. Mixed-case files and directory scopes such as `mainModel.ts`, `_parts/Overview.tsx`, and `_parts/Settings.tsx` bind to their reviewed snapshots while the original filesystem paths and snapshot hashes remain unchanged.

## Complete update provenance and non-destructive knowledge rebuilds

`IndexBuilder.writeWithSummary()` reports every generated archive-knowledge document, `docs/project/feature-index.md`, `SKILL.index.json`, and removed stale generated path. `ospec update` records exact hashes or missing markers for the complete set in `.ospec/update-provenance.json`.

Archive knowledge reconstruction merges durable target files, verification commands, project-document associations, and the archived document ledger from the current generated index and the tracked `HEAD` baseline. A later update therefore remains idempotent when legacy archive cleanup removed `artifacts/agents/task-graph.json` or review artifacts. Human-owned documents remain protected.

## Explicit external-acceptance deferral

The new command is:

```bash
ospec execute defer-blocker <task-id> [change-path] --reason "User authorized external acceptance at the final gate"
```

It accepts only a durable non-retryable `external_blocker` with completed dispatch evidence and a non-empty authorization reason. It writes a new blocker record with `deferredToFinalReview: true`.

The blocked task remains `BLOCKED`, stays unchecked in `tasks.md`, and remains excluded from completed-task counts. Tasks whose only unsatisfied dependency is that explicitly deferred external blocker may continue. Once automatable work is exhausted, Loop stops again until real evidence resolves the blocker. Final review, verification, finalization, and archive are never bypassed.

## Existing Goal recovery

- Web repair retries can be rebuilt from the existing task review and sidecar without changing repair counts.
- AIHub can rerun `ospec update`; tracked historical index data repairs the 1.8.11 knowledge rewrite and complete provenance removes the false workspace ownership block.
- Mobile may defer task-21 device acceptance only after explicit user authorization, continue task-23 and later dependency-safe implementation, and return to the real Android evidence before final closeout.

## Planning rule

New Goal plans must split implementation and automatic checks from device, credential, third-party, or manual acceptance when the external gate would otherwise block unrelated implementation. A deferral is a recovery mechanism, not a substitute for correct task decomposition.
