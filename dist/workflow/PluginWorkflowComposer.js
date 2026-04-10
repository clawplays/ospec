"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginWorkflowComposer = exports.DEFAULT_CHECKPOINT_PLUGIN_CONFIG = exports.DEFAULT_STITCH_PLUGIN_CONFIG = void 0;
const ConfigurableWorkflow_1 = require("./ConfigurableWorkflow");
exports.DEFAULT_STITCH_PLUGIN_CONFIG = {
    enabled: false,
    blocking: true,
    project: {
        project_id: '',
        project_url: '',
        save_on_first_run: true,
        enforce_single_project: true,
    },
    gemini: {
        model: 'gemini-3-flash-preview',
        auto_switch_on_limit: true,
        save_on_fallback: true,
    },
    codex: {
        model: '',
        mcp_server: 'stitch',
    },
    runner: {
        mode: 'command',
        command: 'node',
        args: ['${ospec_package_path}/dist/adapters/gemini-stitch-adapter.js', '--change', '${change_path}', '--project', '${project_path}'],
        cwd: '${project_path}',
        timeout_ms: 900000,
        token_env: '',
        extra_env: {},
    },
    provider: 'gemini',
    capabilities: {
        page_design_review: {
            enabled: false,
            step: 'stitch_design_review',
            activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
        },
    },
};
exports.DEFAULT_CHECKPOINT_PLUGIN_CONFIG = {
    enabled: false,
    blocking: true,
    runtime: {
        base_url: '',
        startup: {
            command: '',
            args: [],
            cwd: '${project_path}',
            timeout_ms: 600000,
        },
        readiness: {
            type: 'url',
            url: '',
            timeout_ms: 180000,
        },
        auth: {
            command: '',
            args: [],
            cwd: '${project_path}',
            timeout_ms: 300000,
            when: 'missing_storage_state',
        },
        shutdown: {
            command: '',
            args: [],
            cwd: '${project_path}',
            timeout_ms: 120000,
        },
        storage_state: '.ospec/plugins/checkpoint/auth/storage-state.json',
    },
    runner: {
        mode: 'command',
        command: 'node',
        args: ['${ospec_package_path}/dist/adapters/playwright-checkpoint-adapter.js', '--change', '${change_path}', '--project', '${project_path}'],
        cwd: '${project_path}',
        timeout_ms: 900000,
        token_env: '',
        extra_env: {},
    },
    capabilities: {
        ui_review: {
            enabled: false,
            step: 'checkpoint_ui_review',
            activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
        },
        flow_check: {
            enabled: false,
            step: 'checkpoint_flow_check',
            activate_when_flags: ['feature_flow', 'api_change', 'backend_change', 'integration_change'],
        },
    },
    stitch_integration: {
        enabled: true,
        auto_pass_stitch_review: true,
    },
};
class PluginWorkflowComposer {
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
    getEnabledPlugins() {
        const plugins = [];
        const stitchConfig = this.config.plugins?.stitch;
        if (stitchConfig?.enabled) {
            plugins.push({
                name: 'stitch',
                blocking: stitchConfig.blocking !== false,
            });
        }
        const checkpointConfig = this.config.plugins?.checkpoint;
        if (checkpointConfig?.enabled) {
            plugins.push({
                name: 'checkpoint',
                blocking: checkpointConfig.blocking !== false,
            });
        }
        return plugins;
    }
    getStitchCapabilities() {
        return this.getPluginCapabilities().filter(item => item.plugin === 'stitch');
    }
    getCheckpointCapabilities() {
        return this.getPluginCapabilities().filter(item => item.plugin === 'checkpoint');
    }
    getPluginCapabilities() {
        const capabilities = [];
        const stitchConfig = this.config.plugins?.stitch;
        if (stitchConfig?.enabled) {
            const pageDesignReview = stitchConfig.capabilities?.page_design_review;
            if (pageDesignReview?.enabled) {
                capabilities.push({
                    plugin: 'stitch',
                    capability: 'page_design_review',
                    step: pageDesignReview.step,
                    activateWhenFlags: [...pageDesignReview.activate_when_flags],
                    blocking: stitchConfig.blocking !== false,
                });
            }
        }
        const checkpointConfig = this.config.plugins?.checkpoint;
        if (checkpointConfig?.enabled) {
            const uiReview = checkpointConfig.capabilities?.ui_review;
            if (uiReview?.enabled) {
                capabilities.push({
                    plugin: 'checkpoint',
                    capability: 'ui_review',
                    step: uiReview.step,
                    activateWhenFlags: [...uiReview.activate_when_flags],
                    blocking: checkpointConfig.blocking !== false,
                });
            }
            const flowCheck = checkpointConfig.capabilities?.flow_check;
            if (flowCheck?.enabled) {
                capabilities.push({
                    plugin: 'checkpoint',
                    capability: 'flow_check',
                    step: flowCheck.step,
                    activateWhenFlags: [...flowCheck.activate_when_flags],
                    blocking: checkpointConfig.blocking !== false,
                });
            }
        }
        return capabilities;
    }
    getPluginContributedSteps() {
        return Array.from(new Set(this.getPluginCapabilities().map(item => item.step)));
    }
    getActivatedPluginSteps(featureFlags) {
        return this.getPluginCapabilities()
            .filter(item => item.activateWhenFlags.some(flag => featureFlags.includes(flag)))
            .map(item => item.step);
    }
    getActivatedSteps(featureFlags) {
        return Array.from(new Set([
            ...this.getActivatedBaseSteps(featureFlags),
            ...this.getActivatedPluginSteps(featureFlags),
        ]));
    }
    getSupportedFlags() {
        const baseFlags = Array.isArray(this.getBaseConfig().feature_flags?.supported)
            ? this.getBaseConfig().feature_flags.supported
            : [];
        const pluginFlags = this.getPluginCapabilities()
            .flatMap(item => item.activateWhenFlags);
        return Array.from(new Set([...baseFlags, ...pluginFlags]));
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
        const activatedPluginSteps = this.getActivatedPluginSteps(featureFlags);
        const validation = this.validateFlags(featureFlags);
        return {
            mode: this.config.mode,
            coreSteps: this.getCoreSteps().length,
            optionalSteps: activatedSteps,
            pluginSteps: activatedPluginSteps,
            totalSteps: this.getCoreSteps().length + activatedSteps.length,
            enabledPlugins: this.getEnabledPlugins().map(plugin => plugin.name),
            flags: featureFlags,
            unsupportedFlags: validation.unsupported,
        };
    }
}
exports.PluginWorkflowComposer = PluginWorkflowComposer;