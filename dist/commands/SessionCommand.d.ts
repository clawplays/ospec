import { BaseCommand } from './BaseCommand';
type SessionBriefCacheStatus = 'new' | 'hit' | 'refreshed';
interface SessionBriefResult {
    projectPath: string;
    artifactPath: string;
    reportPath: string;
    activeChangeCount: number;
    queuedChangeCount: number;
    cacheStatus: SessionBriefCacheStatus;
    cacheKey: string;
    nextInstruction: string;
}
interface SessionHookResult {
    projectPath: string;
    artifactPath: string;
    reportPath: string;
    usingOSpecPath: string;
    usingOSpecReportPath: string;
    sessionCommand: string;
    nextInstruction: string;
}
export declare class SessionCommand extends BaseCommand {
    execute(...args: string[]): Promise<void>;
    parseArgs(args: string[]): {
        help: boolean;
        hook: boolean;
        projectPath?: string;
    };
    writeSessionBrief(projectPath: string): Promise<SessionBriefResult>;
    writeSessionHook(projectPath: string): Promise<SessionHookResult>;
    private readPreviousSessionCacheKey;
    private hashSessionCacheInput;
    private buildRecommendedCommands;
    private buildSessionHookHarnessTargets;
    private renderSessionBrief;
    private renderSessionHook;
    private renderUsingOSpec;
    private quoteShellArg;
    private printSessionBrief;
    private printSessionHook;
}
export {};
