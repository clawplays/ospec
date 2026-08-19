import { FileService } from './FileService';
import { VerificationService } from './VerificationService';
import { HarnessCapability, NativeLoopCapability, TaskAgentPrimitive } from './CapabilityProbeService';
import { LayoutConfigInput } from './TriageService';
import { RepeatedFailureAdvisory } from '../utils/repeatedFailureGuard';
import { RuntimeExecutionModelSelectionInput, RuntimeExecutionAdapterResolution, RuntimeExecutionAdapterService, RuntimeNativeHarnessExecutionMetadata } from './RuntimeExecutionAdapterService';
import { TaskGraphExecutionService, TaskVerificationLoopBinding, TaskWorkerToolTarget } from './TaskGraphExecutionService';
export type LoopStatus = 'idle' | 'running' | 'blocked' | 'paused' | 'stopped' | 'done';
/** `cli-driven` is retained only so callers can receive a migration error. */
export type LoopExecutionModel = 'controller' | 'cli-driven';
export type LoopActionKind = 'implementation' | 'planning-review' | 'planning-repair' | 'task-review' | 'final-review' | 'verification';
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
    continueWhileProgressing: boolean;
    comprehensionReviewEvery: number;
    freshContext: boolean;
    promptMaxChars: number;
    implementationMaxRuntimeMinutes: number;
    reviewMaxRuntimeMinutes: number;
    verificationMaxRuntimeMinutes: number;
    evidenceResultGraceMinutes: number;
    /** strict (default): dependents wait for upstream task reviews; optimistic: dependents dispatch while reviews run, final review still gates. Additive in 1.9.8. */
    reviewGating?: 'strict' | 'optimistic';
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
    /** Last bounded controller poll that observed this claimed executor still pending. */
    controllerObservedAt?: string | null;
    heartbeatDueAt?: string;
    leaseExpiresAt: string;
    absoluteExpiresAt?: string;
    evidenceReadyAt?: string | null;
    evidenceResultDeadlineAt?: string | null;
    executorId: string | null;
    completedAt: string | null;
    exitCode: number | null;
    timedOut: boolean;
    /** F5: signal that killed the executor; additive, absent on states written before 1.9.11. */
    signal?: string | null;
    /** F5: infrastructure failure rather than a failure of the work itself. */
    infraFailure?: boolean;
    tokensUsed: number;
    tokenAllowance: number | null;
    tokenReservation: number;
    summary: string | null;
}
export interface LoopConfig {
    version: string;
    pattern: string;
    primitive: TaskAgentPrimitive;
    executionModel: LoopExecutionModel;
    target: TaskWorkerToolTarget;
    schedule: LoopSchedule;
    stopConditions: LoopStopConditions;
    allowlist: LoopAllowlist;
    efficiency: LoopEfficiency;
    capability: HarnessCapability | null;
    nativeHarnessMetadata?: RuntimeNativeHarnessExecutionMetadata | null;
    createdAt: string;
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
    /** F5: signal reported with the first failure in this entry, when there was one. */
    signal?: string | null;
    /** F5: true when every failure folded into this entry was infrastructure. */
    infraFailure?: boolean;
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
    /** True when every remaining pending task waits on the single dispatched task, so controller-inline execution is allowed. Additive in 1.9.8. */
    serialBottleneck?: boolean;
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
    /**
     * F6: advisory raised when the tail of the run log is a run of >= 3
     * identical failures. Output only -- the state machine never reads it.
     */
    repeatedFailureAdvisory?: RepeatedFailureAdvisory | null;
}
export interface LoopPollItemSnapshot {
    id: string;
    status: PendingControllerActionItemStatus;
    evidenceReady: boolean;
}
export interface LoopPollResult {
    changePath: string;
    status: LoopStatus;
    actionId: string | null;
    items: LoopPollItemSnapshot[];
    settled: boolean;
    tickNow: boolean;
    reason: string;
    nextInstruction: string;
}
/**
 * F5: the four orthogonal outcome fields. They are deliberately independent --
 * none is inferred from another, because collapsing them is what made the
 * controller misdiagnose failures in the first place.
 *
 * - `exitCode`   any integer, including negative ones (a harness that reports
 *                `-1` for "never started" must be able to say so); `null` means
 *                no code was ever produced.
 * - `timedOut`   the runtime killed it for exceeding a deadline.
 * - `signal`     POSIX signal name (`SIGKILL`); `null` on win32 and clean exits.
 * - `infraFailure` the harness failed to *run* the work -- EINVAL/ENOENT/EACCES
 *                class spawn errors, an unavailable adapter, a transport fault.
 *                A failing test or a failing build is NOT an infra failure.
 */
export interface ExecutionOutcomeFields {
    exitCode?: number | null;
    timedOut?: boolean;
    signal?: string | null;
    infraFailure?: boolean;
}
export interface LoopExecutionResult {
    actionItemId: string;
    executorId: string;
    exitCode: number | null;
    timedOut?: boolean;
    /** F5: POSIX signal that killed the executor, when the harness reports one. */
    signal?: string | null;
    /**
     * F5: true when the failure is infrastructure rather than the work. Such a
     * failure still routes a retry but must not consume a no-progress round.
     */
    infraFailure?: boolean;
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
    continueWhileProgressing?: boolean;
    comprehensionReviewEvery?: number;
    freshContext?: boolean;
    promptMaxChars?: number;
    implementationMaxRuntimeMinutes?: number;
    reviewMaxRuntimeMinutes?: number;
    verificationMaxRuntimeMinutes?: number;
    evidenceResultGraceMinutes?: number;
    reviewGating?: 'strict' | 'optimistic';
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
    /** M-race5: see the note in `issueAction`. */
    private bindingIntentPath;
    /**
     * M-race5: clears task-graph bindings that no loop state claims.
     *
     * Runs at the top of every tick, before anything reads the bindings. The
     * marker names the action whose bindings were being written; if durable
     * loop state does not have a `pendingControllerAction` with that id, the
     * `writeState` that should have adopted them never happened, so they belong
     * to nothing. Releasing them is what lets the next tick bind a fresh
     * action instead of dying on "already bound to another Loop action"
     * forever.
     *
     * Deliberately compares the id rather than merely checking that SOME action
     * is pending: a crash followed by a manual `loop resume` can leave a
     * different, legitimate action pending, and its bindings must survive.
     */
    private releaseOrphanedLoopBindings;
    private writeState;
    private assertExists;
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
    private refreshClaimedLeasesFromControllerPoll;
    private requireExecutorId;
    private recommendedHeartbeatDueAt;
    private actionMaxRuntimeMs;
    private isReviewActionKind;
    private extendControllerCapabilitySession;
    private isTerminalItemStatus;
    private applyItemCompletionSideEffects;
    /**
     * Settles claimed pending items whose authoritative durable evidence is
     * already complete, so a settled observation advances in the same tick
     * instead of waiting one extra controller round-trip for a separate
     * `ospec loop result` call. Token usage stays 0 until (and unless) the
     * controller records the executor result afterwards.
     */
    private settleEvidenceCompleteItems;
    private executionResultMatches;
    /**
     * F5: the loop-side record boundary. What is validated here, and why a
     * shape check upstream cannot substitute for it:
     *
     * - `exitCode`: any integer including negative, or `null`. Rejects `NaN`,
     *   `Infinity` and fractions -- all of which are `typeof 'number'` and so
     *   pass a shape check, but would be written to durable state and then
     *   rendered into a blocker as a number no reader can act on.
     * - `signal`: a signal name or `null`. Rejects a string carrying newlines or
     *   markdown, which a shape check reads as "a string" and which forges rows
     *   in the blocker text `describeFailure` builds.
     *
     * `timedOut` and `infraFailure` are read with `=== true` everywhere they are
     * used, so no value can subvert them and none is rejected here.
     */
    private assertOutcomeFields;
    /**
     * F5: one failure sentence that names all four outcome fields the reporter
     * supplied, so a controller reading the blocker knows whether to retry the
     * work or fix its own environment.
     */
    private describeFailure;
    /**
     * F6: build the repeated-failure advisory from the run-log tail. A missing
     * or unreadable run log yields no advisory rather than an error -- a guard
     * that can break the tick it advises on is worse than no guard.
     */
    readRepeatedFailureAdvisory(changePath: string): Promise<RepeatedFailureAdvisory | null>;
    private appendRunLog;
    private withControllerLease;
    private confirmControllerLockStillStale;
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
    /**
     * Lightweight controller liveness poll between full ticks. Refreshes
     * claimed leases (an explicit poll is a controller heartbeat, so separate
     * per-item heartbeat commands are unnecessary while polling), checks
     * whether durable evidence arrived, and tells the controller whether a
     * full `loop run --once` is worth running now. It never advances the
     * loop state machine, never dispatches, and never appends run-log noise.
     */
    poll(changePath: string): Promise<LoopPollResult>;
    private runOnceUnlocked;
    private observePending;
    private refreshPendingEvidenceReadiness;
    private readLatestVerificationEvidence;
    /**
     * A single implementation dispatch is a serial bottleneck when every other
     * pending task waits only on it (dependency, its review, or a conflict).
     * Controller-inline execution is then allowed: spawning a subagent buys
     * no parallelism and only adds context-rebuild and wait overhead.
     */
    private isSerialBottleneck;
    private issueAction;
    private workerAction;
    private reviewAction;
    private planningRepairAction;
    private verificationAction;
    private validateConfiguredTaskSafety;
    private getImmediateStop;
    private getHardStop;
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
    private buildRepairStrategy;
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
    /**
     * See `utils/ShellQuote`. A fifth copy of the rule, and the only one that
     * branched on `process.platform`: on win32 it doubled `'` as `''`, which is
     * the PowerShell/cmd convention and is simply wrong for the POSIX sh these
     * strings are written for -- and it meant the same change emitted different
     * bytes into its committed artifacts depending on the machine that ran it.
     * The POSIX branch used `'"'"'`, a valid alternative spelling of the shared
     * `'\''`, so that half was correct.
     *
     * The dropped `!value.startsWith('-')` guard was cosmetic: quoting does not
     * stop a leading `-` being read as a flag, because the shell removes the
     * quotes before the receiving CLI ever sees the word.
     */
    private quote;
}
export declare function createLoopService(fileService: FileService, dependencies?: LoopServiceDependencies): LoopService;
