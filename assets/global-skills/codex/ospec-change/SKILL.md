---
name: ospec-change
description: Create or advance an active change inside an OSpec project, from requirement intake through verification and finalize.
tags: [ospec, cli, workflow]
---

# OSpec Change

Use this skill when the user says things like "use ospec change to do a requirement".

## Scope

This skill is the single entry for the full change lifecycle inside an initialized OSpec project:
- requirement intake
- change naming or matching
- explicit queue planning when the user asks for queue behavior
- proposal, design, implementation-plan, task graph, agent worker status, and task refinement
- implementation guidance
- progress tracking
- verification
- archive readiness check
- finalize closeout

## Read Order

1. `.skillrc`
2. `SKILL.index.json`
3. `for-ai/ai-guide.md`
4. `for-ai/execution-protocol.md`
5. If Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement is involved, read the localized plugin docs under `.ospec/plugins/<plugin>/docs/` first. Before any install step, check `ospec plugins info <plugin>` or `ospec plugins installed`. If the plugin is already installed globally, reuse it and enable it in the current project instead of reinstalling it.
6. Treat `ospec update [path]` as project-scoped. It repairs the current project and only upgrades plugins that are enabled in that project.
7. Do not run `ospec plugins update --all` unless the user explicitly asks to update every installed plugin on the machine.
6. If the user explicitly asks for queue behavior, inspect `changes/queued/` before creating new queue items.
7. `changes/active/<change>/proposal.md`
8. `changes/active/<change>/design.md`
9. `changes/active/<change>/implementation-plan.md`
10. `changes/active/<change>/artifacts/agents/task-graph.json`
11. `changes/active/<change>/artifacts/agents/bootstrap.md`
12. `changes/active/<change>/artifacts/agents/handoff.md`
13. `changes/active/<change>/artifacts/agents/document-review-dispatches/`
14. `changes/active/<change>/artifacts/agents/workspace-status.md`
15. `changes/active/<change>/artifacts/agents/worktree-plan.md`
16. `changes/active/<change>/artifacts/agents/finish-plan.md`
17. `changes/active/<change>/artifacts/agents/launch-plan.md`
18. `changes/active/<change>/artifacts/agents/worker-runs/`
19. `changes/active/<change>/artifacts/agents/review-runs/`
20. `changes/active/<change>/artifacts/agents/retries/`
21. `changes/active/<change>/artifacts/agents/decisions/`
18. `changes/active/<change>/tasks.md`
18. `changes/active/<change>/artifacts/reviews/design-review.md`
19. `changes/active/<change>/artifacts/reviews/implementation-plan-review.md`
20. `changes/active/<change>/artifacts/reviews/spec-compliance.md`
21. `changes/active/<change>/artifacts/reviews/code-quality.md`
22. `changes/active/<change>/artifacts/agents/worker-status.md`
23. `changes/active/<change>/artifacts/agents/debug-evidence.json`
24. `changes/active/<change>/artifacts/agents/tdd-evidence.json`
25. `changes/active/<change>/artifacts/agents/verification-evidence.json`
26. `changes/active/<change>/state.json`
27. `changes/active/<change>/verification.md`
28. `changes/active/<change>/review.md`

## Language

- Follow the project-adopted document language from `for-ai/` and existing change docs.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Design Drafting

- Do not ask the user to hand-write `design.md` during normal AI-assisted change execution.
- After creating or finding the active change, draft or update `design.md` from the user requirement, `proposal.md`, and project context before editing `implementation-plan.md`, deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code.
- Ask at most one concise question only when a missing decision would materially change direction, architecture, API, data, UI, risk, or scope. Otherwise record explicit assumptions in `design.md`.
- When that missing decision must pause the change, write a durable decision gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the answer with `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>`.
- `design.md` must cover the selected approach, key tradeoffs, affected boundaries, risks, constraints, open questions, and why the resulting tasks are valid.
- Draft or update `implementation-plan.md` from `design.md` before deriving `artifacts/agents/task-graph.json` and `tasks.md`.
- `implementation-plan.md` must identify target files, expected results, verification commands, dependencies, parallelizable work, and conflicts.
- Derive `artifacts/agents/task-graph.json` from `implementation-plan.md` before deriving `tasks.md`; each task must record status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role.

- Use `ospec execute bootstrap [changes/active/<change>]` when starting or resuming a single active change to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot; follow its next safe action before dispatch, launch, review, verification, or finish. When an active dispatch is waiting, bootstrap recommends the matching `ospec execute launch ... --task ...` command.
- Treat activated built-in quality policy steps such as `tdd_cycle`, `root_cause_debug`, and `verification_evidence` as archive-gated `optional_steps`; cover them in `tasks.md`, `verification.md`, and the matching evidence artifacts before closeout.
- Use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` to inspect controller state and safe next task candidates before assigning task work.
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- Use `ospec execute decision [changes/active/<change>] ...` when the user must choose between viable directions; required pending decisions are visible in bootstrap/status/finish, summarized in `artifacts/agents/decisions/index.md`, and block dispatch until selected or skipped.
- Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules, but does not launch workers or edit source files.
- Use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` before deriving or dispatching implementation tasks to create document reviewer packets with the project session brief snapshot under `artifacts/agents/document-review-dispatches/` and review artifacts at `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review. This command records artifacts only and does not launch reviewers, run shell commands, sync worker status, or edit source files.
- Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety in `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if status is `needs_isolation`, clean the workspace or move work into an isolated git worktree before parallel dispatch.
- Use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md` before creating an isolated worktree; plan mode records a plan only and does not run git.
- Use `ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]` only when explicitly asked to run `git worktree add`; OSpec records stdout/stderr/status under `artifacts/agents/worktree-runs/`.
- Use `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` only when explicitly asked to run `git worktree remove`; cleanup does not delete branches, push, merge, archive, run tests, or edit source files.
- Use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md` before finalize, archive, push, PR, merge, or worktree cleanup; this command records readiness and command text only.
- When the finish plan status is ready and no required user decision is pending, run `ospec finalize [changes/active/<change>]` to close the change. Use `ospec archive [changes/active/<change>] --check` only as an optional dry-run preview, and do not stop after a passing dry run unless the user explicitly requested preview-only output.
- Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of worker packets and `artifacts/agents/execution-session.json`; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior. Use `ospec execute complete <task-id> ...` to record worker results. Use `--task` for one explicit task and `--limit` to cap the batch size. These commands also sync `artifacts/agents/worker-status.md`, update OSpec artifacts only, and leave native subagent dispatch to the current AI harness; `complete` writes blocker escalation artifacts under `artifacts/agents/blockers/` when the result is `NEEDS_CONTEXT` or `BLOCKED`. Do not dispatch while a required user decision is pending.
- Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` after dispatch to write `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`; this is the native agent launch artifact and tells the controlling AI how to use the current harness native agent mechanism (`spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, Task for Claude Code, `@generalist` for Gemini, `@mention` for OpenCode, Cursor Agent/task chat, and Copilot CLI/coding-agent task). Use `--json` when an adapter needs the machine-readable launch artifact on stdout. It requires one active dispatch and ready workspace status, and does not start workers, run shell commands, or edit source files by itself.
- Default to current-harness native subagents for multi-worker execution: create parallel-safe packets with `ospec execute dispatch`, inspect `launch-plan.md`, then dispatch one native agent per safe packet in the current AI session. Use `ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N]` only as the final CLI fallback when the current AI harness cannot dispatch native subagents; the fallback renders an explicit command template, runs worker commands concurrently, records `artifacts/agents/orchestration-runs/`, captures worker runs, collects results unless `--no-collect` is passed, and reports failed-worker retry commands.
- Use `--run --command` with `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N]` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed; it captures stdout, stderr, exit code, timeout metadata, and run metadata under `artifacts/agents/worker-runs/`, then use `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` to record the task result.
- Use `ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--force]` after a blocked, needs-context, or failed run has been corrected; it writes `artifacts/agents/retries/`, reopens the task, and creates a fresh dispatch packet. Completed tasks require explicit `--force`.
- Use `ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]` after each completed worker task to create task-level reviewer packets with the project session brief snapshot; task decisions are stored under `artifacts/reviews/tasks/<task-id>/`, and dependent tasks must not dispatch until task spec and quality reviews are approved.
- Use `ospec execute review [changes/active/<change>] [--stage spec|quality]` without `--task` after all task-level reviews are approved and the task graph is completed to create final whole-change reviewer packets with the project session brief snapshot under `artifacts/agents/review-dispatches/`; do not dispatch final quality review before final spec review is approved.
- Use `ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..."` only when explicitly asked to run a local reviewer command; it captures review stdout/stderr under `artifacts/agents/review-runs/` and can update the matching task-level or final review artifact when `--decision` is provided.
- Use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; this records how to accept, revise, clarify, or unblock review feedback and creates a required user decision gate when feedback changes scope, direction, API, UI, risk, or accepted tradeoffs; it does not edit source files or launch workers.
- Use `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` when debugging was part of the change to record `artifacts/agents/debug-evidence.json`; this command records evidence only and does not run shell commands.
- Use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` after focused test runs to record `artifacts/agents/tdd-evidence.json`; this command records evidence only and does not run shell commands; red must not pass, green requires a prior red FAILED record, refactor requires prior passing green/refactor evidence, and SKIPPED requires a concrete summary.
- Use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` after running fresh project checks to record `artifacts/agents/verification-evidence.json`; this command records evidence only and does not run shell commands.
- Use `ospec execute sync [changes/active/<change>]` after manual task graph, execution-session, review artifact, or verification checklist edits to rebuild `artifacts/agents/worker-status.md`.
- Do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing execution details, or top-level `status` other than `completed`.
- If `tasks.md` already exists but `design.md` or `implementation-plan.md` is still a template, update those upstream docs first, then reconcile `tasks.md` to match them.
- After implementation, complete each task-level spec review before that task's quality review, then complete final `artifacts/reviews/spec-compliance.md` before final `artifacts/reviews/code-quality.md`.
- Do not archive while any task-level or final review decision is `PENDING`, `NEEDS_CHANGES`, or `BLOCKED`.
- During implementation and review, keep `artifacts/agents/worker-status.md` updated with implementer, spec reviewer, quality reviewer, and controller statuses.
- Do not claim completion while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`; the controller status must be `DONE` before archive.

## Plugin Gates

After reading `.skillrc`, inspect enabled plugins before advancing the change.

### Stitch

When `.skillrc.plugins.stitch.enabled = true` and `.skillrc.plugins.stitch.capabilities.page_design_review.enabled = true`:

- determine whether the current change activates `stitch_design_review` from proposal `flags` and `tasks.md` / `verification.md` `optional_steps`
- if activated, read `changes/active/<change>/artifacts/stitch/approval.json`
- if `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` before asking the user to review the design
- if `.skillrc.plugins.stitch.project.project_id` is already configured, reuse that exact Stitch project instead of creating a new project
- if `.skillrc.plugins.stitch.project.project_id` is empty, treat the first successful Stitch run as the canonical project and keep using it for later changes
- treat missing approval or `status != approved` as a blocking gate
- do not claim the change can continue implementation closeout or archive readiness until Stitch approval is complete
- treat the built-in `stitch` plugin with the configured provider adapter as the default path unless `.skillrc.plugins.stitch.runner` is explicitly overridden
- if a custom runner is configured and `token_env` is set but missing, stop and request configuration first
- if runner readiness, provider CLI, stitch MCP, or auth readiness is unclear, use `ospec plugins doctor stitch <project-path>` before `ospec plugins run stitch <change-path>`
- if Stitch installation, provider switching, doctor remediation, MCP setup, or auth setup is involved, read `.ospec/plugins/stitch/docs/` first and follow the plugin's documented config snippets instead of inventing `command` / `args` / `env` or stdio-proxy settings
- use `ospec plugins approve stitch <change-path>` or `ospec plugins reject stitch <change-path>` to record the review result

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.
3. If the request is a new requirement, derive a concise kebab-case change name and create it.
4. If the matching active change already exists, continue it instead of duplicating it.
5. Default to one active change unless the user explicitly asks to split work into multiple changes, create a queue, or execute a queue.
6. When queue behavior is explicitly requested, derive an ordered list of concise kebab-case change names. Each name should represent one execution unit, not a mixed bundle.
7. For explicit queue planning, present the queue as an ordered list first. Use `ospec queue add ...` to create queued changes and `ospec run ...` only when the user explicitly asks to run the queue.
8. Treat `changes/active/<change>/` as the execution container.
9. Keep `proposal.md`, `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, `artifacts/agents/bootstrap.md`, `artifacts/agents/handoff.md`, `artifacts/agents/document-review-dispatches/`, `artifacts/agents/workspace-status.md`, `artifacts/agents/worktree-plan.md`, `artifacts/agents/finish-plan.md`, `artifacts/agents/launch-plan.md`, `artifacts/agents/decisions/`, `artifacts/agents/review-feedback-plan.md`, `tasks.md`, `artifacts/reviews/design-review.md`, `artifacts/reviews/implementation-plan-review.md`, `artifacts/reviews/spec-compliance.md`, `artifacts/reviews/code-quality.md`, `artifacts/agents/worker-status.md`, `artifacts/agents/debug-evidence.json`, `artifacts/agents/tdd-evidence.json`, `artifacts/agents/verification-evidence.json`, `state.json`, `verification.md`, and `review.md` aligned with actual execution and with the project's established document language.
10. Use OSpec closeout commands instead of inventing a parallel process.
11. Apply plugin gates from `.skillrc` before advancing a change.
12. If `stitch_design_review` is activated, inspect the Stitch approval artifact before continuing execution.
13. If the Stitch preview has not been submitted yet, run `ospec plugins run stitch <change-path>` before asking for design review.
14. If Stitch approval is missing or not approved, stop at the review gate instead of treating the change as ready.

## Commands

```bash
ospec status [path]
ospec new <change-name> [path]
ospec changes status [path]
ospec queue status [path]
ospec queue add <change-name> [path]
ospec queue activate <change-name> [path]
ospec queue next [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
ospec run status [path]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
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
ospec plugins status [path]
ospec plugins doctor stitch [path]
ospec plugins run stitch [changes/active/<change>]
ospec plugins approve stitch [changes/active/<change>]
ospec plugins reject stitch [changes/active/<change>]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>] --check
ospec finalize [changes/active/<change>]
```

## Guardrails

- Do not assume dashboard workflows exist.
- Do not refer to `basic` or `full` structure levels.
- Do not confuse repository initialization with change execution.
- Do not enter queue mode unless the user explicitly asks for queue behavior.
- Do not turn an ordinary single requirement into multiple queued changes unless the user explicitly asks to split it.
- Do not continue past an active Stitch review gate when approval is missing or not approved.
- Do not dispatch workers past a required pending user decision; ask the user and record the selected option first.
- Do not claim completion while `artifacts/agents/worker-status.md` has unresolved worker statuses.
- Do not archive while `artifacts/agents/task-graph.json` has unresolved task statuses, invalid dependencies, missing target files, or missing verification commands.
- Do not claim completion until implementation, verification notes, and closeout status are aligned.
- If real project tests exist, run or recommend them separately from `ospec verify`.
