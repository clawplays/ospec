# Goal workflow interface changes in 1.8.4

OSpec 1.8.4 keeps 1.8.3 artifacts readable and adds convergence controls for task-level implementation and review loops.

## Task-review carry-forward

An approved task review remains bound to its original target-file snapshot. If those files later change, OSpec carries the approval forward only when all changed paths are covered by completed tasks that transitively depend on the reviewed task. Unattributed edits, unrelated task edits, incomplete downstream work, and final-review drift still invalidate the review.

Downstream task-review dispatch records add:

```ts
interface TaskReviewDispatchRecordV184 {
  regressionTaskIds?: string[];
}
```

The review packet and review package list every transitive upstream task that shares target files. The downstream reviewer must verify those upstream expected results as regression obligations. A fresh whole-change final review remains mandatory.

## Repair-round guard

Loop efficiency adds:

```ts
interface LoopEfficiencyV184 {
  maxTaskRepairRounds: number;
  maxFinalRepairRounds: number;
}
```

The default is `2`. Only retries triggered by a task-review decision count toward this limit; manual and worker-status retries do not. Existing retry records without trigger metadata remain compatible and are classified from the legacy Loop summary when possible.

Configure an intentional limit with:

```bash
ospec loop configure [change] --max-task-repair-rounds N
ospec loop configure [change] --max-final-repair-rounds N
```

When every task needing review repair has reached the limit, Loop emits no action and reports a gate with exact `task=count/limit` diagnostics. Grouped final-review repair independently defaults to two waves and reports `final=count/limit` at its gate. A `BLOCKED` final review stops for blocker resolution; only `NEEDS_CHANGES` can create a grouped repair wave. Raising either limit requires explicit user authorization after inspecting unresolved findings. Corrupt retry or repair-wave history fails closed.

## Retry metadata

New retry records add:

```ts
type TaskWorkerRetryTrigger = 'manual' | 'worker_status' | 'task_review';

interface TaskWorkerRetryRecordV184 {
  trigger?: TaskWorkerRetryTrigger;
}
```

The field is additive. Missing values remain valid for 1.8.3 and older artifacts.
