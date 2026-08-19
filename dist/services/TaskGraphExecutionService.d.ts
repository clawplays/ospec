import { AgentModelProfileId } from '../core/types';
import { ReviewDecisionDocument, WorkerReportDocument } from '../utils/structuredReports';
import { WorkflowProfileId } from '../utils/WorkflowProfile';
import { FileService } from './FileService';
import { HarnessCapability, TaskAgentPrimitive } from './CapabilityProbeService';
import { RuntimeExecutionAdapterResolution, RuntimeExecutionAdapterService } from './RuntimeExecutionAdapterService';
export declare const STALE_LOCK_STEAL_RECHECK_MS: number;
export declare const GIT_COMMAND_TIMEOUT_MS: number;
export declare const GIT_KILL_GRACE_MS: number;
export declare const REVIEW_PACKAGE_DIFF_LIMIT_BYTES: number;
export declare const GIT_OUTPUT_LIMIT_BYTES: number;
export type HeldLease = {
    readonly lockPath: string;
    readonly nonce: string;
};
export declare function registerHeldLease(lockPath: string, nonce: string): HeldLease;
export declare function releaseHeldLease(lease: HeldLease): void;
/** Run `operation` with `lease` marked as covering it (nested leases stack). */
export declare function runWithHeldLease<T>(lease: HeldLease, operation: () => Promise<T>): Promise<T>;
export declare function getActiveHeldLeases(): readonly HeldLease[];
export declare function markHeldLeaseWedged(lease: HeldLease): void;
export declare function isHeldLeaseWedged(lease: HeldLease): boolean;
export declare function touchLeasesSync(leases: readonly HeldLease[]): void;
export declare function touchActiveLeasesSync(): void;
export type TaskWorkerCapabilityTier = 'mechanical' | 'standard' | 'strong-reasoning' | 'review';
export type TaskWorkerToolTarget = 'codex' | 'gpt' | 'claude' | 'gemini' | 'grok' | 'opencode' | 'cursor' | 'copilot' | 'shell' | 'generic';
export type TaskWorkerRunStatus = 'completed' | 'failed';
export type TaskReviewRunDecision = 'APPROVED' | 'APPROVED_WITH_CONCERNS' | 'NEEDS_CHANGES' | 'BLOCKED' | 'PENDING';
export type TaskUserDecisionStatus = 'PENDING' | 'SELECTED' | 'SKIPPED';
export interface TaskReviewState {
    decision: TaskReviewRunDecision;
    reviewArtifactPath: string | null;
}
export interface TaskReviewRepairContext {
    taskId: string;
    decision: 'NEEDS_CHANGES' | 'BLOCKED';
    reviewArtifactPath: string;
    findingsPath: string;
    reviewArtifactHash: string;
    findingsHash: string;
    contextHash: string;
    capturedAt: string;
    source: 'structured' | 'markdown_fallback';
    findingIds: string[];
    findings: TaskReviewFinding[];
    repairScope: string[];
    /** Added in 1.8.11. Older repair contexts are resolved from review history. */
    reviewDispatchId?: string;
    /** Full reviewed task target snapshot before this repair. */
    reviewTargetSnapshotHash?: string;
    /** Snapshot of only the files this repair was authorized to change. */
    repairScopeSnapshotHash?: string;
    /** Added in 1.8.13 for repair scopes spanning declared task owners. */
    repairScopeSnapshots?: TaskDocumentationSnapshot[];
    /** Completed task owners whose declared paths authorize cross-task repair files. */
    crossTaskScopeOwnerIds?: string[];
    /** One bounded strategy escalation after ordinary repairs stop converging. */
    repairStrategy?: TaskRepairStrategyContext;
}
export interface TaskRepairConvergenceAssessment {
    scope: 'task' | 'final';
    taskId: string | null;
    roundsUsed: number;
    currentFindingIds: string[];
    previousFindingIds: string[];
    currentFingerprint: string;
    previousFingerprint: string | null;
    currentRepairScopeSnapshotHash: string | null;
    previousRepairScopeSnapshotHash: string | null;
    targetSnapshotChanged: boolean | null;
    comparable: boolean;
    progressing: boolean;
    reason: 'below_limit' | 'findings_changed' | 'findings_refined' | 'findings_unchanged' | 'findings_repeated' | 'reviewed_target_unchanged' | 'legacy_context_unavailable';
}
export interface TaskRepairStrategyContext {
    kind: 'stalled_findings';
    key: string;
    reason: TaskRepairConvergenceAssessment['reason'];
    priorRounds: number;
    findingIds: string[];
}
export type TaskWorkerRetryTrigger = 'manual' | 'worker_status' | 'task_review' | 'repair_strategy';
export interface TaskWorkerRetryInput {
    taskId: string;
    runId?: string;
    summary?: string;
    force?: boolean;
    trigger?: TaskWorkerRetryTrigger;
    repairStrategy?: TaskRepairStrategyContext;
}
export interface TaskRunningRecoveryAssessment {
    taskId: string;
    dispatchId: string | null;
    assignedAt: string | null;
    recoveryDeadline: string | null;
    recoverable: boolean;
    reason: 'runtime_expired' | 'missing_dispatch' | 'invalid_assigned_at' | 'within_runtime';
}
export interface TaskWorkerTargetToolMapping {
    target: TaskWorkerToolTarget;
    readContext: string;
    editFiles: string;
    runCommands: string;
    trackPlan: string;
    dispatchWorkers: string;
    recordCompletion: string;
}
export interface TaskWorkerProfile {
    role: string;
    recommendedTarget: TaskWorkerToolTarget;
    capabilityTier: TaskWorkerCapabilityTier;
    summary: string;
    rationale: string[];
    requiredBehavior: string[];
    targetToolMapping: TaskWorkerTargetToolMapping;
    modelProfile: AgentModelProfileId;
    model: string | null;
    modelSelectionSource: 'configured' | 'harness-default';
    resolvedTarget?: TaskWorkerToolTarget;
    modelConfigurationSource?: 'target' | 'default' | 'harness-default';
    requestedModel?: string | null;
    configuredModel?: string | null;
}
export interface TaskGraphExecutionTask {
    id: string;
    title: string;
    status: string;
    dependsOn: string[];
    parallelizable: boolean;
    serialReason: string | null;
    scopeReason: string | null;
    conflictsWith: string[];
    targetFiles: string[];
    verificationCommands: string[];
    expectedResult: string;
    context: string;
    interfaces: string[];
    documentationUpdates: string[];
    workerRole: string;
    review: TaskReviewState | null;
    workerProfile: TaskWorkerProfile;
}
export interface TaskGraphBlockedTask {
    task: TaskGraphExecutionTask;
    reasons: string[];
}
export interface TaskGraphExecutionReport {
    changePath: string;
    graphPath: string;
    feature: string;
    globalConstraints: string[];
    graphStatus: string;
    taskCount: number;
    readyTasks: TaskGraphExecutionTask[];
    dispatchableTasks: TaskGraphExecutionTask[];
    runningTasks: TaskGraphExecutionTask[];
    completedTasks: TaskGraphExecutionTask[];
    concernTasks: TaskGraphExecutionTask[];
    blockedTasks: TaskGraphBlockedTask[];
    invalidTasks: TaskGraphBlockedTask[];
    decisions: TaskUserDecisionSnapshot;
    issues: string[];
    scheduling: TaskGraphSchedulingDiagnostics;
    nextInstruction: string;
}
export interface TaskGraphSchedulingDeferredTask {
    taskId: string;
    reasons: string[];
}
export interface TaskGraphSchedulingDiagnostics {
    readyCount: number;
    graphSafeCount: number;
    serialWithoutReason: string[];
    deferred: TaskGraphSchedulingDeferredTask[];
}
export type TaskGraphCompletionStatus = 'DONE' | 'DONE_WITH_CONCERNS' | 'NEEDS_CONTEXT' | 'BLOCKED';
export type TaskReviewStage = 'spec' | 'quality' | 'review' | 'planning';
export type TaskReviewFeedbackAction = 'accept' | 'revise' | 'clarify' | 'blocked';
export type TaskDocumentReviewStage = 'design' | 'plan';
export type TaskVerificationEvidenceStatus = 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
export type TaskVerificationRequirementKind = 'browser' | 'e2e' | 'test' | 'lint' | 'build' | 'manual' | 'other';
export type TaskTddEvidencePhase = 'red' | 'green' | 'refactor';
export type TaskDebugEvidencePhase = 'reproduce' | 'isolate' | 'hypothesize' | 'fix' | 'verify';
export type TaskDebugEvidenceStatus = 'CONFIRMED' | 'FIXED' | 'BLOCKED' | 'SKIPPED';
export interface TaskDispatchRecord {
    id: string;
    taskId: string;
    taskTitle: string;
    workerRole: string;
    workerProfile?: TaskWorkerProfile;
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    status: 'DISPATCHED' | TaskGraphCompletionStatus;
    assignedAt: string;
    completedAt: string | null;
    packetPath: string;
    recordPath: string;
    summary: string | null;
    gitBaseCommit?: string | null;
    gitHeadAtCompletion?: string | null;
    workspaceDirtyAtDispatch?: boolean | null;
    documentationBaseline?: TaskDocumentationSnapshot[];
    documentationEvidence?: TaskDocumentationEvidence[];
    repairContext?: TaskReviewRepairContext;
}
export interface TaskDocumentationSnapshot {
    path: string;
    exists: boolean;
    contentHash: string | null;
    /** Added in 1.8.6. Older snapshots remain valid without a kind. */
    kind?: 'file' | 'directory' | 'missing';
    /** Deterministic recursive entry count for directory snapshots. */
    entryCount?: number;
}
export interface TaskDocumentationEvidence extends TaskDocumentationSnapshot {
    baselineExists: boolean;
    baselineContentHash: string | null;
    meaningfullyChanged: boolean;
}
export interface TaskExecutionSession {
    version: string;
    feature: string;
    status: 'running' | 'completed' | 'blocked' | 'needs_context';
    updatedAt: string;
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    dispatches: TaskDispatchRecord[];
}
export interface TaskDispatchResult {
    changePath: string;
    sessionPath: string;
    graphPath: string;
    workerStatusPath: string;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    dispatches: TaskDispatchRecord[];
    dispatchLimit: number | null;
    warnings: string[];
    nextInstruction: string;
}
export interface TaskCompletionResult {
    changePath: string;
    sessionPath: string;
    graphPath: string;
    workerStatusPath: string;
    blockerEscalation: TaskBlockerEscalationRecord | null;
    taskId: string;
    status: TaskGraphCompletionStatus;
    graphStatus: string;
    usage: TaskExecutionUsage | null;
    nextInstruction: string;
}
export interface TaskBlockerEscalationRecord {
    id: string;
    taskId: string;
    taskTitle: string;
    status: 'NEEDS_CONTEXT' | 'BLOCKED';
    judgmentRequired: boolean;
    escalationReason: 'missing_context' | 'external_blocker' | 'executor_failure';
    retryable: boolean;
    deferredToFinalReview?: boolean;
    deferredAt?: string | null;
    deferredReason?: string | null;
    createdAt: string;
    workerRole: string;
    workerProfile?: TaskWorkerProfile;
    summary: string | null;
    dispatchId: string | null;
    dispatchRecordPath: string | null;
    taskGraphPath: string;
    sessionPath: string;
    recordPath: string;
    reportPath: string;
    nextActions: string[];
}
export interface TaskWorkerStatusSyncResult {
    changePath: string;
    sessionPath: string;
    graphPath: string;
    workerStatusPath: string;
    implementerStatus: TaskGraphCompletionStatus | 'PENDING';
    specReviewerStatus: TaskGraphCompletionStatus | 'PENDING';
    qualityReviewerStatus: TaskGraphCompletionStatus | 'PENDING';
    controllerStatus: TaskGraphCompletionStatus | 'PENDING';
    verificationChecklistComplete: boolean;
    progressProjection: GoalProgressReconciliationResult;
    nextInstruction: string;
}
export interface GoalProgressAmbiguousLine {
    line: number;
    taskIds: string[];
}
export interface GoalProgressReconciliationResult {
    changePath: string;
    graphPath: string;
    tasksPath: string;
    projectionPath: string;
    status: 'current' | 'blocked';
    graphChanged: boolean;
    tasksChanged: boolean;
    projectionChanged: boolean;
    reviewDecisionsRepaired: string[];
    checkedTaskIds: string[];
    uncheckedTaskIds: string[];
    unmatchedAcceptedTaskIds: string[];
    duplicateTaskIds: string[];
    unknownTaskIds: string[];
    ambiguousLines: GoalProgressAmbiguousLine[];
    issues: string[];
    /**
     * FIX-5: every artifact the reconciliation would rewrite, with the exact
     * bytes it would write -- in the order it writes them.
     *
     * This is the complete list of repairs `ospec archive` applies before its
     * readiness gates run, which is what makes `archive --check` able to gate
     * on the POST-repair state without performing the repair.
     *
     * ABSENT on the persisting path, which is what the optionality means: there
     * these bytes are already on disk, so carrying a copy of every repaired
     * artifact through every `syncWorkerStatus` report would be pure weight --
     * and would change the shape of a result six benchmarked call sites
     * fingerprint, for nobody's benefit. `inspectGoalProgress` always sets it,
     * to `[]` when nothing needs repairing. A `blocked` reconciliation still
     * repairs the graph (the checklist re-tick is the part it withholds), so
     * this can be non-empty with `status: 'blocked'`.
     */
    repairedArtifacts?: {
        path: string;
        content: string;
    }[];
}
export interface TaskReviewDispatchRecord {
    id: string;
    stage: TaskReviewStage;
    taskId?: string | null;
    taskTitle?: string | null;
    reviewerRole: 'spec_compliance_reviewer' | 'code_quality_reviewer' | 'code_reviewer' | 'planning_reviewer';
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    status: 'DISPATCHED';
    assignedAt: string;
    packetPath: string;
    recordPath: string;
    reviewArtifactPath: string;
    reviewPackagePath?: string | null;
    workerProfile?: TaskWorkerProfile;
    gitHead: string | null;
    targetFiles: string[];
    targetSnapshots: TaskDocumentationSnapshot[];
    targetSnapshotHash: string;
    /** Content-addressed task/review contract key added in 1.8.6. */
    reviewContextHash?: string;
    /** Upstream task contracts that this downstream review must regression-check. */
    regressionTaskIds?: string[];
    loopActionId?: string | null;
    loopActionItemId?: string | null;
    controllerSessionReportedAt?: string | null;
    reviewerExecutorId?: string | null;
    reviewerClaimedAt?: string | null;
    reviewerHeartbeatAt?: string | null;
    reviewerCompletedAt?: string | null;
    reviewerSucceeded?: boolean | null;
    runtimeAdapter?: RuntimeExecutionAdapterResolution | null;
    requiresExecutorProvenance?: boolean;
    requiresNativeExecutorProvenance?: boolean;
    /**
     * Snapshot semantics used for target invalidation. Planning reviews set
     * 'planning-semantic-v1' so derived execution state (task status, review
     * bookkeeping, checklist ticks) does not invalidate an approval. Absent on
     * legacy records, which keep raw content hashing.
     */
    snapshotContract?: string | null;
}
export interface TaskExecutionUsage {
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    toolCalls: number | null;
    turns: number | null;
    elapsedMs: number | null;
    observedFields: string[];
    source: string;
    coverage: 'complete' | 'partial' | 'none';
}
export interface TaskReviewDispatchResult {
    changePath: string;
    graphPath: string;
    workerStatusPath: string;
    dispatch: TaskReviewDispatchRecord;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    warnings: string[];
    nextInstruction: string;
}
export interface TaskReviewDispatchBatchResult {
    changePath: string;
    reviews: TaskReviewDispatchResult[];
    dispatches: TaskReviewDispatchRecord[];
    nextInstruction: string;
}
export interface TaskReviewFeedbackPlan {
    version: string;
    feature: string;
    stage: TaskReviewStage;
    reviewerRole: 'spec_compliance_reviewer' | 'code_quality_reviewer' | 'code_reviewer';
    decision: string;
    action: TaskReviewFeedbackAction;
    createdAt: string;
    reviewArtifactPath: string;
    artifactPath: string;
    reportPath: string;
    summary: string | null;
    findings: string[];
    structuredFindings: TaskReviewFinding[];
    recommendedActions: string[];
    userDecisionGate: TaskReviewFeedbackUserDecisionGate;
    nextInstruction: string;
}
export interface TaskReviewFinding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';
    category: string;
    message: string;
    file: string | null;
    line: number | null;
    evidence: string;
    requirementRefs: string[];
    repairScope: string[];
}
export interface TaskReviewFeedbackUserDecisionGate {
    status: 'not_needed' | 'created' | 'pending' | 'already_selected';
    id: string | null;
    question: string | null;
    recommendedOptionId: string | null;
    recordPath: string | null;
    reportPath: string | null;
    reason: string | null;
    nextInstruction: string | null;
}
export interface TaskReviewFeedbackPlanResult {
    changePath: string;
    artifactPath: string;
    reportPath: string;
    stage: TaskReviewStage;
    decision: string;
    action: TaskReviewFeedbackAction;
    userDecisionGate: TaskReviewFeedbackUserDecisionGate;
    nextInstruction: string;
}
export interface TaskDocumentReviewDispatchRecord {
    id: string;
    stage: TaskDocumentReviewStage;
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    status: 'COMPLETED_INLINE';
    assignedAt: string;
    packetPath: string;
    recordPath: string;
    documentPath: string;
    documentHash: string;
    reviewContextHash: string;
    reviewContractVersion: string;
    mechanicalPreflight?: TaskDocumentReviewMechanicalPreflight;
    reviewArtifactPath: string;
    documentReadiness: TaskBootstrapDocumentReadiness;
    mode: 'inline_preflight';
    reviewerCompletedAt?: string | null;
    reviewerSucceeded?: boolean | null;
}
export interface TaskDocumentReviewMechanicalPreflight {
    version: '1.0';
    stage: TaskDocumentReviewStage;
    checkedAt: string;
    checks: string[];
    warnings: string[];
    errors: string[];
}
export interface TaskLoopReadinessResult {
    ready: boolean;
    reason: string | null;
}
export interface TaskAuthoritativeUsageSnapshot {
    totalTokens: number;
    byId: Record<string, number>;
}
export interface TaskDocumentReviewDispatchResult {
    changePath: string;
    dispatch: TaskDocumentReviewDispatchRecord;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    warnings: string[];
    nextInstruction: string;
    reused?: boolean;
}
export interface TaskRepairWaveRecord {
    version: string;
    id: string;
    feature: string;
    createdAt: string;
    status: 'ready' | 'dispatched';
    sourceReviewPath: string;
    sourceDecision: string;
    findings: string[];
    structuredFindings: TaskReviewFinding[];
    taskId: string;
    targetFiles: string[];
    verificationCommands: string[];
    documentationUpdates: string[];
    recordPath: string;
    packetPath: string;
    dispatchIds: string[];
    /** Added in 1.8.11. Older repair waves are resolved from review history. */
    sourceReviewDispatchId?: string;
    sourceReviewTargetSnapshotHash?: string;
    sourceRepairScopeSnapshotHash?: string;
    repairStrategy?: TaskRepairStrategyContext;
}
export interface TaskRepairWaveResult {
    changePath: string;
    record: TaskRepairWaveRecord;
    dispatch: TaskDispatchResult;
    nextInstruction: string;
}
export interface TaskPlanningRepairRecord {
    version: '1.0';
    id: string;
    feature: string;
    status: 'ready' | 'dispatched' | 'completed';
    createdAt: string;
    completedAt: string | null;
    loopActionId: string | null;
    loopActionItemId: string | null;
    sourceReviewDispatchId: string;
    sourceReviewContextHash: string;
    findingFingerprint: string;
    findingIds: string[];
    findings: TaskReviewFinding[];
    targetFiles: string[];
    beforeSnapshotHash: string;
    afterSnapshotHash: string | null;
    workspaceGitHead: string | null;
    workspaceBaselineSnapshots: TaskDocumentationSnapshot[] | null;
    /** F30: true when the baseline `git status` was cut at the output limit. */
    workspaceBaselineTruncated?: boolean;
    recordPath: string;
    packetPath: string;
    /** Pre-repair copies of the authorized planning files, kept for the delta re-review packet. */
    baselineFiles?: Array<{
        path: string;
        baselinePath: string;
        existed: boolean;
    }> | null;
    /** How the post-repair planning decision was settled; guards the one-shot deterministic acceptance. */
    postRepairReviewMode?: 'deterministic' | 'delta_review' | null;
}
export interface TaskPlanningRepairResult {
    changePath: string;
    record: TaskPlanningRepairRecord;
    nextInstruction: string;
}
export interface TaskVerificationEvidenceRecord {
    id: string;
    command: string;
    status: TaskVerificationEvidenceStatus;
    /** F5: any integer, including negative ones; null when no code was produced. */
    exitCode: number | null;
    /** F5: the runtime killed the command for exceeding a deadline. */
    timedOut?: boolean;
    /** F5: POSIX signal that killed the command; null on win32 and clean exits. */
    signal?: string | null;
    /** F5: the harness failed to run the command, rather than the command failing. */
    infraFailure?: boolean;
    recordedAt: string;
    recordPath: string;
    reportPath: string;
    summary: string | null;
    gitHead: string | null;
    targetFiles: string[];
    targetSnapshots: TaskDocumentationSnapshot[];
    targetSnapshotHash: string;
    loopActionId?: string | null;
    loopActionItemId?: string | null;
    executorId?: string | null;
    issuanceTargetSnapshotHash?: string | null;
    satisfies?: string[];
}
export interface TaskVerificationRequirement {
    id: string;
    kind: TaskVerificationRequirementKind;
    description: string;
    required: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface TaskVerificationRequirementsArtifact {
    version: '1.0';
    feature: string;
    updatedAt: string;
    requirements: TaskVerificationRequirement[];
}
export interface TaskVerificationRequirementsStatus {
    ready: boolean;
    artifactPath: string;
    required: number;
    satisfied: string[];
    pending: string[];
    reason: string | null;
}
export interface TaskVerificationRequirementResult {
    changePath: string;
    artifactPath: string;
    requirement: TaskVerificationRequirement;
    status: TaskVerificationRequirementsStatus;
    nextInstruction: string;
}
export interface TaskVerificationLoopBinding {
    expectedCommand: string | null;
    gitHead: string | null;
    targetSnapshotHash: string;
}
export interface TaskVerificationEvidenceSession {
    version: string;
    feature: string;
    status: 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';
    updatedAt: string;
    records: TaskVerificationEvidenceRecord[];
}
export interface TaskVerificationEvidenceResult {
    changePath: string;
    evidencePath: string;
    workerStatusPath: string;
    record: TaskVerificationEvidenceRecord;
    nextInstruction: string;
}
export interface TaskTddEvidenceRecord {
    id: string;
    phase: TaskTddEvidencePhase;
    command: string;
    status: TaskVerificationEvidenceStatus;
    /** F5: any integer, including negative ones; null when no code was produced. */
    exitCode: number | null;
    /** F5: the runtime killed the command for exceeding a deadline. */
    timedOut?: boolean;
    /** F5: POSIX signal that killed the command; null on win32 and clean exits. */
    signal?: string | null;
    /** F5: the harness failed to run the command, rather than the command failing. */
    infraFailure?: boolean;
    recordedAt: string;
    recordPath: string;
    reportPath: string;
    testName: string | null;
    summary: string | null;
}
export interface TaskTddEvidenceSession {
    version: string;
    feature: string;
    status: 'pending' | 'red' | 'green' | 'refactor' | 'failed' | 'blocked' | 'skipped';
    updatedAt: string;
    records: TaskTddEvidenceRecord[];
}
export interface TaskTddEvidenceResult {
    changePath: string;
    evidencePath: string;
    workerStatusPath: string;
    record: TaskTddEvidenceRecord;
    nextInstruction: string;
}
export interface TaskDebugEvidenceRecord {
    id: string;
    phase: TaskDebugEvidencePhase;
    symptom: string;
    hypothesis: string | null;
    rootCause: string | null;
    command: string | null;
    status: TaskDebugEvidenceStatus;
    recordedAt: string;
    recordPath: string;
    reportPath: string;
    summary: string | null;
}
export type TaskDebugEvidencePhaseStatus = 'missing' | 'recorded' | 'blocked' | 'skipped';
export interface TaskDebugEvidencePhaseSnapshot {
    phase: TaskDebugEvidencePhase;
    status: TaskDebugEvidencePhaseStatus;
    latestRecordId: string | null;
    latestStatus: TaskDebugEvidenceStatus | null;
}
export interface TaskDebugEvidenceSession {
    version: string;
    feature: string;
    status: 'pending' | 'confirmed' | 'fixed' | 'blocked' | 'skipped';
    updatedAt: string;
    phases: TaskDebugEvidencePhaseSnapshot[];
    records: TaskDebugEvidenceRecord[];
}
export interface TaskDebugEvidenceResult {
    changePath: string;
    evidencePath: string;
    workerStatusPath: string;
    record: TaskDebugEvidenceRecord;
    nextInstruction: string;
}
export type TaskWorkspaceReadiness = 'ready' | 'needs_isolation' | 'unknown';
export type TaskWorktreePlanStatus = 'ready' | 'needs_cleanup' | 'unknown';
export type TaskFinishPlanStatus = 'ready' | 'blocked' | 'unknown';
export type TaskBootstrapStatus = 'needs_proposal' | 'needs_design' | 'needs_plan' | 'needs_task_graph' | 'needs_workspace_check' | 'needs_decision' | 'ready_to_dispatch' | 'ready_to_launch' | 'needs_worker_completion' | 'needs_review' | 'needs_verification' | 'ready_to_finish' | 'blocked' | 'unknown';
export type TaskBootstrapDocumentReadiness = 'missing' | 'empty' | 'draft' | 'ready';
export interface TaskWorkspaceGitWorktree {
    path: string;
    head: string | null;
    branch: string | null;
    detached: boolean;
    bare: boolean;
}
export interface TaskWorkspaceStatusEntry {
    code: string;
    file: string;
}
export interface TaskWorkspaceStatusArtifact {
    version: string;
    feature: string;
    status: TaskWorkspaceReadiness;
    inspectedAt: string;
    changePath: string;
    projectRoot: string;
    git: {
        available: boolean;
        repository: boolean;
        root: string | null;
        branch: string | null;
        head: string | null;
        dirty: boolean;
        statusEntries: TaskWorkspaceStatusEntry[];
        goalOwnedStatusEntries: TaskWorkspaceStatusEntry[];
        generatedStatusEntries: TaskWorkspaceStatusEntry[];
        updateManagedStatusEntries: TaskWorkspaceStatusEntry[];
        blockingStatusEntries: TaskWorkspaceStatusEntry[];
        worktrees: TaskWorkspaceGitWorktree[];
        currentWorktree: TaskWorkspaceGitWorktree | null;
    };
    ownership: {
        mode: 'clean' | 'goal_resume' | 'blocked';
        goalOwnedPaths: string[];
        generatedPaths: string[];
        updateProvenancePath: string | null;
        updateProvenanceHash: string | null;
    };
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorkspaceInspectionResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskWorkspaceReadiness;
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorktreePlanArtifact {
    version: string;
    feature: string;
    status: TaskWorktreePlanStatus;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    recommendedBranch: string;
    recommendedPath: string;
    baseRef: string;
    commands: string[];
    lifecycle: TaskWorktreeLifecycleStep[];
    git: {
        available: boolean;
        repository: boolean;
        root: string | null;
        branch: string | null;
        head: string | null;
        dirty: boolean;
        statusEntries: TaskWorkspaceStatusEntry[];
        worktrees: TaskWorkspaceGitWorktree[];
        currentWorktree: TaskWorkspaceGitWorktree | null;
        targetPathExists: boolean;
        targetPathInWorktrees: boolean;
    };
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorktreeLifecycleStep {
    step: 'plan' | 'create' | 'inspect' | 'dispatch' | 'finish' | 'cleanup' | 'branch-retention';
    status: 'ready' | 'blocked' | 'manual' | 'pending';
    command: string | null;
    guidance: string;
}
export interface TaskWorktreePlanResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskWorktreePlanStatus;
    recommendedBranch: string;
    recommendedPath: string;
    baseRef: string;
    commands: string[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export type TaskWorktreeRunAction = 'create' | 'cleanup';
export type TaskWorktreeRunStatus = 'completed' | 'failed' | 'blocked';
export interface TaskWorktreeRunCommandResult {
    command: string;
    args: string[];
    cwd: string;
    ok: boolean;
    stdout: string;
    stderr: string;
    status: number | null;
    error: string | null;
    /**
     * F30: true when `runGit` stopped accumulating at `GIT_OUTPUT_LIMIT_BYTES`.
     * The recorded `stdout`/`stderr` is then a prefix, and an artifact that does
     * not say so is read as the whole output.
     */
    stdoutTruncated?: boolean;
    stderrTruncated?: boolean;
}
export interface TaskWorktreeRunArtifact {
    version: string;
    feature: string;
    action: TaskWorktreeRunAction;
    status: TaskWorktreeRunStatus;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    targetPath: string;
    branch: string | null;
    baseRef: string | null;
    planArtifactPath: string | null;
    commands: string[];
    commandResults: TaskWorktreeRunCommandResult[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorktreeRunResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    action: TaskWorktreeRunAction;
    status: TaskWorktreeRunStatus;
    targetPath: string;
    branch: string | null;
    baseRef: string | null;
    commands: string[];
    commandResults: TaskWorktreeRunCommandResult[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskFinishPlanArtifact {
    version: string;
    feature: string;
    status: TaskFinishPlanStatus;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    targetBranch: string;
    remote: string;
    commands: string[];
    decisionPrompts: TaskFinishDecisionPrompt[];
    readiness: {
        taskGraph: string;
        implementer: TaskGraphCompletionStatus | 'PENDING';
        specReview: string;
        qualityReview: string;
        controller: TaskGraphCompletionStatus | 'PENDING';
        pendingRequiredDecisions: number;
        verificationChecklistComplete: boolean;
        verificationEvidence: TaskVerificationEvidenceSession['status'];
        tddEvidence: TaskTddEvidenceSession['status'];
        debugEvidence: TaskDebugEvidenceSession['status'];
    };
    git: {
        available: boolean;
        repository: boolean;
        root: string | null;
        branch: string | null;
        head: string | null;
        dirty: boolean;
        statusEntries: TaskWorkspaceStatusEntry[];
        worktrees: TaskWorkspaceGitWorktree[];
        currentWorktree: TaskWorkspaceGitWorktree | null;
    };
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskFinishDecisionPrompt {
    id: string;
    required: boolean;
    question: string;
    recommendedOptionId: string;
    options: TaskUserDecisionOption[];
    command: string;
}
export interface TaskFinishPlanResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskFinishPlanStatus;
    targetBranch: string;
    remote: string;
    commands: string[];
    decisionPrompts: TaskFinishDecisionPrompt[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export type TaskWorkflowRouteStatus = 'ready' | 'blocked' | 'unknown';
export interface TaskWorkflowRouteRecommendation {
    priority: number;
    action: string;
    command: string | null;
    reason: string;
}
export interface TaskWorkflowRouteArtifact {
    version: string;
    feature: string;
    status: TaskWorkflowRouteStatus;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    recommendations: TaskWorkflowRouteRecommendation[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorkflowRouteResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskWorkflowRouteStatus;
    recommendations: TaskWorkflowRouteRecommendation[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskBootstrapDocumentStatus {
    path: string;
    exists: boolean;
    readiness: TaskBootstrapDocumentReadiness;
    checklistComplete: boolean | null;
    uncheckedItems: number;
}
export interface TaskBootstrapTaskGraphSnapshot {
    exists: boolean;
    path: string;
    status: string;
    taskCount: number;
    ready: number;
    dispatchable: number;
    running: number;
    completed: number;
    blocked: number;
    invalid: number;
    /** True when every blocked task is only waiting on running work, dependencies, or pending task reviews. Additive in 1.9.8. */
    waitingOnly?: boolean;
    issues: string[];
    nextInstruction: string;
}
export interface TaskBootstrapPlanSnapshot {
    exists: boolean;
    path: string;
    status: string;
    blockers: string[];
    warnings: string[];
}
export interface TaskBootstrapProjectSessionSnapshot {
    exists: boolean;
    jsonPath: string;
    reportPath: string;
    generatedAt: string | null;
    cacheStatus: string;
    cacheKey: string | null;
    activeChangeCount: number;
    queuedChangeCount: number;
    knowledgeIndexPath: string | null;
    featureCatalogPath: string | null;
    indexedDocumentCount: number;
    archivedChangeCount: number;
    recommendedCommands: string[];
    nextInstruction: string | null;
    warnings: string[];
}
export interface TaskBootstrapExecutionSnapshot {
    projectSession: TaskBootstrapProjectSessionSnapshot;
    taskGraph: TaskBootstrapTaskGraphSnapshot;
    session: {
        exists: boolean;
        path: string;
        status: TaskExecutionSession['status'] | 'missing';
        dispatchCount: number;
        activeDispatchCount: number;
        activeDispatches: Array<{
            id: string;
            taskId: string;
            status: string;
            target: TaskWorkerToolTarget;
            packetPath: string;
        }>;
        latestDispatches: Array<{
            taskId: string;
            status: string;
            summary: string | null;
        }>;
    };
    workspace: TaskBootstrapPlanSnapshot;
    worktree: TaskBootstrapPlanSnapshot;
    finish: TaskBootstrapPlanSnapshot;
    decisions: TaskUserDecisionSnapshot;
    reviews: {
        spec: string;
        quality: string;
    };
    evidence: {
        verification: TaskVerificationEvidenceSession['status'];
        verificationRecords: number;
        tdd: TaskTddEvidenceSession['status'];
        tddRecords: number;
        debug: TaskDebugEvidenceSession['status'];
        debugRecords: number;
        debugPhases: TaskDebugEvidencePhaseSnapshot[];
    };
    worker: {
        implementer: TaskGraphCompletionStatus | 'PENDING';
        specReviewer: TaskGraphCompletionStatus | 'PENDING';
        qualityReviewer: TaskGraphCompletionStatus | 'PENDING';
        controller: TaskGraphCompletionStatus | 'PENDING';
        verificationChecklistComplete: boolean;
    };
}
export interface TaskBootstrapArtifact {
    version: string;
    feature: string;
    status: TaskBootstrapStatus;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    documents: {
        proposal: TaskBootstrapDocumentStatus;
        design: TaskBootstrapDocumentStatus;
        implementationPlan: TaskBootstrapDocumentStatus;
        tasks: TaskBootstrapDocumentStatus;
        verification: TaskBootstrapDocumentStatus;
    };
    execution: TaskBootstrapExecutionSnapshot;
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskBootstrapResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskBootstrapStatus;
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskUserDecisionOption {
    id: string;
    label: string;
    description: string;
}
export interface TaskUserDecisionRecord {
    version: string;
    feature: string;
    id: string;
    status: TaskUserDecisionStatus;
    required: boolean;
    question: string;
    options: TaskUserDecisionOption[];
    recommendedOptionId: string | null;
    selectedOptionId: string | null;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
    selectedAt: string | null;
    answeredBy?: 'user' | null;
    recordPath: string;
    reportPath: string;
    nextInstruction: string;
}
export interface TaskUserDecisionSnapshot {
    exists: boolean;
    dirPath: string;
    indexPath: string;
    indexReportPath: string;
    workflowProfile: WorkflowProfileId;
    total: number;
    pendingRequired: number;
    pendingOptional: number;
    selected: number;
    skipped: number;
    decisions: Array<{
        id: string;
        status: TaskUserDecisionStatus | 'INVALID';
        required: boolean;
        question: string;
        recommendedOptionId: string | null;
        selectedOptionId: string | null;
        reportPath: string;
    }>;
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskUserDecisionIndexArtifact {
    version: string;
    feature: string;
    generatedAt: string;
    changePath: string;
    workflowProfile: WorkflowProfileId;
    total: number;
    pendingRequired: number;
    pendingOptional: number;
    selected: number;
    skipped: number;
    decisions: TaskUserDecisionSnapshot['decisions'];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskUserDecisionResult {
    changePath: string;
    projectRoot: string;
    recordPath: string;
    reportPath: string;
    decision: TaskUserDecisionRecord;
    snapshot: TaskUserDecisionSnapshot;
    nextInstruction: string;
}
export type TaskHandoffTarget = TaskWorkerToolTarget;
export interface TaskHandoffToolMapping extends Omit<TaskWorkerTargetToolMapping, 'target'> {
    target: TaskHandoffTarget;
}
export interface TaskHandoffWorkerProfile {
    taskId: string;
    taskTitle: string;
    workerRole: string;
    profile: TaskWorkerProfile;
}
export interface TaskHandoffArtifact {
    version: string;
    feature: string;
    target: TaskHandoffTarget;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    documents: Record<string, {
        path: string;
        exists: boolean;
    }>;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    artifacts: Record<string, {
        path: string;
        exists: boolean;
    }>;
    taskGraph: {
        exists: boolean;
        status: string;
        taskCount: number;
        dispatchable: number;
        running: number;
        blocked: number;
        invalid: number;
        nextInstruction: string;
    };
    workerProfiles: TaskHandoffWorkerProfile[];
    toolMapping: TaskHandoffToolMapping;
    commandSequence: string[];
    safetyRules: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskHandoffResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    target: TaskHandoffTarget;
    warnings: string[];
    nextInstruction: string;
}
export type TaskWorkerLaunchPlanStatus = 'ready' | 'blocked';
export interface TaskWorkerLaunchSelectedDispatch {
    id: string;
    taskId: string;
    taskTitle: string;
    workerRole: string;
    status: string;
    packetPath: string;
    recordPath: string;
    assignedAt: string;
    workerProfile: TaskWorkerProfile | null;
    targetToolMapping: TaskWorkerTargetToolMapping | null;
}
export interface TaskNativeAgentLaunchPlan {
    target: TaskWorkerToolTarget;
    supported: boolean;
    adapterId: string;
    agentPrimitive: string;
    dispatchMode: string;
    requiresControllerAction: boolean;
    promptTransport: string;
    resultCollection: string;
    fallbackOnly: boolean;
    mechanism: string;
    defaultPath: boolean;
    instructions: string[];
    parallelInstructions: string[];
    completionInstructions: string[];
    fallbackInstructions: string[];
    adapterPacket: TaskNativeAgentAdapterPacket;
}
export interface TaskNativeAgentAdapterPacket {
    version: string;
    schemaVersion: string;
    adapterId: string;
    target: TaskWorkerToolTarget;
    targetCapabilities: {
        capabilityTier: TaskWorkerCapabilityTier | 'unknown';
        recommendedTarget: TaskWorkerToolTarget | 'unknown';
        workerRole: string;
        canEditFiles: boolean;
        canRunCommands: boolean;
        canDispatchWorkers: boolean;
    };
    dispatchMode: string;
    agentPrimitive: string;
    taskId: string;
    taskTitle: string;
    dispatchId: string;
    packetPath: string;
    recordPath: string;
    prompt: string;
    completionCommand: string;
    resultStatusContract: TaskGraphCompletionStatus[];
    completionContract: {
        command: string;
        allowedStatuses: TaskGraphCompletionStatus[];
        requiresSummary: boolean;
        updatesDurableState: boolean;
    };
    environment: Record<string, string>;
    safetyRules: string[];
    requiredInputs: string[];
    expectedOutputs: string[];
    controllerActions: string[];
    toolMapping: TaskWorkerTargetToolMapping | null;
}
export type TaskLaunchExecutionMode = 'native-goal' | 'emulated-goal' | 'native-loop' | 'emulated-loop';
/**
 * Loop/agent-primitive plan attached to a launch when `--primitive goal|loop` is requested.
 * Produces controller instructions for the current model harness; OSpec never executes the agent.
 * Absent for the default `subagent` primitive.
 */
export interface TaskLaunchLoopPlan {
    primitive: 'goal' | 'loop';
    executionModel: 'controller-driven' | 'cli-driven';
    mode: TaskLaunchExecutionMode;
    until: string | null;
    maxIterations: number | null;
    interval: string | null;
    capability: HarnessCapability;
    cliCommandPreview: string | null;
    requiresControllerAction: boolean;
    instructions: string[];
}
export interface TaskWorkerLaunchPlanArtifact {
    version: string;
    feature: string;
    status: TaskWorkerLaunchPlanStatus;
    target: TaskWorkerToolTarget;
    dryRun: boolean;
    generatedAt: string;
    changePath: string;
    projectRoot: string;
    loopPlan?: TaskLaunchLoopPlan | null;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    taskGraph: {
        path: string;
        status: string;
        taskStatus: string;
    };
    workspace: {
        path: string;
        exists: boolean;
        status: string;
        blockers: string[];
        warnings: string[];
    };
    selectedDispatch: TaskWorkerLaunchSelectedDispatch | null;
    nativeAgent: TaskNativeAgentLaunchPlan | null;
    runtimeAdapter: RuntimeExecutionAdapterResolution | null;
    launchCommands: string[];
    launchPrompt: string;
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorkerLaunchPlanResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskWorkerLaunchPlanStatus;
    target: TaskWorkerToolTarget;
    dryRun: boolean;
    taskId: string | null;
    dispatchId: string | null;
    loopPlan: TaskLaunchLoopPlan | null;
    nativeAgent: TaskNativeAgentLaunchPlan | null;
    runtimeAdapter: RuntimeExecutionAdapterResolution | null;
    launchCommands: string[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskWorkerRunRecord {
    id: string;
    kind: 'worker' | 'review';
    feature: string;
    target: TaskWorkerToolTarget;
    command: string;
    environment: Record<string, string> | null;
    cwd: string;
    status: TaskWorkerRunStatus;
    /** F5: any integer, including negative ones; null when no code was produced. */
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    /** F5: the harness failed to run the worker, rather than the work failing. */
    infraFailure?: boolean;
    timeoutMs: number | null;
    startedAt: string;
    completedAt: string;
    taskId: string | null;
    dispatchId: string | null;
    reviewStage: TaskReviewStage | null;
    reviewDispatchId: string | null;
    launchPlanPath: string | null;
    reviewArtifactPath: string | null;
    recordPath: string;
    reportPath: string;
    stdoutPath: string;
    stderrPath: string;
    summary: string | null;
    collectedAt: string | null;
    completionStatus: TaskGraphCompletionStatus | null;
}
export interface TaskWorkerCollectResult {
    changePath: string;
    runId: string;
    taskId: string;
    recordPath: string;
    reportPath: string;
    status: TaskWorkerRunStatus;
    completionStatus: TaskGraphCompletionStatus;
    completion: TaskCompletionResult;
    nextInstruction: string;
}
export interface TaskWorkerRetryRecord {
    id: string;
    feature: string;
    taskId: string;
    createdAt: string;
    previousStatus: string;
    previousRunId: string | null;
    trigger?: TaskWorkerRetryTrigger;
    summary: string | null;
    recordPath: string;
    reportPath: string;
    repairContext?: TaskReviewRepairContext;
}
export interface TaskWorkerRetryResult {
    changePath: string;
    retryRecord: TaskWorkerRetryRecord;
    dispatch: TaskDispatchResult;
    nextInstruction: string;
}
export interface TaskWorkerRetryBatchResult {
    changePath: string;
    retries: TaskWorkerRetryResult[];
    dispatches: TaskDispatchRecord[];
    nextInstruction: string;
}
export declare class TaskGraphExecutionService {
    private fileService;
    private runtimeAdapterService;
    private reportDocumentLanguageCache;
    constructor(fileService: FileService, runtimeAdapterService?: RuntimeExecutionAdapterService);
    /**
     * Optimistic review gating lets dependents dispatch while an upstream
     * task review is still pending; the task's own review requirement and the
     * final-review gate still require every task review to be approved.
     * Strict remains the default and is unchanged for classic changes, which
     * have no loop configuration.
     */
    private readLoopReviewGating;
    getReport(changePath: string): Promise<TaskGraphExecutionReport>;
    selectConflictSafeTasks(tasks: TaskGraphExecutionTask[], options?: {
        respectParallelizable?: boolean;
    }): TaskGraphExecutionTask[];
    dispatch(changePath: string, options?: {
        taskId?: string;
        limit?: number;
    }): Promise<TaskDispatchResult>;
    private dispatchUnlocked;
    planLaunch(changePath: string, options?: {
        taskId?: string;
        target?: TaskWorkerToolTarget;
        dryRun?: boolean;
        primitive?: TaskAgentPrimitive | string;
        until?: string;
        maxIterations?: number;
        interval?: string;
    }): Promise<TaskWorkerLaunchPlanResult>;
    private planLaunchUnlocked;
    private readRuntimeHarnessCapability;
    private readRuntimeHarnessExecutionMetadata;
    /**
     * Build the loop/agent-primitive plan for a goal|loop launch. OSpec only
     * produces controller instructions; the model harness owns native dispatch.
     */
    private buildLaunchLoopPlan;
    collectWorkerRun(changePath: string, options?: {
        taskId?: string;
        runId?: string;
        status?: TaskGraphCompletionStatus;
        summary?: string;
    }): Promise<TaskWorkerCollectResult>;
    private collectWorkerRunUnlocked;
    retryWorkerRun(changePath: string, options: TaskWorkerRetryInput): Promise<TaskWorkerRetryResult>;
    retryWorkerRuns(changePath: string, options: {
        tasks: TaskWorkerRetryInput[];
    }): Promise<TaskWorkerRetryBatchResult>;
    private retryWorkerRunUnlocked;
    private captureTaskReviewRepairContext;
    private readTaskReviewRepairHistory;
    readCrossTaskRepairOwnerIds(changePath: string): Promise<string[]>;
    countTaskReviewRepairRounds(changePath: string, taskId: string): Promise<number>;
    requiresTaskReviewRepairEvidenceRefresh(changePath: string, taskId: string): Promise<boolean>;
    hasTaskReviewRepairStrategyAttempt(changePath: string, taskId: string, strategyKey: string): Promise<boolean>;
    assessRunningTaskRecovery(changePath: string, taskIds: string[], maxRuntimeMinutes: number, now?: Date): Promise<TaskRunningRecoveryAssessment[]>;
    assessTaskReviewRepairConvergence(changePath: string, taskId: string, configuredLimit: number): Promise<TaskRepairConvergenceAssessment>;
    private readFinalReviewRepairHistory;
    countFinalReviewRepairWaves(changePath: string): Promise<number>;
    hasFinalReviewRepairStrategyAttempt(changePath: string, strategyKey: string): Promise<boolean>;
    assessFinalReviewRepairConvergence(changePath: string, configuredLimit: number): Promise<TaskRepairConvergenceAssessment>;
    private assessRepairFindingProgress;
    private readRepairConvergenceReviewDispatch;
    private findHistoricalRepairReviewDispatch;
    private repairScopeSnapshotHash;
    private repairFindingsFingerprint;
    private extractFindingIds;
    complete(changePath: string, taskId: string, options?: {
        status?: TaskGraphCompletionStatus;
        summary?: string;
        usageFile?: string;
        dispatchId?: string;
        retryable?: boolean;
        /** F2: a validated structured worker report; renders the Markdown human view. */
        report?: WorkerReportDocument;
    }): Promise<TaskCompletionResult>;
    deferExternalBlocker(changePath: string, taskId: string, options: {
        reason: string;
    }): Promise<TaskBlockerEscalationRecord>;
    private completeUnlocked;
    /**
     * F2: record a review verdict from a validated JSON decision file.
     *
     * Updates the EXISTING review artifact in place rather than writing a fresh
     * one: the frontmatter carries provenance (`review_dispatch_id`, executor
     * binding) that the review gates read, and regenerating it from the JSON
     * would drop exactly the keys that make the decision trustworthy. Only
     * `decision` and `reviewed_at` are replaced; the body is rendered from the
     * JSON, and the sibling `*.findings.json` is written so the gates read
     * explicit severities instead of the Markdown fallback's `unknown`.
     */
    recordReviewDecision(changePath: string, options: {
        reviewArtifactPath: string;
        decision: ReviewDecisionDocument;
    }): Promise<{
        reviewArtifactPath: string;
        findingsPath: string;
        decision: string;
        findings: number;
        nextInstruction: string;
    }>;
    syncWorkerStatus(changePath: string): Promise<TaskWorkerStatusSyncResult>;
    private syncWorkerStatusUnlocked;
    /**
     * Goal progress documents that are fully derivable must track reality on
     * every sync: proposal.md acceptance lines tagged `[verify:<id>]` tick when
     * matching verification evidence passes, and review.md is rewritten as a
     * derived summary of the final review. Classic changes keep manual
     * ownership of both documents.
     */
    private syncDerivedProgressDocuments;
    private syncProposalAcceptanceTicks;
    private syncDerivedReviewSummary;
    review(changePath: string, options?: {
        stage?: TaskReviewStage;
        taskId?: string;
        verificationFailureFocus?: string;
    }): Promise<TaskReviewDispatchResult>;
    reviewTasks(changePath: string, options: {
        taskIds: string[];
    }): Promise<TaskReviewDispatchBatchResult>;
    reviewPlanning(changePath: string): Promise<TaskReviewDispatchResult>;
    preparePlanningRepair(changePath: string): Promise<TaskPlanningRepairResult>;
    bindPlanningRepairLoopAction(changePath: string, options: {
        actionId: string;
        actionItemId: string;
    }): Promise<TaskPlanningRepairRecord>;
    validatePlanningRepairEvidence(changePath: string): Promise<TaskLoopReadinessResult>;
    completePlanningRepair(changePath: string, options: {
        actionId: string;
        actionItemId: string;
    }): Promise<TaskPlanningRepairRecord>;
    /**
     * Post-repair planning gate without an AI re-review: when the single grouped
     * repair resolved findings that were all medium severity or lower and every
     * deterministic gate re-passes, record APPROVED_WITH_CONCERNS directly. Task
     * reviews and the final review remain the semantic safety net downstream.
     */
    acceptPlanningRepairDeterministically(changePath: string): Promise<{
        accepted: boolean;
        reason: string;
    }>;
    /**
     * A dispatched grouped repair whose completion evidence never settled leaves
     * its record in 'dispatched' with planning edits already applied. When a later
     * combined planning review approves that content, accept the repair as done:
     * otherwise a later planning cycle misreads the record as a partial edit and
     * dead-ends the Goal even though its planning was approved.
     */
    closeOutSupersededPlanningRepair(changePath: string): Promise<boolean>;
    private buildPostRepairReviewSections;
    /**
     * When a task review is re-dispatched after a NEEDS_CHANGES round, scope
     * the fresh reviewer to verifying the repaired findings plus their direct
     * regression surface instead of re-reviewing the whole task from scratch.
     * Read before prepareReviewArtifactForDispatch removes the prior findings.
     */
    private buildTaskPostRepairReviewSections;
    private buildPlanningRepairDiffSections;
    private buildVerificationFailureFocusSections;
    private truncateForPacket;
    private capturePlanningContext;
    private capturePlanningRepairWorkspaceBaseline;
    private validatePlanningRepairWorkspaceScope;
    private reviewUnlocked;
    /**
     * M-race5: releases task-graph bindings that no Loop action owns.
     *
     * `bindReviewLoopAction` and `bindPlanningRepairLoopAction` are one-shot:
     * both refuse a record already bound to a different action, and until now
     * neither had an inverse. That is correct while the binding belongs to a
     * live action and fatal when it does not -- a crash between the bindings
     * and the loop-state write leaves records naming an `actionId` that no
     * `pendingControllerAction` will ever claim, and every subsequent tick dies
     * on the guard. This is the inverse, and it is deliberately narrow: it
     * releases bindings for ONE named action and touches nothing else, so it
     * cannot be used to unbind a live one.
     *
     * The planning-repair record goes back to `ready` rather than to some
     * neutral value: `bindPlanningRepairLoopAction` only ever moves `ready ->
     * dispatched` (it returns early when already dispatched to the same action
     * and throws when completed), so `ready` is the exact state it left.
     */
    releaseLoopActionBindings(changePath: string, actionId: string): Promise<{
        reviewDispatchIds: string[];
        planningRepairReleased: boolean;
    }>;
    bindReviewLoopAction(changePath: string, options: {
        dispatchId: string;
        actionId: string;
        actionItemId: string;
        controllerSessionReportedAt: string | null;
        runtimeAdapter: RuntimeExecutionAdapterResolution;
    }): Promise<void>;
    claimReviewLoopExecutor(changePath: string, options: {
        dispatchId: string;
        actionId: string;
        actionItemId: string;
        executorId: string;
        claimedAt: string;
    }): Promise<void>;
    completeReviewLoopExecutor(changePath: string, options: {
        dispatchId: string;
        actionId: string;
        actionItemId: string;
        executorId: string;
        completedAt: string;
        succeeded: boolean;
    }): Promise<void>;
    restoreTaskReviewApprovals(changePath: string): Promise<number>;
    hasReviewLoopEvidence(changePath: string, options: {
        dispatchId: string;
        actionId: string;
        actionItemId: string;
        executorId: string;
    }): Promise<boolean>;
    private assertReviewLoopBinding;
    private updateReviewLoopProvenance;
    planReviewFeedback(changePath: string, options?: {
        stage?: TaskReviewStage;
        summary?: string;
    }): Promise<TaskReviewFeedbackPlanResult>;
    createRepairWave(changePath: string, options?: {
        repairStrategy?: TaskRepairStrategyContext;
    }): Promise<TaskRepairWaveResult>;
    private createRepairWaveUnlocked;
    recordUserDecision(changePath: string, options: {
        id?: string;
        question?: string;
        options?: TaskUserDecisionOption[];
        recommendedOptionId?: string;
        required?: boolean;
        selectOptionId?: string;
        skip?: boolean;
        summary?: string;
        answeredBy?: 'user';
    }): Promise<TaskUserDecisionResult>;
    reviewDocument(changePath: string, options?: {
        stage?: TaskDocumentReviewStage;
        force?: boolean;
    }): Promise<TaskDocumentReviewDispatchResult>;
    private runPlanningPreflightUnlocked;
    private getTaskReviewCachePaths;
    private computeTaskReviewContextHash;
    private readTaskGraphContractVersion;
    private cacheTaskReviewApproval;
    private canonicalJson;
    private computeDocumentReviewContextHash;
    private runDocumentReviewMechanicalPreflight;
    private taskReviewScopeKey;
    private planningReviewScopeKey;
    private reviewDispatchScopeKey;
    private documentReviewScopeKey;
    private getCurrentReviewDispatchIndexPath;
    private setCurrentReviewDispatch;
    private assertCurrentReviewDispatch;
    private readLoopControllerSession;
    bindVerificationLoopAction(changePath: string, options: {
        actionId: string;
        actionItemId: string;
        issuedAt: string;
        expectedCommand: string | null;
    }): Promise<TaskVerificationLoopBinding>;
    claimVerificationLoopExecutor(changePath: string, options: {
        actionId: string;
        actionItemId: string;
        executorId: string;
        claimedAt: string;
    }): Promise<void>;
    cancelVerificationLoopAction(changePath: string, options: {
        actionId: string;
        actionItemId: string;
    }): Promise<void>;
    recordVerification(changePath: string, options: {
        command?: string;
        status?: TaskVerificationEvidenceStatus;
        exitCode?: number;
        timedOut?: boolean;
        signal?: string;
        infraFailure?: boolean;
        summary?: string;
        satisfies?: string[];
        loopActionId?: string;
        loopActionItemId?: string;
        executorId?: string;
    }): Promise<TaskVerificationEvidenceResult>;
    private validateVerificationLoopProvenance;
    private recordVerificationUnlocked;
    requireVerification(changePath: string, options: {
        id: string;
        kind?: TaskVerificationRequirementKind;
        description: string;
        required?: boolean;
    }): Promise<TaskVerificationRequirementResult>;
    validateVerificationRequirements(changePath: string): Promise<TaskVerificationRequirementsStatus>;
    private validateVerificationRequirementsUnscoped;
    recordTddEvidence(changePath: string, options: {
        phase?: TaskTddEvidencePhase;
        command?: string;
        status?: TaskVerificationEvidenceStatus;
        exitCode?: number;
        timedOut?: boolean;
        signal?: string;
        infraFailure?: boolean;
        testName?: string;
        summary?: string;
    }): Promise<TaskTddEvidenceResult>;
    private recordTddEvidenceUnlocked;
    recordDebugEvidence(changePath: string, options: {
        phase?: TaskDebugEvidencePhase;
        symptom?: string;
        hypothesis?: string;
        rootCause?: string;
        command?: string;
        status?: TaskDebugEvidenceStatus;
        summary?: string;
    }): Promise<TaskDebugEvidenceResult>;
    private recordDebugEvidenceUnlocked;
    inspectWorkspace(changePath: string): Promise<TaskWorkspaceInspectionResult>;
    validateDocumentReviewEvidence(changePath: string, stage: TaskDocumentReviewStage): Promise<TaskLoopReadinessResult>;
    private validatePlanningPreflightEvidence;
    validateTaskReviewEvidence(changePath: string, taskId: string | null): Promise<TaskLoopReadinessResult>;
    validatePlanningReviewEvidence(changePath: string): Promise<TaskLoopReadinessResult>;
    /**
     * Resolves the two things both public entry points need and hands off to
     * the evidence path, which is always run in full. There is deliberately no
     * verdict cache in front of this: see the note at the top of this file.
     */
    private validateReviewEvidence;
    private validateReviewEvidenceAgainstDisk;
    readValidatedFinalReviewDecision(changePath: string): Promise<TaskReviewRunDecision>;
    readValidatedPlanningReviewDecision(changePath: string): Promise<TaskReviewRunDecision>;
    validateLatestVerificationEvidence(changePath: string): Promise<TaskLoopReadinessResult>;
    private validateLatestVerificationEvidenceUnscoped;
    validateWorkspaceEvidence(changePath: string, allowedTaskPaths?: string[]): Promise<TaskLoopReadinessResult>;
    readAuthoritativeTokenUsage(changePath: string): Promise<number>;
    readAuthoritativeUsageSnapshot(changePath: string): Promise<TaskAuthoritativeUsageSnapshot>;
    private readAuthoritativeUsageSnapshotUnlocked;
    planWorktree(changePath: string, options?: {
        branch?: string;
        targetPath?: string;
        baseRef?: string;
    }): Promise<TaskWorktreePlanResult>;
    runWorktree(changePath: string, options: {
        action: TaskWorktreeRunAction;
        branch?: string;
        targetPath?: string;
        baseRef?: string;
    }): Promise<TaskWorktreeRunResult>;
    planFinish(changePath: string, options?: {
        targetBranch?: string;
        remote?: string;
    }): Promise<TaskFinishPlanResult>;
    routeWorkflow(changePath: string): Promise<TaskWorkflowRouteResult>;
    private routeWorkflowUnlocked;
    bootstrap(changePath: string): Promise<TaskBootstrapResult>;
    private bootstrapUnlocked;
    handoff(changePath: string, options?: {
        target?: TaskHandoffTarget;
    }): Promise<TaskHandoffResult>;
    private selectDispatchableTasks;
    private withArtifactMutationRollback;
    private listArtifactFilesRecursive;
    private getSchedulingDeferralReasons;
    private selectNonConflictingBatch;
    private isTaskReviewRequired;
    private getBlockedTaskReviewInstruction;
    private getNextInstruction;
    private getSessionPath;
    private getProjectSessionBriefPath;
    private getProjectSessionBriefReportPath;
    private getWorkspaceStatusPath;
    private getWorkspaceStatusReportPath;
    private getWorktreePlanPath;
    private getWorktreePlanReportPath;
    private getWorktreeRunDir;
    private getVerificationEvidencePath;
    private getVerificationRequirementsPath;
    private getVerificationLoopActionPath;
    private getTddEvidencePath;
    private getDebugEvidencePath;
    private getFinishPlanPath;
    private getFinishPlanReportPath;
    private getWorkflowRoutePath;
    private getWorkflowRouteReportPath;
    private getBootstrapPath;
    private getBootstrapReportPath;
    private getHandoffPath;
    private getHandoffReportPath;
    private getLaunchPlanPath;
    private getLaunchPlanReportPath;
    private getReviewFeedbackPlanPath;
    private getReviewFeedbackPlanReportPath;
    private getUserDecisionDir;
    private getUserDecisionRecordPath;
    private getUserDecisionReportPath;
    private getUserDecisionIndexPath;
    private getUserDecisionIndexReportPath;
    private readUserDecisionRecord;
    private readUserDecisionSnapshot;
    private writeUserDecisionIndex;
    private normalizeUserDecisionRecord;
    private normalizeUserDecisionOptions;
    private getUserDecisionNextInstruction;
    private readVerificationEvidence;
    private readVerificationRequirements;
    private normalizeVerificationRequirementIds;
    private normalizeVerificationRequirementKind;
    /**
     * The whole-tree snapshot every passing verification record is measured
     * against. Every record in one artifact is measured against the *same*
     * tree at the *same* commit, so it is derived once and handed to each
     * record rather than re-derived per record -- which is what made the
     * freshness check grow quadratically as evidence accumulated.
     */
    private buildVerificationFreshnessContext;
    /**
     * FIX-4: the observation behind `VerificationFreshnessContext.confirm`.
     *
     * Re-captures the same target files and reads HEAD -- unmemoised, and
     * therefore immune to the external commit that the per-scope memo cannot
     * see. A throw is a refusal, not a rethrow: a target that became
     * unreadable between the capture and here is a changed tree, which is the
     * answer this is being asked for.
     *
     * FIX-4 + FIX-5 MERGE: `archive --check` runs the whole readiness gate --
     * and therefore this -- inside `FileService.withReadOverlay`, which serves
     * the bytes a reconciliation WOULD have written for the task graph, the
     * checklist and the progress projection. This method sees none of them, and
     * that is correct rather than accidental:
     *
     *  - `captureTargetSnapshots` reads through raw `fs`, not `fileService`, so
     *    it hashes the bytes on disk;
     *  - HEAD comes from a git child process, which no `FileService` overlay
     *    can reach.
     *
     * Both halves of the comparison therefore describe the same tree: the
     * record's `targetSnapshotHash` was taken from real disk when the evidence
     * was stamped, so confirming it against hypothetical unwritten bytes would
     * compare two different worlds and refuse for a reason that is not true.
     * The three overlaid artifacts are archive bookkeeping, never a task's
     * target files -- and if one ever were, this is still the reading that
     * keeps the verdict honest.
     *
     * This rests on HOW the two reads are implemented, not on any signature, so
     * a refactor to `this.fileService` would undo it silently. Pinned by
     * `tests/commands/archive-check-head-overlay-interaction.test.mjs`, which
     * overlays a target file with bytes that exist nowhere and asserts the
     * snapshot hash does not move, with a control proving the overlay was live.
     */
    private confirmVerificationFreshnessContext;
    /**
     * The half of the freshness test that is a pure function of the captured
     * context. FIX-4 moved the HEAD comparison out of here and next to the
     * confirmation, because HEAD is a refusal condition and therefore has to be
     * observed at the moment of the verdict rather than at capture time.
     */
    private isPassingVerificationRecordFreshAgainst;
    /**
     * Builds the context at most once, and only if something actually needs
     * it: a record that fails a cheap structural check never reaches the walk,
     * while a caller with many records walks the tree once for all of them.
     *
     * FIX-4 corrects what this comment used to claim. It said "a per-sweep
     * memo, not a cache: it recomputes on the next sweep, so it has nothing to
     * go stale". The first half is true and the second was not: within one
     * sweep the whole-tree snapshot is captured once and every record is
     * measured against it, so a target file rewritten after the capture is
     * invisible to the rest of the sweep. `main` re-derived per record, so the
     * window closed per record; here it lasted the whole sweep.
     *
     * What this memo remembers: the target-file set and their snapshot, as of
     * the first record that needed them.
     * What makes that memory false: any write to a target file before the
     * sweep ends.
     * What catches it: `context.confirm()`, which
     * `isPassingVerificationRecordFresh` awaits before returning any PASS, and
     * which also supplies the HEAD the PASS is judged against so that HEAD is
     * never remembered at all.
     */
    private memoiseVerificationFreshnessContext;
    private isPassingVerificationRecordFresh;
    private isVerificationEvidenceRecord;
    private isVerificationEvidenceStatus;
    private readTddEvidence;
    private isTddEvidenceRecord;
    private isTddEvidencePhase;
    private isDebugEvidencePhase;
    private readDebugEvidence;
    private isDebugEvidenceSessionStatus;
    private isDebugEvidenceRecord;
    private normalizeDebugEvidenceRecord;
    private isDebugEvidenceStatus;
    private readReviewWorkerStatus;
    reconcileGoalProgress(changePath: string): Promise<GoalProgressReconciliationResult>;
    /**
     * The same reconciliation, computed and reported but never written.
     *
     * FIX-2 / D4: making `archive --check` and `execute status` read-only
     * removed their only `reconcileGoalProgress` call, and with it the only
     * producer of the `Goal progress cannot be reconciled ...` diagnostic --
     * so `archive --check` started passing goals that the real `ospec archive`
     * refuses. The reconciliation splits cleanly into a pure computation and
     * three writes at the end, so the diagnostic comes back by running the
     * identical computation with `persist: false`: same inputs, same `issues`,
     * same `status`, byte-for-byte the same verdict as `--repair` would reach,
     * without the task-graph mutation lease and without touching disk.
     *
     * `graphChanged` / `tasksChanged` / `projectionChanged` are still reported,
     * so a caller can say whether a repair is actually PENDING rather than
     * printing an unconditional note that carries no signal (D16).
     */
    inspectGoalProgress(changePath: string): Promise<GoalProgressReconciliationResult>;
    private reconcileGoalProgressUnlocked;
    private syncTaskReviewStateFromArtifactsUnlocked;
    private parsePrimaryTaskChecklistId;
    private findDuplicateStrings;
    private hashProgressProjectionContent;
    private readReviewDecision;
    private deriveReviewFeedbackAction;
    private selectNextDocumentReviewStage;
    private getDocumentReviewTarget;
    private getDocumentReviewArtifactPath;
    private getTaskCombinedReviewArtifactRelativePath;
    private getTaskWorkerReportRelativePath;
    private getTaskWorkerReportProjectRelativePath;
    private prepareTaskReviewDispatch;
    private buildDefaultTaskReviewArtifact;
    private buildDefaultFinalReviewArtifact;
    private buildDefaultPlanningReviewArtifact;
    private deriveImplementerWorkerStatus;
    private deriveControllerWorkerStatus;
    private deriveWorkerStatusDocumentStatus;
    private isVerificationChecklistComplete;
    private writeTaskReviewPackage;
    private renderReviewPackageDiff;
    private getUpstreamRegressionTasks;
    private taskTransitivelyDependsOn;
    private canCarryTaskReviewForwardAfterDownstreamWork;
    private renderGitStatusEntries;
    /**
     * Ingests usage sidecars incrementally.
     *
     * This runs on every dispatch and every sync, and it used to re-read every
     * historical review-dispatch record on each pass -- a cost that grew for
     * the whole life of the Goal to re-derive an answer that could not have
     * changed. What it actually needs to know is which sidecars have already
     * been consumed, so that is recorded (`id -> ingested sidecar mtime`) and
     * an already-consumed dispatch whose sidecar has not moved costs one stat
     * instead of a full record parse.
     *
     * The dispatch-record filename is the dispatch id, so the id is known
     * before the record is opened; the record only has to be read for
     * dispatches that are genuinely being ingested.
     *
     * Invalidation: a sidecar whose mtime differs from the watermark is
     * re-ingested. A missing or corrupt watermark falls back to the execution
     * metrics artifact, which is the durable record of what was ingested, so a
     * lost watermark costs one slow pass and never a lost or duplicated metric.
     */
    private ingestReviewUsageSidecars;
    private getUsageIngestWatermarkPath;
    private readUsageIngestWatermark;
    private writeUsageIngestWatermark;
    private readExecutionUsageFile;
    private captureDocumentationSnapshots;
    private normalizeTargetFiles;
    private captureTargetSnapshots;
    private captureTargetDirectoryTree;
    private isPathWithin;
    /**
     * Planning-review snapshots must only change when the planning *semantics*
     * change. Execution bookkeeping — task status, review decisions, checklist
     * ticks, governance-generated repair tasks — mutates tasks.md and
     * task-graph.json on every loop step; hashing it raw invalidates the
     * planning approval mid-goal and re-dispatches full planning reviews.
     */
    private capturePlanningSemanticSnapshots;
    private hashPlanningSemanticContent;
    private projectPlanningGraphSemantics;
    private hashTargetSnapshots;
    private targetSnapshotsMatchDispatch;
    private prepareReviewArtifactForDispatch;
    private captureDocumentationEvidence;
    private hashMeaningfulDocumentation;
    private recordExecutionMetric;
    /**
     * Runs `operation` with one resolved git HEAD. Callers that validate many
     * pieces of evidence in a row -- a controller tick, `ospec execute status`,
     * the archive gate -- should wrap the whole sweep so HEAD is resolved once
     * for all of them instead of once each.
     *
     * Nested calls join the outer scope, so wrapping is always safe.
     */
    withValidationScope<T>(operation: () => Promise<T>): Promise<T>;
    /**
     * The single read primitive every validation input goes through.
     *
     * Returns null for a path that is absent -- including one whose parent is
     * not a directory, which `readFile` reports as ENOTDIR -- so a caller can
     * tell "missing" from "unreadable" without a separate stat. A directory
     * still surfaces as the EISDIR the caller would have got anyway.
     */
    private readValidationInput;
    /**
     * Matches `FileService.readJSON`'s failure message exactly, so routing a
     * validation input through these helpers does not change the reason string
     * a refusal carries.
     */
    private parseValidationInputJSON;
    private readValidationInputText;
    /**
     * One `git rev-parse HEAD` per operation instead of one per validated
     * task. Any git command that is not provably read-only drops the memo, so
     * a commit or checkout *this process* makes mid-operation is never read
     * through.
     *
     * D6: the pending promise is memoised before the await, so a fan-out of
     * concurrent validations shares one spawn instead of one each.
     *
     * FIX-4: `use` is mandatory, and it carries the entire safety argument.
     *
     * What the memo remembers: the commit HEAD pointed at when the enclosing
     * `withValidationScope` first asked for it.
     * What makes that memory false: any commit, checkout, reset, merge or
     * branch switch performed by ANOTHER process while the scope is open --
     * `forgetMemoisedGitHeads` only sees this process's own git subcommands.
     *
     * A false memory is harmless for a verdict that merely records or reports
     * HEAD, and is a stale PASS for any verdict that REFUSES when HEAD moves.
     * The second class passes 'refusal-condition' and pays a fresh spawn.
     *
     * The parameter is required rather than defaulted because that is the
     * failure this phase actually had: FIX-1 hand-patched one refusing caller
     * (the final review) and wrote that it was "the ONE verdict that refuses
     * on a moved HEAD". It was not -- `isPassingVerificationRecordFreshAgainst`
     * refuses on it too and went on reading the memo. A default would have let
     * the next such caller repeat it silently; now the compiler asks.
     */
    private readValidationGitHead;
    private forgetMemoisedGitHeads;
    private withTaskGraphMutationLease;
    private confirmTaskGraphLockStillStale;
    private readTaskGraphLockOwner;
    private refreshTaskGraphLockIfOwned;
    private isProcessAlive;
    private removeTaskGraphLockIfOwned;
    private removeCorruptTaskGraphLockIfUnchanged;
    private readSession;
    private isSessionStatus;
    private isDispatchRecord;
    private writeBlockerEscalation;
    private readLatestWorkerRetryRecord;
    readLatestBlockerEscalation(changePath: string, taskId?: string): Promise<TaskBlockerEscalationRecord | null>;
    private isBlockerEscalationRecord;
    private writeLocalizedReportFile;
    private localizeReportMarkdown;
    private resolveReportDocumentLanguage;
    private readReportLanguageFromSkillrc;
    private readReportLanguageFromAssetManifest;
    private readReportLanguageFromProjectGuide;
    private normalizeReportDocumentLanguage;
    private detectReportDocumentLanguageFromText;
    private localizeZhReportMarkdown;
    private localizeZhReportLine;
    private zhReportLabel;
    private localizeZhReportValue;
    private localizeZhBoundarySentence;
    private readWorkflowExecutionPolicy;
    private findProjectRoot;
    private findProjectRootForOptionalSession;
    private inferProjectRootFromChangePath;
    private isGoalWorkspaceControlPath;
    private syncFeatureStateFromBootstrap;
    private readFeatureName;
    private readBootstrapDocumentStatus;
    private readBootstrapPlanSnapshot;
    private readBootstrapProjectSessionSnapshot;
    private buildHandoffDocumentSnapshot;
    private buildHandoffArtifactSnapshot;
    private deriveBootstrapDecision;
    private toProjectRelativeChangePath;
    private buildWorktreeCleanupContext;
    private formatGitCommand;
    private runGitForArtifact;
    private runGit;
    /**
     * F30: `runGit` bounds what it accumulates at `GIT_OUTPUT_LIMIT_BYTES` and
     * reports it, but `readGitOutput` used to drop both flags on the floor, so
     * every one of its ~28 call sites read a partial answer as a complete one.
     * On the reads that can legitimately pass 8 MB -- `git status
     * --untracked-files=all` and `git worktree list` -- that is fail-open on a
     * safety gate: `|| ''` turns a truncated status into an EMPTY status, and
     * an empty status means "clean".
     *
     * So there are now two readers. This one hands the flag to the caller,
     * because only the caller knows what a partial answer means for the
     * decision it is about to make; `readGitOutput` below is the fail-closed
     * default for reads whose output is bounded by construction (a sha, a
     * branch name, a repository root).
     */
    private readGitOutputWithTruncation;
    /**
     * A truncated read is not a shorter answer, it is no answer: it collapses
     * to `null` exactly like a failed command, so every existing `|| null`
     * fallback takes its "not available" branch instead of trusting a prefix.
     * Callers whose output can legitimately be huge must use
     * `readGitOutputWithTruncation` and decide explicitly -- for those, `null`
     * and `''` are indistinguishable at the call site and `''` reads as clean.
     */
    private readGitOutput;
    /**
     * One sentence for every safety gate that refuses because git told it less
     * than the whole truth. Naming the command and the limit is the difference
     * between an actionable refusal and a mystery.
     */
    private gitTruncationReason;
    private parseGitStatusEntries;
    private parseGitStatusV2ZPaths;
    private workspaceEntryPaths;
    private workspaceEntryMatchesPaths;
    private normalizeProjectOwnedPath;
    private readGoalOwnedWorkspacePaths;
    private readGoalGeneratedWorkspacePaths;
    private readCurrentCliVersion;
    private readUpdateProvenanceSnapshot;
    private isUpdateManagedWorkspaceEntry;
    private parseGitWorktrees;
    private normalizeGitBranchName;
    private findCurrentWorktree;
    private normalizeFilesystemPath;
    private getWorkspaceNextInstruction;
    private getWorktreePlanNextInstruction;
    private getWorktreeRunNextInstruction;
    private getFinishPlanNextInstruction;
    private buildWorkflowRouteRecommendations;
    private normalizeWorktreeBranch;
    private resolveRecommendedWorktreePath;
    private buildWorktreePlanCommands;
    private buildWorktreeLifecycle;
    private buildFinishPlanCommands;
    private buildFinishDecisionPrompts;
    /**
     * Quotes a value into one of the ~15 command strings this service emits for
     * a human or an agent to PASTE INTO A SHELL.
     *
     * This used to be a local double-quoted implementation that escaped only
     * `"`, so `$VAR`, `` `cmd` `` and `$(cmd)` still expanded on paste and a
     * trailing backslash escaped the closing quote. It now delegates to the one
     * shared rule in `utils/ShellQuote`, which is also what `SessionCommand`
     * uses -- see that module's header for the guarantee and why cmd.exe is out
     * of scope. Kept as a thin private method so the call sites read unchanged.
     */
    private quoteShellArg;
    private normalizeHandoffTarget;
    private normalizeWorkerToolTarget;
    private buildHandoffToolMapping;
    private buildHandoffCommandSequence;
    private buildHandoffSafetyRules;
    private buildNativeAgentLaunchPlan;
    private buildNativeAgentAdapterPacket;
    private getNativeAgentAdapterId;
    private getNativeAgentPrimitive;
    private getNativeAgentDispatchMode;
    private buildWorkerLaunchPrompt;
    private writeWorkerRunRecord;
    private findWorkerRunRecord;
    private buildWorkerRunReport;
    private buildWorkerRetryReport;
    /**
     * Every task in the report, once.
     *
     * The six lists are NOT a partition, and the overlap is guaranteed rather
     * than exotic: `TERMINAL_TASK_STATUSES` is `{DONE, DONE_WITH_CONCERNS}` and
     * drives `completedTasks`, while `concernTasks` is built from
     * `DONE_WITH_CONCERNS` alone -- so every concern-status task is in both, and
     * the plain concatenation this used to be yielded it twice on any graph
     * containing one.
     *
     * Most of the 16 call sites were unharmed, because they immediately build a
     * `new Map` keyed by id or call `.find`, and the duplicate entries are the
     * same object reference (both filters run over the same `tasks` array).
     * Two were not:
     *
     *  - the derived review summary maps over this list to write
     *    "- <id>: <decision>" lines, so a DONE_WITH_CONCERNS task was listed
     *    twice in the "Task Review Decisions" section of the document
     *    `ospec execute sync` generates;
     *  - `getUpstreamRegressionTasks` ends in a `.filter` over it, so a
     *    concern-status upstream task was returned twice and flowed into both
     *    `writeTaskReviewPackage({ regressionTasks })` and
     *    `computeTaskReviewContextHash(..., regressionTasks.map(t => t.id), ...)`
     *    -- a duplicated id changes the hash, so two runs over the same graph
     *    could disagree about whether the review context had changed.
     *
     * Deduped by id rather than by reference: callers already assume ids are
     * unique within a graph, and keying on the thing they key on means a report
     * assembled some other way cannot reintroduce the defect.
     */
    private flattenReportTasks;
    private normalizeReviewRunDecision;
    private getHandoffNextInstruction;
    private updateRawTaskStatus;
    private resetRawTaskReview;
    private normalizeCompletionStatus;
    private normalizeVerificationEvidenceStatus;
    /**
     * F5: independent validation of the four outcome fields at the record
     * boundary. Track A's batch validator checks the *shape* of a reported
     * result and then passes the object through; this checks the things a shape
     * check cannot see, because these values are read back and rendered.
     *
     * Validated here, independently of any caller:
     * - `exitCode`: when supplied it must be a finite integer. Negative is
     *   allowed on purpose -- that is the F5 unclamping -- but `NaN`, `Infinity`
     *   and `2.5` are rejected rather than silently nulled, because a `null`
     *   already means "no code was ever produced" and quietly turning a
     *   malformed number into that claim is a lie the reader cannot detect.
     * - `signal`: when supplied it must look like a signal name. A shape check
     *   sees "a string"; a newline inside it forges extra rows in the evidence
     *   markdown, where every outcome field is one list line.
     *
     * `timedOut` and `infraFailure` are compared with `=== true`, which no
     * malformed value can defeat, so they are coerced rather than validated --
     * stated plainly so the difference is not mistaken for an oversight.
     */
    private normalizeOutcomeFields;
    private normalizeTddEvidencePhase;
    private normalizeTddEvidenceStatus;
    private validateTddEvidenceTransition;
    private normalizeDebugEvidenceStatus;
    private normalizeDebugEvidencePhase;
    private deriveDebugEvidencePhase;
    private validateDebugEvidencePhase;
    private deriveVerificationEvidenceStatus;
    private deriveTddEvidenceStatus;
    private deriveDebugEvidenceStatus;
    private buildDebugEvidencePhaseSnapshots;
    private getTddEvidenceNextInstruction;
    private getDebugEvidenceNextInstruction;
    private deriveGraphStatus;
    private deriveSessionStatus;
    private buildDefaultWorkerStatusDocument;
    private updateWorkerStatusBody;
    private updateWorkerStatusSummaryStatusLines;
    private updateWorkerStatusChecklistLine;
    private buildWorkerStatusSyncSummary;
    private escapeRegex;
    private toFileSafeTimestamp;
    private toFileSafeId;
    private toChangeRelativePath;
    /** Token-lean pointer block: workers read the referenced brief only when they need project context. */
    private buildProjectSessionBriefLines;
    private buildTaskReviewRepairContextLines;
    private buildDispatchPacket;
    private getVerificationScopeWarnings;
    private buildBlockerEscalationReport;
    private buildReviewDispatchPacket;
    private extractReviewFindings;
    private getReviewFindingsRelativePath;
    /**
     * The findings contract applied to bytes that are already in hand.
     *
     * Split out of `readReviewFindings` so the evidence validation judges the
     * bytes it already read rather than re-reading the path. A verdict derived
     * from a second, later read of the same file is a verdict about a file that
     * may have changed in between.
     */
    private parseReviewFindingsDocument;
    private readReviewFindings;
    private renderReviewFinding;
    private createReviewFeedbackDecisionGateIfNeeded;
    private getReviewFeedbackDecisionGateReason;
    private buildReviewFeedbackRecommendedActions;
    private buildReviewFeedbackNextInstruction;
    private buildReviewFeedbackPlanReport;
    private buildRepairWavePacket;
    private buildDocumentReviewArtifact;
    /**
     * F5: render the three non-exit-code outcome fields, and only when one of
     * them carries information. A line per record per field would cost output
     * on every evidence read for the common case where all three are false.
     */
    private outcomeReportLines;
    private buildVerificationEvidenceReport;
    private buildTddEvidenceReport;
    private buildDebugEvidenceReport;
    private buildWorkspaceStatusReport;
    private buildWorktreePlanReport;
    private buildWorktreeRunReport;
    private buildUserDecisionReport;
    private buildUserDecisionIndexReport;
    private buildFinishPlanReport;
    private buildWorkflowRouteReport;
    private buildWorkerLaunchPlanReport;
    private buildHandoffReport;
    private buildBootstrapReport;
    private formatBootstrapDocumentStatus;
}
export declare function createTaskGraphExecutionService(fileService: FileService): TaskGraphExecutionService;
