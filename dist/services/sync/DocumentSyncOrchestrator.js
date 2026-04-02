"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentSyncOrchestrator = exports.DocumentSyncOrchestrator = void 0;
const path_1 = require("path");
const FileService_1 = require("../FileService");
const ChangeAnalyzer_1 = require("./ChangeAnalyzer");
const ImpactAnalyzer_1 = require("./ImpactAnalyzer");
const ProjectKnowledgeUpdater_1 = require("./ProjectKnowledgeUpdater");
const SkillFileUpdater_1 = require("./SkillFileUpdater");
const syncUtils_1 = require("./syncUtils");
class DocumentSyncOrchestrator {
    constructor(options = {}) {
        this.fileService = options.fileService || FileService_1.fileService;
        this.changeAnalyzer = options.changeAnalyzer || new ChangeAnalyzer_1.ChangeAnalyzer(this.fileService);
        this.impactAnalyzer = options.impactAnalyzer || new ImpactAnalyzer_1.ImpactAnalyzer(this.fileService);
        this.projectKnowledgeUpdater = options.projectKnowledgeUpdater || new ProjectKnowledgeUpdater_1.ProjectKnowledgeUpdater(this.fileService);
        this.skillFileUpdater = options.skillFileUpdater || new SkillFileUpdater_1.SkillFileUpdater(this.fileService);
    }
    async syncChangeDocuments(changePath, options = {}) {
        const normalizedOptions = this.normalizeOptions(options);
        const analysis = await this.changeAnalyzer.analyzeChange(changePath);
        const impact = await this.impactAnalyzer.analyzeImpact(analysis);
        const fingerprint = (0, syncUtils_1.createFingerprint)(analysis);
        const targetFiles = this.collectTargetFiles(analysis.rootDir, impact);
        if (normalizedOptions.dryRun) {
            return this.buildResult({
                success: true,
                updatedFiles: targetFiles,
                createdFiles: [],
                skippedFiles: [],
                errors: [],
                analysis,
                impact,
                fingerprint,
                dryRun: true,
            });
        }
        const backups = await this.captureBackups(analysis.rootDir, targetFiles);
        try {
            const knowledgeResult = normalizedOptions.updateProjectKnowledge
                ? await this.projectKnowledgeUpdater.updateProjectKnowledge(analysis.rootDir, impact.projectKnowledgeImpact, analysis, {
                    fingerprint,
                    dryRun: false,
                })
                : { updatedFiles: [], createdFiles: [], skippedFiles: [], changes: [] };
            const skillResults = [];
            if (normalizedOptions.updateSkillFiles) {
                for (const skillImpact of impact.skillFileImpacts) {
                    skillResults.push(await this.skillFileUpdater.updateSkillFile(skillImpact.skillFile, skillImpact, {
                        rootDir: analysis.rootDir,
                        fingerprint,
                        changeName: analysis.changeName,
                        dryRun: false,
                    }));
                }
            }
            const merged = this.mergeUpdateResults(knowledgeResult, skillResults);
            await this.updateChangeState((0, path_1.resolve)(changePath), fingerprint, merged.updatedFiles, merged.createdFiles);
            return this.buildResult({
                success: true,
                updatedFiles: merged.updatedFiles,
                createdFiles: merged.createdFiles,
                skippedFiles: merged.skippedFiles,
                errors: [],
                analysis,
                impact,
                fingerprint,
                dryRun: false,
            });
        }
        catch (error) {
            await this.restoreBackups(backups);
            return this.buildResult({
                success: false,
                updatedFiles: [],
                createdFiles: [],
                skippedFiles: [],
                errors: [{ message: error instanceof Error ? error.message : String(error) }],
                analysis,
                impact,
                fingerprint,
                dryRun: false,
            });
        }
    }
    async checkSyncStatus(changePath) {
        const analysis = await this.changeAnalyzer.analyzeChange(changePath);
        const impact = await this.impactAnalyzer.analyzeImpact(analysis);
        const fingerprint = (0, syncUtils_1.createFingerprint)(analysis);
        const targetFiles = this.collectTargetFiles(analysis.rootDir, impact);
        const outdatedFiles = [];
        for (const filePath of targetFiles) {
            const absolutePath = (0, path_1.join)(analysis.rootDir, filePath);
            if (!(await this.fileService.exists(absolutePath))) {
                outdatedFiles.push(filePath);
                continue;
            }
            const content = await this.fileService.readFile(absolutePath);
            const currentFingerprint = (0, syncUtils_1.extractManagedFingerprint)(content, 'document-sync');
            if (currentFingerprint !== fingerprint) {
                outdatedFiles.push(filePath);
            }
        }
        return {
            isSynced: outdatedFiles.length === 0,
            fingerprint,
            outdatedFiles,
            impactedFiles: targetFiles,
            summary: outdatedFiles.length === 0
                ? 'All managed documentation blocks are up to date'
                : `${outdatedFiles.length} file(s) need documentation sync`,
        };
    }
    normalizeOptions(options) {
        return {
            force: options.force === true,
            interactive: options.interactive === true,
            dryRun: options.dryRun === true,
            updateProjectKnowledge: options.updateProjectKnowledge !== false,
            updateSkillFiles: options.updateSkillFiles !== false,
        };
    }
    collectTargetFiles(rootDir, impact) {
        const files = new Set();
        for (const docPath of impact.projectKnowledgeImpact.affectedDocs || []) {
            files.add(docPath);
        }
        for (const skillImpact of impact.skillFileImpacts || []) {
            const relativeSkillPath = (0, path_1.isAbsolute)(skillImpact.skillFile)
                ? (0, syncUtils_1.relativePath)(rootDir, skillImpact.skillFile)
                : skillImpact.skillFile.replace(/\\/g, '/');
            files.add(relativeSkillPath);
        }
        return Array.from(files).sort((left, right) => left.localeCompare(right));
    }
    async captureBackups(rootDir, targetFiles) {
        const backups = [];
        for (const targetFile of targetFiles) {
            const absolutePath = (0, path_1.join)(rootDir, targetFile);
            const exists = await this.fileService.exists(absolutePath);
            backups.push({
                path: absolutePath,
                existed: exists,
                content: exists ? await this.fileService.readFile(absolutePath) : null,
            });
        }
        return backups;
    }
    async restoreBackups(backups) {
        for (const backup of backups) {
            if (backup.existed) {
                await this.fileService.writeFile(backup.path, backup.content || '');
            }
            else if (await this.fileService.exists(backup.path)) {
                await this.fileService.remove(backup.path);
            }
        }
    }
    mergeUpdateResults(knowledgeResult, skillResults) {
        const combined = {
            updatedFiles: [...knowledgeResult.updatedFiles],
            createdFiles: [...knowledgeResult.createdFiles],
            skippedFiles: [...knowledgeResult.skippedFiles],
        };
        for (const result of skillResults) {
            combined.updatedFiles.push(...result.updatedFiles);
            combined.createdFiles.push(...result.createdFiles);
            combined.skippedFiles.push(...result.skippedFiles);
        }
        combined.updatedFiles = Array.from(new Set(combined.updatedFiles)).sort((left, right) => left.localeCompare(right));
        combined.createdFiles = Array.from(new Set(combined.createdFiles)).sort((left, right) => left.localeCompare(right));
        combined.skippedFiles = Array.from(new Set(combined.skippedFiles)).sort((left, right) => left.localeCompare(right));
        return combined;
    }
    async updateChangeState(changePath, fingerprint, updatedFiles, createdFiles) {
        const statePath = (0, path_1.join)(changePath, 'state.json');
        if (!(await this.fileService.exists(statePath))) {
            return;
        }
        const state = await this.fileService.readJSON(statePath);
        state.documentSync = {
            fingerprint,
            lastSyncAt: new Date().toISOString(),
            syncedFiles: [...updatedFiles, ...createdFiles].sort((left, right) => left.localeCompare(right)),
            pendingUpdates: [],
        };
        state.last_updated = new Date().toISOString();
        await this.fileService.writeJSON(statePath, state);
    }
    buildResult(options) {
        return {
            success: options.success,
            updatedFiles: options.updatedFiles,
            createdFiles: options.createdFiles,
            skippedFiles: options.skippedFiles,
            errors: options.errors,
            report: this.buildReport(options),
            analysis: options.analysis,
            impact: options.impact,
            fingerprint: options.fingerprint,
        };
    }
    buildReport(options) {
        const lines = [
            `Change: ${options.analysis.changeName}`,
            `Fingerprint: ${options.fingerprint}`,
            `Affected files: ${options.analysis.affectedFiles.length}`,
            `Affected modules: ${options.analysis.affectedModules.length > 0 ? options.analysis.affectedModules.join(', ') : 'none'}`,
            `Project docs: ${options.impact.projectKnowledgeImpact.affectedDocs.length > 0
                ? options.impact.projectKnowledgeImpact.affectedDocs.join(', ')
                : 'none'}`,
            `Skill files: ${options.impact.skillFileImpacts.length > 0
                ? options.impact.skillFileImpacts.map(item => item.skillFile).join(', ')
                : 'none'}`,
        ];
        if (options.dryRun) {
            lines.push(`Dry run: would update ${options.updatedFiles.length} file(s)`);
        }
        else {
            lines.push(`Updated files: ${options.updatedFiles.length > 0 ? options.updatedFiles.join(', ') : 'none'}`);
            if (options.createdFiles.length > 0) {
                lines.push(`Created files: ${options.createdFiles.join(', ')}`);
            }
            if (options.skippedFiles.length > 0) {
                lines.push(`Skipped files: ${options.skippedFiles.join(', ')}`);
            }
        }
        if (options.errors.length > 0) {
            lines.push(`Errors: ${options.errors.map(item => item.message).join(' | ')}`);
        }
        return lines.join('\n');
    }
}
exports.DocumentSyncOrchestrator = DocumentSyncOrchestrator;
const createDocumentSyncOrchestrator = (options) => new DocumentSyncOrchestrator(options);
exports.createDocumentSyncOrchestrator = createDocumentSyncOrchestrator;
