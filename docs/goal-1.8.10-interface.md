# Goal workflow interface changes in 1.8.10

OSpec 1.8.10 fixes two continuation gates found while resuming real 1.8.9 Goals: repeated update provenance could forget an unchanged managed asset, and a dependent repair could deadlock behind a prerequisite review whose manual dispatch could never acquire Loop executor provenance.

## Stable update provenance

`ospec update` now records both mutated paths and managed paths whose current content was independently verified against the active package or plugin asset.

Core protocol, tooling, generated index, managed root skill, and enabled plugin assets distinguish:

- created paths;
- refreshed paths;
- unchanged but exactly verified paths;
- skipped custom paths that are not trusted as update output.

For repeated updates by the same CLI version, an earlier provenance entry is retained only while:

- its normalized path remains inside the project and outside `.git`;
- its file or missing kind still matches;
- a file SHA-256 still matches exactly.

A user edit after update invalidates the old record and remains a workspace blocker. Repeated no-op updates no longer progressively shrink `.ospec/update-provenance.json`.

## Dependency-aware repair scheduling

Before retrying a task with `NEEDS_CHANGES`, the Loop now checks the current task-graph blockers for that exact repair candidate.

If a prerequisite terminal task needs a fresh review, the Loop issues that review first. A repair blocked by unfinished dependency work, a dependency review, or a live conflict is not sent to `retryWorkerRuns()`. Independent ready implementation work still keeps its existing priority.

This prevents the cycle where a dependent repair is selected, rejected as non-dispatchable, and selected again without useful work.

## Reachable task-review provenance

Task and final reviews in a controller-owned Goal must be issued by:

```bash
ospec loop tick <goal>
```

Calling `ospec execute review` directly for that Goal now fails before creating an artifact. The Loop-owned path atomically binds the dispatch, action item, runtime adapter, real reviewer executor, claim time, and completion time.

Non-controller workflows can continue using `ospec execute review`. Document review keeps its existing explicit executor lifecycle commands.

## Recovery of an unbound 1.8.9 review

An artifact can contain a real `APPROVED` decision and valid findings while still being non-authoritative when its 1.8.9 dispatch required executor provenance but had no Loop action.

1.8.10 does not accept or backfill those null fields. `ospec execute sync` reports the provenance failure, and the next Loop tick creates a fresh Loop-owned review for the same current task snapshot. The old review is superseded without changing implementation state or consuming a task repair round.

## Operator recovery

After installing 1.8.10 in an affected project:

1. Run `ospec update` once.
2. Run `ospec session`, `ospec execute bootstrap <goal>`, and `ospec execute workspace <goal>`.
3. Preserve all implementation and review artifacts; do not edit task graph or executor provenance manually.
4. Continue through the controller with `ospec loop tick <goal>`.

For `web-aim-platform-logic`, the next useful action is a fresh Loop-owned task-1 review, followed by the task-4 repair containing its structured findings.

For `implement-mobile-figma-derived-workflows`, update provenance no longer misclassifies the exact managed workflow conventions file. The Goal still correctly stops at `task-21-extract-model3d` until the required Android/ADB and canonical Model3D evidence exists; 1.8.10 does not bypass a real external device gate.
