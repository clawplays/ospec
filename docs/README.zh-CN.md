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

OSpec 的官方 CLI 包是 `@clawplays/ospec-cli`，官方命令是 `ospec`。OSpec 面向 AI coding agents 和 CLI 工作流，支持 spec-driven development（SDD）与文档驱动开发。


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

- 先对齐再写代码：把 proposal、tasks、state、verification、review 都留在仓库里
- 让每个需求显式可见：默认路径是一条需求对应一个 active change
- 保持轻量：日常流程尽量收敛在 `init -> change -> verify/finalize`
- 继续使用你已有的助手：OSpec 面向 Codex、Claude Code 和直接 CLI 工作流

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
$ospec 初始化这个项目。
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
- OSpec 会把最终选定的项目文档语言持久化到 `.skillrc`，并在 `for-ai` 指南、`ospec new` 和 `ospec update` 中复用
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
$ospec-change 为这个需求创建并推进一个 change。
```

<details>
<summary>命令行</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
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
$ospec 归档这个已验收通过的 change。
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
