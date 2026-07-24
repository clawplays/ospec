"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexBuilder = exports.IndexBuilder = void 0;
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const helpers_1 = require("../utils/helpers");
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes', 'for-ai']);
const ARCHIVED_DOCUMENTS = [
    'proposal.md',
    'design.md',
    'implementation-plan.md',
    'tasks.md',
    'verification.md',
    'review.md',
    'artifacts/reviews/final-review.md',
    'artifacts/agents/force-archive.json',
];
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath, fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function readJson(filePath) {
    return JSON.parse((await fs_1.promises.readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
}
// The cache lives in a self-gitignored cache/ directory: its fingerprints are
// machine-local mtimes, so committing it would only produce repo churn.
const ARCHIVE_SCAN_CACHE_FILE = 'cache/SKILL.index.cache.json';
const FEATURE_INDEX_RECENT_LIMIT = 30;
const KNOWLEDGE_DOC_FORMAT = 2;
class IndexBuilder {
    constructor(skillParser) {
        /**
         * One immutable-input cache per run: archived changes never mutate after
         * they are written and markdown documents change rarely, so fingerprinting
         * them turns every rebuild and status check into O(changed inputs).
         * Deleting SKILL.index.cache.json forces a full rescan.
         */
        this.runCache = null;
        this.skillParser = skillParser;
    }
    async build(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        await this.loadRunCache(rootDir, config);
        const archivedChanges = await this.scanArchivedChangesWithHistory(rootDir, config);
        const snapshot = await this.buildSnapshot(rootDir, config, archivedChanges);
        await this.saveRunCache(rootDir, config);
        return snapshot;
    }
    async loadRunCache(rootDir, config) {
        const documentLanguage = String(config?.documentLanguage || 'en-US');
        const state = {
            docMetaOk: false,
            indexLoaded: false,
            fingerprints: {},
            nextFingerprints: {},
            documents: {},
            nextDocuments: {},
            cachedEntries: new Map(),
            nextEntries: {},
            docFps: {},
            nextDocFps: {},
            verifiedDocs: new Map(),
            indexArchivedChanges: null,
            hits: new Set(),
            misses: 0,
            missDirs: new Map(),
            documentLanguage,
        };
        try {
            const cachePath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, ARCHIVE_SCAN_CACHE_FILE, config);
            const cache = await pathExists(cachePath) ? await readJson(cachePath) : null;
            if (cache?.version === '1.0') {
                if (cache.fingerprints && typeof cache.fingerprints === 'object')
                    state.fingerprints = cache.fingerprints;
                if (cache.documents && typeof cache.documents === 'object')
                    state.documents = cache.documents;
                if (cache.docFps && typeof cache.docFps === 'object')
                    state.docFps = cache.docFps;
                // Reused entries come from the cache's own post-merge snapshots, never
                // from the on-disk index, so a damaged index cannot poison hits.
                if (cache.entries && typeof cache.entries === 'object') {
                    for (const [archive, entry] of Object.entries(cache.entries)) {
                        if (archive && entry && typeof entry === 'object')
                            state.cachedEntries.set(archive, entry);
                    }
                }
                state.docMetaOk = cache.documentLanguage === documentLanguage
                    && cache.knowledgeDocFormat === KNOWLEDGE_DOC_FORMAT;
            }
        }
        catch {
            // A damaged cache degrades to a full rescan, never to a failed build.
        }
        try {
            const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
            const currentIndex = await pathExists(indexPath) ? await readJson(indexPath) : null;
            if (currentIndex) {
                state.indexLoaded = true;
                state.indexArchivedChanges = Array.isArray(currentIndex.archived_changes) ? currentIndex.archived_changes : [];
            }
        }
        catch {
            state.indexLoaded = false;
        }
        this.runCache = state;
    }
    async saveRunCache(rootDir, config) {
        const state = this.runCache;
        this.runCache = null;
        if (!state)
            return;
        // Re-fingerprint freshly extracted archives after their knowledge documents
        // were written, so a new archive settles into cache hits on the next run.
        for (const [archive, archiveDir] of state.missDirs) {
            try {
                state.nextFingerprints[archive] = await this.computeArchiveFingerprint(rootDir, archiveDir);
            }
            catch {
                delete state.nextFingerprints[archive];
            }
        }
        // A doc fingerprint blesses the writer skip only after this run's writer
        // composed and verified that document; hit archives carry theirs forward.
        for (const [archive, docPath] of state.verifiedDocs) {
            try {
                const stat = await fs_1.promises.stat(docPath);
                state.nextDocFps[archive] = `${Math.round(stat.mtimeMs)}:${stat.size}`;
            }
            catch {
                delete state.nextDocFps[archive];
            }
        }
        for (const archive of state.hits) {
            if (!(archive in state.nextDocFps) && state.docFps[archive]) {
                state.nextDocFps[archive] = state.docFps[archive];
            }
        }
        try {
            const cachePath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, ARCHIVE_SCAN_CACHE_FILE, config);
            const next = `${JSON.stringify({
                version: '1.0',
                documentLanguage: state.documentLanguage,
                knowledgeDocFormat: KNOWLEDGE_DOC_FORMAT,
                fingerprints: state.nextFingerprints,
                entries: state.nextEntries,
                docFps: state.nextDocFps,
                documents: state.nextDocuments,
            }, null, 2)}\n`;
            await fs_1.promises.mkdir(path_1.default.dirname(cachePath), { recursive: true });
            const ignorePath = path_1.default.join(path_1.default.dirname(cachePath), '.gitignore');
            if (!(await pathExists(ignorePath)))
                await fs_1.promises.writeFile(ignorePath, '*\n', 'utf8');
            const previous = await pathExists(cachePath) ? await fs_1.promises.readFile(cachePath, 'utf8') : null;
            if (previous !== next)
                await fs_1.promises.writeFile(cachePath, next, 'utf8');
        }
        catch {
            // The fingerprint cache is a best-effort accelerator; failing to write it
            // must never fail an index build.
        }
    }
    async buildSnapshot(rootDir, config, archivedChanges) {
        const projectLayout = (0, ProjectLayout_1.getProjectLayout)(config);
        const managedRoot = (0, ProjectLayout_1.getProjectManagedRoot)(rootDir, projectLayout);
        const modules = {};
        const tagIndex = {};
        const documents = {};
        let totalFiles = 0;
        let totalSections = 0;
        const visit = async (currentDir) => {
            const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) {
                        await visit(fullPath);
                    }
                    continue;
                }
                if (entry.name !== constants_1.FILE_NAMES.SKILL_MD) {
                    continue;
                }
                totalFiles++;
                const relativePath = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
                const content = await fs_1.promises.readFile(fullPath, 'utf-8');
                const parsed = this.skillParser.parseSkillFile(content);
                const moduleName = parsed.frontmatter.name || relativePath;
                const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
                const tags = parsed.frontmatter.tags || [];
                const sections = parsed.sections;
                totalSections += Object.keys(sections).length;
                modules[moduleName] = {
                    file: relativePath,
                    title,
                    tags,
                    sections,
                };
                for (const tag of tags) {
                    if (!tagIndex[tag]) {
                        tagIndex[tag] = [];
                    }
                    tagIndex[tag].push(moduleName);
                }
            }
        };
        if (await pathExists(managedRoot)) {
            await visit(managedRoot);
        }
        const docsRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs', projectLayout);
        if (await pathExists(docsRoot)) {
            await this.visitMarkdownDocuments(rootDir, docsRoot, documents);
        }
        for (const change of archivedChanges) {
            for (const documentPath of change.project_documents || []) {
                const document = documents[documentPath];
                if (!document)
                    continue;
                document.features = Array.from(new Set([...(document.features || []), change.feature])).sort();
            }
        }
        const activeChangesDir = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/active', projectLayout);
        const activeChanges = (await pathExists(activeChangesDir))
            ? (await fs_1.promises.readdir(activeChangesDir)).sort((left, right) => left.localeCompare(right))
            : [];
        for (const tag of Object.keys(tagIndex)) {
            tagIndex[tag] = tagIndex[tag].sort((left, right) => left.localeCompare(right));
        }
        return {
            version: '1.0',
            generated: new Date().toISOString(),
            git_commit: null,
            active_changes: activeChanges,
            stats: {
                totalFiles,
                totalModules: Object.keys(modules).length,
                totalSections,
            },
            modules,
            tagIndex,
            documents,
            archived_changes: archivedChanges,
        };
    }
    async write(rootDir) {
        return (await this.writeWithSummary(rootDir)).index;
    }
    async writeWithSummary(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        await this.loadRunCache(rootDir, config);
        const archivedChanges = await this.scanArchivedChangesWithHistory(rootDir, config);
        const knowledgeWrite = await this.writeArchivedChangeKnowledgeDocuments(rootDir, config, archivedChanges);
        const featureIndexPath = await this.writeFeatureIndex(rootDir, config, archivedChanges);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const previous = (await pathExists(indexPath))
            ? (await readJson(indexPath))
            : null;
        const index = await this.buildSnapshot(rootDir, config, archivedChanges);
        const previousComparable = previous ? this.stripVolatileFields(previous) : null;
        const nextComparable = this.stripVolatileFields(index);
        let writtenIndex = index;
        if (previous && JSON.stringify(previousComparable) === JSON.stringify(nextComparable)) {
            writtenIndex = previous;
        }
        else {
            writtenIndex = {
                ...index,
                generated: new Date().toISOString(),
            };
            await fs_1.promises.writeFile(indexPath, JSON.stringify(writtenIndex, null, 2), 'utf-8');
        }
        await this.saveRunCache(rootDir, config);
        const managedPaths = Array.from(new Set([
            ...knowledgeWrite.managedPaths,
            ...knowledgeWrite.removedPaths,
            ...(featureIndexPath ? [featureIndexPath] : []),
            path_1.default.relative(rootDir, indexPath).replace(/\\/g, '/'),
        ])).sort((left, right) => left.localeCompare(right));
        return {
            index: writtenIndex,
            managedPaths,
            removedPaths: knowledgeWrite.removedPaths,
        };
    }
    async createEmpty(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const previous = (await pathExists(indexPath))
            ? (await readJson(indexPath))
            : null;
        const index = {
            version: '1.0',
            generated: new Date().toISOString(),
            git_commit: null,
            active_changes: [],
            stats: {
                totalFiles: 0,
                totalModules: 0,
                totalSections: 0,
            },
            modules: {},
            tagIndex: {},
            documents: {},
            archived_changes: [],
        };
        if (previous && JSON.stringify(this.stripVolatileFields(previous)) === JSON.stringify(this.stripVolatileFields(index))) {
            return previous;
        }
        await fs_1.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
        return index;
    }
    stripVolatileFields(index) {
        const { generated: _generated, ...stable } = index;
        return stable;
    }
    async readProjectConfig(rootDir) {
        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        if (!(await pathExists(configPath))) {
            return null;
        }
        try {
            return await readJson(configPath);
        }
        catch {
            return null;
        }
    }
    async visitMarkdownDocuments(rootDir, currentDir, documents) {
        const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
            .sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await this.visitMarkdownDocuments(rootDir, fullPath, documents);
                continue;
            }
            if (!entry.name.toLowerCase().endsWith('.md') || entry.name === constants_1.FILE_NAMES.SKILL_MD) {
                continue;
            }
            const relativePathForCache = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
            let fingerprint = null;
            try {
                const stat = await fs_1.promises.stat(fullPath);
                fingerprint = `${Math.round(stat.mtimeMs)}:${stat.size}`;
            }
            catch {
                fingerprint = null;
            }
            if (fingerprint && this.runCache) {
                const cached = this.runCache.documents[relativePathForCache];
                if (cached && cached.fp === fingerprint && cached.doc) {
                    documents[relativePathForCache] = JSON.parse(JSON.stringify(cached.doc));
                    this.runCache.nextDocuments[relativePathForCache] = { fp: fingerprint, doc: cached.doc };
                    continue;
                }
            }
            const content = await fs_1.promises.readFile(fullPath, 'utf8');
            let documentFrontmatter = {};
            try {
                documentFrontmatter = (0, helpers_1.parseFrontmatterDocument)(content).data || {};
            }
            catch {
                documentFrontmatter = {};
            }
            let parsed;
            let invalidFrontmatter = false;
            try {
                parsed = this.skillParser.parseSkillFile(content);
            }
            catch {
                invalidFrontmatter = true;
                parsed = {
                    frontmatter: { name: '', tags: [] },
                    sections: this.skillParser.extractSections(content),
                    content,
                };
            }
            const relativePath = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
            const kind = this.inferDocumentKind(relativePath);
            const tags = Array.from(new Set([
                ...(parsed.frontmatter.tags || []),
                'documentation',
                kind,
                ...(invalidFrontmatter ? ['frontmatter-invalid'] : []),
            ])).sort();
            const title = parsed.frontmatter.title || parsed.frontmatter.name || Object.keys(parsed.sections)[0] || entry.name.replace(/\.md$/i, '');
            documents[relativePath] = {
                file: relativePath,
                title,
                tags,
                kind,
                sections: parsed.sections,
                features: this.readMetadataList(documentFrontmatter.features),
                modules: this.readMetadataList(documentFrontmatter.modules),
                aliases: this.readMetadataList(documentFrontmatter.aliases),
            };
            if (fingerprint && this.runCache) {
                this.runCache.nextDocuments[relativePath] = {
                    fp: fingerprint,
                    doc: JSON.parse(JSON.stringify(documents[relativePath])),
                };
            }
        }
    }
    readMetadataList(value) {
        const items = Array.isArray(value)
            ? value.map(String)
            : typeof value === 'string'
                ? value.split(',')
                : [];
        const normalized = Array.from(new Set(items.map(item => item.trim()).filter(Boolean))).sort();
        return normalized.length > 0 ? normalized : undefined;
    }
    inferDocumentKind(relativePath) {
        const normalized = relativePath.replace(/\\/g, '/');
        if (normalized.includes('/docs/project/') || normalized.startsWith('docs/project/'))
            return 'project';
        if (normalized.includes('/docs/api/') || normalized.startsWith('docs/api/'))
            return 'api';
        if (normalized.includes('/docs/design/') || normalized.startsWith('docs/design/'))
            return 'design';
        if (normalized.includes('/docs/planning/') || normalized.startsWith('docs/planning/'))
            return 'planning';
        return 'other';
    }
    async scanArchivedChanges(rootDir, config) {
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/archived', config);
        if (!(await pathExists(archivedRoot)))
            return [];
        if (!this.runCache)
            await this.loadRunCache(rootDir, config);
        const cacheState = this.runCache;
        const entries = [];
        const visit = async (currentDir) => {
            const children = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
                .sort((left, right) => left.name.localeCompare(right.name));
            if (children.some(entry => entry.isFile() && entry.name === constants_1.FILE_NAMES.STATE)) {
                const archive = path_1.default.relative(rootDir, currentDir).replace(/\\/g, '/');
                const fingerprint = await this.computeArchiveFingerprint(rootDir, currentDir);
                const cachedEntry = cacheState.fingerprints[archive] === fingerprint
                    ? cacheState.cachedEntries.get(archive)
                    : undefined;
                if (cachedEntry) {
                    cacheState.nextFingerprints[archive] = fingerprint;
                    cacheState.hits.add(archive);
                    entries.push(JSON.parse(JSON.stringify(cachedEntry)));
                    return;
                }
                cacheState.misses += 1;
                const item = await this.readArchivedChange(rootDir, currentDir);
                if (item) {
                    cacheState.nextFingerprints[archive] = fingerprint;
                    cacheState.missDirs.set(archive, currentDir);
                    entries.push(item);
                }
                return;
            }
            for (const child of children) {
                if (child.isDirectory())
                    await visit(path_1.default.join(currentDir, child.name));
            }
        };
        await visit(archivedRoot);
        return entries.sort((left, right) => right.archive.localeCompare(left.archive));
    }
    async computeArchiveFingerprint(rootDir, archiveDir) {
        const statOf = async (filePath) => {
            try {
                const stat = await fs_1.promises.stat(filePath);
                return `${Math.round(stat.mtimeMs)}:${stat.size}`;
            }
            catch {
                return '-';
            }
        };
        const archive = path_1.default.relative(rootDir, archiveDir).replace(/\\/g, '/');
        const knowledgeDocument = this.getKnowledgeDocumentRelativePath(archive);
        return [
            await statOf(path_1.default.join(archiveDir, constants_1.FILE_NAMES.STATE)),
            await statOf(path_1.default.join(archiveDir, constants_1.FILE_NAMES.PROPOSAL)),
            await statOf(path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH)),
            knowledgeDocument ? await statOf(path_1.default.join(rootDir, ...knowledgeDocument.split('/'))) : '-',
        ].join('|');
    }
    readKnowledgeDocumentFallback(content) {
        const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!frontmatter)
            return null;
        const block = frontmatter[1];
        const readList = (key) => {
            const match = block.match(new RegExp(`^${key}: (\\[.*\\])$`, 'm'));
            if (!match)
                return undefined;
            try {
                const parsed = JSON.parse(match[1]);
                return Array.isArray(parsed) ? parsed.map(item => String(item ?? '').trim()).filter(Boolean) : undefined;
            }
            catch {
                return undefined;
            }
        };
        const readString = (key) => {
            const match = block.match(new RegExp(`^${key}: ("(?:[^"\\\\]|\\\\.)*")$`, 'm'));
            if (!match)
                return undefined;
            try {
                const parsed = JSON.parse(match[1]);
                return typeof parsed === 'string' && parsed.trim() ? parsed : undefined;
            }
            catch {
                return undefined;
            }
        };
        const fallback = {
            affects: readList('affects'),
            target_files: readList('target_files'),
            verification_commands: readList('verification_commands'),
            project_documents: readList('project_documents'),
            summary: readString('summary'),
        };
        return Object.values(fallback).some(value => value !== undefined) ? fallback : null;
    }
    async scanArchivedChangesWithHistory(rootDir, config) {
        const current = await this.scanArchivedChanges(rootDir, config);
        // When every archive was a cache hit AND the cache's post-merge entries
        // still match the on-disk index byte for byte, re-merging with that index
        // and its committed copy is a no-op, so skip the git spawn entirely. Any
        // divergence (damaged or externally updated index) falls through to the
        // full history merge, which repairs from the index and HEAD.
        if (this.runCache && this.runCache.misses === 0 && this.runCache.indexLoaded
            && JSON.stringify(current) === JSON.stringify(this.runCache.indexArchivedChanges || [])) {
            for (const entry of current)
                this.runCache.nextEntries[entry.archive] = entry;
            return current;
        }
        const historical = await this.readArchivedChangeHistory(rootDir, config);
        const historicalByArchive = new Map();
        for (const entry of historical) {
            const archive = String(entry?.archive || '').replace(/\\/g, '/');
            if (!archive)
                continue;
            const entries = historicalByArchive.get(archive) || [];
            entries.push(entry);
            historicalByArchive.set(archive, entries);
        }
        const merged = current.map(entry => {
            const history = historicalByArchive.get(entry.archive.replace(/\\/g, '/')) || [];
            return {
                ...entry,
                target_files: this.mergeHistoricalStringLists(history, entry.target_files, 'target_files'),
                verification_commands: this.mergeHistoricalStringLists(history, entry.verification_commands, 'verification_commands'),
                project_documents: this.mergeHistoricalStringLists(history, entry.project_documents, 'project_documents'),
                documents: this.mergeHistoricalOrderedLists(history, entry.documents, 'documents'),
            };
        });
        if (this.runCache) {
            for (const entry of merged)
                this.runCache.nextEntries[entry.archive] = entry;
        }
        return merged;
    }
    mergeHistoricalStringLists(historical, current, key) {
        return Array.from(new Set([
            ...historical.flatMap(entry => Array.isArray(entry?.[key]) ? entry[key] || [] : []),
            ...(current || []),
        ].map(value => String(value || '').trim()).filter(Boolean))).sort();
    }
    mergeHistoricalOrderedLists(historical, current, key) {
        return Array.from(new Set([
            ...historical.flatMap(entry => Array.isArray(entry?.[key]) ? entry[key] || [] : []),
            ...(current || []),
        ].map(value => String(value || '').trim()).filter(Boolean)));
    }
    async readArchivedChangeHistory(rootDir, config) {
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const candidates = [];
        if (await pathExists(indexPath)) {
            candidates.push(await fs_1.promises.readFile(indexPath, 'utf8'));
        }
        const relativeIndexPath = path_1.default.relative(rootDir, indexPath).replace(/\\/g, '/');
        try {
            candidates.push((0, child_process_1.execFileSync)('git', ['-C', rootDir, 'show', `HEAD:${relativeIndexPath}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
        }
        catch {
            // Non-git projects still retain history from their current generated index.
        }
        const entries = [];
        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate.replace(/^\uFEFF/, ''));
                if (Array.isArray(parsed?.archived_changes))
                    entries.push(...parsed.archived_changes);
            }
            catch {
                // A damaged historical index must not prevent a fresh index build.
            }
        }
        return entries;
    }
    async readArchivedChange(rootDir, archiveDir) {
        try {
            const state = await readJson(path_1.default.join(archiveDir, constants_1.FILE_NAMES.STATE));
            if (state?.status !== 'archived')
                return null;
            const proposalPath = path_1.default.join(archiveDir, constants_1.FILE_NAMES.PROPOSAL);
            let summary = '';
            let affects = [];
            if (await pathExists(proposalPath)) {
                const proposalSource = await fs_1.promises.readFile(proposalPath, 'utf8');
                let proposalContent = proposalSource;
                try {
                    const proposal = (0, helpers_1.parseFrontmatterDocument)(proposalSource);
                    affects = Array.isArray(proposal.data.affects) ? proposal.data.affects.map(String).filter(Boolean) : [];
                    proposalContent = proposal.content;
                }
                catch {
                    proposalContent = proposalSource.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
                }
                summary = proposalContent
                    .split(/\r?\n\r?\n/)
                    .map(block => block.trim())
                    .find(block => block && !block.startsWith('#') && !block.startsWith('- '))
                    ?.replace(/\r?\n/g, ' ')
                    .trim() || '';
            }
            const documents = [];
            for (const relativePath of ARCHIVED_DOCUMENTS) {
                if (await pathExists(path_1.default.join(archiveDir, ...relativePath.split('/'))))
                    documents.push(relativePath);
            }
            const projectDocuments = new Set();
            const targetFiles = new Set();
            const verificationCommands = new Set();
            const taskGraphPath = path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
            if (await pathExists(taskGraphPath)) {
                try {
                    const taskGraph = await readJson(taskGraphPath);
                    for (const task of Array.isArray(taskGraph?.tasks) ? taskGraph.tasks : []) {
                        for (const targetFile of Array.isArray(task?.target_files) ? task.target_files : []) {
                            const normalized = String(targetFile || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                            if (normalized)
                                targetFiles.add(normalized);
                        }
                        for (const command of Array.isArray(task?.verification_commands) ? task.verification_commands : []) {
                            const normalized = String(command || '').trim();
                            if (normalized)
                                verificationCommands.add(normalized);
                        }
                        for (const documentPath of Array.isArray(task?.documentation_updates) ? task.documentation_updates : []) {
                            const normalized = String(documentPath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                            if (normalized && await pathExists(path_1.default.join(rootDir, ...normalized.split('/')))) {
                                projectDocuments.add(normalized);
                            }
                        }
                    }
                }
                catch {
                    // A damaged task graph must not hide the rest of an archived change.
                }
            }
            const archive = path_1.default.relative(rootDir, archiveDir).replace(/\\/g, '/');
            const disposition = state.archive_disposition === 'forced' ? 'forced' : undefined;
            let forceArchiveRecord = null;
            if (disposition === 'forced') {
                const forceRecordPath = path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD);
                if (await pathExists(forceRecordPath)) {
                    try {
                        forceArchiveRecord = await readJson(forceRecordPath);
                    }
                    catch {
                        forceArchiveRecord = null;
                    }
                }
            }
            const expectedKnowledgeDocument = this.getKnowledgeDocumentRelativePath(archive);
            const knowledgeDocument = expectedKnowledgeDocument
                && await pathExists(path_1.default.join(rootDir, ...expectedKnowledgeDocument.split('/')))
                ? expectedKnowledgeDocument
                : undefined;
            // Baked-in fallback: the knowledge document carries the extracted fields
            // in its frontmatter, so evidence lost from the archive (for example
            // artifacts dropped by a gitignore rule during a merge) does not silently
            // degrade the index or regenerate the document as empty.
            if (knowledgeDocument
                && (targetFiles.size === 0 || verificationCommands.size === 0 || projectDocuments.size === 0 || !summary || affects.length === 0)) {
                try {
                    const fallback = this.readKnowledgeDocumentFallback(await fs_1.promises.readFile(path_1.default.join(rootDir, ...knowledgeDocument.split('/')), 'utf8'));
                    if (fallback) {
                        if (targetFiles.size === 0)
                            for (const value of fallback.target_files || [])
                                targetFiles.add(value);
                        if (verificationCommands.size === 0)
                            for (const value of fallback.verification_commands || [])
                                verificationCommands.add(value);
                        if (projectDocuments.size === 0)
                            for (const value of fallback.project_documents || [])
                                projectDocuments.add(value);
                        if (!summary && fallback.summary)
                            summary = fallback.summary;
                        if (affects.length === 0 && Array.isArray(fallback.affects))
                            affects = [...fallback.affects];
                    }
                }
                catch {
                    // A damaged knowledge document must not hide the archived change.
                }
            }
            return {
                feature: typeof state.feature === 'string' && state.feature.trim() ? state.feature.trim() : path_1.default.basename(archiveDir),
                summary,
                affects: affects.sort(),
                archive,
                completed_at: disposition === 'forced'
                    ? null
                    : typeof state.completed_at === 'string'
                        ? state.completed_at
                        : typeof state.last_updated === 'string'
                            ? state.last_updated
                            : null,
                documents,
                project_documents: [...projectDocuments].sort(),
                knowledge_document: knowledgeDocument,
                target_files: [...targetFiles].sort(),
                verification_commands: [...verificationCommands].sort(),
                workflow_profile: typeof state.workflow_profile_id === 'string' ? state.workflow_profile_id : undefined,
                ...(disposition === 'forced' ? {
                    disposition,
                    completion_status: 'incomplete',
                    accepted_risk: true,
                    force_archive_reason: typeof forceArchiveRecord?.reason === 'string'
                        ? forceArchiveRecord.reason
                        : '',
                    failing_checks: Array.from(new Set([
                        ...(Array.isArray(forceArchiveRecord?.failingChecks) ? forceArchiveRecord.failingChecks : [])
                            .map((check) => String(check?.name || '').trim()),
                        ...(Array.isArray(forceArchiveRecord?.progressIssues) ? forceArchiveRecord.progressIssues : [])
                            .map((issue) => `goal.progress: ${String(issue || '').trim()}`),
                    ].filter(Boolean))),
                    archived_at: typeof state.archived_at === 'string' ? state.archived_at : undefined,
                } : {}),
            };
        }
        catch {
            return null;
        }
    }
    async writeArchivedChangeKnowledgeDocuments(rootDir, config, archivedChanges) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/archived', config);
        const knowledgeRoot = path_1.default.join(docsProjectRoot, 'changes');
        const expectedPaths = new Set();
        const managedPaths = [];
        const copy = this.getArchivedKnowledgeCopy(config?.documentLanguage);
        for (const change of archivedChanges) {
            const archiveAbsolute = path_1.default.join(rootDir, ...change.archive.split('/'));
            const archiveRelative = path_1.default.relative(archivedRoot, archiveAbsolute);
            if (!archiveRelative || archiveRelative === '..' || archiveRelative.startsWith(`..${path_1.default.sep}`) || path_1.default.isAbsolute(archiveRelative)) {
                continue;
            }
            const targetPath = path_1.default.join(knowledgeRoot, `${archiveRelative}.md`);
            const resolvedTarget = path_1.default.resolve(targetPath);
            const relativeToKnowledge = path_1.default.relative(knowledgeRoot, resolvedTarget);
            if (!relativeToKnowledge || relativeToKnowledge === '..' || relativeToKnowledge.startsWith(`..${path_1.default.sep}`) || path_1.default.isAbsolute(relativeToKnowledge)) {
                continue;
            }
            expectedPaths.add(resolvedTarget.toLowerCase());
            const knowledgeDocument = path_1.default.relative(rootDir, resolvedTarget).replace(/\\/g, '/');
            managedPaths.push(knowledgeDocument);
            change.knowledge_document = knowledgeDocument;
            // A fingerprint-hit archive whose merged entry still equals the cached
            // entry regenerates byte-identical content, so skip the compose/compare
            // round-trip when the on-disk document still matches the stat fingerprint
            // recorded after the last verified write (metaOk guards language and
            // format changes; any drift falls through and rewrites the document).
            if (this.runCache && this.runCache.docMetaOk && this.runCache.hits.has(change.archive)) {
                const blessedDocFp = this.runCache.docFps[change.archive];
                let currentDocFp = null;
                try {
                    const stat = await fs_1.promises.stat(resolvedTarget);
                    currentDocFp = `${Math.round(stat.mtimeMs)}:${stat.size}`;
                }
                catch {
                    currentDocFp = null;
                }
                if (blessedDocFp && currentDocFp === blessedDocFp
                    && JSON.stringify(change) === JSON.stringify(this.runCache.cachedEntries.get(change.archive))) {
                    continue;
                }
            }
            await fs_1.promises.mkdir(path_1.default.dirname(resolvedTarget), { recursive: true });
            await this.assertGeneratedKnowledgeDocumentReplaceable(resolvedTarget, change.archive);
            const archiveLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), archiveAbsolute).replace(/\\/g, '/');
            const forced = change.disposition === 'forced';
            const lines = [
                '---',
                `name: ${JSON.stringify(`archived-change-${change.feature}`)}`,
                `title: ${JSON.stringify(change.feature)}`,
                forced
                    ? 'tags: [project, feature, archive, incomplete, accepted-risk, ai-index]'
                    : 'tags: [project, feature, completed, archive, ai-index]',
                `features: [${JSON.stringify(change.feature)}]`,
                `archive: ${JSON.stringify(change.archive)}`,
                `workflow_profile: ${JSON.stringify(change.workflow_profile || 'change')}`,
                `completed_at: ${JSON.stringify(change.completed_at || '')}`,
                `affects: ${JSON.stringify(change.affects || [])}`,
                `target_files: ${JSON.stringify(change.target_files || [])}`,
                `verification_commands: ${JSON.stringify(change.verification_commands || [])}`,
                `project_documents: ${JSON.stringify(change.project_documents || [])}`,
                `summary: ${JSON.stringify(change.summary || '')}`,
                ...(forced ? [
                    'disposition: forced',
                    'completion_status: incomplete',
                    'accepted_risk: true',
                    `force_archive_reason: ${JSON.stringify(change.force_archive_reason || '')}`,
                ] : []),
                'generated: true',
                'generator: ospec-archive-knowledge',
                '---',
                '',
                `# ${change.feature}`,
                '',
                forced ? `> **${copy.forceWarning}**` : `> ${copy.guidance}`,
                '',
                ...(forced ? [
                    `## ${copy.archiveDisposition}`,
                    '',
                    `- ${copy.disposition}: forced`,
                    `- ${copy.completionStatus}: incomplete`,
                    `- ${copy.acceptedRisk}: true`,
                    `- ${copy.forceReason}: ${change.force_archive_reason || copy.notRecorded}`,
                    `- ${copy.failingGates}: ${(change.failing_checks || []).length > 0 ? (change.failing_checks || []).join(', ') : copy.none.replace(/^- /, '')}`,
                    '',
                ] : []),
                `## ${copy.summary}`,
                '',
                change.summary || copy.notRecorded,
                '',
                `## ${copy.affects}`,
                '',
                ...this.renderKnowledgeList(change.affects, copy.none),
                '',
                `## ${copy.targetFiles}`,
                '',
                ...this.renderKnowledgeCodeList(change.target_files || [], copy.none),
                '',
                `## ${copy.verification}`,
                '',
                ...this.renderKnowledgeCodeList(change.verification_commands || [], copy.none),
                '',
                `## ${copy.projectDocuments}`,
                '',
            ];
            if ((change.project_documents || []).length === 0) {
                lines.push(copy.none, '');
            }
            else {
                for (const document of change.project_documents || []) {
                    const documentLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), path_1.default.join(rootDir, ...document.split('/'))).replace(/\\/g, '/');
                    lines.push(`- [${document}](${documentLink})`);
                }
                lines.push('');
            }
            lines.push(`## ${copy.archivedEvidence}`, '');
            lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
            for (const document of change.documents) {
                const documentLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), path_1.default.join(archiveAbsolute, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- [${document}](${documentLink})`);
            }
            lines.push('');
            const content = `${lines.join('\n').trimEnd()}\n`;
            const previous = await pathExists(resolvedTarget) ? await fs_1.promises.readFile(resolvedTarget, 'utf8') : null;
            if (previous !== content)
                await fs_1.promises.writeFile(resolvedTarget, content, 'utf8');
            if (this.runCache)
                this.runCache.verifiedDocs.set(change.archive, resolvedTarget);
        }
        const removedPaths = await this.removeStaleArchivedKnowledgeDocuments(rootDir, knowledgeRoot, expectedPaths);
        return {
            managedPaths: managedPaths.sort((left, right) => left.localeCompare(right)),
            removedPaths,
        };
    }
    getKnowledgeDocumentRelativePath(archive) {
        const normalized = archive.replace(/\\/g, '/').replace(/^\.\//, '');
        const marker = 'changes/archived/';
        const markerIndex = normalized.indexOf(marker);
        if (markerIndex < 0)
            return undefined;
        const prefix = normalized.slice(0, markerIndex);
        const suffix = normalized.slice(markerIndex + marker.length);
        if (!suffix)
            return undefined;
        return `${prefix}docs/project/changes/${suffix}.md`;
    }
    async assertGeneratedKnowledgeDocumentReplaceable(targetPath, archive) {
        if (!(await pathExists(targetPath)))
            return;
        try {
            const document = (0, helpers_1.parseFrontmatterDocument)(await fs_1.promises.readFile(targetPath, 'utf8'));
            const normalizedArchive = String(document.data?.archive || '').replace(/\\/g, '/');
            if (document.data?.generated === true
                && document.data?.generator === 'ospec-archive-knowledge'
                && normalizedArchive === archive.replace(/\\/g, '/')) {
                return;
            }
        }
        catch {
            // Unparseable content is human-owned unless it proves otherwise.
        }
        throw new Error(`Refusing to overwrite human-owned archive knowledge document: ${targetPath}`);
    }
    renderKnowledgeList(items, empty) {
        return items.length > 0 ? items.map(item => `- ${item}`) : [empty];
    }
    renderKnowledgeCodeList(items, empty) {
        return items.length > 0
            ? items.map(item => `- \`${item.replace(/`/g, '\\`')}\``)
            : [empty];
    }
    async removeStaleArchivedKnowledgeDocuments(rootDir, knowledgeRoot, expectedPaths) {
        if (!(await pathExists(knowledgeRoot)))
            return [];
        const removedPaths = [];
        const visit = async (currentDir) => {
            const entries = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    await visit(fullPath);
                    continue;
                }
                if (!entry.name.endsWith('.md') || expectedPaths.has(path_1.default.resolve(fullPath).toLowerCase()))
                    continue;
                try {
                    const document = (0, helpers_1.parseFrontmatterDocument)(await fs_1.promises.readFile(fullPath, 'utf8'));
                    if (document.data?.generated === true && document.data?.generator === 'ospec-archive-knowledge') {
                        await fs_1.promises.unlink(fullPath);
                        removedPaths.push(path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/'));
                    }
                }
                catch {
                    // Never remove an unparseable or human-owned document.
                }
            }
        };
        await visit(knowledgeRoot);
        return removedPaths.sort((left, right) => left.localeCompare(right));
    }
    getArchivedKnowledgeCopy(documentLanguage) {
        if (documentLanguage === 'zh-CN')
            return {
                guidance: '由 OSpec 在归档时生成，供人和 AI 快速了解这个 change 做了什么以及去哪里查看证据。',
                summary: '功能摘要',
                affects: '影响范围',
                targetFiles: '实现文件',
                verification: '验证命令',
                projectDocuments: '长期项目文档',
                archivedEvidence: '归档证据',
                archive: '完整归档',
                none: '- 无',
                notRecorded: '未记录摘要，请打开归档 proposal 查看。',
                forceWarning: '此 change 已在未完成状态下被强制归档，不能视为已验证完成。',
                archiveDisposition: '强制归档状态',
                disposition: '归档方式',
                completionStatus: '完成状态',
                acceptedRisk: '已接受风险',
                forceReason: '强制归档原因',
                failingGates: '未通过门禁',
            };
        if (documentLanguage === 'ja-JP')
            return {
                guidance: 'OSpec が archive 時に生成し、この change の内容と evidence の場所を人と AI がすばやく確認できるようにします。',
                summary: '機能概要',
                affects: '影響範囲',
                targetFiles: '実装ファイル',
                verification: '検証コマンド',
                projectDocuments: '永続プロジェクト文書',
                archivedEvidence: 'アーカイブ証跡',
                archive: '完全なアーカイブ',
                none: '- なし',
                notRecorded: '概要は記録されていません。archive の proposal を開いてください。',
                forceWarning: 'この change は未完了のまま強制 archive されており、検証済み完了として扱えません。',
                archiveDisposition: '強制 archive 状態',
                disposition: 'archive 方法',
                completionStatus: '完了状態',
                acceptedRisk: '受容済みリスク',
                forceReason: '強制 archive 理由',
                failingGates: '未通過 gate',
            };
        if (documentLanguage === 'ar')
            return {
                guidance: 'ينشئه OSpec عند الأرشفة كي يعرف الإنسان وAI بسرعة ما الذي أنجزه هذا change وأين توجد الأدلة.',
                summary: 'ملخص الميزة',
                affects: 'النطاق المتأثر',
                targetFiles: 'ملفات التنفيذ',
                verification: 'أوامر التحقق',
                projectDocuments: 'وثائق المشروع الدائمة',
                archivedEvidence: 'أدلة الأرشفة',
                archive: 'الأرشيف الكامل',
                none: '- لا يوجد',
                notRecorded: 'لم يسجل ملخص؛ افتح proposal المؤرشف.',
                forceWarning: 'تمت أرشفة هذا التغيير قسريا وهو غير مكتمل، ولم يتم التحقق من اكتماله.',
                archiveDisposition: 'حالة الأرشفة القسرية',
                disposition: 'طريقة الأرشفة',
                completionStatus: 'حالة الاكتمال',
                acceptedRisk: 'المخاطر المقبولة',
                forceReason: 'سبب الأرشفة القسرية',
                failingGates: 'البوابات غير المجتازة',
            };
        return {
            guidance: 'Generated by OSpec at archive time so humans and AI can quickly see what this change delivered and where its evidence lives.',
            summary: 'Feature Summary',
            affects: 'Affected Areas',
            targetFiles: 'Implementation Files',
            verification: 'Verification Commands',
            projectDocuments: 'Durable Project Documents',
            archivedEvidence: 'Archived Evidence',
            archive: 'Full archive',
            none: '- None',
            notRecorded: 'No summary was recorded; open the archived proposal.',
            forceWarning: 'This change was force-archived incomplete. It was not verified as complete.',
            archiveDisposition: 'Force Archive Status',
            disposition: 'Disposition',
            completionStatus: 'Completion status',
            acceptedRisk: 'Accepted risk',
            forceReason: 'Force archive reason',
            failingGates: 'Failing gates',
        };
    }
    async writeFeatureIndex(rootDir, config, archivedChanges) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        if (!(await pathExists(docsProjectRoot)) && archivedChanges.length === 0)
            return null;
        await fs_1.promises.mkdir(docsProjectRoot, { recursive: true });
        const targetPath = path_1.default.join(docsProjectRoot, 'feature-index.md');
        const copy = this.getFeatureIndexCopy(config?.documentLanguage);
        const lines = [
            '---',
            'name: project-feature-index',
            `title: ${copy.title}`,
            'tags: [project, features, archive, ai-index]',
            'generated: true',
            '---',
            '',
            `# ${copy.title}`,
            '',
            `> ${copy.guidance}`,
            '',
        ];
        if (archivedChanges.length === 0) {
            lines.push(copy.empty, '');
        }
        // Full detail is bounded to the most recent entries so this router document
        // stays token-cheap as archives accumulate; older entries keep one link line
        // and full data remains in the knowledge documents and `ospec index query`.
        const recentChanges = archivedChanges.slice(0, FEATURE_INDEX_RECENT_LIMIT);
        const olderChanges = archivedChanges.slice(FEATURE_INDEX_RECENT_LIMIT);
        for (const change of recentChanges) {
            lines.push(`## ${change.feature}`, '');
            if (change.disposition === 'forced') {
                lines.push(`- ${copy.archiveStatus}: FORCED / INCOMPLETE / ACCEPTED RISK`);
                lines.push(`- ${copy.forceReason}: ${change.force_archive_reason || copy.notRecorded}`);
                lines.push(`- ${copy.failingGates}: ${(change.failing_checks || []).length > 0 ? (change.failing_checks || []).join(', ') : copy.none}`);
            }
            if (change.summary)
                lines.push(`- ${copy.summary}: ${change.summary}`);
            if (change.affects.length > 0)
                lines.push(`- ${copy.affects}: ${change.affects.join(', ')}`);
            const archiveLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, change.archive)).replace(/\\/g, '/');
            lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
            if (change.knowledge_document) {
                const knowledgeLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, ...change.knowledge_document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${copy.knowledgeDocument}: [${change.knowledge_document}](${knowledgeLink})`);
            }
            for (const document of change.documents) {
                const documentLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, change.archive, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${document}: [${copy.open}](${documentLink})`);
            }
            for (const document of change.project_documents || []) {
                const documentLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${copy.projectDocument}: [${document}](${documentLink})`);
            }
            lines.push('');
        }
        if (olderChanges.length > 0) {
            lines.push(`## ${copy.olderHeading} (${olderChanges.length})`, '');
            lines.push(`> ${copy.olderGuidance}`, '');
            for (const change of olderChanges) {
                const label = change.disposition === 'forced'
                    ? `${change.feature} — FORCED/INCOMPLETE`
                    : change.feature;
                if (change.knowledge_document) {
                    const knowledgeLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, ...change.knowledge_document.split('/'))).replace(/\\/g, '/');
                    lines.push(`- [${label}](${knowledgeLink})`);
                }
                else {
                    lines.push(`- ${label}`);
                }
            }
            lines.push('');
        }
        const content = `${lines.join('\n').trimEnd()}\n`;
        const previous = await pathExists(targetPath) ? await fs_1.promises.readFile(targetPath, 'utf8') : null;
        if (previous !== content)
            await fs_1.promises.writeFile(targetPath, content, 'utf8');
        return path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/');
    }
    getFeatureIndexCopy(documentLanguage) {
        if (documentLanguage === 'zh-CN') {
            return {
                title: '项目功能索引',
                guidance: '由 OSpec 自动生成。使用本文件定位归档记录；强制归档的未完成项会明确标记，不能视为已完成功能。',
                empty: '暂无已归档 change。',
                summary: '摘要',
                affects: '影响范围',
                archive: '归档',
                open: '打开',
                projectDocument: '长期项目文档',
                knowledgeDocument: 'change 功能文档',
                archiveStatus: '归档状态',
                forceReason: '强制归档原因',
                failingGates: '未通过门禁',
                notRecorded: '未记录',
                none: '无',
                olderHeading: '更早的归档 change',
                olderGuidance: '以下条目仅列出名称与功能文档链接；详情用 `ospec index query <关键词>` 检索。',
            };
        }
        if (documentLanguage === 'ja-JP') {
            return {
                title: 'プロジェクト機能索引',
                guidance: 'OSpec により自動生成されます。archive 記録を特定し、強制 archive された未完了項目を完了済み機能として扱わないでください。',
                empty: 'archive 済みの change はまだありません。',
                summary: '概要',
                affects: '影響範囲',
                archive: 'アーカイブ',
                open: '開く',
                projectDocument: '長期プロジェクト文書',
                knowledgeDocument: 'change 機能文書',
                archiveStatus: 'archive 状態',
                forceReason: '強制 archive 理由',
                failingGates: '未通過 gate',
                notRecorded: '記録なし',
                none: 'なし',
                olderHeading: '過去の archive 済み change',
                olderGuidance: '以下は名称と機能文書リンクのみです。詳細は `ospec index query <キーワード>` で取得してください。',
            };
        }
        if (documentLanguage === 'ar') {
            return {
                title: 'فهرس ميزات المشروع',
                guidance: 'يُنشأ تلقائياً بواسطة OSpec لتحديد سجلات الأرشيف؛ العناصر غير المكتملة المؤرشفة قسرياً ليست ميزات مكتملة.',
                empty: 'لا توجد تغييرات مؤرشفة بعد.',
                summary: 'الملخص',
                affects: 'النطاق المتأثر',
                archive: 'الأرشيف',
                open: 'فتح',
                projectDocument: 'وثيقة المشروع الدائمة',
                knowledgeDocument: 'وثيقة change',
                archiveStatus: 'حالة الأرشفة',
                forceReason: 'سبب الأرشفة القسرية',
                failingGates: 'البوابات غير المجتازة',
                notRecorded: 'غير مسجل',
                none: 'لا يوجد',
                olderHeading: 'تغييرات مؤرشفة أقدم',
                olderGuidance: 'تسرد البنود أدناه الاسم ووثيقة المعرفة فقط؛ استرجع التفاصيل عبر `ospec index query <كلمة>`.',
            };
        }
        return {
            title: 'Project Feature Index',
            guidance: 'Generated by OSpec. Use this file to locate archived records; force-archived incomplete entries are marked and are not completed behavior.',
            empty: 'No archived changes yet.',
            summary: 'Summary',
            affects: 'Affects',
            archive: 'Archive',
            open: 'open',
            projectDocument: 'Durable project document',
            knowledgeDocument: 'Change knowledge document',
            archiveStatus: 'Archive status',
            forceReason: 'Force archive reason',
            failingGates: 'Failing gates',
            notRecorded: 'Not recorded',
            none: 'None',
            olderHeading: 'Older Archived Changes',
            olderGuidance: 'Entries below list the change name and knowledge document only; retrieve details with `ospec index query <keyword>`.',
        };
    }
}
exports.IndexBuilder = IndexBuilder;
const createIndexBuilder = (skillParser) => new IndexBuilder(skillParser);
exports.createIndexBuilder = createIndexBuilder;
