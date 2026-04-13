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

The official OSpec CLI package is `@clawplays/ospec-cli`, and the official command is `ospec`. OSpec supports spec-driven development (SDD) and document-driven development for AI coding agents and CLI workflows.

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

- Align before code — keep proposal, tasks, state, verification, and review visible in the repo
- Keep each requirement explicit — the default path moves one requirement through one active change
- Stay lightweight — keep the normal flow short with `init -> change -> verify/finalize`
- Use the assistants you already have — OSpec is built for Codex, Claude Code, and direct CLI workflows

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
$ospec initialize this project.
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
$ospec-change create and advance a change for this requirement.
```

<details>
<summary>Command line</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

</details>

### 3. Archive After Acceptance

After the requirement has passed deployment, testing, QA, or other acceptance checks, archive the validated change.

Recommended prompt:

```text
OSpec, archive this accepted change.
```

Claude / Codex skill mode:

```text
$ospec archive this accepted change.
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

## Update With npm

For an existing OSpec project, after upgrading the CLI with npm, run this in the project directory to refresh the project's OSpec files:

```bash
ospec update
```

`ospec update` also migrates legacy root-level `build-index-auto.cjs` / `build-index-auto.js` tooling into `.ospec/tools/build-index-auto.cjs` and refreshes OSpec-managed hook entrypoints to use the new location.
It also repairs older OSpec projects that still have an OSpec footprint but are missing newer core runtime directories, refreshes managed skills and archive layout metadata, and syncs project assets for already-enabled plugins.
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
│     ospec new <change-name>                                    │
│     ospec progress                                             │
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
| **Active Change** | A dedicated execution container for one requirement, usually with `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`. |

## Features

- **Change-ready initialization**: `ospec init` creates the protocol shell and baseline project knowledge docs in one pass.
- **Guided initialization**: AI-assisted init can ask once for missing summary or tech stack; direct CLI init falls back to placeholder docs when context is missing.
- **Stable project language**: the chosen document language is stored in `.skillrc` so later guidance and generated change docs stay consistent unless you explicitly change it.
- **Docs maintenance**: `ospec docs generate` refreshes or repairs project knowledge docs when you need it later.
- **Tracked requirement execution**: each change can keep proposal, tasks, state, verification, and review files aligned.
- **Queue helpers**: `queue` and `run` support explicit multi-change execution when one active change is not enough.
- **Plugin workflow gates**: plugin commands support Stitch design review and Checkpoint automation through npm-installed official plugins.
- **Skill management**: install and inspect OSpec skills for Codex and Claude Code.
- **Standard closeout**: `finalize` verifies, rebuilds indexes, and archives the change before manual Git commit.

## Plugin Installation

OSpec supports plugins for UI review and runtime validation.
Keep the public flow simple:

```text
$ospec open Stitch for this project.
$ospec open Checkpoint for this project.
```

In AI / `$ospec` flows, requests like "open Stitch" or "open Checkpoint" should be handled as: check whether the plugin is already installed globally, install only when missing, then enable it in the current project.

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
