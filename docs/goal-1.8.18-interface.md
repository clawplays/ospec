# Goal workflow interface changes in 1.8.18

OSpec 1.8.18 aligns Goal finalization with archive preview and gives a stalled review one bounded root-cause repair strategy before the Loop stops.

## Canonical verification freshness

`ospec finalize` and `ospec archive --check` now use the same content-snapshot validation from `artifacts/agents/verification-evidence.json`. A later `ospec execute sync` may update derived task-graph metadata, but that metadata timestamp does not invalidate otherwise current passing evidence.

The gate still fails when the verified Git head or target-file snapshot has changed, the latest evidence is not `PASSED`, required evidence records are missing, or the evidence cannot be validated. This removes a timestamp-only false failure; it does not weaken verification freshness.

## One bounded repair-strategy escalation

In continuous mode, ordinary task or grouped final-review repairs still follow structured finding convergence. When the configured threshold is reached without progress, the Loop now issues one additional strategy packet for the exact task/final scope and sorted finding-ID set.

The packet preserves the authoritative review artifact, findings sidecar, repair scope, target and repair snapshots, and cross-task owner provenance. It also requires the worker to reassess the root cause, avoid repeating the prior patch shape, and add or strengthen focused regression coverage.

The strategy key and attempt are durable. The same finding set cannot receive a second strategy escalation, so repeated evidence still stops instead of looping forever. A materially different finding-ID set may receive its own one-time escalation. `--continue-while-progressing false` retains the strict configured repair limit and does not issue the extra strategy action.

## `ospec loop tick` compatibility command

`ospec loop tick [change-path] [--json]` is now a supported single-iteration alias of `ospec loop run [change-path] --once [--json]`. Both observe the same durable pending action and use the same transactional controller path. The alias does not force recovery, duplicate a pending action, or bypass executor provenance.

## Recovery of the confirmed Goals

For the completed AIHub Goal, install 1.8.18, run `ospec update`, session/bootstrap/workspace checks, and `ospec execute sync`, then retry `ospec archive --check` and `ospec finalize`. Do not replay completed workers, reviews, or verification.

For the Web Goal, install 1.8.18 and run the normal resume checks. The controller may issue exactly one `repair_strategy` action for the stalled task-4 finding set. Execute that packet and its independent review normally. If the same set remains unchanged afterward, the Loop stops with the durable strategy attempt preserved.
