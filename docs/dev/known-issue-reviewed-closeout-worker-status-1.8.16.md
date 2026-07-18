# Known Issue: Reviewed Closeout Metadata and Localized Worker Status Still Blocked Archive

## Status

- State: fixed in 1.8.16
- First confirmed: 2026-07-18
- Affected release: 1.8.15
- Severity: high finalization and archive impact
- Components: documentation final-state authorization, task-review snapshots, localized worker-status synchronization

## Confirmed incident

OSpec 1.8.15 correctly accepted an AIHub Goal's intentional document deletion and multi-round documentation evidence. All deletion and evidence-chain checks passed. The Goal still could not archive for two later closeout reasons.

First, `verification.md` acquired its completed optional-step metadata after task-9's last worker dispatch. A fresh Loop-owned task-9 review and final review both covered the exact current file, but finalize compared only the worker dispatch state and reported drift. The current raw SHA-256 exactly matched the later task-review target snapshot.

Second, `ospec execute sync` correctly derived the final reviewer fields as `DONE_WITH_CONCERNS`, but its checklist matcher recognized only the English phrase `Combined code review`. The Chinese template line `Combined review 已完成` remained unchecked, so archive rejected `worker-status.md` despite its authoritative frontmatter and managed summary.

The CLI also correctly refused to create a new worker dispatch for the already completed task. Manual evidence edits, checkbox changes, or dispatch rewrites would have weakened provenance and were not acceptable recovery paths.

## 1.8.16 resolution

1. The dispatch meaningful-change chain remains mandatory and unchanged.
2. Final-state drift may bind to a later APPROVED task review only after full existing task-review provenance validation.
3. The task review must be assigned after the latest owner dispatch and its path snapshot must exactly match the current raw content or missing state.
4. Review evidence is read only; execution-session and dispatch history are never refreshed or rewritten by finalize.
5. Worker-status sync updates visible section status lines and recognizes Combined review checklist text in English, Chinese, Japanese, and Arabic.
6. Any stale, pre-dispatch, unapproved, incomplete, or subsequently changed review still fails closed.

## Recovery

Keep the completed AIHub Goal unchanged until 1.8.16 is installed. After `ospec update`, run session/bootstrap/workspace, then `ospec execute sync`, `ospec archive --check`, and `ospec finalize`. Do not tick Loop, redispatch workers, rerun review or verification, restore deleted files, or edit historical evidence.

## Regression coverage

- Unreviewed post-dispatch drift fails documentation finalization.
- A later approved task review with a matching target snapshot authorizes the final state.
- A final edit after that review fails again.
- A task-level first-to-final meaningful-change reversion still fails independently of review fallback.
- Localized Combined review checklist lines synchronize in English, Chinese, Japanese, and Arabic.
- Localized visible status sections synchronize from authoritative derived statuses.
- The preserved AIHub documentation contract produces 46 passing checks with no artifact mutation.
