# Known Issue: Finalize Rejected Reviewed Deletion and Lost Earlier Repair Evidence

## Status

- State: fixed in 1.8.15
- First confirmed: 2026-07-18
- Affected releases: 1.8.14 and earlier documentation-contract releases
- Severity: high finalization and archive impact
- Components: task documentation snapshots, execution-session dispatch history, Goal finalize documentation gate

## Confirmed incident

An AIHub Goal completed all nine tasks, independent reviews, full verification, Docker E2E, and final review. Loop iteration 49 was `done`, with every task `DONE:APPROVED`, but `ospec finalize` could not archive it.

Two tasks intentionally deleted three obsolete handoff documents after an earlier task had converted them to redirects. Other documentation tasks had several repair dispatches: their first completion changed the durable documents, while later repairs changed only a release-note subset.

Finalize rejected both valid histories. It required every declared documentation path to exist in the current workspace, so a reviewed deletion could never pass. It also selected only the last completed dispatch for each task, so an unchanged document in a later repair replaced the earlier meaningful evidence with `meaningfullyChanged: false`.

## Root causes

1. Task completion calculated meaningful documentation change only when the final path existed, making `exists: true` to `exists: false` permanently false.
2. Finalize mixed current file existence with per-task historical obligations and therefore rejected a path legitimately deleted by a later declaring task.
3. Finalize reversed the dispatch list and read one completion instead of reconstructing the task's evidence chain.

## 1.8.15 resolution

1. Existence transitions are meaningful: create and delete are both changes, while missing-to-missing remains unchanged.
2. Each task/path aggregates completed dispatches from the first baseline to the last completed state.
3. The path's latest evidence across all declaring tasks defines its expected final state.
4. The current workspace must match that final existence state and canonical normalized-content hash.
5. A final reversion to the first baseline fails even when an intermediate dispatch changed the document.
6. Legacy evidence without a baseline keeps the existing compatibility path only for documents that still exist; unproven deletion fails closed.

## Recovery

The affected AIHub Goal must remain untouched until 1.8.15 is installed. After `ospec update`, rerun session/bootstrap/workspace and retry `ospec finalize`. Do not tick Loop, redispatch tasks, rewrite evidence, restore deleted documents, or replay verification: the existing `done` state and execution history are sufficient.

## Regression coverage

- Completion records an existing document becoming missing as meaningful.
- A first repair changes a document and a later repair leaves it unchanged; finalize accepts the aggregate change.
- One task creates a redirect and a later declaring task deletes it; finalize accepts the reviewed deletion.
- A later dispatch returns a document to its first baseline; finalize rejects the chain.
- The current workspace is checked against the latest declared-owner evidence.
- The preserved real AIHub execution session produces no documentation finalize failures under the 1.8.15 analyzer.
