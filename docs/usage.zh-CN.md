# 使用说明

## 常用命令

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec sync [path]
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
ospec plugins status [path]
ospec plugins enable stitch [path]
```

## 推荐流程

新目录建议这样开始：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

推荐的用户主流程是：

- 初始化仓库
- 在一个 change 中执行需求
- 先走项目自己的部署与验证流程，再执行 `ospec verify`
- 用 `ospec finalize` 归档已验证通过的 change

现在的 `ospec init` 目标是把仓库直接带到 `change-ready` 状态：

- 创建协议壳
- 生成基础项目知识文档
- 有现成项目文档时自动复用
- 如果当前是 AI 协作流程且缺少上下文，只追问一次简短的项目概况或技术栈
- 缺少上下文时自动落占位文档
- 不自动创建第一个 change
- 不自动应用业务 scaffold

如果你希望在初始化时直接带上项目上下文，可以这样传：

```bash
ospec init [path] --summary "内部管理后台" --tech-stack node,react,postgres
ospec init [path] --architecture "单体 Web 应用 + API + 统一鉴权" --document-language zh-CN
```

直接执行 CLI 的 `ospec init` 仍然保持非交互。如果仓库没有可复用的项目说明，且你也没有显式传参，OSpec 也会先生成待补充的占位文档，并把仓库带到可直接执行 `ospec new` 的状态。

如果你只是想额外查看项目快照，仍然可以手动执行 `ospec status [path]`，但它不再是推荐主流程的默认第一步。

## 项目知识层维护

当仓库已经初始化后，如果你只是想刷新、修复或补齐项目知识层，请使用：

```bash
ospec docs generate [path]
```

典型场景：

- 老仓库是在旧流程下初始化的
- 项目知识文档被删除了，或者已经漂移
- 新增了模块或 API，需要刷新知识层

`docs generate` 的职责是：

- 刷新项目知识文档
- 保持 scaffold 显式
- 不自动创建第一个 change
- 不生成 `docs/project/bootstrap-summary.md`

## 文档同步与 Hook

如果你已经在项目里修改了协议文档、项目知识层或根技能文件，可以使用：

```bash
ospec sync [path]
```

常见用法：

```bash
ospec sync [path] --dry-run
ospec sync [path] --watch
ospec sync [path] --install-hook
ospec sync [path] --uninstall-hook
ospec sync [path] --staged --stage-updated --if-active
```

`ospec sync [path]` 适合做这些事：

- 根据当前 active change 把变更摘要同步到 `docs/project/*`
- 同步根目录 `SKILL.md`
- 重建 `SKILL.index.json`
- 在需要时把同步后的文件加入 Git 暂存区

常用参数说明：

- `--dry-run`：只预览会更新哪些文件，不真正写入
- `--watch`：持续监听可分析文件变化并自动同步
- `--install-hook`：安装受管的 `pre-commit` sync hook
- `--uninstall-hook`：移除受管的 `pre-commit` sync hook
- `--staged`：只按当前 Git 暂存区里的文件做变更检测
- `--stage-updated`：把本次同步更新到的文件自动加入暂存区
- `--if-active`：没有 active change 时直接跳过并成功退出
- `--no-index`：本次不同步 `SKILL.index.json`
- `--no-knowledge`：本次不同步 `docs/project/*`
- `--no-skill`：本次不同步根目录 `SKILL.md`

## 队列流程

如果你明确要按队列管理多个 change：

```bash
ospec queue add <change-name> [path]
ospec queue status [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
```

这里仍然是显式模式：

- 默认流程仍然是单个 active change
- 只有显式使用 `queue` / `run` 时，才进入队列流程
- `manual-safe` 不改变现有手动执行方式，只负责显式跟踪和推进队列
- `archive-chain` 只会在一次显式 `run step` 中尝试 finalize 并推进下一个 queued change

## 已有项目升级

如果是已经初始化过的项目：

```bash
npm install -g @clawplays/ospec-cli@0.3.2
ospec update [path]
```

如果你是从当前仓库本地安装：

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` 会：

- 刷新协议文档
- 刷新项目 tooling 与 Git hooks
- 刷新 `sync` 命令依赖的 hook 模板与托管资产
- 同步托管安装的 `ospec` 与 `ospec-change` skills
- 刷新已启用插件的托管工作目录资产

`ospec update [path]` 不会：

- 自动启用或停用插件
- 自动把已有 active changes 迁移到新的插件工作流
- 自动替你完成 Stitch 审批或补建插件产物

如果老项目还缺项目知识文档，可以直接重新执行：

```bash
ospec init [path]
```

如果你只是想维护文档层，也可以执行：

```bash
ospec docs generate [path]
```

## 进度与收口

进入执行阶段后，重点使用这些命令：

```bash
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

`ospec finalize` 是标准收口路径。它会验证 change、刷新索引、执行归档，并把 Git 提交留给后续手动处理。
