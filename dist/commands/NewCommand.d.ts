import { BaseCommand } from './BaseCommand';
import { WorkflowProfileId } from '../utils/WorkflowProfile';
export type LoopSafetyLevel = 'L1' | 'L2' | 'L3';
export interface NewCommandOptions {
    flags?: string[];
    placement?: 'active' | 'queued';
    source?: string;
    workflowProfile?: WorkflowProfileId;
    /** Loop safety level for goal-profile changes (Stage B writes it into loop.json). */
    level?: LoopSafetyLevel;
}
export declare class NewCommand extends BaseCommand {
    execute(featureName: string, rootDir?: string, options?: NewCommandOptions): Promise<void>;
    private normalizeFlags;
}
