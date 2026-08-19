# Skills 安装说明

如果你主要通过 AI 使用 OSpec，小功能优先用 `/ospec-change`，复杂全流程工作用 `/ospec-goal`；这页里的显式 skill 命令主要用于手动安装、同步或排错。

推荐提示词：

```text
/ospec 初始化这个项目。
/ospec 刷新或修复这个目录的项目知识层。先不要创建 change。
/ospec-change 为这个需求创建并推进一个小 change。
/ospec-goal 为这个需求创建并推进一个完整 goal。
```

托管 skills：

- `ospec`
- `ospec-change`
- `ospec-goal`

这两个 skill 会在以下场景自动同步：

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` 与 `ospec update` 一定会同步 Codex；如果检测到 `CLAUDE_HOME` 或已有 `~/.claude` 目录，也会同步 Claude Code。

对于已有项目，`ospec update [path]` 还会在刷新托管资产之前修复旧的 OSpec 足迹。

## Codex

检查单个托管 skill：

```bash
ospec skill status ospec
ospec skill status ospec-change
ospec skill status ospec-goal
```

显式安装或同步单个托管 skill：

```bash
ospec skill install ospec
ospec skill install ospec-change
ospec skill install ospec-goal
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
ospec skill status-claude ospec-goal
```

显式安装或同步单个托管 skill：

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
ospec skill install-claude ospec-goal
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

当用户意图是小功能或常规改动时，优先使用 `/ospec-change`。当工作需要设计文档、实现计划、task graph、worker/review 或证据门禁时，使用 `/ospec-goal`。

`/ospec-cli` 只作为旧提示词或旧自动化的兼容别名保留。
