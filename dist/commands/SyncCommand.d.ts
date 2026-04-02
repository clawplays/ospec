import { BaseCommand } from './BaseCommand';
export interface SyncCommandOptions {
    dryRun?: boolean;
    staged?: boolean;
    force?: boolean;
    watch?: boolean;
    installHook?: boolean;
    uninstallHook?: boolean;
    stageUpdated?: boolean;
    allowNoActiveChange?: boolean;
    rebuildIndex?: boolean;
    updateProjectKnowledge?: boolean;
    updateSkillFiles?: boolean;
    filePatterns?: string[] | string;
    debounceMs?: number;
}
export declare class SyncCommand extends BaseCommand {
    execute(projectPath?: string, options?: SyncCommandOptions): Promise<void>;
    private normalizeOptions;
    private resolveTarget;
    private resolveChangePath;
    private installHook;
    private uninstallHook;
    private watch;
    private stageFiles;
    private buildManagedHookScript;
}
