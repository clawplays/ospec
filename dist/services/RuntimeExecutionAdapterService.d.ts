import type { HarnessCapability } from './CapabilityProbeService';
export type RuntimeExecutionAdapterPreference = 'auto' | 'orca' | 'native' | 'cli' | 'generic';
export type RuntimeExecutionAdapterKind = 'orca' | 'native' | 'cli' | 'generic';
export interface RuntimeExecutionAdapterCommand {
    bin: string;
    args: string[];
    environment?: Record<string, string>;
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
    cacheFilePath?: string;
}
interface CommandResult {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: string;
}
export type RuntimeAdapterCommandRunner = (bin: string, args: string[], options: {
    cwd: string;
    timeoutMs: number;
    environment?: Record<string, string>;
}) => CommandResult;
/**
 * Resolves the concrete worker adapter for the current runtime. Detection is capability-based:
 * an Orca process name is never sufficient without a callable CLI and current-worktree proof.
 */
export declare class RuntimeExecutionAdapterService {
    private readonly commandRunner;
    private readonly platform;
    private readonly pathExists;
    private readonly resolutionCache;
    constructor(commandRunner?: RuntimeAdapterCommandRunner, platform?: NodeJS.Platform, pathExists?: (candidate: string) => boolean);
    resolve(input: RuntimeExecutionAdapterResolveInput): RuntimeExecutionAdapterResolution;
    private probeOrca;
    private probeNative;
    private probeTargetCli;
    private buildGenericCandidate;
    private unavailable;
    private isCommandAvailable;
    private runCommand;
    private commandTemplate;
    private resolveInvocation;
    private pathApi;
    private cacheKey;
    private readPersistentCache;
    private writePersistentCache;
}
export declare function createRuntimeExecutionAdapterService(): RuntimeExecutionAdapterService;
export {};
