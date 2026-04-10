"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginsCommand = void 0;
const child_process_1 = require("child_process");
const path = require("path");
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const BaseCommand_1 = require("./BaseCommand");
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
class PluginsCommand extends BaseCommand_1.BaseCommand {
    async execute(action, ...args) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getPluginsHelpText)());
                return;
            }
            switch (action) {
                case 'list': {
                    await this.listPlugins(args[0] || process.cwd());
                    break;
                }
                case 'status': {
                    await this.showStatus(args[0] || process.cwd());
                    break;
                }
                case 'doctor': {
                    if (args.length === 0) {
                        console.error('Usage: ospec plugins doctor <plugin> [path]');
                        process.exit(1);
                    }
                    const parsedDoctorArgs = this.parsePluginProjectArgs(args.slice(1));
                    if (parsedDoctorArgs.options.base_url) {
                        throw new Error('doctor does not accept --base-url. Use "ospec plugins enable checkpoint --base-url <url>" to update checkpoint runtime.base_url.');
                    }
                    await this.doctorPlugin(args[0], parsedDoctorArgs.projectPath || process.cwd());
                    break;
                }
                case 'enable': {
                    if (args.length === 0) {
                        console.error('Usage: ospec plugins enable <plugin> [path] [--base-url <url>]');
                        process.exit(1);
                    }
                    const parsedEnableArgs = this.parsePluginProjectArgs(args.slice(1));
                    await this.setPluginEnabled(args[0], true, parsedEnableArgs.projectPath || process.cwd(), parsedEnableArgs.options);
                    break;
                }
                case 'disable': {
                    if (args.length === 0) {
                        console.error('Usage: ospec plugins disable <plugin> [path]');
                        process.exit(1);
                    }
                    const parsedDisableArgs = this.parsePluginProjectArgs(args.slice(1));
                    await this.setPluginEnabled(args[0], false, parsedDisableArgs.projectPath || process.cwd(), parsedDisableArgs.options);
                    break;
                }
                case 'run': {
                    if (args.length < 2) {
                        console.error('Usage: ospec plugins run <plugin> <change-path>');
                        process.exit(1);
                    }
                    await this.runPlugin(args[0], args[1]);
                    break;
                }
                case 'approve': {
                    if (args.length < 2) {
                        console.error('Usage: ospec plugins approve stitch <change-path>');
                        process.exit(1);
                    }
                    await this.setPluginApproval(args[0], 'approved', args[1]);
                    break;
                }
                case 'reject': {
                    if (args.length < 2) {
                        console.error('Usage: ospec plugins reject stitch <change-path>');
                        process.exit(1);
                    }
                    await this.setPluginApproval(args[0], 'rejected', args[1]);
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getPluginsHelpText)());
            }
        }
        catch (error) {
            this.error(`Plugins command failed: ${error}`);
            throw error;
        }
    }
    async listPlugins(projectPath) {
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const plugins = this.getPluginEntries(config);
        console.log('\nAvailable Plugins:');
        console.log('==================\n');
        if (plugins.length === 0) {
            console.log('  (none)');
            console.log('\n' + '='.repeat(18) + '\n');
            return;
        }
        plugins.forEach(plugin => {
            console.log(`  - ${plugin.name}`);
            console.log(`    Enabled: ${plugin.enabled ? 'yes' : 'no'}`);
            console.log(`    Blocking: ${plugin.blocking ? 'yes' : 'no'}`);
            console.log(`    Capabilities: ${plugin.capabilities.length}`);
            if (plugin.runner) {
                console.log(`    Runner configured: ${plugin.runner.configured ? 'yes' : 'no'}`);
            }
        });
        console.log('\n' + '='.repeat(18) + '\n');
    }
    async showStatus(projectPath) {
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const plugins = this.getPluginEntries(config);
        console.log('\nPlugin Status:');
        console.log('==============\n');
        console.log(`Project: ${projectPath}\n`);
        if (plugins.length === 0) {
            console.log('No plugins configured.\n');
            console.log('='.repeat(14) + '\n');
            return;
        }
        plugins.forEach(plugin => {
            console.log(`${plugin.name.toUpperCase()}: ${plugin.enabled ? 'ENABLED' : 'DISABLED'}`);
            console.log(`  Blocking: ${plugin.blocking ? 'yes' : 'no'}`);
            if (plugin.runtimeBaseUrl) {
                console.log(`  Base URL: ${plugin.runtimeBaseUrl}`);
            }
            if (plugin.storageState) {
                console.log(`  Storage state: ${plugin.storageState}`);
            }
            if (plugin.capabilities.length === 0) {
                console.log('  Capabilities: (none)');
            }
            else {
                console.log('  Capabilities:');
                plugin.capabilities.forEach(capability => {
                    console.log(`    - ${capability.name}: ${capability.enabled ? 'enabled' : 'disabled'}`);
                    if (capability.step) {
                        console.log(`      Step: ${capability.step}`);
                    }
                    if (capability.activateWhenFlags.length > 0) {
                        console.log(`      Triggers: ${capability.activateWhenFlags.join(', ')}`);
                    }
                });
            }
            if (plugin.runner) {
                console.log('  Runner:');
                console.log(`    Mode: ${plugin.runner.mode}`);
                console.log(`    Configured: ${plugin.runner.configured ? 'yes' : 'no'}`);
                console.log(`    Command: ${plugin.runner.command || '(not set)'}`);
                if (plugin.runner.source) {
                    console.log(`    Source: ${plugin.runner.source}`);
                }
                console.log(`    Cwd: ${plugin.runner.cwd || '(project root)'}`);
                console.log(`    Timeout: ${plugin.runner.timeoutMs}ms`);
                if (plugin.runner.tokenEnv) {
                    console.log(`    Token env: ${plugin.runner.tokenEnv} (${plugin.runner.tokenPresent ? 'set' : 'missing'})`);
                }
                else {
                    console.log('    Token env: (not required)');
                }
                if (plugin.runner.extraEnvCount > 0) {
                    console.log(`    Extra env entries: ${plugin.runner.extraEnvCount}`);
                }
                console.log(`    Doctor: ${(0, helpers_1.formatCliCommand)('ospec', 'plugins', 'doctor', plugin.name, projectPath)}`);
            }
            console.log();
        });
        console.log('Note: plugin changes affect new changes by default.');
        console.log('Existing active changes should be migrated explicitly later.\n');
        console.log('='.repeat(14) + '\n');
    }
    async setPluginEnabled(pluginName, enabled, projectPath, options = {}) {
        const normalizedName = this.resolvePluginAlias(pluginName);
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const nextConfig = JSON.parse(JSON.stringify(config));
        switch (normalizedName) {
            case 'stitch': {
                if (options.base_url) {
                    throw new Error('stitch does not accept --base-url. Only checkpoint requires a runtime base URL.');
                }
                nextConfig.plugins = nextConfig.plugins || {};
                nextConfig.plugins.stitch = nextConfig.plugins.stitch || this.createDefaultStitchPluginConfig();
                nextConfig.plugins.stitch.runner = nextConfig.plugins.stitch.runner || this.createDefaultStitchPluginConfig().runner;
                nextConfig.plugins.stitch.gemini = nextConfig.plugins.stitch.gemini || {
                    model: 'gemini-3-flash-preview',
                    auto_switch_on_limit: true,
                    save_on_fallback: true,
                };
                nextConfig.plugins.stitch.codex = nextConfig.plugins.stitch.codex || {
                    model: '',
                    mcp_server: 'stitch',
                };
                if (!nextConfig.plugins.stitch.provider) {
                    nextConfig.plugins.stitch.provider = 'gemini';
                }
                const provider = this.getStitchProvider(nextConfig.plugins.stitch);
                if (!nextConfig.plugins.stitch.runner.command) {
                    nextConfig.plugins.stitch.runner.command = 'node';
                }
                if (!Array.isArray(nextConfig.plugins.stitch.runner.args) ||
                    nextConfig.plugins.stitch.runner.args.length === 0 ||
                    this.isBuiltInGeminiRunner(nextConfig.plugins.stitch.runner) ||
                    this.isBuiltInCodexRunner(nextConfig.plugins.stitch.runner)) {
                    nextConfig.plugins.stitch.runner.args = this.getDefaultRunnerArgs(provider);
                }
                if (!nextConfig.plugins.stitch.runner.cwd) {
                    nextConfig.plugins.stitch.runner.cwd = '${project_path}';
                }
                if (typeof nextConfig.plugins.stitch.runner.token_env !== 'string' || (provider === 'gemini' && this.isBuiltInGeminiRunner(nextConfig.plugins.stitch.runner) && nextConfig.plugins.stitch.runner.token_env.trim() === 'STITCH_API_TOKEN')) {
                    nextConfig.plugins.stitch.runner.token_env = '';
                }
                nextConfig.plugins.stitch.capabilities = nextConfig.plugins.stitch.capabilities || {};
                nextConfig.plugins.stitch.capabilities.page_design_review = nextConfig.plugins.stitch.capabilities.page_design_review || {
                    enabled: false,
                    step: 'stitch_design_review',
                    activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
                };
                nextConfig.plugins.stitch.enabled = enabled;
                nextConfig.plugins.stitch.capabilities.page_design_review.enabled = enabled;
                if (enabled) {
                    await this.ensureStitchWorkspaceScaffold(projectPath, nextConfig.plugins.stitch);
                }
                await services_1.services.configManager.saveConfig(projectPath, nextConfig);
                this.success(`${enabled ? 'Enabled' : 'Disabled'} plugin stitch for ${projectPath}`);
                this.info(`  page_design_review: ${enabled ? 'enabled' : 'disabled'}`);
                this.info(`  provider: ${provider}`);
                this.info(`  runner.command: ${nextConfig.plugins.stitch.runner.command || '(built-in adapter)'}`);
                this.info(`  canonical project: ${nextConfig.plugins.stitch.project?.project_id || '(save on first successful run)'}`);
                this.info(`  gemini model: ${this.getStitchGeminiConfig(nextConfig.plugins.stitch).model}`);
                this.info(`  codex model: ${this.getStitchCodexConfig(nextConfig.plugins.stitch).model || '(cli default)'}`);
                if (enabled) {
                    this.info(`  token env: ${nextConfig.plugins.stitch.runner.token_env || '(not required)'}`);
                    this.info(`  doctor: ${(0, helpers_1.formatCliCommand)('ospec', 'plugins', 'doctor', 'stitch', projectPath)}`);
                }
                this.info('  Affects new changes by default; update existing changes manually if needed');
                return;
            }
            case 'checkpoint': {
                if (!enabled && options.base_url) {
                    throw new Error('disable checkpoint does not accept --base-url.');
                }
                nextConfig.plugins = nextConfig.plugins || {};
                nextConfig.plugins.checkpoint = nextConfig.plugins.checkpoint || this.createDefaultCheckpointPluginConfig();
                nextConfig.plugins.checkpoint.runtime = nextConfig.plugins.checkpoint.runtime || this.createDefaultCheckpointPluginConfig().runtime;
                nextConfig.plugins.checkpoint.runner = nextConfig.plugins.checkpoint.runner || this.createDefaultCheckpointPluginConfig().runner;
                nextConfig.plugins.checkpoint.capabilities = nextConfig.plugins.checkpoint.capabilities || {};
                nextConfig.plugins.checkpoint.capabilities.ui_review = nextConfig.plugins.checkpoint.capabilities.ui_review || {
                    enabled: false,
                    step: 'checkpoint_ui_review',
                    activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
                };
                nextConfig.plugins.checkpoint.capabilities.flow_check = nextConfig.plugins.checkpoint.capabilities.flow_check || {
                    enabled: false,
                    step: 'checkpoint_flow_check',
                    activate_when_flags: ['feature_flow', 'api_change', 'backend_change', 'integration_change'],
                };
                nextConfig.plugins.checkpoint.stitch_integration = nextConfig.plugins.checkpoint.stitch_integration || {
                    enabled: true,
                    auto_pass_stitch_review: true,
                };
                nextConfig.plugins.checkpoint.runtime.startup = nextConfig.plugins.checkpoint.runtime.startup || this.createDefaultCheckpointPluginConfig().runtime.startup;
                nextConfig.plugins.checkpoint.runtime.readiness = nextConfig.plugins.checkpoint.runtime.readiness || this.createDefaultCheckpointPluginConfig().runtime.readiness;
                nextConfig.plugins.checkpoint.runtime.auth = nextConfig.plugins.checkpoint.runtime.auth || this.createDefaultCheckpointPluginConfig().runtime.auth;
                nextConfig.plugins.checkpoint.runtime.shutdown = nextConfig.plugins.checkpoint.runtime.shutdown || this.createDefaultCheckpointPluginConfig().runtime.shutdown;
                const requestedBaseUrl = typeof options.base_url === 'string' ? options.base_url.trim() : '';
                const persistedBaseUrl = typeof nextConfig.plugins.checkpoint.runtime.base_url === 'string'
                    ? nextConfig.plugins.checkpoint.runtime.base_url.trim()
                    : '';
                const effectiveBaseUrl = requestedBaseUrl || persistedBaseUrl;
                if (enabled) {
                    if (!effectiveBaseUrl) {
                        throw new Error('checkpoint requires --base-url <url> the first time it is enabled.');
                    }
                    if (!this.isHttpUrl(effectiveBaseUrl)) {
                        throw new Error(`Invalid checkpoint base URL: ${effectiveBaseUrl}`);
                    }
                    nextConfig.plugins.checkpoint.runtime.base_url = effectiveBaseUrl;
                    if (!nextConfig.plugins.checkpoint.runtime.readiness.url) {
                        nextConfig.plugins.checkpoint.runtime.readiness.url = effectiveBaseUrl;
                    }
                }
                if (!nextConfig.plugins.checkpoint.runner.command) {
                    nextConfig.plugins.checkpoint.runner.command = 'node';
                }
                if (!Array.isArray(nextConfig.plugins.checkpoint.runner.args) ||
                    nextConfig.plugins.checkpoint.runner.args.length === 0 ||
                    this.isBuiltInCheckpointRunner(nextConfig.plugins.checkpoint.runner)) {
                    nextConfig.plugins.checkpoint.runner.args = this.getDefaultCheckpointRunnerArgs();
                }
                if (!nextConfig.plugins.checkpoint.runner.cwd) {
                    nextConfig.plugins.checkpoint.runner.cwd = '${project_path}';
                }
                if (typeof nextConfig.plugins.checkpoint.runner.token_env !== 'string') {
                    nextConfig.plugins.checkpoint.runner.token_env = '';
                }
                nextConfig.plugins.checkpoint.enabled = enabled;
                nextConfig.plugins.checkpoint.capabilities.ui_review.enabled = enabled;
                nextConfig.plugins.checkpoint.capabilities.flow_check.enabled = enabled;
                let dependencyInstallResult = null;
                if (enabled) {
                    await this.ensureCheckpointWorkspaceScaffold(projectPath, nextConfig.plugins.checkpoint);
                    if (this.isBuiltInCheckpointRunner(nextConfig.plugins.checkpoint.runner)) {
                        dependencyInstallResult = await this.installCheckpointProjectDependencies(projectPath);
                    }
                }
                await services_1.services.configManager.saveConfig(projectPath, nextConfig);
                this.success(`${enabled ? 'Enabled' : 'Disabled'} plugin checkpoint for ${projectPath}`);
                this.info(`  ui_review: ${enabled ? 'enabled' : 'disabled'}`);
                this.info(`  flow_check: ${enabled ? 'enabled' : 'disabled'}`);
                this.info(`  base_url: ${nextConfig.plugins.checkpoint.runtime.base_url || '(not set)'}`);
                this.info(`  readiness.url: ${nextConfig.plugins.checkpoint.runtime.readiness?.url || '(not set)'}`);
                this.info(`  auth.command: ${nextConfig.plugins.checkpoint.runtime.auth?.command || '(not set)'}`);
                this.info(`  storage_state: ${nextConfig.plugins.checkpoint.runtime.storage_state || '(not set)'}`);
                this.info(`  runner.command: ${nextConfig.plugins.checkpoint.runner.command || '(built-in adapter)'}`);
                this.info(`  stitch integration: ${nextConfig.plugins.checkpoint.stitch_integration.enabled ? 'enabled' : 'disabled'}`);
                if (enabled) {
                    if (dependencyInstallResult) {
                        this.info(`  checkpoint deps: ${dependencyInstallResult.installedNow.length > 0
                            ? `installed into the target project with ${dependencyInstallResult.packageManager}: ${dependencyInstallResult.installedNow.join(', ')}`
                            : `already available in the target project (${dependencyInstallResult.packageManager})`}`);
                        this.info('  note: AI/chat-based checkpoint enable must include this dependency install step');
                        this.info('  note: disabling checkpoint later will not uninstall these project dependencies');
                    }
                    this.info(`  doctor: ${(0, helpers_1.formatCliCommand)('ospec', 'plugins', 'doctor', 'checkpoint', projectPath)}`);
                }
                else {
                    this.info('  note: disabling checkpoint does not uninstall any previously installed checkpoint project dependencies');
                }
                this.info('  Affects new changes by default; update existing changes manually if needed');
                return;
            }
            default:
                throw new Error(`Unsupported plugin: ${pluginName}`);
        }
    }
    async doctorPlugin(pluginName, projectPath) {
        const normalizedName = this.resolvePluginAlias(pluginName);
        switch (normalizedName) {
            case 'stitch':
                await this.doctorStitch(projectPath);
                return;
            case 'checkpoint':
                await this.doctorCheckpoint(projectPath);
                return;
            default:
                throw new Error(`Unsupported plugin: ${pluginName}`);
        }
    }
    async doctorStitch(projectPath) {
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const stitchConfig = config.plugins?.stitch;
        const provider = this.getStitchProvider(stitchConfig);
        const checks = [];
        checks.push({
            name: 'plugin.enabled',
            status: stitchConfig?.enabled ? 'pass' : 'fail',
            message: stitchConfig?.enabled
                ? 'stitch plugin is enabled for this project'
                : 'stitch plugin is disabled. Run "ospec plugins enable stitch <project-path>" first.',
        });
        const capabilityEnabled = stitchConfig?.capabilities?.page_design_review?.enabled === true;
        checks.push({
            name: 'capability.page_design_review',
            status: capabilityEnabled ? 'pass' : 'fail',
            message: capabilityEnabled
                ? 'page_design_review capability is enabled'
                : 'page_design_review capability is disabled',
        });
        checks.push({
            name: 'provider',
            status: provider ? 'pass' : 'warn',
            message: `Configured provider is ${provider}`,
        });
        const runner = this.getEffectiveStitchRunnerConfig(stitchConfig, stitchConfig?.runner);
        const runnerMode = typeof runner?.mode === 'string' ? runner.mode : 'command';
        checks.push({
            name: 'runner.mode',
            status: runnerMode === 'command' ? 'pass' : 'fail',
            message: runnerMode === 'command'
                ? 'Command runner mode is configured'
                : `Unsupported Stitch runner mode: ${runnerMode}`,
        });
        const command = typeof runner?.command === 'string' ? runner.command.trim() : '';
        checks.push({
            name: 'runner.command',
            status: command.length > 0 ? 'pass' : 'fail',
            message: command.length > 0
                ? `Runner command is ready: ${command}${provider === 'gemini' && this.isBuiltInGeminiRunner(runner) ? ' (built-in Gemini adapter)' : provider === 'codex' && this.isBuiltInCodexRunner(runner) ? ' (built-in Codex adapter)' : ''}`
                : 'Configure .skillrc.plugins.stitch.runner.command before using stitch',
        });
        if (command.length > 0) {
            const availability = await this.checkCommandAvailability(command, projectPath);
            checks.push({
                name: 'runner.command.available',
                status: availability.available ? 'pass' : 'fail',
                message: availability.message,
            });
        }
        const tokenEnv = typeof runner?.token_env === 'string' ? runner.token_env.trim() : '';
        checks.push({
            name: 'runner.token_env',
            status: tokenEnv.length === 0 || Boolean(process.env[tokenEnv]) ? 'pass' : 'fail',
            message: tokenEnv.length === 0
                ? 'No token environment variable required'
                : process.env[tokenEnv]
                    ? `Token environment variable is set: ${tokenEnv}`
                    : `Missing required token environment variable: ${tokenEnv}`,
        });
        const timeoutMs = Number.isFinite(runner?.timeout_ms) && runner.timeout_ms > 0 ? Math.floor(runner.timeout_ms) : 900000;
        checks.push({
            name: 'runner.timeout_ms',
            status: timeoutMs >= 1000 ? 'pass' : 'warn',
            message: `Runner timeout is ${timeoutMs}ms`,
        });
        if (provider === 'gemini') {
            const usingBuiltInGeminiRunner = this.isBuiltInGeminiRunner(runner);
            const geminiConfig = this.getStitchGeminiConfig(stitchConfig);
            checks.push({
                name: 'gemini.model',
                status: geminiConfig.model ? 'pass' : 'warn',
                message: geminiConfig.model
                    ? `Configured Gemini model is ${geminiConfig.model}${geminiConfig.auto_switch_on_limit ? ' with automatic fallback enabled' : ''}`
                    : 'No Gemini model is configured. The built-in adapter will rely on the Gemini CLI default model.',
            });
            const geminiMcp = await this.inspectGeminiCliStitch(projectPath);
            checks.push({
                name: 'gemini-cli.available',
                status: usingBuiltInGeminiRunner ? (geminiMcp.geminiAvailable ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInGeminiRunner
                    ? geminiMcp.geminiAvailable
                        ? `Gemini CLI is available: ${geminiMcp.geminiCommandPath || 'gemini'}`
                        : 'Gemini CLI is not available on PATH. Install @google/gemini-cli to use the built-in Gemini Stitch adapter.'
                    : 'Gemini CLI readiness is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'gemini-cli.settings',
                status: usingBuiltInGeminiRunner ? (geminiMcp.settingsExists ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInGeminiRunner
                    ? geminiMcp.settingsExists
                        ? `Gemini settings detected: ${geminiMcp.settingsPath}`
                        : 'Gemini settings.json was not found in the default user profile location.'
                    : 'Gemini settings.json is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'gemini-cli.stitch-mcp',
                status: usingBuiltInGeminiRunner ? (geminiMcp.stitchMcpConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInGeminiRunner
                    ? geminiMcp.stitchMcpConfigured
                        ? `Gemini CLI Stitch MCP is configured${geminiMcp.stitchMcpType ? ` (${geminiMcp.stitchMcpType})` : ''}`
                        : 'Gemini CLI Stitch MCP was not found in settings.json. Follow the repo-local localized Stitch plugin spec and add mcpServers.stitch before using the built-in adapter.'
                    : 'Gemini MCP config is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'gemini-cli.stitch-url',
                status: usingBuiltInGeminiRunner ? (geminiMcp.stitchHttpUrlConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInGeminiRunner
                    ? geminiMcp.stitchHttpUrlConfigured
                        ? 'Gemini CLI Stitch MCP uses the documented httpUrl'
                        : 'Gemini CLI Stitch MCP must set httpUrl = "https://stitch.googleapis.com/mcp" as documented in the repo-local localized Stitch plugin spec.'
                    : 'Gemini MCP URL is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'gemini-cli.stitch-auth',
                status: usingBuiltInGeminiRunner ? (geminiMcp.stitchAuthConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInGeminiRunner
                    ? geminiMcp.stitchAuthConfigured
                        ? 'Gemini CLI Stitch MCP includes the documented X-Goog-Api-Key header'
                        : 'Gemini CLI Stitch MCP must set headers.X-Goog-Api-Key as documented in the repo-local localized Stitch plugin spec.'
                    : 'Gemini MCP auth is not required because stitch.runner is customized.',
            });
        }
        else {
            const usingBuiltInCodexRunner = this.isBuiltInCodexRunner(runner);
            const codexConfig = this.getStitchCodexConfig(stitchConfig);
            checks.push({
                name: 'codex.model',
                status: 'pass',
                message: codexConfig.model
                    ? `Configured Codex model is ${codexConfig.model}`
                    : 'No Codex model is configured. The built-in adapter will rely on the Codex CLI default model.',
            });
            const codexMcp = await this.inspectCodexCliStitch(projectPath);
            checks.push({
                name: 'codex-cli.available',
                status: usingBuiltInCodexRunner ? (codexMcp.codexAvailable ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.codexAvailable
                        ? `Codex CLI is available: ${codexMcp.codexCommandPath || 'codex'}`
                        : 'Codex CLI is not available on PATH. Install Codex CLI to use the built-in Codex Stitch adapter.'
                    : 'Codex CLI readiness is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.settings',
                status: usingBuiltInCodexRunner ? (codexMcp.settingsExists ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.settingsExists
                        ? `Codex config detected: ${codexMcp.settingsPath}`
                        : 'Codex config.toml was not found in the default user profile location.'
                    : 'Codex config.toml is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.stitch-mcp',
                status: usingBuiltInCodexRunner ? (codexMcp.stitchMcpConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.stitchMcpConfigured
                        ? 'Codex Stitch MCP is configured in config.toml'
                        : 'Codex Stitch MCP was not found in config.toml. Follow the repo-local localized Stitch plugin spec and add [mcp_servers.stitch] before using the built-in adapter.'
                    : 'Codex MCP config is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.stitch-transport',
                status: usingBuiltInCodexRunner ? (codexMcp.stitchTransportHttp ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.stitchTransportHttp
                        ? 'Codex Stitch MCP uses the documented HTTP transport'
                        : 'Codex Stitch MCP must set type = "http" as documented in the repo-local localized Stitch plugin spec.'
                    : 'Codex MCP transport is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.stitch-url',
                status: usingBuiltInCodexRunner ? (codexMcp.stitchUrlConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.stitchUrlConfigured
                        ? 'Codex Stitch MCP uses the documented Stitch MCP URL'
                        : 'Codex Stitch MCP must set url = "https://stitch.googleapis.com/mcp" as documented in the repo-local localized Stitch plugin spec.'
                    : 'Codex MCP URL is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.stitch-auth',
                status: usingBuiltInCodexRunner ? (codexMcp.stitchAuthConfigured ? 'pass' : 'fail') : 'pass',
                message: usingBuiltInCodexRunner
                    ? codexMcp.stitchAuthConfigured
                        ? 'Codex Stitch MCP includes the documented X-Goog-Api-Key header'
                        : 'Codex Stitch MCP must set X-Goog-Api-Key in headers or [mcp_servers.stitch.http_headers] as documented in the repo-local localized Stitch plugin spec.'
                    : 'Codex MCP auth is not required because stitch.runner is customized.',
            });
            checks.push({
                name: 'codex-cli.write-bypass',
                status: usingBuiltInCodexRunner ? 'pass' : 'warn',
                message: usingBuiltInCodexRunner
                    ? 'The built-in Codex Stitch adapter runs write operations with --dangerously-bypass-approvals-and-sandbox.'
                    : 'Custom Codex Stitch runners must explicitly pass --dangerously-bypass-approvals-and-sandbox for Stitch MCP write operations, or create/update calls can stall before mcp_tool_call even when read-only calls succeed.',
            });
        }
        const failCount = checks.filter(check => check.status === 'fail').length;
        const warnCount = checks.filter(check => check.status === 'warn').length;
        console.log('\nPlugin Doctor');
        console.log('=============\n');
        console.log(`Project: ${projectPath}`);
        console.log('Plugin: stitch\n');
        checks.forEach(check => {
            const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
            console.log(`${icon} ${check.name}: ${check.message}`);
        });
        console.log('');
        console.log('Suggested next steps:');
        if (provider === 'gemini') {
            console.log('  1. The default runner uses the built-in Gemini CLI Stitch adapter when runner.command is not customized');
            console.log('  2. Install Gemini CLI with npm install -g @google/gemini-cli if gemini-cli.available is not PASS');
            console.log('  3. Configure %USERPROFILE%/.gemini/settings.json using the Gemini snippet from the repo-local localized Stitch plugin spec if gemini-cli.stitch-mcp, gemini-cli.stitch-url, or gemini-cli.stitch-auth is not PASS');
            console.log('  4. Override .skillrc.plugins.stitch.runner only if you prefer a custom Stitch bridge / wrapper');
            console.log('  5. Create a new UI/page-design change with --flags ui_change,page_design');
            console.log('  6. Run ospec plugins run stitch <change-path> before asking for review');
            console.log('  Note: doctor validates local readiness; the first real run still depends on Gemini CLI auth and upstream network availability');
        }
        else {
            console.log('  1. The default runner uses the built-in Codex CLI Stitch adapter when runner.command is not customized');
            console.log('  2. Install Codex CLI if codex-cli.available is not PASS');
            console.log('  3. Configure %USERPROFILE%/.codex/config.toml using the Codex snippet from the repo-local localized Stitch plugin spec if codex-cli.stitch-mcp, codex-cli.stitch-transport, codex-cli.stitch-url, or codex-cli.stitch-auth is not PASS');
            console.log('  4. If read-only Stitch calls succeed but create/update calls stall before mcp_tool_call, make sure the runner actually launches codex exec with --dangerously-bypass-approvals-and-sandbox');
            console.log('  5. Override .skillrc.plugins.stitch.runner only if you prefer a custom Stitch bridge / wrapper');
            console.log('  6. Create a new UI/page-design change with --flags ui_change,page_design');
            console.log('  7. Run ospec plugins run stitch <change-path> before asking for review');
            console.log('  Note: doctor validates local readiness; real write operations still depend on Codex CLI auth, upstream network availability, and the write-bypass path actually being used');
        }
        console.log('');
        if (failCount > 0) {
            this.error(`Plugin doctor found ${failCount} blocking issue(s)${warnCount > 0 ? ` and ${warnCount} warning(s)` : ''}`);
            process.exit(1);
        }
        this.success(`Plugin doctor passed${warnCount > 0 ? ` with ${warnCount} warning(s)` : ''}`);
    }
    async doctorCheckpoint(projectPath) {
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const checkpointConfig = config.plugins?.checkpoint;
        const checks = [];
        checks.push({
            name: 'plugin.enabled',
            status: checkpointConfig?.enabled ? 'pass' : 'fail',
            message: checkpointConfig?.enabled
                ? 'checkpoint plugin is enabled for this project'
                : 'checkpoint plugin is disabled. Run "ospec plugins enable checkpoint <project-path> --base-url <url>" first.',
        });
        const uiReviewEnabled = checkpointConfig?.capabilities?.ui_review?.enabled === true;
        checks.push({
            name: 'capability.ui_review',
            status: uiReviewEnabled ? 'pass' : 'fail',
            message: uiReviewEnabled
                ? 'ui_review capability is enabled'
                : 'ui_review capability is disabled',
        });
        const flowCheckEnabled = checkpointConfig?.capabilities?.flow_check?.enabled === true;
        checks.push({
            name: 'capability.flow_check',
            status: flowCheckEnabled ? 'pass' : 'fail',
            message: flowCheckEnabled
                ? 'flow_check capability is enabled'
                : 'flow_check capability is disabled',
        });
        const baseUrl = typeof checkpointConfig?.runtime?.base_url === 'string'
            ? checkpointConfig.runtime.base_url.trim()
            : '';
        checks.push({
            name: 'runtime.base_url',
            status: baseUrl && this.isHttpUrl(baseUrl) ? 'pass' : 'fail',
            message: baseUrl
                ? this.isHttpUrl(baseUrl)
                    ? `Runtime base URL is configured: ${baseUrl}`
                    : `runtime.base_url is not a valid http/https URL: ${baseUrl}`
                : 'runtime.base_url is missing. Re-run "ospec plugins enable checkpoint <project-path> --base-url <url>".',
        });
        const workspaceRoot = path.join(projectPath, '.ospec', 'plugins', 'checkpoint');
        const routesPath = path.join(workspaceRoot, 'routes.yaml');
        const flowsPath = path.join(workspaceRoot, 'flows.yaml');
        const workspaceExists = await services_1.services.fileService.exists(workspaceRoot);
        const routesExists = await services_1.services.fileService.exists(routesPath);
        const flowsExists = await services_1.services.fileService.exists(flowsPath);
        checks.push({
            name: 'workspace.root',
            status: workspaceExists ? 'pass' : 'fail',
            message: workspaceExists
                ? `Checkpoint workspace exists: ${workspaceRoot}`
                : 'Checkpoint workspace is missing. Re-enable the plugin or create .ospec/plugins/checkpoint/.',
        });
        checks.push({
            name: 'workspace.routes',
            status: routesExists ? 'pass' : 'warn',
            message: routesExists
                ? `Route review config detected: ${routesPath}`
                : 'routes.yaml is missing. Add route baseline definitions before ui_review is used.',
        });
        checks.push({
            name: 'workspace.flows',
            status: flowsExists ? 'pass' : 'warn',
            message: flowsExists
                ? `Flow review config detected: ${flowsPath}`
                : 'flows.yaml is missing. Add flow definitions before flow_check is used.',
        });
        const runner = this.getEffectiveCheckpointRunnerConfig(checkpointConfig, checkpointConfig?.runner);
        const runnerMode = typeof runner?.mode === 'string' ? runner.mode : 'command';
        checks.push({
            name: 'runner.mode',
            status: runnerMode === 'command' ? 'pass' : 'fail',
            message: runnerMode === 'command'
                ? 'Command runner mode is configured'
                : `Unsupported checkpoint runner mode: ${runnerMode}`,
        });
        const command = typeof runner?.command === 'string' ? runner.command.trim() : '';
        checks.push({
            name: 'runner.command',
            status: command.length > 0 ? 'pass' : 'fail',
            message: command.length > 0
                ? `Runner command is ready: ${command}${this.isBuiltInCheckpointRunner(checkpointConfig?.runner) ? ' (built-in Playwright adapter)' : ''}`
                : 'Configure .skillrc.plugins.checkpoint.runner.command before using checkpoint',
        });
        if (command.length > 0) {
            const availability = await this.checkCommandAvailability(command, projectPath);
            checks.push({
                name: 'runner.command.available',
                status: availability.available ? 'pass' : 'fail',
                message: availability.message,
            });
        }
        if (this.isBuiltInCheckpointRunner(checkpointConfig?.runner)) {
            const adapterPath = path.resolve(__dirname, '..', 'adapters', 'playwright-checkpoint-adapter.js');
            const adapterExists = await services_1.services.fileService.exists(adapterPath);
            checks.push({
                name: 'runner.adapter',
                status: adapterExists ? 'pass' : 'fail',
                message: adapterExists
                    ? `Built-in Playwright adapter is available: ${adapterPath}`
                    : `Built-in Playwright adapter is missing: ${adapterPath}`,
            });
            const dependencyState = await this.inspectCheckpointProjectDependencies(projectPath);
            const packageManager = await this.detectProjectPackageManager(projectPath);
            const packageManagerAvailability = await this.checkCommandAvailability(packageManager, projectPath);
            checks.push({
                name: 'project.package_manager',
                status: packageManagerAvailability.available ? 'pass' : dependencyState.missing.length > 0 ? 'fail' : 'warn',
                message: packageManagerAvailability.available
                    ? `Checkpoint dependency auto-install uses ${packageManager}${packageManagerAvailability.path ? ` (${packageManagerAvailability.path})` : ''}`
                    : `Checkpoint dependency auto-install cannot run because ${packageManager} is not available on PATH`,
            });
            this.getCheckpointProjectDependencies().forEach(moduleName => {
                const resolvedPath = dependencyState.available[moduleName] || '';
                checks.push({
                    name: `project.dep.${moduleName}`,
                    status: resolvedPath ? 'pass' : 'fail',
                    message: resolvedPath
                        ? `${moduleName} is installed in the target project: ${resolvedPath}`
                        : `${moduleName} is missing from the target project. Re-run "ospec plugins enable checkpoint <project-path> --base-url <url>" to auto-install checkpoint dependencies.`,
                });
            });
        }
        const tokenEnv = typeof runner?.token_env === 'string' ? runner.token_env.trim() : '';
        checks.push({
            name: 'runner.token_env',
            status: tokenEnv.length === 0 || Boolean(process.env[tokenEnv]) ? 'pass' : 'fail',
            message: tokenEnv.length === 0
                ? 'No token environment variable required'
                : process.env[tokenEnv]
                    ? `Token environment variable is set: ${tokenEnv}`
                    : `Missing required token environment variable: ${tokenEnv}`,
        });
        const timeoutMs = Number.isFinite(runner?.timeout_ms) && runner.timeout_ms > 0 ? Math.floor(runner.timeout_ms) : 900000;
        checks.push({
            name: 'runner.timeout_ms',
            status: timeoutMs >= 1000 ? 'pass' : 'warn',
            message: `Runner timeout is ${timeoutMs}ms`,
        });
        const startupCommand = typeof checkpointConfig?.runtime?.startup?.command === 'string'
            ? checkpointConfig.runtime.startup.command.trim()
            : '';
        checks.push({
            name: 'runtime.startup',
            status: startupCommand.length > 0 ? 'pass' : 'warn',
            message: startupCommand.length > 0
                ? `Startup command is configured: ${startupCommand}`
                : 'No startup command is configured. This is acceptable only if the target site is already running.',
        });
        const readinessType = typeof checkpointConfig?.runtime?.readiness?.type === 'string'
            ? checkpointConfig.runtime.readiness.type.trim()
            : '';
        const readinessUrl = typeof checkpointConfig?.runtime?.readiness?.url === 'string'
            ? checkpointConfig.runtime.readiness.url.trim()
            : '';
        checks.push({
            name: 'runtime.readiness',
            status: readinessType === 'url' && (!readinessUrl || this.isHttpUrl(readinessUrl)) ? 'pass' : 'fail',
            message: readinessType === 'url'
                ? readinessUrl
                    ? `Readiness probe uses URL: ${readinessUrl}`
                    : 'Readiness probe URL is empty; checkpoint will fall back to the configured base_url.'
                : `Unsupported readiness probe type: ${readinessType || '(empty)'}`,
        });
        const authCommand = typeof checkpointConfig?.runtime?.auth?.command === 'string'
            ? checkpointConfig.runtime.auth.command.trim()
            : '';
        const authWhen = typeof checkpointConfig?.runtime?.auth?.when === 'string'
            ? checkpointConfig.runtime.auth.when.trim()
            : 'missing_storage_state';
        checks.push({
            name: 'runtime.auth',
            status: authCommand.length > 0 ? 'pass' : 'warn',
            message: authCommand.length > 0
                ? `Auth command is configured: ${authCommand} (${authWhen || 'missing_storage_state'})`
                : 'No auth command is configured. This is acceptable only when the target routes do not require login or storage_state is managed externally.',
        });
        if (authCommand.length > 0) {
            const authAvailability = await this.checkCommandAvailability(authCommand, projectPath);
            checks.push({
                name: 'runtime.auth.available',
                status: authAvailability.available ? 'pass' : 'fail',
                message: authAvailability.message,
            });
        }
        const storageState = typeof checkpointConfig?.runtime?.storage_state === 'string'
            ? checkpointConfig.runtime.storage_state.trim()
            : '';
        const resolvedStorageState = storageState ? this.resolveReferencedPath(storageState, projectPath, projectPath) : '';
        const storageStateExists = resolvedStorageState ? await services_1.services.fileService.exists(resolvedStorageState) : false;
        checks.push({
            name: 'runtime.storage_state',
            status: !storageState
                ? authCommand.length > 0 ? 'fail' : 'pass'
                : storageStateExists
                    ? 'pass'
                    : authCommand.length > 0 ? 'warn' : 'warn',
            message: !storageState
                ? authCommand.length > 0
                    ? 'runtime.auth is configured but runtime.storage_state is empty. The auth command should write a Playwright storage state file.'
                    : 'No storage_state file is configured. Add one if login is required.'
                : storageStateExists
                    ? `Storage state file exists: ${resolvedStorageState}`
                    : authCommand.length > 0
                        ? `Storage state file is currently missing: ${resolvedStorageState}. The auth command is expected to create it before review runs.`
                        : `Storage state file is missing: ${resolvedStorageState}`,
        });
        checks.push({
            name: 'stitch_integration',
            status: checkpointConfig?.stitch_integration?.enabled !== false ? 'pass' : 'warn',
            message: checkpointConfig?.stitch_integration?.enabled !== false
                ? `Stitch integration is enabled${checkpointConfig?.stitch_integration?.auto_pass_stitch_review !== false ? ' with automatic Stitch approval sync' : ''}`
                : 'Stitch integration is disabled',
        });
        const failCount = checks.filter(check => check.status === 'fail').length;
        const warnCount = checks.filter(check => check.status === 'warn').length;
        console.log('\nPlugin Doctor');
        console.log('=============\n');
        console.log(`Project: ${projectPath}`);
        console.log('Plugin: checkpoint\n');
        checks.forEach(check => {
            const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
            console.log(`${icon} ${check.name}: ${check.message}`);
        });
        console.log('');
        console.log('Suggested next steps:');
        console.log('  1. Re-run "ospec plugins enable checkpoint <project-path> --base-url <url>" if built-in checkpoint dependencies are missing');
        console.log('  2. Keep .ospec/plugins/checkpoint/routes.yaml aligned with the routes and viewports you expect to review');
        console.log('  3. Keep .ospec/plugins/checkpoint/flows.yaml aligned with critical user flows and project-specific backend assertions');
        console.log('  4. Use docker compose or a stable startup command when the repo cannot boot the target app directly');
        console.log('  5. Save a storage state under .ospec/plugins/checkpoint/auth/ or configure runtime.auth to generate one before review');
        console.log('  6. Create new changes with matching flags such as --flags ui_change,page_design or --flags feature_flow,api_change');
        console.log('  7. Once checkpoint steps are active, verify/archive will block on artifacts/checkpoint/gate.json');
        console.log('');
        if (failCount > 0) {
            this.error(`Plugin doctor found ${failCount} blocking issue(s)${warnCount > 0 ? ` and ${warnCount} warning(s)` : ''}`);
            process.exit(1);
        }
        this.success(`Plugin doctor passed${warnCount > 0 ? ` with ${warnCount} warning(s)` : ''}`);
    }
    getCheckpointProjectDependencies() {
        return ['playwright', 'pixelmatch', 'pngjs'];
    }
    async inspectCheckpointProjectDependencies(projectPath) {
        const available = {};
        const missing = [];
        for (const moduleName of this.getCheckpointProjectDependencies()) {
            const resolvedPath = this.resolveProjectDependencyPath(projectPath, moduleName);
            if (resolvedPath) {
                available[moduleName] = resolvedPath;
            }
            else {
                missing.push(moduleName);
            }
        }
        return { available, missing };
    }
    resolveProjectDependencyPath(projectPath, moduleName) {
        try {
            return require.resolve(`${moduleName}/package.json`, { paths: [projectPath] });
        }
        catch {
            return '';
        }
    }
    normalizePackageManager(value) {
        const normalized = String(value || '').trim().toLowerCase();
        const match = normalized.match(/^(npm|pnpm|yarn|bun)(?:@|$)/);
        return match ? match[1] : '';
    }
    async detectProjectPackageManager(projectPath) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await services_1.services.fileService.exists(packageJsonPath)) {
            try {
                const packageJson = await services_1.services.fileService.readJSON(packageJsonPath);
                const declaredManager = this.normalizePackageManager(packageJson?.packageManager || '');
                if (declaredManager) {
                    return declaredManager;
                }
            }
            catch {
            }
        }
        const lockfiles = [
            { fileName: 'pnpm-lock.yaml', packageManager: 'pnpm' },
            { fileName: 'yarn.lock', packageManager: 'yarn' },
            { fileName: 'bun.lockb', packageManager: 'bun' },
            { fileName: 'bun.lock', packageManager: 'bun' },
            { fileName: 'package-lock.json', packageManager: 'npm' },
            { fileName: 'npm-shrinkwrap.json', packageManager: 'npm' },
        ];
        for (const candidate of lockfiles) {
            if (await services_1.services.fileService.exists(path.join(projectPath, candidate.fileName))) {
                return candidate.packageManager;
            }
        }
        return 'npm';
    }
    resolvePackageManagerRunner(packageManager) {
        return process.platform === 'win32' ? `${packageManager}.cmd` : packageManager;
    }
    getCheckpointDependencyInstallArgs(packageManager, packages) {
        switch (packageManager) {
            case 'pnpm':
            case 'yarn':
            case 'bun':
                return ['add', '-D', ...packages];
            case 'npm':
            default:
                return ['install', '--save-dev', ...packages];
        }
    }
    async installCheckpointProjectDependencies(projectPath) {
        const initialState = await this.inspectCheckpointProjectDependencies(projectPath);
        const packageManager = await this.detectProjectPackageManager(projectPath);
        if (initialState.missing.length === 0) {
            return {
                packageManager,
                installedNow: [],
                alreadyPresent: Object.keys(initialState.available),
            };
        }
        const packageManagerAvailability = await this.checkCommandAvailability(packageManager, projectPath);
        if (!packageManagerAvailability.available) {
            throw new Error(`Checkpoint uses the built-in Playwright adapter, but ${packageManager} is not available on PATH. Install ${packageManager} or switch checkpoint to a custom runner before enabling it.`);
        }
        const runner = this.resolvePackageManagerRunner(packageManager);
        const installArgs = this.getCheckpointDependencyInstallArgs(packageManager, initialState.missing);
        const displayCommand = (0, helpers_1.formatCliCommand)(packageManager, ...installArgs);
        const result = (0, child_process_1.spawnSync)(runner, installArgs, {
            cwd: projectPath,
            encoding: 'utf-8',
            shell: false,
        });
        if (result.error) {
            throw new Error(`Checkpoint dependency install failed while running "${displayCommand}": ${result.error.message}`);
        }
        if (result.status !== 0) {
            const output = String(result.stderr || result.stdout || '').trim();
            throw new Error(`Checkpoint dependency install failed while running "${displayCommand}" in ${projectPath}${output ? `: ${output}` : ''}`);
        }
        const finalState = await this.inspectCheckpointProjectDependencies(projectPath);
        if (finalState.missing.length > 0) {
            throw new Error(`Checkpoint dependency install finished, but these packages are still not resolvable from ${projectPath}: ${finalState.missing.join(', ')}`);
        }
        return {
            packageManager,
            installedNow: initialState.missing,
            alreadyPresent: Object.keys(initialState.available),
        };
    }
    async checkCommandAvailability(command, projectPath) {
        const resolvedCommand = this.resolveRunnerCommand(command, projectPath);
        if (path.isAbsolute(resolvedCommand) || command.startsWith('.') || command.includes('/') || command.includes('\\')) {
            const exists = await services_1.services.fileService.exists(resolvedCommand);
            return {
                available: exists,
                path: resolvedCommand,
                message: exists
                    ? `Runner command path exists: ${resolvedCommand}`
                    : `Runner command path not found: ${resolvedCommand}`,
            };
        }
        const locator = process.platform === 'win32' ? 'where.exe' : 'which';
        const result = (0, child_process_1.spawnSync)(locator, [command], {
            cwd: projectPath,
            encoding: 'utf-8',
            shell: false,
        });
        const available = result.status === 0;
        const output = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean)[0] || '';
        return {
            available,
            path: output || '',
            message: available
                ? `Runner command is available on PATH: ${output || command}`
                : `Runner command was not found on PATH: ${command}`,
        };
    }
    async inspectGeminiCliStitch(projectPath) {
        const userHome = process.env.USERPROFILE || process.env.HOME || '';
        const settingsPath = userHome ? path.join(userHome, '.gemini', 'settings.json') : '';
        const geminiAvailability = await this.checkCommandAvailability('gemini', projectPath);
        const settingsExists = settingsPath ? await services_1.services.fileService.exists(settingsPath) : false;
        if (!settingsExists) {
            return {
                geminiAvailable: geminiAvailability.available,
                geminiCommandPath: geminiAvailability.path || '',
                settingsExists: false,
                settingsPath,
                stitchMcpConfigured: false,
                stitchMcpType: '',
                stitchHttpUrlConfigured: false,
                stitchAuthConfigured: false,
            };
        }
        try {
            const settings = await services_1.services.fileService.readJSON(settingsPath);
            const stitchMcp = settings?.mcpServers?.stitch;
            const stitchHeaders = stitchMcp?.headers && typeof stitchMcp.headers === 'object' ? stitchMcp.headers : {};
            return {
                geminiAvailable: geminiAvailability.available,
                geminiCommandPath: geminiAvailability.path || '',
                settingsExists: true,
                settingsPath,
                stitchMcpConfigured: Boolean(stitchMcp && typeof stitchMcp === 'object'),
                stitchMcpType: typeof stitchMcp?.type === 'string' ? stitchMcp.type : '',
                stitchHttpUrlConfigured: typeof stitchMcp?.httpUrl === 'string' && stitchMcp.httpUrl.trim() === 'https://stitch.googleapis.com/mcp',
                stitchAuthConfigured: typeof stitchHeaders['X-Goog-Api-Key'] === 'string' && stitchHeaders['X-Goog-Api-Key'].trim().length > 0,
            };
        }
        catch {
            return {
                geminiAvailable: geminiAvailability.available,
                geminiCommandPath: geminiAvailability.path || '',
                settingsExists: true,
                settingsPath,
                stitchMcpConfigured: false,
                stitchMcpType: '',
                stitchHttpUrlConfigured: false,
                stitchAuthConfigured: false,
            };
        }
    }
    async runPlugin(pluginName, changePath) {
        const normalizedName = this.resolvePluginAlias(pluginName);
        switch (normalizedName) {
            case 'stitch':
                await this.runStitch(changePath);
                return;
            case 'checkpoint':
                await this.runCheckpoint(changePath);
                return;
            default:
                throw new Error(`Unsupported plugin: ${pluginName}`);
        }
    }
    async runCheckpoint(changePath) {
        const targetPath = path.resolve(changePath);
        const changeFiles = await this.getChangeRuntimePaths(targetPath);
        const projectPath = await this.findProjectRoot(targetPath);
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const checkpointConfig = config.plugins?.checkpoint;
        if (!checkpointConfig?.enabled) {
            throw new Error('checkpoint plugin is not enabled for this project. Run "ospec plugins enable checkpoint <project-path> --base-url <url>" first.');
        }
        const verification = await this.readVerification(changeFiles.verificationPath);
        const optionalSteps = Array.isArray(verification.data.optional_steps) ? verification.data.optional_steps : [];
        const activeCheckpointSteps = optionalSteps.filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
        if (activeCheckpointSteps.length === 0) {
            throw new Error('This change does not activate checkpoint_ui_review or checkpoint_flow_check, so checkpoint cannot run for it.');
        }
        const runner = this.getEffectiveCheckpointRunnerConfig(checkpointConfig, checkpointConfig.runner);
        if (!runner || runner.mode !== 'command') {
            throw new Error('Unsupported checkpoint runner mode. Only command mode is supported in this version.');
        }
        const rawCommand = typeof runner.command === 'string' ? runner.command.trim() : '';
        if (!rawCommand) {
            throw new Error('Checkpoint runner is not configured. Configure .skillrc.plugins.checkpoint.runner.command or use the built-in adapter defaults.');
        }
        const tokenEnv = typeof runner.token_env === 'string' ? runner.token_env.trim() : '';
        if (tokenEnv && !process.env[tokenEnv]) {
            throw new Error(`Missing checkpoint token environment variable: ${tokenEnv}`);
        }
        await services_1.services.fileService.ensureDir(changeFiles.checkpointDir);
        await services_1.services.fileService.ensureDir(changeFiles.checkpointScreenshotsDir);
        await services_1.services.fileService.ensureDir(changeFiles.checkpointDiffsDir);
        await services_1.services.fileService.ensureDir(changeFiles.checkpointTracesDir);
        const featureState = await services_1.services.fileService.readJSON(changeFiles.statePath);
        const context = {
            change_path: targetPath,
            project_path: projectPath,
            approval_path: changeFiles.approvalPath,
            gate_path: changeFiles.checkpointGatePath,
            summary_path: changeFiles.checkpointSummaryPath,
            result_path: changeFiles.checkpointResultPath,
            change_name: featureState.feature || path.basename(targetPath),
        };
        const command = this.resolveRunnerCommand(this.replaceRunnerTokens(rawCommand, context), projectPath);
        const args = Array.isArray(runner.args)
            ? runner.args.map(arg => this.replaceRunnerTokens(String(arg), context))
            : [];
        const rawCwd = typeof runner.cwd === 'string' && runner.cwd.trim().length > 0
            ? this.replaceRunnerTokens(runner.cwd.trim(), context)
            : projectPath;
        const cwd = path.isAbsolute(rawCwd) ? rawCwd : path.resolve(projectPath, rawCwd);
        const extraEnv = runner.extra_env && typeof runner.extra_env === 'object'
            ? Object.fromEntries(Object.entries(runner.extra_env).map(([key, value]) => [key, this.replaceRunnerTokens(String(value ?? ''), context)]))
            : {};
        const timeoutMs = Number.isFinite(runner.timeout_ms) && runner.timeout_ms > 0 ? Math.floor(runner.timeout_ms) : 900000;
        const baseUrl = typeof checkpointConfig.runtime?.base_url === 'string' ? checkpointConfig.runtime.base_url.trim() : '';
        const executionEnv = {
            ...process.env,
            ...extraEnv,
            OSPEC_CHECKPOINT_CHANGE_PATH: targetPath,
            OSPEC_CHECKPOINT_PROJECT_PATH: projectPath,
            OSPEC_CHECKPOINT_GATE_PATH: changeFiles.checkpointGatePath,
            OSPEC_CHECKPOINT_RESULT_PATH: changeFiles.checkpointResultPath,
            OSPEC_CHECKPOINT_SUMMARY_PATH: changeFiles.checkpointSummaryPath,
            OSPEC_CHECKPOINT_SCREENSHOTS_DIR: changeFiles.checkpointScreenshotsDir,
            OSPEC_CHECKPOINT_DIFFS_DIR: changeFiles.checkpointDiffsDir,
            OSPEC_CHECKPOINT_TRACES_DIR: changeFiles.checkpointTracesDir,
            OSPEC_CHECKPOINT_CHANGE_NAME: context.change_name,
            OSPEC_CHECKPOINT_BASE_URL: baseUrl,
            OSPEC_CHECKPOINT_ACTIVE_STEPS: activeCheckpointSteps.join(','),
        };
        const result = (0, child_process_1.spawnSync)(command, args, {
            cwd,
            env: executionEnv,
            encoding: 'utf-8',
            timeout: timeoutMs,
            shell: false,
        });
        if (result.error) {
            throw new Error(`Failed to execute checkpoint runner: ${result.error.message}`);
        }
        const parsedOutput = this.parseCheckpointRunnerOutput(String(result.stdout || ''), String(result.stderr || ''), activeCheckpointSteps);
        const normalizedOutput = this.normalizeCheckpointRunnerResult(parsedOutput, activeCheckpointSteps);
        const stitchSync = await this.applyCheckpointStitchIntegration(projectPath, changeFiles, verification, checkpointConfig, config, normalizedOutput);
        const persistedArtifacts = await this.writeCheckpointArtifacts(targetPath, changeFiles, checkpointConfig, runner, command, args, cwd, timeoutMs, tokenEnv, extraEnv, normalizedOutput, stitchSync, activeCheckpointSteps);
        await this.syncCheckpointOptionalSteps(changeFiles.verificationPath, activeCheckpointSteps, persistedArtifacts.gate);
        if (persistedArtifacts.gate.status !== 'passed') {
            this.info(`  gate: ${path.relative(targetPath, changeFiles.checkpointGatePath).replace(/\\/g, '/')}`);
            this.info(`  result: ${path.relative(targetPath, changeFiles.checkpointResultPath).replace(/\\/g, '/')}`);
            this.info(`  summary: ${path.relative(targetPath, changeFiles.checkpointSummaryPath).replace(/\\/g, '/')}`);
            this.info(`  status: ${persistedArtifacts.gate.status}`);
            if (stitchSync.attempted) {
                this.info(`  stitch sync: ${stitchSync.status}${stitchSync.message ? ` (${stitchSync.message})` : ''}`);
            }
            this.error('Checkpoint gate failed. Inspect artifacts/checkpoint/summary.md for details.');
            process.exit(1);
        }
        this.success(`Ran plugin checkpoint for ${changePath}`);
        this.info(`  gate: ${path.relative(targetPath, changeFiles.checkpointGatePath).replace(/\\/g, '/')}`);
        this.info(`  result: ${path.relative(targetPath, changeFiles.checkpointResultPath).replace(/\\/g, '/')}`);
        this.info(`  summary: ${path.relative(targetPath, changeFiles.checkpointSummaryPath).replace(/\\/g, '/')}`);
        this.info(`  status: ${persistedArtifacts.gate.status}`);
        if (stitchSync.attempted) {
            this.info(`  stitch sync: ${stitchSync.status}${stitchSync.message ? ` (${stitchSync.message})` : ''}`);
        }
    }
    async runStitch(changePath) {
        const targetPath = path.resolve(changePath);
        const changeFiles = await this.getChangeRuntimePaths(targetPath);
        const projectPath = await this.findProjectRoot(targetPath);
        const config = await services_1.services.configManager.loadConfig(projectPath);
        const stitchConfig = config.plugins?.stitch;
        const provider = this.getStitchProvider(stitchConfig);
        if (!stitchConfig?.enabled) {
            throw new Error('stitch plugin is not enabled for this project. Run "ospec plugins enable stitch <project-path>" first.');
        }
        if (!stitchConfig.capabilities?.page_design_review?.enabled) {
            throw new Error('stitch capability page_design_review is not enabled for this project.');
        }
        const verification = await this.readVerification(changeFiles.verificationPath);
        const optionalSteps = Array.isArray(verification.data.optional_steps) ? verification.data.optional_steps : [];
        if (!optionalSteps.includes('stitch_design_review')) {
            throw new Error('This change does not activate stitch_design_review, so Stitch cannot run for it.');
        }
        const runner = this.getEffectiveStitchRunnerConfig(stitchConfig, stitchConfig.runner);
        if (!runner || runner.mode !== 'command') {
            throw new Error('Unsupported Stitch runner mode. Only command mode is supported in this version.');
        }
        const rawCommand = typeof runner.command === 'string' ? runner.command.trim() : '';
        if (!rawCommand) {
            throw new Error('Stitch runner is not configured. Configure .skillrc.plugins.stitch.runner.command or use the built-in adapter defaults.');
        }
        const tokenEnv = typeof runner.token_env === 'string' ? runner.token_env.trim() : '';
        if (tokenEnv && !process.env[tokenEnv]) {
            throw new Error(`Missing Stitch token environment variable: ${tokenEnv}`);
        }
        await services_1.services.fileService.ensureDir(changeFiles.stitchDir);
        const featureState = await services_1.services.fileService.readJSON(changeFiles.statePath);
        const approval = await this.loadOrCreateStitchApproval(changeFiles.approvalPath, stitchConfig.blocking !== false);
        const context = {
            change_path: targetPath,
            project_path: projectPath,
            approval_path: changeFiles.approvalPath,
            summary_path: changeFiles.summaryPath,
            result_path: changeFiles.resultPath,
            change_name: featureState.feature || path.basename(targetPath),
        };
        const command = this.resolveRunnerCommand(this.replaceRunnerTokens(rawCommand, context), projectPath);
        const args = Array.isArray(runner.args)
            ? runner.args.map(arg => this.replaceRunnerTokens(String(arg), context))
            : [];
        const rawCwd = typeof runner.cwd === 'string' && runner.cwd.trim().length > 0
            ? this.replaceRunnerTokens(runner.cwd.trim(), context)
            : projectPath;
        const cwd = path.isAbsolute(rawCwd) ? rawCwd : path.resolve(projectPath, rawCwd);
        const extraEnv = runner.extra_env && typeof runner.extra_env === 'object'
            ? Object.fromEntries(Object.entries(runner.extra_env).map(([key, value]) => [key, this.replaceRunnerTokens(String(value ?? ''), context)]))
            : {};
        const timeoutMs = Number.isFinite(runner.timeout_ms) && runner.timeout_ms > 0 ? Math.floor(runner.timeout_ms) : 900000;
        const baseEnv = {
            ...process.env,
            ...extraEnv,
            OSPEC_STITCH_CHANGE_PATH: targetPath,
            OSPEC_STITCH_PROJECT_PATH: projectPath,
            OSPEC_STITCH_APPROVAL_PATH: changeFiles.approvalPath,
            OSPEC_STITCH_SUMMARY_PATH: changeFiles.summaryPath,
            OSPEC_STITCH_RESULT_PATH: changeFiles.resultPath,
            OSPEC_STITCH_CHANGE_NAME: context.change_name,
            OSPEC_STITCH_CANONICAL_PROJECT_ID: typeof stitchConfig.project?.project_id === 'string' ? stitchConfig.project.project_id.trim() : '',
            OSPEC_STITCH_CANONICAL_PROJECT_URL: typeof stitchConfig.project?.project_url === 'string' ? stitchConfig.project.project_url.trim() : '',
        };
        const executedAt = new Date().toISOString();
        const usingBuiltInGeminiRunner = provider === 'gemini' && this.isBuiltInGeminiRunner(stitchConfig.runner);
        const usingBuiltInCodexRunner = provider === 'codex' && this.isBuiltInCodexRunner(stitchConfig.runner);
        const geminiConfig = this.getStitchGeminiConfig(stitchConfig);
        const codexConfig = this.getStitchCodexConfig(stitchConfig);
        const geminiModelCandidates = usingBuiltInGeminiRunner
            ? this.getGeminiModelCandidates(geminiConfig.model)
            : [''];
        let selectedGeminiModel = '';
        let selectedCodexModel = usingBuiltInCodexRunner ? codexConfig.model : '';
        let result = null;
        let parsedOutput = null;
        let lastGeminiFailure = null;
        for (const candidateModel of geminiModelCandidates) {
            const attemptEnv = {
                ...baseEnv,
            };
            if (candidateModel) {
                attemptEnv.OSPEC_STITCH_GEMINI_MODEL = candidateModel;
            }
            else {
                delete attemptEnv.OSPEC_STITCH_GEMINI_MODEL;
            }
            if (usingBuiltInCodexRunner && codexConfig.model) {
                attemptEnv.OSPEC_STITCH_CODEX_MODEL = codexConfig.model;
            }
            else {
                delete attemptEnv.OSPEC_STITCH_CODEX_MODEL;
            }
            const attemptResult = (0, child_process_1.spawnSync)(command, args, {
                cwd,
                env: attemptEnv,
                encoding: 'utf-8',
                timeout: timeoutMs,
                shell: false,
            });
            if (attemptResult.error) {
                throw new Error(`Failed to execute Stitch runner: ${attemptResult.error.message}`);
            }
            if (attemptResult.status === 0) {
                result = attemptResult;
                parsedOutput = this.parseStitchRunnerOutput(String(attemptResult.stdout || ''));
                selectedGeminiModel = candidateModel;
                break;
            }
            const failure = this.classifyStitchRunnerFailure(attemptResult, candidateModel);
            if (!(usingBuiltInGeminiRunner &&
                geminiConfig.auto_switch_on_limit &&
                this.isGeminiModelFallbackEligible(failure) &&
                candidateModel !== geminiModelCandidates[geminiModelCandidates.length - 1])) {
                throw new Error(failure.message);
            }
            lastGeminiFailure = failure;
        }
        if (!result || !parsedOutput) {
            if (lastGeminiFailure) {
                throw new Error(lastGeminiFailure.message);
            }
            throw new Error('Stitch runner did not return a usable result.');
        }
        if (!parsedOutput.preview_url) {
            throw new Error('Stitch runner must output a preview_url or print the preview URL to stdout.');
        }
        const previewProject = this.extractStitchProjectRef(parsedOutput.preview_url);
        const canonicalProject = stitchConfig.project && typeof stitchConfig.project === 'object'
            ? stitchConfig.project
            : {};
        const canonicalProjectId = typeof canonicalProject.project_id === 'string' ? canonicalProject.project_id.trim() : '';
        const canonicalProjectUrl = typeof canonicalProject.project_url === 'string' ? canonicalProject.project_url.trim() : '';
        const enforceSingleProject = canonicalProject.enforce_single_project !== false;
        if (canonicalProjectId && enforceSingleProject) {
            if (!previewProject.project_id) {
                throw new Error(`Stitch preview URL does not expose a project ID, so OSpec cannot verify reuse of canonical project ${canonicalProjectId}.`);
            }
            if (previewProject.project_id !== canonicalProjectId) {
                throw new Error(`Stitch returned project ${previewProject.project_id}, but this repo is pinned to canonical project ${canonicalProjectId}. Reuse the existing Stitch project instead of creating a new one.`);
            }
        }
        let summaryMarkdown = parsedOutput.summary_markdown;
        if (!summaryMarkdown && parsedOutput.summary_path) {
            const summarySourcePath = this.resolveReferencedPath(parsedOutput.summary_path, cwd, projectPath);
            if (!(await services_1.services.fileService.exists(summarySourcePath))) {
                throw new Error(`Stitch runner referenced missing summary_path: ${parsedOutput.summary_path}`);
            }
            summaryMarkdown = await services_1.services.fileService.readFile(summarySourcePath);
        }
        const nextApproval = {
            ...approval,
            plugin: 'stitch',
            capability: 'page_design_review',
            step: 'stitch_design_review',
            blocking: stitchConfig.blocking !== false,
            status: 'pending',
            preview_url: parsedOutput.preview_url,
            submitted_at: executedAt,
            reviewed_at: '',
            reviewer: '',
            notes: parsedOutput.notes || '',
        };
        const resultArtifact = {
            plugin: 'stitch',
            capability: 'page_design_review',
            step: 'stitch_design_review',
            status: 'submitted',
            executed_at: executedAt,
            runner: {
                mode: 'command',
                command,
                args,
                cwd,
                timeout_ms: timeoutMs,
                token_env: tokenEnv,
                extra_env_keys: Object.keys(extraEnv).sort((left, right) => left.localeCompare(right)),
                provider,
                gemini_model: provider === 'gemini' ? (selectedGeminiModel || geminiConfig.model || '') : '',
                codex_model: provider === 'codex' ? (selectedCodexModel || codexConfig.model || '') : '',
            },
            output: {
                ...parsedOutput,
                summary_markdown: summaryMarkdown,
            },
        };
        await services_1.services.fileService.writeJSON(changeFiles.resultPath, resultArtifact);
        await services_1.services.fileService.writeJSON(changeFiles.approvalPath, nextApproval);
        const shouldSaveCanonicalProject = !canonicalProjectId &&
            canonicalProject.save_on_first_run !== false &&
            previewProject.project_id &&
            previewProject.project_url;
        const configuredGeminiModel = provider === 'gemini' ? geminiConfig.model : '';
        const shouldPersistGeminiModel = usingBuiltInGeminiRunner &&
            geminiConfig.save_on_fallback !== false &&
            selectedGeminiModel &&
            selectedGeminiModel !== configuredGeminiModel;
        if (shouldSaveCanonicalProject || shouldPersistGeminiModel) {
            const nextConfig = JSON.parse(JSON.stringify(config));
            nextConfig.plugins = nextConfig.plugins || {};
            nextConfig.plugins.stitch = nextConfig.plugins.stitch || this.createDefaultStitchPluginConfig();
            if (shouldSaveCanonicalProject) {
                nextConfig.plugins.stitch.project = {
                    ...(nextConfig.plugins.stitch.project || {}),
                    project_id: previewProject.project_id,
                    project_url: previewProject.project_url,
                    save_on_first_run: canonicalProject.save_on_first_run !== false,
                    enforce_single_project: enforceSingleProject,
                };
            }
            if (shouldPersistGeminiModel) {
                nextConfig.plugins.stitch.gemini = {
                    ...(nextConfig.plugins.stitch.gemini || {}),
                    model: selectedGeminiModel,
                    auto_switch_on_limit: geminiConfig.auto_switch_on_limit !== false,
                    save_on_fallback: geminiConfig.save_on_fallback !== false,
                };
            }
            await services_1.services.configManager.saveConfig(projectPath, nextConfig);
        }
        if (summaryMarkdown) {
            await services_1.services.fileService.writeFile(changeFiles.summaryPath, summaryMarkdown);
        }
        else if (await services_1.services.fileService.exists(changeFiles.summaryPath)) {
            await services_1.services.fileService.remove(changeFiles.summaryPath);
        }
        await this.syncVerificationOptionalStep(changeFiles.verificationPath, 'stitch_design_review', false);
        this.success(`Submitted plugin stitch review for ${changePath}`);
        this.info(`  preview_url: ${parsedOutput.preview_url}`);
        this.info(`  result: ${path.relative(targetPath, changeFiles.resultPath).replace(/\\/g, '/')}`);
        if (summaryMarkdown) {
            this.info(`  summary: ${path.relative(targetPath, changeFiles.summaryPath).replace(/\\/g, '/')}`);
        }
        if (parsedOutput.artifacts.length > 0) {
            this.info(`  artifacts: ${parsedOutput.artifacts.length}`);
        }
        if (tokenEnv) {
            this.info(`  token env: ${tokenEnv}`);
        }
        this.info(`  provider: ${provider}`);
        if (provider === 'gemini' && (selectedGeminiModel || configuredGeminiModel)) {
            this.info(`  gemini model: ${selectedGeminiModel || configuredGeminiModel}`);
        }
        if (provider === 'codex' && (selectedCodexModel || codexConfig.model)) {
            this.info(`  codex model: ${selectedCodexModel || codexConfig.model}`);
        }
        if (previewProject.project_id) {
            this.info(`  stitch project: ${previewProject.project_id}`);
        }
        if (shouldSaveCanonicalProject) {
            this.info(`  canonical project saved: ${previewProject.project_url}`);
        }
        else if (canonicalProjectUrl) {
            this.info(`  canonical project: ${canonicalProjectUrl}`);
        }
        if (provider === 'gemini' && shouldPersistGeminiModel) {
            this.info(`  gemini model saved: ${selectedGeminiModel}`);
        }
        this.info('  approval.json status: pending');
        this.info('  Next: send the preview URL to the reviewer and wait for ospec plugins approve stitch <change-path>');
    }
    async setPluginApproval(pluginName, status, changePath) {
        const normalizedName = this.resolvePluginAlias(pluginName);
        if (normalizedName !== 'stitch') {
            throw new Error(`Unsupported plugin: ${pluginName}`);
        }
        const targetPath = path.resolve(changePath);
        const changeFiles = await this.getChangeRuntimePaths(targetPath);
        if (!(await services_1.services.fileService.exists(changeFiles.approvalPath))) {
            throw new Error('Stitch approval artifact not found. Expected artifacts/stitch/approval.json');
        }
        const approval = await services_1.services.fileService.readJSON(changeFiles.approvalPath);
        if (approval.step !== 'stitch_design_review') {
            throw new Error('Stitch approval artifact step must be stitch_design_review');
        }
        if (status === 'approved') {
            const hasPreviewUrl = typeof approval.preview_url === 'string' && approval.preview_url.trim().length > 0;
            const hasSubmittedAt = typeof approval.submitted_at === 'string' && approval.submitted_at.trim().length > 0;
            if (!hasPreviewUrl || !hasSubmittedAt) {
                throw new Error('Cannot approve Stitch review before preview_url and submitted_at are recorded. Run ospec plugins run stitch <change-path> first.');
            }
        }
        const reviewer = process.env.USERNAME || process.env.USER || approval.reviewer || 'manual';
        const nextApproval = {
            ...approval,
            plugin: 'stitch',
            capability: approval.capability || 'page_design_review',
            step: 'stitch_design_review',
            status,
            reviewed_at: new Date().toISOString(),
            reviewer,
        };
        await services_1.services.fileService.writeJSON(changeFiles.approvalPath, nextApproval);
        await this.syncVerificationOptionalStep(changeFiles.verificationPath, 'stitch_design_review', status === 'approved');
        this.success(`${status === 'approved' ? 'Approved' : 'Rejected'} plugin stitch review for ${changePath}`);
        this.info(`  approval.json status: ${status}`);
        this.info(`  verification.md passed_optional_steps: ${status === 'approved' ? 'includes stitch_design_review' : 'removed stitch_design_review'}`);
    }
    async getChangeRuntimePaths(changePath) {
        const targetPath = path.resolve(changePath);
        const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
        const verificationPath = path.join(targetPath, constants_1.FILE_NAMES.VERIFICATION);
        if (!(await services_1.services.fileService.exists(statePath))) {
            throw new Error('Change state file not found. Expected changes/active/<change>/state.json');
        }
        if (!(await services_1.services.fileService.exists(verificationPath))) {
            throw new Error('verification.md is required for plugin workflow integration');
        }
        const stitchDir = path.join(targetPath, 'artifacts', 'stitch');
        const checkpointDir = path.join(targetPath, 'artifacts', 'checkpoint');
        return {
            targetPath,
            statePath,
            verificationPath,
            stitchDir,
            approvalPath: path.join(stitchDir, 'approval.json'),
            summaryPath: path.join(stitchDir, 'summary.md'),
            resultPath: path.join(stitchDir, 'result.json'),
            checkpointDir,
            checkpointGatePath: path.join(checkpointDir, 'gate.json'),
            checkpointSummaryPath: path.join(checkpointDir, 'summary.md'),
            checkpointResultPath: path.join(checkpointDir, 'result.json'),
            checkpointScreenshotsDir: path.join(checkpointDir, 'screenshots'),
            checkpointDiffsDir: path.join(checkpointDir, 'diffs'),
            checkpointTracesDir: path.join(checkpointDir, 'traces'),
        };
    }
    async findProjectRoot(startPath) {
        let currentPath = path.resolve(startPath);
        while (true) {
            const skillrcPath = path.join(currentPath, constants_1.FILE_NAMES.SKILLRC);
            if (await services_1.services.fileService.exists(skillrcPath)) {
                return currentPath;
            }
            const parentPath = path.dirname(currentPath);
            if (parentPath === currentPath) {
                break;
            }
            currentPath = parentPath;
        }
        throw new Error('Unable to locate project root containing .skillrc from the provided change path.');
    }
    async readVerification(verificationPath) {
        const verificationContent = await services_1.services.fileService.readFile(verificationPath);
        return (0, helpers_1.parseFrontmatterDocument)(verificationContent);
    }
    async syncVerificationOptionalStep(verificationPath, stepName, passed) {
        const verification = await this.readVerification(verificationPath);
        const optionalSteps = Array.isArray(verification.data.optional_steps) ? verification.data.optional_steps : [];
        if (!optionalSteps.includes(stepName)) {
            throw new Error(`verification.md does not include ${stepName} in optional_steps`);
        }
        const passedOptionalSteps = Array.isArray(verification.data.passed_optional_steps)
            ? verification.data.passed_optional_steps.filter(step => step !== stepName)
            : [];
        if (passed) {
            passedOptionalSteps.push(stepName);
        }
        verification.data.passed_optional_steps = Array.from(new Set(passedOptionalSteps));
        await services_1.services.fileService.writeFile(verificationPath, (0, helpers_1.stringifyFrontmatter)(verification.content, verification.data));
    }
    async loadOrCreateStitchApproval(approvalPath, blocking) {
        if (await services_1.services.fileService.exists(approvalPath)) {
            const approval = await services_1.services.fileService.readJSON(approvalPath);
            if (approval.step && approval.step !== 'stitch_design_review') {
                throw new Error('Stitch approval artifact step must be stitch_design_review');
            }
            return approval;
        }
        const approval = {
            plugin: 'stitch',
            capability: 'page_design_review',
            step: 'stitch_design_review',
            status: 'pending',
            blocking: blocking !== false,
            preview_url: '',
            submitted_at: '',
            reviewed_at: '',
            reviewer: '',
            notes: '',
        };
        await services_1.services.fileService.writeJSON(approvalPath, approval);
        return approval;
    }
    parseCheckpointRunnerOutput(stdout, stderr, activeSteps) {
        const normalizedStdout = String(stdout || '').trim();
        const normalizedStderr = String(stderr || '').trim();
        const stdoutLines = normalizedStdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const stderrLines = normalizedStderr.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const candidates = Array.from(new Set([
            normalizedStdout,
            stdoutLines[stdoutLines.length - 1] || '',
            stderrLines[stderrLines.length - 1] || '',
        ].filter(Boolean)));
        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
            catch {
            }
        }
        const issues = [normalizedStderr || normalizedStdout || 'Checkpoint runner produced no structured JSON output.'];
        return {
            ok: false,
            status: 'failed',
            issues,
            steps: Object.fromEntries(activeSteps.map(step => [step, {
                    status: 'failed',
                    issues,
                }])),
        };
    }
    normalizeCheckpointRunnerResult(result, activeSteps) {
        const firstString = (...values) => values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
        const normalizeStatus = (value, fallback = 'pending') => {
            const normalized = String(value || '').trim().toLowerCase();
            if (normalized === 'pass') {
                return 'passed';
            }
            if (normalized === 'fail' || normalized === 'error') {
                return 'failed';
            }
            if (normalized === 'passed' || normalized === 'failed' || normalized === 'pending' || normalized === 'skipped') {
                return normalized;
            }
            return fallback;
        };
        const normalizeIssues = (value) => {
            if (!Array.isArray(value)) {
                return [];
            }
            return value
                .map(entry => {
                if (typeof entry === 'string' && entry.trim().length > 0) {
                    return { message: entry.trim() };
                }
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    return null;
                }
                const message = firstString(entry.message, entry.notes, entry.title, entry.code);
                if (!message) {
                    return null;
                }
                return {
                    message,
                    severity: firstString(entry.severity, entry.level),
                    code: firstString(entry.code),
                    path: firstString(entry.path),
                };
            })
                .filter(Boolean);
        };
        const normalizeArtifacts = (value) => this.normalizeRunnerArtifacts(value);
        const normalizeStep = (stepName, value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return {
                    status: 'pending',
                    issues: [],
                    routes: [],
                    flows: [],
                    artifacts: [],
                    summary: '',
                    metadata: {},
                };
            }
            return {
                status: normalizeStatus(value.status, 'pending'),
                issues: normalizeIssues(value.issues || value.errors),
                routes: Array.isArray(value.routes) ? value.routes : [],
                flows: Array.isArray(value.flows) ? value.flows : [],
                artifacts: normalizeArtifacts(value.artifacts || value.files || value.outputs),
                summary: firstString(value.summary, value.summary_markdown, value.notes),
                metadata: value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata)
                    ? value.metadata
                    : {},
                step: stepName,
            };
        };
        const normalizedSteps = {};
        for (const stepName of activeSteps) {
            const fallbackValue = stepName === 'checkpoint_ui_review'
                ? result?.ui_review
                : stepName === 'checkpoint_flow_check'
                    ? result?.flow_check
                    : null;
            normalizedSteps[stepName] = normalizeStep(stepName, result?.steps?.[stepName] || fallbackValue || {});
        }
        const overallStatus = normalizeStatus(result?.status, '');
        const derivedStatus = overallStatus ||
            (activeSteps.some(step => normalizedSteps[step]?.status === 'failed')
                ? 'failed'
                : activeSteps.length > 0 && activeSteps.every(step => normalizedSteps[step]?.status === 'passed')
                    ? 'passed'
                    : 'pending');
        return {
            ok: result?.ok !== false && derivedStatus !== 'failed',
            status: derivedStatus,
            executed_at: firstString(result?.executed_at, result?.executedAt) || new Date().toISOString(),
            notes: firstString(result?.notes, result?.message),
            summary_markdown: firstString(result?.summary_markdown, result?.summaryMarkdown, result?.summary),
            issues: normalizeIssues(result?.issues || result?.errors),
            steps: normalizedSteps,
            metadata: result?.metadata && typeof result.metadata === 'object' && !Array.isArray(result.metadata)
                ? result.metadata
                : {},
            artifacts: normalizeArtifacts(result?.artifacts || result?.files || result?.outputs),
        };
    }
    buildCheckpointSummaryMarkdown(gate, output, stitchSync) {
        const lines = [
            '# Checkpoint Review Summary',
            '',
            `- Status: ${gate.status}`,
            `- Executed at: ${gate.executed_at}`,
            `- Blocking: ${gate.blocking ? 'yes' : 'no'}`,
            '',
        ];
        for (const [stepName, stepState] of Object.entries(gate.steps || {})) {
            lines.push(`## ${stepName}`);
            lines.push('');
            lines.push(`- Status: ${stepState.status}`);
            const stepIssues = Array.isArray(stepState.issues) ? stepState.issues : [];
            if (stepIssues.length === 0) {
                lines.push('- Issues: none');
            }
            else {
                lines.push('- Issues:');
                stepIssues.forEach(issue => {
                    lines.push(`  - ${issue.message || issue}`);
                });
            }
            const stepOutput = output.steps?.[stepName];
            const routeCount = Array.isArray(stepOutput?.routes) ? stepOutput.routes.length : 0;
            const flowCount = Array.isArray(stepOutput?.flows) ? stepOutput.flows.length : 0;
            if (routeCount > 0) {
                lines.push(`- Routes checked: ${routeCount}`);
            }
            if (flowCount > 0) {
                lines.push(`- Flows checked: ${flowCount}`);
            }
            lines.push('');
        }
        if (Array.isArray(gate.issues) && gate.issues.length > 0) {
            lines.push('## Global Issues');
            lines.push('');
            gate.issues.forEach(issue => {
                lines.push(`- ${issue.message || issue}`);
            });
            lines.push('');
        }
        if (stitchSync?.attempted) {
            lines.push('## Stitch Sync');
            lines.push('');
            lines.push(`- Status: ${stitchSync.status}`);
            if (stitchSync.message) {
                lines.push(`- Message: ${stitchSync.message}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    async writeCheckpointArtifacts(changePath, changeFiles, checkpointConfig, runner, command, args, cwd, timeoutMs, tokenEnv, extraEnv, output, stitchSync, activeSteps) {
        const gate = {
            plugin: 'checkpoint',
            status: output.status,
            blocking: checkpointConfig?.blocking !== false,
            executed_at: output.executed_at,
            steps: Object.fromEntries(activeSteps.map(stepName => [
                stepName,
                {
                    status: output.steps?.[stepName]?.status || 'failed',
                    issues: output.steps?.[stepName]?.issues || [],
                },
            ])),
            stitch_sync: stitchSync,
            issues: output.issues,
        };
        const resultArtifact = {
            plugin: 'checkpoint',
            status: output.status,
            executed_at: output.executed_at,
            active_steps: activeSteps,
            runner: {
                mode: 'command',
                command,
                args,
                cwd,
                timeout_ms: timeoutMs,
                token_env: tokenEnv,
                extra_env_keys: Object.keys(extraEnv).sort((left, right) => left.localeCompare(right)),
            },
            output,
            stitch_sync: stitchSync,
        };
        const summaryMarkdown = output.summary_markdown || this.buildCheckpointSummaryMarkdown(gate, output, stitchSync);
        await services_1.services.fileService.writeJSON(changeFiles.checkpointGatePath, gate);
        await services_1.services.fileService.writeJSON(changeFiles.checkpointResultPath, resultArtifact);
        await services_1.services.fileService.writeFile(changeFiles.checkpointSummaryPath, summaryMarkdown);
        return {
            gate,
            resultArtifact,
            summaryMarkdown,
        };
    }
    async syncCheckpointOptionalSteps(verificationPath, activeSteps, gate) {
        for (const stepName of activeSteps) {
            const stepStatus = gate.steps?.[stepName]?.status || 'failed';
            await this.syncVerificationOptionalStep(verificationPath, stepName, stepStatus === 'passed');
        }
    }
    async applyCheckpointStitchIntegration(projectPath, changeFiles, verification, checkpointConfig, config, output) {
        const optionalSteps = Array.isArray(verification.data.optional_steps) ? verification.data.optional_steps : [];
        const stitchStepActive = optionalSteps.includes('stitch_design_review');
        if (!stitchStepActive) {
            return {
                attempted: false,
                status: 'skipped',
                message: 'stitch_design_review is not active for this change',
            };
        }
        if (checkpointConfig?.stitch_integration?.enabled === false || checkpointConfig?.stitch_integration?.auto_pass_stitch_review === false) {
            return {
                attempted: false,
                status: 'skipped',
                message: 'checkpoint stitch integration is disabled',
            };
        }
        const uiReviewStatus = output.steps?.checkpoint_ui_review?.status || 'pending';
        const approval = await this.loadOrCreateStitchApproval(changeFiles.approvalPath, config.plugins?.stitch?.blocking !== false);
        if (uiReviewStatus !== 'passed') {
            if (approval.status === 'approved' && approval.reviewer === 'checkpoint') {
                const nextApproval = {
                    ...approval,
                    status: 'pending',
                    reviewed_at: '',
                    reviewer: '',
                    notes: approval.notes
                        ? `${approval.notes}\nCheckpoint ui_review no longer passes; auto-approval reverted.`
                        : 'Checkpoint ui_review no longer passes; auto-approval reverted.',
                };
                await services_1.services.fileService.writeJSON(changeFiles.approvalPath, nextApproval);
                await this.syncVerificationOptionalStep(changeFiles.verificationPath, 'stitch_design_review', false);
                return {
                    attempted: true,
                    status: 'reverted',
                    message: 'checkpoint ui_review failed, so previous automatic Stitch approval was reverted',
                };
            }
            await this.syncVerificationOptionalStep(changeFiles.verificationPath, 'stitch_design_review', approval.status === 'approved');
            return {
                attempted: true,
                status: 'skipped',
                message: 'checkpoint ui_review did not pass, so Stitch was not auto-approved',
            };
        }
        const stitchProjectUrl = typeof config.plugins?.stitch?.project?.project_url === 'string'
            ? config.plugins.stitch.project.project_url.trim()
            : '';
        const previewUrl = approval.preview_url || stitchProjectUrl || 'checkpoint:auto-pass';
        const submittedAt = approval.submitted_at || output.executed_at || new Date().toISOString();
        const nextApproval = {
            ...approval,
            plugin: 'stitch',
            capability: approval.capability || 'page_design_review',
            step: 'stitch_design_review',
            status: 'approved',
            preview_url: previewUrl,
            submitted_at: submittedAt,
            reviewed_at: new Date().toISOString(),
            reviewer: 'checkpoint',
            notes: approval.notes
                ? `${approval.notes}\nApproved automatically from checkpoint ui_review.`
                : 'Approved automatically from checkpoint ui_review.',
        };
        await services_1.services.fileService.writeJSON(changeFiles.approvalPath, nextApproval);
        await this.syncVerificationOptionalStep(changeFiles.verificationPath, 'stitch_design_review', true);
        return {
            attempted: true,
            status: 'approved',
            message: 'Stitch review approved automatically from checkpoint ui_review',
        };
    }
    parsePluginProjectArgs(args) {
        const options = {
            base_url: '',
        };
        let projectPath = '';
        for (let index = 0; index < args.length; index += 1) {
            const arg = String(args[index] || '').trim();
            if (!arg) {
                continue;
            }
            if (arg === '--base-url') {
                const nextValue = String(args[index + 1] || '').trim();
                if (!nextValue || nextValue.startsWith('--')) {
                    throw new Error('Missing value for --base-url');
                }
                options.base_url = nextValue;
                index += 1;
                continue;
            }
            if (arg.startsWith('--base-url=')) {
                options.base_url = arg.slice('--base-url='.length).trim();
                if (!options.base_url) {
                    throw new Error('Missing value for --base-url');
                }
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown plugin option: ${arg}`);
            }
            if (!projectPath) {
                projectPath = arg;
                continue;
            }
            throw new Error(`Unexpected plugin argument: ${arg}`);
        }
        return {
            projectPath,
            options,
        };
    }
    isHttpUrl(value) {
        try {
            const parsed = new URL(String(value || '').trim());
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    async ensureFileIfMissing(filePath, content) {
        if (await services_1.services.fileService.exists(filePath)) {
            return;
        }
        await services_1.services.fileService.writeFile(filePath, content);
    }
    async ensureGitkeep(dirPath) {
        await services_1.services.fileService.ensureDir(dirPath);
        const gitkeepPath = path.join(dirPath, '.gitkeep');
        if (!(await services_1.services.fileService.exists(gitkeepPath))) {
            await services_1.services.fileService.writeFile(gitkeepPath, '');
        }
    }
    async ensureStitchWorkspaceScaffold(projectPath, stitchConfig) {
        const workspaceRoot = path.join(projectPath, '.ospec', 'plugins', 'stitch');
        const exportsDir = path.join(workspaceRoot, 'exports');
        const baselinesDir = path.join(workspaceRoot, 'baselines');
        const cacheDir = path.join(workspaceRoot, 'cache');
        await services_1.services.fileService.ensureDir(workspaceRoot);
        await this.ensureGitkeep(exportsDir);
        await this.ensureGitkeep(baselinesDir);
        await this.ensureGitkeep(cacheDir);
        const metadataPath = path.join(workspaceRoot, 'project.json');
        const readmePath = path.join(workspaceRoot, 'README.md');
        const provider = this.getStitchProvider(stitchConfig);
        const runner = this.getEffectiveStitchRunnerConfig(stitchConfig, stitchConfig?.runner) || this.createDefaultStitchPluginConfig(provider).runner;
        await this.ensureFileIfMissing(metadataPath, JSON.stringify({
            version: 1,
            plugin: 'stitch',
            workspace_root: '.ospec/plugins/stitch',
            created_at: new Date().toISOString(),
            provider,
            canonical_project: {
                project_id: typeof stitchConfig?.project?.project_id === 'string' ? stitchConfig.project.project_id.trim() : '',
                project_url: typeof stitchConfig?.project?.project_url === 'string' ? stitchConfig.project.project_url.trim() : '',
                save_on_first_run: stitchConfig?.project?.save_on_first_run !== false,
                enforce_single_project: stitchConfig?.project?.enforce_single_project !== false,
            },
            runner: {
                mode: typeof runner?.mode === 'string' ? runner.mode : 'command',
                command: typeof runner?.command === 'string' ? runner.command.trim() : 'node',
                cwd: typeof runner?.cwd === 'string' ? runner.cwd.trim() : '${project_path}',
                timeout_ms: Number.isFinite(runner?.timeout_ms) && runner.timeout_ms > 0 ? Math.floor(runner.timeout_ms) : 900000,
                token_env: typeof runner?.token_env === 'string' ? runner.token_env.trim() : '',
            },
        }, null, 2));
        await this.ensureFileIfMissing(readmePath, [
            '# Stitch Workspace',
            '',
            'Repository-level Stitch assets for OSpec plugins live here.',
            '',
            '- `exports/`: reusable Stitch exports and snapshots',
            '- `baselines/`: repository-level design baselines shared with runtime review plugins',
            '- `cache/`: temporary Stitch cache files',
            '',
            'Per-change results still live under `changes/active/<change>/artifacts/stitch/`.',
            '',
        ].join('\n'));
    }
    async ensureCheckpointWorkspaceScaffold(projectPath, checkpointConfig) {
        const workspaceRoot = path.join(projectPath, '.ospec', 'plugins', 'checkpoint');
        const baselinesDir = path.join(workspaceRoot, 'baselines');
        const authDir = path.join(workspaceRoot, 'auth');
        const cacheDir = path.join(workspaceRoot, 'cache');
        await services_1.services.fileService.ensureDir(workspaceRoot);
        await this.ensureGitkeep(baselinesDir);
        await this.ensureGitkeep(authDir);
        await this.ensureGitkeep(cacheDir);
        const routesPath = path.join(workspaceRoot, 'routes.yaml');
        const flowsPath = path.join(workspaceRoot, 'flows.yaml');
        const readmePath = path.join(workspaceRoot, 'README.md');
        const authReadmePath = path.join(authDir, 'README.md');
        const authExamplePath = path.join(authDir, 'login.example.js');
        const baseUrl = typeof checkpointConfig?.runtime?.base_url === 'string'
            ? checkpointConfig.runtime.base_url.trim()
            : '';
        await this.ensureFileIfMissing(routesPath, [
            'defaults:',
            '  viewports:',
            '    - desktop',
            '    - mobile',
            '  diff_threshold: 0.01',
            '  wait_after_load_ms: 300',
            '  ignore_selectors:',
            '    - "[data-checkpoint-ignore]"',
            '  contrast:',
            '    - name: text-default',
            '      selectors: ["h1", "h2", "h3", "p", "a", "button", "label"]',
            '      min_ratio: 4.5',
            '      max_issues: 6',
            '',
            'routes:',
            '  - name: home',
            '    path: /',
            `    base_url: ${baseUrl || 'http://127.0.0.1:3000'}`,
            '    baseline:',
            '      desktop: baselines/home-desktop.png',
            '      mobile: baselines/home-mobile.png',
            '    required_visible:',
            '      - h1',
            '      - a[href]',
            '    selectors:',
            '      no_overlap:',
            '        - name: hero-copy-vs-stats',
            '          first: .hero-copy',
            '          second: .hero-stats',
            '    typography:',
            '      - selector: h1',
            '        font_family_includes: ["Inter", "system-ui"]',
            '        font_size_min: 40',
            '        font_weight_min: 600',
            '        single_line: true',
            '    colors:',
            '      - selector: a[href]',
            '        property: color',
            '        equals: "#2563eb"',
            '        tolerance: 18',
            '    requirements:',
            '      - Hero title must remain on one line on desktop',
            '      - Primary CTA must stay above the fold',
            '',
        ].join('\n'));
        await this.ensureFileIfMissing(flowsPath, [
            'flows:',
            '  - name: smoke-home',
            '    start_url: /',
            '    steps:',
            '      - action: wait_for_load',
            '      - action: assert_text',
            '        text: TODO',
            '    assert_command: ""',
            '',
        ].join('\n'));
        await this.ensureFileIfMissing(readmePath, [
            '# Checkpoint Workspace',
            '',
            'Repository-level runtime review assets for the checkpoint plugin live here.',
            '',
            '- `routes.yaml`: page review targets, breakpoint matrix, baselines, and semantic UI checks',
            '- `flows.yaml`: critical flows, API assertions, and project-specific backend assertions',
            '- `baselines/`: repository baselines used when Stitch exports are not available',
            '- `auth/`: login helpers, example auth scripts, and Playwright storage state files',
            '- `cache/`: temporary review artifacts and regenerated intermediates',
            '',
            'Per-change execution artifacts will live under `changes/active/<change>/artifacts/checkpoint/`.',
            '',
        ].join('\n'));
        await this.ensureFileIfMissing(authReadmePath, [
            '# Checkpoint Auth',
            '',
            'Use this directory when checkpoint review requires login.',
            '',
            'Recommended contract:',
            '',
            '1. Copy `login.example.js` to `login.js` and replace the placeholder selectors.',
            '2. Configure `.skillrc.plugins.checkpoint.runtime.auth` to run that script before review.',
            '3. The script should write the Playwright storage state file to the path in `OSPEC_CHECKPOINT_STORAGE_STATE`.',
            '',
            'Environment variables provided to the auth command:',
            '',
            '- `OSPEC_CHECKPOINT_BASE_URL`',
            '- `OSPEC_CHECKPOINT_PROJECT_PATH`',
            '- `OSPEC_CHECKPOINT_CHANGE_PATH`',
            '- `OSPEC_CHECKPOINT_STORAGE_STATE`',
            '- `OSPEC_CHECKPOINT_OSPEC_PACKAGE_PATH`',
            '',
        ].join('\n'));
        await this.ensureFileIfMissing(authExamplePath, [
            '#!/usr/bin/env node',
            '',
            "const fs = require('fs/promises');",
            "const path = require('path');",
            "const { createRequire } = require('module');",
            '',
            'async function main() {',
            "  const baseUrl = process.env.OSPEC_CHECKPOINT_BASE_URL || '';",
            "  const storageStatePath = process.env.OSPEC_CHECKPOINT_STORAGE_STATE || '';",
            "  const ospecPackagePath = process.env.OSPEC_CHECKPOINT_OSPEC_PACKAGE_PATH || process.cwd();",
            '  if (!baseUrl) {',
            "    throw new Error('OSPEC_CHECKPOINT_BASE_URL is required');",
            '  }',
            '  if (!storageStatePath) {',
            "    throw new Error('OSPEC_CHECKPOINT_STORAGE_STATE is required');",
            '  }',
            '',
            "  const scopedRequire = createRequire(path.join(ospecPackagePath, 'package.json'));",
            "  const { chromium } = scopedRequire('playwright');",
            '  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });',
            '',
            '  const browser = await chromium.launch({ headless: true });',
            '  const context = await browser.newContext({ baseURL: baseUrl });',
            '  const page = await context.newPage();',
            '',
            '  try {',
            "    await page.goto(new URL('/login', baseUrl).toString(), { waitUntil: 'networkidle', timeout: 60000 });",
            "    // TODO: replace selectors and credentials for the real project.",
            "    // await page.locator('input[name=\"email\"]').fill(process.env.CHECKPOINT_LOGIN_EMAIL || '');",
            "    // await page.locator('input[name=\"password\"]').fill(process.env.CHECKPOINT_LOGIN_PASSWORD || '');",
            "    // await page.locator('button[type=\"submit\"]').click();",
            "    // await page.waitForURL(/dashboard|home/, { timeout: 60000 });",
            '',
            '    await context.storageState({ path: storageStatePath });',
            '  } finally {',
            '    await context.close();',
            '    await browser.close();',
            '  }',
            '}',
            '',
            "main().catch(error => {",
            "  console.error(error && error.message ? error.message : error);",
            '  process.exit(1);',
            '});',
            '',
        ].join('\n'));
    }
    resolveRunnerCommand(command, projectPath) {
        if (path.isAbsolute(command)) {
            return command;
        }
        if (command.startsWith('.') || command.includes('/') || command.includes('\\')) {
            return path.resolve(projectPath, command);
        }
        return command;
    }
    resolveReferencedPath(filePath, cwd, projectPath) {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        if (filePath.startsWith('.') || filePath.includes('/') || filePath.includes('\\')) {
            return path.resolve(cwd, filePath);
        }
        return path.resolve(projectPath, filePath);
    }
    replaceRunnerTokens(value, context) {
        return String(value || '')
            .replace(/\{change_path\}|\$\{change_path\}/g, context.change_path)
            .replace(/\{project_path\}|\$\{project_path\}/g, context.project_path)
            .replace(/\{approval_path\}|\$\{approval_path\}/g, context.approval_path)
            .replace(/\{gate_path\}|\$\{gate_path\}/g, context.gate_path || '')
            .replace(/\{summary_path\}|\$\{summary_path\}/g, context.summary_path)
            .replace(/\{result_path\}|\$\{result_path\}/g, context.result_path)
            .replace(/\{ospec_package_path\}|\$\{ospec_package_path\}/g, path.resolve(__dirname, '..', '..'))
            .replace(/\{change_name\}|\$\{change_name\}/g, context.change_name);
    }
    parseStitchRunnerOutput(stdout) {
        const normalizedOutput = String(stdout || '').trim();
        if (!normalizedOutput) {
            throw new Error('Stitch runner produced no stdout output.');
        }
        const lines = normalizedOutput.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const candidates = Array.from(new Set([normalizedOutput, lines[lines.length - 1] || normalizedOutput]));
        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return this.normalizeRunnerResult(parsed);
                }
            }
            catch {
            }
        }
        const lastLine = lines[lines.length - 1] || normalizedOutput;
        const normalizedPreviewUrl = this.normalizeStitchPreviewUrl(lastLine);
        return {
            preview_url: normalizedPreviewUrl.value,
            summary_markdown: '',
            summary_path: '',
            notes: '',
            metadata: normalizedPreviewUrl.normalized
                ? { original_preview_url: normalizedPreviewUrl.original }
                : {},
            artifacts: [],
        };
    }
    normalizeRunnerResult(result) {
        if (result.ok === false || result.success === false) {
            throw new Error(String(result.error || result.message || 'Stitch runner reported failure.'));
        }
        const firstString = (...values) => values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
        const baseMetadata = result.metadata && typeof result.metadata === 'object' && !Array.isArray(result.metadata)
            ? result.metadata
            : {};
        const normalizedPreviewUrl = this.normalizeStitchPreviewUrl(firstString(result.preview_url, result.previewUrl, result.url));
        const metadata = normalizedPreviewUrl.normalized
            ? {
                ...baseMetadata,
                original_preview_url: baseMetadata.original_preview_url || normalizedPreviewUrl.original,
            }
            : baseMetadata;
        return {
            preview_url: normalizedPreviewUrl.value,
            summary_markdown: firstString(result.summary_markdown, result.summaryMarkdown, result.summary),
            summary_path: firstString(result.summary_path, result.summaryPath),
            notes: firstString(result.notes, result.message),
            metadata,
            artifacts: this.normalizeRunnerArtifacts(result.artifacts || result.files || result.outputs),
        };
    }
    normalizeStitchPreviewUrl(previewUrl) {
        const normalized = String(previewUrl || '').trim();
        if (!normalized) {
            return {
                value: '',
                original: '',
                normalized: false,
            };
        }
        try {
            const parsed = new URL(normalized);
            if (parsed.hostname === 'stitch.canvas.google.com') {
                const match = parsed.pathname.match(/^\/projects\/([^/]+)\/screens\/([^/?#]+)/i);
                if (match) {
                    return {
                        value: `https://stitch.withgoogle.com/projects/${match[1]}?node-id=${match[2]}`,
                        original: normalized,
                        normalized: true,
                    };
                }
            }
            if (parsed.hostname === 'stitch.withgoogle.com' || parsed.hostname === 'stitch.google.com') {
                const match = parsed.pathname.match(/^\/projects\/([^/?#]+)/i);
                if (match) {
                    const canonical = new URL(`https://stitch.withgoogle.com/projects/${match[1]}`);
                    const nodeId = parsed.searchParams.get('node-id') || parsed.searchParams.get('node_id') || '';
                    if (nodeId) {
                        canonical.searchParams.set('node-id', nodeId);
                    }
                    const nextValue = canonical.toString();
                    return {
                        value: nextValue,
                        original: normalized,
                        normalized: nextValue !== normalized,
                    };
                }
            }
        }
        catch {
        }
        return {
            value: normalized,
            original: normalized,
            normalized: false,
        };
    }
    extractStitchProjectRef(previewUrl) {
        const normalizedPreview = this.normalizeStitchPreviewUrl(previewUrl);
        if (!normalizedPreview.value) {
            return {
                preview_url: '',
                project_id: '',
                project_url: '',
                node_id: '',
            };
        }
        try {
            const parsed = new URL(normalizedPreview.value);
            const match = parsed.pathname.match(/^\/projects\/([^/?#]+)/i);
            if (!match) {
                return {
                    preview_url: normalizedPreview.value,
                    project_id: '',
                    project_url: '',
                    node_id: '',
                };
            }
            return {
                preview_url: normalizedPreview.value,
                project_id: match[1],
                project_url: `https://stitch.withgoogle.com/projects/${match[1]}`,
                node_id: parsed.searchParams.get('node-id') || '',
            };
        }
        catch {
            return {
                preview_url: normalizedPreview.value,
                project_id: '',
                project_url: '',
                node_id: '',
            };
        }
    }
    normalizeRunnerArtifacts(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map(entry => {
            if (typeof entry === 'string' && entry.trim().length > 0) {
                return { path: entry.trim() };
            }
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                return null;
            }
            const normalized = {};
            if (typeof entry.path === 'string' && entry.path.trim().length > 0) {
                normalized.path = entry.path.trim();
            }
            if (typeof entry.url === 'string' && entry.url.trim().length > 0) {
                normalized.url = entry.url.trim();
            }
            if (typeof entry.label === 'string' && entry.label.trim().length > 0) {
                normalized.label = entry.label.trim();
            }
            if (typeof entry.type === 'string' && entry.type.trim().length > 0) {
                normalized.type = entry.type.trim();
            }
            return Object.keys(normalized).length > 0 ? normalized : null;
        })
            .filter(Boolean);
    }
    resolvePluginAlias(pluginName) {
        return String(pluginName || '').trim().toLowerCase();
    }
    createDefaultCheckpointPluginConfig() {
        return {
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
                args: this.getDefaultCheckpointRunnerArgs(),
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
    }
    createDefaultStitchPluginConfig(provider = 'gemini') {
        const normalizedProvider = provider === 'codex' ? 'codex' : 'gemini';
        return {
            enabled: false,
            blocking: true,
            project: {
                project_id: '',
                project_url: '',
                save_on_first_run: true,
                enforce_single_project: true,
            },
            provider: normalizedProvider,
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
                args: this.getDefaultRunnerArgs(normalizedProvider),
                cwd: '${project_path}',
                timeout_ms: 900000,
                token_env: '',
                extra_env: {},
            },
            capabilities: {
                page_design_review: {
                    enabled: false,
                    step: 'stitch_design_review',
                    activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
                },
            },
        };
    }
    getDefaultCheckpointRunnerArgs() {
        return ['${ospec_package_path}/dist/adapters/playwright-checkpoint-adapter.js', '--change', '${change_path}', '--project', '${project_path}'];
    }
    getDefaultRunnerArgs(provider) {
        return provider === 'codex'
            ? ['${ospec_package_path}/dist/adapters/codex-stitch-adapter.js', '--change', '${change_path}', '--project', '${project_path}']
            : ['${ospec_package_path}/dist/adapters/gemini-stitch-adapter.js', '--change', '${change_path}', '--project', '${project_path}'];
    }
    getStitchProvider(stitchConfig) {
        return String(stitchConfig?.provider || '').trim().toLowerCase() === 'codex' ? 'codex' : 'gemini';
    }
    getStitchGeminiConfig(stitchConfig) {
        const gemini = stitchConfig?.gemini && typeof stitchConfig.gemini === 'object'
            ? stitchConfig.gemini
            : {};
        const model = typeof gemini.model === 'string' && gemini.model.trim().length > 0
            ? gemini.model.trim()
            : 'gemini-3-flash-preview';
        return {
            model,
            auto_switch_on_limit: gemini.auto_switch_on_limit !== false,
            save_on_fallback: gemini.save_on_fallback !== false,
        };
    }
    getStitchCodexConfig(stitchConfig) {
        const codex = stitchConfig?.codex && typeof stitchConfig.codex === 'object'
            ? stitchConfig.codex
            : {};
        return {
            model: typeof codex.model === 'string' ? codex.model.trim() : '',
            mcp_server: typeof codex.mcp_server === 'string' && codex.mcp_server.trim().length > 0
                ? codex.mcp_server.trim()
                : 'stitch',
        };
    }
    inspectCodexStitchToml(configText) {
        const normalized = String(configText || '');
        const stitchMatch = normalized.match(/\[mcp_servers\.stitch\]([\s\S]*?)(?=\r?\n\[|$)/i);
        const stitchBlock = stitchMatch ? stitchMatch[1] : '';
        const httpHeadersMatch = normalized.match(/\[mcp_servers\.stitch\.http_headers\]([\s\S]*?)(?=\r?\n\[|$)/i);
        const httpHeadersBlock = httpHeadersMatch ? httpHeadersMatch[1] : '';
        return {
            stitchMcpConfigured: Boolean(stitchMatch),
            stitchTransportHttp: /(^|\r?\n)\s*type\s*=\s*["']http["']/i.test(stitchBlock),
            stitchUrlConfigured: /(^|\r?\n)\s*url\s*=\s*["']https:\/\/stitch\.googleapis\.com\/mcp["']/i.test(stitchBlock),
            stitchAuthConfigured: /(^|\r?\n)\s*headers\s*=\s*\{[\s\S]*?\bX-Goog-Api-Key\b\s*=\s*["'][^"']+["'][\s\S]*?\}/i.test(stitchBlock)
                || /\bX-Goog-Api-Key\b\s*=\s*["'][^"']+["']/i.test(httpHeadersBlock),
        };
    }
    async inspectCodexCliStitch(projectPath) {
        const userHome = process.env.USERPROFILE || process.env.HOME || '';
        const settingsPath = userHome ? path.join(userHome, '.codex', 'config.toml') : '';
        const codexAvailability = await this.checkCommandAvailability('codex', projectPath);
        const settingsExists = settingsPath ? await services_1.services.fileService.exists(settingsPath) : false;
        if (!settingsExists) {
            return {
                codexAvailable: codexAvailability.available,
                codexCommandPath: codexAvailability.path || '',
                settingsExists: false,
                settingsPath,
                stitchMcpConfigured: false,
                stitchTransportHttp: false,
                stitchUrlConfigured: false,
                stitchAuthConfigured: false,
            };
        }
        try {
            const configText = await services_1.services.fileService.readFile(settingsPath);
            const stitchToml = this.inspectCodexStitchToml(configText);
            return {
                codexAvailable: codexAvailability.available,
                codexCommandPath: codexAvailability.path || '',
                settingsExists: true,
                settingsPath,
                stitchMcpConfigured: stitchToml.stitchMcpConfigured,
                stitchTransportHttp: stitchToml.stitchTransportHttp,
                stitchUrlConfigured: stitchToml.stitchUrlConfigured,
                stitchAuthConfigured: stitchToml.stitchAuthConfigured,
            };
        }
        catch {
            return {
                codexAvailable: codexAvailability.available,
                codexCommandPath: codexAvailability.path || '',
                settingsExists: true,
                settingsPath,
                stitchMcpConfigured: false,
                stitchTransportHttp: false,
                stitchUrlConfigured: false,
                stitchAuthConfigured: false,
            };
        }
    }
    getGeminiModelCandidates(preferredModel) {
        return Array.from(new Set([
            String(preferredModel || '').trim(),
            'gemini-3-flash-preview',
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.5-flash-preview',
        ].filter(Boolean)));
    }
    classifyStitchRunnerFailure(result, requestedModel) {
        const stderr = String(result?.stderr || '').trim();
        const stdout = String(result?.stdout || '').trim();
        const details = stderr || stdout;
        const normalizedDetails = details.toLowerCase();
        const codeMatch = details.match(/(?:Gemini|Codex) Stitch adapter failed \[([a-z0-9_-]+)\]:/i);
        const code = codeMatch?.[1]?.toLowerCase() ||
            (/rate limit|quota|too many requests|resource exhausted|429/.test(normalizedDetails)
                ? 'rate_limit'
                : /unknown model|invalid model|unsupported model|model.*not found|model.*not available|model.*unavailable|permission.*model|does not support model|404/.test(normalizedDetails)
                    ? 'model_unavailable'
                    : /authentication|login|auth/.test(normalizedDetails)
                        ? 'auth'
                        : /enotfound|eai_again|getaddrinfo|network|timed out|timeout/.test(normalizedDetails)
                            ? 'network'
                            : 'generic');
        const modelLabel = requestedModel ? ` for model ${requestedModel}` : '';
        return {
            code,
            message: details
                ? `Stitch runner exited with code ${result.status}${modelLabel}: ${details}`
                : `Stitch runner exited with code ${result.status}${modelLabel}`,
            details,
        };
    }
    isGeminiModelFallbackEligible(failure) {
        return failure?.code === 'rate_limit' || failure?.code === 'model_unavailable';
    }
    getEffectiveStitchRunnerConfig(stitchConfig, runnerConfig) {
        const provider = this.getStitchProvider(stitchConfig);
        const defaultRunner = this.createDefaultStitchPluginConfig(provider).runner;
        if (!defaultRunner) {
            return null;
        }
        const builtInGeminiRunner = this.isBuiltInGeminiRunner(runnerConfig);
        const builtInCodexRunner = this.isBuiltInCodexRunner(runnerConfig);
        const builtInRunner = provider === 'gemini'
            ? this.isBuiltInGeminiRunner(runnerConfig)
            : provider === 'codex'
                ? this.isBuiltInCodexRunner(runnerConfig)
                : false;
        const isGeminiRunner = provider === 'gemini';
        const command = typeof runnerConfig?.command === 'string' ? runnerConfig.command.trim() : '';
        const args = Array.isArray(runnerConfig?.args) &&
            runnerConfig.args.length > 0 &&
            !(builtInGeminiRunner || builtInCodexRunner)
            ? runnerConfig.args.map(arg => String(arg))
            : defaultRunner.args;
        const tokenEnv = typeof runnerConfig?.token_env === 'string' ? runnerConfig.token_env.trim() : defaultRunner.token_env;
        return {
            ...defaultRunner,
            ...(runnerConfig || {}),
            command: command || defaultRunner.command,
            args,
            cwd: typeof runnerConfig?.cwd === 'string' && runnerConfig.cwd.trim().length > 0 ? runnerConfig.cwd.trim() : defaultRunner.cwd,
            token_env: builtInRunner && isGeminiRunner && tokenEnv === 'STITCH_API_TOKEN' ? '' : tokenEnv,
            extra_env: runnerConfig?.extra_env && typeof runnerConfig.extra_env === 'object' ? runnerConfig.extra_env : defaultRunner.extra_env,
        };
    }
    isBuiltInGeminiRunner(runnerConfig) {
        const command = typeof runnerConfig?.command === 'string' ? runnerConfig.command.trim() : '';
        if (!command) {
            return true;
        }
        const args = Array.isArray(runnerConfig?.args) ? runnerConfig.args.map(arg => String(arg)) : [];
        return command === 'node' && args.some(arg => arg.includes('gemini-stitch-adapter.js'));
    }
    isBuiltInCodexRunner(runnerConfig) {
        const command = typeof runnerConfig?.command === 'string' ? runnerConfig.command.trim() : '';
        if (!command) {
            return true;
        }
        const args = Array.isArray(runnerConfig?.args) ? runnerConfig.args.map(arg => String(arg)) : [];
        return command === 'node' && args.some(arg => arg.includes('codex-stitch-adapter.js'));
    }
    getEffectiveCheckpointRunnerConfig(checkpointConfig, runnerConfig) {
        const defaultRunner = this.createDefaultCheckpointPluginConfig().runner;
        const builtInRunner = this.isBuiltInCheckpointRunner(runnerConfig);
        const command = typeof runnerConfig?.command === 'string' ? runnerConfig.command.trim() : '';
        const args = Array.isArray(runnerConfig?.args) &&
            runnerConfig.args.length > 0 &&
            !builtInRunner
            ? runnerConfig.args.map(arg => String(arg))
            : defaultRunner.args;
        return {
            ...defaultRunner,
            ...(runnerConfig || {}),
            command: command || defaultRunner.command,
            args,
            cwd: typeof runnerConfig?.cwd === 'string' && runnerConfig.cwd.trim().length > 0 ? runnerConfig.cwd.trim() : defaultRunner.cwd,
            token_env: typeof runnerConfig?.token_env === 'string' ? runnerConfig.token_env.trim() : defaultRunner.token_env,
            extra_env: runnerConfig?.extra_env && typeof runnerConfig.extra_env === 'object' ? runnerConfig.extra_env : defaultRunner.extra_env,
        };
    }
    isBuiltInCheckpointRunner(runnerConfig) {
        const command = typeof runnerConfig?.command === 'string' ? runnerConfig.command.trim() : '';
        if (!command) {
            return true;
        }
        const args = Array.isArray(runnerConfig?.args) ? runnerConfig.args.map(arg => String(arg)) : [];
        return command === 'node' && args.some(arg => arg.includes('playwright-checkpoint-adapter.js'));
    }
    getPluginEntries(config) {
        const plugins = config.plugins || {};
        return Object.entries(plugins).map(([name, pluginConfig]) => {
            const capabilities = pluginConfig && typeof pluginConfig === 'object' && pluginConfig.capabilities && typeof pluginConfig.capabilities === 'object'
                ? Object.entries(pluginConfig.capabilities).map(([capabilityName, capabilityConfig]) => ({
                    name: capabilityName,
                    enabled: capabilityConfig?.enabled === true,
                    step: typeof capabilityConfig?.step === 'string' ? capabilityConfig.step : '',
                    activateWhenFlags: Array.isArray(capabilityConfig?.activate_when_flags)
                        ? capabilityConfig.activate_when_flags
                        : [],
                }))
                : [];
            const effectiveRunner = name === 'stitch'
                ? this.getEffectiveStitchRunnerConfig(pluginConfig, pluginConfig?.runner)
                : name === 'checkpoint'
                    ? this.getEffectiveCheckpointRunnerConfig(pluginConfig, pluginConfig?.runner)
                    : pluginConfig?.runner;
            const tokenEnv = typeof effectiveRunner?.token_env === 'string' ? effectiveRunner.token_env.trim() : '';
            const command = typeof effectiveRunner?.command === 'string' ? effectiveRunner.command.trim() : '';
            const extraEnvCount = effectiveRunner?.extra_env && typeof effectiveRunner.extra_env === 'object'
                ? Object.keys(effectiveRunner.extra_env).length
                : 0;
            const runner = effectiveRunner && typeof effectiveRunner === 'object'
                ? {
                    mode: typeof effectiveRunner.mode === 'string' ? effectiveRunner.mode : 'command',
                    configured: command.length > 0,
                    command,
                    source: name === 'stitch' && this.getStitchProvider(pluginConfig) === 'gemini' && this.isBuiltInGeminiRunner(pluginConfig?.runner)
                        ? 'built-in Gemini adapter'
                        : name === 'stitch' && this.getStitchProvider(pluginConfig) === 'codex' && this.isBuiltInCodexRunner(pluginConfig?.runner)
                            ? 'built-in Codex adapter'
                            : name === 'checkpoint' && this.isBuiltInCheckpointRunner(pluginConfig?.runner)
                                ? 'built-in Playwright adapter'
                                : 'custom',
                    cwd: typeof effectiveRunner.cwd === 'string' ? effectiveRunner.cwd : '',
                    timeoutMs: Number.isFinite(effectiveRunner.timeout_ms) && effectiveRunner.timeout_ms > 0
                        ? Math.floor(effectiveRunner.timeout_ms)
                        : name === 'checkpoint'
                            ? 900000
                            : 900000,
                    tokenEnv,
                    tokenPresent: tokenEnv ? Boolean(process.env[tokenEnv]) : false,
                    extraEnvCount,
                }
                : null;
            return {
                name,
                enabled: pluginConfig?.enabled === true,
                blocking: pluginConfig?.blocking !== false,
                capabilities,
                runner,
                runtimeBaseUrl: name === 'checkpoint' && typeof pluginConfig?.runtime?.base_url === 'string'
                    ? pluginConfig.runtime.base_url.trim()
                    : '',
                storageState: name === 'checkpoint' && typeof pluginConfig?.runtime?.storage_state === 'string'
                    ? pluginConfig.runtime.storage_state.trim()
                    : '',
            };
        });
    }
}
exports.PluginsCommand = PluginsCommand;