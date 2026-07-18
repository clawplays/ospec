<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec.ai</a></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads&cacheSeconds=300" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

<p align="center">
  <a href="../README.md">English</a> |
  <strong>中文</strong> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.ar.md">العربية</a>
</p>

OSpec 的官方 CLI 包是 `@clawplays/ospec-cli`，官方命令是 `ospec`。OSpec 是面向 AI coding agents 的 spec-driven、agentic 工作流框架——把 spec-driven development（SDD）和 Loop Engineering（可验证的"规划 → 执行 → 验证"目标循环）带给 Claude Code、Codex、Gemini、OpenCode、基于 MCP 的代理，以及纯 CLI 工作流。


<p align="center">
  <a href="prompt-guide.zh-CN.md">提示词文档</a> |
  <a href="usage.zh-CN.md">使用说明</a> |
  <a href="project-overview.zh-CN.md">项目介绍</a> |
  <a href="installation.zh-CN.md">安装说明</a> |
  <a href="external-plugins.zh-CN.md">外接插件</a> |
  <a href="plugin-release.zh-CN.md">插件发布</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## 为什么选择 OSpec？

AI 编码助手很强，但如果需求只留在聊天记录里，就很难检查、评审和稳定收口。OSpec 增加了一层轻量工作流，让仓库在写代码之前和上线之后都能保留这次 change 的上下文。

- **把需求变成留在仓库里的规范文件**：OSpec 把一句需求落成 proposal、design、计划、tasks、评审、验证证据等文件，存进你的仓库而不是只留在聊天记录里——任何助手（Codex/GPT、Claude Code、Gemini、OpenCode 或纯 CLI）都能接着上一个停下的地方继续。
- **`ospec change` —— 日常快速流程**：一条需求对应一个 active change，走简短的 `init -> change -> verify/finalize`，轻量、好评审。
- **`ospec goal` 适合较大或风险较高的工作**：你只需要说明想要的结果；AI 会询问重要选择、写出可检查的方案、完成实现和测试、安排独立审查、更新项目文档，并持续推进到结果得到验证。
- **你决定 AI 可以自动做到什么程度**：`L1` 只检查，`L2` 可以修改但会在重要选择处暂停，`L3` 可以在你设定的范围内持续执行。进度保存在项目中，换一个会话也能继续。

## npm 安装

```bash
npm install -g @clawplays/ospec-cli
```

官方包：`@clawplays/ospec-cli`  
官方命令：`ospec`  
验证安装：`ospec --help`

## 快速开始

OSpec 只要 3 步：

1. 在你的项目目录初始化项目
2. 为文档更新、需求开发或 Bug 修复创建并推进一个 change
3. 在需求验收通过后归档这个 change

### 1. 在你的项目目录初始化项目

推荐提示词：

```text
OSpec，初始化这个项目。
```

Claude / Codex Skill 方式：

```text
/ospec 初始化这个项目。
```

<details>
<summary>命令行</summary>

```bash
ospec init .
ospec init . --summary "运营后台"
ospec init . --summary "运营后台" --tech-stack node,react,postgres
ospec init . --architecture "单体 Web 应用 + API + 统一鉴权" --document-language zh-CN
```

命令行说明：

- `--summary`：项目概况，会写入生成的项目文档
- `--tech-stack`：技术栈，使用逗号分隔，例如 `node,react,postgres`
- `--architecture`：简短的架构说明
- `--document-language`：生成文档的语言，可选 `en-US`、`zh-CN`、`ja-JP`、`ar`
- AI 对话优先按以下顺序解析文档语言：对话里明确指定的语言 -> 当前对话语言 -> `.skillrc` 里已持久化的项目语言
- 命令行优先按以下顺序解析文档语言：显式 `--document-language` -> `.skillrc` 里已持久化的项目语言 -> 现有项目文档 / `.ospec/for-ai/*`（或旧 `for-ai/*`）/ asset manifest -> 回退 `en-US`
- OSpec 会把最终选定的项目文档语言持久化到 `.skillrc`，并在 `for-ai` 指南、`ospec change` 和 `ospec update` 中复用
- 新项目执行 `ospec init` 时默认采用 nested 布局：根目录保留 `.skillrc` 和 `README.md`，其它 OSpec 托管文件放在 `.ospec/` 下
- 普通 `init` 不会默认创建 `.ospec/knowledge/src/` 或 `.ospec/knowledge/tests/` 这类可选知识地图目录
- CLI 仍接受 `changes/active/<change-name>` 这样的简写路径，但 nested 项目的实际物理路径是 `.ospec/changes/active/<change-name>`
- 传入这些参数时，OSpec 会直接使用你提供的内容生成项目文档
- 不传这些参数时，OSpec 会优先复用现有文档；如果没有，就先生成待补充的默认文档

</details>

### 2. 创建并推进一个 Change

文档更新、需求开发、重构、Bug 修复，都使用这一类方式。

推荐提示词：

```text
OSpec，为这个需求创建并推进一个 change。
```

Claude / Codex Skill 方式：

```text
/ospec-change 为这个需求创建并推进一个 change。
```

<details>
<summary>命令行</summary>

```bash
ospec change docs-homepage-refresh .
ospec change fix-login-timeout .
ospec change update-billing-copy .
```

</details>

### 3. 验收通过后归档

当需求已经完成部署、测试、QA 或业务验收后，再归档这个已验证的 change。

推荐提示词：

```text
OSpec，归档这个已验收通过的 change。
```

Claude / Codex Skill 方式：

```text
/ospec 归档这个已验收通过的 change。
```

<details>
<summary>命令行</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

归档说明：

- 先完成你项目自己的部署、测试、QA 或验收流程
- 使用 `ospec verify` 确认当前 change 已满足归档条件
- 使用 `ospec finalize` 重建索引并归档这个已验收通过的 change
- 新的 nested 项目会归档到 `.ospec/changes/archived/YYYY-MM/YYYY-MM-DD/<change-name>`；CLI 中 `changes/archived/...` 的简写依然可用
- 已存在的平铺归档结构会在 `ospec update` 时被整理

</details>

### Goal：适合需要认真规划和反复验证的工作

只有你明确选择完整流程时才使用 Goal。用户选择的 Change 不会因为复杂度、文件数量、风险或批量任务升级，使用 `ospec change` 创建即可；`ospec new` 仍是兼容别名。

可以从终端开始：

```bash
ospec goal improve-checkout
```

然后直接用平常说话的方式告诉 AI 你想要什么结果。也可以不手动运行命令，直接说：「这个需求使用 OSpec goal，一直做到测试通过并完成归档。」

普通用户只需要做到这里。后面的工作由 AI 完成：

1. 只询问那些会真正改变结果的重要选择。
2. 先把商定的做法写下来，让你在改代码前可以检查。
3. 把工作拆成安全的小块，适合并行的部分同时处理。
4. 运行测试，再让独立的审查者检查实现，并处理发现的问题。
5. 更新相关项目文档和索引，确认后续 AI 能找到这个功能，再完成归档。

整个过程中你仍然掌握决定权。AI 会提前说明下一步做什么，遇到需要你选择的地方会暂停，并把进度保存在项目里。即使更换会话，也可以从已有记录继续；你不需要自己运行内部的 `ospec execute` 命令。

创建时可用 `--level L1|L2|L3` 选择 AI 可以自主做到什么程度（默认 L1）：

- **L1**：只检查和报告，不修改项目文件。
- **L2**：可以修改，但遇到重要选择会暂停等待确认。
- **L3**：可以持续执行，但只能在你预先设置的范围内操作。

查看进度使用 `ospec loop status`；暂停和继续使用 `ospec loop pause`、`ospec loop resume`。直接关闭当前 AI 会话也不会丢失已记录的进度。更多高级命令见 [loop-engineering.md](loop-engineering.md)。

在内部，OSpec 会阻止 AI 在重要问题尚未回答时开始实现，让实现者和审查者彼此独立，并要求有测试证据后才把 goal 标记为完成。

每次成功执行 `ospec finalize` 或 `ospec archive`，都会自动生成一份 `docs/project/changes/<归档路径>.md`（nested 布局下位于 `.ospec/docs/project/changes/`），并写入功能索引和 AI 索引。因此普通 change 和 goal 都至少有一份可检索文档。移动 active change 前，归档预检会拒绝覆盖该目标路径上的人工文档，并验证托管输出目录可写。goal 如果修改了架构、API、模块或运行方式，仍必须更新对应的长期项目文档；自动摘要不能代替这些文档。

Claude Code 硬强制（一次性；在 Claude Code 里 AI 会自动帮你执行）：

```bash
ospec session hook --target claude --apply
```

它在 `.ospec/hooks/claude/` 写入 hook bundle，并幂等合并进 `.claude/settings.json`（可逆）。这些 hook 会：

- 在工具层宣告每一次子 agent 派发和每一条 `ospec` 命令，
- 存在未决 required 决策时硬阻断子 agent 派发，
- 只在 startup、clear、compact 时注入静态 Announce-Before-Act / Brainstorm-First 契约；普通 prompt 没有 required decision 时保持静默。

hook 在会话启动时加载，因此从下一次 Claude Code 会话开始生效。

### 目标执行优化

- `.skillrc.workflow.document_review_policy` 默认保持独立文档审查；显式设为 `adaptive` 后，也只有文档声明 `risk_level: low`（或 `none`）且未发现风险信号时才走确定性 inline preflight。
- `.skillrc.workflow.model_profiles` 把逻辑 worker/reviewer profile 映射到各 harness 模型，OSpec 默认配置不硬编码供应商型号。
- 命令执行器通过 `OSPEC_USAGE_FILE` 自动归集标准化 usage；`ospec execute complete --usage-file` 保留为手工入口。`execution-metrics.json` 会区分完整、部分和缺失数据。
- review 同时保存人类可读 Markdown 和结构化 `*.findings.json`；归档会验证声明的文档确实发生有效变化，并从功能索引直接链接长期项目文档。
- `ospec execute repair` 把最终 review 的全部 `NEEDS_CHANGES` findings 合成一个 repair task，并复用原有 dispatch、task review 和 final review 门禁。

### 插件安装方式

- `ospec plugins list`
- `ospec plugins install <plugin>`
- `ospec plugins enable <plugin> [path]`
- 如果对话里说“打开 Stitch / Checkpoint”，应理解为“先检查插件是否已全局安装；未安装才安装；然后在当前项目启用”

## 文档

### 核心文档

- [Prompt Guide](prompt-guide.zh-CN.md)
- [Usage](usage.zh-CN.md)
- [Project Overview](project-overview.zh-CN.md)
- [Installation](installation.zh-CN.md)
- [Skills Installation](skills-installation.zh-CN.md)
- [External Plugins](external-plugins.zh-CN.md)
- [Plugin Release](plugin-release.zh-CN.md)
- [上下文效率与流程回归基准（2026-07-11）](benchmarks/context-efficiency-2026-07-11.zh-CN.md)

## 仓库结构

```text
dist/                       编译后的 CLI 运行时
assets/                     托管协议资产、hooks 和 skill 载荷
docs/                       对外文档
scripts/                    发布和安装辅助脚本
.ospec/templates/hooks/     随包分发的 Git hook 模板
```

## License

本项目使用 [MIT License](../LICENSE)。
