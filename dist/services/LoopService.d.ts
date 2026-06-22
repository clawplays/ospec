import { FileService } from './FileService';
import { HarnessCapability, TaskAgentPrimitive } from './CapabilityProbeService';
import { LayoutConfigInput } from './TriageService';
export type LoopSafetyLevel = 'L1' | 'L2' | 'L3';
export type LoopStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'done';
export type LoopExecutionModel = 'controller' | 'cli-driven';
export interface LoopStopConditions {
    testCommands: string[];
    maxIterations: number | null;
    expiresAt: string | null;
    budgetTokens: number | null;
    budgetMinutes: number | null;
}
export interface LoopAllowlist {
    paths: string[];
    commands: string[];
}
export interface LoopSchedule {
    interval: string;
    lifecycle: 'session-bound';
}
export interface PendingControllerAction {
    actionId: string;
    kind: string;
    status: 'awaiting-evidence' | 'done';
    issuedAt: string;
    attempt: number;
    expiresAt: string | null;
    packetPath: string;
    launchPlanPath: string;
    instructionPath: string;
    completionCommand: string;
    expectedEvidencePath: string;
}
export interface LoopConfig {
    version: string;
    pattern: string;
    primitive: TaskAgentPrimitive;
    level: LoopSafetyLevel;
    executionModel: LoopExecutionModel;
    schedule: LoopSchedule;
    stopConditions: LoopStopConditions;
    allowlist: LoopAllowlist;
    capability: HarnessCapability | null;
    createdAt: string;
}
export interface LoopState {
    version: string;
    iteration: number;
    lastTickTs: string | null;
    currentStep: 'idle' | 'observe' | 'plan' | 'act' | 'gate' | 'log';
    status: LoopStatus;
    comprehensionDebtCounter: number;
    pendingControllerAction: PendingControllerAction | null;
}
export interface LoopRunLogEntry {
    ts: string;
    iteration: number;
    trigger: string;
    tokensEst: number | null;
    exitCode: number | null;
    verifyPassed: boolean | null;
    summary: string;
    costToDate: number | null;
}
export interface LoopTickResult {
    changePath: string;
    iteration: number;
    status: LoopStatus;
    currentStep: LoopState['currentStep'];
    verifyPassed: boolean | null;
    pending: PendingControllerAction | null;
    stopped: boolean;
    stopReason: string | null;
    nextInstruction: string;
}
/**
 * Drives the session-bound Loop for a goal change (Stage B). It is a state-machine brain:
 * `runOnce` performs a two-phase controller-driven tick (observe previous pending, then plan/act)
 * and uses the non-exiting VerificationService for the three-stage stop condition. It never
 * executes an agent itself (Execution-Model Contract 1).
 */
export declare class LoopService {
    private readonly fileService;
    constructor(fileService: FileService);
    private loopDir;
    configPath(changePath: string): string;
    statePath(changePath: string): string;
    runLogPath(changePath: string): string;
    stopFilePath(changePath: string): string;
    /** Whether this change has been initialized as a loop. */
    exists(changePath: string): Promise<boolean>;
    /**
     * Create loop.json + state.json + run-log.jsonl for a goal change. Idempotent: existing files
     * are preserved. Persists the capability probe result (Stage B owns persistence).
     */
    scaffold(changePath: string, options?: {
        level?: LoopSafetyLevel;
        primitive?: TaskAgentPrimitive;
        pattern?: string;
        target?: string;
        interval?: string;
    }): Promise<LoopConfig>;
    readConfig(changePath: string): Promise<LoopConfig>;
    readState(changePath: string): Promise<LoopState>;
    private writeState;
    private assertExists;
    setLevel(changePath: string, level: LoopSafetyLevel): Promise<LoopConfig>;
    pause(changePath: string): Promise<LoopState>;
    resume(changePath: string): Promise<LoopState>;
    /** Count required user decisions still PENDING in the change's decisions index (L-level binding). */
    private countPendingRequiredDecisions;
    private appendRunLog;
    /**
     * Run a single session-bound tick (two-phase, controller-driven).
     * Phase 0: observe a previous pending action's evidence via the three-stage verify.
     * Phase 1: plan/act — produce the controller instruction (does NOT execute the agent).
     */
    runOnce(changePath: string, options?: {
        trigger?: string;
        projectRoot?: string;
        layoutConfig?: LayoutConfigInput;
    }): Promise<LoopTickResult>;
    /**
     * Produce the controller-driven tick plan — an instruction/contract describing how the in-session
     * controller should pace `loop run --once`. It is NOT a runtime scheduler (no start/stop); the
     * controller (or its capability-probed loop primitive) drives the cadence (Execution-Model Contract 1).
     */
    buildControllerTickPlan(changePath: string): Promise<{
        interval: string;
        executionModel: LoopExecutionModel;
        nativeLoopCapability: string;
        instructions: string[];
    }>;
    private result;
}
export declare function createLoopService(fileService: FileService): LoopService;
