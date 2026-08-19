import { SkillIndex } from '../core/types';
import { SkillParser } from './SkillParser';
export interface IndexWriteResult {
    index: SkillIndex;
    managedPaths: string[];
    removedPaths: string[];
}
/**
 * FIX-G1: the `.skillrc` damage policy moved to `src/utils/ProjectLayout.ts`.
 * It was defined here, which meant only the two index builders enforced it
 * while `ConfigManager.loadConfig` -- the read `ProjectService` and every
 * command goes through -- kept guessing; a util both can import is the only
 * place that closes the class instead of the instances. Re-exported so the
 * names this module has always published stay published.
 *
 * `src/tools/build-index.ts` still carries its own copy (it is the standalone
 * dependency-free pre-commit bundle); the copies are asserted byte-identical
 * by `tests/services/p0-10-11-index-builder-cli-path.test.mjs`.
 */
export { createDamagedConfigError, createContradictoryLayoutError, describeAbsentProjectLayout, describeNonObjectConfig, findNestedManagedMarker, isDamagedConfigError, } from '../utils/ProjectLayout';
export type { DamagedConfigError } from '../utils/ProjectLayout';
export declare class IndexBuilder {
    private skillParser;
    /**
     * One immutable-input cache per run: archived changes never mutate after
     * they are written and markdown documents change rarely, so fingerprinting
     * them turns every rebuild and status check into O(changed inputs).
     * Deleting SKILL.index.cache.json forces a full rescan.
     */
    private runCache;
    /**
     * Damage reported by this run, deduplicated. A rebuild degrades around a
     * damaged input rather than failing, so the damage has to be said out loud
     * or it is indistinguishable from a clean build.
     */
    private buildWarnings;
    /**
     * Archives whose on-disk evidence could not be read this run. They keep the
     * index entry they already had, and are deliberately left without a
     * fingerprint so the next run re-reads them.
     */
    private preservedArchives;
    constructor(skillParser: SkillParser);
    private resetBuildDiagnostics;
    private recordBuildWarning;
    build(rootDir: string): Promise<SkillIndex>;
    private loadRunCache;
    private saveRunCache;
    private buildSnapshot;
    write(rootDir: string): Promise<SkillIndex>;
    writeWithSummary(rootDir: string): Promise<IndexWriteResult>;
    createEmpty(rootDir: string): Promise<SkillIndex>;
    private stripVolatileFields;
    private readProjectConfig;
    private visitMarkdownDocuments;
    private readMetadataList;
    private inferDocumentKind;
    private scanArchivedChanges;
    /**
     * Every archive the previous build knew about that lives at or below `dir`.
     * Used when a directory listing fails: the archives under it are not gone, we
     * just cannot see them this run, so their index rows survive.
     */
    private preservedArchivesUnder;
    /**
     * The committed index is the authoritative record of what an archive looked
     * like; the run cache is the machine-local echo of it. Prefer the index.
     */
    private findPreviousArchivedEntry;
    /**
     * Cache key for one archived change's index entry.
     *
     * INVALIDATION CONTRACT: the fingerprint covers every file whose content or
     * mere existence can change the entry `readArchivedChange` produces -- the
     * state, the task graph, and every one of the ARCHIVED_DOCUMENTS whose
     * presence forms the entry's `documents` array (review.md and
     * artifacts/reviews/final-review.md among them). Statting only the first few
     * left a cached entry in place when a review artifact was added to an
     * already-indexed archive, so the index went silently wrong until the cache
     * was deleted by hand.
     *
     * 7.7 dropped the generated knowledge document from this list along with the
     * generator. A cache row written before 7.7 carries one extra `|` component,
     * so it can never compare equal and degrades to a re-read -- which is the
     * safe direction, and why this needs no format gate.
     *
     * Deliberately NOT covered: the `documentation_updates` targets referenced by
     * the task graph live outside the archive, and their existence check re-runs
     * whenever the task graph itself changes.
     *
     * Kept byte-identical to `computeArchiveFingerprint` in
     * `src/tools/build-index.ts`: both write the same machine-local cache file,
     * so a different key layout would make every run invalidate the other's rows.
     */
    private computeArchiveFingerprint;
    private scanArchivedChangesWithHistory;
    /**
     * The replacement for the deleted knowledge-document frontmatter fallback,
     * for the one-value-not-a-set fields. An archive whose proposal was lost
     * reads back with an empty summary; the committed index -- on disk and at
     * HEAD -- still has the one it was archived with. Current wins whenever it
     * has anything to say, so a corrected summary is never overwritten by an
     * older one.
     */
    private mergeHistoricalScalar;
    private mergeHistoricalStringLists;
    private mergeHistoricalOrderedLists;
    private readArchivedChangeHistory;
    private readArchivedChange;
    /**
     * 7.4: write `docs/project/feature-catalog.md`.
     *
     * One row per DECLARED FEATURE, which is the change from `feature-index.md`
     * that matters: the old file grew one prose block per archive forever and
     * still could not answer "where is this behaviour described". The catalogue
     * has as many rows as the project has features.
     *
     * It is written even when there are no features, so the file exists and says
     * so; a missing file reads as "the build is broken" rather than "nothing has
     * been declared yet". `generated: true` in its frontmatter keeps it out of
     * the `documents` map -- see contract 6.3, and note that omitting it brings
     * back exactly the self-referential growth 7.2 removed.
     */
    private writeFeatureCatalog;
    /**
     * 7.4: `feature-index.md` stops being generated.
     *
     * It is not deleted -- an existing project's links to it would rot, and
     * deleting a file a user may have committed is 7.9's decision to offer, not
     * this function's to take. Instead, the FIRST build after the upgrade
     * rewrites it once into what it should always have been: a frozen archive
     * history of pure link lines, with all thirty prose blocks removed and a
     * pointer at the catalogue and `ospec docs locate`.
     *
     * `historical: true` in the frontmatter is the latch. Once it is set this
     * function returns without reading anything else, so the file never changes
     * again and never re-accumulates -- which is what "one-off" has to mean if
     * it is to be true on the second build as well as the first. A project that
     * has no `feature-index.md` never gets one.
     */
    private freezeLegacyFeatureIndex;
    /**
     * Copy for the FROZEN feature-index (7.4). It kept fifteen labels while it
     * was generating one prose block per archive; the frozen file is a title, a
     * pointer and link lines, so the other twelve went with the prose.
     */
    private getFeatureIndexCopy;
}
export declare const createIndexBuilder: (skillParser: SkillParser) => IndexBuilder;
