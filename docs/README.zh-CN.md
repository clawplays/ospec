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

OSpec 是一个面向 AI 对话协作的文档驱动开发工作流，让你先用文档明确需求与变更，再驱动 AI 实现、验证与归档。

<p align="center">
  <a href="README.md">文档入口</a> |
  <a href="prompt-guide.zh-CN.md">提示词文档</a> |
  <a href="usage.zh-CN.md">使用说明</a> |
  <a href="project-overview.zh-CN.md">项目介绍</a> |
  <a href="installation.zh-CN.md">安装说明</a> |
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

## 快速开始

使用 OSpec，只要 3 步：

1. 在你的项目目录初始化项目
2. 为文档更新、需求开发或 Bug 修复创建并推进一个 change
3. 在需求验收通过后归档这个 change

### 1. 在你的项目目录初始化项目

推荐提示词：

```text
使用 OSpec 初始化这个项目。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 初始化这个项目。
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
- 语言解析优先级：显式 `--document-language` -> 现有项目文档 / `for-ai/*` / asset manifest -> 回退 `en-US`
- 传了这些参数，就按你提供的内容生成项目说明
- 不传时，OSpec 会优先复用现有文档；如果没有，就先生成待补充的默认文档

</details>

### 2. 创建并推进一个 Change

文档更新、需求开发、重构、Bug 修复，都使用这一类方式。

推荐提示词：

```text
使用 OSpec 为这个需求创建并推进一个 change。
```

Claude / Codex Skill 方式：

```text
使用 $ospec-change 为这个需求创建并推进一个 change。
```

![OSpec Change Slash Command 示例](assets/ospecchange-slash-command.zh-CN.svg)

<details>
<summary>命令行</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

</details>

### 3. 验收通过后归档

当需求已经完成部署、测试、QA 或业务验收后，再归档这个 change。

推荐提示词：

```text
使用 OSpec 归档这个已验收通过的 change。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 归档这个已验收通过的 change。
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

</details>

## npm 更新

如果这是一个已有的 OSpec 项目，在使用 npm 升级 CLI 后，请在项目目录下执行下面的命令，更新项目里的 OSpec 文件：

```bash
ospec update
```

## OSpec 的工作方式

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. 用户提出需求                                                │
│     “使用 OSpec 为这个任务创建并推进一个 change。”             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. 初始化到 change-ready                                       │
│     ospec init                                                  │
│     - .skillrc                                                  │
│     - .ospec/                                                   │
│     - changes/active + changes/archived                         │
│     - 根目录 SKILL 文件和 for-ai 规则文档                       │
│     - docs/project/* 基础知识文档                               │
│     - 复用已有文档或回退到占位文档                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. 执行                                                        │
│     ospec new <change-name>                                     │
│     ospec progress                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. 部署并验证                                                  │
│     项目部署 / 测试 / QA                                        │
│     ospec verify                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. 归档                                                        │
│     ospec finalize                                              │
│     重建索引 + archive                                           │
└─────────────────────────────────────────────────────────────────┘
```

## 三个核心概念

| 概念 | 说明 |
|------|------|
| **协议壳** | 最小协作骨架，包括 `.skillrc`、`.ospec/`、`changes/`、根目录 `SKILL.md`、`SKILL.index.json` 和 `for-ai/` 规则文档。 |
| **项目知识层** | 给 AI 持续读取的项目上下文，例如 `docs/project/*`、分层技能文件和索引状态。 |
| **Active Change** | 单个需求的独立执行容器，通常包含 `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md`。 |

## 功能特性

- **一步到 change-ready 的初始化**：`ospec init` 一次性创建协议壳和基础项目知识文档。
- **带追问能力的初始化**：在 AI 协作初始化中，如果缺少项目概况或技术栈，可以只追问一次；纯 CLI 初始化则直接落占位文档。
- **知识层维护命令**：`ospec docs generate` 用于后续刷新、修复或补齐项目知识层。
- **需求执行可追踪**：一个 change 可以持续对齐 proposal、tasks、state、verification、review。
- **显式队列能力**：`queue` 和 `run` 用于多 change 场景，不会默认偷偷进入队列模式。
- **插件工作流门禁**：内置支持 Stitch 设计审核和 Checkpoint 自动化检查。
- **skills 管理**：支持 Codex 和 Claude Code 的 OSpec skill 安装与检查。
- **标准收口路径**：`finalize` 负责验证、重建索引和归档，Git 提交仍保持手动可控。

## 插件功能

OSpec 内置两个可选插件，用来把 UI 审核和流程验证接入到文档驱动交付流程中。

### Stitch

用于页面设计审核与预览协作，适合落地页、营销页和 UI 变化较多的需求。

AI 对话方式：

```text
使用 OSpec 帮我打开 Stitch 插件。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 帮我打开 Stitch 插件。
```

<details>
<summary>命令行</summary>

```bash
ospec plugins enable stitch .
```

</details>

### Checkpoint

用于应用流程验证与自动化检查，适合提交流程、关键路径和验收前的运行验证。

AI 对话方式：

```text
使用 OSpec 帮我打开 Checkpoint 插件。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 帮我打开 Checkpoint 插件。
```

<details>
<summary>命令行</summary>

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

说明：

- `--base-url` 用来指定运行中的应用地址，供自动化检查使用

</details>

## 文档入口

### 核心文档

- [提示词文档](prompt-guide.zh-CN.md)
- [使用说明](usage.zh-CN.md)
- [项目介绍](project-overview.zh-CN.md)
- [安装说明](installation.zh-CN.md)
- [Skills 安装说明](skills-installation.zh-CN.md)

### 插件高级说明

- [Stitch 插件规范](stitch-plugin-spec.zh-CN.md)
- [Checkpoint 插件规范](checkpoint-plugin-spec.zh-CN.md)

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
