---
name: project-workflow-conventions
title: Workflow Execution Conventions
tags: [conventions, workflow, change, ospec]
---

# Workflow Execution Conventions

This document fixes the OSpec execution flow inside the project so requirements move through planning, implementation, verification, and archive with consistent gates. It records project conventions only: the `ospec execute ...` catalogue, its flags, and the artifacts each subcommand writes are not restated here. Run `ospec help execute` or `ospec help <subcommand>`, and read `for-ai/execution-protocol.md` when a named goal-controller situation needs the detail behind a rule — not as a step of entering the layer.

## Workflow Profiles

- `workflow_profile_id: change` is the classic fast flow for routine small changes: `proposal.md`, `tasks.md`, implementation, `verification.md`, `review.md`, `state.json`
- `workflow_profile_id: goal` is the full flow for complex work: it adds `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, document review, worker/reviewer handoff, final review, worker status, and evidence gates
- Use `ospec change` / `ospec-change` for classic changes and `ospec goal` / `ospec-goal` for goals; `ospec new` is only a compatibility alias of `ospec change`

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

Each artifact derives from the one above it, and upstream comes first: if `tasks.md` exists while upstream docs are still templates, update the upstream docs, then reconcile tasks. Do not create `design.md`, `implementation-plan.md`, a task graph, worker packets, or goal review artifacts for a classic change unless the user explicitly upgrades it to a goal. Task-graph task fields and the `serial_reason` / `maxParallelReason` / `scope_reason` and allowlist rules are defined once in `for-ai/execution-protocol.md`.

- `Announce-Before-Act`: never run the workflow silently — announce the OSpec skill and stage, the command and artifact, and any blocking gate. In the goal controller layer, also announce the selected runtime adapter, the worker count, and the actual native mechanism
- `Brainstorm-First`: surface open direction, architecture, API, data, UI, risk, and scope questions before locking a goal design, and prefer a durable decision gate over a silent assumption. The full decision-gate contract is stated where your profile already reads: `for-ai/change-protocol.md` for a classic change, `for-ai/execution-protocol.md` for a goal. It binds on every harness; the Claude-only, opt-in session hook re-injects it at runtime but is never its source

## State Constraints

- `state.json` is the execution status source of truth; `verification.md` does not replace it. If state files and execution files disagree, fix state first
- For goals, `artifacts/agents/task-graph.json` holds machine-readable task state, dependencies, conflicts, target files, and verification commands; `artifacts/agents/worker-status.md` holds implementer, spec reviewer, quality reviewer, and controller statuses. Run `ospec execute sync` after editing either by hand
- Progress checklists track reality: tick `proposal.md` acceptance criteria as verification evidence passes (`[verify:<id>]` lines are auto-ticked by sync); unchecked items block archiving. Goal `review.md` is derived from the final review by sync and never edited by hand
- Do not mark a change complete while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; `controller_status` must be `DONE` before archive

## Execution Command Boundaries

- The `ospec execute ...` subcommands record OSpec artifacts only; apart from `workspace`, `worktree`, and `finish` reading git state, they never edit project source files
- Ordering is fixed: `preflight --stage design`, then `--stage plan`, then task graph derivation, then one combined planning review, then workspace check and worker dispatch
- Keep an ordinary red test, its production implementation, and green/refactor evidence in one atomic task
- One combined review per task at `artifacts/reviews/tasks/<task-id>/review.md` gates that task's dependents; one combined final `artifacts/reviews/final-review.md` gates archive. Dispatch every review packet to a fresh model-native reviewer subagent — OSpec never runs a local reviewer CLI — and record the matching decision and evidence
- Multi-worker execution follows `runtimeAdapter.selected.nativeSubagent` and parallelizes only when that adapter supports it. Missing, expired, or target-mismatched capability blocks execution with no Orca, agent CLI, or current-controller fallback
- Required pending decisions block dispatch; resolve or skip them first
- When the finish plan is ready and no required decision is pending, run `ospec finalize`. `ospec archive ... --check` is an optional dry-run preview only — do not stop after it passes

## Document Language

- Write every change artifact in the project document language
- Product UI language may differ from the OSpec change-document language; do not infer one from the other
- Once a change exists in one language, keep updating it in that language unless project rules explicitly require a switch

## Optional Steps

- Optional-step activation is controlled by `.skillrc.workflow`, and proposal flags must stay compatible with it
- Activated optional steps must appear in `tasks.md` and `verification.md`; for goals also in `artifacts/agents/task-graph.json`

## Archive Gates

Do not archive when:

- docs are stale, the index is stale, or optional steps have not passed
- `verification.md` is incomplete, or verification evidence is failed, blocked, or stale
- review artifacts have unresolved decisions; a task-level or final review decision of `PENDING`, `NEEDS_CHANGES`, or `BLOCKED` blocks archive
- recorded debug evidence is blocked, or only confirms a root cause without a later fixed record
- for goals, `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, or missing execution details, or its top-level `status` is not `completed`
- for goals, `artifacts/agents/worker-status.md` has unresolved worker statuses

Force archive requires explicit user acceptance; the CLI enforces its own confirmation flags. The full contract is stated where your profile already reads: `for-ai/change-protocol.md` for a classic change, `for-ai/execution-protocol.md` for a goal.

## Execution Requirements

- Read `.skillrc` first, then use the current brief or dispatch packet to open only the relevant change files, target files, and indexed docs
- Never read `SKILL.index.json` wholesale — it grows without bound as changes archive. Use `ospec docs locate --feature <slug>` or `ospec docs locate --affects <path>` to jump straight to the one section that describes a behavior, and `ospec index query <keyword...>` when you only have a keyword. `docs/project/feature-catalog.md` lists every declared feature, one row each; do not scan all archived changes
- A completed feature entry links its archived evidence and declared durable project documents. Project document frontmatter may add `features`, `modules`, and `aliases` so humans and AI can route from a feature or module name
- A declared documentation update is complete only when dispatch-to-completion evidence shows a meaningful normalized-content change; file existence alone is not proof
- Every archived classic change and goal is served from its index entry plus its archive directory: `ospec changes show <archive>` renders the summary, affects, file list, and verification commands on demand, and nothing is generated under `docs/project/changes/`. Archive and finalize rebuild the feature catalogue and knowledge index, and never remove or overwrite human-maintained architecture, module, or API prose — the engine's only write into a human-owned document is the `ospec:last-change` traceability comment
- Any completion claim must match the real file state instead of skipping gates through narration
