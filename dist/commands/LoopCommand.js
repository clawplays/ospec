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
exports.LoopCommand = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const loopBatchEnvelope_1 = require("../utils/loopBatchEnvelope");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const BaseCommand_1 = require("./BaseCommand");
const LOOP_ACTIONS = ['run', 'tick', 'step', 'poll', 'status', 'pause', 'resume', 'configure', 'allowlist', 'tick-plan', 'heartbeat', 'result', 'finalize', 'recover'];
/**
 * Cap for the batch envelope, deliberately separate from the prose
 * `--max-output-chars` and deliberately *below* the structured-output cap
 * (32768) so this command's reduction always runs first.
 *
 * Prose pruning is head+tail truncation with the middle spilled to a file. Doing
 * that to a JSON document yields invalid JSON, and recovering it costs the
 * consumer an extra file read — the exact round-trip this command exists to
 * remove. So the batch envelope is reduced *semantically* (drop item-state
 * summaries, then action prompts, then paginate) and never byte-truncated. The
 * ordering only holds if this cap binds first, hence 24576 rather than a value
 * at or above the generic structured cap.
 */
const DEFAULT_MAX_BATCH_CHARS = 24576;
class LoopCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', ...args) {
        try {
            const normalized = (action || 'status').toLowerCase();
            switch (normalized) {
                case 'run':
                case 'tick':
                    await this.run(args);
                    return;
                case 'step':
                    await this.step(args);
                    return;
                case 'poll':
                    await this.poll(args);
                    return;
                case 'tick-plan':
                    await this.tickPlan(args[0]);
                    return;
                case 'status':
                    await this.status(args);
                    return;
                case 'pause':
                    await this.pause(args[0]);
                    return;
                case 'resume':
                    await this.resume(args[0]);
                    return;
                case 'configure':
                    await this.configure(args);
                    return;
                case 'allowlist':
                    await this.allowlist(args);
                    return;
                case 'heartbeat':
                    await this.heartbeat(args);
                    return;
                case 'result':
                    await this.recordResult(args);
                    return;
                case 'finalize':
                    await this.recordResult(args, true);
                    return;
                case 'recover':
                    await this.recover(args);
                    return;
                default:
                    this.info(`Usage: ospec loop <${LOOP_ACTIONS.join('|')}> [path]`);
            }
        }
        catch (error) {
            this.error(`Loop command failed: ${error}`);
            throw error;
        }
    }
    async run(args) {
        const inputPath = this.parseOptionalPath(args, [], ['--once', '--json', '--compact-json']);
        const changePath = await this.resolveChangePath(inputPath);
        const project = await this.resolveProjectRoot(changePath);
        const result = await services_1.services.loopService.runOnce(changePath, {
            trigger: 'cli',
            projectRoot: project.projectRoot,
            layoutConfig: project.config,
        });
        if (args.includes('--json') || args.includes('--compact-json')) {
            console.log(JSON.stringify(args.includes('--compact-json')
                ? this.compactTickResult(result, await this.readGraphSummary(changePath))
                : result, null, 2));
            return;
        }
        console.log('\nLoop Tick');
        console.log('=========\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Iteration: ${result.iteration}`);
        console.log(`Status: ${result.status}`);
        console.log(`Step: ${result.currentStep}`);
        console.log(`Progress: tokens=${result.metrics.tokensUsed} elapsed=${result.metrics.elapsedMinutes.toFixed(1)}m no-progress=${result.metrics.noProgressCount}`);
        if (result.pending) {
            console.log(`Pending action: ${result.pending.actionId} (${result.pending.status})`);
        }
        if (result.actions.length > 0) {
            console.log('\nAction items:');
            for (const action of result.actions) {
                console.log(`  - ${action.id}: ${action.kind} target=${action.target} adapter=${action.runtimeAdapter?.selectedAdapterId || 'unresolved'} task=${action.taskId || 'n/a'}`);
                console.log(`    packet=${action.packetPath || 'none'}`);
                console.log(`    prompt=${action.prompt.replace(/\s+/g, ' ')}`);
                if (action.heartbeatCommand)
                    console.log(`    heartbeat=${action.heartbeatCommand}`);
                if (action.resultCommand)
                    console.log(`    result=${action.resultCommand}`);
            }
        }
        if (result.batchDiagnostics) {
            const batch = result.batchDiagnostics;
            console.log(`Batch: configured=${batch.configuredMaxParallel} graph-safe=${batch.graphSafeCandidates} token-funded=${batch.tokenFundedLimit} adapter-capacity=${batch.adapterCapacityKnown ? batch.adapterCapacity : 'unknown'} effective=${batch.effectiveEmitted}`);
            if (batch.configuredMaxParallelReason)
                console.log(`Batch reason: ${batch.configuredMaxParallelReason}`);
            if (batch.deferredReasons.length > 0)
                console.log(`Batch deferred: ${batch.deferredReasons.join(', ')}`);
        }
        if (result.stopped) {
            console.log(`Stopped: ${result.stopReason || 'yes'}`);
        }
        // F6: immediately before the next instruction, because that is the line
        // the reader acts on and this is the reason not to act on it as written.
        if (result.repeatedFailureAdvisory) {
            console.log(`\n${result.repeatedFailureAdvisory.message}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    /**
     * One controller round in one process.
     *
     * Replaces `heartbeat x N` + `finalize x N` + `run --once` with a single
     * call: claims, then results, then the tick that observes them. Every step
     * delegates to the same public LoopService method the standalone command
     * uses, so the lease, the ownership checks and the durable-evidence gate are
     * byte-for-byte the ones that were already there.
     *
     * Application is strictly ordered and stops at the first failure. Loop state
     * is shared, so continuing past a failed finalize would make the emitted
     * tick describe a state the controller never asked for; instead the command
     * reports exactly which items are already durable so the retry can drop
     * them.
     */
    async step(args) {
        const inputPath = this.parseOptionalPath(args, ['--batch-file', '--max-batch-chars'], ['--json', '--compact-json', '--no-tick']);
        const batchFile = this.parseFlagValue(args, '--batch-file');
        if (!batchFile) {
            throw new Error('loop step requires --batch-file <path|->. Use "-" to read the batch envelope from stdin.');
        }
        const maxBatchChars = this.parseMaxBatchChars(args);
        const shouldTick = !args.includes('--no-tick');
        const full = args.includes('--json') && !args.includes('--compact-json');
        const source = batchFile === '-' ? 'read from stdin' : `at ${batchFile}`;
        const raw = batchFile === '-'
            ? await this.readStdin()
            : await fs.promises.readFile(path.resolve(process.cwd(), batchFile), 'utf8');
        const envelope = (0, loopBatchEnvelope_1.parseLoopBatchEnvelope)(raw, source);
        const changePath = await this.resolveChangePath(inputPath);
        if (envelope.changePath) {
            const declared = path.resolve(process.cwd(), envelope.changePath);
            if (declared !== path.resolve(changePath)) {
                throw new Error(`Batch envelope changePath ${envelope.changePath} resolves to ${declared}, but this command resolved the goal to ${changePath}. Drop the key or point it at the same goal.`);
            }
        }
        const applied = { claims: [], results: [], ticked: false };
        const evidencePaths = {};
        for (const result of envelope.results) {
            if (result.evidencePaths?.length)
                evidencePaths[result.actionItemId] = result.evidencePaths;
        }
        const failure = await this.applyBatch(changePath, envelope, applied);
        let tick = null;
        if (!failure && shouldTick) {
            try {
                const project = await this.resolveProjectRoot(changePath);
                const result = await services_1.services.loopService.runOnce(changePath, {
                    trigger: 'cli-batch',
                    projectRoot: project.projectRoot,
                    layoutConfig: project.config,
                });
                applied.ticked = true;
                tick = full ? result : this.compactTickResult(result, await this.readGraphSummary(changePath));
            }
            catch (error) {
                const output = this.renderStepEnvelope({ applied, evidencePaths, tick: null, maxBatchChars });
                output.error = {
                    stage: 'tick',
                    index: null,
                    actionItemId: null,
                    message: String(error?.message || error),
                };
                console.log(JSON.stringify(output));
                throw new Error(this.describeStepFailure(output.error, applied, envelope));
            }
        }
        const output = this.renderStepEnvelope({ applied, evidencePaths, tick, maxBatchChars });
        if (failure) {
            output.error = failure;
            console.log(JSON.stringify(output));
            throw new Error(this.describeStepFailure(failure, applied, envelope));
        }
        console.log(JSON.stringify(output));
    }
    /**
     * Applies claims then results, in envelope order, stopping at the first
     * service-level rejection. Returns the failure descriptor, or null.
     */
    async applyBatch(changePath, envelope, applied) {
        for (let index = 0; index < envelope.claims.length; index += 1) {
            const claim = envelope.claims[index];
            try {
                await services_1.services.loopService.heartbeatExecution(changePath, claim);
                applied.claims.push(claim.actionItemId);
            }
            catch (error) {
                return { stage: 'claims', index, actionItemId: claim.actionItemId, message: String(error?.message || error) };
            }
        }
        for (let index = 0; index < envelope.results.length; index += 1) {
            const result = envelope.results[index];
            // The object is forwarded as a variable, not an object literal, so
            // TypeScript excess-property checking does not strip the keys this
            // command does not name. Track C's F5 fields (signal, infraFailure)
            // therefore reach LoopService untouched, and since C widened
            // LoopExecutionResult they are read there: LoopService validates
            // `signal` at its own record boundary and persists all four onto the
            // item state. This parser is NOT what protects that boundary -- it
            // checks the shape and forwards, which is why a signal carrying a
            // newline passes here and is rejected there.
            const forwarded = { ...result };
            delete forwarded.evidencePaths;
            try {
                if (envelope.finalize)
                    await services_1.services.loopService.finalizeExecutionItem(changePath, forwarded);
                else
                    await services_1.services.loopService.recordExecutionResults(changePath, [forwarded]);
                applied.results.push(result.actionItemId);
            }
            catch (error) {
                return { stage: 'results', index, actionItemId: result.actionItemId, message: String(error?.message || error) };
            }
        }
        return null;
    }
    describeStepFailure(failure, applied, envelope) {
        const notApplied = failure.stage === 'tick'
            ? []
            : (failure.stage === 'claims' ? envelope.claims : envelope.results)
                .slice(failure.index ?? 0)
                .map(item => item.actionItemId);
        const lines = [
            failure.stage === 'tick'
                ? `Batch step applied every claim and result but the tick failed: ${failure.message}`
                : `Batch step failed while applying ${failure.stage}[${failure.index}] (${failure.actionItemId}): ${failure.message}`,
            'Applied before the failure (already durable, do not resend):',
            `  claims:  ${applied.claims.join(', ') || 'none'}`,
            `  results: ${applied.results.join(', ') || 'none'}`,
        ];
        if (notApplied.length > 0) {
            lines.push(`Not applied: ${notApplied.join(', ')}.`);
            lines.push('Fix the failing item, then resend a batch containing only the not-applied items.');
        }
        else {
            lines.push('No tick was emitted; rerun "ospec loop run --once --compact-json" once the cause is resolved.');
        }
        return lines.join('\n');
    }
    /**
     * Builds the output envelope and keeps it inside the structured cap by
     * dropping payload semantically, then paginating. It never truncates bytes:
     * a half-JSON document would force the consumer into a spill-file read.
     */
    renderStepEnvelope(input) {
        const base = {
            // Versions THIS envelope's shape only. Deliberately not the CLI or
            // product version: a product version copied into a payload is stale
            // the moment the product moves and tells a consumer nothing about
            // whether its parser still fits.
            stepEnvelopeVersion: 1,
            kind: 'loop-step',
            applied: input.applied,
            reduced: [],
        };
        if (Object.keys(input.evidencePaths).length > 0)
            base.evidencePaths = input.evidencePaths;
        const build = (tick) => JSON.stringify({ ...base, tick });
        if (!input.tick)
            return { ...base, tick: null };
        let tick = input.tick;
        if (build(tick).length <= input.maxBatchChars)
            return { ...base, tick };
        // Each marker is recorded only when the reduction actually removed
        // something, so `reduced` names what the consumer is missing rather
        // than what the reducer merely attempted.
        if ((tick.pending?.itemStates || []).some((item) => item.summary)) {
            base.reduced.push('itemStateSummaries');
            tick = {
                ...tick,
                pending: { ...tick.pending, itemStates: tick.pending.itemStates.map((item) => ({ ...item, summary: null })) },
            };
            if (build(tick).length <= input.maxBatchChars)
                return { ...base, tick };
        }
        if ((tick.actions || []).some((action) => action.prompt)) {
            base.reduced.push('actionPrompts');
            tick = {
                ...tick,
                actions: tick.actions.map((action) => ({ ...action, prompt: null })),
            };
            if (build(tick).length <= input.maxBatchChars)
                return { ...base, tick };
        }
        const total = (tick.actions || []).length;
        const paginate = (emitted) => ({
            ...tick,
            actions: (tick.actions || []).slice(0, emitted),
            truncatedActions: {
                emitted,
                total,
                reason: `The action batch exceeded --max-batch-chars ${input.maxBatchChars}. Dispatch these, then run "ospec loop step" again to receive the rest; the batch is paginated, never spilled.`,
            },
        });
        for (let emitted = Math.max(1, total - 1); emitted >= 1; emitted -= 1) {
            const paginated = paginate(emitted);
            if (build(paginated).length <= input.maxBatchChars)
                return { ...base, tick: paginated };
        }
        // Even one action plus the irreducible tick header does not fit. Emit
        // the smallest valid envelope and say so, rather than silently
        // overshooting the cap or cutting the JSON in half.
        base.reduced.push('capExceeded');
        return { ...base, tick: total > 0 ? paginate(1) : tick };
    }
    parseMaxBatchChars(args) {
        const value = this.parseFlagValue(args, '--max-batch-chars');
        if (value === undefined)
            return DEFAULT_MAX_BATCH_CHARS;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0)
            throw new Error('--max-batch-chars must be a positive integer.');
        return parsed;
    }
    async readStdin() {
        const chunks = [];
        for await (const chunk of process.stdin)
            chunks.push(Buffer.from(chunk));
        return Buffer.concat(chunks).toString('utf8');
    }
    async poll(args) {
        const inputPath = this.parseOptionalPath(args, [], ['--json']);
        const changePath = await this.resolveChangePath(inputPath);
        const result = await services_1.services.loopService.poll(changePath);
        if (args.includes('--json')) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`Loop poll: tickNow=${result.tickNow ? 'yes' : 'no'} settled=${result.settled ? 'yes' : 'no'} action=${result.actionId || 'none'}`);
        for (const item of result.items) {
            console.log(`  - ${item.id}: ${item.status}${item.evidenceReady ? ' evidence-ready' : ''}`);
        }
        console.log(`Reason: ${result.reason}`);
        console.log(`Next: ${result.nextInstruction}`);
    }
    /** Reads a token-lean task graph summary so the controller does not need a separate `ospec execute status` call per tick. */
    async readGraphSummary(changePath) {
        try {
            const graph = await services_1.services.fileService.readJSON(path.join(changePath, 'artifacts', 'agents', 'task-graph.json'));
            if (!Array.isArray(graph?.tasks))
                return null;
            const statusCounts = {};
            let reviewsPending = 0;
            for (const task of graph.tasks) {
                const status = String(task?.status || 'UNKNOWN').toUpperCase();
                statusCounts[status] = (statusCounts[status] || 0) + 1;
                const decision = String(task?.review?.decision || 'PENDING').toUpperCase();
                if (decision !== 'APPROVED' && decision !== 'APPROVED_WITH_CONCERNS')
                    reviewsPending += 1;
            }
            return {
                graphStatus: graph.status ?? null,
                tasks: graph.tasks.length,
                statusCounts,
                reviewsPending,
            };
        }
        catch {
            return null;
        }
    }
    compactTickResult(result, graphSummary = null) {
        const capText = (value, max = 600) => {
            if (value === null || value === undefined)
                return value;
            const text = String(value);
            return text.length > max ? `${text.slice(0, max)}…` : text;
        };
        const pending = result.pending
            ? {
                actionId: result.pending.actionId,
                kind: result.pending.kind,
                status: result.pending.status,
                issuedAt: result.pending.issuedAt,
                executorCompletedAt: result.pending.executorCompletedAt || null,
                executorSucceeded: result.pending.executorSucceeded ?? null,
                itemStates: (result.pending.itemStates || []).map((item) => ({
                    actionItemId: item.actionItemId,
                    status: item.status,
                    executorId: item.executorId,
                    heartbeatDueAt: item.heartbeatDueAt || null,
                    leaseExpiresAt: item.leaseExpiresAt,
                    absoluteExpiresAt: item.absoluteExpiresAt || null,
                    evidenceReady: Boolean(item.evidenceReadyAt),
                    tokensUsed: item.tokensUsed,
                    summary: capText(item.summary, 200),
                })),
            }
            : null;
        const actions = (result.actions || []).map((action) => ({
            id: action.id,
            kind: action.kind,
            taskId: action.taskId,
            role: action.role,
            target: action.target,
            packetPath: action.packetPath,
            prompt: action.prompt,
            completionCommand: action.completionCommand,
            heartbeatCommand: action.heartbeatCommand,
            resultCommand: action.resultCommand,
            expectedEvidencePath: action.expectedEvidencePath,
            usageKey: action.usageKey || null,
            tokenAllowance: action.tokenAllowance ?? null,
            heartbeatDueAt: action.heartbeatDueAt || null,
            absoluteExpiresAt: action.absoluteExpiresAt || null,
            runtimeAdapterId: action.runtimeAdapter?.selectedAdapterId || null,
        }));
        return {
            // Versions THIS projection's shape only, and starts at 1. It was
            // `version: '1.9.0'` -- a product version copied into a payload,
            // which was already stale the moment the package moved to 2.0.0 and
            // told a consumer nothing about whether its parser still fits.
            // `loop step` embeds this object verbatim as its `tick`, so the
            // stale value was riding inside the batch envelope too.
            tickEnvelopeVersion: 1,
            changePath: result.changePath,
            iteration: result.iteration,
            status: result.status,
            currentStep: result.currentStep,
            verifyPassed: result.verifyPassed,
            stopped: result.stopped,
            stopReason: result.stopReason,
            feedback: capText(result.feedback),
            nextInstruction: capText(result.nextInstruction, 900),
            metrics: result.metrics,
            graph: graphSummary,
            pending,
            actions,
            batchDiagnostics: result.batchDiagnostics,
            // F6: omitted entirely when there is nothing to say, so the common
            // case costs no output at all.
            ...(result.repeatedFailureAdvisory
                ? { repeatedFailure: result.repeatedFailureAdvisory }
                : {}),
        };
    }
    async tickPlan(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const plan = await services_1.services.loopService.buildControllerTickPlan(changePath);
        console.log('\nController Tick Plan');
        console.log('====================\n');
        console.log(`Execution model: ${plan.executionModel}`);
        console.log(`Interval: ${plan.interval}`);
        console.log(`Native loop capability: ${plan.nativeLoopCapability}`);
        console.log(`Runtime adapter: ${plan.runtimeAdapter.selectedAdapterId || 'blocked'}`);
        console.log('\nInstructions:');
        for (const instruction of plan.instructions) {
            console.log(`  - ${instruction}`);
        }
        console.log('');
    }
    parseOptionalPath(args, valueFlags, booleanFlags) {
        const valueSet = new Set(valueFlags);
        const booleanSet = new Set(booleanFlags);
        let inputPath;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (booleanSet.has(arg))
                continue;
            const equalsIndex = arg.indexOf('=');
            const flag = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
            if (valueSet.has(flag)) {
                const value = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : args[++index];
                if (!value || value.startsWith('--'))
                    throw new Error(`${flag} requires a non-empty value.`);
                continue;
            }
            if (arg.startsWith('--'))
                throw new Error(`Unknown loop flag: ${arg}`);
            if (inputPath)
                throw new Error(`Unexpected extra loop path argument: ${arg}`);
            inputPath = arg;
        }
        return inputPath;
    }
    /**
     * The value of `--flag value` or `--flag=value`, or undefined if absent.
     *
     * M-misc6: the space-separated form returned `args[index + 1]` with no
     * check on what that was. Two ways it lied:
     *
     *  - `ospec loop result --action-item --executor codex-1` returned
     *    `'--executor'` as the action item id. The command then looked up an
     *    item by that name, failed, and reported a missing action item -- with
     *    no hint that the real problem was a forgotten value one flag earlier.
     *  - `ospec loop result --summary` with nothing after it returned
     *    `undefined`, indistinguishable from not passing `--summary` at all,
     *    so a typo'd trailing flag was silently dropped.
     *
     * Both now fail loud. A value that genuinely starts with `--` is still
     * reachable through `--flag=--value`, and the error says so.
     */
    parseFlagValue(args, flag) {
        for (let index = 0; index < args.length; index += 1) {
            if (args[index] === flag) {
                const value = args[index + 1];
                if (value === undefined) {
                    throw new Error(`${flag} requires a value.`);
                }
                if (value.startsWith('--')) {
                    throw new Error(`${flag} requires a value, but the next argument is "${value}". Write ${flag}=${value} if that really is the value.`);
                }
                return value;
            }
            if (args[index].startsWith(`${flag}=`)) {
                return args[index].slice(`${flag}=`.length);
            }
        }
        return undefined;
    }
    async resolveProjectRoot(changePath) {
        let current = path.resolve(changePath);
        while (true) {
            if (await services_1.services.fileService.exists(path.join(current, constants_1.FILE_NAMES.SKILLRC))) {
                const config = await services_1.services.configManager.loadConfigOrNull(current);
                return { projectRoot: current, config };
            }
            const parent = path.dirname(current);
            if (parent === current) {
                return { projectRoot: path.resolve(changePath), config: null };
            }
            current = parent;
        }
    }
    async status(args) {
        const inputPath = this.parseOptionalPath(args, [], ['--brief', '--json']);
        const changePath = await this.resolveChangePath(inputPath);
        if (!(await services_1.services.loopService.exists(changePath))) {
            this.warn('No loop is initialized for this change (only goal-profile changes create a loop).');
            return;
        }
        const config = await services_1.services.loopService.readConfig(changePath);
        const state = await services_1.services.loopService.readState(changePath);
        const planningDecision = await services_1.services.taskGraphExecutionService.readValidatedPlanningReviewDecision(changePath);
        if (args.includes('--json')) {
            // Versions THIS projection's shape only, and starts at 1. It was
            // `version: '1.9.0'`, the same product-version-in-a-payload defect
            // track A fixed one method up in `compactTickResult` -- left behind
            // there because it belongs to a different command's payload, and
            // still emitting a 1.9.0 out of a 2.0.0 package. Same defect, same
            // fix: a shape version a consumer can actually check its parser
            // against.
            console.log(JSON.stringify({ statusEnvelopeVersion: 1, changePath, config, state, planningDecision }, null, 2));
            return;
        }
        if (args.includes('--brief')) {
            const pending = state.pendingControllerAction;
            const nextHeartbeat = (pending?.itemStates || [])
                .filter(item => item.status === 'issued' || item.status === 'running')
                .map(item => item.heartbeatDueAt)
                .filter(Boolean)
                .sort()[0] || null;
            const batch = state.lastBatchDiagnostics;
            console.log(`Loop ${state.status}: workflow=fast-quality step=${state.currentStep} iteration=${state.iteration} parallel=${config.efficiency.maxParallel} reason=${config.efficiency.maxParallelReason || 'not-recorded'} emitted=${batch?.effectiveEmitted ?? 0}/${batch?.graphSafeCandidates ?? 0} deferred=${batch?.deferredReasons?.join(',') || 'none'} planning=${planningDecision} pending=${pending?.items?.length || 0} heartbeat-due=${nextHeartbeat || 'none'}`);
            return;
        }
        console.log('\nLoop Status');
        console.log('===========\n');
        console.log(`Change path: ${changePath}`);
        console.log('Workflow: fast quality');
        console.log(`Primitive: ${config.primitive}`);
        console.log(`Target: ${config.target}`);
        console.log(`Execution model: ${config.executionModel}`);
        console.log(`Schedule: ${config.schedule.interval} (${config.schedule.lifecycle})`);
        console.log(`Concurrency: ${config.efficiency.maxParallel} reason=${config.efficiency.maxParallelReason || 'not recorded'} fresh-context=${config.efficiency.freshContext ? 'yes' : 'no'}`);
        console.log(`Guards: no-progress=${config.efficiency.noProgressLimit} review-every=${config.efficiency.comprehensionReviewEvery} continue-while-progressing=${config.efficiency.continueWhileProgressing ? 'yes' : 'no'}`);
        console.log(`Budgets: iterations=${config.stopConditions.maxIterations ?? 'unbounded'} tokens=${config.stopConditions.budgetTokens ?? 'unbounded'} minutes=${config.stopConditions.budgetMinutes ?? 'unbounded'} expires=${config.stopConditions.expiresAt || 'never'}`);
        console.log(`Status: ${state.status}`);
        console.log(`Iteration: ${state.iteration}`);
        console.log(`Current step: ${state.currentStep}`);
        console.log(`Last tick: ${state.lastTickTs || 'never'}`);
        console.log(`Pending action: ${state.pendingControllerAction ? state.pendingControllerAction.actionId : 'none'}`);
        console.log(`Pending items: ${state.pendingControllerAction?.items?.length || 0}`);
        for (const item of state.pendingControllerAction?.itemStates || []) {
            console.log(`  - ${item.actionItemId}: ${item.status} executor=${item.executorId || 'unclaimed'} heartbeat=${item.heartbeatAt || 'never'} due=${item.heartbeatDueAt} lease=${item.leaseExpiresAt}`);
        }
        console.log(`Usage: tokens=${state.tokensUsed} executor=${state.executorTokensUsed} artifacts=${state.artifactTokensUsed} no-progress=${state.noProgressCount} comprehension-debt=${state.comprehensionDebtCounter}`);
        if (state.lastBatchDiagnostics) {
            const batch = state.lastBatchDiagnostics;
            console.log(`Last batch: graph-safe=${batch.graphSafeCandidates} token-funded=${batch.tokenFundedLimit} adapter-capacity=${batch.adapterCapacityKnown ? batch.adapterCapacity : 'unknown'} emitted=${batch.effectiveEmitted} deferred=${batch.deferredReasons.join(', ') || 'none'}`);
        }
        console.log(`Combined planning review: ${planningDecision}`);
        if (state.lastFeedback)
            console.log(`Last feedback: ${state.lastFeedback}`);
        if (config.capability) {
            console.log(`Native loop capability: ${config.capability.nativeLoopCapability} (${config.capability.probeSource})`);
            console.log(`Harness: interactive=${config.capability.interactive ? 'yes' : 'no'} native-subagents=${config.capability.nativeSubagentCapability} controller=${config.capability.controllerAvailable ? 'available' : 'blocked'}`);
        }
        console.log('');
    }
    async pause(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.pause(changePath);
        this.success(`Loop paused (status: ${state.status}). Run "ospec loop resume" to continue.`);
    }
    async resume(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.resume(changePath);
        this.success(`Loop resumed (status: ${state.status}).`);
    }
    async configure(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const options = {};
        const values = (flag) => {
            const found = [];
            for (let index = inputPath ? 1 : 0; index < args.length; index += 1) {
                if (args[index] === flag && args[index + 1] !== undefined) {
                    found.push(args[index + 1]);
                    index += 1;
                }
                else if (args[index].startsWith(`${flag}=`)) {
                    found.push(args[index].slice(flag.length + 1));
                }
            }
            return found;
        };
        const scalar = (flag) => values(flag).at(-1);
        /**
         * A flag whose "none" really is a value: the four `stopConditions`
         * budgets, which are `number | null` in `LoopConfig` and where null
         * means unbounded.
         */
        const nullableNumber = (flag) => {
            const value = scalar(flag);
            if (value === undefined)
                return undefined;
            if (value.toLowerCase() === 'none')
                return null;
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed <= 0)
                throw new Error(`${flag} must be a positive integer or "none".`);
            return parsed;
        };
        /*
         * M-cfg4. The plan called this "8 nullable options must pass null for
         * none, like budgetTokens does". Re-derived against the current tree,
         * that is wrong twice over.
         *
         * There are NINE of them, not eight: --max-parallel,
         * --no-progress-limit, --max-task-repair-rounds,
         * --max-final-repair-rounds, --prompt-max-chars,
         * --implementation-max-runtime-minutes, --review-max-runtime-minutes,
         * --verification-max-runtime-minutes and
         * --evidence-result-grace-minutes.
         *
         * And they are not nullable. Every one lands in `LoopEfficiency`,
         * where the field is a plain `number` with a built-in default -- null
         * has no meaning there, `LoopConfigureOptions` does not admit it, and
         * `configure()` would write it straight through `positiveInteger()`.
         * `budgetTokens` is genuinely different: it is a `stopConditions`
         * budget, `number | null`, and null means unbounded. Copying its
         * treatment onto these nine would have required changing LoopService's
         * public option type and its writer -- both track B's files this
         * phase -- to express a state the config has no slot for.
         *
         * The real defect is the one the user hits: `nullableNumber` ACCEPTS
         * "none" for all nine (its own error message advertises it), and the
         * `?? undefined` at each call site then converts that null into "flag
         * not supplied". So `ospec loop configure --max-parallel none` exits
         * 0, prints the same summary as a no-op, and changes nothing. Same
         * silently-ignored-input class as M-cfg1, one command over.
         *
         * The `?? undefined` sites are gone; these nine now parse through a
         * helper that refuses "none" and says what to write instead. The help
         * text agrees -- it documents `N|none` for the four budgets and a bare
         * `N` for these nine, and always did.
         */
        const positiveNumber = (flag) => {
            const value = scalar(flag);
            if (value === undefined)
                return undefined;
            if (value.toLowerCase() === 'none') {
                throw new Error(`${flag} has no "none": it is always set. Pass a positive integer, or omit the flag to leave it unchanged.`);
            }
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed <= 0)
                throw new Error(`${flag} must be a positive integer.`);
            return parsed;
        };
        const target = scalar('--target');
        if (target) {
            // M-cfg5: `grok` is a first-class `TaskWorkerToolTarget` with its own
            // RuntimeExecutionAdapterService entry and its own native-subagent
            // branch in TGES, and `ospec execute handoff|launch --target grok` is
            // documented in the help. It was missing from all three validators.
            const allowed = new Set(['codex', 'gpt', 'claude', 'gemini', 'grok', 'opencode', 'cursor', 'copilot', 'shell', 'generic']);
            if (!allowed.has(target))
                throw new Error(`Unsupported loop target: ${target}.`);
            options.target = target;
        }
        const model = scalar('--execution-model');
        if (model) {
            if (model !== 'controller')
                throw new Error('--execution-model only supports controller; agent CLI execution was removed.');
            options.executionModel = 'controller';
        }
        const harnessInteractive = scalar('--harness-interactive');
        if (harnessInteractive !== undefined) {
            if (harnessInteractive !== 'true' && harnessInteractive !== 'false')
                throw new Error('--harness-interactive must be true or false.');
            options.interactive = harnessInteractive === 'true';
        }
        const capability = (flag) => {
            const value = scalar(flag);
            if (value === undefined)
                return undefined;
            if (value !== 'supported' && value !== 'unknown' && value !== 'unsupported') {
                throw new Error(`${flag} must be supported, unknown, or unsupported.`);
            }
            return value;
        };
        options.nativeSubagentCapability = capability('--native-subagents');
        options.nativeLoopCapability = capability('--native-goal');
        const nativeHarnessMetadata = scalar('--native-harness-metadata');
        if (nativeHarnessMetadata !== undefined) {
            if (nativeHarnessMetadata.toLowerCase() === 'none') {
                options.nativeHarnessMetadata = null;
            }
            else {
                let parsed;
                try {
                    parsed = JSON.parse(nativeHarnessMetadata);
                }
                catch {
                    throw new Error('--native-harness-metadata must be valid JSON or "none".');
                }
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new Error('--native-harness-metadata must be a JSON object or "none".');
                }
                options.nativeHarnessMetadata = parsed;
            }
        }
        options.interval = scalar('--interval');
        options.maxIterations = nullableNumber('--max-iterations');
        const expiresAt = scalar('--expires-at');
        options.expiresAt = expiresAt?.toLowerCase() === 'none' ? null : expiresAt;
        options.budgetTokens = nullableNumber('--budget-tokens');
        options.budgetMinutes = nullableNumber('--budget-minutes');
        const testCommands = values('--test-command');
        const allowPaths = values('--allow-path');
        const allowCommands = values('--allow-command');
        const allowCommandPolicies = values('--allow-command-policy').map(value => {
            let parsed;
            try {
                parsed = JSON.parse(value);
            }
            catch {
                throw new Error('--allow-command-policy must be valid JSON.');
            }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('--allow-command-policy must be a JSON object.');
            }
            const policy = parsed;
            if (!String(policy.command || '').trim()) {
                throw new Error('--allow-command-policy requires a non-empty command.');
            }
            if (policy.argsPrefix !== undefined && !Array.isArray(policy.argsPrefix)) {
                throw new Error('--allow-command-policy argsPrefix must be an array.');
            }
            return policy;
        });
        if (testCommands.length > 0)
            options.testCommands = testCommands;
        if (allowPaths.length > 0)
            options.allowPaths = allowPaths;
        if (allowCommands.length > 0)
            options.allowCommands = allowCommands;
        if (allowCommandPolicies.length > 0)
            options.allowCommandPolicies = allowCommandPolicies;
        options.maxParallel = positiveNumber('--max-parallel');
        options.noProgressLimit = positiveNumber('--no-progress-limit');
        options.maxTaskRepairRounds = positiveNumber('--max-task-repair-rounds');
        options.maxFinalRepairRounds = positiveNumber('--max-final-repair-rounds');
        const continueWhileProgressing = scalar('--continue-while-progressing');
        if (continueWhileProgressing !== undefined) {
            if (continueWhileProgressing !== 'true' && continueWhileProgressing !== 'false') {
                throw new Error('--continue-while-progressing must be true or false.');
            }
            options.continueWhileProgressing = continueWhileProgressing === 'true';
        }
        const reviewEvery = scalar('--review-every');
        if (reviewEvery !== undefined) {
            const parsed = Number(reviewEvery);
            if (!Number.isInteger(parsed) || parsed < 0)
                throw new Error('--review-every must be a non-negative integer.');
            options.comprehensionReviewEvery = parsed;
        }
        const freshContext = scalar('--fresh-context');
        if (freshContext !== undefined) {
            if (freshContext !== 'true' && freshContext !== 'false')
                throw new Error('--fresh-context must be true or false.');
            options.freshContext = freshContext === 'true';
        }
        const maxParallelReason = scalar('--max-parallel-reason');
        if (maxParallelReason !== undefined) {
            options.maxParallelReason = maxParallelReason.toLowerCase() === 'none' ? null : maxParallelReason;
        }
        const reviewGating = scalar('--review-gating');
        if (reviewGating !== undefined) {
            if (reviewGating !== 'strict' && reviewGating !== 'optimistic') {
                throw new Error('--review-gating must be strict or optimistic.');
            }
            options.reviewGating = reviewGating;
        }
        options.promptMaxChars = positiveNumber('--prompt-max-chars');
        options.implementationMaxRuntimeMinutes = positiveNumber('--implementation-max-runtime-minutes');
        options.reviewMaxRuntimeMinutes = positiveNumber('--review-max-runtime-minutes');
        options.verificationMaxRuntimeMinutes = positiveNumber('--verification-max-runtime-minutes');
        options.evidenceResultGraceMinutes = positiveNumber('--evidence-result-grace-minutes');
        const changePath = await this.resolveChangePath(inputPath);
        const replacesPaths = allowPaths.length > 0;
        const replacesCommands = allowCommands.length > 0 || allowCommandPolicies.length > 0;
        const before = replacesPaths || replacesCommands
            ? await services_1.services.loopService.readConfig(changePath).catch(() => null)
            : null;
        const config = await services_1.services.loopService.configure(changePath, options);
        this.success(`Loop configured: target=${config.target}, model=${config.executionModel}, parallel=${config.efficiency.maxParallel}, taskRepairRounds=${config.efficiency.maxTaskRepairRounds}, finalRepairRounds=${config.efficiency.maxFinalRepairRounds}, continueWhileProgressing=${config.efficiency.continueWhileProgressing}, interval=${config.schedule.interval}.`);
        if (replacesPaths || replacesCommands) {
            this.warn(`Allowlist replacement applied: paths=${replacesPaths ? 'replaced' : 'unchanged'}, commands=${replacesCommands ? 'replaced' : 'unchanged'}. Repeated configure flags replace the complete selected list; they do not append.`);
            if (before?.allowlist && config.allowlist) {
                this.printAllowlistDiff(services_1.services.loopService.diffAllowlists(before.allowlist, config.allowlist));
            }
        }
        if (config.efficiency.maxParallel < 3 && !config.efficiency.maxParallelReason) {
            this.warn('Concurrency is below the default (3), but no --max-parallel-reason was recorded. The explicit limit is preserved.');
        }
    }
    async allowlist(args) {
        const operation = String(args[0] || '').toLowerCase();
        if (!['derive', 'check', 'apply', 'clear'].includes(operation)) {
            throw new Error('Usage: ospec loop allowlist <derive|check|apply|clear> [path] [--from-task-graph] [--json].');
        }
        const operationArgs = args.slice(1);
        const inputPath = this.parseOptionalPath(operationArgs, ['--expected-current-hash', '--expected-candidate-hash', '--expected-task-graph-hash'], ['--from-task-graph', '--approve-expansion', '--confirm', '--json']);
        const changePath = await this.resolveChangePath(inputPath);
        const json = operationArgs.includes('--json');
        if (operation === 'clear') {
            if (!operationArgs.includes('--confirm')) {
                throw new Error('loop allowlist clear requires --confirm because it removes all configured permissions.');
            }
            const cleared = await services_1.services.loopService.clearAllowlist(changePath, {
                expectedCurrentHash: this.parseFlagValue(operationArgs, '--expected-current-hash'),
            });
            if (json)
                console.log(JSON.stringify({ operation, changePath, allowlist: cleared }, null, 2));
            else
                this.success(`Loop allowlist cleared for ${changePath}.`);
            return;
        }
        if (!operationArgs.includes('--from-task-graph')) {
            throw new Error(`loop allowlist ${operation} requires --from-task-graph.`);
        }
        let result;
        if (operation === 'apply') {
            const expectedCurrentHash = this.parseFlagValue(operationArgs, '--expected-current-hash');
            const expectedCandidateHash = this.parseFlagValue(operationArgs, '--expected-candidate-hash');
            if (!expectedCurrentHash || !expectedCandidateHash) {
                throw new Error('loop allowlist apply requires --expected-current-hash and --expected-candidate-hash from a fresh derive/check result.');
            }
            result = await services_1.services.loopService.applyAllowlist(changePath, {
                expectedCurrentHash,
                expectedCandidateHash,
                expectedTaskGraphHash: this.parseFlagValue(operationArgs, '--expected-task-graph-hash'),
                approveExpansion: operationArgs.includes('--approve-expansion'),
            });
        }
        else {
            result = operation === 'check'
                ? await services_1.services.loopService.checkAllowlist(changePath)
                : await services_1.services.loopService.deriveAllowlist(changePath);
        }
        if (json) {
            console.log(JSON.stringify({ operation, changePath, ...result }, null, 2));
            return;
        }
        console.log(`Allowlist ${operation}: current=${result.currentHash} candidate=${result.candidateHash} task-graph=${result.taskGraphHash}`);
        console.log(`Status: matches=${result.matchesCurrent ? 'yes' : 'no'} expansion=${result.hasExpansion ? 'yes' : 'no'} applicable=${result.canApply ? 'yes' : 'no'}`);
        this.printAllowlistDiff(result.diff);
        if (result.issues.length > 0) {
            console.log('Issues:');
            for (const issue of result.issues)
                console.log(`  - ${issue}`);
        }
        if (operation !== 'apply') {
            console.log(`Apply with: ospec loop allowlist apply "${changePath}" --from-task-graph --expected-current-hash ${result.currentHash} --expected-candidate-hash ${result.candidateHash} --expected-task-graph-hash ${result.taskGraphHash}${result.hasExpansion ? ' --approve-expansion' : ''}`);
        }
    }
    printAllowlistDiff(diff) {
        const command = (value) => typeof value === 'string' ? value : JSON.stringify(value);
        console.log(`Allowlist diff: paths +${diff.addedPaths.length}/-${diff.removedPaths.length}, commands +${diff.addedCommands.length}/-${diff.removedCommands.length}`);
        for (const value of diff.addedPaths)
            console.log(`  + path ${value}`);
        for (const value of diff.removedPaths)
            console.log(`  - path ${value}`);
        for (const value of diff.addedCommands)
            console.log(`  + command ${command(value)}`);
        for (const value of diff.removedCommands)
            console.log(`  - command ${command(value)}`);
    }
    async heartbeat(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const actionItemId = this.parseFlagValue(args, '--action-item');
        if (!actionItemId)
            throw new Error('loop heartbeat requires --action-item <id>.');
        const executorId = this.parseFlagValue(args, '--executor');
        if (!executorId)
            throw new Error('loop heartbeat requires --executor <child-id>.');
        const leaseValue = this.parseFlagValue(args, '--lease-ms');
        const leaseMs = leaseValue === undefined ? undefined : Number(leaseValue);
        if (leaseMs !== undefined && (!Number.isInteger(leaseMs) || leaseMs <= 0)) {
            throw new Error('--lease-ms must be a positive integer.');
        }
        const changePath = await this.resolveChangePath(inputPath);
        const heartbeat = {
            actionItemId,
            executorId,
            leaseMs,
        };
        const state = await services_1.services.loopService.heartbeatExecution(changePath, heartbeat);
        this.success(`Loop heartbeat recorded for ${actionItemId}; pending=${state.pendingControllerAction?.actionId || 'none'}.`);
    }
    async recordResult(args, finalize = false) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const actionItemId = this.parseFlagValue(args, '--action-item');
        if (!actionItemId)
            throw new Error(`loop ${finalize ? 'finalize' : 'result'} requires --action-item <id>.`);
        const executorId = this.parseFlagValue(args, '--executor');
        if (!executorId)
            throw new Error(`loop ${finalize ? 'finalize' : 'result'} requires --executor <child-id>.`);
        const exitValue = this.parseFlagValue(args, '--exit-code');
        // F5: negative codes are legitimate. A harness that never started the
        // child reports -1, and rejecting it forced callers to lie with a 1.
        const exitCode = exitValue === undefined ? null : Number(exitValue);
        if (exitCode !== null && !Number.isInteger(exitCode))
            throw new Error('--exit-code must be an integer.');
        const signalValue = this.parseFlagValue(args, '--signal');
        const signal = signalValue === undefined ? undefined : signalValue.trim();
        if (signal !== undefined && signal.length === 0)
            throw new Error('--signal requires a signal name.');
        const tokenValue = this.parseFlagValue(args, '--tokens-used');
        const tokensUsed = tokenValue === undefined ? undefined : Number(tokenValue);
        if (tokensUsed !== undefined && (!Number.isFinite(tokensUsed) || tokensUsed < 0)) {
            throw new Error('--tokens-used must be a non-negative number.');
        }
        const changePath = await this.resolveChangePath(inputPath);
        const result = {
            actionItemId,
            executorId,
            exitCode,
            timedOut: args.includes('--timed-out'),
            signal: signal ?? null,
            infraFailure: args.includes('--infra-failure'),
            tokensUsed,
            summary: this.parseFlagValue(args, '--summary'),
        };
        const state = finalize
            ? await services_1.services.loopService.finalizeExecutionItem(changePath, result)
            : await services_1.services.loopService.recordExecutionResults(changePath, [result]);
        this.success(`Loop ${finalize ? 'finalize' : 'result'} recorded for ${actionItemId}; pending=${state.pendingControllerAction?.actionId || 'none'}.`);
    }
    async recover(args) {
        const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.recoverExpiredActions(changePath, { force: args.includes('--force') });
        this.success(`Loop recovery complete; pending=${state.pendingControllerAction?.actionId || 'none'}, no-progress=${state.noProgressCount}.`);
    }
    async resolveChangePath(inputPath) {
        const cwd = process.cwd();
        const config = await services_1.services.configManager.loadConfigOrNull(cwd);
        const candidatePath = inputPath
            ? (path.isAbsolute(inputPath) ? inputPath : (0, ProjectLayout_1.resolveManagedInputPath)(cwd, inputPath, config))
            : cwd;
        const resolved = path.resolve(candidatePath);
        if (await services_1.services.fileService.exists(path.join(resolved, constants_1.FILE_NAMES.STATE))) {
            return resolved;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(resolved);
        if (activeNames.length === 0) {
            throw new Error('No active change found. Pass a change path or run from a project with one active change.');
        }
        if (activeNames.length > 1) {
            throw new Error(`Multiple active changes found: ${activeNames.join(', ')}. Pass one change path explicitly.`);
        }
        const projectConfig = await services_1.services.configManager.loadConfigOrNull(resolved);
        return (0, ProjectLayout_1.resolveManagedPath)(resolved, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, projectConfig);
    }
}
exports.LoopCommand = LoopCommand;
