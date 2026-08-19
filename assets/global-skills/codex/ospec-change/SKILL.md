---
name: ospec-change
description: Create or advance a lightweight OSpec change using the classic fast workflow.
tags: [ospec, cli, workflow]
---

# OSpec Change

Use this skill for small or routine requirements where the classic OSpec 1.0 change flow is enough.

## Scope

This skill is the fast change lifecycle inside an initialized OSpec project: requirement intake, change naming or matching, proposal and task refinement, implementation guidance, verification, archive readiness check, and finalize closeout.

The user owns profile selection. Once the user chooses a change, keep it on the classic flow regardless of complexity, flags, file count, or batch size. Never auto-promote, reject, or replace it with a Goal. Use `ospec-goal` only when the user explicitly selects a Goal.

## Read Order

1. `.skillrc`
2. `ospec index query <keyword...>` for the relevant `.ospec/SKILL.index.json` entries (root `SKILL.index.json` in legacy classic projects) — never read the whole index file, which grows without bound as changes archive
3. `.ospec/for-ai/change-protocol.md` for nested projects, or legacy `for-ai/change-protocol.md`
4. `.ospec/changes/active/<change>/proposal.md`, `tasks.md`, and `state.json` for nested projects, or their legacy classic paths
5. Read `verification.md` only when entering verification
6. Read `review.md` only when entering closeout

`change-protocol.md` is the whole classic contract — the decision-gate ladder, force archive, and every other rule this profile needs are stated there in full. `for-ai/execution-protocol.md` is the goal controller layer and tells this profile not to open it, so never go there for a change rule. If `change-protocol.md` itself is missing, use `for-ai/ai-guide.md` to route back to the protocol for the active profile.

## Language

Write every change document and brainstorm you author in the project document language (`.skillrc` `documentLanguage` / managed `for-ai/` guidance / existing change docs). Never infer that language from product copy, site locale, or an "English-first" requirement, and never mix languages within one change.

## Visibility & Decisions

- `Announce-Before-Act`: never run the change flow silently. Announce in one line which skill you are using (`ospec-change`) and the current stage, which `ospec` command you are about to run and the artifact it writes, and which gate is blocking when progress stops.
- `Brainstorm-First` (forked decisions only): raise a gate only for a **genuine fork** — mutually exclusive API shapes, competing UI approaches, data-model or storage choices, destructive or hard-to-reverse operations, or a scope conflict with what the user asked for. For routine unambiguous changes — an evident-cause bug fix, a mechanical refactor, a docs update, a small addition with one reasonable implementation — do **not** open a gate or run `ospec brainstorm`: proceed with the reasonable default and record your assumptions in `proposal.md`.
- On a genuine fork, ask one question at a time and **never auto-select a `recommended` option or resolve a gate yourself** — `recommended` is a hint you show the user, never a choice you may take. Present every gate through the capability ladder, in this order: a harness-native question UI when the harness has one (Claude Code `AskUserQuestion`, Gemini `ask_user`), otherwise its plan/approval UI (for example Codex plan mode), otherwise the decision report `Chat Prompt` as plain chat text. You always ask the user and wait for their actual answer; only the presentation differs, and a required pending decision blocks implementation and closeout identically on every harness. Record the gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact [--recommended id] [--required]` and the answer with `--select <option-id> --answered-by user`; that shared decision command is the one controller command a change may use. If you did run `ospec brainstorm`, do not leave it an unanswered template — record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user`. In Claude Code the managed session hook re-injects this contract at runtime, but it is a convenience for one harness, not the source of the rule: the contract above binds on Codex, Gemini, Grok, OpenCode, Cursor and Copilot too. Full text: `for-ai/change-protocol.md`.
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
11. Set the proposal `change_type` and documentation contract. Bug fixes may record `documentation_impact: none` with a concrete reason. Features and docs changes require at least one real project, module, API, or user document; a legacy generated archive summary (OSpec no longer produces them) does not count. Update `SKILL.md` only when module rules or AI usage contracts changed. Index rebuild is automatic. At planning time run `ospec docs obligations --apply`: the engine derives the located documentation obligations for this `change_type` and writes each resolved `path#section` into `state.json` and the `tasks.md` checklist, so you never have to search for where to write. A refactor or perf change that genuinely changed no documented behaviour records `ospec docs confirm --id <obligation-id>` instead of making a cosmetic edit. A fix with no feature document gets an optional obligation and never blocks archiving.
12. Closeout is automatic when ready: once implementation, `verification.md`, documentation policy, and `review.md` are aligned and `ospec verify [changes/active/<change>]` passes, run `ospec finalize [changes/active/<change>]` yourself. Do not stop at `ospec archive ... --check` (it is a preview only) and do not wait for the user to ask before archiving. **Closeout uses `direct-closeout` (archive locally, no PR) and `manual` merge as defaults — do NOT ask the user about PR, merge, branch, or worktree strategy; uncommitted change/OSpec files in the working tree are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause closeout when a gate genuinely needs a human: a pending required user decision, real blockers reported by verify or archive, or an explicit user request to preview or approve before archiving.
13. Force archive is never automatic and is never inferred from urgency, a blocker, or a request to "finish". **First report the failing gates and every `NOT_VERIFIED` item to the user**, so their acceptance is informed. Only after they explicitly accept that incomplete work, run `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"`; the CLI enforces the exact-name confirmation and a non-empty reason itself. Preserve the failed and `NOT_VERIFIED` evidence: the archive stays incomplete and accepted-risk and must never be presented as completed behavior. Full text: `for-ai/change-protocol.md`.
14. Activated optional steps must appear in `tasks.md` and `verification.md`, and each one that passed must be listed in the `verification.md` frontmatter field `passed_optional_steps` — archive validates that field and blocks while an activated step is missing from it.

## Commands

```bash
ospec status [path]
ospec change <change-name> [path]
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>] --check   # optional preview only — do not stop here
ospec finalize [changes/active/<change>]          # run automatically once verify passes and no human gate is pending
ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"   # explicit user exception only, after reporting the failing gates
```

## Guardrails

- Progress checklists track reality: tick each proposal.md acceptance criterion as it is actually verified — archiving blocks while proposal.md has unchecked items. review.md stays your one lightweight review; record its decision and complete its checklist before closeout. Never tick an item whose work was not done.
- The worktree is serial: closeout blocks on uncommitted files outside the proposal `affects` and documentation scopes. Declare `affects` honestly, and when unattributed dirty files appear (for example another session's edits), commit, stash, or isolate them instead of archiving over them.
- Do not assume dashboard workflows exist.
- Do not confuse repository initialization with change execution.
- Do not enter queue mode unless the user explicitly asks for queue behavior.
- Do not claim completion until implementation, verification notes, and closeout status are aligned.
- If real project tests exist, run or recommend them separately from `ospec verify`.
- Archived changes are frozen evidence: never edit anything under `changes/archived/` (state.json, documents, or artifacts). Archive-time metadata is synced from the authoritative sources by the CLI; if something still looks inconsistent, report it instead of rewriting history — the knowledge index derives from the authoritative documents and self-heals its cache.
