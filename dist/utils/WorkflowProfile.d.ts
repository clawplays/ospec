export type WorkflowProfileId = 'change' | 'goal';
export declare const CHANGE_WORKFLOW_PROFILE: WorkflowProfileId;
export declare const GOAL_WORKFLOW_PROFILE: WorkflowProfileId;
export declare const GOAL_ONLY_RELATIVE_PATHS: string[];
export declare function normalizeWorkflowProfileId(input: unknown): WorkflowProfileId | null;
export declare function inferWorkflowProfileFromChangeDir(changePath: string, state?: any): Promise<WorkflowProfileId>;
