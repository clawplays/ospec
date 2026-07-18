# Change workflow interface changes in 1.8.17

OSpec 1.8.17 makes the classic Change profile a complete fast path for small fixes, routine features, and user-selected batches. Profile selection remains with the user: a Change is never promoted, rejected, or replaced by a Goal because of complexity, flags, file count, risk, or batch size.

## Compact creation and context

`ospec change <name> [path]` is the preferred creation command. `ospec new` remains a compatible alias. A Change creates only `proposal.md`, `tasks.md`, `state.json`, `verification.md`, and `review.md`; Goal design, task graph, worker, review-provenance, and evidence artifacts are not created.

Projects receive a localized `for-ai/change-protocol.md`. Change agents read this compact, stage-aware protocol plus the current Change files instead of loading the full AI and Goal execution guides on every turn. `ospec update` installs a missing protocol and records it in `update-provenance.json`.

## Lightweight closeout

The current AI performs one lightweight `review.md` review. `APPROVED` and `APPROVED_WITH_CONCERNS` are terminal decisions that may close automatically; `PENDING`, `NEEDS_CHANGES`, and `BLOCKED` remain hard closeout failures.

Classic state is derived from the current proposal, task checklist, relevant verification, documentation policy, plugin gates, and review. Agents no longer need to hand-edit `state.json`, mark `skill_updated`, or mark `index_regenerated`. `ospec finalize` archives the Change and rebuilds the project indexes exactly once. An `archive-chain` queue run can then activate the next queued Change in the same shared worktree.

## Documentation policy

Every proposal declares `change_type` and `documentation_impact`.

- `bugfix` and `maintenance` may use `documentation_impact: none` with a concrete reason.
- `feature` and `docs` require at least one existing durable project, module, API, or user document.
- Generated `docs/project/changes/...` summaries, Change protocol artifacts, ordinary configuration files, and document-shaped directories do not satisfy feature documentation.
- `SKILL.md` changes are needed only when module rules or AI usage contracts changed.

## Queue and automatic archive

User-selected batches stay as Changes. Add them to the queue and execute them sequentially in the shared worktree. Once the active Change passes its relevant checks, documentation contract, plugin gates, and lightweight review, the agent runs `ospec finalize`; `APPROVED_WITH_CONCERNS` does not require a separate manual archive approval.

## Upgrade

Install 1.8.17 and run `ospec update [path]`. Existing Goals keep their design, task graph, review provenance, concurrency, evidence, and archive gates. New or resumed Changes use the compact protocol and derived closeout rules; `ospec new` continues to work as an alias.
