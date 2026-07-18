# Goal workflow interface changes in 1.8.16

OSpec 1.8.16 closes the remaining archive gap for Goals that update verification closeout metadata after their last worker dispatch.

## Approved task-review final-state binding

The 1.8.15 dispatch evidence contract remains unchanged: each task/path must still show a meaningful transition from its first baseline to its final completed dispatch state. A review cannot create or replace that evidence.

When the current path differs from the latest declared-owner dispatch evidence, finalize may use a task-review snapshot only when all of these conditions hold:

- the task graph decision is `APPROVED` or `APPROVED_WITH_CONCERNS`;
- the existing task-review validator accepts the dispatch, findings, current-dispatch pointer, executor identity, controller session, timestamps, and target snapshot provenance;
- the review was assigned after the latest owner dispatch completed;
- the review target contains the declared path;
- the path's current existence state and raw SHA-256 exactly match that review target snapshot.

The fallback is path-specific. Any edit after review, stale review, missing provenance, non-approved decision, pre-dispatch snapshot, or snapshot mismatch remains an archive failure. No execution-session or review artifact is rewritten.

## Localized worker-status synchronization

`ospec execute sync` now updates the visible Implementer, Combined Review, and Controller status lines as well as checklist items. Combined review recognition covers the shipped English, Chinese, Japanese, and Arabic templates. Status is derived from authoritative task graph, final review, and verification evidence; users do not need to hand-edit checkboxes.

No persisted schema change is required.

## Unknown native capacity remains bounded

The implementation limit shown as `unknown_implementation_capacity_cap` or "capacity unknown: 3" is not the configured `maxParallel` and is not a global concurrency constant. It applies only when the selected native adapter supports parallel work but the active harness has not reported a capacity. The fallback now matches the default `maxParallel` of three, so a four-way dependency-safe graph emits three implementation actions instead of two. Conflict-safe task-review batches continue to use the configured maximum, token funding, and graph safety without this implementation-only cap.

When the active harness explicitly knows its available child capacity, it may report `nativeHarnessMetadata.parallelism.capacity` with the exact target and controller-session timestamp. A positive known capacity replaces the fallback and is still bounded by `maxParallel`, token funding, dependencies, and file conflicts. Controllers may configure `maxParallel` from 5-10 when that many current child slots are authoritatively available, but must not guess capacity from a UI, stale session, or provider name. 1.8.16 uses three only as the unknown-capacity default; it does not assume that every harness can run 5-10 children.

## Recovery of the confirmed AIHub Goal

After installing 1.8.16 and running `ospec update`, run the normal session/bootstrap/workspace checks followed by `ospec execute sync`. Then run `ospec archive --check` and `ospec finalize`. The completed workers, task reviews, final review, verification evidence, deleted documents, and dispatch history remain authoritative and must not be replayed or rewritten.
