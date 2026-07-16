import { FileService } from './FileService';
import { VerificationService } from './VerificationService';
import { HarnessCapability, NativeLoopCapability, TaskAgentPrimitive } from './CapabilityProbeService';
import { LayoutConfigInput } from './TriageService';
import { RuntimeExecutionModelSelectionInput, RuntimeExecutionAdapterResolution, RuntimeExecutionAdapterService, RuntimeNativeHarnessExecutionMetadata } from './RuntimeExecutionAdapterService';
import { TaskGraphExecutionService, TaskVerificationLoopBinding, TaskWorkerToolTarget } from './TaskGraphExecutionService';
export type LoopSafetyLevel = 'L1' | 'L2' | 'L3';
export type LoopStatus = 'idle' | 'running' | 'blocked' | 'paused' | 'stopped' | 'done';
/** `cli-driven` is retained only so callers can receive a migration error. */
export type LoopExecutionModel = 'controller' | 'cli-driven';
export type LoopActionKind = 'implementation' | 'task-review' | 'final-review' | 'verification' | 'legacy';
export interface LoopStopConditions {
    testCommands: string[];
    maxIterations: number | null;
    expiresAt: string | null;
    budgetTokens: number | null;
    budgetMinutes: number | null;
}
export interface LoopAllowlist {
    paths: string[];
    commands: Array<string | LoopCommandPolicy>;
    metadata?: LoopAllowlistMetadata;
}
export interface LoopAllowlistMetadata {
    source: 'manual' | 'task-graph' | 'clear';
    pathSource?: 'manual' | 'task-graph' | 'clear';
    commandSource?: 'manual' | 'task-graph' | 'clear';
    currentHash: string;
    candidateHash: string | null;
    taskGraphHash: string | null;
    updatedAt: string;
}
export interface LoopAllowlistDiff {
    addedPaths: string[];
    removedPaths: string[];
    addedCommands: Array<string | LoopCommandPolicy>;
    removedCommands: Array<string | LoopCommandPolicy>;
}
export interface LoopAllowlistDerivation {
    source: 'task-graph';
    current: LoopAllowlist;
    candidate: LoopAllowlist;
    currentHash: string;
    candidateHash: string;
    taskGraphHash: string;
    diff: LoopAllowlistDiff;
    hasExpansion: boolean;
    matchesCurrent: boolean;
    issues: string[];
    canApply: boolean;
}
export interface LoopAllowlistApplyOptions {
    expectedCurrentHash: string;
    expectedCandidateHash: string;
    expectedTaskGraphHash?: string;
    approveExpansion?: boolean;
}
export interface LoopAllowlistClearOptions {
    expectedCurrentHash?: string;
}
export interface LoopCommandPolicy {
    command: string;
    argsPrefix?: string[];
    cwd?: string | null;
}
export interface LoopSchedule {
    interval: string;
    lifecycle: 'session-bound';
}
export interface LoopEfficiency {
    maxParallel: number;
    maxParallelReason?: string | null;
    noProgressLimit: number;
    maxTaskRepairRounds: number;
    maxFinalRepairRounds: number;
    comprehensionReviewEvery: number;
    freshContext: boolean;
    promptMaxChars: number;
    implementationMaxRuntimeMinutes: number;
    reviewMaxRuntimeMinutes: number;
    verificationMaxRuntimeMinutes: number;
    evidenceResultGraceMinutes: number;
}
export interface LoopActionItem {
    id: string;
    kind: LoopActionKind;
    taskId: string | null;
    role: string;
    target: TaskWorkerToolTarget;
    packetPath: string;
    instructionPath: string;
    prompt: string;
    completionCommand: string;
    expectedEvidencePath: string;
    usageKey?: string;
    tokenAllowance?: number | null;
    heartbeatCommand?: string;
    heartbeatDueAt?: string;
    absoluteExpiresAt?: string;
    resultCommand?: string;
    verificationCommand?: string | null;
    verificationBinding?: TaskVerificationLoopBinding;
    runtimeAdapter?: RuntimeExecutionAdapterResolution;
    controllerProvenanceRequired?: boolean;
    nativeSessionTarget?: string;
    nativeSessionReportedAt?: string;
    modelSelection?: RuntimeExecutionModelSelectionInput;
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
    items?: LoopActionItem[];
    itemStates?: PendingControllerActionItemState[];
    progressFingerprint?: string | null;
    executorCompletedAt?: string | null;
    executorSucceeded?: boolean | null;
}
export type PendingControllerActionItemStatus = 'issued' | 'running' | 'completed' | 'failed' | 'expired';
export interface PendingControllerActionItemState {
    actionItemId: string;
    status: PendingControllerActionItemStatus;
    issuedAt: string;
    heartbeatAt: string | null;
    heartbeatDueAt?: string;
    leaseExpiresAt: string;
    absoluteExpiresAt?: string;
    evidenceReadyAt?: string | null;
    evidenceResultDeadlineAt?: string | null;
    executorId: string | null;
    completedAt: string | null;
    exitCode: number | null;
    timedOut: boolean;
    tokensUsed: number;
    tokenAllowance: number | null;
    tokenReservation: number;
    summary: string | null;
}
export interface LoopConfig {
    version: string;
    pattern: string;
    primitive: TaskAgentPrimitive;
    level: LoopSafetyLevel;
    executionModel: LoopExecutionModel;
    target: TaskWorkerToolTarget;
    schedule: LoopSchedule;
    stopConditions: LoopStopConditions;
    allowlist: LoopAllowlist;
    efficiency: LoopEfficiency;
    documentReviewGovernance?: LoopDocumentReviewGovernance;
    capability: HarnessCapability | null;
    nativeHarnessMetadata?: RuntimeNativeHarnessExecutionMetadata | null;
    createdAt: string;
}
export interface LoopDocumentReviewGovernanceStage {
    maxCompletedRounds: number;
    maxMinutes: number;
    budgetTokens: number | null;
}
export interface LoopDocumentReviewGovernance {
    stages: {
        design: LoopDocumentReviewGovernanceStage;
        plan: LoopDocumentReviewGovernanceStage;
    };
    noProgressLimit: number;
    tokenReservation: number;
}
export interface LoopState {
    version: string;
    iteration: number;
    lastTickTs: string | null;
    currentStep: 'idle' | 'observe' | 'plan' | 'act' | 'verify' | 'repair' | 'gate' | 'log';
    status: LoopStatus;
    comprehensionDebtCounter: number;
    pendingControllerAction: PendingControllerAction | null;
    startedAt: string | null;
    updatedAt: string | null;
    tokensUsed: number;
    executorTokensUsed: number;
    artifactTokensUsed: number;
    executorUsageByKey: Record<string, number>;
    artifactUsageByKey: Record<string, number>;
    noProgressCount: number;
    progressFingerprint: string | null;
    lastFeedback: string | null;
    lastBatchDiagnostics?: LoopBatchDiagnostics | null;
}
export interface LoopRunLogEntry {
    event?: 'state' | 'tick_metrics' | 'document_review';
    ts: string;
    iteration: number;
    trigger: string;
    tokensEst: number | null;
    exitCode: number | null;
    verifyPassed: boolean | null;
    summary: string;
    costToDate: number | null;
    actionId?: string | null;
    actionCount?: number;
    noProgressCount?: number;
    durationMs?: number;
    gateDurationMs?: number | null;
    dispatchCount?: number;
    repeatedBlockerCount?: number;
    reviewCacheHit?: boolean;
}
export interface LoopMetrics {
    tokensUsed: number;
    elapsedMinutes: number;
    noProgressCount: number;
    comprehensionDebtCounter: number;
}
export interface LoopBatchDiagnostics {
    configuredMaxParallel: number;
    configuredMaxParallelReason: string | null;
    graphSafeCandidates: number;
    tokenFundedLimit: number;
    adapterSupportsParallel: boolean;
    adapterCapacity: number | null;
    adapterCapacityKnown: boolean;
    effectiveEmitted: number;
    deferredReasons: string[];
}
export interface LoopTickResult {
    changePath: string;
    iteration: number;
    status: LoopStatus;
    currentStep: LoopState['currentStep'];
    verifyPassed: boolean | null;
    pending: PendingControllerAction | null;
    actions: LoopActionItem[];
    stopped: boolean;
    stopReason: string | null;
    nextInstruction: string;
    feedback: string | null;
    metrics: LoopMetrics;
    batchDiagnostics: LoopBatchDiagnostics | null;
}
export interface LoopExecutionResult {
    actionItemId: string;
    executorId: string;
    exitCode: number | null;
    timedOut?: boolean;
    tokensUsed?: number | null;
    summary?: string;
}
export interface LoopExecutionHeartbeat {
    actionItemId: string;
    executorId: string;
    leaseMs?: number;
}
export interface LoopConfigureOptions {
    target?: TaskWorkerToolTarget;
    executionModel?: LoopExecutionModel;
    interactive?: boolean;
    nativeLoopCapability?: NativeLoopCapability;
    nativeSubagentCapability?: NativeLoopCapability;
    interval?: string;
    maxIterations?: number | null;
    expiresAt?: string | null;
    budgetTokens?: number | null;
    budgetMinutes?: number | null;
    testCommands?: string[];
    allowPaths?: string[];
    allowCommands?: string[];
    allowCommandPolicies?: LoopCommandPolicy[];
    maxParallel?: number;
    maxParallelReason?: string | null;
    noProgressLimit?: number;
    maxTaskRepairRounds?: number;
    maxFinalRepairRounds?: number;
    comprehensionReviewEvery?: number;
    freshContext?: boolean;
    promptMaxChars?: number;
    implementationMaxRuntimeMinutes?: number;
    reviewMaxRuntimeMinutes?: number;
    verificationMaxRuntimeMinutes?: number;
    evidenceResultGraceMinutes?: number;
    nativeHarnessMetadata?: RuntimeNativeHarnessExecutionMetadata | null;
}
export interface LoopServiceDependencies {
    taskGraphExecutionService?: TaskGraphExecutionService;
    verificationService?: VerificationService;
    runtimeAdapterService?: RuntimeExecutionAdapterService;
    now?: () => Date;
}
/**
 * Durable plan-act-observe controller for goal task graphs. OSpec emits bounded action packets;
 * the active model harness executes them through its native subagent primitive.
 */
export declare class LoopService {
    private readonly fileService;
    private readonly taskGraph;
    private readonly verification;
    private readonly runtimeAdapter;
    private readonly now;
    constructor(fileService: FileService, dependencies?: LoopServiceDependencies);
    private loopDir;
    configPath(changePath: string): string;
    statePath(changePath: string): string;
    runLogPath(changePath: string): string;
    stopFilePath(changePath: string): string;
    exists(changePath: string): Promise<boolean>;
    scaffold(changePath: string, options?: {
        level?: LoopSafetyLevel;
        primitive?: TaskAgentPrimitive;
        pattern?: string;
        target?: TaskWorkerToolTarget;
        interval?: string;
        executionModel?: LoopExecutionModel;
        interactive?: boolean;
        nativeLoopCapability?: NativeLoopCapability;
        nativeSubagentCapability?: NativeLoopCapability;
    }): Promise<LoopConfig>;
    readConfig(changePath: string): Promise<LoopConfig>;
    readState(changePath: string): Promise<LoopState>;
    private writeState;
    private assertExists;
    setLevel(changePath: string, level: LoopSafetyLevel): Promise<LoopConfig>;
    private setLevelUnlocked;
    configure(changePath: string, options: LoopConfigureOptions): Promise<LoopConfig>;
    private configureUnlocked;
    deriveAllowlist(changePath: string): Promise<LoopAllowlistDerivation>;
    checkAllowlist(changePath: string): Promise<LoopAllowlistDerivation>;
    applyAllowlist(changePath: string, options: LoopAllowlistApplyOptions): Promise<LoopAllowlistDerivation>;
    clearAllowlist(changePath: string, options?: LoopAllowlistClearOptions): Promise<LoopAllowlist>;
    private deriveAllowlistUnlocked;
    pause(changePath: string): Promise<LoopState>;
    resume(changePath: string): Promise<LoopState>;
    heartbeatExecution(changePath: string, heartbeat: LoopExecutionHeartbeat): Promise<LoopState>;
    recoverExpiredActions(changePath: string, options?: {
        force?: boolean;
    }): Promise<LoopState>;
    recordExecutionResults(changePath: string, results: LoopExecutionResult[]): Promise<LoopState>;
    finalizeExecutionItem(changePath: string, result: LoopExecutionResult): Promise<LoopState>;
    private recordExecutionResultsUnlocked;
    private countPendingRequiredDecisions;
    private validateDocumentReviewReadiness;
    private validateWorkspaceReadiness;
    private markImplementationAttemptsBlocked;
    private recoverExpiredActionsUnlocked;
    private ensurePendingItemStates;
    private requireExecutorId;
    private recommendedHeartbeatDueAt;
    private actionMaxRuntimeMs;
    private extendControllerCapabilitySession;
    private isTerminalItemStatus;
    private executionResultMatches;
    private appendRunLog;
    private withControllerLease;
    private readControllerLockOwner;
    private refreshControllerLockIfOwned;
    private isProcessAlive;
    private removeControllerLockIfOwned;
    private removeCorruptControllerLockIfUnchanged;
    runOnce(changePath: string, options?: {
        trigger?: string;
        projectRoot?: string;
        layoutConfig?: LayoutConfigInput;
    }): Promise<LoopTickResult>;
    private runOnceUnlocked;
    private observePending;
    private refreshPendingEvidenceReadiness;
    private readLatestVerificationEvidence;
    private issueAction;
    private workerAction;
    private reviewAction;
    private verificationAction;
    private validateTaskSafety;
    private getImmediateStop;
    private getHardStop;
    private runLegacyTick;
    buildControllerTickPlan(changePath: string): Promise<{
        interval: string;
        executionModel: LoopExecutionModel;
        nativeLoopCapability: string;
        runtimeAdapter: RuntimeExecutionAdapterResolution;
        instructions: string[];
    }>;
    private gateResult;
    private runtimeAdapterGateResult;
    private preparedBatchGateResult;
    private result;
    private normalizeConfig;
    private normalizeState;
    private defaultEfficiency;
    private defaultDocumentReviewGovernance;
    private normalizeDocumentReviewGovernance;
    private isControllerCapabilityCurrent;
    private assertActionNativeSession;
    private resolveRuntimeAdapter;
    private getTokenFundedLimit;
    private prepareLoopBatch;
    private allocateTokenAllowances;
    private recomputeTokenUsage;
    private reportSummary;
    private buildProgressFingerprint;
    private allReportTasks;
    private readFinalReviewDecision;
    private resetFinalReviewForVerificationFailure;
    private metrics;
    private elapsedMinutes;
    private logEntry;
    private isPathAllowed;
    private isCommandAllowed;
    private isCommandCwdWithinProject;
    private normalizeCommandAllowlist;
    private normalizeCommandPolicies;
    private tokenizeSafeCommand;
    private parseSafeAllowlistedCommand;
    private findProjectRootForSafety;
    private resolveRealPathBoundary;
    private normalizeAllowlistedPath;
    private isSameCurrentCapabilityAssertion;
    private boundPrompt;
    private uniqueNonEmpty;
    private collectDerivedCommand;
    private uniqueDerivedCommands;
    private normalizeAllowlistMetadata;
    diffAllowlists(current: LoopAllowlist, candidate: LoopAllowlist): LoopAllowlistDiff;
    private hasAllowlistExpansion;
    private allowlistCommandKey;
    private allowlistPathKey;
    private allowlistHashInput;
    private canonicalCommand;
    private hashAllowlist;
    private sha256;
    private stableStringify;
    private requireHash;
    private positiveInteger;
    private nonNegativeInteger;
    private assignDefined;
    private quote;
}
export declare function createLoopService(fileService: FileService, dependencies?: LoopServiceDependencies): LoopService;
