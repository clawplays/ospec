# Known Issue: Stable Finding IDs Hide Real Partial Repair Progress

## Status

- State: fixed in 1.8.11
- First confirmed: 2026-07-17
- Affected releases: 1.8.9 and 1.8.10
- Severity: high workflow stop for dependency chains behind a partially repaired task
- Component: task-review and grouped final-review convergence

## Confirmed incident

The issue was confirmed in this existing Goal:

```text
Project: D:\OPMProjs\aihub-nocobase-chat-message-hierarchy
Goal: nocobase-chat-message-hierarchy
Task: task-2
Loop iteration: 19
Stop reason: findings_unchanged
Repair rounds: 2
Finding IDs: F-001
```

The first captured F-001 said both production stream finalizers hard-coded `hydrationSettled=true`. The second repair propagated the real messages hydrate result, and lint plus 12/12 desktop/mobile E2E passed. The next independent review correctly kept F-001 because the same root contract was not fully resolved, but narrowed it to summary/list settlement: messages could succeed while summary was missing, still releasing streaming too early.

The implementation and review evidence had therefore progressed, but the stable ID set remained `F-001`.

## Root cause

The 1.8.9 convergence implementation calculated both current and previous structured finding fingerprints but decided progress only from sorted finding IDs:

```text
unchanged = previousFindingIds == currentFindingIds
progressing = !repeated && !unchanged
```

Stable IDs are intentional reviewer behavior. Requiring a new ID for every narrowed edge case encourages identity churn and weakens repair history. However, trusting changed prose alone would let a reviewer reword the same defect indefinitely. Trusting any target-file change would likewise let unrelated edits or code churn bypass the guard.

The same ID-only comparison existed for grouped final-review repair waves.

## 1.8.11 resolution

OSpec now requires two independent signals before continuing the same ID set past the threshold:

1. The full structured finding fingerprint changed. The fingerprint covers severity, category, message, file, line, evidence, requirement references, and repair scope.
2. The reviewed code snapshot changed inside the exact repair scope authorized by the prior finding.

Both must be true. The result is `findings_refined`, and Loop creates the next bounded repair automatically.

The following still stop:

- changed wording with no repair-scope code change: `reviewed_target_unchanged`;
- changed code with the same finding fingerprint: `findings_unchanged`;
- a fingerprint returning to an earlier state: `findings_repeated`;
- a changed ID set cycling to an earlier set: `findings_repeated`;
- missing or invalid snapshot provenance: fail closed.

## Provenance and migration

New repair records bind the review dispatch ID, full reviewed target snapshot hash, and a deterministic repair-scope snapshot hash. The worker packet renders these values for audit.

Existing 1.8.9 and 1.8.10 records do not have these fields. During convergence assessment, OSpec locates the latest successful review dispatch for the same task or final-review scope that completed before the repair was created, validates its full snapshot, and derives the prior repair-scope projection. This lets the confirmed AIHub Goal resume after update without deleting history or raising `maxTaskRepairRounds`.

If old artifacts cannot prove the prior snapshot, OSpec stops. Compatibility never fabricates progress from timestamps alone.

## Why the guard remains

Unlimited same-ID retries would trade a false stop for an infinite repair/review loop. The two-signal rule keeps the original safety property:

- reviewer prose alone cannot continue;
- unrelated code changes outside the authorized repair scope cannot continue;
- exact or cyclic states cannot continue;
- real partial implementation plus a materially narrower finding can continue.

All other Loop budgets and safety gates remain active.

## Regression coverage

The 1.8.11 suite covers:

- same-ID reviewer rewording with no repair-scope code change still stopping;
- same-ID structured refinement plus repair-scope code change continuing to a third repair;
- a 1.8.9 retry record with the new provenance fields removed recovering its prior review snapshot;
- grouped final-review same-ID refinement using the same two-signal rule;
- changed finding IDs continuing under the existing contract;
- exact and cyclic findings remaining stopped;
- complete repair packets retaining review and repair-scope hashes.

## Relevant code

- `src/services/TaskGraphExecutionService.ts`: repair context capture, historical review lookup, scope snapshot projection, and convergence assessment.
- `src/services/LoopService.ts`: eligibility and blocked diagnostics.
- `tests/services/loop-controller-integration.test.mjs`: task, legacy migration, unchanged-target, and grouped final convergence regressions.
