#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');
/*
 * M-cfg3: a verbatim copy of the scanner in `src/utils/ChecklistScan.ts`.
 *
 * This file is DELIBERATELY built-ins only. `ospec update` copies it out of
 * dist into the user's `.ospec/tools/build-index-auto.cjs`, where no relative
 * require back into the package resolves -- importing the shared module made
 * six tests fail with `Cannot find module '../utils/ChecklistScan'`. So the
 * predicate is duplicated here rather than imported, and the copy is held in
 * step by `tests/utils/checklist-scan.test.mjs`, which extracts both texts and
 * asserts they are identical. Change one and that test fails until you change
 * the other.
 */
function blankFencedCodeBlocks(content) {
    const lines = splitLines(content);
    const fenced = fencedLineFlags(content);
    return lines.map((line, index) => (fenced[index] ? '' : line));
}
function splitLines(content) {
    return content.split('\n').map(line => (line.endsWith('\r') ? line.slice(0, -1) : line));
}
function fencedLineFlags(content) {
    let fence = null;
    return splitLines(content).map(line => {
        const opening = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/.exec(line);
        if (!fence) {
            // An opening ``` fence's info string may not itself contain a
            // backtick; a ~~~ fence's may.
            if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
                fence = { char: opening[1][0], length: opening[1].length };
                return true;
            }
            return false;
        }
        if (opening
            && opening[1][0] === fence.char
            && opening[1].length >= fence.length
            && opening[2].trim().length === 0) {
            fence = null;
        }
        return true;
    });
}
const UNCHECKED_ITEM = /^[ \t]*[-*+][ \t]+\[ \](?:[ \t][^\n]*)?$/;
const ANY_ITEM = /^[ \t]*[-*+][ \t]+\[(?: |x|X)\](?:[ \t][^\n]*)?$/;
function listUncheckedChecklistItems(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .filter(line => UNCHECKED_ITEM.test(line));
}
function hasChecklistItem(content) {
    return blankFencedCodeBlocks(String(content ?? ''))
        .some(line => ANY_ITEM.test(line));
}
/*
 * M-misc6: a verbatim copy of `src/utils/ContractVersion.ts`, duplicated for
 * the same reason `blankFencedCodeBlocks` above is: this file is built-ins
 * only, because `ospec update` copies it into the user's
 * `.ospec/tools/build-index-auto.cjs` where no relative require into the
 * package resolves. Held in step with the shared module by
 * `tests/utils/contract-version.test.mjs`.
 */
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
function parseContractVersion(raw) {
    const match = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(raw ?? ''));
    if (!match)
        return null;
    return {
        major: Number(match[1]),
        minor: match[2] === undefined ? 0 : Number(match[2]),
        patch: match[3] === undefined ? 0 : Number(match[3]),
    };
}
function contractVersionAtLeast(raw, major, minor, patch) {
    const parsed = parseContractVersion(raw);
    if (!parsed)
        return false;
    if (parsed.major !== major)
        return parsed.major > major;
    if (parsed.minor !== minor)
        return parsed.minor > minor;
    return parsed.patch >= patch;
}
// Directories an index walk must never descend into. Kept identical to
// `SKIP_DIRS` in `src/services/IndexBuilder.ts`; the two implementations write
// the same file, so a name present in one list and absent from the other makes
// the CLI and the hook disagree about whether the index is stale.
//
// On a nested project the walk is already bounded by `.ospec/`, but a classic
// project's managed root IS the repository root: with only the five original
// entries, every `ospec index build` and every pre-commit hook check walked the
// virtualenv, the vendored dependencies, the framework build cache and the
// coverage report looking for SKILL.md files that are never there.
//
// FIX-2 / D5: names in `NEVER_WALK_DIRS` are skipped unconditionally and a
// SKILL.md under them is never rescued, because they are not "generated trees a
// user might legitimately keep a skill in" -- `changes/` and `for-ai/` are
// OSpec's own managed trees with their own readers, and the VCS metadata
// directories are not part of the working tree at all. Everything else in
// `SKIP_DIRS` is a heuristic, and heuristics do not get to silently delete user
// content. Kept identical to `NEVER_WALK_DIRS` in
// `src/services/IndexBuilder.ts`.
const NEVER_WALK_DIRS = new Set([
    // OSpec's own managed trees; scanned by their own readers, not by `walk`.
    'changes',
    'for-ai',
    // Version control metadata.
    '.git',
    '.hg',
    '.svn',
]);
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
const INDEX_FILE = 'SKILL.index.json';
const SKILL_FILE = 'SKILL.md';
/*
 * FIX-2 / D5. Kept identical to `resolveIndexSkipDirs` in
 * `src/services/IndexBuilder.ts`.
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
    const run = (args) => spawnSync('git', args, { cwd: managedRoot, encoding: 'utf8', windowsHide: true });
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
 * `src/services/IndexBuilder.ts`.
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
 * Every ordering that reaches SKILL.index.json goes through this. `localeCompare`
 * used to: it consults the host ICU collation, so two collaborators on the same
 * commit produced byte-different indexes for the same inputs (CJK filenames are
 * the easy way to see it, but any locale-sensitive pair does it). The hook then
 * reported "stale" on a freshly built index, forever, on at least one of the two
 * machines. Code points have no locale, so the index is a pure function of the
 * repository again.
 *
 * Kept identical to `compareCodepoints` in `src/services/IndexBuilder.ts`.
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
async function main() {
    try {
        const action = process.argv[2] || 'build';
        const rootDir = process.cwd();
        switch (action) {
            case 'build':
                await writeIndex(rootDir, { silent: false });
                printBuildWarnings();
                break;
            case 'hook-check':
                process.exitCode = await runHookCheck(rootDir, process.argv[3] || 'pre-commit');
                printBuildWarnings();
                break;
            default:
                console.error(`[ospec] unknown action: ${action}`);
                process.exitCode = 1;
        }
    }
    catch (error) {
        console.error(`[ospec] ${error.message}`);
        printBuildWarnings();
        process.exitCode = 1;
    }
}
async function runHookCheck(rootDir, event) {
    try {
        return await runHookCheckChecks(rootDir, event);
    }
    catch (error) {
        if (!isDamagedConfigError(error))
            throw error;
        // The hook exists to nudge, not to wedge the repository: a damaged
        // .skillrc cannot be repaired by a commit that the hook itself blocks.
        console.log(`[ospec] ${error.message}`);
        console.log('[ospec] hook check skipped until .skillrc is repaired');
        return 0;
    }
}
async function runHookCheckChecks(rootDir, event) {
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
            console.log(indexStatus.damaged
                ? '[ospec] SKILL.index.json is damaged and will be rebuilt from scratch'
                : '[ospec] SKILL.index.json is stale');
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
    await freezeLegacyFeatureIndex(rootDir, layout, archivedChanges);
    const indexPath = resolveManagedPath(rootDir, INDEX_FILE, layout);
    const nextIndex = await buildIndex(rootDir, { layout, archivedChanges });
    // 7.4: rendered from the snapshot, so it happens before the "already up to
    // date" short-circuit below -- an unchanged index still needs a catalogue
    // written on the first build after the upgrade, when the file does not exist.
    await writeFeatureCatalog(rootDir, layout, nextIndex);
    await saveRunCache(rootDir, layout);
    // A damaged index reads as absent here, which routes straight into the
    // rewrite below: `ospec index build` is the recovery command printed by the
    // hook, so it has to succeed *while* the file is damaged. A parseable index
    // that merely carries a BOM is rewritten too, so the byte-level damage is
    // healed instead of being declared "already up to date".
    const currentOutcome = await readJsonOutcome(indexPath);
    const currentIndex = currentOutcome.status === 'ok' ? currentOutcome.value : null;
    if (currentOutcome.status === 'damaged') {
        recordBuildWarning(indexPath, currentOutcome.reason);
    }
    if (currentIndex && currentOutcome.status === 'ok' && !currentOutcome.hadBom && isSameIndex(currentIndex, nextIndex)) {
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
    await writeFileAtomic(indexPath, `${JSON.stringify(output, null, 2)}\n`);
    if (!options.silent) {
        console.log('[ospec] SKILL.index.json rebuilt');
        printIndexStats(output);
    }
    return { changed: true, index: output };
}
const ATOMIC_REPLACE_RETRY_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);
const ATOMIC_REPLACE_MAX_RETRIES = 50;
/**
 * Write a file so no reader can ever observe it half-written.
 *
 * SKILL.index.json is 100KB+ and is read by the pre-commit hook, by `ospec index
 * query`, and by every agent session, while `ospec archive` rewrites it. A plain
 * writeFile leaves a window in which all of those read a truncated file, and the
 * index reader treats a truncated file as damaged -- which is a rebuild prompt
 * at best and a silently emptied `archived_changes` at worst.
 *
 * Mirrors `FileService.writeFileAtomic` (retry set included, because Windows
 * hands out EPERM/EBUSY when an indexer or antivirus has the target open); this
 * file stays dependency-free so it can be copied into a project as a standalone
 * .cjs.
 */
async function writeFileAtomic(targetPath, content) {
    const directory = path.dirname(targetPath);
    await fsp.mkdir(directory, { recursive: true });
    const tempPath = path.join(directory, `.${path.basename(targetPath)}.${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}.tmp`);
    try {
        await fsp.writeFile(tempPath, content, { encoding: 'utf8', flag: 'wx' });
        for (let attempt = 0;; attempt += 1) {
            try {
                await fsp.rename(tempPath, targetPath);
                return;
            }
            catch (error) {
                const code = error?.code;
                if (!code || !ATOMIC_REPLACE_RETRY_CODES.has(code) || attempt >= ATOMIC_REPLACE_MAX_RETRIES) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, Math.min(10 * (attempt + 1), 100)));
            }
        }
    }
    finally {
        await fsp.rm(tempPath, { force: true }).catch(() => undefined);
    }
}
async function computeIndexStatus(rootDir) {
    const layout = await getProjectLayout(rootDir);
    await loadRunCache(rootDir, layout);
    const indexPath = resolveManagedPath(rootDir, INDEX_FILE, layout);
    const currentOutcome = await readJsonOutcome(indexPath);
    const currentIndex = currentOutcome.status === 'ok' ? currentOutcome.value : null;
    if (currentOutcome.status === 'damaged') {
        recordBuildWarning(indexPath, currentOutcome.reason);
    }
    const nextIndex = await buildIndex(rootDir);
    await saveRunCache(rootDir, layout);
    return {
        stale: !currentIndex || currentOutcome.status !== 'ok' || currentOutcome.hadBom || !isSameIndex(currentIndex, nextIndex),
        damaged: currentOutcome.status === 'damaged',
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
    const featureDocs = {};
    let totalFiles = 0;
    let totalSections = 0;
    const skipDirs = resolveIndexSkipDirs(await readSkillConfig(rootDir));
    // FIX-2 / D14: `modules[name] = ...` was last-writer-wins over the walk, so
    // the traversal-order change could flip *which* file won when two SKILL.md
    // files declare the same `frontmatter.name` -- a content change, not just an
    // ordering one. Collect first, then resolve collisions by a rule that does
    // not depend on traversal order at all.
    const collected = [];
    const collectSkillFile = async fullPath => {
        totalFiles += 1;
        const relativePath = normalizeManagedRelativePath(rootDir, fullPath, layout);
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        const moduleName = parsed.frontmatter.name || relativePath;
        const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
        const tags = Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [];
        totalSections += Object.keys(parsed.sections).length;
        collected.push({
            relativePath,
            moduleName,
            module: { file: relativePath, title, tags, sections: parsed.sections },
        });
    };
    await walk(managedRoot, collectSkillFile, skipDirs);
    // FIX-2 / D5: a SKILL.md that is tracked by git is always indexed, even when
    // it lives under a skipped directory name. One `git ls-files` for the whole
    // build; the walk itself is untouched.
    const skippedTracked = findSkippedTrackedSkillFiles(managedRoot, skipDirs);
    // FIX-5 / MN-6: one warning about the listing itself, when git could not
    // answer "is this tracked" completely. Silently degrading made index content
    // depend on the environment.
    if (skippedTracked.warning)
        recordBuildWarning(managedRoot, skippedTracked.warning);
    for (const rescued of skippedTracked.rescued) {
        const fullPath = path.join(managedRoot, ...rescued.relativePath.split('/'));
        if (!(await exists(fullPath)))
            continue;
        recordBuildWarning(fullPath, `indexed because it is tracked by git, even though "${rescued.skippedBy}/" is on the index skip list; `
            + 'add it to .skillrc "index".include_dirs to walk it, or git-ignore it to skip it');
        await collectSkillFile(fullPath);
    }
    // Walk order still decides where a module key lands, so the file the index
    // writes is byte-identical whenever no two SKILL.md files share a name; only
    // the *value* on a collision changes, and it changes to the entry whose path
    // sorts first, which no traversal order can perturb.
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
    for (const tag of Object.keys(tagIndex).sort((left, right) => compareCodepoints(left, right))) {
        tagIndex[tag] = tagIndex[tag].sort((left, right) => compareCodepoints(left, right));
    }
    const docsRoot = resolveManagedPath(rootDir, 'docs', layout);
    if (await exists(docsRoot)) {
        await walkMarkdownDocuments(rootDir, docsRoot, documents, featureDocs);
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
        // Keyed by slug, sorted, so the file stays a pure function of the tree.
        feature_docs: Object.fromEntries(Object.keys(featureDocs)
            .sort((left, right) => compareCodepoints(left, right))
            .map(slug => [slug, featureDocs[slug]])),
    };
}
async function walkMarkdownDocuments(rootDir, currentDir, documents, featureDocs) {
    const entries = (await fsp.readdir(currentDir, { withFileTypes: true }))
        .sort((left, right) => compareCodepoints(left.name, right.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            await walkMarkdownDocuments(rootDir, fullPath, documents, featureDocs);
            continue;
        }
        if (!entry.name.toLowerCase().endsWith('.md') || entry.name === SKILL_FILE)
            continue;
        const relativePath = normalizePath(path.relative(rootDir, fullPath));
        let fingerprint = null;
        try {
            const stat = await fsp.stat(fullPath);
            fingerprint = statFingerprint(stat);
        }
        catch {
            fingerprint = null;
        }
        if (fingerprint && runCache) {
            const cached = runCache.documents[relativePath];
            if (cached && cached.fp === fingerprint && cached.doc && Array.isArray(cached.features)) {
                const doc = JSON.parse(JSON.stringify(cached.doc));
                documents[relativePath] = doc;
                registerFeatureDeclarations(featureDocs, relativePath, cached.features);
                runCache.nextDocuments[relativePath] = {
                    fp: fingerprint,
                    doc: cached.doc,
                    features: cached.features,
                };
                continue;
            }
        }
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        let metadata = {};
        let body = '';
        try {
            const frontmatter = parseFrontmatter(content);
            metadata = frontmatter.data;
            body = frontmatter.body;
        }
        catch {
            metadata = {};
            body = '';
        }
        // 7.2: a generated document does not enter the `documents` map. The
        // feature catalogue and the old per-archive knowledge documents are
        // written FROM the index, so indexing them back made the index quote
        // itself and grow ~1.2 KB per archive forever. `generated: true` in the
        // frontmatter is the marker every generator here already writes.
        if (metadata.generated === true)
            continue;
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
        // Parsed from the SAME string whose `sections` were just recorded, so the
        // two offset sets share one coordinate space.
        const declarations = parseFeatureDeclarations(body, relativePath);
        registerFeatureDeclarations(featureDocs, relativePath, declarations);
        if (fingerprint && runCache) {
            runCache.nextDocuments[relativePath] = {
                fp: fingerprint,
                doc: JSON.parse(JSON.stringify(documents[relativePath])),
                features: JSON.parse(JSON.stringify(declarations)),
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
// 7.2: the cached `documents` shape changed twice in one phase -- it gained
// `features`, and generated documents stopped being cached at all. A cache
// written before either change would keep re-inserting a generated document
// forever, because the hit path never reads its frontmatter. Bump this and the
// whole document half of the cache is refused; fingerprints and archive entries
// are unaffected.
const DOCUMENT_CACHE_FORMAT = 2;
// One immutable-input cache per run: archived changes never mutate after they
// are written and markdown documents change rarely, so fingerprinting them
// turns every rebuild and hook check into O(changed inputs). Deleting the
// cache file forces a full rescan.
let runCache = null;
async function loadRunCache(rootDir, layout) {
    const config = await readSkillConfig(rootDir);
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
        preservedArchives: new Set(),
        misses: 0,
        missDirs: new Map(),
        documentLanguage,
    };
    try {
        // The fingerprint cache is machine-local and gitignored, so its damage is
        // a silent full-rescan rather than something to report to the user.
        const cache = await readJsonIfExists(resolveManagedPath(rootDir, ARCHIVE_SCAN_CACHE_FILE, layout), { warn: false });
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
    // Re-fingerprint freshly extracted archives, so a new archive settles into
    // cache hits on the very next run.
    for (const [archive, archiveDir] of runCache.missDirs) {
        try {
            runCache.nextFingerprints[archive] = await computeArchiveFingerprint(rootDir, archiveDir);
        }
        catch {
            delete runCache.nextFingerprints[archive];
        }
    }
    const cachePath = resolveManagedPath(rootDir, ARCHIVE_SCAN_CACHE_FILE, layout);
    const next = `${JSON.stringify({
        version: '1.0',
        documentLanguage: runCache.documentLanguage,
        documentCacheFormat: DOCUMENT_CACHE_FORMAT,
        fingerprints: runCache.nextFingerprints,
        entries: runCache.nextEntries,
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
/**
 * Cache key for one archived change's index entry.
 *
 * INVALIDATION CONTRACT: the fingerprint must cover every file whose content or
 * mere existence can change the entry `readArchivedChange` produces. It used to
 * stat four files -- state.json, proposal.md, the task graph and the generated
 * index entry -- while the entry's `documents` array is the existence
 * list of all eight ARCHIVED_DOCUMENTS and its forced-archive fields come out of
 * artifacts/agents/force-archive.json. Adding review.md or artifacts/reviews/
 * final-review.md to an already-indexed archive therefore left the cached entry
 * in place and the index silently wrong until the cache was deleted by hand.
 *
 * Deliberately NOT covered: the `documentation_updates` targets referenced by
 * the task graph live outside the archive, and their existence check already
 * re-runs whenever the task graph itself changes. Deleting the cache file (or
 * damaging it) is a full rescan, never a stale hit.
 */
async function computeArchiveFingerprint(rootDir, archiveDir) {
    const statOf = async filePath => {
        try {
            const stat = await fsp.stat(filePath);
            return statFingerprint(stat);
        }
        catch {
            return '-';
        }
    };
    const parts = [
        await statOf(path.join(archiveDir, 'state.json')),
        await statOf(path.join(archiveDir, 'artifacts', 'agents', 'task-graph.json')),
    ];
    for (const relativePath of ARCHIVED_DOCUMENTS) {
        parts.push(await statOf(path.join(archiveDir, ...relativePath.split('/'))));
    }
    return parts.join('|');
}
// The committed index is the authoritative record of what an archive looked
// like; the run cache is the machine-local echo of it. Prefer the index.
function findPreviousArchivedEntry(cacheState, archive) {
    const normalized = normalizePath(archive);
    const fromIndex = (cacheState.indexArchivedChanges || [])
        .find(entry => normalizePath(String(entry?.archive || '')) === normalized);
    return fromIndex || cacheState.cachedEntries.get(archive);
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
        // F22: the listing itself can fail (EPERM from a scanner, EBUSY from a
        // sync client). That is a read failure exactly like a damaged state.json,
        // and letting it propagate aborted the whole rebuild -- the one command a
        // user runs to repair the index. Freeze every archive under the directory
        // we could not list and carry on.
        let entries;
        try {
            entries = (await fsp.readdir(currentDir, { withFileTypes: true }))
                .sort((left, right) => compareCodepoints(left.name, right.name));
        }
        catch (error) {
            recordBuildWarning(currentDir, `archive directory listing failed (${describeReadFailure(error)}); index entries under it kept from the previous build`);
            for (const preserved of preservedArchivesUnder(cacheState, rootDir, currentDir)) {
                cacheState.preservedArchives.add(preserved.archive);
                changes.push(JSON.parse(JSON.stringify(preserved)));
            }
            return;
        }
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
            const result = await readArchivedChange(rootDir, currentDir);
            if (result.kind === 'entry') {
                cacheState.nextFingerprints[archive] = fingerprint;
                cacheState.missDirs.set(archive, currentDir);
                changes.push(result.entry);
                return;
            }
            if (result.kind === 'unreadable') {
                // Freeze this archive for the run: keep whatever the index last knew
                // about it, and deliberately withhold a
                // fingerprint so the next run re-reads instead of blessing the
                // preserved copy as fresh.
                cacheState.preservedArchives.add(archive);
                const preserved = findPreviousArchivedEntry(cacheState, archive);
                if (preserved) {
                    recordBuildWarning(currentDir, `archive read failed (${result.reason}); index entry kept from the previous build`);
                    changes.push(JSON.parse(JSON.stringify(preserved)));
                }
                else if (result.degraded) {
                    // F20: nothing to freeze, so a first-time archive would otherwise be
                    // absent from the index forever. Index what did read.
                    recordBuildWarning(currentDir, `archive read failed (${result.reason}); indexed from the parts that could be read`);
                    changes.push(result.degraded);
                }
                else {
                    recordBuildWarning(currentDir, `archive read failed (${result.reason}); index entry kept from the previous build`);
                }
            }
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory())
                await visit(path.join(currentDir, entry.name));
        }
    };
    await visit(archivedRoot);
    return changes.sort((left, right) => compareCodepoints(right.archive, left.archive));
}
/**
 * Every archive the previous build knew about that lives at or below `dir`.
 * Used when a directory listing fails: the archives under it are not gone, we
 * just cannot see them this run, so their index rows survive.
 */
function preservedArchivesUnder(cacheState, rootDir, dir) {
    const prefix = normalizePath(path.relative(rootDir, dir));
    const known = new Map();
    for (const entry of cacheState.cachedEntries.values()) {
        known.set(normalizePath(String(entry?.archive || '')), entry);
    }
    // The committed index wins over the machine-local cache echo of it.
    for (const entry of cacheState.indexArchivedChanges || []) {
        const archive = normalizePath(String(entry?.archive || ''));
        if (archive)
            known.set(archive, entry);
    }
    return [...known.entries()]
        .filter(([archive]) => archive === prefix || archive.startsWith(`${prefix}/`))
        .map(([, entry]) => entry);
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
            // 7.7: `summary` and `affects` used to be recoverable from the generated
            // knowledge document's frontmatter when the archive itself had lost its
            // proposal. Deleting the generator deleted that copy, so history has to
            // carry them -- otherwise removing the generator would quietly downgrade
            // the index for exactly the archives that need it most. These two are
            // scalar-ish rather than set-merged: the newest non-empty value wins,
            // preferring what is on disk NOW over what an older index recorded.
            summary: mergeHistoricalScalar(history, entry.summary),
            affects: mergeHistoricalStringLists(history, entry.affects, 'affects'),
            target_files: mergeHistoricalStringLists(history, entry.target_files),
            verification_commands: mergeHistoricalStringLists(history, entry.verification_commands, 'verification_commands'),
            project_documents: mergeHistoricalStringLists(history, entry.project_documents, 'project_documents'),
            features: mergeHistoricalStringLists(history, entry.features, 'features'),
            doc_updates: mergeHistoricalStringLists(history, entry.doc_updates, 'doc_updates'),
            documents: mergeHistoricalOrderedLists(history, entry.documents),
        };
    });
    if (runCache) {
        for (const entry of merged)
            runCache.nextEntries[entry.archive] = entry;
    }
    return merged;
}
/**
 * The replacement for the deleted knowledge-document frontmatter fallback, for
 * the one-value-not-a-set fields. An archive whose proposal was lost reads back
 * with an empty summary; the committed index -- on disk and at HEAD -- still
 * has the one it was archived with. Current wins whenever it has anything to
 * say, so a corrected summary is never overwritten by an older one.
 */
function mergeHistoricalScalar(historical, current) {
    const currentValue = String(current || '').trim();
    if (currentValue)
        return currentValue;
    for (const entry of historical) {
        const value = String(entry?.summary || '').trim();
        if (value)
            return value;
    }
    return '';
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
    // exists-then-read is a race, and the read itself can fail on a locked file.
    // Either way this is a best-effort history source: losing it must degrade
    // the merge, not abort the rebuild that repairs the index.
    try {
        candidates.push(await fsp.readFile(indexPath, 'utf8'));
    }
    catch {
        // No readable on-disk index; HEAD below may still carry the history.
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
function describeReadFailure(error) {
    return error?.code ? `${error.code}: ${error.message || 'read failed'}` : String(error?.message || error || 'read failed');
}
async function readArchivedChange(rootDir, archiveDir) {
    try {
        const stateOutcome = await readJsonOutcome(path.join(archiveDir, 'state.json'));
        if (stateOutcome.status === 'damaged') {
            return { kind: 'unreadable', reason: `state.json ${stateOutcome.reason}` };
        }
        const state = stateOutcome.status === 'ok' ? stateOutcome.value : null;
        if (state?.status !== 'archived')
            return { kind: 'absent' };
        const proposalPath = path.join(archiveDir, 'proposal.md');
        let summary = '';
        let affects = [];
        let proposalData = {};
        if (await exists(proposalPath)) {
            const proposal = parseFrontmatter(await fsp.readFile(proposalPath, 'utf8'));
            proposalData = proposal.data || {};
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
        // A damaged artifact under a readable state.json degrades the entry rather
        // than defining it away: record why, keep building, and hand the result
        // back as `degraded` (see ArchiveReadResult).
        let unreadableReason = null;
        const taskGraphOutcome = await readJsonOutcome(path.join(archiveDir, 'artifacts', 'agents', 'task-graph.json'));
        if (taskGraphOutcome.status === 'damaged') {
            unreadableReason = `artifacts/agents/task-graph.json ${taskGraphOutcome.reason}`;
        }
        const taskGraph = taskGraphOutcome.status === 'ok' ? taskGraphOutcome.value : null;
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
        const disposition = state.archive_disposition === 'forced' ? 'forced' : undefined;
        let forceArchiveRecord = null;
        if (disposition === 'forced') {
            const forceOutcome = await readJsonOutcome(path.join(archiveDir, 'artifacts', 'agents', 'force-archive.json'));
            if (forceOutcome.status === 'damaged') {
                unreadableReason = unreadableReason
                    || `artifacts/agents/force-archive.json ${forceOutcome.reason}`;
            }
            forceArchiveRecord = forceOutcome.status === 'ok' ? forceOutcome.value : null;
        }
        const entry = {
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
            // 7.2. Read from BOTH sides: the proposal frontmatter is where a change
            // declares its features (7.5) and `state.json` is where archive records
            // what it actually updated (7.7). Always emitted, possibly empty, so
            // the schema does not change shape as those items land.
            features: readFeatureSlugList([
                ...readFeatureSlugList(proposalData.features),
                ...readFeatureSlugList(state.features),
            ]),
            doc_updates: readDocUpdateList([
                ...readDocUpdateList(proposalData.doc_updates),
                ...readDocUpdateList(state.doc_updates),
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
        // Anything else that blew up here (EPERM on proposal.md, EBUSY on a
        // directory listing, ...) is a read failure, not evidence of a deletion.
        return { kind: 'unreadable', reason: describeReadFailure(error) };
    }
}
const FEATURE_DOC_STATUS_VALUES = ['active', 'deprecated', 'removed'];
/* ── pure helpers, duplicated verbatim in src/services/FeatureCatalog.ts ── */
/**
 * The one-liner for a row: the section's first sentence, truncated at 120
 * characters.
 *
 * "First sentence" means the first sentence of the first PROSE paragraph --
 * the heading, the declaration comment, the traceability comment, and any
 * fenced block are not prose and describing a feature as "<!-- ospec:feature"
 * would make the catalogue useless. Truncation cuts on a word boundary when
 * one is available, because a row ending mid-word reads as corruption.
 */
function featureSummarySentence(sectionText, limit = 120) {
    const lines = String(sectionText ?? '').replace(/\r\n?/g, '\n').split('\n');
    const prose = [];
    let fenced = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(```|~~~)/.test(trimmed)) {
            fenced = !fenced;
            continue;
        }
        if (fenced)
            continue;
        if (!trimmed) {
            if (prose.length > 0)
                break;
            continue;
        }
        if (trimmed.startsWith('#'))
            continue;
        if (trimmed.startsWith('<!--'))
            continue;
        if (/^([-*+]|\d+\.)\s/.test(trimmed))
            continue;
        if (trimmed.startsWith('>'))
            continue;
        if (trimmed.startsWith('|'))
            continue;
        prose.push(trimmed);
    }
    const paragraph = prose.join(' ').replace(/\s+/g, ' ').trim();
    if (!paragraph)
        return '';
    // A sentence ends at `.`/`!`/`?` followed by whitespace or end of text. The
    // lookahead keeps `v1.2` and `e.g. x` from ending a sentence mid-token.
    const match = paragraph.match(/^.*?[.!?](?=\s|$)/);
    const sentence = (match ? match[0] : paragraph).trim();
    if (sentence.length <= limit)
        return sentence;
    const cut = sentence.slice(0, limit);
    const boundary = cut.lastIndexOf(' ');
    return `${(boundary > limit / 2 ? cut.slice(0, boundary) : cut).trimEnd()}...`;
}
/**
 * Reads `<!-- ospec:status <state> -->` from a section. An unknown or
 * absent state is `active`: a catalogue that refuses to render because someone
 * typed `depricated` is worse than one that renders the row and lets the
 * author see it is still listed as active.
 */
function featureStatusFromSection(sectionText) {
    const lines = String(sectionText ?? '').replace(/\r\n?/g, '\n').split('\n');
    for (const line of lines) {
        const match = line.trim().match(/^<!--\s*ospec:status\s+([a-z-]+)\s*-->$/);
        if (!match)
            continue;
        const value = match[1];
        if (FEATURE_DOC_STATUS_VALUES.includes(value))
            return value;
    }
    return 'active';
}
/** GitHub-style heading anchor, for the href half of the section link. */
function headingAnchor(heading) {
    return String(heading ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\- ]+/g, '')
        .replace(/\s+/g, '-');
}
/** A `|` inside a cell would end it; a newline would end the row. */
function escapeTableCell(value) {
    return String(value ?? '')
        .replace(/\r\n?/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\|/g, '\\|')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Posix-relative link from `docs/project/` to a repo-relative target. Written
 * out rather than delegated to `path.relative` so the twin in build-index.ts
 * produces identical text on Windows without a separator fixup.
 */
function catalogRelativeLink(fromDir, targetRepoPath) {
    const from = String(fromDir ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
    const to = String(targetRepoPath ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
    let shared = 0;
    while (shared < from.length && shared < to.length && from[shared] === to[shared])
        shared += 1;
    const up = new Array(from.length - shared).fill('..');
    const down = to.slice(shared);
    return [...up, ...down].join('/') || '.';
}
function featureCatalogCopy(documentLanguage) {
    if (documentLanguage === 'zh-CN') {
        return {
            title: '项目功能目录',
            guidance: '由 OSpec 从文档中的 `<!-- ospec:feature -->` 声明生成，请勿手工编辑。只读某一个功能的章节：`ospec docs locate --feature <slug>`。',
            empty: '尚未声明任何功能。在功能文档的章节标题下写 `<!-- ospec:feature <slug> -->` 即可登记。',
            columnFeature: '功能',
            columnSummary: '一句话说明',
            columnSection: '章节',
            columnStatus: '状态',
            columnLastChange: '最后变更',
            noSummary: '（该章节没有正文描述）',
            noLastChange: '—',
        };
    }
    if (documentLanguage === 'ja-JP') {
        return {
            title: 'プロジェクト機能カタログ',
            guidance: '文書内の `<!-- ospec:feature -->` 宣言から OSpec が生成します。手で編集しないでください。1 つの機能の節だけを読むには `ospec docs locate --feature <slug>` を使用します。',
            empty: 'まだ宣言された機能はありません。機能文書の見出しの下に `<!-- ospec:feature <slug> -->` を書くと登録されます。',
            columnFeature: '機能',
            columnSummary: '一文の説明',
            columnSection: '節',
            columnStatus: '状態',
            columnLastChange: '最終変更',
            noSummary: '(この節に本文の説明がありません)',
            noLastChange: '—',
        };
    }
    if (documentLanguage === 'ar') {
        return {
            title: 'فهرس ميزات المشروع',
            guidance: 'يُنشئه OSpec من إعلانات `<!-- ospec:feature -->` في وثائق المشروع؛ لا تحرره يدوياً. لقراءة قسم ميزة واحدة فقط استخدم `ospec docs locate --feature <slug>`.',
            empty: 'لا توجد ميزات معلنة بعد. اكتب `<!-- ospec:feature <slug> -->` تحت عنوان القسم لتسجيلها.',
            columnFeature: 'الميزة',
            columnSummary: 'وصف بجملة واحدة',
            columnSection: 'القسم',
            columnStatus: 'الحالة',
            columnLastChange: 'آخر تغيير',
            noSummary: '(لا يوجد نص وصفي في هذا القسم)',
            noLastChange: '—',
        };
    }
    return {
        title: 'Project Feature Catalog',
        guidance: 'Generated by OSpec from the `<!-- ospec:feature -->` declarations in the project documents; do not edit by hand. To read one feature\'s section instead of this file, run `ospec docs locate --feature <slug>`.',
        empty: 'No features declared yet. Write `<!-- ospec:feature <slug> -->` under a section heading to register one.',
        columnFeature: 'Feature',
        columnSummary: 'One line',
        columnSection: 'Section',
        columnStatus: 'Status',
        columnLastChange: 'Last change',
        noSummary: '(no prose description in this section)',
        noLastChange: '—',
    };
}
/**
 * THE row format. One line per feature: slug, one sentence, `doc#section`
 * link, status, last-change archive link.
 *
 * `archiveLinks` maps an archive NAME to its repo-relative archive directory,
 * so a row can link the archive that last touched the feature. A name with no
 * entry falls back to the conventional `changes/archived/<name>` -- the link
 * may dangle, and a dangling link to the right place beats no link at all.
 */
function renderFeatureCatalog(rows, copy, archiveLinks = {}) {
    const catalogDir = 'docs/project';
    const lines = [
        '---',
        'name: project-feature-catalog',
        `title: ${copy.title}`,
        'tags: [project, features, catalog, ai-index]',
        'generated: true',
        '---',
        '',
        `# ${copy.title}`,
        '',
        `> ${copy.guidance}`,
        '',
    ];
    if (rows.length === 0) {
        lines.push(copy.empty, '');
        return `${lines.join('\n').trimEnd()}\n`;
    }
    lines.push(`| ${copy.columnFeature} | ${copy.columnSummary} | ${copy.columnSection} | ${copy.columnStatus} | ${copy.columnLastChange} |`, '| --- | --- | --- | --- | --- |');
    for (const row of rows) {
        const sectionHref = `${catalogRelativeLink(catalogDir, row.file)}#${headingAnchor(row.heading)}`;
        const section = `[${escapeTableCell(row.location)}](${sectionHref})`;
        const summary = escapeTableCell(row.summary) || copy.noSummary;
        const lastChange = row.lastChange
            ? `[${escapeTableCell(row.lastChange)}](${catalogRelativeLink(catalogDir, archiveLinks[row.lastChange] || `changes/archived/${row.lastChange}`)})`
            : copy.noLastChange;
        lines.push(`| \`${escapeTableCell(row.slug)}\` | ${summary} | ${section} | ${row.status} | ${lastChange} |`);
    }
    lines.push('');
    return `${lines.join('\n').trimEnd()}\n`;
}
/**
 * Build one row from a feature entry and the text of its section.
 *
 * `sectionText` is the slice `body.slice(entry.start, entry.end)` in the
 * contract's coordinate space (4). Passing the raw file instead gives the
 * wrong text on any CRLF checkout.
 */
function buildFeatureCatalogRow(entry, sectionText) {
    return {
        slug: entry.slug,
        heading: entry.heading,
        file: entry.file,
        location: `${entry.file}#${entry.heading}`,
        summary: featureSummarySentence(sectionText),
        status: featureStatusFromSection(sectionText),
        lastChange: typeof entry.last_change === 'string' ? entry.last_change : '',
    };
}
/**
 * 7.4: write `docs/project/feature-catalog.md`. The package copy is
 * `IndexBuilder.writeFeatureCatalog`; the two must agree byte for byte, which
 * `tests/services/archive-knowledge-durability.test.mjs` checks by building the
 * same fixture with each and comparing the generated file.
 */
async function writeFeatureCatalog(rootDir, layout, index) {
    const docsProjectRoot = resolveManagedPath(rootDir, 'docs/project', layout);
    const featureCount = Object.keys(index?.feature_docs || {}).length;
    if (!(await exists(docsProjectRoot)) && featureCount === 0)
        return;
    await fsp.mkdir(docsProjectRoot, { recursive: true });
    const targetPath = path.join(docsProjectRoot, 'feature-catalog.md');
    const config = await readSkillConfig(rootDir);
    const content = await renderCatalogFromIndex(rootDir, config, index);
    const previous = await exists(targetPath) ? await fsp.readFile(targetPath, 'utf8') : null;
    if (previous !== content)
        await fsp.writeFile(targetPath, content, 'utf8');
}
/**
 * Read every declared feature's document once, slice each section, render.
 * Not text-identical to the package copy -- that one strips frontmatter with
 * `parseFrontmatterDocument` and this one with the hand-rolled `parseFrontmatter` --
 * so the guard on this pair is behavioural, not textual.
 */
async function renderCatalogFromIndex(rootDir, config, index) {
    const featureDocs = index?.feature_docs && typeof index.feature_docs === 'object'
        ? index.feature_docs
        : {};
    const documentCache = new Map();
    const rows = [];
    for (const slug of Object.keys(featureDocs).sort((left, right) => compareCodepoints(left, right))) {
        const entry = featureDocs[slug];
        if (!entry || typeof entry !== 'object')
            continue;
        const file = String(entry.file || '');
        if (!documentCache.has(file)) {
            const absolute = path.join(rootDir, ...file.split('/'));
            documentCache.set(file, await fsp.readFile(absolute, 'utf8').catch(() => null));
        }
        const raw = documentCache.get(file);
        const body = raw ? parseFrontmatter(raw).body : '';
        const start = Number(entry.start);
        const end = Number(entry.end);
        const sectionText = Number.isInteger(start) && Number.isInteger(end)
            && start >= 0 && end >= start && end <= body.length
            ? body.slice(start, end)
            : '';
        rows.push(buildFeatureCatalogRow(entry, sectionText));
    }
    const archiveLinks = {};
    for (const change of Array.isArray(index?.archived_changes) ? index.archived_changes : []) {
        const name = String(change?.feature || '');
        const archive = String(change?.archive || '');
        if (name && archive)
            archiveLinks[name] = archive;
    }
    return renderFeatureCatalog(rows, featureCatalogCopy(config?.documentLanguage), archiveLinks);
}
/**
 * 7.4: `feature-index.md` stops being generated and is frozen once into a
 * pure link list. `historical: true` is the latch that makes "one-off" true on
 * the second build too. See `IndexBuilder.freezeLegacyFeatureIndex`.
 */
async function freezeLegacyFeatureIndex(rootDir, layout, archivedChanges) {
    const docsProjectRoot = resolveManagedPath(rootDir, 'docs/project', layout);
    const targetPath = path.join(docsProjectRoot, 'feature-index.md');
    if (!(await exists(targetPath)))
        return;
    const existing = await fsp.readFile(targetPath, 'utf8');
    if (parseFrontmatter(existing).data?.historical === true)
        return;
    const config = await readSkillConfig(rootDir);
    const copy = getFeatureIndexCopy(config?.documentLanguage);
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
    if (archivedChanges.length === 0)
        lines.push(copy.empty, '');
    for (const change of archivedChanges) {
        const label = change.disposition === 'forced'
            ? `${change.feature} — FORCED/INCOMPLETE`
            : change.feature;
        const archiveLink = normalizePath(path.relative(docsProjectRoot, path.join(rootDir, change.archive)));
        lines.push(`- [${label}](${archiveLink})`);
    }
    lines.push('');
    const content = `${lines.join('\n').trimEnd()}\n`;
    if (existing !== content)
        await fsp.writeFile(targetPath, content, 'utf8');
}
function getFeatureIndexCopy(documentLanguage) {
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
async function walk(currentDir, onSkillFile, skipDirs = SKIP_DIRS) {
    const entries = (await fsp.readdir(currentDir, { withFileTypes: true })).sort((left, right) => compareCodepoints(left.name, right.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) {
                await walk(fullPath, onSkillFile, skipDirs);
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
    return Array.from(affected).sort((left, right) => compareCodepoints(left, right));
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
        .sort((left, right) => compareCodepoints(left, right));
}
async function loadHookConfig(rootDir) {
    const config = (await readSkillConfig(rootDir)) || {};
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
    return activated.sort((left, right) => compareCodepoints(left, right));
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
    const hasFrontmatter = /^\ufeff?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
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
    const checklistStructureValid = hasChecklistItem(parsed?.body ?? '');
    const uncheckedItems = listUncheckedChecklistItems(parsed?.body ?? '');
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
    // M-misc6: see the copy of `contractVersionAtLeast` above.
    const requiresSerialReason = contractVersionAtLeast(data.contract_version, 1, 8, 6);
    const requiresScopeReason = contractVersionAtLeast(data.contract_version, 1, 8, 5);
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
    const hasFrontmatter = /^\ufeff?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
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
    const checklistStructureValid = hasChecklistItem(parsed?.body ?? '');
    const uncheckedItems = listUncheckedChecklistItems(parsed?.body ?? '');
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
    const hasFrontmatter = /^\ufeff?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
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
    const checklistStructureValid = hasChecklistItem(parsed?.body ?? '');
    const uncheckedItems = listUncheckedChecklistItems(parsed?.body ?? '');
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
    // A leading BOM is invisible to the author but would push `---` off column
    // zero and silently hide the whole frontmatter block, so it is dropped with
    // the line endings.
    return stripBom(String(content || '')).replace(/\r\n?/g, '\n');
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
/*
 * 7.1: a verbatim copy of the ospec:feature parser in
 * `src/services/SkillParser.ts`, for the same reason as the checklist scanner
 * above -- this file is built-ins-only because `ospec update` copies it out of
 * dist into the user's `.ospec/tools/build-index-auto.cjs`, where no relative
 * require back into the package resolves.
 *
 * Held in step by `tests/services/p7-feature-declarations.test.mjs` (text
 * identity of every function below) and by
 * `tests/tools/p7-index-builder-divergence.test.mjs` (behavioural identity of
 * the two whole builders). Change one copy and both fail until you change the
 * other.
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
    const fenced = fencedLineFlags(normalized);
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
    console.log(`[ospec] documents: ${Object.keys(index.documents || {}).length}, archived changes: ${(index.archived_changes || []).length}`);
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
    const config = (await readSkillConfig(rootDir)) || {};
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
const buildWarnings = [];
function recordBuildWarning(targetPath, reason) {
    const normalized = normalizePath(targetPath);
    if (buildWarnings.some(warning => warning.path === normalized && warning.reason === reason))
        return;
    buildWarnings.push({ path: normalized, reason });
}
function printBuildWarnings() {
    for (const warning of buildWarnings) {
        console.log(`[ospec] warning: ${warning.path}: ${warning.reason}`);
    }
}
function stripBom(content) {
    return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}
// Kept byte-identical to `createDamagedConfigError` in
// `src/services/IndexBuilder.ts`. This file is deliberately dependency-free (it
// is the standalone pre-commit tool), so the two copies cannot share a module;
// `tests/tools/p0-10-*` asserts they stay in step.
function createDamagedConfigError(configPath, reason) {
    const error = new Error([
        `.skillrc is damaged and cannot be parsed: ${reason}`,
        `  file: ${configPath}`,
        '  recover with one of:',
        '    1. git checkout -- .skillrc            (restore the committed copy)',
        '    2. edit .skillrc and remove the merge-conflict markers or leading BOM',
        '    3. if .skillrc is a directory or another non-file, remove it and',
        '       restore the file in its place',
        '  then re-run this command. Rebuilding the index does not depend on a',
        '  readable SKILL.index.json, so "ospec index build" self-heals a damaged',
        '  index as soon as .skillrc parses again.',
    ].join('\n'));
    error.ospecDamagedConfig = true;
    return error;
}
// FIX-G1: a *missing* `projectLayout` on a project that is physically nested is
// a different failure from a corrupted one, and the recovery steps for a
// corrupted file ("remove the merge-conflict markers") are useless here -- the
// file parses, it just does not say where this project keeps its documents.
// Same `ospecDamagedConfig` marker so `runHookCheck` keeps swallowing it rather
// than blocking every commit until the file is repaired.
//
// Kept byte-identical to `createContradictoryLayoutError` in
// `src/utils/ProjectLayout.ts`.
function createContradictoryLayoutError(configPath, reason) {
    const error = new Error([
        `.skillrc does not describe this project's layout: ${reason}`,
        `  file: ${configPath}`,
        '  recover with one of:',
        '    1. git checkout -- .skillrc            (restore the committed copy)',
        '    2. add "projectLayout": "nested" to .skillrc, if this project keeps',
        '       its documents under .ospec/ (that is what is on disk)',
        '    3. add "projectLayout": "classic" to .skillrc, if the .ospec/ tree is',
        '       stale and the project root is the real one',
        '  then re-run this command. Defaulting to "classic" is refused here',
        '  because it would write a second, divergent document tree into the',
        '  project root next to the .ospec/ one.',
    ].join('\n'));
    error.ospecDamagedConfig = true;
    return error;
}
function isDamagedConfigError(error) {
    return Boolean(error)
        && typeof error === 'object'
        && error.ospecDamagedConfig === true;
}
// F29: the two fields a rebuild cannot recover by looking around. Absent is
// fine (both have a documented default); present-but-unrecognized is not.
const VALID_PROJECT_LAYOUTS = ['nested', 'classic'];
const VALID_DOCUMENT_LANGUAGES = ['en-US', 'zh-CN', 'ja-JP', 'ar'];
// F23: a `.skillrc` that parses but is not a JSON object is damage, not a
// config. `getProjectLayout` in `src/utils/ProjectLayout.ts` accepts a bare
// `ProjectLayout` string as well as a config object, so a `.skillrc` whose
// entire content is the JSON string `"nested"` was read by `IndexBuilder.ts` as
// *the layout* (nested) and here as a config with no `projectLayout` at all
// (classic). Same file, same damage, two different document trees indexed --
// exactly the silent wrong-layout data loss P0-10 exists to close. The parse
// boundary is the only place that can tell a config from a layout, so the shape
// is enforced here in both implementations.
//
// F29: guarding the CONTAINER was not enough. `{"projectLayout": null}`,
// `{"projectLayout": 123}`, `{"projectLayout": ["nested"]}` and a one-character
// typo `{"projectLayout": "nsted"}` are all valid objects, so they walked past
// the F23 gate -- and `config?.projectLayout !== 'nested'` here and
// `normalizeProjectLayout(input) || 'classic'` in `IndexBuilder.ts` then both
// treated "damaged" as "absent" and silently flipped a NESTED project to
// classic. Exit 0, no warning, and the two entry points wrote different
// classic-side trees (4 new files here vs 12 there) next to the real nested
// one. `documentLanguage` has the same property one level down: an
// unrecognized value silently rewrites every generated document on a
// zh-CN / ja-JP / ar project into English. A field that decides where data is
// written may not be guessed at, so an unrecognized value is damage and takes
// the identical fail-loud path.
//
// Kept byte-identical to `describeNonObjectConfig` in
// `src/services/IndexBuilder.ts`.
function describeNonObjectConfig(value) {
    if (value === null)
        return 'not a JSON object (got null)';
    if (Array.isArray(value))
        return 'not a JSON object (got an array)';
    if (typeof value !== 'object')
        return `not a JSON object (got a ${typeof value})`;
    return describeUnrecognizedConfigField(value, 'projectLayout', VALID_PROJECT_LAYOUTS)
        || describeUnrecognizedConfigField(value, 'documentLanguage', VALID_DOCUMENT_LANGUAGES);
}
// FIX-G1: the first on-disk marker proving this project physically keeps its
// managed documents under `.ospec/`, or null. Named rather than boolean so the
// error can quote the evidence.
//
// The list is the mirror image of `hasClassicManagedMarkers` above -- the paths
// that only ever exist because an ospec-managed NESTED tree was written.
// `.ospec/tools`, `.ospec/plugins` and `.ospec/cache` are deliberately absent:
// `FILE_NAMES.BUILD_INDEX_SCRIPT` is `.ospec/tools/build-index-auto.cjs` and
// the default plugin `workspace_root` is `.ospec/plugins/<name>` in BOTH
// layouts, so either one would report a classic project as nested.
//
// Kept byte-identical to `findNestedManagedMarker` in
// `src/utils/ProjectLayout.ts`.
function findNestedManagedMarker(rootDir) {
    for (const relativePath of ['changes', 'for-ai', 'docs/project', 'knowledge', 'SKILL.md', 'SKILL.index.json']) {
        if (fs.existsSync(path.join(rootDir, '.ospec', ...relativePath.split('/')))) {
            return `.ospec/${relativePath}`;
        }
    }
    return null;
}
// FIX-G1: `projectLayout` ABSENT is not the same as `projectLayout` absent AND
// a populated `.ospec/` tree sitting right there.
//
// F29 closed the corrupted-VALUE route and wrote "absent is fine (both have a
// documented default)" into its own comment. That was wrong in exactly one
// situation, and it is the situation the whole guard exists for: a `.skillrc`
// that merely LOSES the layout line -- `{}`, or a config that kept
// `documentLanguage` and dropped `projectLayout` -- still silently flipped a
// nested project to classic, exit 0, no warning, and wrote 4 root-level paths
// here (12 through `ospec index build`) next to the real `.ospec` tree. That is
// the identical damage F29's own comment describes, one level out.
//
// From the config alone "absent" is genuinely ambiguous -- a real classic
// project legitimately has no `projectLayout`. From the FILESYSTEM it is not
// ambiguous at all, so the layout is detected from disk and the CONTRADICTION
// is what fails: absent + no nested tree keeps the documented classic default
// (nothing changes for real classic projects, including pre-`projectLayout`
// legacy ones), absent + a nested tree refuses.
//
// An EXPLICIT `"projectLayout": "classic"` is deliberately still honoured even
// with a nested tree present: that is a user statement, not a guess, and it is
// the only way to walk back a half-finished `ospec layout migrate`.
//
// Kept byte-identical to `describeAbsentProjectLayout` in
// `src/utils/ProjectLayout.ts`.
function describeAbsentProjectLayout(config, rootDir) {
    if (!config || typeof config !== 'object' || Array.isArray(config))
        return null;
    const record = config;
    const declared = Object.prototype.hasOwnProperty.call(record, 'projectLayout')
        ? record.projectLayout
        : undefined;
    if (declared !== undefined)
        return null;
    const marker = findNestedManagedMarker(rootDir);
    if (!marker)
        return null;
    return `projectLayout is absent, but ${marker} exists, so this project physically keeps its documents under .ospec/ and defaulting to "classic" would write a second document tree into the project root`;
}
// FIX-G1: the single gate every `.skillrc` read passes through before the
// parsed value is allowed to decide where anything is written. It throws, and
// the throw is the point -- the previous shape of this bug was always some
// caller turning a failed/degraded config read into `null` or `{}` and then
// carrying on to write files.
//
// Kept byte-identical to `assertProjectConfigUsable` in
// `src/utils/ProjectLayout.ts`.
function assertProjectConfigUsable(rootDir, configPath, value, onDamage) {
    const shapeReason = describeNonObjectConfig(value);
    if (shapeReason) {
        onDamage?.(shapeReason);
        throw createDamagedConfigError(configPath, shapeReason);
    }
    const layoutReason = describeAbsentProjectLayout(value, rootDir);
    if (layoutReason) {
        onDamage?.(layoutReason);
        throw createContradictoryLayoutError(configPath, layoutReason);
    }
    return value;
}
// Kept byte-identical to `describeUnrecognizedConfigField` in
// `src/utils/ProjectLayout.ts`.
function describeUnrecognizedConfigField(config, field, allowed) {
    if (!Object.prototype.hasOwnProperty.call(config, field))
        return null;
    const value = config[field];
    if (value === undefined)
        return null;
    if (typeof value === 'string' && allowed.includes(value))
        return null;
    const shown = typeof value === 'string'
        ? JSON.stringify(value)
        : value === null
            ? 'null'
            : Array.isArray(value)
                ? 'an array'
                : typeof value === 'object'
                    ? 'an object'
                    : `a ${typeof value}`;
    return `${field} is ${shown}, which is not one of ${allowed.map(option => JSON.stringify(option)).join(', ')}`;
}
async function readJsonOutcome(targetPath) {
    let raw;
    try {
        raw = await fsp.readFile(targetPath, 'utf8');
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
    const cleaned = stripBom(raw);
    try {
        return { status: 'ok', value: JSON.parse(cleaned), hadBom: cleaned !== raw };
    }
    catch (error) {
        return { status: 'damaged', reason: `invalid JSON (${error?.message || 'parse failed'})` };
    }
}
async function readJsonIfExists(targetPath, options = {}) {
    const outcome = await readJsonOutcome(targetPath);
    if (outcome.status === 'ok')
        return outcome.value;
    if (outcome.status === 'damaged' && options.warn !== false) {
        recordBuildWarning(targetPath, outcome.reason);
    }
    return null;
}
// `.skillrc` decides the project layout, so a damaged one cannot be guessed
// around: the index would be written against the wrong tree. It fails loudly
// with recovery steps instead. `runHookCheck` catches that error and skips its
// checks rather than blocking every commit until the file is repaired.
async function readSkillConfig(rootDir) {
    const configPath = path.join(rootDir, '.skillrc');
    const outcome = await readJsonOutcome(configPath);
    if (outcome.status === 'absent')
        return null;
    if (outcome.status === 'damaged') {
        recordBuildWarning(configPath, outcome.reason);
        throw createDamagedConfigError(configPath, outcome.reason);
    }
    // F23 (container shape), F29 (layout/language field values) and FIX-G1 (a
    // projectLayout that is missing on a physically nested project) are one gate
    // now, in one place, so no entry point can enforce a subset of them.
    return assertProjectConfigUsable(rootDir, configPath, outcome.value, reason => recordBuildWarning(configPath, reason));
}
main();
