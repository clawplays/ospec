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
export declare class ClassicChangeCloseoutService {
    private readonly fileService;
    constructor(fileService: FileService);
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
