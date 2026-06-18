# Loop Engineering — Execution-Model Contract (1.3.0)

> Internal design contract for the `ospec goal` Loop system. Stage A/B/C interfaces are derived from this. Source of the full plan: `.tmp/loop-engineering-upgrade-plan.md` (planning only).

This is the **single source of truth** for the three execution contracts. Implementations MUST conform; reviews check against this.

## Contract 1 — ospec is a state-machine brain; it does NOT execute AI agents

A CLI process cannot invoke a harness `/goal` slash primitive. The loop therefore has exactly two execution models, kept distinct:

| | A. controller-driven | B. cli-driven |
|---|---|---|
| who acts | the in-session AI controller (Claude/Codex/etc.) | the `ospec loop watch` process |
| ospec role | produce **instructions** (`requiresControllerAction: true`); controller executes and writes back evidence | spawn external agent CLI or deterministic command |
| cadence | `ControllerTickPlan` (NOT a runtime scheduler — no `start/stop`) | `WatchScheduler` (the only `RuntimeScheduler`) |

`ospec loop run --once` NEVER executes the agent. Controller-driven Act only emits an instruction and records a pending action.

## Contract 2 — native `/goal` adapter produces instructions; external command forms are exact

- Controller-driven native `/goal`: ospec emits "use your `/goal` on this packet, until=…". The controller is the executor.
- cli-driven external commands: `claude -p "<prompt>"` (print mode; NOT `--goal`) / `codex exec "<prompt>"` (`/goal` is an interactive slash; non-interactive is `exec`).
- Harness loop primitives are **capability-probed at runtime**, never hardcoded (`/loop`/`CronCreate` are not assumed to exist).

## Contract 3 — stop condition is three-stage, via a non-exiting service

1. Run the project's real test/build command(s) → exit code.
2. Record evidence: `ospec execute verify --status PASSED|FAILED`.
3. Protocol confirm: `ospec verify` (goal profile checks completeness + that `verification-evidence.json` is latest PASSED).

`LoopService` consumes a `VerificationService` that returns a structured result and NEVER calls `process.exit`. `VerifyCommand` becomes a thin wrapper that owns the exit code.

## Contract 4 — paths via ProjectLayout; safety levels are real guards

- All loop/triage paths via `resolveManagedPath(root, '<rel>', layout)` — never hardcode `.ospec/...` (classic/nested layouts exist).
- L1 read-only / L2 required-decision-block / L3 allowlist+diff are enforced (tools/permission/diff checks), not prompt text.

## Locked interface signatures (Stage A implements)

```ts
// Agent primitive dimension
type TaskAgentPrimitive = 'subagent' | 'goal' | 'loop';
function normalizeAgentPrimitive(v: unknown): TaskAgentPrimitive; // default 'subagent'

// Capability probe (Stage A: launch-plan snapshot; persists to loop.json only in Stage B / if it exists)
type NativeLoopCapability = 'supported' | 'unknown' | 'unsupported';
interface HarnessCapability {
  nativeLoopCapability: NativeLoopCapability;
  probeSource: string;
  fallbackMode: 'controller-self-loop' | 'cli-driven' | 'emulated';
  warnings: string[];
}
interface CapabilityProbeService {
  resolveHarnessCapability(input: { target: string; primitive: TaskAgentPrimitive }): HarnessCapability;
}

// Verification (non-exiting; VerifyCommand wraps this)
interface VerificationOutcome {
  passed: boolean;
  checks: Array<{ name: string; status: 'pass' | 'warn' | 'fail'; message: string }>;
  summary: string;
}
interface VerificationService {
  verify(changePath: string): Promise<VerificationOutcome>;
}

// Three-stage stop condition (Stage A returns the plan; Stage B drives it)
interface ThreeStageStopCondition {
  testCommands: string[];          // stage 1
  recordEvidence: boolean;         // stage 2 -> ospec execute verify --status
  protocolVerify: boolean;         // stage 3 -> VerificationService.verify
}

// Schedulers — two DIFFERENT interfaces, do not merge
interface RuntimeScheduler { start(): void; stop(): void; status(): unknown; onTick(cb: () => Promise<void>): void; } // WatchScheduler only
interface ControllerTickPlan { /* produces instruction/contract, NO start/stop */ }

// pending-action (controller-driven two-phase tick; recoverable after session loss)
interface PendingControllerAction {
  actionId: string; kind: string; status: 'awaiting-evidence' | 'done';
  issuedAt: string; attempt: number; expiresAt: string | null;
  packetPath: string; launchPlanPath: string; instructionPath: string;
  completionCommand: string; expectedEvidencePath: string;
}
```

## Backward-compat invariants

- `execute launch` default `primitive='subagent'` ⇒ identical to 1.2.3.
- `change`/`new` paths unchanged (no loop artifacts).
- `ospec goal` creating a loop is the **intended 1.3.0 upgrade** (not "off by default"), affecting only the goal path.
