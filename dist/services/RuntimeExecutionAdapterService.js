"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeExecutionAdapterService = void 0;
exports.createRuntimeExecutionAdapterService = createRuntimeExecutionAdapterService;
const NATIVE_POLL_INTERVAL_MS = 30 * 1000;
const NATIVE_MAX_WAIT_MS = 60 * 1000;
const NATIVE_TARGETS = Object.freeze({
    codex: {
        primitive: 'spawn_agent',
        dispatch: 'Call spawn_agent once per action packet in the current Codex session.',
        wait: 'Use wait_agent with a timeout no greater than maxWaitMs. Never make one indefinite wait; return after each bounded poll.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    gpt: {
        primitive: 'spawn_agent',
        dispatch: 'Call spawn_agent once per action packet in the current GPT/Codex session.',
        wait: 'Use wait_agent with a timeout no greater than maxWaitMs. Never make one indefinite wait; return after each bounded poll.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    claude: {
        primitive: 'Task',
        dispatch: 'Call the Claude Task tool once per action packet with a fresh subagent context.',
        wait: 'Use background Task execution with bounded polling when available. Never make one indefinite wait; return control within maxWaitMs.',
        result: 'Before heartbeatDueAt, refresh every running Task heartbeat. Persist each finished Task result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    gemini: {
        primitive: '@generalist',
        dispatch: 'Dispatch one Gemini @generalist subagent per action packet.',
        wait: 'Poll the native @generalist batch for no more than maxWaitMs at a time. Never make one indefinite wait.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    opencode: {
        primitive: '@mention',
        dispatch: 'Dispatch one OpenCode @mention subagent per action packet.',
        wait: 'Poll the native @mention batch for no more than maxWaitMs at a time. Never make one indefinite wait.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    cursor: {
        primitive: 'Agent',
        dispatch: 'Use the current Cursor session native Agent/task primitive once per action packet.',
        wait: 'Poll the native Cursor child batch for no more than maxWaitMs at a time. Never make one indefinite wait.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
    copilot: {
        primitive: 'Agent',
        dispatch: 'Use the current Copilot session native agent/task primitive once per action packet.',
        wait: 'Poll the native Copilot child batch for no more than maxWaitMs at a time. Never make one indefinite wait.',
        result: 'Before heartbeatDueAt, refresh every running child heartbeat. Persist each finished child result immediately, then tick OSpec again.',
        supportsParallel: true,
    },
});
/**
 * Resolves the current model harness native subagent contract.
 *
 * OSpec deliberately does not probe Orca, PATH binaries, or agent CLIs. A
 * session-bound capability assertion from the active model harness is the only
 * authority that can make an adapter executable.
 */
class RuntimeExecutionAdapterService {
    /**
     * The constructor parameters remain for source compatibility with 1.8.1
     * callers that injected probe functions. They are intentionally ignored.
     */
    constructor(_commandRunner, _platform, _pathExists) { }
    resolve(input) {
        const env = input.env ?? process.env;
        const target = normalizeTarget(input.target);
        const preference = normalizePreference(input.preference ?? env.OSPEC_EXECUTION_ADAPTER);
        const strict = input.strict ?? normalizeBoolean(env.OSPEC_EXECUTION_ADAPTER_STRICT) ?? false;
        const now = input.now ?? new Date();
        const built = this.buildNativeCandidate(target, input.capability, input.modelSelection, input.nativeHarness, now);
        const candidate = built.candidate;
        const warnings = [];
        const legacyPreference = preference !== 'auto' && preference !== 'native';
        if (legacyPreference) {
            warnings.push(`Execution adapter preference "${preference}" was removed. OSpec now dispatches only through the current model harness native subagent API.`);
        }
        warnings.push(...built.warnings);
        const selected = candidate.available && !(legacyPreference && strict)
            ? candidate
            : null;
        if (legacyPreference && strict) {
            warnings.push('Strict legacy adapter selection cannot fall back to native execution; change the preference to "native" or "auto".');
        }
        if (!selected) {
            warnings.push(candidate.reason);
            warnings.push(input.requiresIndependentWorker
                ? 'Independent work requires a fresh native subagent in the current model session.'
                : 'Executable work requires a current model session with native subagent support.');
        }
        return {
            version: '2.0',
            preference,
            strict,
            target,
            selectedAdapterId: selected?.id || null,
            selected,
            fallbackOrder: [candidate.id],
            candidates: [candidate],
            blocked: selected === null,
            warnings: unique(warnings),
        };
    }
    buildNativeCandidate(target, capability, modelInput, nativeHarness, now) {
        const definition = NATIVE_TARGETS[target];
        const reason = this.getAvailabilityReason(target, definition, capability, now);
        const available = reason === null;
        const metadataWarnings = [];
        const harnessMetadataCurrent = available
            && Boolean(nativeHarness)
            && normalizeTarget(nativeHarness?.target) === target
            && nativeHarness?.controllerSessionReportedAt === capability?.reportedAt;
        if (nativeHarness && !harnessMetadataCurrent) {
            metadataWarnings.push('Native harness execution metadata was ignored because it is not bound to the current target and controller session.');
        }
        const modelSelection = this.resolveModelSelection(modelInput, harnessMetadataCurrent ? nativeHarness : null, metadataWarnings);
        const parallelism = this.resolveParallelism(available, definition, harnessMetadataCurrent ? nativeHarness : null, metadataWarnings);
        const candidate = {
            id: `${target}-harness-native`,
            kind: 'native',
            available,
            verified: available,
            reason: available
                ? `Current session-bound ${target} capability authorizes its native subagent adapter.`
                : reason || `Native subagent adapter for ${target} is unavailable.`,
            binary: null,
            workspaceOwned: null,
            supportsParallel: parallelism.supportsParallel,
            requiresControllerAction: true,
            commandTemplates: [],
            nativeSubagent: definition
                ? {
                    target,
                    primitive: definition.primitive,
                    dispatch: definition.dispatch,
                    wait: definition.wait,
                    result: definition.result,
                    pollIntervalMs: NATIVE_POLL_INTERVAL_MS,
                    maxWaitMs: NATIVE_MAX_WAIT_MS,
                    heartbeatBeforeDue: true,
                    persistResultsIncrementally: true,
                    retickAfterPoll: true,
                }
                : null,
            modelSelection,
            parallelism,
        };
        return { candidate, warnings: metadataWarnings };
    }
    resolveModelSelection(input, nativeHarness, warnings) {
        const requestedModel = nonEmpty(input?.requestedModel);
        const configuredCandidate = nonEmpty(input?.configuredModel);
        const configuredSource = input?.configurationSource;
        const configuredModel = configuredCandidate && (configuredSource === 'target' || configuredSource === 'default')
            ? configuredCandidate
            : null;
        if (configuredCandidate && !configuredModel) {
            warnings.push('Configured model metadata was ignored because its configuration source is not target or default.');
        }
        const observation = this.normalizeObservedModelEvidence(nativeHarness?.observedModelEvidence);
        if (nativeHarness?.observedModelEvidence && !observation) {
            warnings.push('Observed model metadata was ignored because provider/usage evidence and a non-empty evidence ID are required.');
        }
        if (nativeHarness?.modelSelectionControl !== undefined
            && !['enforced', 'advisory', 'uncontrolled'].includes(String(nativeHarness.modelSelectionControl))) {
            warnings.push('Native model selection control was ignored because it is not enforced, advisory, or uncontrolled.');
        }
        return {
            requestedModel,
            configuredModel,
            observedModel: observation?.model || null,
            configurationSource: configuredModel ? configuredSource : 'harness-default',
            selectionControl: normalizeSelectionControl(nativeHarness?.modelSelectionControl),
            observationEvidence: observation
                ? { source: observation.source, evidenceId: observation.evidenceId }
                : null,
        };
    }
    normalizeObservedModelEvidence(value) {
        const model = nonEmpty(value?.model);
        const evidenceId = nonEmpty(value?.evidenceId);
        const source = value?.source;
        return model && evidenceId && (source === 'provider' || source === 'usage')
            ? { model, evidenceId, source }
            : null;
    }
    resolveParallelism(available, definition, nativeHarness, warnings) {
        if (!available || !definition) {
            return { supportsParallel: false, capacity: null, capacityKnown: false, source: 'unavailable' };
        }
        const report = nativeHarness?.parallelism;
        if (!report) {
            return {
                supportsParallel: definition.supportsParallel,
                capacity: null,
                capacityKnown: false,
                source: 'registered-contract',
            };
        }
        const capacity = normalizeParallelCapacity(report.capacity);
        if (report.capacity !== undefined && report.capacity !== null && capacity === null) {
            warnings.push('Native parallel capacity was ignored because it is not a positive integer.');
        }
        if (report.supportsParallel && capacity === 1) {
            warnings.push('Native harness reported parallel support with capacity 1; execution is treated as serial.');
        }
        return {
            supportsParallel: report.supportsParallel && capacity !== 1,
            capacity,
            capacityKnown: capacity !== null,
            source: 'harness-report',
        };
    }
    getAvailabilityReason(target, definition, capability, now) {
        if (!definition) {
            return `Target "${target}" has no registered model-native subagent primitive.`;
        }
        if (!capability) {
            return `No session-bound native-subagent capability was reported for target ${target}.`;
        }
        if (normalizeTarget(capability.target) !== target) {
            return `Capability target "${capability.target || 'unbound'}" does not match requested target "${target}".`;
        }
        if (capability.interactive !== true
            || capability.controllerAvailable !== true
            || capability.nativeSubagentCapability !== 'supported') {
            return `Native subagent capability for target ${target} is not currently authorized.`;
        }
        const reportedAt = Date.parse(capability.reportedAt);
        const expiresAt = Date.parse(capability.expiresAt);
        if (!Number.isFinite(reportedAt) || !Number.isFinite(expiresAt)) {
            return `Native subagent capability for target ${target} has an invalid session lifetime.`;
        }
        if (expiresAt <= reportedAt) {
            return `Native subagent capability for target ${target} has a non-positive session lifetime.`;
        }
        if (reportedAt > now.getTime()) {
            return `Native subagent capability for target ${target} is future-dated and cannot authorize this session.`;
        }
        if (expiresAt <= now.getTime()) {
            return `Native subagent capability for target ${target} expired at ${capability.expiresAt}.`;
        }
        return null;
    }
}
exports.RuntimeExecutionAdapterService = RuntimeExecutionAdapterService;
function createRuntimeExecutionAdapterService() {
    return new RuntimeExecutionAdapterService();
}
function normalizeTarget(value) {
    return String(value || 'generic').trim().toLowerCase() || 'generic';
}
function normalizePreference(value) {
    const normalized = String(value || 'auto').trim().toLowerCase();
    return normalized === 'native' || normalized === 'orca' || normalized === 'cli' || normalized === 'generic'
        ? normalized
        : 'auto';
}
function normalizeBoolean(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(normalized))
        return true;
    if (['0', 'false', 'no'].includes(normalized))
        return false;
    return null;
}
function nonEmpty(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}
function normalizeSelectionControl(value) {
    return value === 'enforced' || value === 'advisory' ? value : 'uncontrolled';
}
function normalizeParallelCapacity(value) {
    const capacity = typeof value === 'number' ? value : Number.NaN;
    return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
}
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
