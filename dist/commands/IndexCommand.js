"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexCommand = void 0;
const path_1 = __importDefault(require("path"));
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class IndexCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'check', projectPath, rawArgs = []) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getIndexHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'build': {
                    const index = await services_1.services.projectService.rebuildIndex(targetPath);
                    this.success(`Index rebuilt at ${index.path}`);
                    if (index.stats) {
                        this.info(`  Files: ${index.stats.totalFiles}, Modules: ${index.stats.totalModules}, Sections: ${index.stats.totalSections}`);
                    }
                    break;
                }
                case 'check': {
                    const index = await services_1.services.projectService.getIndexStatus(targetPath);
                    console.log('\nIndex Status');
                    console.log('============\n');
                    console.log(`Present: ${index.exists ? 'yes' : 'no'}`);
                    console.log(`Path: ${index.path}`);
                    console.log(`Updated: ${index.updatedAt ?? 'unknown'}`);
                    console.log(`Needs rebuild: ${index.needsRebuild ? 'yes' : 'no'}`);
                    console.log(`Stale: ${index.stale ? 'yes' : 'no'}`);
                    console.log(`Latest source update: ${index.latestSourceUpdatedAt ?? 'unknown'}`);
                    if (index.stats) {
                        console.log(`Stats: ${index.stats.totalFiles} files, ${index.stats.totalModules} modules, ${index.stats.totalSections} sections`);
                    }
                    if (index.reasons.length > 0) {
                        console.log('Reasons:');
                        for (const reason of index.reasons) {
                            console.log(`  - ${reason}`);
                        }
                    }
                    console.log('');
                    break;
                }
                case 'query': {
                    await this.query(rawArgs);
                    break;
                }
                case 'gc': {
                    await this.gc(rawArgs);
                    break;
                }
                case 'tool-path': {
                    // 7.10a: the git hooks prefer the INSTALLED CLI's own copy
                    // of the build-index tool over the one copied into the
                    // project, so a machine with the CLI runs current code and
                    // never depends on the project copy being in sync. This
                    // prints that path and nothing else, because a shell hook
                    // consumes it with a command substitution.
                    console.log(services_1.services.projectAssetService.getPackagedBuildIndexToolPath());
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getIndexHelpText)());
            }
        }
        catch (error) {
            this.error(`Index command failed: ${error}`);
            throw error;
        }
    }
    /**
     * 7.10c: `ospec index gc`. List archived-change entries whose archive
     * directory no longer exists, and remove them on confirmation.
     *
     * What this is NOT, because the plan's phrasing invites the wrong
     * expectation: a rebuild does not resurrect these. `archived_changes` is
     * built from `current.map(...)` over the directories actually on disk, and
     * the git-history merge only unions FIELDS onto entries that already exist.
     * So an entry with no archive directory got there another way -- a hand
     * edit, a branch merge of two committed indexes, an archive deleted while
     * the index was not rebuilt, or 7.9's migration -- and it stays until
     * something removes it. This is that something.
     *
     * What IS monotonic is the field union: `target_files`,
     * `verification_commands`, `project_documents`, `features`, `doc_updates`
     * and `documents` never shrink, by design, so an entry does not lose them
     * when its archive is briefly unreadable. gc reports that growth but does
     * not touch it -- discarding it is what the merge exists to prevent.
     */
    async gc(rawArgs) {
        let apply = false;
        let json = false;
        let targetPath = process.cwd();
        for (let index = 0; index < rawArgs.length; index += 1) {
            const arg = rawArgs[index];
            if (arg === 'gc')
                continue;
            if (arg === '--apply') {
                apply = true;
                continue;
            }
            if (arg === '--json') {
                json = true;
                continue;
            }
            if (arg === '--path') {
                const value = rawArgs[index + 1];
                if (!value || value.startsWith('--'))
                    throw new Error('--path requires a directory');
                targetPath = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--path=')) {
                targetPath = arg.slice('--path='.length);
                continue;
            }
            if (arg.startsWith('--'))
                throw new Error(`Unknown index gc flag: ${arg}`);
            targetPath = arg;
        }
        const status = await services_1.services.projectService.getIndexStatus(targetPath);
        if (!status.exists) {
            throw new Error(`SKILL.index.json not found at ${status.path}; run "ospec index build" first.`);
        }
        const raw = await services_1.services.fileService.readFile(status.path);
        const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
        const entries = Array.isArray(index?.archived_changes) ? index.archived_changes : [];
        const projectRoot = path_1.default.dirname(status.path);
        const orphans = [];
        for (const entry of entries) {
            const archive = String(entry?.archive || '').trim();
            if (!archive) {
                orphans.push({ feature: String(entry?.feature || 'unknown'), archive: '' });
                continue;
            }
            const absolute = path_1.default.join(projectRoot, ...archive.split('/'));
            if (!(await services_1.services.fileService.exists(absolute))) {
                orphans.push({ feature: String(entry?.feature || 'unknown'), archive });
            }
        }
        const orphanArchives = new Set(orphans.map(item => item.archive));
        const kept = entries.filter(entry => !orphanArchives.has(String(entry?.archive || '').trim()));
        // The union fields are the part that genuinely only grows; report the
        // size so "why is my index large" has an answer that is not this list.
        const mergedListEntries = entries.reduce((total, entry) => total
            + (Array.isArray(entry?.target_files) ? entry.target_files.length : 0)
            + (Array.isArray(entry?.verification_commands) ? entry.verification_commands.length : 0)
            + (Array.isArray(entry?.project_documents) ? entry.project_documents.length : 0), 0);
        if (apply && orphans.length > 0) {
            await services_1.services.fileService.writeFileAtomic(status.path, `${JSON.stringify({ ...index, archived_changes: kept }, null, 2)}\n`);
        }
        if (json) {
            console.log(JSON.stringify({
                version: '1.0',
                indexPath: status.path,
                applied: apply && orphans.length > 0,
                scanned: entries.length,
                removable: orphans.length,
                remaining: apply && orphans.length > 0 ? kept.length : entries.length,
                mergedListEntries,
                entries: orphans,
            }, null, 2));
            return;
        }
        console.log('\nIndex GC');
        console.log('========\n');
        console.log(`Index: ${status.path}`);
        console.log(`Archived changes: ${entries.length}`);
        console.log(`Merged list entries (never shrink by design): ${mergedListEntries}`);
        if (orphans.length === 0) {
            console.log('\nNothing to collect: every archived_changes entry still has its archive directory.\n');
            return;
        }
        console.log(`\nEntries whose archive no longer exists: ${orphans.length}`);
        for (const orphan of orphans) {
            console.log(`  - ${orphan.feature} -> ${orphan.archive || '(no archive path recorded)'}`);
        }
        if (apply) {
            console.log(`\nRemoved ${orphans.length} entr${orphans.length === 1 ? 'y' : 'ies'}; ${kept.length} remain.`);
            console.log('Their archived evidence is already gone from disk; this only removes the index rows that pointed at it.\n');
        }
        else {
            console.log('\nThis was a dry run. Nothing was written.');
            console.log('Re-run with --apply to remove them. Check first that the archives were deleted deliberately: an archive that is merely unreadable right now still exists, and this command would not list it.\n');
        }
    }
    /**
     * Token-bounded index retrieval: return only the entries matching the
     * given keywords so AI sessions never need to read the whole
     * SKILL.index.json (which grows without bound as changes are archived).
     */
    async query(rawArgs) {
        let limit = 8;
        let json = false;
        let targetPath = process.cwd();
        const keywords = [];
        for (let index = 0; index < rawArgs.length; index += 1) {
            const arg = rawArgs[index];
            if (arg === '--json') {
                json = true;
                continue;
            }
            if (arg === '--limit') {
                const value = Number(rawArgs[index + 1]);
                if (!Number.isInteger(value) || value < 1) {
                    throw new Error('--limit requires a positive integer');
                }
                limit = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--limit=')) {
                const value = Number(arg.slice('--limit='.length));
                if (!Number.isInteger(value) || value < 1) {
                    throw new Error('--limit requires a positive integer');
                }
                limit = value;
                continue;
            }
            if (arg === '--path') {
                const value = rawArgs[index + 1];
                if (!value || value.startsWith('--'))
                    throw new Error('--path requires a directory');
                targetPath = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--path=')) {
                targetPath = arg.slice('--path='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown index query flag: ${arg}`);
            }
            keywords.push(arg.trim().toLowerCase());
        }
        const terms = keywords.filter(Boolean);
        if (terms.length === 0) {
            throw new Error('Usage: ospec index query <keyword...> [--path <dir>] [--limit N] [--json]');
        }
        const status = await services_1.services.projectService.getIndexStatus(targetPath);
        if (!status.exists) {
            throw new Error(`SKILL.index.json not found at ${status.path}; run "ospec index build" first.`);
        }
        const raw = await services_1.services.fileService.readFile(status.path);
        const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
        const matches = [];
        const textOf = (value) => Array.isArray(value)
            ? value.map(item => String(item ?? '')).join(' ')
            : String(value ?? '');
        const scoreEntry = (fields) => {
            let score = 0;
            const matched = new Set();
            for (const term of terms) {
                for (const [haystack, weight] of fields) {
                    if (haystack.includes(term)) {
                        score += weight;
                        matched.add(term);
                    }
                }
            }
            return { score, matched: [...matched] };
        };
        const documentsAreArray = Array.isArray(index?.documents);
        const documentEntries = documentsAreArray
            ? index.documents.map((document, documentIndex) => [String(documentIndex), document])
            : Object.entries(index?.documents ?? {});
        for (const [documentKey, document] of documentEntries) {
            // Score the fields the index builders actually emit
            // (`file`/`title`/`tags`/`kind`/`sections`/`features`/`modules`/`aliases`).
            // The previous list scored `name`, `path` and `summary`, none of
            // which either builder has ever written, so `aliases` and `modules`
            // — the two fields authors add specifically to be findable — could
            // not be searched at all.
            const { score, matched } = scoreEntry([
                [textOf(document?.title).toLowerCase(), 3],
                [textOf(document?.aliases).toLowerCase(), 3],
                [textOf(document?.features).toLowerCase(), 2],
                [textOf(document?.tags).toLowerCase(), 2],
                [textOf(document?.modules).toLowerCase(), 2],
                [textOf(document?.file).toLowerCase(), 1],
                [textOf(document?.kind).toLowerCase(), 1],
                [documentsAreArray ? '' : documentKey.toLowerCase(), 1],
            ]);
            if (score > 0) {
                matches.push({
                    kind: 'document',
                    score,
                    matched,
                    entry: document,
                    key: documentsAreArray ? undefined : documentKey,
                });
            }
        }
        // 7.2: feature slugs are their own kind. They score highest because a
        // slug hit is an exact answer -- `docs/features/auth.md#Login timeout`
        // and a byte range -- while a document hit is only "open this file".
        for (const [slug, entry] of Object.entries(index?.feature_docs ?? {})) {
            const { score, matched } = scoreEntry([
                [String(slug).toLowerCase(), 4],
                [textOf(entry?.heading).toLowerCase(), 3],
                [textOf(entry?.code).toLowerCase(), 2],
                [textOf(entry?.file).toLowerCase(), 1],
            ]);
            if (score > 0)
                matches.push({ kind: 'feature', score, matched, entry, key: slug });
        }
        for (const change of Array.isArray(index?.archived_changes) ? index.archived_changes : []) {
            const { score, matched } = scoreEntry([
                [textOf(change?.feature).toLowerCase(), 3],
                [textOf(change?.summary).toLowerCase(), 2],
                [textOf(change?.affects).toLowerCase(), 2],
                [textOf(change?.target_files).toLowerCase(), 1],
                [textOf(change?.verification_commands).toLowerCase(), 1],
                [textOf(change?.archive).toLowerCase(), 1],
                [textOf(change?.features).toLowerCase(), 2],
                [textOf(change?.doc_updates).toLowerCase(), 1],
            ]);
            if (score > 0)
                matches.push({ kind: 'archived_change', score, matched, entry: change });
        }
        matches.sort((left, right) => right.score - left.score
            || right.matched.length - left.matched.length);
        const selected = matches.slice(0, limit);
        if (json) {
            console.log(JSON.stringify({
                version: '1.0',
                indexPath: status.path,
                terms,
                totalMatches: matches.length,
                returned: selected.length,
                results: selected.map(match => ({
                    kind: match.kind,
                    score: match.score,
                    matched: match.matched,
                    entry: match.entry,
                })),
            }, null, 2));
            return;
        }
        console.log(`\nIndex Query: ${terms.join(' ')}`);
        console.log(`Matches: ${matches.length}${matches.length > selected.length ? ` (showing top ${selected.length}; raise --limit for more)` : ''}\n`);
        for (const match of selected) {
            if (match.kind === 'feature') {
                const entry = match.entry;
                // One line that is already the answer: where the section is and
                // exactly which bytes to read, so the caller never rescans.
                console.log(`- [feature] ${match.key} -> ${textOf(entry?.file)}#${textOf(entry?.heading)}`);
                console.log(`    bytes: ${entry?.start}-${entry?.end}${(entry?.code || []).length > 0 ? `  code: ${(entry.code || []).join(', ')}` : ''}`);
            }
            else if (match.kind === 'document') {
                const entry = match.entry;
                // The whole point of the command is to hand back a path to open
                // instead of the entire index, so the path is the one thing
                // this line must never omit: `file` is what both builders
                // write, and the `documents` map key is the same path when it
                // is missing.
                const location = textOf(entry?.file).trim() || match.key || 'unknown';
                console.log(`- [doc] ${location}${entry?.title ? ` — ${entry.title}` : ''}`);
            }
            else {
                const entry = match.entry;
                const summary = textOf(entry?.summary);
                console.log(`- [archived] ${entry?.feature || 'unknown'} — ${summary.length > 100 ? `${summary.slice(0, 100)}...` : summary || 'no summary'}`);
                // 7.7 deleted the generated knowledge document this used to
                // name. `ospec changes show` renders the same content from the
                // entry and the archive directory, so point at that instead of
                // dropping the follow-up line.
                if (entry?.archive) {
                    console.log(`    archive: ${entry.archive}`);
                    if (entry?.feature)
                        console.log(`    details: ospec changes show ${entry.feature}`);
                }
            }
        }
        if (selected.length === 0) {
            console.log('No matches. Try broader keywords, or run "ospec index build" if the index is stale.');
        }
        console.log('');
    }
}
exports.IndexCommand = IndexCommand;
