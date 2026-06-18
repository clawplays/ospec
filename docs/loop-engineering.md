# Loop Engineering in OSpec

`ospec goal` runs as a **session-bound Loop**: a verifiable, recoverable plan-act-observe cycle layered on OSpec's state machine. This guide explains the model, the safety levels, and the commands.

> `ospec change` is unchanged — it keeps the classic fast flow. Only `ospec goal` is a Loop.

## The model

OSpec is a **state-machine brain; it does not execute AI agents itself**. There are two execution models:

- **Controller-driven (default for interactive sessions):** `ospec loop run --once` computes the next step and emits an instruction; the in-session agent (Claude, Codex, …) executes it and records completion + verification evidence. The "loop" lives in the session's tick cadence, not in a long-running process.
- **CLI-driven (unattended / plain terminal):** `ospec loop watch` runs an in-process scheduler that spawns an external agent CLI (`claude -p`, `codex exec`) or deterministic commands each tick. It is session-bound — it dies when you close the session.

Harness loop primitives (`/goal`, interval `/loop`) are **capability-probed at runtime**, never assumed. When a native `/goal` exists (Claude, Codex) OSpec emits an instruction to use it; otherwise it degrades to an emulated, verify-driven loop. It never emits a non-existent `claude --goal` flag.

## Two-phase tick (recoverable)

A controller-driven `loop run --once` is two phases so it survives a closed session:

1. **Observe** the previous pending action — run the three-stage verification; clear the pending action if it passes.
2. **Plan / act** — issue the next controller instruction and record a `pendingControllerAction` (with the packet, expected evidence path, and completion command) so the next tick can resume.

## Three-stage stop condition

A loop is "done" only with evidence. The stop condition is: run the project's real test/build commands → record evidence with `ospec execute verify --status PASSED|FAILED` → confirm protocol completeness with `ospec verify`.

## Safety levels

Choose at creation (a decision gate, or `--level`). You can only raise the level manually; budget/comprehension guards may lower it automatically.

| Level | Code changes | Human involvement | Risk |
|---|---|---|---|
| **L1 — report-only** (default) | None; findings go to the triage inbox | High (you pick what to do) | Lowest |
| **L2 — assisted** | Real changes, but required-decision gates hard-block | Medium (answer decisions, review diffs) | Medium |
| **L3 — unattended** | Auto-complete/finish within an allowlist | Low (audit + guards) | Highest |

## Commands

```bash
# Create a goal as a Loop (level chosen interactively or with --level)
ospec goal billing-refactor . --level L1

# Drive / inspect the loop
ospec loop status [path]
ospec loop run [path] [--once]
ospec loop watch [path] [--interval 10m] [--max-ticks N]   # CLI-driven, session-bound
ospec loop tick-plan [path]                                # controller-driven tick contract
ospec loop level [path] <L1|L2|L3>
ospec loop pause [path] / ospec loop resume [path]

# Triage inbox (findings surface here instead of being applied silently)
ospec triage list [path]
ospec triage claim [path] --id <id> --by <name>
ospec triage promote [path] --id <id>

# Launch a worker with an explicit agent primitive
ospec execute launch [path] --task <id> --target claude --primitive goal --until "ospec verify [path]"
```

## Stopping a loop

Closing the session / Ctrl-C ends a `loop watch`. For any loop: `ospec loop pause`, write a `STOP` file in `artifacts/loop/`, or let `stopConditions` (maxIterations / expiresAt / budgets) end it automatically.

## Risk guardrails

- **Weak verification** → the three-stage stop condition requires real evidence.
- **Comprehension debt** → a comprehension guard forces a human review checkpoint every N iterations; `run-log.jsonl` is fully auditable.
- **Cognitive surrender** → L1 is read-only by default; L2 hard-blocks on required decisions; L3 needs an explicit allowlist.
