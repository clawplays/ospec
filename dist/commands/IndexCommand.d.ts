import { BaseCommand } from './BaseCommand';
export declare class IndexCommand extends BaseCommand {
    execute(action?: string, projectPath?: string): Promise<void>;
}