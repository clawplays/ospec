# Loop Engineering - Integrated Execution-Model Contract (1.8.0)

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

## Contract 2 - Controller and CLI executors remain distinct

| | Controller mode | CLI-driven mode |
| --- | --- | --- |
| Planner/observer | `LoopService.runOnce()` | `LoopService.runOnce()` |
| Executor | Current harness native subagents | `ospec loop watch` plus `AgentCliRunnerService` |
| Worker lifetime | One fresh native subagent per action item | One fresh external process per action item |
| Parallelism | Controller dispatches the emitted safe batch | Watch executes the emitted safe batch with `Promise.all` |
| Persistence | Task/review/evidence artifacts plus loop state | Same artifacts plus executor results in loop state/run log |
| Lifetime | Current AI session | Current CLI process; never a persistent daemon |

`ospec loop run --once` must never spawn an agent. `ospec loop watch` must execute emitted actions unless `--dry-run` is set, and must immediately re-tick after an executed batch so durable evidence can be observed. `--dry-run` performs no controller tick, dispatch, state write, or external execution. Watch sleeps for the configured interval only when no action is ready.

Direct watch targets are `claude`, `codex`, and `gpt`. Exact external forms remain `claude -p <prompt>` and `codex exec <prompt>`; no `claude --goal` form exists. Other harness targets use controller mode and their native adapter.

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
2. record the result with `ospec execute verify --status PASSED|FAILED`;
3. confirm the goal protocol with the non-exiting `VerificationService` used by the loop and the exiting `ospec verify` command used by the CLI/user workflow.

When protocol verification is incomplete, the loop emits a read-only verifier action that references `verification.md`, names configured deterministic commands when present, and requires new evidence. A post-review verifier must not edit implementation or tests. The loop reaches `done` only after task graph, task reviews, final review, evidence, and protocol verification pass.

## Contract 6 - Safety levels and hard stops

- **L1:** report-only; no implementation, review, repair, or verification action is emitted.
- **L2:** real actions are allowed, but required decisions block.
- **L3:** required decisions still block; every implementation/repair target path and verification command must match a non-empty allowlist. Canonical real-path boundaries reject traversal and symlink/junction escapes. Commands must match an allowlist entry exactly and may not contain shell control syntax or option-injection suffixes.

The loop must also require approved design and implementation-plan reviews plus ready workspace evidence before executable L2/L3 work. It checks STOP/pause before observation and checks `maxIterations`, `expiresAt`, `budgetTokens`, `budgetMinutes`, no-progress limit, and comprehension-review interval after observing evidence but before issuing a new action. A guard stop or pause is persisted and surfaced through status; it is not converted into success. Resume resets comprehension debt but does not erase task/review/evidence history.

## Contract 7 - Scheduling and observability

The schedule lifecycle is always `session-bound`. Controller mode exposes a `ControllerTickPlan`; it is not a runtime scheduler. CLI watch is the runtime scheduler/executor and must stop cleanly on Ctrl-C.

`artifacts/loop/state.json` persists iteration, pending actions, start/update times, token usage, no-progress count, progress fingerprint, last feedback, and comprehension debt. `artifacts/loop/run-log.jsonl` is append-only at the logical API boundary and records action IDs/counts plus verification and executor feedback. `ospec loop status` surfaces configuration, guards, budgets, pending item counts, and accumulated metrics.

Provider sidecars override executor-reported usage with the same usage key so one run is never counted twice. Unknown usage remains unknown/zero; it must not be estimated from prompt length. Before mutating the task graph for a new parallel batch, the controller limits batch size from the remaining budget and persists a bounded reservation/allowance for every selected action.

Controller capability is a session-bound report with `reportedAt` and `expiresAt`. Executable ticks fail closed after expiry. A valid owned heartbeat may extend a still-current session; `resume` and an expired heartbeat cannot reauthorize it, so refresh requires explicit harness capability flags. Controller results require a prior heartbeat claim and the exact non-empty executor id; CLI watch follows the same auditable claim/result lifecycle.

Specialist design/plan reviews and Loop task/final reviews bind their dispatch to the controller capability session and exact native child executor. Review approval is invalid unless claim, completion, `reviewed_at`, structured findings, document/target hash, and Git provenance all match; later source changes invalidate the old approval.

Controller ticks and executor-result writes use a cross-process lease. External CLI execution has a default timeout, terminates the worker process tree on timeout, and bounds captured stdout/stderr so a noisy agent cannot consume unbounded controller memory.

## Contract 8 - Compatibility

- `ospec new` and the classic change workflow do not create or require loop artifacts.
- Existing loop v1 JSON is normalized with v2 defaults when read; migration is additive.
- A goal without a task graph uses legacy compatibility behavior rather than crashing, but the task graph is required for integrated batching, review routing, and repair.
- `ospec execute launch` keeps `primitive='subagent'` as its compatibility default.
- Project paths continue to flow through the existing layout resolution; loop artifacts remain relative to the resolved active change.
- Native subagent execution remains owned by the current harness. CLI watch must not be described as a native harness adapter.
