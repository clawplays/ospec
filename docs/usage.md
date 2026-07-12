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
ospec goal <goal-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
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
ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N] # fallback only
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute review [changes/active/<change>] [--task task-id] --run --command "..." [--timeout-ms N] [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]
ospec execute feedback [changes/active/<change>] [--summary "..."]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."
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
ospec goal <goal-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change And Goal Documents

`ospec new <change-name> [path]` creates the classic fast-flow files: `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`. `ospec goal <goal-name> [path]` creates the full workflow with `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/reviews/final-review.md`, and `artifacts/agents/worker-status.md`.

A goal runs as a **session-bound loop**: it plans, acts, and verifies in rounds until the work is proven by tests. Pick a safety level when you start it — `ospec goal <name> --level L1|L2|L3` (default L1): **L1** reports findings to a triage inbox without changing anything, **L2** makes changes but pauses at key decisions, **L3** runs unattended within an allowlist. Drive it with `ospec loop run/watch/status/pause/resume/level`, review findings with `ospec triage list/claim/promote`, and stop it by pausing, dropping a `STOP` file, or closing your session. `ospec change` is unchanged. See [loop-engineering.md](loop-engineering.md).

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
- Use `ospec run status [path]` when using the explicit queue runner to see the current queue run plus the active change task graph snapshot, including completed, running, dispatchable, blocked, invalid, and next-action counts.
- Queue runner next instructions from `ospec run start`, `run resume`, `run step`, and `run status` use the active task graph when available, so dispatchable work points to `ospec execute dispatch ...`; the runner still does not dispatch workers or edit source files.
- Use `ospec execute bootstrap [changes/active/<change>]` when starting or resuming one active change to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow the next safe action it reports. When an active dispatch already exists, bootstrap recommends the matching `ospec execute launch ... --task ...` command.
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators. It writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, command sequence, safety rules, and missing-context warnings.
- Use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` before implementation dispatch to create `artifacts/agents/document-review-dispatches/*` packets with the project session brief snapshot and `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before plan review.
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` to inspect controller state and the next safe task candidates before assigning work. Use `ospec execute route [changes/active/<change>]` when you want a persistent `artifacts/agents/workflow-route.json` and `workflow-route.md` recommendation for the next OSpec command.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs an explicit user choice. A required pending decision is shown by `bootstrap`, `status`, and `finish`, and it blocks worker dispatch until you record `--select <option-id>` or intentionally `--skip`.
- Use `ospec execute workspace [changes/active/<change>]` before worker handoff to write `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if the status is `needs_isolation`, defer parallel dispatch until the workspace is clean or moved into an isolated git worktree.
- Use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` before creating an isolated worktree to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`. Plan mode records the recommended branch, path, base ref, lifecycle steps, cleanup guidance, branch-retention guidance, and command text only; it does not run git.
- Use `ospec execute worktree [changes/active/<change>] --create ...` only when you explicitly want OSpec to run `git worktree add` and capture the result under `artifacts/agents/worktree-runs/`.
- Use `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` only when you explicitly want OSpec to run `git worktree remove` for the planned or provided worktree path. Cleanup does not delete branches, push, merge, archive, or run tests.
- Use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` before final closeout to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`. It checks task graph, reviews, verification evidence, worker status, and git cleanliness, then records suggested commands plus PR, merge, branch-retention, and worktree-cleanup decision prompts without running them. When the finish plan is ready and no required decision is pending, continue with `ospec finalize [changes/active/<change>]`; `ospec archive ... --check` is only an optional dry-run preview.
- Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of `artifacts/agents/dispatches/*` worker packets and `artifacts/agents/execution-session.json`. Each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior so complex tasks can be routed to stronger workers and simple tasks can stay lightweight without guessing how each target should read context, edit files, run checks, or record completion. Then use `ospec execute complete <task-id> ...` to record worker results. Use `--task` for one explicit task and `--limit` to cap the batch size. Required pending user decisions block dispatch. Both commands also sync `artifacts/agents/worker-status.md`; when completion records `NEEDS_CONTEXT` or `BLOCKED`, OSpec writes `artifacts/agents/blockers/` escalation files for controller follow-up.
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]` after dispatch to write the native agent launch plan. It records how the controlling AI should use the current harness native agent mechanism: Codex/GPT use `spawn_agent` / `wait_agent` / `close_agent`, Claude Code uses Task, Gemini uses `@generalist`, OpenCode uses `@mention`, Cursor uses Agent/task chat, and Copilot uses CLI/coding-agent tasks. OSpec writes `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`, requires one active dispatch and ready workspace status, and does not start workers or run shell commands by itself.
- Default multi-worker execution is current-harness native subagents: create a parallel-safe batch with `ospec execute dispatch`, inspect `launch-plan.md`, then dispatch one native worker agent per safe packet from the AI session. Record each result with `ospec execute complete`.
- Use `ospec execute orchestrate [changes/active/<change>] --command "..."` only as the final CLI fallback when the current AI harness cannot dispatch native subagents. In fallback mode, OSpec reads or creates the current parallel-safe dispatch batch, renders the harness command template for each packet, runs worker commands concurrently, writes `artifacts/agents/orchestration-runs/`, and collects each run back into the task graph. Templates support placeholders such as `{{packet}}`, `{{taskId}}`, `{{dispatchId}}`, `{{changePath}}`, and `{{projectRoot}}`; worker commands also receive `OSPEC_PACKET_PATH`, `OSPEC_TASK_ID`, `OSPEC_DISPATCH_ID`, `OSPEC_CHANGE_PATH`, and `OSPEC_PROJECT_ROOT`.
- Use `ospec execute launch ... --run --command "..."` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed. OSpec captures stdout/stderr, timeout metadata, and the exit code under `artifacts/agents/worker-runs/`; then use `ospec execute collect ...` to turn that run into task completion state.
- Use `ospec execute retry [changes/active/<change>] --task task-id` after a blocked, needs-context, or failed worker run has been fixed. It writes `artifacts/agents/retries/`, reopens the task, and creates a fresh dispatch packet. Completed tasks are not retried by default; pass `--force` only for an intentional override.
- Use `ospec execute review [changes/active/<change>] --task <task-id>` after each completed worker task to run one combined code review (spec compliance + code quality in a single pass). The task-level decision is stored at `artifacts/reviews/tasks/<task-id>/review.md`, and dependent tasks stay blocked until that one review is approved.
- Use `ospec execute review [changes/active/<change>]` without `--task` after the task graph is complete to create one combined final whole-change `artifacts/agents/review-dispatches/*` reviewer packet with the project session brief snapshot. It writes a single `artifacts/reviews/final-review.md` decision.
- Use `ospec execute review ... --run --command "..."` only when you explicitly want OSpec to run a local reviewer command. OSpec captures the run under `artifacts/agents/review-runs/` and can update the matching task-level or final review artifact when `--decision` is provided. Use `--timeout-ms` to limit reviewer command runtime.
- Use `ospec execute feedback [changes/active/<change>] [--summary "..."]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`. It records whether to accept, revise, clarify, or unblock review feedback before more work is dispatched, and creates a required user decision gate when feedback affects scope, direction, API, UI, risk, or accepted tradeoffs.
- Use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` when debugging was part of the change to record staged `artifacts/agents/debug-evidence.json` and a per-debug evidence report. `CONFIRMED` records confirmed phase evidence; `FIXED` records a verified fix; `BLOCKED` fails verification.
- Use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after running focused tests to record `artifacts/agents/tdd-evidence.json` and a per-cycle evidence report. Red must record a non-passing focused test before implementation, green requires a prior red `FAILED` record, refactor requires prior passing green/refactor evidence, and `SKIPPED` requires a concrete summary.
- Use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` after running fresh project checks to record `artifacts/agents/verification-evidence.json` and a per-run evidence report.
- Use `ospec execute sync [changes/active/<change>]` to rebuild `artifacts/agents/worker-status.md` from task graph, execution session, review artifacts, and verification checklist state after manual edits.
- Use `tasks.md` to break the accepted implementation plan into executable work.
- Use the single `artifacts/reviews/final-review.md` to record one combined decision on both "built the right thing" (spec compliance) and "built it well" (code quality).
- Use `artifacts/agents/worker-status.md` to record implementer, spec reviewer, quality reviewer, and controller statuses.
- In AI / `/ospec-change` flows, the AI keeps the small flow focused on `proposal.md`, `tasks.md`, implementation, `verification.md`, and `review.md`.
- In AI / `/ospec-goal` flows, the AI drafts or updates `design.md`, `implementation-plan.md`, and `artifacts/agents/task-graph.json` from the requirement, `proposal.md`, and project context; you only need to review assumptions or correct important decisions.
- Task graph status values are `DONE`, `DONE_WITH_CONCERNS`, `IN_PROGRESS`, `NEEDS_CONTEXT`, `BLOCKED`, and `PENDING`; archive readiness requires top-level `status: "completed"` and all tasks to be `DONE` or `DONE_WITH_CONCERNS`.
- `ospec execute bootstrap`, `handoff`, `doc-review`, `status`, `next`, and `route` are read-only with respect to project source files; `bootstrap`, `handoff`, `doc-review`, and `route` write their own artifacts. `workspace`, plan-mode `worktree`, and `finish` only inspect git/artifact state and write workspace/worktree/finish artifacts; `dispatch`, `launch`, `collect`, `retry`, `complete`, `review`, `feedback`, `decision`, `debug`, `tdd`, `verify`, and `sync` only update OSpec artifacts and task graph, decisions, launch-plan, worker-runs, review-runs, retries, review-dispatch, review-feedback-plan, debug-evidence, tdd-evidence, verification-evidence, or worker-status state. They do not edit project source files directly. Native subagent dispatch is performed by the current AI harness. Shell commands run only when `execute worktree --create`, `execute worktree --cleanup`, fallback `execute orchestrate --command "..."`, fallback `execute launch --run --command "..."`, or `execute review --run --command "..."` is passed explicitly.
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
3. If bootstrap or status reports a pending decision, open `artifacts/agents/decisions/index.md`, present the decision report's `Chat Prompt` to the user, and record the answer with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`.
4. Run `ospec execute workspace [changes/active/<change>]`, then `ospec execute dispatch [changes/active/<change>]`. Use `ospec execute launch ... --json` when an adapter needs machine-readable launch data; use `--run --command` only as a CLI fallback.
5. For Checkpoint-enabled changes, run `ospec plugins doctor checkpoint [path]` and repair `routes.yaml`, `flows.yaml`, baselines, screenshots, traces, console/network evidence, accessibility evidence, and assertions before closeout.
6. Use `ospec execute status`, `ospec execute next`, and `ospec execute finish` to confirm Checkpoint evidence readiness. Finish, verify, and archive are blocked until required decisions and active Checkpoint evidence are complete.

## Upgrading An Existing Project

Recommended prompt:

```text
/ospec refresh or repair the project knowledge layer for this directory. Do not create a change yet.
```

```bash
npm install -g @clawplays/ospec-cli@1.7.0
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
