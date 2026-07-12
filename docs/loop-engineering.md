# Loop Engineering in OSpec

`ospec goal` creates a session-bound, recoverable loop over the goal's task graph. The loop selects bounded implementation, review, repair, and verification actions; durable OSpec artifacts carry progress between fresh worker contexts and later sessions.

> `ospec change` keeps the classic fast flow. The integrated loop applies to `ospec goal`.

## Execution model

OSpec is the durable state-machine brain. It decides what is safe to do next and records the pending action, but the executor depends on the configured mode:

- **Controller mode:** create the goal with explicit harness facts, for example `ospec goal <name> --level L2 --target codex --execution-model controller --harness-interactive true --native-subagents supported`. The persisted capability report is session-bound and expires unless an owned child heartbeat extends it; resume never reauthorizes an expired report. `ospec loop run [path] --once --json` then observes the prior action and emits a bounded action batch. The current IDE controller launches one fresh native subagent per action item, claims it with the real executor id and heartbeat, waits, records each result/evidence with that exact owner, and ticks again without another user prompt.
- **CLI-driven mode:** `ospec loop watch [path]` performs the same planning and observation, then launches fresh external agent processes for the emitted action items. Supported direct targets use `claude -p` or `codex exec`; `gpt` also uses the Codex CLI. Actions in one safe batch run in parallel up to the configured limit.

`loop watch` is a real executor, not a daemon. It ends with the terminal session, Ctrl-C, pause, a `STOP` file, a configured guard, `--max-ticks`, or successful completion. Use controller mode for harness targets that cannot be launched directly by the CLI.

## Integrated task-graph cycle

Each tick follows the persisted task graph and evidence instead of asking an agent to rediscover the whole goal:

1. **Observe:** inspect the pending implementation status, task-review decision, final-review decision, or verification evidence.
2. **Gate:** stop before dispatch when the task graph is invalid, a required user decision is pending, document reviews are not approved, or workspace safety is not ready.
3. **Repair:** retry blocked worker work with the latest feedback; route task-review changes back to an implementation retry. Unknown live `IN_PROGRESS` work is never duplicated automatically.
4. **Review:** create one combined task review for completed work before dependent tasks proceed.
5. **Dispatch:** select a parallel-safe batch of ready tasks, bounded by `maxParallel`.
6. **Final review and repair:** after all task reviews pass, run one final review. A `NEEDS_CHANGES` or `BLOCKED` decision becomes one grouped repair wave rather than one worker per finding.
7. **Verify:** after task and review gates pass, require current verification evidence and protocol verification. Verification failures produce a bounded verifier action instead of being treated as completion.

The loop stores the current batch and per-item `issued/running/completed/failed/expired` state in `artifacts/loop/state.json`. Only the issuing tick returns items in `actions`; observation ticks return the durable `pending` record with an empty action list, preventing duplicate launches. Heartbeat leases let a later session distinguish a live child from an orphan. Expired or explicitly released orphans are marked failed and requeued with fresh context; completed siblings are not duplicated.

## Fresh context and packet references

Implementation and review actions are intentionally small:

- each action names one role, target, packet path, completion command, and expected evidence path;
- implementation actions ask for a fresh isolated worker context and point to one dispatch packet;
- review actions always ask for a fresh independent read-only reviewer context;
- prompts are bounded by `promptMaxChars` and refer to artifacts by path instead of embedding the whole goal;
- workers start from the packet and target files, opening core goal documents only for a concrete ambiguity.

This keeps the scheduler context small while `task-graph.json`, `execution-session.json`, worker reports, review artifacts, `verification-evidence.json`, and `run-log.jsonl` provide durable progress memory.

## Feedback and stop condition

A successful external process is not enough to settle an action. The next tick checks durable evidence:

- implementation settles from task status (`DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`);
- task and final review settle from their recorded decisions;
- verification settles on current PASSED evidence or on explicit FAILED/BLOCKED evidence. Failure invalidates the prior final approval and routes through an independent re-review and grouped repair before verification is retried.

Failures and non-approved decisions remain visible as feedback and feed the retry, grouped-repair, or verifier action on a later tick. An external process that exits without writing its expected evidence becomes a bounded fresh-context retry and contributes to the no-progress circuit breaker. Verification after final review is read-only; a verifier records failures instead of editing reviewed implementation. Final completion still requires the project's real test/build commands, recorded verification evidence, approved review gates, and `ospec verify`.

Specialist design/plan reviewers and Loop task/final reviewers are bound to the exact native child and controller capability session. Their approvals also carry dispatch IDs, timestamps, structured findings, Git state, and document/target hashes. A different executor, a missing claim/result, or any later source change makes the approval stale. PASSED verification evidence uses the same target snapshot rule.

## Safety levels and guards

Choose the initial level with `ospec goal <name> --level L1|L2|L3`:

| Level | Behavior | Additional gate |
| --- | --- | --- |
| **L1 - report-only** | Inspects the task graph and writes findings to triage; emits no executable actions | None |
| **L2 - assisted** | Emits real task/review/verification actions | Required decisions always block |
| **L3 - unattended** | May execute through CLI watch or controller dispatch | Requires non-empty path and command allowlists; task targets and verification commands must match exact command boundaries |

Required user decisions block every level; L3 never auto-selects them. Before issuing new work, the loop also enforces:

- maximum iterations;
- absolute expiry time;
- token and elapsed-minute budgets;
- a no-progress circuit breaker;
- periodic comprehension-review pauses;
- explicit pause and the `artifacts/loop/STOP` sentinel.

Controller ticks and task-graph completion mutations use cross-process leases. JSON state uses same-directory atomic replacement so readers never observe partial documents. CLI processes have a default 30-minute timeout, terminate their process tree on timeout, and cap captured output at 1 MiB. Token accounting combines executor-reported counters with authoritative usage sidecars and deduplicates matching usage keys. Before a task-graph dispatch/review/retry mutation, the remaining token budget limits batch size; the selected batch divides that remainder into persisted per-action reservations/allowances that executors must honor and report against. Unknown fields remain unknown instead of being estimated.

## Commands

```bash
# Inspect or drive one controller tick
ospec loop status [path]
ospec loop run [path] --once [--json]   # JSON is preferred by native subagent controllers
ospec loop tick-plan [path]

# Run the session-bound CLI executor
ospec loop watch [path] [--target claude|codex|gpt] [--interval 10m]
ospec loop watch [path] [--max-ticks N] [--timeout-ms N] [--dry-run] # dry-run performs no tick or state mutation

# Change safety or stop/resume explicitly
ospec loop level [path] <L1|L2|L3>
ospec loop pause [path]
ospec loop resume [path]

# Configure execution, budgets, safety, and prompt bounds
ospec loop configure [path] --execution-model controller --target codex --harness-interactive true --native-subagents supported
ospec loop configure [path] --max-parallel 3 --interval 10m --fresh-context true
ospec loop configure [path] --max-iterations 20 --expires-at 2026-12-31T00:00:00Z
ospec loop configure [path] --budget-tokens 200000 --budget-minutes 120
ospec loop configure [path] --no-progress-limit 3 --review-every 8 --prompt-max-chars 2400
ospec loop configure [path] --allow-path src --allow-command "npm test"
ospec loop configure [path] --test-command "npm test" --test-command "npm run build"

# Native child lifecycle (normally driven by the IDE controller)
ospec loop heartbeat [path] --action-item <id> --executor <child-id> --lease-ms 120000
ospec loop result [path] --action-item <id> --executor <child-id> --exit-code 0 --summary "completed"
ospec loop recover [path] --force   # only when the controller knows the prior session/child is gone

# Specialist design/plan reviewer lifecycle (after spawn, then after wait)
ospec execute doc-review [path] --stage design|plan --claim-executor <child-id>
ospec execute doc-review [path] --stage design|plan --complete-executor <child-id>
```

Repeatable flags such as `--allow-path`, `--allow-command`, and `--test-command` may be supplied more than once. Use `none` for nullable stop limits such as `--max-iterations`, `--budget-tokens`, `--budget-minutes`, and `--expires-at` when you intentionally want them unbounded.

## Operational guidance

- Prefer controller mode when the current harness provides native subagents; it preserves native permissions, tool support, and model routing.
- Use CLI watch only with a directly supported target and an authenticated CLI available on `PATH`.
- Keep `freshContext` enabled. Disabling it changes prompt guidance but does not turn durable artifacts into chat memory.
- Inspect `ospec loop status` and `artifacts/loop/run-log.jsonl` before raising a budget, resuming after a comprehension pause, or overriding a no-progress stop.
- Do not weaken tests, review decisions, task boundaries, or allowlists to make the loop advance.
