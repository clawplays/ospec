# Known Issue: Goal Continuation Could Stop or Redispatch Without Useful Work

## Status

- State: fixed in 1.8.9
- Confirmed: 2026-07-16 through 2026-07-17
- Affected releases: 1.8.3 through 1.8.8, depending on the path
- Components: repair packet provenance, review convergence, blocker classification, orphan recovery, and scheduling

## Confirmed incidents

### Web repair packet lost the review findings

`web-aim-platform-logic` reached a valid `NEEDS_CHANGES` task review with four structured findings. The next repair dispatch included only the original task description. It omitted the review artifact, findings sidecar, finding IDs, evidence, and expected repair scope. The worker correctly refused to guess, leaving the action awaiting evidence.

1.8.9 captures authoritative repair context in both retry and dispatch records and reconstructs malformed 1.8.8 actions without charging another repair round.

### Mobile Dev redispatched a durable device blocker

`implement-mobile-figma-derived-workflows` completed `task-21-extract-model3d` as `BLOCKED` because Android device or emulator capture evidence and the canonical comparison manifest did not exist. The next tick dispatched the same task again even though no external state changed.

1.8.9 distinguishes durable worker blockers from technical executor failures. It runs other independent tasks first, then reports the durable blocker without redispatch. Recovery of an old `worker_status` action preserves the original non-retryable blocker classification.

### AIHub stopped while findings were still converging

`aihub-nocobase-chat-message-hierarchy` used the two default task repair rounds to resolve earlier findings. The next independent review found a different remaining issue, `F-004`, but the lifetime counter stopped before the third repair even though `F-003` had disappeared.

1.8.9 treats the two-round value as a convergence threshold by default. `F-003` to `F-004` is progress and continues. `F-004` to `F-004` is not progress and stops before another ineffective repair. Stable IDs are authoritative; changing only finding wording cannot keep the Loop alive.

### Document review authorization conflicted with elapsed stage time

Earlier releases required manual extra-round authorization after two document reviews and could then reject that authorization because the cumulative 30-minute stage budget had already elapsed. 1.8.8 added a fresh authorized window, but the Goal still required unnecessary interaction while findings were converging.

1.8.9 continuous mode no longer treats the base round or stage-time values as unconditional stops. Document finding IDs and convergence resolutions decide whether review is progressing. The existing no-progress, token, Loop lifetime, STOP, and evidence guards remain active.

### Lost Loop state left tasks permanently IN_PROGRESS

If task graph state remained `IN_PROGRESS` after its pending Loop action disappeared, every later tick refused duplicate dispatch forever. This was safe for a live child but had no transition after a one- or two-day-old orphan was clearly beyond its action runtime.

1.8.9 waits until the configured absolute runtime deadline, then supersedes the orphan and retries with fresh context. The 60-second controller wait remains only a polling boundary and does not shorten this runtime.

## Safety invariants

Continuous execution does not mean infinite retry:

- any structured finding-ID set already seen in the repair history stops after the configured threshold, including multi-round cycles;
- a durable external blocker is never converted into an automatic retry;
- work that may still be live is not duplicated before its absolute deadline;
- corrupt, missing, empty, or out-of-scope review evidence fails closed;
- required decisions, STOP, explicit budgets, workspace ownership, capability, and L3 allowlists remain hard gates;
- independent task ordering never bypasses dependency or conflict checks.

## Regression coverage

The 1.8.9 suite covers malformed repair recovery, immutable repair context, finding-ID convergence, legacy summary fallback, same-ID rewording, grouped final review convergence, durable device blockers, independent-task continuation, recovered legacy blocker retries, missing durable executor evidence, comprehension compatibility mode, orphan deadlines, and ready-work scheduling priority.
