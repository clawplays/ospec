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
5. Read the current brief or dispatch packet first. Open only the change artifacts, target files, and indexed project or archive docs required by the current stage; do not load every goal artifact by default.
6. If Stitch is enabled and the current change activates `stitch_design_review`, inspect `artifacts/stitch/approval.json` first
7. If you need to handle Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement, read the repo-local localized plugin docs under `.ospec/plugins/<plugin>/docs/` first; if they are missing, install or enable the plugin to sync its docs before changing config

## Required Behavior

- Follow the project-adopted document language for `proposal.md`, `tasks.md`, `state.json`, `verification.md`, `review.md`, and any goal-only artifacts such as `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/planning-preflights/`, `artifacts/agents/workspace-status.md`, `artifacts/agents/worktree-plan.md`, `artifacts/agents/finish-plan.md`, `artifacts/agents/launch-plan.md`, `artifacts/agents/worker-runs/`, `artifacts/agents/review-runs/`, `artifacts/agents/retries/`, `artifacts/agents/blockers/`, `artifacts/agents/decisions/`, `artifacts/agents/review-feedback-plan.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/final-review.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `artifacts/agents/tdd-evidence.json`, and `artifacts/agents/verification-evidence.json`
- Do not infer change-document language from product copy, default site locale, or an "English-first" business requirement alone
- If the project-adopted protocol is Chinese or the current change docs are already Chinese, keep the change docs in Chinese unless the project rules explicitly switch them to English
- Use the index to locate knowledge before reading target files
- When entering an existing OSpec project, run `ospec session [path]` to write `.ospec/session-brief.json` and `.ospec/session-brief.md` with active change, queued change, queue-run, cache fingerprint, and safe next command context; this project entry brief does not replace active-change `ospec execute bootstrap`. Use `ospec session hook [path]` only to write optional harness startup hook artifacts, including `.ospec/hooks/using-ospec.md` for session-start injection, harness target metadata, active-change bootstrap guidance, and decision/plugin gate sources
- Use `ospec brainstorm [path] --topic "..."` only for optional pre-change exploration artifacts; use `ospec plan [path] --change changes/active/<change>` only for optional plan drafts, and pass `--apply` only when updating `implementation-plan.md` deliberately
- Treat activated built-in quality policy steps such as `tdd_cycle`, `root_cause_debug`, and `verification_evidence` as archive-gated `optional_steps`; cover them in `tasks.md`, `verification.md`, and matching evidence artifacts before closeout
- Use `ospec change` / `ospec-change` whenever the user selects a Change; `ospec new` remains an alias. Keep it on the classic fast flow regardless of complexity, flags, file count, risk, or batch size: `proposal.md`, `tasks.md`, implementation, `verification.md`, `review.md`, and `state.json`.
- Use `ospec goal` / `ospec-goal` only when the user explicitly selects a Goal.
- The `ospec execute …` controller layer (bootstrap, preflight, dispatch, launch, review, worktree, finish, collect, retry, sync) and every goal-only artifact belong to `workflow_profile_id: goal`. For `workflow_profile_id: change`, keep the classic fast flow — do not read or run the execute layer or goal artifacts; edit `proposal.md` and `tasks.md`, implement, record `verification.md` and `review.md`, then close out with `ospec verify` and `ospec finalize` — unless the user explicitly asks for agent/worker execution on this change.
- In goal execution, do not ask the user to hand-write `design.md` or `implementation-plan.md`; draft or update them from the requirement, `proposal.md`, and project context before deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code.
- In classic change execution, do not create goal-only files unless the user explicitly upgrades the work to a goal.
- `Announce-Before-Act`: never run the workflow silently. Announce the OSpec skill and stage, command and artifact, selected model-native subagent adapter, worker count, current session capability, and any blocking gate
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design. Surface the open questions for direction, architecture, API, data, UI, risk, and scope, and ask the user one question at a time instead of silently assuming; persist exploration with `ospec brainstorm [path] --topic "..."` when useful. When any of those is genuinely open, prefer raising a durable decision gate over guessing rather than writing a silent assumption; only record an autonomous assumption in `design.md` when the user explicitly defers or is unavailable, and label it as an assumption to confirm
- When the change must pause for a user choice, record a durable gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the selected option with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`
- In goal execution, keep `implementation-plan.md` derived from `design.md`, keep `artifacts/agents/task-graph.json` derived from `implementation-plan.md`, keep `tasks.md` derived from the task graph, and reconcile existing tasks after upstream docs are updated. In classic change execution, keep `tasks.md` derived directly from `proposal.md` and the current implementation scope.
- When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow its next safe action; when an active dispatch is waiting, bootstrap recommends the matching `ospec execute launch ... --task ...` command
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules without launching workers or editing source files
- Before deriving the task graph, run `ospec execute preflight [changes/active/<change>] --stage design`, then `--stage plan`. Both commands perform deterministic inline readiness preflight and record auditable approval artifacts without launching reviewer children. Derive or refresh `task-graph.json` only after both preflights pass. Keep red tests, production implementation, and green/refactor evidence in one atomic task unless the test harness is independently reusable.
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` when you need a controller view of ready, blocked, running, completed, and safe next task candidates
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- Use `ospec execute decision [changes/active/<change>] ...` when direction, architecture, API, UI, risk, or scope needs explicit user choice; required pending decisions appear in bootstrap/status/finish, are summarized in `artifacts/agents/decisions/index.md`, and block dispatch until selected or skipped
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety; an existing Goal may resume only with dirty paths owned by non-`PENDING` task targets, exact package-local `tsconfig.tsbuildinfo` derived from a started task's declared build/typecheck verification, or current hash-verified `ospec update` provenance, and every other dirty path remains `needs_isolation`
- Before creating an isolated worktree, use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md`; plan mode does not run git. Use explicit `--create` to run `git worktree add`, and explicit `--cleanup` to run `git worktree remove`; both record `artifacts/agents/worktree-runs/`
- Before final closeout, use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md`; this command records readiness and command text only and does not finalize, archive, push, merge, or remove worktrees. When the finish plan status is ready and no required decision is pending, run `ospec finalize [changes/active/<change>]`; use `ospec archive ... --check` only as an optional dry-run preview and do not stop after it passes
- Closeout is automatic when ready: once `ospec verify [changes/active/<change>]` passes and no required user decision or blocking plugin gate is pending, run `ospec finalize [changes/active/<change>]` yourself — do not stop after a passing `ospec verify` or `ospec archive ... --check` (`--check` is a preview only) and do not wait for the user to ask. Only pause closeout when a gate genuinely needs a human: a pending required user decision, an unapproved blocking plugin gate (for example Stitch or Checkpoint), real blockers reported by verify or archive, or an explicit user request to preview or approve before archiving
- Force archive is an explicit user exception, never an automatic fallback. First report the failing gates and every `NOT_VERIFIED` item. A retained pending Loop pointer is safe only when all item states are durably `completed`, `failed`, or `expired`; missing, `issued`, or `running` items still block. Then use `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"`. Preserve failures; the archive remains incomplete and accepted-risk.
- Decision gates and brainstorm options belong to the user: never auto-select the recommended option or resolve a gate yourself — present every gate with the capability ladder (a native question UI, else a plan/approval UI, else plain chat text) and wait for the user's actual choice; required gates block implementation and dispatch until the user answers, and `recommended` is only a hint to show the user
- Write every change document and brainstorm you author in the project's document language (`.skillrc` `documentLanguage` / managed `for-ai/` guidance); do not mix Chinese and English within a change
- Use `ospec execute dispatch` to create a parallel-safe batch of worker packets and `ospec execute complete` to record worker results; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior. Use `--task` for one task and `--limit` to cap a batch; required decisions block dispatch and `complete` writes blocker evidence for `NEEDS_CONTEXT` or `BLOCKED`. In a controller-owned Goal, use `ospec loop tick [changes/active/<change>]` for every task and final review so `artifacts/agents/review-dispatches/` is bound to real executor provenance; use `ospec execute review` directly only outside a controller Loop. Use `ospec execute feedback` after review decisions and `ospec execute sync` after manual artifact edits
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` after dispatch to write the launch plan. Its `runtimeAdapter` accepts only a current, target-bound model-native subagent capability and exposes the native primitive
- Execute `runtimeAdapter.selected.nativeSubagent`; parallelize only the safe batch. If capability is missing or expired, block and refresh the current model session instead of starting an agent CLI or using the controller context
- For an integrated goal loop in controller mode, do not stop after initialization or ask the user to run Loop commands. Run `ospec loop run [change] --once --json`, execute every emitted action through its `runtimeAdapter.selected.nativeSubagent`, persist heartbeat/result evidence, and tick again without another user prompt; do not paste the whole goal into each worker
- `IDE-CONTROLLER-AUTO-DISPATCH`: every Goal uses the same executable fast quality workflow. The IDE AI owns tick -> execute all `actions[]` through model-native subagents -> persist heartbeat/result evidence -> immediate tick. An empty `actions[]` with `pending` is observation only and must never be relaunched
- Agent CLI execution is removed. `loop watch`, `execute orchestrate`, `launch --run --command`, and `review --run --command` fail before process launch or run-artifact creation
- Required decisions always block implementation. Optional configured path and command allowlists add an extra fail-closed boundary without creating another workflow level
- Token economy (does not change any gate): pass `--brief` on `ospec execute …` and `ospec loop status`, drive each step from the brief status and emitted packet path, and read the prior findings sidecar/resolution summary before reopening full review history; do not re-read or embed the full task graph, worker status, launch plan, or goal documents every turn
- Use `ospec execute retry` to reopen corrected blocked, needs-context, or failed native work; completed tasks require explicit `--force`
- When debugging is part of the change, use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` to record root-cause and fix evidence; it records evidence only and does not run shell commands
- After focused test runs, use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` to record TDD cycle evidence; it records evidence only and does not run shell commands
- After running fresh project checks, use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` to record verification evidence; it records evidence only and does not run shell commands
- `ospec execute preflight` records deterministic inline preflight artifacts only; it does not launch reviewers, run shell commands, sync worker status, or edit source files
- For goal execution, do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing target files, missing verification commands, or top-level `status` other than `completed`
- After implementation, each task's single combined review must complete, and the single final `artifacts/reviews/final-review.md` must complete; unresolved task-level or final review decisions block archive
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

## Execution Efficiency Policies

- Run deterministic design and plan preflights, derive the task graph, then run one independent combined planning review. One grouped planning repair and one fresh re-review are the maximum; task review, final combined review, and verification remain required.
- Workers and reviewers use logical model profiles resolved against the actual dispatch target, including launch overrides. Keep requested/configured model separate from provider-observed model; absent provider/usage evidence means observed model is unknown, not selected by assertion.
- Command runners receive `OSPEC_USAGE_FILE` and automatically ingest that sidecar; `ospec execute complete ... --usage-file usage.json` remains available for manual ingestion. Metrics record their source, observed fields, and complete/partial/missing coverage, so an unreported counter is not presented as a measured zero.
- Reviewers write human-readable Markdown and a sibling `*.findings.json` with stable IDs, severity, category, message, file/line evidence, requirement references, and repair scope. Legacy Markdown is converted to a compatibility sidecar before repair.
- Keep a finding ID stable while the same root defect narrows. After the convergence threshold, OSpec continues that ID only when both its structured fingerprint and the prior authorized repair-scope code snapshot changed. Do not invent a new ID or merely reword evidence to force another repair.
- For each declared `documentation_updates` path, dispatch and completion records capture normalized content hashes. A new run fails the documentation gate when the file exists but did not change meaningfully; legacy runs without baseline evidence are marked unverified. Archive indexes link the updated durable project documents directly from the completed feature.
- Every successful finalize/archive generates one localized `docs/project/changes/<archive-path>.md` for the archived change or goal and verifies that both indexes link it. Before moving the active change, archive preflight refuses to overwrite a human-owned file at that path and verifies the managed output directories are writable. This universal change record does not replace required human-maintained architecture, API, module, or operational docs.
- When final review is `NEEDS_CHANGES`, resolve required decisions and use `ospec execute repair` to group all findings into one repair task, followed by one covering verification, one task review, and one final re-review.
