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
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const PathUtils_1 = require("../utils/PathUtils");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const SessionCommand_1 = require("./SessionCommand");
const CHANGE_CREATION_LOCK_FILE = '.change-creation.lock';
const CHANGE_CREATION_LOCK_TIMEOUT_MS = 30 * 1000;
const STALE_CHANGE_CREATION_LOCK_MS = 2 * 60 * 1000;
const CHANGE_CREATION_LOCK_HEARTBEAT_MS = 30 * 1000;
class NewCommand extends BaseCommand_1.BaseCommand {
    async execute(featureName, rootDir, options = {}) {
        let creationLease = null;
        let createdFeatureDir = null;
        let rollbackProjectRoot = null;
        let rollbackPlacement = null;
        let sessionBriefBackup = null;
        try {
            this.validateArgs([featureName], 1);
            services_1.services.validationService.validateFeatureName(featureName);
            const targetDir = rootDir || process.cwd();
            const config = await services_1.services.configManager.loadConfig(targetDir);
            const placement = options.placement === constants_1.DIR_NAMES.QUEUED
                ? constants_1.DIR_NAMES.QUEUED
                : constants_1.DIR_NAMES.ACTIVE;
            const featureDir = PathUtils_1.PathUtils.getChangeDir(targetDir, placement, featureName, config);
            this.logger.info(`Creating ${placement === constants_1.DIR_NAMES.QUEUED ? 'queued change' : 'change'}: ${featureName}`);
            creationLease = await this.acquireChangeCreationLease(targetDir, config);
            if (placement === constants_1.DIR_NAMES.ACTIVE) {
                const sessionDir = path.join(targetDir, '.ospec');
                const jsonPath = path.join(sessionDir, 'session-brief.json');
                const markdownPath = path.join(sessionDir, 'session-brief.md');
                sessionBriefBackup = {
                    json: await services_1.services.fileService.exists(jsonPath) ? await services_1.services.fileService.readFile(jsonPath) : null,
                    markdown: await services_1.services.fileService.exists(markdownPath) ? await services_1.services.fileService.readFile(markdownPath) : null,
                };
            }
            await this.ensureChangeNameAvailable(targetDir, featureName, config);
            await this.ensureSingleActiveMode(targetDir, placement, featureName, config);
            await services_1.services.fileService.ensureDir((0, ProjectLayout_1.resolveManagedPath)(targetDir, `${constants_1.DIR_NAMES.CHANGES}/${placement}`, config));
            await fs_1.promises.mkdir(featureDir);
            createdFeatureDir = featureDir;
            rollbackProjectRoot = targetDir;
            rollbackPlacement = placement;
            const composer = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);
            const flags = this.normalizeFlags(options.flags);
            const workflowProfile = (0, WorkflowProfile_1.normalizeWorkflowProfileId)(options.workflowProfile) || 'change';
            const isGoalWorkflow = workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE;
            const activatedSteps = composer.getActivatedSteps(flags);
            const validation = composer.validateFlags(flags);
            if (validation.unsupported.length > 0) {
                this.warn(`Unsupported workflow flags: ${validation.unsupported.join(', ')}`);
            }
            const projectContext = await services_1.services.projectService.getFeatureProjectContext(targetDir, []);
            const documentLanguage = await this.resolveDocumentLanguage(targetDir, config);
            const templateContext = {
                feature: featureName,
                mode: config.mode,
                placement,
                workflowProfile,
                projectContext,
                flags,
                optionalSteps: activatedSteps,
                documentLanguage,
                projectRoot: targetDir,
            };
            await services_1.services.fileService.writeJSON(path.join(featureDir, constants_1.FILE_NAMES.STATE), services_1.services.stateManager.createInitialState(featureName, [], config.mode, placement === constants_1.DIR_NAMES.QUEUED
                ? {
                    queued: true,
                    source: options.source,
                    workflowProfileId: workflowProfile,
                }
                : {
                    workflowProfileId: workflowProfile,
                }));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.PROPOSAL), services_1.services.templateEngine.generateProposalTemplate({
                ...templateContext,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.PROPOSAL),
            }));
            if (isGoalWorkflow) {
                await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.DESIGN), services_1.services.templateEngine.generateDesignTemplate({
                    ...templateContext,
                    documentPath: path.join(featureDir, constants_1.FILE_NAMES.DESIGN),
                }));
                await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN), services_1.services.templateEngine.generateImplementationPlanTemplate({
                    ...templateContext,
                    documentPath: path.join(featureDir, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN),
                }));
            }
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.TASKS), services_1.services.templateEngine.generateTasksTemplate({
                ...templateContext,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.TASKS),
            }));
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.VERIFICATION), services_1.services.templateEngine.generateVerificationTemplate({
                ...templateContext,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.VERIFICATION),
            }));
            if (isGoalWorkflow) {
                const agentArtifactsDir = path.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS);
                await services_1.services.fileService.ensureDir(agentArtifactsDir);
                await services_1.services.fileService.writeFile(path.join(agentArtifactsDir, constants_1.FILE_NAMES.TASK_GRAPH), services_1.services.templateEngine.generateTaskGraphTemplate({
                    ...templateContext,
                    documentPath: path.join(agentArtifactsDir, constants_1.FILE_NAMES.TASK_GRAPH),
                }));
                await services_1.services.fileService.writeFile(path.join(agentArtifactsDir, constants_1.FILE_NAMES.AGENT_WORKER_STATUS), services_1.services.templateEngine.generateAgentWorkerStatusTemplate({
                    ...templateContext,
                    documentPath: path.join(agentArtifactsDir, constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                }));
            }
            await services_1.services.fileService.writeFile(path.join(featureDir, constants_1.FILE_NAMES.REVIEW), services_1.services.templateEngine.generateReviewTemplate({
                ...templateContext,
                documentPath: path.join(featureDir, constants_1.FILE_NAMES.REVIEW),
            }));
            await this.writePluginArtifacts(targetDir, featureDir, activatedSteps);
            if (isGoalWorkflow) {
                const loopConfig = await services_1.services.loopService.scaffold(featureDir, {
                    level: options.level,
                    primitive: 'goal',
                    target: options.target,
                    executionModel: options.executionModel,
                    interactive: options.harnessInteractive,
                    nativeSubagentCapability: options.nativeSubagentCapability,
                    nativeLoopCapability: options.nativeGoalCapability,
                });
                this.info(`  Loop initialized: level ${loopConfig.level}, primitive ${loopConfig.primitive}, ${loopConfig.executionModel} (${loopConfig.schedule.lifecycle})`);
                if (loopConfig.level === 'L1') {
                    this.info('  L1 is report-only and will not launch implementation, review, or verification subagents. For executable work, the controlling AI must present the safety-level decision and the user must choose L2 or L3.');
                }
                else if (loopConfig.executionModel === 'controller' && loopConfig.capability?.controllerAvailable) {
                    const controllerCommand = (0, helpers_1.formatCliCommand)('ospec', 'loop', 'run', featureDir, '--once', '--json');
                    this.info(`  IDE controller handoff: keep this AI session active. After required decisions, independent document reviews, and workspace gates are ready, run "${controllerCommand}"; for every non-empty actions[] batch launch one fresh IDE-native subagent per item, wait for all results, record each completionCommand/evidence, and tick again immediately. When actions[] is empty and pending is present, observe only and never relaunch it. Return only on a real gate, paused/stopped/done, or explicit user pause.`);
                }
                else {
                    this.warn(`  IDE controller blocked: target=${loopConfig.target}, interactive=${loopConfig.capability?.interactive ?? false}, nativeSubagents=${loopConfig.capability?.nativeSubagentCapability ?? 'unknown'}. Report the current harness capabilities explicitly before starting executable Loop actions.`);
                }
                if (placement === constants_1.DIR_NAMES.ACTIVE) {
                    await new SessionCommand_1.SessionCommand().writeSessionBrief(targetDir);
                }
            }
            this.success(`${placement === constants_1.DIR_NAMES.QUEUED ? 'Queued change' : 'Change'} ${featureName} created at ${featureDir}`);
            if (flags.length > 0) {
                this.info(`  Flags: ${flags.join(', ')}`);
            }
            if (activatedSteps.length > 0) {
                this.info(`  Activated optional steps: ${activatedSteps.join(', ')}`);
            }
            createdFeatureDir = null;
        }
        catch (error) {
            if (createdFeatureDir) {
                await services_1.services.fileService.remove(createdFeatureDir).catch((rollbackError) => {
                    this.warn(`Failed to roll back partial change ${createdFeatureDir}: ${rollbackError?.message || rollbackError}`);
                });
                if (rollbackProjectRoot
                    && rollbackPlacement === constants_1.DIR_NAMES.ACTIVE
                    && sessionBriefBackup) {
                    const sessionDir = path.join(rollbackProjectRoot, '.ospec');
                    for (const [fileName, content] of [
                        ['session-brief.json', sessionBriefBackup.json],
                        ['session-brief.md', sessionBriefBackup.markdown],
                    ]) {
                        const filePath = path.join(sessionDir, fileName);
                        if (content === null)
                            await services_1.services.fileService.remove(filePath).catch(() => undefined);
                        else
                            await services_1.services.fileService.writeFile(filePath, content).catch(() => undefined);
                    }
                }
            }
            this.error(`Failed to create change: ${error}`);
            throw error;
        }
        finally {
            if (creationLease)
                await this.releaseChangeCreationLease(creationLease);
        }
    }
    async acquireChangeCreationLease(targetDir, config) {
        const changesRoot = (0, ProjectLayout_1.resolveManagedPath)(targetDir, constants_1.DIR_NAMES.CHANGES, config);
        await services_1.services.fileService.ensureDir(changesRoot);
        const lockPath = path.join(changesRoot, CHANGE_CREATION_LOCK_FILE);
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
        const startedAt = Date.now();
        while (true) {
            try {
                const handle = await fs_1.promises.open(lockPath, 'wx');
                await handle.writeFile(JSON.stringify({
                    version: 2,
                    pid: process.pid,
                    acquiredAt: new Date().toISOString(),
                    nonce,
                    heartbeat: true,
                }));
                const heartbeat = setInterval(() => {
                    void this.refreshChangeCreationLockIfOwned(lockPath, nonce);
                }, CHANGE_CREATION_LOCK_HEARTBEAT_MS);
                heartbeat.unref();
                return { lockPath, nonce, handle, heartbeat };
            }
            catch (error) {
                if (error?.code !== 'EEXIST')
                    throw error;
                const owner = await this.readChangeCreationLockOwner(lockPath);
                const stat = await fs_1.promises.stat(lockPath).catch(() => null);
                const lockAgeMs = stat ? Date.now() - stat.mtimeMs : 0;
                if (stat
                    && (lockAgeMs >= STALE_CHANGE_CREATION_LOCK_MS || lockAgeMs <= -STALE_CHANGE_CREATION_LOCK_MS)
                    && (owner
                        ? ((!this.isProcessAlive(owner.pid) || owner.heartbeat)
                            && await this.removeChangeCreationLockIfOwned(lockPath, owner.nonce))
                        : await this.removeCorruptChangeCreationLockIfUnchanged(lockPath, stat)))
                    continue;
                if (Date.now() - startedAt >= CHANGE_CREATION_LOCK_TIMEOUT_MS) {
                    throw new Error(`Timed out waiting for change creation lease at ${lockPath}.`);
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
    async releaseChangeCreationLease(lease) {
        clearInterval(lease.heartbeat);
        await lease.handle.close().catch(() => undefined);
        await this.removeChangeCreationLockIfOwned(lease.lockPath, lease.nonce);
    }
    async readChangeCreationLockOwner(lockPath) {
        try {
            const value = JSON.parse(await fs_1.promises.readFile(lockPath, 'utf8'));
            return Number.isInteger(value?.pid) && value.pid > 0 && typeof value?.nonce === 'string' && value.nonce.length > 0
                ? { pid: value.pid, nonce: value.nonce, heartbeat: value?.version === 2 && value?.heartbeat === true }
                : null;
        }
        catch {
            return null;
        }
    }
    isProcessAlive(pid) {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch (error) {
            return error?.code !== 'ESRCH' && error?.code !== 'EINVAL';
        }
    }
    async refreshChangeCreationLockIfOwned(lockPath, nonce) {
        const owner = await this.readChangeCreationLockOwner(lockPath);
        if (owner?.nonce !== nonce)
            return;
        const now = new Date();
        await fs_1.promises.utimes(lockPath, now, now).catch(() => undefined);
    }
    async removeChangeCreationLockIfOwned(lockPath, nonce) {
        const owner = await this.readChangeCreationLockOwner(lockPath);
        if (owner?.nonce !== nonce)
            return false;
        try {
            await fs_1.promises.unlink(lockPath);
            return true;
        }
        catch (error) {
            if (error?.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    async removeCorruptChangeCreationLockIfUnchanged(lockPath, observed) {
        const current = await fs_1.promises.stat(lockPath).catch(() => null);
        if (!current
            || current.size !== observed.size
            || current.mtimeMs !== observed.mtimeMs
            || await this.readChangeCreationLockOwner(lockPath))
            return false;
        try {
            await fs_1.promises.unlink(lockPath);
            return true;
        }
        catch (error) {
            if (error?.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    async resolveDocumentLanguage(targetDir, config) {
        const configLanguage = this.normalizeDocumentLanguage(config?.documentLanguage);
        if (configLanguage) {
            return configLanguage;
        }
        const manifestLanguage = await this.readDocumentLanguageFromAssetManifest(targetDir, config);
        if (manifestLanguage) {
            return manifestLanguage;
        }
        const guideLanguage = await this.readDocumentLanguageFromAiGuide(targetDir, config);
        if (guideLanguage) {
            return guideLanguage;
        }
        return 'en-US';
    }
    normalizeDocumentLanguage(input) {
        return input === 'en-US' || input === 'zh-CN' || input === 'ja-JP' || input === 'ar' ? input : null;
    }
    async readDocumentLanguageFromAssetManifest(targetDir, config) {
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
            for (const targetRelativePath of [
                (0, ProjectLayout_1.toManagedRelativePath)('for-ai/ai-guide.md', config),
                (0, ProjectLayout_1.toManagedRelativePath)('for-ai/execution-protocol.md', config),
            ]) {
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
    async readDocumentLanguageFromAiGuide(targetDir, config) {
        const aiGuidePath = (0, ProjectLayout_1.resolveManagedPath)(targetDir, 'for-ai/ai-guide.md', config);
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
    async ensureChangeNameAvailable(targetDir, featureName, config) {
        const activeDir = PathUtils_1.PathUtils.getChangeDir(targetDir, constants_1.DIR_NAMES.ACTIVE, featureName, config);
        const queuedDir = PathUtils_1.PathUtils.getChangeDir(targetDir, constants_1.DIR_NAMES.QUEUED, featureName, config);
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
    async ensureSingleActiveMode(targetDir, placement, featureName, config) {
        if (placement !== constants_1.DIR_NAMES.ACTIVE) {
            return;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(targetDir);
        if (activeNames.length === 0) {
            return;
        }
        if (activeNames.length === 1) {
            const activeName = activeNames[0];
            const activeChangePath = PathUtils_1.PathUtils.getChangeDir(targetDir, constants_1.DIR_NAMES.ACTIVE, activeName, config);
            const progressCommand = (0, helpers_1.formatCliCommand)('ospec', 'progress', activeChangePath);
            const queueCommand = (0, helpers_1.formatCliCommand)('ospec', 'queue', 'add', featureName, targetDir);
            throw new Error(`A single active change is the default workflow, but "${activeName}" is already active. Continue it with "${progressCommand}" or create queued work explicitly with "${queueCommand}".`);
        }
        const queueCommand = (0, helpers_1.formatCliCommand)('ospec', 'queue', 'add', featureName, targetDir);
        throw new Error(`A single active change is the default workflow, but ${activeNames.length} active changes already exist: ${activeNames.join(', ')}. Resolve the repository back to one active change before creating another, or add new work with "${queueCommand}".`);
    }
    async writePluginArtifacts(projectRoot, featureDir, activatedSteps) {
        const config = await services_1.services.configManager.loadConfig(projectRoot);
        const composer = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);
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
        const externalPluginCapabilities = composer.getPluginCapabilities()
            .filter(capability => capability.plugin !== 'stitch' && capability.plugin !== 'checkpoint')
            .filter(capability => activatedSteps.includes(capability.step));
        const externalStepsByPlugin = externalPluginCapabilities.reduce((accumulator, capability) => {
            accumulator[capability.plugin] = accumulator[capability.plugin] || [];
            accumulator[capability.plugin].push(capability.step);
            return accumulator;
        }, {});
        for (const [pluginName, pluginSteps] of Object.entries(externalStepsByPlugin)) {
            const pluginDir = path.join(featureDir, 'artifacts', pluginName);
            await services_1.services.fileService.ensureDir(pluginDir);
            await services_1.services.fileService.writeJSON(path.join(pluginDir, 'gate.json'), {
                plugin: pluginName,
                status: 'pending',
                blocking: config.plugins?.[pluginName]?.blocking !== false,
                executed_at: '',
                steps: Object.fromEntries(pluginSteps.map(step => [step, {
                        status: 'pending',
                        issues: [],
                    }])),
                issues: [],
            });
            await services_1.services.fileService.writeJSON(path.join(pluginDir, 'result.json'), {
                plugin: pluginName,
                status: 'pending',
                executed_at: '',
                active_steps: pluginSteps,
                output: {},
            });
            await services_1.services.fileService.writeFile(path.join(pluginDir, 'summary.md'), `# ${pluginName} Summary\n\n- Status: pending\n- The plugin runner has not been executed yet.\n`);
        }
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
