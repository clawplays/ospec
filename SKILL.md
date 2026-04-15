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

Use when the user is explicitly ready to move into execution.

```text
Use ospec to create and advance a change for this requirement. Respect the current project state and do not create queue work unless I ask for it.
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
- do not enter queue mode unless the user explicitly asks for queue behavior
- treat planning defaults as guidance, not as init-time templates
- use the CLI commands for verification, archiving, and targeted inspection instead of ad-hoc filesystem edits

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

Treat these as the source of truth for active delivery work:

- `.skillrc`
- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `changes/active/<change>/proposal.md`
- `changes/active/<change>/tasks.md`
- `changes/active/<change>/state.json`
- `changes/active/<change>/verification.md`

## Plugin Gates

Before advancing an active change:

- read `.skillrc.plugins` to detect enabled blocking plugins
- if the current change activates `stitch_design_review`, inspect `changes/active/<change>/artifacts/stitch/approval.json`
- when Stitch approval is missing or `status != approved`, treat the change as blocked and do not claim it is ready to continue or archive

Do not fall back to the old `features/...` layout unless the target repository really still uses it.

## Commands To Prefer

```bash
ospec status [path]
ospec init [path]
ospec init [path] --document-language zh-CN
ospec init [path] --summary "..." --tech-stack node,react
ospec docs generate [path]
ospec new <change-name> [path]
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
ospec skill status-claude ospec
ospec skill install-claude ospec
ospec skill status-claude ospec-change
ospec skill install-claude ospec-change
```

Managed auto-sync targets for global install, `ospec init`, and `ospec update` are:

- `ospec`
- `ospec-change`

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

Use `ospec docs generate [path]` later when you need a docs-only maintenance pass.

Use `ospec status [path]` separately when you want an explicit troubleshooting snapshot.

For completed changes, archive before commit. Use `ospec archive [changes/active/<change>]` to execute the archive and `--check` only when you want a readiness preview without moving files.

For the normal closeout path, prefer `ospec finalize [changes/active/<change>]`. It should verify completeness, rebuild the index, archive the change, and leave Git commit as a separate manual step.

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
