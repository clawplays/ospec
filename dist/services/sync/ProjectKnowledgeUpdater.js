"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectKnowledgeUpdater = exports.ProjectKnowledgeUpdater = void 0;
const path_1 = require("path");
const FileService_1 = require("../FileService");
const syncUtils_1 = require("./syncUtils");
class ProjectKnowledgeUpdater {
    constructor(fileService = FileService_1.fileService) {
        this.fileService = fileService;
    }
    async updateProjectKnowledge(rootDir, impact, analysis, options = {}) {
        const affectedDocs = Array.isArray(impact.affectedDocs) ? impact.affectedDocs : [];
        const packageManifest = await (0, syncUtils_1.readPackageManifest)(rootDir);
        const result = {
            updatedFiles: [],
            createdFiles: [],
            skippedFiles: [],
            changes: [],
        };
        for (const relativeDocPath of affectedDocs) {
            const absoluteDocPath = (0, path_1.join)(rootDir, relativeDocPath);
            const existed = await this.fileService.exists(absoluteDocPath);
            const before = existed ? await this.fileService.readFile(absoluteDocPath) : this.createDocumentShell(relativeDocPath);
            const title = this.getManagedTitle(relativeDocPath);
            const body = this.buildManagedBody(relativeDocPath, analysis, packageManifest, options);
            const after = (0, syncUtils_1.upsertManagedSection)(before, 'document-sync', title, body, options.fingerprint || '000000000000');
            if (after === before) {
                result.skippedFiles.push(relativeDocPath);
                continue;
            }
            if (!options.dryRun) {
                await this.fileService.writeFile(absoluteDocPath, after);
            }
            if (existed) {
                result.updatedFiles.push(relativeDocPath);
            }
            else {
                result.createdFiles.push(relativeDocPath);
            }
            result.changes.push({
                file: relativeDocPath,
                section: title.replace(/^##\s+/, ''),
                oldContent: before,
                newContent: after,
                reason: impact.reason,
            });
        }
        return result;
    }
    createDocumentShell(relativeDocPath) {
        const base = relativeDocPath.split('/').pop() || relativeDocPath;
        const title = base.replace(/\.md$/i, '').replace(/-/g, ' ');
        return `# ${title}\n`;
    }
    getManagedTitle(relativeDocPath) {
        switch (relativeDocPath) {
            case 'docs/project/overview.md':
                return '## 文档同步摘要';
            case 'docs/project/tech-stack.md':
                return '## 文档同步技术补充';
            case 'docs/project/architecture.md':
                return '## 文档同步架构补充';
            case 'docs/project/module-map.md':
                return '## 文档同步涉及模块';
            case 'docs/project/api-overview.md':
                return '## 文档同步识别接口';
            default:
                return '## 文档同步记录';
        }
    }
    buildManagedBody(relativeDocPath, analysis, packageManifest, options) {
        const lines = [
            `- 同步时间: ${new Date().toISOString()}`,
            `- 对应 change: \`${analysis.changeName}\``,
            `- 受影响文件数: ${analysis.affectedFiles.length}`,
            `- 受影响模块: ${analysis.affectedModules.length > 0 ? analysis.affectedModules.join(', ') : '无'}`,
        ];
        if (relativeDocPath === 'docs/project/overview.md') {
            lines.push('', '### 变更摘要', '', analysis.summary);
        }
        if (relativeDocPath === 'docs/project/tech-stack.md') {
            const runtimeDeps = Object.keys(packageManifest?.dependencies || {});
            const devDeps = Object.keys(packageManifest?.devDependencies || {});
            lines.push('', '### 包清单快照', '');
            lines.push(`- 运行时依赖: ${runtimeDeps.length > 0 ? runtimeDeps.join(', ') : '无'}`);
            lines.push(`- 开发依赖: ${devDeps.length > 0 ? devDeps.join(', ') : '无'}`);
        }
        if (relativeDocPath === 'docs/project/architecture.md') {
            lines.push('', '### 同步核心组件', '');
            lines.push('- ChangeAnalyzer: 收集 change 影响文件和代码结构');
            lines.push('- ImpactAnalyzer: 将代码变化映射到项目文档和 SKILL');
            lines.push('- ProjectKnowledgeUpdater: 更新 docs/project 托管块');
            lines.push('- SkillFileUpdater: 更新 SKILL.md 托管块');
            lines.push('- DocumentSyncOrchestrator: 统一调度 dry-run、同步和状态检查');
        }
        if (relativeDocPath === 'docs/project/module-map.md') {
            lines.push('', '### 模块列表', '');
            if (analysis.affectedModules.length === 0) {
                lines.push('- 无');
            }
            else {
                for (const moduleName of analysis.affectedModules) {
                    lines.push(`- ${moduleName}`);
                }
            }
            lines.push('', '### 变更文件', '');
            for (const file of analysis.affectedFiles) {
                lines.push(`- ${file.path} [${file.type}]`);
            }
        }
        if (relativeDocPath === 'docs/project/api-overview.md') {
            lines.push('', '### 识别到的导出 / 符号', '');
            if (analysis.codeChanges.length === 0) {
                lines.push('- 无');
            }
            else {
                for (const change of analysis.codeChanges) {
                    lines.push(`- \`${change.signature || change.name}\` (${change.type}, ${change.changeType})`);
                }
            }
        }
        if (options.dryRun) {
            lines.push('', '- 模式: dry-run');
        }
        return lines.join('\n');
    }
}
exports.ProjectKnowledgeUpdater = ProjectKnowledgeUpdater;
const createProjectKnowledgeUpdater = (fileService) => new ProjectKnowledgeUpdater(fileService);
exports.createProjectKnowledgeUpdater = createProjectKnowledgeUpdater;
