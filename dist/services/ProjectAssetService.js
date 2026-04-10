"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectAssetService = exports.ProjectAssetService = void 0;
const path_1 = __importDefault(require("path"));
const ProjectAssetRegistry_1 = require("./ProjectAssetRegistry");
class ProjectAssetService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    getDirectCopyAssets() {
        return ProjectAssetRegistry_1.DIRECT_COPY_PROJECT_ASSETS;
    }
    getDirectCopyTargetPaths() {
        return this.getDirectCopyAssets().map(asset => asset.targetRelativePath);
    }
    getAssetPlan(documentLanguage) {
        return {
            directCopyFiles: this.getDirectCopyTargetPaths(),
            templateGeneratedFiles: [],
            runtimeGeneratedFiles: [],
            localizedCopySources: this.getDirectCopyAssets().map(asset => ({
                targetRelativePath: asset.targetRelativePath,
                sourceRelativePath: this.resolveStaticSourceHint(asset, documentLanguage),
            })),
        };
    }
    async installDirectCopyAssets(rootDir, documentLanguage) {
        const created = [];
        const skipped = [];
        for (const asset of this.getDirectCopyAssets()) {
            const targetPath = path_1.default.join(rootDir, ...asset.targetRelativePath.split('/'));
            if (await this.fileService.exists(targetPath)) {
                skipped.push(asset.targetRelativePath);
                continue;
            }
            const sourceRelativePath = await this.resolveSourceRelativePath(asset, documentLanguage);
            const sourcePath = path_1.default.join(this.getPackageRoot(), ...sourceRelativePath.split('/'));
            await this.fileService.copy(sourcePath, targetPath);
            created.push(asset.targetRelativePath);
        }
        return { created, skipped };
    }
    async syncDirectCopyAssets(rootDir, documentLanguage, options = {}) {
        const created = [];
        const refreshed = [];
        const skipped = [];
        const targetFilter = Array.isArray(options.targetRelativePaths)
            ? new Set(this.normalizePaths(options.targetRelativePaths))
            : null;
        for (const asset of this.getDirectCopyAssets()) {
            if (targetFilter && !targetFilter.has(asset.targetRelativePath)) {
                continue;
            }
            const targetPath = path_1.default.join(rootDir, ...asset.targetRelativePath.split('/'));
            const sourceRelativePath = await this.resolveSourceRelativePath(asset, documentLanguage);
            const sourcePath = path_1.default.join(this.getPackageRoot(), ...sourceRelativePath.split('/'));
            const sourceContent = await this.fileService.readFile(sourcePath);
            if (!(await this.fileService.exists(targetPath))) {
                await this.fileService.writeFile(targetPath, sourceContent);
                created.push(asset.targetRelativePath);
                continue;
            }
            const targetContent = await this.fileService.readFile(targetPath);
            if (targetContent === sourceContent) {
                skipped.push(asset.targetRelativePath);
                continue;
            }
            await this.fileService.writeFile(targetPath, sourceContent);
            refreshed.push(asset.targetRelativePath);
        }
        return { created, refreshed, skipped };
    }
    async installGitHooks(rootDir, hookConfig) {
        const installed = [];
        const skipped = [];
        const gitHooksDir = path_1.default.join(rootDir, '.git', 'hooks');
        if (!(await this.fileService.exists(gitHooksDir))) {
            return { installed, skipped };
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
                    skipped.push(hook.targetRelativePath);
                    continue;
                }
                if (!this.isOSpecManagedHook(targetContent)) {
                    skipped.push(hook.targetRelativePath);
                    continue;
                }
            }
            await this.fileService.writeFile(targetPath, sourceContent);
            installed.push(hook.targetRelativePath);
        }
        return { installed, skipped };
    }
    async writeAssetManifest(rootDir, options) {
        const copyEntries = await Promise.all(this.getDirectCopyAssets().map(async (asset) => {
            const targetPath = path_1.default.join(rootDir, ...asset.targetRelativePath.split('/'));
            return {
                id: asset.id,
                strategy: 'direct_copy',
                category: asset.category,
                description: asset.description,
                targetRelativePath: asset.targetRelativePath,
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
            targetRelativePath,
            sourceRelativePath: null,
            overwritePolicy: 'if_missing',
            exists: await this.fileService.exists(path_1.default.join(rootDir, ...targetRelativePath.split('/'))),
        })));
        const runtimeEntries = await Promise.all(this.normalizePaths(options.runtimeGeneratedPaths).map(async (targetRelativePath) => ({
            id: `runtime:${targetRelativePath}`,
            strategy: 'runtime_generated',
            category: 'runtime',
            description: 'Generated by OSpec at runtime or during index/config initialization.',
            targetRelativePath,
            sourceRelativePath: null,
            overwritePolicy: 'rebuild',
            exists: targetRelativePath === '.ospec/asset-sources.json'
                ? true
                : await this.fileService.exists(path_1.default.join(rootDir, ...targetRelativePath.split('/'))),
        })));
        const assets = [...copyEntries, ...templateEntries, ...runtimeEntries];
        const manifestAsset = assets.find(asset => asset.targetRelativePath === '.ospec/asset-sources.json');
        if (manifestAsset) {
            manifestAsset.exists = true;
        }
        const manifest = {
            version: '1.0',
            generatedAt: new Date().toISOString(),
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
    getPackageRoot() {
        return path_1.default.resolve(__dirname, '../..');
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