# Classic Change Protocol

Use this compact protocol when the user selected an OSpec change. Profile selection belongs to the user: never promote, reject, or replace a change with a Goal because of complexity, flags, file count, or batch size.

## Context

At start, read `.skillrc`, `proposal.md`, `tasks.md`, and `state.json`, and use `ospec index query <keyword...>` for relevant index entries instead of reading the whole `SKILL.index.json`. Read `verification.md` when entering verification and `review.md` during closeout. Read the full `ai-guide.md` or `execution-protocol.md` only when this compact file is missing, a blocking plugin is active, or a specific ambiguous rule requires it.

## Lifecycle

1. Create new work with `ospec change <change-name> [path]`; `ospec new` remains a compatibility alias.
2. Continue an existing matching active change instead of duplicating it.
3. Batch changes go through the queue and run sequentially in the shared worktree. The worktree must be used serially: closeout (verify/finalize/archive) blocks on uncommitted files outside the proposal `affects` and documentation scopes, so commit, stash, or isolate unattributed dirty files, declare `affects` honestly, and never let a concurrent session's edits ride along into the archive.
4. Keep only `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md` aligned. Do not create Goal design, plan, task graph, worker, or review-provenance artifacts.
5. Run project checks relevant to the actual change and record commands and results in `verification.md`; do not require unrelated build, lint, test, TDD, or debug commands.
6. The current AI performs one lightweight review. `APPROVED` and `APPROVED_WITH_CONCERNS` may close automatically; `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` stop closeout.
7. Run `ospec verify` when an explicit preview is useful. Once implementation, verification, documentation policy, plugin gates, and review are ready, run `ospec finalize` immediately. Finalize synchronizes classic state and archives atomically.

## Documentation

Set `change_type` to `bugfix`, `feature`, `maintenance`, or `docs`. Set `documentation_impact` to `none` or `required`.

- A bugfix may use `none` with a concrete `documentation_reason`, unless it changes user behavior, an API, or an operating contract.
- A feature or docs change must use `required` and list at least one real project, module, API, or user document in `documentation_updates`.
- The generated `docs/project/changes/...` archive summary never satisfies feature documentation.
- Update `SKILL.md` only when module rules, AI instructions, or usage contracts changed.
- `SKILL.index.json` is rebuilt automatically after archive and is not a manual task.

Stop only for a real user decision, failed verification, unresolved review, blocking plugin gate, or explicit pause.
