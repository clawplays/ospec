import { ProjectMode, SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
/** Test seam: forget which forward-compat warnings have been emitted. */
export declare function resetForwardCompatWarnings(): void;
export declare class ConfigManager {
    private fileService;
    /**
     * S3: `.skillrc` parse cache, keyed by absolute config path.
     *
     * `loadConfig` was the single hottest read in the CLI -- `ProjectService`
     * calls it per document definition, per skill file, per docs directory and
     * per module scan, so one `ospec status` re-read and re-normalised the same
     * ~3 KB file 26 times. The cache is per-process and per-instance only;
     * nothing is written to disk, so there is no cache file to go stale,
     * corrupt, or disagree with another process.
     *
     * Invalidation has two independent layers, and either one alone is enough:
     *  1. every `loadConfig` reads the file and only reuses an entry whose
     *     content hashes identically -- this covers writers we never see,
     *     including `LegacyPluginMigrationService`, which writes `.skillrc`
     *     straight through `FileService` during `ospec update`, and it cannot
     *     be defeated by restoring an mtime or matching a byte count;
     *  2. `saveConfig` explicitly drops the entry it just overwrote, and
     *     `invalidate`/`invalidateAll` are public for any writer that bypasses
     *     `saveConfig`.
     *
     * FIX-4: both layers key on the BYTES, which is complete for the one thing
     * this remembers -- the parse -- and was not complete for everything the
     * hit path was skipping. `assertProjectConfigUsable` also reads the
     * filesystem, so it is now re-run on a hit rather than being inside the
     * part that gets skipped. Anything added to `loadConfig` later belongs on
     * the same side of that line unless it is provably a function of the bytes
     * alone.
     */
    private skillrcCache;
    constructor(fileService: FileService);
    /** Drops the memoised `.skillrc` parse for one project root. */
    invalidate(rootDir: string): void;
    /** Drops every memoised `.skillrc` parse. */
    invalidateAll(): void;
    private getConfigCacheKey;
    /**
     * FIX-G1: this is the `.skillrc` read behind `ProjectService` and every
     * command, and it used to be the *only* one with no damage gate --
     * `normalizeConfig` just ran `normalizeProjectLayout(config.projectLayout)
     * || 'classic'` and a damaged or incomplete layout field became "classic",
     * silently, on a physically nested project. The two index builders each
     * grew their own copy of the guard (F23/F29) while this one kept guessing,
     * so `ospec index build` wrote 7 `for-ai/*` documents into the classic root
     * through `ProjectService.rebuildIndex` *before* `IndexBuilder.write` ever
     * reached the guard, and `ospec update` wrote 16 root-level paths and still
     * exited 0.
     *
     * The gate now lives at the parse boundary that every caller shares. A
     * damaged config throws `DamagedConfigError`, which is deliberately a
     * DIFFERENT error from `ProjectNotInitializedError`: "there is no project
     * here" is a routine, degradable condition and "this project's config is
     * damaged" is not, and collapsing the two is exactly how the damage kept
     * getting swallowed. Callers that want to degrade on an absent project use
     * `loadConfigOrNull`.
     */
    loadConfig(rootDir: string): Promise<SkillrcConfig>;
    /**
     * FIX-G1: the replacement for `loadConfig(rootDir).catch(() => null)`.
     *
     * That idiom was the whole bug class: 25 sites turned *any* config failure
     * into `null`, `getProjectLayout(null)` returned `'classic'`, and the
     * caller carried on writing into the project root. Degrading is right for
     * "this directory is not an OSpec project" and wrong for "this project's
     * `.skillrc` is damaged", so this helper degrades on exactly the first and
     * propagates the second.
     */
    loadConfigOrNull(rootDir: string): Promise<SkillrcConfig | null>;
    saveConfig(rootDir: string, config: SkillrcConfig): Promise<void>;
    getMode(rootDir: string): Promise<ProjectMode>;
    isInitialized(rootDir: string): Promise<boolean>;
    createDefaultConfig(mode?: ProjectMode): Promise<SkillrcConfig>;
    private normalizeCliVersion;
    private normalizeConfig;
    private getPackageVersion;
}
export declare function createConfigManager(fileService: FileService): ConfigManager;
