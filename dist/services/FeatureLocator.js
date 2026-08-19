"use strict";
/**
 * 7.3. Resolution behind `ospec docs locate`.
 *
 * The command exists to save context: one lookup answers "where is the section
 * that describes this behaviour" so an AI reads ONE section instead of scanning
 * a document. That only pays off if the answer is smaller than the thing it
 * replaces, so everything here is shaped by a hard output budget (<= 200
 * tokens) and the formatting layer in `DocsCommand` is deliberately terse.
 *
 * Coordinate space, per the wave 1 contract 4: `start`/`end` on a
 * `FeatureDocEntry` are JS string indices into the document's NORMALISED BODY
 * -- the file read as UTF-8, BOM stripped, CRLF folded to `\n`, frontmatter
 * removed. They are not byte offsets and not raw-file offsets. `locateLines`
 * below is the only place that crosses back into raw-file coordinates, and it
 * does so by reconstructing that same normalisation rather than by guessing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLocatePath = normalizeLocatePath;
exports.codePrefixMatches = codePrefixMatches;
exports.locateByFeature = locateByFeature;
exports.locateByAffects = locateByAffects;
exports.locateLines = locateLines;
const helpers_1 = require("../utils/helpers");
const CANDIDATE_LIMIT = 3;
/** Repo-relative, `/`-separated, no leading `./` or `/`. */
function normalizeLocatePath(input) {
    return String(input ?? '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}
/**
 * Contract 2.2: an entry `e` matches a path `p` when `p === e`, or `p` starts
 * with `e` where `e` already ends with `/`, or `p` starts with `e + '/'`. Full
 * path segments only, so `src/auth` never matches `src/authz/x.ts`.
 */
function codePrefixMatches(prefix, targetPath) {
    const entry = normalizeLocatePath(prefix);
    const target = normalizeLocatePath(targetPath);
    if (!entry || !target)
        return false;
    if (target === entry)
        return true;
    return target.startsWith(`${entry}/`);
}
/** Shared leading path SEGMENTS, used only to rank near misses. */
function sharedSegmentDepth(left, right) {
    const leftParts = normalizeLocatePath(left).split('/').filter(Boolean);
    const rightParts = normalizeLocatePath(right).split('/').filter(Boolean);
    let depth = 0;
    while (depth < leftParts.length && depth < rightParts.length && leftParts[depth] === rightParts[depth]) {
        depth += 1;
    }
    return depth;
}
/** Levenshtein distance, used only to rank near misses. */
function editDistance(left, right) {
    if (left === right)
        return 0;
    if (!left.length)
        return right.length;
    if (!right.length)
        return left.length;
    let previous = Array.from({ length: right.length + 1 }, (_unused, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= right.length; j += 1) {
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
        }
        previous = current;
    }
    return previous[right.length];
}
function featureEntries(index) {
    const map = index?.feature_docs;
    if (!map || typeof map !== 'object' || Array.isArray(map))
        return [];
    return Object.entries(map)
        .filter(([, entry]) => entry && typeof entry === 'object')
        .map(([slug, entry]) => ({
        ...entry,
        slug: typeof entry.slug === 'string' ? entry.slug : slug,
        code: Array.isArray(entry.code) ? entry.code.map(String) : [],
    }));
}
function compareCodepoints(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
/**
 * `--feature <slug>`. An exact slug hit is the whole point -- one map lookup,
 * no scan. A miss offers the closest slugs so the caller's next command is a
 * correction rather than a fishing expedition.
 */
function locateByFeature(index, slug) {
    const wanted = String(slug ?? '').trim().toLowerCase();
    const entries = featureEntries(index);
    const exact = entries.find(entry => entry.slug.toLowerCase() === wanted);
    if (exact)
        return { matches: [exact], candidates: [] };
    // Rank near misses: substring relation first (a caller who typed a prefix or
    // a sub-word knows roughly what they want), then edit distance. Distance is
    // capped so an unrelated slug is not offered as a "candidate" -- a wrong
    // suggestion costs more than no suggestion.
    const maxDistance = Math.max(2, Math.floor(wanted.length / 2));
    const scored = entries
        .map(entry => {
        const candidateSlug = entry.slug.toLowerCase();
        const heading = String(entry.heading ?? '').toLowerCase();
        const contains = candidateSlug.includes(wanted) || wanted.includes(candidateSlug)
            || (wanted.length >= 3 && heading.includes(wanted));
        const distance = editDistance(wanted, candidateSlug);
        return { entry, contains, distance };
    })
        .filter(item => item.contains || item.distance <= maxDistance)
        .sort((left, right) => Number(right.contains) - Number(left.contains)
        || left.distance - right.distance
        || compareCodepoints(left.entry.slug, right.entry.slug))
        .slice(0, CANDIDATE_LIMIT);
    return {
        matches: [],
        candidates: scored.map(item => ({
            slug: item.entry.slug,
            file: String(item.entry.file ?? ''),
            heading: String(item.entry.heading ?? ''),
        })),
    };
}
/**
 * `--affects <path>`. Resolves through the `code:` declarations. Contract 2.2
 * fixes the ordering: longest matching prefix first, because the most specific
 * declaration is the one that actually describes the file. Ties break on slug
 * so the output does not depend on index key order.
 */
function locateByAffects(index, affectedPath) {
    const target = normalizeLocatePath(affectedPath);
    const entries = featureEntries(index);
    const matches = [];
    for (const entry of entries) {
        let best = null;
        for (const prefix of entry.code) {
            if (!codePrefixMatches(prefix, target))
                continue;
            const normalized = normalizeLocatePath(prefix);
            if (best === null || normalized.length > best.length)
                best = normalized;
        }
        if (best !== null)
            matches.push({ ...entry, matched_prefix: best });
    }
    matches.sort((left, right) => (right.matched_prefix || '').length - (left.matched_prefix || '').length
        || compareCodepoints(left.slug, right.slug));
    if (matches.length > 0)
        return { matches, candidates: [] };
    // Near misses for a path: features declaring code under the same directory.
    // A feature with no `code:` at all cannot be offered -- contract 2.1 rule 4
    // allows that, and it is exactly the case `--affects` cannot serve.
    //
    // Two shared segments, not one. In a repository where everything lives under
    // `src/`, a one-segment overlap is shared by every feature there is, so
    // offering them all as "closest" is noise dressed up as help. A single
    // segment only counts when that is all the path has.
    const minimumDepth = normalizeLocatePath(target).split('/').filter(Boolean).length > 1 ? 2 : 1;
    const scored = entries
        .map(entry => ({
        entry,
        depth: entry.code.reduce((best, prefix) => Math.max(best, sharedSegmentDepth(prefix, target)), 0),
    }))
        .filter(item => item.depth >= minimumDepth)
        .sort((left, right) => right.depth - left.depth || compareCodepoints(left.entry.slug, right.entry.slug))
        .slice(0, CANDIDATE_LIMIT);
    return {
        matches: [],
        candidates: scored.map(item => ({
            slug: item.entry.slug,
            file: String(item.entry.file ?? ''),
            heading: String(item.entry.heading ?? ''),
        })),
    };
}
/**
 * Cross back from the index's coordinate space into raw-file line numbers,
 * which is what a reader actually needs: `Read(offset, limit)` and `sed -n`
 * both take lines, and no agent tool takes a character index into a body with
 * the frontmatter removed.
 *
 * Returns null when the document cannot be read, which is the honest answer
 * for a stale index -- better a location with no read range than a confidently
 * wrong one.
 */
function locateLines(rawContent, entry) {
    const raw = String(rawContent ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const body = (0, helpers_1.parseFrontmatterDocument)(raw).content;
    // `content` is a suffix of the normalised source, so the difference is
    // exactly the frontmatter block's length -- the one honest way to shift an
    // index in body space back into raw-file space.
    const bodyOffset = raw.length - body.length;
    const start = Number(entry?.start);
    const end = Number(entry?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end))
        return null;
    if (start < 0 || start > body.length || end < start || end > body.length)
        return null;
    const text = body.slice(start, end);
    const lineOf = (bodyIndex) => {
        let count = 1;
        const limit = bodyOffset + bodyIndex;
        for (let i = 0; i < limit && i < raw.length; i += 1) {
            if (raw[i] === '\n')
                count += 1;
        }
        return count;
    };
    // A section's slice runs up to the next heading, so it carries the blank
    // lines that separate the two. Reporting them would tell the reader to read
    // whitespace, so the range ends on the last line with content.
    const trimmedLength = text.replace(/\s+$/, '').length;
    const startLine = lineOf(start);
    const endLine = lineOf(start + Math.max(0, trimmedLength - 1));
    return {
        lines: [startLine, Math.max(startLine, endLine)],
        bytes: Buffer.byteLength(text, 'utf8'),
        text,
    };
}
