---
name: project-ai-guide
title: AI Guide
tags: [ai, guide, ospec]
---

# AI Guide

## Goal

This document is the project-adopted AI guide copied from the OSpec mother spec. The AI must follow the project-adopted rules first instead of improvising from the mother repo.

## Working Order

1. Read `.skillrc`
2. Read `SKILL.index.json`
3. Read the project-adopted rules under `docs/project/`
4. Read the relevant `SKILL.md` files
5. Read the current change execution files
6. If Stitch is enabled and the current change activates `stitch_design_review`, inspect `artifacts/stitch/approval.json` first
7. If you need to handle Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement, read the repo-local localized plugin docs under `.ospec/plugins/<plugin>/docs/` first; if they are missing, install or enable the plugin to sync its docs before changing config

## Required Behavior

- Follow the project-adopted document language for `proposal.md`, `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/document-review-dispatches/`, `artifacts/agents/workspace-status.md`, `artifacts/agents/worktree-plan.md`, `artifacts/agents/finish-plan.md`, `artifacts/agents/launch-plan.md`, `artifacts/agents/worker-runs/`, `artifacts/agents/review-runs/`, `artifacts/agents/retries/`, `artifacts/agents/blockers/`, `artifacts/agents/decisions/`, `artifacts/agents/review-feedback-plan.md`, `tasks.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/spec-compliance.md`, `artifacts/reviews/code-quality.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `artifacts/agents/tdd-evidence.json`, `artifacts/agents/verification-evidence.json`, `verification.md`, and `review.md`
- Do not infer change-document language from product copy, default site locale, or an "English-first" business requirement alone
- If the project-adopted protocol is Chinese or the current change docs are already Chinese, keep the change docs in Chinese unless the project rules explicitly switch them to English
- Use the index to locate knowledge before reading target files
- When entering an existing OSpec project, run `ospec session [path]` to write `.ospec/session-brief.json` and `.ospec/session-brief.md` with active change, queued change, queue-run, cache fingerprint, and safe next command context; this project entry brief does not replace active-change `ospec execute bootstrap`. Use `ospec session hook [path]` only to write optional harness startup hook artifacts, including `.ospec/hooks/using-ospec.md` for session-start injection, harness target metadata, active-change bootstrap guidance, and decision/plugin gate sources
- Use `ospec brainstorm [path] --topic "..."` only for optional pre-change exploration artifacts; use `ospec plan [path] --change changes/active/<change>` only for optional plan drafts, and pass `--apply` only when updating `implementation-plan.md` deliberately
- Treat activated built-in quality policy steps such as `tdd_cycle`, `root_cause_debug`, and `verification_evidence` as archive-gated `optional_steps`; cover them in `tasks.md`, `verification.md`, and matching evidence artifacts before closeout
- In AI-assisted change execution, do not ask the user to hand-write `design.md` or `implementation-plan.md`; draft or update them from the requirement, `proposal.md`, and project context before deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code
- Ask at most one concise design question only when the missing decision materially changes direction, architecture, API, data, UI, risk, or scope; otherwise write assumptions into `design.md`
- When the change must pause for a user choice, record a durable gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the selected option with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`
- Keep `implementation-plan.md` derived from `design.md`, keep `artifacts/agents/task-graph.json` derived from `implementation-plan.md`, keep `tasks.md` derived from the task graph, and reconcile existing tasks after upstream docs are updated
- When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow its next safe action; when an active dispatch is waiting, bootstrap recommends the matching `ospec execute launch ... --task ...` command
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules without launching workers or editing source files
- Before deriving or dispatching implementation tasks, use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` to create document reviewer packets with the project session brief snapshot under `artifacts/agents/document-review-dispatches/` plus `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` when you need a controller view of ready, blocked, running, completed, and safe next task candidates
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs explicit user choice; required pending decisions appear in bootstrap/status/finish, are summarized in `artifacts/agents/decisions/index.md`, and block dispatch until selected or skipped
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety; if status is `needs_isolation`, clean the workspace or move work into an isolated git worktree before parallel dispatch
- Before creating an isolated worktree, use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`; plan mode does not run git. Use explicit `--create` to run `git worktree add`, and explicit `--cleanup` to run `git worktree remove`; both record `artifacts/agents/worktree-runs/`
- Before final closeout, use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`; this command records readiness and command text only and does not finalize, archive, push, merge, or remove worktrees. When the finish plan status is ready and no required decision is pending, run `ospec finalize [changes/active/<change>]`; use `ospec archive ... --check` only as an optional dry-run preview and do not stop after it passes
- Use `ospec execute dispatch` to create a parallel-safe batch of worker packets and `ospec execute complete` to record worker results when task-level execution needs durable handoff artifacts; each dispatch packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior; required pending user decisions block dispatch; `complete` writes `artifacts/agents/blockers/` when the result is `NEEDS_CONTEXT` or `BLOCKED`; use `--task` for one explicit task and `--limit` to cap dispatch batch size; after each `DONE` or `DONE_WITH_CONCERNS` worker result, run task-level review with `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`, then `--stage quality`, before dispatching dependent work; after all task-level reviews complete, use `ospec execute review` without `--task` for final whole-change spec or quality reviewer packets; use `ospec execute feedback` after non-`PENDING` final review decisions to write `artifacts/agents/review-feedback-plan.md`; use `ospec execute sync` to rebuild `worker-status.md` after manual execution or review artifact edits
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` after dispatch to write the native agent launch plan; it tells the controlling AI how to use the current harness agent mechanism (`spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, Task for Claude Code, `@generalist` for Gemini, and `@mention` for OpenCode). Use `--json` when an adapter needs the machine-readable launch artifact on stdout. It does not start workers or edit source files by itself
- Default to current-harness native subagents for multi-worker execution: create safe packets with `ospec execute dispatch`, inspect `launch-plan.md`, dispatch one native worker agent per safe packet, and record each result with `ospec execute complete`
- Use `ospec execute orchestrate [changes/active/<change>] --command "..."` only as the final CLI fallback when native subagents are unavailable; fallback mode renders an explicit command template, runs worker commands concurrently, records `artifacts/agents/orchestration-runs/`, captures worker runs, collects results unless `--no-collect` is passed, and reports failed-worker retry commands
- Use explicit `--run --command` on `ospec execute launch ... --run --command "..."` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed; runs capture `artifacts/agents/worker-runs/`. Then use `ospec execute collect ...` to record the fallback task result. Use `ospec execute retry` to reopen corrected blocked, needs-context, or failed work with `artifacts/agents/retries/`; completed tasks require explicit `--force`
- Use explicit `ospec execute review ... --run --command "..."` only when OSpec should run a local reviewer command; it captures `artifacts/agents/review-runs/` and can write the task-level or final review decision when `--decision` is provided
- When debugging is part of the change, use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` to record root-cause and fix evidence; it records evidence only and does not run shell commands
- After focused test runs, use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` to record TDD cycle evidence; it records evidence only and does not run shell commands
- After running fresh project checks, use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` to record verification evidence; it records evidence only and does not run shell commands
- `ospec execute doc-review` records artifacts only and does not launch reviewers, run shell commands, sync worker status, or edit source files; native subagent dispatch is done by the current AI harness, while shell commands run only for explicit worktree create/cleanup, fallback `launch --run --command`, `review --run --command`, or fallback `orchestrate` with an explicit command template
- Do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing target files, missing verification commands, or top-level `status` other than `completed`
- After implementation, every task-level spec review must complete before that task's quality review, and final `artifacts/reviews/spec-compliance.md` must complete before final `artifacts/reviews/code-quality.md`; unresolved task-level or final review decisions block archive
- During implementation and review, keep `artifacts/agents/worker-status.md` aligned with implementer, spec reviewer, quality reviewer, and controller statuses
- Do not claim completion while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; the controller status must be `DONE` before archive
- Read the project-adopted rules before implementation work
- If `stitch_design_review` is active and `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` first to generate a preview, then send the preview URL to the user for review
- If `.skillrc.plugins.stitch.project.project_id` is already set, you must reuse that exact Stitch project instead of creating a new one
- If `.skillrc.plugins.stitch.project.project_id` is empty, treat the first successful Stitch run as the canonical project and keep reusing it for later changes
- If `stitch_design_review` is active and `approval.json.status != approved`, stop at the design review gate
- Stitch page review must enforce one canonical layout per business route; do not leave multiple unclassified main layouts under the same route
- When producing `light/dark`, derive both from the same canonical screen; do not reorder modules, change information architecture, move CTAs, or create a different composition
- If the matching page already exists, prefer `edit existing screen` or `duplicate existing canonical screen and derive a theme variant`
- Every Stitch delivery must include a `screen mapping` with at least the route, canonical dark/light screen ids, whether one is derived from the other, and archived screen ids
- Old screens, explorations, and replaced screens must be archived or renamed instead of staying beside the canonical screen as peer main pages
- If canonical selection, theme pairing, screen mapping, or duplicate cleanup is missing, do not treat the review as complete
- `ospec plugins run stitch <change-path>` uses the configured Stitch provider adapter by default; only use a custom runner when `.skillrc.plugins.stitch.runner` is explicitly overridden
- If the project uses a custom runner and `token_env` is configured, confirm the matching environment variable is set before running
- If the runner, Gemini CLI, Codex CLI, stitch MCP, or auth readiness is unclear, run `ospec plugins doctor stitch <project-path>` first
- If `plugins doctor stitch` reports non-PASS for the selected provider checks, prompt the user to install the required CLI and complete the stitch MCP / API token setup in the matching user config
- For Stitch installation, provider switching, doctor remediation, MCP setup, or auth setup, read `.ospec/plugins/stitch/docs/` first and follow the plugin's documented config shape instead of inventing a `command` / `args` / `env` or stdio-proxy workaround just to satisfy doctor
- If the built-in `codex` provider succeeds on read-only calls but `create_project`, `generate_screen`, or `edit_screens` stalls locally, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project explicitly overrides `.skillrc.plugins.stitch.runner` and Codex still performs Stitch writes, the custom runner / wrapper must also pass `--dangerously-bypass-approvals-and-sandbox`
- Sync `SKILL.md` after meaningful code changes
- Rebuild `SKILL.index.json` when needed

## Project-Adopted Rules First

- Naming conventions: `docs/project/naming-conventions.md`
- SKILL conventions: `docs/project/skill-conventions.md`
- Workflow conventions: `docs/project/workflow-conventions.md`
- Development guide: `docs/project/development-guide.md`

## Stitch Provider Docs

- Provider, MCP, auth, and runner details live in `.ospec/plugins/stitch/docs/` after the Stitch plugin is installed and enabled for the project.
- If those docs are missing, install or enable Stitch first so the plugin can sync its localized docs into the repository before changing config.

## Stitch Canonical Layout

- Each business route must have exactly one canonical layout.
- `Light` and `Dark` must be theme variants of the same layout, not separate compositions.
- Theme-variant prompts must explicitly include:
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
