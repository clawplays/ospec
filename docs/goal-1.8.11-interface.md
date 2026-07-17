# Goal workflow interface changes in 1.8.11

OSpec 1.8.11 fixes a false no-progress stop found in a real AIHub Goal. The two-round task and grouped final repair settings remain convergence thresholds, but a reviewer may now keep one stable finding ID while a successful repair narrows the same root defect.

## Dual-evidence same-ID convergence

At or above the configured threshold, OSpec evaluates task and grouped final repair as follows:

- a new structured finding-ID set continues unless it cycles to a prior set;
- the same ID set continues as `findings_refined` only when both the structured finding fingerprint and the code snapshot inside the prior authorized repair scope changed;
- changed finding text with an unchanged repair-scope snapshot stops as `reviewed_target_unchanged`;
- changed code with an unchanged structured finding fingerprint stops as `findings_unchanged`;
- exact fingerprint repetition or a prior finding state returning stops as `findings_repeated`;
- missing or inconsistent provenance fails closed.

The structured fingerprint includes ID, severity, category, message, file, line, evidence, requirement references, and repair scope. This allows a reviewer to report that the broad failure is fixed and one narrower edge case remains without inventing a new ID.

## Repair provenance

New task-review repair contexts add optional fields:

```ts
interface TaskReviewRepairContextV1811 {
  reviewDispatchId?: string;
  reviewTargetSnapshotHash?: string;
  repairScopeSnapshotHash?: string;
}
```

New grouped final repair-wave records add the equivalent source fields:

```ts
interface TaskRepairWaveRecordV1811 {
  sourceReviewDispatchId?: string;
  sourceReviewTargetSnapshotHash?: string;
  sourceRepairScopeSnapshotHash?: string;
}
```

The full reviewed target snapshot remains immutable review provenance. The repair-scope snapshot is a deterministic projection over only the files the prior finding authorized the worker to edit. A change elsewhere in a broad task does not prove repair progress.

## Existing Goal recovery

The new fields are optional so 1.8.9 and 1.8.10 artifacts remain readable. When an older repair context lacks them, OSpec finds the latest successful review dispatch for the same task or final-review scope that completed before the retry or repair wave was created. It validates that dispatch's target snapshots and derives the repair-scope snapshot.

If the historical review dispatch is missing, ambiguous, corrupt, or cannot cover the recorded repair scope, OSpec does not assume progress. Existing repair counts, finding IDs, and strict-mode settings are never reset.

## Unchanged guards

- `continueWhileProgressing=false` still enforces strict lifetime ceilings.
- `BLOCKED` reviews still require blocker resolution and never create repair work.
- STOP, required decisions, total iteration/time/token budgets, workspace ownership, capability, L3 allowlists, executor provenance, and evidence validation remain hard gates.
- Specialist design and plan document-review convergence remains on its existing document ledger contract.
- Raising a repair limit is not a substitute for unchanged evidence.

## Controller behavior

Controllers should let Loop decide convergence from durable artifacts. They must not rename a stable finding merely to continue, manually edit retry history, or raise the repair ceiling when Loop reports unchanged evidence. A `findings_refined` result produces the next bounded repair dispatch automatically.
