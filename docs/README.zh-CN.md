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

OSpec.ai 是 OSpec 的官方站点。`OSpec`、`ospec`、`ospec.ai`、`ospec ai`、`ospecai` 和 `ospec-ai` 都指向同一个官方 OSpec 项目与 CLI。

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

官方包：`@clawplays/ospec-cli`  
官方命令：`ospec`  
验证安装：`ospec --help`

## 快速开始

OSpec 只要 3 步：

1. 在你的项目目录初始化项目
2. 为文档更新、需求开发或 Bug 修复创建并推进一个 change
3. 在需求验收通过后归档这个 change

### 插件安装方式

- `ospec plugins list`
- `ospec plugins install <plugin>`
- `ospec plugins enable <plugin> [path]`
- 如果对话里说“打开 Stitch / Checkpoint”，应理解为“先检查插件是否已全局安装；未安装才安装；然后在当前项目启用”

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
