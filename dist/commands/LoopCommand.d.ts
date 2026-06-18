import { BaseCommand } from './BaseCommand';
export declare class LoopCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private run;
    private tickPlan;
    /**
     * Session-bound in-process watcher (CLI-driven). Runs ticks on an interval until the loop
     * stops/pauses/finishes, a STOP sentinel appears, max ticks is reached, or the process exits
     * (closing the session). It is NOT persistent — it dies with this process.
     */
    private watch;
    private parseIntervalMs;
    private parseFlagValue;
    private parseMaxTicks;
    private resolveProjectRoot;
    private status;
    private pause;
    private resume;
    private level;
    private resolveChangePath;
}
