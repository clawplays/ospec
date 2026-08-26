import { SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
/**
 * Phase 7.8 -- `ospec docs audit`, drift detection.
 *
 * Walks every feature's `code:` declarations and asks git one question: has
 * anything under those paths changed since the archive named by the section's
 * `<!-- ospec:last-change -->` comment? If it has, and the feature document
 * itself did not change in that same range, the section has drifted.
 *
 * Read-only by construction: it runs `git log` / `git diff --name-only` and
 * writes nothing.
 *
 * The comparison is deliberately "did the DOCUMENT file change in this range",
 * not "did the section change". Section-level attribution would need to replay
 * every intermediate commit's parse, and a document touched for an unrelated
 * feature is a false negative that merely under-reports -- whereas getting the
 * git range wrong would over-report and train people to ignore the command.
 */
export interface DocsDriftEntry {
    slug: string;
    /** The binding's documentation kind; `feature` when the index predates kinds. */
    kind: string;
    /** `path#heading`, the same coordinate the obligations use. */
    target: string;
    file: string;
    heading: string;
    lastChange: string | null;
    /** Repo-relative code paths that moved. */
    changedPaths: string[];
    commitCount: number;
    summary: string;
}
export interface DocsAuditResult {
    /** False when the project is not a git repo, or the index has no features. */
    available: boolean;
    reason?: string;
    scanned: number;
    drifted: DocsDriftEntry[];
    /** Features skipped, with why -- so a silent zero is never mistaken for clean. */
    skipped: {
        slug: string;
        reason: string;
    }[];
}
/** One staleness signal. `signal` names the deterministic check that fired. */
export interface DocsStaleEntry {
    signal: 'dead_binding' | 'superseded_marker' | 'deprecated';
    slug?: string;
    kind?: string;
    file: string;
    heading?: string;
    detail: string;
}
export interface DocsStaleResult {
    available: boolean;
    reason?: string;
    scanned: number;
    stale: DocsStaleEntry[];
}
export declare class DocsAuditService {
    private readonly fileService;
    constructor(fileService: FileService);
    private git;
    /**
     * Resolve the commit that corresponds to an archive name.
     *
     * Strategy, in order: the commit that last touched the archive directory
     * (that is the archive commit itself), else the archive entry's
     * `completed_at` timestamp read from the index. A feature whose archive
     * cannot be located is REPORTED AS SKIPPED, never silently treated as clean.
     */
    private resolveSince;
    audit(projectRoot: string, config?: Pick<SkillrcConfig, 'projectLayout'> | null): Promise<DocsAuditResult>;
    /**
     * P8: `ospec docs audit --stale` -- is a document DEAD, rather than merely
     * behind? Three deterministic signals, each cheap and each read-only:
     *
     *  - `dead_binding`: every one of a binding's `code:` prefixes is gone from
     *    disk. The code this section answered for no longer exists, which is
     *    the strongest "this documentation is over" signal there is.
     *  - `superseded_marker`: EVERY decision a design document carries says
     *    Superseded, yet the document is not marked `status: deprecated` -- the
     *    whole file is plausibly retire-ready. Judged per file, never per
     *    section: one superseded decision next to a living one is correctly
     *    recorded history, exactly what verify_decision instructs.
     *  - `deprecated`: the document IS marked `status: deprecated` in its
     *    frontmatter. Not a problem, a queue: these are what `ospec docs
     *    retire` collects.
     *
     * Signals that would need judgment -- "is this plan fulfilled", "does the
     * product spec still match" -- are deliberately absent. A staleness report
     * that guesses trains people to ignore it.
     */
    stale(projectRoot: string, config?: Pick<SkillrcConfig, 'projectLayout'> | null): Promise<DocsStaleResult>;
}
export declare function createDocsAuditService(fileService: FileService): DocsAuditService;
