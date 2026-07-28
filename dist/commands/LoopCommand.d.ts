import { BaseCommand } from './BaseCommand';
export declare class LoopCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private run;
    private poll;
    /** Reads a token-lean task graph summary so the controller does not need a separate `ospec execute status` call per tick. */
    private readGraphSummary;
    private compactTickResult;
    private tickPlan;
    private watch;
    private parseOptionalPath;
    private parseFlagValue;
    private resolveProjectRoot;
    private status;
    private pause;
    private resume;
    private configure;
    private allowlist;
    private printAllowlistDiff;
    private heartbeat;
    private recordResult;
    private recover;
    private resolveChangePath;
}
