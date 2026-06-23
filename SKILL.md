---
name: ospec
description: Document-driven OSpec workflow for AI-assisted development with change-ready initialization, execution, validation, and archive readiness.
tags: [cli, workflow, automation, typescript, ospec, bootstrap]
---

# OSpec CLI

Document-driven OSpec workflow for AI-assisted development with change-ready initialization, execution, validation, archiving, and docs maintenance.

## Default Entry

When the user says something short like:

- `使用 ospec 初始化项目`
- `使用 ospec 初始化这个目录`
- `use ospec to initialize this directory`
- `use ospec to initialize this repo`

expand it internally as:

1. initialize the repository with `ospec init` so it ends in a change-ready state
2. if project context is missing and the AI can ask follow-up questions, ask one concise question for project summary or tech stack
3. if the user declines or the flow is CLI-only, continue with placeholder project docs
4. create the first change only when explicitly requested

Do not force the user to repeat those steps manually when the request is already clear.

Treat plain project-init intent as enough to trigger this flow. Do not require the user to restate the guardrails in a longer prompt.

## Mandatory Init Execution

When the user asks to initialize a directory, do not freehand the initialization flow.

If the user intent is simply to initialize the project or current directory, treat that as a request for this mandatory flow.

Use this exact behavior:

1. run `ospec init [path]` when the directory is uninitialized or not yet change-ready
2. in AI-assisted init, map an explicit language request or the current conversation language to `--document-language`; do not assume a brand-new repo will infer it
3. if AI assistance is available and the repository lacks usable project context, ask one concise follow-up for summary or tech stack before init when helpful
4. verify the actual filesystem result before claiming initialization is complete
5. stop before `ospec new` unless the user explicitly asks to create a change

Never replace `ospec init` with manual directory creation or a hand-written approximation.

Do not say initialization is complete unless the managed protocol-shell assets and baseline project knowledge docs actually exist on disk.

Required checks after `ospec init`:

- `.skillrc`
- `.ospec/`
- `changes/active/`
- `changes/archived/`
- `SKILL.md`
- `SKILL.index.json`
- `.ospec/tools/build-index-auto.cjs`
- `for-ai/ai-guide.md`
- `for-ai/execution-protocol.md`
- `for-ai/naming-conventions.md`
- `for-ai/skill-conventions.md`
- `for-ai/workflow-conventions.md`
- `for-ai/development-guide.md`
- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `docs/project/module-map.md`
- `docs/project/api-overview.md`

During plain init, do not report `docs/SKILL.md`, optional knowledge maps such as `knowledge/src/SKILL.md` / `knowledge/tests/SKILL.md`, or business scaffold as if they were part of change-ready completion.

## Prompt Profiles

Use these prompt styles as the preferred mental model.

### 1. Minimal Prompt

Use when the user already trusts OSpec defaults.

```text
Use ospec to initialize this project.
```

### 2. Standard Prompt

Use when you want short prompts and still want OSpec to finish initialization properly.

```text
Use ospec to initialize this project according to current OSpec rules.
```

### 3. Guided Init Prompt

Use when you want the AI to gather missing context before initialization if needed.

```text
Use ospec to initialize this project. If project context is missing, ask me for a short summary or tech stack first. If I skip it, continue with placeholder docs.
```

### 4. Docs Maintenance Prompt

Use when the repository is already initialized and the project knowledge layer needs a refresh or repair pass.

```text
Use ospec to refresh or repair the project knowledge layer for this directory. Do not create a change yet.
```

### 5. Change-Creation Prompt

Use when the user is explicitly ready to move into a small or routine execution flow.

```text
Use ospec to create and advance a change for this requirement. Respect the current project state and do not create queue work unless I ask for it.
```

### 5b. Goal-Creation Prompt

Use when the user explicitly wants the full 1.2 workflow for complex, cross-cutting, high-risk, multi-worker, or evidence-heavy work.

```text
Use ospec goal to create and advance a full goal for this requirement. Use design, implementation-plan, task graph, review, worker-status, and evidence gates.
```

### 6. Queue Prompt

Use when the user explicitly wants multiple changes queued instead of one normal active change.

```text
Use ospec to break this TODO into multiple changes, create a queue, show the queue first, and do not run it yet.
```

### 7. Queue-Run Prompt

Use when the user explicitly wants queue execution, not the normal single-change flow.

```text
Use ospec to create a change queue and execute it explicitly with ospec run manual-safe.
```

## Anti-Drift Rules

Always keep these rules:

- `ospec init` should leave the repository in a change-ready state
- in AI-assisted init, pass `--document-language` from the explicit language request or current conversation language when the project language is already apparent
- AI-assisted init may ask one concise follow-up question for missing summary or tech stack; if the user declines, continue with placeholder docs
- `ospec docs generate` refreshes, repairs, or backfills project knowledge docs after initialization
- when the user asks to initialize, execute the CLI init command and verify the protocol-shell files and `docs/project/*` files on disk before declaring success
- do not assume the project is a web or Next.js project unless the repository or user makes that explicit
- do not apply business scaffold during plain init or docs maintenance
- do not generate `docs/project/bootstrap-summary.md`
- do not create the first change automatically unless the user explicitly asks to create a change
- use `ospec new` / `ospec-change` for the classic fast change flow, and `ospec goal` / `ospec-goal` for the full workflow
- do not enter queue mode unless the user explicitly asks for queue behavior
- treat planning defaults as guidance, not as init-time templates
- use the CLI commands for verification, archiving, and targeted inspection instead of ad-hoc filesystem edits

## Visibility & Decisions

Keep the user continuously informed; never run the workflow silently.

- `Announce-Before-Act`: announce in one line which OSpec skill you are using (`ospec-goal` / `ospec-change`) and the current stage; which `ospec execute ...` command you are about to run and the artifact it writes; how many native subagents you dispatch and via which mechanism (`Task` for Claude Code, `spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, `@generalist` for Gemini, `@mention` for OpenCode); and which gate is blocking when progress stops.
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design. Surface the open questions for direction, architecture, API, data, UI, risk, and scope, and ask the user one question at a time instead of silently assuming. When any of those is genuinely open, prefer raising a durable decision gate (`ospec execute decision ... --required`, present the decision report `Chat Prompt`) over guessing; only record an autonomous assumption in `design.md` when the user explicitly defers, and label it as an assumption to confirm.
- `Zero-Setup`: the user only starts a goal (`ospec goal <name>` or just describing it) and states the requirement — they never type `ospec execute ...`, `ospec session`, or setup commands; the AI runs every OSpec command itself and the user only answers questions in chat. In a Claude Code harness, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, the AI runs `ospec session hook --target claude --apply` once (idempotent) so hard enforcement is active for the next session.

## What The CLI Manages

This CLI now covers:

- change-ready initialization
- project knowledge maintenance
- layered skill files
- execution-layer change workflow
- planning defaults for proposal and task setup
- explicit business scaffold generation when that scope is requested
- Codex and Claude Code skill install and sync checks

## Canonical Execution Files

For classic `change` work, treat `proposal.md`, `tasks.md`, `state.json`, `verification.md`, `review.md`, and plugin artifacts as the required active delivery files. For full `goal` work, also treat these as source of truth:

- `.skillrc`
- `.ospec/session-brief.md`
- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `changes/active/<change>/proposal.md`
- `changes/active/<change>/design.md`
- `changes/active/<change>/implementation-plan.md`
- `changes/active/<change>/artifacts/agents/task-graph.json`
- `changes/active/<change>/artifacts/agents/bootstrap.md`
- `changes/active/<change>/artifacts/agents/handoff.md`
- `changes/active/<change>/artifacts/agents/document-review-dispatches/`
- `changes/active/<change>/artifacts/agents/workspace-status.md`
- `changes/active/<change>/artifacts/agents/worktree-plan.md`
- `changes/active/<change>/artifacts/agents/workflow-route.json`
- `changes/active/<change>/artifacts/agents/workflow-route.md`
- `changes/active/<change>/artifacts/agents/finish-plan.md`
- `changes/active/<change>/artifacts/agents/launch-plan.md`
- `changes/active/<change>/artifacts/agents/worker-runs/`
- `changes/active/<change>/artifacts/agents/review-runs/`
- `changes/active/<change>/artifacts/agents/retries/`
- `changes/active/<change>/artifacts/agents/blockers/`
- `changes/active/<change>/artifacts/agents/decisions/`
- `changes/active/<change>/artifacts/agents/review-feedback-plan.md`
- `changes/active/<change>/tasks.md`
- `changes/active/<change>/artifacts/reviews/design-review.md`
- `changes/active/<change>/artifacts/reviews/implementation-plan-review.md`
- `changes/active/<change>/artifacts/reviews/final-review.md`
- `changes/active/<change>/artifacts/agents/worker-status.md`
- `changes/active/<change>/artifacts/agents/debug-evidence.json`
- `changes/active/<change>/artifacts/agents/tdd-evidence.json`
- `changes/active/<change>/artifacts/agents/verification-evidence.json`
- `changes/active/<change>/state.json`
- `changes/active/<change>/verification.md`

## Plugin Gates

Before advancing an active change:

- read `.skillrc.plugins` to detect enabled blocking plugins
- use `ospec session [path]` when entering an existing OSpec project to write `.ospec/session-brief.json` and `.ospec/session-brief.md`; it records active changes, queued changes, queue run state, safe next commands, and a cache fingerprint for session re-entry, and does not launch workers, run tests, inspect git, archive, or edit source files
- use `ospec session hook [path]` only to write opt-in harness startup hook artifacts under `.ospec/hooks/`; it refreshes session context only and must not launch workers, run tests, inspect git, archive, or edit source files
- use `ospec brainstorm [path] --topic "..." [--visual]` only for optional pre-change exploration artifacts under `.ospec/brainstorms/`; it does not create a change
- use `ospec plan [path] --change changes/active/<change> [--apply]` only for optional plan drafts under `.ospec/plans/`; `--apply` is required to update `implementation-plan.md`
- treat activated built-in quality policy steps such as `tdd_cycle`, `root_cause_debug`, and `verification_evidence` as archive-gated `optional_steps`; cover them in `tasks.md`, `verification.md`, and the matching evidence artifacts before closeout
- keep `changes/active/<change>/artifacts/agents/task-graph.json` aligned with `implementation-plan.md` and `tasks.md`
- do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing target files, or missing verification commands
- use `ospec execute bootstrap [changes/active/<change>]` when starting or resuming a single active change to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md`; it summarizes current stage, project session brief snapshot, and next safe action, including `ospec execute launch ... --task ...` when an active dispatch is waiting, without launching workers, syncing worker status, running tests, inspecting git, or editing source files
- use `ospec execute route [changes/active/<change>]` when the next recommended OSpec command needs to be persisted for human or AI handoff; it writes `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` without editing source files
- use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules, but does not launch workers, sync worker status, run tests, inspect git, or edit source files
- use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` before deriving or dispatching implementation tasks to create document reviewer packets with the project session brief snapshot under `artifacts/agents/document-review-dispatches/`; design review must be approved before implementation plan review, and the command does not launch reviewers, run shell commands, sync worker status, or edit source files
- use `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` when direction, architecture, API, UI, risk, or scope needs explicit user choice; present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md` when asking the user, then record the answer with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`; required pending decisions block dispatch until selected or skipped
- use `ospec execute workspace [changes/active/<change>]` before worker handoff to record git workspace safety; if status is `needs_isolation`, defer parallel dispatch until the workspace is clean or moved into an isolated git worktree
- use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write an isolated worktree preparation plan without running git
- use `ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]` only when explicitly asked to run `git worktree add`; it records stdout/stderr/status under `artifacts/agents/worktree-runs/`
- use `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` only when explicitly asked to run `git worktree remove`; it does not delete branches, push, merge, archive, run tests, or edit project source files
- use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write an artifact-only closeout readiness plan before finalize, archive, push, PR, merge, or worktree cleanup; review blockers and commands manually
- use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe worker packet batch and `artifacts/agents/execution-session.json`; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior; required pending user decisions block dispatch; use `--task` for one explicit task, use `--limit` to cap dispatch batch size, and use `ospec execute complete <task-id> ...` to record worker results; a terminal worker result opens task-level review gates, so run `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`, then `--stage quality`, before dispatching dependent work
- use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` after dispatch to write `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`; this is the native agent launch artifact and tells the controlling AI how to use the current harness native agent mechanism (`spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, Task for Claude Code, `@generalist` for Gemini, `@mention` for OpenCode, Cursor Agent/task chat, and Copilot CLI/coding-agent task). Use `--json` when an adapter needs the machine-readable launch artifact on stdout. It requires an active dispatch and ready workspace status, and does not start workers, run shell commands, or edit source files by itself
- default to current-harness native subagents for multi-worker execution: create parallel-safe packets with `ospec execute dispatch`, inspect `launch-plan.md`, then dispatch one native agent per safe packet in the current AI session; only use `ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N]` as the final CLI fallback when the current AI harness cannot dispatch native subagents. The fallback reads or creates parallel-safe dispatches, renders the explicit command template, runs worker commands concurrently, records `artifacts/agents/orchestration-runs/`, captures worker runs, collects results into the task graph unless `--no-collect` is passed, and reports failed-worker retry commands
- use `--run --command` with `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N]` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed; it captures stdout, stderr, exit code, timeout metadata, and run metadata under `artifacts/agents/worker-runs/`, then `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` records the task result
- use `ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--force]` after a blocked, needs-context, or failed run has been corrected; it writes `artifacts/agents/retries/`, reopens the task, and creates a fresh dispatch packet. Completed tasks require explicit `--force`
- keep `dispatch`, `launch`, `orchestrate`, `collect`, `retry`, and `complete` artifact-controlled: native subagent dispatch is performed by the current AI harness, while shell commands run only for explicit fallback `launch --run --command` or `orchestrate` with a command template; none of these commands edits project source files directly; when `complete` or `collect` records `NEEDS_CONTEXT` or `BLOCKED`, OSpec writes blocker escalation under `artifacts/agents/blockers/`
- complete the single `changes/active/<change>/artifacts/reviews/final-review.md` (one combined spec compliance + code quality decision)
- use `ospec execute review [changes/active/<change>] [--task task-id]` to create durable task-level or final reviewer handoff packets with the project session brief snapshot; with `--task`, run one combined code review for a completed task and write `artifacts/reviews/tasks/<task-id>/review.md`; without `--task`, run the single combined final whole-change review after the task graph is completed
- use `ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..."` only when explicitly asked to run a local reviewer command; it captures review stdout/stderr under `artifacts/agents/review-runs/` and can update the matching task-level or final review artifact when `--decision` is provided
- use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; this records how to accept, revise, clarify, or unblock review feedback, creates a required user decision gate when feedback changes scope, direction, API, UI, risk, or accepted tradeoffs, and does not edit source files or launch workers
- do not archive while any task-level review or final review decision is `PENDING`, `NEEDS_CHANGES`, or `BLOCKED`
- update `changes/active/<change>/artifacts/agents/worker-status.md` during implementation and review
- use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` when debugging was part of the change to record systematic debugging evidence; this command records evidence only and does not run shell commands
- use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after focused test runs to record TDD cycle evidence; this command records evidence only and does not run shell commands; red must not pass, green requires a prior red FAILED record, refactor requires prior passing green/refactor evidence, and SKIPPED requires a concrete summary
- use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` after running fresh project checks to record verification evidence; this command records evidence only and does not run shell commands
- use `ospec execute sync [changes/active/<change>]` after manual task graph, execution-session, review artifact, or verification checklist edits to rebuild worker status
- do not claim completion while worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; `controller_status` must be `DONE` before archive
- if the current change activates `stitch_design_review`, inspect `changes/active/<change>/artifacts/stitch/approval.json`
- when Stitch approval is missing or `status != approved`, treat the change as blocked and do not claim it is ready to continue or archive

Do not fall back to the old `features/...` layout unless the target repository really still uses it.

## Commands To Prefer

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec init [path] --document-language zh-CN
ospec init [path] --summary "..." --tech-stack node,react
ospec docs generate [path]
ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec new <change-name> [path]
ospec goal <goal-name> [path]
ospec docs status [path]
ospec skills status [path]
ospec changes status [path]
ospec queue status [path]
ospec queue add <change-name> [path]
ospec queue next [path]
ospec run start [path] --profile manual-safe
ospec run status [path]
ospec run step [path]
ospec run resume [path]
ospec run stop [path]
ospec execute status [changes/active/<change>]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]
ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N] # fallback only
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..." [--timeout-ms N] [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]
ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red --command "npm test -- focused" --status FAILED --exit-code 1 --summary "..."
ospec execute tdd [changes/active/<change>] --phase green --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec plugins available
ospec plugins info <plugin>
ospec plugins install <plugin>
ospec plugins status [path]
ospec plugins approve stitch [changes/active/<change>]
ospec plugins reject stitch [changes/active/<change>]
ospec index check [path]
ospec index build [path]
ospec workflow show
ospec workflow list-flags
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec archive [changes/active/<change>] --check
ospec finalize [changes/active/<change>]
ospec skill status ospec
ospec skill install ospec
ospec skill status ospec-change
ospec skill install ospec-change
ospec skill status ospec-goal
ospec skill install ospec-goal
ospec skill status-claude ospec
ospec skill install-claude ospec
ospec skill status-claude ospec-change
ospec skill install-claude ospec-change
ospec skill status-claude ospec-goal
ospec skill install-claude ospec-goal
```

Managed auto-sync targets for global install, `ospec init`, and `ospec update` are:

- `ospec`
- `ospec-change`
- `ospec-goal`

Additional packaged skills remain available for explicit install, for example:

```bash
ospec skill install ospec-init
ospec skill install-claude ospec-init
```

Preferred execution order for a new directory:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

Use `ospec goal <goal-name> [path]` instead of `ospec new` when the work should use the full design, plan, task graph, review, worker-status, and evidence workflow.

Use `ospec docs generate [path]` later when you need a docs-only maintenance pass.

Use `ospec session [path]` when entering an existing OSpec project and you need a durable project-level brief with active change, queued change, queue-run, safe next command context, and a cache fingerprint. Use `ospec session hook [path]` only to write opt-in startup hook artifacts for a harness. Use `ospec status [path]` separately when you want an explicit troubleshooting snapshot.

For completed changes, archive before commit. Use `ospec archive [changes/active/<change>]` to execute the archive and `--check` only when you want a readiness preview without moving files.

For the normal closeout path, prefer `ospec finalize [changes/active/<change>]`. It should verify completeness, rebuild the index, archive the change, and leave Git commit as a separate manual step.

During full change closeout, do not stop after a passing `ospec archive [changes/active/<change>] --check`; continue with `ospec finalize [changes/active/<change>]` unless the user explicitly requested preview-only output or a gate reports blockers.

## Project-Type Rules

If the repository type is unclear:

- inspect the real directory only when needed for troubleshooting or context gathering
- let initialization stay stack-agnostic
- allow the project to stay minimal except for OSpec-managed assets and baseline project docs
- let later skills or explicit project-knowledge steps shape the actual stack

This is important because valid OSpec projects include:

- web applications
- CLI tools
- Unity projects
- Godot projects
- desktop apps
- service backends
- protocol-only repositories

## Verification Discipline

Before saying work is complete:

1. verify the relevant active change
2. confirm docs, skills, and index state if project knowledge changed
3. keep `SKILL.index.json` current after meaningful skill updates
4. treat `SKILL.index.json` section offsets as LF-normalized so Windows CRLF and Linux LF checkouts do not drift
