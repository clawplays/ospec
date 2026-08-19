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
/** Fields a batch result item may carry. Kept as data so error text can list them. */
export declare const LOOP_BATCH_RESULT_FIELDS: readonly ["actionItemId", "executorId", "exitCode", "timedOut", "signal", "infraFailure", "tokensUsed", "summary", "evidencePaths"];
export declare const LOOP_BATCH_CLAIM_FIELDS: readonly ["actionItemId", "executorId", "leaseMs"];
export declare const LOOP_BATCH_ENVELOPE_KEYS: readonly ["version", "changePath", "claims", "results", "finalize"];
export declare const LOOP_BATCH_ENVELOPE_VERSIONS: string[];
export interface LoopBatchClaim {
    actionItemId: string;
    executorId: string;
    leaseMs?: number;
}
/**
 * The forwarded result item.
 *
 * `signal` / `infraFailure` and negative `exitCode` values are track C's F5
 * orthogonal result fields. This parser validates and forwards them but never
 * defines them on `LoopExecutionResult`; the object is handed to LoopService as
 * a variable, so TypeScript excess-property checking does not reject the extra
 * keys and C's widening of the interface takes effect with no edit here.
 */
export interface LoopBatchResult {
    actionItemId: string;
    executorId: string;
    exitCode: number | null;
    timedOut?: boolean;
    signal?: string | null;
    infraFailure?: boolean;
    tokensUsed?: number;
    summary?: string;
    evidencePaths?: string[];
}
export interface LoopBatchEnvelope {
    version: string;
    changePath: string | null;
    claims: LoopBatchClaim[];
    results: LoopBatchResult[];
    finalize: boolean;
}
/**
 * A validation failure carrying every problem found, not just the first.
 *
 * The consumer of this text is an agent deciding what to edit, so each problem
 * is emitted as pointer / expected / found / fix rather than as a schema dump.
 */
export declare class LoopBatchEnvelopeError extends Error {
    readonly problems: string[];
    constructor(source: string, problems: string[]);
}
/**
 * Parses and fully validates a batch envelope.
 *
 * @param raw    the raw bytes read from `--batch-file` (or stdin)
 * @param source a human label for the bytes, used verbatim in error text
 * @throws LoopBatchEnvelopeError listing every problem found
 */
export declare function parseLoopBatchEnvelope(raw: string, source: string): LoopBatchEnvelope;
