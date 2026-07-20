---
name: ospec
description: Document-driven OSpec workflow for initialization, change/goal routing, validation, archiving, and durable project knowledge.
tags: [cli, workflow, automation, ospec]
---

# OSpec Router

Use this root skill as a compact router. Keep invariant safety and workflow-selection rules here; load detailed commands and stage protocols from the initialized project's indexed files only when that stage is active.

## Default Entry

When the user asks to initialize a project, run `ospec init [path]`. In AI-assisted initialization, pass the explicit or conversational language with `--document-language`. If useful context is missing, ask once for a short project summary or tech stack; if the user skips it, continue with placeholders. Verify the generated files on disk and stop before creating work unless the user explicitly asks for a change or goal.

Initialization is change-ready only when `.skillrc`, the managed `.ospec/` or classic OSpec directory, active and archived change directories, `SKILL.md`, `SKILL.index.json`, the index builder, `for-ai/` protocol files, and baseline `docs/project/` knowledge files exist.

Do not hand-write an approximation of `ospec init`. Do not assume a web stack, apply business scaffold, generate `docs/project/bootstrap-summary.md`, create queue work, or create the first change without explicit intent.

## Workflow Router

- Use `ospec change` / `ospec-change` when the user selects a Change. Its source of truth is `changes/active/<change>/proposal.md`, `changes/active/<change>/tasks.md`, `state.json`, `verification.md`, and `review.md`; `ospec new` remains a compatibility alias.
- Use `ospec goal` / `ospec-goal` only when the user selects a Goal. It additionally owns `changes/active/<change>/design.md`, `changes/active/<change>/implementation-plan.md`, `changes/active/<change>/artifacts/agents/task-graph.json`, worker/reviewer artifacts, and evidence gates.
- Never auto-promote, reject, or replace a user-selected Change because of complexity, risk, file count, parallelism, or batch size. The user's explicit profile choice is authoritative.
- Enter queue mode only when the user explicitly asks to queue or execute multiple changes.

For an initialized project, read in this order:

1. `.skillrc` for layout, language, workflow policy, plugins, adaptive review policy, and model profiles.
2. `SKILL.index.json` and `docs/project/feature-index.md` as routers.
3. The current session brief, bootstrap, dispatch, review, or repair packet.
4. Only the indexed project documents, change files, and target files named by that packet.

Do not load every historical change or every protocol file by default. Open `for-ai/ai-guide.md` for general execution rules and `for-ai/execution-protocol.md` only when entering the full goal controller layer. Use `ospec help` or subcommand help instead of carrying the complete CLI catalog in context.

## Visibility And Decisions

- `Announce-Before-Act`: before workflow actions, state the OSpec workflow and stage, the command and artifact it writes, native agent count/mechanism, and any blocking gate.
- `Brainstorm-First`: before locking a goal design, surface open direction, architecture, API, data, UI, risk, and scope decisions one at a time. Prefer a durable required decision over a silent assumption.
- `Zero-Setup`: the user states the requirement; the AI runs OSpec controller commands and the user only answers decisions. Do not ask the user to operate routine setup commands.
- Required pending decisions block worker dispatch. Preserve `PENDING`, `NEEDS_CONTEXT`, `BLOCKED`, `DONE_WITH_CONCERNS`, and `DONE` rather than hiding uncertainty.

In Claude Code, install the managed hook once with `ospec session hook --target claude --apply` when missing. Static workflow context is injected on startup, clear, and compact; prompt hooks should stay silent unless a required decision is pending. `PreToolUse(Task)` remains the hard dispatch gate.

## Goal Controller Invariants

Use the full `ospec execute ...` layer only for goal work or when the user explicitly requests agent/worker execution for a change.

- Start or resume with `ospec session` and `ospec execute bootstrap`.
- Complete design review before plan review under the configured document review policy. The default `always` policy requires independent review; `adaptive` may use deterministic inline preflight only when the target document explicitly declares `risk_level: low` (or `none`) and no risk signal exists. Missing or unparseable risk context requires specialist review.
- Legacy imported document-review completions without a durable decision still count as completed rounds but provide no convergence decision. After authoritative documents change, let OSpec issue a fresh review; never hand-edit or rehash the append-only ledger.
- Resolve required decisions and workspace isolation before dispatch.
- Dispatch scoped worker packets, use the launch plan with the current harness native agent mechanism, record completion, then perform one combined task review.
- Treat each task's canonical `artifacts/agents/worker-reports/<task-id>.md` as review-bound evidence. A fresh task review snapshots it alongside declared targets; a repair may edit only that same task's exact report path. When a legacy review finding names an unsnapshotted canonical report, let Loop issue a fresh review before repair instead of editing history or widening artifact scope.
- A worker profile is logical (`mechanical`, `standard`, `strong_reasoning`, `review`, `final_review`). Harness-specific model names come from `.skillrc`; absence is explicit and falls back to the harness default.
- Record optional provider usage sidecars through the supported completion command. Metrics are evidence, not an archive gate unless project policy says otherwise.
- When final review requires changes, group all findings into one repair wave and one repair task, run its covering verification once, then run one combined task review and one final re-review. In continuous mode, a stalled task or final finding set may receive one durable root-cause strategy escalation; execute that packet normally, but never reissue the same strategy key or raise a limit to repeat unchanged work.
- Keep reviewers independent: they read scoped evidence, do not edit implementation, do not accept hidden severity downgrades, and report findings before summaries. Record actionable findings in both Markdown and the sibling structured `*.findings.json`.
- Do not archive while task graph, review, decision, documentation, optional-step, worker-status, or verification gates are unresolved during normal closeout. Force archive is an explicit user-directed exception only: first report the unresolved gates and `NOT_VERIFIED` evidence, then require `--force-archive`, an exact-name `--confirm-force-archive`, and a non-empty audit reason. Never infer this authorization from urgency, a blocker, or a request to "finish". A pending Loop pointer is safe only when every action item is durably terminal (`completed`, `failed`, or `expired`); any missing, `issued`, or `running` item still blocks archive.

Detailed goal artifacts live under `changes/active/<change>/artifacts/agents/` and `artifacts/reviews/`. Read their current packet or `for-ai/execution-protocol.md` for exact paths and commands instead of expanding the entire inventory here.

## Documentation And Archive

Every finalized change and goal automatically receives a generated `docs/project/changes/<archive-path>.md` knowledge document with its summary, affected areas, implementation files, verification commands, durable project documents, and archived evidence. This guarantees one indexed document per archived change. Before moving the active change, archive preflight refuses to overwrite a human-owned file at that generated path and verifies the managed output directories are writable. Behavior, architecture, module, API, or operational changes must additionally update the relevant human-maintained `docs/project/` files. When the task graph enables the documentation contract, every task declares `documentation_updates`; use `[]` only when no project documentation changes are needed, include each declared document in `target_files`, and preserve dispatch-to-completion evidence of a meaningful normalized-content change.

Use `ospec verify` for the active workflow. For normal closeout, use `ospec finalize [changes/active/<change>]`; use `ospec archive --check` only for preview. Finalize must verify completeness, archive, rebuild `docs/project/feature-index.md`, and rebuild `SKILL.index.json` so its `documents` and `archived_changes` sections locate the completed behavior and link declared durable project documents. Git commit remains separate.

When the user explicitly accepts incomplete evidence and asks to force archive, use `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"`. This bypasses completion gates only. It preserves failed checks and pending state, writes `artifacts/agents/force-archive.json`, and marks generated knowledge as `forced`, `incomplete`, and `accepted-risk`; it must never be described as completed behavior.

After archive, verify:

- the completed behavior is discoverable through `docs/project/feature-index.md`;
- the generated per-change knowledge document exists under `docs/project/changes/` and is linked from both indexes;
- project docs and archived change records are present in `SKILL.index.json`;
- section offsets are stable under LF-normalized content;
- no required documentation update was omitted.

Use `ospec docs generate` for a docs-only repair or refresh. Do not create a change merely to repair project knowledge unless the user asks for one.

## Compact Command Routes

```text
Initialize:  ospec init [path] -> verify generated project shell
Change:      ospec change <name> -> implement -> ospec verify -> ospec finalize
Goal:        ospec goal <name> -> session/bootstrap -> design/plan reviews -> dispatch/review -> verify/finalize
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
