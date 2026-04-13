import { BaseCommand } from './BaseCommand';
export declare class RunCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private start;
    private status;
    private step;
    private resume;
    private stop;
    private logs;
    private printReport;
    private parseStartArgs;
}
