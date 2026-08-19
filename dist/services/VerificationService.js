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
exports.VerificationService = void 0;
exports.createVerificationService = createVerificationService;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const WorkflowComposer_1 = require("../workflow/WorkflowComposer");
const ReviewArtifacts_1 = require("../utils/ReviewArtifacts");
/**
 * Structured verification analysis that NEVER calls process.exit (Contract 3).
 * `VerifyCommand` wraps this for console output + exit code; `LoopService` consumes
 * the structured outcome as the third stage of its stop condition.
 */
class VerificationService {
    // Lazy import of the service container to avoid an import cycle (services/index aggregates services).
    async deps() {
        const { services } = await Promise.resolve().then(() => __importStar(require('../services')));
        return services;
    }
    /** Run the full protocol verification analysis for a resolved change directory. */
    async verify(targetPath) {
        const services = await this.deps();
        // A Goal verification validates the final review, the verification
        // records and every task review in one sweep. Sharing one validation
        // scope means `git rev-parse HEAD` is resolved once for the whole
        // sweep instead of once per check.
        return services.taskGraphExecutionService.withValidationScope(() => this.verifyUnscoped(targetPath));
    }
    async verifyUnscoped(targetPath) {
        const services = await this.deps();
        const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
        const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
        const designPath = path.join(targetPath, constants_1.FILE_NAMES.DESIGN);
        const implementationPlanPath = path.join(targetPath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN);
        const taskGraphPath = path.join(targetPath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const agentWorkerStatusPath = path.join(targetPath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
        const tasksPath = path.join(targetPath, constants_1.FILE_NAMES.TASKS);
        const verificationPath = path.join(targetPath, constants_1.FILE_NAMES.VERIFICATION);
        const [stateExists, proposalExists, designExists, implementationPlanExists, taskGraphExists, agentWorkerStatusExists, tasksExists, verificationExists] = await Promise.all([
            services.fileService.exists(statePath),
            services.fileService.exists(proposalPath),
            services.fileService.exists(designPath),
            services.fileService.exists(implementationPlanPath),
            services.fileService.exists(taskGraphPath),
            services.fileService.exists(agentWorkerStatusPath),
            services.fileService.exists(tasksPath),
            services.fileService.exists(verificationPath),
        ]);
        if (!stateExists) {
            throw new Error('Change state file not found. Expected changes/active/<change>/state.json');
        }
        const featureState = await services.fileService.readJSON(statePath);
        const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(targetPath, featureState);
        const isGoalWorkflow = workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE;
        if (!isGoalWorkflow) {
            const changeStatus = await services.projectService.getActiveChangeStatusItem(targetPath);
            const checks = [...changeStatus.checks];
            if (!changeStatus.archiveReady && !checks.some(check => check.status === 'fail')) {
                checks.push({
                    name: 'archive.readiness',
                    status: 'fail',
                    message: 'Classic change closeout is not ready to archive',
                });
            }
            const failCount = checks.filter(check => check.status === 'fail').length;
            const warnCount = checks.filter(check => check.status === 'warn').length;
            const passed = failCount === 0 && changeStatus.archiveReady;
            const summary = failCount > 0
                ? `${failCount} verification(s) failed`
                : warnCount > 0
                    ? `${warnCount} warning(s) found`
                    : 'All verifications passed';
            return {
                passed,
                checks,
                summary,
                failCount,
                warnCount,
                workflowProfile,
                changeStatus,
            };
        }
        const progressProjection = isGoalWorkflow && taskGraphExists
            ? await services.taskGraphExecutionService.reconcileGoalProgress(targetPath)
            : null;
        const reviewArtifactSet = await (0, ReviewArtifacts_1.resolveGoalReviewArtifacts)(services.fileService, targetPath);
        const reviewArtifactsReady = reviewArtifactSet.missing.length === 0;
        const projectRoot = await this.findProjectRoot(targetPath);
        const config = await services.configManager.loadConfig(projectRoot);
        const workflow = new WorkflowComposer_1.WorkflowComposer(config);
        const analyzer = services.projectService;
        const checks = [
            { name: 'proposal.md', status: proposalExists ? 'pass' : 'fail', message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing' },
            { name: 'tasks.md', status: tasksExists ? 'pass' : 'fail', message: tasksExists ? 'Tasks file exists' : 'tasks.md is missing' },
            { name: 'verification.md', status: verificationExists ? 'pass' : 'fail', message: verificationExists ? 'Verification file exists' : 'verification.md is missing' },
        ];
        checks.push({ name: 'workflow_profile', status: 'pass', message: `Workflow profile is ${workflowProfile}` });
        if (isGoalWorkflow) {
            checks.push({
                name: 'goal.progress_projection',
                status: progressProjection?.status === 'current' ? 'pass' : 'fail',
                message: progressProjection?.status === 'current'
                    ? `Goal progress is reconciled (${progressProjection.checkedTaskIds.length} accepted task(s) projected)`
                    : progressProjection?.issues.join('; ') || 'Goal progress cannot be reconciled without a task graph',
            });
            checks.push({ name: 'design.md', status: designExists ? 'pass' : 'fail', message: designExists ? 'Design file exists' : 'design.md is missing' }, { name: 'implementation-plan.md', status: implementationPlanExists ? 'pass' : 'fail', message: implementationPlanExists ? 'Implementation plan file exists' : 'implementation-plan.md is missing' }, { name: 'artifacts/agents/task-graph.json', status: taskGraphExists ? 'pass' : 'fail', message: taskGraphExists ? 'Task graph artifact exists' : 'artifacts/agents/task-graph.json is missing' }, {
                name: 'artifacts/reviews/final-review.md',
                status: reviewArtifactsReady ? 'pass' : 'fail',
                message: reviewArtifactsReady
                    ? reviewArtifactSet.mode === 'combined'
                        ? 'Combined final review artifact exists'
                        : 'Legacy spec and quality review artifacts exist'
                    : `Review artifact is missing: ${reviewArtifactSet.missing.join(', ')}`,
            }, { name: 'artifacts/agents/worker-status.md', status: agentWorkerStatusExists ? 'pass' : 'fail', message: agentWorkerStatusExists ? 'Agent worker status file exists' : 'artifacts/agents/worker-status.md is missing' });
        }
        let activatedSteps = [];
        if (proposalExists) {
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await services.fileService.readFile(proposalPath));
            const flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];
            activatedSteps = workflow.getActivatedSteps(flags);
            checks.push({
                name: 'proposal.flags',
                status: 'pass',
                message: activatedSteps.length > 0 ? `Activated optional steps: ${activatedSteps.join(', ')}` : 'No optional steps activated',
            });
        }
        if (isGoalWorkflow && designExists) {
            checks.push(...(await analyzer.analyzeChecklistDocument(designPath, 'design.md', activatedSteps)).checks);
        }
        if (isGoalWorkflow && implementationPlanExists) {
            checks.push(...(await analyzer.analyzeChecklistDocument(implementationPlanPath, 'implementation-plan.md', activatedSteps)).checks);
        }
        if (isGoalWorkflow && taskGraphExists) {
            checks.push(...(await analyzer.analyzeTaskGraphDocument(taskGraphPath, activatedSteps)).checks);
        }
        if (isGoalWorkflow) {
            for (const reviewArtifact of reviewArtifactSet.artifacts) {
                checks.push(...(await analyzer.analyzeReviewArtifactDocument(reviewArtifact.path, reviewArtifact.name, reviewArtifact.role, activatedSteps)).checks);
            }
        }
        if (isGoalWorkflow && agentWorkerStatusExists) {
            checks.push(...(await services.projectService.analyzeAgentWorkerStatusDocument(agentWorkerStatusPath)).checks);
        }
        if (tasksExists) {
            checks.push(...(await analyzer.analyzeChecklistDocument(tasksPath, 'tasks.md', activatedSteps)).checks);
        }
        if (verificationExists) {
            const verificationAnalysis = await analyzer.analyzeVerificationDocument(verificationPath, activatedSteps);
            checks.push(...verificationAnalysis.checks);
            if (isGoalWorkflow) {
                const evidenceCheck = verificationAnalysis.checks.find(check => check.name === 'verification.md.evidence');
                if (evidenceCheck?.status !== 'pass') {
                    checks.push({
                        name: 'goal.verification_evidence',
                        status: 'fail',
                        message: 'Goal workflow requires latest passing artifacts/agents/verification-evidence.json',
                    });
                }
            }
        }
        if (isGoalWorkflow) {
            await this.addGoalDocumentReviewChecks(targetPath, checks);
            const verificationFreshness = await services.taskGraphExecutionService
                .validateLatestVerificationEvidence(targetPath)
                .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
            checks.push({
                name: 'goal.verification_evidence.freshness',
                status: verificationFreshness.ready ? 'pass' : 'fail',
                message: verificationFreshness.ready
                    ? 'Latest verification evidence matches the current Git and target-file snapshot'
                    : verificationFreshness.reason || 'Latest verification evidence is stale',
            });
            const verificationRequirements = await services.taskGraphExecutionService
                .validateVerificationRequirements(targetPath)
                .catch((error) => ({ ready: false, reason: error?.message || String(error), pending: [] }));
            checks.push({
                name: 'goal.verification_requirements',
                status: verificationRequirements.ready ? 'pass' : 'fail',
                message: verificationRequirements.ready
                    ? 'All required verification requirements have fresh passing evidence'
                    : verificationRequirements.reason || 'Required verification evidence is incomplete',
            });
            const finalReviewFreshness = await services.taskGraphExecutionService
                .validateTaskReviewEvidence(targetPath, null)
                .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
            checks.push({
                name: 'goal.final_review.freshness',
                status: finalReviewFreshness.ready ? 'pass' : 'fail',
                message: finalReviewFreshness.ready
                    ? 'Final review matches its dispatch and target-file snapshot'
                    : finalReviewFreshness.reason || 'Final review evidence is stale',
            });
            const taskReport = await services.taskGraphExecutionService.getReport(targetPath).catch(() => null);
            for (const task of taskReport ? [...taskReport.completedTasks, ...taskReport.concernTasks] : []) {
                const taskReviewFreshness = await services.taskGraphExecutionService
                    .validateTaskReviewEvidence(targetPath, task.id)
                    .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
                checks.push({
                    name: `goal.task_review.${task.id}.freshness`,
                    status: taskReviewFreshness.ready ? 'pass' : 'fail',
                    message: taskReviewFreshness.ready
                        ? `Task ${task.id} review matches its dispatch and target-file snapshot`
                        : taskReviewFreshness.reason || `Task ${task.id} review evidence is stale`,
                });
            }
        }
        checks.push({
            name: 'state.json',
            status: 'pass',
            message: `Status is ${featureState.status}, current step is ${featureState.current_step}`,
        });
        const failCount = checks.filter(check => check.status === 'fail').length;
        const warnCount = checks.filter(check => check.status === 'warn').length;
        const passed = failCount === 0;
        const summary = failCount > 0
            ? `${failCount} verification(s) failed`
            : warnCount > 0
                ? `${warnCount} warning(s) found`
                : 'All verifications passed';
        return { passed, checks, summary, failCount, warnCount, workflowProfile };
    }
    async addGoalDocumentReviewChecks(targetPath, checks) {
        const services = await this.deps();
        for (const review of [
            { name: 'artifacts/reviews/design-review.md', stage: 'design' },
            { name: 'artifacts/reviews/implementation-plan-review.md', stage: 'plan' },
        ]) {
            const reviewPath = path.join(targetPath, review.name);
            const exists = await services.fileService.exists(reviewPath);
            checks.push({ name: review.name, status: exists ? 'pass' : 'fail', message: exists ? `${review.name} exists` : `${review.name} is missing` });
            const evidence = await services.taskGraphExecutionService
                .validateDocumentReviewEvidence(targetPath, review.stage)
                .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
            checks.push({
                name: `${review.name}.evidence`,
                status: evidence.ready ? 'pass' : 'fail',
                message: evidence.ready
                    ? `${review.name} is bound to the current document review dispatch`
                    : evidence.reason || `${review.name} evidence is stale or invalid`,
            });
        }
    }
    async findProjectRoot(startPath) {
        const services = await this.deps();
        let currentPath = path.resolve(startPath);
        while (true) {
            const skillrcPath = path.join(currentPath, constants_1.FILE_NAMES.SKILLRC);
            if (await services.fileService.exists(skillrcPath)) {
                return currentPath;
            }
            const parentPath = path.dirname(currentPath);
            if (parentPath === currentPath) {
                break;
            }
            currentPath = parentPath;
        }
        throw new Error('Unable to locate project root containing .skillrc from the provided change path.');
    }
}
exports.VerificationService = VerificationService;
function createVerificationService() {
    return new VerificationService();
}
