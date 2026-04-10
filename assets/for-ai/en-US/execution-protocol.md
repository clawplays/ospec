---
name: project-execution-protocol
title: Execution Protocol
tags: [ai, protocol, ospec]
---

# AI Execution Protocol

## Read First Every Time You Enter A Project

1. `.skillrc`
2. `SKILL.index.json`
3. `docs/project/naming-conventions.md`
4. `docs/project/skill-conventions.md`
5. `docs/project/workflow-conventions.md`
6. The current change files: `proposal.md / tasks.md / state.json / verification.md`
7. If `stitch_design_review` exists, read `artifacts/stitch/approval.json`
8. If Stitch or Checkpoint provider, MCP, auth, install, or enable config must be changed, read the repo-local localized plugin spec that matches the project document language first; only fall back to another localized spec when the matching file is missing

## Mandatory Rules

- Keep `proposal.md`, `tasks.md`, `verification.md`, and `review.md` in the project-adopted document language
- Do not rewrite change docs into English just because the product UI, site locale, or requirement text is English-first
- If the current change docs are already Chinese, continue in Chinese unless the project rules explicitly require an English switch
- Do not skip proposal/tasks and jump straight into implementation
- Use `state.json` as the execution status source of truth
- Activated optional steps must appear in `tasks.md` and `verification.md`
- If `stitch_design_review` is active and `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` first to submit a design preview
- Stitch design review must enforce one canonical layout per route; non-canonical screens under the same route must be explicitly marked as `archive / old / exploration`
- For `light/dark` theme variants, keep the same canonical layout and only transform the visual theme; do not reorder modules, regroup sections, move CTAs, or alter navigation structure
- If the matching page already exists, prefer `edit existing screen` or `duplicate existing canonical screen and derive a theme variant`
- Every Stitch delivery must output `screen mapping` with at least the route, canonical dark/light screen ids, derived relationship, and archived screen ids
- Old, exploratory, and replaced screens must not remain beside canonical screens as peer main pages
- If `.skillrc.plugins.stitch.project.project_id` exists, reuse that exact Stitch project ID and do not create a separate Stitch project for this change
- If the canonical Stitch project is still empty, the first successful Stitch submission becomes the canonical project for the repository
- Before running Stitch, assume the built-in `stitch` plugin uses the configured provider by default; only treat `.skillrc.plugins.stitch.runner` as authoritative when the project explicitly overrides it
- If the project uses a custom runner and `token_env` is configured, confirm the matching environment variable is set
- If the local Stitch bridge, Gemini CLI, Codex CLI, stitch MCP, or auth readiness is unclear, run `ospec plugins doctor stitch <project-path>` first
- If `plugins doctor stitch` reveals provider, MCP, or auth issues, return to the repo-local localized Stitch spec first; do not invent an alternate `command` / `args` / `env` or stdio-proxy config outside that spec
- If the built-in `codex` provider can complete read-only calls but `create_project`, `generate_screen`, or `edit_screens` stalls locally, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project explicitly overrides `.skillrc.plugins.stitch.runner` and still uses Codex for Stitch writes, the custom runner / wrapper must also pass `--dangerously-bypass-approvals-and-sandbox`
- If `stitch_design_review` is active and `approval.json.status != approved`, do not treat the change as ready for continued implementation, completion, or archive
- If canonical selection, theme pairing, screen mapping, or duplicate cleanup is missing, do not treat the design review as passed
- Do not treat the work as complete when `SKILL.md` and the index are out of sync

## Project-Adopted Rules First

If the project rules differ from the mother spec, the project-adopted rules take precedence.

## Stitch Provider Baseline

- If the project contains a localized Stitch plugin spec matching the project document language, provider / MCP / auth config must follow that spec first.
- If the project does not contain that spec and the built-in `gemini` provider is used, the baseline config is `%USERPROFILE%/.gemini/settings.json` with `mcpServers.stitch.httpUrl = "https://stitch.googleapis.com/mcp"` and `headers.X-Goog-Api-Key`.
- If the project does not contain that spec and the built-in `codex` provider is used, the baseline config is `%USERPROFILE%/.codex/config.toml` with `[mcp_servers.stitch]`, `type = "http"`, `url = "https://stitch.googleapis.com/mcp"`, and `X-Goog-Api-Key` in `headers` or `[mcp_servers.stitch.http_headers]`.
- The built-in `codex` provider should launch Stitch write operations with `--dangerously-bypass-approvals-and-sandbox`; if a custom runner replaces it, that runner must carry the same write-bypass behavior explicitly.

## Stitch Theme Variant Prompt Contract

- For `light/dark` theme variants, prompts must explicitly include:
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
