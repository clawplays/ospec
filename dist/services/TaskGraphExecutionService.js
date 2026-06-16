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
exports.TaskGraphExecutionService = void 0;
exports.createTaskGraphExecutionService = createTaskGraphExecutionService;
const path = __importStar(require("path"));
const childProcess = require("child_process");
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const EXECUTION_SESSION_FILE = 'execution-session.json';
const VERIFICATION_EVIDENCE_FILE = 'verification-evidence.json';
const TDD_EVIDENCE_FILE = 'tdd-evidence.json';
const DEBUG_EVIDENCE_FILE = 'debug-evidence.json';
const WORKSPACE_STATUS_FILE = 'workspace-status.json';
const WORKSPACE_STATUS_REPORT_FILE = 'workspace-status.md';
const WORKTREE_PLAN_FILE = 'worktree-plan.json';
const WORKTREE_PLAN_REPORT_FILE = 'worktree-plan.md';
const WORKTREE_RUNS_DIR = 'worktree-runs';
const FINISH_PLAN_FILE = 'finish-plan.json';
const FINISH_PLAN_REPORT_FILE = 'finish-plan.md';
const WORKFLOW_ROUTE_FILE = 'workflow-route.json';
const WORKFLOW_ROUTE_REPORT_FILE = 'workflow-route.md';
const BOOTSTRAP_FILE = 'bootstrap.json';
const BOOTSTRAP_REPORT_FILE = 'bootstrap.md';
const HANDOFF_FILE = 'handoff.json';
const HANDOFF_REPORT_FILE = 'handoff.md';
const LAUNCH_PLAN_FILE = 'launch-plan.json';
const LAUNCH_PLAN_REPORT_FILE = 'launch-plan.md';
const WORKER_RUNS_DIR = 'worker-runs';
const REVIEW_RUNS_DIR = 'review-runs';
const ORCHESTRATION_RUNS_DIR = 'orchestration-runs';
const RETRIES_DIR = 'retries';
const DECISIONS_DIR = 'decisions';
const DECISIONS_INDEX_FILE = 'index.json';
const DECISIONS_INDEX_REPORT_FILE = 'index.md';
const TASK_REVIEWS_DIR = 'tasks';
const REVIEW_FEEDBACK_PLAN_FILE = 'review-feedback-plan.json';
const REVIEW_FEEDBACK_PLAN_REPORT_FILE = 'review-feedback-plan.md';
const DISPATCHES_DIR = 'dispatches';
const REVIEW_DISPATCHES_DIR = 'review-dispatches';
const DOCUMENT_REVIEW_DISPATCHES_DIR = 'document-review-dispatches';
const DESIGN_DOCUMENT_REVIEW_FILE = 'design-review.md';
const IMPLEMENTATION_PLAN_DOCUMENT_REVIEW_FILE = 'implementation-plan-review.md';
const VERIFICATION_EVIDENCE_DIR = 'verification-evidence';
const TDD_EVIDENCE_DIR = 'tdd-evidence';
const DEBUG_EVIDENCE_DIR = 'debug-evidence';
const BLOCKERS_DIR = 'blockers';
const MANAGED_WORKER_STATUS_START = '<!-- ospec-execution-sync:start -->';
const MANAGED_WORKER_STATUS_END = '<!-- ospec-execution-sync:end -->';
const TERMINAL_TASK_STATUSES = new Set(['DONE', 'DONE_WITH_CONCERNS']);
const ACTIVE_TASK_STATUSES = new Set(['IN_PROGRESS']);
const BLOCKING_TASK_STATUSES = new Set(['NEEDS_CONTEXT', 'BLOCKED']);
const KNOWN_TASK_STATUSES = new Set([
    'DONE',
    'DONE_WITH_CONCERNS',
    'IN_PROGRESS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
]);
const APPROVED_REVIEW_DECISIONS = new Set(['APPROVED', 'APPROVED_WITH_CONCERNS']);
const DEFAULT_COMMAND_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_ORCHESTRATION_MAX_ROUNDS = 10;
const MAX_CAPTURED_COMMAND_OUTPUT_BYTES = 10 * 1024 * 1024;
function normalizeStatus(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function stringArray(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' && item.trim().length > 0).map(item => item.trim())
        : [];
}
function normalizeReviewDecisionValue(value) {
    const normalized = normalizeStatus(value);
    if (normalized === 'APPROVED'
        || normalized === 'APPROVED_WITH_CONCERNS'
        || normalized === 'NEEDS_CHANGES'
        || normalized === 'BLOCKED'
        || normalized === 'PENDING') {
        return normalized;
    }
    return 'PENDING';
}
function normalizeTaskReview(rawReview) {
    if (!rawReview || typeof rawReview !== 'object' || Array.isArray(rawReview)) {
        return null;
    }
    return {
        spec: normalizeReviewDecisionValue(rawReview.spec),
        quality: normalizeReviewDecisionValue(rawReview.quality),
        specArtifactPath: typeof rawReview.spec_artifact === 'string' && rawReview.spec_artifact.trim().length > 0
            ? rawReview.spec_artifact.trim()
            : null,
        qualityArtifactPath: typeof rawReview.quality_artifact === 'string' && rawReview.quality_artifact.trim().length > 0
            ? rawReview.quality_artifact.trim()
            : null,
    };
}
function buildWorkerTargetToolMapping(target) {
    const mappings = {
        codex: {
            target,
            readContext: 'Use repo file reads and search to inspect proposal.md, design.md, implementation-plan.md, tasks.md, bootstrap.md, and the dispatch packet before spawning an agent.',
            editFiles: 'Spawn a worker agent for scoped edits; keep the worker write scope limited to the dispatch packet target files unless the packet evidence proves the scope is wrong.',
            runCommands: 'Let the worker run only the verification commands required for the task or change, then record evidence with ospec execute tdd/debug/verify as appropriate.',
            trackPlan: 'Use the active task graph and visible plan tracking; keep OSpec artifacts synchronized with ospec execute sync after manual artifact edits.',
            dispatchWorkers: 'Default to Codex native multi-agent dispatch: call spawn_agent for each parallel-safe packet, wait_agent for results, then close_agent. If multi-agent support is unavailable, use the fallback CLI command runner only after recording that limitation.',
            recordCompletion: 'Record each worker outcome with ospec execute complete <task-id> and one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
        },
        gpt: {
            target,
            readContext: 'Use ChatGPT/Codex harness file reads and search to inspect proposal.md, design.md, implementation-plan.md, tasks.md, bootstrap.md, and the dispatch packet before spawning an agent.',
            editFiles: 'Spawn a native worker agent when the harness exposes agent tools; keep edits scoped to the dispatch packet target files unless evidence proves the scope is wrong.',
            runCommands: 'Let the worker run only task-required verification commands and report evidence back to the controller.',
            trackPlan: 'Use the active OSpec task graph as durable state even if the harness has its own plan UI.',
            dispatchWorkers: 'Default to the current GPT-family harness native agent tool. In Codex-compatible sessions this means spawn_agent, wait_agent, and close_agent. Use CLI fallback only when no native agent tool exists.',
            recordCompletion: 'Record worker outcomes with ospec execute complete <task-id> and one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
        },
        claude: {
            target,
            readContext: 'Read the same OSpec change files and generated packets before using any edit or task tool.',
            editFiles: 'Use the available file edit tool with narrow diffs and keep packet target files as the default scope.',
            runCommands: 'Use shell commands only for explicit verification or inspection, then record OSpec evidence artifacts.',
            trackPlan: 'Use the local plan/task tracking tool if present, but keep artifacts/agents/task-graph.json as the durable source of truth.',
            dispatchWorkers: 'Default to Claude Code Task dispatch with general-purpose subagents. Dispatch one Task per safe packet and keep independent Tasks parallel when the harness supports it. Use CLI fallback only if Task/subagent dispatch is unavailable.',
            recordCompletion: 'Update review/evidence artifacts and run ospec execute complete or ospec execute sync after each worker or reviewer result.',
        },
        gemini: {
            target,
            readContext: 'Read OSpec change files and packet contents before invoking Gemini CLI subagents.',
            editFiles: 'Use Gemini native subagents for implementation work; keep target files scoped to the packet.',
            runCommands: 'Let the subagent run task verification through Gemini CLI tools and report exact command results.',
            trackPlan: 'Keep Gemini task tracking secondary to artifacts/agents/task-graph.json and worker-status.md.',
            dispatchWorkers: 'Default to Gemini CLI native subagents via @generalist with the filled worker prompt. Request multiple independent @generalist tasks together for parallel dispatch. Use CLI fallback only when @ subagents are unavailable.',
            recordCompletion: 'Record each @generalist result with ospec execute complete, using NEEDS_CONTEXT or BLOCKED when the subagent escalates.',
        },
        opencode: {
            target,
            readContext: 'Read OSpec change files and packet contents before using OpenCode native agents.',
            editFiles: 'Use OpenCode native @mention agent dispatch for scoped worker edits; keep packet target files as the default write set.',
            runCommands: 'Let the OpenCode agent run only required verification and return evidence.',
            trackPlan: 'Keep OpenCode task state secondary to OSpec artifacts.',
            dispatchWorkers: 'Default to OpenCode native @mention subagent dispatch. Dispatch independent packets in parallel when safe. Use CLI fallback only when the OpenCode agent mechanism is unavailable.',
            recordCompletion: 'Record each native agent result with ospec execute complete and sync worker status.',
        },
        cursor: {
            target,
            readContext: 'Load the OSpec change files, using-ospec hook artifact, and dispatch packet into Cursor Agent context before editing.',
            editFiles: 'Use Cursor Agent or task/chat handoff for scoped edits; keep packet target files as the default write set.',
            runCommands: 'Run only packet verification commands through the Cursor-controlled terminal or record why they could not run.',
            trackPlan: 'Keep Cursor plan/chat state secondary to artifacts/agents/task-graph.json and worker-status.md.',
            dispatchWorkers: 'Default to Cursor-native agent/task handoff when available. Use one worker context per dispatch packet and use CLI fallback only when Cursor cannot run a separate agent context.',
            recordCompletion: 'Record Cursor worker results with ospec execute complete, and use NEEDS_CONTEXT or BLOCKED when the agent needs a user or environment decision.',
        },
        copilot: {
            target,
            readContext: 'Load the dispatch packet and core OSpec change artifacts into GitHub Copilot CLI or Copilot coding-agent context before editing.',
            editFiles: 'Use Copilot coding-agent/task context for scoped edits; keep packet target files as the default write set.',
            runCommands: 'Run packet verification commands only when the Copilot harness exposes an approved terminal or CI handoff.',
            trackPlan: 'Keep Copilot task state secondary to OSpec artifacts and record every accepted result back into OSpec.',
            dispatchWorkers: 'Default to Copilot-native task/agent handoff when available. Use CLI fallback only when the current Copilot surface lacks a native task mechanism.',
            recordCompletion: 'Record Copilot results with ospec execute complete and keep review/verification evidence aligned.',
        },
        shell: {
            target,
            readContext: 'Open the listed OSpec files and generated packet manually before changing source files.',
            editFiles: 'Edit only the files listed in the packet unless you update the task graph or record a concern.',
            runCommands: 'Run the listed verification commands yourself; OSpec evidence commands record results after commands have already run.',
            trackPlan: 'Use artifacts/agents/task-graph.json, worker-status.md, and verification.md as the manual progress ledger.',
            dispatchWorkers: 'Shell has no native subagent API. Use this target only as the fallback path after confirming the current AI harness cannot dispatch native agents.',
            recordCompletion: 'Use ospec execute complete, review, tdd, debug, verify, and sync to record outcomes.',
        },
        generic: {
            target,
            readContext: 'Read all core change documents and generated agent artifacts before implementation or review work.',
            editFiles: 'Keep edits scoped to the task packet and record deviations as concerns.',
            runCommands: 'Run required verification outside OSpec, then record the result as evidence.',
            trackPlan: 'Treat OSpec artifacts as the durable state layer even when another tool has its own local plan.',
            dispatchWorkers: 'Default to the current harness native Task/subagent/agent mechanism if present; only fall back to CLI command execution when no native agent mechanism is available.',
            recordCompletion: 'Record every task, review, verification, TDD, or debug result back into OSpec artifacts.',
        },
    };
    return mappings[target];
}
function buildWorkerProfile(task) {
    const role = task.workerRole.trim() || 'implementer';
    const roleKey = role.toLowerCase();
    const searchableText = [
        roleKey,
        task.title,
        ...task.targetFiles,
        task.expectedResult,
    ].join(' ').toLowerCase();
    if (roleKey === 'design_reviewer' || roleKey === 'implementation_plan_reviewer') {
        const recommendedTarget = 'generic';
        return {
            role,
            recommendedTarget,
            capabilityTier: 'specialist-review',
            summary: roleKey === 'design_reviewer'
                ? 'Architecture and requirement reviewer before implementation planning.'
                : 'Execution-plan reviewer before task graph dispatch.',
            rationale: [
                'Document review work depends on cross-file reasoning and should stay independent from implementation.',
                'The worker must review and update review artifacts, not implement source changes.',
            ],
            requiredBehavior: [
                'Read proposal.md and the reviewed document before deciding.',
                'Record concrete findings and the final decision in the matching review artifact.',
                'Do not dispatch implementation workers or edit project source files from this review packet.',
            ],
            targetToolMapping: buildWorkerTargetToolMapping(recommendedTarget),
        };
    }
    if (roleKey.includes('reviewer')) {
        const recommendedTarget = 'generic';
        return {
            role,
            recommendedTarget,
            capabilityTier: 'specialist-review',
            summary: 'Independent reviewer for implementation correctness and quality gates.',
            rationale: [
                'Review work should be independent from the implementer to catch requirement and code-quality drift.',
                'The worker must produce evidence-backed findings instead of making hidden fixes.',
            ],
            requiredBehavior: [
                'Read core change docs, task graph, worker status, and recent dispatch records.',
                'Update the requested review artifact with findings and a clear decision.',
                'Do not change implementation files unless a separate implementation task is dispatched.',
            ],
            targetToolMapping: buildWorkerTargetToolMapping(recommendedTarget),
        };
    }
    const docsOnly = task.targetFiles.length > 0
        && task.targetFiles.every(filePath => /\.(md|mdx|txt)$/i.test(filePath));
    const complexitySignals = [
        !task.parallelizable,
        task.dependsOn.length > 1,
        task.conflictsWith.length > 0,
        task.targetFiles.length >= 4,
        task.verificationCommands.length >= 2,
        /\b(architecture|migration|security|auth|database|schema|state|controller|protocol|release|archive|parallel|concurrency|plugin|api|breaking)\b/.test(searchableText),
    ];
    const strongReasoning = complexitySignals.some(Boolean);
    const recommendedTarget = docsOnly ? 'generic' : 'codex';
    return {
        role,
        recommendedTarget,
        capabilityTier: strongReasoning ? 'strong-reasoning' : 'standard',
        summary: strongReasoning
            ? 'Implementation worker with stronger reasoning for cross-cutting or risky task boundaries.'
            : 'Implementation worker for scoped, low-conflict task execution.',
        rationale: [
            docsOnly
                ? 'Target files are documentation-only, so a generic document-capable worker is sufficient.'
                : 'Target files include implementation or configuration surfaces that benefit from a coding agent.',
            strongReasoning
                ? 'The task has dependency, conflict, breadth, or domain-risk signals that require extra reasoning before editing.'
                : 'The task has a narrow scope and limited coordination risk.',
        ],
        requiredBehavior: [
            'Read proposal.md, design.md, implementation-plan.md, tasks.md, and task-graph.json before editing.',
            'Keep edits scoped to target files unless the packet evidence proves the scope is wrong.',
            'Run the listed verification commands or record why they could not be run before completion.',
            'Self-review the implementation before returning status; use DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED when the result is not clean.',
        ],
        targetToolMapping: buildWorkerTargetToolMapping(recommendedTarget),
    };
}
function normalizeTask(rawTask, index) {
    const id = typeof rawTask?.id === 'string' && rawTask.id.trim().length > 0
        ? rawTask.id.trim()
        : `tasks[${index}]`;
    const normalizedTask = {
        id,
        title: typeof rawTask?.title === 'string' && rawTask.title.trim().length > 0 ? rawTask.title.trim() : id,
        status: normalizeStatus(rawTask?.status) || 'PENDING',
        dependsOn: stringArray(rawTask?.depends_on),
        parallelizable: rawTask?.parallelizable === true,
        conflictsWith: stringArray(rawTask?.conflicts_with),
        targetFiles: stringArray(rawTask?.target_files),
        verificationCommands: stringArray(rawTask?.verification_commands),
        expectedResult: typeof rawTask?.expected_result === 'string' ? rawTask.expected_result.trim() : '',
        workerRole: typeof rawTask?.worker_role === 'string' && rawTask.worker_role.trim().length > 0
            ? rawTask.worker_role.trim()
            : 'implementer',
        review: normalizeTaskReview(rawTask?.review),
    };
    return {
        ...normalizedTask,
        workerProfile: buildWorkerProfile(normalizedTask),
    };
}
function tasksConflict(left, right) {
    if (left.id === right.id) {
        return false;
    }
    if (left.conflictsWith.includes(right.id) || right.conflictsWith.includes(left.id)) {
        return true;
    }
    const leftTargets = left.targetFiles.map(normalizeTaskPath).filter(Boolean);
    const rightTargets = right.targetFiles.map(normalizeTaskPath).filter(Boolean);
    if (leftTargets.some(leftPath => rightTargets.some(rightPath => taskPathsOverlap(leftPath, rightPath)))) {
        return true;
    }
    if (leftTargets.some(leftPath => rightTargets.some(rightPath => taskPathsShareModule(leftPath, rightPath)))) {
        return true;
    }
    const leftConflicts = left.conflictsWith.map(normalizeTaskPath).filter(Boolean);
    const rightConflicts = right.conflictsWith.map(normalizeTaskPath).filter(Boolean);
    if (leftConflicts.some(conflict => rightTargets.some(target => taskPathsOverlap(conflict, target)))) {
        return true;
    }
    return rightConflicts.some(conflict => leftTargets.some(target => taskPathsOverlap(conflict, target)));
}
function normalizeTaskPath(filePath) {
    return path.normalize(String(filePath || '').trim())
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/\/+$/, '')
        .toLowerCase();
}
function taskPathsOverlap(leftPath, rightPath) {
    if (!leftPath || !rightPath) {
        return false;
    }
    return leftPath === rightPath
        || leftPath.startsWith(`${rightPath}/`)
        || rightPath.startsWith(`${leftPath}/`);
}
function taskPathsShareModule(leftPath, rightPath) {
    const leftKey = taskPathModuleKey(leftPath);
    const rightKey = taskPathModuleKey(rightPath);
    return Boolean(leftKey && rightKey && leftKey === rightKey);
}
function taskPathModuleKey(filePath) {
    const normalized = normalizeTaskPath(filePath);
    if (!normalized || normalized.endsWith('/')) {
        return null;
    }
    const extension = path.posix.extname(normalized);
    if (!extension) {
        return null;
    }
    const parent = path.posix.dirname(normalized);
    const baseName = path.posix.basename(normalized, extension)
        .replace(/\.(test|spec|stories?|d)$/u, '')
        .replace(/[-_.](test|spec|stories?)$/u, '');
    if (!parent || parent === '.' || !baseName) {
        return null;
    }
    const normalizedParent = parent
        .replace(/^(src|dist)\//u, '')
        .replace(/^(tests?|__tests__)\//u, '');
    return `${normalizedParent}/${baseName}`;
}
class TaskGraphExecutionService {
    constructor(fileService) {
        this.fileService = fileService;
        this.reportDocumentLanguageCache = new Map();
    }
    async getReport(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath))) {
            throw new Error(`Task graph not found at ${graphPath}`);
        }
        const graph = await this.fileService.readJSON(graphPath);
        const tasks = Array.isArray(graph.tasks)
            ? graph.tasks.map((task, index) => normalizeTask(task, index))
            : [];
        const taskById = new Map(tasks.map(task => [task.id, task]));
        const issues = [];
        const invalidTasks = [];
        const blockedTasks = [];
        const runningTasks = tasks.filter(task => ACTIVE_TASK_STATUSES.has(task.status));
        const completedTasks = tasks.filter(task => TERMINAL_TASK_STATUSES.has(task.status));
        const concernTasks = tasks.filter(task => task.status === 'DONE_WITH_CONCERNS');
        const readyTasks = [];
        if (typeof graph.feature !== 'string' || graph.feature.trim().length === 0) {
            issues.push('task graph feature must be a non-empty string');
        }
        if (typeof graph.status !== 'string' || graph.status.trim().length === 0) {
            issues.push('task graph status must be a non-empty string');
        }
        if (!Array.isArray(graph.tasks) || tasks.length === 0) {
            issues.push('task graph tasks must contain at least one task');
        }
        for (const task of tasks) {
            const reasons = [];
            if (!KNOWN_TASK_STATUSES.has(task.status)) {
                reasons.push(`invalid_status:${task.status || '(missing)'}`);
            }
            if (task.targetFiles.length === 0) {
                reasons.push('missing_target_files');
            }
            if (task.verificationCommands.length === 0) {
                reasons.push('missing_verification_commands');
            }
            if (!task.expectedResult || task.expectedResult.toUpperCase() === 'TBD') {
                reasons.push('missing_expected_result');
            }
            for (const dependencyId of task.dependsOn) {
                const dependency = taskById.get(dependencyId);
                if (!dependency) {
                    reasons.push(`unknown_dependency:${dependencyId}`);
                    continue;
                }
                if (!TERMINAL_TASK_STATUSES.has(dependency.status)) {
                    reasons.push(`waiting_for:${dependencyId}`);
                    continue;
                }
                const dependencyReviewStage = this.getFirstRequiredTaskReviewStage(dependency);
                if (dependencyReviewStage) {
                    reasons.push(`waiting_for_task_${dependencyReviewStage}_review:${dependencyId}`);
                }
            }
            for (const runningTask of runningTasks) {
                if (tasksConflict(task, runningTask)) {
                    reasons.push(`conflicts_with_running:${runningTask.id}`);
                }
            }
            if (TERMINAL_TASK_STATUSES.has(task.status)) {
                const taskReviewStage = this.getFirstRequiredTaskReviewStage(task);
                if (taskReviewStage) {
                    reasons.push(`waiting_for_task_${taskReviewStage}_review:${task.id}`);
                }
            }
            if (reasons.some(reason => reason.startsWith('invalid_status:') || reason.startsWith('unknown_dependency:') || reason.startsWith('missing_'))) {
                invalidTasks.push({ task, reasons });
                continue;
            }
            if (task.status === 'PENDING' && reasons.length === 0) {
                readyTasks.push(task);
                continue;
            }
            if ((task.status === 'PENDING' && reasons.length > 0) || BLOCKING_TASK_STATUSES.has(task.status)) {
                blockedTasks.push({
                    task,
                    reasons: BLOCKING_TASK_STATUSES.has(task.status) ? [`status:${task.status}`, ...reasons] : reasons,
                });
            }
            if (TERMINAL_TASK_STATUSES.has(task.status) && reasons.length > 0) {
                blockedTasks.push({ task, reasons });
            }
        }
        const feature = typeof graph.feature === 'string' && graph.feature.trim().length > 0 ? graph.feature.trim() : path.basename(resolvedChangePath);
        const decisions = await this.readUserDecisionSnapshot(resolvedChangePath, feature);
        const checkpointEvidence = await this.readCheckpointEvidenceSnapshot(resolvedChangePath);
        const dispatchableTasks = decisions.pendingRequired > 0 || decisions.blockers.length > 0
            ? []
            : this.selectDispatchableTasks(readyTasks, runningTasks);
        return {
            changePath: resolvedChangePath,
            graphPath,
            feature,
            graphStatus: typeof graph.status === 'string' && graph.status.trim().length > 0 ? graph.status.trim() : 'unknown',
            taskCount: tasks.length,
            readyTasks,
            dispatchableTasks,
            runningTasks,
            completedTasks,
            concernTasks,
            blockedTasks,
            invalidTasks,
            decisions,
            checkpointEvidence,
            issues,
            nextInstruction: this.getNextInstruction({
                issues,
                invalidTasks,
                decisions,
                checkpointEvidence,
                dispatchableTasks,
                runningTasks,
                blockedTasks,
                completedTasks,
                taskCount: tasks.length,
            }),
        };
    }
    async dispatch(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const report = await this.getReport(resolvedChangePath);
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            throw new Error('Cannot dispatch tasks until task graph issues and invalid tasks are resolved.');
        }
        if (report.decisions.pendingRequired > 0) {
            throw new Error(`Cannot dispatch tasks while ${report.decisions.pendingRequired} required user decision(s) are pending. ${report.decisions.nextInstruction}`);
        }
        if (report.decisions.blockers.length > 0) {
            throw new Error(`Cannot dispatch tasks while user decision artifacts need repair: ${report.decisions.blockers.join('; ')}`);
        }
        if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
            throw new Error('Dispatch limit must be a positive integer.');
        }
        if (options.taskId && options.limit !== undefined) {
            throw new Error('Dispatch --task cannot be combined with --limit.');
        }
        const dispatchableTasks = options.taskId
            ? report.readyTasks.filter(task => task.id === options.taskId
                && (report.runningTasks.length === 0 || task.parallelizable)
                && report.runningTasks.every(runningTask => !tasksConflict(task, runningTask)))
            : typeof options.limit === 'number'
                ? report.dispatchableTasks.slice(0, options.limit)
                : report.dispatchableTasks;
        if (dispatchableTasks.length === 0) {
            throw new Error(options.taskId
                ? `Task ${options.taskId} is not dispatchable. ${report.nextInstruction}`
                : `No dispatchable tasks found. ${report.nextInstruction}`);
        }
        const now = new Date().toISOString();
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const session = await this.readSession(sessionPath, report.feature);
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const warnings = [...projectSession.warnings];
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const createdDispatches = [];
        for (const task of dispatchableTasks) {
            const dispatchId = `dispatch-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(task.id)}`;
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR, `${dispatchId}.json`);
            const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR, `${dispatchId}.md`);
            const record = {
                id: dispatchId,
                taskId: task.id,
                taskTitle: task.title,
                workerRole: task.workerRole,
                workerProfile: task.workerProfile,
                projectSession,
                status: 'DISPATCHED',
                assignedAt: now,
                completedAt: null,
                packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
                recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
                summary: null,
            };
            await this.fileService.writeJSON(recordPath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildDispatchPacket(report, task, record));
            this.updateRawTaskStatus(rawGraph, task.id, 'IN_PROGRESS');
            session.dispatches.push(record);
            createdDispatches.push(record);
        }
        rawGraph.status = 'in_progress';
        session.status = 'running';
        session.updatedAt = now;
        session.projectSession = projectSession;
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        await this.fileService.writeJSON(sessionPath, session);
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            sessionPath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            projectSession,
            dispatches: createdDispatches,
            dispatchLimit: options.limit ?? null,
            warnings,
            nextInstruction: `Run ospec execute launch for each active dispatch, start native harness worker agent(s) from the launch plan, then record results with ospec execute complete <task-id>. Use CLI fallback only when native subagents are unavailable.`,
        };
    }
    async planLaunch(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const artifactPath = this.getLaunchPlanPath(resolvedChangePath);
        const reportPath = this.getLaunchPlanReportPath(resolvedChangePath);
        const relativeChangePath = this.toProjectRelativeChangePath(projectRoot, resolvedChangePath);
        const blockers = [];
        const warnings = [];
        let report = null;
        try {
            report = await this.getReport(resolvedChangePath);
        }
        catch (error) {
            blockers.push(`Task graph could not be inspected: ${error?.message || error}`);
        }
        const feature = report?.feature || await this.readFeatureName(resolvedChangePath);
        const graphPath = report?.graphPath || path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const sessionExists = await this.fileService.exists(sessionPath);
        if (!sessionExists) {
            blockers.push('Execution session is missing; run ospec execute dispatch before preparing a worker launch.');
        }
        const session = await this.readSession(sessionPath, feature);
        const activeDispatches = session.dispatches
            .filter(dispatch => dispatch.status === 'DISPATCHED')
            .filter(dispatch => !options.taskId || dispatch.taskId === options.taskId)
            .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt));
        if (options.taskId && activeDispatches.length === 0) {
            blockers.push(`No active dispatch packet found for task ${options.taskId}. Run ospec execute dispatch ${this.quoteShellArg(relativeChangePath)} --task ${this.quoteShellArg(options.taskId)} first.`);
        }
        if (!options.taskId && session.dispatches.length === 0) {
            blockers.push('No dispatch packet exists yet; run ospec execute dispatch before preparing a worker launch.');
        }
        if (!options.taskId && activeDispatches.length > 1) {
            blockers.push(`Multiple active dispatches found (${activeDispatches.map(dispatch => dispatch.taskId).join(', ')}); pass --task to prepare one worker launch plan.`);
        }
        if (!options.taskId && session.dispatches.length > 0 && activeDispatches.length === 0) {
            blockers.push('No active DISPATCHED task remains; dispatch or reopen a task before preparing a worker launch.');
        }
        const selectedDispatch = activeDispatches.length === 1 ? activeDispatches[0] : null;
        const allTasks = report
            ? [
                ...report.readyTasks,
                ...report.runningTasks,
                ...report.completedTasks,
                ...report.concernTasks,
                ...report.blockedTasks.map(item => item.task),
                ...report.invalidTasks.map(item => item.task),
            ]
            : [];
        const selectedTask = selectedDispatch
            ? allTasks.find(task => task.id === selectedDispatch.taskId) || null
            : null;
        if (selectedDispatch && !selectedTask) {
            blockers.push(`Dispatched task ${selectedDispatch.taskId} is missing from artifacts/agents/task-graph.json.`);
        }
        if (selectedDispatch && selectedDispatch.status !== 'DISPATCHED') {
            blockers.push(`Dispatch ${selectedDispatch.id} is ${selectedDispatch.status}; launch requires DISPATCHED.`);
        }
        if (selectedTask && selectedTask.status !== 'IN_PROGRESS' && selectedTask.status !== 'DISPATCHED') {
            blockers.push(`Task ${selectedTask.id} is ${selectedTask.status}; launch requires IN_PROGRESS or DISPATCHED.`);
        }
        const workspaceSnapshot = await this.readBootstrapPlanSnapshot(this.getWorkspaceStatusPath(resolvedChangePath));
        if (!workspaceSnapshot.exists) {
            blockers.push('Workspace safety artifact is missing; run ospec execute workspace before preparing a worker launch.');
        }
        else if (workspaceSnapshot.status !== 'ready') {
            blockers.push(`Workspace safety status is ${workspaceSnapshot.status}; resolve workspace blockers or prepare an isolated worktree before launch.`);
        }
        warnings.push(...workspaceSnapshot.warnings);
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        warnings.push(...projectSession.warnings);
        const profile = selectedDispatch?.workerProfile || selectedTask?.workerProfile || null;
        const target = this.normalizeWorkerToolTarget(options.target || profile?.targetToolMapping?.target || profile?.recommendedTarget);
        let targetToolMapping = null;
        if (profile) {
            targetToolMapping = options.target
                ? buildWorkerTargetToolMapping(target)
                : profile.targetToolMapping || buildWorkerTargetToolMapping(target);
            if (!profile.targetToolMapping) {
                warnings.push(`Dispatch ${selectedDispatch?.id || 'record'} did not include target tool mapping; OSpec generated a ${target} fallback mapping.`);
            }
        }
        else if (selectedDispatch) {
            blockers.push(`Dispatch ${selectedDispatch.id} is missing a worker profile and no matching task profile could be inferred.`);
        }
        const selected = selectedDispatch
            ? {
                id: selectedDispatch.id,
                taskId: selectedDispatch.taskId,
                taskTitle: selectedDispatch.taskTitle,
                workerRole: selectedDispatch.workerRole,
                status: selectedDispatch.status,
                packetPath: selectedDispatch.packetPath,
                recordPath: selectedDispatch.recordPath,
                assignedAt: selectedDispatch.assignedAt,
                workerProfile: profile,
                targetToolMapping,
            }
            : null;
        const launchCommands = selected
            ? this.buildWorkerLaunchCommands({
                projectRoot,
                relativeChangePath,
                selected,
                target,
                dryRun: options.dryRun === true,
                reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            })
            : [];
        const launchPrompt = selected
            ? this.buildWorkerLaunchPrompt({
                relativeChangePath,
                selected,
                target,
                dryRun: options.dryRun === true,
            })
            : 'No launch prompt is available until exactly one active dispatch is selected.';
        const nativeAgent = selected
            ? this.buildNativeAgentLaunchPlan({
                relativeChangePath,
                selected,
                target,
                launchPrompt,
            })
            : null;
        const status = blockers.length > 0 ? 'blocked' : 'ready';
        const nextInstruction = status === 'ready'
            ? `Review ${this.toChangeRelativePath(resolvedChangePath, reportPath)}, dispatch the ${target} worker with the current harness native agent mechanism, then record the result with ospec execute complete ${selected?.taskId || '<task-id>'} ${this.quoteShellArg(relativeChangePath)} --status DONE --summary "...". Use CLI fallback only if native subagents are unavailable.`
            : `Resolve launch blockers, then rerun ospec execute launch ${this.quoteShellArg(relativeChangePath)}${options.taskId ? ` --task ${this.quoteShellArg(options.taskId)}` : ''} --target ${target}.`;
        const artifact = {
            version: '1.0',
            feature,
            status,
            target,
            dryRun: options.dryRun === true,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            projectSession,
            taskGraph: {
                path: graphPath,
                status: report?.graphStatus || 'unknown',
                taskStatus: selectedTask?.status || 'missing',
            },
            workspace: {
                path: workspaceSnapshot.path,
                exists: workspaceSnapshot.exists,
                status: workspaceSnapshot.status,
                blockers: workspaceSnapshot.blockers,
                warnings: workspaceSnapshot.warnings,
            },
            selectedDispatch: selected,
            nativeAgent,
            launchCommands,
            launchPrompt,
            blockers,
            warnings,
            nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorkerLaunchPlanReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status,
            target,
            dryRun: options.dryRun === true,
            taskId: selected?.taskId || null,
            dispatchId: selected?.id || null,
            nativeAgent,
            launchCommands,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async launchAndRun(changePath, options) {
        const command = options.command?.trim();
        if (!command) {
            throw new Error('Worker launch --run requires --command.');
        }
        const launch = await this.planLaunch(changePath, {
            taskId: options.taskId,
            target: options.target,
            dryRun: options.dryRun,
        });
        if (launch.status !== 'ready') {
            throw new Error(`Cannot run worker until launch plan is ready: ${launch.blockers.join('; ') || 'launch blocked'}`);
        }
        const launchArtifact = await this.fileService.readJSON(launch.artifactPath);
        const selected = launchArtifact.selectedDispatch;
        if (!selected) {
            throw new Error('Cannot run worker because launch plan did not select exactly one dispatch.');
        }
        return this.runWorkerCommand({
            changePath: path.resolve(changePath),
            projectRoot: launch.projectRoot,
            kind: 'worker',
            feature: launchArtifact.feature,
            target: launch.target,
            command,
            taskId: selected.taskId,
            dispatchId: selected.id,
            reviewStage: null,
            reviewDispatchId: null,
            launchPlanPath: this.toChangeRelativePath(path.resolve(changePath), launch.artifactPath),
            reviewArtifactPath: null,
            environment: null,
            directoryName: WORKER_RUNS_DIR,
            timeoutMs: options.timeoutMs,
            nextInstruction: (record) => `Worker run ${record.id} finished with exit code ${record.exitCode ?? 'unknown'}. Run ospec execute collect ${this.quoteShellArg(this.toProjectRelativeChangePath(launch.projectRoot, path.resolve(changePath)))} --task ${this.quoteShellArg(selected.taskId)} to record the task result.`,
        });
    }
    async collectWorkerRun(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const record = await this.findWorkerRunRecord(resolvedChangePath, {
            taskId: options.taskId,
            runId: options.runId,
        });
        if (!record) {
            throw new Error(options.runId
                ? `Worker run not found: ${options.runId}`
                : `Worker run not found for task: ${options.taskId || '(latest)'}`);
        }
        if (record.kind !== 'worker' || !record.taskId) {
            throw new Error(`Worker run ${record.id} is not a task worker run.`);
        }
        if (record.collectedAt) {
            throw new Error(`Worker run ${record.id} has already been collected.`);
        }
        const completionStatus = options.status || (record.exitCode === 0 ? 'DONE' : 'BLOCKED');
        const summary = options.summary?.trim()
            || record.summary
            || `Collected worker run ${record.id} with exit code ${record.exitCode ?? 'unknown'}.`;
        const completion = await this.complete(resolvedChangePath, record.taskId, {
            status: completionStatus,
            summary,
        });
        record.collectedAt = new Date().toISOString();
        record.completionStatus = completionStatus;
        record.summary = summary;
        await this.writeWorkerRunRecord(resolvedChangePath, record);
        return {
            changePath: resolvedChangePath,
            runId: record.id,
            taskId: record.taskId,
            recordPath: path.join(resolvedChangePath, record.recordPath),
            reportPath: path.join(resolvedChangePath, record.reportPath),
            status: record.status,
            completionStatus,
            completion,
            nextInstruction: completionStatus === 'DONE' || completionStatus === 'DONE_WITH_CONCERNS'
                ? completion.nextInstruction
                : `Worker run was collected as ${completionStatus}. Resolve blocker details or run ospec execute retry ${this.quoteShellArg(this.toProjectRelativeChangePath(await this.findProjectRootForOptionalSession(resolvedChangePath), resolvedChangePath))} --task ${this.quoteShellArg(record.taskId)} after the blocker is addressed.`,
        };
    }
    async retryWorkerRun(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const taskId = options.taskId?.trim();
        if (!taskId) {
            throw new Error('Worker retry requires --task.');
        }
        const report = await this.getReport(resolvedChangePath);
        const allTasks = this.flattenReportTasks(report);
        const task = allTasks.find(item => item.id === taskId);
        if (!task) {
            throw new Error(`Task not found in task graph: ${taskId}`);
        }
        const previousRun = await this.findWorkerRunRecord(resolvedChangePath, {
            taskId,
            runId: options.runId,
            optional: true,
        });
        const taskRetryable = task.status === 'NEEDS_CONTEXT' || task.status === 'BLOCKED';
        const runRetryable = previousRun?.status === 'failed'
            || previousRun?.completionStatus === 'NEEDS_CONTEXT'
            || previousRun?.completionStatus === 'BLOCKED';
        if (!options.force && !taskRetryable && !runRetryable) {
            throw new Error(`Task ${taskId} is not retryable from status ${task.status}; retry requires BLOCKED/NEEDS_CONTEXT task state, a failed run, or --force.`);
        }
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        this.updateRawTaskStatus(rawGraph, taskId, 'PENDING');
        rawGraph.status = 'pending';
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        const now = new Date().toISOString();
        const retryId = `retry-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(taskId)}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR, `${retryId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR, `${retryId}.md`);
        const retryRecord = {
            id: retryId,
            feature: report.feature,
            taskId,
            createdAt: now,
            previousStatus: task.status,
            previousRunId: previousRun?.id || null,
            summary: options.summary?.trim() || null,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
        };
        await this.fileService.writeJSON(recordPath, retryRecord);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorkerRetryReport(retryRecord));
        const dispatch = await this.dispatch(resolvedChangePath, { taskId });
        return {
            changePath: resolvedChangePath,
            retryRecord,
            dispatch,
            nextInstruction: `Retry dispatch created for ${taskId}. Run ospec execute launch ${this.quoteShellArg(this.toProjectRelativeChangePath(await this.findProjectRootForOptionalSession(resolvedChangePath), resolvedChangePath))} --task ${this.quoteShellArg(taskId)}, then start the worker through the current harness native agent mechanism. Use --run --command only as CLI fallback if native subagents are unavailable.`,
        };
    }
    async orchestrate(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const startedAt = new Date().toISOString();
        const feature = await this.readFeatureName(resolvedChangePath);
        const runId = `orchestration-${this.toFileSafeTimestamp(startedAt)}-${this.toFileSafeId(feature)}`;
        const artifactPath = path.join(this.getOrchestrationRunDir(resolvedChangePath), `${runId}.json`);
        const reportPath = path.join(this.getOrchestrationRunDir(resolvedChangePath), `${runId}.md`);
        const blockers = [];
        const warnings = [];
        const rounds = [];
        const commandResolution = await this.resolveHarnessCommandTemplate(projectRoot, options);
        const commandTemplate = commandResolution.commandTemplate;
        const maxRounds = this.normalizePositiveInteger(options.maxRounds ?? commandResolution.maxRounds, DEFAULT_ORCHESTRATION_MAX_ROUNDS);
        const timeoutMs = this.normalizeTimeoutMs(options.timeoutMs ?? commandResolution.timeoutMs);
        const collect = options.collect !== false;
        const continueOnFailure = options.continueOnFailure === true;
        let workspaceStatus = 'missing';
        warnings.push(...commandResolution.warnings);
        if (!commandTemplate) {
            blockers.push('No harness worker command template was provided. Pass --command or configure .ospec/harness.json.');
        }
        if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
            blockers.push('Orchestration limit must be a positive integer.');
        }
        if (options.maxRounds !== undefined && (!Number.isInteger(options.maxRounds) || options.maxRounds <= 0)) {
            blockers.push('Orchestration max rounds must be a positive integer.');
        }
        const workspace = await this.ensureWorkspaceReadyForOrchestration(resolvedChangePath);
        workspaceStatus = workspace.status;
        warnings.push(...workspace.warnings);
        blockers.push(...workspace.blockers);
        if (blockers.length === 0 && commandTemplate) {
            for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
                const report = await this.getReport(resolvedChangePath);
                if (report.issues.length > 0 || report.invalidTasks.length > 0) {
                    blockers.push('Cannot orchestrate tasks until task graph issues and invalid tasks are resolved.');
                    break;
                }
                let activeDispatches = await this.readActiveDispatches(resolvedChangePath, report.feature);
                let dispatchesCreated = 0;
                if (activeDispatches.length === 0) {
                    if (report.dispatchableTasks.length === 0) {
                        break;
                    }
                    const dispatch = await this.dispatch(resolvedChangePath, { limit: options.limit });
                    activeDispatches = dispatch.dispatches;
                    dispatchesCreated = dispatch.dispatches.length;
                }
                else {
                    const safeSelection = this.selectParallelSafeActiveDispatches(activeDispatches, report);
                    warnings.push(...safeSelection.warnings);
                    activeDispatches = safeSelection.dispatches;
                    if (activeDispatches.length === 0) {
                        blockers.push('Active dispatches exist, but none are safe to run together. Resolve stale or conflicting dispatches before orchestration.');
                        break;
                    }
                }
                if (options.limit !== undefined) {
                    activeDispatches = activeDispatches.slice(0, options.limit);
                }
                if (activeDispatches.length === 0) {
                    break;
                }
                const round = {
                    round: roundNumber,
                    dispatchesCreated,
                    activeDispatches: activeDispatches.length,
                    tasks: [],
                };
                const runInputs = activeDispatches.map(dispatch => this.prepareOrchestrationTaskRun({
                    changePath: resolvedChangePath,
                    projectRoot,
                    feature: report.feature,
                    dispatch,
                    commandTemplate,
                    target: options.target,
                    timeoutMs,
                    dryRun: options.dryRun === true,
                }));
                const taskResults = await Promise.all(runInputs);
                round.tasks.push(...taskResults);
                rounds.push(round);
                if (options.dryRun === true) {
                    break;
                }
                for (const taskResult of taskResults) {
                    if (!taskResult.runId || taskResult.error) {
                        continue;
                    }
                    if (collect) {
                        try {
                            const collected = await this.collectWorkerRun(resolvedChangePath, {
                                taskId: taskResult.taskId,
                                runId: taskResult.runId,
                            });
                            taskResult.completionStatus = collected.completionStatus;
                            taskResult.collected = true;
                        }
                        catch (error) {
                            taskResult.error = error?.message || String(error);
                        }
                    }
                }
                const failed = taskResults.some(result => result.error || result.exitCode !== 0 || result.timedOut || result.completionStatus === 'BLOCKED' || result.completionStatus === 'NEEDS_CONTEXT');
                if (failed && !continueOnFailure) {
                    blockers.push('At least one worker failed, timed out, or recorded a blocking status.');
                    break;
                }
                const nextReport = await this.getReport(resolvedChangePath);
                if (nextReport.taskCount > 0
                    && nextReport.completedTasks.length === nextReport.taskCount
                    && nextReport.graphStatus.toLowerCase() === 'completed') {
                    break;
                }
            }
        }
        const finalReadiness = await this.readOrchestrationFinalReadiness(resolvedChangePath);
        warnings.push(...finalReadiness.warnings);
        if (options.dryRun !== true && blockers.length === 0 && !finalReadiness.completed) {
            blockers.push(finalReadiness.reason);
        }
        const completedAt = new Date().toISOString();
        const status = options.dryRun === true
            ? 'dry_run'
            : blockers.length > 0
                ? rounds.length > 0 ? 'partial' : 'blocked'
                : 'completed';
        const failedTasks = this.buildOrchestrationFailedTasks({
            changePath: resolvedChangePath,
            projectRoot,
            rounds,
        });
        const nextInstruction = this.getOrchestrationNextInstruction(status, {
            changePath: resolvedChangePath,
            projectRoot,
            rounds,
            failedTasks,
            blockers,
        });
        const artifact = {
            version: '1.0',
            id: runId,
            feature,
            status,
            startedAt,
            completedAt,
            changePath: resolvedChangePath,
            projectRoot,
            target: options.target ?? commandResolution.target ?? null,
            limit: options.limit ?? null,
            maxRounds,
            timeoutMs,
            dryRun: options.dryRun === true,
            collect,
            continueOnFailure,
            commandTemplate,
            commandSource: commandResolution.source,
            workspaceStatus,
            rounds,
            failedTasks,
            blockers,
            warnings,
            nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildOrchestrationRunReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status,
            rounds,
            failedTasks,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async runReview(changePath, options) {
        const command = options.command?.trim();
        if (!command) {
            throw new Error('Review --run requires --command.');
        }
        const review = await this.review(changePath, { stage: options.stage, taskId: options.taskId });
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const run = await this.runWorkerCommand({
            changePath: resolvedChangePath,
            projectRoot,
            kind: 'review',
            feature: await this.readFeatureName(resolvedChangePath),
            target: 'shell',
            command,
            taskId: review.dispatch.taskId || null,
            dispatchId: null,
            reviewStage: review.dispatch.stage,
            reviewDispatchId: review.dispatch.id,
            launchPlanPath: null,
            reviewArtifactPath: review.dispatch.reviewArtifactPath,
            environment: null,
            directoryName: REVIEW_RUNS_DIR,
            timeoutMs: options.timeoutMs,
            nextInstruction: (record) => `Review run ${record.id} finished with exit code ${record.exitCode ?? 'unknown'}. Update ${review.dispatch.reviewArtifactPath}, then run ospec execute sync ${this.quoteShellArg(this.toProjectRelativeChangePath(projectRoot, resolvedChangePath))}.`,
        });
        let workerStatusPath = review.workerStatusPath;
        const decision = options.decision || null;
        if (decision) {
            await this.applyReviewRunDecision(resolvedChangePath, review.dispatch.reviewArtifactPath, {
                decision,
                summary: options.summary,
                run,
            });
            const sync = await this.syncWorkerStatus(resolvedChangePath);
            workerStatusPath = sync.workerStatusPath;
        }
        return {
            changePath: resolvedChangePath,
            review,
            run,
            workerStatusPath,
            decision,
            nextInstruction: decision
                ? review.dispatch.taskId
                    ? this.getTaskReviewRunDecisionNextInstruction(review.dispatch.taskId, review.dispatch.stage, decision)
                    : `Review decision ${decision} recorded. Continue with ospec execute feedback ${this.quoteShellArg(this.toProjectRelativeChangePath(projectRoot, resolvedChangePath))} --stage ${review.dispatch.stage}.`
                : `Review run recorded. Update ${review.dispatch.reviewArtifactPath} with findings and decision, then run ospec execute sync.`,
        };
    }
    async complete(changePath, taskId, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const normalizedTaskId = String(taskId || '').trim();
        if (!normalizedTaskId) {
            throw new Error('Task completion requires a task id.');
        }
        const completionStatus = this.normalizeCompletionStatus(options.status);
        const report = await this.getReport(resolvedChangePath);
        const task = [
            ...report.readyTasks,
            ...report.runningTasks,
            ...report.completedTasks,
            ...report.concernTasks,
            ...report.blockedTasks.map(item => item.task),
            ...report.invalidTasks.map(item => item.task),
        ].find(item => item.id === normalizedTaskId);
        if (!task) {
            throw new Error(`Task not found in task graph: ${normalizedTaskId}`);
        }
        const now = new Date().toISOString();
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const session = await this.readSession(sessionPath, report.feature);
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        this.updateRawTaskStatus(rawGraph, normalizedTaskId, completionStatus);
        if (TERMINAL_TASK_STATUSES.has(completionStatus)) {
            this.resetRawTaskReview(rawGraph, task);
        }
        const summary = options.summary?.trim() || null;
        const dispatch = [...session.dispatches].reverse().find(item => item.taskId === normalizedTaskId && item.completedAt === null);
        if (dispatch) {
            dispatch.status = completionStatus;
            dispatch.completedAt = now;
            dispatch.summary = summary;
            await this.fileService.writeJSON(path.join(resolvedChangePath, dispatch.recordPath), dispatch);
        }
        else {
            session.dispatches.push({
                id: `manual-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(normalizedTaskId)}`,
                taskId: normalizedTaskId,
                taskTitle: task.title,
                workerRole: task.workerRole,
                workerProfile: task.workerProfile,
                status: completionStatus,
                assignedAt: now,
                completedAt: now,
                packetPath: '',
                recordPath: '',
                summary,
            });
        }
        const graphStatus = this.deriveGraphStatus(rawGraph);
        rawGraph.status = graphStatus;
        session.status = this.deriveSessionStatus(rawGraph);
        session.updatedAt = now;
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        await this.fileService.writeJSON(sessionPath, session);
        const blockerEscalation = completionStatus === 'NEEDS_CONTEXT' || completionStatus === 'BLOCKED'
            ? await this.writeBlockerEscalation({
                changePath: resolvedChangePath,
                report,
                task,
                status: completionStatus,
                summary,
                dispatch: dispatch ?? null,
                createdAt: now,
                sessionPath,
            })
            : null;
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            sessionPath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            blockerEscalation,
            taskId: normalizedTaskId,
            status: completionStatus,
            graphStatus,
            nextInstruction: blockerEscalation
                ? `Resolve blocker escalation at ${blockerEscalation.reportPath}, then rerun ospec execute status.`
                : TERMINAL_TASK_STATUSES.has(completionStatus)
                    ? `Task ${normalizedTaskId} implementation is recorded. Run ospec execute review [change-path] --task ${normalizedTaskId} --stage spec before dispatching dependent work.`
                    : graphStatus === 'completed'
                        ? 'Task graph is complete. Continue with review, verification, and archive gates.'
                        : 'Run ospec execute status to inspect remaining work.',
        };
    }
    async syncWorkerStatus(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        await this.syncTaskReviewStateFromArtifacts(resolvedChangePath);
        const report = await this.getReport(resolvedChangePath);
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const tasks = Array.isArray(rawGraph?.tasks)
            ? rawGraph.tasks.map((task, index) => normalizeTask(task, index))
            : [];
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const session = await this.readSession(sessionPath, report.feature);
        const workerStatusPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
        const specReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW));
        const qualityReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW));
        const implementerStatus = this.deriveImplementerWorkerStatus(tasks, report);
        const verificationEvidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), report.feature);
        const tddEvidence = await this.readTddEvidence(this.getTddEvidencePath(resolvedChangePath), report.feature);
        const debugEvidence = await this.readDebugEvidence(this.getDebugEvidencePath(resolvedChangePath), report.feature);
        const latestBlockerEscalation = await this.readLatestBlockerEscalation(resolvedChangePath);
        const controllerStatus = this.deriveControllerWorkerStatus({
            implementerStatus,
            specReviewerStatus,
            qualityReviewerStatus,
            report,
        });
        const verificationChecklistComplete = await this.isVerificationChecklistComplete(resolvedChangePath);
        const existingContent = await this.fileService.exists(workerStatusPath)
            ? await this.fileService.readFile(workerStatusPath)
            : this.buildDefaultWorkerStatusDocument(report.feature);
        const parsed = (0, helpers_1.parseFrontmatterDocument)(existingContent);
        const nextData = {
            ...parsed.data,
            feature: typeof parsed.data.feature === 'string' && parsed.data.feature.trim().length > 0
                ? parsed.data.feature
                : report.feature,
            created: parsed.data.created || new Date().toISOString().split('T')[0],
            status: this.deriveWorkerStatusDocumentStatus({
                implementerStatus,
                specReviewerStatus,
                qualityReviewerStatus,
                controllerStatus,
                session,
            }),
            implementer_status: implementerStatus,
            spec_reviewer_status: specReviewerStatus,
            quality_reviewer_status: qualityReviewerStatus,
            controller_status: controllerStatus,
            allowed_worker_statuses: [
                'DONE',
                'DONE_WITH_CONCERNS',
                'NEEDS_CONTEXT',
                'BLOCKED',
                'PENDING',
            ],
        };
        const nextBody = this.updateWorkerStatusBody(parsed.content, {
            report,
            session,
            implementerStatus,
            specReviewerStatus,
            qualityReviewerStatus,
            controllerStatus,
            verificationChecklistComplete,
            verificationEvidence,
            tddEvidence,
            debugEvidence,
            latestBlockerEscalation,
        });
        await this.writeLocalizedReportFile(resolvedChangePath, workerStatusPath, (0, helpers_1.stringifyFrontmatter)(nextBody, nextData));
        return {
            changePath: resolvedChangePath,
            sessionPath,
            graphPath: report.graphPath,
            workerStatusPath,
            implementerStatus,
            specReviewerStatus,
            qualityReviewerStatus,
            controllerStatus,
            verificationChecklistComplete,
            nextInstruction: controllerStatus === 'DONE' && verificationChecklistComplete
                ? 'Worker status is synchronized and archive-ready for the worker gate.'
                : 'Worker status is synchronized. Complete remaining review or verification evidence before archive.',
        };
    }
    async review(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const report = await this.getReport(resolvedChangePath);
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            throw new Error('Cannot dispatch review until task graph issues and invalid tasks are resolved.');
        }
        const requestedTaskId = options.taskId?.trim();
        const taskReview = requestedTaskId
            ? await this.prepareTaskReviewDispatch(resolvedChangePath, report, requestedTaskId, options.stage)
            : null;
        if (!taskReview && (report.completedTasks.length !== report.taskCount || report.taskCount === 0 || report.graphStatus.toLowerCase() !== 'completed')) {
            throw new Error('Cannot dispatch review until the task graph is completed.');
        }
        const specReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW);
        const qualityReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW);
        const specDecision = taskReview ? taskReview.specDecision : await this.readReviewDecision(specReviewPath);
        const qualityDecision = taskReview ? taskReview.qualityDecision : await this.readReviewDecision(qualityReviewPath);
        const stage = taskReview?.stage || options.stage || this.selectNextReviewStage(specDecision, qualityDecision);
        if (stage === 'spec' && APPROVED_REVIEW_DECISIONS.has(specDecision)) {
            throw new Error(taskReview
                ? `Task ${taskReview.task.id} spec compliance review is already ${specDecision}. Dispatch task quality review next.`
                : `Spec compliance review is already ${specDecision}. Dispatch quality review next.`);
        }
        if (stage === 'quality' && !APPROVED_REVIEW_DECISIONS.has(specDecision)) {
            throw new Error(taskReview
                ? `Cannot dispatch task code quality review before task spec compliance review is approved (current: ${specDecision || 'PENDING'}).`
                : `Cannot dispatch code quality review before spec compliance review is approved (current: ${specDecision || 'PENDING'}).`);
        }
        if (stage === 'quality' && APPROVED_REVIEW_DECISIONS.has(qualityDecision)) {
            throw new Error(taskReview
                ? `Task ${taskReview.task.id} code quality review is already ${qualityDecision}. Continue with dependent task dispatch.`
                : `Code quality review is already ${qualityDecision}. Continue with verification and archive gates.`);
        }
        const reviewArtifactPath = taskReview?.reviewArtifactPath || (stage === 'spec' ? specReviewPath : qualityReviewPath);
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            throw new Error(`Review artifact not found at ${reviewArtifactPath}`);
        }
        const now = new Date().toISOString();
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const warnings = [...projectSession.warnings];
        const reviewId = taskReview
            ? `review-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(taskReview.task.id)}-${stage}`
            : `review-${this.toFileSafeTimestamp(now)}-${stage}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
        const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.md`);
        const record = {
            id: reviewId,
            stage,
            taskId: taskReview?.task.id || null,
            taskTitle: taskReview?.task.title || null,
            reviewerRole: stage === 'spec' ? 'spec_compliance_reviewer' : 'code_quality_reviewer',
            projectSession,
            status: 'DISPATCHED',
            assignedAt: now,
            packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath),
        };
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildReviewDispatchPacket(report, record));
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            dispatch: record,
            projectSession,
            warnings,
            nextInstruction: stage === 'spec'
                ? `Hand the spec compliance review packet to a reviewer, then update ${record.reviewArtifactPath} and run ospec execute sync.`
                : `Hand the code quality review packet to a reviewer, then update ${record.reviewArtifactPath} and run ospec execute sync.`,
        };
    }
    async planReviewFeedback(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const specReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW);
        const qualityReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW);
        const specDecision = await this.readReviewDecision(specReviewPath);
        const qualityDecision = await this.readReviewDecision(qualityReviewPath);
        const stage = options.stage || this.selectNextReviewFeedbackStage(specDecision, qualityDecision);
        const reviewArtifactPath = stage === 'spec' ? specReviewPath : qualityReviewPath;
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            throw new Error(`Review artifact not found at ${reviewArtifactPath}`);
        }
        const reviewDocument = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        const decision = normalizeStatus(reviewDocument.data?.decision) || 'PENDING';
        if (decision === 'PENDING') {
            throw new Error(`Cannot plan review feedback while ${this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath)} decision is PENDING.`);
        }
        const now = new Date().toISOString();
        const action = this.deriveReviewFeedbackAction(decision);
        const artifactPath = this.getReviewFeedbackPlanPath(resolvedChangePath);
        const reportPath = this.getReviewFeedbackPlanReportPath(resolvedChangePath);
        const reviewArtifactRelativePath = this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath);
        const findings = this.extractReviewFindings(reviewDocument.content);
        const userDecisionGate = await this.createReviewFeedbackDecisionGateIfNeeded({
            changePath: resolvedChangePath,
            stage,
            decision,
            action,
            findings,
            reviewArtifactPath: reviewArtifactRelativePath,
            summary: options.summary,
        });
        const plan = {
            version: '1.0',
            feature: report.feature,
            stage,
            reviewerRole: stage === 'spec' ? 'spec_compliance_reviewer' : 'code_quality_reviewer',
            decision,
            action,
            createdAt: now,
            reviewArtifactPath: reviewArtifactRelativePath,
            artifactPath: this.toChangeRelativePath(resolvedChangePath, artifactPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            summary: options.summary?.trim() || null,
            findings,
            recommendedActions: this.buildReviewFeedbackRecommendedActions(stage, decision, action),
            userDecisionGate,
            nextInstruction: userDecisionGate.status === 'created' || userDecisionGate.status === 'pending'
                ? userDecisionGate.nextInstruction || this.buildReviewFeedbackNextInstruction(stage, decision, action)
                : this.buildReviewFeedbackNextInstruction(stage, decision, action),
        };
        await this.fileService.writeJSON(artifactPath, plan);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildReviewFeedbackPlanReport(plan));
        return {
            changePath: resolvedChangePath,
            artifactPath,
            reportPath,
            stage,
            decision,
            action,
            userDecisionGate,
            nextInstruction: plan.nextInstruction,
        };
    }
    async recordUserDecision(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const now = new Date().toISOString();
        const question = options.question?.trim();
        const selectedOptionId = options.selectOptionId?.trim();
        const id = this.toFileSafeId(options.id || question || selectedOptionId || 'decision');
        if (!id) {
            throw new Error('Decision requires --id or --question.');
        }
        const recordPath = this.getUserDecisionRecordPath(resolvedChangePath, id);
        const reportPath = this.getUserDecisionReportPath(resolvedChangePath, id);
        const existing = await this.readUserDecisionRecord(recordPath);
        if (!question && !existing) {
            throw new Error('Decision creation requires --question. Selecting an existing decision requires --id.');
        }
        const nextOptions = options.options && options.options.length > 0
            ? this.normalizeUserDecisionOptions(options.options)
            : existing?.options || [];
        if (question && nextOptions.length < 2) {
            throw new Error('Decision creation requires at least two --option values.');
        }
        const recommendedOptionId = options.recommendedOptionId?.trim()
            || existing?.recommendedOptionId
            || null;
        if (recommendedOptionId && nextOptions.length > 0 && !nextOptions.some(item => item.id === recommendedOptionId)) {
            throw new Error(`Recommended decision option not found: ${recommendedOptionId}`);
        }
        if (selectedOptionId && nextOptions.length > 0 && !nextOptions.some(item => item.id === selectedOptionId)) {
            throw new Error(`Selected decision option not found: ${selectedOptionId}`);
        }
        if (options.skip && selectedOptionId) {
            throw new Error('Decision cannot combine --skip with --select.');
        }
        const required = options.required ?? existing?.required ?? true;
        const status = selectedOptionId
            ? 'SELECTED'
            : options.skip
                ? 'SKIPPED'
                : existing?.status === 'SELECTED' && !question
                    ? 'SELECTED'
                    : 'PENDING';
        const record = {
            version: '1.0',
            feature,
            id,
            status,
            required,
            question: question || existing?.question || '',
            options: nextOptions,
            recommendedOptionId,
            selectedOptionId: options.skip ? null : selectedOptionId || existing?.selectedOptionId || null,
            summary: options.summary?.trim() || existing?.summary || null,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            selectedAt: selectedOptionId || options.skip ? now : existing?.selectedAt || null,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            nextInstruction: '',
        };
        record.nextInstruction = this.getUserDecisionNextInstruction(resolvedChangePath, projectRoot, record);
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildUserDecisionReport(record));
        const snapshot = await this.readUserDecisionSnapshot(resolvedChangePath, feature);
        await this.writeUserDecisionIndex(resolvedChangePath, feature, snapshot);
        return {
            changePath: resolvedChangePath,
            projectRoot,
            recordPath,
            reportPath,
            decision: record,
            snapshot,
            nextInstruction: record.nextInstruction,
        };
    }
    async reviewDocument(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const designReviewPath = this.getDocumentReviewArtifactPath(resolvedChangePath, 'design');
        const planReviewPath = this.getDocumentReviewArtifactPath(resolvedChangePath, 'plan');
        const designDecision = await this.readReviewDecision(designReviewPath);
        const planDecision = await this.readReviewDecision(planReviewPath);
        const stage = options.stage || this.selectNextDocumentReviewStage(designDecision);
        if (stage === 'design' && APPROVED_REVIEW_DECISIONS.has(designDecision)) {
            throw new Error(`Design document review is already ${designDecision}. Dispatch implementation plan review next.`);
        }
        if (stage === 'plan' && !APPROVED_REVIEW_DECISIONS.has(designDecision)) {
            throw new Error(`Cannot dispatch implementation plan review before design document review is approved (current: ${designDecision || 'PENDING'}).`);
        }
        if (stage === 'plan' && APPROVED_REVIEW_DECISIONS.has(planDecision)) {
            throw new Error(`Implementation plan review is already ${planDecision}. Continue with task graph or worker dispatch.`);
        }
        const target = this.getDocumentReviewTarget(stage);
        const documentStatus = await this.readBootstrapDocumentStatus(resolvedChangePath, target.documentFile);
        if (!documentStatus.exists || documentStatus.readiness === 'missing' || documentStatus.readiness === 'empty') {
            throw new Error(`Cannot dispatch ${target.label} until ${target.documentFile} exists and is non-empty.`);
        }
        const reviewArtifactPath = this.getDocumentReviewArtifactPath(resolvedChangePath, stage);
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            await this.writeLocalizedReportFile(resolvedChangePath, reviewArtifactPath, this.buildDocumentReviewArtifact(feature, target));
        }
        const now = new Date().toISOString();
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const warnings = [...projectSession.warnings];
        const reviewId = `doc-review-${this.toFileSafeTimestamp(now)}-${stage}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', DOCUMENT_REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
        const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', DOCUMENT_REVIEW_DISPATCHES_DIR, `${reviewId}.md`);
        const record = {
            id: reviewId,
            stage,
            reviewerRole: target.reviewerRole,
            projectSession,
            status: 'DISPATCHED',
            assignedAt: now,
            packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            documentPath: this.toChangeRelativePath(resolvedChangePath, path.join(resolvedChangePath, target.documentFile)),
            reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath),
            documentReadiness: documentStatus.readiness,
        };
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildDocumentReviewDispatchPacket(feature, record, target));
        return {
            changePath: resolvedChangePath,
            dispatch: record,
            projectSession,
            warnings,
            nextInstruction: stage === 'design'
                ? 'Hand the design review packet to a reviewer, then update artifacts/reviews/design-review.md. If approved, run ospec execute doc-review [change-path] --stage plan.'
                : 'Hand the implementation plan review packet to a reviewer, then update artifacts/reviews/implementation-plan-review.md. If approved, derive or refresh artifacts/agents/task-graph.json.',
        };
    }
    async recordVerification(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const command = options.command?.trim();
        if (!command) {
            throw new Error('Verification evidence requires a non-empty command.');
        }
        const status = this.normalizeVerificationEvidenceStatus(options.status);
        const now = new Date().toISOString();
        const evidencePath = this.getVerificationEvidencePath(resolvedChangePath);
        const evidence = await this.readVerificationEvidence(evidencePath, report.feature);
        const evidenceId = `verification-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(status.toLowerCase())}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_DIR, `${evidenceId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_DIR, `${evidenceId}.md`);
        const record = {
            id: evidenceId,
            command,
            status,
            exitCode: typeof options.exitCode === 'number' && Number.isFinite(options.exitCode) ? options.exitCode : null,
            recordedAt: now,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            summary: options.summary?.trim() || null,
        };
        evidence.records.push(record);
        evidence.status = this.deriveVerificationEvidenceStatus(evidence.records);
        evidence.updatedAt = now;
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildVerificationEvidenceReport(report, record));
        await this.fileService.writeJSON(evidencePath, evidence);
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            evidencePath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            record,
            nextInstruction: status === 'PASSED'
                ? 'Verification evidence is recorded. Update verification.md checklist and continue with archive gates.'
                : 'Verification evidence is recorded with a non-passing status. Resolve the issue, rerun verification, and record a passing result before archive.',
        };
    }
    async recordTddEvidence(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const phase = this.normalizeTddEvidencePhase(options.phase);
        const command = options.command?.trim();
        if (!command) {
            throw new Error('TDD evidence requires a non-empty command.');
        }
        const status = this.normalizeTddEvidenceStatus(phase, options.status);
        const now = new Date().toISOString();
        const evidencePath = this.getTddEvidencePath(resolvedChangePath);
        const evidence = await this.readTddEvidence(evidencePath, report.feature);
        this.validateTddEvidenceTransition(evidence.records, {
            phase,
            status,
            summary: options.summary,
        });
        const evidenceId = `tdd-${this.toFileSafeTimestamp(now)}-${phase}-${this.toFileSafeId(status.toLowerCase())}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', TDD_EVIDENCE_DIR, `${evidenceId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', TDD_EVIDENCE_DIR, `${evidenceId}.md`);
        const record = {
            id: evidenceId,
            phase,
            command,
            status,
            exitCode: typeof options.exitCode === 'number' && Number.isFinite(options.exitCode) ? options.exitCode : null,
            recordedAt: now,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            testName: options.testName?.trim() || null,
            summary: options.summary?.trim() || null,
        };
        evidence.records.push(record);
        evidence.status = this.deriveTddEvidenceStatus(evidence.records);
        evidence.updatedAt = now;
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildTddEvidenceReport(report, record));
        await this.fileService.writeJSON(evidencePath, evidence);
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            evidencePath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            record,
            nextInstruction: this.getTddEvidenceNextInstruction(record),
        };
    }
    async recordDebugEvidence(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const symptom = options.symptom?.trim();
        if (!symptom) {
            throw new Error('Debug evidence requires a non-empty symptom.');
        }
        const status = this.normalizeDebugEvidenceStatus(options.status);
        const phase = this.normalizeDebugEvidencePhase(options.phase, status, options);
        const rootCause = options.rootCause?.trim() || null;
        if ((status === 'CONFIRMED' || status === 'FIXED') && (phase === 'isolate' || phase === 'fix' || phase === 'verify') && !rootCause) {
            throw new Error(`Debug evidence status ${status} requires --root-cause.`);
        }
        this.validateDebugEvidencePhase({
            phase,
            status,
            hypothesis: options.hypothesis,
            rootCause,
        });
        const now = new Date().toISOString();
        const evidencePath = this.getDebugEvidencePath(resolvedChangePath);
        const evidence = await this.readDebugEvidence(evidencePath, report.feature);
        const evidenceId = `debug-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(phase)}-${this.toFileSafeId(status.toLowerCase())}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', DEBUG_EVIDENCE_DIR, `${evidenceId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', DEBUG_EVIDENCE_DIR, `${evidenceId}.md`);
        const record = {
            id: evidenceId,
            phase,
            symptom,
            hypothesis: options.hypothesis?.trim() || null,
            rootCause,
            command: options.command?.trim() || null,
            status,
            recordedAt: now,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            summary: options.summary?.trim() || null,
        };
        evidence.records.push(record);
        evidence.status = this.deriveDebugEvidenceStatus(evidence.records);
        evidence.phases = this.buildDebugEvidencePhaseSnapshots(evidence.records);
        evidence.updatedAt = now;
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildDebugEvidenceReport(report, record));
        await this.fileService.writeJSON(evidencePath, evidence);
        const workerStatusSync = await this.syncWorkerStatus(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            evidencePath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            record,
            nextInstruction: this.getDebugEvidenceNextInstruction(record),
        };
    }
    async inspectWorkspace(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const inspectedAt = new Date().toISOString();
        const blockers = [];
        const warnings = [];
        const artifactPath = this.getWorkspaceStatusPath(resolvedChangePath);
        const reportPath = this.getWorkspaceStatusReportPath(resolvedChangePath);
        const gitRootResult = this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
        let artifact;
        if (!gitRootResult.ok) {
            warnings.push('Git repository could not be inspected; workspace safety requires manual review.');
            artifact = {
                version: '1.0',
                feature,
                status: 'unknown',
                inspectedAt,
                changePath: resolvedChangePath,
                projectRoot,
                git: {
                    available: !gitRootResult.error || gitRootResult.error.code !== 'ENOENT',
                    repository: false,
                    root: null,
                    branch: null,
                    head: null,
                    dirty: false,
                    statusEntries: [],
                    worktrees: [],
                    currentWorktree: null,
                },
                blockers,
                warnings,
                nextInstruction: 'Inspect workspace state manually before dispatching parallel worker tasks.',
            };
        }
        else {
            const gitRoot = path.resolve(gitRootResult.stdout.trim());
            const branch = this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            const head = this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            const statusOutput = this.readGitOutput(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']) || '';
            const statusEntries = this.parseGitStatusEntries(statusOutput);
            const worktreesOutput = this.readGitOutput(projectRoot, ['worktree', 'list', '--porcelain']) || '';
            const worktrees = this.parseGitWorktrees(worktreesOutput);
            const currentWorktree = this.findCurrentWorktree(gitRoot, worktrees);
            const dirty = statusEntries.length > 0;
            if (dirty) {
                blockers.push(`Workspace has ${statusEntries.length} uncommitted file change(s); defer multi-agent dispatch or use an isolated worktree.`);
            }
            if (branch) {
                const sameBranchWorktrees = worktrees.filter(worktree => worktree.branch === branch);
                if (sameBranchWorktrees.length > 1) {
                    blockers.push(`Branch ${branch} appears in multiple worktrees; use a dedicated branch/worktree before parallel dispatch.`);
                }
            }
            if (worktrees.length <= 1) {
                warnings.push('No linked git worktree was detected; prefer a dedicated worktree before handing multiple tasks to workers.');
            }
            if (currentWorktree?.detached) {
                warnings.push('Current workspace is in detached HEAD state; record the intended branch before dispatch.');
            }
            const status = blockers.length > 0 ? 'needs_isolation' : 'ready';
            artifact = {
                version: '1.0',
                feature,
                status,
                inspectedAt,
                changePath: resolvedChangePath,
                projectRoot,
                git: {
                    available: true,
                    repository: true,
                    root: gitRoot,
                    branch,
                    head,
                    dirty,
                    statusEntries,
                    worktrees,
                    currentWorktree,
                },
                blockers,
                warnings,
                nextInstruction: this.getWorkspaceNextInstruction(status),
            };
        }
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorkspaceStatusReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status: artifact.status,
            blockers: artifact.blockers,
            warnings: artifact.warnings,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async planWorktree(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const blockers = [];
        const warnings = [];
        const artifactPath = this.getWorktreePlanPath(resolvedChangePath);
        const reportPath = this.getWorktreePlanReportPath(resolvedChangePath);
        const gitRootResult = this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
        const safeFeature = this.toFileSafeId(feature).toLowerCase() || 'change';
        let gitRoot = null;
        let branch = null;
        let head = null;
        let statusEntries = [];
        let worktrees = [];
        let currentWorktree = null;
        let gitAvailable = !gitRootResult.error || gitRootResult.error.code !== 'ENOENT';
        let gitRepository = false;
        if (!gitRootResult.ok) {
            warnings.push('Git repository could not be inspected; generated worktree commands require manual review.');
        }
        else {
            gitRepository = true;
            gitAvailable = true;
            gitRoot = path.resolve(gitRootResult.stdout.trim());
            branch = this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            head = this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            statusEntries = this.parseGitStatusEntries(this.readGitOutput(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']) || '');
            worktrees = this.parseGitWorktrees(this.readGitOutput(projectRoot, ['worktree', 'list', '--porcelain']) || '');
            currentWorktree = gitRoot ? this.findCurrentWorktree(gitRoot, worktrees) : null;
        }
        const recommendedBranch = this.normalizeWorktreeBranch(options.branch, safeFeature);
        const baseRef = options.baseRef?.trim() || branch || head || 'HEAD';
        const recommendedPath = this.resolveRecommendedWorktreePath(gitRoot || projectRoot, options.targetPath, safeFeature);
        const targetPathExists = await this.fileService.exists(recommendedPath);
        const targetPathInWorktrees = worktrees.some(worktree => this.normalizeFilesystemPath(worktree.path) === this.normalizeFilesystemPath(recommendedPath));
        if (statusEntries.length > 0) {
            blockers.push(`Current workspace has ${statusEntries.length} uncommitted file change(s); commit, stash, or intentionally choose a clean base ref before creating an isolated worktree.`);
        }
        if (targetPathExists) {
            blockers.push(`Recommended worktree path already exists: ${recommendedPath}`);
        }
        if (targetPathInWorktrees) {
            blockers.push(`Recommended worktree path is already registered as a git worktree: ${recommendedPath}`);
        }
        if (currentWorktree?.detached && !options.baseRef?.trim()) {
            warnings.push('Current workspace is detached; pass --base explicitly if HEAD is not the intended base.');
        }
        if (!branch && !options.baseRef?.trim()) {
            warnings.push('Current branch could not be detected; review the generated base ref before creating a worktree.');
        }
        if (!gitRepository) {
            blockers.push('Git repository was not detected; create or inspect the repository before using this worktree plan.');
        }
        const commands = this.buildWorktreePlanCommands({
            recommendedBranch,
            recommendedPath,
            baseRef,
            changePath: resolvedChangePath,
            projectRoot,
        });
        const lifecycle = this.buildWorktreeLifecycle({
            statusEntries,
            worktrees,
            recommendedBranch,
            recommendedPath,
            baseRef,
            changePath: resolvedChangePath,
            projectRoot,
        });
        const status = !gitRepository
            ? 'unknown'
            : blockers.length > 0
                ? 'needs_cleanup'
                : 'ready';
        const artifact = {
            version: '1.0',
            feature,
            status,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            recommendedBranch,
            recommendedPath,
            baseRef,
            commands,
            lifecycle,
            git: {
                available: gitAvailable,
                repository: gitRepository,
                root: gitRoot,
                branch,
                head,
                dirty: statusEntries.length > 0,
                statusEntries,
                worktrees,
                currentWorktree,
                targetPathExists,
                targetPathInWorktrees,
            },
            blockers,
            warnings,
            nextInstruction: this.getWorktreePlanNextInstruction(status),
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorktreePlanReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status,
            recommendedBranch,
            recommendedPath,
            baseRef,
            commands,
            blockers,
            warnings,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async runWorktree(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const runId = `worktree-${options.action}-${this.toFileSafeTimestamp(generatedAt)}-${this.toFileSafeId(feature)}`;
        const artifactPath = path.join(this.getWorktreeRunDir(resolvedChangePath), `${runId}.json`);
        const reportPath = path.join(this.getWorktreeRunDir(resolvedChangePath), `${runId}.md`);
        const blockers = [];
        const warnings = [];
        const commandResults = [];
        let targetPath = '';
        let branch = null;
        let baseRef = null;
        let planArtifactPath = null;
        let commands = [];
        if (options.action === 'create') {
            const plan = await this.planWorktree(resolvedChangePath, {
                branch: options.branch,
                targetPath: options.targetPath,
                baseRef: options.baseRef,
            });
            targetPath = plan.recommendedPath;
            branch = plan.recommendedBranch;
            baseRef = plan.baseRef;
            planArtifactPath = this.toChangeRelativePath(resolvedChangePath, plan.artifactPath);
            blockers.push(...plan.blockers);
            warnings.push(...plan.warnings);
            commands = [
                this.formatGitCommand(['worktree', 'add', '-b', plan.recommendedBranch, plan.recommendedPath, plan.baseRef]),
            ];
            if (plan.status !== 'ready' && blockers.length === 0) {
                blockers.push(`Worktree plan is not ready: ${plan.status}`);
            }
            if (blockers.length === 0) {
                commandResults.push(this.runGitForArtifact(projectRoot, ['worktree', 'add', '-b', plan.recommendedBranch, plan.recommendedPath, plan.baseRef]));
            }
        }
        else {
            const cleanupContext = await this.buildWorktreeCleanupContext(resolvedChangePath, projectRoot, feature, options);
            targetPath = cleanupContext.targetPath;
            branch = cleanupContext.branch;
            baseRef = cleanupContext.baseRef;
            planArtifactPath = cleanupContext.planArtifactPath;
            blockers.push(...cleanupContext.blockers);
            warnings.push(...cleanupContext.warnings);
            commands = targetPath
                ? [this.formatGitCommand(['worktree', 'remove', targetPath])]
                : [];
            if (blockers.length === 0) {
                commandResults.push(this.runGitForArtifact(projectRoot, ['worktree', 'remove', targetPath]));
            }
        }
        const failedCommand = commandResults.find(result => !result.ok);
        const status = blockers.length > 0
            ? 'blocked'
            : failedCommand
                ? 'failed'
                : 'completed';
        const nextInstruction = this.getWorktreeRunNextInstruction(status, options.action, {
            projectRoot,
            changePath: resolvedChangePath,
            targetPath,
        });
        const artifact = {
            version: '1.0',
            feature,
            action: options.action,
            status,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            targetPath,
            branch,
            baseRef,
            planArtifactPath,
            commands,
            commandResults,
            blockers,
            warnings,
            nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorktreeRunReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            action: options.action,
            status,
            targetPath,
            branch,
            baseRef,
            commands,
            commandResults,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async planFinish(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const targetBranch = options.targetBranch?.trim() || 'main';
        const remote = options.remote?.trim() || 'origin';
        const artifactPath = this.getFinishPlanPath(resolvedChangePath);
        const reportPath = this.getFinishPlanReportPath(resolvedChangePath);
        const blockers = [];
        const warnings = [];
        let report = null;
        try {
            report = await this.getReport(resolvedChangePath);
        }
        catch (error) {
            blockers.push(`Task graph could not be inspected: ${error?.message || error}`);
        }
        const graphStatus = report?.graphStatus || 'missing';
        let implementerStatus = 'PENDING';
        let controllerStatus = 'PENDING';
        if (report) {
            if (report.issues.length > 0) {
                blockers.push(`Task graph has issue(s): ${report.issues.join('; ')}`);
            }
            if (report.invalidTasks.length > 0) {
                blockers.push(`Task graph has ${report.invalidTasks.length} invalid task(s).`);
            }
            if (report.blockedTasks.length > 0) {
                blockers.push(`Task graph has ${report.blockedTasks.length} blocked task(s).`);
            }
            if (report.runningTasks.length > 0) {
                blockers.push(`Task graph has ${report.runningTasks.length} running task(s).`);
            }
            if (report.readyTasks.length > 0) {
                blockers.push(`Task graph still has ${report.readyTasks.length} ready but unfinished task(s).`);
            }
            if (report.taskCount === 0 || report.completedTasks.length !== report.taskCount || graphStatus.toLowerCase() !== 'completed') {
                blockers.push(`Task graph is not completed (status: ${graphStatus}).`);
            }
            const rawGraph = await this.fileService.readJSON(report.graphPath);
            const tasks = Array.isArray(rawGraph?.tasks)
                ? rawGraph.tasks.map((task, index) => normalizeTask(task, index))
                : [];
            const specReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW));
            const qualityReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW));
            implementerStatus = this.deriveImplementerWorkerStatus(tasks, report);
            controllerStatus = this.deriveControllerWorkerStatus({
                implementerStatus,
                specReviewerStatus,
                qualityReviewerStatus,
                report,
            });
        }
        const specDecision = await this.readReviewDecision(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW));
        const qualityDecision = await this.readReviewDecision(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW));
        if (!APPROVED_REVIEW_DECISIONS.has(specDecision)) {
            blockers.push(`Spec compliance review is not approved (current: ${specDecision}).`);
        }
        if (!APPROVED_REVIEW_DECISIONS.has(qualityDecision)) {
            blockers.push(`Code quality review is not approved (current: ${qualityDecision}).`);
        }
        if (specDecision === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Spec compliance review was approved with concerns; review the concerns before closeout.');
        }
        if (qualityDecision === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Code quality review was approved with concerns; review the concerns before closeout.');
        }
        if (!TERMINAL_TASK_STATUSES.has(implementerStatus)) {
            blockers.push(`Implementer status is not terminal (current: ${implementerStatus}).`);
        }
        if (controllerStatus !== 'DONE') {
            blockers.push(`Controller status is not DONE (current: ${controllerStatus}).`);
        }
        const verificationChecklistComplete = await this.isVerificationChecklistComplete(resolvedChangePath);
        if (!verificationChecklistComplete) {
            blockers.push('verification.md checklist is not complete.');
        }
        const verificationEvidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), feature);
        const tddEvidence = await this.readTddEvidence(this.getTddEvidencePath(resolvedChangePath), feature);
        const debugEvidence = await this.readDebugEvidence(this.getDebugEvidencePath(resolvedChangePath), feature);
        const checkpointEvidence = await this.readCheckpointEvidenceSnapshot(resolvedChangePath);
        const userDecisions = await this.readUserDecisionSnapshot(resolvedChangePath, feature);
        if (userDecisions.pendingRequired > 0) {
            blockers.push(`${userDecisions.pendingRequired} required user decision(s) are pending.`);
        }
        blockers.push(...userDecisions.blockers);
        warnings.push(...userDecisions.warnings);
        if (verificationEvidence.status !== 'passed') {
            blockers.push(`Latest verification evidence is not passing (current: ${verificationEvidence.status}).`);
        }
        if (tddEvidence.status === 'failed' || tddEvidence.status === 'blocked') {
            blockers.push(`TDD evidence is not ready (current: ${tddEvidence.status}).`);
        }
        else if (tddEvidence.status === 'pending' || tddEvidence.status === 'skipped') {
            warnings.push(`TDD evidence is ${tddEvidence.status}; confirm this is intentional before closeout.`);
        }
        if (debugEvidence.status === 'blocked') {
            blockers.push('Debug evidence is blocked.');
        }
        else if (debugEvidence.status === 'confirmed') {
            warnings.push('Debug evidence records a confirmed root cause without a later fixed result.');
        }
        else if (debugEvidence.status === 'skipped') {
            warnings.push('Debug evidence is skipped; confirm debugging was not applicable.');
        }
        if (checkpointEvidence.active && checkpointEvidence.status !== 'complete') {
            blockers.push(`Checkpoint evidence coverage is not complete (current: ${checkpointEvidence.status}).`);
            blockers.push(...checkpointEvidence.missing.map(item => `Checkpoint missing evidence: ${item}`));
            warnings.push(...checkpointEvidence.nextActions);
        }
        const gitRootResult = this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
        let gitRoot = null;
        let branch = null;
        let head = null;
        let statusEntries = [];
        let worktrees = [];
        let currentWorktree = null;
        let gitAvailable = !gitRootResult.error || gitRootResult.error.code !== 'ENOENT';
        let gitRepository = false;
        if (!gitRootResult.ok) {
            blockers.push('Git repository was not detected; finish commands require manual review.');
        }
        else {
            gitRepository = true;
            gitAvailable = true;
            gitRoot = path.resolve(gitRootResult.stdout.trim());
            branch = this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            head = this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            statusEntries = this.parseGitStatusEntries(this.readGitOutput(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']) || '');
            worktrees = this.parseGitWorktrees(this.readGitOutput(projectRoot, ['worktree', 'list', '--porcelain']) || '');
            currentWorktree = gitRoot ? this.findCurrentWorktree(gitRoot, worktrees) : null;
            if (statusEntries.length > 0) {
                blockers.push(`Workspace has ${statusEntries.length} uncommitted file change(s); commit, stash, or intentionally review them before closeout.`);
            }
            if (!branch) {
                blockers.push('Current git branch could not be detected; finish plan cannot determine push or merge commands safely.');
            }
            else if (branch === targetBranch) {
                warnings.push(`Current branch is already ${targetBranch}; PR/merge commands may not apply.`);
            }
            if (currentWorktree?.detached) {
                blockers.push('Current worktree is detached; switch to the intended closeout branch before finishing.');
            }
        }
        const commands = this.buildFinishPlanCommands({
            changePath: resolvedChangePath,
            projectRoot,
            currentBranch: branch,
            targetBranch,
            remote,
            currentWorktree,
            worktrees,
        });
        const finalizeCommand = commands.find(command => command.startsWith('ospec finalize '))
            || `ospec finalize ${this.quoteShellArg(this.toProjectRelativeChangePath(projectRoot, resolvedChangePath))}`;
        const decisionPrompts = this.buildFinishDecisionPrompts({
            changePath: resolvedChangePath,
            projectRoot,
            currentBranch: branch,
            targetBranch,
            remote,
            currentWorktree,
        });
        const status = !gitRepository
            ? 'unknown'
            : blockers.length > 0
                ? 'blocked'
                : 'ready';
        const artifact = {
            version: '1.0',
            feature,
            status,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            targetBranch,
            remote,
            commands,
            decisionPrompts,
            readiness: {
                taskGraph: graphStatus,
                implementer: implementerStatus,
                specReview: specDecision,
                qualityReview: qualityDecision,
                controller: controllerStatus,
                pendingRequiredDecisions: userDecisions.pendingRequired,
                verificationChecklistComplete,
                verificationEvidence: verificationEvidence.status,
                tddEvidence: tddEvidence.status,
                debugEvidence: debugEvidence.status,
                checkpointEvidence: checkpointEvidence.status,
            },
            checkpointEvidence,
            git: {
                available: gitAvailable,
                repository: gitRepository,
                root: gitRoot,
                branch,
                head,
                dirty: statusEntries.length > 0,
                statusEntries,
                worktrees,
                currentWorktree,
            },
            blockers,
            warnings,
            nextInstruction: this.getFinishPlanNextInstruction(status, finalizeCommand),
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildFinishPlanReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status,
            checkpointEvidence,
            targetBranch,
            remote,
            commands,
            decisionPrompts,
            blockers,
            warnings,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async routeWorkflow(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        await this.bootstrap(resolvedChangePath);
        const bootstrapArtifact = await this.fileService.readJSON(this.getBootstrapPath(resolvedChangePath));
        const recommendations = this.buildWorkflowRouteRecommendations(bootstrapArtifact);
        const blockers = [...bootstrapArtifact.blockers];
        const warnings = [...bootstrapArtifact.warnings];
        const status = blockers.length > 0
            ? 'blocked'
            : recommendations.length > 0
                ? 'ready'
                : 'unknown';
        const nextInstruction = recommendations[0]?.command
            ? `Run ${recommendations[0].command}`
            : recommendations[0]?.reason || bootstrapArtifact.nextInstruction;
        const artifactPath = this.getWorkflowRoutePath(resolvedChangePath);
        const reportPath = this.getWorkflowRouteReportPath(resolvedChangePath);
        const artifact = {
            version: '1.0',
            feature,
            status,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            recommendations,
            blockers,
            warnings,
            nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorkflowRouteReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status,
            recommendations,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async bootstrap(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const artifactPath = this.getBootstrapPath(resolvedChangePath);
        const reportPath = this.getBootstrapReportPath(resolvedChangePath);
        const blockers = [];
        const warnings = [];
        const documents = {
            proposal: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.PROPOSAL),
            design: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.DESIGN),
            implementationPlan: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN),
            tasks: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.TASKS, { allowUncheckedChecklist: true }),
            verification: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.VERIFICATION, { checklistRequired: true }),
        };
        let report = null;
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graphExists = await this.fileService.exists(graphPath);
        const graphIssues = [];
        if (graphExists) {
            try {
                report = await this.getReport(resolvedChangePath);
            }
            catch (error) {
                graphIssues.push(`Task graph could not be inspected: ${error?.message || error}`);
            }
        }
        let tasks = [];
        if (report) {
            const rawGraph = await this.fileService.readJSON(report.graphPath);
            tasks = Array.isArray(rawGraph?.tasks)
                ? rawGraph.tasks.map((task, index) => normalizeTask(task, index))
                : [];
        }
        const specDecision = await this.readReviewDecision(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW));
        const qualityDecision = await this.readReviewDecision(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW));
        const specReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW));
        const qualityReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW));
        const verificationChecklistComplete = await this.isVerificationChecklistComplete(resolvedChangePath);
        const verificationEvidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), feature);
        const tddEvidence = await this.readTddEvidence(this.getTddEvidencePath(resolvedChangePath), feature);
        const debugEvidence = await this.readDebugEvidence(this.getDebugEvidencePath(resolvedChangePath), feature);
        const checkpointEvidence = await this.readCheckpointEvidenceSnapshot(resolvedChangePath);
        const implementerStatus = report
            ? this.deriveImplementerWorkerStatus(tasks, report)
            : 'PENDING';
        const controllerStatus = report
            ? this.deriveControllerWorkerStatus({
                implementerStatus,
                specReviewerStatus,
                qualityReviewerStatus,
                report,
            })
            : 'PENDING';
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const sessionExists = await this.fileService.exists(sessionPath);
        const session = await this.readSession(sessionPath, feature);
        const activeDispatches = session.dispatches.filter(dispatch => dispatch.status === 'DISPATCHED');
        const workspace = await this.readBootstrapPlanSnapshot(this.getWorkspaceStatusPath(resolvedChangePath));
        const worktree = await this.readBootstrapPlanSnapshot(this.getWorktreePlanPath(resolvedChangePath));
        const finish = await this.readBootstrapPlanSnapshot(this.getFinishPlanPath(resolvedChangePath));
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const userDecisions = await this.readUserDecisionSnapshot(resolvedChangePath, feature);
        const execution = {
            projectSession,
            taskGraph: {
                exists: graphExists,
                path: graphPath,
                status: report?.graphStatus || (graphExists ? 'unknown' : 'missing'),
                taskCount: report?.taskCount || 0,
                ready: report?.readyTasks.length || 0,
                dispatchable: report?.dispatchableTasks.length || 0,
                running: report?.runningTasks.length || 0,
                completed: report?.completedTasks.length || 0,
                blocked: report?.blockedTasks.length || 0,
                invalid: report?.invalidTasks.length || 0,
                issues: report ? report.issues : graphIssues,
                nextInstruction: report?.nextInstruction || (graphExists
                    ? 'Fix task graph readability before continuing.'
                    : 'Create artifacts/agents/task-graph.json from implementation-plan.md.'),
            },
            session: {
                exists: sessionExists,
                path: sessionPath,
                status: sessionExists ? session.status : 'missing',
                dispatchCount: session.dispatches.length,
                activeDispatchCount: activeDispatches.length,
                activeDispatches: activeDispatches.map(dispatch => ({
                    id: dispatch.id,
                    taskId: dispatch.taskId,
                    status: dispatch.status,
                    target: this.normalizeWorkerToolTarget(dispatch.workerProfile?.targetToolMapping?.target || dispatch.workerProfile?.recommendedTarget),
                    packetPath: dispatch.packetPath,
                })),
                latestDispatches: session.dispatches.slice(-5).map(dispatch => ({
                    taskId: dispatch.taskId,
                    status: dispatch.status,
                    summary: dispatch.summary,
                })),
            },
            workspace,
            worktree,
            finish,
            decisions: userDecisions,
            reviews: {
                spec: specDecision,
                quality: qualityDecision,
            },
            evidence: {
                verification: verificationEvidence.status,
                verificationRecords: verificationEvidence.records.length,
                tdd: tddEvidence.status,
                tddRecords: tddEvidence.records.length,
                debug: debugEvidence.status,
                debugRecords: debugEvidence.records.length,
                debugPhases: debugEvidence.phases,
                checkpoint: checkpointEvidence,
            },
            worker: {
                implementer: implementerStatus,
                specReviewer: specReviewerStatus,
                qualityReviewer: qualityReviewerStatus,
                controller: controllerStatus,
                verificationChecklistComplete,
            },
        };
        warnings.push(...projectSession.warnings);
        warnings.push(...userDecisions.warnings);
        const decision = this.deriveBootstrapDecision({
            changePath: resolvedChangePath,
            projectRoot,
            documents,
            execution,
        });
        blockers.push(...decision.blockers);
        warnings.push(...decision.warnings);
        const artifact = {
            version: '1.0',
            feature,
            status: decision.status,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            documents,
            execution,
            blockers,
            warnings,
            nextInstruction: decision.nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildBootstrapReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status: artifact.status,
            checkpointEvidence,
            blockers,
            warnings,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async handoff(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const target = this.normalizeHandoffTarget(options.target);
        const generatedAt = new Date().toISOString();
        const artifactPath = this.getHandoffPath(resolvedChangePath);
        const reportPath = this.getHandoffReportPath(resolvedChangePath);
        const relativeChangePath = this.toProjectRelativeChangePath(projectRoot, resolvedChangePath);
        const warnings = [];
        let report = null;
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graphExists = await this.fileService.exists(graphPath);
        if (graphExists) {
            try {
                report = await this.getReport(resolvedChangePath);
            }
            catch (error) {
                warnings.push(`Task graph could not be inspected: ${error?.message || error}`);
            }
        }
        else {
            warnings.push('Task graph is missing; worker dispatch is not ready.');
        }
        const bootstrapPath = this.getBootstrapPath(resolvedChangePath);
        if (!(await this.fileService.exists(bootstrapPath))) {
            warnings.push('Bootstrap snapshot is missing; run ospec execute bootstrap before relying on this handoff.');
        }
        const documents = await this.buildHandoffDocumentSnapshot(resolvedChangePath);
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        warnings.push(...projectSession.warnings);
        const artifacts = await this.buildHandoffArtifactSnapshot(resolvedChangePath, artifactPath);
        const taskGraph = {
            exists: graphExists,
            status: report?.graphStatus || (graphExists ? 'unknown' : 'missing'),
            taskCount: report?.taskCount || 0,
            dispatchable: report?.dispatchableTasks.length || 0,
            running: report?.runningTasks.length || 0,
            blocked: report?.blockedTasks.length || 0,
            invalid: report?.invalidTasks.length || 0,
            nextInstruction: report?.nextInstruction || 'Create artifacts/agents/task-graph.json from implementation-plan.md before dispatch.',
        };
        const workerProfiles = report
            ? [...report.dispatchableTasks, ...report.runningTasks].map(task => ({
                taskId: task.id,
                taskTitle: task.title,
                workerRole: task.workerRole,
                profile: task.workerProfile,
            }))
            : [];
        const toolMapping = this.buildHandoffToolMapping(target);
        const commandSequence = this.buildHandoffCommandSequence(relativeChangePath, target);
        const safetyRules = this.buildHandoffSafetyRules(target);
        const nextInstruction = this.getHandoffNextInstruction(relativeChangePath, taskGraph);
        const artifact = {
            version: '1.0',
            feature,
            target,
            generatedAt,
            changePath: resolvedChangePath,
            projectRoot,
            documents,
            projectSession,
            artifacts,
            taskGraph,
            workerProfiles,
            toolMapping,
            commandSequence,
            safetyRules,
            warnings,
            nextInstruction,
        };
        await this.fileService.writeJSON(artifactPath, artifact);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildHandoffReport(artifact));
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            target,
            warnings,
            nextInstruction,
        };
    }
    selectDispatchableTasks(readyTasks, runningTasks) {
        const safeReadyTasks = readyTasks.filter(task => runningTasks.every(runningTask => !tasksConflict(task, runningTask)));
        if (runningTasks.length > 0) {
            return this.selectNonConflictingBatch(safeReadyTasks.filter(task => task.parallelizable));
        }
        const parallelReadyTasks = safeReadyTasks.filter(task => task.parallelizable);
        if (parallelReadyTasks.length > 0) {
            return this.selectNonConflictingBatch(parallelReadyTasks);
        }
        return safeReadyTasks.slice(0, 1);
    }
    selectNonConflictingBatch(tasks) {
        const selectedTasks = [];
        for (const task of tasks) {
            if (selectedTasks.every(selectedTask => !tasksConflict(task, selectedTask))) {
                selectedTasks.push(task);
            }
        }
        return selectedTasks;
    }
    getFirstRequiredTaskReviewStage(task) {
        if (!task.review) {
            return null;
        }
        if (!APPROVED_REVIEW_DECISIONS.has(task.review.spec)) {
            return 'spec';
        }
        if (!APPROVED_REVIEW_DECISIONS.has(task.review.quality)) {
            return 'quality';
        }
        return null;
    }
    getBlockedTaskReviewInstruction(blockedTasks) {
        for (const blocked of blockedTasks) {
            for (const reason of blocked.reasons) {
                const match = reason.match(/^waiting_for_task_(spec|quality)_review:(.+)$/);
                if (match) {
                    return `Run ospec execute review [change-path] --task ${match[2]} --stage ${match[1]} before dispatching dependent work.`;
                }
            }
        }
        return null;
    }
    getNextInstruction(input) {
        if (input.issues.length > 0 || input.invalidTasks.length > 0) {
            return 'Fix task graph schema and execution details before dispatch.';
        }
        if (input.decisions.pendingRequired > 0 || input.decisions.blockers.length > 0) {
            return input.decisions.nextInstruction;
        }
        if (input.dispatchableTasks.length > 0) {
            return `Dispatch next task(s): ${input.dispatchableTasks.map(task => task.id).join(', ')}`;
        }
        if (input.runningTasks.length > 0) {
            return `Continue in-progress task(s): ${input.runningTasks.map(task => task.id).join(', ')}`;
        }
        const taskReviewInstruction = this.getBlockedTaskReviewInstruction(input.blockedTasks);
        if (taskReviewInstruction) {
            return taskReviewInstruction;
        }
        if (input.completedTasks.length === input.taskCount && input.taskCount > 0) {
            if (input.checkpointEvidence.active && input.checkpointEvidence.status !== 'complete') {
                return input.checkpointEvidence.nextActions[0] || 'Complete Checkpoint evidence coverage before finish or archive.';
            }
            return 'Task graph is complete. Continue with review, verification, and archive gates.';
        }
        if (input.blockedTasks.length > 0) {
            return 'Resolve blocked tasks or missing context before dispatch.';
        }
        return 'No dispatchable tasks found.';
    }
    async readCheckpointEvidenceSnapshot(changePath) {
        const gatePath = path.join(changePath, 'artifacts', 'checkpoint', 'gate.json');
        const resultPath = path.join(changePath, 'artifacts', 'checkpoint', 'result.json');
        const summaryPath = path.join(changePath, 'artifacts', 'checkpoint', 'summary.md');
        const activeSteps = await this.readActiveCheckpointSteps(changePath);
        const emptyCounts = {
            screenshots: 0,
            traces: 0,
            visualDiffs: 0,
            routes: 0,
            flows: 0,
            assertions: 0,
            consoleEvents: 0,
            networkEvents: 0,
            accessibility: 0,
        };
        if (activeSteps.length === 0) {
            return {
                active: false,
                status: 'not_active',
                gatePath,
                resultPath,
                summaryPath,
                activeSteps: [],
                gateStatus: 'not_active',
                evidenceStatus: 'not_active',
                ...emptyCounts,
                missing: [],
                nextActions: [],
                steps: [],
            };
        }
        if (!(await this.fileService.exists(gatePath))) {
            const missing = ['artifacts/checkpoint/gate.json'];
            return {
                active: true,
                status: 'missing',
                gatePath,
                resultPath,
                summaryPath,
                activeSteps,
                gateStatus: 'missing',
                evidenceStatus: 'missing',
                ...emptyCounts,
                missing,
                nextActions: this.buildCheckpointEvidenceNextActions(missing, activeSteps),
                steps: activeSteps.map(step => ({
                    step,
                    gateStatus: 'missing',
                    evidenceStatus: 'missing',
                    ...emptyCounts,
                    missing: ['gate artifact'],
                })),
            };
        }
        const gate = await this.fileService.readJSON(gatePath);
        const evidence = gate?.evidence && typeof gate.evidence === 'object' && !Array.isArray(gate.evidence)
            ? gate.evidence
            : {};
        const toNumber = (value) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
        };
        const readStep = (step) => {
            const stepGateStatus = typeof gate?.steps?.[step]?.status === 'string' ? gate.steps[step].status : 'missing';
            const stepEvidence = evidence?.by_step?.[step] && typeof evidence.by_step[step] === 'object'
                ? evidence.by_step[step]
                : {};
            return {
                step,
                gateStatus: stepGateStatus,
                evidenceStatus: typeof stepEvidence.status === 'string' ? stepEvidence.status : 'missing',
                screenshots: toNumber(stepEvidence.screenshots),
                traces: toNumber(stepEvidence.traces),
                visualDiffs: toNumber(stepEvidence.visual_diffs ?? stepEvidence.visualDiffs),
                routes: toNumber(stepEvidence.routes),
                flows: toNumber(stepEvidence.flows),
                assertions: toNumber(stepEvidence.assertions),
                consoleEvents: toNumber(stepEvidence.console_events ?? stepEvidence.consoleEvents),
                networkEvents: toNumber(stepEvidence.network_events ?? stepEvidence.networkEvents),
                accessibility: toNumber(stepEvidence.accessibility),
                missing: Array.isArray(stepEvidence.missing)
                    ? stepEvidence.missing.map(item => String(item || '').trim()).filter(Boolean)
                    : [],
            };
        };
        const steps = activeSteps.map(readStep);
        const missing = Array.from(new Set([
            ...(Array.isArray(evidence.missing) ? evidence.missing.map(item => String(item || '').trim()).filter(Boolean) : []),
            ...steps.flatMap(step => step.missing.map(item => `${step.step}: ${item}`)),
            ...(gate.status === 'passed' ? [] : [`gate status ${gate.status || 'missing'}`]),
            ...(String(evidence.status || '') === 'complete' ? [] : [`evidence status ${evidence.status || 'missing'}`]),
        ]));
        const status = gate.status !== 'passed'
            ? 'failed'
            : String(evidence.status || '') === 'complete' && steps.every(step => step.evidenceStatus === 'complete')
                ? 'complete'
                : 'incomplete';
        return {
            active: true,
            status,
            gatePath,
            resultPath,
            summaryPath,
            activeSteps,
            gateStatus: typeof gate.status === 'string' ? gate.status : 'missing',
            evidenceStatus: typeof evidence.status === 'string' ? evidence.status : 'missing',
            screenshots: toNumber(evidence.screenshots),
            traces: toNumber(evidence.traces),
            visualDiffs: toNumber(evidence.visual_diffs ?? evidence.visualDiffs),
            routes: toNumber(evidence.routes),
            flows: toNumber(evidence.flows),
            assertions: toNumber(evidence.assertions),
            consoleEvents: toNumber(evidence.console_events ?? evidence.consoleEvents),
            networkEvents: toNumber(evidence.network_events ?? evidence.networkEvents),
            accessibility: toNumber(evidence.accessibility),
            missing,
            nextActions: this.buildCheckpointEvidenceNextActions(missing, activeSteps),
            steps,
        };
    }
    async readActiveCheckpointSteps(changePath) {
        const verificationPath = path.join(changePath, constants_1.FILE_NAMES.VERIFICATION);
        if (!(await this.fileService.exists(verificationPath))) {
            return [];
        }
        try {
            const verification = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(verificationPath));
            const optionalSteps = Array.isArray(verification.data.optional_steps)
                ? verification.data.optional_steps
                : [];
            return optionalSteps
                .map(step => String(step || '').trim())
                .filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
        }
        catch {
            return [];
        }
    }
    buildCheckpointEvidenceNextActions(missing, activeSteps) {
        const normalized = missing.map(item => item.toLowerCase());
        const actions = [];
        const add = (action) => {
            if (!actions.includes(action)) {
                actions.push(action);
            }
        };
        if (normalized.some(item => item.includes('gate'))) {
            add('Run `ospec plugins run checkpoint <change-path>` to create artifacts/checkpoint/gate.json, result.json, and summary.md.');
        }
        if (activeSteps.includes('checkpoint_ui_review') && normalized.some(item => item.includes('route'))) {
            add('Add changed pages to `.ospec/plugins/checkpoint/routes.yaml` with required selectors and viewport coverage.');
        }
        if (activeSteps.includes('checkpoint_flow_check') && normalized.some(item => item.includes('flow'))) {
            add('Add critical user paths to `.ospec/plugins/checkpoint/flows.yaml` with screenshots and assertions.');
        }
        if (normalized.some(item => item.includes('visual') || item.includes('baseline'))) {
            add('Add or refresh visual baselines under `.ospec/plugins/checkpoint/baselines/`, then rerun Checkpoint.');
        }
        if (normalized.some(item => item.includes('screenshot'))) {
            add('Configure route screenshots or flow `screenshot` steps, then rerun Checkpoint.');
        }
        if (normalized.some(item => item.includes('trace'))) {
            add('Rerun Checkpoint with the Playwright adapter so trace artifacts are written under `artifacts/checkpoint/traces/`.');
        }
        if (normalized.some(item => item.includes('assertion'))) {
            add('Add flow assertions such as `assert_text`, `assert_url`, `api_assertions`, or `assert_command`.');
        }
        if (normalized.some(item => item.includes('console') || item.includes('network'))) {
            add('Enable console/network capture in Checkpoint evidence and rerun the gate.');
        }
        if (normalized.some(item => item.includes('accessibility') || item.includes('landmark') || item.includes('focus') || item.includes('keyboard'))) {
            add('Add accessibility expectations such as landmarks, visible names, focus, keyboard reachability, or contrast checks.');
        }
        if (actions.length === 0 && activeSteps.length > 0) {
            add('Inspect `artifacts/checkpoint/summary.md`, complete missing runtime evidence, then rerun Checkpoint.');
        }
        return actions;
    }
    getSessionPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', EXECUTION_SESSION_FILE);
    }
    getProjectSessionBriefPath(projectRoot) {
        return path.join(projectRoot, '.ospec', 'session-brief.json');
    }
    getProjectSessionBriefReportPath(projectRoot) {
        return path.join(projectRoot, '.ospec', 'session-brief.md');
    }
    getWorkspaceStatusPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKSPACE_STATUS_FILE);
    }
    getWorkspaceStatusReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKSPACE_STATUS_REPORT_FILE);
    }
    getWorktreePlanPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKTREE_PLAN_FILE);
    }
    getWorktreePlanReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKTREE_PLAN_REPORT_FILE);
    }
    getWorktreeRunDir(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKTREE_RUNS_DIR);
    }
    getOrchestrationRunDir(changePath) {
        return path.join(changePath, 'artifacts', 'agents', ORCHESTRATION_RUNS_DIR);
    }
    getVerificationEvidencePath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_FILE);
    }
    getTddEvidencePath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', TDD_EVIDENCE_FILE);
    }
    getDebugEvidencePath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', DEBUG_EVIDENCE_FILE);
    }
    getFinishPlanPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', FINISH_PLAN_FILE);
    }
    getFinishPlanReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', FINISH_PLAN_REPORT_FILE);
    }
    getWorkflowRoutePath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKFLOW_ROUTE_FILE);
    }
    getWorkflowRouteReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', WORKFLOW_ROUTE_REPORT_FILE);
    }
    getBootstrapPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', BOOTSTRAP_FILE);
    }
    getBootstrapReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', BOOTSTRAP_REPORT_FILE);
    }
    getHandoffPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', HANDOFF_FILE);
    }
    getHandoffReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', HANDOFF_REPORT_FILE);
    }
    getLaunchPlanPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', LAUNCH_PLAN_FILE);
    }
    getLaunchPlanReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', LAUNCH_PLAN_REPORT_FILE);
    }
    getReviewFeedbackPlanPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', REVIEW_FEEDBACK_PLAN_FILE);
    }
    getReviewFeedbackPlanReportPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', REVIEW_FEEDBACK_PLAN_REPORT_FILE);
    }
    getUserDecisionDir(changePath) {
        return path.join(changePath, 'artifacts', 'agents', DECISIONS_DIR);
    }
    getUserDecisionRecordPath(changePath, id) {
        return path.join(this.getUserDecisionDir(changePath), `${this.toFileSafeId(id)}.json`);
    }
    getUserDecisionReportPath(changePath, id) {
        return path.join(this.getUserDecisionDir(changePath), `${this.toFileSafeId(id)}.md`);
    }
    getUserDecisionIndexPath(changePath) {
        return path.join(this.getUserDecisionDir(changePath), DECISIONS_INDEX_FILE);
    }
    getUserDecisionIndexReportPath(changePath) {
        return path.join(this.getUserDecisionDir(changePath), DECISIONS_INDEX_REPORT_FILE);
    }
    async readUserDecisionRecord(recordPath) {
        if (!(await this.fileService.exists(recordPath))) {
            return null;
        }
        const raw = await this.fileService.readJSON(recordPath);
        return this.normalizeUserDecisionRecord(raw, recordPath);
    }
    async readUserDecisionSnapshot(changePath, feature) {
        const dirPath = this.getUserDecisionDir(changePath);
        const indexPath = this.getUserDecisionIndexPath(changePath);
        const indexReportPath = this.getUserDecisionIndexReportPath(changePath);
        const exists = await this.fileService.exists(dirPath);
        const decisions = [];
        const blockers = [];
        const warnings = [];
        if (exists) {
            const entries = await this.fileService.readDir(dirPath);
            for (const entry of entries.filter(item => item.endsWith('.json') && item !== DECISIONS_INDEX_FILE).sort()) {
                const recordPath = path.join(dirPath, entry);
                try {
                    const record = await this.readUserDecisionRecord(recordPath);
                    if (!record) {
                        continue;
                    }
                    decisions.push({
                        id: record.id,
                        status: record.status,
                        required: record.required,
                        question: record.question,
                        recommendedOptionId: record.recommendedOptionId,
                        selectedOptionId: record.selectedOptionId,
                        reportPath: record.reportPath || this.toChangeRelativePath(changePath, this.getUserDecisionReportPath(changePath, record.id)),
                    });
                }
                catch (error) {
                    blockers.push(`Decision artifact ${entry} could not be read: ${error?.message || error}`);
                    decisions.push({
                        id: entry.replace(/\.json$/u, ''),
                        status: 'INVALID',
                        required: true,
                        question: 'Invalid decision artifact',
                        recommendedOptionId: null,
                        selectedOptionId: null,
                        reportPath: this.toChangeRelativePath(changePath, recordPath),
                    });
                }
            }
        }
        const pendingRequired = decisions.filter(item => item.status === 'PENDING' && item.required).length;
        const pendingOptional = decisions.filter(item => item.status === 'PENDING' && !item.required).length;
        const selected = decisions.filter(item => item.status === 'SELECTED').length;
        const skipped = decisions.filter(item => item.status === 'SKIPPED').length;
        if (pendingOptional > 0) {
            warnings.push(`${pendingOptional} optional user decision(s) are still pending.`);
        }
        const pendingIds = decisions
            .filter(item => item.status === 'PENDING' && item.required)
            .map(item => item.id);
        const nextInstruction = pendingRequired > 0
            ? `Ask the user to choose required decision(s): ${pendingIds.join(', ')}. Record the answer with ospec execute decision [change-path] --id <id> --select <option-id>.`
            : decisions.length > 0
                ? 'No required user decisions are pending. Continue with bootstrap, workspace, dispatch, review, or verification as appropriate.'
                : 'No user decisions are recorded for this change.';
        return {
            exists,
            dirPath,
            indexPath: this.toChangeRelativePath(changePath, indexPath),
            indexReportPath: this.toChangeRelativePath(changePath, indexReportPath),
            total: decisions.length,
            pendingRequired,
            pendingOptional,
            selected,
            skipped,
            decisions,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async writeUserDecisionIndex(changePath, feature, snapshot) {
        const artifact = {
            version: '1.0',
            feature,
            generatedAt: new Date().toISOString(),
            changePath,
            total: snapshot.total,
            pendingRequired: snapshot.pendingRequired,
            pendingOptional: snapshot.pendingOptional,
            selected: snapshot.selected,
            skipped: snapshot.skipped,
            decisions: snapshot.decisions,
            blockers: snapshot.blockers,
            warnings: snapshot.warnings,
            nextInstruction: snapshot.nextInstruction,
        };
        await this.fileService.writeJSON(this.getUserDecisionIndexPath(changePath), artifact);
        await this.writeLocalizedReportFile(changePath, this.getUserDecisionIndexReportPath(changePath), this.buildUserDecisionIndexReport(artifact));
    }
    normalizeUserDecisionRecord(raw, recordPath) {
        const id = this.toFileSafeId(typeof raw?.id === 'string' ? raw.id : path.basename(recordPath, '.json'));
        const statusValue = String(raw?.status || 'PENDING').toUpperCase();
        const status = statusValue === 'SELECTED'
            ? 'SELECTED'
            : statusValue === 'SKIPPED'
                ? 'SKIPPED'
                : 'PENDING';
        return {
            version: typeof raw?.version === 'string' ? raw.version : '1.0',
            feature: typeof raw?.feature === 'string' ? raw.feature : '',
            id,
            status,
            required: raw?.required !== false,
            question: typeof raw?.question === 'string' ? raw.question.trim() : '',
            options: this.normalizeUserDecisionOptions(Array.isArray(raw?.options) ? raw.options : []),
            recommendedOptionId: typeof raw?.recommendedOptionId === 'string' && raw.recommendedOptionId.trim()
                ? raw.recommendedOptionId.trim()
                : null,
            selectedOptionId: typeof raw?.selectedOptionId === 'string' && raw.selectedOptionId.trim()
                ? raw.selectedOptionId.trim()
                : null,
            summary: typeof raw?.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : null,
            createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
            updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
            selectedAt: typeof raw?.selectedAt === 'string' && raw.selectedAt.trim() ? raw.selectedAt.trim() : null,
            recordPath: typeof raw?.recordPath === 'string' ? raw.recordPath : recordPath,
            reportPath: typeof raw?.reportPath === 'string' ? raw.reportPath : recordPath.replace(/\.json$/u, '.md'),
            nextInstruction: typeof raw?.nextInstruction === 'string' ? raw.nextInstruction : '',
        };
    }
    normalizeUserDecisionOptions(options) {
        const seen = new Set();
        const normalized = [];
        for (const option of options) {
            const id = this.toFileSafeId(option.id || option.label);
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            normalized.push({
                id,
                label: String(option.label || id).trim(),
                description: String(option.description || '').trim(),
            });
        }
        return normalized;
    }
    getUserDecisionNextInstruction(changePath, projectRoot, record) {
        const relativeChangePath = this.toProjectRelativeChangePath(projectRoot, changePath);
        if (record.status === 'PENDING') {
            const optionText = record.options.length > 0
                ? ` Choose one of: ${record.options.map(option => option.id).join(', ')}.`
                : '';
            return `Ask the user to decide "${record.question}".${optionText} Then run ospec execute decision ${this.quoteShellArg(relativeChangePath)} --id ${this.quoteShellArg(record.id)} --select <option-id>.`;
        }
        return `Decision ${record.id} is ${record.status}. Run ospec execute bootstrap ${this.quoteShellArg(relativeChangePath)} to continue with the next safe action.`;
    }
    async readVerificationEvidence(evidencePath, feature) {
        if (!(await this.fileService.exists(evidencePath))) {
            return {
                version: '1.0',
                feature,
                status: 'pending',
                updatedAt: new Date().toISOString(),
                records: [],
            };
        }
        const evidence = await this.fileService.readJSON(evidencePath);
        const records = Array.isArray(evidence.records)
            ? evidence.records.filter(record => this.isVerificationEvidenceRecord(record))
            : [];
        return {
            version: typeof evidence.version === 'string' ? evidence.version : '1.0',
            feature: typeof evidence.feature === 'string' && evidence.feature.trim() ? evidence.feature : feature,
            status: this.isVerificationEvidenceSessionStatus(evidence.status) ? evidence.status : this.deriveVerificationEvidenceStatus(records),
            updatedAt: typeof evidence.updatedAt === 'string' ? evidence.updatedAt : new Date().toISOString(),
            records,
        };
    }
    isVerificationEvidenceSessionStatus(status) {
        return status === 'pending' || status === 'passed' || status === 'failed' || status === 'blocked' || status === 'skipped';
    }
    isVerificationEvidenceRecord(value) {
        return typeof value?.id === 'string'
            && typeof value?.command === 'string'
            && this.isVerificationEvidenceStatus(value?.status)
            && typeof value?.recordedAt === 'string'
            && typeof value?.recordPath === 'string'
            && typeof value?.reportPath === 'string';
    }
    isVerificationEvidenceStatus(status) {
        return status === 'PASSED' || status === 'FAILED' || status === 'BLOCKED' || status === 'SKIPPED';
    }
    async readTddEvidence(evidencePath, feature) {
        if (!(await this.fileService.exists(evidencePath))) {
            return {
                version: '1.0',
                feature,
                status: 'pending',
                updatedAt: new Date().toISOString(),
                records: [],
            };
        }
        const evidence = await this.fileService.readJSON(evidencePath);
        const records = Array.isArray(evidence.records)
            ? evidence.records.filter(record => this.isTddEvidenceRecord(record))
            : [];
        return {
            version: typeof evidence.version === 'string' ? evidence.version : '1.0',
            feature: typeof evidence.feature === 'string' && evidence.feature.trim() ? evidence.feature : feature,
            status: this.deriveTddEvidenceStatus(records),
            updatedAt: typeof evidence.updatedAt === 'string' ? evidence.updatedAt : new Date().toISOString(),
            records,
        };
    }
    isTddEvidenceSessionStatus(status) {
        return status === 'pending'
            || status === 'red'
            || status === 'green'
            || status === 'refactor'
            || status === 'failed'
            || status === 'blocked'
            || status === 'skipped';
    }
    isTddEvidenceRecord(value) {
        return typeof value?.id === 'string'
            && this.isTddEvidencePhase(value?.phase)
            && typeof value?.command === 'string'
            && this.isVerificationEvidenceStatus(value?.status)
            && typeof value?.recordedAt === 'string'
            && typeof value?.recordPath === 'string'
            && typeof value?.reportPath === 'string';
    }
    isTddEvidencePhase(phase) {
        return phase === 'red' || phase === 'green' || phase === 'refactor';
    }
    isDebugEvidencePhase(phase) {
        return phase === 'reproduce'
            || phase === 'isolate'
            || phase === 'hypothesize'
            || phase === 'fix'
            || phase === 'verify';
    }
    async readDebugEvidence(evidencePath, feature) {
        if (!(await this.fileService.exists(evidencePath))) {
            const records = [];
            return {
                version: '1.0',
                feature,
                status: 'pending',
                updatedAt: new Date().toISOString(),
                phases: this.buildDebugEvidencePhaseSnapshots(records),
                records: [],
            };
        }
        const evidence = await this.fileService.readJSON(evidencePath);
        const records = Array.isArray(evidence.records)
            ? evidence.records
                .filter(record => this.isDebugEvidenceRecord(record))
                .map(record => this.normalizeDebugEvidenceRecord(record))
            : [];
        return {
            version: typeof evidence.version === 'string' ? evidence.version : '1.0',
            feature: typeof evidence.feature === 'string' && evidence.feature.trim() ? evidence.feature : feature,
            status: this.isDebugEvidenceSessionStatus(evidence.status) ? evidence.status : this.deriveDebugEvidenceStatus(records),
            updatedAt: typeof evidence.updatedAt === 'string' ? evidence.updatedAt : new Date().toISOString(),
            phases: this.buildDebugEvidencePhaseSnapshots(records),
            records,
        };
    }
    isDebugEvidenceSessionStatus(status) {
        return status === 'pending'
            || status === 'confirmed'
            || status === 'fixed'
            || status === 'blocked'
            || status === 'skipped';
    }
    isDebugEvidenceRecord(value) {
        return typeof value?.id === 'string'
            && typeof value?.symptom === 'string'
            && this.isDebugEvidenceStatus(value?.status)
            && typeof value?.recordedAt === 'string'
            && typeof value?.recordPath === 'string'
            && typeof value?.reportPath === 'string';
    }
    normalizeDebugEvidenceRecord(value) {
        const status = this.isDebugEvidenceStatus(value.status)
            ? value.status
            : this.normalizeDebugEvidenceStatus(value.status);
        const phase = this.isDebugEvidencePhase(value.phase)
            ? value.phase
            : this.deriveDebugEvidencePhase(status, {
                hypothesis: typeof value.hypothesis === 'string' ? value.hypothesis : undefined,
                rootCause: typeof value.rootCause === 'string' ? value.rootCause : null,
                command: typeof value.command === 'string' ? value.command : undefined,
            });
        return {
            id: value.id,
            phase,
            symptom: value.symptom,
            hypothesis: typeof value.hypothesis === 'string' && value.hypothesis.trim() ? value.hypothesis : null,
            rootCause: typeof value.rootCause === 'string' && value.rootCause.trim() ? value.rootCause : null,
            command: typeof value.command === 'string' && value.command.trim() ? value.command : null,
            status,
            recordedAt: value.recordedAt,
            recordPath: value.recordPath,
            reportPath: value.reportPath,
            summary: typeof value.summary === 'string' && value.summary.trim() ? value.summary : null,
        };
    }
    isDebugEvidenceStatus(status) {
        return status === 'CONFIRMED' || status === 'FIXED' || status === 'BLOCKED' || status === 'SKIPPED';
    }
    async readReviewWorkerStatus(reviewPath) {
        if (!(await this.fileService.exists(reviewPath))) {
            return 'PENDING';
        }
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        const decision = normalizeStatus(review.data?.decision);
        if (decision === 'APPROVED') {
            return 'DONE';
        }
        if (decision === 'APPROVED_WITH_CONCERNS') {
            return 'DONE_WITH_CONCERNS';
        }
        if (decision === 'BLOCKED' || decision === 'NEEDS_CHANGES') {
            return 'BLOCKED';
        }
        return 'PENDING';
    }
    async syncTaskReviewStateFromArtifacts(changePath) {
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath))) {
            return;
        }
        const rawGraph = await this.fileService.readJSON(graphPath);
        if (!Array.isArray(rawGraph?.tasks)) {
            return;
        }
        let changed = false;
        for (const rawTask of rawGraph.tasks) {
            if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask) || !rawTask.review) {
                continue;
            }
            const taskId = typeof rawTask.id === 'string' && rawTask.id.trim().length > 0 ? rawTask.id.trim() : '';
            if (!taskId) {
                continue;
            }
            rawTask.review = typeof rawTask.review === 'object' && !Array.isArray(rawTask.review)
                ? rawTask.review
                : {};
            const specArtifact = typeof rawTask.review.spec_artifact === 'string' && rawTask.review.spec_artifact.trim().length > 0
                ? rawTask.review.spec_artifact.trim()
                : this.getTaskReviewArtifactRelativePath(taskId, 'spec');
            const qualityArtifact = typeof rawTask.review.quality_artifact === 'string' && rawTask.review.quality_artifact.trim().length > 0
                ? rawTask.review.quality_artifact.trim()
                : this.getTaskReviewArtifactRelativePath(taskId, 'quality');
            if (rawTask.review.spec_artifact !== specArtifact) {
                rawTask.review.spec_artifact = specArtifact;
                changed = true;
            }
            if (rawTask.review.quality_artifact !== qualityArtifact) {
                rawTask.review.quality_artifact = qualityArtifact;
                changed = true;
            }
            const specPath = path.join(changePath, specArtifact);
            if (await this.fileService.exists(specPath)) {
                const nextSpec = this.normalizeReviewRunDecision(await this.readReviewDecision(specPath));
                if (rawTask.review.spec !== nextSpec) {
                    rawTask.review.spec = nextSpec;
                    changed = true;
                }
            }
            const qualityPath = path.join(changePath, qualityArtifact);
            if (await this.fileService.exists(qualityPath)) {
                const nextQuality = this.normalizeReviewRunDecision(await this.readReviewDecision(qualityPath));
                if (rawTask.review.quality !== nextQuality) {
                    rawTask.review.quality = nextQuality;
                    changed = true;
                }
            }
        }
        const nextStatus = this.deriveGraphStatus(rawGraph);
        if (rawGraph.status !== nextStatus) {
            rawGraph.status = nextStatus;
            changed = true;
        }
        if (changed) {
            await this.fileService.writeJSON(graphPath, rawGraph);
        }
    }
    async readReviewDecision(reviewPath) {
        if (!(await this.fileService.exists(reviewPath))) {
            return 'PENDING';
        }
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        return normalizeStatus(review.data?.decision) || 'PENDING';
    }
    selectNextReviewStage(specDecision, qualityDecision) {
        if (!APPROVED_REVIEW_DECISIONS.has(specDecision)) {
            return 'spec';
        }
        if (!APPROVED_REVIEW_DECISIONS.has(qualityDecision)) {
            return 'quality';
        }
        throw new Error('Spec compliance and code quality reviews are already approved. Continue with verification and archive gates.');
    }
    selectNextReviewFeedbackStage(specDecision, qualityDecision) {
        if (specDecision !== 'APPROVED' && specDecision !== 'APPROVED_WITH_CONCERNS') {
            return 'spec';
        }
        if (qualityDecision !== 'APPROVED' && qualityDecision !== 'APPROVED_WITH_CONCERNS') {
            return 'quality';
        }
        return 'quality';
    }
    deriveReviewFeedbackAction(decision) {
        if (decision === 'APPROVED' || decision === 'APPROVED_WITH_CONCERNS') {
            return 'accept';
        }
        if (decision === 'NEEDS_CHANGES') {
            return 'revise';
        }
        if (decision === 'BLOCKED') {
            return 'blocked';
        }
        return 'clarify';
    }
    selectNextDocumentReviewStage(designDecision) {
        return APPROVED_REVIEW_DECISIONS.has(designDecision) ? 'plan' : 'design';
    }
    getDocumentReviewTarget(stage) {
        if (stage === 'design') {
            return {
                label: 'design document review',
                documentFile: constants_1.FILE_NAMES.DESIGN,
                reviewArtifactFile: DESIGN_DOCUMENT_REVIEW_FILE,
                reviewerRole: 'design_reviewer',
            };
        }
        return {
            label: 'implementation plan review',
            documentFile: constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
            reviewArtifactFile: IMPLEMENTATION_PLAN_DOCUMENT_REVIEW_FILE,
            reviewerRole: 'implementation_plan_reviewer',
        };
    }
    getDocumentReviewArtifactPath(changePath, stage) {
        return path.join(changePath, 'artifacts', 'reviews', this.getDocumentReviewTarget(stage).reviewArtifactFile);
    }
    getTaskReviewArtifactFile(stage) {
        return stage === 'spec' ? constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW : constants_1.FILE_NAMES.CODE_QUALITY_REVIEW;
    }
    getTaskReviewArtifactRelativePath(taskId, stage) {
        return [
            'artifacts',
            'reviews',
            TASK_REVIEWS_DIR,
            this.toFileSafeId(taskId) || 'task',
            this.getTaskReviewArtifactFile(stage),
        ].join('/');
    }
    getTaskReviewArtifactPath(changePath, taskId, stage) {
        return path.join(changePath, this.getTaskReviewArtifactRelativePath(taskId, stage));
    }
    async prepareTaskReviewDispatch(changePath, report, taskId, requestedStage) {
        const task = this.flattenReportTasks(report).find(item => item.id === taskId);
        if (!task) {
            throw new Error(`Task not found in task graph: ${taskId}`);
        }
        if (!TERMINAL_TASK_STATUSES.has(task.status)) {
            throw new Error(`Cannot dispatch task review for ${taskId} until implementation is DONE or DONE_WITH_CONCERNS.`);
        }
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const rawTask = Array.isArray(rawGraph?.tasks)
            ? rawGraph.tasks.find((item) => item?.id === taskId)
            : null;
        if (!rawTask) {
            throw new Error(`Task not found in task graph: ${taskId}`);
        }
        rawTask.review = rawTask.review && typeof rawTask.review === 'object' && !Array.isArray(rawTask.review)
            ? rawTask.review
            : {};
        rawTask.review.spec_artifact = typeof rawTask.review.spec_artifact === 'string' && rawTask.review.spec_artifact.trim()
            ? rawTask.review.spec_artifact.trim()
            : this.getTaskReviewArtifactRelativePath(taskId, 'spec');
        rawTask.review.quality_artifact = typeof rawTask.review.quality_artifact === 'string' && rawTask.review.quality_artifact.trim()
            ? rawTask.review.quality_artifact.trim()
            : this.getTaskReviewArtifactRelativePath(taskId, 'quality');
        const specArtifactPath = path.join(changePath, rawTask.review.spec_artifact);
        const qualityArtifactPath = path.join(changePath, rawTask.review.quality_artifact);
        const specDecision = await this.fileService.exists(specArtifactPath)
            ? this.normalizeReviewRunDecision(await this.readReviewDecision(specArtifactPath))
            : normalizeReviewDecisionValue(rawTask.review.spec);
        const qualityDecision = await this.fileService.exists(qualityArtifactPath)
            ? this.normalizeReviewRunDecision(await this.readReviewDecision(qualityArtifactPath))
            : normalizeReviewDecisionValue(rawTask.review.quality);
        const stage = requestedStage || this.selectNextReviewStage(specDecision, qualityDecision);
        const reviewArtifactPath = stage === 'spec' ? specArtifactPath : qualityArtifactPath;
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            await this.fileService.writeFile(reviewArtifactPath, this.buildDefaultTaskReviewArtifact(report.feature, task, stage));
        }
        rawTask.review.spec = specDecision;
        rawTask.review.quality = qualityDecision;
        if (stage === 'spec' && !APPROVED_REVIEW_DECISIONS.has(specDecision)) {
            rawTask.review.spec = 'PENDING';
        }
        if (stage === 'quality' && !APPROVED_REVIEW_DECISIONS.has(qualityDecision)) {
            rawTask.review.quality = 'PENDING';
        }
        rawGraph.status = this.deriveGraphStatus(rawGraph);
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        return {
            task,
            stage,
            specDecision,
            qualityDecision,
            reviewArtifactPath,
        };
    }
    buildDefaultTaskReviewArtifact(feature, task, stage) {
        const reviewerRole = stage === 'spec' ? 'spec_compliance_reviewer' : 'code_quality_reviewer';
        const title = stage === 'spec' ? 'Task Spec Compliance Review' : 'Task Code Quality Review';
        return [
            '---',
            `feature: ${feature}`,
            `created: ${new Date().toISOString().split('T')[0]}`,
            'status: pending',
            `reviewer_role: ${reviewerRole}`,
            'decision: PENDING',
            `task_id: ${task.id}`,
            `task_title: ${task.title}`,
            'optional_steps: []',
            '---',
            '',
            `# ${title}: ${task.id}`,
            '',
            '## Task Scope',
            '',
            `- Title: ${task.title}`,
            `- Target files: ${task.targetFiles.length > 0 ? task.targetFiles.join(', ') : 'none'}`,
            `- Expected result: ${task.expectedResult || 'none'}`,
            '',
            '## Checklist',
            '',
            '- [ ] Review the task packet, changed files, and verification evidence.',
            stage === 'spec'
                ? '- [ ] Confirm the implementation satisfies this task without under-building or over-building.'
                : '- [ ] Confirm the implementation is maintainable, minimal, tested, and safe.',
            '- [ ] Record concrete findings before changing `decision`.',
            '',
        ].join('\n');
    }
    deriveImplementerWorkerStatus(tasks, report) {
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            return 'BLOCKED';
        }
        if (tasks.some(task => task.status === 'BLOCKED')) {
            return 'BLOCKED';
        }
        if (tasks.some(task => task.status === 'NEEDS_CONTEXT')) {
            return 'NEEDS_CONTEXT';
        }
        if (tasks.length === 0 || tasks.some(task => !TERMINAL_TASK_STATUSES.has(task.status))) {
            return 'PENDING';
        }
        return tasks.some(task => task.status === 'DONE_WITH_CONCERNS')
            ? 'DONE_WITH_CONCERNS'
            : 'DONE';
    }
    deriveControllerWorkerStatus(input) {
        if (input.report.issues.length > 0 || input.report.invalidTasks.length > 0) {
            return 'BLOCKED';
        }
        const statuses = [
            input.implementerStatus,
            input.specReviewerStatus,
            input.qualityReviewerStatus,
        ];
        if (statuses.includes('BLOCKED')) {
            return 'BLOCKED';
        }
        if (statuses.includes('NEEDS_CONTEXT')) {
            return 'NEEDS_CONTEXT';
        }
        return statuses.every(status => TERMINAL_TASK_STATUSES.has(status)) ? 'DONE' : 'PENDING';
    }
    deriveWorkerStatusDocumentStatus(input) {
        const statuses = [
            input.implementerStatus,
            input.specReviewerStatus,
            input.qualityReviewerStatus,
            input.controllerStatus,
        ];
        if (statuses.includes('BLOCKED')) {
            return 'blocked';
        }
        if (statuses.includes('NEEDS_CONTEXT')) {
            return 'needs_context';
        }
        if (input.controllerStatus === 'DONE') {
            return 'completed';
        }
        return input.session.dispatches.length > 0 ? 'running' : 'pending';
    }
    async isVerificationChecklistComplete(changePath) {
        const verificationPath = path.join(changePath, constants_1.FILE_NAMES.VERIFICATION);
        if (!(await this.fileService.exists(verificationPath))) {
            return false;
        }
        const verification = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(verificationPath));
        const checklistItems = verification.content.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
        const uncheckedItems = verification.content.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
        return checklistItems.length > 0 && uncheckedItems.length === 0;
    }
    async readSession(sessionPath, feature) {
        if (!(await this.fileService.exists(sessionPath))) {
            return {
                version: '1.0',
                feature,
                status: 'running',
                updatedAt: new Date().toISOString(),
                dispatches: [],
            };
        }
        const session = await this.fileService.readJSON(sessionPath);
        return {
            version: typeof session.version === 'string' ? session.version : '1.0',
            feature: typeof session.feature === 'string' && session.feature.trim() ? session.feature : feature,
            status: this.isSessionStatus(session.status) ? session.status : 'running',
            updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : new Date().toISOString(),
            dispatches: Array.isArray(session.dispatches)
                ? session.dispatches.filter(this.isDispatchRecord)
                : [],
        };
    }
    isSessionStatus(status) {
        return status === 'running' || status === 'completed' || status === 'blocked' || status === 'needs_context';
    }
    isDispatchRecord(value) {
        return typeof value?.id === 'string'
            && typeof value?.taskId === 'string'
            && typeof value?.taskTitle === 'string'
            && typeof value?.workerRole === 'string'
            && typeof value?.assignedAt === 'string';
    }
    async writeBlockerEscalation(input) {
        const escalationId = `blocker-${this.toFileSafeTimestamp(input.createdAt)}-${this.toFileSafeId(input.task.id)}`;
        const recordPath = path.join(input.changePath, 'artifacts', 'agents', BLOCKERS_DIR, `${escalationId}.json`);
        const reportPath = path.join(input.changePath, 'artifacts', 'agents', BLOCKERS_DIR, `${escalationId}.md`);
        const record = {
            id: escalationId,
            taskId: input.task.id,
            taskTitle: input.task.title,
            status: input.status,
            createdAt: input.createdAt,
            workerRole: input.task.workerRole,
            workerProfile: input.task.workerProfile,
            summary: input.summary,
            dispatchId: input.dispatch?.id ?? null,
            dispatchRecordPath: input.dispatch?.recordPath ?? null,
            taskGraphPath: this.toChangeRelativePath(input.changePath, input.report.graphPath),
            sessionPath: this.toChangeRelativePath(input.changePath, input.sessionPath),
            recordPath: this.toChangeRelativePath(input.changePath, recordPath),
            reportPath: this.toChangeRelativePath(input.changePath, reportPath),
            nextActions: input.status === 'NEEDS_CONTEXT'
                ? [
                    'Identify the missing decision, requirement, dependency, credential, fixture, or environment detail.',
                    'Ask the smallest concrete question needed to unblock the task.',
                    'After context is provided, update task graph status and dispatch or complete the task again.',
                ]
                : [
                    'Identify whether the blocker is environmental, dependency-related, conflicting work, failing verification, or a scope mismatch.',
                    'Do not guess or mark the task done until the blocking condition is resolved.',
                    'After the blocker is resolved, update task graph status and dispatch or complete the task again.',
                ],
        };
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(input.report.changePath, reportPath, this.buildBlockerEscalationReport(input.report, record));
        return record;
    }
    async readLatestBlockerEscalation(changePath) {
        const blockersPath = path.join(changePath, 'artifacts', 'agents', BLOCKERS_DIR);
        if (!(await this.fileService.exists(blockersPath))) {
            return null;
        }
        const entries = (await this.fileService.readDir(blockersPath))
            .filter(entry => entry.endsWith('.json'))
            .sort((left, right) => left.localeCompare(right));
        for (const entry of entries.reverse()) {
            const record = await this.fileService.readJSON(path.join(blockersPath, entry));
            if (this.isBlockerEscalationRecord(record)) {
                return record;
            }
        }
        return null;
    }
    isBlockerEscalationRecord(value) {
        return typeof value?.id === 'string'
            && typeof value?.taskId === 'string'
            && typeof value?.taskTitle === 'string'
            && (value?.status === 'NEEDS_CONTEXT' || value?.status === 'BLOCKED')
            && typeof value?.createdAt === 'string'
            && typeof value?.workerRole === 'string'
            && typeof value?.recordPath === 'string'
            && typeof value?.reportPath === 'string'
            && Array.isArray(value?.nextActions);
    }
    async writeLocalizedReportFile(changePath, reportPath, content) {
        await this.fileService.writeFile(reportPath, await this.localizeReportMarkdown(changePath, content));
    }
    async localizeReportMarkdown(changePath, content) {
        const language = await this.resolveReportDocumentLanguage(changePath);
        if (language !== 'zh-CN') {
            return content;
        }
        return this.localizeZhReportMarkdown(content);
    }
    async resolveReportDocumentLanguage(changePath) {
        const projectRoot = await this.findProjectRootForOptionalSession(changePath);
        const cacheKey = path.resolve(projectRoot);
        const cached = this.reportDocumentLanguageCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const language = await this.readReportLanguageFromSkillrc(projectRoot)
            || await this.readReportLanguageFromAssetManifest(projectRoot)
            || await this.readReportLanguageFromProjectGuide(projectRoot)
            || 'en-US';
        this.reportDocumentLanguageCache.set(cacheKey, language);
        return language;
    }
    async readReportLanguageFromSkillrc(projectRoot) {
        try {
            const config = await this.fileService.readJSON(path.join(projectRoot, constants_1.FILE_NAMES.SKILLRC));
            return this.normalizeReportDocumentLanguage(config?.documentLanguage);
        }
        catch {
            return null;
        }
    }
    async readReportLanguageFromAssetManifest(projectRoot) {
        try {
            const manifest = await this.fileService.readJSON(path.join(projectRoot, '.ospec', 'asset-sources.json'));
            const manifestLanguage = this.normalizeReportDocumentLanguage(manifest?.documentLanguage);
            if (manifestLanguage) {
                return manifestLanguage;
            }
            const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
            for (const asset of assets) {
                const sourceRelativePath = typeof asset?.sourceRelativePath === 'string' ? asset.sourceRelativePath : '';
                if (sourceRelativePath.includes('/zh-CN/')) {
                    return 'zh-CN';
                }
                if (sourceRelativePath.includes('/ja-JP/')) {
                    return 'ja-JP';
                }
                if (sourceRelativePath.includes('/ar/')) {
                    return 'ar';
                }
                if (sourceRelativePath.includes('/en-US/')) {
                    return 'en-US';
                }
            }
        }
        catch {
            return null;
        }
        return null;
    }
    async readReportLanguageFromProjectGuide(projectRoot) {
        for (const relativePath of [
            path.join('.ospec', 'for-ai', 'ai-guide.md'),
            path.join('for-ai', 'ai-guide.md'),
            path.join('.ospec', 'for-ai', 'execution-protocol.md'),
            path.join('for-ai', 'execution-protocol.md'),
        ]) {
            const guidePath = path.join(projectRoot, relativePath);
            if (!(await this.fileService.exists(guidePath))) {
                continue;
            }
            try {
                const detected = this.detectReportDocumentLanguageFromText(await this.fileService.readFile(guidePath));
                if (detected) {
                    return detected;
                }
            }
            catch {
                continue;
            }
        }
        return null;
    }
    normalizeReportDocumentLanguage(input) {
        return input === 'zh-CN' || input === 'en-US' || input === 'ja-JP' || input === 'ar'
            ? input
            : null;
    }
    detectReportDocumentLanguageFromText(content) {
        if (typeof content !== 'string' || content.trim().length === 0) {
            return null;
        }
        if (/[\u0600-\u06FF]/u.test(content)) {
            return 'ar';
        }
        if (/[\u3040-\u30FF]/u.test(content)) {
            return 'ja-JP';
        }
        if (/[\u4E00-\u9FFF]/u.test(content)) {
            return 'zh-CN';
        }
        if (/[A-Za-z]/u.test(content)) {
            return 'en-US';
        }
        return null;
    }
    localizeZhReportMarkdown(content) {
        let inFence = false;
        return content.split(/\r?\n/g)
            .map(line => {
            if (line.trim().startsWith('```')) {
                inFence = !inFence;
                return line;
            }
            if (inFence) {
                return line;
            }
            return this.localizeZhReportLine(line);
        })
            .join('\n');
    }
    localizeZhReportLine(line) {
        let localized = line;
        const replacements = [
            [/^# Change Bootstrap: /u, '# 变更启动快照：'],
            [/^# Worker Handoff: /u, '# Worker 交接：'],
            [/^# Native Agent Launch Plan: /u, '# 原生 Agent 启动计划：'],
            [/^# Workspace Safety: /u, '# 工作区安全检查：'],
            [/^# Worktree Plan: /u, '# Worktree 计划：'],
            [/^# Worktree Run: /u, '# Worktree 执行：'],
            [/^# Finish Plan: /u, '# 收尾计划：'],
            [/^# Workflow Route: /u, '# 工作流路由：'],
            [/^# User Decision Index: /u, '# 用户决策索引：'],
            [/^# User Decision: /u, '# 用户决策：'],
            [/^# Document Review Dispatch: /u, '# 文档评审派发：'],
            [/^# Review Feedback Plan: /u, '# 评审反馈计划：'],
            [/^# Verification Evidence: /u, '# 验证证据：'],
            [/^# TDD Evidence: /u, '# TDD 证据：'],
            [/^# Debug Evidence: /u, '# 调试证据：'],
            [/^# Worker Run: /u, '# Worker 运行：'],
            [/^# Worker Retry: /u, '# Worker 重试：'],
            [/^# Blocker Escalation: /u, '# 阻塞升级：'],
            [/^# Orchestration Run: /u, '# 编排运行：'],
            [/^# Task Review Dispatch: /u, '# 任务评审派发：'],
            [/^## Core Documents$/u, '## 核心文档'],
            [/^## Task Graph$/u, '## 任务图'],
            [/^## Project Session Brief$/u, '## 项目会话简报'],
            [/^## Execution State$/u, '## 执行状态'],
            [/^## Reviews And Evidence$/u, '## 评审与证据'],
            [/^## Debug Phase Evidence$/u, '## 调试阶段证据'],
            [/^## Checkpoint Evidence$/u, '## Checkpoint 证据'],
            [/^## User Decisions$/u, '## 用户决策'],
            [/^## Recent Dispatch Results$/u, '## 最近派发结果'],
            [/^## Active Dispatches$/u, '## 活跃派发'],
            [/^## Blockers$/u, '## 阻塞项'],
            [/^## Warnings$/u, '## 警告'],
            [/^## Next Instruction$/u, '## 下一步指令'],
            [/^## Safety Notes$/u, '## 安全说明'],
            [/^## Artifact Boundary$/u, '## Artifact 边界'],
            [/^## Changed Files$/u, '## 变更文件'],
            [/^## Commands$/u, '## 命令'],
            [/^## Lifecycle$/u, '## 生命周期'],
            [/^## Recommendations$/u, '## 建议'],
            [/^## Required Context$/u, '## 必需上下文'],
            [/^## Review Output$/u, '## 评审输出'],
            [/^## Completion$/u, '## 完成方式'],
            [/^## Selected Dispatch$/u, '## 选中的派发'],
            [/^## Target Tool Mapping$/u, '## 目标工具映射'],
            [/^## Native Agent Dispatch$/u, '## 原生 Agent 派发'],
            [/^## Harness Adapter Packet$/u, '## Harness 适配器包'],
            [/^## CLI Fallback Commands$/u, '## CLI 兜底命令'],
            [/^## Launch Prompt$/u, '## 启动提示词'],
            [/^## Agent Artifacts$/u, '## Agent Artifacts'],
            [/^## Worker Profiles$/u, '## Worker 配置'],
            [/^## Tool Mapping$/u, '## 工具映射'],
            [/^## Command Sequence$/u, '## 命令序列'],
            [/^## Safety Rules$/u, '## 安全规则'],
            [/^## Decision Values$/u, '## 决策取值'],
            [/^## Findings$/u, '## 发现'],
            [/^## Checklist$/u, '## 清单'],
            [/^## Question$/u, '## 问题'],
            [/^## Options$/u, '## 选项'],
            [/^## Chat Prompt$/u, '## 对话提示'],
            [/^## Summary$/u, '## 摘要'],
            [/^## Git$/u, '## Git'],
        ];
        for (const [pattern, replacement] of replacements) {
            localized = localized.replace(pattern, replacement);
        }
        const bulletMatch = localized.match(/^(\s*-\s+)([^:]+):\s*(.*)$/u);
        if (bulletMatch) {
            const label = this.zhReportLabel(bulletMatch[2]);
            if (label) {
                return `${bulletMatch[1]}${label}: ${this.localizeZhReportValue(bulletMatch[3])}`;
            }
            return `${bulletMatch[1]}${bulletMatch[2]}: ${this.localizeZhReportValue(bulletMatch[3])}`;
        }
        return this.localizeZhBoundarySentence(localized);
    }
    zhReportLabel(label) {
        const labels = {
            Status: '状态',
            Target: '目标',
            'Dry run': 'Dry run',
            'Generated at': '生成时间',
            'Created at': '创建时间',
            'Updated at': '更新时间',
            'Selected at': '选择时间',
            'Project root': '项目根目录',
            'Change path': '变更路径',
            Change: '变更',
            Feature: '变更',
            Exists: '存在',
            JSON: 'JSON',
            Markdown: 'Markdown',
            'Cache status': '缓存状态',
            'Cache key': '缓存键',
            'Active changes': '活跃变更数',
            'Queued changes': '排队变更数',
            Next: '下一步',
            Session: '会话',
            'Dispatch count': '派发数量',
            Workspace: '工作区',
            'Worktree plan': 'Worktree 计划',
            'Finish plan': '收尾计划',
            'Required pending decisions': '待处理必选决策',
            'Optional pending decisions': '待处理可选决策',
            'Decision index': '决策索引',
            Implementer: '实现者',
            'Spec reviewer': '规格评审者',
            'Quality reviewer': '质量评审者',
            Controller: '控制器',
            'Spec review': '规格评审',
            'Quality review': '质量评审',
            'Verification checklist complete': '验证清单完成',
            'Verification evidence': '验证证据',
            'TDD evidence': 'TDD 证据',
            'Debug evidence': '调试证据',
            'Checkpoint evidence': 'Checkpoint 证据',
            'Task graph status': '任务图状态',
            'Task status': '任务状态',
            'Workspace status': '工作区状态',
            Tasks: '任务数',
            Dispatchable: '可派发',
            Running: '运行中',
            Completed: '已完成',
            Blocked: '阻塞',
            Invalid: '无效',
            Branch: '分支',
            Head: 'HEAD',
            Dirty: '有未提交变更',
            Repository: '仓库',
            Available: '可用',
            'Current worktree': '当前 worktree',
            'Recommended branch': '建议分支',
            'Recommended path': '建议路径',
            'Base ref': '基准引用',
            Remote: '远端',
            'Target branch': '目标分支',
            Required: '必选',
            Question: '问题',
            'Recommended option': '推荐选项',
            'Selected option': '已选选项',
            Total: '总数',
            Selected: '已选择',
            Skipped: '已跳过',
            Reason: '原因',
            Command: '命令',
            'Dispatch ID': '派发 ID',
            'Reviewer role': '评审角色',
            Document: '文档',
            'Document readiness': '文档就绪状态',
            'Review artifact': '评审 artifact',
            Record: '记录',
            'Record path': '记录路径',
            'Packet path': '包路径',
            'Completion command': '完成命令',
            Summary: '摘要',
            'Read context': '读取上下文',
            'Edit files': '编辑文件',
            'Run commands': '运行命令',
            'Track plan': '跟踪计划',
            'Dispatch workers': '派发 workers',
            'Record completion': '记录完成',
            'Capability tier': '能力层级',
            'Recommended target': '推荐目标',
            Role: '角色',
        };
        return labels[label] || null;
    }
    localizeZhReportValue(value) {
        const trimmed = value.trim();
        const exactValues = {
            yes: '是',
            no: '否',
            present: '存在',
            missing: '缺失',
            'not recorded': '未记录',
            None: '无',
            none: '无',
            ready: '就绪',
            draft: '草稿',
            empty: '空',
            unknown: '未知',
            complete: '完成',
            incomplete: '未完成',
            true: 'true',
            false: 'false',
        };
        if (exactValues[trimmed]) {
            return exactValues[trimmed];
        }
        return value
            .replace(/\byes\b/gu, '是')
            .replace(/\bno\b/gu, '否')
            .replace(/\bpresent\b/gu, '存在')
            .replace(/\bmissing\b/gu, '缺失')
            .replace(/\bnot recorded\b/gu, '未记录')
            .replace(/\bNone\b/gu, '无')
            .replace(/\bchecklist complete\b/gu, '清单已完成')
            .replace(/\bchecklist incomplete\b/gu, '清单未完成')
            .replace(/\brecord\(s\)\b/gu, '条记录')
            .replace(/\brequired\b/gu, '必选')
            .replace(/\boptional\b/gu, '可选')
            .replace(/\bselected\b/gu, '已选择')
            .replace(/\bskipped\b/gu, '已跳过');
    }
    localizeZhBoundarySentence(line) {
        const sentences = {
            '- This command writes a bootstrap snapshot only.': '- 此命令只写入启动快照。',
            '- It does not launch workers, sync worker status, run tests, inspect git, finalize, archive, push, merge, or edit project source files.': '- 它不会启动 worker、同步 worker 状态、运行测试、检查 git、finalize、archive、push、merge 或编辑项目源码。',
            '- Use it when starting or resuming one active change so the next safe action is explicit.': '- 在开始或恢复一个活跃变更时使用它，让下一步安全动作保持明确。',
            '- This route writes workflow recommendation artifacts only.': '- 此路由只写入工作流建议 artifacts。',
            '- It does not edit project source files, dispatch workers, run tests, merge branches, or delete worktrees.': '- 它不会编辑项目源码、派发 worker、运行测试、合并分支或删除 worktree。',
            '- If the top recommendation is a user decision, present the decision prompt before continuing.': '- 如果首要建议是用户决策，继续前先展示决策提示。',
            '- This command writes a launch preparation plan only.': '- 此命令只写入启动准备计划。',
            '- Record worker completion with `ospec execute complete`; do not rely on chat history as the durable state.': '- 使用 `ospec execute complete` 记录 worker 完成状态；不要把聊天历史当成持久状态。',
            '- This command writes a handoff guide only.': '- 此命令只写入交接指南。',
            '- Use it when a change moves between agents, tools, shells, worktrees, or human operators.': '- 当变更需要在 agent、工具、shell、worktree 或人工操作者之间移交时使用它。',
            '- This artifact records a user-facing decision gate only.': '- 此 artifact 只记录面向用户的决策门。',
            '- It does not edit project source files, dispatch workers, run tests, or approve review artifacts.': '- 它不会编辑项目源码、派发 worker、运行测试或批准评审 artifacts。',
            '- Required pending decisions block worker dispatch and finish readiness until selected or skipped.': '- 待处理的必选决策会阻止 worker 派发和 finish 就绪，直到被选择或跳过。',
            '- This index summarizes user decision artifacts only.': '- 此索引只汇总用户决策 artifacts。',
        };
        return sentences[line] || line;
    }
    async findProjectRoot(startPath) {
        let currentPath = path.resolve(startPath);
        while (true) {
            if (await this.fileService.exists(path.join(currentPath, constants_1.FILE_NAMES.SKILLRC))) {
                return currentPath;
            }
            const parentPath = path.dirname(currentPath);
            if (parentPath === currentPath) {
                break;
            }
            currentPath = parentPath;
        }
        const inferredRoot = this.inferProjectRootFromChangePath(startPath);
        if (inferredRoot) {
            return inferredRoot;
        }
        throw new Error('Unable to locate project root containing .skillrc from the provided change path.');
    }
    async findProjectRootForOptionalSession(startPath) {
        try {
            return await this.findProjectRoot(startPath);
        }
        catch {
            return this.inferProjectRootFromChangePath(startPath) ?? path.resolve(startPath);
        }
    }
    inferProjectRootFromChangePath(startPath) {
        const normalizedPath = path.resolve(startPath);
        const segments = normalizedPath.split(path.sep);
        for (let index = 0; index < segments.length - 2; index += 1) {
            if (segments[index] === 'changes' && segments[index + 1] === 'active') {
                return segments.slice(0, index).join(path.sep) || path.sep;
            }
        }
        for (let index = 0; index < segments.length - 3; index += 1) {
            if (segments[index] === '.ospec' && segments[index + 1] === 'changes' && segments[index + 2] === 'active') {
                return segments.slice(0, index).join(path.sep) || path.sep;
            }
        }
        return null;
    }
    async readFeatureName(changePath) {
        const statePath = path.join(changePath, constants_1.FILE_NAMES.STATE);
        if (await this.fileService.exists(statePath)) {
            const state = await this.fileService.readJSON(statePath);
            if (typeof state.feature === 'string' && state.feature.trim().length > 0) {
                return state.feature.trim();
            }
        }
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (await this.fileService.exists(graphPath)) {
            const graph = await this.fileService.readJSON(graphPath);
            if (typeof graph.feature === 'string' && graph.feature.trim().length > 0) {
                return graph.feature.trim();
            }
        }
        return path.basename(changePath);
    }
    async readBootstrapDocumentStatus(changePath, fileName, options = {}) {
        const documentPath = path.join(changePath, fileName);
        if (!(await this.fileService.exists(documentPath))) {
            return {
                path: documentPath,
                exists: false,
                readiness: 'missing',
                checklistComplete: options.checklistRequired ? false : null,
                uncheckedItems: 0,
            };
        }
        const content = await this.fileService.readFile(documentPath);
        const trimmedContent = content.trim();
        const checklistItems = content.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
        const uncheckedItems = content.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
        const checklistComplete = checklistItems.length > 0
            ? uncheckedItems.length === 0
            : options.checklistRequired
                ? false
                : null;
        const hasDraftMarker = /\b(TBD|TODO)\b|<[^>\n]+>/.test(content);
        let readiness = 'ready';
        if (trimmedContent.length === 0) {
            readiness = 'empty';
        }
        else if (hasDraftMarker || (!options.allowUncheckedChecklist && uncheckedItems.length > 0)) {
            readiness = 'draft';
        }
        else if (options.checklistRequired && !checklistComplete) {
            readiness = 'draft';
        }
        return {
            path: documentPath,
            exists: true,
            readiness,
            checklistComplete,
            uncheckedItems: uncheckedItems.length,
        };
    }
    async readBootstrapPlanSnapshot(artifactPath) {
        if (!(await this.fileService.exists(artifactPath))) {
            return {
                exists: false,
                path: artifactPath,
                status: 'missing',
                blockers: [],
                warnings: [],
            };
        }
        try {
            const artifact = await this.fileService.readJSON(artifactPath);
            return {
                exists: true,
                path: artifactPath,
                status: typeof artifact?.status === 'string' && artifact.status.trim().length > 0
                    ? artifact.status.trim()
                    : 'unknown',
                blockers: stringArray(artifact?.blockers),
                warnings: stringArray(artifact?.warnings),
            };
        }
        catch (error) {
            return {
                exists: true,
                path: artifactPath,
                status: 'unknown',
                blockers: [`Artifact could not be read: ${error?.message || error}`],
                warnings: [],
            };
        }
    }
    async readBootstrapProjectSessionSnapshot(projectRoot) {
        const jsonPath = this.getProjectSessionBriefPath(projectRoot);
        const reportPath = this.getProjectSessionBriefReportPath(projectRoot);
        const reportExists = await this.fileService.exists(reportPath);
        if (!(await this.fileService.exists(jsonPath))) {
            return {
                exists: false,
                jsonPath,
                reportPath,
                generatedAt: null,
                cacheStatus: 'missing',
                cacheKey: null,
                activeChangeCount: 0,
                queuedChangeCount: 0,
                recommendedCommands: [],
                nextInstruction: null,
                warnings: ['Project session brief is missing; run ospec session before relying on project re-entry context.'],
            };
        }
        try {
            const artifact = await this.fileService.readJSON(jsonPath);
            const recommendedCommands = Array.isArray(artifact?.recommendedCommands)
                ? artifact.recommendedCommands
                    .map((item) => typeof item?.command === 'string' ? item.command.trim() : '')
                    .filter((command) => command.length > 0)
                : [];
            const warnings = [];
            if (!reportExists) {
                warnings.push('Project session brief Markdown is missing; rerun ospec session to refresh the human-readable project entry brief.');
            }
            return {
                exists: true,
                jsonPath,
                reportPath,
                generatedAt: typeof artifact?.generatedAt === 'string' && artifact.generatedAt.trim().length > 0
                    ? artifact.generatedAt.trim()
                    : null,
                cacheStatus: typeof artifact?.cache?.status === 'string' && artifact.cache.status.trim().length > 0
                    ? artifact.cache.status.trim()
                    : 'unknown',
                cacheKey: typeof artifact?.cache?.key === 'string' && artifact.cache.key.trim().length > 0
                    ? artifact.cache.key.trim()
                    : null,
                activeChangeCount: Array.isArray(artifact?.activeChanges) ? artifact.activeChanges.length : 0,
                queuedChangeCount: Array.isArray(artifact?.queuedChanges) ? artifact.queuedChanges.length : 0,
                recommendedCommands,
                nextInstruction: typeof artifact?.nextInstruction === 'string' && artifact.nextInstruction.trim().length > 0
                    ? artifact.nextInstruction.trim()
                    : null,
                warnings,
            };
        }
        catch (error) {
            return {
                exists: true,
                jsonPath,
                reportPath,
                generatedAt: null,
                cacheStatus: 'unknown',
                cacheKey: null,
                activeChangeCount: 0,
                queuedChangeCount: 0,
                recommendedCommands: [],
                nextInstruction: null,
                warnings: [`Project session brief could not be read: ${error?.message || error}`],
            };
        }
    }
    async buildHandoffDocumentSnapshot(changePath) {
        const documents = [
            ['state', constants_1.FILE_NAMES.STATE],
            ['proposal', constants_1.FILE_NAMES.PROPOSAL],
            ['design', constants_1.FILE_NAMES.DESIGN],
            ['implementationPlan', constants_1.FILE_NAMES.IMPLEMENTATION_PLAN],
            ['tasks', constants_1.FILE_NAMES.TASKS],
            ['verification', constants_1.FILE_NAMES.VERIFICATION],
        ];
        const snapshot = {};
        for (const [key, fileName] of documents) {
            const documentPath = path.join(changePath, fileName);
            snapshot[key] = {
                path: this.toChangeRelativePath(changePath, documentPath),
                exists: await this.fileService.exists(documentPath),
            };
        }
        return snapshot;
    }
    async buildHandoffArtifactSnapshot(changePath, handoffArtifactPath) {
        const artifactPaths = [
            ['bootstrapJson', this.getBootstrapPath(changePath), false],
            ['bootstrapMarkdown', this.getBootstrapReportPath(changePath), false],
            ['handoffJson', handoffArtifactPath, true],
            ['handoffMarkdown', this.getHandoffReportPath(changePath), true],
            ['taskGraph', path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH), false],
            ['reviewFeedbackPlan', this.getReviewFeedbackPlanPath(changePath), false],
            ['decisions', this.getUserDecisionDir(changePath), false],
            ['workspaceStatus', this.getWorkspaceStatusPath(changePath), false],
            ['worktreePlan', this.getWorktreePlanPath(changePath), false],
            ['workflowRoute', this.getWorkflowRoutePath(changePath), false],
            ['executionSession', this.getSessionPath(changePath), false],
            ['blockerEscalations', path.join(changePath, 'artifacts', 'agents', BLOCKERS_DIR), false],
            ['workerStatus', path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS), false],
            ['designReview', this.getDocumentReviewArtifactPath(changePath, 'design'), false],
            ['implementationPlanReview', this.getDocumentReviewArtifactPath(changePath, 'plan'), false],
            ['specReview', path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW), false],
            ['qualityReview', path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW), false],
            ['verificationEvidence', this.getVerificationEvidencePath(changePath), false],
            ['tddEvidence', this.getTddEvidencePath(changePath), false],
            ['debugEvidence', this.getDebugEvidencePath(changePath), false],
            ['finishPlan', this.getFinishPlanPath(changePath), false],
        ];
        const snapshot = {};
        for (const [key, artifactPath, generatedByThisCommand] of artifactPaths) {
            snapshot[key] = {
                path: this.toChangeRelativePath(changePath, artifactPath),
                exists: generatedByThisCommand || await this.fileService.exists(artifactPath),
            };
        }
        return snapshot;
    }
    deriveBootstrapDecision(input) {
        const blockers = [];
        const warnings = [];
        const relativeChangePath = this.toProjectRelativeChangePath(input.projectRoot, input.changePath);
        const documentEntries = [
            ['proposal.md', input.documents.proposal],
            ['design.md', input.documents.design],
            ['implementation-plan.md', input.documents.implementationPlan],
            ['tasks.md', input.documents.tasks],
        ];
        for (const [label, documentStatus] of documentEntries) {
            if (documentStatus.readiness === 'missing') {
                blockers.push(`${label} is missing.`);
            }
            else if (documentStatus.readiness === 'empty') {
                blockers.push(`${label} is empty.`);
            }
            else if (documentStatus.readiness === 'draft') {
                warnings.push(`${label} still looks like a draft; review placeholders or unchecked setup items.`);
            }
        }
        if (input.documents.proposal.readiness !== 'ready') {
            return {
                status: 'needs_proposal',
                blockers,
                warnings,
                nextInstruction: 'Create or complete proposal.md before design, planning, task graph, or implementation work.',
            };
        }
        if (input.documents.design.readiness !== 'ready') {
            return {
                status: 'needs_design',
                blockers,
                warnings,
                nextInstruction: 'Draft or update design.md from proposal.md and project context before implementation planning.',
            };
        }
        if (input.documents.implementationPlan.readiness !== 'ready') {
            return {
                status: 'needs_plan',
                blockers,
                warnings,
                nextInstruction: 'Draft or update implementation-plan.md from design.md, including target files, dependencies, and verification commands.',
            };
        }
        if (!input.execution.taskGraph.exists) {
            return {
                status: 'needs_task_graph',
                blockers,
                warnings,
                nextInstruction: 'Create artifacts/agents/task-graph.json from implementation-plan.md, then align tasks.md.',
            };
        }
        if (input.execution.taskGraph.issues.length > 0 || input.execution.taskGraph.invalid > 0) {
            blockers.push(...input.execution.taskGraph.issues);
            if (input.execution.taskGraph.invalid > 0) {
                blockers.push(`Task graph has ${input.execution.taskGraph.invalid} invalid task(s).`);
            }
            return {
                status: 'blocked',
                blockers,
                warnings,
                nextInstruction: 'Fix task graph schema and missing execution details before dispatch.',
            };
        }
        if (input.execution.decisions.pendingRequired > 0 || input.execution.decisions.blockers.length > 0) {
            blockers.push(...input.execution.decisions.blockers);
            if (input.execution.decisions.pendingRequired > 0) {
                blockers.push(`${input.execution.decisions.pendingRequired} required user decision(s) are pending.`);
            }
            return {
                status: 'needs_decision',
                blockers,
                warnings,
                nextInstruction: input.execution.decisions.nextInstruction,
            };
        }
        const graphComplete = input.execution.taskGraph.taskCount > 0
            && input.execution.taskGraph.completed === input.execution.taskGraph.taskCount
            && input.execution.taskGraph.status.toLowerCase() === 'completed';
        if (!graphComplete) {
            if (!input.execution.workspace.exists) {
                return {
                    status: 'needs_workspace_check',
                    blockers,
                    warnings,
                    nextInstruction: `Run ospec execute workspace ${this.quoteShellArg(relativeChangePath)} before worker dispatch.`,
                };
            }
            if (input.execution.workspace.status !== 'ready') {
                blockers.push(`Workspace readiness is ${input.execution.workspace.status}.`);
                blockers.push(...input.execution.workspace.blockers);
                warnings.push(...input.execution.workspace.warnings);
                return {
                    status: 'blocked',
                    blockers,
                    warnings,
                    nextInstruction: 'Resolve workspace safety blockers or prepare an isolated worktree before dispatch.',
                };
            }
            if (input.execution.session.status === 'blocked' || input.execution.worker.implementer === 'BLOCKED') {
                blockers.push('Worker execution is blocked.');
                return {
                    status: 'blocked',
                    blockers,
                    warnings,
                    nextInstruction: 'Resolve blocked worker tasks or missing external conditions before continuing.',
                };
            }
            if (input.execution.session.status === 'needs_context' || input.execution.worker.implementer === 'NEEDS_CONTEXT') {
                blockers.push('Worker execution needs more context.');
                return {
                    status: 'blocked',
                    blockers,
                    warnings,
                    nextInstruction: 'Provide the missing context, then record worker progress with ospec execute complete or ospec execute sync.',
                };
            }
            if (input.execution.session.activeDispatchCount === 1) {
                const dispatch = input.execution.session.activeDispatches[0];
                return {
                    status: 'ready_to_launch',
                    blockers,
                    warnings,
                    nextInstruction: `Run ospec execute launch ${this.quoteShellArg(relativeChangePath)} --task ${this.quoteShellArg(dispatch.taskId)} --target ${dispatch.target} to write the native agent launch plan, then dispatch the worker through the current AI harness.`,
                };
            }
            if (input.execution.session.activeDispatchCount > 1) {
                return {
                    status: 'ready_to_launch',
                    blockers,
                    warnings,
                    nextInstruction: `Run ospec execute launch ${this.quoteShellArg(relativeChangePath)} --task <task-id> for each active dispatch that should start now, then use the launch plan to dispatch native harness agent(s): ${input.execution.session.activeDispatches.map(dispatch => dispatch.taskId).join(', ')}.`,
                };
            }
            if (input.execution.taskGraph.dispatchable > 0) {
                return {
                    status: 'ready_to_dispatch',
                    blockers,
                    warnings,
                    nextInstruction: `Run ospec execute dispatch ${this.quoteShellArg(relativeChangePath)} to create the next worker packet batch.`,
                };
            }
            if (input.execution.taskGraph.running > 0) {
                return {
                    status: 'needs_worker_completion',
                    blockers,
                    warnings,
                    nextInstruction: 'Continue in-progress worker task(s), then record results with ospec execute complete <task-id>.',
                };
            }
            if (input.execution.taskGraph.blocked > 0) {
                blockers.push(`Task graph has ${input.execution.taskGraph.blocked} blocked task(s).`);
                return {
                    status: 'blocked',
                    blockers,
                    warnings,
                    nextInstruction: 'Resolve blocked tasks or missing context before dispatch.',
                };
            }
            return {
                status: 'unknown',
                blockers,
                warnings,
                nextInstruction: 'Inspect task graph state with ospec execute status before continuing.',
            };
        }
        if (!APPROVED_REVIEW_DECISIONS.has(input.execution.reviews.spec)) {
            return {
                status: 'needs_review',
                blockers,
                warnings,
                nextInstruction: `Run ospec execute review ${this.quoteShellArg(relativeChangePath)} --stage spec and complete artifacts/reviews/spec-compliance.md.`,
            };
        }
        if (!APPROVED_REVIEW_DECISIONS.has(input.execution.reviews.quality)) {
            return {
                status: 'needs_review',
                blockers,
                warnings,
                nextInstruction: `Run ospec execute review ${this.quoteShellArg(relativeChangePath)} --stage quality and complete artifacts/reviews/code-quality.md.`,
            };
        }
        if (input.execution.reviews.spec === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Spec compliance review was approved with concerns; review the concerns before closeout.');
        }
        if (input.execution.reviews.quality === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Code quality review was approved with concerns; review the concerns before closeout.');
        }
        if (!input.execution.worker.verificationChecklistComplete || input.execution.evidence.verification !== 'passed') {
            if (!input.execution.worker.verificationChecklistComplete) {
                blockers.push('verification.md checklist is not complete.');
            }
            if (input.execution.evidence.verification !== 'passed') {
                blockers.push(`Latest verification evidence is not passing (current: ${input.execution.evidence.verification}).`);
            }
            return {
                status: 'needs_verification',
                blockers,
                warnings,
                nextInstruction: `Run fresh project checks manually, record them with ospec execute verify ${this.quoteShellArg(relativeChangePath)} --command "...", then complete verification.md.`,
            };
        }
        if (input.execution.evidence.tdd === 'failed' || input.execution.evidence.tdd === 'blocked') {
            blockers.push(`TDD evidence is not ready (current: ${input.execution.evidence.tdd}).`);
            return {
                status: 'blocked',
                blockers,
                warnings,
                nextInstruction: 'Resolve focused test evidence before closeout.',
            };
        }
        if (input.execution.evidence.debug === 'blocked') {
            blockers.push('Debug evidence is blocked.');
            return {
                status: 'blocked',
                blockers,
                warnings,
                nextInstruction: 'Resolve debug evidence blockers before closeout.',
            };
        }
        if (input.execution.evidence.checkpoint.active && input.execution.evidence.checkpoint.status !== 'complete') {
            blockers.push(`Checkpoint evidence coverage is not complete (current: ${input.execution.evidence.checkpoint.status}).`);
            blockers.push(...input.execution.evidence.checkpoint.missing.map(item => `Checkpoint missing evidence: ${item}`));
            warnings.push(...input.execution.evidence.checkpoint.nextActions);
            return {
                status: 'needs_verification',
                blockers,
                warnings,
                nextInstruction: input.execution.evidence.checkpoint.nextActions[0] || 'Complete Checkpoint evidence coverage before finish.',
            };
        }
        return {
            status: 'ready_to_finish',
            blockers,
            warnings,
            nextInstruction: `Run ospec execute finish ${this.quoteShellArg(relativeChangePath)} to write the closeout readiness plan before finalize/archive or manual Git closeout.`,
        };
    }
    toProjectRelativeChangePath(projectRoot, changePath) {
        return path.relative(projectRoot, changePath).replace(/\\/g, '/') || '.';
    }
    async buildWorktreeCleanupContext(changePath, projectRoot, feature, options) {
        const blockers = [];
        const warnings = [];
        const safeFeature = this.toFileSafeId(feature).toLowerCase() || 'change';
        const planPath = this.getWorktreePlanPath(changePath);
        const plan = await this.fileService.exists(planPath)
            ? await this.fileService.readJSON(planPath)
            : null;
        const planArtifactPath = plan
            ? this.toChangeRelativePath(changePath, planPath)
            : null;
        const gitRootResult = this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
        const gitRoot = gitRootResult.ok ? path.resolve(gitRootResult.stdout.trim()) : null;
        const worktrees = gitRootResult.ok
            ? this.parseGitWorktrees(this.readGitOutput(projectRoot, ['worktree', 'list', '--porcelain']) || '')
            : [];
        const targetPath = options.targetPath?.trim()
            ? this.resolveRecommendedWorktreePath(gitRoot || projectRoot, options.targetPath, safeFeature)
            : plan?.recommendedPath || '';
        const branch = options.branch?.trim() || plan?.recommendedBranch || null;
        const baseRef = options.baseRef?.trim() || plan?.baseRef || null;
        if (!gitRootResult.ok) {
            blockers.push('Git repository was not detected; cannot remove a git worktree safely.');
        }
        if (!targetPath) {
            blockers.push('Worktree cleanup requires --path or an existing artifacts/agents/worktree-plan.json target path.');
        }
        if (targetPath) {
            const normalizedTarget = this.normalizeFilesystemPath(targetPath);
            const normalizedProjectRoot = this.normalizeFilesystemPath(projectRoot);
            const normalizedGitRoot = gitRoot ? this.normalizeFilesystemPath(gitRoot) : null;
            if (normalizedTarget === normalizedProjectRoot || normalizedTarget === normalizedGitRoot) {
                blockers.push('Refusing to remove the current project or git root as a worktree target.');
            }
            const registered = worktrees.some(worktree => this.normalizeFilesystemPath(worktree.path) === normalizedTarget);
            if (!registered) {
                blockers.push(`Target path is not registered as a git worktree: ${targetPath}`);
            }
        }
        if (!plan && !options.targetPath?.trim()) {
            warnings.push('No worktree plan artifact was found; pass --path explicitly for cleanup.');
        }
        if (branch) {
            warnings.push('Cleanup removes the worktree only; it does not delete the branch.');
        }
        return {
            targetPath,
            branch,
            baseRef,
            planArtifactPath,
            blockers,
            warnings,
        };
    }
    formatGitCommand(args) {
        return ['git', ...args.map(arg => this.quoteShellArg(arg))].join(' ');
    }
    runGitForArtifact(cwd, args) {
        const result = this.runGit(cwd, args);
        return {
            command: this.formatGitCommand(args),
            args,
            cwd,
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            status: result.status,
            error: result.error?.message || null,
        };
    }
    runGit(cwd, args) {
        const result = childProcess.spawnSync('git', args, {
            cwd,
            encoding: 'utf8',
            windowsHide: true,
        });
        return {
            ok: result.status === 0,
            stdout: typeof result.stdout === 'string' ? result.stdout : '',
            stderr: typeof result.stderr === 'string' ? result.stderr : '',
            status: typeof result.status === 'number' ? result.status : null,
            error: result.error,
        };
    }
    readGitOutput(cwd, args) {
        const result = this.runGit(cwd, args);
        return result.ok ? result.stdout.trim() : null;
    }
    parseGitStatusEntries(output) {
        return output
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(line => line.length > 0)
            .map(line => {
            const match = line.match(/^(.{1,2})\s+(.*)$/);
            return {
                code: match ? (match[1].trim() || '??') : '??',
                file: match ? match[2].trim() : line.trim(),
            };
        })
            .filter(entry => entry.file.length > 0);
    }
    parseGitWorktrees(output) {
        const worktrees = [];
        let current = null;
        const pushCurrent = () => {
            if (current) {
                worktrees.push(current);
            }
        };
        for (const line of output.split(/\r?\n/)) {
            if (line.startsWith('worktree ')) {
                pushCurrent();
                current = {
                    path: path.resolve(line.slice('worktree '.length).trim()),
                    head: null,
                    branch: null,
                    detached: false,
                    bare: false,
                };
                continue;
            }
            if (!current) {
                continue;
            }
            if (line.startsWith('HEAD ')) {
                current.head = line.slice('HEAD '.length).trim() || null;
                continue;
            }
            if (line.startsWith('branch ')) {
                current.branch = this.normalizeGitBranchName(line.slice('branch '.length).trim());
                continue;
            }
            if (line === 'detached') {
                current.detached = true;
                continue;
            }
            if (line === 'bare') {
                current.bare = true;
            }
        }
        pushCurrent();
        return worktrees;
    }
    normalizeGitBranchName(value) {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        return trimmed.startsWith('refs/heads/') ? trimmed.slice('refs/heads/'.length) : trimmed;
    }
    findCurrentWorktree(gitRoot, worktrees) {
        const normalizedRoot = this.normalizeFilesystemPath(gitRoot);
        return worktrees.find(worktree => this.normalizeFilesystemPath(worktree.path) === normalizedRoot) || null;
    }
    normalizeFilesystemPath(value) {
        return path.resolve(value).replace(/\\/g, '/').toLowerCase();
    }
    getWorkspaceNextInstruction(status) {
        if (status === 'ready') {
            return 'Workspace inspection is ready. Continue with ospec execute dispatch when task graph state is dispatchable.';
        }
        if (status === 'needs_isolation') {
            return 'Defer worker dispatch until the workspace is clean or the work is moved into an isolated git worktree.';
        }
        return 'Workspace readiness is unknown. Inspect git state manually before dispatching worker tasks.';
    }
    getWorktreePlanNextInstruction(status) {
        if (status === 'ready') {
            return 'Review the generated worktree commands, create the isolated worktree manually if correct, then run ospec execute workspace inside that worktree before dispatch.';
        }
        if (status === 'needs_cleanup') {
            return 'Resolve the listed blockers before creating an isolated worktree, then regenerate this plan.';
        }
        return 'Git state is unknown. Inspect repository state manually before creating a worktree.';
    }
    getWorktreeRunNextInstruction(status, action, input) {
        const relativeChangePath = this.toProjectRelativeChangePath(input.projectRoot, input.changePath);
        if (status === 'blocked') {
            return action === 'create'
                ? 'Resolve worktree creation blockers, then rerun ospec execute worktree --create with explicit --branch, --path, or --base if needed.'
                : 'Resolve cleanup blockers, confirm the target path, then rerun ospec execute worktree --cleanup --path <worktree-path>.';
        }
        if (status === 'failed') {
            return 'Inspect the captured git stdout/stderr, fix the repository state, then rerun the explicit worktree command.';
        }
        if (action === 'create') {
            return `Run cd ${this.quoteShellArg(input.targetPath)} && ospec execute workspace ${this.quoteShellArg(relativeChangePath)} before worker dispatch.`;
        }
        return 'Worktree removal completed. Confirm branch and remote cleanup manually if needed; OSpec did not delete branches.';
    }
    getFinishPlanNextInstruction(status, finalizeCommand) {
        if (status === 'ready') {
            return `Run ${finalizeCommand} to verify and archive the completed change. Use ospec archive --check only when you need a dry-run preview; do not stop after a passing dry run unless the user requested preview-only.`;
        }
        if (status === 'blocked') {
            return 'Resolve the listed blockers, rerun verification, and regenerate this finish plan before final closeout.';
        }
        return 'Finish readiness is unknown. Inspect OSpec artifacts and git state manually before archive, push, merge, or worktree cleanup.';
    }
    buildWorkflowRouteRecommendations(artifact) {
        const changeArg = this.quoteShellArg(this.toProjectRelativeChangePath(artifact.projectRoot, artifact.changePath));
        const recommendations = [];
        const add = (action, command, reason) => {
            recommendations.push({
                priority: recommendations.length + 1,
                action,
                command,
                reason,
            });
        };
        const pendingDecision = artifact.execution.decisions.decisions.find(decision => decision.status === 'PENDING' && decision.required);
        if (pendingDecision) {
            add('ask user decision', `ospec execute decision ${changeArg} --id ${this.quoteShellArg(pendingDecision.id)} --select <option-id>`, `Required decision "${pendingDecision.id}" is pending.`);
            return recommendations;
        }
        if (artifact.status === 'needs_proposal') {
            add('complete proposal', null, 'proposal.md is missing, empty, or still draft.');
            return recommendations;
        }
        if (artifact.status === 'needs_design') {
            add('complete design', null, 'design.md must be completed from the requirement and proposal before implementation planning.');
            return recommendations;
        }
        if (artifact.status === 'needs_plan') {
            add('complete implementation plan', null, 'implementation-plan.md must be completed from design.md before task graph derivation.');
            return recommendations;
        }
        if (artifact.status === 'needs_task_graph') {
            add('derive task graph', null, 'artifacts/agents/task-graph.json must be derived from implementation-plan.md before dispatch.');
            return recommendations;
        }
        if (artifact.execution.session.activeDispatches.length > 0) {
            const active = artifact.execution.session.activeDispatches[0];
            add('launch active dispatch', `ospec execute launch ${changeArg} --task ${this.quoteShellArg(active.taskId)}`, `Dispatch ${active.id} is waiting for launch through the current harness.`);
            return recommendations;
        }
        if (!artifact.execution.workspace.exists) {
            add('inspect workspace', `ospec execute workspace ${changeArg}`, 'Workspace safety has not been recorded for this change.');
            return recommendations;
        }
        if (artifact.execution.workspace.status === 'needs_isolation') {
            add('plan isolated worktree', `ospec execute worktree ${changeArg}`, 'Workspace needs isolation before worker dispatch.');
            return recommendations;
        }
        if (artifact.execution.taskGraph.dispatchable > 0) {
            add('dispatch worker packet', artifact.execution.taskGraph.dispatchable === 1
                ? `ospec execute dispatch ${changeArg} --limit 1`
                : `ospec execute dispatch ${changeArg} --limit ${artifact.execution.taskGraph.dispatchable}`, `${artifact.execution.taskGraph.dispatchable} task(s) are dispatchable.`);
            return recommendations;
        }
        if (artifact.execution.taskGraph.running > 0) {
            add('collect worker result', `ospec execute launch ${changeArg}`, `${artifact.execution.taskGraph.running} task(s) are in progress; launch or collect the active worker result.`);
            return recommendations;
        }
        if (artifact.execution.taskGraph.completed > 0 && artifact.execution.taskGraph.completed === artifact.execution.taskGraph.taskCount) {
            if (!APPROVED_REVIEW_DECISIONS.has(artifact.execution.reviews.spec)) {
                add('dispatch final spec review', `ospec execute review ${changeArg} --stage spec`, `Final spec review is ${artifact.execution.reviews.spec}.`);
                return recommendations;
            }
            if (!APPROVED_REVIEW_DECISIONS.has(artifact.execution.reviews.quality)) {
                add('dispatch final quality review', `ospec execute review ${changeArg} --stage quality`, `Final quality review is ${artifact.execution.reviews.quality}.`);
                return recommendations;
            }
        }
        if (artifact.execution.evidence.verification !== 'passed') {
            add('record verification evidence', `ospec execute verify ${changeArg} --command <command> --status PASSED`, `Verification evidence is ${artifact.execution.evidence.verification}.`);
            return recommendations;
        }
        if (!artifact.execution.finish.exists || artifact.execution.finish.status !== 'ready') {
            add('write finish plan', `ospec execute finish ${changeArg}`, artifact.execution.finish.exists
                ? `Finish plan status is ${artifact.execution.finish.status}.`
                : 'Finish plan has not been recorded yet.');
            return recommendations;
        }
        add('finalize change', `ospec finalize ${changeArg}`, 'Core workflow artifacts are ready for final closeout.');
        return recommendations;
    }
    normalizeWorktreeBranch(branch, safeFeature) {
        const candidate = branch?.trim() || `ospec/${safeFeature}`;
        return candidate.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9/_-]+/g, '-').replace(/^-+|-+$/g, '') || `ospec/${safeFeature}`;
    }
    resolveRecommendedWorktreePath(rootPath, targetPath, safeFeature) {
        if (targetPath?.trim()) {
            return path.resolve(rootPath, '..', targetPath.trim());
        }
        return path.resolve(path.dirname(rootPath), `${path.basename(rootPath)}-${safeFeature}`);
    }
    buildWorktreePlanCommands(input) {
        const relativeChangePath = path.relative(input.projectRoot, input.changePath).replace(/\\/g, '/') || '.';
        return [
            `git worktree add -b ${this.quoteShellArg(input.recommendedBranch)} ${this.quoteShellArg(input.recommendedPath)} ${this.quoteShellArg(input.baseRef)}`,
            `cd ${this.quoteShellArg(input.recommendedPath)}`,
            `ospec execute workspace ${this.quoteShellArg(relativeChangePath)}`,
            `ospec execute dispatch ${this.quoteShellArg(relativeChangePath)} --limit 1`,
        ];
    }
    buildWorktreeLifecycle(input) {
        const relativeChangePath = path.relative(input.projectRoot, input.changePath).replace(/\\/g, '/') || '.';
        const dirty = input.statusEntries.length > 0;
        const targetRegistered = input.worktrees.some(worktree => this.normalizeFilesystemPath(worktree.path) === this.normalizeFilesystemPath(input.recommendedPath));
        return [
            {
                step: 'plan',
                status: dirty ? 'blocked' : 'ready',
                command: `ospec execute worktree ${this.quoteShellArg(relativeChangePath)} --branch ${this.quoteShellArg(input.recommendedBranch)} --path ${this.quoteShellArg(input.recommendedPath)} --base ${this.quoteShellArg(input.baseRef)}`,
                guidance: dirty
                    ? 'Commit, stash, or intentionally isolate current changes before creating a new worktree.'
                    : 'Review the plan and generated command before creating the worktree.',
            },
            {
                step: 'create',
                status: dirty || targetRegistered ? 'blocked' : 'manual',
                command: `ospec execute worktree ${this.quoteShellArg(relativeChangePath)} --create --branch ${this.quoteShellArg(input.recommendedBranch)} --path ${this.quoteShellArg(input.recommendedPath)} --base ${this.quoteShellArg(input.baseRef)}`,
                guidance: 'Creation is explicit and limited to git worktree add; it does not dispatch workers.',
            },
            {
                step: 'inspect',
                status: 'pending',
                command: `cd ${this.quoteShellArg(input.recommendedPath)} && ospec execute workspace ${this.quoteShellArg(relativeChangePath)}`,
                guidance: 'Inspect the isolated worktree before dispatching worker packets from it.',
            },
            {
                step: 'dispatch',
                status: 'pending',
                command: `ospec execute dispatch ${this.quoteShellArg(relativeChangePath)} --limit 1`,
                guidance: 'Dispatch only after workspace inspection is ready and task graph state is dispatchable.',
            },
            {
                step: 'finish',
                status: 'pending',
                command: `ospec execute finish ${this.quoteShellArg(relativeChangePath)}`,
                guidance: 'Use finish planning before final verification, archive, PR, merge, or cleanup.',
            },
            {
                step: 'cleanup',
                status: 'manual',
                command: `ospec execute worktree ${this.quoteShellArg(relativeChangePath)} --cleanup --path ${this.quoteShellArg(input.recommendedPath)}`,
                guidance: 'Cleanup removes the worktree only after the change is merged or intentionally abandoned.',
            },
            {
                step: 'branch-retention',
                status: 'manual',
                command: null,
                guidance: 'Decide whether to retain, delete, or tag the branch after closeout; OSpec records the decision but does not delete branches automatically.',
            },
        ];
    }
    buildFinishPlanCommands(input) {
        const relativeChangePath = path.relative(input.projectRoot, input.changePath).replace(/\\/g, '/') || '.';
        const commands = [
            `ospec execute sync ${this.quoteShellArg(relativeChangePath)}`,
            `ospec verify ${this.quoteShellArg(relativeChangePath)}`,
            `ospec archive ${this.quoteShellArg(relativeChangePath)} --check`,
            `ospec finalize ${this.quoteShellArg(relativeChangePath)}`,
            'git status --short',
        ];
        if (input.currentBranch && input.currentBranch !== input.targetBranch) {
            commands.push(`git push -u ${this.quoteShellArg(input.remote)} ${this.quoteShellArg(input.currentBranch)}`);
            commands.push(`# after PR approval: git checkout ${this.quoteShellArg(input.targetBranch)} && git pull --ff-only ${this.quoteShellArg(input.remote)} ${this.quoteShellArg(input.targetBranch)} && git merge --ff-only ${this.quoteShellArg(input.currentBranch)}`);
        }
        const primaryWorktree = input.worktrees[0];
        if (input.currentWorktree && primaryWorktree && this.normalizeFilesystemPath(input.currentWorktree.path) !== this.normalizeFilesystemPath(primaryWorktree.path)) {
            commands.push(`# after merge and backup: git worktree remove ${this.quoteShellArg(input.currentWorktree.path)}`);
        }
        return commands;
    }
    buildFinishDecisionPrompts(input) {
        const relativeChangePath = path.relative(input.projectRoot, input.changePath).replace(/\\/g, '/') || '.';
        const changeArg = this.quoteShellArg(relativeChangePath);
        const currentBranch = input.currentBranch || 'current branch';
        const worktreePath = input.currentWorktree?.path || 'current worktree';
        const prompts = [
            {
                id: 'finish-pr-strategy',
                required: true,
                question: `How should ${currentBranch} be prepared for review before closeout?`,
                recommendedOptionId: 'open-pr',
                options: [
                    { id: 'open-pr', label: 'Open PR', description: `Push ${currentBranch} to ${input.remote} and open a PR against ${input.targetBranch}.` },
                    { id: 'direct-closeout', label: 'Direct closeout', description: 'Skip PR only if the repository policy allows direct merge or local-only archive.' },
                    { id: 'hold', label: 'Hold', description: 'Do not push or request review until a human explicitly revisits this finish plan.' },
                ],
            },
            {
                id: 'finish-merge-strategy',
                required: true,
                question: `After review, how should ${currentBranch} be integrated into ${input.targetBranch}?`,
                recommendedOptionId: 'fast-forward',
                options: [
                    { id: 'fast-forward', label: 'Fast-forward', description: 'Use a fast-forward merge when history allows it.' },
                    { id: 'squash', label: 'Squash merge', description: 'Squash the branch if the project prefers one commit per change.' },
                    { id: 'manual', label: 'Manual merge', description: 'Let a maintainer choose the merge method outside OSpec.' },
                ],
            },
            {
                id: 'finish-branch-retention',
                required: false,
                question: `What should happen to branch ${currentBranch} after the change is archived?`,
                recommendedOptionId: 'delete-after-merge',
                options: [
                    { id: 'delete-after-merge', label: 'Delete after merge', description: 'Delete the local and remote branch after merge and backup are confirmed.' },
                    { id: 'retain', label: 'Retain branch', description: 'Keep the branch for audit, follow-up work, or release stabilization.' },
                    { id: 'tag-then-delete', label: 'Tag then delete', description: 'Create a tag or release marker before deleting the branch.' },
                ],
            },
            {
                id: 'finish-worktree-cleanup',
                required: false,
                question: `When should ${worktreePath} be removed?`,
                recommendedOptionId: 'after-archive',
                options: [
                    { id: 'after-archive', label: 'After archive', description: 'Remove the worktree after final verification, archive, merge, and backup checks.' },
                    { id: 'keep-temporarily', label: 'Keep temporarily', description: 'Keep the worktree for manual smoke testing or release checks.' },
                    { id: 'not-applicable', label: 'Not applicable', description: 'No isolated worktree is involved in this change.' },
                ],
            },
        ];
        return prompts.map(prompt => ({
            ...prompt,
            command: [
                `ospec execute decision ${changeArg}`,
                `--id ${this.quoteShellArg(prompt.id)}`,
                `--question ${this.quoteShellArg(prompt.question)}`,
                ...prompt.options.map(option => `--option ${this.quoteShellArg(`${option.id}:${option.label}:${option.description}`)}`),
                `--recommended ${this.quoteShellArg(prompt.recommendedOptionId)}`,
                prompt.required ? '--required' : '--optional',
            ].join(' '),
        }));
    }
    quoteShellArg(value) {
        if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) {
            return value;
        }
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    quoteHarnessTemplateArg(value) {
        if (/^[a-zA-Z0-9_./:=@-]+$/.test(value)) {
            return value;
        }
        if (process.platform === 'win32') {
            return `"${value.replace(/([()%!^"<>&|])/g, '^$1')}"`;
        }
        return `'${value.replace(/'/g, `'\\''`)}'`;
    }
    normalizeHandoffTarget(target) {
        const normalized = (target || 'generic').trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported handoff target: ${target}`);
    }
    normalizeWorkerToolTarget(target) {
        const normalized = (target || 'generic').trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported worker tool target: ${target}`);
    }
    normalizePositiveInteger(value, fallback) {
        if (value === undefined || value === null || !Number.isInteger(value) || value <= 0) {
            return fallback;
        }
        return value;
    }
    async resolveHarnessCommandTemplate(projectRoot, options) {
        const command = options.command?.trim();
        if (command) {
            return {
                commandTemplate: command,
                source: 'option',
                target: options.target || null,
                timeoutMs: options.timeoutMs,
                maxRounds: options.maxRounds,
                warnings: [],
            };
        }
        const warnings = [];
        const configPath = path.join(projectRoot, '.ospec', 'harness.json');
        if (!(await this.fileService.exists(configPath))) {
            return {
                commandTemplate: null,
                source: 'missing',
                target: options.target || null,
                warnings,
            };
        }
        try {
            const config = await this.fileService.readJSON(configPath);
            const target = options.target
                || this.normalizeOptionalWorkerTarget(config?.defaultTarget || config?.default_target)
                || null;
            const commandTemplate = this.readHarnessCommandForTarget(config, target);
            if (!commandTemplate) {
                warnings.push(`.ospec/harness.json did not contain a worker command${target ? ` for target ${target}` : ''}.`);
            }
            return {
                commandTemplate,
                source: commandTemplate ? 'config' : 'missing',
                target,
                timeoutMs: typeof config?.timeoutMs === 'number' ? config.timeoutMs : typeof config?.timeout_ms === 'number' ? config.timeout_ms : undefined,
                maxRounds: typeof config?.maxRounds === 'number' ? config.maxRounds : typeof config?.max_rounds === 'number' ? config.max_rounds : undefined,
                warnings,
            };
        }
        catch (error) {
            warnings.push(`.ospec/harness.json could not be read: ${error?.message || error}`);
            return {
                commandTemplate: null,
                source: 'missing',
                target: options.target || null,
                warnings,
            };
        }
    }
    normalizeOptionalWorkerTarget(value) {
        if (typeof value !== 'string' || value.trim().length === 0) {
            return null;
        }
        return this.normalizeWorkerToolTarget(value);
    }
    readHarnessCommandForTarget(config, target) {
        const candidates = [
            target ? config?.commands?.[target] : null,
            target ? config?.workers?.[target]?.command : null,
            config?.command,
            config?.workerCommand,
            config?.worker_command,
            config?.commands?.default,
            config?.workers?.default?.command,
        ];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
                return candidate.trim();
            }
        }
        return null;
    }
    async ensureWorkspaceReadyForOrchestration(changePath) {
        const artifactPath = this.getWorkspaceStatusPath(changePath);
        if (!(await this.fileService.exists(artifactPath))) {
            const inspection = await this.inspectWorkspace(changePath);
            return {
                status: inspection.status,
                blockers: inspection.status === 'ready' ? [] : inspection.blockers.length > 0 ? inspection.blockers : [`Workspace readiness is ${inspection.status}.`],
                warnings: inspection.warnings,
            };
        }
        const snapshot = await this.readBootstrapPlanSnapshot(artifactPath);
        const status = snapshot.status === 'ready' || snapshot.status === 'needs_isolation' || snapshot.status === 'unknown'
            ? snapshot.status
            : 'unknown';
        return {
            status,
            blockers: status === 'ready' ? [] : snapshot.blockers.length > 0 ? snapshot.blockers : [`Workspace readiness is ${status}.`],
            warnings: snapshot.warnings,
        };
    }
    async readActiveDispatches(changePath, feature) {
        const session = await this.readSession(this.getSessionPath(changePath), feature);
        return session.dispatches
            .filter(dispatch => dispatch.status === 'DISPATCHED')
            .sort((left, right) => left.assignedAt.localeCompare(right.assignedAt));
    }
    selectParallelSafeActiveDispatches(dispatches, report) {
        const tasksById = new Map(this.flattenReportTasks(report).map(task => [task.id, task]));
        const selected = [];
        const warnings = [];
        for (const dispatch of dispatches) {
            const task = tasksById.get(dispatch.taskId);
            if (!task) {
                warnings.push(`Skipped active dispatch ${dispatch.id} because task ${dispatch.taskId} is missing from task graph.`);
                continue;
            }
            if (task.status !== 'IN_PROGRESS') {
                warnings.push(`Skipped active dispatch ${dispatch.id} because task ${dispatch.taskId} is ${task.status}.`);
                continue;
            }
            const conflictsWithSelected = selected.some(selectedDispatch => {
                const selectedTask = tasksById.get(selectedDispatch.taskId);
                return selectedTask
                    ? !task.parallelizable || !selectedTask.parallelizable || tasksConflict(task, selectedTask)
                    : true;
            });
            if (conflictsWithSelected) {
                warnings.push(`Deferred active dispatch ${dispatch.id} for task ${dispatch.taskId} because it conflicts with another active dispatch in this round.`);
                continue;
            }
            selected.push(dispatch);
        }
        return { dispatches: selected, warnings };
    }
    async readOrchestrationFinalReadiness(changePath) {
        try {
            const report = await this.getReport(changePath);
            const completed = report.taskCount > 0
                && report.completedTasks.length === report.taskCount
                && report.graphStatus.toLowerCase() === 'completed';
            if (completed) {
                return { completed: true, reason: 'Task graph is complete.', warnings: [] };
            }
            return {
                completed: false,
                reason: `Task graph is not complete after orchestration. ${report.nextInstruction}`,
                warnings: [],
            };
        }
        catch (error) {
            return {
                completed: false,
                reason: 'Task graph could not be inspected after orchestration.',
                warnings: [`Task graph final readiness check failed: ${error?.message || error}`],
            };
        }
    }
    async prepareOrchestrationTaskRun(input) {
        const target = this.normalizeWorkerToolTarget(input.target || input.dispatch.workerProfile?.targetToolMapping?.target || input.dispatch.workerProfile?.recommendedTarget);
        const packetPath = path.resolve(input.changePath, input.dispatch.packetPath);
        const recordPath = path.resolve(input.changePath, input.dispatch.recordPath);
        const environment = this.buildHarnessEnvironment({
            taskId: input.dispatch.taskId,
            taskTitle: input.dispatch.taskTitle,
            dispatchId: input.dispatch.id,
            target,
            packetPath,
            recordPath,
            changePath: input.changePath,
            projectRoot: input.projectRoot,
        });
        const command = this.renderHarnessCommandTemplate(input.commandTemplate, {
            taskId: input.dispatch.taskId,
            taskTitle: input.dispatch.taskTitle,
            dispatchId: input.dispatch.id,
            target,
            packetPath,
            recordPath,
            changePath: input.changePath,
            projectRoot: input.projectRoot,
        });
        const taskResult = {
            taskId: input.dispatch.taskId,
            taskTitle: input.dispatch.taskTitle,
            dispatchId: input.dispatch.id,
            target,
            command,
            environment,
            packetPath: input.dispatch.packetPath,
            recordPath: input.dispatch.recordPath,
            runId: null,
            runRecordPath: null,
            runReportPath: null,
            exitCode: null,
            timedOut: false,
            completionStatus: null,
            collected: false,
            error: null,
        };
        if (input.dryRun) {
            return taskResult;
        }
        try {
            const run = await this.runWorkerCommand({
                changePath: input.changePath,
                projectRoot: input.projectRoot,
                kind: 'worker',
                feature: input.feature,
                target,
                command,
                taskId: input.dispatch.taskId,
                dispatchId: input.dispatch.id,
                reviewStage: null,
                reviewDispatchId: null,
                launchPlanPath: null,
                reviewArtifactPath: null,
                environment,
                directoryName: WORKER_RUNS_DIR,
                timeoutMs: input.timeoutMs ?? undefined,
                nextInstruction: (record) => `Worker run ${record.id} finished with exit code ${record.exitCode ?? 'unknown'} under orchestration.`,
            });
            taskResult.runId = run.record.id;
            taskResult.runRecordPath = run.record.recordPath;
            taskResult.runReportPath = run.record.reportPath;
            taskResult.exitCode = run.record.exitCode;
            taskResult.timedOut = run.record.timedOut;
        }
        catch (error) {
            taskResult.error = error?.message || String(error);
        }
        return taskResult;
    }
    buildOrchestrationFailedTasks(input) {
        const relativeChangePath = this.toProjectRelativeChangePath(input.projectRoot, input.changePath);
        const failedTasks = [];
        for (const round of input.rounds) {
            for (const task of round.tasks) {
                if (!this.isOrchestrationTaskFailure(task)) {
                    continue;
                }
                failedTasks.push({
                    taskId: task.taskId,
                    taskTitle: task.taskTitle,
                    dispatchId: task.dispatchId,
                    runId: task.runId,
                    exitCode: task.exitCode,
                    timedOut: task.timedOut,
                    completionStatus: task.completionStatus,
                    collected: task.collected,
                    error: task.error,
                    retryCommand: [
                        'ospec execute retry',
                        this.quoteShellArg(relativeChangePath),
                        '--task',
                        this.quoteShellArg(task.taskId),
                        task.runId ? `--run ${this.quoteShellArg(task.runId)}` : '',
                    ].filter(Boolean).join(' '),
                });
            }
        }
        return failedTasks;
    }
    isOrchestrationTaskFailure(task) {
        return Boolean(task.error
            || task.timedOut
            || (task.exitCode !== null && task.exitCode !== 0)
            || task.completionStatus === 'BLOCKED'
            || task.completionStatus === 'NEEDS_CONTEXT');
    }
    buildHarnessEnvironment(input) {
        return {
            OSPEC_TASK_ID: input.taskId,
            OSPEC_TASK_TITLE: input.taskTitle,
            OSPEC_DISPATCH_ID: input.dispatchId,
            OSPEC_TARGET: input.target,
            OSPEC_PACKET_PATH: input.packetPath,
            OSPEC_RECORD_PATH: input.recordPath,
            OSPEC_CHANGE_PATH: input.changePath,
            OSPEC_PROJECT_ROOT: input.projectRoot,
        };
    }
    renderHarnessCommandTemplate(template, input) {
        const values = {
            taskId: this.quoteHarnessTemplateArg(input.taskId),
            taskIdRaw: input.taskId,
            taskTitle: this.quoteHarnessTemplateArg(input.taskTitle),
            taskTitleRaw: input.taskTitle,
            dispatchId: this.quoteHarnessTemplateArg(input.dispatchId),
            dispatchIdRaw: input.dispatchId,
            target: this.quoteHarnessTemplateArg(input.target),
            targetRaw: input.target,
            packet: this.quoteHarnessTemplateArg(input.packetPath),
            packetPath: this.quoteHarnessTemplateArg(input.packetPath),
            packetRaw: input.packetPath,
            promptFile: this.quoteHarnessTemplateArg(input.packetPath),
            record: this.quoteHarnessTemplateArg(input.recordPath),
            recordPath: this.quoteHarnessTemplateArg(input.recordPath),
            recordRaw: input.recordPath,
            changePath: this.quoteHarnessTemplateArg(input.changePath),
            changePathRaw: input.changePath,
            projectRoot: this.quoteHarnessTemplateArg(input.projectRoot),
            projectRootRaw: input.projectRoot,
        };
        return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => values[key] ?? '');
    }
    getOrchestrationNextInstruction(status, input) {
        const relativeChangePath = this.toProjectRelativeChangePath(input.projectRoot, input.changePath);
        if (status === 'dry_run') {
            return 'Review the planned worker commands, then rerun without --dry-run when ready.';
        }
        if (status === 'blocked' || status === 'partial') {
            if (input.failedTasks.length > 0) {
                return `Resolve failed worker task(s), then rerun the first retry command: ${input.failedTasks[0].retryCommand}.`;
            }
            return `Resolve orchestration blockers, inspect worker runs, then rerun ospec execute status ${this.quoteShellArg(relativeChangePath)}.`;
        }
        if (input.rounds.length === 0) {
            return `No worker tasks were run. Inspect next task state with ospec execute status ${this.quoteShellArg(relativeChangePath)}.`;
        }
        return `Orchestration completed. Continue with ospec execute review ${this.quoteShellArg(relativeChangePath)} --stage spec when task graph is complete.`;
    }
    buildOrchestrationRunReport(artifact) {
        const lines = [
            `# Orchestration Run: ${artifact.id}`,
            '',
            `- Feature: ${artifact.feature}`,
            `- Status: ${artifact.status}`,
            `- Started at: ${artifact.startedAt}`,
            `- Completed at: ${artifact.completedAt}`,
            `- Target: ${artifact.target || 'per-dispatch'}`,
            `- Limit: ${artifact.limit ?? 'none'}`,
            `- Max rounds: ${artifact.maxRounds}`,
            `- Timeout ms: ${artifact.timeoutMs ?? 'none'}`,
            `- Dry run: ${artifact.dryRun ? 'yes' : 'no'}`,
            `- Collect: ${artifact.collect ? 'yes' : 'no'}`,
            `- Continue on failure: ${artifact.continueOnFailure ? 'yes' : 'no'}`,
            `- Command source: ${artifact.commandSource}`,
            `- Workspace status: ${artifact.workspaceStatus}`,
            '',
            '## Rounds',
            '',
        ];
        if (artifact.rounds.length === 0) {
            lines.push('No worker rounds were run.', '');
        }
        for (const round of artifact.rounds) {
            lines.push(`### Round ${round.round}`, '');
            lines.push(`- Dispatches created: ${round.dispatchesCreated}`);
            lines.push(`- Active dispatches: ${round.activeDispatches}`);
            for (const task of round.tasks) {
                lines.push('');
                lines.push(`- Task: ${task.taskId} - ${task.taskTitle}`);
                lines.push(`  - Dispatch: ${task.dispatchId}`);
                lines.push(`  - Target: ${task.target}`);
                lines.push(`  - Command: \`${task.command.replace(/`/g, '\\`')}\``);
                lines.push(`  - Environment: ${Object.entries(task.environment).map(([key, value]) => `${key}=${value}`).join('; ')}`);
                lines.push(`  - Run: ${task.runId || 'not run'}`);
                lines.push(`  - Exit code: ${task.exitCode ?? 'unknown'}`);
                lines.push(`  - Timed out: ${task.timedOut ? 'yes' : 'no'}`);
                lines.push(`  - Collected: ${task.collected ? 'yes' : 'no'}`);
                lines.push(`  - Completion: ${task.completionStatus || 'not recorded'}`);
                if (task.error) {
                    lines.push(`  - Error: ${task.error}`);
                }
            }
            lines.push('');
        }
        if (artifact.failedTasks.length > 0) {
            lines.push('## Failed Tasks And Retry Guidance', '');
            for (const task of artifact.failedTasks) {
                lines.push(`- ${task.taskId}: ${task.taskTitle}`);
                lines.push(`  - Dispatch: ${task.dispatchId}`);
                lines.push(`  - Run: ${task.runId || 'not recorded'}`);
                lines.push(`  - Exit code: ${task.exitCode ?? 'unknown'}`);
                lines.push(`  - Timed out: ${task.timedOut ? 'yes' : 'no'}`);
                lines.push(`  - Completion: ${task.completionStatus || 'not recorded'}`);
                lines.push(`  - Collected: ${task.collected ? 'yes' : 'no'}`);
                if (task.error) {
                    lines.push(`  - Error: ${task.error}`);
                }
                lines.push(`  - Retry: \`${task.retryCommand.replace(/`/g, '\\`')}\``);
            }
            lines.push('');
        }
        if (artifact.blockers.length > 0) {
            lines.push('## Blockers', '');
            for (const blocker of artifact.blockers) {
                lines.push(`- ${blocker}`);
            }
            lines.push('');
        }
        if (artifact.warnings.length > 0) {
            lines.push('## Warnings', '');
            for (const warning of artifact.warnings) {
                lines.push(`- ${warning}`);
            }
            lines.push('');
        }
        lines.push('## Next Instruction', '', artifact.nextInstruction, '');
        return lines.join('\n');
    }
    buildHandoffToolMapping(target) {
        return buildWorkerTargetToolMapping(target);
    }
    buildHandoffCommandSequence(relativeChangePath, target) {
        const quotedChangePath = this.quoteShellArg(relativeChangePath);
        return [
            `ospec execute bootstrap ${quotedChangePath}`,
            `ospec execute workspace ${quotedChangePath}`,
            `ospec execute handoff ${quotedChangePath} --target ${target}`,
            `ospec execute dispatch ${quotedChangePath}`,
            `ospec execute complete <task-id> ${quotedChangePath} --status DONE --summary "..."`,
            `ospec execute review ${quotedChangePath} --stage spec`,
            `ospec execute review ${quotedChangePath} --stage quality`,
            `ospec execute verify ${quotedChangePath} --command "..." --status PASSED`,
            `ospec execute finish ${quotedChangePath}`,
        ];
    }
    buildHandoffSafetyRules(target) {
        const rules = [
            'Start or resume from one active change; do not enter queue mode unless explicitly requested.',
            'Do not dispatch workers until workspace-status is ready or the work is moved into an isolated worktree.',
            'Default to the current AI harness native subagent mechanism for worker dispatch; do not use CLI command execution unless native subagents are unavailable.',
            'Do not claim completion until worker-status controller_status is DONE and fresh verification evidence is passing.',
            'Use DONE_WITH_CONCERNS instead of DONE when the implementation works but has known risk or follow-up.',
            'Use NEEDS_CONTEXT or BLOCKED instead of guessing when requirements, dependencies, or environment are missing.',
        ];
        if (target === 'codex' || target === 'claude') {
            rules.push('Keep tool-specific plan state secondary to OSpec artifacts; update OSpec before handoff or closeout.');
        }
        return rules;
    }
    buildNativeAgentLaunchPlan(input) {
        const packet = input.selected.packetPath;
        const task = `${input.selected.taskId} - ${input.selected.taskTitle}`;
        const completionCommand = `ospec execute complete ${input.selected.taskId} ${input.relativeChangePath} --status DONE --summary "..."`;
        const fallbackInstructions = [
            'Use CLI fallback only after confirming the current AI harness has no native Task/subagent/agent dispatch capability.',
            'Fallback worker commands must consume the dispatch packet path and must still report DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
            'For single-worker fallback, use ospec execute launch ... --run --command "...".',
            'For multi-worker fallback, use ospec execute orchestrate ... --command "..." with an explicit command template or .ospec/harness.json.',
        ];
        const adapterPacket = this.buildNativeAgentAdapterPacket({
            relativeChangePath: input.relativeChangePath,
            selected: input.selected,
            target: input.target,
            launchPrompt: input.launchPrompt,
            completionCommand,
        });
        if (input.target === 'codex' || input.target === 'gpt') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'codex-gpt-native-subagent',
                agentPrimitive: 'spawn_agent / wait_agent / close_agent',
                dispatchMode: 'native-subagent',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt as the worker message and includes the dispatch packet path.',
                resultCollection: 'Controller waits for worker output with wait_agent, closes finished workers, then records ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Codex/GPT native multi-agent tools: spawn_agent, wait_agent, close_agent',
                defaultPath: true,
                instructions: [
                    `Spawn a worker agent for task ${task} using agent_type "worker".`,
                    `Pass the launch prompt as the worker message and include the dispatch packet path: ${packet}.`,
                    'Give the worker disjoint ownership of the packet target files and tell it other workers may be editing different files.',
                    'Do not make the worker read unrelated chat history; provide only the packet, core change paths, and explicit context from the launch prompt.',
                ],
                parallelInstructions: [
                    'For multiple parallel-safe packets, call spawn_agent once per packet in the same controller turn.',
                    'Use wait_agent on the spawned agent ids, integrate completed results as they arrive, and close_agent when each worker is no longer needed.',
                    'Do not spawn workers for conflicting target files in the same round.',
                ],
                completionInstructions: [
                    'Read each worker final status and map it to DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
                    `Record the task result with: ${completionCommand}`,
                    'Run ospec execute sync after manual artifact edits or after collecting multiple worker results.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'claude') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'claude-code-task-subagent',
                agentPrimitive: 'Task',
                dispatchMode: 'native-subagent',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt to a Task tool call with the dispatch packet path.',
                resultCollection: 'Controller reads Task output and records the accepted result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Claude Code native Task tool with a general-purpose subagent',
                defaultPath: true,
                instructions: [
                    `Dispatch a Task tool call for task ${task} using the general-purpose subagent.`,
                    `Fill the Task prompt with the launch prompt and dispatch packet path: ${packet}.`,
                    'Provide the task text directly in the prompt; do not ask the subagent to infer scope from chat history.',
                    'Require the subagent to report DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
                ],
                parallelInstructions: [
                    'Dispatch independent Task calls together when the selected packets are parallel-safe.',
                    'Keep dependent or conflicting tasks sequential.',
                    'Review each Task result before recording OSpec completion.',
                ],
                completionInstructions: [
                    `Record the accepted result with: ${completionCommand}`,
                    'If the Task reports NEEDS_CONTEXT or BLOCKED, record that status and write the blocker trail instead of guessing.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'gemini') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'gemini-generalist-subagent',
                agentPrimitive: '@generalist',
                dispatchMode: 'native-mention',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt through a Gemini @generalist request with the dispatch packet path.',
                resultCollection: 'Controller reads @generalist output and records the result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Gemini CLI native subagents via @generalist',
                defaultPath: true,
                instructions: [
                    `Dispatch @generalist for task ${task}.`,
                    `Pass the full launch prompt and dispatch packet path: ${packet}.`,
                    'Use @generalist for implementer, spec reviewer, and code quality reviewer prompts unless a more specific Gemini agent is configured.',
                    'Require the subagent to return the OSpec worker status contract.',
                ],
                parallelInstructions: [
                    'Request multiple independent @generalist tasks together when OSpec marks them parallel-safe.',
                    'Keep conflicting or dependent task packets sequential.',
                ],
                completionInstructions: [
                    `Record the result with: ${completionCommand}`,
                    'Use ospec execute sync after recording multiple Gemini subagent results.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'opencode') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'opencode-mention-subagent',
                agentPrimitive: '@mention',
                dispatchMode: 'native-mention',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt to an OpenCode @mention agent with the dispatch packet path.',
                resultCollection: 'Controller reads @mention agent output and records the result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'OpenCode native @mention subagent dispatch',
                defaultPath: true,
                instructions: [
                    `Dispatch an OpenCode @mention agent for task ${task}.`,
                    `Pass the launch prompt and dispatch packet path: ${packet}.`,
                    'Keep the agent write scope limited to the packet target files.',
                    'Require the agent to report the OSpec worker status contract.',
                ],
                parallelInstructions: [
                    'Dispatch independent @mention agent tasks in parallel when OSpec marks the packets parallel-safe.',
                    'Do not parallelize conflicting file ownership.',
                ],
                completionInstructions: [
                    `Record the result with: ${completionCommand}`,
                    'Sync worker status after recording results.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'cursor') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'cursor-agent-task-context',
                agentPrimitive: 'Cursor Agent / task chat',
                dispatchMode: 'native-agent-context',
                requiresControllerAction: true,
                promptTransport: 'Controller passes adapterPacket.prompt and adapterPacket.packetPath into a fresh Cursor Agent context.',
                resultCollection: 'Controller reads Cursor Agent output and records the accepted result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Cursor native agent/task context with OSpec packet as the scoped source of truth',
                defaultPath: true,
                instructions: [
                    `Start a fresh Cursor Agent context for task ${task}.`,
                    `Attach or paste the dispatch packet path: ${packet}.`,
                    'Use adapterPacket.prompt as the worker instruction and keep edits scoped to packet target files.',
                    'Require the worker to report the OSpec worker status contract.',
                ],
                parallelInstructions: [
                    'Run separate Cursor agent contexts for independent packets only when file ownership is disjoint.',
                    'Keep dependent or conflicting packets sequential.',
                ],
                completionInstructions: [
                    `Record the result with: ${completionCommand}`,
                    'Use ospec execute sync after recording multiple Cursor worker results.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'copilot') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'copilot-cli-task-context',
                agentPrimitive: 'Copilot CLI / coding agent task',
                dispatchMode: 'native-agent-context',
                requiresControllerAction: true,
                promptTransport: 'Controller passes adapterPacket.prompt and the dispatch packet path into Copilot task context.',
                resultCollection: 'Controller reads Copilot output and records the accepted result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'GitHub Copilot CLI or coding-agent task handoff with OSpec packet context',
                defaultPath: true,
                instructions: [
                    `Start a Copilot task/agent context for task ${task}.`,
                    `Provide the dispatch packet path: ${packet}.`,
                    'Use adapterPacket.prompt as the task instruction and require scoped edits plus verification evidence.',
                    'Require DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED in the final result.',
                ],
                parallelInstructions: [
                    'Use separate Copilot task contexts for independent packets when the host supports it.',
                    'Keep conflicting packet work sequential.',
                ],
                completionInstructions: [
                    `Record the result with: ${completionCommand}`,
                    'Sync worker status after recording Copilot results.',
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        if (input.target === 'shell') {
            return {
                target: input.target,
                supported: false,
                adapterId: 'shell-cli-fallback',
                agentPrimitive: 'explicit local shell command',
                dispatchMode: 'fallback-only',
                requiresControllerAction: true,
                promptTransport: 'Operator command must read the launch plan and dispatch packet explicitly.',
                resultCollection: 'Controller collects command output or manual status, then records ospec execute complete.',
                fallbackOnly: true,
                mechanism: 'No native subagent mechanism for plain shell',
                defaultPath: false,
                instructions: [
                    'Plain shell is fallback-only. Prefer a subagent-capable harness before using this target.',
                    `If shell is the only available environment, open the dispatch packet manually: ${packet}.`,
                ],
                parallelInstructions: [
                    'Do not claim native parallel worker support from shell alone.',
                    'Use separate human/operator shells only when file ownership is clearly disjoint.',
                ],
                completionInstructions: [
                    `Record manual completion with: ${completionCommand}`,
                ],
                fallbackInstructions,
                adapterPacket,
            };
        }
        return {
            target: input.target,
            supported: true,
            adapterId: 'generic-current-harness-subagent',
            agentPrimitive: 'current harness Task/subagent/agent primitive',
            dispatchMode: 'native-subagent-if-available',
            requiresControllerAction: true,
            promptTransport: 'Controller passes launchPrompt through the current harness native agent mechanism.',
            resultCollection: 'Controller reads worker output and records the result with ospec execute complete.',
            fallbackOnly: false,
            mechanism: 'Current harness native Task/subagent/agent mechanism',
            defaultPath: true,
            instructions: [
                `Dispatch the current harness native worker agent for task ${task}.`,
                `Pass the launch prompt and dispatch packet path: ${packet}.`,
                'Use the harness-native subagent mechanism if available before considering CLI command execution.',
                'Require the worker to return DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
            ],
            parallelInstructions: [
                'Dispatch one native worker per parallel-safe packet when the current harness supports parallel agents.',
                'Keep conflicting packets sequential.',
            ],
            completionInstructions: [
                `Record each result with: ${completionCommand}`,
                'Run ospec execute sync after recording results.',
            ],
            fallbackInstructions,
            adapterPacket,
        };
    }
    buildNativeAgentAdapterPacket(input) {
        return {
            version: '1.0',
            schemaVersion: 'ospec.native-agent.adapter-packet.v1',
            adapterId: this.getNativeAgentAdapterId(input.target),
            target: input.target,
            targetCapabilities: {
                capabilityTier: input.selected.workerProfile?.capabilityTier || 'unknown',
                recommendedTarget: input.selected.workerProfile?.recommendedTarget || 'unknown',
                workerRole: input.selected.workerRole,
                canEditFiles: input.selected.targetToolMapping?.editFiles !== 'none',
                canRunCommands: input.selected.targetToolMapping?.runCommands !== 'none',
                canDispatchWorkers: input.selected.targetToolMapping?.dispatchWorkers !== 'none',
            },
            dispatchMode: this.getNativeAgentDispatchMode(input.target),
            agentPrimitive: this.getNativeAgentPrimitive(input.target),
            taskId: input.selected.taskId,
            taskTitle: input.selected.taskTitle,
            dispatchId: input.selected.id,
            packetPath: input.selected.packetPath,
            recordPath: input.selected.recordPath,
            prompt: input.launchPrompt,
            completionCommand: input.completionCommand,
            resultStatusContract: ['DONE', 'DONE_WITH_CONCERNS', 'NEEDS_CONTEXT', 'BLOCKED'],
            completionContract: {
                command: input.completionCommand,
                allowedStatuses: ['DONE', 'DONE_WITH_CONCERNS', 'NEEDS_CONTEXT', 'BLOCKED'],
                requiresSummary: true,
                updatesDurableState: true,
            },
            environment: {
                OSPEC_TASK_ID: input.selected.taskId,
                OSPEC_TASK_TITLE: input.selected.taskTitle,
                OSPEC_DISPATCH_ID: input.selected.id,
                OSPEC_TARGET: input.target,
                OSPEC_PACKET_PATH: input.selected.packetPath,
                OSPEC_RECORD_PATH: input.selected.recordPath,
                OSPEC_CHANGE_PATH: input.relativeChangePath,
            },
            safetyRules: [
                'Read the dispatch packet before editing.',
                'Keep edits scoped to the task target files unless the packet explains otherwise.',
                'Do not overwrite unrelated user changes.',
                'Run only task-relevant verification commands.',
                'Report blockers or missing context instead of guessing.',
            ],
            requiredInputs: [
                'adapterPacket.prompt',
                'adapterPacket.packetPath',
                'adapterPacket.recordPath',
                'adapterPacket.completionCommand',
            ],
            expectedOutputs: [
                'A concise worker summary.',
                'One completion status from completionContract.allowedStatuses.',
                'Relevant verification notes or blocker details.',
                'Durable completion recorded through completionContract.command.',
            ],
            controllerActions: [
                'Start a fresh native worker context when the harness supports it.',
                'Pass prompt and packetPath exactly; do not rely on unrelated chat history.',
                'Wait for the worker result and map it to the resultStatusContract.',
                'Run completionCommand with the accepted status and summary.',
            ],
            toolMapping: input.selected.targetToolMapping,
        };
    }
    getNativeAgentAdapterId(target) {
        if (target === 'codex' || target === 'gpt') {
            return 'codex-gpt-native-subagent';
        }
        if (target === 'claude') {
            return 'claude-code-task-subagent';
        }
        if (target === 'gemini') {
            return 'gemini-generalist-subagent';
        }
        if (target === 'opencode') {
            return 'opencode-mention-subagent';
        }
        if (target === 'cursor') {
            return 'cursor-agent-task-context';
        }
        if (target === 'copilot') {
            return 'copilot-cli-task-context';
        }
        if (target === 'shell') {
            return 'shell-cli-fallback';
        }
        return 'generic-current-harness-subagent';
    }
    getNativeAgentPrimitive(target) {
        if (target === 'codex' || target === 'gpt') {
            return 'spawn_agent / wait_agent / close_agent';
        }
        if (target === 'claude') {
            return 'Task';
        }
        if (target === 'gemini') {
            return '@generalist';
        }
        if (target === 'opencode') {
            return '@mention';
        }
        if (target === 'cursor') {
            return 'Cursor Agent / task chat';
        }
        if (target === 'copilot') {
            return 'Copilot CLI / coding agent task';
        }
        if (target === 'shell') {
            return 'explicit local shell command';
        }
        return 'current harness Task/subagent/agent primitive';
    }
    getNativeAgentDispatchMode(target) {
        if (target === 'shell') {
            return 'fallback-only';
        }
        if (target === 'gemini' || target === 'opencode') {
            return 'native-mention';
        }
        if (target === 'cursor' || target === 'copilot') {
            return 'native-agent-context';
        }
        return 'native-subagent';
    }
    buildWorkerLaunchCommands(input) {
        const quotedChangePath = this.quoteShellArg(input.relativeChangePath);
        const quotedTaskId = this.quoteShellArg(input.selected.taskId);
        const commands = [
            '# CLI fallback only: prefer the current AI harness native subagent mechanism first.',
            `cd ${this.quoteShellArg(input.projectRoot)}`,
            `ospec execute bootstrap ${quotedChangePath}`,
            `ospec execute workspace ${quotedChangePath}`,
            `ospec execute launch ${quotedChangePath} --task ${quotedTaskId} --target ${input.target}${input.dryRun ? ' --dry-run' : ''}`,
        ];
        if (input.target === 'codex' || input.target === 'gpt') {
            commands.push(`# If native spawn_agent is unavailable, run an explicit Codex/GPT worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'claude') {
            commands.push(`# If Claude Task dispatch is unavailable, run an explicit Claude worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'gemini') {
            commands.push(`# If Gemini @generalist is unavailable, run an explicit Gemini worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'opencode') {
            commands.push(`# If OpenCode @mention agents are unavailable, run an explicit OpenCode worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'cursor') {
            commands.push(`# If Cursor Agent task context is unavailable, run an explicit worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'copilot') {
            commands.push(`# If Copilot task/coding-agent context is unavailable, run an explicit worker command that consumes ${input.selected.packetPath}.`);
        }
        else if (input.target === 'shell') {
            commands.push(`# Open ${input.selected.packetPath} and complete the task manually in this shell.`);
        }
        else {
            commands.push(`# Hand ${input.selected.packetPath} and ${input.reportPath} to the selected worker tool only if it has no native agent mechanism.`);
        }
        commands.push(`ospec execute launch ${quotedChangePath} --task ${quotedTaskId} --target ${input.target} --run --command "<explicit worker command that reads ${input.selected.packetPath}>"`);
        commands.push(`ospec execute complete ${quotedTaskId} ${quotedChangePath} --status DONE --summary "..."`);
        return commands;
    }
    buildWorkerLaunchPrompt(input) {
        return [
            'You are receiving an OSpec worker launch packet.',
            '',
            `Change path: ${input.relativeChangePath}`,
            `Task: ${input.selected.taskId} - ${input.selected.taskTitle}`,
            `Dispatch ID: ${input.selected.id}`,
            `Dispatch packet: ${input.selected.packetPath}`,
            `Dispatch record: ${input.selected.recordPath}`,
            `Target: ${input.target}`,
            input.dryRun ? 'Mode: dry run. Inspect context and report readiness; do not edit files.' : 'Mode: implementation. Edit only within the packet scope unless evidence proves the scope is wrong.',
            '',
            'Required behavior:',
            '- Read proposal.md, design.md, implementation-plan.md, tasks.md, task-graph.json, worker-status.md, and the dispatch packet before editing.',
            '- Keep tool-specific plan state secondary to OSpec artifacts.',
            '- Run the packet verification commands or record why they could not run.',
            '- Use NEEDS_CONTEXT or BLOCKED instead of guessing when requirements, dependencies, or environment are missing.',
            '',
            'Completion command:',
            `ospec execute complete ${input.selected.taskId} ${input.relativeChangePath} --status DONE --summary "..."`,
        ].join('\n');
    }
    async runWorkerCommand(input) {
        const startedAt = new Date().toISOString();
        const runId = `${input.kind}-run-${this.toFileSafeTimestamp(startedAt)}-${this.toFileSafeId(input.taskId || input.reviewStage || 'worker')}`;
        const runDir = path.join(input.changePath, 'artifacts', 'agents', input.directoryName);
        const recordPath = path.join(runDir, `${runId}.json`);
        const reportPath = path.join(runDir, `${runId}.md`);
        const stdoutPath = path.join(runDir, `${runId}.stdout.log`);
        const stderrPath = path.join(runDir, `${runId}.stderr.log`);
        const timeoutMs = this.normalizeTimeoutMs(input.timeoutMs);
        const environment = input.environment && Object.keys(input.environment).length > 0
            ? input.environment
            : null;
        const result = await this.runShellCommand(input.command, input.projectRoot, timeoutMs, environment);
        const completedAt = new Date().toISOString();
        const stdout = result.stdout;
        const stderr = result.stderr;
        await this.fileService.writeFile(stdoutPath, stdout);
        await this.fileService.writeFile(stderrPath, stderr);
        const exitCode = typeof result.status === 'number' ? result.status : null;
        const record = {
            id: runId,
            kind: input.kind,
            feature: input.feature,
            target: input.target,
            command: input.command,
            environment,
            cwd: input.projectRoot,
            status: exitCode === 0 && !result.timedOut ? 'completed' : 'failed',
            exitCode,
            signal: result.signal,
            timedOut: result.timedOut,
            timeoutMs,
            startedAt,
            completedAt,
            taskId: input.taskId,
            dispatchId: input.dispatchId,
            reviewStage: input.reviewStage,
            reviewDispatchId: input.reviewDispatchId,
            launchPlanPath: input.launchPlanPath,
            reviewArtifactPath: input.reviewArtifactPath,
            recordPath: this.toChangeRelativePath(input.changePath, recordPath),
            reportPath: this.toChangeRelativePath(input.changePath, reportPath),
            stdoutPath: this.toChangeRelativePath(input.changePath, stdoutPath),
            stderrPath: this.toChangeRelativePath(input.changePath, stderrPath),
            summary: exitCode === 0 && !result.timedOut
                ? `${input.kind} command exited successfully.`
                : result.timedOut
                    ? `${input.kind} command timed out after ${timeoutMs ?? 'unknown'} ms.`
                    : `${input.kind} command failed with exit code ${exitCode ?? 'unknown'}.`,
            collectedAt: null,
            completionStatus: null,
        };
        await this.writeWorkerRunRecord(input.changePath, record);
        await this.writeLocalizedReportFile(input.changePath, reportPath, this.buildWorkerRunReport(record));
        return {
            changePath: input.changePath,
            recordPath,
            reportPath,
            stdoutPath,
            stderrPath,
            record,
            nextInstruction: input.nextInstruction(record),
        };
    }
    normalizeTimeoutMs(timeoutMs) {
        if (timeoutMs === undefined || timeoutMs === null) {
            return DEFAULT_COMMAND_TIMEOUT_MS;
        }
        if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
            return DEFAULT_COMMAND_TIMEOUT_MS;
        }
        return Math.floor(timeoutMs);
    }
    runShellCommand(command, cwd, timeoutMs, environment) {
        return new Promise(resolve => {
            const child = childProcess.spawn(command, {
                cwd,
                shell: true,
                windowsHide: true,
                env: environment ? { ...process.env, ...environment } : process.env,
            });
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let settled = false;
            const appendLimited = (current, chunk) => {
                if (Buffer.byteLength(current, 'utf8') >= MAX_CAPTURED_COMMAND_OUTPUT_BYTES) {
                    return current;
                }
                const next = current + chunk.toString();
                if (Buffer.byteLength(next, 'utf8') <= MAX_CAPTURED_COMMAND_OUTPUT_BYTES) {
                    return next;
                }
                return next.slice(0, MAX_CAPTURED_COMMAND_OUTPUT_BYTES) + '\n[ospec output truncated]';
            };
            const timer = timeoutMs && timeoutMs > 0
                ? setTimeout(() => {
                    timedOut = true;
                    child.kill('SIGTERM');
                }, timeoutMs)
                : null;
            child.stdout?.on('data', chunk => {
                stdout = appendLimited(stdout, chunk);
            });
            child.stderr?.on('data', chunk => {
                stderr = appendLimited(stderr, chunk);
            });
            child.on('error', error => {
                stderr = appendLimited(stderr, `\n[ospec spawn error] ${error.message}`);
            });
            child.on('close', (status, signal) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timer) {
                    clearTimeout(timer);
                }
                resolve({
                    stdout,
                    stderr: stderr.trimStart(),
                    status: typeof status === 'number' ? status : null,
                    signal: typeof signal === 'string' ? signal : null,
                    timedOut,
                });
            });
        });
    }
    async writeWorkerRunRecord(changePath, record) {
        await this.fileService.writeJSON(path.join(changePath, record.recordPath), record);
        await this.writeLocalizedReportFile(changePath, path.join(changePath, record.reportPath), this.buildWorkerRunReport(record));
    }
    async findWorkerRunRecord(changePath, options = {}) {
        const runDir = path.join(changePath, 'artifacts', 'agents', WORKER_RUNS_DIR);
        if (!(await this.fileService.exists(runDir))) {
            if (options.optional) {
                return null;
            }
            throw new Error('No worker run records exist yet.');
        }
        const entries = await this.fileService.readDir(runDir);
        const records = [];
        for (const entry of entries.filter(item => item.endsWith('.json'))) {
            const record = await this.fileService.readJSON(path.join(runDir, entry));
            if (options.runId && record.id !== options.runId) {
                continue;
            }
            if (options.taskId && record.taskId !== options.taskId) {
                continue;
            }
            records.push(record);
        }
        const selected = records.sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] || null;
        if (!selected && !options.optional) {
            throw new Error(options.runId
                ? `Worker run not found: ${options.runId}`
                : `Worker run not found for task: ${options.taskId || '(latest)'}`);
        }
        return selected;
    }
    buildWorkerRunReport(record) {
        const environmentEntries = record.environment
            ? Object.entries(record.environment).sort(([left], [right]) => left.localeCompare(right))
            : [];
        return [
            `# ${record.kind === 'review' ? 'Review' : 'Worker'} Run: ${record.id}`,
            '',
            `- Feature: ${record.feature}`,
            `- Kind: ${record.kind}`,
            `- Target: ${record.target}`,
            `- Status: ${record.status}`,
            `- Exit code: ${record.exitCode ?? 'unknown'}`,
            `- Signal: ${record.signal || 'none'}`,
            `- Timed out: ${record.timedOut ? 'yes' : 'no'}`,
            `- Timeout ms: ${record.timeoutMs ?? 'none'}`,
            `- Started at: ${record.startedAt}`,
            `- Completed at: ${record.completedAt}`,
            `- Task: ${record.taskId || 'not applicable'}`,
            `- Dispatch: ${record.dispatchId || record.reviewDispatchId || 'not recorded'}`,
            `- Review stage: ${record.reviewStage || 'not applicable'}`,
            `- Command: \`${record.command}\``,
            `- Environment: ${environmentEntries.length > 0 ? 'recorded' : 'not recorded'}`,
            `- Stdout: ${record.stdoutPath}`,
            `- Stderr: ${record.stderrPath}`,
            `- Collected at: ${record.collectedAt || 'not collected'}`,
            `- Completion status: ${record.completionStatus || 'not collected'}`,
            '',
            ...(environmentEntries.length > 0
                ? [
                    '## Environment',
                    '',
                    ...environmentEntries.map(([key, value]) => `- ${key}: ${value}`),
                    '',
                ]
                : []),
            '## Summary',
            '',
            record.summary || 'No summary recorded.',
            '',
        ].join('\n');
    }
    buildWorkerRetryReport(record) {
        return [
            `# Worker Retry: ${record.id}`,
            '',
            `- Feature: ${record.feature}`,
            `- Task: ${record.taskId}`,
            `- Previous status: ${record.previousStatus}`,
            `- Previous run: ${record.previousRunId || 'not recorded'}`,
            `- Created at: ${record.createdAt}`,
            '',
            '## Summary',
            '',
            record.summary || 'Retry requested after blocker or failed worker run was resolved.',
            '',
        ].join('\n');
    }
    flattenReportTasks(report) {
        return [
            ...report.readyTasks,
            ...report.runningTasks,
            ...report.completedTasks,
            ...report.concernTasks,
            ...report.blockedTasks.map(item => item.task),
            ...report.invalidTasks.map(item => item.task),
        ];
    }
    async applyReviewRunDecision(changePath, reviewArtifactRelativePath, input) {
        const decision = this.normalizeReviewRunDecision(input.decision);
        const reviewArtifactPath = path.join(changePath, reviewArtifactRelativePath);
        const document = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        document.data.decision = decision;
        document.data.status = decision === 'PENDING' ? 'pending' : 'reviewed';
        const runNote = [
            '',
            '## Automated Review Run',
            '',
            `- Run: ${input.run.record.id}`,
            `- Decision: ${decision}`,
            `- Exit code: ${input.run.record.exitCode ?? 'unknown'}`,
            `- Stdout: ${input.run.record.stdoutPath}`,
            `- Stderr: ${input.run.record.stderrPath}`,
            input.summary ? `- Summary: ${input.summary}` : '- Summary: no summary recorded',
            '',
        ].join('\n');
        await this.fileService.writeFile(reviewArtifactPath, (0, helpers_1.stringifyFrontmatter)(`${document.content.trimEnd()}\n${runNote}`, document.data));
    }
    normalizeReviewRunDecision(value) {
        const normalized = normalizeStatus(value);
        if (normalized === 'APPROVED' || normalized === 'APPROVED_WITH_CONCERNS' || normalized === 'NEEDS_CHANGES' || normalized === 'BLOCKED' || normalized === 'PENDING') {
            return normalized;
        }
        throw new Error(`Unsupported review run decision: ${value}`);
    }
    getHandoffNextInstruction(relativeChangePath, taskGraph) {
        const quotedChangePath = this.quoteShellArg(relativeChangePath);
        if (!taskGraph.exists) {
            return `Create artifacts/agents/task-graph.json, then rerun ospec execute handoff ${quotedChangePath}.`;
        }
        if (taskGraph.invalid > 0) {
            return 'Fix invalid task graph entries before worker handoff.';
        }
        if (taskGraph.dispatchable > 0) {
            return `Use artifacts/agents/handoff.md as the worker environment guide, then run ospec execute dispatch ${quotedChangePath}.`;
        }
        if (taskGraph.running > 0) {
            return 'Continue in-progress packet work, then record each result with ospec execute complete <task-id>.';
        }
        if (taskGraph.blocked > 0) {
            return 'Resolve blocked task graph entries or record NEEDS_CONTEXT/BLOCKED before dispatching more work.';
        }
        return taskGraph.nextInstruction;
    }
    updateRawTaskStatus(rawGraph, taskId, status) {
        if (!Array.isArray(rawGraph?.tasks)) {
            throw new Error('Task graph tasks must be an array before task status can be updated.');
        }
        const task = rawGraph.tasks.find((item) => item?.id === taskId);
        if (!task) {
            throw new Error(`Task not found in task graph: ${taskId}`);
        }
        task.status = status;
    }
    resetRawTaskReview(rawGraph, task) {
        if (!Array.isArray(rawGraph?.tasks)) {
            throw new Error('Task graph tasks must be an array before task review can be updated.');
        }
        const rawTask = rawGraph.tasks.find((item) => item?.id === task.id);
        if (!rawTask) {
            throw new Error(`Task not found in task graph: ${task.id}`);
        }
        rawTask.review = {
            spec: 'PENDING',
            quality: 'PENDING',
            spec_artifact: this.getTaskReviewArtifactRelativePath(task.id, 'spec'),
            quality_artifact: this.getTaskReviewArtifactRelativePath(task.id, 'quality'),
        };
    }
    normalizeCompletionStatus(status) {
        const normalized = normalizeStatus(status || 'DONE');
        if (normalized === 'DONE' || normalized === 'DONE_WITH_CONCERNS' || normalized === 'NEEDS_CONTEXT' || normalized === 'BLOCKED') {
            return normalized;
        }
        throw new Error(`Unsupported task completion status: ${status}`);
    }
    normalizeVerificationEvidenceStatus(status) {
        const normalized = normalizeStatus(status || 'PASSED');
        if (this.isVerificationEvidenceStatus(normalized)) {
            return normalized;
        }
        throw new Error(`Unsupported verification evidence status: ${status}`);
    }
    normalizeTddEvidencePhase(phase) {
        const normalized = typeof phase === 'string' ? phase.trim().toLowerCase() : 'green';
        if (this.isTddEvidencePhase(normalized)) {
            return normalized;
        }
        throw new Error(`Unsupported TDD evidence phase: ${phase}`);
    }
    normalizeTddEvidenceStatus(phase, status) {
        const defaultStatus = phase === 'red' ? 'FAILED' : 'PASSED';
        const normalized = normalizeStatus(status || defaultStatus);
        if (this.isVerificationEvidenceStatus(normalized)) {
            return normalized;
        }
        throw new Error(`Unsupported TDD evidence status: ${status}`);
    }
    validateTddEvidenceTransition(records, next) {
        const summary = next.summary?.trim() || '';
        if (next.status === 'SKIPPED') {
            if (!summary) {
                throw new Error('Skipped TDD evidence requires --summary with the concrete reason.');
            }
            return;
        }
        if (next.phase === 'red') {
            if (next.status === 'PASSED') {
                throw new Error('Red TDD evidence must not be PASSED; record the expected failing test before implementation.');
            }
            return;
        }
        const relevant = records.filter(record => record.status !== 'SKIPPED');
        const latest = relevant[relevant.length - 1];
        if (next.phase === 'green') {
            if (!latest || latest.phase !== 'red' || latest.status !== 'FAILED') {
                throw new Error('Green TDD evidence requires a prior red FAILED evidence record for the same cycle.');
            }
            return;
        }
        if (next.phase === 'refactor' && (!latest || !((latest.phase === 'green' || latest.phase === 'refactor') && latest.status === 'PASSED'))) {
            throw new Error('Refactor TDD evidence requires prior green or refactor PASSED evidence.');
        }
    }
    normalizeDebugEvidenceStatus(status) {
        const normalized = normalizeStatus(status || 'CONFIRMED');
        if (this.isDebugEvidenceStatus(normalized)) {
            return normalized;
        }
        throw new Error(`Unsupported debug evidence status: ${status}`);
    }
    normalizeDebugEvidencePhase(phase, status, options) {
        if (phase) {
            const normalized = phase.trim().toLowerCase();
            if (this.isDebugEvidencePhase(normalized)) {
                return normalized;
            }
            throw new Error(`Unsupported debug evidence phase: ${phase}`);
        }
        return this.deriveDebugEvidencePhase(status, options);
    }
    deriveDebugEvidencePhase(status, options) {
        if (status === 'FIXED') {
            return 'verify';
        }
        if (status === 'BLOCKED' && options.command?.trim()) {
            return 'verify';
        }
        if (options.rootCause?.trim()) {
            return 'isolate';
        }
        if (options.hypothesis?.trim()) {
            return 'hypothesize';
        }
        return 'reproduce';
    }
    validateDebugEvidencePhase(input) {
        if (input.phase === 'hypothesize' && !input.hypothesis?.trim()) {
            throw new Error('Hypothesize debug evidence requires --hypothesis.');
        }
        if ((input.phase === 'isolate' || input.phase === 'fix' || input.phase === 'verify') && (input.status === 'CONFIRMED' || input.status === 'FIXED') && !input.rootCause) {
            throw new Error(`Debug phase ${input.phase} requires --root-cause for ${input.status} evidence.`);
        }
    }
    deriveVerificationEvidenceStatus(records) {
        const latest = records[records.length - 1];
        if (!latest) {
            return 'pending';
        }
        if (latest.status === 'PASSED') {
            return 'passed';
        }
        if (latest.status === 'FAILED') {
            return 'failed';
        }
        if (latest.status === 'BLOCKED') {
            return 'blocked';
        }
        return 'skipped';
    }
    deriveTddEvidenceStatus(records) {
        const latest = records[records.length - 1];
        if (!latest) {
            return 'pending';
        }
        if (latest.status === 'BLOCKED') {
            return 'blocked';
        }
        if (latest.status === 'SKIPPED') {
            return 'skipped';
        }
        if (latest.phase === 'red') {
            return latest.status === 'FAILED' ? 'red' : 'failed';
        }
        if (latest.status !== 'PASSED') {
            return 'failed';
        }
        if (latest.phase === 'green') {
            const hasEarlierRedFailure = records
                .slice(0, -1)
                .some(record => record.phase === 'red' && record.status === 'FAILED');
            return hasEarlierRedFailure ? 'green' : 'failed';
        }
        if (latest.phase === 'refactor') {
            const hasEarlierPassingGreen = records
                .slice(0, -1)
                .some(record => record.phase === 'green' && record.status === 'PASSED');
            const hasEarlierRedFailure = records
                .some(record => record.phase === 'red' && record.status === 'FAILED');
            return hasEarlierPassingGreen && hasEarlierRedFailure ? 'refactor' : 'failed';
        }
        return 'failed';
    }
    deriveDebugEvidenceStatus(records) {
        const latest = records[records.length - 1];
        if (!latest) {
            return 'pending';
        }
        if (latest.status === 'CONFIRMED') {
            return 'confirmed';
        }
        if (latest.status === 'FIXED') {
            return 'fixed';
        }
        if (latest.status === 'BLOCKED') {
            return 'blocked';
        }
        return 'skipped';
    }
    buildDebugEvidencePhaseSnapshots(records) {
        const phases = ['reproduce', 'isolate', 'hypothesize', 'fix', 'verify'];
        return phases.map(phase => {
            const latest = [...records].reverse().find(record => record.phase === phase) || null;
            return {
                phase,
                status: latest
                    ? latest.status === 'BLOCKED'
                        ? 'blocked'
                        : latest.status === 'SKIPPED'
                            ? 'skipped'
                            : 'recorded'
                    : 'missing',
                latestRecordId: latest?.id || null,
                latestStatus: latest?.status || null,
            };
        });
    }
    getTddEvidenceNextInstruction(record) {
        if (record.phase === 'red' && record.status === 'FAILED') {
            return 'Red TDD evidence is recorded. Implement the minimal fix and record green evidence next.';
        }
        if ((record.phase === 'green' || record.phase === 'refactor') && record.status === 'PASSED') {
            return 'TDD evidence is recorded. Continue with the next cycle or final verification evidence.';
        }
        if (record.status === 'SKIPPED') {
            return 'TDD evidence is recorded as skipped. Record the reason in verification.md before archive.';
        }
        return 'TDD evidence is recorded with a non-ready status. Resolve the issue and record later passing green or refactor evidence.';
    }
    getDebugEvidenceNextInstruction(record) {
        if (record.status === 'SKIPPED') {
            return 'Debug evidence is recorded as skipped. Keep the reason in verification.md if debugging was not applicable.';
        }
        if (record.status === 'BLOCKED') {
            return 'Debug evidence is blocked. Resolve the blocker or gather missing reproduction/root-cause context before claiming completion.';
        }
        if (record.phase === 'reproduce') {
            return 'Reproduction evidence is recorded. Isolate the root cause or record the leading hypothesis next.';
        }
        if (record.phase === 'hypothesize') {
            return 'Debug hypothesis is recorded. Isolate the root cause and record an isolate phase entry next.';
        }
        if (record.phase === 'isolate') {
            return 'Root cause isolation is recorded. Apply the fix and record a fix phase entry next.';
        }
        if (record.phase === 'fix') {
            return 'Fix evidence is recorded. Verify the fix with a concrete command or observation and record verify phase evidence next.';
        }
        if (record.phase === 'verify' && record.status === 'FIXED') {
            return 'Verified debug evidence is recorded. Continue with focused tests and final verification evidence.';
        }
        if (record.status === 'FIXED') {
            return 'Debug evidence is recorded as fixed. Continue with focused tests and final verification evidence.';
        }
        if (record.status === 'CONFIRMED') {
            return 'Root cause is recorded. Apply the fix, verify it, and record a later FIXED debug evidence entry.';
        }
        return 'Debug evidence is blocked. Resolve the blocker or gather missing reproduction/root-cause context before claiming completion.';
    }
    deriveGraphStatus(rawGraph) {
        const tasks = Array.isArray(rawGraph?.tasks) ? rawGraph.tasks : [];
        if (tasks.length > 0 && tasks.every((task) => {
            if (!TERMINAL_TASK_STATUSES.has(normalizeStatus(task?.status))) {
                return false;
            }
            const review = normalizeTaskReview(task?.review);
            if (!review) {
                return true;
            }
            return APPROVED_REVIEW_DECISIONS.has(review.spec) && APPROVED_REVIEW_DECISIONS.has(review.quality);
        })) {
            return 'completed';
        }
        return 'in_progress';
    }
    deriveSessionStatus(rawGraph) {
        const tasks = Array.isArray(rawGraph?.tasks) ? rawGraph.tasks : [];
        if (tasks.some((task) => normalizeStatus(task?.status) === 'BLOCKED')) {
            return 'blocked';
        }
        if (tasks.some((task) => normalizeStatus(task?.status) === 'NEEDS_CONTEXT')) {
            return 'needs_context';
        }
        if (this.deriveGraphStatus(rawGraph) === 'completed') {
            return 'completed';
        }
        return 'running';
    }
    buildDefaultWorkerStatusDocument(feature) {
        return [
            '---',
            `feature: ${feature}`,
            `created: ${new Date().toISOString().split('T')[0]}`,
            'status: pending',
            'implementer_status: PENDING',
            'spec_reviewer_status: PENDING',
            'quality_reviewer_status: PENDING',
            'controller_status: PENDING',
            'allowed_worker_statuses:',
            '  - DONE',
            '  - DONE_WITH_CONCERNS',
            '  - NEEDS_CONTEXT',
            '  - BLOCKED',
            '  - PENDING',
            '---',
            '',
            '## Worker Status Protocol',
            '',
            '- `DONE`: work completed with no blocking issue',
            '- `DONE_WITH_CONCERNS`: work completed, but risks or residual issues require controller judgment',
            '- `NEEDS_CONTEXT`: more context is required before work can continue',
            '- `BLOCKED`: work is blocked by an external condition, conflict, or failure',
            '- `PENDING`: work has not run yet',
            '',
            '## Checklist',
            '',
            '- [ ] Implementer returned `DONE` or `DONE_WITH_CONCERNS`',
            '- [ ] Spec compliance review completed',
            '- [ ] Code quality review completed',
            '- [ ] Controller resolved concerns, context requests, or blockers',
            '- [ ] Final verification commands are recorded in `verification.md`',
            '',
        ].join('\n');
    }
    updateWorkerStatusBody(body, input) {
        const bodyWithChecklist = /^\s*-\s+\[(?: |x|X)\]\s+.+$/m.test(body)
            ? body
            : `${body.trim()}\n\n## Checklist\n\n- [ ] Implementer returned \`DONE\` or \`DONE_WITH_CONCERNS\`\n- [ ] Spec compliance review completed\n- [ ] Code quality review completed\n- [ ] Controller resolved concerns, context requests, or blockers\n- [ ] Final verification commands are recorded in \`verification.md\`\n`;
        const checklistUpdated = bodyWithChecklist
            .split(/\r?\n/)
            .map(line => this.updateWorkerStatusChecklistLine(line, input))
            .join('\n');
        const summary = this.buildWorkerStatusSyncSummary(input);
        const managedBlockPattern = new RegExp(`${this.escapeRegex(MANAGED_WORKER_STATUS_START)}[\\s\\S]*?${this.escapeRegex(MANAGED_WORKER_STATUS_END)}\\n?`, 'm');
        const baseBody = checklistUpdated.replace(managedBlockPattern, '').trimEnd();
        return `${baseBody}\n\n${summary}\n`;
    }
    updateWorkerStatusChecklistLine(line, input) {
        if (!/^\s*-\s+\[(?: |x|X)\]\s+/.test(line)) {
            return line;
        }
        const checked = line.replace(/\[(?: |x|X)\]/, '[x]');
        const unchecked = line.replace(/\[(?: |x|X)\]/, '[ ]');
        if (/implementer/i.test(line)) {
            return TERMINAL_TASK_STATUSES.has(input.implementerStatus) ? checked : unchecked;
        }
        if (/spec compliance review/i.test(line)) {
            return TERMINAL_TASK_STATUSES.has(input.specReviewerStatus) ? checked : unchecked;
        }
        if (/code quality review/i.test(line)) {
            return TERMINAL_TASK_STATUSES.has(input.qualityReviewerStatus) ? checked : unchecked;
        }
        if (/controller/i.test(line)) {
            return input.controllerStatus === 'DONE' ? checked : unchecked;
        }
        if (/verification\.md/i.test(line)) {
            return input.verificationChecklistComplete ? checked : unchecked;
        }
        return line;
    }
    buildWorkerStatusSyncSummary(input) {
        const latestDispatches = input.session.dispatches
            .slice(-5)
            .map(dispatch => `- ${dispatch.taskId}: ${dispatch.status}${dispatch.summary ? ` - ${dispatch.summary}` : ''}`)
            .join('\n') || '- No dispatches recorded yet';
        const latestVerification = input.verificationEvidence.records[input.verificationEvidence.records.length - 1];
        const latestVerificationLine = latestVerification
            ? `${latestVerification.status} - \`${latestVerification.command}\`${latestVerification.summary ? ` - ${latestVerification.summary}` : ''}`
            : 'No verification evidence recorded yet';
        const latestTdd = input.tddEvidence.records[input.tddEvidence.records.length - 1];
        const latestTddLine = latestTdd
            ? `${latestTdd.phase}/${latestTdd.status} - \`${latestTdd.command}\`${latestTdd.summary ? ` - ${latestTdd.summary}` : ''}`
            : 'No TDD evidence recorded yet';
        const latestDebug = input.debugEvidence.records[input.debugEvidence.records.length - 1];
        const latestDebugLine = latestDebug
            ? `${latestDebug.status} - ${latestDebug.rootCause || latestDebug.symptom}${latestDebug.summary ? ` - ${latestDebug.summary}` : ''}`
            : 'No debug evidence recorded yet';
        const latestBlockerLine = input.latestBlockerEscalation
            ? `${input.latestBlockerEscalation.status} - ${input.latestBlockerEscalation.taskId} - ${input.latestBlockerEscalation.summary || 'No summary recorded'} (${input.latestBlockerEscalation.reportPath})`
            : 'No blocker escalation recorded yet';
        return [
            MANAGED_WORKER_STATUS_START,
            '## Execution Session Summary',
            '',
            `- Synced at: ${new Date().toISOString()}`,
            `- Task graph status: ${input.report.graphStatus}`,
            `- Ready tasks: ${input.report.readyTasks.length}`,
            `- Running tasks: ${input.report.runningTasks.length}`,
            `- Completed tasks: ${input.report.completedTasks.length}`,
            `- Blocked tasks: ${input.report.blockedTasks.length}`,
            `- Invalid tasks: ${input.report.invalidTasks.length}`,
            `- Implementer status: \`${input.implementerStatus}\``,
            `- Spec reviewer status: \`${input.specReviewerStatus}\``,
            `- Quality reviewer status: \`${input.qualityReviewerStatus}\``,
            `- Controller status: \`${input.controllerStatus}\``,
            `- Verification checklist complete: ${input.verificationChecklistComplete ? 'yes' : 'no'}`,
            `- TDD evidence status: \`${input.tddEvidence.status}\``,
            `- Latest TDD evidence: ${latestTddLine}`,
            `- Debug evidence status: \`${input.debugEvidence.status}\``,
            `- Latest debug evidence: ${latestDebugLine}`,
            `- Latest blocker escalation: ${latestBlockerLine}`,
            `- Verification evidence status: \`${input.verificationEvidence.status}\``,
            `- Latest verification evidence: ${latestVerificationLine}`,
            '',
            '### Recent Dispatch Results',
            '',
            latestDispatches,
            MANAGED_WORKER_STATUS_END,
        ].join('\n');
    }
    escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    toFileSafeTimestamp(value) {
        return value.replace(/[:.]/g, '-');
    }
    toFileSafeId(value) {
        return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
    }
    toChangeRelativePath(changePath, targetPath) {
        return path.relative(changePath, targetPath).replace(/\\/g, '/');
    }
    buildProjectSessionBriefLines(projectSession) {
        const projectSessionCommands = projectSession && projectSession.recommendedCommands.length > 0
            ? projectSession.recommendedCommands.map(command => `- \`${command}\``).join('\n')
            : '- None';
        const projectSessionWarnings = projectSession && projectSession.warnings.length > 0
            ? projectSession.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        return [
            '## Project Session Brief',
            '',
            `- Exists: ${projectSession?.exists ? 'yes' : 'no'}`,
            `- JSON: ${projectSession?.jsonPath || 'not recorded'}`,
            `- Markdown: ${projectSession?.reportPath || 'not recorded'}`,
            `- Generated at: ${projectSession?.generatedAt || 'not recorded'}`,
            `- Cache status: ${projectSession?.cacheStatus || 'not recorded'}`,
            `- Cache key: ${projectSession?.cacheKey || 'not recorded'}`,
            `- Active changes: ${projectSession?.activeChangeCount ?? 0}`,
            `- Queued changes: ${projectSession?.queuedChangeCount ?? 0}`,
            `- Next: ${projectSession?.nextInstruction || 'not recorded'}`,
            '',
            '### Recommended Commands',
            '',
            projectSessionCommands,
            '',
            '### Session Warnings',
            '',
            projectSessionWarnings,
        ];
    }
    buildDispatchPacket(report, task, record) {
        const profile = record.workerProfile ?? task.workerProfile;
        const targetToolMapping = profile.targetToolMapping ?? buildWorkerTargetToolMapping(profile.recommendedTarget);
        const rationale = profile.rationale.map(item => `- ${item}`).join('\n');
        const requiredBehavior = profile.requiredBehavior.map(item => `- ${item}`).join('\n');
        return [
            `# Agent Dispatch: ${task.id}`,
            '',
            `- Dispatch ID: ${record.id}`,
            `- Change: ${report.feature}`,
            `- Worker role: ${task.workerRole}`,
            `- Capability tier: ${profile.capabilityTier}`,
            `- Recommended target: ${profile.recommendedTarget}`,
            `- Status: ${record.status}`,
            `- Parallelizable: ${task.parallelizable ? 'yes' : 'no'}`,
            `- Target files: ${task.targetFiles.join(', ') || 'none'}`,
            `- Verification commands: ${task.verificationCommands.join(' && ') || 'none'}`,
            `- Expected result: ${task.expectedResult || 'none'}`,
            '',
            '## Worker Profile',
            '',
            profile.summary,
            '',
            '### Rationale',
            '',
            rationale,
            '',
            '### Required Behavior',
            '',
            requiredBehavior,
            '',
            ...this.buildProjectSessionBriefLines(record.projectSession),
            '',
            '## Target Tool Mapping',
            '',
            `- Target: ${targetToolMapping.target}`,
            `- Read context: ${targetToolMapping.readContext}`,
            `- Edit files: ${targetToolMapping.editFiles}`,
            `- Run commands: ${targetToolMapping.runCommands}`,
            `- Track plan: ${targetToolMapping.trackPlan}`,
            `- Dispatch workers: ${targetToolMapping.dispatchWorkers}`,
            `- Record completion: ${targetToolMapping.recordCompletion}`,
            '',
            '## Task',
            '',
            task.title,
            '',
            '## Required Context',
            '',
            '- Read `proposal.md`, `design.md`, `implementation-plan.md`, `tasks.md`, and `artifacts/agents/task-graph.json` before editing.',
            '- Keep changes scoped to the target files unless implementation proves a listed file is wrong.',
            '- Run the verification command(s) listed above or record why they could not be run.',
            '- Perform an implementer self-review before reporting status; record any concern as `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED` instead of hiding it.',
            '- Expect a separate task-level spec review followed by a task-level quality review before dependent work can proceed.',
            '',
            '## Completion',
            '',
            `When finished, record the result with:`,
            '',
            '```bash',
            `ospec execute complete ${task.id} [change-path] --status DONE --summary "..."`,
            '```',
            '',
            'Use `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED` when the result is not cleanly complete.',
            '',
        ].join('\n');
    }
    buildBlockerEscalationReport(report, record) {
        const nextActions = record.nextActions.map(action => `- ${action}`).join('\n');
        return [
            `# Worker Blocker Escalation: ${record.taskId}`,
            '',
            `- Escalation ID: ${record.id}`,
            `- Change: ${report.feature}`,
            `- Task: ${record.taskTitle}`,
            `- Status: ${record.status}`,
            `- Created at: ${record.createdAt}`,
            `- Worker role: ${record.workerRole}`,
            `- Capability tier: ${record.workerProfile?.capabilityTier || 'not recorded'}`,
            `- Dispatch ID: ${record.dispatchId || 'manual completion'}`,
            `- Dispatch record: ${record.dispatchRecordPath || 'not recorded'}`,
            `- Task graph: ${record.taskGraphPath}`,
            `- Execution session: ${record.sessionPath}`,
            '',
            '## Summary',
            '',
            record.summary || 'No summary recorded. Add the smallest missing context or blocker description before continuing.',
            '',
            '## Next Actions',
            '',
            nextActions,
            '',
            '## Controller Contract',
            '',
            '- Do not mark this task `DONE` until the missing context or blocker is resolved.',
            '- If the task scope is wrong, update `implementation-plan.md` and `artifacts/agents/task-graph.json` before redispatch.',
            '- If the worker needs a user decision, ask one concise question and keep this report as the decision trail.',
            '',
        ].join('\n');
    }
    buildReviewDispatchPacket(report, record) {
        const isTaskReview = Boolean(record.taskId);
        const reviewName = record.stage === 'spec' ? 'Spec Compliance Review' : 'Code Quality Review';
        const priorReview = record.stage === 'quality'
            ? isTaskReview
                ? '- Confirm this task\'s spec review artifact is `APPROVED` or `APPROVED_WITH_CONCERNS` before reviewing quality.'
                : '- Confirm `artifacts/reviews/spec-compliance.md` is `APPROVED` or `APPROVED_WITH_CONCERNS` before reviewing quality.'
            : isTaskReview
                ? '- Check this task implementation against the task packet, accepted design, implementation plan, and expected result.'
                : '- Check implementation against `proposal.md`, `design.md`, `implementation-plan.md`, and `tasks.md` before deciding whether it satisfies the spec.';
        const taskScope = isTaskReview
            ? [
                `- Task ID: ${record.taskId}`,
                `- Task title: ${record.taskTitle || 'not recorded'}`,
                '- Review only this task and its direct integration effects; do not turn this into a whole-change final review.',
            ]
            : [
                '- Scope: whole-change final review after all task-level reviews are approved and the task graph is completed.',
            ];
        return [
            `# Agent Review Dispatch: ${record.stage}`,
            '',
            `- Dispatch ID: ${record.id}`,
            `- Change: ${report.feature}`,
            `- Review: ${reviewName}`,
            ...taskScope,
            `- Reviewer role: ${record.reviewerRole}`,
            `- Status: ${record.status}`,
            `- Review artifact: ${record.reviewArtifactPath}`,
            `- Task graph: ${this.toChangeRelativePath(report.changePath, report.graphPath)}`,
            '',
            ...this.buildProjectSessionBriefLines(record.projectSession),
            '',
            '## Required Context',
            '',
            '- Read `proposal.md`, `design.md`, `implementation-plan.md`, `tasks.md`, and `artifacts/agents/task-graph.json`.',
            '- Read `artifacts/agents/worker-status.md` and recent dispatch records before deciding.',
            priorReview,
            '- Do not accept implementer self-review as a substitute for independent review.',
            '',
            '## Review Output',
            '',
            `- Update \`${record.reviewArtifactPath}\` frontmatter \`decision\` to one of: \`APPROVED\`, \`APPROVED_WITH_CONCERNS\`, \`NEEDS_CHANGES\`, \`BLOCKED\`, \`PENDING\`.`,
            '- Record concrete findings and evidence in the review artifact body.',
            '- Use `APPROVED_WITH_CONCERNS` only when the change can continue and the controller can accept the concern.',
            '',
            '## Completion',
            '',
            'After updating the review artifact, run:',
            '',
            '```bash',
            'ospec execute sync [change-path]',
            '```',
            '',
        ].join('\n');
    }
    extractReviewFindings(body) {
        const lines = body
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !/^#+\s+/.test(line))
            .filter(line => !/^- \[(?: |x|X)\]/.test(line))
            .filter(line => !/^(-\s*)?TBD\.?$/i.test(line));
        return lines.slice(0, 20);
    }
    async createReviewFeedbackDecisionGateIfNeeded(input) {
        const reason = this.getReviewFeedbackDecisionGateReason(input);
        if (!reason) {
            return {
                status: 'not_needed',
                id: null,
                question: null,
                recommendedOptionId: null,
                recordPath: null,
                reportPath: null,
                reason: null,
                nextInstruction: null,
            };
        }
        const id = `review-feedback-${input.stage}`;
        const recordPath = this.getUserDecisionRecordPath(input.changePath, id);
        const existing = await this.readUserDecisionRecord(recordPath);
        if (existing?.status === 'SELECTED' || existing?.status === 'SKIPPED') {
            return {
                status: 'already_selected',
                id,
                question: existing.question,
                recommendedOptionId: existing.recommendedOptionId,
                recordPath: existing.recordPath,
                reportPath: existing.reportPath,
                reason,
                nextInstruction: `Decision ${id} is already ${existing.status}; continue with review feedback handling.`,
            };
        }
        const recommendedOptionId = input.action === 'blocked' ? 'clarify-first' : 'revise-plan-first';
        const question = `How should this change handle ${input.stage} review feedback that may affect scope, direction, API, UI, or risk?`;
        const decision = await this.recordUserDecision(input.changePath, {
            id,
            question,
            options: [
                {
                    id: 'revise-plan-first',
                    label: 'Revise plan first',
                    description: 'Update design, implementation plan, task graph, or tasks before editing more source files.',
                },
                {
                    id: 'accept-nonblocking',
                    label: 'Accept nonblocking',
                    description: 'Treat the concern as accepted risk and record why it does not block this change.',
                },
                {
                    id: 'clarify-first',
                    label: 'Clarify first',
                    description: 'Pause implementation and ask for reviewer or user clarification before more work.',
                },
            ],
            recommendedOptionId,
            required: true,
            summary: [
                `Review decision: ${input.decision}.`,
                `Review artifact: ${input.reviewArtifactPath}.`,
                reason,
                input.summary?.trim() ? `Controller summary: ${input.summary.trim()}.` : '',
            ].filter(Boolean).join(' '),
        });
        return {
            status: existing ? 'pending' : 'created',
            id,
            question,
            recommendedOptionId,
            recordPath: decision.decision.recordPath,
            reportPath: decision.decision.reportPath,
            reason,
            nextInstruction: decision.nextInstruction,
        };
    }
    getReviewFeedbackDecisionGateReason(input) {
        const findingText = input.findings.join('\n').toLowerCase();
        const decisionSignal = /\b(scope|architecture|api|ui|ux|risk|security|breaking|tradeoff|decision|choose|clarify|requirement|design|contract)\b/u.test(findingText);
        if (input.action === 'blocked') {
            return 'Review feedback is blocked and needs a concrete direction before more implementation work.';
        }
        if (input.action === 'revise' && decisionSignal) {
            return 'Review findings appear to affect scope, direction, API, UI, risk, or accepted design tradeoffs.';
        }
        if (input.decision === 'APPROVED_WITH_CONCERNS' && decisionSignal) {
            return 'Approved-with-concerns review findings include design or scope signals that should be accepted or revised explicitly.';
        }
        return null;
    }
    buildReviewFeedbackRecommendedActions(stage, decision, action) {
        if (action === 'accept') {
            if (stage === 'spec') {
                return [
                    'Confirm the review findings are compatible with the accepted scope before continuing.',
                    'If the decision is APPROVED_WITH_CONCERNS, record which concerns are accepted and why they do not block execution.',
                    'Dispatch code quality review next if it is not already approved.',
                ];
            }
            return [
                'Confirm the review findings are compatible with the accepted implementation quality bar.',
                'If the decision is APPROVED_WITH_CONCERNS, record accepted concerns in review or verification notes.',
                'Run fresh verification and record verification evidence before finish or archive.',
            ];
        }
        if (action === 'revise') {
            const rerunReview = stage === 'spec'
                ? 'Rerun spec compliance review before dispatching quality review.'
                : 'Rerun code quality review after the targeted fixes are complete.';
            return [
                'Map each finding to the requirement, design, implementation plan, task graph, or changed code before editing.',
                'Do not blindly apply reviewer suggestions that conflict with the accepted spec; clarify the conflict first.',
                'Create or update the smallest task graph work item needed for the correction.',
                'Dispatch an implementer for the correction and require focused verification evidence.',
                rerunReview,
            ];
        }
        if (action === 'blocked') {
            return [
                'Identify whether the blocker is missing context, unsafe workspace state, failing verification, dependency conflict, or scope mismatch.',
                'Ask the smallest concrete question or resolve the external condition before editing.',
                'Do not mark reviewer status complete until the blocker is resolved and the review artifact decision changes.',
                'After resolution, update the review artifact and rerun this feedback plan.',
            ];
        }
        return [
            `Clarify unsupported review decision ${decision} before implementation continues.`,
            'Update the review artifact frontmatter to APPROVED, APPROVED_WITH_CONCERNS, NEEDS_CHANGES, BLOCKED, or PENDING.',
            'Rerun this feedback plan after the decision is corrected.',
        ];
    }
    buildReviewFeedbackNextInstruction(stage, decision, action) {
        if (action === 'accept') {
            if (stage === 'spec') {
                return decision === 'APPROVED_WITH_CONCERNS'
                    ? 'Accept documented spec review concerns, then dispatch code quality review or record why concerns are non-blocking.'
                    : 'Spec review is accepted. Dispatch code quality review next if needed.';
            }
            return decision === 'APPROVED_WITH_CONCERNS'
                ? 'Accept documented code quality concerns, then record fresh verification evidence before finish.'
                : 'Code quality review is accepted. Record fresh verification evidence before finish.';
        }
        if (action === 'revise') {
            return `Convert ${stage} review findings into targeted task graph fixes, then rerun the ${stage} review.`;
        }
        if (action === 'blocked') {
            return `Resolve the ${stage} review blocker or ask for the missing context before redispatching work.`;
        }
        return `Clarify the ${stage} review decision before dispatching more work.`;
    }
    getTaskReviewRunDecisionNextInstruction(taskId, stage, decision) {
        if (decision === 'APPROVED' || decision === 'APPROVED_WITH_CONCERNS') {
            if (stage === 'spec') {
                return `Task ${taskId} spec review is recorded. Run ospec execute review [change-path] --task ${taskId} --stage quality next.`;
            }
            return `Task ${taskId} quality review is recorded. Run ospec execute status to dispatch newly unblocked work.`;
        }
        if (decision === 'NEEDS_CHANGES') {
            return `Task ${taskId} review requires changes. Reopen or retry the task, fix the findings, then rerun task review.`;
        }
        if (decision === 'BLOCKED') {
            return `Task ${taskId} review is blocked. Resolve reviewer blockers before dispatching dependent work.`;
        }
        return `Task ${taskId} review remains pending. Update the task review artifact and run ospec execute sync.`;
    }
    buildReviewFeedbackPlanReport(plan) {
        const findings = plan.findings.length > 0
            ? plan.findings.map(item => `- ${item}`).join('\n')
            : '- No concrete findings were found in the review artifact body. Update the review artifact before acting if the decision requires changes.';
        const actions = plan.recommendedActions.map(action => `- ${action}`).join('\n');
        const userDecisionGate = plan.userDecisionGate.status === 'not_needed'
            ? '- No user decision gate needed for this feedback plan.'
            : [
                `- Status: ${plan.userDecisionGate.status}`,
                `- Decision ID: ${plan.userDecisionGate.id || 'none'}`,
                `- Question: ${plan.userDecisionGate.question || 'none'}`,
                `- Recommended option: ${plan.userDecisionGate.recommendedOptionId || 'none'}`,
                `- Record: ${plan.userDecisionGate.recordPath || 'none'}`,
                `- Report: ${plan.userDecisionGate.reportPath || 'none'}`,
                `- Reason: ${plan.userDecisionGate.reason || 'none'}`,
                `- Next: ${plan.userDecisionGate.nextInstruction || 'none'}`,
            ].join('\n');
        return [
            `# Review Feedback Plan: ${plan.stage}`,
            '',
            `- Change: ${plan.feature}`,
            `- Stage: ${plan.stage}`,
            `- Reviewer role: ${plan.reviewerRole}`,
            `- Decision: ${plan.decision}`,
            `- Action: ${plan.action}`,
            `- Created at: ${plan.createdAt}`,
            `- Review artifact: ${plan.reviewArtifactPath}`,
            '',
            '## Summary',
            '',
            plan.summary || 'No controller summary recorded.',
            '',
            '## Review Findings',
            '',
            findings,
            '',
            '## Recommended Actions',
            '',
            actions,
            '',
            '## User Decision Gate',
            '',
            userDecisionGate,
            '',
            '## Controller Contract',
            '',
            '- Do not blindly accept reviewer suggestions; verify each finding against the accepted proposal, design, and implementation plan.',
            '- If a finding changes scope, update upstream change documents and task graph before editing source files.',
            '- If this plan created a required user decision gate, ask the user to select an option before dispatching more work.',
            '- If fixes are needed, keep them targeted and require fresh verification evidence before accepting the review loop.',
            '',
            '## Next Instruction',
            '',
            plan.nextInstruction,
            '',
        ].join('\n');
    }
    buildDocumentReviewArtifact(feature, target) {
        const created = new Date().toISOString().split('T')[0];
        const checklist = target.reviewerRole === 'design_reviewer'
            ? [
                '- [ ] Checked `proposal.md` goals, scope, and acceptance criteria against `design.md`',
                '- [ ] Checked affected boundaries, tradeoffs, risks, assumptions, and open questions',
                '- [ ] Recorded required corrections, concerns, or blockers',
                '- [ ] Wrote the final decision to frontmatter `decision`',
            ]
            : [
                '- [ ] Confirmed `artifacts/reviews/design-review.md` is approved',
                '- [ ] Checked task sequence, dependencies, target files, verification commands, and conflicts',
                '- [ ] Confirmed the plan can produce a valid `artifacts/agents/task-graph.json`',
                '- [ ] Recorded required corrections, concerns, or blockers',
                '- [ ] Wrote the final decision to frontmatter `decision`',
            ];
        return [
            '---',
            `feature: ${feature}`,
            `created: ${created}`,
            'status: pending_review',
            `reviewer_role: ${target.reviewerRole}`,
            'decision: PENDING',
            'optional_steps: []',
            '---',
            '',
            `## ${target.label}`,
            '',
            `Review \`${target.documentFile}\` before task execution proceeds.`,
            '',
            '## Decision Values',
            '',
            '- `APPROVED`',
            '- `APPROVED_WITH_CONCERNS`',
            '- `NEEDS_CHANGES`',
            '- `BLOCKED`',
            '- `PENDING`',
            '',
            '## Findings',
            '',
            '- TBD',
            '',
            '## Checklist',
            '',
            ...checklist,
            '',
        ].join('\n');
    }
    buildDocumentReviewDispatchPacket(feature, record, target) {
        const stageContext = record.stage === 'design'
            ? [
                '- Read `proposal.md` before reviewing the design.',
                '- Check whether `design.md` resolves scope, boundaries, assumptions, risks, and open questions before planning.',
                '- Do not review code quality or task completion in this stage.',
            ]
            : [
                '- Confirm `artifacts/reviews/design-review.md` is `APPROVED` or `APPROVED_WITH_CONCERNS` before reviewing the plan.',
                '- Read `proposal.md`, `design.md`, and `implementation-plan.md` before deciding.',
                '- Check task order, dependencies, target files, verification commands, parallel safety, and conflicts.',
                '- Do not dispatch implementation workers from this packet.',
            ];
        return [
            `# Document Review Dispatch: ${record.stage}`,
            '',
            `- Dispatch ID: ${record.id}`,
            `- Change: ${feature}`,
            `- Reviewer role: ${record.reviewerRole}`,
            `- Status: ${record.status}`,
            `- Document: ${record.documentPath}`,
            `- Document readiness: ${record.documentReadiness}`,
            `- Review artifact: ${record.reviewArtifactPath}`,
            `- Record: ${record.recordPath}`,
            '',
            ...this.buildProjectSessionBriefLines(record.projectSession),
            '',
            '## Required Context',
            '',
            ...stageContext,
            '',
            '## Review Output',
            '',
            `- Update \`${record.reviewArtifactPath}\` frontmatter \`decision\` to one of: \`APPROVED\`, \`APPROVED_WITH_CONCERNS\`, \`NEEDS_CHANGES\`, \`BLOCKED\`, \`PENDING\`.`,
            '- Record concrete findings and required corrections in the review artifact body.',
            '- Use `APPROVED_WITH_CONCERNS` only when execution may continue and the concern is explicit.',
            '',
            '## Completion',
            '',
            record.stage === 'design'
                ? 'After approving the design, run `ospec execute doc-review [change-path] --stage plan` before deriving or dispatching implementation tasks.'
                : 'After approving the implementation plan, derive or refresh `artifacts/agents/task-graph.json`, then continue with `ospec execute status` or `ospec execute next`.',
            '',
        ].join('\n');
    }
    buildVerificationEvidenceReport(report, record) {
        return [
            `# Verification Evidence: ${record.id}`,
            '',
            `- Change: ${report.feature}`,
            `- Status: ${record.status}`,
            `- Recorded at: ${record.recordedAt}`,
            `- Exit code: ${record.exitCode === null ? 'not recorded' : record.exitCode}`,
            `- Command: \`${record.command}\``,
            '',
            '## Summary',
            '',
            record.summary || 'No summary recorded.',
            '',
            '## Required Follow-up',
            '',
            '- Keep `verification.md` checklist aligned with this evidence.',
            '- If status is not `PASSED`, fix the issue and record a later passing verification evidence entry.',
            '- Do not use stale evidence when project files, review decisions, or task graph state changed after this record.',
            '',
        ].join('\n');
    }
    buildTddEvidenceReport(report, record) {
        return [
            `# TDD Evidence: ${record.id}`,
            '',
            `- Change: ${report.feature}`,
            `- Phase: ${record.phase}`,
            `- Status: ${record.status}`,
            `- Recorded at: ${record.recordedAt}`,
            `- Exit code: ${record.exitCode === null ? 'not recorded' : record.exitCode}`,
            `- Command: \`${record.command}\``,
            `- Test: ${record.testName || 'not recorded'}`,
            '',
            '## Summary',
            '',
            record.summary || 'No summary recorded.',
            '',
            '## Phase Guidance',
            '',
            '- `red`: record the focused test before the implementation passes; expected status is usually `FAILED`.',
            '- `green`: record the minimal implementation passing the focused test; expected status is `PASSED`.',
            '- `refactor`: record cleanup after green while tests still pass; expected status is `PASSED`.',
            '',
            '## Required Follow-up',
            '',
            '- Keep `verification.md` checklist aligned with this TDD evidence.',
            '- If green or refactor evidence is not `PASSED`, fix the issue and record later passing TDD evidence.',
            '- If TDD is not applicable, record a `SKIPPED` entry with a concrete summary.',
            '',
        ].join('\n');
    }
    buildDebugEvidenceReport(report, record) {
        return [
            `# Debug Evidence: ${record.id}`,
            '',
            `- Change: ${report.feature}`,
            `- Phase: ${record.phase}`,
            `- Status: ${record.status}`,
            `- Recorded at: ${record.recordedAt}`,
            `- Symptom: ${record.symptom}`,
            `- Hypothesis: ${record.hypothesis || 'not recorded'}`,
            `- Root cause: ${record.rootCause || 'not recorded'}`,
            `- Command: ${record.command ? `\`${record.command}\`` : 'not recorded'}`,
            '',
            '## Summary',
            '',
            record.summary || 'No summary recorded.',
            '',
            '## Debugging Discipline',
            '',
            '- `reproduce`: characterize the symptom before changing code.',
            '- `hypothesize`: record the leading explanation before applying a fix when practical.',
            '- `isolate`: record the root cause before declaring the issue confirmed.',
            '- `fix`: record the concrete fix evidence before final verification.',
            '- `verify`: use `FIXED` only after the fix is verified with a command or observation.',
            '',
            '## Required Follow-up',
            '',
            '- Keep `verification.md` aligned with this debug evidence when debugging was part of the change.',
            '- Complete the staged sequence when it applies: reproduce, isolate, hypothesize, fix, verify.',
            '- If status is `CONFIRMED`, apply and verify the fix, then record later fix and verify evidence entries.',
            '- If status is `BLOCKED`, resolve the blocker before claiming the change is complete.',
            '',
        ].join('\n');
    }
    buildWorkspaceStatusReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const changedFiles = artifact.git.statusEntries.length > 0
            ? artifact.git.statusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const worktrees = artifact.git.worktrees.length > 0
            ? artifact.git.worktrees
                .map(worktree => `- ${worktree.path}${worktree.branch ? ` (${worktree.branch})` : worktree.detached ? ' (detached)' : ''}`)
                .join('\n')
            : '- None detected';
        return [
            `# Workspace Safety: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Inspected at: ${artifact.inspectedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            `- Git repository: ${artifact.git.repository ? 'yes' : 'no'}`,
            `- Git root: ${artifact.git.root || 'not detected'}`,
            `- Branch: ${artifact.git.branch || 'not detected'}`,
            `- HEAD: ${artifact.git.head || 'not detected'}`,
            `- Dirty: ${artifact.git.dirty ? 'yes' : 'no'}`,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Changed Files',
            '',
            changedFiles,
            '',
            '## Worktrees',
            '',
            worktrees,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Safety Notes',
            '',
            '- This command inspects workspace state and writes OSpec artifacts only.',
            '- It does not create git worktrees, switch branches, launch workers, run tests, or edit project source files.',
            '- Treat `needs_isolation` as a stop signal before parallel worker dispatch.',
            '',
        ].join('\n');
    }
    buildWorktreePlanReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const commands = artifact.commands.map(command => `- \`${command}\``).join('\n');
        const lifecycle = artifact.lifecycle.length > 0
            ? artifact.lifecycle
                .map(step => [
                `### ${step.step}`,
                '',
                `- Status: ${step.status}`,
                `- Command: ${step.command ? `\`${step.command}\`` : 'manual decision only'}`,
                `- Guidance: ${step.guidance}`,
            ].join('\n'))
                .join('\n\n')
            : '- No lifecycle steps recorded.';
        const changedFiles = artifact.git.statusEntries.length > 0
            ? artifact.git.statusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const worktrees = artifact.git.worktrees.length > 0
            ? artifact.git.worktrees
                .map(worktree => `- ${worktree.path}${worktree.branch ? ` (${worktree.branch})` : worktree.detached ? ' (detached)' : ''}`)
                .join('\n')
            : '- None detected';
        return [
            `# Worktree Plan: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            `- Recommended branch: ${artifact.recommendedBranch}`,
            `- Recommended path: ${artifact.recommendedPath}`,
            `- Base ref: ${artifact.baseRef}`,
            `- Git repository: ${artifact.git.repository ? 'yes' : 'no'}`,
            `- Current branch: ${artifact.git.branch || 'not detected'}`,
            `- Current HEAD: ${artifact.git.head || 'not detected'}`,
            `- Current workspace dirty: ${artifact.git.dirty ? 'yes' : 'no'}`,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Generated Commands',
            '',
            commands,
            '',
            '## Lifecycle',
            '',
            lifecycle,
            '',
            '## Changed Files',
            '',
            changedFiles,
            '',
            '## Existing Worktrees',
            '',
            worktrees,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Safety Notes',
            '',
            '- Without --create or --cleanup, this command writes a worktree preparation plan only.',
            '- Plan mode does not run `git worktree add`, switch branches, launch workers, run tests, or edit project source files.',
            '- Run `ospec execute workspace` again inside the isolated worktree before dispatch.',
            '',
        ].join('\n');
    }
    buildWorktreeRunReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const commands = artifact.commands.length > 0
            ? artifact.commands.map(command => `- \`${command}\``).join('\n')
            : '- None';
        const commandResults = artifact.commandResults.length > 0
            ? artifact.commandResults
                .map(result => [
                `### ${result.command}`,
                '',
                `- CWD: ${result.cwd}`,
                `- OK: ${result.ok ? 'yes' : 'no'}`,
                `- Exit status: ${result.status ?? 'unknown'}`,
                `- Error: ${result.error || 'none'}`,
                '',
                'Stdout:',
                '',
                '```text',
                result.stdout.trimEnd() || '(empty)',
                '```',
                '',
                'Stderr:',
                '',
                '```text',
                result.stderr.trimEnd() || '(empty)',
                '```',
            ].join('\n'))
                .join('\n\n')
            : '- No git command was run.';
        return [
            `# Worktree ${artifact.action === 'create' ? 'Create' : 'Cleanup'} Run: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            `- Target path: ${artifact.targetPath || 'not resolved'}`,
            `- Branch: ${artifact.branch || 'not specified'}`,
            `- Base ref: ${artifact.baseRef || 'not specified'}`,
            `- Plan artifact: ${artifact.planArtifactPath || 'none'}`,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Commands',
            '',
            commands,
            '',
            '## Command Results',
            '',
            commandResults,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Safety Notes',
            '',
            '- This run happens only when --create or --cleanup is passed explicitly.',
            '- Create runs only `git worktree add`; cleanup runs only `git worktree remove`.',
            '- Cleanup does not delete branches, push, merge, archive, run tests, or edit project source files.',
            '',
        ].join('\n');
    }
    buildUserDecisionReport(record) {
        const options = record.options.length > 0
            ? record.options
                .map(option => {
                const markers = [
                    option.id === record.recommendedOptionId ? 'recommended' : '',
                    option.id === record.selectedOptionId ? 'selected' : '',
                ].filter(Boolean);
                return `- ${option.id}: ${option.label}${markers.length > 0 ? ` (${markers.join(', ')})` : ''}${option.description ? ` - ${option.description}` : ''}`;
            })
                .join('\n')
            : '- No structured options recorded.';
        const chatOptions = record.options.length > 0
            ? record.options
                .map(option => `- ${option.id}: ${option.label}${option.description ? ` - ${option.description}` : ''}${option.id === record.recommendedOptionId ? ' (recommended)' : ''}`)
                .join('\n')
            : '- No structured options recorded.';
        const chatPrompt = [
            `Decision required: ${record.id}`,
            '',
            record.question || 'No question recorded.',
            '',
            'Options:',
            chatOptions,
            '',
            record.recommendedOptionId
                ? `Recommended option: ${record.recommendedOptionId}`
                : 'No recommended option is recorded.',
            `Reply with one option id. Record the answer with: ospec execute decision [change-path] --id ${this.quoteShellArg(record.id)} --select <option-id>`,
        ].join('\n');
        return [
            `# User Decision: ${record.id}`,
            '',
            `- Status: ${record.status}`,
            `- Required: ${record.required ? 'yes' : 'no'}`,
            `- Feature: ${record.feature}`,
            `- Created at: ${record.createdAt}`,
            `- Updated at: ${record.updatedAt}`,
            `- Selected at: ${record.selectedAt || 'not selected'}`,
            `- Recommended option: ${record.recommendedOptionId || 'none'}`,
            `- Selected option: ${record.selectedOptionId || 'none'}`,
            '',
            '## Question',
            '',
            record.question || 'No question recorded.',
            '',
            '## Options',
            '',
            options,
            '',
            '## Chat Prompt',
            '',
            '```text',
            chatPrompt,
            '```',
            '',
            '## Summary',
            '',
            record.summary || 'No summary recorded.',
            '',
            '## Next Instruction',
            '',
            record.nextInstruction,
            '',
            '## Artifact Boundary',
            '',
            '- This artifact records a user-facing decision gate only.',
            '- It does not edit project source files, dispatch workers, run tests, or approve review artifacts.',
            '- Required pending decisions block worker dispatch and finish readiness until selected or skipped.',
            '',
        ].join('\n');
    }
    buildUserDecisionIndexReport(artifact) {
        const decisions = artifact.decisions.length > 0
            ? artifact.decisions
                .map(decision => {
                const selection = decision.selectedOptionId ? `, selected ${decision.selectedOptionId}` : '';
                const recommendation = decision.recommendedOptionId ? `, recommended ${decision.recommendedOptionId}` : '';
                return `- ${decision.id}: ${decision.status}${decision.required ? ', required' : ', optional'}${selection}${recommendation} (${decision.reportPath})`;
            })
                .join('\n')
            : '- None';
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        return [
            `# User Decision Index: ${artifact.feature}`,
            '',
            `- Generated at: ${artifact.generatedAt}`,
            `- Change path: ${artifact.changePath}`,
            `- Total decisions: ${artifact.total}`,
            `- Pending required: ${artifact.pendingRequired}`,
            `- Pending optional: ${artifact.pendingOptional}`,
            `- Selected: ${artifact.selected}`,
            `- Skipped: ${artifact.skipped}`,
            '',
            '## Decisions',
            '',
            decisions,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Artifact Boundary',
            '',
            '- This index summarizes user decision artifacts only.',
            '- It does not edit project source files, dispatch workers, run tests, or approve review artifacts.',
            '',
        ].join('\n');
    }
    buildFinishPlanReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const commands = artifact.commands.map(command => `- \`${command}\``).join('\n');
        const decisionPrompts = artifact.decisionPrompts.length > 0
            ? artifact.decisionPrompts
                .map(prompt => [
                `### ${prompt.id}`,
                '',
                `- Required: ${prompt.required ? 'yes' : 'no'}`,
                `- Question: ${prompt.question}`,
                `- Recommended option: ${prompt.recommendedOptionId}`,
                '',
                'Options:',
                ...prompt.options.map(option => `- ${option.id}: ${option.label} - ${option.description}`),
                '',
                'Record the decision gate:',
                '',
                `\`${prompt.command}\``,
            ].join('\n'))
                .join('\n\n')
            : '- No closeout decision prompts recorded.';
        const changedFiles = artifact.git.statusEntries.length > 0
            ? artifact.git.statusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const worktrees = artifact.git.worktrees.length > 0
            ? artifact.git.worktrees
                .map(worktree => `- ${worktree.path}${worktree.branch ? ` (${worktree.branch})` : worktree.detached ? ' (detached)' : ''}`)
                .join('\n')
            : '- None detected';
        const checkpointEvidence = this.buildCheckpointEvidenceReportLines(artifact.checkpointEvidence).join('\n');
        return [
            `# Finish Plan: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            `- Target branch: ${artifact.targetBranch}`,
            `- Remote: ${artifact.remote}`,
            `- Git repository: ${artifact.git.repository ? 'yes' : 'no'}`,
            `- Current branch: ${artifact.git.branch || 'not detected'}`,
            `- Current HEAD: ${artifact.git.head || 'not detected'}`,
            `- Current workspace dirty: ${artifact.git.dirty ? 'yes' : 'no'}`,
            '',
            '## Readiness',
            '',
            `- Task graph: ${artifact.readiness.taskGraph}`,
            `- Implementer: ${artifact.readiness.implementer}`,
            `- Spec review: ${artifact.readiness.specReview}`,
            `- Quality review: ${artifact.readiness.qualityReview}`,
            `- Controller: ${artifact.readiness.controller}`,
            `- Pending required decisions: ${artifact.readiness.pendingRequiredDecisions}`,
            `- Verification checklist complete: ${artifact.readiness.verificationChecklistComplete ? 'yes' : 'no'}`,
            `- Verification evidence: ${artifact.readiness.verificationEvidence}`,
            `- TDD evidence: ${artifact.readiness.tddEvidence}`,
            `- Debug evidence: ${artifact.readiness.debugEvidence}`,
            `- Checkpoint evidence: ${artifact.readiness.checkpointEvidence}`,
            '',
            '## Checkpoint Evidence',
            '',
            checkpointEvidence,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Suggested Commands',
            '',
            commands,
            '',
            '## Closeout Decision Prompts',
            '',
            decisionPrompts,
            '',
            '## Changed Files',
            '',
            changedFiles,
            '',
            '## Worktrees',
            '',
            worktrees,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Safety Notes',
            '',
            '- This command writes a finish preparation plan only.',
            '- It does not run verification, finalize, archive, git push, git merge, git checkout, or git worktree remove.',
            '- When status is ready, run the suggested `ospec finalize ...` command; `ospec archive ... --check` is a dry-run preview only and does not close the change.',
            '- Treat generated git commands as review prompts; run them manually only after verifying the blockers and warnings.',
            '',
        ].join('\n');
    }
    buildWorkflowRouteReport(artifact) {
        const recommendations = artifact.recommendations.length > 0
            ? artifact.recommendations
                .map(item => [
                `### ${item.priority}. ${item.action}`,
                '',
                `- Reason: ${item.reason}`,
                `- Command: ${item.command ? `\`${item.command}\`` : 'manual document or source update'}`,
            ].join('\n'))
                .join('\n\n')
            : '- No recommendations recorded.';
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        return [
            `# Workflow Route: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            '',
            '## Recommendations',
            '',
            recommendations,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Artifact Boundary',
            '',
            '- This route writes workflow recommendation artifacts only.',
            '- It does not edit project source files, dispatch workers, run tests, merge branches, or delete worktrees.',
            '- If the top recommendation is a user decision, present the decision prompt before continuing.',
            '',
        ].join('\n');
    }
    buildCheckpointEvidenceReportLines(evidence) {
        if (!evidence.active) {
            return ['- Not active for this change.'];
        }
        const missing = evidence.missing.length > 0
            ? evidence.missing.map(item => `  - ${item}`)
            : ['  - None'];
        const actions = evidence.nextActions.length > 0
            ? evidence.nextActions.map(item => `  - ${item}`)
            : ['  - None'];
        const steps = evidence.steps.length > 0
            ? evidence.steps.flatMap(step => [
                `- ${step.step}: ${step.evidenceStatus} (gate ${step.gateStatus})`,
                `  - screenshots: ${step.screenshots}, traces: ${step.traces}, visual diffs: ${step.visualDiffs}, routes: ${step.routes}, flows: ${step.flows}, assertions: ${step.assertions}, console events: ${step.consoleEvents}, network events: ${step.networkEvents}, accessibility: ${step.accessibility}`,
                ...(step.missing.length > 0 ? [`  - missing: ${step.missing.join(', ')}`] : []),
            ])
            : ['- No step evidence recorded.'];
        return [
            `- Status: ${evidence.status}`,
            `- Gate status: ${evidence.gateStatus}`,
            `- Evidence status: ${evidence.evidenceStatus}`,
            `- Active steps: ${evidence.activeSteps.join(', ') || 'none'}`,
            `- Counts: screenshots ${evidence.screenshots}, traces ${evidence.traces}, visual diffs ${evidence.visualDiffs}, routes ${evidence.routes}, flows ${evidence.flows}, assertions ${evidence.assertions}, console events ${evidence.consoleEvents}, network events ${evidence.networkEvents}, accessibility ${evidence.accessibility}`,
            '- Missing evidence:',
            ...missing,
            '- Suggested next actions:',
            ...actions,
            '',
            '### Step Evidence',
            '',
            ...steps,
        ];
    }
    buildWorkerLaunchPlanReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const commands = artifact.launchCommands.length > 0
            ? artifact.launchCommands.map(command => `- \`${command}\``).join('\n')
            : '- None';
        const nativeAgent = artifact.nativeAgent
            ? [
                `- Target: ${artifact.nativeAgent.target}`,
                `- Supported: ${artifact.nativeAgent.supported ? 'yes' : 'no'}`,
                `- Default path: ${artifact.nativeAgent.defaultPath ? 'yes' : 'no'}`,
                `- Adapter: ${artifact.nativeAgent.adapterId}`,
                `- Agent primitive: ${artifact.nativeAgent.agentPrimitive}`,
                `- Dispatch mode: ${artifact.nativeAgent.dispatchMode}`,
                `- Controller action required: ${artifact.nativeAgent.requiresControllerAction ? 'yes' : 'no'}`,
                `- Prompt transport: ${artifact.nativeAgent.promptTransport}`,
                `- Result collection: ${artifact.nativeAgent.resultCollection}`,
                `- Fallback only: ${artifact.nativeAgent.fallbackOnly ? 'yes' : 'no'}`,
                `- Mechanism: ${artifact.nativeAgent.mechanism}`,
                '',
                '### Instructions',
                '',
                ...artifact.nativeAgent.instructions.map(item => `- ${item}`),
                '',
                '### Parallel Dispatch',
                '',
                ...artifact.nativeAgent.parallelInstructions.map(item => `- ${item}`),
                '',
                '### Completion',
                '',
                ...artifact.nativeAgent.completionInstructions.map(item => `- ${item}`),
                '',
                '### Fallback',
                '',
                ...artifact.nativeAgent.fallbackInstructions.map(item => `- ${item}`),
            ].join('\n')
            : '- Not available until exactly one active dispatch is selected.';
        const selectedDispatch = artifact.selectedDispatch
            ? [
                `- Dispatch ID: ${artifact.selectedDispatch.id}`,
                `- Task: ${artifact.selectedDispatch.taskId} - ${artifact.selectedDispatch.taskTitle}`,
                `- Worker role: ${artifact.selectedDispatch.workerRole}`,
                `- Dispatch status: ${artifact.selectedDispatch.status}`,
                `- Packet: ${artifact.selectedDispatch.packetPath}`,
                `- Record: ${artifact.selectedDispatch.recordPath}`,
                `- Capability tier: ${artifact.selectedDispatch.workerProfile?.capabilityTier || 'not recorded'}`,
                `- Recommended target: ${artifact.selectedDispatch.workerProfile?.recommendedTarget || 'not recorded'}`,
            ].join('\n')
            : '- None';
        const targetToolMapping = artifact.selectedDispatch?.targetToolMapping
            ? [
                `- Read context: ${artifact.selectedDispatch.targetToolMapping.readContext}`,
                `- Edit files: ${artifact.selectedDispatch.targetToolMapping.editFiles}`,
                `- Run commands: ${artifact.selectedDispatch.targetToolMapping.runCommands}`,
                `- Track plan: ${artifact.selectedDispatch.targetToolMapping.trackPlan}`,
                `- Dispatch workers: ${artifact.selectedDispatch.targetToolMapping.dispatchWorkers}`,
                `- Record completion: ${artifact.selectedDispatch.targetToolMapping.recordCompletion}`,
            ].join('\n')
            : '- Not available';
        const adapterPacket = artifact.nativeAgent?.adapterPacket
            ? [
                `- Adapter: ${artifact.nativeAgent.adapterPacket.adapterId}`,
                `- Schema: ${artifact.nativeAgent.adapterPacket.schemaVersion}`,
                `- Target: ${artifact.nativeAgent.adapterPacket.target}`,
                `- Capability tier: ${artifact.nativeAgent.adapterPacket.targetCapabilities.capabilityTier}`,
                `- Agent primitive: ${artifact.nativeAgent.adapterPacket.agentPrimitive}`,
                `- Dispatch mode: ${artifact.nativeAgent.adapterPacket.dispatchMode}`,
                `- Task: ${artifact.nativeAgent.adapterPacket.taskId} - ${artifact.nativeAgent.adapterPacket.taskTitle}`,
                `- Dispatch: ${artifact.nativeAgent.adapterPacket.dispatchId}`,
                `- Packet path: ${artifact.nativeAgent.adapterPacket.packetPath}`,
                `- Record path: ${artifact.nativeAgent.adapterPacket.recordPath}`,
                `- Completion command: \`${artifact.nativeAgent.adapterPacket.completionCommand}\``,
                `- Result statuses: ${artifact.nativeAgent.adapterPacket.resultStatusContract.join(', ')}`,
                `- Environment: ${Object.entries(artifact.nativeAgent.adapterPacket.environment).map(([key, value]) => `${key}=${value}`).join('; ')}`,
                '',
                '### Safety Rules',
                '',
                ...artifact.nativeAgent.adapterPacket.safetyRules.map(item => `- ${item}`),
                '',
                '### Required Inputs',
                '',
                ...artifact.nativeAgent.adapterPacket.requiredInputs.map(item => `- ${item}`),
                '',
                '### Expected Outputs',
                '',
                ...artifact.nativeAgent.adapterPacket.expectedOutputs.map(item => `- ${item}`),
                '',
                '### Controller Actions',
                '',
                ...artifact.nativeAgent.adapterPacket.controllerActions.map(item => `- ${item}`),
            ].join('\n')
            : '- Not available';
        return [
            `# Native Agent Launch Plan: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Target: ${artifact.target}`,
            `- Dry run: ${artifact.dryRun ? 'yes' : 'no'}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            `- Task graph status: ${artifact.taskGraph.status}`,
            `- Task status: ${artifact.taskGraph.taskStatus}`,
            `- Workspace status: ${artifact.workspace.status}`,
            '',
            '## Selected Dispatch',
            '',
            selectedDispatch,
            '',
            ...this.buildProjectSessionBriefLines(artifact.projectSession),
            '',
            '## Target Tool Mapping',
            '',
            targetToolMapping,
            '',
            '## Native Agent Dispatch',
            '',
            nativeAgent,
            '',
            '## Harness Adapter Packet',
            '',
            adapterPacket,
            '',
            '## CLI Fallback Commands',
            '',
            commands,
            '',
            '## Launch Prompt',
            '',
            '```text',
            artifact.launchPrompt,
            '```',
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Artifact Boundary',
            '',
            '- This command writes a launch preparation plan only.',
            '- It does not start Codex, GPT, Claude, Gemini, OpenCode, Cursor, Copilot, shell workers, tests, or other external processes by itself.',
            '- The default path is current-harness native agent dispatch from the controlling AI session.',
            '- Use the CLI fallback commands only when the current AI harness cannot dispatch native subagents.',
            '- Record worker completion with `ospec execute complete`; do not rely on chat history as the durable state.',
            '',
        ].join('\n');
    }
    buildHandoffReport(artifact) {
        const documents = Object.entries(artifact.documents)
            .map(([name, info]) => `- ${name}: ${info.exists ? 'present' : 'missing'} (${info.path})`)
            .join('\n');
        const artifacts = Object.entries(artifact.artifacts)
            .map(([name, info]) => `- ${name}: ${info.exists ? 'present' : 'missing'} (${info.path})`)
            .join('\n');
        const workerProfiles = artifact.workerProfiles.length > 0
            ? artifact.workerProfiles
                .map(item => [
                `- ${item.taskId}: ${item.taskTitle}`,
                `  - Role: ${item.workerRole}`,
                `  - Capability tier: ${item.profile.capabilityTier}`,
                `  - Recommended target: ${item.profile.recommendedTarget}`,
                `  - Target tool mapping: embedded in the profile JSON and task dispatch packet`,
                `  - Summary: ${item.profile.summary}`,
            ].join('\n'))
                .join('\n')
            : '- None';
        const commandSequence = artifact.commandSequence
            .map(command => `- \`${command}\``)
            .join('\n');
        const safetyRules = artifact.safetyRules
            .map(rule => `- ${rule}`)
            .join('\n');
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        return [
            `# Worker Handoff: ${artifact.feature}`,
            '',
            `- Target: ${artifact.target}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            '',
            '## Task Graph',
            '',
            `- Exists: ${artifact.taskGraph.exists ? 'yes' : 'no'}`,
            `- Status: ${artifact.taskGraph.status}`,
            `- Tasks: ${artifact.taskGraph.taskCount}`,
            `- Dispatchable: ${artifact.taskGraph.dispatchable}`,
            `- Running: ${artifact.taskGraph.running}`,
            `- Blocked: ${artifact.taskGraph.blocked}`,
            `- Invalid: ${artifact.taskGraph.invalid}`,
            '',
            '## Core Documents',
            '',
            documents,
            '',
            '## Project Session Brief',
            '',
            `- Exists: ${artifact.projectSession.exists ? 'yes' : 'no'}`,
            `- JSON: ${artifact.projectSession.jsonPath}`,
            `- Markdown: ${artifact.projectSession.reportPath}`,
            `- Generated at: ${artifact.projectSession.generatedAt || 'not recorded'}`,
            `- Cache status: ${artifact.projectSession.cacheStatus}`,
            `- Cache key: ${artifact.projectSession.cacheKey || 'not recorded'}`,
            `- Active changes: ${artifact.projectSession.activeChangeCount}`,
            `- Queued changes: ${artifact.projectSession.queuedChangeCount}`,
            `- Next: ${artifact.projectSession.nextInstruction || 'not recorded'}`,
            '',
            '## Agent Artifacts',
            '',
            artifacts,
            '',
            '## Worker Profiles',
            '',
            workerProfiles,
            '',
            '## Tool Mapping',
            '',
            `- Read context: ${artifact.toolMapping.readContext}`,
            `- Edit files: ${artifact.toolMapping.editFiles}`,
            `- Run commands: ${artifact.toolMapping.runCommands}`,
            `- Track plan: ${artifact.toolMapping.trackPlan}`,
            `- Dispatch workers: ${artifact.toolMapping.dispatchWorkers}`,
            `- Record completion: ${artifact.toolMapping.recordCompletion}`,
            '',
            '## Command Sequence',
            '',
            commandSequence,
            '',
            '## Safety Rules',
            '',
            safetyRules,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Artifact Boundary',
            '',
            '- This command writes a handoff guide only.',
            '- It does not launch workers, sync worker status, run tests, inspect git, finalize, archive, push, merge, or edit project source files.',
            '- Use it when a change moves between agents, tools, shells, worktrees, or human operators.',
            '',
        ].join('\n');
    }
    buildBootstrapReport(artifact) {
        const blockers = artifact.blockers.length > 0
            ? artifact.blockers.map(blocker => `- ${blocker}`).join('\n')
            : '- None';
        const warnings = artifact.warnings.length > 0
            ? artifact.warnings.map(warning => `- ${warning}`).join('\n')
            : '- None';
        const latestDispatches = artifact.execution.session.latestDispatches.length > 0
            ? artifact.execution.session.latestDispatches
                .map(dispatch => `- ${dispatch.taskId}: ${dispatch.status}${dispatch.summary ? ` - ${dispatch.summary}` : ''}`)
                .join('\n')
            : '- None';
        const activeDispatches = artifact.execution.session.activeDispatches.length > 0
            ? artifact.execution.session.activeDispatches
                .map(dispatch => `- ${dispatch.taskId}: ${dispatch.status}, target ${dispatch.target}, packet ${dispatch.packetPath}`)
                .join('\n')
            : '- None';
        const decisions = artifact.execution.decisions.decisions.length > 0
            ? artifact.execution.decisions.decisions
                .map(decision => `- ${decision.id}: ${decision.status}${decision.required ? ', required' : ', optional'}${decision.selectedOptionId ? `, selected ${decision.selectedOptionId}` : ''} (${decision.reportPath})`)
                .join('\n')
            : '- None';
        const debugPhases = artifact.execution.evidence.debugPhases.length > 0
            ? artifact.execution.evidence.debugPhases
                .map(phase => `- ${phase.phase}: ${phase.status}${phase.latestRecordId ? ` (${phase.latestRecordId}, ${phase.latestStatus})` : ''}`)
                .join('\n')
            : '- None';
        const checkpointEvidence = this.buildCheckpointEvidenceReportLines(artifact.execution.evidence.checkpoint).join('\n');
        return [
            `# Change Bootstrap: ${artifact.feature}`,
            '',
            `- Status: ${artifact.status}`,
            `- Generated at: ${artifact.generatedAt}`,
            `- Project root: ${artifact.projectRoot}`,
            `- Change path: ${artifact.changePath}`,
            '',
            '## Core Documents',
            '',
            `- proposal.md: ${this.formatBootstrapDocumentStatus(artifact.documents.proposal)}`,
            `- design.md: ${this.formatBootstrapDocumentStatus(artifact.documents.design)}`,
            `- implementation-plan.md: ${this.formatBootstrapDocumentStatus(artifact.documents.implementationPlan)}`,
            `- tasks.md: ${this.formatBootstrapDocumentStatus(artifact.documents.tasks)}`,
            `- verification.md: ${this.formatBootstrapDocumentStatus(artifact.documents.verification)}`,
            '',
            '## Task Graph',
            '',
            `- Exists: ${artifact.execution.taskGraph.exists ? 'yes' : 'no'}`,
            `- Status: ${artifact.execution.taskGraph.status}`,
            `- Tasks: ${artifact.execution.taskGraph.taskCount}`,
            `- Dispatchable: ${artifact.execution.taskGraph.dispatchable}`,
            `- Running: ${artifact.execution.taskGraph.running}`,
            `- Completed: ${artifact.execution.taskGraph.completed}`,
            `- Blocked: ${artifact.execution.taskGraph.blocked}`,
            `- Invalid: ${artifact.execution.taskGraph.invalid}`,
            '',
            '## Project Session Brief',
            '',
            `- Exists: ${artifact.execution.projectSession.exists ? 'yes' : 'no'}`,
            `- JSON: ${artifact.execution.projectSession.jsonPath}`,
            `- Markdown: ${artifact.execution.projectSession.reportPath}`,
            `- Generated at: ${artifact.execution.projectSession.generatedAt || 'not recorded'}`,
            `- Cache status: ${artifact.execution.projectSession.cacheStatus}`,
            `- Cache key: ${artifact.execution.projectSession.cacheKey || 'not recorded'}`,
            `- Active changes: ${artifact.execution.projectSession.activeChangeCount}`,
            `- Queued changes: ${artifact.execution.projectSession.queuedChangeCount}`,
            `- Next: ${artifact.execution.projectSession.nextInstruction || 'not recorded'}`,
            '',
            '## Execution State',
            '',
            `- Session: ${artifact.execution.session.status}`,
            `- Dispatch count: ${artifact.execution.session.dispatchCount}`,
            `- Workspace: ${artifact.execution.workspace.status}`,
            `- Worktree plan: ${artifact.execution.worktree.status}`,
            `- Finish plan: ${artifact.execution.finish.status}`,
            `- Required pending decisions: ${artifact.execution.decisions.pendingRequired}`,
            `- Optional pending decisions: ${artifact.execution.decisions.pendingOptional}`,
            `- Decision index: ${artifact.execution.decisions.indexReportPath}`,
            `- Implementer: ${artifact.execution.worker.implementer}`,
            `- Spec reviewer: ${artifact.execution.worker.specReviewer}`,
            `- Quality reviewer: ${artifact.execution.worker.qualityReviewer}`,
            `- Controller: ${artifact.execution.worker.controller}`,
            '',
            '## Reviews And Evidence',
            '',
            `- Spec review: ${artifact.execution.reviews.spec}`,
            `- Quality review: ${artifact.execution.reviews.quality}`,
            `- Verification checklist complete: ${artifact.execution.worker.verificationChecklistComplete ? 'yes' : 'no'}`,
            `- Verification evidence: ${artifact.execution.evidence.verification} (${artifact.execution.evidence.verificationRecords} record(s))`,
            `- TDD evidence: ${artifact.execution.evidence.tdd} (${artifact.execution.evidence.tddRecords} record(s))`,
            `- Debug evidence: ${artifact.execution.evidence.debug} (${artifact.execution.evidence.debugRecords} record(s))`,
            `- Checkpoint evidence: ${artifact.execution.evidence.checkpoint.status}`,
            '',
            '## Debug Phase Evidence',
            '',
            debugPhases,
            '',
            '## Checkpoint Evidence',
            '',
            checkpointEvidence,
            '',
            '## User Decisions',
            '',
            decisions,
            '',
            '## Recent Dispatch Results',
            '',
            latestDispatches,
            '',
            '## Active Dispatches',
            '',
            activeDispatches,
            '',
            '## Blockers',
            '',
            blockers,
            '',
            '## Warnings',
            '',
            warnings,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
            '## Safety Notes',
            '',
            '- This command writes a bootstrap snapshot only.',
            '- It does not launch workers, sync worker status, run tests, inspect git, finalize, archive, push, merge, or edit project source files.',
            '- Use it when starting or resuming one active change so the next safe action is explicit.',
            '',
        ].join('\n');
    }
    formatBootstrapDocumentStatus(documentStatus) {
        const checklist = documentStatus.checklistComplete === null
            ? ''
            : `, checklist ${documentStatus.checklistComplete ? 'complete' : 'incomplete'}`;
        return `${documentStatus.readiness}${documentStatus.exists ? '' : ', missing'}${checklist}`;
    }
}
exports.TaskGraphExecutionService = TaskGraphExecutionService;
function createTaskGraphExecutionService(fileService) {
    return new TaskGraphExecutionService(fileService);
}
