<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec.ai</a></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads&cacheSeconds=300" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

<p align="center">
  <strong>English</strong> |
  <a href="docs/README.zh-CN.md">中文</a> |
  <a href="docs/README.ja.md">日本語</a> |
  <a href="docs/README.ar.md">العربية</a>
</p>

The official OSpec CLI package is `@clawplays/ospec-cli`, and the official command is `ospec`. OSpec is a spec-driven, agentic workflow framework for AI coding agents — it brings spec-driven development (SDD) and Loop Engineering (a verifiable plan → act → verify goal loop) to Claude Code, Codex, Gemini, OpenCode, MCP-based agents, and plain CLI workflows.

<p align="center">
  <a href="docs/prompt-guide.md">Prompt Guide</a> |
  <a href="docs/usage.md">Usage</a> |
  <a href="docs/project-overview.md">Overview</a> |
  <a href="docs/installation.md">Installation</a> |
  <a href="docs/external-plugins.md">External Plugins</a> |
  <a href="docs/plugin-release.md">Plugin Release</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## Why OSpec?

AI coding assistants are powerful, but requirements that live only in chat history are hard to inspect, review, and close out cleanly. OSpec adds a lightweight workflow layer so the repository can hold the change context before code is written and after the work ships.

- **Spec-driven work, saved to your repo** — OSpec turns a request into files (proposal, design, plan, tasks, reviews, verification evidence) that live in your repo instead of in chat history, so any assistant (Codex/GPT, Claude Code, Gemini, OpenCode, or plain CLI) can pick up exactly where the last one stopped.
- **`ospec change` — the everyday fast flow** — one requirement becomes one active change on a short `init -> change -> verify/finalize` path, kept lightweight and easy to review.
- **`ospec goal` for larger or riskier work** — describe the result you need; the AI asks important questions, writes an inspectable plan, implements the work, runs tests, requests an independent review, updates project docs, and continues until the result is proven.
- **You choose how much it may do automatically** — `L1` only checks, `L2` may edit but pauses for important choices, and `L3` may continue within limits you set. Progress is saved in the repository, so a later session can resume it.

## Install With npm

```bash
npm install -g @clawplays/ospec-cli
```

Official package: `@clawplays/ospec-cli`  
Command: `ospec`  
Verify install: `ospec --help`

## Quick Start

OSpec only takes 3 steps:

1. initialize OSpec in your project directory
2. create and advance one change for a requirement, document update, or bug fix
3. archive the accepted change after deployment and validation are complete

### 1. Initialize OSpec In Your Project Directory

Recommended prompt:

```text
OSpec, initialize this project.
```

Claude / Codex skill mode:

```text
/ospec initialize this project.
```

<details>
<summary>Command line</summary>

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language en-US
```

CLI notes:

- `--summary`: project overview text written into the generated docs
- `--tech-stack`: comma-separated stack list such as `node,react,postgres`
- `--architecture`: short architecture description
- `--document-language`: generated doc language, choose from `en-US`, `zh-CN`, `ja-JP`, or `ar`
- AI-first language resolution order: explicit language request in the conversation -> current conversation language -> persisted project language in `.skillrc`
- CLI language resolution order: explicit `--document-language` -> persisted project language in `.skillrc` -> existing project docs / managed `for-ai/*` guidance / asset manifest -> fallback `en-US`
- OSpec persists the chosen project document language in `.skillrc` and reuses it for `for-ai` guidance, `ospec new`, and `ospec update`
- new projects initialized by `ospec init` default to the nested layout: root `.skillrc` and `README.md`, with OSpec-managed files under `.ospec/`
- plain init does not create optional knowledge maps such as `.ospec/knowledge/src/` or `.ospec/knowledge/tests/`; those appear only when a project already has legacy knowledge content to migrate or when future explicit knowledge-generation flows create them
- CLI commands still accept shorthand like `changes/active/<change-name>`, but the physical path in nested projects is `.ospec/changes/active/<change-name>`
- if you pass these values, OSpec uses them directly when generating project docs
- if you do not pass them, OSpec reuses existing docs when possible and otherwise creates placeholder docs first

</details>

### 2. Create And Advance A Change

Use this for requirement delivery, documentation updates, refactors, and bug fixes.

Recommended prompt:

```text
OSpec, create and advance a change for this requirement.
```

Claude / Codex skill mode:

```text
/ospec-change create and advance a change for this requirement.
/ospec-goal create and advance a full goal for this requirement.
```

<details>
<summary>Command line</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

</details>

### Agent Execution (Goal Workflow)

The classic change flow above stays simple: `proposal.md` → `tasks.md` → implement → `verification.md` → `review.md`, with no controller layer. The agent controller layer — parallel worker dispatch, reviewer gates, and durable evidence — belongs to the full goal workflow. Use it with `ospec goal`, or on a single change only when you explicitly opt into agent/worker execution. OSpec keeps the controller state in repo artifacts, and the current AI harness starts native worker agents when available.

```bash
ospec session .
ospec execute bootstrap changes/active/<goal-name>
ospec execute workspace changes/active/<goal-name>
ospec execute status changes/active/<goal-name>
ospec execute dispatch changes/active/<goal-name> --limit 2
ospec execute launch changes/active/<goal-name> --task <task-id> --target codex
ospec execute complete <task-id> changes/active/<goal-name> --status DONE --summary "..."
ospec loop tick changes/active/<goal-name> # issues task/final reviews with executor provenance
ospec execute verify changes/active/<goal-name> --command "npm test" --status PASSED --exit-code 0
```

`launch` writes `artifacts/agents/launch-plan.md`; it does not start workers by itself. Codex/GPT use `spawn_agent` plus bounded `wait_agent`, Claude Code uses bounded background Task polling when available, Gemini uses `@generalist`, and OpenCode uses `@mention`. Every native adapter returns from one wait within 60 seconds, refreshes heartbeats, persists each completed child immediately, and re-ticks. The 60-second boundary limits one controller poll, not the AI task runtime: a live child continues across polls up to its configurable absolute action deadline. OSpec never starts Orca, Codex, Claude, or another agent CLI as a fallback. If the current model harness cannot provide native subagents, executable dispatch blocks until a supported harness reports a fresh capability.

For a controller-owned Goal, task and final reviews are always issued by `ospec loop tick` so the dispatch is atomically bound to the real reviewer executor. Use `ospec execute review` directly only in a non-controller workflow.

### 3. Archive After Acceptance

After the requirement has passed deployment, testing, QA, or other acceptance checks, archive the validated change.

Recommended prompt:

```text
OSpec, archive this accepted change.
```

Claude / Codex skill mode:

```text
/ospec archive this accepted change.
```

<details>
<summary>Command line</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

Archive notes:

- run your project-specific deploy, test, and QA flow first
- use `ospec verify` to confirm the active change is ready
- use `ospec finalize` to rebuild indexes and archive the accepted change
- new nested projects archive under `.ospec/changes/archived/YYYY-MM/YYYY-MM-DD/<change-name>`; CLI shorthand under `changes/archived/...` still works
- existing flat archives are reorganized by `ospec update`

</details>

### Goal: Use It For Work That Needs More Care

Use a goal when the work touches several parts of the project, has important design choices, changes an API or data, carries security or migration risk, or will take several rounds to finish. For a small, well-defined edit, use `ospec new` instead.

Start from a terminal:

```bash
ospec goal improve-checkout --level L2 --target codex --execution-model controller --harness-interactive true --native-subagents supported
```

Then tell the AI what outcome you need in ordinary language. You can also skip the terminal command and say: "Use OSpec goal for this requirement and carry it through to completion."

That is all a normal user needs to operate. The AI will:

1. Ask only the choices that materially change the result.
2. Write down the agreed approach so you can inspect it before code changes begin.
3. Split the work into safe pieces, mark independent tasks parallel, and record why any task or configured limit is intentionally serial.
4. Test the implementation, ask a separate reviewer to check it, and fix the findings.
5. Update the relevant project documentation and indexes before archiving the completed work.

You remain in control. The AI explains what it is about to do, pauses when it needs a decision, and records task, review, repair, verification, and loop progress in the repository so a fresh worker or later session can continue without replaying the conversation. You do not need to run the internal `ospec execute` commands yourself.

Choose how much the goal may do on its own with `--level L1|L2|L3` (default L1):

- **L1** checks and reports, but does not change project files.
- **L2** may make changes and pauses for important decisions.
- **L3** may continue without waiting for routine steps, but only inside non-empty path and command allowlists.

Required user decisions block every level. The integrated goal loop reads `task-graph.json`, emits a bounded conflict-safe parallel batch, and explains whether configured limits, graph conflicts, token funding, or known harness capacity reduced it. When the `ospec-goal` skill is active and the IDE exposes a native subagent API, controller mode requires the current IDE AI to launch one fresh native subagent per referenced packet, poll with bounded native waits, refresh heartbeats, persist each finished result immediately, and continue ticking without another user prompt; it does not stop at Loop initialization or require `loop watch`. L1 remains report-only, so executable work requires the user to select L2 or L3. If the IDE lacks native subagents, controller auto-dispatch fails clearly instead of silently pretending the CLI started an IDE agent.

To see progress, child executor ids, heartbeat due times, leases, review rounds, token sources, and concurrency/guard reasons, run `ospec loop status --brief` or `--json`. Use `ospec loop configure` for concurrency, budgets, action runtime limits, and evidence-result grace; allowlist flags replace the complete selected list and print a diff. For L3, prefer `ospec loop allowlist derive/check/apply --from-task-graph`, whose CAS-bound apply requires explicit approval for permission expansion. IDE controllers persist child ownership with `ospec loop heartbeat` and atomically commit successful evidence plus executor outcome with `ospec loop finalize`; legacy `ospec loop result` remains supported. After a confirmed session/child loss, `ospec loop recover --force` expires only unfinished items so they can be requeued without duplicating completed siblings. Task-review and grouped final-review repair use two rounds as convergence thresholds by default. Changed structured finding IDs continue automatically. From 1.8.11, a stable ID also continues when both its structured finding fingerprint and its authorized repair-scope code snapshot changed; wording-only or code-only churn still stops before another ineffective repair. Use `--continue-while-progressing false` for the earlier strict lifetime ceilings. Durable worker blockers are not redispatched, technical executor failures remain retryable, and independent ready tasks run first. The 1.8.11 refinement contract is documented in [docs/goal-1.8.11-interface.md](docs/goal-1.8.11-interface.md); older runtime contracts remain in their versioned interface documents. Advanced loop and triage commands are documented in [docs/loop-engineering.md](docs/loop-engineering.md).

Internally, OSpec keeps implementation and independent review separate, bounds specialist document review by round/time/no-progress guards, preserves immutable convergence history, feeds blocked work and review findings into transactional retry or grouped repair, and requires current test evidence before the goal is considered complete.

Claude Code hard enforcement (one-time; the AI runs this for you automatically in a Claude Code harness):

```bash
ospec session hook --target claude --apply
```

This writes a hook bundle under `.ospec/hooks/claude/` and merges it into `.claude/settings.json` (idempotent and reversible). The hooks:

- announce every subagent dispatch and every `ospec` command at the tool level,
- hard-block subagent dispatch while a required decision is still pending,
- inject the static Announce-Before-Act / Brainstorm-First contract only on startup, clear, or compact, while prompt submission stays silent unless a required decision is pending.

Hooks load at session start, so they take effect from the next Claude Code session.

## Update With npm

For an existing OSpec project, after upgrading the CLI with npm, run this in the project directory to refresh the project's OSpec files:

```bash
ospec update
```

`ospec update` also migrates legacy root-level `build-index-auto.cjs` / `build-index-auto.js` tooling into `.ospec/tools/build-index-auto.cjs` and refreshes OSpec-managed hook entrypoints to use the new location.
It also repairs older OSpec projects that still have an OSpec footprint but are missing newer core runtime directories, refreshes managed skills and archive layout metadata, and syncs project assets for already-enabled plugins.
For nested projects that still carry legacy knowledge under `.ospec/src/` or `.ospec/tests/`, `ospec update` migrates those paths into `.ospec/knowledge/src/` and `.ospec/knowledge/tests/`.
When an already-enabled plugin has a newer compatible npm package version available, `ospec update` upgrades that global plugin package automatically and prints the version transition.
It does not upgrade the CLI itself, and it does not enable plugins or migrate active / queued changes automatically.
It also does not switch a classic project layout to nested automatically.
If you want to convert an older classic project to the new layout, run `ospec layout migrate --to nested` explicitly.

## How The OSpec Workflow Works

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                               │
│     "OSpec, create and advance a change for this task."       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INIT TO CHANGE-READY                                       │
│     ospec init                                                 │
│     - .skillrc                                                 │
│     - README.md                                                │
│     - .ospec/                                                  │
│     - .ospec/changes/active + .ospec/changes/archived          │
│     - .ospec/SKILL.md + .ospec/SKILL.index.json + .ospec/for-ai│
│     - .ospec/docs/project/* baseline knowledge docs            │
│     - reuse docs or fall back to placeholders                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EXECUTION                                                  │
│     ospec new <change-name>      # classic fast change          │
│     ospec goal <goal-name>       # full goal workflow           │
│     ospec brainstorm / plan (optional pre-change aids)         │
│     ospec session                                              │
│     ospec session hook                                         │
│     ospec progress                                             │
│     ospec execute bootstrap / handoff / doc-review / status    │
│     ospec execute next                                         │
│     ospec execute workspace / worktree / worktree --create     │
│     ospec execute worktree --cleanup / finish                  │
│     ospec execute dispatch / launch / collect / retry / review │
│     ospec execute debug                                        │
│     ospec execute tdd                                          │
│     ospec execute verify                                       │
│     ospec execute sync                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DEPLOY + VALIDATE                                          │
│     project deploy / test / QA                                 │
│     ospec verify                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ARCHIVE                                                    │
│     ospec finalize                                             │
│     rebuild index + archive                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

| Concept | What It Means |
|---------|---------------|
| **Protocol Shell** | The minimum collaboration skeleton: root `.skillrc` and `README.md`, plus managed OSpec files under `.ospec/` for change state, SKILL docs, index state, `for-ai/` guidance, and project docs. |
| **Project Knowledge Layer** | Explicit project context such as `docs/project/*`, layered skill files, and index state that AI can read consistently. |
| **Active Change** | A dedicated execution container for one small or routine requirement, using the classic fast files: `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`, plus plugin artifacts when activated. |
| **Active Goal** | A full-workflow execution container created with `ospec goal`, adding `design.md`, `implementation-plan.md`, `artifacts/agents/task-graph.json`, handoff artifacts, document-review artifacts, launch-plan artifacts, worker-run artifacts, reviewer-run artifacts, retry artifacts, review artifacts, `artifacts/agents/worker-status.md`, and evidence artifacts. |

## Features

- **Change-ready initialization**: `ospec init` creates the protocol shell and baseline project knowledge docs in one pass.
- **Guided initialization**: AI-assisted init can ask once for missing summary or tech stack; direct CLI init falls back to placeholder docs when context is missing.
- **Stable project language**: the chosen document language is stored in `.skillrc` so later guidance and generated change docs stay consistent unless you explicitly change it.
- **One indexed document per archived change**: every successful `finalize` or `archive` writes `docs/project/changes/<archive-path>.md`, then links it from `docs/project/feature-index.md`, `SKILL.index.json.documents`, and `SKILL.index.json.archived_changes`. Before moving the active change, archive preflight refuses to overwrite a human-owned file at that path and verifies the managed output directories are writable. Goals still update the relevant human-maintained architecture, API, module, or operational docs; the generated change summary does not replace them.
- **Scoped review evidence and cost metrics**: task and final review dispatches write `artifacts/agents/review-packages/*.diff` with scoped Git evidence, while `artifacts/agents/execution-metrics.json` records packet/report/package bytes and task duration. Goal task graphs can enable `documentation_updates` so missing or undeclared project docs block archive.
- **Tracked requirement execution**: small changes keep proposal, tasks, state, verification, and review files aligned; full goals also keep design, implementation plan, task graph, handoff, review, worker status, and evidence artifacts aligned.
- **Goal experience contracts**: every goal runs with `Announce-Before-Act` (the AI announces its skill and stage, the `ospec execute …` command and the artifact it writes, and each subagent dispatch), `Brainstorm-First` (open direction, architecture, API, UI, risk, and scope decisions are asked one at a time through the native question UI before design is locked), and `Zero-Setup` (you only start a goal and describe the requirement — the AI runs every `ospec` command itself). In Claude Code, `ospec session hook --target claude --apply` adds hooks that announce every dispatch and hard-block subagent dispatch while a required decision is still pending.
- **Optional pre-change aids**: `ospec brainstorm` writes durable exploration artifacts under `.ospec/brainstorms/`, with an optional static visual companion; `ospec plan` writes plan drafts under `.ospec/plans/` and only updates `implementation-plan.md` when `--apply` is passed. The default small-change flow starts with `ospec new`; the full workflow starts with `ospec goal`.
- **Session brief and hooks**: `ospec session` writes `.ospec/session-brief.json` and `.ospec/session-brief.md` so agents or humans entering an existing project can see active changes, queued changes, queue-run state, indexed document and archived-feature counts, a cache fingerprint, and the next safe command before touching a change; `ospec session hook --target claude` writes opt-in harness startup artifacts plus a Claude Code hook bundle under `.ospec/hooks/`, and `--apply` idempotently merges it into `.claude/settings.json`.
- **Integrated goal loop**: `ospec loop run --once` emits token-bounded task/review/verification action batches for fresh model-native subagents. It uses packet paths instead of duplicating the whole goal, persists pending actions and feedback, routes review failures through retry or one grouped repair wave, and enforces required decisions, L3 allowlists, budgets, no-progress stops, and comprehension-review pauses. The removed `loop watch` path now returns migration guidance without starting an agent process.
- **Task graph controller**: `ospec execute bootstrap` writes a one-change startup/resume snapshot with the project session brief snapshot and next safe action; `handoff` writes a cross-tool worker handoff guide; `doc-review` creates design and implementation-plan reviewer packets; `status` and `next` report controller state; `workspace` records git workspace safety; `worktree` manages explicit git worktree plans/runs; `dispatch`, `launch`, `complete`, and `review` create and settle native-subagent packets; `retry` reopens blocked or needs-context work; `debug`, `tdd`, and `verify` record durable evidence; `sync` rebuilds `worker-status.md`. `orchestrate`, `launch --run --command`, and `review --run --command` are retained only as migration errors and never launch agent CLIs.
- **Adaptive review and model routing**: `.skillrc.workflow.document_review_policy` keeps independent document review by default. With `adaptive`, inline preflight still requires an explicit `risk_level: low` (or `none`) declaration and no detected risk signal; `.skillrc.workflow.model_profiles` maps logical roles without provider model names in OSpec defaults.
- **Measured execution and grouped repair**: command runners can write authoritative usage to `OSPEC_USAGE_FILE` for automatic ingestion, while `--usage-file` remains a manual input. Metrics distinguish complete, partial, and missing coverage. `ospec execute repair` turns all structured `NEEDS_CHANGES` findings into one repair task.
- **Verified durable documentation**: declared documentation targets capture before/after normalized content hashes, so an unchanged file cannot satisfy a new run. Feature indexes link completed work directly to the durable project documents it updated.
- **Queue helpers**: `queue` and `run` support explicit multi-change execution when one active change is not enough.
- **Plugin workflow gates**: plugin commands support Stitch design review and Checkpoint automation through npm-installed official plugins.
- **Skill management**: install and inspect OSpec skills for Codex and Claude Code.
- **Standard closeout**: `finalize` verifies and archives the change, then refreshes the generated feature locator and knowledge index before manual Git commit. It never overwrites human-maintained architecture, module, or API prose.

## Plugin Installation

OSpec supports plugins for UI review and runtime validation.
Keep the public flow simple:

```text
/ospec open Stitch for this project.
/ospec open Checkpoint for this project.
```

In AI / `/ospec` flows, requests like "open Stitch" or "open Checkpoint" should be handled as: check whether the plugin is already installed globally, install only when missing, then enable it in the current project.

Command line fallback:

```bash
ospec plugins list
ospec plugins install stitch
ospec plugins enable stitch .
ospec plugins install checkpoint
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

Official npm plugin packages:

- `@clawplays/ospec-plugin-stitch`
- `@clawplays/ospec-plugin-checkpoint`

After a plugin is enabled, its detailed setup docs are synced into `.ospec/plugins/<plugin>/docs/`.

Maintainers can find plugin publishing and automation details in `docs/plugin-release.md`.

## Documentation

### Core Docs

- [Prompt Guide](docs/prompt-guide.md)
- [Usage](docs/usage.md)
- [Project Overview](docs/project-overview.md)
- [Installation](docs/installation.md)
- [Skills Installation](docs/skills-installation.md)
- [External Plugins](docs/external-plugins.md)
- [Plugin Release](docs/plugin-release.md)

## Repository Structure

```text
dist/                       Compiled CLI runtime
assets/                     Managed protocol assets, hooks, and skill payloads
docs/                       Public documentation
scripts/                    Release and installation helpers
.ospec/templates/hooks/     Hook templates shipped with the package
```

## License

This project is licensed under the [MIT License](LICENSE).
