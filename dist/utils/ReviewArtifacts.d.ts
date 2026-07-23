import { FileService } from '../services/FileService';
export type ReviewArtifactRole = 'code_reviewer' | 'spec_compliance_reviewer' | 'code_quality_reviewer';
export interface ReviewArtifactDescriptor {
    path: string;
    name: string;
    role: ReviewArtifactRole;
}
export interface GoalReviewArtifactSet {
    mode: 'combined' | 'legacy' | 'missing';
    artifacts: ReviewArtifactDescriptor[];
    missing: string[];
}
export declare function resolveGoalReviewArtifacts(fileService: FileService, changePath: string): Promise<GoalReviewArtifactSet>;
export interface GoalReviewSummaryAnalysis {
    aligned: boolean;
    finalDecision: string;
    summaryDecision: string;
    message: string;
}
/**
 * For Goals, review.md is a derived summary that `ospec execute sync` rewrites
 * from artifacts/reviews/final-review.md. Archive readiness requires the
 * summary to carry the derivation marker, the same decision, and a complete
 * checklist so an untouched scaffold template can no longer be archived.
 */
export declare function analyzeGoalReviewSummary(fileService: FileService, changePath: string): Promise<GoalReviewSummaryAnalysis>;
