"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexBuilder = exports.IndexBuilder = exports.isDamagedConfigError = exports.findNestedManagedMarker = exports.describeNonObjectConfig = exports.describeAbsentProjectLayout = exports.createContradictoryLayoutError = exports.createDamagedConfigError = void 0;
exports.renderDocsMapContent = renderDocsMapContent;
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const SkillParser_1 = require("./SkillParser");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const helpers_1 = require("../utils/helpers");
const FileService_1 = require("./FileService");
const FeatureCatalog_1 = require("./FeatureCatalog");
// Kept identical to `NEVER_WALK_DIRS` in `src/tools/build-index.ts`.
//
// FIX-2 / D5: names in here are skipped unconditionally and a SKILL.md under
// them is never rescued, because they are not "generated trees a user might
// legitimately keep a skill in" -- `changes/` and `for-ai/` are OSpec's own
// managed trees with their own readers, and the VCS metadata directories are
// not part of the working tree at all. Everything else in `SKIP_DIRS` is a
// heuristic, and heuristics do not get to silently delete user content.
// Spelled as a local alias, not `FILE_NAMES.SKILL_MD`, so the walk helpers
// below stay byte-identical to their `src/tools/build-index.ts` twins.
const SKILL_FILE = constants_1.FILE_NAMES.SKILL_MD;
const NEVER_WALK_DIRS = new Set([
    // OSpec's own managed trees; scanned by their own readers, not by `walk`.
    'changes',
    'for-ai',
    // Version control metadata.
    '.git',
    '.hg',
    '.svn',
]);
// Kept identical to `SKIP_DIRS` in `src/tools/build-index.ts` -- see the
// comment there. Both implementations write SKILL.index.json, so a name in one
// list and not the other makes `ospec index build` and the pre-commit hook
// disagree about whether the index is stale.
const SKIP_DIRS = new Set([
    ...NEVER_WALK_DIRS,
    // Dependency trees.
    'node_modules',
    'bower_components',
    'vendor',
    'Pods',
    '.yarn',
    '.pnpm-store',
    // Python environments and caches.
    '.venv',
    'venv',
    '__pycache__',
    '.tox',
    '.mypy_cache',
    '.pytest_cache',
    '.ruff_cache',
    // Build output.
    'dist',
    'build',
    'out',
    'target',
    '.next',
    '.nuxt',
    '.output',
    '.svelte-kit',
    '.turbo',
    '.parcel-cache',
    '.gradle',
    // Test and tool caches.
    'coverage',
    '.nyc_output',
    '.cache',
    '.terraform',
    // Editor metadata.
    '.idea',
    '.vscode',
]);
/*
 * FIX-2 / D5. Kept identical to `resolveIndexSkipDirs` in
 * `src/tools/build-index.ts`.
 *
 * `SKIP_DIRS` grew from 5 names to 35 to stop the walk descending into
 * virtualenvs, vendored trees and framework caches on a classic project whose
 * managed root IS the repository root. That was a real cost, but the list it
 * grew into contains ordinary project directory names -- `build`, `out`,
 * `target`, `vendor`, `coverage`, `.cache` -- so a project keeping a real
 * SKILL.md under any of them lost it from `SKILL.index.json` with no warning.
 * The escape hatch is `.skillrc`:
 *
 *   "index": {
 *     "skip_dirs":    ["node_modules", "vendor"],   // replaces the default list
 *     "include_dirs": ["build", "target"]           // never skipped
 *   }
 *
 * `include_dirs` wins over `skip_dirs`; neither can re-enable walking a
 * `NEVER_WALK_DIRS` name.
 */
function resolveIndexSkipDirs(config) {
    const readNames = (value) => Array.isArray(value)
        ? value
            .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
            .map(entry => entry.trim())
        : [];
    const indexConfig = config && typeof config === 'object' && !Array.isArray(config)
        ? config.index
        : null;
    const scoped = indexConfig && typeof indexConfig === 'object' && !Array.isArray(indexConfig)
        ? indexConfig
        : {};
    const overrides = readNames(scoped.skip_dirs);
    const effective = new Set(overrides.length > 0 ? overrides : SKIP_DIRS);
    for (const name of readNames(scoped.include_dirs))
        effective.delete(name);
    for (const name of NEVER_WALK_DIRS)
        effective.add(name);
    return effective;
}
function listTrackedSkillFiles(managedRoot) {
    const run = (args) => (0, child_process_1.spawnSync)('git', args, { cwd: managedRoot, encoding: 'utf8', windowsHide: true });
    const listed = (result) => !result.error && result.status === 0 && typeof result.stdout === 'string';
    const pathspec = ['ls-files', '-z', '--cached'];
    const suffix = ['--', `*${SKILL_FILE}`];
    const split = (stdout) => stdout.split('\0').filter(entry => entry.length > 0);
    const recursive = run([...pathspec, '--recurse-submodules', ...suffix]);
    if (listed(recursive)) {
        return { status: 'ok', files: split(recursive.stdout), submodulesIncluded: true };
    }
    const flat = run([...pathspec, ...suffix]);
    if (listed(flat)) {
        return { status: 'ok', files: split(flat.stdout), submodulesIncluded: false };
    }
    const spawnError = (recursive.error || flat.error);
    if (spawnError) {
        return {
            status: 'unavailable',
            reason: spawnError.code === 'ENOENT'
                ? 'git is not on PATH'
                : `git could not be run (${spawnError.code || spawnError.message})`,
        };
    }
    const stderr = String(flat.stderr || '').trim().split(/\r?\n/)[0] || '';
    if (/not a git repository|not a working tree/i.test(stderr))
        return { status: 'no-repository' };
    return { status: 'unavailable', reason: stderr || `git ls-files exited with ${flat.status}` };
}
/**
 * The tracked SKILL.md files the walk skipped, with the skip directory that hid
 * each one, sorted so both implementations emit them in the same order -- plus
 * the one warning that is about the listing itself rather than about a file.
 * Kept identical to `findSkippedTrackedSkillFiles` in
 * `src/tools/build-index.ts`.
 */
function findSkippedTrackedSkillFiles(managedRoot, skipDirs) {
    const tracked = listTrackedSkillFiles(managedRoot);
    if (tracked.status === 'no-repository')
        return { rescued: [], warning: null };
    if (tracked.status === 'unavailable') {
        return {
            rescued: [],
            warning: 'git could not list tracked files here, so a SKILL.md that is tracked but sits under a '
                + `skipped directory is NOT in this index (${tracked.reason}); `
                + 'install git, or name the directory in .skillrc "index".include_dirs',
        };
    }
    const rescued = [];
    for (const relativePath of tracked.files) {
        const segments = relativePath.split('/');
        if (segments[segments.length - 1] !== SKILL_FILE)
            continue;
        const directories = segments.slice(0, -1);
        if (directories.some(name => NEVER_WALK_DIRS.has(name)))
            continue;
        const skippedBy = directories.find(name => skipDirs.has(name));
        if (skippedBy === undefined)
            continue;
        rescued.push({ relativePath, skippedBy });
    }
    return {
        rescued: rescued.sort((left, right) => compareCodepoints(left.relativePath, right.relativePath)),
        warning: tracked.submodulesIncluded
            ? null
            : 'this git does not support "ls-files --recurse-submodules", so a SKILL.md tracked inside a '
                + 'submodule under a skipped directory is NOT in this index; upgrade git to 2.11 or later, or '
                + 'name the directory in .skillrc "index".include_dirs',
    };
}
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
/**
 * Total order over strings by Unicode code point.
 *
 * Kept identical to `compareCodepoints` in `src/tools/build-index.ts` -- see the
 * comment there. `localeCompare` consulted the host ICU collation, so two
 * collaborators on the same commit produced byte-different indexes and the hook
 * reported "stale" on a freshly built index forever.
 */
function compareCodepoints(left, right) {
    if (left === right)
        return 0;
    const shared = Math.min(left.length, right.length);
    for (let index = 0; index < shared; index += 1) {
        const leftUnit = left.charCodeAt(index);
        const rightUnit = right.charCodeAt(index);
        if (leftUnit === rightUnit)
            continue;
        // UTF-16 code-unit order and code-point order agree except where a
        // surrogate (U+D800-U+DFFF) meets a BMP character above it, so resolve the
        // first differing position to a full code point before comparing.
        const leftPoint = left.codePointAt(index);
        const rightPoint = right.codePointAt(index);
        return leftPoint < rightPoint ? -1 : 1;
    }
    if (left.length === right.length)
        return 0;
    return left.length < right.length ? -1 : 1;
}
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath, fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function readJsonOutcome(filePath) {
    let raw;
    try {
        raw = await fs_1.promises.readFile(filePath, 'utf8');
    }
    catch (error) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
            return { status: 'absent' };
        }
        // F21: a directory where a JSON file belongs is damage, not absence --
        // treating it as absent would resume the layout/language guessing P0-10
        // exists to stop -- but it is not "invalid JSON", and telling the user to
        // strip merge-conflict markers from a directory helps nobody.
        if (error?.code === 'EISDIR') {
            return { status: 'damaged', reason: 'is a directory, not a file' };
        }
        return { status: 'damaged', reason: `unreadable (${error?.code || error?.message || 'unknown error'})` };
    }
    try {
        return { status: 'ok', value: JSON.parse(raw.replace(/^\uFEFF/, '')) };
    }
    catch (error) {
        return { status: 'damaged', reason: `invalid JSON (${error?.message || 'parse failed'})` };
    }
}
/**
 * FIX-G1: the `.skillrc` damage policy moved to `src/utils/ProjectLayout.ts`.
 * It was defined here, which meant only the two index builders enforced it
 * while `ConfigManager.loadConfig` -- the read `ProjectService` and every
 * command goes through -- kept guessing; a util both can import is the only
 * place that closes the class instead of the instances. Re-exported so the
 * names this module has always published stay published.
 *
 * `src/tools/build-index.ts` still carries its own copy (it is the standalone
 * dependency-free pre-commit bundle); the copies are asserted byte-identical
 * by `tests/services/p0-10-11-index-builder-cli-path.test.mjs`.
 */
var ProjectLayout_2 = require("../utils/ProjectLayout");
Object.defineProperty(exports, "createDamagedConfigError", { enumerable: true, get: function () { return ProjectLayout_2.createDamagedConfigError; } });
Object.defineProperty(exports, "createContradictoryLayoutError", { enumerable: true, get: function () { return ProjectLayout_2.createContradictoryLayoutError; } });
Object.defineProperty(exports, "describeAbsentProjectLayout", { enumerable: true, get: function () { return ProjectLayout_2.describeAbsentProjectLayout; } });
Object.defineProperty(exports, "describeNonObjectConfig", { enumerable: true, get: function () { return ProjectLayout_2.describeNonObjectConfig; } });
Object.defineProperty(exports, "findNestedManagedMarker", { enumerable: true, get: function () { return ProjectLayout_2.findNestedManagedMarker; } });
Object.defineProperty(exports, "isDamagedConfigError", { enumerable: true, get: function () { return ProjectLayout_2.isDamagedConfigError; } });
function describeReadFailure(error) {
    return error?.code
        ? `${error.code}: ${error.message || 'read failed'}`
        : String(error?.message || error || 'read failed');
}
// The cache lives in a self-gitignored cache/ directory: its fingerprints are
// machine-local mtimes, so committing it would only produce repo churn.
const ARCHIVE_SCAN_CACHE_FILE = 'cache/SKILL.index.cache.json';
// 7.2: the cached `documents` shape changed twice in one phase -- it gained
// `features`, and generated documents stopped being cached at all. A cache
// written before either change would keep re-inserting a generated document
// forever, because the hit path never reads its frontmatter. Bump this and the
// whole document half of the cache is refused; fingerprints and archive entries
// are unaffected.
const DOCUMENT_CACHE_FORMAT = 3;
/**
 * The cache key for "has this file changed since we last parsed it".
 *
 * M-misc6: this expression was `${Math.round(stat.mtimeMs)}:${stat.size}`,
 * written out EIGHT times -- four here and four in the other index builder,
 * which writes the same machine-local cache file, so the two spellings are a
 * cross-file contract that nothing checked.
 *
 * Two things were wrong with it. `Math.round` threw away precision the
 * platform hands over for free (NTFS resolves to ~0.5 ms, ext4 to
 * nanoseconds) and bought nothing, so two writes inside one millisecond that
 * left the size unchanged collided and the second one's parse was skipped.
 * And (mtime, size) is exactly the tuple `ConfigManager`'s FIX-1/D2 comment
 * documents as unsound: `cp -p`, `rsync --times`, `tar -x` and "restore
 * previous version" all put the old mtime back. `ctimeMs` moves on any write
 * on POSIX and cannot be restored that way, and `ino` changes on the
 * delete-and-recreate that editors do on save.
 *
 * This is deliberately NOT the content hash `ConfigManager` switched to, and
 * the difference is the point: that cache remembers ONE ~3 KB file it must
 * read anyway, while this one exists precisely so a project's whole markdown
 * corpus is not read on every index build. The key is strictly more
 * discriminating than it was and is still a heuristic -- stated here rather
 * than left to be discovered.
 *
 * Changing the layout invalidates every existing cache row once. That is the
 * intended cost: the rows it invalidates are the ones that could be wrong.
 */
function statFingerprint(stat) {
    return `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}:${stat.ino}`;
}
class IndexBuilder {
    constructor(skillParser) {
        /**
         * One immutable-input cache per run: archived changes never mutate after
         * they are written and markdown documents change rarely, so fingerprinting
         * them turns every rebuild and status check into O(changed inputs).
         * Deleting SKILL.index.cache.json forces a full rescan.
         */
        this.runCache = null;
        /**
         * Damage reported by this run, deduplicated. A rebuild degrades around a
         * damaged input rather than failing, so the damage has to be said out loud
         * or it is indistinguishable from a clean build.
         */
        this.buildWarnings = [];
        /**
         * Archives whose on-disk evidence could not be read this run. They keep the
         * index entry they already had, and are deliberately left without a
         * fingerprint so the next run re-reads them.
         */
        this.preservedArchives = new Set();
        this.skillParser = skillParser;
    }
    resetBuildDiagnostics() {
        this.buildWarnings = [];
        this.preservedArchives = new Set();
    }
    recordBuildWarning(targetPath, reason) {
        const message = `${targetPath.replace(/\\/g, '/')}: ${reason}`;
        if (this.buildWarnings.includes(message))
            return;
        this.buildWarnings.push(message);
        console.warn(`[ospec] warning: ${message}`);
    }
    async build(rootDir) {
        this.resetBuildDiagnostics();
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
            indexLoaded: false,
            fingerprints: {},
            nextFingerprints: {},
            documents: {},
            nextDocuments: {},
            cachedEntries: new Map(),
            nextEntries: {},
            indexArchivedChanges: null,
            hits: new Set(),
            misses: 0,
            missDirs: new Map(),
            documentLanguage,
        };
        try {
            const cachePath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, ARCHIVE_SCAN_CACHE_FILE, config);
            // The fingerprint cache is machine-local and gitignored, so its damage is
            // a silent full rescan rather than something to report to the user.
            const cacheOutcome = await readJsonOutcome(cachePath);
            const cache = cacheOutcome.status === 'ok' ? cacheOutcome.value : null;
            if (cache?.version === '1.0') {
                if (cache.fingerprints && typeof cache.fingerprints === 'object')
                    state.fingerprints = cache.fingerprints;
                if (cache.documentCacheFormat === DOCUMENT_CACHE_FORMAT
                    && cache.documents && typeof cache.documents === 'object')
                    state.documents = cache.documents;
                // Reused entries come from the cache's own post-merge snapshots, never
                // from the on-disk index, so a damaged index cannot poison hits.
                if (cache.entries && typeof cache.entries === 'object') {
                    for (const [archive, entry] of Object.entries(cache.entries)) {
                        if (archive && entry && typeof entry === 'object')
                            state.cachedEntries.set(archive, entry);
                    }
                }
            }
        }
        catch {
            // A damaged cache degrades to a full rescan, never to a failed build.
        }
        try {
            const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
            const indexOutcome = await readJsonOutcome(indexPath);
            if (indexOutcome.status === 'damaged') {
                this.recordBuildWarning(indexPath, indexOutcome.reason);
            }
            const currentIndex = indexOutcome.status === 'ok' ? indexOutcome.value : null;
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
        // Re-fingerprint freshly extracted archives, so a new archive settles into
        // cache hits on the next run.
        for (const [archive, archiveDir] of state.missDirs) {
            try {
                state.nextFingerprints[archive] = await this.computeArchiveFingerprint(rootDir, archiveDir);
            }
            catch {
                delete state.nextFingerprints[archive];
            }
        }
        try {
            const cachePath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, ARCHIVE_SCAN_CACHE_FILE, config);
            const next = `${JSON.stringify({
                version: '1.0',
                documentLanguage: state.documentLanguage,
                documentCacheFormat: DOCUMENT_CACHE_FORMAT,
                fingerprints: state.nextFingerprints,
                entries: state.nextEntries,
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
        const featureDocs = {};
        let totalFiles = 0;
        let totalSections = 0;
        const skipDirs = resolveIndexSkipDirs(config);
        // FIX-2 / D14: `modules[name] = ...` was last-writer-wins over the walk, so
        // the traversal-order change could flip *which* file won when two SKILL.md
        // files declare the same `frontmatter.name` -- a content change, not just
        // an ordering one. Collect first, then resolve collisions by a rule that
        // does not depend on traversal order at all.
        const collected = [];
        const collectSkillFile = async (fullPath) => {
            totalFiles++;
            const relativePath = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
            const content = await fs_1.promises.readFile(fullPath, 'utf-8');
            const parsed = this.skillParser.parseSkillFile(content);
            const moduleName = parsed.frontmatter.name || relativePath;
            const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
            const tags = parsed.frontmatter.tags || [];
            const sections = parsed.sections;
            totalSections += Object.keys(sections).length;
            collected.push({
                relativePath,
                moduleName,
                module: { file: relativePath, title, tags, sections },
            });
        };
        const visit = async (currentDir) => {
            const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true })).sort((left, right) => compareCodepoints(left.name, right.name));
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!skipDirs.has(entry.name)) {
                        await visit(fullPath);
                    }
                    continue;
                }
                if (entry.name !== constants_1.FILE_NAMES.SKILL_MD) {
                    continue;
                }
                await collectSkillFile(fullPath);
            }
        };
        if (await pathExists(managedRoot)) {
            await visit(managedRoot);
            // FIX-2 / D5: a SKILL.md that is tracked by git is always indexed, even
            // when it lives under a skipped directory name. One `git ls-files` for
            // the whole build; the walk itself is untouched.
            const skippedTracked = findSkippedTrackedSkillFiles(managedRoot, skipDirs);
            // FIX-5 / MN-6: one warning about the listing itself, when git could not
            // answer "is this tracked" completely. Silently degrading made index
            // content depend on the environment.
            if (skippedTracked.warning)
                this.recordBuildWarning(managedRoot, skippedTracked.warning);
            for (const rescued of skippedTracked.rescued) {
                const fullPath = path_1.default.join(managedRoot, ...rescued.relativePath.split('/'));
                if (!(await pathExists(fullPath)))
                    continue;
                this.recordBuildWarning(fullPath, `indexed because it is tracked by git, even though "${rescued.skippedBy}/" is on the index skip list; `
                    + 'add it to .skillrc "index".include_dirs to walk it, or git-ignore it to skip it');
                await collectSkillFile(fullPath);
            }
        }
        // Walk order still decides where a module key lands, so the file the index
        // writes is byte-identical whenever no two SKILL.md files share a name;
        // only the *value* on a collision changes, and it changes to the entry
        // whose path sorts first, which no traversal order can perturb.
        for (const entry of collected) {
            const existing = modules[entry.moduleName];
            if (existing && compareCodepoints(existing.file, entry.relativePath) <= 0)
                continue;
            modules[entry.moduleName] = entry.module;
        }
        for (const entry of collected) {
            if (modules[entry.moduleName]?.file !== entry.relativePath)
                continue;
            for (const tag of entry.module.tags) {
                if (!tagIndex[tag]) {
                    tagIndex[tag] = [];
                }
                if (!tagIndex[tag].includes(entry.moduleName)) {
                    tagIndex[tag].push(entry.moduleName);
                }
            }
        }
        const docsRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs', projectLayout);
        if (await pathExists(docsRoot)) {
            await this.visitMarkdownDocuments(rootDir, docsRoot, documents, featureDocs);
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
            ? (await fs_1.promises.readdir(activeChangesDir)).sort((left, right) => compareCodepoints(left, right))
            : [];
        for (const tag of Object.keys(tagIndex)) {
            tagIndex[tag] = tagIndex[tag].sort((left, right) => compareCodepoints(left, right));
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
            // Keyed by slug, sorted, so the file stays a pure function of the tree.
            feature_docs: Object.fromEntries(Object.keys(featureDocs)
                .sort((left, right) => compareCodepoints(left, right))
                .map(slug => [slug, featureDocs[slug]])),
        };
    }
    async write(rootDir) {
        return (await this.writeWithSummary(rootDir)).index;
    }
    async writeWithSummary(rootDir) {
        this.resetBuildDiagnostics();
        const config = await this.readProjectConfig(rootDir);
        await this.loadRunCache(rootDir, config);
        const archivedChanges = await this.scanArchivedChangesWithHistory(rootDir, config);
        const frozen = await this.freezeLegacyFeatureIndex(rootDir, config, archivedChanges);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        // A damaged index reads as absent, which routes into the full rewrite
        // below. `ospec index build` is the command a user runs *because* the
        // index is damaged, so it has to succeed while the file is still damaged.
        const previousOutcome = await readJsonOutcome(indexPath);
        if (previousOutcome.status === 'damaged') {
            this.recordBuildWarning(indexPath, previousOutcome.reason);
        }
        const previous = previousOutcome.status === 'ok' ? previousOutcome.value : null;
        const index = await this.buildSnapshot(rootDir, config, archivedChanges);
        const previousComparable = previous ? this.stripVolatileFields(previous) : null;
        const nextComparable = this.stripVolatileFields(index);
        let writtenIndex = index;
        const unchanged = previous !== null
            && JSON.stringify(previousComparable) === JSON.stringify(nextComparable);
        // 7.4: the catalogue is rendered from the snapshot's `feature_docs` -- the
        // in-memory index, not the written file -- so it can be written FIRST.
        // The order is load-bearing: the catalogue is itself an indexed source, so
        // writing it after the index file left its mtime a few ms newer than the
        // index's `generated` stamp, and the staleness check then reported
        // `source:newer` forever -- a content-identical rebuild keeps the old
        // stamp by design, so nothing ever cleared the flag, and a project with
        // `index-check: error` had its pre-commit hook blocked. Found by running
        // `docs migrate --finalize` on a real project.
        const catalog = await this.writeFeatureCatalog(rootDir, config, unchanged ? previous : index);
        // P8: the docs map is rendered from the same snapshot, before the index
        // file, for the same mtime reason as the catalogue.
        const docsMap = await this.writeDocsMap(rootDir, config, unchanged ? previous : index);
        // The invariant is that `generated` upper-bounds every source mtime THIS
        // build produced -- not merely that the index content moved. A catalogue
        // or freeze write with an unchanged index (a renderer change, a copy-table
        // change) would otherwise leave a source newer than the kept old stamp,
        // recreating the permanent source:newer flag through the other door. The
        // shipped 2.0.1 fix covered only the index-changed door; its own
        // regression test caught this one when 2.0.3 changed the catalogue hrefs.
        if (unchanged && !catalog.wrote && !frozen.wrote && !docsMap.wrote) {
            writtenIndex = previous;
        }
        else {
            // Stamped AFTER the catalogue write so `generated` upper-bounds every
            // source mtime this build produced.
            writtenIndex = {
                ...index,
                generated: new Date().toISOString(),
            };
            // SKILL.index.json is read by the pre-commit hook, by `ospec index query`
            // and by every agent session while `ospec archive` rewrites it; a plain
            // writeFile leaves a window where all of them read a truncated file and
            // report it as damaged. tmp + rename closes it.
            await FileService_1.fileService.writeFileAtomic(indexPath, JSON.stringify(writtenIndex, null, 2));
        }
        await this.saveRunCache(rootDir, config);
        const managedPaths = Array.from(new Set([
            ...(frozen.relativePath ? [frozen.relativePath] : []),
            ...(catalog.relativePath ? [catalog.relativePath] : []),
            ...(docsMap.relativePath ? [docsMap.relativePath] : []),
            path_1.default.relative(rootDir, indexPath).replace(/\\/g, '/'),
        ])).sort((left, right) => compareCodepoints(left, right));
        // 7.7 deleted knowledge-document generation, and it was the only producer of
        // removed paths. An index build no longer deletes anything.
        return {
            index: writtenIndex,
            managedPaths,
            removedPaths: [],
        };
    }
    async createEmpty(rootDir) {
        this.resetBuildDiagnostics();
        const config = await this.readProjectConfig(rootDir);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        // Same rule as writeWithSummary: damage means "rewrite it", not "throw".
        const previousOutcome = await readJsonOutcome(indexPath);
        if (previousOutcome.status === 'damaged') {
            this.recordBuildWarning(indexPath, previousOutcome.reason);
        }
        const previous = previousOutcome.status === 'ok' ? previousOutcome.value : null;
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
        await FileService_1.fileService.writeFileAtomic(indexPath, JSON.stringify(index, null, 2));
        return index;
    }
    stripVolatileFields(index) {
        const { generated: _generated, ...stable } = index;
        return stable;
    }
    async readProjectConfig(rootDir) {
        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        const outcome = await readJsonOutcome(configPath);
        if (outcome.status === 'absent')
            return null;
        // P0-10 policy, shared with src/tools/build-index.ts: a damaged .skillrc
        // fails loudly with recovery steps. It is the only record of two things a
        // rebuild cannot recover by looking around -- `projectLayout` and
        // `documentLanguage` -- and guessing either one damages data silently.
        // Guessing the layout wrote the index against the wrong tree and dropped
        // every archived entry; guessing the language rewrote every generated
        // document on a zh-CN / ja-JP / ar project into English. Both
        // entry points now refuse instead, so one damaged file produces one
        // behaviour whether the user typed `ospec index build` or the pre-commit
        // hook ran build-index. `runHookCheck` still swallows this so a damaged
        // config never blocks a commit.
        if (outcome.status === 'damaged') {
            this.recordBuildWarning(configPath, outcome.reason);
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, outcome.reason);
        }
        // F23 (container shape), F29 (layout/language field values) and FIX-G1
        // (a projectLayout that is missing on a physically nested project) are one
        // gate now, in one place, so no entry point can enforce a subset of them.
        // See `assertProjectConfigUsable` in `src/utils/ProjectLayout.ts`.
        return (0, ProjectLayout_1.assertProjectConfigUsable)(rootDir, configPath, outcome.value, reason => this.recordBuildWarning(configPath, reason));
    }
    async visitMarkdownDocuments(rootDir, currentDir, documents, featureDocs) {
        const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
            .sort((left, right) => compareCodepoints(left.name, right.name));
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await this.visitMarkdownDocuments(rootDir, fullPath, documents, featureDocs);
                continue;
            }
            if (!entry.name.toLowerCase().endsWith('.md') || entry.name === constants_1.FILE_NAMES.SKILL_MD) {
                continue;
            }
            const relativePathForCache = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
            let fingerprint = null;
            try {
                const stat = await fs_1.promises.stat(fullPath);
                fingerprint = statFingerprint(stat);
            }
            catch {
                fingerprint = null;
            }
            if (fingerprint && this.runCache) {
                const cached = this.runCache.documents[relativePathForCache];
                if (cached && cached.fp === fingerprint && cached.doc && Array.isArray(cached.features)) {
                    documents[relativePathForCache] = JSON.parse(JSON.stringify(cached.doc));
                    (0, SkillParser_1.registerFeatureDeclarations)(featureDocs, relativePathForCache, cached.features);
                    this.runCache.nextDocuments[relativePathForCache] = {
                        fp: fingerprint,
                        doc: cached.doc,
                        features: cached.features,
                    };
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
            // 7.2: a generated document does not enter the `documents` map. The
            // feature catalogue and the old per-archive knowledge documents are
            // written FROM the index, so indexing them back made the index quote
            // itself and grow ~1.2 KB per archive forever. `generated: true` in the
            // frontmatter is the marker every generator here already writes.
            if (documentFrontmatter.generated === true)
                continue;
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
            // Parsed from the SAME string whose `sections` were just recorded, so the
            // two offset sets share one coordinate space.
            const declarations = this.skillParser.extractFeatureDeclarations(parsed.content, relativePath);
            (0, SkillParser_1.registerFeatureDeclarations)(featureDocs, relativePath, declarations);
            if (fingerprint && this.runCache) {
                this.runCache.nextDocuments[relativePath] = {
                    fp: fingerprint,
                    doc: JSON.parse(JSON.stringify(documents[relativePath])),
                    features: JSON.parse(JSON.stringify(declarations)),
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
        // One classifier for documents and bindings alike; the shared parser
        // module carries the implementation, mirrored verbatim in build-index.ts.
        return (0, SkillParser_1.inferBindingKind)(relativePath);
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
            // F22: the listing itself can fail (EPERM from a scanner, EBUSY from a
            // sync client). That is a read failure exactly like a damaged state.json,
            // and letting it propagate aborted the whole rebuild -- the one command a
            // user runs to repair the index. Freeze every archive under the directory
            // we could not list and carry on.
            let children;
            try {
                children = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
                    .sort((left, right) => compareCodepoints(left.name, right.name));
            }
            catch (error) {
                this.recordBuildWarning(currentDir, `archive directory listing failed (${describeReadFailure(error)}); index entries under it kept from the previous build`);
                for (const preserved of this.preservedArchivesUnder(cacheState, rootDir, currentDir)) {
                    this.preservedArchives.add(String(preserved.archive || '').replace(/\\/g, '/'));
                    entries.push(JSON.parse(JSON.stringify(preserved)));
                }
                return;
            }
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
                const result = await this.readArchivedChange(rootDir, currentDir);
                if (result.kind === 'entry') {
                    cacheState.nextFingerprints[archive] = fingerprint;
                    cacheState.missDirs.set(archive, currentDir);
                    entries.push(result.entry);
                    return;
                }
                if (result.kind === 'unreadable') {
                    // Freeze this archive for the run: keep whatever the index last knew
                    // about it, and deliberately withhold a fingerprint so the next run
                    // re-reads rather than blessing the preserved copy as fresh.
                    this.preservedArchives.add(archive);
                    const preserved = this.findPreviousArchivedEntry(cacheState, archive);
                    if (preserved) {
                        this.recordBuildWarning(currentDir, `archive read failed (${result.reason}); index entry kept from the previous build`);
                        entries.push(JSON.parse(JSON.stringify(preserved)));
                    }
                    else if (result.degraded) {
                        // F20: nothing to freeze, so a first-time archive would otherwise
                        // be absent from the index forever. Index what did read.
                        this.recordBuildWarning(currentDir, `archive read failed (${result.reason}); indexed from the parts that could be read`);
                        entries.push(result.degraded);
                    }
                    else {
                        this.recordBuildWarning(currentDir, `archive read failed (${result.reason}); index entry kept from the previous build`);
                    }
                }
                return;
            }
            for (const child of children) {
                if (child.isDirectory())
                    await visit(path_1.default.join(currentDir, child.name));
            }
        };
        await visit(archivedRoot);
        return entries.sort((left, right) => compareCodepoints(right.archive, left.archive));
    }
    /**
     * Every archive the previous build knew about that lives at or below `dir`.
     * Used when a directory listing fails: the archives under it are not gone, we
     * just cannot see them this run, so their index rows survive.
     */
    preservedArchivesUnder(cacheState, rootDir, dir) {
        const prefix = path_1.default.relative(rootDir, dir).replace(/\\/g, '/');
        const known = new Map();
        for (const entry of cacheState.cachedEntries.values()) {
            known.set(String(entry?.archive || '').replace(/\\/g, '/'), entry);
        }
        // The committed index wins over the machine-local cache echo of it.
        for (const entry of cacheState.indexArchivedChanges || []) {
            const archive = String(entry?.archive || '').replace(/\\/g, '/');
            if (archive)
                known.set(archive, entry);
        }
        return [...known.entries()]
            .filter(([archive]) => archive === prefix || archive.startsWith(`${prefix}/`))
            .map(([, entry]) => entry);
    }
    /**
     * The committed index is the authoritative record of what an archive looked
     * like; the run cache is the machine-local echo of it. Prefer the index.
     */
    findPreviousArchivedEntry(cacheState, archive) {
        const normalized = archive.replace(/\\/g, '/');
        const fromIndex = (cacheState.indexArchivedChanges || [])
            .find(entry => String(entry?.archive || '').replace(/\\/g, '/') === normalized);
        return fromIndex || cacheState.cachedEntries.get(archive);
    }
    /**
     * Cache key for one archived change's index entry.
     *
     * INVALIDATION CONTRACT: the fingerprint covers every file whose content or
     * mere existence can change the entry `readArchivedChange` produces -- the
     * state, the task graph, and every one of the ARCHIVED_DOCUMENTS whose
     * presence forms the entry's `documents` array (review.md and
     * artifacts/reviews/final-review.md among them). Statting only the first few
     * left a cached entry in place when a review artifact was added to an
     * already-indexed archive, so the index went silently wrong until the cache
     * was deleted by hand.
     *
     * 7.7 dropped the generated knowledge document from this list along with the
     * generator. A cache row written before 7.7 carries one extra `|` component,
     * so it can never compare equal and degrades to a re-read -- which is the
     * safe direction, and why this needs no format gate.
     *
     * Deliberately NOT covered: the `documentation_updates` targets referenced by
     * the task graph live outside the archive, and their existence check re-runs
     * whenever the task graph itself changes.
     *
     * Kept byte-identical to `computeArchiveFingerprint` in
     * `src/tools/build-index.ts`: both write the same machine-local cache file,
     * so a different key layout would make every run invalidate the other's rows.
     */
    async computeArchiveFingerprint(rootDir, archiveDir) {
        const statOf = async (filePath) => {
            try {
                const stat = await fs_1.promises.stat(filePath);
                return statFingerprint(stat);
            }
            catch {
                return '-';
            }
        };
        const parts = [
            await statOf(path_1.default.join(archiveDir, constants_1.FILE_NAMES.STATE)),
            await statOf(path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH)),
        ];
        for (const relativePath of ARCHIVED_DOCUMENTS) {
            parts.push(await statOf(path_1.default.join(archiveDir, ...relativePath.split('/'))));
        }
        return parts.join('|');
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
                // 7.7: `summary` and `affects` used to be recoverable from the generated
                // knowledge document's frontmatter when the archive itself had lost its
                // proposal. Deleting the generator deleted that copy, so history has to
                // carry them -- otherwise removing the generator would quietly downgrade
                // the index for exactly the archives that need it most. These two are
                // scalar-ish rather than set-merged: the newest non-empty value wins,
                // preferring what is on disk NOW over what an older index recorded.
                summary: this.mergeHistoricalScalar(history, entry.summary, 'summary'),
                affects: this.mergeHistoricalStringLists(history, entry.affects, 'affects'),
                target_files: this.mergeHistoricalStringLists(history, entry.target_files, 'target_files'),
                verification_commands: this.mergeHistoricalStringLists(history, entry.verification_commands, 'verification_commands'),
                project_documents: this.mergeHistoricalStringLists(history, entry.project_documents, 'project_documents'),
                features: this.mergeHistoricalStringLists(history, entry.features, 'features'),
                doc_updates: this.mergeHistoricalStringLists(history, entry.doc_updates, 'doc_updates'),
                documents: this.mergeHistoricalOrderedLists(history, entry.documents, 'documents'),
            };
        });
        if (this.runCache) {
            for (const entry of merged)
                this.runCache.nextEntries[entry.archive] = entry;
        }
        return merged;
    }
    /**
     * The replacement for the deleted knowledge-document frontmatter fallback,
     * for the one-value-not-a-set fields. An archive whose proposal was lost
     * reads back with an empty summary; the committed index -- on disk and at
     * HEAD -- still has the one it was archived with. Current wins whenever it
     * has anything to say, so a corrected summary is never overwritten by an
     * older one.
     */
    mergeHistoricalScalar(historical, current, key) {
        const currentValue = String(current || '').trim();
        if (currentValue)
            return currentValue;
        for (const entry of historical) {
            const value = String(entry?.[key] || '').trim();
            if (value)
                return value;
        }
        return '';
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
        // exists-then-read is a race, and the read itself can fail on a locked
        // file. Either way this is a best-effort history source: losing it must
        // degrade the merge, not abort the rebuild that repairs the index.
        try {
            candidates.push(await fs_1.promises.readFile(indexPath, 'utf8'));
        }
        catch {
            // No readable on-disk index; HEAD below may still carry the history.
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
            const statePath = path_1.default.join(archiveDir, constants_1.FILE_NAMES.STATE);
            const stateOutcome = await readJsonOutcome(statePath);
            if (stateOutcome.status === 'damaged') {
                return { kind: 'unreadable', reason: `${constants_1.FILE_NAMES.STATE} ${stateOutcome.reason}` };
            }
            const state = stateOutcome.status === 'ok' ? stateOutcome.value : null;
            if (state?.status !== 'archived')
                return { kind: 'absent' };
            const proposalPath = path_1.default.join(archiveDir, constants_1.FILE_NAMES.PROPOSAL);
            let summary = '';
            let affects = [];
            let proposalData = {};
            if (await pathExists(proposalPath)) {
                const proposalSource = await fs_1.promises.readFile(proposalPath, 'utf8');
                let proposalContent = proposalSource;
                try {
                    const proposal = (0, helpers_1.parseFrontmatterDocument)(proposalSource);
                    proposalData = proposal.data || {};
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
            // A task graph that is present but unreadable is a read failure, not an
            // archive with no tasks: silently emitting an entry with empty
            // target_files would overwrite good index data with a degraded copy. So
            // record why, keep building, and hand the result back as `degraded` for
            // the caller to use only when there is nothing better to keep.
            let unreadableReason = null;
            const taskGraphOutcome = await readJsonOutcome(taskGraphPath);
            if (taskGraphOutcome.status === 'damaged') {
                unreadableReason = `artifacts/agents/${constants_1.FILE_NAMES.TASK_GRAPH} ${taskGraphOutcome.reason}`;
            }
            if (taskGraphOutcome.status === 'ok') {
                const taskGraph = taskGraphOutcome.value;
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
            const archive = path_1.default.relative(rootDir, archiveDir).replace(/\\/g, '/');
            const disposition = state.archive_disposition === 'forced' ? 'forced' : undefined;
            let forceArchiveRecord = null;
            if (disposition === 'forced') {
                const forceRecordPath = path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD);
                const forceOutcome = await readJsonOutcome(forceRecordPath);
                if (forceOutcome.status === 'damaged') {
                    unreadableReason = unreadableReason
                        || `artifacts/agents/${constants_1.FILE_NAMES.FORCE_ARCHIVE_RECORD} ${forceOutcome.reason}`;
                }
                forceArchiveRecord = forceOutcome.status === 'ok' ? forceOutcome.value : null;
            }
            // 7.7: evidence lost from the archive itself (artifacts dropped by a
            // gitignore rule during a merge, say) used to be recovered by re-reading
            // the generated knowledge document's frontmatter. That document is gone.
            // The recovery now happens one level up, in
            // `scanArchivedChangesWithHistory`, from the committed index and its copy
            // at HEAD -- a source that survives the archive directory being deleted
            // outright, which the knowledge document never did.
            const entry = {
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
                // 7.2. Read from BOTH sides: the proposal frontmatter is where a change
                // declares its features (7.5) and `state.json` is where archive records
                // what it actually updated (7.7). Always emitted, possibly empty, so
                // the schema does not change shape as those items land.
                features: (0, SkillParser_1.readFeatureSlugList)([
                    ...(0, SkillParser_1.readFeatureSlugList)(proposalData.features),
                    ...(0, SkillParser_1.readFeatureSlugList)(state.features),
                ]),
                doc_updates: (0, SkillParser_1.readDocUpdateList)([
                    ...(0, SkillParser_1.readDocUpdateList)(proposalData.doc_updates),
                    ...(0, SkillParser_1.readDocUpdateList)(state.doc_updates),
                ]),
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
            if (unreadableReason) {
                return { kind: 'unreadable', reason: unreadableReason, degraded: entry };
            }
            return { kind: 'entry', entry };
        }
        catch (error) {
            // Anything else that blew up on the way through (EPERM on proposal.md,
            // EBUSY listing a directory, ...) is a read failure, not a deletion.
            return { kind: 'unreadable', reason: describeReadFailure(error) };
        }
    }
    /**
     * 7.4: write `docs/project/feature-catalog.md`.
     *
     * One row per DECLARED FEATURE, which is the change from `feature-index.md`
     * that matters: the old file grew one prose block per archive forever and
     * still could not answer "where is this behaviour described". The catalogue
     * has as many rows as the project has features.
     *
     * It is written even when there are no features, so the file exists and says
     * so; a missing file reads as "the build is broken" rather than "nothing has
     * been declared yet". `generated: true` in its frontmatter keeps it out of
     * the `documents` map -- see contract 6.3, and note that omitting it brings
     * back exactly the self-referential growth 7.2 removed.
     */
    async writeFeatureCatalog(rootDir, config, index) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        const featureCount = Object.keys(index?.feature_docs || {}).length;
        if (!(await pathExists(docsProjectRoot)) && featureCount === 0)
            return { relativePath: null, wrote: false };
        await fs_1.promises.mkdir(docsProjectRoot, { recursive: true });
        const targetPath = path_1.default.join(docsProjectRoot, 'feature-catalog.md');
        const { content } = await (0, FeatureCatalog_1.renderCatalogFromIndex)(rootDir, config, index);
        const previous = await pathExists(targetPath) ? await fs_1.promises.readFile(targetPath, 'utf8') : null;
        // `wrote` feeds the caller's stamp decision: a catalogue that changed while
        // the index did not (a renderer change, a copy-table change) still has to
        // refresh `generated`, or the freshness check reports source:newer forever.
        const wrote = previous !== content;
        if (wrote)
            await fs_1.promises.writeFile(targetPath, content, 'utf8');
        return { relativePath: path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/'), wrote };
    }
    /**
     * P8: `docs/project/docs-map.md` -- the generated navigation layer. One
     * line per indexed document, grouped by kind, carrying its binding count.
     * Bounded by the number of documents, so it never grows with history.
     * `generated: true` keeps it out of the `documents` map for exactly the
     * reason the catalogue carries it. Same write discipline as the catalogue:
     * rendered from the snapshot, compare-before-write, and its `wrote` feeds
     * the caller's stamp decision.
     */
    async writeDocsMap(rootDir, config, index) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        const documentCount = Object.keys(index?.documents || {}).length;
        if (!(await pathExists(docsProjectRoot)) && documentCount === 0)
            return { relativePath: null, wrote: false };
        await fs_1.promises.mkdir(docsProjectRoot, { recursive: true });
        const targetPath = path_1.default.join(docsProjectRoot, 'docs-map.md');
        const mapDirRelativePath = path_1.default.relative(rootDir, docsProjectRoot).replace(/\\/g, '/');
        const content = renderDocsMapContent(index, String(config?.documentLanguage || 'en-US'), mapDirRelativePath);
        const previous = await pathExists(targetPath) ? await fs_1.promises.readFile(targetPath, 'utf8') : null;
        const wrote = previous !== content;
        if (wrote)
            await fs_1.promises.writeFile(targetPath, content, 'utf8');
        return { relativePath: path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/'), wrote };
    }
    /**
     * 7.4: `feature-index.md` stops being generated.
     *
     * It is not deleted -- an existing project's links to it would rot, and
     * deleting a file a user may have committed is 7.9's decision to offer, not
     * this function's to take. Instead, the FIRST build after the upgrade
     * rewrites it once into what it should always have been: a frozen archive
     * history of pure link lines, with all thirty prose blocks removed and a
     * pointer at the catalogue and `ospec docs locate`.
     *
     * `historical: true` in the frontmatter is the latch. Once it is set this
     * function returns without reading anything else, so the file never changes
     * again and never re-accumulates -- which is what "one-off" has to mean if
     * it is to be true on the second build as well as the first. A project that
     * has no `feature-index.md` never gets one.
     */
    async freezeLegacyFeatureIndex(rootDir, config, archivedChanges) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        const targetPath = path_1.default.join(docsProjectRoot, 'feature-index.md');
        if (!(await pathExists(targetPath)))
            return { relativePath: null, wrote: false };
        const existing = await fs_1.promises.readFile(targetPath, 'utf8');
        if ((0, helpers_1.parseFrontmatterDocument)(existing).data?.historical === true) {
            return { relativePath: path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/'), wrote: false };
        }
        const copy = this.getFeatureIndexCopy(config?.documentLanguage);
        const lines = [
            '---',
            'name: project-feature-index',
            `title: ${copy.title}`,
            'tags: [project, archive, historical]',
            'generated: true',
            'historical: true',
            '---',
            '',
            `# ${copy.title}`,
            '',
            `> ${copy.frozen}`,
            '',
        ];
        if (archivedChanges.length === 0) {
            lines.push(copy.empty, '');
        }
        for (const change of archivedChanges) {
            const label = change.disposition === 'forced'
                ? `${change.feature} — FORCED/INCOMPLETE`
                : change.feature;
            const archiveLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, change.archive)).replace(/\\/g, '/');
            lines.push(`- [${label}](${archiveLink})`);
        }
        lines.push('');
        const content = `${lines.join('\n').trimEnd()}\n`;
        const wrote = existing !== content;
        if (wrote)
            await fs_1.promises.writeFile(targetPath, content, 'utf8');
        return { relativePath: path_1.default.relative(rootDir, targetPath).replace(/\\/g, '/'), wrote };
    }
    /**
     * Copy for the FROZEN feature-index (7.4). It kept fifteen labels while it
     * was generating one prose block per archive; the frozen file is a title, a
     * pointer and link lines, so the other twelve went with the prose.
     */
    getFeatureIndexCopy(documentLanguage) {
        if (documentLanguage === 'zh-CN') {
            return {
                title: '项目功能索引（历史归档清单）',
                frozen: '本文件已冻结，不再更新。功能说明请看 `docs/project/feature-catalog.md`，定位某一功能的章节请用 `ospec docs locate --feature <slug>`。下面仅保留历史归档链接。',
                empty: '暂无已归档 change。',
            };
        }
        if (documentLanguage === 'ja-JP') {
            return {
                title: 'プロジェクト機能索引（過去の archive 一覧）',
                frozen: 'このファイルは凍結され、更新されません。機能の説明は `docs/project/feature-catalog.md` を、特定機能の節の位置は `ospec docs locate --feature <slug>` を参照してください。以下は過去の archive へのリンクのみです。',
                empty: 'archive 済みの change はまだありません。',
            };
        }
        if (documentLanguage === 'ar') {
            return {
                title: 'فهرس ميزات المشروع (قائمة الأرشيف التاريخية)',
                frozen: 'هذا الملف مجمّد ولم يعد يُحدَّث. لوصف الميزات راجع `docs/project/feature-catalog.md`، ولتحديد قسم ميزة بعينها استخدم `ospec docs locate --feature <slug>`. ما يلي روابط الأرشيف التاريخية فقط.',
                empty: 'لا توجد تغييرات مؤرشفة بعد.',
            };
        }
        return {
            title: 'Project Feature Index (historical archive list)',
            frozen: 'This file is frozen and is no longer updated. For what the project does, read `docs/project/feature-catalog.md`; to locate one feature\'s section, run `ospec docs locate --feature <slug>`. What follows is the historical archive list only.',
            empty: 'No archived changes yet.',
        };
    }
}
exports.IndexBuilder = IndexBuilder;
const createIndexBuilder = (skillParser) => new IndexBuilder(skillParser);
exports.createIndexBuilder = createIndexBuilder;
/**
 * P8: the docs-map body. A pure function of the snapshot, DUPLICATED VERBATIM
 * in `src/tools/build-index.ts` for the same reason as the declaration parser
 * (that file is built-ins-only); `tests/services/p8-docs-map.test.mjs` builds
 * with both entry points and compares the emitted bytes, which is what keeps
 * the copies honest.
 *
 * Shape: one line per indexed document, grouped by kind in a fixed order,
 * linking relative to `docs/project/` and carrying the document's binding
 * count. Group headings use the kind vocabulary itself -- it is CLI/config
 * vocabulary, not prose, so it stays English in every document language.
 */
function renderDocsMapContent(index, documentLanguage, mapDirRelativePath) {
    const copy = documentLanguage === 'zh-CN'
        ? { title: '文档地图', guidance: '由 OSpec 从文档索引生成，请勿手工编辑。定位某一功能节用 `ospec docs locate --feature <slug>`，检索用 `ospec index query <关键词>`。' }
        : documentLanguage === 'ja-JP'
            ? { title: '文書マップ', guidance: 'OSpec が文書インデックスから生成します。手で編集しないでください。機能節の特定は `ospec docs locate --feature <slug>`、検索は `ospec index query <キーワード>`。' }
            : documentLanguage === 'ar'
                ? { title: 'خريطة الوثائق', guidance: 'يُنشئها OSpec من فهرس الوثائق؛ لا تحررها يدويًا. لتحديد قسم ميزة استخدم `ospec docs locate --feature <slug>`، وللبحث `ospec index query <كلمة>`.' }
                : { title: 'Documentation Map', guidance: 'Generated by OSpec from the document index; do not edit by hand. Locate one feature section with `ospec docs locate --feature <slug>`; search with `ospec index query <keyword>`.' };
    const documents = index?.documents && typeof index.documents === 'object' && !Array.isArray(index.documents)
        ? Object.values(index.documents)
        : [];
    const bindingsByFile = new Map();
    for (const entry of Object.values(index?.feature_docs || {})) {
        const file = String(entry?.file || '');
        if (file)
            bindingsByFile.set(file, (bindingsByFile.get(file) || 0) + 1);
    }
    const KIND_ORDER = ['feature', 'api', 'design', 'project', 'planning', 'product', 'other'];
    const lines = [
        '---',
        `title: ${copy.title}`,
        'generated: true',
        'tags: [project, docs, map, ai-index]',
        '---',
        '',
        `# ${copy.title}`,
        '',
        `> ${copy.guidance}`,
    ];
    const mapDir = String(mapDirRelativePath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    for (const kind of KIND_ORDER) {
        const group = documents
            .filter(document => (document?.kind || 'other') === kind)
            .sort((left, right) => (left.file < right.file ? -1 : left.file > right.file ? 1 : 0));
        if (group.length === 0)
            continue;
        lines.push('', `## ${kind} (${group.length})`, '');
        for (const document of group) {
            const file = String(document?.file || '');
            const href = path_1.default.posix.relative(mapDir, file);
            const bindings = bindingsByFile.get(file) || 0;
            lines.push(`- [${document?.title || file}](${href})${bindings > 0 ? ` — ${bindings} binding(s)` : ''}`);
        }
    }
    lines.push('');
    return lines.join('\n');
}
