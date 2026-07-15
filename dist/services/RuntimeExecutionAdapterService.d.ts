/**
 * `orca`, `cli`, and `generic` are retained as legacy preference inputs so an
 * existing environment receives a migration diagnostic instead of an unknown
 * value. New resolutions are always native-only.
 */
export type RuntimeExecutionAdapterPreference = 'auto' | 'native' | 'orca' | 'cli' | 'generic';
export type RuntimeExecutionAdapterKind = 'native' | 'orca' | 'cli' | 'generic';
export interface RuntimeExecutionAdapterCommand {
    bin: string;
    args: string[];
    environment?: Record<string, string>;
}
export interface RuntimeNativeSubagentContract {
    target: string;
    primitive: string;
    dispatch: string;
    wait: string;
    result: string;
}
export interface RuntimeExecutionAdapterCandidate {
    id: string;
    kind: RuntimeExecutionAdapterKind;
    available: boolean;
    verified: boolean;
    reason: string;
    binary: string | null;
    workspaceOwned: boolean | null;
    supportsParallel: boolean;
    requiresControllerAction: boolean;
    commandTemplates: RuntimeExecutionAdapterCommand[];
    nativeSubagent?: RuntimeNativeSubagentContract | null;
}
export interface RuntimeExecutionAdapterResolution {
    version: string;
    preference: RuntimeExecutionAdapterPreference;
    strict: boolean;
    target: string;
    selectedAdapterId: string | null;
    selected: RuntimeExecutionAdapterCandidate | null;
    fallbackOrder: string[];
    candidates: RuntimeExecutionAdapterCandidate[];
    blocked: boolean;
    warnings: string[];
}
export interface RuntimeExecutionAdapterResolveInput {
    projectRoot: string;
    target: string;
    capability?: HarnessCapability | null;
    preference?: RuntimeExecutionAdapterPreference | string;
    strict?: boolean;
    requiresIndependentWorker?: boolean;
    env?: NodeJS.ProcessEnv;
    now?: Date;
    /** @deprecated Native adapter resolution is deterministic and no longer writes a probe cache. */
    cacheFilePath?: string;
}
interface CommandResult {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: string;
}
/** @deprecated Runtime adapter resolution never invokes commands. */
export type RuntimeAdapterCommandRunner = (bin: string, args: string[], options: {
    cwd: string;
    timeoutMs: number;
    environment?: Record<string, string>;
}) => CommandResult;
/**
 * Resolves the current model harness native subagent contract.
 *
 * OSpec deliberately does not probe Orca, PATH binaries, or agent CLIs. A
 * session-bound capability assertion from the active model harness is the only
 * authority that can make an adapter executable.
 */
import type { HarnessCapability } from './CapabilityProbeService';
export declare class RuntimeExecutionAdapterService {
    /**
     * The constructor parameters remain for source compatibility with 1.8.1
     * callers that injected probe functions. They are intentionally ignored.
     */
    constructor(_commandRunner?: RuntimeAdapterCommandRunner, _platform?: NodeJS.Platform, _pathExists?: (candidate: string) => boolean);
    resolve(input: RuntimeExecutionAdapterResolveInput): RuntimeExecutionAdapterResolution;
    private buildNativeCandidate;
    private getAvailabilityReason;
}
export declare function createRuntimeExecutionAdapterService(): RuntimeExecutionAdapterService;
export {};
