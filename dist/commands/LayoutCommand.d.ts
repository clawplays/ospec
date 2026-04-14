import { BaseCommand } from './BaseCommand';
export declare class LayoutCommand extends BaseCommand {
    execute(action?: string, ...args: string[]): Promise<void>;
    private parseMigrateArgs;
    private migrateToNested;
    private collectClassicMovePlan;
    private collectNestedSkillFiles;
    private isPlaceholderDirectoryTree;
}
