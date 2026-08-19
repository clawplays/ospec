"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_DECISION_SCHEMA = exports.WORKER_REPORT_SCHEMA = exports.StructuredDocumentError = void 0;
exports.validateAgainstSchema = validateAgainstSchema;
exports.parseWorkerReport = parseWorkerReport;
exports.parseReviewDecision = parseReviewDecision;
exports.renderWorkerReportMarkdown = renderWorkerReportMarkdown;
exports.renderReviewDecisionMarkdown = renderReviewDecisionMarkdown;
exports.renderReviewFindingsDocument = renderReviewFindingsDocument;
class StructuredDocumentError extends Error {
    constructor(kind, source, problems) {
        const heading = `${kind} ${source} is invalid (${problems.length} problem${problems.length === 1 ? '' : 's'}). Nothing was recorded.`;
        super([
            heading,
            '',
            ...problems.flatMap(problem => [
                `  ${problem.pointer}`,
                `    expected: ${problem.expected}`,
                `    found:    ${problem.found}`,
                `    fix:      ${problem.fix}`,
                '',
            ]),
        ].join('\n').trimEnd());
        this.name = 'StructuredDocumentError';
        this.problems = problems;
    }
}
exports.StructuredDocumentError = StructuredDocumentError;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
/** JSON Schema (draft 2020-12) for `ospec execute complete --report-file`. */
exports.WORKER_REPORT_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://ospec.dev/schemas/worker-report/1',
    title: 'OSpec worker report',
    type: 'object',
    additionalProperties: false,
    required: ['status', 'summary', 'changedPaths', 'evidence', 'concerns'],
    'x-fix': 'the report must be one JSON object with status, summary, changedPaths, evidence and concerns',
    properties: {
        reportVersion: {
            type: 'integer',
            enum: [1],
            'x-fix': 'omit it, or set "reportVersion": 1',
        },
        status: {
            type: 'string',
            enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'],
            'x-fix': 'status is case-sensitive; write it in upper case, e.g. "status": "DONE"',
        },
        summary: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            'x-fix': 'write one short paragraph for the controller; put the detail in changedPaths and evidence',
        },
        changedPaths: {
            type: 'array',
            'x-emptyMeans': 'no files were changed',
            items: { type: 'string', minLength: 1 },
            'x-fix': 'send [] when nothing changed; wrap a single path as ["src/a.ts"]',
        },
        evidence: {
            type: 'array',
            'x-emptyMeans': 'no evidence was produced',
            'x-fix': 'send [] when there is no evidence; each entry needs kind and ref',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['kind', 'ref'],
                properties: {
                    kind: {
                        type: 'string',
                        enum: ['command', 'file', 'test', 'note'],
                        'x-fix': 'use "command" for a command you ran, "file" for an artifact you wrote, "test" for a test run, "note" for anything else',
                    },
                    ref: {
                        type: 'string',
                        minLength: 1,
                        'x-fix': 'the command line, the path, or the test name',
                    },
                    result: { type: 'string', 'x-fix': 'what the command or test produced' },
                },
            },
        },
        concerns: {
            type: 'array',
            'x-emptyMeans': 'there are no concerns',
            'x-fix': 'send [] when there is nothing to flag; each entry needs severity and message',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['severity', 'message'],
                properties: {
                    severity: {
                        type: 'string',
                        enum: SEVERITIES,
                        'x-fix': 'pick the lowest severity that is honest; use "info" for a note',
                    },
                    message: { type: 'string', minLength: 1, 'x-fix': 'state the concern in one sentence' },
                    path: { type: 'string', 'x-fix': 'the change-relative file the concern is about' },
                },
            },
        },
    },
};
/** JSON Schema (draft 2020-12) for `ospec execute review-decision --decision-file`. */
exports.REVIEW_DECISION_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://ospec.dev/schemas/review-decision/1',
    title: 'OSpec review decision',
    type: 'object',
    additionalProperties: false,
    required: ['decision', 'summary', 'findings'],
    'x-fix': 'the decision file must be one JSON object with decision, summary and findings',
    properties: {
        decisionVersion: { type: 'integer', enum: [1], 'x-fix': 'omit it, or set "decisionVersion": 1' },
        decision: {
            type: 'string',
            enum: ['APPROVED', 'APPROVED_WITH_CONCERNS', 'NEEDS_CHANGES', 'BLOCKED'],
            'x-fix': 'decision is case-sensitive; write it in upper case, e.g. "decision": "APPROVED"',
        },
        summary: {
            type: 'string',
            minLength: 1,
            maxLength: 2000,
            'x-fix': 'one paragraph explaining the decision',
        },
        findings: {
            type: 'array',
            'x-emptyMeans': 'the review found nothing to report',
            'x-fix': 'send [] for a clean approval; each finding needs id, severity, message and evidence',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'severity', 'message', 'evidence'],
                properties: {
                    id: { type: 'string', minLength: 1, 'x-fix': 'a stable id such as "F-001"; ids must be unique in the file' },
                    // No "unknown" here on purpose: an explicit severity is the
                    // whole point of sending JSON instead of Markdown. The
                    // Markdown fallback is what stamps "unknown", and "unknown"
                    // is treated as blocking.
                    severity: { type: 'string', enum: SEVERITIES, 'x-fix': 'pick one; "unknown" is not accepted here because a JSON review must state a real severity' },
                    category: { type: 'string', 'x-fix': 'a short slug such as "correctness" or "security"' },
                    message: { type: 'string', minLength: 1, 'x-fix': 'state the defect in one sentence' },
                    evidence: { type: 'string', minLength: 1, 'x-fix': 'what you observed that makes this real' },
                    file: { type: 'string', 'x-fix': 'the change-relative file the finding is in' },
                    line: { type: 'integer', minimum: 1, 'x-fix': 'a 1-indexed line number, or omit it' },
                    requirementRefs: { type: 'array', items: { type: 'string' }, 'x-fix': 'task ids or requirement ids this finding maps to' },
                    repairScope: { type: 'array', items: { type: 'string' }, 'x-fix': 'the files a repair would need to touch' },
                },
            },
        },
    },
};
function describeFound(value) {
    if (value === undefined)
        return 'missing';
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return `an array of ${value.length} item${value.length === 1 ? '' : 's'}`;
    if (typeof value === 'string')
        return `a string ${JSON.stringify(value.length > 60 ? `${value.slice(0, 60)}…` : value)}`;
    if (typeof value === 'object')
        return `an object with keys ${Object.keys(value).join(', ') || '(none)'}`;
    return JSON.stringify(value);
}
function typeMatches(schema, value) {
    switch (schema.type) {
        case 'object': return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
        case 'array': return Array.isArray(value);
        case 'string': return typeof value === 'string';
        case 'integer': return Number.isInteger(value);
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'boolean': return typeof value === 'boolean';
        default: return true;
    }
}
function describeExpected(schema) {
    if (Array.isArray(schema.enum)) {
        return `one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`;
    }
    if (schema.type === 'array') {
        const inner = schema.items?.type ? ` of ${schema.items.type}s` : '';
        return `an array${inner}${schema['x-emptyMeans'] ? ` (send [] when ${schema['x-emptyMeans']})` : ''}`;
    }
    if (schema.type === 'string' && schema.minLength)
        return 'a non-empty string';
    if (schema.type === 'integer' && schema.minimum !== undefined)
        return `an integer >= ${schema.minimum}`;
    return `${/^[aeiou]/.test(String(schema.type)) ? 'an' : 'a'} ${schema.type}`;
}
/**
 * Validates a value against the supported JSON Schema subset:
 * `type`, `required`, `properties`, `additionalProperties: false`, `enum`,
 * `items`, `minLength`, `maxLength`, `minimum`. Collects every problem.
 */
function validateAgainstSchema(schema, value, pointer = '') {
    const problems = [];
    const at = pointer || '/';
    const fix = (fallback) => String(schema['x-fix'] || fallback);
    if (!typeMatches(schema, value)) {
        problems.push({
            pointer: at,
            expected: describeExpected(schema),
            found: describeFound(value),
            fix: fix('correct the type'),
        });
        return problems;
    }
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
        problems.push({
            pointer: at,
            expected: `one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`,
            found: describeFound(value),
            fix: fix('use one of the listed values exactly'),
        });
        return problems;
    }
    if (schema.type === 'string') {
        const text = value;
        if (schema.minLength !== undefined && text.length < schema.minLength) {
            problems.push({
                pointer: at,
                expected: schema.minLength === 1 ? 'a non-empty string' : `a string of at least ${schema.minLength} characters`,
                found: text.length === 0 ? 'an empty string' : describeFound(text),
                fix: fix('write the value'),
            });
        }
        if (schema.maxLength !== undefined && text.length > schema.maxLength) {
            problems.push({
                pointer: at,
                expected: `a string of at most ${schema.maxLength} characters`,
                found: `a string of ${text.length} characters`,
                fix: fix(`shorten it by ${text.length - schema.maxLength} characters`),
            });
        }
    }
    if (schema.type === 'integer' && schema.minimum !== undefined && value < schema.minimum) {
        problems.push({
            pointer: at,
            expected: `an integer >= ${schema.minimum}`,
            found: describeFound(value),
            fix: fix('use a valid value or omit the field'),
        });
    }
    if (schema.type === 'object') {
        const record = value;
        for (const key of schema.required || []) {
            if (record[key] === undefined) {
                const child = schema.properties?.[key] || {};
                problems.push({
                    pointer: `${pointer}/${key}`,
                    expected: child.type ? describeExpected(child) : 'a value',
                    found: 'missing',
                    fix: String(child['x-fix'] || `add "${key}" to ${at}`),
                });
            }
        }
        if (schema.additionalProperties === false) {
            const allowed = Object.keys(schema.properties || {});
            for (const key of Object.keys(record)) {
                if (!allowed.includes(key)) {
                    problems.push({
                        pointer: `${pointer}/${key}`,
                        expected: `no such field; ${at} accepts ${allowed.join(', ')}`,
                        found: describeFound(record[key]),
                        fix: `remove "${key}", or check for a typo against ${allowed.join(', ')}`,
                    });
                }
            }
        }
        for (const [key, child] of Object.entries(schema.properties || {})) {
            if (record[key] === undefined)
                continue;
            problems.push(...validateAgainstSchema(child, record[key], `${pointer}/${key}`));
        }
    }
    if (schema.type === 'array' && schema.items) {
        value.forEach((item, index) => {
            problems.push(...validateAgainstSchema(schema.items, item, `${pointer}/${index}`));
        });
    }
    return problems;
}
function parseJsonDocument(kind, source, raw) {
    const text = String(raw ?? '');
    if (!text.trim()) {
        throw new StructuredDocumentError(kind, source, [{
                pointer: '/',
                expected: 'a JSON object',
                found: 'an empty file',
                fix: 'write the report as JSON; an empty file is never read as an empty report',
            }]);
    }
    try {
        return JSON.parse(text.replace(/^﻿/, ''));
    }
    catch (error) {
        throw new StructuredDocumentError(kind, source, [{
                pointer: '/',
                expected: 'valid JSON',
                found: `a parse error: ${error?.message || error}`,
                fix: 'check for a trailing comma, an unquoted key, or a truncated write',
            }]);
    }
}
function parseWorkerReport(raw, source) {
    const document = parseJsonDocument('Worker report', source, raw);
    const problems = validateAgainstSchema(exports.WORKER_REPORT_SCHEMA, document);
    if (problems.length > 0)
        throw new StructuredDocumentError('Worker report', source, problems);
    return { reportVersion: 1, ...document };
}
function parseReviewDecision(raw, source) {
    const document = parseJsonDocument('Review decision', source, raw);
    const problems = validateAgainstSchema(exports.REVIEW_DECISION_SCHEMA, document);
    const seen = new Set();
    for (const [index, finding] of (Array.isArray(document?.findings) ? document.findings : []).entries()) {
        const id = typeof finding?.id === 'string' ? finding.id.trim() : '';
        if (!id)
            continue;
        if (seen.has(id)) {
            problems.push({
                pointer: `/findings/${index}/id`,
                expected: 'an id unique within this file',
                found: `a repeat of ${JSON.stringify(id)}`,
                fix: `renumber this finding, e.g. "F-${String(index + 1).padStart(3, '0')}"`,
            });
        }
        seen.add(id);
    }
    if (problems.length > 0)
        throw new StructuredDocumentError('Review decision', source, problems);
    return { decisionVersion: 1, ...document };
}
/** The human Markdown view, rendered from the JSON so humans lose nothing. */
function renderWorkerReportMarkdown(taskId, report) {
    const list = (items) => items.length > 0 ? items : ['- None recorded.'];
    return [
        `# Worker Report: ${taskId}`,
        '',
        `- Status: ${report.status}`,
        '- Source: structured JSON report (`ospec execute complete --report-file`)',
        '',
        '## Summary',
        '',
        report.summary,
        '',
        '## Changed Paths',
        '',
        ...list(report.changedPaths.map(item => `- \`${item}\``)),
        '',
        '## Evidence',
        '',
        ...list(report.evidence.map(item => `- [${item.kind}] \`${item.ref}\`${item.result ? ` — ${item.result}` : ''}`)),
        '',
        '## Concerns',
        '',
        ...list(report.concerns.map(item => `- [${item.severity}] ${item.message}${item.path ? ` (\`${item.path}\`)` : ''}`)),
        '',
    ].join('\n');
}
/** The review Markdown view, with the frontmatter decision the gates read. */
function renderReviewDecisionMarkdown(title, decision, frontmatter = {}) {
    const entries = Object.entries({ decision: decision.decision, reviewed_at: new Date().toISOString(), ...frontmatter })
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value === null ? 'null' : value}`);
    return [
        '---',
        ...entries,
        '---',
        '',
        `# ${title}`,
        '',
        '- Source: structured JSON decision (`ospec execute review-decision --decision-file`)',
        '',
        '## Summary',
        '',
        decision.summary,
        '',
        '## Findings',
        '',
        ...(decision.findings.length > 0
            ? decision.findings.map(finding => `- [${finding.id}] [${finding.severity}] ${finding.message}${finding.file ? ` (\`${finding.file}${finding.line ? `:${finding.line}` : ''}\`)` : ''} — evidence: ${finding.evidence}`)
            : ['- None recorded.']),
        '',
    ].join('\n');
}
/** The sibling `*.findings.json` payload, in the shape the gates already read. */
function renderReviewFindingsDocument(decision) {
    return {
        version: '1.0',
        source: 'structured',
        findings: decision.findings.map(finding => ({
            id: finding.id,
            severity: finding.severity,
            category: finding.category || 'unspecified',
            message: finding.message,
            file: finding.file ?? null,
            line: finding.line ?? null,
            evidence: finding.evidence,
            requirement_refs: finding.requirementRefs || [],
            repair_scope: finding.repairScope || [],
        })),
    };
}
