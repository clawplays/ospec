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
        args: ['${plugin_package_path}/dist/gemini-stitch-adapter.js', '--change', '${change_path}', '--project', '${project_path}'],
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
        args: ['${plugin_package_path}/dist/playwright-checkpoint-adapter.js', '--change', '${change_path}', '--project', '${project_path}'],
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
        const plugins = this.config.plugins && typeof this.config.plugins === 'object'
            ? this.config.plugins
            : {};
        return Object.entries(plugins)
            .filter(([, pluginConfig]) => pluginConfig?.enabled === true)
            .map(([name, pluginConfig]) => ({
            name,
            blocking: pluginConfig?.blocking !== false,
        }));
    }
    getStitchCapabilities() {
        return this.getPluginCapabilities().filter(item => item.plugin === 'stitch');
    }
    getCheckpointCapabilities() {
        return this.getPluginCapabilities().filter(item => item.plugin === 'checkpoint');
    }
    getPluginCapabilities() {
        const capabilities = [];
        const plugins = this.config.plugins && typeof this.config.plugins === 'object'
            ? this.config.plugins
            : {};
        for (const [pluginName, pluginConfig] of Object.entries(plugins)) {
            if (!pluginConfig?.enabled) {
                continue;
            }
            const pluginCapabilities = pluginConfig.capabilities && typeof pluginConfig.capabilities === 'object'
                ? pluginConfig.capabilities
                : {};
            for (const [capabilityName, capabilityConfig] of Object.entries(pluginCapabilities)) {
                if (!capabilityConfig?.enabled) {
                    continue;
                }
                const step = typeof capabilityConfig.step === 'string' && capabilityConfig.step.trim().length > 0
                    ? capabilityConfig.step.trim()
                    : '';
                if (!step) {
                    continue;
                }
                capabilities.push({
                    plugin: pluginName,
                    capability: capabilityName,
                    step,
                    activateWhenFlags: Array.isArray(capabilityConfig.activate_when_flags)
                        ? capabilityConfig.activate_when_flags.map((flag) => String(flag).trim()).filter(Boolean)
                        : [],
                    blocking: capabilityConfig?.blocking !== false && pluginConfig?.blocking !== false,
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
