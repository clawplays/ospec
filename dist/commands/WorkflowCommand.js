"use strict";
/**
 * 工作流命令
 * 显示和管理工作流配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCommand = void 0;
const BaseCommand_1 = require("./BaseCommand");
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const workflow_1 = require("../workflow");
class WorkflowCommand extends BaseCommand_1.BaseCommand {
    async execute(action, ...args) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getWorkflowHelpText)());
                return;
            }
            switch (action) {
                case 'show': {
                    await this.showWorkflow(args[0] || process.cwd());
                    break;
                }
                case 'list-flags': {
                    await this.listSupportedFlags(args[0] || process.cwd());
                    break;
                }
                case 'set-mode': {
                    if (args.length === 0) {
                        console.error('Usage: ospec workflow set-mode <lite|standard|full> [path]');
                        process.exit(1);
                    }
                    await this.setMode(args[0], args[1] || process.cwd());
                    break;
                }
                case 'simulate': {
                    // 需要传入 mode 和 flags
                    console.error('Usage: ospec workflow simulate <mode> <flags...>');
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getWorkflowHelpText)());
            }
        }
        catch (error) {
            this.error(`Workflow command failed: ${error}`);
            throw error;
        }
    }
    async showWorkflow(projectPath) {
        try {
            // ?????????
            const config = await services_1.services.configManager.loadConfig(projectPath);
            const mode = config.mode;
            const workflow = new workflow_1.ConfigurableWorkflow(mode);
            const composer = new workflow_1.PluginWorkflowComposer(config);
            console.log('\n?? Workflow Configuration:');
            console.log('=========================\n');
            console.log(`Mode: ${mode.toUpperCase()}\n`);
            console.log('Core Steps (Required):');
            const coreSteps = composer.getCoreSteps();
            coreSteps.forEach((step, i) => {
                console.log(`  ${i + 1}. ${step}`);
            });
            console.log('\nOptional Steps:');
            const optionalSteps = config.workflow?.optional_steps || workflow.getConfig().optional_steps;
            for (const [name, config] of Object.entries(optionalSteps)) {
                if (config.enabled) {
                    console.log(`  ? ${name}`);
                    console.log(`    Triggers: ${config.when.join(', ')}`);
                }
            }
            console.log('\nEnabled Plugins:');
            const enabledPlugins = composer.getEnabledPlugins();
            if (enabledPlugins.length === 0) {
                console.log('  (none)');
            }
            else {
                enabledPlugins.forEach(plugin => {
                    console.log(`  ? ${plugin.name}${plugin.blocking ? ' (blocking)' : ''}`);
                });
            }
            const pluginCapabilities = composer.getPluginCapabilities();
            if (pluginCapabilities.length > 0) {
                console.log('\nPlugin-Contributed Steps:');
                pluginCapabilities.forEach(capability => {
                    console.log(`  ? ${capability.step}`);
                    console.log(`    Plugin: ${capability.plugin}`);
                    console.log(`    Capability: ${capability.capability}`);
                    console.log(`    Triggers: ${capability.activateWhenFlags.join(', ')}`);
                });
            }
            console.log('\nSupported Workflow Flags:');
            const flags = composer.getSupportedFlags();
            flags.forEach((flag, i) => {
                if ((i + 1) % 3 === 0) {
                    console.log(`  ${flag}`);
                }
                else {
                    process.stdout.write(`  ${flag}\n`);
                }
            });
            console.log('\n' + '='.repeat(25) + '\n');
        }
        catch (error) {
            this.error(`Failed to show workflow: ${error}`);
            throw error;
        }
    }
    async listSupportedFlags(projectPath) {
        try {
            const config = await services_1.services.configManager.loadConfig(projectPath);
            const composer = new workflow_1.PluginWorkflowComposer(config);
            const flags = composer.getSupportedFlags();
            console.log('\n???? Supported Workflow Flags:');
            console.log('===========================\n');
            flags.forEach(flag => {
                console.log(`  ? ${flag}`);
            });
            console.log('\n' + '='.repeat(27) + '\n');
        }
        catch (error) {
            this.error(`Failed to list flags: ${error}`);
            throw error;
        }
    }
    async setMode(mode, projectPath) {
        try {
            const supportedModes = new Set(['lite', 'standard', 'full']);
            if (!supportedModes.has(mode)) {
                throw new Error(`Unsupported workflow mode: ${mode}`);
            }
            const config = await services_1.services.configManager.loadConfig(projectPath);
            const nextConfig = {
                ...config,
                mode,
                workflow: JSON.parse(JSON.stringify(workflow_1.WORKFLOW_PRESETS[mode])),
            };
            await services_1.services.configManager.saveConfig(projectPath, nextConfig);
            this.success(`Workflow mode set to ${mode.toUpperCase()} for ${projectPath}`);
            this.info('  Updated .skillrc mode and workflow preset');
        }
        catch (error) {
            this.error(`Failed to set workflow mode: ${error}`);
            throw error;
        }
    }
}
exports.WorkflowCommand = WorkflowCommand;