# Skills 安装说明

托管 skills：

- `ospec`
- `ospec-change`

这两个 skill 会在以下场景自动同步：

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` 与 `ospec update` 一定会同步 Codex；如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步 Claude Code。

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

新的提示词优先使用 `$ospec`。

当用户意图是“创建并推进一个 change”时，优先使用 `$ospec-change`。

`$ospec-cli` 只作为旧提示词或旧自动化的兼容别名保留。
