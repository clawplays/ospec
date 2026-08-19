"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCommand = void 0;
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
class StatusCommand extends BaseCommand_1.BaseCommand {
    async execute(projectPath) {
        try {
            const targetPath = projectPath || process.cwd();
            this.logger.info(`Getting status for ${targetPath}`);
            const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
            const [summary, docs, skills, queuedChanges] = await Promise.all([
                services_1.services.projectService.getProjectSummary(targetPath),
                services_1.services.projectService.getDocsStatus(targetPath),
                services_1.services.projectService.getSkillsStatus(targetPath),
                services_1.services.queueService.getQueuedChanges(targetPath),
            ]);
            const projectConfig = structure.initialized
                ? await services_1.services.configManager.loadConfigOrNull(targetPath)
                : null;
            let execution = {
                totalActiveChanges: summary.activeChangeCount,
                byStatus: {},
                activeChanges: [],
            };
            let changes = {
                totals: { pass: 0, warn: 0, fail: 0 },
                damagedChanges: [],
            };
            let runReport = {
                currentRun: undefined,
                stage: undefined,
                nextInstruction: undefined,
            };
            if (structure.initialized) {
                [execution, changes, runReport] = await Promise.all([
                    services_1.services.projectService.getExecutionStatus(targetPath),
                    services_1.services.projectService.getActiveChangeStatusReport(targetPath),
                    services_1.services.runService.getStatusReport(targetPath),
                ]);
            }
            console.log('\nProject Status');
            console.log('==============\n');
            console.log(`Name: ${summary.name}`);
            console.log(`Path: ${summary.path}`);
            console.log(`Mode: ${summary.mode ?? 'uninitialized'}`);
            console.log(`Initialized: ${summary.initialized ? 'yes' : 'no'}`);
            console.log(`Change Ready: ${summary.initialized && docs.missingRequired.length === 0 ? 'yes' : 'no'}`);
            console.log(`Structure Level: ${summary.structureLevel}`);
            console.log(`Active Changes: ${summary.activeChangeCount}`);
            console.log(`Queued Changes: ${queuedChanges.length}`);
            console.log('\nStructure');
            console.log('---------');
            console.log(`Missing required: ${structure.missingRequired.length}`);
            if (structure.missingRequired.length > 0) {
                for (const item of structure.missingRequired) {
                    console.log(`  - ${item}`);
                }
            }
            console.log(`Missing recommended: ${structure.missingRecommended.length}`);
            if (structure.missingRecommended.length > 0) {
                for (const item of structure.missingRecommended.slice(0, 10)) {
                    console.log(`  - ${item}`);
                }
            }
            console.log('\nUpgrade suggestions:');
            for (const suggestion of structure.upgradeSuggestions) {
                console.log(`  - ${suggestion.title}: ${suggestion.description}`);
                for (const item of suggestion.paths.slice(0, 5)) {
                    console.log(`      ${item}`);
                }
            }
            console.log('\nDocs');
            console.log('----');
            console.log(`Coverage: ${docs.coverage}% (${docs.existing}/${docs.total})`);
            console.log(`Missing required docs: ${docs.missingRequired.length}`);
            console.log('\nSkills');
            console.log('------');
            console.log(`Skill files: ${skills.existing}/${skills.totalSkillFiles}`);
            console.log(`Skill index: ${skills.skillIndex.exists ? 'present' : 'missing'}`);
            if (skills.skillIndex.stats) {
                console.log(`Index stats: ${skills.skillIndex.stats.totalFiles} files, ${skills.skillIndex.stats.totalSections} sections`);
            }
            console.log('\nExecution');
            console.log('---------');
            console.log(`Active changes: ${execution.totalActiveChanges}`);
            console.log(`Queued changes: ${queuedChanges.length}`);
            for (const [status, count] of Object.entries(execution.byStatus)) {
                console.log(`  ${status}: ${count}`);
            }
            console.log(`Protocol summary: PASS ${changes.totals.pass} | WARN ${changes.totals.warn} | FAIL ${changes.totals.fail}`);
            // M-race1: a change whose state.json cannot be parsed is missing
            // from every count above. Saying so is the whole point of degrading
            // instead of aborting -- an unreported skip reads as "not present".
            if (changes.damagedChanges.length > 0) {
                console.log(`\nUnreadable changes: ${changes.damagedChanges.length} (excluded from the counts above)`);
                for (const damaged of changes.damagedChanges) {
                    console.log(`  - ${damaged.name}: ${damaged.reason}`);
                }
            }
            if (execution.totalActiveChanges > 1) {
                console.log('Workflow warning: multiple active changes detected. The default workflow expects one active change unless you are explicitly managing extra work as queued changes.');
            }
            if (execution.activeChanges.length > 0) {
                console.log('\nCurrent changes:');
                for (const change of execution.activeChanges) {
                    console.log(`  - ${change.name} [${change.status}] ${change.progress}%`);
                }
            }
            if (queuedChanges.length > 0) {
                console.log('\nQueued changes:');
                for (const change of queuedChanges) {
                    console.log(`  - ${change.name} [${change.status}]`);
                }
            }
            if (runReport.currentRun) {
                console.log('\nQueue Run');
                console.log('---------');
                console.log(`Status: ${runReport.currentRun.status}`);
                console.log(`Profile: ${runReport.currentRun.profileId}`);
                console.log(`Stage: ${runReport.stage ?? 'unknown'}`);
                if (runReport.nextInstruction) {
                    console.log(`Next: ${runReport.nextInstruction}`);
                }
            }
            console.log('\nRecommended Next Step');
            console.log('---------------------');
            for (const step of this.getRecommendedNextSteps(targetPath, structure, docs, execution, queuedChanges, runReport, projectConfig)) {
                console.log(`  - ${step}`);
            }
            console.log('');
        }
        catch (error) {
            this.error(`Failed to get status: ${error}`);
            throw error;
        }
    }
    getRecommendedNextSteps(projectPath, structure, docs, execution, queuedChanges, runReport, projectConfig) {
        const formatCommand = (...args) => (0, helpers_1.formatCliCommand)('ospec', ...args);
        if (!structure.initialized) {
            return [
                `Run "${formatCommand('init', projectPath)}" to initialize the repository to a change-ready state.`,
            ];
        }
        if (docs.missingRequired.length > 0 || docs.coverage < 100) {
            return [
                'The repository is initialized, but the project knowledge layer is still incomplete.',
                `Run "${formatCommand('init', projectPath)}" to reconcile the repository back to change-ready state and regenerate missing project knowledge docs.`,
                `If you only want to refresh or repair docs without rerunning full init messaging, use "${formatCommand('docs', 'generate', projectPath)}".`,
            ];
        }
        if (execution.totalActiveChanges === 0 && queuedChanges.length === 0) {
            // M-misc6: this was a bare "Or run ..." -- the only line in the
            // branch, opening with a conjunction that referred to a preceding
            // suggestion this branch does not print. It read as if the status
            // output had lost a line. The dead `require('path')` at the top of
            // this file went with it; nothing in the module used it.
            return [
                'The repository is change-ready and has no active or queued changes.',
                `Run "${formatCommand('new', '<change-name>', projectPath)}" to create the first change from the CLI, or start one from your agent.`,
            ];
        }
        if (execution.totalActiveChanges === 0 && queuedChanges.length > 0) {
            return [
                `There is no active change right now, but ${queuedChanges.length} queued change(s) are waiting.`,
                `Run "${formatCommand('queue', 'next', projectPath)}" if you want to activate the next queued change manually.`,
                `Or run "${formatCommand('run', 'start', projectPath)}" to begin explicit queue tracking.`,
            ];
        }
        if (execution.totalActiveChanges > 1) {
            return [
                `Multiple active changes are present. The default workflow expects one active change, but ${execution.totalActiveChanges} were found.`,
                `Resolve the repository back to a single active change before using "${formatCommand('run', 'start', projectPath)}".`,
                `For additional work, create queued changes explicitly with "${formatCommand('queue', 'add', '<change-name>', projectPath)}".`,
            ];
        }
        const currentChange = execution.activeChanges[0];
        const currentChangePath = (0, ProjectLayout_1.resolveManagedPath)(projectPath, `changes/active/${currentChange.name}`, projectConfig);
        const nextSteps = [
            `Continue the active change "${currentChange.name}" with "${formatCommand('progress', currentChangePath)}".`,
            `Run "${formatCommand('verify', currentChangePath)}" before trying to archive it.`,
        ];
        if (queuedChanges.length > 0) {
            nextSteps.push(`There are ${queuedChanges.length} queued change(s) waiting behind the active one. Use "${formatCommand('run', runReport.currentRun ? 'step' : 'start', projectPath)}" when you want explicit queue progression.`);
        }
        return nextSteps;
    }
}
exports.StatusCommand = StatusCommand;
