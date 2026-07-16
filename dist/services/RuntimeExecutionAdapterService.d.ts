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
    pollIntervalMs: number;
    maxWaitMs: number;
    heartbeatBeforeDue: true;
    persistResultsIncrementally: true;
    retickAfterPoll: true;
}
export type RuntimeModelConfigurationSource = 'target' | 'default' | 'harness-default';
export type RuntimeModelSelectionControl = 'enforced' | 'advisory' | 'uncontrolled';
export type RuntimeObservedModelEvidenceSource = 'provider' | 'usage';
export type RuntimeParallelCapacitySource = 'harness-report' | 'registered-contract' | 'unavailable';
export interface RuntimeObservedModelEvidence {
    model: string;
    source: RuntimeObservedModelEvidenceSource;
    evidenceId: string;
}
export interface RuntimeExecutionModelSelectionInput {
    requestedModel?: string | null;
    configuredModel?: string | null;
    configurationSource?: RuntimeModelConfigurationSource;
}
/**
 * Optional execution metadata reported by the current native model harness.
 * The report is trusted only when its target and controller session match the
 * current session-bound HarnessCapability.
 */
export interface RuntimeNativeHarnessExecutionMetadata {
    target: string;
    controllerSessionReportedAt: string;
    modelSelectionControl?: RuntimeModelSelectionControl;
    observedModelEvidence?: RuntimeObservedModelEvidence | null;
    parallelism?: {
        supportsParallel: boolean;
        capacity?: number | null;
    } | null;
}
export interface RuntimeExecutionModelSelectionMetadata {
    requestedModel: string | null;
    configuredModel: string | null;
    observedModel: string | null;
    configurationSource: RuntimeModelConfigurationSource;
    selectionControl: RuntimeModelSelectionControl;
    observationEvidence: {
        source: RuntimeObservedModelEvidenceSource;
        evidenceId: string;
    } | null;
}
export interface RuntimeExecutionParallelismMetadata {
    supportsParallel: boolean;
    capacity: number | null;
    capacityKnown: boolean;
    source: RuntimeParallelCapacitySource;
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
    /** Additive in 1.8.3; older serialized candidates remain valid without it. */
    modelSelection?: RuntimeExecutionModelSelectionMetadata;
    /** Additive in 1.8.3; `supportsParallel` remains the compatibility field. */
    parallelism?: RuntimeExecutionParallelismMetadata;
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
    modelSelection?: RuntimeExecutionModelSelectionInput;
    nativeHarness?: RuntimeNativeHarnessExecutionMetadata | null;
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
    private resolveModelSelection;
    private normalizeObservedModelEvidence;
    private resolveParallelism;
    private getAvailabilityReason;
}
export declare function createRuntimeExecutionAdapterService(): RuntimeExecutionAdapterService;
export {};
