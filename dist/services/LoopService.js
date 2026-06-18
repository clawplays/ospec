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
const VerificationService_1 = require("./VerificationService");
const CapabilityProbeService_1 = require("./CapabilityProbeService");
const TriageService_1 = require("./TriageService");
const LOOP_DIR = ['artifacts', 'loop'];
const LOOP_CONFIG_FILE = 'loop.json';
const LOOP_STATE_FILE = 'state.json';
const LOOP_RUNLOG_FILE = 'run-log.jsonl';
const LOOP_STOP_FILE = 'STOP';
/**
 * Drives the session-bound Loop for a goal change (Stage B). It is a state-machine brain:
 * `runOnce` performs a two-phase controller-driven tick (observe previous pending, then plan/act)
 * and uses the non-exiting VerificationService for the three-stage stop condition. It never
 * executes an agent itself (Execution-Model Contract 1).
 */
class LoopService {
    constructor(fileService) {
        this.fileService = fileService;
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
    /** Whether this change has been initialized as a loop. */
    async exists(changePath) {
        return this.fileService.exists(this.configPath(changePath));
    }
    /**
     * Create loop.json + state.json + run-log.jsonl for a goal change. Idempotent: existing files
     * are preserved. Persists the capability probe result (Stage B owns persistence).
     */
    async scaffold(changePath, options = {}) {
        const configPath = this.configPath(changePath);
        if (await this.fileService.exists(configPath)) {
            return this.readConfig(changePath);
        }
        const primitive = options.primitive || 'goal';
        const level = options.level || 'L1';
        const target = options.target || 'claude';
        const capability = (0, CapabilityProbeService_1.createCapabilityProbeService)().resolveHarnessCapability({ target, primitive });
        const executionModel = capability.fallbackMode === 'cli-driven' ? 'cli-driven' : 'controller';
        const now = new Date().toISOString();
        const config = {
            version: '1.0',
            pattern: options.pattern || 'goal-loop',
            primitive,
            level,
            executionModel,
            schedule: { interval: options.interval || '10m', lifecycle: 'session-bound' },
            stopConditions: { testCommands: [], maxIterations: null, expiresAt: null, budgetTokens: null, budgetMinutes: null },
            allowlist: { paths: [], commands: [] },
            capability,
            createdAt: now,
        };
        await this.fileService.writeJSON(configPath, config);
        const state = {
            version: '1.0',
            iteration: 0,
            lastTickTs: null,
            currentStep: 'idle',
            status: 'idle',
            comprehensionDebtCounter: 0,
            pendingControllerAction: null,
        };
        await this.fileService.writeJSON(this.statePath(changePath), state);
        if (!(await this.fileService.exists(this.runLogPath(changePath)))) {
            await this.fileService.writeFile(this.runLogPath(changePath), '');
        }
        return config;
    }
    async readConfig(changePath) {
        return this.fileService.readJSON(this.configPath(changePath));
    }
    async readState(changePath) {
        return this.fileService.readJSON(this.statePath(changePath));
    }
    async writeState(changePath, state) {
        await this.fileService.writeJSON(this.statePath(changePath), state);
    }
    async assertExists(changePath) {
        if (!(await this.exists(changePath))) {
            throw new Error('No loop is initialized for this change. Create it with "ospec goal <name>".');
        }
    }
    async setLevel(changePath, level) {
        await this.assertExists(changePath);
        const config = await this.readConfig(changePath);
        config.level = level;
        await this.fileService.writeJSON(this.configPath(changePath), config);
        return config;
    }
    async pause(changePath) {
        await this.assertExists(changePath);
        const state = await this.readState(changePath);
        state.status = 'paused';
        await this.writeState(changePath, state);
        return state;
    }
    async resume(changePath) {
        await this.assertExists(changePath);
        const state = await this.readState(changePath);
        if (state.status === 'paused') {
            state.status = 'idle';
        }
        await this.writeState(changePath, state);
        return state;
    }
    async appendRunLog(changePath, entry) {
        const current = (await this.fileService.exists(this.runLogPath(changePath)))
            ? await this.fileService.readFile(this.runLogPath(changePath))
            : '';
        const next = `${current}${current && !current.endsWith('\n') ? '\n' : ''}${JSON.stringify(entry)}\n`;
        await this.fileService.writeFile(this.runLogPath(changePath), next);
    }
    /**
     * Run a single session-bound tick (two-phase, controller-driven).
     * Phase 0: observe a previous pending action's evidence via the three-stage verify.
     * Phase 1: plan/act — produce the controller instruction (does NOT execute the agent).
     */
    async runOnce(changePath, options = {}) {
        await this.assertExists(changePath);
        const resolved = path.resolve(changePath);
        const config = await this.readConfig(resolved);
        const state = await this.readState(resolved);
        const now = new Date().toISOString();
        const trigger = options.trigger || 'manual';
        // Hard stops / pauses first.
        if (await this.fileService.exists(this.stopFilePath(resolved))) {
            state.status = 'stopped';
            await this.writeState(resolved, state);
            return this.result(resolved, state, null, true, 'STOP file present', 'Loop stopped by STOP sentinel. Remove the STOP file and resume to continue.');
        }
        if (state.status === 'paused') {
            return this.result(resolved, state, null, false, null, 'Loop is paused. Run "ospec loop resume" to continue.');
        }
        if (config.stopConditions.maxIterations !== null && state.iteration >= config.stopConditions.maxIterations) {
            state.status = 'done';
            await this.writeState(resolved, state);
            return this.result(resolved, state, null, true, 'maxIterations reached', 'Loop reached its iteration budget and is marked done.');
        }
        state.currentStep = 'observe';
        state.status = 'running';
        let verifyPassed = null;
        // Phase 0 — observe the previous pending action (three-stage verify: stage 3 protocol check).
        if (state.pendingControllerAction && state.pendingControllerAction.status === 'awaiting-evidence') {
            const outcome = await (0, VerificationService_1.createVerificationService)().verify(resolved).catch(() => null);
            verifyPassed = outcome ? outcome.passed : false;
            if (verifyPassed) {
                state.pendingControllerAction = null;
                if (config.primitive === 'goal') {
                    state.status = 'done';
                }
            }
            else {
                // Evidence not yet satisfied; keep waiting for the controller.
                state.lastTickTs = now;
                await this.writeState(resolved, state);
                await this.appendRunLog(resolved, { ts: now, iteration: state.iteration, trigger, tokensEst: null, exitCode: null, verifyPassed: false, summary: 'Observed pending action; verification not yet satisfied.', costToDate: null });
                return this.result(resolved, state, state.pendingControllerAction, false, null, `Awaiting evidence for ${state.pendingControllerAction.actionId}. Controller should complete the action and record verification, then re-run "ospec loop run --once".`);
            }
        }
        // Phase 1 — plan/act. Produce a controller instruction; record a pending action.
        state.currentStep = 'act';
        state.iteration += 1;
        state.lastTickTs = now;
        const reportOnly = config.level === 'L1';
        const actionId = `loop-action-${state.iteration}-${Date.now()}`;
        if (state.status !== 'done') {
            state.pendingControllerAction = reportOnly
                ? null
                : {
                    actionId,
                    kind: config.primitive,
                    status: 'awaiting-evidence',
                    issuedAt: now,
                    attempt: 1,
                    expiresAt: config.stopConditions.expiresAt,
                    packetPath: '',
                    launchPlanPath: path.join(resolved, 'artifacts', 'agents', 'launch-plan.md'),
                    instructionPath: '',
                    completionCommand: `ospec execute complete <task-id> ${changePath} --status DONE --summary "..."`,
                    expectedEvidencePath: path.join(resolved, 'artifacts', 'agents', 'verification-evidence.json'),
                };
        }
        state.currentStep = 'log';
        await this.writeState(resolved, state);
        // L1 report-only: surface the finding into the triage inbox rather than acting on it.
        if (reportOnly && options.projectRoot) {
            await (0, TriageService_1.createTriageService)(this.fileService).append(options.projectRoot, options.layoutConfig ?? null, {
                source: 'loop',
                severity: 'info',
                title: `L1 loop finding for iteration ${state.iteration}`,
                suggestedAction: 'Review the loop finding and promote to a change to execute.',
                changePath: resolved,
            }).catch(() => undefined);
        }
        await this.appendRunLog(resolved, {
            ts: now,
            iteration: state.iteration,
            trigger,
            tokensEst: null,
            exitCode: null,
            verifyPassed,
            summary: reportOnly
                ? 'L1 report-only tick: findings recorded to triage, no code changes.'
                : `Issued controller instruction ${actionId} (${config.primitive}); awaiting controller execution + evidence.`,
            costToDate: null,
        });
        const nextInstruction = reportOnly
            ? 'L1 report-only: review findings in triage; promote to a change to execute.'
            : config.executionModel === 'cli-driven'
                ? 'cli-driven: ospec loop watch spawns the external command each tick; controller action not required.'
                : `controller-driven: execute the ${config.primitive} instruction, record completion + verification, then re-run "ospec loop run --once" to observe.`;
        return this.result(resolved, state, state.pendingControllerAction, state.status === 'done', null, nextInstruction);
    }
    /**
     * Produce the controller-driven tick plan — an instruction/contract describing how the in-session
     * controller should pace `loop run --once`. It is NOT a runtime scheduler (no start/stop); the
     * controller (or its capability-probed loop primitive) drives the cadence (Execution-Model Contract 1).
     */
    async buildControllerTickPlan(changePath) {
        await this.assertExists(changePath);
        const config = await this.readConfig(changePath);
        const cap = config.capability?.nativeLoopCapability ?? 'unknown';
        const instructions = config.executionModel === 'cli-driven'
            ? [
                `cli-driven: run "ospec loop watch ${changePath}" to drive ticks in-process (croner-style interval ${config.schedule.interval}); the process dies with the session.`,
            ]
            : [
                `controller-driven: on each tick (~${config.schedule.interval}), run "ospec loop run --once ${changePath}", then execute the issued instruction and record completion + verification evidence.`,
                cap === 'supported'
                    ? 'A native loop primitive is available — you may drive ticks via the harness primitive; otherwise self-loop.'
                    : 'No native interval-loop primitive is assumed (capability-probed) — drive ticks by re-running loop run --once yourself.',
                'This is an instruction only; ospec does not start a runtime scheduler for controller-driven loops.',
            ];
        return { interval: config.schedule.interval, executionModel: config.executionModel, nativeLoopCapability: cap, instructions };
    }
    result(changePath, state, pending, stopped, stopReason, nextInstruction) {
        return {
            changePath,
            iteration: state.iteration,
            status: state.status,
            currentStep: state.currentStep,
            verifyPassed: null,
            pending,
            stopped,
            stopReason,
            nextInstruction,
        };
    }
}
exports.LoopService = LoopService;
function createLoopService(fileService) {
    return new LoopService(fileService);
}
