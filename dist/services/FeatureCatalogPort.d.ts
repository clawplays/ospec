import { FEATURE_CATALOG_RELATIVE_PATH } from './FeatureCatalog';
/**
 * 7.7's seam onto track A's feature catalogue (7.4).
 *
 * Track A owns `docs/project/feature-catalog.md` -- its row format, its
 * generation, and `updateFeatureCatalogRows`, the archive-time primitive it
 * built for this file to call. Archiving CALLS that primitive. This module
 * deliberately contains no second implementation of the row format: the
 * repository has been bitten enough times by one fact living in two places
 * (the checklist regex, `quoteShellArg` five times over, the two index
 * builders) that reimplementing A's format here would be a predictable defect
 * rather than a shortcut.
 *
 * The signature is A's, matched exactly:
 *
 *   updateFeatureCatalogRows(projectRoot, { slugs?, archiveName? })
 *     -> { path, written, rows, updated, missing, warnings }
 *
 * RESOLUTION. A's `./FeatureCatalog` module is now on this tree, so the
 * call-time require succeeds and the seam is inert -- it stays because it is
 * also what keeps a project with no catalogue from failing to archive, which
 * is a permanent requirement rather than a pre-merge one. The duplicated
 * `FEATURE_CATALOG_RELATIVE_PATH` was dropped at the merge in favour of A's
 * export of the same name, and is re-exported here so existing importers of
 * this module keep resolving -- one fact, one place.
 */
export interface CatalogUpdateRequest {
    slugs: string[];
    archiveName: string;
}
/** A's `FeatureCatalogUpdateResult`, plus `available` for the not-yet-merged case. */
export interface CatalogUpdateResult {
    /** False when track A's catalogue module could not be resolved. */
    available: boolean;
    /** Repo-relative catalogue path. */
    path: string | null;
    /** False when the rendered content was byte-identical and nothing was written. */
    written: boolean;
    /** Total rows in the catalogue after the update. */
    rows: number;
    /** Requested slugs whose row actually changed, sorted. */
    updated: string[];
    /** Requested slugs with no declaration in the index, sorted. */
    missing: string[];
    /** Non-fatal problems. Archiving warns on these; it must never fail on them. */
    warnings: string[];
}
/** The subset of track A's module this file uses. */
export interface FeatureCatalogPort {
    updateFeatureCatalogRows(projectRoot: string, options: {
        slugs?: string[];
        archiveName?: string;
    }): Promise<{
        path: string;
        written: boolean;
        rows: number;
        updated: string[];
        missing: string[];
        warnings: string[];
    }>;
}
/** Track A's constant, re-exported so this module's importers keep one source. */
export { FEATURE_CATALOG_RELATIVE_PATH };
/** Tests and track A may install the module explicitly. */
export declare function registerFeatureCatalogPort(port: FeatureCatalogPort | null): void;
export declare function resetFeatureCatalogPort(): void;
/**
 * Track A's module, or null before the merge.
 *
 * The require is wrapped because `./FeatureCatalog` genuinely does not exist on
 * this branch; a missing module here is the expected state, not a failure to
 * report. Resolution is attempted once and cached either way, so a project with
 * no catalogue does not pay a failed require per archive.
 */
export declare function getFeatureCatalogPort(): FeatureCatalogPort | null;
/**
 * Update the catalogue rows for `slugs` to point at `archiveName`.
 *
 * Never throws. A catalogue that could not be updated is a warning, not a
 * reason to refuse to archive finished work -- and A's primitive holds the same
 * rule on its side, so this is belt and braces rather than the only guard.
 */
export declare function updateCatalogRows(projectRoot: string, request: CatalogUpdateRequest): Promise<CatalogUpdateResult>;
/**
 * The slugs the catalogue currently has a row for, or null when there is no
 * catalogue file. Used by the archive assertion, which must only require a row
 * when a catalogue actually exists.
 *
 * Reads the rendered rows rather than asking A for structure, because the only
 * question here is "does this slug have a row", and A's row format already
 * pins the slug in a code span as its first cell.
 *
 * Takes the ABSOLUTE catalogue path, not the project root. Before the merge
 * this joined `projectRoot` with the relative path directly, which is wrong for
 * a project on the managed `.ospec/` layout: A generates the catalogue at
 * `resolveManagedPath(root, FEATURE_CATALOG_RELATIVE_PATH, config)`, so a
 * root-relative join would read nothing, return null, and silently skip the
 * assertion for exactly the projects that have one. The caller already holds
 * the resolved config, so it resolves the path and there is one rule.
 */
export declare function readCatalogRows(catalogPath: string): Promise<Map<string, string> | null>;
