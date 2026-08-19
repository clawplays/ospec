"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPEATED_FAILURE_SCAN_DEPTH = void 0;
exports.normalizeFailureText = normalizeFailureText;
exports.isFailureEntry = isFailureEntry;
exports.buildFailureSignature = buildFailureSignature;
exports.detectRepeatedFailures = detectRepeatedFailures;
exports.parseRunLogTail = parseRunLogTail;
/** Escalating thresholds, highest first so the strongest wording wins. */
const THRESHOLDS = [8, 5, 3];
/** How far back in the run log to look. Well past the highest threshold. */
exports.REPEATED_FAILURE_SCAN_DEPTH = 40;
const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:z|[+-]\d{2}:\d{2})?/g;
const LONG_HEX = /\b[0-9a-f]{7,}\b/g;
const ACTION_ORDINAL = /\b(action|item|dispatch|iteration|attempt|run|task)[-_]\d+\b/g;
/**
 * Two retries of the same failing dispatch never produce byte-identical
 * summaries: the action id, the dispatch id and the timestamps all move. A raw
 * string compare would therefore never fire, which is the failure mode this
 * normalization exists to avoid. Everything volatile is folded to a placeholder
 * and everything descriptive is kept.
 */
function normalizeFailureText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(ISO_TIMESTAMP, '<ts>')
        .replace(ACTION_ORDINAL, '$1-<n>')
        .replace(LONG_HEX, '<hash>')
        .replace(/\s+/g, ' ')
        .trim();
}
/** True when this entry records something that failed. */
function isFailureEntry(entry) {
    if (entry.verifyPassed === false)
        return true;
    return typeof entry.exitCode === 'number' && entry.exitCode !== 0;
}
/**
 * Which rows the adjacency run is measured over.
 *
 * A real run log interleaves three rows per iteration: a `state` row recording
 * that a batch was issued, a `tick_metrics` row, and the executor row carrying
 * the actual result. Only the last of those is an outcome. Counting the other
 * two would break the adjacency this guard depends on -- three identical
 * failures would read as "issued, metrics, failure, issued, metrics, failure"
 * and never reach three in a row, so the guard could never fire at all.
 *
 * The test for "is this an outcome" is whether the row carries either half of
 * an outcome: an exit code, or a verification verdict. Bookkeeping rows carry
 * neither. A *successful* outcome (exit code 0) is deliberately included, so a
 * success still breaks the run.
 */
function carriesOutcome(entry) {
    if (entry.event === 'tick_metrics')
        return false;
    return typeof entry.exitCode === 'number' || typeof entry.verifyPassed === 'boolean';
}
function buildFailureSignature(entry) {
    const exitCode = typeof entry.exitCode === 'number' ? String(entry.exitCode) : 'none';
    const verify = entry.verifyPassed === false ? 'verify-failed' : 'verify-n/a';
    return `${entry.trigger || 'unknown'}|${exitCode}|${verify}|${normalizeFailureText(entry.summary || '')}`;
}
function buildMessage(threshold, count, summary) {
    const quoted = summary ? ` Failure: "${summary}".` : '';
    if (threshold === 8) {
        return `Repeated-failure guard (${count}x): the same failure has now been recorded ${count} times in a row.${quoted}`
            + ' This loop is not converging, and another identical dispatch only spends tokens to learn nothing.'
            + ' Escalate instead: record BLOCKED or NEEDS_CONTEXT naming exactly what is missing, or pause the loop'
            + ' and hand a human the exact command and its output. Do not re-issue this action in its current form.';
    }
    if (threshold === 5) {
        return `Repeated-failure guard (${count}x): ${count} consecutive identical failures.${quoted}`
            + ' Four retries have produced no new information, so this is not a transient fault.'
            + ' Stop retrying and start narrowing: reproduce it by hand, cut it down to a single test or input,'
            + ' or re-run it with verbose output until the message changes. If nothing here can change it,'
            + ' record it as BLOCKED with the concrete blocker rather than dispatching again.';
    }
    return `Repeated-failure guard (${count}x): the last ${count} recorded outcomes are the same failure.${quoted}`
        + ' Re-issuing it unchanged will produce a fourth. Read the failing output itself before the next dispatch,'
        + ' and change one thing about it: the command, the target files, or the assumption behind them.';
}
/**
 * Returns an advisory when the tail of the run log is a run of >= 3 identical
 * failures, and `null` otherwise -- including when the tail is a success, when
 * the failures differ, and when there is no run log at all.
 */
function detectRepeatedFailures(entries) {
    const outcomes = entries.filter(carriesOutcome);
    const last = outcomes[outcomes.length - 1];
    if (!last || !isFailureEntry(last))
        return null;
    const signature = buildFailureSignature(last);
    let count = 0;
    for (let index = outcomes.length - 1; index >= 0; index -= 1) {
        const entry = outcomes[index];
        if (!isFailureEntry(entry) || buildFailureSignature(entry) !== signature)
            break;
        count += 1;
    }
    const threshold = THRESHOLDS.find(candidate => count >= candidate);
    if (!threshold)
        return null;
    return {
        count,
        threshold,
        signature,
        message: buildMessage(threshold, count, (last.summary || '').replace(/\s+/g, ' ').trim()),
    };
}
/** Parse the tail of a JSONL run log, skipping lines that do not parse. */
function parseRunLogTail(contents, depth = exports.REPEATED_FAILURE_SCAN_DEPTH) {
    const lines = String(contents || '').split('\n').filter(line => line.trim().length > 0);
    const entries = [];
    for (const line of lines.slice(-depth)) {
        try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object')
                entries.push(parsed);
        }
        catch {
            // A truncated or hand-edited line is not a reason to withhold the
            // advisory for the lines that do parse.
        }
    }
    return entries;
}
