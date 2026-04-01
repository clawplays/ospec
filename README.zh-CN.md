# [OSpec](https://github.com/clawplays/ospec)

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
  <img src="https://img.shields.io/badge/workflow-protocol--shell--first-111827?style=flat-square" alt="Protocol-shell-first workflow">
</p>

OSpec 是一个面向 AI 协作交付的 CLI 工作流系统，用来先建立协作协议，再补齐项目知识层，最后通过可审计的 change 容器推进需求执行。

<p align="center">
  <a href="docs/README.zh-CN.md">文档入口</a> |
  <a href="docs/project-overview.zh-CN.md">项目介绍</a> |
  <a href="docs/installation.zh-CN.md">安装说明</a> |
  <a href="docs/usage.zh-CN.md">使用说明</a> |
  <a href="docs/prompt-guide.zh-CN.md">提示词文档</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## v0.1.1 有什么更新

### 协议壳优先的交付模型

OSpec 的核心思路很直接：不要一上来就猜项目技术栈，也不要先生成一堆业务模板。先把协作协议壳建立起来，再显式补齐项目知识层，最后在独立的 change 容器里执行需求。

```text
+--------------------------------------------------------------------------------------+
| OSpec v0.1.1 - 推荐使用流程                                                          |
+--------------------------------------------------------------------------------------+
| 1. 先检查                                                                           |
|    ospec status .                                                                    |
|    - 看仓库是否已初始化                                                              |
|    - 看文档覆盖率、skills 状态、active changes                                       |
|                                                                                      |
| 2. 再初始化                                                                         |
|    ospec init .                                                                      |
|    - 只创建协议壳                                                                    |
|    - 默认不生成业务 scaffold                                                         |
|                                                                                      |
| 3. 补齐知识层                                                                       |
|    ospec docs generate .                                                             |
|    - 显式补项目文档和 AI 可读上下文                                                  |
|                                                                                      |
| 4. 执行一个需求                                                                     |
|    ospec new landing-refresh .                                                       |
|    - 在 changes/active/<change>/ 中推进                                              |
|    - 跟踪 proposal、tasks、state、verification、review                               |
|                                                                                      |
| 5. 标准收口                                                                         |
|    ospec finalize changes/active/landing-refresh                                     |
|    - verify、重建索引、archive                                                       |
+--------------------------------------------------------------------------------------+
```

### OSpec 的工作方式

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. 用户提出需求                                                │
│     “使用 OSpec 为这个任务创建并推进一个 change。”             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. 检查项目状态                                                │
│     ospec status                                                │
│     - 仓库状态                                                  │
│     - 文档覆盖率                                                │
│     - skills / active changes                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. 建立协议壳                                                  │
│     ospec init                                                  │
│     - .skillrc                                                  │
│     - .ospec/                                                   │
│     - changes/active + changes/archived                         │
│     - 根目录 SKILL 文件和 for-ai 规则文档                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. 补知识层并执行                                              │
│     ospec docs generate                                         │
│     ospec new <change-name>                                     │
│     ospec progress / verify                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. 收口                                                        │
│     ospec finalize                                              │
│     verify + 重建索引 + archive                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 三个核心概念

| 概念 | 说明 |
|------|------|
| **协议壳** | 最小协作骨架，包括 `.skillrc`、`.ospec/`、`changes/`、根目录 `SKILL.md`、`SKILL.index.json` 和 `for-ai/` 规则文档。 |
| **项目知识层** | 给 AI 持续读取的项目上下文，例如 `docs/project/*`、分层技能文件和索引状态。 |
| **Active Change** | 单个需求的独立执行容器，通常包含 `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md`。 |

## 功能特性

- **协议壳优先初始化**：`ospec init` 先建立协作运行时，不先假设业务模板。
- **显式知识层补齐**：`ospec docs generate` 只在你需要时补项目知识层。
- **需求执行可追踪**：一个 change 可以持续对齐 proposal、tasks、state、verification、review。
- **显式队列能力**：`queue` 和 `run` 用于多 change 场景，不会默认偷偷进入队列模式。
- **插件工作流门禁**：内置支持 Stitch 设计审核和 Checkpoint 自动化检查。
- **skills 管理**：支持 Codex 和 Claude Code 的 OSpec skill 安装与检查。
- **标准收口路径**：`finalize` 负责验证、重建索引和归档，Git 提交仍保持手动可控。

## 安装

### 使用 npm 安装

```bash
npm install -g @clawplays/ospec-cli
ospec --version
ospec --help
```

### 从当前仓库安装

```bash
npm install
npm install -g .
ospec --version
```

### 环境要求

- Node.js `>= 18`
- npm `>= 8`

## 快速开始

### 标准流程

```bash
# 1. 检查仓库状态
ospec status .

# 2. 初始化协议壳
ospec init .

# 3. 需要时补齐项目知识层
ospec docs generate .

# 4. 为一个需求创建 change
ospec new landing-refresh .

# 5. 查看进度并标准收口
ospec progress changes/active/landing-refresh
ospec finalize changes/active/landing-refresh
```

### 队列流程

```bash
ospec queue add landing-refresh .
ospec queue add billing-cleanup .
ospec queue status .
ospec run start . --profile manual-safe
ospec run step .
```

### 插件流程

```bash
ospec plugins status .
ospec plugins enable stitch .
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

## 提示词示例

```text
使用 OSpec 初始化这个项目。

使用 OSpec 补齐这个项目的知识层。

使用 OSpec 为这个需求创建并推进一个 change。

使用 OSpec 读取这份 TODO，把它拆成多个 change，建立队列，并先展示队列状态。
```

如果你的 AI 客户端已经安装 OSpec skills，优先使用当前环境里实际安装的技能名，例如 `$ospec` 或 `$ospec-change`：

```text
使用 $ospec 初始化这个项目。
使用 $ospec-change 为这个需求创建并推进一个 change。
```

## Skills

如果你通过 `npm install -g @clawplays/ospec-cli` 或 `npm install -g .` 安装，默认自动同步的托管 skill 是 `ospec-change`。

```bash
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
```

如果你还需要别的 skill，请显式安装：

```bash
ospec skill install ospec-init
ospec skill install-claude ospec-init
```

## 文档入口

### 核心文档

- [文档总览](docs/README.zh-CN.md)
- [项目介绍](docs/project-overview.zh-CN.md)
- [安装说明](docs/installation.zh-CN.md)
- [使用说明](docs/usage.zh-CN.md)
- [提示词文档](docs/prompt-guide.zh-CN.md)
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
