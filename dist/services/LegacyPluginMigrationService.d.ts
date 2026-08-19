import { SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
export type LegacyPluginRemovalKind = 'plugin-gates-section' | 'entry-sequence-mention' | 'skillrc-plugins-block' | 'change-plugin-steps';
export type LegacyPluginRemoval = {
    /** Project-relative, forward-slashed path of the file that was rewritten. */
    path: string;
    kind: LegacyPluginRemovalKind;
    /** Human-readable description of exactly what left the file. */
    detail: string;
    /** SHA-256 of the removed text (or of the removed JSON, canonically stringified). */
    removedContentHash: string;
    /**
     * Verbatim copy of the removed `.skillrc` `plugins` block. Present only for
     * `skillrc-plugins-block`: that block carries user-entered values (Stitch
     * `project_id`/`project_url`, Checkpoint `base_url`, auth commands) that
     * point at the `.ospec/plugins/` data we refuse to delete. Dropping it
     * without a recoverable copy would strand that data.
     */
    removedConfig?: unknown;
};
export type LegacyPluginMigrationResult = {
    performed: boolean;
    removals: LegacyPluginRemoval[];
    /** Project-relative paths this migration rewrote, in stable order. */
    rewrittenPaths: string[];
};
export type LegacyPluginMigrationOptions = {
    /**
     * Opt-in. Rewrites the user's own change documents (`tasks.md` /
     * `verification.md` frontmatter) to drop plugin-contributed
     * `optional_steps`. Off by default: those documents are the historical
     * record of what a change actually required, and the stale entries are inert
     * -- verification reports them as satisfied because nothing activates them
     * anymore.
     */
    cleanPluginSteps?: boolean;
};
export declare const PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH = ".ospec/plugin-migration.json";
export declare class LegacyPluginMigrationService {
    private readonly fileService;
    constructor(fileService: FileService);
    /**
     * Pure text surgery on a generated SKILL.md body. Returns the rewritten
     * content plus one removal record per edit, or null when nothing matched.
     *
     * Section removal is heading-scoped: it drops the `## <plugin gate>` line and
     * everything under it up to the next heading of the same or higher level, so
     * a section that is not last in the file does not swallow its successors.
     */
    stripPluginGuidanceFromSkillMarkdown(content: string): {
        content: string;
        removals: Array<{
            kind: LegacyPluginRemovalKind;
            detail: string;
            removedContentHash: string;
        }>;
    };
    /**
     * Removes the project's plugin-era guidance from the managed root SKILL.md.
     * Called from the protocol-guidance sync so `ospec update`, `ospec docs
     * sync-protocol`, `ospec docs generate`, and `ospec layout migrate` all
     * repair it -- and so the index rebuild that follows the sync re-routes
     * agents away from the removed heading in the same run.
     */
    migrateProjectSkillGuidance(rootDir: string, config: SkillrcConfig | null): Promise<LegacyPluginMigrationResult>;
    /**
     * Removes a dead `plugins` block from `.skillrc`, keeping a verbatim copy in
     * the returned removal record.
     *
     * `ConfigManager.normalizeConfig` already strips the key, but only on the way
     * out of `loadConfig` -- and `ospec update` reaches `saveConfig` only when it
     * has some OTHER reason to write (a CLI version bump, an archive layout fix).
     * On an already-current project it never writes, so the block survives every
     * update forever. This reads the raw file and rewrites it unconditionally.
     */
    migrateSkillrcPlugins(rootDir: string): Promise<LegacyPluginMigrationResult>;
    /**
     * Reads the `plugins` block straight off disk without going through
     * `ConfigManager`, which normalizes it away. Returns `undefined` when the
     * file is absent, unreadable, or carries no `plugins` key.
     *
     * `ospec update` calls this before anything else so that a legacy-project
     * repair -- which round-trips `.skillrc` through `ConfigManager.saveConfig`
     * and drops the block on the way -- cannot make the removal unrecordable.
     */
    readRawSkillrcPlugins(rootDir: string): Promise<unknown | undefined>;
    /** The audit record for one removed `.skillrc` `plugins` block. */
    describeRemovedSkillrcPlugins(removedConfig: unknown): LegacyPluginRemoval;
    private readRawSkillrc;
    /**
     * Opt-in (`ospec update --clean-plugin-steps`). Drops plugin-contributed
     * steps from the `optional_steps` frontmatter of every active and queued
     * change's `tasks.md` and `verification.md`.
     */
    migrateChangePluginSteps(rootDir: string, config: SkillrcConfig | null, options?: {
        dryRun?: boolean;
    }): Promise<LegacyPluginMigrationResult>;
    /**
     * Records what the migration removed. Written only when something was
     * actually removed, so a repeat `ospec update` on an already-migrated project
     * leaves the file byte-identical instead of churning its timestamp.
     */
    writeProvenance(rootDir: string, input: {
        cliVersion: string | null;
        source: string;
        removals: LegacyPluginRemoval[];
    }): Promise<string | null>;
    /**
     * Earlier runs stay in the file: a project can be migrated in two steps
     * (automatic first, then `--clean-plugin-steps`), and the second run must not
     * erase the audit trail of the first.
     */
    private readPreviousRemovals;
    private stripPluginStepsFromChangeDocument;
    /**
     * Edits the plugin steps out of the frontmatter TEXT rather than round-tripping
     * it through the YAML loader.
     *
     * A load/dump cycle rewrites every other key on the way back out -- notably
     * `created: 2026-08-15`, which js-yaml reads as a Date and re-emits as a full
     * ISO timestamp. These are the user's own change records; the opt-in cleanup
     * must not restyle the rest of the file to reach one list.
     *
     * Handles both shapes the field appears in: the flow list the CLI writes
     * (`optional_steps: ["a", "b"]`) and the block list a hand edit produces.
     */
    private stripPluginStepsFromFrontmatterText;
    /** `["a", "b"]` -> `['a', 'b']`, or null when the text is not a plain flow list. */
    private parseFlowList;
    /**
     * Removes `#### <heading>` and its body up to the next heading at the same or
     * a higher level. Returns null when the heading is absent.
     */
    private removeMarkdownSection;
}
export declare function createLegacyPluginMigrationService(fileService: FileService): LegacyPluginMigrationService;
