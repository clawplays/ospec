# Goal workflow interface changes in 1.8.9

> 1.8.11 refines the ID-only convergence rule for task and grouped final repair. A stable ID can continue when both its structured fingerprint and its authorized repair-scope code snapshot changed. See [goal-1.8.11-interface.md](goal-1.8.11-interface.md). The document-review rule described here is unchanged.

OSpec 1.8.9 keeps older Goal artifacts readable while making continuous execution the default. A Goal continues while durable evidence shows progress and stops only for an explicit budget or STOP, a required user decision, a safety gate, a durable external blocker, potentially live work, or repeated findings that no longer converge.

## Progress-aware review repair

Loop efficiency adds:

```ts
interface LoopEfficiencyV189 {
  continueWhileProgressing: boolean;
}
```

The default is `true`. `maxTaskRepairRounds` and `maxFinalRepairRounds` remain at `2`, but they are convergence thresholds instead of unconditional lifetime stops. After the threshold, a task or grouped final repair continues only when the stable structured finding-ID set is new in that repair history. Rewording a finding under the same ID is not progress. Repeating the previous set or cycling back to an earlier set stops before another repair dispatch.

Legacy repair records remain counted. When an old record has no captured repair context, OSpec compares the current finding IDs with the latest completed worker summary when possible. If no comparison is possible, one compatibility repair may run; that new dispatch captures immutable review and findings provenance for the next decision.

Set strict pre-1.8.9 behavior explicitly with:

```bash
ospec loop configure <goal> --continue-while-progressing false
```

## Complete repair packets

Every task-review retry snapshots the review artifact, structured findings sidecar, hashes, finding IDs, evidence, requirement references, and bounded repair scope into the retry and dispatch records. The worker packet names both artifacts and renders every finding. Missing, empty, tampered, or out-of-task repair scope fails closed.

Recovery of a malformed older repair action recreates the packet from current authoritative review evidence without consuming another task-review repair round.

## Durable blockers and technical failures

Worker `BLOCKED` and `NEEDS_CONTEXT` results are durable and are not automatically redispatched. Missing executor results, expired actions, and executors that exit without durable evidence are marked retryable technical failures. A legacy `worker_status` retry cannot turn an existing durable external blocker into a retryable one.

Independent ready tasks continue before a durable blocker is reported. The Loop enters `blocked` only after independent work is exhausted.

## Lost action recovery

An `IN_PROGRESS` task with no Loop pending action is treated as potentially live until its configured absolute implementation runtime expires. Before that deadline OSpec does not duplicate it. After the deadline OSpec supersedes the orphaned dispatch and creates one fresh `worker_status` retry automatically. A stale task with no active dispatch record is recoverable immediately.

## Faster scheduling and checkpoints

Conflict-safe ready implementation work is dispatched before review, repair, or retry work that can wait. Dependencies still require approved upstream task review, so the ordering increases available parallel work without bypassing the graph.

The periodic comprehension counter no longer pauses default continuous Goals. It resets after each configured interval. Strict mode (`continueWhileProgressing=false`) preserves the earlier pause behavior. STOP, total iteration/time/token budgets, no-progress guards, required decisions, capability, workspace, L3 allowlist, and evidence validation remain hard gates.
