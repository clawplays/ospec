# Loop Engineering - Integrated Execution-Model Contract (1.8.2)

This document is the implementation contract for the `ospec goal` loop. Source, tests, skills, and user documentation must preserve these boundaries.

## Contract 1 - One durable task-graph controller

`LoopService` is a plan-act-observe controller over the existing `TaskGraphExecutionService`. It does not create a second task system.

Each tick must:

1. enforce explicit pause/STOP state;
2. observe the prior pending action from durable task, review, or verification evidence;
3. enforce budgets and no-progress/comprehension guards before issuing more work;
4. block on required decisions, document/workspace readiness, and invalid task graphs;
5. select the next bounded batch from the task graph;
6. persist that batch as the pending controller action before it is executed.

Only the tick that creates a pending action may return it in `actions`. Later observation ticks expose it through `pending` with `actions: []`; executors must never relaunch an awaiting batch.

The allowed action kinds are `implementation`, `task-review`, `final-review`, `verification`, and legacy compatibility. Implementation and review actions must be created through `TaskGraphExecutionService` so dispatch records, review packages, worker status, usage ingestion, and archive gates remain authoritative.

## Contract 2 - Model-native execution only

| | Controller mode |
| --- | --- |
| Planner/observer | `LoopService.runOnce()` |
| Executor | `runtimeAdapter.selected.nativeSubagent` from the current model harness |
| Worker lifetime | One fresh native child per action item |
| Parallelism | The emitted dependency/file-safe batch, bounded by `maxParallel` |
| Persistence | Task/review/evidence artifacts plus loop state and exact child ownership |
| Lifetime | Current interactive model session |

`ospec loop run --once` must never spawn an agent. The controlling model consumes its action batch through its own native API and records heartbeat/result evidence with the real child id. Runtime resolution must not probe Orca or PATH, construct agent CLI commands, launch external agent processes, or fall back into the controller context. Removed CLI execution entry points must fail before state mutation or process creation.

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

`DONE` and `DONE_WITH_CONCERNS` advance to task review. `BLOCKED` and `NEEDS_CONTEXT` feed a fresh retry dispatch with the latest bounded feedback. Task-review changes feed a retry of that task. Final-review `NEEDS_CHANGES` or `BLOCKED` creates one grouped repair wave, followed by task review and final re-review. No loop path may silently downgrade or discard a reviewer finding.

A process that exits without the expected durable evidence is a failed attempt, not a completed or perpetually pending action. It increments no-progress state and is released for a bounded fresh-context retry. Executor results may settle a unique non-empty subset of the current batch so completed siblings are persisted immediately; unknown, stale, anonymous, unclaimed, mismatched, or conflicting results are rejected.

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

The loop must also require approved design and implementation-plan reviews plus ready workspace evidence before executable L2/L3 work. It checks STOP/pause before observation and checks `maxIterations`, `expiresAt`, `budgetTokens`, `budgetMinutes`, no-progress limit, and comprehension-review interval after observing evidence but before issuing a new action. A guard stop or pause is persisted and surfaced through status; it is not converted into success. Explicit resume resets no-progress and comprehension counters but does not erase task/review/evidence history.

## Contract 7 - Scheduling and observability

The schedule lifecycle is always `session-bound`. Controller mode exposes a `ControllerTickPlan`; it is not a runtime scheduler. CLI watch is the runtime scheduler/executor and must stop cleanly on Ctrl-C.

`artifacts/loop/state.json` persists iteration, pending actions, start/update times, token usage, no-progress count, progress fingerprint, last feedback, and comprehension debt. `artifacts/loop/run-log.jsonl` is append-only at the logical API boundary and records action IDs/counts plus verification and executor feedback. `tick_metrics` records tick/gate duration, dispatch count, and repeated blockers; `document_review` records dispatches, immutable-cache hits, and reviewer duration. `ospec loop status` surfaces configuration, guards, budgets, pending item counts, and accumulated metrics.

Provider sidecars override executor-reported usage with the same usage key so one run is never counted twice. Unknown usage remains unknown/zero; it must not be estimated from prompt length. Before mutating the task graph for a new parallel batch, the controller limits batch size from the remaining budget and persists a bounded reservation/allowance for every selected action.

Controller capability is a target-bound session report with `reportedAt` and `expiresAt`. Every issued action snapshots that target and `reportedAt`; heartbeat and result evidence are rejected after expiry or when a refreshed capability has a different session identity. A valid owned native heartbeat or document-review claim/completion may extend a still-current session without changing `reportedAt`. A changed target/capability or an expired report creates a new identity, so old work must be recovered and reissued. `resume` and an expired heartbeat cannot reauthorize native execution. There is no non-native or current-controller fallback, and every result requires a prior heartbeat claim with the exact non-empty native child id.

Specialist design/plan reviews and Loop task/final reviews require a fresh model-native subagent. The dispatch binds to the target, controller capability session, and exact child executor. Completion validates the decision, current document hash, and structured findings immediately and caches the approval by stage and meaningful document hash.

Named verification intent is durable in `artifacts/agents/verification-requirements.json`. Final verification and archive fail closed until every required entry is named by fresh PASSED verification evidence. User-choice records require explicit `answeredBy=user` provenance for new selections; legacy records remain readable.

Controller ticks and executor-result writes use a cross-process lease. External CLI execution has a default timeout, terminates the worker process tree on timeout, and bounds captured stdout/stderr so a noisy agent cannot consume unbounded controller memory.

## Contract 8 - Compatibility

- `ospec new` and the classic change workflow do not create or require loop artifacts.
- Existing loop v1 JSON is normalized with v2 defaults when read; migration is additive.
- A goal without a task graph uses legacy compatibility behavior rather than crashing, but the task graph is required for integrated batching, review routing, and repair.
- `ospec execute launch` keeps `primitive='subagent'` as its compatibility default.
- Project paths continue to flow through the existing layout resolution; loop artifacts remain relative to the resolved active change.
- Runtime adapter selection is native-only and fail-closed. The capability target, interactive flag, native-subagent support, reported time, and expiry must all be valid for the current session.
