---
name: ospec
description: Document-driven OSpec workflow for initialization, change/goal routing, validation, archiving, and durable project knowledge.
tags: [cli, workflow, automation, ospec]
---

# OSpec Router

Use this root skill as a compact router. Keep invariant safety and workflow-selection rules here; load detailed commands and stage protocols from the initialized project's indexed files only when that stage is active.

## Default Entry

When the user asks to initialize a project, run `ospec init [path]`. In AI-assisted initialization, pass the explicit or conversational language with `--document-language`. If useful context is missing, ask once for a short project summary or tech stack; if the user skips it, continue with placeholders. Verify the generated files on disk and stop before creating work unless the user explicitly asks for a change or goal.

Initialization is change-ready only when `.skillrc`, the managed `.ospec/` or classic OSpec directory, active and archived change directories, `SKILL.md`, `SKILL.index.json`, the index builder (`.ospec/tools/build-index-auto.cjs`), `for-ai/` protocol files, and baseline `docs/project/` knowledge files exist. Verify those managed files on disk yourself and never claim initialization is complete before you have: a command that exited zero is not evidence that the files are there.

Do not hand-write an approximation of `ospec init`. Do not assume a web stack, apply business scaffold, generate `docs/project/bootstrap-summary.md`, create queue work, or create the first change without explicit intent.

## Workflow Router

- Use `ospec change` / `ospec-change` when the user selects a Change. Its source of truth is `changes/active/<change>/proposal.md`, `changes/active/<change>/tasks.md`, `state.json`, `verification.md`, and `review.md`; `ospec new` remains a compatibility alias.
- Use `ospec goal` / `ospec-goal` only when the user selects a Goal. It additionally owns `changes/active/<change>/design.md`, `changes/active/<change>/implementation-plan.md`, `changes/active/<change>/artifacts/agents/task-graph.json`, worker/reviewer artifacts, and evidence gates.
- Never auto-promote, reject, or replace a user-selected Change because of complexity, risk, file count, parallelism, or batch size. The user's explicit profile choice is authoritative.
- Enter queue mode only when the user explicitly asks to queue or execute multiple changes.

For an initialized project, read in this order:

1. `.skillrc` for layout, language, workflow policy, and model profiles.
2. the `Table of Contents` section of `.ospec/session-brief.md` to see which archived changes and knowledge documents exist, then `ospec docs locate --feature <slug>` / `--affects <path>` to jump straight to the section that describes a behavior, and `ospec index query <keyword...>` as the keyword router into `SKILL.index.json`; never read the whole index file — it grows without bound as changes archive.
3. The current session brief, bootstrap, dispatch, review, or repair packet.
4. Only the indexed project documents, change files, and target files named by that packet.

Do not load every historical change or every protocol file by default. `for-ai/ai-guide.md` is a router into the protocol that owns each profile, not a rule file — the `ospec-change` and `ospec-goal` skills carry the operating rules for their profile. Behind them: `for-ai/change-protocol.md` is the classic-change contract in full, and `for-ai/execution-protocol.md` is the goal controller reference, opened only when a named situation needs its detail and never by a classic change, which that file forbids. Use `ospec help` or subcommand help instead of carrying the complete CLI catalog in context.

## Visibility And Decisions

- `Announce-Before-Act`: before workflow actions, state the OSpec workflow and stage, the command and artifact it writes, and any blocking gate. Only in the goal controller layer, also state the native agent count and the actual native mechanism; the classic change flow launches no subagents and must not announce one.
- `Brainstorm-First`: before locking a goal design, surface open direction, architecture, API, data, UI, risk, and scope decisions one at a time. Prefer a durable required decision over a silent assumption.
- `Zero-Setup`: the user states the requirement; the AI runs OSpec controller commands and the user only answers decisions. Do not ask the user to operate routine setup commands.
- Required pending decisions block worker dispatch. Preserve `PENDING`, `NEEDS_CONTEXT`, `BLOCKED`, `DONE_WITH_CONCERNS`, and `DONE` rather than hiding uncertainty.

Decision gates belong to the user on every harness: never auto-select a `recommended` option or resolve a gate yourself, present each gate through the capability ladder — a harness-native question UI (Claude Code `AskUserQuestion`, Gemini `ask_user`), else a plan/approval UI, else the decision report `Chat Prompt` in chat — and wait for the user's actual answer. You always ask; only the presentation differs. The full contract is stated where your profile is already sent: `for-ai/change-protocol.md` for a classic change, the `ospec-goal` skill and `for-ai/execution-protocol.md` for a goal.

In Claude Code, install the managed hook once with `ospec session hook --target claude --apply` when missing; `PreToolUse(Task)` is then a hard dispatch gate and prompt hooks stay silent unless a required decision is pending. That hook is a Claude-only, opt-in convenience — `ospec session hook --target` accepts no other harness and `ospec init` writes no `.claude/` — so it never replaces the documented contract.

## Goal Controller Layer

Use the full `ospec execute ...` task-graph/controller layer only for Goal work. A classic Change may use the shared `ospec execute decision` command for durable user choices, but it must not enter Goal bootstrap, workspace, dispatch, review, evidence, or Loop commands.

A router routes: the controller invariants — preflight staging, the combined planning review and its repair allowance, worker profiles, dispatch and review binding, reviewer independence, evidence and archive gates — are not restated here. Load the ones you act on from the `ospec-goal` skill; `for-ai/execution-protocol.md` holds their authoritative detail, including the logical model-profile names, and is opened only when a named situation calls for it. Detailed goal artifacts live under `changes/active/<change>/artifacts/agents/` and `artifacts/reviews/`; read the current dispatch, review, or repair packet for exact paths and commands.

Do not archive while task graph, review, decision, documentation, optional-step, worker-status, or verification gates are unresolved during normal closeout.

## Documentation And Archive

Archiving a finalized change or goal writes its `SKILL.index.json.archived_changes` entry (carrying `features` and `doc_updates`), refreshes the affected `docs/project/feature-catalog.md` rows, and replaces each touched feature section's `ospec:last-change` traceability comment idempotently — the engine's only write into a human-owned document, and a comment failure warns instead of blocking. No file is generated under `docs/project/changes/`; render an archived change on demand with `ospec changes show <archive>`. Behavior, architecture, module, API, or operational changes must additionally update the relevant human-maintained `docs/project/` files. When the task graph enables the documentation contract, every task declares `documentation_updates`; use `[]` only when no project documentation changes are needed, include each declared document in `target_files`, and preserve dispatch-to-completion evidence of a meaningful normalized-content change.

Use `ospec verify` for the active workflow. For normal closeout, use `ospec finalize [changes/active/<change>]`; use `ospec archive --check` only for preview. Finalize must verify completeness, archive, rebuild `docs/project/feature-catalog.md`, and rebuild `SKILL.index.json` so its `documents` and `archived_changes` sections locate the completed behavior and link declared durable project documents. Git commit remains separate.

Force archive requires explicit user acceptance and is never an automatic fallback. First report the failing gates and every `NOT_VERIFIED` item to the user, then take their explicit acceptance; the CLI enforces its own exact-name confirmation and reason flags. Never infer that authorization from urgency, a blocker, or a request to "finish". A forced archive bypasses completion gates only — it preserves failed checks and pending state, and must never be described as completed behavior. The full procedure lives on the path that needs it: `for-ai/change-protocol.md` for a classic change, `for-ai/execution-protocol.md` for a goal.

After archive, verify:

- the completed behavior is discoverable through `docs/project/feature-catalog.md` and `ospec docs locate`;
- the archived change renders from its index entry via `ospec changes show <archive>`;
- project docs and archived change records are present in `SKILL.index.json`;
- section offsets are stable under LF-normalized content;
- no required documentation update was omitted.

Use `ospec docs generate` for a docs-only repair or refresh. Do not create a change merely to repair project knowledge unless the user asks for one.

## Compact Command Routes

```text
Initialize:  ospec init [path] -> verify generated project shell
Change:      ospec change <name> -> implement -> ospec verify -> ospec finalize
Goal:        ospec goal <name> -> preflights -> task graph -> combined planning review -> workers/task reviews -> final review -> verify/finalize
Docs:        ospec docs generate [path] -> ospec docs status -> ospec index check
Resume:      ospec session [path] -> read brief/index -> run the persisted next safe command
Troubleshoot: ospec status [path] -> ospec help
```

Use CLI commands for initialization, verification, index generation, and archive. Do not replace managed operations with ad hoc filesystem edits.

## Completion Discipline

Before claiming completion:

1. Verify the active workflow and fresh project checks.
2. Confirm relevant docs and documentation contracts.
3. Confirm worker/reviewer/decision/evidence gates for goals.
4. Confirm skills and indexes when knowledge changed.
5. After archive, confirm the feature and its documents are discoverable without replaying conversation history.
