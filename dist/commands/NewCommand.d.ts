import { BaseCommand } from './BaseCommand';
export interface NewCommandOptions {
    flags?: string[];
    placement?: 'active' | 'queued';
    source?: string;
}
export declare class NewCommand extends BaseCommand {
    execute(featureName: string, rootDir?: string, options?: NewCommandOptions): Promise<void>;
    private normalizeFlags;
}