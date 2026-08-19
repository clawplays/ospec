import type { DocsObligation } from '../core/types';
/**
 * 7.7's seam onto track B's documentation-obligation engine (7.6).
 *
 * B produces the obligations; the archive gate verifies them. The shape below
 * is B's, adopted verbatim rather than the one this track proposed, because B
 * writes the record and a second vocabulary is how two halves of one contract
 * drift.
 *
 * Four rules from B, each of which is a way to get this wrong:
 *
 *   1. ONE location for both workflows: `<changeDir>/state.json` ->
 *      `docs_obligations`. The task graph's `documentation_updates` and the
 *      classic closeout checklist are DERIVED VIEWS regenerated from it. Read
 *      state.json, never those; if they disagree, state.json wins.
 *   2. Key on `path` + `section`, never by re-splitting `target`. A heading may
 *      legally contain '#', so that split is lossy for the path half.
 *   3. Call `evaluateDocsObligations` for satisfaction. Do NOT recompute it
 *      from file hashes here -- a second inference path is exactly how warn
 *      mode and strict mode drift apart.
 *   4. `change_type` is an OPAQUE DIAGNOSTIC STRING. Do not switch on it. B is
 *      reconciling two vocabularies additively (the validator's
 *      bugfix|feature|maintenance|docs against the design's
 *      feature|fix|refactor|perf|deprecate|remove|docs), so any switch written
 *      here would be wrong for one of them.
 *
 * RESOLUTION. Before the merge B's module was on another branch, so it is
 * resolved at call time and its absence is a normal state. It is on this tree
 * now, and the resolver had to grow to actually find it: B exports a CLASS,
 * `DocsObligationService` with an `evaluate({ obligations, projectRoot })`
 * method, plus `createDocsObligationService(fileService)` -- not the
 * module-level `evaluateDocsObligations` function this port was written
 * against. Probing only for that function left the seam permanently
 * unavailable after the merge, which is worse than it sounds: the gate would
 * have reported "recorded but not evaluated" on every archive that has
 * obligations, and `docs_contract.mode: strict` would never have refused here.
 * Both shapes are accepted now, the adapter is below, and the resolved world
 * is what the tests assert.
 *
 * The record shape is B's, imported from `core/types` rather than redeclared.
 * It was redeclared here while B's branch was unreachable, and the copy had
 * already drifted: B's `kind` union gained `correct_section` (what a `fix`
 * generates) and `DocsObligation` gained `baseline`, and neither was in the
 * copy. Nothing here ever stripped an unknown field -- obligations are read
 * from JSON and passed through by reference, so `baseline` survived at runtime
 * -- but a second declaration of one contract is the drift this port exists to
 * avoid, and a `fix`'s obligation did not typecheck against it.
 */
export type { DocsObligation };
/**
 * One obligation's verdict. B returns `{ id, level, status, message }`; this is
 * the widened read of it, so an unrecognised `status` is expressible rather
 * than a type error, and `detail` carries B's `message` through.
 */
export interface DocsObligationVerdict {
    id: string;
    status: string;
    detail?: string;
}
export interface DocsObligationEvaluation {
    /** Absent when track B's module is not resolvable. */
    available: boolean;
    mode: 'warn' | 'strict';
    obligations: DocsObligation[];
    verdicts: DocsObligationVerdict[];
    /** Unsatisfied REQUIRED obligations. Blocks in strict mode, warns in warn mode. */
    blocking: DocsObligationVerdict[];
    /** Unsatisfied optional obligations. Always advisory. */
    advisory: DocsObligationVerdict[];
    warnings: string[];
}
export interface DocsObligationPort {
    evaluateDocsObligations(changeDir: string, options?: Record<string, unknown>): Promise<{
        verdicts?: DocsObligationVerdict[];
        mode?: string;
    } | DocsObligationVerdict[]>;
}
export declare function registerDocsObligationPort(port: DocsObligationPort | null): void;
export declare function resetDocsObligationPort(): void;
export declare function getDocsObligationPort(): DocsObligationPort | null;
/**
 * The obligations recorded for a change, read from the ONE location B writes:
 * `state.json.docs_obligations`. Never from the task graph or the checklist.
 */
export declare function readDocsObligations(changeDir: string): Promise<DocsObligation[]>;
/**
 * Verify the archive gate's documentation obligations.
 *
 * Returns the verdicts; the caller decides what to do with them. Never throws
 * and never recomputes satisfaction -- both are B's rules, and the second is
 * the one that keeps warn and strict reading the same field.
 */
export declare function evaluateArchiveDocsObligations(changeDir: string, mode?: 'warn' | 'strict', projectRoot?: string): Promise<DocsObligationEvaluation>;
/**
 * One line per unsatisfied obligation, for the archive gate to print.
 *
 * Cites the obligation `id` -- B's stable key -- and the `path`/`section`
 * fields rather than splitting `target`, because a heading may contain '#'.
 */
export declare function describeUnsatisfied(evaluation: DocsObligationEvaluation, verdicts: DocsObligationVerdict[]): string[];
