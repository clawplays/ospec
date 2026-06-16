import { FileService } from './FileService';
interface ClaudeHookEntry {
    type: 'command';
    command: 'node';
    args: string[];
}
interface ClaudeHookGroup {
    matcher?: string;
    hooks: ClaudeHookEntry[];
}
export interface ClaudeHookSettingsFragment {
    hooks: Record<string, ClaudeHookGroup[]>;
}
export interface ClaudeHookInstallResult {
    scriptPath: string;
    fragmentPath: string;
    readmePath: string;
    applied: boolean;
    settingsPath: string | null;
    settingsChanged: boolean;
}
export declare class ClaudeHookService {
    private readonly fileService;
    constructor(fileService: FileService);
    private getPackageRoot;
    private hookEntry;
    buildSettingsFragment(): ClaudeHookSettingsFragment;
    private isOSpecHookGroup;
    /**
     * Idempotently merges the OSpec hook groups into a settings object. Existing
     * OSpec-managed groups are replaced (not duplicated); other hooks are kept.
     */
    mergeIntoSettings(settings: unknown): {
        settings: Record<string, any>;
        changed: boolean;
    };
    private renderReadme;
    install(targetPath: string, options?: {
        apply?: boolean;
    }): Promise<ClaudeHookInstallResult>;
}
export declare function createClaudeHookService(fileService: FileService): ClaudeHookService;
export {};
