"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const BaseCommand_1 = require("./BaseCommand");
class LayoutCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'help', ...args) {
        try {
            const normalizedAction = action || 'help';
            switch (normalizedAction) {
                case 'migrate': {
                    const options = this.parseMigrateArgs(args);
                    await this.migrateToNested(options);
                    return;
                }
                default: {
                    this.info('Usage: ospec layout migrate [path] --to nested');
                }
            }
        }
        catch (error) {
            this.error(`Layout command failed: ${error}`);
            throw error;
        }
    }
    parseMigrateArgs(args) {
        let projectPath;
        let targetLayout = '';
        for (let index = 0; index < args.length; index += 1) {
            const value = args[index];
            if (!value) {
                continue;
            }
            if (value === '--to') {
                targetLayout = String(args[index + 1] || '').trim();
                if (!targetLayout) {
                    throw new Error('layout migrate requires a value after --to');
                }
                index += 1;
                continue;
            }
            if (value.startsWith('--to=')) {
                targetLayout = value.slice('--to='.length).trim();
                continue;
            }
            if (value.startsWith('--')) {
                throw new Error(`Unknown layout migrate flag: ${value}`);
            }
            if (!projectPath) {
                projectPath = value;
                continue;
            }
            throw new Error(`Unexpected layout migrate argument: ${value}`);
        }
        if (targetLayout !== 'nested') {
            throw new Error('layout migrate currently only supports --to nested');
        }
        return {
            targetLayout: 'nested',
            projectPath: path.resolve(projectPath || process.cwd()),
        };
    }
    async migrateToNested(options) {
        const rootDir = options.projectPath;
        const config = await services_1.services.configManager.loadConfig(rootDir);
        if (config.projectLayout === 'nested') {
            this.info(`Project already uses nested layout at ${rootDir}`);
            return;
        }
        const movePlan = await this.collectClassicMovePlan(rootDir);
        const conflicts = [];
        const removablePlaceholderPaths = new Set();
        for (const move of movePlan) {
            if (!(await services_1.services.fileService.exists(move.sourcePath))) {
                continue;
            }
            if (await services_1.services.fileService.exists(move.targetPath)) {
                if (await this.isPlaceholderDirectoryTree(move.targetPath)) {
                    removablePlaceholderPaths.add(move.targetPath);
                    continue;
                }
                conflicts.push(`${move.targetRelativePath} already exists`);
            }
        }
        if (conflicts.length > 0) {
            throw new Error(`Cannot migrate to nested layout because target paths already exist:\n- ${conflicts.join('\n- ')}`);
        }
        for (const targetPath of Array.from(removablePlaceholderPaths).sort((left, right) => right.localeCompare(left))) {
            await services_1.services.fileService.remove(targetPath);
        }
        const movedPaths = [];
        for (const move of movePlan) {
            if (!(await services_1.services.fileService.exists(move.sourcePath))) {
                continue;
            }
            await services_1.services.fileService.ensureDir(path.dirname(move.targetPath));
            await services_1.services.fileService.move(move.sourcePath, move.targetPath);
            movedPaths.push(`${move.sourceRelativePath} -> ${move.targetRelativePath}`);
        }
        // The binding plan's `entries[].file` values are INDEX-coordinate
        // paths (repo-relative, like `documents` keys), so the flip that gave
        // every indexed document an `.ospec/` prefix must rewrite them too.
        // Moving the file alone left its contents in the old coordinate
        // space: verify reported a correct binding as [misbound] with advice
        // that would break it, execute skipped rows as unreadable, and a
        // re-plan dropped every adjudication because nothing matched by path.
        await this.rebasePlanEntryPaths(rootDir);
        const nextConfig = {
            ...config,
            projectLayout: 'nested',
        };
        await services_1.services.configManager.saveConfig(rootDir, nextConfig);
        await services_1.services.projectService.generateProjectKnowledge(rootDir);
        await services_1.services.projectService.syncProtocolGuidance(rootDir);
        await services_1.services.projectService.rebuildIndex(rootDir);
        this.success(`Project layout migrated to nested at ${rootDir}`);
        if (movedPaths.length > 0) {
            this.info(`  moved: ${movedPaths.length}`);
            movedPaths.slice(0, 20).forEach(item => {
                this.info(`  ${item}`);
            });
            if (movedPaths.length > 20) {
                this.info(`  ... and ${movedPaths.length - 20} more`);
            }
        }
    }
    async rebasePlanEntryPaths(rootDir) {
        const planPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs-binding-plan.json', 'nested');
        if (!(await services_1.services.fileService.exists(planPath))) {
            return;
        }
        let plan;
        try {
            plan = JSON.parse((await services_1.services.fileService.readFile(planPath)).replace(/^\uFEFF/, ''));
        }
        catch {
            // A damaged plan is the bind pipeline's problem to report, not a
            // reason to abort a layout migration that already moved files.
            return;
        }
        if (!Array.isArray(plan?.entries)) {
            return;
        }
        let rewrote = false;
        for (const entry of plan.entries) {
            if (!entry || typeof entry.file !== 'string')
                continue;
            const rebased = (0, ProjectLayout_1.toManagedRelativePath)(entry.file, 'nested');
            if (rebased !== entry.file) {
                entry.file = rebased;
                rewrote = true;
            }
        }
        if (rewrote) {
            await services_1.services.fileService.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
        }
    }
    async collectClassicMovePlan(rootDir) {
        const plannedRelativePaths = new Set();
        for (const relativePath of [
            constants_1.FILE_NAMES.SKILL_MD,
            constants_1.FILE_NAMES.SKILL_INDEX,
            'changes',
            'for-ai',
            'knowledge',
            'docs/project',
            'docs/design',
            'docs/planning',
            'docs/api',
            // P8: the binding surface covers every documentation category, and
            // both builders scan only the MANAGED docs tree -- a category left
            // behind here silently drops its bindings out of the index after
            // the move.
            'docs/features',
            'docs/product',
            'docs/SKILL.md',
            // Persistent engine state files that resolve through
            // resolveManagedPath: their readers look under .ospec/ after the
            // flip, so they must move with everything else.
            'docs-binding-plan.json',
            'docs-migration-plan.json',
            'docs-migration.json',
        ]) {
            plannedRelativePaths.add(relativePath);
        }
        for (const baseDir of ['knowledge', 'src', 'docs', 'tests']) {
            const absoluteBaseDir = path.join(rootDir, baseDir);
            if (!(await services_1.services.fileService.exists(absoluteBaseDir))) {
                continue;
            }
            const discoveredSkillPaths = await this.collectNestedSkillFiles(rootDir, absoluteBaseDir);
            for (const relativePath of discoveredSkillPaths) {
                plannedRelativePaths.add(relativePath);
            }
        }
        return Array.from(plannedRelativePaths)
            .sort((left, right) => left.localeCompare(right))
            .map(relativePath => ({
            sourceRelativePath: relativePath,
            targetRelativePath: (0, ProjectLayout_1.toManagedRelativePath)(relativePath, 'nested'),
            sourcePath: path.join(rootDir, ...relativePath.split('/')),
            targetPath: (0, ProjectLayout_1.resolveManagedPath)(rootDir, relativePath, 'nested'),
        }));
    }
    async collectNestedSkillFiles(rootDir, currentDir) {
        const entries = await services_1.services.fileService.readDir(currentDir);
        const results = [];
        for (const entryName of entries) {
            const fullPath = path.join(currentDir, entryName);
            const stat = await services_1.services.fileService.stat(fullPath);
            if (stat.isDirectory()) {
                results.push(...(await this.collectNestedSkillFiles(rootDir, fullPath)));
                continue;
            }
            if (entryName !== constants_1.FILE_NAMES.SKILL_MD) {
                continue;
            }
            results.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
        }
        return results;
    }
    async isPlaceholderDirectoryTree(targetPath) {
        const stat = await services_1.services.fileService.stat(targetPath);
        if (!stat.isDirectory()) {
            return false;
        }
        const entries = await services_1.services.fileService.readDir(targetPath);
        if (entries.length === 0) {
            return true;
        }
        for (const entryName of entries) {
            const entryPath = path.join(targetPath, entryName);
            if (!(await this.isPlaceholderDirectoryTree(entryPath))) {
                return false;
            }
        }
        return true;
    }
}
exports.LayoutCommand = LayoutCommand;
