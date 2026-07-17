# Loop Engineering - Integrated Execution-Model Contract (1.8.6)

This document is the implementation contract for the `ospec goal` loop. Source, tests, skills, and user documentation must preserve these boundaries.

## Contract 1 - One durable task-graph controller

`LoopService` is a plan-act-observe controller over the existing `TaskGraphExecutionService`. It does not create a second task system.

Each tick must:

1. enforce explicit pause/STOP state;
2. observe the prior pending action from durable task, review, or verification evidence;
3. enforce budgets and no-progress/comprehension guards before issuing more work;
4. block on required decisions, document/workspace readiness, and invalid task graphs;
5. select the next conflict-safe bounded batch from the task graph and explain every concurrency limit;
6. persist that batch as the pending controller action before it is executed.

Only the tick that creates a pending action may return it in `actions`. Later observation ticks expose it through `pending` with `actions: []`; executors must never relaunch an awaiting batch.

The allowed action kinds are `implementation`, `task-review`, `final-review`, `verification`, and legacy compatibility. Implementation and review actions must be created through `TaskGraphExecutionService` so dispatch records, review packages, worker status, usage ingestion, and archive gates remain authoritative.

## Contract 2 - Model-native execution only

| | Controller mode |
| --- | --- |
| Planner/observer | `LoopService.runOnce()` |
| Executor | `runtimeAdapter.selected.nativeSubagent` from the current model harness |
| Worker lifetime | One fresh native child per action item |
| Parallelism | The emitted dependency/file-safe batch, bounded by configured `maxParallel`, token funding, reported harness capacity, and the unknown-capacity implementation guard |
| Persistence | Task/review/evidence artifacts plus loop state and exact child ownership |
| Lifetime | Current interactive model session |

`ospec loop run --once` must never spawn an agent. The controlling model consumes its action batch through its own native API and records heartbeat/result evidence with the real child id. Runtime resolution must not probe Orca or PATH, construct agent CLI commands, launch external agent processes, or fall back into the controller context. Removed CLI execution entry points must fail before state mutation or process creation.

Every native adapter publishes one bounded wait contract. A native wait or poll must return control within `maxWaitMs` (60 seconds), use `pollIntervalMs` (30 seconds) as its normal polling cadence, refresh every live child before its action `heartbeatDueAt`, persist completed child results incrementally, and tick OSpec after every poll. The 60-second value bounds one controller poll, not the native child's runtime. Codex/GPT must use bounded `wait_agent`; Claude should use background Task polling when available; every other registered native primitive follows the same limit. One indefinite blocking wait violates the adapter contract.

Each action also has an immutable absolute runtime deadline: implementation defaults to 120 minutes, review to 60 minutes, and verification to 60 minutes. A heartbeat renews the short ownership lease but is capped by that deadline. Once authoritative evidence is complete, a separate five-minute default result grace takes precedence over heartbeat and action expiry so an already-finished child can report its result without duplicate dispatch. Limits are configurable through the four 1.8.6 runtime/grace fields.

## Contract 3 - Bounded action packets and fresh context

An emitted `LoopActionItem` contains only the routing and completion contract needed by one worker:

```ts
interface LoopActionItem {
  id: string;
  kind: 'implementation' | 'task-review' | 'final-review' | 'verification' | 'legacy';
  taskId: string | null;
  role: string;
  target: TaskWorkerToolTarget;
  packetPath: string;
  instructionPath: string;
  prompt: string;
  completionCommand: string;
  expectedEvidencePath: string;
  usageKey?: string;
  tokenAllowance?: number | null;
  heartbeatCommand?: string;
  heartbeatDueAt?: string;
  resultCommand?: string;
  runtimeAdapter?: RuntimeExecutionAdapterResolution;
  controllerProvenanceRequired?: boolean;
}
```

The prompt must be bounded by `efficiency.promptMaxChars`, direct the worker to the authoritative packet path, and avoid embedding the full goal. Implementation actions honor `efficiency.freshContext`; review actions always require a fresh independent read-only context. With `freshContext` enabled (the default), parallel items may share project-level runtime configuration but not conversation history.

## Contract 4 - Evidence-driven observation and feedback

Process exit is execution feedback, not workflow completion. A pending action settles only from its authoritative artifact:

- implementation: terminal task status in the task graph;
- task review: non-`PENDING` task-review decision;
- final review: non-`PENDING` final-review decision;
- verification: a passing `VerificationService` result backed by current verification evidence.

`DONE` and `DONE_WITH_CONCERNS` advance to task review. `BLOCKED` and `NEEDS_CONTEXT` feed a fresh retry dispatch with the latest bounded feedback. Task-review changes feed a retry of that task. Final-review `NEEDS_CHANGES` creates one grouped repair wave, followed by task review and final re-review. Final-review `BLOCKED` stops at a blocker-resolution gate. No loop path may silently downgrade or discard a reviewer finding.

Normal dispatch, retry, and review selection must use the same dependency/file-conflict rules. Runtime adapter availability and capacity are resolved before task-graph mutation. A multi-item retry or review is committed under one mutation lease only after every item passes preflight; unexpected failure restores the graph/session and removes newly-created artifacts. If a transactional batch cannot be formed, the controller emits one safe item and records why the remainder was deferred.

A process that exits without the expected durable evidence is a failed attempt, not a completed or perpetually pending action. It increments no-progress state and is released for a bounded fresh-context retry. Executor results may settle a unique non-empty subset of the current batch so completed siblings are persisted immediately; unknown, stale, anonymous, unclaimed, mismatched, or conflicting results are rejected. `loop finalize` is the preferred atomic success path: it validates exact authoritative evidence before committing the executor outcome. The legacy `loop result` path remains compatible.

## Contract 5 - Verification is the completion boundary

The final stop condition remains three-stage:

1. run the project's real test/build commands;
2. record the result with `ospec execute verify --status PASSED|FAILED --exit-code <code>`; PASSED requires code 0;
3. confirm the goal protocol with the non-exiting `VerificationService` used by the loop and the exiting `ospec verify` command used by the CLI/user workflow.

When protocol verification is incomplete, the loop emits a read-only verifier action that references `verification.md`, names configured deterministic commands when present, and requires new evidence. A post-review verifier must not edit implementation or tests. The loop reaches `done` only after task graph, task reviews, final review, evidence, and protocol verification pass.

## Contract 6 - Safety levels and hard stops

- **L1:** report-only; no implementation, review, repair, or verification action is emitted.
- **L2:** real actions are allowed, but required decisions block.
- **L3:** required decisions still block; every implementation/repair target path and verification command must match a non-empty allowlist. Canonical real-path boundaries reject traversal and symlink/junction escapes. Legacy command entries require an exact normalized command match. Structured policies (`command`, `argsPrefix`, `cwd`) validate an exact executable, argument vector, and working directory. Shell control syntax remains forbidden except for one parsed `cd <project-relative-path> && <command>` wrapper; absolute paths, traversal, appended arguments, cwd-changing options, and additional shell operators fail closed.

Allowlist configuration is secure replacement, never implicit append. `loop configure --allow-path/--allow-command/--allow-command-policy` prints the complete replacement diff. Task-graph-derived changes use `loop allowlist derive|check|apply`; apply is a compare-and-swap bound to the current allowlist, candidate, and task-graph hashes, and any permission expansion requires `--approve-expansion`. `loop allowlist clear` requires `--confirm`. Exact task paths are retained rather than collapsed into broader parent permissions.

The loop must also require approved design and implementation-plan reviews plus ready workspace evidence before executable L2/L3 work. It checks STOP/pause before observation and checks `maxIterations`, `expiresAt`, `budgetTokens`, `budgetMinutes`, no-progress limit, and comprehension-review interval after observing evidence but before issuing a new action. A guard stop or pause is persisted and surfaced through status; it is not converted into success. Explicit resume resets no-progress and comprehension counters but does not erase task/review/evidence history.

Task-review repair has a dedicated convergence threshold because status transitions can represent real workflow movement while still repeating the same implementation/review cycle. `maxTaskRepairRounds` defaults to two rounds per task. In continuous mode, later rounds continue when the stable structured finding-ID set changes. A stable ID may also continue when both its full structured fingerprint (severity, category, message, location, evidence, requirements, and repair scope) and the code snapshot inside the prior authorized repair scope changed. Wording-only change, code-only churn, exact fingerprint repetition, and finding-set cycles stop. Manual and worker-status retries do not consume this counter. Strict compatibility mode retains the absolute ceiling.

Grouped final-review repair has an independent convergence threshold. `maxFinalRepairRounds` defaults to two repair waves, counted from durable `repair-waves` records. It uses the same finding-fingerprint plus authorized repair-scope snapshot convergence rule as task repair. A `BLOCKED` final review is a gate that requires blocker resolution; only `NEEDS_CHANGES` may create a grouped repair wave. Corrupt, empty, unreadable, or unprovable findings and repair-wave history fail closed; a change with no repair-wave history starts at zero.

An approved task review remains fresh when its target-file snapshot is unchanged, even if unrelated commits move Git HEAD. Across target-file drift, it remains fresh only when every changed path is attributable to a completed transitive downstream task. The downstream review packet inherits each shared-file upstream expected result as a regression obligation. Unattributed drift fails closed. The whole-change final review always remains bound to both its exact target snapshot and Git HEAD.

Target snapshots distinguish files, directories, and missing paths. Directory targets use a recursively sorted tree/content hash and reject links, unsupported entries, and project-root escapes. Legacy snapshots that represented a real directory as missing are stale. Fully proven approved task reviews may be restored from an immutable cache only when task contract, graph contract, tree hash, verification commands, and regression obligations all match; non-approved or incomplete outcomes never enter that cache.

## Contract 7 - Document-review governance

Specialist design and plan reviews use an append-only, hash-chained ledger as the authority for dispatch identity, completed rounds, reservations, claims, outcomes, and guard accounting. Ledger read-modify-write runs under the task-graph mutation lease and validates the complete chain before use. Legacy Goals are imported once; corrupt or conflicting legacy evidence fails closed.

Default specialist thresholds are two completed rounds per stage, 30 minutes per stage, and two no-progress outcomes. Continuous mode permits later rounds while structured finding IDs converge; strict mode retains the bounded round, stage deadline, and exact authorized-extra-window behavior. Cache reuse, pending-dispatch reuse, deterministic preflight, heartbeat, lease reclaim, and crash recovery of the same dispatch do not consume a round. STOP, explicit pause, expiry, total Goal budgets, token reservations, no-progress, and evidence integrity prevent a new dispatch but do not prevent the current claimed reviewer from heartbeating or completing.

`--force` may replace a pending dispatch but cannot bypass a guard. One extra round requires a previously recorded required decision with `answeredBy=user`, created through the public decision API/CLI with `--document-review-stage`, `--review-context-hash`, `--review-round`, and `--review-approval-option`; only selection of that exact approval option authorizes the round, and consumption is recorded in the same ledger transaction as the extra dispatch. A missing authoritative usage report retains the conservative token reservation instead of counting as zero.

The review-context hash covers the stage, contract version, and all authoritative upstream documents. Every outcome is built in a temporary sibling directory and atomically renamed into `artifacts/reviews/history/document/<stage>/<dispatch-id>/` with a manifest, reviewed document, review, and structured findings. Only approved outcomes enter the approval cache. Every structured finding must have a non-empty unique ID before completion or snapshot publication. Before a convergence packet reads prior findings or the prior document, it validates the ledger-bound manifest hash and every snapshot file hash; missing or tampered history fails closed. A convergence packet includes every prior finding ID, resolution evidence, a bounded document diff, history paths, and current guard usage, while still requiring a complete review of the current document. Resolution sidecars require exact unique prior-ID coverage, one of `resolved|persists|superseded`, and non-empty evidence.

Deterministic preflight rejects mechanical blockers before creating or charging a specialist dispatch: missing documents, unresolved required decisions, stale design approval, invalid/cyclic task graphs, artifact collisions, documentation scope mismatch, missing verification, incomplete L3 permissions, and unsupported serialization. It may warn about unexplained serialization but never substitutes for an independent specialist approval.

## Contract 8 - Scheduling and observability

The schedule lifecycle is always `session-bound`. Controller mode exposes a `ControllerTickPlan`; it is not a runtime scheduler. The current IDE/model harness drives bounded `loop run --once --json` ticks and model-native subagents. CLI watch/agent execution is removed and cannot be used as a fallback.

`artifacts/loop/state.json` persists iteration, pending actions, start/update times, token usage, no-progress count, progress fingerprint, last feedback, and comprehension debt. `artifacts/loop/run-log.jsonl` is append-only at the logical API boundary and records action IDs/counts plus verification and executor feedback. `tick_metrics` records tick/gate duration, dispatch count, and repeated blockers; `document_review` records rounds, guard usage, immutable-cache hits, and reviewer duration. `ospec loop status --brief` is the packet-first controller view; `--json` exposes a stable machine-readable snapshot without rescanning JSONL.

Scheduling diagnostics distinguish registered parallel support, reported harness capacity (known or unknown), configured maximum, graph-safe candidates, token-funded candidates, and the effective emitted count. When a parallel native adapter does not report capacity, an implementation batch is conservatively capped at two actions; task-review parallelism remains bounded by the normal graph/configuration/token rules. A known harness capacity replaces the conservative unknown-capacity guard. An explicit `maxParallel` is never raised automatically. Conflict-safe selection considers rotated graph starts and keeps the largest discovered safe set while preserving graph order; it never bypasses a conflict or raises a limit. `maxParallel=1` should carry `maxParallelReason`. New 1.8.6 graphs require every `parallelizable:false` task to carry a non-empty `serial_reason`; older graphs remain readable. A 1.8.5+ task with more than six `target_files` must be split or carry a non-empty `scope_reason` that explains its atomic bounded ownership. Reasons document intent but never bypass dependency, path, or conflict checks. Task-graph-derived L3 paths are enforced as exact files, and command cwd is always exact; only explicitly manual directory allowlists retain subtree semantics.

Provider sidecars override executor-reported usage with the same usage key so one run is never counted twice. Unknown ordinary worker usage remains unknown; document-review reservations remain charged until authoritative usage arrives. Before mutating the task graph for a new parallel batch, the controller limits batch size from the remaining budget and persists a bounded reservation/allowance for every selected action.

Controller capability is a target-bound session report with `reportedAt` and `expiresAt`. Every issued action snapshots that target and `reportedAt`; heartbeat and result evidence are rejected after expiry or when a refreshed capability has a different session identity. Every lease exposes both `leaseExpiresAt` and a derived `heartbeatDueAt` near the halfway point. A valid owned native heartbeat or document-review claim/completion may extend a still-current session without changing `reportedAt`. A changed target/capability or an expired report creates a new identity, so old work must be recovered and reissued. `resume` and an expired heartbeat cannot reauthorize native execution. There is no non-native or current-controller fallback, and every result requires a prior heartbeat claim with the exact non-empty native child id.

Specialist design/plan reviews and Loop task/final reviews require a fresh model-native subagent. The dispatch binds to the target, controller capability session, and exact child executor. Completion validates the decision, current review-context hash, and structured findings immediately.

Logical model profiles resolve against the actual dispatch/review target, including an explicit launch target override. Artifacts distinguish requested/configured model, target/default configuration source, selection control (`enforced`, `advisory`, or `uncontrolled`), and provider-observed model. The model harness reports execution metadata through `loop configure --native-harness-metadata`; target and `controllerSessionReportedAt` must match the current capability, and a changed capability clears old metadata. `observedModel` is populated only from target/session-bound provider or usage evidence; OSpec never claims that an unenforceable model request was selected.

Named verification intent is durable in `artifacts/agents/verification-requirements.json`. Final verification and archive fail closed until every required entry is named by fresh PASSED verification evidence. User-choice records require explicit `answeredBy=user` provenance for new selections; legacy records remain readable.

Controller ticks and executor-result writes use a cross-process lease. External CLI execution has a default timeout, terminates the worker process tree on timeout, and bounds captured stdout/stderr so a noisy agent cannot consume unbounded controller memory.

## Contract 9 - Compatibility

- `ospec new` and the classic change workflow do not create or require loop artifacts.
- Existing loop v1 JSON is normalized with v2 defaults when read; migration is additive.
- A goal without a task graph uses legacy compatibility behavior rather than crashing, but the task graph is required for integrated batching, review routing, and repair.
- `ospec execute launch` keeps `primitive='subagent'` as its compatibility default.
- Project paths continue to flow through the existing layout resolution; loop artifacts remain relative to the resolved active change.
- Runtime adapter selection is native-only and fail-closed. The capability target, interactive flag, native-subagent support, reported time, and expiry must all be valid for the current session.
- 1.8.6 absolute deadlines, evidence-result grace, directory snapshots, review-context cache, and finalize fields are additive. 1.8.5 and older artifacts remain readable; legacy directory snapshots fail stale rather than being trusted, and missing capacity stays explicitly unknown.
