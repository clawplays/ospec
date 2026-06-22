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
    private resolveBrainstormLanguage;
    /** Body-content localization mirrors OSpec change templates: zh-CN vs en-US, with ja-JP/ar on en. */
    private copy;
    private localizeAxis;
    private printResult;
    private parseResolveArgs;
    private resolve;
    private printHelp;
    private buildDecisionGates;
    private resolveDecisionGateChangePath;
    private writeDecisionGates;
    private quoteCommandArg;
}
export {};
