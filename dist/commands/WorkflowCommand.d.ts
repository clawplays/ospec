/**
 * Workflow command.
 * Displays and manages workflow configuration.
 */
import { BaseCommand } from './BaseCommand';
export declare class WorkflowCommand extends BaseCommand {
    execute(action: string, ...args: string[]): Promise<void>;
    private showWorkflow;
    private listSupportedFlags;
    private setMode;
}
