# 安装说明

如果你主要通过 AI 使用 OSpec，优先先发一个简短的 `/ospec` 提示词；这页里的 CLI 安装步骤用于显式本地安装或排错。

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

## 插件安装方式

如果你主要通过 AI / `/ospec` 使用 OSpec，推荐先这样说：

```text
/ospec 帮我在当前项目打开 Stitch 插件。
/ospec 帮我在当前项目打开 Checkpoint 插件。
```

这类请求应理解为：“先检查插件是否已经全局安装；未安装才安装；然后在当前项目启用”。

严格 AI 规则：

1. 先用 `ospec plugins info <plugin>` 或 `ospec plugins installed` 检查插件是否已经全局安装。
2. 如果已经安装，不要因为换了一个项目就重复安装。
3. 直接复用已安装的插件，在新项目里执行 `ospec plugins enable ...`。
4. 只有在插件尚未安装，或用户明确要求重装 / 升级时，才执行 `ospec plugins install <plugin>`。
5. 只有在用户明确要求“更新所有已安装插件”时，才执行 `ospec plugins update --all`。

命令行备用流程：

```bash
ospec plugins list
ospec plugins install stitch
ospec plugins install checkpoint
```

然后在目标项目里启用：

```bash
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

说明：

- `ospec plugins list` 用于查看可用插件
- `ospec plugins install <plugin>` 用于显式安装插件
- `ospec plugins update <plugin>` 用于升级单个全局插件包
- `ospec plugins update --all` 用于升级 OSpec 记录过的所有全局插件包
- 如果通过 AI / `/ospec` 说“帮我打开 Stitch / Checkpoint 插件”，应理解为“先检查是否已全局安装；未安装才安装；然后在当前项目启用”
- 插件安装是全局共享的，插件启用是项目级的
- 一旦插件已经全局安装，后续在其他项目里应直接复用并执行启用，不要重复下载
- 执行 `ospec plugins install <plugin>` 时，插件包自己的 npm 依赖也会一起装好
- 对 Checkpoint 来说，`ospec plugins enable checkpoint ...` 还会把目标项目运行检查所需依赖安装到项目里
- 启用后，插件自己的详细文档会同步到 `.ospec/plugins/<plugin>/docs/`

## 托管 Skills

- `ospec init [path]` 和 `ospec update [path]` 会为 Codex 同步托管的 `ospec` 与 `ospec-change` skills
- `ospec update [path]` 会修复仍然保留 OSpec 痕迹的旧项目，补装当前项目已启用插件中缺失的全局包，并在发现更高兼容版本时自动升级这些已启用插件的包
- `ospec update [path]` 不会升级当前项目里未启用的全局插件
- `ospec plugins update --all` 才是显式的“更新所有已安装插件”命令
- 如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步到 Claude Code
