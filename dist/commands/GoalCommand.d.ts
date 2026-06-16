import { NewCommand, NewCommandOptions } from './NewCommand';
export declare class GoalCommand extends NewCommand {
    execute(featureName: string, rootDir?: string, options?: NewCommandOptions): Promise<void>;
}
