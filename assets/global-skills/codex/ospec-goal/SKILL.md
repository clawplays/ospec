---
name: ospec-goal
description: Create or advance a full OSpec goal using the current document, task graph, worker, review, and evidence workflow.
tags: [ospec, cli, workflow, goal]
---

# OSpec Goal

Use this skill for complex work that needs the full OSpec workflow. A goal is intentionally heavier than a change and is the place to use design docs, implementation planning, task graph dispatch, worker/reviewer handoffs, and durable evidence.

## Loop Model

`ospec goal` creates a **session-bound Loop** automatically (`artifacts/loop/loop.json` + `state.json` + `run-log.jsonl`). You do not run a separate init step. Key contracts:

- **ospec is a state-machine brain; it does not execute agents.** `ospec loop run --once` performs a two-phase tick — it first observes the previous pending action's verification evidence, then plans/produces the next controller instruction. The controller (you) executes the instruction and records completion + verification.
- **Safety level chosen at creation via a decision gate.** Prefer presenting an `AskUserQuestion` for L1/L2/L3 as the first decision; otherwise pass `ospec goal <name> --level L1|L2|L3` (default L1). L1 = report-only (findings go to triage, no code changes); L2 = assisted (real changes but required-decision gates hard-block); L3 = unattended within an allowlist.
- **The level gates auto-advance.** At **L1/L2**, `ospec loop run` hard-blocks while any required user decision is pending — present each one to the user (never auto-select the recommended option) and record the answer with `ospec execute decision ... --select` before the loop proceeds. Only **L3** may auto-advance within its allowlist. The level is not a hint; it decides whether you may proceed without asking.
- **`/goal` is capability-probed, not hardcoded.** `ospec execute launch --primitive goal` produces a native-`/goal` instruction when the target supports it (claude, codex), otherwise an emulated-goal verify-driven plan. CLI-driven targets use `claude -p` / `codex exec` (never `claude --goal`).
- **Scheduling is session-bound.** Controller-driven loops re-run `loop run --once` on the controller's tick cadence (`ospec loop tick-plan`); CLI-driven loops use `ospec loop watch` (dies with the session). Stop with `ospec loop pause` / a `STOP` file / closing the session.
- **Stop condition is three-stage:** run the project's real tests, record evidence with `ospec execute verify --status`, then confirm with `ospec verify`.

## Scope

This skill covers the full lifecycle inside an initialized OSpec project:

- requirement intake
- goal naming or matching
- proposal, design, implementation-plan, task graph, and task refinement
- document review for design and implementation plan
- worker dispatch, launch, collection, retry, and review packets
- user decision gates
- workspace and worktree planning
- TDD, debug, and verification evidence
- a single combined final code review
- finish planning, verification, archive readiness, and finalize closeout

Use `ospec-change` for small routine changes that only need the classic fast flow.

## Read Order

1. `.skillrc`
2. `.ospec/SKILL.index.json` for nested projects, or root `SKILL.index.json`
3. `.ospec/for-ai/ai-guide.md` and `.ospec/for-ai/execution-protocol.md`, or legacy `for-ai/`
4. `.ospec/changes/active/<goal>/proposal.md`
5. `.ospec/changes/active/<goal>/design.md`
6. `.ospec/changes/active/<goal>/implementation-plan.md`
7. `.ospec/changes/active/<goal>/artifacts/agents/task-graph.json`
8. `.ospec/changes/active/<goal>/artifacts/reviews/design-review.md`
9. `.ospec/changes/active/<goal>/artifacts/reviews/implementation-plan-review.md`
10. `.ospec/changes/active/<goal>/artifacts/agents/bootstrap.md`
11. `.ospec/changes/active/<goal>/artifacts/agents/workflow-route.md`
12. `.ospec/changes/active/<goal>/artifacts/agents/workspace-status.md`
13. `.ospec/changes/active/<goal>/artifacts/agents/launch-plan.md`
14. `.ospec/changes/active/<goal>/artifacts/agents/worker-runs/`
15. `.ospec/changes/active/<goal>/artifacts/agents/review-runs/`
16. `.ospec/changes/active/<goal>/artifacts/agents/decisions/`
17. `.ospec/changes/active/<goal>/artifacts/reviews/final-review.md`
18. `.ospec/changes/active/<goal>/artifacts/agents/worker-status.md`
20. `.ospec/changes/active/<goal>/artifacts/agents/tdd-evidence.json`
21. `.ospec/changes/active/<goal>/artifacts/agents/debug-evidence.json`
22. `.ospec/changes/active/<goal>/artifacts/agents/verification-evidence.json`
23. `.ospec/changes/active/<goal>/tasks.md`
24. `.ospec/changes/active/<goal>/state.json`
25. `.ospec/changes/active/<goal>/verification.md`
26. `.ospec/changes/active/<goal>/review.md`

For legacy root-layout projects, use the same paths without the `.ospec/` prefix.

## Language

- Follow the project-adopted document language from managed `for-ai/` guidance, `.skillrc` `documentLanguage`, and existing change docs.
- Write **every** goal document and artifact you author — `proposal.md`, `design.md`, `implementation-plan.md`, `tasks.md`, `verification.md`, `review.md`, review artifacts, and brainstorm content — in that one language. Do not mix Chinese and English within a change.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Visibility & Decisions

- `Announce-Before-Act`: never run the goal workflow silently. Announce in one line which skill you are using (`ospec-goal`) and the current stage; say which `ospec execute ...` command you are about to run and the artifact it writes; when you dispatch native subagents, announce how many workers you launch, which task each takes, and the mechanism (`Task` for Claude Code, `spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, `@generalist` for Gemini, `@mention` for OpenCode); when a gate blocks progress, tell the user what is blocked and what unblocks it.
- `Brainstorm-First`: open each goal with a short brainstorming pass before locking design. Surface the open questions for direction, architecture, API, data, UI, risk, and scope, and ask the user one question at a time instead of silently assuming. **NEVER auto-select the recommended option or resolve a decision gate yourself — `recommended` is only a hint to show the user. Present every gate to the user and wait for their actual choice; required gates block implementation and dispatch until the user answers. Do not run the whole goal in one shot without asking.** Persist exploration with `ospec brainstorm [path] --topic "..."` when useful, and do not leave a brainstorm as an unanswered template — ask the user its decision gates and record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id>` so it has a result. Resolve the brainstorm while its change is the active change (or pass `--change <name>`) so it links to that change and archives together with it — the brainstorm directory name need not match the change name. When any of those is genuinely open, prefer raising a durable decision gate over guessing: `ospec execute decision [changes/active/<goal>] --id <id> --question "..." --option id:label:impact --required`, present the decision report `Chat Prompt` or `artifacts/agents/decisions/index.md`, then record the answer with `--select <option-id>`. Only record an autonomous assumption in `design.md` when the user explicitly defers or is unavailable, and label it as an assumption to confirm. Present options using the best interactive mechanism your harness has: a native question UI (Claude Code `AskUserQuestion`, Gemini `ask_user`) if available, otherwise your plan/approval UI (Codex Plan mode) if available, otherwise the decision report `Chat Prompt` as plain chat text. `ospec session hook --target claude --apply` installs hooks that re-affirm this contract and hard-block subagent dispatch while a required decision is pending. On harnesses without a native picker or plan UI present the decision report `Chat Prompt` in chat instead — the asking step and the `ospec execute dispatch` block on required pending decisions are identical on every harness, so you always ask the user, only the presentation differs.
- `Zero-Setup`: the user only starts a goal and describes the requirement — never make them run setup or `ospec execute ...` commands; you run every OSpec command yourself and the user only answers questions in chat. In a Claude Code harness at goal entry, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, run `ospec session hook --target claude --apply` once (idempotent) so hard enforcement is active for the next session.

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a goal.
3. If the request is new complex work, derive a concise kebab-case goal name and create it with `ospec goal <goal-name> [path]`.
4. If the matching active goal already exists, continue it instead of duplicating it.
5. Draft or update `design.md` from the requirement, `proposal.md`, and project context before editing `implementation-plan.md`, deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code.
6. Draft or update `implementation-plan.md` from `design.md`; identify target files, expected results, verification commands, dependencies, parallelizable work, and conflicts.
7. Derive `artifacts/agents/task-graph.json` from `implementation-plan.md`; derive `tasks.md` from the task graph.
8. Run `ospec execute doc-review [changes/active/<goal>] --stage design`, then approve `artifacts/reviews/design-review.md` before plan review.
9. Run `ospec execute doc-review [changes/active/<goal>] --stage plan`, then approve `artifacts/reviews/implementation-plan-review.md` before worker dispatch or closeout.
10. Use `ospec execute decision` for direction, architecture, API, UI, risk, or scope choices that need explicit user selection.
11. Use `ospec execute workspace`, `dispatch`, `launch`, `complete`, `review`, `feedback`, `sync`, `tdd`, `debug`, and `verify` as needed for the full workflow.
12. Do not archive while task graph status, task-level reviews, final reviews, worker status, required user decisions, document reviews, or verification evidence are incomplete.
13. Use `ospec execute finish` before finalize when the goal used task graph execution or worktree planning.
14. Use `ospec finalize [changes/active/<goal>]` as the normal closeout path. Closeout is automatic when ready: once the goal is complete and `ospec verify` passes with no required user decision or blocking gate pending, run `ospec finalize` yourself — do not stop at `ospec archive ... --check` (preview only) or wait for the user to ask. **`ospec execute finish` strategy prompts (PR / merge / branch / worktree) are optional with safe defaults (`direct-closeout` + `manual` merge) — do NOT ask the user about them; uncommitted change/OSpec files are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause for a genuine human gate: a pending required decision, an unapproved blocking plugin gate (e.g. Checkpoint), real verify/archive blockers, or an explicit user request to preview or approve first.

## Commands

> Token economy: pass `--brief` on `ospec execute …` commands to get a token-lean summary (status, key fields, and the next instruction) instead of the full report — the artifacts are still written in full, so read them only when you need detail. Drive each step from `ospec execute status --brief` rather than re-reading the full `task-graph.json` / `worker-status.md` / `launch-plan.md` every turn.

```bash
ospec status [path]
ospec goal <goal-name> [path] [--flags flag1,flag2] [--level L1|L2|L3]
ospec execute status [changes/active/<goal>] --brief
ospec loop status [changes/active/<goal>]
ospec loop run [changes/active/<goal>] [--once]
ospec loop watch [changes/active/<goal>] [--interval 10m] [--max-ticks N]
ospec loop tick-plan [changes/active/<goal>]
ospec loop level [changes/active/<goal>] <L1|L2|L3>
ospec loop pause [changes/active/<goal>]
ospec loop resume [changes/active/<goal>]
ospec triage list [path]
ospec triage claim [path] --id <id> --by <name>
ospec triage promote [path] --id <id>
ospec execute launch [changes/active/<goal>] [--task task-id] [--target ...] [--primitive subagent|goal|loop] [--until "..."] [--max-iterations N] [--interval 10m]
ospec execute bootstrap [changes/active/<goal>]
ospec execute doc-review [changes/active/<goal>] --stage design
ospec execute doc-review [changes/active/<goal>] --stage plan
ospec execute decision [changes/active/<goal>] --id <id> --question "..." --option id:label:impact --required
ospec execute workspace [changes/active/<goal>]
ospec execute dispatch [changes/active/<goal>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<goal>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute complete <task-id> [changes/active/<goal>] --status DONE --summary "..."
ospec execute review [changes/active/<goal>] --task task-id   # per-task: one combined code review (spec compliance + code quality)
ospec execute review [changes/active/<goal>]                  # whole-change: one combined final code review (after all task reviews approved)
ospec execute tdd [changes/active/<goal>] --phase red|green|refactor --command "..." --status ...
ospec execute debug [changes/active/<goal>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --status ...
ospec execute verify [changes/active/<goal>] --command "..." --status PASSED
ospec execute sync [changes/active/<goal>]
ospec execute finish [changes/active/<goal>] [--target main] [--remote origin]
ospec verify [changes/active/<goal>]
ospec archive [changes/active/<goal>] --check
ospec finalize [changes/active/<goal>]
```

## Guardrails

- Do not use the goal workflow for routine one-file or low-risk changes unless the user asks for it.
- Native subagent dispatch is performed by the current AI harness; shell commands only run through explicit fallback commands such as `launch --run --command`, `orchestrate --command`, or `review --run --command`.
- Do not claim goal closeout while document reviews, task graph, final reviews, worker status, required user decisions, or verification evidence are incomplete.
- If real project tests exist, run them separately before recording verification evidence.
