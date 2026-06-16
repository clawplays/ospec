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
exports.VerifyCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
class VerifyCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath) {
        try {
            const targetPath = featurePath && !path.isAbsolute(featurePath)
                ? (0, ProjectLayout_1.resolveManagedInputPath)(process.cwd(), featurePath, await services_1.services.configManager.loadConfig(process.cwd()).catch(() => null))
                : featurePath || process.cwd();
            this.logger.info(`Verifying change at ${targetPath}`);
            const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
            const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
            const designPath = path.join(targetPath, constants_1.FILE_NAMES.DESIGN);
            const implementationPlanPath = path.join(targetPath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN);
            const taskGraphPath = path.join(targetPath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
            const specComplianceReviewPath = path.join(targetPath, 'artifacts', 'reviews', constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW);
            const codeQualityReviewPath = path.join(targetPath, 'artifacts', 'reviews', constants_1.FILE_NAMES.CODE_QUALITY_REVIEW);
            const agentWorkerStatusPath = path.join(targetPath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
            const tasksPath = path.join(targetPath, constants_1.FILE_NAMES.TASKS);
            const verificationPath = path.join(targetPath, constants_1.FILE_NAMES.VERIFICATION);
            const [stateExists, proposalExists, designExists, implementationPlanExists, taskGraphExists, specComplianceReviewExists, codeQualityReviewExists, agentWorkerStatusExists, tasksExists, verificationExists] = await Promise.all([
                services_1.services.fileService.exists(statePath),
                services_1.services.fileService.exists(proposalPath),
                services_1.services.fileService.exists(designPath),
                services_1.services.fileService.exists(implementationPlanPath),
                services_1.services.fileService.exists(taskGraphPath),
                services_1.services.fileService.exists(specComplianceReviewPath),
                services_1.services.fileService.exists(codeQualityReviewPath),
                services_1.services.fileService.exists(agentWorkerStatusPath),
                services_1.services.fileService.exists(tasksPath),
                services_1.services.fileService.exists(verificationPath),
            ]);
            if (!stateExists) {
                throw new Error('Change state file not found. Expected changes/active/<change>/state.json');
            }
            const featureState = await services_1.services.fileService.readJSON(statePath);
            const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(targetPath, featureState);
            const isGoalWorkflow = workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE;
            const projectRoot = await this.findProjectRoot(targetPath);
            const config = await services_1.services.configManager.loadConfig(projectRoot);
            const workflow = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);
            const checks = [
                {
                    name: 'proposal.md',
                    status: proposalExists ? 'pass' : 'fail',
                    message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing',
                },
                {
                    name: 'tasks.md',
                    status: tasksExists ? 'pass' : 'fail',
                    message: tasksExists ? 'Tasks file exists' : 'tasks.md is missing',
                },
                {
                    name: 'verification.md',
                    status: verificationExists ? 'pass' : 'fail',
                    message: verificationExists
                        ? 'Verification file exists'
                        : 'verification.md is missing',
                },
            ];
            checks.push({
                name: 'workflow_profile',
                status: 'pass',
                message: `Workflow profile is ${workflowProfile}`,
            });
            if (isGoalWorkflow) {
                checks.push({
                    name: 'design.md',
                    status: designExists ? 'pass' : 'fail',
                    message: designExists ? 'Design file exists' : 'design.md is missing',
                }, {
                    name: 'implementation-plan.md',
                    status: implementationPlanExists ? 'pass' : 'fail',
                    message: implementationPlanExists ? 'Implementation plan file exists' : 'implementation-plan.md is missing',
                }, {
                    name: 'artifacts/agents/task-graph.json',
                    status: taskGraphExists ? 'pass' : 'fail',
                    message: taskGraphExists ? 'Task graph artifact exists' : 'artifacts/agents/task-graph.json is missing',
                }, {
                    name: 'artifacts/reviews/spec-compliance.md',
                    status: specComplianceReviewExists ? 'pass' : 'fail',
                    message: specComplianceReviewExists ? 'Spec compliance review artifact exists' : 'artifacts/reviews/spec-compliance.md is missing',
                }, {
                    name: 'artifacts/reviews/code-quality.md',
                    status: codeQualityReviewExists ? 'pass' : 'fail',
                    message: codeQualityReviewExists ? 'Code quality review artifact exists' : 'artifacts/reviews/code-quality.md is missing',
                }, {
                    name: 'artifacts/agents/worker-status.md',
                    status: agentWorkerStatusExists ? 'pass' : 'fail',
                    message: agentWorkerStatusExists ? 'Agent worker status file exists' : 'artifacts/agents/worker-status.md is missing',
                });
            }
            let activatedSteps = [];
            if (proposalExists) {
                const proposal = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(proposalPath));
                const flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];
                activatedSteps = workflow.getActivatedSteps(flags);
                checks.push({
                    name: 'proposal.flags',
                    status: 'pass',
                    message: activatedSteps.length > 0
                        ? `Activated optional steps: ${activatedSteps.join(', ')}`
                        : 'No optional steps activated',
                });
            }
            if (isGoalWorkflow && designExists) {
                const designAnalysis = await services_1.services.projectService.analyzeChecklistDocument(designPath, 'design.md', activatedSteps);
                checks.push(...designAnalysis.checks);
            }
            if (isGoalWorkflow && implementationPlanExists) {
                const implementationPlanAnalysis = await services_1.services.projectService.analyzeChecklistDocument(implementationPlanPath, 'implementation-plan.md', activatedSteps);
                checks.push(...implementationPlanAnalysis.checks);
            }
            if (isGoalWorkflow && taskGraphExists) {
                const taskGraphAnalysis = await services_1.services.projectService.analyzeTaskGraphDocument(taskGraphPath, activatedSteps);
                checks.push(...taskGraphAnalysis.checks);
            }
            if (isGoalWorkflow && specComplianceReviewExists) {
                const specComplianceReviewAnalysis = await services_1.services.projectService.analyzeReviewArtifactDocument(specComplianceReviewPath, 'artifacts/reviews/spec-compliance.md', 'spec_compliance_reviewer', activatedSteps);
                checks.push(...specComplianceReviewAnalysis.checks);
            }
            if (isGoalWorkflow && codeQualityReviewExists) {
                const codeQualityReviewAnalysis = await services_1.services.projectService.analyzeReviewArtifactDocument(codeQualityReviewPath, 'artifacts/reviews/code-quality.md', 'code_quality_reviewer', activatedSteps);
                checks.push(...codeQualityReviewAnalysis.checks);
            }
            if (isGoalWorkflow && agentWorkerStatusExists) {
                const agentWorkerStatusAnalysis = await services_1.services.projectService.analyzeAgentWorkerStatusDocument(agentWorkerStatusPath);
                checks.push(...agentWorkerStatusAnalysis.checks);
            }
            if (tasksExists) {
                const tasksAnalysis = await services_1.services.projectService.analyzeChecklistDocument(tasksPath, 'tasks.md', activatedSteps);
                checks.push(...tasksAnalysis.checks);
            }
            if (verificationExists) {
                const verificationAnalysis = await services_1.services.projectService.analyzeVerificationDocument(verificationPath, activatedSteps);
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
            }
            if (activatedSteps.includes('stitch_design_review')) {
                const approvalPath = path.join(targetPath, 'artifacts', 'stitch', 'approval.json');
                const approvalExists = await services_1.services.fileService.exists(approvalPath);
                checks.push({
                    name: 'stitch.approval',
                    status: approvalExists ? 'pass' : 'fail',
                    message: approvalExists
                        ? 'Stitch approval artifact exists'
                        : 'artifacts/stitch/approval.json is missing',
                });
                if (approvalExists) {
                    const approval = await services_1.services.fileService.readJSON(approvalPath);
                    const approvalStatus = typeof approval.status === 'string' ? approval.status : 'pending';
                    const validStep = approval.step === 'stitch_design_review';
                    const hasPreviewUrl = typeof approval.preview_url === 'string' && approval.preview_url.trim().length > 0;
                    const hasSubmittedAt = typeof approval.submitted_at === 'string' && approval.submitted_at.trim().length > 0;
                    checks.push({
                        name: 'stitch.approval.step',
                        status: validStep ? 'pass' : 'fail',
                        message: validStep
                            ? 'Stitch approval step matches stitch_design_review'
                            : 'Stitch approval step does not match stitch_design_review',
                    });
                    checks.push({
                        name: 'stitch.approval.preview_url',
                        status: hasPreviewUrl ? 'pass' : 'fail',
                        message: hasPreviewUrl
                            ? 'Stitch preview URL is recorded'
                            : 'Stitch preview URL is missing',
                    });
                    checks.push({
                        name: 'stitch.approval.submitted_at',
                        status: hasSubmittedAt ? 'pass' : 'fail',
                        message: hasSubmittedAt
                            ? 'Stitch submission timestamp is recorded'
                            : 'Stitch submission timestamp is missing',
                    });
                    checks.push({
                        name: 'stitch.approval.status',
                        status: approvalStatus === 'approved' ? 'pass' : 'fail',
                        message: approvalStatus === 'approved'
                            ? 'Stitch design review approved'
                            : `Stitch design review is ${approvalStatus}`,
                    });
                }
            }
            const activeCheckpointSteps = activatedSteps.filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
            if (activeCheckpointSteps.length > 0) {
                const checkpointDir = path.join(targetPath, 'artifacts', 'checkpoint');
                const gatePath = path.join(checkpointDir, 'gate.json');
                const resultPath = path.join(checkpointDir, 'result.json');
                const summaryPath = path.join(checkpointDir, 'summary.md');
                const gateExists = await services_1.services.fileService.exists(gatePath);
                checks.push({
                    name: 'checkpoint.gate',
                    status: gateExists ? 'pass' : 'fail',
                    message: gateExists
                        ? 'Checkpoint gate artifact exists'
                        : 'artifacts/checkpoint/gate.json is missing',
                });
                if (gateExists) {
                    const gate = await services_1.services.fileService.readJSON(gatePath);
                    checks.push({
                        name: 'checkpoint.gate.plugin',
                        status: gate.plugin === 'checkpoint' ? 'pass' : 'fail',
                        message: gate.plugin === 'checkpoint'
                            ? 'Checkpoint gate plugin matches checkpoint'
                            : `Checkpoint gate plugin is ${gate.plugin || '(missing)'}`,
                    });
                    checks.push({
                        name: 'checkpoint.gate.status',
                        status: gate.status === 'passed' ? 'pass' : 'fail',
                        message: gate.status === 'passed'
                            ? 'Checkpoint gate passed'
                            : `Checkpoint gate status is ${gate.status || '(missing)'}`,
                    });
                    const evidenceStatus = gate.evidence?.status || 'missing';
                    const evidenceMissing = Array.isArray(gate.evidence?.missing)
                        ? gate.evidence.missing.map((item) => String(item || '').trim()).filter(Boolean)
                        : [];
                    checks.push({
                        name: 'checkpoint.evidence.status',
                        status: evidenceStatus === 'complete' ? 'pass' : 'fail',
                        message: evidenceStatus === 'complete'
                            ? 'Checkpoint evidence coverage is complete'
                            : `Checkpoint evidence coverage is ${evidenceStatus}; missing ${evidenceMissing.length > 0 ? evidenceMissing.join(', ') : 'coverage metadata'}`,
                    });
                    for (const stepName of activeCheckpointSteps) {
                        const stepStatus = gate.steps?.[stepName]?.status || 'missing';
                        const stepEvidenceStatus = gate.evidence?.by_step?.[stepName]?.status || 'missing';
                        const stepMissing = Array.isArray(gate.evidence?.by_step?.[stepName]?.missing)
                            ? gate.evidence.by_step[stepName].missing.map((item) => String(item || '').trim()).filter(Boolean)
                            : [];
                        checks.push({
                            name: `checkpoint.${stepName}`,
                            status: stepStatus === 'passed' ? 'pass' : 'fail',
                            message: stepStatus === 'passed'
                                ? `${stepName} passed`
                                : `${stepName} status is ${stepStatus}`,
                        });
                        checks.push({
                            name: `checkpoint.${stepName}.evidence`,
                            status: stepEvidenceStatus === 'complete' ? 'pass' : 'fail',
                            message: stepEvidenceStatus === 'complete'
                                ? `${stepName} evidence coverage is complete`
                                : `${stepName} evidence coverage is ${stepEvidenceStatus}; missing ${stepMissing.length > 0 ? stepMissing.join(', ') : 'coverage metadata'}`,
                        });
                    }
                }
                const resultExists = await services_1.services.fileService.exists(resultPath);
                const summaryExists = await services_1.services.fileService.exists(summaryPath);
                checks.push({
                    name: 'checkpoint.artifacts',
                    status: resultExists || summaryExists ? 'pass' : 'fail',
                    message: resultExists || summaryExists
                        ? `Checkpoint artifacts present${resultExists && summaryExists ? ' (result.json and summary.md)' : resultExists ? ' (result.json)' : ' (summary.md)'}`
                        : 'Checkpoint result.json or summary.md is required',
                });
            }
            const externalPluginCapabilities = workflow.getPluginCapabilities()
                .filter(capability => capability.plugin !== 'stitch' && capability.plugin !== 'checkpoint')
                .filter(capability => activatedSteps.includes(capability.step));
            const externalStepsByPlugin = externalPluginCapabilities.reduce((accumulator, capability) => {
                accumulator[capability.plugin] = accumulator[capability.plugin] || [];
                accumulator[capability.plugin].push(capability.step);
                return accumulator;
            }, {});
            for (const [pluginName, pluginSteps] of Object.entries(externalStepsByPlugin)) {
                const pluginDir = path.join(targetPath, 'artifacts', pluginName);
                const gatePath = path.join(pluginDir, 'gate.json');
                const resultPath = path.join(pluginDir, 'result.json');
                const summaryPath = path.join(pluginDir, 'summary.md');
                const gateExists = await services_1.services.fileService.exists(gatePath);
                checks.push({
                    name: `${pluginName}.gate`,
                    status: gateExists ? 'pass' : 'fail',
                    message: gateExists
                        ? `${pluginName} gate artifact exists`
                        : `artifacts/${pluginName}/gate.json is missing`,
                });
                if (gateExists) {
                    const gate = await services_1.services.fileService.readJSON(gatePath);
                    const gateStatus = typeof gate.status === 'string' ? gate.status : 'pending';
                    checks.push({
                        name: `${pluginName}.gate.plugin`,
                        status: gate.plugin === pluginName ? 'pass' : 'fail',
                        message: gate.plugin === pluginName
                            ? `${pluginName} gate plugin matches ${pluginName}`
                            : `${pluginName} gate plugin is ${gate.plugin || '(missing)'}`,
                    });
                    checks.push({
                        name: `${pluginName}.gate.status`,
                        status: gateStatus === 'passed' || gateStatus === 'approved' ? 'pass' : 'fail',
                        message: gateStatus === 'passed' || gateStatus === 'approved'
                            ? `${pluginName} gate status is ${gateStatus}`
                            : `${pluginName} gate status is ${gateStatus}`,
                    });
                    for (const stepName of pluginSteps) {
                        const stepStatus = gate.steps?.[stepName]?.status || 'missing';
                        checks.push({
                            name: `${pluginName}.${stepName}`,
                            status: stepStatus === 'passed' || stepStatus === 'approved' ? 'pass' : 'fail',
                            message: stepStatus === 'passed' || stepStatus === 'approved'
                                ? `${stepName} status is ${stepStatus}`
                                : `${stepName} status is ${stepStatus}`,
                        });
                    }
                }
                const resultExists = await services_1.services.fileService.exists(resultPath);
                const summaryExists = await services_1.services.fileService.exists(summaryPath);
                checks.push({
                    name: `${pluginName}.artifacts`,
                    status: resultExists || summaryExists ? 'pass' : 'fail',
                    message: resultExists || summaryExists
                        ? `${pluginName} artifacts present${resultExists && summaryExists ? ' (result.json and summary.md)' : resultExists ? ' (result.json)' : ' (summary.md)'}`
                        : `${pluginName} result.json or summary.md is required`,
                });
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
            console.log('\nChange Verification Results:');
            console.log('====================\n');
            for (const check of checks) {
                const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
                console.log(`${icon} ${check.name}: ${check.message}`);
            }
            console.log('\n' + '='.repeat(24));
            console.log(`Summary: ${summary}`);
            console.log('='.repeat(24) + '\n');
            if (passed) {
                this.success('All verifications passed');
            }
            else {
                this.warn('Some verifications failed');
                process.exit(1);
            }
        }
        catch (error) {
            this.error(`Verification failed: ${error}`);
            throw error;
        }
    }
    async addGoalDocumentReviewChecks(targetPath, checks) {
        const approvedDecisions = new Set(['APPROVED', 'APPROVED_WITH_CONCERNS']);
        for (const review of [
            {
                name: 'artifacts/reviews/design-review.md',
                path: path.join(targetPath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, 'design-review.md'),
            },
            {
                name: 'artifacts/reviews/implementation-plan-review.md',
                path: path.join(targetPath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, 'implementation-plan-review.md'),
            },
        ]) {
            const exists = await services_1.services.fileService.exists(review.path);
            checks.push({
                name: review.name,
                status: exists ? 'pass' : 'fail',
                message: exists ? `${review.name} exists` : `${review.name} is missing`,
            });
            if (!exists) {
                continue;
            }
            try {
                const document = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(review.path));
                const decision = typeof document.data.decision === 'string'
                    ? document.data.decision.trim().toUpperCase()
                    : 'PENDING';
                checks.push({
                    name: `${review.name}.decision`,
                    status: approvedDecisions.has(decision) ? 'pass' : 'fail',
                    message: approvedDecisions.has(decision)
                        ? `${review.name} is ${decision}`
                        : `${review.name} must be approved before goal closeout (current: ${decision})`,
                });
            }
            catch (error) {
                checks.push({
                    name: `${review.name}.decision`,
                    status: 'fail',
                    message: `${review.name} cannot be parsed: ${error.message || error}`,
                });
            }
        }
    }
    async findProjectRoot(startPath) {
        let currentPath = path.resolve(startPath);
        while (true) {
            const skillrcPath = path.join(currentPath, constants_1.FILE_NAMES.SKILLRC);
            if (await services_1.services.fileService.exists(skillrcPath)) {
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
exports.VerifyCommand = VerifyCommand;
