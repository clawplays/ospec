import { BaseCommand } from './BaseCommand';
export declare class UpdateCommand extends BaseCommand {
    private getPluginRegistryService;
    execute(rootDir?: string): Promise<void>;
    private writeUpdateProvenance;
    private repairLegacyProjectForUpdate;
    private detectLegacyProjectMarkers;
    private syncProjectTooling;
    private migrateLegacyKnowledgeLayout;
    private syncProjectCliVersionMetadata;
    private readCurrentCliVersion;
    private detectProjectCliVersion;
    private isLegacyKnowledgeMigrationEligible;
    private isCliVersionAtLeast;
    private mergeLegacyKnowledgeDirectory;
    private refreshMigratedKnowledgeLinks;
    private rewriteFileIfChanged;
    private ensureEnabledPluginPackageAvailable;
    private maybeUpgradeEnabledPluginPackage;
    private refreshExternalPluginInstalledMetadata;
    private syncInstalledSkills;
    private shouldSyncClaudeSkills;
}
