---
name: ospec-goal
description: Create or advance a full OSpec goal using the current document, task graph, worker, review, and evidence workflow.
---

# OSpec Goal

Use this skill for complex work that needs the full OSpec workflow. A goal is intentionally heavier than a change and is the place to use design docs, implementation planning, task graph dispatch, worker/reviewer handoffs, and durable evidence.

## Loop Model

`ospec goal` creates a **session-bound Loop** automatically (`artifacts/loop/loop.json` + `state.json` + `run-log.jsonl`). You do not run a separate init step. Key contracts:

- **OSpec is the durable state-machine brain.** `ospec loop run --once` first observes the previous task, review, or verification evidence, then emits a bounded batch of action items from `task-graph.json`. Each action carries a target-bound `runtimeAdapter`; execute it only through the current model harness native subagent primitive, then record durable evidence.
- **IDE controller auto-dispatch is mandatory for executable L2/L3 goals.** L1 is report-only and never starts implementation/review/verifier action batches; for implementation, present the safety-level decision first and wait for the user to choose L2 or L3. After creating or resuming an executable goal, do not stop at "Loop initialized", ask the user to run Loop commands, or wait for another prompt. Once actions are ready, run `ospec loop run <goal-path> --once --json`, immediately consume every returned action through `runtimeAdapter.selected`, record durable evidence as each executor finishes, and tick again. Stop only for an actual required user decision, unavailable independent/isolated executor, blocking safety/plugin gate, configured guard/STOP, terminal failure that needs user authority, explicit user pause, or `done`.
- **Harness capability is explicit and target-bound.** In Codex create executable work with `--target codex --execution-model controller --harness-interactive true --native-subagents supported`; use the equivalent actual target in other IDEs. A target name alone never proves that native children exist. `runtimeAdapter.selected` exists only when the capability target matches, the session is current, and native subagents are supported. There is no Orca, target-CLI, or current-controller fallback.
- **Executor lifecycle is durable and bounded.** After native subagent dispatch, record `ospec loop heartbeat <goal> --action-item <id> --executor <child-id>` and refresh every live child before its `heartbeatDueAt`. Never make one indefinite native wait: Codex/GPT use `wait_agent` for at most 60 seconds per poll, Claude uses bounded background Task polling when available, and every other native adapter follows its published `maxWaitMs`. Sixty seconds limits one controller poll, not the child runtime; a live child continues across polls up to its action deadline. Commit each finished child with its emitted `ospec loop finalize ...` command, persist completed siblings immediately, and re-run `loop run --once --json` after every poll. Each successful bounded controller poll renews the short lease for already-claimed live children without extending the absolute deadline. A poll may recover that same claim only within one bounded 60-second wait after the short-lease boundary; direct late results remain rejected, a controller that stops polling still lets orphan leases expire, and no renewal moves the absolute deadline. Successful finalize requires authoritative durable evidence; evidence-complete work receives a bounded result grace period. Legacy `loop result` remains supported. Use `ospec loop recover --force` only when the prior session/child is known to be gone. Expired items requeue; completed siblings do not.
- **Independent document reviewers are bound to a native child.** Read `dispatch.runtimeAdapter.selected.nativeSubagent`, start one fresh model-native reviewer, immediately claim its real child id, refresh long reviews with `--heartbeat-executor`, and finish with `--complete-executor`. Reviews bind the target, controller session, child, timestamp, document hash, and findings provenance.
- **Safety level chosen at creation via a decision gate.** Prefer presenting an `AskUserQuestion` for L1/L2/L3 as the first decision; otherwise pass `ospec goal <name> --level L1|L2|L3` (default L1). L1 = report-only (findings go to triage, no code changes); L2 = assisted (real changes but required-decision gates hard-block); L3 = unattended within an allowlist.
- **Required decisions block every level.** Present each required decision to the user, never auto-select the recommendation, and record the answer with `ospec execute decision ... --select ... --answered-by user` before the loop proceeds. New brainstorm resolutions require the same `--answered-by user` provenance. L3 additionally requires non-empty path and command allowlists; it does not bypass human decision gates.
- **`/goal` is capability-probed, not inferred from a target name.** `ospec execute launch --primitive goal` produces a native-`/goal` instruction only when the current harness explicitly reports support; otherwise the same controller runs the verify-driven loop through native subagents.
- **Scheduling is session-bound.** Controller mode re-runs `loop run --once` and consumes the emitted action batch through `runtimeAdapter.selected.nativeSubagent`. Unknown native capacity uses the default implementation concurrency of three while leaving conflict-safe review batches under the configured limit. When the current harness can authoritatively report a larger positive child capacity, bind it to the active controller session and raise `maxParallel` as appropriate; reported capacities such as 5-10 replace the fallback but never override dependencies, file conflicts, token funding, or the configured maximum. Never guess capacity from a provider name or stale session. If the session capability expires, OSpec blocks instead of starting an agent CLI.
- **Progress and feedback are artifact-backed.** Task status, task/final review decisions, grouped repair waves, verification evidence, `state.json`, and `run-log.jsonl` carry progress between fresh contexts. Process exit alone does not complete an action. Dispatch only items returned in `actions`; a durable `pending` record with an empty action list is observation state and must not be relaunched.
- **Worker reports are task-owned review evidence.** Every fresh task review binds the exact canonical `artifacts/agents/worker-reports/<task-id>.md` into its target snapshot. A structured repair may name only that same task's exact report path; another task's report, a parent artifact directory, review history, and arbitrary controller evidence remain out of scope. If an older review finding names a canonical report that its dispatch did not snapshot, execute the fresh task-review action emitted by Loop before repair; do not hand-edit or delete the old finding.
- **Guards are enforced before new work.** Pause/STOP, iteration/deadline/token/time budgets, no-progress limits, comprehension-review checkpoints, required decisions, approved document reviews, ready workspace evidence, and L3 allowlists can stop or pause the loop.
- **Document review is convergent.** Specialist design/plan review uses two rounds and 30 minutes as default convergence thresholds. In continuous mode, a new structured finding-ID set may continue automatically; a repeated or cycling set stops. Cache/pending reuse, heartbeat, lease recovery, and deterministic preflight do not consume rounds. Legacy imported completions without a durable decision still count as rounds but expose unavailable convergence context, so changed authoritative documents receive a fresh review without rewriting the append-only ledger. Never use `--force` to bypass a guard. Strict mode retains the exact user-authorized extra-round window. Read the prior findings sidecar and resolution evidence before the full document when revising. Every structured finding must have a non-empty unique ID.
- **Review repair is convergent and regression-aware.** A downstream task that shares target files inherits transitive upstream regression obligations. Retryable dependent work waits for every missing prerequisite review to receive Loop executor provenance. A finding may cross the current task boundary only when every extra path belongs to a declared completed task; OSpec freezes the complete scope and re-reviews changed owners. While any recorded cross-task owner remains unapproved, its review or repair precedes new implementation and retryable worker work; other conflict-safe reviewers may stay parallel. Unknown or unfinished scope owners remain blocked. The default two-round values are convergence thresholds. Changed structured finding IDs continue automatically. A stable ID may also continue only when both its structured finding fingerprint and its authorized repair-scope code snapshot changed. In continuous mode, stalled task or final findings receive one durable strategy escalation for that exact scope and finding-ID set; follow its root-cause and regression instructions, then stop if the same set remains stalled because the same strategy key cannot be issued twice. Strict mode retains its configured limit. A blocked final review requires blocker resolution and must not enter grouped repair. Never raise a limit to repeat unchanged work.
- **Verification scope must be proportional.** Treat an unscoped `docker compose up --build` or `docker-compose up --build` warning as a required preflight: inspect repository release guidance and prefer explicit service names unless the task genuinely requires rebuilding every service. Do not download or rebuild unrelated optional runtimes merely to verify a scoped application change.
- **External acceptance may be deferred, never waived.** Keep device, credential, manual, and third-party acceptance out of unrelated implementation critical paths. When durable implementation exists and the user explicitly authorizes moving only external acceptance to the final gate, use `ospec execute defer-blocker`; the task stays `BLOCKED` and unchecked, while dependency-safe implementation may continue. Final review, verification, finalization, and archive remain hard-blocked until the real evidence exists.
- **Allowlist updates are replacement or explicit CAS.** Repeated `loop configure --allow-*` calls replace the complete selected list and print a diff; they never append. For L3 derive/check/apply the exact task-graph permissions, review the diff, and pass `--approve-expansion` only for an intended expansion.
- **Stop condition is three-stage:** run the project's real tests, record evidence with `ospec execute verify --status`, then confirm with `ospec verify`.

## Scope

This skill covers the full lifecycle inside an initialized OSpec project:

- requirement intake
- goal naming or matching
- proposal, design, implementation-plan, task graph, and task refinement
- document review for design and implementation plan
- independent approval artifacts at `artifacts/reviews/design-review.md` and `artifacts/reviews/implementation-plan-review.md`
- worker dispatch, launch, collection, retry, and review packets
- user decision gates
- workspace and worktree planning
- TDD, debug, and verification evidence
- a single combined final code review
- finish planning, verification, archive readiness, and finalize closeout

Use `ospec-change` for small routine changes that only need the classic fast flow.

## Read Order

1. `.skillrc`
2. `.ospec/SKILL.index.json` for nested projects, or root `SKILL.index.json`
3. `.ospec/session-brief.md` and `ospec execute status [goal] --brief`
4. the current dispatch, review, decision, or verification packet for the next action
5. target files and only the project or archived-feature docs routed by `SKILL.index.json` and `docs/project/feature-index.md`

Read `proposal.md`, `design.md`, `implementation-plan.md`, task graph, worker status, evidence, and review artifacts only when the current stage or packet needs their detail. The packet is the default worker context; do not reload every goal artifact on every turn.

For legacy root-layout projects, use the same paths without the `.ospec/` prefix.

## Language

- Follow the project-adopted document language from managed `for-ai/` guidance, `.skillrc` `documentLanguage`, and existing change docs.
- Write **every** goal document and artifact you author — `proposal.md`, `design.md`, `implementation-plan.md`, `tasks.md`, `verification.md`, `review.md`, review artifacts, and brainstorm content — in that one language. Do not mix Chinese and English within a change.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Visibility & Decisions

- `Announce-Before-Act`: never run the goal workflow silently. Announce the current skill/stage, the `ospec execute ...` command and artifact, the selected runtime adapter, how many workers are launched, and which task each owns. Name the actual native mechanism: Claude Task, Codex/GPT `spawn_agent`, Gemini `@generalist`, OpenCode `@mention`, or the registered native target primitive. When a gate blocks progress, state what is blocked and what unblocks it.
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design. Surface the open questions for direction, architecture, API, data, UI, risk, and scope, and ask the user one question at a time instead of silently assuming. **NEVER auto-select the recommended option or resolve a decision gate yourself — `recommended` is only a hint to show the user. Present every gate to the user and wait for their actual choice; required gates block implementation and dispatch until the user answers. Do not run the whole goal in one shot without asking.** Persist exploration with `ospec brainstorm [path] --topic "..."` when useful, and do not leave a brainstorm as an unanswered template — ask the user its decision gates and record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user` so it has a result. Resolve the brainstorm while its change is the active change (or pass `--change <name>`) so it links to that change and archives together with it — the brainstorm directory name need not match the change name. When any of those is genuinely open, prefer raising a durable decision gate over guessing: `ospec execute decision [changes/active/<goal>] --id <id> --question "..." --option id:label:impact --required`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the answer with `--select <option-id> --answered-by user`. Only record an autonomous assumption in `design.md` when the user explicitly defers or is unavailable, and label it as an assumption to confirm. Present options using the best interactive mechanism your harness has: a native question UI (Claude Code `AskUserQuestion`, Gemini `ask_user`) if available, otherwise your plan/approval UI (Codex Plan mode) if available, otherwise the decision report `Chat Prompt` as plain chat text. `ospec session hook --target claude --apply` installs hooks that re-affirm this contract and hard-block subagent dispatch while a required decision is pending. On harnesses without a native picker or plan UI present the decision report `Chat Prompt` in chat instead — the asking step and the `ospec execute dispatch` block on required pending decisions are identical on every harness, so you always ask the user, only the presentation differs.
- `Explicit-Verification-Intent`: a user-requested verification surface such as `$browser`, a real browser E2E run, or another named skill/tool is a hard requirement. Immediately persist it with `ospec execute require-verification <goal> --id <id> --kind browser|e2e|manual --description "..."`; record successful evidence with `ospec execute verify ... --satisfies <id>`. Final verification and archive remain blocked while required evidence is missing or stale. Do not auto-select or recommend a verification option that removes it.
- `Zero-Setup`: the user only starts a goal and describes the requirement — never make them run setup or `ospec execute ...` commands; you run every OSpec command yourself and the user only answers questions in chat. In a Claude Code harness at goal entry, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, run `ospec session hook --target claude --apply` once (idempotent) so hard enforcement is active for the next session.

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a goal.
3. If the request is new complex work, derive a concise kebab-case goal name and create it with `ospec goal <goal-name> [path]`; for executable Codex work pass `--level L2|L3 --target codex --execution-model controller --harness-interactive true --native-subagents supported` so the persisted capability snapshot represents this IDE session.
4. If the matching active goal already exists, continue it instead of duplicating it.
5. Draft or update `design.md` from the requirement, `proposal.md`, and project context before editing `implementation-plan.md`, deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code.
6. Draft or update `implementation-plan.md` from `design.md`; identify target files, expected results, verification commands, dependencies, parallelizable work, and conflicts.
7. Derive `artifacts/agents/task-graph.json` from `implementation-plan.md`; give every task a `documentation_updates` array (`[]` when none), include every declared docs path in the same task's `target_files`, and require meaningful-change evidence from dispatch to completion; derive `tasks.md` from the task graph. Reviewed deletion is valid when completion evidence proves an existing baseline became missing. Across repair attempts, finalize compares the first baseline with the final completed state and requires the workspace to match the latest declared-owner evidence; do not restore a legitimately deleted document or rewrite history to satisfy archive. If controller closeout changes a declared path after the last worker dispatch, a later APPROVED task review may authorize the final state only when its executor provenance is valid and its target snapshot exactly matches the current path; it never replaces the meaningful-change chain. Run `ospec execute sync` after closeout so localized worker-status sections and checklists derive from authoritative review and verification state instead of manual edits. Mark every dependency/file-safe task `parallelizable: true`; every generated `parallelizable: false` task must include `serial_reason`, and `maxParallel=1` must include `maxParallelReason`. Split tasks with more than six `target_files`; when one atomic verification boundary genuinely requires that breadth, record a concrete `scope_reason`. Split implementation/automatic checks from external device, credential, third-party, or manual acceptance so an unavailable external gate cannot block unrelated implementation; downstream work may depend on the implementation slice, while the external acceptance remains a final hard gate. For L3 use `ospec loop allowlist derive/check/apply --from-task-graph` so exact paths and commands fail before expensive document reviewers run; never assume repeated configure calls append. Finalize also generates one indexed `docs/project/changes/<archive-path>.md` for this goal; its preflight refuses to overwrite a human-owned file at that path, and the generated summary does not replace required architecture, API, module, or operational documentation.
8. Run `ospec execute doc-review [changes/active/<goal>] --stage design`. When it reports `Reused approval: yes`, do not launch another reviewer. Otherwise execute one fresh independent design reviewer through `dispatch.runtimeAdapter`, immediately claim its real executor id, wait for Markdown plus structured findings, then complete that executor. Approval must validate before plan review.
9. Run `ospec execute doc-review [changes/active/<goal>] --stage plan`. Reuse a valid approval; otherwise execute one fresh independent plan reviewer through `dispatch.runtimeAdapter`, claim its real executor id, wait for findings, then complete it before worker dispatch. The controlling AI must not self-approve either review.
10. Use `ospec execute decision` for direction, architecture, API, UI, risk, or scope choices that need explicit user selection, and always include `--answered-by user` when persisting the user's answer. Persist every named browser/E2E/manual verification requirement before implementation.
11. Use `ospec execute workspace`, `dispatch`, `launch`, `complete`, `review`, `feedback`, `repair`, `sync`, `tdd`, `debug`, and `verify` as needed for the full workflow. Run `ospec loop run <goal-path> --once --json`, dispatch every emitted packet through `runtimeAdapter.selected.nativeSubagent`, record completion/review evidence as each child finishes, and tick again without waiting for another user prompt. Never start Orca, Codex, Claude, or another agent CLI as a fallback. Model profiles are logical and resolve through `.skillrc.workflow.model_profiles`; `complete --usage-file` may record provider usage. Require reviewers to write Markdown plus sibling structured `*.findings.json`. If final review is `NEEDS_CHANGES`, create one grouped repair task instead of one worker per finding.
12. Do not archive while task graph status, task-level reviews, final reviews, worker status, required user decisions, document reviews, or verification evidence are incomplete during normal closeout.
13. Use `ospec execute finish` before finalize when the goal used task graph execution or worktree planning.
14. Use `ospec finalize [changes/active/<goal>]` as the normal closeout path. Closeout is automatic when ready: once the goal is complete and `ospec verify` passes with no required user decision or blocking gate pending, run `ospec finalize` yourself — do not stop at `ospec archive ... --check` (preview only) or wait for the user to ask. **`ospec execute finish` strategy prompts (PR / merge / branch / worktree) are optional with safe defaults (`direct-closeout` + `manual` merge) — do NOT ask the user about them; uncommitted change/OSpec files are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause for a genuine human gate: a pending required decision, an unapproved blocking plugin gate (e.g. Checkpoint), real verify/archive blockers, or an explicit user request to preview or approve first.
15. Force archive is never automatic. Only after the user explicitly asks to accept an incomplete Goal, report every failing gate and `NOT_VERIFIED` item, then double-check the Loop action items. A retained pending pointer is allowed only when every item is durably `completed`, `failed`, or `expired`; missing, `issued`, or `running` items still block. Run `ospec finalize [changes/active/<goal>] --force-archive --confirm-force-archive <exact-goal-name> --reason "<accepted risk>"`. Do not rewrite failed evidence as passed. The resulting archive remains `forced`, `incomplete`, and `accepted-risk`, not completed behavior.

## Commands

> Token economy: pass `--brief` on `ospec execute …` commands to get a token-lean summary (status, key fields, and the next instruction) instead of the full report — the artifacts are still written in full, so read them only when you need detail. Drive each step from `ospec execute status --brief` rather than re-reading the full `task-graph.json` / `worker-status.md` / `launch-plan.md` every turn.

```bash
ospec status [path]
ospec goal <goal-name> [path] [--flags flag1,flag2] [--level L1|L2|L3] [--target ...] [--execution-model controller] [--harness-interactive true|false] [--native-subagents supported|unknown|unsupported]
ospec execute status [changes/active/<goal>] --brief
ospec loop status [changes/active/<goal>]
ospec loop status [changes/active/<goal>] --brief|--json
ospec loop run [changes/active/<goal>] [--once] [--json]  # prefer JSON for runtime-adapter dispatch
ospec loop tick-plan [changes/active/<goal>]
ospec loop level [changes/active/<goal>] <L1|L2|L3>
ospec loop configure [changes/active/<goal>] --execution-model controller --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true --fresh-context true
ospec loop configure [changes/active/<goal>] --max-iterations N --budget-tokens N --budget-minutes N --expires-at <ISO-8601>
ospec loop configure [changes/active/<goal>] --allow-path <path> --allow-command <prefix> --test-command <command>
ospec loop configure [changes/active/<goal>] --allow-command-policy '{"command":"go","argsPrefix":["test"],"cwd":"src/backend"}'
ospec loop allowlist derive [changes/active/<goal>] --from-task-graph --json
ospec loop allowlist check [changes/active/<goal>] --from-task-graph --json
ospec loop allowlist apply [changes/active/<goal>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<goal>] --confirm
ospec loop pause [changes/active/<goal>]
ospec loop resume [changes/active/<goal>]
ospec loop heartbeat [changes/active/<goal>] --action-item <id> --executor <child-id> [--lease-ms N]
ospec loop result [changes/active/<goal>] --action-item <id> --executor <child-id> --exit-code N [--tokens-used N] [--summary "..."] [--timed-out]
ospec loop recover [changes/active/<goal>] [--force]
ospec triage list [path]
ospec triage claim [path] --id <id> --by <name>
ospec triage promote [path] --id <id>
ospec execute launch [changes/active/<goal>] [--task task-id] [--target ...] [--primitive subagent|goal|loop] [--until "..."] [--max-iterations N] [--interval 10m]
ospec execute bootstrap [changes/active/<goal>]
ospec execute doc-review [changes/active/<goal>] --stage design
ospec execute doc-review [changes/active/<goal>] --stage plan
ospec execute doc-review [changes/active/<goal>] --stage design|plan --claim-executor <executor-id>
ospec execute doc-review [changes/active/<goal>] --stage design|plan --heartbeat-executor <child-id>
ospec execute doc-review [changes/active/<goal>] --stage design|plan --complete-executor <child-id>
ospec execute decision [changes/active/<goal>] --id <id> --question "..." --option id:label:impact --required
ospec execute decision [changes/active/<goal>] --id <id> --select <option-id> --answered-by user
ospec execute decision [changes/active/<goal>] --id <id> --question "Allow one extra review round?" --option allow:Allow:impact --option stop:Stop:impact --required --document-review-stage design|plan --review-context-hash <sha256> --review-round <number> --review-approval-option allow
ospec execute workspace [changes/active/<goal>]
ospec execute dispatch [changes/active/<goal>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<goal>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute complete <task-id> [changes/active/<goal>] --status DONE --summary "..."
ospec execute complete <task-id> [changes/active/<goal>] --status DONE --usage-file usage.json
ospec execute defer-blocker <task-id> [changes/active/<goal>] --reason "User authorized external acceptance at final review"
ospec loop tick [changes/active/<goal>]                       # controller-owned task/final review with real executor provenance
ospec execute review [changes/active/<goal>] --task task-id   # non-controller workflow only
ospec execute review [changes/active/<goal>]                  # non-controller final review only
ospec execute repair [changes/active/<goal>]                  # one task for the complete NEEDS_CHANGES findings list
ospec execute tdd [changes/active/<goal>] --phase red|green|refactor --command "..." --status ...
ospec execute debug [changes/active/<goal>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --status ...
ospec execute require-verification [changes/active/<goal>] --id <id> --kind browser|e2e|manual --description "..."
ospec execute verify [changes/active/<goal>] --command "..." --status PASSED --exit-code 0 --satisfies <id>
ospec execute sync [changes/active/<goal>]
ospec execute finish [changes/active/<goal>] [--target main] [--remote origin]
ospec verify [changes/active/<goal>]
ospec archive [changes/active/<goal>] --check
ospec finalize [changes/active/<goal>]
ospec finalize [changes/active/<goal>] --force-archive --confirm-force-archive <exact-goal-name> --reason "<accepted risk>"
```

## Guardrails

- Do not use the goal workflow for routine one-file or low-risk changes unless the user asks for it.
- Resolve execution from `runtimeAdapter.selected.nativeSubagent`, never from a process name or PATH probe. The capability must be current and bound to the configured target.
- Launch the complete parallel-safe batch through the model harness native primitive and never duplicate completed siblings.
- Missing, mismatched, future-dated, or expired native capability is a hard dispatch gate. Refresh the current model session capability; do not fall back to an agent CLI or the controller context.
- Treat the emitted packet path as authoritative context. Do not paste the whole goal into each worker or reuse a reviewer context for implementation.
- Do not claim goal closeout while document reviews, task graph, final reviews, worker status, required user decisions, or verification evidence are incomplete.
- If real project tests exist, run them separately before recording verification evidence.
