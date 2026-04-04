import { BaseCommand } from './BaseCommand';
export declare class StatusCommand extends BaseCommand {
    execute(projectPath?: string): Promise<void>;
    private getRecommendedNextSteps;
}