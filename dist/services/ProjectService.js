"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectService = exports.ProjectService = void 0;
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const errors_1 = require("../core/errors");
const ProjectPresets_1 = require("../presets/ProjectPresets");
const ArchiveGate_1 = require("../workflow/ArchiveGate");
const ConfigurableWorkflow_1 = require("../workflow/ConfigurableWorkflow");
const WorkflowComposer_1 = require("../workflow/WorkflowComposer");
const FeatureCatalog_1 = require("./FeatureCatalog");
const DocsObligationService_1 = require("./DocsObligationService");
const FeatureCaptureService_1 = require("./FeatureCaptureService");
const SkillParser_1 = require("./SkillParser");
const FeatureCatalogPort_1 = require("./FeatureCatalogPort");
const FeatureTraceability_1 = require("./FeatureTraceability");
const DocsObligationPort_1 = require("./DocsObligationPort");
const helpers_1 = require("../utils/helpers");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const ReviewArtifacts_1 = require("../utils/ReviewArtifacts");
const TaskGraphExecutionService_1 = require("./TaskGraphExecutionService");
const ClassicChangeCloseoutService_1 = require("./ClassicChangeCloseoutService");
const LegacyPluginMigrationService_1 = require("./LegacyPluginMigrationService");
const ChecklistScan_1 = require("../utils/ChecklistScan");
const MarkdownLinks_1 = require("../utils/MarkdownLinks");
const ContractVersion_1 = require("../utils/ContractVersion");
const AGENT_WORKER_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const TASK_GRAPH_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'IN_PROGRESS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const AGENT_WORKER_STATUS_FIELDS = [
    'implementer_status',
    'spec_reviewer_status',
    'quality_reviewer_status',
    'controller_status',
];
const AGENT_WORKER_TERMINAL_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
];
const TASK_GRAPH_TERMINAL_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
];
const AGENT_WORKER_ALLOWED_STATUS_SET = new Set(AGENT_WORKER_ALLOWED_STATUSES);
const AGENT_WORKER_TERMINAL_STATUS_SET = new Set(AGENT_WORKER_TERMINAL_STATUSES);
const TASK_GRAPH_ALLOWED_STATUS_SET = new Set(TASK_GRAPH_ALLOWED_STATUSES);
const TASK_GRAPH_TERMINAL_STATUS_SET = new Set(TASK_GRAPH_TERMINAL_STATUSES);
const REVIEW_ARTIFACT_ALLOWED_DECISIONS = [
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
    'NEEDS_CHANGES',
    'BLOCKED',
    'PENDING',
];
const REVIEW_ARTIFACT_TERMINAL_DECISIONS = [
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
];
const REVIEW_ARTIFACT_ALLOWED_DECISION_SET = new Set(REVIEW_ARTIFACT_ALLOWED_DECISIONS);
const REVIEW_ARTIFACT_TERMINAL_DECISION_SET = new Set(REVIEW_ARTIFACT_TERMINAL_DECISIONS);
class ProjectService {
    constructor(fileService, configManager, templateEngine, indexBuilder, skillParser, projectAssetService, projectScaffoldService, projectScaffoldCommandService) {
        this.fileService = fileService;
        this.legacyPluginMigrationService = new LegacyPluginMigrationService_1.LegacyPluginMigrationService(fileService);
        this.configManager = configManager;
        this.templateEngine = templateEngine;
        this.indexBuilder = indexBuilder;
        this.skillParser = skillParser;
        this.projectAssetService = projectAssetService;
        this.projectScaffoldService = projectScaffoldService;
        this.projectScaffoldCommandService = projectScaffoldCommandService;
    }
    getProjectLayout(config) {
        return (0, ProjectLayout_1.getProjectLayout)(config);
    }
    getManagedRootDir(rootDir, config) {
        return (0, ProjectLayout_1.getProjectManagedRoot)(rootDir, config);
    }
    resolveManagedPath(rootDir, relativePath, config) {
        return (0, ProjectLayout_1.resolveManagedPath)(rootDir, relativePath, config);
    }
    toProjectRelativePath(rootDir, relativePath, config) {
        return (0, ProjectLayout_1.toManagedRelativePath)(relativePath, config);
    }
    async initializeProject(rootDir, mode, input) {
        const config = await this.configManager.createDefaultConfig(mode);
        await this.configManager.saveConfig(rootDir, config);
        await Promise.all(this.getDirectorySkeleton(rootDir, config).map(dirPath => this.fileService.ensureDir(dirPath)));
        const normalized = await this.normalizeProjectBootstrap(rootDir, mode, input);
        config.documentLanguage = normalized.documentLanguage;
        await this.configManager.saveConfig(rootDir, config);
        await this.writeProjectKnowledgeLayer(rootDir, mode, normalized, config);
        const scaffoldResult = await this.applyProjectScaffoldPhase(rootDir, normalized);
        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage, this.getProjectLayout(config));
        await this.projectAssetService.syncDirectCopyAssets(rootDir, normalized.documentLanguage, {
            targetRelativePaths: [constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT],
            projectLayout: this.getProjectLayout(config),
        });
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
            ospecCliVersion: config.ospecCliVersion,
            projectLayout: this.getProjectLayout(config),
            templateGeneratedPaths: [
                ...this.getFullBootstrapTemplateGeneratedPaths(normalized),
                ...(await this.getExistingOptionalKnowledgeGeneratedPaths(rootDir, config)),
            ],
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
        await Promise.all(this.getKnowledgeLayerDirectorySkeleton(rootDir, config).map(dirPath => this.fileService.ensureDir(dirPath)));
        const normalized = await this.normalizeProjectBootstrap(rootDir, config.mode, input);
        await this.syncConfigDocumentLanguage(rootDir, config, normalized.documentLanguage);
        const writeSummary = await this.writeProjectKnowledgeLayer(rootDir, config.mode, normalized, config);
        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage, this.getProjectLayout(config));
        await this.projectAssetService.syncDirectCopyAssets(rootDir, normalized.documentLanguage, {
            targetRelativePaths: [constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT],
            projectLayout: this.getProjectLayout(config),
        });
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
            ospecCliVersion: config.ospecCliVersion,
            projectLayout: this.getProjectLayout(config),
            templateGeneratedPaths: [
                ...this.getFullBootstrapTemplateGeneratedPaths(normalized),
                ...(await this.getExistingOptionalKnowledgeGeneratedPaths(rootDir, config)),
            ],
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
            'for-ai/change-protocol.md',
            'for-ai/execution-protocol.md',
            'for-ai/naming-conventions.md',
            'for-ai/skill-conventions.md',
            'for-ai/development-guide.md',
            'for-ai/workflow-conventions.md',
        ];
        const directCopyResult = await this.projectAssetService.syncDirectCopyAssets(rootDir, normalized.documentLanguage, {
            targetRelativePaths: guidancePaths,
            projectLayout: this.getProjectLayout(config),
        });
        const createdFiles = [...directCopyResult.created];
        const refreshedFiles = [...directCopyResult.refreshed];
        const skippedFiles = [...directCopyResult.skipped];
        const verifiedFiles = [
            ...directCopyResult.created,
            ...directCopyResult.refreshed,
            ...directCopyResult.skipped,
        ];
        if (configLanguageUpdated) {
            refreshedFiles.push(constants_1.FILE_NAMES.SKILLRC);
            verifiedFiles.push(constants_1.FILE_NAMES.SKILLRC);
        }
        /*
         * A project initialized before OSpec 2.0 still carries `## Plugin
         * Gates` in its own generated root SKILL.md -- an instruction to block
         * on a Stitch approval no surviving command can produce. The root
         * SKILL.md of a real project is not a protocol shell, so the refresh
         * below skips it and the section survives forever.
         *
         * It is repaired here rather than in UpdateCommand so that every entry
         * point into this sync (`ospec update`, `ospec docs sync-protocol`,
         * `ospec docs generate`, `ospec layout migrate`) fixes it, and so the
         * index rebuild at the end of this method re-routes agents away from
         * the removed heading in the same run.
         */
        const pluginGuidanceMigration = await this.legacyPluginMigrationService
            .migrateProjectSkillGuidance(rootDir, config);
        for (const relativePath of pluginGuidanceMigration.rewrittenPaths) {
            refreshedFiles.push(relativePath);
            verifiedFiles.push(relativePath);
        }
        const rootSkillPath = this.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_MD, config);
        const renderedRootSkill = this.renderProtocolShellRootSkill(normalized.projectName, normalized.documentLanguage, config.mode);
        const rootSkillRelativePath = this.toProjectRelativePath(rootDir, constants_1.FILE_NAMES.SKILL_MD, config);
        if (!(await this.fileService.exists(rootSkillPath))) {
            await this.fileService.writeFile(rootSkillPath, renderedRootSkill);
            createdFiles.push(rootSkillRelativePath);
            verifiedFiles.push(rootSkillRelativePath);
        }
        else if (await this.isProtocolShellRootSkill(rootSkillPath)) {
            const existingRootSkill = await this.fileService.readFile(rootSkillPath);
            if (existingRootSkill === renderedRootSkill) {
                skippedFiles.push(rootSkillRelativePath);
                verifiedFiles.push(rootSkillRelativePath);
            }
            else {
                await this.fileService.writeFile(rootSkillPath, renderedRootSkill);
                refreshedFiles.push(rootSkillRelativePath);
                verifiedFiles.push(rootSkillRelativePath);
            }
        }
        else if (!refreshedFiles.includes(rootSkillRelativePath)) {
            skippedFiles.push(rootSkillRelativePath);
        }
        try {
            const indexWrite = await this.indexBuilder.writeWithSummary(rootDir);
            verifiedFiles.push(...indexWrite.managedPaths);
        }
        catch {
        }
        const assetPlan = this.getBootstrapAssetPlan(normalized.documentLanguage, normalized, { projectLayout: 'nested' });
        await this.projectAssetService.writeAssetManifest(rootDir, {
            documentLanguage: normalized.documentLanguage,
            ospecCliVersion: config.ospecCliVersion,
            projectLayout: this.getProjectLayout(config),
            templateGeneratedPaths: [
                ...assetPlan.templateGeneratedFiles,
                ...(await this.getExistingOptionalKnowledgeGeneratedPaths(rootDir, config)),
            ],
            runtimeGeneratedPaths: assetPlan.runtimeGeneratedFiles,
        });
        return {
            projectName: normalized.projectName,
            mode: config.mode,
            documentLanguage: normalized.documentLanguage,
            createdFiles,
            refreshedFiles,
            skippedFiles,
            verifiedFiles: Array.from(new Set(verifiedFiles)),
            pluginGuidanceRemovals: pluginGuidanceMigration.removals,
        };
    }
    async initializeProtocolShellProject(rootDir, mode, input) {
        const config = await this.configManager.createDefaultConfig(mode);
        await this.configManager.saveConfig(rootDir, config);
        await Promise.all(this.getProtocolShellDirectorySkeleton(rootDir, config).map(dirPath => this.fileService.ensureDir(dirPath)));
        const normalized = await this.normalizeProjectBootstrap(rootDir, mode, input);
        config.documentLanguage = normalized.documentLanguage;
        await this.configManager.saveConfig(rootDir, config);
        await this.writeIfMissing(this.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_MD, config), this.renderProtocolShellRootSkill(normalized.projectName, normalized.documentLanguage, mode));
        const directCopyResult = await this.projectAssetService.installDirectCopyAssets(rootDir, normalized.documentLanguage, this.getProjectLayout(config));
        const hookResult = await this.projectAssetService.installGitHooks(rootDir, config.hooks);
        try {
            await this.indexBuilder.write(rootDir);
        }
        catch {
            await this.indexBuilder.createEmpty(rootDir);
        }
        await this.projectAssetService.writeAssetManifest(rootDir, {
            documentLanguage: normalized.documentLanguage,
            ospecCliVersion: config.ospecCliVersion,
            projectLayout: this.getProjectLayout(config),
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const checks = await Promise.all(this.getStructureDefinitions().map(async (definition) => ({
            key: definition.key,
            path: this.resolveManagedPath(rootDir, definition.pathSegments.join('/'), config),
            exists: await this.fileService.exists(this.resolveManagedPath(rootDir, definition.pathSegments.join('/'), config)),
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
        const config = structure.initialized && (await this.fileService.exists(configPath))
            ? await this.configManager.loadConfig(rootDir)
            : null;
        const mode = config
            ? config.mode
            : null;
        const createdAt = (await this.fileService.exists(configPath))
            ? (await this.fileService.stat(configPath)).mtime.toISOString()
            : null;
        /*
         * S4: this used to run the whole `getExecutionStatus` deep analysis on
         * an initialized project -- every active change parsed, its task graph
         * validated, its verification freshness recomputed -- to read one
         * number off the end of it. `totalActiveChanges` is a directory count,
         * and the uninitialised branch below already computed it that way, so
         * the two branches disagreed about cost by an order of magnitude while
         * agreeing about the answer. There is now one cheap path.
         */
        const activeChangeCount = await this.countActiveChangeDirectories(rootDir, config);
        return {
            name: path_1.default.basename(path_1.default.resolve(rootDir)),
            path: rootDir,
            mode,
            initialized: structure.initialized,
            structureLevel: structure.level,
            createdAt,
            activeChangeCount,
            docsRootExists: await this.fileService.exists(this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.DOCS, config)),
            forAiExists: await this.fileService.exists(this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.FOR_AI, config)),
            skillIndexExists: await this.fileService.exists(this.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config)),
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const modules = new Map();
        const moduleDirectoryCandidates = [
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.KNOWLEDGE}/${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.MODULES}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.MODULES}`, config),
        ];
        for (const modulesDir of moduleDirectoryCandidates) {
            if (!(await this.fileService.exists(modulesDir))) {
                continue;
            }
            const entries = await fs_1.promises.readdir(modulesDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || modules.has(entry.name)) {
                    continue;
                }
                const skillPath = path_1.default.join(modulesDir, entry.name, constants_1.FILE_NAMES.SKILL_MD);
                modules.set(entry.name, {
                    name: entry.name,
                    path: path_1.default.join(modulesDir, entry.name),
                    skillPath,
                    skillExists: (0, fs_1.existsSync)(skillPath),
                });
            }
        }
        return Array.from(modules.values()).sort((left, right) => left.name.localeCompare(right.name));
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const skillIndexPath = this.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
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
        const knowledgeIndexSourcePaths = await this.collectKnowledgeIndexSourcePaths(rootDir, config);
        latestSourceUpdatedAt = await this.getLatestUpdatedAt([
            ...existingSkillPaths,
            ...knowledgeIndexSourcePaths,
        ]);
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
        const config = await this.configManager.loadConfig(rootDir);
        const featuresDir = this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config);
        if (!(await this.fileService.exists(featuresDir))) {
            return {
                damagedChanges: [],
                totalActiveChanges: 0,
                totals: {
                    pass: 0,
                    warn: 0,
                    fail: 0,
                },
                changes: [],
            };
        }
        const workflow = new WorkflowComposer_1.WorkflowComposer(config);
        const entries = await fs_1.promises.readdir(featuresDir, { withFileTypes: true });
        const activeChanges = [];
        const damagedChanges = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const featureDir = path_1.default.join(featuresDir, entry.name);
            /*
             * M-race1: one change with a half-written `state.json` used to
             * abort this loop, so `ospec status` reported nothing at all for a
             * project whose other changes were perfectly readable -- the blast
             * radius was widest exactly when the user most needed the listing
             * to find the damage. The damaged change is skipped, but NOT
             * silently: it is named in `damagedChanges`, so the report says
             * "this one is unreadable" and not "this one is not here".
             */
            let change;
            try {
                change = await this.buildActiveChangeStatusItem(rootDir, featureDir, workflow);
            }
            catch (error) {
                if (!(error instanceof errors_1.DamagedChangeStateError))
                    throw error;
                damagedChanges.push({ name: error.changeName, reason: String(error.details?.reason || error.message) });
                continue;
            }
            if (change) {
                activeChanges.push(change);
            }
        }
        return {
            damagedChanges: damagedChanges.slice().sort((left, right) => left.name.localeCompare(right.name)),
            totalActiveChanges: activeChanges.length,
            totals: activeChanges.reduce((result, change) => {
                result[change.summaryStatus] += 1;
                return result;
            }, { pass: 0, warn: 0, fail: 0 }),
            changes: activeChanges.sort((left, right) => left.name.localeCompare(right.name)),
        };
    }
    /**
     * Guards against silent evidence loss through Git: when the change's
     * documents are tracked but its artifacts directory is caught by a
     * .gitignore rule (a global "artifacts/" pattern is a common footgun),
     * every review, verification, and loop artifact would vanish from any
     * clone or merge while the archive looks complete on this disk. Blocks
     * only that inconsistent state; wholly-untracked changes (deliberate
     * local-only projects) and non-Git directories pass.
     */
    assessArchiveEvidenceTracking(featureDir) {
        try {
            const artifactsDir = path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS);
            if (!(0, fs_1.existsSync)(artifactsDir))
                return { level: 'ok', message: null };
            const git = (args) => (0, child_process_1.spawnSync)('git', args, {
                cwd: featureDir,
                encoding: 'utf8',
                windowsHide: true,
            });
            const repoCheck = git(['rev-parse', '--is-inside-work-tree']);
            if (repoCheck.error || repoCheck.status !== 0)
                return { level: 'ok', message: null };
            const ignore = git(['check-ignore', '-v', '--', artifactsDir]);
            if (ignore.error || ignore.status !== 0)
                return { level: 'ok', message: null };
            const rule = ignore.stdout.trim().split(/\r?\n/)[0]?.split('\t')[0]?.trim() || 'a .gitignore rule';
            const tracked = git(['ls-files', '--', featureDir]);
            const hasTrackedDocuments = !tracked.error && tracked.status === 0 && tracked.stdout.trim().length > 0;
            if (!hasTrackedDocuments)
                return { level: 'ok', message: null };
            return {
                level: 'block',
                message: `Archive evidence would be silently lost in Git: this change's documents are tracked, but its artifacts directory is gitignored (${rule}). Fix .gitignore (for example add "!.ospec/**" after the ignoring rule) so reviews, verification evidence, and the task graph survive clones and merges, or force-archive with an explicit accepted-risk reason.`,
            };
        }
        catch {
            return { level: 'ok', message: null };
        }
    }
    async getActiveChangeStatusItem(featurePath) {
        const resolvedFeaturePath = path_1.default.resolve(featurePath);
        const rootDir = await this.findProjectRootFromPath(resolvedFeaturePath);
        const config = await this.configManager.loadConfig(rootDir);
        const workflow = new WorkflowComposer_1.WorkflowComposer(config);
        const item = await this.buildActiveChangeStatusItem(rootDir, resolvedFeaturePath, workflow);
        if (!item) {
            throw new Error('Change state file not found.');
        }
        return item;
    }
    /**
     * S4: the cheap `totalActiveChanges`.
     *
     * Deliberately matches what `getActiveChangeStatusReport` counts rather
     * than what the old uninitialised branch counted: that report keeps only
     * directories `buildActiveChangeStatusItem` could build, and it returns
     * `null` for a directory with no `state.json`. Counting every directory
     * would have been cheaper still and would have quietly changed the number
     * `ospec status` prints for any project with a stray directory under
     * `changes/active`.
     */
    async countActiveChangeDirectories(rootDir, config) {
        const resolvedConfig = config !== undefined
            ? config
            : await this.configManager.loadConfigOrNull(rootDir);
        const activeDir = this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, resolvedConfig);
        const entries = await fs_1.promises.readdir(activeDir, { withFileTypes: true }).catch(() => null);
        if (!entries) {
            return 0;
        }
        const present = await Promise.all(entries
            .filter(entry => entry.isDirectory())
            .map(entry => this.fileService.exists(path_1.default.join(activeDir, entry.name, constants_1.FILE_NAMES.STATE))));
        return present.filter(Boolean).length;
    }
    async listActiveChangeNames(rootDir) {
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const activeDir = this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config);
        if (!(await this.fileService.exists(activeDir))) {
            return [];
        }
        const entries = await fs_1.promises.readdir(activeDir, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((left, right) => left.localeCompare(right));
    }
    /*
     * M-race2: finalize is a read-assess-write against a file other processes
     * write, so it retries once on a detected conflict and then fails loudly.
     *
     * One retry, not a loop: a second conflict means something is actively
     * writing `state.json` -- a Loop tick, a worker syncing, another finalize
     * -- and retrying into a live writer would either spin or eventually win a
     * race it should not be trying to win. The error names the change and says
     * what to do, because the safe action (wait, then re-run) is one a person
     * can take and a retry loop cannot.
     *
     * The retry re-runs the WHOLE attempt, including `getActiveChangeStatusItem`
     * and the archive-readiness gates. Re-deriving only the payload would
     * archive a change against a readiness verdict computed from state that has
     * since changed, which is the same class of bug one layer down.
     */
    async finalizeChange(featurePath, options = {}) {
        for (let attempt = 1;; attempt += 1) {
            try {
                return await this.finalizeChangeAttempt(featurePath, options);
            }
            catch (error) {
                if (attempt > 1 || !(error instanceof errors_1.ConcurrentChangeStateError))
                    throw error;
            }
        }
    }
    async finalizeChangeAttempt(featurePath, options = {}) {
        const resolvedFeaturePath = path_1.default.resolve(featurePath);
        const projectRoot = await this.findProjectRootFromPath(resolvedFeaturePath);
        const projectConfig = await this.configManager.loadConfig(projectRoot);
        const expectedParent = this.resolveManagedPath(projectRoot, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, projectConfig);
        if (path_1.default.dirname(resolvedFeaturePath) !== expectedParent) {
            throw new Error('Finalize target must be a change directory under changes/active.');
        }
        const forceArchive = options.forceArchive === true;
        if (!forceArchive && (options.confirmForceArchive !== undefined || options.reason !== undefined)) {
            throw new Error('Force-archive confirmation and reason require --force-archive.');
        }
        const progressStatePath = path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.STATE);
        /*
         * M-race2: the compare-and-swap anchor, and it has to be HERE rather
         * than next to the later `state.json` read further down.
         *
         * The archived payload is `item.closeoutState`, and `item` comes from
         * the `getActiveChangeStatusItem` call below -- which reads `state.json`
         * for itself. Anchoring the comparison at the second read would have
         * left the whole readiness assessment outside the guarded window and
         * compared bytes that no longer decide anything, which is the
         * "measures nothing" failure rather than a fix.
         *
         * The plan called for a `revision` comparison. There is no `revision`:
         * `FeatureState` carries `version` (a schema constant) and
         * `last_updated` (an ISO string a writer may reasonably leave alone).
         * Introducing a counter would mean auditing every writer to bump it,
         * including ones this track does not own, and one that forgot would
         * make the CAS silently vacuous. Comparing the whole file is free,
         * needs no migration of existing `state.json` files, and cannot be
         * defeated by a writer that does not know about it.
         */
        const observedStateText = await this.fileService.readFile(progressStatePath);
        const progressState = JSON.parse(observedStateText.replace(/^﻿/, ''));
        const featureName = typeof progressState?.feature === 'string' && progressState.feature.trim()
            ? progressState.feature.trim()
            : path_1.default.basename(resolvedFeaturePath);
        const forceReason = typeof options.reason === 'string' ? options.reason.trim() : '';
        if (forceArchive) {
            if (options.confirmForceArchive === undefined) {
                throw new Error(`Force archive requires --confirm-force-archive ${featureName}.`);
            }
            if (options.confirmForceArchive !== featureName) {
                throw new Error(`Force archive confirmation must exactly match change name "${featureName}".`);
            }
            if (!forceReason) {
                throw new Error('Force archive requires a non-empty --reason or --reason-file.');
            }
            await this.assertForceArchiveHasNoPendingLoopAction(resolvedFeaturePath);
        }
        const progressIssues = [];
        const evidenceTracking = this.assessArchiveEvidenceTracking(resolvedFeaturePath);
        if (evidenceTracking.level === 'block') {
            if (!forceArchive) {
                throw new Error(evidenceTracking.message || 'Archive evidence is gitignored; fix .gitignore before finalizing.');
            }
            if (evidenceTracking.message)
                progressIssues.push(evidenceTracking.message);
        }
        const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(resolvedFeaturePath, progressState);
        if (workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE) {
            try {
                const progressProjection = await new TaskGraphExecutionService_1.TaskGraphExecutionService(this.fileService)
                    .reconcileGoalProgress(resolvedFeaturePath);
                if (progressProjection.status === 'blocked') {
                    progressIssues.push(...progressProjection.issues);
                    if (!forceArchive) {
                        throw new Error(`Change progress cannot be reconciled before finalize: ${progressProjection.issues.join('; ')}`);
                    }
                }
            }
            catch (error) {
                if (!forceArchive)
                    throw error;
                progressIssues.push(`Goal progress reconciliation failed: ${error?.message || error}`);
            }
        }
        const item = await this.getActiveChangeStatusItem(resolvedFeaturePath);
        const blockingChecks = item.checks.filter(check => check.status === 'fail');
        if (!forceArchive && blockingChecks.length > 0) {
            throw new Error(`Change ${item.name} is not ready to finalize. Failing checks: ${blockingChecks.map(check => check.name).join(', ')}`);
        }
        if (!forceArchive && !item.archiveReady) {
            throw new Error(`Change ${item.name} is not ready to archive yet.`);
        }
        const statePath = path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.STATE);
        const proposalPath = path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.PROPOSAL);
        /*
         * M-race2: `statePath` and `progressStatePath` are the same file, and
         * this used to re-read it. Under the compare-and-swap a second read is
         * worse than redundant: if it disagreed with `observedStateText` the
         * archive would be built from bytes the guard is not watching, and if
         * it agreed the read bought nothing. One read, one guarded value.
         */
        const persistedFeatureState = progressState;
        const featureState = forceArchive ? persistedFeatureState : item.closeoutState || persistedFeatureState;
        // proposal.md frontmatter is the authority for affects; classic changes
        // never sync it into state.json during the fast flow, so archive-time
        // sync keeps the frozen state.json consistent with the proposal and
        // removes the temptation to hand-edit archived metadata afterwards.
        let archiveAffects = Array.isArray(featureState.affects) ? featureState.affects : [];
        try {
            const proposalDoc = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
            const proposalAffects = Array.isArray(proposalDoc.data?.affects)
                ? proposalDoc.data.affects.map((item) => String(item).trim()).filter(Boolean)
                : [];
            if (proposalAffects.length > 0)
                archiveAffects = proposalAffects;
        }
        catch {
            // A malformed or missing proposal is already reported by archive readiness.
        }
        if (forceArchive && item.archiveReady && blockingChecks.length === 0 && progressIssues.length === 0) {
            throw new Error(`Change ${item.name} is already ready to finalize; use ordinary ospec finalize without --force-archive.`);
        }
        const config = await this.configManager.loadConfig(projectRoot);
        const archivedRoot = this.resolveManagedPath(projectRoot, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config);
        await this.fileService.ensureDir(archivedRoot);
        const archivePath = await this.resolveArchivePath(archivedRoot, featureState.feature, config);
        const archivedAt = new Date().toISOString();
        const forceArchiveRecordRelativePath = `${constants_1.DIR_NAMES.ARTIFACTS}/${constants_1.DIR_NAMES.AGENTS}/${constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD}`;
        const forceArchiveRecord = forceArchive ? {
            version: '1.0',
            feature: featureName,
            disposition: 'forced',
            completionStatus: 'incomplete',
            acceptedRisk: true,
            reason: forceReason,
            confirmation: {
                mode: 'explicit-cli-double-confirmation',
                confirmedChange: options.confirmForceArchive,
            },
            requestedAt: archivedAt,
            archivedAt,
            sourcePath: this.toRelativePath(projectRoot, resolvedFeaturePath),
            failingChecks: blockingChecks.map(check => ({ ...check })),
            progressIssues: Array.from(new Set(progressIssues)),
            recordPath: forceArchiveRecordRelativePath,
        } : null;
        const nextState = forceArchive ? {
            ...featureState,
            status: 'archived',
            current_step: 'archived',
            completed: Array.from(new Set([...(featureState.completed || []), 'archived'])).sort((left, right) => left.localeCompare(right)),
            pending: (featureState.pending || []).filter(step => step !== 'archived'),
            affects: archiveAffects,
            archive_disposition: 'forced',
            completion_status: 'incomplete',
            accepted_risk: true,
            force_archive_record: forceArchiveRecordRelativePath,
            archived_at: archivedAt,
        } : {
            ...featureState,
            status: 'archived',
            current_step: 'archived',
            completed: Array.from(new Set([...(featureState.completed || []), 'archived'])).sort((left, right) => left.localeCompare(right)),
            pending: (featureState.pending || []).filter(step => step !== 'archived'),
            affects: archiveAffects,
            blocked_by: [],
        };
        // 7.7: contract 6.2 has the index read `features` and `doc_updates` off
        // the archived state.json, so they have to be resolved before the state
        // is committed and before the rebuild that reads it. The change has
        // finished editing its feature documents by now, so the index's
        // `feature_docs` map is the right place to resolve slugs to sections.
        // Both awaits sit BEFORE the compare-and-swap below, which is exactly
        // the window that check exists to police.
        const declaredFeatureSlugs = await this.readDeclaredFeatureSlugs(resolvedFeaturePath);
        if (declaredFeatureSlugs.length > 0) {
            nextState.features = declaredFeatureSlugs;
            const docUpdates = await this.computeDocUpdates(projectRoot, declaredFeatureSlugs);
            if (docUpdates.length > 0)
                nextState.doc_updates = docUpdates;
        }
        // 7.6/7.7: verify track B's documentation obligations BEFORE the move,
        // because refusing after it would leave a half-archived change. In warn
        // mode -- the default for this release cycle -- an unsatisfied required
        // obligation is reported and archiving continues.
        const obligations = await this.verifyDocsObligations(projectRoot, resolvedFeaturePath);
        for (const warning of obligations.warnings)
            console.warn(`[ospec] warning: ${warning}`);
        for (const item of obligations.advisory)
            console.warn(`[ospec] docs obligation (optional): ${item}`);
        if (obligations.blocking.length > 0) {
            if (obligations.mode === 'strict') {
                throw new Error(`Archive refused: ${obligations.blocking.length} required documentation obligation(s) are unsatisfied.\n`
                    + obligations.blocking.map(item => `  - ${item}`).join('\n')
                    + '\n  Set docs_contract.mode to "warn" in .skillrc to downgrade this to a warning.');
            }
            for (const item of obligations.blocking) {
                console.warn(`[ospec] docs obligation UNSATISFIED: ${item}`);
            }
            console.warn('[ospec] archiving anyway: docs_contract.mode is "warn". Set it to "strict" to block.');
        }
        await this.preflightArchiveWrite(projectRoot, archivePath);
        const originalProposal = await this.fileService.exists(proposalPath)
            ? await this.fileService.readFile(proposalPath)
            : null;
        const originalForceRecordPath = path_1.default.join(resolvedFeaturePath, ...forceArchiveRecordRelativePath.split('/'));
        const originalForceRecord = await this.fileService.exists(originalForceRecordPath)
            ? await this.fileService.readFile(originalForceRecordPath)
            : null;
        /*
         * M-race2: the compare half of the compare-and-swap, immediately
         * before the only irreversible step.
         *
         * Everything between the read above and this line is derivation --
         * loading config, resolving the archive path, reading the proposal,
         * the knowledge-write preflight -- and each of those awaits is a window
         * in which a Loop tick or a worker's `execute sync` can write
         * `state.json`. `nextState` is a full replacement built by spreading
         * the state as it was BEFORE that window, so committing it would
         * silently revert the concurrent write: the change is archived with a
         * `completed` list missing whatever landed while finalize was thinking.
         *
         * The check goes here rather than after the move because the move is
         * what makes the operation unrecoverable. Refusing before it leaves the
         * change exactly where it was, and `finalizeChange` retries once from
         * the top -- re-running the readiness assessment too, because a state
         * that changed invalidates the verdict as much as the payload.
         */
        const stateTextAtCommit = await this.fileService.readFile(statePath).catch(() => null);
        if (stateTextAtCommit !== observedStateText) {
            throw new errors_1.ConcurrentChangeStateError(featureName, stateTextAtCommit === null
                ? 'state.json disappeared while finalize was preparing the archive'
                : 'state.json was rewritten by another process while finalize was preparing the archive');
        }
        let moved = false;
        let linksRebased = false;
        try {
            await this.fileService.move(resolvedFeaturePath, archivePath);
            moved = true;
            await this.fileService.writeJSON(path_1.default.join(archivePath, constants_1.FILE_NAMES.STATE), nextState);
            if (forceArchiveRecord) {
                await this.fileService.writeJSON(path_1.default.join(archivePath, ...forceArchiveRecordRelativePath.split('/')), forceArchiveRecord);
            }
            const archivedProposalPath = path_1.default.join(archivePath, constants_1.FILE_NAMES.PROPOSAL);
            if (await this.fileService.exists(archivedProposalPath)) {
                const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(archivedProposalPath));
                proposal.data.status = 'archived';
                if (forceArchive) {
                    proposal.data.archive_disposition = 'forced';
                    proposal.data.completion_status = 'incomplete';
                    proposal.data.accepted_risk = true;
                    proposal.data.force_archive_record = forceArchiveRecordRelativePath;
                }
                await this.fileService.writeFile(archivedProposalPath, (0, helpers_1.stringifyFrontmatter)(proposal.content, proposal.data));
            }
            await this.rebaseMovedChangeMarkdownLinks(resolvedFeaturePath, archivePath);
            linksRebased = true;
            await this.rebuildIndex(projectRoot);
            await this.assertArchivedChangeIndexed(projectRoot, archivePath, forceArchive ? { disposition: 'forced' } : undefined);
            // Deliberately AFTER the assertion, and deliberately not inside the
            // try/catch's failure contract: by this point the change is
            // archived and verified. Writing the catalogue row and the
            // traceability comment can only add convenience, so it warns and
            // returns rather than throwing into the rollback below. See
            // `recordArchiveTraceability`.
            for (const warning of await this.recordArchiveTraceability(projectRoot, archivePath)) {
                console.warn(`[ospec] warning: ${warning}`);
            }
            await this.archiveLinkedBrainstorms(projectRoot, featureState.feature, archivePath);
        }
        catch (error) {
            if (!moved)
                throw error;
            const rollbackErrors = [];
            try {
                if (await this.fileService.exists(archivePath)) {
                    await this.fileService.move(archivePath, resolvedFeaturePath);
                }
            }
            catch (rollbackError) {
                rollbackErrors.push(`move: ${rollbackError?.message || rollbackError}`);
            }
            if (await this.fileService.exists(resolvedFeaturePath)) {
                if (linksRebased) {
                    await this.rebaseMovedChangeMarkdownLinks(archivePath, resolvedFeaturePath)
                        .catch((rollbackError) => rollbackErrors.push(`links: ${rollbackError?.message || rollbackError}`));
                }
                await this.fileService.writeJSON(path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.STATE), persistedFeatureState)
                    .catch((rollbackError) => rollbackErrors.push(`state: ${rollbackError?.message || rollbackError}`));
                if (originalProposal !== null) {
                    await this.fileService.writeFile(path_1.default.join(resolvedFeaturePath, constants_1.FILE_NAMES.PROPOSAL), originalProposal)
                        .catch((rollbackError) => rollbackErrors.push(`proposal: ${rollbackError?.message || rollbackError}`));
                }
                const restoredForceRecordPath = path_1.default.join(resolvedFeaturePath, ...forceArchiveRecordRelativePath.split('/'));
                if (originalForceRecord !== null) {
                    await this.fileService.writeFile(restoredForceRecordPath, originalForceRecord)
                        .catch((rollbackError) => rollbackErrors.push(`force-record: ${rollbackError?.message || rollbackError}`));
                }
                else {
                    await this.fileService.remove(restoredForceRecordPath)
                        .catch((rollbackError) => rollbackErrors.push(`force-record: ${rollbackError?.message || rollbackError}`));
                }
            }
            await this.rebuildIndex(projectRoot)
                .catch((rollbackError) => rollbackErrors.push(`index: ${rollbackError?.message || rollbackError}`));
            if (rollbackErrors.length > 0) {
                throw new Error(`Finalize failed (${error?.message || error}); rollback also failed: ${rollbackErrors.join('; ')}`);
            }
            throw error;
        }
        return {
            archivePath: this.toRelativePath(projectRoot, archivePath),
            change: item,
        };
    }
    /**
     * Move brainstorms linked to a change into that change's archive folder so the archived change
     * is self-contained and `.ospec/brainstorms/` does not accumulate orphans. A brainstorm is
     * linked when its `changeName` equals the feature, or (when it has no `changeName`) when its
     * directory id equals the feature. Unlinked exploration brainstorms are left in place.
     */
    async archiveLinkedBrainstorms(projectRoot, feature, archivePath) {
        const brainstormsDir = path_1.default.join(projectRoot, '.ospec', 'brainstorms');
        if (!feature || !(await this.fileService.exists(brainstormsDir))) {
            return [];
        }
        const entries = await this.fileService.readDir(brainstormsDir);
        const moved = [];
        try {
            for (const name of entries) {
                const sourceDir = path_1.default.join(brainstormsDir, name);
                const jsonPath = path_1.default.join(sourceDir, 'brainstorm.json');
                if (!(await this.fileService.exists(jsonPath))) {
                    continue;
                }
                let linked = false;
                try {
                    const data = await this.fileService.readJSON(jsonPath);
                    const changeName = typeof data?.changeName === 'string' ? data.changeName.trim() : '';
                    // Explicit link wins; otherwise match the brainstorm directory id to the feature,
                    // including a hyphen-bounded prefix relationship (e.g. feature "iot-latest-data"
                    // and brainstorm id "iot-latest-data-keyname", or vice versa).
                    linked = changeName === feature
                        || name === feature
                        || (changeName.length === 0 && (name.startsWith(`${feature}-`) || feature.startsWith(`${name}-`)));
                }
                catch {
                    linked = false;
                }
                if (!linked) {
                    continue;
                }
                const destDir = path_1.default.join(archivePath, 'artifacts', 'brainstorm', name);
                await this.fileService.ensureDir(path_1.default.dirname(destDir));
                await this.fileService.move(sourceDir, destDir);
                moved.push(name);
            }
        }
        catch (error) {
            for (const name of [...moved].reverse()) {
                const archivedDir = path_1.default.join(archivePath, 'artifacts', 'brainstorm', name);
                const sourceDir = path_1.default.join(brainstormsDir, name);
                if (await this.fileService.exists(archivedDir)) {
                    await this.fileService.move(archivedDir, sourceDir).catch(() => undefined);
                }
            }
            throw error;
        }
        return moved;
    }
    async rebaseMovedChangeMarkdownLinks(previousChangePath, nextChangePath) {
        const previousRoot = path_1.default.resolve(previousChangePath);
        const nextRoot = path_1.default.resolve(nextChangePath);
        const markdownFiles = [
            constants_1.FILE_NAMES.PROPOSAL,
            constants_1.FILE_NAMES.DESIGN,
            constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
            constants_1.FILE_NAMES.TASKS,
            path_1.default.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW),
            path_1.default.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.CODE_QUALITY_REVIEW),
            path_1.default.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
            constants_1.FILE_NAMES.VERIFICATION,
            constants_1.FILE_NAMES.REVIEW,
        ];
        const changed = new Map();
        try {
            for (const fileName of markdownFiles) {
                const nextFilePath = path_1.default.join(nextRoot, fileName);
                if (!(await this.fileService.exists(nextFilePath))) {
                    continue;
                }
                const previousFilePath = path_1.default.join(previousRoot, fileName);
                const originalContent = await this.fileService.readFile(nextFilePath);
                const previousDir = path_1.default.dirname(previousFilePath);
                const nextDir = path_1.default.dirname(nextFilePath);
                // M-misc1: was `/\[([^\]]+)\]\(([^)]+)\)/g`. See
                // `utils/MarkdownLinks` for what that pattern did to a
                // destination containing parentheses, and to an example link
                // inside a fenced block.
                const rewrittenContent = (0, MarkdownLinks_1.rewriteMarkdownLinks)(originalContent, rawHref => {
                    const href = String(rawHref || '').trim();
                    if (!this.isRelativeMarkdownHref(href)) {
                        return null;
                    }
                    const previousTargetPath = path_1.default.resolve(previousDir, href);
                    if (this.isPathWithin(previousTargetPath, previousRoot)) {
                        return null;
                    }
                    return path_1.default.relative(nextDir, previousTargetPath).replace(/\\/g, '/') || '.';
                });
                if (rewrittenContent !== originalContent) {
                    changed.set(nextFilePath, originalContent);
                    await this.fileService.writeFile(nextFilePath, rewrittenContent);
                }
            }
        }
        catch (error) {
            for (const [filePath, originalContent] of changed) {
                await this.fileService.writeFile(filePath, originalContent).catch(() => undefined);
            }
            throw error;
        }
    }
    isRelativeMarkdownHref(href) {
        return Boolean(href) &&
            !href.startsWith('#') &&
            !href.startsWith('//') &&
            !/^[a-z][a-z0-9+.-]*:/i.test(href);
    }
    isPathWithin(targetPath, parentPath) {
        const relativePath = path_1.default.relative(parentPath, targetPath);
        return relativePath === '' || (!relativePath.startsWith('..') && !path_1.default.isAbsolute(relativePath));
    }
    async getFeatureProjectContext(rootDir, affects = []) {
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const affectSlugs = affects
            .map(item => this.toSlug(item))
            .filter(Boolean);
        const projectDocs = (await Promise.all([
            ['项目概览', this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`, config)],
            ['技术栈', this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`, config)],
            ['架构说明', this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`, config)],
            ['模块地图', this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`, config)],
            ['API 总览', this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`, config)],
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const docsRoot = this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}`, config);
        const readMarkdown = async (filePath) => {
            if (!(await this.fileService.exists(filePath))) {
                return '';
            }
            try {
                const parsed = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(filePath));
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
            readMarkdown(this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.FOR_AI}/ai-guide.md`, config)),
            readMarkdown(this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.FOR_AI}/execution-protocol.md`, config)),
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
        // FIX-G1: same rule as `loadConfigOrNull`. "No project here" means
        // "no configured language", but a DAMAGED config must not resolve to
        // `undefined` -- that is how an unreadable `documentLanguage` rewrote
        // every archived knowledge document on a zh-CN / ja-JP / ar project
        // into the en-US fallback.
        const config = await this.configManager.loadConfigOrNull(rootDir);
        return this.normalizeDocumentLanguage(config?.documentLanguage);
    }
    async syncConfigDocumentLanguage(rootDir, config, documentLanguage) {
        const normalized = this.normalizeDocumentLanguage(documentLanguage);
        const configured = this.normalizeDocumentLanguage(config?.documentLanguage);
        if (!normalized || configured) {
            return false;
        }
        config.documentLanguage = normalized;
        await this.configManager.saveConfig(rootDir, config);
        return true;
    }
    inferDocumentLanguageFromBootstrapInput(input) {
        if (!input || this.normalizeDocumentLanguage(input.documentLanguage)) {
            return undefined;
        }
        const descriptiveTexts = [
            input.summary,
            input.architecture,
            ...(Array.isArray(input.apiAreas) ? input.apiAreas : []),
            ...(Array.isArray(input.designDocs) ? input.designDocs : []),
            ...(Array.isArray(input.planningDocs) ? input.planningDocs : []),
            input.projectName,
        ];
        const descriptiveLanguage = this.detectDocumentLanguageFromTexts(descriptiveTexts);
        if (descriptiveLanguage && descriptiveLanguage !== 'en-US') {
            return descriptiveLanguage;
        }
        const localizedStructuralTexts = [
            ...(Array.isArray(input.techStack) ? input.techStack : []),
            ...(Array.isArray(input.modules) ? input.modules : []),
        ].filter(item => {
            const detected = this.detectDocumentLanguageFromText(item);
            return detected && detected !== 'en-US';
        });
        return this.detectDocumentLanguageFromTexts(localizedStructuralTexts);
    }
    detectDocumentLanguageFromTexts(contents) {
        const detectionCounts = new Map();
        const firstSeenOrder = new Map();
        for (const [index, content] of contents.entries()) {
            const detected = this.detectDocumentLanguageFromText(content);
            if (detected) {
                detectionCounts.set(detected, (detectionCounts.get(detected) || 0) + 1);
                if (!firstSeenOrder.has(detected)) {
                    firstSeenOrder.set(detected, index);
                }
            }
        }
        if (detectionCounts.size === 0) {
            return undefined;
        }
        return Array.from(detectionCounts.entries())
            .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }
            return (firstSeenOrder.get(left[0]) ?? Number.MAX_SAFE_INTEGER) -
                (firstSeenOrder.get(right[0]) ?? Number.MAX_SAFE_INTEGER);
        })[0][0];
    }
    detectDocumentLanguageFromText(content) {
        if (typeof content !== 'string' || content.trim().length === 0) {
            return undefined;
        }
        if (/[\u0600-\u06FF]/.test(content)) {
            return 'ar';
        }
        if (this.hasJapaneseKana(content)) {
            return 'ja-JP';
        }
        if (this.hasCjkIdeographs(content)) {
            return this.isLikelyJapaneseKanjiContent(content) ? 'ja-JP' : 'zh-CN';
        }
        if (/[A-Za-z]/.test(content)) {
            return 'en-US';
        }
        return undefined;
    }
    hasJapaneseKana(content) {
        return /[\u3040-\u30FF]/.test(content);
    }
    hasCjkIdeographs(content) {
        return /[\u3400-\u9FFF]/.test(content);
    }
    isLikelyJapaneseKanjiContent(content) {
        if (!this.hasCjkIdeographs(content)) {
            return false;
        }
        return /[\u3005\u3006\u300C-\u300F\u30F5\u30F6]/.test(content);
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
            const entries = await fs_1.promises.readdir(directoryPath, { withFileTypes: true });
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
        const assetPlan = this.getBootstrapAssetPlan(normalized.documentLanguage, normalized, { projectLayout: 'nested' });
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
            moduleSkillFiles: [],
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
                `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.AI_GUIDE}`,
                `${constants_1.DIR_NAMES.FOR_AI}/${constants_1.FILE_NAMES.EXECUTION_PROTOCOL}`,
                '.ospec/asset-sources.json',
                ...this.projectAssetService.getDirectCopyTargetPaths(),
                ...(scaffoldPlan?.files || []).map(file => file.path),
                ...normalized.moduleApiPlans.map(plan => plan.path),
                ...normalized.apiAreaPlans.map(plan => plan.path),
                ...normalized.designDocPlans.map(plan => plan.path),
                ...normalized.planningDocPlans.map(plan => plan.path),
            ],
        };
    }
    async rebuildIndex(rootDir) {
        // FIX-G1: the config is read and validated BEFORE anything is written.
        //
        // This method used to read it through `loadConfig(rootDir).catch(() =>
        // null)` and hand `getProjectLayout(null) === 'classic'` straight to
        // `installDirectCopyAssets`, so on a nested project with a damaged
        // `.skillrc` seven `for-ai/*` protocol documents landed in the CLASSIC
        // root and only *then* did `indexBuilder.write` reach the F29 guard and
        // exit 1. The guard was correct; it was simply not on this path. The
        // damaged file is one fact, so both entry points now have to see it at
        // the same point -- before the first byte is written, not after seven
        // files are.
        //
        // `getBootstrapUpgradePlan` reads the config too (it resolves the docs
        // root to read the language from), so it is deliberately ordered AFTER
        // this line rather than before it.
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const documentLanguage = (await this.getBootstrapUpgradePlan(rootDir)).documentLanguage || 'en-US';
        await this.projectAssetService.installDirectCopyAssets(rootDir, documentLanguage, this.getProjectLayout(config));
        await this.projectAssetService.syncDirectCopyAssets(rootDir, documentLanguage, {
            targetRelativePaths: [constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT],
            projectLayout: this.getProjectLayout(config),
        });
        await this.indexBuilder.write(rootDir);
        return this.getIndexStatus(rootDir);
    }
    async assertForceArchiveHasNoPendingLoopAction(changePath) {
        const loopStatePath = path_1.default.join(changePath, constants_1.DIR_NAMES.ARTIFACTS, 'loop', constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(loopStatePath)))
            return;
        const loopState = await this.fileService.readJSON(loopStatePath);
        const pending = loopState?.pendingControllerAction;
        if (!pending)
            return;
        const itemStates = Array.isArray(pending.itemStates) ? pending.itemStates : [];
        const activeItems = itemStates
            .filter((item) => ['issued', 'running', 'awaiting-evidence'].includes(String(item?.status || '')))
            .map((item) => String(item?.actionItemId || '(unknown)'));
        const allItemsTerminal = itemStates.length > 0
            && itemStates.every((item) => ['completed', 'failed', 'expired'].includes(String(item?.status || '')));
        if ((pending.status === 'done' || allItemsTerminal) && activeItems.length === 0)
            return;
        const actionId = String(pending.actionId || '(unknown)');
        const itemText = activeItems.length > 0
            ? ` Active items: ${activeItems.join(', ')}.`
            : ' Item states are missing or nonterminal.';
        throw new Error(`Force archive refused while Loop action ${actionId} can still write evidence.${itemText} Settle or recover its executors first.`);
    }
    /**
     * 7.7 renamed this from `preflightArchivedKnowledgeWrite` and deleted its
     * knowledge-document half along with the generator.
     *
     * What remains is the part that was never about knowledge documents: prove
     * the archive target is inside the managed tree, and prove every directory
     * finalize is about to write to is actually writable, BEFORE the
     * irreversible move. Discovering a read-only `docs/project` after the
     * change directory has already been moved is how a half-archived change
     * happens.
     */
    async preflightArchiveWrite(projectRoot, archivePath) {
        const config = await this.configManager.loadConfig(projectRoot);
        const archivedRoot = this.resolveManagedPath(projectRoot, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config);
        const archiveRelative = path_1.default.relative(archivedRoot, path_1.default.resolve(archivePath));
        if (!archiveRelative || archiveRelative === '..' || archiveRelative.startsWith(`..${path_1.default.sep}`) || path_1.default.isAbsolute(archiveRelative)) {
            throw new Error('Archive preflight failed: archive target is outside the managed archive directory.');
        }
        const probeDirectories = Array.from(new Set([
            path_1.default.dirname(archivePath),
            path_1.default.dirname(this.resolveManagedPath(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config)),
            path_1.default.dirname(this.resolveManagedPath(projectRoot, FeatureCatalog_1.FEATURE_CATALOG_RELATIVE_PATH, config)),
        ]));
        const probes = [];
        try {
            for (const [index, directory] of probeDirectories.entries()) {
                await this.fileService.ensureDir(directory);
                const probe = path_1.default.join(directory, `.ospec-write-probe-${process.pid}-${Date.now()}-${index}`);
                await fs_1.promises.writeFile(probe, '', { encoding: 'utf8', flag: 'wx' });
                probes.push(probe);
            }
        }
        catch (error) {
            throw new Error(`Archive preflight failed: ${error?.message || error}`);
        }
        finally {
            await Promise.all(probes.map(probe => fs_1.promises.unlink(probe).catch(() => undefined)));
        }
    }
    /**
     * 7.7 rewrote this from `assertArchivedKnowledgeIndexed`.
     *
     * The old assertion guaranteed a generated knowledge document existed and
     * was linked. That document is gone, so keeping the old shape would mean
     * asserting nothing -- and this repository has shipped enough checks that
     * pass while checking nothing that replacing one with a tautology is the
     * specific failure to avoid here. The guarantee is restated against what
     * now carries the information:
     *
     *   1. the archived_changes entry exists -- the durable record, and what
     *      `ospec changes show` and `ospec index query` both read;
     *   2. the archive is linked from feature-index.md, so a reader with only
     *      the docs tree can still reach the evidence;
     *   3. forced archives are still visibly forced: in the entry, in the
     *      preserved force record, and in the generated index;
     *   4. every feature slug this change declared has a catalogue row -- but
     *      ONLY when a catalogue exists. A project that has not migrated has no
     *      catalogue, and refusing to archive over that would make 7.7
     *      unshippable for exactly the projects 7.9 exists to migrate.
     */
    async assertArchivedChangeIndexed(projectRoot, archivePath, expectations = {}) {
        const config = await this.configManager.loadConfig(projectRoot);
        const indexPath = this.resolveManagedPath(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const featureCatalogPath = this.resolveManagedPath(projectRoot, FeatureCatalog_1.FEATURE_CATALOG_RELATIVE_PATH, config);
        const featureIndexPath = this.resolveManagedPath(projectRoot, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/feature-index.md`, config);
        const normalizedArchive = path_1.default.relative(projectRoot, path_1.default.resolve(archivePath)).replace(/\\/g, '/');
        if (!(await this.fileService.exists(indexPath))) {
            throw new Error(`Archive verification failed: ${constants_1.FILE_NAMES.SKILL_INDEX} was not generated.`);
        }
        const index = await this.fileService.readJSON(indexPath);
        const archivedChange = (Array.isArray(index?.archived_changes) ? index.archived_changes : [])
            .find((item) => item?.archive === normalizedArchive);
        if (!archivedChange) {
            throw new Error(`Archive verification failed: ${normalizedArchive} is missing from archived_changes.`);
        }
        if (expectations.disposition === 'forced') {
            if (archivedChange.disposition !== 'forced'
                || archivedChange.completion_status !== 'incomplete'
                || archivedChange.accepted_risk !== true) {
                throw new Error('Archive verification failed: forced archive metadata is missing from archived_changes.');
            }
            const forceRecordPath = path_1.default.join(archivePath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD);
            if (!(await this.fileService.exists(forceRecordPath))) {
                throw new Error(`Archive verification failed: ${constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD} was not preserved.`);
            }
        }
        // 7.7 does not assert anything about docs/project/changes/ here, and
        // that is deliberate. The obvious check -- "no document under that
        // directory may be in the documents map" -- is WRONG: 7.2 excludes
        // generated documents by their `generated: true` frontmatter, not by
        // path, and now that nothing generates into that directory a human is
        // free to keep a file there. A path-prefix check refuses to archive
        // over someone else's document, which is the same class of
        // fires-on-the-wrong-thing bug this phase exists to stop shipping.
        //
        // The real guarantees are asserted where they can be asserted
        // honestly: "archiving writes no file under docs/project/changes/" on
        // disk in the archive tests, and the generated-document exclusion in
        // tests/tools/p7-index-builder-divergence.test.mjs.
        // feature-index.md is checked ONLY while it is still a live generated
        // document. Track A's 7.4 stops generating it and freezes the existing
        // one into pure link lines latched by `historical: true` in its
        // frontmatter; a project that never had one never gets one. Requiring
        // it, or requiring it to name a NEW archive, would refuse to archive on
        // every post-7.4 project -- a defect that exists only after the merge,
        // which is the shape this effort keeps finding at integration.
        //
        // So: absent is fine, frozen is fine, and a live one must still be
        // correct. The archive's real reachability guarantee is the index entry
        // above and the catalogue row below.
        if (await this.fileService.exists(featureIndexPath)) {
            const featureIndexRaw = await this.fileService.readFile(featureIndexPath);
            let frozen = false;
            try {
                frozen = (0, helpers_1.parseFrontmatterDocument)(featureIndexRaw).data?.historical === true;
            }
            catch {
                frozen = false;
            }
            if (!frozen) {
                if (!featureIndexRaw.includes(normalizedArchive)) {
                    throw new Error(`Archive verification failed: feature-index.md does not link ${normalizedArchive}.`);
                }
                if (expectations.disposition === 'forced' && !featureIndexRaw.includes('FORCED / INCOMPLETE / ACCEPTED RISK')) {
                    throw new Error('Archive verification failed: feature-index.md does not visibly mark the forced incomplete archive.');
                }
            }
        }
        // 7.4 re-pointed the routing half of this assertion. It used to require
        // that feature-index.md linked the knowledge document, but
        // feature-index.md is no longer generated -- it is frozen once into a
        // historical link list -- so that check would now pass or fail on a
        // stale file. The catalogue replaces it, and the catalogue is keyed by
        // FEATURE SLUG rather than by change, so what can be asserted is:
        // every feature slug this change recorded has a row pointing at this
        // archive.
        //
        // Track A required the catalogue to EXIST. Track C required only a row
        // when one exists. C's rule is the one that survives the merge: a
        // project that has not run 7.9's migration has no catalogue, and
        // refusing to archive over that would make 7.7 unshippable for exactly
        // the projects 7.9 exists to migrate. `readCatalogRows` returning null
        // means "no catalogue", which is not a failure; a catalogue that EXISTS
        // and is missing a row for a declared slug is a real gap and does fail.
        //
        // What is NOT asserted, and why: "the row points at THIS archive".
        // Track A wrote that check and it was correct on track A, where it
        // never once ran -- 7.5 was not on that branch, so no change recorded
        // a feature slug and `declaredSlugs` was always empty. A said so at the
        // site: "an assertion that cannot hold yet is an assertion that gets
        // deleted rather than fixed". The merge woke it up, and awake it is
        // unsatisfiable by construction: the catalogue row is pointed at the
        // archive by `recordArchiveTraceability`, which ArchiveCommand runs on
        // the LINE AFTER this assertion, deliberately, because by then the
        // change is already moved and a failure there could only half-archive
        // it. Asserting here that the next line has already run fails every
        // real archive -- the end-to-end fixture failed on exactly this.
        //
        // So the row's ARCHIVE POINTER is a warning from
        // `recordArchiveTraceability`, and the row's EXISTENCE is the gate.
        //
        // A change that recorded no feature slugs asserts nothing here. That is
        // weaker than the old link check, and deliberately so: a change may
        // legitimately touch no feature.
        //
        // Forced-archive VISIBILITY moved with it. feature-index.md carried the
        // "FORCED / INCOMPLETE / ACCEPTED RISK" banner; the catalogue has no
        // per-change row to carry one. The guarantee now rests on the checks
        // above -- the archived_changes entry's disposition/completion_status/
        // accepted_risk and the preserved force record -- both of which are
        // asserted for a forced archive.
        const declaredSlugs = Array.isArray(archivedChange.features)
            ? archivedChange.features.map((slug) => String(slug || '').trim()).filter(Boolean)
            : [];
        if (declaredSlugs.length > 0) {
            const rows = await (0, FeatureCatalogPort_1.readCatalogRows)(featureCatalogPath);
            if (rows) {
                const missing = declaredSlugs.filter((slug) => !rows.has(slug)).sort();
                if (missing.length > 0) {
                    throw new Error(`Archive verification failed: the feature catalogue has no row for ${missing.join(', ')}. Run "ospec index build" to regenerate it.`);
                }
            }
        }
    }
    /**
     * The feature slugs a change declares, from the two sources contract 6.2
     * names: the proposal's frontmatter `features:` (written by 7.5) and
     * `state.json.features`. Invalid entries are DROPPED rather than thrown on,
     * exactly as `readFeatureSlugList` does for the index -- an archive is
     * immutable history and a slug written before the naming rule existed must
     * not be able to wedge archiving forever.
     */
    async readDeclaredFeatureSlugs(changeDir) {
        const slugs = [];
        try {
            const statePath = path_1.default.join(changeDir, constants_1.FILE_NAMES.STATE);
            if (await this.fileService.exists(statePath)) {
                const state = await this.fileService.readJSON(statePath);
                slugs.push(...(0, SkillParser_1.readFeatureSlugList)(state?.features));
            }
        }
        catch {
            // A state file we cannot read contributes no slugs, not a failure.
        }
        try {
            const proposalPath = path_1.default.join(changeDir, constants_1.FILE_NAMES.PROPOSAL);
            if (await this.fileService.exists(proposalPath)) {
                const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
                slugs.push(...(0, SkillParser_1.readFeatureSlugList)(proposal.data?.features));
            }
        }
        catch {
            // Likewise for an unparseable proposal.
        }
        return (0, SkillParser_1.readFeatureSlugList)(slugs);
    }
    /**
     * Resolve feature slugs to the `path#section` targets contract 6.2 stores in
     * `state.json.doc_updates`. Reads the index that exists NOW, before the
     * archive's rebuild: `feature_docs` describes the human documents, which the
     * change has already finished editing.
     */
    async computeDocUpdates(projectRoot, slugs) {
        if (slugs.length === 0)
            return [];
        try {
            const config = await this.configManager.loadConfig(projectRoot);
            const indexPath = this.resolveManagedPath(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config);
            if (!(await this.fileService.exists(indexPath)))
                return [];
            const index = await this.fileService.readJSON(indexPath);
            const featureDocs = index?.feature_docs || {};
            const updates = [];
            for (const slug of slugs) {
                const entry = featureDocs[slug];
                const file = String(entry?.file || '').trim();
                const heading = String(entry?.heading || '').trim();
                if (file && heading)
                    updates.push(`${file}#${heading}`);
            }
            return (0, SkillParser_1.readDocUpdateList)(updates);
        }
        catch {
            return [];
        }
    }
    /**
     * The archive-time write into the docs: update the catalogue rows for every
     * feature this change touched, then write the traceability comment into
     * each of those feature sections.
     *
     * NEVER THROWS, and that is a deliberate design decision rather than
     * defensive habit. By the time this runs the change has already been moved
     * into `changes/archived/` and the index already records it -- the work is
     * archived. A read-only docs tree, a feature document someone is mid-edit
     * on, or a catalogue that has not been generated yet are all reasons to
     * tell the user something was skipped, and none of them are reasons to fail
     * an operation that has already succeeded. Returns the warnings for the
     * caller to print.
     */
    /**
     * The archive gate's half of track B's 7.6: VERIFY the obligations B
     * recorded. This never produces them and never recomputes whether one is
     * satisfied -- it reads `state.json.docs_obligations` (the one location B
     * writes for both workflows) and asks B's evaluator, because a second
     * inference path is how warn mode and strict mode drift apart.
     *
     * Returns the messages; `warn` is the default for this release cycle per
     * the plan, so the caller prints them. Only `docs_contract.mode: strict`
     * turns an unsatisfied REQUIRED obligation into a refusal, and that is the
     * caller's decision, not this method's.
     */
    async verifyDocsObligations(projectRoot, changeDir) {
        let mode = 'warn';
        try {
            const config = await this.configManager.loadConfig(projectRoot);
            if (config?.docs_contract?.mode === 'strict')
                mode = 'strict';
        }
        catch {
            // An unreadable config leaves the safe default in place.
        }
        // `projectRoot` is threaded through because B's evaluator hashes each
        // obligation's target relative to it. Before the merge nothing resolved
        // and it never mattered; now it decides whether the gate reads the real
        // document or a path that does not exist inside the change directory.
        const evaluation = await (0, DocsObligationPort_1.evaluateArchiveDocsObligations)(changeDir, mode, projectRoot);
        return {
            mode: evaluation.mode,
            blocking: (0, DocsObligationPort_1.describeUnsatisfied)(evaluation, evaluation.blocking),
            advisory: (0, DocsObligationPort_1.describeUnsatisfied)(evaluation, evaluation.advisory),
            warnings: evaluation.warnings,
        };
    }
    async recordArchiveTraceability(projectRoot, archivePath) {
        const warnings = [];
        try {
            const config = await this.configManager.loadConfig(projectRoot);
            const indexPath = this.resolveManagedPath(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config);
            if (!(await this.fileService.exists(indexPath)))
                return warnings;
            const index = await this.fileService.readJSON(indexPath);
            const normalizedArchive = path_1.default.relative(projectRoot, path_1.default.resolve(archivePath)).replace(/\\/g, '/');
            const entry = (Array.isArray(index?.archived_changes) ? index.archived_changes : [])
                .find((item) => item?.archive === normalizedArchive);
            const slugs = (0, SkillParser_1.readFeatureSlugList)(entry?.features);
            if (slugs.length === 0)
                return warnings;
            const archiveName = path_1.default.basename(archivePath);
            // Track A owns the catalogue row format; this calls its primitive
            // rather than reimplementing it. Until 7.4 registers a writer the
            // port reports unavailable, which is the correct state for a
            // project that has no catalogue.
            const catalog = await (0, FeatureCatalogPort_1.updateCatalogRows)(projectRoot, { slugs, archiveName });
            warnings.push(...catalog.warnings);
            if (catalog.available && catalog.missing.length > 0) {
                warnings.push(`the feature catalogue has no row for ${catalog.missing.sort().join(', ')}; run "ospec index build" to regenerate it.`);
            }
            const traceability = await (0, FeatureTraceability_1.writeTraceabilityComments)(projectRoot, index?.feature_docs, slugs, archiveName);
            warnings.push(...traceability.warnings);
        }
        catch (error) {
            warnings.push(`could not record archive traceability: ${error?.message || error}`);
        }
        return warnings;
    }
    getDirectorySkeleton(rootDir, config = null) {
        return [
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config),
            path_1.default.join(rootDir, '.ospec'),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}`, config),
            this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.FOR_AI, config),
        ];
    }
    getProtocolShellDirectorySkeleton(rootDir, config = null) {
        return [
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config),
            path_1.default.join(rootDir, '.ospec'),
            this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.FOR_AI, config),
            this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.DOCS, config),
        ];
    }
    getKnowledgeLayerDirectorySkeleton(rootDir, config = null) {
        return [
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}`, config),
            this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}`, config),
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        let filePath = this.resolveManagedPath(rootDir, definition.pathSegments.join('/'), config);
        let exists = await this.fileService.exists(filePath);
        if (!exists && definition.key === constants_1.FILE_NAMES.BUILD_INDEX_SCRIPT) {
            const legacyBuildIndexScriptPaths = [
                path_1.default.join(rootDir, 'build-index-auto.cjs'),
                path_1.default.join(rootDir, 'build-index-auto.js'),
            ];
            for (const legacyBuildIndexScriptPath of legacyBuildIndexScriptPaths) {
                if (await this.fileService.exists(legacyBuildIndexScriptPath)) {
                    filePath = legacyBuildIndexScriptPath;
                    exists = true;
                    break;
                }
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
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const filePath = this.resolveManagedPath(rootDir, definition.pathSegments.join('/'), config);
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
        if (!this.normalizeDocumentLanguage(mergedInput.documentLanguage)) {
            const inferredInputDocumentLanguage = this.inferDocumentLanguageFromBootstrapInput(input);
            if (inferredInputDocumentLanguage) {
                mergedInput.documentLanguage = inferredInputDocumentLanguage;
            }
        }
        const inferredDefaults = {
            modules: await this.inferBootstrapModules(rootDir),
        };
        const presetDefaults = this.getPresetDefaults(mergedInput);
        return this.templateEngine.normalizeProjectBootstrapInput(mergedInput, projectName, mode, inferredDefaults, presetDefaults);
    }
    async writeProjectKnowledgeLayer(rootDir, mode, normalized, config = null) {
        const result = {
            created: [],
            refreshed: [],
            skipped: [],
        };
        const projectName = normalized.projectName;
        await this.writeGeneratedFile(rootDir, path_1.default.join(rootDir, constants_1.FILE_NAMES.README), this.templateEngine.generateProjectReadmeTemplate(projectName, mode, normalized), result);
        const defaultLayout = this.getProjectLayout(config || { projectLayout: 'nested' });
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_MD, defaultLayout), this.templateEngine.generateRootSkillTemplate(projectName, mode, normalized), result, { overwriteProtocolShellRootSkill: true });
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.FILE_NAMES.SKILL_MD}`, defaultLayout), this.templateEngine.generateDocsSkillTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`, defaultLayout), this.templateEngine.generateProjectOverviewTemplate(projectName, mode, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`, defaultLayout), this.templateEngine.generateTechStackTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`, defaultLayout), this.templateEngine.generateArchitectureTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`, defaultLayout), this.templateEngine.generateModuleMapTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`, defaultLayout), this.templateEngine.generateApiOverviewTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}/README.md`, defaultLayout), this.templateEngine.generateDesignDocsTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}/README.md`, defaultLayout), this.templateEngine.generatePlanningDocsTemplate(projectName, normalized), result);
        await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/README.md`, defaultLayout), this.templateEngine.generateApiDocsTemplate(projectName, normalized), result);
        for (const moduleApiPlan of normalized.moduleApiPlans) {
            const moduleSlug = moduleApiPlan.name.replace(/^module-/, '');
            const modulePlan = normalized.modulePlans.find(plan => plan.name === moduleSlug);
            await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, moduleApiPlan.path, defaultLayout), this.templateEngine.generateModuleApiDocTemplate(projectName, modulePlan?.displayName ?? moduleSlug, normalized, moduleSlug), result);
        }
        for (const apiAreaPlan of normalized.apiAreaPlans) {
            await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, apiAreaPlan.path, defaultLayout), this.templateEngine.generateApiAreaDocTemplate(projectName, apiAreaPlan.displayName, normalized), result);
        }
        for (const designDocPlan of normalized.designDocPlans) {
            await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, designDocPlan.path, defaultLayout), this.templateEngine.generateDesignDocTemplate(projectName, designDocPlan.displayName, normalized), result);
        }
        for (const planningDocPlan of normalized.planningDocPlans) {
            await this.writeGeneratedFile(rootDir, this.resolveManagedPath(rootDir, planningDocPlan.path, defaultLayout), this.templateEngine.generatePlanningDocTemplate(projectName, planningDocPlan.displayName, normalized), result);
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
            const parsed = (0, helpers_1.parseFrontmatterDocument)(content);
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
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/overview.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/tech-stack.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/architecture.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/module-map.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}/api-overview.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}/README.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}/README.md`,
            `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/README.md`,
            ...normalized.moduleApiPlans.map(plan => plan.path),
            ...normalized.apiAreaPlans.map(plan => plan.path),
            ...normalized.designDocPlans.map(plan => plan.path),
            ...normalized.planningDocPlans.map(plan => plan.path),
        ];
    }
    async getExistingOptionalKnowledgeGeneratedPaths(rootDir, config = null) {
        const paths = new Set();
        const optionalKnowledgePaths = [
            `${constants_1.DIR_NAMES.KNOWLEDGE}/${constants_1.DIR_NAMES.SRC}/${constants_1.FILE_NAMES.SKILL_MD}`,
            `${constants_1.DIR_NAMES.KNOWLEDGE}/${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.CORE}/${constants_1.FILE_NAMES.SKILL_MD}`,
            `${constants_1.DIR_NAMES.KNOWLEDGE}/${constants_1.DIR_NAMES.TESTS}/${constants_1.FILE_NAMES.SKILL_MD}`,
            `${constants_1.DIR_NAMES.SRC}/${constants_1.FILE_NAMES.SKILL_MD}`,
            `${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.CORE}/${constants_1.FILE_NAMES.SKILL_MD}`,
            `${constants_1.DIR_NAMES.TESTS}/${constants_1.FILE_NAMES.SKILL_MD}`,
        ];
        for (const relativePath of optionalKnowledgePaths) {
            const absolutePath = this.resolveManagedPath(rootDir, relativePath, config);
            if (await this.fileService.exists(absolutePath)) {
                paths.add(relativePath);
            }
        }
        const modules = await this.scanModules(rootDir);
        for (const module of modules) {
            const relativePath = this.toRelativePath(rootDir, module.skillPath)
                .replace(/^\.ospec\//, '')
                .replace(/\\/g, '/');
            if (relativePath.startsWith(`${constants_1.DIR_NAMES.KNOWLEDGE}/${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.MODULES}/`) ||
                relativePath.startsWith(`${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.MODULES}/`)) {
                paths.add(relativePath);
            }
        }
        return Array.from(paths).sort((left, right) => left.localeCompare(right));
    }
    getBootstrapAssetPlan(documentLanguage, normalized, config = null) {
        const staticPlan = this.projectAssetService.getAssetPlan(documentLanguage, this.getProjectLayout(config || { projectLayout: 'nested' }));
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

## 入口顺序

1. \`.skillrc\`：布局、文档语言、工作流策略与模型档案。
2. \`.ospec/session-brief.md\`：若已存在则先读；否则运行 \`ospec session [path]\` 创建它。
3. \`ospec index query <关键词...>\`：以索引为路由定位知识，再读目标文件；绝不通读整个 \`SKILL.index.json\`。

## 按需引用

以下文档只在对应场景出现时才打开，不在入口阶段加载：

- [AI 指南](for-ai/ai-guide.md)：任何 OSpec 工作的通用执行规则。
- [Change 协议](for-ai/change-protocol.md)：当前 \`workflow_profile_id: change\` 时。
- [执行协议](for-ai/execution-protocol.md)：goal 控制器层（\`workflow_profile_id: goal\`，或任何 \`ospec execute …\` / \`ospec loop …\` 工作）里 \`ospec-goal\` 技能背后的权威细则；只有当具体场景真的需要该细则时才打开，而不是把它当成进入该层的步骤。
- [命名规范](for-ai/naming-conventions.md)、[技能规范](for-ai/skill-conventions.md)、[工作流规范](for-ai/workflow-conventions.md)、[开发指南](for-ai/development-guide.md)：命名、编写 SKILL、设计工作流或写代码需要项目采用版规范时。

## 说明

- 当前仓库仅包含 OSpec 协议壳。
- 项目文档、源码结构、测试入口与业务 scaffold 需后续通过明确命令或技能生成。
- Active change 位于 \`changes/active/<change>\`。`
            : documentLanguage === 'ja-JP'
                ? `# ${projectName}

> レイヤー: プロトコルシェル

## 現在の状態

- プロジェクト: ${projectName}
- モード: ${mode}
- 状態: OSpec のプロトコルシェルは初期化済み
- プロジェクト知識: まだ生成されていません

## エントリ順序

1. \`.skillrc\`: レイアウト、文書言語、ワークフロー方針、モデルプロファイル。
2. \`.ospec/session-brief.md\` があれば先に読む。なければ \`ospec session [path]\` を実行して作成する。
3. \`ospec index query <キーワード...>\` を索引へのルータとして使い、対象ファイルを読む前に知識の所在を確認する。\`SKILL.index.json\` 全体は決して読まない。

## オンデマンド参照

以下は該当する場面に入ったときだけ開く。エントリ時には読み込まない。

- [AI ガイド](for-ai/ai-guide.md): あらゆる OSpec 作業の一般的な実行ルール。
- [change プロトコル](for-ai/change-protocol.md): 現在が \`workflow_profile_id: change\` のとき。
- [実行プロトコル](for-ai/execution-protocol.md): goal コントローラ層（\`workflow_profile_id: goal\`、または \`ospec execute …\` / \`ospec loop …\` の作業）で \`ospec-goal\` スキルの背後にある正典の詳細。名指しの状況がその詳細を必要とするときだけ開き、この層に入る手順としては読まない。
- [命名規約](for-ai/naming-conventions.md)、[SKILL 規約](for-ai/skill-conventions.md)、[ワークフロー規約](for-ai/workflow-conventions.md)、[開発ガイド](for-ai/development-guide.md): 命名、SKILL 作成、ワークフロー設計、コード記述でプロジェクト採用ルールが必要なとき。

## メモ

- このリポジトリには現在 OSpec のプロトコルシェルのみがあります。
- プロジェクト文書、ソース構造、テスト導線、業務用 scaffold は後で明示的なコマンドまたはスキルで生成してください。
- active change は \`changes/active/<change>\` にあります。`
                : documentLanguage === 'ar'
                    ? `# ${projectName}

> الطبقة: غلاف البروتوكول

## الحالة الحالية

- المشروع: ${projectName}
- النمط: ${mode}
- الحالة: تم تهيئة غلاف بروتوكول OSpec
- معرفة المشروع: لم يتم توليدها بعد

## تسلسل الدخول

1. \`.skillrc\` للتخطيط ولغة الوثائق وسياسة سير العمل وملفات النماذج.
2. اقرأ \`.ospec/session-brief.md\` إذا كان موجوداً؛ وإلا شغّل \`ospec session [path]\` لإنشائه.
3. \`ospec index query <كلمات...>\` كموجّه إلى الفهرس لتحديد موقع المعرفة قبل قراءة الملفات الهدف؛ لا تقرأ \`SKILL.index.json\` كاملاً أبداً.

## مراجع عند الحاجة

لا تفتح ما يلي إلا عند وقوع الحالة المسماة، ولا تحمّله عند الدخول:

- [دليل الذكاء الاصطناعي](for-ai/ai-guide.md): قواعد التنفيذ العامة لأي عمل OSpec.
- [بروتوكول change](for-ai/change-protocol.md): عندما يكون الوضع الحالي \`workflow_profile_id: change\`.
- [بروتوكول التنفيذ](for-ai/execution-protocol.md): المرجع الموثوق خلف مهارة \`ospec-goal\` في طبقة تحكم goal (\`workflow_profile_id: goal\`، أو أي عمل عبر \`ospec execute …\` / \`ospec loop …\`)؛ لا تفتحه إلا عندما تحتاج حالة محددة بالاسم إلى ذلك التفصيل، لا كخطوة من خطوات الدخول إلى الطبقة.
- [اتفاقيات التسمية](for-ai/naming-conventions.md) و[اتفاقيات SKILL](for-ai/skill-conventions.md) و[اتفاقيات سير العمل](for-ai/workflow-conventions.md) و[دليل التطوير](for-ai/development-guide.md): عند الحاجة إلى القواعد المعتمدة للمشروع في التسمية أو تأليف SKILL أو تصميم سير العمل أو كتابة الكود.

## ملاحظات

- يحتوي هذا المستودع حالياً على غلاف بروتوكول OSpec فقط.
- يجب إنشاء وثائق المشروع وبنية المصدر ومسار الاختبارات والـ scaffold الخاص بالأعمال لاحقاً عبر أوامر أو مهارات صريحة.
- توجد التغييرات النشطة تحت \`changes/active/<change>\` .`
                    : `# ${projectName}

> Layer: protocol shell

## Current State

- Project: ${projectName}
- Mode: ${mode}
- Status: OSpec protocol shell initialized
- Project knowledge: not generated yet

## Entry Sequence

1. \`.skillrc\` for layout, document language, workflow policy, and model profiles.
2. \`.ospec/session-brief.md\` if it exists; otherwise run \`ospec session [path]\` to create it.
3. \`ospec index query <keyword...>\` as the router into the index; locate knowledge before reading target files and never read \`SKILL.index.json\` wholesale.

## On-Demand References

Open these only when the named situation applies; never load them at entry time.

- [AI guide](for-ai/ai-guide.md): general execution rules for any OSpec work.
- [Change protocol](for-ai/change-protocol.md): when the active profile is \`workflow_profile_id: change\`.
- [Execution protocol](for-ai/execution-protocol.md): the authoritative detail behind the \`ospec-goal\` skill in the goal controller layer (\`workflow_profile_id: goal\`, or any \`ospec execute …\` / \`ospec loop …\` work); open it only when a named situation needs that detail, never as a step of entering the layer.
- [Naming conventions](for-ai/naming-conventions.md), [Skill conventions](for-ai/skill-conventions.md), [Workflow conventions](for-ai/workflow-conventions.md), [Development guide](for-ai/development-guide.md): when naming, authoring a SKILL, shaping a workflow, or writing code needs the project-adopted convention.

## Notes

- This repository currently contains only the OSpec protocol shell.
- Project docs, source structure, tests, and business scaffold should be generated later through explicit skills or commands.
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
        /*
         * M-i18n1: ja-JP and ar have no translated copy for this document, and
         * the fallback has to be English.
         *
         * This read `=== 'en-US'`, so every language that was not English got
         * the CHINESE string -- a Japanese or Arabic project's bootstrap
         * summary came out in Chinese, which is not a fallback, it is a
         * different wrong answer. `!== 'zh-CN'` makes the Chinese branch the
         * special case it actually is and sends everything else to English.
         *
         * Renamed from `isEnglish` because the flag no longer means "the
         * document language is English"; it means "use the English copy",
         * which for ja-JP and ar is a deliberate fallback rather than a
         * statement about the project. `TemplateBuilderBase.copy(language, zh,
         * en, ja = en, ar = en)` already encodes exactly this default.
         */
        const englishCopy = input.normalized.documentLanguage !== 'zh-CN';
        const title = englishCopy ? 'Bootstrap Summary' : '初始化摘要';
        const commandStatus = this.describeCommandExecutionStatus(input.commandExecution.status, input.normalized.documentLanguage);
        const formatPaths = (items, emptyLabel) => items.length > 0 ? items.map(item => `- \`${item}\``).join('\n') : `- ${emptyLabel}`;
        const formatCommandSteps = () => {
            if (!input.commandPlan || input.commandPlan.steps.length === 0) {
                return englishCopy ? '- No scaffold command plan.' : '- 当前没有脚手架命令计划。';
            }
            return input.commandPlan.steps
                .map(step => `- \`${step.shellCommand}\` (${step.description})`)
                .join('\n');
        };
        const formatSuggestion = () => {
            if (!input.firstChangeSuggestion) {
                return englishCopy ? '- No preset-driven first change suggestion.' : '- 当前没有预设驱动的首个变更建议。';
            }
            return [
                `- ${englishCopy ? 'Suggested change' : '建议变更'}: \`${input.firstChangeSuggestion.name}\``,
                `- ${englishCopy ? 'Affects' : '影响模块'}: ${input.firstChangeSuggestion.affects.join(', ') || '-'}`,
                `- ${englishCopy ? 'Flags' : '标记'}: ${input.firstChangeSuggestion.flags.join(', ') || '-'}`,
            ].join('\n');
        };
        const recoveryLine = input.recoveryFilePath
            ? `- ${englishCopy ? 'Recovery record' : '补救记录'}: \`${this.toRelativePath(rootDir, input.recoveryFilePath)}\``
            : `- ${englishCopy ? 'Recovery record' : '补救记录'}: ${englishCopy ? 'None' : '无'}`;
        return `---







name: bootstrap-summary







title: "${input.normalized.projectName} ${title}"







tags: [project, bootstrap, scaffold]







---















# ${title}















## ${englishCopy ? 'Context' : '上下文'}















- ${englishCopy ? 'Project' : '项目'}: ${input.normalized.projectName}







- ${englishCopy ? 'Mode' : '模式'}: ${input.mode}







- ${englishCopy ? 'Preset' : 'Preset'}: ${input.normalized.projectPresetId || (englishCopy ? 'None' : '无')}







- ${englishCopy ? 'Document language' : '文档语言'}: ${input.normalized.documentLanguage}







- ${englishCopy ? 'Scaffold command execution' : '脚手架命令执行'}: ${commandStatus}















## ${englishCopy ? 'Business Scaffold' : '业务框架脚手架'}















- ${englishCopy ? 'Framework' : '框架方案'}: ${input.scaffoldPlan?.framework || (englishCopy ? 'None' : '无')}







- ${englishCopy ? 'Install command' : '安装命令'}: ${input.scaffoldPlan?.installCommand || (englishCopy ? 'None' : '无')}















### ${englishCopy ? 'Created directories' : '本次创建目录'}















${formatPaths(input.scaffoldCreatedDirectories, englishCopy ? 'No new scaffold directories were created.' : '本次没有新建业务框架目录。')}















### ${englishCopy ? 'Created files' : '本次创建文件'}















${formatPaths(input.scaffoldCreatedFiles, englishCopy ? 'No new scaffold files were created.' : '本次没有新建业务框架文件。')}















### ${englishCopy ? 'Preserved existing scaffold paths' : '已保留的现有框架路径'}















${formatPaths([...input.scaffoldSkippedDirectories, ...input.scaffoldSkippedFiles], englishCopy ? 'No scaffold paths were preserved.' : '当前没有需要保留的现有框架路径。')}















## ${englishCopy ? 'OSpec Knowledge Backfill' : 'OSpec 知识回填'}















### ${englishCopy ? 'Direct-copy assets created' : '直接复制资产'}















${formatPaths(input.directCopyCreatedFiles, englishCopy ? 'No direct-copy assets were created.' : '本次没有新建直接复制资产。')}















### ${englishCopy ? 'Git hooks installed' : 'Git hooks'}















${formatPaths(input.hookInstalledFiles, englishCopy ? 'No hooks were installed.' : '本次没有安装 Git hooks。')}















### ${englishCopy ? 'Runtime-generated files' : '运行期生成文件'}















${formatPaths(input.runtimeGeneratedFiles, englishCopy ? 'No runtime-generated files were recorded.' : '当前没有记录运行期生成文件。')}















## ${englishCopy ? 'Command Plan' : '命令计划'}















${formatCommandSteps()}















- ${englishCopy ? 'Execution result' : '执行结果'}: ${commandStatus}







${recoveryLine}















## ${englishCopy ? 'Default First Change Suggestion' : '默认首个 Change 建议'}















${formatSuggestion()}







`;
    }
    describeCommandExecutionStatus(status, language) {
        // M-i18n1: English is the fallback for ja-JP and ar, not Chinese.
        // See the note in the bootstrap summary builder above.
        const englishCopy = language !== 'zh-CN';
        if (status === 'completed') {
            return englishCopy ? 'Completed' : '已完成';
        }
        if (status === 'failed') {
            return englishCopy ? 'Failed' : '失败';
        }
        return englishCopy ? 'Deferred' : '已延后';
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
    /*
     * M-race1: `state.json` for one change, with absence and damage kept apart.
     *
     * Absence is already handled by the `exists` check in the only caller, so
     * reaching `absent` here means the directory was removed between the two
     * calls -- a concurrent archive or a `rm -rf` -- and that is a vanished
     * change, not a damaged one, so it degrades to `null` and gets skipped.
     *
     * Damage is a typed throw. It has to leave this method loudly, because the
     * fields it feeds (`status`, `current_step`, `completed`, `pending`) decide
     * whether the change is archive-ready; substituting an empty object would
     * report a half-written change as a fresh draft with nothing done.
     */
    async readChangeStateOrThrow(featureDir, statePath) {
        const result = await this.fileService.readJsonSafe(statePath);
        if (result.status === 'ok')
            return result.value;
        if (result.status === 'absent')
            return null;
        throw new errors_1.DamagedChangeStateError(path_1.default.basename(featureDir), result.message);
    }
    async buildActiveChangeStatusItem(rootDir, featureDir, workflow) {
        const statePath = path_1.default.join(featureDir, constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(statePath))) {
            return null;
        }
        const proposalPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.PROPOSAL);
        const designPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.DESIGN);
        const implementationPlanPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN);
        const taskGraphPath = path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.TASK_GRAPH);
        const agentWorkerStatusPath = path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
        const tasksPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.TASKS);
        const verificationPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.VERIFICATION);
        const reviewPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.REVIEW);
        const [state, proposalExists, designExists, implementationPlanExists, taskGraphExists, agentWorkerStatusExists, tasksExists, verificationExists] = await Promise.all([
            this.readChangeStateOrThrow(featureDir, statePath),
            this.fileService.exists(proposalPath),
            this.fileService.exists(designPath),
            this.fileService.exists(implementationPlanPath),
            this.fileService.exists(taskGraphPath),
            this.fileService.exists(agentWorkerStatusPath),
            this.fileService.exists(tasksPath),
            this.fileService.exists(verificationPath),
        ]);
        // The `exists` check above raced a concurrent archive or delete: the
        // change has vanished, which is not the same as being damaged, so it
        // simply drops out of the listing.
        if (!state)
            return null;
        const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(featureDir, state);
        const isGoalWorkflow = workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE;
        const reviewArtifactSet = isGoalWorkflow
            ? await (0, ReviewArtifacts_1.resolveGoalReviewArtifacts)(this.fileService, featureDir)
            : { mode: 'combined', missing: [], artifacts: [] };
        const reviewArtifactsReady = reviewArtifactSet.missing.length === 0;
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
                name: 'design.md',
                status: !isGoalWorkflow || designExists ? 'pass' : 'fail',
                message: isGoalWorkflow
                    ? designExists ? 'Design file exists' : 'design.md is missing'
                    : 'Not required for change workflow',
            },
            {
                name: 'implementation-plan.md',
                status: !isGoalWorkflow || implementationPlanExists ? 'pass' : 'fail',
                message: isGoalWorkflow
                    ? implementationPlanExists ? 'Implementation plan file exists' : 'implementation-plan.md is missing'
                    : 'Not required for change workflow',
            },
            {
                name: 'artifacts/agents/task-graph.json',
                status: !isGoalWorkflow || taskGraphExists ? 'pass' : 'fail',
                message: isGoalWorkflow
                    ? taskGraphExists ? 'Task graph artifact exists' : 'artifacts/agents/task-graph.json is missing'
                    : 'Not required for change workflow',
            },
            {
                name: 'artifacts/reviews/final-review.md',
                status: !isGoalWorkflow || reviewArtifactsReady ? 'pass' : 'fail',
                message: isGoalWorkflow
                    ? reviewArtifactsReady
                        ? reviewArtifactSet.mode === 'combined'
                            ? 'Combined final review artifact exists'
                            : 'Legacy spec and quality review artifacts exist'
                        : `Review artifact is missing: ${reviewArtifactSet.missing.join(', ')}`
                    : 'Not required for change workflow',
            },
            {
                name: 'artifacts/agents/worker-status.md',
                status: !isGoalWorkflow || agentWorkerStatusExists ? 'pass' : 'fail',
                message: isGoalWorkflow
                    ? agentWorkerStatusExists ? 'Agent worker status file exists' : 'artifacts/agents/worker-status.md is missing'
                    : 'Not required for change workflow',
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
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
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
        const designAnalysis = isGoalWorkflow && designExists
            ? await this.analyzeChecklistDocument(designPath, 'design.md', activatedSteps)
            : null;
        if (designAnalysis) {
            checks.push(...designAnalysis.checks);
        }
        const implementationPlanAnalysis = isGoalWorkflow && implementationPlanExists
            ? await this.analyzeChecklistDocument(implementationPlanPath, 'implementation-plan.md', activatedSteps)
            : null;
        if (implementationPlanAnalysis) {
            checks.push(...implementationPlanAnalysis.checks);
        }
        const taskGraphAnalysis = isGoalWorkflow && taskGraphExists
            ? await this.analyzeTaskGraphDocument(taskGraphPath, activatedSteps)
            : null;
        if (taskGraphAnalysis) {
            checks.push(...taskGraphAnalysis.checks);
        }
        if (isGoalWorkflow && taskGraphExists) {
            const documentationUpdateAnalysis = await this.analyzeDocumentationUpdates(featureDir);
            checks.push(...documentationUpdateAnalysis.checks);
        }
        if (isGoalWorkflow) {
            for (const reviewArtifact of reviewArtifactSet.artifacts) {
                const analysis = await this.analyzeReviewArtifactDocument(reviewArtifact.path, reviewArtifact.name, reviewArtifact.role, activatedSteps);
                checks.push(...analysis.checks);
            }
        }
        const agentWorkerStatusAnalysis = isGoalWorkflow && agentWorkerStatusExists
            ? await this.analyzeAgentWorkerStatusDocument(agentWorkerStatusPath)
            : null;
        if (agentWorkerStatusAnalysis) {
            checks.push(...agentWorkerStatusAnalysis.checks);
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
            if (isGoalWorkflow) {
                const evidenceCheck = verificationAnalysis.checks.find(check => check.name === 'verification.md.evidence');
                if (evidenceCheck?.status !== 'pass') {
                    checks.push({
                        name: 'goal.verification_evidence',
                        status: 'fail',
                        message: 'Goal workflow requires latest passing artifacts/agents/verification-evidence.json',
                    });
                }
            }
        }
        if (isGoalWorkflow) {
            checks.push(...await this.getGoalDocumentReviewChecks(featureDir));
            const verificationFreshness = await new TaskGraphExecutionService_1.TaskGraphExecutionService(this.fileService)
                .validateLatestVerificationEvidence(featureDir)
                .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
            checks.push({
                name: 'goal.verification_evidence.freshness',
                status: verificationFreshness.ready ? 'pass' : 'fail',
                message: verificationFreshness.ready
                    ? 'Latest verification evidence matches the current Git and target-file snapshot'
                    : verificationFreshness.reason || 'Latest verification evidence is stale',
            });
        }
        const classicCloseout = !isGoalWorkflow
            ? new ClassicChangeCloseoutService_1.ClassicChangeCloseoutService(this.fileService)
            : null;
        const classicDocumentationAnalysis = classicCloseout
            ? await classicCloseout.analyzeDocumentationContract(rootDir, proposalPath)
            : null;
        const classicReviewAnalysis = classicCloseout
            ? await classicCloseout.analyzeReview(reviewPath)
            : null;
        const classicWorkspaceAnalysis = classicCloseout
            ? await classicCloseout.analyzeWorkspaceScope(rootDir, featureDir, proposalPath)
            : null;
        if (classicDocumentationAnalysis)
            checks.push(...classicDocumentationAnalysis.checks);
        if (classicReviewAnalysis)
            checks.push(...classicReviewAnalysis.checks);
        if (classicWorkspaceAnalysis)
            checks.push(...classicWorkspaceAnalysis.checks);
        // 7.6: the documentation obligations. Deliberately OUTSIDE the
        // goal/classic branch above -- the record lives in `state.json` for
        // both profiles, so the gate reads one place and cannot develop two
        // opinions about whether a change documented what it changed.
        checks.push(...(await this.analyzeDocsObligations(rootDir, featureDir)));
        const closeoutState = classicCloseout
            ? classicCloseout.deriveCloseoutState(state, {
                proposalReady: proposalExists,
                tasksReady: tasksAnalysis?.checklistComplete ?? false,
                verificationReady: verificationAnalysis?.checklistComplete ?? false,
                reviewReady: classicReviewAnalysis?.archiveReady ?? false,
                documentationReady: classicDocumentationAnalysis?.archiveReady ?? false,
            })
            : state;
        const stateAligned = isGoalWorkflow
            || (state.status === closeoutState.status
                && state.current_step === closeoutState.current_step
                && JSON.stringify([...(state.completed || [])].sort()) === JSON.stringify([...(closeoutState.completed || [])].sort()));
        checks.push({
            name: 'state.json',
            status: stateAligned ? 'pass' : 'warn',
            message: stateAligned
                ? `Status is ${state.status}, current step is ${state.current_step}`
                : `Classic change state will be synchronized to ${closeoutState.status} during finalize`,
        });
        const archiveConfig = isGoalWorkflow
            ? workflow.getArchiveGate()
            : {
                ...workflow.getArchiveGate(),
                require_skill_update: false,
                require_index_regenerated: false,
            };
        const proposalAcceptanceComplete = proposalExists
            ? !(0, ChecklistScan_1.hasUncheckedChecklistItem)((0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath)).content)
            : false;
        const goalReviewSummary = isGoalWorkflow
            ? await (0, ReviewArtifacts_1.analyzeGoalReviewSummary)(this.fileService, featureDir)
            : null;
        const archiveResult = await ArchiveGate_1.archiveGate.checkArchiveReadiness(closeoutState, archiveConfig, {
            activatedSteps,
            tasksOptionalSteps: tasksAnalysis?.optionalSteps ?? [],
            verificationOptionalSteps: verificationAnalysis?.optionalSteps ?? [],
            passedOptionalSteps: verificationAnalysis?.passedOptionalSteps ?? [],
            tasksComplete: tasksAnalysis?.checklistComplete ?? false,
            verificationComplete: verificationAnalysis?.checklistComplete ?? false,
            proposalAcceptanceComplete,
            goalReviewSummaryAligned: goalReviewSummary ? goalReviewSummary.aligned : null,
            goalReviewSummaryMessage: goalReviewSummary?.message ?? null,
        });
        if (closeoutState.status === 'archived') {
            checks.push({
                name: 'archive.location',
                status: 'fail',
                message: 'state.json.status is archived but the change is still under changes/active. Archive output is inconsistent.',
            });
        }
        else if (closeoutState.status === 'ready_to_archive' && archiveResult.canArchive) {
            checks.push({
                name: 'archive.pending',
                status: 'warn',
                message: `Change is ready to archive. Run "ospec archive ${this.toRelativePath(rootDir, featureDir)}" before commit.`,
            });
        }
        const failCount = checks.filter(check => check.status === 'fail').length;
        const warnCount = checks.filter(check => check.status === 'warn').length;
        const archiveReady = archiveResult.canArchive
            && failCount === 0
            && (isGoalWorkflow ? (taskGraphAnalysis?.archiveReady ?? false) : true);
        return {
            name: closeoutState.feature,
            workflowProfile,
            path: this.toRelativePath(rootDir, featureDir),
            status: closeoutState.status,
            progress: this.calculateProgress(closeoutState),
            currentStep: closeoutState.current_step,
            flags,
            description,
            activatedSteps,
            summaryStatus: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
            failCount,
            warnCount,
            archiveReady,
            checks,
            ...(!isGoalWorkflow ? { closeoutState } : {}),
        };
    }
    async getGoalDocumentReviewChecks(featureDir) {
        const approvedDecisions = new Set(['APPROVED', 'APPROVED_WITH_CONCERNS']);
        const checks = [];
        for (const review of [
            {
                name: 'artifacts/reviews/design-review.md',
                path: path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, 'design-review.md'),
            },
            {
                name: 'artifacts/reviews/implementation-plan-review.md',
                path: path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, 'implementation-plan-review.md'),
            },
        ]) {
            const exists = await this.fileService.exists(review.path);
            checks.push({
                name: review.name,
                status: exists ? 'pass' : 'fail',
                message: exists ? `${review.name} exists` : `${review.name} is missing`,
            });
            if (!exists) {
                continue;
            }
            try {
                const document = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(review.path));
                const decision = typeof document.data.decision === 'string'
                    ? document.data.decision.trim().toUpperCase()
                    : 'PENDING';
                checks.push({
                    name: `${review.name}.decision`,
                    status: approvedDecisions.has(decision) ? 'pass' : 'fail',
                    message: approvedDecisions.has(decision)
                        ? `${review.name} is ${decision}`
                        : `${review.name} must be approved before goal closeout (current: ${decision})`,
                });
            }
            catch (error) {
                checks.push({
                    name: `${review.name}.decision`,
                    status: 'fail',
                    message: `${review.name} cannot be parsed: ${error.message || error}`,
                });
            }
        }
        return checks;
    }
    async analyzeChecklistDocument(filePath, name, activatedSteps) {
        const content = await this.fileService.readFile(filePath);
        const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
        let parsed = null;
        let parseError = null;
        if (hasFrontmatter) {
            try {
                parsed = (0, helpers_1.parseFrontmatterDocument)(content);
            }
            catch (error) {
                parseError = error;
            }
        }
        const data = parsed?.data ?? {};
        const optionalStepsFieldValid = Array.isArray(data.optional_steps);
        const optionalSteps = optionalStepsFieldValid ? data.optional_steps : [];
        const createdFieldValid = (typeof data.created === 'string' && data.created.trim().length > 0) ||
            (data.created instanceof Date && !Number.isNaN(data.created.getTime()));
        const missingRequiredFields = [];
        if (typeof data.feature !== 'string' || data.feature.trim().length === 0) {
            missingRequiredFields.push('feature');
        }
        if (!createdFieldValid) {
            missingRequiredFields.push('created');
        }
        if (!optionalStepsFieldValid) {
            missingRequiredFields.push('optional_steps');
        }
        const missing = optionalStepsFieldValid
            ? activatedSteps.filter(step => !optionalSteps.includes(step))
            : [...activatedSteps];
        const checklistStructureValid = (0, ChecklistScan_1.hasChecklistItem)(parsed?.content ?? '');
        const uncheckedItems = (0, ChecklistScan_1.listUncheckedChecklistItems)(parsed?.content ?? '');
        const checklistComplete = hasFrontmatter &&
            parseError === null &&
            missingRequiredFields.length === 0 &&
            checklistStructureValid &&
            uncheckedItems.length === 0;
        let frontmatterMessage = `${name} frontmatter parsed successfully`;
        if (!hasFrontmatter) {
            frontmatterMessage = `${name} is missing a valid frontmatter block`;
        }
        else if (parseError) {
            frontmatterMessage = `${name} frontmatter cannot be parsed: ${parseError.message}`;
        }
        let requiredFieldsMessage = `${name} has all required frontmatter fields`;
        if (!hasFrontmatter || parseError) {
            requiredFieldsMessage = `Cannot validate required fields in ${name} because frontmatter is invalid`;
        }
        else if (missingRequiredFields.length > 0) {
            requiredFieldsMessage = `Missing or invalid required fields in ${name}: ${missingRequiredFields.join(', ')}`;
        }
        let optionalStepsMessage = `All activated optional steps are present in ${name}`;
        if (!optionalStepsFieldValid) {
            optionalStepsMessage = `${name} frontmatter field optional_steps must be an array`;
        }
        else if (missing.length > 0) {
            optionalStepsMessage = `Missing optional steps in ${name}: ${missing.join(', ')}`;
        }
        let checklistStatus = 'pass';
        let checklistMessage = `${name} checklist is complete`;
        if (!hasFrontmatter || parseError) {
            checklistStatus = 'fail';
            checklistMessage = `${name} checklist cannot be validated because frontmatter is invalid`;
        }
        else if (!checklistStructureValid) {
            checklistStatus = 'fail';
            checklistMessage = `${name} must contain at least one Markdown checklist item`;
        }
        else if (uncheckedItems.length > 0) {
            checklistStatus = 'warn';
            checklistMessage = `${name} still has unchecked items`;
        }
        return {
            optionalSteps,
            checklistComplete,
            checks: [
                {
                    name: `${name}.frontmatter`,
                    status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                    message: frontmatterMessage,
                },
                {
                    name: `${name}.required_fields`,
                    status: hasFrontmatter && parseError === null && missingRequiredFields.length === 0 ? 'pass' : 'fail',
                    message: requiredFieldsMessage,
                },
                {
                    name: `${name}.optional_steps`,
                    status: optionalStepsFieldValid && missing.length === 0 ? 'pass' : 'fail',
                    message: optionalStepsMessage,
                },
                {
                    name: `${name}.checklist`,
                    status: checklistStatus,
                    message: checklistMessage,
                },
            ],
        };
    }
    async analyzeTaskGraphDocument(filePath, activatedSteps) {
        const name = 'artifacts/agents/task-graph.json';
        const content = await this.fileService.readFile(filePath);
        let parsed = null;
        let parseError = null;
        try {
            parsed = JSON.parse(content);
        }
        catch (error) {
            parseError = error;
        }
        const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        const optionalStepsFieldValid = Array.isArray(data.optional_steps);
        const optionalSteps = optionalStepsFieldValid ? data.optional_steps : [];
        const tasksFieldValid = Array.isArray(data.tasks);
        const tasks = tasksFieldValid ? data.tasks : [];
        const missingRequiredFields = [];
        if (typeof data.version !== 'string' || data.version.trim().length === 0) {
            missingRequiredFields.push('version');
        }
        if (typeof data.feature !== 'string' || data.feature.trim().length === 0) {
            missingRequiredFields.push('feature');
        }
        if (typeof data.status !== 'string' || data.status.trim().length === 0) {
            missingRequiredFields.push('status');
        }
        if (!optionalStepsFieldValid) {
            missingRequiredFields.push('optional_steps');
        }
        if (!tasksFieldValid) {
            missingRequiredFields.push('tasks');
        }
        const missingActivatedSteps = optionalStepsFieldValid
            ? activatedSteps.filter(step => !optionalSteps.includes(step))
            : [...activatedSteps];
        const taskSchemaIssues = [];
        const dependencyIssues = [];
        const invalidStatuses = [];
        const unresolvedStatuses = [];
        const concernStatuses = [];
        const executionDetailIssues = [];
        const statuses = {};
        const taskIds = new Set();
        const duplicateTaskIds = new Set();
        // M-misc6: see `utils/ContractVersion`. `Number('v1')` is NaN, so a
        // `contract_version` of `v1.9.0` turned both of these off.
        const graphContract = data.contract_version;
        const requiresSerialReason = (0, ContractVersion_1.contractVersionAtLeast)(graphContract, 1, 8, 6);
        const requiresScopeReason = (0, ContractVersion_1.contractVersionAtLeast)(graphContract, 1, 8, 5);
        if (tasksFieldValid && tasks.length === 0) {
            taskSchemaIssues.push('tasks must contain at least one task');
        }
        for (const [index, task] of tasks.entries()) {
            const taskLabel = `tasks[${index}]`;
            if (!task || typeof task !== 'object' || Array.isArray(task)) {
                taskSchemaIssues.push(`${taskLabel} must be an object`);
                continue;
            }
            const taskId = typeof task.id === 'string' ? task.id.trim() : '';
            if (!taskId) {
                taskSchemaIssues.push(`${taskLabel}.id must be a non-empty string`);
            }
            else if (taskIds.has(taskId)) {
                duplicateTaskIds.add(taskId);
            }
            else {
                taskIds.add(taskId);
            }
            if (typeof task.title !== 'string' || task.title.trim().length === 0) {
                taskSchemaIssues.push(`${taskLabel}.title must be a non-empty string`);
            }
            if (typeof task.status !== 'string' || task.status.trim().length === 0) {
                taskSchemaIssues.push(`${taskLabel}.status must be a non-empty string`);
            }
            if (!Array.isArray(task.depends_on)) {
                taskSchemaIssues.push(`${taskLabel}.depends_on must be an array`);
            }
            if (typeof task.parallelizable !== 'boolean') {
                taskSchemaIssues.push(`${taskLabel}.parallelizable must be a boolean`);
            }
            if (requiresSerialReason && task.serial_reason !== undefined && (typeof task.serial_reason !== 'string' || task.serial_reason.trim().length === 0)) {
                taskSchemaIssues.push(`${taskLabel}.serial_reason must be a non-empty string when present`);
            }
            if (task.scope_reason !== undefined && task.scope_reason !== null
                && (typeof task.scope_reason !== 'string' || task.scope_reason.trim().length === 0)) {
                taskSchemaIssues.push(`${taskLabel}.scope_reason must be a non-empty string or null when present`);
            }
            if (requiresSerialReason && task.parallelizable === false && (typeof task.serial_reason !== 'string' || task.serial_reason.trim().length === 0)) {
                executionDetailIssues.push(`${taskLabel}.serial_reason is required for 1.8.6 serial tasks`);
            }
            if (!Array.isArray(task.conflicts_with)) {
                taskSchemaIssues.push(`${taskLabel}.conflicts_with must be an array`);
            }
            if (!Array.isArray(task.target_files)) {
                taskSchemaIssues.push(`${taskLabel}.target_files must be an array`);
            }
            else if (requiresScopeReason && task.target_files.length > 6
                && (typeof task.scope_reason !== 'string' || task.scope_reason.trim().length === 0)) {
                executionDetailIssues.push(`${taskLabel}.scope_reason is required for 1.8.5 tasks with more than 6 target_files`);
            }
            if (!Array.isArray(task.verification_commands)) {
                taskSchemaIssues.push(`${taskLabel}.verification_commands must be an array`);
            }
            if (typeof task.expected_result !== 'string' || task.expected_result.trim().length === 0) {
                taskSchemaIssues.push(`${taskLabel}.expected_result must be a non-empty string`);
            }
            if (typeof task.worker_role !== 'string' || task.worker_role.trim().length === 0) {
                taskSchemaIssues.push(`${taskLabel}.worker_role must be a non-empty string`);
            }
            if (taskId) {
                const status = typeof task.status === 'string' ? task.status.trim().toUpperCase() : '';
                statuses[taskId] = status;
                if (!TASK_GRAPH_ALLOWED_STATUS_SET.has(status)) {
                    invalidStatuses.push(`${taskId}=${status || '(missing)'}`);
                }
                else if (!TASK_GRAPH_TERMINAL_STATUS_SET.has(status)) {
                    unresolvedStatuses.push(`${taskId}=${status}`);
                }
                else if (status === 'DONE_WITH_CONCERNS') {
                    concernStatuses.push(taskId);
                }
                if (TASK_GRAPH_TERMINAL_STATUS_SET.has(status) && task.review && typeof task.review === 'object' && !Array.isArray(task.review)) {
                    const combinedReview = typeof task.review.decision === 'string'
                        ? task.review.decision.trim().toUpperCase()
                        : '';
                    if (combinedReview) {
                        if (!REVIEW_ARTIFACT_TERMINAL_DECISION_SET.has(combinedReview)) {
                            unresolvedStatuses.push(`${taskId}.review.decision=${combinedReview}`);
                        }
                    }
                    else {
                        const specReview = typeof task.review.spec === 'string' ? task.review.spec.trim().toUpperCase() : 'PENDING';
                        const qualityReview = typeof task.review.quality === 'string' ? task.review.quality.trim().toUpperCase() : 'PENDING';
                        if (!REVIEW_ARTIFACT_TERMINAL_DECISION_SET.has(specReview)) {
                            unresolvedStatuses.push(`${taskId}.review.spec=${specReview || 'PENDING'}`);
                        }
                        if (!REVIEW_ARTIFACT_TERMINAL_DECISION_SET.has(qualityReview)) {
                            unresolvedStatuses.push(`${taskId}.review.quality=${qualityReview || 'PENDING'}`);
                        }
                    }
                }
                if (!Array.isArray(task.target_files) || task.target_files.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                    executionDetailIssues.push(`${taskId}.target_files`);
                }
                if (!Array.isArray(task.verification_commands) || task.verification_commands.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                    executionDetailIssues.push(`${taskId}.verification_commands`);
                }
                const expectedResult = typeof task.expected_result === 'string' ? task.expected_result.trim() : '';
                if (!expectedResult || expectedResult.toUpperCase() === 'TBD') {
                    executionDetailIssues.push(`${taskId}.expected_result`);
                }
            }
        }
        for (const duplicateId of duplicateTaskIds) {
            taskSchemaIssues.push(`duplicate task id: ${duplicateId}`);
        }
        if (tasksFieldValid && taskSchemaIssues.length === 0) {
            const dependenciesByTask = new Map();
            for (const task of tasks) {
                const taskId = task.id.trim();
                const dependencies = task.depends_on.filter((value) => typeof value === 'string' && value.trim().length > 0);
                dependenciesByTask.set(taskId, dependencies);
                for (const dependency of dependencies) {
                    if (dependency === taskId) {
                        dependencyIssues.push(`${taskId} cannot depend on itself`);
                    }
                    else if (!taskIds.has(dependency)) {
                        dependencyIssues.push(`${taskId} depends on unknown task ${dependency}`);
                    }
                }
            }
            const visiting = new Set();
            const visited = new Set();
            const visit = (taskId, chain) => {
                if (visited.has(taskId)) {
                    return;
                }
                if (visiting.has(taskId)) {
                    dependencyIssues.push(`dependency cycle detected: ${[...chain, taskId].join(' -> ')}`);
                    return;
                }
                visiting.add(taskId);
                for (const dependency of dependenciesByTask.get(taskId) ?? []) {
                    if (taskIds.has(dependency)) {
                        visit(dependency, [...chain, taskId]);
                    }
                }
                visiting.delete(taskId);
                visited.add(taskId);
            };
            for (const taskId of taskIds) {
                visit(taskId, []);
            }
        }
        const graphCompleted = data.status === 'completed';
        let jsonMessage = `${name} JSON parsed successfully`;
        if (parseError) {
            jsonMessage = `${name} JSON cannot be parsed: ${parseError.message}`;
        }
        let requiredFieldsMessage = `${name} has all required fields`;
        if (parseError) {
            requiredFieldsMessage = `Cannot validate required fields in ${name} because JSON is invalid`;
        }
        else if (missingRequiredFields.length > 0) {
            requiredFieldsMessage = `Missing or invalid required fields in ${name}: ${missingRequiredFields.join(', ')}`;
        }
        let optionalStepsMessage = `All activated optional steps are present in ${name}`;
        if (!optionalStepsFieldValid) {
            optionalStepsMessage = `${name} field optional_steps must be an array`;
        }
        else if (missingActivatedSteps.length > 0) {
            optionalStepsMessage = `Missing optional steps in ${name}: ${missingActivatedSteps.join(', ')}`;
        }
        const taskSchemaMessage = taskSchemaIssues.length > 0
            ? `Invalid task graph schema in ${name}: ${taskSchemaIssues.join(', ')}`
            : `${name} task schema is valid`;
        const dependenciesMessage = dependencyIssues.length > 0
            ? `Invalid task dependencies in ${name}: ${dependencyIssues.join(', ')}`
            : `${name} dependencies are valid`;
        let statusMessage = `${name} task statuses are archive-ready`;
        let statusCheckStatus = 'pass';
        if (invalidStatuses.length > 0) {
            statusCheckStatus = 'fail';
            statusMessage = `Invalid task statuses in ${name}: ${invalidStatuses.join(', ')}`;
        }
        else if (unresolvedStatuses.length > 0) {
            statusCheckStatus = 'fail';
            statusMessage = `Unresolved task statuses in ${name}: ${unresolvedStatuses.join(', ')}`;
        }
        else if (!graphCompleted) {
            statusCheckStatus = 'fail';
            statusMessage = `${name} status must be completed before archiving`;
        }
        else if (concernStatuses.length > 0) {
            statusCheckStatus = 'warn';
            statusMessage = `${name} tasks completed with concerns: ${concernStatuses.join(', ')}`;
        }
        const executionDetailsMessage = executionDetailIssues.length > 0
            ? `Incomplete task execution details in ${name}: ${executionDetailIssues.join(', ')}`
            : `${name} task execution details are complete`;
        const archiveReady = parseError === null &&
            missingRequiredFields.length === 0 &&
            missingActivatedSteps.length === 0 &&
            taskSchemaIssues.length === 0 &&
            dependencyIssues.length === 0 &&
            invalidStatuses.length === 0 &&
            unresolvedStatuses.length === 0 &&
            graphCompleted &&
            executionDetailIssues.length === 0;
        return {
            optionalSteps,
            taskCount: tasks.length,
            statuses,
            archiveReady,
            blockers: [
                ...(parseError ? [`${name} JSON must be valid`] : []),
                ...(missingRequiredFields.length > 0 ? [`Missing or invalid required fields in ${name}: ${missingRequiredFields.join(', ')}`] : []),
                ...(missingActivatedSteps.length > 0 ? [`Activated optional steps missing from ${name}: ${missingActivatedSteps.join(', ')}`] : []),
                ...(taskSchemaIssues.length > 0 ? [`Invalid task graph schema in ${name}: ${taskSchemaIssues.join(', ')}`] : []),
                ...(dependencyIssues.length > 0 ? [`Invalid task dependencies in ${name}: ${dependencyIssues.join(', ')}`] : []),
                ...(invalidStatuses.length > 0 ? [`Invalid task statuses in ${name}: ${invalidStatuses.join(', ')}`] : []),
                ...(unresolvedStatuses.length > 0 ? [`Unresolved task statuses in ${name}: ${unresolvedStatuses.join(', ')}`] : []),
                ...(!graphCompleted ? [`${name} status must be completed before archiving`] : []),
                ...(executionDetailIssues.length > 0 ? [`Incomplete task execution details in ${name}: ${executionDetailIssues.join(', ')}`] : []),
            ],
            checks: [
                {
                    name: `${name}.json`,
                    status: parseError === null ? 'pass' : 'fail',
                    message: jsonMessage,
                },
                {
                    name: `${name}.required_fields`,
                    status: parseError === null && missingRequiredFields.length === 0 ? 'pass' : 'fail',
                    message: requiredFieldsMessage,
                },
                {
                    name: `${name}.optional_steps`,
                    status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                    message: optionalStepsMessage,
                },
                {
                    name: `${name}.task_schema`,
                    status: taskSchemaIssues.length === 0 ? 'pass' : 'fail',
                    message: taskSchemaMessage,
                },
                {
                    name: `${name}.dependencies`,
                    status: dependencyIssues.length === 0 ? 'pass' : 'fail',
                    message: dependenciesMessage,
                },
                {
                    name: `${name}.task_statuses`,
                    status: statusCheckStatus,
                    message: statusMessage,
                },
                {
                    name: `${name}.execution_details`,
                    status: executionDetailIssues.length === 0 ? 'pass' : 'fail',
                    message: executionDetailsMessage,
                },
            ],
        };
    }
    /**
     * 7.6: evaluate this change's documentation obligations and map them onto
     * gate checks.
     *
     * Reads `state.json.docs_obligations` -- the single record, written at
     * planning time for both workflow profiles. A change with no obligations
     * produces one passing check and nothing else; that is the honest result
     * for a project that has not adopted feature documents, and it is why the
     * check is named even when the list is empty, so an empty list is visible
     * in the gate output rather than silently absent.
     */
    async analyzeDocsObligations(rootDir, featureDir) {
        const statePath = path_1.default.join(featureDir, constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(statePath)))
            return [];
        let obligations = [];
        try {
            const state = await this.fileService.readJSON(statePath);
            obligations = Array.isArray(state?.docs_obligations) ? state.docs_obligations : [];
        }
        catch {
            return [];
        }
        const config = await this.configManager.loadConfig(rootDir).catch(() => null);
        const mode = config?.docs_contract?.mode === 'strict' ? 'strict' : 'warn';
        const service = (0, DocsObligationService_1.createDocsObligationService)(this.fileService);
        if (obligations.length === 0) {
            return this.reportMissingDocsObligations(rootDir, featureDir, service);
        }
        const verdicts = await service.evaluate({ obligations, projectRoot: rootDir });
        return service.applyMode(verdicts, mode);
    }
    /**
     * 7.6: an empty obligation list is not automatically innocent.
     *
     * `docs_obligations` is written by `ospec docs obligations --apply` at
     * planning time. Nothing forces that command to run, so without this check a
     * change could skip the entire documentation contract by simply never
     * invoking it -- and the gate would report nothing at all, which reads
     * exactly like "this change owed no documentation". That is the
     * gate-passes-because-the-list-was-empty failure this phase exists to avoid.
     *
     * So when the list is empty, re-derive what this change's `change_type`
     * WOULD generate. If the answer is "nothing", the empty list is honest and
     * one passing check says so. If the answer is "something", the operator is
     * told the obligations were never recorded.
     *
     * This is a `warn` in BOTH modes, deliberately. It reports a process step
     * that was skipped, not an unmet obligation, and blocking on it would
     * punish every project that has not adopted the engine yet.
     */
    async reportMissingDocsObligations(rootDir, featureDir, service) {
        const proposalPath = path_1.default.join(featureDir, constants_1.FILE_NAMES.PROPOSAL);
        if (!(await this.fileService.exists(proposalPath)))
            return [];
        let changeType = '';
        let features = [];
        let affects = [];
        try {
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
            changeType = String(proposal.data?.change_type || '').trim().toLowerCase();
            features = Array.isArray(proposal.data?.features)
                ? proposal.data.features.map((slug) => String(slug || '').trim()).filter(Boolean)
                : [];
            affects = Array.isArray(proposal.data?.affects)
                ? proposal.data.affects.map((entry) => String(entry || '').trim()).filter(Boolean)
                : [];
        }
        catch {
            return [];
        }
        const featureDocs = await (0, FeatureCaptureService_1.createFeatureCaptureService)(this.fileService)
            .readFeatureDocs(rootDir, await this.configManager.loadConfig(rootDir).catch(() => null));
        // Same affects fallback as the planner. This preview exists to say what
        // planning WOULD have recorded; computing it from fewer inputs than the
        // planner uses would make the warning disagree with the real run.
        if (features.length === 0) {
            features = (0, DocsObligationService_1.resolveFeaturesFromAffects)(affects, featureDocs);
        }
        const would = service.generate({
            changeType,
            features,
            featureDocs,
            changeName: path_1.default.basename(featureDir),
        });
        if (would.length === 0) {
            return [{
                    name: 'docs_obligations',
                    status: 'pass',
                    message: `No documentation obligations apply to this change (change_type: ${changeType || 'unset'}).`,
                }];
        }
        return [{
                name: 'docs_obligations',
                status: 'warn',
                message: `This ${changeType} change would generate ${would.length} documentation obligation(s), but none were recorded. `
                    + 'Run "ospec docs obligations --apply" to record them, then satisfy or confirm each one. '
                    + `Targets: ${would.map(item => item.target).join(', ')}`,
            }];
    }
    async analyzeDocumentationUpdates(featureDir) {
        const taskGraphPath = path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(taskGraphPath))) {
            return { enabled: false, declared: [], checks: [] };
        }
        const graph = await this.fileService.readJSON(taskGraphPath);
        const tasks = Array.isArray(graph?.tasks) ? graph.tasks : [];
        const enabled = Object.prototype.hasOwnProperty.call(graph || {}, 'documentation_updates')
            || tasks.some((task) => task && Object.prototype.hasOwnProperty.call(task, 'documentation_updates'));
        if (!enabled) {
            return { enabled: false, declared: [], checks: [] };
        }
        const projectRoot = await this.findProjectRootFromPath(featureDir);
        const executionSessionPath = path_1.default.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, 'execution-session.json');
        let dispatches = [];
        if (await this.fileService.exists(executionSessionPath)) {
            try {
                const executionSession = await this.fileService.readJSON(executionSessionPath);
                dispatches = Array.isArray(executionSession?.dispatches) ? executionSession.dispatches : [];
            }
            catch {
                dispatches = [];
            }
        }
        const checks = [];
        const declared = new Set();
        const normalize = (value) => String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
        const resolveSafeProjectPath = (value) => {
            if (!value || path_1.default.isAbsolute(value))
                return null;
            const resolved = path_1.default.resolve(projectRoot, ...value.split('/'));
            const relative = path_1.default.relative(projectRoot, resolved);
            return relative && relative !== '..' && !relative.startsWith(`..${path_1.default.sep}`) && !path_1.default.isAbsolute(relative)
                ? resolved
                : null;
        };
        const isManagedDocumentationPath = (value) => {
            const normalized = value.toLowerCase();
            return normalized.startsWith('docs/') || normalized.startsWith('.ospec/docs/');
        };
        const orderedCompletedDispatches = dispatches
            .map((dispatch, index) => ({ dispatch, index }))
            .filter(({ dispatch }) => Boolean(dispatch?.completedAt))
            .sort((left, right) => {
            const completedOrder = String(left.dispatch.completedAt).localeCompare(String(right.dispatch.completedAt));
            return completedOrder !== 0 ? completedOrder : left.index - right.index;
        })
            .map(({ dispatch }) => dispatch);
        const declaredPathsByTask = new Map();
        const taskById = new Map();
        for (const [index, task] of tasks.entries()) {
            const taskId = typeof task?.id === 'string' && task.id.trim() ? task.id.trim() : `tasks[${index}]`;
            const updates = Array.isArray(task?.documentation_updates)
                ? task.documentation_updates.map(normalize).filter(Boolean)
                : [];
            taskById.set(taskId, task);
            declaredPathsByTask.set(taskId, new Set(updates.map((update) => update.toLowerCase())));
        }
        const evidenceForTaskPath = (taskId, updateKey) => orderedCompletedDispatches
            .filter((dispatch) => dispatch?.taskId === taskId)
            .map((dispatch) => Array.isArray(dispatch?.documentationEvidence)
            ? dispatch.documentationEvidence.find((item) => normalize(item?.path).toLowerCase() === updateKey)
            : null)
            .filter(Boolean);
        const latestDeclaredEvidenceForPath = (updateKey) => {
            let latest = null;
            for (const dispatch of orderedCompletedDispatches) {
                const taskId = typeof dispatch?.taskId === 'string' ? dispatch.taskId : '';
                if (!declaredPathsByTask.get(taskId)?.has(updateKey))
                    continue;
                const evidence = Array.isArray(dispatch?.documentationEvidence)
                    ? dispatch.documentationEvidence.find((item) => normalize(item?.path).toLowerCase() === updateKey)
                    : null;
                if (evidence) {
                    latest = {
                        taskId,
                        completedAt: String(dispatch.completedAt || ''),
                        evidence,
                    };
                }
            }
            return latest;
        };
        const evidenceStateChanged = (evidence) => {
            const first = evidence[0];
            const last = evidence[evidence.length - 1];
            const hasStructuredState = typeof first?.baselineExists === 'boolean'
                && Object.prototype.hasOwnProperty.call(first, 'baselineContentHash')
                && typeof last?.exists === 'boolean'
                && Object.prototype.hasOwnProperty.call(last, 'contentHash');
            if (!hasStructuredState) {
                return evidence.some(item => item?.meaningfullyChanged === true);
            }
            return first.baselineExists !== last.exists
                || (first.baselineExists === true
                    && last.exists === true
                    && first.baselineContentHash !== last.contentHash);
        };
        const hashMeaningfulDocumentation = (content) => {
            const normalized = String(content || '')
                .replace(/\r\n?/g, '\n')
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            return (0, crypto_1.createHash)('sha256').update(normalized, 'utf8').digest('hex');
        };
        const currentStateByPath = new Map();
        const readCurrentState = async (updateKey, resolvedPath) => {
            const cached = currentStateByPath.get(updateKey);
            if (cached)
                return cached;
            const exists = await this.fileService.exists(resolvedPath);
            const content = exists ? await fs_1.promises.readFile(resolvedPath) : null;
            const state = {
                exists,
                contentHash: content ? hashMeaningfulDocumentation(content.toString('utf8')) : null,
                targetContentHash: content ? (0, crypto_1.createHash)('sha256').update(content).digest('hex') : null,
            };
            currentStateByPath.set(updateKey, state);
            return state;
        };
        const taskReviewService = new TaskGraphExecutionService_1.TaskGraphExecutionService(this.fileService);
        const approvedTaskReviewSnapshots = new Map();
        const readApprovedTaskReviewSnapshots = (taskId) => {
            const cached = approvedTaskReviewSnapshots.get(taskId);
            if (cached)
                return cached;
            const result = (async () => {
                if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(taskId))
                    return null;
                const task = taskById.get(taskId);
                const decision = String(task?.review?.decision || '').trim().toUpperCase();
                if (decision !== 'APPROVED' && decision !== 'APPROVED_WITH_CONCERNS')
                    return null;
                const validation = await taskReviewService.validateTaskReviewEvidence(featureDir, taskId);
                if (!validation.ready)
                    return null;
                const reviewArtifactPath = path_1.default.join(featureDir, 'artifacts', 'reviews', 'tasks', taskId, constants_1.FILE_NAMES.REVIEW);
                const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
                const dispatchId = String(review.data?.review_dispatch_id || '').trim();
                if (!dispatchId)
                    return null;
                const dispatchPath = path_1.default.join(featureDir, 'artifacts', 'agents', 'review-dispatches', `${dispatchId}.json`);
                if (!(await this.fileService.exists(dispatchPath)))
                    return null;
                const dispatch = await this.fileService.readJSON(dispatchPath);
                if (dispatch?.id !== dispatchId
                    || dispatch?.taskId !== taskId
                    || !Array.isArray(dispatch?.targetSnapshots)) {
                    return null;
                }
                return {
                    assignedAt: String(dispatch.assignedAt || ''),
                    targetSnapshots: dispatch.targetSnapshots,
                };
            })().catch(() => null);
            approvedTaskReviewSnapshots.set(taskId, result);
            return result;
        };
        const currentStateMatchesApprovedReview = async (latest, updateKey, currentState) => {
            if (!latest)
                return false;
            const review = await readApprovedTaskReviewSnapshots(latest.taskId);
            if (!review)
                return false;
            const dispatchCompletedAt = Date.parse(latest.completedAt);
            const reviewAssignedAt = Date.parse(review.assignedAt);
            if (!Number.isFinite(dispatchCompletedAt)
                || !Number.isFinite(reviewAssignedAt)
                || reviewAssignedAt < dispatchCompletedAt) {
                return false;
            }
            const snapshot = review.targetSnapshots.find((item) => normalize(item?.path).toLowerCase() === updateKey);
            if (!snapshot)
                return false;
            const snapshotExists = snapshot.kind
                ? snapshot.kind === 'file'
                : snapshot.exists === true;
            return currentState.exists === snapshotExists
                && (!currentState.exists || currentState.targetContentHash === snapshot.contentHash);
        };
        for (const [index, task] of tasks.entries()) {
            const taskId = typeof task?.id === 'string' && task.id.trim() ? task.id.trim() : `tasks[${index}]`;
            const rawUpdates = task?.documentation_updates;
            if (!Array.isArray(rawUpdates)) {
                checks.push({
                    name: `documentation_updates.${taskId}`,
                    status: 'fail',
                    message: `${taskId}.documentation_updates must be an array when the documentation contract is enabled`,
                });
                continue;
            }
            const targetFiles = Array.isArray(task.target_files)
                ? task.target_files.map(normalize).filter(Boolean)
                : [];
            const updates = rawUpdates.map(normalize).filter(Boolean);
            for (const update of updates)
                declared.add(update);
            const updateKeys = new Set(updates.map((update) => update.toLowerCase()));
            const targetKeys = new Set(targetFiles.map((target) => target.toLowerCase()));
            const undeclaredTargets = targetFiles
                .filter(isManagedDocumentationPath)
                .filter((target) => !updateKeys.has(target.toLowerCase()));
            if (undeclaredTargets.length > 0) {
                checks.push({
                    name: `documentation_updates.${taskId}.coverage`,
                    status: 'fail',
                    message: `${taskId} documentation targets are not declared in documentation_updates: ${undeclaredTargets.join(', ')}`,
                });
            }
            for (const update of updates) {
                const updateKey = update.toLowerCase();
                const resolvedUpdatePath = resolveSafeProjectPath(update);
                const safe = resolvedUpdatePath !== null;
                const targeted = targetKeys.has(updateKey);
                const currentState = resolvedUpdatePath
                    ? await readCurrentState(updateKey, resolvedUpdatePath)
                    : { exists: false, contentHash: null, targetContentHash: null };
                const latestDeclaredEvidence = latestDeclaredEvidenceForPath(updateKey);
                const latestEvidenceHasFinalState = typeof latestDeclaredEvidence?.evidence?.exists === 'boolean'
                    && Object.prototype.hasOwnProperty.call(latestDeclaredEvidence.evidence, 'contentHash');
                const latestEvidenceHashIsCanonical = typeof latestDeclaredEvidence?.evidence?.contentHash === 'string'
                    && /^[a-f0-9]{64}$/i.test(latestDeclaredEvidence.evidence.contentHash);
                const currentMatchesLatestEvidence = latestEvidenceHasFinalState
                    ? currentState.exists === latestDeclaredEvidence.evidence.exists
                        && (!currentState.exists
                            || !latestEvidenceHashIsCanonical
                            || currentState.contentHash === latestDeclaredEvidence.evidence.contentHash)
                    : currentState.exists;
                const currentMatchesApprovedReview = !currentMatchesLatestEvidence
                    && await currentStateMatchesApprovedReview(latestDeclaredEvidence, updateKey, currentState);
                const currentStateIsAuthorized = currentMatchesLatestEvidence || currentMatchesApprovedReview;
                checks.push({
                    name: `documentation_updates.${taskId}.${update}`,
                    status: safe && targeted && currentStateIsAuthorized ? 'pass' : 'fail',
                    message: !safe
                        ? `Unsafe documentation update path: ${update}`
                        : !targeted
                            ? `${update} is declared but missing from ${taskId}.target_files`
                            : !currentStateIsAuthorized
                                ? latestEvidenceHasFinalState
                                    ? `Current documentation state does not match the latest completed dispatch evidence or a later approved task review snapshot: ${update}`
                                    : `Declared documentation update does not exist and has no deletion evidence: ${update}`
                                : currentMatchesApprovedReview
                                    ? `Declared documentation update is task-scoped and matches a later approved task review snapshot: ${update}`
                                    : currentState.exists
                                        ? `Declared documentation update is present, task-scoped, and matches final evidence: ${update}`
                                        : `Declared documentation deletion is task-scoped and matches final evidence: ${update}`,
                });
                if (safe && targeted) {
                    const evidence = evidenceForTaskPath(taskId, updateKey);
                    const meaningfullyChanged = evidence.length > 0 ? evidenceStateChanged(evidence) : false;
                    checks.push({
                        name: `documentation_updates.${taskId}.${update}.meaningful_change`,
                        status: evidence.length > 0 ? (meaningfullyChanged ? 'pass' : 'fail') : currentState.exists ? 'warn' : 'fail',
                        message: evidence.length > 0
                            ? meaningfullyChanged
                                ? `Declared documentation update contains a meaningful final change across ${evidence.length} completed dispatch attempt(s): ${update}`
                                : `Declared documentation update did not change meaningfully from its first dispatch baseline to its final completed state: ${update}`
                            : currentState.exists
                                ? `Documentation baseline evidence is unavailable for ${update}; existence was verified for backward compatibility`
                                : `Documentation deletion evidence is unavailable for ${update}; the missing final state cannot be verified`,
                    });
                }
            }
        }
        if (checks.length === 0) {
            checks.push({
                name: 'documentation_updates',
                status: 'pass',
                message: 'Documentation update contract is enabled with no required documentation changes',
            });
        }
        return {
            enabled: true,
            declared: Array.from(declared).sort((left, right) => left.localeCompare(right)),
            checks,
        };
    }
    async analyzeReviewArtifactDocument(filePath, name, expectedReviewerRole, activatedSteps) {
        const content = await this.fileService.readFile(filePath);
        const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
        let parsed = null;
        let parseError = null;
        if (hasFrontmatter) {
            try {
                parsed = (0, helpers_1.parseFrontmatterDocument)(content);
            }
            catch (error) {
                parseError = error;
            }
        }
        const data = parsed?.data ?? {};
        const optionalStepsFieldValid = Array.isArray(data.optional_steps);
        const optionalSteps = optionalStepsFieldValid ? data.optional_steps : [];
        const createdFieldValid = (typeof data.created === 'string' && data.created.trim().length > 0) ||
            (data.created instanceof Date && !Number.isNaN(data.created.getTime()));
        const reviewerRoleValid = data.reviewer_role === expectedReviewerRole;
        const rawDecision = typeof data.decision === 'string' ? data.decision.trim().toUpperCase() : '';
        const missingRequiredFields = [];
        if (typeof data.feature !== 'string' || data.feature.trim().length === 0) {
            missingRequiredFields.push('feature');
        }
        if (!createdFieldValid) {
            missingRequiredFields.push('created');
        }
        if (typeof data.status !== 'string' || data.status.trim().length === 0) {
            missingRequiredFields.push('status');
        }
        if (!reviewerRoleValid) {
            missingRequiredFields.push('reviewer_role');
        }
        if (typeof data.decision !== 'string' || data.decision.trim().length === 0) {
            missingRequiredFields.push('decision');
        }
        if (!optionalStepsFieldValid) {
            missingRequiredFields.push('optional_steps');
        }
        const missingActivatedSteps = optionalStepsFieldValid
            ? activatedSteps.filter(step => !optionalSteps.includes(step))
            : [...activatedSteps];
        const invalidDecision = rawDecision.length > 0 && !REVIEW_ARTIFACT_ALLOWED_DECISION_SET.has(rawDecision);
        const unresolvedDecision = !REVIEW_ARTIFACT_TERMINAL_DECISION_SET.has(rawDecision);
        const concernDecision = rawDecision === 'APPROVED_WITH_CONCERNS';
        const checklistStructureValid = (0, ChecklistScan_1.hasChecklistItem)(parsed?.content ?? '');
        const uncheckedItems = (0, ChecklistScan_1.listUncheckedChecklistItems)(parsed?.content ?? '');
        const checklistComplete = hasFrontmatter &&
            parseError === null &&
            missingRequiredFields.length === 0 &&
            missingActivatedSteps.length === 0 &&
            !invalidDecision &&
            !unresolvedDecision &&
            checklistStructureValid &&
            uncheckedItems.length === 0;
        let frontmatterMessage = `${name} frontmatter parsed successfully`;
        if (!hasFrontmatter) {
            frontmatterMessage = `${name} is missing a valid frontmatter block`;
        }
        else if (parseError) {
            frontmatterMessage = `${name} frontmatter cannot be parsed: ${parseError.message}`;
        }
        let requiredFieldsMessage = `${name} has all required frontmatter fields`;
        if (!hasFrontmatter || parseError) {
            requiredFieldsMessage = `Cannot validate required fields in ${name} because frontmatter is invalid`;
        }
        else if (missingRequiredFields.length > 0) {
            requiredFieldsMessage = `Missing or invalid required fields in ${name}: ${missingRequiredFields.join(', ')}`;
        }
        let optionalStepsMessage = `All activated optional steps are present in ${name}`;
        if (!optionalStepsFieldValid) {
            optionalStepsMessage = `${name} frontmatter field optional_steps must be an array`;
        }
        else if (missingActivatedSteps.length > 0) {
            optionalStepsMessage = `Missing optional steps in ${name}: ${missingActivatedSteps.join(', ')}`;
        }
        let decisionMessage = `${name} decision is archive-ready`;
        let decisionStatus = 'pass';
        if (!hasFrontmatter || parseError) {
            decisionStatus = 'fail';
            decisionMessage = `Cannot validate decision in ${name} because frontmatter is invalid`;
        }
        else if (invalidDecision) {
            decisionStatus = 'fail';
            decisionMessage = `Invalid review decision in ${name}: ${rawDecision}`;
        }
        else if (unresolvedDecision) {
            decisionStatus = 'fail';
            decisionMessage = `Unresolved review decision in ${name}: ${rawDecision || '(missing)'}`;
        }
        else if (concernDecision) {
            decisionStatus = 'warn';
            decisionMessage = `${name} approved with concerns`;
        }
        let checklistStatus = 'pass';
        let checklistMessage = `${name} checklist is complete`;
        if (!hasFrontmatter || parseError) {
            checklistStatus = 'fail';
            checklistMessage = `${name} checklist cannot be validated because frontmatter is invalid`;
        }
        else if (!checklistStructureValid) {
            checklistStatus = 'fail';
            checklistMessage = `${name} must contain at least one Markdown checklist item`;
        }
        else if (uncheckedItems.length > 0) {
            checklistStatus = 'warn';
            checklistMessage = `${name} still has unchecked items`;
        }
        return {
            optionalSteps,
            decision: rawDecision,
            checklistComplete,
            archiveReady: checklistComplete,
            blockers: [
                ...(!hasFrontmatter || parseError ? [`${name} frontmatter must be valid`] : []),
                ...(missingRequiredFields.length > 0 ? [`Missing or invalid required fields in ${name}: ${missingRequiredFields.join(', ')}`] : []),
                ...(missingActivatedSteps.length > 0 ? [`Activated optional steps missing from ${name}: ${missingActivatedSteps.join(', ')}`] : []),
                ...(invalidDecision ? [`Invalid review decision in ${name}: ${rawDecision}`] : []),
                ...(unresolvedDecision ? [`Unresolved review decision in ${name}: ${rawDecision || '(missing)'}`] : []),
                ...(!checklistStructureValid ? [`${name} must contain at least one checklist item`] : []),
                ...(uncheckedItems.length > 0 ? [`${name} checklist must be complete before archiving`] : []),
            ],
            checks: [
                {
                    name: `${name}.frontmatter`,
                    status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                    message: frontmatterMessage,
                },
                {
                    name: `${name}.required_fields`,
                    status: hasFrontmatter && parseError === null && missingRequiredFields.length === 0 ? 'pass' : 'fail',
                    message: requiredFieldsMessage,
                },
                {
                    name: `${name}.optional_steps`,
                    status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                    message: optionalStepsMessage,
                },
                {
                    name: `${name}.decision`,
                    status: decisionStatus,
                    message: decisionMessage,
                },
                {
                    name: `${name}.checklist`,
                    status: checklistStatus,
                    message: checklistMessage,
                },
            ],
        };
    }
    async analyzeAgentWorkerStatusDocument(filePath) {
        const content = await this.fileService.readFile(filePath);
        const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
        let parsed = null;
        let parseError = null;
        if (hasFrontmatter) {
            try {
                parsed = (0, helpers_1.parseFrontmatterDocument)(content);
            }
            catch (error) {
                parseError = error;
            }
        }
        const data = parsed?.data ?? {};
        const createdFieldValid = (typeof data.created === 'string' && data.created.trim().length > 0) ||
            (data.created instanceof Date && !Number.isNaN(data.created.getTime()));
        const missingRequiredFields = [];
        if (typeof data.feature !== 'string' || data.feature.trim().length === 0) {
            missingRequiredFields.push('feature');
        }
        if (!createdFieldValid) {
            missingRequiredFields.push('created');
        }
        if (typeof data.status !== 'string' || data.status.trim().length === 0) {
            missingRequiredFields.push('status');
        }
        for (const field of AGENT_WORKER_STATUS_FIELDS) {
            if (typeof data[field] !== 'string' || data[field].trim().length === 0) {
                missingRequiredFields.push(field);
            }
        }
        const statuses = AGENT_WORKER_STATUS_FIELDS.reduce((accumulator, field) => {
            accumulator[field] = typeof data[field] === 'string' ? data[field].trim().toUpperCase() : '';
            return accumulator;
        }, {});
        const invalidStatuses = Object.entries(statuses)
            .filter(([, status]) => !AGENT_WORKER_ALLOWED_STATUS_SET.has(status))
            .map(([field, status]) => `${field}=${status || '(missing)'}`);
        const unresolvedStatuses = [
            ...AGENT_WORKER_STATUS_FIELDS.filter(field => field !== 'controller_status')
                .filter(field => !AGENT_WORKER_TERMINAL_STATUS_SET.has(statuses[field]))
                .map(field => `${field}=${statuses[field] || '(missing)'}`),
            ...(statuses.controller_status === 'DONE' ? [] : [`controller_status=${statuses.controller_status || '(missing)'}`]),
        ];
        const concernStatuses = Object.entries(statuses)
            .filter(([, status]) => status === 'DONE_WITH_CONCERNS')
            .map(([field]) => field);
        const checklistStructureValid = (0, ChecklistScan_1.hasChecklistItem)(parsed?.content ?? '');
        const uncheckedItems = (0, ChecklistScan_1.listUncheckedChecklistItems)(parsed?.content ?? '');
        const checklistComplete = hasFrontmatter &&
            parseError === null &&
            missingRequiredFields.length === 0 &&
            invalidStatuses.length === 0 &&
            unresolvedStatuses.length === 0 &&
            checklistStructureValid &&
            uncheckedItems.length === 0;
        let frontmatterMessage = 'artifacts/agents/worker-status.md frontmatter parsed successfully';
        if (!hasFrontmatter) {
            frontmatterMessage = 'artifacts/agents/worker-status.md is missing a valid frontmatter block';
        }
        else if (parseError) {
            frontmatterMessage = `artifacts/agents/worker-status.md frontmatter cannot be parsed: ${parseError.message}`;
        }
        let requiredFieldsMessage = 'artifacts/agents/worker-status.md has all required frontmatter fields';
        if (!hasFrontmatter || parseError) {
            requiredFieldsMessage = 'Cannot validate required fields in artifacts/agents/worker-status.md because frontmatter is invalid';
        }
        else if (missingRequiredFields.length > 0) {
            requiredFieldsMessage = `Missing or invalid required fields in artifacts/agents/worker-status.md: ${missingRequiredFields.join(', ')}`;
        }
        let statusMessage = 'Agent worker statuses are archive-ready';
        let statusCheckStatus = 'pass';
        if (!hasFrontmatter || parseError) {
            statusCheckStatus = 'fail';
            statusMessage = 'Cannot validate agent worker statuses because frontmatter is invalid';
        }
        else if (invalidStatuses.length > 0) {
            statusCheckStatus = 'fail';
            statusMessage = `Invalid agent worker statuses: ${invalidStatuses.join(', ')}`;
        }
        else if (unresolvedStatuses.length > 0) {
            statusCheckStatus = 'fail';
            statusMessage = `Unresolved agent worker statuses: ${unresolvedStatuses.join(', ')}`;
        }
        else if (concernStatuses.length > 0) {
            statusCheckStatus = 'warn';
            statusMessage = `Agent workers completed with concerns: ${concernStatuses.join(', ')}`;
        }
        let checklistStatus = 'pass';
        let checklistMessage = 'artifacts/agents/worker-status.md checklist is complete';
        if (!hasFrontmatter || parseError) {
            checklistStatus = 'fail';
            checklistMessage = 'artifacts/agents/worker-status.md checklist cannot be validated because frontmatter is invalid';
        }
        else if (!checklistStructureValid) {
            checklistStatus = 'fail';
            checklistMessage = 'artifacts/agents/worker-status.md must contain at least one Markdown checklist item';
        }
        else if (uncheckedItems.length > 0) {
            checklistStatus = 'warn';
            checklistMessage = 'artifacts/agents/worker-status.md still has unchecked items';
        }
        return {
            statuses,
            checklistComplete,
            archiveReady: checklistComplete,
            blockers: [
                ...(!hasFrontmatter || parseError ? ['artifacts/agents/worker-status.md frontmatter must be valid'] : []),
                ...(missingRequiredFields.length > 0 ? [`Missing or invalid required fields in artifacts/agents/worker-status.md: ${missingRequiredFields.join(', ')}`] : []),
                ...(invalidStatuses.length > 0 ? [`Invalid agent worker statuses: ${invalidStatuses.join(', ')}`] : []),
                ...(unresolvedStatuses.length > 0 ? [`Unresolved agent worker statuses: ${unresolvedStatuses.join(', ')}`] : []),
                ...(!checklistStructureValid ? ['artifacts/agents/worker-status.md must contain at least one checklist item'] : []),
                ...(uncheckedItems.length > 0 ? ['artifacts/agents/worker-status.md checklist must be complete before archiving'] : []),
            ],
            checks: [
                {
                    name: 'artifacts/agents/worker-status.md.frontmatter',
                    status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                    message: frontmatterMessage,
                },
                {
                    name: 'artifacts/agents/worker-status.md.required_fields',
                    status: hasFrontmatter && parseError === null && missingRequiredFields.length === 0 ? 'pass' : 'fail',
                    message: requiredFieldsMessage,
                },
                {
                    name: 'artifacts/agents/worker-status.md.worker_statuses',
                    status: statusCheckStatus,
                    message: statusMessage,
                },
                {
                    name: 'artifacts/agents/worker-status.md.checklist',
                    status: checklistStatus,
                    message: checklistMessage,
                },
            ],
        };
    }
    async analyzeVerificationDocument(filePath, activatedSteps) {
        const content = await this.fileService.readFile(filePath);
        const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
        let parsed = null;
        let parseError = null;
        if (hasFrontmatter) {
            try {
                parsed = (0, helpers_1.parseFrontmatterDocument)(content);
            }
            catch (error) {
                parseError = error;
            }
        }
        const data = parsed?.data ?? {};
        const optionalStepsFieldValid = Array.isArray(data.optional_steps);
        const passedOptionalStepsFieldValid = Array.isArray(data.passed_optional_steps);
        const optionalSteps = optionalStepsFieldValid ? data.optional_steps : [];
        const passedOptionalSteps = passedOptionalStepsFieldValid ? data.passed_optional_steps : [];
        const createdFieldValid = (typeof data.created === 'string' && data.created.trim().length > 0) ||
            (data.created instanceof Date && !Number.isNaN(data.created.getTime()));
        const missingRequiredFields = [];
        if (typeof data.feature !== 'string' || data.feature.trim().length === 0) {
            missingRequiredFields.push('feature');
        }
        if (!createdFieldValid) {
            missingRequiredFields.push('created');
        }
        if (typeof data.status !== 'string' || data.status.trim().length === 0) {
            missingRequiredFields.push('status');
        }
        if (!optionalStepsFieldValid) {
            missingRequiredFields.push('optional_steps');
        }
        if (!passedOptionalStepsFieldValid) {
            missingRequiredFields.push('passed_optional_steps');
        }
        const missing = optionalStepsFieldValid
            ? activatedSteps.filter(step => !optionalSteps.includes(step))
            : [...activatedSteps];
        const checklistStructureValid = (0, ChecklistScan_1.hasChecklistItem)(parsed?.content ?? '');
        const uncheckedItems = (0, ChecklistScan_1.listUncheckedChecklistItems)(parsed?.content ?? '');
        const checklistComplete = hasFrontmatter &&
            parseError === null &&
            missingRequiredFields.length === 0 &&
            checklistStructureValid &&
            uncheckedItems.length === 0;
        let frontmatterMessage = 'verification.md frontmatter parsed successfully';
        if (!hasFrontmatter) {
            frontmatterMessage = 'verification.md is missing a valid frontmatter block';
        }
        else if (parseError) {
            frontmatterMessage = `verification.md frontmatter cannot be parsed: ${parseError.message}`;
        }
        let requiredFieldsMessage = 'verification.md has all required frontmatter fields';
        if (!hasFrontmatter || parseError) {
            requiredFieldsMessage = 'Cannot validate required fields in verification.md because frontmatter is invalid';
        }
        else if (missingRequiredFields.length > 0) {
            requiredFieldsMessage = `Missing or invalid required fields in verification.md: ${missingRequiredFields.join(', ')}`;
        }
        let optionalStepsMessage = 'All activated optional steps are present in verification.md';
        if (!optionalStepsFieldValid) {
            optionalStepsMessage = 'verification.md frontmatter field optional_steps must be an array';
        }
        else if (missing.length > 0) {
            optionalStepsMessage = `Missing optional steps in verification.md: ${missing.join(', ')}`;
        }
        let checklistStatus = 'pass';
        let checklistMessage = 'verification.md checklist is complete';
        if (!hasFrontmatter || parseError) {
            checklistStatus = 'fail';
            checklistMessage = 'verification.md checklist cannot be validated because frontmatter is invalid';
        }
        else if (!checklistStructureValid) {
            checklistStatus = 'fail';
            checklistMessage = 'verification.md must contain at least one Markdown checklist item';
        }
        else if (uncheckedItems.length > 0) {
            checklistStatus = 'warn';
            checklistMessage = 'verification.md still has unchecked items';
        }
        const debugEvidenceCheck = await this.analyzeDebugEvidenceForVerificationDocument(filePath);
        const tddEvidenceCheck = await this.analyzeTddEvidenceForVerificationDocument(filePath);
        const evidenceCheck = await this.analyzeVerificationEvidenceForVerificationDocument(filePath);
        return {
            optionalSteps,
            passedOptionalSteps,
            checklistComplete,
            checks: [
                {
                    name: 'verification.md.frontmatter',
                    status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                    message: frontmatterMessage,
                },
                {
                    name: 'verification.md.required_fields',
                    status: hasFrontmatter && parseError === null && missingRequiredFields.length === 0 ? 'pass' : 'fail',
                    message: requiredFieldsMessage,
                },
                {
                    name: 'verification.md.optional_steps',
                    status: optionalStepsFieldValid && missing.length === 0 ? 'pass' : 'fail',
                    message: optionalStepsMessage,
                },
                {
                    name: 'verification.md.checklist',
                    status: checklistStatus,
                    message: checklistMessage,
                },
                ...(debugEvidenceCheck ? [debugEvidenceCheck] : []),
                tddEvidenceCheck,
                evidenceCheck,
            ],
        };
    }
    async analyzeVerificationEvidenceForVerificationDocument(filePath) {
        const changePath = path_1.default.dirname(filePath);
        const evidencePath = path_1.default.join(changePath, 'artifacts', 'agents', 'verification-evidence.json');
        if (!(await this.fileService.exists(evidencePath))) {
            return {
                name: 'verification.md.evidence',
                status: 'warn',
                message: 'No verification evidence recorded at artifacts/agents/verification-evidence.json',
            };
        }
        try {
            const evidence = await this.fileService.readJSON(evidencePath);
            const records = Array.isArray(evidence?.records) ? evidence.records : [];
            const latest = records[records.length - 1];
            if (!latest || typeof latest.status !== 'string' || typeof latest.recordedAt !== 'string') {
                return {
                    name: 'verification.md.evidence',
                    status: 'warn',
                    message: 'verification-evidence.json has no usable verification records',
                };
            }
            const normalizedStatus = latest.status.trim().toUpperCase();
            if (normalizedStatus === 'FAILED' || normalizedStatus === 'BLOCKED') {
                return {
                    name: 'verification.md.evidence',
                    status: 'fail',
                    message: `Latest verification evidence is ${normalizedStatus}`,
                };
            }
            if (normalizedStatus !== 'PASSED') {
                return {
                    name: 'verification.md.evidence',
                    status: 'warn',
                    message: `Latest verification evidence is ${normalizedStatus}`,
                };
            }
            return {
                name: 'verification.md.evidence',
                status: 'pass',
                message: `Latest verification evidence passed: ${latest.command || latest.id || 'recorded command'}`,
            };
        }
        catch (error) {
            return {
                name: 'verification.md.evidence',
                status: 'fail',
                message: `verification-evidence.json cannot be parsed: ${error.message}`,
            };
        }
    }
    async analyzeTddEvidenceForVerificationDocument(filePath) {
        const changePath = path_1.default.dirname(filePath);
        const evidencePath = path_1.default.join(changePath, 'artifacts', 'agents', 'tdd-evidence.json');
        if (!(await this.fileService.exists(evidencePath))) {
            return {
                name: 'verification.md.tdd_evidence',
                status: 'warn',
                message: 'No TDD evidence recorded at artifacts/agents/tdd-evidence.json',
            };
        }
        try {
            const evidence = await this.fileService.readJSON(evidencePath);
            const records = Array.isArray(evidence?.records)
                ? evidence.records.filter((record) => typeof record?.phase === 'string' &&
                    typeof record?.status === 'string' &&
                    typeof record?.recordedAt === 'string')
                : [];
            const latest = records[records.length - 1];
            if (!latest) {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'warn',
                    message: 'tdd-evidence.json has no usable TDD records',
                };
            }
            const normalizedPhase = latest.phase.trim().toLowerCase();
            const normalizedStatus = latest.status.trim().toUpperCase();
            if (normalizedStatus === 'BLOCKED') {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'fail',
                    message: `Latest TDD evidence is BLOCKED in ${normalizedPhase} phase`,
                };
            }
            if ((normalizedPhase === 'green' || normalizedPhase === 'refactor') &&
                (normalizedStatus === 'FAILED' || normalizedStatus === 'BLOCKED')) {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'fail',
                    message: `Latest ${normalizedPhase} TDD evidence is ${normalizedStatus}`,
                };
            }
            if (normalizedPhase === 'red') {
                if (normalizedStatus === 'PASSED') {
                    return {
                        name: 'verification.md.tdd_evidence',
                        status: 'fail',
                        message: 'Latest red TDD evidence passed; red phase should prove the new test can fail before implementation',
                    };
                }
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'warn',
                    message: `Latest TDD evidence is red/${normalizedStatus}; record later passing green or refactor evidence`,
                };
            }
            if (normalizedStatus === 'SKIPPED') {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'warn',
                    message: 'Latest TDD evidence is SKIPPED; keep a concrete reason in verification.md',
                };
            }
            if (normalizedStatus !== 'PASSED') {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'warn',
                    message: `Latest TDD evidence is ${normalizedPhase}/${normalizedStatus}`,
                };
            }
            const latestIndex = records.length - 1;
            const hasEarlierRedFailure = records
                .slice(0, latestIndex)
                .some((record) => record.phase.trim().toLowerCase() === 'red' &&
                record.status.trim().toUpperCase() === 'FAILED');
            const latestTaskUpdate = await this.getLatestUpdatedAt([
                path_1.default.join(changePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN),
                path_1.default.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
                path_1.default.join(changePath, constants_1.FILE_NAMES.TASKS),
            ]);
            const recordedAt = new Date(latest.recordedAt).getTime();
            const sourceUpdatedAt = latestTaskUpdate
                ? new Date(latestTaskUpdate).getTime()
                : 0;
            if (Number.isFinite(recordedAt) && sourceUpdatedAt > recordedAt) {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'warn',
                    message: `Latest passing TDD evidence is older than task planning artifacts (${latest.recordedAt})`,
                };
            }
            if (!hasEarlierRedFailure) {
                return {
                    name: 'verification.md.tdd_evidence',
                    status: 'fail',
                    message: `Latest ${normalizedPhase} TDD evidence passed, but no earlier red failure was recorded`,
                };
            }
            return {
                name: 'verification.md.tdd_evidence',
                status: 'pass',
                message: `TDD evidence completed through ${normalizedPhase}: ${latest.command || latest.id || 'recorded command'}`,
            };
        }
        catch (error) {
            return {
                name: 'verification.md.tdd_evidence',
                status: 'fail',
                message: `tdd-evidence.json cannot be parsed: ${error.message}`,
            };
        }
    }
    async analyzeDebugEvidenceForVerificationDocument(filePath) {
        const changePath = path_1.default.dirname(filePath);
        const evidencePath = path_1.default.join(changePath, 'artifacts', 'agents', 'debug-evidence.json');
        if (!(await this.fileService.exists(evidencePath))) {
            return null;
        }
        try {
            const evidence = await this.fileService.readJSON(evidencePath);
            const records = Array.isArray(evidence?.records)
                ? evidence.records.filter((record) => typeof record?.symptom === 'string' &&
                    typeof record?.status === 'string' &&
                    typeof record?.recordedAt === 'string')
                : [];
            const latest = records[records.length - 1];
            if (!latest) {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'warn',
                    message: 'debug-evidence.json has no usable debug records',
                };
            }
            const normalizedStatus = latest.status.trim().toUpperCase();
            if (normalizedStatus === 'BLOCKED') {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'fail',
                    message: 'Latest debug evidence is BLOCKED',
                };
            }
            if (normalizedStatus === 'CONFIRMED') {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'warn',
                    message: 'Latest debug evidence confirmed a root cause but does not record a verified fix',
                };
            }
            if (normalizedStatus === 'SKIPPED') {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'warn',
                    message: 'Latest debug evidence is SKIPPED; keep a concrete reason in verification.md',
                };
            }
            if (normalizedStatus !== 'FIXED') {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'fail',
                    message: `Latest debug evidence has unsupported status ${normalizedStatus || '(missing)'}`,
                };
            }
            if (typeof latest.rootCause !== 'string' || latest.rootCause.trim().length === 0) {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'fail',
                    message: 'Latest fixed debug evidence is missing rootCause',
                };
            }
            const latestTaskUpdate = await this.getLatestUpdatedAt([
                path_1.default.join(changePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN),
                path_1.default.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
                path_1.default.join(changePath, constants_1.FILE_NAMES.TASKS),
            ]);
            const recordedAt = new Date(latest.recordedAt).getTime();
            const sourceUpdatedAt = latestTaskUpdate
                ? new Date(latestTaskUpdate).getTime()
                : 0;
            if (Number.isFinite(recordedAt) && sourceUpdatedAt > recordedAt) {
                return {
                    name: 'verification.md.debug_evidence',
                    status: 'warn',
                    message: `Latest fixed debug evidence is older than task planning artifacts (${latest.recordedAt})`,
                };
            }
            return {
                name: 'verification.md.debug_evidence',
                status: 'pass',
                message: `Debug evidence fixed root cause: ${latest.rootCause}`,
            };
        }
        catch (error) {
            return {
                name: 'verification.md.debug_evidence',
                status: 'fail',
                message: `debug-evidence.json cannot be parsed: ${error.message}`,
            };
        }
    }
    maxUpdatedAt(values) {
        const timestamps = values.filter((value) => Boolean(value));
        if (timestamps.length === 0) {
            return null;
        }
        timestamps.sort();
        return timestamps[timestamps.length - 1] ?? null;
    }
    async collectKnowledgeIndexSourcePaths(rootDir, config) {
        const collected = [];
        const archivedDocumentNames = new Set([
            constants_1.FILE_NAMES.STATE,
            constants_1.FILE_NAMES.PROPOSAL,
            constants_1.FILE_NAMES.DESIGN,
            constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
            constants_1.FILE_NAMES.TASKS,
            constants_1.FILE_NAMES.VERIFICATION,
            constants_1.FILE_NAMES.REVIEW,
        ]);
        const scan = async (currentDir, mode) => {
            if (!(await this.fileService.exists(currentDir)))
                return;
            const entries = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (mode === 'archives' && entry.name === constants_1.DIR_NAMES.ARTIFACTS) {
                        const finalReviewPath = path_1.default.join(fullPath, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.FINAL_REVIEW);
                        if (await this.fileService.exists(finalReviewPath))
                            collected.push(finalReviewPath);
                        continue;
                    }
                    await scan(fullPath, mode);
                    continue;
                }
                if ((mode === 'docs' && entry.name.toLowerCase().endsWith('.md'))
                    || (mode === 'archives' && archivedDocumentNames.has(entry.name))) {
                    collected.push(fullPath);
                }
            }
        };
        await scan(this.resolveManagedPath(rootDir, constants_1.DIR_NAMES.DOCS, config), 'docs');
        await scan(this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config), 'archives');
        return collected.sort((left, right) => left.localeCompare(right));
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
    async resolveArchivePath(archivedRoot, featureName, config) {
        const archiveLayout = config?.archive?.layout === 'month-day' ? 'month-day' : 'flat';
        const archiveDate = this.getLocalArchiveDateParts();
        if (archiveLayout === 'month-day') {
            const archiveDayRoot = path_1.default.join(archivedRoot, archiveDate.month, archiveDate.day);
            await this.fileService.ensureDir(archiveDayRoot);
            const archiveLeafName = await this.resolveArchiveLeafName(archiveDayRoot, featureName);
            return path_1.default.join(archiveDayRoot, archiveLeafName);
        }
        const archiveDirName = await this.resolveLegacyArchiveDirName(archivedRoot, archiveDate.day, featureName);
        return path_1.default.join(archivedRoot, archiveDirName);
    }
    async resolveArchiveLeafName(archiveDayRoot, featureName) {
        let candidate = featureName;
        let archiveIndex = 2;
        while (await this.fileService.exists(path_1.default.join(archiveDayRoot, candidate))) {
            candidate = `${featureName}-${archiveIndex}`;
            archiveIndex += 1;
        }
        return candidate;
    }
    async resolveLegacyArchiveDirName(archivedRoot, archiveDay, featureName) {
        const baseName = `${archiveDay}-${featureName}`;
        let candidate = baseName;
        let archiveIndex = 2;
        while (await this.fileService.exists(path_1.default.join(archivedRoot, candidate))) {
            candidate = `${baseName}-${archiveIndex}`;
            archiveIndex += 1;
        }
        return candidate;
    }
    getLocalArchiveDateParts() {
        const now = new Date();
        const year = String(now.getFullYear());
        const monthNumber = String(now.getMonth() + 1).padStart(2, '0');
        const dayNumber = String(now.getDate()).padStart(2, '0');
        return {
            month: `${year}-${monthNumber}`,
            day: `${year}-${monthNumber}-${dayNumber}`,
        };
    }
    toRelativePath(rootDir, filePath) {
        return path_1.default.relative(rootDir, filePath).replace(/\\/g, '/');
    }
    async findProjectRootFromPath(startPath) {
        let currentPath = path_1.default.resolve(startPath);
        while (true) {
            const skillrcPath = path_1.default.join(currentPath, constants_1.FILE_NAMES.SKILLRC);
            if (await this.fileService.exists(skillrcPath)) {
                return currentPath;
            }
            const parentPath = path_1.default.dirname(currentPath);
            if (parentPath === currentPath) {
                break;
            }
            currentPath = parentPath;
        }
        throw new Error('Unable to locate project root containing .skillrc from the provided path.');
    }
    toSlug(value) {
        return value
            .toLowerCase()
            .replace(/\.md$/i, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    async scanDocsInDirectory(rootDir, docSection) {
        const config = await this.configManager.loadConfigOrNull(rootDir);
        const targetDir = this.resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.DOCS}/${docSection}`, config);
        if (!(await this.fileService.exists(targetDir))) {
            return [];
        }
        const entries = await fs_1.promises.readdir(targetDir, { withFileTypes: true });
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
