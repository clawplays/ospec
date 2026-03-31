# OSpec

OSpec 是一个面向 AI 协作交付的 CLI 工作流系统。

它不是一个“先生成一堆业务模板”的脚手架，而是一个协议壳优先的协作框架：先建立最小协作协议，再显式补齐项目知识层，最后用 change 流程管理需求的执行、验证和归档。

当前版本：

- CLI：`0.1.1`

文档入口：

- [项目介绍](docs/project-overview.zh-CN.md)
- [安装说明](docs/installation.zh-CN.md)
- [使用说明](docs/usage.zh-CN.md)
- [提示词文档](docs/prompt-guide.zh-CN.md)
- [Skills 安装说明](docs/skills-installation.zh-CN.md)
- [GitLab 自定义 Fork 同步方案](docs/custom-fork-sync.zh-CN.md)
- [Stitch 插件规范](docs/stitch-plugin-spec.zh-CN.md)
- [Checkpoint 插件规范](docs/checkpoint-plugin-spec.zh-CN.md)

## OSpec 是什么

OSpec 的核心目标，不是帮团队一次性生成固定项目结构，而是先把 AI 协作的基本规则落下来。

它做的事情可以概括成三层：

- 先初始化最小协议壳，让项目进入统一协作状态
- 再补齐项目知识层，让 AI 有稳定上下文可读
- 最后用 active change 流程管理每个需求的执行、验证和收口

如果用更通俗的话说，OSpec 管的不是“先写什么业务页面”，而是“团队和 AI 应该按什么规则协作”。

## 想解决什么问题

在 AI 参与研发后，常见问题通常有这些：

- AI 能写代码，但不知道项目里的执行规则
- 需求做完以后，中间过程不可见，也很难回溯
- 文档、技能文件、实现状态容易不同步
- 不同 AI 客户端使用的协作协议不一致
- 某些需求需要设计审批或额外门禁，但缺少统一入口

OSpec 的思路不是直接给一个很重的业务模板，而是先把协议和门禁建立起来，让项目进入可检查、可追踪、可归档的状态。

## 三个核心概念

### 1. 协议壳

协议壳是项目最小可协作骨架，主要解决“项目先进入统一协作状态”。

初始化后，关键文件和目录通常包括：

- `.skillrc`
- `.ospec/`
- `changes/active/`
- `changes/archived/`
- `SKILL.md`
- `SKILL.index.json`
- `for-ai/` 下的一组 AI 协作规则文档

可以把它理解成项目的“协作底座”。

### 2. 项目知识层

协议壳建立以后，项目还需要长期稳定的知识上下文。OSpec 用 `docs/project/` 和分层 `SKILL.md` 去承接这部分内容。

默认会补齐的项目文档包括：

- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `docs/project/module-map.md`
- `docs/project/api-overview.md`

这一步的目标，是让 AI 后续不是盲写，而是有稳定上下文可以引用。

### 3. active change

OSpec 不把一个需求散落在聊天记录里，而是给每个需求建立一个独立的执行容器。

每个 active change 里最关键的文件是：

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

其中真正的执行状态真源是：

- `state.json`

也就是说，项目不是靠“口头说已经完成”，而是靠状态文件和验证文件共同证明 change 到了什么阶段。

## 主流程

OSpec 当前的主流程可以概括成四段：

1. 协议壳初始化
2. 项目知识层补齐
3. active change 执行
4. verify / archive / finalize 收口

对应的核心命令是：

```bash
ospec status [path]
ospec init [path]
ospec docs generate [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## 常见用法

### 1. 先看项目状态

```bash
ospec status .
```

这一步相当于先体检。它会告诉你：

- 项目是否已经初始化
- 缺哪些协议文件
- 项目文档覆盖率如何
- skills 是否完整
- 当前是否存在 active changes
- 下一步最推荐执行什么

### 2. 初始化协议壳

```bash
ospec init .
```

这一步只做最小初始化：

- 创建 OSpec 协议壳
- 不默认生成 Web 模板或业务 scaffold
- 不自动创建第一个 change

这体现了 OSpec 的一个核心原则：先建立协作协议，不抢业务决策，也不猜项目类型。

### 3. 补齐项目知识层

```bash
ospec docs generate .
```

这一步会补齐项目知识层文档、分层技能入口和索引等基础内容。

它的边界也很明确：

- 会补项目知识
- 不会自动应用业务 scaffold
- 不会自动开始一个需求

### 4. 创建一个需求 change

```bash
ospec new landing-refresh .
```

这一步不是直接开始写代码，而是先创建需求执行容器。

创建后，项目里会出现：

- `proposal.md`：记录背景、目标、范围、验收标准
- `tasks.md`：记录任务清单
- `state.json`：记录执行状态
- `verification.md`：记录验证项
- `review.md`：记录评审视角

### 5. 持续查看进度和风险

常用命令：

```bash
ospec progress changes/active/landing-refresh
ospec verify changes/active/landing-refresh
ospec changes status .
```

它们分别解决三个问题：

- `progress`：当前 change 到了哪一步
- `verify`：当前 change 的协议文件和验证项是否完整
- `changes status`：整个项目所有 active changes 的 PASS / WARN / FAIL 汇总

### 6. 标准收口

推荐使用：

```bash
ospec finalize changes/active/landing-refresh
```

`finalize` 是默认收口路径，它会按顺序执行：

- verify
- 重建索引
- archive

最后把 change 从 `changes/active/` 挪到 `changes/archived/`，并把仓库留在“可以手动提交 Git”的状态。

### 7. 显式队列模式

队列模式默认是保守接入：

- `ospec new` 仍然只创建一个普通 active change
- 不会因为仓库状态自动进入队列模式
- 只有显式使用 `ospec queue ...` 或 `ospec run ...` 才会启动队列能力

核心命令：

```bash
ospec queue add landing-refresh .
ospec queue add billing-cleanup .
ospec queue status .
ospec queue next .
ospec run start . --profile manual-safe
ospec run step .
```

runner profile 说明：

- `manual-safe`：只做显式队列跟踪和激活，不改你现有的手动 change 执行方式
- `archive-chain`：在一次显式 `ospec run step` 中，如果当前 active change 已满足归档门禁，OSpec 会先 finalize/archive，再继续推进下一个 queued change

推荐给 AI 的描述方式：

- 单个 change：`使用 OSpec 为这个需求创建并推进一个 change。`
- 只建队列先不跑：`使用 OSpec 读取这份 TODO，把它拆成多个 change，建立队列，并先展示队列状态，不要马上执行。`
- 显式按队列执行：`使用 OSpec 建立 change 队列，并用 ospec run manual-safe 显式推进。`

## 一个需求怎么流转

单个需求的推荐顺序是：

1. 明确上下文和影响范围
2. 创建或更新 `proposal.md`
3. 创建或更新 `tasks.md`
4. 根据 `state.json` 推进实现
5. 更新相关 `SKILL.md`
6. 重建 `SKILL.index.json`
7. 完成 `verification.md`
8. 满足门禁后归档

如果用一句话概括，就是：

需求进入
-> 建 change
-> 写 proposal
-> 写 tasks
-> 按状态推进实现
-> 同步文档和技能
-> 完成 verification
-> verify 检查
-> archive / finalize 收口

这个设计的价值是：

- 每个需求都有独立容器
- 每个阶段都有明确文档锚点
- 完成状态不是“感觉差不多”，而是可检查

## 当前核心功能

从 CLI 能力看，当前功能大致可以分成五组。

### 1. 项目初始化与诊断

- `status`
- `init`
- `docs status`
- `docs generate`

这组命令主要解决“项目是否进入协议化协作状态”。

### 2. 需求执行流程

- `new`
- `progress`
- `verify`
- `archive`
- `finalize`
- `changes status`

这组命令主要解决“一个需求如何从创建走到收口”。

### 3. 技能与索引管理

- `skills status`
- `skill status`
- `skill install`
- `index check`
- `index build`

这组命令主要解决“AI 该从哪里读规则，以及规则是否同步”。

### 4. 插件化工作流

- `plugins status`
- `plugins enable stitch`
- `plugins run stitch`
- `plugins approve stitch`
- `plugins reject stitch`
- `plugins doctor stitch`

这组命令主要解决“某些需求除了代码之外，还需要额外阻断步骤”。

当前第一个插件是 `stitch`，主要面向页面设计验收。

### 5. 协议更新与分发

- `update`
- `skill install`
- `skill install-claude`

这组能力让 OSpec 不只管理单个项目，还能把同一套协作协议同步给不同 AI 客户端。

其中 `ospec update [path]` 的边界是：

- 会刷新协议文档、项目 tooling、Git hooks、托管安装的 skills，以及已启用插件的托管工作目录资产
- 不会自动 `enable/disable` 插件
- 不会自动调整已有 active changes 到新的插件工作流
- 如果要启用 Stitch，仍需显式执行 `ospec plugins enable stitch [path]`

## 一个容易混淆的细节

当前版本里，有两个概念需要分开理解：

- 结构层级
- 工作流模式

### 结构层级

结构判断现在固定只按：

- `none`

来理解。

它不再使用 `basic` / `full` 去描述“仓库结构层级”。

### 工作流模式

初始化出来的 `.skillrc` 默认工作流模式仍然是：

- `full`

它影响的是：

- 支持哪些 feature flags
- 哪些 optional steps 会被激活
- archive gate 需要检查什么

所以应当这样理解：

- 结构层级表示项目是否完成协议化初始化
- 工作流模式表示需求执行时采用多严格的流程

## Stitch 插件

Stitch 体现了 OSpec 的插件化扩展能力。

它的思路不是把设计审核硬编码进主流程，而是：

- 项目通过 plugin 启用能力
- plugin 贡献 optional step
- change 根据 flag 命中后激活这个 step
- `verify / archive / finalize` 依据审批产物进行阻断

例如项目启用 Stitch 后，如果新 change 带这些 flags：

- `ui_change`
- `page_design`
- `landing_page`

那么系统会激活：

- `stitch_design_review`

并在 change 下生成：

- `artifacts/stitch/approval.json`

如果这个审批文件没有通过，change 就不能声称已完成，也不能归档。

在页面设计评审场景下，这个门禁还要求：

- 同一路由只能有一个 canonical layout
- `light/dark` 必须是一套 layout 的主题变体，不能变成两套不同排版
- 交付中必须给出 `screen mapping`
- 旧稿和探索稿必须归档，不能与 canonical 页面并列

这说明 OSpec 的插件不是简单提醒，而是真正参与流程门禁。

## 设计理念

### 1. Protocol-shell-first

先建协议壳，再谈业务。

这样做的好处是：

- 初始化足够轻
- 不容易误判项目类型
- 不会把一个还没想清楚的仓库直接塞成固定模板

### 2. 显式优于隐式

OSpec 很少做“猜你想要什么”的事情。

例如：

- `init` 不自动补 docs
- `docs generate` 不自动建 change
- `new` 不自动推进业务实现

每一步都尽量清晰、可控、可解释。

### 3. 文档是执行面的一部分

在 OSpec 里：

- proposal 不是附属汇报材料
- tasks 不是临时记事本
- verification 不是最后补充说明

这些文档本身就是工作流的一部分，会直接影响后续能不能通过 verify 和 archive。

### 4. `state.json` 是状态真源

项目明确要求：

- 以 `state.json` 作为当前执行状态依据
- `verification.md` 不能替代 `state.json`

这让流程不会因为“说法不一致”而漂移。

### 5. 先门禁，再归档

OSpec 的收口不是“代码写完就提交”，而是：

- 先检查流程是否完整
- 再允许归档
- 归档后再进入 Git 提交阶段

这会让交付边界更清楚。

### 6. 插件化而不是硬编码

像设计审核这类能力，不是直接写死在主流程里，而是通过 plugin 注入 step。

这意味着未来可以继续扩展：

- 设计评审
- 安全检查
- 其他审批能力

而不用把主工作流改得越来越臃肿。

### 7. 同一套协议适配多个 AI 客户端

当前项目不仅管理项目内部流程，还能把技能包同步给：

- Codex
- Claude Code

这意味着团队即使使用不同 AI 工具，也能尽量共享同一套协作协议。

## 当前仓库说明

当前仓库本身首先是：

- OSpec 的实现与发布仓库

它主要包含这些部分：

- `dist/`：编译后的 CLI、commands、workflow、services、adapters
- `assets/`：协议文档、约定模板、全局 skills、git hooks
- `docs/`：对外说明文档和设计规范文档
- `scripts/`：安装、发版、fork 同步相关脚本
- `skill.yaml`、`SKILL.md`、`agents/`：技能打包和分发入口

从 `ospec status .` 的结果看，当前仓库根目录并没有完整初始化成一个“被 OSpec 管理的业务项目”，它还缺：

- `.skillrc`
- `changes/active/`
- `changes/archived/`

这说明当前仓库有两个不同身份：

- 它是 OSpec 工具本身的源码仓
- 它不是一个已经用 OSpec 执行业务需求的示例业务仓

因此更准确的理解是：

- 这个仓库负责实现 OSpec
- OSpec 的直接使用对象，是下游业务项目或新初始化目录

## 当前行为特征

通过实际命令验证，可以确认这些行为：

- `ospec init` 只初始化协议壳，不会自动补项目 docs，也不会自动创建第一个 change
- `ospec docs generate` 会补齐知识层和分层技能入口，但不会应用业务 scaffold
- 当 Stitch 插件未启用时，`ui_change`、`page_design` 这类 flag 会被记录在 `proposal.md`，但会提示为 unsupported flags
- 当 Stitch 插件启用后，同样的 flag 会真正激活 `stitch_design_review`，并自动生成 `artifacts/stitch/approval.json`

这几项特征正好体现了 OSpec 的几个核心设计：

- 默认最小化
- 显式扩展
- 流程可检查
- 插件可阻断
- 队列能力只有在显式要求时才启动

## 快速体验顺序

如果想快速体验一遍主流程，推荐按这个顺序执行：

```bash
ospec status demo
ospec init demo
ospec docs generate demo
ospec new landing-refresh demo
ospec changes status demo
ospec progress demo/changes/active/landing-refresh
```

如果还想体验插件扩展能力，可以继续执行：

```bash
ospec plugins enable stitch demo
ospec new home-hero-redesign demo --flags ui_change,page_design
```

## 总结

如果用一句话概括 OSpec，它不是帮团队“更快生成代码”的工具，而是帮团队“更稳地用 AI 做交付”的工具。

它最核心的价值，不是模板，不是页面，也不是脚手架，而是把 AI 协作这件事从“靠聊天记录推进”，变成“有协议壳、有知识层、有 change 容器、有门禁、有归档”的可管理流程。
