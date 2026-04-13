import { FeatureState, FeatureStatus, WorkflowStep } from '../core/types';
export declare class WorkflowEngine {
    canExecuteStep(featureState: FeatureState, step: WorkflowStep): Promise<boolean>;
    executeStep(featureState: FeatureState, step: WorkflowStep): Promise<FeatureState>;
    private getStepDependencies;
    transitionStatus(currentStatus: FeatureStatus, targetStatus: FeatureStatus): Promise<void>;
    getNextSteps(featureState: FeatureState): WorkflowStep[];
    getProgress(featureState: FeatureState): {
        completed: number;
        total: number;
        percentage: number;
    };
}
export declare const workflowEngine: WorkflowEngine;
