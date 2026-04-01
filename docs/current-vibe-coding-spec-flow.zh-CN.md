# 当前项目的 Vibe Coding / Spec 流程工作文档

## 1. 文档目的

这份文档用于梳理当前仓库里真正还在使用、并且准备继续保留的 spec 流程。

本轮调整后的核心变化是：

- 初始化不再拆成“协议壳初始化 + 首次 docs generate”两个必走步骤
- `ospec init` 现在直接把仓库带到可提 change 的状态
- `ospec docs generate` 下沉为后续维护命令
- dashboard 已移除，流程统一回到 CLI

## 2. 当前流程主线

当前项目收敛为四段式主线：

1. 初始化到 `change-ready`
2. active change 执行
3. 部署并验证
4. 需求归档

对应常用命令是：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

如果后续只是维护项目知识层，再使用：

```bash
ospec docs generate [path]
```

## 3. 初始化后的结构判断

当前实现里，初始化后的判断不再依赖结构层级标签，而是直接看：

- 是否已初始化
- 是否已经 `change-ready`
- docs 覆盖率是否完整
- 是否存在 active changes
- 当前 change 是否可归档

## 4. 当前 spec 分层

### 4.1 协议壳

协议壳关注协作规则本身，核心文件包括：

- `.skillrc`
- `.ospec/`
- `changes/active/`
- `changes/archived/`
- `SKILL.md`
- `SKILL.index.json`
- `for-ai/*`

### 4.2 项目知识层

项目长期知识层主要放在：

- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `docs/project/module-map.md`
- `docs/project/api-overview.md`

这些文档默认由 `ospec init` 首次生成；后续如果需要刷新或修复，再交给 `ospec docs generate`。

### 4.3 单个 change 的执行 spec

每个 active change 的固定协议文件是：

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

其中执行状态真源仍然是：

- `state.json`

## 5. 当前执行顺序

单个 change 的推荐顺序仍然是：

1. 读取上下文和约束
2. 创建或更新 `proposal.md`
3. 创建或更新 `tasks.md`
4. 实现代码
5. 更新受影响的 `SKILL.md`
6. 重建 `SKILL.index.json`
7. 完成 `verification.md`
8. 通过 archive 门禁后归档

## 6. verify 与 archive 的关系

### `ospec verify`

当前更像预检查，主要检查：

- `proposal.md / tasks.md / verification.md` 是否存在
- activated optional steps 是否被文档覆盖
- checklist 是否仍有未勾选项
- `state.json` 当前状态是否合理

### `ospec archive`

当前是真正的归档门禁，要求会更严格：

- `state.json.status == ready_to_archive`
- `verification_passed`
- `skill_updated`
- `index_regenerated`
- activated optional steps 已进入 `passed_optional_steps`
- `tasks.md` 和 `verification.md` 不再有未勾选项

### `ospec finalize`

当前仍是标准官方收口入口，用于串起：

- verify
- index refresh
- archive

## 7. 初始化与 AI 跟进式补充

当用户通过 AI 提示词表达“使用 OSpec 初始化项目”时，当前推荐行为是：

1. 直接进入初始化流程
2. 如果已有项目说明文档，则直接复用
3. 如果缺少足够上下文，只追问一次项目概况或技术栈
4. 如果用户不补充，也继续初始化，并生成待补充的占位文档
5. 初始化完成后，仓库应直接可进入 `ospec new`

当用户直接在终端执行 `ospec init` 时：

- 不走对话追问
- 直接落占位项目文档
- 保证结果仍然是 `change-ready`

## 8. 本轮移除项

### 8.1 Dashboard

dashboard 相关代码与命令已移除。

当前仓库不再保留：

- dashboard 命令入口
- dashboard 服务器代码
- dashboard 静态前端资源
- dashboard 相关帮助文案

### 8.2 结构层级标签

后续讨论流程时，不再使用结构层级标签。

统一改为讨论：

- 是否已初始化
- 是否已 `change-ready`
- 知识层是否完整
- change 是否在执行中
- 是否已可归档
