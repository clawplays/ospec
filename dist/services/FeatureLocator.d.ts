import type { FeatureDocEntry } from '../core/types';
/** A resolved feature, plus how it was reached. */
export interface FeatureLocation extends FeatureDocEntry {
    /**
     * The `code:` prefix that matched an `--affects` path. Absent for a
     * `--feature` lookup, which matches on the slug itself.
     */
    matched_prefix?: string;
    /** 1-indexed inclusive line range in the RAW file. Absent when unreadable. */
    lines?: [number, number];
    /** UTF-8 byte length of the section text. Absent when unreadable. */
    bytes?: number;
}
/** A near miss, offered when nothing matched. */
export interface FeatureCandidate {
    slug: string;
    file: string;
    heading: string;
}
export interface FeatureLocateResult {
    matches: FeatureLocation[];
    candidates: FeatureCandidate[];
}
/** Repo-relative, `/`-separated, no leading `./` or `/`. */
export declare function normalizeLocatePath(input: string): string;
/**
 * Contract 2.2: an entry `e` matches a path `p` when `p === e`, or `p` starts
 * with `e` where `e` already ends with `/`, or `p` starts with `e + '/'`. Full
 * path segments only, so `src/auth` never matches `src/authz/x.ts`.
 */
export declare function codePrefixMatches(prefix: string, targetPath: string): boolean;
/**
 * `--feature <slug>`. An exact slug hit is the whole point -- one map lookup,
 * no scan. A miss offers the closest slugs so the caller's next command is a
 * correction rather than a fishing expedition.
 */
export declare function locateByFeature(index: any, slug: string): FeatureLocateResult;
/**
 * `--affects <path>`. Resolves through the `code:` declarations. Contract 2.2
 * fixes the ordering: longest matching prefix first, because the most specific
 * declaration is the one that actually describes the file. Ties break on slug
 * so the output does not depend on index key order.
 */
export declare function locateByAffects(index: any, affectedPath: string): FeatureLocateResult;
/**
 * Cross back from the index's coordinate space into raw-file line numbers,
 * which is what a reader actually needs: `Read(offset, limit)` and `sed -n`
 * both take lines, and no agent tool takes a character index into a body with
 * the frontmatter removed.
 *
 * Returns null when the document cannot be read, which is the honest answer
 * for a stale index -- better a location with no read range than a confidently
 * wrong one.
 */
export declare function locateLines(rawContent: string, entry: Pick<FeatureDocEntry, 'start' | 'end'>): {
    lines: [number, number];
    bytes: number;
    text: string;
} | null;
