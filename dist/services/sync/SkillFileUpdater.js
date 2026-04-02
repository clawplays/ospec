"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSkillFileUpdater = exports.SkillFileUpdater = void 0;
const path_1 = require("path");
const FileService_1 = require("../FileService");
const syncUtils_1 = require("./syncUtils");
class SkillFileUpdater {
    constructor(fileService = FileService_1.fileService) {
        this.fileService = fileService;
    }
    async updateSkillFile(skillFile, impact, options = {}) {
        const absoluteSkillPath = (0, path_1.isAbsolute)(skillFile)
            ? skillFile
            : (0, path_1.resolve)(options.rootDir || process.cwd(), skillFile);
        const relativeSkillPath = options.rootDir ? (0, syncUtils_1.relativePath)(options.rootDir, absoluteSkillPath) : skillFile.replace(/\\/g, '/');
        const existed = await this.fileService.exists(absoluteSkillPath);
        const before = existed ? await this.fileService.readFile(absoluteSkillPath) : this.createSkillShell(relativeSkillPath);
        const body = this.buildManagedBody(impact, options);
        const after = (0, syncUtils_1.upsertManagedSection)(before, 'document-sync', '## 文档同步生成', body, options.fingerprint || '000000000000');
        if (after !== before && !options.dryRun) {
            await this.fileService.writeFile(absoluteSkillPath, after);
        }
        return {
            updatedFiles: after !== before && existed ? [relativeSkillPath] : [],
            createdFiles: after !== before && !existed ? [relativeSkillPath] : [],
            skippedFiles: after === before ? [relativeSkillPath] : [],
            changes: after === before
                ? []
                : [{
                        file: relativeSkillPath,
                        section: '文档同步生成',
                        oldContent: before,
                        newContent: after,
                        reason: 'Update SKILL managed sync section',
                    }],
        };
    }
    createSkillShell(relativeSkillPath) {
        const baseName = relativeSkillPath === 'SKILL.md'
            ? 'project-root'
            : relativeSkillPath.replace(/\/SKILL\.md$/i, '').replace(/\//g, '-');
        const title = baseName === 'project-root' ? 'Project Skill' : `${baseName} Skill`;
        return [
            '---',
            `name: ${baseName}`,
            `title: "${title}"`,
            'tags: [sync, generated]',
            '---',
            '',
            `# ${title}`,
            '',
            '## 概览',
            '',
            '- 自动生成的技能说明文件',
            '',
        ].join('\n');
    }
    buildManagedBody(impact, options) {
        const lines = [
            `- 同步时间: ${new Date().toISOString()}`,
            `- 变更符号数: ${impact.changes.length}`,
            `- 受影响章节: ${impact.affectedSections.length > 0 ? impact.affectedSections.join(', ') : '无'}`,
        ];
        if (options.changeName) {
            lines.push(`- 对应 change: \`${options.changeName}\``);
        }
        lines.push('', '### 受影响符号', '');
        if (impact.changes.length === 0) {
            lines.push('- 无');
        }
        else {
            for (const change of impact.changes) {
                const jsdocSuffix = change.jsdoc ? ` - ${change.jsdoc}` : '';
                lines.push(`- \`${change.signature || change.name}\` (${change.file}, ${change.changeType})${jsdocSuffix}`);
            }
        }
        if (options.dryRun) {
            lines.push('', '- 模式: dry-run');
        }
        return lines.join('\n');
    }
}
exports.SkillFileUpdater = SkillFileUpdater;
const createSkillFileUpdater = (fileService) => new SkillFileUpdater(fileService);
exports.createSkillFileUpdater = createSkillFileUpdater;
