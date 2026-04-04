"use strict";
/**
 * 可配置工作流系统
 * 基于 OSpec 官方规范实现
 * 支持核心步骤 + 可选步骤 + Feature Flags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurableWorkflow = exports.WORKFLOW_PRESETS = void 0;
/**
 * 3种预定义工作流模板
 */
exports.WORKFLOW_PRESETS = {
    lite: {
        core_required: ['proposal', 'tasks', 'state', 'verification', 'skill_update', 'index_regenerated'],
        optional_steps: {
            code_review: { enabled: true, when: ['high_risk', 'multi_file_change'] },
            design_doc: { enabled: false, when: [] },
            plan_doc: { enabled: false, when: [] },
            security_review: { enabled: false, when: [] },
            adr: { enabled: false, when: [] },
            db_change_doc: { enabled: false, when: [] },
            api_change_doc: { enabled: false, when: [] },
        },
        archive_gate: {
            require_verification: true,
            require_skill_update: true,
            require_index_regenerated: true,
            require_optional_steps_passed: true,
        },
        feature_flags: {
            supported: ['high_risk', 'multi_file_change'],
        },
    },
    standard: {
        core_required: ['proposal', 'tasks', 'state', 'verification', 'skill_update', 'index_regenerated'],
        optional_steps: {
            code_review: { enabled: true, when: ['high_risk', 'multi_file_change'] },
            design_doc: { enabled: true, when: ['cross_module', 'complex_feature'] },
            plan_doc: { enabled: true, when: ['large_feature', 'multi_phase'] },
            security_review: { enabled: true, when: ['security_related', 'auth', 'payment'] },
            adr: { enabled: false, when: [] },
            db_change_doc: { enabled: false, when: [] },
            api_change_doc: { enabled: true, when: ['public_api_change'] },
        },
        archive_gate: {
            require_verification: true,
            require_skill_update: true,
            require_index_regenerated: true,
            require_optional_steps_passed: true,
        },
        feature_flags: {
            supported: [
                'cross_module', 'complex_feature', 'large_feature', 'multi_phase',
                'high_risk', 'multi_file_change', 'security_related', 'auth', 'payment', 'public_api_change',
            ],
        },
    },
    full: {
        core_required: ['proposal', 'tasks', 'state', 'verification', 'skill_update', 'index_regenerated'],
        optional_steps: {
            code_review: { enabled: true, when: ['high_risk', 'cross_module', 'multi_file_change'] },
            design_doc: { enabled: true, when: ['cross_module', 'complex_feature', 'architecture_change'] },
            plan_doc: { enabled: true, when: ['large_feature', 'multi_phase', 'important_decision'] },
            security_review: { enabled: true, when: ['security_related', 'auth', 'payment', 'external_api'] },
            adr: { enabled: true, when: ['architecture_change', 'important_decision'] },
            db_change_doc: { enabled: true, when: ['db_schema_change'] },
            api_change_doc: { enabled: true, when: ['public_api_change'] },
        },
        archive_gate: {
            require_verification: true,
            require_skill_update: true,
            require_index_regenerated: true,
            require_optional_steps_passed: true,
        },
        feature_flags: {
            supported: [
                'cross_module', 'complex_feature', 'large_feature', 'multi_phase',
                'architecture_change', 'important_decision', 'multi_file_change',
                'security_related', 'auth', 'payment', 'external_api',
                'db_schema_change', 'public_api_change', 'high_risk',
            ],
        },
    },
};
class ConfigurableWorkflow {
    constructor(mode) {
        this.mode = mode;
        this.config = exports.WORKFLOW_PRESETS[mode];
    }
    /**
     * 根据 feature flags 确定激活的可选步骤
     */
    getActivatedSteps(featureFlags) {
        const activated = [];
        for (const [stepName, stepConfig] of Object.entries(this.config.optional_steps)) {
            if (!stepConfig.enabled)
                continue;
            // 检查 feature flags 与 step.when 是否有交集
            const hasMatch = stepConfig.when.some(flag => featureFlags.includes(flag));
            if (hasMatch) {
                activated.push(stepName);
            }
        }
        return activated;
    }
    /**
     * 获取完整的工作流步骤（核心 + 激活的可选）
     */
    getFullWorkflow(featureFlags) {
        const activated = this.getActivatedSteps(featureFlags);
        return [...this.config.core_required, ...activated];
    }
    /**
     * 获取核心步骤
     */
    getCoreSteps() {
        return this.config.core_required;
    }
    /**
     * 获取所有支持的 feature flags
     */
    getSupportedFlags() {
        return this.config.feature_flags.supported;
    }
    /**
     * 验证 feature flags
     */
    validateFlags(flags) {
        const supported = new Set(this.config.feature_flags.supported);
        const unsupported = flags.filter(flag => !supported.has(flag));
        return {
            valid: unsupported.length === 0,
            unsupported,
        };
    }
    /**
     * 获取步骤的依赖关系
     */
    getStepDependencies(step) {
        const dependencies = {
            code_review: ['verify'],
            design_doc: ['proposal'],
            plan_doc: ['proposal'],
            security_review: ['verify'],
            adr: ['proposal'],
            db_change_doc: ['verify'],
            api_change_doc: ['verify'],
        };
        return dependencies[step] || [];
    }
    /**
     * 获取工作流配置
     */
    getConfig() {
        return this.config;
    }
    /**
     * 获取存档门禁配置
     */
    getArchiveGate() {
        return this.config.archive_gate;
    }
    /**
     * 生成工作流摘要
     */
    getSummary(featureFlags) {
        const activated = this.getActivatedSteps(featureFlags);
        const validation = this.validateFlags(featureFlags);
        return {
            mode: this.mode,
            coreSteps: this.config.core_required.length,
            optionalSteps: activated,
            totalSteps: this.config.core_required.length + activated.length,
            flags: featureFlags,
            unsupportedFlags: validation.unsupported,
        };
    }
    /**
     * 获取当前模式
     */
    getMode() {
        return this.mode;
    }
}
exports.ConfigurableWorkflow = ConfigurableWorkflow;