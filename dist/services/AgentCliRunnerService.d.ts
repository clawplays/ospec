/**
 * Builds and (optionally) runs external agent-CLI commands for the cli-driven execution model
 * (Execution-Model Contract 1/2). Intentionally separate from `RunService` (a QueueRun manager).
 *
 * Command forms are exact and verified by tests:
 *   - claude -> `claude -p "<prompt>"`   (print mode; NOT `--goal`, which does not exist)
 *   - codex  -> `codex exec "<prompt>"`  (`/goal` is an interactive slash; non-interactive is `exec`)
 *
 * Default behavior is dry-run: the command is returned/printed, never executed, unless `run: true`.
 */
export type AgentCliTarget = 'claude' | 'codex' | 'gpt';
export interface AgentCliCommand {
    /** Resolved binary name. */
    bin: string;
    /** Argument vector (excluding the binary). */
    args: string[];
    /** Human-readable command string for logs / dry-run output. */
    display: string;
}
export interface AgentCliRunResult {
    command: AgentCliCommand;
    dryRun: boolean;
    executed: boolean;
    available: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
export declare class AgentCliRunnerService {
    /**
     * Build the exact external command for a target. Pure; never emits `claude --goal`.
     */
    buildCommand(target: AgentCliTarget, prompt: string): AgentCliCommand;
    /** Detect whether a CLI binary is on PATH (cross-platform). */
    isAvailable(bin: string): boolean;
    /**
     * Resolve the command for a target+prompt and, unless dry-run, execute it.
     * Detection failures and dry-run both return without throwing.
     */
    run(options: {
        target: AgentCliTarget;
        prompt: string;
        dryRun?: boolean;
        timeoutMs?: number;
        cwd?: string;
    }): AgentCliRunResult;
    private quote;
}
export declare function createAgentCliRunnerService(): AgentCliRunnerService;
