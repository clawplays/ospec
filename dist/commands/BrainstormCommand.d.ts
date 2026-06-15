import { BaseCommand } from './BaseCommand';
interface BrainstormArgs {
    projectPath?: string;
    topic: string;
    changeName?: string;
    output?: string;
    visual: boolean;
    decisionGates: boolean;
}
export declare class BrainstormCommand extends BaseCommand {
    execute(...args: string[]): Promise<void>;
    parseArgs(args: string[]): BrainstormArgs;
    private writeBrainstorm;
    private ensureInitialized;
    private renderBrainstormReport;
    private renderVisualCompanion;
    private escapeHtml;
    private toFileSafeId;
    private printResult;
    private printHelp;
    private buildDecisionGates;
    private resolveDecisionGateChangePath;
    private writeDecisionGates;
    private quoteCommandArg;
}
export {};
