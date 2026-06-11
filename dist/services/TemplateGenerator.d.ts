/**
 * Template generation service.
 * Generates template files such as proposal.md, design.md, implementation-plan.md, task-graph.json, tasks.md, review artifacts, worker-status.md, and verification.md.
 */
import { FeatureState } from '../core/types';
export declare class TemplateGenerator {
    /**
     * Generate the proposal.md template.
     */
    static generateProposalTemplate(featureName: string, affects?: string[]): string;
    /**
     * Generate the design.md template.
     */
    static generateDesignTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the implementation-plan.md template.
     */
    static generateImplementationPlanTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the tasks.md template.
     */
    static generateTasksTemplate(featureName: string, coreRequiredSteps?: string[], optionalSteps?: string[]): string;
    /**
     * Generate the verification.md template.
     */
    static generateVerificationTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the artifacts/reviews/spec-compliance.md template.
     */
    static generateSpecComplianceReviewTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the artifacts/reviews/code-quality.md template.
     */
    static generateCodeQualityReviewTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the artifacts/agents/task-graph.json template.
     */
    static generateTaskGraphTemplate(featureName: string, optionalSteps?: string[]): string;
    /**
     * Generate the artifacts/agents/worker-status.md template.
     */
    static generateAgentWorkerStatusTemplate(featureName: string): string;
    /**
     * Generate the state.json payload.
     */
    static generateStateJson(featureName: string, affects?: string[], mode?: 'lite' | 'standard' | 'full'): FeatureState;
    /**
     * Create the feature directory and files.
     */
    static createFeatureDirectory(projectRoot: string, featureName: string, affects?: string[], coreRequiredSteps?: string[], optionalSteps?: string[]): Promise<void>;
    /**
     * Generate project initialization files.
     */
    static initializeProject(projectRoot: string, mode?: 'lite' | 'standard' | 'full'): Promise<void>;
    /**
     * Generate the AI guide.
     */
    private static generateAiGuide;
    /**
     * Generate the execution protocol.
     */
    private static generateExecutionProtocol;
}
