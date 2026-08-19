import { BaseCommand } from './BaseCommand';
import { WorkflowProfileId } from '../utils/WorkflowProfile';
import type { NativeLoopCapability } from '../services/CapabilityProbeService';
import type { LoopExecutionModel } from '../services/LoopService';
import type { TaskWorkerToolTarget } from '../services/TaskGraphExecutionService';
export interface NewCommandOptions {
    flags?: string[];
    /** 7.5: feature document slugs this change touches; repeated `--feature`. */
    features?: string[];
    placement?: 'active' | 'queued';
    source?: string;
    workflowProfile?: WorkflowProfileId;
    /** Current IDE/harness target. This identifies an adapter; it does not imply capabilities. */
    target?: TaskWorkerToolTarget;
    /** Explicit execution model. CLI-driven mode is never selected merely from a target name. */
    executionModel?: LoopExecutionModel;
    /** Authoritative in-session interactivity reported by the current harness. */
    harnessInteractive?: boolean;
    /** Authoritative native child-agent capability reported by the current harness. */
    nativeSubagentCapability?: NativeLoopCapability;
    /** Authoritative native goal primitive capability reported by the current harness. */
    nativeGoalCapability?: NativeLoopCapability;
}
export declare class NewCommand extends BaseCommand {
    execute(featureName: string, rootDir?: string, options?: NewCommandOptions): Promise<void>;
    /**
     * Classic changes assume serial execution in a shared worktree; closeout
     * blocks on uncommitted files outside the change's declared scope. Surface
     * pre-existing dirt at creation time so unrelated concurrent work is
     * committed, stashed, or isolated before implementation starts.
     */
    private warnOnDirtyWorkspace;
    private acquireChangeCreationLease;
    private releaseChangeCreationLease;
    private readChangeCreationLockOwner;
    private isProcessAlive;
    private refreshChangeCreationLockIfOwned;
    private removeChangeCreationLockIfOwned;
    private removeCorruptChangeCreationLockIfUnchanged;
    /**
     * 7.5: tell the operator (and the AI reading this transcript) exactly what
     * landed in `features:` and what it might still want to add. Suggestions are
     * printed, never auto-accepted -- a wrong slug binds the change's
     * documentation obligation to the wrong section, which is worse than none.
     */
    private reportFeatureCapture;
    private normalizeFlags;
}
