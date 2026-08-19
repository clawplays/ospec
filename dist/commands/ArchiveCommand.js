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
exports.ArchiveCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const ArchiveGate_1 = require("../workflow/ArchiveGate");
const WorkflowComposer_1 = require("../workflow/WorkflowComposer");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const ReviewArtifacts_1 = require("../utils/ReviewArtifacts");
const ChecklistScan_1 = require("../utils/ChecklistScan");
/**
 * S7: how many `validateTaskReviewEvidence` calls `archive --check` runs at
 * once.
 *
 * Every call ends in a `git rev-parse HEAD` spawn plus a read-and-hash of the
 * task's target files, and the old serial loop paid that latency once per task:
 * a 15-task goal spent most of its wall clock waiting on ~33 child processes
 * that never needed to wait for each other. The calls are read-only, so the
 * only reason not to run all of them at once is that an unbounded fan-out on a
 * large goal would spawn a git process per task simultaneously.
 */
const EVIDENCE_VALIDATION_CONCURRENCY = 8;
/** Runs `worker` over `items` with at most `limit` in flight, preserving order. */
async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(runners);
    return results;
}
class ArchiveCommand extends BaseCommand_1.BaseCommand {
    /**
     * `BaseCommand.execute` is declared `Promise<void>` for every command, so
     * this one stays void-returning rather than loosening that contract for a
     * single subclass. `run` is the method with the verdict, and it is what
     * `cli.ts` and every embedder should call.
     */
    async execute(featurePath, options = {}) {
        await this.run(featurePath, options);
    }
    async run(featurePath, options = {}) {
        /*
         * FIX-2 / D4: the read-only goal-progress inspection restored below
         * reads the graph, the checklist and every task's review artifact, and
         * it has to run BEFORE the gate so the dry run fails where
         * `ospec archive` fails. Run outside a validation scope it costs far
         * more than it looks: measured on the 15-task hot-path fixture, the
         * readiness sweep that follows went from 8 `git rev-parse HEAD` spawns
         * to 23, and 173 ms to 1031 ms, because the unscoped inspection leaves
         * nothing for the sweep's scope to reuse. Sharing one scope with the
         * sweep costs 1 spawn and 119 ms -- better than before the inspection
         * existed.
         *
         * The scope is opened ONLY on the read-only path. `--repair` and the
         * real archive take the task-graph mutation lease and write, and a
         * scope that memoises HEAD across those writes would be memoising over
         * its own invalidation. (FIX-5 / MN-8: this said "HEAD and the cache
         * file"; FIX-3 deleted the cache file out from under the sentence.)
         */
        const readOnly = options.checkOnly === true && options.repair !== true;
        return readOnly
            ? services_1.services.taskGraphExecutionService.withValidationScope(() => this.runWithin(featurePath, options))
            : this.runWithin(featurePath, options);
    }
    async runWithin(featurePath, options = {}) {
        try {
            const rawTargetPath = featurePath && !path.isAbsolute(featurePath)
                ? (0, ProjectLayout_1.resolveManagedInputPath)(process.cwd(), featurePath, await services_1.services.configManager.loadConfigOrNull(process.cwd()))
                : path.resolve(featurePath || process.cwd());
            const checkOnly = options.checkOnly === true;
            const repair = options.repair === true;
            const projectRoot = await this.findProjectRoot(rawTargetPath);
            const config = await services_1.services.configManager.loadConfig(projectRoot);
            const targetPath = (0, ProjectLayout_1.resolveManagedInputPath)(projectRoot, path.relative(projectRoot, rawTargetPath), config);
            this.logger.info(`${checkOnly ? 'Checking archive readiness' : 'Archiving change'} at ${targetPath}`);
            const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
            const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
            const designPath = path.join(targetPath, constants_1.FILE_NAMES.DESIGN);
            const implementationPlanPath = path.join(targetPath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN);
            const taskGraphPath = path.join(targetPath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.TASK_GRAPH);
            const agentWorkerStatusPath = path.join(targetPath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
            const tasksPath = path.join(targetPath, constants_1.FILE_NAMES.TASKS);
            const verificationPath = path.join(targetPath, constants_1.FILE_NAMES.VERIFICATION);
            const expectedParent = (0, ProjectLayout_1.resolveManagedInputPath)(projectRoot, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}`, config);
            if (path.dirname(targetPath) !== expectedParent) {
                throw new Error('Archive target must be a change directory under changes/active.');
            }
            if (!(await services_1.services.fileService.exists(statePath))) {
                throw new Error('Change state file not found.');
            }
            let featureState = await services_1.services.fileService.readJSON(statePath);
            const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(targetPath, featureState);
            const isGoalWorkflow = workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE;
            const classicStatus = !isGoalWorkflow
                ? await services_1.services.projectService.getActiveChangeStatusItem(targetPath)
                : null;
            if (classicStatus?.closeoutState) {
                featureState = classicStatus.closeoutState;
            }
            /*
             * S7 / P1: `reconcileGoalProgress` takes the task-graph MUTATION
             * lease and rewrites the graph, the checklist and the progress
             * projection. Running it from `archive --check` -- a command whose
             * whole contract is "never moves files" -- meant a readiness probe
             * could rewrite the goal underneath a live controller tick that
             * legitimately held the lease. The repair is now opt-in.
             *
             * Nothing becomes unreachable: the real `ospec archive` still
             * reconciles before it moves anything, so an unreconcilable goal
             * still cannot be archived; `--repair` restores the old behaviour
             * for the check; and `ospec execute repair` remains available.
             */
            const reconcileProgress = isGoalWorkflow && (!checkOnly || repair);
            /*
             * FIX-2 / D4: the read-only check still has to be a faithful dry
             * run of `ospec archive`. Skipping the reconciliation skipped its
             * *diagnostic* too, so a goal carrying an unreconcilable checklist
             * -- a stray `task-999` line, a duplicate checked line, an accepted
             * task with no checklist line -- passed `--check` and was then
             * refused by the real archive. `inspectGoalProgress` runs the same
             * computation without the mutation lease and without writing, so
             * the failure is raised at the same point and with the same message
             * and severity it had before the command went read-only.
             */
            let progressInspection = null;
            if (reconcileProgress) {
                const progressProjection = await services_1.services.taskGraphExecutionService.reconcileGoalProgress(targetPath);
                if (progressProjection.status === 'blocked') {
                    throw new Error(`Goal progress cannot be reconciled before archive: ${progressProjection.issues.join('; ')}`);
                }
            }
            else if (isGoalWorkflow) {
                progressInspection = await services_1.services.taskGraphExecutionService.inspectGoalProgress(targetPath);
                if (progressInspection.status === 'blocked') {
                    throw new Error(`Goal progress cannot be reconciled before archive: ${progressInspection.issues.join('; ')}`);
                }
            }
            /*
             * FIX-5 / MJ-2+M2: the gate below runs against the state
             * `ospec archive` would have gated on.
             *
             * The real command reconciles first and then gates on the REPAIRED
             * tree; the read-only check may not repair, so it serves the
             * repaired bytes through a read overlay instead. The overlay is
             * empty on the reconciling paths (`--repair` and the real archive
             * already wrote them) and empty when nothing needs repairing, so
             * this is a no-op except in exactly the states that used to
             * diverge. See `FileService.withReadOverlay`.
             */
            const result = await services_1.services.fileService.withReadOverlay(progressInspection?.repairedArtifacts ?? [], () => this.evaluateArchiveReadiness({
                targetPath,
                config,
                featureState,
                isGoalWorkflow,
                classicStatus,
                paths: {
                    proposalPath,
                    designPath,
                    implementationPlanPath,
                    taskGraphPath,
                    agentWorkerStatusPath,
                    tasksPath,
                    verificationPath,
                },
            }));
            console.log('\nArchive Gate Check:');
            console.log('===================\n');
            for (const check of result.checks) {
                const icon = check.passed ? 'PASS' : 'FAIL';
                console.log(`${icon} ${check.name}`);
                console.log(`  ${check.message}\n`);
            }
            if (isGoalWorkflow && !reconcileProgress) {
                /*
                 * FIX-2 / D16: the note used to print on every `--check`
                 * whether or not anything needed repairing, so it never said
                 * "there IS something to repair" -- which is what made the lost
                 * diagnostic quiet. The read-only inspection already knows
                 * exactly which of the three artifacts a `--repair` run would
                 * rewrite, so say so.
                 */
                const pendingRepairs = [
                    progressInspection?.graphChanged ? 'the task graph (review decisions out of sync with the review artifacts)' : null,
                    progressInspection?.tasksChanged ? 'the tasks.md checklist (checkboxes out of sync with the graph)' : null,
                    progressInspection?.projectionChanged ? 'the progress projection artifact' : null,
                ].filter((entry) => entry !== null);
                if (pendingRepairs.length > 0) {
                    console.log('Note: goal progress reconciliation was skipped because --check is read-only, and a repair IS pending for:');
                    for (const entry of pendingRepairs)
                        console.log(`  - ${entry}`);
                    console.log('  Re-run with --repair to reconcile and repair the task graph, or run ospec execute repair.\n');
                }
                else {
                    console.log('Note: goal progress reconciliation was skipped because --check is read-only; nothing needs repair.');
                    console.log('  Re-run with --repair to reconcile anyway, or run ospec execute repair.\n');
                }
            }
            if (result.blockers.length > 0) {
                console.log('Blockers:');
                result.blockers.forEach(blocker => {
                    console.log(`  - ${blocker}`);
                });
                console.log();
            }
            if (result.warnings.length > 0) {
                console.log('Warnings:');
                result.warnings.forEach(warning => {
                    console.log(`  - ${warning}`);
                });
                console.log();
            }
            console.log('='.repeat(21) + '\n');
            if (result.canArchive) {
                if (checkOnly) {
                    this.success('Change is ready to archive');
                    return { status: 'ready', blockers: [] };
                }
                const archivePath = await this.performArchive(targetPath, projectRoot, featureState, config);
                this.success(`Change archived to ${archivePath}`);
                return { status: 'archived', archivePath, blockers: [] };
            }
            // M-misc2: was `process.exit(1)` here, on BOTH the real archive and
            // the read-only `--check`. The blockers have already been printed
            // above; carrying them out lets `cli.ts` choose the exit code and
            // lets an embedder see why.
            this.error('Change cannot be archived. Please resolve blockers.');
            return { status: 'blocked', blockers: [...result.blockers] };
        }
        catch (error) {
            this.error(`Archive check failed: ${error}`);
            throw error;
        }
    }
    /**
     * Every readiness gate, computed from the change on disk.
     *
     * Split out of `runWithin` so the whole gate -- not a hand-picked subset of
     * it -- can be run under `FileService.withReadOverlay`. Anything that reads
     * the task graph, the checklist or the progress projection through
     * `services.fileService` therefore sees the post-reconciliation state on
     * the read-only path, which is what `ospec archive` gates on.
     */
    async evaluateArchiveReadiness(inputs) {
        const { targetPath, config, featureState, isGoalWorkflow, classicStatus } = inputs;
        const { proposalPath, designPath, implementationPlanPath, taskGraphPath, agentWorkerStatusPath, tasksPath, verificationPath, } = inputs.paths;
        const workflow = new WorkflowComposer_1.WorkflowComposer(config);
        const proposal = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(proposalPath));
        const tasks = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(tasksPath));
        const verification = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(verificationPath));
        const flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];
        const activatedSteps = workflow.getActivatedSteps(flags);
        const tasksOptionalSteps = Array.isArray(tasks.data.optional_steps) ? tasks.data.optional_steps : [];
        const verificationOptionalSteps = Array.isArray(verification.data.optional_steps)
            ? verification.data.optional_steps
            : [];
        const passedOptionalSteps = Array.isArray(verification.data.passed_optional_steps)
            ? verification.data.passed_optional_steps
            : [];
        const configuredArchiveGate = config.workflow?.archive_gate || {
            require_verification: true,
            require_skill_update: true,
            require_index_regenerated: true,
            require_optional_steps_passed: true,
        };
        const archiveConfig = isGoalWorkflow
            ? configuredArchiveGate
            : {
                ...configuredArchiveGate,
                require_skill_update: false,
                require_index_regenerated: false,
            };
        const goalReviewSummary = isGoalWorkflow
            ? await (0, ReviewArtifacts_1.analyzeGoalReviewSummary)(services_1.services.fileService, targetPath)
            : null;
        const evidenceTracking = services_1.services.projectService.assessArchiveEvidenceTracking(targetPath);
        const result = await ArchiveGate_1.archiveGate.checkArchiveReadiness(featureState, archiveConfig, {
            activatedSteps,
            tasksOptionalSteps,
            verificationOptionalSteps,
            passedOptionalSteps,
            tasksComplete: !(0, ChecklistScan_1.hasUncheckedChecklistItem)(tasks.content),
            verificationComplete: !(0, ChecklistScan_1.hasUncheckedChecklistItem)(verification.content),
            proposalAcceptanceComplete: !(0, ChecklistScan_1.hasUncheckedChecklistItem)(proposal.content),
            goalReviewSummaryAligned: goalReviewSummary ? goalReviewSummary.aligned : null,
            goalReviewSummaryMessage: goalReviewSummary?.message ?? null,
        });
        if (evidenceTracking.level === 'block' && evidenceTracking.message) {
            result.blockers.push(evidenceTracking.message);
            result.checks.push({
                name: 'Archive Evidence Tracking',
                passed: false,
                message: evidenceTracking.message,
            });
        }
        if (classicStatus) {
            for (const check of classicStatus.checks) {
                if (check.name === 'archive.pending')
                    continue;
                if (!result.checks.some(item => item.name === check.name)) {
                    result.checks.push({
                        name: check.name,
                        passed: check.status !== 'fail',
                        message: check.message,
                    });
                }
                if (check.status === 'fail')
                    result.blockers.push(check.message);
                if (check.status === 'warn')
                    result.warnings.push(check.message);
            }
        }
        if (isGoalWorkflow) {
            const reviewArtifactSet = await (0, ReviewArtifacts_1.resolveGoalReviewArtifacts)(services_1.services.fileService, targetPath);
            if (!(await services_1.services.fileService.exists(designPath))) {
                result.blockers.push('design.md is required before archiving');
            }
            else {
                try {
                    const design = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(designPath));
                    const designOptionalSteps = Array.isArray(design.data.optional_steps)
                        ? design.data.optional_steps
                        : null;
                    const designCreatedValid = (typeof design.data.created === 'string' && design.data.created.trim().length > 0)
                        || (design.data.created instanceof Date && !Number.isNaN(design.data.created.getTime()));
                    const missingRequiredFields = [];
                    if (typeof design.data.feature !== 'string' || design.data.feature.trim().length === 0) {
                        missingRequiredFields.push('feature');
                    }
                    if (!designCreatedValid) {
                        missingRequiredFields.push('created');
                    }
                    if (!designOptionalSteps) {
                        missingRequiredFields.push('optional_steps');
                    }
                    if (missingRequiredFields.length > 0) {
                        result.blockers.push(`Missing or invalid required fields in design.md: ${missingRequiredFields.join(', ')}`);
                    }
                    if (designOptionalSteps) {
                        const missingDesignCoverage = activatedSteps.filter(step => !designOptionalSteps.includes(step));
                        if (missingDesignCoverage.length > 0) {
                            result.blockers.push(`Activated optional steps missing from design.md: ${missingDesignCoverage.join(', ')}`);
                        }
                    }
                }
                catch (error) {
                    result.blockers.push(`design.md frontmatter cannot be parsed: ${error.message || error}`);
                }
            }
            if (!(await services_1.services.fileService.exists(implementationPlanPath))) {
                result.blockers.push('implementation-plan.md is required before archiving');
            }
            else {
                try {
                    const implementationPlan = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(implementationPlanPath));
                    const planOptionalSteps = Array.isArray(implementationPlan.data.optional_steps)
                        ? implementationPlan.data.optional_steps
                        : null;
                    const planCreatedValid = (typeof implementationPlan.data.created === 'string' && implementationPlan.data.created.trim().length > 0)
                        || (implementationPlan.data.created instanceof Date && !Number.isNaN(implementationPlan.data.created.getTime()));
                    const missingRequiredFields = [];
                    if (typeof implementationPlan.data.feature !== 'string' || implementationPlan.data.feature.trim().length === 0) {
                        missingRequiredFields.push('feature');
                    }
                    if (!planCreatedValid) {
                        missingRequiredFields.push('created');
                    }
                    if (!planOptionalSteps) {
                        missingRequiredFields.push('optional_steps');
                    }
                    if (missingRequiredFields.length > 0) {
                        result.blockers.push(`Missing or invalid required fields in implementation-plan.md: ${missingRequiredFields.join(', ')}`);
                    }
                    if (planOptionalSteps) {
                        const missingPlanCoverage = activatedSteps.filter(step => !planOptionalSteps.includes(step));
                        if (missingPlanCoverage.length > 0) {
                            result.blockers.push(`Activated optional steps missing from implementation-plan.md: ${missingPlanCoverage.join(', ')}`);
                        }
                    }
                    if (!(0, ChecklistScan_1.hasChecklistItem)(implementationPlan.content)) {
                        result.blockers.push('implementation-plan.md must contain at least one checklist item');
                    }
                }
                catch (error) {
                    result.blockers.push(`implementation-plan.md frontmatter cannot be parsed: ${error.message || error}`);
                }
            }
            if (!(await services_1.services.fileService.exists(taskGraphPath))) {
                result.blockers.push('artifacts/agents/task-graph.json is required before archiving');
            }
            else {
                const taskGraphAnalysis = await services_1.services.projectService.analyzeTaskGraphDocument(taskGraphPath, activatedSteps);
                result.blockers.push(...taskGraphAnalysis.blockers);
                result.warnings.push(...taskGraphAnalysis.checks
                    .filter(check => check.status === 'warn')
                    .map(check => check.message));
            }
            if (reviewArtifactSet.missing.length > 0) {
                result.blockers.push(`A combined final review is required before archiving (legacy dual-review artifacts are also accepted). Missing: ${reviewArtifactSet.missing.join(', ')}`);
            }
            for (const reviewArtifact of reviewArtifactSet.artifacts) {
                const analysis = await services_1.services.projectService.analyzeReviewArtifactDocument(reviewArtifact.path, reviewArtifact.name, reviewArtifact.role, activatedSteps);
                result.blockers.push(...analysis.blockers);
                result.warnings.push(...analysis.checks
                    .filter(check => check.status === 'warn')
                    .map(check => check.message));
            }
            if (!(await services_1.services.fileService.exists(agentWorkerStatusPath))) {
                result.blockers.push('artifacts/agents/worker-status.md is required before archiving');
            }
            else {
                const agentWorkerStatusAnalysis = await services_1.services.projectService.analyzeAgentWorkerStatusDocument(agentWorkerStatusPath);
                result.blockers.push(...agentWorkerStatusAnalysis.blockers);
                result.warnings.push(...agentWorkerStatusAnalysis.checks
                    .filter(check => check.status === 'warn')
                    .map(check => check.message));
            }
            /*
             * S7: these five probes are read-only and independent of each
             * other -- three document/verification gates, the final-review
             * evidence check, and the task report that tells us which
             * tasks to check next. Awaiting them one at a time meant the
             * command sat idle through five round trips (each of which
             * spawns git and re-reads the same graph) before it even knew
             * how many tasks it had to validate.
             *
             * Blocker ORDER is part of the output contract, so each probe
             * collects into its own array and they are concatenated in the
             * original sequence.
             */
            const documentReviewBlockers = [];
            const verificationEvidenceBlockers = [];
            const verificationRequirementBlockers = [];
            /*
             * Phase 3 / INTEGRATION: S7's batch is exactly the un-batched
             * caller Track A's benchmark named as the one row that did not
             * improve. Every validation below ends in a `git rev-parse
             * HEAD`, and a scope collapses the N *task* reviews into one
             * resolved HEAD however wide N is.
             *
             * FIX-4 + FIX-5 MERGE: this used to say "one resolved HEAD" for
             * the whole sweep. That is no longer what it costs, and the
             * number is worth writing down because it is the price of the
             * stale-PASS fix. Measured on the merged tree, one
             * `archive --check` makes 3 async `rev-parse HEAD` calls: the
             * task-review fan-out's single memoised one, plus one each for
             * the two verdicts that REFUSE when HEAD has moved -- the final
             * review, and the verification-freshness confirmation. Those two
             * pass `'refusal-condition'` to `readValidationGitHead` and are
             * deliberately unmemoised: a memo cannot see another process's
             * commit, and both of these refuse on exactly that.
             *
             * The sweep is read-only by construction -- the four probes and
             * the report never mutate the goal -- so nothing inside it can
             * invalidate what the scope memoises while the scope is open.
             * `--repair`'s reconciliation runs to completion well before
             * this point, and a nested scope joins its parent, so opening
             * one here is safe on both paths.
             *
             * It also runs inside FIX-5's read overlay (see above). That is
             * a `FileService` overlay only: HEAD comes from a git child
             * process and the freshness snapshot from raw `fs`, so neither
             * observation can be served the repaired-but-unwritten bytes.
             * A freshness verdict here is a claim about the tree that
             * exists, which is the only claim it can honestly make -- the
             * evidence it is compared against was hashed from real disk at
             * dispatch time.
             */
            const { finalReviewEvidence, evidenceTasks, taskReviewEvidence, } = await services_1.services.taskGraphExecutionService.withValidationScope(async () => {
                const [, , , scopedFinalReviewEvidence, taskReport] = await Promise.all([
                    this.addGoalDocumentReviewBlockers(targetPath, documentReviewBlockers),
                    this.addGoalVerificationEvidenceBlocker(targetPath, verificationEvidenceBlockers),
                    this.addGoalVerificationRequirementBlocker(targetPath, verificationRequirementBlockers),
                    services_1.services.taskGraphExecutionService.validateTaskReviewEvidence(targetPath, null),
                    services_1.services.taskGraphExecutionService.getReport(targetPath),
                ]);
                /*
                 * S7: the per-task loop was the O(n) part -- one serial
                 * service call per completed/concern task, each re-reading
                 * the graph and spawning its own `git rev-parse`. The calls
                 * never depended on each other, so they now run with a
                 * bounded fan-out while `mapWithConcurrency` keeps the
                 * results (and therefore the blocker order) in task order.
                 */
                const scopedEvidenceTasks = [...taskReport.completedTasks, ...taskReport.concernTasks];
                return {
                    finalReviewEvidence: scopedFinalReviewEvidence,
                    evidenceTasks: scopedEvidenceTasks,
                    taskReviewEvidence: await mapWithConcurrency(scopedEvidenceTasks, EVIDENCE_VALIDATION_CONCURRENCY, task => services_1.services.taskGraphExecutionService.validateTaskReviewEvidence(targetPath, task.id)),
                };
            });
            /*
             * Blocker ORDER is part of the output contract, so the probes'
             * arrays are concatenated here in the original sequence,
             * outside the scope, exactly as they were before.
             */
            result.blockers.push(...documentReviewBlockers);
            result.blockers.push(...verificationEvidenceBlockers);
            result.blockers.push(...verificationRequirementBlockers);
            if (!finalReviewEvidence.ready) {
                result.blockers.push(finalReviewEvidence.reason || 'Final review evidence is stale or invalid.');
            }
            taskReviewEvidence.forEach((evidence, index) => {
                if (!evidence.ready) {
                    result.blockers.push(evidence.reason || `Task ${evidenceTasks[index].id} review evidence is stale or invalid.`);
                }
            });
        }
        if (isGoalWorkflow) {
            const documentationUpdateAnalysis = await services_1.services.projectService.analyzeDocumentationUpdates(targetPath);
            for (const check of documentationUpdateAnalysis.checks) {
                result.checks.push({
                    name: check.name,
                    passed: check.status !== 'fail',
                    message: check.message,
                });
                if (check.status === 'fail') {
                    result.blockers.push(check.message);
                }
            }
        }
        result.blockers.splice(0, result.blockers.length, ...Array.from(new Set(result.blockers)));
        result.warnings.splice(0, result.warnings.length, ...Array.from(new Set(result.warnings)));
        result.canArchive = result.blockers.length === 0;
        return result;
    }
    async addGoalDocumentReviewBlockers(targetPath, blockers) {
        for (const review of [
            {
                label: 'design document review',
                stage: 'design',
            },
            {
                label: 'implementation plan review',
                stage: 'plan',
            },
        ]) {
            try {
                const evidence = await services_1.services.taskGraphExecutionService.validateDocumentReviewEvidence(targetPath, review.stage);
                if (!evidence.ready) {
                    blockers.push(evidence.reason || `${review.label} evidence is stale or invalid.`);
                }
            }
            catch (error) {
                blockers.push(`${review.label} evidence could not be validated: ${error.message || error}`);
            }
        }
    }
    async addGoalVerificationEvidenceBlocker(targetPath, blockers) {
        const evidencePath = path.join(targetPath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, 'verification-evidence.json');
        if (!(await services_1.services.fileService.exists(evidencePath))) {
            blockers.push('artifacts/agents/verification-evidence.json with latest PASSED evidence is required before archiving a goal');
            return;
        }
        try {
            const evidence = await services_1.services.fileService.readJSON(evidencePath);
            const records = Array.isArray(evidence?.records) ? evidence.records : [];
            const latest = records[records.length - 1];
            const status = typeof latest?.status === 'string' ? latest.status.trim().toUpperCase() : '';
            if (status !== 'PASSED') {
                blockers.push(`Latest goal verification evidence must be PASSED before archive (current: ${status || 'missing'})`);
            }
            const freshness = await services_1.services.taskGraphExecutionService.validateLatestVerificationEvidence(targetPath);
            if (!freshness.ready) {
                blockers.push(freshness.reason || 'Latest goal verification evidence is stale.');
            }
        }
        catch (error) {
            blockers.push(`artifacts/agents/verification-evidence.json cannot be parsed: ${error.message || error}`);
        }
    }
    async addGoalVerificationRequirementBlocker(targetPath, blockers) {
        const verificationRequirements = await services_1.services.taskGraphExecutionService
            .validateVerificationRequirements(targetPath)
            .catch((error) => ({ ready: false, reason: error?.message || String(error) }));
        if (!verificationRequirements.ready) {
            blockers.push(verificationRequirements.reason || 'Required verification evidence is incomplete.');
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
        const inferredRoot = this.inferProjectRootFromChangePath(startPath);
        if (inferredRoot) {
            return inferredRoot;
        }
        throw new Error('Unable to locate project root containing .skillrc from the provided change path.');
    }
    async performArchive(targetPath, projectRoot, featureState, config) {
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config);
        await services_1.services.fileService.ensureDir(archivedRoot);
        const archivePath = await this.resolveArchivePath(archivedRoot, featureState.feature, config);
        const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
        const originalProposal = await services_1.services.fileService.exists(proposalPath)
            ? await services_1.services.fileService.readFile(proposalPath)
            : null;
        const nextState = {
            ...featureState,
            status: 'archived',
            current_step: 'archived',
            completed: Array.from(new Set([...featureState.completed, 'archived'])).sort((a, b) => a.localeCompare(b)),
            pending: featureState.pending.filter(step => step !== 'archived'),
            blocked_by: [],
        };
        // 7.7: same as the finalize path -- resolve the feature slugs and their
        // doc_updates targets before the state is written, so the rebuild below
        // indexes them (contract 6.2).
        const declaredFeatureSlugs = await services_1.services.projectService.readDeclaredFeatureSlugs(targetPath);
        if (declaredFeatureSlugs.length > 0) {
            nextState.features = declaredFeatureSlugs;
            const docUpdates = await services_1.services.projectService.computeDocUpdates(projectRoot, declaredFeatureSlugs);
            if (docUpdates.length > 0)
                nextState.doc_updates = docUpdates;
        }
        await services_1.services.projectService.preflightArchiveWrite(projectRoot, archivePath);
        let moved = false;
        let linksRebased = false;
        try {
            await services_1.services.fileService.move(targetPath, archivePath);
            moved = true;
            await services_1.services.stateManager.writeState(archivePath, nextState);
            await this.updateProposalStatus(archivePath, 'archived');
            await services_1.services.projectService.rebaseMovedChangeMarkdownLinks(targetPath, archivePath);
            linksRebased = true;
            await services_1.services.projectService.rebuildIndex(projectRoot);
            await services_1.services.projectService.assertArchivedChangeIndexed(projectRoot, archivePath);
            // Warns, never blocks: the change is already archived and verified
            // by this point. See ProjectService.recordArchiveTraceability.
            for (const warning of await services_1.services.projectService.recordArchiveTraceability(projectRoot, archivePath)) {
                console.warn(`[ospec] warning: ${warning}`);
            }
            await services_1.services.projectService.archiveLinkedBrainstorms(projectRoot, featureState.feature, archivePath);
            return this.toRelativePath(projectRoot, archivePath);
        }
        catch (error) {
            if (!moved)
                throw error;
            const rollbackErrors = [];
            try {
                if (await services_1.services.fileService.exists(archivePath)) {
                    await services_1.services.fileService.move(archivePath, targetPath);
                }
            }
            catch (rollbackError) {
                rollbackErrors.push(`move: ${rollbackError?.message || rollbackError}`);
            }
            if (await services_1.services.fileService.exists(targetPath)) {
                if (linksRebased) {
                    await services_1.services.projectService.rebaseMovedChangeMarkdownLinks(archivePath, targetPath)
                        .catch((rollbackError) => rollbackErrors.push(`links: ${rollbackError?.message || rollbackError}`));
                }
                await services_1.services.stateManager.writeState(targetPath, featureState)
                    .catch((rollbackError) => rollbackErrors.push(`state: ${rollbackError?.message || rollbackError}`));
                if (originalProposal !== null) {
                    await services_1.services.fileService.writeFile(path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL), originalProposal)
                        .catch((rollbackError) => rollbackErrors.push(`proposal: ${rollbackError?.message || rollbackError}`));
                }
            }
            await services_1.services.projectService.rebuildIndex(projectRoot)
                .catch((rollbackError) => rollbackErrors.push(`index: ${rollbackError?.message || rollbackError}`));
            if (rollbackErrors.length > 0) {
                throw new Error(`Archive failed (${error?.message || error}); rollback also failed: ${rollbackErrors.join('; ')}`);
            }
            throw error;
        }
    }
    inferProjectRootFromChangePath(startPath) {
        const normalizedPath = path.resolve(startPath);
        const segments = normalizedPath.split(path.sep);
        for (let index = 0; index < segments.length - 2; index += 1) {
            if (segments[index] === constants_1.DIR_NAMES.CHANGES && segments[index + 1] === constants_1.DIR_NAMES.ACTIVE) {
                return segments.slice(0, index).join(path.sep) || path.sep;
            }
        }
        for (let index = 0; index < segments.length - 3; index += 1) {
            if (segments[index] === '.ospec' &&
                segments[index + 1] === constants_1.DIR_NAMES.CHANGES &&
                segments[index + 2] === constants_1.DIR_NAMES.ACTIVE) {
                return segments.slice(0, index).join(path.sep) || path.sep;
            }
        }
        return null;
    }
    async updateProposalStatus(targetPath, status) {
        const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
        if (!(await services_1.services.fileService.exists(proposalPath))) {
            return;
        }
        const proposal = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(proposalPath));
        proposal.data.status = status;
        await services_1.services.fileService.writeFile(proposalPath, (0, helpers_1.stringifyFrontmatter)(proposal.content, proposal.data));
    }
    async resolveArchivePath(archivedRoot, featureName, config) {
        const archiveLayout = config?.archive?.layout === 'month-day' ? 'month-day' : 'flat';
        const archiveDate = this.getLocalArchiveDateParts();
        if (archiveLayout === 'month-day') {
            const archiveDayRoot = path.join(archivedRoot, archiveDate.month, archiveDate.day);
            await services_1.services.fileService.ensureDir(archiveDayRoot);
            const archiveLeafName = await this.resolveArchiveLeafName(archiveDayRoot, featureName);
            return path.join(archiveDayRoot, archiveLeafName);
        }
        const archiveDirName = await this.resolveLegacyArchiveDirName(archivedRoot, archiveDate.day, featureName);
        return path.join(archivedRoot, archiveDirName);
    }
    async resolveArchiveLeafName(archiveDayRoot, featureName) {
        let candidate = featureName;
        let index = 2;
        while (await services_1.services.fileService.exists(path.join(archiveDayRoot, candidate))) {
            candidate = `${featureName}-${index}`;
            index += 1;
        }
        return candidate;
    }
    async resolveLegacyArchiveDirName(archivedRoot, archiveDay, featureName) {
        const baseName = `${archiveDay}-${featureName}`;
        let candidate = baseName;
        let index = 2;
        while (await services_1.services.fileService.exists(path.join(archivedRoot, candidate))) {
            candidate = `${baseName}-${index}`;
            index += 1;
        }
        return candidate;
    }
    getLocalArchiveDateParts() {
        const now = new Date();
        const year = String(now.getFullYear());
        const monthNumber = String(now.getMonth() + 1).padStart(2, '0');
        const dayNumber = String(now.getDate()).padStart(2, '0');
        return {
            month: `${year}-${monthNumber}`,
            day: `${year}-${monthNumber}-${dayNumber}`,
        };
    }
    toRelativePath(rootDir, targetPath) {
        return path.relative(rootDir, targetPath).replace(/\\/g, '/');
    }
}
exports.ArchiveCommand = ArchiveCommand;
