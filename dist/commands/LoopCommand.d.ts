import { BaseCommand } from './BaseCommand';
export declare class LoopCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private run;
    private tickPlan;
    private watch;
    private parseOptionalPath;
    private parseFlagValue;
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
