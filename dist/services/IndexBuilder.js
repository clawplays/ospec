"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexBuilder = exports.IndexBuilder = void 0;
const fs_1 = require("fs");
const constants_1 = require("../core/constants");
// Single source of truth for the index algorithm. `build-index.ts` is also compiled to the
// standalone `.ospec/tools/build-index-auto.cjs` used by the git hook; requiring it here means
// the writer and the hook share one implementation (no parser/layout divergence). The tool
// only runs its CLI `main()` under `require.main === module`, so importing it is side-effect free.
const indexTool = require('../tools/build-index');
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
    return JSON.parse((await fs_1.promises.readFile(filePath, 'utf8')).replace(/^﻿/, ''));
}
class IndexBuilder {
    // skillParser is retained for backward-compatible construction; the index algorithm now
    // lives in the shared build-index tool, so parsing is no longer done here.
    constructor(_skillParser) { }
    async build(rootDir) {
        return indexTool.buildIndex(rootDir);
    }
    async write(rootDir) {
        const { index } = await indexTool.writeIndex(rootDir, { silent: true });
        return index;
    }
    async createEmpty(rootDir) {
        const layout = await indexTool.getProjectLayout(rootDir);
        const indexPath = indexTool.resolveManagedPath(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, layout);
        const previous = (await pathExists(indexPath)) ? await readJson(indexPath) : null;
        const index = {
            version: '1.0',
            generated: new Date().toISOString(),
            git_commit: indexTool.resolveGitCommit(rootDir),
            stats: {
                totalFiles: 0,
                totalModules: 0,
                totalSections: 0,
            },
            modules: {},
            tagIndex: {},
        };
        if (previous && JSON.stringify(stripVolatileFields(previous)) === JSON.stringify(stripVolatileFields(index))) {
            return previous;
        }
        await fs_1.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
        return index;
    }
}
exports.IndexBuilder = IndexBuilder;
function stripVolatileFields(index) {
    const { generated: _generated, git_commit: _gitCommit, ...stable } = index;
    return stable;
}
const createIndexBuilder = (skillParser) => new IndexBuilder(skillParser);
exports.createIndexBuilder = createIndexBuilder;
