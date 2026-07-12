import { BaseCommand } from './BaseCommand';
export declare class LoopCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private run;
    private tickPlan;
    /**
     * Session-bound in-process watcher (CLI-driven). Executes emitted fresh-context agent actions
     * in parallel, then immediately observes their durable evidence. It waits only when no action
     * is ready, and ends when the loop
     * stops/pauses/finishes, a STOP sentinel appears, max ticks is reached, or the process exits
     * (closing the session). It is NOT persistent — it dies with this process.
     */
    private watch;
    private parseIntervalMs;
    private parseOptionalPath;
    private parseFlagValue;
    private parseMaxTicks;
    private toAgentCliTarget;
    private parseOptionalPositiveNumber;
    private getActionTimeoutMs;
    private resolveProjectRoot;
    private status;
    private pause;
    private resume;
    private level;
    private configure;
    private heartbeat;
    private recordResult;
    private recover;
    private resolveChangePath;
}
