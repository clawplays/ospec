# Known Issue: Authorized Extra Document Review Could Not Outlive the Base Stage Budget

## Status

- State: fixed in 1.8.8
- First confirmed: 2026-07-16
- Affected release: 1.8.7
- Severity: high availability impact; the fail-closed guard preserved review safety but made an approved extra round impossible to dispatch
- Component: Goal design/plan document review governance and status projection

## Confirmed Incident

```text
Project: D:\OPMProjs\aihub
Goal: nocobase-chat-message-hierarchy
Stage: plan
Round 1: 10:56:25 -> 11:04:27
Round 2: 11:08:23 -> 11:18:33
Round 3 authorization selected: 11:27:46
Elapsed from first plan event: 31m20s
Result: authorized round 3 rejected by the 30-minute stage budget
```

The selected decision was valid and bound to `stage=plan`, the current review context hash, `round=3`, and exactly one extra round. The dispatch guard found that authorization and then independently measured the base stage lifetime from the first plan ledger event. Because the lifetime included repair work and time waiting for the user, it had already exceeded 30 minutes when the user answered.

## Root Cause

Round authorization and stage time governance were evaluated as unrelated gates:

1. the round guard accepted one exact user-bound override;
2. the time guard still used the first stage event as its only anchor;
3. the override carried no grant timestamp or dispatch deadline into the dispatch record;
4. status exposed only exhausted base minutes, so it could not explain whether an authorized window was still usable.

The 30-minute value is a base stage lifetime, not a reviewer runtime limit. It must stop unbounded automatic redispatch, but it must not make the explicit escape hatch self-contradictory.

## 1.8.8 Fix Contract

### One bounded window per exact authorization

When the base completed-round limit requires an override, OSpec reads the newest unconsumed selected decision that is:

- required and answered by the user;
- selected on its declared approval option;
- bound to the exact stage, review context hash, and next round;
- limited to exactly one extra round;
- equipped with a valid `selectedAt` timestamp.

That authorization opens one dispatch window whose duration equals the stage's bounded `maxMinutes` value, capped at 30 minutes, and whose anchor is `selectedAt`. The old base stage lifetime may already be exhausted. Dispatch consumes the decision immediately in the hash-chained ledger, so the grant cannot be reused.

### Expiry and reauthorization

An unused authorization expires at its explicit dispatch deadline. OSpec reports that deadline and requests a fresh exact authorization instead of repeating the misleading base-stage error. Re-selecting the same durable decision refreshes `selectedAt`; when multiple matching unconsumed decisions exist, the newest valid selection wins.

### Other guards remain authoritative

The override affects only the base document-review stage-time gate. It does not bypass:

- the Loop STOP file or paused/stopped state;
- absolute `expiresAt`, total `budgetMinutes`, or `maxIterations`;
- total or stage token reservations;
- no-progress convergence limits;
- context-hash binding, executor provenance, or structured findings validation.

### Observable status

Document-review governance now keeps exhausted base minutes separate from `overrideDispatchWindow`, which records the decision ID, round, selection time, deadline, remaining milliseconds, and expiry state. Dispatch records persist the selected time and deadline for durable diagnostics.

## Acceptance Criteria

1. Two completed rounds may consume more than 30 wall-clock minutes before the user selects round 3; the fresh exact authorization can still dispatch once.
2. Base stage minutes remain exhausted in status while the separate override window is visible.
3. An unused override expires after its bounded window and produces a specific authorization-expired error.
4. Reauthorization opens a fresh window without deleting review history or increasing the automatic round limit.
5. A consumed decision, wrong stage, wrong context hash, wrong round, denied option, non-user answer, or malformed timestamp cannot authorize dispatch.
6. STOP, Loop lifetime, iteration, token, and no-progress guards still block an otherwise authorized extra round.

## Relevant Code Areas

- `src/services/TaskGraphExecutionService.ts`: grant selection, dispatch deadline enforcement, durable dispatch fields, and governance projection.
- `src/commands/LoopCommand.ts`: separate override-window status output.
- `tests/services/document-review-governance.test.mjs`: post-budget dispatch, expiry, reauthorization, and Loop lifetime regression coverage.
