"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectAssetService = exports.ProjectAssetService = void 0;
exports.stampBuildIndexScript = stampBuildIndexScript;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const ProjectAssetRegistry_1 = require("./ProjectAssetRegistry");
const ProjectLayout_1 = require("../utils/ProjectLayout");
/** 7.10a: the one asset whose sync is worth a fast path. */
const BUILD_INDEX_SCRIPT_ASSET_ID = 'build-index-script';
const BUILD_INDEX_STAMP_PREFIX = '// ospec:build-index-auto v';
/** Enough for a shebang plus the stamp line, and nothing else. */
const BUILD_INDEX_STAMP_PROBE_BYTES = 256;
/**
 * Put the stamp on line 2, under the shebang. Exported so the test that proves
 * the stamped copy still runs does not have to reconstruct the layout.
 */
function stampBuildIndexScript(sourceContent, stamp) {
    const normalized = String(sourceContent ?? '');
    if (!normalized.startsWith('#!'))
        return `${stamp}\n${normalized}`;
    const breakAt = normalized.indexOf('\n');
    if (breakAt < 0)
        return `${normalized}\n${stamp}\n`;
    return `${normalized.slice(0, breakAt + 1)}${stamp}\n${normalized.slice(breakAt + 1)}`;
}
class ProjectAssetService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    getDirectCopyAssets() {
        return ProjectAssetRegistry_1.DIRECT_COPY_PROJECT_ASSETS;
    }
    getDirectCopyTargetPaths(projectLayout = 'classic') {
        return this.getDirectCopyAssets().map(asset => (0, ProjectLayout_1.toManagedRelativePath)(asset.targetRelativePath, projectLayout));
    }
    getAssetPlan(documentLanguage, projectLayout = 'classic') {
        return {
            directCopyFiles: this.getDirectCopyTargetPaths(projectLayout),
            templateGeneratedFiles: [],
            runtimeGeneratedFiles: [],
            localizedCopySources: this.getDirectCopyAssets().map(asset => ({
                targetRelativePath: (0, ProjectLayout_1.toManagedRelativePath)(asset.targetRelativePath, projectLayout),
                sourceRelativePath: this.resolveStaticSourceHint(asset, documentLanguage),
            })),
        };
    }
    async installDirectCopyAssets(rootDir, documentLanguage, projectLayout = 'classic') {
        const created = [];
        const skipped = [];
        for (const asset of this.getDirectCopyAssets()) {
            const targetRelativePath = (0, ProjectLayout_1.toManagedRelativePath)(asset.targetRelativePath, projectLayout);
            const targetPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, asset.targetRelativePath, projectLayout);
            if (await this.fileService.exists(targetPath)) {
                skipped.push(targetRelativePath);
                continue;
            }
            // 7.10a: install the stamp with the file, not on the next sync. Both run
            // back to back inside `rebuildIndex`, so an unstamped install would make
            // a fresh project write the same 104 KB twice.
            if (asset.id === BUILD_INDEX_SCRIPT_ASSET_ID) {
                await this.syncStampedBuildIndexScript(targetPath, asset, documentLanguage);
                created.push(targetRelativePath);
                continue;
            }
            const sourceRelativePath = await this.resolveSourceRelativePath(asset, documentLanguage);
            const sourcePath = path_1.default.join(this.getPackageRoot(), ...sourceRelativePath.split('/'));
            await this.fileService.copy(sourcePath, targetPath);
            created.push(targetRelativePath);
        }
        return { created, skipped };
    }
    async syncDirectCopyAssets(rootDir, documentLanguage, options = {}) {
        const created = [];
        const refreshed = [];
        const skipped = [];
        const projectLayout = options.projectLayout || 'classic';
        const targetFilter = Array.isArray(options.targetRelativePaths)
            ? new Set(this.normalizePaths([
                ...options.targetRelativePaths,
                ...options.targetRelativePaths.map(targetRelativePath => (0, ProjectLayout_1.toManagedRelativePath)(targetRelativePath, projectLayout)),
            ]))
            : null;
        for (const asset of this.getDirectCopyAssets()) {
            const targetRelativePath = (0, ProjectLayout_1.toManagedRelativePath)(asset.targetRelativePath, projectLayout);
            if (targetFilter && !targetFilter.has(targetRelativePath)) {
                continue;
            }
            const targetPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, asset.targetRelativePath, projectLayout);
            // 7.10a: the build-index script is ~104 KB and this sync runs on every
            // `rebuildIndex`, which means every finalize and every archive. The
            // generic path below reads BOTH copies in full just to discover they are
            // identical -- a fifth of a megabyte of I/O per archive to write nothing.
            // The stamped copy carries the CLI version on its second line, so a
            // 256-byte read answers the same question.
            if (asset.id === BUILD_INDEX_SCRIPT_ASSET_ID) {
                const stampOutcome = await this.syncStampedBuildIndexScript(targetPath, asset, documentLanguage);
                if (stampOutcome === 'skipped')
                    skipped.push(targetRelativePath);
                else if (stampOutcome === 'created')
                    created.push(targetRelativePath);
                else
                    refreshed.push(targetRelativePath);
                continue;
            }
            const sourceRelativePath = await this.resolveSourceRelativePath(asset, documentLanguage);
            const sourcePath = path_1.default.join(this.getPackageRoot(), ...sourceRelativePath.split('/'));
            const sourceContent = await this.fileService.readFile(sourcePath);
            if (!(await this.fileService.exists(targetPath))) {
                await this.fileService.writeFile(targetPath, sourceContent);
                created.push(targetRelativePath);
                continue;
            }
            const targetContent = await this.fileService.readFile(targetPath);
            if (targetContent === sourceContent) {
                skipped.push(targetRelativePath);
                continue;
            }
            await this.fileService.writeFile(targetPath, sourceContent);
            refreshed.push(targetRelativePath);
        }
        return { created, refreshed, skipped };
    }
    async installGitHooks(rootDir, hookConfig) {
        const installed = [];
        const skipped = [];
        const repaired = [];
        const gitHooksDir = path_1.default.join(rootDir, '.git', 'hooks');
        if (!(await this.fileService.exists(gitHooksDir))) {
            return { installed, skipped, repaired };
        }
        const hooks = [
            {
                enabled: hookConfig?.['pre-commit'] !== false,
                sourceRelativePath: '.ospec/templates/hooks/pre-commit',
                targetRelativePath: '.git/hooks/pre-commit',
            },
            {
                enabled: hookConfig?.['post-merge'] !== false,
                sourceRelativePath: '.ospec/templates/hooks/post-merge',
                targetRelativePath: '.git/hooks/post-merge',
            },
        ];
        for (const hook of hooks) {
            if (!hook.enabled) {
                continue;
            }
            const sourcePath = path_1.default.join(rootDir, ...hook.sourceRelativePath.split('/'));
            const targetPath = path_1.default.join(rootDir, ...hook.targetRelativePath.split('/'));
            if (!(await this.fileService.exists(sourcePath))) {
                skipped.push(hook.targetRelativePath);
                continue;
            }
            const sourceContent = await this.fileService.readFile(sourcePath);
            const targetExists = await this.fileService.exists(targetPath);
            if (targetExists) {
                const targetContent = await this.fileService.readFile(targetPath);
                if (targetContent === sourceContent) {
                    // Content is already current, but installs written before the mode
                    // fix left the hook non-executable, which git silently ignores on
                    // POSIX. Repair the bit instead of skipping outright.
                    if (await this.fileService.ensureExecutable(targetPath)) {
                        repaired.push(hook.targetRelativePath);
                    }
                    else {
                        skipped.push(hook.targetRelativePath);
                    }
                    continue;
                }
                if (!this.isOSpecManagedHook(targetContent)) {
                    skipped.push(hook.targetRelativePath);
                    continue;
                }
            }
            // Git only runs hooks that carry the execute bit on POSIX.
            await this.fileService.writeExecutableFile(targetPath, sourceContent);
            installed.push(hook.targetRelativePath);
        }
        return { installed, skipped, repaired };
    }
    async writeAssetManifest(rootDir, options) {
        const projectLayout = options.projectLayout || 'classic';
        const copyEntries = await Promise.all(this.getDirectCopyAssets().map(async (asset) => {
            const targetRelativePath = (0, ProjectLayout_1.toManagedRelativePath)(asset.targetRelativePath, projectLayout);
            const targetPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, asset.targetRelativePath, projectLayout);
            return {
                id: asset.id,
                strategy: 'direct_copy',
                category: asset.category,
                description: asset.description,
                targetRelativePath,
                sourceRelativePath: await this.resolveSourceRelativePath(asset, options.documentLanguage),
                overwritePolicy: asset.overwritePolicy,
                exists: await this.fileService.exists(targetPath),
            };
        }));
        const templateEntries = await Promise.all(this.normalizePaths(options.templateGeneratedPaths).map(async (targetRelativePath) => ({
            id: `generated:${targetRelativePath}`,
            strategy: 'template_generated',
            category: 'templates',
            description: 'Generated from OSpec template builders during project initialization.',
            targetRelativePath: (0, ProjectLayout_1.toManagedRelativePath)(targetRelativePath, projectLayout),
            sourceRelativePath: null,
            overwritePolicy: 'if_missing',
            exists: await this.fileService.exists((0, ProjectLayout_1.resolveManagedPath)(rootDir, targetRelativePath, projectLayout)),
        })));
        const runtimeEntries = await Promise.all(this.normalizePaths(options.runtimeGeneratedPaths).map(async (targetRelativePath) => ({
            id: `runtime:${targetRelativePath}`,
            strategy: 'runtime_generated',
            category: 'runtime',
            description: 'Generated by OSpec at runtime or during index/config initialization.',
            targetRelativePath: (0, ProjectLayout_1.toManagedRelativePath)(targetRelativePath, projectLayout),
            sourceRelativePath: null,
            overwritePolicy: 'rebuild',
            exists: (0, ProjectLayout_1.toManagedRelativePath)(targetRelativePath, projectLayout) === '.ospec/asset-sources.json'
                ? true
                : await this.fileService.exists((0, ProjectLayout_1.resolveManagedPath)(rootDir, targetRelativePath, projectLayout)),
        })));
        const assets = [...copyEntries, ...templateEntries, ...runtimeEntries];
        const manifestAsset = assets.find(asset => asset.targetRelativePath === '.ospec/asset-sources.json');
        if (manifestAsset) {
            manifestAsset.exists = true;
        }
        const manifest = {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            ospecCliVersion: options.ospecCliVersion || (await this.getPackageVersion()) || undefined,
            projectLayout,
            documentLanguage: options.documentLanguage || 'en-US',
            assets,
            summary: {
                directCopy: copyEntries.length,
                templateGenerated: templateEntries.length,
                runtimeGenerated: runtimeEntries.length,
            },
        };
        await this.fileService.writeJSON(path_1.default.join(rootDir, '.ospec', 'asset-sources.json'), manifest);
    }
    async resolveSourceRelativePath(asset, documentLanguage) {
        const candidates = [];
        if (documentLanguage && asset.localizedSources?.[documentLanguage]) {
            candidates.push(asset.localizedSources[documentLanguage]);
        }
        if (asset.localizedSources?.['en-US']) {
            candidates.push(asset.localizedSources['en-US']);
        }
        if (asset.localizedSources?.['zh-CN']) {
            candidates.push(asset.localizedSources['zh-CN']);
        }
        if (asset.sourceRelativePaths) {
            candidates.push(...asset.sourceRelativePaths);
        }
        for (const candidate of candidates) {
            const absolutePath = path_1.default.join(this.getPackageRoot(), ...candidate.split('/'));
            if (await this.fileService.exists(absolutePath)) {
                return candidate;
            }
        }
        throw new Error(`Unable to resolve packaged project asset: ${asset.id}`);
    }
    resolveStaticSourceHint(asset, documentLanguage) {
        if (documentLanguage && asset.localizedSources?.[documentLanguage]) {
            return asset.localizedSources[documentLanguage];
        }
        if (asset.localizedSources?.['en-US']) {
            return asset.localizedSources['en-US'];
        }
        if (asset.localizedSources?.['zh-CN']) {
            return asset.localizedSources['zh-CN'];
        }
        if (asset.sourceRelativePaths?.[0]) {
            return asset.sourceRelativePaths[0];
        }
        return '';
    }
    normalizePaths(paths) {
        return Array.from(new Set(paths
            .map(item => item.replace(/\\/g, '/'))
            .filter(Boolean))).sort((left, right) => left.localeCompare(right));
    }
    /**
     * 7.10a: write the packaged build-index script into a project with a version
     * stamp, and do nothing at all when the stamp already matches.
     *
     * The stamp goes on line 2, after the shebang, because the copied file is
     * still an executable script and a comment above `#!` would silently stop
     * being a shebang. It is a plain comment, so the file it stamps runs
     * unchanged under `node`.
     *
     * The point is the READ, not the write: the generic sync already compared
     * content and skipped identical files, but it had to read ~104 KB twice to
     * find that out, on every finalize and every archive. This reads 256 bytes.
     */
    async syncStampedBuildIndexScript(targetPath, asset, documentLanguage) {
        const version = (await this.getPackageVersion()) || 'unknown';
        const stamp = `${BUILD_INDEX_STAMP_PREFIX}${version}`;
        const existed = await this.fileService.exists(targetPath);
        if (existed && (await this.readBuildIndexStamp(targetPath)) === stamp) {
            return 'skipped';
        }
        const sourceRelativePath = await this.resolveSourceRelativePath(asset, documentLanguage);
        const sourcePath = path_1.default.join(this.getPackageRoot(), ...sourceRelativePath.split('/'));
        const sourceContent = await this.fileService.readFile(sourcePath);
        await this.fileService.writeFile(targetPath, stampBuildIndexScript(sourceContent, stamp));
        return existed ? 'refreshed' : 'created';
    }
    /**
     * Read only the head of the file. A stale copy from before 7.10a has no
     * stamp and returns null, which routes into a rewrite exactly once.
     */
    async readBuildIndexStamp(targetPath) {
        let handle = null;
        try {
            handle = await fs_1.promises.open(targetPath, 'r');
            const buffer = Buffer.alloc(BUILD_INDEX_STAMP_PROBE_BYTES);
            const { bytesRead } = await handle.read(buffer, 0, BUILD_INDEX_STAMP_PROBE_BYTES, 0);
            const head = buffer.subarray(0, bytesRead).toString('utf8');
            const match = head.match(/^\/\/ ospec:build-index-auto v[^\r\n]*/m);
            return match ? match[0] : null;
        }
        catch {
            return null;
        }
        finally {
            await handle?.close().catch(() => undefined);
        }
    }
    /**
     * 7.10a: absolute path to the build-index tool inside the INSTALLED package.
     * The git hooks prefer this over `.ospec/tools/build-index-auto.cjs`, so a
     * machine with the CLI installed always runs current code and the project
     * copy is only the fallback for a machine without it.
     */
    getPackagedBuildIndexToolPath() {
        return path_1.default.join(this.getPackageRoot(), 'dist', 'tools', 'build-index.js');
    }
    getPackageRoot() {
        return path_1.default.resolve(__dirname, '../..');
    }
    async getPackageVersion() {
        try {
            const packageJson = await this.fileService.readJSON(path_1.default.join(this.getPackageRoot(), 'package.json'));
            return typeof packageJson.version === 'string' && packageJson.version.trim().length > 0
                ? packageJson.version.trim()
                : null;
        }
        catch {
            return null;
        }
    }
    isOSpecManagedHook(content) {
        return (content.includes('.ospec/tools/build-index-auto.cjs') ||
            content.includes('build-index-auto.cjs') ||
            content.includes('build-index-auto.js') ||
            content.includes('[ospec]'));
    }
}
exports.ProjectAssetService = ProjectAssetService;
const createProjectAssetService = (fileService) => new ProjectAssetService(fileService);
exports.createProjectAssetService = createProjectAssetService;
