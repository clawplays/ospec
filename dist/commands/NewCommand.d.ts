import { BaseCommand } from './BaseCommand';
import { WorkflowProfileId } from '../utils/WorkflowProfile';
import type { NativeLoopCapability } from '../services/CapabilityProbeService';
import type { LoopExecutionModel } from '../services/LoopService';
import type { TaskWorkerToolTarget } from '../services/TaskGraphExecutionService';
export type LoopSafetyLevel = 'L1' | 'L2' | 'L3';
export interface NewCommandOptions {
    flags?: string[];
    placement?: 'active' | 'queued';
    source?: string;
    workflowProfile?: WorkflowProfileId;
    /** Loop safety level for goal-profile changes (Stage B writes it into loop.json). */
    level?: LoopSafetyLevel;
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
    private normalizeFlags;
}
