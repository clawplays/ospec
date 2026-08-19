/**
 * F6: repeated-command guard.
 *
 * Output layer only. Nothing here reads or writes loop state, and nothing here
 * changes what the controller does -- it changes what the controller is *told*.
 * The audience is the agent reading `ospec loop run --once` output, so every
 * message names a different next move instead of repeating "this failed".
 *
 * The plan (`.local/TODO-execution-plan.zh-CN.md` F6) assumed the run log
 * carried a dispatch identity to group by. It does not: `LoopRunLogEntry` has
 * `trigger`, `exitCode`, `verifyPassed` and `summary`, and `actionId` is
 * regenerated on every retry, so grouping by it could never see a repeat. The
 * signature below is built from the three fields that do survive a retry.
 */
/** The subset of `LoopRunLogEntry` this guard reads. */
export interface RepeatedFailureLogEntry {
    event?: string;
    trigger?: string;
    exitCode?: number | null;
    verifyPassed?: boolean | null;
    summary?: string;
}
export interface RepeatedFailureAdvisory {
    /** How many consecutive tail entries share the signature. */
    count: number;
    /** The threshold whose wording was selected: 3, 5 or 8. */
    threshold: 3 | 5 | 8;
    /** The normalized signature the run shares. */
    signature: string;
    /** The line to put in front of the agent. */
    message: string;
}
/** How far back in the run log to look. Well past the highest threshold. */
export declare const REPEATED_FAILURE_SCAN_DEPTH = 40;
/**
 * Two retries of the same failing dispatch never produce byte-identical
 * summaries: the action id, the dispatch id and the timestamps all move. A raw
 * string compare would therefore never fire, which is the failure mode this
 * normalization exists to avoid. Everything volatile is folded to a placeholder
 * and everything descriptive is kept.
 */
export declare function normalizeFailureText(value: string): string;
/** True when this entry records something that failed. */
export declare function isFailureEntry(entry: RepeatedFailureLogEntry): boolean;
export declare function buildFailureSignature(entry: RepeatedFailureLogEntry): string;
/**
 * Returns an advisory when the tail of the run log is a run of >= 3 identical
 * failures, and `null` otherwise -- including when the tail is a success, when
 * the failures differ, and when there is no run log at all.
 */
export declare function detectRepeatedFailures(entries: RepeatedFailureLogEntry[]): RepeatedFailureAdvisory | null;
/** Parse the tail of a JSONL run log, skipping lines that do not parse. */
export declare function parseRunLogTail(contents: string, depth?: number): RepeatedFailureLogEntry[];
