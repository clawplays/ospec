# Goal workflow interface changes in 1.8.3

This document lists the public CLI and serialized-artifact additions introduced by OSpec 1.8.3. Existing 1.8.2 Goal artifacts remain readable; new fields are additive unless noted.

## Frontend and API consumer impact

There is no mandatory migration for consumers that already read 1.8.2 Goal artifacts: legacy task graphs, Loop config/state, and runtime-adapter candidates remain readable. Consumers with strict JSON schema validation should allow the additive fields documented below.

Frontends that expose Goal progress should adopt the following 1.8.3 fields:

- Use `batchDiagnostics.effectiveEmitted` for the number of actions actually issued. Do not infer it from `maxParallel`.
- When `adapterCapacityKnown` is `false`, render capacity as unknown rather than `0`, `1`, or unlimited.
- Show `configuredMaxParallelReason` and task `serial_reason` when execution is deliberately restricted.
- Schedule controller heartbeats from `heartbeatDueAt`; keep `leaseExpiresAt` as the hard-expiry indicator.
- Show document-review rounds and remaining guards from `reviewGovernance`. A no-progress stop requires authoritative document changes; an exhausted round guard requires an exact user-bound extra-round decision. Stage time and token budgets remain hard limits.
- Treat requested, configured, and observed models as separate values. Only `observedModel` with `observationEvidence` is execution evidence.
- Use allowlist `derive` followed by CAS `apply`; never build an expansion request from stale hashes or assume repeated `configure` calls append permissions.

`ospec loop status [change] --json` has this stable top-level envelope:

```ts
interface LoopStatusJsonV183 {
  version: '1.8.3';
  changePath: string;
  config: LoopConfig;
  state: LoopState;
  reviewGovernance: TaskDocumentReviewGovernanceSummary;
}
```

The repository contains no browser frontend, so no frontend source change is required here. The fields above are the handoff contract for any external dashboard or IDE integration.

## CLI additions

```bash
ospec loop status [change] --brief
ospec loop status [change] --json
ospec loop configure [change] --max-parallel N --max-parallel-reason "..."
ospec loop configure [change] --native-harness-metadata '<session-bound-json>'

ospec loop allowlist derive [change] --from-task-graph [--json]
ospec loop allowlist check [change] --from-task-graph [--json]
ospec loop allowlist apply [change] --from-task-graph \
  --expected-current-hash H \
  --expected-candidate-hash H \
  [--expected-task-graph-hash H] \
  [--approve-expansion] [--json]
ospec loop allowlist clear [change] --confirm

ospec execute doc-review [change] --stage design|plan \
  --complete-executor <child-id> [--usage-file usage.json]

ospec execute decision [change] --id allow-review-round \
  --question "Allow one extra review round?" \
  --option allow:Allow:impact --option stop:Stop:impact --required \
  --document-review-stage design|plan \
  --review-context-hash <sha256> --review-round <number> \
  --review-approval-option allow
ospec execute decision [change] --id allow-review-round \
  --select allow --answered-by user
```

The legacy `loop configure --allow-path`, `--allow-command`, and `--allow-command-policy` flags still replace their complete selected list. They now print the added/removed diff. They do not append.

`LoopAllowlistMetadata` retains legacy `source` and adds `pathSource` and `commandSource`. Legacy artifacts use `source` as the fallback for both groups. Changing only commands leaves `pathSource` unchanged, so exact task-graph path semantics cannot be widened by an unrelated command update. Command cwd values are resolved through the real filesystem boundary during derivation and L3 enforcement; symlink or junction escapes fail closed.

## Allowlist JSON

`derive`, `check`, and `apply` return:

```ts
interface LoopAllowlistDerivation {
  source: 'task-graph';
  current: LoopAllowlist;
  candidate: LoopAllowlist;
  currentHash: string;
  candidateHash: string;
  taskGraphHash: string;
  diff: {
    addedPaths: string[];
    removedPaths: string[];
    addedCommands: Array<string | LoopCommandPolicy>;
    removedCommands: Array<string | LoopCommandPolicy>;
  };
  hasExpansion: boolean;
  matchesCurrent: boolean;
  issues: string[];
  canApply: boolean;
}
```

Apply is compare-and-swap. A stale current, candidate, or optional task-graph hash fails without mutation. Added permissions require `--approve-expansion`; reductions still require the current/candidate hashes.

## Loop status and tick JSON

`LoopTickResult` adds nullable `batchDiagnostics` and `LoopState` persists the latest diagnostics:

```ts
interface LoopBatchDiagnostics {
  configuredMaxParallel: number;
  configuredMaxParallelReason: string | null;
  graphSafeCandidates: number;
  tokenFundedLimit: number;
  adapterSupportsParallel: boolean;
  adapterCapacity: number | null;
  adapterCapacityKnown: boolean;
  effectiveEmitted: number;
  deferredReasons: string[];
}
```

Pending action item state adds `heartbeatDueAt`. `leaseExpiresAt` remains the hard expiry; controllers should heartbeat at or before the due time.

## Runtime adapter JSON

`RuntimeExecutionAdapterCandidate` keeps the 1.8.2 fields and adds optional metadata:

```ts
interface RuntimeExecutionModelSelectionMetadata {
  requestedModel: string | null;
  configuredModel: string | null;
  observedModel: string | null;
  configurationSource: 'target' | 'default' | 'harness-default';
  selectionControl: 'enforced' | 'advisory' | 'uncontrolled';
  observationEvidence: {
    source: 'provider' | 'usage';
    evidenceId: string;
  } | null;
}

interface RuntimeExecutionParallelismMetadata {
  supportsParallel: boolean;
  capacity: number | null;
  capacityKnown: boolean;
  source: 'harness-report' | 'registered-contract' | 'unavailable';
}
```

`observedModel` is never inferred from configuration. It requires current target/session-bound provider or usage evidence. Parallel support without a capacity report leaves `capacity=null` and `capacityKnown=false`.

The active model harness reports these values with `loop configure --native-harness-metadata <json>`. The JSON `target` and `controllerSessionReportedAt` must exactly match the current Loop capability or configuration fails. Changing the capability target/session clears old metadata. Use `none` to clear it explicitly.

## Task graph additions

`serial_reason` is optional when reading legacy task graphs. Task graphs generated by 1.8.3 should provide it whenever `parallelizable` is false. The reason is diagnostic only and cannot override dependency, target-file, or conflict checks.

## Document-review artifacts

New Goals persist `artifacts/agents/document-review-ledger.json` and immutable history under:

```text
artifacts/reviews/history/document/<stage>/<dispatch-id>/
  manifest.json
  document.md
  review.md
  findings.json
```

Review records add `reviewContextHash`, round/reservation fields, convergence data, and `heartbeatDueAt`. From convergence round two onward, the findings sidecar must include one `prior_finding_resolutions` entry for every prior finding ID, with status `resolved`, `persists`, or `superseded` and concrete evidence.

Every structured finding must have a non-empty unique `id`. Before the next convergence round reads prior findings, OSpec validates the ledger-bound snapshot manifest and all file hashes; missing or tampered history blocks dispatch. An extra-round decision stores `approvalOptionId`; selecting any other option, including `stop`, does not authorize dispatch, and one approval decision can be consumed only once.

Default specialist limits are two completed rounds and 30 minutes per design/plan stage. Existing claimed work may still heartbeat and complete after a guard trips; the guard prevents only a new dispatch. `--force` does not bypass guards. No-progress state is bound to the current review-context hash and resets after authoritative input changes. Stage time remains measured from the first stage event so document edits cannot bypass the hard deadline.

The status API exposes review governance without requiring consumers to parse the ledger:

```ts
interface TaskDocumentReviewGovernanceSummary {
  version: '1.0';
  contractVersion: string;
  ledgerPath: string;
  stages: Record<'design' | 'plan', {
    completedRounds: number;
    activeRound: number | null;
    elapsedMs: number;
    tokenReservation: number;
    tokenUsage: number | null;
    cacheHits: number;
    guardLimits: {
      maxCompletedRounds: number;
      maxMinutes: number;
      budgetTokens: number | null;
      noProgressLimit: number;
    };
    guardRemaining: {
      rounds: number;
      minutes: number;
      tokens: number | null;
    };
    currentDispatch: {
      id: string;
      heartbeatDueAt: string | null;
      leaseExpiresAt: string | null;
    } | null;
    lastDecision: string | null;
    noProgressCount: number;
  }>;
}
```
