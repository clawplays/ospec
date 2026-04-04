/**
 * 可配置工作流系统
 * 基于 OSpec 官方规范实现
 * 支持核心步骤 + 可选步骤 + Feature Flags
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
 * 3种预定义工作流模板
 */
export declare const WORKFLOW_PRESETS: Record<string, WorkflowConfigType>;
export declare class ConfigurableWorkflow {
    private config;
    private mode;
    constructor(mode: string);
    /**
     * 根据 feature flags 确定激活的可选步骤
     */
    getActivatedSteps(featureFlags: string[]): OptionalStep[];
    /**
     * 获取完整的工作流步骤（核心 + 激活的可选）
     */
    getFullWorkflow(featureFlags: string[]): string[];
    /**
     * 获取核心步骤
     */
    getCoreSteps(): CoreStep[];
    /**
     * 获取所有支持的 feature flags
     */
    getSupportedFlags(): string[];
    /**
     * 验证 feature flags
     */
    validateFlags(flags: string[]): {
        valid: boolean;
        unsupported: string[];
    };
    /**
     * 获取步骤的依赖关系
     */
    getStepDependencies(step: string): string[];
    /**
     * 获取工作流配置
     */
    getConfig(): WorkflowConfigType;
    /**
     * 获取存档门禁配置
     */
    getArchiveGate(): {
        require_verification: boolean;
        require_skill_update: boolean;
        require_index_regenerated: boolean;
        require_optional_steps_passed: boolean;
    };
    /**
     * 生成工作流摘要
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
     * 获取当前模式
     */
    getMode(): string;
}