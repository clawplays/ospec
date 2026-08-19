"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunService = void 0;
exports.createRunService = createRunService;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const TaskGraphExecutionService_1 = require("./TaskGraphExecutionService");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const RUN_PROFILES = {
    'manual-safe': {
        autoFinalize: false,
    },
    'archive-chain': {
        autoFinalize: true,
    },
};
class RunService {
    constructor(fileService, projectService, queueService, taskGraphExecutionService) {
        this.fileService = fileService;
        this.projectService = projectService;
        this.queueService = queueService;
        this.taskGraphExecutionService = taskGraphExecutionService ?? new TaskGraphExecutionService_1.TaskGraphExecutionService(fileService);
    }
    async start(rootDir, options = {}) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        await this.ensureRunDirectories(resolvedRootDir);
        const existingRun = await this.getCurrentRun(resolvedRootDir);
        if (existingRun && ['running', 'paused', 'failed'].includes(existingRun.status)) {
            throw new Error(`A queue run already exists with status "${existingRun.status}". Use "ospec run resume" or "ospec run stop" first.`);
        }
        await this.assertRunnableRepository(resolvedRootDir);
        const profileId = this.normalizeProfileId(options.profileId);
        const run = this.createRun(resolvedRootDir, profileId);
        const synchronized = await this.synchronizeRun(resolvedRootDir, run, {
            allowActivateNext: true,
        });
        await this.saveRun(resolvedRootDir, synchronized.run);
        await this.appendLogEvents(resolvedRootDir, synchronized.run, [
            `Queue run started with manual-bridge and profile ${profileId}.`,
            ...synchronized.events,
        ]);
        return this.buildStatusReport(resolvedRootDir, synchronized.run);
    }
    async resume(rootDir) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        const run = await this.requireCurrentRun(resolvedRootDir);
        if (!['paused', 'failed'].includes(run.status)) {
            throw new Error(`Run resume requires a paused or failed run. Current status is "${run.status}".`);
        }
        run.status = 'running';
        run.stoppedAt = null;
        run.completedAt = null;
        const synchronized = await this.synchronizeRun(resolvedRootDir, run, {
            allowActivateNext: true,
        });
        await this.saveRun(resolvedRootDir, synchronized.run);
        await this.appendLogEvents(resolvedRootDir, synchronized.run, [
            'Queue run resumed.',
            ...synchronized.events,
        ]);
        return this.buildStatusReport(resolvedRootDir, synchronized.run);
    }
    async step(rootDir) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        const run = await this.requireCurrentRun(resolvedRootDir);
        if (run.status !== 'running') {
            throw new Error(`Run step requires a running run. Current status is "${run.status}".`);
        }
        const profile = RUN_PROFILES[run.profileId];
        const events = [];
        const initialSync = await this.synchronizeRun(resolvedRootDir, run, {
            allowActivateNext: true,
        });
        events.push(...initialSync.events);
        // Whether this step changed anything on disk. Only a finalize does; the
        // other two branches just describe what they saw.
        let repositoryChanged = false;
        if (initialSync.run.status === 'running' && initialSync.run.currentChangePath) {
            const activePath = path_1.default.join(resolvedRootDir, initialSync.run.currentChangePath);
            const activeChange = await this.projectService.getActiveChangeStatusItem(activePath);
            if (profile.autoFinalize && activeChange.archiveReady) {
                const finalized = await this.projectService.finalizeChange(activePath);
                this.recordCompletedChange(initialSync.run, activeChange.name, finalized.archivePath, 'auto-finalized');
                initialSync.run.currentChange = null;
                initialSync.run.currentChangePath = null;
                initialSync.run.failedChange = null;
                initialSync.run.lastInstruction = `Change ${activeChange.name} was finalized and archived to ${finalized.archivePath}.`;
                events.push(`Auto-finalized and archived ${activeChange.name} to ${finalized.archivePath}.`);
                repositoryChanged = true;
            }
            else if (profile.autoFinalize) {
                events.push(`Checked ${activeChange.name}; archive-chain is waiting for the change to become archive-ready.`);
            }
            else {
                events.push(`Checked ${activeChange.name}; manual-safe mode leaves the active change lifecycle fully manual.`);
            }
        }
        // The second synchronize exists to observe what the finalize above did:
        // the change left changes/active, so the runner has to detach, activate
        // the next queued change and recompute the instruction. When nothing was
        // finalized it re-listed the active and queued changes, re-read the same
        // state, and recomputed the identical run record -- and then overwrote
        // `lastInstruction` with the value the first synchronize had already
        // produced, which is why the two branches above no longer set it.
        const finalSync = repositoryChanged
            ? await this.synchronizeRun(resolvedRootDir, initialSync.run, { allowActivateNext: true })
            : initialSync;
        if (repositoryChanged) {
            events.push(...finalSync.events);
        }
        await this.saveRun(resolvedRootDir, finalSync.run);
        if (events.length > 0) {
            await this.appendLogEvents(resolvedRootDir, finalSync.run, events);
        }
        return this.buildStatusReport(resolvedRootDir, finalSync.run);
    }
    async stop(rootDir) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        const run = await this.requireCurrentRun(resolvedRootDir);
        if (run.status === 'completed') {
            throw new Error('The current queue run is already completed.');
        }
        const synchronized = await this.synchronizeRun(resolvedRootDir, run, {
            allowActivateNext: false,
        });
        synchronized.run.status = 'paused';
        synchronized.run.stoppedAt = new Date().toISOString();
        synchronized.run.lastInstruction = synchronized.run.currentChange
            ? 'Queue run paused. Finish the current change manually, then use "ospec run resume" when you want ospec to continue tracking the queue.'
            : 'Queue run paused. Use "ospec run resume" when you want ospec to continue with the queue.';
        await this.saveRun(resolvedRootDir, synchronized.run);
        await this.appendLogEvents(resolvedRootDir, synchronized.run, [
            ...synchronized.events,
            'Queue run paused by user request.',
        ]);
        return this.buildStatusReport(resolvedRootDir, synchronized.run);
    }
    async getStatusReport(rootDir) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        const run = await this.getCurrentRun(resolvedRootDir);
        if (!run) {
            return this.buildStatusReport(resolvedRootDir, null);
        }
        // `run status` is a read-only command, and it stayed read-only right up
        // until it saved: `touchRun` stamps a new `updatedAt` unconditionally, so
        // every status check rewrote .ospec/runs/current.json and its history
        // copy, churning two mtimes and putting a tracked file in `git status`
        // for a command that reports rather than advances.
        //
        // Nothing is lost by not persisting. `synchronizeRun` is a pure function
        // of the run record plus what is on disk, so the next command that does
        // mutate re-derives the same observations (an archived change spotted
        // here is spotted again there) and logs the same events then.
        const synchronized = await this.synchronizeRun(resolvedRootDir, run, {
            allowActivateNext: false,
            touch: false,
        });
        return this.buildStatusReport(resolvedRootDir, synchronized.run);
    }
    async getLogTail(rootDir, lineCount = 20) {
        const resolvedRootDir = path_1.default.resolve(rootDir);
        const run = await this.getCurrentRun(resolvedRootDir);
        if (!run) {
            return [];
        }
        return this.readLogTail(resolvedRootDir, run.logPath, lineCount);
    }
    async buildStatusReport(rootDir, run) {
        const config = await this.getProjectConfig(rootDir);
        const [activeNames, queuedChanges, logTail] = await Promise.all([
            this.projectService.listActiveChangeNames(rootDir),
            this.queueService.getQueuedChanges(rootDir),
            run ? this.readLogTail(rootDir, run.logPath, 20) : Promise.resolve([]),
        ]);
        let activeChange = null;
        let taskGraph = null;
        if (activeNames.length === 1) {
            const activeName = activeNames[0];
            const activeRelativePath = (0, ProjectLayout_1.toManagedRelativePath)(`changes/active/${activeName}`, config);
            const activePath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `changes/active/${activeName}`, config);
            activeChange = {
                name: activeName,
                path: activeRelativePath,
                status: (await this.fileService.readJSON(path_1.default.join(activePath, constants_1.FILE_NAMES.STATE))).status,
            };
            taskGraph = await this.buildTaskGraphSnapshot(activePath, activeRelativePath);
        }
        return {
            currentRun: run,
            stage: this.describeRunStage(run),
            activeChange,
            taskGraph,
            queuedChanges,
            logTail,
            nextInstruction: run?.lastInstruction ?? this.getIdleInstruction(queuedChanges.length),
        };
    }
    async buildTaskGraphSnapshot(changePath, changeRelativePath) {
        const normalizedChangeRelativePath = changeRelativePath.replace(/\\/g, '/');
        const graphRelativePath = path_1.default.posix.join(normalizedChangeRelativePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        const graphPath = path_1.default.join(changePath, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
        if (!(await this.fileService.exists(graphPath))) {
            return this.createEmptyTaskGraphSnapshot({
                exists: false,
                path: graphRelativePath,
                status: 'missing',
                nextInstruction: `Create ${graphRelativePath} from implementation-plan.md before dispatch.`,
            });
        }
        try {
            const report = await this.taskGraphExecutionService.getReport(changePath);
            return {
                exists: true,
                path: graphRelativePath,
                status: report.graphStatus,
                taskCount: report.taskCount,
                readyCount: report.readyTasks.length,
                dispatchableCount: report.dispatchableTasks.length,
                runningCount: report.runningTasks.length,
                completedCount: report.completedTasks.length,
                concernCount: report.concernTasks.length,
                blockedCount: report.blockedTasks.length,
                invalidCount: report.invalidTasks.length,
                issueCount: report.issues.length,
                nextInstruction: report.nextInstruction,
            };
        }
        catch (error) {
            const message = error?.message ? String(error.message) : String(error);
            return this.createEmptyTaskGraphSnapshot({
                exists: true,
                path: graphRelativePath,
                status: 'invalid',
                issueCount: 1,
                nextInstruction: `Fix ${graphRelativePath}: ${message}`,
            });
        }
    }
    createEmptyTaskGraphSnapshot(input) {
        return {
            exists: input.exists,
            path: input.path,
            status: input.status,
            taskCount: 0,
            readyCount: 0,
            dispatchableCount: 0,
            runningCount: 0,
            completedCount: 0,
            concernCount: 0,
            blockedCount: 0,
            invalidCount: 0,
            issueCount: input.issueCount ?? 0,
            nextInstruction: input.nextInstruction,
        };
    }
    async synchronizeRun(rootDir, run, options) {
        const config = await this.getProjectConfig(rootDir);
        const events = [];
        const activeNames = await this.projectService.listActiveChangeNames(rootDir);
        if (activeNames.length > 1) {
            run.status = 'failed';
            run.failedChange = {
                name: activeNames.join(', '),
                path: (0, ProjectLayout_1.toManagedRelativePath)('changes/active', config),
                status: 'draft',
                recordedAt: new Date().toISOString(),
                note: 'multiple-active-changes',
            };
            run.lastInstruction =
                'Multiple active changes were detected. Resolve the repository back to a single active change before resuming the queue runner.';
            run.remainingChanges = await this.queueService.listQueuedChangeNames(rootDir);
            events.push(`Runner entered failed state because multiple active changes were detected: ${activeNames.join(', ')}.`);
            return {
                run: options.touch === false ? run : this.touchRun(run),
                events,
            };
        }
        const activeName = activeNames[0] ?? null;
        if (run.currentChange && run.currentChange !== activeName) {
            const archivedPath = await this.findArchivedChangePath(rootDir, run.currentChange);
            if (archivedPath) {
                this.recordCompletedChange(run, run.currentChange, archivedPath, 'archived-observed');
                events.push(`Observed archived change: ${run.currentChange}.`);
            }
        }
        if (activeName) {
            if (run.currentChange !== activeName) {
                events.push(`Runner attached to active change ${activeName}.`);
            }
            run.currentChange = activeName;
            run.currentChangePath = (0, ProjectLayout_1.toManagedRelativePath)(`changes/active/${activeName}`, config);
            if (run.status !== 'failed') {
                run.failedChange = null;
            }
            run.completedAt = null;
        }
        else {
            run.currentChange = null;
            run.currentChangePath = null;
            if (options.allowActivateNext && run.status === 'running') {
                const nextChange = await this.queueService.activateNextQueuedChange(rootDir, 'runner');
                if (nextChange) {
                    run.currentChange = nextChange.name;
                    run.currentChangePath = nextChange.path;
                    run.failedChange = null;
                    events.push(`Activated next queued change: ${nextChange.name}.`);
                }
            }
        }
        run.remainingChanges = await this.queueService.listQueuedChangeNames(rootDir);
        if (!run.currentChange) {
            if (run.status === 'running' && run.remainingChanges.length === 0) {
                run.status = 'completed';
                run.completedAt = new Date().toISOString();
                run.lastInstruction = 'Queue run completed. No queued changes remain.';
                events.push('Queue run completed.');
            }
            else if (run.status !== 'completed') {
                run.lastInstruction = run.remainingChanges.length > 0
                    ? 'No active change is attached right now. Run "ospec run step" to activate or continue the next queued change.'
                    : 'No active or queued changes are available right now.';
            }
        }
        else if (run.status === 'running') {
            run.lastInstruction = await this.buildActiveInstruction(rootDir, run.currentChangePath, run.profileId);
        }
        return {
            run: options.touch === false ? run : this.touchRun(run),
            events,
        };
    }
    recordCompletedChange(run, changeName, archivePath, note = null) {
        if (run.completedChanges.some(item => item.name === changeName && item.path === archivePath)) {
            return;
        }
        run.completedChanges.push({
            name: changeName,
            path: archivePath,
            status: 'archived',
            recordedAt: new Date().toISOString(),
            note,
        });
    }
    createRun(rootDir, profileId) {
        const now = new Date().toISOString();
        const id = `run-${now.replace(/[:.]/g, '-')}`;
        return {
            id,
            status: 'running',
            executor: 'manual-bridge',
            profileId,
            mode: 'single-active-sequential',
            projectPath: rootDir,
            startedAt: now,
            updatedAt: now,
            stoppedAt: null,
            completedAt: null,
            currentChange: null,
            currentChangePath: null,
            completedChanges: [],
            remainingChanges: [],
            failedChange: null,
            logPath: `.ospec/${constants_1.DIR_NAMES.RUNS}/${constants_1.DIR_NAMES.LOGS}/${id}.log`,
            lastInstruction: null,
        };
    }
    touchRun(run) {
        return {
            ...run,
            updatedAt: new Date().toISOString(),
        };
    }
    normalizeProfileId(profileId) {
        const normalized = String(profileId || 'manual-safe').trim();
        if (normalized === 'manual-safe' || normalized === 'archive-chain') {
            return normalized;
        }
        throw new Error(`Unsupported run profile: ${profileId}`);
    }
    async requireCurrentRun(rootDir) {
        const run = await this.getCurrentRun(rootDir);
        if (!run) {
            throw new Error('No queue run exists for this project yet. Use "ospec run start" first.');
        }
        return run;
    }
    async getCurrentRun(rootDir) {
        const currentRunPath = this.getCurrentRunPath(rootDir);
        if (!(await this.fileService.exists(currentRunPath))) {
            return null;
        }
        return this.fileService.readJSON(currentRunPath);
    }
    async saveRun(rootDir, run) {
        await this.ensureRunDirectories(rootDir);
        await this.fileService.writeJSON(this.getCurrentRunPath(rootDir), run);
        await this.fileService.writeJSON(this.getHistoryRunPath(rootDir, run.id), run);
    }
    async appendLogEvents(rootDir, run, events) {
        if (events.length === 0) {
            return;
        }
        const logPath = this.resolveRunFilePath(rootDir, run.logPath);
        await this.fileService.ensureDir(path_1.default.dirname(logPath));
        const lines = events.map(event => `[${new Date().toISOString()}] ${event}`).join('\n');
        await fs_1.promises.appendFile(logPath, `${lines}\n`, 'utf8');
    }
    async readLogTail(rootDir, logPath, lineCount) {
        const resolvedLogPath = this.resolveRunFilePath(rootDir, logPath);
        if (!(await this.fileService.exists(resolvedLogPath))) {
            return [];
        }
        const content = await this.fileService.readFile(resolvedLogPath);
        return content
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(Boolean)
            .slice(-lineCount);
    }
    async assertRunnableRepository(rootDir) {
        const activeNames = await this.projectService.listActiveChangeNames(rootDir);
        if (activeNames.length > 1) {
            throw new Error(`Queue runner requires single-active mode, but ${activeNames.length} active changes were found: ${activeNames.join(', ')}.`);
        }
        const queuedNames = await this.queueService.listQueuedChangeNames(rootDir);
        if (activeNames.length === 0 && queuedNames.length === 0) {
            throw new Error('No active or queued changes are available for execution.');
        }
    }
    async findArchivedChangePath(rootDir, changeName) {
        const config = await this.getProjectConfig(rootDir);
        const archivedDir = (0, ProjectLayout_1.resolveManagedPath)(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ARCHIVED}`, config);
        if (!(await this.fileService.exists(archivedDir))) {
            return null;
        }
        const candidatePaths = await this.listArchivedChangeDirectories(archivedDir);
        const matches = [];
        for (const candidatePath of candidatePaths) {
            const statePath = path_1.default.join(candidatePath, constants_1.FILE_NAMES.STATE);
            if (!(await this.fileService.exists(statePath))) {
                continue;
            }
            try {
                const state = await this.fileService.readJSON(statePath);
                if (state?.feature === changeName && state?.status === 'archived') {
                    matches.push(this.toArchivedRelativePath(rootDir, archivedDir, candidatePath, config));
                }
            }
            catch {
                continue;
            }
        }
        return matches.sort().at(-1) || null;
    }
    async listArchivedChangeDirectories(archivedDir) {
        const entries = await fs_1.promises.readdir(archivedDir, { withFileTypes: true });
        const candidates = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const entryPath = path_1.default.join(archivedDir, entry.name);
            if (/^\d{4}-\d{2}-\d{2}-.+/.test(entry.name)) {
                candidates.push(entryPath);
                continue;
            }
            if (!/^\d{4}-\d{2}$/.test(entry.name)) {
                continue;
            }
            const dayEntries = await fs_1.promises.readdir(entryPath, { withFileTypes: true });
            for (const dayEntry of dayEntries) {
                if (!dayEntry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(dayEntry.name)) {
                    continue;
                }
                const dayPath = path_1.default.join(entryPath, dayEntry.name);
                const changeEntries = await fs_1.promises.readdir(dayPath, { withFileTypes: true });
                for (const changeEntry of changeEntries) {
                    if (changeEntry.isDirectory()) {
                        candidates.push(path_1.default.join(dayPath, changeEntry.name));
                    }
                }
            }
        }
        return candidates;
    }
    toArchivedRelativePath(rootDir, archivedDir, candidatePath, config) {
        const relativePath = path_1.default.relative(archivedDir, candidatePath).replace(/\\/g, '/');
        return (0, ProjectLayout_1.toManagedRelativePath)(`changes/archived/${relativePath}`, config);
    }
    async ensureRunDirectories(rootDir) {
        await Promise.all([
            this.fileService.ensureDir(path_1.default.join(rootDir, '.ospec', constants_1.DIR_NAMES.RUNS)),
            this.fileService.ensureDir(path_1.default.join(rootDir, '.ospec', constants_1.DIR_NAMES.RUNS, constants_1.DIR_NAMES.HISTORY)),
            this.fileService.ensureDir(path_1.default.join(rootDir, '.ospec', constants_1.DIR_NAMES.RUNS, constants_1.DIR_NAMES.LOGS)),
        ]);
    }
    getCurrentRunPath(rootDir) {
        return path_1.default.join(rootDir, '.ospec', constants_1.DIR_NAMES.RUNS, 'current.json');
    }
    getHistoryRunPath(rootDir, runId) {
        return path_1.default.join(rootDir, '.ospec', constants_1.DIR_NAMES.RUNS, constants_1.DIR_NAMES.HISTORY, `${runId}.json`);
    }
    resolveRunFilePath(rootDir, targetPath) {
        return path_1.default.isAbsolute(targetPath) ? targetPath : path_1.default.join(rootDir, targetPath);
    }
    // FIX-G1: same gate as `QueueService.getProjectConfig` and the index
    // builders -- this config feeds `resolveManagedPath` /
    // `toManagedRelativePath`, so degrading it to `null` resolved to
    // `'classic'` and pointed the runner at the project root of a nested
    // project. Absent stays absent; damaged now fails loudly.
    async getProjectConfig(rootDir) {
        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        if (!(await this.fileService.exists(configPath))) {
            return null;
        }
        let raw;
        try {
            raw = await this.fileService.readJSON(configPath);
        }
        catch (error) {
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, `invalid JSON (${error?.message || 'parse failed'})`);
        }
        return (0, ProjectLayout_1.assertProjectConfigUsable)(rootDir, configPath, raw);
    }
    async buildActiveInstruction(rootDir, changePath, profileId) {
        const resolvedChangePath = this.resolveRunFilePath(rootDir, changePath);
        const taskGraph = await this.buildTaskGraphSnapshot(resolvedChangePath, changePath);
        const taskGraphInstruction = this.buildTaskGraphRunInstruction(changePath, taskGraph);
        if (profileId === 'archive-chain') {
            return [
                `Archive-chain is attached to ${changePath}.`,
                'Complete the change manually and keep the protocol docs current.',
                taskGraphInstruction,
                'Run "ospec run step" when it becomes archive-ready and ospec will finalize/archive it on that explicit step.',
            ].filter(Boolean).join(' ');
        }
        return [
            `Manual-safe is attached to ${changePath}.`,
            'Complete the change manually.',
            taskGraphInstruction,
            'Run "ospec run step" when you want ospec to re-check queue progress.',
        ].filter(Boolean).join(' ');
    }
    buildTaskGraphRunInstruction(changePath, taskGraph) {
        if (!taskGraph.exists) {
            return `Task graph is missing at ${taskGraph.path}; continue proposal, design, and implementation planning before worker dispatch.`;
        }
        if (taskGraph.status === 'invalid' || taskGraph.issueCount > 0 || taskGraph.invalidCount > 0) {
            return `Task graph needs repair before dispatch: ${taskGraph.nextInstruction || `fix ${taskGraph.path}`}`;
        }
        if (taskGraph.dispatchableCount > 0) {
            return `Task graph has ${taskGraph.dispatchableCount} dispatchable task(s). Run "ospec execute dispatch ${changePath}" to create worker packet(s).`;
        }
        if (taskGraph.runningCount > 0) {
            return `Task graph has ${taskGraph.runningCount} task(s) in progress. Continue worker work, then record results with 'ospec execute complete <task-id> ${changePath} --status DONE --summary "..."'.`;
        }
        if (taskGraph.blockedCount > 0) {
            return `Task graph has ${taskGraph.blockedCount} blocked task(s). Resolve blocker or missing context before dispatch.`;
        }
        if (taskGraph.taskCount > 0 && taskGraph.completedCount === taskGraph.taskCount) {
            return `Task graph is complete. Continue with review, verification, and finish readiness.`;
        }
        if (taskGraph.nextInstruction) {
            return `Task graph next: ${taskGraph.nextInstruction}`;
        }
        return '';
    }
    describeRunStage(run) {
        if (!run) {
            return null;
        }
        if (run.status === 'completed') {
            return 'queue-complete';
        }
        if (run.status === 'paused') {
            return 'paused';
        }
        if (run.status === 'failed') {
            return run.failedChange?.note === 'multiple-active-changes' ? 'failed:multiple-active' : 'failed';
        }
        if (!run.currentChangePath) {
            return run.remainingChanges.length > 0 ? 'awaiting-activation' : 'idle';
        }
        return run.profileId === 'archive-chain' ? 'active:archive-chain' : 'active:manual-safe';
    }
    getIdleInstruction(queuedCount) {
        if (queuedCount > 0) {
            return 'No queue run is active. Run "ospec run start" to begin processing queued changes.';
        }
        return 'No queue run is active.';
    }
}
exports.RunService = RunService;
function createRunService(fileService, projectService, queueService) {
    return new RunService(fileService, projectService, queueService);
}
