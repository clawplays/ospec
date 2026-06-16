import { BaseCommand } from './BaseCommand';
import { WorkflowProfileId } from '../utils/WorkflowProfile';
export interface NewCommandOptions {
    flags?: string[];
    placement?: 'active' | 'queued';
    source?: string;
    workflowProfile?: WorkflowProfileId;
}
export declare class NewCommand extends BaseCommand {
    execute(featureName: string, rootDir?: string, options?: NewCommandOptions): Promise<void>;
    private normalizeFlags;
}
