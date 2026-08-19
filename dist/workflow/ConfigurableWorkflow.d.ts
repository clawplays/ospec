/**
 * Configurable workflow system.
 * Implemented against the official OSpec specification.
 * Supports core steps, optional steps, and feature flags.
 */
export type CoreStep = 'proposal' | 'design' | 'implementation_plan' | 'task_graph' | 'tasks' | 'final_review' | 'agent_worker_status' | 'state' | 'verification' | 'skill_update' | 'index_regenerated' | 'spec_compliance_review' | 'code_quality_review';
export type OptionalStep = 'code_review' | 'design_doc' | 'plan_doc' | 'security_review' | 'adr' | 'db_change_doc' | 'api_change_doc' | 'tdd_cycle' | 'root_cause_debug' | 'verification_evidence';
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
    model_profiles: Partial<Record<'mechanical' | 'standard' | 'strong_reasoning' | 'review' | 'final_review', {
        default?: string;
        targets?: Record<string, string>;
    }>>;
}
/**
 * Three predefined workflow presets.
 */
export declare const WORKFLOW_PRESETS: Record<string, WorkflowConfigType>;
export declare class ConfigurableWorkflow {
    private config;
    private mode;
    /**
     * M-misc6: `WORKFLOW_PRESETS[mode]` with no fallback. An unknown mode -- a
     * hand-edited `.skillrc`, a mode from a newer CLI, or the empty string --
     * left `this.config` undefined, and then EVERY method threw
     * `Cannot read properties of undefined (reading 'optional_steps')` from
     * somewhere far away from the cause.
     *
     * `WorkflowComposer.getBaseConfig` has had `|| WORKFLOW_PRESETS.full`
     * since it was written; this class is the one that never got it. `full`
     * is the same default `ConfigManager.normalizeConfig` picks for an
     * unrecognised mode, so the two agree.
     *
     * `mode` is normalised alongside the config rather than kept as given:
     * `getMode()` and `getSummary().mode` are reported to the user, and
     * saying "mode: nonsense" while running the full preset is a worse answer
     * than saying which preset is actually in force.
     */
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
