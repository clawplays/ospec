import type { FeatureDocEntry } from '../core/types';
/** Repo-relative location of the generated catalogue. */
export declare const FEATURE_CATALOG_RELATIVE_PATH = "docs/project/feature-catalog.md";
/**
 * A feature DOCUMENT's lifecycle state.
 *
 * Named `FeatureDocStatus`, not `FeatureStatus`, because `FeatureStatus` in
 * `core/types.ts` is already taken by the CHANGE lifecycle
 * (queued/draft/proposed/...). That is a fourth thing spelled "feature" in
 * this repository; see the contract's naming trap in 6.1.
 *
 * The wave 1 contract does not define this; 7.4 decides it. It is NOT a token
 * in the `<!-- ospec:feature -->` declaration, because contract 2.1 rule 7
 * makes any key other than `code:` a hard error and two other tracks are
 * already building against that grammar. It is a separate one-line comment in
 * the same family as `<!-- ospec:last-change -->`, so it stays local to the
 * section it describes and survives that section being moved:
 *
 *     <!-- ospec:status deprecated -->
 *
 * Spelled `ospec:status`, NOT `ospec:feature-status`. Wave 1's declaration
 * matcher is `^<!--\s*ospec:feature\b(.*?)-->$`, and `\b` matches between the
 * `e` and the `-`, so `ospec:feature-status` parses as a MALFORMED feature
 * declaration and fails the whole index rebuild. No `ospec:feature-*` name is
 * available while that regex stands.
 *
 * Absent means `active`, because a feature that nobody has marked is a feature
 * that is still there. 7.6's deprecate/remove obligation writes this comment.
 */
export type FeatureDocStatus = 'active' | 'deprecated' | 'removed';
export interface FeatureCatalogRow {
    slug: string;
    heading: string;
    file: string;
    /** `path#heading` -- the exact, machine-readable location. */
    location: string;
    /** The section's first sentence, truncated at 120 characters. */
    summary: string;
    status: FeatureDocStatus;
    /** The binding's documentation kind; `feature` when the index predates kinds. */
    kind?: string;
    /** The archive name from `<!-- ospec:last-change -->`, or ''. */
    lastChange: string;
}
export interface FeatureCatalogUpdateResult {
    /** Repo-relative path of the catalogue. */
    path: string;
    /** False when the rendered content was byte-identical and nothing was written. */
    written: boolean;
    /** Total rows in the catalogue after the update. */
    rows: number;
    /** Requested slugs whose row actually changed, sorted. */
    updated: string[];
    /** Requested slugs with no declaration in the index, sorted. */
    missing: string[];
    /** Non-fatal problems. Archive warns on these; it must never fail on them. */
    warnings: string[];
}
/**
 * The one-liner for a row: the section's first sentence, truncated at 120
 * characters.
 *
 * "First sentence" means the first sentence of the first PROSE paragraph --
 * the heading, the declaration comment, the traceability comment, and any
 * fenced block are not prose and describing a feature as "<!-- ospec:feature"
 * would make the catalogue useless. Truncation cuts on a word boundary when
 * one is available, because a row ending mid-word reads as corruption.
 */
export declare function featureSummarySentence(sectionText: string, limit?: number): string;
/**
 * Reads `<!-- ospec:status <state> -->` from a section. An unknown or
 * absent state is `active`: a catalogue that refuses to render because someone
 * typed `depricated` is worse than one that renders the row and lets the
 * author see it is still listed as active.
 */
export declare function featureStatusFromSection(sectionText: string): FeatureDocStatus;
/**
 * GitHub-style heading anchor, for the href half of the section link.
 *
 * Unicode-aware: `\w` matched only `[A-Za-z0-9_]`, which deleted every CJK
 * character -- a pure-Chinese heading anchored to an empty `#` and a mixed one
 * to fragments like `#-http-`, so no rendered catalogue link could jump.
 * GitHub and VS Code both keep Unicode letters and digits; now so does this.
 */
export declare function headingAnchor(heading: string): string;
/** A `|` inside a cell would end it; a newline would end the row. */
export declare function escapeTableCell(value: string): string;
/**
 * Posix-relative link from `docs/project/` to a repo-relative target. Written
 * out rather than delegated to `path.relative` so the twin in build-index.ts
 * produces identical text on Windows without a separator fixup.
 */
export declare function catalogRelativeLink(fromDir: string, targetRepoPath: string): string;
export declare function featureCatalogCopy(documentLanguage: string | undefined): {
    title: string;
    guidance: string;
    empty: string;
    columnFeature: string;
    columnSummary: string;
    columnSection: string;
    columnStatus: string;
    columnLastChange: string;
    noSummary: string;
    noLastChange: string;
};
/**
 * THE row format. One line per feature: slug, one sentence, `doc#section`
 * link, status, last-change archive link.
 *
 * `archiveLinks` maps an archive NAME to its repo-relative archive directory,
 * so a row can link the archive that last touched the feature. A name with no
 * entry falls back to the conventional `changes/archived/<name>` -- the link
 * may dangle, and a dangling link to the right place beats no link at all.
 */
export declare function renderFeatureCatalog(rows: FeatureCatalogRow[], copy: ReturnType<typeof featureCatalogCopy>, archiveLinks?: Record<string, string>, catalogDir?: string): string;
/**
 * Build one row from a feature entry and the text of its section.
 *
 * `sectionText` is the slice `body.slice(entry.start, entry.end)` in the
 * contract's coordinate space (4). Passing the raw file instead gives the
 * wrong text on any CRLF checkout.
 */
export declare function buildFeatureCatalogRow(entry: FeatureDocEntry, sectionText: string): FeatureCatalogRow;
/**
 * Slice one feature's section out of a document's raw contents, in the
 * contract's coordinate space. Returns '' when the offsets do not fit the
 * document, which happens when the index is stale relative to the file.
 */
export declare function sliceSectionFromRaw(rawContent: string, entry: Pick<FeatureDocEntry, 'start' | 'end'>): string;
/**
 * Regenerate `docs/project/feature-catalog.md`, forcing `last_change` to
 * `archiveName` for the named slugs.
 *
 * This is the primitive 7.7 calls at archive time, and the forcing is why it
 * exists: at that moment the index has not been rebuilt and the
 * `<!-- ospec:last-change -->` comment may not be written yet, so a plain
 * regeneration would emit the PREVIOUS archive for the features this change
 * just touched. Passing the archive name makes the row correct immediately;
 * the next index rebuild reaches the same answer from the document.
 *
 * It never throws. An archive must not fail because a catalogue row could not
 * be refreshed, so everything recoverable comes back in `warnings` and
 * `missing` (7.7's rule: warn, do not block).
 */
export declare function updateFeatureCatalogRows(projectRoot: string, options?: {
    slugs?: string[];
    archiveName?: string;
}): Promise<FeatureCatalogUpdateResult>;
/**
 * Shared rendering path: read every declared feature's document once, slice
 * each section, and render. Used by `updateFeatureCatalogRows` and by
 * `IndexBuilder.writeFeatureCatalog`.
 */
export declare function renderCatalogFromIndex(projectRoot: string, config: any, index: any, options?: {
    forcedLastChange?: {
        slugs: string[];
        archiveName: string;
    } | null;
    warnings?: string[];
}): Promise<{
    content: string;
    rows: FeatureCatalogRow[];
}>;
