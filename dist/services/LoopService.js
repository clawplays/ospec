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
exports.LoopService = void 0;
exports.createLoopService = createLoopService;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const constants_1 = require("../core/constants");
const VerificationService_1 = require("./VerificationService");
const CapabilityProbeService_1 = require("./CapabilityProbeService");
const TriageService_1 = require("./TriageService");
const RuntimeExecutionAdapterService_1 = require("./RuntimeExecutionAdapterService");
const TaskGraphExecutionService_1 = require("./TaskGraphExecutionService");
const LOOP_DIR = ['artifacts', 'loop'];
const LOOP_CONFIG_FILE = 'loop.json';
const LOOP_STATE_FILE = 'state.json';
const LOOP_RUNLOG_FILE = 'run-log.jsonl';
const LOOP_STOP_FILE = 'STOP';
const LOOP_CONTROLLER_LOCK_FILE = 'controller.lock';
const STALE_CONTROLLER_LOCK_MS = 2 * 60 * 1000;
const CONTROLLER_LOCK_HEARTBEAT_MS = 30 * 1000;
const DEFAULT_ACTION_LEASE_MS = 5 * 60 * 1000;
const MAX_ACTION_LEASE_MS = 30 * 60 * 1000;
const DEFAULT_IMPLEMENTATION_MAX_RUNTIME_MS = 2 * 60 * 60 * 1000;
const DEFAULT_REVIEW_MAX_RUNTIME_MS = 60 * 60 * 1000;
const DEFAULT_VERIFICATION_MAX_RUNTIME_MS = 60 * 60 * 1000;
const DEFAULT_EVIDENCE_RESULT_GRACE_MS = 5 * 60 * 1000;
const UNKNOWN_IMPLEMENTATION_CAPACITY = 2;
const MIN_ACTION_TOKEN_RESERVATION = 1000;
const APPROVED_REVIEW_DECISIONS = new Set(['APPROVED', 'APPROVED_WITH_CONCERNS']);
const RETRY_REVIEW_DECISIONS = new Set(['NEEDS_CHANGES', 'BLOCKED']);
/**
 * Durable plan-act-observe controller for goal task graphs. OSpec emits bounded action packets;
 * the active model harness executes them through its native subagent primitive.
 */
class LoopService {
    constructor(fileService, dependencies = {}) {
        this.fileService = fileService;
        this.taskGraph = dependencies.taskGraphExecutionService || (0, TaskGraphExecutionService_1.createTaskGraphExecutionService)(fileService);
        this.verification = dependencies.verificationService || (0, VerificationService_1.createVerificationService)();
        this.runtimeAdapter = dependencies.runtimeAdapterService || new RuntimeExecutionAdapterService_1.RuntimeExecutionAdapterService();
        this.now = dependencies.now || (() => new Date());
    }
    loopDir(changePath) {
        return path.join(changePath, ...LOOP_DIR);
    }
    configPath(changePath) {
        return path.join(this.loopDir(changePath), LOOP_CONFIG_FILE);
    }
    statePath(changePath) {
        return path.join(this.loopDir(changePath), LOOP_STATE_FILE);
    }
    runLogPath(changePath) {
        return path.join(this.loopDir(changePath), LOOP_RUNLOG_FILE);
    }
    stopFilePath(changePath) {
        return path.join(this.loopDir(changePath), LOOP_STOP_FILE);
    }
    async exists(changePath) {
        return this.fileService.exists(this.configPath(changePath));
    }
    async scaffold(changePath, options = {}) {
        if (options.executionModel === 'cli-driven') {
            throw new Error('CLI-driven agent execution was removed. Use controller mode with the current model harness native subagent capability.');
        }
        const configPath = this.configPath(changePath);
        if (await this.fileService.exists(configPath)) {
            if (options.target !== undefined
                || options.interactive !== undefined
                || options.nativeLoopCapability !== undefined
                || options.nativeSubagentCapability !== undefined) {
                return this.configure(changePath, {
                    target: options.target,
                    executionModel: options.executionModel,
                    interactive: options.interactive,
                    nativeLoopCapability: options.nativeLoopCapability,
                    nativeSubagentCapability: options.nativeSubagentCapability,
                });
            }
            return this.readConfig(changePath);
        }
        const primitive = options.primitive || 'goal';
        const level = options.level || 'L1';
        const target = options.target || 'claude';
        const capability = (0, CapabilityProbeService_1.createCapabilityProbeService)().resolveHarnessCapability({
            target,
            primitive,
            interactive: options.interactive,
            nativeLoopCapability: options.nativeLoopCapability,
            nativeSubagentCapability: options.nativeSubagentCapability,
            now: this.now(),
        });
        const executionModel = options.executionModel || 'controller';
        const now = this.now().toISOString();
        const config = {
            version: '2.0',
            pattern: options.pattern || 'goal-loop',
            primitive,
            level,
            executionModel,
            target,
            schedule: { interval: options.interval || '10m', lifecycle: 'session-bound' },
            stopConditions: { testCommands: [], maxIterations: null, expiresAt: null, budgetTokens: null, budgetMinutes: null },
            allowlist: { paths: [], commands: [] },
            efficiency: this.defaultEfficiency(),
            documentReviewGovernance: this.defaultDocumentReviewGovernance(),
            capability,
            nativeHarnessMetadata: null,
            createdAt: now,
        };
        await this.fileService.writeJSON(configPath, config);
        await this.writeState(changePath, this.normalizeState({
            version: '2.0',
            iteration: 0,
            lastTickTs: null,
            currentStep: 'idle',
            status: 'idle',
            comprehensionDebtCounter: 0,
            pendingControllerAction: null,
            startedAt: null,
            updatedAt: null,
            tokensUsed: 0,
            executorTokensUsed: 0,
            artifactTokensUsed: 0,
            executorUsageByKey: {},
            artifactUsageByKey: {},
            noProgressCount: 0,
            progressFingerprint: null,
            lastFeedback: null,
            lastBatchDiagnostics: null,
        }));
        if (!(await this.fileService.exists(this.runLogPath(changePath)))) {
            await this.fileService.writeFile(this.runLogPath(changePath), '');
        }
        return config;
    }
    async readConfig(changePath) {
        const raw = await this.fileService.readJSON(this.configPath(changePath));
        return this.normalizeConfig(raw);
    }
    async readState(changePath) {
        const raw = await this.fileService.readJSON(this.statePath(changePath));
        return this.normalizeState(raw);
    }
    async writeState(changePath, state) {
        state.version = '2.0';
        state.updatedAt = this.now().toISOString();
        await this.fileService.writeJSON(this.statePath(changePath), state);
    }
    async assertExists(changePath) {
        if (!(await this.exists(changePath))) {
            throw new Error('No loop is initialized for this change. Create it with "ospec goal <name>".');
        }
    }
    async setLevel(changePath, level) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, () => this.setLevelUnlocked(changePath, level));
    }
    async setLevelUnlocked(changePath, level) {
        const config = await this.readConfig(changePath);
        config.level = level;
        await this.fileService.writeJSON(this.configPath(changePath), config);
        return config;
    }
    async configure(changePath, options) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, () => this.configureUnlocked(changePath, options));
    }
    async configureUnlocked(changePath, options) {
        if (options.executionModel === 'cli-driven') {
            throw new Error('CLI-driven agent execution was removed. Use controller mode with the current model harness native subagent capability.');
        }
        const config = await this.readConfig(changePath);
        const targetChanged = options.target !== undefined && options.target !== config.target;
        if (options.target)
            config.target = options.target;
        const capabilityChanged = options.target !== undefined
            || options.interactive !== undefined
            || options.nativeLoopCapability !== undefined
            || options.nativeSubagentCapability !== undefined;
        let capabilitySessionChanged = false;
        if (capabilityChanged) {
            const now = this.now();
            if (this.isSameCurrentCapabilityAssertion(config, options, now, targetChanged)) {
                config.capability.expiresAt = new Date(now.getTime() + CapabilityProbeService_1.DEFAULT_CAPABILITY_SESSION_TTL_MS).toISOString();
            }
            else {
                capabilitySessionChanged = true;
                config.capability = (0, CapabilityProbeService_1.createCapabilityProbeService)().resolveHarnessCapability({
                    target: config.target,
                    primitive: config.primitive,
                    interactive: options.interactive,
                    nativeLoopCapability: options.nativeLoopCapability,
                    nativeSubagentCapability: options.nativeSubagentCapability,
                    now,
                });
            }
            if (capabilitySessionChanged && options.nativeHarnessMetadata === undefined)
                config.nativeHarnessMetadata = null;
        }
        if (options.nativeHarnessMetadata !== undefined) {
            if (options.nativeHarnessMetadata === null) {
                config.nativeHarnessMetadata = null;
            }
            else {
                const metadata = options.nativeHarnessMetadata;
                if (metadata.target !== config.target
                    || metadata.controllerSessionReportedAt !== config.capability?.reportedAt) {
                    throw new Error('Native harness execution metadata must match the current Loop target and controller capability session.');
                }
                config.nativeHarnessMetadata = JSON.parse(JSON.stringify(metadata));
            }
        }
        if (options.executionModel)
            config.executionModel = options.executionModel;
        else if (options.target)
            config.executionModel = 'controller';
        if (options.interval)
            config.schedule.interval = options.interval;
        this.assignDefined(config.stopConditions, 'maxIterations', options.maxIterations);
        this.assignDefined(config.stopConditions, 'expiresAt', options.expiresAt);
        this.assignDefined(config.stopConditions, 'budgetTokens', options.budgetTokens);
        this.assignDefined(config.stopConditions, 'budgetMinutes', options.budgetMinutes);
        if (options.testCommands)
            config.stopConditions.testCommands = this.uniqueNonEmpty(options.testCommands);
        if (config.stopConditions.expiresAt && !Number.isFinite(Date.parse(config.stopConditions.expiresAt))) {
            throw new Error('expiresAt must be a valid ISO date/time or null.');
        }
        const replacesPaths = options.allowPaths !== undefined;
        const replacesCommands = options.allowCommands !== undefined
            || options.allowCommandPolicies !== undefined;
        const replacesAllowlist = replacesPaths || replacesCommands;
        if (options.allowPaths)
            config.allowlist.paths = this.uniqueNonEmpty(options.allowPaths).map(item => item.replace(/\\/g, '/'));
        if (options.allowCommands || options.allowCommandPolicies) {
            config.allowlist.commands = [
                ...this.uniqueNonEmpty(options.allowCommands || []),
                ...this.normalizeCommandPolicies(options.allowCommandPolicies || []),
            ];
        }
        if (replacesAllowlist) {
            const previousMetadata = config.allowlist.metadata;
            const previousSource = previousMetadata?.source || 'manual';
            config.allowlist.metadata = {
                source: 'manual',
                pathSource: replacesPaths
                    ? 'manual'
                    : previousMetadata?.pathSource || previousSource,
                commandSource: replacesCommands
                    ? 'manual'
                    : previousMetadata?.commandSource || previousSource,
                currentHash: this.hashAllowlist(config.allowlist),
                candidateHash: null,
                taskGraphHash: null,
                updatedAt: this.now().toISOString(),
            };
        }
        if (options.maxParallel !== undefined)
            config.efficiency.maxParallel = this.positiveInteger(options.maxParallel, 'maxParallel');
        if (options.maxParallel !== undefined
            && options.maxParallelReason === undefined
            && config.efficiency.maxParallel >= this.defaultEfficiency().maxParallel) {
            config.efficiency.maxParallelReason = null;
        }
        if (options.maxParallelReason !== undefined) {
            const reason = options.maxParallelReason === null ? '' : String(options.maxParallelReason).trim();
            if (reason.length > 500)
                throw new Error('maxParallelReason must be 500 characters or fewer.');
            config.efficiency.maxParallelReason = reason || null;
        }
        if (options.noProgressLimit !== undefined)
            config.efficiency.noProgressLimit = this.positiveInteger(options.noProgressLimit, 'noProgressLimit');
        if (options.maxTaskRepairRounds !== undefined)
            config.efficiency.maxTaskRepairRounds = this.positiveInteger(options.maxTaskRepairRounds, 'maxTaskRepairRounds');
        if (options.maxFinalRepairRounds !== undefined)
            config.efficiency.maxFinalRepairRounds = this.positiveInteger(options.maxFinalRepairRounds, 'maxFinalRepairRounds');
        if (options.comprehensionReviewEvery !== undefined)
            config.efficiency.comprehensionReviewEvery = this.nonNegativeInteger(options.comprehensionReviewEvery, 'comprehensionReviewEvery');
        if (options.freshContext !== undefined)
            config.efficiency.freshContext = options.freshContext;
        if (options.promptMaxChars !== undefined)
            config.efficiency.promptMaxChars = this.positiveInteger(options.promptMaxChars, 'promptMaxChars');
        if (options.implementationMaxRuntimeMinutes !== undefined)
            config.efficiency.implementationMaxRuntimeMinutes = this.positiveInteger(options.implementationMaxRuntimeMinutes, 'implementationMaxRuntimeMinutes');
        if (options.reviewMaxRuntimeMinutes !== undefined)
            config.efficiency.reviewMaxRuntimeMinutes = this.positiveInteger(options.reviewMaxRuntimeMinutes, 'reviewMaxRuntimeMinutes');
        if (options.verificationMaxRuntimeMinutes !== undefined)
            config.efficiency.verificationMaxRuntimeMinutes = this.positiveInteger(options.verificationMaxRuntimeMinutes, 'verificationMaxRuntimeMinutes');
        if (options.evidenceResultGraceMinutes !== undefined)
            config.efficiency.evidenceResultGraceMinutes = this.positiveInteger(options.evidenceResultGraceMinutes, 'evidenceResultGraceMinutes');
        config.version = '2.0';
        await this.fileService.writeJSON(this.configPath(changePath), config);
        return config;
    }
    async deriveAllowlist(changePath) {
        await this.assertExists(changePath);
        return this.deriveAllowlistUnlocked(path.resolve(changePath));
    }
    async checkAllowlist(changePath) {
        return this.deriveAllowlist(changePath);
    }
    async applyAllowlist(changePath, options) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const derivation = await this.deriveAllowlistUnlocked(path.resolve(changePath));
            const expectedCurrentHash = this.requireHash(options.expectedCurrentHash, 'expectedCurrentHash');
            const expectedCandidateHash = this.requireHash(options.expectedCandidateHash, 'expectedCandidateHash');
            if (derivation.currentHash !== expectedCurrentHash) {
                throw new Error(`Allowlist changed since derivation (expected current hash ${expectedCurrentHash}, found ${derivation.currentHash}). Re-run allowlist derive.`);
            }
            if (derivation.candidateHash !== expectedCandidateHash) {
                throw new Error(`Task-graph allowlist candidate changed since derivation (expected candidate hash ${expectedCandidateHash}, found ${derivation.candidateHash}). Re-run allowlist derive.`);
            }
            if (options.expectedTaskGraphHash !== undefined
                && derivation.taskGraphHash !== this.requireHash(options.expectedTaskGraphHash, 'expectedTaskGraphHash')) {
                throw new Error(`Task graph changed since derivation (expected hash ${options.expectedTaskGraphHash}, found ${derivation.taskGraphHash}). Re-run allowlist derive.`);
            }
            if (!derivation.canApply) {
                throw new Error(`Task-graph allowlist cannot be applied: ${derivation.issues.join('; ')}`);
            }
            if (derivation.hasExpansion && options.approveExpansion !== true) {
                throw new Error('Task-graph allowlist expands permissions. Re-run with explicit expansion approval after reviewing the added paths and commands.');
            }
            const config = await this.readConfig(changePath);
            config.allowlist = {
                paths: [...derivation.candidate.paths],
                commands: [...derivation.candidate.commands],
                metadata: {
                    source: 'task-graph',
                    pathSource: 'task-graph',
                    commandSource: 'task-graph',
                    currentHash: this.hashAllowlist(derivation.candidate),
                    candidateHash: derivation.candidateHash,
                    taskGraphHash: derivation.taskGraphHash,
                    updatedAt: this.now().toISOString(),
                },
            };
            await this.fileService.writeJSON(this.configPath(changePath), config);
            return {
                ...derivation,
                current: config.allowlist,
                currentHash: this.hashAllowlist(config.allowlist),
                matchesCurrent: true,
            };
        });
    }
    async clearAllowlist(changePath, options = {}) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const config = await this.readConfig(changePath);
            const currentHash = this.hashAllowlist(config.allowlist);
            if (options.expectedCurrentHash !== undefined
                && currentHash !== this.requireHash(options.expectedCurrentHash, 'expectedCurrentHash')) {
                throw new Error(`Allowlist changed before clear (expected current hash ${options.expectedCurrentHash}, found ${currentHash}).`);
            }
            const cleared = { paths: [], commands: [] };
            cleared.metadata = {
                source: 'clear',
                pathSource: 'clear',
                commandSource: 'clear',
                currentHash: this.hashAllowlist(cleared),
                candidateHash: null,
                taskGraphHash: null,
                updatedAt: this.now().toISOString(),
            };
            config.allowlist = cleared;
            await this.fileService.writeJSON(this.configPath(changePath), config);
            return cleared;
        });
    }
    async deriveAllowlistUnlocked(changePath) {
        const config = await this.readConfig(changePath);
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath))) {
            throw new Error(`Task graph not found at ${graphPath}`);
        }
        const graphContent = await this.fileService.readFile(graphPath);
        let graph;
        try {
            graph = JSON.parse(graphContent.replace(/^\uFEFF/, ''));
        }
        catch (error) {
            throw new Error(`Task graph is not valid JSON: ${error?.message || error}`);
        }
        const taskGraphHash = this.sha256(graphContent);
        const issues = [];
        const paths = [];
        const commands = [];
        const tasks = Array.isArray(graph?.tasks) ? graph.tasks : [];
        if (tasks.length === 0)
            issues.push('task graph tasks must contain at least one task');
        const projectRoot = await this.findProjectRootForSafety(changePath);
        for (const [index, task] of tasks.entries()) {
            const taskId = String(task?.id || `tasks[${index}]`).trim();
            const targetFiles = Array.isArray(task?.target_files) ? task.target_files : [];
            if (!Array.isArray(task?.target_files))
                issues.push(`${taskId}: target_files must be an array`);
            const normalizedTargets = new Set();
            for (const rawTarget of targetFiles) {
                if (typeof rawTarget !== 'string') {
                    issues.push(`${taskId}: target_files contains a non-string value`);
                    continue;
                }
                const normalized = this.normalizeAllowlistedPath(rawTarget);
                if (!normalized || !(await this.resolveRealPathBoundary(projectRoot, normalized))) {
                    issues.push(`${taskId}: unsafe target file path (${rawTarget})`);
                    continue;
                }
                normalizedTargets.add(normalized);
                paths.push(normalized);
            }
            const documentationUpdates = Array.isArray(task?.documentation_updates) ? task.documentation_updates : [];
            if (!Array.isArray(task?.documentation_updates))
                issues.push(`${taskId}: documentation_updates must be an array`);
            for (const rawDocumentationPath of documentationUpdates) {
                const normalized = typeof rawDocumentationPath === 'string'
                    ? this.normalizeAllowlistedPath(rawDocumentationPath)
                    : null;
                if (!normalized) {
                    issues.push(`${taskId}: invalid documentation_updates path (${String(rawDocumentationPath)})`);
                }
                else if (!normalizedTargets.has(normalized)) {
                    issues.push(`${taskId}: documentation update is missing from target_files (${normalized})`);
                }
            }
            const verificationCommands = Array.isArray(task?.verification_commands) ? task.verification_commands : [];
            if (!Array.isArray(task?.verification_commands))
                issues.push(`${taskId}: verification_commands must be an array`);
            for (const rawCommand of verificationCommands) {
                await this.collectDerivedCommand(projectRoot, rawCommand, `${taskId}: verification command`, commands, issues);
            }
        }
        for (const command of config.stopConditions.testCommands) {
            await this.collectDerivedCommand(projectRoot, command, 'loop test command', commands, issues);
        }
        const candidateCore = {
            paths: this.uniqueNonEmpty(paths),
            commands: this.uniqueDerivedCommands(commands),
        };
        const current = {
            paths: [...config.allowlist.paths],
            commands: [...config.allowlist.commands],
            ...(config.allowlist.metadata ? { metadata: { ...config.allowlist.metadata } } : {}),
        };
        const currentHash = this.hashAllowlist(current);
        const candidateHash = this.sha256(this.stableStringify({
            allowlist: this.allowlistHashInput(candidateCore),
            taskGraphHash,
        }));
        const candidate = {
            ...candidateCore,
            metadata: {
                source: 'task-graph',
                pathSource: 'task-graph',
                commandSource: 'task-graph',
                currentHash: this.hashAllowlist(candidateCore),
                candidateHash,
                taskGraphHash,
                updatedAt: this.now().toISOString(),
            },
        };
        const diff = this.diffAllowlists(current, candidate);
        const hasExpansion = this.hasAllowlistExpansion(current, candidate);
        return {
            source: 'task-graph',
            current,
            candidate,
            currentHash,
            candidateHash,
            taskGraphHash,
            diff,
            hasExpansion,
            matchesCurrent: !hasExpansion && diff.removedPaths.length === 0 && diff.removedCommands.length === 0,
            issues: this.uniqueNonEmpty(issues),
            canApply: issues.length === 0,
        };
    }
    async pause(changePath) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const state = await this.readState(changePath);
            state.status = 'paused';
            await this.writeState(changePath, state);
            return state;
        });
    }
    async resume(changePath) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const state = await this.readState(changePath);
            await this.recoverExpiredActionsUnlocked(changePath, state, false);
            if (state.status === 'paused' || state.status === 'stopped')
                state.status = 'idle';
            state.comprehensionDebtCounter = 0;
            state.noProgressCount = 0;
            await this.writeState(changePath, state);
            return state;
        });
    }
    async heartbeatExecution(changePath, heartbeat) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const executorId = this.requireExecutorId(heartbeat.executorId);
            const config = await this.readConfig(changePath);
            const heartbeatNow = this.now();
            const state = await this.readState(changePath);
            const pending = state.pendingControllerAction;
            if (!pending || pending.status !== 'awaiting-evidence') {
                throw new Error('Cannot heartbeat an executor without a pending loop action.');
            }
            this.ensurePendingItemStates(pending);
            const itemState = pending.itemStates?.find(item => item.actionItemId === heartbeat.actionItemId);
            if (!itemState)
                throw new Error(`Unknown action item for the current pending action (${heartbeat.actionItemId}).`);
            const actionItem = (pending.items || []).find(item => item.id === heartbeat.actionItemId);
            const now = heartbeatNow;
            const absoluteExpiresAt = Date.parse(itemState.absoluteExpiresAt || '');
            if (Number.isFinite(absoluteExpiresAt) && absoluteExpiresAt <= now.getTime()) {
                throw new Error(`Action item ${heartbeat.actionItemId} reached its absolute runtime deadline; recover it before accepting another heartbeat.`);
            }
            const controllerCurrent = this.isControllerCapabilityCurrent(config, heartbeatNow);
            this.assertActionNativeSession(config, actionItem, heartbeatNow, heartbeat.actionItemId);
            if (itemState.executorId && itemState.executorId !== executorId
                && Date.parse(itemState.leaseExpiresAt) > now.getTime()) {
                throw new Error(`Action item ${heartbeat.actionItemId} is leased by another executor.`);
            }
            if (this.isTerminalItemStatus(itemState.status)) {
                if (itemState.executorId !== executorId) {
                    throw new Error(`Executor ${executorId} does not own action item ${heartbeat.actionItemId}; expected ${itemState.executorId || '(unclaimed)'}.`);
                }
                return state;
            }
            const leaseMs = heartbeat.leaseMs === undefined
                ? DEFAULT_ACTION_LEASE_MS
                : Math.min(MAX_ACTION_LEASE_MS, this.positiveInteger(heartbeat.leaseMs, 'leaseMs'));
            itemState.status = 'running';
            itemState.heartbeatAt = now.toISOString();
            const requestedLeaseExpiry = now.getTime() + leaseMs;
            const boundedLeaseExpiry = Number.isFinite(absoluteExpiresAt)
                ? Math.min(requestedLeaseExpiry, absoluteExpiresAt)
                : requestedLeaseExpiry;
            itemState.leaseExpiresAt = new Date(boundedLeaseExpiry).toISOString();
            itemState.heartbeatDueAt = new Date(now.getTime() + Math.floor((boundedLeaseExpiry - now.getTime()) / 2)).toISOString();
            itemState.executorId = executorId;
            if (actionItem?.usageKey
                && (actionItem.kind === 'task-review' || actionItem.kind === 'final-review')) {
                await this.taskGraph.claimReviewLoopExecutor(changePath, {
                    dispatchId: actionItem.usageKey,
                    actionId: pending.actionId,
                    actionItemId: actionItem.id,
                    executorId,
                    claimedAt: now.toISOString(),
                });
            }
            else if (actionItem?.kind === 'verification') {
                await this.taskGraph.claimVerificationLoopExecutor(changePath, {
                    actionId: pending.actionId,
                    actionItemId: actionItem.id,
                    executorId,
                    claimedAt: now.toISOString(),
                });
            }
            if (controllerCurrent)
                await this.extendControllerCapabilitySession(changePath, now);
            await this.writeState(changePath, state);
            return state;
        });
    }
    async recoverExpiredActions(changePath, options = {}) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const state = await this.readState(changePath);
            await this.recoverExpiredActionsUnlocked(changePath, state, options.force === true);
            await this.writeState(changePath, state);
            return state;
        });
    }
    async recordExecutionResults(changePath, results) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, () => this.recordExecutionResultsUnlocked(changePath, results));
    }
    async finalizeExecutionItem(changePath, result) {
        await this.assertExists(changePath);
        return this.withControllerLease(changePath, async () => {
            const state = await this.readState(changePath);
            const pending = state.pendingControllerAction;
            if (!pending || pending.status !== 'awaiting-evidence') {
                throw new Error('Cannot finalize an executor without a pending loop action.');
            }
            this.ensurePendingItemStates(pending);
            const item = (pending.items || []).find(candidate => candidate.id === result.actionItemId);
            const itemState = (pending.itemStates || []).find(candidate => candidate.actionItemId === result.actionItemId);
            if (!item || !itemState)
                throw new Error(`Unknown action item for the current pending action (${result.actionItemId}).`);
            const executorId = this.requireExecutorId(result.executorId);
            if (itemState.executorId !== executorId) {
                throw new Error(`Executor ${executorId} does not own action item ${result.actionItemId}; expected ${itemState.executorId || '(unclaimed)'}.`);
            }
            const succeeded = result.timedOut !== true && result.exitCode === 0;
            if (succeeded) {
                let evidenceReady = false;
                if (item.usageKey && (item.kind === 'task-review' || item.kind === 'final-review')) {
                    evidenceReady = await this.taskGraph.hasReviewLoopEvidence(changePath, {
                        dispatchId: item.usageKey,
                        actionId: pending.actionId,
                        actionItemId: item.id,
                        executorId,
                    });
                }
                else if (item.kind === 'verification') {
                    evidenceReady = Boolean(await this.readLatestVerificationEvidence(changePath, pending));
                }
                else if (item.taskId) {
                    const report = await this.taskGraph.getReport(changePath).catch(() => null);
                    const task = report ? this.allReportTasks(report).find(candidate => candidate.id === item.taskId) : null;
                    evidenceReady = Boolean(task && ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status));
                }
                if (!evidenceReady) {
                    throw new Error(`Cannot finalize successful action item ${item.id} before its authoritative durable evidence is complete.`);
                }
            }
            return this.recordExecutionResultsUnlocked(changePath, [result]);
        });
    }
    async recordExecutionResultsUnlocked(changePath, results) {
        await this.assertExists(changePath);
        const state = await this.readState(changePath);
        const now = this.now().toISOString();
        const pending = state.pendingControllerAction;
        if (!pending || pending.status !== 'awaiting-evidence') {
            throw new Error('Cannot record executor results without a pending loop action.');
        }
        this.ensurePendingItemStates(pending);
        const config = await this.readConfig(changePath);
        const resultNow = this.now();
        const expectedIds = new Set((pending.items || []).map(item => item.id));
        const resultIds = results.map(result => result.actionItemId);
        if (results.length === 0
            || new Set(resultIds).size !== resultIds.length
            || resultIds.some(id => !expectedIds.has(id))) {
            throw new Error(`Executor results must be a unique non-empty subset of the current pending action items (${[...expectedIds].join(', ')}).`);
        }
        const newlyRecorded = [];
        for (const result of results) {
            const executorId = this.requireExecutorId(result.executorId);
            const itemState = pending.itemStates?.find(item => item.actionItemId === result.actionItemId);
            if (!itemState)
                throw new Error(`Unknown action item for the current pending action (${result.actionItemId}).`);
            const actionItem = (pending.items || []).find(item => item.id === result.actionItemId);
            this.assertActionNativeSession(config, actionItem, resultNow, result.actionItemId);
            if (!itemState.executorId) {
                throw new Error(`Controller result for ${result.actionItemId} requires a prior heartbeat claim by executor ${executorId}.`);
            }
            if (itemState.executorId && executorId !== itemState.executorId) {
                throw new Error(`Executor ${executorId} does not own action item ${result.actionItemId}; expected ${itemState.executorId}.`);
            }
            if (!itemState.executorId)
                itemState.executorId = executorId;
            if (this.isTerminalItemStatus(itemState.status)) {
                if (!this.executionResultMatches(itemState, result)) {
                    throw new Error(`Conflicting executor result for already-settled action item ${result.actionItemId}.`);
                }
                continue;
            }
            if (Date.parse(itemState.leaseExpiresAt) <= resultNow.getTime()) {
                throw new Error(`Action item ${result.actionItemId} executor lease expired; recover the orphaned action before accepting another result.`);
            }
            const failed = result.timedOut === true || result.exitCode !== 0;
            itemState.status = failed ? 'failed' : 'completed';
            itemState.completedAt = now;
            itemState.exitCode = result.exitCode;
            itemState.timedOut = result.timedOut === true;
            itemState.tokensUsed = Math.max(0, Number(result.tokensUsed) || 0);
            itemState.summary = result.summary || null;
            if (actionItem?.usageKey
                && (actionItem.kind === 'task-review' || actionItem.kind === 'final-review')) {
                await this.taskGraph.completeReviewLoopExecutor(changePath, {
                    dispatchId: actionItem.usageKey,
                    actionId: pending.actionId,
                    actionItemId: actionItem.id,
                    executorId,
                    completedAt: now,
                    succeeded: !failed,
                });
            }
            const usageKey = actionItem?.usageKey || result.actionItemId;
            state.executorUsageByKey[usageKey] = itemState.tokensUsed;
            newlyRecorded.push(result);
        }
        const failures = newlyRecorded.filter(result => result.timedOut || result.exitCode !== 0);
        const tokenDelta = newlyRecorded.reduce((total, result) => total + Math.max(0, Number(result.tokensUsed) || 0), 0);
        this.recomputeTokenUsage(state);
        if (failures.length > 0) {
            state.noProgressCount += 1;
            await this.markImplementationAttemptsBlocked(changePath, pending, failures, failures.map(result => result.summary || `${result.actionItemId} exited ${result.exitCode ?? 'without a code'}`).join('; '));
        }
        const activeCount = (pending.itemStates || []).filter(item => !this.isTerminalItemStatus(item.status)).length;
        const allFailures = (pending.itemStates || []).filter(item => item.status === 'failed' || item.status === 'expired');
        state.lastFeedback = allFailures.length === 0
            ? `Recorded ${newlyRecorded.length} executor result(s); ${activeCount} item(s) still active or awaiting durable evidence.`
            : allFailures.map(item => item.summary || `${item.actionItemId} ${item.status}`).join('; ');
        if (activeCount === 0) {
            pending.executorCompletedAt = now;
            pending.executorSucceeded = allFailures.length === 0;
        }
        const actionId = pending.actionId;
        await this.writeState(changePath, state);
        await this.appendRunLog(changePath, {
            ts: now,
            iteration: state.iteration,
            trigger: 'executor',
            tokensEst: tokenDelta || null,
            exitCode: failures[0]?.exitCode ?? 0,
            verifyPassed: null,
            summary: state.lastFeedback,
            costToDate: null,
            actionId,
            actionCount: newlyRecorded.length,
            noProgressCount: state.noProgressCount,
        });
        return state;
    }
    async countPendingRequiredDecisions(changePath) {
        const indexPath = path.join(changePath, 'artifacts', 'agents', 'decisions', 'index.json');
        if (!(await this.fileService.exists(indexPath)))
            return 0;
        try {
            const index = await this.fileService.readJSON(indexPath);
            return (Array.isArray(index.decisions) ? index.decisions : [])
                .filter(decision => decision.required === true && String(decision.status || '').toUpperCase() === 'PENDING').length;
        }
        catch {
            return -1;
        }
    }
    async validateDocumentReviewReadiness(changePath) {
        const reviews = [
            ['design', 'design'],
            ['implementation plan', 'plan'],
        ];
        for (const [_label, stage] of reviews) {
            const readiness = await this.taskGraph.validateDocumentReviewEvidence(changePath, stage);
            if (!readiness.ready)
                return `Loop blocked: ${readiness.reason || 'Document review evidence is invalid.'}`;
        }
        return null;
    }
    async validateWorkspaceReadiness(changePath, allowedWorkspacePaths = []) {
        const workspace = await this.taskGraph.validateWorkspaceEvidence(changePath, allowedWorkspacePaths);
        if (!workspace.ready)
            return `Loop blocked: ${workspace.reason || 'workspace safety evidence is invalid.'}`;
        return null;
    }
    async markImplementationAttemptsBlocked(changePath, pending, results, summary) {
        const failedIds = results.length > 0
            ? new Set(results.filter(result => result.timedOut || result.exitCode !== 0).map(result => result.actionItemId))
            : null;
        const candidates = (pending.items || []).filter(item => item.kind === 'implementation'
            && item.taskId
            && (!failedIds || failedIds.has(item.id)));
        if (candidates.length === 0)
            return;
        const report = await this.taskGraph.getReport(changePath).catch(() => null);
        const tasks = report ? this.allReportTasks(report) : [];
        for (const item of candidates) {
            const task = tasks.find(candidate => candidate.id === item.taskId);
            if (task && ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status))
                continue;
            await this.taskGraph.complete(changePath, item.taskId, {
                status: 'BLOCKED',
                summary,
                dispatchId: item.usageKey,
            });
        }
    }
    async recoverExpiredActionsUnlocked(changePath, state, force) {
        const pending = state.pendingControllerAction;
        if (!pending || pending.status !== 'awaiting-evidence')
            return 0;
        this.ensurePendingItemStates(pending);
        const now = this.now();
        const expired = (pending.itemStates || []).filter(item => {
            if (this.isTerminalItemStatus(item.status))
                return false;
            const absoluteExpired = Number.isFinite(Date.parse(item.absoluteExpiresAt || ''))
                && Date.parse(item.absoluteExpiresAt || '') <= now.getTime();
            const evidenceReady = Number.isFinite(Date.parse(item.evidenceReadyAt || ''));
            const evidenceResultExpired = Number.isFinite(Date.parse(item.evidenceResultDeadlineAt || ''))
                ? Date.parse(item.evidenceResultDeadlineAt || '') <= now.getTime()
                : evidenceReady
                    && Date.parse(item.evidenceReadyAt || '') + DEFAULT_EVIDENCE_RESULT_GRACE_MS <= now.getTime();
            return force || (evidenceReady
                ? evidenceResultExpired
                : absoluteExpired || Date.parse(item.leaseExpiresAt) <= now.getTime());
        });
        if (expired.length === 0)
            return 0;
        for (const itemState of expired) {
            const actionItem = (pending.items || []).find(item => item.id === itemState.actionItemId);
            if (actionItem?.kind === 'verification') {
                await this.taskGraph.cancelVerificationLoopAction(changePath, {
                    actionId: pending.actionId,
                    actionItemId: actionItem.id,
                });
            }
        }
        const results = expired.map(item => {
            item.status = 'expired';
            item.completedAt = now.toISOString();
            item.timedOut = true;
            const absoluteExpired = Number.isFinite(Date.parse(item.absoluteExpiresAt || ''))
                && Date.parse(item.absoluteExpiresAt || '') <= now.getTime();
            const evidenceResultExpired = Number.isFinite(Date.parse(item.evidenceResultDeadlineAt || ''))
                ? Date.parse(item.evidenceResultDeadlineAt || '') <= now.getTime()
                : Number.isFinite(Date.parse(item.evidenceReadyAt || ''))
                    && Date.parse(item.evidenceReadyAt || '') + DEFAULT_EVIDENCE_RESULT_GRACE_MS <= now.getTime();
            item.summary = force
                ? `Orphaned action ${item.actionItemId} was explicitly released for requeue.`
                : evidenceResultExpired
                    ? `Action ${item.actionItemId} produced durable evidence but no executor result within the grace period (evidence_complete_executor_result_missing); released for requeue.`
                    : absoluteExpired
                        ? `Action ${item.actionItemId} reached its absolute runtime deadline and was released for requeue.`
                        : `Action ${item.actionItemId} heartbeat lease expired and was released for requeue.`;
            return { actionItemId: item.actionItemId, executorId: item.executorId || 'loop-recovery', exitCode: null, timedOut: true, summary: item.summary };
        });
        state.noProgressCount += 1;
        state.lastFeedback = results.map(item => item.summary).filter(Boolean).join('; ');
        await this.markImplementationAttemptsBlocked(changePath, pending, results, state.lastFeedback);
        if ((pending.itemStates || []).every(item => this.isTerminalItemStatus(item.status))) {
            pending.executorCompletedAt = now.toISOString();
            pending.executorSucceeded = false;
        }
        return expired.length;
    }
    ensurePendingItemStates(pending) {
        const existing = new Map((pending.itemStates || []).map(item => [item.actionItemId, item]));
        const issuedAtMs = Date.parse(pending.issuedAt);
        const leaseBaseMs = Number.isFinite(issuedAtMs) ? issuedAtMs : this.now().getTime();
        pending.itemStates = (pending.items || []).map(item => {
            const current = existing.get(item.id);
            if (current) {
                current.tokenAllowance = current.tokenAllowance ?? item.tokenAllowance ?? null;
                current.tokenReservation = Math.max(0, Number(current.tokenReservation ?? current.tokenAllowance) || 0);
                current.heartbeatDueAt = current.heartbeatDueAt
                    || this.recommendedHeartbeatDueAt(current.heartbeatAt || current.issuedAt, current.leaseExpiresAt);
                current.absoluteExpiresAt = current.absoluteExpiresAt
                    || new Date(leaseBaseMs + this.actionMaxRuntimeMs(item.kind)).toISOString();
                current.evidenceReadyAt = current.evidenceReadyAt || null;
                current.evidenceResultDeadlineAt = current.evidenceResultDeadlineAt || null;
                return current;
            }
            return {
                actionItemId: item.id,
                status: 'issued',
                issuedAt: pending.issuedAt,
                heartbeatAt: null,
                heartbeatDueAt: new Date(leaseBaseMs + Math.floor(DEFAULT_ACTION_LEASE_MS / 2)).toISOString(),
                leaseExpiresAt: new Date(leaseBaseMs + DEFAULT_ACTION_LEASE_MS).toISOString(),
                absoluteExpiresAt: new Date(leaseBaseMs + this.actionMaxRuntimeMs(item.kind)).toISOString(),
                evidenceReadyAt: null,
                evidenceResultDeadlineAt: null,
                executorId: null,
                completedAt: null,
                exitCode: null,
                timedOut: false,
                tokensUsed: 0,
                tokenAllowance: item.tokenAllowance ?? null,
                tokenReservation: Math.max(0, Number(item.tokenAllowance) || 0),
                summary: null,
            };
        });
    }
    requireExecutorId(value) {
        const executorId = String(value ?? '').trim();
        if (!executorId)
            throw new Error('Executor ID must be a non-empty string.');
        return executorId;
    }
    recommendedHeartbeatDueAt(anchorIso, leaseExpiresAt) {
        const anchor = Date.parse(anchorIso);
        const expiry = Date.parse(leaseExpiresAt);
        if (!Number.isFinite(anchor) || !Number.isFinite(expiry) || expiry <= anchor) {
            return leaseExpiresAt;
        }
        return new Date(anchor + Math.floor((expiry - anchor) / 2)).toISOString();
    }
    actionMaxRuntimeMs(kind, efficiency) {
        if (kind === 'implementation' || kind === 'legacy') {
            return efficiency ? efficiency.implementationMaxRuntimeMinutes * 60 * 1000 : DEFAULT_IMPLEMENTATION_MAX_RUNTIME_MS;
        }
        if (kind === 'verification') {
            return efficiency ? efficiency.verificationMaxRuntimeMinutes * 60 * 1000 : DEFAULT_VERIFICATION_MAX_RUNTIME_MS;
        }
        return efficiency ? efficiency.reviewMaxRuntimeMinutes * 60 * 1000 : DEFAULT_REVIEW_MAX_RUNTIME_MS;
    }
    async extendControllerCapabilitySession(changePath, now) {
        const config = await this.readConfig(changePath);
        const capability = config.capability;
        if (config.executionModel !== 'controller'
            || capability?.controllerAvailable !== true
            || !capability.reportedAt
            || !capability.expiresAt)
            return;
        capability.expiresAt = new Date(now.getTime() + CapabilityProbeService_1.DEFAULT_CAPABILITY_SESSION_TTL_MS).toISOString();
        await this.fileService.writeJSON(this.configPath(changePath), config);
    }
    isTerminalItemStatus(status) {
        return status === 'completed' || status === 'failed' || status === 'expired';
    }
    executionResultMatches(item, result) {
        const expectedStatus = result.timedOut === true || result.exitCode !== 0 ? 'failed' : 'completed';
        return item.status === expectedStatus
            && item.exitCode === result.exitCode
            && item.timedOut === (result.timedOut === true)
            && item.tokensUsed === Math.max(0, Number(result.tokensUsed) || 0)
            && item.summary === (result.summary || null);
    }
    async appendRunLog(changePath, entry) {
        const line = `${JSON.stringify(entry)}\n`;
        const append = this.fileService.appendFile;
        if (append) {
            await append.call(this.fileService, this.runLogPath(changePath), line);
            return;
        }
        const current = (await this.fileService.exists(this.runLogPath(changePath))) ? await this.fileService.readFile(this.runLogPath(changePath)) : '';
        await this.fileService.writeFile(this.runLogPath(changePath), `${current}${current && !current.endsWith('\n') ? '\n' : ''}${line}`);
    }
    async withControllerLease(changePath, operation) {
        const lockPath = path.join(this.loopDir(path.resolve(changePath)), LOOP_CONTROLLER_LOCK_FILE);
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
        let handle = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const candidate = await fs_1.promises.open(lockPath, 'wx');
                try {
                    await candidate.writeFile(JSON.stringify({
                        version: 2,
                        pid: process.pid,
                        acquiredAt: new Date().toISOString(),
                        nonce,
                        heartbeat: true,
                    }));
                    handle = candidate;
                }
                catch (error) {
                    await candidate.close().catch(() => undefined);
                    await this.removeControllerLockIfOwned(lockPath, nonce);
                    throw error;
                }
                break;
            }
            catch (error) {
                if (error?.code !== 'EEXIST')
                    throw error;
                const owner = await this.readControllerLockOwner(lockPath);
                const stat = await fs_1.promises.stat(lockPath).catch(() => null);
                const lockAgeMs = stat ? Date.now() - stat.mtimeMs : 0;
                if (attempt === 0
                    && stat
                    && (lockAgeMs >= STALE_CONTROLLER_LOCK_MS || lockAgeMs <= -STALE_CONTROLLER_LOCK_MS)
                    && (owner
                        ? ((!this.isProcessAlive(owner.pid) || owner.heartbeat)
                            && await this.removeControllerLockIfOwned(lockPath, owner.nonce))
                        : await this.removeCorruptControllerLockIfUnchanged(lockPath, stat))) {
                    continue;
                }
                throw new Error(`Another loop controller tick is active for ${path.resolve(changePath)}.`);
            }
        }
        if (!handle)
            throw new Error(`Could not acquire the loop controller lease for ${path.resolve(changePath)}.`);
        const heartbeat = setInterval(() => {
            void this.refreshControllerLockIfOwned(lockPath, nonce);
        }, CONTROLLER_LOCK_HEARTBEAT_MS);
        heartbeat.unref();
        try {
            return await operation();
        }
        finally {
            clearInterval(heartbeat);
            await handle.close().catch(() => undefined);
            await this.removeControllerLockIfOwned(lockPath, nonce);
        }
    }
    async readControllerLockOwner(lockPath) {
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
    async refreshControllerLockIfOwned(lockPath, nonce) {
        const owner = await this.readControllerLockOwner(lockPath);
        if (owner?.nonce !== nonce)
            return;
        const now = new Date();
        await fs_1.promises.utimes(lockPath, now, now).catch(() => undefined);
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
    async removeControllerLockIfOwned(lockPath, nonce) {
        const owner = await this.readControllerLockOwner(lockPath);
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
    async removeCorruptControllerLockIfUnchanged(lockPath, observed) {
        const current = await fs_1.promises.stat(lockPath).catch(() => null);
        if (!current
            || current.size !== observed.size
            || current.mtimeMs !== observed.mtimeMs
            || await this.readControllerLockOwner(lockPath))
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
    async runOnce(changePath, options = {}) {
        await this.assertExists(changePath);
        const startedAt = Date.now();
        return this.withControllerLease(changePath, async () => {
            const before = await this.readState(changePath);
            const result = await this.runOnceUnlocked(changePath, options);
            const durationMs = Math.max(0, Date.now() - startedAt);
            const repeatedBlockerCount = result.stopReason
                ? before.lastFeedback === result.stopReason ? Math.max(2, before.noProgressCount + 1) : 1
                : 0;
            await this.appendRunLog(changePath, {
                ...this.logEntry(await this.readState(changePath), options.trigger || 'manual', result.verifyPassed, 'Loop tick performance metrics.'),
                event: 'tick_metrics',
                durationMs,
                gateDurationMs: result.currentStep === 'gate' ? durationMs : null,
                dispatchCount: result.actions.length,
                repeatedBlockerCount,
            });
            return result;
        });
    }
    async runOnceUnlocked(changePath, options = {}) {
        await this.assertExists(changePath);
        const resolved = path.resolve(changePath);
        const config = await this.readConfig(resolved);
        const state = await this.readState(resolved);
        const usageSnapshot = await this.taskGraph.readAuthoritativeUsageSnapshot(resolved).catch(() => null);
        if (usageSnapshot)
            state.artifactUsageByKey = usageSnapshot.byId;
        this.recomputeTokenUsage(state);
        const now = this.now();
        const nowIso = now.toISOString();
        const trigger = options.trigger || 'manual';
        if (!state.startedAt)
            state.startedAt = nowIso;
        const immediateStop = await this.getImmediateStop(resolved, state);
        if (immediateStop) {
            state.status = immediateStop.status;
            await this.writeState(resolved, state);
            return this.result(resolved, state, state.pendingControllerAction, immediateStop.status !== 'paused', immediateStop.reason, immediateStop.instruction, null, null);
        }
        await this.refreshPendingEvidenceReadiness(resolved, state, nowIso, config.efficiency);
        const recoveredExpired = await this.recoverExpiredActionsUnlocked(resolved, state, false);
        state.status = 'running';
        state.currentStep = 'observe';
        let verifyPassed = null;
        let feedback = state.lastFeedback;
        let verificationRepairRequired = false;
        if (state.pendingControllerAction?.status === 'awaiting-evidence') {
            const observation = await this.observePending(resolved, state.pendingControllerAction);
            verifyPassed = observation.verifyPassed;
            feedback = recoveredExpired > 0 && state.lastFeedback
                ? `${state.lastFeedback} ${observation.feedback || ''}`.trim()
                : observation.feedback;
            verificationRepairRequired = observation.repairRequired === true;
            state.lastFeedback = feedback;
            this.ensurePendingItemStates(state.pendingControllerAction);
            const executorLifecycleSettled = (state.pendingControllerAction.itemStates || []).length > 0
                && (state.pendingControllerAction.itemStates || []).every(item => this.isTerminalItemStatus(item.status));
            if (observation.settled && !executorLifecycleSettled) {
                for (const itemState of state.pendingControllerAction.itemStates || []) {
                    if (!this.isTerminalItemStatus(itemState.status) && itemState.executorId && !itemState.evidenceReadyAt) {
                        itemState.evidenceReadyAt = nowIso;
                        itemState.evidenceResultDeadlineAt = new Date(now.getTime() + config.efficiency.evidenceResultGraceMinutes * 60 * 1000).toISOString();
                    }
                }
                const hardStop = await this.getHardStop(resolved, config, state, now);
                if (hardStop) {
                    state.status = hardStop.status;
                    await this.writeState(resolved, state);
                    return this.result(resolved, state, state.pendingControllerAction, hardStop.status !== 'paused', hardStop.reason, hardStop.instruction, verifyPassed, feedback);
                }
                feedback = `${observation.feedback || 'Durable evidence is ready.'} Awaiting the claimed executor result before advancing.`;
                state.lastFeedback = feedback;
                state.lastTickTs = nowIso;
                await this.writeState(resolved, state);
                await this.appendRunLog(resolved, this.logEntry(state, trigger, verifyPassed, feedback));
                return this.result(resolved, state, state.pendingControllerAction, false, null, `Awaiting executor result for ${state.pendingControllerAction.actionId}. actions[] is intentionally empty; do not relaunch the child.`, verifyPassed, feedback);
            }
            if (!observation.settled) {
                if (state.pendingControllerAction.executorCompletedAt) {
                    const pending = state.pendingControllerAction;
                    const failureAlreadyCounted = (pending.itemStates || [])
                        .some(item => item.status === 'failed' || item.status === 'expired');
                    if (!failureAlreadyCounted)
                        state.noProgressCount += 1;
                    feedback = `${observation.feedback || 'Durable evidence is incomplete.'} The executor already exited, so this attempt will be retried with fresh context.`;
                    state.lastFeedback = feedback;
                    await this.markImplementationAttemptsBlocked(resolved, pending, [], feedback);
                    state.pendingControllerAction = null;
                }
                else {
                    const hardStop = await this.getHardStop(resolved, config, state, now);
                    if (hardStop) {
                        state.status = hardStop.status;
                        await this.writeState(resolved, state);
                        return this.result(resolved, state, state.pendingControllerAction, hardStop.status !== 'paused', hardStop.reason, hardStop.instruction, verifyPassed, feedback);
                    }
                    state.lastTickTs = nowIso;
                    await this.writeState(resolved, state);
                    await this.appendRunLog(resolved, this.logEntry(state, trigger, verifyPassed, feedback || 'Awaiting durable action evidence.'));
                    return this.result(resolved, state, state.pendingControllerAction, false, null, `Awaiting evidence for ${state.pendingControllerAction.actionId}. actions[] is intentionally empty: observe the already-running IDE subagent batch and never relaunch pending items; tick again after durable evidence arrives.`, verifyPassed, feedback);
                }
            }
            else {
                state.pendingControllerAction = null;
            }
        }
        const hardStop = await this.getHardStop(resolved, config, state, now);
        if (hardStop) {
            state.status = hardStop.status;
            await this.writeState(resolved, state);
            return this.result(resolved, state, state.pendingControllerAction, hardStop.status !== 'paused', hardStop.reason, hardStop.instruction, verifyPassed, feedback);
        }
        const pendingRequired = await this.countPendingRequiredDecisions(resolved);
        if (pendingRequired < 0) {
            return this.gateResult(resolved, state, trigger, 'Required decision index is damaged or unreadable. Regenerate it with "ospec execute status" before continuing.');
        }
        if (pendingRequired > 0) {
            state.currentStep = 'gate';
            state.lastTickTs = nowIso;
            await this.writeState(resolved, state);
            const instruction = `Present ${pendingRequired} required user decision(s), do not auto-select the recommended option, and record the actual answers before continuing; no safety level bypasses required decisions.`;
            await this.appendRunLog(resolved, this.logEntry(state, trigger, verifyPassed, instruction));
            return this.result(resolved, state, null, false, `${pendingRequired} pending required decision(s)`, instruction, verifyPassed, feedback);
        }
        if (config.level !== 'L1'
            && config.executionModel === 'controller'
            && !this.isControllerCapabilityCurrent(config, now)) {
            const fallback = await this.resolveRuntimeAdapter(resolved, config, false, now);
            if (fallback.blocked) {
                return this.gateResult(resolved, state, trigger, `Loop blocked: no current model-native subagent capability is available. ${fallback.warnings.join(' ')}`);
            }
        }
        state.currentStep = 'plan';
        const taskGraphPath = path.join(resolved, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(taskGraphPath))) {
            if (config.level === 'L1') {
                return this.runLegacyTick(resolved, config, state, { trigger, nowIso, projectRoot: options.projectRoot, layoutConfig: options.layoutConfig });
            }
            const documentReadinessError = await this.validateDocumentReviewReadiness(resolved);
            if (documentReadinessError)
                return this.gateResult(resolved, state, trigger, documentReadinessError);
            return this.gateResult(resolved, state, trigger, 'Loop blocked: a valid task graph derived from the approved implementation plan is required before executable work.');
        }
        let report;
        try {
            await this.taskGraph.restoreTaskReviewApprovals(resolved);
            report = await this.taskGraph.getReport(resolved);
        }
        catch (error) {
            return this.gateResult(resolved, state, trigger, `Task graph inspection failed: ${error?.message || error}`);
        }
        if (report.decisions.pendingRequired > 0 || report.decisions.blockers.length > 0) {
            const reason = report.decisions.blockers.length > 0
                ? `Required decision evidence is invalid: ${report.decisions.blockers.join('; ')}`
                : `${report.decisions.pendingRequired} required user decision(s) remain pending.`;
            return this.gateResult(resolved, state, trigger, reason);
        }
        const fingerprint = this.buildProgressFingerprint(report);
        if (state.progressFingerprint && state.progressFingerprint !== fingerprint)
            state.noProgressCount = 0;
        state.progressFingerprint = fingerprint;
        if (config.level === 'L3') {
            const safetyError = await this.validateTaskSafety(resolved, config, this.allReportTasks(report));
            if (safetyError)
                return this.gateResult(resolved, state, trigger, safetyError);
        }
        if (config.level !== 'L1') {
            const documentReadinessError = await this.validateDocumentReviewReadiness(resolved);
            if (documentReadinessError)
                return this.gateResult(resolved, state, trigger, documentReadinessError);
        }
        if (config.level === 'L1') {
            if (report.issues.length > 0 || report.invalidTasks.length > 0) {
                return this.gateResult(resolved, state, trigger, `Task graph is invalid: ${[...report.issues, ...report.invalidTasks.flatMap(item => item.reasons)].join('; ')}`);
            }
            const summary = this.reportSummary(report);
            if (options.projectRoot) {
                await (0, TriageService_1.createTriageService)(this.fileService).append(options.projectRoot, options.layoutConfig ?? null, {
                    source: 'loop', severity: 'info', title: `Loop audit: ${summary}`,
                    suggestedAction: report.nextInstruction, changePath: resolved,
                }).catch(() => undefined);
            }
            state.currentStep = 'log';
            state.iteration += 1;
            state.comprehensionDebtCounter += 1;
            state.lastTickTs = nowIso;
            await this.writeState(resolved, state);
            await this.appendRunLog(resolved, this.logEntry(state, trigger, null, summary));
            return this.result(resolved, state, null, false, null, `L1 report-only: ${summary}. ${report.nextInstruction}`, null, summary);
        }
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            return this.gateResult(resolved, state, trigger, `Task graph is invalid: ${[...report.issues, ...report.invalidTasks.flatMap(item => item.reasons)].join('; ')}`);
        }
        const allowedWorkspacePaths = this.allReportTasks(report)
            .filter(task => task.status !== 'PENDING')
            .flatMap(task => task.targetFiles);
        const workspaceReadinessError = await this.validateWorkspaceReadiness(resolved, allowedWorkspacePaths);
        if (workspaceReadinessError)
            return this.gateResult(resolved, state, trigger, workspaceReadinessError);
        if (verificationRepairRequired) {
            const prepared = await this.prepareLoopBatch(resolved, config, state, 1, true, now, 'final-review');
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.preparedBatchGateResult(resolved, state, trigger, 'final-review', prepared);
            }
            await this.resetFinalReviewForVerificationFailure(resolved, feedback);
            const review = await this.taskGraph.review(resolved);
            return this.issueAction(resolved, config, state, trigger, 'final-review', [this.reviewAction(resolved, config, review.dispatch, state.iteration + 1)], `${feedback || 'Verification failed.'} Independent final review is required before grouped repair.`, false, prepared);
        }
        const reviewTasks = report.completedTasks.filter(task => !task.review || !APPROVED_REVIEW_DECISIONS.has(task.review.decision));
        const blockedRetryTasks = report.blockedTasks
            .map(item => item.task)
            .filter(task => task.status === 'BLOCKED' || task.status === 'NEEDS_CONTEXT');
        if (blockedRetryTasks.length > 0) {
            const graphSafe = this.taskGraph.selectConflictSafeTasks(blockedRetryTasks);
            const prepared = await this.prepareLoopBatch(resolved, config, state, graphSafe.length, false, now, 'implementation', graphSafe.length < blockedRetryTasks.length ? ['graph_conflict_or_serial_task'] : []);
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.preparedBatchGateResult(resolved, state, trigger, 'implementation', prepared);
            }
            const selected = graphSafe.slice(0, prepared.limit);
            const safetyError = await this.validateTaskSafety(resolved, config, selected);
            if (safetyError)
                return this.gateResult(resolved, state, trigger, safetyError);
            state.currentStep = 'repair';
            const retry = await this.taskGraph.retryWorkerRuns(resolved, {
                tasks: selected.map(task => ({
                    taskId: task.id,
                    force: true,
                    trigger: 'worker_status',
                    summary: `Loop retry after worker status ${task.status}. ${feedback || ''}`.trim(),
                })),
            });
            return this.issueAction(resolved, config, state, trigger, 'implementation', retry.dispatches.map(item => this.workerAction(resolved, config, item, state.iteration + 1)), feedback, verifyPassed, prepared);
        }
        const needsRepair = reviewTasks.filter(task => RETRY_REVIEW_DECISIONS.has(task.review?.decision || ''));
        if (needsRepair.length > 0) {
            const repairRounds = new Map(await Promise.all(needsRepair.map(async (task) => [
                task.id,
                await this.taskGraph.countTaskReviewRepairRounds(resolved, task.id),
            ])));
            const eligibleRepairs = needsRepair.filter(task => (repairRounds.get(task.id) || 0) < config.efficiency.maxTaskRepairRounds);
            const exhaustedRepairs = needsRepair.filter(task => !eligibleRepairs.includes(task));
            if (eligibleRepairs.length === 0) {
                return this.gateResult(resolved, state, trigger, `Loop blocked: task-review repair limit reached (${exhaustedRepairs.map(task => `${task.id}=${repairRounds.get(task.id)}/${config.efficiency.maxTaskRepairRounds}`).join(', ')}). Inspect unresolved findings and require explicit user authorization before raising --max-task-repair-rounds.`);
            }
            const graphSafe = this.taskGraph.selectConflictSafeTasks(eligibleRepairs);
            const prepared = await this.prepareLoopBatch(resolved, config, state, graphSafe.length, false, now, 'implementation', [
                ...(graphSafe.length < eligibleRepairs.length ? ['graph_conflict_or_serial_task'] : []),
                ...(exhaustedRepairs.length > 0 ? ['task_review_repair_limit'] : []),
            ]);
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.preparedBatchGateResult(resolved, state, trigger, 'implementation', prepared);
            }
            const selected = graphSafe.slice(0, prepared.limit);
            const safetyError = await this.validateTaskSafety(resolved, config, selected);
            if (safetyError)
                return this.gateResult(resolved, state, trigger, safetyError);
            state.currentStep = 'repair';
            const retry = await this.taskGraph.retryWorkerRuns(resolved, {
                tasks: selected.map(task => ({
                    taskId: task.id,
                    force: true,
                    trigger: 'task_review',
                    summary: `Loop retry after task review ${task.review?.decision || 'requested changes'}.`,
                })),
            });
            return this.issueAction(resolved, config, state, trigger, 'implementation', retry.dispatches.map(item => this.workerAction(resolved, config, item, state.iteration + 1)), feedback, verifyPassed, prepared);
        }
        if (reviewTasks.length > 0) {
            const graphSafe = this.taskGraph.selectConflictSafeTasks(reviewTasks, { respectParallelizable: false });
            const prepared = await this.prepareLoopBatch(resolved, config, state, graphSafe.length, true, now, 'task-review', graphSafe.length < reviewTasks.length ? ['graph_conflict'] : []);
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.preparedBatchGateResult(resolved, state, trigger, 'task-review', prepared);
            }
            const reviews = await this.taskGraph.reviewTasks(resolved, {
                taskIds: graphSafe.slice(0, prepared.limit).map(task => task.id),
            });
            return this.issueAction(resolved, config, state, trigger, 'task-review', reviews.dispatches.map(item => this.reviewAction(resolved, config, item, state.iteration + 1)), feedback, verifyPassed, prepared);
        }
        if (report.dispatchableTasks.length > 0) {
            const prepared = await this.prepareLoopBatch(resolved, config, state, report.dispatchableTasks.length, false, now, 'implementation');
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.preparedBatchGateResult(resolved, state, trigger, 'implementation', prepared);
            }
            const selected = report.dispatchableTasks.slice(0, prepared.limit);
            const safetyError = await this.validateTaskSafety(resolved, config, selected);
            if (safetyError)
                return this.gateResult(resolved, state, trigger, safetyError);
            const dispatch = await this.taskGraph.dispatch(resolved, { limit: selected.length });
            return this.issueAction(resolved, config, state, trigger, 'implementation', dispatch.dispatches.map(item => this.workerAction(resolved, config, item, state.iteration + 1)), feedback, verifyPassed, prepared);
        }
        if (report.runningTasks.length > 0) {
            return this.gateResult(resolved, state, trigger, `Task(s) still marked in progress without a live loop action: ${report.runningTasks.map(task => task.id).join(', ')}. Collect their durable result or explicitly mark/retry them; automatic duplicate dispatch is disabled.`);
        }
        if (report.taskCount > 0 && report.completedTasks.length === report.taskCount && report.graphStatus.toLowerCase() === 'completed') {
            const finalDecision = await this.readFinalReviewDecision(resolved);
            if (finalDecision === 'BLOCKED') {
                return this.gateResult(resolved, state, trigger, 'Loop blocked: final review is BLOCKED. Resolve the reviewer blocker or record the required user decision before continuing; grouped repair is only valid for NEEDS_CHANGES.');
            }
            if (finalDecision === 'NEEDS_CHANGES') {
                const repairRounds = await this.taskGraph.countFinalReviewRepairWaves(resolved);
                if (repairRounds >= config.efficiency.maxFinalRepairRounds) {
                    return this.gateResult(resolved, state, trigger, `Loop blocked: final-review repair limit reached (final=${repairRounds}/${config.efficiency.maxFinalRepairRounds}). Inspect unresolved findings and require explicit user authorization before raising --max-final-repair-rounds.`);
                }
                const safetyError = await this.validateTaskSafety(resolved, config, this.allReportTasks(report));
                if (safetyError)
                    return this.gateResult(resolved, state, trigger, safetyError);
                const prepared = await this.prepareLoopBatch(resolved, config, state, 1, false, now, 'implementation');
                if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                    return this.runtimeAdapterGateResult(resolved, state, trigger, 'implementation', prepared.runtimeAdapter);
                }
                state.currentStep = 'repair';
                const repair = await this.taskGraph.createRepairWave(resolved);
                return this.issueAction(resolved, config, state, trigger, 'implementation', repair.dispatch.dispatches.map(item => this.workerAction(resolved, config, item, state.iteration + 1)), `Final review ${finalDecision}; grouped repair dispatched.`, verifyPassed, prepared);
            }
            if (!APPROVED_REVIEW_DECISIONS.has(finalDecision)) {
                const prepared = await this.prepareLoopBatch(resolved, config, state, 1, true, now, 'final-review');
                if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                    return this.runtimeAdapterGateResult(resolved, state, trigger, 'final-review', prepared.runtimeAdapter);
                }
                const review = await this.taskGraph.review(resolved);
                return this.issueAction(resolved, config, state, trigger, 'final-review', [this.reviewAction(resolved, config, review.dispatch, state.iteration + 1)], feedback, verifyPassed, prepared);
            }
            const outcome = await this.verification.verify(resolved).catch((error) => ({
                passed: false,
                checks: [{ name: 'verification', status: 'fail', message: error?.message || String(error) }],
                summary: error?.message || String(error),
                failCount: 1,
                warnCount: 0,
                workflowProfile: 'goal',
            }));
            verifyPassed = outcome.passed;
            if (outcome.passed) {
                state.status = 'done';
                state.currentStep = 'verify';
                state.lastFeedback = outcome.summary;
                state.lastTickTs = nowIso;
                await this.writeState(resolved, state);
                await this.appendRunLog(resolved, this.logEntry(state, trigger, true, outcome.summary));
                return this.result(resolved, state, null, true, 'goal verified', 'Loop complete: task graph, reviews, evidence, and protocol verification passed.', true, outcome.summary);
            }
            if (config.level === 'L3') {
                let invalidCommand;
                for (const command of config.stopConditions.testCommands) {
                    if (!(await this.isCommandAllowed(resolved, command, config.allowlist.commands))) {
                        invalidCommand = command;
                        break;
                    }
                }
                if (invalidCommand)
                    return this.gateResult(resolved, state, trigger, `L3 blocked final verification command outside the allowlist (${invalidCommand}).`);
            }
            const verificationAction = this.verificationAction(resolved, config, outcome, state.iteration + 1);
            const prepared = await this.prepareLoopBatch(resolved, config, state, 1, false, now, 'verification');
            if (prepared.runtimeAdapter.blocked || prepared.limit === 0) {
                return this.runtimeAdapterGateResult(resolved, state, trigger, 'verification', prepared.runtimeAdapter);
            }
            return this.issueAction(resolved, config, state, trigger, 'verification', [verificationAction], outcome.summary, false, prepared);
        }
        return this.gateResult(resolved, state, trigger, report.nextInstruction || 'No safe loop action is currently available.');
    }
    async observePending(changePath, pending) {
        const items = pending.items || [];
        if (items.length === 0 || pending.kind === 'legacy') {
            const outcome = await this.verification.verify(changePath).catch(() => null);
            return outcome?.passed
                ? { settled: true, verifyPassed: true, feedback: outcome.summary }
                : { settled: false, verifyPassed: false, feedback: outcome?.summary || 'Protocol verification has not passed.' };
        }
        if (pending.kind === 'verification') {
            const evidence = await this.readLatestVerificationEvidence(changePath, pending);
            const evidenceRecordedAt = evidence ? Date.parse(evidence.recordedAt) : Number.NaN;
            const pendingIssuedAt = Date.parse(pending.issuedAt);
            const freshForPending = evidence
                && Number.isFinite(evidenceRecordedAt)
                && Number.isFinite(pendingIssuedAt)
                && evidenceRecordedAt >= pendingIssuedAt;
            if (!freshForPending) {
                return { settled: false, verifyPassed: false, feedback: 'Awaiting fresh verification evidence issued for the current Loop action.' };
            }
            if (evidence && (evidence.status === 'FAILED' || evidence.status === 'BLOCKED')) {
                return {
                    settled: true,
                    verifyPassed: false,
                    repairRequired: true,
                    feedback: `Verification evidence is ${evidence.status}${evidence.summary ? `: ${evidence.summary}` : '.'}`,
                };
            }
            const outcome = await this.verification.verify(changePath).catch(() => null);
            return outcome?.passed
                ? { settled: true, verifyPassed: true, feedback: outcome.summary }
                : { settled: false, verifyPassed: false, feedback: outcome?.summary || 'Verification evidence is still incomplete.' };
        }
        if (pending.kind === 'final-review') {
            const decision = await this.readFinalReviewDecision(changePath);
            return decision === 'PENDING' || !decision
                ? { settled: false, verifyPassed: null, feedback: 'Final review decision is still pending.' }
                : { settled: true, verifyPassed: APPROVED_REVIEW_DECISIONS.has(decision), feedback: `Final review decision: ${decision}.` };
        }
        const report = await this.taskGraph.getReport(changePath).catch(() => null);
        if (!report)
            return { settled: false, verifyPassed: false, feedback: 'Task graph could not be inspected while observing the pending action.' };
        if (pending.kind === 'task-review') {
            const tasks = this.allReportTasks(report);
            const decisions = items.map(item => tasks.find(task => task.id === item.taskId)?.review?.decision || 'PENDING');
            return decisions.some(decision => decision === 'PENDING')
                ? { settled: false, verifyPassed: null, feedback: `Awaiting ${decisions.filter(item => item === 'PENDING').length} task review decision(s).` }
                : { settled: true, verifyPassed: decisions.every(decision => APPROVED_REVIEW_DECISIONS.has(decision)), feedback: `Task review decisions: ${decisions.join(', ')}.` };
        }
        const taskIds = new Set(items.map(item => item.taskId).filter(Boolean));
        const tasks = this.allReportTasks(report).filter(task => taskIds.has(task.id));
        const settled = tasks.length === taskIds.size && tasks.every(task => ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status));
        const passed = settled && tasks.every(task => task.status === 'DONE' || task.status === 'DONE_WITH_CONCERNS');
        return {
            settled,
            verifyPassed: settled ? passed : null,
            feedback: settled ? `Worker task status: ${tasks.map(task => `${task.id}=${task.status}`).join(', ')}.` : `Awaiting ${taskIds.size - tasks.filter(task => ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status)).length} worker completion(s).`,
        };
    }
    async refreshPendingEvidenceReadiness(changePath, state, nowIso, efficiency) {
        const pending = state.pendingControllerAction;
        if (!pending || pending.status !== 'awaiting-evidence')
            return;
        this.ensurePendingItemStates(pending);
        let report;
        let verificationEvidence;
        for (const itemState of pending.itemStates || []) {
            if (this.isTerminalItemStatus(itemState.status) || !itemState.executorId)
                continue;
            const item = (pending.items || []).find(candidate => candidate.id === itemState.actionItemId);
            if (!item)
                continue;
            let ready = false;
            if (item.usageKey && (item.kind === 'task-review' || item.kind === 'final-review')) {
                ready = await this.taskGraph.hasReviewLoopEvidence(changePath, {
                    dispatchId: item.usageKey,
                    actionId: pending.actionId,
                    actionItemId: item.id,
                    executorId: itemState.executorId,
                });
            }
            else if (item.kind === 'verification' || item.kind === 'legacy') {
                verificationEvidence ?? (verificationEvidence = await this.readLatestVerificationEvidence(changePath, pending));
                ready = Boolean(verificationEvidence);
            }
            else if (item.taskId) {
                report ?? (report = await this.taskGraph.getReport(changePath).catch(() => null));
                const task = report
                    ? this.allReportTasks(report).find(candidate => candidate.id === item.taskId)
                    : null;
                ready = Boolean(task && ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status));
            }
            if (ready) {
                itemState.evidenceReadyAt = itemState.evidenceReadyAt || nowIso;
                itemState.evidenceResultDeadlineAt = itemState.evidenceResultDeadlineAt || new Date(Date.parse(itemState.evidenceReadyAt) + efficiency.evidenceResultGraceMinutes * 60 * 1000).toISOString();
            }
            else {
                itemState.evidenceReadyAt = null;
                itemState.evidenceResultDeadlineAt = null;
            }
        }
    }
    async readLatestVerificationEvidence(changePath, pending) {
        const evidencePath = path.join(changePath, 'artifacts', 'agents', 'verification-evidence.json');
        if (!(await this.fileService.exists(evidencePath)))
            return null;
        try {
            const evidence = await this.fileService.readJSON(evidencePath);
            const records = Array.isArray(evidence.records) ? evidence.records : [];
            const verificationItem = (pending.items || []).find(item => item.kind === 'verification');
            const itemState = verificationItem
                ? (pending.itemStates || []).find(item => item.actionItemId === verificationItem.id)
                : null;
            if (!verificationItem || !itemState?.executorId)
                return null;
            const latest = [...records].reverse().find(record => record.loopActionId === pending.actionId
                && record.loopActionItemId === verificationItem.id
                && record.executorId === itemState.executorId
                && record.targetSnapshotHash === verificationItem.verificationBinding?.targetSnapshotHash
                && record.issuanceTargetSnapshotHash === verificationItem.verificationBinding?.targetSnapshotHash);
            if (!latest)
                return null;
            return {
                id: String(latest.id || '').trim(),
                status: String(latest.status || '').trim().toUpperCase(),
                recordedAt: String(latest.recordedAt || '').trim(),
                summary: latest.summary?.trim() || null,
            };
        }
        catch {
            return null;
        }
    }
    async issueAction(changePath, config, state, trigger, kind, items, feedback, verifyPassed = null, prepared) {
        const issuedAt = this.now();
        const now = issuedAt.toISOString();
        const preparedBatch = prepared || await this.prepareLoopBatch(changePath, config, state, items.length, kind === 'task-review' || kind === 'final-review', issuedAt, kind);
        const runtimeAdapter = preparedBatch.runtimeAdapter;
        if (runtimeAdapter.blocked || !runtimeAdapter.selected) {
            return this.gateResult(changePath, state, trigger, `Loop blocked: no safe runtime adapter can execute ${kind}. ${runtimeAdapter.warnings.join(' ')}`);
        }
        if (items.length > preparedBatch.limit) {
            return this.gateResult(changePath, state, trigger, `Loop blocked: prepared ${kind} batch contains ${items.length} item(s), exceeding the safe effective limit ${preparedBatch.limit}.`);
        }
        preparedBatch.diagnostics.effectiveEmitted = items.length;
        state.lastBatchDiagnostics = { ...preparedBatch.diagnostics };
        const actionId = `loop-action-${state.iteration + 1}-${Date.parse(now)}`;
        const initialHeartbeatDueAt = new Date(Date.parse(now) + Math.floor(DEFAULT_ACTION_LEASE_MS / 2)).toISOString();
        const initialLeaseExpiresAt = new Date(Date.parse(now) + DEFAULT_ACTION_LEASE_MS).toISOString();
        const controllerProvenanceRequired = runtimeAdapter.selected.kind === 'native'
            && this.isControllerCapabilityCurrent(config, issuedAt)
            && (kind === 'task-review' || kind === 'final-review');
        const allowances = this.allocateTokenAllowances(config, state, items.length);
        const projectRoot = await this.findProjectRootForSafety(changePath);
        for (const item of items) {
            const actionRuntimeAdapter = item.modelSelection
                ? this.runtimeAdapter.resolve({
                    projectRoot,
                    target: config.target,
                    capability: config.capability,
                    preference: 'native',
                    strict: true,
                    requiresIndependentWorker: item.kind === 'task-review' || item.kind === 'final-review',
                    now: issuedAt,
                    modelSelection: item.modelSelection,
                    nativeHarness: config.nativeHarnessMetadata,
                })
                : runtimeAdapter;
            if (actionRuntimeAdapter.blocked
                || actionRuntimeAdapter.selectedAdapterId !== runtimeAdapter.selectedAdapterId) {
                throw new Error(`Action ${item.id} model metadata resolution changed the preflight runtime adapter; no task-graph mutation may be issued.`);
            }
            item.runtimeAdapter = actionRuntimeAdapter;
            item.controllerProvenanceRequired = controllerProvenanceRequired;
            item.nativeSessionTarget = config.target;
            item.nativeSessionReportedAt = config.capability.reportedAt;
            item.tokenAllowance = allowances.shift() ?? null;
            item.heartbeatCommand = `ospec loop heartbeat ${this.quote(changePath)} --action-item ${this.quote(item.id)} --executor <child-id>`;
            item.heartbeatDueAt = initialHeartbeatDueAt;
            item.absoluteExpiresAt = new Date(Date.parse(now) + this.actionMaxRuntimeMs(item.kind, config.efficiency)).toISOString();
            item.resultCommand = `ospec loop finalize ${this.quote(changePath)} --action-item ${this.quote(item.id)} --executor <child-id> --exit-code <code> --summary "..."`;
            if (item.kind === 'verification') {
                item.verificationBinding = await this.taskGraph.bindVerificationLoopAction(changePath, {
                    actionId,
                    actionItemId: item.id,
                    issuedAt: now,
                    expectedCommand: item.verificationCommand || null,
                });
                const unboundCompletion = item.completionCommand;
                item.completionCommand = `${unboundCompletion} --loop-action ${this.quote(actionId)} --action-item ${this.quote(item.id)} --executor <child-id>`;
                item.prompt = item.prompt.replace(unboundCompletion, item.completionCommand);
            }
            const promptAdditions = [
                `Runtime adapter: ${actionRuntimeAdapter.selectedAdapterId}. ${actionRuntimeAdapter.selected?.supportsParallel ? 'This safe batch may run in parallel.' : 'Run this batch serially in item order.'}`,
                `Use bounded native waits only: poll for at most ${actionRuntimeAdapter.selected?.nativeSubagent?.maxWaitMs || 60000}ms, refresh this action heartbeat before ${item.heartbeatDueAt}, persist each finished result immediately, and tick OSpec again after every poll.`,
            ];
            if (item.tokenAllowance !== null) {
                promptAdditions.push(`Token allowance for this action: ${item.tokenAllowance}. Keep the run within this reserved share and report actual usage.`);
            }
            item.prompt = this.boundPrompt([
                item.prompt,
                ...promptAdditions,
            ], config.efficiency.promptMaxChars, [
                `Read the authoritative packet at: ${item.packetPath}`,
                `Claim and heartbeat with: ${item.heartbeatCommand}`,
                `Record durable evidence with: ${item.completionCommand}`,
                `Record the executor result with: ${item.resultCommand}`,
            ]);
        }
        for (const item of items) {
            if (!item.usageKey || (item.kind !== 'task-review' && item.kind !== 'final-review'))
                continue;
            await this.taskGraph.bindReviewLoopAction(changePath, {
                dispatchId: item.usageKey,
                actionId,
                actionItemId: item.id,
                controllerSessionReportedAt: controllerProvenanceRequired
                    ? config.capability?.reportedAt || config.createdAt
                    : null,
                runtimeAdapter: item.runtimeAdapter || runtimeAdapter,
            });
        }
        state.iteration += 1;
        state.comprehensionDebtCounter += 1;
        state.currentStep = kind === 'verification' ? 'verify' : kind.includes('review') ? 'act' : 'act';
        state.lastTickTs = now;
        state.lastFeedback = feedback;
        state.pendingControllerAction = {
            actionId,
            kind,
            status: 'awaiting-evidence',
            issuedAt: now,
            attempt: state.noProgressCount + 1,
            expiresAt: config.stopConditions.expiresAt,
            packetPath: items[0]?.packetPath || '',
            launchPlanPath: path.join(changePath, 'artifacts', 'agents', 'launch-plan.md'),
            instructionPath: items[0]?.instructionPath || '',
            completionCommand: items[0]?.completionCommand || '',
            expectedEvidencePath: items[0]?.expectedEvidencePath || '',
            items,
            itemStates: items.map(item => ({
                actionItemId: item.id,
                status: 'issued',
                issuedAt: now,
                heartbeatAt: null,
                heartbeatDueAt: initialHeartbeatDueAt,
                leaseExpiresAt: initialLeaseExpiresAt,
                absoluteExpiresAt: item.absoluteExpiresAt,
                evidenceReadyAt: null,
                evidenceResultDeadlineAt: null,
                executorId: null,
                completedAt: null,
                exitCode: null,
                timedOut: false,
                tokensUsed: 0,
                tokenAllowance: item.tokenAllowance ?? null,
                tokenReservation: Math.max(0, Number(item.tokenAllowance) || 0),
                summary: null,
            })),
            progressFingerprint: state.progressFingerprint,
        };
        await this.writeState(changePath, state);
        await this.appendRunLog(changePath, {
            ...this.logEntry(state, trigger, null, `Issued ${kind} batch with ${items.length} action item(s).`),
            actionId,
            actionCount: items.length,
        });
        preparedBatch.diagnostics.effectiveEmitted = items.length;
        const mode = runtimeAdapter.selected.supportsParallel && items.length > 1
            ? `Execute with runtime adapter ${runtimeAdapter.selectedAdapterId} in parallel for`
            : `Execute serially with runtime adapter ${runtimeAdapter.selectedAdapterId} for`;
        return this.result(changePath, state, state.pendingControllerAction, false, null, `${mode} ${items.length} fresh-context ${kind} action(s); consume only the referenced packets, record durable completion/review evidence, then tick again.`, verifyPassed, feedback, items, preparedBatch.diagnostics);
    }
    workerAction(changePath, config, dispatch, iteration) {
        const packetPath = path.resolve(changePath, dispatch.packetPath);
        const target = config.target;
        const completionCommand = `ospec execute complete ${this.quote(dispatch.taskId)} ${this.quote(changePath)} --dispatch ${this.quote(dispatch.id)} --status DONE --summary "..."`;
        return {
            id: `worker-${iteration}-${dispatch.taskId}`,
            kind: 'implementation',
            taskId: dispatch.taskId,
            role: dispatch.workerRole || 'worker',
            target,
            packetPath,
            instructionPath: packetPath,
            prompt: this.boundPrompt([
                config.efficiency.freshContext ? 'Start a fresh, isolated subagent context for this one task.' : 'Execute this one task in the current worker context.',
                `Read the authoritative packet at: ${packetPath}`,
                'Do not reload the whole goal. Follow the packet target-file boundary and verification commands.',
                `Record completion with: ${completionCommand}`,
            ], config.efficiency.promptMaxChars),
            completionCommand,
            expectedEvidencePath: path.resolve(changePath, dispatch.recordPath),
            usageKey: dispatch.id,
            modelSelection: {
                requestedModel: dispatch.workerProfile?.requestedModel ?? dispatch.workerProfile?.model ?? null,
                configuredModel: dispatch.workerProfile?.configuredModel ?? dispatch.workerProfile?.model ?? null,
                configurationSource: dispatch.workerProfile?.modelConfigurationSource
                    || (dispatch.workerProfile?.model ? 'target' : 'harness-default'),
            },
        };
    }
    reviewAction(changePath, config, dispatch, iteration) {
        const packetPath = path.resolve(changePath, dispatch.packetPath);
        const target = config.target;
        const completionCommand = `ospec execute sync ${this.quote(changePath)}`;
        return {
            id: `review-${iteration}-${dispatch.taskId || 'final'}`,
            kind: dispatch.taskId ? 'task-review' : 'final-review',
            taskId: dispatch.taskId,
            role: dispatch.reviewerRole,
            target,
            packetPath,
            instructionPath: packetPath,
            prompt: this.boundPrompt([
                'Start a fresh, independent read-only reviewer subagent context.',
                `Read the authoritative review packet at: ${packetPath}`,
                'Write concrete findings and the required decision to the referenced review artifact. Do not edit implementation files.',
                `Synchronize the decision with: ${completionCommand}`,
            ], config.efficiency.promptMaxChars),
            completionCommand,
            expectedEvidencePath: path.resolve(changePath, dispatch.reviewArtifactPath),
            usageKey: dispatch.id,
            modelSelection: {
                requestedModel: dispatch.workerProfile?.requestedModel ?? dispatch.workerProfile?.model ?? null,
                configuredModel: dispatch.workerProfile?.configuredModel ?? dispatch.workerProfile?.model ?? null,
                configurationSource: dispatch.workerProfile?.modelConfigurationSource
                    || (dispatch.workerProfile?.model ? 'target' : 'harness-default'),
            },
        };
    }
    verificationAction(changePath, config, outcome, iteration) {
        const commands = config.stopConditions.testCommands;
        const commandText = commands.length > 0 ? commands.join(' && ') : '<project test/build commands from verification.md>';
        const completionCommand = `ospec execute verify ${this.quote(changePath)} --command ${this.quote(commandText)} --status PASSED --exit-code 0`;
        const id = `verify-${iteration}`;
        return {
            id,
            kind: 'verification',
            taskId: null,
            role: 'verifier',
            target: config.target,
            packetPath: path.resolve(changePath, 'verification.md'),
            instructionPath: path.resolve(changePath, 'verification.md'),
            prompt: this.boundPrompt([
                `Protocol verification is not complete: ${outcome.summary}`,
                `Run deterministic verification commands: ${commandText}`,
                'This is a read-only verification pass. Do not edit implementation or test files after final review.',
                'If a command fails, record FAILED evidence and return the concrete failure so the controller can route a reviewed repair.',
                'Update verification.md checkboxes only for evidence that actually passed.',
                `On success record evidence with: ${completionCommand}`,
            ], config.efficiency.promptMaxChars),
            completionCommand,
            expectedEvidencePath: path.resolve(changePath, 'artifacts', 'agents', 'verification-evidence.json'),
            usageKey: id,
            verificationCommand: commands.length > 0 ? commandText : null,
        };
    }
    async validateTaskSafety(changePath, config, tasks) {
        if (config.level !== 'L3')
            return null;
        if (config.allowlist.paths.length === 0 || config.allowlist.commands.length === 0) {
            return 'L3 requires non-empty path and command allowlists before unattended task dispatch.';
        }
        const exactTaskGraphPaths = (config.allowlist.metadata?.pathSource
            || config.allowlist.metadata?.source) === 'task-graph';
        for (const task of tasks) {
            let invalidPath;
            for (const file of task.targetFiles) {
                if (!(await this.isPathAllowed(changePath, file, config.allowlist.paths, exactTaskGraphPaths))) {
                    invalidPath = file;
                    break;
                }
            }
            if (invalidPath)
                return `L3 blocked task ${task.id}: target path is outside the allowlist (${invalidPath}).`;
            let invalidCommand;
            for (const command of task.verificationCommands) {
                if (!(await this.isCommandAllowed(changePath, command, config.allowlist.commands))) {
                    invalidCommand = command;
                    break;
                }
            }
            if (invalidCommand)
                return `L3 blocked task ${task.id}: verification command is outside the allowlist (${invalidCommand}).`;
        }
        return null;
    }
    async getImmediateStop(changePath, state) {
        if (await this.fileService.exists(this.stopFilePath(changePath)))
            return { status: 'stopped', reason: 'STOP file present', instruction: 'Remove the STOP file and resume to continue.' };
        if (state.status === 'paused')
            return { status: 'paused', reason: 'loop paused', instruction: 'Review the current state, then run "ospec loop resume".' };
        return null;
    }
    async getHardStop(changePath, config, state, now) {
        if (config.stopConditions.maxIterations !== null && state.iteration >= config.stopConditions.maxIterations)
            return { status: 'stopped', reason: 'maxIterations reached', instruction: 'Iteration budget reached; inspect unresolved work before raising the limit.' };
        if (config.stopConditions.expiresAt && now.getTime() >= Date.parse(config.stopConditions.expiresAt))
            return { status: 'stopped', reason: 'expiresAt reached', instruction: 'The configured deadline expired; review and explicitly reconfigure before resuming.' };
        if (config.stopConditions.budgetTokens !== null && config.stopConditions.budgetTokens - state.tokensUsed < 1)
            return { status: 'stopped', reason: 'token budget reached', instruction: 'Token budget exhausted; inspect usage before increasing it.' };
        if (config.stopConditions.budgetMinutes !== null && this.elapsedMinutes(state, now) >= config.stopConditions.budgetMinutes)
            return { status: 'stopped', reason: 'time budget reached', instruction: 'Time budget exhausted; inspect progress before increasing it.' };
        if (state.noProgressCount >= config.efficiency.noProgressLimit)
            return { status: 'stopped', reason: 'no-progress circuit breaker', instruction: 'Repeated attempts made no progress; inspect feedback and change strategy before resuming.' };
        if (config.efficiency.comprehensionReviewEvery > 0 && state.comprehensionDebtCounter >= config.efficiency.comprehensionReviewEvery)
            return { status: 'paused', reason: 'comprehension review checkpoint', instruction: 'Review the run log, current diff, decisions, and remaining task graph; resume after comprehension is restored.' };
        return null;
    }
    async runLegacyTick(changePath, config, state, input) {
        state.currentStep = 'act';
        state.iteration += 1;
        state.comprehensionDebtCounter += 1;
        state.lastTickTs = input.nowIso;
        if (config.level === 'L1') {
            if (input.projectRoot)
                await (0, TriageService_1.createTriageService)(this.fileService).append(input.projectRoot, input.layoutConfig ?? null, {
                    source: 'loop', severity: 'info', title: `Legacy L1 loop audit iteration ${state.iteration}`,
                    suggestedAction: 'Add a valid task graph to enable executable loop actions.', changePath,
                }).catch(() => undefined);
            await this.writeState(changePath, state);
            await this.appendRunLog(changePath, this.logEntry(state, input.trigger, null, 'Legacy L1 report-only tick; task graph missing.'));
            return this.result(changePath, state, null, false, null, 'L1 report-only: no task graph exists, so no executable action was issued.', null, 'Task graph missing.');
        }
        const item = {
            id: `legacy-${state.iteration}`,
            kind: 'legacy', taskId: null, role: 'goal_worker', target: config.target,
            packetPath: '', instructionPath: '',
            prompt: 'A legacy goal has no task graph. Complete the goal through the documented OSpec workflow and record verification evidence.',
            completionCommand: `ospec execute verify ${this.quote(changePath)} --status PASSED --exit-code 0 --command "..."`,
            expectedEvidencePath: path.resolve(changePath, 'artifacts', 'agents', 'verification-evidence.json'),
        };
        state.iteration -= 1;
        state.comprehensionDebtCounter -= 1;
        return this.issueAction(changePath, config, state, input.trigger, 'legacy', [item], 'Legacy compatibility mode: task graph missing.');
    }
    async buildControllerTickPlan(changePath) {
        await this.assertExists(changePath);
        const config = await this.readConfig(changePath);
        const capability = config.capability?.nativeLoopCapability ?? 'unknown';
        const runtimeAdapter = await this.resolveRuntimeAdapter(changePath, config, false, this.now());
        const selected = runtimeAdapter.selected;
        const adapterInstructions = !selected
            ? [
                `No runtime adapter is available: ${runtimeAdapter.warnings.join(' ')}`,
            ]
            : [
                `Run "ospec loop run ${this.quote(changePath)} --once --json". For every non-empty actions[] batch, immediately launch one fresh ${selected.nativeSubagent?.primitive || 'model-native'} subagent per item.`,
                selected.nativeSubagent?.dispatch || 'Use the current model harness native subagent dispatch primitive.',
                selected.nativeSubagent?.wait || 'Poll the native child batch with a bounded wait in the current model session.',
                `Never block indefinitely: each native wait or poll must return within ${selected.nativeSubagent?.maxWaitMs || 60000}ms, with a recommended poll interval of ${selected.nativeSubagent?.pollIntervalMs || 30000}ms.`,
                'Give each subagent only its referenced packet. After dispatch, record heartbeatCommand with the real child id; before every item heartbeatDueAt, refresh its heartbeat. Persist each completionCommand/evidence and resultCommand as that child finishes, then tick again after every poll without another user prompt.',
                'Use loop recover --force only when the prior session or child is known to be gone; never relaunch completed siblings.',
                'If actions[] is empty and pending is present, observe/wait only and never relaunch pending items. Stop only for a real decision/safety gate, configured guard/STOP, paused/stopped/done, or explicit user pause.',
                'OSpec owns durable workflow state; the current model harness owns native subagent execution. Agent CLI processes are not a supported fallback.',
            ];
        return {
            interval: config.schedule.interval,
            executionModel: config.executionModel,
            nativeLoopCapability: capability,
            runtimeAdapter,
            instructions: adapterInstructions,
        };
    }
    async gateResult(changePath, state, trigger, reason) {
        state.currentStep = 'gate';
        state.lastFeedback = reason;
        state.lastTickTs = this.now().toISOString();
        await this.writeState(changePath, state);
        await this.appendRunLog(changePath, this.logEntry(state, trigger, null, reason));
        return this.result(changePath, state, null, false, reason, reason, null, reason);
    }
    runtimeAdapterGateResult(changePath, state, trigger, kind, adapter) {
        const reasons = adapter.candidates
            .filter(candidate => !candidate.available)
            .map(candidate => `${candidate.id}: ${candidate.reason}`)
            .join('; ');
        return this.gateResult(changePath, state, trigger, `Loop blocked before ${kind} dispatch: no safe independent runtime adapter is available. ${adapter.warnings.join(' ')}${reasons ? ` ${reasons}` : ''}`.trim());
    }
    preparedBatchGateResult(changePath, state, trigger, kind, prepared) {
        if (prepared.runtimeAdapter.blocked || !prepared.runtimeAdapter.selected) {
            return this.runtimeAdapterGateResult(changePath, state, trigger, kind, prepared.runtimeAdapter);
        }
        const reasons = prepared.diagnostics.deferredReasons.length > 0
            ? prepared.diagnostics.deferredReasons.join(', ')
            : 'no funded conflict-safe action remains';
        return this.gateResult(changePath, state, trigger, `Loop blocked before ${kind} dispatch: ${reasons}.`);
    }
    result(changePath, state, pending, stopped, stopReason, nextInstruction, verifyPassed, feedback, actions = [], batchDiagnostics = null) {
        return {
            changePath, iteration: state.iteration, status: state.status, currentStep: state.currentStep,
            verifyPassed, pending, actions, stopped, stopReason, nextInstruction,
            feedback, metrics: this.metrics(state), batchDiagnostics,
        };
    }
    normalizeConfig(raw) {
        const target = raw.target || 'claude';
        const primitive = raw.primitive || 'goal';
        const staleCapability = raw.capability?.probeSource?.startsWith('static-table:')
            || raw.capability?.probeSource?.startsWith('probe-only:')
            || raw.capability?.interactive === undefined
            || raw.capability?.nativeSubagentCapability === undefined
            || raw.capability?.controllerAvailable === undefined
            || raw.capability?.target !== target
            || !raw.capability?.reportedAt
            || !raw.capability?.expiresAt;
        const allowlist = {
            paths: raw.allowlist?.paths || [],
            commands: this.normalizeCommandAllowlist(raw.allowlist?.commands || []),
        };
        if (raw.allowlist?.metadata) {
            allowlist.metadata = this.normalizeAllowlistMetadata(raw.allowlist.metadata);
            if (!allowlist.metadata.currentHash)
                allowlist.metadata.currentHash = this.hashAllowlist(allowlist);
        }
        const capability = !raw.capability || staleCapability
            ? (0, CapabilityProbeService_1.createCapabilityProbeService)().resolveHarnessCapability({ target, primitive, env: {}, now: this.now() })
            : raw.capability;
        return {
            version: raw.version || '1.0',
            pattern: raw.pattern || 'goal-loop',
            primitive,
            level: raw.level || 'L1',
            executionModel: 'controller',
            target,
            schedule: { interval: raw.schedule?.interval || '10m', lifecycle: 'session-bound' },
            stopConditions: {
                testCommands: this.uniqueNonEmpty(raw.stopConditions?.testCommands || []),
                maxIterations: raw.stopConditions?.maxIterations ?? null,
                expiresAt: raw.stopConditions?.expiresAt ?? null,
                budgetTokens: raw.stopConditions?.budgetTokens ?? null,
                budgetMinutes: raw.stopConditions?.budgetMinutes ?? null,
            },
            allowlist,
            efficiency: { ...this.defaultEfficiency(), ...(raw.efficiency || {}) },
            documentReviewGovernance: this.normalizeDocumentReviewGovernance(raw.documentReviewGovernance),
            capability,
            nativeHarnessMetadata: raw.nativeHarnessMetadata
                && raw.nativeHarnessMetadata.target === target
                && raw.nativeHarnessMetadata.controllerSessionReportedAt === capability.reportedAt
                ? raw.nativeHarnessMetadata
                : null,
            createdAt: raw.createdAt || this.now().toISOString(),
        };
    }
    normalizeState(raw) {
        const pending = raw.pendingControllerAction || null;
        if (pending)
            this.ensurePendingItemStates(pending);
        const legacyExecutorTokens = Math.max(0, raw.executorTokensUsed ?? raw.tokensUsed ?? 0);
        const legacyArtifactTokens = Math.max(0, raw.artifactTokensUsed ?? 0);
        const executorUsageByKey = raw.executorUsageByKey && typeof raw.executorUsageByKey === 'object'
            ? raw.executorUsageByKey
            : legacyExecutorTokens > 0 ? { legacy: legacyExecutorTokens } : {};
        const artifactUsageByKey = raw.artifactUsageByKey && typeof raw.artifactUsageByKey === 'object'
            ? raw.artifactUsageByKey
            : legacyArtifactTokens > 0 ? { legacy: legacyArtifactTokens } : {};
        const usageKeys = new Set([...Object.keys(executorUsageByKey), ...Object.keys(artifactUsageByKey)]);
        const tokensUsed = [...usageKeys].reduce((total, key) => total
            + Math.max(0, Number(artifactUsageByKey[key] ?? executorUsageByKey[key]) || 0), 0);
        const executorTokensUsed = Object.values(executorUsageByKey).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
        const artifactTokensUsed = Object.values(artifactUsageByKey).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
        return {
            version: raw.version || '1.0', iteration: raw.iteration || 0, lastTickTs: raw.lastTickTs || null,
            currentStep: raw.currentStep || 'idle', status: raw.status || 'idle',
            comprehensionDebtCounter: raw.comprehensionDebtCounter || 0,
            pendingControllerAction: pending,
            startedAt: raw.startedAt || null, updatedAt: raw.updatedAt || null,
            tokensUsed,
            executorTokensUsed,
            artifactTokensUsed,
            executorUsageByKey,
            artifactUsageByKey,
            noProgressCount: Math.max(0, raw.noProgressCount || 0),
            progressFingerprint: raw.progressFingerprint || null, lastFeedback: raw.lastFeedback || null,
            lastBatchDiagnostics: raw.lastBatchDiagnostics || null,
        };
    }
    defaultEfficiency() {
        return {
            maxParallel: 3,
            maxParallelReason: null,
            noProgressLimit: 3,
            maxTaskRepairRounds: 2,
            maxFinalRepairRounds: 2,
            comprehensionReviewEvery: 8,
            freshContext: true,
            promptMaxChars: 2400,
            implementationMaxRuntimeMinutes: 120,
            reviewMaxRuntimeMinutes: 60,
            verificationMaxRuntimeMinutes: 60,
            evidenceResultGraceMinutes: 5,
        };
    }
    defaultDocumentReviewGovernance() {
        return {
            stages: {
                design: { maxCompletedRounds: 2, maxMinutes: 30, budgetTokens: null },
                plan: { maxCompletedRounds: 2, maxMinutes: 30, budgetTokens: null },
            },
            noProgressLimit: 2,
            tokenReservation: 4000,
        };
    }
    normalizeDocumentReviewGovernance(raw) {
        const defaults = this.defaultDocumentReviewGovernance();
        const normalizeStage = (stage) => {
            const source = raw?.stages?.[stage];
            const budget = source?.budgetTokens;
            return {
                maxCompletedRounds: Math.min(2, this.positiveInteger(source?.maxCompletedRounds ?? 2, `${stage}.maxCompletedRounds`)),
                maxMinutes: Math.min(30, this.positiveInteger(source?.maxMinutes ?? 30, `${stage}.maxMinutes`)),
                budgetTokens: budget === null || budget === undefined
                    ? null
                    : this.positiveInteger(budget, `${stage}.budgetTokens`),
            };
        };
        return {
            stages: { design: normalizeStage('design'), plan: normalizeStage('plan') },
            noProgressLimit: Math.min(2, this.positiveInteger(raw?.noProgressLimit ?? defaults.noProgressLimit, 'documentReviewGovernance.noProgressLimit')),
            tokenReservation: this.positiveInteger(raw?.tokenReservation ?? defaults.tokenReservation, 'documentReviewGovernance.tokenReservation'),
        };
    }
    isControllerCapabilityCurrent(config, now) {
        const capability = config.capability;
        if (config.executionModel !== 'controller'
            || capability?.controllerAvailable !== true
            || !capability.reportedAt
            || !capability.expiresAt)
            return false;
        const reportedAt = Date.parse(capability.reportedAt);
        const expiresAt = Date.parse(capability.expiresAt);
        return Number.isFinite(reportedAt)
            && Number.isFinite(expiresAt)
            && expiresAt > reportedAt
            && capability.target === config.target
            && capability.interactive === true
            && capability.nativeSubagentCapability === 'supported'
            && reportedAt <= now.getTime()
            && expiresAt > now.getTime();
    }
    assertActionNativeSession(config, actionItem, now, actionItemId) {
        if (!this.isControllerCapabilityCurrent(config, now)) {
            throw new Error(`Cannot use action ${actionItemId} with an expired native controller session; refresh the current model native subagent capability and reissue the action.`);
        }
        const selected = actionItem?.runtimeAdapter?.selected;
        if (!actionItem
            || !selected
            || selected.kind !== 'native'
            || !selected.nativeSubagent
            || selected.nativeSubagent.target !== config.target) {
            throw new Error(`Action ${actionItemId} is not bound to the current target's model-native subagent adapter.`);
        }
        if (actionItem.nativeSessionTarget !== config.target
            || actionItem.nativeSessionReportedAt !== config.capability.reportedAt) {
            throw new Error(`Action ${actionItemId} belongs to a different native subagent session; recover and reissue it before recording executor evidence.`);
        }
    }
    async resolveRuntimeAdapter(changePath, config, requiresIndependentWorker, now) {
        const projectRoot = await this.findProjectRootForSafety(changePath);
        const resolution = this.runtimeAdapter.resolve({
            projectRoot,
            target: config.target,
            capability: config.capability,
            preference: 'native',
            strict: true,
            requiresIndependentWorker,
            now,
            nativeHarness: config.nativeHarnessMetadata,
            cacheFilePath: path.join(changePath, 'artifacts', 'agents', 'runtime-adapter-cache.json'),
        });
        if (resolution.selected && resolution.selected.kind !== 'native') {
            return {
                ...resolution,
                selectedAdapterId: null,
                selected: null,
                blocked: true,
                warnings: [
                    ...resolution.warnings,
                    `Runtime adapter ${resolution.selected.id} is non-native and cannot execute Loop actions.`,
                ],
            };
        }
        return resolution;
    }
    getTokenFundedLimit(config, state, candidateCount) {
        const candidates = Math.max(0, candidateCount);
        if (config.stopConditions.budgetTokens === null || candidates === 0)
            return candidates;
        const remaining = Math.max(0, Math.floor(config.stopConditions.budgetTokens - state.tokensUsed));
        if (remaining < MIN_ACTION_TOKEN_RESERVATION)
            return 0;
        return Math.min(candidates, Math.floor(remaining / MIN_ACTION_TOKEN_RESERVATION));
    }
    async prepareLoopBatch(changePath, config, state, graphSafeCandidates, requiresIndependentWorker, now, kind, deferredReasons = []) {
        const runtimeAdapter = await this.resolveRuntimeAdapter(changePath, config, requiresIndependentWorker, now);
        const selected = runtimeAdapter.selected;
        const parallelism = selected?.parallelism;
        const adapterSupportsParallel = selected?.supportsParallel === true;
        const adapterCapacityKnown = parallelism?.capacityKnown === true || selected?.supportsParallel === false;
        const adapterCapacity = selected?.supportsParallel === false
            ? 1
            : parallelism?.capacityKnown === true && Number.isInteger(parallelism.capacity) && Number(parallelism.capacity) > 0
                ? Number(parallelism.capacity)
                : null;
        const tokenFundedLimit = this.getTokenFundedLimit(config, state, graphSafeCandidates);
        const unknownImplementationCapacityLimit = kind === 'implementation' && adapterSupportsParallel && !adapterCapacityKnown
            ? Math.min(UNKNOWN_IMPLEMENTATION_CAPACITY, graphSafeCandidates)
            : graphSafeCandidates;
        const adapterLimit = adapterSupportsParallel
            ? adapterCapacity ?? unknownImplementationCapacityLimit
            : Math.min(1, graphSafeCandidates);
        const limit = runtimeAdapter.blocked || !selected
            ? 0
            : Math.min(config.efficiency.maxParallel, graphSafeCandidates, tokenFundedLimit, adapterLimit);
        const reasons = [...deferredReasons];
        if (config.efficiency.maxParallel < graphSafeCandidates)
            reasons.push('configured_max_parallel');
        if (tokenFundedLimit < graphSafeCandidates)
            reasons.push('token_budget');
        if (adapterLimit < graphSafeCandidates) {
            reasons.push(adapterSupportsParallel && !adapterCapacityKnown && kind === 'implementation'
                ? 'unknown_implementation_capacity_cap'
                : adapterSupportsParallel ? 'adapter_capacity' : 'adapter_serial');
        }
        if (runtimeAdapter.blocked || !selected)
            reasons.push('runtime_adapter_unavailable');
        return {
            runtimeAdapter,
            limit,
            diagnostics: {
                configuredMaxParallel: config.efficiency.maxParallel,
                configuredMaxParallelReason: config.efficiency.maxParallelReason ?? null,
                graphSafeCandidates,
                tokenFundedLimit,
                adapterSupportsParallel,
                adapterCapacity,
                adapterCapacityKnown,
                effectiveEmitted: 0,
                deferredReasons: this.uniqueNonEmpty(reasons),
            },
        };
    }
    allocateTokenAllowances(config, state, itemCount) {
        if (itemCount <= 0)
            return [];
        if (config.stopConditions.budgetTokens === null)
            return Array.from({ length: itemCount }, () => null);
        const remaining = Math.max(0, Math.floor(config.stopConditions.budgetTokens - state.tokensUsed));
        const base = Math.floor(remaining / itemCount);
        let remainder = remaining % itemCount;
        return Array.from({ length: itemCount }, () => {
            const allowance = base + (remainder > 0 ? 1 : 0);
            remainder = Math.max(0, remainder - 1);
            return allowance;
        });
    }
    recomputeTokenUsage(state) {
        state.executorTokensUsed = Object.values(state.executorUsageByKey)
            .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
        state.artifactTokensUsed = Object.values(state.artifactUsageByKey)
            .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
        const keys = new Set([...Object.keys(state.executorUsageByKey), ...Object.keys(state.artifactUsageByKey)]);
        state.tokensUsed = [...keys].reduce((total, key) => total
            + Math.max(0, Number(state.artifactUsageByKey[key] ?? state.executorUsageByKey[key]) || 0), 0);
    }
    reportSummary(report) {
        return `${report.completedTasks.length}/${report.taskCount} tasks complete, ${report.dispatchableTasks.length} dispatchable, ${report.runningTasks.length} running, ${report.blockedTasks.length} blocked`;
    }
    buildProgressFingerprint(report) {
        return this.allReportTasks(report)
            .sort((left, right) => left.id.localeCompare(right.id))
            .map(task => {
            const status = ['PENDING', 'IN_PROGRESS', 'DISPATCHED', 'BLOCKED', 'NEEDS_CONTEXT'].includes(task.status)
                ? 'ACTIVE'
                : task.status;
            return `${task.id}:${status}:${task.review?.decision || 'NONE'}`;
        }).join('|');
    }
    allReportTasks(report) {
        const map = new Map();
        for (const task of [...report.readyTasks, ...report.dispatchableTasks, ...report.runningTasks, ...report.completedTasks, ...report.concernTasks, ...report.blockedTasks.map(item => item.task), ...report.invalidTasks.map(item => item.task)])
            map.set(task.id, task);
        return [...map.values()];
    }
    async readFinalReviewDecision(changePath) {
        try {
            return await this.taskGraph.readValidatedFinalReviewDecision(changePath);
        }
        catch {
            return 'PENDING';
        }
    }
    async resetFinalReviewForVerificationFailure(changePath, feedback) {
        const reviewPath = path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        if (!(await this.fileService.exists(reviewPath)))
            return;
        const content = await this.fileService.readFile(reviewPath);
        const reset = content.replace(/^(decision\s*:\s*)[A-Z_]+\s*$/im, '$1PENDING');
        const note = `\n\n## Verification Failure Re-review\n\n${feedback || 'Fresh verification evidence failed after the previous approval.'}\n`;
        await this.fileService.writeFile(reviewPath, `${reset.trimEnd()}${note}`);
    }
    metrics(state) {
        return {
            tokensUsed: state.tokensUsed,
            elapsedMinutes: this.elapsedMinutes(state, this.now()),
            noProgressCount: state.noProgressCount,
            comprehensionDebtCounter: state.comprehensionDebtCounter,
        };
    }
    elapsedMinutes(state, now) {
        if (!state.startedAt)
            return 0;
        const start = Date.parse(state.startedAt);
        return Number.isFinite(start) ? Math.max(0, (now.getTime() - start) / 60000) : 0;
    }
    logEntry(state, trigger, verifyPassed, summary) {
        return { event: 'state', ts: this.now().toISOString(), iteration: state.iteration, trigger, tokensEst: null, exitCode: null, verifyPassed, summary, costToDate: null, actionId: state.pendingControllerAction?.actionId || null, actionCount: state.pendingControllerAction?.items?.length || 0, noProgressCount: state.noProgressCount };
    }
    async isPathAllowed(changePath, file, allowlist, exact = false) {
        const normalized = this.normalizeAllowlistedPath(file);
        if (!normalized)
            return false;
        const projectRoot = await this.findProjectRootForSafety(changePath);
        const targetBoundary = await this.resolveRealPathBoundary(projectRoot, normalized);
        if (!targetBoundary)
            return false;
        for (const entry of allowlist) {
            const allowed = this.normalizeAllowlistedPath(entry);
            if (!allowed || (exact ? normalized !== allowed : normalized !== allowed && !normalized.startsWith(`${allowed}/`)))
                continue;
            const allowedBoundary = await this.resolveRealPathBoundary(projectRoot, allowed);
            if (!allowedBoundary)
                continue;
            const relative = path.relative(allowedBoundary, targetBoundary);
            if (!relative || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)))
                return true;
        }
        return false;
    }
    async isCommandAllowed(changePath, command, allowlist) {
        const candidate = this.parseSafeAllowlistedCommand(command);
        if (!candidate)
            return false;
        const projectRoot = await this.findProjectRootForSafety(changePath);
        if (!(await this.isCommandCwdWithinProject(projectRoot, candidate.cwd)))
            return false;
        for (const entry of allowlist) {
            if (typeof entry !== 'string') {
                const policies = this.normalizeCommandPolicies([entry]);
                if (policies.length !== 1)
                    continue;
                const policy = policies[0];
                if (!(await this.isCommandCwdWithinProject(projectRoot, policy.cwd || null)))
                    continue;
                if ((policy.cwd || null) !== candidate.cwd)
                    continue;
                const tokens = this.tokenizeSafeCommand(candidate.command);
                if (!tokens || tokens[0] !== policy.command)
                    continue;
                const prefix = policy.argsPrefix || [];
                if (tokens.length === prefix.length + 1
                    && prefix.every((argument, index) => tokens[index + 1] === argument))
                    return true;
                continue;
            }
            const allowed = this.parseSafeAllowlistedCommand(entry);
            if (!allowed || !(await this.isCommandCwdWithinProject(projectRoot, allowed.cwd)))
                continue;
            if (allowed.cwd === candidate.cwd && candidate.command === allowed.command)
                return true;
        }
        return false;
    }
    async isCommandCwdWithinProject(projectRoot, cwd) {
        return cwd === null || Boolean(await this.resolveRealPathBoundary(projectRoot, cwd));
    }
    normalizeCommandAllowlist(values) {
        const strings = this.uniqueNonEmpty(values.filter((value) => typeof value === 'string'));
        const policies = this.normalizeCommandPolicies(values.filter((value) => Boolean(value) && typeof value === 'object'));
        return [...strings, ...policies];
    }
    normalizeCommandPolicies(values) {
        const normalized = [];
        const seen = new Set();
        for (const value of values) {
            const command = String(value?.command || '').trim();
            if (!/^[A-Za-z0-9_.-]+$/.test(command))
                continue;
            const argsPrefix = Array.isArray(value.argsPrefix)
                ? value.argsPrefix.map(argument => String(argument || '').trim()).filter(Boolean)
                : [];
            if (argsPrefix.some(argument => /[\r\n\0;|<>`]/.test(argument) || /\$\s*\(/.test(argument)))
                continue;
            const cwd = value.cwd === undefined || value.cwd === null
                ? null
                : this.normalizeAllowlistedPath(String(value.cwd));
            if (value.cwd && !cwd)
                continue;
            const policy = { command, argsPrefix, cwd };
            const key = JSON.stringify(policy);
            if (!seen.has(key)) {
                seen.add(key);
                normalized.push(policy);
            }
        }
        return normalized;
    }
    tokenizeSafeCommand(command) {
        const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
        if (!tokens?.length)
            return null;
        return tokens.map(token => {
            const quoted = (token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"));
            return quoted ? token.slice(1, -1) : token;
        });
    }
    parseSafeAllowlistedCommand(value) {
        const raw = String(value || '').trim();
        if (!raw || /[\r\n\0;|<>`]/.test(raw) || /\$\s*\(/.test(raw))
            return null;
        const parts = raw.split(/\s*&&\s*/);
        if (parts.length > 2)
            return null;
        let cwd = null;
        let command = raw;
        if (parts.length === 2) {
            const cdMatch = /^cd\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))$/i.exec(parts[0].trim());
            if (!cdMatch)
                return null;
            cwd = this.normalizeAllowlistedPath(cdMatch[1] || cdMatch[2] || cdMatch[3]);
            if (!cwd)
                return null;
            command = parts[1].trim();
        }
        if (!command || command.includes('&'))
            return null;
        if (/(?:^|\s)(?:--prefix|--cwd|--directory|-C)(?:=|\s)/i.test(command))
            return null;
        if (/(?:^|\s)[A-Za-z]:[\\/]/.test(command) || /(?:^|\s)\.\.([\\/]|\s|$)/.test(command))
            return null;
        const tokens = this.tokenizeSafeCommand(command);
        if (!tokens)
            return null;
        for (const token of tokens.slice(1)) {
            const value = token.includes('=') ? token.slice(token.indexOf('=') + 1) : token;
            const normalizedValue = value.replace(/\\/g, '/');
            if (path.posix.isAbsolute(normalizedValue)
                || /^[A-Za-z]:\//.test(normalizedValue)
                || normalizedValue.startsWith('//')
                || normalizedValue.split('/').includes('..'))
                return null;
        }
        return { cwd, command: command.replace(/\s+/g, ' ') };
    }
    async findProjectRootForSafety(changePath) {
        let current = path.resolve(changePath);
        while (true) {
            if (await this.fileService.exists(path.join(current, '.skillrc')))
                return current;
            const parent = path.dirname(current);
            if (parent === current)
                return path.resolve(changePath);
            current = parent;
        }
    }
    async resolveRealPathBoundary(projectRoot, relativePath) {
        const root = path.resolve(projectRoot);
        const absolute = path.resolve(root, ...relativePath.split('/'));
        const lexical = path.relative(root, absolute);
        if (lexical === '..' || lexical.startsWith(`..${path.sep}`) || path.isAbsolute(lexical))
            return null;
        let existing = absolute;
        const missing = [];
        while (!(await this.fileService.exists(existing))) {
            const parent = path.dirname(existing);
            if (parent === existing)
                return null;
            missing.unshift(path.basename(existing));
            existing = parent;
        }
        const realExisting = await fs_1.promises.realpath(existing).catch(() => null);
        const realRoot = await fs_1.promises.realpath(root).catch(() => root);
        if (!realExisting)
            return null;
        const resolved = path.resolve(realExisting, ...missing);
        const projectRelative = path.relative(realRoot, resolved);
        if (projectRelative === '..' || projectRelative.startsWith(`..${path.sep}`) || path.isAbsolute(projectRelative))
            return null;
        return resolved;
    }
    normalizeAllowlistedPath(value) {
        const raw = String(value || '').trim().replace(/\\/g, '/');
        if (!raw || raw.includes('\0') || path.posix.isAbsolute(raw) || /^[A-Za-z]:\//.test(raw))
            return null;
        const segments = raw.split('/');
        if (segments.some(segment => segment === '..'))
            return null;
        const normalized = path.posix.normalize(raw.replace(/^\.\//, '')).replace(/\/$/, '');
        if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../'))
            return null;
        return normalized;
    }
    isSameCurrentCapabilityAssertion(config, options, now, targetChanged) {
        const capability = config.capability;
        if (!this.isControllerCapabilityCurrent(config, now))
            return false;
        if (targetChanged)
            return false;
        if (options.interactive !== undefined && options.interactive !== capability.interactive)
            return false;
        if (options.nativeLoopCapability !== undefined
            && options.nativeLoopCapability !== capability.nativeLoopCapability)
            return false;
        if (options.nativeSubagentCapability !== undefined
            && options.nativeSubagentCapability !== capability.nativeSubagentCapability)
            return false;
        return true;
    }
    boundPrompt(lines, maxChars, requiredLines = []) {
        const prompt = lines.filter(Boolean).join('\n');
        const required = requiredLines.filter(Boolean).join('\n');
        if (!required && prompt.length <= maxChars)
            return prompt;
        if (required && `${prompt}\n${required}`.length <= maxChars)
            return `${prompt}\n${required}`;
        const marker = '[truncated: use authoritative packet and commands below]';
        if (!required) {
            return `${prompt.slice(0, Math.max(0, maxChars - marker.length - 1))}\n${marker}`;
        }
        const optionalBudget = Math.max(0, maxChars - required.length - marker.length - 2);
        const optional = prompt.slice(0, optionalBudget).trimEnd();
        return [optional, marker, required].filter(Boolean).join('\n');
    }
    uniqueNonEmpty(values) {
        return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
    }
    async collectDerivedCommand(projectRoot, value, label, commands, issues) {
        if (typeof value !== 'string' || !value.trim()) {
            issues.push(`${label} must be a non-empty string`);
            return;
        }
        const parsed = this.parseSafeAllowlistedCommand(value);
        if (!parsed || !(await this.isCommandCwdWithinProject(projectRoot, parsed.cwd))) {
            issues.push(`${label} is unsafe (${value})`);
            return;
        }
        commands.push(value.trim());
    }
    uniqueDerivedCommands(values) {
        const commands = new Map();
        for (const value of this.uniqueNonEmpty(values)) {
            const key = this.allowlistCommandKey(value);
            if (!commands.has(key))
                commands.set(key, value);
        }
        return [...commands.values()];
    }
    normalizeAllowlistMetadata(value) {
        const normalizeSource = (candidate) => (candidate === 'task-graph' || candidate === 'clear' || candidate === 'manual'
            ? candidate
            : null);
        const source = normalizeSource(value?.source) || 'manual';
        const hashOrNull = (candidate) => {
            const normalized = String(candidate || '').trim().toLowerCase();
            return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
        };
        return {
            source,
            pathSource: normalizeSource(value?.pathSource) || source,
            commandSource: normalizeSource(value?.commandSource) || source,
            currentHash: hashOrNull(value?.currentHash) || '',
            candidateHash: hashOrNull(value?.candidateHash),
            taskGraphHash: hashOrNull(value?.taskGraphHash),
            updatedAt: Number.isFinite(Date.parse(value?.updatedAt)) ? value.updatedAt : this.now().toISOString(),
        };
    }
    diffAllowlists(current, candidate) {
        const currentPaths = new Map(current.paths.map(value => [this.allowlistPathKey(value), value]));
        const candidatePaths = new Map(candidate.paths.map(value => [this.allowlistPathKey(value), value]));
        const currentCommands = new Map(current.commands.map(value => [this.allowlistCommandKey(value), value]));
        const candidateCommands = new Map(candidate.commands.map(value => [this.allowlistCommandKey(value), value]));
        return {
            addedPaths: [...candidatePaths].filter(([key]) => !currentPaths.has(key)).map(([, value]) => value),
            removedPaths: [...currentPaths].filter(([key]) => !candidatePaths.has(key)).map(([, value]) => value),
            addedCommands: [...candidateCommands].filter(([key]) => !currentCommands.has(key)).map(([, value]) => value),
            removedCommands: [...currentCommands].filter(([key]) => !candidateCommands.has(key)).map(([, value]) => value),
        };
    }
    hasAllowlistExpansion(current, candidate) {
        const currentPaths = current.paths.map(value => this.normalizeAllowlistedPath(value)).filter(Boolean);
        const addsPathPermission = candidate.paths.some(value => {
            const candidatePath = this.normalizeAllowlistedPath(value);
            return !candidatePath || !currentPaths.some(currentPath => candidatePath === currentPath || candidatePath.startsWith(`${currentPath}/`));
        });
        if (addsPathPermission)
            return true;
        const currentCommands = new Set(current.commands.map(value => this.allowlistCommandKey(value)));
        return candidate.commands.some(value => !currentCommands.has(this.allowlistCommandKey(value)));
    }
    allowlistCommandKey(value) {
        return this.stableStringify(this.canonicalCommand(value));
    }
    allowlistPathKey(value) {
        return this.normalizeAllowlistedPath(value) || `invalid:${String(value).trim().replace(/\\/g, '/')}`;
    }
    allowlistHashInput(allowlist) {
        const paths = this.uniqueNonEmpty(allowlist.paths.map(value => this.allowlistPathKey(value))).sort();
        const commands = allowlist.commands
            .map(value => this.canonicalCommand(value))
            .sort((left, right) => this.stableStringify(left).localeCompare(this.stableStringify(right)));
        return { paths, commands };
    }
    canonicalCommand(value) {
        if (typeof value === 'string') {
            const parsed = this.parseSafeAllowlistedCommand(value);
            const tokens = parsed ? this.tokenizeSafeCommand(parsed.command) : null;
            return parsed && tokens
                ? { cwd: parsed.cwd, tokens, valid: true }
                : { cwd: null, tokens: [String(value).trim()], valid: false };
        }
        const policies = this.normalizeCommandPolicies([value]);
        if (policies.length !== 1) {
            return { cwd: null, tokens: [this.stableStringify(value)], valid: false };
        }
        const policy = policies[0];
        return {
            cwd: policy.cwd || null,
            tokens: [policy.command, ...(policy.argsPrefix || [])],
            valid: true,
        };
    }
    hashAllowlist(allowlist) {
        return this.sha256(this.stableStringify(this.allowlistHashInput(allowlist)));
    }
    sha256(value) {
        return (0, crypto_1.createHash)('sha256').update(value, 'utf8').digest('hex');
    }
    stableStringify(value) {
        const canonicalize = (input) => {
            if (Array.isArray(input))
                return input.map(canonicalize);
            if (!input || typeof input !== 'object')
                return input;
            return Object.keys(input).sort().reduce((result, key) => {
                result[key] = canonicalize(input[key]);
                return result;
            }, {});
        };
        return JSON.stringify(canonicalize(value));
    }
    requireHash(value, name) {
        const normalized = String(value || '').trim().toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(normalized))
            throw new Error(`${name} must be a SHA-256 hash.`);
        return normalized;
    }
    positiveInteger(value, name) {
        if (!Number.isInteger(value) || value <= 0)
            throw new Error(`${name} must be a positive integer.`);
        return value;
    }
    nonNegativeInteger(value, name) {
        if (!Number.isInteger(value) || value < 0)
            throw new Error(`${name} must be a non-negative integer.`);
        return value;
    }
    assignDefined(target, key, value) {
        if (value !== undefined)
            target[key] = value;
    }
    quote(value) {
        if (/^[a-zA-Z0-9_./:=@-]+$/.test(value) && !value.startsWith('-'))
            return value;
        if (process.platform === 'win32')
            return `'${value.replace(/'/g, "''")}'`;
        return `'${value.replace(/'/g, `'"'"'`)}'`;
    }
}
exports.LoopService = LoopService;
function createLoopService(fileService, dependencies = {}) {
    return new LoopService(fileService, dependencies);
}
