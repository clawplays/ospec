"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWLEDGE_DOCUMENT_FIELDS = void 0;
exports.lookupArchive = lookupArchive;
exports.buildRenderModel = buildRenderModel;
exports.renderText = renderText;
exports.renderMarkdown = renderMarkdown;
exports.renderJson = renderJson;
const path = __importStar(require("path"));
const fs_1 = require("fs");
/**
 * 7.7b: `ospec changes show <archive>`.
 *
 * This replaces the ENTIRE display value of the knowledge documents 7.7
 * deleted, so the bar it has to clear is informational equivalence, not "it
 * prints something useful". `KNOWLEDGE_DOCUMENT_FIELDS` below is the checklist
 * the old generator actually emitted, kept here next to the renderer that has
 * to reproduce it and asserted by
 * `tests/commands/p7-changes-show-equivalence.test.mjs`. If you add a field to
 * one, add it to the other -- the list is the contract that justified the
 * deletion.
 *
 * It renders live from the index entry plus the archive directory, and it
 * WRITES NOTHING. That is the whole point: the old document was derived state
 * that had to be regenerated, swept for staleness, and protected from being
 * overwritten. Deriving it on read costs one index lookup and one directory
 * listing, and cannot go stale.
 */
/** Every field the deleted generator put into a knowledge document. */
exports.KNOWLEDGE_DOCUMENT_FIELDS = [
    'feature',
    'summary',
    'affects',
    'target_files',
    'verification_commands',
    'project_documents',
    'archive',
    'documents',
    'completed_at',
    'workflow_profile',
    'disposition',
    'completion_status',
    'accepted_risk',
    'force_archive_reason',
    'failing_checks',
];
function archiveBasename(archive) {
    const normalized = String(archive || '').replace(/\\/g, '/').replace(/\/+$/, '');
    return normalized.slice(normalized.lastIndexOf('/') + 1);
}
function listOf(value) {
    return Array.isArray(value)
        ? value.map(item => String(item ?? '').trim()).filter(Boolean)
        : [];
}
/**
 * Fuzzy archive-name resolution: exact, then prefix, then keyword.
 *
 * The tiers are tried in order and the FIRST non-empty tier wins rather than
 * unioning them. An exact name must never be reported as ambiguous just
 * because it is also a prefix of a longer one -- `2026-08-14-fix-login` and
 * `2026-08-14-fix-login-timeout` both exist in real projects.
 */
function lookupArchive(entries, query) {
    const needle = String(query || '').trim().toLowerCase();
    const all = (entries || [])
        .filter(entry => entry && typeof entry.archive === 'string')
        .map(entry => ({ name: archiveBasename(entry.archive), entry }));
    if (!needle)
        return { kind: 'missing', candidates: all.slice(0, 10) };
    const tiers = [
        all.filter(item => item.name.toLowerCase() === needle
            || String(item.entry.archive).toLowerCase() === needle),
        all.filter(item => item.name.toLowerCase().startsWith(needle)),
        all.filter(item => item.name.toLowerCase().includes(needle)
            || String(item.entry.feature || '').toLowerCase().includes(needle)
            || String(item.entry.summary || '').toLowerCase().includes(needle)),
    ];
    for (const tier of tiers) {
        if (tier.length === 1)
            return { kind: 'found', match: tier[0], candidates: tier };
        if (tier.length > 1) {
            return {
                kind: 'ambiguous',
                candidates: tier.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)),
            };
        }
    }
    // Nothing matched. Offer the closest names by shared prefix length so the
    // suggestion is useful on a typo rather than just the newest few.
    const scored = all
        .map(item => {
        const name = item.name.toLowerCase();
        let shared = 0;
        while (shared < name.length && shared < needle.length && name[shared] === needle[shared])
            shared += 1;
        return { item, shared };
    })
        .sort((left, right) => right.shared - left.shared
        || (left.item.name < right.item.name ? -1 : left.item.name > right.item.name ? 1 : 0));
    return { kind: 'missing', candidates: scored.slice(0, 10).map(scored => scored.item) };
}
const ARCHIVED_DOCUMENT_ORDER = [
    'proposal.md',
    'design.md',
    'implementation-plan.md',
    'tasks.md',
    'verification.md',
    'review.md',
    'artifacts/reviews/final-review.md',
    'artifacts/agents/force-archive.json',
];
/**
 * Build the render model from the index entry plus a live look at the archive.
 *
 * The index entry is the authority for the extracted fields -- it is merged
 * across history, so it still answers for an archive whose directory has been
 * deleted. The directory is consulted only for which documents are actually
 * there, which is the one thing an index entry can be stale about.
 */
async function buildRenderModel(projectRoot, entry) {
    const archiveDir = path.join(projectRoot, ...String(entry.archive).split('/'));
    let archivePresent = false;
    try {
        archivePresent = (await fs_1.promises.stat(archiveDir)).isDirectory();
    }
    catch {
        archivePresent = false;
    }
    // Union of what the index recorded and what is on disk now, in the canonical
    // order. An entry whose archive was deleted still lists its documents, marked
    // absent, because "this evidence existed and is now gone" is information.
    const named = Array.from(new Set([...ARCHIVED_DOCUMENT_ORDER, ...listOf(entry.documents)]));
    const indexed = new Set(listOf(entry.documents));
    const documents = [];
    for (const relative of named) {
        const absolute = path.join(archiveDir, ...relative.split('/'));
        let exists = false;
        if (archivePresent) {
            try {
                exists = (await fs_1.promises.stat(absolute)).isFile();
            }
            catch {
                exists = false;
            }
        }
        if (!exists && !indexed.has(relative))
            continue;
        documents.push({
            relative,
            archivePath: `${entry.archive}/${relative}`,
            exists,
        });
    }
    const forced = entry.disposition === 'forced';
    return {
        feature: String(entry.feature || archiveBasename(entry.archive)),
        summary: String(entry.summary || ''),
        affects: listOf(entry.affects),
        target_files: listOf(entry.target_files),
        verification_commands: listOf(entry.verification_commands),
        project_documents: listOf(entry.project_documents),
        archive: String(entry.archive),
        documents,
        completed_at: entry.completed_at ?? null,
        workflow_profile: String(entry.workflow_profile || 'change'),
        disposition: forced ? 'forced' : 'completed',
        completion_status: forced ? 'incomplete' : 'completed',
        accepted_risk: forced ? entry.accepted_risk === true : false,
        force_archive_reason: String(entry.force_archive_reason || ''),
        failing_checks: listOf(entry.failing_checks),
        archive_present: archivePresent,
    };
}
function bullets(items, empty = '(none)') {
    return items.length > 0 ? items.map(item => `  - ${item}`) : [`  ${empty}`];
}
/** Terminal-friendly default output. */
function renderText(model) {
    const lines = [];
    lines.push(model.feature);
    lines.push('='.repeat(Math.max(model.feature.length, 3)));
    lines.push('');
    if (model.disposition === 'forced') {
        lines.push('FORCED ARCHIVE / INCOMPLETE / ACCEPTED RISK');
        lines.push(`  Reason: ${model.force_archive_reason || '(not recorded)'}`);
        lines.push(`  Failing gates: ${model.failing_checks.length > 0 ? model.failing_checks.join(', ') : '(none recorded)'}`);
        lines.push('');
    }
    lines.push('Summary');
    lines.push(`  ${model.summary || '(no summary recorded; open the archived proposal)'}`);
    lines.push('');
    lines.push('Affects');
    lines.push(...bullets(model.affects));
    lines.push('');
    lines.push('Implementation files');
    lines.push(...bullets(model.target_files));
    lines.push('');
    lines.push('Verification commands');
    lines.push(...bullets(model.verification_commands));
    lines.push('');
    lines.push('Long-term project documents');
    lines.push(...bullets(model.project_documents));
    lines.push('');
    lines.push('Archived evidence');
    lines.push(`  Archive: ${model.archive}${model.archive_present ? '' : '  (directory not present)'}`);
    lines.push(...(model.documents.length > 0
        ? model.documents.map(document => `  - ${document.archivePath}${document.exists ? '' : '  (missing)'}`)
        : ['  (none)']));
    lines.push('');
    lines.push('Metadata');
    lines.push(`  Completed at: ${model.completed_at || '(not recorded)'}`);
    lines.push(`  Workflow profile: ${model.workflow_profile}`);
    lines.push(`  Disposition: ${model.disposition}`);
    lines.push(`  Completion status: ${model.completion_status}`);
    if (model.disposition === 'forced')
        lines.push(`  Accepted risk: ${model.accepted_risk}`);
    lines.push('');
    return lines.join('\n');
}
/** `--md`: the same content as a markdown document, for pasting into a review. */
function renderMarkdown(model) {
    const list = (items) => (items.length > 0 ? items.map(item => `- ${item}`) : ['- (none)']);
    const code = (items) => (items.length > 0 ? items.map(item => `- \`${item.replace(/`/g, '\\`')}\``) : ['- (none)']);
    const lines = [];
    lines.push(`# ${model.feature}`, '');
    if (model.disposition === 'forced') {
        lines.push('> **This change was force-archived while incomplete. It is not verified-complete.**', '');
        lines.push('## Forced archive status', '');
        lines.push(`- Disposition: ${model.disposition}`);
        lines.push(`- Completion status: ${model.completion_status}`);
        lines.push(`- Accepted risk: ${model.accepted_risk}`);
        lines.push(`- Force archive reason: ${model.force_archive_reason || '(not recorded)'}`);
        lines.push(`- Failing gates: ${model.failing_checks.length > 0 ? model.failing_checks.join(', ') : '(none recorded)'}`);
        lines.push('');
    }
    lines.push('## Summary', '', model.summary || '(no summary recorded; open the archived proposal)', '');
    lines.push('## Affects', '', ...list(model.affects), '');
    lines.push('## Implementation files', '', ...code(model.target_files), '');
    lines.push('## Verification commands', '', ...code(model.verification_commands), '');
    lines.push('## Long-term project documents', '', ...list(model.project_documents), '');
    lines.push('## Archived evidence', '');
    lines.push(`- Archive: [${model.archive}](${model.archive})`);
    for (const document of model.documents) {
        lines.push(`- [${document.relative}](${document.archivePath})${document.exists ? '' : ' (missing)'}`);
    }
    lines.push('');
    lines.push('## Metadata', '');
    lines.push(`- Completed at: ${model.completed_at || '(not recorded)'}`);
    lines.push(`- Workflow profile: ${model.workflow_profile}`);
    lines.push('');
    return `${lines.join('\n').trimEnd()}\n`;
}
function renderJson(model) {
    return `${JSON.stringify(model, null, 2)}\n`;
}
