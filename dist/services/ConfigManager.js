"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
exports.createConfigManager = createConfigManager;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const errors_1 = require("../core/errors");
const ConfigurableWorkflow_1 = require("../workflow/ConfigurableWorkflow");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");
class ConfigManager {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async loadConfig(rootDir) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        try {
            return this.normalizeConfig(await this.fileService.readJSON(configPath));
        }
        catch {
            throw new errors_1.ProjectNotInitializedError(`Cannot load .skillrc from ${rootDir}`);
        }
    }
    async saveConfig(rootDir, config) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        await this.fileService.writeJSON(configPath, config);
    }
    async getMode(rootDir) {
        const config = await this.loadConfig(rootDir);
        return config.mode;
    }
    async isInitialized(rootDir) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        return this.fileService.exists(configPath);
    }
    async createDefaultConfig(mode = 'full') {
        const workflow = ConfigurableWorkflow_1.WORKFLOW_PRESETS[mode];
        const defaultPolicy = mode === 'lite' ? 'off' : 'error';
        return {
            version: '4.0',
            mode,
            hooks: {
                'pre-commit': true,
                'post-merge': true,
                'spec-check': defaultPolicy,
                'change-check': defaultPolicy,
                'index-check': defaultPolicy,
            },
            index: {
                exclude: ['node_modules/**', 'dist/**', '*.test.*'],
            },
            archive: {
                layout: 'month-day',
            },
            plugins: this.createDefaultPluginsConfig(),
            workflow,
        };
    }
    createDefaultPluginsConfig() {
        return JSON.parse(JSON.stringify({
            stitch: PluginWorkflowComposer_1.DEFAULT_STITCH_PLUGIN_CONFIG,
            checkpoint: PluginWorkflowComposer_1.DEFAULT_CHECKPOINT_PLUGIN_CONFIG,
        }));
    }
    normalizeDocumentLanguage(input) {
        return input === 'en-US' || input === 'zh-CN' || input === 'ja-JP' || input === 'ar'
            ? input
            : undefined;
    }
    normalizePluginsConfig(plugins) {
        const defaults = this.createDefaultPluginsConfig();
        const stitch = plugins?.stitch && typeof plugins.stitch === 'object' ? plugins.stitch : {};
        const checkpoint = plugins?.checkpoint && typeof plugins.checkpoint === 'object' ? plugins.checkpoint : {};
        const legacyGemini = plugins?.['stitch-gemini'] && typeof plugins['stitch-gemini'] === 'object' ? plugins['stitch-gemini'] : {};
        const legacyCodex = plugins?.['stitch-codex'] && typeof plugins['stitch-codex'] === 'object' ? plugins['stitch-codex'] : {};
        const mergedStitch = {
            ...legacyGemini,
            ...legacyCodex,
            ...stitch,
            project: {
                ...(legacyGemini.project || {}),
                ...(legacyCodex.project || {}),
                ...(stitch.project || {}),
            },
            runner: {
                ...(legacyGemini.runner || {}),
                ...(legacyCodex.runner || {}),
                ...(stitch.runner || {}),
            },
            gemini: {
                ...(legacyGemini.gemini || {}),
                ...(stitch.gemini || {}),
            },
            codex: {
                ...(legacyCodex.codex || {}),
                ...(stitch.codex || {}),
            },
            capabilities: {
                page_design_review: {
                    ...((legacyGemini.capabilities && legacyGemini.capabilities.page_design_review) || {}),
                    ...((legacyCodex.capabilities && legacyCodex.capabilities.page_design_review) || {}),
                    ...((stitch.capabilities && stitch.capabilities.page_design_review) || {}),
                },
            },
        };
        const stitchProject = mergedStitch.project || {};
        const stitchGemini = mergedStitch.gemini || {};
        const stitchCodexConfig = mergedStitch.codex || {};
        const stitchRunner = mergedStitch.runner || {};
        const pageDesignReview = mergedStitch.capabilities?.page_design_review || {};
        const checkpointRuntime = checkpoint.runtime && typeof checkpoint.runtime === 'object' ? checkpoint.runtime : {};
        const checkpointStartup = checkpointRuntime.startup && typeof checkpointRuntime.startup === 'object' ? checkpointRuntime.startup : {};
        const checkpointReadiness = checkpointRuntime.readiness && typeof checkpointRuntime.readiness === 'object' ? checkpointRuntime.readiness : {};
        const checkpointAuth = checkpointRuntime.auth && typeof checkpointRuntime.auth === 'object' ? checkpointRuntime.auth : {};
        const checkpointShutdown = checkpointRuntime.shutdown && typeof checkpointRuntime.shutdown === 'object' ? checkpointRuntime.shutdown : {};
        const checkpointRunner = checkpoint.runner && typeof checkpoint.runner === 'object' ? checkpoint.runner : {};
        const checkpointCapabilities = checkpoint.capabilities && typeof checkpoint.capabilities === 'object' ? checkpoint.capabilities : {};
        const checkpointUiReview = checkpointCapabilities.ui_review && typeof checkpointCapabilities.ui_review === 'object' ? checkpointCapabilities.ui_review : {};
        const checkpointFlowCheck = checkpointCapabilities.flow_check && typeof checkpointCapabilities.flow_check === 'object' ? checkpointCapabilities.flow_check : {};
        const checkpointStitchIntegration = checkpoint.stitch_integration && typeof checkpoint.stitch_integration === 'object' ? checkpoint.stitch_integration : {};
        const activateWhenFlags = Array.isArray(pageDesignReview.activate_when_flags)
            ? Array.from(new Set(pageDesignReview.activate_when_flags
                .map(flag => String(flag).trim())
                .filter(Boolean)))
            : [...defaults.stitch.capabilities.page_design_review.activate_when_flags];
        const checkpointUiFlags = Array.isArray(checkpointUiReview.activate_when_flags)
            ? Array.from(new Set(checkpointUiReview.activate_when_flags
                .map(flag => String(flag).trim())
                .filter(Boolean)))
            : [...defaults.checkpoint.capabilities.ui_review.activate_when_flags];
        const checkpointFlowFlags = Array.isArray(checkpointFlowCheck.activate_when_flags)
            ? Array.from(new Set(checkpointFlowCheck.activate_when_flags
                .map(flag => String(flag).trim())
                .filter(Boolean)))
            : [...defaults.checkpoint.capabilities.flow_check.activate_when_flags];
        const normalizedProvider = typeof mergedStitch.provider === 'string' && mergedStitch.provider.trim().length > 0
            ? mergedStitch.provider.trim().toLowerCase()
            : defaults.stitch.provider;
        const provider = normalizedProvider === 'codex' ? 'codex' : 'gemini';
        const defaultRunnerArgs = provider === 'codex'
            ? ['${ospec_package_path}/dist/adapters/codex-stitch-adapter.js', '--change', '${change_path}', '--project', '${project_path}']
            : [...defaults.stitch.runner.args];
        const runnerArgs = Array.isArray(stitchRunner.args)
            ? stitchRunner.args.map(arg => String(arg)).filter(arg => arg.length > 0)
            : defaultRunnerArgs;
        const runnerExtraEnv = stitchRunner.extra_env && typeof stitchRunner.extra_env === 'object'
            ? Object.fromEntries(Object.entries(stitchRunner.extra_env)
                .map(([key, value]) => [String(key).trim(), String(value ?? '')])
                .filter(([key]) => key.length > 0))
            : { ...defaults.stitch.runner.extra_env };
        const checkpointRunnerArgs = Array.isArray(checkpointRunner.args)
            ? checkpointRunner.args.map(arg => String(arg)).filter(arg => arg.length > 0)
            : [...defaults.checkpoint.runner.args];
        const checkpointRunnerExtraEnv = checkpointRunner.extra_env && typeof checkpointRunner.extra_env === 'object'
            ? Object.fromEntries(Object.entries(checkpointRunner.extra_env)
                .map(([key, value]) => [String(key).trim(), String(value ?? '')])
                .filter(([key]) => key.length > 0))
            : { ...defaults.checkpoint.runner.extra_env };
        const runnerTimeout = Number.isFinite(stitchRunner.timeout_ms) && stitchRunner.timeout_ms > 0
            ? Math.floor(stitchRunner.timeout_ms)
            : defaults.stitch.runner.timeout_ms;
        const checkpointRunnerTimeout = Number.isFinite(checkpointRunner.timeout_ms) && checkpointRunner.timeout_ms > 0
            ? Math.floor(checkpointRunner.timeout_ms)
            : defaults.checkpoint.runner.timeout_ms;
        const normalizeCommandArgs = (value, fallback) => Array.isArray(value)
            ? value.map(arg => String(arg)).filter(arg => arg.length > 0)
            : [...fallback];
        const normalizeCommandTimeout = (value, fallback) => Number.isFinite(value) && value > 0
            ? Math.floor(value)
            : fallback;
        return {
            stitch: {
                enabled: mergedStitch.enabled === true,
                blocking: mergedStitch.blocking !== false,
                project: {
                    project_id: typeof stitchProject.project_id === 'string'
                        ? stitchProject.project_id.trim()
                        : defaults.stitch.project.project_id,
                    project_url: typeof stitchProject.project_url === 'string'
                        ? stitchProject.project_url.trim()
                        : defaults.stitch.project.project_url,
                    save_on_first_run: stitchProject.save_on_first_run !== false,
                    enforce_single_project: stitchProject.enforce_single_project !== false,
                },
                provider,
                gemini: {
                    model: typeof stitchGemini.model === 'string' && stitchGemini.model.trim().length > 0
                        ? stitchGemini.model.trim()
                        : defaults.stitch.gemini.model,
                    auto_switch_on_limit: stitchGemini.auto_switch_on_limit !== false,
                    save_on_fallback: stitchGemini.save_on_fallback !== false,
                },
                codex: {
                    model: typeof stitchCodexConfig.model === 'string'
                        ? stitchCodexConfig.model.trim()
                        : defaults.stitch.codex.model,
                    mcp_server: typeof stitchCodexConfig.mcp_server === 'string' && stitchCodexConfig.mcp_server.trim().length > 0
                        ? stitchCodexConfig.mcp_server.trim()
                        : defaults.stitch.codex.mcp_server,
                },
                runner: {
                    mode: stitchRunner.mode === 'command' ? 'command' : defaults.stitch.runner.mode,
                    command: typeof stitchRunner.command === 'string'
                        ? stitchRunner.command.trim()
                        : defaults.stitch.runner.command,
                    args: runnerArgs,
                    cwd: typeof stitchRunner.cwd === 'string'
                        ? stitchRunner.cwd.trim()
                        : defaults.stitch.runner.cwd,
                    timeout_ms: runnerTimeout,
                    token_env: typeof stitchRunner.token_env === 'string'
                        ? stitchRunner.token_env.trim()
                        : defaults.stitch.runner.token_env,
                    extra_env: runnerExtraEnv,
                },
                capabilities: {
                    page_design_review: {
                        enabled: pageDesignReview.enabled === true,
                        step: typeof pageDesignReview.step === 'string' && pageDesignReview.step.trim().length > 0
                            ? pageDesignReview.step.trim()
                            : defaults.stitch.capabilities.page_design_review.step,
                        activate_when_flags: activateWhenFlags,
                    },
                },
            },
            checkpoint: {
                enabled: checkpoint.enabled === true,
                blocking: checkpoint.blocking !== false,
                runtime: {
                    base_url: typeof checkpointRuntime.base_url === 'string'
                        ? checkpointRuntime.base_url.trim()
                        : defaults.checkpoint.runtime.base_url,
                    startup: {
                        command: typeof checkpointStartup.command === 'string'
                            ? checkpointStartup.command.trim()
                            : defaults.checkpoint.runtime.startup.command,
                        args: normalizeCommandArgs(checkpointStartup.args, defaults.checkpoint.runtime.startup.args),
                        cwd: typeof checkpointStartup.cwd === 'string'
                            ? checkpointStartup.cwd.trim()
                            : defaults.checkpoint.runtime.startup.cwd,
                        timeout_ms: normalizeCommandTimeout(checkpointStartup.timeout_ms, defaults.checkpoint.runtime.startup.timeout_ms),
                    },
                    readiness: {
                        type: typeof checkpointReadiness.type === 'string' && checkpointReadiness.type.trim().length > 0
                            ? checkpointReadiness.type.trim()
                            : defaults.checkpoint.runtime.readiness.type,
                        url: typeof checkpointReadiness.url === 'string'
                            ? checkpointReadiness.url.trim()
                            : defaults.checkpoint.runtime.readiness.url,
                        timeout_ms: normalizeCommandTimeout(checkpointReadiness.timeout_ms, defaults.checkpoint.runtime.readiness.timeout_ms),
                    },
                    auth: {
                        command: typeof checkpointAuth.command === 'string'
                            ? checkpointAuth.command.trim()
                            : defaults.checkpoint.runtime.auth.command,
                        args: normalizeCommandArgs(checkpointAuth.args, defaults.checkpoint.runtime.auth.args),
                        cwd: typeof checkpointAuth.cwd === 'string'
                            ? checkpointAuth.cwd.trim()
                            : defaults.checkpoint.runtime.auth.cwd,
                        timeout_ms: normalizeCommandTimeout(checkpointAuth.timeout_ms, defaults.checkpoint.runtime.auth.timeout_ms),
                        when: typeof checkpointAuth.when === 'string' && checkpointAuth.when.trim().length > 0
                            ? checkpointAuth.when.trim()
                            : defaults.checkpoint.runtime.auth.when,
                    },
                    shutdown: {
                        command: typeof checkpointShutdown.command === 'string'
                            ? checkpointShutdown.command.trim()
                            : defaults.checkpoint.runtime.shutdown.command,
                        args: normalizeCommandArgs(checkpointShutdown.args, defaults.checkpoint.runtime.shutdown.args),
                        cwd: typeof checkpointShutdown.cwd === 'string'
                            ? checkpointShutdown.cwd.trim()
                            : defaults.checkpoint.runtime.shutdown.cwd,
                        timeout_ms: normalizeCommandTimeout(checkpointShutdown.timeout_ms, defaults.checkpoint.runtime.shutdown.timeout_ms),
                    },
                    storage_state: typeof checkpointRuntime.storage_state === 'string'
                        ? checkpointRuntime.storage_state.trim()
                        : defaults.checkpoint.runtime.storage_state,
                },
                runner: {
                    mode: checkpointRunner.mode === 'command' ? 'command' : defaults.checkpoint.runner.mode,
                    command: typeof checkpointRunner.command === 'string'
                        ? checkpointRunner.command.trim()
                        : defaults.checkpoint.runner.command,
                    args: checkpointRunnerArgs,
                    cwd: typeof checkpointRunner.cwd === 'string'
                        ? checkpointRunner.cwd.trim()
                        : defaults.checkpoint.runner.cwd,
                    timeout_ms: checkpointRunnerTimeout,
                    token_env: typeof checkpointRunner.token_env === 'string'
                        ? checkpointRunner.token_env.trim()
                        : defaults.checkpoint.runner.token_env,
                    extra_env: checkpointRunnerExtraEnv,
                },
                capabilities: {
                    ui_review: {
                        enabled: checkpointUiReview.enabled === true,
                        step: typeof checkpointUiReview.step === 'string' && checkpointUiReview.step.trim().length > 0
                            ? checkpointUiReview.step.trim()
                            : defaults.checkpoint.capabilities.ui_review.step,
                        activate_when_flags: checkpointUiFlags,
                    },
                    flow_check: {
                        enabled: checkpointFlowCheck.enabled === true,
                        step: typeof checkpointFlowCheck.step === 'string' && checkpointFlowCheck.step.trim().length > 0
                            ? checkpointFlowCheck.step.trim()
                            : defaults.checkpoint.capabilities.flow_check.step,
                        activate_when_flags: checkpointFlowFlags,
                    },
                },
                stitch_integration: {
                    enabled: checkpointStitchIntegration.enabled !== false,
                    auto_pass_stitch_review: checkpointStitchIntegration.auto_pass_stitch_review !== false,
                },
            },
        };
    }
    normalizeConfig(config) {
        const mode = ['lite', 'standard', 'full'].includes(config.mode) ? config.mode : 'full';
        const archive = config.archive && typeof config.archive === 'object' ? config.archive : {};
        const hooks = config.hooks || {
            'pre-commit': true,
            'post-merge': true,
            'spec-check': 'error',
        };
        const fallbackPolicy = hooks['spec-check'] ?? 'error';
        const normalizedHooks = {
            'pre-commit': hooks['pre-commit'] !== false,
            'post-merge': hooks['post-merge'] !== false,
            'spec-check': fallbackPolicy,
            'change-check': hooks['change-check'] ?? fallbackPolicy,
            'index-check': hooks['index-check'] ?? fallbackPolicy,
        };
        const legacyWarnDefaults = config.version === '3.0' &&
            config.mode !== 'lite' &&
            normalizedHooks['pre-commit'] &&
            normalizedHooks['post-merge'] &&
            normalizedHooks['spec-check'] === 'warn' &&
            normalizedHooks['change-check'] === 'warn' &&
            normalizedHooks['index-check'] === 'warn';
        return {
            ...config,
            version: config.version === '3.0' ? '4.0' : config.version,
            mode,
            documentLanguage: this.normalizeDocumentLanguage(config.documentLanguage),
            archive: {
                layout: archive.layout === 'month-day' ? 'month-day' : 'flat',
            },
            hooks: {
                ...normalizedHooks,
                ...(legacyWarnDefaults
                    ? {
                        'spec-check': 'error',
                        'change-check': 'error',
                        'index-check': 'error',
                    }
                    : {}),
            },
            plugins: this.normalizePluginsConfig(config.plugins),
            workflow: config.workflow || ConfigurableWorkflow_1.WORKFLOW_PRESETS[mode],
        };
    }
}
exports.ConfigManager = ConfigManager;
function createConfigManager(fileService) {
    return new ConfigManager(fileService);
}
