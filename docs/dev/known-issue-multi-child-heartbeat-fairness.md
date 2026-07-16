# Known Issue: Controllers Can Miss Child Heartbeat Deadlines

## Status

- State: open; initial first-claim timing partially mitigated in 1.8.8
- First confirmed: 2026-07-16
- Affected release: 1.8.6 controller-driven native execution
- Severity: high orphan/duplicate-work risk; no data loss in the confirmed incident
- Component: native controller polling, heartbeat scheduling, multi-item fairness, and observability

## Summary

OSpec 1.8.6 correctly separates a short heartbeat target (`heartbeatDueAt`), a longer ownership lease (`leaseExpiresAt`), an immutable absolute action deadline, and an evidence-result grace period. The action packet instructs the model controller to return from each native wait within 60 seconds and refresh every live child before its heartbeat target.

In real runs, a controller can spend too long reasoning, running tools, or waiting on a child and let `heartbeatDueAt` pass. Multi-item batches add a fairness failure mode: the controller can poll or process children sequentially and refresh only the child it is currently handling while a sibling remains live and overdue. If the controller returns before `leaseExpiresAt`, a late heartbeat or authoritative evidence can still recover the action, but the safety margin has been consumed. A slightly longer delay can make OSpec classify a live child as orphaned and requeue work that is still running.

This is different from the pre-1.8.6 indefinite-wait problem. Every individual wait may be bounded while batch-wide heartbeat fairness is still violated.

OSpec 1.8.8 moves the initial unclaimed action heartbeat target from the midpoint of the five-minute lease to 60 seconds before lease expiry. This prevents normal child startup and claim overhead from producing an early overdue signal while preserving a recovery buffer. Once an executor claims the item, renewals still use the midpoint of the renewed lease. This is a scoped mitigation, not a solution to renewal fairness, unclaimed sibling launch fairness, batch heartbeat, or lateness observability.

## Confirmed Incident

Two active 1.8.6 Goals showed the behavior on 2026-07-16.

### Web Goal

```text
Goal: web-aim-platform-logic
Worktree: C:\Users\Chaos\orca\workspaces\ompv4\web-web-aim-platform-logic
Action: loop-action-11-1784179989886, task-3 review
Executor: /root/review_loop11_task3
```

Observed lifecycle:

```text
heartbeatAt:      13:34:07 +08:00
heartbeatDueAt:   13:36:37 +08:00
leaseExpiresAt:   13:39:07 +08:00
late heartbeat:   13:38:18 +08:00
```

The heartbeat was about 101 seconds late relative to `heartbeatDueAt`, but about 49 seconds before lease expiry. The review remained owned and no duplicate action was emitted.

The same action later missed the next heartbeat completely:

```text
heartbeatAt:      13:38:18 +08:00
heartbeatDueAt:   13:40:48 +08:00
leaseExpiresAt:   13:43:18 +08:00
evidenceReadyAt:  null
completedAt:      null
observed at:      13:43:44 +08:00
```

At 13:43:44 the durable item still said `running`, even though its lease had expired 26 seconds earlier. The last controller state update was 13:42:42 and no later tick had run. This is expected from the session-bound state model in the narrow sense that expiry is observed and persisted on a tick, not by a background daemon. Operationally, however, it confirms the controller failed to maintain the required polling/heartbeat loop and left the Goal apparently running until another session or turn drives recovery.

Before any recovery/reissue occurred, exact-provenance review evidence arrived at 13:44:19, about 61 seconds after lease expiry. The observation tick preferred the new authoritative evidence and opened the result-grace window instead of releasing the action. This avoided duplicate review work, but it exposes an important policy boundary: expired ownership and valid late evidence can coexist when no recovery mutation has yet replaced the action.

The safe operational choice depends on durable state:

- if exact-dispatch/executor/snapshot evidence is now ready and no recovery/reissue exists, do not recover; let the same executor finalize within result grace;
- if no valid evidence exists, run a fresh controller tick and let OSpec release/reissue the expired item;
- after recovery/reissue, reject every late result from the old executor and never let it overwrite the new review.

The scheduler fix must make this ordering explicit and test it. A late exact-provenance result may be accepted only while the original action remains authoritative; recovery must create a hard generation boundary.

### Final outcome of the Web incident

The original action did not finalize successfully. Its dispatch remained incomplete:

```text
action:                loop-action-11-1784179989886
dispatch:              review-2026-07-16T05-33-09-174Z-task-3-2f325479
reviewerCompletedAt:   null
reviewerSucceeded:     null
```

At 13:46:11, the controller issued a replacement review action for the same task and recorded `noProgressCount=1`:

```text
action:    loop-action-12-1784180771718
executor:  /root/review_loop12_task3
```

The replacement review completed at 13:53:14 with exit code 0 and `APPROVED_WITH_CONCERNS`. The final authoritative review artifact references action 12, so the stale action-11 executor did not overwrite the replacement result.

The replacement was issued before the action-11 state value previously shown as `evidenceResultDeadlineAt=13:49:19`. The run log records the new dispatch but does not record why the visible result-grace window was abandoned early. The controller may have attempted a finalize that was rejected or explicitly recovered the action, but that reason is not durable in the observed artifacts.

This is an observability and contract gap even though recovery succeeded. Leaving result grace early must require and persist a specific reason, such as invalid evidence, executor mismatch, capability-generation change, explicit recovery, or rejected finalize. Otherwise an operator cannot distinguish correct recovery from premature duplicate dispatch.

### Mobile Goal

```text
Goal: implement-mobile-figma-derived-workflows
Action: loop-action-93-1784179840895
Items:
  review-93-task-01-evidence-tooling -> /root/review_task01_iter93
  review-93-task-15-extract-overview -> /root/review_task15_iter93
```

The two reviewers were live in one parallel review batch. The controller refreshed task-15 while task-01 remained past due:

```text
task-01 heartbeatAt:      13:34:49 +08:00
task-01 heartbeatDueAt:   13:37:19 +08:00
task-01 leaseExpiresAt:   13:39:49 +08:00

task-15 heartbeatAt:      13:37:41 +08:00
task-15 heartbeatDueAt:   13:40:11 +08:00
```

At 13:38:13, task-01 was already about 54 seconds past `heartbeatDueAt` while task-15 had just been renewed. Task-01 then wrote authoritative review evidence at 13:38:16, before lease expiry. The evidence-result grace period correctly took precedence, so no orphan or duplicate review occurred.

The mobile observation proves a sibling-fairness defect: the controller was active and renewed one item while another live item was overdue. The Web Goal subsequently reproduced a second missed heartbeat during iteration 11 with only one task-3 reviewer, showing that general long-turn heartbeat scheduling is also affected. Multi-child fairness is therefore an important subcase, not the complete scope.

### Unclaimed sibling starvation

The mobile Goal later exposed the same scheduling weakness before child ownership was established. Iteration 95 emitted two review items at 14:02:05:

```text
action: loop-action-95-1784181725457
items:
  review-95-task-15-extract-overview
  review-95-task-22-project-api-extensions
initial heartbeatDueAt: 14:04:35 +08:00
```

Task-22 remained `issued` with no executor until it was finally claimed at 14:18:41, more than 14 minutes after issuance and more than 11 minutes after the initial lease-shaped timestamp. The same action remained authoritative and accepted the late first claim. No duplicate review was created, but the intended parallel review batch was effectively serialized and the Goal appeared partly stuck.

This shows that heartbeat scheduling must cover both owned live children and unclaimed emitted items. If an emitted item cannot be started promptly, the controller should explicitly defer it before mutation, release/reissue it with a new generation, or record why capacity prevented launch. It should not leave an unclaimed sibling silently pending for a large fraction of its absolute review deadline.

### Single-item first-claim lateness

Iteration 97 of the same mobile Goal confirmed that late first claim is not limited to sibling contention. A single task-03 review was emitted after its repair completed:

```text
action:               loop-action-97-1784183633923
item:                 review-97-task-03-lineage-core
issuedAt:             14:33:53.923 +08:00
initial heartbeatDue: 14:36:23.923 +08:00
initial lease expiry: 14:38:53.923 +08:00
first claim:          14:37:02.538 +08:00
executor:             /root/review_task03_iter97
```

The first claim arrived about 38.6 seconds after the published heartbeat target but about 111.4 seconds before lease expiry. The original action remained authoritative, the claim was accepted, and no duplicate review was emitted. This was a one-item batch, so the delay cannot be explained solely by another emitted sibling consuming the controller's attention.

The incident strengthens two requirements: controllers need an explicit first-claim deadline plan as well as renewal sweeps, and status/run-log diagnostics must record late initial claims instead of requiring timestamp comparison. A late pre-lease first claim can remain recoverable, but it should be visible and should not silently normalize controllers that fail to launch promptly.

### Repeated single-item misses under independent controllers

The issue repeated in both active Goals a few minutes later. Each action contained only one item and each was controlled by a different live Orca/Codex session.

The mobile task-15 reviewer missed a renewal target:

```text
action:               loop-action-98-1784184227332
item:                 review-98-task-15-extract-overview
previous heartbeat:   14:45:52.978 +08:00
heartbeat due:        14:48:22.978 +08:00
previous lease expiry:14:50:52.978 +08:00
next heartbeat:       14:49:36.518 +08:00
lateness:             about 73.5 seconds
```

The Web task-5 re-review missed its first-claim target:

```text
action:               loop-action-16-1784184384160
item:                 review-16-task-5
issuedAt:             14:46:24.160 +08:00
initial heartbeatDue: 14:48:54.160 +08:00
initial lease expiry: 14:51:24.160 +08:00
first claim:          14:50:05.667 +08:00
executor:             /root/review_loop16_task5
lateness:             about 71.5 seconds
```

Both actions recovered before lease expiry and neither produced a duplicate. The near-simultaneous misses show that neither sibling-only fairness nor one anomalous child explains the full problem. Controller scheduling, tool-call duration, host load, and harness return timing all remain possible contributors; durable diagnostics do not currently attribute the delay.

The same mobile action then missed its very next renewal target as well:

```text
previous heartbeat:   14:49:36.518 +08:00
heartbeat due:        14:52:06.518 +08:00
previous lease expiry:14:54:36.518 +08:00
next heartbeat:       14:53:33.246 +08:00
lateness:             about 86.7 seconds
```

It again recovered before lease expiry, this time with only about 63.3 seconds of lease margin remaining. Consecutive target misses on one live single-item review show that a successful late renewal does not imply the controller has returned to a healthy schedule. Status should retain a consecutive-late count and escalate its diagnostic before the remaining lease margin is exhausted.

Regression coverage should therefore inject delayed controller turns and host/tool scheduling jitter, not only long `wait_agent` calls. A correct controller plan must reserve enough guard time for command overhead and must report when the runtime could not execute the planned heartbeat or first claim before its target.

## Why The Current Contract Is Not Sufficient

The runtime adapter publishes the correct behavioral instructions:

- wait no more than 60 seconds;
- refresh every running child before `heartbeatDueAt`;
- persist finished child results immediately;
- re-tick after every poll.

However, these rules are currently carried as prompt/instruction text. OSpec does not own the harness event loop and cannot force a model controller to execute a batch-wide heartbeat sweep before waiting on one child. A controller can satisfy the local `wait_agent <= 60s` rule repeatedly while still starving a sibling through sequential reasoning, tool calls, result processing, or waits.

The current state also lacks an explicit durable late-heartbeat diagnostic. Operators must compare timestamps manually to discover that the target was missed.

## Risk

- A live child can be released as an orphan and requeued while it is still editing or reviewing.
- A duplicate worker can edit the same target files concurrently.
- A duplicate reviewer can overwrite or conflict with the first review artifact.
- Completed evidence may arrive just after orphan recovery, creating stale-result and provenance conflicts.
- Repeated false recovery consumes repair/review rounds and can trigger user gates such as `maxTaskRepairRounds`.
- Long multi-child batches are more vulnerable because one controller turn may process several sibling results serially.

The longer `leaseExpiresAt` margin prevented failure in the confirmed incident. That margin is a recovery buffer, not permission to ignore `heartbeatDueAt`.

## Current Workaround

Controller implementations should use a batch-wide polling loop:

1. Read every item state in the pending action.
2. Before any native wait or other potentially long tool call, heartbeat every owned live item whose due time can occur before the next controller return.
3. Wait on native children for at most the published `maxWaitMs`.
4. Immediately persist each completed child result.
5. Heartbeat all remaining live siblings, not only the child that produced an update.
6. Tick OSpec and repeat.

For a controller that cannot reliably sweep siblings, reduce the batch to one child. This is safe but should be a fallback because it reduces parallel review and implementation throughput.

Do not manually heartbeat a child whose liveness is unknown. A heartbeat is an ownership/liveness assertion and must use the exact real child id.

## Required Fix

### 1. Publish an executable heartbeat plan

Extend the machine-readable pending action/status output with controller-oriented fields such as:

```json
{
  "nextControllerReturnBy": "...",
  "heartbeatSweepRequired": true,
  "heartbeatCandidates": [
    {
      "actionItemId": "review-93-task-01-evidence-tooling",
      "executorId": "/root/review_task01_iter93",
      "heartbeatDueAt": "...",
      "latestSafeWaitMs": 30000
    }
  ]
}
```

The plan should account for clock skew and command overhead. A controller must not start a wait whose maximum return time extends beyond a sibling's guarded heartbeat time.

### 2. Add an atomic batch heartbeat command

Provide a controller command that renews multiple known live items in one mutation:

```text
ospec loop heartbeat-batch <path> --claims-file <json>
```

Every claim must include the exact action item and real executor id. The operation must validate all claims before mutation and fail transactionally on unknown, stale, mismatched, completed, or expired items. This reduces omission and per-command overhead without weakening provenance.

### 3. Record lateness explicitly

When a heartbeat or evidence arrives after `heartbeatDueAt` but before the applicable hard boundary, append a structured diagnostic containing:

- action and item id;
- executor id;
- due, arrival, lease, absolute deadline, and evidence-grace timestamps;
- lateness in milliseconds;
- whether recovery was by heartbeat or evidence;
- sibling count and sibling heartbeat state.

Expose aggregate `lateHeartbeatCount`, maximum lateness, and affected action items in `ospec loop status --json` and `tick_metrics`/runtime diagnostics.

### 4. Preserve the recovery buffer

Do not turn `heartbeatDueAt` into the hard ownership expiry. Late but provenance-valid heartbeat/evidence before `leaseExpiresAt`, absolute expiry, or evidence-result deadline should remain recoverable. The fix should improve controller scheduling and visibility, not create more false orphans.

### 5. Make controller prompts batch-oriented

Generated prompts and adopted protocol text should state the exact algorithm: heartbeat all live siblings before and after every bounded wait. Avoid wording that can be interpreted as heartbeating only the child currently being polled.

## Acceptance Criteria

1. With two or more live action items, no item passes `heartbeatDueAt` while the controller continues polling a sibling.
2. The controller refuses to begin a bounded wait that could return after another sibling's guarded heartbeat time without first sweeping that sibling.
3. Batch heartbeat validates exact executor ownership atomically and cannot renew anonymous or stale work.
4. Every emitted item is claimed within a bounded first-claim window or is explicitly deferred/reissued with a durable capacity reason.
5. An unclaimed item cannot silently remain launchable long after its initial claim/lease target under the same generation.
6. Completed siblings are persisted immediately and excluded from later sweeps.
7. Evidence-ready items transition to result grace without requiring redundant heartbeat.
8. A controller restart reconstructs the heartbeat plan from durable state without re-dispatching live work.
9. Late but pre-lease evidence remains accepted and produces a diagnostic instead of an orphan.
10. Post-lease, pre-recovery exact-provenance evidence follows one explicit tested policy; if accepted, it receives bounded result grace and a lateness diagnostic.
11. Any result from an executor superseded by recovery/reissue is rejected, even if its artifact otherwise looks valid.
12. A replacement action is not issued before a visible result-grace deadline unless a durable event records the exact reason grace was invalidated.
13. Post-lease heartbeat without authoritative evidence remains rejected and follows bounded recovery.
14. Status output makes overdue, near-due, and long-unclaimed siblings visible without manual timestamp comparison.
15. Single-child behavior and 1.8.6 absolute deadlines/result grace do not regress.

## Regression Tests

Add service and controller-contract tests for:

- two running siblings with different heartbeat times;
- two emitted siblings where only one is claimed promptly;
- an attempted first claim after the initial claim window or generation was superseded;
- one sibling completing while another approaches due;
- sequential native waits that would overrun a sibling due time;
- atomic batch heartbeat success and transactional failure;
- evidence arriving after heartbeat due but before lease expiry;
- exact-provenance evidence arriving after lease expiry but before any recovery tick;
- old evidence/result arriving after a replacement action has been issued;
- rejected finalize or capability-generation change while result grace is visible;
- explicit recovery during result grace with a durable invalidation reason;
- prevention of unexplained replacement dispatch before `evidenceResultDeadlineAt`;
- evidence arriving before due and executor result arriving during grace;
- heartbeat after lease and after absolute expiry;
- controller restart with multiple claimed children;
- late-heartbeat diagnostics and aggregate status fields;
- known/unknown harness capacity with two implementation children and several review children.

## Relevant Code Areas

- `src/services/LoopService.ts`: pending action observation, heartbeat/result lifecycle, status projection, and diagnostics.
- `src/services/TaskGraphExecutionService.ts`: mutation lease and executor provenance where shared lifecycle helpers are used.
- `src/commands/LoopCommand.ts`: single/batch heartbeat CLI and JSON status fields.
- `tests/services/loop-controller-integration.test.mjs`: multi-child timing, restart, evidence grace, and recovery.
- `docs/dev/loop-execution-model-contract.md`: batch-wide bounded wait and heartbeat contract.
- generated project execution protocols and runtime adapter action prompts.

## Release Guidance

The 1.8.8 initial-claim adjustment may ship independently because it changes only the pre-claim warning window and retains the existing hard lease. Do not mark this issue fixed from that mitigation. The complete runtime reliability change still requires focused fake-clock lifecycle tests, multi-child controller integration tests, full Loop regression, migration compatibility, generated asset synchronization, package smoke tests, and a live two-child observation proving no sibling misses its heartbeat target.
