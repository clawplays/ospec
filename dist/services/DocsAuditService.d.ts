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
}
export declare function createDocsAuditService(fileService: FileService): DocsAuditService;
