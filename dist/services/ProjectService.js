"use strict";







var __importDefault = (this && this.__importDefault) || function (mod) {







    return (mod && mod.__esModule) ? mod : { "default": mod };







};







Object.defineProperty(exports, "__esModule", { value: true });







exports.createProjectService = exports.ProjectService = void 0;







const fs_extra_1 = __importDefault(require("fs-extra"));







const gray_matter_1 = __importDefault(require("gray-matter"));







const path_1 = __importDefault(require("path"));







const constants_1 = require("../core/constants");







const ProjectPresets_1 = require("../presets/ProjectPresets");







const ArchiveGate_1 = require("../workflow/ArchiveGate");







const ConfigurableWorkflow_1 = require("../workflow/ConfigurableWorkflow");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");







class ProjectService {







    constructor(fileService, configManager, templateEngine, indexBuilder, skillParser, projectAssetService, projectScaffoldService, projectScaffoldCommandService) {







        this.fileService = fileService;







        this.configManager = configManager;







        this.templateEngine = templateEngine;







        this.indexBuilder = indexBuilder;







        this.skillParser = skillParser;







        this.projectAssetService = projectAssetService;







        this.projectScaffoldService = projectScaffoldService;







        this.projectScaffoldCommandService = projectScaffoldCommandService;







    }







    async initializeProject(rootDir, mode, input) {







        const config = await this.configManager.createDefaultConfig(mode);







        await this.configManager.saveConfig(rootDir, config);







        await Promise.all(this.getDirectorySkeleton(rootDir).map(dirPath => this.fileService.ensureDir(dirPath)));







        const normalized = await this.normalizeProjectBootstrap(rootDir, mode, input);

        config.documentLanguage = normalized.documentLanguage;

        await this.configManager.saveConfig(rootDir, config);







        await this.writeProjectKnowledgeLayer(rootDir, mode, normalized);







        const scaffoldResult = await this.applyProjectScaffoldPhase(rootDir, normalized);







        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage);







        const hookResult = await this.projectAssetService.installGitHooks(rootDir, config.hooks);







        const commandPlan = this.projectScaffoldCommandService.getPlan(normalized, scaffoldResult.plan);







        const bootstrapSummaryRelativePath = `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/bootstrap-summary.md`;







        try {







            await this.indexBuilder.write(rootDir);







        }







        catch {







            await this.indexBuilder.createEmpty(rootDir);







        }







        await this.projectAssetService.writeAssetManifest(rootDir, {







            documentLanguage: normalized.documentLanguage,







            templateGeneratedPaths: this.getFullBootstrapTemplateGeneratedPaths(normalized),







            runtimeGeneratedPaths: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







                bootstrapSummaryRelativePath,







            ],







        });







        let commandExecution = await this.projectScaffoldCommandService.executePlan(rootDir, commandPlan);







        let recoveryFilePath = null;







        if (commandExecution.status === 'failed') {







            const failedStep = commandExecution.steps.find(step => step.status === 'failed');







            if (failedStep) {







                recoveryFilePath = await this.projectScaffoldCommandService.writeRecoveryRecord(rootDir, {







                    normalized,







                    failedStep,







                    scaffoldCreatedFiles: scaffoldResult.createdFiles,







                    scaffoldCreatedDirectories: scaffoldResult.createdDirectories,







                    directCopyCreatedFiles: directCopyResult.created,







                    hookInstalledFiles: hookResult.installed,







                });







                commandExecution = {







                    ...commandExecution,







                    recoveryFilePath,







                };







            }







        }







        const firstChangeSuggestion = this.getFirstChangeSuggestion(normalized);







        await this.writeBootstrapSummary(rootDir, {







            mode,







            normalized,







            scaffoldPlan: scaffoldResult.plan,







            commandPlan,







            commandExecution,







            scaffoldCreatedFiles: scaffoldResult.createdFiles,







            scaffoldSkippedFiles: scaffoldResult.skippedFiles,







            scaffoldCreatedDirectories: scaffoldResult.createdDirectories,







            scaffoldSkippedDirectories: scaffoldResult.skippedDirectories,







            directCopyCreatedFiles: directCopyResult.created,







            directCopySkippedFiles: directCopyResult.skipped,







            hookInstalledFiles: hookResult.installed,







            hookSkippedFiles: hookResult.skipped,







            runtimeGeneratedFiles: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







                bootstrapSummaryRelativePath,







            ],







            recoveryFilePath,







            firstChangeSuggestion,







        });







        return {







            projectName: normalized.projectName,







            mode,







            projectPresetId: normalized.projectPresetId,







            documentLanguage: normalized.documentLanguage,







            executeScaffoldCommands: normalized.executeScaffoldCommands,







            scaffoldPlan: scaffoldResult.plan,







            commandPlan,







            commandExecution,







            scaffoldCreatedFiles: scaffoldResult.createdFiles,







            scaffoldSkippedFiles: scaffoldResult.skippedFiles,







            scaffoldCreatedDirectories: scaffoldResult.createdDirectories,







            scaffoldSkippedDirectories: scaffoldResult.skippedDirectories,







            directCopyCreatedFiles: directCopyResult.created,







            directCopySkippedFiles: directCopyResult.skipped,







            hookInstalledFiles: hookResult.installed,







            hookSkippedFiles: hookResult.skipped,







            runtimeGeneratedFiles: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







                bootstrapSummaryRelativePath,







            ],







            recoveryFilePath,







            firstChangeSuggestion,







        };







    }







    async generateProjectKnowledge(rootDir, input) {







        const config = await this.configManager.loadConfig(rootDir);







        await Promise.all(this.getKnowledgeLayerDirectorySkeleton(rootDir).map(dirPath => this.fileService.ensureDir(dirPath)));







        const normalized = await this.normalizeProjectBootstrap(rootDir, config.mode, input);

        await this.syncConfigDocumentLanguage(rootDir, config, normalized.documentLanguage);







        const writeSummary = await this.writeProjectKnowledgeLayer(rootDir, config.mode, normalized);







        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage);







        const hookResult = await this.projectAssetService.installGitHooks(rootDir, config.hooks);







        try {







            await this.indexBuilder.write(rootDir);







        }







        catch {







            await this.indexBuilder.createEmpty(rootDir);







        }







        const runtimeGeneratedFiles = [







            constants_1.FILE_NAMES.SKILLRC,







            constants_1.FILE_NAMES.SKILL_INDEX,







            '.ospec/asset-sources.json',







        ];







        await this.projectAssetService.writeAssetManifest(rootDir, {







            documentLanguage: normalized.documentLanguage,







            templateGeneratedPaths: this.getFullBootstrapTemplateGeneratedPaths(normalized),







            runtimeGeneratedPaths: runtimeGeneratedFiles,







        });







        return {







            projectName: normalized.projectName,







            mode: config.mode,







            projectPresetId: normalized.projectPresetId,







            documentLanguage: normalized.documentLanguage,







            createdFiles: writeSummary.created,







            refreshedFiles: writeSummary.refreshed,







            skippedFiles: writeSummary.skipped,







            directCopyCreatedFiles: directCopyResult.created,







            directCopySkippedFiles: directCopyResult.skipped,







            hookInstalledFiles: hookResult.installed,







            hookSkippedFiles: hookResult.skipped,







            runtimeGeneratedFiles,







            firstChangeSuggestion: this.getFirstChangeSuggestion(normalized),







        };







    }







    async syncProtocolGuidance(rootDir) {







        const structure = await this.detectProjectStructure(rootDir);







        if (!structure.initialized) {







            throw new Error('Project is not initialized. Run "ospec init" first.');







        }







        const config = await this.configManager.loadConfig(rootDir);







        const normalized = await this.normalizeProjectBootstrap(rootDir, config.mode);

        const configLanguageUpdated = await this.syncConfigDocumentLanguage(rootDir, config, normalized.documentLanguage);







        const guidancePaths = [







            'for-ai/ai-guide.md',







            'for-ai/execution-protocol.md',







            'for-ai/naming-conventions.md',







            'for-ai/skill-conventions.md',







            'for-ai/development-guide.md',







            'for-ai/workflow-conventions.md',







        ];







        const directCopyResult = await this.projectAssetService.syncDirectCopyAssets(rootDir, normalized.documentLanguage, {







            targetRelativePaths: guidancePaths,







        });







        const createdFiles = [...directCopyResult.created];







        const refreshedFiles = [...directCopyResult.refreshed];







        const skippedFiles = [...directCopyResult.skipped];

        if (configLanguageUpdated) {
            refreshedFiles.push(constants_1.FILE_NAMES.SKILLRC);
        }







        const rootSkillPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_MD);







        const renderedRootSkill = this.renderProtocolShellRootSkill(normalized.projectName, normalized.documentLanguage, config.mode);







        const rootSkillRelativePath = constants_1.FILE_NAMES.SKILL_MD;







        if (!(await this.fileService.exists(rootSkillPath))) {







            await this.fileService.writeFile(rootSkillPath, renderedRootSkill);







            createdFiles.push(rootSkillRelativePath);







        }







        else if (await this.isProtocolShellRootSkill(rootSkillPath)) {







            const existingRootSkill = await this.fileService.readFile(rootSkillPath);







            if (existingRootSkill === renderedRootSkill) {







                skippedFiles.push(rootSkillRelativePath);







            }







            else {







                await this.fileService.writeFile(rootSkillPath, renderedRootSkill);







                refreshedFiles.push(rootSkillRelativePath);







            }







        }







        else {







            skippedFiles.push(rootSkillRelativePath);







        }







        try {







            await this.indexBuilder.write(rootDir);







        }







        catch {







        }







        const assetPlan = this.getBootstrapAssetPlan(normalized.documentLanguage, normalized);







        await this.projectAssetService.writeAssetManifest(rootDir, {







            documentLanguage: normalized.documentLanguage,







            templateGeneratedPaths: assetPlan.templateGeneratedFiles,







            runtimeGeneratedPaths: assetPlan.runtimeGeneratedFiles,







        });







        return {







            projectName: normalized.projectName,







            mode: config.mode,







            documentLanguage: normalized.documentLanguage,







            createdFiles,







            refreshedFiles,







            skippedFiles,







        };







    }







    async initializeProtocolShellProject(rootDir, mode, input) {







        const config = await this.configManager.createDefaultConfig(mode);







        await this.configManager.saveConfig(rootDir, config);







        await Promise.all(this.getProtocolShellDirectorySkeleton(rootDir).map(dirPath => this.fileService.ensureDir(dirPath)));







        const normalized = await this.normalizeProjectBootstrap(rootDir, mode, input);

        config.documentLanguage = normalized.documentLanguage;

        await this.configManager.saveConfig(rootDir, config);







        await this.writeIfMissing(path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_MD), this.renderProtocolShellRootSkill(normalized.projectName, normalized.documentLanguage, mode));







        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage);







        const hookResult = await this.projectAssetService.installGitHooks(rootDir, config.hooks);







        try {







            await this.indexBuilder.write(rootDir);







        }







        catch {







            await this.indexBuilder.createEmpty(rootDir);







        }







        await this.projectAssetService.writeAssetManifest(rootDir, {







            documentLanguage: normalized.documentLanguage,







            templateGeneratedPaths: this.getProtocolShellTemplateGeneratedPaths(),







            runtimeGeneratedPaths: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







            ],







        });







        return {







            projectName: normalized.projectName,







            mode,







            projectPresetId: null,







            documentLanguage: normalized.documentLanguage,







            executeScaffoldCommands: false,







            scaffoldPlan: null,







            commandPlan: null,







            commandExecution: {







                status: 'skipped',







                steps: [],







                recoveryFilePath: null,







            },







            scaffoldCreatedFiles: [],







            scaffoldSkippedFiles: [],







            scaffoldCreatedDirectories: [],







            scaffoldSkippedDirectories: [],







            directCopyCreatedFiles: directCopyResult.created,







            directCopySkippedFiles: directCopyResult.skipped,







            hookInstalledFiles: hookResult.installed,







            hookSkippedFiles: hookResult.skipped,







            runtimeGeneratedFiles: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







            ],







            recoveryFilePath: null,







            firstChangeSuggestion: null,







        };







    }







    async detectProjectStructure(rootDir) {







        const checks = await Promise.all(this.getStructureDefinitions().map(async (definition) => ({







            key: definition.key,







            path: path_1.default.join(rootDir, ...definition.pathSegments),







            exists: await this.fileService.exists(path_1.default.join(rootDir, ...definition.pathSegments)),







            required: Boolean(definition.required),







            category: definition.category ?? 'knowledge',







        })));







        const missingRequired = checks.filter(check => check.required && !check.exists).map(check => check.path);







        const missingRecommended = checks.filter(check => !check.required && !check.exists).map(check => check.path);







        const initialized = missingRequired.length === 0;







        const upgradeSuggestions = this.buildUpgradeSuggestions(checks, initialized);







        return {







            initialized,







            level: 'none',







            checks,







            missingRequired,







            missingRecommended,







            upgradeSuggestions,







        };







    }







    async getProjectSummary(rootDir) {







        const structure = await this.detectProjectStructure(rootDir);







        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);







        const mode = structure.initialized && (await this.fileService.exists(configPath))







            ? (await this.configManager.loadConfig(rootDir)).mode







            : null;







        const createdAt = (await this.fileService.exists(configPath))







            ? (await this.fileService.stat(configPath)).mtime.toISOString()







            : null;







        let activeChangeCount = 0;
        if (structure.initialized) {
            const execution = await this.getExecutionStatus(rootDir);
            activeChangeCount = execution.totalActiveChanges;
        }
        else {
            const activeDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
            if (await this.fileService.exists(activeDir)) {
                try {
                    const entries = await fs_extra_1.default.readdir(activeDir, { withFileTypes: true });
                    activeChangeCount = entries.filter(entry => entry.isDirectory()).length;
                }
                catch {
                    activeChangeCount = 0;
                }
            }
        }







        return {







            name: path_1.default.basename(path_1.default.resolve(rootDir)),







            path: rootDir,







            mode,







            initialized: structure.initialized,







            structureLevel: structure.level,







            createdAt,







            activeChangeCount,







            docsRootExists: await this.fileService.exists(path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS)),







            forAiExists: await this.fileService.exists(path_1.default.join(rootDir, constants_1.DIR_NAMES.FOR_AI)),







            skillIndexExists: await this.fileService.exists(path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_INDEX)),







        };







    }







    async getProjectAssetStatus(rootDir) {







        const manifestPath = path_1.default.join(rootDir, '.ospec', 'asset-sources.json');







        if (!(await this.fileService.exists(manifestPath))) {







            return {







                exists: false,







                path: manifestPath,







                generatedAt: null,







                summary: {







                    directCopy: 0,







                    templateGenerated: 0,







                    runtimeGenerated: 0,







                },







                directCopy: [],







                templateGenerated: [],







                runtimeGenerated: [],







            };







        }







        const manifest = await this.fileService.readJSON(manifestPath);







        const assets = Array.isArray(manifest.assets) ? manifest.assets : [];







        return {







            exists: true,







            path: manifestPath,







            generatedAt: manifest.generatedAt || null,







            summary: manifest.summary || {







                directCopy: 0,







                templateGenerated: 0,







                runtimeGenerated: 0,







            },







            directCopy: assets.filter(asset => asset.strategy === 'direct_copy'),







            templateGenerated: assets.filter(asset => asset.strategy === 'template_generated'),







            runtimeGenerated: assets.filter(asset => asset.strategy === 'runtime_generated'),







        };







    }







    async scanProjectDocs(rootDir) {







        const definitions = this.getDocumentDefinitions();







        const items = await Promise.all(definitions.map(definition => this.toDocumentStatusItem(rootDir, definition)));







        const apiDocs = await this.scanApiDocs(rootDir);







        const designDocs = await this.scanDesignDocs(rootDir);







        const planningDocs = await this.scanPlanningDocs(rootDir);







        const existing = items.filter(item => item.exists).length;







        const updatedAt = this.maxUpdatedAt([







            ...items.map(item => item.updatedAt),







            ...apiDocs.map(item => item.updatedAt),







            ...designDocs.map(item => item.updatedAt),







            ...planningDocs.map(item => item.updatedAt),







        ]);







        return {







            total: items.length,







            existing,







            coverage: items.length === 0 ? 0 : Math.round((existing / items.length) * 100),







            items,







            apiDocs,







            designDocs,







            planningDocs,







            missingRequired: items.filter(item => item.required && !item.exists).map(item => item.path),







            missingRecommended: items.filter(item => !item.required && !item.exists).map(item => item.path),







            updatedAt,







        };







    }







    async scanModules(rootDir) {







        const modulesDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.MODULES);







        if (!(await this.fileService.exists(modulesDir))) {







            return [];







        }







        const entries = await fs_extra_1.default.readdir(modulesDir, { withFileTypes: true });







        return entries







            .filter(entry => entry.isDirectory())







            .map(entry => ({







            name: entry.name,







            path: path_1.default.join(modulesDir, entry.name),







            skillPath: path_1.default.join(modulesDir, entry.name, constants_1.FILE_NAMES.SKILL_MD),







            skillExists: fs_extra_1.default.existsSync(path_1.default.join(modulesDir, entry.name, constants_1.FILE_NAMES.SKILL_MD)),







        }));







    }







    async scanApiDocs(rootDir) {







        return this.scanDocsInDirectory(rootDir, constants_1.DIR_NAMES.API);







    }







    async scanDesignDocs(rootDir) {







        return this.scanDocsInDirectory(rootDir, constants_1.DIR_NAMES.DESIGN);







    }







    async scanPlanningDocs(rootDir) {







        return this.scanDocsInDirectory(rootDir, constants_1.DIR_NAMES.PLANNING);







    }







    async scanSkillHierarchy(rootDir) {







        const rootSkills = await Promise.all(this.getRootSkillDefinitions().map(definition => this.toSkillFileInfo(rootDir, definition)));







        const modules = await this.scanModules(rootDir);







        const moduleSkills = await Promise.all(modules.map(module => this.toSkillFileInfo(rootDir, {







            key: `module:${module.name}`,







            pathSegments: path_1.default.relative(rootDir, module.skillPath).split(path_1.default.sep),







        })));







        const skillIndexPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_INDEX);







        let skillIndexStats = null;







        let skillIndexUpdatedAt = null;







        let latestSourceUpdatedAt = null;







        if (await this.fileService.exists(skillIndexPath)) {







            try {







                const index = await this.fileService.readJSON(skillIndexPath);







                skillIndexStats = index.stats ?? null;







                skillIndexUpdatedAt = (await this.fileService.stat(skillIndexPath)).mtime.toISOString();







            }







            catch {







                skillIndexStats = null;







            }







        }







        const allSkills = [...rootSkills, ...moduleSkills];







        const existingSkillPaths = allSkills







            .filter(skill => skill.exists)







            .map(skill => skill.path);







        latestSourceUpdatedAt = await this.getLatestUpdatedAt(existingSkillPaths);







        const indexNeedsRebuild = this.shouldRebuildIndex(skillIndexUpdatedAt, latestSourceUpdatedAt, allSkills);







        const indexReasons = this.getIndexRebuildReasons(skillIndexPath, skillIndexUpdatedAt, latestSourceUpdatedAt, allSkills);







        return {







            totalSkillFiles: allSkills.length,







            existing: allSkills.filter(skill => skill.exists).length,







            missingRecommended: rootSkills.filter(skill => !skill.exists).map(skill => skill.path),







            rootSkills,







            moduleSkills,







            modules,







            skillIndex: {







                exists: await this.fileService.exists(skillIndexPath),







                path: skillIndexPath,







                updatedAt: skillIndexUpdatedAt,







                latestSourceUpdatedAt,







                needsRebuild: indexNeedsRebuild,







                stale: Boolean(skillIndexUpdatedAt) &&







                    Boolean(latestSourceUpdatedAt) &&







                    new Date(latestSourceUpdatedAt).getTime() > new Date(skillIndexUpdatedAt).getTime(),







                reasons: indexReasons,







                stats: skillIndexStats,







            },







        };







    }







    async getExecutionStatus(rootDir) {







        const report = await this.getActiveChangeStatusReport(rootDir);







        return {







            totalActiveChanges: report.totalActiveChanges,







            byStatus: report.changes.reduce((result, change) => {







                result[change.status] = (result[change.status] ?? 0) + 1;







                return result;







            }, {}),







            activeChanges: report.changes.map(change => ({







                name: change.name,







                status: change.status,







                progress: change.progress,







                currentStep: change.currentStep,







                flags: change.flags,







                description: change.description,







            })),







        };







    }







    async getActiveChangeStatusReport(rootDir) {







        const featuresDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);







        if (!(await this.fileService.exists(featuresDir))) {







            return {







                totalActiveChanges: 0,







                totals: {







                    pass: 0,







                    warn: 0,







                    fail: 0,







                },







                changes: [],







            };







        }







        const config = await this.configManager.loadConfig(rootDir);







        const workflow = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);







        const entries = await fs_extra_1.default.readdir(featuresDir, { withFileTypes: true });







        const activeChanges = [];







        for (const entry of entries) {







            if (!entry.isDirectory()) {







                continue;







            }







            const featureDir = path_1.default.join(featuresDir, entry.name);







            const change = await this.buildActiveChangeStatusItem(rootDir, featureDir, workflow);







            if (change) {







                activeChanges.push(change);







            }







        }







        return {







            totalActiveChanges: activeChanges.length,







            totals: activeChanges.reduce((result, change) => {







                result[change.summaryStatus] += 1;







                return result;







            }, { pass: 0, warn: 0, fail: 0 }),







            changes: activeChanges.sort((left, right) => left.name.localeCompare(right.name)),







        };







    }







    async getActiveChangeStatusItem(featurePath) {







        const resolvedFeaturePath = path_1.default.resolve(featurePath);







        const rootDir = path_1.default.resolve(resolvedFeaturePath, '..', '..', '..');







        const config = await this.configManager.loadConfig(rootDir);







        const workflow = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);







        const item = await this.buildActiveChangeStatusItem(rootDir, resolvedFeaturePath, workflow);







        if (!item) {







            throw new Error('Change state file not found.');







        }







        return item;







    }

    async listActiveChangeNames(rootDir) {







        const activeDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);







        if (!(await this.fileService.exists(activeDir))) {







            return [];







        }







        const entries = await fs_extra_1.default.readdir(activeDir, { withFileTypes: true });







        return entries







            .filter(entry => entry.isDirectory())







            .map(entry => entry.name)







            .sort((left, right) => left.localeCompare(right));







    }







    async finalizeChange(featurePath) {







        const resolvedFeaturePath = path_1.default.resolve(featurePath);







        const projectRoot = path_1.default.resolve(resolvedFeaturePath, '..', '..', '..');







        const expectedParent = path_1.default.join(projectRoot, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);







        if (path_1.default.dirname(resolvedFeaturePath) !== expectedParent) {







            throw new Error('Finalize target must be a change directory under changes/active.');







        }







        await this.rebuildIndex(projectRoot);







        const item = await this.getActiveChangeStatusItem(resolvedFeaturePath);







        const blockingChecks = item.checks.filter(check => check.status === 'fail');







        if (blockingChecks.length > 0) {







            throw new Error(`Change ${item.name} is not ready to finalize. Failing checks: ${blockingChecks.map(check => check.name).join(', ')}`);







        }







        if (!item.archiveReady) {







            throw new Error(`Change ${item.name} is not ready to archive yet.`);







        }







        const statePath = path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.STATE);







        const proposalPath = path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.PROPOSAL);







        const featureState = await this.fileService.readJSON(statePath);







        const archivedRoot = path_1.default.join(projectRoot, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ARCHIVED);







        await this.fileService.ensureDir(archivedRoot);







        const datePrefix = new Date().toISOString().slice(0, 10);







        const baseName = `${datePrefix}-${featureState.feature}`;







        let archiveDirName = baseName;







        let archiveIndex = 2;







        while (await this.fileService.exists(path_1.default.join(archivedRoot, archiveDirName))) {







            archiveDirName = `${baseName}-${archiveIndex}`;







            archiveIndex += 1;







        }







        const archivePath = path_1.default.join(archivedRoot, archiveDirName);







        const nextState = {







            ...featureState,







            status: 'archived',







            current_step: 'archived',







            completed: Array.from(new Set([...(featureState.completed || []), 'archived'])).sort((left, right) => left.localeCompare(right)),







            pending: (featureState.pending || []).filter(step => step !== 'archived'),







            blocked_by: [],







        };







        await this.fileService.move(resolvedFeaturePath, archivePath);







        await this.fileService.writeJSON(path_1.default.join(archivePath, constants_1.FILE_NAMES.STATE), nextState);







        const archivedProposalPath = path_1.default.join(archivePath, constants_1.FILE_NAMES.PROPOSAL);







        if (await this.fileService.exists(archivedProposalPath)) {







            const proposal = (0, gray_matter_1.default)(await this.fileService.readFile(archivedProposalPath));







            proposal.data.status = 'archived';







            await this.fileService.writeFile(archivedProposalPath, gray_matter_1.default.stringify(proposal.content, proposal.data));







        }







        await this.rebuildIndex(projectRoot);







        return {







            archivePath: this.toRelativePath(projectRoot, archivePath),







            change: item,







        };







    }







    async getFeatureProjectContext(rootDir, affects = []) {







        const affectSlugs = affects







            .map(item => this.toSlug(item))







            .filter(Boolean);







        const projectDocs = (await Promise.all([







            ['项目概览', path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'overview.md')],







            ['技术栈', path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'tech-stack.md')],







            ['架构说明', path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'architecture.md')],







            ['模块地图', path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'module-map.md')],







            ['API 总览', path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'api-overview.md')],







        ].map(async ([title, filePath]) => (await this.fileService.exists(filePath)







            ? { title, path: this.toRelativePath(rootDir, filePath) }







            : null)))).filter((item) => Boolean(item));







        const modules = await this.scanModules(rootDir);







        const moduleSkills = modules







            .filter(module => module.skillExists)







            .filter(module => affectSlugs.length === 0 ||







            affectSlugs.includes(this.toSlug(module.name)) ||







            affectSlugs.some(slug => this.toSlug(module.name).includes(slug)))







            .map(module => ({







            title: `${module.name} 模块技能`,







            path: this.toRelativePath(rootDir, module.skillPath),







        }));







        const apiDocs = this.filterKnowledgeDocsByAffects(await this.scanApiDocs(rootDir), affectSlugs)







            .map(item => ({







            title: item.name.replace(/\.md$/i, ''),







            path: this.toRelativePath(rootDir, item.path),







        }));







        const designDocs = (await this.scanDesignDocs(rootDir))







            .filter(item => item.name.toLowerCase() !== 'readme.md')







            .map(item => ({







            title: item.name.replace(/\.md$/i, ''),







            path: this.toRelativePath(rootDir, item.path),







        }));







        const planningDocs = (await this.scanPlanningDocs(rootDir))







            .filter(item => item.name.toLowerCase() !== 'readme.md')







            .map(item => ({







            title: item.name.replace(/\.md$/i, ''),







            path: this.toRelativePath(rootDir, item.path),







        }));







        return {







            projectDocs,







            moduleSkills,







            apiDocs,







            designDocs,







            planningDocs,







        };







    }







    async getDocsStatus(rootDir) {







        return this.scanProjectDocs(rootDir);







    }







    async getSkillsStatus(rootDir) {







        return this.scanSkillHierarchy(rootDir);







    }







    async getIndexStatus(rootDir) {







        const skills = await this.getSkillsStatus(rootDir);







        return skills.skillIndex;







    }







    async getBootstrapUpgradePlan(rootDir) {
        const docsRoot = path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT);
        const readMarkdown = async (filePath) => {
            if (!(await this.fileService.exists(filePath))) {
                return '';
            }
            try {
                const parsed = (0, gray_matter_1.default)(await this.fileService.readFile(filePath));
                return parsed.content.trim();
            }
            catch {
                return '';
            }
        };
        const extractBulletList = (content) => content
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => /^-\s+/.test(line))
            .map(line => line.replace(/^-\s+/, '').trim())
            .filter(Boolean);
        const extractParagraph = (content) => content
            .split(/\r?\n\r?\n/)
            .map(block => block.trim())
            .find(block => block && !block.startsWith('#') && !block.startsWith('- '))
            ?.replace(/\r?\n/g, ' ')
            .trim() || '';
        const persistedDocumentLanguage = await this.getConfiguredDocumentLanguage(rootDir);
        const [overviewContent, techStackContent, architectureContent, readmeContent, zhReadmeContent, jaReadmeContent, arReadmeContent, aiGuideContent, executionProtocolContent, inferredSummary, inferredTechStack] = await Promise.all([
            readMarkdown(path_1.default.join(docsRoot, 'overview.md')),
            readMarkdown(path_1.default.join(docsRoot, 'tech-stack.md')),
            readMarkdown(path_1.default.join(docsRoot, 'architecture.md')),
            readMarkdown(path_1.default.join(rootDir, constants_1.FILE_NAMES.README)),
            readMarkdown(path_1.default.join(rootDir, 'README.zh-CN.md')),
            readMarkdown(path_1.default.join(rootDir, 'README.ja.md')),
            readMarkdown(path_1.default.join(rootDir, 'README.ar.md')),
            readMarkdown(path_1.default.join(rootDir, constants_1.DIR_NAMES.FOR_AI, 'ai-guide.md')),
            readMarkdown(path_1.default.join(rootDir, constants_1.DIR_NAMES.FOR_AI, 'execution-protocol.md')),
            this.inferBootstrapSummary(rootDir),
            this.inferBootstrapTechStack(rootDir),
        ]);
        const localizedReadmeContents = [zhReadmeContent, jaReadmeContent, arReadmeContent];
        const summary = extractParagraph(overviewContent) ||
            extractParagraph(readmeContent) ||
            localizedReadmeContents
                .map(content => extractParagraph(content))
                .find(Boolean) ||
            inferredSummary;
        const explicitTechStack = extractBulletList(techStackContent);
        const documentLanguage = this.detectDocumentLanguageFromTexts([
            overviewContent,
            techStackContent,
            architectureContent,
            readmeContent,
            ...localizedReadmeContents,
            aiGuideContent,
            executionProtocolContent,
        ]);
        const modules = await this.inferBootstrapModules(rootDir);
        const apiDocs = await this.scanApiDocs(rootDir);
        const designDocs = await this.scanDesignDocs(rootDir);
        const planningDocs = await this.scanPlanningDocs(rootDir);
        return {
            projectName: path_1.default.basename(path_1.default.resolve(rootDir)),
            summary,
            techStack: explicitTechStack.length > 0 ? explicitTechStack : inferredTechStack,
            architecture: extractParagraph(architectureContent),
            modules,
            apiAreas: apiDocs
                .filter(item => item.name.toLowerCase() !== 'readme.md')
                .map(item => item.name.replace(/\.md$/i, '').replace(/-/g, ' ')),
            designDocs: designDocs
                .filter(item => item.name.toLowerCase() !== 'readme.md')
                .map(item => item.name.replace(/\.md$/i, '').replace(/-/g, ' ')),
            planningDocs: planningDocs
                .filter(item => item.name.toLowerCase() !== 'readme.md')
                .map(item => item.name.replace(/\.md$/i, '').replace(/-/g, ' ')),
            documentLanguage: persistedDocumentLanguage || documentLanguage,
        };
    }

    async inferBootstrapSummary(rootDir) {
        const packageJsonPath = path_1.default.join(rootDir, 'package.json');
        if (await this.fileService.exists(packageJsonPath)) {
            try {
                const packageJson = await this.fileService.readJSON(packageJsonPath);
                if (typeof packageJson?.description === 'string' && packageJson.description.trim().length > 0) {
                    return packageJson.description.trim();
                }
            }
            catch {
            }
        }
        const pyprojectPath = path_1.default.join(rootDir, 'pyproject.toml');
        if (await this.fileService.exists(pyprojectPath)) {
            try {
                const content = await this.fileService.readFile(pyprojectPath);
                const match = content.match(/^\s*description\s*=\s*["'](.+?)["']\s*$/m);
                if (match?.[1]?.trim()) {
                    return match[1].trim();
                }
            }
            catch {
            }
        }
        return '';
    }

    async inferBootstrapTechStack(rootDir) {
        const stack = new Set();
        const add = (...items) => {
            for (const item of items) {
                if (typeof item === 'string' && item.trim().length > 0) {
                    stack.add(item.trim());
                }
            }
        };
        const packageJsonPath = path_1.default.join(rootDir, 'package.json');
        if (await this.fileService.exists(packageJsonPath)) {
            add('Node.js');
            try {
                const packageJson = await this.fileService.readJSON(packageJsonPath);
                const deps = {
                    ...(packageJson?.dependencies || {}),
                    ...(packageJson?.devDependencies || {}),
                    ...(packageJson?.peerDependencies || {}),
                };
                const depNames = Object.keys(deps);
                if (depNames.some(name => name === 'typescript' || name.startsWith('@types/'))) {
                    add('TypeScript');
                }
                if (depNames.includes('react')) {
                    add('React');
                }
                if (depNames.includes('next')) {
                    add('Next.js');
                }
                if (depNames.includes('vue')) {
                    add('Vue');
                }
                if (depNames.includes('nuxt') || depNames.includes('nuxt3')) {
                    add('Nuxt');
                }
                if (depNames.includes('svelte')) {
                    add('Svelte');
                }
                if (depNames.includes('astro')) {
                    add('Astro');
                }
                if (depNames.includes('express')) {
                    add('Express');
                }
                if (depNames.includes('@nestjs/core')) {
                    add('NestJS');
                }
                if (depNames.includes('fastify')) {
                    add('Fastify');
                }
                if (depNames.includes('electron')) {
                    add('Electron');
                }
                if (depNames.includes('vite')) {
                    add('Vite');
                }
            }
            catch {
            }
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'tsconfig.json'))) {
            add('TypeScript');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'requirements.txt')) ||
            await this.fileService.exists(path_1.default.join(rootDir, 'pyproject.toml'))) {
            add('Python');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'manage.py'))) {
            add('Django');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'go.mod'))) {
            add('Go');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'Cargo.toml'))) {
            add('Rust');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'composer.json'))) {
            add('PHP');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'Gemfile'))) {
            add('Ruby');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'pom.xml')) ||
            await this.fileService.exists(path_1.default.join(rootDir, 'build.gradle')) ||
            await this.fileService.exists(path_1.default.join(rootDir, 'build.gradle.kts'))) {
            add('Java');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'pubspec.yaml'))) {
            add('Dart');
        }
        if (await this.fileService.exists(path_1.default.join(rootDir, 'Dockerfile'))) {
            add('Docker');
        }
        return Array.from(stack);
    }
    normalizeDocumentLanguage(input) {
        return input === 'en-US' || input === 'zh-CN' || input === 'ja-JP' || input === 'ar'
            ? input
            : undefined;
    }
    async getConfiguredDocumentLanguage(rootDir) {
        try {
            const config = await this.configManager.loadConfig(rootDir);
            return this.normalizeDocumentLanguage(config?.documentLanguage);
        }
        catch {
            return undefined;
        }
    }
    async syncConfigDocumentLanguage(rootDir, config, documentLanguage) {
        const normalized = this.normalizeDocumentLanguage(documentLanguage);
        if (!normalized || config?.documentLanguage === normalized) {
            return false;
        }
        config.documentLanguage = normalized;
        await this.configManager.saveConfig(rootDir, config);
        return true;
    }

    detectDocumentLanguageFromTexts(contents) {
        for (const content of contents) {
            const detected = this.detectDocumentLanguageFromText(content);
            if (detected) {
                return detected;
            }
        }
        return undefined;
    }
    detectDocumentLanguageFromText(content) {
        if (typeof content !== 'string' || content.trim().length === 0) {
            return undefined;
        }
        if (/[\u0600-\u06FF]/.test(content)) {
            return 'ar';
        }
        if (/[ぁ-ゟ゠-ヿ]/.test(content)) {
            return 'ja-JP';
        }
        if (this.isLikelyJapaneseKanjiContent(content)) {
            return 'ja-JP';
        }
        if (/[一-龥]/.test(content)) {
            return 'zh-CN';
        }
        if (/[A-Za-z]/.test(content)) {
            return 'en-US';
        }
        return undefined;
    }
    isLikelyJapaneseKanjiContent(content) {
        if (!/[一-龥]/.test(content)) {
            return false;
        }
        if (/[々〆ヵヶ「」『』]/.test(content)) {
            return true;
        }
        return /(一覧|詳細|設定|権限|検索|構成|変更|確認|対応|連携|承認|申請|手順|履歴|機能|実装|設計|運用|画面|帳票|組織|拠点|区分|種別|完了|開始|終了|表示|取得|追加|削除|更新|登録)/.test(content);
    }







    previewBootstrap(rootDir, mode, input) {







        return this.buildBootstrapPreview(rootDir, mode, input);







    }







    async inferBootstrapModules(rootDir) {







        const inferred = new Set();







        const pushDirectories = async (pathSegments, options = {}) => {







            const directoryPath = path_1.default.join(rootDir, ...pathSegments);







            if (!(await this.fileService.exists(directoryPath))) {







                return;







            }







            const entries = await fs_extra_1.default.readdir(directoryPath, { withFileTypes: true });







            for (const entry of entries) {







                if (!entry.isDirectory()) {







                    continue;







                }







                const normalizedName = entry.name.trim();







                if (!normalizedName || normalizedName.startsWith('.')) {







                    continue;







                }







                if ((options.exclude ?? []).includes(normalizedName.toLowerCase())) {







                    continue;







                }







                inferred.add(normalizedName);







            }







        };







        await pushDirectories([constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.MODULES]);







        await pushDirectories(['apps']);







        await pushDirectories(['packages']);







        await pushDirectories(['services']);







        await pushDirectories(['modules']);







        if (inferred.size === 0) {







            await pushDirectories([constants_1.DIR_NAMES.SRC], {







                exclude: ['core', 'modules', 'utils', 'shared', 'types', 'assets', 'styles', 'tests', '__tests__'],







            });







        }







        return Array.from(inferred).sort((left, right) => left.localeCompare(right));







    }







    getBootstrapFieldPolicy() {







        return [







            { key: 'projectName', required: true, allowPlaceholder: false },







            { key: 'summary', required: false, allowPlaceholder: true },







            { key: 'techStack', required: false, allowPlaceholder: true },







            { key: 'architecture', required: false, allowPlaceholder: true },







            { key: 'modules', required: false, allowPlaceholder: true },







            { key: 'apiAreas', required: false, allowPlaceholder: true },







            { key: 'designDocs', required: false, allowPlaceholder: true },







            { key: 'planningDocs', required: false, allowPlaceholder: true },







        ];







    }







    getBootstrapStructurePolicy(rootDir) {







        const definitions = this.getStructureDefinitions();







        const toPath = (definition) => path_1.default.join(rootDir, ...definition.pathSegments);







        return {







            minimumRequiredPaths: definitions







                .filter(definition => definition.required)







                .map(definition => toPath(definition)),







            recommendedPaths: definitions.map(definition => toPath(definition)),







            compatibleMissingRecommendedPaths: definitions







                .filter(definition => !definition.required)







                .map(definition => toPath(definition)),







        };







    }







    async buildBootstrapPreview(rootDir, mode, input) {







        const inferredModules = await this.inferBootstrapModules(rootDir);







        const normalized = await this.normalizeProjectBootstrap(rootDir, mode, input);







        const assetPlan = this.getBootstrapAssetPlan(normalized.documentLanguage, normalized);







        const scaffoldPlan = await this.projectScaffoldService.getPlanForProject(rootDir, normalized);







        const commandPlan = this.projectScaffoldCommandService.getPlan(normalized, scaffoldPlan);







        return {







            projectPresetId: normalized.projectPresetId,







            projectName: normalized.projectName,







            mode,







            summary: normalized.summary,







            techStack: normalized.techStack,







            modules: normalized.modules,







            apiAreas: normalized.apiAreas,







            designDocs: normalized.designDocs,







            planningDocs: normalized.planningDocs,







            moduleSkillFiles: normalized.modulePlans.map(plan => plan.path),







            moduleApiDocFiles: normalized.moduleApiPlans.map(plan => plan.path),







            apiDocFiles: normalized.apiAreaPlans.map(plan => plan.path),







            designDocFiles: normalized.designDocPlans.map(plan => plan.path),







            planningDocFiles: normalized.planningDocPlans.map(plan => plan.path),







            inferredModules,







            fieldPolicy: this.getBootstrapFieldPolicy(),







            structurePolicy: this.getBootstrapStructurePolicy(rootDir),







            assetPlan,







            scaffoldPlan,







            commandPlan,







            firstChangeSuggestion: this.getFirstChangeSuggestion(normalized),







            usedFallbacks: normalized.usedFallbacks,







            fieldSources: normalized.fieldSources,







            files: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.README,







                constants_1.FILE_NAMES.SKILL_MD,







                constants_1.FILE_NAMES.SKILL_INDEX,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.FILE_NAMES.SKILL_MD}`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}/README.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}/README.md`,







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/README.md`,







                `${constants_1.DIR_NAMES.SRC}/${constants_1.FILE_NAMES.SKILL_MD}`,







                `${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.CORE}/${constants_1.FILE_NAMES.SKILL_MD}`,







                `${constants_1.DIR_NAMES.TESTS}/${constants_1.FILE_NAMES.SKILL_MD}`,







                `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.AI_GUIDE}`,







                `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.EXECUTION_PROTOCOL}`,







                '.ospec/asset-sources.json',







                ...this.projectAssetService.getDirectCopyTargetPaths(),







                ...(scaffoldPlan?.files || []).map(file => file.path),







                ...normalized.modulePlans.map(plan => plan.path),







                ...normalized.moduleApiPlans.map(plan => plan.path),







                ...normalized.apiAreaPlans.map(plan => plan.path),







                ...normalized.designDocPlans.map(plan => plan.path),







                ...normalized.planningDocPlans.map(plan => plan.path),







            ],







        };







    }







    async rebuildIndex(rootDir) {







        const documentLanguage = (await this.getBootstrapUpgradePlan(rootDir)).documentLanguage || 'en-US';







        await this.projectAssetService.installDirectCopyAssets(rootDir, documentLanguage);







        await this.indexBuilder.write(rootDir);







        return this.getIndexStatus(rootDir);







    }







    getDirectorySkeleton(rootDir) {







        return [







            path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ARCHIVED),







            path_1.default.join(rootDir, '.ospec'),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.DESIGN),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PLANNING),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.API),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.CORE),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.MODULES),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.TESTS),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.FOR_AI),







        ];







    }







    getProtocolShellDirectorySkeleton(rootDir) {







        return [







            path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ARCHIVED),







            path_1.default.join(rootDir, '.ospec'),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.FOR_AI),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS),







        ];







    }







    getKnowledgeLayerDirectorySkeleton(rootDir) {







        return [







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.DESIGN),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PLANNING),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.API),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.CORE),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.MODULES),







            path_1.default.join(rootDir, constants_1.DIR_NAMES.TESTS),







        ];







    }







    getMinimumRuntimeStructureDefinitions() {







        return [







            { key: constants_1.FILE_NAMES.SKILLRC, pathSegments: [constants_1.FILE_NAMES.SKILLRC], required: true, category: 'core' },







            {







                key: `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`,







                pathSegments: [constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE],







                required: true,







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`,







                pathSegments: [constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ARCHIVED],







                required: true,







                category: 'core',







            },







            { key: '.ospec', pathSegments: ['.ospec'], required: true, category: 'core' },







        ];







    }







    getProtocolShellRecommendedDefinitions() {







        return [







            { key: constants_1.FILE_NAMES.SKILL_MD, pathSegments: [constants_1.FILE_NAMES.SKILL_MD], category: 'core' },







            { key: constants_1.FILE_NAMES.SKILL_INDEX, pathSegments: [constants_1.FILE_NAMES.SKILL_INDEX], category: 'core' },







            { key: constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT, pathSegments: [constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT], category: 'core' },







            { key: constants_1.DIR_NAMES.DOCS, pathSegments: [constants_1.DIR_NAMES.DOCS], category: 'knowledge' },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.AI_GUIDE}`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, constants_1.FILE_NAMES.AI_GUIDE],







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.EXECUTION_PROTOCOL}`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, constants_1.FILE_NAMES.EXECUTION_PROTOCOL],







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/naming-conventions.md`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, 'naming-conventions.md'],







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/skill-conventions.md`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, 'skill-conventions.md'],







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/workflow-conventions.md`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, 'workflow-conventions.md'],







                category: 'core',







            },







            {







                key: `${constants_1.DIR_NAMES.FOR_AI}/development-guide.md`,







                pathSegments: [constants_1.DIR_NAMES.FOR_AI, 'development-guide.md'],







                category: 'core',







            },







        ];







    }







    getProjectKnowledgeStructureDefinitions() {







        return [







            {







                key: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`,







                pathSegments: [constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'overview.md'],







            },







            {







                key: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`,







                pathSegments: [constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'tech-stack.md'],







            },







            {







                key: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`,







                pathSegments: [constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'architecture.md'],







            },







            {







                key: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`,







                pathSegments: [constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'module-map.md'],







            },







            {







                key: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`,







                pathSegments: [constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'api-overview.md'],







            },







        ];







    }







    getStructureDefinitions() {







        return [







            ...this.getMinimumRuntimeStructureDefinitions(),







            ...this.getProtocolShellRecommendedDefinitions(),







            ...this.getProjectKnowledgeStructureDefinitions(),







        ];







    }







    getDocumentDefinitions() {







        return this.getProjectKnowledgeStructureDefinitions();







    }







    getRootSkillDefinitions() {







        return [{ key: constants_1.FILE_NAMES.SKILL_MD, pathSegments: [constants_1.FILE_NAMES.SKILL_MD] }];







    }







    async toDocumentStatusItem(rootDir, definition) {







        let filePath = path_1.default.join(rootDir, ...definition.pathSegments);







        let exists = await this.fileService.exists(filePath);
        if (!exists && definition.key === constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT) {
            const legacyBuildIndexScriptPath = path_1.default.join(rootDir, 'build-index-auto.js');
            if (await this.fileService.exists(legacyBuildIndexScriptPath)) {
                filePath = legacyBuildIndexScriptPath;
                exists = true;
            }
        }







        const updatedAt = exists ? (await this.fileService.stat(filePath)).mtime.toISOString() : null;







        return {







            key: definition.key,







            path: filePath,







            exists,







            required: Boolean(definition.required),







            updatedAt,







        };







    }







    async toSkillFileInfo(rootDir, definition) {







        const filePath = path_1.default.join(rootDir, ...definition.pathSegments);







        const exists = await this.fileService.exists(filePath);







        if (!exists) {







            return {







                key: definition.key,







                path: filePath,







                exists: false,







                title: null,







                tags: [],







                sectionCount: 0,







                sectionTitles: [],







            };







        }







        try {







            const parsed = this.skillParser.parseSkillFile(await this.fileService.readFile(filePath));







            return {







                key: definition.key,







                path: filePath,







                exists: true,







                title: parsed.frontmatter.title || parsed.frontmatter.name || null,







                tags: parsed.frontmatter.tags,







                sectionCount: Object.keys(parsed.sections).length,







                sectionTitles: Object.keys(parsed.sections),







            };







        }







        catch {







            return {







                key: definition.key,







                path: filePath,







                exists: true,







                title: null,







                tags: [],







                sectionCount: 0,







                sectionTitles: [],







            };







        }







    }







    async writeIfMissing(filePath, content) {







        if (!(await this.fileService.exists(filePath))) {







            await this.fileService.writeFile(filePath, content);







        }







    }







    async normalizeProjectBootstrap(rootDir, mode, input) {







        const projectName = path_1.default.basename(path_1.default.resolve(rootDir));







        const mergedInput = {







            ...(await this.getBootstrapUpgradePlan(rootDir)),







            ...(input ?? {}),







        };







        const inferredDefaults = {







            modules: await this.inferBootstrapModules(rootDir),







        };







        const presetDefaults = this.getPresetDefaults(mergedInput);







        return this.templateEngine.normalizeProjectBootstrapInput(mergedInput, projectName, mode, inferredDefaults, presetDefaults);







    }







    async writeProjectKnowledgeLayer(rootDir, mode, normalized) {







        const result = {







            created: [],







            refreshed: [],







            skipped: [],







        };







        const projectName = normalized.projectName;







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.FILE_NAMES.README), this.templateEngine.generateProjectReadmeTemplate(projectName, mode, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_MD), this.templateEngine.generateRootSkillTemplate(projectName, mode, normalized), result, { overwriteProtocolShellRootSkill: true });







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.FILE_NAMES.SKILL_MD), this.templateEngine.generateDocsSkillTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.FILE_NAMES.SKILL_MD), this.templateEngine.generateSrcSkillTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.CORE, constants_1.FILE_NAMES.SKILL_MD), this.templateEngine.generateCoreSkillTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.TESTS, constants_1.FILE_NAMES.SKILL_MD), this.templateEngine.generateTestsSkillTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'overview.md'), this.templateEngine.generateProjectOverviewTemplate(projectName, mode, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'tech-stack.md'), this.templateEngine.generateTechStackTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'architecture.md'), this.templateEngine.generateArchitectureTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'module-map.md'), this.templateEngine.generateModuleMapTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'api-overview.md'), this.templateEngine.generateApiOverviewTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.DESIGN, 'README.md'), this.templateEngine.generateDesignDocsTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PLANNING, 'README.md'), this.templateEngine.generatePlanningDocsTemplate(projectName, normalized), result);







        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.API, 'README.md'), this.templateEngine.generateApiDocsTemplate(projectName, normalized), result);







        for (const modulePlan of normalized.modulePlans) {







            await this.fileService.ensureDir(path_1.default.join(rootDir, constants_1.DIR_NAMES.SRC, constants_1.DIR_NAMES.MODULES, modulePlan.name));







            await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, ...modulePlan.path.split('/')), this.templateEngine.generateModuleSkillTemplate(projectName, modulePlan.displayName, normalized, modulePlan.name), result);







        }







        for (const moduleApiPlan of normalized.moduleApiPlans) {







            const moduleSlug = moduleApiPlan.name.replace(/^module-/, '');







            const modulePlan = normalized.modulePlans.find(plan => plan.name === moduleSlug);







            await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, ...moduleApiPlan.path.split('/')), this.templateEngine.generateModuleApiDocTemplate(projectName, modulePlan?.displayName ?? moduleSlug, normalized, moduleSlug), result);







        }







        for (const apiAreaPlan of normalized.apiAreaPlans) {







            await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, ...apiAreaPlan.path.split('/')), this.templateEngine.generateApiAreaDocTemplate(projectName, apiAreaPlan.displayName, normalized), result);







        }







        for (const designDocPlan of normalized.designDocPlans) {







            await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, ...designDocPlan.path.split('/')), this.templateEngine.generateDesignDocTemplate(projectName, designDocPlan.displayName, normalized), result);







        }







        for (const planningDocPlan of normalized.planningDocPlans) {







            await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, ...planningDocPlan.path.split('/')), this.templateEngine.generatePlanningDocTemplate(projectName, planningDocPlan.displayName, normalized), result);







        }







        return result;







    }







    async writeGeneratedFile(rootDir, filePath, content, result, options = {}) {







        const relativePath = this.toRelativePath(rootDir, filePath);







        const exists = await this.fileService.exists(filePath);







        const shouldOverwrite = exists &&







            options.overwriteProtocolShellRootSkill === true &&







            (await this.isProtocolShellRootSkill(filePath));







        if (!exists || shouldOverwrite) {







            await this.fileService.writeFile(filePath, content);







            if (shouldOverwrite) {







                result.refreshed.push(relativePath);







            }







            else {







                result.created.push(relativePath);







            }







            return;







        }







        result.skipped.push(relativePath);







    }







    async isProtocolShellRootSkill(filePath) {







        if (!(await this.fileService.exists(filePath))) {







            return false;







        }







        const content = await this.fileService.readFile(filePath);







        try {
            const parsed = (0, gray_matter_1.default)(content);
            const tags = Array.isArray(parsed.data?.tags)
                ? parsed.data.tags.filter((tag) => typeof tag === 'string')
                : [];
            if (!tags.includes('protocol-shell')) {
                return false;
            }
            return (parsed.content.includes('Project knowledge: not generated yet') ||
                parsed.content.includes('项目知识：尚未生成') ||
                parsed.content.includes('プロジェクト知識: まだ生成されていません') ||
                parsed.content.includes('معرفة المشروع: لم يتم توليدها بعد'));
        }
        catch {
            return false;
        }







    }







    createEmptyScaffoldResult() {







        return {







            plan: null,







            createdDirectories: [],







            skippedDirectories: [],







            createdFiles: [],







            skippedFiles: [],







        };







    }







    async applyProjectScaffoldPhase(rootDir, normalized) {







        return ((await this.projectScaffoldService.applyScaffold(rootDir, normalized)) ??







            this.createEmptyScaffoldResult());







    }







    getProtocolShellTemplateGeneratedPaths() {







        return [







            constants_1.FILE_NAMES.SKILL_MD,







        ];







    }







    getFullBootstrapTemplateGeneratedPaths(normalized) {







        return [







            constants_1.FILE_NAMES.README,







            constants_1.FILE_NAMES.SKILL_MD,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.FILE_NAMES.SKILL_MD}`,







            `${constants_1.DIR_NAMES.SRC}/${constants_1.FILE_NAMES.SKILL_MD}`,







            `${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.CORE}/${constants_1.FILE_NAMES.SKILL_MD}`,







            `${constants_1.DIR_NAMES.TESTS}/${constants_1.FILE_NAMES.SKILL_MD}`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}/README.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}/README.md`,







            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/README.md`,







            ...normalized.modulePlans.map(plan => plan.path),







            ...normalized.moduleApiPlans.map(plan => plan.path),







            ...normalized.apiAreaPlans.map(plan => plan.path),







            ...normalized.designDocPlans.map(plan => plan.path),







            ...normalized.planningDocPlans.map(plan => plan.path),







        ];







    }







    getBootstrapAssetPlan(documentLanguage, normalized) {







        const staticPlan = this.projectAssetService.getAssetPlan(documentLanguage);







        return {







            directCopyFiles: staticPlan.directCopyFiles,







            templateGeneratedFiles: this.getFullBootstrapTemplateGeneratedPaths(normalized),







            runtimeGeneratedFiles: [







                constants_1.FILE_NAMES.SKILLRC,







                constants_1.FILE_NAMES.SKILL_INDEX,







                '.ospec/asset-sources.json',







                `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/bootstrap-summary.md`,







            ],







            localizedCopySources: staticPlan.localizedCopySources,







        };







    }







    renderProtocolShellRootSkill(projectName, documentLanguage, mode) {
        const title = documentLanguage === 'zh-CN'
            ? `${projectName} 协议壳`
            : documentLanguage === 'ja-JP'
                ? `${projectName} プロトコルシェル`
                : documentLanguage === 'ar'
                    ? `${projectName} غلاف البروتوكول`
                    : `${projectName} Protocol Shell`;
        const body = documentLanguage === 'zh-CN'
            ? `# ${projectName}

> 层级：协议壳

## 当前状态

- 项目：${projectName}
- 模式：${mode}
- 状态：已完成 OSpec 协议壳初始化
- 项目知识：尚未生成

## 首先阅读

- [AI 指南](for-ai/ai-guide.md)
- [执行协议](for-ai/execution-protocol.md)
- [命名规范](for-ai/naming-conventions.md)
- [技能规范](for-ai/skill-conventions.md)
- [工作流规范](for-ai/workflow-conventions.md)
- [开发指南](for-ai/development-guide.md)

## 说明

- 当前仓库仅包含 OSpec 协议壳。
- 项目文档、源码结构、测试入口与业务 scaffold 需后续通过明确命令或技能生成。
- 如果项目启用了 Stitch 且某个 active change 激活了 \`stitch_design_review\`，继续执行或声称可归档前，先检查 \`changes/active/<change>/artifacts/stitch/approval.json\`。
- Active change 位于 \`changes/active/<change>\`。`
            : documentLanguage === 'ja-JP'
                ? `# ${projectName}

> レイヤー: プロトコルシェル

## 現在の状態

- プロジェクト: ${projectName}
- モード: ${mode}
- 状態: OSpec のプロトコルシェルは初期化済み
- プロジェクト知識: まだ生成されていません

## 最初に読むもの

- [AI ガイド](for-ai/ai-guide.md)
- [実行プロトコル](for-ai/execution-protocol.md)
- [命名規約](for-ai/naming-conventions.md)
- [SKILL 規約](for-ai/skill-conventions.md)
- [ワークフロー規約](for-ai/workflow-conventions.md)
- [開発ガイド](for-ai/development-guide.md)

## メモ

- このリポジトリには現在 OSpec のプロトコルシェルのみがあります。
- プロジェクト文書、ソース構造、テスト導線、業務用 scaffold は後で明示的なコマンドまたはスキルで生成してください。
- Stitch が有効で、active change が \`stitch_design_review\` を有効化している場合は、作業継続や archive 可否を主張する前に \`changes/active/<change>/artifacts/stitch/approval.json\` を確認してください。
- active change は \`changes/active/<change>\` にあります。`
                : documentLanguage === 'ar'
                    ? `# ${projectName}

> الطبقة: غلاف البروتوكول

## الحالة الحالية

- المشروع: ${projectName}
- النمط: ${mode}
- الحالة: تم تهيئة غلاف بروتوكول OSpec
- معرفة المشروع: لم يتم توليدها بعد

## اقرأ أولاً

- [دليل الذكاء الاصطناعي](for-ai/ai-guide.md)
- [بروتوكول التنفيذ](for-ai/execution-protocol.md)
- [اتفاقيات التسمية](for-ai/naming-conventions.md)
- [اتفاقيات SKILL](for-ai/skill-conventions.md)
- [اتفاقيات سير العمل](for-ai/workflow-conventions.md)
- [دليل التطوير](for-ai/development-guide.md)

## ملاحظات

- يحتوي هذا المستودع حالياً على غلاف بروتوكول OSpec فقط.
- يجب إنشاء وثائق المشروع وبنية المصدر ومسار الاختبارات والـ scaffold الخاص بالأعمال لاحقاً عبر أوامر أو مهارات صريحة.
- إذا كان Stitch مفعلاً وكان التغيير النشط يفعّل \`stitch_design_review\`، فافحص \`changes/active/<change>/artifacts/stitch/approval.json\` قبل متابعة التنفيذ أو الادعاء بأن الأرشفة جاهزة.
- توجد التغييرات النشطة تحت \`changes/active/<change>\` .`
                    : `# ${projectName}

> Layer: protocol shell

## Current State

- Project: ${projectName}
- Mode: ${mode}
- Status: OSpec protocol shell initialized
- Project knowledge: not generated yet

## Read First

- [AI guide](for-ai/ai-guide.md)
- [Execution protocol](for-ai/execution-protocol.md)
- [Naming conventions](for-ai/naming-conventions.md)
- [Skill conventions](for-ai/skill-conventions.md)
- [Workflow conventions](for-ai/workflow-conventions.md)
- [Development guide](for-ai/development-guide.md)

## Notes

- This repository currently contains only the OSpec protocol shell.
- Project docs, source structure, tests, and business scaffold should be generated later through explicit skills or commands.
- If Stitch is enabled and an active change triggers \`stitch_design_review\`, inspect \`changes/active/<change>/artifacts/stitch/approval.json\` before continuing execution or archive claims.
- Active changes live under \`changes/active/<change>\`.`;
        return `---
name: ${projectName}
title: ${title}
tags: [ospec, bootstrap, protocol-shell]
---

${body}
`;
    }

    async writeBootstrapSummary(rootDir, input) {







        const filePath = path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, constants_1.DIR_NAMES.PROJECT, 'bootstrap-summary.md');







        await this.fileService.writeFile(filePath, this.renderBootstrapSummary(input, rootDir));







    }







    renderBootstrapSummary(input, rootDir) {







        const isEnglish = input.normalized.documentLanguage === 'en-US';







        const title = isEnglish ? 'Bootstrap Summary' : '初始化摘要';







        const commandStatus = this.describeCommandExecutionStatus(input.commandExecution.status, input.normalized.documentLanguage);







        const formatPaths = (items, emptyLabel) => items.length > 0 ? items.map(item => `- \`${item}\``).join('\n') : `- ${emptyLabel}`;







        const formatCommandSteps = () => {







            if (!input.commandPlan || input.commandPlan.steps.length === 0) {







                return isEnglish ? '- No scaffold command plan.' : '- 当前没有脚手架命令计划。';







            }







            return input.commandPlan.steps







                .map(step => `- \`${step.shellCommand}\` (${step.description})`)







                .join('\n');







        };







        const formatSuggestion = () => {







            if (!input.firstChangeSuggestion) {







                return isEnglish ? '- No preset-driven first change suggestion.' : '- 当前没有预设驱动的首个变更建议。';







            }







            return [







                `- ${isEnglish ? 'Suggested change' : '建议变更'}: \`${input.firstChangeSuggestion.name}\``,







                `- ${isEnglish ? 'Affects' : '影响模块'}: ${input.firstChangeSuggestion.affects.join(', ') || '-'}`,







                `- ${isEnglish ? 'Flags' : '标记'}: ${input.firstChangeSuggestion.flags.join(', ') || '-'}`,







            ].join('\n');







        };







        const recoveryLine = input.recoveryFilePath







            ? `- ${isEnglish ? 'Recovery record' : '补救记录'}: \`${this.toRelativePath(rootDir, input.recoveryFilePath)}\``







            : `- ${isEnglish ? 'Recovery record' : '补救记录'}: ${isEnglish ? 'None' : '无'}`;







        return `---







name: bootstrap-summary







title: "${input.normalized.projectName} ${title}"







tags: [project, bootstrap, scaffold]







---















# ${title}















## ${isEnglish ? 'Context' : '上下文'}















- ${isEnglish ? 'Project' : '项目'}: ${input.normalized.projectName}







- ${isEnglish ? 'Mode' : '模式'}: ${input.mode}







- ${isEnglish ? 'Preset' : 'Preset'}: ${input.normalized.projectPresetId || (isEnglish ? 'None' : '无')}







- ${isEnglish ? 'Document language' : '文档语言'}: ${input.normalized.documentLanguage}







- ${isEnglish ? 'Scaffold command execution' : '脚手架命令执行'}: ${commandStatus}















## ${isEnglish ? 'Business Scaffold' : '业务框架脚手架'}















- ${isEnglish ? 'Framework' : '框架方案'}: ${input.scaffoldPlan?.framework || (isEnglish ? 'None' : '无')}







- ${isEnglish ? 'Install command' : '安装命令'}: ${input.scaffoldPlan?.installCommand || (isEnglish ? 'None' : '无')}















### ${isEnglish ? 'Created directories' : '本次创建目录'}















${formatPaths(input.scaffoldCreatedDirectories, isEnglish ? 'No new scaffold directories were created.' : '本次没有新建业务框架目录。')}















### ${isEnglish ? 'Created files' : '本次创建文件'}















${formatPaths(input.scaffoldCreatedFiles, isEnglish ? 'No new scaffold files were created.' : '本次没有新建业务框架文件。')}















### ${isEnglish ? 'Preserved existing scaffold paths' : '已保留的现有框架路径'}















${formatPaths([...input.scaffoldSkippedDirectories, ...input.scaffoldSkippedFiles], isEnglish ? 'No scaffold paths were preserved.' : '当前没有需要保留的现有框架路径。')}















## ${isEnglish ? 'OSpec Knowledge Backfill' : 'OSpec 知识回填'}















### ${isEnglish ? 'Direct-copy assets created' : '直接复制资产'}















${formatPaths(input.directCopyCreatedFiles, isEnglish ? 'No direct-copy assets were created.' : '本次没有新建直接复制资产。')}















### ${isEnglish ? 'Git hooks installed' : 'Git hooks'}















${formatPaths(input.hookInstalledFiles, isEnglish ? 'No hooks were installed.' : '本次没有安装 Git hooks。')}















### ${isEnglish ? 'Runtime-generated files' : '运行期生成文件'}















${formatPaths(input.runtimeGeneratedFiles, isEnglish ? 'No runtime-generated files were recorded.' : '当前没有记录运行期生成文件。')}















## ${isEnglish ? 'Command Plan' : '命令计划'}















${formatCommandSteps()}















- ${isEnglish ? 'Execution result' : '执行结果'}: ${commandStatus}







${recoveryLine}















## ${isEnglish ? 'Default First Change Suggestion' : '默认首个 Change 建议'}















${formatSuggestion()}







`;







    }







    describeCommandExecutionStatus(status, language) {







        const isEnglish = language === 'en-US';







        if (status === 'completed') {







            return isEnglish ? 'Completed' : '已完成';







        }







        if (status === 'failed') {







            return isEnglish ? 'Failed' : '失败';







        }







        return isEnglish ? 'Deferred' : '已延后';







    }







    getPresetDefaults(input) {







        const preset = (0, ProjectPresets_1.getProjectPresetById)(input?.projectPresetId);







        if (!preset) {







            return undefined;







        }







        const language = input?.documentLanguage === 'zh-CN' ||
            input?.documentLanguage === 'en-US' ||
            input?.documentLanguage === 'ja-JP' ||
            input?.documentLanguage === 'ar'
            ? input.documentLanguage
            : 'en-US';







        const localized = (0, ProjectPresets_1.getLocalizedProjectPresetContent)(preset.id, language);







        return {







            projectPresetId: preset.id,







            summary: localized?.description ?? preset.description,







            techStack: preset.recommendedTechStack,







            architecture: localized?.architecture ?? preset.architecture,







            modules: preset.modules,







            apiAreas: preset.apiAreas,







            designDocs: localized?.designDocs ?? preset.designDocs,







            planningDocs: localized?.planningDocs ?? preset.planningDocs,







        };







    }







    getFirstChangeSuggestion(normalized) {







        return (0, ProjectPresets_1.getProjectPresetFirstChangeSuggestion)(normalized.projectPresetId, normalized.documentLanguage, normalized.projectName);







    }







    calculateProgress(state) {







        const total = state.completed.length + state.pending.length;







        if (total === 0) {







            return 0;







        }







        return Math.round((state.completed.length / total) * 100);







    }







    extractDescription(content) {







        const lines = content







            .split(/\r?\n/)







            .map(line => line.trim())







            .filter(Boolean)







            .filter(line => !line.startsWith('#'));







        return lines[0] || 'No description yet';







    }







    async buildActiveChangeStatusItem(rootDir, featureDir, workflow) {







        const statePath = path_1.default.join(featureDir, constants_1.FILE_NAMES.STATE);







        if (!(await this.fileService.exists(statePath))) {







            return null;







        }







        const proposalPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.PROPOSAL);







        const tasksPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.TASKS);







        const verificationPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.VERIFICATION);







        const [state, proposalExists, tasksExists, verificationExists] = await Promise.all([







            this.fileService.readJSON(statePath),







            this.fileService.exists(proposalPath),







            this.fileService.exists(tasksPath),







            this.fileService.exists(verificationPath),







        ]);







        let flags = [];







        let description = 'No description yet';







        let activatedSteps = [];







        const checks = [







            {







                name: 'proposal.md',







                status: proposalExists ? 'pass' : 'fail',







                message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing',







            },







            {







                name: 'tasks.md',







                status: tasksExists ? 'pass' : 'fail',







                message: tasksExists ? 'Tasks file exists' : 'tasks.md is missing',







            },







            {







                name: 'verification.md',







                status: verificationExists ? 'pass' : 'fail',







                message: verificationExists







                    ? 'Verification file exists'







                    : 'verification.md is missing',







            },







        ];







        if (proposalExists) {







            const proposal = (0, gray_matter_1.default)(await this.fileService.readFile(proposalPath));







            flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];







            description = this.extractDescription(proposal.content);







            activatedSteps = workflow.getActivatedSteps(flags);







            const validation = workflow.validateFlags(flags);







            checks.push({







                name: 'proposal.flags',







                status: 'pass',







                message: activatedSteps.length > 0







                    ? `Activated optional steps: ${activatedSteps.join(', ')}`







                    : 'No optional steps activated',







            });







            if (validation.unsupported.length > 0) {







                checks.push({







                    name: 'proposal.unsupported_flags',







                    status: 'warn',







                    message: `Unsupported flags: ${validation.unsupported.join(', ')}`,







                });







            }







        }







        const tasksAnalysis = tasksExists







            ? await this.analyzeChecklistDocument(tasksPath, 'tasks.md', activatedSteps)







            : null;







        if (tasksAnalysis) {







            checks.push(...tasksAnalysis.checks);







        }







        const verificationAnalysis = verificationExists







            ? await this.analyzeVerificationDocument(verificationPath, activatedSteps)







            : null;







        if (verificationAnalysis) {







            checks.push(...verificationAnalysis.checks);







        }







        checks.push({







            name: 'state.json',







            status: 'pass',







            message: `Status is ${state.status}, current step is ${state.current_step}`,







        });







        const archiveResult = await ArchiveGate_1.archiveGate.checkArchiveReadiness(state, workflow.getArchiveGate(), {







            activatedSteps,







            tasksOptionalSteps: tasksAnalysis?.optionalSteps ?? [],







            verificationOptionalSteps: verificationAnalysis?.optionalSteps ?? [],







            passedOptionalSteps: verificationAnalysis?.passedOptionalSteps ?? [],







            tasksComplete: tasksAnalysis?.checklistComplete ?? false,







            verificationComplete: verificationAnalysis?.checklistComplete ?? false,







        });







        if (state.status === 'archived') {







            checks.push({







                name: 'archive.location',







                status: 'fail',







                message: 'state.json.status is archived but the change is still under changes/active. Archive output is inconsistent.',







            });







        }







        else if (state.status === 'ready_to_archive' && archiveResult.canArchive) {







            checks.push({







                name: 'archive.pending',







                status: 'warn',







                message: `Change is ready to archive. Run "ospec archive ${this.toRelativePath(rootDir, featureDir)}" before commit.`,







            });







        }







        const failCount = checks.filter(check => check.status === 'fail').length;







        const warnCount = checks.filter(check => check.status === 'warn').length;







        return {







            name: state.feature,







            path: this.toRelativePath(rootDir, featureDir),







            status: state.status,







            progress: this.calculateProgress(state),







            currentStep: state.current_step,







            flags,







            description,







            activatedSteps,







            summaryStatus: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',







            failCount,







            warnCount,







            archiveReady: archiveResult.canArchive,







            checks,







        };







    }







    async analyzeChecklistDocument(filePath, name, activatedSteps) {







        const content = await this.fileService.readFile(filePath);







        const parsed = (0, gray_matter_1.default)(content);







        const optionalSteps = Array.isArray(parsed.data.optional_steps) ? parsed.data.optional_steps : [];







        const missing = activatedSteps.filter(step => !optionalSteps.includes(step));







        const checklistComplete = !/- \[ \]/.test(content);







        return {







            optionalSteps,







            checklistComplete,







            checks: [







                {







                    name: `${name}.optional_steps`,







                    status: missing.length === 0 ? 'pass' : 'fail',







                    message: missing.length === 0







                        ? `All activated optional steps are present in ${name}`







                        : `Missing optional steps in ${name}: ${missing.join(', ')}`,







                },







                {







                    name: `${name}.checklist`,







                    status: checklistComplete ? 'pass' : 'warn',







                    message: checklistComplete







                        ? `${name} checklist is complete`







                        : `${name} still has unchecked items`,







                },







            ],







        };







    }







    async analyzeVerificationDocument(filePath, activatedSteps) {







        const content = await this.fileService.readFile(filePath);







        const parsed = (0, gray_matter_1.default)(content);







        const optionalSteps = Array.isArray(parsed.data.optional_steps) ? parsed.data.optional_steps : [];







        const passedOptionalSteps = Array.isArray(parsed.data.passed_optional_steps)







            ? parsed.data.passed_optional_steps







            : [];







        const missing = activatedSteps.filter(step => !optionalSteps.includes(step));







        const checklistComplete = !/- \[ \]/.test(content);







        return {







            optionalSteps,







            passedOptionalSteps,







            checklistComplete,







            checks: [







                {







                    name: 'verification.md.optional_steps',







                    status: missing.length === 0 ? 'pass' : 'fail',







                    message: missing.length === 0







                        ? 'All activated optional steps are present in verification.md'







                        : `Missing optional steps in verification.md: ${missing.join(', ')}`,







                },







                {







                    name: 'verification.md.checklist',







                    status: checklistComplete ? 'pass' : 'warn',







                    message: checklistComplete







                        ? 'verification.md checklist is complete'







                        : 'verification.md still has unchecked items',







                },







            ],







        };







    }







    maxUpdatedAt(values) {







        const timestamps = values.filter((value) => Boolean(value));







        if (timestamps.length === 0) {







            return null;







        }







        timestamps.sort();







        return timestamps[timestamps.length - 1] ?? null;







    }







    async getLatestUpdatedAt(filePaths) {







        const timestamps = await Promise.all(filePaths.map(async (filePath) => (await this.fileService.exists(filePath)







            ? (await this.fileService.stat(filePath)).mtime.toISOString()







            : null)));







        return this.maxUpdatedAt(timestamps);







    }







    shouldRebuildIndex(indexUpdatedAt, latestSourceUpdatedAt, allSkills) {







        if (!indexUpdatedAt) {







            return true;







        }







        if (allSkills.some(skill => !skill.exists)) {







            return true;







        }







        if (!latestSourceUpdatedAt) {







            return false;







        }







        return new Date(latestSourceUpdatedAt).getTime() > new Date(indexUpdatedAt).getTime();







    }







    getIndexRebuildReasons(indexPath, indexUpdatedAt, latestSourceUpdatedAt, allSkills) {







        const reasons = [];







        if (!indexUpdatedAt) {







            reasons.push(indexPath);







        }







        const missingSkillFiles = allSkills.filter(skill => !skill.exists).map(skill => skill.path);







        reasons.push(...missingSkillFiles);







        if (indexUpdatedAt &&







            latestSourceUpdatedAt &&







            new Date(latestSourceUpdatedAt).getTime() > new Date(indexUpdatedAt).getTime()) {







            reasons.push(`source:newer:${latestSourceUpdatedAt}`);







        }







        return Array.from(new Set(reasons));







    }







    buildUpgradeSuggestions(checks, initialized) {







        const suggestions = [];







        const missingChecks = checks.filter(check => !check.exists);







        const missingCore = missingChecks.filter(check => check.required);







        const missingKnowledge = missingChecks.filter(check => !check.required);







        if (missingCore.length > 0) {







            suggestions.push({







                code: initialized ? 'repair_core_structure' : 'initialize_core_structure',







                title: initialized ? 'Repair core OSpec structure' : 'Initialize OSpec core structure',







                description: initialized







                    ? 'Restore required OSpec directories and config before continuing with project knowledge or execution.'







                    : 'Create the minimum OSpec runtime structure first: .skillrc, changes/, and .ospec/.',







                paths: missingCore.map(item => item.path),







            });







        }







        const missingSkillFiles = missingKnowledge.filter(check => check.key.endsWith(constants_1.FILE_NAMES.SKILL_MD));







        if (missingSkillFiles.length > 0) {







            suggestions.push({







                code: 'complete_skill_hierarchy',







                title: 'Restore protocol skill entrypoints',







                description: 'Add the missing root SKILL entrypoint so agents can discover the protocol shell and project guidance.',







                paths: missingSkillFiles.map(item => item.path),







            });







        }







        const missingDocs = missingKnowledge.filter(check => check.path.includes(`${path_1.default.sep}${constants_1.DIR_NAMES.DOCS}${path_1.default.sep}`));







        if (missingDocs.length > 0) {







            suggestions.push({







                code: 'complete_project_docs',







                title: 'Complete project knowledge docs',







                description: 'Fill missing project-level docs so changes and AI skills can reference stable architecture and planning context.',







                paths: missingDocs.map(item => item.path),







            });







        }







        const missingIndexAssets = missingKnowledge.filter(check => check.key === constants_1.FILE_NAMES.SKILL_INDEX ||







            check.key === constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT);







        if (missingIndexAssets.length > 0) {







            suggestions.push({







                code: 'restore_skill_index',







                title: 'Restore skill index assets',







                description: 'Add the skill index file and rebuild script so skill discovery can stay current.',







                paths: missingIndexAssets.map(item => item.path),







            });







        }







        const missingAiGuides = missingKnowledge.filter(check => check.path.includes(`${path_1.default.sep}${constants_1.DIR_NAMES.FOR_AI}${path_1.default.sep}`));







        if (missingAiGuides.length > 0) {







            suggestions.push({







                code: 'restore_ai_guides',







                title: 'Restore AI guidance docs',







                description: 'Add the AI guide and execution protocol files so Codex and other agents can follow the project workflow consistently.',







                paths: missingAiGuides.map(item => item.path),







            });







        }







        if (suggestions.length === 0 && initialized) {







            suggestions.push({







                code: 'project_ready',







                title: 'Project structure is ready',







                description: 'The OSpec core structure and recommended knowledge files are present. You can continue with active changes.',







                paths: [],







            });







        }







        return suggestions;







    }







    filterKnowledgeDocsByAffects(docs, affectSlugs) {







        const filteredDocs = docs.filter(item => item.name.toLowerCase() !== 'readme.md');







        if (affectSlugs.length === 0) {







            return filteredDocs;







        }







        const matched = filteredDocs.filter(item => {







            const nameSlug = this.toSlug(item.name);







            return affectSlugs.some(slug => nameSlug.includes(slug));







        });







        return matched.length > 0 ? matched : filteredDocs;







    }







    toRelativePath(rootDir, filePath) {







        return path_1.default.relative(rootDir, filePath).replace(/\\/g, '/');







    }







    toSlug(value) {







        return value







            .toLowerCase()







            .replace(/\.md$/i, '')







            .replace(/[^a-z0-9]+/g, '-')







            .replace(/^-+|-+$/g, '');







    }







    async scanDocsInDirectory(rootDir, docSection) {







        const targetDir = path_1.default.join(rootDir, constants_1.DIR_NAMES.DOCS, docSection);







        if (!(await this.fileService.exists(targetDir))) {







            return [];







        }







        const entries = await fs_extra_1.default.readdir(targetDir, { withFileTypes: true });







        const files = entries







            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))







            .sort((left, right) => left.name.localeCompare(right.name));







        return Promise.all(files.map(async (file) => {







            const filePath = path_1.default.join(targetDir, file.name);







            const stats = await this.fileService.stat(filePath);







            return {







                name: file.name,







                path: filePath,







                exists: true,







                updatedAt: stats.mtime.toISOString(),







            };







        }));







    }







}







exports.ProjectService = ProjectService;







const createProjectService = (fileService, configManager, templateEngine, indexBuilder, skillParser, projectAssetService, projectScaffoldService, projectScaffoldCommandService) => new ProjectService(fileService, configManager, templateEngine, indexBuilder, skillParser, projectAssetService, projectScaffoldService, projectScaffoldCommandService);







exports.createProjectService = createProjectService;







//# sourceMappingURL=ProjectService.js.map
