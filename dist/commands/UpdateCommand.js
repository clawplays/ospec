"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommand = void 0;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const PluginsCommand_1 = require("./PluginsCommand");
const SkillCommand_1 = require("./SkillCommand");
const PostSyncMaintenanceService_1 = require("../services/PostSyncMaintenanceService");
class UpdateCommand extends BaseCommand_1.BaseCommand {
    getPluginRegistryService() {
        return services_1.services.pluginRegistryService;
    }
    async execute(rootDir) {
        const targetPath = rootDir ? (0, path_1.resolve)(rootDir) : process.cwd();
        const detectedStructure = await services_1.services.projectService.detectProjectStructure(targetPath);
        const legacyRepair = await this.repairLegacyProjectForUpdate(targetPath, detectedStructure);
        const structure = legacyRepair.performed
            ? await services_1.services.projectService.detectProjectStructure(targetPath)
            : detectedStructure;
        if (!structure.initialized) {
            throw new Error('Project is not initialized. Run "ospec init" first.');
        }
        this.info(`Updating OSpec project at ${targetPath}`);
        const cliVersionMetadataSync = await this.syncProjectCliVersionMetadata(targetPath);
        const legacyKnowledgeMigration = await this.migrateLegacyKnowledgeLayout(targetPath, cliVersionMetadataSync.effectiveProjectCliVersion);
        const protocolResult = await services_1.services.projectService.syncProtocolGuidance(targetPath);
        const toolingResult = await this.syncProjectTooling(targetPath, protocolResult.documentLanguage);
        const pluginResult = await this.syncEnabledPluginAssets(targetPath);
        const archiveResult = await this.syncArchiveLayout(targetPath);
        const skillResult = await this.syncInstalledSkills();
        const postSyncMaintenance = await this.runPostSyncMaintenance();
        const refreshedFiles = Array.from(new Set([
            ...(cliVersionMetadataSync.configSaved ? ['.skillrc'] : []),
            ...legacyKnowledgeMigration.refreshedFiles,
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
        if (legacyRepair.performed) {
            this.info(`  legacy project repaired: ${legacyRepair.markers.join(', ')}`);
            if (legacyRepair.createdPaths.length > 0) {
                this.info(`  legacy paths created: ${legacyRepair.createdPaths.join(', ')}`);
            }
            if (legacyRepair.refreshedPaths.length > 0) {
                this.info(`  legacy paths normalized: ${legacyRepair.refreshedPaths.join(', ')}`);
            }
        }
        if (cliVersionMetadataSync.configSaved) {
            this.info('  project CLI version metadata normalized: .skillrc');
        }
        if (legacyKnowledgeMigration.performed) {
            if (legacyKnowledgeMigration.migratedPaths.length > 0) {
                this.info(`  legacy knowledge migrated: ${legacyKnowledgeMigration.migratedPaths.join(', ')}`);
            }
            if (legacyKnowledgeMigration.refreshedFiles.length > 0) {
                this.info(`  migrated knowledge links refreshed: ${legacyKnowledgeMigration.refreshedFiles.join(', ')}`);
            }
            if (legacyKnowledgeMigration.removedPaths.length > 0) {
                this.info(`  legacy knowledge paths removed: ${legacyKnowledgeMigration.removedPaths.join(', ')}`);
            }
        }
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
        if (postSyncMaintenance.removedPaths.length > 0) {
            this.info(`  stale plugin skills removed: ${postSyncMaintenance.removedPaths.length}`);
        }
        if (pluginResult.enabledPlugins.length > 0) {
            this.info(`  plugin assets refreshed: ${pluginResult.enabledPlugins.join(', ')}`);
        }
        const restoredPluginPackages = pluginResult.packageUpdates.filter(result => result.status === 'restored');
        for (const packageUpdate of restoredPluginPackages) {
            this.info(`  plugin package restored: ${packageUpdate.pluginName} ${packageUpdate.previousVersion} -> ${packageUpdate.nextVersion} (${packageUpdate.packageName})`);
        }
        const upgradedPluginPackages = pluginResult.packageUpdates.filter(result => result.status === 'upgraded');
        for (const packageUpdate of upgradedPluginPackages) {
            this.info(`  plugin package upgraded: ${packageUpdate.pluginName} ${packageUpdate.previousVersion} -> ${packageUpdate.nextVersion} (${packageUpdate.packageName})`);
        }
        const skippedPluginPackages = pluginResult.packageUpdates.filter(result => result.status === 'missing' || result.status === 'skipped');
        for (const packageUpdate of skippedPluginPackages) {
            this.info(`  plugin package check skipped: ${packageUpdate.pluginName} (${packageUpdate.reason})`);
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
        this.info('  note: it can repair legacy OSpec projects with an existing OSpec footprint before refreshing assets');
        this.info('  note: it auto-upgrades already-enabled plugin npm packages only when a newer compatible version is available');
        this.info('  note: it does not upgrade the CLI itself');
        this.info('  note: it does not enable, disable, or migrate active or queued changes automatically');
    }
    async repairLegacyProjectForUpdate(rootDir, structure) {
        if (structure.initialized) {
            return {
                performed: false,
                markers: [],
                createdPaths: [],
                refreshedPaths: [],
            };
        }
        const markers = await this.detectLegacyProjectMarkers(rootDir);
        const strongMarkers = markers.filter(marker => marker === '.skillrc' || marker === '.ospec' || marker === 'changes' || marker === 'for-ai' || marker === 'SKILL.index.json');
        const repairable = markers.includes('.skillrc')
            ? strongMarkers.length >= 1
            : strongMarkers.length >= 2;
        if (!repairable) {
            return {
                performed: false,
                markers,
                createdPaths: [],
                refreshedPaths: [],
            };
        }
        const createdPaths = [];
        const refreshedPaths = [];
        let config = null;
        if (markers.includes('.skillrc')) {
            const normalizedConfig = await services_1.services.configManager.loadConfig(rootDir);
            await services_1.services.configManager.saveConfig(rootDir, normalizedConfig);
            config = normalizedConfig;
            refreshedPaths.push('.skillrc');
        }
        else {
            const defaultConfig = await services_1.services.configManager.createDefaultConfig('full');
            await services_1.services.configManager.saveConfig(rootDir, defaultConfig);
            config = defaultConfig;
            createdPaths.push('.skillrc');
        }
        const projectLayout = config?.projectLayout === 'nested' ? 'nested' : 'classic';
        const layoutPaths = projectLayout === 'nested'
            ? ['.ospec', '.ospec/changes/active', '.ospec/changes/archived']
            : ['.ospec', 'changes/active', 'changes/archived'];
        for (const relativePath of layoutPaths) {
            const targetPath = (0, path_1.join)(rootDir, ...relativePath.split('/'));
            if (await services_1.services.fileService.exists(targetPath)) {
                continue;
            }
            await services_1.services.fileService.ensureDir(targetPath);
            createdPaths.push(relativePath);
        }
        return {
            performed: true,
            markers,
            createdPaths,
            refreshedPaths,
        };
    }
    async detectLegacyProjectMarkers(rootDir) {
        const markers = [];
        for (const relativePath of ['.skillrc', '.ospec', 'changes', 'for-ai', 'SKILL.index.json', 'SKILL.md']) {
            if (await services_1.services.fileService.exists((0, path_1.join)(rootDir, ...relativePath.split('/')))) {
                markers.push(relativePath);
            }
        }
        return markers;
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
    async migrateLegacyKnowledgeLayout(rootDir, effectiveProjectCliVersion) {
        const config = await services_1.services.configManager.loadConfig(rootDir).catch(() => null);
        if (!(await this.isLegacyKnowledgeMigrationEligible(rootDir, config, effectiveProjectCliVersion))) {
            return {
                performed: false,
                migratedPaths: [],
                refreshedFiles: [],
                removedPaths: [],
            };
        }
        const knowledgeRoot = (0, path_1.join)(rootDir, '.ospec', 'knowledge');
        const migrations = [
            {
                sourcePath: (0, path_1.join)(rootDir, '.ospec', 'src'),
                targetPath: (0, path_1.join)(knowledgeRoot, 'src'),
                sourceRelativePath: '.ospec/src',
                targetRelativePath: '.ospec/knowledge/src',
            },
            {
                sourcePath: (0, path_1.join)(rootDir, '.ospec', 'tests'),
                targetPath: (0, path_1.join)(knowledgeRoot, 'tests'),
                sourceRelativePath: '.ospec/tests',
                targetRelativePath: '.ospec/knowledge/tests',
            },
        ];
        if (!(await Promise.all(migrations.map(item => services_1.services.fileService.exists(item.sourcePath)))).some(Boolean)) {
            return {
                performed: false,
                migratedPaths: [],
                refreshedFiles: [],
                removedPaths: [],
            };
        }
        await services_1.services.fileService.ensureDir(knowledgeRoot);
        const migratedPaths = [];
        const removedPaths = [];
        for (const migration of migrations) {
            if (!(await services_1.services.fileService.exists(migration.sourcePath))) {
                continue;
            }
            if (!(await services_1.services.fileService.exists(migration.targetPath))) {
                await services_1.services.fileService.move(migration.sourcePath, migration.targetPath);
                migratedPaths.push(`${migration.sourceRelativePath} -> ${migration.targetRelativePath}`);
                continue;
            }
            await this.mergeLegacyKnowledgeDirectory(migration.sourcePath, migration.targetPath);
            await services_1.services.fileService.remove(migration.sourcePath);
            migratedPaths.push(`${migration.sourceRelativePath} -> ${migration.targetRelativePath}`);
            removedPaths.push(migration.sourceRelativePath);
        }
        const refreshedFiles = await this.refreshMigratedKnowledgeLinks(rootDir);
        return {
            performed: migratedPaths.length > 0 || refreshedFiles.length > 0 || removedPaths.length > 0,
            migratedPaths,
            refreshedFiles,
            removedPaths,
        };
    }
    async syncProjectCliVersionMetadata(rootDir) {
        const config = await services_1.services.configManager.loadConfig(rootDir).catch(() => null);
        if (!config) {
            return {
                configSaved: false,
                effectiveProjectCliVersion: null,
            };
        }
        const detectedProjectCliVersion = await this.detectProjectCliVersion(rootDir, config);
        if (typeof config.ospecCliVersion === 'string' && config.ospecCliVersion.trim().length > 0) {
            return {
                configSaved: false,
                effectiveProjectCliVersion: config.ospecCliVersion.trim(),
            };
        }
        if (!detectedProjectCliVersion) {
            return {
                configSaved: false,
                effectiveProjectCliVersion: null,
            };
        }
        await services_1.services.configManager.saveConfig(rootDir, {
            ...config,
            ospecCliVersion: detectedProjectCliVersion,
        });
        return {
            configSaved: true,
            effectiveProjectCliVersion: detectedProjectCliVersion,
        };
    }
    async detectProjectCliVersion(rootDir, config) {
        if (typeof config?.ospecCliVersion === 'string' && config.ospecCliVersion.trim().length > 0) {
            return config.ospecCliVersion.trim();
        }
        const assetManifestPath = (0, path_1.join)(rootDir, '.ospec', 'asset-sources.json');
        if (await services_1.services.fileService.exists(assetManifestPath)) {
            try {
                const assetManifest = await services_1.services.fileService.readJSON(assetManifestPath);
                if (typeof assetManifest?.ospecCliVersion === 'string' && assetManifest.ospecCliVersion.trim().length > 0) {
                    return assetManifest.ospecCliVersion.trim();
                }
            }
            catch {
                return null;
            }
            return '1.0.0';
        }
        const legacyKnowledgeRoots = [
            (0, path_1.join)(rootDir, '.ospec', 'src'),
            (0, path_1.join)(rootDir, '.ospec', 'tests'),
        ];
        if ((await Promise.all(legacyKnowledgeRoots.map(target => services_1.services.fileService.exists(target)))).some(Boolean)) {
            return '1.0.0';
        }
        return null;
    }
    async isLegacyKnowledgeMigrationEligible(rootDir, config, effectiveProjectCliVersion) {
        if (config?.projectLayout !== 'nested') {
            return false;
        }
        if (!effectiveProjectCliVersion || !this.isCliVersionAtLeast(effectiveProjectCliVersion, '1.0.0')) {
            return false;
        }
        return true;
    }
    isCliVersionAtLeast(version, minimum) {
        const parse = (value) => String(value || '')
            .trim()
            .replace(/^v/i, '')
            .split('-', 1)[0]
            .split('.')
            .map(part => Number.parseInt(part, 10));
        const left = parse(version);
        const right = parse(minimum);
        for (let index = 0; index < Math.max(left.length, right.length, 3); index += 1) {
            const leftPart = Number.isFinite(left[index]) ? left[index] : 0;
            const rightPart = Number.isFinite(right[index]) ? right[index] : 0;
            if (leftPart > rightPart) {
                return true;
            }
            if (leftPart < rightPart) {
                return false;
            }
        }
        return true;
    }
    async mergeLegacyKnowledgeDirectory(sourceDir, targetDir) {
        await services_1.services.fileService.ensureDir(targetDir);
        const entries = await fs_1.promises.readdir(sourceDir, { withFileTypes: true });
        for (const entry of entries) {
            const sourcePath = (0, path_1.join)(sourceDir, entry.name);
            const targetPath = (0, path_1.join)(targetDir, entry.name);
            if (entry.isDirectory()) {
                await this.mergeLegacyKnowledgeDirectory(sourcePath, targetPath);
                continue;
            }
            if (await services_1.services.fileService.exists(targetPath)) {
                continue;
            }
            await services_1.services.fileService.move(sourcePath, targetPath);
        }
    }
    async refreshMigratedKnowledgeLinks(rootDir) {
        const refreshedFiles = [];
        const knowledgeSourceRoot = (0, path_1.join)(rootDir, '.ospec', 'knowledge', 'src');
        const rewrites = [
            {
                filePath: (0, path_1.join)(rootDir, '.ospec', 'SKILL.md'),
                transform: content => content
                    .replace(/\]\(src\/SKILL\.md\)/g, '](knowledge/src/SKILL.md)')
                    .replace(/\]\(tests\/SKILL\.md\)/g, '](knowledge/tests/SKILL.md)'),
            },
            {
                filePath: (0, path_1.join)(rootDir, '.ospec', 'docs', 'project', 'module-map.md'),
                transform: content => content.replace(/\(src\/modules\//g, '(../../knowledge/src/modules/'),
            },
            {
                filePath: (0, path_1.join)(knowledgeSourceRoot, 'SKILL.md'),
                transform: content => content
                    .replace(/src\/SKILL\.md/g, 'knowledge/src/SKILL.md')
                    .replace(/`src\/modules\/<module>\/SKILL\.md`/g, '`knowledge/src/modules/<module>/SKILL.md`'),
            },
            {
                filePath: (0, path_1.join)(knowledgeSourceRoot, 'core', 'SKILL.md'),
                transform: content => content
                    .replace(/src\/SKILL\.md/g, 'knowledge/src/SKILL.md')
                    .replace(/\.\.\/\.\.\/docs\/project\//g, '../../../docs/project/'),
            },
        ];
        for (const rewrite of rewrites) {
            if (await this.rewriteFileIfChanged(rewrite.filePath, rewrite.transform)) {
                refreshedFiles.push(this.toRelativePath(rootDir, rewrite.filePath));
            }
        }
        const moduleSkillsRoot = (0, path_1.join)(knowledgeSourceRoot, 'modules');
        if (!(await services_1.services.fileService.exists(moduleSkillsRoot))) {
            return refreshedFiles;
        }
        const moduleEntries = await fs_1.promises.readdir(moduleSkillsRoot, { withFileTypes: true });
        for (const entry of moduleEntries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const skillPath = (0, path_1.join)(moduleSkillsRoot, entry.name, 'SKILL.md');
            if (await this.rewriteFileIfChanged(skillPath, content => content
                .replace(/src\/SKILL\.md/g, 'knowledge/src/SKILL.md')
                .replace(/\.\.\/\.\.\/\.\.\/docs\/project\//g, '../../../../docs/project/'))) {
                refreshedFiles.push(this.toRelativePath(rootDir, skillPath));
            }
        }
        return refreshedFiles;
    }
    async rewriteFileIfChanged(filePath, transform) {
        if (!(await services_1.services.fileService.exists(filePath))) {
            return false;
        }
        const before = await services_1.services.fileService.readFile(filePath);
        const after = transform(before);
        if (after === before) {
            return false;
        }
        await services_1.services.fileService.writeFile(filePath, after);
        return true;
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
        const packageUpdates = [];
        let configChanged = false;
        const hasLegacyPluginKeys = Boolean(rawConfig?.plugins?.['stitch-gemini'] || rawConfig?.plugins?.['stitch-codex']);
        if (nextConfig.plugins?.stitch?.enabled) {
            enabledPlugins.push('stitch');
            const stitchRestore = await this.ensureEnabledPluginPackageAvailable('stitch', nextConfig.plugins.stitch);
            if (stitchRestore.status !== 'current') {
                packageUpdates.push(stitchRestore);
            }
            packageUpdates.push(await this.maybeUpgradeEnabledPluginPackage('stitch'));
            configChanged = this.normalizeEnabledStitchPlugin(nextConfig.plugins.stitch, pluginsCommand) || configChanged;
            const installedStitch = await this.getPluginRegistryService().getInstalledPluginManifest('stitch');
            const stitchWorkspaceRoot = typeof nextConfig.plugins.stitch?.workspace_root === 'string' && nextConfig.plugins.stitch.workspace_root.trim().length > 0
                ? nextConfig.plugins.stitch.workspace_root.trim()
                : '.ospec/plugins/stitch';
            if (installedStitch) {
                const stitchDefaultConfig = this.getPluginRegistryService().createExternalPluginProjectConfig(installedStitch.record.package_name, installedStitch.record.version, installedStitch.manifest);
                configChanged = this.refreshExternalPluginInstalledMetadata(nextConfig.plugins.stitch, installedStitch, stitchDefaultConfig) || configChanged;
                const stitchAssets = await this.getPluginRegistryService().syncProjectPluginAssets('stitch', rootDir, stitchWorkspaceRoot);
                createdFiles.push(...stitchAssets);
            }
            else {
                skippedFiles.push('.ospec/plugins/stitch');
            }
        }
        if (nextConfig.plugins?.checkpoint?.enabled) {
            enabledPlugins.push('checkpoint');
            const checkpointRestore = await this.ensureEnabledPluginPackageAvailable('checkpoint', nextConfig.plugins.checkpoint);
            if (checkpointRestore.status !== 'current') {
                packageUpdates.push(checkpointRestore);
            }
            packageUpdates.push(await this.maybeUpgradeEnabledPluginPackage('checkpoint'));
            configChanged = this.normalizeEnabledCheckpointPlugin(nextConfig.plugins.checkpoint, pluginsCommand) || configChanged;
            const installedCheckpoint = await this.getPluginRegistryService().getInstalledPluginManifest('checkpoint');
            const checkpointWorkspaceRoot = typeof nextConfig.plugins.checkpoint?.workspace_root === 'string' && nextConfig.plugins.checkpoint.workspace_root.trim().length > 0
                ? nextConfig.plugins.checkpoint.workspace_root.trim()
                : '.ospec/plugins/checkpoint';
            if (installedCheckpoint) {
                const checkpointDefaultConfig = this.getPluginRegistryService().createExternalPluginProjectConfig(installedCheckpoint.record.package_name, installedCheckpoint.record.version, installedCheckpoint.manifest);
                configChanged = this.refreshExternalPluginInstalledMetadata(nextConfig.plugins.checkpoint, installedCheckpoint, checkpointDefaultConfig) || configChanged;
                const checkpointAssets = await this.getPluginRegistryService().syncProjectPluginAssets('checkpoint', rootDir, checkpointWorkspaceRoot);
                createdFiles.push(...checkpointAssets);
            }
            else {
                skippedFiles.push('.ospec/plugins/checkpoint');
            }
        }
        for (const [pluginName, pluginConfig] of Object.entries(nextConfig.plugins || {})) {
            if (pluginName === 'stitch' || pluginName === 'checkpoint' || !pluginConfig?.enabled) {
                continue;
            }
            enabledPlugins.push(pluginName);
            const pluginRestore = await this.ensureEnabledPluginPackageAvailable(pluginName, pluginConfig);
            if (pluginRestore.status !== 'current') {
                packageUpdates.push(pluginRestore);
            }
            packageUpdates.push(await this.maybeUpgradeEnabledPluginPackage(pluginName));
            const installedPlugin = await this.getPluginRegistryService().getInstalledPluginManifest(pluginName);
            if (!installedPlugin) {
                skippedFiles.push(`.ospec/plugins/${pluginName}`);
                continue;
            }
            const before = JSON.stringify(pluginConfig);
            const defaultConfig = this.getPluginRegistryService().createExternalPluginProjectConfig(installedPlugin.record.package_name, installedPlugin.record.version, installedPlugin.manifest);
            nextConfig.plugins[pluginName] = pluginsCommand.mergeExternalPluginConfig(defaultConfig, pluginConfig, true);
            configChanged = this.refreshExternalPluginInstalledMetadata(nextConfig.plugins[pluginName], installedPlugin, defaultConfig) || configChanged;
            configChanged = before !== JSON.stringify(nextConfig.plugins[pluginName]) || configChanged;
            const workspaceRoot = typeof nextConfig.plugins[pluginName]?.workspace_root === 'string' && nextConfig.plugins[pluginName].workspace_root.trim().length > 0
                ? nextConfig.plugins[pluginName].workspace_root.trim()
                : `.ospec/plugins/${pluginName}`;
            const externalCreatedFiles = await this.getPluginRegistryService().syncProjectPluginAssets(pluginName, rootDir, workspaceRoot);
            createdFiles.push(...externalCreatedFiles);
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
            packageUpdates,
        };
    }
    async ensureEnabledPluginPackageAvailable(pluginName, pluginConfig) {
        const installedPlugin = await this.getPluginRegistryService().getInstalledPluginManifest(pluginName);
        if (installedPlugin) {
            return {
                pluginName,
                packageName: installedPlugin.record.package_name,
                previousVersion: installedPlugin.record.version,
                nextVersion: installedPlugin.record.version,
                official: installedPlugin.record.official === true,
                status: 'current',
                reason: 'plugin package is already installed',
            };
        }
        const recordedVersion = typeof pluginConfig?.version === 'string' && pluginConfig.version.trim().length > 0
            ? pluginConfig.version.trim()
            : 'missing';
        const packageName = typeof pluginConfig?.package_name === 'string' ? pluginConfig.package_name.trim() : '';
        const official = pluginName === 'stitch' || pluginName === 'checkpoint' || pluginConfig?.official === true;
        try {
            const restored = official
                ? await this.getPluginRegistryService().installOfficialPlugin(pluginName, 'update-repair-missing')
                : packageName
                    ? await this.getPluginRegistryService().reinstallPluginPackage(pluginName, recordedVersion !== 'missing' ? `${packageName}@${recordedVersion}` : packageName, {
                        reason: 'update-repair-missing',
                        packageName,
                        resolvedVersion: recordedVersion !== 'missing' ? recordedVersion : undefined,
                    })
                    : null;
            if (!restored) {
                throw new Error(`Enabled plugin ${pluginName} is missing globally and cannot be restored because no package_name is recorded in .skillrc.`);
            }
            return {
                pluginName,
                packageName: restored.package_name,
                previousVersion: `${recordedVersion} (missing)`,
                nextVersion: restored.version,
                official: restored.official === true,
                status: 'restored',
                reason: '',
            };
        }
        catch (error) {
            throw new Error(`Enabled plugin ${pluginName} is missing globally and could not be restored automatically: ${error instanceof Error ? error.message : String(error || 'unknown error')}`);
        }
    }
    async maybeUpgradeEnabledPluginPackage(pluginName) {
        let inspection;
        try {
            inspection = await this.getPluginRegistryService().inspectInstalledPluginUpgrade(pluginName);
        }
        catch (error) {
            return {
                pluginName,
                packageName: '',
                previousVersion: '',
                nextVersion: '',
                official: false,
                status: 'skipped',
                reason: error instanceof Error ? error.message : String(error || 'unknown error'),
            };
        }
        if (inspection.status !== 'upgrade') {
            return {
                pluginName,
                packageName: inspection.packageName,
                previousVersion: inspection.installedVersion,
                nextVersion: inspection.targetVersion || inspection.installedVersion,
                official: inspection.official,
                status: inspection.status === 'current'
                    ? 'current'
                    : inspection.status === 'missing'
                        ? 'missing'
                        : 'skipped',
                reason: inspection.reason,
            };
        }
        const upgraded = await this.getPluginRegistryService().upgradeInstalledPlugin(pluginName, 'update');
        return {
            pluginName,
            packageName: upgraded.packageName,
            previousVersion: upgraded.previousVersion,
            nextVersion: upgraded.current.version,
            official: upgraded.official,
            status: 'upgraded',
            reason: '',
        };
    }
    refreshExternalPluginInstalledMetadata(pluginConfig, installedPlugin, defaultConfig) {
        const before = JSON.stringify(pluginConfig);
        pluginConfig.package_name = installedPlugin.record.package_name;
        pluginConfig.version = installedPlugin.record.version;
        pluginConfig.display_name = installedPlugin.manifest.displayName;
        pluginConfig.description = installedPlugin.manifest.description;
        pluginConfig.official = installedPlugin.manifest.official === true;
        pluginConfig.kinds = [...installedPlugin.manifest.kinds];
        if (!pluginConfig.source && defaultConfig?.source) {
            pluginConfig.source = defaultConfig.source;
        }
        return before !== JSON.stringify(pluginConfig);
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
    async runPostSyncMaintenance() {
        const maintenanceService = new PostSyncMaintenanceService_1.PostSyncMaintenanceService(services_1.services.fileService);
        return maintenanceService.runManagedSkillPostprocessing();
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
