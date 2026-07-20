# Goal workflow interface changes in 1.8.22

OSpec 1.8.22 lets explicit force archive distinguish a live executor from an unconsumed terminal Controller action.

## Terminal pending actions

A `pendingControllerAction` no longer blocks force archive solely because its top-level status remains `awaiting-evidence`. It is safe when `itemStates` contains at least one item and every item is durably `completed`, `failed`, or `expired`. The archived Goal retains that action and its exit code, executor id, summary, and unresolved evidence exactly as recorded.

This handles interrupted or obsolete temporary repair tasks that have already reached a terminal executor state but cannot be consumed by a later Controller observation because the task no longer exists in the current graph.

## Non-bypassable safety

Force archive still fails when item states are missing or any item is `issued`, `running`, or otherwise nonterminal. It does not launch, recover, retry, settle, delete, or rewrite the action. The explicit force flag, exact-name confirmation, audit reason, active-directory boundary, human-owned knowledge protection, write preflight, incomplete metadata, and transactional rollback remain unchanged from 1.8.21.
