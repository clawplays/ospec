"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImpactAnalyzer = exports.ImpactAnalyzer = void 0;
const path_1 = require("path");
const FileService_1 = require("../FileService");
const syncUtils_1 = require("./syncUtils");
class ImpactAnalyzer {
    constructor(fileService = FileService_1.fileService) {
        this.fileService = fileService;
    }
    async analyzeImpact(analysis) {
        const relevantFiles = analysis.affectedFiles.filter(item => (0, syncUtils_1.isAnalyzablePath)(item.path));
        const projectKnowledgeImpact = {
            needsUpdate: relevantFiles.length > 0,
            affectedDocs: relevantFiles.length > 0 ? (0, syncUtils_1.listProjectKnowledgeDocs)() : [],
            reason: relevantFiles.length > 0
                ? `Detected ${relevantFiles.length} source or manifest change(s)`
                : 'No source changes detected',
        };
        const skillMap = new Map();
        for (const file of relevantFiles.filter(item => (0, syncUtils_1.isCodeLikePath)(item.path))) {
            const skillPath = await (0, syncUtils_1.findNearestSkillFile)(analysis.rootDir, file.path);
            if (!skillPath) {
                continue;
            }
            const relativeSkillPath = (0, syncUtils_1.relativePath)(analysis.rootDir, skillPath);
            if (!skillMap.has(relativeSkillPath)) {
                skillMap.set(relativeSkillPath, {
                    skillFile: relativeSkillPath,
                    needsUpdate: true,
                    affectedSections: [],
                    changes: [],
                });
            }
        }
        if (skillMap.size === 0 && analysis.codeChanges.length > 0) {
            const rootSkillPath = (0, path_1.join)(analysis.rootDir, 'SKILL.md');
            if (await this.fileService.exists(rootSkillPath)) {
                const relativeRootSkill = (0, syncUtils_1.relativePath)(analysis.rootDir, rootSkillPath);
                skillMap.set(relativeRootSkill, {
                    skillFile: relativeRootSkill,
                    needsUpdate: true,
                    affectedSections: [],
                    changes: [],
                });
            }
        }
        const skillImpacts = Array.from(skillMap.values());
        const defaultSkill = skillImpacts[0];
        for (const change of analysis.codeChanges) {
            const matchingImpact = skillImpacts.find(item => this.isChangeInsideSkillScope(item.skillFile, change.file)) || defaultSkill;
            if (!matchingImpact) {
                continue;
            }
            if (!matchingImpact.affectedSections.includes(change.name)) {
                matchingImpact.affectedSections.push(change.name);
            }
            matchingImpact.changes.push(change);
        }
        skillImpacts.forEach(item => {
            item.affectedSections.sort((left, right) => left.localeCompare(right));
            item.changes.sort((left, right) => {
                if (left.file !== right.file) {
                    return left.file.localeCompare(right.file);
                }
                return left.name.localeCompare(right.name);
            });
        });
        return {
            projectKnowledgeImpact,
            skillFileImpacts: skillImpacts.sort((left, right) => left.skillFile.localeCompare(right.skillFile)),
        };
    }
    isChangeInsideSkillScope(skillFile, changedFile) {
        const skillDir = skillFile.replace(/\/SKILL\.md$/i, '');
        if (!skillDir) {
            return false;
        }
        return changedFile.startsWith(`${skillDir}/`);
    }
}
exports.ImpactAnalyzer = ImpactAnalyzer;
const createImpactAnalyzer = (fileService) => new ImpactAnalyzer(fileService);
exports.createImpactAnalyzer = createImpactAnalyzer;
