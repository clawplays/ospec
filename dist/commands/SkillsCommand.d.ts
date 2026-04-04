import { BaseCommand } from './BaseCommand';
export declare class SkillsCommand extends BaseCommand {
    execute(action?: string, projectPath?: string): Promise<void>;
}