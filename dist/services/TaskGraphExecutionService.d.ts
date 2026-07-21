import { AgentModelProfileId } from '../core/types';
import { FileService } from './FileService';
import { HarnessCapability, TaskAgentPrimitive } from './CapabilityProbeService';
import { RuntimeExecutionAdapterResolution, RuntimeExecutionAdapterService } from './RuntimeExecutionAdapterService';
export type TaskWorkerCapabilityTier = 'mechanical' | 'standard' | 'strong-reasoning' | 'review';
export type TaskWorkerToolTarget = 'codex' | 'gpt' | 'claude' | 'gemini' | 'opencode' | 'cursor' | 'copilot' | 'shell' | 'generic';
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
    checkpointEvidence: TaskCheckpointEvidenceSnapshot;
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
    recordPath: string;
    packetPath: string;
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
    exitCode: number | null;
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
    exitCode: number | null;
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
        checkpointEvidence: TaskCheckpointEvidenceSnapshot['status'];
    };
    checkpointEvidence: TaskCheckpointEvidenceSnapshot;
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
    checkpointEvidence: TaskCheckpointEvidenceSnapshot;
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
    featureIndexPath: string | null;
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
        checkpoint: TaskCheckpointEvidenceSnapshot;
    };
    worker: {
        implementer: TaskGraphCompletionStatus | 'PENDING';
        specReviewer: TaskGraphCompletionStatus | 'PENDING';
        qualityReviewer: TaskGraphCompletionStatus | 'PENDING';
        controller: TaskGraphCompletionStatus | 'PENDING';
        verificationChecklistComplete: boolean;
    };
}
export interface TaskCheckpointEvidenceStepSnapshot {
    step: string;
    gateStatus: string;
    evidenceStatus: string;
    screenshots: number;
    traces: number;
    visualDiffs: number;
    routes: number;
    flows: number;
    assertions: number;
    consoleEvents: number;
    networkEvents: number;
    accessibility: number;
    missing: string[];
}
export interface TaskCheckpointEvidenceSnapshot {
    active: boolean;
    status: 'not_active' | 'missing' | 'complete' | 'incomplete' | 'failed';
    gatePath: string;
    resultPath: string;
    summaryPath: string;
    activeSteps: string[];
    gateStatus: string;
    evidenceStatus: string;
    screenshots: number;
    traces: number;
    visualDiffs: number;
    routes: number;
    flows: number;
    assertions: number;
    consoleEvents: number;
    networkEvents: number;
    accessibility: number;
    missing: string[];
    nextActions: string[];
    steps: TaskCheckpointEvidenceStepSnapshot[];
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
    checkpointEvidence: TaskCheckpointEvidenceSnapshot;
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
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
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
export interface TaskWorkerRunResult {
    changePath: string;
    recordPath: string;
    reportPath: string;
    stdoutPath: string;
    stderrPath: string;
    record: TaskWorkerRunRecord;
    nextInstruction: string;
}
export type TaskOrchestrationRunStatus = 'completed' | 'blocked' | 'partial' | 'dry_run';
export interface TaskOrchestrationRunTaskResult {
    taskId: string;
    taskTitle: string;
    dispatchId: string;
    target: TaskWorkerToolTarget;
    command: string;
    environment: Record<string, string>;
    packetPath: string;
    recordPath: string;
    runId: string | null;
    runRecordPath: string | null;
    runReportPath: string | null;
    exitCode: number | null;
    timedOut: boolean;
    completionStatus: TaskGraphCompletionStatus | null;
    collected: boolean;
    error: string | null;
}
export interface TaskOrchestrationRunRound {
    round: number;
    dispatchesCreated: number;
    activeDispatches: number;
    tasks: TaskOrchestrationRunTaskResult[];
}
export interface TaskOrchestrationRunArtifact {
    version: string;
    id: string;
    feature: string;
    status: TaskOrchestrationRunStatus;
    startedAt: string;
    completedAt: string;
    changePath: string;
    projectRoot: string;
    target: TaskWorkerToolTarget | null;
    limit: number | null;
    maxRounds: number;
    timeoutMs: number | null;
    dryRun: boolean;
    collect: boolean;
    continueOnFailure: boolean;
    commandTemplate: string | null;
    commandSource: 'option' | 'config' | 'missing';
    workspaceStatus: TaskWorkspaceReadiness | 'missing';
    rounds: TaskOrchestrationRunRound[];
    failedTasks: TaskOrchestrationFailedTask[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskOrchestrationFailedTask {
    taskId: string;
    taskTitle: string;
    dispatchId: string;
    runId: string | null;
    exitCode: number | null;
    timedOut: boolean;
    completionStatus: TaskGraphCompletionStatus | null;
    collected: boolean;
    error: string | null;
    retryCommand: string;
}
export interface TaskOrchestrationRunResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskOrchestrationRunStatus;
    rounds: TaskOrchestrationRunRound[];
    failedTasks: TaskOrchestrationFailedTask[];
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
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
export interface TaskReviewRunResult {
    changePath: string;
    review: TaskReviewDispatchResult;
    run: TaskWorkerRunResult;
    workerStatusPath: string;
    decision: TaskReviewRunDecision | null;
    nextInstruction: string;
}
export declare class TaskGraphExecutionService {
    private fileService;
    private runtimeAdapterService;
    private reportDocumentLanguageCache;
    constructor(fileService: FileService, runtimeAdapterService?: RuntimeExecutionAdapterService);
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
    launchAndRun(changePath: string, options: {
        taskId?: string;
        target?: TaskWorkerToolTarget;
        dryRun?: boolean;
        command: string;
        timeoutMs?: number;
    }): Promise<TaskWorkerRunResult>;
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
    orchestrate(changePath: string, options?: {
        command?: string;
        target?: TaskWorkerToolTarget;
        limit?: number;
        maxRounds?: number;
        timeoutMs?: number;
        dryRun?: boolean;
        collect?: boolean;
        continueOnFailure?: boolean;
    }): Promise<TaskOrchestrationRunResult>;
    runReview(changePath: string, options: {
        stage?: TaskReviewStage;
        taskId?: string;
        command: string;
        decision?: TaskReviewRunDecision;
        summary?: string;
        timeoutMs?: number;
        usageFile?: string;
    }): Promise<TaskReviewRunResult>;
    complete(changePath: string, taskId: string, options?: {
        status?: TaskGraphCompletionStatus;
        summary?: string;
        usageFile?: string;
        dispatchId?: string;
        retryable?: boolean;
    }): Promise<TaskCompletionResult>;
    deferExternalBlocker(changePath: string, taskId: string, options: {
        reason: string;
    }): Promise<TaskBlockerEscalationRecord>;
    private completeUnlocked;
    syncWorkerStatus(changePath: string): Promise<TaskWorkerStatusSyncResult>;
    private syncWorkerStatusUnlocked;
    review(changePath: string, options?: {
        stage?: TaskReviewStage;
        taskId?: string;
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
    private capturePlanningContext;
    private capturePlanningRepairWorkspaceBaseline;
    private validatePlanningRepairWorkspaceScope;
    private reviewUnlocked;
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
    recordTddEvidence(changePath: string, options: {
        phase?: TaskTddEvidencePhase;
        command?: string;
        status?: TaskVerificationEvidenceStatus;
        exitCode?: number;
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
    private validateReviewEvidence;
    readValidatedFinalReviewDecision(changePath: string): Promise<TaskReviewRunDecision>;
    readValidatedPlanningReviewDecision(changePath: string): Promise<TaskReviewRunDecision>;
    validateLatestVerificationEvidence(changePath: string): Promise<TaskLoopReadinessResult>;
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
    bootstrap(changePath: string): Promise<TaskBootstrapResult>;
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
    private readCheckpointEvidenceSnapshot;
    private readActiveCheckpointSteps;
    private buildCheckpointEvidenceNextActions;
    private getSessionPath;
    private getProjectSessionBriefPath;
    private getProjectSessionBriefReportPath;
    private getWorkspaceStatusPath;
    private getWorkspaceStatusReportPath;
    private getWorktreePlanPath;
    private getWorktreePlanReportPath;
    private getWorktreeRunDir;
    private getOrchestrationRunDir;
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
    private validateStructuredFindingIds;
    private normalizeUserDecisionOptions;
    private getUserDecisionNextInstruction;
    private readVerificationEvidence;
    private readVerificationRequirements;
    private normalizeVerificationRequirementIds;
    private normalizeVerificationRequirementKind;
    private isPassingVerificationRecordFresh;
    private isVerificationEvidenceSessionStatus;
    private isVerificationEvidenceRecord;
    private isVerificationEvidenceStatus;
    private readTddEvidence;
    private isTddEvidenceSessionStatus;
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
    private reconcileGoalProgressUnlocked;
    private syncTaskReviewStateFromArtifactsUnlocked;
    private parsePrimaryTaskChecklistId;
    private findDuplicateStrings;
    private hashProgressProjectionContent;
    private readReviewDecision;
    private selectNextReviewStage;
    private selectNextReviewFeedbackStage;
    private deriveReviewFeedbackAction;
    private selectNextDocumentReviewStage;
    private getDocumentReviewTarget;
    private getDocumentReviewArtifactPath;
    private getTaskReviewArtifactFile;
    private getTaskReviewArtifactRelativePath;
    private getTaskCombinedReviewArtifactRelativePath;
    private getTaskWorkerReportRelativePath;
    private getTaskWorkerReportProjectRelativePath;
    private getTaskReviewArtifactPath;
    private prepareTaskReviewDispatch;
    private buildDefaultTaskReviewArtifact;
    private buildDefaultFinalReviewArtifact;
    private buildDefaultPlanningReviewArtifact;
    private deriveImplementerWorkerStatus;
    private deriveControllerWorkerStatus;
    private deriveWorkerStatusDocumentStatus;
    private isVerificationChecklistComplete;
    private writeTaskReviewPackage;
    private getUpstreamRegressionTasks;
    private taskTransitivelyDependsOn;
    private canCarryTaskReviewForwardAfterDownstreamWork;
    private renderGitStatusEntries;
    private ingestReviewUsageSidecars;
    private readExecutionUsageFile;
    private captureDocumentationSnapshots;
    private normalizeTargetFiles;
    private captureTargetSnapshots;
    private captureTargetDirectoryTree;
    private isPathWithin;
    private hashTargetSnapshots;
    private targetSnapshotsMatchDispatch;
    private prepareReviewArtifactForDispatch;
    private captureDocumentationEvidence;
    private hashMeaningfulDocumentation;
    private recordExecutionMetric;
    private withTaskGraphMutationLease;
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
    private readGitOutput;
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
    private quoteShellArg;
    private quoteHarnessTemplateArg;
    private normalizeHandoffTarget;
    private normalizeWorkerToolTarget;
    private normalizePositiveInteger;
    private resolveHarnessCommandTemplate;
    private normalizeOptionalWorkerTarget;
    private readHarnessCommandForTarget;
    private ensureWorkspaceReadyForOrchestration;
    private readActiveDispatches;
    private selectParallelSafeActiveDispatches;
    private readOrchestrationFinalReadiness;
    private prepareOrchestrationTaskRun;
    private buildOrchestrationFailedTasks;
    private isOrchestrationTaskFailure;
    private buildHarnessEnvironment;
    private renderHarnessCommandTemplate;
    private getOrchestrationNextInstruction;
    private buildOrchestrationRunReport;
    private buildHandoffToolMapping;
    private buildHandoffCommandSequence;
    private buildHandoffSafetyRules;
    private buildNativeAgentLaunchPlan;
    private buildNativeAgentAdapterPacket;
    private getNativeAgentAdapterId;
    private getNativeAgentPrimitive;
    private getNativeAgentDispatchMode;
    private buildWorkerLaunchPrompt;
    private runWorkerCommand;
    private normalizeTimeoutMs;
    private runShellCommand;
    private writeWorkerRunRecord;
    private findWorkerRunRecord;
    private buildWorkerRunReport;
    private buildWorkerRetryReport;
    private flattenReportTasks;
    private applyReviewRunDecision;
    private normalizeReviewRunDecision;
    private getHandoffNextInstruction;
    private updateRawTaskStatus;
    private resetRawTaskReview;
    private normalizeCompletionStatus;
    private normalizeVerificationEvidenceStatus;
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
    private buildProjectSessionBriefLines;
    private buildTaskReviewRepairContextLines;
    private buildDispatchPacket;
    private getVerificationScopeWarnings;
    private buildBlockerEscalationReport;
    private buildReviewDispatchPacket;
    private extractReviewFindings;
    private getReviewFindingsRelativePath;
    private readReviewFindings;
    private renderReviewFinding;
    private createReviewFeedbackDecisionGateIfNeeded;
    private getReviewFeedbackDecisionGateReason;
    private buildReviewFeedbackRecommendedActions;
    private buildReviewFeedbackNextInstruction;
    private getTaskReviewRunDecisionNextInstruction;
    private buildReviewFeedbackPlanReport;
    private buildRepairWavePacket;
    private buildDocumentReviewArtifact;
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
    private buildCheckpointEvidenceReportLines;
    private buildWorkerLaunchPlanReport;
    private buildHandoffReport;
    private buildBootstrapReport;
    private formatBootstrapDocumentStatus;
}
export declare function createTaskGraphExecutionService(fileService: FileService): TaskGraphExecutionService;
