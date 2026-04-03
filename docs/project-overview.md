# Project Overview

## What OSpec Is

OSpec is a document-driven workflow for AI-assisted development, helping you define requirements and changes in docs first, then drive implementation, validation, and archive through AI collaboration.

It treats docs as the source of truth for requirements and changes. Initialization sets up collaboration rules and baseline project knowledge first, then lets AI drive implementation through explicit change containers.

## Core Principles

- `ospec init` should leave a repository in a change-ready state, not in a half-finished bootstrap state.
- AI-assisted init can ask one concise follow-up for project summary or tech stack when repo context is missing.
- Plain CLI init stays non-interactive and falls back to placeholder project docs when context is unavailable.
- `ospec docs generate` is a later maintenance command for refreshing, repairing, or backfilling project knowledge docs.
- The first change is still explicit. Initialization does not automatically create execution work.
- The recommended user-facing flow is `init -> execute -> deploy/validate -> archive`.
- Queue execution stays explicit. Use it only when the user actually wants multi-change orchestration.

## Typical Use Cases

- repositories that want consistent AI behavior
- teams that want change execution to be visible and reviewable
- projects that may become web, CLI, Unity, Godot, backend, or protocol-only repositories
- environments that need the same workflow across Codex and Claude Code

## How OSpec Compares

Compared with [Spec Kit](https://github.github.com/spec-kit/) — Spec Kit emphasizes executable specifications, richer planning phases, and multi-step refinement. OSpec keeps a thinner change container and a shorter default path to delivery and archive.

Compared with [Kiro](https://kiro.dev/docs/specs/) — Kiro combines specs with steering, hooks, MCP, and powers inside a broader platform. OSpec focuses on a repo-native workflow layer that stays portable across the assistants you already use.

Compared with [OpenSpec](https://github.com/Fission-AI/OpenSpec) — OpenSpec uses an artifact-guided workflow with `/opsx` commands, proposal/specs/design/tasks artifacts, and broad tool integrations. OSpec keeps the default workflow smaller and centers one explicit active change plus a standard `verify -> finalize` closeout path.

## Current Capabilities

- change-ready initialization
- project knowledge maintenance
- active change workflow management
- standard `finalize -> archive -> commit-ready` closeout flow
- aggregated `PASS / WARN / FAIL` change status
- Git hook enforcement for active changes
- Codex and Claude Code skill install and sync

## Command Model

For a new directory, the normal order is:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

When you only need docs maintenance later, use:

```bash
ospec docs generate [path]
```

Use `ospec status [path]` separately when you want a troubleshooting snapshot instead of the default delivery flow.
