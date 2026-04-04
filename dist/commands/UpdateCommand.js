"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommand = void 0;
const os_1 = require("os");
const path_1 = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const PluginsCommand_1 = require("./PluginsCommand");
const SkillCommand_1 = require("./SkillCommand");
class UpdateCommand extends BaseCommand_1.BaseCommand {
    async execute(rootDir) {
        const targetPath = rootDir ? (0, path_1.resolve)(rootDir) : process.cwd();
        const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
        if (!structure.initialized) {
            throw new Error('Project is not initialized. Run "ospec init" first.');
        }
        this.info(`Updating OSpec project at ${targetPath}`);
        const protocolResult = await services_1.services.projectService.syncProtocolGuidance(targetPath);
        const toolingResult = await this.syncProjectTooling(targetPath, protocolResult.documentLanguage);
        const pluginResult = await this.syncEnabledPluginAssets(targetPath);
        const archiveResult = await this.syncArchiveLayout(targetPath);
        const skillResult = await this.syncInstalledSkills();
        const refreshedFiles = Array.from(new Set([
            ...protocolResult.refreshedFiles,
            ...toolingResult.refreshedFiles,
            ...pluginResult.refreshedFiles,
            ...(archiveResult.configSaved ? ['.skillrc'] : []),
        ]));
        const createdFiles = [...protocolResult.createdFiles, ...toolingResult.createdFiles, ...pluginResult.createdFiles];
        const skippedFiles = [...protocolResult.skippedFiles, ...toolingResult.skippedFiles, ...pluginResult.skippedFiles];
        this.success(`Updated OSpec assets for ${protocolResult.projectName}`);
        this.info(`  document language: ${protocolResult.documentLanguage}`);
        this.info(`  created: ${createdFiles.length}`);
        this.info(`  refreshed: ${refreshedFiles.length}`);
        this.info(`  skipped: ${skippedFiles.length}`);
        if (toolingResult.hookInstalledFiles.length > 0) {
            this.info(`  git hooks refreshed: ${toolingResult.hookInstalledFiles.join(', ')}`);
        }
        if (toolingResult.migratedFiles.length > 0) {
            this.info(`  tooling migrated: ${toolingResult.migratedFiles.join(', ')}`);
        }
        if (toolingResult.removedLegacyFiles.length > 0) {
            this.info(`  legacy tooling removed: ${toolingResult.removedLegacyFiles.join(', ')}`);
        }
        if (toolingResult.migratedFiles.length > 0 || toolingResult.removedLegacyFiles.length > 0) {
            this.info('  note: update any custom repo references from root build-index-auto.* to "ospec index build" or "node .ospec/tools/build-index-auto.cjs"');
        }
        this.info(`  codex skills: ${this.formatManagedSkills(skillResult.codex)}`);
        if (skillResult.claude.length > 0) {
            this.info(`  claude skills: ${this.formatManagedSkills(skillResult.claude)}`);
        }
        if (pluginResult.enabledPlugins.length > 0) {
            this.info(`  plugin assets refreshed: ${pluginResult.enabledPlugins.join(', ')}`);
        }
        if (pluginResult.configSaved) {
            this.info('  plugin config normalized: .skillrc');
        }
        if (archiveResult.configSaved) {
            this.info('  archive layout normalized: .skillrc');
        }
        if (archiveResult.migratedChanges.length > 0) {
            this.info(`  archived changes migrated: ${archiveResult.migratedChanges.length}`);
        }
        this.info('  note: update refreshes protocol docs, tooling, hooks, managed skills, managed assets for already-enabled plugins, and the archive layout when needed');
        this.info('  note: it does not enable, disable, or migrate active or queued changes automatically');
    }
    async syncProjectTooling(rootDir, documentLanguage) {
        const migrationResult = await this.migrateLegacyBuildIndexScript(rootDir);
        const toolingPaths = [
            '.ospec/tools/build-index-auto.cjs',
            '.ospec/templates/hooks/pre-commit',
            '.ospec/templates/hooks/post-merge',
        ];
        const directCopyResult = await services_1.services.projectAssetService.syncDirectCopyAssets(rootDir, documentLanguage, {
            targetRelativePaths: toolingPaths,
        });
        const config = await services_1.services.configManager.loadConfig(rootDir);
        const hookInstallResult = await services_1.services.projectAssetService.installGitHooks(rootDir, config.hooks);
        return {
            createdFiles: [...directCopyResult.created],
            refreshedFiles: [...directCopyResult.refreshed],
            skippedFiles: [...directCopyResult.skipped],
            hookInstalledFiles: [...hookInstallResult.installed],
            migratedFiles: migrationResult.migratedFiles,
            removedLegacyFiles: migrationResult.removedLegacyFiles,
        };
    }
    async migrateLegacyBuildIndexScript(rootDir) {
        const targetRelativePath = '.ospec/tools/build-index-auto.cjs';
        const targetPath = (0, path_1.join)(rootDir, ...targetRelativePath.split('/'));
        const legacyRelativePaths = ['build-index-auto.cjs', 'build-index-auto.js'];
        const migratedFiles = [];
        const removedLegacyFiles = [];
        for (const legacyRelativePath of legacyRelativePaths) {
            const legacyPath = (0, path_1.join)(rootDir, legacyRelativePath);
            if (!(await services_1.services.fileService.exists(legacyPath))) {
                continue;
            }
            if (!(await services_1.services.fileService.exists(targetPath))) {
                await services_1.services.fileService.move(legacyPath, targetPath);
                migratedFiles.push(`${legacyRelativePath} -> ${targetRelativePath}`);
                continue;
            }
            await services_1.services.fileService.remove(legacyPath);
            removedLegacyFiles.push(legacyRelativePath);
        }
        return {
            migratedFiles,
            removedLegacyFiles,
        };
    }
    async syncEnabledPluginAssets(rootDir) {
        const rawConfig = await services_1.services.fileService.readJSON((0, path_1.join)(rootDir, '.skillrc'));
        const config = await services_1.services.configManager.loadConfig(rootDir);
        const nextConfig = JSON.parse(JSON.stringify(config));
        const pluginsCommand = new PluginsCommand_1.PluginsCommand();
        const createdFiles = [];
        const refreshedFiles = [];
        const skippedFiles = [];
        const enabledPlugins = [];
        let configChanged = false;
        const hasLegacyPluginKeys = Boolean(rawConfig?.plugins?.['stitch-gemini'] || rawConfig?.plugins?.['stitch-codex']);
        if (nextConfig.plugins?.stitch?.enabled) {
            enabledPlugins.push('stitch');
            configChanged = this.normalizeEnabledStitchPlugin(nextConfig.plugins.stitch, pluginsCommand) || configChanged;
            const stitchAssets = await this.ensureManagedPluginAssets(rootDir, [
                '.ospec/plugins/stitch/project.json',
                '.ospec/plugins/stitch/README.md',
                '.ospec/plugins/stitch/exports/.gitkeep',
                '.ospec/plugins/stitch/baselines/.gitkeep',
                '.ospec/plugins/stitch/cache/.gitkeep',
            ], async () => {
                await pluginsCommand.ensureStitchWorkspaceScaffold(rootDir, nextConfig.plugins.stitch);
            });
            createdFiles.push(...stitchAssets.createdFiles);
            skippedFiles.push(...stitchAssets.skippedFiles);
        }
        if (nextConfig.plugins?.checkpoint?.enabled) {
            enabledPlugins.push('checkpoint');
            configChanged = this.normalizeEnabledCheckpointPlugin(nextConfig.plugins.checkpoint, pluginsCommand) || configChanged;
            const checkpointAssets = await this.ensureManagedPluginAssets(rootDir, [
                '.ospec/plugins/checkpoint/routes.yaml',
                '.ospec/plugins/checkpoint/flows.yaml',
                '.ospec/plugins/checkpoint/README.md',
                '.ospec/plugins/checkpoint/baselines/.gitkeep',
                '.ospec/plugins/checkpoint/auth/.gitkeep',
                '.ospec/plugins/checkpoint/auth/README.md',
                '.ospec/plugins/checkpoint/auth/login.example.js',
                '.ospec/plugins/checkpoint/cache/.gitkeep',
            ], async () => {
                await pluginsCommand.ensureCheckpointWorkspaceScaffold(rootDir, nextConfig.plugins.checkpoint);
            });
            createdFiles.push(...checkpointAssets.createdFiles);
            skippedFiles.push(...checkpointAssets.skippedFiles);
        }
        if (enabledPlugins.length > 0 && (hasLegacyPluginKeys || configChanged)) {
            await services_1.services.configManager.saveConfig(rootDir, nextConfig);
            refreshedFiles.push('.skillrc');
        }
        return {
            createdFiles,
            refreshedFiles,
            skippedFiles,
            enabledPlugins,
            configSaved: refreshedFiles.includes('.skillrc'),
        };
    }
    normalizeEnabledStitchPlugin(stitchConfig, pluginsCommand) {
        const before = JSON.stringify(stitchConfig);
        stitchConfig.runner = stitchConfig.runner || pluginsCommand.createDefaultStitchPluginConfig().runner;
        stitchConfig.gemini = stitchConfig.gemini || {
            model: 'gemini-3-flash-preview',
            auto_switch_on_limit: true,
            save_on_fallback: true,
        };
        stitchConfig.codex = stitchConfig.codex || {
            model: '',
            mcp_server: 'stitch',
        };
        if (!stitchConfig.provider) {
            stitchConfig.provider = 'gemini';
        }
        const provider = pluginsCommand.getStitchProvider(stitchConfig);
        if (!stitchConfig.runner.command) {
            stitchConfig.runner.command = 'node';
        }
        if (!Array.isArray(stitchConfig.runner.args) ||
            stitchConfig.runner.args.length === 0 ||
            pluginsCommand.isBuiltInGeminiRunner(stitchConfig.runner) ||
            pluginsCommand.isBuiltInCodexRunner(stitchConfig.runner)) {
            stitchConfig.runner.args = pluginsCommand.getDefaultRunnerArgs(provider);
        }
        if (!stitchConfig.runner.cwd) {
            stitchConfig.runner.cwd = '${project_path}';
        }
        if (typeof stitchConfig.runner.token_env !== 'string' ||
            (provider === 'gemini' &&
                pluginsCommand.isBuiltInGeminiRunner(stitchConfig.runner) &&
                stitchConfig.runner.token_env.trim() === 'STITCH_API_TOKEN')) {
            stitchConfig.runner.token_env = '';
        }
        stitchConfig.capabilities = stitchConfig.capabilities || {};
        stitchConfig.capabilities.page_design_review = stitchConfig.capabilities.page_design_review || {
            enabled: false,
            step: 'stitch_design_review',
            activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
        };
        return before !== JSON.stringify(stitchConfig);
    }
    normalizeEnabledCheckpointPlugin(checkpointConfig, pluginsCommand) {
        const before = JSON.stringify(checkpointConfig);
        const defaultConfig = pluginsCommand.createDefaultCheckpointPluginConfig();
        checkpointConfig.runtime = checkpointConfig.runtime || defaultConfig.runtime;
        checkpointConfig.runner = checkpointConfig.runner || defaultConfig.runner;
        checkpointConfig.capabilities = checkpointConfig.capabilities || {};
        checkpointConfig.capabilities.ui_review = checkpointConfig.capabilities.ui_review || {
            enabled: false,
            step: 'checkpoint_ui_review',
            activate_when_flags: ['ui_change', 'page_design', 'landing_page'],
        };
        checkpointConfig.capabilities.flow_check = checkpointConfig.capabilities.flow_check || {
            enabled: false,
            step: 'checkpoint_flow_check',
            activate_when_flags: ['feature_flow', 'api_change', 'backend_change', 'integration_change'],
        };
        checkpointConfig.stitch_integration = checkpointConfig.stitch_integration || {
            enabled: true,
            auto_pass_stitch_review: true,
        };
        checkpointConfig.runtime.startup = checkpointConfig.runtime.startup || defaultConfig.runtime.startup;
        checkpointConfig.runtime.readiness = checkpointConfig.runtime.readiness || defaultConfig.runtime.readiness;
        checkpointConfig.runtime.auth = checkpointConfig.runtime.auth || defaultConfig.runtime.auth;
        checkpointConfig.runtime.shutdown = checkpointConfig.runtime.shutdown || defaultConfig.runtime.shutdown;
        if (!checkpointConfig.runner.command) {
            checkpointConfig.runner.command = 'node';
        }
        if (!Array.isArray(checkpointConfig.runner.args) ||
            checkpointConfig.runner.args.length === 0 ||
            pluginsCommand.isBuiltInCheckpointRunner(checkpointConfig.runner)) {
            checkpointConfig.runner.args = pluginsCommand.getDefaultCheckpointRunnerArgs();
        }
        if (!checkpointConfig.runner.cwd) {
            checkpointConfig.runner.cwd = '${project_path}';
        }
        if (typeof checkpointConfig.runner.token_env !== 'string') {
            checkpointConfig.runner.token_env = '';
        }
        return before !== JSON.stringify(checkpointConfig);
    }
    async ensureManagedPluginAssets(rootDir, relativePaths, ensureAssets) {
        const uniqueRelativePaths = Array.from(new Set(relativePaths.map(item => item.replace(/\\/g, '/'))));
        const beforeMap = {};
        for (const relativePath of uniqueRelativePaths) {
            beforeMap[relativePath] = await services_1.services.fileService.exists((0, path_1.join)(rootDir, ...relativePath.split('/')));
        }
        await ensureAssets();
        const createdFiles = [];
        const skippedFiles = [];
        for (const relativePath of uniqueRelativePaths) {
            const exists = await services_1.services.fileService.exists((0, path_1.join)(rootDir, ...relativePath.split('/')));
            if (!exists) {
                continue;
            }
            if (beforeMap[relativePath]) {
                skippedFiles.push(relativePath);
            }
            else {
                createdFiles.push(relativePath);
            }
        }
        return { createdFiles, skippedFiles };
    }
    async syncArchiveLayout(rootDir) {
        const rawConfig = await services_1.services.fileService.readJSON((0, path_1.join)(rootDir, '.skillrc'));
        const config = await services_1.services.configManager.loadConfig(rootDir);
        const nextConfig = JSON.parse(JSON.stringify(config));
        const archivedRoot = (0, path_1.join)(rootDir, 'changes', 'archived');
        const migratedChanges = [];
        if (await services_1.services.fileService.exists(archivedRoot)) {
            const entryNames = (await services_1.services.fileService.readDir(archivedRoot)).sort((left, right) => left.localeCompare(right));
            for (const entryName of entryNames) {
                const entryPath = (0, path_1.join)(archivedRoot, entryName);
                const stat = await services_1.services.fileService.stat(entryPath);
                if (!stat.isDirectory()) {
                    continue;
                }
                const parsed = this.parseLegacyArchiveDirName(entryName);
                if (!parsed) {
                    continue;
                }
                const archivedState = await this.readArchivedChangeState(entryPath);
                if (!archivedState) {
                    continue;
                }
                const archiveDayRoot = (0, path_1.join)(archivedRoot, parsed.month, parsed.day);
                await services_1.services.fileService.ensureDir(archiveDayRoot);
                const targetPath = await this.resolveArchiveMigrationTarget(archiveDayRoot, archivedState.feature);
                await services_1.services.fileService.move(entryPath, targetPath);
                migratedChanges.push({
                    from: `changes/archived/${entryName}`,
                    to: this.toRelativePath(rootDir, targetPath),
                });
            }
        }
        let configSaved = false;
        if (nextConfig.archive?.layout !== 'month-day') {
            nextConfig.archive = {
                ...(nextConfig.archive || {}),
                layout: 'month-day',
            };
            await services_1.services.configManager.saveConfig(rootDir, nextConfig);
            configSaved = true;
        }
        else if (!rawConfig?.archive || rawConfig.archive.layout !== 'month-day') {
            await services_1.services.configManager.saveConfig(rootDir, nextConfig);
            configSaved = true;
        }
        return {
            configSaved,
            migratedChanges,
        };
    }
    parseLegacyArchiveDirName(entryName) {
        const match = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(entryName);
        if (!match) {
            return null;
        }
        return {
            month: match[1].slice(0, 7),
            day: match[1],
            leafName: match[2],
        };
    }
    async resolveArchiveMigrationTarget(archiveDayRoot, leafName) {
        let candidate = leafName;
        let index = 2;
        while (await services_1.services.fileService.exists((0, path_1.join)(archiveDayRoot, candidate))) {
            candidate = `${leafName}-${index}`;
            index += 1;
        }
        return (0, path_1.join)(archiveDayRoot, candidate);
    }
    async readArchivedChangeState(entryPath) {
        const statePath = (0, path_1.join)(entryPath, 'state.json');
        if (!(await services_1.services.fileService.exists(statePath))) {
            return null;
        }
        try {
            const state = await services_1.services.fileService.readJSON(statePath);
            if (typeof state?.feature !== 'string' || state.feature.trim().length === 0) {
                return null;
            }
            if (state.status !== 'archived') {
                return null;
            }
            return {
                feature: state.feature.trim(),
            };
        }
        catch {
            return null;
        }
    }
    toRelativePath(rootDir, targetPath) {
        return (0, path_1.relative)(rootDir, targetPath).replace(/\\/g, '/');
    }
    getManagedSkillNames() {
        return ['ospec', 'ospec-change'];
    }
    formatManagedSkills(results) {
        return results.map(result => result.skillName).join(', ');
    }
    async syncInstalledSkills() {
        const skillCommand = new SkillCommand_1.SkillCommand();
        const codex = [];
        for (const skillName of this.getManagedSkillNames()) {
            codex.push(await skillCommand.installSkill('codex', skillName));
        }
        const claude = [];
        if (await this.shouldSyncClaudeSkills()) {
            for (const skillName of this.getManagedSkillNames()) {
                claude.push(await skillCommand.installSkill('claude', skillName));
            }
        }
        return { codex, claude };
    }
    resolveProviderHome(provider) {
        const envHome = provider === 'claude'
            ? String(process.env.CLAUDE_HOME || '').trim()
            : String(process.env.CODEX_HOME || '').trim();
        if (envHome) {
            return (0, path_1.resolve)(envHome);
        }
        return provider === 'claude'
            ? (0, path_1.join)((0, os_1.homedir)(), '.claude')
            : (0, path_1.join)((0, os_1.homedir)(), '.codex');
    }
    async shouldSyncClaudeSkills() {
        const claudeHome = this.resolveProviderHome('claude');
        if (String(process.env.CLAUDE_HOME || '').trim()) {
            return true;
        }
        return services_1.services.fileService.exists(claudeHome);
    }
}
exports.UpdateCommand = UpdateCommand;
