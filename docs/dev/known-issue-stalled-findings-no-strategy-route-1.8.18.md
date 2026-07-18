# Known Issue: Stalled Findings Had No Legal Root-Cause Repair Route

## Status

- State: fixed in 1.8.18
- First confirmed: 2026-07-18
- Affected releases: 1.8.11 through 1.8.17
- Severity: high Goal continuation impact
- Components: task-review convergence, grouped final repair, Loop recovery commands

## Confirmed incident

A Web Goal reached the configured automatic repair threshold with the same task-4 finding. The Loop correctly detected no convergence, but it exposed only a blocked state and guidance to change strategy. There was no legal task-level controller action that preserved review provenance and requested a different repair approach. Raising the numeric round limit risked repeating the same patch, while manual artifact edits or direct review dispatch would weaken controller ownership.

Some status guidance also named `ospec loop tick`, while the CLI accepted only `loop run`; the documented recovery command therefore did not exist even though both were intended to mean one controller iteration.

## 1.8.18 resolution

1. Continuous mode creates one durable `repair_strategy` retry after ordinary task repairs stop converging.
2. Grouped final-review repair receives the equivalent one-time strategy wave.
3. Strategy identity is bound to the task/final scope and sorted finding-ID set.
4. Packets retain review artifacts, structured findings, repair scope, snapshots, and cross-task ownership and explicitly require root-cause reassessment plus focused regression coverage.
5. A second escalation for the same strategy key is rejected, preserving the no-progress circuit breaker.
6. Strict mode remains bounded by the configured repair limit.
7. `ospec loop tick` now routes through the same single transactional iteration as `ospec loop run --once`.

## Recovery

After installing 1.8.18 and running `ospec update`, resume the existing controller normally. Execute only the action returned by the Loop. Do not force recovery or create a manual retry merely to manufacture a strategy attempt.

## Regression coverage

- Exact-repeat, unchanged, reviewed-target-unchanged, and cycling task findings receive one strategy action.
- A completed strategy action followed by the same finding set stops and cannot be reissued.
- Grouped final repair has the same one-time behavior.
- Strategy packets preserve binding evidence and explain the required different approach.
- `loop tick --json` calls the same controller iteration as `loop run --once --json`.
