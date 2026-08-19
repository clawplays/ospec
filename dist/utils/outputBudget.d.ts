/**
 * Uniform output budget for everything an agent reads.
 *
 * Phase 5 / F3. Every CLI command output, and every long free-text field an
 * agent hands us as evidence, is capped at a head plus a tail; the complete
 * text is written to `artifacts/spill/<ts>-<cmd>.txt` and the visible output
 * carries the path plus an instruction to `read`/`grep` it.
 *
 * This module is the ONLY implementation. `BaseCommand.runWithOutputBudget`
 * installs it once around the whole CLI dispatch, so no command opts in and no
 * command can drift. Commands never call the pruner for their own console
 * output.
 *
 * Two modes, because a head-plus-tail cut is only meaningful for prose:
 *
 *  - PROSE (default). The head streams through untouched, so a slow command
 *    still shows progress; once the head budget is spent the rest is buffered.
 *    Under the cap the output is byte-identical to what it always was. Over the
 *    cap the reader gets head + an unmissable notice + tail.
 *
 *  - STRUCTURED (`--json`, `--compact-json`, `--format json`, `--brief`).
 *    Cutting a machine-read record in half produces something that parses as
 *    nothing at all -- or worse, as the wrong thing -- so structured stdout is
 *    NEVER truncated. It is buffered whole and either emitted verbatim (under
 *    the cap) or replaced, in full, by a valid one-line JSON envelope carrying
 *    the spill path. A machine consumer that parses stdout therefore always
 *    gets valid JSON; the single extra case it must handle is
 *    `ospecOutputSpill === true`, meaning "the payload is in spillPath".
 *
 * `--brief` is in the structured set even though it emits `key=value` lines
 * rather than JSON. It reads like prose, but `ExecuteCommand.ts` says of it:
 * "`--brief`, whose output is parsed by controller loops". A prose cut through
 * a `--brief` line would hand a controller a malformed record with nothing to
 * signal that anything was dropped -- silent misreading, which is precisely the
 * failure the structured path exists to prevent. Over the cap a `--brief` run
 * emits the envelope instead: a controller that expects `graph=... tasks=...`
 * and gets `{"ospecOutputSpill":true,...}` fails loudly and can recover from
 * `spillPath`.
 *
 * The two modes have SEPARATE caps on purpose. A machine payload is legitimately
 * larger than anything a human reads, and merging the two knobs would force one
 * of the two to be wrong; `--max-output-chars` never changes the structured cap
 * and `--max-structured-output-chars` never changes the prose cap.
 */
/** Head budget before any truncation notice, in characters. */
export declare const DEFAULT_HEAD_OUTPUT_CHARS = 4096;
/** Tail budget kept after the truncation notice, in characters. */
export declare const DEFAULT_TAIL_OUTPUT_CHARS = 1024;
/** Total default budget: head + tail. */
export declare const DEFAULT_MAX_OUTPUT_CHARS: number;
/**
 * What the truncation notice itself costs, in characters.
 *
 * The notice is a banner, a character count, a spill path and an instruction --
 * around 640 characters in practice. That is a price worth paying to drop tens
 * of thousands of characters and worthless when dropping a handful: truncating
 * a 5,200-character output at a 5,120 cap would drop 80 characters and add 640,
 * so the "budgeted" output would be LARGER than the unbudgeted one. In a tool
 * whose entire purpose is spending fewer tokens, that is not a rounding error,
 * it is the feature working backwards.
 *
 * So truncation needs the drop to be worth the notice, and this is the
 * threshold: below `maxChars + this`, the output passes through whole. Set
 * slightly above the measured notice size so the exchange is never a loss.
 */
export declare const TRUNCATION_NOTICE_OVERHEAD_CHARS = 700;
/** Sentinel key on the structured-output envelope. Part of the CLI contract. */
export declare const OUTPUT_SPILL_ENVELOPE_KEY = "ospecOutputSpill";
/**
 * Version of the SPILL ENVELOPE SHAPE below -- nothing else.
 *
 * It is not the CLI version, not the package version, and not the version of
 * the payload the envelope points at. It changes only when a field is added to,
 * removed from, or reinterpreted in the envelope itself, so a consumer can
 * branch on it without having to guess what it counts. Named in full for that
 * reason: a bare `schemaVersion` next to a `version` field elsewhere in this
 * CLI's JSON is exactly the ambiguity a reader should not have to resolve.
 */
export declare const OUTPUT_SPILL_ENVELOPE_VERSION = 1;
/**
 * Cap for machine-read stdout. Deliberately a different number under a
 * different name from `DEFAULT_MAX_OUTPUT_CHARS`: a controller batch is
 * legitimately larger than anything a human reads, and spilling it costs the
 * consumer the extra file read that the batch protocol exists to remove. This
 * value is a backstop against an unbounded payload, not a routine path.
 */
export declare const DEFAULT_MAX_STRUCTURED_OUTPUT_CHARS = 32768;
/** Directory, relative to the working directory, that spill files land in. */
export declare const SPILL_DIR_RELATIVE_PATH: string;
export interface OutputBudget {
    /** Total characters kept in the visible output. 0 disables the budget. */
    maxChars: number;
    headChars: number;
    tailChars: number;
}
export interface SpillWriteResult {
    /** Path as it should be shown to the reader: relative when it is shorter. */
    displayPath: string;
    absolutePath: string;
}
export interface PrunedText {
    /** The text to show, with the notice and path hint already in it. */
    text: string;
    /** True when the input exceeded the budget and a spill file was written. */
    spilled: boolean;
    /** Where the complete text lives, or null when nothing was spilled. */
    spillPath: string | null;
    originalChars: number;
}
/**
 * Resolve the budget from an explicit value, the environment, or the defaults.
 *
 * `0`, `off`, `none` and `unlimited` all disable the budget outright, which is
 * the escape hatch for a human who genuinely wants the whole thing on screen.
 */
export declare function resolveOutputBudget(explicit?: number | null): OutputBudget;
/**
 * Resolve the SEPARATE cap that applies to machine-read stdout.
 *
 * Never falls back to `--max-output-chars`: a human shrinking their own console
 * output must not silently start spilling a controller's batch payload.
 */
export declare function resolveStructuredOutputBudget(explicit?: number | null): OutputBudget;
/**
 * Parse one `--max-output-chars` value. Returns null when the value is absent
 * or unparseable, so the caller can fall back instead of guessing a budget.
 */
export declare function parseMaxOutputCharsValue(raw: string | undefined | null): number | null;
export interface ParsedOutputBudgetArgs {
    /** argv with every budget flag removed. */
    args: string[];
    /** The requested prose budget, or null when the flag was not supplied. */
    maxOutputChars: number | null;
    /** The requested structured budget, or null when the flag was not supplied. */
    maxStructuredOutputChars: number | null;
}
/**
 * Pull the two budget flags out of argv before dispatch.
 *
 * They are global output-only flags, so they are stripped here rather than
 * taught to twenty-six argument parsers that would each reject them as unknown.
 */
export declare function extractOutputBudgetArgs(args: string[]): ParsedOutputBudgetArgs;
/**
 * Label a spill file by what produced it: `ospec loop run` -> `loop-run`.
 * Only the command and its action word are used, so a spill name never leaks a
 * path, a secret, or a free-text summary from the rest of argv.
 */
export declare function deriveCommandLabel(args: string[]): string;
/** A filesystem-safe, sortable timestamp: 20260817T101112123Z. */
export declare function spillTimestamp(now?: Date): string;
/**
 * Write the complete text to `artifacts/spill/<ts>-<cmd>.txt`.
 *
 * Throws on failure. Callers treat a failed spill as "do not truncate": losing
 * output is worse than spending tokens, so the budget yields rather than the
 * text disappearing.
 */
export declare function writeSpillFile(options: {
    text: string;
    commandLabel: string;
    rootDir?: string;
    suffix?: string;
    now?: Date;
}): SpillWriteResult;
/** Where spill files go. `OSPEC_SPILL_ROOT` exists so tests never write to cwd. */
export declare function resolveSpillRoot(): string;
/**
 * The truncation notice.
 *
 * It has to survive being skimmed by a model that is looking for the answer and
 * not for our bookkeeping, so it is banner-delimited, states the exact number of
 * characters dropped, and ends with the action to take.
 */
export declare function renderTruncationNotice(options: {
    originalChars: number;
    headChars: number;
    tailChars: number;
    spillPath: string;
}): string;
/**
 * The structured-output envelope.
 *
 * Emitted INSTEAD of an over-long machine-readable payload, never alongside it,
 * so stdout stays exactly one parseable JSON document.
 */
export declare function renderSpillEnvelope(options: {
    commandLabel: string;
    originalChars: number;
    maxChars: number;
    spillPath: string;
}): string;
/**
 * Is cutting this text actually cheaper than printing it?
 *
 * Only true when the text exceeds the cap by more than the notice costs. Both
 * the CLI pipeline and the evidence pruner ask this, so the answer cannot
 * differ between them. Structured output never asks: it is not cut at all.
 */
export declare function isTruncationWorthwhile(originalChars: number, budget: OutputBudget): boolean;
/**
 * Prune one free-text field: evidence summaries, worker report bodies, captured
 * command output. Same budget and same notice as CLI stdout, so an agent sees
 * one truncation contract everywhere.
 *
 * The return value is always a string, so this never changes the shape of the
 * record it is stored in.
 */
export declare function pruneTextWithSpill(text: string, options: {
    commandLabel: string;
    budget?: OutputBudget;
    rootDir?: string;
    suffix?: string;
}): PrunedText;
/**
 * Installs the budget around a whole CLI run. One instance per process.
 */
export declare class OutputBudgetInterceptor {
    /** Applies to prose stdout and to stderr, which is always prose. */
    private readonly proseBudget;
    /** Applies to machine-parsed stdout. Never derived from the prose budget. */
    private readonly structuredBudget;
    private readonly commandLabel;
    private readonly structured;
    private selfReducing;
    private readonly state;
    private readonly originals;
    private installed;
    private finished;
    private exitHandler;
    constructor(options: {
        proseBudget: OutputBudget;
        structuredBudget: OutputBudget;
        commandLabel: string;
        structured: boolean;
        selfReducing?: boolean;
    });
    /** The budget that governs one stream on this invocation. */
    private budgetFor;
    /**
     * Declare, at run time, that this command reduces its own over-cap payload.
     *
     * A self-reducing command is exempt from the cap ENTIRELY -- not raised,
     * bypassed. That is deliberate: a numeric race between this cap and the
     * command's own, larger reduction threshold would let the generic envelope
     * fire first and the semantic reduction never run. Bypassing cannot race.
     */
    declareSelfReducing(): void;
    install(): void;
    /**
     * Restore the real streams and emit whatever the budget still owes the
     * reader. Safe to call twice; the second call is a no-op.
     */
    finish(): void;
    private record;
    private finishSync;
    private flush;
}
/**
 * Opt this invocation out of the generic spill fallback, from inside a command.
 *
 * The registry declaration in `subcommandHelp.ts` is the answer of record --
 * it cannot rot, because adding a command means answering the question. This
 * function exists for the case the registry cannot express: a command that only
 * discovers at run time that it is emitting a self-reduced payload. Calling it
 * is a promise that the command has bounded its own output; the budget will not
 * cap, envelope or spill that stdout at any size.
 *
 * A no-op when no budget is installed, so a command may call it unconditionally.
 */
export declare function declareSelfReducingStructuredOutput(): void;
