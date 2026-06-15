---
name: project-execution-protocol
title: Execution Protocol
tags: [ai, protocol, ospec]
---

# AI Execution Protocol

## Read First Every Time You Enter A Project

1. `.skillrc`
2. `.ospec/session-brief.md` if it exists; otherwise run `ospec session [path]` in initialized projects to create it
3. `SKILL.index.json`
4. `docs/project/naming-conventions.md`
5. `docs/project/skill-conventions.md`
6. `docs/project/workflow-conventions.md`
7. The current change files: `proposal.md / design.md / implementation-plan.md / artifacts/agents/task-graph.json / artifacts/agents/bootstrap.md / artifacts/agents/handoff.md / artifacts/agents/document-review-dispatches/ / artifacts/agents/launch-plan.md / artifacts/agents/decisions/ / artifacts/agents/review-feedback-plan.md / tasks.md / artifacts/reviews/design-review.md / artifacts/reviews/implementation-plan-review.md / artifacts/reviews/spec-compliance.md / artifacts/reviews/code-quality.md / artifacts/agents/worker-status.md / artifacts/agents/debug-evidence.json / state.json / verification.md`
8. If `stitch_design_review` exists, read `artifacts/stitch/approval.json`
9. If Stitch or Checkpoint provider, MCP, auth, install, or enable config must be changed, read the repo-local localized plugin docs under `.ospec/plugins/<plugin>/docs/` first; if they are missing, install or enable the plugin to sync its docs before changing config

## Mandatory Rules

- Keep `proposal.md`, `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/document-review-dispatches/`, `artifacts/agents/workspace-status.md`, `artifacts/agents/worktree-plan.md`, `artifacts/agents/finish-plan.md`, `artifacts/agents/launch-plan.md`, `artifacts/agents/worker-runs/`, `artifacts/agents/review-runs/`, `artifacts/agents/retries/`, `artifacts/agents/blockers/`, `artifacts/agents/decisions/`, `artifacts/agents/review-feedback-plan.md`, `tasks.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/spec-compliance.md`, `artifacts/reviews/code-quality.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `artifacts/agents/tdd-evidence.json`, `artifacts/agents/verification-evidence.json`, `verification.md`, and `review.md` in the project-adopted document language
- Do not rewrite change docs into English just because the product UI, site locale, or requirement text is English-first
- If the current change docs are already Chinese, continue in Chinese unless the project rules explicitly require an English switch
- Do not skip proposal/design/implementation-plan/task-graph/tasks/review-artifacts/worker-status and jump straight into completion
- When entering an existing OSpec project, use `ospec session [path]` to write `.ospec/session-brief.json` and `.ospec/session-brief.md`; it records active changes, queued changes, queue-run state, cache fingerprint, and safe next commands without launching workers, running tests, inspecting git, archiving, or editing source files. Use `ospec session hook [path]` only to write opt-in harness startup hook artifacts under `.ospec/hooks/`, including `using-ospec.md` with session-start injection steps, harness targets, active-change bootstrap guidance, and decision/plugin gate sources
- Use `ospec brainstorm [path] --topic "..."` only for optional pre-change exploration artifacts under `.ospec/brainstorms/`; `--visual` adds a local static HTML companion and the command does not create a change
- Use `ospec plan [path] --change changes/active/<change>` for optional plan drafts under `.ospec/plans/`; pass `--apply` only when deliberately updating that change's `implementation-plan.md`
- Treat activated built-in quality policy steps such as `tdd_cycle`, `root_cause_debug`, and `verification_evidence` as archive-gated `optional_steps`; cover them in `tasks.md`, `verification.md`, and matching evidence artifacts before closeout
- During AI-assisted change execution, draft or update `design.md` after `proposal.md` and before editing `implementation-plan.md`, `tasks.md`, or code
- Ask one concise design question only when a missing decision would materially change direction, architecture, API, data, UI, risk, or scope; otherwise record assumptions in `design.md`
- When the change must pause for a user choice, record a durable gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the selected option with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`
- Draft or update `implementation-plan.md` from `design.md`, including target files, expected results, verification commands, dependencies, parallelizable work, and conflicts
- Derive `artifacts/agents/task-graph.json` from `implementation-plan.md`; each task must include id, status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role
- When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow its next safe action
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules without launching workers or editing source files
- Before deriving or dispatching implementation tasks, use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` to create document reviewer packets with the project session brief snapshot under `artifacts/agents/document-review-dispatches/` and review artifacts at `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review. This command records artifacts only and does not launch reviewers, run shell commands, sync worker status, or edit source files
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` to inspect controller state and safe next task candidates before assigning task work
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs explicit user choice; required pending decisions appear in bootstrap/status/finish, are summarized in `artifacts/agents/decisions/index.md`, and block dispatch until selected or skipped
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to write `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if status is `needs_isolation`, clean the workspace or move work into an isolated git worktree before parallel dispatch
- Before creating an isolated worktree, use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`; plan mode records a preparation plan only and does not run git. Use explicit `--create` to run `git worktree add`, and explicit `--cleanup` to run `git worktree remove`; both write `artifacts/agents/worktree-runs/`, and cleanup does not delete branches
- Before final closeout, use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`; this command records readiness and command text only and does not finalize, archive, push, merge, or remove worktrees
- Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of worker packets and `artifacts/agents/execution-session.json`; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior. Use `ospec execute complete <task-id> ...` to record worker results. Use `--task` for one explicit task and `--limit` to cap dispatch batch size. These commands also sync `artifacts/agents/worker-status.md`, update OSpec artifacts only, and do not launch external workers; required pending user decisions block dispatch; `complete` writes blocker escalation artifacts under `artifacts/agents/blockers/` when the result is `NEEDS_CONTEXT` or `BLOCKED`
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` after dispatch to write the native agent launch plan; it tells the controlling AI how to use the current harness agent mechanism (`spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, Task for Claude Code, `@generalist` for Gemini, `@mention` for OpenCode, Cursor Agent/task chat, and Copilot CLI/coding-agent task). Use `--json` when an adapter needs the machine-readable launch artifact on stdout. It does not start workers or run shell commands by itself
- Default to current-harness native subagents for multi-worker execution: create safe packets with `ospec execute dispatch`, inspect `launch-plan.md`, dispatch one native worker agent per safe packet, and record each result with `ospec execute complete`
- Use `ospec execute orchestrate [changes/active/<change>] --command "..."` only as the final CLI fallback when native subagents are unavailable; fallback mode renders an explicit command template, runs worker commands concurrently, records `artifacts/agents/orchestration-runs/`, captures worker runs, collects results unless `--no-collect` is passed, and reports failed-worker retry commands
- Use explicit `--run --command` on `ospec execute launch ... --run --command "..."` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed; runs capture `artifacts/agents/worker-runs/`. Then use `ospec execute collect ...` to record the fallback task result. Use `ospec execute retry` to reopen corrected blocked, needs-context, or failed work with `artifacts/agents/retries/`; completed tasks require explicit `--force`
- After a worker records `DONE` or `DONE_WITH_CONCERNS`, use `ospec execute review [changes/active/<change>] --task <task-id> --stage spec` and then `--stage quality` to create task-level reviewer packets; task-level decisions are stored under `artifacts/reviews/tasks/<task-id>/`, and dependent tasks stay blocked until both task reviews are approved
- After all task-level reviews are approved and the task graph is completed, use `ospec execute review [changes/active/<change>] [--stage spec|quality]` without `--task` to create final whole-change reviewer packets with the project session brief snapshot under `artifacts/agents/review-dispatches/`; final spec review must be approved before final quality review is dispatched
- Use explicit `ospec execute review ... --run --command "..."` only when OSpec should run a local reviewer command; it captures `artifacts/agents/review-runs/` and can write the task-level or final review decision when `--decision` is provided
- Use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; handle review feedback through accept, revise, clarify, or blocked actions before dispatching more work, and create a required user decision gate when feedback changes scope, direction, API, UI, risk, or accepted tradeoffs
- When debugging is part of the change, use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` to record `artifacts/agents/debug-evidence.json`; `CONFIRMED` isolates root cause, `FIXED` verifies the fix, and `BLOCKED` fails verification
- After focused test runs, use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` to record `artifacts/agents/tdd-evidence.json`; red must record a non-passing focused test before implementation, green requires a prior red `FAILED` record, refactor requires prior passing green/refactor evidence, and `SKIPPED` requires a concrete summary
- After running fresh project verification commands, use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` to record `artifacts/agents/verification-evidence.json`; do not claim completion with only an unrecorded chat summary
- Use `ospec execute sync [changes/active/<change>]` after manual task graph, execution-session, review artifact, debug evidence, or verification checklist edits to rebuild `artifacts/agents/worker-status.md`
- Derive `tasks.md` from `artifacts/agents/task-graph.json`; if tasks already exist but upstream docs are still templates, update them first and then reconcile tasks
- Do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing execution details, or top-level `status` other than `completed`
- Complete every task-level spec review before that task's quality review, then complete final `artifacts/reviews/spec-compliance.md` before final `artifacts/reviews/code-quality.md`; unresolved task-level or final review decisions block archive
- During implementation and review, keep `artifacts/agents/worker-status.md` aligned with implementer, spec reviewer, quality reviewer, and controller statuses
- Do not treat the change as complete while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; `controller_status` must be `DONE` before archive
- Use `state.json` as the execution status source of truth
- Activated optional steps must appear in `artifacts/agents/task-graph.json`, `tasks.md`, and `verification.md`
- If `stitch_design_review` is active and `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` first to submit a design preview
- Stitch design review must enforce one canonical layout per route; non-canonical screens under the same route must be explicitly marked as `archive / old / exploration`
- For `light/dark` theme variants, keep the same canonical layout and only transform the visual theme; do not reorder modules, regroup sections, move CTAs, or alter navigation structure
- If the matching page already exists, prefer `edit existing screen` or `duplicate existing canonical screen and derive a theme variant`
- Every Stitch delivery must output `screen mapping` with at least the route, canonical dark/light screen ids, derived relationship, and archived screen ids
- Old, exploratory, and replaced screens must not remain beside canonical screens as peer main pages
- If `.skillrc.plugins.stitch.project.project_id` exists, reuse that exact Stitch project ID and do not create a separate Stitch project for this change
- If the canonical Stitch project is still empty, the first successful Stitch submission becomes the canonical project for the repository
- Before running Stitch, assume the built-in `stitch` plugin uses the configured provider by default; only treat `.skillrc.plugins.stitch.runner` as authoritative when the project explicitly overrides it
- If the project uses a custom runner and `token_env` is configured, confirm the matching environment variable is set
- If the local Stitch bridge, Gemini CLI, Codex CLI, stitch MCP, or auth readiness is unclear, run `ospec plugins doctor stitch <project-path>` first
- If `plugins doctor stitch` reveals provider, MCP, or auth issues, return to `.ospec/plugins/stitch/docs/` first; do not invent an alternate `command` / `args` / `env` or stdio-proxy config outside the plugin docs
- If the built-in `codex` provider can complete read-only calls but `create_project`, `generate_screen`, or `edit_screens` stalls locally, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project explicitly overrides `.skillrc.plugins.stitch.runner` and still uses Codex for Stitch writes, the custom runner / wrapper must also pass `--dangerously-bypass-approvals-and-sandbox`
- If `stitch_design_review` is active and `approval.json.status != approved`, do not treat the change as ready for continued implementation, completion, or archive
- If canonical selection, theme pairing, screen mapping, or duplicate cleanup is missing, do not treat the design review as passed
- Do not treat the work as complete when `SKILL.md` and the index are out of sync

## Project-Adopted Rules First

If the project rules differ from the mother spec, the project-adopted rules take precedence.

## Stitch Provider Docs

- Provider / MCP / auth config must follow the localized Stitch plugin docs under `.ospec/plugins/stitch/docs/`.
- If those docs are missing, install or enable Stitch first so the plugin can sync its localized docs into the repository before changing config.

## Stitch Theme Variant Prompt Contract

- For `light/dark` theme variants, prompts must explicitly include:
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
