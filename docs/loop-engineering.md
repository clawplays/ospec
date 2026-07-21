# Loop Engineering in OSpec

`ospec goal` creates a session-bound, recoverable loop over the goal's task graph. The loop selects bounded implementation, review, repair, and verification actions; durable OSpec artifacts carry progress between fresh worker contexts and later sessions.

> `ospec change` keeps the classic fast flow. The integrated loop applies to `ospec goal`.

## Execution model

OSpec is the durable state-machine brain. It decides what is safe to do next and records the pending action. The current model harness is the only agent executor: `ospec loop run [path] --once --json` observes the prior action and emits a bounded action batch whose `runtimeAdapter.selected.nativeSubagent` names the native primitive. The controller claims each action with its real child id and heartbeat, records result/evidence with that owner, and ticks again.

There is no agent CLI execution mode. `loop watch`, `execute orchestrate`, `launch --run --command`, and `review --run --command` return migration errors before creating a process or run artifact.

### Runtime adapter resolution

Every `ospec execute launch` artifact includes one model-native candidate. It is available only when:

1. the target has a registered native subagent primitive;
2. the capability snapshot is interactive and reports native subagent support;
3. the capability target exactly matches the requested target;
4. `reportedAt` is not in the future and `expiresAt` is still current.

Codex/GPT use `spawn_agent` plus bounded `wait_agent`, Claude uses background Task polling when available, Gemini uses `@generalist`, and OpenCode uses `@mention`. Cursor and Copilot use their registered native agent/task contexts. Every adapter returns from one wait within 60 seconds, refreshes heartbeats before `heartbeatDueAt`, persists finished siblings immediately, and re-ticks. This is a polling boundary, not a child runtime limit. A successful controller tick renews the short lease of an already-claimed live child. If scheduling overhead crosses that boundary, the same controller poll may renew only within one additional bounded 60-second wait; direct late results remain invalid, the absolute deadline remains fixed, and an unsupervised orphan still expires. Long-running children continue across polls until that deadline. `shell` and `generic` are not executable agent targets. OSpec does not probe Orca, PATH binaries, or agent CLIs, does not write an adapter probe cache, and does not fall back into the current controller context.

## Integrated task-graph cycle

Each tick follows the persisted task graph and evidence instead of asking an agent to rediscover the whole goal:

1. **Observe:** inspect the pending implementation status, task-review decision, final-review decision, or verification evidence.
2. **Gate:** stop before dispatch when the task graph is invalid, a required user decision is pending, deterministic design/plan preflights are not current, or workspace safety is not ready. Explicit path and command allowlists are checked after task graph derivation and before worker dispatch.
3. **Repair:** retry technical executor failures with the latest feedback; route task-review changes back to an implementation retry while finding evidence and the authorized repair-scope snapshot converge. In continuous mode, a stalled task or final finding set receives one durable strategy escalation that requires root-cause reassessment and focused regression coverage; the same strategy key cannot be issued twice. Durable worker blockers are not redispatched. Cross-task finding paths are accepted only through declared completed owners; the complete repair scope is frozen, changed owners lose stale approval, and owner review/repair becomes a barrier before new implementation or retryable worker work.
4. **Review:** create one combined task review for completed work before dependent tasks proceed.
5. **Dispatch:** select a parallel-safe batch of ready tasks before ordinary independent review/repair work, bounded by `maxParallel`; an unapproved cross-task repair owner is the exception and must settle first. Unknown native capacity uses the default implementation concurrency of three while preserving conflict-safe review parallelism. A larger session-bound reported capacity replaces that fallback and can support configured batches of 5-10 when the graph, token budget, and harness all allow it.
6. **Final review and repair:** after all task reviews pass, run one final review. `NEEDS_CHANGES` becomes one grouped repair wave rather than one worker per finding; `BLOCKED` stops for blocker resolution.
7. **Verify:** after task and review gates pass, require current verification evidence and protocol verification. Verification failures produce a bounded verifier action instead of being treated as completion.

The loop stores the current batch and per-item `issued/running/completed/failed/expired` state in `artifacts/loop/state.json`. Only the issuing tick returns items in `actions`; observation ticks return the durable `pending` record with an empty action list, preventing duplicate launches. Heartbeat leases let a later session distinguish a live child from an orphan. Expired or explicitly released orphans are marked failed and requeued with fresh context; completed siblings are not duplicated. If Loop state is lost while a task remains `IN_PROGRESS`, OSpec waits through the task's absolute runtime window and then supersedes the orphan automatically. The 60-second native wait is only a polling boundary.

A hard workflow gate persists Loop status as `blocked` and returns `stopped: true`; it is not active execution. After resolving the reported condition, `ospec loop resume` moves the state back to `idle` so the next tick can reevaluate every gate. Resume does not bypass required decisions, workspace ownership, planning preflight, task-graph, capability, or configured allowlist checks.

## Fresh context and packet references

Implementation and review actions are intentionally small:

- each action names one role, target, packet path, completion command, and expected evidence path;
- implementation actions ask for a fresh isolated worker context and point to one dispatch packet;
- review actions always ask for a fresh independent read-only reviewer context;
- prompts are bounded by `promptMaxChars` and refer to artifacts by path instead of embedding the whole goal;
- workers start from the packet and target files, opening core goal documents only for a concrete ambiguity.

This keeps the scheduler context small while `task-graph.json`, `execution-session.json`, worker reports, review artifacts, `verification-evidence.json`, `verification-requirements.json`, and `run-log.jsonl` provide durable progress memory.

## Feedback and stop condition

A successful child result is not enough to settle an action. The next tick checks durable evidence:

- implementation settles from task status (`DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`);
- task and final review settle from their recorded decisions;
- verification settles on current PASSED evidence or on explicit FAILED/BLOCKED evidence. Failure invalidates the prior final approval and routes through an independent re-review and grouped repair before verification is retried.

The canonical worker report is part of a task review's content-addressed target snapshot even though it is not a task-graph business target. A finding may route repair to the exact same-task report path, but never to another task's report, a report directory, or arbitrary controller history.

Failures and non-approved decisions remain visible as feedback and feed the retry, grouped-repair, or verifier action on a later tick. A child that returns without writing its expected evidence becomes a bounded fresh-context retry and contributes to the no-progress circuit breaker. Verification after final review is read-only; a verifier records failures instead of editing reviewed implementation. Final completion still requires the project's real test/build commands, recorded verification evidence, approved review gates, and `ospec verify`.

When ordinary task or final repair reaches its convergence threshold without progress, continuous mode may emit one `repair_strategy` action for the exact scope and sorted finding-ID set. The packet preserves the existing review and frozen repair evidence but requires a different root-cause approach and a focused regression check. That strategy attempt is persisted in retry or repair-wave history. If the same key stalls again, Loop blocks; strict mode does not emit the extra action.

The finalize documentation contract reconstructs each declared path across completed dispatches. An existing baseline becoming missing is a meaningful reviewed deletion. Multiple repair attempts compare the first task baseline with the last completed task state, while the current workspace must match the latest completed evidence from any task that declares the path. This accepts a legitimate later deletion and a repair that did not repeat an earlier documentation edit, but rejects stale historical evidence, post-dispatch drift, and a final return to the original baseline.

Controller closeout may legitimately update a declared verification document after the last worker completion. The dispatch evidence chain must still prove meaningful work. If the current path no longer matches that last dispatch state, finalize accepts it only when the same owner has a later APPROVED task review whose complete executor provenance validates and whose raw target snapshot exactly matches the current path. Review assignment must follow the owner dispatch. A stale, unapproved, provenance-incomplete, pre-dispatch, or subsequently changed review snapshot cannot authorize closeout.

Loop task/final reviewers require a fresh native subagent. Their reviews bind to the exact child, target, and controller capability session, and completion validates the decision, target snapshot, and structured findings before reporting success. Planning preflight approvals and current PASSED verification snapshots remain reusable only while their inputs are unchanged.

Design and implementation-plan checks are deterministic inline preflights in 1.9.0. They consume no reviewer token reservation and never create a native child. After task graph derivation, one independent combined planning reviewer checks requirements, architecture, task boundaries, dependencies, and verification coverage. `NEEDS_CHANGES` permits one grouped planning repair and one fresh re-review; a repeated failure blocks stably. Task and final review repair convergence remains controlled by `--continue-while-progressing` and the configured repair thresholds.

## Workflow guards

Every Goal uses one executable fast quality workflow. Required user decisions always block implementation. An optional configured allowlist can add exact path and command boundaries without changing the workflow. Before issuing new work, the loop also enforces:

- maximum iterations;
- absolute expiry time;
- token and elapsed-minute budgets;
- a no-progress circuit breaker;
- periodic comprehension-review pauses;
- explicit pause and the `artifacts/loop/STOP` sentinel.

Controller ticks and task-graph completion mutations use cross-process leases. JSON state uses same-directory atomic replacement so readers never observe partial documents. Token accounting combines executor-reported counters with authoritative usage sidecars and deduplicates matching usage keys. Before a task-graph dispatch/review/retry mutation, the remaining token budget limits batch size; the selected batch divides that remainder into persisted per-action reservations/allowances that executors must honor and report against. Unknown fields remain unknown instead of being estimated.

Workspace safety is ownership-based when resuming an existing Goal. Dirty paths are accepted only when they are exact targets of non-`PENDING` tasks, exact package-local `tsconfig.tsbuildinfo` output derived from a started task's declared build/typecheck command, or match current-version, SHA-256-bound `.ospec/update-provenance.json` written by `ospec update`. The report separates Goal-owned, task-generated, update-managed, and blocking changes. There is no generated-file wildcard: `PENDING` task outputs, metadata outside the owning task package, unknown files, stale provenance, and hash mismatches remain `needs_isolation`; provenance is rebound only when it was actually used to accept a dirty path.

## Commands

```bash
# Inspect or drive one controller tick
ospec loop status [path]
ospec loop run [path] --once --compact-json   # token-lean controller output
ospec loop run [path] --once --json           # full diagnostics when debugging the controller
ospec loop tick [path] [--json]         # compatibility alias for one run --once iteration
ospec loop tick-plan [path]

# Stop or resume explicitly
ospec loop pause [path]
ospec loop resume [path]

# Configure execution, budgets, safety, and prompt bounds
ospec loop configure [path] --execution-model controller --target codex --harness-interactive true --native-subagents supported
ospec loop configure [path] --max-parallel 3 --interval 10m --fresh-context true
ospec loop configure [path] --max-iterations 20 --expires-at 2026-12-31T00:00:00Z
ospec loop configure [path] --budget-tokens 200000 --budget-minutes 120
ospec loop configure [path] --no-progress-limit 3 --max-task-repair-rounds 2 --max-final-repair-rounds 2 --continue-while-progressing true --review-every 8 --prompt-max-chars 2400
ospec loop configure [path] --implementation-max-runtime-minutes 120 --review-max-runtime-minutes 60 --verification-max-runtime-minutes 60 --evidence-result-grace-minutes 5
ospec loop configure [path] --allow-path src --allow-command "npm test"
ospec loop configure [path] --allow-command-policy '{"command":"go","argsPrefix":["test"],"cwd":"src/backend"}'
ospec loop configure [path] --test-command "npm test" --test-command "npm run build"

# Adapter executor lifecycle (normally driven by the controller)
ospec loop heartbeat [path] --action-item <id> --executor <child-id> --lease-ms 120000
ospec loop finalize [path] --action-item <id> --executor <child-id> --exit-code 0 --summary "completed"
ospec loop recover [path] --force   # only when the controller knows the prior session/child is gone

# Zero-token planning preflights
ospec execute preflight [path] --stage design
ospec execute preflight [path] --stage plan

# Durable verification intent
ospec execute require-verification [path] --id browser-flow --kind browser --description "Exercise the requested browser flow"
ospec execute verify [path] --command "npm run test:e2e" --status PASSED --exit-code 0 --satisfies browser-flow
```

Repeatable flags such as `--allow-path`, `--allow-command`, `--allow-command-policy`, `--test-command`, and `--satisfies` may be supplied more than once. Use `none` for nullable stop limits such as `--max-iterations`, `--budget-tokens`, `--budget-minutes`, and `--expires-at` when you intentionally want them unbounded.

`loop finalize` is the completion path. Successful completion validates authoritative implementation, review, or verification evidence before recording the result. Failed or timed-out results remain recordable for diagnostics. Defaults are 120 minutes for implementation, 60 minutes for review, 60 minutes for verification, and five minutes between durable evidence completion and a missing executor result.

`--allow-command` values must match the complete normalized command. For example, permitting `go test ./internal/... -count=1` requires that full value, not only `go test`. Verification commands may use one exact project-relative working-directory wrapper such as `cd src/backend && go test ./...`; other shell operators, absolute paths, traversal, appended arguments, and cwd-changing arguments are rejected.

`--allow-command-policy` accepts a JSON object with `command`, optional `argsPrefix`, and optional project-relative `cwd`. The current safety contract treats `argsPrefix` as the complete allowed argument vector; additional arguments are rejected. Prefer structured policies when configuring an optional allowlist because executable, arguments, and working directory are validated independently.

## Operational guidance

- Use controller mode with explicit target-bound native capability facts. If capability expires, refresh it from the current model session before issuing more work.
- Do not use agent CLIs as subagent substitutes. OSpec intentionally fails closed when the harness has no native child primitive.
- Keep `freshContext` enabled. Disabling it changes prompt guidance but does not turn durable artifacts into chat memory.
- Inspect `ospec loop status --brief` and focused `run-log.jsonl` entries before raising a budget or overriding a no-progress stop. Continuous mode resets periodic comprehension debt without pausing; strict mode retains the pause. Explicit `loop resume` resets counters but preserves task, review, and evidence history. `tick_metrics` entries report tick/gate duration, dispatch count, and repeated blockers.
- Do not weaken tests, review decisions, task boundaries, or allowlists to make the loop advance.

## Current Controller Invariants

- **Progress reconciliation:** validated task reviews reconcile the task graph and exact task checklist under one mutation lease. Ambiguous Markdown, stale snapshots, or unprovenanced state fail closed and emit diagnostics instead of being guessed or rewritten.
- **Workspace ownership:** resumed Goals may retain exact started-task targets, declared task-generated build metadata, and hash-verified `ospec update` output. Unknown, future-task, stale, or tampered paths still require a clean or isolated worktree.
- **Scheduling order:** missing prerequisite reviews and cross-task owner review or repair run before dependent implementation retries. Other dependency-safe and file-safe work may remain parallel.
- **Repair convergence:** repair packets retain immutable structured findings and scope snapshots. Continuous mode advances only for a changed finding set or evidence-bound refinement, permits one root-cause strategy escalation for a stalled set, and stops repeats or cycles. Strict mode keeps absolute limits.
- **Canonical task reports:** task reviews snapshot the same task's canonical worker report. Exact same-task report repair is allowed; stale or legacy review evidence triggers a fresh review rather than an artifact-history rewrite.
- **External blockers:** durable blockers are not redispatched without a real external-state change. Explicit user-authorized deferral may free dependency-safe implementation, but final review and closeout still require the external evidence.
- **Documentation evidence:** reviewed creation and deletion are meaningful transitions. Multi-dispatch evidence spans the first baseline through the final state, must match the latest declared owner, and may use a later authoritative review only to bind an exact final snapshot.
- **Verification freshness:** Goal status, finalize, and archive preview use the same canonical Git and target-file freshness rules. Updating derived controller artifacts alone does not invalidate otherwise current verification.
- **Executor lifecycle:** one native wait is bounded, heartbeats renew only the short lease, and absolute deadlines never move. Persist each finished sibling immediately; use forced recovery only after the previous session or child is known to be gone.
- **Shared resources:** file-safe tasks can still contend for ports, caches, build outputs, screenshots, devices, or external services. Declare conflicts, serialize the shared operation, or rerun authoritative verification after the parallel batch settles.
- **Stage ownership:** when upstream and downstream tasks legitimately advance the same artifact through different lifecycle states, encode that ownership in dependencies and acceptance criteria. Revalidate older findings before repair and stop contradictory postconditions before they consume repair rounds.
