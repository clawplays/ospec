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
exports.LoopCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const BaseCommand_1 = require("./BaseCommand");
const LOOP_ACTIONS = ['run', 'watch', 'status', 'pause', 'resume', 'level', 'configure', 'tick-plan', 'heartbeat', 'result', 'recover'];
class LoopCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', ...args) {
        try {
            const normalized = (action || 'status').toLowerCase();
            switch (normalized) {
                case 'run':
                    await this.run(args);
                    return;
                case 'watch':
                    await this.watch(args);
                    return;
                case 'tick-plan':
                    await this.tickPlan(args[0]);
                    return;
                case 'status':
                    await this.status(args[0]);
                    return;
                case 'pause':
                    await this.pause(args[0]);
                    return;
                case 'resume':
                    await this.resume(args[0]);
                    return;
                case 'level':
                    await this.level(args);
                    return;
                case 'configure':
                    await this.configure(args);
                    return;
                case 'heartbeat':
                    await this.heartbeat(args);
                    return;
                case 'result':
                    await this.recordResult(args);
                    return;
                case 'recover':
                    await this.recover(args);
                    return;
                default:
                    this.info(`Usage: ospec loop <${LOOP_ACTIONS.join('|')}> [path] [--level L1|L2|L3]`);
            }
        }
        catch (error) {
            this.error(`Loop command failed: ${error}`);
            throw error;
        }
    }
    async run(args) {
        const inputPath = this.parseOptionalPath(args, [], ['--once', '--json']);
        const changePath = await this.resolveChangePath(inputPath);
        const project = await this.resolveProjectRoot(changePath);
        const result = await services_1.services.loopService.runOnce(changePath, {
            trigger: 'cli',
            projectRoot: project.projectRoot,
            layoutConfig: project.config,
        });
        if (args.includes('--json')) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nLoop Tick');
        console.log('=========\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Iteration: ${result.iteration}`);
        console.log(`Status: ${result.status}`);
        console.log(`Step: ${result.currentStep}`);
        console.log(`Progress: tokens=${result.metrics.tokensUsed} elapsed=${result.metrics.elapsedMinutes.toFixed(1)}m no-progress=${result.metrics.noProgressCount}`);
        if (result.pending) {
            console.log(`Pending action: ${result.pending.actionId} (${result.pending.status})`);
        }
        if (result.actions.length > 0) {
            console.log('\nAction items:');
            for (const action of result.actions) {
                console.log(`  - ${action.id}: ${action.kind} target=${action.target} adapter=${action.runtimeAdapter?.selectedAdapterId || 'unresolved'} task=${action.taskId || 'n/a'}`);
                console.log(`    packet=${action.packetPath || 'none'}`);
                console.log(`    prompt=${action.prompt.replace(/\s+/g, ' ')}`);
                if (action.heartbeatCommand)
                    console.log(`    heartbeat=${action.heartbeatCommand}`);
                if (action.resultCommand)
                    console.log(`    result=${action.resultCommand}`);
            }
        }
        if (result.stopped) {
            console.log(`Stopped: ${result.stopReason || 'yes'}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    async tickPlan(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const plan = await services_1.services.loopService.buildControllerTickPlan(changePath);
        console.log('\nController Tick Plan');
        console.log('====================\n');
        console.log(`Execution model: ${plan.executionModel}`);
        console.log(`Interval: ${plan.interval}`);
        console.log(`Native loop capability: ${plan.nativeLoopCapability}`);
        console.log(`Runtime adapter: ${plan.runtimeAdapter.selectedAdapterId || 'blocked'}`);
        console.log('\nInstructions:');
        for (const instruction of plan.instructions) {
            console.log(`  - ${instruction}`);
        }
        console.log('');
    }
    async watch(_args) {
        throw new Error('Loop watch agent execution was removed. Use "ospec loop run --once --json" and dispatch each action through the current model harness native subagent API.');
    }
    parseOptionalPath(args, valueFlags, booleanFlags) {
        const valueSet = new Set(valueFlags);
        const booleanSet = new Set(booleanFlags);
        let inputPath;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (booleanSet.has(arg))
                continue;
            const equalsIndex = arg.indexOf('=');
            const flag = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
            if (valueSet.has(flag)) {
                const value = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : args[++index];
                if (!value || value.startsWith('--'))
                    throw new Error(`${flag} requires a non-empty value.`);
                continue;
            }
            if (arg.startsWith('--'))
                throw new Error(`Unknown loop flag: ${arg}`);
            if (inputPath)
                throw new Error(`Unexpected extra loop path argument: ${arg}`);
            inputPath = arg;
        }
        return inputPath;
    }
    parseFlagValue(args, flag) {
        for (let index = 0; index < args.length; index += 1) {
            if (args[index] === flag) {
                return args[index + 1];
            }
            if (args[index].startsWith(`${flag}=`)) {
                return args[index].slice(`${flag}=`.length);
            }
        }
        return undefined;
    }
    async resolveProjectRoot(changePath) {
        let current = path.resolve(changePath);
        while (true) {
            if (await services_1.services.fileService.exists(path.join(current, constants_1.FILE_NAMES.SKILLRC))) {
                const config = await services_1.services.configManager.loadConfig(current).catch(() => null);
                return { projectRoot: current, config };
            }
            const parent = path.dirname(current);
            if (parent === current) {
                return { projectRoot: path.resolve(changePath), config: null };
            }
            current = parent;
        }
    }
    async status(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        if (!(await services_1.services.loopService.exists(changePath))) {
            this.warn('No loop is initialized for this change (only goal-profile changes create a loop).');
            return;
        }
        const config = await services_1.services.loopService.readConfig(changePath);
        const state = await services_1.services.loopService.readState(changePath);
        console.log('\nLoop Status');
        console.log('===========\n');
        console.log(`Change path: ${changePath}`);
        console.log(`Level: ${config.level}`);
        console.log(`Primitive: ${config.primitive}`);
        console.log(`Target: ${config.target}`);
        console.log(`Execution model: ${config.executionModel}`);
        console.log(`Schedule: ${config.schedule.interval} (${config.schedule.lifecycle})`);
        console.log(`Concurrency: ${config.efficiency.maxParallel} fresh-context=${config.efficiency.freshContext ? 'yes' : 'no'}`);
        console.log(`Guards: no-progress=${config.efficiency.noProgressLimit} review-every=${config.efficiency.comprehensionReviewEvery}`);
        console.log(`Budgets: iterations=${config.stopConditions.maxIterations ?? 'unbounded'} tokens=${config.stopConditions.budgetTokens ?? 'unbounded'} minutes=${config.stopConditions.budgetMinutes ?? 'unbounded'} expires=${config.stopConditions.expiresAt || 'never'}`);
        console.log(`Status: ${state.status}`);
        console.log(`Iteration: ${state.iteration}`);
        console.log(`Current step: ${state.currentStep}`);
        console.log(`Last tick: ${state.lastTickTs || 'never'}`);
        console.log(`Pending action: ${state.pendingControllerAction ? state.pendingControllerAction.actionId : 'none'}`);
        console.log(`Pending items: ${state.pendingControllerAction?.items?.length || 0}`);
        for (const item of state.pendingControllerAction?.itemStates || []) {
            console.log(`  - ${item.actionItemId}: ${item.status} executor=${item.executorId || 'unclaimed'} heartbeat=${item.heartbeatAt || 'never'} lease=${item.leaseExpiresAt}`);
        }
        console.log(`Usage: tokens=${state.tokensUsed} executor=${state.executorTokensUsed} artifacts=${state.artifactTokensUsed} no-progress=${state.noProgressCount} comprehension-debt=${state.comprehensionDebtCounter}`);
        if (state.lastFeedback)
            console.log(`Last feedback: ${state.lastFeedback}`);
        if (config.capability) {
            console.log(`Native loop capability: ${config.capability.nativeLoopCapability} (${config.capability.probeSource})`);
            console.log(`Harness: interactive=${config.capability.interactive ? 'yes' : 'no'} native-subagents=${config.capability.nativeSubagentCapability} controller=${config.capability.controllerAvailable ? 'available' : 'blocked'}`);
        }
        console.log('');
    }
    async pause(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.pause(changePath);
        this.success(`Loop paused (status: ${state.status}). Run "ospec loop resume" to continue.`);
    }
    async resume(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.resume(changePath);
        this.success(`Loop resumed (status: ${state.status}).`);
    }
    async level(args) {
        let inputPath;
        let level;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--level') {
                level = args[index + 1];
                index += 1;
                continue;
            }
            if (arg.startsWith('--level=')) {
                level = arg.slice('--level='.length);
                continue;
            }
            if (!arg.startsWith('--') && /^L[123]$/i.test(arg) && !level) {
                level = arg;
                continue;
            }
            if (!arg.startsWith('--') && !inputPath) {
                inputPath = arg;
                continue;
            }
        }
        const normalized = String(level || '').trim().toUpperCase();
        if (normalized !== 'L1' && normalized !== 'L2' && normalized !== 'L3') {
            throw new Error(`Loop level must be L1, L2, or L3 (received ${level || '(empty)'}).`);
        }
        const changePath = await this.resolveChangePath(inputPath);
        const config = await services_1.services.loopService.setLevel(changePath, normalized);
        this.success(`Loop level set to ${config.level}.`);
    }
    async configure(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const options = {};
        const values = (flag) => {
            const found = [];
            for (let index = inputPath ? 1 : 0; index < args.length; index += 1) {
                if (args[index] === flag && args[index + 1] !== undefined) {
                    found.push(args[index + 1]);
                    index += 1;
                }
                else if (args[index].startsWith(`${flag}=`)) {
                    found.push(args[index].slice(flag.length + 1));
                }
            }
            return found;
        };
        const scalar = (flag) => values(flag).at(-1);
        const nullableNumber = (flag) => {
            const value = scalar(flag);
            if (value === undefined)
                return undefined;
            if (value.toLowerCase() === 'none')
                return null;
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed <= 0)
                throw new Error(`${flag} must be a positive integer or "none".`);
            return parsed;
        };
        const target = scalar('--target');
        if (target) {
            const allowed = new Set(['codex', 'gpt', 'claude', 'gemini', 'opencode', 'cursor', 'copilot', 'shell', 'generic']);
            if (!allowed.has(target))
                throw new Error(`Unsupported loop target: ${target}.`);
            options.target = target;
        }
        const model = scalar('--execution-model');
        if (model) {
            if (model !== 'controller')
                throw new Error('--execution-model only supports controller; agent CLI execution was removed.');
            options.executionModel = 'controller';
        }
        const harnessInteractive = scalar('--harness-interactive');
        if (harnessInteractive !== undefined) {
            if (harnessInteractive !== 'true' && harnessInteractive !== 'false')
                throw new Error('--harness-interactive must be true or false.');
            options.interactive = harnessInteractive === 'true';
        }
        const capability = (flag) => {
            const value = scalar(flag);
            if (value === undefined)
                return undefined;
            if (value !== 'supported' && value !== 'unknown' && value !== 'unsupported') {
                throw new Error(`${flag} must be supported, unknown, or unsupported.`);
            }
            return value;
        };
        options.nativeSubagentCapability = capability('--native-subagents');
        options.nativeLoopCapability = capability('--native-goal');
        options.interval = scalar('--interval');
        options.maxIterations = nullableNumber('--max-iterations');
        const expiresAt = scalar('--expires-at');
        options.expiresAt = expiresAt?.toLowerCase() === 'none' ? null : expiresAt;
        options.budgetTokens = nullableNumber('--budget-tokens');
        options.budgetMinutes = nullableNumber('--budget-minutes');
        const testCommands = values('--test-command');
        const allowPaths = values('--allow-path');
        const allowCommands = values('--allow-command');
        const allowCommandPolicies = values('--allow-command-policy').map(value => {
            let parsed;
            try {
                parsed = JSON.parse(value);
            }
            catch {
                throw new Error('--allow-command-policy must be valid JSON.');
            }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('--allow-command-policy must be a JSON object.');
            }
            const policy = parsed;
            if (!String(policy.command || '').trim()) {
                throw new Error('--allow-command-policy requires a non-empty command.');
            }
            if (policy.argsPrefix !== undefined && !Array.isArray(policy.argsPrefix)) {
                throw new Error('--allow-command-policy argsPrefix must be an array.');
            }
            return policy;
        });
        if (testCommands.length > 0)
            options.testCommands = testCommands;
        if (allowPaths.length > 0)
            options.allowPaths = allowPaths;
        if (allowCommands.length > 0)
            options.allowCommands = allowCommands;
        if (allowCommandPolicies.length > 0)
            options.allowCommandPolicies = allowCommandPolicies;
        options.maxParallel = nullableNumber('--max-parallel') ?? undefined;
        options.noProgressLimit = nullableNumber('--no-progress-limit') ?? undefined;
        const reviewEvery = scalar('--review-every');
        if (reviewEvery !== undefined) {
            const parsed = Number(reviewEvery);
            if (!Number.isInteger(parsed) || parsed < 0)
                throw new Error('--review-every must be a non-negative integer.');
            options.comprehensionReviewEvery = parsed;
        }
        const freshContext = scalar('--fresh-context');
        if (freshContext !== undefined) {
            if (freshContext !== 'true' && freshContext !== 'false')
                throw new Error('--fresh-context must be true or false.');
            options.freshContext = freshContext === 'true';
        }
        options.promptMaxChars = nullableNumber('--prompt-max-chars') ?? undefined;
        const changePath = await this.resolveChangePath(inputPath);
        const config = await services_1.services.loopService.configure(changePath, options);
        this.success(`Loop configured: target=${config.target}, model=${config.executionModel}, parallel=${config.efficiency.maxParallel}, interval=${config.schedule.interval}.`);
    }
    async heartbeat(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const actionItemId = this.parseFlagValue(args, '--action-item');
        if (!actionItemId)
            throw new Error('loop heartbeat requires --action-item <id>.');
        const executorId = this.parseFlagValue(args, '--executor');
        if (!executorId)
            throw new Error('loop heartbeat requires --executor <child-id>.');
        const leaseValue = this.parseFlagValue(args, '--lease-ms');
        const leaseMs = leaseValue === undefined ? undefined : Number(leaseValue);
        if (leaseMs !== undefined && (!Number.isInteger(leaseMs) || leaseMs <= 0)) {
            throw new Error('--lease-ms must be a positive integer.');
        }
        const changePath = await this.resolveChangePath(inputPath);
        const heartbeat = {
            actionItemId,
            executorId,
            leaseMs,
        };
        const state = await services_1.services.loopService.heartbeatExecution(changePath, heartbeat);
        this.success(`Loop heartbeat recorded for ${actionItemId}; pending=${state.pendingControllerAction?.actionId || 'none'}.`);
    }
    async recordResult(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const actionItemId = this.parseFlagValue(args, '--action-item');
        if (!actionItemId)
            throw new Error('loop result requires --action-item <id>.');
        const executorId = this.parseFlagValue(args, '--executor');
        if (!executorId)
            throw new Error('loop result requires --executor <child-id>.');
        const exitValue = this.parseFlagValue(args, '--exit-code');
        const exitCode = exitValue === undefined ? null : Number(exitValue);
        if (exitCode !== null && !Number.isInteger(exitCode))
            throw new Error('--exit-code must be an integer.');
        const tokenValue = this.parseFlagValue(args, '--tokens-used');
        const tokensUsed = tokenValue === undefined ? undefined : Number(tokenValue);
        if (tokensUsed !== undefined && (!Number.isFinite(tokensUsed) || tokensUsed < 0)) {
            throw new Error('--tokens-used must be a non-negative number.');
        }
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.recordExecutionResults(changePath, [{
                actionItemId,
                executorId,
                exitCode,
                timedOut: args.includes('--timed-out'),
                tokensUsed,
                summary: this.parseFlagValue(args, '--summary'),
            }]);
        this.success(`Loop result recorded for ${actionItemId}; pending=${state.pendingControllerAction?.actionId || 'none'}.`);
    }
    async recover(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.recoverExpiredActions(changePath, { force: args.includes('--force') });
        this.success(`Loop recovery complete; pending=${state.pendingControllerAction?.actionId || 'none'}, no-progress=${state.noProgressCount}.`);
    }
    async resolveChangePath(inputPath) {
        const cwd = process.cwd();
        const config = await services_1.services.configManager.loadConfig(cwd).catch(() => null);
        const candidatePath = inputPath
            ? (path.isAbsolute(inputPath) ? inputPath : (0, ProjectLayout_1.resolveManagedInputPath)(cwd, inputPath, config))
            : cwd;
        const resolved = path.resolve(candidatePath);
        if (await services_1.services.fileService.exists(path.join(resolved, constants_1.FILE_NAMES.STATE))) {
            return resolved;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(resolved);
        if (activeNames.length === 0) {
            throw new Error('No active change found. Pass a change path or run from a project with one active change.');
        }
        if (activeNames.length > 1) {
            throw new Error(`Multiple active changes found: ${activeNames.join(', ')}. Pass one change path explicitly.`);
        }
        const projectConfig = await services_1.services.configManager.loadConfig(resolved).catch(() => null);
        return (0, ProjectLayout_1.resolveManagedPath)(resolved, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, projectConfig);
    }
}
exports.LoopCommand = LoopCommand;
