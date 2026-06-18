import { BaseCommand } from './BaseCommand';
export declare class TriageCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private list;
    private claim;
    private promote;
    private parseArgs;
    private resolveProject;
}
