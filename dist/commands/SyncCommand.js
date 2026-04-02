"use strict";
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k))
                ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                if (k[i] !== "default")
                    result[k[i]] = mod[k[i]];
        result.default = mod;
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncCommand = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const util_1 = require("util");
const services_1 = require("../services");
const syncUtils_1 = require("../services/sync/syncUtils");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const HOOK_MARKER = '# OSPEC-SYNC-HOOK';
const HOOK_BACKUP_SUFFIX = '.ospec-backup';
class SyncCommand extends BaseCommand_1.BaseCommand {
    async execute(projectPath, options = {}) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(projectPath)) {
                this.info((0, subcommandHelp_1.getSyncHelpText)());
                return;
            }
            const normalized = this.normalizeOptions(options);
            const target = await this.resolveTarget(projectPath);
            target.allowNoActiveChange = normalized.allowNoActiveChange;
            if (normalized.installHook) {
                await this.installHook(target.rootDir);
                return;
            }
            if (normalized.uninstallHook) {
                await this.uninstallHook(target.rootDir);
                return;
            }
            if (normalized.watch) {
                await this.watch(target.rootDir, projectPath, normalized);
                return;
            }
            const changePath = await this.resolveChangePath(target);
            if (!changePath) {
                this.info('No active change found. Sync skipped.');
                return;
            }
            if (!normalized.updateProjectKnowledge && !normalized.updateSkillFiles) {
                throw new Error('Nothing to sync. Re-enable project knowledge or SKILL file updates.');
            }
            this.info('Detecting changes...');
            const changes = await services_1.services.changeDetector.detectChanges(target.rootDir, {
                staged: normalized.staged,
                filePatterns: normalized.filePatterns,
            });
            if (changes.length === 0 && !normalized.force) {
                this.info('No relevant changes detected.');
                return;
            }
            if (changes.length > 0) {
                this.info(`Found ${changes.length} relevant file(s): ${changes.map(change => change.path).join(', ')}`);
            }
            else {
                this.info('No relevant git changes detected, but force mode will continue.');
            }
            this.info(`Sync target change: ${path.basename(changePath)}`);
            const result = await services_1.services.documentSyncOrchestrator.syncChangeDocuments(changePath, {
                force: normalized.force,
                interactive: false,
                dryRun: normalized.dryRun,
                updateProjectKnowledge: normalized.updateProjectKnowledge,
                updateSkillFiles: normalized.updateSkillFiles,
            });
            if (!result.success) {
                this.error(result.report);
                throw new Error('Documentation sync failed');
            }
            this.info(result.report);
            if (!normalized.dryRun && normalized.rebuildIndex) {
                const index = await services_1.services.projectService.rebuildIndex(target.rootDir);
                this.info(`Index rebuilt: ${index.path}`);
            }
            if (!normalized.dryRun && normalized.stageUpdated) {
                await this.stageFiles(target.rootDir, result.updatedFiles, result.createdFiles, normalized.rebuildIndex);
            }
            if (normalized.dryRun) {
                this.success(`Dry run completed: ${result.updatedFiles.length} file(s) would be updated`);
                return;
            }
            const touchedCount = result.updatedFiles.length + result.createdFiles.length;
            this.success(`Documentation synced: ${touchedCount} file(s) updated`);
        }
        catch (error) {
            this.error(`Sync failed: ${error}`);
            throw error;
        }
    }
    normalizeOptions(options) {
        const normalizedPatterns = Array.isArray(options.filePatterns)
            ? options.filePatterns
            : typeof options.filePatterns === 'string'
                ? options.filePatterns.split(',').map(pattern => pattern.trim()).filter(Boolean)
                : [];
        return {
            dryRun: options.dryRun === true,
            staged: options.staged === true,
            force: options.force === true,
            watch: options.watch === true,
            installHook: options.installHook === true,
            uninstallHook: options.uninstallHook === true,
            stageUpdated: options.stageUpdated === true,
            allowNoActiveChange: options.allowNoActiveChange === true,
            rebuildIndex: options.rebuildIndex !== false,
            updateProjectKnowledge: options.updateProjectKnowledge !== false,
            updateSkillFiles: options.updateSkillFiles !== false,
            filePatterns: normalizedPatterns,
            debounceMs: typeof options.debounceMs === 'number' && options.debounceMs > 0 ? options.debounceMs : 800,
        };
    }
    async resolveTarget(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const directStatePath = path.join(targetPath, 'state.json');
        if (await services_1.services.fileService.exists(directStatePath)) {
            return {
                rootDir: (0, syncUtils_1.resolveChangeRoot)(targetPath),
                changePath: targetPath,
                allowNoActiveChange: false,
            };
        }
        return {
            rootDir: targetPath,
            changePath: null,
            allowNoActiveChange: false,
        };
    }
    async resolveChangePath(target) {
        if (target.changePath) {
            return target.changePath;
        }
        const activeChanges = await services_1.services.projectService.listActiveChangeNames(target.rootDir);
        if (activeChanges.length === 0) {
            if (target.allowNoActiveChange) {
                return null;
            }
            throw new Error('Sync requires one active change. Queue/activate a change first or pass a change path directly.');
        }
        if (activeChanges.length > 1) {
            throw new Error(`Sync requires single-active mode, but found ${activeChanges.length} active changes: ${activeChanges.join(', ')}`);
        }
        return path.join(target.rootDir, 'changes', 'active', activeChanges[0]);
    }
    async installHook(rootDir) {
        const gitDir = path.join(rootDir, '.git');
        if (!(await services_1.services.fileService.exists(gitDir))) {
            throw new Error('Git repository not found. Cannot install sync hook.');
        }
        const hooksDir = path.join(gitDir, 'hooks');
        const hookPath = path.join(hooksDir, 'pre-commit');
        const backupPath = `${hookPath}${HOOK_BACKUP_SUFFIX}`;
        await services_1.services.fileService.ensureDir(hooksDir);
        if (await services_1.services.fileService.exists(hookPath)) {
            const currentContent = await services_1.services.fileService.readFile(hookPath);
            if (!currentContent.includes(HOOK_MARKER) && !(await services_1.services.fileService.exists(backupPath))) {
                await services_1.services.fileService.move(hookPath, backupPath);
                this.info(`Backed up existing pre-commit hook to ${path.relative(rootDir, backupPath).replace(/\\/g, '/')}`);
            }
        }
        await services_1.services.fileService.writeFile(hookPath, this.buildManagedHookScript());
        await fs_1.promises.chmod(hookPath, 0o755);
        this.success(`pre-commit hook installed at ${path.relative(rootDir, hookPath).replace(/\\/g, '/')}`);
    }
    async uninstallHook(rootDir) {
        const gitDir = path.join(rootDir, '.git');
        if (!(await services_1.services.fileService.exists(gitDir))) {
            throw new Error('Git repository not found. Cannot uninstall sync hook.');
        }
        const hookPath = path.join(gitDir, 'hooks', 'pre-commit');
        const backupPath = `${hookPath}${HOOK_BACKUP_SUFFIX}`;
        const hookExists = await services_1.services.fileService.exists(hookPath);
        if (hookExists) {
            const currentContent = await services_1.services.fileService.readFile(hookPath);
            if (!currentContent.includes(HOOK_MARKER)) {
                this.warn('pre-commit hook is not managed by ospec sync. No changes made.');
                return;
            }
            await services_1.services.fileService.remove(hookPath);
        }
        if (await services_1.services.fileService.exists(backupPath)) {
            await services_1.services.fileService.move(backupPath, hookPath);
            this.success('Managed pre-commit hook removed and previous hook restored');
            return;
        }
        this.success('Managed pre-commit hook removed');
    }
    async watch(rootDir, projectPath, options) {
        const target = await this.resolveTarget(projectPath);
        await this.resolveChangePath(target);
        this.info('Watch mode started');
        this.info(`Watching ${rootDir} for analyzable file changes. Press Ctrl+C to stop.`);
        let debounceTimer = null;
        const pending = new Set();
        const watcher = (0, fs_1.watch)(rootDir, { recursive: true }, (_eventType, filename) => {
            const normalized = String(filename || '').replace(/\\/g, '/');
            if (!normalized || !(0, syncUtils_1.isAnalyzablePath)(normalized)) {
                return;
            }
            pending.add(normalized);
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(async () => {
                const changedFiles = Array.from(pending).sort((left, right) => left.localeCompare(right));
                pending.clear();
                this.info(`Change detected: ${changedFiles.join(', ')}`);
                try {
                    await this.execute(projectPath, {
                        ...options,
                        watch: false,
                    });
                }
                catch (error) {
                    this.error(`Watch sync failed: ${error}`);
                }
            }, options.debounceMs);
        });
        await new Promise(resolve => {
            const shutdown = () => {
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                watcher.close();
                process.removeListener('SIGINT', shutdown);
                process.removeListener('SIGTERM', shutdown);
                this.info('Watch mode stopped');
                resolve();
            };
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        });
    }
    async stageFiles(rootDir, updatedFiles, createdFiles, rebuildIndex) {
        const targets = new Set([...updatedFiles, ...createdFiles]);
        if (rebuildIndex) {
            targets.add('SKILL.index.json');
        }
        if (targets.size === 0) {
            return;
        }
        try {
            await execFileAsync('git', ['add', '--', ...Array.from(targets)], {
                cwd: rootDir,
                windowsHide: true,
            });
            this.info(`Auto-staged synced files: ${Array.from(targets).join(', ')}`);
        }
        catch (error) {
            this.warn(`Auto-stage skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    buildManagedHookScript() {
        return [
            '#!/bin/sh',
            HOOK_MARKER,
            '',
            'if command -v ospec >/dev/null 2>&1; then',
            '  ospec sync . --staged --stage-updated --if-active',
            '  status=$?',
            '  if [ $status -ne 0 ]; then',
            '    exit $status',
            '  fi',
            'else',
            '  echo "[ospec] ospec command not found, skip sync hook"',
            'fi',
            '',
            'if [ -f "build-index-auto.cjs" ]; then',
            '  OSPEC_BUILD_INDEX_SCRIPT="build-index-auto.cjs"',
            'elif [ -f "build-index-auto.js" ]; then',
            '  OSPEC_BUILD_INDEX_SCRIPT="build-index-auto.js"',
            'else',
            '  echo "[ospec] build-index-auto.cjs not found, skip hook check"',
            '  exit 0',
            'fi',
            '',
            'node "$OSPEC_BUILD_INDEX_SCRIPT" hook-check pre-commit',
            '',
        ].join('\n');
    }
}
exports.SyncCommand = SyncCommand;
