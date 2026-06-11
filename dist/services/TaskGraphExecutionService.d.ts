import { FileService } from './FileService';
export type TaskWorkerCapabilityTier = 'standard' | 'strong-reasoning' | 'specialist-review';
export type TaskWorkerToolTarget = 'codex' | 'gpt' | 'claude' | 'gemini' | 'opencode' | 'shell' | 'generic';
export type TaskWorkerRunStatus = 'completed' | 'failed';
export type TaskReviewRunDecision = 'APPROVED' | 'APPROVED_WITH_CONCERNS' | 'NEEDS_CHANGES' | 'BLOCKED' | 'PENDING';
export interface TaskReviewState {
    spec: TaskReviewRunDecision;
    quality: TaskReviewRunDecision;
    specArtifactPath: string | null;
    qualityArtifactPath: string | null;
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
}
export interface TaskGraphExecutionTask {
    id: string;
    title: string;
    status: string;
    dependsOn: string[];
    parallelizable: boolean;
    conflictsWith: string[];
    targetFiles: string[];
    verificationCommands: string[];
    expectedResult: string;
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
    graphStatus: string;
    taskCount: number;
    readyTasks: TaskGraphExecutionTask[];
    dispatchableTasks: TaskGraphExecutionTask[];
    runningTasks: TaskGraphExecutionTask[];
    completedTasks: TaskGraphExecutionTask[];
    concernTasks: TaskGraphExecutionTask[];
    blockedTasks: TaskGraphBlockedTask[];
    invalidTasks: TaskGraphBlockedTask[];
    issues: string[];
    nextInstruction: string;
}
export type TaskGraphCompletionStatus = 'DONE' | 'DONE_WITH_CONCERNS' | 'NEEDS_CONTEXT' | 'BLOCKED';
export type TaskReviewStage = 'spec' | 'quality';
export type TaskReviewFeedbackAction = 'accept' | 'revise' | 'clarify' | 'blocked';
export type TaskDocumentReviewStage = 'design' | 'plan';
export type TaskDocumentReviewRole = 'design_reviewer' | 'implementation_plan_reviewer';
export type TaskVerificationEvidenceStatus = 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
export type TaskTddEvidencePhase = 'red' | 'green' | 'refactor';
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
    nextInstruction: string;
}
export interface TaskBlockerEscalationRecord {
    id: string;
    taskId: string;
    taskTitle: string;
    status: 'NEEDS_CONTEXT' | 'BLOCKED';
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
    nextInstruction: string;
}
export interface TaskReviewDispatchRecord {
    id: string;
    stage: TaskReviewStage;
    taskId?: string | null;
    taskTitle?: string | null;
    reviewerRole: 'spec_compliance_reviewer' | 'code_quality_reviewer';
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    status: 'DISPATCHED';
    assignedAt: string;
    packetPath: string;
    recordPath: string;
    reviewArtifactPath: string;
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
export interface TaskReviewFeedbackPlan {
    version: string;
    feature: string;
    stage: TaskReviewStage;
    reviewerRole: 'spec_compliance_reviewer' | 'code_quality_reviewer';
    decision: string;
    action: TaskReviewFeedbackAction;
    createdAt: string;
    reviewArtifactPath: string;
    artifactPath: string;
    reportPath: string;
    summary: string | null;
    findings: string[];
    recommendedActions: string[];
    nextInstruction: string;
}
export interface TaskReviewFeedbackPlanResult {
    changePath: string;
    artifactPath: string;
    reportPath: string;
    stage: TaskReviewStage;
    decision: string;
    action: TaskReviewFeedbackAction;
    nextInstruction: string;
}
export interface TaskDocumentReviewDispatchRecord {
    id: string;
    stage: TaskDocumentReviewStage;
    reviewerRole: TaskDocumentReviewRole;
    projectSession?: TaskBootstrapProjectSessionSnapshot;
    status: 'DISPATCHED';
    assignedAt: string;
    packetPath: string;
    recordPath: string;
    documentPath: string;
    reviewArtifactPath: string;
    documentReadiness: TaskBootstrapDocumentReadiness;
}
export interface TaskDocumentReviewDispatchResult {
    changePath: string;
    dispatch: TaskDocumentReviewDispatchRecord;
    projectSession: TaskBootstrapProjectSessionSnapshot;
    warnings: string[];
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
export interface TaskDebugEvidenceSession {
    version: string;
    feature: string;
    status: 'pending' | 'confirmed' | 'fixed' | 'blocked' | 'skipped';
    updatedAt: string;
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
export type TaskBootstrapStatus = 'needs_proposal' | 'needs_design' | 'needs_plan' | 'needs_task_graph' | 'needs_workspace_check' | 'ready_to_dispatch' | 'ready_to_launch' | 'needs_worker_completion' | 'needs_review' | 'needs_verification' | 'ready_to_finish' | 'blocked' | 'unknown';
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
        worktrees: TaskWorkspaceGitWorktree[];
        currentWorktree: TaskWorkspaceGitWorktree | null;
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
    readiness: {
        taskGraph: string;
        implementer: TaskGraphCompletionStatus | 'PENDING';
        specReview: string;
        qualityReview: string;
        controller: TaskGraphCompletionStatus | 'PENDING';
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
export interface TaskFinishPlanResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskFinishPlanStatus;
    targetBranch: string;
    remote: string;
    commands: string[];
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
    nativeAgent: TaskNativeAgentLaunchPlan | null;
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
    blockers: string[];
    warnings: string[];
    nextInstruction: string;
}
export interface TaskOrchestrationRunResult {
    changePath: string;
    projectRoot: string;
    artifactPath: string;
    reportPath: string;
    status: TaskOrchestrationRunStatus;
    rounds: TaskOrchestrationRunRound[];
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
    summary: string | null;
    recordPath: string;
    reportPath: string;
}
export interface TaskWorkerRetryResult {
    changePath: string;
    retryRecord: TaskWorkerRetryRecord;
    dispatch: TaskDispatchResult;
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
    constructor(fileService: FileService);
    getReport(changePath: string): Promise<TaskGraphExecutionReport>;
    dispatch(changePath: string, options?: {
        taskId?: string;
        limit?: number;
    }): Promise<TaskDispatchResult>;
    planLaunch(changePath: string, options?: {
        taskId?: string;
        target?: TaskWorkerToolTarget;
        dryRun?: boolean;
    }): Promise<TaskWorkerLaunchPlanResult>;
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
    retryWorkerRun(changePath: string, options: {
        taskId: string;
        runId?: string;
        summary?: string;
        force?: boolean;
    }): Promise<TaskWorkerRetryResult>;
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
    }): Promise<TaskReviewRunResult>;
    complete(changePath: string, taskId: string, options?: {
        status?: TaskGraphCompletionStatus;
        summary?: string;
    }): Promise<TaskCompletionResult>;
    syncWorkerStatus(changePath: string): Promise<TaskWorkerStatusSyncResult>;
    review(changePath: string, options?: {
        stage?: TaskReviewStage;
        taskId?: string;
    }): Promise<TaskReviewDispatchResult>;
    planReviewFeedback(changePath: string, options?: {
        stage?: TaskReviewStage;
        summary?: string;
    }): Promise<TaskReviewFeedbackPlanResult>;
    reviewDocument(changePath: string, options?: {
        stage?: TaskDocumentReviewStage;
    }): Promise<TaskDocumentReviewDispatchResult>;
    recordVerification(changePath: string, options: {
        command?: string;
        status?: TaskVerificationEvidenceStatus;
        exitCode?: number;
        summary?: string;
    }): Promise<TaskVerificationEvidenceResult>;
    recordTddEvidence(changePath: string, options: {
        phase?: TaskTddEvidencePhase;
        command?: string;
        status?: TaskVerificationEvidenceStatus;
        exitCode?: number;
        testName?: string;
        summary?: string;
    }): Promise<TaskTddEvidenceResult>;
    recordDebugEvidence(changePath: string, options: {
        symptom?: string;
        hypothesis?: string;
        rootCause?: string;
        command?: string;
        status?: TaskDebugEvidenceStatus;
        summary?: string;
    }): Promise<TaskDebugEvidenceResult>;
    inspectWorkspace(changePath: string): Promise<TaskWorkspaceInspectionResult>;
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
    bootstrap(changePath: string): Promise<TaskBootstrapResult>;
    handoff(changePath: string, options?: {
        target?: TaskHandoffTarget;
    }): Promise<TaskHandoffResult>;
    private selectDispatchableTasks;
    private selectNonConflictingBatch;
    private getFirstRequiredTaskReviewStage;
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
    private getOrchestrationRunDir;
    private getVerificationEvidencePath;
    private getTddEvidencePath;
    private getDebugEvidencePath;
    private getFinishPlanPath;
    private getFinishPlanReportPath;
    private getBootstrapPath;
    private getBootstrapReportPath;
    private getHandoffPath;
    private getHandoffReportPath;
    private getLaunchPlanPath;
    private getLaunchPlanReportPath;
    private getReviewFeedbackPlanPath;
    private getReviewFeedbackPlanReportPath;
    private readVerificationEvidence;
    private isVerificationEvidenceSessionStatus;
    private isVerificationEvidenceRecord;
    private isVerificationEvidenceStatus;
    private readTddEvidence;
    private isTddEvidenceSessionStatus;
    private isTddEvidenceRecord;
    private isTddEvidencePhase;
    private readDebugEvidence;
    private isDebugEvidenceSessionStatus;
    private isDebugEvidenceRecord;
    private isDebugEvidenceStatus;
    private readReviewWorkerStatus;
    private syncTaskReviewStateFromArtifacts;
    private readReviewDecision;
    private selectNextReviewStage;
    private selectNextReviewFeedbackStage;
    private deriveReviewFeedbackAction;
    private selectNextDocumentReviewStage;
    private getDocumentReviewTarget;
    private getDocumentReviewArtifactPath;
    private getTaskReviewArtifactFile;
    private getTaskReviewArtifactRelativePath;
    private getTaskReviewArtifactPath;
    private prepareTaskReviewDispatch;
    private buildDefaultTaskReviewArtifact;
    private deriveImplementerWorkerStatus;
    private deriveControllerWorkerStatus;
    private deriveWorkerStatusDocumentStatus;
    private isVerificationChecklistComplete;
    private readSession;
    private isSessionStatus;
    private isDispatchRecord;
    private writeBlockerEscalation;
    private readLatestBlockerEscalation;
    private isBlockerEscalationRecord;
    private findProjectRoot;
    private findProjectRootForOptionalSession;
    private inferProjectRootFromChangePath;
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
    private parseGitWorktrees;
    private normalizeGitBranchName;
    private findCurrentWorktree;
    private normalizeFilesystemPath;
    private getWorkspaceNextInstruction;
    private getWorktreePlanNextInstruction;
    private getWorktreeRunNextInstruction;
    private getFinishPlanNextInstruction;
    private normalizeWorktreeBranch;
    private resolveRecommendedWorktreePath;
    private buildWorktreePlanCommands;
    private buildFinishPlanCommands;
    private quoteShellArg;
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
    private buildHarnessEnvironment;
    private renderHarnessCommandTemplate;
    private getOrchestrationNextInstruction;
    private buildOrchestrationRunReport;
    private buildHandoffToolMapping;
    private buildHandoffCommandSequence;
    private buildHandoffSafetyRules;
    private buildNativeAgentLaunchPlan;
    private buildWorkerLaunchCommands;
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
    private normalizeDebugEvidenceStatus;
    private deriveVerificationEvidenceStatus;
    private deriveTddEvidenceStatus;
    private deriveDebugEvidenceStatus;
    private getTddEvidenceNextInstruction;
    private getDebugEvidenceNextInstruction;
    private deriveGraphStatus;
    private deriveSessionStatus;
    private buildDefaultWorkerStatusDocument;
    private updateWorkerStatusBody;
    private updateWorkerStatusChecklistLine;
    private buildWorkerStatusSyncSummary;
    private escapeRegex;
    private toFileSafeTimestamp;
    private toFileSafeId;
    private toChangeRelativePath;
    private buildProjectSessionBriefLines;
    private buildDispatchPacket;
    private buildBlockerEscalationReport;
    private buildReviewDispatchPacket;
    private extractReviewFindings;
    private buildReviewFeedbackRecommendedActions;
    private buildReviewFeedbackNextInstruction;
    private getTaskReviewRunDecisionNextInstruction;
    private buildReviewFeedbackPlanReport;
    private buildDocumentReviewArtifact;
    private buildDocumentReviewDispatchPacket;
    private buildVerificationEvidenceReport;
    private buildTddEvidenceReport;
    private buildDebugEvidenceReport;
    private buildWorkspaceStatusReport;
    private buildWorktreePlanReport;
    private buildWorktreeRunReport;
    private buildFinishPlanReport;
    private buildWorkerLaunchPlanReport;
    private buildHandoffReport;
    private buildBootstrapReport;
    private formatBootstrapDocumentStatus;
}
export declare function createTaskGraphExecutionService(fileService: FileService): TaskGraphExecutionService;
