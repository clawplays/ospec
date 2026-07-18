# Known Issue: Sync Invalidated Passing Goal Verification During Finalize

## Status

- State: fixed in 1.8.18
- First confirmed: 2026-07-18
- Affected release: 1.8.17
- Severity: high finalization and archive impact
- Components: Goal status analysis, verification freshness, finalize/archive consistency

## Confirmed incident

An AIHub Goal had completed all tasks, reviews, project checks, and verification. `ospec archive --check` passed under the closeout evidence rules, but `ospec finalize` failed `goal.verification_evidence` after `ospec execute sync` updated the derived `task-graph.json` timestamp.

No verified source or target file had changed. The failure came from a legacy modification-time comparison between the latest passing verification record and task-graph/review artifacts. Derived synchronization metadata therefore appeared newer than valid evidence even though the canonical Git and target-file snapshot still matched.

## 1.8.18 resolution

1. Goal status and finalize now call the same canonical latest-verification validator used by archive readiness.
2. Verification freshness is based on the recorded Git and target-file content snapshot, not task-graph or review file modification times.
3. `verification.md` still reports the latest evidence status, while the Goal freshness check reports canonical snapshot validity separately.
4. Changed Git or target content, failed/blocked evidence, malformed records, and missing required evidence still fail closed.
5. `ospec execute sync` may update derived artifacts without manufacturing a false verification failure.

## Recovery

Keep the completed Goal and its evidence unchanged. After installing 1.8.18 and running `ospec update`, run session/bootstrap/workspace, `ospec execute sync`, `ospec archive --check`, and `ospec finalize`. Do not redispatch completed tasks or rewrite verification history.

## Regression coverage

- A later derived task-graph sync does not invalidate passing evidence by timestamp alone.
- Goal closeout evaluates canonical content-snapshot freshness.
- The preserved AIHub Goal reports `archiveReady=true` with no failing readiness checks.
