# Usage

If you primarily use OSpec through AI / `/ospec`, use a short `/ospec` or `/ospec-change` prompt first. Start with `/ospec-change` for small routine work and `/ospec-goal` for complex full-workflow work. Use the CLI commands on this page as fallback or explicit automation.

## Common Commands

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec docs locate --feature <slug> | --affects <path> [--json]
ospec docs obligations [changes/active/<change>] [--apply] [--json]
ospec docs confirm [changes/active/<change>] --id <obligation-id> [--note "..."]
ospec docs audit [path] [--json]
ospec docs migrate [path] --plan|--verify|--finalize [--apply]
ospec changes show <archive> [--md|--json]
ospec index gc [path]ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec change <change-name> [path]
ospec goal <goal-name> [path] [--target ...] [--execution-model controller]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec loop status [changes/active/<change>] [--brief|--json]
ospec loop run [changes/active/<change>] --once --json
ospec loop tick [changes/active/<change>] --json
ospec loop heartbeat [changes/active/<change>] --action-item <id> --executor <child-id>
ospec loop finalize [changes/active/<change>] --action-item <id> --executor <child-id> --exit-code 0 --summary "..."
ospec loop recover [changes/active/<change>] --force
ospec loop configure [changes/active/<change>] --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true|false
ospec loop allowlist derive [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist check [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist apply [changes/active/<change>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<change>] --confirm
ospec execute bootstrap [changes/active/<goal>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]
ospec execute preflight [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute feedback [changes/active/<change>] [--summary "..."]
ospec execute repair [changes/active/<change>]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute require-verification [changes/active/<change>] --id <id> --kind browser|e2e|test|lint|build|manual|other --description "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --satisfies <id> --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> (--reason "..." | --reason-file <path>)
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
```

`loop configure --allow-path`, `--allow-command`, and `--allow-command-policy` configure an optional extra boundary, replace the complete selected allowlist group, and print a diff. Prefer the task-graph `derive -> check -> apply` flow. Apply uses compare-and-swap hashes, and permission expansion requires explicit `--approve-expansion`.

## Current Workflow Behavior

- **Force archive:** use it only after the user explicitly accepts unresolved risk. It requires `--force-archive`, an exact-name `--confirm-force-archive`, and a non-empty reason. Failed and `NOT_VERIFIED` evidence stays unchanged. A retained Controller pointer is safe only when it contains at least one item and every item is durably `completed`, `failed`, or `expired`; missing, `issued`, `running`, or other nonterminal states still block. The archive remains visibly `forced`, `incomplete`, and `accepted-risk`.
- **Review convergence:** planning documents use deterministic inline preflight with no reviewer child or token reservation. Task/final repair still uses bounded convergence thresholds: a stable finding continues only when both its fingerprint and authorized repair-scope snapshot materially changed, while repeats, cycles, wording-only changes, and code-only churn stop.
- **External acceptance:** `ospec execute defer-blocker` requires an existing durable external blocker, completed dispatch evidence, and explicit user authorization. It permits dependency-safe implementation to continue but leaves the task blocked and keeps final review, verification, finalize, and archive gated.
- **Repair ownership:** prerequisite reviews run before dependent retries. Cross-task repair paths must belong to declared completed owners, use a frozen scope, and trigger fresh owner review when approvals become stale. A task review snapshots its canonical worker report; exact same-task report repair is allowed, while stale or legacy evidence routes through a fresh review instead of history edits.
- **Documentation closeout:** reviewed creation and deletion are meaningful state transitions. Evidence is aggregated from the first baseline through the final completed dispatch, and the workspace must match the latest declared-owner evidence. A later authoritative APPROVED review may bind the exact final snapshot without replacing the meaningful-change chain. `ospec execute sync` updates localized worker status and combined-review checklists.
- **Classic Change:** `ospec change` is the preferred fast path and `ospec new` remains an alias. A user-selected Change never auto-promotes to a Goal. It uses compact stage-aware guidance, one lightweight current-AI review, practical documentation rules, derived closeout state, one finalize index rebuild, and sequential queue execution. `APPROVED` and `APPROVED_WITH_CONCERNS` may archive automatically when all other gates pass.
- **Controller runtime and concurrency:** one native wait returns within 60 seconds, but a live child continues until its absolute deadline while heartbeats are renewed. Unknown native capacity uses an implementation concurrency fallback of three, not two; a larger positive session-bound capacity can support configured batches such as 5-10 when dependencies, file conflicts, shared resources, token funding, and `maxParallel` allow. New serial tasks require `serial_reason`, and tasks with more than six targets must be split or declare `scope_reason`.

## Recommended Flow

Recommended prompts:

```text
/ospec initialize this project.
/ospec-change create and advance a change for this requirement.
/ospec-goal create and advance a full goal for this requirement.
/ospec archive this accepted change.
```

For a fresh directory:

```bash
ospec init [path]
ospec change <change-name> [path]
# For full workflow:
ospec goal <goal-name> [path] [--target ...] [--execution-model controller]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

All `ospec execute` task-graph/controller commands above are Goal-only except `ospec execute decision`, which is shared for durable user choices. A classic Change uses `ospec progress`, direct implementation, top-level `ospec verify`, lightweight `review.md`, and `ospec finalize`; it must not create Goal bootstrap, task graph, worker dispatch, or Loop artifacts.

## Change And Goal Documents

`ospec change <change-name> [path]` creates the classic fast-flow files: `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`; `ospec new` remains a compatible alias. `ospec goal <goal-name> [path]` creates the full workflow with `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/reviews/final-review.md`, and `artifacts/agents/worker-status.md`.

A goal runs as a **session-bound task-graph loop** with one fast quality workflow. For IDE-native execution, report the real harness explicitly, for example `--target codex --execution-model controller --harness-interactive true --native-subagents supported`; target names alone do not authorize child agents. Run deterministic design and plan preflights, derive the graph, then complete one independent combined planning review before workspace and worker dispatch. One grouped planning repair and one re-review are the maximum. Use `ospec loop run --once --compact-json` for token-lean action output. Optional allowlists add exact path and command boundaries. See [loop-engineering.md](loop-engineering.md).

- Every goal runs with three experience contracts: `Announce-Before-Act` (the AI announces its skill and stage, each `ospec execute …` command and artifact, and each subagent dispatch), `Brainstorm-First` (open direction, architecture, API, data, UI, risk, and scope decisions are asked one at a time through the native question UI — Claude Code: AskUserQuestion — before design is locked), and `Zero-Setup` (the AI runs every `ospec` command itself, so you only start a goal and describe the requirement).
- Workflow flags can activate built-in agent quality policy steps: `tdd_cycle`, `root_cause_debug`, and `verification_evidence`. Activated steps are written into change frontmatter as `optional_steps` and must be covered in `tasks.md`, `verification.md`, and archive readiness.
- Use `proposal.md` to capture why the change exists, scope, and acceptance criteria.
- Use `ospec session [path]` when entering an existing OSpec project to write `.ospec/session-brief.json` and `.ospec/session-brief.md` with active work, its `change` or `goal` profile, queue state, cache fingerprint, and profile-aware next commands. A Change continues directly from its five classic files; only a Goal uses `ospec execute bootstrap`.
- Use `ospec session hook [path]` to write `.ospec/hooks/session-start.json`, `.ospec/hooks/session-start.md`, `.ospec/hooks/using-ospec.json`, and `.ospec/hooks/using-ospec.md` for opt-in harness startup integration. These artifacts tell Codex, Claude, Gemini, OpenCode, Cursor, Copilot, and generic harnesses to refresh the session brief, follow its profile-aware commands, bootstrap only an active Goal, and read decision gate sources. The hook must not launch workers, run tests, inspect git, archive, or edit source files. Add `--target claude --apply` to also write a Claude Code hook bundle under `.ospec/hooks/claude/` and idempotently merge it into `.claude/settings.json`; those hooks announce every subagent dispatch and `ospec` command at the tool level, hard-block subagent dispatch while a required decision is pending, and re-affirm the `Announce-Before-Act` / `Brainstorm-First` contract every turn (they take effect from the next Claude Code session).
- Use `ospec brainstorm [path] --topic "..."` only when you want a durable pre-change exploration artifact under `.ospec/brainstorms/`; `--visual` also writes a local static HTML companion, and `--decision-gates` turns direction, scope, and verification-risk choices into durable user decision gates when an active change can be resolved. This command does not create a change.
- Use `ospec plan [path] --change changes/active/<change>` to draft `.ospec/plans/<id>/plan-draft.md`; add `--apply` only when you want to replace that change's `implementation-plan.md`.
- For `ospec-goal`, use `design.md` to record the chosen approach, tradeoffs, affected boundaries, risks, and open questions before implementation starts.
- For `ospec-goal`, use `implementation-plan.md` to turn the design into agent-executable steps with files, expected results, verification commands, dependencies, and conflicts.
- For `ospec-goal`, use `artifacts/agents/task-graph.json` to keep the execution graph machine-readable: task IDs, dependencies, parallel safety, conflicts, target files, verification commands, expected result, worker role, and task status.
- Treat each loop action's dispatch, review, or verification packet path as authoritative context. Do not embed the full goal in every worker. Durable task status and review/verification evidence feed fresh retries, grouped final-review repair, and the next loop tick. In continuous mode, a stalled finding set receives one durable root-cause strategy escalation before the Loop stops repeated work.
- Use `ospec run status [path]` when using the explicit queue runner to see the current queue run plus the active change task graph snapshot, including completed, running, dispatchable, blocked, invalid, and next-action counts.
- Queue runner next instructions from `ospec run start`, `run resume`, `run step`, and `run status` use the active task graph when available, so dispatchable work points to `ospec execute dispatch ...`; the runner still does not dispatch workers or edit source files.
- Use `ospec execute bootstrap [changes/active/<goal>]` when starting or resuming one active Goal to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow the next safe action it reports. When an active dispatch already exists, bootstrap recommends the matching `ospec execute launch ... --task ...` command.
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators. It writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, command sequence, safety rules, and missing-context warnings.
- Before deriving the task graph, run `ospec execute preflight [changes/active/<change>] --stage design`, then `--stage plan`. Both commands run deterministic inline readiness checks and record approval evidence under `artifacts/agents/planning-preflights/` without launching a reviewer child. Derive or refresh the graph only after both pass, then let Loop issue the combined planning review.
- Use `ospec execute status [changes/active/<goal>]` or `ospec execute next [changes/active/<goal>]` to inspect Goal controller state and the next safe task candidates before assigning work. Use `ospec execute route [changes/active/<goal>]` when you want a persistent `artifacts/agents/workflow-route.json` and `workflow-route.md` recommendation for the next OSpec command.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs an explicit user choice. A required pending decision is shown by `bootstrap`, `status`, and `finish`, and it blocks worker dispatch until you record `--select <option-id> --answered-by user` or intentionally `--skip` with the same provenance.
- Use `ospec execute workspace [changes/active/<change>]` before worker handoff to write `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if the status is `needs_isolation`, defer parallel dispatch until the workspace is clean or moved into an isolated git worktree.
- Use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` before creating an isolated worktree to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`. Plan mode records the recommended branch, path, base ref, lifecycle steps, cleanup guidance, branch-retention guidance, and command text only; it does not run git.
- Use `ospec execute worktree [changes/active/<change>] --create ...` only when you explicitly want OSpec to run `git worktree add` and capture the result under `artifacts/agents/worktree-runs/`.
- Use `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` only when you explicitly want OSpec to run `git worktree remove` for the planned or provided worktree path. Cleanup does not delete branches, push, merge, archive, or run tests.
- Use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` before final closeout to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`. It checks task graph, reviews, verification evidence, worker status, and git cleanliness, then records suggested commands plus PR, merge, branch-retention, and worktree-cleanup decision prompts without running them. When the finish plan is ready and no required decision is pending, continue with `ospec finalize [changes/active/<change>]`; `ospec archive ... --check` is only an optional dry-run preview.
- Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of `artifacts/agents/dispatches/*` worker packets and `artifacts/agents/execution-session.json`. Each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior so complex tasks can be routed to stronger workers and simple tasks can stay lightweight without guessing how each target should read context, edit files, run checks, or record completion. Then use `ospec execute complete <task-id> ...` to record worker results. Use `--task` for one explicit task and `--limit` to cap the batch size. Required pending user decisions block dispatch. Both commands also sync `artifacts/agents/worker-status.md`; when completion records `NEEDS_CONTEXT` or `BLOCKED`, OSpec writes `artifacts/agents/blockers/` escalation files for controller follow-up.
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot] [--dry-run]` after dispatch to write the agent launch plan. Its `runtimeAdapter` accepts only a current, target-bound native-subagent capability and exposes the model's native primitive. OSpec writes `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`, requires one active dispatch and ready workspace status, and never starts a worker process itself.
- Multi-worker execution follows `runtimeAdapter.selected.nativeSubagent`: create a parallel-safe batch with `ospec execute dispatch`, inspect `launch-plan.md`, then start one model-native subagent per safe packet when the selected adapter supports parallel execution. Missing, expired, or target-mismatched capability blocks execution; there is no agent CLI or current-controller fallback. Record each result with `ospec execute complete`.
- There is no agent CLI execution path. `ospec execute orchestrate` no longer exists, and `ospec execute launch ... --run --command "..."` / `ospec execute review ... --run --command "..."` reject those flags before launching a process or creating run artifacts.
- Use `ospec execute retry [changes/active/<change>] --task task-id` after a blocked, needs-context, or failed worker run has been fixed. It writes `artifacts/agents/retries/`, reopens the task, and creates a fresh dispatch packet. Completed tasks are not retried by default; pass `--force` only for an intentional override.
- Use `ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."` only after the user explicitly authorizes moving an already-recorded external acceptance obligation to the final gate. The command never marks the task complete or supplies missing evidence; it only permits tasks waiting solely on that blocker to become dispatchable.
- In a controller-owned Goal, use `ospec loop tick [changes/active/<change>]` after completed worker tasks and after graph completion; it issues task and final reviews with real executor provenance. Use `ospec execute review` directly only in a non-controller workflow.
- Use `ospec execute feedback [changes/active/<change>] [--summary "..."]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`. It records whether to accept, revise, clarify, or unblock review feedback before more work is dispatched, and creates a required user decision gate when feedback affects scope, direction, API, UI, risk, or accepted tradeoffs.
- Use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` when debugging was part of the change to record staged `artifacts/agents/debug-evidence.json` and a per-debug evidence report. `CONFIRMED` records confirmed phase evidence; `FIXED` records a verified fix; `BLOCKED` fails verification.
- Use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after running focused tests to record `artifacts/agents/tdd-evidence.json` and a per-cycle evidence report. Red must record a non-passing focused test before implementation, green requires a prior red `FAILED` record, refactor requires prior passing green/refactor evidence, and `SKIPPED` requires a concrete summary.
- Use `ospec execute require-verification` to persist user-requested browser, E2E, or manual verification surfaces. Record fresh passing evidence with repeatable `--satisfies <id>`; final verification and archive remain blocked while a required entry is missing or stale.
- Use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` after running fresh project checks to record `artifacts/agents/verification-evidence.json` and a per-run evidence report. PASSED evidence without an explicit zero exit code is rejected.
- Use `ospec execute sync [changes/active/<change>]` to synchronize worker status, bootstrap-derived `state.json`, and the project session brief after manual edits.
- Use `tasks.md` to break the accepted implementation plan into executable work.
- Use the single `artifacts/reviews/final-review.md` to record one combined decision on both "built the right thing" (spec compliance) and "built it well" (code quality).
- Use `artifacts/agents/worker-status.md` to record implementer, spec reviewer, quality reviewer, and controller statuses.
- In AI / `/ospec-change` flows, the AI keeps the small flow focused on `proposal.md`, `tasks.md`, implementation, `verification.md`, and `review.md`.
- In AI / `/ospec-goal` flows, the AI drafts or updates `design.md`, `implementation-plan.md`, and `artifacts/agents/task-graph.json` from the requirement, `proposal.md`, and project context; you only need to review assumptions or correct important decisions.
- Task graph status values are `DONE`, `DONE_WITH_CONCERNS`, `IN_PROGRESS`, `NEEDS_CONTEXT`, `BLOCKED`, and `PENDING`; archive readiness requires top-level `status: "completed"` and all tasks to be `DONE` or `DONE_WITH_CONCERNS`.
- Goal-only `ospec execute bootstrap`, `handoff`, `preflight`, `status`, `next`, and `route` are read-only with respect to project source files; the artifact commands write only their documented state. The current model controller launches workers through `runtimeAdapter.selected.nativeSubagent`. OSpec does not execute agent CLIs.
- Worker status values are `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`, and `PENDING`; completion requires the worker statuses to be resolved and `controller_status` to be `DONE`.
- `ospec verify [changes/active/<change>]` requires only the classic files for `change` profile directories. For `goal` profile directories, it also fails when `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, document review artifacts, final review artifacts, verification evidence, or `artifacts/agents/worker-status.md` is missing or malformed, and warns when document checklists still have unchecked items.
- Keep `design.md` concise; it should make task planning more accurate, not become long-lived project documentation.

New projects initialized by `ospec init [path]` use the nested layout by default: keep `.skillrc` and `README.md` at the repository root, and place other OSpec-managed files under `.ospec/`.
Plain init does not create optional knowledge maps such as `.ospec/knowledge/src/` or `.ospec/knowledge/tests/`.
CLI commands still accept shorthand such as `changes/active/<change>`, but the physical path in nested projects is `.ospec/changes/active/<change>`.
If you want to convert an older classic project to the new layout, run `ospec layout migrate --to nested`.

## Goal Session Hook To Finish Flow

Use this flow when an AI harness should drive one active Goal with durable user choices and runtime evidence. A classic Change does not enter this controller flow:

1. Run `ospec session hook [path]` once per project refresh, then let the harness inject `.ospec/hooks/using-ospec.md` at session start.
2. Run `ospec execute bootstrap [changes/active/<goal>]` when resuming the Goal. Follow its next instruction before dispatching work.
3. If bootstrap or status reports a pending decision, open `artifacts/agents/decisions/index.md`, present the decision report's `Chat Prompt` to the user, and record the answer with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user`.
4. Run `ospec execute workspace [changes/active/<change>]`, then `ospec execute dispatch [changes/active/<change>]`. Use `ospec execute launch ... --json` for the machine-readable native subagent contract, dispatch it with the current model harness, and record the real child result.
5. Use `ospec execute status`, `ospec execute next`, and `ospec execute finish` to confirm closeout readiness. Finish, verify, and archive are blocked until required decisions are resolved.

## Upgrading An Existing Project

Recommended prompt:

```text
/ospec refresh or repair the project knowledge layer for this directory. Do not create a change yet.
```

```bash
npm install -g @clawplays/ospec-cli@2.0.1
ospec update [path]
```

If you installed from this repository locally:

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` refreshes protocol docs, tooling, managed skills, and archive layout metadata.
It can also repair older OSpec projects that still have an OSpec footprint but are missing newer core runtime directories, and it normalizes legacy root `build-index-auto.*` tooling.
For nested projects with legacy knowledge still stored under `.ospec/src/` or `.ospec/tests/`, `ospec update [path]` migrates those paths into `.ospec/knowledge/src/` and `.ospec/knowledge/tests/`.
It does not upgrade the CLI itself.
It does not migrate a classic project layout to nested automatically.
Use `ospec layout migrate --to nested` when you want the new nested layout.
It does not migrate active / queued changes automatically.
