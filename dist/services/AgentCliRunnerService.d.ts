/**
 * @deprecated Agent CLI processes were removed from OSpec execution. The
 * current model harness must dispatch its own native subagents.
 */
export type AgentCliTarget = 'claude' | 'codex' | 'gpt';
export interface AgentCliCommand {
    bin: string;
    args: string[];
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
export interface AgentCliAsyncRunResult extends AgentCliRunResult {
    durationMs: number;
    timedOut: boolean;
    outputTruncated: boolean;
}
export interface AgentCliRunOptions {
    target: AgentCliTarget;
    prompt: string;
    dryRun?: boolean;
    timeoutMs?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    maxOutputBytes?: number;
}
/** @deprecated Use the runtime adapter nativeSubagent contract. */
export declare class AgentCliRunnerService {
    buildCommand(_target: AgentCliTarget, _prompt: string): AgentCliCommand;
    isAvailable(_bin: string): boolean;
    run(_options: AgentCliRunOptions): AgentCliRunResult;
    runAsync(_options: AgentCliRunOptions): Promise<AgentCliAsyncRunResult>;
}
/** @deprecated Use RuntimeExecutionAdapterService. */
export declare function createAgentCliRunnerService(): AgentCliRunnerService;
