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
5. Read the current change execution files
6. If Stitch is enabled and the current change activates `stitch_design_review`, inspect `artifacts/stitch/approval.json` first
7. If you need to handle Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement, read the repo-local localized plugin docs under `.ospec/plugins/<plugin>/docs/` first; if they are missing, install or enable the plugin to sync its docs before changing config

## Required Behavior

- Follow the project-adopted document language for `proposal.md`, `tasks.md`, `verification.md`, and `review.md`
- Do not infer change-document language from product copy, default site locale, or an "English-first" business requirement alone
- If the project-adopted protocol is Chinese or the current change docs are already Chinese, keep the change docs in Chinese unless the project rules explicitly switch them to English
- Use the index to locate knowledge before reading target files
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
