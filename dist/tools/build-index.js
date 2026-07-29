#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes', 'for-ai']);
const INDEX_FILE = 'SKILL.index.json';
const SKILL_FILE = 'SKILL.md';
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
async function main() {
    try {
        const action = process.argv[2] || 'build';
        const rootDir = process.cwd();
        switch (action) {
            case 'build':
                await writeIndex(rootDir, { silent: false });
                break;
            case 'hook-check':
                process.exitCode = await runHookCheck(rootDir, process.argv[3] || 'pre-commit');
                break;
            default:
                console.error(`[ospec] unknown action: ${action}`);
                process.exitCode = 1;
        }
    }
    catch (error) {
        console.error(`[ospec] ${error.message}`);
        process.exitCode = 1;
    }
}
async function runHookCheck(rootDir, event) {
    const config = await loadHookConfig(rootDir);
    if (event === 'pre-commit' && config.preCommit === false) {
        return 0;
    }
    if (event === 'post-merge' && config.postMerge === false) {
        return 0;
    }
    const activeChanges = await listActiveChanges(rootDir);
    if (activeChanges.length === 0) {
        console.log('[ospec] no active changes, hook check skipped');
        return 0;
    }
    const stagedFiles = event === 'pre-commit' ? getStagedFiles(rootDir) : [];
    if (event === 'pre-commit') {
        const relevantPaths = stagedFiles.filter(isHookRelevantPath);
        if (relevantPaths.length === 0) {
            console.log('[ospec] no staged OSpec files, hook check skipped');
            return 0;
        }
    }
    let shouldBlock = false;
    const shouldCheckIndex = config.indexCheck !== 'off' &&
        (event === 'post-merge' || stagedFiles.some(filePath => isIndexRelevantPath(filePath)));
    if (shouldCheckIndex) {
        const indexStatus = await computeIndexStatus(rootDir);
        if (indexStatus.stale) {
            console.log('[ospec] SKILL.index.json is stale');
            console.log('[ospec] run "ospec index build" or "node .ospec/tools/build-index-auto.cjs" to refresh it');
            if (event === 'pre-commit' && config.indexCheck === 'error') {
                shouldBlock = true;
            }
        }
        else {
            console.log('[ospec] SKILL.index.json is up to date');
        }
    }
    if (event === 'pre-commit' && config.changeCheck !== 'off') {
        const affectedChanges = collectAffectedChanges(stagedFiles, activeChanges);
        if (affectedChanges.length === 0) {
            console.log('[ospec] no active change files staged, change summary skipped');
        }
        else {
            console.log('[ospec] active change summary');
            for (const changeName of affectedChanges) {
                const summary = await buildChangeSummary(rootDir, changeName, config);
                if (!summary) {
                    continue;
                }
                console.log(`${summary.summaryStatus.toUpperCase()} ${summary.name} [${summary.status}] ${summary.progress}%`);
                const issues = summary.checks.filter(check => check.status !== 'pass');
                if (issues.length === 0) {
                    console.log('  protocol files and checklists are aligned');
                }
                else {
                    for (const issue of issues) {
                        console.log(`  ${issue.status.toUpperCase()} ${issue.name}: ${issue.message}`);
                    }
                }
                if (summary.summaryStatus !== 'pass' && config.changeCheck === 'error') {
                    shouldBlock = true;
                }
            }
        }
    }
    if (shouldBlock) {
        console.log('[ospec] hook blocked by current hook policy');
        return 1;
    }
    return 0;
}
async function writeIndex(rootDir, options) {
    const layout = await getProjectLayout(rootDir);
    await loadRunCache(rootDir, layout);
    const archivedChanges = await scanArchivedChangesWithHistory(rootDir, layout);
    await writeArchivedChangeKnowledgeDocuments(rootDir, layout, archivedChanges);
    await writeFeatureIndex(rootDir, layout, archivedChanges);
    const indexPath = resolveManagedPath(rootDir, INDEX_FILE, layout);
    const nextIndex = await buildIndex(rootDir, { layout, archivedChanges });
    await saveRunCache(rootDir, layout);
    const currentIndex = await readJsonIfExists(indexPath);
    if (currentIndex && isSameIndex(currentIndex, nextIndex)) {
        if (!options.silent) {
            console.log('[ospec] SKILL.index.json already up to date');
            printIndexStats(currentIndex);
        }
        return { changed: false, index: currentIndex };
    }
    const output = {
        ...nextIndex,
        generated: new Date().toISOString(),
    };
    await fsp.writeFile(indexPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    if (!options.silent) {
        console.log('[ospec] SKILL.index.json rebuilt');
        printIndexStats(output);
    }
    return { changed: true, index: output };
}
async function computeIndexStatus(rootDir) {
    const layout = await getProjectLayout(rootDir);
    await loadRunCache(rootDir, layout);
    const currentIndex = await readJsonIfExists(resolveManagedPath(rootDir, INDEX_FILE, layout));
    const nextIndex = await buildIndex(rootDir);
    await saveRunCache(rootDir, layout);
    return {
        stale: !currentIndex || !isSameIndex(currentIndex, nextIndex),
        currentIndex,
        nextIndex,
    };
}
async function buildIndex(rootDir, snapshot) {
    const layout = snapshot?.layout || await getProjectLayout(rootDir);
    const managedRoot = getManagedRoot(rootDir, layout);
    const modules = {};
    const tagIndex = {};
    const documents = {};
    let totalFiles = 0;
    let totalSections = 0;
    await walk(managedRoot, async fullPath => {
        totalFiles += 1;
        const relativePath = normalizeManagedRelativePath(rootDir, fullPath, layout);
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        const moduleName = parsed.frontmatter.name || relativePath;
        const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
        const tags = Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [];
        totalSections += Object.keys(parsed.sections).length;
        modules[moduleName] = {
            file: relativePath,
            title,
            tags,
            sections: parsed.sections,
        };
        for (const tag of tags) {
            if (!tagIndex[tag]) {
                tagIndex[tag] = [];
            }
            tagIndex[tag].push(moduleName);
        }
    });
    for (const tag of Object.keys(tagIndex).sort((left, right) => left.localeCompare(right))) {
        tagIndex[tag] = tagIndex[tag].sort((left, right) => left.localeCompare(right));
    }
    const docsRoot = resolveManagedPath(rootDir, 'docs', layout);
    if (await exists(docsRoot)) {
        await walkMarkdownDocuments(rootDir, docsRoot, documents);
    }
    const archivedChanges = snapshot?.archivedChanges || await scanArchivedChangesWithHistory(rootDir, layout);
    for (const change of archivedChanges) {
        for (const documentPath of change.project_documents || []) {
            const document = documents[documentPath];
            if (!document)
                continue;
            document.features = Array.from(new Set([...(document.features || []), change.feature])).sort();
        }
    }
    const activeChanges = await listActiveChanges(rootDir, layout);
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
async function walkMarkdownDocuments(rootDir, currentDir, documents) {
    const entries = (await fsp.readdir(currentDir, { withFileTypes: true }))
        .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            await walkMarkdownDocuments(rootDir, fullPath, documents);
            continue;
        }
        if (!entry.name.toLowerCase().endsWith('.md') || entry.name === SKILL_FILE)
            continue;
        const relativePath = normalizePath(path.relative(rootDir, fullPath));
        let fingerprint = null;
        try {
            const stat = await fsp.stat(fullPath);
            fingerprint = `${Math.round(stat.mtimeMs)}:${stat.size}`;
        }
        catch {
            fingerprint = null;
        }
        if (fingerprint && runCache) {
            const cached = runCache.documents[relativePath];
            if (cached && cached.fp === fingerprint && cached.doc) {
                const doc = JSON.parse(JSON.stringify(cached.doc));
                documents[relativePath] = doc;
                runCache.nextDocuments[relativePath] = { fp: fingerprint, doc: cached.doc };
                continue;
            }
        }
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        let metadata = {};
        try {
            metadata = parseFrontmatter(content).data;
        }
        catch {
            metadata = {};
        }
        const kind = inferDocumentKind(relativePath);
        const tags = Array.from(new Set([...parsed.frontmatter.tags, 'documentation', kind])).sort();
        documents[relativePath] = {
            file: relativePath,
            title: parsed.frontmatter.title || parsed.frontmatter.name || Object.keys(parsed.sections)[0] || entry.name.replace(/\.md$/i, ''),
            tags,
            kind,
            sections: parsed.sections,
            features: optionalMetadataList(metadata.features),
            modules: optionalMetadataList(metadata.modules),
            aliases: optionalMetadataList(metadata.aliases),
        };
        if (fingerprint && runCache) {
            runCache.nextDocuments[relativePath] = {
                fp: fingerprint,
                doc: JSON.parse(JSON.stringify(documents[relativePath])),
            };
        }
    }
}
function optionalMetadataList(value) {
    const values = Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(',') : [];
    const normalized = Array.from(new Set(values.map(item => item.trim()).filter(Boolean))).sort();
    return normalized.length > 0 ? normalized : undefined;
}
function inferDocumentKind(relativePath) {
    const normalized = normalizePath(relativePath);
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
// The cache lives in a self-gitignored cache/ directory: its fingerprints are
// machine-local mtimes, so committing it would only produce repo churn.
const ARCHIVE_SCAN_CACHE_FILE = 'cache/SKILL.index.cache.json';
const FEATURE_INDEX_RECENT_LIMIT = 30;
const KNOWLEDGE_DOC_FORMAT = 2;
// One immutable-input cache per run: archived changes never mutate after they
// are written and markdown documents change rarely, so fingerprinting them
// turns every rebuild and hook check into O(changed inputs). Deleting the
// cache file forces a full rescan.
let runCache = null;
async function loadRunCache(rootDir, layout) {
    const config = await readJsonIfExists(path.join(rootDir, '.skillrc'));
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
        const cache = await readJsonIfExists(resolveManagedPath(rootDir, ARCHIVE_SCAN_CACHE_FILE, layout));
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
        const currentIndex = await readJsonIfExists(resolveManagedPath(rootDir, INDEX_FILE, layout));
        if (currentIndex) {
            state.indexLoaded = true;
            state.indexArchivedChanges = Array.isArray(currentIndex.archived_changes) ? currentIndex.archived_changes : [];
        }
    }
    catch {
        state.indexLoaded = false;
    }
    runCache = state;
}
async function saveRunCache(rootDir, layout) {
    if (!runCache)
        return;
    // Re-fingerprint freshly extracted archives after their knowledge documents
    // were written, so a new archive settles into cache hits on the very next run.
    for (const [archive, archiveDir] of runCache.missDirs) {
        try {
            runCache.nextFingerprints[archive] = await computeArchiveFingerprint(rootDir, archiveDir);
        }
        catch {
            delete runCache.nextFingerprints[archive];
        }
    }
    // A doc fingerprint blesses the writer skip only after this run's writer
    // composed and verified that document; hit archives carry theirs forward.
    for (const [archive, docPath] of runCache.verifiedDocs) {
        try {
            const stat = await fsp.stat(docPath);
            runCache.nextDocFps[archive] = `${Math.round(stat.mtimeMs)}:${stat.size}`;
        }
        catch {
            delete runCache.nextDocFps[archive];
        }
    }
    for (const archive of runCache.hits) {
        if (!(archive in runCache.nextDocFps) && runCache.docFps[archive]) {
            runCache.nextDocFps[archive] = runCache.docFps[archive];
        }
    }
    const cachePath = resolveManagedPath(rootDir, ARCHIVE_SCAN_CACHE_FILE, layout);
    const next = `${JSON.stringify({
        version: '1.0',
        documentLanguage: runCache.documentLanguage,
        knowledgeDocFormat: KNOWLEDGE_DOC_FORMAT,
        fingerprints: runCache.nextFingerprints,
        entries: runCache.nextEntries,
        docFps: runCache.nextDocFps,
        documents: runCache.nextDocuments,
    }, null, 2)}\n`;
    try {
        await fsp.mkdir(path.dirname(cachePath), { recursive: true });
        const ignorePath = path.join(path.dirname(cachePath), '.gitignore');
        if (!(await exists(ignorePath)))
            await fsp.writeFile(ignorePath, '*\n', 'utf8');
        const previous = await exists(cachePath) ? await fsp.readFile(cachePath, 'utf8') : null;
        if (previous !== next)
            await fsp.writeFile(cachePath, next, 'utf8');
    }
    catch {
        // The fingerprint cache is a best-effort accelerator; failing to write it
        // must never fail an index build.
    }
}
async function computeArchiveFingerprint(rootDir, archiveDir) {
    const statOf = async filePath => {
        try {
            const stat = await fsp.stat(filePath);
            return `${Math.round(stat.mtimeMs)}:${stat.size}`;
        }
        catch {
            return '-';
        }
    };
    const archive = normalizePath(path.relative(rootDir, archiveDir));
    const knowledgeDocument = getKnowledgeDocumentRelativePath(archive);
    return [
        await statOf(path.join(archiveDir, 'state.json')),
        await statOf(path.join(archiveDir, 'proposal.md')),
        await statOf(path.join(archiveDir, 'artifacts', 'agents', 'task-graph.json')),
        knowledgeDocument ? await statOf(path.join(rootDir, ...knowledgeDocument.split('/'))) : '-',
    ].join('|');
}
async function scanArchivedChanges(rootDir, layout) {
    const archivedRoot = resolveManagedPath(rootDir, 'changes/archived', layout);
    if (!(await exists(archivedRoot)))
        return [];
    if (!runCache)
        await loadRunCache(rootDir, layout);
    const cacheState = runCache;
    const changes = [];
    const visit = async currentDir => {
        const entries = (await fsp.readdir(currentDir, { withFileTypes: true }))
            .sort((left, right) => left.name.localeCompare(right.name));
        if (entries.some((entry) => entry.isFile() && entry.name === 'state.json')) {
            const archive = normalizePath(path.relative(rootDir, currentDir));
            const fingerprint = await computeArchiveFingerprint(rootDir, currentDir);
            const cachedEntry = cacheState.fingerprints[archive] === fingerprint
                ? cacheState.cachedEntries.get(archive)
                : undefined;
            if (cachedEntry) {
                cacheState.nextFingerprints[archive] = fingerprint;
                cacheState.hits.add(archive);
                changes.push(JSON.parse(JSON.stringify(cachedEntry)));
                return;
            }
            cacheState.misses += 1;
            const change = await readArchivedChange(rootDir, currentDir);
            if (change) {
                cacheState.nextFingerprints[archive] = fingerprint;
                cacheState.missDirs.set(archive, currentDir);
                changes.push(change);
            }
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory())
                await visit(path.join(currentDir, entry.name));
        }
    };
    await visit(archivedRoot);
    return changes.sort((left, right) => right.archive.localeCompare(left.archive));
}
async function scanArchivedChangesWithHistory(rootDir, layout) {
    const current = await scanArchivedChanges(rootDir, layout);
    // When every archive was a cache hit AND the cache's post-merge entries
    // still match the on-disk index byte for byte, re-merging with that index
    // and its committed copy is a no-op, so skip the git spawn entirely. Any
    // divergence (damaged or externally updated index) falls through to the
    // full history merge, which repairs from the index and HEAD.
    if (runCache && runCache.misses === 0 && runCache.indexLoaded
        && JSON.stringify(current) === JSON.stringify(runCache.indexArchivedChanges || [])) {
        for (const entry of current)
            runCache.nextEntries[entry.archive] = entry;
        return current;
    }
    const historical = await readArchivedChangeHistory(rootDir, layout);
    const historicalByArchive = new Map();
    for (const entry of historical) {
        const archive = normalizePath(String(entry?.archive || ''));
        if (!archive)
            continue;
        const entries = historicalByArchive.get(archive) || [];
        entries.push(entry);
        historicalByArchive.set(archive, entries);
    }
    const merged = current.map(entry => {
        const history = historicalByArchive.get(normalizePath(entry.archive)) || [];
        return {
            ...entry,
            target_files: mergeHistoricalStringLists(history, entry.target_files),
            verification_commands: mergeHistoricalStringLists(history, entry.verification_commands, 'verification_commands'),
            project_documents: mergeHistoricalStringLists(history, entry.project_documents, 'project_documents'),
            documents: mergeHistoricalOrderedLists(history, entry.documents),
        };
    });
    if (runCache) {
        for (const entry of merged)
            runCache.nextEntries[entry.archive] = entry;
    }
    return merged;
}
function mergeHistoricalStringLists(historical, current, key = 'target_files') {
    return Array.from(new Set([
        ...historical.flatMap(entry => Array.isArray(entry?.[key]) ? entry[key] || [] : []),
        ...(current || []),
    ].map(value => String(value || '').trim()).filter(Boolean))).sort();
}
function mergeHistoricalOrderedLists(historical, current) {
    return Array.from(new Set([
        ...historical.flatMap(entry => Array.isArray(entry?.documents) ? entry.documents || [] : []),
        ...(current || []),
    ].map(value => String(value || '').trim()).filter(Boolean)));
}
async function readArchivedChangeHistory(rootDir, layout) {
    const indexPath = resolveManagedPath(rootDir, INDEX_FILE, layout);
    const candidates = [];
    if (await exists(indexPath)) {
        candidates.push(await fsp.readFile(indexPath, 'utf8'));
    }
    const relativeIndexPath = normalizePath(path.relative(rootDir, indexPath));
    const gitShow = spawnSync('git', ['-C', rootDir, 'show', `HEAD:${relativeIndexPath}`], {
        encoding: 'utf8',
        windowsHide: true,
    });
    if (!gitShow.error && gitShow.status === 0 && gitShow.stdout) {
        candidates.push(gitShow.stdout);
    }
    const entries = [];
    for (const candidate of candidates) {
        try {
            const cleaned = candidate.charCodeAt(0) === 0xfeff ? candidate.slice(1) : candidate;
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed?.archived_changes))
                entries.push(...parsed.archived_changes);
        }
        catch {
            // A damaged historical index must not prevent a fresh index build.
        }
    }
    return entries;
}
function readKnowledgeDocumentFallback(content) {
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
async function readArchivedChange(rootDir, archiveDir) {
    try {
        const state = await readJsonIfExists(path.join(archiveDir, 'state.json'));
        if (state?.status !== 'archived')
            return null;
        const proposalPath = path.join(archiveDir, 'proposal.md');
        let summary = '';
        let affects = [];
        if (await exists(proposalPath)) {
            const proposal = parseFrontmatter(await fsp.readFile(proposalPath, 'utf8'));
            affects = ensureArray(proposal.data.affects).sort();
            summary = proposal.body
                .split(/\r?\n\r?\n/)
                .map(block => block.trim())
                .find(block => block && !block.startsWith('#') && !block.startsWith('- '))
                ?.replace(/\r?\n/g, ' ')
                .trim() || '';
        }
        const documents = [];
        for (const relativePath of ARCHIVED_DOCUMENTS) {
            if (await exists(path.join(archiveDir, ...relativePath.split('/'))))
                documents.push(relativePath);
        }
        const projectDocuments = new Set();
        const targetFiles = new Set();
        const verificationCommands = new Set();
        const taskGraph = await readJsonIfExists(path.join(archiveDir, 'artifacts', 'agents', 'task-graph.json'));
        for (const task of Array.isArray(taskGraph?.tasks) ? taskGraph.tasks : []) {
            for (const targetFile of Array.isArray(task?.target_files) ? task.target_files : []) {
                const normalized = normalizePath(String(targetFile || '').trim()).replace(/^\.\//, '');
                if (normalized)
                    targetFiles.add(normalized);
            }
            for (const command of Array.isArray(task?.verification_commands) ? task.verification_commands : []) {
                const normalized = String(command || '').trim();
                if (normalized)
                    verificationCommands.add(normalized);
            }
            for (const documentPath of Array.isArray(task?.documentation_updates) ? task.documentation_updates : []) {
                const normalized = normalizePath(String(documentPath || '').trim()).replace(/^\.\//, '');
                if (normalized && await exists(path.join(rootDir, ...normalized.split('/'))))
                    projectDocuments.add(normalized);
            }
        }
        const archive = normalizePath(path.relative(rootDir, archiveDir));
        const expectedKnowledgeDocument = getKnowledgeDocumentRelativePath(archive);
        const knowledgeDocument = expectedKnowledgeDocument
            && await exists(path.join(rootDir, ...expectedKnowledgeDocument.split('/')))
            ? expectedKnowledgeDocument
            : undefined;
        // Baked-in fallback: the knowledge document carries the extracted fields in
        // its frontmatter, so evidence lost from the archive (for example artifacts
        // dropped by a gitignore rule during a merge) does not silently degrade the
        // index or regenerate the document as empty.
        if (knowledgeDocument
            && (targetFiles.size === 0 || verificationCommands.size === 0 || projectDocuments.size === 0 || !summary || affects.length === 0)) {
            try {
                const fallback = readKnowledgeDocumentFallback(await fsp.readFile(path.join(rootDir, ...knowledgeDocument.split('/')), 'utf8'));
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
                        affects = [...fallback.affects].sort();
                }
            }
            catch {
                // A damaged knowledge document must not hide the archived change.
            }
        }
        const disposition = state.archive_disposition === 'forced' ? 'forced' : undefined;
        let forceArchiveRecord = null;
        if (disposition === 'forced') {
            forceArchiveRecord = await readJsonIfExists(path.join(archiveDir, 'artifacts', 'agents', 'force-archive.json'));
        }
        return {
            feature: typeof state.feature === 'string' && state.feature.trim() ? state.feature.trim() : path.basename(archiveDir),
            summary,
            affects,
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
function getKnowledgeDocumentRelativePath(archive) {
    const normalized = normalizePath(archive).replace(/^\.\//, '');
    const marker = 'changes/archived/';
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex < 0)
        return undefined;
    const prefix = normalized.slice(0, markerIndex);
    const suffix = normalized.slice(markerIndex + marker.length);
    return suffix ? `${prefix}docs/project/changes/${suffix}.md` : undefined;
}
async function writeArchivedChangeKnowledgeDocuments(rootDir, layout, archivedChanges) {
    const docsProjectRoot = resolveManagedPath(rootDir, 'docs/project', layout);
    const archivedRoot = resolveManagedPath(rootDir, 'changes/archived', layout);
    const knowledgeRoot = path.join(docsProjectRoot, 'changes');
    const expectedPaths = new Set();
    const config = await readJsonIfExists(path.join(rootDir, '.skillrc'));
    const copy = getArchivedKnowledgeCopy(config?.documentLanguage);
    for (const change of archivedChanges) {
        const archiveAbsolute = path.join(rootDir, ...change.archive.split('/'));
        const archiveRelative = path.relative(archivedRoot, archiveAbsolute);
        if (!archiveRelative || archiveRelative === '..' || archiveRelative.startsWith(`..${path.sep}`) || path.isAbsolute(archiveRelative))
            continue;
        const targetPath = path.resolve(knowledgeRoot, `${archiveRelative}.md`);
        const relativeToKnowledge = path.relative(knowledgeRoot, targetPath);
        if (!relativeToKnowledge || relativeToKnowledge === '..' || relativeToKnowledge.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToKnowledge))
            continue;
        expectedPaths.add(targetPath.toLowerCase());
        change.knowledge_document = normalizePath(path.relative(rootDir, targetPath));
        // A fingerprint-hit archive whose merged entry still equals the cached
        // entry regenerates byte-identical content, so skip the compose/compare
        // round-trip when the on-disk document still matches the stat fingerprint
        // recorded after the last verified write (metaOk guards language and
        // format changes; any drift falls through and rewrites the document).
        if (runCache && runCache.docMetaOk && runCache.hits.has(change.archive)) {
            const blessedDocFp = runCache.docFps[change.archive];
            let currentDocFp = null;
            try {
                const stat = await fsp.stat(targetPath);
                currentDocFp = `${Math.round(stat.mtimeMs)}:${stat.size}`;
            }
            catch {
                currentDocFp = null;
            }
            if (blessedDocFp && currentDocFp === blessedDocFp
                && JSON.stringify(change) === JSON.stringify(runCache.cachedEntries.get(change.archive))) {
                continue;
            }
        }
        await fsp.mkdir(path.dirname(targetPath), { recursive: true });
        await assertGeneratedKnowledgeDocumentReplaceable(targetPath, change.archive);
        const archiveLink = normalizePath(path.relative(path.dirname(targetPath), archiveAbsolute));
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
            ...renderKnowledgeList(change.affects, copy.none),
            '',
            `## ${copy.targetFiles}`,
            '',
            ...renderKnowledgeCodeList(change.target_files || [], copy.none),
            '',
            `## ${copy.verification}`,
            '',
            ...renderKnowledgeCodeList(change.verification_commands || [], copy.none),
            '',
            `## ${copy.projectDocuments}`,
            '',
        ];
        if ((change.project_documents || []).length === 0) {
            lines.push(copy.none, '');
        }
        else {
            for (const document of change.project_documents || []) {
                const documentLink = normalizePath(path.relative(path.dirname(targetPath), path.join(rootDir, ...document.split('/'))));
                lines.push(`- [${document}](${documentLink})`);
            }
            lines.push('');
        }
        lines.push(`## ${copy.archivedEvidence}`, '');
        lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
        for (const document of change.documents) {
            const documentLink = normalizePath(path.relative(path.dirname(targetPath), path.join(archiveAbsolute, ...document.split('/'))));
            lines.push(`- [${document}](${documentLink})`);
        }
        lines.push('');
        const content = `${lines.join('\n').trimEnd()}\n`;
        const previous = await exists(targetPath) ? await fsp.readFile(targetPath, 'utf8') : null;
        if (previous !== content)
            await fsp.writeFile(targetPath, content, 'utf8');
        if (runCache)
            runCache.verifiedDocs.set(change.archive, targetPath);
    }
    await removeStaleArchivedKnowledgeDocuments(knowledgeRoot, expectedPaths);
}
function renderKnowledgeList(items, empty) {
    return items.length > 0 ? items.map(item => `- ${item}`) : [empty];
}
function renderKnowledgeCodeList(items, empty) {
    return items.length > 0 ? items.map(item => `- \`${item.replace(/`/g, '\\`')}\``) : [empty];
}
async function assertGeneratedKnowledgeDocumentReplaceable(targetPath, archive) {
    if (!(await exists(targetPath)))
        return;
    try {
        const document = parseFrontmatter(await fsp.readFile(targetPath, 'utf8'));
        const normalizedArchive = normalizePath(String(document.data?.archive || ''));
        if (document.data?.generated === true
            && document.data?.generator === 'ospec-archive-knowledge'
            && normalizedArchive === normalizePath(archive)) {
            return;
        }
    }
    catch {
        // Unparseable content is human-owned unless it proves otherwise.
    }
    throw new Error(`Refusing to overwrite human-owned archive knowledge document: ${targetPath}`);
}
async function removeStaleArchivedKnowledgeDocuments(knowledgeRoot, expectedPaths) {
    if (!(await exists(knowledgeRoot)))
        return;
    const visit = async currentDir => {
        const entries = await fsp.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await visit(fullPath);
                continue;
            }
            if (!entry.name.endsWith('.md') || expectedPaths.has(path.resolve(fullPath).toLowerCase()))
                continue;
            try {
                const document = parseFrontmatter(await fsp.readFile(fullPath, 'utf8'));
                if (document.data.generated === true && document.data.generator === 'ospec-archive-knowledge') {
                    await fsp.unlink(fullPath);
                }
            }
            catch {
                // Never remove an unparseable or human-owned document.
            }
        }
    };
    await visit(knowledgeRoot);
}
function getArchivedKnowledgeCopy(documentLanguage) {
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
async function writeFeatureIndex(rootDir, layout, archivedChanges) {
    const docsProjectRoot = resolveManagedPath(rootDir, 'docs/project', layout);
    if (!(await exists(docsProjectRoot)) && archivedChanges.length === 0)
        return;
    await fsp.mkdir(docsProjectRoot, { recursive: true });
    const targetPath = path.join(docsProjectRoot, 'feature-index.md');
    const config = await readJsonIfExists(path.join(rootDir, '.skillrc'));
    const copy = getFeatureIndexCopy(config?.documentLanguage);
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
    if (archivedChanges.length === 0)
        lines.push(copy.empty, '');
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
        const archiveLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, change.archive)));
        lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
        if (change.knowledge_document) {
            const knowledgeLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, ...change.knowledge_document.split('/'))));
            lines.push(`- ${copy.knowledgeDocument}: [${change.knowledge_document}](${knowledgeLink})`);
        }
        for (const document of change.documents) {
            const documentLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, change.archive, ...document.split('/'))));
            lines.push(`- ${document}: [${copy.open}](${documentLink})`);
        }
        for (const document of change.project_documents || []) {
            const documentLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, ...document.split('/'))));
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
                const knowledgeLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, ...change.knowledge_document.split('/'))));
                lines.push(`- [${label}](${knowledgeLink})`);
            }
            else {
                lines.push(`- ${label}`);
            }
        }
        lines.push('');
    }
    const content = `${lines.join('\n').trimEnd()}\n`;
    const previous = await exists(targetPath) ? await fsp.readFile(targetPath, 'utf8') : null;
    if (previous !== content)
        await fsp.writeFile(targetPath, content, 'utf8');
}
function getFeatureIndexCopy(documentLanguage) {
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
async function walk(currentDir, onSkillFile) {
    const entries = (await fsp.readdir(currentDir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                await walk(fullPath, onSkillFile);
            }
            continue;
        }
        if (entry.name === SKILL_FILE) {
            await onSkillFile(fullPath);
        }
    }
}
async function buildChangeSummary(rootDir, changeName, config) {
    const layout = await getProjectLayout(rootDir);
    const featureDir = resolveManagedPath(rootDir, `changes/active/${changeName}`, layout);
    const state = await readJsonIfExists(path.join(featureDir, 'state.json'));
    if (!state) {
        return null;
    }
    const proposalPath = path.join(featureDir, 'proposal.md');
    const designPath = path.join(featureDir, 'design.md');
    const implementationPlanPath = path.join(featureDir, 'implementation-plan.md');
    const taskGraphPath = path.join(featureDir, 'artifacts', 'agents', 'task-graph.json');
    const finalReviewPath = path.join(featureDir, 'artifacts', 'reviews', 'final-review.md');
    const specComplianceReviewPath = path.join(featureDir, 'artifacts', 'reviews', 'spec-compliance.md');
    const codeQualityReviewPath = path.join(featureDir, 'artifacts', 'reviews', 'code-quality.md');
    const agentWorkerStatusPath = path.join(featureDir, 'artifacts', 'agents', 'worker-status.md');
    const tasksPath = path.join(featureDir, 'tasks.md');
    const verificationPath = path.join(featureDir, 'verification.md');
    const proposalExists = await exists(proposalPath);
    const designExists = await exists(designPath);
    const implementationPlanExists = await exists(implementationPlanPath);
    const taskGraphExists = await exists(taskGraphPath);
    const finalReviewExists = await exists(finalReviewPath);
    const specComplianceReviewExists = await exists(specComplianceReviewPath);
    const codeQualityReviewExists = await exists(codeQualityReviewPath);
    const agentWorkerStatusExists = await exists(agentWorkerStatusPath);
    const tasksExists = await exists(tasksPath);
    const verificationExists = await exists(verificationPath);
    const checks = [
        {
            name: 'proposal.md',
            status: proposalExists ? 'pass' : 'fail',
            message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing',
        },
        {
            name: 'design.md',
            status: designExists ? 'pass' : 'fail',
            message: designExists ? 'Design file exists' : 'design.md is missing',
        },
        {
            name: 'implementation-plan.md',
            status: implementationPlanExists ? 'pass' : 'fail',
            message: implementationPlanExists ? 'Implementation plan file exists' : 'implementation-plan.md is missing',
        },
        {
            name: 'artifacts/agents/task-graph.json',
            status: taskGraphExists ? 'pass' : 'fail',
            message: taskGraphExists ? 'Task graph artifact exists' : 'artifacts/agents/task-graph.json is missing',
        },
        {
            name: 'artifacts/reviews/final-review.md',
            status: finalReviewExists || (specComplianceReviewExists && codeQualityReviewExists) ? 'pass' : 'fail',
            message: finalReviewExists
                ? 'Combined final review artifact exists'
                : specComplianceReviewExists && codeQualityReviewExists
                    ? 'Legacy spec and quality review artifacts exist'
                    : 'artifacts/reviews/final-review.md is missing (legacy dual-review artifacts are also accepted)',
        },
        {
            name: 'artifacts/agents/worker-status.md',
            status: agentWorkerStatusExists ? 'pass' : 'fail',
            message: agentWorkerStatusExists ? 'Agent worker status file exists' : 'artifacts/agents/worker-status.md is missing',
        },
        {
            name: 'tasks.md',
            status: tasksExists ? 'pass' : 'fail',
            message: tasksExists ? 'Tasks file exists' : 'tasks.md is missing',
        },
        {
            name: 'verification.md',
            status: verificationExists ? 'pass' : 'fail',
            message: verificationExists ? 'Verification file exists' : 'verification.md is missing',
        },
    ];
    let flags = [];
    let activatedSteps = [];
    if (proposalExists) {
        const proposal = parseFrontmatter(await fsp.readFile(proposalPath, 'utf8'));
        flags = ensureArray(proposal.data.flags);
        activatedSteps = getActivatedSteps(config.workflow, flags);
        const unsupportedFlags = flags.filter(flag => !ensureArray(config.workflow?.feature_flags?.supported).includes(flag));
        checks.push({
            name: 'proposal.flags',
            status: 'pass',
            message: activatedSteps.length > 0
                ? `Activated optional steps: ${activatedSteps.join(', ')}`
                : 'No optional steps activated',
        });
        if (unsupportedFlags.length > 0) {
            checks.push({
                name: 'proposal.unsupported_flags',
                status: 'warn',
                message: `Unsupported flags: ${unsupportedFlags.join(', ')}`,
            });
        }
    }
    if (designExists) {
        const design = analyzeWorkflowChecklistDocument(await fsp.readFile(designPath, 'utf8'), {
            name: 'design.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...design.checks);
    }
    if (implementationPlanExists) {
        const implementationPlan = analyzeWorkflowChecklistDocument(await fsp.readFile(implementationPlanPath, 'utf8'), {
            name: 'implementation-plan.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...implementationPlan.checks);
    }
    if (taskGraphExists) {
        const taskGraph = analyzeTaskGraphDocument(await fsp.readFile(taskGraphPath, 'utf8'), {
            activatedSteps,
        });
        checks.push(...taskGraph.checks);
    }
    if (finalReviewExists) {
        const finalReview = analyzeReviewArtifactDocument(await fsp.readFile(finalReviewPath, 'utf8'), {
            name: 'artifacts/reviews/final-review.md',
            expectedReviewerRole: 'code_reviewer',
            activatedSteps,
        });
        checks.push(...finalReview.checks);
    }
    else if (specComplianceReviewExists) {
        const specComplianceReview = analyzeReviewArtifactDocument(await fsp.readFile(specComplianceReviewPath, 'utf8'), {
            name: 'artifacts/reviews/spec-compliance.md',
            expectedReviewerRole: 'spec_compliance_reviewer',
            activatedSteps,
        });
        checks.push(...specComplianceReview.checks);
    }
    if (!finalReviewExists && codeQualityReviewExists) {
        const codeQualityReview = analyzeReviewArtifactDocument(await fsp.readFile(codeQualityReviewPath, 'utf8'), {
            name: 'artifacts/reviews/code-quality.md',
            expectedReviewerRole: 'code_quality_reviewer',
            activatedSteps,
        });
        checks.push(...codeQualityReview.checks);
    }
    if (agentWorkerStatusExists) {
        const agentWorkerStatus = analyzeAgentWorkerStatusDocument(await fsp.readFile(agentWorkerStatusPath, 'utf8'));
        checks.push(...agentWorkerStatus.checks);
    }
    if (tasksExists) {
        const tasks = analyzeWorkflowChecklistDocument(await fsp.readFile(tasksPath, 'utf8'), {
            name: 'tasks.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...tasks.checks);
    }
    if (verificationExists) {
        const verification = analyzeWorkflowChecklistDocument(await fsp.readFile(verificationPath, 'utf8'), {
            name: 'verification.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['status', 'string'],
                ['optional_steps', 'array'],
                ['passed_optional_steps', 'array'],
            ],
        });
        checks.push(...verification.checks);
    }
    const hasProtocolIssues = checks.some(check => check.status !== 'pass');
    if (state.status === 'archived') {
        checks.push({
            name: 'archive.location',
            status: 'fail',
            message: 'state.json.status is archived but the change is still under changes/active',
        });
    }
    else if (state.status === 'ready_to_archive' && !hasProtocolIssues) {
        checks.push({
            name: 'archive.pending',
            status: 'warn',
            message: `Change is ready to archive. Run "ospec archive changes/active/${changeName}" before commit.`,
        });
    }
    const failCount = checks.filter(check => check.status === 'fail').length;
    const warnCount = checks.filter(check => check.status === 'warn').length;
    return {
        name: state.feature || changeName,
        status: state.status || 'draft',
        progress: calculateProgress(state),
        summaryStatus: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
        checks,
    };
}
function calculateProgress(state) {
    const completed = Array.isArray(state.completed) ? state.completed.length : 0;
    const pending = Array.isArray(state.pending) ? state.pending.length : 0;
    const total = completed + pending;
    if (total === 0) {
        return 0;
    }
    return Math.round((completed / total) * 100);
}
function collectAffectedChanges(stagedFiles, activeChanges) {
    const affected = new Set();
    for (const filePath of stagedFiles) {
        const match = filePath.match(/^(?:\.ospec\/)?changes\/active\/([^/]+)\//);
        if (match) {
            affected.add(match[1]);
        }
    }
    if (affected.size === 0 && stagedFiles.includes('.skillrc')) {
        for (const changeName of activeChanges) {
            affected.add(changeName);
        }
    }
    return Array.from(affected).sort((left, right) => left.localeCompare(right));
}
function isHookRelevantPath(filePath) {
    return filePath === '.skillrc' || isIndexRelevantPath(filePath);
}
function isIndexRelevantPath(filePath) {
    return filePath === SKILL_FILE
        || /(^|\/)SKILL\.md$/.test(filePath)
        || filePath.startsWith('changes/active/')
        || filePath.startsWith('.ospec/changes/active/')
        || filePath.startsWith('changes/archived/')
        || filePath.startsWith('.ospec/changes/archived/')
        || filePath.startsWith('docs/')
        || filePath.startsWith('.ospec/docs/');
}
async function listActiveChanges(rootDir, layout) {
    const resolvedLayout = layout || (await getProjectLayout(rootDir));
    const activeDir = resolveManagedPath(rootDir, 'changes/active', resolvedLayout);
    if (!(await exists(activeDir))) {
        return [];
    }
    return (await fsp.readdir(activeDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((left, right) => left.localeCompare(right));
}
async function loadHookConfig(rootDir) {
    const config = (await readJsonIfExists(path.join(rootDir, '.skillrc'))) || {};
    const hooks = config.hooks || {};
    const fallback = hooks['spec-check'] || 'error';
    const normalized = {
        preCommit: hooks['pre-commit'] !== false,
        postMerge: hooks['post-merge'] !== false,
        changeCheck: hooks['change-check'] || fallback,
        indexCheck: hooks['index-check'] || fallback,
    };
    const legacyWarnDefaults = config.version === '3.0' &&
        config.mode !== 'lite' &&
        normalized.preCommit &&
        normalized.postMerge &&
        fallback === 'warn' &&
        normalized.changeCheck === 'warn' &&
        normalized.indexCheck === 'warn';
    return {
        preCommit: normalized.preCommit,
        postMerge: normalized.postMerge,
        changeCheck: legacyWarnDefaults ? 'error' : normalized.changeCheck,
        indexCheck: legacyWarnDefaults ? 'error' : normalized.indexCheck,
        workflow: config.workflow || {},
    };
}
function getActivatedSteps(workflowConfig, flags) {
    const optionalSteps = workflowConfig && workflowConfig.optional_steps ? workflowConfig.optional_steps : {};
    const activated = [];
    for (const [stepName, stepConfig] of Object.entries(optionalSteps)) {
        if (!stepConfig || stepConfig.enabled === false) {
            continue;
        }
        const when = ensureArray(stepConfig.when);
        if (when.some(flag => flags.includes(flag))) {
            activated.push(stepName);
        }
    }
    return activated.sort((left, right) => left.localeCompare(right));
}
function getStagedFiles(rootDir) {
    // core.quotePath=false keeps non-ASCII (e.g. CJK) staged paths as raw UTF-8
    // instead of octal-escaped, double-quoted strings the parsing below can't read.
    const result = spawnSync('git', ['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
        cwd: rootDir,
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        return [];
    }
    return result.stdout
        .split(/\r?\n/)
        .map(item => normalizePath(item.trim()))
        .filter(Boolean);
}
function parseSkillFile(content) {
    const normalizedContent = normalizeLineEndings(content);
    const parsed = parseFrontmatter(normalizedContent);
    return {
        frontmatter: {
            name: typeof parsed.data.name === 'string' ? parsed.data.name : undefined,
            title: typeof parsed.data.title === 'string' ? parsed.data.title : undefined,
            tags: ensureArray(parsed.data.tags),
        },
        sections: extractSections(parsed.body),
    };
}
function analyzeWorkflowChecklistDocument(content, options) {
    const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
    let parsed = null;
    let parseError = null;
    if (hasFrontmatter) {
        try {
            parsed = parseFrontmatter(content, { strict: true });
        }
        catch (error) {
            parseError = error;
        }
    }
    const data = parsed?.data ?? {};
    const optionalStepsFieldValid = Array.isArray(data.optional_steps);
    const optionalSteps = optionalStepsFieldValid ? ensureArray(data.optional_steps) : [];
    const invalidRequiredFields = options.requiredFields
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const checklistItems = parsed?.body.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
    const uncheckedItems = parsed?.body.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
    const checklistStructureValid = checklistItems.length > 0;
    let frontmatterMessage = `${options.name} frontmatter parsed successfully`;
    if (!hasFrontmatter) {
        frontmatterMessage = `${options.name} is missing a valid frontmatter block`;
    }
    else if (parseError) {
        frontmatterMessage = `${options.name} frontmatter cannot be parsed: ${parseError.message}`;
    }
    let requiredFieldsMessage = `${options.name} has all required frontmatter fields`;
    if (!hasFrontmatter || parseError) {
        requiredFieldsMessage = `Cannot validate required fields in ${options.name} because frontmatter is invalid`;
    }
    else if (invalidRequiredFields.length > 0) {
        requiredFieldsMessage = `Missing or invalid required fields in ${options.name}: ${invalidRequiredFields.join(', ')}`;
    }
    let optionalStepsMessage = `All activated optional steps are present in ${options.name}`;
    if (!optionalStepsFieldValid) {
        optionalStepsMessage = `${options.name} frontmatter field optional_steps must be an array`;
    }
    else if (missingActivatedSteps.length > 0) {
        optionalStepsMessage = `Missing optional steps in ${options.name}: ${missingActivatedSteps.join(', ')}`;
    }
    let checklistStatus = 'pass';
    let checklistMessage = `${options.name} checklist is complete`;
    if (!hasFrontmatter || parseError) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} checklist cannot be validated because frontmatter is invalid`;
    }
    else if (!checklistStructureValid) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} must contain at least one Markdown checklist item`;
    }
    else if (uncheckedItems.length > 0) {
        checklistStatus = 'warn';
        checklistMessage = `${options.name} still has unchecked items`;
    }
    return {
        optionalSteps,
        checks: [
            {
                name: `${options.name}.frontmatter`,
                status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                message: frontmatterMessage,
            },
            {
                name: `${options.name}.required_fields`,
                status: hasFrontmatter && parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: requiredFieldsMessage,
            },
            {
                name: `${options.name}.optional_steps`,
                status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                message: optionalStepsMessage,
            },
            {
                name: `${options.name}.checklist`,
                status: checklistStatus,
                message: checklistMessage,
            },
        ],
    };
}
const TASK_GRAPH_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'IN_PROGRESS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const TASK_GRAPH_TERMINAL_STATUSES = ['DONE', 'DONE_WITH_CONCERNS'];
const TASK_REVIEW_TERMINAL_DECISIONS = ['APPROVED', 'APPROVED_WITH_CONCERNS'];
function analyzeTaskGraphDocument(content, options) {
    const name = 'artifacts/agents/task-graph.json';
    let data = {};
    let parseError = null;
    try {
        const parsed = JSON.parse(content);
        data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
    catch (error) {
        parseError = error;
    }
    const optionalStepsFieldValid = Array.isArray(data.optional_steps);
    const optionalSteps = optionalStepsFieldValid ? ensureArray(data.optional_steps) : [];
    const tasksFieldValid = Array.isArray(data.tasks);
    const tasks = tasksFieldValid ? data.tasks : [];
    const invalidRequiredFields = [
        ['version', 'string'],
        ['feature', 'string'],
        ['status', 'string'],
        ['optional_steps', 'array'],
        ['tasks', 'array'],
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const taskSchemaIssues = [];
    const dependencyIssues = [];
    const invalidStatuses = [];
    const unresolvedStatuses = [];
    const concernStatuses = [];
    const executionDetailIssues = [];
    const taskIds = new Set();
    const duplicateTaskIds = new Set();
    const graphContract = String(data.contract_version || '').trim();
    const [contractMajor, contractMinor, contractPatch] = graphContract.split('.').map(Number);
    const requiresSerialReason = Number.isFinite(contractMajor)
        && (contractMajor > 1 || (contractMajor === 1 && (contractMinor > 8 || (contractMinor === 8 && contractPatch >= 6))));
    const requiresScopeReason = Number.isFinite(contractMajor)
        && (contractMajor > 1 || (contractMajor === 1 && (contractMinor > 8 || (contractMinor === 8 && contractPatch >= 5))));
    if (tasksFieldValid && tasks.length === 0) {
        taskSchemaIssues.push('tasks must contain at least one task');
    }
    for (const [index, task] of tasks.entries()) {
        const taskLabel = `tasks[${index}]`;
        if (!task || typeof task !== 'object' || Array.isArray(task)) {
            taskSchemaIssues.push(`${taskLabel} must be an object`);
            continue;
        }
        const taskId = typeof task.id === 'string' ? task.id.trim() : '';
        if (!taskId) {
            taskSchemaIssues.push(`${taskLabel}.id must be a non-empty string`);
        }
        else if (taskIds.has(taskId)) {
            duplicateTaskIds.add(taskId);
        }
        else {
            taskIds.add(taskId);
        }
        if (typeof task.title !== 'string' || task.title.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.title must be a non-empty string`);
        }
        if (typeof task.status !== 'string' || task.status.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.status must be a non-empty string`);
        }
        if (!Array.isArray(task.depends_on)) {
            taskSchemaIssues.push(`${taskLabel}.depends_on must be an array`);
        }
        if (typeof task.parallelizable !== 'boolean') {
            taskSchemaIssues.push(`${taskLabel}.parallelizable must be a boolean`);
        }
        if (requiresSerialReason && task.serial_reason !== undefined && (typeof task.serial_reason !== 'string' || task.serial_reason.trim().length === 0)) {
            taskSchemaIssues.push(`${taskLabel}.serial_reason must be a non-empty string when present`);
        }
        if (task.scope_reason !== undefined && task.scope_reason !== null
            && (typeof task.scope_reason !== 'string' || task.scope_reason.trim().length === 0)) {
            taskSchemaIssues.push(`${taskLabel}.scope_reason must be a non-empty string or null when present`);
        }
        if (requiresSerialReason && task.parallelizable === false && (typeof task.serial_reason !== 'string' || task.serial_reason.trim().length === 0)) {
            executionDetailIssues.push(`${taskLabel}.serial_reason is required for 1.8.6 serial tasks`);
        }
        if (!Array.isArray(task.conflicts_with)) {
            taskSchemaIssues.push(`${taskLabel}.conflicts_with must be an array`);
        }
        if (!Array.isArray(task.target_files)) {
            taskSchemaIssues.push(`${taskLabel}.target_files must be an array`);
        }
        else if (requiresScopeReason && task.target_files.length > 6
            && (typeof task.scope_reason !== 'string' || task.scope_reason.trim().length === 0)) {
            executionDetailIssues.push(`${taskLabel}.scope_reason is required for 1.8.5 tasks with more than 6 target_files`);
        }
        if (!Array.isArray(task.verification_commands)) {
            taskSchemaIssues.push(`${taskLabel}.verification_commands must be an array`);
        }
        if (typeof task.expected_result !== 'string' || task.expected_result.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.expected_result must be a non-empty string`);
        }
        if (typeof task.worker_role !== 'string' || task.worker_role.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.worker_role must be a non-empty string`);
        }
        if (taskId) {
            const status = typeof task.status === 'string' ? task.status.trim().toUpperCase() : '';
            if (!TASK_GRAPH_ALLOWED_STATUSES.includes(status)) {
                invalidStatuses.push(`${taskId}=${status || '(missing)'}`);
            }
            else if (!TASK_GRAPH_TERMINAL_STATUSES.includes(status)) {
                unresolvedStatuses.push(`${taskId}=${status}`);
            }
            else if (status === 'DONE_WITH_CONCERNS') {
                concernStatuses.push(taskId);
            }
            if (TASK_GRAPH_TERMINAL_STATUSES.includes(status) && task.review && typeof task.review === 'object' && !Array.isArray(task.review)) {
                const combinedReview = typeof task.review.decision === 'string'
                    ? task.review.decision.trim().toUpperCase()
                    : '';
                if (combinedReview) {
                    if (!TASK_REVIEW_TERMINAL_DECISIONS.includes(combinedReview)) {
                        unresolvedStatuses.push(`${taskId}.review.decision=${combinedReview}`);
                    }
                }
                else {
                    const specReview = typeof task.review.spec === 'string' ? task.review.spec.trim().toUpperCase() : 'PENDING';
                    const qualityReview = typeof task.review.quality === 'string' ? task.review.quality.trim().toUpperCase() : 'PENDING';
                    if (!TASK_REVIEW_TERMINAL_DECISIONS.includes(specReview)) {
                        unresolvedStatuses.push(`${taskId}.review.spec=${specReview}`);
                    }
                    if (!TASK_REVIEW_TERMINAL_DECISIONS.includes(qualityReview)) {
                        unresolvedStatuses.push(`${taskId}.review.quality=${qualityReview}`);
                    }
                }
            }
            if (!Array.isArray(task.target_files) || task.target_files.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                executionDetailIssues.push(`${taskId}.target_files`);
            }
            if (!Array.isArray(task.verification_commands) || task.verification_commands.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                executionDetailIssues.push(`${taskId}.verification_commands`);
            }
            const expectedResult = typeof task.expected_result === 'string' ? task.expected_result.trim() : '';
            if (!expectedResult || expectedResult.toUpperCase() === 'TBD') {
                executionDetailIssues.push(`${taskId}.expected_result`);
            }
        }
    }
    for (const duplicateId of duplicateTaskIds) {
        taskSchemaIssues.push(`duplicate task id: ${duplicateId}`);
    }
    if (tasksFieldValid && taskSchemaIssues.length === 0) {
        const dependenciesByTask = new Map();
        for (const task of tasks) {
            const taskId = task.id.trim();
            const dependencies = task.depends_on.filter((value) => typeof value === 'string' && value.trim().length > 0);
            dependenciesByTask.set(taskId, dependencies);
            for (const dependency of dependencies) {
                if (dependency === taskId) {
                    dependencyIssues.push(`${taskId} cannot depend on itself`);
                }
                else if (!taskIds.has(dependency)) {
                    dependencyIssues.push(`${taskId} depends on unknown task ${dependency}`);
                }
            }
        }
        const visiting = new Set();
        const visited = new Set();
        const visit = (taskId, chain) => {
            if (visited.has(taskId)) {
                return;
            }
            if (visiting.has(taskId)) {
                dependencyIssues.push(`dependency cycle detected: ${[...chain, taskId].join(' -> ')}`);
                return;
            }
            visiting.add(taskId);
            for (const dependency of dependenciesByTask.get(taskId) ?? []) {
                if (taskIds.has(dependency)) {
                    visit(dependency, [...chain, taskId]);
                }
            }
            visiting.delete(taskId);
            visited.add(taskId);
        };
        for (const taskId of taskIds) {
            visit(taskId, []);
        }
    }
    const graphCompleted = data.status === 'completed';
    let statusMessage = `${name} task statuses are archive-ready`;
    let statusCheckStatus = 'pass';
    if (invalidStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Invalid task statuses in ${name}: ${invalidStatuses.join(', ')}`;
    }
    else if (unresolvedStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Unresolved task statuses in ${name}: ${unresolvedStatuses.join(', ')}`;
    }
    else if (!graphCompleted) {
        statusCheckStatus = 'fail';
        statusMessage = `${name} status must be completed before archiving`;
    }
    else if (concernStatuses.length > 0) {
        statusCheckStatus = 'warn';
        statusMessage = `${name} tasks completed with concerns: ${concernStatuses.join(', ')}`;
    }
    return {
        checks: [
            {
                name: `${name}.json`,
                status: parseError === null ? 'pass' : 'fail',
                message: parseError ? `${name} JSON cannot be parsed: ${parseError.message}` : `${name} JSON parsed successfully`,
            },
            {
                name: `${name}.required_fields`,
                status: parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: parseError
                    ? `Cannot validate required fields in ${name} because JSON is invalid`
                    : invalidRequiredFields.length > 0
                        ? `Missing or invalid required fields in ${name}: ${invalidRequiredFields.join(', ')}`
                        : `${name} has all required fields`,
            },
            {
                name: `${name}.optional_steps`,
                status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                message: !optionalStepsFieldValid
                    ? `${name} field optional_steps must be an array`
                    : missingActivatedSteps.length > 0
                        ? `Missing optional steps in ${name}: ${missingActivatedSteps.join(', ')}`
                        : `All activated optional steps are present in ${name}`,
            },
            {
                name: `${name}.task_schema`,
                status: taskSchemaIssues.length === 0 ? 'pass' : 'fail',
                message: taskSchemaIssues.length > 0
                    ? `Invalid task graph schema in ${name}: ${taskSchemaIssues.join(', ')}`
                    : `${name} task schema is valid`,
            },
            {
                name: `${name}.dependencies`,
                status: dependencyIssues.length === 0 ? 'pass' : 'fail',
                message: dependencyIssues.length > 0
                    ? `Invalid task dependencies in ${name}: ${dependencyIssues.join(', ')}`
                    : `${name} dependencies are valid`,
            },
            {
                name: `${name}.task_statuses`,
                status: statusCheckStatus,
                message: statusMessage,
            },
            {
                name: `${name}.execution_details`,
                status: executionDetailIssues.length === 0 ? 'pass' : 'fail',
                message: executionDetailIssues.length > 0
                    ? `Incomplete task execution details in ${name}: ${executionDetailIssues.join(', ')}`
                    : `${name} task execution details are complete`,
            },
        ],
    };
}
const REVIEW_ARTIFACT_ALLOWED_DECISIONS = [
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
    'NEEDS_CHANGES',
    'BLOCKED',
    'PENDING',
];
const REVIEW_ARTIFACT_TERMINAL_DECISIONS = ['APPROVED', 'APPROVED_WITH_CONCERNS'];
function analyzeReviewArtifactDocument(content, options) {
    const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
    let parsed = null;
    let parseError = null;
    if (hasFrontmatter) {
        try {
            parsed = parseFrontmatter(content, { strict: true });
        }
        catch (error) {
            parseError = error;
        }
    }
    const data = parsed?.data ?? {};
    const optionalStepsFieldValid = Array.isArray(data.optional_steps);
    const optionalSteps = optionalStepsFieldValid ? ensureArray(data.optional_steps) : [];
    const invalidRequiredFields = [
        ['feature', 'string'],
        ['created', 'string_or_date'],
        ['status', 'string'],
        ['reviewer_role', 'string'],
        ['decision', 'string'],
        ['optional_steps', 'array'],
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    if (data.reviewer_role !== options.expectedReviewerRole && !invalidRequiredFields.includes('reviewer_role')) {
        invalidRequiredFields.push('reviewer_role');
    }
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const decision = typeof data.decision === 'string' ? data.decision.trim().toUpperCase() : '';
    const invalidDecision = decision.length > 0 && !REVIEW_ARTIFACT_ALLOWED_DECISIONS.includes(decision);
    const unresolvedDecision = !REVIEW_ARTIFACT_TERMINAL_DECISIONS.includes(decision);
    const concernDecision = decision === 'APPROVED_WITH_CONCERNS';
    const checklistItems = parsed?.body.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
    const uncheckedItems = parsed?.body.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
    const checklistStructureValid = checklistItems.length > 0;
    let frontmatterMessage = `${options.name} frontmatter parsed successfully`;
    if (!hasFrontmatter) {
        frontmatterMessage = `${options.name} is missing a valid frontmatter block`;
    }
    else if (parseError) {
        frontmatterMessage = `${options.name} frontmatter cannot be parsed: ${parseError.message}`;
    }
    let requiredFieldsMessage = `${options.name} has all required frontmatter fields`;
    if (!hasFrontmatter || parseError) {
        requiredFieldsMessage = `Cannot validate required fields in ${options.name} because frontmatter is invalid`;
    }
    else if (invalidRequiredFields.length > 0) {
        requiredFieldsMessage = `Missing or invalid required fields in ${options.name}: ${invalidRequiredFields.join(', ')}`;
    }
    let optionalStepsMessage = `All activated optional steps are present in ${options.name}`;
    if (!optionalStepsFieldValid) {
        optionalStepsMessage = `${options.name} frontmatter field optional_steps must be an array`;
    }
    else if (missingActivatedSteps.length > 0) {
        optionalStepsMessage = `Missing optional steps in ${options.name}: ${missingActivatedSteps.join(', ')}`;
    }
    let decisionMessage = `${options.name} decision is archive-ready`;
    let decisionStatus = 'pass';
    if (!hasFrontmatter || parseError) {
        decisionStatus = 'fail';
        decisionMessage = `Cannot validate decision in ${options.name} because frontmatter is invalid`;
    }
    else if (invalidDecision) {
        decisionStatus = 'fail';
        decisionMessage = `Invalid review decision in ${options.name}: ${decision}`;
    }
    else if (unresolvedDecision) {
        decisionStatus = 'fail';
        decisionMessage = `Unresolved review decision in ${options.name}: ${decision || '(missing)'}`;
    }
    else if (concernDecision) {
        decisionStatus = 'warn';
        decisionMessage = `${options.name} approved with concerns`;
    }
    let checklistStatus = 'pass';
    let checklistMessage = `${options.name} checklist is complete`;
    if (!hasFrontmatter || parseError) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} checklist cannot be validated because frontmatter is invalid`;
    }
    else if (!checklistStructureValid) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} must contain at least one Markdown checklist item`;
    }
    else if (uncheckedItems.length > 0) {
        checklistStatus = 'warn';
        checklistMessage = `${options.name} still has unchecked items`;
    }
    return {
        checks: [
            {
                name: `${options.name}.frontmatter`,
                status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                message: frontmatterMessage,
            },
            {
                name: `${options.name}.required_fields`,
                status: hasFrontmatter && parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: requiredFieldsMessage,
            },
            {
                name: `${options.name}.optional_steps`,
                status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                message: optionalStepsMessage,
            },
            {
                name: `${options.name}.decision`,
                status: decisionStatus,
                message: decisionMessage,
            },
            {
                name: `${options.name}.checklist`,
                status: checklistStatus,
                message: checklistMessage,
            },
        ],
    };
}
const AGENT_WORKER_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const AGENT_WORKER_TERMINAL_STATUSES = ['DONE', 'DONE_WITH_CONCERNS'];
function analyzeAgentWorkerStatusDocument(content) {
    const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
    let parsed = null;
    let parseError = null;
    if (hasFrontmatter) {
        try {
            parsed = parseFrontmatter(content, { strict: true });
        }
        catch (error) {
            parseError = error;
        }
    }
    const data = parsed?.data ?? {};
    const statusFields = [
        'implementer_status',
        'spec_reviewer_status',
        'quality_reviewer_status',
        'controller_status',
    ];
    const invalidRequiredFields = [
        ['feature', 'string'],
        ['created', 'string_or_date'],
        ['status', 'string'],
        ...statusFields.map(field => [field, 'string']),
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const statuses = Object.fromEntries(statusFields.map(field => [field, typeof data[field] === 'string' ? data[field].trim().toUpperCase() : '']));
    const invalidStatuses = Object.entries(statuses)
        .filter(([, status]) => !AGENT_WORKER_ALLOWED_STATUSES.includes(status))
        .map(([field, status]) => `${field}=${status || '(missing)'}`);
    const unresolvedStatuses = [
        ...['implementer_status', 'spec_reviewer_status', 'quality_reviewer_status']
            .filter(field => !AGENT_WORKER_TERMINAL_STATUSES.includes(statuses[field]))
            .map(field => `${field}=${statuses[field] || '(missing)'}`),
        ...(statuses.controller_status === 'DONE' ? [] : [`controller_status=${statuses.controller_status || '(missing)'}`]),
    ];
    const concernStatuses = Object.entries(statuses)
        .filter(([, status]) => status === 'DONE_WITH_CONCERNS')
        .map(([field]) => field);
    const checklistItems = parsed?.body.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
    const uncheckedItems = parsed?.body.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
    const checklistStructureValid = checklistItems.length > 0;
    let frontmatterMessage = 'artifacts/agents/worker-status.md frontmatter parsed successfully';
    if (!hasFrontmatter) {
        frontmatterMessage = 'artifacts/agents/worker-status.md is missing a valid frontmatter block';
    }
    else if (parseError) {
        frontmatterMessage = `artifacts/agents/worker-status.md frontmatter cannot be parsed: ${parseError.message}`;
    }
    let requiredFieldsMessage = 'artifacts/agents/worker-status.md has all required frontmatter fields';
    if (!hasFrontmatter || parseError) {
        requiredFieldsMessage = 'Cannot validate required fields in artifacts/agents/worker-status.md because frontmatter is invalid';
    }
    else if (invalidRequiredFields.length > 0) {
        requiredFieldsMessage = `Missing or invalid required fields in artifacts/agents/worker-status.md: ${invalidRequiredFields.join(', ')}`;
    }
    let statusMessage = 'Agent worker statuses are archive-ready';
    let statusCheckStatus = 'pass';
    if (!hasFrontmatter || parseError) {
        statusCheckStatus = 'fail';
        statusMessage = 'Cannot validate agent worker statuses because frontmatter is invalid';
    }
    else if (invalidStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Invalid agent worker statuses: ${invalidStatuses.join(', ')}`;
    }
    else if (unresolvedStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Unresolved agent worker statuses: ${unresolvedStatuses.join(', ')}`;
    }
    else if (concernStatuses.length > 0) {
        statusCheckStatus = 'warn';
        statusMessage = `Agent workers completed with concerns: ${concernStatuses.join(', ')}`;
    }
    let checklistStatus = 'pass';
    let checklistMessage = 'artifacts/agents/worker-status.md checklist is complete';
    if (!hasFrontmatter || parseError) {
        checklistStatus = 'fail';
        checklistMessage = 'artifacts/agents/worker-status.md checklist cannot be validated because frontmatter is invalid';
    }
    else if (!checklistStructureValid) {
        checklistStatus = 'fail';
        checklistMessage = 'artifacts/agents/worker-status.md must contain at least one Markdown checklist item';
    }
    else if (uncheckedItems.length > 0) {
        checklistStatus = 'warn';
        checklistMessage = 'artifacts/agents/worker-status.md still has unchecked items';
    }
    return {
        checks: [
            {
                name: 'artifacts/agents/worker-status.md.frontmatter',
                status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                message: frontmatterMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.required_fields',
                status: hasFrontmatter && parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: requiredFieldsMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.worker_statuses',
                status: statusCheckStatus,
                message: statusMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.checklist',
                status: checklistStatus,
                message: checklistMessage,
            },
        ],
    };
}
function normalizeLineEndings(content) {
    return String(content || '').replace(/\r\n?/g, '\n');
}
function parseFrontmatter(content, options = {}) {
    const normalizedContent = normalizeLineEndings(content);
    const match = normalizedContent.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
        return { data: {}, body: normalizedContent };
    }
    const data = {};
    const lines = match[1].split('\n');
    let currentKey = null;
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineNumber = index + 1;
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        if (/^\s*-\s+/.test(line) && currentKey) {
            if (!Array.isArray(data[currentKey])) {
                data[currentKey] = [];
            }
            data[currentKey].push(parseValue(line.replace(/^\s*-\s+/, '').trim(), options, {
                key: currentKey,
                lineNumber,
            }));
            continue;
        }
        if (/^\s*-\s+/.test(line) && options.strict) {
            throw createFrontmatterParseError('Unexpected list item outside an array field', lineNumber);
        }
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) {
            if (options.strict) {
                throw createFrontmatterParseError(`Invalid frontmatter line: ${trimmed}`, lineNumber);
            }
            currentKey = null;
            continue;
        }
        const key = keyMatch[1];
        const rawValue = keyMatch[2].trim();
        data[key] = parseValue(rawValue, options, { key, lineNumber });
        currentKey = Array.isArray(data[key]) && rawValue === '' ? key : null;
    }
    return {
        data,
        body: normalizedContent.slice(match[0].length),
    };
}
function isValidFrontmatterField(value, type) {
    if (type === 'string') {
        return typeof value === 'string' && value.trim().length > 0;
    }
    if (type === 'string_or_date') {
        return ((typeof value === 'string' && value.trim().length > 0) ||
            (value instanceof Date && !Number.isNaN(value.getTime())));
    }
    if (type === 'array') {
        return Array.isArray(value);
    }
    return false;
}
function parseValue(rawValue, options = {}, context = {}) {
    if (rawValue === '') {
        return [];
    }
    if (rawValue === '[]') {
        return [];
    }
    if (rawValue === 'true') {
        return true;
    }
    if (rawValue === 'false') {
        return false;
    }
    if (options.strict) {
        validateFrontmatterValue(rawValue, context);
    }
    if (/^\[(.*)\]$/.test(rawValue)) {
        const inner = rawValue.slice(1, -1).trim();
        if (!inner) {
            return [];
        }
        return splitInlineArray(inner, options, context);
    }
    return stripQuotes(rawValue);
}
function validateFrontmatterValue(rawValue, context) {
    const startsArray = rawValue.startsWith('[');
    const endsArray = rawValue.endsWith(']');
    if (startsArray !== endsArray) {
        throw createFrontmatterParseError(`Unterminated inline array for ${context.key || 'field'}`, context.lineNumber);
    }
    if (!rawValue) {
        return;
    }
    const quote = rawValue[0];
    if ((quote === '"' || quote === "'") && rawValue[rawValue.length - 1] !== quote) {
        throw createFrontmatterParseError(`Unterminated quoted string for ${context.key || 'field'}`, context.lineNumber);
    }
}
function splitInlineArray(inner, options = {}, context = {}) {
    const values = [];
    let current = '';
    let activeQuote = null;
    for (let index = 0; index < inner.length; index += 1) {
        const char = inner[index];
        if (activeQuote) {
            current += char;
            if (char === activeQuote && inner[index - 1] !== '\\') {
                activeQuote = null;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            activeQuote = char;
            current += char;
            continue;
        }
        if (char === ',') {
            const parsed = parseValue(current.trim(), {}, context);
            if (parsed !== '') {
                values.push(parsed);
            }
            current = '';
            continue;
        }
        current += char;
    }
    if (activeQuote && options.strict) {
        throw createFrontmatterParseError(`Unterminated quoted string in inline array for ${context.key || 'field'}`, context.lineNumber);
    }
    const parsed = parseValue(current.trim(), {}, context);
    if (parsed !== '') {
        values.push(parsed);
    }
    return values.filter(value => value !== '');
}
function stripQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '');
}
function createFrontmatterParseError(message, lineNumber) {
    const error = new Error(lineNumber ? `line ${lineNumber}: ${message}` : message);
    error.name = 'FrontmatterParseError';
    return error;
}
function extractSections(content) {
    const sections = {};
    const matches = [];
    const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        matches.push({
            level: match[1].length,
            title: match[2].trim(),
            start: match.index,
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
function ensureArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }
    return [];
}
function isSameIndex(left, right) {
    return JSON.stringify(stripVolatileFields(left)) === JSON.stringify(stripVolatileFields(right));
}
function stripVolatileFields(index) {
    const clone = JSON.parse(JSON.stringify(index));
    delete clone.generated;
    return clone;
}
function printIndexStats(index) {
    console.log(`[ospec] files ${index.stats.totalFiles}, modules ${index.stats.totalModules}, sections ${index.stats.totalSections}`);
    console.log(`[ospec] active changes: ${index.active_changes.join(', ') || 'none'}`);
    console.log(`[ospec] knowledge docs: ${Object.keys(index.documents || {}).length}, archived changes: ${(index.archived_changes || []).length}`);
}
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}
function getManagedRoot(rootDir, layout) {
    return layout === 'nested' ? path.join(rootDir, '.ospec') : rootDir;
}
function resolveManagedPath(rootDir, relativePath, layout) {
    const normalizedRelativePath = normalizePath(relativePath).replace(/^\.\/+/, '');
    if (layout !== 'nested' || normalizedRelativePath === '.skillrc' || normalizedRelativePath === 'README.md' || normalizedRelativePath === '.ospec' || normalizedRelativePath.startsWith('.ospec/')) {
        return path.join(rootDir, ...normalizedRelativePath.split('/'));
    }
    return path.join(rootDir, '.ospec', ...normalizedRelativePath.split('/'));
}
function hasClassicManagedMarkers(rootDir) {
    return [
        'changes',
        'for-ai',
        'docs/project',
        SKILL_FILE,
        INDEX_FILE,
    ].some(relativePath => fs.existsSync(path.join(rootDir, ...relativePath.split('/'))));
}
function normalizeManagedRelativePath(rootDir, fullPath, layout) {
    const relativePath = normalizePath(path.relative(rootDir, fullPath));
    if (layout !== 'nested') {
        return relativePath;
    }
    return relativePath.startsWith('.ospec/')
        ? relativePath.slice('.ospec/'.length)
        : relativePath;
}
async function getProjectLayout(rootDir) {
    const config = (await readJsonIfExists(path.join(rootDir, '.skillrc'))) || {};
    if (config?.projectLayout !== 'nested') {
        return 'classic';
    }
    if (fs.existsSync(path.join(rootDir, '.ospec'))) {
        return 'nested';
    }
    return hasClassicManagedMarkers(rootDir) ? 'classic' : 'nested';
}
async function exists(targetPath) {
    try {
        await fsp.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function readJsonIfExists(targetPath) {
    if (!(await exists(targetPath))) {
        return null;
    }
    return JSON.parse(await fsp.readFile(targetPath, 'utf8'));
}
main();
