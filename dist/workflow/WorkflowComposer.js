"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowComposer = void 0;
const ConfigurableWorkflow_1 = require("./ConfigurableWorkflow");
class WorkflowComposer {
    constructor(config) {
        this.config = config;
    }
    getBaseConfig() {
        return this.config.workflow || ConfigurableWorkflow_1.WORKFLOW_PRESETS[this.config.mode] || ConfigurableWorkflow_1.WORKFLOW_PRESETS.full;
    }
    getCoreSteps() {
        return Array.isArray(this.getBaseConfig().core_required)
            ? [...this.getBaseConfig().core_required]
            : [];
    }
    getBaseOptionalSteps() {
        return this.getBaseConfig().optional_steps || {};
    }
    getActivatedBaseSteps(featureFlags) {
        const activated = [];
        for (const [stepName, stepConfig] of Object.entries(this.getBaseOptionalSteps())) {
            if (!stepConfig?.enabled) {
                continue;
            }
            if ((stepConfig.when || []).some(flag => featureFlags.includes(flag))) {
                activated.push(stepName);
            }
        }
        return activated;
    }
    getActivatedSteps(featureFlags) {
        return Array.from(new Set(this.getActivatedBaseSteps(featureFlags)));
    }
    getSupportedFlags() {
        return Array.isArray(this.getBaseConfig().feature_flags?.supported)
            ? Array.from(new Set(this.getBaseConfig().feature_flags.supported))
            : [];
    }
    getArchiveGate() {
        return this.getBaseConfig().archive_gate;
    }
    validateFlags(flags) {
        const supported = new Set(this.getSupportedFlags());
        const unsupported = flags.filter(flag => !supported.has(flag));
        return {
            valid: unsupported.length === 0,
            unsupported,
        };
    }
    getSummary(featureFlags) {
        const activatedSteps = this.getActivatedSteps(featureFlags);
        const validation = this.validateFlags(featureFlags);
        return {
            mode: this.config.mode,
            coreSteps: this.getCoreSteps().length,
            optionalSteps: activatedSteps,
            totalSteps: this.getCoreSteps().length + activatedSteps.length,
            flags: featureFlags,
            unsupportedFlags: validation.unsupported,
        };
    }
}
exports.WorkflowComposer = WorkflowComposer;
