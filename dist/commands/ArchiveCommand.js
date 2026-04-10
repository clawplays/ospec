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
exports.ArchiveCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const ArchiveGate_1 = require("../workflow/ArchiveGate");
const PluginWorkflowComposer_1 = require("../workflow/PluginWorkflowComposer");
const BaseCommand_1 = require("./BaseCommand");
class ArchiveCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath, options = {}) {
        await this.run(featurePath, options);
    }
    async run(featurePath, options = {}) {
        try {
            const targetPath = path.resolve(featurePath || process.cwd());
            const checkOnly = options.checkOnly === true;
            this.logger.info(`${checkOnly ? 'Checking archive readiness' : 'Archiving change'} at ${targetPath}`);
            const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
            const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
            const tasksPath = path.join(targetPath, constants_1.FILE_NAMES.TASKS);
            const verificationPath = path.join(targetPath, constants_1.FILE_NAMES.VERIFICATION);
            const projectRoot = path.resolve(targetPath, '..', '..', '..');
            const expectedParent = path.join(projectRoot, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
            if (path.dirname(targetPath) !== expectedParent) {
                throw new Error('Archive target must be a change directory under changes/active.');
            }
            if (!(await services_1.services.fileService.exists(statePath))) {
                throw new Error('Change state file not found.');
            }
            const featureState = await services_1.services.fileService.readJSON(statePath);
            const config = await services_1.services.configManager.loadConfig(projectRoot);
            const workflow = new PluginWorkflowComposer_1.PluginWorkflowComposer(config);
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(proposalPath));
            const tasks = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(tasksPath));
            const verification = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(verificationPath));
            const flags = Array.isArray(proposal.data.flags) ? proposal.data.flags : [];
            const activatedSteps = workflow.getActivatedSteps(flags);
            const tasksOptionalSteps = Array.isArray(tasks.data.optional_steps) ? tasks.data.optional_steps : [];
            const verificationOptionalSteps = Array.isArray(verification.data.optional_steps)
                ? verification.data.optional_steps
                : [];
            const passedOptionalSteps = Array.isArray(verification.data.passed_optional_steps)
                ? verification.data.passed_optional_steps
                : [];
            const archiveConfig = config.workflow?.archive_gate || {
                require_verification: true,
                require_skill_update: true,
                require_index_regenerated: true,
                require_optional_steps_passed: true,
            };
            const result = await ArchiveGate_1.archiveGate.checkArchiveReadiness(featureState, archiveConfig, {
                activatedSteps,
                tasksOptionalSteps,
                verificationOptionalSteps,
                passedOptionalSteps,
                tasksComplete: !/- \[ \]/.test(tasks.content),
                verificationComplete: !/- \[ \]/.test(verification.content),
            });
            if (activatedSteps.includes('stitch_design_review')) {
                const approvalPath = path.join(targetPath, 'artifacts', 'stitch', 'approval.json');
                const approvalExists = await services_1.services.fileService.exists(approvalPath);
                if (!approvalExists) {
                    result.blockers.push('artifacts/stitch/approval.json is required before archiving');
                }
                else {
                    const approval = await services_1.services.fileService.readJSON(approvalPath);
                    const approvalStatus = typeof approval.status === 'string' ? approval.status : 'pending';
                    const hasPreviewUrl = typeof approval.preview_url === 'string' && approval.preview_url.trim().length > 0;
                    const hasSubmittedAt = typeof approval.submitted_at === 'string' && approval.submitted_at.trim().length > 0;
                    if (approval.step !== 'stitch_design_review') {
                        result.blockers.push('Stitch approval artifact step must be stitch_design_review');
                    }
                    if (!hasPreviewUrl) {
                        result.blockers.push('Stitch preview URL must be recorded before archiving');
                    }
                    if (!hasSubmittedAt) {
                        result.blockers.push('Stitch submission timestamp must be recorded before archiving');
                    }
                    if (approvalStatus !== 'approved') {
                        result.blockers.push(`Stitch design review must be approved before archiving (current: ${approvalStatus})`);
                    }
                }
            }
            const activeCheckpointSteps = activatedSteps.filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
            if (activeCheckpointSteps.length > 0) {
                const checkpointDir = path.join(targetPath, 'artifacts', 'checkpoint');
                const gatePath = path.join(checkpointDir, 'gate.json');
                const resultPath = path.join(checkpointDir, 'result.json');
                const summaryPath = path.join(checkpointDir, 'summary.md');
                const gateExists = await services_1.services.fileService.exists(gatePath);
                if (!gateExists) {
                    result.blockers.push('artifacts/checkpoint/gate.json is required before archiving');
                }
                else {
                    const gate = await services_1.services.fileService.readJSON(gatePath);
                    if (gate.plugin !== 'checkpoint') {
                        result.blockers.push('Checkpoint gate artifact plugin must be checkpoint');
                    }
                    if (gate.status !== 'passed') {
                        result.blockers.push(`Checkpoint gate must be passed before archiving (current: ${gate.status || 'missing'})`);
                    }
                    for (const stepName of activeCheckpointSteps) {
                        const stepStatus = gate.steps?.[stepName]?.status || 'missing';
                        if (stepStatus !== 'passed') {
                            result.blockers.push(`Checkpoint step ${stepName} must be passed before archiving (current: ${stepStatus})`);
                        }
                    }
                }
                const resultExists = await services_1.services.fileService.exists(resultPath);
                const summaryExists = await services_1.services.fileService.exists(summaryPath);
                if (!resultExists && !summaryExists) {
                    result.blockers.push('Checkpoint result.json or summary.md is required before archiving');
                }
            }
            result.canArchive = result.blockers.length === 0;
            console.log('\nArchive Gate Check:');
            console.log('===================\n');
            for (const check of result.checks) {
                const icon = check.passed ? 'PASS' : 'FAIL';
                console.log(`${icon} ${check.name}`);
                console.log(`  ${check.message}\n`);
            }
            if (result.blockers.length > 0) {
                console.log('Blockers:');
                result.blockers.forEach(blocker => {
                    console.log(`  - ${blocker}`);
                });
                console.log();
            }
            if (result.warnings.length > 0) {
                console.log('Warnings:');
                result.warnings.forEach(warning => {
                    console.log(`  - ${warning}`);
                });
                console.log();
            }
            console.log('='.repeat(21) + '\n');
            if (result.canArchive) {
                if (checkOnly) {
                    this.success('Change is ready to archive');
                    return;
                }
                const archivePath = await this.performArchive(targetPath, projectRoot, featureState, config);
                this.success(`Change archived to ${archivePath}`);
                return archivePath;
            }
            else {
                this.error('Change cannot be archived. Please resolve blockers.');
                process.exit(1);
            }
        }
        catch (error) {
            this.error(`Archive check failed: ${error}`);
            throw error;
        }
    }
    async performArchive(targetPath, projectRoot, featureState, config) {
        const archivedRoot = path.join(projectRoot, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ARCHIVED);
        await services_1.services.fileService.ensureDir(archivedRoot);
        const archivePath = await this.resolveArchivePath(archivedRoot, featureState.feature, config);
        const nextState = {
            ...featureState,
            status: 'archived',
            current_step: 'archived',
            completed: Array.from(new Set([...featureState.completed, 'archived'])).sort((a, b) => a.localeCompare(b)),
            pending: featureState.pending.filter(step => step !== 'archived'),
            blocked_by: [],
        };
        await services_1.services.fileService.move(targetPath, archivePath);
        await services_1.services.stateManager.writeState(archivePath, nextState);
        await this.updateProposalStatus(archivePath, 'archived');
        await services_1.services.projectService.rebaseMovedChangeMarkdownLinks(targetPath, archivePath);
        await services_1.services.projectService.rebuildIndex(projectRoot);
        return this.toRelativePath(projectRoot, archivePath);
    }
    async updateProposalStatus(targetPath, status) {
        const proposalPath = path.join(targetPath, constants_1.FILE_NAMES.PROPOSAL);
        if (!(await services_1.services.fileService.exists(proposalPath))) {
            return;
        }
        const proposal = (0, helpers_1.parseFrontmatterDocument)(await services_1.services.fileService.readFile(proposalPath));
        proposal.data.status = status;
        await services_1.services.fileService.writeFile(proposalPath, (0, helpers_1.stringifyFrontmatter)(proposal.content, proposal.data));
    }
    async resolveArchivePath(archivedRoot, featureName, config) {
        const archiveLayout = config?.archive?.layout === 'month-day' ? 'month-day' : 'flat';
        const archiveDate = this.getLocalArchiveDateParts();
        if (archiveLayout === 'month-day') {
            const archiveDayRoot = path.join(archivedRoot, archiveDate.month, archiveDate.day);
            await services_1.services.fileService.ensureDir(archiveDayRoot);
            const archiveLeafName = await this.resolveArchiveLeafName(archiveDayRoot, featureName);
            return path.join(archiveDayRoot, archiveLeafName);
        }
        const archiveDirName = await this.resolveLegacyArchiveDirName(archivedRoot, archiveDate.day, featureName);
        return path.join(archivedRoot, archiveDirName);
    }
    async resolveArchiveLeafName(archiveDayRoot, featureName) {
        let candidate = featureName;
        let index = 2;
        while (await services_1.services.fileService.exists(path.join(archiveDayRoot, candidate))) {
            candidate = `${featureName}-${index}`;
            index += 1;
        }
        return candidate;
    }
    async resolveLegacyArchiveDirName(archivedRoot, archiveDay, featureName) {
        const baseName = `${archiveDay}-${featureName}`;
        let candidate = baseName;
        let index = 2;
        while (await services_1.services.fileService.exists(path.join(archivedRoot, candidate))) {
            candidate = `${baseName}-${index}`;
            index += 1;
        }
        return candidate;
    }
    getLocalArchiveDateParts() {
        const now = new Date();
        const year = String(now.getFullYear());
        const monthNumber = String(now.getMonth() + 1).padStart(2, '0');
        const dayNumber = String(now.getDate()).padStart(2, '0');
        return {
            month: `${year}-${monthNumber}`,
            day: `${year}-${monthNumber}-${dayNumber}`,
        };
    }
    toRelativePath(rootDir, targetPath) {
        return path.relative(rootDir, targetPath).replace(/\\/g, '/');
    }
}
exports.ArchiveCommand = ArchiveCommand;