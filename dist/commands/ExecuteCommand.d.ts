import { TaskDocumentReviewStage, TaskHandoffTarget, TaskWorkerToolTarget, TaskUserDecisionOption } from '../services/TaskGraphExecutionService';
import { BaseCommand } from './BaseCommand';
export declare class ExecuteCommand extends BaseCommand {
    /** When true, console reports print a token-lean summary (artifacts are still written in full). */
    private brief;
    execute(action?: string, ...rawArgs: string[]): Promise<void>;
    private status;
    private bootstrap;
    private handoff;
    private preflight;
    private next;
    private route;
    private workspace;
    private worktree;
    private finish;
    private dispatch;
    private launch;
    private collect;
    private retry;
    private complete;
    private sync;
    private review;
    private feedback;
    private repair;
    /**
     * F2: settle an issued review from a validated JSON decision file.
     *
     * The Markdown path is untouched: a reviewer may still edit the artifact's
     * frontmatter by hand. This is the structured alternative, and it also
     * writes the sibling `*.findings.json`, which is what stops the review
     * gates falling back to Markdown parsing and stamping every finding
     * `severity: unknown` (which they treat as blocking).
     */
    private reviewDecision;
    private decision;
    /**
     * Phase 5 / F3. Evidence gets the same budget as console output.
     *
     * `execute verify --command` and its siblings take the raw output of a test
     * run in `--summary`; a failing suite pastes tens of thousands of characters
     * in, and every later reader of the evidence record pays for all of them.
     * The pruned value is still a plain string carrying the head, the notice and
     * the tail, so nothing about the evidence record's SHAPE changes here -- the
     * spill path travels inside the text, not in a new field.
     */
    private pruneEvidenceText;
    private verify;
    private requireVerification;
    private tdd;
    private debug;
    private deferBlocker;
    private resolveGoalChangePath;
    private resolveChangePath;
    private printStatus;
    private printBootstrap;
    private printHandoff;
    private printDocumentReview;
    private printNext;
    private printDispatch;
    private printLaunch;
    private printCollect;
    private printRetry;
    private printWorkspace;
    private printWorktree;
    private printWorktreeRun;
    private printFinish;
    private printCompletion;
    private printRepairWave;
    private printSync;
    private printReview;
    private printReviewFeedback;
    private printDecision;
    private printVerificationEvidence;
    private printVerificationRequirement;
    private printTddEvidence;
    private printDebugEvidence;
    private printWorkflowRoute;
    private printControllerSummary;
    private buildControllerSummary;
    private extractTaskReviewActions;
    private summarizeBlockedFocus;
    /**
     * See `utils/ShellQuote`. A fourth copy of the rule, with the same two
     * defects as `BrainstormCommand`'s: only `"` escaped, and `\` in the raw
     * fast path so Windows paths were emitted unquoted.
     */
    private quoteCommandArg;
    private printTaskList;
    private printBlockedList;
    private parseDispatchArgs;
    parseLaunchArgs(args: string[]): {
        inputPath?: string;
        taskId?: string;
        target?: TaskWorkerToolTarget;
        dryRun: boolean;
        json: boolean;
        primitive?: string;
        until?: string;
        maxIterations?: number;
        interval?: string;
    };
    private parseWorktreeArgs;
    parseHandoffArgs(args: string[]): {
        inputPath?: string;
        target?: TaskHandoffTarget;
    };
    parseDocumentReviewArgs(args: string[]): {
        inputPath?: string;
        stage?: TaskDocumentReviewStage;
        force?: boolean;
    };
    private parseFinishArgs;
    private parsePositiveInteger;
    private parseCompleteArgs;
    private parseDeferBlockerArgs;
    private parseCollectArgs;
    private parseRetryArgs;
    private parseReviewArgs;
    private parseReviewFeedbackArgs;
    parseDecisionArgs(args: string[]): {
        inputPath?: string;
        id?: string;
        question?: string;
        options: TaskUserDecisionOption[];
        recommendedOptionId?: string;
        required?: boolean;
        selectOptionId?: string;
        skip?: boolean;
        summary?: string;
        answeredBy?: 'user';
    };
    private parseDecisionOption;
    private parseVerificationArgs;
    private parseVerificationRequirementArgs;
    private parseTddArgs;
    private parseDebugArgs;
    private normalizeCompletionStatus;
    private normalizeReviewStage;
    private normalizeDocumentReviewStage;
    private normalizeHandoffTarget;
    private normalizeWorkerToolTarget;
    private normalizeVerificationEvidenceStatus;
    private normalizeVerificationRequirementKind;
    private normalizeTddEvidencePhase;
    private normalizeDebugEvidencePhase;
    private normalizeTddEvidenceStatus;
    private normalizeDebugEvidenceStatus;
    /**
     * F5: any integer, including negative ones. The `>= 0` guard this replaces
     * rejected the codes a harness actually produces for "the child never ran"
     * (-1 by convention, and Node reports a signalled child with a negative
     * code on some platforms), which forced callers to launder an
     * infrastructure fault into a plain `1` and lose the distinction the four
     * orthogonal fields exist to preserve.
     */
    private normalizeExitCode;
    /** F5: shared parse for the boolean/signal outcome flags on verify and tdd. */
    private parseOutcomeFlag;
}
