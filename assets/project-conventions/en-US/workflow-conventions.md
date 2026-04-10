---
name: project-workflow-conventions
title: Workflow Execution Conventions
tags: [conventions, workflow, change, ospec]
---

# Workflow Execution Conventions

## Goal

This document fixes the OSpec execution flow inside the project so requirements move through planning, implementation, verification, and archive with consistent gates.

## Standard Order

1. Clarify project context and impact scope
2. Create or update `proposal.md`
3. Create or update `tasks.md`
4. Advance implementation according to `state.json`
5. Update the relevant `SKILL.md`
6. Rebuild `SKILL.index.json`
7. Complete `verification.md`
8. Archive only after all gates pass

## State Constraints

- Use `state.json` as the execution status source of truth
- `verification.md` does not replace `state.json`
- If state files and execution files disagree, fix state first

## Document Language

- Keep `proposal.md`, `tasks.md`, `verification.md`, and `review.md` in the project-adopted document language
- Product UI language may differ from the OSpec change-document language; do not infer one from the other
- If a change was created in Chinese, continue updating it in Chinese unless project rules explicitly require a switch to English

## Optional Steps

- Optional-step activation is controlled by `.skillrc.workflow`
- Proposal flags must remain compatible with the workflow configuration
- Activated optional steps must appear in `tasks.md` and `verification.md`

## Plugin Gates

- Plugin capabilities are controlled by `.skillrc.plugins`
- If the current change activates `stitch_design_review`, inspect `artifacts/stitch/approval.json` first
- If `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` first to generate a preview and send the preview URL to the user for review
- Treat `.skillrc.plugins.stitch.project.project_id` as the canonical Stitch project for the repository; all UI changes should reuse that same Stitch project
- If the canonical Stitch project is still empty, the first successful `ospec plugins run stitch <change-path>` should save it into `.skillrc.plugins.stitch.project`, and later runs must reuse it
- If Stitch returns a different project ID from the canonical one, treat that run as invalid instead of accepting the new project automatically
- `ospec plugins run stitch <change-path>` uses the configured Stitch provider adapter by default; if the project explicitly overrides `.skillrc.plugins.stitch.runner`, use the custom Stitch bridge / wrapper instead
- For custom runners, use `token_env` when extra tokens are required; for the built-in Gemini adapter, auth is typically configured under `%USERPROFILE%/.gemini/settings.json` in `mcpServers.stitch`
- Use `ospec plugins doctor stitch <project-path>` to validate the runner, provider CLI, stitch MCP, and auth-hint readiness
- For Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement, read the repo-local plugin spec that matches the project's adopted document language first; only fall back to another localized spec when that language-specific file is missing
- If the repo does not contain a Stitch spec, use the built-in baselines instead: `gemini` edits `%USERPROFILE%/.gemini/settings.json` with `mcpServers.stitch.httpUrl` and `headers.X-Goog-Api-Key`; `codex` edits `%USERPROFILE%/.codex/config.toml` with `[mcp_servers.stitch]`, `type = "http"`, `url = "https://stitch.googleapis.com/mcp"`, and `X-Goog-Api-Key`
- If the built-in `codex` provider succeeds on read-only calls but local write operations never reach `mcp_tool_call`, first verify the run actually uses `codex exec --dangerously-bypass-approvals-and-sandbox`
- If the project overrides a custom Codex runner / wrapper, that custom execution path must also pass `--dangerously-bypass-approvals-and-sandbox`
- When `approval.json.status` is not `approved`, do not claim the change has passed design review or is ready to archive
- Prefer `ospec plugins approve stitch <change-path>` or `ospec plugins reject stitch <change-path>` when recording review results

## Archive Gates

- Do not archive when docs are stale
- Do not archive when the index is stale
- Do not archive when optional steps have not passed
- Do not archive when `verification.md` is incomplete

## Execution Requirements

- Any AI or human advancing a change must read `.skillrc`, `SKILL.index.json`, and the current change files first
- Any completion claim must match the real file state instead of skipping gates through narration
