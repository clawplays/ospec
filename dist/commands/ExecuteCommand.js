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
exports.ExecuteCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class ExecuteCommand extends BaseCommand_1.BaseCommand {
    constructor() {
        super(...arguments);
        /** When true, console reports print a token-lean summary (artifacts are still written in full). */
        this.brief = false;
    }
    async execute(action = 'status', ...rawArgs) {
        try {
            const normalizedAction = action || 'status';
            if ((0, subcommandHelp_1.isHelpAction)(normalizedAction)) {
                this.info((0, subcommandHelp_1.getExecuteHelpText)());
                return;
            }
            // `--brief` is a global, output-only flag: strip it before per-action parsing so it never
            // changes command behavior or the artifacts written — only the console verbosity.
            this.brief = rawArgs.includes('--brief');
            const args = rawArgs.filter(arg => arg !== '--brief');
            switch (normalizedAction) {
                case 'bootstrap':
                    await this.bootstrap(args[0]);
                    return;
                case 'handoff':
                    await this.handoff(args);
                    return;
                case 'doc-review':
                    await this.docReview(args);
                    return;
                case 'status':
                    await this.status(args[0]);
                    return;
                case 'next':
                    await this.next(args[0]);
                    return;
                case 'route':
                    await this.route(args[0]);
                    return;
                case 'workspace':
                    await this.workspace(args[0]);
                    return;
                case 'worktree':
                    await this.worktree(args);
                    return;
                case 'finish':
                    await this.finish(args);
                    return;
                case 'dispatch':
                    await this.dispatch(args);
                    return;
                case 'orchestrate':
                    await this.orchestrate(args);
                    return;
                case 'launch':
                    await this.launch(args);
                    return;
                case 'collect':
                    await this.collect(args);
                    return;
                case 'retry':
                    await this.retry(args);
                    return;
                case 'complete':
                    await this.complete(args);
                    return;
                case 'sync':
                    await this.sync(args[0]);
                    return;
                case 'review':
                    await this.review(args);
                    return;
                case 'feedback':
                    await this.feedback(args);
                    return;
                case 'repair':
                    await this.repair(args);
                    return;
                case 'decision':
                    await this.decision(args);
                    return;
                case 'debug':
                    await this.debug(args);
                    return;
                case 'tdd':
                    await this.tdd(args);
                    return;
                case 'verify':
                    await this.verify(args);
                    return;
                default:
                    this.info((0, subcommandHelp_1.getExecuteHelpText)());
            }
        }
        catch (error) {
            this.error(`Execute command failed: ${error}`);
            throw error;
        }
    }
    async status(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const report = await services_1.services.taskGraphExecutionService.getReport(changePath);
        this.printStatus(report);
    }
    async bootstrap(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const result = await services_1.services.taskGraphExecutionService.bootstrap(changePath);
        this.printBootstrap(result);
    }
    async handoff(args) {
        const parsed = this.parseHandoffArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.handoff(changePath, {
            target: parsed.target,
        });
        this.printHandoff(result);
    }
    async docReview(args) {
        const parsed = this.parseDocumentReviewArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.reviewDocument(changePath, {
            stage: parsed.stage,
        });
        this.printDocumentReview(result);
    }
    async next(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const report = await services_1.services.taskGraphExecutionService.getReport(changePath);
        this.printNext(report);
    }
    async route(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const result = await services_1.services.taskGraphExecutionService.routeWorkflow(changePath);
        this.printWorkflowRoute(result);
    }
    async workspace(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const result = await services_1.services.taskGraphExecutionService.inspectWorkspace(changePath);
        this.printWorkspace(result);
    }
    async worktree(args) {
        const parsed = this.parseWorktreeArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        if (parsed.action) {
            const result = await services_1.services.taskGraphExecutionService.runWorktree(changePath, {
                action: parsed.action,
                branch: parsed.branch,
                targetPath: parsed.targetPath,
                baseRef: parsed.baseRef,
            });
            this.printWorktreeRun(result);
            return;
        }
        const result = await services_1.services.taskGraphExecutionService.planWorktree(changePath, {
            branch: parsed.branch,
            targetPath: parsed.targetPath,
            baseRef: parsed.baseRef,
        });
        this.printWorktree(result);
    }
    async finish(args) {
        const parsed = this.parseFinishArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.planFinish(changePath, {
            targetBranch: parsed.targetBranch,
            remote: parsed.remote,
        });
        this.printFinish(result);
    }
    async dispatch(args) {
        const parsed = this.parseDispatchArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.dispatch(changePath, {
            taskId: parsed.taskId,
            limit: parsed.limit,
        });
        this.printDispatch(result);
    }
    async launch(args) {
        const parsed = this.parseLaunchArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        if (parsed.run) {
            const result = await services_1.services.taskGraphExecutionService.launchAndRun(changePath, {
                taskId: parsed.taskId,
                target: parsed.target,
                dryRun: parsed.dryRun,
                command: parsed.command || '',
                timeoutMs: parsed.timeoutMs,
            });
            this.printWorkerRun(result);
            return;
        }
        const result = await services_1.services.taskGraphExecutionService.planLaunch(changePath, {
            taskId: parsed.taskId,
            target: parsed.target,
            dryRun: parsed.dryRun,
            primitive: parsed.primitive,
            until: parsed.until,
            maxIterations: parsed.maxIterations,
            interval: parsed.interval,
        });
        if (parsed.json) {
            console.log(JSON.stringify(await services_1.services.fileService.readJSON(result.artifactPath), null, 2));
            return;
        }
        this.printLaunch(result);
    }
    async orchestrate(args) {
        const parsed = this.parseOrchestrateArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.orchestrate(changePath, {
            command: parsed.command,
            target: parsed.target,
            limit: parsed.limit,
            maxRounds: parsed.maxRounds,
            timeoutMs: parsed.timeoutMs,
            dryRun: parsed.dryRun,
            collect: parsed.collect,
            continueOnFailure: parsed.continueOnFailure,
        });
        this.printOrchestration(result);
    }
    async collect(args) {
        const parsed = this.parseCollectArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.collectWorkerRun(changePath, {
            taskId: parsed.taskId,
            runId: parsed.runId,
            status: parsed.status,
            summary: parsed.summary,
        });
        this.printCollect(result);
    }
    async retry(args) {
        const parsed = this.parseRetryArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.retryWorkerRun(changePath, {
            taskId: parsed.taskId,
            runId: parsed.runId,
            summary: parsed.summary,
            force: parsed.force,
        });
        this.printRetry(result);
    }
    async complete(args) {
        const parsed = this.parseCompleteArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.complete(changePath, parsed.taskId, {
            status: parsed.status,
            summary: parsed.summary,
            usageFile: parsed.usageFile,
        });
        this.printCompletion(result);
    }
    async sync(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const result = await services_1.services.taskGraphExecutionService.syncWorkerStatus(changePath);
        this.printSync(result);
    }
    async review(args) {
        const parsed = this.parseReviewArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        if (parsed.run) {
            const result = await services_1.services.taskGraphExecutionService.runReview(changePath, {
                stage: parsed.stage,
                taskId: parsed.taskId,
                command: parsed.command || '',
                decision: parsed.decision,
                summary: parsed.summary,
                timeoutMs: parsed.timeoutMs,
                usageFile: parsed.usageFile,
            });
            this.printReviewRun(result);
            return;
        }
        const result = await services_1.services.taskGraphExecutionService.review(changePath, {
            stage: parsed.stage,
            taskId: parsed.taskId,
        });
        this.printReview(result);
    }
    async feedback(args) {
        const parsed = this.parseReviewFeedbackArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.planReviewFeedback(changePath, {
            stage: parsed.stage,
            summary: parsed.summary,
        });
        this.printReviewFeedback(result);
    }
    async repair(args) {
        if (args.length > 1 || args[0]?.startsWith('--')) {
            throw new Error(`Unexpected execute repair argument: ${args.find(arg => arg.startsWith('--')) || args[1]}`);
        }
        const changePath = await this.resolveChangePath(args[0]);
        const result = await services_1.services.taskGraphExecutionService.createRepairWave(changePath);
        this.printRepairWave(result);
    }
    async decision(args) {
        const parsed = this.parseDecisionArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.recordUserDecision(changePath, {
            id: parsed.id,
            question: parsed.question,
            options: parsed.options,
            recommendedOptionId: parsed.recommendedOptionId,
            required: parsed.required,
            selectOptionId: parsed.selectOptionId,
            skip: parsed.skip,
            summary: parsed.summary,
        });
        this.printDecision(result);
    }
    async verify(args) {
        const parsed = this.parseVerificationArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.recordVerification(changePath, {
            command: parsed.command,
            status: parsed.status,
            exitCode: parsed.exitCode,
            summary: parsed.summary,
        });
        this.printVerificationEvidence(result);
    }
    async tdd(args) {
        const parsed = this.parseTddArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.recordTddEvidence(changePath, {
            phase: parsed.phase,
            command: parsed.command,
            status: parsed.status,
            exitCode: parsed.exitCode,
            testName: parsed.testName,
            summary: parsed.summary,
        });
        this.printTddEvidence(result);
    }
    async debug(args) {
        const parsed = this.parseDebugArgs(args);
        const changePath = await this.resolveChangePath(parsed.inputPath);
        const result = await services_1.services.taskGraphExecutionService.recordDebugEvidence(changePath, {
            phase: parsed.phase,
            symptom: parsed.symptom,
            hypothesis: parsed.hypothesis,
            rootCause: parsed.rootCause,
            command: parsed.command,
            status: parsed.status,
            summary: parsed.summary,
        });
        this.printDebugEvidence(result);
    }
    async resolveChangePath(inputPath) {
        const cwd = process.cwd();
        const config = await services_1.services.configManager.loadConfig(cwd).catch(() => null);
        const candidatePath = inputPath
            ? (path.isAbsolute(inputPath) ? inputPath : (0, ProjectLayout_1.resolveManagedInputPath)(cwd, inputPath, config))
            : cwd;
        const resolvedCandidatePath = path.resolve(candidatePath);
        if (await services_1.services.fileService.exists(path.join(resolvedCandidatePath, constants_1.FILE_NAMES.STATE))) {
            return resolvedCandidatePath;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(resolvedCandidatePath);
        if (activeNames.length === 0) {
            throw new Error('No active change found. Pass a change path or run from a project with one active change.');
        }
        if (activeNames.length > 1) {
            throw new Error(`Multiple active changes found: ${activeNames.join(', ')}. Pass one change path explicitly.`);
        }
        const projectConfig = await services_1.services.configManager.loadConfig(resolvedCandidatePath).catch(() => null);
        return (0, ProjectLayout_1.resolveManagedPath)(resolvedCandidatePath, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, projectConfig);
    }
    printStatus(report) {
        if (this.brief) {
            const d = report.dispatchableTasks.map(task => task.id).join(', ') || 'none';
            console.log(`graph=${report.graphStatus} tasks=${report.taskCount} ready=${report.readyTasks.length} dispatchable=${report.dispatchableTasks.length} running=${report.runningTasks.length} blocked=${report.blockedTasks.length} completed=${report.completedTasks.length}`);
            if (report.decisions) {
                console.log(`pendingRequiredDecisions=${report.decisions.pendingRequired}`);
            }
            console.log(`dispatchable: ${d}`);
            console.log(`next: ${report.nextInstruction}`);
            return;
        }
        console.log('\nTask Graph Execution');
        console.log('====================\n');
        console.log(`Change: ${report.feature}`);
        console.log(`Path: ${report.changePath}`);
        console.log(`Graph: ${report.graphPath}`);
        console.log(`Graph status: ${report.graphStatus}`);
        console.log(`Tasks: ${report.taskCount}`);
        console.log(`Ready: ${report.readyTasks.length}`);
        console.log(`Dispatchable: ${report.dispatchableTasks.length}`);
        console.log(`Running: ${report.runningTasks.length}`);
        console.log(`Blocked: ${report.blockedTasks.length}`);
        console.log(`Invalid: ${report.invalidTasks.length}`);
        console.log(`Completed: ${report.completedTasks.length}`);
        console.log(`Concerns: ${report.concernTasks.length}`);
        if (report.decisions) {
            console.log(`Pending required decisions: ${report.decisions.pendingRequired}`);
            console.log(`Pending optional decisions: ${report.decisions.pendingOptional}`);
        }
        this.printCheckpointEvidenceSummary(report.checkpointEvidence);
        this.printControllerSummary(report);
        this.printTaskList('\nDispatchable next tasks:', report.dispatchableTasks);
        this.printTaskList('\nRunning tasks:', report.runningTasks);
        this.printBlockedList('\nBlocked tasks:', report.blockedTasks);
        this.printBlockedList('\nInvalid tasks:', report.invalidTasks);
        if (report.issues.length > 0) {
            console.log('\nGraph issues:');
            for (const issue of report.issues) {
                console.log(`  - ${issue}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${report.nextInstruction}`);
        console.log('');
    }
    printCheckpointEvidenceSummary(evidence) {
        if (!evidence?.active) {
            return;
        }
        console.log(`Checkpoint evidence: ${evidence.status}`);
        console.log(`Checkpoint gate: ${evidence.gateStatus}`);
        console.log(`Checkpoint active steps: ${evidence.activeSteps.join(', ')}`);
        console.log(`Checkpoint counts: screenshots ${evidence.screenshots}, traces ${evidence.traces}, visual diffs ${evidence.visualDiffs}, routes ${evidence.routes}, flows ${evidence.flows}, assertions ${evidence.assertions}, console events ${evidence.consoleEvents}, network events ${evidence.networkEvents}, accessibility ${evidence.accessibility}`);
        if (evidence.missing.length > 0) {
            console.log('Checkpoint missing evidence:');
            for (const item of evidence.missing) {
                console.log(`  - ${item}`);
            }
        }
        if (evidence.nextActions.length > 0) {
            console.log('Checkpoint next actions:');
            for (const action of evidence.nextActions) {
                console.log(`  - ${action}`);
            }
        }
    }
    printBootstrap(result) {
        if (this.brief) {
            console.log(`status=${result.status}${result.blockers.length > 0 ? ` blockers=${result.blockers.length}` : ''}`);
            for (const blocker of result.blockers) {
                console.log(`- ${blocker}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nChange Bootstrap Snapshot');
        console.log('=========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        this.printCheckpointEvidenceSummary(result.checkpointEvidence);
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printHandoff(result) {
        console.log('\nWorker Handoff Guide');
        console.log('====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Target: ${result.target}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printDocumentReview(result) {
        console.log('\nDocument Review Dispatch Packet');
        console.log('===============================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Stage: ${result.dispatch.stage}`);
        console.log(`Reviewer: ${result.dispatch.reviewerRole}`);
        console.log(`Document: ${result.dispatch.documentPath}`);
        console.log(`Document readiness: ${result.dispatch.documentReadiness}`);
        console.log(`Project session: ${result.projectSession.exists ? result.projectSession.cacheStatus : 'missing'}`);
        if (result.projectSession.cacheKey) {
            console.log(`Project session cache: ${result.projectSession.cacheKey}`);
        }
        console.log(`Packet: ${result.dispatch.packetPath}`);
        console.log(`Record: ${result.dispatch.recordPath}`);
        console.log(`Review artifact: ${result.dispatch.reviewArtifactPath}`);
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printNext(report) {
        if (this.brief) {
            for (const task of report.dispatchableTasks) {
                console.log(`- ${task.id} [${task.workerRole}]${task.workerProfile ? ` target=${task.workerProfile.recommendedTarget}` : ''} parallel=${task.parallelizable ? 'yes' : 'no'}`);
            }
            console.log(`next: ${report.nextInstruction}`);
            return;
        }
        console.log('\nNext Task Dispatch');
        console.log('==================\n');
        console.log(`Change: ${report.feature}`);
        if (report.dispatchableTasks.length === 0) {
            this.printControllerSummary(report);
            console.log('\nNext instruction:');
            console.log(report.nextInstruction);
            console.log('');
            return;
        }
        for (const task of report.dispatchableTasks) {
            console.log(`- ${task.id}: ${task.title}`);
            console.log(`  Worker: ${task.workerRole}`);
            if (task.workerProfile) {
                console.log(`  Capability: ${task.workerProfile.capabilityTier}`);
                console.log(`  Recommended target: ${task.workerProfile.recommendedTarget}`);
            }
            console.log(`  Parallelizable: ${task.parallelizable ? 'yes' : 'no'}`);
            console.log(`  Target files: ${task.targetFiles.length > 0 ? task.targetFiles.join(', ') : 'none'}`);
            console.log(`  Verification: ${task.verificationCommands.length > 0 ? task.verificationCommands.join(' && ') : 'none'}`);
            console.log(`  Expected result: ${task.expectedResult || 'none'}`);
        }
        this.printControllerSummary(report);
        console.log('\nNext instruction:');
        console.log(`  ${report.nextInstruction}`);
        console.log('');
    }
    printDispatch(result) {
        if (this.brief) {
            console.log(`dispatched=${result.dispatches.length}${result.dispatchLimit !== null ? ` limit=${result.dispatchLimit}` : ''}`);
            for (const dispatch of result.dispatches) {
                console.log(`- ${dispatch.taskId} [${dispatch.workerRole}] packet=${dispatch.packetPath}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nAgent Dispatch Packets');
        console.log('======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Session: ${result.sessionPath}`);
        console.log(`Graph: ${result.graphPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Project session: ${result.projectSession.exists ? result.projectSession.cacheStatus : 'missing'}`);
        if (result.projectSession.cacheKey) {
            console.log(`Project session cache: ${result.projectSession.cacheKey}`);
        }
        console.log(`Dispatches: ${result.dispatches.length}`);
        if (result.dispatchLimit !== null) {
            console.log(`Limit: ${result.dispatchLimit}`);
        }
        if (result.dispatches.length > 1) {
            console.log('Batch: parallel-safe');
        }
        for (const dispatch of result.dispatches) {
            console.log(`- ${dispatch.taskId}: ${dispatch.taskTitle}`);
            console.log(`  Worker: ${dispatch.workerRole}`);
            if (dispatch.workerProfile) {
                console.log(`  Capability: ${dispatch.workerProfile.capabilityTier}`);
                console.log(`  Recommended target: ${dispatch.workerProfile.recommendedTarget}`);
                console.log(`  Target mapping: ${dispatch.workerProfile.targetToolMapping?.target || dispatch.workerProfile.recommendedTarget}`);
            }
            console.log(`  Packet: ${dispatch.packetPath}`);
            console.log(`  Record: ${dispatch.recordPath}`);
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printLaunch(result) {
        if (this.brief) {
            console.log(`status=${result.status} target=${result.target}${result.taskId ? ` task=${result.taskId}` : ''}${result.dryRun ? ' dry-run' : ''}`);
            if (result.loopPlan) {
                console.log(`loop: primitive=${result.loopPlan.primitive} mode=${result.loopPlan.mode} model=${result.loopPlan.executionModel} controllerAction=${result.loopPlan.requiresControllerAction ? 'yes' : 'no'}`);
            }
            if (result.nativeAgent) {
                console.log(`agent: ${result.nativeAgent.mechanism}`);
            }
            console.log(`report=${result.reportPath}`);
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nNative Agent Launch Plan');
        console.log('========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Target: ${result.target}`);
        console.log(`Dry run: ${result.dryRun ? 'yes' : 'no'}`);
        if (result.taskId) {
            console.log(`Task: ${result.taskId}`);
        }
        if (result.dispatchId) {
            console.log(`Dispatch: ${result.dispatchId}`);
        }
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.loopPlan) {
            console.log(`Loop primitive: ${result.loopPlan.primitive}`);
            console.log(`Execution model: ${result.loopPlan.executionModel}`);
            console.log(`Loop mode: ${result.loopPlan.mode}`);
            console.log(`Controller action required: ${result.loopPlan.requiresControllerAction ? 'yes' : 'no'}`);
            if (result.loopPlan.until) {
                console.log(`Until: ${result.loopPlan.until}`);
            }
            if (result.loopPlan.interval) {
                console.log(`Interval: ${result.loopPlan.interval}`);
            }
            console.log(`Native loop capability: ${result.loopPlan.capability.nativeLoopCapability} (${result.loopPlan.capability.probeSource})`);
            if (result.loopPlan.cliCommandPreview) {
                console.log(`CLI command preview: ${result.loopPlan.cliCommandPreview}`);
            }
            for (const instruction of result.loopPlan.instructions) {
                console.log(`  - ${instruction}`);
            }
        }
        if (result.nativeAgent) {
            console.log(`Adapter: ${result.nativeAgent.adapterId}`);
            console.log(`Agent primitive: ${result.nativeAgent.agentPrimitive}`);
            console.log(`Dispatch mode: ${result.nativeAgent.dispatchMode}`);
            console.log(`Native agent: ${result.nativeAgent.mechanism}`);
            console.log(`Native agent default: ${result.nativeAgent.defaultPath ? 'yes' : 'no'}`);
        }
        if (result.launchCommands.length > 0) {
            console.log('\nCLI fallback commands:');
            for (const command of result.launchCommands) {
                console.log(`  - ${command}`);
            }
        }
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printOrchestration(result) {
        console.log('\nWorker Orchestration');
        console.log('====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Rounds: ${result.rounds.length}`);
        for (const round of result.rounds) {
            console.log(`- Round ${round.round}: ${round.tasks.length} task(s)`);
            for (const task of round.tasks) {
                console.log(`  - ${task.taskId}: run=${task.runId || 'not run'} exit=${task.exitCode ?? 'unknown'} collected=${task.collected ? 'yes' : 'no'} completion=${task.completionStatus || 'none'}`);
                if (task.error) {
                    console.log(`    Error: ${task.error}`);
                }
            }
        }
        if (result.failedTasks.length > 0) {
            console.log('\nFailed tasks:');
            for (const task of result.failedTasks) {
                console.log(`  - ${task.taskId}: run=${task.runId || 'not recorded'} exit=${task.exitCode ?? 'unknown'} completion=${task.completionStatus || 'none'}`);
                console.log(`    Retry: ${task.retryCommand}`);
            }
        }
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printWorkerRun(result) {
        console.log('\nWorker Run Recorded');
        console.log('===================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Run: ${result.record.id}`);
        console.log(`Kind: ${result.record.kind}`);
        console.log(`Target: ${result.record.target}`);
        console.log(`Task: ${result.record.taskId || 'not applicable'}`);
        console.log(`Status: ${result.record.status}`);
        console.log(`Exit code: ${result.record.exitCode ?? 'unknown'}`);
        console.log(`Timed out: ${result.record.timedOut ? 'yes' : 'no'}`);
        console.log(`Timeout ms: ${result.record.timeoutMs ?? 'none'}`);
        console.log(`Command: ${result.record.command}`);
        console.log(`Record: ${result.recordPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Stdout: ${result.stdoutPath}`);
        console.log(`Stderr: ${result.stderrPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printCollect(result) {
        console.log('\nWorker Run Collected');
        console.log('====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Run: ${result.runId}`);
        console.log(`Task: ${result.taskId}`);
        console.log(`Run status: ${result.status}`);
        console.log(`Completion status: ${result.completionStatus}`);
        console.log(`Record: ${result.recordPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Session: ${result.completion.sessionPath}`);
        console.log(`Worker status: ${result.completion.workerStatusPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printRetry(result) {
        console.log('\nWorker Retry Dispatch');
        console.log('=====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Retry: ${result.retryRecord.id}`);
        console.log(`Task: ${result.retryRecord.taskId}`);
        console.log(`Previous status: ${result.retryRecord.previousStatus}`);
        console.log(`Previous run: ${result.retryRecord.previousRunId || 'not recorded'}`);
        console.log(`Retry record: ${result.retryRecord.recordPath}`);
        console.log(`Retry report: ${result.retryRecord.reportPath}`);
        console.log(`Dispatches: ${result.dispatch.dispatches.length}`);
        for (const dispatch of result.dispatch.dispatches) {
            console.log(`- ${dispatch.taskId}: ${dispatch.packetPath}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printWorkspace(result) {
        if (this.brief) {
            console.log(`status=${result.status}${result.blockers.length > 0 ? ` blockers=${result.blockers.length}` : ''}`);
            for (const blocker of result.blockers) {
                console.log(`- ${blocker}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nWorkspace Safety Check');
        console.log('======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printWorktree(result) {
        console.log('\nWorktree Preparation Plan');
        console.log('=========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Recommended branch: ${result.recommendedBranch}`);
        console.log(`Recommended path: ${result.recommendedPath}`);
        console.log(`Base ref: ${result.baseRef}`);
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nCommands:');
        for (const command of result.commands) {
            console.log(`  - ${command}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printWorktreeRun(result) {
        console.log('\nWorktree Run');
        console.log('============\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Action: ${result.action}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Target path: ${result.targetPath || 'not resolved'}`);
        console.log(`Branch: ${result.branch || 'not specified'}`);
        console.log(`Base ref: ${result.baseRef || 'not specified'}`);
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        if (result.commandResults.length > 0) {
            console.log('\nCommand results:');
            for (const commandResult of result.commandResults) {
                console.log(`  - ${commandResult.command}: ${commandResult.ok ? 'ok' : 'failed'} (${commandResult.status ?? 'unknown'})`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printFinish(result) {
        if (this.brief) {
            console.log(`status=${result.status} target=${result.targetBranch} remote=${result.remote}`);
            if (result.blockers.length > 0) {
                console.log(`blockers: ${result.blockers.join('; ')}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nFinish Preparation Plan');
        console.log('=======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Project root: ${result.projectRoot}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Target branch: ${result.targetBranch}`);
        console.log(`Remote: ${result.remote}`);
        this.printCheckpointEvidenceSummary(result.checkpointEvidence);
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nCommands:');
        for (const command of result.commands) {
            console.log(`  - ${command}`);
        }
        if (result.decisionPrompts.length > 0) {
            console.log('\nDecision prompts:');
            for (const prompt of result.decisionPrompts) {
                console.log(`  - ${prompt.id}: ${prompt.question}`);
                console.log(`    ${prompt.command}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printCompletion(result) {
        console.log('\nTask Completion Recorded');
        console.log('========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Task: ${result.taskId}`);
        console.log(`Status: ${result.status}`);
        console.log(`Graph status: ${result.graphStatus}`);
        console.log(`Session: ${result.sessionPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        if (result.usage) {
            console.log(`Usage: input=${result.usage.inputTokens} cached=${result.usage.cachedInputTokens} output=${result.usage.outputTokens} reasoning=${result.usage.reasoningTokens} tools=${result.usage.toolCalls} turns=${result.usage.turns} elapsed=${result.usage.elapsedMs}ms`);
        }
        if (result.blockerEscalation) {
            console.log(`Blocker artifact: ${result.blockerEscalation.recordPath}`);
            console.log(`Blocker report: ${result.blockerEscalation.reportPath}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printRepairWave(result) {
        console.log('\nGrouped Repair Wave Created');
        console.log('===========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Wave: ${result.record.id}`);
        console.log(`Task: ${result.record.taskId}`);
        console.log(`Findings: ${result.record.findings.length}`);
        console.log(`Packet: ${result.record.packetPath}`);
        console.log(`Dispatches: ${result.dispatch.dispatches.length}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printSync(result) {
        console.log('\nWorker Status Synchronized');
        console.log('==========================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Session: ${result.sessionPath}`);
        console.log(`Graph: ${result.graphPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Implementer: ${result.implementerStatus}`);
        console.log(`Spec reviewer: ${result.specReviewerStatus}`);
        console.log(`Quality reviewer: ${result.qualityReviewerStatus}`);
        console.log(`Controller: ${result.controllerStatus}`);
        console.log(`Verification checklist complete: ${result.verificationChecklistComplete ? 'yes' : 'no'}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printReview(result) {
        if (this.brief) {
            console.log(`stage=${result.dispatch.stage}${result.dispatch.taskId ? ` task=${result.dispatch.taskId}` : ''} reviewer=${result.dispatch.reviewerRole}`);
            console.log(`artifact=${result.dispatch.reviewArtifactPath}`);
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nReview Dispatch Packet');
        console.log('======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Graph: ${result.graphPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Stage: ${result.dispatch.stage}`);
        if (result.dispatch.taskId) {
            console.log(`Task: ${result.dispatch.taskId}`);
        }
        console.log(`Reviewer: ${result.dispatch.reviewerRole}`);
        console.log(`Project session: ${result.projectSession.exists ? result.projectSession.cacheStatus : 'missing'}`);
        if (result.projectSession.cacheKey) {
            console.log(`Project session cache: ${result.projectSession.cacheKey}`);
        }
        console.log(`Packet: ${result.dispatch.packetPath}`);
        console.log(`Record: ${result.dispatch.recordPath}`);
        console.log(`Review artifact: ${result.dispatch.reviewArtifactPath}`);
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printReviewRun(result) {
        console.log('\nReview Run Recorded');
        console.log('===================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Stage: ${result.review.dispatch.stage}`);
        if (result.review.dispatch.taskId) {
            console.log(`Task: ${result.review.dispatch.taskId}`);
        }
        console.log(`Reviewer: ${result.review.dispatch.reviewerRole}`);
        console.log(`Run: ${result.run.record.id}`);
        console.log(`Run status: ${result.run.record.status}`);
        console.log(`Exit code: ${result.run.record.exitCode ?? 'unknown'}`);
        console.log(`Decision: ${result.decision || 'not recorded'}`);
        console.log(`Review artifact: ${result.review.dispatch.reviewArtifactPath}`);
        console.log(`Run record: ${result.run.recordPath}`);
        console.log(`Run report: ${result.run.reportPath}`);
        console.log(`Stdout: ${result.run.stdoutPath}`);
        console.log(`Stderr: ${result.run.stderrPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printReviewFeedback(result) {
        console.log('\nReview Feedback Plan');
        console.log('====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Stage: ${result.stage}`);
        console.log(`Decision: ${result.decision}`);
        console.log(`Action: ${result.action}`);
        console.log(`User decision gate: ${result.userDecisionGate.status}`);
        if (result.userDecisionGate.id) {
            console.log(`Decision gate id: ${result.userDecisionGate.id}`);
        }
        if (result.userDecisionGate.reportPath) {
            console.log(`Decision gate report: ${result.userDecisionGate.reportPath}`);
        }
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printDecision(result) {
        console.log('\nUser Decision Gate');
        console.log('==================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Decision: ${result.decision.id}`);
        console.log(`Status: ${result.decision.status}`);
        console.log(`Required: ${result.decision.required ? 'yes' : 'no'}`);
        console.log(`Question: ${result.decision.question}`);
        if (result.decision.options.length > 0) {
            console.log('\nOptions:');
            for (const option of result.decision.options) {
                const markers = [
                    option.id === result.decision.recommendedOptionId ? 'recommended' : '',
                    option.id === result.decision.selectedOptionId ? 'selected' : '',
                ].filter(Boolean);
                console.log(`  - ${option.id}: ${option.label}${markers.length > 0 ? ` (${markers.join(', ')})` : ''}${option.description ? ` - ${option.description}` : ''}`);
            }
        }
        console.log(`\nRecord: ${result.recordPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Pending required decisions: ${result.snapshot.pendingRequired}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printVerificationEvidence(result) {
        console.log('\nVerification Evidence Recorded');
        console.log('==============================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Evidence: ${result.evidencePath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Status: ${result.record.status}`);
        console.log(`Command: ${result.record.command}`);
        console.log(`Record: ${result.record.recordPath}`);
        console.log(`Report: ${result.record.reportPath}`);
        if (result.record.exitCode !== null) {
            console.log(`Exit code: ${result.record.exitCode}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printTddEvidence(result) {
        console.log('\nTDD Evidence Recorded');
        console.log('=====================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Evidence: ${result.evidencePath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Phase: ${result.record.phase}`);
        console.log(`Status: ${result.record.status}`);
        console.log(`Command: ${result.record.command}`);
        if (result.record.testName) {
            console.log(`Test: ${result.record.testName}`);
        }
        console.log(`Record: ${result.record.recordPath}`);
        console.log(`Report: ${result.record.reportPath}`);
        if (result.record.exitCode !== null) {
            console.log(`Exit code: ${result.record.exitCode}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printDebugEvidence(result) {
        console.log('\nDebug Evidence Recorded');
        console.log('=======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Evidence: ${result.evidencePath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Phase: ${result.record.phase}`);
        console.log(`Status: ${result.record.status}`);
        console.log(`Symptom: ${result.record.symptom}`);
        if (result.record.hypothesis) {
            console.log(`Hypothesis: ${result.record.hypothesis}`);
        }
        if (result.record.rootCause) {
            console.log(`Root cause: ${result.record.rootCause}`);
        }
        if (result.record.command) {
            console.log(`Command: ${result.record.command}`);
        }
        console.log(`Record: ${result.record.recordPath}`);
        console.log(`Report: ${result.record.reportPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printWorkflowRoute(result) {
        if (this.brief) {
            console.log(`status=${result.status}`);
            for (const item of result.recommendations) {
                console.log(`${item.priority}. ${item.action}${item.command ? `: ${item.command}` : ''}`);
            }
            for (const blocker of result.blockers) {
                console.log(`blocker: ${blocker}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nWorkflow Route');
        console.log('==============\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Status: ${result.status}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.recommendations.length > 0) {
            console.log('\nRecommendations:');
            for (const item of result.recommendations) {
                console.log(`  ${item.priority}. ${item.action}: ${item.reason}`);
                if (item.command) {
                    console.log(`     ${item.command}`);
                }
            }
        }
        if (result.blockers.length > 0) {
            console.log('\nBlockers:');
            for (const blocker of result.blockers) {
                console.log(`  - ${blocker}`);
            }
        }
        if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printControllerSummary(report) {
        const summary = this.buildControllerSummary(report);
        console.log('\nController summary:');
        console.log(`  Next action: ${summary.nextAction}`);
        if (summary.suggestedCommand) {
            console.log(`  Suggested command: ${summary.suggestedCommand}`);
        }
        if (summary.reviewNeeded.length > 0) {
            console.log(`  Review needed: ${summary.reviewNeeded.join('; ')}`);
        }
        if (summary.blockedFocus.length > 0) {
            console.log(`  Blocked focus: ${summary.blockedFocus.join('; ')}`);
        }
    }
    buildControllerSummary(report) {
        const changeArg = this.quoteCommandArg(report.changePath);
        const reviewActions = this.extractTaskReviewActions(report.blockedTasks, changeArg);
        const blockedFocus = this.summarizeBlockedFocus(report);
        if (report.decisions?.pendingRequired > 0 || (report.decisions?.blockers?.length || 0) > 0) {
            const pendingDecision = report.decisions.decisions.find(decision => decision.status === 'PENDING' && decision.required);
            return {
                nextAction: 'ask user decision',
                suggestedCommand: pendingDecision
                    ? `ospec execute decision ${changeArg} --id ${this.quoteCommandArg(pendingDecision.id)} --select <option-id>`
                    : null,
                reviewNeeded: reviewActions.map(action => action.label),
                blockedFocus: [...report.decisions.blockers, ...blockedFocus].slice(0, 3),
            };
        }
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            return {
                nextAction: 'repair task graph',
                suggestedCommand: null,
                reviewNeeded: reviewActions.map(action => action.label),
                blockedFocus,
            };
        }
        if (report.dispatchableTasks.length > 0) {
            const suggestedCommand = report.dispatchableTasks.length === 1
                ? `ospec execute dispatch ${changeArg} --task ${this.quoteCommandArg(report.dispatchableTasks[0].id)}`
                : `ospec execute dispatch ${changeArg} --limit ${report.dispatchableTasks.length}`;
            return {
                nextAction: 'dispatch worker packet batch',
                suggestedCommand,
                reviewNeeded: reviewActions.map(action => action.label),
                blockedFocus,
            };
        }
        if (report.runningTasks.length > 0) {
            const firstTask = report.runningTasks[0];
            return {
                nextAction: 'wait for worker result or record completion',
                suggestedCommand: `ospec execute launch ${changeArg} --task ${this.quoteCommandArg(firstTask.id)}`,
                reviewNeeded: [],
                blockedFocus,
            };
        }
        if (reviewActions.length > 0) {
            return {
                nextAction: 'dispatch task review',
                suggestedCommand: reviewActions[0].command,
                reviewNeeded: reviewActions.map(action => action.label),
                blockedFocus,
            };
        }
        if (report.completedTasks.length === report.taskCount && report.taskCount > 0) {
            return {
                nextAction: 'dispatch final review',
                suggestedCommand: `ospec execute review ${changeArg} --stage spec`,
                reviewNeeded: [],
                blockedFocus,
            };
        }
        return {
            nextAction: report.blockedTasks.length > 0 ? 'resolve blockers' : 'inspect change state',
            suggestedCommand: null,
            reviewNeeded: [],
            blockedFocus,
        };
    }
    extractTaskReviewActions(blockedTasks, changeArg) {
        const actions = [];
        const seen = new Set();
        for (const blocked of blockedTasks) {
            for (const reason of blocked.reasons) {
                const match = reason.match(/^waiting_for_task_(spec|quality)_review:(.+)$/);
                if (!match) {
                    continue;
                }
                const stage = match[1];
                const taskId = match[2];
                const key = `${taskId}:${stage}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                actions.push({
                    taskId,
                    stage,
                    command: `ospec execute review ${changeArg} --task ${this.quoteCommandArg(taskId)} --stage ${stage}`,
                    label: `${taskId} ${stage}`,
                });
            }
        }
        return actions;
    }
    summarizeBlockedFocus(report) {
        const blocked = [...report.invalidTasks, ...report.blockedTasks];
        return blocked.slice(0, 3).map(item => `${item.task.id}: ${item.reasons.join(', ')}`);
    }
    quoteCommandArg(value) {
        if (/^[A-Za-z0-9_./:@\\-]+$/.test(value)) {
            return value;
        }
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    printTaskList(title, tasks) {
        if (tasks.length === 0) {
            return;
        }
        console.log(title);
        for (const task of tasks) {
            console.log(`  - ${task.id} [${task.status}] ${task.title}`);
        }
    }
    printBlockedList(title, blockedTasks) {
        if (blockedTasks.length === 0) {
            return;
        }
        console.log(title);
        for (const blockedTask of blockedTasks) {
            console.log(`  - ${blockedTask.task.id} [${blockedTask.task.status}] ${blockedTask.reasons.join(', ')}`);
        }
    }
    parseDispatchArgs(args) {
        let inputPath;
        let taskId;
        let limit;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--task') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute dispatch requires a value after --task.');
                }
                taskId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--task=')) {
                taskId = arg.slice('--task='.length);
                continue;
            }
            if (arg === '--limit') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute dispatch requires a value after --limit.');
                }
                limit = this.parsePositiveInteger(value, 'Execute dispatch --limit');
                index += 1;
                continue;
            }
            if (arg.startsWith('--limit=')) {
                limit = this.parsePositiveInteger(arg.slice('--limit='.length), 'Execute dispatch --limit');
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute dispatch flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute dispatch argument: ${arg}`);
        }
        if (taskId && limit !== undefined) {
            throw new Error('Execute dispatch cannot combine --task with --limit.');
        }
        return { inputPath, taskId, limit };
    }
    parseOrchestrateArgs(args) {
        let inputPath;
        let command;
        let target;
        let limit;
        let maxRounds;
        let timeoutMs;
        let dryRun = false;
        let collect = true;
        let continueOnFailure = false;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute orchestrate requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--target') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute orchestrate requires a value after --target.');
                }
                target = this.normalizeWorkerToolTarget(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--target=')) {
                target = this.normalizeWorkerToolTarget(arg.slice('--target='.length));
                continue;
            }
            if (arg === '--limit') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute orchestrate requires a value after --limit.');
                }
                limit = this.parsePositiveInteger(value, 'Execute orchestrate --limit');
                index += 1;
                continue;
            }
            if (arg.startsWith('--limit=')) {
                limit = this.parsePositiveInteger(arg.slice('--limit='.length), 'Execute orchestrate --limit');
                continue;
            }
            if (arg === '--max-rounds') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute orchestrate requires a value after --max-rounds.');
                }
                maxRounds = this.parsePositiveInteger(value, 'Execute orchestrate --max-rounds');
                index += 1;
                continue;
            }
            if (arg.startsWith('--max-rounds=')) {
                maxRounds = this.parsePositiveInteger(arg.slice('--max-rounds='.length), 'Execute orchestrate --max-rounds');
                continue;
            }
            if (arg === '--timeout-ms') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute orchestrate requires a value after --timeout-ms.');
                }
                timeoutMs = this.parsePositiveInteger(value, 'Execute orchestrate --timeout-ms');
                index += 1;
                continue;
            }
            if (arg.startsWith('--timeout-ms=')) {
                timeoutMs = this.parsePositiveInteger(arg.slice('--timeout-ms='.length), 'Execute orchestrate --timeout-ms');
                continue;
            }
            if (arg === '--dry-run') {
                dryRun = true;
                continue;
            }
            if (arg === '--no-collect') {
                collect = false;
                continue;
            }
            if (arg === '--continue-on-failure') {
                continueOnFailure = true;
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute orchestrate flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute orchestrate argument: ${arg}`);
        }
        return { inputPath, command, target, limit, maxRounds, timeoutMs, dryRun, collect, continueOnFailure };
    }
    parseLaunchArgs(args) {
        let inputPath;
        let taskId;
        let target;
        let dryRun = false;
        let run = false;
        let json = false;
        let command;
        let timeoutMs;
        let primitive;
        let until;
        let maxIterations;
        let interval;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--task') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --task.');
                }
                taskId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--task=')) {
                taskId = arg.slice('--task='.length);
                continue;
            }
            if (arg === '--target') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --target.');
                }
                target = this.normalizeWorkerToolTarget(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--target=')) {
                target = this.normalizeWorkerToolTarget(arg.slice('--target='.length));
                continue;
            }
            if (arg === '--dry-run') {
                dryRun = true;
                continue;
            }
            if (arg === '--json') {
                json = true;
                continue;
            }
            if (arg === '--run') {
                run = true;
                continue;
            }
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch --run requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--timeout-ms') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --timeout-ms.');
                }
                timeoutMs = this.parsePositiveInteger(value, 'Execute launch --timeout-ms');
                index += 1;
                continue;
            }
            if (arg.startsWith('--timeout-ms=')) {
                timeoutMs = this.parsePositiveInteger(arg.slice('--timeout-ms='.length), 'Execute launch --timeout-ms');
                continue;
            }
            if (arg === '--primitive') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --primitive.');
                }
                primitive = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--primitive=')) {
                primitive = arg.slice('--primitive='.length);
                continue;
            }
            if (arg === '--until') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --until.');
                }
                until = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--until=')) {
                until = arg.slice('--until='.length);
                continue;
            }
            if (arg === '--max-iterations') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --max-iterations.');
                }
                maxIterations = this.parsePositiveInteger(value, 'Execute launch --max-iterations');
                index += 1;
                continue;
            }
            if (arg.startsWith('--max-iterations=')) {
                maxIterations = this.parsePositiveInteger(arg.slice('--max-iterations='.length), 'Execute launch --max-iterations');
                continue;
            }
            if (arg === '--interval') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute launch requires a value after --interval.');
                }
                interval = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--interval=')) {
                interval = arg.slice('--interval='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute launch flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute launch argument: ${arg}`);
        }
        if (run && !command?.trim()) {
            throw new Error('Execute launch --run requires --command.');
        }
        if (run && json) {
            throw new Error('Execute launch --json cannot be combined with --run.');
        }
        if (primitive !== undefined && !['subagent', 'goal', 'loop'].includes(primitive.trim().toLowerCase())) {
            throw new Error(`Execute launch --primitive must be one of subagent, goal, loop (received ${primitive}).`);
        }
        return { inputPath, taskId, target, dryRun, run, json, command, timeoutMs, primitive, until, maxIterations, interval };
    }
    parseWorktreeArgs(args) {
        let inputPath;
        let branch;
        let targetPath;
        let baseRef;
        let action;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--create') {
                if (action && action !== 'create') {
                    throw new Error('Execute worktree cannot combine --create with --cleanup.');
                }
                action = 'create';
                continue;
            }
            if (arg === '--cleanup') {
                if (action && action !== 'cleanup') {
                    throw new Error('Execute worktree cannot combine --create with --cleanup.');
                }
                action = 'cleanup';
                continue;
            }
            if (arg === '--branch') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute worktree requires a value after --branch.');
                }
                branch = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--branch=')) {
                branch = arg.slice('--branch='.length);
                continue;
            }
            if (arg === '--path') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute worktree requires a value after --path.');
                }
                targetPath = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--path=')) {
                targetPath = arg.slice('--path='.length);
                continue;
            }
            if (arg === '--base') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute worktree requires a value after --base.');
                }
                baseRef = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--base=')) {
                baseRef = arg.slice('--base='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute worktree flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute worktree argument: ${arg}`);
        }
        return { inputPath, branch, targetPath, baseRef, action };
    }
    parseHandoffArgs(args) {
        let inputPath;
        let target;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--target') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute handoff requires a value after --target.');
                }
                target = this.normalizeHandoffTarget(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--target=')) {
                target = this.normalizeHandoffTarget(arg.slice('--target='.length));
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute handoff flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute handoff argument: ${arg}`);
        }
        return { inputPath, target };
    }
    parseDocumentReviewArgs(args) {
        let inputPath;
        let stage;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--stage') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute doc-review requires a value after --stage.');
                }
                stage = this.normalizeDocumentReviewStage(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--stage=')) {
                stage = this.normalizeDocumentReviewStage(arg.slice('--stage='.length));
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute doc-review flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute doc-review argument: ${arg}`);
        }
        return { inputPath, stage };
    }
    parseFinishArgs(args) {
        let inputPath;
        let targetBranch;
        let remote;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--target') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute finish requires a value after --target.');
                }
                targetBranch = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--target=')) {
                targetBranch = arg.slice('--target='.length);
                continue;
            }
            if (arg === '--remote') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute finish requires a value after --remote.');
                }
                remote = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--remote=')) {
                remote = arg.slice('--remote='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute finish flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute finish argument: ${arg}`);
        }
        return { inputPath, targetBranch, remote };
    }
    parsePositiveInteger(value, label) {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new Error(`${label} must be a positive integer.`);
        }
        return parsed;
    }
    parseCompleteArgs(args) {
        let taskId;
        let inputPath;
        let status;
        let summary;
        let usageFile;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--status') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute complete requires a value after --status.');
                }
                status = this.normalizeCompletionStatus(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--status=')) {
                status = this.normalizeCompletionStatus(arg.slice('--status='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute complete requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg === '--usage-file') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute complete requires a value after --usage-file.');
                }
                usageFile = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--usage-file=')) {
                usageFile = arg.slice('--usage-file='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute complete flag: ${arg}`);
            }
            if (!taskId) {
                taskId = arg;
                continue;
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute complete argument: ${arg}`);
        }
        if (!taskId) {
            throw new Error('Execute complete requires a task id.');
        }
        return { taskId, inputPath, status, summary, usageFile };
    }
    parseCollectArgs(args) {
        let inputPath;
        let taskId;
        let runId;
        let status;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--task') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute collect requires a value after --task.');
                }
                taskId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--task=')) {
                taskId = arg.slice('--task='.length);
                continue;
            }
            if (arg === '--run') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute collect requires a value after --run.');
                }
                runId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--run=')) {
                runId = arg.slice('--run='.length);
                continue;
            }
            if (arg === '--status') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute collect requires a value after --status.');
                }
                status = this.normalizeCompletionStatus(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--status=')) {
                status = this.normalizeCompletionStatus(arg.slice('--status='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute collect requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute collect flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute collect argument: ${arg}`);
        }
        return { inputPath, taskId, runId, status, summary };
    }
    parseRetryArgs(args) {
        let inputPath;
        let taskId;
        let runId;
        let summary;
        let force = false;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--force') {
                force = true;
                continue;
            }
            if (arg === '--task') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute retry requires a value after --task.');
                }
                taskId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--task=')) {
                taskId = arg.slice('--task='.length);
                continue;
            }
            if (arg === '--run') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute retry requires a value after --run.');
                }
                runId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--run=')) {
                runId = arg.slice('--run='.length);
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute retry requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute retry flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute retry argument: ${arg}`);
        }
        if (!taskId?.trim()) {
            throw new Error('Execute retry requires --task.');
        }
        return { inputPath, taskId, runId, summary, force };
    }
    parseReviewArgs(args) {
        let inputPath;
        let stage;
        let taskId;
        let run = false;
        let command;
        let decision;
        let summary;
        let timeoutMs;
        let usageFile;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--stage') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review requires a value after --stage.');
                }
                stage = this.normalizeReviewStage(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--stage=')) {
                stage = this.normalizeReviewStage(arg.slice('--stage='.length));
                continue;
            }
            if (arg === '--task') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review requires a value after --task.');
                }
                taskId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--task=')) {
                taskId = arg.slice('--task='.length);
                continue;
            }
            if (arg === '--run') {
                run = true;
                continue;
            }
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review --run requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--decision') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review --run requires a value after --decision.');
                }
                decision = this.normalizeReviewRunDecision(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--decision=')) {
                decision = this.normalizeReviewRunDecision(arg.slice('--decision='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review --run requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg === '--timeout-ms') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review requires a value after --timeout-ms.');
                }
                timeoutMs = this.parsePositiveInteger(value, 'Execute review --timeout-ms');
                index += 1;
                continue;
            }
            if (arg.startsWith('--timeout-ms=')) {
                timeoutMs = this.parsePositiveInteger(arg.slice('--timeout-ms='.length), 'Execute review --timeout-ms');
                continue;
            }
            if (arg === '--usage-file') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute review requires a value after --usage-file.');
                }
                usageFile = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--usage-file=')) {
                usageFile = arg.slice('--usage-file='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute review flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute review argument: ${arg}`);
        }
        if (run && !command?.trim()) {
            throw new Error('Execute review --run requires --command.');
        }
        return { inputPath, stage, taskId, run, command, decision, summary, timeoutMs, usageFile };
    }
    parseReviewFeedbackArgs(args) {
        let inputPath;
        let stage;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--stage') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute feedback requires a value after --stage.');
                }
                stage = this.normalizeReviewStage(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--stage=')) {
                stage = this.normalizeReviewStage(arg.slice('--stage='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute feedback requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute feedback flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute feedback argument: ${arg}`);
        }
        return { inputPath, stage, summary };
    }
    parseDecisionArgs(args) {
        let inputPath;
        let id;
        let question;
        const decisionOptions = [];
        let recommendedOptionId;
        let required;
        let selectOptionId;
        let skip = false;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--id') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --id.');
                }
                id = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--id=')) {
                id = arg.slice('--id='.length);
                continue;
            }
            if (arg === '--question') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --question.');
                }
                question = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--question=')) {
                question = arg.slice('--question='.length);
                continue;
            }
            if (arg === '--option') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --option.');
                }
                decisionOptions.push(this.parseDecisionOption(value));
                index += 1;
                continue;
            }
            if (arg.startsWith('--option=')) {
                decisionOptions.push(this.parseDecisionOption(arg.slice('--option='.length)));
                continue;
            }
            if (arg === '--recommended') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --recommended.');
                }
                recommendedOptionId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--recommended=')) {
                recommendedOptionId = arg.slice('--recommended='.length);
                continue;
            }
            if (arg === '--select') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --select.');
                }
                selectOptionId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--select=')) {
                selectOptionId = arg.slice('--select='.length);
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute decision requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg === '--required') {
                if (required === false) {
                    throw new Error('Execute decision cannot combine --required with --optional.');
                }
                required = true;
                continue;
            }
            if (arg === '--optional') {
                if (required === true) {
                    throw new Error('Execute decision cannot combine --required with --optional.');
                }
                required = false;
                continue;
            }
            if (arg === '--skip') {
                skip = true;
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute decision flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute decision argument: ${arg}`);
        }
        if (skip && selectOptionId) {
            throw new Error('Execute decision cannot combine --skip with --select.');
        }
        return {
            inputPath,
            id,
            question,
            options: decisionOptions,
            recommendedOptionId,
            required,
            selectOptionId,
            skip,
            summary,
        };
    }
    parseDecisionOption(value) {
        const trimmed = value.trim();
        if (!trimmed) {
            throw new Error('Execute decision --option cannot be empty.');
        }
        const parts = trimmed.split(':');
        if (parts.length === 1) {
            return {
                id: trimmed,
                label: trimmed,
                description: '',
            };
        }
        const id = (parts.shift() || '').trim();
        const label = (parts.shift() || '').trim();
        const description = parts.join(':').trim();
        if (!id || !label) {
            throw new Error('Execute decision --option must be "id:label[:description]" or "label".');
        }
        return { id, label, description };
    }
    parseVerificationArgs(args) {
        let inputPath;
        let command;
        let status;
        let exitCode;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute verify requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--status') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute verify requires a value after --status.');
                }
                status = this.normalizeVerificationEvidenceStatus(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--status=')) {
                status = this.normalizeVerificationEvidenceStatus(arg.slice('--status='.length));
                continue;
            }
            if (arg === '--exit-code') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute verify requires a value after --exit-code.');
                }
                exitCode = this.normalizeExitCode(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--exit-code=')) {
                exitCode = this.normalizeExitCode(arg.slice('--exit-code='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute verify requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute verify flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute verify argument: ${arg}`);
        }
        if (!command?.trim()) {
            throw new Error('Execute verify requires --command.');
        }
        return { inputPath, command, status, exitCode, summary };
    }
    parseTddArgs(args) {
        let inputPath;
        let phase;
        let command;
        let status;
        let exitCode;
        let testName;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--phase') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --phase.');
                }
                phase = this.normalizeTddEvidencePhase(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--phase=')) {
                phase = this.normalizeTddEvidencePhase(arg.slice('--phase='.length));
                continue;
            }
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--status') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --status.');
                }
                status = this.normalizeTddEvidenceStatus(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--status=')) {
                status = this.normalizeTddEvidenceStatus(arg.slice('--status='.length));
                continue;
            }
            if (arg === '--exit-code') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --exit-code.');
                }
                exitCode = this.normalizeExitCode(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--exit-code=')) {
                exitCode = this.normalizeExitCode(arg.slice('--exit-code='.length));
                continue;
            }
            if (arg === '--test') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --test.');
                }
                testName = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--test=')) {
                testName = arg.slice('--test='.length);
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute tdd requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute tdd flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute tdd argument: ${arg}`);
        }
        if (!command?.trim()) {
            throw new Error('Execute tdd requires --command.');
        }
        return { inputPath, phase, command, status, exitCode, testName, summary };
    }
    parseDebugArgs(args) {
        let inputPath;
        let phase;
        let symptom;
        let hypothesis;
        let rootCause;
        let command;
        let status;
        let summary;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--phase') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --phase.');
                }
                phase = this.normalizeDebugEvidencePhase(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--phase=')) {
                phase = this.normalizeDebugEvidencePhase(arg.slice('--phase='.length));
                continue;
            }
            if (arg === '--symptom') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --symptom.');
                }
                symptom = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--symptom=')) {
                symptom = arg.slice('--symptom='.length);
                continue;
            }
            if (arg === '--hypothesis') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --hypothesis.');
                }
                hypothesis = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--hypothesis=')) {
                hypothesis = arg.slice('--hypothesis='.length);
                continue;
            }
            if (arg === '--root-cause') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --root-cause.');
                }
                rootCause = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--root-cause=')) {
                rootCause = arg.slice('--root-cause='.length);
                continue;
            }
            if (arg === '--command') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --command.');
                }
                command = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--command=')) {
                command = arg.slice('--command='.length);
                continue;
            }
            if (arg === '--status') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --status.');
                }
                status = this.normalizeDebugEvidenceStatus(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--status=')) {
                status = this.normalizeDebugEvidenceStatus(arg.slice('--status='.length));
                continue;
            }
            if (arg === '--summary') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute debug requires a value after --summary.');
                }
                summary = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--summary=')) {
                summary = arg.slice('--summary='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute debug flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute debug argument: ${arg}`);
        }
        if (!symptom?.trim()) {
            throw new Error('Execute debug requires --symptom.');
        }
        return { inputPath, phase, symptom, hypothesis, rootCause, command, status, summary };
    }
    normalizeCompletionStatus(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'DONE' || normalized === 'DONE_WITH_CONCERNS' || normalized === 'NEEDS_CONTEXT' || normalized === 'BLOCKED') {
            return normalized;
        }
        throw new Error(`Unsupported execute complete status: ${value}`);
    }
    normalizeReviewStage(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'spec' || normalized === 'quality') {
            return normalized;
        }
        throw new Error(`Unsupported execute review stage: ${value}`);
    }
    normalizeReviewRunDecision(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'APPROVED' || normalized === 'APPROVED_WITH_CONCERNS' || normalized === 'NEEDS_CHANGES' || normalized === 'BLOCKED' || normalized === 'PENDING') {
            return normalized;
        }
        throw new Error(`Unsupported execute review decision: ${value}`);
    }
    normalizeDocumentReviewStage(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'design' || normalized === 'plan') {
            return normalized;
        }
        throw new Error(`Unsupported execute doc-review stage: ${value}`);
    }
    normalizeHandoffTarget(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported execute handoff target: ${value}`);
    }
    normalizeWorkerToolTarget(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported execute launch target: ${value}`);
    }
    normalizeVerificationEvidenceStatus(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'PASSED' || normalized === 'FAILED' || normalized === 'BLOCKED' || normalized === 'SKIPPED') {
            return normalized;
        }
        throw new Error(`Unsupported execute verify status: ${value}`);
    }
    normalizeTddEvidencePhase(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'red' || normalized === 'green' || normalized === 'refactor') {
            return normalized;
        }
        throw new Error(`Unsupported execute tdd phase: ${value}`);
    }
    normalizeDebugEvidencePhase(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'reproduce' || normalized === 'isolate' || normalized === 'hypothesize' || normalized === 'fix' || normalized === 'verify') {
            return normalized;
        }
        throw new Error(`Unsupported execute debug phase: ${value}`);
    }
    normalizeTddEvidenceStatus(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'PASSED' || normalized === 'FAILED' || normalized === 'BLOCKED' || normalized === 'SKIPPED') {
            return normalized;
        }
        throw new Error(`Unsupported execute tdd status: ${value}`);
    }
    normalizeDebugEvidenceStatus(value) {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'CONFIRMED' || normalized === 'FIXED' || normalized === 'BLOCKED' || normalized === 'SKIPPED') {
            return normalized;
        }
        throw new Error(`Unsupported execute debug status: ${value}`);
    }
    normalizeExitCode(value) {
        const exitCode = Number(value);
        if (Number.isInteger(exitCode) && exitCode >= 0) {
            return exitCode;
        }
        throw new Error(`Unsupported execute verify exit code: ${value}`);
    }
}
exports.ExecuteCommand = ExecuteCommand;
