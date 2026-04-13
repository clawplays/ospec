/**
 * Configurable workflow system.
 * Implemented against the official OSpec specification.
 * Supports core steps, optional steps, and feature flags.
 */
export type CoreStep = 'proposal' | 'tasks' | 'state' | 'verification' | 'skill_update' | 'index_regenerated';
export type OptionalStep = 'code_review' | 'design_doc' | 'plan_doc' | 'security_review' | 'adr' | 'db_change_doc' | 'api_change_doc';
export interface OptionalStepConfig {
    enabled: boolean;
    when: string[];
}
export interface WorkflowConfigType {
    core_required: CoreStep[];
    optional_steps: Record<OptionalStep, OptionalStepConfig>;
    archive_gate: {
        require_verification: boolean;
        require_skill_update: boolean;
        require_index_regenerated: boolean;
        require_optional_steps_passed: boolean;
    };
    feature_flags: {
        supported: string[];
    };
}
/**
 * Three predefined workflow presets.
 */
export declare const WORKFLOW_PRESETS: Record<string, WorkflowConfigType>;
export declare class ConfigurableWorkflow {
    private config;
    private mode;
    constructor(mode: string);
    /**
     * Resolve activated optional steps from feature flags.
     */
    getActivatedSteps(featureFlags: string[]): OptionalStep[];
    /**
     * Get the full workflow steps: core plus activated optional steps.
     */
    getFullWorkflow(featureFlags: string[]): string[];
    /**
     * Get the core steps.
     */
    getCoreSteps(): CoreStep[];
    /**
     * Get all supported feature flags.
     */
    getSupportedFlags(): string[];
    /**
     * Validate feature flags.
     */
    validateFlags(flags: string[]): {
        valid: boolean;
        unsupported: string[];
    };
    /**
     * Get step dependencies.
     */
    getStepDependencies(step: string): string[];
    /**
     * Get the workflow configuration.
     */
    getConfig(): WorkflowConfigType;
    /**
     * Get the archive gate configuration.
     */
    getArchiveGate(): {
        require_verification: boolean;
        require_skill_update: boolean;
        require_index_regenerated: boolean;
        require_optional_steps_passed: boolean;
    };
    /**
     * Generate a workflow summary.
     */
    getSummary(featureFlags: string[]): {
        mode: string;
        coreSteps: number;
        optionalSteps: string[];
        totalSteps: number;
        flags: string[];
        unsupportedFlags: string[];
    };
    /**
     * Get the current mode.
     */
    getMode(): string;
}
