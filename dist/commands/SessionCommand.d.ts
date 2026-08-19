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
        apply?: boolean;
        target?: string;
        projectPath?: string;
    };
    writeSessionBrief(projectPath: string): Promise<SessionBriefResult>;
    writeSessionHook(projectPath: string): Promise<SessionHookResult>;
    private readPreviousSessionBrief;
    private readSessionCacheKey;
    /**
     * Everything in the brief except the timestamp that changes on every run.
     *
     * The brief is regenerated at every session entry, and it used to be
     * rewritten unconditionally -- so a cache HIT still churned the mtime of two
     * files inside .ospec/ and, on projects that commit them, put them in
     * `git status` for nothing. Comparing without `generatedAt` makes a hit a
     * true no-op while any real change to the brief still writes.
     */
    private stripSessionBriefTimestamp;
    private hashSessionCacheInput;
    private buildRecommendedCommands;
    private buildSessionHookHarnessTargets;
    private renderSessionBrief;
    private renderSessionHook;
    private renderUsingOSpec;
    /**
     * POSIX-sh quoting for the `integration.shell` line, which is a command a
     * human or an agent PASTES INTO A SHELL.
     *
     * M-misc6 replaced a double-quoted fallback here with single quotes: `!`
     * still triggers history expansion inside double quotes under bash, so a
     * project path containing `!` -- legal on every filesystem OSpec supports
     * -- expanded to something else or aborted with "event not found".
     *
     * That fix was made here and not in `TaskGraphExecutionService`, which kept
     * its own weaker double-quoted copy. The rule now lives in one place,
     * `utils/ShellQuote`, and both call sites import it; see that module's
     * header for the guarantee and its platform scope.
     *
     * This is the `shell` field only; `integration.powershell` is built
     * separately with `JSON.stringify`, which is correct for PowerShell.
     */
    private quoteShellArg;
    private printSessionBrief;
    private printClaudeHookInstall;
    private printSessionHook;
}
export {};
