# Known Issue: Resumed Goals Could Stop at Secondary Scheduler and Verification Gates

## Status

- State: fixed in 1.8.13
- First confirmed: 2026-07-17
- Affected release: 1.8.12
- Severity: high continuation impact
- Components: Loop scheduling, task-review repair provenance, executor leases, and verification packets

## Confirmed incidents

### Web prerequisite review ordering

The Web Goal recovered its task-4 findings and repair snapshots correctly, but the expired retryable task-4 blocker was selected before task-1 received a fresh Loop-owned review. Dispatch then rejected task-4 because its prerequisite review lacked executor provenance. The later prerequisite-review branch was unreachable.

### Mobile cross-task finding routing

The Mobile Goal advanced from 21 to 25 accepted tasks after external acceptance deferral. task-27 review then found that correct work-order guard evidence required changing both task-27 lineage and a validator owned by an earlier completed tooling task. The repair-scope guard correctly rejected an undeclared task-27 path, but Loop had no safe route through the validator's declared owner.

### AIHub long verification and broad Docker rebuild

AIHub reached 8 of 9 accepted tasks. Its final verification packet used `docker compose up -d --build` without service names, rebuilding an unrelated optional RAG runtime and downloading transitive accelerator packages. While the build ran, repeated controller polls did not renew the claimed executor lease unless a separate heartbeat command succeeded, so the attempt eventually expired before its absolute runtime deadline.

## 1.8.13 resolution

1. Derive missing prerequisite reviews from both review repairs and retryable blocked tasks, and dispatch those reviews before worker retry.
2. Accept cross-task repair paths only when every extra path maps to a declared completed task owner.
3. Freeze the complete cross-task repair scope and owner IDs in retry provenance; changed owner snapshots invalidate stale reviews normally.
4. Renew a claimed executor's short lease when a bounded controller poll observes the same pending action, without extending the fixed absolute deadline.
5. Keep orphan expiry, forced recovery, evidence-result grace, workspace readiness, L3 allowlists, and final review unchanged.
6. Add a dispatch warning for unscoped full Docker Compose rebuilds so workers inspect release guidance and prefer explicit service names.

## Regression coverage

- A retryable dependent blocker with a pending prerequisite emits a task-review action first.
- A finding spanning current-task and completed-owner paths records owner IDs, complete target snapshots, and a stable repair-scope hash.
- Changing a cross-task owner path causes that owner to receive a fresh independent review.
- Unknown or unfinished repair-scope owners remain rejected.
- Repeated bounded controller ticks keep a claimed long-running child leased, while an unobserved orphan and the absolute deadline still expire.
- An unscoped `docker compose up -d --build` command is clearly identified in the worker packet before execution.
