import { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio, SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from 'child_process';
export interface SpawnSafeSpec {
    command: string;
    args: string[];
    options: SpawnOptionsWithoutStdio;
}
export interface SpawnSyncSafeSpec {
    command: string;
    args: string[];
    options: SpawnSyncOptionsWithStringEncoding;
}
/** True when cmd.exe will re-parse this target's arguments a second time. */
export declare function isBatchTarget(command: string): boolean;
/** cross-spawn's `escape.command`: escape metacharacters, do not quote. */
export declare function escapeCommandForCmd(command: string): string;
/**
 * cross-spawn's `escape.argument`.
 *
 * The two backslash rules are the CommandLineToArgvW rules: a run of
 * backslashes is only special when it is followed by a double quote, either a
 * literal one or the closing quote this function adds. In both cases the whole
 * run must be doubled.
 */
export declare function quoteForCmd(value: string, doubleEscapeMetaCharacters?: boolean): string;
/**
 * Resolve what cmd.exe would actually launch for `command`, so the caller can
 * tell a batch shim from a real executable. Mirrors cmd's own lookup: the
 * working directory first, then PATH, each probed with PATHEXT.
 *
 * Returns '' when nothing matches. Callers must treat that as "not a batch
 * file": cmd builtins and app-execution aliases resolve to nothing here and
 * none of them re-parse `%*`, while a genuinely missing command fails to start
 * either way.
 */
export declare function resolveWindowsCommandFile(command: string, env?: NodeJS.ProcessEnv, cwd?: string): string;
/**
 * Build the single `cmd /d /s /c "..."` argument. `doubleEscapeMetaCharacters`
 * defaults to whatever `command` itself looks like; pass it explicitly when the
 * caller has resolved the target through PATH/PATHEXT and knows better.
 */
export declare function composeWindowsCommandLine(command: string, args?: readonly string[], doubleEscapeMetaCharacters?: boolean): string;
export declare function createSpawnSafeSpec(command: string, args?: readonly string[], options?: SpawnOptionsWithoutStdio, platform?: NodeJS.Platform): SpawnSafeSpec;
export declare function createSpawnSyncSafeSpec(command: string, args: readonly string[], options: SpawnSyncOptionsWithStringEncoding, platform?: NodeJS.Platform): SpawnSyncSafeSpec;
export declare function spawnSafe(command: string, args?: readonly string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams;
export declare function spawnSyncSafe(command: string, args: readonly string[], options: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string>;
