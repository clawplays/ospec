import { FeatureState } from '../core/types';
export interface ArchiveGateConfig {
    require_verification: boolean;
    require_skill_update: boolean;
    require_index_regenerated: boolean;
    require_optional_steps_passed: boolean;
}
export interface ArchiveCheckResult {
    canArchive: boolean;
    checks: {
        name: string;
        passed: boolean;
        message: string;
    }[];
    blockers: string[];
    warnings: string[];
}
export interface ArchiveProtocolState {
    activatedSteps: string[];
    tasksOptionalSteps: string[];
    verificationOptionalSteps: string[];
    passedOptionalSteps: string[];
    tasksComplete: boolean;
    verificationComplete: boolean;
    /** proposal.md acceptance checklist has no unchecked items. */
    proposalAcceptanceComplete: boolean;
    /** Goal-only: review.md is derived from and matches the final review; null/undefined when not applicable. */
    goalReviewSummaryAligned?: boolean | null;
    goalReviewSummaryMessage?: string | null;
}
export declare class ArchiveGate {
    /**
     * The message for one required-step check.
     *
     * M-cfg2: the false branch used to be the single string "<step> required but
     * not completed", printed regardless of whether the step was required. So a
     * project with `require_skill_update: false` -- which is EVERY classic
     * Change, because `ArchiveCommand` forces that flag off -- printed
     *
     *     PASS Skill Updated
     *       Skill update required but not completed
     *
     * a line that contradicts its own verdict on the line above it. Three
     * states, three messages.
     */
    private describeRequirement;
    checkArchiveReadiness(featureState: FeatureState, config: ArchiveGateConfig, protocolState?: ArchiveProtocolState): Promise<ArchiveCheckResult>;
}
export declare const archiveGate: ArchiveGate;
