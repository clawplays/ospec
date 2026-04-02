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

OSpec is a document-driven workflow for AI-assisted development, helping you define requirements and changes in docs first, then drive implementation, validation, and archive through AI collaboration.

<p align="center">
  <a href="docs/prompt-guide.md">Prompt Guide</a> |
  <a href="docs/usage.md">Usage</a> |
  <a href="docs/project-overview.md">Overview</a> |
  <a href="docs/installation.md">Installation</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## Install With npm

```bash
npm install -g @clawplays/ospec-cli
```

## Recommended Prompts

Most teams only need 3 steps to use OSpec:

1. initialize OSpec in your project directory
2. create and advance one change for a requirement, document update, or bug fix
3. archive the accepted change after deployment and validation are complete

### 1. Initialize OSpec In Your Project Directory

Recommended prompt:

```text
Use OSpec to initialize this project.
```

Claude / Codex skill mode:

```text
Use $ospec to initialize this project.
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
- `--document-language`: generated doc language, usually `en-US` or `zh-CN`
- if you pass these values, OSpec uses them directly when generating project docs
- if you do not pass them, OSpec reuses existing docs when possible and otherwise creates placeholder docs first

</details>

### 2. Create And Advance A Change

Use this for requirement delivery, documentation updates, refactors, and bug fixes.

Recommended prompt:

```text
Use OSpec to create and advance a change for this requirement.
```

Claude / Codex skill mode:

```text
Use $ospec-change to create and advance a change for this requirement.
```

![OSpec Change slash command example](docs/assets/ospecchange-slash-command.en.svg)

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
Use OSpec to archive this accepted change.
```

Claude / Codex skill mode:

```text
Use $ospec to archive this accepted change.
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

</details>

## How The OSpec Workflow Works

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                               │
│     "Use OSpec to create and advance a change for this task."  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INIT TO CHANGE-READY                                       │
│     ospec init                                                 │
│     - .skillrc                                                 │
│     - .ospec/                                                  │
│     - changes/active + changes/archived                        │
│     - root SKILL files and for-ai guidance                     │
│     - docs/project/* baseline knowledge docs                   │
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
| **Protocol Shell** | The minimum collaboration skeleton: `.skillrc`, `.ospec/`, `changes/`, root `SKILL.md`, `SKILL.index.json`, and `for-ai/` guidance. |
| **Project Knowledge Layer** | Explicit project context such as `docs/project/*`, layered skill files, and index state that AI can read consistently. |
| **Active Change** | A dedicated execution container for one requirement, usually with `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`. |

## Features

- **Change-ready initialization**: `ospec init` creates the protocol shell and baseline project knowledge docs in one pass.
- **Guided initialization**: AI-assisted init can ask once for missing summary or tech stack; direct CLI init falls back to placeholder docs when context is missing.
- **Docs maintenance**: `ospec docs generate` refreshes or repairs project knowledge docs when you need it later.
- **Tracked requirement execution**: each change can keep proposal, tasks, state, verification, and review files aligned.
- **Queue helpers**: `queue` and `run` support explicit multi-change execution when one active change is not enough.
- **Plugin workflow gates**: built-in plugin commands support Stitch design review and Checkpoint automation.
- **Skill management**: install and inspect OSpec skills for Codex and Claude Code.
- **Standard closeout**: `finalize` verifies, rebuilds indexes, and archives the change before manual Git commit.

## Plugin Features

OSpec includes two optional plugins that extend the document-driven workflow with UI review and flow validation.

### Stitch

Use Stitch for page design review and preview collaboration, especially for landing pages, marketing pages, and UI-heavy changes.

AI conversation:

```text
Use OSpec to enable the Stitch plugin.
```

Claude / Codex skill mode:

```text
Use $ospec to enable the Stitch plugin.
```

<details>
<summary>Command line</summary>

```bash
ospec plugins enable stitch .
```

</details>

### Checkpoint

Use Checkpoint for app flow validation and automated checks, especially for submission flows, critical paths, and pre-acceptance runtime verification.

AI conversation:

```text
Use OSpec to enable the Checkpoint plugin.
```

Claude / Codex skill mode:

```text
Use $ospec to enable the Checkpoint plugin.
```

<details>
<summary>Command line</summary>

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

Notes:

- `--base-url` points to the running app used by automated checks

</details>

## Documentation

### Core Docs

- [Prompt Guide](docs/prompt-guide.md)
- [Usage](docs/usage.md)
- [Project Overview](docs/project-overview.md)
- [Installation](docs/installation.md)
- [Skills Installation](docs/skills-installation.md)

### Plugin Specs

- [Stitch Plugin Spec](docs/stitch-plugin-spec.zh-CN.md)
- [Checkpoint Plugin Spec](docs/checkpoint-plugin-spec.zh-CN.md)

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
