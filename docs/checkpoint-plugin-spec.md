# Checkpoint Plugin Specification

This document first explains how users use `checkpoint`, followed by the detailed technical specifications.

## Overview

`checkpoint` is used for runtime page inspections, flow verification, and automated quality gates.

Suitable scenarios:

- Critical submission flows
- Page and interaction checks before acceptance
- Changes requiring automated confirmation of UI, flows, interfaces, and final results

Its core functions are:

- Running automated checks
- Generating gate results
- Blocking `verify / archive / finalize` before checks pass

## How to Enable the Plugin

AI Conversation:

```text
Use OSpec to help me open the Checkpoint plugin.
```

Skill Mode:

```text
Use $ospec to help me open the Checkpoint plugin.
```

Command Line:

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

## Configuration After Enabling

After enabling `checkpoint`, at least the following content must be completed:

1. `base_url`
2. `routes.yaml`
3. `flows.yaml`
4. Login state or login script
5. Startup command and readiness check (if the project is not directly accessible)

### 1. `base_url`

`checkpoint` must be enabled with `--base-url` for the first time.

This address is the actual application URL visited by automated checks, for example:

- `http://127.0.0.1:3000`
- `http://localhost:4173`

### 2. `routes.yaml`

Specify the following in `.ospec/plugins/checkpoint/routes.yaml`:

- Which pages to check
- Viewport for each page
- Corresponding baseline screenshot or design baseline
- Areas to ignore
- Key text or UI requirements on the page

### 3. `flows.yaml`

Specify the following in `.ospec/plugins/checkpoint/flows.yaml`:

- Where critical flows start
- Intermediate steps
- Assertions for interface results
- Assertions for final business states

### 4. Login State or Login Script

If the flow depends on login, prepare at least one of these:

- `.ospec/plugins/checkpoint/auth/storage-state.json`
- A login script like `.ospec/plugins/checkpoint/auth/login.js`

Without login state, many real flows will fail during automated checks.

### 5. Startup Command and Readiness Check

If your project is not "already running naturally," add these to `.skillrc.plugins.checkpoint.runtime`:

- `startup`
- `readiness`
- `shutdown`

Common practice:

- Start with `docker compose up -d`
- Wait for service ready using health check URL
- Shut down after running

## Generated Content

After enabling, the following Checkpoint-related items appear in the project:

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/routes.yaml`
- `.ospec/plugins/checkpoint/flows.yaml`
- `.ospec/plugins/checkpoint/baselines/`
- `.ospec/plugins/checkpoint/auth/`
- `.ospec/plugins/checkpoint/cache/`

Execution results tied to a specific change are placed in:

- `changes/active/<change>/artifacts/checkpoint/`

## Recommended Workflow

1. Initialize project: `ospec init .`
2. Open Checkpoint: `ospec plugins enable checkpoint . --base-url <url>`
3. Configure `routes.yaml`, `flows.yaml`, login state, and environment
4. Run a doctor check: `ospec plugins doctor checkpoint .`
5. Create a change requiring automated verification
6. Execute check: `ospec plugins run checkpoint <change-path>`
7. After check passes, execute `ospec verify` and `ospec finalize`

## When to Use This Plugin

Recommended to enable or trigger Checkpoint for these changes:

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

Checkpoint is generally not needed for copy-only or documentation-only changes.

## Detailed Technical Specifications

This document defines the goals, running contracts, and implementation boundaries for the `checkpoint` plugin in OSpec, ensuring constraints are not lost during subsequent discussions, phased implementation, and context compression.

Subsequent mentions of:

- `Checkpoint Plugin`
- `checkpoint specification`
- `Playwright Auto-Review Plugin`

Refer to this document unless explicitly changed.

## 1. Background

`stitch` handles design artifacts and design review gates, but real projects need another type of automated gate before archiving:

- Is the page consistent with the design?
- Are there UI issues like layout, line breaks, occlusion, fonts, colors, contrast?
- Is the functional flow runnable?
- Is front-end and back-end data consistent?

These capabilities do not fit in `stitch` as they belong to runtime automated checks, not design generation or manual approval.

Thus, a peer plugin to `stitch` is introduced:

- `checkpoint`

`checkpoint` runs automated checks before archiving a change. Archiving is only allowed if all activated checks pass.

## 2. Confirmed Decisions

Confirmed decisions for implementation:

1. `checkpoint` and `stitch` are peer plugins; `checkpoint` is not under `stitch`.
2. The default executor for `checkpoint` is `Playwright`, but plugin semantics are not tied to the executor name.
3. A `base_url` must be provided when enabling `checkpoint` for the first time.
4. Currently only one `base_url` is supported, with no multi-environment switching.
5. `checkpoint` is an automated gate plugin; it does not introduce `approve / reject` manual commands.

6. If the project has `stitch` enabled and the current change activates `stitch_design_review`, `checkpoint` prioritizes reusing the design baseline exported by Stitch.
7. If the project does not have `stitch` enabled, `checkpoint` uses baseline screenshots and text requirements within the repository as the design inspection baseline.
8. Since projects may not have local startup capabilities, `checkpoint` must support custom startup commands; if the project can use `docker compose`, it should be recommended to start the test environment through it.
9. Login state is a supported standard capability, defaulting to `storageState` or a custom login script.
10. Data correctness checks consist of two parts: Playwright page/interface assertions and custom back-end final state assertion commands.
11. `checkpoint` allows activating only specific capabilities based on change flags, rather than running full checks for every change.
12. The recommended implementation order is `ui_review` first, then `flow_check`.

## 3. Terminology Definitions

### 3.1 Plugin

A `plugin` represents a source of extensible capabilities. The name for this plugin is fixed as:

- `checkpoint`

### 3.2 Capability

`checkpoint` is split into two capabilities:

- `ui_review`
- `flow_check`

### 3.3 Optional Step

`checkpoint` contributes two optional steps to the workflow:

- `checkpoint_ui_review`
- `checkpoint_flow_check`

### 3.4 Plugin Workspace

A `plugin workspace` is a project-level, reusable directory for the plugin. For `checkpoint`, it is fixed at:

```text
.ospec/plugins/checkpoint/
```

### 3.5 Gate Artifact

A `gate artifact` is a machine-readable result used for `verify / archive / finalize` gate determination. The main gate file for `checkpoint` is:

```text
changes/active/<change>/artifacts/checkpoint/gate.json
```

## 4. Goals

The goal here is not to build a complete test platform at once, but to enable automated gates before archiving:

1. Projects can enable the `checkpoint` plugin.
2. New changes can activate `checkpoint_ui_review` and `checkpoint_flow_check` based on flags.
3. The plugin can start or connect to the target project and execute Playwright flows based on `base_url`.
4. `ui_review` can perform page inspections based on Stitch exports or repository baseline screenshots.
5. `flow_check` can run critical flows, interface assertions, and custom back-end assertions.
6. `verify / archive / finalize` can block the flow based on `gate.json`.
7. When `stitch` is also enabled, `checkpoint` can automatically sync Stitch approval status upon passing.

## 5. Non-Goals

The following are currently out of scope:

1. Multi-environment matrix execution.
2. General database drivers or direct database connection adapter layers.
3. General recorder or full replay platform.
4. Full visual AI scoring platform.
5. One-time built-in adaptation for all business frameworks.
6. Manual approval UI or manual annotation system.

## 6. Unified Directory Convention

All subsequent plugins will follow a three-layer directory model:

- Project-level config: `.skillrc.plugins.<plugin>`
- Project-level workspace: `.ospec/plugins/<plugin>/`
- Change-level artifact directory: `changes/active/<change>/artifacts/<plugin>/`

Thus, `checkpoint` uses:

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/`
- `changes/active/<change>/artifacts/checkpoint/`

### 6.1 `checkpoint` Project-Level Workspace

Recommended structure:

```text
.ospec/plugins/checkpoint/
  routes.yaml
  flows.yaml
  baselines/
  auth/
    README.md
    login.example.js
  cache/
```

- `routes.yaml`: Page inspection targets, routes, viewports, baseline sources, ignore areas, text requirements.
- `flows.yaml`: Flow entry points, steps, interface assertions, custom back-end assertion commands.
- `baselines/`: Repository-based baseline screenshots.
- `auth/`: Login state files, auth script templates, and instructions (e.g., `storage-state.json`, `login.example.js`).
- `cache/`: Temporary cache, intermediate export results.

### 6.2 `checkpoint` Change-Level Artifact Directory

Recommended structure:

```text
changes/active/<change>/artifacts/checkpoint/
  gate.json
  result.json
  summary.md
  screenshots/
  diffs/
  traces/
```

- `gate.json`: Entry point for archive gate determination.
- `result.json`: Raw structured results.
- `summary.md`: Summary for human reading.
- `screenshots/`: Actual screenshots.
- `diffs/`: Visual difference images.
- `traces/`: Playwright traces, HAR, logs, etc.

## 13. Collaboration with Stitch

When a project enables both `stitch` and `checkpoint`, and the current change activates both `stitch_design_review` and `checkpoint_ui_review`:

1. `checkpoint_ui_review` prioritizes reading the route/theme baseline exported by Stitch.
2. If Stitch does not export comparable screenshots, `checkpoint_ui_review` cannot claim completion of the design consistency check.
3. If `checkpoint_ui_review` passes and `stitch_integration.auto_pass_stitch_review = true`, `checkpoint` can automatically sync `artifacts/stitch/approval.json` to `approved`.
4. If `checkpoint_ui_review` fails, Stitch approval must not be automatically granted.

This means `stitch` handles design artifact and structure gates, while `checkpoint` handles runtime page consistency and automated flow gates.

## 14. Gate Artifacts

### 14.1 `gate.json` Suggested Structure

```json
{
  "plugin": "checkpoint",
  "status": "passed",
  "blocking": true,
  "executed_at": "2026-03-29T08:00:00Z",
  "steps": {
    "checkpoint_ui_review": {
      "status": "passed",
      "issues": []
    },
    "checkpoint_flow_check": {
      "status": "passed",
      "issues": []
    }
  },
  "stitch_sync": {
    "attempted": true,
    "status": "approved"
  },
  "issues": []
}
```

### 14.2 `status` Values

- `pending`
- `passed`
- `failed`

## 15. CLI Command Design

- `ospec plugins status [path]`
- `ospec plugins enable checkpoint [path] --base-url <url>`
- `ospec plugins disable checkpoint [path]`
- `ospec plugins doctor checkpoint [path]`
- `ospec plugins run checkpoint <change-path>`

Note: `checkpoint` does not provide `approve` or `reject` commands as it is an automated gate.

## 16. Verify / Archive / Finalize Behavior

### 16.1 `verify`

When any `checkpoint` step is activated, the following checks are added:

1. `artifacts/checkpoint/gate.json` exists.
2. `gate.json.status` is `passed`.
3. Each activated `checkpoint` step is `passed`.
4. Stitch approval is synced if linked.

### 16.2 `archive`

If any `checkpoint` step is activated and `blocking = true`:

- Archive is blocked if `gate.json.status != passed`.
- Archive is blocked if any activated step failed or critical issues remain.

## 17. Implementation Order

1. **Phase 1: Schema and Project-Level Workspace**: Define `.skillrc.plugins.checkpoint` and `.ospec/plugins/checkpoint/` directory structure.
2. **Phase 2: `ui_review` Gate**: Implement Playwright page checks and gate results.
3. **Phase 3: Integration with Stitch**: Sync `checkpoint_ui_review` with Stitch approval.
4. **Phase 4: `flow_check` Gate**: Implement critical flows and assertions.

## 18. Purpose of This Document

When implementing `checkpoint`, refer to this document for scope. Any deviation should involve updating the document first. This ensures `checkpoint` remains a distinct automated gate plugin with clear boundaries relative to `stitch`.
