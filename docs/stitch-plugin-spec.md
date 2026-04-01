# Stitch Plugin Specification

This document first explains how users use `stitch`, followed by the detailed technical specifications.

## Overview

`stitch` is used for page design review and preview collaboration.

Suitable scenarios:

- Landing pages, marketing pages, activity pages
- Page requirements with significant UI changes
- Changes requiring a design preview before deciding whether to proceed with development

Its core functions are:

- Generating or submitting page previews
- Waiting for manual approval
- Blocking `verify / archive / finalize` before approval

## How to Enable the Plugin

AI Conversation:

```text
Use OSpec to help me open the Stitch plugin.
```

Skill Mode:

```text
Use $ospec to help me open the Stitch plugin.
```

Command Line:

```bash
ospec plugins enable stitch .
```

## Configuration After Enabling

After enabling `stitch`, typically these 3 things need to be completed:

1. Select a provider
2. Configure Stitch authentication
3. Run a doctor check to confirm both the local machine and the project are ready

### 1. Select a Provider

The default provider is `gemini`, but it can be switched to `codex`.

Most users do not need to change the runner; just confirm which one is used in `.skillrc.plugins.stitch.provider`.

### 2. Configure Stitch Authentication

If using `gemini`:

- Configure the `stitch` MCP in `~/.gemini/settings.json`
- Add `X-Goog-Api-Key`

Example:

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

If using `codex`:

- Configure the `stitch` MCP in `~/.codex/config.toml`
- Also requires `X-Goog-Api-Key`

Example:

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

### 3. Run a Doctor Check

```bash
ospec plugins doctor stitch .
```

This command checks:

- Whether the plugin is enabled
- Whether the provider is configured
- Whether the local CLI is available
- Whether Stitch MCP and authentication are ready

## Generated Content

After enabling, the following Stitch-related items appear in the project:

- `.skillrc.plugins.stitch`
- `.ospec/plugins/stitch/project.json`
- `.ospec/plugins/stitch/exports/`
- `.ospec/plugins/stitch/baselines/`
- `.ospec/plugins/stitch/cache/`

Approval artifacts tied to a specific change are placed in:

- `changes/active/<change>/artifacts/stitch/`

## Recommended Workflow

1. Initialize project: `ospec init .`
2. Open Stitch: `ospec plugins enable stitch .`
3. Configure provider and authentication: `ospec plugins doctor stitch .`
4. Create a UI change
5. Run Stitch: `ospec plugins run stitch <change-path>`
6. Send the generated `preview_url` to the reviewer
7. After approval, execute: `ospec plugins approve stitch <change-path>`
8. Proceed with `ospec verify` and `ospec finalize`

## When to Use This Plugin

Recommended for these change types:

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

## Detailed Technical Specifications

This document defines the goals, running contracts, and implementation boundaries for the `stitch` plugin in OSpec.

## 1. Background

In project delivery, page development often requires manual review. `stitch` provides the bridge for this process, ensuring manual approval is required before a change is archived.

## 2. Confirmed Decisions

1. The name for this plugin is `stitch`.
2. The default provider is `gemini`.
3. Changes can activate the `stitch_design_review` optional step.
4. `stitch` uses a project-level workspace: `.ospec/plugins/stitch/`.
5. Gate artifacts are stored in `changes/active/<change>/artifacts/stitch/`.
6. `verify / archive / finalize` commands respect the `stitch` gate.

## 6. Directory Structure Convention

- Project-level config: `.skillrc.plugins.stitch`
- Project-level workspace: `.ospec/plugins/stitch/`
- Change-level artifacts: `changes/active/<change>/artifacts/stitch/`

### 6.1 `stitch` Project-Level Workspace

```text
.ospec/plugins/stitch/
  project.json
  exports/
  baselines/
  cache/
```

- `project.json`: Stitch project ID and configuration.
- `exports/`: Exported screenshots or design files for comparison.
- `baselines/`: Reference design baselines.
- `cache/`: Intermediate data cache.

### 6.2 `stitch` Change-Level Artifact Directory

```text
changes/active/<change>/artifacts/stitch/
  approval.json
  summary.md
  result.json
```

- `approval.json`: Approval status (`pending`, `approved`, `rejected`).
- `summary.md`: Human-readable summary of the review.
- `result.json`: Structured execution result including `preview_url`.

## 14. CLI Commands

- `ospec plugins status`
- `ospec plugins enable stitch`
- `ospec plugins doctor stitch`
- `ospec plugins run stitch <change-path>`
- `ospec plugins approve stitch <change-path>`
- `ospec plugins reject stitch <change-path>`

## 17. Runtime Bridge Specification

The current version implements the Stitch runtime bridge with the following conventions:

### 17.1 Project Configuration

Built-in support for `Gemini CLI + stitch MCP` or `Codex CLI + stitch MCP`.

Default runner configuration (if not overridden):

```json
{
  "mode": "command",
  "command": "node",
  "args": [
    "${ospec_package_path}/dist/adapters/gemini-stitch-adapter.js",
    "--change",
    "{change_path}",
    "--project",
    "{project_path}"
  ],
  "cwd": "{project_path}",
  "timeout_ms": 900000
}
```

### 17.1.1 Provider Selection

Choose between `gemini` and `codex` in `.skillrc.plugins.stitch.provider`.

### 17.6 Execution Results

`result.json` contains:

- Execution timestamp
- Runner command and parameters
- Parsed `preview_url`
- `screen_mapping` for visual comparison

### 17.7 Collaboration with Checkpoint

If `checkpoint` is also enabled and `checkpoint_ui_review` is active:

1. `stitch` should export comparable screenshots to `.ospec/plugins/stitch/exports/`.
2. `result.json` must map these exports to routes/themes.
3. Without these exports, `checkpoint` cannot perform automated visual consistency checks.

## 18. Implementation Meaning

When implementing or extending the Stitch plugin, follow this document to ensure boundaries are maintained and design details are not lost across dialogue rounds.
