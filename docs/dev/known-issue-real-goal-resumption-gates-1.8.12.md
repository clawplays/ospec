# Known Issue: Real Goals Could Stop at Repair, Update, or External-Acceptance Gates

## Status

- State: fixed in 1.8.12
- First confirmed: 2026-07-17
- Affected release: 1.8.11
- Severity: high continuation impact
- Components: task repair provenance, update provenance, archive knowledge indexing, task dependencies, and Loop blocker handling

## Confirmed incidents

### Web repair snapshot binding

The `web-aim-platform-logic` Goal had a valid task-4 review with findings F-001 through F-004. Repair scopes used the repository casing for `mainModel.ts`, `Overview.tsx`, and `Settings.tsx`. Snapshot comparison lowercased only the snapshot side, so `repairScopeSnapshotHash()` returned null before a new repair packet was written.

The failure consumed no additional repair round, but every later tick failed at the same reconstruction boundary.

### AIHub update ownership and knowledge loss

The `nocobase-chat-message-hierarchy` Goal ran `ospec update` and received 33 false unowned changes: 32 generated archive-knowledge documents plus `docs/project/feature-index.md`. `IndexBuilder.write()` rewrote those files, while protocol sync reported only `SKILL.index.json` to update provenance.

The same rebuild was destructive for legacy compact archives. `readArchivedChange()` sourced target files and verification commands only from `artifacts/agents/task-graph.json`. When older archives no longer contained that artifact, generated knowledge was rewritten with empty implementation and verification sections. The existing idempotence test kept the task graph in place for both builds and did not represent the archive lifecycle.

### Mobile external acceptance on the implementation critical path

The `implement-mobile-figma-derived-workflows` Goal reached 21 of 32 accepted tasks. task-21 had durable Model3D implementation and automatic checks but lacked Android device evidence. task-23 depended directly on task-21, and task-24 through task-32 formed a serial chain from task-23. Loop correctly stopped redispatching the durable blocker, but the graph had no independent dispatchable work.

Treating every external blocker as automatically satisfied would be unsafe: credentials, services, fixtures, or devices can be required before any valid implementation exists. The fix therefore requires explicit user authorization and completed dispatch evidence before dependency pass-through.

## 1.8.12 resolution

1. Normalize both repair scope and snapshot comparison keys without changing real paths.
2. Return the complete generated-index write set and record it in exact-hash update provenance.
3. Merge durable archive metadata from the current and tracked historical index before rendering generated knowledge.
4. Add `ospec execute defer-blocker` for explicit final-gate deferral of a durable external acceptance blocker.
5. Keep deferred tasks blocked and unchecked, and keep final review, verification, finalization, and archive fail-closed.
6. Teach Goal planning to split external/manual acceptance from unrelated implementation critical paths.

## Regression coverage

- Mixed-case file and directory repair scopes produce a valid repair-scope snapshot hash.
- Removing an archived task graph after the first index build does not remove target files, verification commands, project documents, or the archived document ledger on the next build.
- Index write summaries include knowledge documents, feature index, main index, and removed generated paths.
- A dependent task stays blocked before explicit deferral, becomes dispatchable after deferral, and the Goal returns to a final external-evidence stop after other work completes.
- A replay against a clean AIHub clone produced 124 project-document provenance entries, zero unprovenanced knowledge files, and zero project-knowledge diff.
