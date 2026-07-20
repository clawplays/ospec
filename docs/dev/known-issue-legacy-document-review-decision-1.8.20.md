# Legacy document-review completions without decisions

- Affected release: 1.8.19
- Fixed release: 1.8.20
- Surface: resumed Goals that revise an already reviewed design or implementation plan

## Symptom

After a Goal updates its approved design or implementation plan, a fresh specialist review fails before dispatch with:

```text
Unsupported review run decision:
```

The failure can remain unchanged after a non-forced Loop recovery.

## Cause

When 1.8.19 first creates `artifacts/agents/document-review-ledger.json`, it imports older document-review dispatch records into an append-only hash chain. Some legacy records durably identify a successful executor completion through `reviewerCompletedAt` and `reviewerSucceeded` but do not contain a per-run review decision or immutable result snapshot.

Those records still count as completed historical rounds. The convergence check incorrectly parsed their absent `payload.decision` as a modern review decision instead of treating their finding context as unavailable, so a valid fresh review could not be dispatched after authoritative documents changed.

## Resolution

Legacy imported completions with no durable decision now contribute to completed-round accounting while reporting `legacy_context_unavailable` to convergence analysis. Continuous review mode may therefore issue a fresh specialist review for changed authoritative documents.

Modern `review_completed` events still require a valid decision. Invalid non-empty legacy decisions and missing modern decisions remain hard errors. The migration never edits or rehashes an existing ledger, review, dispatch, or completion record.

## Recovery

Upgrade to 1.8.20, run the normal session, bootstrap, and workspace checks, then request the pending design or plan review again. Do not hand-edit `document-review-ledger.json` and do not use forced recovery for this condition.
