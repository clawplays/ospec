"use strict";
/**
 * Runtime capability probe for harness loop primitives (Execution-Model Contract 2).
 *
 * The harness `/goal` / interval-loop primitives are NEVER assumed to exist; they are
 * probed at runtime. Stage A writes the result to a launch-plan snapshot; Stage B persists
 * it to `loop.json.capability`. `unknown`/`unsupported` always fall back, never block.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityProbeService = void 0;
exports.normalizeAgentPrimitive = normalizeAgentPrimitive;
exports.createCapabilityProbeService = createCapabilityProbeService;
function normalizeAgentPrimitive(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'goal' || normalized === 'loop') {
        return normalized;
    }
    return 'subagent';
}
/**
 * Confirmed native-goal support per target (2026-06 research). Targets absent here are
 * treated as `unsupported` for `goal`. Interval-loop primitives are deliberately NOT in this
 * table — they are probe-only, since `/loop`/`CronCreate` public CLI contracts are unconfirmed.
 */
const CONFIRMED_NATIVE_GOAL_TARGETS = new Set(['claude', 'codex', 'gpt']);
/** Targets that have an in-session interactive controller (so they can controller-self-loop). */
const INTERACTIVE_CONTROLLER_TARGETS = new Set([
    'claude', 'codex', 'gpt', 'gemini', 'opencode', 'cursor', 'copilot',
]);
class CapabilityProbeService {
    /**
     * Resolve the harness capability for a (target, primitive) pair. Pure + deterministic so it
     * is safe to call during launch planning and to snapshot into artifacts.
     */
    resolveHarnessCapability(input) {
        const target = String(input.target || '').trim().toLowerCase();
        const primitive = normalizeAgentPrimitive(input.primitive);
        const interactive = INTERACTIVE_CONTROLLER_TARGETS.has(target);
        if (primitive === 'subagent') {
            return {
                nativeLoopCapability: 'supported',
                probeSource: `subagent:${target || 'generic'}`,
                fallbackMode: 'none',
                warnings: [],
            };
        }
        if (primitive === 'goal') {
            if (CONFIRMED_NATIVE_GOAL_TARGETS.has(target)) {
                return {
                    nativeLoopCapability: 'supported',
                    probeSource: `static-table:${target}`,
                    fallbackMode: 'controller-self-loop',
                    warnings: [],
                };
            }
            // No confirmed native /goal — degrade, never block.
            return {
                nativeLoopCapability: 'unsupported',
                probeSource: `static-table:${target || 'generic'}`,
                fallbackMode: interactive ? 'emulated' : 'cli-driven',
                warnings: [
                    `Target "${target || 'generic'}" has no confirmed native /goal primitive; running ${interactive ? 'emulated-goal (controller + verify-driven loop)' : 'cli-driven (external agent CLI / deterministic commands)'}.`,
                ],
            };
        }
        // primitive === 'loop' — interval-loop primitives are always probe-only / unknown.
        return {
            nativeLoopCapability: 'unknown',
            probeSource: `probe-only:${target || 'generic'}`,
            fallbackMode: interactive ? 'controller-self-loop' : 'cli-driven',
            warnings: [
                `Interval-loop primitive for "${target || 'generic'}" is not asserted; using ${interactive ? 'controller self-loop (ControllerTickPlan)' : 'cli-driven loop watch'} unless a native primitive is detected at runtime.`,
            ],
        };
    }
}
exports.CapabilityProbeService = CapabilityProbeService;
function createCapabilityProbeService() {
    return new CapabilityProbeService();
}
