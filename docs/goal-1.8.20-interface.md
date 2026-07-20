# Goal workflow interface changes in 1.8.20

OSpec 1.8.20 restores fresh design and plan review dispatch for resumed Goals whose imported legacy review completions have no durable per-run decision.

## Legacy document-review convergence

When a current release first creates `artifacts/agents/document-review-ledger.json`, older completed specialist dispatches are imported into its append-only hash chain. Some old dispatch records prove executor completion through `reviewerCompletedAt` and `reviewerSucceeded` but predate durable decision and immutable findings snapshots.

Those completions still count toward document-review round accounting. Their absent decision is now treated as `legacy_context_unavailable` during convergence analysis, so continuous mode may issue a fresh review after `proposal.md`, `design.md`, or `implementation-plan.md` changes.

OSpec does not infer an approval, finding set, or synthetic decision from the current review artifact. It does not edit, delete, or rehash imported ledger events. Modern `review_completed` events still require a valid decision, and a non-empty invalid legacy decision remains an integrity error.

## Recovery of the confirmed Dev Mobile Goal

Install 1.8.20, run `ospec update`, then perform normal session, bootstrap, and workspace checks. Request the pending design review again without forced recovery. After design approval, request the plan review and continue with the Loop-generated task actions.

Do not hand-edit `document-review-ledger.json`, historical dispatches, reviews, findings, repair rounds, or task status. The existing user scope decision and revised design, plan, and task graph remain authoritative inputs for the fresh reviews.
