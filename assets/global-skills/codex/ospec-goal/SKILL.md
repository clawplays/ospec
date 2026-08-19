---
name: ospec-goal
description: Create or advance a full OSpec goal using the current document, task graph, worker, review, and evidence workflow.
---

# OSpec Goal

Use this skill for complex work that needs the full OSpec workflow. A goal is intentionally heavier than a change and is the place to use design docs, implementation planning, task graph dispatch, worker/reviewer handoffs, and durable evidence.

Every rule you need in order to act is in this file. `for-ai/execution-protocol.md` is the authoritative detail behind those rules — open it only when a named situation actually comes up (per-harness wait primitives, lease expiry, repair convergence, cross-task finding scope, worker-report repair binding, allowlist CAS semantics, deferred external acceptance, force-archive detail), never on goal entry and never on every turn. That file is the goal profile's reference; a classic change reads `for-ai/change-protocol.md` instead and must never be sent here.

## Loop Model

`ospec goal` creates a **session-bound Loop** automatically (`artifacts/loop/loop.json` + `state.json` + `run-log.jsonl`). There is no separate init step.

- **OSpec is the durable state-machine brain.** `ospec loop run --once` first observes the previous task, review, or verification evidence, then emits a bounded batch of action items from `task-graph.json`. Execute each one only through the model-native subagent primitive named by its target-bound `runtimeAdapter`, then record durable evidence.
- **IDE controller auto-dispatch is mandatory.** Never stop at "Loop initialized" or ask the user to run Loop commands. Run `ospec loop run <goal-path> --once --compact-json`, consume every returned action, record evidence as each executor finishes, and tick again without another user prompt. Stop only for a required user decision, an unavailable independent/isolated executor, a blocking safety gate, a configured guard/STOP, a terminal failure that needs user authority, an explicit user pause, or `done`.
- **One batched call per controller round.** `ospec loop step <goal> --batch-file <path|->` applies every claim and every result and ticks in ONE process, then emits the next action batch as compact JSON. It replaces `loop heartbeat` x N + `loop finalize` x N + `loop run --once`; at the default concurrency of 3 that is a measured 7 controller calls down to 2. The ceiling is `2C+1` in the DECLARED capacity C (C=5 measures 11), not in the task count, so the win does not grow as the goal gets more tasks. Send `{"claims":[...]}` with `--no-tick` right after dispatching, then `{"results":[...]}` when the children finish. A missing or mis-keyed envelope key is a hard error, never an empty batch; a partial failure stops, does not tick, and prints exactly which items are already durable.
- **Executor lifecycle is durable and bounded.** Claim each dispatched child once (the `claims` array of `ospec loop step`, or `ospec loop heartbeat` per item), run `ospec loop poll <goal> --json` between native waits (it refreshes every lease and reports `tickNow`), and full-tick only on `tickNow=true` or right after dispatching. Never make one indefinite wait: stay inside `maxWaitMs` (60s) while other work is dispatchable; the single `idleMaxWaitMs` (10min) wait is only for the last outstanding batch. Commit each finished child with its emitted `ospec loop finalize ...` command, and use `ospec loop recover --force` only when the prior session or child is known to be gone.
- **Match execution shape to graph shape.** Maximize task-graph width: every `depends_on` must be semantically necessary, and the planning review treats an unjustified fully serial chain as a finding. On a reported `serialBottleneck` the controller may implement that one task inline (executor id `controller-inline`); reviews stay independent subagents. `--review-gating optimistic` fits low-risk goals; keep the strict default for `high_risk`/`security_related` work.
- **Planning quality is fast and bounded.** Design preflight, then plan preflight — never launch a reviewer child for either — then the derived task graph, then one independent combined planning review. `NEEDS_CHANGES` permits one grouped repair and at most one delta-scoped re-review; a repeated semantic failure is a stable blocker, never an open-ended loop.
- **Progress documents track reality.** Tick each proposal.md acceptance criterion as its evidence passes; tag acceptance lines `[verify:<id>]` and record `ospec execute verify ... --satisfies <id>` so `ospec execute sync` auto-ticks them. Archiving blocks on unchecked items. review.md is derived by sync from the final review — never edit it by hand.
- **Required decisions always block.** Present every required decision to the user, never auto-select the recommendation, and record it with `--answered-by user` before the loop proceeds. Brainstorm resolutions need the same provenance.
- **`/goal` is capability-probed, not inferred from a target name.** `ospec execute launch --primitive goal` emits a native-`/goal` instruction only when the harness explicitly reports support; otherwise the same controller runs the verify-driven loop through native subagents.
- **Scheduling is session-bound.** Unknown native capacity uses the default implementation concurrency of three while keeping conflict-safe review batches under the configured limit. Raise `maxParallel` only from an authoritative current-session capacity report — never from a provider name or a stale session — and never over dependencies, file conflicts, token funding, or the configured maximum.
- **Progress is artifact-backed, and `state.json` is the status source of truth.** Task status, review decisions, repair waves, evidence, `state.json`, and `run-log.jsonl` carry progress between fresh contexts, and process exit alone does not complete an action. When a document and `state.json` disagree, reconcile toward `state.json` instead of reporting the document's value. Dispatch only items returned in `actions`; a durable `pending` record with an empty action list is observation state, not work.
- **Manual artifact edits need a sync.** After hand-editing the task graph, execution session, a review artifact, debug evidence, or the verification checklist, run `ospec execute sync [changes/active/<goal>]` so `artifacts/agents/worker-status.md` and the derived checklists rebuild from authoritative state — never only at closeout.
- **Guards are enforced before new work.** Pause/STOP, iteration/deadline/token/time budgets, no-progress limits, comprehension checkpoints, required decisions, passed preflights and planning review, ready workspace evidence, and optional allowlists can stop or pause the loop.
- **Review repair is convergent and regression-aware.** A downstream task sharing target files inherits transitive upstream regression obligations. The two-round defaults are convergence thresholds, a blocked final review needs blocker resolution instead of grouped repair, and no limit is ever raised to repeat unchanged work. Cross-task finding scope and worker-report repair binding are specified in `for-ai/execution-protocol.md`; read it when a finding actually reaches past its own task.
- **Verification scope must be proportional.** Treat an unscoped `docker compose up --build` as a required preflight: check repository release guidance and prefer explicit service names. Never rebuild or download unrelated runtimes to verify a scoped change.
- **External acceptance may be deferred, never waived, and allowlists never widen silently.** Keep device, credential, manual, and third-party acceptance off unrelated critical paths, and treat a configured allowlist as a fail-closed boundary rather than a workflow level. The exact `ospec execute defer-blocker` and `loop allowlist` semantics are in `for-ai/execution-protocol.md` — open it when either situation actually arises.
- **Stop condition is three-stage:** run the project's real tests separately, record their evidence with `ospec execute verify --status`, then confirm with `ospec verify`.

## Scope

This skill covers the full lifecycle inside an initialized OSpec project: requirement intake; goal naming or matching; proposal, design, implementation-plan, task graph, and task refinement; deterministic design/plan preflight with inline approval artifacts at `artifacts/reviews/design-review.md` and `artifacts/reviews/implementation-plan-review.md`; worker dispatch, launch, collection, retry, and review packets; user decision gates; workspace and worktree planning; TDD, debug, and verification evidence; a single combined final code review; and finish planning, verification, archive readiness, and finalize closeout.

Use `ospec-change` for small routine changes that only need the classic fast flow.

## Read Order

1. `.skillrc`
2. `ospec index query <keyword...>` for the relevant `.ospec/SKILL.index.json` entries — never read the whole index file, which grows without bound as changes archive
3. `.ospec/session-brief.md` and `ospec execute status [goal] --brief`. When the brief is missing, run `ospec session [path]` first: it writes `.ospec/session-brief.json` and `.ospec/session-brief.md` with the active profile, queue state, and profile-aware next commands, and it launches no workers and edits no source files
4. the current dispatch, review, decision, or verification packet for the next action
5. target files and only the project or archived-feature docs routed by `SKILL.index.json` and `docs/project/feature-catalog.md`; use `ospec docs locate --feature <slug>` to read one section rather than a whole document

On-demand only, never at entry: the project conventions under `for-ai/` (`naming-conventions.md`, `skill-conventions.md`, `workflow-conventions.md`, `development-guide.md`), and `for-ai/execution-protocol.md` for the situations named above.

Read `proposal.md`, `design.md`, `implementation-plan.md`, task graph, worker status, evidence, and review artifacts only when the current stage or packet needs their detail. The packet is the default worker context; do not reload every goal artifact on every turn.

For legacy root-layout projects, use the same paths without the `.ospec/` prefix.

## Language

Write every goal document, artifact, and brainstorm you author in the project document language (`.skillrc` `documentLanguage` / managed `for-ai/` guidance / existing change docs). Never infer that language from product copy, site locale, or an "English-first" requirement, never switch an already-started goal unless the project rules explicitly say so, and never mix languages within one goal.

## Visibility & Decisions

- `Announce-Before-Act`: never run the goal workflow silently. Announce the current skill and stage, the `ospec execute ...` command and the artifact it writes, the selected runtime adapter, and how many workers you launch and which task each owns — naming the actual native mechanism (Claude Task, Codex/GPT `spawn_agent`, Gemini `@generalist`, OpenCode `@mention`, or the registered native primitive). When a gate blocks progress, state what is blocked and what unblocks it.
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design, and raise a durable gate (`ospec execute decision ... --required`) rather than guessing on direction, architecture, API, data, UI, risk, or scope. Never auto-select a `recommended` option or resolve a gate yourself — `recommended` is a hint you show the user, never a choice you may take; ask one question at a time and record the answer with `--answered-by user`. Present every gate through the capability ladder, in this order: a harness-native question UI when the harness has one (Claude Code `AskUserQuestion`, Gemini `ask_user`), otherwise its plan/approval UI (for example Codex plan mode), otherwise the decision report `Chat Prompt` as plain chat text. You always ask the user and wait for their actual answer; only the presentation differs. A required pending decision blocks implementation and `ospec execute dispatch` identically on every harness, so it can never be skipped. In Claude Code the managed session hook re-injects this contract and hard-blocks `Task` dispatch while a required decision is pending, but that hook is a Claude-only convenience, not the source of the rule — the contract above binds unchanged on Codex, Gemini, Grok, OpenCode, Cursor and Copilot. Only record an autonomous assumption in `design.md`, labelled as an assumption to confirm, when the user explicitly defers or is unavailable; otherwise raise the gate. Authoritative detail: `for-ai/execution-protocol.md`. If you ran `ospec brainstorm`, do not leave it an unanswered template — resolve each gate with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user` while its change is active (or pass `--change <name>`) so it archives with that change.
- `Explicit-Verification-Intent`: a user-requested verification surface such as `$browser`, a real browser E2E run, or another named skill/tool is a hard requirement. Persist it immediately with `ospec execute require-verification` and satisfy it with `ospec execute verify ... --satisfies <id>`. Final verification and archive stay blocked while required evidence is missing or stale; never offer an option that removes it.
- `Zero-Setup`: the user only starts a goal and describes the requirement — you run every OSpec command yourself and they only answer questions in chat. In a Claude Code harness at goal entry, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, run `ospec session hook --target claude --apply` once (idempotent).

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a goal.
3. If the request is new complex work, derive a concise kebab-case goal name and create it with `ospec goal <goal-name> [path]`; in Codex pass `--target codex --execution-model controller --harness-interactive true --native-subagents supported` so the persisted capability snapshot represents this IDE session.
4. If the matching active goal already exists, continue it instead of duplicating it.
5. Draft or update `design.md` from the requirement, `proposal.md`, and project context, then `implementation-plan.md` from `design.md` — identifying target files, expected results, verification commands, dependencies, parallelizable work, and conflicts — before deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code.
6. Run `ospec execute preflight [changes/active/<goal>] --stage design`, then `ospec execute preflight [changes/active/<goal>] --stage plan`. Both deterministically validate readiness (plan also re-checks the current design preflight) and record inline approval evidence. Resolve reported readiness errors in the authoritative documents; never launch a reviewer child for these stages.
7. After both preflights pass, derive `artifacts/agents/task-graph.json` from `implementation-plan.md` and `tasks.md` from the graph, then let Loop run the combined planning review before workspace or implementation dispatch. Every task node carries id, status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, worker role, and `documentation_updates` — archive is blocked while any task is missing one of them, has an invalid dependency, or the graph `status` is not `completed`. Honour the rest of the task-shape contract, specified in `for-ai/execution-protocol.md`: `parallelizable: true` for dependency/file-safe tasks with `serial_reason` / `maxParallelReason` where they are not; broad tasks split unless one atomic verification boundary requires the scope; a red test kept with the implementation it validates; automatic checks separated from external device, credential, third-party, or manual acceptance; and a `documentation_updates` array on every task (`[]` when none) whose declared docs paths also appear in that task's `target_files` with meaningful-change evidence from dispatch to completion — reviewed deletion is valid when completion evidence proves an existing baseline became missing. The `documentation_updates` entries may be written for you: `ospec docs obligations --apply` injects each required obligation's document path into the tasks carrying the array and records the resolved `path#section` in `state.json.docs_obligations`; read the obligation for the section to edit, and use `ospec docs confirm --id <obligation-id>` for a verification-type obligation whose behaviour genuinely did not change.
8. Use `ospec execute decision` for direction, architecture, API, UI, risk, or scope choices that need explicit user selection, always with `--answered-by user` when persisting the answer. Persist every named browser/E2E/manual verification requirement before implementation.
9. Drive execution with `ospec execute bootstrap`, `workspace`, `worktree`, `dispatch`, `launch`, `complete`, `retry`, `feedback`, `repair`, `sync`, `tdd`, `debug`, and `verify` as each stage needs them (`ospec execute --help` for their flags); never start another agent CLI as a fallback. Inside a controller Loop the reviews come from `ospec loop tick` — it is what binds real executor provenance and the scoped review diff — so use `ospec execute review` only outside a controller Loop. Model profiles resolve through `.skillrc.workflow.model_profiles`; `complete --usage-file` may record provider usage. Prefer `ospec execute complete <task-id> --report-file <json>` (status/summary/changedPaths/evidence/concerns, validated; the CLI renders the Markdown human view) and `ospec execute review-decision --review <artifact> --decision-file <json>` (settles the review and writes the sibling `*.findings.json` so severities are explicit — a Markdown-only review is read as `severity: unknown`, which the planning gate blocks on). The hand-written Markdown paths keep working for one version cycle. If final review is `NEEDS_CHANGES`, create one grouped repair task instead of one worker per finding.
10. Activated quality steps are archive gates, not advice. When `tdd_cycle`, `root_cause_debug`, or `verification_evidence` is active, it must appear in `tasks.md`, `verification.md`, and `artifacts/agents/task-graph.json` with matching evidence before closeout, and each activated step that passed must be listed in the `verification.md` frontmatter field `passed_optional_steps` — archive validates that field; for `tdd_cycle` record the red phase with `ospec execute tdd --phase red` *before* the implementation, because green requires a prior red `FAILED` record.
11. Use `ospec execute finish` before finalize when the goal used task graph execution or worktree planning, then `ospec finalize [changes/active/<goal>]` as the normal closeout path. Closeout is automatic when ready: once the goal is complete and `ospec verify` passes with no required user decision or blocking gate pending, run `ospec finalize` yourself — do not stop at `ospec archive ... --check` (preview only) or wait for the user to ask. **`ospec execute finish` strategy prompts (PR / merge / branch / worktree) are optional with safe defaults (`direct-closeout` + `manual` merge) — do NOT ask the user about them; uncommitted change/OSpec files are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause for a genuine human gate: a pending required decision, real verify/archive blockers, or an explicit user request to preview or approve first.
12. Run `ospec execute sync` after closeout so status and checklists derive from authoritative state. Finalize compares the first baseline with the final completed state, requires the workspace to match the latest declared-owner evidence, writes the archived change's index entry, and updates the feature catalogue — nothing is generated under `docs/project/changes/`; render the archived change later with `ospec changes show <archive>`.
13. Force archive requires explicit user acceptance and is never an automatic fallback: report the failing gates and every `NOT_VERIFIED` item first. The CLI enforces its own confirmation flags. See `for-ai/execution-protocol.md`.

## Commands

> Token economy: `--brief` on `ospec execute …` returns a lean summary instead of the full report (the artifacts are still written in full). `ospec loop run --once --compact-json` already embeds a `graph` summary and lease-lean `itemStates`; drive each step from that plus `ospec loop poll` instead of re-reading `task-graph.json` / `worker-status.md` / `launch-plan.md` or running extra status calls every turn.

Three commands per action item come back **already written** in the tick output and stay correct in
`--compact-json`: `heartbeatCommand` (claim), `resultCommand` (`ospec loop finalize …`), and
`completionCommand` (`ospec execute complete …`). Copy those; never retype them from memory. Batch
their `--action-item`/`--executor`/`--exit-code` values into one `ospec loop step --batch-file`
envelope instead of running them one at a time.

```bash
# The tick loop — you originate these on every cycle
ospec loop step [changes/active/<goal>] --batch-file batch.json   # preferred: claims + results + tick + next batch, in one call
ospec loop step [changes/active/<goal>] --batch-file claims.json --no-tick   # claim the batch you just dispatched
ospec loop run [changes/active/<goal>] --once --compact-json   # per-item fallback: observe evidence, emit the next action batch
ospec loop poll [changes/active/<goal>] --json                 # between every bounded native wait: refreshes leases, reports tickNow

# Stage gates — you originate these; the tick never hands them to you
ospec goal <goal-name> [path] [--flags flag1,flag2] [--target ...] [--execution-model controller] [--harness-interactive true|false] [--native-subagents supported|unknown|unsupported]
ospec execute decision [changes/active/<goal>] --id <id> --question "..." --option id:label:impact --required
ospec execute decision [changes/active/<goal>] --id <id> --select <option-id> --answered-by user
ospec execute dispatch [changes/active/<goal>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<goal>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--primitive subagent|goal|loop]
ospec execute complete <task-id> [changes/active/<goal>] --dispatch <id> --report-file report.json
ospec execute review-decision [changes/active/<goal>] --review artifacts/reviews/... --decision-file decision.json
ospec execute verify [changes/active/<goal>] --command "..." --status PASSED --exit-code 0 --satisfies <id>
ospec verify [changes/active/<goal>]
ospec finalize [changes/active/<goal>]
ospec loop configure [changes/active/<goal>] <flags>  # rare; `ospec loop --help` names only --max-parallel/--review-every/--execution-model for it, so the full flag set lives here: --execution-model --max-parallel(-reason) --review-gating strict|optimistic --fresh-context --max-task-repair-rounds --max-final-repair-rounds --continue-while-progressing --max-iterations --budget-tokens --budget-minutes --expires-at --allow-path --allow-command --allow-command-policy --test-command
```

Everything else is one help call away — run it instead of guessing a flag. `ospec execute --help`
lists all 25 controller subcommands with their flags, `ospec loop --help` lists the loop subcommands,
and `ospec loop allowlist` with no sub-action fails with its own usage line. `ospec triage` is the
exception: bare `ospec triage` runs `list` against the project rather than printing usage, so ask for
its help explicitly with `ospec triage --help` (subcommands: `list`, `claim`, `promote`). Also
available: `ospec status [path]` and `ospec archive [changes/active/<goal>] --check` (preview only —
do not stop there).

## Guardrails

- Do not use the goal workflow for routine one-file or low-risk changes unless the user asks for it.
- Resolve execution from `runtimeAdapter.selected.nativeSubagent`, never from a process name or PATH probe: it exists only when the capability target matches, the session is current, and native subagents are supported, so a target name alone proves nothing. Missing, mismatched, future-dated, or expired capability is a hard dispatch gate — refresh the current model session capability; there is no Orca, target-CLI, agent-CLI, or current-controller fallback.
- Launch the complete parallel-safe batch through the model harness native primitive and never duplicate completed siblings.
- Treat the emitted packet path as authoritative context. Do not paste the whole goal into each worker or reuse a reviewer context for implementation.
- Keep reviewers independent: they read scoped evidence, do not edit implementation, do not accept hidden severity downgrades, and report findings before summaries. Record actionable findings in both Markdown and the sibling structured `*.findings.json`.
- Do not claim goal closeout while document reviews, task graph, final reviews, worker status, required user decisions, or verification evidence are incomplete.
- Archived changes are frozen evidence: never edit anything under `changes/archived/`. Report metadata concerns instead of rewriting history — the knowledge index derives from the authoritative documents and self-heals its cache.
