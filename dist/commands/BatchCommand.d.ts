import { BaseCommand } from './BaseCommand';
export declare class BatchCommand extends BaseCommand {
    execute(action: string, projectPath?: string): Promise<void>;
}
