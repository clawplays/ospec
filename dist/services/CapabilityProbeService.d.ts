/**
 * Runtime capability probe for harness loop primitives (Execution-Model Contract 2).
 *
 * The harness `/goal` / interval-loop primitives are never assumed to exist. Harness
 * adapters can report a capability explicitly or through environment signals. An
 * unreported native-child capability remains unknown and cannot authorize controller dispatch.
 */
export type TaskAgentPrimitive = 'subagent' | 'goal' | 'loop';
export type NativeLoopCapability = 'supported' | 'unknown' | 'unsupported';
export type CapabilityFallbackMode = 'controller-self-loop' | 'cli-driven' | 'emulated' | 'none';
export declare const DEFAULT_CAPABILITY_SESSION_TTL_MS: number;
export interface HarnessCapability {
    /** Whether the requested primitive maps to a confirmed native harness primitive. */
    nativeLoopCapability: NativeLoopCapability;
    /** How the capability was determined (for example, explicit input or an environment signal). */
    probeSource: string;
    /** What to do when the native primitive is not available. */
    fallbackMode: CapabilityFallbackMode;
    /** Whether the harness explicitly reported an interactive in-session controller. */
    interactive: boolean;
    /** Whether the harness explicitly reported a native child-agent primitive. */
    nativeSubagentCapability: NativeLoopCapability;
    /** True only when controller-mode action dispatch is explicitly available. */
    controllerAvailable: boolean;
    /** When the current IDE session reported this capability snapshot. */
    reportedAt: string;
    /** Hard expiry for this session-bound capability snapshot. */
    expiresAt: string;
    /** Capability diagnostics surfaced to printLaunch / run-log. */
    warnings: string[];
}
export interface HarnessCapabilityProbeInput {
    target: string;
    primitive: TaskAgentPrimitive;
    /** Authoritative capability supplied by a harness adapter. */
    nativeLoopCapability?: NativeLoopCapability;
    /** Authoritative native child-agent capability supplied by a harness adapter. */
    nativeSubagentCapability?: NativeLoopCapability;
    /** Authoritative interactivity supplied by a harness adapter. */
    interactive?: boolean;
    /** Injectable runtime environment; defaults to process.env. */
    env?: NodeJS.ProcessEnv;
    /** Injectable clock used when persisting a session-bound snapshot. */
    now?: Date;
    /** Capability lifetime for the reporting IDE session. */
    sessionTtlMs?: number;
}
export declare function normalizeAgentPrimitive(value: unknown): TaskAgentPrimitive;
export declare class CapabilityProbeService {
    /**
     * Resolve the harness capability for a (target, primitive) pair. Explicit adapter input
     * wins over environment signals so callers can snapshot an authoritative runtime probe.
     */
    resolveHarnessCapability(input: HarnessCapabilityProbeInput): HarnessCapability;
}
export declare function createCapabilityProbeService(): CapabilityProbeService;
