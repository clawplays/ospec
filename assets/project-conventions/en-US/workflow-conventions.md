---
name: project-workflow-conventions
title: Workflow Execution Conventions
tags: [conventions, workflow, change, ospec]
---

# Workflow Execution Conventions

## Goal

This document fixes the OSpec execution flow inside the project so requirements move through planning, implementation, verification, and archive with consistent gates.

## Standard Order

1. Clarify project context and impact scope
2. Create or update `proposal.md`
3. Create or update `design.md`
4. Create or update `implementation-plan.md`
5. Create or update `artifacts/agents/task-graph.json`
6. Create or update `tasks.md`
7. Advance implementation according to `state.json`
8. Complete task-level spec and quality reviews for each finished worker task
9. Dispatch and complete final `artifacts/reviews/spec-compliance.md` and `artifacts/reviews/code-quality.md`
10. Update `artifacts/agents/worker-status.md`
11. Update the relevant `SKILL.md`
12. Rebuild `SKILL.index.json`
13. Complete `verification.md`
14. Archive only after all gates pass

## Design Drafting

- In AI-assisted change execution, the AI drafts or updates `design.md` from the requirement, `proposal.md`, and project context before editing `implementation-plan.md`, `tasks.md`, or code
- Ask one concise design question only when the missing decision materially changes architecture, API, data, UI, or risk; otherwise record assumptions in `design.md`
- Derive `implementation-plan.md` from the accepted `design.md`, including target files, expected results, verification commands, dependencies, parallelizable work, and conflicts
- Derive `artifacts/agents/task-graph.json` from `implementation-plan.md`; each task must include id, status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role
- Derive `tasks.md` from `artifacts/agents/task-graph.json`; if `tasks.md` exists while upstream docs are still templates, update upstream docs first and then reconcile tasks

## State Constraints

- Use `state.json` as the execution status source of truth
- `verification.md` does not replace `state.json`
- If state files and execution files disagree, fix state first
- `artifacts/agents/task-graph.json` records machine-readable task state, dependencies, conflict constraints, target files, and verification commands
- When entering an existing project, use `ospec session [path]` to write `.ospec/session-brief.json` and `.ospec/session-brief.md`; it records active change, queued change, queue-run, cache fingerprint, and safe next command context only
- When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `bootstrap.json` and `bootstrap.md` with the project session brief snapshot, then follow its next safe action
- When a change moves between agents, tools, worktrees, shells, or human operators, use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]` to write `handoff.json` and `handoff.md`; this records the project session brief snapshot, target tool mapping, and safety rules only
- Before deriving or dispatching implementation tasks, use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` to create `artifacts/agents/document-review-dispatches/` packets with the project session brief snapshot plus `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety; defer parallel dispatch when `workspace-status.json` reports `needs_isolation`
- Before creating an isolated worktree, use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `worktree-plan.json` and `worktree-plan.md`; this records a plan only and does not run `git worktree add`
- Before final closeout, use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `finish-plan.json` and `finish-plan.md`; this records readiness and command text only and does not finalize, archive, push, merge, or remove worktrees
- Use `ospec execute dispatch` to create a parallel-safe batch of worker packets and `artifacts/agents/execution-session.json` when task-level handoff needs a durable artifact; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior; use `--task` for one explicit task and `--limit` to cap dispatch batch size; use `ospec execute complete` to record worker results, and expect `artifacts/agents/blockers/` when completion records `NEEDS_CONTEXT` or `BLOCKED`
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]` after dispatch to write `launch-plan.json` and `launch-plan.md`; this is the default native agent launch artifact for the controlling AI and includes Codex/GPT `spawn_agent`, Claude Code Task, Gemini `@generalist`, and OpenCode `@mention` guidance
- Default to current-harness native subagents for multi-worker execution: dispatch safe packets, inspect `launch-plan.md`, start one native agent per safe packet, and record each result with `ospec execute complete`
- Use `ospec execute orchestrate [changes/active/<change>] --command "..." [--limit N] [--max-rounds N] [--timeout-ms N]` only as the final CLI fallback when native subagents are unavailable; fallback mode renders an explicit command template, runs worker commands concurrently, and collects results into the task graph
- Use `--run --command` with `ospec execute launch ... --run --command "..."` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed. Then use `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` to record the fallback task result. Use `ospec execute retry` to write `artifacts/agents/retries/` and reopen corrected blocked, needs-context, or failed work; completed tasks require `--force`
- `ospec execute dispatch` and `complete` also sync `artifacts/agents/worker-status.md`; use `ospec execute sync` after manual task graph, execution-session, review artifact, debug evidence, or verification checklist edits
- After each worker task completes, use `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`, then `--stage quality`, to create task-level reviewer packets. Task-level decisions live under `artifacts/reviews/tasks/<task-id>/`, and dependent tasks stay blocked until both reviews are approved
- After all task-level reviews are approved and the task graph is complete, use `ospec execute review [changes/active/<change>] [--stage spec|quality]` without `--task` to create final whole-change reviewer packets with the project session brief snapshot under `artifacts/agents/review-dispatches/`; final spec review must be approved before final quality review is dispatched
- Use `ospec execute review ... --run --command "..."` only for explicit local reviewer execution; it writes `artifacts/agents/review-runs/` and can update the matching review artifact when `--decision` is provided
- Use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; handle feedback as accept, revise, clarify, or blocked before dispatching more work
- Use `ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED` when debugging is part of the change to record root-cause and fix evidence under `artifacts/agents/debug-evidence.json`
- Use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after focused test runs to record TDD cycle evidence under `artifacts/agents/tdd-evidence.json`
- Use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` after fresh project checks to record verification evidence under `artifacts/agents/verification-evidence.json`
- `ospec session` and `ospec execute bootstrap`, `handoff`, `doc-review`, `workspace`, plan-mode `worktree`, `finish`, `dispatch`, `launch`, `collect`, `retry`, `complete`, `review`, `debug`, `tdd`, `verify`, and `sync` update OSpec artifacts only; except for `workspace`, `worktree`, and `finish` reading git state, they do not edit project source files directly. Native subagent dispatch is performed by the current AI harness; shell commands run only with explicit `worktree --create`, `worktree --cleanup`, fallback `launch --run --command`, `review --run --command`, or fallback `orchestrate` with an explicit command template
- Do not archive while task graph statuses are unresolved, dependencies are invalid, execution details are missing, or top-level `status` is not `completed`
- `artifacts/agents/worker-status.md` records implementer, spec reviewer, quality reviewer, and controller statuses
- Every task-level spec review must pass before that task's quality review, and final `artifacts/reviews/spec-compliance.md` must pass before final `artifacts/reviews/code-quality.md`
- Task-level and final review decisions `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` block archive
- Do not mark a change complete while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; `controller_status` must be `DONE` before archive

## Document Language

- Keep `proposal.md`, `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/document-review-dispatches/`, `artifacts/agents/launch-plan.md`, `artifacts/agents/worker-runs/`, `artifacts/agents/review-runs/`, `artifacts/agents/retries/`, `artifacts/agents/review-feedback-plan.md`, `tasks.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/spec-compliance.md`, `artifacts/reviews/code-quality.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `verification.md`, and `review.md` in the project-adopted document language
- Product UI language may differ from the OSpec change-document language; do not infer one from the other
- If a change was created in Chinese, continue updating it in Chinese unless project rules explicitly require a switch to English

## Optional Steps

- Optional-step activation is controlled by `.skillrc.workflow`
- Proposal flags must remain compatible with the workflow configuration
- Activated optional steps must appear in `artifacts/agents/task-graph.json`, `tasks.md`, and `verification.md`

## Plugin Gates

- Plugin capabilities are controlled by `.skillrc.plugins`
- If the current change activates `stitch_design_review`, inspect `artifacts/stitch/approval.json` first
- If `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` first to generate a preview and send the preview URL to the user for review
- Treat `.skillrc.plugins.stitch.project.project_id` as the canonical Stitch project for the repository; all UI changes should reuse that same Stitch project
- If the canonical Stitch project is still empty, the first successful `ospec plugins run stitch <change-path>` should save it into `.skillrc.plugins.stitch.project`, and later runs must reuse it
- If Stitch returns a different project ID from the canonical one, treat that run as invalid instead of accepting the new project automatically
- `ospec plugins run stitch <change-path>` uses the configured Stitch provider adapter by default; if the project explicitly overrides `.skillrc.plugins.stitch.runner`, use the custom Stitch bridge / wrapper instead
- For custom runners, use `token_env` when extra tokens are required; for the built-in Gemini adapter, auth is typically configured under `%USERPROFILE%/.gemini/settings.json` in `mcpServers.stitch`
- Use `ospec plugins doctor stitch <project-path>` to validate the runner, provider CLI, stitch MCP, and auth-hint readiness
- For Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement, read the localized plugin docs under `.ospec/plugins/<plugin>/docs/` first; if they are missing, install or enable the plugin to sync its docs before changing config
- If the built-in `codex` provider succeeds on read-only calls but local write operations never reach `mcp_tool_call`, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project overrides a custom Codex runner / wrapper, that custom execution path must also pass `--dangerously-bypass-approvals-and-sandbox`
- When `approval.json.status` is not `approved`, do not claim the change has passed design review or is ready to archive
- Prefer `ospec plugins approve stitch <change-path>` or `ospec plugins reject stitch <change-path>` when recording review results

## Archive Gates

- Do not archive when docs are stale
- Do not archive when the index is stale
- Do not archive when optional steps have not passed
- Do not archive when `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, or missing execution details
- Do not archive when `artifacts/agents/worker-status.md` has unresolved worker statuses
- Do not archive when recorded debug evidence is blocked or only confirms a root cause without a later fixed record
- Do not archive when review artifacts have unresolved decisions
- Do not archive when verification evidence is failed, blocked, or stale
- Do not archive when `verification.md` is incomplete

## Execution Requirements

- Any AI or human advancing a change must read `.skillrc`, `SKILL.index.json`, and the current change files first
- Any completion claim must match the real file state instead of skipping gates through narration
