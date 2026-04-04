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
exports.NewCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const PathUtils_1 = require("../utils/PathUtils");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");
const BaseCommand_1 = require("./BaseCommand");
class NewCommand extends BaseCommand_1.BaseCommand {
    async execute(featureName, rootDir, options = {}) {
        try {
            this.validateArgs([featureName], 1);
            services_1.services.validationService.validateFeatureName(featureName);
            const targetDir = rootDir || process.cwd();
            const placement = options.placement === constants_1.DIR_NAMES.QUEUED ? constants_1.DIR_NAMES.QUEUED : constants_1.DIR_NAMES.ACTIVE;
            const featureDir = PathUtils_1.PathUtils.getChangeDir(targetDir, placement, featureName);
            this.logger.info(`Creating ${placement === constants_1.DIR_NAMES.QUEUED ? 'queued change' : 'change'}: ${featureName}`);
            await this.ensureChangeNameAvailable(targetDir, featureName);
            await this.ensureSingleActiveMode(targetDir, placement, featureName);
            await services_1.services.fileService.ensureDir(path.join(targetDir, constants_1.DIR_NAMES.CHANGES, placement));
            await services_1.services.fileService.ensureDir(featureDir);
            const config = await services_1.services.configManager.loadConfig(targetDir);
            const composer = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);
            const flags = this.normalizeFlags(options.flags);
            const activatedSteps = composer.getActivatedSteps(flags);
            const validation = composer.validateFlags(flags);
            if (validation.unsupported.length > 0) {
                this.warn(`Unsupported workflow flags: ${validation.unsupported.join(', ')}`);
            }
            const projectContext = await services_1.services.projectService.getFeatureProjectContext(targetDir, []);
            const documentLanguage = await this.resolveDocumentLanguage(targetDir, config);
            await services_1.services.fileService.writeJSON(path.join(featureDir, constants_1.FILE_NAMES.STATE), services_1.services.stateManager.createInitialState(featureName, [], config.mode, placement === constants_1.DIR_NAMES.QUEUED
                ? {
                    queued: true,
                    source: options.source,
                }
                : undefined));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.PROPOSAL), services_1.services.templateEngine.generateProposalTemplate({
                feature: featureName,
                mode: config.mode,
                placement,
                projectContext,
                flags,
                optionalSteps: activatedSteps,
                documentLanguage,
                projectRoot: targetDir,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.PROPOSAL),
            }));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.TASKS), services_1.services.templateEngine.generateTasksTemplate({
                feature: featureName,
                mode: config.mode,
                placement,
                projectContext,
                flags,
                optionalSteps: activatedSteps,
                documentLanguage,
                projectRoot: targetDir,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.TASKS),
            }));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.VERIFICATION), services_1.services.templateEngine.generateVerificationTemplate({
                feature: featureName,
                mode: config.mode,
                placement,
                projectContext,
                flags,
                optionalSteps: activatedSteps,
                documentLanguage,
                projectRoot: targetDir,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.VERIFICATION),
            }));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.REVIEW), services_1.services.templateEngine.generateReviewTemplate({
                feature: featureName,
                mode: config.mode,
                placement,
                projectContext,
                flags,
                optionalSteps: activatedSteps,
                documentLanguage,
                projectRoot: targetDir,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.REVIEW),
            }));
            await this.writePluginArtifacts(featureDir, activatedSteps);
            this.success(`${placement === constants_1.DIR_NAMES.QUEUED ? 'Queued change' : 'Change'} ${featureName} created at ${featureDir}`);
            if (flags.length > 0) {
                this.info(`  Flags: ${flags.join(', ')}`);
            }
            if (activatedSteps.length > 0) {
                this.info(`  Activated optional steps: ${activatedSteps.join(', ')}`);
            }
        }
        catch (error) {
            this.error(`Failed to create change: ${error}`);
            throw error;
        }
    }
    async resolveDocumentLanguage(targetDir, config) {
        const configLanguage = this.normalizeDocumentLanguage(config?.documentLanguage);
        if (configLanguage) {
            return configLanguage;
        }
        const manifestLanguage = await this.readDocumentLanguageFromAssetManifest(targetDir);
        if (manifestLanguage) {
            return manifestLanguage;
        }
        const guideLanguage = await this.readDocumentLanguageFromAiGuide(targetDir);
        if (guideLanguage) {
            return guideLanguage;
        }
        return 'en-US';
    }
    normalizeDocumentLanguage(input) {
        return input === 'en-US' || input === 'zh-CN' || input === 'ja-JP' || input === 'ar' ? input : null;
    }
    async readDocumentLanguageFromAssetManifest(targetDir) {
        const manifestPath = path.join(targetDir, '.ospec', 'asset-sources.json');
        if (!(await services_1.services.fileService.exists(manifestPath))) {
            return null;
        }
        try {
            const manifest = await services_1.services.fileService.readJSON(manifestPath);
            const manifestLanguage = this.normalizeDocumentLanguage(manifest?.documentLanguage);
            if (manifestLanguage) {
                return manifestLanguage;
            }
            const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
            for (const targetRelativePath of ['for-ai/ai-guide.md', 'for-ai/execution-protocol.md']) {
                const asset = assets.find(item => item?.targetRelativePath === targetRelativePath);
                const sourceRelativePath = typeof asset?.sourceRelativePath === 'string' ? asset.sourceRelativePath : '';
                if (sourceRelativePath.includes('/ar/')) {
                    return 'ar';
                }
                if (sourceRelativePath.includes('/ja-JP/')) {
                    return 'ja-JP';
                }
                if (sourceRelativePath.includes('/en-US/')) {
                    return 'en-US';
                }
                if (sourceRelativePath.includes('/zh-CN/')) {
                    return 'zh-CN';
                }
            }
        }
        catch {
            return null;
        }
        return null;
    }
    async readDocumentLanguageFromAiGuide(targetDir) {
        const aiGuidePath = path.join(targetDir, 'for-ai', 'ai-guide.md');
        if (!(await services_1.services.fileService.exists(aiGuidePath))) {
            return null;
        }
        try {
            const content = await services_1.services.fileService.readFile(aiGuidePath);
            return this.detectDocumentLanguageFromText(content) || null;
        }
        catch {
            return null;
        }
        return null;
    }
    detectDocumentLanguageFromText(content) {
        if (typeof content !== 'string' || content.trim().length === 0) {
            return null;
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
        return null;
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
    async ensureChangeNameAvailable(targetDir, featureName) {
        const activeDir = PathUtils_1.PathUtils.getChangeDir(targetDir, constants_1.DIR_NAMES.ACTIVE, featureName);
        const queuedDir = PathUtils_1.PathUtils.getChangeDir(targetDir, constants_1.DIR_NAMES.QUEUED, featureName);
        const conflicts = [];
        if (await services_1.services.fileService.exists(activeDir)) {
            conflicts.push('changes/active');
        }
        if (await services_1.services.fileService.exists(queuedDir)) {
            conflicts.push('changes/queued');
        }
        if (conflicts.length === 0) {
            return;
        }
        throw new Error(`Change ${featureName} already exists in ${conflicts.join(' and ')}. Continue the existing change instead of creating a duplicate.`);
    }
    async ensureSingleActiveMode(targetDir, placement, featureName) {
        if (placement !== constants_1.DIR_NAMES.ACTIVE) {
            return;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(targetDir);
        if (activeNames.length === 0) {
            return;
        }
        if (activeNames.length === 1) {
            const activeName = activeNames[0];
            const activeChangePath = path.join(targetDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE, activeName);
            const progressCommand = (0, helpers_1.formatCliCommand)('ospec', 'progress', activeChangePath);
            const queueCommand = (0, helpers_1.formatCliCommand)('ospec', 'queue', 'add', featureName, targetDir);
            throw new Error(`A single active change is the default workflow, but "${activeName}" is already active. Continue it with "${progressCommand}" or create queued work explicitly with "${queueCommand}".`);
        }
        const queueCommand = (0, helpers_1.formatCliCommand)('ospec', 'queue', 'add', featureName, targetDir);
        throw new Error(`A single active change is the default workflow, but ${activeNames.length} active changes already exist: ${activeNames.join(', ')}. Resolve the repository back to one active change before creating another, or add new work with "${queueCommand}".`);
    }
    async writePluginArtifacts(featureDir, activatedSteps) {
        const checkpointSteps = activatedSteps.filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
        if (checkpointSteps.length > 0) {
            const checkpointDir = path.join(featureDir, 'artifacts', 'checkpoint');
            await services_1.services.fileService.ensureDir(checkpointDir);
            await services_1.services.fileService.ensureDir(path.join(checkpointDir, 'screenshots'));
            await services_1.services.fileService.ensureDir(path.join(checkpointDir, 'diffs'));
            await services_1.services.fileService.ensureDir(path.join(checkpointDir, 'traces'));
            await services_1.services.fileService.writeJSON(path.join(checkpointDir, 'gate.json'), {
                plugin: 'checkpoint',
                status: 'pending',
                blocking: true,
                executed_at: '',
                steps: Object.fromEntries(checkpointSteps.map(step => [step, {
                        status: 'pending',
                        issues: [],
                    }])),
                stitch_sync: {
                    attempted: false,
                    status: 'skipped',
                    message: '',
                },
                issues: [],
            });
            await services_1.services.fileService.writeJSON(path.join(checkpointDir, 'result.json'), {
                plugin: 'checkpoint',
                status: 'pending',
                executed_at: '',
                active_steps: checkpointSteps,
                output: {},
            });
            await services_1.services.fileService.writeFile(path.join(checkpointDir, 'summary.md'), '# Checkpoint Summary\n\n- Status: pending\n- The checkpoint runner has not been executed yet.\n');
        }
        if (!activatedSteps.includes('stitch_design_review')) {
            return;
        }
        const stitchDir = path.join(featureDir, 'artifacts', 'stitch');
        await services_1.services.fileService.ensureDir(stitchDir);
        await services_1.services.fileService.writeJSON(path.join(stitchDir, 'approval.json'), {
            plugin: 'stitch',
            capability: 'page_design_review',
            step: 'stitch_design_review',
            status: 'pending',
            blocking: true,
            preview_url: '',
            submitted_at: '',
            reviewed_at: '',
            reviewer: '',
            notes: '',
        });
    }
    normalizeFlags(flags) {
        if (!Array.isArray(flags)) {
            return [];
        }
        return Array.from(new Set(flags
            .map(flag => String(flag).trim())
            .filter(Boolean)));
    }
}
exports.NewCommand = NewCommand;
