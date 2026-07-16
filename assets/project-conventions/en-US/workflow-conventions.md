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
3. For classic changes, create or update `tasks.md` directly from `proposal.md`
4. For goals, create or update `design.md`
5. For goals, create or update `implementation-plan.md`
6. For goals, create or update `artifacts/agents/task-graph.json`
7. Create or update `tasks.md`
8. Advance implementation according to `state.json`
9. For goals, complete document, task-level, and final review gates
10. For goals, update `artifacts/agents/worker-status.md`
11. Update the relevant `SKILL.md`
12. Rebuild `SKILL.index.json`
13. Complete `verification.md`
14. Archive only after the active workflow profile's gates pass

## Workflow Profiles

- `workflow_profile_id: change` is the classic fast flow for routine small changes: `proposal.md`, `tasks.md`, implementation, `verification.md`, `review.md`, and `state.json`
- `workflow_profile_id: goal` is the full flow for complex work: it adds `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, document review, worker/reviewer handoff, final reviews, worker status, and evidence gates
- Use `ospec new` / `ospec-change` for classic changes and `ospec goal` / `ospec-goal` for goals

## Goal Design Drafting

- In AI-assisted goal execution, the AI drafts or updates `design.md` from the requirement, `proposal.md`, and project context before editing `implementation-plan.md`, `tasks.md`, or code
- Do not create `design.md`, `implementation-plan.md`, task graph, worker packets, or goal review artifacts for a classic change unless the user explicitly upgrades it to a goal
- `Announce-Before-Act`: never run the workflow silently — announce the OSpec skill and stage, command and artifact, selected runtime adapter, worker count, actual mechanism, and any blocking gate
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design; surface open questions for direction, architecture, API, data, UI, risk, and scope and ask the user one at a time; prefer raising a durable decision gate over a silent assumption, and only record an autonomous assumption in `design.md` when the user explicitly defers, labeled as an assumption to confirm
- Derive `implementation-plan.md` from the accepted `design.md`, including target files, expected results, verification commands, dependencies, parallelizable work, and conflicts
- Derive `artifacts/agents/task-graph.json` from `implementation-plan.md`; each task must include id, status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role. Generated serial tasks also require `serial_reason`; record `maxParallelReason` for an explicit single-worker limit. Split tasks with more than six targets or record a concrete `scope_reason` for one atomic boundary
- For L3 derive/check/apply the exact task-graph allowlist with CAS and explicit expansion approval; repeated configure flags replace rather than append
- Derive `tasks.md` from `artifacts/agents/task-graph.json`; if `tasks.md` exists while upstream docs are still templates, update upstream docs first and then reconcile tasks
- For classic changes, derive `tasks.md` directly from `proposal.md` and the implementation scope

## State Constraints

- Use `state.json` as the execution status source of truth
- `verification.md` does not replace `state.json`
- If state files and execution files disagree, fix state first
- For goals, `artifacts/agents/task-graph.json` records machine-readable task state, dependencies, conflict constraints, target files, and verification commands
- When entering an existing project, use `ospec session [path]` to write `.ospec/session-brief.json` and `.ospec/session-brief.md`; it records active change, queued change, queue-run, cache fingerprint, and safe next command context only
- When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `bootstrap.json` and `bootstrap.md` with the project session brief snapshot, then follow its next safe action
- When a change moves between agents, tools, worktrees, shells, or human operators, use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` to write `handoff.json` and `handoff.md`; this records the project session brief snapshot, target tool mapping, and safety rules only
- Before deriving or dispatching implementation tasks, use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` to create `artifacts/agents/document-review-dispatches/` packets with the project session brief snapshot plus `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety; defer parallel dispatch when `workspace-status.json` reports `needs_isolation`
- Use `ospec execute route [changes/active/<change>]` to write `workflow-route.json` and `workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs explicit user choice; present `artifacts/agents/decisions/index.md` or the decision report `Chat Prompt`, and do not dispatch past required pending decisions
- Before creating an isolated worktree, use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `worktree-plan.json` and `worktree-plan.md`; this records a plan only and does not run `git worktree add`
- Before final closeout, use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `finish-plan.json` and `finish-plan.md`; this records readiness and command text only and does not finalize, archive, push, merge, or remove worktrees. When the finish plan status is ready and no required decision is pending, run `ospec finalize [changes/active/<change>]`; use `ospec archive ... --check` only as an optional dry-run preview and do not stop after it passes
- Use `ospec execute dispatch` to create a parallel-safe batch of worker packets and `artifacts/agents/execution-session.json` when task-level handoff needs a durable artifact; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior; use `--task` for one explicit task and `--limit` to cap dispatch batch size; use `ospec execute complete` to record worker results, and expect `artifacts/agents/blockers/` when completion records `NEEDS_CONTEXT` or `BLOCKED`
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` after dispatch to write `launch-plan.json` and `launch-plan.md`; only a current, target-bound session capability may select `runtimeAdapter.selected.nativeSubagent`
- Multi-worker execution follows `runtimeAdapter.selected.nativeSubagent`; parallelize only when the selected native adapter supports it. Missing, expired, or target-mismatched capability blocks execution with no Orca, agent CLI, or current-controller fallback
- `execute orchestrate`, `launch --run --command`, `review --run --command`, and `loop watch` are removed and fail before creating any process or run artifact. Use `ospec execute retry` to reopen corrected blocked, needs-context, or failed work; completed tasks require `--force`
- `ospec execute dispatch` and `complete` also sync `artifacts/agents/worker-status.md`; use `ospec execute sync` after manual task graph, execution-session, review artifact, debug evidence, or verification checklist edits
- After each worker task completes, use `ospec execute review [changes/active/<change>] --task <task-id>` to create one combined code reviewer packet covering spec compliance and code quality in a single pass. The task-level decision lives at `artifacts/reviews/tasks/<task-id>/review.md`, and dependent tasks stay blocked until that one combined review is approved
- After all task-level reviews are approved and the task graph is complete, use `ospec execute review [changes/active/<change>]` without `--task` to create one combined final whole-change code reviewer packet with the project session brief snapshot under `artifacts/agents/review-dispatches/`; it is a single review that writes one `artifacts/reviews/final-review.md` decision
- Dispatch each review packet to a fresh model-native reviewer subagent; OSpec never runs a local reviewer CLI. Record the matching review decision and evidence after completion
- Use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; handle feedback as accept, revise, clarify, or blocked before dispatching more work, and create a required user decision when feedback changes scope, direction, API, UI, risk, or accepted tradeoffs
- Use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` when debugging is part of the change to record root-cause and fix evidence under `artifacts/agents/debug-evidence.json`
- Use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after focused test runs to record TDD cycle evidence under `artifacts/agents/tdd-evidence.json`
- Use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` after fresh project checks to record verification evidence under `artifacts/agents/verification-evidence.json`
- `ospec session` and `ospec execute bootstrap`, `handoff`, `doc-review`, `workspace`, plan-mode `worktree`, `finish`, `dispatch`, `launch`, `collect`, `retry`, `complete`, `review`, `debug`, `tdd`, `verify`, and `sync` update OSpec artifacts only; except for `workspace`, `worktree`, and `finish` reading git state, they do not edit project source files directly. The controller dispatches workers only through the selected model-native subagent adapter
- Do not archive while task graph statuses are unresolved, dependencies are invalid, execution details are missing, or top-level `status` is not `completed`
- `artifacts/agents/worker-status.md` records implementer, spec reviewer, quality reviewer, and controller statuses
- Each task's single combined review (`artifacts/reviews/tasks/<task-id>/review.md`) must pass, and the single final `artifacts/reviews/final-review.md` must pass
- Task-level and final review decisions `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` block archive
- Do not mark a change complete while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; `controller_status` must be `DONE` before archive

## Document Language

- Keep `proposal.md`, `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/document-review-dispatches/`, `artifacts/agents/launch-plan.md`, `artifacts/agents/worker-runs/`, `artifacts/agents/review-runs/`, `artifacts/agents/retries/`, `artifacts/agents/review-feedback-plan.md`, `tasks.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/final-review.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `verification.md`, and `review.md` in the project-adopted document language
- Product UI language may differ from the OSpec change-document language; do not infer one from the other
- If a change was created in Chinese, continue updating it in Chinese unless project rules explicitly require a switch to English

## Optional Steps

- Optional-step activation is controlled by `.skillrc.workflow`
- Proposal flags must remain compatible with the workflow configuration
- Activated optional steps must appear in `tasks.md` and `verification.md`; for goals they must also appear in `artifacts/agents/task-graph.json`

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
- For Checkpoint-enabled changes, configure route/flow assertions plus accessibility expectations, visual baselines, screenshots/traces, and console/network evidence for changed runtime surfaces before treating the automated gate as review-ready
- Checkpoint gate readiness requires `artifacts/checkpoint/gate.json` to have `status: passed`, `evidence.status: complete`, and complete evidence for every active checkpoint step; a passing runner without screenshots, traces, visual diff evidence, route/flow coverage, or assertions is not archive-ready
- If the built-in `codex` provider succeeds on read-only calls but local write operations never reach `mcp_tool_call`, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project overrides a custom Codex runner / wrapper, that custom execution path must also pass `--dangerously-bypass-approvals-and-sandbox`
- When `approval.json.status` is not `approved`, do not claim the change has passed design review or is ready to archive
- Prefer `ospec plugins approve stitch <change-path>` or `ospec plugins reject stitch <change-path>` when recording review results

## Archive Gates

- Do not archive when docs are stale
- Do not archive when the index is stale
- Do not archive when optional steps have not passed
- For goals, do not archive when `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, or missing execution details
- For goals, do not archive when `artifacts/agents/worker-status.md` has unresolved worker statuses
- Do not archive when recorded debug evidence is blocked or only confirms a root cause without a later fixed record
- Do not archive when review artifacts have unresolved decisions
- Do not archive when verification evidence is failed, blocked, or stale
- Do not archive when `verification.md` is incomplete

## Execution Requirements

- Any AI or human advancing a change must read `.skillrc` and `SKILL.index.json` first, then use the current brief or dispatch packet to open only the relevant change files, target files, and indexed docs
- Use `docs/project/feature-index.md` and `SKILL.index.json.archived_changes` to locate completed behavior instead of scanning all archived changes
- A completed feature entry links its archived evidence and declared durable project documents. Project document frontmatter may add `features`, `modules`, and `aliases` so humans and AI can route directly from a feature or module name.
- A declared documentation update is complete only when dispatch-to-completion evidence shows a meaningful normalized-content change; file existence alone is not proof of an update.
- Every archived classic change and goal has one OSpec-generated, indexed document under `docs/project/changes/<archive-path>.md`. Generated change records are safe to rebuild and clean when their archive disappears; human-owned files are never removed by cleanup or overwritten during archive.
- Archive and finalize refresh the generated feature locator and knowledge index; they do not overwrite human-maintained architecture, module, or API prose
- Any completion claim must match the real file state instead of skipping gates through narration
