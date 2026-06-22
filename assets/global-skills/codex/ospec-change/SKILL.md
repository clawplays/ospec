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

Use `ospec-goal` instead when the work needs design docs, implementation planning, task graph dispatch, parallel workers, document review, evidence artifacts, or full review gates.

## Read Order

1. `.skillrc`
2. `.ospec/SKILL.index.json` for nested projects, or root `SKILL.index.json` for legacy classic projects
3. `.ospec/for-ai/ai-guide.md` for nested projects, or legacy `for-ai/ai-guide.md`
4. `.ospec/for-ai/execution-protocol.md` for nested projects, or legacy `for-ai/execution-protocol.md`
5. `.ospec/changes/active/<change>/proposal.md` for nested projects, or legacy `changes/active/<change>/proposal.md`
6. `.ospec/changes/active/<change>/tasks.md` for nested projects, or legacy `changes/active/<change>/tasks.md`
7. `.ospec/changes/active/<change>/state.json` for nested projects, or legacy `changes/active/<change>/state.json`
8. `.ospec/changes/active/<change>/verification.md` for nested projects, or legacy `changes/active/<change>/verification.md`
9. `.ospec/changes/active/<change>/review.md` for nested projects, or legacy `changes/active/<change>/review.md`

## Language

- Follow the project-adopted document language from managed `for-ai/` guidance, `.skillrc` `documentLanguage`, and existing change docs.
- Write every change document you author (`proposal.md`, `tasks.md`, `verification.md`, `review.md`, and brainstorm content) in that one language. Do not mix Chinese and English within a change.
- Keep Chinese projects in Chinese unless the repo explicitly adopts English.

## Visibility & Decisions

- `Announce-Before-Act`: never run the change flow silently. Announce in one line which skill you are using (`ospec-change`) and the current stage, which `ospec` command you are about to run and the artifact it writes, and which gate is blocking when progress stops.
- `Brainstorm-First`: before implementing, confirm scope and acceptance with the user when anything is ambiguous, and ask one question at a time instead of silently assuming direction, API, UI, risk, or scope. Record the agreed scope in `proposal.md` rather than guessing. **NEVER auto-select the recommended option or resolve a decision gate yourself — `recommended` is only a hint to show the user; present every gate and wait for the user's actual choice instead of running the change in one shot.** **Present each open decision using the best interactive mechanism your harness has — a native question UI (Claude Code `AskUserQuestion`, Gemini `ask_user`) if available, otherwise your plan/approval UI (Codex Plan mode) if available, otherwise plain chat text — you always ask the user, only the presentation differs.** When you run `ospec brainstorm`, do not leave it as an unanswered template: ask the user the decision gates and record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id>` so the brainstorm has a result.
- `Zero-Setup`: the user only describes the change; you run every `ospec` command yourself and never ask them to type setup or execution commands. In a Claude Code harness, if `.claude/settings.json` does not yet reference `.ospec/hooks/claude/ospec-claude-hook.cjs`, run `ospec session hook --target claude --apply` once (idempotent).

## Required Logic

1. Inspect repository state first when posture is unclear.
2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.
3. If the request is a new requirement, derive a concise kebab-case change name and create it with `ospec new <change-name> [path]`.
4. If the matching active change already exists, continue it instead of duplicating it.
5. Keep the work inside the active change container.
6. Keep `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md` aligned with actual execution.
7. Do not create `design.md`, `implementation-plan.md`, task graphs, worker packets, or review artifacts for routine small changes.
8. Use `ospec-goal` when the requirement is complex enough to need the full workflow.
9. Use OSpec closeout commands instead of inventing a parallel process.
10. Closeout is automatic when ready: once implementation, `verification.md`, and `review.md` are aligned and `ospec verify [changes/active/<change>]` passes, run `ospec finalize [changes/active/<change>]` yourself. Do not stop at `ospec archive ... --check` (it is a preview only) and do not wait for the user to ask before archiving. **Closeout uses `direct-closeout` (archive locally, no PR) and `manual` merge as defaults — do NOT ask the user about PR, merge, branch, or worktree strategy; uncommitted change/OSpec files in the working tree are normal and do not block archive. Only open a PR if the user explicitly asked.** Only pause closeout when a gate genuinely needs a human: a pending required user decision, an unapproved blocking plugin gate (e.g. Checkpoint), real blockers reported by verify or archive, or an explicit user request to preview or approve before archiving.

## Commands

```bash
ospec status [path]
ospec new <change-name> [path]
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>] --check   # optional preview only — do not stop here
ospec finalize [changes/active/<change>]          # run automatically once verify passes and no human gate is pending
```

## Guardrails

- Do not assume dashboard workflows exist.
- Do not confuse repository initialization with change execution.
- Do not enter queue mode unless the user explicitly asks for queue behavior.
- Do not escalate to the full goal workflow unless the work is complex, cross-cutting, high-risk, or explicitly requested as a goal.
- Do not claim completion until implementation, verification notes, and closeout status are aligned.
- If real project tests exist, run or recommend them separately from `ospec verify`.
