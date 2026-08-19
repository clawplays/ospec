import { BaseCommand } from './BaseCommand';
interface ArchiveCommandOptions {
    checkOnly?: boolean;
    repair?: boolean;
}
/**
 * What `ospec archive` concluded, for `cli.ts` to turn into an exit code.
 *
 * M-misc2: this command used to call `process.exit(1)` itself the moment the
 * gate refused. A library method that kills the host process is not a library
 * method: `dist/index.js` re-exports `ArchiveCommand`, so any embedder calling
 * it lost their process; the `finally` blocks and rollbacks below never ran;
 * and every test that exercises the blocked path had to install a
 * `process.exit` spy that throws, then filter that throw back out -- which is
 * itself a way to mistake "blocked" for "crashed".
 *
 * `--check-only` had the same problem for the same reason, and worse: a
 * read-only probe whose whole contract is "tell me and change nothing" ended
 * the process to say no.
 *
 * The verdict is now returned. `cli.ts` owns the exit code, which is where the
 * decision belongs and where every other command already makes it.
 */
export interface ArchiveCommandResult {
    /** `archived` and `ready` are success; `blocked` is exit 1. */
    status: 'archived' | 'ready' | 'blocked';
    /** Where the change was moved to, on `archived` only. */
    archivePath?: string;
    /** Why it was refused, on `blocked` only. Already printed. */
    blockers: string[];
}
export declare class ArchiveCommand extends BaseCommand {
    /**
     * `BaseCommand.execute` is declared `Promise<void>` for every command, so
     * this one stays void-returning rather than loosening that contract for a
     * single subclass. `run` is the method with the verdict, and it is what
     * `cli.ts` and every embedder should call.
     */
    execute(featurePath?: string, options?: ArchiveCommandOptions): Promise<void>;
    run(featurePath?: string, options?: ArchiveCommandOptions): Promise<ArchiveCommandResult>;
    private runWithin;
    /**
     * Every readiness gate, computed from the change on disk.
     *
     * Split out of `runWithin` so the whole gate -- not a hand-picked subset of
     * it -- can be run under `FileService.withReadOverlay`. Anything that reads
     * the task graph, the checklist or the progress projection through
     * `services.fileService` therefore sees the post-reconciliation state on
     * the read-only path, which is what `ospec archive` gates on.
     */
    private evaluateArchiveReadiness;
    private addGoalDocumentReviewBlockers;
    private addGoalVerificationEvidenceBlocker;
    private addGoalVerificationRequirementBlocker;
    private findProjectRoot;
    private performArchive;
    private inferProjectRootFromChangePath;
    private updateProposalStatus;
    private resolveArchiveDirName;
    private toRelativePath;
}
export {};
