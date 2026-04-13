"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangesCommand = void 0;
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
class ChangesCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', projectPath) {
        try {
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'status':
                default: {
                    const [report, queuedChanges] = await Promise.all([
                        services_1.services.projectService.getActiveChangeStatusReport(targetPath),
                        services_1.services.queueService.getQueuedChanges(targetPath),
                    ]);
                    console.log('');
                    console.log('Active Changes');
                    console.log('==============');
                    console.log('');
                    console.log(`Total: ${report.totalActiveChanges}`);
                    console.log(`Queued: ${queuedChanges.length}`);
                    console.log(`PASS ${report.totals.pass} | WARN ${report.totals.warn} | FAIL ${report.totals.fail}`);
                    if (report.totalActiveChanges > 1) {
                        console.log('WORKFLOW WARN multiple active changes detected. The default workflow expects one active change, and queue runner commands will fail until the repository is back to single-active mode.');
                    }
                    console.log('');
                    if (report.changes.length === 0) {
                        console.log('No active changes.');
                        if (queuedChanges.length > 0) {
                            console.log('Queued changes are waiting.');
                        }
                        console.log('');
                        return;
                    }
                    for (const change of report.changes) {
                        console.log(`${change.summaryStatus.toUpperCase()} ${change.name} [${change.status}] ${change.progress}%`);
                        console.log(`  Path: ${change.path}`);
                        console.log(`  Step: ${change.currentStep}`);
                        if (change.flags.length > 0) {
                            console.log(`  Flags: ${change.flags.join(', ')}`);
                        }
                        const issues = change.checks.filter(check => check.status !== 'pass');
                        if (issues.length === 0) {
                            console.log('  Checks: all pass');
                        }
                        else {
                            for (const issue of issues.slice(0, 5)) {
                                console.log(`  ${issue.status.toUpperCase()} ${issue.name}: ${issue.message}`);
                            }
                        }
                        console.log('');
                    }
                    if (queuedChanges.length > 0) {
                        console.log('Queued Changes');
                        console.log('--------------');
                        queuedChanges.forEach(change => {
                            console.log(`QUEUED ${change.name} [${change.status}]`);
                            console.log(`  Path: ${change.path}`);
                            console.log(`  Step: ${change.currentStep}`);
                        });
                        console.log('');
                    }
                }
            }
        }
        catch (error) {
            this.error(`Changes command failed: ${error}`);
            throw error;
        }
    }
}
exports.ChangesCommand = ChangesCommand;
