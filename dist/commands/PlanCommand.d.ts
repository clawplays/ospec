import { BaseCommand } from './BaseCommand';
interface PlanArgs {
    inputPath?: string;
    changePath?: string;
    fromBrainstorm?: string;
    output?: string;
    apply: boolean;
}
export declare class PlanCommand extends BaseCommand {
    execute(...args: string[]): Promise<void>;
    parseArgs(args: string[]): PlanArgs;
    private writePlan;
    private ensureInitialized;
    private resolveChangePath;
    private findProjectRoot;
    private readOptional;
    private renderPlanDraft;
    private summarizeSource;
    private toFileSafeId;
    private printResult;
    private printHelp;
}
export {};
