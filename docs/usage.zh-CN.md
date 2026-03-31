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
ospec plugins status [path]
ospec plugins enable stitch [path]
```

## 推荐流程

新目录建议先执行：

```bash
ospec status [path]
ospec init [path]
```

如果你明确要补齐项目知识层，再执行：

```bash
ospec docs generate [path]
```

如果你明确要开始一个需求，再执行：

```bash
ospec new <change-name> [path]
```

如果你明确要按队列管理多个 change，再执行：

```bash
ospec queue add <change-name> [path]
ospec queue status [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
```

注意这里是显式模式：

- 默认流程仍然是单个 active change
- 只有你显式使用 `queue` / `run` 命令时，才进入队列流程
- `manual-safe` 不会改变现有手动执行流程，只负责显式跟踪和推进队列
- `archive-chain` 会在一次显式 `run step` 中尝试 finalize 当前已满足门禁的 change，然后再推进下一个 queued change

当一个 change 执行完成后，使用下面的标准收口命令：

```bash
ospec finalize [changes/active/<change>]
```

## 已有项目升级

如果是已经初始化过的项目，推荐按这个顺序升级：

```bash
npm install -g @clawplays/ospec-cli@0.1.1
ospec update [path]
```

如果你是从当前仓库本地安装，则等价于：

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` 会：

- 刷新协议文档
- 刷新项目 tooling 与 Git hooks
- 同步托管安装的 `ospec-change` skills
- 刷新已启用插件的托管工作目录资产

`ospec update [path]` 不会：

- 自动启用或停用插件
- 自动把已有 active changes 迁移到新的插件工作流
- 自动替你完成 Stitch 审批或补建插件产物

如果已有项目要启用 Stitch，还需要显式执行：

```bash
ospec plugins enable stitch [path]
ospec plugins status [path]
```

如果项目里已经有 active changes，要不要把这些旧 change 纳入新的 Stitch 流程，仍需要你显式处理；`update` 本身不会替你迁移。

## 初始化预期

普通初始化默认保持最小化：

- 只创建 OSpec 协议壳
- 不默认生成 Web 模板或业务 scaffold
- 不自动创建第一个 change
- 结构层级固定按 `none` 处理，不再区分 `basic` / `full`
- 没有 active changes 时，Git hooks 应保持安静

## 进度与检查

进入执行阶段后，重点使用这些命令：

```bash
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

`ospec finalize` 是标准收口路径。它会完成验证、刷新索引、执行归档，并把仓库留在“可手动提交”的状态。
