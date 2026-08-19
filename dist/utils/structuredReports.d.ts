/**
 * F2 — structured worker reports and review decisions.
 *
 * Two JSON Schema documents are the single source of truth for the shapes, and
 * one small draft-2020-12-subset validator interprets them. The project ships
 * two runtime dependencies on purpose, so pulling in a full validator to check
 * two flat objects was not worth the package weight.
 *
 * The validator implements exactly this keyword subset: `type` (object, array,
 * string, integer, boolean), `properties`, `required`, `additionalProperties:
 * false`, `enum`, `items`, `minLength`, `maxLength`, `minimum`. A keyword that
 * appears in a schema but not in that list would be silently unenforced, so
 * `structured-report-validation.test.mjs` walks both documents and fails if one
 * shows up. No claim is made here about behaviour under another validator:
 * ajv is not in this tree, so it is not a claim that could be checked.
 *
 * The thing that matters more than the shapes: **the validation errors are read
 * by an AI deciding what to edit.** Every problem is reported as
 *
 *     <json pointer>
 *       expected: ...
 *       found:    ...
 *       fix:      ...
 *
 * "Invalid report" or "data.status should be equal to one of the allowed
 * values" tells the reader nothing they can act on. The `x-fix` annotations in
 * the schemas below carry the concrete next edit; unknown keywords like `x-fix`
 * are ignored by real validators, so the documents stay portable.
 */
export interface JsonSchemaProblem {
    pointer: string;
    expected: string;
    found: string;
    fix: string;
}
export declare class StructuredDocumentError extends Error {
    readonly problems: JsonSchemaProblem[];
    constructor(kind: string, source: string, problems: JsonSchemaProblem[]);
}
/** JSON Schema (draft 2020-12) for `ospec execute complete --report-file`. */
export declare const WORKER_REPORT_SCHEMA: any;
/** JSON Schema (draft 2020-12) for `ospec execute review-decision --decision-file`. */
export declare const REVIEW_DECISION_SCHEMA: any;
/**
 * Validates a value against the supported JSON Schema subset:
 * `type`, `required`, `properties`, `additionalProperties: false`, `enum`,
 * `items`, `minLength`, `maxLength`, `minimum`. Collects every problem.
 */
export declare function validateAgainstSchema(schema: any, value: unknown, pointer?: string): JsonSchemaProblem[];
export interface WorkerReportDocument {
    reportVersion: number;
    status: 'DONE' | 'DONE_WITH_CONCERNS' | 'BLOCKED' | 'NEEDS_CONTEXT';
    summary: string;
    changedPaths: string[];
    evidence: Array<{
        kind: string;
        ref: string;
        result?: string;
    }>;
    concerns: Array<{
        severity: string;
        message: string;
        path?: string;
    }>;
}
export declare function parseWorkerReport(raw: string, source: string): WorkerReportDocument;
export interface ReviewDecisionFinding {
    id: string;
    severity: string;
    category?: string;
    message: string;
    evidence: string;
    file?: string;
    line?: number;
    requirementRefs?: string[];
    repairScope?: string[];
}
export interface ReviewDecisionDocument {
    decisionVersion: number;
    decision: 'APPROVED' | 'APPROVED_WITH_CONCERNS' | 'NEEDS_CHANGES' | 'BLOCKED';
    summary: string;
    findings: ReviewDecisionFinding[];
}
export declare function parseReviewDecision(raw: string, source: string): ReviewDecisionDocument;
/** The human Markdown view, rendered from the JSON so humans lose nothing. */
export declare function renderWorkerReportMarkdown(taskId: string, report: WorkerReportDocument): string;
/** The review Markdown view, with the frontmatter decision the gates read. */
export declare function renderReviewDecisionMarkdown(title: string, decision: ReviewDecisionDocument, frontmatter?: Record<string, string | null>): string;
/** The sibling `*.findings.json` payload, in the shape the gates already read. */
export declare function renderReviewFindingsDocument(decision: ReviewDecisionDocument): unknown;
