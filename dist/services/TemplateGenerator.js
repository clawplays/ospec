"use strict";
/**
 * Template generation service.
 * Generates template files such as proposal.md, design.md, implementation-plan.md, task-graph.json, tasks.md, review artifacts, worker-status.md, and verification.md.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateGenerator = void 0;
const FileService_1 = require("./FileService");
const SkillParser_1 = require("./SkillParser");
const constants_1 = require("../core/constants");
class TemplateGenerator {
    /**
     * Generate the proposal.md template.
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
     * Generate the design.md template.
     */
    static generateDesignTemplate(featureName, optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        return `---
feature: ${featureName}
created: ${now}
status: draft
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## 设计目标

将 proposal.md 中的目标和范围转成可执行方案，再拆解 implementation-plan.md。

## 方案

**选定方案：**
- 待补充

**关键取舍：**
- 待补充

**影响面：**
- 待补充

## 风险与边界

- 待补充

## 设计检查清单

- [ ] 已回看 proposal.md 的目标、范围和验收标准
- [ ] 已选择实现方案并记录关键取舍
- [ ] 已确认数据、API、UI 或模块边界影响
- [ ] 已记录风险、限制和未决问题
- [ ] 可以据此拆解 implementation-plan.md
`;
    }
    /**
     * Generate the implementation-plan.md template.
     */
    static generateImplementationPlanTemplate(featureName, optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        return `---
feature: ${featureName}
created: ${now}
status: draft
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## 计划目标

将 design.md 中的方案转成 agent 可执行步骤，再拆解 tasks.md。

## 执行边界

**预计修改文件：**
- 待补充

**预计测试 / 验证命令：**
- 待补充

**依赖与顺序：**
- 待补充

## Agent 执行步骤

- [ ] 已回看 proposal.md 和 design.md
- [ ] 已列出每个步骤的目标文件和预期结果
- [ ] 已明确每个步骤的验证命令或人工验收口径
- [ ] 已标记可并行任务、依赖关系和冲突文件
- [ ] 可以据此拆解 tasks.md
`;
    }
    /**
     * Generate the tasks.md template.
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
        // Add core tasks.
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
        // Add optional tasks.
        if (optionalSteps.length > 0) {
            content += `\n### 可选任务\n\n`;
            optionalSteps.forEach((step, index) => {
                content += `- [ ] ${step}\n`;
            });
        }
        return content;
    }
    /**
     * Generate the verification.md template.
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
     * Generate the artifacts/reviews/spec-compliance.md template.
     */
    static generateSpecComplianceReviewTemplate(featureName, optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        return `---
feature: ${featureName}
created: ${now}
status: pending_review
reviewer_role: spec_compliance_reviewer
decision: PENDING
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## Spec Compliance Review

先确认实现是否符合 proposal.md、design.md 和 implementation-plan.md，再进入代码质量 review。

## 判定值

- \`APPROVED\`
- \`APPROVED_WITH_CONCERNS\`
- \`NEEDS_CHANGES\`
- \`BLOCKED\`
- \`PENDING\`

## Findings

- 待补充

## Checklist

- [ ] 已核对 proposal.md 的验收标准
- [ ] 已核对 design.md 的方案和边界
- [ ] 已核对 implementation-plan.md 的目标文件和验证口径
- [ ] 已记录偏离、concern 或 blocker
- [ ] 已把最终判定写入 frontmatter 的 \`decision\`
`;
    }
    /**
     * Generate the artifacts/reviews/code-quality.md template.
     */
    static generateCodeQualityReviewTemplate(featureName, optionalSteps = []) {
        const now = new Date().toISOString().split('T')[0];
        return `---
feature: ${featureName}
created: ${now}
status: pending_review
reviewer_role: code_quality_reviewer
decision: PENDING
optional_steps: [${optionalSteps.map((s) => `"${s}"`).join(', ')}]
---

## Code Quality Review

在 spec compliance review 通过后，检查代码质量、测试覆盖、可维护性和回归风险。

## 判定值

- \`APPROVED\`
- \`APPROVED_WITH_CONCERNS\`
- \`NEEDS_CHANGES\`
- \`BLOCKED\`
- \`PENDING\`

## Findings

- 待补充

## Checklist

- [ ] 已检查实现是否清晰、局部、可维护
- [ ] 已检查测试或验证证据是否覆盖关键路径
- [ ] 已检查明显回归、边界条件和错误处理
- [ ] 已记录必须修复项、concern 或 blocker
- [ ] 已把最终判定写入 frontmatter 的 \`decision\`
`;
    }
    /**
     * Generate the artifacts/agents/task-graph.json template.
     */
    static generateTaskGraphTemplate(featureName, optionalSteps = []) {
        return `${JSON.stringify({
            version: '1.0',
            contract_version: '1.8.5',
            feature: featureName,
            status: 'pending',
            optional_steps: optionalSteps,
            generated_from: [
                'proposal.md',
                'design.md',
                'implementation-plan.md',
                'tasks.md',
            ],
            tasks: [
                {
                    id: 'task-1',
                    title: 'Implement the change',
                    status: 'PENDING',
                    depends_on: [],
                    parallelizable: false,
                    serial_reason: 'Template placeholder; replace with a concrete dependency, conflict, or parallel task split before review.',
                    scope_reason: null,
                    conflicts_with: [],
                    target_files: [],
                    verification_commands: [],
                    expected_result: 'TBD',
                    worker_role: 'implementer',
                },
            ],
        }, null, 2)}\n`;
    }
    /**
     * Generate the artifacts/agents/worker-status.md template.
     */
    static generateAgentWorkerStatusTemplate(featureName) {
        const now = new Date().toISOString().split('T')[0];
        return `---
feature: ${featureName}
created: ${now}
status: pending
implementer_status: PENDING
spec_reviewer_status: PENDING
quality_reviewer_status: PENDING
controller_status: PENDING
allowed_worker_statuses:
  - DONE
  - DONE_WITH_CONCERNS
  - NEEDS_CONTEXT
  - BLOCKED
  - PENDING
---

## Worker 状态协议

- \`DONE\`：任务完成，没有阻断问题
- \`DONE_WITH_CONCERNS\`：任务完成，但有需要 controller 评估的风险或遗留问题
- \`NEEDS_CONTEXT\`：缺少继续执行所需的上下文
- \`BLOCKED\`：被外部条件、冲突或失败阻断
- \`PENDING\`：尚未执行

## Implementer 结果

- Status: \`PENDING\`
- Worker: 待补充
- Scope: 待补充
- Changed files: 待补充
- Verification run: 待补充
- Concerns: 待补充

## Spec Compliance Review

- Status: \`PENDING\`
- Reviewer: 待补充
- Decision: 待补充
- Findings: 待补充

## Code Quality Review

- Status: \`PENDING\`
- Reviewer: 待补充
- Decision: 待补充
- Findings: 待补充

## Controller Decision

- Status: \`PENDING\`
- Decision: 待补充
- Follow-up required: 待补充

## Checklist

- [ ] Implementer 已给出 \`DONE\` 或 \`DONE_WITH_CONCERNS\`
- [ ] Spec compliance review 已完成
- [ ] Code quality review 已完成
- [ ] Controller 已处理 concerns、context request 或 blocker
- [ ] 最终验证命令已写入 verification.md
`;
    }
    /**
     * Generate the state.json payload.
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
     * Create the feature directory and files.
     */
    static async createFeatureDirectory(projectRoot, featureName, affects = [], coreRequiredSteps = [], optionalSteps = []) {
        const featurePath = FileService_1.FileService.joinPath(projectRoot, 'changes', 'active', featureName);
        // Create the directory.
        await FileService_1.FileService.createDirectory(featurePath);
        // Generate proposal.md.
        const proposalContent = this.generateProposalTemplate(featureName, affects);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.PROPOSAL), proposalContent);
        // Generate design.md.
        const designContent = this.generateDesignTemplate(featureName, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.DESIGN), designContent);
        // Generate implementation-plan.md.
        const implementationPlanContent = this.generateImplementationPlanTemplate(featureName, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN), implementationPlanContent);
        // Generate tasks.md.
        const tasksContent = this.generateTasksTemplate(featureName, coreRequiredSteps, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.TASKS), tasksContent);
        // Generate verification.md.
        const verificationContent = this.generateVerificationTemplate(featureName, optionalSteps);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.VERIFICATION), verificationContent);
        // Generate artifacts/reviews review loop documents.
        const reviewArtifactsPath = FileService_1.FileService.joinPath(featurePath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS);
        await FileService_1.FileService.createDirectory(reviewArtifactsPath);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(reviewArtifactsPath, constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW), this.generateSpecComplianceReviewTemplate(featureName, optionalSteps));
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(reviewArtifactsPath, constants_1.FILE_NAMES.CODE_QUALITY_REVIEW), this.generateCodeQualityReviewTemplate(featureName, optionalSteps));
        // Generate artifacts/agents execution artifacts.
        const agentArtifactsPath = FileService_1.FileService.joinPath(featurePath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS);
        await FileService_1.FileService.createDirectory(agentArtifactsPath);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(agentArtifactsPath, constants_1.FILE_NAMES.TASK_GRAPH), this.generateTaskGraphTemplate(featureName, optionalSteps));
        const agentWorkerStatusContent = this.generateAgentWorkerStatusTemplate(featureName);
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(agentArtifactsPath, constants_1.FILE_NAMES.AGENT_WORKER_STATUS), agentWorkerStatusContent);
        // Generate state.json.
        const stateJson = this.generateStateJson(featureName, affects);
        await FileService_1.FileService.writeJSON(FileService_1.FileService.joinPath(featurePath, constants_1.FILE_NAMES.STATE), stateJson);
    }
    /**
     * Generate project initialization files.
     */
    static async initializeProject(projectRoot, mode = 'lite') {
        // Create the required directories.
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'changes', 'active'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'changes', 'archived'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'for-ai'));
        await FileService_1.FileService.createDirectory(FileService_1.FileService.joinPath(projectRoot, 'docs'));
        // Generate SKILL.md.
        const skillContent = SkillParser_1.SkillParser.createDefaultSkill('project', ['project', 'root'], 'Project Root');
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, constants_1.FILE_NAMES.SKILL_MD), skillContent);
        // Generate ai-guide.md.
        const aiGuideContent = this.generateAiGuide();
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, 'for-ai', 'ai-guide.md'), aiGuideContent);
        // Generate execution-protocol.md.
        const executionProtocolContent = this.generateExecutionProtocol();
        await FileService_1.FileService.writeFile(FileService_1.FileService.joinPath(projectRoot, 'for-ai', 'execution-protocol.md'), executionProtocolContent);
    }
    /**
     * Generate the AI guide.
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
2. 补充设计方案（design.md）
3. 补充执行计划（implementation-plan.md）
4. 将 implementation-plan.md 转成 artifacts/agents/task-graph.json
5. 启动 feature（生成 tasks.md）
6. 实现功能并更新 artifacts/agents/worker-status.md
7. 依次完成 artifacts/reviews/spec-compliance.md 和 artifacts/reviews/code-quality.md
8. 若涉及 Stitch 安装、provider 切换、MCP 或认证配置，优先读取仓库内 Stitch 规范；若缺失规范文档，则使用内建基线：Gemini 用 \`%USERPROFILE%/.gemini/settings.json\` 的 \`mcpServers.stitch.httpUrl\` 与 \`headers.X-Goog-Api-Key\`，Codex 用 \`%USERPROFILE%/.codex/config.toml\` 的 \`[mcp_servers.stitch]\`、\`type = "http"\`、\`url = "https://stitch.googleapis.com/mcp"\` 与 \`X-Goog-Api-Key\`
9. 若内建 Codex provider 只读调用正常但 Stitch 写操作卡住，优先检查是否真正走了 \`codex exec --dangerously-bypass-approvals-and-sandbox\`
10. 更新文档和索引
11. 验证
12. 归档

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
     * Generate the execution protocol.
     */
    static generateExecutionProtocol() {
        return `# AI 执行协议

> OSpec 规范 v3.0

## 每次进入项目时必须先读

1. \`.skillrc\`
2. \`SKILL.index.json\`
3. 当前 feature 的 \`proposal.md\`
4. 当前 feature 的 \`design.md\`
5. 当前 feature 的 \`implementation-plan.md\`
6. 当前 feature 的 \`artifacts/agents/task-graph.json\`
7. 当前 feature 的 \`tasks.md\`
8. 当前 feature 的 \`artifacts/reviews/spec-compliance.md\`
9. 当前 feature 的 \`artifacts/reviews/code-quality.md\`
10. 当前 feature 的 \`artifacts/agents/worker-status.md\`
11. 当前 feature 的 \`state.json\`
12. 当前 feature 的 \`verification.md\`

## 强制规则

- 没有 \`proposal.md\` 不得开始实现
- 没有 \`design.md\` 不得开始实现
- 没有 \`implementation-plan.md\` 不得开始实现
- 没有 \`artifacts/agents/task-graph.json\` 不得开始实现
- 没有 \`tasks.md\` 不得开始实现
- 没有 \`artifacts/reviews/spec-compliance.md\` 和 \`artifacts/reviews/code-quality.md\` 不得 archive
- 没有 \`artifacts/agents/worker-status.md\` 不得声称完成
- 没有 \`verification.md\` 不得 archive
- 两个 review artifact 的 \`decision\` 不是 \`APPROVED\` 或 \`APPROVED_WITH_CONCERNS\` 时不得 archive
- \`artifacts/agents/task-graph.json\` 中存在未完成 task、无效依赖、缺失目标文件或缺失验证命令时不得 archive
- \`artifacts/agents/worker-status.md\` 中存在 \`PENDING\`、\`NEEDS_CONTEXT\` 或 \`BLOCKED\` 时不得 archive
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
