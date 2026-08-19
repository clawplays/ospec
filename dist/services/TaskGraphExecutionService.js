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
exports.TaskGraphExecutionService = exports.GIT_OUTPUT_LIMIT_BYTES = exports.REVIEW_PACKAGE_DIFF_LIMIT_BYTES = exports.GIT_KILL_GRACE_MS = exports.GIT_COMMAND_TIMEOUT_MS = exports.STALE_LOCK_STEAL_RECHECK_MS = void 0;
exports.registerHeldLease = registerHeldLease;
exports.releaseHeldLease = releaseHeldLease;
exports.runWithHeldLease = runWithHeldLease;
exports.getActiveHeldLeases = getActiveHeldLeases;
exports.markHeldLeaseWedged = markHeldLeaseWedged;
exports.isHeldLeaseWedged = isHeldLeaseWedged;
exports.touchLeasesSync = touchLeasesSync;
exports.touchActiveLeasesSync = touchActiveLeasesSync;
exports.createTaskGraphExecutionService = createTaskGraphExecutionService;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const syncFs = __importStar(require("fs"));
const crypto_1 = require("crypto");
const async_hooks_1 = require("async_hooks");
const childProcess = require("child_process");
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const structuredReports_1 = require("../utils/structuredReports");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const ShellQuote_1 = require("../utils/ShellQuote");
const ChecklistScan_1 = require("../utils/ChecklistScan");
const WorkflowProfile_1 = require("../utils/WorkflowProfile");
const CapabilityProbeService_1 = require("./CapabilityProbeService");
const RuntimeExecutionAdapterService_1 = require("./RuntimeExecutionAdapterService");
const EXECUTION_SESSION_FILE = 'execution-session.json';
const VERIFICATION_EVIDENCE_FILE = 'verification-evidence.json';
const VERIFICATION_REQUIREMENTS_FILE = 'verification-requirements.json';
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
const RUNTIME_ADAPTER_CACHE_FILE = 'runtime-adapter-cache.json';
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
const WORKER_REPORTS_DIR = 'worker-reports';
const REVIEW_PACKAGES_DIR = 'review-packages';
const EXECUTION_METRICS_FILE = 'execution-metrics.json';
const USAGE_SIDECARS_DIR = 'usage';
const REVIEW_DISPATCHES_DIR = 'review-dispatches';
const PLANNING_PREFLIGHTS_DIR = 'planning-preflights';
const CURRENT_REVIEW_DISPATCHES_FILE = 'current-review-dispatches.json';
const REPAIR_WAVES_DIR = 'repair-waves';
const DESIGN_DOCUMENT_REVIEW_FILE = 'design-review.md';
const IMPLEMENTATION_PLAN_DOCUMENT_REVIEW_FILE = 'implementation-plan-review.md';
const PLANNING_REVIEW_FILE = 'planning-review.md';
const PLANNING_REPAIR_FILE = 'planning-repair.json';
const PLANNING_REPAIR_PACKET_FILE = 'planning-repair.md';
const PLANNING_REPAIR_BASELINE_DIR = 'planning-repair-baseline';
const PLANNING_CONTRACT_VERSION = '1.9.0-planning-review-v1';
const PLANNING_SNAPSHOT_CONTRACT = 'planning-semantic-v1';
const PLANNING_REVIEW_BLOCKING_SEVERITIES = new Set(['critical', 'high', 'unknown']);
const MAX_UNEXPLAINED_TASK_TARGETS = 6;
const VERIFICATION_EVIDENCE_DIR = 'verification-evidence';
const VERIFICATION_ACTIONS_DIR = 'verification-actions';
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
const TASK_GRAPH_MUTATION_LOCK_FILE = 'task-graph-mutation.lock';
const GOAL_PROGRESS_PROJECTION_FILE = 'progress-projection.json';
const TASK_GRAPH_MUTATION_LOCK_TIMEOUT_MS = 30 * 1000;
const TASK_GRAPH_MUTATION_LOCK_HEARTBEAT_MS = 30 * 1000;
// Four missed heartbeats. The threshold was briefly six, because a blocking
// git call could close a two-minute window and make "stale" and "busy"
// indistinguishable. Git no longer blocks the event loop, cannot wait on stdin
// and cannot outlive GIT_COMMAND_TIMEOUT_MS, so the recheck below -- not the
// threshold -- is what separates slow from dead. Paying another minute of
// post-crash recovery latency for a distinction the recheck already makes is
// the wrong trade.
const STALE_TASK_GRAPH_MUTATION_LOCK_MS = 4 * TASK_GRAPH_MUTATION_LOCK_HEARTBEAT_MS;
// Before deleting a lock judged stale, wait and look again: a holder that is
// merely slow moves the mtime within one heartbeat, and a dead one never will.
exports.STALE_LOCK_STEAL_RECHECK_MS = 5 * 1000;
// spawnSync closed the child's stdin and capped its output. Async spawn does
// neither, so both have to be restored explicitly here: without a bound, a git
// that waits on input or never exits holds the mutation lease forever, which is
// a worse failure than the race P0-6 set out to fix. Sized for the slowest real
// call (`git worktree add` on a large repo), not the typical one.
exports.GIT_COMMAND_TIMEOUT_MS = 4 * 60 * 1000;
// How long a killed git child may keep the lease alive before the operation is
// declared wedged and the lease stops being refreshed.
exports.GIT_KILL_GRACE_MS = 5 * 1000;
// Same limit the review package already applies to untracked file content.
exports.REVIEW_PACKAGE_DIFF_LIMIT_BYTES = 256 * 1024;
// F25: the hard memory ceiling on what a single git call may accumulate.
// `REVIEW_PACKAGE_DIFF_LIMIT_BYTES` bounds only what is *written* to the review
// artifact; the whole diff was still materialised in the heap first, so
// removing spawnSync's 1 MB `maxBuffer` left the accumulation itself unbounded.
// 8 MB is deliberately eight times that old maxBuffer: every call that
// succeeded under spawnSync (anything up to 1 MB, past which spawnSync returned
// ENOBUFS) still comes back whole, while a runaway `git diff` costs a bounded
// amount of memory instead of the repository's worth. Overshoot is at most one
// stream chunk, because a chunk is admitted or dropped as a unit -- slicing it
// by bytes could sever a UTF-8 codepoint.
exports.GIT_OUTPUT_LIMIT_BYTES = 8 * 1024 * 1024;
// ---------------------------------------------------------------------------
// Evidence-validation scope
// ---------------------------------------------------------------------------
//
// Validating one task's review evidence re-reads the review artifact, its
// dispatch record and its findings, SHA-256s every target file and spawns
// `git rev-parse HEAD`. The controller does that for every non-PENDING task on
// every tick, so a 15-task Goal paid ~15 git processes per tick to re-derive an
// answer that had not changed.
//
// Phase 3 attacked that from two directions: batching the sweep (a bounded
// fan-out plus one shared scope, so HEAD is resolved once for all of it) and an
// on-disk cache of the verdicts themselves. Only the first survives.
//
// The disk cache is gone, deliberately. Its first shape stamped `(kind,
// mtimeMs, size)` *after* the validation had already read its inputs, which
// meant a write landing in the read->stamp window was recorded as the validated
// state and served `ready: true` for bytes that were never validated; and the
// stamp itself was forgeable without any clock games, because `tar -x`, `unzip`,
// `cp -p`, `rsync --times` and "restore previous version" all rewrite content
// while restoring the mtime, and a same-length rewrite (`APPROVED` ->
// `REJECTED`) keeps the size too. Keying entries on a SHA-256 of the bytes each
// validation actually read closed both -- and made a HIT re-read and re-hash
// every input before believing it, which is nearly all the work a miss does.
//
// Measured on this tree, the split between batching and caching over the whole
// `archive --check` win was a median 97% / 3%, range -0% to 9%: the cache's
// contribution was inside the run-to-run noise. A permanently-maintained
// staleness hazard that buys nothing is not worth keeping, so what is left here
// is the batching -- and the per-scope `git rev-parse HEAD` memo below, which
// recomputes rather than persists and therefore cannot go stale across runs.
//
// Which usage sidecars have already been folded into the execution metrics.
// Derived, never read by an agent, and a total miss when missing or corrupt.
const USAGE_INGEST_WATERMARK_FILE = 'usage-ingest-watermark.json';
const USAGE_INGEST_WATERMARK_VERSION = '1.0';
const validationScopeStorage = new async_hooks_1.AsyncLocalStorage();
// git subcommands that cannot move HEAD. Anything not listed drops the
// memoised HEAD rather than assuming it survived.
const HEAD_PRESERVING_GIT_SUBCOMMANDS = new Set([
    'rev-parse',
    'status',
    'diff',
    'log',
    'show',
    'ls-files',
    'ls-tree',
    'cat-file',
    'config',
    'rev-list',
    'symbolic-ref',
    'name-rev',
    'describe',
    'blame',
]);
const heldLeases = new Map();
// Which leases cover the operation currently running. Refreshing every lease
// the process holds is a lie in the other direction: unrelated git work on a
// second change would keep a genuinely wedged lease alive forever, so it could
// never be stolen and never released. Async context tracks who the caller
// actually is, so only the leases wrapping this call get refreshed.
const activeLeaseStack = new async_hooks_1.AsyncLocalStorage();
function registerHeldLease(lockPath, nonce) {
    const lease = { lockPath, nonce };
    heldLeases.set(lease, { wedged: false });
    return lease;
}
function releaseHeldLease(lease) {
    heldLeases.delete(lease);
}
/** Run `operation` with `lease` marked as covering it (nested leases stack). */
function runWithHeldLease(lease, operation) {
    const covering = activeLeaseStack.getStore();
    return activeLeaseStack.run(covering ? [...covering, lease] : [lease], operation);
}
function getActiveHeldLeases() {
    return activeLeaseStack.getStore() || [];
}
// A lease whose operation is wedged must stop being refreshed, or the lock it
// guards is immortal: `confirm*LockStillStale` keeps seeing the mtime move and
// nobody can ever recover the change. Stopping the refresh is what turns an
// unrecoverable deadlock back into a stealable stale lock.
// F26: wedged is one-way for the life of the lease. There is deliberately no
// `clearHeldLeaseWedged`. The `close` handler in `runGit` used to call one for
// every covering lease on every successful exit, and a timeout is normally
// swallowed upstream (`readGitOutput` returns null on `!ok` and ~30 call sites
// then do `|| ''`), so the operation carried on and the very next successful
// git call un-wedged the lease -- while the zombie child that wedged it was
// still running and still holding whatever it was holding. That made the lock
// immortal again, which is the single failure this flag exists to prevent. A
// later success proves nothing about the child that is still wedged, so only
// ending the lease clears the state: `releaseHeldLease` drops the entry, and
// the owner's `finally` in `withTaskGraphMutationLease` always reaches it.
function markHeldLeaseWedged(lease) {
    const state = heldLeases.get(lease);
    if (state)
        state.wedged = true;
}
function isHeldLeaseWedged(lease) {
    return heldLeases.get(lease)?.wedged === true;
}
function touchLeasesSync(leases) {
    if (leases.length === 0)
        return;
    const now = new Date();
    for (const lease of leases) {
        // Released, or wedged: neither is ours to keep alive.
        if (!heldLeases.has(lease) || isHeldLeaseWedged(lease))
            continue;
        try {
            // Only refresh a lock this process still owns: after a steal the
            // file belongs to someone else and extending it would be a lie.
            if (JSON.parse(syncFs.readFileSync(lease.lockPath, 'utf8'))?.nonce !== lease.nonce)
                continue;
            syncFs.utimesSync(lease.lockPath, now, now);
        }
        catch {
            // A lock that cannot be read or touched is not ours to refresh.
        }
    }
}
function touchActiveLeasesSync() {
    touchLeasesSync(getActiveHeldLeases());
}
function emptyExecutionUsage() {
    return {
        inputTokens: null,
        cachedInputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        toolCalls: null,
        turns: null,
        elapsedMs: null,
        observedFields: [],
        source: 'aggregate',
        coverage: 'none',
    };
}
function addExecutionUsage(left, right) {
    const addKnown = (leftValue, rightValue) => {
        if (leftValue === null)
            return rightValue;
        if (rightValue === null)
            return leftValue;
        return leftValue + rightValue;
    };
    return {
        inputTokens: addKnown(left.inputTokens, right.inputTokens),
        cachedInputTokens: addKnown(left.cachedInputTokens, right.cachedInputTokens),
        outputTokens: addKnown(left.outputTokens, right.outputTokens),
        reasoningTokens: addKnown(left.reasoningTokens, right.reasoningTokens),
        toolCalls: addKnown(left.toolCalls, right.toolCalls),
        turns: addKnown(left.turns, right.turns),
        elapsedMs: addKnown(left.elapsedMs, right.elapsedMs),
        observedFields: Array.from(new Set([...left.observedFields, ...right.observedFields])).sort(),
        source: 'aggregate',
        coverage: left.coverage === 'none'
            ? right.coverage
            : right.coverage === 'none'
                ? left.coverage
                : left.coverage === 'complete' && right.coverage === 'complete'
                    ? 'complete'
                    : 'partial',
    };
}
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
        decision: normalizeReviewDecisionValue(rawReview.decision),
        reviewArtifactPath: typeof rawReview.review_artifact === 'string' && rawReview.review_artifact.trim().length > 0
            ? rawReview.review_artifact.trim()
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
            dispatchWorkers: 'Use runtimeAdapter.selected.nativeSubagent from the launch artifact. Dispatch one Codex spawn_agent child per parallel-safe packet and never start codex exec as a fallback.',
            recordCompletion: 'Record each worker outcome with ospec execute complete <task-id> and one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
        },
        gpt: {
            target,
            readContext: 'Use ChatGPT/Codex harness file reads and search to inspect proposal.md, design.md, implementation-plan.md, tasks.md, bootstrap.md, and the dispatch packet before spawning an agent.',
            editFiles: 'Spawn a native worker agent when the harness exposes agent tools; keep edits scoped to the dispatch packet target files unless evidence proves the scope is wrong.',
            runCommands: 'Let the worker run only task-required verification commands and report evidence back to the controller.',
            trackPlan: 'Use the active OSpec task graph as durable state even if the harness has its own plan UI.',
            dispatchWorkers: 'Use runtimeAdapter.selected.nativeSubagent from the launch artifact. In Codex-compatible sessions use spawn_agent plus wait_agent; stop when native capability is unavailable.',
            recordCompletion: 'Record worker outcomes with ospec execute complete <task-id> and one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
        },
        claude: {
            target,
            readContext: 'Read the same OSpec change files and generated packets before using any edit or task tool.',
            editFiles: 'Use the available file edit tool with narrow diffs and keep packet target files as the default scope.',
            runCommands: 'Use shell commands only for explicit verification or inspection, then record OSpec evidence artifacts.',
            trackPlan: 'Use the local plan/task tracking tool if present, but keep artifacts/agents/task-graph.json as the durable source of truth.',
            dispatchWorkers: 'Use Claude Code Task only when runtimeAdapter confirms a current native capability; stop instead of starting the Claude CLI.',
            recordCompletion: 'Update review/evidence artifacts and run ospec execute complete or ospec execute sync after each worker or reviewer result.',
        },
        gemini: {
            target,
            readContext: 'Read OSpec change files and packet contents before invoking Gemini CLI subagents.',
            editFiles: 'Use Gemini native subagents for implementation work; keep target files scoped to the packet.',
            runCommands: 'Let the subagent run task verification through Gemini CLI tools and report exact command results.',
            trackPlan: 'Keep Gemini task tracking secondary to artifacts/agents/task-graph.json and worker-status.md.',
            dispatchWorkers: 'Use @generalist when runtimeAdapter confirms a current native capability; stop instead of starting an external Gemini process.',
            recordCompletion: 'Record each @generalist result with ospec execute complete, using NEEDS_CONTEXT or BLOCKED when the subagent escalates.',
        },
        grok: {
            target,
            readContext: 'Use Grok Build file reads and search to inspect proposal.md, design.md, implementation-plan.md, tasks.md, bootstrap.md, and the dispatch packet before spawning a subagent.',
            editFiles: 'Spawn a worker subagent for scoped edits; keep the worker write scope limited to the dispatch packet target files unless the packet evidence proves the scope is wrong.',
            runCommands: 'Let the subagent run only the verification commands required for the task or change, then record evidence with ospec execute tdd/debug/verify as appropriate.',
            trackPlan: 'Use the active task graph as durable state; keep OSpec artifacts synchronized with ospec execute sync after manual artifact edits.',
            dispatchWorkers: 'Use runtimeAdapter.selected.nativeSubagent from the launch artifact. Dispatch one spawn_subagent child per parallel-safe packet and collect results with get_command_or_subagent_output; never start a grok CLI process as a fallback.',
            recordCompletion: 'Record each subagent outcome with ospec execute complete <task-id> and one of DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
        },
        opencode: {
            target,
            readContext: 'Read OSpec change files and packet contents before using OpenCode native agents.',
            editFiles: 'Use OpenCode native @mention agent dispatch for scoped worker edits; keep packet target files as the default write set.',
            runCommands: 'Let the OpenCode agent run only required verification and return evidence.',
            trackPlan: 'Keep OpenCode task state secondary to OSpec artifacts.',
            dispatchWorkers: 'Use native @mention when runtimeAdapter confirms a current capability; no OpenCode CLI fallback is allowed.',
            recordCompletion: 'Record each native agent result with ospec execute complete and sync worker status.',
        },
        cursor: {
            target,
            readContext: 'Load the OSpec change files, using-ospec hook artifact, and dispatch packet into Cursor Agent context before editing.',
            editFiles: 'Use Cursor Agent or task/chat handoff for scoped edits; keep packet target files as the default write set.',
            runCommands: 'Run only packet verification commands through the Cursor-controlled terminal or record why they could not run.',
            trackPlan: 'Keep Cursor plan/chat state secondary to artifacts/agents/task-graph.json and worker-status.md.',
            dispatchWorkers: 'Use Cursor-native agent/task handoff only when its current capability is verified; otherwise stop before dispatch.',
            recordCompletion: 'Record Cursor worker results with ospec execute complete, and use NEEDS_CONTEXT or BLOCKED when the agent needs a user or environment decision.',
        },
        copilot: {
            target,
            readContext: 'Load the dispatch packet and core OSpec change artifacts into GitHub Copilot CLI or Copilot coding-agent context before editing.',
            editFiles: 'Use Copilot coding-agent/task context for scoped edits; keep packet target files as the default write set.',
            runCommands: 'Run packet verification commands only when the Copilot harness exposes an approved terminal or CI handoff.',
            trackPlan: 'Keep Copilot task state secondary to OSpec artifacts and record every accepted result back into OSpec.',
            dispatchWorkers: 'Use Copilot-native task/agent handoff only when its current capability is verified; otherwise stop before dispatch.',
            recordCompletion: 'Record Copilot results with ospec execute complete and keep review/verification evidence aligned.',
        },
        shell: {
            target,
            readContext: 'Open the listed OSpec files and generated packet manually before changing source files.',
            editFiles: 'Edit only the files listed in the packet unless you update the task graph or record a concern.',
            runCommands: 'Run the listed verification commands yourself; OSpec evidence commands record results after commands have already run.',
            trackPlan: 'Use artifacts/agents/task-graph.json, worker-status.md, and verification.md as the manual progress ledger.',
            dispatchWorkers: 'Shell has no native subagent API. Runtime adapter resolution keeps ordinary work serial and blocks independent review when no independent executor is available.',
            recordCompletion: 'Use ospec execute complete, review, tdd, debug, verify, and sync to record outcomes.',
        },
        generic: {
            target,
            readContext: 'Read all core change documents and generated agent artifacts before implementation or review work.',
            editFiles: 'Keep edits scoped to the task packet and record deviations as concerns.',
            runCommands: 'Run required verification outside OSpec, then record the result as evidence.',
            trackPlan: 'Treat OSpec artifacts as the durable state layer even when another tool has its own local plan.',
            dispatchWorkers: 'This target has no registered native subagent primitive and cannot execute OSpec worker packets.',
            recordCompletion: 'Record every task, review, verification, TDD, or debug result back into OSpec artifacts.',
        },
    };
    return {
        ...mappings[target],
        readContext: 'Read the generated packet first. Run `ospec docs locate --affects <path>` (or `--feature <slug>`) to get the one section that describes the existing behavior, and `ospec index query <keyword...>` when you only have a keyword; then open only that section, not the whole document.',
    };
}
function resolveWorkerModel(profile, target, modelProfiles = {}) {
    const config = modelProfiles[profile];
    const targetModel = config?.targets?.[target]?.trim() || '';
    const defaultModel = config?.default?.trim() || '';
    const configuredModel = targetModel || defaultModel;
    const configurationSource = targetModel ? 'target' : defaultModel ? 'default' : 'harness-default';
    return {
        modelProfile: profile,
        model: configuredModel || null,
        modelSelectionSource: configuredModel ? 'configured' : 'harness-default',
        modelConfigurationSource: configurationSource,
        requestedModel: configuredModel || null,
        configuredModel: configuredModel || null,
    };
}
function resolveWorkerProfileForTarget(profile, target, modelProfiles) {
    return {
        ...profile,
        resolvedTarget: target,
        targetToolMapping: buildWorkerTargetToolMapping(target),
        ...resolveWorkerModel(profile.modelProfile, target, modelProfiles),
    };
}
function buildWorkerProfile(task, modelProfiles = {}, modelProfileOverride) {
    const role = task.workerRole.trim() || 'implementer';
    const roleKey = role.toLowerCase();
    const searchableText = [
        roleKey,
        task.title,
        ...task.targetFiles,
        task.expectedResult,
    ].join(' ').toLowerCase();
    if (roleKey.includes('reviewer')) {
        const recommendedTarget = 'generic';
        return {
            role,
            recommendedTarget,
            capabilityTier: 'review',
            summary: 'Independent reviewer for implementation correctness and quality gates.',
            rationale: [
                'Review work should be independent from the implementer to catch requirement and code-quality drift.',
                'The worker must produce evidence-backed findings instead of making hidden fixes.',
            ],
            requiredBehavior: [
                'Read the scoped review packet and worker evidence first; open other artifacts only for a named verification gap.',
                'Update the requested review artifact with findings and a clear decision.',
                'Stay independent and read-only: do not change implementation files or accept controller-provided severity downgrades.',
            ],
            targetToolMapping: buildWorkerTargetToolMapping(recommendedTarget),
            ...resolveWorkerModel(modelProfileOverride || 'review', recommendedTarget, modelProfiles),
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
    const mechanical = docsOnly
        && !strongReasoning
        && task.targetFiles.length <= 2
        && task.verificationCommands.length <= 1;
    const recommendedTarget = docsOnly ? 'generic' : 'codex';
    const capabilityTier = mechanical ? 'mechanical' : strongReasoning ? 'strong-reasoning' : 'standard';
    const modelProfile = modelProfileOverride
        || (capabilityTier === 'strong-reasoning' ? 'strong_reasoning' : capabilityTier);
    return {
        role,
        recommendedTarget,
        capabilityTier,
        summary: mechanical
            ? 'Mechanical worker for a narrow documentation-only task with a focused verification boundary.'
            : strongReasoning
                ? 'Implementation worker with stronger reasoning for cross-cutting or risky task boundaries.'
                : 'Implementation worker for scoped, low-conflict task execution.',
        rationale: [
            docsOnly
                ? 'Target files are documentation-only, so a generic document-capable worker is sufficient.'
                : 'Target files include implementation or configuration surfaces that benefit from a coding agent.',
            mechanical
                ? 'The task is documentation-only, narrow, and has no cross-cutting risk signal.'
                : strongReasoning
                    ? 'The task has dependency, conflict, breadth, or domain-risk signals that require extra reasoning before editing.'
                    : 'The task has a narrow scope and limited coordination risk.',
        ],
        requiredBehavior: [
            'Read the dispatch packet first; it is the task brief. Open only the specific core document or indexed knowledge file needed to resolve a named ambiguity.',
            'Keep edits scoped to target files unless the packet evidence proves the scope is wrong.',
            'Run the listed verification commands or record why they could not be run before completion.',
            'Self-review the implementation before returning status; use DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED when the result is not clean.',
        ],
        targetToolMapping: buildWorkerTargetToolMapping(recommendedTarget),
        ...resolveWorkerModel(modelProfile, recommendedTarget, modelProfiles),
    };
}
function buildReviewerWorkerProfile(role, modelProfiles, modelProfile = 'review') {
    return buildWorkerProfile({
        id: `${modelProfile}-worker`,
        title: modelProfile === 'final_review' ? 'Combined final review' : 'Independent review',
        status: 'PENDING',
        dependsOn: [],
        parallelizable: false,
        serialReason: 'Independent review must use a fresh read-only reviewer context.',
        scopeReason: null,
        conflictsWith: [],
        targetFiles: [],
        verificationCommands: [],
        expectedResult: 'Evidence-backed independent review decision',
        context: '',
        interfaces: [],
        documentationUpdates: [],
        workerRole: role,
        review: null,
    }, modelProfiles, modelProfile);
}
function normalizeTask(rawTask, index, modelProfiles = {}) {
    const id = typeof rawTask?.id === 'string' && rawTask.id.trim().length > 0
        ? rawTask.id.trim()
        : `tasks[${index}]`;
    const normalizedTask = {
        id,
        title: typeof rawTask?.title === 'string' && rawTask.title.trim().length > 0 ? rawTask.title.trim() : id,
        status: normalizeStatus(rawTask?.status) || 'PENDING',
        dependsOn: stringArray(rawTask?.depends_on),
        parallelizable: rawTask?.parallelizable === true,
        serialReason: typeof rawTask?.serial_reason === 'string' && rawTask.serial_reason.trim()
            ? rawTask.serial_reason.trim()
            : null,
        scopeReason: typeof rawTask?.scope_reason === 'string' && rawTask.scope_reason.trim()
            ? rawTask.scope_reason.trim()
            : null,
        conflictsWith: stringArray(rawTask?.conflicts_with),
        targetFiles: stringArray(rawTask?.target_files),
        verificationCommands: stringArray(rawTask?.verification_commands),
        expectedResult: typeof rawTask?.expected_result === 'string' ? rawTask.expected_result.trim() : '',
        context: typeof rawTask?.context === 'string' ? rawTask.context.trim() : '',
        interfaces: stringArray(rawTask?.interfaces),
        documentationUpdates: stringArray(rawTask?.documentation_updates),
        workerRole: typeof rawTask?.worker_role === 'string' && rawTask.worker_role.trim().length > 0
            ? rawTask.worker_role.trim()
            : 'implementer',
        review: normalizeTaskReview(rawTask?.review),
    };
    return {
        ...normalizedTask,
        workerProfile: buildWorkerProfile(normalizedTask, modelProfiles),
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
function parseGitDispatchSnapshot(output) {
    const lines = output.split(/\r?\n/).filter(line => line.length > 0);
    const oidLine = lines.find(line => line.startsWith('# branch.oid '));
    const rawOid = oidLine?.slice('# branch.oid '.length).trim() || '';
    if (rawOid === '(initial)') {
        return { headCommit: null, workspaceDirty: null };
    }
    if (!rawOid)
        return null;
    return {
        headCommit: rawOid,
        workspaceDirty: lines.some(line => /^(?:1 |2 |u |\? )/.test(line)),
    };
}
function parseGitStatusV2Entries(output) {
    const normalizeCode = (value) => value.replace(/\./g, ' ').trim() || '??';
    return output
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .filter(line => line.length > 0 && !line.startsWith('# '))
        .map(line => {
        if (line.startsWith('? '))
            return { code: '??', file: line.slice(2).trim() };
        if (line.startsWith('! '))
            return { code: '!!', file: line.slice(2).trim() };
        const ordinary = line.match(/^1 (\S+) \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/);
        if (ordinary)
            return { code: normalizeCode(ordinary[1]), file: ordinary[2].trim() };
        const renamed = line.match(/^2 (\S+) \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/);
        if (renamed)
            return { code: normalizeCode(renamed[1]), file: renamed[2].split('\t')[0].trim() };
        const unmerged = line.match(/^u (\S+) \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/);
        if (unmerged)
            return { code: normalizeCode(unmerged[1]), file: unmerged[2].trim() };
        return null;
    })
        .filter((entry) => Boolean(entry?.file));
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
    constructor(fileService, runtimeAdapterService = new RuntimeExecutionAdapterService_1.RuntimeExecutionAdapterService()) {
        this.fileService = fileService;
        this.runtimeAdapterService = runtimeAdapterService;
        this.reportDocumentLanguageCache = new Map();
    }
    /**
     * Optimistic review gating lets dependents dispatch while an upstream
     * task review is still pending; the task's own review requirement and the
     * final-review gate still require every task review to be approved.
     * Strict remains the default and is unchanged for classic changes, which
     * have no loop configuration.
     */
    async readLoopReviewGating(changePath) {
        try {
            const configPath = path.join(changePath, 'artifacts', 'loop', 'loop.json');
            if (!(await this.fileService.exists(configPath)))
                return 'strict';
            const config = await this.fileService.readJSON(configPath);
            return config?.efficiency?.reviewGating === 'optimistic' ? 'optimistic' : 'strict';
        }
        catch {
            return 'strict';
        }
    }
    async getReport(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath))) {
            throw new Error(`Task graph not found at ${graphPath}`);
        }
        const graph = await this.fileService.readJSON(graphPath);
        const executionPolicy = await this.readWorkflowExecutionPolicy(resolvedChangePath);
        const reviewGating = await this.readLoopReviewGating(resolvedChangePath);
        const tasks = Array.isArray(graph.tasks)
            ? graph.tasks.map((task, index) => normalizeTask(task, index, executionPolicy.modelProfiles))
            : [];
        const taskById = new Map(tasks.map(task => [task.id, task]));
        const blockerByTaskId = new Map(await Promise.all(tasks
            .filter(task => BLOCKING_TASK_STATUSES.has(task.status))
            .map(async (task) => [task.id, await this.readLatestBlockerEscalation(resolvedChangePath, task.id)])));
        const taskIdCounts = tasks.reduce((counts, task) => {
            counts.set(task.id, (counts.get(task.id) || 0) + 1);
            return counts;
        }, new Map());
        const artifactIdOwners = new Map();
        for (const task of tasks) {
            const artifactId = this.toFileSafeId(task.id) || 'task';
            const owners = artifactIdOwners.get(artifactId) || new Set();
            owners.add(task.id);
            artifactIdOwners.set(artifactId, owners);
        }
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
        const graphContract = String(graph.contract_version || graph.version || '').trim();
        const [contractMajor, contractMinor, contractPatch] = graphContract.split('.').map(Number);
        const requiresSerialReason = Number.isFinite(contractMajor)
            && (contractMajor > 1 || (contractMajor === 1 && (contractMinor > 8 || (contractMinor === 8 && contractPatch >= 6))));
        const requiresScopeReason = Number.isFinite(contractMajor)
            && (contractMajor > 1 || (contractMajor === 1 && (contractMinor > 8 || (contractMinor === 8 && contractPatch >= 5))));
        for (const task of tasks) {
            const reasons = [];
            if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(task.id)) {
                reasons.push(`invalid_task_id:${task.id || '(missing)'}`);
            }
            if ((taskIdCounts.get(task.id) || 0) > 1) {
                reasons.push(`duplicate_task_id:${task.id}`);
            }
            const artifactId = this.toFileSafeId(task.id) || 'task';
            if ((artifactIdOwners.get(artifactId)?.size || 0) > 1) {
                reasons.push(`artifact_id_collision:${artifactId}`);
            }
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
            if (requiresSerialReason && !task.parallelizable && !task.serialReason) {
                reasons.push('missing_serial_reason');
            }
            if (requiresScopeReason
                && task.targetFiles.length > MAX_UNEXPLAINED_TASK_TARGETS
                && !task.scopeReason) {
                reasons.push(`missing_scope_reason_for_broad_task:${task.targetFiles.length}_targets`);
            }
            for (const dependencyId of task.dependsOn) {
                const dependency = taskById.get(dependencyId);
                if (!dependency) {
                    reasons.push(`unknown_dependency:${dependencyId}`);
                    continue;
                }
                const deferredExternalBlocker = dependency.status === 'BLOCKED'
                    && blockerByTaskId.get(dependency.id)?.escalationReason === 'external_blocker'
                    && blockerByTaskId.get(dependency.id)?.deferredToFinalReview === true;
                if (!TERMINAL_TASK_STATUSES.has(dependency.status) && !deferredExternalBlocker) {
                    reasons.push(`waiting_for:${dependencyId}`);
                    continue;
                }
                if (!deferredExternalBlocker
                    && reviewGating !== 'optimistic'
                    && this.isTaskReviewRequired(dependency)) {
                    reasons.push(`waiting_for_task_review:${dependencyId}`);
                }
            }
            for (const runningTask of runningTasks) {
                if (tasksConflict(task, runningTask)) {
                    reasons.push(`conflicts_with_running:${runningTask.id}`);
                }
            }
            if (TERMINAL_TASK_STATUSES.has(task.status)) {
                if (this.isTaskReviewRequired(task)) {
                    reasons.push(`waiting_for_task_review:${task.id}`);
                }
            }
            if (reasons.some(reason => reason.startsWith('invalid_') || reason.startsWith('duplicate_') || reason.startsWith('artifact_id_collision:') || reason.startsWith('unknown_dependency:') || reason.startsWith('missing_'))) {
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
        const globalConstraints = stringArray(graph.global_constraints);
        const decisions = await this.readUserDecisionSnapshot(resolvedChangePath, feature);
        const dispatchableTasks = decisions.pendingRequired > 0 || decisions.blockers.length > 0
            ? []
            : this.selectDispatchableTasks(readyTasks, runningTasks);
        const dispatchableIds = new Set(dispatchableTasks.map(task => task.id));
        const scheduling = {
            readyCount: readyTasks.length,
            graphSafeCount: dispatchableTasks.length,
            serialWithoutReason: tasks
                .filter(task => !task.parallelizable && !task.serialReason)
                .map(task => task.id),
            deferred: readyTasks
                .filter(task => !dispatchableIds.has(task.id))
                .map(task => ({
                taskId: task.id,
                reasons: this.getSchedulingDeferralReasons(task, dispatchableTasks, runningTasks),
            })),
        };
        return {
            changePath: resolvedChangePath,
            graphPath,
            feature,
            globalConstraints,
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
            issues,
            scheduling,
            nextInstruction: this.getNextInstruction({
                issues,
                invalidTasks,
                decisions,
                dispatchableTasks,
                runningTasks,
                blockedTasks,
                completedTasks,
                taskCount: tasks.length,
            }),
        };
    }
    selectConflictSafeTasks(tasks, options = {}) {
        if (tasks.length === 0)
            return [];
        if (options.respectParallelizable !== false) {
            const parallel = tasks.filter(task => task.parallelizable);
            return parallel.length > 0 ? this.selectNonConflictingBatch(parallel) : tasks.slice(0, 1);
        }
        return this.selectNonConflictingBatch(tasks);
    }
    async dispatch(changePath, options = {}) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            return this.withArtifactMutationRollback({
                files: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
                    this.getSessionPath(resolvedChangePath),
                    path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                    this.getLaunchPlanPath(resolvedChangePath),
                    this.getLaunchPlanReportPath(resolvedChangePath),
                ],
                directories: [path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR)],
            }, () => this.dispatchUnlocked(resolvedChangePath, options));
        });
    }
    async dispatchUnlocked(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        await this.ingestReviewUsageSidecars(resolvedChangePath, await this.readFeatureName(resolvedChangePath));
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
        if (options.repairContext && options.taskId !== options.repairContext.taskId) {
            throw new Error(`Repair context for ${options.repairContext.taskId} requires an exact matching task dispatch.`);
        }
        const dispatchableTasks = options.taskId
            ? report.readyTasks.filter(task => task.id === options.taskId
                && (report.runningTasks.length === 0 || task.parallelizable)
                && report.runningTasks.every(runningTask => runningTask.parallelizable)
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
        const executionPolicy = await this.readWorkflowExecutionPolicy(resolvedChangePath);
        const controllerSession = await this.readLoopControllerSession(resolvedChangePath);
        const warnings = [...projectSession.warnings];
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const createdDispatches = [];
        const gitStatusResult = await this.runGit(projectRoot, [
            'status',
            '--porcelain=v2',
            '--branch',
            '--untracked-files=normal',
            '--no-renames',
            '--no-ahead-behind',
        ]);
        const gitSnapshot = gitStatusResult.ok
            ? parseGitDispatchSnapshot(gitStatusResult.stdout)
            : null;
        const fallbackHeadCommit = gitSnapshot ? null : await this.readGitOutput(projectRoot, ['rev-parse', 'HEAD']);
        const gitBaseCommit = gitSnapshot?.headCommit || fallbackHeadCommit;
        // Porcelain paths are relative to the command cwd, including when the
        // initialized OSpec project is nested below the repository root.
        const changeRelativeToGit = path.relative(projectRoot, resolvedChangePath).replace(/\\/g, '/').replace(/\/$/, '');
        const outsideCurrentChange = (entry) => {
            const files = entry.file.replace(/^"|"$/g, '').replace(/\\/g, '/').split(/\s+->\s+/);
            return files.some(file => !this.isGoalWorkspaceControlPath(file, changeRelativeToGit));
        };
        // F30: a truncated `git status` used to arrive here as a SHORTER list of
        // dirty files, and a short-enough one reads as a clean workspace. The
        // fallback path was worse still: `readGitOutput` returned the partial
        // string, `|| ''` could not tell it from "no output", and an empty
        // porcelain status means clean by definition. Truncation is therefore
        // resolved before either list is consulted, and it resolves to DIRTY --
        // 8 MB of porcelain status is tens of thousands of entries, so "the
        // workspace is dirty" is not merely the safe answer here, it is the
        // certain one.
        const fallbackStatus = !gitSnapshot && fallbackHeadCommit
            ? await this.readGitOutputWithTruncation(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all'])
            : null;
        const workspaceStatusTruncated = gitSnapshot
            ? gitStatusResult.stdoutTruncated === true
            : fallbackStatus?.truncated === true;
        if (workspaceStatusTruncated) {
            warnings.push(this.gitTruncationReason('git status while recording whether the workspace was dirty at dispatch')
                + ' The dispatch record marks the workspace dirty because a partial status cannot prove it clean.');
        }
        const workspaceDirtyAtDispatch = workspaceStatusTruncated
            ? true
            : gitSnapshot
                ? parseGitStatusV2Entries(gitStatusResult.stdout).some(outsideCurrentChange)
                : fallbackStatus
                    ? this.parseGitStatusEntries(fallbackStatus.text || '').some(outsideCurrentChange)
                    : null;
        const dispatchMetrics = [];
        for (const task of dispatchableTasks) {
            const actualTarget = controllerSession.controllerMode
                ? this.normalizeWorkerToolTarget(controllerSession.target)
                : this.normalizeWorkerToolTarget(task.workerProfile.targetToolMapping?.target || task.workerProfile.recommendedTarget);
            const workerProfile = resolveWorkerProfileForTarget(task.workerProfile, actualTarget, executionPolicy.modelProfiles);
            if (workerProfile.modelSelectionSource === 'harness-default') {
                warnings.push(`Task ${task.id} model profile ${workerProfile.modelProfile} has no configured model for actual target ${actualTarget}; the harness default will be used.`);
            }
            const dispatchId = `dispatch-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(task.id)}-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR, `${dispatchId}.json`);
            const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR, `${dispatchId}.md`);
            const record = {
                id: dispatchId,
                taskId: task.id,
                taskTitle: task.title,
                workerRole: task.workerRole,
                workerProfile,
                projectSession,
                status: 'DISPATCHED',
                assignedAt: now,
                completedAt: null,
                packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
                recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
                summary: null,
                gitBaseCommit,
                gitHeadAtCompletion: null,
                workspaceDirtyAtDispatch,
                documentationBaseline: await this.captureDocumentationSnapshots(projectRoot, task.documentationUpdates),
                ...(options.repairContext?.taskId === task.id ? { repairContext: options.repairContext } : {}),
            };
            await this.fileService.writeJSON(recordPath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildDispatchPacket(report, task, record));
            dispatchMetrics.push({
                kind: 'dispatch_packet',
                id: dispatchId,
                taskId: task.id,
                path: record.packetPath,
                recordedAt: now,
                durationMs: null,
                capabilityTier: workerProfile.capabilityTier,
                modelProfile: workerProfile.modelProfile,
                model: workerProfile.model,
                workflowStage: task.id.startsWith('repair-final-') ? 'repair' : 'implementation',
            });
            this.updateRawTaskStatus(rawGraph, task.id, 'IN_PROGRESS');
            session.dispatches.push(record);
            createdDispatches.push(record);
        }
        await this.recordExecutionMetric(resolvedChangePath, report.feature, dispatchMetrics);
        rawGraph.status = 'in_progress';
        session.status = 'running';
        session.updatedAt = now;
        session.projectSession = projectSession;
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        await this.fileService.writeJSON(sessionPath, session);
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
        // Fold the launch step into dispatch for a single task: generate its native agent launch
        // plan now so the controller can spawn the worker directly without a separate
        // `ospec execute launch` round-trip. Batches keep per-task launch (one plan file per task).
        let nextInstruction = `Run ospec execute launch for each active dispatch, execute each packet with runtimeAdapter.selected.nativeSubagent, then record results with ospec execute complete <task-id>. Stop and refresh capability if the native session is unavailable.`;
        if (createdDispatches.length === 1) {
            try {
                await this.planLaunchUnlocked(resolvedChangePath, { taskId: createdDispatches[0].taskId });
                const launchReportPath = this.toChangeRelativePath(resolvedChangePath, this.getLaunchPlanReportPath(resolvedChangePath));
                nextInstruction = `Launch plan for ${createdDispatches[0].taskId} is already generated at ${launchReportPath} (no separate ospec execute launch step needed). Execute runtimeAdapter.selected.nativeSubagent directly from it, then record the result with ospec execute complete ${createdDispatches[0].taskId}; do not start an agent CLI if native ownership cannot be claimed.`;
            }
            catch {
                // Keep the manual launch instruction if the launch plan could not be prepared.
            }
        }
        return {
            changePath: resolvedChangePath,
            sessionPath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            projectSession,
            dispatches: createdDispatches,
            dispatchLimit: options.limit ?? null,
            warnings,
            nextInstruction,
        };
    }
    async planLaunch(changePath, options = {}) {
        return this.withTaskGraphMutationLease(changePath, () => this.planLaunchUnlocked(changePath, options));
    }
    async planLaunchUnlocked(changePath, options = {}) {
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
        const target = this.normalizeWorkerToolTarget(options.target || profile?.resolvedTarget || profile?.targetToolMapping?.target || profile?.recommendedTarget);
        const executionPolicy = await this.readWorkflowExecutionPolicy(resolvedChangePath);
        const actualProfile = profile
            ? resolveWorkerProfileForTarget(profile, target, executionPolicy.modelProfiles)
            : null;
        let targetToolMapping = null;
        if (actualProfile) {
            targetToolMapping = actualProfile.targetToolMapping || buildWorkerTargetToolMapping(target);
            if (!profile?.targetToolMapping) {
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
                workerProfile: actualProfile,
                targetToolMapping,
            }
            : null;
        const launchCommands = [];
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
        const runtimeAdapter = selected
            ? this.runtimeAdapterService.resolve({
                projectRoot,
                target,
                capability: await this.readRuntimeHarnessCapability(resolvedChangePath, target),
                nativeHarness: await this.readRuntimeHarnessExecutionMetadata(resolvedChangePath, target),
                requiresIndependentWorker: actualProfile?.capabilityTier === 'review'
                    || /review/i.test(selected.workerRole),
                modelSelection: actualProfile
                    ? {
                        requestedModel: actualProfile.requestedModel ?? actualProfile.model,
                        configuredModel: actualProfile.configuredModel ?? actualProfile.model,
                        configurationSource: actualProfile.modelConfigurationSource || (actualProfile.model ? 'target' : 'harness-default'),
                    }
                    : undefined,
                cacheFilePath: path.join(resolvedChangePath, 'artifacts', 'agents', RUNTIME_ADAPTER_CACHE_FILE),
            })
            : null;
        if (runtimeAdapter) {
            warnings.push(...runtimeAdapter.warnings);
            if (runtimeAdapter.blocked) {
                blockers.push('No current model-native subagent adapter is available for this worker. Report a matching interactive harness capability with native subagent support.');
            }
        }
        const primitive = (0, CapabilityProbeService_1.normalizeAgentPrimitive)(options.primitive);
        const loopPlan = (selected && primitive !== 'subagent')
            ? this.buildLaunchLoopPlan({
                primitive,
                target,
                relativeChangePath,
                launchPrompt,
                until: options.until,
                maxIterations: options.maxIterations,
                interval: options.interval,
            })
            : null;
        if (loopPlan) {
            warnings.push(...loopPlan.capability.warnings);
        }
        const status = blockers.length > 0 ? 'blocked' : 'ready';
        const nextInstruction = status === 'ready'
            ? `Review ${this.toChangeRelativePath(resolvedChangePath, reportPath)}, dispatch the ${target} worker through runtimeAdapter.selected.nativeSubagent, then record the result with ospec execute complete ${selected?.taskId || '<task-id>'} ${this.quoteShellArg(relativeChangePath)} --dispatch ${selected?.id || '<dispatch-id>'} --status DONE --summary "...". If the native session expires before dispatch, refresh capability and regenerate the plan without launching a CLI fallback.`
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
            loopPlan,
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
            runtimeAdapter,
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
            loopPlan,
            nativeAgent,
            runtimeAdapter,
            launchCommands,
            blockers,
            warnings,
            nextInstruction,
        };
    }
    async readRuntimeHarnessCapability(changePath, target) {
        const loopConfigPath = path.join(changePath, 'artifacts', 'loop', 'loop.json');
        if (await this.fileService.exists(loopConfigPath)) {
            try {
                const config = await this.fileService.readJSON(loopConfigPath);
                if (config.capability
                    && config.target === target
                    && config.capability.target === target) {
                    return config.capability;
                }
            }
            catch {
                // Fall through to current environment signals; diagnostics are captured by the resolver.
            }
        }
        return new CapabilityProbeService_1.CapabilityProbeService().resolveHarnessCapability({
            target,
            primitive: 'subagent',
        });
    }
    async readRuntimeHarnessExecutionMetadata(changePath, target) {
        const loopConfigPath = path.join(changePath, 'artifacts', 'loop', 'loop.json');
        if (!(await this.fileService.exists(loopConfigPath)))
            return null;
        try {
            const config = await this.fileService.readJSON(loopConfigPath);
            const metadata = config.nativeHarnessMetadata;
            return metadata
                && config.target === target
                && metadata.target === target
                && metadata.controllerSessionReportedAt === config.capability?.reportedAt
                ? metadata
                : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Build the loop/agent-primitive plan for a goal|loop launch. OSpec only
     * produces controller instructions; the model harness owns native dispatch.
     */
    buildLaunchLoopPlan(input) {
        const capability = new CapabilityProbeService_1.CapabilityProbeService().resolveHarnessCapability({ target: input.target, primitive: input.primitive });
        const executionModel = 'controller-driven';
        const isGoal = input.primitive === 'goal';
        const mode = isGoal
            ? (capability.nativeLoopCapability === 'supported' ? 'native-goal' : 'emulated-goal')
            : 'emulated-loop';
        const until = isGoal
            ? (input.until && input.until.trim().length > 0
                ? input.until.trim()
                : `three-stage: run project tests -> ospec execute verify --status -> ospec verify ${this.quoteShellArg(input.relativeChangePath)}`)
            : null;
        const interval = !isGoal ? (input.interval || '10m') : null;
        const maxIterations = typeof input.maxIterations === 'number' ? input.maxIterations : null;
        const cliCommandPreview = null;
        const instructions = [];
        if (mode === 'native-goal') {
            instructions.push(`Invoke the harness-native /goal primitive on dispatch packet for ${input.relativeChangePath}; run autonomously until: ${until}.`);
            instructions.push('ospec produces this instruction only — the controller executes /goal and writes back completion + verification evidence.');
        }
        else if (mode === 'emulated-goal') {
            instructions.push(`No confirmed native /goal for "${input.target}" — run emulated-goal: a verify-driven loop (act -> run tests -> record evidence -> ospec verify) until passing or ${maxIterations ?? 'the configured'} iterations.`);
        }
        else {
            instructions.push(`controller-driven emulated-loop (ControllerTickPlan): re-run ospec loop run --once on the controller's tick cadence (${interval}); no native /loop is assumed (capability-probed).`);
        }
        return {
            primitive: input.primitive,
            executionModel,
            mode,
            until,
            maxIterations,
            interval,
            capability,
            cliCommandPreview,
            requiresControllerAction: true,
            instructions,
        };
    }
    async collectWorkerRun(changePath, options = {}) {
        return this.withTaskGraphMutationLease(changePath, () => this.collectWorkerRunUnlocked(changePath, options));
    }
    async collectWorkerRunUnlocked(changePath, options = {}) {
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
        // F5: an infra failure still blocks the task, but the summary has to say
        // which of the two it was -- "exit code 1" and "the spawn never started"
        // call for opposite next moves from whoever reads this.
        const summary = options.summary?.trim()
            || record.summary
            || (record.infraFailure === true
                ? `Collected worker run ${record.id}: infrastructure failure (exit code ${record.exitCode ?? 'unknown'}${record.signal ? `, signal ${record.signal}` : ''}). The harness could not run the work; fix the environment rather than the task.`
                : `Collected worker run ${record.id} with exit code ${record.exitCode ?? 'unknown'}.`);
        const completion = await this.completeUnlocked(resolvedChangePath, record.taskId, {
            status: completionStatus,
            summary,
            dispatchId: record.dispatchId || undefined,
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
        const batch = await this.retryWorkerRuns(changePath, { tasks: [options] });
        return batch.retries[0];
    }
    async retryWorkerRuns(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const requested = Array.isArray(options.tasks) ? options.tasks : [];
            if (requested.length === 0)
                throw new Error('Worker retry batch requires at least one task.');
            const taskIds = requested.map(item => String(item.taskId || '').trim());
            if (taskIds.some(taskId => !taskId))
                throw new Error('Worker retry batch contains an empty task ID.');
            if (new Set(taskIds).size !== taskIds.length)
                throw new Error('Worker retry batch contains duplicate task IDs.');
            const report = await this.getReport(resolvedChangePath);
            const tasksById = new Map(this.flattenReportTasks(report).map(task => [task.id, task]));
            const tasks = taskIds.map(taskId => tasksById.get(taskId));
            if (tasks.some(task => !task)) {
                throw new Error(`Worker retry batch contains unknown task(s): ${taskIds.filter(taskId => !tasksById.has(taskId)).join(', ')}.`);
            }
            const normalizedTasks = tasks;
            if (normalizedTasks.length > 1) {
                if (normalizedTasks.some(task => !task.parallelizable)) {
                    throw new Error('Worker retry batch is not parallel-safe because at least one selected task is serial.');
                }
                if (this.selectNonConflictingBatch(normalizedTasks).length !== normalizedTasks.length) {
                    throw new Error('Worker retry batch contains target-file or declared task conflicts.');
                }
            }
            for (let index = 0; index < requested.length; index += 1) {
                const task = normalizedTasks[index];
                const input = requested[index];
                const previousRun = await this.findWorkerRunRecord(resolvedChangePath, {
                    taskId: task.id,
                    runId: input.runId,
                    optional: true,
                });
                const taskRetryable = task.status === 'NEEDS_CONTEXT' || task.status === 'BLOCKED';
                const runRetryable = previousRun?.status === 'failed'
                    || previousRun?.completionStatus === 'NEEDS_CONTEXT'
                    || previousRun?.completionStatus === 'BLOCKED';
                if (!input.force && !taskRetryable && !runRetryable) {
                    throw new Error(`Task ${task.id} is not retryable from status ${task.status}.`);
                }
            }
            const session = await this.readSession(this.getSessionPath(resolvedChangePath), report.feature);
            const supersededRecordPaths = session.dispatches
                .filter(dispatch => taskIds.includes(dispatch.taskId) && dispatch.completedAt === null && dispatch.recordPath)
                .map(dispatch => path.resolve(resolvedChangePath, dispatch.recordPath));
            return this.withArtifactMutationRollback({
                files: [
                    report.graphPath,
                    this.getSessionPath(resolvedChangePath),
                    path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                    this.getLaunchPlanPath(resolvedChangePath),
                    this.getLaunchPlanReportPath(resolvedChangePath),
                    ...supersededRecordPaths,
                ],
                directories: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR),
                    path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR),
                ],
            }, async () => {
                const retries = [];
                for (const input of requested) {
                    retries.push(await this.retryWorkerRunUnlocked(resolvedChangePath, input));
                }
                return {
                    changePath: resolvedChangePath,
                    retries,
                    dispatches: retries.flatMap(item => item.dispatch.dispatches),
                    nextInstruction: `Created ${retries.length} conflict-safe retry dispatch(es) in one transaction. Execute the emitted native-subagent batch and record each result independently.`,
                };
            });
        });
    }
    async retryWorkerRunUnlocked(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const taskId = options.taskId?.trim();
        if (!taskId) {
            throw new Error('Worker retry requires --task.');
        }
        if (options.trigger === 'repair_strategy' && !options.repairStrategy) {
            throw new Error('Repair-strategy retry requires a durable strategy context.');
        }
        if (options.repairStrategy && options.trigger !== 'repair_strategy') {
            throw new Error('Repair strategy context is only valid for a repair_strategy retry.');
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
        const now = new Date().toISOString();
        const repairContext = await this.captureTaskReviewRepairContext(resolvedChangePath, task, allTasks, options.trigger, now);
        if (repairContext && options.repairStrategy) {
            repairContext.repairStrategy = options.repairStrategy;
        }
        const retryId = `retry-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(taskId)}-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const session = await this.readSession(sessionPath, report.feature);
        const supersededDispatches = session.dispatches.filter(dispatch => dispatch.taskId === taskId && dispatch.completedAt === null);
        for (const dispatch of supersededDispatches) {
            dispatch.status = 'BLOCKED';
            dispatch.completedAt = now;
            dispatch.summary = `Superseded by retry ${retryId} before the prior attempt was collected.`;
            if (dispatch.recordPath) {
                await this.fileService.writeJSON(path.resolve(resolvedChangePath, dispatch.recordPath), dispatch);
            }
        }
        if (supersededDispatches.length > 0) {
            session.updatedAt = now;
            await this.fileService.writeJSON(sessionPath, session);
        }
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        this.updateRawTaskStatus(rawGraph, taskId, 'PENDING');
        rawGraph.status = 'pending';
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR, `${retryId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR, `${retryId}.md`);
        const retryRecord = {
            id: retryId,
            feature: report.feature,
            taskId,
            createdAt: now,
            previousStatus: task.status,
            previousRunId: previousRun?.id || null,
            trigger: options.trigger || 'manual',
            summary: options.summary?.trim() || null,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            ...(repairContext ? { repairContext } : {}),
        };
        await this.fileService.writeJSON(recordPath, retryRecord);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildWorkerRetryReport(retryRecord));
        const dispatch = await this.dispatchUnlocked(resolvedChangePath, { taskId, repairContext });
        return {
            changePath: resolvedChangePath,
            retryRecord,
            dispatch,
            nextInstruction: `Retry dispatch created for ${taskId}. Run ospec execute launch ${this.quoteShellArg(this.toProjectRelativeChangePath(await this.findProjectRootForOptionalSession(resolvedChangePath), resolvedChangePath))} --task ${this.quoteShellArg(taskId)}, then execute runtimeAdapter.selected.nativeSubagent. Refresh the native capability instead of launching a CLI fallback.`,
        };
    }
    async captureTaskReviewRepairContext(changePath, task, allTasks, trigger, capturedAt) {
        const graphDecision = task.review?.decision;
        const reviewRepairPending = graphDecision === 'NEEDS_CHANGES' || graphDecision === 'BLOCKED';
        if (trigger !== 'task_review' && trigger !== 'repair_strategy' && !reviewRepairPending)
            return undefined;
        const reviewArtifactRelativePath = task.review?.reviewArtifactPath;
        if (!reviewArtifactRelativePath) {
            throw new Error(`Task review repair for ${task.id} requires a review artifact path.`);
        }
        const resolvedChangePath = path.resolve(changePath);
        const reviewArtifactPath = path.resolve(resolvedChangePath, reviewArtifactRelativePath);
        const relativeReviewPath = path.relative(resolvedChangePath, reviewArtifactPath);
        if (relativeReviewPath.startsWith('..') || path.isAbsolute(relativeReviewPath)) {
            throw new Error(`Task review repair for ${task.id} references an artifact outside the change root.`);
        }
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            throw new Error(`Task review repair for ${task.id} requires review artifact ${reviewArtifactRelativePath}.`);
        }
        const reviewContent = await this.fileService.readFile(reviewArtifactPath);
        const review = (0, helpers_1.parseFrontmatterDocument)(reviewContent);
        const decision = this.normalizeReviewRunDecision(review.data?.decision);
        if (decision !== 'NEEDS_CHANGES' && decision !== 'BLOCKED') {
            throw new Error(`Task review repair for ${task.id} requires NEEDS_CHANGES or BLOCKED review evidence (current: ${decision}).`);
        }
        const findingResult = await this.readReviewFindings(reviewArtifactPath, review.content);
        if (findingResult.structured.length === 0) {
            throw new Error(`Task review repair for ${task.id} requires at least one concrete finding in ${this.toChangeRelativePath(changePath, findingResult.path)}.`);
        }
        const findingsContent = await this.fileService.readFile(findingResult.path);
        const reviewArtifactHash = (0, crypto_1.createHash)('sha256').update(reviewContent, 'utf8').digest('hex');
        const findingsHash = (0, crypto_1.createHash)('sha256').update(findingsContent, 'utf8').digest('hex');
        const repairScope = [...new Set(findingResult.structured.flatMap(finding => finding.repairScope).map(item => item.trim()).filter(Boolean))];
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const canonicalWorkerReportPath = normalizeTaskPath(this.getTaskWorkerReportProjectRelativePath(resolvedChangePath, projectRoot, task.id));
        const normalizedTargets = task.targetFiles.map(normalizeTaskPath).filter(Boolean);
        const isTaskOwnedRepairScope = (normalizedScope) => normalizedScope === canonicalWorkerReportPath
            || normalizedTargets.some(target => taskPathsOverlap(normalizedScope, target));
        const outsideTaskScope = repairScope.filter(scope => {
            const normalizedScope = normalizeTaskPath(scope);
            return !normalizedScope || !isTaskOwnedRepairScope(normalizedScope);
        });
        const crossTaskScopeOwnerIds = new Set();
        for (const scope of outsideTaskScope) {
            const normalizedScope = normalizeTaskPath(scope);
            const owners = normalizedScope
                ? allTasks.filter(candidate => candidate.id !== task.id
                    && TERMINAL_TASK_STATUSES.has(candidate.status)
                    && candidate.targetFiles.some(target => taskPathsOverlap(normalizedScope, normalizeTaskPath(target))))
                : [];
            if (owners.length === 0) {
                throw new Error(`Task review repair for ${task.id} contains repair scope outside declared completed task targets: ${scope}.`);
            }
            for (const owner of owners)
                crossTaskScopeOwnerIds.add(owner.id);
        }
        const effectiveRepairScope = repairScope.length > 0 ? repairScope : task.targetFiles;
        const reviewDispatchId = String(review.data?.review_dispatch_id || '').trim();
        const reviewTargetSnapshotHash = String(review.data?.target_snapshot_hash || '').trim();
        let repairScopeSnapshotHash = null;
        let repairScopeSnapshots = null;
        if (reviewDispatchId) {
            const reviewDispatch = await this.readRepairConvergenceReviewDispatch(resolvedChangePath, task.id, reviewDispatchId);
            if (!reviewDispatch || reviewDispatch.targetSnapshotHash !== reviewTargetSnapshotHash) {
                throw new Error(`Task review repair for ${task.id} has invalid review target snapshot provenance.`);
            }
            if (crossTaskScopeOwnerIds.size > 0) {
                const reviewedScope = effectiveRepairScope.filter(scope => {
                    const normalizedScope = normalizeTaskPath(scope);
                    return normalizedScope && isTaskOwnedRepairScope(normalizedScope);
                });
                if (reviewedScope.length > 0 && !this.repairScopeSnapshotHash(reviewDispatch, reviewedScope)) {
                    throw new Error(`Task review repair for ${task.id} cannot bind its task-owned repair scope to the reviewed target snapshot.`);
                }
                repairScopeSnapshots = await this.captureTargetSnapshots(projectRoot, effectiveRepairScope);
                repairScopeSnapshotHash = this.hashTargetSnapshots(repairScopeSnapshots);
            }
            else {
                repairScopeSnapshotHash = this.repairScopeSnapshotHash(reviewDispatch, effectiveRepairScope);
            }
            if (!repairScopeSnapshotHash) {
                throw new Error(`Task review repair for ${task.id} cannot bind its repair scope to the reviewed target snapshot.`);
            }
        }
        else if (crossTaskScopeOwnerIds.size > 0) {
            throw new Error(`Task review repair for ${task.id} requires a fresh review dispatch before routing cross-task repair scope.`);
        }
        const contextHash = (0, crypto_1.createHash)('sha256')
            .update([
            task.id,
            decision,
            reviewArtifactHash,
            findingsHash,
            reviewDispatchId,
            reviewTargetSnapshotHash,
            repairScopeSnapshotHash || '',
            [...crossTaskScopeOwnerIds].sort().join(','),
        ].join('\n'), 'utf8')
            .digest('hex');
        return {
            taskId: task.id,
            decision,
            reviewArtifactPath: this.toChangeRelativePath(changePath, reviewArtifactPath),
            findingsPath: this.toChangeRelativePath(changePath, findingResult.path),
            reviewArtifactHash,
            findingsHash,
            contextHash,
            capturedAt,
            source: findingResult.source,
            findingIds: findingResult.structured.map(finding => finding.id),
            findings: findingResult.structured,
            repairScope: effectiveRepairScope,
            ...(reviewDispatchId && repairScopeSnapshotHash ? {
                reviewDispatchId,
                reviewTargetSnapshotHash,
                repairScopeSnapshotHash,
            } : {}),
            ...(repairScopeSnapshots ? { repairScopeSnapshots } : {}),
            ...(crossTaskScopeOwnerIds.size > 0 ? {
                crossTaskScopeOwnerIds: [...crossTaskScopeOwnerIds].sort(),
            } : {}),
        };
    }
    async readTaskReviewRepairHistory(changePath, taskId) {
        const resolvedChangePath = path.resolve(changePath);
        const normalizedTaskId = String(taskId || '').trim();
        if (!normalizedTaskId)
            throw new Error('Task review repair count requires a task ID.');
        const retriesPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR);
        if (!(await this.fileService.exists(retriesPath)))
            return [];
        const entries = (await fs_1.promises.readdir(retriesPath, { withFileTypes: true }))
            .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
            .sort((left, right) => left.name.localeCompare(right.name));
        const history = [];
        for (const entry of entries) {
            try {
                const record = await this.fileService.readJSON(path.join(retriesPath, entry.name));
                if (record.taskId !== normalizedTaskId)
                    continue;
                if (record.trigger === 'task_review'
                    || record.trigger === 'repair_strategy'
                    || (!record.trigger && String(record.summary || '').startsWith('Loop retry after task review '))) {
                    history.push(record);
                }
            }
            catch (error) {
                throw new Error(`Task review repair history is unreadable at ${entry.name} (${error?.message || error}).`);
            }
        }
        return history;
    }
    async readCrossTaskRepairOwnerIds(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const retriesPath = path.join(resolvedChangePath, 'artifacts', 'agents', RETRIES_DIR);
        if (!(await this.fileService.exists(retriesPath)))
            return [];
        const entries = (await fs_1.promises.readdir(retriesPath, { withFileTypes: true }))
            .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
            .sort((left, right) => left.name.localeCompare(right.name));
        const ownerIds = new Set();
        for (const entry of entries) {
            try {
                const record = await this.fileService.readJSON(path.join(retriesPath, entry.name));
                const recordedOwnerIds = record.repairContext?.crossTaskScopeOwnerIds;
                if (recordedOwnerIds === undefined)
                    continue;
                if (!Array.isArray(recordedOwnerIds)
                    || recordedOwnerIds.some(ownerId => typeof ownerId !== 'string' || !ownerId.trim())) {
                    throw new Error('cross-task owner IDs are malformed');
                }
                for (const ownerId of recordedOwnerIds)
                    ownerIds.add(ownerId.trim());
            }
            catch (error) {
                throw new Error(`Cross-task repair owner history is unreadable at ${entry.name} (${error?.message || error}).`);
            }
        }
        return [...ownerIds].sort();
    }
    async countTaskReviewRepairRounds(changePath, taskId) {
        return (await this.readTaskReviewRepairHistory(changePath, taskId)).length;
    }
    async requiresTaskReviewRepairEvidenceRefresh(changePath, taskId) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const task = this.flattenReportTasks(report).find(item => item.id === String(taskId || '').trim());
        if (!task || task.review?.decision !== 'NEEDS_CHANGES' || !task.review.reviewArtifactPath)
            return false;
        const reviewArtifactPath = path.join(resolvedChangePath, task.review.reviewArtifactPath);
        if (!(await this.fileService.exists(reviewArtifactPath)))
            return false;
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        const findings = await this.readReviewFindings(reviewArtifactPath, review.content);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const canonicalWorkerReportPath = normalizeTaskPath(this.getTaskWorkerReportProjectRelativePath(resolvedChangePath, projectRoot, task.id));
        const repairsWorkerReport = findings.structured.some(finding => finding.repairScope
            .some(scope => normalizeTaskPath(scope) === canonicalWorkerReportPath));
        if (!repairsWorkerReport)
            return false;
        const reviewDispatchId = String(review.data?.review_dispatch_id || '').trim();
        const reviewTargetSnapshotHash = String(review.data?.target_snapshot_hash || '').trim();
        if (!reviewDispatchId || !reviewTargetSnapshotHash)
            return false;
        const reviewDispatch = await this.readRepairConvergenceReviewDispatch(resolvedChangePath, task.id, reviewDispatchId);
        if (!reviewDispatch || reviewDispatch.targetSnapshotHash !== reviewTargetSnapshotHash)
            return false;
        const reportInTargets = reviewDispatch.targetFiles
            .some(target => normalizeTaskPath(target) === canonicalWorkerReportPath);
        const reportInSnapshots = reviewDispatch.targetSnapshots
            .some(snapshot => normalizeTaskPath(snapshot.path) === canonicalWorkerReportPath);
        return !reportInTargets || !reportInSnapshots;
    }
    async hasTaskReviewRepairStrategyAttempt(changePath, taskId, strategyKey) {
        const normalizedKey = String(strategyKey || '').trim();
        if (!normalizedKey)
            throw new Error('Task repair strategy lookup requires a strategy key.');
        const history = await this.readTaskReviewRepairHistory(changePath, taskId);
        return history.some(record => record.trigger === 'repair_strategy'
            && record.repairContext?.repairStrategy?.key === normalizedKey);
    }
    async assessRunningTaskRecovery(changePath, taskIds, maxRuntimeMinutes, now = new Date()) {
        const resolvedChangePath = path.resolve(changePath);
        const normalizedTaskIds = [...new Set(taskIds.map(taskId => String(taskId || '').trim()).filter(Boolean))];
        const runtimeMs = Math.max(1, Number(maxRuntimeMinutes) || 1) * 60000;
        const session = await this.readSession(this.getSessionPath(resolvedChangePath), await this.readFeatureName(resolvedChangePath));
        return normalizedTaskIds.map(taskId => {
            const dispatch = [...session.dispatches]
                .reverse()
                .find(candidate => candidate.taskId === taskId && !candidate.completedAt);
            if (!dispatch) {
                return {
                    taskId,
                    dispatchId: null,
                    assignedAt: null,
                    recoveryDeadline: null,
                    recoverable: true,
                    reason: 'missing_dispatch',
                };
            }
            const assignedAtMs = Date.parse(dispatch.assignedAt);
            if (!Number.isFinite(assignedAtMs)) {
                return {
                    taskId,
                    dispatchId: dispatch.id,
                    assignedAt: dispatch.assignedAt,
                    recoveryDeadline: null,
                    recoverable: true,
                    reason: 'invalid_assigned_at',
                };
            }
            const recoveryDeadlineMs = assignedAtMs + runtimeMs;
            return {
                taskId,
                dispatchId: dispatch.id,
                assignedAt: new Date(assignedAtMs).toISOString(),
                recoveryDeadline: new Date(recoveryDeadlineMs).toISOString(),
                recoverable: now.getTime() >= recoveryDeadlineMs,
                reason: now.getTime() >= recoveryDeadlineMs ? 'runtime_expired' : 'within_runtime',
            };
        });
    }
    async assessTaskReviewRepairConvergence(changePath, taskId, configuredLimit) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const task = this.flattenReportTasks(report).find(candidate => candidate.id === taskId);
        if (!task?.review?.reviewArtifactPath) {
            throw new Error(`Task review convergence for ${taskId} requires a review artifact path.`);
        }
        const reviewArtifactPath = path.resolve(resolvedChangePath, task.review.reviewArtifactPath);
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        const decision = this.normalizeReviewRunDecision(review.data?.decision);
        if (decision !== 'NEEDS_CHANGES') {
            throw new Error(`Task review convergence for ${taskId} requires NEEDS_CHANGES evidence (current: ${decision}).`);
        }
        const current = await this.readReviewFindings(reviewArtifactPath, review.content);
        if (current.structured.length === 0) {
            throw new Error(`Task review convergence for ${taskId} requires at least one concrete finding.`);
        }
        const history = await this.readTaskReviewRepairHistory(resolvedChangePath, taskId);
        const currentFindingIds = current.structured.map(finding => finding.id).sort();
        const currentFingerprint = this.repairFindingsFingerprint(current.structured);
        if (history.length < configuredLimit) {
            return {
                scope: 'task',
                taskId,
                roundsUsed: history.length,
                currentFindingIds,
                previousFindingIds: [],
                currentFingerprint,
                previousFingerprint: null,
                currentRepairScopeSnapshotHash: null,
                previousRepairScopeSnapshotHash: null,
                targetSnapshotChanged: null,
                comparable: false,
                progressing: true,
                reason: 'below_limit',
            };
        }
        const latest = history.at(-1);
        const previousStructured = Array.isArray(latest?.repairContext?.findings)
            ? latest.repairContext.findings
            : [];
        let previousFindingIds = previousStructured.map(finding => finding.id).filter(Boolean).sort();
        let previousFingerprint = previousStructured.length > 0
            ? this.repairFindingsFingerprint(previousStructured)
            : null;
        if (previousFindingIds.length === 0) {
            const session = await this.readSession(this.getSessionPath(resolvedChangePath), report.feature);
            const latestCompletedDispatch = [...session.dispatches]
                .reverse()
                .find(dispatch => dispatch.taskId === taskId && dispatch.completedAt && dispatch.summary);
            previousFindingIds = this.extractFindingIds(latestCompletedDispatch?.summary || '');
        }
        const previousRepairScope = latest?.repairContext?.repairScope?.length
            ? latest.repairContext.repairScope
            : task.targetFiles;
        const currentReviewDispatch = await this.readRepairConvergenceReviewDispatch(resolvedChangePath, taskId, String(review.data?.review_dispatch_id || ''));
        const currentReviewTargetHash = String(review.data?.target_snapshot_hash || '').trim();
        const validCurrentReviewDispatch = currentReviewDispatch
            && currentReviewDispatch.targetSnapshotHash === currentReviewTargetHash
            ? currentReviewDispatch
            : null;
        const previousReviewDispatch = latest?.repairContext?.reviewDispatchId
            ? await this.readRepairConvergenceReviewDispatch(resolvedChangePath, taskId, latest.repairContext.reviewDispatchId)
            : await this.findHistoricalRepairReviewDispatch(resolvedChangePath, taskId, latest?.repairContext?.capturedAt || latest?.createdAt || null);
        const validPreviousReviewDispatch = previousReviewDispatch
            && (!latest?.repairContext?.reviewTargetSnapshotHash
                || previousReviewDispatch.targetSnapshotHash === latest.repairContext.reviewTargetSnapshotHash)
            ? previousReviewDispatch
            : null;
        const recordedCrossTaskSnapshots = Array.isArray(latest?.repairContext?.repairScopeSnapshots)
            ? latest.repairContext.repairScopeSnapshots
            : [];
        const computedPreviousScopeSnapshotHash = recordedCrossTaskSnapshots.length > 0
            ? this.hashTargetSnapshots(recordedCrossTaskSnapshots)
            : validPreviousReviewDispatch
                ? this.repairScopeSnapshotHash(validPreviousReviewDispatch, previousRepairScope)
                : null;
        const recordedPreviousScopeSnapshotHash = latest?.repairContext?.repairScopeSnapshotHash || null;
        const previousRepairScopeSnapshotHash = recordedPreviousScopeSnapshotHash
            ? computedPreviousScopeSnapshotHash === recordedPreviousScopeSnapshotHash
                ? recordedPreviousScopeSnapshotHash
                : null
            : computedPreviousScopeSnapshotHash;
        const currentRepairScopeSnapshotHash = recordedCrossTaskSnapshots.length > 0
            ? this.hashTargetSnapshots(await this.captureTargetSnapshots(await this.findProjectRootForOptionalSession(resolvedChangePath), previousRepairScope))
            : validCurrentReviewDispatch
                ? this.repairScopeSnapshotHash(validCurrentReviewDispatch, previousRepairScope)
                : null;
        const convergence = this.assessRepairFindingProgress({
            currentFindingIds,
            previousFindingIds,
            currentFingerprint,
            previousFingerprint,
            priorFindings: history.map(record => Array.isArray(record.repairContext?.findings)
                ? record.repairContext.findings
                : []),
            currentRepairScopeSnapshotHash,
            previousRepairScopeSnapshotHash,
        });
        return {
            scope: 'task',
            taskId,
            roundsUsed: history.length,
            currentFindingIds,
            previousFindingIds,
            currentFingerprint,
            previousFingerprint,
            currentRepairScopeSnapshotHash,
            previousRepairScopeSnapshotHash,
            ...convergence,
        };
    }
    async readFinalReviewRepairHistory(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const repairWavesPath = path.join(resolvedChangePath, 'artifacts', 'agents', REPAIR_WAVES_DIR);
        if (!(await this.fileService.exists(repairWavesPath)))
            return [];
        const entries = (await fs_1.promises.readdir(repairWavesPath, { withFileTypes: true }))
            .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
            .sort((left, right) => left.name.localeCompare(right.name));
        const history = [];
        for (const entry of entries) {
            try {
                const record = await this.fileService.readJSON(path.join(repairWavesPath, entry.name));
                if (!String(record.taskId || '').startsWith('repair-final-')) {
                    throw new Error('record does not identify a final-review repair task');
                }
                history.push(record);
            }
            catch (error) {
                throw new Error(`Final-review repair history is unreadable at ${entry.name} (${error?.message || error}).`);
            }
        }
        return history;
    }
    async countFinalReviewRepairWaves(changePath) {
        return (await this.readFinalReviewRepairHistory(changePath)).length;
    }
    async hasFinalReviewRepairStrategyAttempt(changePath, strategyKey) {
        const normalizedKey = String(strategyKey || '').trim();
        if (!normalizedKey)
            throw new Error('Final repair strategy lookup requires a strategy key.');
        const history = await this.readFinalReviewRepairHistory(changePath);
        return history.some(record => record.repairStrategy?.key === normalizedKey);
    }
    async assessFinalReviewRepairConvergence(changePath, configuredLimit) {
        const resolvedChangePath = path.resolve(changePath);
        const reviewArtifactPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        const decision = this.normalizeReviewRunDecision(review.data?.decision);
        if (decision !== 'NEEDS_CHANGES') {
            throw new Error(`Final review convergence requires NEEDS_CHANGES evidence (current: ${decision}).`);
        }
        const current = await this.readReviewFindings(reviewArtifactPath, review.content);
        if (current.structured.length === 0) {
            throw new Error('Final review convergence requires at least one concrete finding.');
        }
        const history = await this.readFinalReviewRepairHistory(resolvedChangePath);
        const currentFindingIds = current.structured.map(finding => finding.id).sort();
        const currentFingerprint = this.repairFindingsFingerprint(current.structured);
        if (history.length < configuredLimit) {
            return {
                scope: 'final', taskId: null, roundsUsed: history.length,
                currentFindingIds, previousFindingIds: [], currentFingerprint,
                previousFingerprint: null,
                currentRepairScopeSnapshotHash: null,
                previousRepairScopeSnapshotHash: null,
                targetSnapshotChanged: null,
                comparable: false, progressing: true, reason: 'below_limit',
            };
        }
        const latest = history.at(-1);
        const previousStructured = Array.isArray(latest?.structuredFindings)
            ? latest?.structuredFindings || []
            : [];
        const previousFindingIds = previousStructured.map(finding => finding.id).filter(Boolean).sort();
        const previousFingerprint = previousStructured.length > 0
            ? this.repairFindingsFingerprint(previousStructured)
            : null;
        const previousRepairScope = [...new Set(previousStructured
                .flatMap(finding => finding.repairScope)
                .map(item => item.trim())
                .filter(Boolean))];
        const effectivePreviousRepairScope = previousRepairScope.length > 0
            ? previousRepairScope
            : latest?.targetFiles || [];
        const currentReviewDispatch = await this.readRepairConvergenceReviewDispatch(resolvedChangePath, null, String(review.data?.review_dispatch_id || ''));
        const currentReviewTargetHash = String(review.data?.target_snapshot_hash || '').trim();
        const validCurrentReviewDispatch = currentReviewDispatch
            && currentReviewDispatch.targetSnapshotHash === currentReviewTargetHash
            ? currentReviewDispatch
            : null;
        const previousReviewDispatch = latest?.sourceReviewDispatchId
            ? await this.readRepairConvergenceReviewDispatch(resolvedChangePath, null, latest.sourceReviewDispatchId)
            : await this.findHistoricalRepairReviewDispatch(resolvedChangePath, null, latest?.createdAt || null);
        const validPreviousReviewDispatch = previousReviewDispatch
            && (!latest?.sourceReviewTargetSnapshotHash
                || previousReviewDispatch.targetSnapshotHash === latest.sourceReviewTargetSnapshotHash)
            ? previousReviewDispatch
            : null;
        const computedPreviousScopeSnapshotHash = validPreviousReviewDispatch
            ? this.repairScopeSnapshotHash(validPreviousReviewDispatch, effectivePreviousRepairScope)
            : null;
        const recordedPreviousScopeSnapshotHash = latest?.sourceRepairScopeSnapshotHash || null;
        const previousRepairScopeSnapshotHash = recordedPreviousScopeSnapshotHash
            ? computedPreviousScopeSnapshotHash === recordedPreviousScopeSnapshotHash
                ? recordedPreviousScopeSnapshotHash
                : null
            : computedPreviousScopeSnapshotHash;
        const currentRepairScopeSnapshotHash = validCurrentReviewDispatch
            ? this.repairScopeSnapshotHash(validCurrentReviewDispatch, effectivePreviousRepairScope)
            : null;
        const convergence = this.assessRepairFindingProgress({
            currentFindingIds,
            previousFindingIds,
            currentFingerprint,
            previousFingerprint,
            priorFindings: history.map(record => Array.isArray(record.structuredFindings)
                ? record.structuredFindings
                : []),
            currentRepairScopeSnapshotHash,
            previousRepairScopeSnapshotHash,
        });
        return {
            scope: 'final',
            taskId: null,
            roundsUsed: history.length,
            currentFindingIds,
            previousFindingIds,
            currentFingerprint,
            previousFingerprint,
            currentRepairScopeSnapshotHash,
            previousRepairScopeSnapshotHash,
            ...convergence,
        };
    }
    assessRepairFindingProgress(input) {
        const comparable = input.previousFingerprint !== null || input.previousFindingIds.length > 0;
        if (!comparable) {
            return {
                comparable: false,
                progressing: true,
                reason: 'legacy_context_unavailable',
                targetSnapshotChanged: null,
            };
        }
        const currentFindingSignature = input.currentFindingIds.join('|');
        const previousFindingSignature = input.previousFindingIds.join('|');
        if (currentFindingSignature !== previousFindingSignature) {
            const repeated = input.priorFindings.slice(0, -1).some(findings => findings.map(finding => finding.id).filter(Boolean).sort().join('|') === currentFindingSignature);
            return {
                comparable: true,
                progressing: !repeated,
                reason: repeated ? 'findings_repeated' : 'findings_changed',
                targetSnapshotChanged: input.currentRepairScopeSnapshotHash && input.previousRepairScopeSnapshotHash
                    ? input.currentRepairScopeSnapshotHash !== input.previousRepairScopeSnapshotHash
                    : null,
            };
        }
        if (!input.previousFingerprint || input.currentFingerprint === input.previousFingerprint) {
            return {
                comparable: true,
                progressing: false,
                reason: 'findings_unchanged',
                targetSnapshotChanged: input.currentRepairScopeSnapshotHash && input.previousRepairScopeSnapshotHash
                    ? input.currentRepairScopeSnapshotHash !== input.previousRepairScopeSnapshotHash
                    : null,
            };
        }
        const fingerprintRepeated = input.priorFindings.slice(0, -1).some(findings => findings.length > 0 && this.repairFindingsFingerprint(findings) === input.currentFingerprint);
        if (fingerprintRepeated) {
            return {
                comparable: true,
                progressing: false,
                reason: 'findings_repeated',
                targetSnapshotChanged: input.currentRepairScopeSnapshotHash && input.previousRepairScopeSnapshotHash
                    ? input.currentRepairScopeSnapshotHash !== input.previousRepairScopeSnapshotHash
                    : null,
            };
        }
        if (!input.currentRepairScopeSnapshotHash || !input.previousRepairScopeSnapshotHash) {
            return {
                comparable: true,
                progressing: false,
                reason: 'legacy_context_unavailable',
                targetSnapshotChanged: null,
            };
        }
        if (input.currentRepairScopeSnapshotHash === input.previousRepairScopeSnapshotHash) {
            return {
                comparable: true,
                progressing: false,
                reason: 'reviewed_target_unchanged',
                targetSnapshotChanged: false,
            };
        }
        return {
            comparable: true,
            progressing: true,
            reason: 'findings_refined',
            targetSnapshotChanged: true,
        };
    }
    async readRepairConvergenceReviewDispatch(changePath, taskId, dispatchId) {
        const normalizedDispatchId = String(dispatchId || '').trim();
        if (!normalizedDispatchId || this.toFileSafeId(normalizedDispatchId) !== normalizedDispatchId)
            return null;
        const recordPath = path.join(changePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${normalizedDispatchId}.json`);
        if (!(await this.fileService.exists(recordPath)))
            return null;
        try {
            const record = await this.fileService.readJSON(recordPath);
            if (record.id !== normalizedDispatchId
                || (record.taskId || null) !== taskId
                || !Array.isArray(record.targetFiles)
                || !Array.isArray(record.targetSnapshots)
                || !record.targetSnapshotHash
                || this.hashTargetSnapshots(record.targetSnapshots) !== record.targetSnapshotHash)
                return null;
            return record;
        }
        catch {
            return null;
        }
    }
    async findHistoricalRepairReviewDispatch(changePath, taskId, completedBefore) {
        const boundary = Date.parse(String(completedBefore || ''));
        if (!Number.isFinite(boundary))
            return null;
        const dispatchDirectory = path.join(changePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR);
        if (!(await this.fileService.exists(dispatchDirectory)))
            return null;
        const candidates = [];
        for (const entry of (await fs_1.promises.readdir(dispatchDirectory, { withFileTypes: true }))) {
            if (!entry.isFile() || !entry.name.endsWith('.json'))
                continue;
            const dispatchId = entry.name.replace(/\.json$/i, '');
            const record = await this.readRepairConvergenceReviewDispatch(changePath, taskId, dispatchId);
            const completedAt = Date.parse(String(record?.reviewerCompletedAt || ''));
            if (!record || record.reviewerSucceeded !== true || !Number.isFinite(completedAt) || completedAt > boundary)
                continue;
            candidates.push({ record, completedAt });
        }
        candidates.sort((left, right) => right.completedAt - left.completedAt || right.record.id.localeCompare(left.record.id));
        return candidates[0]?.record || null;
    }
    repairScopeSnapshotHash(record, repairScope) {
        const normalizedScope = Array.from(new Set(this.normalizeTargetFiles(repairScope.length > 0 ? repairScope : record.targetFiles).map(normalizeTaskPath).filter(Boolean)));
        if (normalizedScope.length === 0)
            return null;
        const selected = record.targetSnapshots.filter(snapshot => normalizedScope.some(scope => taskPathsOverlap(scope, normalizeTaskPath(snapshot.path))));
        const fullyCovered = normalizedScope.every(scope => selected.some(snapshot => taskPathsOverlap(scope, normalizeTaskPath(snapshot.path))));
        return selected.length > 0 && fullyCovered ? this.hashTargetSnapshots(selected) : null;
    }
    repairFindingsFingerprint(findings) {
        const normalized = findings.map(finding => ({
            id: finding.id,
            severity: finding.severity,
            category: finding.category,
            message: finding.message.trim(),
            file: finding.file,
            line: finding.line,
            evidence: finding.evidence.trim(),
            requirementRefs: [...finding.requirementRefs].sort(),
            repairScope: [...finding.repairScope].sort(),
        })).sort((left, right) => left.id.localeCompare(right.id));
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(normalized), 'utf8').digest('hex');
    }
    extractFindingIds(value) {
        return [...new Set(String(value || '').match(/\bF-\d+\b/gi) || [])]
            .map(id => id.toUpperCase())
            .sort();
    }
    async complete(changePath, taskId, options = {}) {
        return this.withTaskGraphMutationLease(changePath, () => this.completeUnlocked(changePath, taskId, options));
    }
    async deferExternalBlocker(changePath, taskId, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const normalizedTaskId = String(taskId || '').trim();
            const reason = String(options?.reason || '').trim();
            if (!normalizedTaskId)
                throw new Error('External blocker deferral requires a task id.');
            if (!reason)
                throw new Error('External blocker deferral requires a non-empty reason.');
            const report = await this.getReport(resolvedChangePath);
            const task = report.blockedTasks.map(item => item.task).find(item => item.id === normalizedTaskId);
            if (!task || task.status !== 'BLOCKED') {
                throw new Error(`Task ${normalizedTaskId} must have status BLOCKED before its external acceptance can be deferred.`);
            }
            const blocker = await this.readLatestBlockerEscalation(resolvedChangePath, normalizedTaskId);
            if (!blocker || blocker.escalationReason !== 'external_blocker' || blocker.retryable) {
                throw new Error(`Task ${normalizedTaskId} has no durable external blocker eligible for final-review deferral.`);
            }
            if (!blocker.dispatchId || !blocker.summary?.trim()) {
                throw new Error(`Task ${normalizedTaskId} external blocker lacks completed dispatch evidence and cannot be deferred.`);
            }
            const deferredAt = new Date().toISOString();
            const id = `blocker-${this.toFileSafeTimestamp(deferredAt)}-${this.toFileSafeId(normalizedTaskId)}-deferred`;
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', BLOCKERS_DIR, `${id}.json`);
            const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', BLOCKERS_DIR, `${id}.md`);
            const record = {
                ...blocker,
                id,
                judgmentRequired: false,
                deferredToFinalReview: true,
                deferredAt,
                deferredReason: reason,
                recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
                reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
                nextActions: [
                    'Continue dependency-safe implementation work that was waiting only on this external acceptance gate.',
                    'Keep this task BLOCKED and unchecked; do not claim its external evidence has passed.',
                    'Resolve the real external evidence before final review, finalization, or archive.',
                ],
            };
            await this.fileService.writeJSON(recordPath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildBlockerEscalationReport(report, record));
            return record;
        });
    }
    async completeUnlocked(changePath, taskId, options = {}) {
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
        const taskDispatches = session.dispatches.filter(item => item.taskId === normalizedTaskId);
        if (!options.dispatchId && taskDispatches.length > 1) {
            throw new Error(`Task ${normalizedTaskId} has multiple dispatch attempts; completion requires the exact --dispatch id.`);
        }
        const dispatch = options.dispatchId
            ? session.dispatches.find(item => item.id === options.dispatchId)
            : [...taskDispatches].reverse().find(item => item.completedAt === null);
        if (!options.dispatchId && taskDispatches.length > 0 && !dispatch) {
            throw new Error(`Task ${normalizedTaskId} has dispatch history but no active attempt; completion requires a new dispatch and its exact --dispatch id.`);
        }
        if (options.dispatchId && (!dispatch || dispatch.taskId !== normalizedTaskId)) {
            throw new Error(`Dispatch ${options.dispatchId} does not belong to task ${normalizedTaskId}.`);
        }
        if (options.dispatchId && dispatch?.completedAt !== null) {
            throw new Error(`Dispatch ${options.dispatchId} is already settled and cannot complete a newer attempt.`);
        }
        const currentActiveDispatch = [...taskDispatches].reverse().find(item => item.completedAt === null);
        if (options.dispatchId && dispatch && currentActiveDispatch?.id !== dispatch.id) {
            throw new Error(`Dispatch ${options.dispatchId} is stale; current active attempt is ${currentActiveDispatch?.id || '(none)'}.`);
        }
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        this.updateRawTaskStatus(rawGraph, normalizedTaskId, completionStatus);
        if (TERMINAL_TASK_STATUSES.has(completionStatus)) {
            this.resetRawTaskReview(rawGraph, task);
            const taskReviewPath = path.join(resolvedChangePath, this.getTaskCombinedReviewArtifactRelativePath(task.id));
            if (await this.fileService.exists(taskReviewPath)) {
                await this.writeLocalizedReportFile(resolvedChangePath, taskReviewPath, this.buildDefaultTaskReviewArtifact(report.feature, task));
                await this.fileService.remove(taskReviewPath.replace(/\.md$/i, '.findings.json'));
            }
        }
        const summary = options.summary?.trim() || null;
        const automaticUsagePath = dispatch
            ? path.join(resolvedChangePath, 'artifacts', 'agents', USAGE_SIDECARS_DIR, `${dispatch.id}.json`)
            : null;
        const usagePath = options.usageFile
            || (automaticUsagePath && await this.fileService.exists(automaticUsagePath) ? automaticUsagePath : null);
        const usage = usagePath ? await this.readExecutionUsageFile(usagePath) : null;
        if (dispatch) {
            dispatch.status = completionStatus;
            dispatch.completedAt = now;
            dispatch.summary = summary;
            const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
            dispatch.gitHeadAtCompletion = await this.readGitOutput(projectRoot, ['rev-parse', 'HEAD']);
            dispatch.documentationEvidence = await this.captureDocumentationEvidence(projectRoot, dispatch.documentationBaseline || []);
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
        const completionMetrics = [{
                kind: 'completion',
                id: dispatch?.id || `manual-${normalizedTaskId}`,
                taskId: normalizedTaskId,
                path: null,
                recordedAt: now,
                durationMs: dispatch
                    ? Math.max(0, Date.parse(now) - Date.parse(dispatch.assignedAt))
                    : null,
                capabilityTier: task.workerProfile.capabilityTier,
                modelProfile: task.workerProfile.modelProfile,
                model: task.workerProfile.model,
                workflowStage: normalizedTaskId.startsWith('repair-final-') ? 'repair' : 'implementation',
            }];
        if (usage) {
            completionMetrics.push({
                kind: 'usage',
                id: dispatch?.id || `manual-${normalizedTaskId}`,
                taskId: normalizedTaskId,
                path: null,
                recordedAt: now,
                durationMs: usage.elapsedMs,
                usage,
                capabilityTier: task.workerProfile.capabilityTier,
                modelProfile: task.workerProfile.modelProfile,
                model: task.workerProfile.model,
                workflowStage: normalizedTaskId.startsWith('repair-final-') ? 'repair' : 'implementation',
            });
        }
        const workerReportPath = ['artifacts', 'agents', WORKER_REPORTS_DIR, `${this.toFileSafeId(normalizedTaskId) || 'task'}.md`].join('/');
        if (options.report) {
            // The JSON is the authority the controller reads; the Markdown at
            // the existing path is rendered from it so humans lose nothing and
            // a reviewer's `- Worker report:` link keeps resolving.
            await this.fileService.writeJSON(path.join(resolvedChangePath, workerReportPath.replace(/\.md$/i, '.json')), options.report);
            await this.writeLocalizedReportFile(resolvedChangePath, path.join(resolvedChangePath, workerReportPath), (0, structuredReports_1.renderWorkerReportMarkdown)(normalizedTaskId, options.report));
        }
        if (await this.fileService.exists(path.join(resolvedChangePath, workerReportPath))) {
            completionMetrics.push({
                kind: 'worker_report',
                id: dispatch?.id || `manual-${normalizedTaskId}`,
                taskId: normalizedTaskId,
                path: workerReportPath,
                recordedAt: now,
                durationMs: null,
            });
        }
        await this.recordExecutionMetric(resolvedChangePath, report.feature, completionMetrics);
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
                retryable: options.retryable === true,
            })
            : null;
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            sessionPath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            blockerEscalation,
            taskId: normalizedTaskId,
            status: completionStatus,
            graphStatus,
            usage,
            nextInstruction: blockerEscalation
                ? `Resolve blocker escalation at ${blockerEscalation.reportPath}, then rerun ospec execute status.`
                : TERMINAL_TASK_STATUSES.has(completionStatus)
                    ? `Task ${normalizedTaskId} implementation is recorded. Run ospec loop tick [change-path] when a controller Loop owns the Goal; otherwise run ospec execute review [change-path] --task ${normalizedTaskId}.`
                    : graphStatus === 'completed'
                        ? 'Task graph is complete. Continue with review, verification, and archive gates.'
                        : 'Run ospec execute status to inspect remaining work.',
        };
    }
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
    async recordReviewDecision(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const relative = String(options.reviewArtifactPath || '').trim();
        if (!relative)
            throw new Error('Recording a review decision requires the review artifact path.');
        const absolute = path.isAbsolute(relative) ? path.resolve(relative) : path.resolve(resolvedChangePath, relative);
        const normalized = absolute.replace(/\\/g, '/');
        if (!normalized.includes('/artifacts/reviews/')) {
            throw new Error(`Review artifact ${relative} must live under artifacts/reviews/ inside the goal; got ${absolute}.`);
        }
        if (!(await this.fileService.exists(absolute))) {
            throw new Error(`Review artifact ${relative} does not exist. Run the review dispatch first; a decision may only settle a review that was issued.`);
        }
        const existing = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(absolute));
        const title = String(existing.data?.title || path.basename(absolute, '.md'));
        // The renderer emits its own frontmatter; strip it and keep the
        // artifact's original provenance frontmatter instead.
        const body = (0, structuredReports_1.renderReviewDecisionMarkdown)(title, options.decision).replace(/^---\n[\s\S]*?\n---\n/, '');
        const frontmatter = {
            ...(existing.data || {}),
            decision: options.decision.decision,
            reviewed_at: new Date().toISOString(),
        };
        await this.writeLocalizedReportFile(resolvedChangePath, absolute, (0, helpers_1.stringifyFrontmatter)(body, frontmatter));
        const findingsPath = absolute.replace(/\.md$/i, '.findings.json');
        await this.fileService.writeJSON(findingsPath, (0, structuredReports_1.renderReviewFindingsDocument)(options.decision));
        return {
            reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, absolute),
            findingsPath: this.toChangeRelativePath(resolvedChangePath, findingsPath),
            decision: options.decision.decision,
            findings: options.decision.findings.length,
            nextInstruction: `Review decision ${options.decision.decision} recorded with ${options.decision.findings.length} structured finding(s). Run ospec loop step / ospec loop run --once so the controller observes it.`,
        };
    }
    async syncWorkerStatus(changePath) {
        return this.withTaskGraphMutationLease(changePath, () => this.syncWorkerStatusUnlocked(changePath));
    }
    async syncWorkerStatusUnlocked(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const progressProjection = await this.reconcileGoalProgressUnlocked(resolvedChangePath);
        const report = await this.getReport(resolvedChangePath);
        await this.ingestReviewUsageSidecars(resolvedChangePath, report.feature);
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const tasks = Array.isArray(rawGraph?.tasks)
            ? rawGraph.tasks.map((task, index) => normalizeTask(task, index))
            : [];
        const sessionPath = this.getSessionPath(resolvedChangePath);
        const session = await this.readSession(sessionPath, report.feature);
        const workerStatusPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS);
        // Final review is one combined code review; both reviewer-status fields reflect its single decision.
        const finalReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW));
        const specReviewerStatus = finalReviewerStatus;
        const qualityReviewerStatus = finalReviewerStatus;
        const implementerStatus = this.deriveImplementerWorkerStatus(tasks, report);
        const verificationEvidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), report.feature, { changePath: resolvedChangePath, report });
        const tddEvidence = await this.readTddEvidence(this.getTddEvidencePath(resolvedChangePath), report.feature);
        const debugEvidence = await this.readDebugEvidence(this.getDebugEvidencePath(resolvedChangePath), report.feature);
        const latestBlockerEscalation = await this.readLatestBlockerEscalation(resolvedChangePath);
        const incompleteReviewProvenance = [];
        for (const task of report.completedTasks) {
            if (!task.review || task.review.decision !== 'PENDING')
                continue;
            const reviewPath = path.join(resolvedChangePath, task.review.reviewArtifactPath || this.getTaskCombinedReviewArtifactRelativePath(task.id));
            if (!(await this.fileService.exists(reviewPath)))
                continue;
            const artifact = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
            const artifactDecision = this.normalizeReviewRunDecision(artifact.data?.decision);
            if (artifactDecision === 'PENDING')
                continue;
            const validation = await this.validateTaskReviewEvidence(resolvedChangePath, task.id);
            if (!validation.ready) {
                incompleteReviewProvenance.push({
                    taskId: task.id,
                    reason: validation.reason || 'review executor provenance is incomplete',
                });
            }
        }
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
        await this.syncDerivedProgressDocuments(resolvedChangePath, report, verificationEvidence);
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
            progressProjection,
            nextInstruction: progressProjection.status === 'blocked'
                ? `Goal progress projection is blocked: ${progressProjection.issues.join('; ')}`
                : incompleteReviewProvenance.length > 0
                    ? `Task review evidence is not yet authoritative (${incompleteReviewProvenance.map(item => `${item.taskId}: ${item.reason}`).join('; ')}). Run ospec loop tick [change-path] to issue a fresh Loop-owned review; do not hand-fill executor provenance.`
                    : controllerStatus === 'DONE'
                        && verificationChecklistComplete
                        && progressProjection.uncheckedTaskIds.length === 0
                        ? 'Worker status is synchronized and archive-ready for the worker gate.'
                        : 'Worker status is synchronized. Complete remaining review or verification evidence before archive.',
        };
    }
    /**
     * Goal progress documents that are fully derivable must track reality on
     * every sync: proposal.md acceptance lines tagged `[verify:<id>]` tick when
     * matching verification evidence passes, and review.md is rewritten as a
     * derived summary of the final review. Classic changes keep manual
     * ownership of both documents.
     */
    async syncDerivedProgressDocuments(changePath, report, verificationEvidence) {
        const statePath = path.join(changePath, constants_1.FILE_NAMES.STATE);
        let state = null;
        if (await this.fileService.exists(statePath)) {
            try {
                state = await this.fileService.readJSON(statePath);
            }
            catch {
                state = null;
            }
        }
        const profile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(changePath, state);
        if (profile !== WorkflowProfile_1.GOAL_WORKFLOW_PROFILE)
            return;
        await this.syncProposalAcceptanceTicks(changePath, verificationEvidence);
        await this.syncDerivedReviewSummary(changePath, report);
    }
    async syncProposalAcceptanceTicks(changePath, verificationEvidence) {
        const proposalPath = path.join(changePath, constants_1.FILE_NAMES.PROPOSAL);
        if (!(await this.fileService.exists(proposalPath)))
            return;
        const satisfied = new Set();
        for (const record of verificationEvidence.records || []) {
            if (record.status !== 'PASSED')
                continue;
            for (const id of record.satisfies || []) {
                const trimmed = String(id || '').trim().toLowerCase();
                if (trimmed)
                    satisfied.add(trimmed);
            }
        }
        if (satisfied.size === 0)
            return;
        const content = await this.fileService.readFile(proposalPath);
        const updated = content.replace(/^(\s*[-*+]\s+\[) (\]\s+.*\[verify:([A-Za-z0-9._:-]+)\].*)$/gm, (match, prefix, rest, id) => satisfied.has(String(id).toLowerCase()) ? `${prefix}x${rest}` : match);
        if (updated !== content) {
            await this.fileService.writeFile(proposalPath, updated);
        }
    }
    async syncDerivedReviewSummary(changePath, report) {
        const finalReviewPath = path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        if (!(await this.fileService.exists(finalReviewPath)))
            return;
        let decision;
        try {
            decision = this.normalizeReviewRunDecision((0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(finalReviewPath)).data?.decision);
        }
        catch {
            return;
        }
        if (decision === 'PENDING')
            return;
        const reviewPath = path.join(changePath, constants_1.FILE_NAMES.REVIEW);
        let existingData = {};
        if (await this.fileService.exists(reviewPath)) {
            try {
                existingData = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath)).data || {};
            }
            catch {
                existingData = {};
            }
        }
        const approved = APPROVED_REVIEW_DECISIONS.has(decision);
        const tasks = this.flattenReportTasks(report);
        const allTaskReviewsApproved = tasks.length > 0 && tasks.every(task => task.review && APPROVED_REVIEW_DECISIONS.has(task.review.decision));
        const tick = (on) => (on ? 'x' : ' ');
        const body = [
            '## Derived Review Summary',
            '',
            '- This document is derived from the Goal review artifacts by `ospec execute sync`. Do not edit it by hand.',
            `- Final combined code review decision: ${decision} ([artifacts/reviews/final-review.md](artifacts/reviews/final-review.md))`,
            '',
            '## Task Review Decisions',
            '',
            ...tasks.map(task => `- ${task.id}: ${task.review?.decision || 'PENDING'}`),
            '',
            '## Review Checklist',
            '',
            `- [${tick(true)}] Final combined code review decision recorded`,
            `- [${tick(approved)}] Final combined code review approved`,
            `- [${tick(allTaskReviewsApproved)}] All task reviews approved`,
            '',
        ].join('\n');
        await this.writeLocalizedReportFile(changePath, reviewPath, (0, helpers_1.stringifyFrontmatter)(body, {
            ...existingData,
            feature: typeof existingData.feature === 'string' && existingData.feature.trim()
                ? existingData.feature
                : report.feature,
            created: existingData.created || new Date().toISOString().split('T')[0],
            status: approved ? 'approved' : String(decision).toLowerCase(),
            decision,
            review_source: 'artifacts/reviews/final-review.md',
            review_synced_at: new Date().toISOString(),
        }));
    }
    async review(changePath, options = {}) {
        if (options.taskId) {
            const batch = await this.reviewTasks(changePath, { taskIds: [options.taskId] });
            return batch.reviews[0];
        }
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const finalReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
            return this.withArtifactMutationRollback({
                files: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', CURRENT_REVIEW_DISPATCHES_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                    finalReviewPath,
                    finalReviewPath.replace(/\.md$/i, '.findings.json'),
                ],
                directories: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR),
                    path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_PACKAGES_DIR),
                ],
            }, () => this.reviewUnlocked(resolvedChangePath, options));
        });
    }
    async reviewTasks(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const taskIds = Array.isArray(options.taskIds)
                ? options.taskIds.map(taskId => String(taskId || '').trim())
                : [];
            if (taskIds.length === 0)
                throw new Error('Task review batch requires at least one task.');
            if (taskIds.some(taskId => !taskId))
                throw new Error('Task review batch contains an empty task ID.');
            if (new Set(taskIds).size !== taskIds.length)
                throw new Error('Task review batch contains duplicate task IDs.');
            const report = await this.getReport(resolvedChangePath);
            if (report.issues.length > 0 || report.invalidTasks.length > 0) {
                throw new Error('Cannot dispatch task review batch until task graph issues are resolved.');
            }
            const tasksById = new Map(this.flattenReportTasks(report).map(task => [task.id, task]));
            const tasks = taskIds.map(taskId => tasksById.get(taskId));
            if (tasks.some(task => !task)) {
                throw new Error(`Task review batch contains unknown task(s): ${taskIds.filter(taskId => !tasksById.has(taskId)).join(', ')}.`);
            }
            const normalizedTasks = tasks;
            if (normalizedTasks.length > 1
                && this.selectNonConflictingBatch(normalizedTasks).length !== normalizedTasks.length) {
                throw new Error('Task review batch contains target-file or declared task conflicts.');
            }
            const reviewArtifactPaths = [];
            for (const taskId of taskIds) {
                const prepared = await this.prepareTaskReviewDispatch(resolvedChangePath, report, taskId);
                if (APPROVED_REVIEW_DECISIONS.has(prepared.decision)) {
                    throw new Error(`Task ${taskId} code review is already ${prepared.decision}.`);
                }
                reviewArtifactPaths.push(prepared.reviewArtifactPath);
                reviewArtifactPaths.push(prepared.reviewArtifactPath.replace(/\.md$/i, '.findings.json'));
            }
            return this.withArtifactMutationRollback({
                files: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', CURRENT_REVIEW_DISPATCHES_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                    ...reviewArtifactPaths,
                ],
                directories: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR),
                    path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_PACKAGES_DIR),
                ],
            }, async () => {
                const reviews = [];
                for (const taskId of taskIds) {
                    reviews.push(await this.reviewUnlocked(resolvedChangePath, { taskId }));
                }
                return {
                    changePath: resolvedChangePath,
                    reviews,
                    dispatches: reviews.map(item => item.dispatch),
                    nextInstruction: `Created ${reviews.length} conflict-safe task-review dispatch(es) in one transaction. Launch one fresh independent native reviewer per packet.`,
                };
            });
        });
    }
    async reviewPlanning(changePath) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
            for (const stage of ['design', 'plan']) {
                const readiness = await this.validateDocumentReviewEvidence(resolvedChangePath, stage);
                if (!readiness.ready) {
                    throw new Error(`Cannot dispatch combined planning review: ${readiness.reason}`);
                }
            }
            await this.syncWorkerStatusUnlocked(resolvedChangePath);
            const report = await this.getReport(resolvedChangePath);
            if (report.issues.length > 0 || report.invalidTasks.length > 0 || report.taskCount === 0) {
                throw new Error(`Cannot dispatch combined planning review until the task graph is valid: ${[
                    ...report.issues,
                    ...report.invalidTasks.flatMap(item => item.reasons),
                ].join('; ') || 'task graph has no tasks'}`);
            }
            const planningReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', PLANNING_REVIEW_FILE);
            if (!(await this.fileService.exists(planningReviewPath))) {
                await this.writeLocalizedReportFile(resolvedChangePath, planningReviewPath, this.buildDefaultPlanningReviewArtifact(report.feature));
            }
            const planningFiles = [
                constants_1.FILE_NAMES.PROPOSAL,
                constants_1.FILE_NAMES.DESIGN,
                constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
                constants_1.FILE_NAMES.TASKS,
                path.join('artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
            ].map(file => path.relative(projectRoot, path.join(resolvedChangePath, file)).replace(/\\/g, '/'));
            const targetFiles = this.normalizeTargetFiles(planningFiles);
            const targetSnapshots = await this.capturePlanningSemanticSnapshots(projectRoot, targetFiles);
            const targetSnapshotHash = this.hashTargetSnapshots(targetSnapshots);
            const reviewContextHash = (0, crypto_1.createHash)('sha256').update(this.canonicalJson({
                contractVersion: PLANNING_CONTRACT_VERSION,
                targetSnapshotHash,
            }), 'utf8').digest('hex');
            const current = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(planningReviewPath));
            const currentDispatchId = String(current.data?.review_dispatch_id || '').trim();
            if (currentDispatchId && this.toFileSafeId(currentDispatchId) === currentDispatchId) {
                const currentRecordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${currentDispatchId}.json`);
                if (await this.fileService.exists(currentRecordPath)) {
                    const currentRecord = await this.fileService.readJSON(currentRecordPath);
                    if (currentRecord.stage === 'planning'
                        && currentRecord.reviewContextHash === reviewContextHash
                        && currentRecord.targetSnapshotHash === targetSnapshotHash
                        && !currentRecord.loopActionId) {
                        return {
                            changePath: resolvedChangePath,
                            graphPath: report.graphPath,
                            workerStatusPath: path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                            dispatch: currentRecord,
                            projectSession: currentRecord.projectSession || await this.readBootstrapProjectSessionSnapshot(projectRoot),
                            warnings: ['Combined planning review already has a current dispatch for this exact planning snapshot.'],
                            nextInstruction: 'Reuse the current combined planning review action; do not create another reviewer.',
                        };
                    }
                }
            }
            const now = new Date().toISOString();
            const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
            const executionPolicy = await this.readWorkflowExecutionPolicy(resolvedChangePath);
            const loopControllerSession = await this.readLoopControllerSession(resolvedChangePath);
            const reviewTarget = this.normalizeWorkerToolTarget(loopControllerSession.target || 'generic');
            const workerProfile = resolveWorkerProfileForTarget(buildReviewerWorkerProfile('planning_reviewer', executionPolicy.modelProfiles), reviewTarget, executionPolicy.modelProfiles);
            const runtimeAdapter = loopControllerSession.controllerMode
                ? this.runtimeAdapterService.resolve({
                    projectRoot,
                    target: reviewTarget,
                    capability: loopControllerSession.capability,
                    nativeHarness: loopControllerSession.nativeHarnessMetadata,
                    requiresIndependentWorker: true,
                    modelSelection: {
                        requestedModel: workerProfile.requestedModel ?? workerProfile.model,
                        configuredModel: workerProfile.configuredModel ?? workerProfile.model,
                        configurationSource: workerProfile.modelConfigurationSource || (workerProfile.model ? 'target' : 'harness-default'),
                    },
                    cacheFilePath: path.join(resolvedChangePath, 'artifacts', 'agents', RUNTIME_ADAPTER_CACHE_FILE),
                })
                : null;
            const reviewId = `review-${this.toFileSafeTimestamp(now)}-planning-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
            const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.md`);
            const reviewPackage = await this.writeTaskReviewPackage({
                projectRoot,
                changePath: resolvedChangePath,
                task: { id: 'planning', targetFiles },
                dispatch: null,
                reviewId,
            });
            const record = {
                id: reviewId,
                stage: 'planning',
                taskId: null,
                taskTitle: 'Combined planning review',
                reviewerRole: 'planning_reviewer',
                projectSession,
                status: 'DISPATCHED',
                assignedAt: now,
                packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
                recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
                reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, planningReviewPath),
                reviewPackagePath: reviewPackage.path,
                workerProfile,
                gitHead: reviewPackage.gitHead,
                targetFiles,
                targetSnapshots,
                targetSnapshotHash,
                reviewContextHash,
                runtimeAdapter,
                requiresExecutorProvenance: Boolean(runtimeAdapter?.selected),
                requiresNativeExecutorProvenance: false,
                controllerSessionReportedAt: null,
                snapshotContract: PLANNING_SNAPSHOT_CONTRACT,
            };
            const postRepairSections = await this.buildPostRepairReviewSections(resolvedChangePath, projectRoot);
            await this.fileService.writeJSON(recordPath, record);
            await this.setCurrentReviewDispatch(resolvedChangePath, this.planningReviewScopeKey(), reviewId);
            await this.prepareReviewArtifactForDispatch(resolvedChangePath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildReviewDispatchPacket(report, record, postRepairSections));
            await this.recordExecutionMetric(resolvedChangePath, report.feature, [{
                    kind: 'review_packet',
                    id: reviewId,
                    taskId: null,
                    path: record.packetPath,
                    recordedAt: now,
                    durationMs: null,
                    capabilityTier: workerProfile.capabilityTier,
                    modelProfile: workerProfile.modelProfile,
                    model: workerProfile.model,
                    workflowStage: 'planning_review',
                }]);
            const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
            return {
                changePath: resolvedChangePath,
                graphPath: report.graphPath,
                workerStatusPath: workerStatusSync.workerStatusPath,
                dispatch: record,
                projectSession,
                warnings: runtimeAdapter?.warnings || [],
                nextInstruction: 'Launch one fresh independent combined planning reviewer for proposal, design, implementation plan, task graph, and acceptance-to-verification coverage.',
            };
        });
    }
    async preparePlanningRepair(changePath) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const existingPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            if (await this.fileService.exists(existingPath)) {
                const existing = await this.fileService.readJSON(existingPath);
                if (existing.status === 'completed') {
                    throw new Error(`Automatic planning repair limit reached; ${existing.id} already consumed the single grouped repair attempt.`);
                }
                if (existing.status === 'dispatched') {
                    const dispatchedContext = await this.capturePlanningContext(resolvedChangePath);
                    if (dispatchedContext.targetSnapshotHash !== existing.beforeSnapshotHash) {
                        throw new Error(`Automatic planning repair limit reached; dispatched repair ${existing.id} modified planning content without completing its evidence.`);
                    }
                    // The dispatched executor failed or was lost before touching any
                    // planning content. Only a completed repair consumes the single
                    // allowance; re-arm instead of dead-ending the Goal on an
                    // infrastructure failure.
                    await this.fileService.remove(existingPath);
                    await this.fileService.remove(path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_PACKET_FILE));
                }
                else {
                    const reviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', PLANNING_REVIEW_FILE);
                    const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
                    const context = await this.capturePlanningContext(resolvedChangePath);
                    if (this.normalizeReviewRunDecision(review.data?.decision) === 'NEEDS_CHANGES'
                        && String(review.data?.review_dispatch_id || '') === existing.sourceReviewDispatchId
                        && context.targetSnapshotHash === existing.beforeSnapshotHash) {
                        return {
                            changePath: resolvedChangePath,
                            record: existing,
                            nextInstruction: 'Reuse the prepared grouped planning repair; it has not yet consumed the single repair allowance.',
                        };
                    }
                    await this.fileService.remove(existingPath);
                    await this.fileService.remove(path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_PACKET_FILE));
                }
            }
            const validation = await this.validatePlanningReviewEvidence(resolvedChangePath);
            if (!validation.ready)
                throw new Error(`Cannot prepare planning repair: ${validation.reason}`);
            const reviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', PLANNING_REVIEW_FILE);
            const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
            const decision = this.normalizeReviewRunDecision(review.data?.decision);
            if (decision !== 'NEEDS_CHANGES') {
                throw new Error(`Combined planning repair requires NEEDS_CHANGES (current: ${decision}).`);
            }
            const dispatchId = String(review.data?.review_dispatch_id || '').trim();
            const dispatchPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(dispatchId)}.json`);
            const dispatch = await this.fileService.readJSON(dispatchPath);
            if (dispatch.stage !== 'planning' || dispatch.id !== dispatchId || !dispatch.reviewContextHash) {
                throw new Error('Combined planning repair source dispatch is invalid.');
            }
            const findingResult = await this.readReviewFindings(reviewPath, review.content);
            if (findingResult.structured.length === 0) {
                throw new Error('Combined planning review NEEDS_CHANGES requires at least one structured finding.');
            }
            const context = await this.capturePlanningContext(resolvedChangePath);
            const changePrefix = path.relative(context.projectRoot, resolvedChangePath).replace(/\\/g, '/');
            const allowed = new Map(context.targetFiles.map(file => [normalizeTaskPath(file), file]));
            const normalizeRepairPath = (value) => {
                const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                if (!normalized)
                    return '';
                const changeRelative = normalizeTaskPath(normalized);
                if (allowed.has(changeRelative))
                    return allowed.get(changeRelative);
                const prefixed = normalizeTaskPath(`${changePrefix}/${normalized}`);
                return allowed.get(prefixed) || '';
            };
            const requestedScope = findingResult.structured.flatMap(finding => finding.repairScope);
            if (requestedScope.length === 0) {
                throw new Error('Combined planning findings must declare a bounded repair_scope.');
            }
            const targetFiles = Array.from(new Set(requestedScope.map(normalizeRepairPath)));
            if (targetFiles.some(file => !file) || targetFiles.length === 0) {
                throw new Error('Combined planning repair scope contains a path outside proposal, design, implementation plan, tasks, or task graph.');
            }
            const findingFingerprint = (0, crypto_1.createHash)('sha256').update(this.canonicalJson(findingResult.structured.map(finding => ({
                id: finding.id,
                severity: finding.severity,
                message: finding.message,
                evidence: finding.evidence,
                requirementRefs: finding.requirementRefs,
                repairScope: finding.repairScope,
            }))), 'utf8').digest('hex');
            const now = new Date().toISOString();
            const id = `planning-repair-${this.toFileSafeTimestamp(now)}`;
            const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_PACKET_FILE);
            const workspaceBaseline = await this.capturePlanningRepairWorkspaceBaseline(context.projectRoot);
            const baselineDir = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_BASELINE_DIR);
            await this.fileService.remove(baselineDir);
            const baselineFiles = [];
            for (const targetFile of targetFiles) {
                const sourcePath = path.resolve(context.projectRoot, ...targetFile.split('/'));
                const baselineRelative = ['artifacts', 'agents', PLANNING_REPAIR_BASELINE_DIR, targetFile.replace(/[\\/]/g, '__')].join('/');
                const existed = await this.fileService.exists(sourcePath);
                if (existed) {
                    await this.fileService.copy(sourcePath, path.join(resolvedChangePath, ...baselineRelative.split('/')));
                }
                baselineFiles.push({ path: targetFile, baselinePath: baselineRelative, existed });
            }
            const record = {
                version: '1.0',
                id,
                feature: await this.readFeatureName(resolvedChangePath),
                status: 'ready',
                createdAt: now,
                completedAt: null,
                loopActionId: null,
                loopActionItemId: null,
                sourceReviewDispatchId: dispatch.id,
                sourceReviewContextHash: dispatch.reviewContextHash,
                findingFingerprint,
                findingIds: findingResult.structured.map(finding => finding.id),
                findings: findingResult.structured,
                targetFiles,
                beforeSnapshotHash: context.targetSnapshotHash,
                afterSnapshotHash: null,
                workspaceGitHead: workspaceBaseline?.gitHead || null,
                workspaceBaselineSnapshots: workspaceBaseline?.snapshots || null,
                workspaceBaselineTruncated: workspaceBaseline?.truncated === true,
                recordPath: this.toChangeRelativePath(resolvedChangePath, existingPath),
                packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
                baselineFiles,
                postRepairReviewMode: null,
            };
            await this.fileService.writeJSON(existingPath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, packetPath, [
                '# Grouped Planning Repair',
                '',
                `- Repair ID: ${record.id}`,
                `- Source review: ${record.sourceReviewDispatchId}`,
                `- Finding fingerprint: ${record.findingFingerprint}`,
                `- Authorized target files: ${record.targetFiles.join(', ')}`,
                `- Planning snapshot before repair: ${record.beforeSnapshotHash}`,
                '',
                '## Findings',
                '',
                ...record.findings.map(finding => `- ${this.renderReviewFinding(finding)}`),
                '',
                '## Repair Contract',
                '',
                '- Resolve all findings in one coherent edit. Do not modify files outside the authorized target list.',
                '- Keep tasks.md generated from task graph state; run ospec execute sync instead of hand-editing derived status.',
                '- Rerun deterministic design and plan preflights after changing authoritative documents.',
                '- The repair is complete only when the planning snapshot changes and the task graph remains valid.',
                '',
            ].join('\n'));
            return {
                changePath: resolvedChangePath,
                record,
                nextInstruction: 'Launch exactly one grouped planning repair worker. A second automatic repair is forbidden.',
            };
        });
    }
    async bindPlanningRepairLoopAction(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            const record = await this.fileService.readJSON(recordPath);
            if (record.status === 'completed') {
                throw new Error(`Planning repair ${record.id} is already completed.`);
            }
            if (record.status === 'dispatched') {
                if (record.loopActionId !== options.actionId || record.loopActionItemId !== options.actionItemId) {
                    throw new Error(`Planning repair ${record.id} is already bound to another Loop action.`);
                }
                return record;
            }
            record.status = 'dispatched';
            record.loopActionId = options.actionId;
            record.loopActionItemId = options.actionItemId;
            await this.fileService.writeJSON(recordPath, record);
            return record;
        });
    }
    async validatePlanningRepairEvidence(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
        if (!(await this.fileService.exists(recordPath))) {
            return { ready: false, reason: 'Grouped planning repair record is missing.' };
        }
        try {
            const record = await this.fileService.readJSON(recordPath);
            if (record.status !== 'dispatched' || !record.loopActionId || !record.loopActionItemId) {
                return { ready: false, reason: 'Grouped planning repair is not bound to an issued Loop action.' };
            }
            const context = await this.capturePlanningContext(resolvedChangePath);
            if (context.targetSnapshotHash === record.beforeSnapshotHash) {
                return { ready: false, reason: 'Grouped planning repair is dispatched and has not written repaired planning documents yet; keep waiting for the repair executor.' };
            }
            const workspaceScopeError = await this.validatePlanningRepairWorkspaceScope(resolvedChangePath, record, context);
            if (workspaceScopeError)
                return { ready: false, reason: workspaceScopeError };
            for (const stage of ['design', 'plan']) {
                const readiness = await this.validateDocumentReviewEvidence(resolvedChangePath, stage);
                if (!readiness.ready)
                    return { ready: false, reason: readiness.reason };
            }
            const report = await this.getReport(resolvedChangePath);
            if (report.issues.length > 0 || report.invalidTasks.length > 0 || report.taskCount === 0) {
                return { ready: false, reason: `Grouped planning repair left an invalid task graph: ${[
                        ...report.issues,
                        ...report.invalidTasks.flatMap(item => item.reasons),
                    ].join('; ') || 'task graph has no tasks'}` };
            }
            return { ready: true, reason: null };
        }
        catch (error) {
            return { ready: false, reason: `Grouped planning repair evidence is invalid (${error?.message || error}).` };
        }
    }
    async completePlanningRepair(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const validation = await this.validatePlanningRepairEvidence(resolvedChangePath);
            if (!validation.ready)
                throw new Error(validation.reason || 'Grouped planning repair evidence is incomplete.');
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            const record = await this.fileService.readJSON(recordPath);
            if (record.loopActionId !== options.actionId || record.loopActionItemId !== options.actionItemId) {
                throw new Error(`Planning repair ${record.id} completion does not match its issued Loop action.`);
            }
            const context = await this.capturePlanningContext(resolvedChangePath);
            record.status = 'completed';
            record.completedAt = new Date().toISOString();
            record.afterSnapshotHash = context.targetSnapshotHash;
            await this.fileService.writeJSON(recordPath, record);
            return record;
        });
    }
    /**
     * Post-repair planning gate without an AI re-review: when the single grouped
     * repair resolved findings that were all medium severity or lower and every
     * deterministic gate re-passes, record APPROVED_WITH_CONCERNS directly. Task
     * reviews and the final review remain the semantic safety net downstream.
     */
    async acceptPlanningRepairDeterministically(changePath) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const repairRecordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            if (!(await this.fileService.exists(repairRecordPath))) {
                return { accepted: false, reason: 'No grouped planning repair record exists.' };
            }
            let record;
            try {
                record = await this.fileService.readJSON(repairRecordPath);
            }
            catch (error) {
                return { accepted: false, reason: `Grouped planning repair record is unreadable (${error?.message || error}).` };
            }
            if (record.status !== 'completed') {
                return { accepted: false, reason: `Grouped planning repair is ${record.status}, not completed.` };
            }
            if (record.postRepairReviewMode) {
                return { accepted: false, reason: 'The post-repair planning decision is already settled.' };
            }
            const blocking = (record.findings || []).filter(finding => PLANNING_REVIEW_BLOCKING_SEVERITIES.has(finding.severity));
            if (blocking.length > 0) {
                return {
                    accepted: false,
                    reason: `Findings ${blocking.map(finding => finding.id).join(', ')} require an independent delta re-review (severity high/critical).`,
                };
            }
            const decision = await this.readValidatedPlanningReviewDecision(resolvedChangePath);
            if (decision !== 'PENDING') {
                return { accepted: false, reason: `Current planning review decision is ${decision}.` };
            }
            const context = await this.capturePlanningContext(resolvedChangePath);
            if (!record.afterSnapshotHash || record.afterSnapshotHash !== context.targetSnapshotHash) {
                return { accepted: false, reason: 'Planning content changed after the grouped repair completed; a fresh independent review is required.' };
            }
            for (const stage of ['design', 'plan']) {
                const readiness = await this.validateDocumentReviewEvidence(resolvedChangePath, stage);
                if (!readiness.ready) {
                    return { accepted: false, reason: readiness.reason || `Planning ${stage} preflight is not ready.` };
                }
            }
            await this.syncWorkerStatusUnlocked(resolvedChangePath);
            const report = await this.getReport(resolvedChangePath);
            if (report.issues.length > 0 || report.invalidTasks.length > 0 || report.taskCount === 0) {
                return { accepted: false, reason: 'The task graph is not valid after the grouped repair.' };
            }
            const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
            const now = new Date().toISOString();
            const reviewId = `review-${this.toFileSafeTimestamp(now)}-planning-deterministic-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
            const dispatchRecordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
            const planningReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', PLANNING_REVIEW_FILE);
            const reviewContextHash = (0, crypto_1.createHash)('sha256').update(this.canonicalJson({
                contractVersion: PLANNING_CONTRACT_VERSION,
                targetSnapshotHash: context.targetSnapshotHash,
            }), 'utf8').digest('hex');
            const dispatch = {
                id: reviewId,
                stage: 'planning',
                taskId: null,
                taskTitle: 'Combined planning review (deterministic post-repair acceptance)',
                reviewerRole: 'planning_reviewer',
                projectSession: await this.readBootstrapProjectSessionSnapshot(projectRoot),
                status: 'DISPATCHED',
                assignedAt: now,
                packetPath: this.toChangeRelativePath(resolvedChangePath, dispatchRecordPath),
                recordPath: this.toChangeRelativePath(resolvedChangePath, dispatchRecordPath),
                reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, planningReviewPath),
                reviewPackagePath: null,
                gitHead: null,
                targetFiles: context.targetFiles,
                targetSnapshots: context.targetSnapshots,
                targetSnapshotHash: context.targetSnapshotHash,
                reviewContextHash,
                runtimeAdapter: null,
                requiresExecutorProvenance: false,
                requiresNativeExecutorProvenance: false,
                controllerSessionReportedAt: null,
                snapshotContract: PLANNING_SNAPSHOT_CONTRACT,
            };
            await this.fileService.writeJSON(dispatchRecordPath, dispatch);
            await this.setCurrentReviewDispatch(resolvedChangePath, this.planningReviewScopeKey(), reviewId);
            const body = [
                `# Combined Planning Review: ${record.feature}`,
                '',
                '## Deterministic Post-Repair Acceptance',
                '',
                `- Grouped planning repair ${record.id} resolved every recorded finding (maximum severity medium).`,
                '- Deterministic gates re-passed: design preflight, implementation plan preflight, and task graph validity.',
                '- The AI re-review was skipped by policy because no high or critical finding was recorded. Task reviews and the final review remain the semantic safety net.',
                '',
                '## Carried Concerns',
                '',
                ...(record.findings || []).map(finding => `- [${finding.id}] [${finding.severity}] ${finding.message} — resolved by grouped repair ${record.id}; carried as a concern for downstream review.`),
                '',
            ].join('\n');
            await this.fileService.writeFile(planningReviewPath, (0, helpers_1.stringifyFrontmatter)(body, {
                status: 'approved_with_concerns',
                decision: 'APPROVED_WITH_CONCERNS',
                reviewer_role: 'planning_reviewer',
                review_dispatch_id: reviewId,
                target_snapshot_hash: context.targetSnapshotHash,
                reviewed_at: now,
            }));
            await this.fileService.writeJSON(planningReviewPath.replace(/\.md$/i, '.findings.json'), {
                version: '1.0',
                findings: [],
            });
            record.postRepairReviewMode = 'deterministic';
            await this.fileService.writeJSON(repairRecordPath, record);
            return {
                accepted: true,
                reason: `Grouped planning repair ${record.id} accepted deterministically (all findings medium or lower); planning review recorded as APPROVED_WITH_CONCERNS without an AI re-review.`,
            };
        });
    }
    /**
     * A dispatched grouped repair whose completion evidence never settled leaves
     * its record in 'dispatched' with planning edits already applied. When a later
     * combined planning review approves that content, accept the repair as done:
     * otherwise a later planning cycle misreads the record as a partial edit and
     * dead-ends the Goal even though its planning was approved.
     */
    async closeOutSupersededPlanningRepair(changePath) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            if (!(await this.fileService.exists(recordPath)))
                return false;
            let record;
            try {
                record = await this.fileService.readJSON(recordPath);
            }
            catch {
                return false;
            }
            if (record.status !== 'dispatched')
                return false;
            const context = await this.capturePlanningContext(resolvedChangePath);
            record.status = 'completed';
            record.completedAt = new Date().toISOString();
            record.afterSnapshotHash = context.targetSnapshotHash;
            await this.fileService.writeJSON(recordPath, record);
            return true;
        });
    }
    async buildPostRepairReviewSections(changePath, projectRoot) {
        const recordPath = path.join(changePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
        if (!(await this.fileService.exists(recordPath)))
            return [];
        let record;
        try {
            record = await this.fileService.readJSON(recordPath);
        }
        catch {
            return [];
        }
        // Include repair context for a dispatched-but-unsettled repair too: its
        // edits are already in the planning files, and the fresh reviewer must
        // know which findings that repair was resolving.
        if ((record.status !== 'completed' && record.status !== 'dispatched')
            || record.postRepairReviewMode === 'deterministic')
            return [];
        return [
            '',
            '## Post-Repair Delta Review (Final Round)',
            '',
            '- The single grouped planning repair allowance is consumed. This re-review is the final planning gate: NEEDS_CHANGES permanently blocks this Goal.',
            '- Verify that each repaired finding below is resolved in the current planning files. Focus on the repaired files and the changed regions; do not re-audit the whole planning set.',
            '- Raise a NEW finding only for a critical or high severity defect that makes implementation unsafe. Record residual improvement-level concerns via APPROVED_WITH_CONCERNS instead of NEEDS_CHANGES.',
            '',
            '### Repaired Findings To Verify',
            '',
            ...(record.findings || []).map(finding => `- ${this.renderReviewFinding(finding)}`),
            ...(await this.buildPlanningRepairDiffSections(changePath, projectRoot, record)),
        ];
    }
    /**
     * When a task review is re-dispatched after a NEEDS_CHANGES round, scope
     * the fresh reviewer to verifying the repaired findings plus their direct
     * regression surface instead of re-reviewing the whole task from scratch.
     * Read before prepareReviewArtifactForDispatch removes the prior findings.
     */
    async buildTaskPostRepairReviewSections(taskReview) {
        if (taskReview.decision !== 'NEEDS_CHANGES')
            return [];
        if (!(await this.fileService.exists(taskReview.reviewArtifactPath)))
            return [];
        let findings = [];
        try {
            const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(taskReview.reviewArtifactPath));
            findings = (await this.readReviewFindings(taskReview.reviewArtifactPath, review.content)).structured;
        }
        catch {
            return [];
        }
        if (findings.length === 0)
            return [];
        return [
            '',
            '## Post-Repair Delta Review',
            '',
            '- A grouped repair addressed the previous NEEDS_CHANGES findings below. Verify each repaired finding is resolved and check its immediate regression surface; do not re-review the whole task from scratch.',
            '- The review package diff carries the current scoped evidence; focus on the repaired regions and their direct callers.',
            '- Raise a NEW finding only for a defect introduced by the repair or a critical/high defect in the repaired regions that the previous round missed.',
            '',
            '### Repaired Findings To Verify',
            '',
            ...findings.map(finding => `- ${this.renderReviewFinding(finding)}`),
        ];
    }
    async buildPlanningRepairDiffSections(changePath, projectRoot, record) {
        if (!Array.isArray(record.baselineFiles) || record.baselineFiles.length === 0) {
            return [
                '',
                '### Repair Diff',
                '',
                `- Baseline copies are unavailable; read the repaired files directly: ${record.targetFiles.join(', ')}.`,
            ];
        }
        const sections = ['', '### Repair Diff (baseline -> current)', ''];
        for (const item of record.baselineFiles) {
            if (!item.existed) {
                sections.push(`- ${item.path}: added by the repair; read the full file.`);
                continue;
            }
            const baselineAbsolute = path.join(changePath, ...item.baselinePath.split('/'));
            const currentAbsolute = path.resolve(projectRoot, ...item.path.split('/'));
            const diff = await this.runGit(projectRoot, ['diff', '--no-index', '--unified=3', '--', baselineAbsolute, currentAbsolute]);
            if (diff.status === 0) {
                sections.push(`- ${item.path}: unchanged by the repair.`);
                continue;
            }
            if (diff.status !== 1 || !diff.stdout.trim()) {
                sections.push(`- ${item.path}: diff unavailable; compare ${item.baselinePath} against the current file.`);
                continue;
            }
            // F30: informational. `truncateForPacket` already caps this at 250
            // lines, so the git-level cut is invisible unless it is named.
            if (diff.stdoutTruncated === true) {
                sections.push(`- ${item.path}: the diff below is INCOMPLETE (${this.gitTruncationReason('git diff')})`);
            }
            sections.push(`#### ${item.path}`, '', '```diff', this.truncateForPacket(diff.stdout, 250), '```', '');
        }
        return sections;
    }
    buildVerificationFailureFocusSections(feedback) {
        const trimmed = String(feedback || '').trim();
        if (!trimmed)
            return [];
        return [
            '',
            '## Verification-Failure Scoped Re-Review',
            '',
            `- Deterministic verification failed after a prior approval: ${trimmed}`,
            '- Scope this review to diagnosing that failure: identify the responsible defect(s) and write findings with a bounded repair scope for them.',
            '- Do not re-audit unrelated areas that the previous final review already approved unless the failure evidence implicates them.',
            '- If the failure is environmental rather than a code defect, record decision BLOCKED with the blocking context instead of NEEDS_CHANGES.',
        ];
    }
    truncateForPacket(text, maxLines) {
        const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
        if (lines.length <= maxLines)
            return lines.join('\n').trimEnd();
        return [
            ...lines.slice(0, maxLines),
            `... (${lines.length - maxLines} more diff lines truncated; read the files directly if needed)`,
        ].join('\n');
    }
    async capturePlanningContext(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const targetFiles = this.normalizeTargetFiles([
            constants_1.FILE_NAMES.PROPOSAL,
            constants_1.FILE_NAMES.DESIGN,
            constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
            constants_1.FILE_NAMES.TASKS,
            path.join('artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
        ].map(file => path.relative(projectRoot, path.join(resolvedChangePath, file)).replace(/\\/g, '/')));
        const targetSnapshots = await this.capturePlanningSemanticSnapshots(projectRoot, targetFiles);
        return {
            projectRoot,
            targetFiles,
            targetSnapshots,
            targetSnapshotHash: this.hashTargetSnapshots(targetSnapshots),
        };
    }
    async capturePlanningRepairWorkspaceBaseline(projectRoot) {
        const status = await this.runGit(projectRoot, [
            'status',
            '--porcelain=v2',
            '--untracked-files=all',
            '--no-renames',
            '-z',
        ]);
        if (!status.ok)
            return null;
        const paths = this.parseGitStatusV2ZPaths(status.stdout);
        return {
            gitHead: await this.readGitOutput(projectRoot, ['rev-parse', 'HEAD']) || null,
            snapshots: await this.captureTargetSnapshots(projectRoot, paths),
            // F30: a truncated baseline is a baseline missing files, and every
            // missing file reads as "unchanged" at validation time. The scope
            // check cannot be run against it, so the fact is recorded and the
            // validation below refuses rather than certifying scope it never saw.
            truncated: status.stdoutTruncated === true,
        };
    }
    async validatePlanningRepairWorkspaceScope(changePath, record, context) {
        if (!Array.isArray(record.workspaceBaselineSnapshots))
            return null;
        if (record.workspaceBaselineTruncated === true) {
            return `Grouped planning repair workspace scope cannot be verified: ${this.gitTruncationReason('the baseline git status')}`;
        }
        const status = await this.runGit(context.projectRoot, [
            'status',
            '--porcelain=v2',
            '--untracked-files=all',
            '--no-renames',
            '-z',
        ]);
        if (!status.ok) {
            return 'Grouped planning repair workspace scope cannot be verified because Git status is unavailable.';
        }
        if (status.stdoutTruncated === true) {
            return `Grouped planning repair workspace scope cannot be verified: ${this.gitTruncationReason('git status')}`;
        }
        const currentHead = await this.readGitOutput(context.projectRoot, ['rev-parse', 'HEAD']) || null;
        if (record.workspaceGitHead !== currentHead) {
            return 'Grouped planning repair changed Git HEAD; planning repair workers may not commit or switch revisions.';
        }
        const currentStatusPaths = this.parseGitStatusV2ZPaths(status.stdout);
        const baselineByPath = new Map(record.workspaceBaselineSnapshots.map(snapshot => [
            normalizeTaskPath(snapshot.path),
            snapshot,
        ]));
        const allPaths = this.normalizeTargetFiles([
            ...record.workspaceBaselineSnapshots.map(snapshot => snapshot.path),
            ...currentStatusPaths,
        ]);
        const currentSnapshots = await this.captureTargetSnapshots(context.projectRoot, allPaths);
        const changedPaths = currentSnapshots
            .filter(snapshot => {
            const baseline = baselineByPath.get(normalizeTaskPath(snapshot.path));
            return !baseline
                || baseline.exists !== snapshot.exists
                || baseline.kind !== snapshot.kind
                || baseline.contentHash !== snapshot.contentHash
                || baseline.entryCount !== snapshot.entryCount;
        })
            .map(snapshot => snapshot.path);
        const planningTargets = context.targetFiles.map(normalizeTaskPath);
        const authorizedTargets = record.targetFiles.map(normalizeTaskPath);
        const changePrefix = path.relative(context.projectRoot, changePath).replace(/\\/g, '/').replace(/\/$/, '');
        const outsideScope = changedPaths.filter(changedPath => {
            const normalized = normalizeTaskPath(changedPath);
            const planningFile = planningTargets.some(target => taskPathsOverlap(normalized, target));
            if (planningFile) {
                return !authorizedTargets.some(target => taskPathsOverlap(normalized, target));
            }
            if (!changePrefix && (normalized.startsWith('artifacts/') || normalized === constants_1.FILE_NAMES.STATE)) {
                return false;
            }
            return !this.isGoalWorkspaceControlPath(changedPath, changePrefix);
        });
        return outsideScope.length > 0
            ? `Grouped planning repair changed files outside its authorized planning scope: ${outsideScope.join(', ')}.`
            : null;
    }
    async reviewUnlocked(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const report = await this.getReport(resolvedChangePath);
        if (report.issues.length > 0 || report.invalidTasks.length > 0) {
            throw new Error('Cannot dispatch review until task graph issues and invalid tasks are resolved.');
        }
        const requestedTaskId = options.taskId?.trim();
        const taskReview = requestedTaskId
            ? await this.prepareTaskReviewDispatch(resolvedChangePath, report, requestedTaskId)
            : null;
        if (!taskReview && (report.completedTasks.length !== report.taskCount || report.taskCount === 0 || report.graphStatus.toLowerCase() !== 'completed')) {
            throw new Error('Cannot dispatch review until the task graph is completed.');
        }
        const now = new Date().toISOString();
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const warnings = [...projectSession.warnings];
        const executionPolicy = await this.readWorkflowExecutionPolicy(resolvedChangePath);
        const loopControllerSession = await this.readLoopControllerSession(resolvedChangePath);
        const reviewTarget = this.normalizeWorkerToolTarget(loopControllerSession.target || 'generic');
        const taskReviewWorkerProfile = resolveWorkerProfileForTarget(buildReviewerWorkerProfile('code_reviewer', executionPolicy.modelProfiles), reviewTarget, executionPolicy.modelProfiles);
        const controllerReviewAdapter = loopControllerSession.controllerMode
            ? this.runtimeAdapterService.resolve({
                projectRoot,
                target: loopControllerSession.target,
                capability: loopControllerSession.capability,
                nativeHarness: loopControllerSession.nativeHarnessMetadata,
                requiresIndependentWorker: true,
                modelSelection: {
                    requestedModel: taskReviewWorkerProfile.requestedModel ?? taskReviewWorkerProfile.model,
                    configuredModel: taskReviewWorkerProfile.configuredModel ?? taskReviewWorkerProfile.model,
                    configurationSource: taskReviewWorkerProfile.modelConfigurationSource || (taskReviewWorkerProfile.model ? 'target' : 'harness-default'),
                },
                cacheFilePath: path.join(resolvedChangePath, 'artifacts', 'agents', RUNTIME_ADAPTER_CACHE_FILE),
            })
            : null;
        if (controllerReviewAdapter?.blocked || (controllerReviewAdapter && !controllerReviewAdapter.selected)) {
            const reasons = controllerReviewAdapter.candidates
                .filter(candidate => !candidate.available)
                .map(candidate => `${candidate.id}: ${candidate.reason}`)
                .join('; ');
            warnings.push(`No automated independent runtime adapter is available for code review; use an independent human reviewer. ${reasons}`);
        }
        // Per-task review is a single combined code review (spec compliance + code quality in one pass).
        if (taskReview) {
            if (APPROVED_REVIEW_DECISIONS.has(taskReview.decision)) {
                throw new Error(`Task ${taskReview.task.id} code review is already ${taskReview.decision}. Continue with dependent task dispatch.`);
            }
            const reviewId = `review-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(taskReview.task.id)}-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
            const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.md`);
            const session = await this.readSession(this.getSessionPath(resolvedChangePath), report.feature);
            const taskDispatch = [...session.dispatches]
                .reverse()
                .find(item => item.taskId === taskReview.task.id) || null;
            const regressionTasks = this.getUpstreamRegressionTasks(taskReview.task, this.flattenReportTasks(report));
            const reviewPackage = await this.writeTaskReviewPackage({
                projectRoot,
                changePath: resolvedChangePath,
                task: taskReview.task,
                dispatch: taskDispatch,
                reviewId,
                regressionTasks,
            });
            const targetFiles = this.normalizeTargetFiles([
                ...taskReview.task.targetFiles,
                this.getTaskWorkerReportProjectRelativePath(resolvedChangePath, projectRoot, taskReview.task.id),
            ]);
            const targetSnapshots = await this.captureTargetSnapshots(projectRoot, targetFiles);
            const targetSnapshotHash = this.hashTargetSnapshots(targetSnapshots);
            const graphContract = await this.readTaskGraphContractVersion(resolvedChangePath);
            const reviewContextHash = this.computeTaskReviewContextHash(taskReview.task, targetSnapshotHash, regressionTasks.map(task => task.id), graphContract);
            const record = {
                id: reviewId,
                stage: 'review',
                taskId: taskReview.task.id,
                taskTitle: taskReview.task.title,
                reviewerRole: 'code_reviewer',
                projectSession,
                status: 'DISPATCHED',
                assignedAt: now,
                packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
                recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
                reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, taskReview.reviewArtifactPath),
                reviewPackagePath: reviewPackage.path,
                workerProfile: taskReviewWorkerProfile,
                gitHead: reviewPackage.gitHead,
                targetFiles,
                targetSnapshots,
                targetSnapshotHash,
                reviewContextHash,
                regressionTaskIds: regressionTasks.map(task => task.id),
                runtimeAdapter: controllerReviewAdapter,
                // A controller review with an executable independent adapter must
                // be bound to a Loop action before its decision becomes valid.
                // Manual review remains available when no adapter can be resolved.
                requiresExecutorProvenance: Boolean(controllerReviewAdapter?.selected),
                requiresNativeExecutorProvenance: false,
                controllerSessionReportedAt: null,
            };
            if (record.workerProfile.modelSelectionSource === 'harness-default') {
                warnings.push(`Review model profile ${record.workerProfile.modelProfile} has no configured model; the harness default will be used.`);
            }
            const taskDeltaSections = await this.buildTaskPostRepairReviewSections(taskReview);
            await this.fileService.writeJSON(recordPath, record);
            await this.setCurrentReviewDispatch(resolvedChangePath, this.taskReviewScopeKey(taskReview.task.id), reviewId);
            await this.prepareReviewArtifactForDispatch(resolvedChangePath, record);
            await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildReviewDispatchPacket(report, record, taskDeltaSections));
            await this.recordExecutionMetric(resolvedChangePath, report.feature, [
                {
                    kind: 'review_packet',
                    id: reviewId,
                    taskId: taskReview.task.id,
                    path: record.packetPath,
                    recordedAt: now,
                    durationMs: null,
                    capabilityTier: record.workerProfile.capabilityTier,
                    modelProfile: record.workerProfile.modelProfile,
                    model: record.workerProfile.model,
                    workflowStage: 'task_review',
                },
                {
                    kind: 'review_package',
                    id: reviewId,
                    taskId: taskReview.task.id,
                    path: reviewPackage.path,
                    recordedAt: now,
                    durationMs: null,
                    capabilityTier: record.workerProfile.capabilityTier,
                    modelProfile: record.workerProfile.modelProfile,
                    model: record.workerProfile.model,
                    workflowStage: 'task_review',
                },
            ]);
            const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
            return {
                changePath: resolvedChangePath,
                graphPath: report.graphPath,
                workerStatusPath: workerStatusSync.workerStatusPath,
                dispatch: record,
                projectSession,
                warnings,
                nextInstruction: `Hand the combined code review packet to one reviewer (spec compliance + code quality in a single pass), then update ${record.reviewArtifactPath} with one decision and run ospec execute sync.`,
            };
        }
        // Change-level final review is a single combined code review (spec compliance + code quality).
        const finalReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        const finalDecision = await this.readReviewDecision(finalReviewPath);
        if (APPROVED_REVIEW_DECISIONS.has(finalDecision)) {
            throw new Error(`Final code review is already ${finalDecision}. Continue with verification and archive gates.`);
        }
        if (!(await this.fileService.exists(finalReviewPath))) {
            await this.writeLocalizedReportFile(resolvedChangePath, finalReviewPath, this.buildDefaultFinalReviewArtifact(report.feature));
        }
        const reviewId = `review-${this.toFileSafeTimestamp(now)}-final-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.json`);
        const packetPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${reviewId}.md`);
        const session = await this.readSession(this.getSessionPath(resolvedChangePath), report.feature);
        const earliestDispatch = [...session.dispatches]
            .sort((left, right) => left.assignedAt.localeCompare(right.assignedAt))[0] || null;
        const reviewPackage = await this.writeTaskReviewPackage({
            projectRoot,
            changePath: resolvedChangePath,
            task: {
                id: 'final',
                targetFiles: Array.from(new Set(this.flattenReportTasks(report).flatMap(task => task.targetFiles))),
            },
            dispatch: earliestDispatch,
            reviewId,
        });
        const targetFiles = this.normalizeTargetFiles(Array.from(new Set(this.flattenReportTasks(report).flatMap(task => task.targetFiles))));
        const targetSnapshots = await this.captureTargetSnapshots(projectRoot, targetFiles);
        const finalReviewWorkerProfile = resolveWorkerProfileForTarget(buildReviewerWorkerProfile('code_reviewer', executionPolicy.modelProfiles, 'final_review'), reviewTarget, executionPolicy.modelProfiles);
        const finalControllerReviewAdapter = loopControllerSession.controllerMode
            ? this.runtimeAdapterService.resolve({
                projectRoot,
                target: reviewTarget,
                capability: loopControllerSession.capability,
                nativeHarness: loopControllerSession.nativeHarnessMetadata,
                requiresIndependentWorker: true,
                modelSelection: {
                    requestedModel: finalReviewWorkerProfile.requestedModel ?? finalReviewWorkerProfile.model,
                    configuredModel: finalReviewWorkerProfile.configuredModel ?? finalReviewWorkerProfile.model,
                    configurationSource: finalReviewWorkerProfile.modelConfigurationSource || (finalReviewWorkerProfile.model ? 'target' : 'harness-default'),
                },
            })
            : null;
        const record = {
            id: reviewId,
            stage: 'review',
            taskId: null,
            taskTitle: null,
            reviewerRole: 'code_reviewer',
            projectSession,
            status: 'DISPATCHED',
            assignedAt: now,
            packetPath: this.toChangeRelativePath(resolvedChangePath, packetPath),
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, finalReviewPath),
            reviewPackagePath: reviewPackage.path,
            workerProfile: finalReviewWorkerProfile,
            gitHead: reviewPackage.gitHead,
            targetFiles,
            targetSnapshots,
            targetSnapshotHash: this.hashTargetSnapshots(targetSnapshots),
            runtimeAdapter: finalControllerReviewAdapter,
            requiresExecutorProvenance: Boolean(finalControllerReviewAdapter?.selected),
            requiresNativeExecutorProvenance: false,
            controllerSessionReportedAt: null,
        };
        if (record.workerProfile.modelSelectionSource === 'harness-default') {
            warnings.push(`Final review model profile ${record.workerProfile.modelProfile} has no configured model; the harness default will be used.`);
        }
        await this.fileService.writeJSON(recordPath, record);
        await this.setCurrentReviewDispatch(resolvedChangePath, this.taskReviewScopeKey(null), reviewId);
        await this.prepareReviewArtifactForDispatch(resolvedChangePath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, packetPath, this.buildReviewDispatchPacket(report, record, this.buildVerificationFailureFocusSections(options.verificationFailureFocus)));
        await this.recordExecutionMetric(resolvedChangePath, report.feature, [
            {
                kind: 'review_packet',
                id: reviewId,
                taskId: null,
                path: record.packetPath,
                recordedAt: now,
                durationMs: null,
                capabilityTier: record.workerProfile.capabilityTier,
                modelProfile: record.workerProfile.modelProfile,
                model: record.workerProfile.model,
                workflowStage: 'final_review',
            },
            {
                kind: 'review_package',
                id: reviewId,
                taskId: null,
                path: reviewPackage.path,
                recordedAt: now,
                durationMs: null,
                capabilityTier: record.workerProfile.capabilityTier,
                modelProfile: record.workerProfile.modelProfile,
                model: record.workerProfile.model,
                workflowStage: 'final_review',
            },
        ]);
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            graphPath: report.graphPath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            dispatch: record,
            projectSession,
            warnings,
            nextInstruction: `Hand the combined final code review packet to one reviewer (spec compliance + code quality in a single pass), then update ${record.reviewArtifactPath} with one decision and run ospec execute sync.`,
        };
    }
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
    async releaseLoopActionBindings(changePath, actionId) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const reviewDispatchIds = [];
            const dispatchesDir = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR);
            if (await this.fileService.exists(dispatchesDir)) {
                const entries = (await fs_1.promises.readdir(dispatchesDir, { withFileTypes: true }))
                    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
                    .sort((left, right) => left.name.localeCompare(right.name));
                for (const entry of entries) {
                    const recordPath = path.join(dispatchesDir, entry.name);
                    const result = await this.fileService.readJsonSafe(recordPath);
                    // A damaged dispatch record is not this method's problem to
                    // diagnose, and it cannot be bound to the orphaned action
                    // in any way this can verify. Every reader of that record
                    // still reports it; releasing bindings must not become the
                    // place that decides what a corrupt dispatch means.
                    if (result.status !== 'ok')
                        continue;
                    const record = result.value;
                    if (record.loopActionId !== actionId)
                        continue;
                    record.loopActionId = null;
                    record.loopActionItemId = null;
                    record.controllerSessionReportedAt = null;
                    record.reviewerExecutorId = null;
                    record.reviewerClaimedAt = null;
                    record.reviewerCompletedAt = null;
                    record.reviewerSucceeded = null;
                    await this.fileService.writeJSON(recordPath, record);
                    reviewDispatchIds.push(record.id);
                }
            }
            let planningRepairReleased = false;
            const planningRepairPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_REPAIR_FILE);
            if (await this.fileService.exists(planningRepairPath)) {
                const result = await this.fileService.readJsonSafe(planningRepairPath);
                if (result.status === 'ok'
                    && result.value.loopActionId === actionId
                    && result.value.status === 'dispatched') {
                    result.value.status = 'ready';
                    result.value.loopActionId = null;
                    result.value.loopActionItemId = null;
                    await this.fileService.writeJSON(planningRepairPath, result.value);
                    planningRepairReleased = true;
                }
            }
            return { reviewDispatchIds, planningRepairReleased };
        });
    }
    async bindReviewLoopAction(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(options.dispatchId)}.json`);
            if (!(await this.fileService.exists(recordPath))) {
                throw new Error(`Review dispatch record not found for Loop binding (${options.dispatchId}).`);
            }
            const record = await this.fileService.readJSON(recordPath);
            if (record.id !== options.dispatchId)
                throw new Error(`Review dispatch identity mismatch for ${options.dispatchId}.`);
            await this.assertCurrentReviewDispatch(resolvedChangePath, this.reviewDispatchScopeKey(record), record.id);
            const selected = options.runtimeAdapter.selected;
            if (!selected || !selected.available || !selected.verified || selected.kind === 'generic') {
                throw new Error(`Review dispatch ${options.dispatchId} requires a verified independent runtime adapter.`);
            }
            if (selected.kind === 'native') {
                const controllerSession = await this.readLoopControllerSession(resolvedChangePath);
                if (!controllerSession.current || controllerSession.reportedAt !== options.controllerSessionReportedAt) {
                    throw new Error(`Review dispatch ${options.dispatchId} does not match the current IDE controller session.`);
                }
            }
            if ((record.loopActionId && record.loopActionId !== options.actionId)
                || (record.loopActionItemId && record.loopActionItemId !== options.actionItemId)) {
                throw new Error(`Review dispatch ${options.dispatchId} is already bound to another Loop action.`);
            }
            record.runtimeAdapter = options.runtimeAdapter;
            record.requiresExecutorProvenance = true;
            record.requiresNativeExecutorProvenance = selected.kind === 'native';
            record.loopActionId = options.actionId;
            record.loopActionItemId = options.actionItemId;
            record.controllerSessionReportedAt = selected.kind === 'native' ? options.controllerSessionReportedAt : null;
            record.reviewerExecutorId = null;
            record.reviewerClaimedAt = null;
            record.reviewerCompletedAt = null;
            record.reviewerSucceeded = null;
            await this.fileService.writeJSON(recordPath, record);
            await this.updateReviewLoopProvenance(resolvedChangePath, record);
        });
    }
    async claimReviewLoopExecutor(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(options.dispatchId)}.json`);
            const record = await this.fileService.readJSON(recordPath);
            this.assertReviewLoopBinding(record, options);
            await this.assertCurrentReviewDispatch(resolvedChangePath, this.reviewDispatchScopeKey(record), record.id);
            if (record.requiresNativeExecutorProvenance) {
                const controllerSession = await this.readLoopControllerSession(resolvedChangePath);
                if (!controllerSession.current || controllerSession.reportedAt !== record.controllerSessionReportedAt) {
                    throw new Error(`Review dispatch ${options.dispatchId} executor claim does not match the current IDE controller session.`);
                }
            }
            if (record.reviewerExecutorId && record.reviewerExecutorId !== options.executorId) {
                throw new Error(`Review dispatch ${options.dispatchId} is claimed by another executor.`);
            }
            record.reviewerExecutorId = options.executorId;
            record.reviewerClaimedAt = record.reviewerClaimedAt || options.claimedAt;
            await this.fileService.writeJSON(recordPath, record);
            await this.updateReviewLoopProvenance(resolvedChangePath, record);
        });
    }
    async completeReviewLoopExecutor(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(options.dispatchId)}.json`);
            const record = await this.fileService.readJSON(recordPath);
            this.assertReviewLoopBinding(record, options);
            await this.assertCurrentReviewDispatch(resolvedChangePath, this.reviewDispatchScopeKey(record), record.id);
            if (record.requiresNativeExecutorProvenance) {
                const controllerSession = await this.readLoopControllerSession(resolvedChangePath);
                if (!controllerSession.current || controllerSession.reportedAt !== record.controllerSessionReportedAt) {
                    throw new Error(`Review dispatch ${options.dispatchId} completion does not match the current IDE controller session.`);
                }
            }
            if (!record.reviewerExecutorId || record.reviewerExecutorId !== options.executorId) {
                throw new Error(`Review dispatch ${options.dispatchId} completion does not match its claimed executor.`);
            }
            record.reviewerCompletedAt = options.completedAt;
            record.reviewerSucceeded = options.succeeded;
            await this.fileService.writeJSON(recordPath, record);
            await this.updateReviewLoopProvenance(resolvedChangePath, record);
            await this.syncWorkerStatusUnlocked(resolvedChangePath);
            if (options.succeeded)
                await this.cacheTaskReviewApproval(resolvedChangePath, record);
        });
    }
    async restoreTaskReviewApprovals(changePath) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const cacheRoot = path.join(resolvedChangePath, 'artifacts', 'reviews', 'cache', 'task');
            if (!(await this.fileService.exists(cacheRoot)))
                return 0;
            const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
            const rawGraph = await this.fileService.readJSON(graphPath);
            if (!Array.isArray(rawGraph?.tasks))
                return 0;
            const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
            const report = await this.getReport(resolvedChangePath);
            const reportTasks = this.flattenReportTasks(report);
            const graphContract = String(rawGraph.contract_version || rawGraph.version || '').trim();
            let restored = 0;
            for (let index = 0; index < rawGraph.tasks.length; index += 1) {
                const rawTask = rawGraph.tasks[index];
                const task = normalizeTask(rawTask, index);
                if (!TERMINAL_TASK_STATUSES.has(task.status)
                    || !task.review
                    || this.normalizeReviewRunDecision(rawTask?.review?.decision) !== 'PENDING')
                    continue;
                const currentReviewPath = path.join(resolvedChangePath, rawTask.review.review_artifact || this.getTaskCombinedReviewArtifactRelativePath(task.id));
                if (await this.fileService.exists(currentReviewPath)) {
                    const current = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(currentReviewPath));
                    if (this.normalizeReviewRunDecision(current.data?.decision) !== 'PENDING')
                        continue;
                }
                const targetFiles = this.normalizeTargetFiles([
                    ...task.targetFiles,
                    this.getTaskWorkerReportProjectRelativePath(resolvedChangePath, projectRoot, task.id),
                ]);
                const targetSnapshots = await this.captureTargetSnapshots(projectRoot, targetFiles);
                const targetSnapshotHash = this.hashTargetSnapshots(targetSnapshots);
                const regressionTasks = this.getUpstreamRegressionTasks(task, reportTasks);
                const contextHash = this.computeTaskReviewContextHash(task, targetSnapshotHash, regressionTasks.map(candidate => candidate.id), graphContract);
                const cache = this.getTaskReviewCachePaths(resolvedChangePath, task.id, contextHash);
                if (!(await this.fileService.exists(cache.reviewPath)) || !(await this.fileService.exists(cache.findingsPath)))
                    continue;
                const cachedReview = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(cache.reviewPath));
                const dispatchId = String(cachedReview.data?.review_dispatch_id || '').trim();
                const dispatchPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(dispatchId)}.json`);
                if (!dispatchId || !(await this.fileService.exists(dispatchPath)))
                    continue;
                const record = await this.fileService.readJSON(dispatchPath);
                if (record.id !== dispatchId
                    || record.taskId !== task.id
                    || record.reviewContextHash !== contextHash
                    || record.targetSnapshotHash !== targetSnapshotHash
                    || record.reviewerSucceeded !== true
                    || !record.reviewerExecutorId
                    || !record.reviewerClaimedAt
                    || !record.reviewerCompletedAt
                    || !APPROVED_REVIEW_DECISIONS.has(this.normalizeReviewRunDecision(cachedReview.data?.decision)))
                    continue;
                const findings = await this.fileService.readJSON(cache.findingsPath);
                if (!Array.isArray(findings?.findings))
                    continue;
                await this.fileService.copy(cache.reviewPath, currentReviewPath);
                await this.fileService.copy(cache.findingsPath, currentReviewPath.replace(/\.md$/i, '.findings.json'));
                await this.setCurrentReviewDispatch(resolvedChangePath, this.taskReviewScopeKey(task.id), dispatchId);
                restored += 1;
            }
            if (restored > 0)
                await this.reconcileGoalProgressUnlocked(resolvedChangePath);
            return restored;
        });
    }
    async hasReviewLoopEvidence(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${this.toFileSafeId(options.dispatchId)}.json`);
        if (!(await this.fileService.exists(recordPath)))
            return false;
        try {
            const record = await this.fileService.readJSON(recordPath);
            if (record.id !== options.dispatchId
                || record.loopActionId !== options.actionId
                || record.loopActionItemId !== options.actionItemId
                || record.reviewerExecutorId !== options.executorId
                || !record.reviewerClaimedAt)
                return false;
            await this.assertCurrentReviewDispatch(resolvedChangePath, this.reviewDispatchScopeKey(record), record.id);
            const reviewPath = path.join(resolvedChangePath, record.reviewArtifactPath);
            const findingsPath = reviewPath.replace(/\.md$/i, '.findings.json');
            if (!(await this.fileService.exists(reviewPath)) || !(await this.fileService.exists(findingsPath)))
                return false;
            const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
            const decision = this.normalizeReviewRunDecision(review.data?.decision);
            const reviewedAt = Date.parse(String(review.data?.reviewed_at || ''));
            const claimedAt = Date.parse(record.reviewerClaimedAt);
            if (decision === 'PENDING'
                || !Number.isFinite(reviewedAt)
                || !Number.isFinite(claimedAt)
                || reviewedAt < claimedAt
                || String(review.data?.review_dispatch_id || '') !== record.id
                || String(review.data?.loop_action_id || '') !== options.actionId
                || String(review.data?.loop_action_item_id || '') !== options.actionItemId
                || String(review.data?.reviewer_executor_id || '') !== options.executorId)
                return false;
            await this.readReviewFindings(reviewPath, review.content);
            return true;
        }
        catch {
            return false;
        }
    }
    assertReviewLoopBinding(record, options) {
        if (record.id !== options.dispatchId
            || record.loopActionId !== options.actionId
            || record.loopActionItemId !== options.actionItemId) {
            throw new Error(`Review dispatch ${options.dispatchId} does not match the current Loop action.`);
        }
    }
    async updateReviewLoopProvenance(changePath, record) {
        await this.assertCurrentReviewDispatch(changePath, this.reviewDispatchScopeKey(record), record.id);
        const reviewArtifactPath = path.resolve(changePath, record.reviewArtifactPath);
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        if (String(review.data?.review_dispatch_id || '') !== record.id) {
            throw new Error(`Review dispatch ${record.id} is stale because its artifact no longer names the current dispatch.`);
        }
        review.data = {
            ...(review.data || {}),
            loop_action_id: record.loopActionId || null,
            loop_action_item_id: record.loopActionItemId || null,
            runtime_adapter_id: record.runtimeAdapter?.selectedAdapterId || null,
            controller_session_reported_at: record.controllerSessionReportedAt || null,
            reviewer_executor_id: record.reviewerExecutorId || null,
            reviewer_claimed_at: record.reviewerClaimedAt || null,
            reviewer_completed_at: record.reviewerCompletedAt || null,
            reviewer_succeeded: record.reviewerSucceeded,
        };
        await this.fileService.writeFile(reviewArtifactPath, (0, helpers_1.stringifyFrontmatter)(review.content, review.data));
    }
    async planReviewFeedback(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        // Final review feedback operates on the single combined final-review.md.
        const stage = 'review';
        const reviewArtifactPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
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
        const findingResult = await this.readReviewFindings(reviewArtifactPath, reviewDocument.content);
        const findings = findingResult.text;
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
            reviewerRole: 'code_reviewer',
            decision,
            action,
            createdAt: now,
            reviewArtifactPath: reviewArtifactRelativePath,
            artifactPath: this.toChangeRelativePath(resolvedChangePath, artifactPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            summary: options.summary?.trim() || null,
            findings,
            structuredFindings: findingResult.structured,
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
    async createRepairWave(changePath, options = {}) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const finalReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
            return this.withArtifactMutationRollback({
                files: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH),
                    this.getSessionPath(resolvedChangePath),
                    path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE),
                    path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
                    this.getLaunchPlanPath(resolvedChangePath),
                    this.getLaunchPlanReportPath(resolvedChangePath),
                    finalReviewPath,
                    finalReviewPath.replace(/\.md$/i, '.findings.json'),
                ],
                directories: [
                    path.join(resolvedChangePath, 'artifacts', 'agents', DISPATCHES_DIR),
                    path.join(resolvedChangePath, 'artifacts', 'agents', REPAIR_WAVES_DIR),
                ],
            }, () => this.createRepairWaveUnlocked(resolvedChangePath, options));
        });
    }
    async createRepairWaveUnlocked(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        if (report.decisions.pendingRequired > 0 || report.decisions.blockers.length > 0) {
            throw new Error('Cannot create a repair wave while required user decisions are pending or damaged.');
        }
        const reviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        if (!(await this.fileService.exists(reviewPath))) {
            throw new Error(`Final review artifact not found at ${reviewPath}`);
        }
        const reviewDocument = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        const decision = normalizeStatus(reviewDocument.data?.decision) || 'PENDING';
        if (decision !== 'NEEDS_CHANGES') {
            throw new Error(`Grouped repair requires final review decision NEEDS_CHANGES (current: ${decision}).`);
        }
        const findingResult = await this.readReviewFindings(reviewPath, reviewDocument.content);
        const findings = findingResult.text;
        if (findings.length === 0) {
            throw new Error('Grouped repair requires at least one concrete final-review finding.');
        }
        if (options.repairStrategy && (options.repairStrategy.kind !== 'stalled_findings'
            || !options.repairStrategy.key.trim()
            || options.repairStrategy.findingIds.length === 0)) {
            throw new Error('Grouped repair strategy context is malformed.');
        }
        const rawGraph = await this.fileService.readJSON(report.graphPath);
        const rawTasks = Array.isArray(rawGraph.tasks) ? rawGraph.tasks : [];
        const activeRepair = rawTasks.find((task) => String(task?.id || '').startsWith('repair-final-')
            && !TERMINAL_TASK_STATUSES.has(normalizeStatus(task?.status) || 'PENDING'));
        if (activeRepair) {
            throw new Error(`Grouped repair task ${activeRepair.id} is already active.`);
        }
        if (report.completedTasks.length !== report.taskCount || report.taskCount === 0) {
            throw new Error('Grouped repair can only be created after the current task graph is completed.');
        }
        const priorTasks = this.flattenReportTasks(report);
        const targetFiles = Array.from(new Set(priorTasks.flatMap(task => task.targetFiles)));
        const verificationCommands = Array.from(new Set(priorTasks.flatMap(task => task.verificationCommands)));
        const documentationUpdates = Array.from(new Set(priorTasks.flatMap(task => task.documentationUpdates)));
        if (targetFiles.length === 0 || verificationCommands.length === 0) {
            throw new Error('Grouped repair requires existing target files and verification commands in the task graph.');
        }
        const findingRepairScope = [...new Set(findingResult.structured
                .flatMap(finding => finding.repairScope)
                .map(item => item.trim())
                .filter(Boolean))];
        const effectiveRepairScope = findingRepairScope.length > 0 ? findingRepairScope : targetFiles;
        const sourceReviewDispatchId = String(reviewDocument.data?.review_dispatch_id || '').trim();
        const sourceReviewTargetSnapshotHash = String(reviewDocument.data?.target_snapshot_hash || '').trim();
        let sourceRepairScopeSnapshotHash = null;
        if (sourceReviewDispatchId) {
            const sourceReviewDispatch = await this.readRepairConvergenceReviewDispatch(resolvedChangePath, null, sourceReviewDispatchId);
            if (!sourceReviewDispatch || sourceReviewDispatch.targetSnapshotHash !== sourceReviewTargetSnapshotHash) {
                throw new Error('Grouped repair has invalid final-review target snapshot provenance.');
            }
            sourceRepairScopeSnapshotHash = this.repairScopeSnapshotHash(sourceReviewDispatch, effectiveRepairScope);
            if (!sourceRepairScopeSnapshotHash) {
                throw new Error('Grouped repair cannot bind its repair scope to the reviewed target snapshot.');
            }
        }
        const waveNumber = rawTasks.filter((task) => String(task?.id || '').startsWith('repair-final-')).length + 1;
        const taskId = `repair-final-${waveNumber}`;
        const now = new Date().toISOString();
        const waveId = `repair-wave-${this.toFileSafeTimestamp(now)}-${waveNumber}`;
        rawTasks.push({
            id: taskId,
            title: `Resolve grouped final-review findings (wave ${waveNumber})`,
            status: 'PENDING',
            depends_on: priorTasks.map(task => task.id),
            parallelizable: false,
            serial_reason: 'Grouped final-review findings must be repaired and verified as one coherent change boundary.',
            conflicts_with: [],
            target_files: targetFiles,
            verification_commands: verificationCommands,
            expected_result: 'All final-review findings are resolved together, covering verification passes once, and the change is ready for one final re-review.',
            context: `Resolve the complete grouped findings list from artifacts/reviews/${constants_1.FILE_NAMES.FINAL_REVIEW}:\n${findings.map(finding => `- ${finding}`).join('\n')}`,
            interfaces: ['Consumes the combined final-review findings as one repair boundary.', 'Produces one implementation result for one task review and one final re-review.'],
            documentation_updates: documentationUpdates,
            worker_role: 'repair_implementer',
            review: { decision: 'PENDING', review_artifact_path: null },
        });
        rawGraph.tasks = rawTasks;
        rawGraph.status = 'pending';
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        const recordPath = ['artifacts', 'agents', REPAIR_WAVES_DIR, `${waveId}.json`].join('/');
        const packetPath = ['artifacts', 'agents', REPAIR_WAVES_DIR, `${waveId}.md`].join('/');
        const record = {
            version: '1.0',
            id: waveId,
            feature: report.feature,
            createdAt: now,
            status: 'ready',
            sourceReviewPath: this.toChangeRelativePath(resolvedChangePath, reviewPath),
            sourceDecision: decision,
            findings,
            structuredFindings: findingResult.structured,
            taskId,
            targetFiles,
            verificationCommands,
            documentationUpdates,
            recordPath,
            packetPath,
            dispatchIds: [],
            ...(sourceReviewDispatchId && sourceRepairScopeSnapshotHash ? {
                sourceReviewDispatchId,
                sourceReviewTargetSnapshotHash,
                sourceRepairScopeSnapshotHash,
            } : {}),
            ...(options.repairStrategy ? { repairStrategy: options.repairStrategy } : {}),
        };
        await this.fileService.writeJSON(path.join(resolvedChangePath, recordPath), record);
        await this.writeLocalizedReportFile(resolvedChangePath, path.join(resolvedChangePath, packetPath), this.buildRepairWavePacket(record));
        await this.writeLocalizedReportFile(resolvedChangePath, reviewPath, this.buildDefaultFinalReviewArtifact(report.feature));
        await this.fileService.remove(reviewPath.replace(/\.md$/i, '.findings.json'));
        const dispatch = await this.dispatchUnlocked(resolvedChangePath, { taskId });
        record.status = 'dispatched';
        record.dispatchIds = dispatch.dispatches.map(item => item.id);
        await this.fileService.writeJSON(path.join(resolvedChangePath, recordPath), record);
        return {
            changePath: resolvedChangePath,
            record,
            dispatch,
            nextInstruction: `One grouped repair task (${taskId}) was created and dispatched. Use its launch plan, complete it once, run one combined task review, then run one final review.`,
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
        if ((selectedOptionId || options.skip) && options.answeredBy !== 'user') {
            throw new Error('Selecting or skipping a user decision requires --answered-by user provenance.');
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
            answeredBy: selectedOptionId || options.skip ? 'user' : existing?.answeredBy || null,
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
        return this.withTaskGraphMutationLease(changePath, () => this.runPlanningPreflightUnlocked(changePath, options));
    }
    async runPlanningPreflightUnlocked(changePath, options = {}) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const designDecision = await this.readReviewDecision(this.getDocumentReviewArtifactPath(resolvedChangePath, 'design'));
        const stage = options.stage || this.selectNextDocumentReviewStage(designDecision);
        if (stage === 'plan' && !APPROVED_REVIEW_DECISIONS.has(designDecision)) {
            throw new Error(`Cannot run implementation plan preflight before design preflight is approved (current: ${designDecision || 'PENDING'}).`);
        }
        const target = this.getDocumentReviewTarget(stage);
        const mechanicalPreflight = await this.runDocumentReviewMechanicalPreflight(resolvedChangePath, stage);
        if (mechanicalPreflight.errors.length > 0) {
            throw new Error(`Planning ${stage} preflight failed: ${mechanicalPreflight.errors.join('; ')}`);
        }
        const documentPath = path.join(resolvedChangePath, target.documentFile);
        const documentHash = this.hashMeaningfulDocumentation(await this.fileService.readFile(documentPath));
        const reviewContextHash = await this.computeDocumentReviewContextHash(resolvedChangePath, stage);
        const reviewArtifactPath = this.getDocumentReviewArtifactPath(resolvedChangePath, stage);
        if (await this.fileService.exists(reviewArtifactPath) && !options.force) {
            const existing = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
            const existingId = String(existing.data?.review_dispatch_id || '').trim();
            if (this.normalizeReviewRunDecision(existing.data?.decision) === 'APPROVED'
                && String(existing.data?.document_hash || '') === documentHash
                && String(existing.data?.review_context_hash || '') === reviewContextHash
                && String(existing.data?.planning_contract_version || '') === PLANNING_CONTRACT_VERSION
                && existingId) {
                const existingRecordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_PREFLIGHTS_DIR, `${existingId}.json`);
                if (await this.fileService.exists(existingRecordPath)) {
                    return {
                        changePath: resolvedChangePath,
                        dispatch: await this.fileService.readJSON(existingRecordPath),
                        projectSession: await this.readBootstrapProjectSessionSnapshot(projectRoot),
                        warnings: [],
                        reused: true,
                        nextInstruction: stage === 'design'
                            ? 'Design preflight remains current. Run the implementation plan preflight.'
                            : 'Implementation plan preflight remains current. Derive or refresh the task graph.',
                    };
                }
            }
        }
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            await this.writeLocalizedReportFile(resolvedChangePath, reviewArtifactPath, this.buildDocumentReviewArtifact(feature, target));
        }
        const now = new Date().toISOString();
        const id = `preflight-${this.toFileSafeTimestamp(now)}-${stage}-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_PREFLIGHTS_DIR, `${id}.json`);
        const projectSession = await this.readBootstrapProjectSessionSnapshot(projectRoot);
        const record = {
            id,
            stage,
            projectSession,
            status: 'COMPLETED_INLINE',
            assignedAt: now,
            packetPath: this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath),
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            documentPath: this.toChangeRelativePath(resolvedChangePath, documentPath),
            documentHash,
            reviewContextHash,
            reviewContractVersion: PLANNING_CONTRACT_VERSION,
            mechanicalPreflight,
            reviewArtifactPath: this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath),
            documentReadiness: 'ready',
            mode: 'inline_preflight',
            reviewerCompletedAt: now,
            reviewerSucceeded: true,
        };
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        review.data = {
            ...(review.data || {}),
            status: 'approved',
            decision: 'APPROVED',
            reviewer_role: 'deterministic_preflight',
            review_dispatch_id: id,
            document_hash: documentHash,
            review_context_hash: reviewContextHash,
            planning_contract_version: PLANNING_CONTRACT_VERSION,
            reviewed_at: now,
        };
        const body = [
            review.content.replace(/\n*## Inline Preflight[\s\S]*$/m, '').trimEnd(),
            '',
            '## Inline Preflight',
            '',
            '- Deterministic structure, readiness, required-decision, and ordering checks passed.',
            '- Semantic planning quality is decided later by the single independent combined planning review.',
            '',
        ].join('\n');
        await this.fileService.writeJSON(recordPath, record);
        await this.fileService.writeFile(reviewArtifactPath, (0, helpers_1.stringifyFrontmatter)(body, review.data));
        await this.fileService.remove(reviewArtifactPath.replace(/\.md$/i, '.findings.json'));
        await this.setCurrentReviewDispatch(resolvedChangePath, this.documentReviewScopeKey(stage), id);
        return {
            changePath: resolvedChangePath,
            dispatch: record,
            projectSession,
            warnings: mechanicalPreflight.warnings,
            reused: false,
            nextInstruction: stage === 'design'
                ? 'Design preflight passed. Run the implementation plan preflight.'
                : 'Implementation plan preflight passed. Derive or refresh the task graph, then let Loop issue one combined planning review.',
        };
    }
    getTaskReviewCachePaths(changePath, taskId, reviewContextHash) {
        const base = path.join(changePath, 'artifacts', 'reviews', 'cache', 'task', this.toFileSafeId(taskId), reviewContextHash);
        return { reviewPath: `${base}.md`, findingsPath: `${base}.findings.json` };
    }
    computeTaskReviewContextHash(task, targetSnapshotHash, regressionTaskIds, graphContract) {
        const context = {
            contract: graphContract,
            task: {
                id: task.id,
                title: task.title,
                targetFiles: this.normalizeTargetFiles(task.targetFiles),
                verificationCommands: [...task.verificationCommands],
                expectedResult: task.expectedResult,
                context: task.context,
                interfaces: [...task.interfaces],
                documentationUpdates: [...task.documentationUpdates],
            },
            targetSnapshotHash,
            regressionTaskIds: [...regressionTaskIds].sort(),
        };
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(context), 'utf8').digest('hex');
    }
    async readTaskGraphContractVersion(changePath) {
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graph = await this.fileService.readJSON(graphPath);
        return String(graph?.contract_version || graph?.version || '').trim();
    }
    async cacheTaskReviewApproval(changePath, record) {
        if (!record.taskId || !record.reviewContextHash)
            return;
        const validation = await this.validateTaskReviewEvidence(changePath, record.taskId);
        if (!validation.ready)
            return;
        const reviewArtifactPath = path.join(changePath, record.reviewArtifactPath);
        const findingsPath = reviewArtifactPath.replace(/\.md$/i, '.findings.json');
        if (!(await this.fileService.exists(reviewArtifactPath)) || !(await this.fileService.exists(findingsPath)))
            return;
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        if (!APPROVED_REVIEW_DECISIONS.has(this.normalizeReviewRunDecision(review.data?.decision)))
            return;
        const cache = this.getTaskReviewCachePaths(changePath, record.taskId, record.reviewContextHash);
        if (!(await this.fileService.exists(cache.reviewPath)))
            await this.fileService.copy(reviewArtifactPath, cache.reviewPath);
        if (!(await this.fileService.exists(cache.findingsPath)))
            await this.fileService.copy(findingsPath, cache.findingsPath);
    }
    canonicalJson(value) {
        if (value === null || typeof value !== 'object')
            return JSON.stringify(value);
        if (Array.isArray(value))
            return `[${value.map(item => this.canonicalJson(item)).join(',')}]`;
        return `{${Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${this.canonicalJson(item)}`)
            .join(',')}}`;
    }
    async computeDocumentReviewContextHash(changePath, stage) {
        const authorityFiles = stage === 'design'
            ? [constants_1.FILE_NAMES.PROPOSAL, constants_1.FILE_NAMES.DESIGN]
            : [
                constants_1.FILE_NAMES.PROPOSAL,
                constants_1.FILE_NAMES.DESIGN,
                constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
                path.join('artifacts', 'reviews', DESIGN_DOCUMENT_REVIEW_FILE),
            ];
        const authority = [];
        for (const fileName of authorityFiles) {
            const filePath = path.join(changePath, fileName);
            authority.push({
                path: fileName.replace(/\\/g, '/'),
                hash: await this.fileService.exists(filePath)
                    ? this.hashMeaningfulDocumentation(await this.fileService.readFile(filePath))
                    : null,
            });
        }
        return (0, crypto_1.createHash)('sha256').update(this.canonicalJson({
            contractVersion: PLANNING_CONTRACT_VERSION,
            stage,
            authority,
        }), 'utf8').digest('hex');
    }
    async runDocumentReviewMechanicalPreflight(changePath, stage) {
        const checks = [];
        const warnings = [];
        const errors = [];
        const required = stage === 'design'
            ? [constants_1.FILE_NAMES.PROPOSAL, constants_1.FILE_NAMES.DESIGN]
            : [constants_1.FILE_NAMES.PROPOSAL, constants_1.FILE_NAMES.DESIGN, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN];
        for (const fileName of required) {
            const filePath = path.join(changePath, fileName);
            if (!(await this.fileService.exists(filePath))) {
                errors.push(`missing authoritative input ${fileName}`);
                continue;
            }
            try {
                const content = await this.fileService.readFile(filePath);
                (0, helpers_1.parseFrontmatterDocument)(content);
                if (!content.trim()) {
                    errors.push(`empty authoritative input ${fileName}`);
                    continue;
                }
                const readiness = await this.readBootstrapDocumentStatus(changePath, fileName, {
                    allowUncheckedChecklist: fileName === constants_1.FILE_NAMES.PROPOSAL,
                });
                if (readiness.readiness !== 'ready') {
                    errors.push(`${fileName} is not ready (${readiness.readiness}); resolve TODO/TBD markers and required checklist items`);
                    continue;
                }
                checks.push(`parsed ready ${fileName}`);
            }
            catch {
                errors.push(`invalid frontmatter in ${fileName}`);
            }
        }
        const feature = await this.readFeatureName(changePath);
        const decisions = await this.readUserDecisionSnapshot(changePath, feature);
        if (decisions.pendingRequired > 0 || decisions.blockers.length > 0) {
            errors.push(`required user decisions are unresolved: ${[
                ...decisions.decisions.filter(item => item.required && item.status === 'PENDING').map(item => item.id),
                ...decisions.blockers,
            ].join(', ')}`);
        }
        if (stage === 'plan') {
            const designEvidence = await this.validateDocumentReviewEvidence(changePath, 'design');
            if (!designEvidence.ready) {
                errors.push(`design approval is not valid for its current authoritative context: ${designEvidence.reason}`);
            }
            const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
            if (await this.fileService.exists(graphPath)) {
                warnings.push('an existing task graph must be refreshed from the approved implementation plan before dispatch');
            }
            checks.push('task graph derivation is sequenced after implementation plan preflight');
        }
        return {
            version: '1.0',
            stage,
            checkedAt: new Date().toISOString(),
            checks,
            warnings: Array.from(new Set(warnings)),
            errors: Array.from(new Set(errors)),
        };
    }
    taskReviewScopeKey(taskId) {
        return taskId ? `task:${taskId}` : 'final';
    }
    planningReviewScopeKey() {
        return 'planning';
    }
    reviewDispatchScopeKey(record) {
        return record.stage === 'planning'
            ? this.planningReviewScopeKey()
            : this.taskReviewScopeKey(record.taskId || null);
    }
    documentReviewScopeKey(stage) {
        return `document:${stage}`;
    }
    getCurrentReviewDispatchIndexPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', CURRENT_REVIEW_DISPATCHES_FILE);
    }
    async setCurrentReviewDispatch(changePath, scope, dispatchId) {
        const indexPath = this.getCurrentReviewDispatchIndexPath(changePath);
        let index = {
            version: '1.0',
            updatedAt: new Date().toISOString(),
            dispatches: {},
        };
        if (await this.fileService.exists(indexPath)) {
            const existing = await this.fileService.readJSON(indexPath);
            index = {
                version: '1.0',
                updatedAt: new Date().toISOString(),
                dispatches: existing.dispatches && typeof existing.dispatches === 'object'
                    ? { ...existing.dispatches }
                    : {},
            };
        }
        index.dispatches[scope] = dispatchId;
        await this.fileService.writeJSON(indexPath, index);
    }
    async assertCurrentReviewDispatch(changePath, scope, dispatchId) {
        const indexPath = this.getCurrentReviewDispatchIndexPath(changePath);
        const indexText = await this.readValidationInputText(indexPath);
        if (indexText === null) {
            throw new Error(`Review dispatch ${dispatchId} has no current-dispatch index provenance.`);
        }
        const index = this.parseValidationInputJSON(indexText, indexPath);
        const currentDispatchId = index.dispatches?.[scope];
        if (currentDispatchId !== dispatchId) {
            throw new Error(`Review dispatch ${dispatchId} is stale; current dispatch for ${scope} is ${currentDispatchId || '(missing)'}.`);
        }
    }
    async readLoopControllerSession(changePath) {
        const configPath = path.join(changePath, 'artifacts', 'loop', 'loop.json');
        if (!(await this.fileService.exists(configPath))) {
            return { controllerMode: false, executionModel: null, current: false, reportedAt: null, target: 'generic', capability: null, nativeHarnessMetadata: null };
        }
        try {
            const config = await this.fileService.readJSON(configPath);
            const controllerMode = config?.executionModel === 'controller'
                || config?.executionModel === 'cli-driven';
            const executionModel = controllerMode ? 'controller' : null;
            const reportedAt = String(config?.capability?.reportedAt || '').trim() || null;
            const reportedAtMs = Date.parse(reportedAt || '');
            const expiresAt = Date.parse(String(config?.capability?.expiresAt || ''));
            const target = String(config?.target || 'generic').trim().toLowerCase() || 'generic';
            const nativeHarnessMetadata = config?.nativeHarnessMetadata
                && config.nativeHarnessMetadata.target === target
                && config.nativeHarnessMetadata.controllerSessionReportedAt === reportedAt
                ? config.nativeHarnessMetadata
                : null;
            const current = controllerMode
                && config?.capability?.controllerAvailable === true
                && config?.capability?.interactive === true
                && config?.capability?.nativeSubagentCapability === 'supported'
                && String(config?.capability?.target || '') === target
                && Boolean(reportedAt)
                && Number.isFinite(reportedAtMs)
                && reportedAtMs <= Date.now()
                && Number.isFinite(expiresAt)
                && expiresAt > Date.now();
            return {
                controllerMode,
                executionModel,
                current,
                reportedAt,
                target,
                capability: config?.capability || null,
                nativeHarnessMetadata,
            };
        }
        catch {
            return { controllerMode: false, executionModel: null, current: false, reportedAt: null, target: 'generic', capability: null, nativeHarnessMetadata: null };
        }
    }
    async bindVerificationLoopAction(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const report = await this.getReport(resolvedChangePath);
            const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
            const targetFiles = this.normalizeTargetFiles(Array.from(new Set(this.flattenReportTasks(report).flatMap(task => task.targetFiles))));
            const targetSnapshots = await this.captureTargetSnapshots(projectRoot, targetFiles);
            const binding = {
                expectedCommand: options.expectedCommand?.trim() || null,
                gitHead: await this.readGitOutput(projectRoot, ['rev-parse', 'HEAD']) || null,
                targetSnapshotHash: this.hashTargetSnapshots(targetSnapshots),
            };
            const record = {
                version: '1.0',
                actionId: options.actionId,
                actionItemId: options.actionItemId,
                issuedAt: options.issuedAt,
                status: 'active',
                binding,
                executorId: null,
                claimedAt: null,
                completedAt: null,
            };
            await this.fileService.writeJSON(this.getVerificationLoopActionPath(resolvedChangePath, options.actionId, options.actionItemId), record);
            return binding;
        });
    }
    async claimVerificationLoopExecutor(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const recordPath = this.getVerificationLoopActionPath(path.resolve(changePath), options.actionId, options.actionItemId);
            const record = await this.fileService.readJSON(recordPath);
            if (record.actionId !== options.actionId || record.actionItemId !== options.actionItemId || record.status !== 'active') {
                throw new Error('Verification action is no longer active for executor claim.');
            }
            if (record.executorId && record.executorId !== options.executorId) {
                throw new Error(`Verification action ${options.actionItemId} is claimed by another executor.`);
            }
            record.executorId = options.executorId;
            record.claimedAt = record.claimedAt || options.claimedAt;
            await this.fileService.writeJSON(recordPath, record);
        });
    }
    async cancelVerificationLoopAction(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const recordPath = this.getVerificationLoopActionPath(path.resolve(changePath), options.actionId, options.actionItemId);
            if (!(await this.fileService.exists(recordPath)))
                return;
            const record = await this.fileService.readJSON(recordPath);
            if (record.status === 'completed')
                return;
            record.status = 'cancelled';
            await this.fileService.writeJSON(recordPath, record);
        });
    }
    async recordVerification(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, () => this.recordVerificationUnlocked(changePath, options));
    }
    async validateVerificationLoopProvenance(changePath, options, current) {
        const supplied = [options.loopActionId, options.loopActionItemId, options.executorId]
            .map(value => String(value || '').trim());
        if (supplied.every(value => value.length === 0)) {
            const statePath = path.join(changePath, 'artifacts', 'loop', 'state.json');
            if (await this.fileService.exists(statePath)) {
                const state = await this.fileService.readJSON(statePath);
                if (state?.pendingControllerAction?.status === 'awaiting-evidence'
                    && state.pendingControllerAction.kind === 'verification') {
                    throw new Error('Active Loop verification requires action, item, and executor provenance.');
                }
            }
            return {
                current,
                loopActionId: null,
                loopActionItemId: null,
                executorId: null,
                issuanceTargetSnapshotHash: null,
                actionRecordPath: null,
            };
        }
        if (supplied.some(value => value.length === 0)) {
            throw new Error('Loop verification evidence requires --loop-action, --action-item, and --executor together.');
        }
        const [loopActionId, loopActionItemId, executorId] = supplied;
        const actionRecordPath = this.getVerificationLoopActionPath(changePath, loopActionId, loopActionItemId);
        if (!(await this.fileService.exists(actionRecordPath))) {
            throw new Error('Loop verification action binding is missing.');
        }
        const actionRecord = await this.fileService.readJSON(actionRecordPath);
        if (actionRecord.actionId !== loopActionId
            || actionRecord.actionItemId !== loopActionItemId
            || actionRecord.status !== 'active'
            || actionRecord.executorId !== executorId
            || !actionRecord.claimedAt) {
            throw new Error('Loop verification action is not active for the claimed executor.');
        }
        const statePath = path.join(changePath, 'artifacts', 'loop', 'state.json');
        if (!(await this.fileService.exists(statePath))) {
            throw new Error('Loop verification evidence cannot be bound because Loop state is missing.');
        }
        const state = await this.fileService.readJSON(statePath);
        const pending = state?.pendingControllerAction;
        const item = Array.isArray(pending?.items)
            ? pending.items.find((candidate) => candidate?.id === loopActionItemId)
            : null;
        const itemState = Array.isArray(pending?.itemStates)
            ? pending.itemStates.find((candidate) => candidate?.actionItemId === loopActionItemId)
            : null;
        const binding = actionRecord.binding;
        if (pending?.actionId !== loopActionId
            || pending?.kind !== 'verification'
            || item?.kind !== 'verification'
            || !binding) {
            throw new Error('Loop verification evidence does not match the current verification action.');
        }
        if (itemState?.status !== 'running' || itemState?.executorId !== executorId) {
            throw new Error(`Loop verification evidence executor ${executorId} has not claimed the current action item.`);
        }
        if (binding.expectedCommand && binding.expectedCommand !== current.command) {
            throw new Error('Loop verification evidence command does not match the command issued for this action.');
        }
        if (binding.targetSnapshotHash !== current.targetSnapshotHash
            || (binding.gitHead && binding.gitHead !== current.gitHead)) {
            throw new Error('Loop verification target files changed after this verification action was issued.');
        }
        return {
            current,
            loopActionId,
            loopActionItemId,
            executorId,
            issuanceTargetSnapshotHash: binding.targetSnapshotHash,
            actionRecordPath,
        };
    }
    async recordVerificationUnlocked(changePath, options) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const command = options.command?.trim();
        if (!command) {
            throw new Error('Verification evidence requires a non-empty command.');
        }
        const status = this.normalizeVerificationEvidenceStatus(options.status);
        const outcome = this.normalizeOutcomeFields(options, 'Verification evidence');
        const exitCode = outcome.exitCode;
        if (status === 'PASSED' && exitCode !== 0) {
            throw new Error('PASSED verification evidence requires an explicit exit code of 0.');
        }
        // F5: the four outcome fields are orthogonal, so a PASSED record cannot
        // also claim it timed out, was signalled, or never ran. Accepting that
        // combination is how a green record ends up describing a red run.
        if (status === 'PASSED' && (outcome.timedOut || outcome.infraFailure || outcome.signal)) {
            throw new Error('PASSED verification evidence cannot also be reported as timed out, signalled, or an infrastructure failure.');
        }
        const now = new Date().toISOString();
        const evidencePath = this.getVerificationEvidencePath(resolvedChangePath);
        const evidence = await this.readVerificationEvidence(evidencePath, report.feature, { changePath: resolvedChangePath, report });
        const requirements = await this.readVerificationRequirements(resolvedChangePath, report.feature);
        const satisfies = this.normalizeVerificationRequirementIds(options.satisfies || []);
        const knownRequirementIds = new Set(requirements.requirements.map(item => item.id));
        const unknownRequirements = satisfies.filter(id => !knownRequirementIds.has(id));
        if (unknownRequirements.length > 0) {
            throw new Error(`Verification evidence references unknown requirement(s): ${unknownRequirements.join(', ')}.`);
        }
        const evidenceId = `verification-${this.toFileSafeTimestamp(now)}-${this.toFileSafeId(status.toLowerCase())}`;
        const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_DIR, `${evidenceId}.json`);
        const reportPath = path.join(resolvedChangePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_DIR, `${evidenceId}.md`);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const targetFiles = this.normalizeTargetFiles(Array.from(new Set(this.flattenReportTasks(report).flatMap(task => task.targetFiles))));
        const targetSnapshots = await this.captureTargetSnapshots(projectRoot, targetFiles);
        const loopProvenance = await this.validateVerificationLoopProvenance(resolvedChangePath, options, {
            command,
            gitHead: await this.readGitOutput(projectRoot, ['rev-parse', 'HEAD']) || null,
            targetFiles,
            targetSnapshots,
            targetSnapshotHash: this.hashTargetSnapshots(targetSnapshots),
        });
        const record = {
            id: evidenceId,
            command,
            status,
            exitCode,
            timedOut: outcome.timedOut,
            signal: outcome.signal,
            infraFailure: outcome.infraFailure,
            recordedAt: now,
            recordPath: this.toChangeRelativePath(resolvedChangePath, recordPath),
            reportPath: this.toChangeRelativePath(resolvedChangePath, reportPath),
            summary: options.summary?.trim() || null,
            gitHead: loopProvenance.current.gitHead,
            targetFiles,
            targetSnapshots,
            targetSnapshotHash: loopProvenance.current.targetSnapshotHash,
            loopActionId: loopProvenance.loopActionId,
            loopActionItemId: loopProvenance.loopActionItemId,
            executorId: loopProvenance.executorId,
            issuanceTargetSnapshotHash: loopProvenance.issuanceTargetSnapshotHash,
            satisfies,
        };
        evidence.records.push(record);
        evidence.status = this.deriveVerificationEvidenceStatus(evidence.records);
        evidence.updatedAt = now;
        await this.fileService.writeJSON(recordPath, record);
        await this.writeLocalizedReportFile(resolvedChangePath, reportPath, this.buildVerificationEvidenceReport(report, record));
        await this.fileService.writeJSON(evidencePath, evidence);
        if (loopProvenance.actionRecordPath) {
            const actionRecord = await this.fileService.readJSON(loopProvenance.actionRecordPath);
            actionRecord.status = 'completed';
            actionRecord.completedAt = now;
            await this.fileService.writeJSON(loopProvenance.actionRecordPath, actionRecord);
        }
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
        const requirementStatus = await this.validateVerificationRequirements(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            evidencePath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            record,
            nextInstruction: status === 'PASSED' && !requirementStatus.ready
                ? `${requirementStatus.reason} Run the remaining required checks and record PASSED evidence with matching --satisfies values.`
                : status === 'PASSED'
                    ? 'Verification evidence is recorded. Update verification.md checklist and continue with archive gates.'
                    : 'Verification evidence is recorded with a non-passing status. Resolve the issue, rerun verification, and record a passing result before archive.',
        };
    }
    async requireVerification(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, async () => {
            const resolvedChangePath = path.resolve(changePath);
            const feature = await this.readFeatureName(resolvedChangePath);
            const id = this.toFileSafeId(options.id);
            const description = String(options.description || '').trim();
            if (!id)
                throw new Error('Verification requirement requires a non-empty --id.');
            if (!description)
                throw new Error('Verification requirement requires a non-empty --description.');
            const kind = this.normalizeVerificationRequirementKind(options.kind);
            const artifact = await this.readVerificationRequirements(resolvedChangePath, feature);
            const now = new Date().toISOString();
            const existing = artifact.requirements.find(item => item.id === id);
            const requirement = {
                id,
                kind,
                description,
                required: options.required !== false,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
            };
            artifact.requirements = [
                ...artifact.requirements.filter(item => item.id !== id),
                requirement,
            ].sort((left, right) => left.id.localeCompare(right.id));
            artifact.updatedAt = now;
            const artifactPath = this.getVerificationRequirementsPath(resolvedChangePath);
            await this.fileService.writeJSON(artifactPath, artifact);
            const status = await this.validateVerificationRequirements(resolvedChangePath);
            return {
                changePath: resolvedChangePath,
                artifactPath,
                requirement,
                status,
                nextInstruction: status.ready
                    ? 'All required verification requirements have fresh passing evidence.'
                    : `Run the required verification and record PASSED evidence with --satisfies ${id}.`,
            };
        });
    }
    async validateVerificationRequirements(changePath) {
        return this.withValidationScope(() => this.validateVerificationRequirementsUnscoped(changePath));
    }
    async validateVerificationRequirementsUnscoped(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const artifactPath = this.getVerificationRequirementsPath(resolvedChangePath);
        const artifact = await this.readVerificationRequirements(resolvedChangePath, feature);
        const required = artifact.requirements.filter(item => item.required);
        if (required.length === 0) {
            return { ready: true, artifactPath, required: 0, satisfied: [], pending: [], reason: null };
        }
        // Every record here is judged against the same tree at the same commit,
        // so the snapshot is captured once and reused instead of being rebuilt
        // (plus a git spawn) for each of them.
        const lookup = {
            changePath: resolvedChangePath,
            context: this.memoiseVerificationFreshnessContext(resolvedChangePath),
        };
        const evidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), feature, lookup);
        const satisfied = new Set();
        for (const record of evidence.records) {
            if (record.status !== 'PASSED'
                || !(await this.isPassingVerificationRecordFresh(resolvedChangePath, record, lookup)))
                continue;
            for (const id of this.normalizeVerificationRequirementIds(record.satisfies || []))
                satisfied.add(id);
        }
        const requiredIds = required.map(item => item.id);
        const pending = requiredIds.filter(id => !satisfied.has(id));
        return {
            ready: pending.length === 0,
            artifactPath,
            required: required.length,
            satisfied: requiredIds.filter(id => satisfied.has(id)),
            pending,
            reason: pending.length > 0
                ? `Required verification evidence is missing or stale for: ${pending.join(', ')}.`
                : null,
        };
    }
    async recordTddEvidence(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, () => this.recordTddEvidenceUnlocked(changePath, options));
    }
    async recordTddEvidenceUnlocked(changePath, options) {
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
            ...this.normalizeOutcomeFields(options, 'TDD evidence'),
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
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
        return {
            changePath: resolvedChangePath,
            evidencePath,
            workerStatusPath: workerStatusSync.workerStatusPath,
            record,
            nextInstruction: this.getTddEvidenceNextInstruction(record),
        };
    }
    async recordDebugEvidence(changePath, options) {
        return this.withTaskGraphMutationLease(changePath, () => this.recordDebugEvidenceUnlocked(changePath, options));
    }
    async recordDebugEvidenceUnlocked(changePath, options) {
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
        const workerStatusSync = await this.syncWorkerStatusUnlocked(resolvedChangePath);
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
        const gitRootResult = await this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
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
                    goalOwnedStatusEntries: [],
                    generatedStatusEntries: [],
                    updateManagedStatusEntries: [],
                    blockingStatusEntries: [],
                    worktrees: [],
                    currentWorktree: null,
                },
                ownership: {
                    mode: 'blocked',
                    goalOwnedPaths: [],
                    generatedPaths: [],
                    updateProvenancePath: null,
                    updateProvenanceHash: null,
                },
                blockers,
                warnings,
                nextInstruction: 'Inspect workspace state manually before dispatching parallel worker tasks.',
            };
        }
        else {
            const gitRoot = path.resolve(gitRootResult.stdout.trim());
            const branch = await this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            const head = await this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            // F30: a truncated status is a SHORTER list of dirty files, and this
            // gate reads a short-enough list as `ready`. It is the one decision
            // in this file that authorizes parallel dispatch, so it refuses on a
            // partial answer instead of certifying one.
            const statusRead = await this.readGitOutputWithTruncation(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
            const statusOutput = statusRead.text || '';
            if (statusRead.truncated) {
                blockers.push(this.gitTruncationReason('git status'));
            }
            const changeRelative = path.relative(gitRoot, resolvedChangePath).replace(/\\/g, '/').replace(/\/$/, '');
            const projectRelative = path.relative(gitRoot, projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
            const statusEntries = this.parseGitStatusEntries(statusOutput).filter(entry => {
                const files = entry.file.replace(/^"|"$/g, '').replace(/\\/g, '/').split(/\s+->\s+/);
                return files.some(file => !this.isGoalWorkspaceControlPath(file, changeRelative, projectRelative));
            });
            const goalOwnedPaths = await this.readGoalOwnedWorkspacePaths(resolvedChangePath, gitRoot, projectRoot);
            const generatedPaths = await this.readGoalGeneratedWorkspacePaths(resolvedChangePath, gitRoot, projectRoot);
            const updateProvenance = await this.readUpdateProvenanceSnapshot(projectRoot, gitRoot);
            if (updateProvenance.warning)
                warnings.push(updateProvenance.warning);
            const goalOwnedStatusEntries = statusEntries.filter(entry => this.workspaceEntryMatchesPaths(entry, goalOwnedPaths));
            const afterGoalOwnership = statusEntries.filter(entry => !this.workspaceEntryMatchesPaths(entry, goalOwnedPaths));
            const generatedStatusEntries = afterGoalOwnership.filter(entry => this.workspaceEntryMatchesPaths(entry, generatedPaths));
            const afterGeneratedOwnership = afterGoalOwnership.filter(entry => !this.workspaceEntryMatchesPaths(entry, generatedPaths));
            const updateManagedStatusEntries = [];
            const blockingStatusEntries = [];
            for (const entry of afterGeneratedOwnership) {
                if (await this.isUpdateManagedWorkspaceEntry(entry, updateProvenance, gitRoot)) {
                    updateManagedStatusEntries.push(entry);
                }
                else {
                    blockingStatusEntries.push(entry);
                }
            }
            const worktreeRead = await this.readGitOutputWithTruncation(projectRoot, ['worktree', 'list', '--porcelain']);
            if (worktreeRead.truncated) {
                // A short worktree list hides the same-branch collision below,
                // and hiding it is what lets two workers share a checkout.
                blockers.push(this.gitTruncationReason('git worktree list'));
            }
            const worktreesOutput = worktreeRead.text || '';
            const worktrees = this.parseGitWorktrees(worktreesOutput);
            const currentWorktree = this.findCurrentWorktree(gitRoot, worktrees);
            const dirty = statusEntries.length > 0;
            if (blockingStatusEntries.length > 0) {
                blockers.push(`Workspace has ${blockingStatusEntries.length} unowned uncommitted file change(s); defer multi-agent dispatch or use an isolated worktree.`);
            }
            if (goalOwnedStatusEntries.length > 0 || generatedStatusEntries.length > 0 || updateManagedStatusEntries.length > 0) {
                warnings.push(`Workspace resume accepted ${goalOwnedStatusEntries.length} Goal-owned, ${generatedStatusEntries.length} task-generated, and ${updateManagedStatusEntries.length} update-managed uncommitted change(s); any path outside persisted ownership remains blocked.`);
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
                    goalOwnedStatusEntries,
                    generatedStatusEntries,
                    updateManagedStatusEntries,
                    blockingStatusEntries,
                    worktrees,
                    currentWorktree,
                },
                ownership: {
                    mode: status !== 'ready'
                        ? 'blocked'
                        : dirty
                            ? 'goal_resume'
                            : 'clean',
                    goalOwnedPaths,
                    generatedPaths,
                    updateProvenancePath: updateProvenance.path,
                    updateProvenanceHash: updateProvenance.contentHash,
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
    async validateDocumentReviewEvidence(changePath, stage) {
        return this.validatePlanningPreflightEvidence(changePath, stage);
    }
    async validatePlanningPreflightEvidence(changePath, stage) {
        const resolvedChangePath = path.resolve(changePath);
        const target = this.getDocumentReviewTarget(stage);
        const documentPath = path.join(resolvedChangePath, target.documentFile);
        const reviewArtifactPath = this.getDocumentReviewArtifactPath(resolvedChangePath, stage);
        if (!(await this.fileService.exists(documentPath)) || !(await this.fileService.exists(reviewArtifactPath))) {
            return { ready: false, reason: `${target.label} preflight evidence is missing.` };
        }
        try {
            const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
            const decision = this.normalizeReviewRunDecision(review.data?.decision);
            if (decision !== 'APPROVED') {
                return { ready: false, reason: `${target.label} preflight decision is ${decision || 'PENDING'}.` };
            }
            const currentHash = this.hashMeaningfulDocumentation(await this.fileService.readFile(documentPath));
            const recordedHash = String(review.data?.document_hash || '').trim();
            if (!recordedHash || recordedHash !== currentHash) {
                return { ready: false, reason: `${target.label} changed after preflight; rerun deterministic planning preflight.` };
            }
            const dispatchId = String(review.data?.review_dispatch_id || '').trim();
            if (!dispatchId || this.toFileSafeId(dispatchId) !== dispatchId) {
                return { ready: false, reason: `${target.label} preflight has no valid provenance.` };
            }
            const recordPath = path.join(resolvedChangePath, 'artifacts', 'agents', PLANNING_PREFLIGHTS_DIR, `${dispatchId}.json`);
            if (!(await this.fileService.exists(recordPath))) {
                return { ready: false, reason: `${target.label} preflight record is missing.` };
            }
            const record = await this.fileService.readJSON(recordPath);
            const currentContextHash = await this.computeDocumentReviewContextHash(resolvedChangePath, stage);
            if (record.id !== dispatchId
                || record.stage !== stage
                || record.status !== 'COMPLETED_INLINE'
                || record.mode !== 'inline_preflight'
                || record.documentHash !== currentHash
                || record.reviewContextHash !== currentContextHash
                || record.reviewContractVersion !== PLANNING_CONTRACT_VERSION
                || String(review.data?.review_context_hash || '') !== currentContextHash
                || String(review.data?.planning_contract_version || '') !== PLANNING_CONTRACT_VERSION) {
                return { ready: false, reason: `${target.label} preflight provenance does not match the current planning context.` };
            }
            await this.assertCurrentReviewDispatch(resolvedChangePath, this.documentReviewScopeKey(stage), dispatchId);
            return { ready: true, reason: null };
        }
        catch (error) {
            return { ready: false, reason: `${target.label} preflight evidence could not be validated (${error?.message || error}).` };
        }
    }
    async validateTaskReviewEvidence(changePath, taskId) {
        return this.withValidationScope(() => this.validateReviewEvidence(changePath, taskId, false));
    }
    async validatePlanningReviewEvidence(changePath) {
        return this.withValidationScope(() => this.validateReviewEvidence(changePath, null, true));
    }
    /**
     * Resolves the two things both public entry points need and hands off to
     * the evidence path, which is always run in full. There is deliberately no
     * verdict cache in front of this: see the note at the top of this file.
     */
    async validateReviewEvidence(changePath, taskId, planning) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        return this.validateReviewEvidenceAgainstDisk(resolvedChangePath, taskId, planning, projectRoot);
    }
    async validateReviewEvidenceAgainstDisk(resolvedChangePath, taskId, planning, projectRoot) {
        const reviewArtifactPath = planning
            ? path.join(resolvedChangePath, 'artifacts', 'reviews', PLANNING_REVIEW_FILE)
            : taskId
                ? path.join(resolvedChangePath, this.getTaskCombinedReviewArtifactRelativePath(taskId))
                : path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        const label = planning ? 'Combined planning review' : taskId ? `Task ${taskId} code review` : 'Final code review';
        let reviewText;
        try {
            reviewText = await this.readValidationInputText(reviewArtifactPath);
        }
        catch (error) {
            return { ready: false, reason: `${label} evidence could not be validated (${error?.message || error}).` };
        }
        if (reviewText === null) {
            return { ready: false, reason: `${label} evidence is missing.` };
        }
        try {
            const review = (0, helpers_1.parseFrontmatterDocument)(reviewText);
            const decision = this.normalizeReviewRunDecision(review.data?.decision);
            if (decision === 'PENDING') {
                return { ready: false, reason: `${label} decision is PENDING.` };
            }
            const dispatchId = String(review.data?.review_dispatch_id || '').trim();
            if (!dispatchId || this.toFileSafeId(dispatchId) !== dispatchId) {
                return { ready: false, reason: `${label} has no valid dispatch provenance.` };
            }
            const dispatchPath = path.join(resolvedChangePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${dispatchId}.json`);
            const dispatchText = await this.readValidationInputText(dispatchPath);
            if (dispatchText === null) {
                return { ready: false, reason: `${label} dispatch record is missing.` };
            }
            const dispatch = this.parseValidationInputJSON(dispatchText, dispatchPath);
            const expectedArtifact = this.toChangeRelativePath(resolvedChangePath, reviewArtifactPath);
            if (dispatch.id !== dispatchId
                || (dispatch.taskId || null) !== taskId
                || dispatch.stage !== (planning ? 'planning' : 'review')
                || dispatch.reviewerRole !== (planning ? 'planning_reviewer' : 'code_reviewer')
                || dispatch.reviewArtifactPath.replace(/\\/g, '/') !== expectedArtifact.replace(/\\/g, '/')) {
                return { ready: false, reason: `${label} dispatch provenance does not match this artifact.` };
            }
            await this.assertCurrentReviewDispatch(resolvedChangePath, planning ? this.planningReviewScopeKey() : this.taskReviewScopeKey(taskId), dispatchId);
            const reviewedAtValue = review.data?.reviewed_at;
            const reviewedAt = String(reviewedAtValue || '').trim();
            const reviewedAtMs = reviewedAtValue instanceof Date
                ? reviewedAtValue.getTime()
                : Date.parse(reviewedAt);
            const assignedAtMs = Date.parse(dispatch.assignedAt);
            if (!reviewedAt
                || !Number.isFinite(reviewedAtMs)
                || !Number.isFinite(assignedAtMs)
                || reviewedAtMs < assignedAtMs) {
                return { ready: false, reason: `${label} has no valid reviewed_at at or after dispatch.` };
            }
            if (dispatch.requiresExecutorProvenance || dispatch.requiresNativeExecutorProvenance || dispatch.loopActionId) {
                const claimedAtMs = Date.parse(String(dispatch.reviewerClaimedAt || ''));
                const completedAtMs = Date.parse(String(dispatch.reviewerCompletedAt || ''));
                const loopProvenanceMatches = dispatch.loopActionId
                    && dispatch.loopActionItemId
                    && dispatch.reviewerExecutorId
                    && Number.isFinite(claimedAtMs)
                    && Number.isFinite(completedAtMs)
                    && dispatch.reviewerSucceeded === true
                    && String(review.data?.loop_action_id || '') === dispatch.loopActionId
                    && String(review.data?.loop_action_item_id || '') === dispatch.loopActionItemId
                    && (!dispatch.requiresNativeExecutorProvenance
                        || (dispatch.controllerSessionReportedAt
                            && String(review.data?.controller_session_reported_at || '') === dispatch.controllerSessionReportedAt))
                    && String(review.data?.runtime_adapter_id || '') === String(dispatch.runtimeAdapter?.selectedAdapterId || '')
                    && String(review.data?.reviewer_executor_id || '') === dispatch.reviewerExecutorId
                    && Date.parse(String(review.data?.reviewer_claimed_at || '')) === claimedAtMs
                    && Date.parse(String(review.data?.reviewer_completed_at || '')) === completedAtMs
                    && review.data?.reviewer_succeeded === true
                    && reviewedAtMs >= claimedAtMs
                    && completedAtMs >= reviewedAtMs;
                if (!loopProvenanceMatches) {
                    return { ready: false, reason: `${label} is not bound to the claimed Loop reviewer executor and controller session.` };
                }
            }
            const recordedSnapshotHash = String(review.data?.target_snapshot_hash || '').trim();
            if (!Array.isArray(dispatch.targetFiles)
                || !Array.isArray(dispatch.targetSnapshots)
                || !dispatch.targetSnapshotHash
                || recordedSnapshotHash !== dispatch.targetSnapshotHash
                || this.hashTargetSnapshots(dispatch.targetSnapshots) !== dispatch.targetSnapshotHash) {
                return { ready: false, reason: `${label} target-file snapshot provenance is invalid.` };
            }
            const currentSnapshots = planning && dispatch.snapshotContract === PLANNING_SNAPSHOT_CONTRACT
                ? await this.capturePlanningSemanticSnapshots(projectRoot, dispatch.targetFiles)
                : await this.captureTargetSnapshots(projectRoot, dispatch.targetFiles);
            const targetSnapshotChanged = !this.targetSnapshotsMatchDispatch(currentSnapshots, dispatch.targetSnapshots, dispatch.targetSnapshotHash);
            let downstreamCarryForward = false;
            if (targetSnapshotChanged) {
                const carryForward = taskId && !planning
                    ? await this.canCarryTaskReviewForwardAfterDownstreamWork(resolvedChangePath, taskId, dispatch, currentSnapshots, reviewedAtMs)
                    : {
                        allowed: false,
                        reason: planning
                            ? 'planning reviews require a fresh dispatch after planning content changes'
                            : 'final reviews cannot be carried forward',
                    };
                downstreamCarryForward = carryForward.allowed;
                if (!downstreamCarryForward) {
                    return { ready: false, reason: `${label} target files changed after review dispatch; dispatch a fresh review (${carryForward.reason}).` };
                }
            }
            /*
             * FIX-1: the final review resolves HEAD outside the per-scope memo,
             * because the refusal just below fires when HEAD has moved and the
             * memo cannot see another process's commit. A task or planning
             * review never reaches that refusal (`!taskId && !planning` guards
             * it), so those keep the memo -- which is what holds
             * `archive --check`'s 8-wide fan-out at one git spawn, not eight.
             *
             * FIX-4 corrects what FIX-1 wrote here. It claimed the final review
             * was "the ONE verdict that refuses on a moved HEAD". It was not:
             * `isPassingVerificationRecordFresh` refuses on a moved HEAD too and
             * was reading its `currentHead` straight out of the memo, so an
             * external commit inside an open scope served a stale PASS for
             * verification evidence. Both call sites now go through
             * `readValidationGitHead`'s mandatory `use` discriminator; see the
             * note on that method for the full enumeration.
             *
             * FIX-4 also noticed, and deliberately did not act on, the fact that
             * this was the memo's ONLY consumer and that it DISCARDED the
             * memoised value: the refusal below is guarded by
             * `!taskId && !planning`, which is exactly the condition under which
             * the fresh read was taken instead.
             *
             * Phase 6 re-derived that and acted on it. The read moved inside
             * the refusal, so a task or planning review no longer resolves a
             * HEAD it never compares. Measured on the same 8-task fan-out those
             * two pinned tests use: 1 spawn before, 0 after.
             *
             * What was NOT retired, and why the `use` discriminator stays:
             * `'memoisable'` now has no callers, but the memo machinery behind
             * it cannot be removed from this track. `withValidationScope` is
             * public and its ENTIRE body is the memo, so retiring the memo
             * means retiring the scope, and the scope is called from
             * `ArchiveCommand` (Phase 6 track A's file),
             * `tests/perf/controller-tick-bench.mjs` (track C's), plus
             * `ExecuteCommand`, `VerificationService` and `LoopService`.
             *
             * While the memo exists, `use` is load-bearing regardless of how
             * many callers pass which value: it is what stops the NEXT caller
             * from silently reading a HEAD that another process has already
             * moved. Dropping a mandatory discriminator because today's callers
             * happen to agree is how FIX-1 got this wrong the first time.
             */
            /*
             * Planning approvals are anchored to planning semantics, not the
             * commit graph: implementation-phase commits must not invalidate
             * them. The guard below is unchanged; what changed is that HEAD is
             * now resolved INSIDE it.
             *
             * It used to be resolved unconditionally, `memoisable` whenever the
             * refusal could not fire, so a task or planning review paid a git
             * spawn for a value it then discarded -- and paid it exactly in the
             * case the memo existed to make cheap. Resolving it where it is
             * read costs one fresh spawn for a final review, which that path
             * always paid anyway, and ZERO for every other review.
             *
             * Measured on the 8-task fan-out that
             * `resolves HEAD once for a serial/CONCURRENT batched sweep` pins:
             * 1 spawn before, 0 after.
             */
            if (!taskId && !planning && !downstreamCarryForward && dispatch.gitHead) {
                const currentHead = await this.readValidationGitHead(projectRoot, 'refusal-condition');
                if (currentHead !== dispatch.gitHead) {
                    return { ready: false, reason: `${label} Git HEAD changed after review dispatch; dispatch a fresh review.` };
                }
            }
            const findingsPath = reviewArtifactPath.replace(/\.md$/i, '.findings.json');
            const findingsText = await this.readValidationInputText(findingsPath);
            if (findingsText === null) {
                return { ready: false, reason: `${label} structured findings are missing.` };
            }
            this.parseReviewFindingsDocument(findingsPath, findingsText);
            return { ready: true, reason: null };
        }
        catch (error) {
            return { ready: false, reason: `${label} evidence could not be validated (${error?.message || error}).` };
        }
    }
    async readValidatedFinalReviewDecision(changePath) {
        const reviewPath = path.join(path.resolve(changePath), 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        if (!(await this.fileService.exists(reviewPath)))
            return 'PENDING';
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        const decision = this.normalizeReviewRunDecision(review.data?.decision);
        if (decision === 'PENDING')
            return decision;
        const validation = await this.validateTaskReviewEvidence(changePath, null);
        return validation.ready ? decision : 'PENDING';
    }
    async readValidatedPlanningReviewDecision(changePath) {
        const reviewPath = path.join(path.resolve(changePath), 'artifacts', 'reviews', PLANNING_REVIEW_FILE);
        if (!(await this.fileService.exists(reviewPath)))
            return 'PENDING';
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        const decision = this.normalizeReviewRunDecision(review.data?.decision);
        if (decision === 'PENDING')
            return decision;
        const validation = await this.validatePlanningReviewEvidence(changePath);
        return validation.ready ? decision : 'PENDING';
    }
    async validateLatestVerificationEvidence(changePath) {
        return this.withValidationScope(() => this.validateLatestVerificationEvidenceUnscoped(changePath));
    }
    async validateLatestVerificationEvidenceUnscoped(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const report = await this.getReport(resolvedChangePath);
        const evidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), report.feature, { changePath: resolvedChangePath, report });
        return evidence.status === 'passed'
            ? { ready: true, reason: null }
            : { ready: false, reason: `Latest verification evidence is not fresh and passing (current: ${evidence.status}).` };
    }
    async validateWorkspaceEvidence(changePath, allowedTaskPaths = []) {
        const resolvedChangePath = path.resolve(changePath);
        const artifactPath = this.getWorkspaceStatusPath(resolvedChangePath);
        if (!(await this.fileService.exists(artifactPath))) {
            return { ready: false, reason: 'Workspace safety evidence is missing.' };
        }
        try {
            const artifact = await this.fileService.readJSON(artifactPath);
            if (String(artifact?.status || '').toLowerCase() !== 'ready') {
                return { ready: false, reason: `Workspace safety status is ${artifact?.status || 'unknown'}.` };
            }
            if (!artifact?.git?.repository || !artifact.git.root || !artifact.git.head) {
                return { ready: false, reason: 'Workspace safety evidence lacks a Git fingerprint; rerun workspace inspection.' };
            }
            const projectRoot = await this.findProjectRoot(resolvedChangePath);
            const gitRootResult = await this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
            if (!gitRootResult.ok || !gitRootResult.stdout.trim()) {
                return { ready: false, reason: 'Workspace Git repository can no longer be inspected.' };
            }
            const gitRoot = path.resolve(gitRootResult.stdout.trim());
            const head = await this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            const branch = await this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            // F30: this compares the live status against the recorded one. A
            // truncated live read shortens the live side, which makes a changed
            // workspace compare equal to a clean inspection -- the exact
            // fail-open this gate exists to prevent.
            const statusRead = await this.readGitOutputWithTruncation(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
            if (statusRead.truncated) {
                return { ready: false, reason: this.gitTruncationReason('git status') };
            }
            const statusOutput = statusRead.text || '';
            const changeRelative = path.relative(gitRoot, resolvedChangePath).replace(/\\/g, '/').replace(/\/$/, '');
            const projectRelative = path.relative(gitRoot, projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
            const outsideChange = (entry) => {
                const files = entry.file.replace(/^"|"$/g, '').replace(/\\/g, '/').split(/\s+->\s+/);
                return files.some(file => !this.isGoalWorkspaceControlPath(file, changeRelative, projectRelative));
            };
            const derivedGoalOwnedPaths = await this.readGoalOwnedWorkspacePaths(resolvedChangePath, gitRoot, projectRoot);
            const derivedGeneratedPaths = await this.readGoalGeneratedWorkspacePaths(resolvedChangePath, gitRoot, projectRoot);
            const allowed = Array.from(new Set([
                ...derivedGoalOwnedPaths,
                ...derivedGeneratedPaths,
                ...allowedTaskPaths
                    .map(item => String(item || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''))
                    .filter(item => item.length > 0
                    && !path.posix.isAbsolute(item)
                    && item !== '..'
                    && !item.startsWith('../')
                    && !item.includes('/../'))
                    .map(item => projectRelative && projectRelative !== '.' ? `${projectRelative}/${item}` : item),
            ]));
            const updateProvenance = await this.readUpdateProvenanceSnapshot(projectRoot, gitRoot);
            const provenanceWasUsed = Array.isArray(artifact?.git?.updateManagedStatusEntries)
                && artifact.git.updateManagedStatusEntries.length > 0;
            const recordedProvenanceHash = provenanceWasUsed
                && typeof artifact?.ownership?.updateProvenanceHash === 'string'
                ? artifact.ownership.updateProvenanceHash
                : null;
            if (recordedProvenanceHash
                && (!updateProvenance.valid || updateProvenance.contentHash !== recordedProvenanceHash)) {
                return { ready: false, reason: 'OSpec update provenance changed after workspace inspection; rerun workspace inspection.' };
            }
            const statusEntries = [];
            for (const entry of this.parseGitStatusEntries(statusOutput).filter(outsideChange)) {
                if (this.workspaceEntryMatchesPaths(entry, allowed))
                    continue;
                if (recordedProvenanceHash
                    && await this.isUpdateManagedWorkspaceEntry(entry, updateProvenance, gitRoot)) {
                    continue;
                }
                statusEntries.push(entry);
            }
            const recordedStatusEntries = (Array.isArray(artifact.git.blockingStatusEntries)
                ? artifact.git.blockingStatusEntries
                : Array.isArray(artifact.git.statusEntries)
                    ? artifact.git.statusEntries
                    : []).filter(outsideChange);
            if (gitRoot !== path.resolve(artifact.git.root)
                || head !== artifact.git.head
                || branch !== (artifact.git.branch || null)
                || JSON.stringify(statusEntries) !== JSON.stringify(recordedStatusEntries)) {
                return { ready: false, reason: 'Workspace changed after safety inspection; rerun workspace inspection before dispatch.' };
            }
            return { ready: true, reason: null };
        }
        catch (error) {
            return { ready: false, reason: `Workspace safety evidence could not be validated (${error?.message || error}).` };
        }
    }
    async readAuthoritativeTokenUsage(changePath) {
        return (await this.readAuthoritativeUsageSnapshot(changePath)).totalTokens;
    }
    async readAuthoritativeUsageSnapshot(changePath) {
        return this.withTaskGraphMutationLease(changePath, () => this.readAuthoritativeUsageSnapshotUnlocked(changePath));
    }
    async readAuthoritativeUsageSnapshotUnlocked(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        await this.ingestReviewUsageSidecars(resolvedChangePath, feature);
        const metricsPath = path.join(resolvedChangePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE);
        if (!(await this.fileService.exists(metricsPath)))
            return { totalTokens: 0, byId: {} };
        const artifact = await this.fileService.readJSON(metricsPath);
        const byId = {};
        for (const entry of Array.isArray(artifact.entries) ? artifact.entries : []) {
            if (entry.kind !== 'usage' || !entry.id || !entry.usage)
                continue;
            const observed = new Set(Array.isArray(entry.usage.observedFields) ? entry.usage.observedFields : []);
            if (!observed.has('inputTokens') && !observed.has('outputTokens'))
                continue;
            byId[entry.id] = Math.max(0, Number(entry.usage.inputTokens) || 0)
                + Math.max(0, Number(entry.usage.outputTokens) || 0);
        }
        return { totalTokens: Object.values(byId).reduce((total, value) => total + value, 0), byId };
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
        const gitRootResult = await this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
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
            branch = await this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            head = await this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            // F30: `statusEntries.length > 0` is the "commit or stash first"
            // blocker and `worktrees` is what proves the recommended path is not
            // already checked out. Both shrink under truncation, and both blocks
            // disappear when they shrink to nothing.
            const statusRead = await this.readGitOutputWithTruncation(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
            if (statusRead.truncated)
                blockers.push(this.gitTruncationReason('git status'));
            statusEntries = this.parseGitStatusEntries(statusRead.text || '');
            const worktreeRead = await this.readGitOutputWithTruncation(projectRoot, ['worktree', 'list', '--porcelain']);
            if (worktreeRead.truncated)
                blockers.push(this.gitTruncationReason('git worktree list'));
            worktrees = this.parseGitWorktrees(worktreeRead.text || '');
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
                commandResults.push(await this.runGitForArtifact(projectRoot, ['worktree', 'add', '-b', plan.recommendedBranch, plan.recommendedPath, plan.baseRef]));
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
                commandResults.push(await this.runGitForArtifact(projectRoot, ['worktree', 'remove', targetPath]));
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
            const finalReviewerStatus = await this.readReviewWorkerStatus(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW));
            implementerStatus = this.deriveImplementerWorkerStatus(tasks, report);
            controllerStatus = this.deriveControllerWorkerStatus({
                implementerStatus,
                specReviewerStatus: finalReviewerStatus,
                qualityReviewerStatus: finalReviewerStatus,
                report,
            });
        }
        const finalDecision = await this.readReviewDecision(path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW));
        if (!APPROVED_REVIEW_DECISIONS.has(finalDecision)) {
            blockers.push(`Final code review is not approved (current: ${finalDecision}).`);
        }
        if (finalDecision === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Final code review was approved with concerns; review the concerns before closeout.');
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
        const gitRootResult = await this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
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
            branch = await this.readGitOutput(projectRoot, ['branch', '--show-current']) || null;
            head = await this.readGitOutput(projectRoot, ['rev-parse', '--short', 'HEAD']) || null;
            // F30: closeout reads "0 uncommitted changes" as safe to finish. A
            // truncated status produces that same 0 from a workspace full of
            // them, so a partial answer blocks instead of clearing the gate.
            const statusRead = await this.readGitOutputWithTruncation(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
            if (statusRead.truncated)
                blockers.push(this.gitTruncationReason('git status'));
            statusEntries = this.parseGitStatusEntries(statusRead.text || '');
            const worktreeRead = await this.readGitOutputWithTruncation(projectRoot, ['worktree', 'list', '--porcelain']);
            if (worktreeRead.truncated)
                blockers.push(this.gitTruncationReason('git worktree list'));
            worktrees = this.parseGitWorktrees(worktreeRead.text || '');
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
                specReview: finalDecision,
                qualityReview: finalDecision,
                controller: controllerStatus,
                pendingRequiredDecisions: userDecisions.pendingRequired,
                verificationChecklistComplete,
                verificationEvidence: verificationEvidence.status,
                tddEvidence: tddEvidence.status,
                debugEvidence: debugEvidence.status,
            },
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
            targetBranch,
            remote,
            commands,
            decisionPrompts,
            blockers,
            warnings,
            nextInstruction: artifact.nextInstruction,
        };
    }
    /*
     * M-race3: `routeWorkflow` and `bootstrap` mutate, so they hold the lease.
     *
     * Both looked like read-only inspections and neither was. `bootstrap` runs
     * the goal-progress reconciliation, writes the bootstrap artifact and its
     * report, and finishes with `syncFeatureStateFromBootstrap` -- a
     * read-modify-write of `state.json`. `routeWorkflow` calls `bootstrap` and
     * then writes two more artifacts derived from what it just wrote. Every one
     * of those raced any leased operation running concurrently.
     *
     * Split into `*Unlocked` bodies rather than nesting the wrapper, because
     * `withTaskGraphMutationLease` is an `fs.open(..., 'wx')` on a lock file
     * and is NOT reentrant: `routeWorkflow` taking the lease and then calling a
     * `bootstrap` that takes it again would not deadlock quietly -- it would
     * spin for the full acquisition timeout and then throw. This is the same
     * `*Unlocked` split `planLaunch`, `complete` and `syncWorkerStatus` already
     * use, for the same reason.
     *
     * The reconciliation call inside `bootstrapUnlocked` moves to
     * `reconcileGoalProgressUnlocked` for that same reason. Note what that
     * changes: the reconciliation used to acquire and release the lease on its
     * own, so bootstrap's remaining reads and its three writes ran outside any
     * lease AND outside the window the reconciliation held. Now the whole
     * operation is one critical section, which is also what makes the artifact
     * consistent with the state it was derived from.
     */
    async routeWorkflow(changePath) {
        return this.withTaskGraphMutationLease(changePath, () => this.routeWorkflowUnlocked(changePath));
    }
    async routeWorkflowUnlocked(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRootForOptionalSession(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        await this.bootstrapUnlocked(resolvedChangePath);
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
        return this.withTaskGraphMutationLease(changePath, () => this.bootstrapUnlocked(changePath));
    }
    async bootstrapUnlocked(changePath) {
        const resolvedChangePath = path.resolve(changePath);
        const projectRoot = await this.findProjectRoot(resolvedChangePath);
        const feature = await this.readFeatureName(resolvedChangePath);
        const generatedAt = new Date().toISOString();
        const artifactPath = this.getBootstrapPath(resolvedChangePath);
        const reportPath = this.getBootstrapReportPath(resolvedChangePath);
        const blockers = [];
        const warnings = [];
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graphExists = await this.fileService.exists(graphPath);
        if (graphExists) {
            // Already inside the lease: see the note on `routeWorkflow`.
            const progressProjection = await this.reconcileGoalProgressUnlocked(resolvedChangePath);
            if (progressProjection.status === 'blocked') {
                blockers.push(`Goal progress projection is blocked: ${progressProjection.issues.join('; ')}`);
            }
        }
        const documents = {
            proposal: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.PROPOSAL, { allowUncheckedChecklist: true }),
            design: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.DESIGN),
            implementationPlan: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN),
            tasks: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.TASKS, { allowUncheckedChecklist: true }),
            verification: await this.readBootstrapDocumentStatus(resolvedChangePath, constants_1.FILE_NAMES.VERIFICATION, { checklistRequired: true }),
        };
        let report = null;
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
        const finalReviewPath = path.join(resolvedChangePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW);
        const specDecision = await this.readReviewDecision(finalReviewPath);
        const qualityDecision = specDecision;
        const specReviewerStatus = await this.readReviewWorkerStatus(finalReviewPath);
        const qualityReviewerStatus = specReviewerStatus;
        const verificationChecklistComplete = await this.isVerificationChecklistComplete(resolvedChangePath);
        const verificationEvidence = await this.readVerificationEvidence(this.getVerificationEvidencePath(resolvedChangePath), feature);
        const tddEvidence = await this.readTddEvidence(this.getTddEvidencePath(resolvedChangePath), feature);
        const debugEvidence = await this.readDebugEvidence(this.getDebugEvidencePath(resolvedChangePath), feature);
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
                waitingOnly: Boolean(report
                    && report.blockedTasks.length > 0
                    && report.blockedTasks.every(entry => entry.reasons.length > 0
                        && entry.reasons.every(reason => reason.startsWith('waiting_for:')
                            || reason.startsWith('waiting_for_task_review:')
                            || reason.startsWith('conflicts_with_running:')))),
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
        await this.syncFeatureStateFromBootstrap(resolvedChangePath, artifact);
        return {
            changePath: resolvedChangePath,
            projectRoot,
            artifactPath,
            reportPath,
            status: artifact.status,
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
        // A serial task owns its whole round: while one is IN_PROGRESS nothing
        // else may start. tasksConflict only sees declared conflicts and
        // file/module overlap, so without this gate a serial task's exclusivity
        // would silently reduce to "happens to touch the same paths".
        if (runningTasks.some(runningTask => !runningTask.parallelizable)) {
            return [];
        }
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
    async withArtifactMutationRollback(scope, action) {
        const files = Array.from(new Set(scope.files.map(filePath => path.resolve(filePath))));
        const directories = Array.from(new Set(scope.directories.map(directory => path.resolve(directory))));
        const fileSnapshots = new Map();
        for (const filePath of files) {
            fileSnapshots.set(filePath, await this.fileService.exists(filePath) ? await fs_1.promises.readFile(filePath) : null);
        }
        const directorySnapshots = new Map();
        for (const directory of directories) {
            const existed = await this.fileService.exists(directory);
            directorySnapshots.set(directory, {
                existed,
                files: existed ? await this.listArtifactFilesRecursive(directory) : new Set(),
            });
        }
        try {
            return await action();
        }
        catch (error) {
            try {
                for (const [directory, snapshot] of directorySnapshots) {
                    if (!snapshot.existed) {
                        await fs_1.promises.rm(directory, { recursive: true, force: true });
                        continue;
                    }
                    const currentFiles = await this.listArtifactFilesRecursive(directory);
                    for (const currentFile of currentFiles) {
                        if (!snapshot.files.has(currentFile))
                            await fs_1.promises.rm(currentFile, { force: true });
                    }
                }
                for (const [filePath, content] of fileSnapshots) {
                    if (content === null) {
                        await fs_1.promises.rm(filePath, { force: true });
                    }
                    else {
                        await fs_1.promises.mkdir(path.dirname(filePath), { recursive: true });
                        await fs_1.promises.writeFile(filePath, content);
                    }
                }
            }
            catch (rollbackError) {
                throw new Error(`Task-graph batch failed (${error?.message || error}) and rollback also failed (${rollbackError?.message || rollbackError}).`);
            }
            throw error;
        }
    }
    async listArtifactFilesRecursive(directory) {
        const files = new Set();
        if (!(await this.fileService.exists(directory)))
            return files;
        const visit = async (current) => {
            for (const entry of await fs_1.promises.readdir(current, { withFileTypes: true })) {
                const entryPath = path.join(current, entry.name);
                if (entry.isDirectory())
                    await visit(entryPath);
                else if (entry.isFile())
                    files.add(path.resolve(entryPath));
            }
        };
        await visit(directory);
        return files;
    }
    getSchedulingDeferralReasons(task, selectedTasks, runningTasks) {
        const reasons = [];
        const runningSerialTasks = runningTasks.filter(running => !running.parallelizable);
        if (runningSerialTasks.length > 0) {
            return [`serial_task_running:${runningSerialTasks.map(item => item.id).join(',')}`];
        }
        const runningConflicts = runningTasks.filter(running => tasksConflict(task, running));
        const selectedConflicts = selectedTasks.filter(selected => tasksConflict(task, selected));
        if (runningConflicts.length > 0)
            reasons.push(`conflicts_with_running:${runningConflicts.map(item => item.id).join(',')}`);
        if (selectedConflicts.length > 0)
            reasons.push(`conflicts_with_selected:${selectedConflicts.map(item => item.id).join(',')}`);
        if (runningTasks.length > 0 && !task.parallelizable)
            reasons.push('serial_task_while_other_work_running');
        if (!task.parallelizable)
            reasons.push(task.serialReason ? `serial_reason:${task.serialReason}` : 'serial_reason_missing');
        if (reasons.length === 0)
            reasons.push('deferred_by_greedy_graph_order');
        return reasons;
    }
    selectNonConflictingBatch(tasks) {
        if (tasks.length <= 1)
            return [...tasks];
        let best = [];
        for (let start = 0; start < tasks.length; start += 1) {
            const ordered = [tasks[start], ...tasks.slice(0, start), ...tasks.slice(start + 1)];
            const selected = [];
            for (const task of ordered) {
                if (selected.every(selectedTask => !tasksConflict(task, selectedTask))) {
                    selected.push(task);
                }
            }
            if (selected.length > best.length)
                best = selected;
        }
        const selectedIds = new Set(best.map(task => task.id));
        return tasks.filter(task => selectedIds.has(task.id));
    }
    isTaskReviewRequired(task) {
        // One combined code review (spec compliance + code quality) gates each task.
        if (!task.review) {
            return false;
        }
        return !APPROVED_REVIEW_DECISIONS.has(task.review.decision);
    }
    getBlockedTaskReviewInstruction(blockedTasks) {
        for (const blocked of blockedTasks) {
            for (const reason of blocked.reasons) {
                const match = reason.match(/^waiting_for_task_review:(.+)$/);
                if (match) {
                    return `Run ospec loop tick [change-path] when a controller Loop owns the Goal so it can review task ${match[1]} with executor provenance; otherwise run ospec execute review [change-path] --task ${match[1]}.`;
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
            return 'Task graph is complete. Continue with review, verification, and archive gates.';
        }
        if (input.blockedTasks.length > 0) {
            return 'Resolve blocked tasks or missing context before dispatch.';
        }
        return 'No dispatchable tasks found.';
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
    getVerificationEvidencePath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', VERIFICATION_EVIDENCE_FILE);
    }
    getVerificationRequirementsPath(changePath) {
        return path.join(changePath, 'artifacts', 'agents', VERIFICATION_REQUIREMENTS_FILE);
    }
    getVerificationLoopActionPath(changePath, actionId, actionItemId) {
        const fileName = `${this.toFileSafeId(actionId)}-${this.toFileSafeId(actionItemId)}.json`;
        return path.join(changePath, 'artifacts', 'agents', VERIFICATION_ACTIONS_DIR, fileName);
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
        const statePath = path.join(changePath, constants_1.FILE_NAMES.STATE);
        const state = await this.fileService.exists(statePath)
            ? await this.fileService.readJSON(statePath)
            : null;
        const workflowProfile = await (0, WorkflowProfile_1.inferWorkflowProfileFromChangeDir)(changePath, state);
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
            ? `Ask the user to choose required decision(s): ${pendingIds.join(', ')}. Record the answer with ospec execute decision [change-path] --id <id> --select <option-id> --answered-by user.`
            : decisions.length > 0
                ? workflowProfile === WorkflowProfile_1.GOAL_WORKFLOW_PROFILE
                    ? 'No required user decisions are pending. Continue with bootstrap, workspace, dispatch, review, or verification as appropriate.'
                    : 'No required user decisions are pending. Continue the classic Change through proposal, tasks, implementation, top-level ospec verify, lightweight review, and ospec finalize. Do not run Goal bootstrap, workspace, dispatch, or Loop commands.'
                : 'No user decisions are recorded for this change.';
        return {
            exists,
            dirPath,
            indexPath: this.toChangeRelativePath(changePath, indexPath),
            indexReportPath: this.toChangeRelativePath(changePath, indexReportPath),
            workflowProfile,
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
            workflowProfile: snapshot.workflowProfile,
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
            answeredBy: raw?.answeredBy === 'user' ? 'user' : null,
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
            return `Ask the user to decide "${record.question}".${optionText} Then run ospec execute decision ${this.quoteShellArg(relativeChangePath)} --id ${this.quoteShellArg(record.id)} --select <option-id> --answered-by user.`;
        }
        return `Decision ${record.id} is ${record.status}. Run ospec execute bootstrap ${this.quoteShellArg(relativeChangePath)} to continue with the next safe action.`;
    }
    async readVerificationEvidence(evidencePath, feature, lookup) {
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
        let status = this.deriveVerificationEvidenceStatus(records);
        const latest = records[records.length - 1];
        if (latest?.status === 'PASSED') {
            const changePath = lookup?.changePath || path.dirname(path.dirname(path.dirname(evidencePath)));
            if (!(await this.isPassingVerificationRecordFresh(changePath, latest, lookup))) {
                status = 'pending';
            }
        }
        return {
            version: typeof evidence.version === 'string' ? evidence.version : '1.0',
            feature: typeof evidence.feature === 'string' && evidence.feature.trim() ? evidence.feature : feature,
            status,
            updatedAt: typeof evidence.updatedAt === 'string' ? evidence.updatedAt : new Date().toISOString(),
            records,
        };
    }
    async readVerificationRequirements(changePath, feature) {
        const artifactPath = this.getVerificationRequirementsPath(changePath);
        if (!(await this.fileService.exists(artifactPath))) {
            return {
                version: '1.0',
                feature,
                updatedAt: new Date().toISOString(),
                requirements: [],
            };
        }
        const raw = await this.fileService.readJSON(artifactPath);
        const requirements = Array.isArray(raw.requirements)
            ? raw.requirements.flatMap(item => {
                const id = this.toFileSafeId(String(item?.id || ''));
                const description = String(item?.description || '').trim();
                if (!id || !description)
                    return [];
                const now = new Date().toISOString();
                return [{
                        id,
                        kind: this.normalizeVerificationRequirementKind(item.kind),
                        description,
                        required: item.required !== false,
                        createdAt: String(item.createdAt || now),
                        updatedAt: String(item.updatedAt || item.createdAt || now),
                    }];
            })
            : [];
        return {
            version: '1.0',
            feature: String(raw.feature || feature),
            updatedAt: String(raw.updatedAt || new Date().toISOString()),
            requirements,
        };
    }
    normalizeVerificationRequirementIds(values) {
        return Array.from(new Set(values
            .map(value => this.toFileSafeId(String(value || '')))
            .filter(Boolean)));
    }
    normalizeVerificationRequirementKind(value) {
        const normalized = String(value || 'other').trim().toLowerCase();
        return normalized === 'browser'
            || normalized === 'e2e'
            || normalized === 'test'
            || normalized === 'lint'
            || normalized === 'build'
            || normalized === 'manual'
            ? normalized
            : 'other';
    }
    /**
     * The whole-tree snapshot every passing verification record is measured
     * against. Every record in one artifact is measured against the *same*
     * tree at the *same* commit, so it is derived once and handed to each
     * record rather than re-derived per record -- which is what made the
     * freshness check grow quadratically as evidence accumulated.
     */
    async buildVerificationFreshnessContext(changePath, report) {
        const resolvedReport = report || await this.getReport(changePath);
        const currentTargetFiles = this.normalizeTargetFiles(Array.from(new Set(this.flattenReportTasks(resolvedReport).flatMap(task => task.targetFiles))));
        const projectRoot = await this.findProjectRootForOptionalSession(changePath);
        const currentSnapshots = await this.captureTargetSnapshots(projectRoot, currentTargetFiles);
        const capturedSnapshotHash = this.hashTargetSnapshots(currentSnapshots);
        let confirmation = null;
        return {
            changePath: path.resolve(changePath),
            projectRoot,
            currentTargetFiles,
            currentTargetFilesKey: JSON.stringify(currentTargetFiles),
            currentSnapshots,
            graphPath: resolvedReport.graphPath,
            confirm: () => (confirmation ?? (confirmation = this.confirmVerificationFreshnessContext(projectRoot, currentTargetFiles, capturedSnapshotHash))),
        };
    }
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
    async confirmVerificationFreshnessContext(projectRoot, targetFiles, capturedSnapshotHash) {
        try {
            const [snapshots, head] = await Promise.all([
                this.captureTargetSnapshots(projectRoot, targetFiles),
                this.readValidationGitHead(projectRoot, 'refusal-condition'),
            ]);
            return {
                stillCurrent: this.hashTargetSnapshots(snapshots) === capturedSnapshotHash,
                head,
            };
        }
        catch {
            return { stillCurrent: false, head: null };
        }
    }
    /**
     * The half of the freshness test that is a pure function of the captured
     * context. FIX-4 moved the HEAD comparison out of here and next to the
     * confirmation, because HEAD is a refusal condition and therefore has to be
     * observed at the moment of the verdict rather than at capture time.
     */
    isPassingVerificationRecordFreshAgainst(record, context) {
        if (context.currentTargetFilesKey !== JSON.stringify(this.normalizeTargetFiles(record.targetFiles))) {
            return false;
        }
        return this.targetSnapshotsMatchDispatch(context.currentSnapshots, record.targetSnapshots, record.targetSnapshotHash);
    }
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
    memoiseVerificationFreshnessContext(changePath, report) {
        let pending = null;
        return () => (pending ?? (pending = this.buildVerificationFreshnessContext(changePath, report)));
    }
    async isPassingVerificationRecordFresh(changePath, record, lookup) {
        if (!Array.isArray(record.targetFiles)
            || !Array.isArray(record.targetSnapshots)
            || !record.targetSnapshotHash
            || this.hashTargetSnapshots(record.targetSnapshots) !== record.targetSnapshotHash) {
            return false;
        }
        try {
            /*
             * This once kept its own `verification:<recordId>` entry in an
             * on-disk validation cache. That went first, and the rest of that
             * cache followed; see the note at the top of this file.
             *
             * The Phase 3 win here is `memoiseVerificationFreshnessContext`:
             * one tree walk and one `git rev-parse` for every record in the
             * artifact instead of one per record. That is untouched.
             *
             * FIX-4: a record that already fails against the captured snapshot
             * costs nothing extra, because a refusal cannot be made wrong by
             * the tree having moved on -- re-deriving would only find more
             * reasons to refuse. Everything else pays one confirmation, shared
             * by every record in the sweep, and the HEAD comparison happens
             * there because HEAD moving is a refusal condition and must be
             * observed at the verdict rather than inherited from the scope.
             */
            const resolvedChangePath = path.resolve(changePath);
            const context = lookup?.context
                ? await lookup.context()
                : await this.buildVerificationFreshnessContext(resolvedChangePath, lookup?.report);
            if (!this.isPassingVerificationRecordFreshAgainst(record, context))
                return false;
            const confirmed = await context.confirm();
            if (!confirmed.stillCurrent)
                return false;
            return !record.gitHead || confirmed.head === record.gitHead;
        }
        catch {
            return false;
        }
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
    async reconcileGoalProgress(changePath) {
        return this.withTaskGraphMutationLease(changePath, () => this.reconcileGoalProgressUnlocked(changePath));
    }
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
    async inspectGoalProgress(changePath) {
        return this.reconcileGoalProgressUnlocked(changePath, { persist: false });
    }
    async reconcileGoalProgressUnlocked(changePath, options = {}) {
        const persist = options.persist !== false;
        const resolvedChangePath = path.resolve(changePath);
        const graphPath = path.join(resolvedChangePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const tasksPath = path.join(resolvedChangePath, constants_1.FILE_NAMES.TASKS);
        const projectionPath = path.join(resolvedChangePath, 'artifacts', 'agents', GOAL_PROGRESS_PROJECTION_FILE);
        const [graphExists, tasksExists] = await Promise.all([
            this.fileService.exists(graphPath),
            this.fileService.exists(tasksPath),
        ]);
        const issues = [];
        if (!graphExists)
            issues.push(`Task graph is missing: ${graphPath}`);
        if (!tasksExists)
            issues.push(`Task checklist is missing: ${tasksPath}`);
        const graphContent = graphExists ? await this.fileService.readFile(graphPath) : null;
        const tasksContent = tasksExists ? await this.fileService.readFile(tasksPath) : null;
        let rawGraph = null;
        if (graphContent !== null) {
            try {
                rawGraph = JSON.parse(graphContent.replace(/^\uFEFF/, ''));
            }
            catch (error) {
                issues.push(`Task graph cannot be parsed: ${error?.message || error}`);
            }
        }
        if (rawGraph && !Array.isArray(rawGraph.tasks)) {
            issues.push('Task graph does not contain a tasks array.');
        }
        const reviewDecisionsRepaired = [];
        let graphChanged = false;
        if (rawGraph && Array.isArray(rawGraph.tasks)) {
            const graphBefore = JSON.stringify(rawGraph);
            reviewDecisionsRepaired.push(...await this.syncTaskReviewStateFromArtifactsUnlocked(resolvedChangePath, rawGraph));
            graphChanged = graphBefore !== JSON.stringify(rawGraph);
        }
        const graphTaskIds = Array.isArray(rawGraph?.tasks)
            ? rawGraph.tasks
                .map((task) => typeof task?.id === 'string' ? task.id.trim() : '')
                .filter((taskId) => taskId.startsWith('task-'))
            : [];
        const graphTaskIdSet = new Set(graphTaskIds);
        const duplicateTaskIds = this.findDuplicateStrings(graphTaskIds);
        const taskLineMap = new Map();
        const ambiguousLines = [];
        const lines = tasksContent === null ? [] : tasksContent.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
            const checklist = lines[index].match(/^(\s*[-*+]\s+\[)[ xX](\]\s+)(.*)$/u);
            if (!checklist)
                continue;
            const parsed = this.parsePrimaryTaskChecklistId(checklist[3]);
            if (!parsed)
                continue;
            if (parsed.ambiguousTaskIds.length > 0) {
                ambiguousLines.push({
                    line: index + 1,
                    taskIds: [parsed.taskId, ...parsed.ambiguousTaskIds],
                });
                continue;
            }
            const matchingLines = taskLineMap.get(parsed.taskId) || [];
            matchingLines.push(index);
            taskLineMap.set(parsed.taskId, matchingLines);
        }
        for (const [taskId, matchingLines] of taskLineMap) {
            if (matchingLines.length > 1)
                duplicateTaskIds.push(taskId);
        }
        const uniqueDuplicateTaskIds = [...new Set(duplicateTaskIds)].sort((left, right) => left.localeCompare(right));
        const unknownTaskIds = [...taskLineMap.keys()]
            .filter(taskId => !graphTaskIdSet.has(taskId))
            .sort((left, right) => left.localeCompare(right));
        const acceptedTaskIds = Array.isArray(rawGraph?.tasks)
            ? rawGraph.tasks
                .filter((task) => TERMINAL_TASK_STATUSES.has(normalizeStatus(task?.status) || 'PENDING')
                && APPROVED_REVIEW_DECISIONS.has(this.normalizeReviewRunDecision(normalizeStatus(task?.review?.decision) || 'PENDING'))
                && String(task?.id || '').trim().startsWith('task-'))
                .map((task) => String(task.id).trim())
            : [];
        const acceptedTaskIdSet = new Set(acceptedTaskIds);
        const unmatchedAcceptedTaskIds = [...new Set(acceptedTaskIds)]
            .filter(taskId => (taskLineMap.get(taskId)?.length || 0) !== 1)
            .sort((left, right) => left.localeCompare(right));
        const checkedTaskIds = [...new Set(graphTaskIds)]
            .filter(taskId => acceptedTaskIdSet.has(taskId) && (taskLineMap.get(taskId)?.length || 0) === 1)
            .sort((left, right) => left.localeCompare(right));
        const uncheckedTaskIds = [...new Set(graphTaskIds)]
            .filter(taskId => !acceptedTaskIdSet.has(taskId) && (taskLineMap.get(taskId)?.length || 0) === 1)
            .sort((left, right) => left.localeCompare(right));
        if (uniqueDuplicateTaskIds.length > 0) {
            issues.push(`Duplicate task checklist or graph IDs: ${uniqueDuplicateTaskIds.join(', ')}`);
        }
        if (unknownTaskIds.length > 0) {
            issues.push(`tasks.md contains task IDs not present in the task graph: ${unknownTaskIds.join(', ')}`);
        }
        if (unmatchedAcceptedTaskIds.length > 0) {
            issues.push(`Accepted task IDs do not have exactly one tasks.md checklist line: ${unmatchedAcceptedTaskIds.join(', ')}`);
        }
        if (ambiguousLines.length > 0) {
            issues.push(`Ambiguous task checklist lines: ${ambiguousLines.map(item => `${item.line} (${item.taskIds.join(', ')})`).join('; ')}`);
        }
        const status = issues.length === 0 ? 'current' : 'blocked';
        let nextTasksContent = tasksContent;
        let tasksChanged = false;
        if (status === 'current' && tasksContent !== null) {
            const nextLines = [...lines];
            for (const [taskId, matchingLines] of taskLineMap) {
                if (matchingLines.length !== 1 || !graphTaskIdSet.has(taskId))
                    continue;
                const lineIndex = matchingLines[0];
                const marker = acceptedTaskIdSet.has(taskId) ? 'x' : ' ';
                nextLines[lineIndex] = nextLines[lineIndex].replace(/^(\s*[-*+]\s+\[)[ xX](\])/u, `$1${marker}$2`);
            }
            const newline = tasksContent.includes('\r\n') ? '\r\n' : '\n';
            nextTasksContent = nextLines.join(newline);
            tasksChanged = nextTasksContent !== tasksContent;
        }
        /*
         * FIX-5: the repairs, captured in write order. `writeJSON` serialises
         * with `JSON.stringify(data, null, 2)`, so the graph entry is the exact
         * bytes the persisting path lays down.
         */
        const repairedArtifacts = [];
        if (!persist && graphChanged)
            repairedArtifacts.push({ path: graphPath, content: JSON.stringify(rawGraph, null, 2) });
        if (!persist && tasksChanged && nextTasksContent !== null)
            repairedArtifacts.push({ path: tasksPath, content: nextTasksContent });
        if (persist && graphChanged)
            await this.fileService.writeJSON(graphPath, rawGraph);
        if (persist && tasksChanged && nextTasksContent !== null)
            await this.fileService.writeFileAtomic(tasksPath, nextTasksContent);
        const feature = typeof rawGraph?.feature === 'string' && rawGraph.feature.trim().length > 0
            ? rawGraph.feature.trim()
            : await this.readFeatureName(resolvedChangePath).catch(() => path.basename(resolvedChangePath));
        const previousProjection = await this.fileService.exists(projectionPath)
            ? await this.fileService.readJSON(projectionPath).catch(() => null)
            : null;
        const priorRepairs = Array.isArray(previousProjection?.reviewDecisionsRepaired)
            ? previousProjection.reviewDecisionsRepaired.filter((taskId) => typeof taskId === 'string')
            : [];
        const stableProjection = {
            version: '1.0',
            feature,
            status,
            sources: {
                graphPath: this.toChangeRelativePath(resolvedChangePath, graphPath),
                graphHash: rawGraph ? this.hashProgressProjectionContent(JSON.stringify(rawGraph, null, 2)) : null,
                tasksPath: this.toChangeRelativePath(resolvedChangePath, tasksPath),
                tasksHash: nextTasksContent === null ? null : this.hashProgressProjectionContent(nextTasksContent),
            },
            reviewDecisionsRepaired: [...new Set([...priorRepairs, ...reviewDecisionsRepaired])]
                .sort((left, right) => left.localeCompare(right)),
            checkedTaskIds,
            uncheckedTaskIds,
            unmatchedAcceptedTaskIds,
            duplicateTaskIds: uniqueDuplicateTaskIds,
            unknownTaskIds,
            ambiguousLines,
            issues,
        };
        const previousStableProjection = previousProjection
            ? (({ projectedAt: _projectedAt, ...rest }) => rest)(previousProjection)
            : null;
        const projectionChanged = JSON.stringify(previousStableProjection) !== JSON.stringify(stableProjection);
        if (projectionChanged) {
            /*
             * FIX-5: `projectedAt` is a wall-clock stamp, so the dry-run copy
             * cannot be byte-identical to what a real run would write -- and no
             * archive gate reads this artifact, so it does not need to be. It is
             * listed anyway because leaving one of the three writes out is
             * exactly how the previous half-fixes happened.
             */
            const projectionRecord = {
                ...stableProjection,
                projectedAt: new Date().toISOString(),
            };
            if (persist)
                await this.fileService.writeJSON(projectionPath, projectionRecord);
            else
                repairedArtifacts.push({ path: projectionPath, content: JSON.stringify(projectionRecord, null, 2) });
        }
        return {
            changePath: resolvedChangePath,
            graphPath,
            tasksPath,
            projectionPath,
            status,
            graphChanged,
            tasksChanged,
            projectionChanged,
            reviewDecisionsRepaired: [...new Set(reviewDecisionsRepaired)].sort((left, right) => left.localeCompare(right)),
            checkedTaskIds,
            uncheckedTaskIds,
            unmatchedAcceptedTaskIds,
            duplicateTaskIds: uniqueDuplicateTaskIds,
            unknownTaskIds,
            ambiguousLines,
            issues,
            ...(persist ? {} : { repairedArtifacts }),
        };
    }
    async syncTaskReviewStateFromArtifactsUnlocked(changePath, rawGraph) {
        if (!Array.isArray(rawGraph?.tasks))
            return [];
        const repairedTaskIds = [];
        for (const rawTask of rawGraph.tasks) {
            if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask) || !rawTask.review)
                continue;
            const taskId = typeof rawTask.id === 'string' && rawTask.id.trim().length > 0 ? rawTask.id.trim() : '';
            if (!taskId)
                continue;
            rawTask.review = typeof rawTask.review === 'object' && !Array.isArray(rawTask.review)
                ? rawTask.review
                : {};
            const reviewArtifact = typeof rawTask.review.review_artifact === 'string' && rawTask.review.review_artifact.trim().length > 0
                ? rawTask.review.review_artifact.trim()
                : this.getTaskCombinedReviewArtifactRelativePath(taskId);
            rawTask.review.review_artifact = reviewArtifact;
            const nextDecision = this.normalizeReviewRunDecision(await this.readReviewDecision(path.join(changePath, reviewArtifact)));
            if (rawTask.review.decision !== nextDecision) {
                rawTask.review.decision = nextDecision;
                repairedTaskIds.push(taskId);
            }
        }
        rawGraph.status = this.deriveGraphStatus(rawGraph);
        return repairedTaskIds;
    }
    parsePrimaryTaskChecklistId(content) {
        const match = content.match(/^`(task-[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*)`(?=$|[\s:：,，/])/u)
            || content.match(/^(task-[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*)(?=$|[\s:：,，/])/u);
        if (!match)
            return null;
        const remainder = content.slice(match[0].length);
        const adjacent = remainder.match(/^\s*(?:[,，/&+]\s*)?`?(task-[A-Za-z0-9][A-Za-z0-9._-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)*)`?(?=$|[\s:：,，/])/u);
        return {
            taskId: match[1],
            ambiguousTaskIds: adjacent && adjacent[1] !== match[1] ? [adjacent[1]] : [],
        };
    }
    findDuplicateStrings(values) {
        const seen = new Set();
        const duplicates = new Set();
        for (const value of values) {
            if (seen.has(value))
                duplicates.add(value);
            seen.add(value);
        }
        return [...duplicates].sort((left, right) => left.localeCompare(right));
    }
    hashProgressProjectionContent(content) {
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    async readReviewDecision(reviewPath) {
        if (!(await this.fileService.exists(reviewPath))) {
            return 'PENDING';
        }
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        const decision = normalizeStatus(review.data?.decision) || 'PENDING';
        if (decision === 'PENDING')
            return decision;
        const normalizedPath = reviewPath.replace(/\\/g, '/');
        const marker = '/artifacts/reviews/';
        const markerIndex = normalizedPath.lastIndexOf(marker);
        if (markerIndex < 0)
            return decision;
        const relativeReviewPath = normalizedPath.slice(markerIndex + marker.length);
        const isFinalReview = relativeReviewPath === constants_1.FILE_NAMES.FINAL_REVIEW;
        const isTaskReview = relativeReviewPath.startsWith(`${TASK_REVIEWS_DIR}/`)
            && relativeReviewPath.endsWith(`/${constants_1.FILE_NAMES.REVIEW}`);
        if (!isFinalReview && !isTaskReview)
            return decision;
        const changePath = reviewPath.slice(0, markerIndex);
        let taskId = null;
        if (isTaskReview) {
            const dispatchId = String(review.data?.review_dispatch_id || '').trim();
            if (!dispatchId)
                return 'PENDING';
            const dispatchPath = path.join(changePath, 'artifacts', 'agents', REVIEW_DISPATCHES_DIR, `${dispatchId}.json`);
            if (!(await this.fileService.exists(dispatchPath)))
                return 'PENDING';
            const dispatch = await this.fileService.readJSON(dispatchPath);
            taskId = typeof dispatch.taskId === 'string' && dispatch.taskId.trim() ? dispatch.taskId.trim() : null;
            if (!taskId)
                return 'PENDING';
        }
        const validation = await this.validateTaskReviewEvidence(changePath, taskId);
        return validation.ready ? decision : 'PENDING';
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
                label: 'design planning preflight',
                documentFile: constants_1.FILE_NAMES.DESIGN,
                reviewArtifactFile: DESIGN_DOCUMENT_REVIEW_FILE,
            };
        }
        return {
            label: 'implementation plan preflight',
            documentFile: constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
            reviewArtifactFile: IMPLEMENTATION_PLAN_DOCUMENT_REVIEW_FILE,
        };
    }
    getDocumentReviewArtifactPath(changePath, stage) {
        return path.join(changePath, 'artifacts', 'reviews', this.getDocumentReviewTarget(stage).reviewArtifactFile);
    }
    getTaskCombinedReviewArtifactRelativePath(taskId) {
        return [
            'artifacts',
            'reviews',
            TASK_REVIEWS_DIR,
            this.toFileSafeId(taskId) || 'task',
            constants_1.FILE_NAMES.REVIEW,
        ].join('/');
    }
    getTaskWorkerReportRelativePath(taskId) {
        return [
            'artifacts',
            'agents',
            WORKER_REPORTS_DIR,
            `${this.toFileSafeId(taskId) || 'task'}.md`,
        ].join('/');
    }
    getTaskWorkerReportProjectRelativePath(changePath, projectRoot, taskId) {
        const absolutePath = path.join(changePath, this.getTaskWorkerReportRelativePath(taskId));
        const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
        const normalized = this.normalizeTargetFiles([relativePath])[0];
        if (!normalized) {
            throw new Error(`Task ${taskId} worker report resolves outside the project root.`);
        }
        return normalized;
    }
    async prepareTaskReviewDispatch(changePath, report, taskId) {
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
        rawTask.review.review_artifact = typeof rawTask.review.review_artifact === 'string' && rawTask.review.review_artifact.trim()
            ? rawTask.review.review_artifact.trim()
            : this.getTaskCombinedReviewArtifactRelativePath(taskId);
        const reviewArtifactPath = path.join(changePath, rawTask.review.review_artifact);
        const decision = await this.fileService.exists(reviewArtifactPath)
            ? this.normalizeReviewRunDecision(await this.readReviewDecision(reviewArtifactPath))
            : normalizeReviewDecisionValue(rawTask.review.decision);
        if (!(await this.fileService.exists(reviewArtifactPath))) {
            await this.writeLocalizedReportFile(changePath, reviewArtifactPath, this.buildDefaultTaskReviewArtifact(report.feature, task));
        }
        rawTask.review.decision = APPROVED_REVIEW_DECISIONS.has(decision) ? decision : 'PENDING';
        rawGraph.status = this.deriveGraphStatus(rawGraph);
        await this.fileService.writeJSON(report.graphPath, rawGraph);
        return {
            task,
            stage: 'review',
            decision,
            reviewArtifactPath,
        };
    }
    buildDefaultTaskReviewArtifact(feature, task) {
        return [
            '---',
            `feature: ${feature}`,
            `created: ${new Date().toISOString().split('T')[0]}`,
            'status: pending',
            'reviewer_role: code_reviewer',
            'decision: PENDING',
            `task_id: ${task.id}`,
            `task_title: ${task.title}`,
            'optional_steps: []',
            '---',
            '',
            `# Task Code Review: ${task.id}`,
            '',
            '## Task Scope',
            '',
            `- Title: ${task.title}`,
            `- Target files: ${task.targetFiles.length > 0 ? task.targetFiles.join(', ') : 'none'}`,
            `- Expected result: ${task.expectedResult || 'none'}`,
            `- Documentation updates: ${task.documentationUpdates.join(', ') || 'none'}`,
            '',
            '## Spec Compliance',
            '',
            '- [ ] Confirm the implementation satisfies this task without under-building or over-building.',
            '- TBD',
            '',
            '## Code Quality',
            '',
            '- [ ] Confirm the implementation is maintainable, minimal, tested, and safe.',
            '- TBD',
            '',
            '## Decision',
            '',
            '- Review the task packet, changed files, and verification evidence across both dimensions, record concrete findings above, then set the single `decision` (APPROVED, APPROVED_WITH_CONCERNS, NEEDS_CHANGES, BLOCKED).',
            '',
        ].join('\n');
    }
    buildDefaultFinalReviewArtifact(feature) {
        return [
            '---',
            `feature: ${feature}`,
            `created: ${new Date().toISOString().split('T')[0]}`,
            'status: pending',
            'reviewer_role: code_reviewer',
            'decision: PENDING',
            'optional_steps: []',
            '---',
            '',
            '# Final Code Review',
            '',
            '## Spec Compliance',
            '',
            '- [ ] Confirm the change satisfies `proposal.md`, `design.md`, `implementation-plan.md`, and `tasks.md` without under-building or over-building.',
            '- TBD',
            '',
            '## Code Quality',
            '',
            '- [ ] Confirm the change is maintainable, minimal, tested, and safe across all task output.',
            '- TBD',
            '',
            '## Decision',
            '',
            '- Review the whole change across both dimensions after all task-level reviews are approved and the task graph is completed, record concrete findings above, then set the single `decision` (APPROVED, APPROVED_WITH_CONCERNS, NEEDS_CHANGES, BLOCKED).',
            '',
        ].join('\n');
    }
    buildDefaultPlanningReviewArtifact(feature) {
        return [
            '---',
            `feature: ${feature}`,
            `created: ${new Date().toISOString().split('T')[0]}`,
            'status: pending',
            'reviewer_role: planning_reviewer',
            'decision: PENDING',
            `planning_contract_version: ${PLANNING_CONTRACT_VERSION}`,
            'optional_steps: []',
            '---',
            '',
            '# Combined Planning Review',
            '',
            '## Requirement And Design Integrity',
            '',
            '- [ ] Every acceptance criterion is represented by the design and implementation plan.',
            '- [ ] API, data, security, migration, UI, and operational boundaries are coherent where applicable.',
            '- TBD',
            '',
            '## Task Graph And Verification Coverage',
            '',
            '- [ ] Every requirement maps to bounded task ownership and verification evidence.',
            '- [ ] Dependencies, conflicts, documentation updates, and external acceptance boundaries are complete.',
            '- TBD',
            '',
            '## Decision',
            '',
            '- Review proposal, design, implementation plan, tasks, and task graph in one independent pass, then set `decision` to APPROVED, APPROVED_WITH_CONCERNS, NEEDS_CHANGES, or BLOCKED.',
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
        // M-cfg3 extracted this predicate to utils/ChecklistScan and pointed
        // ArchiveCommand, ProjectService and ReviewArtifacts at it, but not this
        // file -- so `ospec archive` and this closeout gate returned OPPOSITE
        // answers on the same verification.md, in both directions: a fenced
        // example made archive say ready and this say incomplete, and a `*`
        // bullet did the reverse. Two gates disagreeing is worse than both being
        // wrong the same way, which is what the split created.
        return (0, ChecklistScan_1.hasChecklistItem)(verification.content)
            && (0, ChecklistScan_1.listUncheckedChecklistItems)(verification.content).length === 0;
    }
    async writeTaskReviewPackage(input) {
        const packagePath = path.join(input.changePath, 'artifacts', 'agents', REVIEW_PACKAGES_DIR, `${input.reviewId}.diff`);
        const relativePackagePath = this.toChangeRelativePath(input.changePath, packagePath);
        const targetFiles = input.task.targetFiles
            .map(filePath => String(filePath || '').trim().replace(/\\/g, '/').replace(/^\.\//, ''))
            .filter(filePath => filePath.length > 0 && !path.isAbsolute(filePath) && filePath !== '..' && !filePath.startsWith('../'));
        const targetPathKeys = targetFiles.map(normalizeTaskPath);
        const statusResult = await this.runGit(input.projectRoot, [
            'status',
            '--porcelain=v2',
            '--branch',
            '--untracked-files=all',
            '--no-ahead-behind',
        ]);
        const statusSnapshot = statusResult.ok ? parseGitDispatchSnapshot(statusResult.stdout) : null;
        // F30: informational, not a gate -- this package is read by a reviewer,
        // so a partial in/out-of-scope split is still worth writing. It is not
        // worth writing SILENTLY: the reviewer would read a short out-of-scope
        // list as a clean one. The package says so, below.
        const fallbackStatusRead = statusSnapshot
            ? null
            : await this.readGitOutputWithTruncation(input.projectRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
        const statusTruncated = statusSnapshot
            ? statusResult.stdoutTruncated === true
            : fallbackStatusRead?.truncated === true;
        const statusEntries = statusSnapshot
            ? parseGitStatusV2Entries(statusResult.stdout)
            : this.parseGitStatusEntries(fallbackStatusRead?.text || '');
        const inScopeStatus = statusEntries.filter(entry => {
            const fileKey = normalizeTaskPath(entry.file);
            return targetPathKeys.some(target => taskPathsOverlap(target, fileKey));
        });
        const outOfScopeStatus = statusEntries.filter(entry => !inScopeStatus.includes(entry));
        const requestedBase = input.dispatch?.gitBaseCommit || null;
        const baseValid = requestedBase
            ? (await this.runGit(input.projectRoot, ['rev-parse', '--verify', `${requestedBase}^{commit}`])).ok
            : false;
        const baseCommit = baseValid ? requestedBase : null;
        const headCommit = statusSnapshot?.headCommit || await this.readGitOutput(input.projectRoot, ['rev-parse', 'HEAD']);
        const diffBase = baseCommit || headCommit;
        const log = baseCommit && headCommit && baseCommit !== headCommit
            ? await this.runGit(input.projectRoot, ['log', '--oneline', `${baseCommit}..${headCommit}`])
            : null;
        const stat = diffBase && targetFiles.length > 0
            ? await this.runGit(input.projectRoot, ['diff', '--stat', diffBase, '--', ...targetFiles])
            : null;
        const diff = diffBase && targetFiles.length > 0
            ? await this.runGit(input.projectRoot, ['diff', '--no-ext-diff', '--unified=10', diffBase, '--', ...targetFiles])
            : null;
        const lines = [
            `# Task Review Package: ${input.task.id}`,
            '',
            `- Review ID: ${input.reviewId}`,
            `- Dispatch ID: ${input.dispatch?.id || 'not recorded'}`,
            `- Base commit: ${baseCommit || 'not available'}`,
            `- Current HEAD: ${headCommit || 'not available'}`,
            `- Workspace dirty at dispatch: ${input.dispatch?.workspaceDirtyAtDispatch === true ? 'yes' : input.dispatch?.workspaceDirtyAtDispatch === false ? 'no' : 'unknown'}`,
            `- Target files: ${targetFiles.join(', ') || 'none'}`,
            '',
            '## Upstream Regression Obligations',
            '',
            ...(input.regressionTasks?.length
                ? input.regressionTasks.flatMap(task => [
                    `### ${task.id}: ${task.title}`,
                    '',
                    `- Expected result: ${task.expectedResult}`,
                    `- Shared target files: ${task.targetFiles.filter(file => targetFiles.some(target => taskPathsOverlap(normalizeTaskPath(file), normalizeTaskPath(target)))).join(', ') || 'none'}`,
                    '- Confirm this downstream implementation preserves the upstream contract on every shared target file.',
                    '',
                ])
                : ['- None. This task does not modify target files owned by a transitive upstream task.', '']),
            '## Attribution Warning',
            '',
            input.dispatch?.workspaceDirtyAtDispatch === true
                ? 'The workspace was already dirty at dispatch. This package shows the current net target-file diff from the recorded commit, but cannot attribute every line exclusively to this task.'
                : baseCommit
                    ? 'The package uses the dispatch commit as its baseline and scopes the diff to this task\'s target files.'
                    : 'No valid dispatch commit was available. Treat this package as scoped current-workspace evidence, not a complete task attribution record.',
            '',
            '## Commits',
            '',
            log?.ok && log.stdout.trim()
                ? `${log.stdout.trimEnd()}${log.stdoutTruncated === true ? '\n(INCOMPLETE: the commit list above was truncated at the git output limit.)' : ''}`
                : '(none or unavailable)',
            '',
            '## In-Scope Workspace Status',
            '',
            ...(statusTruncated
                ? [`(INCOMPLETE: ${this.gitTruncationReason('git status')} The lists below are a prefix, not the whole workspace.)`, '']
                : []),
            ...this.renderGitStatusEntries(inScopeStatus),
            '',
            '## Out-of-Scope Workspace Status',
            '',
            ...(statusTruncated
                ? ['(INCOMPLETE: see the note above. An empty or short list here does NOT mean the work stayed in scope.)', '']
                : []),
            ...this.renderGitStatusEntries(outOfScopeStatus),
            '',
            '## Files Changed',
            '',
            stat?.ok && stat.stdout.trim()
                ? `${stat.stdout.trimEnd()}${stat.stdoutTruncated === true ? '\n(INCOMPLETE: the file list above was truncated at the git output limit.)' : ''}`
                : '(none or unavailable)',
            '',
            '## Diff',
            '',
            this.renderReviewPackageDiff(diff),
        ];
        const untrackedEntries = inScopeStatus.filter(entry => entry.code === '??');
        if (untrackedEntries.length > 0) {
            lines.push('', '## Untracked Target Files', '');
            for (const entry of untrackedEntries) {
                const relativePath = entry.file.replace(/\\/g, '/');
                const absolutePath = path.resolve(input.projectRoot, ...relativePath.split('/'));
                const relativeToRoot = path.relative(input.projectRoot, absolutePath);
                if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
                    lines.push(`### ${relativePath}`, '', '(unsafe path omitted)', '');
                    continue;
                }
                try {
                    const content = await fs_1.promises.readFile(absolutePath);
                    if (content.length > 256 * 1024) {
                        lines.push(`### ${relativePath}`, '', `(content omitted: ${content.length} bytes exceeds 262144-byte review limit)`, '');
                    }
                    else if (content.includes(0)) {
                        lines.push(`### ${relativePath}`, '', `(binary content omitted: ${content.length} bytes)`, '');
                    }
                    else {
                        lines.push(`### ${relativePath}`, '', '```text', content.toString('utf8').trimEnd(), '```', '');
                    }
                }
                catch (error) {
                    lines.push(`### ${relativePath}`, '', `(could not read file: ${error?.message || error})`, '');
                }
            }
        }
        await this.fileService.writeFile(packagePath, `${lines.join('\n').trimEnd()}\n`);
        return { path: relativePackagePath, gitHead: headCommit || null };
    }
    // This section is written to disk *and* handed to a review subagent, so an
    // unbounded diff is a context and memory blowup, not just a big file.
    // spawnSync's 1 MB maxBuffer used to bound it by accident (an oversized
    // diff came back ENOBUFS and the section collapsed to "(none or
    // unavailable)"); async spawn removed that bound. Cap it explicitly, at the
    // same limit the untracked-file section directly below already applies, and
    // say plainly what was dropped instead of silently emitting nothing.
    renderReviewPackageDiff(diff) {
        if (!diff?.ok || !diff.stdout.trim())
            return '(none or unavailable)';
        const text = diff.stdout.trimEnd();
        const totalBytes = Buffer.byteLength(text, 'utf8');
        // F25: `runGit` now stops accumulating at GIT_OUTPUT_LIMIT_BYTES, so a
        // diff that hit that ceiling is already short of the real total. Say
        // "at least" rather than quoting a byte count that is a floor as if it
        // were exact.
        const atLeast = diff.stdoutTruncated ? 'at least ' : '';
        if (totalBytes <= exports.REVIEW_PACKAGE_DIFF_LIMIT_BYTES) {
            return diff.stdoutTruncated
                ? [
                    text,
                    '',
                    `(diff truncated: git output exceeded the ${exports.GIT_OUTPUT_LIMIT_BYTES}-byte per-command limit. `
                        + 'Read the target files directly to review the rest.)',
                ].join('\n')
                : text;
        }
        const head = Buffer.from(text, 'utf8')
            .subarray(0, exports.REVIEW_PACKAGE_DIFF_LIMIT_BYTES)
            .toString('utf8');
        // Drop the trailing partial line: it can end mid-hunk or mid-codepoint.
        const lastBreak = head.lastIndexOf('\n');
        const kept = lastBreak > 0 ? head.slice(0, lastBreak) : '';
        const keptBytes = Buffer.byteLength(kept, 'utf8');
        return [
            kept,
            '',
            `(diff truncated: ${atLeast}${totalBytes} bytes exceeds ${exports.REVIEW_PACKAGE_DIFF_LIMIT_BYTES}-byte review limit; `
                + `${atLeast}${totalBytes - keptBytes} bytes omitted. Read the target files directly to review the rest.)`,
        ].join('\n');
    }
    getUpstreamRegressionTasks(task, tasks) {
        const taskById = new Map(tasks.map(candidate => [candidate.id, candidate]));
        return tasks.filter(candidate => candidate.id !== task.id
            && this.taskTransitivelyDependsOn(task, candidate.id, taskById)
            && candidate.targetFiles.some(upstreamPath => task.targetFiles.some(targetPath => (taskPathsOverlap(normalizeTaskPath(upstreamPath), normalizeTaskPath(targetPath))))));
    }
    taskTransitivelyDependsOn(task, dependencyId, taskById, visited = new Set()) {
        if (task.dependsOn.includes(dependencyId))
            return true;
        if (visited.has(task.id))
            return false;
        visited.add(task.id);
        return task.dependsOn.some(parentId => {
            const parent = taskById.get(parentId);
            return parent ? this.taskTransitivelyDependsOn(parent, dependencyId, taskById, visited) : false;
        });
    }
    async canCarryTaskReviewForwardAfterDownstreamWork(changePath, taskId, reviewDispatch, currentSnapshots, reviewedAtMs) {
        const previousByPath = new Map(reviewDispatch.targetSnapshots.map(snapshot => [normalizeTaskPath(snapshot.path), snapshot]));
        const currentByPath = new Map(currentSnapshots.map(snapshot => [normalizeTaskPath(snapshot.path), snapshot]));
        const changedPaths = new Set();
        for (const targetPath of new Set([...previousByPath.keys(), ...currentByPath.keys()])) {
            const previous = previousByPath.get(targetPath);
            const current = currentByPath.get(targetPath);
            if (!previous || !current
                || previous.exists !== current.exists
                || previous.contentHash !== current.contentHash) {
                changedPaths.add(targetPath);
            }
        }
        if (changedPaths.size === 0)
            return { allowed: false, reason: 'no target-file content drift was detected' };
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graph = await this.fileService.readJSON(graphPath);
        const tasks = Array.isArray(graph.tasks) ? graph.tasks.map((raw, index) => normalizeTask(raw, index)) : [];
        const taskById = new Map(tasks.map(candidate => [candidate.id, candidate]));
        const downstreamTasks = tasks.filter(candidate => candidate.id !== taskId
            && TERMINAL_TASK_STATUSES.has(candidate.status)
            && this.taskTransitivelyDependsOn(candidate, taskId, taskById));
        if (downstreamTasks.length === 0)
            return { allowed: false, reason: 'no transitive downstream task owns the reviewed task' };
        const session = await this.readSession(this.getSessionPath(changePath), String(graph.feature || path.basename(changePath)));
        const completedDownstreamIds = new Set(session.dispatches
            .filter(dispatch => downstreamTasks.some(task => task.id === dispatch.taskId)
            && (dispatch.status === 'DONE' || dispatch.status === 'DONE_WITH_CONCERNS')
            && Number.isFinite(Date.parse(String(dispatch.completedAt || '')))
            && Date.parse(String(dispatch.completedAt)) >= reviewedAtMs)
            .map(dispatch => dispatch.taskId));
        if (completedDownstreamIds.size === 0) {
            return { allowed: false, reason: 'no completed downstream dispatch postdates the review' };
        }
        const downstreamTargets = downstreamTasks
            .filter(task => completedDownstreamIds.has(task.id))
            .flatMap(task => task.targetFiles.map(normalizeTaskPath));
        const uncovered = [...changedPaths].filter(changedPath => !downstreamTargets.some(targetPath => (taskPathsOverlap(changedPath, targetPath))));
        return uncovered.length === 0
            ? { allowed: true, reason: 'all drift is owned by completed downstream tasks' }
            : { allowed: false, reason: `downstream task targets do not cover: ${uncovered.join(', ')}` };
    }
    renderGitStatusEntries(entries, limit = 100) {
        if (entries.length === 0)
            return ['- None'];
        const rendered = entries.slice(0, limit).map(entry => `- ${entry.code} ${entry.file}`);
        if (entries.length > limit)
            rendered.push(`- ... ${entries.length - limit} additional entries omitted`);
        return rendered;
    }
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
    async ingestReviewUsageSidecars(changePath, feature) {
        const descriptors = [{ directory: REVIEW_DISPATCHES_DIR, documentReview: false }];
        const metrics = [];
        const ingested = await this.readUsageIngestWatermark(changePath);
        for (const descriptor of descriptors) {
            const directoryPath = path.join(changePath, 'artifacts', 'agents', descriptor.directory);
            if (!(await this.fileService.exists(directoryPath)))
                continue;
            const entries = (await fs_1.promises.readdir(directoryPath, { withFileTypes: true }))
                .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
                .sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
                const id = entry.name.slice(0, -'.json'.length).trim();
                if (!id)
                    continue;
                const usagePath = path.join(changePath, 'artifacts', 'agents', USAGE_SIDECARS_DIR, `${id}.json`);
                const usageStat = await fs_1.promises.stat(usagePath).catch(() => null);
                if (!usageStat)
                    continue;
                const recordedAt = usageStat.mtime.toISOString();
                if (ingested.get(id) === recordedAt)
                    continue;
                let record;
                try {
                    record = await this.fileService.readJSON(path.join(directoryPath, entry.name));
                }
                catch {
                    continue;
                }
                // The filename is the id by construction, but a hand-edited or
                // renamed record must not be attributed to the wrong dispatch.
                if (String(record?.id || '').trim() !== id)
                    continue;
                const usage = await this.readExecutionUsageFile(usagePath);
                ingested.set(id, recordedAt);
                metrics.push({
                    kind: 'usage',
                    id,
                    taskId: typeof record.taskId === 'string' ? record.taskId : null,
                    path: null,
                    recordedAt,
                    durationMs: usage.elapsedMs,
                    usage,
                    capabilityTier: record.workerProfile?.capabilityTier || 'unknown',
                    modelProfile: record.workerProfile?.modelProfile || null,
                    model: record.workerProfile?.model || null,
                    workflowStage: descriptor.documentReview
                        ? 'document_review'
                        : record.taskId
                            ? 'task_review'
                            : 'final_review',
                });
            }
        }
        if (metrics.length > 0) {
            await this.recordExecutionMetric(changePath, feature, metrics);
            await this.writeUsageIngestWatermark(changePath, ingested);
        }
    }
    getUsageIngestWatermarkPath(changePath) {
        return path.join(changePath, 'artifacts', 'loop', USAGE_INGEST_WATERMARK_FILE);
    }
    async readUsageIngestWatermark(changePath) {
        const ingested = new Map();
        try {
            const raw = JSON.parse(await fs_1.promises.readFile(this.getUsageIngestWatermarkPath(changePath), 'utf8'));
            if (raw?.version === USAGE_INGEST_WATERMARK_VERSION
                && raw.ingested
                && typeof raw.ingested === 'object'
                && !Array.isArray(raw.ingested)) {
                for (const [id, recordedAt] of Object.entries(raw.ingested)) {
                    if (typeof recordedAt === 'string')
                        ingested.set(id, recordedAt);
                }
                return ingested;
            }
        }
        catch {
            ingested.clear();
        }
        // No usable watermark: the execution metrics artifact is the durable
        // record of what has already been ingested, so rebuild from it.
        const metricsPath = path.join(changePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE);
        if (await this.fileService.exists(metricsPath)) {
            try {
                const artifact = await this.fileService.readJSON(metricsPath);
                for (const entry of Array.isArray(artifact?.entries) ? artifact.entries : []) {
                    if (entry.kind === 'usage')
                        ingested.set(entry.id, entry.recordedAt);
                }
            }
            catch {
                ingested.clear();
            }
        }
        return ingested;
    }
    async writeUsageIngestWatermark(changePath, ingested) {
        try {
            const watermarkPath = this.getUsageIngestWatermarkPath(changePath);
            await fs_1.promises.mkdir(path.dirname(watermarkPath), { recursive: true });
            await this.fileService.writeJSON(watermarkPath, {
                version: USAGE_INGEST_WATERMARK_VERSION,
                updatedAt: new Date().toISOString(),
                ingested: Object.fromEntries([...ingested].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))),
            });
        }
        catch {
            // Losing the watermark costs one slow pass, never a lost metric.
        }
    }
    async readExecutionUsageFile(usageFile) {
        const resolvedPath = path.resolve(String(usageFile || '').trim());
        if (!usageFile || !(await this.fileService.exists(resolvedPath))) {
            throw new Error(`Usage file not found: ${resolvedPath}`);
        }
        let raw;
        try {
            raw = await this.fileService.readJSON(resolvedPath);
        }
        catch {
            throw new Error(`Usage file must contain valid JSON: ${resolvedPath}`);
        }
        const usage = raw?.usage && typeof raw.usage === 'object'
            ? { ...raw, ...raw.usage }
            : raw;
        if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
            throw new Error('Usage file must contain an object or a top-level usage object.');
        }
        const readMetric = (names, nested) => {
            for (const name of names) {
                if (Object.prototype.hasOwnProperty.call(usage, name)) {
                    const value = Number(usage[name]);
                    if (!Number.isFinite(value) || value < 0) {
                        throw new Error(`Usage metric ${name} must be a non-negative number.`);
                    }
                    return { value: Math.floor(value), found: true };
                }
            }
            if (nested !== undefined) {
                const value = Number(nested);
                if (!Number.isFinite(value) || value < 0) {
                    throw new Error('Nested usage metric must be a non-negative number.');
                }
                return { value: Math.floor(value), found: true };
            }
            return { value: null, found: false };
        };
        const input = readMetric(['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens']);
        const cached = readMetric(['cached_input_tokens', 'cachedInputTokens', 'cache_read_input_tokens'], usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens);
        const output = readMetric(['output_tokens', 'outputTokens', 'completion_tokens', 'completionTokens']);
        const reasoning = readMetric(['reasoning_tokens', 'reasoningTokens'], usage.output_tokens_details?.reasoning_tokens ?? usage.completion_tokens_details?.reasoning_tokens);
        const toolCalls = readMetric(['tool_calls', 'toolCalls']);
        const turns = readMetric(['turns', 'turn_count', 'turnCount']);
        const elapsed = readMetric(['elapsed_ms', 'elapsedMs', 'duration_ms', 'durationMs']);
        if (![input, cached, output, reasoning, toolCalls, turns, elapsed].some(metric => metric.found)) {
            throw new Error('Usage file does not contain any supported usage metrics.');
        }
        const observedFields = [
            input.found ? 'inputTokens' : null,
            cached.found ? 'cachedInputTokens' : null,
            output.found ? 'outputTokens' : null,
            reasoning.found ? 'reasoningTokens' : null,
            toolCalls.found ? 'toolCalls' : null,
            turns.found ? 'turns' : null,
            elapsed.found ? 'elapsedMs' : null,
        ].filter((field) => field !== null);
        return {
            inputTokens: input.value,
            cachedInputTokens: cached.value,
            outputTokens: output.value,
            reasoningTokens: reasoning.value,
            toolCalls: toolCalls.value,
            turns: turns.value,
            elapsedMs: elapsed.value,
            observedFields,
            source: String(raw?.source || raw?.provider || usage?.source || usage?.provider || 'usage-file'),
            coverage: observedFields.length === 7 ? 'complete' : 'partial',
        };
    }
    async captureDocumentationSnapshots(projectRoot, documentPaths) {
        const snapshots = [];
        for (const rawPath of documentPaths) {
            const documentPath = String(rawPath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
            if (!documentPath)
                continue;
            const absolutePath = path.resolve(projectRoot, ...documentPath.split('/'));
            const relative = path.relative(projectRoot, absolutePath);
            if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
                snapshots.push({ path: documentPath, exists: false, contentHash: null });
                continue;
            }
            if (!(await this.fileService.exists(absolutePath))) {
                snapshots.push({ path: documentPath, exists: false, contentHash: null });
                continue;
            }
            const content = await this.fileService.readFile(absolutePath);
            snapshots.push({
                path: documentPath,
                exists: true,
                contentHash: this.hashMeaningfulDocumentation(content),
            });
        }
        return snapshots;
    }
    normalizeTargetFiles(targetFiles) {
        return Array.from(new Set(targetFiles
            .map(filePath => String(filePath || '').trim().replace(/\\/g, '/').replace(/^\.\//, ''))
            .filter(filePath => filePath.length > 0
            && !path.posix.isAbsolute(filePath)
            && filePath !== '..'
            && !filePath.startsWith('../')
            && !filePath.includes('/../'))))
            .sort();
    }
    async captureTargetSnapshots(projectRoot, targetFiles, collectContents) {
        const snapshots = [];
        const canonicalProjectRoot = await fs_1.promises.realpath(projectRoot).catch(() => path.resolve(projectRoot));
        for (const targetPath of this.normalizeTargetFiles(targetFiles)) {
            const absolutePath = path.resolve(projectRoot, ...targetPath.split('/'));
            const relative = path.relative(projectRoot, absolutePath);
            if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
                snapshots.push({ path: targetPath, exists: false, contentHash: null, kind: 'missing' });
                continue;
            }
            try {
                const stat = await fs_1.promises.lstat(absolutePath);
                if (stat.isSymbolicLink()) {
                    throw new Error(`Task review target may not be a symbolic link or junction (${targetPath}).`);
                }
                const canonicalTarget = await fs_1.promises.realpath(absolutePath);
                if (!this.isPathWithin(canonicalProjectRoot, canonicalTarget)) {
                    throw new Error(`Task review target resolves outside the project root (${targetPath}).`);
                }
                if (stat.isFile()) {
                    const content = await fs_1.promises.readFile(absolutePath);
                    collectContents?.set(path.resolve(absolutePath), content);
                    snapshots.push({
                        path: targetPath,
                        exists: true,
                        contentHash: (0, crypto_1.createHash)('sha256').update(content).digest('hex'),
                        kind: 'file',
                    });
                    continue;
                }
                if (stat.isDirectory()) {
                    const tree = await this.captureTargetDirectoryTree(canonicalProjectRoot, absolutePath, targetPath);
                    snapshots.push({
                        path: targetPath,
                        exists: true,
                        contentHash: tree.contentHash,
                        kind: 'directory',
                        entryCount: tree.entryCount,
                    });
                    continue;
                }
                throw new Error(`Task review target has an unsupported filesystem type (${targetPath}).`);
            }
            catch (error) {
                if (error?.code === 'ENOENT') {
                    snapshots.push({ path: targetPath, exists: false, contentHash: null, kind: 'missing' });
                    continue;
                }
                throw error;
            }
        }
        return snapshots;
    }
    async captureTargetDirectoryTree(canonicalProjectRoot, directory, targetPath) {
        const entries = [];
        const visit = async (current, relativeDirectory) => {
            const children = await fs_1.promises.readdir(current, { withFileTypes: true });
            children.sort((left, right) => left.name.localeCompare(right.name));
            if (children.length === 0 && relativeDirectory) {
                entries.push({ path: relativeDirectory.replace(/\\/g, '/'), kind: 'directory', contentHash: null });
            }
            for (const child of children) {
                const childPath = path.join(current, child.name);
                const relativePath = path.join(relativeDirectory, child.name).replace(/\\/g, '/');
                const stat = await fs_1.promises.lstat(childPath);
                if (stat.isSymbolicLink()) {
                    throw new Error(`Task review directory target contains a symbolic link or junction (${targetPath}/${relativePath}).`);
                }
                const canonicalChild = await fs_1.promises.realpath(childPath);
                if (!this.isPathWithin(canonicalProjectRoot, canonicalChild)) {
                    throw new Error(`Task review directory target escapes the project root (${targetPath}/${relativePath}).`);
                }
                if (stat.isDirectory()) {
                    entries.push({ path: relativePath, kind: 'directory', contentHash: null });
                    await visit(childPath, relativePath);
                    continue;
                }
                if (!stat.isFile()) {
                    throw new Error(`Task review directory target contains an unsupported filesystem entry (${targetPath}/${relativePath}).`);
                }
                const content = await fs_1.promises.readFile(childPath);
                entries.push({
                    path: relativePath,
                    kind: 'file',
                    contentHash: (0, crypto_1.createHash)('sha256').update(content).digest('hex'),
                });
            }
        };
        await visit(directory, '');
        return {
            contentHash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(entries), 'utf8').digest('hex'),
            entryCount: entries.length,
        };
    }
    isPathWithin(root, candidate) {
        const relative = path.relative(root, candidate);
        return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    }
    /**
     * Planning-review snapshots must only change when the planning *semantics*
     * change. Execution bookkeeping — task status, review decisions, checklist
     * ticks, governance-generated repair tasks — mutates tasks.md and
     * task-graph.json on every loop step; hashing it raw invalidates the
     * planning approval mid-goal and re-dispatches full planning reviews.
     */
    async capturePlanningSemanticSnapshots(projectRoot, targetFiles) {
        /*
         * The semantic hash is derived from the SAME buffer the raw pass read.
         * It used to re-read each target here, which both cost a second read of
         * every target file and let the two passes see two different revisions
         * of it.
         */
        const collected = new Map();
        const raw = await this.captureTargetSnapshots(projectRoot, targetFiles, collected);
        const snapshots = [];
        for (const snapshot of raw) {
            if (!snapshot.exists || snapshot.kind !== 'file') {
                snapshots.push(snapshot);
                continue;
            }
            const absolutePath = path.resolve(projectRoot, ...snapshot.path.split('/'));
            const buffered = collected.get(absolutePath);
            const content = buffered ? buffered.toString('utf8') : await this.fileService.readFile(absolutePath);
            snapshots.push({
                ...snapshot,
                contentHash: this.hashPlanningSemanticContent(snapshot.path, content),
            });
        }
        return snapshots;
    }
    hashPlanningSemanticContent(targetPath, content) {
        const normalizedPath = targetPath.replace(/\\/g, '/').toLowerCase();
        if (normalizedPath.endsWith('.json')) {
            try {
                const rawGraph = JSON.parse(content.replace(/^\uFEFF/, ''));
                return (0, crypto_1.createHash)('sha256')
                    .update(this.canonicalJson(this.projectPlanningGraphSemantics(rawGraph)), 'utf8')
                    .digest('hex');
            }
            catch {
                return this.hashMeaningfulDocumentation(content);
            }
        }
        if (normalizedPath.endsWith(`/${constants_1.FILE_NAMES.TASKS}`.toLowerCase()) || normalizedPath === constants_1.FILE_NAMES.TASKS.toLowerCase()) {
            // tasks.md is fully derived from task graph state. Its churn — checklist
            // ticks, repair-wave lines, closeout checklists — is execution progress,
            // not planning content, so it contributes a constant to the snapshot and
            // can never invalidate a planning approval. It remains a valid
            // repair-scope target; semantic task changes surface via the task graph.
            return (0, crypto_1.createHash)('sha256').update('ospec:planning:derived:tasks.md', 'utf8').digest('hex');
        }
        return this.hashMeaningfulDocumentation(content);
    }
    projectPlanningGraphSemantics(rawGraph) {
        if (!rawGraph || typeof rawGraph !== 'object' || Array.isArray(rawGraph))
            return rawGraph;
        const { status: _graphStatus, ...graphRest } = rawGraph;
        const tasks = Array.isArray(rawGraph.tasks)
            ? rawGraph.tasks
                .filter((task) => !String(task?.id || '').startsWith('repair-final-'))
                .map((task) => {
                if (!task || typeof task !== 'object' || Array.isArray(task))
                    return task;
                const { status: _status, review: _review, ...taskRest } = task;
                return taskRest;
            })
            : rawGraph.tasks;
        return { ...graphRest, tasks };
    }
    hashTargetSnapshots(snapshots) {
        const versioned = snapshots.some(snapshot => Boolean(snapshot.kind));
        const normalized = [...snapshots]
            .map(snapshot => versioned
            ? {
                path: String(snapshot.path || '').replace(/\\/g, '/'),
                exists: snapshot.exists === true,
                contentHash: snapshot.contentHash || null,
                kind: snapshot.kind || (snapshot.exists ? 'file' : 'missing'),
                entryCount: snapshot.kind === 'directory' ? Math.max(0, Number(snapshot.entryCount) || 0) : null,
            }
            : {
                path: String(snapshot.path || '').replace(/\\/g, '/'),
                exists: snapshot.exists === true,
                contentHash: snapshot.contentHash || null,
            })
            .sort((left, right) => left.path.localeCompare(right.path));
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(normalized), 'utf8').digest('hex');
    }
    targetSnapshotsMatchDispatch(currentSnapshots, dispatchSnapshots, dispatchHash) {
        if (dispatchSnapshots.some(snapshot => Boolean(snapshot.kind))) {
            return this.hashTargetSnapshots(currentSnapshots) === dispatchHash;
        }
        if (currentSnapshots.some(snapshot => snapshot.kind === 'directory'))
            return false;
        const legacyProjection = currentSnapshots.map(snapshot => ({
            path: snapshot.path,
            exists: snapshot.kind === 'file',
            contentHash: snapshot.kind === 'file' ? snapshot.contentHash : null,
        }));
        return this.hashTargetSnapshots(legacyProjection) === dispatchHash;
    }
    async prepareReviewArtifactForDispatch(changePath, record) {
        const reviewArtifactPath = path.join(changePath, record.reviewArtifactPath);
        const review = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewArtifactPath));
        const data = {
            ...review.data,
            status: 'pending',
            decision: 'PENDING',
            reviewer_role: record.reviewerRole,
            review_dispatch_id: record.id,
            target_snapshot_hash: record.targetSnapshotHash,
            reviewed_at: null,
            loop_action_id: record.loopActionId || null,
            loop_action_item_id: record.loopActionItemId || null,
            controller_session_reported_at: record.controllerSessionReportedAt || null,
            reviewer_executor_id: record.reviewerExecutorId || null,
            reviewer_claimed_at: record.reviewerClaimedAt || null,
            reviewer_completed_at: record.reviewerCompletedAt || null,
            reviewer_succeeded: record.reviewerSucceeded,
        };
        await this.fileService.writeFile(reviewArtifactPath, (0, helpers_1.stringifyFrontmatter)(review.content, data));
        await this.fileService.remove(reviewArtifactPath.replace(/\.md$/i, '.findings.json'));
    }
    async captureDocumentationEvidence(projectRoot, baseline) {
        const current = await this.captureDocumentationSnapshots(projectRoot, baseline.map(item => item.path));
        const currentByPath = new Map(current.map(item => [item.path.toLowerCase(), item]));
        return baseline.map(item => {
            const completed = currentByPath.get(item.path.toLowerCase()) || {
                path: item.path,
                exists: false,
                contentHash: null,
            };
            return {
                ...completed,
                baselineExists: item.exists,
                baselineContentHash: item.contentHash,
                meaningfullyChanged: completed.exists !== item.exists
                    || (completed.exists
                        && item.exists
                        && completed.contentHash !== item.contentHash),
            };
        });
    }
    hashMeaningfulDocumentation(content) {
        const normalized = String(content || '')
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return (0, crypto_1.createHash)('sha256').update(normalized, 'utf8').digest('hex');
    }
    async recordExecutionMetric(changePath, feature, entries) {
        if (entries.length === 0)
            return;
        const metricsPath = path.join(changePath, 'artifacts', 'agents', EXECUTION_METRICS_FILE);
        const nextEntries = await Promise.all(entries.map(async (entry) => {
            let bytes = 0;
            if (entry.path) {
                try {
                    bytes = (await fs_1.promises.stat(path.join(changePath, entry.path))).size;
                }
                catch {
                    bytes = 0;
                }
            }
            return { ...entry, bytes };
        }));
        const updatedAt = nextEntries
            .map(entry => entry.recordedAt)
            .sort((left, right) => left.localeCompare(right))
            .at(-1);
        let artifact = {
            version: '1.1',
            feature,
            updatedAt,
            totalBytes: 0,
            totalUsage: emptyExecutionUsage(),
            usageByCapabilityTier: {},
            usageByStage: {},
            usageByModelProfile: {},
            usageCoverage: { expectedRuns: 0, recordedRuns: 0, completeRuns: 0, partialRuns: 0, missingRuns: 0 },
            entries: [],
        };
        if (await this.fileService.exists(metricsPath)) {
            try {
                const existing = await this.fileService.readJSON(metricsPath);
                artifact = {
                    version: '1.1',
                    feature: typeof existing.feature === 'string' ? existing.feature : feature,
                    updatedAt,
                    totalBytes: 0,
                    totalUsage: emptyExecutionUsage(),
                    usageByCapabilityTier: {},
                    usageByStage: {},
                    usageByModelProfile: {},
                    usageCoverage: { expectedRuns: 0, recordedRuns: 0, completeRuns: 0, partialRuns: 0, missingRuns: 0 },
                    entries: Array.isArray(existing.entries) ? existing.entries : [],
                };
            }
            catch {
                // Replace a damaged metrics file; metrics must not block execution.
            }
        }
        for (const nextEntry of nextEntries) {
            artifact.entries = artifact.entries
                .filter(item => !(item.kind === nextEntry.kind && item.id === nextEntry.id))
                .concat(nextEntry);
        }
        artifact.entries.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
        artifact.totalBytes = artifact.entries.reduce((total, item) => total + item.bytes, 0);
        artifact.totalUsage = emptyExecutionUsage();
        artifact.usageByCapabilityTier = {};
        artifact.usageByStage = {};
        artifact.usageByModelProfile = {};
        for (const entry of artifact.entries) {
            if (!entry.usage)
                continue;
            artifact.totalUsage = addExecutionUsage(artifact.totalUsage, entry.usage);
            const capability = entry.capabilityTier || 'unknown';
            artifact.usageByCapabilityTier[capability] = addExecutionUsage(artifact.usageByCapabilityTier[capability] || emptyExecutionUsage(), entry.usage);
            const stage = entry.workflowStage || 'implementation';
            artifact.usageByStage[stage] = addExecutionUsage(artifact.usageByStage[stage] || emptyExecutionUsage(), entry.usage);
            const modelProfile = entry.modelProfile || 'unknown';
            artifact.usageByModelProfile[modelProfile] = addExecutionUsage(artifact.usageByModelProfile[modelProfile] || emptyExecutionUsage(), entry.usage);
        }
        const expectedIds = new Set(artifact.entries
            .filter(entry => entry.kind === 'completion'
            || entry.kind === 'review_run'
            || (entry.kind === 'review_packet' && entry.usageExpected !== false))
            .map(entry => entry.id));
        const usageEntries = artifact.entries.filter(entry => entry.kind === 'usage' && entry.usage);
        const recordedIds = new Set(usageEntries.map(entry => entry.id));
        artifact.usageCoverage = {
            expectedRuns: expectedIds.size,
            recordedRuns: [...expectedIds].filter(id => recordedIds.has(id)).length,
            completeRuns: usageEntries.filter(entry => entry.usage?.coverage === 'complete').length,
            partialRuns: usageEntries.filter(entry => entry.usage?.coverage === 'partial').length,
            missingRuns: [...expectedIds].filter(id => !recordedIds.has(id)).length,
        };
        artifact.updatedAt = artifact.entries
            .map(entry => entry.recordedAt)
            .sort((left, right) => left.localeCompare(right))
            .at(-1) || updatedAt;
        await this.fileService.writeJSON(metricsPath, artifact);
    }
    // -----------------------------------------------------------------------
    // Evidence-validation scope
    // -----------------------------------------------------------------------
    /**
     * Runs `operation` with one resolved git HEAD. Callers that validate many
     * pieces of evidence in a row -- a controller tick, `ospec execute status`,
     * the archive gate -- should wrap the whole sweep so HEAD is resolved once
     * for all of them instead of once each.
     *
     * Nested calls join the outer scope, so wrapping is always safe.
     */
    async withValidationScope(operation) {
        if (validationScopeStorage.getStore())
            return operation();
        const scope = { gitHeads: new Map() };
        return validationScopeStorage.run(scope, operation);
    }
    /**
     * The single read primitive every validation input goes through.
     *
     * Returns null for a path that is absent -- including one whose parent is
     * not a directory, which `readFile` reports as ENOTDIR -- so a caller can
     * tell "missing" from "unreadable" without a separate stat. A directory
     * still surfaces as the EISDIR the caller would have got anyway.
     */
    async readValidationInput(absolutePath) {
        try {
            return await fs_1.promises.readFile(path.resolve(absolutePath));
        }
        catch (error) {
            if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR')
                return null;
            throw error;
        }
    }
    /**
     * Matches `FileService.readJSON`'s failure message exactly, so routing a
     * validation input through these helpers does not change the reason string
     * a refusal carries.
     */
    parseValidationInputJSON(text, filePath) {
        try {
            return JSON.parse(text.replace(/^﻿/, ''));
        }
        catch {
            throw new Error(`Failed to parse JSON: ${filePath}`);
        }
    }
    async readValidationInputText(absolutePath) {
        const content = await this.readValidationInput(absolutePath);
        return content === null ? null : content.toString('utf8');
    }
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
    async readValidationGitHead(projectRoot, use) {
        const resolvedRoot = path.resolve(projectRoot);
        if (use === 'refusal-condition') {
            return await this.readGitOutput(resolvedRoot, ['rev-parse', 'HEAD']) || null;
        }
        const scope = validationScopeStorage.getStore();
        if (!scope)
            return await this.readGitOutput(resolvedRoot, ['rev-parse', 'HEAD']) || null;
        const existing = scope.gitHeads.get(resolvedRoot);
        if (existing)
            return existing;
        const pending = this.readGitOutput(resolvedRoot, ['rev-parse', 'HEAD'])
            .then(output => output || null)
            .catch(() => null);
        scope.gitHeads.set(resolvedRoot, pending);
        return pending;
    }
    forgetMemoisedGitHeads() {
        validationScopeStorage.getStore()?.gitHeads.clear();
    }
    async withTaskGraphMutationLease(changePath, operation) {
        const resolvedChangePath = path.resolve(changePath);
        const lockPath = path.join(resolvedChangePath, 'artifacts', 'agents', TASK_GRAPH_MUTATION_LOCK_FILE);
        await fs_1.promises.mkdir(path.dirname(lockPath), { recursive: true });
        const startedAt = Date.now();
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
        let handle = null;
        // One steal attempt per acquisition. If the confirmation below says the
        // holder is alive, waiting out this acquisition and letting the caller
        // retry is always safer than trying again a few milliseconds later.
        let stealAttempted = false;
        while (!handle) {
            try {
                const candidate = await fs_1.promises.open(lockPath, 'wx');
                try {
                    await candidate.writeFile(JSON.stringify({
                        version: 2,
                        pid: process.pid,
                        acquiredAt: new Date().toISOString(),
                        nonce,
                        heartbeat: true,
                    }));
                    handle = candidate;
                }
                catch (error) {
                    await candidate.close().catch(() => undefined);
                    await this.removeTaskGraphLockIfOwned(lockPath, nonce);
                    throw error;
                }
            }
            catch (error) {
                if (error?.code !== 'EEXIST')
                    throw error;
                const owner = await this.readTaskGraphLockOwner(lockPath);
                const stat = await fs_1.promises.stat(lockPath).catch(() => null);
                const lockAgeMs = stat ? Date.now() - stat.mtimeMs : 0;
                if (!stealAttempted
                    && stat
                    && (lockAgeMs >= STALE_TASK_GRAPH_MUTATION_LOCK_MS || lockAgeMs <= -STALE_TASK_GRAPH_MUTATION_LOCK_MS)
                    && (owner ? (!this.isProcessAlive(owner.pid) || owner.heartbeat) : true)) {
                    stealAttempted = true;
                    // Age alone is not evidence of death: a holder blocked in a
                    // long call looks identical to a crashed one until you look
                    // twice. Only a lock whose mtime is still frozen after the
                    // recheck window is genuinely abandoned.
                    if (await this.confirmTaskGraphLockStillStale(lockPath, stat)
                        && (owner
                            ? await this.removeTaskGraphLockIfOwned(lockPath, owner.nonce)
                            : await this.removeCorruptTaskGraphLockIfUnchanged(lockPath, stat))) {
                        continue;
                    }
                }
                if (Date.now() - startedAt >= TASK_GRAPH_MUTATION_LOCK_TIMEOUT_MS) {
                    throw new Error(`Timed out waiting for task graph mutation lease at ${lockPath}.`);
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        const lease = registerHeldLease(lockPath, nonce);
        const heartbeat = setInterval(() => {
            // A wedged operation stops refreshing: keeping the mtime moving
            // while nothing can progress is what makes a stuck lock immortal.
            if (isHeldLeaseWedged(lease))
                return;
            void this.refreshTaskGraphLockIfOwned(lockPath, nonce);
        }, TASK_GRAPH_MUTATION_LOCK_HEARTBEAT_MS);
        heartbeat.unref();
        try {
            // The lease is the boundary at which the task graph and the review
            // artifacts may change. Entering the validation scope here means
            // one command's worth of validations share one resolved HEAD.
            return await this.withValidationScope(() => runWithHeldLease(lease, () => operation()));
        }
        finally {
            releaseHeldLease(lease);
            clearInterval(heartbeat);
            await handle.close().catch(() => undefined);
            await this.removeTaskGraphLockIfOwned(lockPath, nonce);
        }
    }
    // A holder that is merely slow refreshes the mtime within a heartbeat; a
    // dead one never does. Waiting one recheck window and re-stating is what
    // separates the two, and it is cheap next to corrupting a task graph.
    async confirmTaskGraphLockStillStale(lockPath, observed) {
        await new Promise(resolve => setTimeout(resolve, exports.STALE_LOCK_STEAL_RECHECK_MS));
        const current = await fs_1.promises.stat(lockPath).catch(() => null);
        // Gone already, or moving again: either way this is not ours to delete.
        return current !== null && current.mtimeMs === observed.mtimeMs;
    }
    async readTaskGraphLockOwner(lockPath) {
        try {
            const value = JSON.parse(await fs_1.promises.readFile(lockPath, 'utf8'));
            return Number.isInteger(value?.pid) && value.pid > 0 && typeof value?.nonce === 'string' && value.nonce.length > 0
                ? { pid: value.pid, nonce: value.nonce, heartbeat: value?.version === 2 && value?.heartbeat === true }
                : null;
        }
        catch {
            return null;
        }
    }
    async refreshTaskGraphLockIfOwned(lockPath, nonce) {
        const owner = await this.readTaskGraphLockOwner(lockPath);
        if (owner?.nonce !== nonce)
            return;
        const now = new Date();
        await fs_1.promises.utimes(lockPath, now, now).catch(() => undefined);
    }
    isProcessAlive(pid) {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch (error) {
            return error?.code !== 'ESRCH' && error?.code !== 'EINVAL';
        }
    }
    async removeTaskGraphLockIfOwned(lockPath, nonce) {
        const owner = await this.readTaskGraphLockOwner(lockPath);
        if (owner?.nonce !== nonce)
            return false;
        try {
            await fs_1.promises.unlink(lockPath);
            return true;
        }
        catch (error) {
            if (error?.code === 'ENOENT')
                return false;
            throw error;
        }
    }
    async removeCorruptTaskGraphLockIfUnchanged(lockPath, observed) {
        const current = await fs_1.promises.stat(lockPath).catch(() => null);
        if (!current
            || current.size !== observed.size
            || current.mtimeMs !== observed.mtimeMs
            || await this.readTaskGraphLockOwner(lockPath))
            return false;
        try {
            await fs_1.promises.unlink(lockPath);
            return true;
        }
        catch (error) {
            if (error?.code === 'ENOENT')
                return false;
            throw error;
        }
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
            projectSession: session.projectSession && typeof session.projectSession === 'object'
                ? session.projectSession
                : undefined,
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
        const previousBlocker = await this.readLatestBlockerEscalation(input.changePath, input.task.id);
        const latestRetry = await this.readLatestWorkerRetryRecord(input.changePath, input.task.id);
        const preservesDurableBlocker = input.retryable
            && latestRetry?.trigger === 'worker_status'
            && previousBlocker
            && previousBlocker.retryable !== true;
        const retryable = input.retryable && !preservesDurableBlocker;
        const escalationId = `blocker-${this.toFileSafeTimestamp(input.createdAt)}-${this.toFileSafeId(input.task.id)}`;
        const recordPath = path.join(input.changePath, 'artifacts', 'agents', BLOCKERS_DIR, `${escalationId}.json`);
        const reportPath = path.join(input.changePath, 'artifacts', 'agents', BLOCKERS_DIR, `${escalationId}.md`);
        const record = {
            id: escalationId,
            taskId: input.task.id,
            taskTitle: input.task.title,
            status: input.status,
            judgmentRequired: !retryable,
            escalationReason: retryable
                ? 'executor_failure'
                : input.status === 'NEEDS_CONTEXT' ? 'missing_context' : 'external_blocker',
            retryable,
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
            nextActions: retryable
                ? [
                    'Retry this task with a fresh executor context; the prior attempt did not produce durable task evidence.',
                    'Do not reuse the expired or failed executor identity.',
                    'If the fresh attempt returns a durable blocker, preserve it and stop automatic redispatch.',
                ]
                : input.status === 'NEEDS_CONTEXT'
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
    async readLatestWorkerRetryRecord(changePath, taskId) {
        const retriesPath = path.join(changePath, 'artifacts', 'agents', RETRIES_DIR);
        if (!(await this.fileService.exists(retriesPath)))
            return null;
        const entries = (await this.fileService.readDir(retriesPath))
            .filter(entry => entry.endsWith('.json'))
            .sort((left, right) => right.localeCompare(left));
        for (const entry of entries) {
            try {
                const record = await this.fileService.readJSON(path.join(retriesPath, entry));
                if (record.taskId === taskId)
                    return record;
            }
            catch (error) {
                throw new Error(`Worker retry history is unreadable at ${entry} (${error?.message || error}).`);
            }
        }
        return null;
    }
    async readLatestBlockerEscalation(changePath, taskId) {
        const blockersPath = path.join(changePath, 'artifacts', 'agents', BLOCKERS_DIR);
        if (!(await this.fileService.exists(blockersPath))) {
            return null;
        }
        const entries = (await this.fileService.readDir(blockersPath))
            .filter(entry => entry.endsWith('.json'))
            .sort((left, right) => left.localeCompare(right));
        for (const entry of entries.reverse()) {
            const record = await this.fileService.readJSON(path.join(blockersPath, entry));
            if (this.isBlockerEscalationRecord(record)
                && (!taskId || record.taskId === taskId)) {
                return {
                    ...record,
                    retryable: record.retryable === true,
                };
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
    // FIX-G1: `documentLanguage` is one of the two fields a read cannot recover
    // by looking around, and this one decides what language every dispatched
    // task report is written in. The old `catch { return null }` turned an
    // unreadable or damaged `.skillrc` into "no configured language", i.e. the
    // en-US fallback, silently, on a zh-CN / ja-JP / ar project. Absent
    // (`ENOENT`) still means "no configured language"; damaged does not.
    async readReportLanguageFromSkillrc(projectRoot) {
        const configPath = path.join(projectRoot, constants_1.FILE_NAMES.SKILLRC);
        if (!(await this.fileService.exists(configPath))) {
            return null;
        }
        let raw;
        try {
            raw = await this.fileService.readJSON(configPath);
        }
        catch (error) {
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, `invalid JSON (${error?.message || 'parse failed'})`);
        }
        const config = (0, ProjectLayout_1.assertProjectConfigUsable)(projectRoot, configPath, raw);
        return this.normalizeReportDocumentLanguage(config?.documentLanguage);
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
            catch { }
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
            [/^# Goal Bootstrap: /u, '# Goal 启动快照：'],
            [/^# Worker Handoff: /u, '# Worker 交接：'],
            [/^# Runtime Adapter Launch Plan: /u, '# 运行时适配器启动计划：'],
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
            [/^## User Decisions$/u, '## 用户决策'],
            [/^## Recent Dispatch Results$/u, '## 最近派发结果'],
            [/^## Active Dispatches$/u, '## 活跃派发'],
            [/^## Blockers$/u, '## 阻塞项'],
            [/^## Warnings$/u, '## 警告'],
            [/^## Next Instruction$/u, '## 下一步指令'],
            [/^## Safety Notes$/u, '## 安全说明'],
            [/^## Artifact Boundary$/u, '## Artifact 边界'],
            [/^## Changed Files$/u, '## 变更文件'],
            [/^## Goal-Owned Changes$/u, '## Goal 归属的变更'],
            [/^## Task-Generated Changes$/u, '## Task 生成的变更'],
            [/^## Update-Managed Changes$/u, '## Update 管理的变更'],
            [/^## Blocking Changes$/u, '## 阻断变更'],
            [/^## Commands$/u, '## 命令'],
            [/^## Lifecycle$/u, '## 生命周期'],
            [/^## Recommendations$/u, '## 建议'],
            [/^## Required Context$/u, '## 必需上下文'],
            [/^## Task Review Repair Context$/u, '## 任务评审修复上下文'],
            [/^## Repair Strategy Escalation$/u, '## 修复策略升级'],
            [/^### Required Repairs$/u, '### 必需修复项'],
            [/^### Repair Constraints$/u, '### 修复约束'],
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
            [/^## Readiness$/u, '## 就绪度'],
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
            'Git repository': 'Git 仓库',
            'Current branch': '当前分支',
            'Current HEAD': '当前 HEAD',
            'Current workspace dirty': '当前工作区有改动',
            'Ownership mode': '归属模式',
            'Update provenance': 'Update 来源证明',
            'Task graph': '任务图',
            'Pending required decisions': '待答必答决策',
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
            'Review decision': '评审决策',
            'Findings sidecar': 'Findings sidecar',
            'Finding IDs': 'Finding IDs',
            'Repair write scope': '修复写入范围',
            'Context captured at': '上下文捕获时间',
            'Review artifact SHA-256': '评审 artifact SHA-256',
            'Findings SHA-256': 'Findings SHA-256',
            'Repair context SHA-256': '修复上下文 SHA-256',
            'Strategy key': '策略键',
            'Stalled reason': '停滞原因',
            'Prior repair rounds': '此前修复轮次',
            'Prior repair waves': '此前修复波次',
            Severity: '严重程度',
            Category: '类别',
            Location: '位置',
            Evidence: '证据',
            'Requirement refs': '需求引用',
            'Repair scope': '修复范围',
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
            '- This command writes a bootstrap snapshot and synchronizes the active Goal `state.json` control file.': '- 此命令会写入启动快照，并同步活跃 Goal 的 `state.json` 控制文件。',
            '- It does not launch workers, sync worker status, run tests, inspect git, finalize, archive, push, merge, or edit project source files.': '- 它不会启动 worker、同步 worker 状态、运行测试、检查 git、finalize、archive、push、merge 或编辑项目源码。',
            '- Use it when starting or resuming one active Goal so the next safe action is explicit.': '- 在开始或恢复一个活跃 Goal 时使用它，让下一步安全动作保持明确。',
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
            '- This is a bounded repair of the listed findings, not a fresh implementation of the original task.': '- 这是针对所列 findings 的有边界修复，不是重新实现原始任务。',
            '- Resolve every finding ID above and cite the changed files and verification evidence in the worker report.': '- 解决上方每个 finding ID，并在 worker 报告中引用变更文件和验证证据。',
            '- Keep source edits within the repair write scope. If the scope is insufficient, stop with NEEDS_CONTEXT instead of silently broadening it.': '- 将源码编辑限制在修复写入范围内；如果范围不足，以 NEEDS_CONTEXT 停止，不要静默扩大范围。',
            '- Do not edit the review artifact or findings sidecar. A fresh independent reviewer will replace the decision after repair completion.': '- 不要编辑评审 artifact 或 findings sidecar；修复完成后由新的独立 reviewer 更新决策。',
        };
        return sentences[line] || line;
    }
    async readWorkflowExecutionPolicy(startPath) {
        const projectRoot = await this.findProjectRootForOptionalSession(startPath);
        const configPath = path.join(projectRoot, constants_1.FILE_NAMES.SKILLRC);
        let config = {};
        try {
            config = await this.fileService.readJSON(configPath);
        }
        catch {
            config = {};
        }
        const rawProfiles = config?.workflow?.model_profiles;
        const modelProfiles = {};
        if (rawProfiles && typeof rawProfiles === 'object' && !Array.isArray(rawProfiles)) {
            for (const profile of ['mechanical', 'standard', 'strong_reasoning', 'review', 'final_review']) {
                const rawProfile = rawProfiles[profile];
                if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) {
                    continue;
                }
                const targets = rawProfile.targets && typeof rawProfile.targets === 'object' && !Array.isArray(rawProfile.targets)
                    ? Object.fromEntries(Object.entries(rawProfile.targets)
                        .map(([target, model]) => [String(target).trim(), String(model || '').trim()])
                        .filter(([target, model]) => target.length > 0 && model.length > 0))
                    : {};
                const defaultModel = typeof rawProfile.default === 'string' ? rawProfile.default.trim() : '';
                modelProfiles[profile] = {
                    ...(defaultModel ? { default: defaultModel } : {}),
                    ...(Object.keys(targets).length > 0 ? { targets } : {}),
                };
            }
        }
        return {
            modelProfiles,
        };
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
    isGoalWorkspaceControlPath(file, changeRelative, projectRelative = '') {
        const normalized = String(file || '').replace(/^"|"$/g, '').replace(/\\/g, '/').replace(/^\.\//, '');
        if (!normalized)
            return false;
        if (normalized === changeRelative || normalized.startsWith(`${changeRelative}/`))
            return true;
        const candidates = [normalized];
        const projectPrefix = projectRelative && projectRelative !== '.' ? `${projectRelative}/` : '';
        if (projectPrefix && normalized.startsWith(projectPrefix)) {
            candidates.push(normalized.slice(projectPrefix.length));
        }
        return candidates.some(candidate => candidate === '.ospec/session-brief.json'
            || candidate === '.ospec/session-brief.md'
            || candidate === '.ospec/cache/SKILL.index.cache.json'
            || candidate === 'cache/SKILL.index.cache.json'
            || candidate === '.ospec/cache/.gitignore'
            || candidate === 'cache/.gitignore'
            || candidate === `.ospec/${constants_1.FILE_NAMES.UPDATE_PROVENANCE}`
            || candidate.startsWith('.ospec/brainstorms/'));
    }
    async syncFeatureStateFromBootstrap(changePath, artifact) {
        const statePath = path.join(changePath, constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(statePath)))
            return;
        const existing = await this.fileService.readJSON(statePath);
        if (existing.status === 'archived')
            return;
        const completed = new Set(Array.isArray(existing.completed) ? existing.completed : []);
        const executionStarted = artifact.execution.taskGraph.exists
            && (artifact.execution.taskGraph.completed > 0
                || artifact.execution.taskGraph.running > 0
                || artifact.execution.session.dispatchCount > 0);
        const documentReadyForProgress = (readiness) => readiness === 'ready'
            || (executionStarted && readiness === 'draft');
        if (documentReadyForProgress(artifact.documents.proposal.readiness))
            completed.add('proposal_complete');
        if (documentReadyForProgress(artifact.documents.tasks.readiness) && artifact.execution.taskGraph.exists)
            completed.add('tasks_complete');
        const graphComplete = artifact.execution.taskGraph.taskCount > 0
            && artifact.execution.taskGraph.completed === artifact.execution.taskGraph.taskCount
            && artifact.execution.taskGraph.status.toLowerCase() === 'completed';
        if (graphComplete)
            completed.add('implementation_complete');
        if (artifact.execution.evidence.verification === 'passed') {
            completed.add('tests_passed');
            completed.add('verification_passed');
        }
        const canonicalSteps = [
            'proposal_complete',
            'tasks_complete',
            'implementation_complete',
            'skill_updated',
            'index_regenerated',
            'tests_passed',
            'verification_passed',
            'archived',
        ];
        const pending = new Set([
            ...(Array.isArray(existing.pending) ? existing.pending : []),
            ...canonicalSteps,
        ]);
        for (const step of completed)
            pending.delete(step);
        let status;
        switch (artifact.status) {
            case 'needs_proposal':
                status = 'draft';
                break;
            case 'needs_design':
            case 'needs_plan':
                status = 'proposed';
                break;
            case 'needs_task_graph':
            case 'needs_decision':
                status = 'planned';
                break;
            case 'needs_review':
            case 'needs_verification':
                status = 'verifying';
                break;
            case 'ready_to_finish':
                status = 'ready_to_archive';
                break;
            default:
                status = artifact.execution.taskGraph.exists ? 'implementing' : 'planned';
                break;
        }
        let affects = Array.isArray(existing.affects) ? existing.affects : [];
        try {
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(path.join(changePath, constants_1.FILE_NAMES.PROPOSAL)));
            if (Array.isArray(proposal.data?.affects)) {
                affects = proposal.data.affects.map((item) => String(item).trim()).filter(Boolean);
            }
        }
        catch {
            // Readiness already reports malformed or missing proposal content.
        }
        const blockedBy = artifact.status === 'needs_proposal'
            ? ['missing_proposal']
            : artifact.status === 'needs_decision'
                ? ['pending_decision']
                : artifact.status === 'blocked'
                    ? ['bootstrap_blocked']
                    : [];
        const state = {
            version: typeof existing.version === 'string' ? existing.version : '1.0',
            feature: typeof existing.feature === 'string' && existing.feature.trim() ? existing.feature : artifact.feature,
            mode: existing.mode === 'lite' || existing.mode === 'standard' || existing.mode === 'full'
                ? existing.mode
                : 'full',
            workflow_profile_id: existing.workflow_profile_id || 'goal',
            status,
            current_step: artifact.status,
            affects,
            completed: [...completed],
            pending: [...pending],
            blocked_by: blockedBy,
            ...(existing.queued_at ? { queued_at: existing.queued_at } : {}),
            ...(existing.activated_at ? { activated_at: existing.activated_at } : {}),
            ...(existing.queue_source ? { queue_source: existing.queue_source } : {}),
            ...(existing.activation_source ? { activation_source: existing.activation_source } : {}),
            last_updated: new Date().toISOString(),
        };
        await this.fileService.writeJSON(statePath, state);
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
        // Same single predicate as `ospec archive` -- see
        // `isVerificationChecklistComplete` above for why these two agreeing is
        // the point.
        const uncheckedItems = (0, ChecklistScan_1.listUncheckedChecklistItems)(content);
        const checklistComplete = (0, ChecklistScan_1.hasChecklistItem)(content)
            ? uncheckedItems.length === 0
            : options.checklistRequired
                ? false
                : null;
        const hasDraftMarker = /\b(?:TBD|TODO)\b|待补充|未定|قيد التحديد/u.test(content);
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
                knowledgeIndexPath: null,
                featureCatalogPath: null,
                indexedDocumentCount: 0,
                archivedChangeCount: 0,
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
                knowledgeIndexPath: typeof artifact?.knowledge?.indexPath === 'string' ? artifact.knowledge.indexPath : null,
                featureCatalogPath: typeof artifact?.knowledge?.featureCatalogPath === 'string' ? artifact.knowledge.featureCatalogPath : null,
                indexedDocumentCount: Number.isFinite(artifact?.knowledge?.documentCount) ? artifact.knowledge.documentCount : 0,
                archivedChangeCount: Number.isFinite(artifact?.knowledge?.archivedChangeCount) ? artifact.knowledge.archivedChangeCount : 0,
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
                knowledgeIndexPath: null,
                featureCatalogPath: null,
                indexedDocumentCount: 0,
                archivedChangeCount: 0,
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
            ['specReview', path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW), false],
            ['qualityReview', path.join(changePath, 'artifacts', 'reviews', constants_1.FILE_NAMES.FINAL_REVIEW), false],
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
        const executionStarted = input.execution.taskGraph.exists
            && (input.execution.taskGraph.completed > 0
                || input.execution.taskGraph.running > 0
                || input.execution.session.dispatchCount > 0);
        const documentReadyForStage = (documentStatus) => documentStatus.readiness === 'ready'
            || (executionStarted && documentStatus.readiness === 'draft');
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
        if (!documentReadyForStage(input.documents.proposal)) {
            return {
                status: 'needs_proposal',
                blockers,
                warnings,
                nextInstruction: 'Create or complete proposal.md before design, planning, task graph, or implementation work.',
            };
        }
        if (!documentReadyForStage(input.documents.design)) {
            return {
                status: 'needs_design',
                blockers,
                warnings,
                nextInstruction: 'Draft or update design.md from proposal.md and project context before implementation planning.',
            };
        }
        if (!documentReadyForStage(input.documents.implementationPlan)) {
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
                    nextInstruction: `Run ospec execute launch ${this.quoteShellArg(relativeChangePath)} --task ${this.quoteShellArg(dispatch.taskId)} --target ${dispatch.target} to write the runtime adapter launch plan, then execute runtimeAdapter.selected.`,
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
            if (input.execution.taskGraph.blocked > 0 && input.execution.taskGraph.waitingOnly) {
                return {
                    status: 'needs_worker_completion',
                    blockers,
                    warnings,
                    nextInstruction: 'All blocked tasks are only waiting on running work or pending task review decisions; no repair action is needed. Complete the in-flight reviews/dependencies and re-check.',
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
                nextInstruction: `Run ospec loop tick ${this.quoteShellArg(relativeChangePath)} for a controller Goal, or ospec execute review outside a controller Loop, then complete artifacts/reviews/final-review.md.`,
            };
        }
        if (input.execution.reviews.spec === 'APPROVED_WITH_CONCERNS') {
            warnings.push('Combined final review was approved with concerns; review the concerns before closeout.');
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
        const gitRootResult = await this.runGit(projectRoot, ['rev-parse', '--show-toplevel']);
        const gitRoot = gitRootResult.ok ? path.resolve(gitRootResult.stdout.trim()) : null;
        // F30: a truncated list can only DROP worktrees, so the "not registered
        // as a git worktree" blocker below still fires -- but it names the wrong
        // reason, and "add --path and rerun" is the wrong advice when the entry
        // was simply cut off. The real reason is recorded alongside it.
        const worktreeRead = gitRootResult.ok
            ? await this.readGitOutputWithTruncation(projectRoot, ['worktree', 'list', '--porcelain'])
            : null;
        if (worktreeRead?.truncated) {
            blockers.push(this.gitTruncationReason('git worktree list'));
        }
        const worktrees = worktreeRead ? this.parseGitWorktrees(worktreeRead.text || '') : [];
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
    async runGitForArtifact(cwd, args) {
        const result = await this.runGit(cwd, args);
        return {
            command: this.formatGitCommand(args),
            args,
            cwd,
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            status: result.status,
            error: result.error?.message || null,
            stdoutTruncated: result.stdoutTruncated === true,
            stderrTruncated: result.stderrTruncated === true,
        };
    }
    async runGit(cwd, args, options) {
        // P0-6: this used to be spawnSync. A mutation lease is judged stale by
        // its mtime while the heartbeat that refreshes that mtime is a timer,
        // so any git call that outran the stale threshold -- `git diff
        // --unified=10` over every target file of a large task is the usual
        // culprit -- froze the heartbeat and let a second controller delete a
        // live lock and mutate the same task graph. Spawning asynchronously
        // keeps the event loop, and therefore the heartbeat, running.
        //
        // Force core.quotePath=false so git emits raw UTF-8 paths instead of
        // octal-escaped, double-quoted ones. Without this, non-ASCII (e.g. CJK)
        // paths in `git status` output are mangled by the strip-quotes /
        // backslash->slash parsers and the workspace-scope gate misattributes
        // in-scope files as out-of-scope, blocking closeout. Harmless for
        // non-path git subcommands.
        //
        // Two things spawnSync did implicitly have to be restored by hand.
        // First, stdin: spawnSync writes `input` (undefined) and then *closes*
        // the pipe, so git sees EOF at once. A default async spawn leaves an
        // open pipe nobody ever ends, so any git that reads stdin -- a
        // credential or askpass helper, a clean/smudge filter, a hook fired by
        // `worktree add` -- waits forever while the lease heartbeat keeps its
        // lock alive. `stdio[0] = 'ignore'` gives the child no writable stdin
        // and reproduces the EOF exactly. Second, a bound. That is two separate
        // bounds, and only one of them is time. A runaway git is bounded by the
        // explicit timeout below, because an unbounded git under a mutation
        // lease is a deadlock rather than a slow call; a runaway *output* is
        // bounded by GIT_OUTPUT_LIMIT_BYTES here, because maxBuffer was also
        // the only thing keeping a repository-sized `git diff` out of the heap.
        // Capping what the review package writes bounds the artifact, not the
        // memory: the accumulation itself has to stop.
        const covering = getActiveHeldLeases();
        const timeoutMs = options?.timeoutMs ?? exports.GIT_COMMAND_TIMEOUT_MS;
        // Any git command that is not provably read-only may move HEAD, so the
        // memoised HEAD is dropped rather than assumed to have survived. Cheap:
        // the next reader re-resolves it once.
        if (!HEAD_PRESERVING_GIT_SUBCOMMANDS.has(String(args[0] || '')))
            this.forgetMemoisedGitHeads();
        touchLeasesSync(covering);
        return await new Promise(resolve => {
            const child = childProcess.spawn('git', ['-c', 'core.quotePath=false', ...args], {
                cwd,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            let stdoutBytes = 0;
            let stderrBytes = 0;
            let stdoutTruncated = false;
            let stderrTruncated = false;
            let settled = false;
            let exited = false;
            let timer = null;
            let wedgedTimer = null;
            const clearTimers = () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (wedgedTimer) {
                    clearTimeout(wedgedTimer);
                    wedgedTimer = null;
                }
            };
            const settle = (result, settleOptions) => {
                if (settled)
                    return;
                settled = true;
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                // A timed-out call must not push the lock's mtime forward: the
                // whole point of surfacing the timeout is to let the lease age
                // out if the operation above cannot finish either.
                if (settleOptions?.touch !== false)
                    touchLeasesSync(covering);
                resolve({ ...result, stdoutTruncated, stderrTruncated });
            };
            child.stdout?.setEncoding('utf8');
            child.stderr?.setEncoding('utf8');
            // F25: the accumulation is what has to be bounded, not just what a
            // caller later writes out. A chunk is taken whole or dropped whole:
            // `setEncoding('utf8')` already hands over complete codepoints, and
            // slicing one by byte count could sever a multi-byte character, so
            // the ceiling is the limit plus at most one stream chunk.
            child.stdout?.on('data', chunk => {
                if (stdoutBytes >= exports.GIT_OUTPUT_LIMIT_BYTES) {
                    stdoutTruncated = true;
                    return;
                }
                stdout += chunk;
                stdoutBytes += Buffer.byteLength(chunk, 'utf8');
            });
            child.stderr?.on('data', chunk => {
                if (stderrBytes >= exports.GIT_OUTPUT_LIMIT_BYTES) {
                    stderrTruncated = true;
                    return;
                }
                stderr += chunk;
                stderrBytes += Buffer.byteLength(chunk, 'utf8');
            });
            child.on('error', error => {
                exited = true;
                clearTimers();
                settle({
                    ok: false,
                    stdout,
                    stderr,
                    status: null,
                    error: error,
                });
            });
            child.on('close', status => {
                exited = true;
                clearTimers();
                // F26: no un-wedging here. This call exiting cleanly says
                // nothing about the wedged child that is still running -- see
                // `markHeldLeaseWedged`.
                settle({
                    ok: status === 0,
                    stdout,
                    stderr,
                    status: typeof status === 'number' ? status : null,
                });
            });
            if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
                timer = setTimeout(() => {
                    timer = null;
                    try {
                        child.kill?.('SIGKILL');
                    }
                    catch { /* already gone, or not killable from here */ }
                    // Settle on the timer rather than on the child's exit: a
                    // child that survives SIGKILL must not be able to keep this
                    // promise -- and the lease -- pending forever.
                    const timeoutError = Object.assign(new Error(`git ${args.join(' ')} timed out after ${timeoutMs}ms`), { code: 'ETIMEDOUT' });
                    // If the kill takes, this was a slow call and the lease is
                    // fine. If the child is still there after the grace window,
                    // the operation is genuinely wedged and the lease has to
                    // stop being refreshed so the lock becomes stealable.
                    wedgedTimer = setTimeout(() => {
                        wedgedTimer = null;
                        if (exited)
                            return;
                        for (const lease of covering)
                            markHeldLeaseWedged(lease);
                    }, exports.GIT_KILL_GRACE_MS);
                    wedgedTimer.unref?.();
                    settle({
                        ok: false,
                        stdout,
                        stderr,
                        status: null,
                        error: timeoutError,
                    }, { touch: false });
                }, timeoutMs);
                timer.unref?.();
            }
        });
    }
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
    async readGitOutputWithTruncation(cwd, args) {
        const result = await this.runGit(cwd, args);
        return {
            text: result.ok ? result.stdout.trim() : null,
            truncated: result.stdoutTruncated === true,
        };
    }
    /**
     * A truncated read is not a shorter answer, it is no answer: it collapses
     * to `null` exactly like a failed command, so every existing `|| null`
     * fallback takes its "not available" branch instead of trusting a prefix.
     * Callers whose output can legitimately be huge must use
     * `readGitOutputWithTruncation` and decide explicitly -- for those, `null`
     * and `''` are indistinguishable at the call site and `''` reads as clean.
     */
    async readGitOutput(cwd, args) {
        const result = await this.readGitOutputWithTruncation(cwd, args);
        return result.truncated ? null : result.text;
    }
    /**
     * One sentence for every safety gate that refuses because git told it less
     * than the whole truth. Naming the command and the limit is the difference
     * between an actionable refusal and a mystery.
     */
    gitTruncationReason(what) {
        return `${what} exceeded the ${exports.GIT_OUTPUT_LIMIT_BYTES}-byte per-command output limit and was truncated, so this check cannot be completed from a partial answer; reduce the number of untracked files (or add them to .gitignore) and rerun.`;
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
    parseGitStatusV2ZPaths(output) {
        const paths = output
            .split('\0')
            .filter(record => record.length > 0 && !record.startsWith('# '))
            .flatMap(record => {
            if (record.startsWith('? '))
                return [record.slice(2)];
            const ordinary = record.match(/^1 \S+ \S+ \S+ \S+ \S+ \S+ \S+ ([\s\S]+)$/);
            if (ordinary)
                return [ordinary[1]];
            const unmerged = record.match(/^u \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ ([\s\S]+)$/);
            return unmerged ? [unmerged[1]] : [];
        });
        return this.normalizeTargetFiles(paths);
    }
    workspaceEntryPaths(entry) {
        return entry.file
            .replace(/^"|"$/g, '')
            .replace(/\\/g, '/')
            .split(/\s+->\s+/)
            .map(file => file.replace(/^"|"$/g, '').trim().replace(/^\.\//, '').replace(/\/$/, ''))
            .filter(Boolean);
    }
    workspaceEntryMatchesPaths(entry, allowedPaths) {
        const files = this.workspaceEntryPaths(entry);
        return files.length > 0 && files.every(file => allowedPaths.some(target => file === target || file.startsWith(`${target}/`)));
    }
    normalizeProjectOwnedPath(projectRoot, gitRoot, value) {
        const normalized = String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
        if (!normalized
            || path.posix.isAbsolute(normalized)
            || normalized === '..'
            || normalized.startsWith('../')
            || normalized.includes('/../')) {
            return null;
        }
        const projectRelative = path.relative(gitRoot, projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
        return projectRelative && projectRelative !== '.' ? `${projectRelative}/${normalized}` : normalized;
    }
    async readGoalOwnedWorkspacePaths(changePath, gitRoot, projectRoot) {
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath)))
            return [];
        try {
            const graph = await this.fileService.readJSON(graphPath);
            const tasks = Array.isArray(graph?.tasks)
                ? graph.tasks.map((task, index) => normalizeTask(task, index))
                : [];
            return Array.from(new Set(tasks
                .filter(task => task.status !== 'PENDING')
                .flatMap(task => task.targetFiles)
                .map((target) => this.normalizeProjectOwnedPath(projectRoot, gitRoot, target))
                .filter((target) => Boolean(target))))
                .sort();
        }
        catch {
            return [];
        }
    }
    async readGoalGeneratedWorkspacePaths(changePath, gitRoot, projectRoot) {
        const graphPath = path.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath)))
            return [];
        try {
            const graph = await this.fileService.readJSON(graphPath);
            const tasks = Array.isArray(graph?.tasks)
                ? graph.tasks.map((task, index) => normalizeTask(task, index))
                : [];
            const generatedPaths = new Set();
            const resolvedProjectRoot = path.resolve(projectRoot);
            for (const task of tasks) {
                if (task.status === 'PENDING'
                    || !task.verificationCommands.some(command => /(?:^|\s)(?:build|typecheck|tsc)(?::[^\s]+)?(?:\s|$)/i.test(command))) {
                    continue;
                }
                for (const target of task.targetFiles) {
                    const normalized = String(target || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                    if (!normalized || path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../'))
                        continue;
                    const resolvedTarget = path.resolve(projectRoot, normalized);
                    if (!this.isPathWithin(resolvedProjectRoot, resolvedTarget))
                        continue;
                    let current = normalized.endsWith('/') || path.extname(resolvedTarget) === ''
                        ? resolvedTarget
                        : path.dirname(resolvedTarget);
                    while (this.isPathWithin(resolvedProjectRoot, current)) {
                        if (await this.fileService.exists(path.join(current, 'tsconfig.json'))) {
                            const generated = this.normalizeProjectOwnedPath(projectRoot, gitRoot, path.relative(projectRoot, path.join(current, 'tsconfig.tsbuildinfo')));
                            if (generated)
                                generatedPaths.add(generated);
                            break;
                        }
                        if (current === resolvedProjectRoot)
                            break;
                        const parent = path.dirname(current);
                        if (parent === current)
                            break;
                        current = parent;
                    }
                }
            }
            return [...generatedPaths].sort();
        }
        catch {
            return [];
        }
    }
    async readCurrentCliVersion() {
        try {
            const packageJson = JSON.parse(await fs_1.promises.readFile(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
            return typeof packageJson?.version === 'string' && packageJson.version.trim()
                ? packageJson.version.trim()
                : null;
        }
        catch {
            return null;
        }
    }
    async readUpdateProvenanceSnapshot(projectRoot, gitRoot) {
        const provenancePath = path.join(projectRoot, '.ospec', constants_1.FILE_NAMES.UPDATE_PROVENANCE);
        if (!(await this.fileService.exists(provenancePath))) {
            return { path: null, contentHash: null, valid: false, files: new Map(), warning: null };
        }
        try {
            const content = await this.fileService.readFile(provenancePath);
            const artifact = JSON.parse(content);
            const currentCliVersion = await this.readCurrentCliVersion();
            if (artifact?.version !== '1.0'
                || artifact?.source !== 'ospec update'
                || !currentCliVersion
                || artifact.ospecCliVersion !== currentCliVersion
                || !Array.isArray(artifact.files)) {
                return {
                    path: provenancePath,
                    contentHash: (0, crypto_1.createHash)('sha256').update(content, 'utf8').digest('hex'),
                    valid: false,
                    files: new Map(),
                    warning: 'OSpec update provenance is stale or invalid; update-managed dirty files will remain blocked.',
                };
            }
            const files = new Map();
            for (const record of artifact.files) {
                const normalizedPath = this.normalizeProjectOwnedPath(projectRoot, gitRoot, record?.path);
                const validHash = record?.kind === 'file'
                    ? typeof record.contentHash === 'string' && /^[a-f0-9]{64}$/.test(record.contentHash)
                    : record?.kind === 'missing' && record.contentHash === null;
                if (!normalizedPath || !validHash || files.has(normalizedPath)) {
                    return {
                        path: provenancePath,
                        contentHash: (0, crypto_1.createHash)('sha256').update(content, 'utf8').digest('hex'),
                        valid: false,
                        files: new Map(),
                        warning: 'OSpec update provenance contains an unsafe path, duplicate, or invalid content hash; update-managed dirty files will remain blocked.',
                    };
                }
                files.set(normalizedPath, record);
            }
            return {
                path: provenancePath,
                contentHash: (0, crypto_1.createHash)('sha256').update(content, 'utf8').digest('hex'),
                valid: true,
                files,
                warning: null,
            };
        }
        catch (error) {
            return {
                path: provenancePath,
                contentHash: null,
                valid: false,
                files: new Map(),
                warning: `OSpec update provenance could not be validated (${error?.message || error}); update-managed dirty files will remain blocked.`,
            };
        }
    }
    async isUpdateManagedWorkspaceEntry(entry, snapshot, gitRoot) {
        if (!snapshot.valid)
            return false;
        const files = this.workspaceEntryPaths(entry);
        if (files.length === 0)
            return false;
        for (const file of files) {
            const record = snapshot.files.get(file);
            if (!record)
                return false;
            const absolutePath = path.join(gitRoot, ...file.split('/'));
            const stat = await fs_1.promises.stat(absolutePath).catch(() => null);
            if (record.kind === 'missing') {
                if (stat)
                    return false;
                continue;
            }
            if (!stat?.isFile())
                return false;
            const contentHash = (0, crypto_1.createHash)('sha256').update(await fs_1.promises.readFile(absolutePath)).digest('hex');
            if (contentHash !== record.contentHash)
                return false;
        }
        return true;
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
            return `Run ${finalizeCommand} to verify and archive the completed change. Closeout defaults to direct-closeout (archive locally, no PR) and manual merge (the user decides later) — do NOT ask the user about PR, merge, branch, or worktree strategy; just finalize and archive. Only present the PR strategy if the user explicitly asked to open a PR. Use ospec archive --check only when you need a dry-run preview; do not stop after a passing dry run unless the user requested preview-only.`;
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
            add('ask user decision', `ospec execute decision ${changeArg} --id ${this.quoteShellArg(pendingDecision.id)} --select <option-id> --answered-by user`, `Required decision "${pendingDecision.id}" is pending.`);
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
                add('dispatch combined final review', `ospec execute review ${changeArg}`, `Combined final review is ${artifact.execution.reviews.spec}.`);
                return recommendations;
            }
        }
        if (artifact.execution.evidence.verification !== 'passed') {
            add('record verification evidence', `ospec execute verify ${changeArg} --command <command> --status PASSED --exit-code 0`, `Verification evidence is ${artifact.execution.evidence.verification}.`);
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
                required: false,
                question: `How should ${currentBranch} be prepared for review before closeout?`,
                recommendedOptionId: 'direct-closeout',
                options: [
                    { id: 'direct-closeout', label: 'Direct closeout', description: 'Default: archive locally without a PR. The user commits/merges later.' },
                    { id: 'open-pr', label: 'Open PR', description: `Only if the user explicitly asks: push ${currentBranch} to ${input.remote} and open a PR against ${input.targetBranch}.` },
                    { id: 'hold', label: 'Hold', description: 'Do not archive yet — only if the user asked to pause closeout.' },
                ],
            },
            {
                id: 'finish-merge-strategy',
                required: false,
                question: `After review, how should ${currentBranch} be integrated into ${input.targetBranch}?`,
                recommendedOptionId: 'manual',
                options: [
                    { id: 'manual', label: 'Manual merge', description: 'Default: leave the merge method to the user/maintainer outside OSpec.' },
                    { id: 'fast-forward', label: 'Fast-forward', description: 'Use a fast-forward merge when history allows it.' },
                    { id: 'squash', label: 'Squash merge', description: 'Squash the branch if the project prefers one commit per change.' },
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
    quoteShellArg(value) {
        return (0, ShellQuote_1.quoteShellArg)(value);
    }
    normalizeHandoffTarget(target) {
        const normalized = (target || 'generic').trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'grok' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported handoff target: ${target}`);
    }
    normalizeWorkerToolTarget(target) {
        const normalized = (target || 'generic').trim().toLowerCase();
        if (normalized === 'codex' || normalized === 'gpt' || normalized === 'claude' || normalized === 'gemini' || normalized === 'grok' || normalized === 'opencode' || normalized === 'cursor' || normalized === 'copilot' || normalized === 'shell' || normalized === 'generic') {
            return normalized;
        }
        throw new Error(`Unsupported worker tool target: ${target}`);
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
            `ospec execute verify ${quotedChangePath} --command "..." --status PASSED --exit-code 0`,
            `ospec execute finish ${quotedChangePath}`,
        ];
    }
    buildHandoffSafetyRules(target) {
        const rules = [
            'Start or resume from one active change; do not enter queue mode unless explicitly requested.',
            'Do not dispatch workers until workspace-status is ready or the work is moved into an isolated worktree.',
            'Follow runtimeAdapter.selected.nativeSubagent and require a current target-bound capability; never start an agent CLI fallback.',
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
        const completionCommand = `ospec execute complete ${input.selected.taskId} ${input.relativeChangePath} --dispatch ${input.selected.id} --status DONE --summary "..."`;
        const fallbackInstructions = [
            'There is no agent CLI fallback. If the native subagent capability is unavailable or expired, stop and refresh the current model session capability.',
            'Do not run Codex, Claude, Orca, or another agent binary to emulate a native child.',
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
                agentPrimitive: 'spawn_agent + harness wait lifecycle',
                dispatchMode: 'native-subagent',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt as the worker message and includes the dispatch packet path.',
                resultCollection: 'Controller waits for worker output with wait_agent, closes finished workers, then records ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Codex/GPT native multi-agent tools: spawn_agent plus the harness wait lifecycle; close only if exposed',
                defaultPath: true,
                instructions: [
                    `Spawn a worker agent for task ${task} using agent_type "worker".`,
                    `Pass the launch prompt as the worker message and include the dispatch packet path: ${packet}.`,
                    'Give the worker disjoint ownership of the packet target files and tell it other workers may be editing different files.',
                    'Do not make the worker read unrelated chat history; provide only the packet, core change paths, and explicit context from the launch prompt.',
                ],
                parallelInstructions: [
                    'For multiple parallel-safe packets, call spawn_agent once per packet in the same controller turn.',
                    'Use the harness wait mechanism on spawned agent ids, integrate completed results as they arrive, and close/release workers only if the harness exposes that API.',
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
                mechanism: 'Gemini native @generalist subagents',
                defaultPath: true,
                instructions: [
                    `Dispatch @generalist for task ${task}.`,
                    `Pass the full launch prompt and dispatch packet path: ${packet}.`,
                    'Use @generalist for implementer and combined code-review prompts unless a more specific Gemini agent is configured.',
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
        if (input.target === 'grok') {
            return {
                target: input.target,
                supported: true,
                adapterId: 'grok-build-native-subagent',
                agentPrimitive: 'spawn_subagent + get_command_or_subagent_output',
                dispatchMode: 'native-subagent',
                requiresControllerAction: true,
                promptTransport: 'Controller passes launchPrompt as the spawn_subagent prompt and includes the dispatch packet path.',
                resultCollection: 'Controller collects worker output with get_command_or_subagent_output using the returned subagent ids and a bounded timeout_ms, then records ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'Grok Build native subagents: spawn_subagent plus get_command_or_subagent_output polling',
                defaultPath: true,
                instructions: [
                    `Spawn a worker subagent for task ${task} with spawn_subagent.`,
                    `Pass the launch prompt as the subagent prompt and include the dispatch packet path: ${packet}.`,
                    'Give the worker disjoint ownership of the packet target files and tell it other workers may be editing different files.',
                    'Do not make the worker read unrelated chat history; provide only the packet, core change paths, and explicit context from the launch prompt.',
                ],
                parallelInstructions: [
                    'For multiple parallel-safe packets, call spawn_subagent once per packet in the same controller turn.',
                    'Poll all outstanding subagent ids with get_command_or_subagent_output using a bounded timeout_ms, and integrate completed results as they arrive.',
                    'Do not spawn workers for conflicting target files in the same round.',
                ],
                completionInstructions: [
                    'Read each subagent final status and map it to DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED.',
                    `Record the task result with: ${completionCommand}`,
                    'Run ospec execute sync after manual artifact edits or after collecting multiple worker results.',
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
                adapterId: 'copilot-native-task-context',
                agentPrimitive: 'Copilot native coding-agent task',
                dispatchMode: 'native-agent-context',
                requiresControllerAction: true,
                promptTransport: 'Controller passes adapterPacket.prompt and the dispatch packet path into Copilot task context.',
                resultCollection: 'Controller reads Copilot output and records the accepted result with ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'GitHub Copilot native coding-agent task with OSpec packet context',
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
                adapterId: 'unsupported-shell-target',
                agentPrimitive: 'none',
                dispatchMode: 'blocked',
                requiresControllerAction: true,
                promptTransport: 'Operator command must read the launch plan and dispatch packet explicitly.',
                resultCollection: 'Controller collects command output or manual status, then records ospec execute complete.',
                fallbackOnly: false,
                mechanism: 'No native subagent mechanism for plain shell',
                defaultPath: false,
                instructions: [
                    'Plain shell has no model-native subagent primitive and cannot execute this packet.',
                    `Keep ${packet} pending until a supported model harness is selected.`,
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
            supported: false,
            adapterId: 'unsupported-native-subagent-target',
            agentPrimitive: 'unregistered native subagent primitive',
            dispatchMode: 'blocked',
            requiresControllerAction: true,
            promptTransport: 'Controller passes launchPrompt through the current harness native agent mechanism.',
            resultCollection: 'Controller reads worker output and records the result with ospec execute complete.',
            fallbackOnly: false,
            mechanism: 'No registered model-native subagent mechanism for this target',
            defaultPath: false,
            instructions: [
                `Target ${input.target} cannot dispatch task ${task} until a model-native subagent primitive is registered.`,
                `Keep the packet pending at ${packet}; do not start an agent CLI fallback.`,
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
            return 'copilot-native-task-context';
        }
        if (target === 'shell') {
            return 'unsupported-shell-target';
        }
        return 'unsupported-native-subagent-target';
    }
    getNativeAgentPrimitive(target) {
        if (target === 'codex' || target === 'gpt') {
            return 'spawn_agent + harness wait lifecycle';
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
            return 'Copilot native coding-agent task';
        }
        if (target === 'shell') {
            return 'explicit local shell command';
        }
        return 'unregistered native subagent primitive';
    }
    getNativeAgentDispatchMode(target) {
        if (target === 'shell') {
            return 'blocked';
        }
        if (target === 'gemini' || target === 'opencode') {
            return 'native-mention';
        }
        if (target === 'cursor' || target === 'copilot') {
            return 'native-agent-context';
        }
        return target === 'generic' ? 'blocked' : 'native-subagent';
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
            '- Read the dispatch packet first; it is the self-contained task brief.',
            '- Open only the target files and the indexed project or archive documents named by the packet when more context is needed.',
            '- Do not reload proposal.md, design.md, implementation-plan.md, tasks.md, or task-graph.json unless the packet identifies a missing decision or contradiction.',
            '- Keep tool-specific plan state secondary to OSpec artifacts.',
            '- Run the packet verification commands or record why they could not run.',
            '- Use NEEDS_CONTEXT or BLOCKED instead of guessing when requirements, dependencies, or environment are missing.',
            '',
            'Completion command:',
            `ospec execute complete ${input.selected.taskId} ${input.relativeChangePath} --dispatch ${input.selected.id} --status DONE --summary "..."`,
        ].join('\n');
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
            `- Infrastructure failure: ${record.infraFailure === true ? 'yes' : 'no'}`,
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
        const strategy = record.repairContext?.repairStrategy
            ? [
                '## Repair Strategy Escalation',
                '',
                `- Strategy key: ${record.repairContext.repairStrategy.key}`,
                `- Stalled reason: ${record.repairContext.repairStrategy.reason}`,
                `- Prior repair rounds: ${record.repairContext.repairStrategy.priorRounds}`,
                '',
            ]
            : [];
        const repairContext = record.repairContext
            ? [
                '## Task Review Repair Context',
                '',
                `- Review decision: ${record.repairContext.decision}`,
                `- Review artifact: ${record.repairContext.reviewArtifactPath}`,
                `- Findings sidecar: ${record.repairContext.findingsPath}`,
                `- Finding IDs: ${record.repairContext.findingIds.join(', ')}`,
                `- Repair write scope: ${record.repairContext.repairScope.join(', ')}`,
                `- Repair context SHA-256: ${record.repairContext.contextHash}`,
                '',
            ]
            : [];
        return [
            `# Worker Retry: ${record.id}`,
            '',
            `- Feature: ${record.feature}`,
            `- Task: ${record.taskId}`,
            `- Previous status: ${record.previousStatus}`,
            `- Previous run: ${record.previousRunId || 'not recorded'}`,
            `- Trigger: ${record.trigger || 'legacy/unknown'}`,
            `- Created at: ${record.createdAt}`,
            '',
            ...strategy,
            ...repairContext,
            '## Summary',
            '',
            record.summary || 'Retry requested after blocker or failed worker run was resolved.',
            '',
        ].join('\n');
    }
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
    flattenReportTasks(report) {
        const all = [
            ...report.readyTasks,
            ...report.runningTasks,
            ...report.completedTasks,
            ...report.concernTasks,
            ...report.blockedTasks.map(item => item.task),
            ...report.invalidTasks.map(item => item.task),
        ];
        const seen = new Set();
        return all.filter(task => {
            if (seen.has(task.id))
                return false;
            seen.add(task.id);
            return true;
        });
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
            decision: 'PENDING',
            review_artifact: this.getTaskCombinedReviewArtifactRelativePath(task.id),
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
    normalizeOutcomeFields(options, context) {
        let exitCode = null;
        if (options.exitCode !== undefined && options.exitCode !== null) {
            if (typeof options.exitCode !== 'number' || !Number.isInteger(options.exitCode)) {
                throw new Error(`${context} requires an integer exit code; received ${JSON.stringify(options.exitCode)}.`);
            }
            exitCode = options.exitCode;
        }
        let signal = null;
        if (options.signal !== undefined && options.signal !== null) {
            if (typeof options.signal !== 'string') {
                throw new Error(`${context} requires a string signal name; received ${JSON.stringify(options.signal)}.`);
            }
            const trimmed = options.signal.trim();
            if (trimmed) {
                if (!/^[A-Za-z][A-Za-z0-9_+-]{0,31}$/.test(trimmed)) {
                    throw new Error(`${context} requires a signal name like SIGKILL; received ${JSON.stringify(options.signal)}.`);
                }
                signal = trimmed;
            }
        }
        return { exitCode, timedOut: options.timedOut === true, signal, infraFailure: options.infraFailure === true };
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
            return APPROVED_REVIEW_DECISIONS.has(review.decision);
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
            '- [ ] Combined code review completed (spec compliance + code quality)',
            '- [ ] Controller resolved concerns, context requests, or blockers',
            '- [ ] Final verification commands are recorded in `verification.md`',
            '',
        ].join('\n');
    }
    updateWorkerStatusBody(body, input) {
        // "Does this document already have a checklist?" is the same question
        // the gates ask, so it gets the same answer. It used to be a fourth
        // inline regex, which meant a fenced EXAMPLE of a checklist suppressed
        // the real one being appended.
        const bodyWithChecklist = (0, ChecklistScan_1.hasChecklistItem)(body)
            ? body
            : `${body.trim()}\n\n## Checklist\n\n- [ ] Implementer returned \`DONE\` or \`DONE_WITH_CONCERNS\`\n- [ ] Combined code review completed (spec compliance + code quality)\n- [ ] Controller resolved concerns, context requests, or blockers\n- [ ] Final verification commands are recorded in \`verification.md\`\n`;
        const summaryStatusUpdated = this.updateWorkerStatusSummaryStatusLines(bodyWithChecklist, input);
        // A REWRITER, so it cannot use `blankFencedCodeBlocks`: every line it is
        // not changing has to go back verbatim. `fencedLineFlags` gives the same
        // fence decision without discarding the content, so a `- [ ]` inside a
        // fenced example is left exactly as the author wrote it instead of
        // having its box toggled.
        const summaryLines = summaryStatusUpdated.split(/\r?\n/);
        const fenced = (0, ChecklistScan_1.fencedLineFlags)(summaryStatusUpdated.replace(/\r\n/g, '\n'));
        const checklistUpdated = summaryLines
            .map((line, index) => (fenced[index]
            ? line
            : this.updateWorkerStatusChecklistLine(line, input)))
            .join('\n');
        const summary = this.buildWorkerStatusSyncSummary(input);
        const managedBlockPattern = new RegExp(`${this.escapeRegex(MANAGED_WORKER_STATUS_START)}[\\s\\S]*?${this.escapeRegex(MANAGED_WORKER_STATUS_END)}\\n?`, 'm');
        const baseBody = checklistUpdated.replace(managedBlockPattern, '').trimEnd();
        return `${baseBody}\n\n${summary}\n`;
    }
    updateWorkerStatusSummaryStatusLines(body, input) {
        let section = null;
        return body
            .split(/\r?\n/)
            .map(line => {
            const heading = line.match(/^\s*##\s+(.+)$/);
            if (heading) {
                const label = heading[1];
                section = /implementer/i.test(label)
                    ? 'implementer'
                    : /combined review|مراجعة موحدة/i.test(label)
                        ? 'review'
                        : /controller/i.test(label)
                            ? 'controller'
                            : null;
                return line;
            }
            if (!section || !/^\s*-\s+(?:status|状态|状態|الحالة)\s*:/i.test(line))
                return line;
            const status = section === 'implementer'
                ? input.implementerStatus
                : section === 'review'
                    ? input.specReviewerStatus
                    : input.controllerStatus;
            return line.replace(/^(\s*-\s+(?:status|状态|状態|الحالة)\s*:\s*)(?:`[^`]*`|.*)$/i, `$1\`${status}\``);
        })
            .join('\n');
    }
    updateWorkerStatusChecklistLine(line, input) {
        // The shared line-level predicate, so this rewriter recognises exactly
        // the lines the gates count -- including `*` and `+` bullets, which the
        // old inline `-`-only regex silently refused to update. The caller has
        // already excluded fenced lines.
        if (!(0, ChecklistScan_1.isChecklistItemLine)(line)) {
            return line;
        }
        const checked = line.replace(/\[(?: |x|X)\]/, '[x]');
        const unchecked = line.replace(/\[(?: |x|X)\]/, '[ ]');
        if (/implementer/i.test(line)) {
            return TERMINAL_TASK_STATUSES.has(input.implementerStatus) ? checked : unchecked;
        }
        if (/combined(?: code)? review|المراجعة الموحدة/i.test(line)) {
            return TERMINAL_TASK_STATUSES.has(input.specReviewerStatus) ? checked : unchecked;
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
            `- Combined reviewer status: \`${input.specReviewerStatus}\``,
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
    /** Token-lean pointer block: workers read the referenced brief only when they need project context. */
    buildProjectSessionBriefLines(projectSession) {
        const projectSessionWarnings = projectSession && projectSession.warnings.length > 0
            ? projectSession.warnings.map(warning => `- ${warning}`)
            : [];
        return [
            '## Project Session Brief',
            '',
            `- Brief: ${projectSession?.reportPath || 'not recorded'} (read only when project-level context is needed)`,
            `- Active/queued changes: ${projectSession?.activeChangeCount ?? 0}/${projectSession?.queuedChangeCount ?? 0}; archived features: ${projectSession?.archivedChangeCount ?? 0}`,
            `- Knowledge lookup: use \`ospec index query <keyword...>\` instead of reading index files whole`,
            ...(projectSessionWarnings.length > 0
                ? ['', '### Session Warnings', '', ...projectSessionWarnings]
                : []),
        ];
    }
    buildTaskReviewRepairContextLines(context) {
        const findings = context.findings.flatMap(finding => [
            `### ${finding.id}: ${finding.message}`,
            '',
            `- Severity: ${finding.severity}`,
            `- Category: ${finding.category}`,
            `- Location: ${finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ''}` : 'not recorded'}`,
            `- Evidence: ${finding.evidence}`,
            `- Requirement refs: ${finding.requirementRefs.join(', ') || 'none'}`,
            `- Repair scope: ${finding.repairScope.join(', ') || context.repairScope.join(', ') || 'not recorded'}`,
            '',
        ]);
        const strategy = context.repairStrategy
            ? [
                '## Repair Strategy Escalation',
                '',
                `- Strategy key: ${context.repairStrategy.key}`,
                `- Stalled reason: ${context.repairStrategy.reason}`,
                `- Prior repair rounds: ${context.repairStrategy.priorRounds}`,
                `- Finding IDs: ${context.repairStrategy.findingIds.join(', ')}`,
                '',
                '- Earlier automatic repairs did not converge. Do not repeat the previous patch shape or merely rewrite evidence.',
                '- Re-read every cited location and requirement, identify the root cause, and implement the smallest end-to-end correction that makes the finding false.',
                '- Add or strengthen a focused regression check before running the task verification commands.',
                '- This is the single automatic strategy escalation for this finding set; return NEEDS_CONTEXT with the exact missing decision or scope if it still cannot be resolved.',
                '',
            ]
            : [];
        return [
            ...strategy,
            '## Task Review Repair Context',
            '',
            `- Review decision: ${context.decision}`,
            `- Review artifact: ${context.reviewArtifactPath}`,
            `- Findings sidecar: ${context.findingsPath}`,
            `- Finding IDs: ${context.findingIds.join(', ')}`,
            `- Repair write scope: ${context.repairScope.join(', ')}`,
            `- Context captured at: ${context.capturedAt}`,
            `- Review artifact SHA-256: ${context.reviewArtifactHash}`,
            `- Findings SHA-256: ${context.findingsHash}`,
            `- Repair context SHA-256: ${context.contextHash}`,
            `- Review dispatch: ${context.reviewDispatchId || 'legacy/unavailable'}`,
            `- Reviewed target snapshot SHA-256: ${context.reviewTargetSnapshotHash || 'legacy/unavailable'}`,
            `- Repair scope snapshot SHA-256: ${context.repairScopeSnapshotHash || 'legacy/unavailable'}`,
            `- Cross-task scope owners: ${context.crossTaskScopeOwnerIds?.join(', ') || 'none'}`,
            '',
            '### Required Repairs',
            '',
            ...findings,
            '### Repair Constraints',
            '',
            '- This is a bounded repair of the listed findings, not a fresh implementation of the original task.',
            '- Resolve every finding ID above and cite the changed files and verification evidence in the worker report.',
            '- Keep source edits within the repair write scope. If the scope is insufficient, stop with NEEDS_CONTEXT instead of silently broadening it.',
            '- Do not edit the review artifact or findings sidecar. A fresh independent reviewer will replace the decision after repair completion.',
            '',
        ];
    }
    buildDispatchPacket(report, task, record) {
        const profile = record.workerProfile ?? task.workerProfile;
        const targetToolMapping = profile.targetToolMapping ?? buildWorkerTargetToolMapping(profile.recommendedTarget);
        const rationale = profile.rationale.map(item => `- ${item}`).join('\n');
        const requiredBehavior = profile.requiredBehavior.map(item => `- ${item}`).join('\n');
        const globalConstraints = report.globalConstraints.length > 0
            ? report.globalConstraints.map(item => `- ${item}`).join('\n')
            : '- None recorded.';
        const interfaces = task.interfaces.length > 0
            ? task.interfaces.map(item => `- ${item}`).join('\n')
            : '- None recorded.';
        const workerReportPath = ['artifacts', 'agents', WORKER_REPORTS_DIR, `${this.toFileSafeId(task.id) || 'task'}.md`].join('/');
        const targetFiles = record.repairContext?.repairScope.length
            ? record.repairContext.repairScope
            : task.targetFiles;
        const repairContextLines = record.repairContext
            ? this.buildTaskReviewRepairContextLines(record.repairContext)
            : [];
        const verificationScopeWarnings = this.getVerificationScopeWarnings(task.verificationCommands);
        return [
            `# Agent Dispatch: ${task.id}`,
            '',
            `- Dispatch ID: ${record.id}`,
            `- Change: ${report.feature}`,
            `- Worker role: ${task.workerRole}`,
            `- Capability tier: ${profile.capabilityTier}`,
            `- Model profile: ${profile.modelProfile}`,
            `- Model: ${profile.model || 'harness default (not explicitly configured)'}`,
            `- Model selection: ${profile.modelSelectionSource}`,
            `- Model configuration source: ${profile.modelConfigurationSource || (profile.model ? 'target' : 'harness-default')}`,
            '- Observed model: unknown until provider/usage evidence is recorded',
            `- Recommended target: ${profile.recommendedTarget}`,
            `- Resolved target: ${profile.resolvedTarget || targetToolMapping.target}`,
            `- Status: ${record.status}`,
            `- Parallelizable: ${task.parallelizable ? 'yes' : 'no'}`,
            `- Serial reason: ${task.parallelizable ? 'not applicable' : task.serialReason || 'missing (planning warning)'}`,
            `- Target files: ${targetFiles.join(', ') || 'none'}`,
            `- Verification commands: ${task.verificationCommands.join(' && ') || 'none'}`,
            `- Expected result: ${task.expectedResult || 'none'}`,
            `- Usage sidecar: artifacts/agents/${USAGE_SIDECARS_DIR}/${record.id}.json (optional; automatically ingested when present)`,
            '',
            ...(verificationScopeWarnings.length > 0 ? [
                '## Verification Scope Warnings',
                '',
                ...verificationScopeWarnings.map(warning => `- ${warning}`),
                '',
            ] : []),
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
            `- Record completion: ${targetToolMapping.recordCompletion}`,
            '',
            '## Task',
            '',
            task.title,
            '',
            task.context || 'No additional task context recorded.',
            '',
            ...repairContextLines,
            '## Global Constraints',
            '',
            globalConstraints,
            '',
            '## Interfaces',
            '',
            interfaces,
            '',
            '## Required Context',
            '',
            '- Treat this packet as the task brief and start from the target files listed above.',
            '- Do not load every core change document by default. Open a specific section of `proposal.md`, `design.md`, `implementation-plan.md`, or `tasks.md` only when this packet leaves a named ambiguity.',
            '- For existing project behavior, run `ospec docs locate --affects <path>` or `--feature <slug>` to get `path#heading` plus a line range, then read only that range. `docs/project/feature-catalog.md` lists every declared feature if you need the slug.',
            '- Keep changes scoped to the target files unless implementation proves a listed file is wrong.',
            '- Run the verification command(s) listed above or record why they could not be run.',
            '- Perform an implementer self-review before reporting status; record any concern as `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED` instead of hiding it.',
            '- Expect one task-level review covering both spec compliance and code quality before dependent work can proceed.',
            '',
            '## Completion',
            '',
            `Preferred: write ONE structured JSON report and hand it to the CLI. The CLI validates it and renders the human Markdown view to \`${workerReportPath}\` for you, so do not hand-write that file.`,
            `When the harness exposes authoritative usage, write its normalized counters to \`artifacts/agents/${USAGE_SIDECARS_DIR}/${record.id}.json\`; do not estimate missing token fields.`,
            '',
            '```bash',
            `cat > report.json <<'JSON'`,
            '{',
            '  "status": "DONE",',
            '  "summary": "one short paragraph for the controller",',
            '  "changedPaths": ["src/a.ts"],',
            '  "evidence": [{ "kind": "command", "ref": "npm test", "result": "passed" }],',
            '  "concerns": []',
            '}',
            'JSON',
            `ospec execute complete ${task.id} [change-path] --dispatch ${record.id} --report-file report.json`,
            '```',
            '',
            'All five keys are required. Send `[]` for an empty list; a missing key is an error, not an empty list, and the error text names the field, what was expected, what was found, and the edit to make.',
            'Use `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED` in `status` when the result is not cleanly complete.',
            '',
            'Fallback (still supported for one version cycle): write the Markdown report yourself and pass the status inline.',
            '',
            '```bash',
            `ospec execute complete ${task.id} [change-path] --dispatch ${record.id} --status DONE --summary "..."`,
            '```',
            '',
        ].join('\n');
    }
    getVerificationScopeWarnings(commands) {
        return commands
            .map(command => command.trim())
            .filter(command => /^(?:docker\s+compose|docker-compose)\s+(?:--[^\s]+\s+)*up(?:\s+(?:-d|--detach|--build))*\s*$/i.test(command)
            && /(?:^|\s)--build(?:\s|$)/i.test(command))
            .map(command => `Broad Docker Compose rebuild detected (${command}). Before executing it, inspect repository release guidance and confirm the task truly requires every service. Prefer explicit service names for scoped application verification; do not build unrelated optional runtimes or large accelerator dependencies.`);
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
            `- Judgment required: ${record.judgmentRequired ? 'yes' : 'no'}`,
            `- Escalation reason: ${record.escalationReason}`,
            `- Deferred to final review: ${record.deferredToFinalReview === true ? 'yes' : 'no'}`,
            ...(record.deferredAt ? [`- Deferred at: ${record.deferredAt}`] : []),
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
            ...(record.deferredReason ? ['', '## Deferral Authorization', '', record.deferredReason] : []),
            '',
            '## Next Actions',
            '',
            nextActions,
            '',
            '## Controller Contract',
            '',
            '- Do not mark this task `DONE` until the missing context or blocker is resolved.',
            '- A final-review deferral may unblock dependent implementation, but it never satisfies final verification, finalization, or archive.',
            '- If the task scope is wrong, update `implementation-plan.md` and `artifacts/agents/task-graph.json` before redispatch.',
            '- If the worker needs a user decision, ask one concise question and keep this report as the decision trail.',
            '',
        ].join('\n');
    }
    buildReviewDispatchPacket(report, record, extraSections = []) {
        const isPlanningReview = record.stage === 'planning';
        const isTaskReview = Boolean(record.taskId);
        const isCombinedReview = record.stage === 'review';
        const reviewName = isPlanningReview
            ? 'Combined Planning Review'
            : isCombinedReview
                ? 'Code Review (Spec Compliance + Code Quality)'
                : record.stage === 'spec' ? 'Spec Compliance Review' : 'Code Quality Review';
        const priorReview = isPlanningReview
            ? '- Review planning semantics in two dimensions within this single pass: (1) requirement/design integrity and (2) task-graph/verification coverage. Do not edit the planning documents.'
            : isCombinedReview
                ? '- Review BOTH dimensions in one pass: (1) spec compliance — the implementation satisfies the task packet, accepted design, implementation plan, and expected result without under/over-building; (2) code quality — it is maintainable, minimal, tested, and safe. Record one combined decision.'
                : record.stage === 'quality'
                    ? isTaskReview
                        ? '- Confirm this task\'s spec review artifact is `APPROVED` or `APPROVED_WITH_CONCERNS` before reviewing quality.'
                        : '- Confirm `artifacts/reviews/spec-compliance.md` is `APPROVED` or `APPROVED_WITH_CONCERNS` before reviewing quality.'
                    : isTaskReview
                        ? '- Check this task implementation against the task packet, accepted design, implementation plan, and expected result.'
                        : '- Check implementation against `proposal.md`, `design.md`, `implementation-plan.md`, and `tasks.md` before deciding whether it satisfies the spec.';
        const reviewedTask = record.taskId ? this.flattenReportTasks(report).find(task => task.id === record.taskId) : null;
        const workerReportPath = record.taskId
            ? ['artifacts', 'agents', WORKER_REPORTS_DIR, `${this.toFileSafeId(record.taskId) || 'task'}.md`].join('/')
            : null;
        const taskScope = isPlanningReview
            ? [
                '- Scope: proposal.md, design.md, implementation-plan.md, tasks.md, and artifacts/agents/task-graph.json before implementation starts.',
                '- Confirm acceptance-to-task-to-verification traceability, semantic feasibility, cross-cutting boundaries, dependencies, and external acceptance separation.',
                '- Treat unjustified serialization as a finding: every depends_on must be semantically necessary, and a fully serial chain (each task depending on the previous one) requires an explicit justification or a widened graph so independent tasks can dispatch in parallel.',
            ]
            : isTaskReview
                ? [
                    `- Task ID: ${record.taskId}`,
                    `- Task title: ${record.taskTitle || 'not recorded'}`,
                    `- Target files: ${reviewedTask?.targetFiles.join(', ') || 'not recorded'}`,
                    `- Upstream regression obligations: ${record.regressionTaskIds?.join(', ') || 'none'}`,
                    `- Worker report: ${workerReportPath}`,
                    '- Review this task, its direct integration effects, and every listed upstream regression obligation; do not turn this into a whole-change final review.',
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
            `- Model profile: ${record.workerProfile?.modelProfile || 'review'}`,
            `- Model: ${record.workerProfile?.model || 'harness default (not explicitly configured)'}`,
            `- Model selection: ${record.workerProfile?.modelSelectionSource || 'harness-default'}`,
            `- Model configuration source: ${record.workerProfile?.modelConfigurationSource || (record.workerProfile?.model ? 'target' : 'harness-default')}`,
            `- Resolved target: ${record.workerProfile?.resolvedTarget || record.runtimeAdapter?.target || 'unknown'}`,
            `- Observed model: ${record.runtimeAdapter?.selected?.modelSelection?.observedModel || 'unknown (no provider/usage evidence)'}`,
            `- Status: ${record.status}`,
            `- Review artifact: ${record.reviewArtifactPath}`,
            `- Review package: ${record.reviewPackagePath || 'not available'}`,
            `- Task graph: ${this.toChangeRelativePath(report.changePath, report.graphPath)}`,
            '',
            ...this.buildProjectSessionBriefLines(record.projectSession),
            '',
            '## Required Context',
            '',
            ...(isPlanningReview
                ? [
                    `- Read \`${record.reviewPackagePath || 'the generated review package'}\` first for the exact planning snapshot and bounded diff evidence.`,
                    '- Read the five authoritative planning inputs once. Do not crawl implementation files or run broad tests.',
                    '- Treat missing requirement coverage, unsafe architecture, invalid dependency ordering, and unverifiable acceptance criteria as actionable findings.',
                    '- Require every finding to identify the affected planning file or task-graph path and a bounded repair scope.',
                ]
                : isTaskReview
                    ? [
                        `- Read the task's dispatch packet under \`artifacts/agents/dispatches/\` and \`${workerReportPath}\` first.`,
                        `- Read \`${record.reviewPackagePath || 'the generated review package'}\` once for commit metadata, scoped status, stat, and diff evidence. Do not rerun broad Git discovery commands.`,
                        '- Review the task target files, their direct integration effects, and the upstream contracts named in the package. Do not crawl the repository or reload every change document.',
                        '- Open a core change document only to resolve a concrete requirement that the task packet does not contain; name that gap in the review.',
                        '- Do not rerun broad test suites already recorded in the worker report. Run only a focused check for a specific unresolved doubt.',
                    ]
                    : [
                        `- Read \`${record.reviewPackagePath || 'the generated review package'}\` first for whole-change commit, status, stat, and diff evidence.`,
                        '- Use the approved combined planning review, proposal acceptance criteria, task graph, and task-review decisions as the verified baseline. Do not repeat each task review.',
                        '- Inspect the whole-change diff for cross-task integration, shared-state behavior, missing acceptance coverage, and regression risk. Open a worker report or source file only when the package or a task-review concern identifies a concrete risk.',
                        '- Re-run only a focused check needed to resolve a specific integration doubt; leave broad deterministic verification to the verification stage.',
                    ]),
            priorReview,
            '- Do not accept implementer self-review as a substitute for independent review.',
            '- Review independently and read-only. The controller must not tell you to ignore a finding, pre-downgrade its severity, or skip it because the plan requested the behavior.',
            '- Cite file and line evidence for each actionable finding.',
            '- If a requirement depends on unchanged or out-of-scope code that this task package cannot establish, record `CANNOT_VERIFY_FROM_TASK_SCOPE` and hand the judgment to the controller instead of guessing.',
            '',
            '## Review Output',
            '',
            '- Preferred: write ONE structured JSON decision and hand it to the CLI. It validates the decision, writes the review Markdown body, and writes the structured findings for you, preserving every provenance field:',
            '',
            '```bash',
            `cat > decision.json <<'JSON'`,
            '{',
            '  "decision": "APPROVED_WITH_CONCERNS",',
            '  "summary": "one paragraph explaining the decision",',
            '  "findings": [{ "id": "F-001", "severity": "medium", "category": "correctness", "message": "...", "evidence": "...", "file": "src/a.ts", "line": 42 }]',
            '}',
            'JSON',
            `ospec execute review-decision [change-path] --review ${record.reviewArtifactPath} --decision-file decision.json`,
            '```',
            '',
            '- Every finding needs an explicit `severity`. A Markdown-only review is parsed as `severity: unknown`, which the planning gate treats as blocking; the JSON path is what avoids that.',
            '',
            '- Fallback (still supported for one version cycle), if you write the artifact by hand:',
            `- Update \`${record.reviewArtifactPath}\` frontmatter \`decision\` to one of: \`APPROVED\`, \`APPROVED_WITH_CONCERNS\`, \`NEEDS_CHANGES\`, \`BLOCKED\`, \`PENDING\`.`,
            '- Preserve the controller-written review dispatch, target snapshot, Loop action, controller session, and reviewer executor provenance fields unchanged.',
            '- Set frontmatter `reviewed_at` to the actual completion timestamp. Preserve `review_dispatch_id` and `target_snapshot_hash` exactly as written by the controller.',
            '- Record concrete findings and evidence in the review artifact body.',
            `- Also write structured findings to \`${this.getReviewFindingsRelativePath(record.reviewArtifactPath)}\` as \`{"version":"1.0","findings":[{"id":"F-001","severity":"high|medium|low|info","category":"correctness","message":"...","file":"src/file.ts","line":42,"evidence":"...","requirement_refs":["REQ-1"],"repair_scope":["src/file.ts"]}]}\`. Use an empty findings array only when there are no findings.`,
            '- Use `APPROVED_WITH_CONCERNS` only when the change can continue and the controller can accept the concern.',
            ...extraSections,
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
        const findings = [];
        let collecting = false;
        let sawFindingSection = false;
        for (const rawLine of body.split(/\r?\n/)) {
            const line = rawLine.trim();
            const heading = line.match(/^##+\s+(.+)$/);
            if (heading) {
                const title = heading[1].toLowerCase();
                collecting = /findings?|spec compliance|code quality|required changes?|issues?|发现|问题|修复|符合性|代码质量|指摘|品質|الملاحظات|المشكلات/iu.test(title)
                    && !/decision|checklist|summary|结论|决定|清单|決定|判定|القرار|القائمة/iu.test(title);
                sawFindingSection || (sawFindingSection = collecting);
                continue;
            }
            // Shared predicate again: the `-`-only spelling that used to be here
            // let a `* [ ]` or `+ [ ]` checklist line through as if it were a
            // review finding.
            if (!collecting || !line || /^#/.test(line) || /^(-\s*)?TBD\.?$/i.test(line) || (0, ChecklistScan_1.isChecklistItemLine)(line)) {
                continue;
            }
            findings.push(line);
        }
        if (sawFindingSection) {
            return findings.slice(0, 50);
        }
        return body
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !/^#+\s+/.test(line))
            .filter(line => !(0, ChecklistScan_1.isChecklistItemLine)(line))
            .filter(line => !/^(-\s*)?TBD\.?$/i.test(line))
            .slice(0, 50);
    }
    getReviewFindingsRelativePath(reviewArtifactPath) {
        return reviewArtifactPath.replace(/\.md$/i, '.findings.json');
    }
    /**
     * The findings contract applied to bytes that are already in hand.
     *
     * Split out of `readReviewFindings` so the evidence validation judges the
     * bytes it already read rather than re-reading the path. A verdict derived
     * from a second, later read of the same file is a verdict about a file that
     * may have changed in between.
     */
    parseReviewFindingsDocument(findingsPath, contents) {
        let raw;
        try {
            raw = JSON.parse(contents.replace(/^﻿/, ''));
        }
        catch {
            throw new Error(`Structured review findings must contain valid JSON: ${findingsPath}`);
        }
        if (!raw || !Array.isArray(raw.findings)) {
            throw new Error(`Structured review findings must contain a findings array: ${findingsPath}`);
        }
        const seen = new Set();
        const structured = raw.findings.map((finding, index) => {
            const id = String(finding?.id || '').trim();
            const message = String(finding?.message || '').trim();
            const evidence = String(finding?.evidence || '').trim();
            const severity = String(finding?.severity || '').trim().toLowerCase();
            if (!id || seen.has(id))
                throw new Error(`Structured review finding ${index + 1} has a missing or duplicate id.`);
            if (!message || !evidence)
                throw new Error(`Structured review finding ${id} requires message and evidence.`);
            if (!['critical', 'high', 'medium', 'low', 'info', 'unknown'].includes(severity)) {
                throw new Error(`Structured review finding ${id} has unsupported severity: ${severity || '(empty)'}.`);
            }
            const line = finding?.line === null || finding?.line === undefined
                ? null
                : Number(finding.line);
            if (line !== null && (!Number.isInteger(line) || line <= 0)) {
                throw new Error(`Structured review finding ${id} line must be a positive integer or null.`);
            }
            seen.add(id);
            return {
                id,
                severity: severity,
                category: String(finding?.category || 'unspecified').trim() || 'unspecified',
                message,
                file: typeof finding?.file === 'string' && finding.file.trim() ? finding.file.trim() : null,
                line,
                evidence,
                requirementRefs: stringArray(finding?.requirement_refs),
                repairScope: stringArray(finding?.repair_scope),
            };
        });
        return {
            text: structured.map(finding => this.renderReviewFinding(finding)),
            structured,
            path: findingsPath,
            source: 'structured',
        };
    }
    async readReviewFindings(reviewArtifactPath, body) {
        const findingsPath = reviewArtifactPath.replace(/\.md$/i, '.findings.json');
        if (await this.fileService.exists(findingsPath)) {
            let raw;
            try {
                raw = await this.fileService.readFile(findingsPath);
            }
            catch {
                throw new Error(`Structured review findings must contain valid JSON: ${findingsPath}`);
            }
            return this.parseReviewFindingsDocument(findingsPath, raw);
        }
        const text = this.extractReviewFindings(body);
        const structured = text.map((message, index) => ({
            id: `F-${String(index + 1).padStart(3, '0')}`,
            severity: 'unknown',
            category: 'legacy-markdown',
            message: message.replace(/^[-*]\s+/, '').trim(),
            file: null,
            line: null,
            evidence: message,
            requirementRefs: [],
            repairScope: [],
        }));
        await this.fileService.writeJSON(findingsPath, {
            version: '1.0',
            source: 'markdown_fallback',
            findings: structured.map(finding => ({
                id: finding.id,
                severity: finding.severity,
                category: finding.category,
                message: finding.message,
                file: finding.file,
                line: finding.line,
                evidence: finding.evidence,
                requirement_refs: finding.requirementRefs,
                repair_scope: finding.repairScope,
            })),
        });
        return { text, structured, path: findingsPath, source: 'markdown_fallback' };
    }
    renderReviewFinding(finding) {
        const location = finding.file
            ? `${finding.file}${finding.line ? `:${finding.line}` : ''}`
            : 'no file location';
        return `[${finding.id}] [${finding.severity}] ${finding.message} (${location}) Evidence: ${finding.evidence}`;
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
    buildRepairWavePacket(record) {
        const strategy = record.repairStrategy
            ? [
                '## Repair Strategy Escalation',
                '',
                `- Strategy key: ${record.repairStrategy.key}`,
                `- Stalled reason: ${record.repairStrategy.reason}`,
                `- Prior repair waves: ${record.repairStrategy.priorRounds}`,
                `- Finding IDs: ${record.repairStrategy.findingIds.join(', ')}`,
                '',
                '- Earlier repair waves did not converge. Do not repeat the previous patch shape or merely rewrite evidence.',
                '- Re-read every cited location and requirement, identify the shared root cause, and implement the smallest end-to-end correction that makes the finding false.',
                '- Add or strengthen a focused regression check before running the covering verification boundary.',
                '- This is the single automatic strategy escalation for this finding set; return NEEDS_CONTEXT with the exact missing decision or scope if it still cannot be resolved.',
                '',
            ]
            : [];
        return [
            `# Grouped Repair Wave: ${record.id}`,
            '',
            `- Change: ${record.feature}`,
            `- Source review: ${record.sourceReviewPath}`,
            `- Source decision: ${record.sourceDecision}`,
            `- Source review dispatch: ${record.sourceReviewDispatchId || 'legacy/unavailable'}`,
            `- Source reviewed target snapshot SHA-256: ${record.sourceReviewTargetSnapshotHash || 'legacy/unavailable'}`,
            `- Source repair scope snapshot SHA-256: ${record.sourceRepairScopeSnapshotHash || 'legacy/unavailable'}`,
            `- Repair task: ${record.taskId}`,
            `- Target files: ${record.targetFiles.join(', ')}`,
            `- Documentation updates: ${record.documentationUpdates.join(', ') || 'none'}`,
            '',
            ...strategy,
            '## Complete Findings List',
            '',
            ...record.findings.map(finding => `- ${finding}`),
            '',
            '## Verification Boundary',
            '',
            ...record.verificationCommands.map(command => `- \`${command}\``),
            '',
            '## Repair Contract',
            '',
            '- Use one worker for this complete findings list; do not create one worker per finding.',
            '- Resolve compatible findings in one coherent edit pass and record any scope conflict as NEEDS_CONTEXT.',
            '- Run the covering verification commands once after the complete repair set is applied.',
            '- Complete the generated repair task, run one combined task review, then run one combined final re-review.',
            '',
        ].join('\n');
    }
    buildDocumentReviewArtifact(feature, target) {
        const created = new Date().toISOString().split('T')[0];
        const checklist = target.documentFile === constants_1.FILE_NAMES.DESIGN
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
            'reviewer_role: deterministic_preflight',
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
    /**
     * F5: render the three non-exit-code outcome fields, and only when one of
     * them carries information. A line per record per field would cost output
     * on every evidence read for the common case where all three are false.
     */
    outcomeReportLines(record) {
        const lines = [];
        if (record.timedOut === true)
            lines.push('- Timed out: yes');
        if (record.signal)
            lines.push(`- Signal: ${record.signal}`);
        if (record.infraFailure === true) {
            lines.push('- Infrastructure failure: yes (the harness could not run the command; this is not a failure of the work)');
        }
        return lines;
    }
    buildVerificationEvidenceReport(report, record) {
        return [
            `# Verification Evidence: ${record.id}`,
            '',
            `- Change: ${report.feature}`,
            `- Status: ${record.status}`,
            `- Recorded at: ${record.recordedAt}`,
            `- Exit code: ${record.exitCode === null ? 'not recorded' : record.exitCode}`,
            ...this.outcomeReportLines(record),
            `- Command: \`${record.command}\``,
            `- Loop action: ${record.loopActionId || 'not bound'}`,
            `- Loop action item: ${record.loopActionItemId || 'not bound'}`,
            `- Executor: ${record.executorId || 'not bound'}`,
            `- Issuance target snapshot: ${record.issuanceTargetSnapshotHash || 'not bound'}`,
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
            ...this.outcomeReportLines(record),
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
        const goalOwnedFiles = artifact.git.goalOwnedStatusEntries.length > 0
            ? artifact.git.goalOwnedStatusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const generatedFiles = artifact.git.generatedStatusEntries.length > 0
            ? artifact.git.generatedStatusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const updateManagedFiles = artifact.git.updateManagedStatusEntries.length > 0
            ? artifact.git.updateManagedStatusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
            : '- None';
        const blockingFiles = artifact.git.blockingStatusEntries.length > 0
            ? artifact.git.blockingStatusEntries.map(entry => `- ${entry.code}: ${entry.file}`).join('\n')
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
            `- Ownership mode: ${artifact.ownership.mode}`,
            `- Update provenance: ${artifact.ownership.updateProvenancePath || 'not available'}`,
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
            '## Goal-Owned Changes',
            '',
            goalOwnedFiles,
            '',
            '## Task-Generated Changes',
            '',
            generatedFiles,
            '',
            '## Update-Managed Changes',
            '',
            updateManagedFiles,
            '',
            '## Blocking Changes',
            '',
            blockingFiles,
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
            `Reply with one option id. Record the answer with: ospec execute decision [change-path] --id ${this.quoteShellArg(record.id)} --select <option-id> --answered-by user`,
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
            `- Answered by: ${record.answeredBy || 'legacy or not selected'}`,
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
            `- Workflow profile: ${artifact.workflowProfile}`,
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
        const runtimeAdapter = artifact.runtimeAdapter
            ? [
                `- Preference: ${artifact.runtimeAdapter.preference}${artifact.runtimeAdapter.strict ? ' (strict)' : ''}`,
                `- Selected adapter: ${artifact.runtimeAdapter.selectedAdapterId || 'none'}`,
                `- Blocked: ${artifact.runtimeAdapter.blocked ? 'yes' : 'no'}`,
                `- Native resolution order: ${artifact.runtimeAdapter.fallbackOrder.join(' -> ')}`,
                `- Parallel execution: ${artifact.runtimeAdapter.selected?.supportsParallel ? 'supported' : 'serial'}`,
                `- Workspace ownership verified: ${artifact.runtimeAdapter.selected?.workspaceOwned === null || artifact.runtimeAdapter.selected?.workspaceOwned === undefined ? 'not applicable' : artifact.runtimeAdapter.selected.workspaceOwned ? 'yes' : 'no'}`,
                '',
                '### Native Capability Check',
                '',
                ...artifact.runtimeAdapter.candidates.map(candidate => `- ${candidate.id}: ${candidate.available ? 'available' : 'unavailable'}; ${candidate.reason}`),
                ...(artifact.runtimeAdapter.selected?.commandTemplates.length
                    ? [
                        '',
                        '### Selected Adapter Command Vectors',
                        '',
                        ...artifact.runtimeAdapter.selected.commandTemplates.map(command => `- ${JSON.stringify([command.bin, ...command.args])}`),
                    ]
                    : []),
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
                `- Model profile: ${artifact.selectedDispatch.workerProfile?.modelProfile || 'not recorded'}`,
                `- Model: ${artifact.selectedDispatch.workerProfile?.model || 'harness default (not explicitly configured)'}`,
                `- Model selection: ${artifact.selectedDispatch.workerProfile?.modelSelectionSource || 'harness-default'}`,
                `- Model configuration source: ${artifact.selectedDispatch.workerProfile?.modelConfigurationSource || (artifact.selectedDispatch.workerProfile?.model ? 'target' : 'harness-default')}`,
                `- Observed model: ${artifact.runtimeAdapter?.selected?.modelSelection?.observedModel || 'unknown (no provider/usage evidence)'}`,
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
        const loopPlanSection = artifact.loopPlan
            ? [
                `- Primitive: ${artifact.loopPlan.primitive}`,
                `- Execution model: ${artifact.loopPlan.executionModel}`,
                `- Mode: ${artifact.loopPlan.mode}`,
                `- Controller action required: ${artifact.loopPlan.requiresControllerAction ? 'yes' : 'no'}`,
                ...(artifact.loopPlan.until ? [`- Until: ${artifact.loopPlan.until}`] : []),
                ...(artifact.loopPlan.interval ? [`- Interval: ${artifact.loopPlan.interval}`] : []),
                ...(artifact.loopPlan.maxIterations !== null ? [`- Max iterations: ${artifact.loopPlan.maxIterations}`] : []),
                `- Native loop capability: ${artifact.loopPlan.capability.nativeLoopCapability} (probe: ${artifact.loopPlan.capability.probeSource})`,
                ...(artifact.loopPlan.cliCommandPreview ? [`- CLI command preview: \`${artifact.loopPlan.cliCommandPreview}\``] : []),
                '',
                '### Loop Instructions',
                '',
                ...artifact.loopPlan.instructions.map(item => `- ${item}`),
            ].join('\n')
            : '- Not requested (default subagent primitive).';
        return [
            `# Runtime Adapter Launch Plan: ${artifact.feature}`,
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
            '## Loop / Agent Primitive Plan',
            '',
            loopPlanSection,
            '',
            '## Native Agent Dispatch',
            '',
            nativeAgent,
            '',
            '## Runtime Adapter Resolution',
            '',
            runtimeAdapter,
            '',
            '## Harness Adapter Packet',
            '',
            adapterPacket,
            '',
            '## External Agent Commands',
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
            '- Runtime adapter selection accepts only a current, target-bound model-native subagent capability.',
            '- OSpec does not probe Orca, PATH binaries, or agent CLIs and does not fall back to the current controller for executable work.',
            '- When native capability is unavailable or expires, dispatch blocks until the current model harness reports a fresh capability.',
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
                `  - Model profile: ${item.profile.modelProfile}`,
                `  - Model: ${item.profile.model || 'harness default (not explicitly configured)'}`,
                `  - Model selection: ${item.profile.modelSelectionSource}`,
                `  - Resolved target: ${item.profile.resolvedTarget || item.profile.targetToolMapping?.target || item.profile.recommendedTarget}`,
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
        return [
            `# Goal Bootstrap: ${artifact.feature}`,
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
            '',
            '## Debug Phase Evidence',
            '',
            debugPhases,
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
            '- This command writes a bootstrap snapshot and synchronizes the active Goal `state.json` control file.',
            '- It does not launch workers, sync worker status, run tests, inspect git, finalize, archive, push, merge, or edit project source files.',
            '- Use it when starting or resuming one active Goal so the next safe action is explicit.',
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
