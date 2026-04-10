import { BaseCommand } from './BaseCommand';
export declare class QueueCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private add;
    private showStatus;
    private activate;
    private activateNext;
    private parseAddArgs;
}