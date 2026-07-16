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

Codex/GPT use `spawn_agent` plus bounded `wait_agent`, Claude uses background Task polling when available, Gemini uses `@generalist`, and OpenCode uses `@mention`. Cursor and Copilot use their registered native agent/task contexts. Every adapter returns from one wait within 60 seconds, refreshes heartbeats before `heartbeatDueAt`, persists finished siblings immediately, and re-ticks. This is a polling boundary, not a child runtime limit. Long-running children continue across polls until their configurable absolute action deadline. `shell` and `generic` are not executable agent targets. OSpec does not probe Orca, PATH binaries, or agent CLIs, does not write an adapter probe cache, and does not fall back into the current controller context.

## Integrated task-graph cycle

Each tick follows the persisted task graph and evidence instead of asking an agent to rediscover the whole goal:

1. **Observe:** inspect the pending implementation status, task-review decision, final-review decision, or verification evidence.
2. **Gate:** stop before dispatch when the task graph is invalid, a required user decision is pending, document reviews are not approved, or workspace safety is not ready. When an L3 task graph exists, path/command safety is checked before expensive document reviewers are dispatched.
3. **Repair:** retry blocked worker work with the latest feedback; route task-review changes back to an implementation retry. Unknown live `IN_PROGRESS` work is never duplicated automatically.
4. **Review:** create one combined task review for completed work before dependent tasks proceed.
5. **Dispatch:** select a parallel-safe batch of ready tasks, bounded by `maxParallel`; unknown native capacity caps implementation at two while preserving review parallelism.
6. **Final review and repair:** after all task reviews pass, run one final review. `NEEDS_CHANGES` becomes one grouped repair wave rather than one worker per finding; `BLOCKED` stops for blocker resolution.
7. **Verify:** after task and review gates pass, require current verification evidence and protocol verification. Verification failures produce a bounded verifier action instead of being treated as completion.

The loop stores the current batch and per-item `issued/running/completed/failed/expired` state in `artifacts/loop/state.json`. Only the issuing tick returns items in `actions`; observation ticks return the durable `pending` record with an empty action list, preventing duplicate launches. Heartbeat leases let a later session distinguish a live child from an orphan. Expired or explicitly released orphans are marked failed and requeued with fresh context; completed siblings are not duplicated.

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

Specialist design/plan reviewers and Loop task/final reviewers require a fresh native subagent. Reviews bind to the exact child, target, and controller capability session. Completion validates the decision, document hash, and structured findings before reporting success. Approved document hashes and current PASSED verification snapshots remain reusable only while their inputs are unchanged.

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
ospec loop configure [path] --no-progress-limit 3 --max-task-repair-rounds 2 --max-final-repair-rounds 2 --review-every 8 --prompt-max-chars 2400
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
- Inspect `ospec loop status` and `artifacts/loop/run-log.jsonl` before raising a budget, resuming after a comprehension pause, or overriding a no-progress stop. Explicit `loop resume` resets the no-progress and comprehension counters but preserves task, review, and evidence history. `tick_metrics` entries report tick/gate duration, dispatch count, and repeated blockers; `document_review` entries report dispatches, cache hits, and reviewer duration.
- Document reviewer claims use a five-minute executor lease. `--heartbeat-executor` renews it; an expired orphan claim is released automatically when the dispatch is reused or a fresh child claims it.
- Do not weaken tests, review decisions, task boundaries, or allowlists to make the loop advance.

## Engineering issue register

- [Fixed in 1.8.7: Goal progress drift across evidence, task graph, and `tasks.md`](dev/known-issue-goal-progress-projection-drift.md): Goal progress now reconciles validated review evidence into the raw graph and exact `task-*` checklist lines under the task-graph mutation lease. Legacy 1.8.6 Goals are backfilled on resume without redispatch, while ambiguous Markdown fails closed with `progress-projection.json` diagnostics.
- [Parallel tasks can race through shared verification resources](dev/known-issue-parallel-verification-resource-conflicts.md): dependency/file-safe implementation tasks may still run build, test, capture, port, cache, or junction mutations concurrently in one worktree. Until the scheduler models these resources, serialize or rerun shared authoritative verification after the batch settles.
- [Controllers can miss child heartbeat deadlines](dev/known-issue-multi-child-heartbeat-fairness.md): bounded native waits do not guarantee timely heartbeat scheduling, and multi-item batches add sibling-starvation risk. Late pre-lease evidence remains recoverable, but the controller algorithm and diagnostics need stronger support.
- [Repair limits expose lifetime counts as if they were new work](dev/known-issue-repair-limit-lifetime-accounting.md): upgraded Goals can report a confusing state such as `7/2`, and authorizing two additional rounds requires an absolute ceiling of 9. Preserve the history, explain the arithmetic, and prefer task- and finding-scoped incremental grants in a future runtime.
- [Stage-blind repairs can ping-pong a shared artifact](dev/known-issue-stage-aware-shared-artifact-repair-ping-pong.md): an upstream source task can require `ready_for_implementation` while a transitive descendant legitimately advances the same record to `accepted`. Revalidate old findings before repair, model stage ownership, and stop contradictory postconditions before they consume repair rounds.
