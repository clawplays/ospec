import { BaseCommand } from './BaseCommand';
export declare class VerifyCommand extends BaseCommand {
    execute(featurePath?: string): Promise<void>;
}