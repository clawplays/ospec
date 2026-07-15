"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeExecutionAdapterService = void 0;
exports.createRuntimeExecutionAdapterService = createRuntimeExecutionAdapterService;
const NATIVE_TARGETS = Object.freeze({
    codex: {
        primitive: 'spawn_agent',
        dispatch: 'Call spawn_agent once per action packet in the current Codex session.',
        wait: 'Use wait_agent for the issued batch and keep child ownership bound to its returned id.',
        result: 'Record heartbeat and result evidence with the real Codex child id.',
    },
    gpt: {
        primitive: 'spawn_agent',
        dispatch: 'Call spawn_agent once per action packet in the current GPT/Codex session.',
        wait: 'Use wait_agent for the issued batch and keep child ownership bound to its returned id.',
        result: 'Record heartbeat and result evidence with the real GPT/Codex child id.',
    },
    claude: {
        primitive: 'Task',
        dispatch: 'Call the Claude Task tool once per action packet with a fresh subagent context.',
        wait: 'Wait for the native Task batch in the current Claude session.',
        result: 'Record heartbeat and result evidence with the real Claude Task id.',
    },
    gemini: {
        primitive: '@generalist',
        dispatch: 'Dispatch one Gemini @generalist subagent per action packet.',
        wait: 'Wait for the native @generalist batch in the current Gemini session.',
        result: 'Record heartbeat and result evidence with the real Gemini child id.',
    },
    opencode: {
        primitive: '@mention',
        dispatch: 'Dispatch one OpenCode @mention subagent per action packet.',
        wait: 'Wait for the native @mention batch in the current OpenCode session.',
        result: 'Record heartbeat and result evidence with the real OpenCode child id.',
    },
    cursor: {
        primitive: 'Agent',
        dispatch: 'Use the current Cursor session native Agent/task primitive once per action packet.',
        wait: 'Wait for the native Cursor child batch in the current session.',
        result: 'Record heartbeat and result evidence with the real Cursor child id.',
    },
    copilot: {
        primitive: 'Agent',
        dispatch: 'Use the current Copilot session native agent/task primitive once per action packet.',
        wait: 'Wait for the native Copilot child batch in the current session.',
        result: 'Record heartbeat and result evidence with the real Copilot child id.',
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
        const candidate = this.buildNativeCandidate(target, input.capability, now);
        const warnings = [];
        const legacyPreference = preference !== 'auto' && preference !== 'native';
        if (legacyPreference) {
            warnings.push(`Execution adapter preference "${preference}" was removed. OSpec now dispatches only through the current model harness native subagent API.`);
        }
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
    buildNativeCandidate(target, capability, now) {
        const definition = NATIVE_TARGETS[target];
        const reason = this.getAvailabilityReason(target, definition, capability, now);
        const available = reason === null;
        return {
            id: `${target}-harness-native`,
            kind: 'native',
            available,
            verified: available,
            reason: available
                ? `Current session-bound ${target} capability authorizes its native subagent adapter.`
                : reason || `Native subagent adapter for ${target} is unavailable.`,
            binary: null,
            workspaceOwned: null,
            supportsParallel: available,
            requiresControllerAction: true,
            commandTemplates: [],
            nativeSubagent: definition
                ? { target, ...definition }
                : null,
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
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
