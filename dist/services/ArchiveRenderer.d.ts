import type { ArchivedChangeIndexEntry } from '../core/types';
/**
 * 7.7b: `ospec changes show <archive>`.
 *
 * This replaces the ENTIRE display value of the knowledge documents 7.7
 * deleted, so the bar it has to clear is informational equivalence, not "it
 * prints something useful". `KNOWLEDGE_DOCUMENT_FIELDS` below is the checklist
 * the old generator actually emitted, kept here next to the renderer that has
 * to reproduce it and asserted by
 * `tests/commands/p7-changes-show-equivalence.test.mjs`. If you add a field to
 * one, add it to the other -- the list is the contract that justified the
 * deletion.
 *
 * It renders live from the index entry plus the archive directory, and it
 * WRITES NOTHING. That is the whole point: the old document was derived state
 * that had to be regenerated, swept for staleness, and protected from being
 * overwritten. Deriving it on read costs one index lookup and one directory
 * listing, and cannot go stale.
 */
/** Every field the deleted generator put into a knowledge document. */
export declare const KNOWLEDGE_DOCUMENT_FIELDS: readonly ["feature", "summary", "affects", "target_files", "verification_commands", "project_documents", "archive", "documents", "completed_at", "workflow_profile", "disposition", "completion_status", "accepted_risk", "force_archive_reason", "failing_checks"];
export interface ArchiveRenderModel {
    feature: string;
    summary: string;
    affects: string[];
    target_files: string[];
    verification_commands: string[];
    project_documents: string[];
    archive: string;
    /** Archived documents that are present on disk RIGHT NOW, with their paths. */
    documents: {
        relative: string;
        archivePath: string;
        exists: boolean;
    }[];
    completed_at: string | null;
    workflow_profile: string;
    disposition: 'completed' | 'forced';
    completion_status: 'completed' | 'incomplete';
    accepted_risk: boolean;
    force_archive_reason: string;
    failing_checks: string[];
    /** False when the archive directory is gone but the index entry survives. */
    archive_present: boolean;
}
export interface ArchiveMatch {
    name: string;
    entry: ArchivedChangeIndexEntry;
}
export interface ArchiveLookup {
    kind: 'found' | 'ambiguous' | 'missing';
    match?: ArchiveMatch;
    candidates: ArchiveMatch[];
}
/**
 * Fuzzy archive-name resolution: exact, then prefix, then keyword.
 *
 * The tiers are tried in order and the FIRST non-empty tier wins rather than
 * unioning them. An exact name must never be reported as ambiguous just
 * because it is also a prefix of a longer one -- `2026-08-14-fix-login` and
 * `2026-08-14-fix-login-timeout` both exist in real projects.
 */
export declare function lookupArchive(entries: ArchivedChangeIndexEntry[], query: string): ArchiveLookup;
/**
 * Build the render model from the index entry plus a live look at the archive.
 *
 * The index entry is the authority for the extracted fields -- it is merged
 * across history, so it still answers for an archive whose directory has been
 * deleted. The directory is consulted only for which documents are actually
 * there, which is the one thing an index entry can be stale about.
 */
export declare function buildRenderModel(projectRoot: string, entry: ArchivedChangeIndexEntry): Promise<ArchiveRenderModel>;
/** Terminal-friendly default output. */
export declare function renderText(model: ArchiveRenderModel): string;
/** `--md`: the same content as a markdown document, for pasting into a review. */
export declare function renderMarkdown(model: ArchiveRenderModel): string;
export declare function renderJson(model: ArchiveRenderModel): string;
