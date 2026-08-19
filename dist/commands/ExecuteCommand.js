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
const fs_1 = require("fs");
const fs_2 = require("fs");
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const outputBudget_1 = require("../utils/outputBudget");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const structuredReports_1 = require("../utils/structuredReports");
const ShellQuote_1 = require("../utils/ShellQuote");
const BaseCommand_1 = require("./BaseCommand");
const SessionCommand_1 = require("./SessionCommand");
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
                case 'preflight':
                    await this.preflight(args);
                    return;
                case 'status':
                    await this.status(args);
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
                case 'defer-blocker':
                    await this.deferBlocker(args);
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
                case 'review-decision':
                    await this.reviewDecision(args);
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
                case 'require-verification':
                    await this.requireVerification(args);
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
    /*
     * S7 / P1: `execute status` is a read command, and it used to open with
     * `reconcileGoalProgress`, which takes the task-graph MUTATION lease and
     * rewrites the graph, the checklist and the progress projection. Polling
     * status therefore fought a running controller for the lease and could
     * change the very state it was reporting. Reconciliation is now opt-in
     * behind `--repair`; the report itself is unchanged.
     *
     * FIX-2 / D4 + D10: "does not repair" is not the same as "does not
     * report". Dropping the call also dropped every progress-projection line
     * from the output -- five lines from the human report and the
     * `progressProjection=` line from `--brief`, which is documented as the
     * surface controller loops parse. `inspectGoalProgress` recomputes the
     * projection read-only, so the whole diagnostic is back on the default
     * path and only the *writes* stay behind `--repair`.
     */
    async status(args = []) {
        const repair = args.includes('--repair');
        const positional = args.filter(arg => arg !== '--repair');
        /*
         * FIX-2 / D13: `main` ignored unknown flags here, so `--repiar` was a
         * silent no-op that reported an unreconciled projection and looked like
         * a success. Rejecting is the right call for a flag that changes
         * whether the command writes; keep it, and name what IS accepted so
         * the message is actionable rather than just strict.
         */
        const unknownFlag = positional.find(arg => arg.startsWith('--'));
        if (unknownFlag) {
            throw new Error(`Unexpected execute status argument: ${unknownFlag}. Accepted flags: --brief, --repair.`);
        }
        const changePath = await this.resolveGoalChangePath(positional[0], 'status');
        /*
         * The projection reads each task's review decision, and reading a
         * decision validates that task's review evidence -- one `git rev-parse
         * HEAD` and one cache-file read per task if they are not shared.
         * Measured on the 15-task hot-path fixture: 894 ms / 15 git spawns
         * unscoped (which is what `main` paid), 20 ms / 1 inside a scope. The
         * scope is read-only, so it is opened only on the default path;
         * `--repair` writes under the mutation lease and must not memoise
         * across its own invalidation.
         */
        const progressProjection = repair
            ? await services_1.services.taskGraphExecutionService.reconcileGoalProgress(changePath)
            : await services_1.services.taskGraphExecutionService.withValidationScope(() => services_1.services.taskGraphExecutionService.inspectGoalProgress(changePath));
        const report = await services_1.services.taskGraphExecutionService.getReport(changePath);
        this.printStatus(report, progressProjection);
        if (!repair && !this.brief) {
            // Keeps `--repair` discoverable now that the default path no longer
            // reconciles on the user's behalf, and -- FIX-2 / D16 -- says
            // whether a repair is actually pending instead of printing an
            // unconditional note that carries no signal. Suppressed under
            // `--brief`, whose output is parsed by controller loops.
            const repairPending = progressProjection.graphChanged
                || progressProjection.tasksChanged
                || progressProjection.projectionChanged;
            this.info(repairPending
                ? 'Progress projection computed read-only, and a repair IS pending. Re-run with --repair to reconcile and repair the task graph.'
                : 'Progress projection computed read-only; nothing needs repair. Re-run with --repair to reconcile anyway.');
        }
    }
    async bootstrap(inputPath) {
        const changePath = await this.resolveGoalChangePath(inputPath, 'bootstrap');
        const result = await services_1.services.taskGraphExecutionService.bootstrap(changePath);
        this.printBootstrap(result);
    }
    async handoff(args) {
        const parsed = this.parseHandoffArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'handoff');
        const result = await services_1.services.taskGraphExecutionService.handoff(changePath, {
            target: parsed.target,
        });
        this.printHandoff(result);
    }
    async preflight(args) {
        const parsed = this.parseDocumentReviewArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'preflight');
        const result = await services_1.services.taskGraphExecutionService.reviewDocument(changePath, {
            stage: parsed.stage,
            force: parsed.force,
        });
        this.printDocumentReview(result);
    }
    async next(inputPath) {
        const changePath = await this.resolveGoalChangePath(inputPath, 'next');
        const report = await services_1.services.taskGraphExecutionService.getReport(changePath);
        this.printNext(report);
    }
    async route(inputPath) {
        const changePath = await this.resolveGoalChangePath(inputPath, 'route');
        const result = await services_1.services.taskGraphExecutionService.routeWorkflow(changePath);
        this.printWorkflowRoute(result);
    }
    async workspace(inputPath) {
        const changePath = await this.resolveGoalChangePath(inputPath, 'workspace');
        const result = await services_1.services.taskGraphExecutionService.inspectWorkspace(changePath);
        this.printWorkspace(result);
    }
    async worktree(args) {
        const parsed = this.parseWorktreeArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'worktree');
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
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'finish');
        const result = await services_1.services.taskGraphExecutionService.planFinish(changePath, {
            targetBranch: parsed.targetBranch,
            remote: parsed.remote,
        });
        this.printFinish(result);
    }
    async dispatch(args) {
        const parsed = this.parseDispatchArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'dispatch');
        const result = await services_1.services.taskGraphExecutionService.dispatch(changePath, {
            taskId: parsed.taskId,
            limit: parsed.limit,
        });
        this.printDispatch(result);
    }
    async launch(args) {
        const parsed = this.parseLaunchArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'launch');
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
    async collect(args) {
        const parsed = this.parseCollectArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'collect');
        const result = await services_1.services.taskGraphExecutionService.collectWorkerRun(changePath, {
            taskId: parsed.taskId,
            runId: parsed.runId,
            status: parsed.status,
            summary: this.pruneEvidenceText('collect', parsed.summary),
        });
        this.printCollect(result);
    }
    async retry(args) {
        const parsed = this.parseRetryArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'retry');
        const result = await services_1.services.taskGraphExecutionService.retryWorkerRun(changePath, {
            taskId: parsed.taskId,
            runId: parsed.runId,
            summary: this.pruneEvidenceText('retry', parsed.summary),
            force: parsed.force,
        });
        this.printRetry(result);
    }
    async complete(args) {
        const parsed = this.parseCompleteArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'complete');
        // The JSON report, when present, is the authority for status and
        // summary. The hand-written Markdown path still works untouched when
        // --report-file is absent.
        const report = parsed.reportFile
            ? (0, structuredReports_1.parseWorkerReport)(await fs_2.promises.readFile(path.resolve(process.cwd(), parsed.reportFile), 'utf8'), path.resolve(process.cwd(), parsed.reportFile))
            : undefined;
        const result = await services_1.services.taskGraphExecutionService.complete(changePath, parsed.taskId, {
            status: report ? this.normalizeCompletionStatus(report.status) : parsed.status,
            // F1/F2 x F3: the report is the authority for WHICH summary is
            // recorded; F3's budget still bounds WHAT lands in the record, so a
            // --report-file is not a way around it. At stock settings this is a
            // no-op on the report path -- the schema caps `summary` at 2000
            // characters, below the 5120 prose cap -- but the two are
            // independently configurable and the record must stay bounded
            // whichever source filled it.
            summary: this.pruneEvidenceText('complete', report ? report.summary : parsed.summary),
            usageFile: parsed.usageFile,
            dispatchId: parsed.dispatchId,
            report,
        });
        this.printCompletion(result);
    }
    async sync(inputPath) {
        const changePath = await this.resolveGoalChangePath(inputPath, 'sync');
        const result = await services_1.services.taskGraphExecutionService.syncWorkerStatus(changePath);
        const bootstrap = await services_1.services.taskGraphExecutionService.bootstrap(changePath);
        let sessionBriefPath = null;
        let sessionWarning = null;
        try {
            const session = await new SessionCommand_1.SessionCommand().writeSessionBrief(bootstrap.projectRoot);
            sessionBriefPath = session.artifactPath;
        }
        catch (error) {
            sessionWarning = `Project session brief was not refreshed: ${error?.message || error}`;
        }
        this.printSync(result, bootstrap, sessionBriefPath, sessionWarning);
    }
    async review(args) {
        const parsed = this.parseReviewArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'review');
        if (await services_1.services.loopService.exists(changePath)) {
            const loopConfig = await services_1.services.loopService.readConfig(changePath);
            if (loopConfig.executionModel === 'controller') {
                throw new Error('Controller-mode task and final reviews must be issued by "ospec loop tick [change-path]" so the review dispatch is atomically bound to a real executor lifecycle. Manual "ospec execute review" would create unverifiable evidence.');
            }
        }
        const result = await services_1.services.taskGraphExecutionService.review(changePath, {
            stage: parsed.stage,
            taskId: parsed.taskId,
        });
        this.printReview(result);
    }
    async feedback(args) {
        const parsed = this.parseReviewFeedbackArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'feedback');
        const result = await services_1.services.taskGraphExecutionService.planReviewFeedback(changePath, {
            stage: parsed.stage,
            summary: this.pruneEvidenceText('feedback', parsed.summary),
        });
        this.printReviewFeedback(result);
    }
    async repair(args) {
        if (args.length > 1 || args[0]?.startsWith('--')) {
            throw new Error(`Unexpected execute repair argument: ${args.find(arg => arg.startsWith('--')) || args[1]}`);
        }
        const changePath = await this.resolveGoalChangePath(args[0], 'repair');
        const result = await services_1.services.taskGraphExecutionService.createRepairWave(changePath);
        this.printRepairWave(result);
    }
    /**
     * F2: settle an issued review from a validated JSON decision file.
     *
     * The Markdown path is untouched: a reviewer may still edit the artifact's
     * frontmatter by hand. This is the structured alternative, and it also
     * writes the sibling `*.findings.json`, which is what stops the review
     * gates falling back to Markdown parsing and stamping every finding
     * `severity: unknown` (which they treat as blocking).
     */
    async reviewDecision(args) {
        let inputPath;
        let reviewPath;
        let decisionFile;
        const takeValue = (flag, index) => {
            const value = args[index + 1];
            if (!value || value.startsWith('--'))
                throw new Error(`Execute review-decision requires a value after ${flag}.`);
            return value;
        };
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--review') {
                reviewPath = takeValue(arg, index);
                index += 1;
                continue;
            }
            if (arg.startsWith('--review=')) {
                reviewPath = arg.slice('--review='.length);
                continue;
            }
            if (arg === '--decision-file') {
                decisionFile = takeValue(arg, index);
                index += 1;
                continue;
            }
            if (arg.startsWith('--decision-file=')) {
                decisionFile = arg.slice('--decision-file='.length);
                continue;
            }
            if (arg.startsWith('--'))
                throw new Error(`Unknown execute review-decision flag: ${arg}`);
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute review-decision argument: ${arg}`);
        }
        if (!decisionFile)
            throw new Error('Execute review-decision requires --decision-file <json>.');
        if (!reviewPath)
            throw new Error('Execute review-decision requires --review <path-to-review.md>, the expectedEvidencePath from the review action.');
        const changePath = await this.resolveGoalChangePath(inputPath, 'review-decision');
        const decisionPath = path.resolve(process.cwd(), decisionFile);
        const decision = (0, structuredReports_1.parseReviewDecision)(await fs_2.promises.readFile(decisionPath, 'utf8'), decisionPath);
        const result = await services_1.services.taskGraphExecutionService.recordReviewDecision(changePath, {
            reviewArtifactPath: reviewPath,
            decision,
        });
        this.success(`Review decision recorded: ${result.decision} with ${result.findings} structured finding(s).`);
        console.log(`Review artifact: ${result.reviewArtifactPath}`);
        console.log(`Structured findings: ${result.findingsPath}`);
        console.log(`Next: ${result.nextInstruction}`);
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
            answeredBy: parsed.answeredBy,
        });
        this.printDecision(result);
    }
    /**
     * Phase 5 / F3. Evidence gets the same budget as console output.
     *
     * `execute verify --command` and its siblings take the raw output of a test
     * run in `--summary`; a failing suite pastes tens of thousands of characters
     * in, and every later reader of the evidence record pays for all of them.
     * The pruned value is still a plain string carrying the head, the notice and
     * the tail, so nothing about the evidence record's SHAPE changes here -- the
     * spill path travels inside the text, not in a new field.
     */
    pruneEvidenceText(label, text) {
        if (typeof text !== 'string' || !text)
            return text;
        return (0, outputBudget_1.pruneTextWithSpill)(text, { commandLabel: `execute-${label}` }).text;
    }
    async verify(args) {
        const parsed = this.parseVerificationArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'verify');
        const result = await services_1.services.taskGraphExecutionService.recordVerification(changePath, {
            command: parsed.command,
            status: parsed.status,
            exitCode: parsed.exitCode,
            timedOut: parsed.timedOut,
            signal: parsed.signal,
            infraFailure: parsed.infraFailure,
            summary: this.pruneEvidenceText('verify', parsed.summary),
            satisfies: parsed.satisfies,
            loopActionId: parsed.loopActionId,
            loopActionItemId: parsed.loopActionItemId,
            executorId: parsed.executorId,
        });
        this.printVerificationEvidence(result);
    }
    async requireVerification(args) {
        const parsed = this.parseVerificationRequirementArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'require-verification');
        const result = await services_1.services.taskGraphExecutionService.requireVerification(changePath, parsed);
        this.printVerificationRequirement(result);
    }
    async tdd(args) {
        const parsed = this.parseTddArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'tdd');
        const result = await services_1.services.taskGraphExecutionService.recordTddEvidence(changePath, {
            phase: parsed.phase,
            command: parsed.command,
            status: parsed.status,
            exitCode: parsed.exitCode,
            timedOut: parsed.timedOut,
            signal: parsed.signal,
            infraFailure: parsed.infraFailure,
            testName: parsed.testName,
            summary: this.pruneEvidenceText('tdd', parsed.summary),
        });
        this.printTddEvidence(result);
    }
    async debug(args) {
        const parsed = this.parseDebugArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'debug');
        const result = await services_1.services.taskGraphExecutionService.recordDebugEvidence(changePath, {
            phase: parsed.phase,
            symptom: parsed.symptom,
            hypothesis: parsed.hypothesis,
            rootCause: parsed.rootCause,
            command: parsed.command,
            status: parsed.status,
            summary: this.pruneEvidenceText('debug', parsed.summary),
        });
        this.printDebugEvidence(result);
    }
    async deferBlocker(args) {
        const parsed = this.parseDeferBlockerArgs(args);
        const changePath = await this.resolveGoalChangePath(parsed.inputPath, 'defer-blocker');
        const result = await services_1.services.taskGraphExecutionService.deferExternalBlocker(changePath, parsed.taskId, {
            reason: parsed.reason,
        });
        this.success(`Deferred external acceptance for ${result.taskId} to final review.`);
        this.info(`  blocker: ${result.recordPath}`);
        this.info('  task remains BLOCKED and final verification/archive remain gated');
    }
    async resolveGoalChangePath(inputPath, action) {
        const changePath = await this.resolveChangePath(inputPath);
        const statePath = path.join(changePath, constants_1.FILE_NAMES.STATE);
        if (!(0, fs_1.existsSync)(statePath)) {
            return changePath;
        }
        const state = await services_1.services.fileService.readJSON(statePath);
        const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(changePath, state);
        if (workflowProfile === WorkflowProfile_1.CHANGE_WORKFLOW_PROFILE) {
            const relativePath = inputPath || changePath;
            throw new Error(`ospec execute ${action} is Goal-only and cannot run for workflow_profile_id=change. `
                + `Continue the classic Change with "ospec progress ${relativePath}", `
                + `top-level "ospec verify ${relativePath}", and "ospec finalize ${relativePath}". `
                + 'Use "ospec execute decision" only when this Change needs a durable user choice.');
        }
        return changePath;
    }
    async resolveChangePath(inputPath) {
        const cwd = process.cwd();
        const config = await services_1.services.configManager.loadConfigOrNull(cwd);
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
        const projectConfig = await services_1.services.configManager.loadConfigOrNull(resolvedCandidatePath);
        return (0, ProjectLayout_1.resolveManagedPath)(resolvedCandidatePath, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, projectConfig);
    }
    printStatus(report, progressProjection) {
        const scheduling = report.scheduling || {
            graphSafeCount: report.dispatchableTasks.length,
            serialWithoutReason: [],
            deferred: [],
        };
        if (this.brief) {
            const d = report.dispatchableTasks.map(task => task.id).join(', ') || 'none';
            console.log(`graph=${report.graphStatus} tasks=${report.taskCount} ready=${report.readyTasks.length} dispatchable=${report.dispatchableTasks.length} running=${report.runningTasks.length} blocked=${report.blockedTasks.length} completed=${report.completedTasks.length}`);
            console.log(`graphSafe=${scheduling.graphSafeCount} serialReasonMissing=${scheduling.serialWithoutReason.join(',') || 'none'} deferred=${scheduling.deferred.length}`);
            if (report.decisions) {
                console.log(`pendingRequiredDecisions=${report.decisions.pendingRequired}`);
            }
            if (progressProjection) {
                console.log(`progressProjection=${progressProjection.status} accepted=${progressProjection.checkedTaskIds.length}/${report.taskCount} reviewRepairs=${progressProjection.reviewDecisionsRepaired.length}`);
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
        if (progressProjection) {
            console.log(`Progress projection: ${progressProjection.status}`);
            console.log(`Accepted tasks projected: ${progressProjection.checkedTaskIds.length}/${report.taskCount}`);
            console.log(`Raw graph review repairs: ${progressProjection.reviewDecisionsRepaired.length}`);
            console.log(`Unmatched accepted task IDs: ${progressProjection.unmatchedAcceptedTaskIds.length}`);
            // FIX-2 / D4: `status: blocked` on its own never said *what* was
            // unreconcilable, so the user had to run `--repair` to find out.
            for (const issue of progressProjection.issues)
                console.log(`Progress projection issue: ${issue}`);
        }
        console.log(`Graph-safe batch: ${scheduling.graphSafeCount}`);
        console.log(`Serial reason missing: ${scheduling.serialWithoutReason.join(', ') || 'none'}`);
        if (report.decisions) {
            console.log(`Pending required decisions: ${report.decisions.pendingRequired}`);
            console.log(`Pending optional decisions: ${report.decisions.pendingOptional}`);
        }
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
    printBootstrap(result) {
        if (this.brief) {
            console.log(`status=${result.status}${result.blockers.length > 0 ? ` blockers=${result.blockers.length}` : ''}`);
            for (const blocker of result.blockers) {
                console.log(`- ${blocker}`);
            }
            console.log(`next: ${result.nextInstruction}`);
            return;
        }
        console.log('\nGoal Bootstrap Snapshot');
        console.log('=========================\n');
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
        console.log('\nPlanning Preflight');
        console.log('==================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Stage: ${result.dispatch.stage}`);
        console.log(`Document: ${result.dispatch.documentPath}`);
        console.log(`Document readiness: ${result.dispatch.documentReadiness}`);
        console.log('Runtime adapter: inline deterministic checks');
        console.log(`Reused approval: ${result.reused ? 'yes' : 'no'}`);
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
            if (!task.parallelizable)
                console.log(`  Serial reason: ${task.serialReason || 'missing (planning warning)'}`);
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
        console.log('\nRuntime Adapter Launch Plan');
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
            console.log('\nController commands:');
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
    printSync(result, bootstrap, sessionBriefPath, warning) {
        console.log('\nGoal State Synchronized');
        console.log('=======================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Session: ${result.sessionPath}`);
        console.log(`Graph: ${result.graphPath}`);
        console.log(`Worker status: ${result.workerStatusPath}`);
        console.log(`Implementer: ${result.implementerStatus}`);
        console.log(`Spec reviewer: ${result.specReviewerStatus}`);
        console.log(`Quality reviewer: ${result.qualityReviewerStatus}`);
        console.log(`Controller: ${result.controllerStatus}`);
        console.log(`Verification checklist complete: ${result.verificationChecklistComplete ? 'yes' : 'no'}`);
        console.log(`Progress projection: ${result.progressProjection.status}`);
        console.log(`Accepted tasks projected: ${result.progressProjection.checkedTaskIds.length}`);
        console.log(`Raw graph review repairs: ${result.progressProjection.reviewDecisionsRepaired.length}`);
        if (bootstrap) {
            console.log(`Feature state: ${bootstrap.status}`);
            console.log(`Bootstrap: ${bootstrap.artifactPath}`);
        }
        if (sessionBriefPath)
            console.log(`Session brief: ${sessionBriefPath}`);
        if (warning)
            console.log(`Warning: ${warning}`);
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
        if (result.record.satisfies?.length) {
            console.log(`Satisfies: ${result.record.satisfies.join(', ')}`);
        }
        if (result.record.exitCode !== null) {
            console.log(`Exit code: ${result.record.exitCode}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printVerificationRequirement(result) {
        console.log('\nVerification Requirement Recorded');
        console.log('=================================\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Requirement: ${result.requirement.id}`);
        console.log(`Kind: ${result.requirement.kind}`);
        console.log(`Required: ${result.requirement.required ? 'yes' : 'no'}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Pending required evidence: ${result.status.pending.join(', ') || 'none'}`);
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
                    ? `ospec execute decision ${changeArg} --id ${this.quoteCommandArg(pendingDecision.id)} --select <option-id> --answered-by user`
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
                    command: `ospec loop tick ${changeArg}`,
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
    /**
     * See `utils/ShellQuote`. A fourth copy of the rule, with the same two
     * defects as `BrainstormCommand`'s: only `"` escaped, and `\` in the raw
     * fast path so Windows paths were emitted unquoted.
     */
    quoteCommandArg(value) {
        return (0, ShellQuote_1.quoteShellArg)(value);
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
    parseLaunchArgs(args) {
        let inputPath;
        let taskId;
        let target;
        let dryRun = false;
        let json = false;
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
            if (arg === '--run' || arg.startsWith('--run=')) {
                throw new Error('Execute launch --run was removed. Use the launch artifact nativeSubagent contract with the current model harness.');
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
        if (primitive !== undefined && !['subagent', 'goal', 'loop'].includes(primitive.trim().toLowerCase())) {
            throw new Error(`Execute launch --primitive must be one of subagent, goal, loop (received ${primitive}).`);
        }
        return { inputPath, taskId, target, dryRun, json, primitive, until, maxIterations, interval };
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
        let force = false;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--stage') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute preflight requires a value after --stage.');
                }
                stage = this.normalizeDocumentReviewStage(value);
                index += 1;
                continue;
            }
            if (arg.startsWith('--stage=')) {
                stage = this.normalizeDocumentReviewStage(arg.slice('--stage='.length));
                continue;
            }
            if (arg === '--force') {
                force = true;
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute preflight flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute preflight argument: ${arg}`);
        }
        return { inputPath, stage, force };
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
        let dispatchId;
        let reportFile;
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
            if (arg === '--report-file') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute complete requires a value after --report-file.');
                }
                reportFile = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--report-file=')) {
                reportFile = arg.slice('--report-file='.length);
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
            if (arg === '--dispatch') {
                const value = args[index + 1];
                if (!value || value.startsWith('--'))
                    throw new Error('Execute complete requires a value after --dispatch.');
                dispatchId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--dispatch=')) {
                dispatchId = arg.slice('--dispatch='.length).trim();
                if (!dispatchId)
                    throw new Error('Execute complete requires a non-empty --dispatch id.');
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
        if (reportFile && (status !== undefined || summary !== undefined)) {
            // Two sources of truth for the same field is exactly the ambiguity
            // the structured report exists to remove, so name both instead of
            // picking one silently.
            throw new Error(`Execute complete received --report-file ${reportFile} and also ${status !== undefined ? '--status' : '--summary'}. The report file already carries status and summary; drop the flag or drop the file.`);
        }
        return { taskId, inputPath, status, summary, usageFile, dispatchId, reportFile };
    }
    parseDeferBlockerArgs(args) {
        let taskId;
        let inputPath;
        let reason;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--reason') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute defer-blocker requires a value after --reason.');
                }
                reason = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--reason=')) {
                reason = arg.slice('--reason='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown execute defer-blocker flag: ${arg}`);
            }
            if (!taskId) {
                taskId = arg;
                continue;
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute defer-blocker argument: ${arg}`);
        }
        if (!taskId)
            throw new Error('Execute defer-blocker requires a task id.');
        if (!reason?.trim())
            throw new Error('Execute defer-blocker requires --reason.');
        return { taskId, inputPath, reason: reason.trim() };
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
            if (arg === '--run' || arg.startsWith('--run=')) {
                throw new Error('Execute review --run was removed. Dispatch the review packet through a fresh model-native subagent.');
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
        return { inputPath, stage, taskId };
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
        let answeredBy;
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
            if (arg === '--answered-by') {
                const value = args[index + 1];
                if (value !== 'user')
                    throw new Error('Execute decision --answered-by must be user.');
                answeredBy = 'user';
                index += 1;
                continue;
            }
            if (arg.startsWith('--answered-by=')) {
                const value = arg.slice('--answered-by='.length).trim();
                if (value !== 'user')
                    throw new Error('Execute decision --answered-by must be user.');
                answeredBy = 'user';
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
            answeredBy,
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
        // F5: read before the loop so the loop only has to skip these tokens.
        const signal = this.parseOutcomeFlag(args, '--signal', 'verify');
        const timedOut = args.includes('--timed-out');
        const infraFailure = args.includes('--infra-failure');
        let summary;
        const satisfies = [];
        let loopActionId;
        let loopActionItemId;
        let executorId;
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
            if (arg === '--satisfies') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Execute verify requires a value after --satisfies.');
                }
                satisfies.push(value.trim());
                index += 1;
                continue;
            }
            if (arg.startsWith('--satisfies=')) {
                satisfies.push(arg.slice('--satisfies='.length).trim());
                continue;
            }
            if (arg === '--loop-action' || arg === '--action-item' || arg === '--executor') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error(`Execute verify requires a value after ${arg}.`);
                }
                if (arg === '--loop-action')
                    loopActionId = value;
                else if (arg === '--action-item')
                    loopActionItemId = value;
                else
                    executorId = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--loop-action=')) {
                loopActionId = arg.slice('--loop-action='.length).trim();
                continue;
            }
            if (arg.startsWith('--action-item=')) {
                loopActionItemId = arg.slice('--action-item='.length).trim();
                continue;
            }
            if (arg.startsWith('--executor=')) {
                executorId = arg.slice('--executor='.length).trim();
                continue;
            }
            if (arg === '--timed-out' || arg === '--infra-failure') {
                continue;
            }
            if (arg === '--signal') {
                index += 1;
                continue;
            }
            if (arg.startsWith('--signal=')) {
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
        const loopValues = [loopActionId, loopActionItemId, executorId];
        if (loopValues.some(value => value !== undefined) && loopValues.some(value => !value?.trim())) {
            throw new Error('Execute verify requires --loop-action, --action-item, and --executor together.');
        }
        return { inputPath, command, status, exitCode, timedOut, signal, infraFailure, summary, satisfies, loopActionId, loopActionItemId, executorId };
    }
    parseVerificationRequirementArgs(args) {
        let inputPath;
        let id = '';
        let kind;
        let description = '';
        let required;
        const takeValue = (index, flag) => {
            const value = args[index + 1];
            if (!value || value.startsWith('--'))
                throw new Error(`Execute require-verification requires a value after ${flag}.`);
            return value.trim();
        };
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--id') {
                id = takeValue(index, arg);
                index += 1;
                continue;
            }
            if (arg.startsWith('--id=')) {
                id = arg.slice('--id='.length).trim();
                continue;
            }
            if (arg === '--kind') {
                kind = this.normalizeVerificationRequirementKind(takeValue(index, arg));
                index += 1;
                continue;
            }
            if (arg.startsWith('--kind=')) {
                kind = this.normalizeVerificationRequirementKind(arg.slice('--kind='.length));
                continue;
            }
            if (arg === '--description') {
                description = takeValue(index, arg);
                index += 1;
                continue;
            }
            if (arg.startsWith('--description=')) {
                description = arg.slice('--description='.length).trim();
                continue;
            }
            if (arg === '--required') {
                required = true;
                continue;
            }
            if (arg === '--optional') {
                required = false;
                continue;
            }
            if (arg.startsWith('--'))
                throw new Error(`Unknown execute require-verification flag: ${arg}`);
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected execute require-verification argument: ${arg}`);
        }
        if (!id)
            throw new Error('Execute require-verification requires --id.');
        if (!description)
            throw new Error('Execute require-verification requires --description.');
        return { inputPath, id, kind, description, required };
    }
    parseTddArgs(args) {
        let inputPath;
        let phase;
        let command;
        let status;
        let exitCode;
        // F5: read before the loop so the loop only has to skip these tokens.
        const signal = this.parseOutcomeFlag(args, '--signal', 'tdd');
        const timedOut = args.includes('--timed-out');
        const infraFailure = args.includes('--infra-failure');
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
            if (arg === '--timed-out' || arg === '--infra-failure') {
                continue;
            }
            if (arg === '--signal') {
                index += 1;
                continue;
            }
            if (arg.startsWith('--signal=')) {
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
        return { inputPath, phase, command, status, exitCode, timedOut, signal, infraFailure, testName, summary };
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
    normalizeDocumentReviewStage(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'design' || normalized === 'plan') {
            return normalized;
        }
        throw new Error(`Unsupported execute preflight stage: ${value}`);
    }
    normalizeHandoffTarget(value) {
        const normalized = value.trim().toLowerCase();
        // M-cfg5: `grok` was missing here while the help for both `ospec
        // execute handoff` and `ospec execute launch` documented it.
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'grok' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported execute handoff target: ${value}`);
    }
    normalizeWorkerToolTarget(value) {
        const normalized = value.trim().toLowerCase();
        // M-cfg5: `grok` was missing here while the help for both `ospec
        // execute handoff` and `ospec execute launch` documented it.
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'grok' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
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
    normalizeVerificationRequirementKind(value) {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'browser' || normalized === 'e2e' || normalized === 'test' || normalized === 'lint'
            || normalized === 'build' || normalized === 'manual' || normalized === 'other') {
            return normalized;
        }
        throw new Error(`Unsupported verification requirement kind: ${value}`);
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
    /**
     * F5: any integer, including negative ones. The `>= 0` guard this replaces
     * rejected the codes a harness actually produces for "the child never ran"
     * (-1 by convention, and Node reports a signalled child with a negative
     * code on some platforms), which forced callers to launder an
     * infrastructure fault into a plain `1` and lose the distinction the four
     * orthogonal fields exist to preserve.
     */
    normalizeExitCode(value) {
        const exitCode = Number(value);
        if (Number.isInteger(exitCode)) {
            return exitCode;
        }
        throw new Error(`Unsupported execute verify exit code: ${value} (an integer is required; negative codes are allowed).`);
    }
    /** F5: shared parse for the boolean/signal outcome flags on verify and tdd. */
    parseOutcomeFlag(args, flag, label) {
        for (let index = 0; index < args.length; index += 1) {
            if (args[index] === flag) {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error(`Execute ${label} requires a value after ${flag}.`);
                }
                return value.trim();
            }
            if (args[index].startsWith(`${flag}=`)) {
                return args[index].slice(`${flag}=`.length).trim();
            }
        }
        return undefined;
    }
}
exports.ExecuteCommand = ExecuteCommand;
