/**
 * Runtime capability probe for harness loop primitives (Execution-Model Contract 2).
 *
 * The harness `/goal` / interval-loop primitives are NEVER assumed to exist; they are
 * probed at runtime. Stage A writes the result to a launch-plan snapshot; Stage B persists
 * it to `loop.json.capability`. `unknown`/`unsupported` always fall back, never block.
 */
export type TaskAgentPrimitive = 'subagent' | 'goal' | 'loop';
export type NativeLoopCapability = 'supported' | 'unknown' | 'unsupported';
export type CapabilityFallbackMode = 'controller-self-loop' | 'cli-driven' | 'emulated' | 'none';
export interface HarnessCapability {
    /** Whether the requested primitive maps to a confirmed native harness primitive. */
    nativeLoopCapability: NativeLoopCapability;
    /** How the capability was determined (e.g. "static-table:claude", "env:CODEX"). */
    probeSource: string;
    /** What to do when the native primitive is not available. */
    fallbackMode: CapabilityFallbackMode;
    /** Non-blocking advisories surfaced to printLaunch / run-log. */
    warnings: string[];
}
export declare function normalizeAgentPrimitive(value: unknown): TaskAgentPrimitive;
export declare class CapabilityProbeService {
    /**
     * Resolve the harness capability for a (target, primitive) pair. Pure + deterministic so it
     * is safe to call during launch planning and to snapshot into artifacts.
     */
    resolveHarnessCapability(input: {
        target: string;
        primitive: TaskAgentPrimitive;
    }): HarnessCapability;
}
export declare function createCapabilityProbeService(): CapabilityProbeService;
