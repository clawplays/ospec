import { BaseCommand } from './BaseCommand';
export declare class ProgressCommand extends BaseCommand {
    execute(featurePath?: string): Promise<void>;
}