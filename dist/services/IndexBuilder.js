"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexBuilder = exports.IndexBuilder = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes', 'for-ai']);
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
class IndexBuilder {
    constructor(skillParser) {
        this.skillParser = skillParser;
    }
    async build(rootDir) {
        const modules = {};
        const tagIndex = {};
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
        if (await pathExists(rootDir)) {
            await visit(rootDir);
        }
        const activeChangesDir = path_1.default.join(rootDir, 'changes', 'active');
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
        };
    }
    async write(rootDir) {
        const indexPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_INDEX);
        const previous = (await pathExists(indexPath))
            ? (await readJson(indexPath))
            : null;
        const index = await this.build(rootDir);
        const previousComparable = previous ? this.stripVolatileFields(previous) : null;
        const nextComparable = this.stripVolatileFields(index);
        if (previous && JSON.stringify(previousComparable) === JSON.stringify(nextComparable)) {
            return previous;
        }
        const output = {
            ...index,
            generated: new Date().toISOString(),
        };
        await fs_1.promises.writeFile(indexPath, JSON.stringify(output, null, 2), 'utf-8');
        return output;
    }
    async createEmpty(rootDir) {
        const indexPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILL_INDEX);
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
}
exports.IndexBuilder = IndexBuilder;
const createIndexBuilder = (skillParser) => new IndexBuilder(skillParser);
exports.createIndexBuilder = createIndexBuilder;