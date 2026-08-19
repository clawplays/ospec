"use strict";
/**
 * SKILL parsing service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillParser = exports.SkillParser = void 0;
exports.parseFeatureDeclarations = parseFeatureDeclarations;
exports.registerFeatureDeclarations = registerFeatureDeclarations;
exports.readFeatureSlugList = readFeatureSlugList;
exports.readDocUpdateList = readDocUpdateList;
const helpers_1 = require("../utils/helpers");
const ChecklistScan_1 = require("../utils/ChecklistScan");
class SkillParser {
    normalizeLineEndings(content) {
        return String(content || '').replace(/\r\n?/g, '\n');
    }
    /**
     * Parse SKILL.md frontmatter and content.
     */
    parseFrontmatter(content) {
        const normalizedContent = this.normalizeLineEndings(content);
        const { data, content: body } = (0, helpers_1.parseFrontmatterDocument)(normalizedContent);
        const tags = Array.isArray(data.tags)
            ? data.tags.map(tag => String(tag).trim()).filter(Boolean)
            : typeof data.tags === 'string'
                ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
                : [];
        const title = typeof data.title === 'string' && data.title.trim().length > 0
            ? data.title.trim()
            : this.extractDocumentTitle(body);
        const name = typeof data.name === 'string' && data.name.trim().length > 0
            ? data.name.trim()
            : title || 'Unknown';
        return {
            data: {
                name,
                title: title || undefined,
                tags,
            },
            content: body,
        };
    }
    /**
     * Extract heading structure from Markdown.
     */
    extractSections(content) {
        const sections = {};
        const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
        const matches = [];
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            matches.push({
                level: match[1].length,
                title: match[2].trim(),
                start: match.index,
                headerEnd: match.index + match[0].length,
            });
        }
        for (let index = 0; index < matches.length; index += 1) {
            const current = matches[index];
            const next = matches[index + 1];
            sections[current.title] = {
                level: current.level,
                title: current.title,
                start: current.start,
                end: next ? next.start : content.length,
            };
        }
        return sections;
    }
    /**
     * Fully parse a SKILL.md file.
     */
    parseSkillFile(content) {
        const { data, content: body } = this.parseFrontmatter(this.normalizeLineEndings(content));
        const sections = this.extractSections(body);
        return {
            frontmatter: data,
            sections,
            content: body,
        };
    }
    /**
     * Feature declarations in a document's NORMALISED BODY.
     *
     * Pass the same string whose `sections` you hold -- `parseSkillFile`'s
     * `content`, or `parseFrontmatterDocument(...).content` -- so the offsets
     * land in one coordinate space. Throws on a malformed declaration; returns
     * `[]` for a document that simply declares no features.
     */
    extractFeatureDeclarations(body, filePath = '<document>') {
        return parseFeatureDeclarations(body, filePath);
    }
    /**
     * The exact text of a declared feature's section, from a RAW file read.
     *
     * The one supported way to turn `(start, end)` back into prose. Callers
     * that slice a raw CRLF file themselves get the wrong bytes on Windows,
     * which is why this exists instead of a documented recipe alone.
     */
    sliceFeatureSection(rawContent, declaration) {
        const body = (0, helpers_1.parseFrontmatterDocument)(this.normalizeLineEndings(rawContent)).content;
        return body.slice(declaration.start, declaration.end);
    }
    extractDocumentTitle(content) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return titleMatch?.[1]?.trim() || null;
    }
}
exports.SkillParser = SkillParser;
exports.skillParser = new SkillParser();
/* ── ospec:feature declarations ────────────────────────────────────────────
 *
 * 7.1. A feature is declared INLINE, on the first non-blank line under its
 * heading, and nowhere else:
 *
 *     ## Login timeout
 *
 *     <!-- ospec:feature login-timeout code:src/auth/,src/session/ -->
 *
 * There is deliberately no duplicate list in the file's frontmatter. The
 * slug-to-section binding stays local, so it survives a section being moved,
 * and this repository has been bitten too often by a second copy of one fact
 * (the checklist regex, five `quoteShellArg`s, twin `SKIP_DIRS`).
 *
 * Everything below is DUPLICATED VERBATIM in `src/tools/build-index.ts`, which
 * is built-ins-only because `ospec update` copies it out of dist into a user's
 * `.ospec/tools/build-index-auto.cjs`, where no relative require resolves. The
 * two copies are held in step by `tests/services/p7-feature-declarations.test.mjs`
 * (text identity) and `tests/tools/p7-index-builder-divergence.test.mjs`
 * (behavioural identity through both entry points).
 *
 * It lives BELOW the class deliberately. `scripts/build-dist.js` canonicalises
 * each emitted module's leading doc comment, and
 * `tests/build/build-canonicalization-report.test.mjs` pins how many modules
 * need that step. Putting this block above the class makes ITS comment the
 * module's leading one, `services/SkillParser.js` stops needing the step, and
 * three build tests go red. Function declarations hoist, so the class methods
 * above can call into it.
 */
/** A slug is lower-case kebab-case: `login-timeout`, `oauth2-pkce`. */
const FEATURE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
 * Why a `code:` entry is unusable, or null when it is fine.
 *
 * A `code:` entry is a repo-relative PATH PREFIX. `src/auth/` and `src/auth`
 * both match `src/auth/login.ts`; only a full path segment counts, so
 * `src/auth` never matches `src/authz/x.ts`. Absolute paths, backslashes and
 * `..` are rejected rather than normalised, because each one means the author
 * pasted an OS path instead of writing a repository path, and quietly fixing it
 * would hide that from them.
 */
function featureCodePathProblem(value) {
    if (!value)
        return 'is empty; write comma-separated paths with no spaces, for example "code:src/auth/,src/session/"';
    if (value.includes('\\'))
        return 'uses a backslash; code paths are repository-relative and always use "/"';
    if (/^[/~]/.test(value) || /^[A-Za-z]:/.test(value))
        return 'is absolute; code paths are relative to the repository root';
    if (value.split('/').includes('..'))
        return 'escapes the repository with ".."; code paths are relative to the repository root';
    return null;
}
/**
 * Reads one line as an `ospec:feature` directive.
 *
 * Returns null when the line is not one at all -- an ordinary comment, prose,
 * anything. Returns `{ error }` when the line clearly MEANS to be one and is
 * wrong, which is a build failure rather than a silent skip: a typo'd
 * declaration that indexed as "no feature here" is exactly the failure mode
 * this convention exists to prevent.
 */
function readFeatureDirective(line) {
    const trimmed = String(line ?? '').trim();
    if (!trimmed.startsWith('<!--') || !/ospec:feature\b/.test(trimmed))
        return null;
    const match = /^<!--\s*ospec:feature\b(.*?)-->$/.exec(trimmed);
    if (!match) {
        return { error: 'it is not one complete HTML comment on a single line, opened with "<!--" and closed with "-->"' };
    }
    const tokens = match[1].trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0)
        return { error: 'no feature slug was given' };
    const slug = tokens[0];
    if (!FEATURE_SLUG_PATTERN.test(slug)) {
        return { error: `"${slug}" is not a valid slug; a slug is lower-case kebab-case matching ^[a-z0-9]+(-[a-z0-9]+)*$` };
    }
    const code = [];
    for (const token of tokens.slice(1)) {
        if (!token.startsWith('code:')) {
            return { error: `unexpected "${token}"; the only key allowed after the slug is "code:"` };
        }
        const value = token.slice('code:'.length);
        if (!value)
            return { error: '"code:" carries no path; write "code:src/auth/" with no space after the colon' };
        for (const entry of value.split(',')) {
            const problem = featureCodePathProblem(entry);
            if (problem)
                return { error: `code path "${entry}" ${problem}` };
            code.push(entry.replace(/^\.\//, ''));
        }
    }
    return { slug, code: Array.from(new Set(code)).sort() };
}
/** Reads one line as an `ospec:last-change` traceability comment. */
function readLastChangeDirective(line) {
    const match = /^<!--\s*ospec:last-change\s+(\S+)\s*-->$/.exec(String(line ?? '').trim());
    return match ? match[1] : null;
}
/**
 * The one shape every `ospec:feature` failure takes. The reader is an AI with
 * no other context, so the message carries the location, the reason, the form,
 * a worked example, and the rules -- not just "invalid declaration".
 */
function featureDeclarationError(filePath, lineNumber, heading, reason) {
    const where = heading ? ` under heading "${heading}"` : '';
    const error = new Error(`${filePath}:${lineNumber}: invalid <!-- ospec:feature --> declaration${where}: ${reason}.\n`
        + '  Expected form: <!-- ospec:feature <slug> [code:<path>[,<path>...]] -->\n'
        + '  Example:       <!-- ospec:feature login-timeout code:src/auth/,src/session/ -->\n'
        + '  Rules: exactly one declaration, on the first non-blank line under its "##" heading; '
        + 'the slug is lower-case kebab-case and unique across the whole project; '
        + 'code paths are repository-relative, use "/", and are comma-separated with no spaces.\n'
        + '  A section with no declaration is simply not a feature, which is allowed -- '
        + 'delete the comment if this section is not one.');
    error.name = 'FeatureDeclarationError';
    return error;
}
/** The same, for the traceability comment the archive step maintains. */
function lastChangeError(filePath, lineNumber, heading, reason) {
    const error = new Error(`${filePath}:${lineNumber}: invalid <!-- ospec:last-change --> comment under heading "${heading}": ${reason}.\n`
        + '  Expected form: <!-- ospec:last-change <archive-name> -->\n'
        + '  Example:       <!-- ospec:last-change 2026-08-14-fix-login-timeout -->\n'
        + '  Rules: at most one per feature section, conventionally the last line of the section. '
        + '`ospec archive` writes and replaces it; keep exactly one so the replacement stays idempotent.');
    error.name = 'FeatureDeclarationError';
    return error;
}
/**
 * Every feature declared in one document, in document order.
 *
 * Fenced code blocks are skipped for BOTH headings and declarations, so the
 * convention can be written out inside a ``` block without registering itself
 * as a feature, and a fenced `## example` cannot truncate a real feature's
 * range. `extractSections` does not skip fences -- a documented difference, and
 * the safe direction to differ in.
 *
 * Throws on anything malformed. It never throws on ABSENCE: a section with no
 * declaration is not a feature, and that is a normal document, not an error.
 */
function parseFeatureDeclarations(content, filePath = '<document>') {
    const normalized = String(content ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');
    const fenced = (0, ChecklistScan_1.fencedLineFlags)(normalized);
    const offsets = [];
    let cursor = 0;
    for (const line of lines) {
        offsets.push(cursor);
        cursor += line.length + 1;
    }
    const headings = [];
    for (let index = 0; index < lines.length; index += 1) {
        if (fenced[index])
            continue;
        const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
        if (heading)
            headings.push({ level: heading[1].length, title: heading[2].trim(), line: index });
    }
    const declarations = [];
    const claimed = new Set();
    for (let position = 0; position < headings.length; position += 1) {
        const heading = headings[position];
        let probe = heading.line + 1;
        while (probe < lines.length && lines[probe].trim() === '')
            probe += 1;
        if (probe >= lines.length || fenced[probe])
            continue;
        const directive = readFeatureDirective(lines[probe]);
        if (!directive)
            continue;
        claimed.add(probe);
        if (directive.error)
            throw featureDeclarationError(filePath, probe + 1, heading.title, directive.error);
        let endLine = lines.length;
        for (let next = position + 1; next < headings.length; next += 1) {
            if (headings[next].level > heading.level)
                continue;
            endLine = headings[next].line;
            break;
        }
        let lastChange;
        for (let scan = heading.line + 1; scan < endLine; scan += 1) {
            if (fenced[scan])
                continue;
            const archive = readLastChangeDirective(lines[scan]);
            if (!archive)
                continue;
            if (lastChange !== undefined) {
                throw lastChangeError(filePath, scan + 1, heading.title, 'the section already carries one');
            }
            lastChange = archive;
        }
        declarations.push({
            slug: directive.slug,
            heading: heading.title,
            level: heading.level,
            start: offsets[heading.line],
            end: endLine < lines.length ? offsets[endLine] : normalized.length,
            code: directive.code || [],
            ...(lastChange === undefined ? {} : { last_change: lastChange }),
        });
    }
    // A declaration that is not directly under a heading binds to nothing, so
    // it would index as "this feature does not exist" -- silently. Fail instead.
    for (let index = 0; index < lines.length; index += 1) {
        if (fenced[index] || claimed.has(index))
            continue;
        const directive = readFeatureDirective(lines[index]);
        if (!directive)
            continue;
        throw featureDeclarationError(filePath, index + 1, null, 'it is not the first non-blank line under a heading, so it is bound to no section');
    }
    return declarations;
}
/**
 * Adds one document's declarations to the project-wide slug map, failing on a
 * duplicate slug.
 *
 * B4 fail-loud. A slug is the only handle `ospec docs locate` has, so two
 * sections answering to one slug is an ambiguity no later stage can resolve,
 * and a silent last-writer-wins would make a feature's documentation vanish
 * from the index without a word. The message names BOTH locations, because
 * "duplicate slug x" alone leaves the reader grepping.
 *
 * The two paths are sorted before printing -- plain code-unit order, which
 * only decides which is printed first -- so the message does not depend on
 * walk order.
 */
function registerFeatureDeclarations(featureDocs, file, declarations) {
    for (const declaration of declarations) {
        const existing = featureDocs[declaration.slug];
        if (existing) {
            const [first, second] = [
                `${file}#${declaration.heading}`,
                `${existing.file}#${existing.heading}`,
            ].sort();
            throw new Error(`duplicate ospec:feature slug "${declaration.slug}": declared in ${first} and in ${second}.\n`
                + '  A feature slug identifies exactly one section in the whole project. '
                + 'Rename one of the two declarations, or merge the two sections into one.');
        }
        featureDocs[declaration.slug] = { ...declaration, file };
    }
}
/**
 * Feature slugs read off an archived change's `proposal.md` / `state.json`.
 *
 * 7.2. Unlike a live feature document, an ARCHIVE is immutable history: an old
 * proposal carrying a slug that predates the naming rule must not be able to
 * wedge `ospec index build` forever. So an entry that is not a valid slug is
 * dropped here rather than thrown on. The fail-loud rule applies where the
 * author can still act -- a declaration in a living document.
 */
function readFeatureSlugList(value) {
    const items = Array.isArray(value)
        ? value.map(entry => String(entry ?? ''))
        : typeof value === 'string' ? value.split(',') : [];
    return Array.from(new Set(items.map(entry => entry.trim()).filter(entry => FEATURE_SLUG_PATTERN.test(entry)))).sort();
}
/**
 * `path#section` targets an archived change updated.
 *
 * The path half is normalised the way every other indexed path is -- POSIX
 * separators, no leading `./` -- so a Windows-authored `docs\features\a.md#X`
 * and a POSIX one land on the same string. The section half is left exactly as
 * written, because a heading may legitimately contain a backslash.
 */
function readDocUpdateList(value) {
    const items = Array.isArray(value)
        ? value.map(entry => String(entry ?? ''))
        : typeof value === 'string' ? value.split(',') : [];
    return Array.from(new Set(items.map(entry => {
        const trimmed = entry.trim();
        if (!trimmed)
            return '';
        const hash = trimmed.indexOf('#');
        const filePart = hash === -1 ? trimmed : trimmed.slice(0, hash);
        const sectionPart = hash === -1 ? '' : trimmed.slice(hash);
        return filePart.replace(/\\/g, '/').replace(/^\.\//, '') + sectionPart;
    }).filter(Boolean))).sort();
}
