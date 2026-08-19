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
exports.ChangesCommand = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const ArchiveRenderer_1 = require("../services/ArchiveRenderer");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
// Per-change cap on printed non-passing checks in `ospec changes list`.
// Deliberately not a `/** */` block: a file-leading doc comment between the
// CommonJS requires and the first declaration is what the dist build's
// `moveLeadingDocCommentAfterUseStrict` step relocates, and this module already
// carries one canonicalization step.
const ISSUE_DISPLAY_LIMIT = 5;
class ChangesCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', projectPath, options = []) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getChangesHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                // 7.7b. Deliberately a `case` in this switch rather than an
                // early return above it: tests/cli/cli-help-accuracy scans this
                // file for `case '<action>':` to prove the help text only
                // advertises subcommands that exist. Handling an action outside
                // the switch would make it invisible to that guard -- the help
                // would promise a command the scanner could not confirm.
                //
                // `changes show <archive>` reads the positional argument as an
                // archive name rather than a path, so it takes the raw value
                // and finds the project through `--path`.
                case 'show': {
                    await this.showArchive(projectPath, options);
                    break;
                }
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
                            // A warning must never push a failure out of the
                            // printed window. The checks arrive in evaluation
                            // order, so an early WARN -- the unsupported-flags
                            // one fires fifth on a legacy change -- used to
                            // consume the whole cap and hide every FAIL behind
                            // it. Sort FAIL first, keep evaluation order within
                            // each severity, and say what was withheld.
                            const rankedIssues = issues
                                .map((issue, order) => ({ issue, order }))
                                .sort((left, right) => (left.issue.status === right.issue.status
                                ? left.order - right.order
                                : (left.issue.status === 'fail' ? -1 : 1)))
                                .map(entry => entry.issue);
                            for (const issue of rankedIssues.slice(0, ISSUE_DISPLAY_LIMIT)) {
                                console.log(`  ${issue.status.toUpperCase()} ${issue.name}: ${issue.message}`);
                            }
                            const hiddenIssues = rankedIssues.slice(ISSUE_DISPLAY_LIMIT);
                            if (hiddenIssues.length > 0) {
                                const hiddenFailCount = hiddenIssues.filter(issue => issue.status === 'fail').length;
                                console.log(`  ... ${hiddenIssues.length} more (${hiddenFailCount} FAIL); run "ospec verify ${change.path}" for the full list`);
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
    /**
     * 7.7b. Renders an archived change from the index entry plus the archive
     * directory, live. Writes nothing -- see ArchiveRenderer for why that is
     * the point rather than an incidental property.
     */
    async showArchive(query, options) {
        const format = options.includes('--json')
            ? 'json'
            : options.includes('--md') || options.includes('--markdown')
                ? 'md'
                : 'text';
        const pathFlagIndex = options.indexOf('--path');
        const projectRoot = pathFlagIndex >= 0 && options[pathFlagIndex + 1]
            ? options[pathFlagIndex + 1]
            : process.cwd();
        if (!query) {
            throw new Error('Usage: ospec changes show <archive-name> [--md|--json] [--path <dir>]');
        }
        const config = await services_1.services.configManager.loadConfig(projectRoot);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, 'SKILL.index.json', config);
        if (!(await services_1.services.fileService.exists(indexPath))) {
            throw new Error(`No ${path.basename(indexPath)} found. Run "ospec index build" first.`);
        }
        const index = await services_1.services.fileService.readJSON(indexPath);
        const entries = Array.isArray(index?.archived_changes) ? index.archived_changes : [];
        const lookup = (0, ArchiveRenderer_1.lookupArchive)(entries, query);
        if (lookup.kind === 'ambiguous') {
            console.log(`"${query}" matches ${lookup.candidates.length} archived changes:`);
            for (const candidate of lookup.candidates) {
                console.log(`  ${candidate.name}${candidate.entry.summary ? ` — ${String(candidate.entry.summary).slice(0, 80)}` : ''}`);
            }
            console.log('');
            console.log('Re-run with a longer prefix to pick one.');
            return;
        }
        if (lookup.kind === 'missing' || !lookup.match) {
            console.log(`No archived change matches "${query}".`);
            if (lookup.candidates.length > 0) {
                console.log('');
                console.log('Closest names:');
                for (const candidate of lookup.candidates)
                    console.log(`  ${candidate.name}`);
            }
            else {
                console.log('This project has no archived changes yet.');
            }
            console.log('');
            return;
        }
        const model = await (0, ArchiveRenderer_1.buildRenderModel)(projectRoot, lookup.match.entry);
        if (format === 'json')
            process.stdout.write((0, ArchiveRenderer_1.renderJson)(model));
        else if (format === 'md')
            process.stdout.write((0, ArchiveRenderer_1.renderMarkdown)(model));
        else
            console.log((0, ArchiveRenderer_1.renderText)(model));
    }
}
exports.ChangesCommand = ChangesCommand;
