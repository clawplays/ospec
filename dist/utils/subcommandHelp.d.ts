export declare function isHelpAction(action?: string): boolean;
/**
 * A `--help`/`-h` anywhere in a subcommand's arguments is a help request, never
 * a positional value. Commands must print help and exit 0 without acting.
 */
export declare function hasHelpFlag(commandArgs: readonly string[]): boolean;
/**
 * Asking for help must never be mistaken for naming something. Both the flag
 * forms and the bare `help` word in the leading positional slot are help
 * requests, so `ospec goal help` prints help instead of creating a goal
 * literally named "help".
 */
export declare function isHelpRequest(commandArgs: readonly string[]): boolean;
export declare function getDocsHelpText(): string;
export declare function getSkillsHelpText(): string;
export declare function getSkillHelpText(): string;
export declare function getIndexHelpText(): string;
export declare function getWorkflowHelpText(): string;
export declare function getChangesHelpText(): string;
export declare function getQueueHelpText(): string;
export declare function getRunHelpText(): string;
export declare function getExecuteHelpText(): string;
export declare function getSessionHelpText(): string;
export declare function getInitUsageText(): string;
export declare function getInitHelpText(): string;
export declare function getFinalizeUsageText(): string;
export declare function getFinalizeHelpText(): string;
export declare function getNewLikeUsage(commandName: 'change' | 'new' | 'goal'): string;
export declare function getChangeHelpText(commandName?: 'change' | 'new'): string;
export declare function getGoalHelpText(): string;
export declare function getBrainstormHelpText(): string;
export declare function getPlanHelpText(): string;
export declare function getVerifyHelpText(): string;
export declare function getProgressHelpText(): string;
export declare function getArchiveHelpText(): string;
export declare function getStatusHelpText(): string;
export declare function getTriageHelpText(): string;
export declare function getLayoutHelpText(): string;
export declare function getUpdateUsageText(): string;
export declare function getUpdateHelpText(): string;
export declare function getLoopHelpText(): string;
export declare function getHelpTopicHelpText(): string;
export declare function getVersionHelpText(): string;
/**
 * Whether a command's DEFAULT stdout -- with no output flag at all -- is a
 * record something parses, or prose a person reads.
 *
 * Phase 5 / F3 needs this because the output budget cuts prose head-and-tail
 * and must never cut a record. Sniffing argv for `--json` cannot answer the
 * question: a command whose machine output is its default emits a document on
 * every invocation, including the failure path, with no flag to sniff. Asking
 * argv would classify such a command as prose and truncate its document into
 * garbage.
 *
 * So each command DECLARES it, and the field is REQUIRED: adding a command to
 * the registry without answering "is this parsed?" does not compile. Flags may
 * still force machine mode on top of a `never` declaration -- `--json`,
 * `--compact-json`, `--format json` and `--brief` all do -- but a flag is an
 * escalation, never the source of truth.
 */
export type MachineParsedStdout = 
/** No action of this command emits a machine-read record unless a flag asks. */
{
    mode: 'never';
}
/** Every invocation of this command emits a machine-read record. */
 | {
    mode: 'always';
    selfReducingActions?: readonly string[];
}
/**
 * These action words emit a machine-read record by default.
 * `selfReducingActions` names the subset that shrinks its own payload
 * semantically (paginating, dropping optional fields) and is therefore exempt
 * from the generic spill fallback: such a command keeps its payload inline at
 * ANY size, because spilling would cost its consumer the extra file read that
 * the command exists to avoid.
 */
 | {
    mode: 'actions';
    actions: readonly string[];
    selfReducingActions?: readonly string[];
};
export interface CliCommandHelpEntry {
    /** Command token exactly as typed on the command line. */
    name: string;
    /** Left column of the compact global help. */
    signature: string;
    /** One-line routing summary in the compact global help. */
    summary: string;
    /** Full help printed for `ospec <name> --help` and `ospec help <name>`. */
    help: () => string;
    /** Aliases are routable help topics but are not listed in the global help. */
    hidden?: boolean;
    /** Phase 5 / F3. Required: see MachineParsedStdout. */
    machineParsedStdout: MachineParsedStdout;
}
export interface StdoutContract {
    /** True when stdout must never be cut head-and-tail. */
    machineParsed: boolean;
    /**
     * True when the command reduces its own over-cap payload and must therefore
     * be left alone entirely -- no cap, no envelope, no spill.
     */
    selfReducing: boolean;
}
/**
 * Answer "is this invocation's stdout parsed by a machine?" from the registry
 * declaration first and the flags second.
 *
 * `args` is the full command line as typed, starting with the command word.
 */
export declare function resolveStdoutContract(args: readonly string[]): StdoutContract;
/**
 * Single source of truth for CLI routing help. Every `case` label in the
 * cli.ts command switch has exactly one entry here, so `--help` and
 * `ospec help <topic>` can never diverge from the commands that exist.
 */
export declare const CLI_COMMANDS: readonly CliCommandHelpEntry[];
export declare const CLI_COMMAND_NAMES: readonly string[];
export declare function getCommandHelpText(commandName: string): string | undefined;
/**
 * Compact routing help. Detail lives behind `ospec <command> --help` so the
 * default output stays cheap for agents to read.
 */
export declare function getGlobalHelpText(version: string): string;
export declare function getUnknownHelpTopicText(topic: string): string;
