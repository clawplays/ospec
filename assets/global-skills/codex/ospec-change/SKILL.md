---
name: ospec-change
description: Create or advance a lightweight OSpec change using the classic fast workflow.
tags: [ospec, cli, workflow]
---

# OSpec Change

Use this skill for small or routine requirements where the classic OSpec 1.0 change flow is enough.

## Scope

This skill is the fast change lifecycle inside an initialized OSpec project:

- requirement intake
- change naming or matching
- proposal and task refinement
- implementation guidance
- verification
- archive readiness check
- finalize closeout

The user owns profile selection. Once the user chooses a change, keep it on the classic flow regardless of complexity, flags, file count, or batch size. Never auto-promote, reject, or replace it with a Goal. Use `ospec-goal` only when the user explicitly selects a Goal.

## Read Order

1. `.skillrc`
2. Relevant entries from `.ospec/SKILL.index.json` for nested projects, or root `SKILL.index.json` for legacy classic projects
3. `.ospec/for-ai/change-protocol.md` for nested projects, or legacy `for-ai/change-protocol.md`
4. `.ospec/changes/active/<change>/proposal.md`, `tasks.md`, and `state.json` for nested projects, or their legacy classic paths
5. Read `verification.md` only when entering verification
6. Read `review.md` only when entering closeout

If `change-protocol.md` is missing, fall back to the full `ai-guide.md` and `execution-protocol.md`. Read those full guides otherwise only when a blocking plugin is active or one specific ambiguous rule requires them.

## Language

- Follow the project-adopted document language from managed `for-ai/` guidance, `.skillrc` `documentLanguage`, and existing change docs.
- Write every change document you author (`proposal.md`, `tasks.md`, `verification.md`, `review.md`, and brainstorm content) in that one language. Do not mix Chinese and English within a change.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Visibility & Decisions

- `Announce-Before-Act`: never run the change flow silently. Announce in one line which skill you are using (`ospec-change`) and the current stage, which `ospec` command you are about to run and the artifact it writes, and which gate is blocking when progress stops.
- `Brainstorm-First` (forked decisions only): raise a decision gate only when the requirement has a **genuine fork** — mutually exclusive API shapes, competing UI approaches, data-model or storage choices, destructive or hard-to-reverse operations, or a scope conflict with what the user asked for. For routine unambiguous changes — a bug fix with an evident cause, a mechanical refactor, a docs update, a small addition with one reasonable implementation — do **not** open decision gates or run `ospec brainstorm`: proceed with the reasonable default and record the assumptions you made in `proposal.md` so the user can correct them. When a genuine fork exists: ask one question at a time; **NEVER auto-select the recommended option or resolve a gate yourself — `recommended` is only a hint to show the user; present each gate and wait for the user's actual choice.** **Use the best interactive mechanism your harness has — a native question UI (Claude Code `AskUserQuestion`, Gemini `ask_user`) if available, otherwise your plan/approval UI (Codex Plan mode) if available, otherwise plain chat text — you always ask the user, only the presentation differs.** If you did run `ospec brainstorm`, do not leave it as an unanswered template: record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id>` so the brainstorm has a result.
- `Zero-Setup`: the user only describes the change; you run every `ospec` command yourself and never ask them to type setup or execution commands. In a Claude Code harness, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, run `ospec session hook --target claude --apply` once (idempotent).

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.
3. If the request is a new requirement, derive a concise kebab-case change name and create it with `ospec change <change-name> [path]` (`ospec new` remains a compatibility alias).
4. If the matching active change already exists, continue it instead of duplicating it.
5. Keep the work inside the active change container.
6. Keep `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md` aligned with actual execution.
7. Do not create `design.md`, `implementation-plan.md`, task graphs, worker packets, or Goal review artifacts for changes.
8. Put batch changes in the queue and execute them sequentially in a shared worktree.
9. Use OSpec closeout commands instead of inventing a parallel process.
10. The current AI performs one lightweight `review.md` review. `APPROVED` and `APPROVED_WITH_CONCERNS` may close automatically; `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` stop closeout.
11. Set the proposal `change_type` and documentation contract. Bug fixes may record `documentation_impact: none` with a concrete reason. Features and docs changes require at least one real project, module, API, or user document; the generated archive summary does not count. Update `SKILL.md` only when module rules or AI usage contracts changed. Index rebuild is automatic.
12. Closeout is automatic when ready: once implementation, `verification.md`, documentation policy, plugin gates, and `review.md` are aligned and `ospec verify [changes/active/<change>]` passes, run `ospec finalize [changes/active/<change>]` yourself. Do not stop at `ospec archive ... --check` (it is a preview only) and do not wait for the user to ask before archiving. **Closeout uses `direct-closeout` (archive locally, no PR) and `manual` merge as defaults — do NOT ask the user about PR, merge, branch, or worktree strategy; uncommitted change/OSpec files in the working tree are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause closeout when a gate genuinely needs a human: a pending required user decision, an unapproved blocking plugin gate (e.g. Checkpoint), real blockers reported by verify or archive, or an explicit user request to preview or approve before archiving.
13. Force archive is never automatic. Use it only after the user explicitly accepts incomplete work: report the failed gates and inspect any pending Loop pointer. It is safe only when every action item is durably `completed`, `failed`, or `expired`; missing, `issued`, or `running` items still block. Then run `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"`. Preserve failed and `NOT_VERIFIED` evidence; the archive is marked incomplete and must not be presented as completed behavior.

## Commands

```bash
ospec status [path]
ospec change <change-name> [path]
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>] --check   # optional preview only — do not stop here
ospec finalize [changes/active/<change>]          # run automatically once verify passes and no human gate is pending
ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>" # explicit user exception only
```

## Guardrails

- Progress checklists track reality: tick each proposal.md acceptance criterion as it is actually verified — archiving blocks while proposal.md has unchecked items. review.md stays your one lightweight review; record its decision and complete its checklist before closeout. Never tick an item whose work was not done.
- The worktree is serial: closeout blocks on uncommitted files outside the proposal `affects` and documentation scopes. Declare `affects` honestly, and when unattributed dirty files appear (for example another session's edits), commit, stash, or isolate them instead of archiving over them.
- Do not assume dashboard workflows exist.
- Do not confuse repository initialization with change execution.
- Do not enter queue mode unless the user explicitly asks for queue behavior.
- Never escalate or auto-promote a change to the Goal workflow; only the user selects Goal.
- Do not claim completion until implementation, verification notes, and closeout status are aligned.
- If real project tests exist, run or recommend them separately from `ospec verify`.
