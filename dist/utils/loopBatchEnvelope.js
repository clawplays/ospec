"use strict";
/**
 * Envelope parser for `ospec loop step --batch-file`.
 *
 * Kept out of LoopService and BaseCommand on purpose: the batch protocol (track
 * A) must not reach into the evidence/result record shape (track C) or the
 * output pipeline (track B). This module only turns bytes into a validated
 * in-memory envelope; every field it accepts is forwarded verbatim.
 *
 * The one rule that drove the whole design: a mis-keyed or truncated envelope
 * must fail LOUDLY. An envelope that quietly degraded into "zero results, tick
 * anyway" would look like a healthy controller round while silently burning a
 * no-progress increment, and nothing downstream could tell the difference.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopBatchEnvelopeError = exports.LOOP_BATCH_ENVELOPE_VERSIONS = exports.LOOP_BATCH_ENVELOPE_KEYS = exports.LOOP_BATCH_CLAIM_FIELDS = exports.LOOP_BATCH_RESULT_FIELDS = void 0;
exports.parseLoopBatchEnvelope = parseLoopBatchEnvelope;
/** Fields a batch result item may carry. Kept as data so error text can list them. */
exports.LOOP_BATCH_RESULT_FIELDS = [
    'actionItemId',
    'executorId',
    'exitCode',
    'timedOut',
    'signal',
    'infraFailure',
    'tokensUsed',
    'summary',
    'evidencePaths',
];
exports.LOOP_BATCH_CLAIM_FIELDS = ['actionItemId', 'executorId', 'leaseMs'];
exports.LOOP_BATCH_ENVELOPE_KEYS = ['version', 'changePath', 'claims', 'results', 'finalize'];
exports.LOOP_BATCH_ENVELOPE_VERSIONS = ['1'];
/**
 * A validation failure carrying every problem found, not just the first.
 *
 * The consumer of this text is an agent deciding what to edit, so each problem
 * is emitted as pointer / expected / found / fix rather than as a schema dump.
 */
class LoopBatchEnvelopeError extends Error {
    constructor(source, problems) {
        const heading = problems.length === 1
            ? `Batch envelope ${source} is invalid (1 problem); nothing was applied.`
            : `Batch envelope ${source} is invalid (${problems.length} problems); nothing was applied.`;
        super([
            heading,
            ...problems.map(problem => `  - ${problem}`),
            `Accepted envelope keys: ${exports.LOOP_BATCH_ENVELOPE_KEYS.join(', ')}.`,
            `Accepted result item fields: ${exports.LOOP_BATCH_RESULT_FIELDS.join(', ')}.`,
        ].join('\n'));
        this.name = 'LoopBatchEnvelopeError';
        this.problems = problems;
    }
}
exports.LoopBatchEnvelopeError = LoopBatchEnvelopeError;
function describeType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'an array';
    const kind = typeof value;
    return `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}`;
}
function describeFound(value) {
    if (value === undefined)
        return 'missing';
    if (typeof value === 'string')
        return `the string ${JSON.stringify(value)}`;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null)
        return `${JSON.stringify(value)}`;
    return describeType(value);
}
/**
 * Parses and fully validates a batch envelope.
 *
 * @param raw    the raw bytes read from `--batch-file` (or stdin)
 * @param source a human label for the bytes, used verbatim in error text
 * @throws LoopBatchEnvelopeError listing every problem found
 */
function parseLoopBatchEnvelope(raw, source) {
    const text = String(raw ?? '');
    if (!text.trim()) {
        throw new LoopBatchEnvelopeError(source, [
            'the batch envelope is empty. An empty payload is never read as "no results"; send an explicit {"results": []} when a round finished nothing.',
        ]);
    }
    let document;
    try {
        document = JSON.parse(text);
    }
    catch (error) {
        throw new LoopBatchEnvelopeError(source, [
            `the batch envelope is not valid JSON: ${error?.message || error}. fix: send one JSON object (or a bare array of result items).`,
        ]);
    }
    const problems = [];
    let rawClaims = [];
    let rawResults;
    let version = '1';
    let changePath = null;
    let finalize = true;
    if (Array.isArray(document)) {
        // Shorthand: a bare array is the results list. The plan's own example
        // uses this shape, so accepting it is not a nicety.
        rawResults = document;
    }
    else if (!document || typeof document !== 'object') {
        throw new LoopBatchEnvelopeError(source, [
            `/: expected an object with a "results" array, or a bare array of result items; found ${describeType(document)}.`,
        ]);
    }
    else {
        const envelope = document;
        const unknownKeys = Object.keys(envelope).filter(key => !exports.LOOP_BATCH_ENVELOPE_KEYS.includes(key));
        for (const key of unknownKeys) {
            problems.push(`/${key}: unknown envelope key. expected: one of ${exports.LOOP_BATCH_ENVELOPE_KEYS.join(', ')}. fix: rename or remove it — a near-miss key is never read as an empty batch.`);
        }
        if (envelope.version !== undefined) {
            if (typeof envelope.version !== 'string' || !exports.LOOP_BATCH_ENVELOPE_VERSIONS.includes(envelope.version)) {
                problems.push(`/version: expected one of ${exports.LOOP_BATCH_ENVELOPE_VERSIONS.map(item => JSON.stringify(item)).join(', ')}. found: ${describeFound(envelope.version)}. fix: set "version": "1" or drop the key.`);
            }
            else {
                version = envelope.version;
            }
        }
        if (envelope.changePath !== undefined) {
            if (typeof envelope.changePath !== 'string' || !envelope.changePath.trim()) {
                problems.push(`/changePath: expected a non-empty path string. found: ${describeFound(envelope.changePath)}. fix: drop the key to use the resolved goal path.`);
            }
            else {
                changePath = envelope.changePath.trim();
            }
        }
        if (envelope.finalize !== undefined) {
            if (typeof envelope.finalize !== 'boolean') {
                problems.push(`/finalize: expected true or false. found: ${describeFound(envelope.finalize)}. fix: omit it for the default (true = finalize with the durable-evidence gate).`);
            }
            else {
                finalize = envelope.finalize;
            }
        }
        if (envelope.claims !== undefined)
            rawClaims = envelope.claims;
        rawResults = envelope.results;
        if (envelope.results === undefined && envelope.claims === undefined) {
            problems.push('/: the envelope carries neither "results" nor "claims". expected: at least one of them, even if empty. found: neither. fix: send {"results": []} to tick with nothing finished — a missing key is never read as an empty batch.');
        }
        if (envelope.results === undefined)
            rawResults = [];
    }
    const claims = [];
    if (!Array.isArray(rawClaims)) {
        problems.push(`/claims: expected an array of claim items. found: ${describeType(rawClaims)}. fix: wrap it in [ ].`);
    }
    else {
        rawClaims.forEach((entry, index) => {
            const pointer = `/claims/${index}`;
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                problems.push(`${pointer}: expected an object with ${exports.LOOP_BATCH_CLAIM_FIELDS.join(', ')}. found: ${describeType(entry)}.`);
                return;
            }
            const item = entry;
            for (const key of Object.keys(item)) {
                if (!exports.LOOP_BATCH_CLAIM_FIELDS.includes(key)) {
                    problems.push(`${pointer}/${key}: unknown claim field. expected: one of ${exports.LOOP_BATCH_CLAIM_FIELDS.join(', ')}. fix: remove it.`);
                }
            }
            const actionItemId = requireNonEmptyString(problems, pointer, 'actionItemId', item.actionItemId, 'the action item id emitted by the previous tick');
            const executorId = requireNonEmptyString(problems, pointer, 'executorId', item.executorId, 'the real child id from the native subagent dispatch');
            let leaseMs;
            if (item.leaseMs !== undefined) {
                if (!Number.isInteger(item.leaseMs) || item.leaseMs <= 0) {
                    problems.push(`${pointer}/leaseMs: expected a positive integer of milliseconds. found: ${describeFound(item.leaseMs)}. fix: drop it to take the default lease.`);
                }
                else {
                    leaseMs = item.leaseMs;
                }
            }
            if (actionItemId && executorId)
                claims.push({ actionItemId, executorId, ...(leaseMs === undefined ? {} : { leaseMs }) });
        });
    }
    const results = [];
    if (!Array.isArray(rawResults)) {
        problems.push(`/results: expected an array of result items (send [] for "nothing finished"). found: ${describeType(rawResults)}. fix: wrap it in [ ].`);
    }
    else {
        rawResults.forEach((entry, index) => {
            const pointer = `/results/${index}`;
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                problems.push(`${pointer}: expected an object with ${exports.LOOP_BATCH_RESULT_FIELDS.join(', ')}. found: ${describeType(entry)}.`);
                return;
            }
            const parsed = parseResultItem(problems, pointer, entry);
            if (parsed)
                results.push(parsed);
        });
    }
    const seen = new Set();
    for (const result of results) {
        if (seen.has(result.actionItemId)) {
            problems.push(`/results: action item ${result.actionItemId} appears more than once. expected: at most one result per action item. fix: keep the authoritative result and drop the duplicate.`);
        }
        seen.add(result.actionItemId);
    }
    if (problems.length > 0)
        throw new LoopBatchEnvelopeError(source, problems);
    return { version, changePath, claims, results, finalize };
}
function requireNonEmptyString(problems, pointer, field, value, hint) {
    if (typeof value === 'string' && value.trim())
        return value.trim();
    problems.push(`${pointer}/${field}: expected a non-empty string (${hint}). found: ${describeFound(value)}.`);
    return null;
}
function parseResultItem(problems, pointer, item) {
    const before = problems.length;
    for (const key of Object.keys(item)) {
        if (!exports.LOOP_BATCH_RESULT_FIELDS.includes(key)) {
            problems.push(`${pointer}/${key}: unknown result field. expected: one of ${exports.LOOP_BATCH_RESULT_FIELDS.join(', ')}. fix: remove it, or check for a typo (for example "exit_code" should be "exitCode").`);
        }
    }
    const actionItemId = requireNonEmptyString(problems, pointer, 'actionItemId', item.actionItemId, 'the action item id emitted by the previous tick');
    const executorId = requireNonEmptyString(problems, pointer, 'executorId', item.executorId, 'the real child id that ran this item');
    let exitCode = null;
    if (item.exitCode === undefined) {
        problems.push(`${pointer}/exitCode: expected an integer exit code (negative values are allowed) or null. found: missing. fix: add "exitCode": 0 for success.`);
    }
    else if (item.exitCode === null) {
        exitCode = null;
    }
    else if (!Number.isInteger(item.exitCode)) {
        // Any integer, negatives included: track C's F5 unclamps -1 and this
        // parser must not be the thing that blocks it.
        problems.push(`${pointer}/exitCode: expected an integer (negative values are allowed) or null. found: ${describeFound(item.exitCode)}. fix: send the number 0, not the string "0".`);
    }
    else {
        exitCode = item.exitCode;
    }
    const result = {
        actionItemId: actionItemId || '',
        executorId: executorId || '',
        exitCode,
    };
    if (item.timedOut !== undefined) {
        if (typeof item.timedOut !== 'boolean') {
            problems.push(`${pointer}/timedOut: expected true or false. found: ${describeFound(item.timedOut)}. fix: omit it when the child did not time out.`);
        }
        else {
            result.timedOut = item.timedOut;
        }
    }
    if (item.signal !== undefined) {
        if (item.signal !== null && (typeof item.signal !== 'string' || !item.signal.trim())) {
            problems.push(`${pointer}/signal: expected a non-empty signal name such as "SIGKILL", or null. found: ${describeFound(item.signal)}. fix: omit it when the child exited normally.`);
        }
        else {
            result.signal = item.signal === null ? null : item.signal.trim();
        }
    }
    if (item.infraFailure !== undefined) {
        if (typeof item.infraFailure !== 'boolean') {
            problems.push(`${pointer}/infraFailure: expected true or false. found: ${describeFound(item.infraFailure)}. fix: set true only when the harness itself failed (spawn ENOENT, EINVAL), not when the work failed.`);
        }
        else {
            result.infraFailure = item.infraFailure;
        }
    }
    if (item.tokensUsed !== undefined) {
        if (typeof item.tokensUsed !== 'number' || !Number.isFinite(item.tokensUsed) || item.tokensUsed < 0) {
            problems.push(`${pointer}/tokensUsed: expected a non-negative number. found: ${describeFound(item.tokensUsed)}. fix: omit it when the harness does not report usage.`);
        }
        else {
            result.tokensUsed = item.tokensUsed;
        }
    }
    if (item.summary !== undefined) {
        if (typeof item.summary !== 'string') {
            problems.push(`${pointer}/summary: expected a string. found: ${describeFound(item.summary)}.`);
        }
        else {
            result.summary = item.summary;
        }
    }
    if (item.evidencePaths !== undefined) {
        if (!Array.isArray(item.evidencePaths)) {
            problems.push(`${pointer}/evidencePaths: expected an array of change-relative path strings (may be empty). found: ${describeType(item.evidencePaths)}. fix: wrap a single path in [ ].`);
        }
        else {
            const paths = [];
            item.evidencePaths.forEach((candidate, pathIndex) => {
                const candidatePointer = `${pointer}/evidencePaths/${pathIndex}`;
                if (typeof candidate !== 'string' || !candidate.trim()) {
                    problems.push(`${candidatePointer}: expected a non-empty change-relative path string. found: ${describeFound(candidate)}.`);
                    return;
                }
                const normalized = candidate.trim().replace(/\\/g, '/');
                if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
                    problems.push(`${candidatePointer}: expected a change-relative path. found: the absolute path ${JSON.stringify(candidate)}. fix: make it relative to the goal directory, e.g. "artifacts/agents/worker-reports/task-1.md".`);
                    return;
                }
                if (normalized.split('/').includes('..')) {
                    problems.push(`${candidatePointer}: expected a path inside the goal directory. found: ${JSON.stringify(candidate)} which escapes it via "..". fix: reference evidence written under the goal directory.`);
                    return;
                }
                paths.push(normalized);
            });
            result.evidencePaths = paths;
        }
    }
    return problems.length === before ? result : null;
}
