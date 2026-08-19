# 安装说明

如果你主要通过 AI / `/ospec` 使用 OSpec，优先先发一个简短的 `/ospec` 提示词；这页里的 CLI 安装步骤用于显式本地安装或排错。

安装 OSpec 时，请使用官方 CLI 包 `@clawplays/ospec-cli`，命令为 `ospec`。

## 环境要求

- Node.js `>= 18`
- npm `>= 8`

## 从 npm 安装

```bash
npm install -g @clawplays/ospec-cli
```

## 安装后验证

```bash
ospec --version
ospec --help
```

## 托管 Skills

- `ospec init [path]` 和 `ospec update [path]` 会为 Codex 同步托管的 `ospec`、`ospec-change` 与 `ospec-goal` skills
- 如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步到 Claude Code
