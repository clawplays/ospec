# 使用说明

## 常用命令

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

## 插件快速开始

AI / `$ospec`：

- 如果用户说“帮我打开 Stitch 插件”，应理解为“先检查 Stitch 是否已经全局安装；未安装才安装；然后在当前项目启用”
- 如果用户说“帮我打开 Checkpoint 插件”，应理解为“先检查 Checkpoint 是否已经全局安装；未安装才安装；然后在当前项目启用”
- 插件启用后，详细说明会同步到 `.ospec/plugins/<plugin>/docs/`
- 真正执行前，先用 `ospec plugins info <plugin>` 或 `ospec plugins installed` 检查插件是否已全局安装
- 如果插件已经安装，就跳过安装，直接在当前项目里启用
- 只有用户明确要求“更新所有已安装插件”时，AI 才能运行 `ospec plugins update --all`

命令行：

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

## 推荐流程

新目录建议这样开始：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

新项目执行 `ospec init [path]` 后，默认使用 nested 布局：仓库根目录保留 `.skillrc` 与 `README.md`，其余 OSpec 托管文件写入 `.ospec/`。
命令行仍然接受 `changes/active/<change>` 这类简写；在 nested 项目里，对应的实际目录是 `.ospec/changes/active/<change>`。
如果你要把旧的 classic 项目迁移到新布局，请显式运行 `ospec layout migrate --to nested`。

## 升级已有项目

```bash
npm install -g @clawplays/ospec-cli@1.0.0
ospec update [path]
```

如果你是从当前仓库本地安装：

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` 会刷新协议文档、工具链、托管 skills、归档布局元数据，以及已启用插件的项目资产。
它也可以修复仍然保留 OSpec 痕迹、但缺少较新核心运行目录的旧项目，并规范化旧项目结构，例如把根目录里的 `build-index-auto.*` 工具迁移到 `.ospec/tools/`，并整理 `.skillrc` 里的旧版 Stitch 插件键。
如果某个已启用插件已经在全局安装记录中，但包被用户手动删除了，`ospec update [path]` 会先尝试自动补装，再继续同步项目资产。
如果某个已启用插件存在更新的兼容 npm 版本，`ospec update [path]` 会自动升级这个全局插件包，并输出从旧版本到新版本的升级明细。
它不会升级当前项目里未启用的全局插件。
它不会自动升级 CLI 本身。
它不会自动把 classic 布局迁移成 nested 布局。
如果你需要切换到新布局，请单独运行 `ospec layout migrate --to nested`。
它不会自动安装全新插件，也不会自动启用插件，或自动迁移 active / queued changes。

## 更新所有已安装插件

如果你想显式更新机器上所有已安装插件，而不是只更新当前项目已启用的插件，请使用：

```bash
ospec plugins update --all
```

常见变体：

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

`ospec plugins update --all` 会检查 OSpec 记录过的所有全局已安装插件，并在发现更高兼容版本时逐个升级。
如果某个已安装插件包被手动删除，这个命令也会先尝试补装，再继续升级。
AI / `$ospec` 只有在用户明确要求“更新所有已安装插件”时，才应该运行 `ospec plugins update --all`。
