"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIndexBuilder = exports.IndexBuilder = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const helpers_1 = require("../utils/helpers");
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes', 'for-ai']);
const ARCHIVED_DOCUMENTS = [
    'proposal.md',
    'design.md',
    'implementation-plan.md',
    'tasks.md',
    'verification.md',
    'review.md',
    'artifacts/reviews/final-review.md',
];
async function pathExists(targetPath) {
    try {
        await fs_1.promises.access(targetPath, fs_1.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function readJson(filePath) {
    return JSON.parse((await fs_1.promises.readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
}
class IndexBuilder {
    constructor(skillParser) {
        this.skillParser = skillParser;
    }
    async build(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        const archivedChanges = await this.scanArchivedChanges(rootDir, config);
        return this.buildSnapshot(rootDir, config, archivedChanges);
    }
    async buildSnapshot(rootDir, config, archivedChanges) {
        const projectLayout = (0, ProjectLayout_1.getProjectLayout)(config);
        const managedRoot = (0, ProjectLayout_1.getProjectManagedRoot)(rootDir, projectLayout);
        const modules = {};
        const tagIndex = {};
        const documents = {};
        let totalFiles = 0;
        let totalSections = 0;
        const visit = async (currentDir) => {
            const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) {
                        await visit(fullPath);
                    }
                    continue;
                }
                if (entry.name !== constants_1.FILE_NAMES.SKILL_MD) {
                    continue;
                }
                totalFiles++;
                const relativePath = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
                const content = await fs_1.promises.readFile(fullPath, 'utf-8');
                const parsed = this.skillParser.parseSkillFile(content);
                const moduleName = parsed.frontmatter.name || relativePath;
                const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
                const tags = parsed.frontmatter.tags || [];
                const sections = parsed.sections;
                totalSections += Object.keys(sections).length;
                modules[moduleName] = {
                    file: relativePath,
                    title,
                    tags,
                    sections,
                };
                for (const tag of tags) {
                    if (!tagIndex[tag]) {
                        tagIndex[tag] = [];
                    }
                    tagIndex[tag].push(moduleName);
                }
            }
        };
        if (await pathExists(managedRoot)) {
            await visit(managedRoot);
        }
        const docsRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs', projectLayout);
        if (await pathExists(docsRoot)) {
            await this.visitMarkdownDocuments(rootDir, docsRoot, documents);
        }
        for (const change of archivedChanges) {
            for (const documentPath of change.project_documents || []) {
                const document = documents[documentPath];
                if (!document)
                    continue;
                document.features = Array.from(new Set([...(document.features || []), change.feature])).sort();
            }
        }
        const activeChangesDir = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/active', projectLayout);
        const activeChanges = (await pathExists(activeChangesDir))
            ? (await fs_1.promises.readdir(activeChangesDir)).sort((left, right) => left.localeCompare(right))
            : [];
        for (const tag of Object.keys(tagIndex)) {
            tagIndex[tag] = tagIndex[tag].sort((left, right) => left.localeCompare(right));
        }
        return {
            version: '1.0',
            generated: new Date().toISOString(),
            git_commit: null,
            active_changes: activeChanges,
            stats: {
                totalFiles,
                totalModules: Object.keys(modules).length,
                totalSections,
            },
            modules,
            tagIndex,
            documents,
            archived_changes: archivedChanges,
        };
    }
    async write(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        const archivedChanges = await this.scanArchivedChanges(rootDir, config);
        await this.writeArchivedChangeKnowledgeDocuments(rootDir, config, archivedChanges);
        await this.writeFeatureIndex(rootDir, config, archivedChanges);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const previous = (await pathExists(indexPath))
            ? (await readJson(indexPath))
            : null;
        const index = await this.buildSnapshot(rootDir, config, archivedChanges);
        const previousComparable = previous ? this.stripVolatileFields(previous) : null;
        const nextComparable = this.stripVolatileFields(index);
        if (previous && JSON.stringify(previousComparable) === JSON.stringify(nextComparable)) {
            return previous;
        }
        const output = {
            ...index,
            generated: new Date().toISOString(),
        };
        await fs_1.promises.writeFile(indexPath, JSON.stringify(output, null, 2), 'utf-8');
        return output;
    }
    async createEmpty(rootDir) {
        const config = await this.readProjectConfig(rootDir);
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const previous = (await pathExists(indexPath))
            ? (await readJson(indexPath))
            : null;
        const index = {
            version: '1.0',
            generated: new Date().toISOString(),
            git_commit: null,
            active_changes: [],
            stats: {
                totalFiles: 0,
                totalModules: 0,
                totalSections: 0,
            },
            modules: {},
            tagIndex: {},
            documents: {},
            archived_changes: [],
        };
        if (previous && JSON.stringify(this.stripVolatileFields(previous)) === JSON.stringify(this.stripVolatileFields(index))) {
            return previous;
        }
        await fs_1.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
        return index;
    }
    stripVolatileFields(index) {
        const { generated: _generated, ...stable } = index;
        return stable;
    }
    async readProjectConfig(rootDir) {
        const configPath = path_1.default.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        if (!(await pathExists(configPath))) {
            return null;
        }
        try {
            return await readJson(configPath);
        }
        catch {
            return null;
        }
    }
    async visitMarkdownDocuments(rootDir, currentDir, documents) {
        const entries = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
            .sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await this.visitMarkdownDocuments(rootDir, fullPath, documents);
                continue;
            }
            if (!entry.name.toLowerCase().endsWith('.md') || entry.name === constants_1.FILE_NAMES.SKILL_MD) {
                continue;
            }
            const content = await fs_1.promises.readFile(fullPath, 'utf8');
            let documentFrontmatter = {};
            try {
                documentFrontmatter = (0, helpers_1.parseFrontmatterDocument)(content).data || {};
            }
            catch {
                documentFrontmatter = {};
            }
            let parsed;
            let invalidFrontmatter = false;
            try {
                parsed = this.skillParser.parseSkillFile(content);
            }
            catch {
                invalidFrontmatter = true;
                parsed = {
                    frontmatter: { name: '', tags: [] },
                    sections: this.skillParser.extractSections(content),
                    content,
                };
            }
            const relativePath = path_1.default.relative(rootDir, fullPath).replace(/\\/g, '/');
            const kind = this.inferDocumentKind(relativePath);
            const tags = Array.from(new Set([
                ...(parsed.frontmatter.tags || []),
                'documentation',
                kind,
                ...(invalidFrontmatter ? ['frontmatter-invalid'] : []),
            ])).sort();
            const title = parsed.frontmatter.title || parsed.frontmatter.name || Object.keys(parsed.sections)[0] || entry.name.replace(/\.md$/i, '');
            documents[relativePath] = {
                file: relativePath,
                title,
                tags,
                kind,
                sections: parsed.sections,
                features: this.readMetadataList(documentFrontmatter.features),
                modules: this.readMetadataList(documentFrontmatter.modules),
                aliases: this.readMetadataList(documentFrontmatter.aliases),
            };
        }
    }
    readMetadataList(value) {
        const items = Array.isArray(value)
            ? value.map(String)
            : typeof value === 'string'
                ? value.split(',')
                : [];
        const normalized = Array.from(new Set(items.map(item => item.trim()).filter(Boolean))).sort();
        return normalized.length > 0 ? normalized : undefined;
    }
    inferDocumentKind(relativePath) {
        const normalized = relativePath.replace(/\\/g, '/');
        if (normalized.includes('/docs/project/') || normalized.startsWith('docs/project/'))
            return 'project';
        if (normalized.includes('/docs/api/') || normalized.startsWith('docs/api/'))
            return 'api';
        if (normalized.includes('/docs/design/') || normalized.startsWith('docs/design/'))
            return 'design';
        if (normalized.includes('/docs/planning/') || normalized.startsWith('docs/planning/'))
            return 'planning';
        return 'other';
    }
    async scanArchivedChanges(rootDir, config) {
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/archived', config);
        if (!(await pathExists(archivedRoot)))
            return [];
        const entries = [];
        const visit = async (currentDir) => {
            const children = (await fs_1.promises.readdir(currentDir, { withFileTypes: true }))
                .sort((left, right) => left.name.localeCompare(right.name));
            if (children.some(entry => entry.isFile() && entry.name === constants_1.FILE_NAMES.STATE)) {
                const item = await this.readArchivedChange(rootDir, currentDir);
                if (item)
                    entries.push(item);
                return;
            }
            for (const child of children) {
                if (child.isDirectory())
                    await visit(path_1.default.join(currentDir, child.name));
            }
        };
        await visit(archivedRoot);
        return entries.sort((left, right) => right.archive.localeCompare(left.archive));
    }
    async readArchivedChange(rootDir, archiveDir) {
        try {
            const state = await readJson(path_1.default.join(archiveDir, constants_1.FILE_NAMES.STATE));
            if (state?.status !== 'archived')
                return null;
            const proposalPath = path_1.default.join(archiveDir, constants_1.FILE_NAMES.PROPOSAL);
            let summary = '';
            let affects = [];
            if (await pathExists(proposalPath)) {
                const proposalSource = await fs_1.promises.readFile(proposalPath, 'utf8');
                let proposalContent = proposalSource;
                try {
                    const proposal = (0, helpers_1.parseFrontmatterDocument)(proposalSource);
                    affects = Array.isArray(proposal.data.affects) ? proposal.data.affects.map(String).filter(Boolean) : [];
                    proposalContent = proposal.content;
                }
                catch {
                    proposalContent = proposalSource.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
                }
                summary = proposalContent
                    .split(/\r?\n\r?\n/)
                    .map(block => block.trim())
                    .find(block => block && !block.startsWith('#') && !block.startsWith('- '))
                    ?.replace(/\r?\n/g, ' ')
                    .trim() || '';
            }
            const documents = [];
            for (const relativePath of ARCHIVED_DOCUMENTS) {
                if (await pathExists(path_1.default.join(archiveDir, ...relativePath.split('/'))))
                    documents.push(relativePath);
            }
            const projectDocuments = new Set();
            const targetFiles = new Set();
            const verificationCommands = new Set();
            const taskGraphPath = path_1.default.join(archiveDir, 'artifacts', 'agents', constants_1.FILE_NAMES.TASK_GRAPH);
            if (await pathExists(taskGraphPath)) {
                try {
                    const taskGraph = await readJson(taskGraphPath);
                    for (const task of Array.isArray(taskGraph?.tasks) ? taskGraph.tasks : []) {
                        for (const targetFile of Array.isArray(task?.target_files) ? task.target_files : []) {
                            const normalized = String(targetFile || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                            if (normalized)
                                targetFiles.add(normalized);
                        }
                        for (const command of Array.isArray(task?.verification_commands) ? task.verification_commands : []) {
                            const normalized = String(command || '').trim();
                            if (normalized)
                                verificationCommands.add(normalized);
                        }
                        for (const documentPath of Array.isArray(task?.documentation_updates) ? task.documentation_updates : []) {
                            const normalized = String(documentPath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
                            if (normalized && await pathExists(path_1.default.join(rootDir, ...normalized.split('/')))) {
                                projectDocuments.add(normalized);
                            }
                        }
                    }
                }
                catch {
                    // A damaged task graph must not hide the rest of an archived change.
                }
            }
            const archive = path_1.default.relative(rootDir, archiveDir).replace(/\\/g, '/');
            const expectedKnowledgeDocument = this.getKnowledgeDocumentRelativePath(archive);
            const knowledgeDocument = expectedKnowledgeDocument
                && await pathExists(path_1.default.join(rootDir, ...expectedKnowledgeDocument.split('/')))
                ? expectedKnowledgeDocument
                : undefined;
            return {
                feature: typeof state.feature === 'string' && state.feature.trim() ? state.feature.trim() : path_1.default.basename(archiveDir),
                summary,
                affects: affects.sort(),
                archive,
                completed_at: typeof state.completed_at === 'string'
                    ? state.completed_at
                    : typeof state.last_updated === 'string'
                        ? state.last_updated
                        : null,
                documents,
                project_documents: [...projectDocuments].sort(),
                knowledge_document: knowledgeDocument,
                target_files: [...targetFiles].sort(),
                verification_commands: [...verificationCommands].sort(),
                workflow_profile: typeof state.workflow_profile_id === 'string' ? state.workflow_profile_id : undefined,
            };
        }
        catch {
            return null;
        }
    }
    async writeArchivedChangeKnowledgeDocuments(rootDir, config, archivedChanges) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        const archivedRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'changes/archived', config);
        const knowledgeRoot = path_1.default.join(docsProjectRoot, 'changes');
        const expectedPaths = new Set();
        const copy = this.getArchivedKnowledgeCopy(config?.documentLanguage);
        for (const change of archivedChanges) {
            const archiveAbsolute = path_1.default.join(rootDir, ...change.archive.split('/'));
            const archiveRelative = path_1.default.relative(archivedRoot, archiveAbsolute);
            if (!archiveRelative || archiveRelative === '..' || archiveRelative.startsWith(`..${path_1.default.sep}`) || path_1.default.isAbsolute(archiveRelative)) {
                continue;
            }
            const targetPath = path_1.default.join(knowledgeRoot, `${archiveRelative}.md`);
            const resolvedTarget = path_1.default.resolve(targetPath);
            const relativeToKnowledge = path_1.default.relative(knowledgeRoot, resolvedTarget);
            if (!relativeToKnowledge || relativeToKnowledge === '..' || relativeToKnowledge.startsWith(`..${path_1.default.sep}`) || path_1.default.isAbsolute(relativeToKnowledge)) {
                continue;
            }
            expectedPaths.add(resolvedTarget.toLowerCase());
            await fs_1.promises.mkdir(path_1.default.dirname(resolvedTarget), { recursive: true });
            const knowledgeDocument = path_1.default.relative(rootDir, resolvedTarget).replace(/\\/g, '/');
            change.knowledge_document = knowledgeDocument;
            await this.assertGeneratedKnowledgeDocumentReplaceable(resolvedTarget, change.archive);
            const archiveLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), archiveAbsolute).replace(/\\/g, '/');
            const lines = [
                '---',
                `name: ${JSON.stringify(`archived-change-${change.feature}`)}`,
                `title: ${JSON.stringify(change.feature)}`,
                'tags: [project, feature, completed, archive, ai-index]',
                `features: [${JSON.stringify(change.feature)}]`,
                `archive: ${JSON.stringify(change.archive)}`,
                `workflow_profile: ${JSON.stringify(change.workflow_profile || 'change')}`,
                `completed_at: ${JSON.stringify(change.completed_at || '')}`,
                'generated: true',
                'generator: ospec-archive-knowledge',
                '---',
                '',
                `# ${change.feature}`,
                '',
                `> ${copy.guidance}`,
                '',
                `## ${copy.summary}`,
                '',
                change.summary || copy.notRecorded,
                '',
                `## ${copy.affects}`,
                '',
                ...this.renderKnowledgeList(change.affects, copy.none),
                '',
                `## ${copy.targetFiles}`,
                '',
                ...this.renderKnowledgeCodeList(change.target_files || [], copy.none),
                '',
                `## ${copy.verification}`,
                '',
                ...this.renderKnowledgeCodeList(change.verification_commands || [], copy.none),
                '',
                `## ${copy.projectDocuments}`,
                '',
            ];
            if ((change.project_documents || []).length === 0) {
                lines.push(copy.none, '');
            }
            else {
                for (const document of change.project_documents || []) {
                    const documentLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), path_1.default.join(rootDir, ...document.split('/'))).replace(/\\/g, '/');
                    lines.push(`- [${document}](${documentLink})`);
                }
                lines.push('');
            }
            lines.push(`## ${copy.archivedEvidence}`, '');
            lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
            for (const document of change.documents) {
                const documentLink = path_1.default.relative(path_1.default.dirname(resolvedTarget), path_1.default.join(archiveAbsolute, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- [${document}](${documentLink})`);
            }
            lines.push('');
            const content = `${lines.join('\n').trimEnd()}\n`;
            const previous = await pathExists(resolvedTarget) ? await fs_1.promises.readFile(resolvedTarget, 'utf8') : null;
            if (previous !== content)
                await fs_1.promises.writeFile(resolvedTarget, content, 'utf8');
        }
        await this.removeStaleArchivedKnowledgeDocuments(knowledgeRoot, expectedPaths);
    }
    getKnowledgeDocumentRelativePath(archive) {
        const normalized = archive.replace(/\\/g, '/').replace(/^\.\//, '');
        const marker = 'changes/archived/';
        const markerIndex = normalized.indexOf(marker);
        if (markerIndex < 0)
            return undefined;
        const prefix = normalized.slice(0, markerIndex);
        const suffix = normalized.slice(markerIndex + marker.length);
        if (!suffix)
            return undefined;
        return `${prefix}docs/project/changes/${suffix}.md`;
    }
    async assertGeneratedKnowledgeDocumentReplaceable(targetPath, archive) {
        if (!(await pathExists(targetPath)))
            return;
        try {
            const document = (0, helpers_1.parseFrontmatterDocument)(await fs_1.promises.readFile(targetPath, 'utf8'));
            const normalizedArchive = String(document.data?.archive || '').replace(/\\/g, '/');
            if (document.data?.generated === true
                && document.data?.generator === 'ospec-archive-knowledge'
                && normalizedArchive === archive.replace(/\\/g, '/')) {
                return;
            }
        }
        catch {
            // Unparseable content is human-owned unless it proves otherwise.
        }
        throw new Error(`Refusing to overwrite human-owned archive knowledge document: ${targetPath}`);
    }
    renderKnowledgeList(items, empty) {
        return items.length > 0 ? items.map(item => `- ${item}`) : [empty];
    }
    renderKnowledgeCodeList(items, empty) {
        return items.length > 0
            ? items.map(item => `- \`${item.replace(/`/g, '\\`')}\``)
            : [empty];
    }
    async removeStaleArchivedKnowledgeDocuments(knowledgeRoot, expectedPaths) {
        if (!(await pathExists(knowledgeRoot)))
            return;
        const visit = async (currentDir) => {
            const entries = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    await visit(fullPath);
                    continue;
                }
                if (!entry.name.endsWith('.md') || expectedPaths.has(path_1.default.resolve(fullPath).toLowerCase()))
                    continue;
                try {
                    const document = (0, helpers_1.parseFrontmatterDocument)(await fs_1.promises.readFile(fullPath, 'utf8'));
                    if (document.data?.generated === true && document.data?.generator === 'ospec-archive-knowledge') {
                        await fs_1.promises.unlink(fullPath);
                    }
                }
                catch {
                    // Never remove an unparseable or human-owned document.
                }
            }
        };
        await visit(knowledgeRoot);
    }
    getArchivedKnowledgeCopy(documentLanguage) {
        if (documentLanguage === 'zh-CN')
            return {
                guidance: '由 OSpec 在归档时生成，供人和 AI 快速了解这个 change 做了什么以及去哪里查看证据。',
                summary: '功能摘要',
                affects: '影响范围',
                targetFiles: '实现文件',
                verification: '验证命令',
                projectDocuments: '长期项目文档',
                archivedEvidence: '归档证据',
                archive: '完整归档',
                none: '- 无',
                notRecorded: '未记录摘要，请打开归档 proposal 查看。',
            };
        if (documentLanguage === 'ja-JP')
            return {
                guidance: 'OSpec が archive 時に生成し、この change の内容と evidence の場所を人と AI がすばやく確認できるようにします。',
                summary: '機能概要',
                affects: '影響範囲',
                targetFiles: '実装ファイル',
                verification: '検証コマンド',
                projectDocuments: '永続プロジェクト文書',
                archivedEvidence: 'アーカイブ証跡',
                archive: '完全なアーカイブ',
                none: '- なし',
                notRecorded: '概要は記録されていません。archive の proposal を開いてください。',
            };
        if (documentLanguage === 'ar')
            return {
                guidance: 'ينشئه OSpec عند الأرشفة كي يعرف الإنسان وAI بسرعة ما الذي أنجزه هذا change وأين توجد الأدلة.',
                summary: 'ملخص الميزة',
                affects: 'النطاق المتأثر',
                targetFiles: 'ملفات التنفيذ',
                verification: 'أوامر التحقق',
                projectDocuments: 'وثائق المشروع الدائمة',
                archivedEvidence: 'أدلة الأرشفة',
                archive: 'الأرشيف الكامل',
                none: '- لا يوجد',
                notRecorded: 'لم يسجل ملخص؛ افتح proposal المؤرشف.',
            };
        return {
            guidance: 'Generated by OSpec at archive time so humans and AI can quickly see what this change delivered and where its evidence lives.',
            summary: 'Feature Summary',
            affects: 'Affected Areas',
            targetFiles: 'Implementation Files',
            verification: 'Verification Commands',
            projectDocuments: 'Durable Project Documents',
            archivedEvidence: 'Archived Evidence',
            archive: 'Full archive',
            none: '- None',
            notRecorded: 'No summary was recorded; open the archived proposal.',
        };
    }
    async writeFeatureIndex(rootDir, config, archivedChanges) {
        const docsProjectRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, 'docs/project', config);
        if (!(await pathExists(docsProjectRoot)) && archivedChanges.length === 0)
            return;
        await fs_1.promises.mkdir(docsProjectRoot, { recursive: true });
        const targetPath = path_1.default.join(docsProjectRoot, 'feature-index.md');
        const copy = this.getFeatureIndexCopy(config?.documentLanguage);
        const lines = [
            '---',
            'name: project-feature-index',
            `title: ${copy.title}`,
            'tags: [project, features, archive, ai-index]',
            'generated: true',
            '---',
            '',
            `# ${copy.title}`,
            '',
            `> ${copy.guidance}`,
            '',
        ];
        if (archivedChanges.length === 0) {
            lines.push(copy.empty, '');
        }
        for (const change of archivedChanges) {
            lines.push(`## ${change.feature}`, '');
            if (change.summary)
                lines.push(`- ${copy.summary}: ${change.summary}`);
            if (change.affects.length > 0)
                lines.push(`- ${copy.affects}: ${change.affects.join(', ')}`);
            const archiveLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, change.archive)).replace(/\\/g, '/');
            lines.push(`- ${copy.archive}: [${change.archive}](${archiveLink})`);
            if (change.knowledge_document) {
                const knowledgeLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, ...change.knowledge_document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${copy.knowledgeDocument}: [${change.knowledge_document}](${knowledgeLink})`);
            }
            for (const document of change.documents) {
                const documentLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, change.archive, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${document}: [${copy.open}](${documentLink})`);
            }
            for (const document of change.project_documents || []) {
                const documentLink = path_1.default.relative(docsProjectRoot, path_1.default.join(rootDir, ...document.split('/'))).replace(/\\/g, '/');
                lines.push(`- ${copy.projectDocument}: [${document}](${documentLink})`);
            }
            lines.push('');
        }
        const content = `${lines.join('\n').trimEnd()}\n`;
        const previous = await pathExists(targetPath) ? await fs_1.promises.readFile(targetPath, 'utf8') : null;
        if (previous !== content)
            await fs_1.promises.writeFile(targetPath, content, 'utf8');
    }
    getFeatureIndexCopy(documentLanguage) {
        if (documentLanguage === 'zh-CN') {
            return {
                title: '项目功能索引',
                guidance: '由 OSpec 自动生成。使用本文件定位已完成功能，并只打开当前任务需要的归档证据或长期项目文档。',
                empty: '暂无已归档 change。',
                summary: '摘要',
                affects: '影响范围',
                archive: '归档',
                open: '打开',
                projectDocument: '长期项目文档',
                knowledgeDocument: 'change 功能文档',
            };
        }
        if (documentLanguage === 'ja-JP') {
            return {
                title: 'プロジェクト機能索引',
                guidance: 'OSpec により自動生成されます。完了済み機能を特定し、現在のタスクに必要な archive evidence または永続 project document だけを開いてください。',
                empty: 'archive 済みの change はまだありません。',
                summary: '概要',
                affects: '影響範囲',
                archive: 'アーカイブ',
                open: '開く',
                projectDocument: '長期プロジェクト文書',
                knowledgeDocument: 'change 機能文書',
            };
        }
        if (documentLanguage === 'ar') {
            return {
                title: 'فهرس ميزات المشروع',
                guidance: 'يُنشأ تلقائياً بواسطة OSpec. استخدمه لتحديد السلوك المكتمل، وافتح فقط دليل archive أو وثيقة المشروع الدائمة اللازمة للمهمة الحالية.',
                empty: 'لا توجد تغييرات مؤرشفة بعد.',
                summary: 'الملخص',
                affects: 'النطاق المتأثر',
                archive: 'الأرشيف',
                open: 'فتح',
                projectDocument: 'وثيقة المشروع الدائمة',
                knowledgeDocument: 'وثيقة change',
            };
        }
        return {
            title: 'Project Feature Index',
            guidance: 'Generated by OSpec. Use this file to locate completed behavior; open only the archived evidence or durable project documents needed for the current task.',
            empty: 'No archived changes yet.',
            summary: 'Summary',
            affects: 'Affects',
            archive: 'Archive',
            open: 'open',
            projectDocument: 'Durable project document',
            knowledgeDocument: 'Change knowledge document',
        };
    }
}
exports.IndexBuilder = IndexBuilder;
const createIndexBuilder = (skillParser) => new IndexBuilder(skillParser);
exports.createIndexBuilder = createIndexBuilder;
