"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocsAuditService = void 0;
exports.createDocsAuditService = createDocsAuditService;
const child_process_1 = require("child_process");
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
class DocsAuditService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    git(cwd, args) {
        return (0, child_process_1.spawnSync)('git', args, { cwd, encoding: 'utf8', windowsHide: true });
    }
    /**
     * Resolve the commit that corresponds to an archive name.
     *
     * Strategy, in order: the commit that last touched the archive directory
     * (that is the archive commit itself), else the archive entry's
     * `completed_at` timestamp read from the index. A feature whose archive
     * cannot be located is REPORTED AS SKIPPED, never silently treated as clean.
     */
    resolveSince(projectRoot, archiveName, archived) {
        const entry = archived.find(item => item.feature === archiveName)
            || archived.find(item => String(item.archive || '').endsWith(`/${archiveName}`));
        if (entry?.archive) {
            const log = this.git(projectRoot, ['log', '-1', '--format=%H', '--', entry.archive]);
            const commit = log.status === 0 ? log.stdout.trim() : '';
            if (commit)
                return { rev: commit };
        }
        const log = this.git(projectRoot, ['log', '-1', '--format=%H', '--', `*${archiveName}*`]);
        const commit = log.status === 0 ? log.stdout.trim() : '';
        if (commit)
            return { rev: commit };
        if (entry?.completed_at)
            return { since: entry.completed_at };
        return {
            reason: `the archive "${archiveName}" named by its ospec:last-change comment could not be located in git history or the index`,
        };
    }
    async audit(projectRoot, config) {
        const repoCheck = this.git(projectRoot, ['rev-parse', '--is-inside-work-tree']);
        if (repoCheck.error || repoCheck.status !== 0) {
            return {
                available: false,
                reason: 'Not a Git repository, so there is no history to compare against.',
                scanned: 0, drifted: [], skipped: [],
            };
        }
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config ?? null);
        if (!(await this.fileService.exists(indexPath))) {
            return {
                available: false,
                reason: 'No SKILL.index.json. Run "ospec index build" first.',
                scanned: 0, drifted: [], skipped: [],
            };
        }
        let index;
        try {
            index = await this.fileService.readJSON(indexPath);
        }
        catch (error) {
            return {
                available: false,
                reason: `SKILL.index.json could not be read: ${error?.message || error}`,
                scanned: 0, drifted: [], skipped: [],
            };
        }
        const featureDocs = Object.values(index?.feature_docs ?? {});
        const archived = Array.isArray(index?.archived_changes)
            ? index.archived_changes
            : [];
        const drifted = [];
        const skipped = [];
        for (const entry of featureDocs) {
            const code = Array.isArray(entry.code) ? entry.code.filter(Boolean) : [];
            if (code.length === 0) {
                // Contract 2.1 rule 4: `code:` is optional and a feature without it is
                // still a feature. It simply cannot drift-check, and saying so is the
                // difference between "clean" and "not examined".
                skipped.push({ slug: entry.slug, reason: 'declares no code: paths, so it has nothing to compare' });
                continue;
            }
            if (!entry.last_change) {
                skipped.push({
                    slug: entry.slug,
                    reason: 'has no ospec:last-change comment yet, so there is no point to compare from',
                });
                continue;
            }
            const resolved = this.resolveSince(projectRoot, entry.last_change, archived);
            if (resolved.reason) {
                skipped.push({ slug: entry.slug, reason: resolved.reason });
                continue;
            }
            const range = resolved.rev ? [`${resolved.rev}..HEAD`] : [`--since=${resolved.since}`];
            const changed = this.git(projectRoot, ['log', ...range, '--name-only', '--format=', '--', ...code]);
            if (changed.error || changed.status !== 0) {
                skipped.push({ slug: entry.slug, reason: 'git could not compute the change range' });
                continue;
            }
            const changedPaths = Array.from(new Set(changed.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean))).sort();
            if (changedPaths.length === 0)
                continue;
            // Did the feature document itself move in that same range? If it did, a
            // human already responded to the code change and this is not drift.
            const docTouched = this.git(projectRoot, ['log', ...range, '--format=%H', '--', entry.file]);
            if (docTouched.status === 0 && docTouched.stdout.trim().length > 0)
                continue;
            const commits = this.git(projectRoot, ['log', ...range, '--format=%H', '--', ...code]);
            const commitCount = commits.status === 0
                ? commits.stdout.split(/\r?\n/).filter(Boolean).length
                : 0;
            const preview = changedPaths.slice(0, 5).join(', ');
            const more = changedPaths.length > 5 ? `, +${changedPaths.length - 5} more` : '';
            drifted.push({
                slug: entry.slug,
                target: `${entry.file}#${entry.heading}`,
                file: entry.file,
                heading: entry.heading,
                lastChange: entry.last_change,
                changedPaths,
                commitCount,
                summary: `${changedPaths.length} file(s) under its code: paths changed in ${commitCount} commit(s) since ${entry.last_change}, but ${entry.file} did not: ${preview}${more}`,
            });
        }
        return {
            available: true,
            scanned: featureDocs.length,
            drifted: drifted.sort((left, right) => left.slug.localeCompare(right.slug)),
            skipped: skipped.sort((left, right) => left.slug.localeCompare(right.slug)),
        };
    }
}
exports.DocsAuditService = DocsAuditService;
function createDocsAuditService(fileService) {
    return new DocsAuditService(fileService);
}
