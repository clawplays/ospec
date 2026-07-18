# Goal workflow interface changes in 1.8.19

OSpec 1.8.19 makes a task's canonical worker report part of the review and repair evidence contract and adds a compatibility recovery route for reviews created by older releases.

## Canonical worker-report evidence

A fresh task review now includes the exact `artifacts/agents/worker-reports/<task-id>.md` path in its reviewed targets and content snapshots. The snapshot records an explicit missing state when the report does not yet exist. A later report change therefore invalidates the old review evidence just like a change to a declared implementation target.

When structured findings require correcting that report, repair scope may include only the exact canonical report for the same task. Another task's report, the worker-reports directory, and arbitrary controller artifacts remain outside legal repair scope.

## Legacy task-review recovery

Reviews created by 1.8.18 and earlier may contain a valid finding against the canonical worker report without having snapshotted that report. Before creating a repair, the Loop now detects that legacy evidence shape and issues a fresh controller-owned task review.

This compatibility route does not rewrite historical review or dispatch artifacts, force recovery, or consume a repair round. If the fresh review retains the finding, the following repair packet carries a snapshot-bound same-task report scope. If the reviewer no longer finds the issue, normal task approval proceeds without a repair.

## Recovery of the confirmed Web Goal

Install 1.8.19 in the Web Goal, run `ospec update`, then perform the normal session, bootstrap, workspace, and non-forced Loop resume checks. The controller should issue a fresh task-9 review before any report repair. Execute that review and any resulting repair action normally; do not hand-edit `tasks.md`, task graph state, review sidecars, repair rounds, or historical dispatches.
