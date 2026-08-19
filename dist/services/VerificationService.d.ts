import type { ActiveChangeStatusItem } from '../core/types';
export interface VerificationCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
}
export interface VerificationOutcome {
    passed: boolean;
    checks: VerificationCheck[];
    summary: string;
    failCount: number;
    warnCount: number;
    workflowProfile: string;
    changeStatus?: ActiveChangeStatusItem;
}
/**
 * Structured verification analysis that NEVER calls process.exit (Contract 3).
 * `VerifyCommand` wraps this for console output + exit code; `LoopService` consumes
 * the structured outcome as the third stage of its stop condition.
 */
export declare class VerificationService {
    private deps;
    /** Run the full protocol verification analysis for a resolved change directory. */
    verify(targetPath: string): Promise<VerificationOutcome>;
    private verifyUnscoped;
    private addGoalDocumentReviewChecks;
    private findProjectRoot;
}
export declare function createVerificationService(): VerificationService;
