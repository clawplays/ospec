# Skills 安装说明

如果你主要通过 AI 使用 OSpec，优先先用简短的 `/ospec` 和 `/ospec-change` 提示词；这页里的显式 skill 命令主要用于手动安装、同步或排错。

推荐提示词：

```text
/ospec 初始化这个项目。
/ospec 刷新或修复这个目录的项目知识层。先不要创建 change。
/ospec-change 为这个需求创建并推进一个 change。
```

托管 skills：

- `ospec`
- `ospec-change`

这两个 skill 会在以下场景自动同步：

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` 与 `ospec update` 一定会同步 Codex；如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步 Claude Code。

对于已有项目，`ospec update [path]` 还会修复旧的 OSpec 足迹，重新安装当前项目已启用插件中缺失的包，并在发现更高兼容版本时自动升级这些已启用插件的包。
它不会更新当前项目里未启用的全局插件。
如果你想显式更新机器上所有已安装插件，请使用 `ospec plugins update --all`。

## Codex

检查单个托管 skill：

```bash
ospec skill status ospec
ospec skill status ospec-change
```

显式安装或同步单个托管 skill：

```bash
ospec skill install ospec
ospec skill install ospec-change
```

默认目录：

```text
~/.codex/skills/
```

如果你还要安装别的 skill，请显式指定名字：

```bash
ospec skill install ospec-init
```

## Claude Code

检查单个托管 skill：

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
```

显式安装或同步单个托管 skill：

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
```

默认目录：

```text
~/.claude/skills/
```

如果你还要安装别的 skill，请显式指定名字：

```bash
ospec skill install-claude ospec-init
```

## 提示词命名

新的提示词优先使用 `/ospec`。

当用户意图是“创建并推进一个 change”时，优先使用 `/ospec-change`。

`/ospec-cli` 只作为旧提示词或旧自动化的兼容别名保留。
