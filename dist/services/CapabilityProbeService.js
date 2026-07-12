"use strict";
/**
 * Runtime capability probe for harness loop primitives (Execution-Model Contract 2).
 *
 * The harness `/goal` / interval-loop primitives are never assumed to exist. Harness
 * adapters can report a capability explicitly or through environment signals. An
 * unreported native-child capability remains unknown and cannot authorize controller dispatch.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityProbeService = exports.DEFAULT_CAPABILITY_SESSION_TTL_MS = void 0;
exports.normalizeAgentPrimitive = normalizeAgentPrimitive;
exports.createCapabilityProbeService = createCapabilityProbeService;
exports.DEFAULT_CAPABILITY_SESSION_TTL_MS = 30 * 60 * 1000;
function normalizeAgentPrimitive(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'goal' || normalized === 'loop') {
        return normalized;
    }
    return 'subagent';
}
function normalizeNativeLoopCapability(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'supported' || normalized === 'unknown' || normalized === 'unsupported') {
        return normalized;
    }
    return null;
}
function normalizeBooleanSignal(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
        return true;
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no') {
        return false;
    }
    return null;
}
class CapabilityProbeService {
    /**
     * Resolve the harness capability for a (target, primitive) pair. Explicit adapter input
     * wins over environment signals so callers can snapshot an authoritative runtime probe.
     */
    resolveHarnessCapability(input) {
        const target = String(input.target || '').trim().toLowerCase();
        const primitive = normalizeAgentPrimitive(input.primitive);
        const env = input.env ?? process.env;
        const envInteractive = normalizeBooleanSignal(env.OSPEC_HARNESS_INTERACTIVE);
        const interactive = typeof input.interactive === 'boolean'
            ? input.interactive
            : envInteractive ?? false;
        const inputSubagentCapability = normalizeNativeLoopCapability(input.nativeSubagentCapability);
        const envSubagentCapability = normalizeNativeLoopCapability(env.OSPEC_NATIVE_SUBAGENT_CAPABILITY);
        const nativeSubagentCapability = inputSubagentCapability ?? envSubagentCapability ?? 'unknown';
        const now = input.now ?? new Date();
        const sessionTtlMs = Number.isFinite(input.sessionTtlMs) && Number(input.sessionTtlMs) > 0
            ? Number(input.sessionTtlMs)
            : exports.DEFAULT_CAPABILITY_SESSION_TTL_MS;
        const reportedAt = now.toISOString();
        const expiresAt = new Date(now.getTime() + sessionTtlMs).toISOString();
        const controllerAvailable = interactive && nativeSubagentCapability === 'supported';
        if (primitive === 'subagent') {
            const probeSource = inputSubagentCapability
                ? 'input:nativeSubagentCapability'
                : envSubagentCapability
                    ? 'env:OSPEC_NATIVE_SUBAGENT_CAPABILITY'
                    : `runtime-unreported:${target || 'generic'}`;
            return {
                nativeLoopCapability: nativeSubagentCapability,
                probeSource,
                fallbackMode: 'none',
                interactive,
                nativeSubagentCapability,
                controllerAvailable,
                reportedAt,
                expiresAt,
                warnings: nativeSubagentCapability === 'supported'
                    ? []
                    : [`Native subagent capability for "${target || 'generic'}" is ${nativeSubagentCapability}; executable controller dispatch is disabled until the harness reports support.`],
            };
        }
        const inputCapability = normalizeNativeLoopCapability(input.nativeLoopCapability);
        const primitiveEnvKey = primitive === 'goal'
            ? 'OSPEC_NATIVE_GOAL_CAPABILITY'
            : 'OSPEC_NATIVE_LOOP_CAPABILITY';
        const envCapability = normalizeNativeLoopCapability(env[primitiveEnvKey]);
        const capability = inputCapability ?? envCapability ?? 'unknown';
        const probeSource = inputCapability
            ? 'input:nativeLoopCapability'
            : envCapability
                ? `env:${primitiveEnvKey}`
                : `runtime-unreported:${target || 'generic'}`;
        const fallbackMode = controllerAvailable ? 'controller-self-loop' : 'none';
        const warnings = [];
        if (capability !== 'supported') {
            warnings.push(`${primitive === 'goal' ? 'Goal' : 'Interval-loop'} capability for "${target || 'generic'}" is ${capability}.`);
        }
        if (!controllerAvailable) {
            warnings.push(`Controller dispatch is unavailable: interactive=${interactive}, nativeSubagents=${nativeSubagentCapability}. Report explicit harness capabilities or opt into CLI-driven execution.`);
        }
        return {
            nativeLoopCapability: capability,
            probeSource,
            fallbackMode,
            interactive,
            nativeSubagentCapability,
            controllerAvailable,
            reportedAt,
            expiresAt,
            warnings,
        };
    }
}
exports.CapabilityProbeService = CapabilityProbeService;
function createCapabilityProbeService() {
    return new CapabilityProbeService();
}
