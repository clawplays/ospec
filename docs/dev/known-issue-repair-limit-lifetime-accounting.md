# Known Issue: Repair Limits Expose Lifetime Counts as If They Were New Work

## Status

- State: fixed in 1.8.9
- First confirmed: 2026-07-16
- Affected release: Goals created before the 1.8.4 repair limit and resumed on 1.8.4 through 1.8.8
- Severity: medium workflow delay and authorization confusion; the fail-closed gate is working
- Component: task-review repair accounting, migration, status text, and user authorization

## Summary

Before 1.8.9, `maxTaskRepairRounds` was an unconditional lifetime ceiling for every task-review-triggered retry recorded in the Goal. It was not a count of repairs to run after the user granted permission. This distinction was not visible when an older Goal already contained more repair records than the configured ceiling introduced in 1.8.4.

An upgraded Goal can therefore stop with a message such as:

```text
task-01-evidence-tooling=7/2
```

If the user wants to authorize two additional repair rounds, the controller must raise the lifetime ceiling from 2 to 9. The number 9 looks like permission to run nine more rounds, even though only `9 - 7 = 2` rounds are newly available. The gate is fail-closed and preserves history correctly, but the command and diagnostics force the user or model controller to perform implicit lifetime arithmetic.

The same problem occurred after configuration changes, migration from an unbounded release, import of durable retry history, or a lower ceiling being restored from project policy.

## 1.8.9 resolution

OSpec still preserves and counts every valid historical repair record. In default continuous mode, however, the configured value is a convergence threshold rather than an unconditional stop. At or above the threshold, OSpec compares the current stable structured finding IDs with the findings captured by the prior repair:

- changed IDs mean the review is converging and one more repair may run;
- the same IDs mean no progress and stop before another repair;
- changing only finding wording does not count as progress;
- an old record without repair context uses the latest completed worker summary when it contains finding IDs;
- if legacy evidence cannot be compared, one compatibility repair captures authoritative context for the next decision.

This resolves the confirmed `7/2` incident without deleting history, resetting counters, or asking the user to calculate an absolute ceiling of 9. `--continue-while-progressing false` preserves the original lifetime-ceiling behavior for strict compatibility. The same convergence rule applies independently to grouped final-review repair.

The broader task-scoped incremental authorization design below remains useful as historical design work, but it is no longer required to unblock a Goal whose findings are demonstrably changing.

### 1.8.11 refinement

The 1.8.9 ID-only rule was too strict when a reviewer correctly kept one stable ID while a repair removed the broad failure and left a narrower edge case. OSpec 1.8.11 preserves stable IDs and requires two independent progress signals: the structured finding fingerprint changed, and the code snapshot inside the prior authorized repair scope changed. Either signal alone still stops. See [Known Issue: Stable Finding IDs Hide Real Partial Repair Progress](known-issue-same-id-repair-progress-misclassification.md).

## Confirmed Incident

The issue was observed while resuming this 1.8.6 Goal:

```text
Goal: implement-mobile-figma-derived-workflows
Path: D:\OPMProjs\ompv4\.ospec\changes\active\implement-mobile-figma-derived-workflows
Task: task-01-evidence-tooling
Initial gate: 7 historical task-review repair rounds / configured ceiling 2
Unresolved findings: F-001 and F-002
```

The controller correctly refused to raise the limit automatically and requested explicit user authorization. To authorize at most two more repair rounds, the user had to approve:

```text
ospec loop configure <change> --max-task-repair-rounds 9
```

After the change, exactly two additional task-review retries were recorded. The durable history now contains nine matching retry records:

```text
7 legacy records inferred from the compatibility summary prefix
2 current records with trigger=task_review
```

The task then passed independent review with `APPROVED`. Raising the ceiling to 9 did not require or schedule nine new rounds; it made two new rounds eligible because seven had already been consumed.

This outcome confirms that lifetime accounting and the fail-closed gate behave as implemented. The defect is the migration and authorization interface around that accounting, not evidence that the repair counter should be reset.

## 1.8.8 and earlier implementation

`TaskGraphExecutionService.countTaskReviewRepairRounds()` scans every durable JSON record in `artifacts/agents/retries/` for the task. It counts records with `trigger=task_review` and legacy records whose summary starts with `Loop retry after task review `.

`LoopService` then applies this eligibility test:

```text
historicalRepairCount < config.efficiency.maxTaskRepairRounds
```

The configured value is therefore an absolute lifetime ceiling. When all tasks needing repair are ineligible, the Loop reports `<used>/<ceiling>` and requires explicit authorization before changing the global ceiling.

The compatibility inference is important: dropping the seven legacy records would erase safety history and could silently permit unbounded repair. The fix must preserve those records and their meaning.

## User Impact

- A user can reasonably interpret `raise to 9` as nine additional repair attempts and decline a safe two-round continuation.
- A model controller can choose the wrong absolute ceiling when several tasks have different historical counts.
- The global ceiling can unintentionally authorize additional repairs for other tasks, not only the task and findings the user inspected.
- Repeatedly raising the ceiling obscures how many new rounds were granted in each decision and why.
- A resumed Goal may appear to regress immediately after upgrade because its historical count already exceeds the new default.
- Operators cannot distinguish old unbounded history from repairs consumed under the current authorization without inspecting retry files.

The current behavior does not intrinsically make the Goal slower. A ceiling is a maximum, not a target. The slowdown risk comes from granting a broad ceiling that permits unrelated or repeated low-value repairs without a scoped authorization record.

## Historical workaround before 1.8.9

Before raising the ceiling:

1. Inspect the unresolved findings and the exact task.
2. Count the task's durable repair history.
3. Decide the maximum number of additional rounds, normally one or two.
4. Set the absolute ceiling to `historical count + additional rounds`.
5. State explicitly that the new number is a lifetime ceiling, not work that must be performed.
6. Observe the next repair and independent re-review; do not keep raising the ceiling when the same finding repeats without new evidence.

For the confirmed incident, `7 + 2 = 9` was the correct bounded workaround.

Do not delete, rename, or edit retry records to reduce the count. Do not reset the count merely because OSpec was upgraded. Both approaches would weaken the safety gate and break the audit trail.

## Original proposed fix (superseded by convergence thresholds)

### 1. Report explicit accounting fields

Machine-readable status and gate output should expose at least:

```json
{
  "taskId": "task-01-evidence-tooling",
  "historicalRoundsUsed": 7,
  "configuredLifetimeCeiling": 2,
  "remainingRounds": 0,
  "ceilingBelowHistory": true,
  "minimumCeilingForOneMoreRound": 8
}
```

Human-facing output should say that history exceeds the current ceiling and should avoid presenting `7/2` without labels.

### 2. Add scoped incremental authorization

Provide a command or equivalent controller mutation that expresses user intent directly, for example:

```text
ospec loop authorize-repair <change> --task task-01-evidence-tooling --additional-rounds 2 --reason "Resolve reviewed F-001 and F-002"
```

The operation should create a durable authorization record containing:

- task id;
- baseline historical count;
- number of additional rounds;
- resulting lifetime ceiling for that task;
- user-visible reason;
- unresolved finding ids and a hash of the reviewed findings artifact;
- authorizing controller/session provenance and timestamp;
- consumed and remaining rounds.

Authorization should be task-scoped by default. Raising a global ceiling must remain available for compatibility and explicit policy changes, but should not be the primary recovery instruction for one blocked task.

### 3. Bind grants to the reviewed problem

An incremental grant must not become reusable permission for unrelated future findings. If the task-review finding set or authoritative review generation changes materially, the Loop should require a fresh decision or explicitly show that the existing grant still covers it.

Finding identity should use structured finding ids and artifact provenance, not free-text matching alone.

### 4. Preserve lifetime history and old configuration

Migration must continue counting valid legacy retry records. Existing `maxTaskRepairRounds` values and CLI calls must retain their absolute-ceiling semantics. New per-task grants can be layered over the global safety policy, but must never lower the effective audit count or make corrupt history fail open.

For an old Goal whose used count already exceeds the configured ceiling, status should enter a named state such as `ceiling_below_history`; this is not negative remaining capacity and not evidence corruption.

### 5. Improve controller instructions

Generated recovery instructions should include the arithmetic and scope:

```text
This task has 7 historical repair rounds. The current lifetime ceiling is 2.
Authorize 2 additional rounds to create a task-scoped ceiling of 9.
This permits at most 2 new rounds; it does not schedule 9 rounds.
```

When several tasks are blocked, report and authorize each independently. Do not derive one global maximum from the task with the largest history and silently apply it to every task.

## Acceptance Criteria

1. Resuming a pre-1.8.4 Goal with seven legacy repair records and a default ceiling of two preserves all seven records.
2. Status clearly distinguishes historical rounds, lifetime ceiling, newly authorized rounds, and remaining rounds.
3. Authorizing two additional rounds from a baseline of seven permits at most rounds eight and nine, not nine new rounds.
4. A task-scoped grant does not increase repair eligibility for another task.
5. A grant is durably linked to the reviewed finding generation and cannot be silently reused for unrelated findings.
6. The Loop still stops before round ten in the confirmed `7 + 2` scenario unless a new explicit authorization is recorded.
7. Approval after the first newly authorized round leaves the second round unused and does not dispatch it merely because capacity remains.
8. Legacy `--max-task-repair-rounds 9` continues to mean an absolute lifetime ceiling of nine.
9. Corrupt or ambiguous retry history still fails closed.
10. Downgrading, restarting, or reloading the controller cannot duplicate a grant or reset its consumed count.
11. Human and JSON diagnostics explain `ceiling_below_history` without negative remaining values.
12. Existing two-round defaults for newly created Goals do not regress.

## Regression Tests

Add service and controller tests for:

- seven legacy summary-inferred retry records loaded under a ceiling of two;
- explicit JSON accounting for used, ceiling, remaining, and ceiling-below-history;
- a two-round incremental grant producing effective rounds eight and nine;
- approval after only one authorized round;
- denial of a tenth round after a `7 + 2` grant is consumed;
- two tasks with different histories and only one task-scoped grant;
- a changed finding artifact invalidating or pausing an old grant;
- controller restart between grant creation and consumption;
- concurrent attempts to consume the last granted round;
- corrupt, duplicate, or forged authorization records;
- compatibility of the existing absolute-ceiling CLI flag;
- migration from Goals created before trigger metadata was added to retry records.

## Relevant Code Areas

- `src/services/LoopService.ts`: repair eligibility, gate diagnostics, configuration, and action issuance.
- `src/services/TaskGraphExecutionService.ts`: durable retry counting and retry transaction creation.
- `src/commands/LoopCommand.ts`: configuration and future incremental authorization CLI.
- `tests/services/loop-controller-integration.test.mjs`: gate, migration, scoped authorization, and restart behavior.
- `tests/services/task-graph-execution-service-characterization.test.mjs`: legacy history counting and fail-closed parsing.
- generated execution protocols and recovery prompts that explain repair authorization.

## Release Guidance

Treat scoped authorization as a workflow contract change requiring a new release. Keep the current fail-closed lifetime counter until the replacement has durable provenance, migration coverage, concurrency protection, and backward-compatible CLI behavior. Documentation-only wording improvements may ship earlier, but must not claim that task-scoped grants exist before the runtime implements them.
