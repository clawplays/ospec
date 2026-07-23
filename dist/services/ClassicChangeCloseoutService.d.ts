import { ChangeStatusCheck, FeatureState } from '../core/types';
import { PluginWorkflowComposer } from '../workflow/PluginWorkflowComposer';
import { FileService } from './FileService';
export interface ClassicChangeDocumentationAnalysis {
    changeType: string;
    impact: string;
    updates: string[];
    archiveReady: boolean;
    checks: ChangeStatusCheck[];
}
export interface ClassicChangeReviewAnalysis {
    decision: string;
    checklistComplete: boolean;
    archiveReady: boolean;
    checks: ChangeStatusCheck[];
}
export interface ClassicChangePluginAnalysis {
    archiveReady: boolean;
    checks: ChangeStatusCheck[];
}
export interface ClassicChangeWorkspaceAnalysis {
    archiveReady: boolean;
    outOfScopePaths: string[];
    checks: ChangeStatusCheck[];
}
export declare class ClassicChangeCloseoutService {
    private readonly fileService;
    constructor(fileService: FileService);
    /**
     * Classic changes assume serial execution in a shared worktree. This guard is
     * the classic counterpart of the Goal workspace gate: every uncommitted file
     * must belong to the change (its container, managed OSpec bookkeeping, or the
     * proposal's declared affects/documentation scopes). Unattributed dirty files
     * block closeout so another session's concurrent edits cannot be silently
     * archived with this change. Non-Git directories skip the check.
     */
    analyzeWorkspaceScope(projectRoot: string, featureDir: string, proposalPath: string): Promise<ClassicChangeWorkspaceAnalysis>;
    analyzeDocumentationContract(projectRoot: string, proposalPath: string): Promise<ClassicChangeDocumentationAnalysis>;
    analyzeReview(reviewPath: string): Promise<ClassicChangeReviewAnalysis>;
    analyzePluginGates(changePath: string, activatedSteps: string[], workflow: PluginWorkflowComposer): Promise<ClassicChangePluginAnalysis>;
    deriveCloseoutState(state: FeatureState, input: {
        proposalReady: boolean;
        tasksReady: boolean;
        verificationReady: boolean;
        reviewReady: boolean;
        documentationReady: boolean;
        pluginsReady: boolean;
    }): FeatureState;
    private validateDocumentationPath;
}
