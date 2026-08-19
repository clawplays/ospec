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
  <a href="skills-installation.zh-CN.md">Skills 安装说明</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## 为什么选择 OSpec？

AI 编码助手很强，但如果需求只留在聊天记录里，就很难检查、评审和稳定收口。OSpec 增加了一层轻量工作流，让仓库在写代码之前和上线之后都能保留这次 change 的上下文。

- **把需求变成留在仓库里的规范文件**：OSpec 把一句需求落成 proposal、design、计划、tasks、评审、验证证据等文件，存进你的仓库而不是只留在聊天记录里——任何助手（Codex/GPT、Claude Code、Gemini、OpenCode 或纯 CLI）都能接着上一个停下的地方继续。
- **`ospec change` —— 日常快速流程**：一条需求对应一个 active change，走简短的 `init -> change -> verify/finalize`，轻量、好评审。
- **`ospec goal` 适合较大或风险较高的工作**：你只需要说明想要的结果；AI 会询问重要选择、写出可检查的方案、完成实现和测试、安排独立审查、更新项目文档，并持续推进到结果得到验证。
- **统一、可预测的 Goal 流程**：所有 Goal 都走同一条快速质量路径，在重要选择处暂停，并把进度保存在项目中供后续会话继续。

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

只有在用户明确接受未解决风险时，才可以强制归档：

```bash
ospec finalize changes/active/<change-name> --force-archive --confirm-force-archive <精确-change-名称> --reason "接受未解决的验收风险"
```

归档说明：

- 先完成你项目自己的部署、测试、QA 或验收流程
- 使用 `ospec verify` 确认当前 change 已满足归档条件
- 使用 `ospec finalize` 重建索引并归档这个已验收通过的 change
- 强制归档不会把失败或 `NOT_VERIFIED` 证据改成通过；它要求 force flag、精确名称二次确认和审计原因。缺失状态、`issued` 或 `running` 的 Loop item 仍会阻断；全部 item 已为 `completed`、`failed` 或 `expired` 的历史指针可以保留，归档会标记为 `forced`、`incomplete`、`accepted-risk`
- 新的 nested 项目会归档到 `.ospec/changes/archived/YYYY-MM/YYYY-MM-DD/<change-name>`；CLI 中 `changes/archived/...` 的简写依然可用
- 已存在的平铺归档结构会在 `ospec update` 时被整理

</details>

### Goal：适合需要认真规划和反复验证的工作

只有你明确选择完整流程时才使用 Goal。用户选择的 Change 不会因为复杂度、文件数量、风险或批量任务升级，使用 `ospec change` 创建即可；`ospec new` 仍是兼容别名。

Change 使用精简分阶段指导、当前 AI 的一次轻量 review 和自动派生 closeout。verification、documentation 和 review 门禁全部通过后，`APPROVED` 或 `APPROVED_WITH_CONCERNS` 可以自动 finalize 并归档；显式批量任务仍在 queue 中串行执行。

可以从终端开始：

```bash
ospec goal improve-checkout
```

然后直接用平常说话的方式告诉 AI 你想要什么结果。也可以不手动运行命令，直接说：「这个需求使用 OSpec goal，一直做到测试通过并完成归档。」

普通用户只需要做到这里。后面的工作由 AI 完成：

1. 只询问那些会真正改变结果的重要选择。
2. 先把商定的做法写下来，并在当前上下文完成 design/plan 确定性预检，不再等待文档 reviewer 往返。
3. 把工作拆成安全的小块，把普通 red test 与对应实现放在同一个原子 task，适合并行的部分同时处理。
4. 运行测试，再让独立的审查者检查实现，并处理发现的问题。
5. 更新相关项目文档和索引，确认后续 AI 能找到这个功能，再完成归档。

整个过程中你仍然掌握决定权。AI 会提前说明下一步做什么，遇到需要你选择的地方会暂停，并把进度保存在项目里。即使更换会话，也可以从已有记录继续；你不需要自己运行内部的 `ospec execute` 命令。

所有 Goal 统一执行：design/plan 确定性预检 -> task graph -> 一次独立 combined planning review -> worker/task review -> final review -> verification/finalize。规划 review 若为 `NEEDS_CHANGES`，最多允许一次整体修复和一次差量复审；未改动规划内容的执行器失败会重新武装修复额度，修复后 findings 全部不高于 medium 时确定性通过为 `APPROVED_WITH_CONCERNS`，语义层面重复失败会稳定停止。查看进度使用 `ospec loop status --brief`；controller 使用 `ospec loop run --once --compact-json` 减少重复输出。未知容量时 implementation 默认并发为 3；更大的 session-bound capacity 可在依赖、文件冲突、共享资源、token 和 `maxParallel` 允许时支持 5-10 等配置。可选 allowlist 只在明确配置时增加边界。更多高级命令见 [loop-engineering.md](loop-engineering.md)。

在内部，OSpec 会阻止 AI 在重要问题尚未回答时开始实现，inline 检查 design/plan 就绪状态，让实现者和代码审查者彼此独立，并要求有测试证据后才把 goal 标记为完成。

归档时，`ospec finalize` / `ospec archive` 会写入该 change 的索引条目（携带功能与文档更新记录）、刷新 `docs/project/feature-catalog.md` 中受影响的功能行，并幂等替换功能节的 `ospec:last-change` 溯源注释——这是引擎对人工文档的唯一写入，写入失败只警告、不阻塞归档。`docs/project/changes/` 下不再生成任何文件；想查看某个归档 change，用 `ospec changes show <归档名>` 按需渲染摘要、影响范围、文件清单与验证命令。goal 如果修改了架构、API、模块或运行方式，仍必须更新对应的长期项目文档。

Claude Code 硬强制（一次性；在 Claude Code 里 AI 会自动帮你执行）：

```bash
ospec session hook --target claude --apply
```

它在 `.ospec/hooks/claude/` 写入 hook bundle，并幂等合并进 `.claude/settings.json`（可逆）。这些 hook 会：

- 在工具层宣告每一次子 agent 派发和每一条 `ospec` 命令，
- 存在未决 required 决策时硬阻断子 agent 派发，
- 只在 startup、clear、compact 时注入静态 Announce-Before-Act / Brainstorm-First 契约；普通 prompt 没有 required decision 时保持静默。

hook 在会话启动时加载，因此从下一次 Claude Code 会话开始生效。

### 主要功能

- **活功能文档与定位器**：人工维护的文档里用 `<!-- ospec:feature <slug> code:<路径> -->` 声明功能节；`docs/project/feature-catalog.md` 每个已声明功能一行（slug、一句话、`文档#章节`、状态、最近归档）；`ospec docs locate --feature <slug>` 或 `--affects <路径>` 直接返回该节的位置与行区间，AI 只读一节而不是整份文档。
- **归档按需渲染**：归档写索引条目、刷新功能目录行、幂等写 `ospec:last-change` 溯源注释；`docs/project/changes/` 下不生成文件，`ospec changes show <归档名>` 按需渲染归档详情。
- **文档义务**：规划期 `ospec docs obligations --apply` 按 `change_type` 与功能列表（为空时用 `affects` 经 `code:` 声明回退解析）生成义务，目标已解析到 `文件#章节`——fix 核对该节是否还写着修复前的错误行为，refactor 验证该节仍准确、零改动时用 `ospec docs confirm` 记录 `verified_unchanged`。`.skillrc` 的 `docs_contract.mode: warn|strict` 决定未满足的必需义务是警告还是阻塞归档。`ospec docs audit` 列出 `code:` 路径已变而文档未动的功能节；`ospec docs migrate` 分四个带门禁的阶段把旧生成文档迁移为功能文档。
- **review 双格式与合并修复**：review 同时保存人类可读 Markdown 和结构化 `*.findings.json`；归档会验证声明的文档确实发生有效变化。`ospec execute repair` 把最终 review 的全部 `NEEDS_CHANGES` findings 合成一个 repair task，并复用原有 dispatch、task review 和 final review 门禁。
- **度量入账**：命令执行器通过 `OSPEC_USAGE_FILE` 自动归集标准化 usage；`ospec execute complete --usage-file` 保留为手工入口。`execution-metrics.json` 会区分完整、部分和缺失数据。`.skillrc.workflow.model_profiles` 把逻辑 worker/reviewer profile 映射到各 harness 模型。

## 文档

### 核心文档

- [Prompt Guide](prompt-guide.zh-CN.md)
- [Usage](usage.zh-CN.md)
- [Project Overview](project-overview.zh-CN.md)
- [Installation](installation.zh-CN.md)
- [Skills Installation](skills-installation.zh-CN.md)

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
