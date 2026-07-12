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
