# Known Issue: Task Review Could Find but Not Repair Its Canonical Worker Report

## Status

- State: fixed for 1.8.19
- First confirmed: 2026-07-18
- Affected release: 1.8.18 and earlier review snapshots
- Severity: high Goal continuation impact
- Components: task-review snapshots, repair-scope ownership, legacy Goal recovery

## Confirmed incident

A Web Goal's task-9 reviewer correctly found a material factual error in `artifacts/agents/worker-reports/task-9.md`. The task review packet explicitly required the reviewer to read that canonical report, and every worker dispatch explicitly required the implementer to write it. The structured finding therefore named the report in its repair scope.

Repair creation still rejected the path as outside declared task targets. Task review snapshots contained only task-graph `target_files`, so the worker report was neither recognized as same-task repair evidence nor bound into the review target hash. The Goal could not legally correct the report, and removing the finding or editing evidence manually would have weakened provenance.

## 1.8.19 resolution

1. Every fresh task review includes the exact canonical worker report path in its target files and content snapshots, including an explicit missing snapshot when no report exists.
2. The task-review context hash therefore changes when the report changes, and an edit after review invalidates stale approval.
3. Repair scope may include only the exact canonical worker report for the same task. Parent directories, arbitrary artifacts, and another task's report remain rejected.
4. The report remains separate from task-graph business `target_files`; it is controller-owned evidence, not a new implementation ownership wildcard.
5. When an older `NEEDS_CHANGES` review contains a report finding but its dispatch did not snapshot that report, Loop issues one fresh executor-bound task review before repair. It does not rewrite the old dispatch, consume a repair round, or accept an unsnapshotted report.

## Recovery

Install the fixed CLI and run the normal update/session/bootstrap/workspace checks. Resume the existing Loop without force recovery. The next tick refreshes only the affected task review, after which an unchanged valid finding can create the normal bounded repair packet.

## Regression coverage

- A same-task worker report is included in fresh review targets and snapshots.
- A finding scoped to that exact report creates a normal repair action.
- Editing the report after review invalidates the review evidence.
- A legacy review without the report snapshot receives a fresh review and consumes zero repair rounds.
- A completed second task does not authorize cross-task worker-report repair.
