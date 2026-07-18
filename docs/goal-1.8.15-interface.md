# Goal workflow interface changes in 1.8.15

OSpec 1.8.15 fixes documentation evidence finalization for Goals that intentionally delete a declared document or repair a task more than once.

## Reviewed deletion evidence

Task completion now records a documentation path as meaningfully changed when either its existence state or normalized content hash changes. In particular, `baselineExists: true` followed by `exists: false` is a meaningful deletion. A path that was missing before and remains missing is still unchanged.

## Multi-dispatch evidence chain

Finalize evaluates every completed dispatch for a task and declared path in completion order:

- the first dispatch baseline is the task baseline;
- the last completed dispatch evidence is the task final state;
- meaningful change is computed between those endpoints;
- a later repair that leaves an earlier documentation edit untouched does not erase that edit;
- a final return to the first baseline fails even if an intermediate attempt changed the file.

Finalize also finds the latest completed evidence across every task that declares the same path. The current workspace must match that final existence state and, for canonical hashes, its normalized content hash. An earlier task may therefore create or redirect a document that a reviewed later task deletes, while an unrecorded recreation, deletion, or edit still fails closed.

Legacy execution sessions without baseline evidence remain compatible only when the declared document currently exists. A missing document requires deletion evidence. No persisted schema change is required.

## Recovery of an already completed Goal

After installing 1.8.15 and running `ospec update`, a Goal whose Loop is already `done` does not need worker, review, repair, or verification replay. Run the normal non-forced bootstrap/workspace checks and retry `ospec finalize`. Existing dispatch and review history remains authoritative.
