---
name: project-ai-guide
title: AI Guide
tags: [ai, guide, ospec]
---

# AI 开发指南

## 目标

本文档是从 OSpec 母版复制到项目中的采用版 AI 指南。AI 必须优先遵循项目内采用版规则，而不是回到母版仓库重新自由发挥。

## Working Order

1. 读取 `.skillrc`
2. 读取 `SKILL.index.json`
3. 读取 `docs/project/` 下的项目采用版规范
4. 读取相关 `SKILL.md`
5. 读取当前 change 的执行文件
6. 如果项目启用了 Stitch，且当前 change 激活了 `stitch_design_review`，优先检查 `artifacts/stitch/approval.json`
7. 如果要处理 Stitch / Checkpoint 的安装、provider 切换、doctor 修复、MCP、认证配置或插件启用，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本

## 必须遵守

- 文档语言按项目 adopted protocol 执行；如果项目采用中文协议，则 `proposal.md`、`tasks.md`、`verification.md`、`review.md` 必须保持中文
- 产品界面文案、站点默认语言或 “English-first” 业务策略，不得自动推导为 change 文档应改成英文
- 若当前 change 已存在中文内容，后续更新必须延续中文，除非项目规则显式声明文档语言切换为英文
- 先按索引定位，再读目标知识文件
- 先看项目采用版规范，再进入实现
- 如果 `stitch_design_review` 已激活且 `approval.json.preview_url` 为空或 `submitted_at` 为空，先执行 `ospec plugins run stitch <change-path>` 生成预览，再把预览地址发给用户验收
- 如果 `stitch_design_review` 已激活且 `approval.json.status != approved`，先停在设计审核门禁
- Stitch 页面评审必须遵守“一 route 一套 canonical layout”；不得让同一路由同时存在多个未标记用途的主 layout
- 如需补齐 `light/dark`，必须基于同一 canonical screen 做主题变体；不得重排模块、改信息架构、改 CTA 位置或生成新的不同构图
- 项目中已存在对应页面时，优先 `edit existing screen` 或 `duplicate existing canonical screen and derive a theme variant`
- 每次 Stitch 交付都必须给出 `screen mapping`，至少包含 route、canonical dark/light screen id、是否由另一主题派生、归档 screen ids
- 旧稿、探索稿、被替换 screen 必须归档或重命名，不能继续与 canonical screen 并列为主页面
- 如果缺失 canonical 说明、theme pairing、screen mapping，或仍存在未归档重复 screen，不得把该 review 视为完成
- `ospec plugins run stitch <change-path>` 默认会走已配置的 Stitch provider 适配器；只有在项目显式覆写 `.skillrc.plugins.stitch.runner` 时才走自定义 runner
- 如果项目使用自定义 runner 且配置了 `token_env`，运行前必须确认对应环境变量已设置
- runner、Gemini CLI、Codex CLI、stitch MCP 或认证状态不确定时，先执行 `ospec plugins doctor stitch <project-path>` 自检
- 若 `plugins doctor stitch` 提示所选 provider 的关键检查不是 PASS，先提示用户安装对应 CLI 并补全相应用户配置中的 stitch MCP / API token 设置
- 涉及 Stitch 安装、provider 切换、doctor 修复、MCP 或认证配置时，必须先读取与项目文档语言一致的仓库内本地化 Stitch 规范，直接采用其中的 Gemini / Codex 配置片段，不得为了让 `doctor` 通过而自行拼接 `command` / `args` / `env` 或 stdio proxy 配置
- 如果内建 `codex` provider 下只读调用正常，但 `create_project`、`generate_screen`、`edit_screens` 这类写操作卡在本地，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目显式覆写 `.skillrc.plugins.stitch.runner` 且仍由 Codex 负责 Stitch 写操作，自定义 runner / wrapper 也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 修改代码后同步更新 `SKILL.md`
- 必要时重建 `SKILL.index.json`

## 项目采用版优先

- 命名规范：`docs/project/naming-conventions.md`
- SKILL 规范：`docs/project/skill-conventions.md`
- 工作流规范：`docs/project/workflow-conventions.md`
- 项目开发指南：`docs/project/development-guide.md`

## Stitch Canonical Project

- 如 `.skillrc.plugins.stitch.project.project_id` 已存在，必须复用该 Stitch project。
- 如该字段为空，把第一次成功的 Stitch 运行结果视为仓库 canonical project，并在后续 change 中持续复用。
- 不要为单个 change 新建新的 Stitch project，除非用户明确要求。

## Stitch Provider Baseline

- 如果仓库里存在与项目文档语言一致的本地化 Stitch 规范，优先使用文档中的原始配置片段。
- 如果仓库里没有这份规范，但需要启用内建 Stitch provider，默认基线如下。
- `gemini`：修改 `%USERPROFILE%/.gemini/settings.json`，使用 `mcpServers.stitch.httpUrl` 和 `headers.X-Goog-Api-Key`。

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

- `codex`：修改 `%USERPROFILE%/.codex/config.toml`，使用 HTTP transport、固定 Stitch MCP URL，以及 `X-Goog-Api-Key` header。
- `codex` 内建适配器默认应通过 `codex exec --dangerously-bypass-approvals-and-sandbox` 发起 Stitch 写操作；如果项目改用自定义 runner，该放行参数也必须由自定义 runner 承担。

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

## Stitch Canonical Layout

- 每个业务 route 只能有一个 canonical layout。
- `Light` 和 `Dark` 必须是一对 theme variants，而不是两个不同 layout。
- 涉及 theme variant 的 prompt 必须明确包含：
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
