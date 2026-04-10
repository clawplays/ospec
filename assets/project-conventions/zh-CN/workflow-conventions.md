---
name: project-workflow-conventions
title: 工作流执行规范
tags: [conventions, workflow, change, ospec]
---

# 工作流执行规范

## 目标

本文档用于固定项目中的 OSpec 执行流程，确保需求从规划到实现、验证、归档都有统一步骤。

## 标准顺序

1. 明确项目上下文和影响范围
2. 创建或更新 `proposal.md`
3. 创建或更新 `tasks.md`
4. 根据 `state.json` 推进实现
5. 更新相关 `SKILL.md`
6. 重建 `SKILL.index.json`
7. 完成 `verification.md`
8. 满足门禁后再归档

## 状态约束

- 以 `state.json` 为当前执行状态依据
- `verification.md` 不能替代 `state.json`
- 若状态文件与执行文件冲突，先修正状态再继续

## 文档语言

- 项目采用中文 protocol 时，`proposal.md`、`tasks.md`、`verification.md`、`review.md` 必须保持中文
- 产品界面语言可以按业务使用英文，但不得把产品语言自动映射为 OSpec change 文档语言
- 若当前 change 文档已用中文创建，后续更新必须延续中文，除非项目规则显式要求切换为英文

## 可选步骤

- 是否启用可选步骤，以 `.skillrc.workflow` 为准
- proposal 中的 flags 必须与 workflow 配置兼容
- 被激活的可选步骤必须进入 `tasks.md` 和 `verification.md`

## 插件阻断

- 是否启用插件能力，以 `.skillrc.plugins` 为准
- 如果当前 change 激活了 `stitch_design_review`，必须先检查 `artifacts/stitch/approval.json`
- 如果 `approval.json.preview_url` 为空或 `submitted_at` 为空，先执行 `ospec plugins run stitch <change-path>` 生成预览，再把预览地址发给用户验收
- `ospec plugins run stitch <change-path>` 默认走已配置的 Stitch provider 适配器；如果项目显式覆写 `.skillrc.plugins.stitch.runner`，则走自定义 Stitch bridge / wrapper
- 使用自定义 runner 时，可通过 `token_env` 约束额外 token；使用内建 Gemini 适配器时，通常应在 `%USERPROFILE%/.gemini/settings.json` 的 `mcpServers.stitch` 中配置认证信息
- 可通过 `ospec plugins doctor stitch <project-path>` 检查 runner、provider CLI、stitch MCP 与认证提示状态
- 涉及 Stitch / Checkpoint 安装、provider 切换、doctor 修复、MCP、认证配置或插件启用时，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本，不得为通过检查而临时拼出另一套配置
- 如果仓库里没有 Stitch 规范文档，则使用内建基线：`gemini` 改 `%USERPROFILE%/.gemini/settings.json` 的 `mcpServers.stitch.httpUrl` 与 `headers.X-Goog-Api-Key`；`codex` 改 `%USERPROFILE%/.codex/config.toml` 的 `[mcp_servers.stitch]`，并设置 `type = "http"`、`url = "https://stitch.googleapis.com/mcp"`、`X-Goog-Api-Key`
- 如果内建 `codex` provider 下只读调用正常，但写操作卡在本地未真正进入 `mcp_tool_call`，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目覆写了自定义 Codex runner / wrapper，自定义运行链也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 当 `approval.json.status` 不是 `approved` 时，不得继续声称 change 已通过设计审核或可归档
- 记录审批结果时，优先使用 `ospec plugins approve stitch <change-path>` 或 `ospec plugins reject stitch <change-path>`

## 归档约束

- 文档未同步时不得归档
- 索引未重建时不得归档
- 可选步骤未通过时不得归档
- `verification.md` 未完成时不得归档

## 执行要求

- 任何 AI 或人工执行 change 时，都必须先读取 `.skillrc`、`SKILL.index.json` 和当前 change 文件
- 任何 claim 必须以实际文件状态为准，不得凭口头描述跳过门禁

## Stitch Canonical Project

- 同一个仓库默认只维护一个 Stitch project，保存在 `.skillrc.plugins.stitch.project`。
- 第一次成功执行 `ospec plugins run stitch <change-path>` 时，如果还没有 canonical project，应该把返回的 project ID 自动保存到 `.skillrc`。
- 后续所有 UI change 都必须复用这个 canonical Stitch project，而不是为每个 change 新建一个新 project。
- 如果 Stitch 返回了不同的 project ID，应视为异常结果，不能直接接受。
