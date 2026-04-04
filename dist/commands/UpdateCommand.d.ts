import { BaseCommand } from './BaseCommand';
export declare class UpdateCommand extends BaseCommand {
    execute(rootDir?: string): Promise<void>;
    private syncProjectTooling;
    private syncInstalledSkills;
    private shouldSyncClaudeSkills;
}
