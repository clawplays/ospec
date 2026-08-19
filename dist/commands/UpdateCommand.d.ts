import { BaseCommand } from './BaseCommand';
export type UpdateCommandOptions = {
    /**
     * Opt-in. Also rewrite the project's own change documents to drop
     * plugin-contributed `optional_steps`. See the comment on
     * `cleanLegacyPluginResidue` for why this is not automatic.
     */
    cleanPluginSteps?: boolean;
};
export declare class UpdateCommand extends BaseCommand {
    execute(rootDir?: string, options?: UpdateCommandOptions): Promise<void>;
    /**
     * Repairs the plugin-era residue that OSpec 2.0 can no longer act on.
     *
     * Automatic, because both targets are OSpec-managed artifacts that are now
     * unsatisfiable by construction:
     *  - the `## Plugin Gates` section (removed by the protocol sync) actively
     *    tells the agent to block on an approval no command can produce;
     *  - a `.skillrc` `plugins` block is config for a subsystem that no longer
     *    exists, and `ConfigManager` already erases it on any write -- just
     *    silently, and only when some unrelated reason forces a save.
     * Neither is user-authored, and the `.skillrc` block is archived verbatim
     * into the removal record, so nothing becomes unrecoverable.
     *
     * Opt-in for change documents, because those are the user's own record of
     * what a change required. The stale `optional_steps` entries there are
     * inert -- nothing activates them anymore and verification reports them as
     * satisfied -- so rewriting history by default would be a bigger edit than
     * the problem.
     *
     * `.ospec/plugins/` is never read, moved, or deleted here. It holds
     * irreplaceable user data (routes.yaml, flows.yaml, project.json, auth
     * storage-state) that no reinstall can regenerate.
     */
    private cleanLegacyPluginResidue;
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
    private syncInstalledSkills;
    private shouldSyncClaudeSkills;
}
