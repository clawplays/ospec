---
name: project-execution-protocol
title: Execution Protocol
tags: [ai, protocol, ospec]
---

# AI 执行协议

## 每次进入项目时必须先读

1. `.skillrc`
2. `SKILL.index.json`
3. `docs/project/naming-conventions.md`
4. `docs/project/skill-conventions.md`
5. `docs/project/workflow-conventions.md`
6. 当前 change 的 `proposal.md / tasks.md / state.json / verification.md`
7. 如存在 `stitch_design_review`，读取 `artifacts/stitch/approval.json`
8. 如要处理 Stitch / Checkpoint 的 provider、MCP、认证、安装或启用配置，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本

## 强制规则

- 项目 adopted protocol 为中文时，`proposal.md`、`tasks.md`、`verification.md`、`review.md` 必须保持中文
- 不得因为页面文案是英文、产品默认语言是英文或需求写有 “English-first” 就把 change 文档改写成英文
- 若当前 change 文档已经是中文，后续续写、修订和补充必须继续使用中文，除非项目规则显式要求切换
- 不得跳过 proposal/tasks 直接进入实现
- 必须以 `state.json` 作为执行状态依据
- 被激活的可选步骤必须进入 `tasks.md` 和 `verification.md`
- 如果 `stitch_design_review` 已激活且 `approval.json.preview_url` 为空或 `submitted_at` 为空，先运行 `ospec plugins run stitch <change-path>` 提交设计预览
- Stitch 设计评审必须遵守“一 route 一套 canonical layout”；同一路由下的非 canonical screen 必须明确标记为 `archive / old / exploration`
- 如需 `light/dark` 主题变体，必须基于同一 canonical layout 做视觉主题转换；不得重排模块、改 section grouping、改 CTA placement、改 navigation structure
- 如果项目中已经存在对应页面，必须优先 `edit existing screen` 或 `duplicate existing canonical screen and derive a theme variant`
- 每次 Stitch 交付必须输出 `screen mapping`，至少包含 route、canonical dark/light screen id、derived 关系、archived screen ids
- 旧稿、探索稿、被替换 screen 不得与 canonical screen 混放为同级主页面
- 运行 Stitch 前，优先视为走内建 `stitch` 插件的已配置 provider；只有项目显式覆写 `.skillrc.plugins.stitch.runner` 时才按自定义 runner 处理
- 如项目使用自定义 runner 且配置了 `token_env`，必须确认对应环境变量已设置
- 若本地 Stitch bridge、Gemini CLI、Codex CLI、stitch MCP 或认证状态不明确，先执行 `ospec plugins doctor stitch <project-path>`
- 若 `plugins doctor stitch` 暴露 provider / MCP / auth 问题，先回到与项目文档语言一致的仓库内本地化 Stitch 规范修正配置；不得脱离该文档另造一套 `command` / `args` / `env` 或 stdio proxy 配置
- 如果内建 `codex` provider 下只读调用正常，但 `create_project`、`generate_screen`、`edit_screens` 等写操作在本地卡住，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目显式覆写 `.skillrc.plugins.stitch.runner` 且仍使用 Codex 发起 Stitch 写操作，自定义 runner / wrapper 也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 如果 `stitch_design_review` 已激活且 `approval.json.status != approved`，不得把 change 视为可继续实现、可完成或可归档
- 如果缺失 canonical 说明、theme pairing 说明、screen mapping，或仍存在未归档重复 screen，不得把 change 视为已通过设计审核
- `SKILL.md` 与索引未同步时不得视为完成

## 项目采用版优先

如果项目内规范与母版规范存在差异，应以项目内采用版为准。

## Stitch Canonical Project

- 读取 `.skillrc.plugins.stitch.project.project_id` 作为仓库级固定 Stitch project ID。
- 如果该字段为空，第一次成功的 Stitch 提交会成为 canonical project。
- 如果后续运行返回了不同的 project ID，必须停止并提示异常，不能直接写入审批结果。

## Stitch Provider Baseline

- 如果项目内存在与项目文档语言一致的本地化 Stitch 规范，provider / MCP / auth 配置优先以该文档为准。
- 如果项目内没有该文档，且走内建 `gemini` provider，默认配置基线是 `%USERPROFILE%/.gemini/settings.json` 中的 `mcpServers.stitch.httpUrl = "https://stitch.googleapis.com/mcp"`，并在 `headers` 中设置 `X-Goog-Api-Key`。
- 如果项目内没有该文档，且走内建 `codex` provider，默认配置基线是 `%USERPROFILE%/.codex/config.toml` 中的 `[mcp_servers.stitch]`，要求 `type = "http"`、`url = "https://stitch.googleapis.com/mcp"`，并在 `headers` 或 `[mcp_servers.stitch.http_headers]` 中设置 `X-Goog-Api-Key`。
- 内建 `codex` provider 的 Stitch 写操作默认应带 `--dangerously-bypass-approvals-and-sandbox`；若改用自定义 runner，则该放行参数也必须由自定义 runner 显式承担。

## Stitch Theme Variant Prompt Contract

- 涉及 `light/dark` 主题变体时，prompt 必须明确包含：
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
