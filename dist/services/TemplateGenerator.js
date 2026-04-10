"use strict";
/**
 * 模板生成服务
 * 负责生成 proposal.md、tasks.md、verification.md 等模板文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateGenerator = void 0;
const FileService_1 = require("./FileService");
const SkillParser_1 = require("./SkillParser");
const constants_1 = require("../core/constants");
class TemplateGenerator {
    /**
     * 生成 proposal.md 模板
     */
    static generateProposalTemplate(featureName, affects = []) {
        const now = new Date().toISOString().split('T')[0];
        return `---
name: ${featureName}
status: active
created: ${now}
affects: [${affects.map((a) => `"${a}"`).join(', ')}]
flags: []
---

## 背景

为什么要做这个 feature？当前存在哪些问题？

## 目标

做完之后能解决什么问题？用户或开发者能得到什么？

## 范围

**涉及：**
- 列出涉及的模块或文件

**不涉及：**
- 列出明确不在本次范围内的内容，避免范围蔓延

## 验收标准

- [ ] 条件一
- [ ] 条件二
`;
    }
    /**
     * 生成 tasks.md 模板
     */
    static generateTasksTemplate(featureName, coreRequiredSteps = [], optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        let content = `---
feature: ${featureName}
created: ${now}
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## 任务清单

### 核心任务

`;
        // 添加核心任务
        if (coreRequiredSteps.length > 0) {
            coreRequiredSteps.forEach((step, index) => {
                content += `- [ ] ${step}\n`;
            });
        }
        else {
            content += `- [ ] 实现功能\n`;
            content += `- [ ] 更新文档\n`;
            content += `- [ ] 更新索引\n`;
            content += `- [ ] 运行测试\n`;
        }
        // 添加可选任务
        if (optionalSteps.length > 0) {
            content += `\n### 可选任务\n\n`;
            optionalSteps.forEach((step, index) => {
                content += `- [ ] ${step}\n`;
            });
        }
        return content;
    }
    /**
     * 生成 verification.md 模板
     */
    static generateVerificationTemplate(featureName, optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        let content = `---
feature: ${featureName}
created: ${now}
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## 验证清单

### 自动验证

- [ ] 编译成功
- [ ] 代码检查通过
- [ ] 测试通过

### 需求验收

- [ ] 功能实现完整
- [ ] 符合验收标准

### 文档更新

- [ ] 相关模块 SKILL.md 已更新
- [ ] SKILL.index.json 已重建

`;
        if (optionalSteps.length > 0) {
            content += `### 可选步骤验证\n\n`;
            optionalSteps.forEach((step) => {
                content += `- [ ] ${step} 已完成\n`;
            });
            content += `\n### 通过的可选步骤\n\npassed_optional_steps: []\n`;
        }
        content += `\n### 通过条件\n\n所有验证项都通过后，可以进入归档阶段。\n`;
        return content;
    }
    /**
     * 生成 state.json 内容
     */
    static generateStateJson(featureName, affects = [], mode = 'standard') {
        return {
            version: '1.0',
            feature: featureName,
            mode,
            status: 'draft',
            current_step: 'write_proposal',
            affects,
            completed: [],
            pending: [
                'proposal_complete',
                'tasks_complete',
                'implementation_complete',
                'skill_updated',
                'index_regenerated',
                'tests_passed',
                'verification_passed',
                'archived',
            ],
            blocked_by: [],
            last_updated: new Date().toISOString(),
        };
    }
    /**
     * 创建 feature 目录和文件
     */
    static async createFeatureDirectory(projectRoot, featureName, affects = [], coreRequiredSteps = [], optionalSteps = []) {
        const featurePath = FileService_1.FileService.joinPath(projectRoot, 'changes', 'active', featureName);
        // 创建目录
        await FileService_1.FileService.createDirectory(featurePath);
        // 生成 proposal.md
        const proposalContent = this.generateProposalTemplate(featureName, affects);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.PROPOSAL), proposalContent);
        // 生成 tasks.md
        const tasksContent = this.generateTasksTemplate(featureName, coreRequiredSteps, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.TASKS), tasksContent);
        // 生成 verification.md
        const verificationContent = this.generateVerificationTemplate(featureName, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.VERIFICATION), verificationContent);
        // 生成 state.json
        const stateJson = this.generateStateJson(featureName, affects);
        await FileService_1.FileService.writeJSON(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.STATE), stateJson);
    }
    /**
     * 生成项目初始化文件
     */
    static async initializeProject(projectRoot, mode = 'lite') {
        // 创建必要的目录
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'changes', 'active'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'changes', 'archived'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'for-ai'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'docs'));
        // 生成 SKILL.md
        const skillContent = SkillParser_1.SkillParser.createDefaultSkill('project', ['project', 'root'], 'Project Root');
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, constants_1.FILE_NAMES.SKILL_MD), skillContent);
        // 生成 ai-guide.md
        const aiGuideContent = this.generateAiGuide();
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, 'for-ai', 'ai-guide.md'), aiGuideContent);
        // 生成 execution-protocol.md
        const executionProtocolContent = this.generateExecutionProtocol();
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, 'for-ai', 'execution-protocol.md'), executionProtocolContent);
    }
    /**
     * 生成 AI 指南
     */
    static generateAiGuide() {
        return `# AI 指南

> OSpec 规范 v3.0

## 项目概览

本项目使用 ospec 规范管理需求和工作流。

## 关键文件

- \`.skillrc\` - 项目配置
- \`SKILL.md\` - 项目文档
- \`changes/active/\` - 活跃的 feature
- \`changes/archived/\` - 已归档的 feature

## 开发流程

1. 创建 feature（proposal.md）
2. 启动 feature（生成 tasks.md）
3. 实现功能
4. 若涉及 Stitch 安装、provider 切换、MCP 或认证配置，优先读取仓库内 Stitch 规范；若缺失规范文档，则使用内建基线：Gemini 用 \`%USERPROFILE%/.gemini/settings.json\` 的 \`mcpServers.stitch.httpUrl\` 与 \`headers.X-Goog-Api-Key\`，Codex 用 \`%USERPROFILE%/.codex/config.toml\` 的 \`[mcp_servers.stitch]\`、\`type = "http"\`、\`url = "https://stitch.googleapis.com/mcp"\` 与 \`X-Goog-Api-Key\`
5. 若内建 Codex provider 只读调用正常但 Stitch 写操作卡住，优先检查是否真正走了 \`codex exec --dangerously-bypass-approvals-and-sandbox\`
6. 更新文档和索引
7. 验证
8. 归档

## 常见命令

\`\`\`bash
# 创建 feature
ospec feature create my-feature

# 启动 feature
ospec feature start my-feature

# 查看状态
ospec feature status my-feature

# 归档 feature
ospec feature archive my-feature
\`\`\`
`;
    }
    /**
     * 生成执行协议
     */
    static generateExecutionProtocol() {
        return `# AI 执行协议

> OSpec 规范 v3.0

## 每次进入项目时必须先读

1. \`.skillrc\`
2. \`SKILL.index.json\`
3. 当前 feature 的 \`proposal.md\`
4. 当前 feature 的 \`tasks.md\`
5. 当前 feature 的 \`state.json\`
6. 当前 feature 的 \`verification.md\`

## 强制规则

- 没有 \`proposal.md\` 不得开始实现
- 没有 \`tasks.md\` 不得开始实现
- 没有 \`verification.md\` 不得 archive
- \`verification.md\` 未通过不得 archive
- 若涉及 Stitch provider、MCP 或认证配置，优先读取仓库内 Stitch 规范；若缺失规范文档，则使用内建基线：Gemini 用 \`%USERPROFILE%/.gemini/settings.json\` 的 \`mcpServers.stitch.httpUrl\` 与 \`headers.X-Goog-Api-Key\`，Codex 用 \`%USERPROFILE%/.codex/config.toml\` 的 \`[mcp_servers.stitch]\`、\`type = "http"\`、\`url = "https://stitch.googleapis.com/mcp"\` 与 \`X-Goog-Api-Key\`
- 若内建 Codex provider 只读调用正常但 Stitch 写操作卡住，优先检查是否真正走了 \`codex exec --dangerously-bypass-approvals-and-sandbox\`

## 会话恢复规则

每次新会话恢复时：

1. 优先读取 \`state.json\`
2. 以 \`state.json.status\` 为当前执行依据
3. 不依赖对话记忆判断"已经做到哪一步"
`;
    }
}
exports.TemplateGenerator = TemplateGenerator;