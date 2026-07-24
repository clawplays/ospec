"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexCommand = void 0;
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
        for (const document of Array.isArray(index?.documents) ? index.documents : []) {
            const { score, matched } = scoreEntry([
                [textOf(document?.title).toLowerCase(), 3],
                [textOf(document?.name).toLowerCase(), 3],
                [textOf(document?.features).toLowerCase(), 2],
                [textOf(document?.tags).toLowerCase(), 2],
                [textOf(document?.path).toLowerCase(), 1],
                [textOf(document?.summary).toLowerCase(), 1],
            ]);
            if (score > 0)
                matches.push({ kind: 'document', score, matched, entry: document });
        }
        for (const change of Array.isArray(index?.archived_changes) ? index.archived_changes : []) {
            const { score, matched } = scoreEntry([
                [textOf(change?.feature).toLowerCase(), 3],
                [textOf(change?.summary).toLowerCase(), 2],
                [textOf(change?.affects).toLowerCase(), 2],
                [textOf(change?.target_files).toLowerCase(), 1],
                [textOf(change?.verification_commands).toLowerCase(), 1],
                [textOf(change?.archive).toLowerCase(), 1],
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
            if (match.kind === 'document') {
                const entry = match.entry;
                console.log(`- [doc] ${entry?.path || entry?.name || 'unknown'}${entry?.title ? ` — ${entry.title}` : ''}`);
            }
            else {
                const entry = match.entry;
                const summary = textOf(entry?.summary);
                console.log(`- [archived] ${entry?.feature || 'unknown'} — ${summary.length > 100 ? `${summary.slice(0, 100)}...` : summary || 'no summary'}`);
                if (entry?.knowledge_document)
                    console.log(`    knowledge: ${entry.knowledge_document}`);
                if (entry?.archive)
                    console.log(`    archive: ${entry.archive}`);
            }
        }
        if (selected.length === 0) {
            console.log('No matches. Try broader keywords, or run "ospec index build" if the index is stale.');
        }
        console.log('');
    }
}
exports.IndexCommand = IndexCommand;
