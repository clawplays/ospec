# Usage

If you primarily use OSpec through AI, use a short `/ospec` or `/ospec-change` prompt first. Start with `/ospec-change` for small routine work and `/ospec-goal` for complex full-workflow work. Use the CLI commands on this page as fallback or explicit automation.

## Common Commands

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec new <change-name> [path]
ospec goal <goal-name> [path] [--level L1|L2|L3] [--target ...] [--execution-model controller]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec loop status [changes/active/<change>] [--brief|--json]
ospec loop configure [changes/active/<change>] --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true|false
ospec loop allowlist derive [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist check [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist apply [changes/active/<change>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<change>] --confirm
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute doc-review [changes/active/<change>] --stage design|plan --claim-executor <executor-id>
ospec execute doc-review [changes/active/<change>] --stage design|plan --complete-executor <executor-id>
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute feedback [changes/active/<change>] [--summary "..."]
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
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

`loop configure --allow-path`, `--allow-command`, and `--allow-command-policy` replace the complete selected allowlist group and print a diff; they never append silently. Prefer the task-graph `derive -> check -> apply` flow for L3. Apply uses compare-and-swap hashes, and permission expansion requires explicit `--approve-expansion`.

Specialist design and plan reviews gained bounded defaults in 1.8.3. In 1.8.9 continuous mode, two completed rounds and 30 minutes are convergence thresholds: a new structured finding-ID set can continue, while repeated or cycling sets stop. Cache hits, pending reuse, heartbeats, and recovery of the same dispatch do not consume rounds. `--force` cannot bypass a guard. Strict mode retains the exact user-authorized extra-round window.

1.8.4 introduced two-round task-review and grouped final-review repair guards. In continuous mode, those values are convergence thresholds. Changed structured finding IDs continue automatically. From 1.8.11, a stable ID also continues when both its structured finding fingerprint and the code snapshot inside the prior authorized repair scope changed. Wording-only changes, code-only churn, exact repeats, and cycles still stop before another ineffective repair. `--continue-while-progressing false` preserves the earlier strict lifetime ceilings. Approved upstream reviews remain valid across shared-file edits only when every changed path is attributable to a completed transitive downstream task; that downstream review packet inherits the upstream contracts as regression obligations. A blocked final review stops for blocker resolution instead of entering grouped repair.

1.8.12 adds explicit external-acceptance deferral for a durable `BLOCKED` task. `ospec execute defer-blocker` requires a recorded external blocker, completed dispatch evidence, and a non-empty user authorization reason. It lets dependency-safe implementation continue without changing the blocked task or checklist; final review, verification, finalization, and archive remain blocked. New plans should split external/manual acceptance from unrelated implementation critical paths.

1.8.13 resolves the next continuation layer found in resumed real Goals. Missing prerequisite reviews are dispatched before retryable dependent workers. A finding may include paths from another task only when each path belongs to a declared completed owner; OSpec freezes the full repair scope and stale owner approvals are re-reviewed. Successful bounded controller polls renew claimed child leases without moving the absolute deadline. Dispatch packets warn before unscoped full Docker Compose rebuilds so scoped verification can name only the required services.

1.8.5 prevents native child waits from freezing a Goal controller. Codex/GPT `wait_agent`, Claude Task polling, and every other native adapter must return within 60 seconds, refresh live heartbeats before `heartbeatDueAt`, persist each finished result immediately, and re-tick. Unrelated Git HEAD movement no longer invalidates an unchanged task review, while final review remains bound to both snapshot and HEAD. Unknown native capacity caps implementation batches at two without reducing conflict-safe review parallelism. New broad tasks with more than six targets must be split or include `scope_reason`.

1.8.6 clarifies that 60 seconds limits one controller poll, not the child runtime. Implementation defaults to a 120-minute absolute deadline; review and verification default to 60 minutes, with renewable heartbeat leases and a five-minute evidence-to-result grace period. `ospec loop finalize` validates durable evidence before committing success. Recursive directory snapshots, context-bound approval reuse, and improved conflict-safe selection avoid stale or repeated review without weakening provenance. New 1.8.6 serial tasks require `serial_reason`; older graphs remain readable.

## Plugin Quick Start

Recommended prompt:

```text
/ospec open Stitch for this project.
/ospec open Checkpoint for this project.
```

AI / `/ospec`:

- asking to "open Stitch" should first check whether Stitch is already installed globally, install it only when missing, then enable it in the current project
- asking to "open Checkpoint" should first check whether Checkpoint is already installed globally, install it only when missing, then enable it in the current project
- detailed plugin setup docs are synced into `.ospec/plugins/<plugin>/docs/` after enable
- before installing, check `ospec plugins info <plugin>` or `ospec plugins installed`
- if the plugin is already installed globally, skip install and just enable it in the current project
- do not run `ospec plugins update --all` unless the user explicitly asks to update every installed plugin on the machine

Command line:

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

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
ospec new <change-name> [path]
# For full workflow:
ospec goal <goal-name> [path] [--level L1|L2|L3] [--target ...] [--execution-model controller]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change And Goal Documents

`ospec new <change-name> [path]` creates the classic fast-flow files: `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`. `ospec goal <goal-name> [path]` creates the full workflow with `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/reviews/final-review.md`, and `artifacts/agents/worker-status.md`.

A goal runs as a **session-bound task-graph loop**. For IDE-native execution, report the real harness explicitly, for example `--target codex --execution-model controller --harness-interactive true --native-subagents supported`; target names alone do not authorize child agents. `ospec loop run --once` emits bounded fresh-context actions. The IDE controller records child heartbeats and per-item results, while expired or explicitly released orphan items are requeued without duplicating completed siblings. Provider usage sidecars feed the token budget, and failed verification invalidates the previous final approval before reviewed repair. L1 reports only, L2 permits assisted execution, and L3 additionally requires canonical path and shell-safe command allowlists. See [loop-engineering.md](loop-engineering.md).

- Every goal runs with three experience contracts: `Announce-Before-Act` (the AI announces its skill and stage, each `ospec execute …` command and artifact, and each subagent dispatch), `Brainstorm-First` (open direction, architecture, API, data, UI, risk, and scope decisions are asked one at a time through the native question UI — Claude Code: AskUserQuestion — before design is locked), and `Zero-Setup` (the AI runs every `ospec` command itself, so you only start a goal and describe the requirement).
- Workflow flags can activate built-in agent quality policy steps: `tdd_cycle`, `root_cause_debug`, and `verification_evidence`. Activated steps are written into change frontmatter as `optional_steps` and must be covered in `tasks.md`, `verification.md`, and archive readiness.
- Use `proposal.md` to capture why the change exists, scope, and acceptance criteria.
- Use `ospec session [path]` when entering an existing OSpec project to write `.ospec/session-brief.json` and `.ospec/session-brief.md` with active change, queue, cache fingerprint, and safe next command context. It is a project entry brief and does not replace `ospec execute bootstrap` for the active change.
- Use `ospec session hook [path]` to write `.ospec/hooks/session-start.json`, `.ospec/hooks/session-start.md`, `.ospec/hooks/using-ospec.json`, and `.ospec/hooks/using-ospec.md` for opt-in harness startup integration. These artifacts tell Codex, Claude, Gemini, OpenCode, Cursor, Copilot, and generic harnesses what to inject at session start: refresh the session brief, run active-change bootstrap when exactly one active change exists, read decision/plugin gate sources, and follow the safe next command. The hook must not launch workers, run tests, inspect git, archive, or edit source files. Add `--target claude --apply` to also write a Claude Code hook bundle under `.ospec/hooks/claude/` and idempotently merge it into `.claude/settings.json`; those hooks announce every subagent dispatch and `ospec` command at the tool level, hard-block subagent dispatch while a required decision is pending, and re-affirm the `Announce-Before-Act` / `Brainstorm-First` contract every turn (they take effect from the next Claude Code session).
- Use `ospec brainstorm [path] --topic "..."` only when you want a durable pre-change exploration artifact under `.ospec/brainstorms/`; `--visual` also writes a local static HTML companion, and `--decision-gates` turns direction, scope, and verification-risk choices into durable user decision gates when an active change can be resolved. This command does not create a change.
- Use `ospec plan [path] --change changes/active/<change>` to draft `.ospec/plans/<id>/plan-draft.md`; add `--apply` only when you want to replace that change's `implementation-plan.md`.
- For `ospec-goal`, use `design.md` to record the chosen approach, tradeoffs, affected boundaries, risks, and open questions before implementation starts.
- For `ospec-goal`, use `implementation-plan.md` to turn the design into agent-executable steps with files, expected results, verification commands, dependencies, and conflicts.
- For `ospec-goal`, use `artifacts/agents/task-graph.json` to keep the execution graph machine-readable: task IDs, dependencies, parallel safety, conflicts, target files, verification commands, expected result, worker role, and task status.
- Treat each loop action's dispatch, review, or verification packet path as authoritative context. Do not embed the full goal in every worker. Durable task status and review/verification evidence feed fresh retries, one grouped final-review repair wave, and the next loop tick.
- Use `ospec run status [path]` when using the explicit queue runner to see the current queue run plus the active change task graph snapshot, including completed, running, dispatchable, blocked, invalid, and next-action counts.
- Queue runner next instructions from `ospec run start`, `run resume`, `run step`, and `run status` use the active task graph when available, so dispatchable work points to `ospec execute dispatch ...`; the runner still does not dispatch workers or edit source files.
- Use `ospec execute bootstrap [changes/active/<change>]` when starting or resuming one active change to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow the next safe action it reports. When an active dispatch already exists, bootstrap recommends the matching `ospec execute launch ... --task ...` command.
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators. It writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, command sequence, safety rules, and missing-context warnings.
- Use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` before implementation dispatch. Specialist packets include a model-native `runtimeAdapter`; dispatch a fresh native reviewer, claim its real child id immediately, then complete it after Markdown and structured findings are ready. Reviews bind the target and controller session; design review must pass before plan review.
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` to inspect controller state and the next safe task candidates before assigning work. Use `ospec execute route [changes/active/<change>]` when you want a persistent `artifacts/agents/workflow-route.json` and `workflow-route.md` recommendation for the next OSpec command.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs an explicit user choice. A required pending decision is shown by `bootstrap`, `status`, and `finish`, and it blocks worker dispatch until you record `--select <option-id> --answered-by user` or intentionally `--skip` with the same provenance.
- Use `ospec execute workspace [changes/active/<change>]` before worker handoff to write `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if the status is `needs_isolation`, defer parallel dispatch until the workspace is clean or moved into an isolated git worktree.
- Use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` before creating an isolated worktree to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`. Plan mode records the recommended branch, path, base ref, lifecycle steps, cleanup guidance, branch-retention guidance, and command text only; it does not run git.
- Use `ospec execute worktree [changes/active/<change>] --create ...` only when you explicitly want OSpec to run `git worktree add` and capture the result under `artifacts/agents/worktree-runs/`.
- Use `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` only when you explicitly want OSpec to run `git worktree remove` for the planned or provided worktree path. Cleanup does not delete branches, push, merge, archive, or run tests.
- Use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` before final closeout to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`. It checks task graph, reviews, verification evidence, worker status, and git cleanliness, then records suggested commands plus PR, merge, branch-retention, and worktree-cleanup decision prompts without running them. When the finish plan is ready and no required decision is pending, continue with `ospec finalize [changes/active/<change>]`; `ospec archive ... --check` is only an optional dry-run preview.
- Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of `artifacts/agents/dispatches/*` worker packets and `artifacts/agents/execution-session.json`. Each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior so complex tasks can be routed to stronger workers and simple tasks can stay lightweight without guessing how each target should read context, edit files, run checks, or record completion. Then use `ospec execute complete <task-id> ...` to record worker results. Use `--task` for one explicit task and `--limit` to cap the batch size. Required pending user decisions block dispatch. Both commands also sync `artifacts/agents/worker-status.md`; when completion records `NEEDS_CONTEXT` or `BLOCKED`, OSpec writes `artifacts/agents/blockers/` escalation files for controller follow-up.
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run]` after dispatch to write the agent launch plan. Its `runtimeAdapter` accepts only a current, target-bound native-subagent capability and exposes the model's native primitive. OSpec writes `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`, requires one active dispatch and ready workspace status, and never starts a worker process itself.
- Multi-worker execution follows `runtimeAdapter.selected.nativeSubagent`: create a parallel-safe batch with `ospec execute dispatch`, inspect `launch-plan.md`, then start one model-native subagent per safe packet when the selected adapter supports parallel execution. Missing, expired, or target-mismatched capability blocks execution; there is no agent CLI or current-controller fallback. Record each result with `ospec execute complete`.
- `ospec execute orchestrate`, `ospec execute launch ... --run --command "..."`, and `ospec execute review ... --run --command "..."` are removed agent-execution paths. They return migration errors before launching a process or creating run artifacts.
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
- `ospec execute bootstrap`, `handoff`, `doc-review`, `status`, `next`, and `route` are read-only with respect to project source files; the artifact commands write only their documented state. The current model controller launches workers through `runtimeAdapter.selected.nativeSubagent`. OSpec does not execute agent CLIs.
- Worker status values are `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`, and `PENDING`; completion requires the worker statuses to be resolved and `controller_status` to be `DONE`.
- `ospec verify [changes/active/<change>]` requires only the classic files for `change` profile directories. For `goal` profile directories, it also fails when `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, document review artifacts, final review artifacts, verification evidence, or `artifacts/agents/worker-status.md` is missing or malformed, and warns when document checklists still have unchecked items.
- Keep `design.md` concise; it should make task planning more accurate, not become long-lived project documentation.

New projects initialized by `ospec init [path]` use the nested layout by default: keep `.skillrc` and `README.md` at the repository root, and place other OSpec-managed files under `.ospec/`.
Plain init does not create optional knowledge maps such as `.ospec/knowledge/src/` or `.ospec/knowledge/tests/`.
CLI commands still accept shorthand such as `changes/active/<change>`, but the physical path in nested projects is `.ospec/changes/active/<change>`.
If you want to convert an older classic project to the new layout, run `ospec layout migrate --to nested`.

## Session Hook To Finish Flow

Use this flow when an AI harness should drive one active change with durable user choices and runtime evidence:

1. Run `ospec session hook [path]` once per project refresh, then let the harness inject `.ospec/hooks/using-ospec.md` at session start.
2. Run `ospec execute bootstrap [changes/active/<change>]` when resuming the change. Follow its next instruction before dispatching work.
3. If bootstrap or status reports a pending decision, open `artifacts/agents/decisions/index.md`, present the decision report's `Chat Prompt` to the user, and record the answer with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user`.
4. Run `ospec execute workspace [changes/active/<change>]`, then `ospec execute dispatch [changes/active/<change>]`. Use `ospec execute launch ... --json` for the machine-readable native subagent contract, dispatch it with the current model harness, and record the real child result.
5. For Checkpoint-enabled changes, run `ospec plugins doctor checkpoint [path]` and repair `routes.yaml`, `flows.yaml`, baselines, screenshots, traces, console/network evidence, accessibility evidence, and assertions before closeout.
6. Use `ospec execute status`, `ospec execute next`, and `ospec execute finish` to confirm Checkpoint evidence readiness. Finish, verify, and archive are blocked until required decisions and active Checkpoint evidence are complete.

## Upgrading An Existing Project

Recommended prompt:

```text
/ospec refresh or repair the project knowledge layer for this directory. Do not create a change yet.
```

```bash
npm install -g @clawplays/ospec-cli@1.8.13
ospec update [path]
```

If you installed from this repository locally:

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` refreshes protocol docs, tooling, managed skills, archive layout metadata, and assets for already-enabled plugins.
It can also repair older OSpec projects that still have an OSpec footprint but are missing newer core runtime directories, and it normalizes legacy root `build-index-auto.*` tooling plus legacy Stitch plugin keys in `.skillrc`.
For nested projects with legacy knowledge still stored under `.ospec/src/` or `.ospec/tests/`, `ospec update [path]` migrates those paths into `.ospec/knowledge/src/` and `.ospec/knowledge/tests/`.
If an already-enabled plugin is missing globally, `ospec update [path]` attempts to restore that package before syncing project assets.
When an already-enabled plugin has a newer compatible npm package version available, `ospec update [path]` upgrades that global plugin package automatically and prints the version transition.
It does not upgrade plugins that are installed globally but not enabled in the current project.
It does not upgrade the CLI itself.
It does not migrate a classic project layout to nested automatically.
Use `ospec layout migrate --to nested` when you want the new nested layout.
It does not install brand-new plugins automatically, and it does not enable plugins or migrate active / queued changes automatically.

## Updating All Installed Plugins

Recommended prompt:

```text
/ospec update all installed plugins on this machine.
```

Use this only when you explicitly want a machine-wide plugin update, not a project-scoped refresh:

```bash
ospec plugins update --all
```

Useful variants:

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

`ospec plugins update --all` checks every globally installed plugin recorded by OSpec and upgrades each one when a newer compatible version is available.
If a recorded installed plugin package was manually deleted, this command also attempts to restore it before upgrading.
AI / `/ospec` flows should only run `ospec plugins update --all` when the user explicitly asks to update all installed plugins.
