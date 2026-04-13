---
name: ospec-change
description: Create or advance an active change inside an OSpec project, from requirement intake through verification and finalize.
tags: [ospec, cli, workflow]
---

# OSpec Change

Use this skill when the user says things like "use ospec change to do a requirement".

## Scope

This skill is the single entry for the full change lifecycle inside an initialized OSpec project:
- requirement intake
- change naming or matching
- explicit queue planning when the user asks for queue behavior
- proposal and task refinement
- implementation guidance
- progress tracking
- verification
- archive readiness check
- finalize closeout

## Read Order

1. `.skillrc`
2. `SKILL.index.json`
3. `for-ai/ai-guide.md`
4. `for-ai/execution-protocol.md`
5. If Stitch or Checkpoint installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement is involved, read the localized plugin docs under `.ospec/plugins/<plugin>/docs/` first. Before any install step, check `ospec plugins info <plugin>` or `ospec plugins installed`. If the plugin is already installed globally, reuse it and enable it in the current project instead of reinstalling it.
6. Treat `ospec update [path]` as project-scoped. It repairs the current project and only upgrades plugins that are enabled in that project.
7. Do not run `ospec plugins update --all` unless the user explicitly asks to update every installed plugin on the machine.
6. If the user explicitly asks for queue behavior, inspect `changes/queued/` before creating new queue items.
7. `changes/active/<change>/proposal.md`
8. `changes/active/<change>/tasks.md`
9. `changes/active/<change>/state.json`
10. `changes/active/<change>/verification.md`
11. `changes/active/<change>/review.md`

## Language

- Follow the project-adopted document language from `for-ai/` and existing change docs.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Plugin Gates

After reading `.skillrc`, inspect enabled plugins before advancing the change.

### Stitch

When `.skillrc.plugins.stitch.enabled = true` and `.skillrc.plugins.stitch.capabilities.page_design_review.enabled = true`:

- determine whether the current change activates `stitch_design_review` from proposal `flags` and `tasks.md` / `verification.md` `optional_steps`
- if activated, read `changes/active/<change>/artifacts/stitch/approval.json`
- if `approval.json.preview_url` or `submitted_at` is empty, run `ospec plugins run stitch <change-path>` before asking the user to review the design
- if `.skillrc.plugins.stitch.project.project_id` is already configured, reuse that exact Stitch project instead of creating a new project
- if `.skillrc.plugins.stitch.project.project_id` is empty, treat the first successful Stitch run as the canonical project and keep using it for later changes
- treat missing approval or `status != approved` as a blocking gate
- do not claim the change can continue implementation closeout or archive readiness until Stitch approval is complete
- treat the built-in `stitch` plugin with the configured provider adapter as the default path unless `.skillrc.plugins.stitch.runner` is explicitly overridden
- if a custom runner is configured and `token_env` is set but missing, stop and request configuration first
- if runner readiness, provider CLI, stitch MCP, or auth readiness is unclear, use `ospec plugins doctor stitch <project-path>` before `ospec plugins run stitch <change-path>`
- if Stitch installation, provider switching, doctor remediation, MCP setup, or auth setup is involved, read `.ospec/plugins/stitch/docs/` first and follow the plugin's documented config snippets instead of inventing `command` / `args` / `env` or stdio-proxy settings
- use `ospec plugins approve stitch <change-path>` or `ospec plugins reject stitch <change-path>` to record the review result

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.
3. If the request is a new requirement, derive a concise kebab-case change name and create it.
4. If the matching active change already exists, continue it instead of duplicating it.
5. Default to one active change unless the user explicitly asks to split work into multiple changes, create a queue, or execute a queue.
6. When queue behavior is explicitly requested, derive an ordered list of concise kebab-case change names. Each name should represent one execution unit, not a mixed bundle.
7. For explicit queue planning, present the queue as an ordered list first. Use `ospec queue add ...` to create queued changes and `ospec run ...` only when the user explicitly asks to run the queue.
8. Treat `changes/active/<change>/` as the execution container.
9. Keep `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md` aligned with actual execution and with the project's established document language.
10. Use OSpec closeout commands instead of inventing a parallel process.
11. Apply plugin gates from `.skillrc` before advancing a change.
12. If `stitch_design_review` is activated, inspect the Stitch approval artifact before continuing execution.
13. If the Stitch preview has not been submitted yet, run `ospec plugins run stitch <change-path>` before asking for design review.
14. If Stitch approval is missing or not approved, stop at the review gate instead of treating the change as ready.

## Commands

```bash
ospec status [path]
ospec new <change-name> [path]
ospec changes status [path]
ospec queue status [path]
ospec queue add <change-name> [path]
ospec queue activate <change-name> [path]
ospec queue next [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
ospec run status [path]
ospec plugins status [path]
ospec plugins doctor stitch [path]
ospec plugins run stitch [changes/active/<change>]
ospec plugins approve stitch [changes/active/<change>]
ospec plugins reject stitch [changes/active/<change>]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>] --check
ospec finalize [changes/active/<change>]
```

## Guardrails

- Do not assume dashboard workflows exist.
- Do not refer to `basic` or `full` structure levels.
- Do not confuse repository initialization with change execution.
- Do not enter queue mode unless the user explicitly asks for queue behavior.
- Do not turn an ordinary single requirement into multiple queued changes unless the user explicitly asks to split it.
- Do not continue past an active Stitch review gate when approval is missing or not approved.
- Do not claim completion until implementation, verification notes, and closeout status are aligned.
- If real project tests exist, run or recommend them separately from `ospec verify`.
