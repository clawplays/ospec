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
2. **Gate:** stop before dispatch when the task graph is invalid, a required user decision is pending, document reviews are not approved, or workspace safety is not ready. When an L3 task graph exists, path/command safety is checked before expensive document reviewers are dispatched.
3. **Repair:** retry technical executor failures with the latest feedback; route task-review changes back to an implementation retry while finding evidence and the authorized repair-scope snapshot converge. Durable worker blockers are not redispatched. Cross-task finding paths are accepted only through declared completed owners; the complete repair scope is frozen, changed owners lose stale approval, and owner review/repair becomes a barrier before new implementation or retryable worker work.
4. **Review:** create one combined task review for completed work before dependent tasks proceed.
5. **Dispatch:** select a parallel-safe batch of ready tasks before ordinary independent review/repair work, bounded by `maxParallel`; an unapproved cross-task repair owner is the exception and must settle first. Unknown native capacity caps implementation at two while preserving conflict-safe review parallelism.
6. **Final review and repair:** after all task reviews pass, run one final review. `NEEDS_CHANGES` becomes one grouped repair wave rather than one worker per finding; `BLOCKED` stops for blocker resolution.
7. **Verify:** after task and review gates pass, require current verification evidence and protocol verification. Verification failures produce a bounded verifier action instead of being treated as completion.

The loop stores the current batch and per-item `issued/running/completed/failed/expired` state in `artifacts/loop/state.json`. Only the issuing tick returns items in `actions`; observation ticks return the durable `pending` record with an empty action list, preventing duplicate launches. Heartbeat leases let a later session distinguish a live child from an orphan. Expired or explicitly released orphans are marked failed and requeued with fresh context; completed siblings are not duplicated. If Loop state is lost while a task remains `IN_PROGRESS`, OSpec waits through the task's absolute runtime window and then supersedes the orphan automatically. The 60-second native wait is only a polling boundary.

A hard workflow gate persists Loop status as `blocked` and returns `stopped: true`; it is not active execution. After resolving the reported condition, `ospec loop resume` moves the state back to `idle` so the next tick can reevaluate every gate. Resume does not bypass required decisions, workspace ownership, document review, task-graph, capability, or L3 safety checks.

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

Failures and non-approved decisions remain visible as feedback and feed the retry, grouped-repair, or verifier action on a later tick. A child that returns without writing its expected evidence becomes a bounded fresh-context retry and contributes to the no-progress circuit breaker. Verification after final review is read-only; a verifier records failures instead of editing reviewed implementation. Final completion still requires the project's real test/build commands, recorded verification evidence, approved review gates, and `ospec verify`.

The finalize documentation contract reconstructs each declared path across completed dispatches. An existing baseline becoming missing is a meaningful reviewed deletion. Multiple repair attempts compare the first task baseline with the last completed task state, while the current workspace must match the latest completed evidence from any task that declares the path. This accepts a legitimate later deletion and a repair that did not repeat an earlier documentation edit, but rejects stale historical evidence, post-dispatch drift, and a final return to the original baseline.

Specialist design/plan reviewers and Loop task/final reviewers require a fresh native subagent. Reviews bind to the exact child, target, and controller capability session. Completion validates the decision, document hash, and structured findings before reporting success. Approved document hashes and current PASSED verification snapshots remain reusable only while their inputs are unchanged.

In default continuous mode, the two specialist document-review rounds and 30-minute stage value are convergence thresholds rather than unconditional stops. A later round is allowed only when stable structured finding IDs changed or the prior review approved an authoritative context that has since changed. Repeated IDs, `BLOCKED`, no-progress, Loop expiry, elapsed/token budgets, STOP, context, and executor-provenance guards still stop dispatch. `--continue-while-progressing false` preserves the strict bounded-round and authorized-extra-window behavior from 1.8.8.

## Safety levels and guards

Choose the initial level with `ospec goal <name> --level L1|L2|L3`:

| Level | Behavior | Additional gate |
| --- | --- | --- |
| **L1 - report-only** | Inspects the task graph and writes findings to triage; emits no executable actions | None |
| **L2 - assisted** | Emits real task/review/verification actions | Required decisions always block |
| **L3 - unattended** | May execute through native controller dispatch | Requires non-empty path and command allowlists; task targets must stay in canonical paths and verification commands must match exact safe commands or structured policies |

Required user decisions block every level; L3 never auto-selects them. Before issuing new work, the loop also enforces:

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
ospec loop run [path] --once [--json]   # JSON is preferred by adapter-driven controllers
ospec loop tick-plan [path]

# Change safety or stop/resume explicitly
ospec loop level [path] <L1|L2|L3>
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

# Specialist design/plan reviewer lifecycle (after spawn, then after wait)
ospec execute doc-review [path] --stage design|plan --claim-executor <executor-id>
ospec execute doc-review [path] --stage design|plan --heartbeat-executor <child-id>
ospec execute doc-review [path] --stage design|plan --complete-executor <child-id>

# Durable verification intent
ospec execute require-verification [path] --id browser-flow --kind browser --description "Exercise the requested browser flow"
ospec execute verify [path] --command "npm run test:e2e" --status PASSED --exit-code 0 --satisfies browser-flow
```

Repeatable flags such as `--allow-path`, `--allow-command`, `--allow-command-policy`, `--test-command`, and `--satisfies` may be supplied more than once. Use `none` for nullable stop limits such as `--max-iterations`, `--budget-tokens`, `--budget-minutes`, and `--expires-at` when you intentionally want them unbounded.

`loop finalize` is the preferred completion path. Successful completion validates authoritative implementation, review, or verification evidence before recording the result. Failed or timed-out results remain recordable for retry diagnostics, and legacy `loop result` remains supported. Defaults are 120 minutes for implementation, 60 minutes for review, 60 minutes for verification, and five minutes between durable evidence completion and a missing executor result.

`--allow-command` values must match the complete normalized command. For example, permitting `go test ./internal/... -count=1` requires that full value, not only `go test`. Verification commands may use one exact project-relative working-directory wrapper such as `cd src/backend && go test ./...`; other shell operators, absolute paths, traversal, appended arguments, and cwd-changing arguments are rejected.

`--allow-command-policy` accepts a JSON object with `command`, optional `argsPrefix`, and optional project-relative `cwd`. The current safety contract treats `argsPrefix` as the complete allowed argument vector; additional arguments are rejected. Prefer structured policies for generated L3 configurations because executable, arguments, and working directory are validated independently. Legacy exact-string entries remain supported.

## Operational guidance

- Use controller mode with explicit target-bound native capability facts. If capability expires, refresh it from the current model session before issuing more work.
- Do not use agent CLIs as subagent substitutes. OSpec intentionally fails closed when the harness has no native child primitive.
- Keep `freshContext` enabled. Disabling it changes prompt guidance but does not turn durable artifacts into chat memory.
- Inspect `ospec loop status` and `artifacts/loop/run-log.jsonl` before raising a budget or overriding a no-progress stop. Continuous mode resets periodic comprehension debt without pausing; strict mode retains the pause. Explicit `loop resume` resets the no-progress and comprehension counters but preserves task, review, and evidence history. `tick_metrics` entries report tick/gate duration, dispatch count, and repeated blockers; `document_review` entries report dispatches, cache hits, and reviewer duration.
- Document reviewer claims use a five-minute executor lease. `--heartbeat-executor` renews it; an expired orphan claim is released automatically when the dispatch is reused or a fresh child claims it.
- Do not weaken tests, review decisions, task boundaries, or allowlists to make the loop advance.

## Engineering issue register

- [Fixed in 1.8.8: authorized extra document review could not outlive the base stage budget](dev/known-issue-extra-document-review-stage-budget.md): an exact user-bound extra round now receives one bounded dispatch window from `selectedAt`, while Loop lifetime, token, STOP, no-progress, context, and one-time-consumption guards remain enforced.
- [Fixed in 1.8.8: resumed Goals could not distinguish their dirty workspace](dev/known-issue-resumed-goal-workspace-ownership.md): workspace readiness now accepts exact non-`PENDING` task targets, exact task-generated TypeScript build metadata, and current hash-verified `ospec update` output while every unknown or tampered path still fails closed. Hard gates persist as resumable `blocked` state, and executed legacy Goals no longer route backwards because of valid angle-bracket technical notation.
- [Fixed in 1.8.9: Goal continuation could stop or redispatch without useful work](dev/known-issue-goal-continuation-stalls.md): repair packets retain findings, changed finding IDs continue past thresholds, durable blockers are not redispatched, independent ready work runs first, and expired orphan tasks recover automatically.
- [Fixed in 1.8.7: Goal progress drift across evidence, task graph, and `tasks.md`](dev/known-issue-goal-progress-projection-drift.md): Goal progress now reconciles validated review evidence into the raw graph and exact `task-*` checklist lines under the task-graph mutation lease. Legacy 1.8.6 Goals are backfilled on resume without redispatch, while ambiguous Markdown fails closed with `progress-projection.json` diagnostics.
- [Parallel tasks can race through shared verification resources](dev/known-issue-parallel-verification-resource-conflicts.md): dependency/file-safe implementation tasks may still run build, test, capture, port, cache, or junction mutations concurrently in one worktree. Until the scheduler models these resources, serialize or rerun shared authoritative verification after the batch settles.
- [Controllers can miss child heartbeat deadlines](dev/known-issue-multi-child-heartbeat-fairness.md): 1.8.8 moves the initial claim target to 60 seconds before lease expiry to avoid false early warnings while a child starts, but bounded native waits still do not guarantee renewal fairness. Multi-item sibling starvation, batch heartbeat, and durable lateness diagnostics remain open.
- [Fixed in 1.8.9: repair limits exposed lifetime counts as if they were new work](dev/known-issue-repair-limit-lifetime-accounting.md): continuous mode preserves history but automatically continues only when stable finding IDs change; strict mode retains the absolute ceiling for compatibility.
- [Fixed in 1.8.11: stable finding IDs hid real partial repair progress](dev/known-issue-same-id-repair-progress-misclassification.md): task and grouped final repair now continue only when both the structured finding fingerprint and the prior authorized repair-scope code snapshot changed; wording-only or code-only churn still stops.
- [Fixed in 1.8.12: real Goals stopped at repair, update, or external-acceptance gates](dev/known-issue-real-goal-resumption-gates-1.8.12.md): mixed-case repair scopes bind correctly, update provenance covers non-destructive generated knowledge, and explicitly deferred external acceptance permits dependency-safe implementation without weakening final evidence gates.
- [Fixed in 1.8.13: resumed Goals stopped at prerequisite review, cross-task repair, or long verification](dev/known-issue-real-goal-secondary-stalls-1.8.13.md): prerequisite reviews now outrank retryable dependent work, declared cross-task repair scope carries frozen owner provenance, bounded controller polls renew claimed leases, and unscoped full Docker rebuilds emit a scope warning.
- [Fixed in 1.8.14: a multi-review lease boundary could orphan a valid owner finding and dispatch downstream work](dev/known-issue-cross-task-owner-review-race-1.8.14.md): one bounded poll tolerance prevents boundary expiry, and cross-task owner review/repair now blocks downstream implementation without serializing other safe reviewers.
- [Fixed in 1.8.15: finalize rejected reviewed document deletion and lost earlier repair evidence](dev/known-issue-documentation-finalize-evidence-1.8.15.md): deletion is a meaningful state transition, multi-dispatch evidence is aggregated from first baseline to final state, and the workspace must still match the latest declared-owner evidence.
- [Stage-blind repairs can ping-pong a shared artifact](dev/known-issue-stage-aware-shared-artifact-repair-ping-pong.md): an upstream source task can require `ready_for_implementation` while a transitive descendant legitimately advances the same record to `accepted`. Revalidate old findings before repair, model stage ownership, and stop contradictory postconditions before they consume repair rounds.
