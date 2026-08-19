# Classic Change Protocol

Use this compact protocol when the user selected an OSpec change (`ospec change` / `ospec-change`; `ospec new` remains an alias). Profile selection belongs to the user: never promote, reject, or replace a change with a Goal because of complexity, flags, file count, risk, or batch size, and use `ospec goal` / `ospec-goal` only when the user explicitly selects a Goal.

The `ospec execute …` controller layer and every goal-only artifact belong to `workflow_profile_id: goal`: on a change, do not read or run them and do not create goal-only files unless the user explicitly upgrades the work. Only the shared `ospec execute decision` command stays available, for durable user choices.

## Context

At start, read `.skillrc`, `proposal.md`, `tasks.md`, and `state.json`, and use `ospec index query <keyword...>` for relevant index entries instead of reading the whole `SKILL.index.json`. Read `verification.md` when entering verification and `review.md` during closeout. `state.json` is the execution status source of truth; when a document and `state.json` disagree, reconcile toward `state.json` instead of reporting the document's value.

This file is the whole classic contract — it carries no rule that only lives elsewhere, so there is nothing to look up in `for-ai/execution-protocol.md` (that file is the goal controller layer and this profile must not open it). If this file is missing, use `for-ai/ai-guide.md` to route back to the protocol for the active profile.

## Lifecycle

1. Create new work with `ospec change <change-name> [path]`; `ospec new` remains a compatibility alias. The command prints candidate features and applies **none of them** — confirm immediately: pass the relevant slugs with `--feature <slug>` or write them into `proposal.md` `features:`; with no fitting candidate leave the list empty and fill it in during planning. This list drives the whole documentation-obligation machinery; skipping it degrades every obligation to optional.
2. Continue an existing matching active change instead of duplicating it.
3. Batch changes go through the queue and run sequentially in the shared worktree. The worktree must be used serially: closeout (verify/finalize/archive) blocks on uncommitted files outside the proposal `affects` and documentation scopes, so commit, stash, or isolate unattributed dirty files, declare `affects` honestly, and never let a concurrent session's edits ride along into the archive.
4. Keep only `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md` aligned, deriving `tasks.md` directly from `proposal.md` and the implementation scope. Do not create Goal design, plan, task graph, worker, or review-provenance artifacts.
5. Run project checks relevant to the actual change and record commands and results in `verification.md`; do not require unrelated build, lint, test, TDD, or debug commands. Every activated optional step must appear in `tasks.md` and `verification.md`, and each one that passed must be listed in the `verification.md` frontmatter field `passed_optional_steps` — archive validates that field and blocks while an activated step is missing from it.
6. The current AI performs one lightweight review. `APPROVED` and `APPROVED_WITH_CONCERNS` may close automatically; `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` stop closeout.
7. Use `ospec progress` for status. Run `ospec verify` when an explicit preview is useful. Once implementation, verification, documentation policy, and review are ready, run `ospec finalize` immediately. Finalize synchronizes classic state and archives atomically.

## Documentation

Set `change_type` to `feature`, `fix`, `refactor`, `perf`, `deprecate`, `remove`, or `docs`. The legacy spellings `bugfix` and `maintenance` are still accepted and fold onto `fix` and `refactor`. Set `documentation_impact` to `none` or `required`.

- A bugfix may use `none` with a concrete `documentation_reason`, unless it changes user behavior, an API, or an operating contract.
- A feature or docs change must use `required` and list at least one real project, module, API, or user document in `documentation_updates`.
- A legacy generated `docs/project/changes/...` archive summary (OSpec no longer produces them) never satisfies feature documentation.
- Update `SKILL.md` only when module rules, AI instructions, or usage contracts changed.
- `SKILL.index.json` is rebuilt automatically after archive and is not a manual task.

### Feature Documents

Living feature documents are `docs/features/<domain>.md`, one `##` section per feature. Humans own them and you edit them inside a change; the engine never writes their prose.

Declare a feature inline, on the first non-blank line under its heading, and nowhere else. There is no `features:` list in the file frontmatter — the slug-to-section binding stays local, so it survives a section being moved and there is no second copy of the same fact to drift.

```markdown
## Login timeout

<!-- ospec:feature login-timeout code:src/auth/,src/session/ -->

Purpose, behaviour, logic flow, boundaries.

<!-- ospec:last-change 2026-08-14-fix-login-timeout -->
```

- The slug is lowercase kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`) and unique across the whole project. A duplicate fails `ospec index build` and names both locations.
- `code:` is optional and lists repository-relative path prefixes, comma-separated, with no spaces and no backslashes.
- A section with no declaration is simply not a feature. That is allowed, not an error.
- A feature section runs to the next heading at the same or a shallower level, so its `###` sub-headings belong to the feature.
- `ospec archive` writes and replaces the `ospec:last-change` comment. Keep at most one per section and do not hand-maintain it.

### Documentation Obligations

The engine decides WHERE this change must document itself, so you never have to search. At planning time run `ospec docs obligations --apply`; each obligation already carries its resolved `path#section`.

Obligations come from `change_type` and the change's `features:` list. When `features:` is empty, the engine falls back to resolving the proposal's `affects` through the `code:` declarations (the same matching `docs locate --affects` uses); an explicit declaration always wins — the fallback is only a safety net:

| `change_type` | Obligation |
|---|---|
| `feature` | Update the section describing this feature's behaviour and flow, or create it when the feature is new |
| `fix` | Open the section and check whether the documented behaviour is the *pre-fix wrong* behaviour; if it is, correct it. **With no feature document the obligation degrades to optional plus a suggestion to create one** — a trivial fix must not be forced to grow documentation |
| `refactor`, `perf` | Verification-type: confirm the section is still accurate and update its `code:` paths |
| `deprecate`, `remove` | Mark the section's status and sync the catalogue |
| `docs` | The edit is itself the obligation |

A verification-type obligation accepts **zero diff plus an explicit confirmation**: when a refactor genuinely changed no documented behaviour, record `ospec docs confirm --id <obligation-id>` rather than making a cosmetic edit. That confirmation is refused on every other kind of obligation, because a self-certified obligation verifies nothing.

`docs_contract.mode` in `.skillrc` is `warn` or `strict`, and defaults to `warn` for this release cycle: an unmet obligation is reported at the archive gate but does not block it. Whether an obligation is met is decided identically in both modes; only the consequence differs. An optional obligation never blocks, in either mode.

Run `ospec docs audit` periodically. It lists feature sections whose `code:` paths changed since the archive named in their `ospec:last-change` comment while the document did not — the drift the obligations are meant to prevent. It is read-only and never fails a build.

### Migrating an Existing Project

A project that predates feature documents carries generated per-change documents under `docs/project/changes/`. OSpec no longer produces them; `ospec docs migrate` replaces them, in four phases. `ospec update` only mentions this — it never migrates and never deletes.

1. **`ospec docs migrate --plan --apply`** (engine). Inventories the old documents, clusters archives into candidate groups by path prefix, and writes `docs-migration-plan.json` plus `docs/features/<domain>.md` draft skeletons.
2. **You do this phase.** The engine writes no prose.
3. **`ospec docs migrate --verify`** (engine gate). Refuses while any gap remains.
4. **`ospec docs migrate --finalize --apply`** (destructive). Prints and records the file list, then deletes.

Your job is phase 2, one draft document at a time:

- Read the draft's raw material, then read the real evidence behind each entry: `ospec changes show <archive>` for the summary, files and verification commands, and the archive's `proposal.md` / `verification.md` / `review.md` for the reasoning. Also read any human-written document that already covers this area — if a good description exists, move it, do not duplicate it.
- Rewrite each `##` section as a description of what the feature **does now** — purpose, behaviour, logic flow, boundaries. It is not a changelog: a reader who never saw the changes must understand the current behaviour. Several old changes usually collapse into one section, and a change that only fixed a bug usually just corrects a sentence.
- Add the `<!-- ospec:feature <slug> code:<paths> -->` declaration under each heading, and a `<!-- ospec:last-change <archive-name> -->` line naming the most recent archive that section covers. Phase 3 uses that comment to prove the old document is accounted for.
- Delete the draft markers: the `status: draft` frontmatter line, the `<!-- ospec:migration-draft -->` comments, and the instruction block. Phase 3 refuses while any survive.
- Regroup freely. The engine's clustering is a guess; edit `groups` and `group` in the plan file, or move sections between documents, whenever the guess is wrong.
- For a change with **no surviving feature** — a dependency bump, a revert, a one-off chore — do not invent a section. Set `"historical": true` on that archive in `docs-migration-plan.json`. That is the explicit "pure history" declaration phase 3 accepts, and only a person may set it.
- Ask the user before marking anything historical if you are unsure. Deleting a document whose content went nowhere is the one outcome this pipeline exists to prevent.

Re-running `--plan --apply` is safe at any point: it preserves your `historical` flags and regrouping, and never overwrites a draft you have already rewritten.

## Decision Gates

Decision gates and brainstorm options belong to the user. Never auto-select a `recommended` option or resolve a gate yourself — `recommended` is a hint you show the user, never a choice you may take.

Present every gate through the capability ladder, in this order: a harness-native question UI when the harness has one (Claude Code `AskUserQuestion`, Gemini `ask_user`), otherwise its plan/approval UI (for example Codex plan mode), otherwise the decision report `Chat Prompt` as plain chat text. You always ask the user and wait for their actual answer; only the presentation differs, and a required pending decision blocks implementation and closeout identically on every harness. Ask one question at a time.

Record a durable gate with `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]`, then record the user's answer with `--select <option-id> --answered-by user`. This shared decision command is the one `ospec execute …` command a classic change may use. If you ran `ospec brainstorm`, do not leave it an unanswered template: record each answer with `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user`.

Raise a gate only for a genuine fork — mutually exclusive API shapes, competing UI approaches, data-model or storage choices, destructive or hard-to-reverse operations, or a scope conflict with what the user asked for. For routine unambiguous work, take the reasonable default and record the assumption in `proposal.md` instead of opening a gate.

In Claude Code the managed session hook re-injects this contract at runtime and hard-blocks subagent dispatch while a required decision is pending; install it once with `ospec session hook --target claude --apply`. That hook is a convenience for one harness, not the source of this contract — the rules above apply unchanged on Codex, Gemini, Grok, OpenCode, Cursor, Copilot, and on Claude Code before the hook is installed.

## Force Archive

Force archive is an explicit user exception, never an automatic fallback, and never inferred from urgency, a blocker, or a request to "finish".

1. First report to the user the failing gates and every `NOT_VERIFIED` item, so the acceptance is informed.
2. Only after the user explicitly accepts that incomplete work, run `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <exact-change-name> --reason "<accepted risk>"`. The CLI enforces the exact-name confirmation and a non-empty reason itself.
3. Preserve the failed and `NOT_VERIFIED` evidence. A forced archive bypasses completion gates only: it keeps failed checks and pending state, is marked incomplete and accepted-risk, and must never be described as completed behavior.

Stop only for a real user decision, failed verification, unresolved review, or explicit pause.
