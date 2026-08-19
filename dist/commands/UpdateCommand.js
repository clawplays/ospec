"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommand = void 0;
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const os_1 = require("os");
const path_1 = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const SkillCommand_1 = require("./SkillCommand");
const PostSyncMaintenanceService_1 = require("../services/PostSyncMaintenanceService");
const DocsMigrationService_1 = require("../services/DocsMigrationService");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const constants_1 = require("../core/constants");
class UpdateCommand extends BaseCommand_1.BaseCommand {
    async execute(rootDir, options = {}) {
        const targetPath = rootDir ? (0, path_1.resolve)(rootDir) : process.cwd();
        // Read-only, and deliberately first: repairLegacyProjectForUpdate below
        // round-trips `.skillrc` through ConfigManager, whose normalization
        // drops a legacy `plugins` block. Capturing it here is what keeps the
        // removal recordable instead of silent on that path.
        const capturedPluginsConfig = await services_1.services.legacyPluginMigrationService.readRawSkillrcPlugins(targetPath);
        const detectedStructure = await services_1.services.projectService.detectProjectStructure(targetPath);
        const legacyRepair = await this.repairLegacyProjectForUpdate(targetPath, detectedStructure);
        const structure = legacyRepair.performed
            ? await services_1.services.projectService.detectProjectStructure(targetPath)
            : detectedStructure;
        if (!structure.initialized) {
            throw new Error('Project is not initialized. Run "ospec init" first.');
        }
        this.info(`Updating OSpec project at ${targetPath}`);
        const currentCliVersion = await this.readCurrentCliVersion();
        const pluginResidue = await this.cleanLegacyPluginResidue(targetPath, {
            capturedPluginsConfig,
            cleanPluginSteps: options.cleanPluginSteps === true,
        });
        const cliVersionMetadataSync = await this.syncProjectCliVersionMetadata(targetPath);
        const legacyKnowledgeMigration = await this.migrateLegacyKnowledgeLayout(targetPath, cliVersionMetadataSync.effectiveProjectCliVersion);
        const protocolResult = await services_1.services.projectService.syncProtocolGuidance(targetPath);
        // Written after the protocol sync so one audit record covers both the
        // `.skillrc` block removed above and the `## Plugin Gates` section the
        // sync removed from the managed root SKILL.md.
        const pluginMigrationProvenancePath = await services_1.services.legacyPluginMigrationService.writeProvenance(targetPath, {
            cliVersion: currentCliVersion,
            source: 'ospec update',
            removals: [...pluginResidue.removals, ...protocolResult.pluginGuidanceRemovals],
        });
        const toolingResult = await this.syncProjectTooling(targetPath, protocolResult.documentLanguage);
        const archiveResult = await this.syncArchiveLayout(targetPath);
        const skillResult = await this.syncInstalledSkills();
        const postSyncMaintenance = await this.runPostSyncMaintenance();
        const refreshedFiles = Array.from(new Set([
            ...(cliVersionMetadataSync.configSaved ? ['.skillrc'] : []),
            ...legacyKnowledgeMigration.refreshedFiles,
            ...protocolResult.refreshedFiles,
            ...toolingResult.refreshedFiles,
            ...pluginResidue.rewrittenPaths,
            ...(pluginMigrationProvenancePath ? [pluginMigrationProvenancePath] : []),
            ...(archiveResult.configSaved ? ['.skillrc'] : []),
        ]));
        const createdFiles = [...protocolResult.createdFiles, ...toolingResult.createdFiles];
        const skippedFiles = [...protocolResult.skippedFiles, ...toolingResult.skippedFiles];
        const updateProvenance = await this.writeUpdateProvenance(targetPath, {
            cliVersion: cliVersionMetadataSync.currentCliVersion,
            paths: [
                '.ospec/asset-sources.json',
                ...createdFiles,
                ...refreshedFiles,
                ...protocolResult.verifiedFiles,
                ...toolingResult.verifiedFiles,
                ...legacyRepair.createdPaths,
                ...legacyRepair.refreshedPaths,
                ...legacyKnowledgeMigration.migratedPaths,
                ...legacyKnowledgeMigration.removedPaths,
                ...toolingResult.migratedFiles,
                ...toolingResult.removedLegacyFiles,
                ...archiveResult.migratedChanges.flatMap(change => [change.from, change.to]),
            ],
        });
        this.success(`Updated OSpec assets for ${protocolResult.projectName}`);
        this.info(`  document language: ${protocolResult.documentLanguage}`);
        this.info(`  created: ${createdFiles.length}`);
        this.info(`  refreshed: ${refreshedFiles.length}`);
        this.info(`  skipped: ${skippedFiles.length}`);
        this.info(`  update provenance: ${updateProvenance.files.length} managed path(s)`);
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
        const pluginMigrationRemovals = [...pluginResidue.removals, ...protocolResult.pluginGuidanceRemovals];
        if (pluginMigrationRemovals.length > 0) {
            this.info(`  legacy plugin guidance removed: ${pluginMigrationRemovals.length} item(s)`);
            for (const removal of pluginMigrationRemovals) {
                this.info(`    ${removal.path}: ${removal.detail}`);
            }
            this.info(`  removal record: ${pluginMigrationProvenancePath}`);
            this.info('  note: .ospec/plugins/ is user data and is never modified by this migration');
        }
        if (pluginResidue.pendingChangeStepPaths.length > 0) {
            this.info(`  change documents still listing plugin-era optional_steps: ${pluginResidue.pendingChangeStepPaths.join(', ')}`);
            this.info('  note: those entries are inert; run "ospec update --clean-plugin-steps" to rewrite them');
        }
        if (archiveResult.configSaved) {
            this.info('  archive layout normalized: .skillrc');
        }
        if (archiveResult.migratedChanges.length > 0) {
            this.info(`  archived changes migrated: ${archiveResult.migratedChanges.length}`);
        }
        // 7.9: MENTION ONLY. `ospec update` must never migrate and never
        // delete -- the documents below are a project's own history, and an
        // upgrade that quietly removed them would be the worst possible
        // reading of the word "update". The migration is a four-phase pipeline
        // ending in a separately-confirmed destructive step, and a person has
        // to drive it.
        const unmigrated = await DocsMigrationService_1.docsMigrationService.detectUnmigrated(targetPath);
        if (unmigrated.found) {
            this.info(`  legacy generated documents found: ${unmigrated.counts.knowledgeDocuments} under docs/project/changes/`);
            this.info('  note: OSpec no longer generates those; "ospec docs migrate --plan" starts the migration that replaces them');
            this.info('  note: update never migrates and never deletes them');
        }
        this.info('  note: update refreshes protocol docs, tooling, hooks, managed skills, and the archive layout when needed');
        this.info('  note: it can repair legacy OSpec projects with an existing OSpec footprint before refreshing assets');
        this.info('  note: it does not upgrade the CLI itself');
        this.info('  note: it does not enable, disable, or migrate active or queued changes automatically');
    }
    /**
     * Repairs the plugin-era residue that OSpec 2.0 can no longer act on.
     *
     * Automatic, because both targets are OSpec-managed artifacts that are now
     * unsatisfiable by construction:
     *  - the `## Plugin Gates` section (removed by the protocol sync) actively
     *    tells the agent to block on an approval no command can produce;
     *  - a `.skillrc` `plugins` block is config for a subsystem that no longer
     *    exists, and `ConfigManager` already erases it on any write -- just
     *    silently, and only when some unrelated reason forces a save.
     * Neither is user-authored, and the `.skillrc` block is archived verbatim
     * into the removal record, so nothing becomes unrecoverable.
     *
     * Opt-in for change documents, because those are the user's own record of
     * what a change required. The stale `optional_steps` entries there are
     * inert -- nothing activates them anymore and verification reports them as
     * satisfied -- so rewriting history by default would be a bigger edit than
     * the problem.
     *
     * `.ospec/plugins/` is never read, moved, or deleted here. It holds
     * irreplaceable user data (routes.yaml, flows.yaml, project.json, auth
     * storage-state) that no reinstall can regenerate.
     */
    async cleanLegacyPluginResidue(rootDir, input) {
        const migrationService = services_1.services.legacyPluginMigrationService;
        const removals = [];
        const rewrittenPaths = [];
        const skillrcMigration = await migrationService.migrateSkillrcPlugins(rootDir);
        if (skillrcMigration.performed) {
            removals.push(...skillrcMigration.removals);
            rewrittenPaths.push(...skillrcMigration.rewrittenPaths);
        }
        else if (input.capturedPluginsConfig !== undefined) {
            // The block was already dropped by the legacy-project repair's
            // config round-trip. It still happened, so it still gets recorded.
            removals.push(migrationService.describeRemovedSkillrcPlugins(input.capturedPluginsConfig));
            rewrittenPaths.push('.skillrc');
        }
        const config = await services_1.services.configManager.loadConfigOrNull(rootDir);
        const changeStepMigration = await migrationService.migrateChangePluginSteps(rootDir, config, {
            dryRun: !input.cleanPluginSteps,
        });
        if (input.cleanPluginSteps) {
            removals.push(...changeStepMigration.removals);
            rewrittenPaths.push(...changeStepMigration.rewrittenPaths);
        }
        return {
            removals,
            rewrittenPaths: Array.from(new Set(rewrittenPaths)),
            pendingChangeStepPaths: input.cleanPluginSteps
                ? []
                : Array.from(new Set(changeStepMigration.rewrittenPaths)),
        };
    }
    async writeUpdateProvenance(rootDir, input) {
        const provenanceRelativePath = '.ospec/update-provenance.json';
        const provenancePath = (0, path_1.join)(rootDir, '.ospec', 'update-provenance.json');
        const normalizedRoot = (0, path_1.resolve)(rootDir);
        const candidatePaths = new Set();
        const normalizeCandidate = (rawPath) => {
            const trimmed = rawPath.trim();
            if (!trimmed)
                return null;
            const absolutePath = (0, path_1.resolve)(normalizedRoot, trimmed);
            const relativePath = (0, path_1.relative)(normalizedRoot, absolutePath).replace(/\\/g, '/');
            if (!relativePath
                || relativePath === provenanceRelativePath
                || relativePath === '.git'
                || relativePath.startsWith('.git/')
                || relativePath === '..'
                || relativePath.startsWith('../')) {
                return null;
            }
            return relativePath;
        };
        for (const rawPath of input.paths) {
            for (const pathPart of String(rawPath || '').split(/\s+->\s+/)) {
                const relativePath = normalizeCandidate(pathPart);
                if (!relativePath)
                    continue;
                candidatePaths.add(relativePath);
            }
        }
        // A repeated update must not discard ownership proof for a file that
        // this same CLI version already wrote and whose exact state is intact.
        if (input.cliVersion && await services_1.services.fileService.exists(provenancePath)) {
            try {
                const previous = await services_1.services.fileService.readJSON(provenancePath);
                const previousFiles = Array.isArray(previous.files) ? previous.files : [];
                if (previous.version === '1.0'
                    && previous.source === 'ospec update'
                    && previous.ospecCliVersion === input.cliVersion) {
                    for (const rawRecord of previousFiles) {
                        const record = rawRecord && typeof rawRecord === 'object'
                            ? rawRecord
                            : null;
                        const relativePath = normalizeCandidate(String(record?.path || ''));
                        if (!relativePath || (record?.kind !== 'file' && record?.kind !== 'missing'))
                            continue;
                        const absolutePath = (0, path_1.join)(normalizedRoot, ...relativePath.split('/'));
                        const stat = await fs_1.promises.stat(absolutePath).catch(() => null);
                        if (record.kind === 'missing') {
                            if (!stat && record.contentHash === null)
                                candidatePaths.add(relativePath);
                            continue;
                        }
                        if (!stat?.isFile() || !/^[a-f0-9]{64}$/.test(String(record.contentHash || '')))
                            continue;
                        const currentHash = (0, crypto_1.createHash)('sha256').update(await fs_1.promises.readFile(absolutePath)).digest('hex');
                        if (currentHash === record.contentHash)
                            candidatePaths.add(relativePath);
                    }
                }
            }
            catch {
                // Invalid prior provenance is ignored and replaced by the
                // paths independently verified during this update.
            }
        }
        const files = [];
        const capture = async (relativePath) => {
            const absolutePath = (0, path_1.join)(normalizedRoot, ...relativePath.split('/'));
            const stat = await fs_1.promises.stat(absolutePath).catch(() => null);
            if (!stat) {
                files.push({ path: relativePath, kind: 'missing', contentHash: null });
                return;
            }
            if (stat.isDirectory()) {
                const entries = await fs_1.promises.readdir(absolutePath, { withFileTypes: true });
                for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
                    await capture(`${relativePath}/${entry.name}`);
                }
                return;
            }
            if (!stat.isFile())
                return;
            const content = await fs_1.promises.readFile(absolutePath);
            files.push({
                path: relativePath,
                kind: 'file',
                contentHash: (0, crypto_1.createHash)('sha256').update(content).digest('hex'),
            });
        };
        for (const relativePath of Array.from(candidatePaths).sort()) {
            await capture(relativePath);
        }
        const deduplicatedFiles = Array.from(new Map(files.map(file => [file.path, file])).values())
            .sort((left, right) => left.path.localeCompare(right.path));
        await services_1.services.fileService.writeJSON(provenancePath, {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            ospecCliVersion: input.cliVersion,
            source: 'ospec update',
            files: deduplicatedFiles,
        });
        return { path: provenancePath, files: deduplicatedFiles };
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
            verifiedFiles: [
                ...directCopyResult.created,
                ...directCopyResult.refreshed,
                ...directCopyResult.skipped,
            ],
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
        const config = await services_1.services.configManager.loadConfigOrNull(rootDir);
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
        const config = await services_1.services.configManager.loadConfigOrNull(rootDir);
        if (!config) {
            return {
                configSaved: false,
                effectiveProjectCliVersion: null,
                currentCliVersion: null,
            };
        }
        const detectedProjectCliVersion = await this.detectProjectCliVersion(rootDir, config);
        const currentCliVersion = await this.readCurrentCliVersion();
        const configuredProjectCliVersion = typeof config.ospecCliVersion === 'string' && config.ospecCliVersion.trim().length > 0
            ? config.ospecCliVersion.trim()
            : null;
        if (configuredProjectCliVersion) {
            if (currentCliVersion && configuredProjectCliVersion !== currentCliVersion) {
                await services_1.services.configManager.saveConfig(rootDir, {
                    ...config,
                    ospecCliVersion: currentCliVersion,
                });
                return {
                    configSaved: true,
                    effectiveProjectCliVersion: configuredProjectCliVersion,
                    currentCliVersion,
                };
            }
            return {
                configSaved: false,
                effectiveProjectCliVersion: configuredProjectCliVersion,
                currentCliVersion,
            };
        }
        const nextProjectCliVersion = currentCliVersion || detectedProjectCliVersion;
        if (!nextProjectCliVersion) {
            return {
                configSaved: false,
                effectiveProjectCliVersion: null,
                currentCliVersion,
            };
        }
        await services_1.services.configManager.saveConfig(rootDir, {
            ...config,
            ospecCliVersion: nextProjectCliVersion,
        });
        return {
            configSaved: true,
            effectiveProjectCliVersion: detectedProjectCliVersion || nextProjectCliVersion,
            currentCliVersion,
        };
    }
    async readCurrentCliVersion() {
        try {
            const packageJson = JSON.parse(await fs_1.promises.readFile((0, path_1.join)(__dirname, '..', '..', 'package.json'), 'utf8'));
            return typeof packageJson.version === 'string' && packageJson.version.trim().length > 0
                ? packageJson.version.trim()
                : null;
        }
        catch {
            return null;
        }
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
    async syncArchiveLayout(rootDir) {
        const rawConfig = await services_1.services.fileService.readJSON((0, path_1.join)(rootDir, '.skillrc'));
        const config = await services_1.services.configManager.loadConfig(rootDir);
        const nextConfig = JSON.parse(JSON.stringify(config));
        /*
         * M-cfg6: this was `join(rootDir, 'changes', 'archived')`, the classic
         * layout spelled out. On a NESTED project the archive lives at
         * `.ospec/changes/archived`, so the `exists()` below was false, the
         * whole migration loop never ran, and `ospec update` reported success
         * while every legacy `YYYY-MM-DD-name` directory stayed flat -- on the
         * layout `ospec init` produces by default.
         *
         * Worse than a no-op: the same call also rewrites `.skillrc` to
         * `archive.layout: 'month-day'` a few lines down, so the config
         * afterwards CLAIMS month-day while the tree on disk is still flat.
         * Everything downstream that trusts the config to describe the tree
         * was then reading a lie.
         *
         * `resolveManagedPath` is the shared resolver every other managed path
         * in this command already goes through.
         */
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config);
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
                    // Reported relative to the project root, so a nested
                    // project reports `.ospec/changes/archived/...` and a
                    // classic one reports `changes/archived/...`. It used to
                    // hardcode the classic spelling on both.
                    from: this.toRelativePath(rootDir, entryPath),
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
        return ['ospec', 'ospec-change', 'ospec-goal'];
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
