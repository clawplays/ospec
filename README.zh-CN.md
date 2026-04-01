<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec</a></h1>

[English](README.md)

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

OSpec 是一个面向 AI 协作交付的 CLI 工作流系统，用来把仓库一次性初始化到可提 change 的状态，并通过可审计的 change 容器推进需求执行。

<p align="center">
  <a href="docs/README.zh-CN.md">文档入口</a> |
  <a href="docs/prompt-guide.zh-CN.md">提示词文档</a> |
  <a href="docs/usage.zh-CN.md">使用说明</a> |
  <a href="docs/project-overview.zh-CN.md">项目介绍</a> |
  <a href="docs/installation.zh-CN.md">安装说明</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## npm 安装

```bash
npm install -g @clawplays/ospec-cli
```

## 推荐提示词

大多数团队使用 OSpec，只要 3 步：

1. 初始化项目
2. 为文档更新、需求开发或 Bug 修复创建并推进一个 change
3. 在需求验收通过后归档这个 change

### 1. 初始化项目

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
- `--document-language`：生成文档的语言，通常使用 `zh-CN` 或 `en-US`
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

![OSpec Change Slash Command 示例](docs/assets/ospecchange-slash-command.svg)

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

## 文档入口

### 核心文档

- [文档总览](docs/README.zh-CN.md)
- [提示词文档](docs/prompt-guide.zh-CN.md)
- [使用说明](docs/usage.zh-CN.md)
- [项目介绍](docs/project-overview.zh-CN.md)
- [安装说明](docs/installation.zh-CN.md)
- [Skills 安装说明](docs/skills-installation.zh-CN.md)
- [GitLab 自定义 Fork 同步方案](docs/custom-fork-sync.zh-CN.md)
- [上游品牌保护说明](docs/upstream-brand-protection.zh-CN.md)

### 高级规范

- [Stitch 插件规范](docs/stitch-plugin-spec.zh-CN.md)
- [Stitch 插件路线图](docs/stitch-plugin-roadmap.zh-CN.md)
- [Checkpoint 插件规范](docs/checkpoint-plugin-spec.zh-CN.md)
- [当前 Vibe Coding Spec Flow](docs/current-vibe-coding-spec-flow.zh-CN.md)

## 仓库结构

```text
dist/                       编译后的 CLI 运行时
assets/                     托管协议资产、hooks 和 skill 载荷
docs/                       对外文档
scripts/                    发布和安装辅助脚本
.ospec/templates/hooks/     随包分发的 Git hook 模板
```

## License

本项目使用 [MIT License](LICENSE)。
