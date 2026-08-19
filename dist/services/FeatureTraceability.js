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
exports.renderLastChangeComment = renderLastChangeComment;
exports.isWritableArchiveName = isWritableArchiveName;
exports.applyToSection = applyToSection;
exports.writeTraceabilityComments = writeTraceabilityComments;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const SkillParser_1 = require("./SkillParser");
const helpers_1 = require("../utils/helpers");
/**
 * 7.7: writing `<!-- ospec:last-change <archive> -->` into a feature section.
 *
 * THIS IS THE ENGINE'S ONLY WRITE INTO A HUMAN-OWNED DOCUMENT. Three rules
 * follow from that, and each is enforced below rather than left to callers:
 *
 * 1. **Idempotent.** An existing comment in the section is REPLACED, never
 *    appended to. Archiving the same feature twice leaves exactly one comment,
 *    naming the newer archive. Contract 2.3 already makes a second comment in
 *    one section a parse error, so appending would wedge `ospec index build`
 *    for the author -- the failure would surface far from its cause.
 * 2. **Only the comment line changes.** Everything else in the file -- the
 *    frontmatter, the prose, the blank lines, the line endings, a leading BOM
 *    -- comes back byte for byte. See `applyToDocument` for why that needs
 *    care rather than a regex over the raw text.
 * 3. **Failure never blocks archiving.** Every entry point here returns
 *    warnings instead of throwing. A read-only checkout, a file someone has
 *    open in an editor with a lock, a document edited into a parse error since
 *    the last index build -- none of those are reasons to refuse to archive
 *    work that is already finished. The archive is the durable record; the
 *    comment is a convenience pointer back to it.
 */
const LAST_CHANGE_LINE = /^<!--\s*ospec:last-change\b.*-->$/;
function renderLastChangeComment(archiveName) {
    return `<!-- ospec:last-change ${archiveName} -->`;
}
/**
 * The archive name must be a single non-whitespace token (contract 2.3). A
 * name with a space in it would parse back as a different token and make the
 * next replacement miss, so it is refused here rather than written.
 */
function isWritableArchiveName(archiveName) {
    return typeof archiveName === 'string'
        && archiveName.length > 0
        && !/\s/.test(archiveName);
}
/**
 * Split a raw file into the pieces the offset contract (4) is defined against,
 * keeping enough around to put it back together unchanged.
 *
 * The trap this exists to avoid: `parseFeatureDeclarations` normalises line
 * endings internally and returns offsets into the NORMALISED body, while
 * `parseFrontmatterDocument` slices whatever it was given. Feed it raw CRLF
 * text and the offsets you get back index a string you do not have -- every
 * edit lands a few characters early, and further off with every line. That is
 * a Windows-shaped corruption of a file a person wrote, so the normalisation
 * happens here, once, before anything reads an offset.
 */
function splitDocument(raw) {
    const bom = raw.startsWith('﻿') ? '﻿' : '';
    const withoutBom = bom ? raw.slice(1) : raw;
    const usesCrlf = /\r\n/.test(withoutBom);
    const normalized = withoutBom.replace(/\r\n?/g, '\n');
    const { content } = (0, helpers_1.parseFrontmatterDocument)(normalized);
    return {
        bom,
        usesCrlf,
        frontmatterPrefix: normalized.slice(0, normalized.length - content.length),
        body: content,
    };
}
function joinDocument(shape, body) {
    const joined = `${shape.frontmatterPrefix}${body}`;
    return `${shape.bom}${shape.usesCrlf ? joined.replace(/\n/g, '\r\n') : joined}`;
}
/**
 * Put the comment in one section of one already-split body.
 *
 * Exported for the idempotency test, which needs to assert the second call is
 * a pure no-op at the string level rather than inferring it from the file.
 */
function applyToSection(body, declaration, archiveName) {
    const comment = renderLastChangeComment(archiveName);
    const before = body.slice(0, declaration.start);
    const section = body.slice(declaration.start, declaration.end);
    const after = body.slice(declaration.end);
    const lines = section.split('\n');
    const existingIndex = lines.findIndex(line => LAST_CHANGE_LINE.test(line.trim()));
    if (existingIndex >= 0) {
        if (lines[existingIndex].trim() === comment) {
            return { body, action: 'unchanged' };
        }
        // Keep the author's indentation; replace only what the comment says.
        const indent = lines[existingIndex].match(/^[ \t]*/)?.[0] ?? '';
        lines[existingIndex] = `${indent}${comment}`;
        return { body: `${before}${lines.join('\n')}${after}`, action: 'replaced' };
    }
    // No comment yet: insert after the section's last non-blank line, so the
    // blank lines that separate this section from the next one stay where the
    // author put them.
    let lastContent = lines.length - 1;
    while (lastContent >= 0 && lines[lastContent].trim() === '')
        lastContent--;
    if (lastContent < 0) {
        // A section with a heading but no body at all still has the heading line.
        return { body, action: 'unchanged' };
    }
    lines.splice(lastContent + 1, 0, '', comment);
    return { body: `${before}${lines.join('\n')}${after}`, action: 'appended' };
}
/**
 * Update every requested slug that this one document declares.
 *
 * Offsets come from a FRESH parse of the file, never from the index. The index
 * records where a section was when it was last built; the person may have
 * edited the document since. Writing at a stale offset is precisely how an
 * engine corrupts a human document, and re-parsing costs one file read.
 */
async function applyToDocument(absolutePath, relativePath, slugs, archiveName, result) {
    let raw;
    try {
        raw = await fs_1.promises.readFile(absolutePath, 'utf8');
    }
    catch (error) {
        result.warnings.push(`could not read ${relativePath} to record the traceability comment: ${error?.message || error}`);
        return;
    }
    const shape = splitDocument(raw);
    let declarations;
    try {
        declarations = (0, SkillParser_1.parseFeatureDeclarations)(shape.body, relativePath);
    }
    catch (error) {
        // The document is malformed RIGHT NOW -- someone is mid-edit, or the file
        // has an error that `ospec index build` will report with a much better
        // message than this one. Say so and leave the bytes alone.
        result.warnings.push(`could not record the traceability comment in ${relativePath}: ${error?.message || error}`);
        return;
    }
    let body = shape.body;
    const applied = [];
    // Descending by start offset: each edit changes the length of the body, and
    // editing from the back means the earlier declarations' offsets are still
    // valid when their turn comes.
    const targets = declarations
        .filter(declaration => slugs.includes(declaration.slug))
        .sort((left, right) => right.start - left.start);
    for (const declaration of targets) {
        const outcome = applyToSection(body, declaration, archiveName);
        body = outcome.body;
        applied.push({ slug: declaration.slug, file: relativePath, action: outcome.action });
    }
    if (applied.length === 0)
        return;
    if (body !== shape.body) {
        const next = joinDocument(shape, body);
        try {
            await fs_1.promises.writeFile(absolutePath, next, 'utf8');
        }
        catch (error) {
            result.warnings.push(`could not write the traceability comment to ${relativePath}: ${error?.message || error}`);
            return;
        }
    }
    result.updates.push(...applied);
}
/**
 * Record `archiveName` as the last change of every feature in `slugs`.
 *
 * `featureDocs` is the index's `feature_docs` map, used ONLY to find which file
 * declares each slug. Never throws; the caller archives regardless.
 */
async function writeTraceabilityComments(projectRoot, featureDocs, slugs, archiveName) {
    const result = { updates: [], warnings: [] };
    const wanted = Array.from(new Set((slugs || []).map(slug => String(slug || '').trim()).filter(Boolean)));
    if (wanted.length === 0)
        return result;
    if (!isWritableArchiveName(archiveName)) {
        result.warnings.push(`refusing to write a traceability comment for archive name ${JSON.stringify(archiveName)}: the name must be a single non-whitespace token.`);
        return result;
    }
    // Group by file so a document declaring two of this change's features is
    // read, parsed and written once.
    const byFile = new Map();
    for (const slug of wanted) {
        const file = String(featureDocs?.[slug]?.file || '').trim();
        if (!file) {
            result.warnings.push(`feature "${slug}" has no feature document in the index, so no traceability comment was written. Declare it with <!-- ospec:feature ${slug} --> and rebuild the index.`);
            continue;
        }
        byFile.set(file, [...(byFile.get(file) || []), slug]);
    }
    for (const [file, fileSlugs] of byFile) {
        const absolutePath = path.join(projectRoot, ...file.split('/'));
        try {
            await applyToDocument(absolutePath, file, fileSlugs, archiveName, result);
        }
        catch (error) {
            // Belt and braces: nothing above should throw, and if something new
            // does, it still must not take the archive down with it.
            result.warnings.push(`could not record the traceability comment in ${file}: ${error?.message || error}`);
        }
    }
    return result;
}
