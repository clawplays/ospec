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
exports.SessionCommand = void 0;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class SessionCommand extends BaseCommand_1.BaseCommand {
    async execute(...args) {
        try {
            const parsed = this.parseArgs(args);
            if (parsed.help) {
                console.log((0, subcommandHelp_1.getSessionHelpText)());
                return;
            }
            const targetPath = path.resolve(parsed.projectPath || process.cwd());
            if (parsed.hook) {
                const result = await this.writeSessionHook(targetPath);
                this.printSessionHook(result);
                const target = parsed.target ?? 'claude';
                if (target === 'claude') {
                    const hookInstall = await services_1.services.claudeHookService.install(targetPath, {
                        apply: parsed.apply,
                    });
                    this.printClaudeHookInstall(hookInstall, Boolean(parsed.apply));
                }
                return;
            }
            const result = await this.writeSessionBrief(targetPath);
            this.printSessionBrief(result);
        }
        catch (error) {
            this.error(`Session command failed: ${error}`);
            throw error;
        }
    }
    parseArgs(args) {
        let hook = false;
        let apply = false;
        let target;
        let projectPath;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if ((0, subcommandHelp_1.isHelpAction)(arg)) {
                return { help: true, hook: false };
            }
            if (arg === 'hook' && index === 0) {
                hook = true;
                continue;
            }
            if (arg === '--hook') {
                hook = true;
                continue;
            }
            if (arg === '--apply') {
                apply = true;
                continue;
            }
            if (arg === '--target') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Session flag --target requires a value (for example: --target claude).');
                }
                target = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--target=')) {
                target = arg.slice('--target='.length);
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown session flag: ${arg}`);
            }
            if (!projectPath) {
                projectPath = arg;
                continue;
            }
            throw new Error(`Unexpected session argument: ${arg}`);
        }
        if (apply && !hook) {
            throw new Error('Session flag --apply can only be used with session hook.');
        }
        if (target !== undefined) {
            const normalizedTarget = target.trim().toLowerCase();
            if (!normalizedTarget) {
                throw new Error('Session flag --target requires a value (for example: --target claude).');
            }
            if (!hook) {
                throw new Error('Session flag --target can only be used with session hook.');
            }
            if (normalizedTarget !== 'claude') {
                throw new Error(`Unsupported session hook target: ${target}. Supported targets: claude.`);
            }
            target = normalizedTarget;
        }
        return { help: false, hook, apply, target, projectPath };
    }
    async writeSessionBrief(projectPath) {
        const targetPath = path.resolve(projectPath);
        const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
        if (!structure.initialized) {
            throw new Error(`OSpec project is not initialized at ${targetPath}. Run ${(0, helpers_1.formatCliCommand)('ospec', 'init', targetPath)} first.`);
        }
        const [summary, docs, skills, activeReport, queuedChanges, runReport,] = await Promise.all([
            services_1.services.projectService.getProjectSummary(targetPath),
            services_1.services.projectService.getDocsStatus(targetPath),
            services_1.services.projectService.getSkillsStatus(targetPath),
            services_1.services.projectService.getActiveChangeStatusReport(targetPath),
            services_1.services.queueService.getQueuedChanges(targetPath),
            services_1.services.runService.getStatusReport(targetPath),
        ]);
        const changeReady = docs.missingRequired.length === 0;
        const recommendedCommands = this.buildRecommendedCommands(targetPath, changeReady, activeReport.changes, queuedChanges, runReport);
        const nextInstruction = recommendedCommands[0]?.command
            ? `Run ${recommendedCommands[0].command}.`
            : 'Inspect project status before continuing.';
        const now = new Date().toISOString();
        const artifactPath = path.join(targetPath, '.ospec', 'session-brief.json');
        const reportPath = path.join(targetPath, '.ospec', 'session-brief.md');
        const activeChanges = activeReport.changes.map(change => ({
            name: change.name,
            path: change.path,
            workflowProfile: change.workflowProfile,
            status: change.status,
            progress: change.progress,
            currentStep: change.currentStep,
            summaryStatus: change.summaryStatus,
        }));
        const queuedChangeSnapshots = queuedChanges.map(change => ({
            name: change.name,
            path: change.path,
            status: change.status,
            currentStep: change.currentStep,
        }));
        const queueRun = {
            status: runReport.currentRun?.status || 'idle',
            profile: runReport.currentRun?.profileId || null,
            stage: runReport.stage || null,
            nextInstruction: runReport.nextInstruction || null,
        };
        const docsSnapshot = {
            coverage: docs.coverage,
            missingRequired: docs.missingRequired,
        };
        const skillsSnapshot = {
            existing: skills.existing,
            total: skills.totalSkillFiles,
            indexPresent: skills.skillIndex.exists,
            indexNeedsRebuild: skills.skillIndex.needsRebuild,
        };
        const skillIndexPath = typeof skills.skillIndex.path === 'string' && skills.skillIndex.path.trim()
            ? skills.skillIndex.path
            : null;
        const knowledgeIndex = skills.skillIndex.exists && skillIndexPath
            ? await services_1.services.fileService.readJSON(skillIndexPath).catch(() => null)
            : null;
        const featureIndexPath = Object.keys(knowledgeIndex?.documents || {})
            .find(documentPath => documentPath.replace(/\\/g, '/').endsWith('/docs/project/feature-index.md')
            || documentPath.replace(/\\/g, '/') === 'docs/project/feature-index.md') || null;
        const knowledgeSnapshot = {
            indexPath: skills.skillIndex.exists && skillIndexPath
                ? path.relative(targetPath, skillIndexPath).replace(/\\/g, '/')
                : null,
            featureIndexPath,
            documentCount: Object.keys(knowledgeIndex?.documents || {}).length,
            archivedChangeCount: Array.isArray(knowledgeIndex?.archived_changes)
                ? knowledgeIndex.archived_changes.length
                : 0,
            indexGeneratedAt: typeof knowledgeIndex?.generated === 'string' ? knowledgeIndex.generated : null,
        };
        const cacheInput = {
            projectPath: targetPath,
            mode: summary.mode,
            changeReady,
            activeChanges: activeChanges.map(change => ({
                name: change.name,
                workflowProfile: change.workflowProfile,
                status: change.status,
                progress: change.progress,
                currentStep: change.currentStep,
                summaryStatus: change.summaryStatus,
            })),
            queuedChanges: queuedChangeSnapshots.map(change => ({
                name: change.name,
                status: change.status,
                currentStep: change.currentStep,
            })),
            queueRun,
            docs: docsSnapshot,
            skills: skillsSnapshot,
            knowledge: knowledgeSnapshot,
            recommendedCommands,
        };
        const cacheKey = this.hashSessionCacheInput(cacheInput);
        const previousKey = await this.readPreviousSessionCacheKey(artifactPath);
        const cacheStatus = previousKey === null
            ? 'new'
            : previousKey === cacheKey
                ? 'hit'
                : 'refreshed';
        const artifact = {
            version: '1.0',
            generatedAt: now,
            projectPath: targetPath,
            initialized: summary.initialized,
            changeReady,
            mode: summary.mode,
            activeChanges,
            queuedChanges: queuedChangeSnapshots,
            queueRun,
            docs: docsSnapshot,
            skills: skillsSnapshot,
            knowledge: knowledgeSnapshot,
            cache: {
                key: cacheKey,
                previousKey,
                status: cacheStatus,
                generatedFrom: cacheInput,
                refreshCommand: (0, helpers_1.formatCliCommand)('ospec', 'session', targetPath),
                guidance: cacheStatus === 'hit'
                    ? 'Project entry state matches the previous session brief fingerprint.'
                    : 'Use this freshly written session brief before choosing the next project-level command.',
            },
            recommendedCommands,
            safetyRules: [
                'Use this brief as a project entrypoint only; it does not replace the active change documents.',
                activeChanges.length === 1
                    ? activeChanges[0].workflowProfile === 'goal'
                        ? 'When exactly one active Goal exists, run ospec execute bootstrap before dispatching workers.'
                        : 'A classic Change uses proposal.md, tasks.md, state.json, verification.md, and review.md directly; do not run Goal bootstrap, task graph, worker dispatch, or Loop commands.'
                    : 'When active work is ambiguous, inspect the profile-aware status before selecting Change or Goal commands.',
                'Do not launch workers, run tests, archive, merge, or edit source files from the session brief alone.',
                'Use ospec status, ospec changes status, and ospec progress when the repository state is ambiguous.',
            ],
            nextInstruction,
        };
        await services_1.services.fileService.writeJSON(artifactPath, artifact);
        await services_1.services.fileService.writeFile(reportPath, this.renderSessionBrief(artifact));
        return {
            projectPath: targetPath,
            artifactPath,
            reportPath,
            activeChangeCount: artifact.activeChanges.length,
            queuedChangeCount: artifact.queuedChanges.length,
            cacheStatus,
            cacheKey,
            nextInstruction,
        };
    }
    async writeSessionHook(projectPath) {
        const targetPath = path.resolve(projectPath);
        const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
        if (!structure.initialized) {
            throw new Error(`OSpec project is not initialized at ${targetPath}. Run ${(0, helpers_1.formatCliCommand)('ospec', 'init', targetPath)} first.`);
        }
        const generatedAt = new Date().toISOString();
        const hookDir = path.join(targetPath, '.ospec', 'hooks');
        const artifactPath = path.join(hookDir, 'session-start.json');
        const reportPath = path.join(hookDir, 'session-start.md');
        const usingOSpecPath = path.join(hookDir, 'using-ospec.json');
        const usingOSpecReportPath = path.join(hookDir, 'using-ospec.md');
        const sessionCommand = (0, helpers_1.formatCliCommand)('ospec', 'session', targetPath);
        const activeReport = await services_1.services.projectService.getActiveChangeStatusReport(targetPath);
        const activeChange = activeReport.changes.length === 1 ? activeReport.changes[0] : null;
        const activeGoal = activeChange?.workflowProfile === 'goal' ? activeChange : null;
        const activeChangeRoot = activeChange
            ? (path.isAbsolute(activeChange.path) ? activeChange.path : path.resolve(targetPath, activeChange.path))
            : null;
        const activeDecisionPath = activeChangeRoot
            ? path.relative(targetPath, path.join(activeChangeRoot, 'artifacts', 'agents', 'decisions')).replace(/\\/g, '/')
            : 'active-change artifacts/agents/decisions/ when decision gates exist';
        const profileReads = activeChangeRoot
            ? activeGoal
                ? [path.relative(targetPath, path.join(activeChangeRoot, 'artifacts', 'agents', 'bootstrap.json')).replace(/\\/g, '/')]
                : ['proposal.md', 'tasks.md', 'state.json', 'verification.md', 'review.md']
                    .map(fileName => path.relative(targetPath, path.join(activeChangeRoot, fileName)).replace(/\\/g, '/'))
            : [];
        const bootstrap = {
            projectEntryCommand: sessionCommand,
            activeWorkflowProfile: activeChange?.workflowProfile || null,
            activeChangeBootstrapCommand: activeGoal
                ? (0, helpers_1.formatCliCommand)('ospec', 'execute', 'bootstrap', activeGoal.path)
                : null,
            safeNextSource: '.ospec/session-brief.json recommendedCommands[0]',
            decisionGateSource: activeGoal
                ? 'active Goal artifacts/agents/bootstrap.json execution.decisions and artifacts/agents/decisions/'
                : 'active Change artifacts/agents/decisions/',
            pluginGateSource: 'project .skillrc plugin configuration and active-change plugin artifacts',
            requiredReads: [
                '.ospec/session-brief.json',
                '.ospec/session-brief.md',
                ...profileReads,
                activeDecisionPath,
            ],
        };
        const injection = {
            prompt: 'Use OSpec context before changing files: refresh the project session brief, follow the safe next command, and pause on required user decisions.',
            afterSessionStart: [
                `Run ${sessionCommand} or read the freshly written .ospec/session-brief.json.`,
                activeGoal
                    ? `Run ${bootstrap.activeChangeBootstrapCommand} before dispatch, launch, review, verification, or finish.`
                    : activeChange
                        ? `Continue the classic Change from ${activeChange.path}/proposal.md and tasks.md; do not run Goal bootstrap, task graph, worker dispatch, or Loop commands.`
                        : 'Follow the profile-aware recommendedCommands in the refreshed session brief.',
                'If active decision artifacts report required pending user decisions, ask the user to choose and record the answer with ospec execute decision before continuing.',
                'Treat plugin gates as project/change artifacts; do not approve, reject, dispatch, or run plugin work implicitly.',
            ],
        };
        const artifact = {
            version: '1.0',
            generatedAt,
            projectPath: targetPath,
            sessionCommand,
            artifacts: {
                sessionBriefJson: path.relative(targetPath, path.join(targetPath, '.ospec', 'session-brief.json')).replace(/\\/g, '/'),
                sessionBriefMarkdown: path.relative(targetPath, path.join(targetPath, '.ospec', 'session-brief.md')).replace(/\\/g, '/'),
                usingOSpecJson: path.relative(targetPath, usingOSpecPath).replace(/\\/g, '/'),
                usingOSpecMarkdown: path.relative(targetPath, usingOSpecReportPath).replace(/\\/g, '/'),
            },
            bootstrap,
            injection,
            harnessTargets: this.buildSessionHookHarnessTargets(),
            integration: {
                shell: `cd ${this.quoteShellArg(targetPath)} && ${sessionCommand}`,
                powershell: `Set-Location -LiteralPath ${JSON.stringify(targetPath)}; ${sessionCommand}`,
                description: 'Run this command at the start of a coding session to refresh project context before choosing the next OSpec action.',
            },
            safetyRules: [
                'This hook refreshes session context only.',
                'It must not launch workers, run tests, inspect git status, archive changes, or edit project source files.',
                'Use the generated session brief to choose the next explicit command.',
                'Keep harness-specific startup automation opt-in; do not assume every environment can run session hooks automatically.',
            ],
            nextInstruction: `Install or call this hook from your harness session-start step, or run ${sessionCommand} manually at session start.`,
        };
        await services_1.services.fileService.ensureDir(hookDir);
        await services_1.services.fileService.writeJSON(artifactPath, artifact);
        await services_1.services.fileService.writeFile(reportPath, this.renderSessionHook(artifact));
        await services_1.services.fileService.writeJSON(usingOSpecPath, {
            version: artifact.version,
            generatedAt: artifact.generatedAt,
            projectPath: artifact.projectPath,
            bootstrap: artifact.bootstrap,
            injection: artifact.injection,
            harnessTargets: artifact.harnessTargets,
            safetyRules: artifact.safetyRules,
            nextInstruction: artifact.nextInstruction,
        });
        await services_1.services.fileService.writeFile(usingOSpecReportPath, this.renderUsingOSpec(artifact));
        return {
            projectPath: targetPath,
            artifactPath,
            reportPath,
            usingOSpecPath,
            usingOSpecReportPath,
            sessionCommand,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async readPreviousSessionCacheKey(artifactPath) {
        if (!await services_1.services.fileService.exists(artifactPath)) {
            return null;
        }
        try {
            const previous = await services_1.services.fileService.readJSON(artifactPath);
            return typeof previous?.cache?.key === 'string' && previous.cache.key.trim().length > 0
                ? previous.cache.key
                : null;
        }
        catch {
            return null;
        }
    }
    hashSessionCacheInput(input) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(input))
            .digest('hex');
    }
    buildRecommendedCommands(projectPath, changeReady, activeChanges, queuedChanges, runReport) {
        const commands = [];
        const formatCommand = (...args) => (0, helpers_1.formatCliCommand)('ospec', ...args);
        if (!changeReady) {
            return [
                {
                    label: 'Repair project knowledge',
                    command: formatCommand('docs', 'generate', projectPath),
                },
                {
                    label: 'Inspect project status',
                    command: formatCommand('status', projectPath),
                },
            ];
        }
        if (activeChanges.length === 0 && queuedChanges.length === 0) {
            return [
                {
                    label: 'Create one active change',
                    command: formatCommand('new', '<change-name>', projectPath),
                },
                {
                    label: 'Inspect project status',
                    command: formatCommand('status', projectPath),
                },
            ];
        }
        if (activeChanges.length === 0 && queuedChanges.length > 0) {
            commands.push({
                label: 'Activate next queued change',
                command: formatCommand('queue', 'next', projectPath),
            });
            commands.push({
                label: 'Start explicit queue tracking',
                command: formatCommand('run', 'start', projectPath),
            });
            return commands;
        }
        if (activeChanges.length > 1) {
            return [
                {
                    label: 'Inspect active changes',
                    command: formatCommand('changes', 'status', projectPath),
                },
                {
                    label: 'Inspect project status',
                    command: formatCommand('status', projectPath),
                },
            ];
        }
        const activeChange = activeChanges[0];
        if (activeChange.workflowProfile === 'change') {
            if (activeChange.archiveReady || activeChange.status === 'ready_to_archive') {
                commands.push({
                    label: 'Finalize ready classic change',
                    command: formatCommand('finalize', activeChange.path),
                });
            }
            commands.push({
                label: 'Continue classic change',
                command: formatCommand('progress', activeChange.path),
            });
            commands.push({
                label: 'Verify classic change before closeout',
                command: formatCommand('verify', activeChange.path),
            });
            if (queuedChanges.length > 0) {
                commands.push({
                    label: 'Continue explicit queue tracking after active change',
                    command: formatCommand('run', runReport.currentRun ? 'step' : 'start', projectPath),
                });
            }
            return commands;
        }
        commands.push({
            label: 'Refresh active Goal bootstrap',
            command: formatCommand('execute', 'bootstrap', activeChange.path),
        });
        commands.push({
            label: 'Inspect task graph controller',
            command: formatCommand('execute', 'status', activeChange.path),
        });
        commands.push({
            label: 'Show active change progress',
            command: formatCommand('progress', activeChange.path),
        });
        commands.push({
            label: 'Verify before archive readiness claims',
            command: formatCommand('verify', activeChange.path),
        });
        if (queuedChanges.length > 0) {
            commands.push({
                label: 'Continue explicit queue tracking after active change',
                command: formatCommand('run', runReport.currentRun ? 'step' : 'start', projectPath),
            });
        }
        return commands;
    }
    buildSessionHookHarnessTargets() {
        return [
            {
                target: 'codex',
                startupUse: 'Read using-ospec.md, run ospec session, and follow its profile-aware recommendedCommands; bootstrap only an active Goal.',
                nativeExecution: 'Use native subagents through the current Codex harness only for a Goal after ospec execute dispatch and launch-plan review.',
            },
            {
                target: 'claude',
                startupUse: 'Load using-ospec.md as project context before starting an active change task.',
                nativeExecution: 'Use Claude Code Task only after dispatch artifacts and launch-plan.md are ready.',
            },
            {
                target: 'gemini',
                startupUse: 'Read using-ospec.md, refresh session context, and follow the profile-aware nextInstruction.',
                nativeExecution: 'Use @generalist workers only for dispatch packets marked ready.',
            },
            {
                target: 'opencode',
                startupUse: 'Load the session-start artifact and refresh .ospec/session-brief.json at session entry.',
                nativeExecution: 'Use @mention worker routing from launch-plan.md after dispatch.',
            },
            {
                target: 'cursor',
                startupUse: 'Use using-ospec.md as the pinned session-start checklist before code edits.',
                nativeExecution: 'Use Cursor-native task/chat handoff only after OSpec dispatch packets exist.',
            },
            {
                target: 'copilot',
                startupUse: 'Use using-ospec.md as repository instruction context and run the session command manually when needed.',
                nativeExecution: 'Use the Copilot native task context from launch-plan.md; stop if native subagents are unavailable.',
            },
            {
                target: 'generic',
                startupUse: 'Run the session command and follow recommendedCommands; bootstrap only when the single active item is a Goal.',
                nativeExecution: 'Dispatch native agents only when the host harness has an equivalent safe worker mechanism.',
            },
        ];
    }
    renderSessionBrief(brief) {
        const activeChanges = brief.activeChanges.length > 0
            ? brief.activeChanges
                .map(change => `- ${change.name} [${change.workflowProfile}]: ${change.status}, ${change.progress}%, ${change.summaryStatus} (${change.path})`)
                .join('\n')
            : '- None';
        const queuedChanges = brief.queuedChanges.length > 0
            ? brief.queuedChanges
                .map(change => `- ${change.name}: ${change.status} (${change.path})`)
                .join('\n')
            : '- None';
        const commands = brief.recommendedCommands.length > 0
            ? brief.recommendedCommands
                .map(item => `- ${item.label}: \`${item.command}\``)
                .join('\n')
            : '- No command recommendation available.';
        const safetyRules = brief.safetyRules.map(rule => `- ${rule}`).join('\n');
        return [
            '# OSpec Session Brief',
            '',
            `- Generated at: ${brief.generatedAt}`,
            `- Project path: ${brief.projectPath}`,
            `- Initialized: ${brief.initialized ? 'yes' : 'no'}`,
            `- Change ready: ${brief.changeReady ? 'yes' : 'no'}`,
            `- Mode: ${brief.mode || 'unknown'}`,
            '',
            '## Project Health',
            '',
            `- Docs coverage: ${brief.docs.coverage}%`,
            `- Missing required docs: ${brief.docs.missingRequired.length}`,
            `- Skill files: ${brief.skills.existing}/${brief.skills.total}`,
            `- Skill index: ${brief.skills.indexPresent ? 'present' : 'missing'}`,
            `- Skill index needs rebuild: ${brief.skills.indexNeedsRebuild ? 'yes' : 'no'}`,
            `- Knowledge index: ${brief.knowledge.indexPath || 'missing'}`,
            `- Feature index: ${brief.knowledge.featureIndexPath || 'missing'}`,
            `- Indexed docs: ${brief.knowledge.documentCount}`,
            `- Archived features: ${brief.knowledge.archivedChangeCount}`,
            '',
            '## Cache',
            '',
            `- Status: ${brief.cache.status}`,
            `- Key: ${brief.cache.key}`,
            `- Previous key: ${brief.cache.previousKey || 'none'}`,
            `- Refresh command: \`${brief.cache.refreshCommand}\``,
            `- Guidance: ${brief.cache.guidance}`,
            '',
            '## Active Changes',
            '',
            activeChanges,
            '',
            '## Queued Changes',
            '',
            queuedChanges,
            '',
            '## Queue Run',
            '',
            `- Status: ${brief.queueRun.status}`,
            `- Profile: ${brief.queueRun.profile || 'none'}`,
            `- Stage: ${brief.queueRun.stage || 'none'}`,
            `- Next: ${brief.queueRun.nextInstruction || 'none'}`,
            '',
            '## Recommended Commands',
            '',
            commands,
            '',
            '## Safety Rules',
            '',
            safetyRules,
            '',
            '## Next Instruction',
            '',
            brief.nextInstruction,
            '',
        ].join('\n');
    }
    renderSessionHook(artifact) {
        const safetyRules = artifact.safetyRules.map(rule => `- ${rule}`).join('\n');
        const targets = artifact.harnessTargets
            .map(target => `- ${target.target}: ${target.startupUse}`)
            .join('\n');
        const requiredReads = artifact.bootstrap.requiredReads.map(item => `- ${item}`).join('\n');
        return [
            '# OSpec Session Start Hook',
            '',
            `- Generated at: ${artifact.generatedAt}`,
            `- Project path: ${artifact.projectPath}`,
            `- Session command: \`${artifact.sessionCommand}\``,
            `- Session JSON: ${artifact.artifacts.sessionBriefJson}`,
            `- Session Markdown: ${artifact.artifacts.sessionBriefMarkdown}`,
            `- Using OSpec JSON: ${artifact.artifacts.usingOSpecJson}`,
            `- Using OSpec Markdown: ${artifact.artifacts.usingOSpecMarkdown}`,
            '',
            '## Purpose',
            '',
            artifact.integration.description,
            '',
            '## Bootstrap Context',
            '',
            `- Project entry command: \`${artifact.bootstrap.projectEntryCommand}\``,
            `- Active workflow profile: ${artifact.bootstrap.activeWorkflowProfile || 'none'}`,
            `- Active change bootstrap command: ${artifact.bootstrap.activeChangeBootstrapCommand ? `\`${artifact.bootstrap.activeChangeBootstrapCommand}\`` : 'none'}`,
            `- Safe next source: ${artifact.bootstrap.safeNextSource}`,
            `- Decision gate source: ${artifact.bootstrap.decisionGateSource}`,
            `- Plugin gate source: ${artifact.bootstrap.pluginGateSource}`,
            '',
            '## Required Reads',
            '',
            requiredReads,
            '',
            '## Harness Targets',
            '',
            targets,
            '',
            '## Integration Snippets',
            '',
            `- Shell: \`${artifact.integration.shell}\``,
            `- PowerShell: \`${artifact.integration.powershell}\``,
            '',
            '## Safety Rules',
            '',
            safetyRules,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
        ].join('\n');
    }
    renderUsingOSpec(artifact) {
        const reads = artifact.bootstrap.requiredReads.map(item => `- ${item}`).join('\n');
        const steps = artifact.injection.afterSessionStart.map(item => `- ${item}`).join('\n');
        const targets = artifact.harnessTargets
            .map(target => [
            `### ${target.target}`,
            '',
            `- Startup: ${target.startupUse}`,
            `- Native execution: ${target.nativeExecution}`,
        ].join('\n'))
            .join('\n\n');
        const safetyRules = artifact.safetyRules.map(rule => `- ${rule}`).join('\n');
        return [
            '# Using OSpec',
            '',
            `- Generated at: ${artifact.generatedAt}`,
            `- Project path: ${artifact.projectPath}`,
            '',
            '## Session Start Prompt',
            '',
            artifact.injection.prompt,
            '',
            '## Bootstrap',
            '',
            `- Project entry command: \`${artifact.bootstrap.projectEntryCommand}\``,
            `- Active workflow profile: ${artifact.bootstrap.activeWorkflowProfile || 'none'}`,
            `- Active change bootstrap command: ${artifact.bootstrap.activeChangeBootstrapCommand ? `\`${artifact.bootstrap.activeChangeBootstrapCommand}\`` : 'none'}`,
            `- Safe next source: ${artifact.bootstrap.safeNextSource}`,
            `- Decision gate source: ${artifact.bootstrap.decisionGateSource}`,
            `- Plugin gate source: ${artifact.bootstrap.pluginGateSource}`,
            '',
            '## Required Reads',
            '',
            reads,
            '',
            '## Session Steps',
            '',
            steps,
            '',
            '## Harness Targets',
            '',
            targets,
            '',
            '## Safety Rules',
            '',
            safetyRules,
            '',
            '## Next Instruction',
            '',
            artifact.nextInstruction,
            '',
        ].join('\n');
    }
    quoteShellArg(value) {
        if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
            return value;
        }
        return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
    }
    printSessionBrief(result) {
        console.log('\nOSpec Session Brief');
        console.log('===================\n');
        console.log(`Project path: ${result.projectPath}`);
        console.log(`Active changes: ${result.activeChangeCount}`);
        console.log(`Queued changes: ${result.queuedChangeCount}`);
        console.log(`Cache: ${result.cacheStatus} (${result.cacheKey})`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printClaudeHookInstall(result, apply) {
        console.log('\nClaude Code Hook Bundle');
        console.log('=======================\n');
        console.log(`Hook script: ${result.scriptPath}`);
        console.log(`Settings fragment: ${result.fragmentPath}`);
        if (apply && result.settingsPath) {
            console.log(`Settings: ${result.settingsPath} (${result.settingsChanged ? 'updated' : 'already current'})`);
        }
        else {
            console.log('Not applied. Run with --apply to merge into .claude/settings.json, or merge the fragment by hand.');
        }
        console.log('');
    }
    printSessionHook(result) {
        console.log('\nOSpec Session Start Hook');
        console.log('========================\n');
        console.log(`Project path: ${result.projectPath}`);
        console.log(`Session command: ${result.sessionCommand}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        console.log(`Using OSpec artifact: ${result.usingOSpecPath}`);
        console.log(`Using OSpec report: ${result.usingOSpecReportPath}`);
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
}
exports.SessionCommand = SessionCommand;
