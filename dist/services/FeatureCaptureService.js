"use strict";
/**
 * Phase 7.5 -- capture the feature slugs a change touches, at creation time.
 *
 * A change declares `features:` in its proposal frontmatter. Wave 1 already made
 * the index read that list (contract 6.2, IndexBuilder.readArchivedChange), so
 * this file only has to WRITE it; no index change is needed. 7.6 turns the list
 * into located documentation obligations.
 *
 * The list is allowed to be empty. A change whose feature is not yet documented
 * -- or is not a feature at all -- must still be creatable, and the plan says so
 * explicitly: "no match is allowed, the list can be filled in during planning".
 */
/** The wave-1 slug grammar (contract 2.1 rule 3). Kept in sync deliberately. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureCaptureService = void 0;
exports.createFeatureCaptureService = createFeatureCaptureService;
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const FEATURE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/**
 * Words that carry no signal about WHICH feature a change touches. They are the
 * change-protocol vocabulary itself, so nearly every change name contains one;
 * matching on them would suggest every feature in the project for every change.
 */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'by',
    'with', 'from', 'into', 'add', 'adds', 'added', 'fix', 'fixes', 'fixed',
    'update', 'updates', 'updated', 'change', 'changes', 'changed', 'remove',
    'removes', 'removed', 'refactor', 'refactors', 'refactored', 'improve',
    'improves', 'improved', 'support', 'supports', 'new', 'use', 'uses', 'make',
    'makes', 'this', 'that', 'it', 'is', 'be', 'do', 'docs', 'doc', 'test',
    'tests', 'perf', 'bug', 'bugfix', 'feature', 'maintenance', 'wip',
]);
class FeatureCaptureService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    /**
     * Read `feature_docs` out of the committed index. Returns `{}` for a project
     * with no index, no declarations, or an unreadable index -- suggestion is a
     * convenience, and a damaged index must not block creating a change.
     */
    async readFeatureDocs(rootDir, config) {
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config ?? null);
        if (!(await this.fileService.exists(indexPath)))
            return {};
        try {
            const index = await this.fileService.readJSON(indexPath);
            const featureDocs = index?.feature_docs;
            return featureDocs && typeof featureDocs === 'object' ? featureDocs : {};
        }
        catch {
            return {};
        }
    }
    /**
     * Split a change name (or any phrase) into scoring keywords. `kebab-case`,
     * `snake_case`, `camelCase` and spaces all decompose; stop words and
     * single-character fragments drop out.
     */
    keywords(text) {
        return Array.from(new Set(String(text || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(word => word.length > 1 && !STOP_WORDS.has(word))));
    }
    /**
     * Suggest feature slugs for a change, from `affects` paths and from keywords
     * in the change name.
     *
     * Two independent signals, deliberately scored differently:
     *  - an `affects` path covered by a feature's `code:` prefix is near-certain,
     *    so it outranks everything and orders by longest matching prefix, exactly
     *    as contract 2.2 defines for `docs locate --affects`;
     *  - a keyword shared with the slug or heading is a hint, nothing more.
     */
    suggest(featureDocs, input) {
        const entries = Object.values(featureDocs || {}).filter(entry => entry && typeof entry.slug === 'string');
        if (entries.length === 0)
            return [];
        const affects = (input.affects ?? [])
            .map(value => String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''))
            .filter(Boolean);
        const changeKeywords = this.keywords(input.changeName ?? '');
        const suggestions = [];
        for (const entry of entries) {
            // Contract 2.2: full path segments only, so `src/auth` never matches
            // `src/authz/x.ts`. Longest matching prefix wins.
            let longestPrefix = '';
            for (const prefix of Array.isArray(entry.code) ? entry.code : []) {
                const normalized = String(prefix || '').replace(/\/+$/, '');
                if (!normalized)
                    continue;
                const matched = affects.some(target => target === normalized || target.startsWith(`${normalized}/`));
                if (matched && normalized.length > longestPrefix.length)
                    longestPrefix = normalized;
            }
            const entryKeywords = new Set([
                ...this.keywords(entry.slug),
                ...this.keywords(entry.heading ?? ''),
            ]);
            const sharedKeywords = changeKeywords.filter(word => entryKeywords.has(word));
            if (longestPrefix) {
                suggestions.push({
                    slug: entry.slug,
                    file: entry.file,
                    heading: entry.heading,
                    kind: entry.kind ?? 'feature',
                    score: 1000 + longestPrefix.length,
                    reason: `declares code:${longestPrefix}, which covers this change's affects scope`,
                });
            }
            else if (sharedKeywords.length > 0) {
                suggestions.push({
                    slug: entry.slug,
                    file: entry.file,
                    heading: entry.heading,
                    kind: entry.kind ?? 'feature',
                    score: sharedKeywords.length,
                    reason: `name shares "${sharedKeywords.join('", "')}" with this change`,
                });
            }
        }
        return suggestions.sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug));
    }
    /**
     * Turn the raw repeated `--feature` values plus the project index into the
     * list to write and the candidates to show.
     *
     * An unknown-but-well-formed slug is KEPT, not dropped. A change may legally
     * introduce the first document for a feature that does not exist yet, and
     * refusing the slug would make the new-feature case the awkward one. A slug
     * that violates the grammar is dropped, because wave 1 fails the index
     * rebuild on it (contract 5) and writing it would wedge the project later.
     */
    async capture(rootDir, input, config) {
        const featureDocs = await this.readFeatureDocs(rootDir, config);
        const requested = Array.from(new Set((input.features ?? []).map(value => String(value || '').trim().toLowerCase()).filter(Boolean)));
        const invalid = requested.filter(slug => !FEATURE_SLUG_PATTERN.test(slug));
        const valid = requested.filter(slug => FEATURE_SLUG_PATTERN.test(slug));
        const unknown = valid.filter(slug => !featureDocs[slug]);
        const accepted = new Set(valid);
        return {
            features: valid.sort((left, right) => left.localeCompare(right)),
            suggestions: this.suggest(featureDocs, input).filter(item => !accepted.has(item.slug)),
            unknown,
            invalid,
        };
    }
}
exports.FeatureCaptureService = FeatureCaptureService;
function createFeatureCaptureService(fileService) {
    return new FeatureCaptureService(fileService);
}
