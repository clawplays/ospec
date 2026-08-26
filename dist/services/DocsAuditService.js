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
exports.DocsAuditService = void 0;
exports.createDocsAuditService = createDocsAuditService;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
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
                kind: entry.kind ?? 'feature',
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
    /**
     * P8: `ospec docs audit --stale` -- is a document DEAD, rather than merely
     * behind? Three deterministic signals, each cheap and each read-only:
     *
     *  - `dead_binding`: every one of a binding's `code:` prefixes is gone from
     *    disk. The code this section answered for no longer exists, which is
     *    the strongest "this documentation is over" signal there is.
     *  - `superseded_marker`: EVERY decision a design document carries says
     *    Superseded, yet the document is not marked `status: deprecated` -- the
     *    whole file is plausibly retire-ready. Judged per file, never per
     *    section: one superseded decision next to a living one is correctly
     *    recorded history, exactly what verify_decision instructs.
     *  - `deprecated`: the document IS marked `status: deprecated` in its
     *    frontmatter. Not a problem, a queue: these are what `ospec docs
     *    retire` collects.
     *
     * Signals that would need judgment -- "is this plan fulfilled", "does the
     * product spec still match" -- are deliberately absent. A staleness report
     * that guesses trains people to ignore it.
     */
    async stale(projectRoot, config) {
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config ?? null);
        if (!(await this.fileService.exists(indexPath))) {
            return { available: false, reason: 'No SKILL.index.json. Run "ospec index build" first.', scanned: 0, stale: [] };
        }
        let index;
        try {
            index = await this.fileService.readJSON(indexPath);
        }
        catch (error) {
            return {
                available: false,
                reason: `SKILL.index.json could not be read: ${error?.message || error}`,
                scanned: 0, stale: [],
            };
        }
        const stale = [];
        const bindings = Object.values(index?.feature_docs ?? {});
        const documentCache = new Map();
        const readDocument = async (file) => {
            if (!documentCache.has(file)) {
                const absolute = path.join(projectRoot, ...String(file).split('/'));
                documentCache.set(file, await this.fileService.readFile(absolute).catch(() => null));
            }
            return documentCache.get(file) ?? null;
        };
        for (const entry of bindings) {
            const code = Array.isArray(entry.code) ? entry.code.filter(Boolean) : [];
            if (code.length > 0) {
                let anyExists = false;
                for (const prefix of code) {
                    const absolute = path.join(projectRoot, ...String(prefix).replace(/\/+$/, '').split('/'));
                    if (await this.fileService.exists(absolute)) {
                        anyExists = true;
                        break;
                    }
                }
                if (!anyExists) {
                    stale.push({
                        signal: 'dead_binding',
                        slug: entry.slug,
                        kind: entry.kind ?? 'feature',
                        file: entry.file,
                        heading: entry.heading,
                        detail: `every code: path is gone from disk (${code.join(', ')}); the code this section documents no longer exists`,
                    });
                }
            }
        }
        // Superseded is judged PER FILE, not per section. A single superseded
        // section next to a living decision is correctly recorded history -- the
        // verify_decision obligation tells the author to mark exactly that -- and
        // flagging it forever is the trains-people-to-ignore-it failure. The
        // signal fires only when EVERY decision a document carries is superseded:
        // then the whole file is plausibly retire-ready and the report says so.
        const designByFile = new Map();
        for (const entry of bindings) {
            if ((entry.kind ?? 'feature') !== 'design')
                continue;
            if (!designByFile.has(entry.file))
                designByFile.set(entry.file, []);
            designByFile.get(entry.file).push(entry);
        }
        for (const [file, entries] of designByFile) {
            const raw = await readDocument(file);
            if (raw === null)
                continue;
            const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
            const parsed = (0, helpers_1.parseFrontmatterDocument)(normalized);
            if (parsed.data?.status === 'deprecated')
                continue;
            // Index-time offsets against the current file: correct coordinate
            // space, but a document edited since the last build can shift a slice
            // onto a neighbour. A stale-index false positive here merely
            // over-reports in a read-only report; rebuild the index to clear it.
            const allSuperseded = entries.every(entry => /superseded/i.test(parsed.content.slice(entry.start, entry.end)));
            if (!allSuperseded)
                continue;
            stale.push({
                signal: 'superseded_marker',
                kind: 'design',
                file,
                detail: `every decision in this document is marked Superseded (${entries.map(entry => entry.slug).join(', ')}) but it is not status: deprecated -- consider retiring it`,
            });
        }
        const documents = index?.documents && typeof index.documents === 'object' && !Array.isArray(index.documents)
            ? Object.keys(index.documents)
            : [];
        for (const file of documents.sort()) {
            const raw = await readDocument(file);
            if (raw === null)
                continue;
            try {
                const data = (0, helpers_1.parseFrontmatterDocument)(raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')).data;
                if (data?.status === 'deprecated') {
                    stale.push({
                        signal: 'deprecated',
                        file,
                        detail: `marked status: deprecated${data?.superseded_by ? `, superseded by ${data.superseded_by}` : ''} -- ready for "ospec docs retire"`,
                    });
                }
            }
            catch {
                // A document whose frontmatter cannot be parsed is a different
                // problem with its own reporting; it is not stale evidence.
            }
        }
        return {
            available: true,
            scanned: bindings.length + documents.length,
            stale,
        };
    }
}
exports.DocsAuditService = DocsAuditService;
function createDocsAuditService(fileService) {
    return new DocsAuditService(fileService);
}
