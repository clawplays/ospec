---
name: project-workflow-conventions
title: 工作流执行规范
tags: [conventions, workflow, change, ospec]
---

# 工作流执行规范

本文档用于固定项目中的 OSpec 执行流程，确保需求从规划到实现、验证、归档都有统一门禁。本文只记录项目约定：`ospec execute ...` 的命令目录、参数以及各子命令写出的产物不在此重复。需要时运行 `ospec help execute` 或 `ospec help <subcommand>`；只有当具体的 goal 控制器场景需要某条规则背后的细则时才读 `for-ai/execution-protocol.md`，而不是把它当成进入该层的步骤。

## Workflow Profiles

- `workflow_profile_id: change` 是小功能和常规改动的快速流程：`proposal.md`、`tasks.md`、实现、`verification.md`、`review.md`、`state.json`
- `workflow_profile_id: goal` 是复杂工作的全流程：增加 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、文档 review、worker/reviewer 交接、最终 review、worker status 和 evidence 门禁
- 小功能使用 `ospec change` / `ospec-change`，复杂功能使用 `ospec goal` / `ospec-goal`；`ospec new` 只是 `ospec change` 的兼容别名

## 标准顺序

1. 明确项目上下文和影响范围
2. 创建或更新 `proposal.md`
3. 对经典 change，直接从 `proposal.md` 创建或更新 `tasks.md`
4. 对 goal，创建或更新 `design.md`
5. 对 goal，创建或更新 `implementation-plan.md`
6. 对 goal，创建或更新 `artifacts/agents/task-graph.json`
7. 创建或更新 `tasks.md`
8. 根据 `state.json` 推进实现
9. 对 goal，完成文档、task 级和最终 review 门禁
10. 对 goal，更新 `artifacts/agents/worker-status.md`
11. 更新相关 `SKILL.md`
12. 重建 `SKILL.index.json`
13. 完成 `verification.md`
14. 满足当前 workflow profile 的门禁后再归档

每份产物都从上一份推导，且上游优先：若 `tasks.md` 已存在但上游文档仍是模板，先补上游文档再对齐任务。执行经典 change 时，除非用户明确升级为 goal，否则不要创建 `design.md`、`implementation-plan.md`、task graph、worker packets 或 goal review artifacts。task graph 的字段要求，以及 `serial_reason` / `maxParallelReason` / `scope_reason` 和可选白名单规则，只在 `for-ai/execution-protocol.md` 中定义。

- `Announce-Before-Act`：绝不静默执行——宣告 OSpec skill 与阶段、命令与产物，以及进度被哪个门禁阻塞。在 goal 控制器层还要宣告所选 runtime adapter、worker 数量和实际机制
- `Brainstorm-First`：锁定 goal 设计前，先把方向、架构、API、数据、UI、风险、范围的未决问题提出来，优先升起持久 decision gate 而非静默假设。完整的决策门契约写在你所在 profile 本就会读的文件里：经典 change 读 `for-ai/change-protocol.md`，goal 读 `for-ai/execution-protocol.md`。该契约在所有 harness 上都生效；仅限 Claude 且需手动启用的 session hook 只是在运行时重新注入它，从来不是它的来源

## 状态约束

- 以 `state.json` 为执行状态依据，`verification.md` 不能替代它；若状态文件与执行文件冲突，先修正状态
- 对 goal，`artifacts/agents/task-graph.json` 记录机器可读的 task 状态、依赖、冲突、目标文件和验证命令；`artifacts/agents/worker-status.md` 记录 implementer、spec reviewer、quality reviewer 和 controller 状态。人工修改任一文件后，用 `ospec execute sync` 重建
- 进度清单必须反映事实：proposal.md 验收标准随验证证据通过即时勾选（`[verify:<id>]` 标记项由 sync 自动勾选），未勾项阻塞归档；Goal 的 review.md 由 sync 从 final review 派生，禁止手工编辑
- 任一 worker 状态仍为 `PENDING`、`NEEDS_CONTEXT` 或 `BLOCKED` 时不得标记 change 完成；归档前 `controller_status` 必须为 `DONE`

## 执行命令边界

- `ospec execute ...` 各子命令只写 OSpec artifacts；除 `workspace`、`worktree`、`finish` 会读取 git 状态外，不直接编辑项目源码
- 顺序固定：`preflight --stage design` → `--stage plan` → 派生 task graph → 一次 combined planning review → workspace 检查与 worker 派发
- 普通 red test、对应生产实现和 green/refactor 证据必须放在同一个原子 task
- 每个 task 的一次合并 review（`artifacts/reviews/tasks/<task-id>/review.md`）通过后，依赖任务才可派发；单一的最终 `artifacts/reviews/final-review.md` 通过后才可归档。每个 review packet 都必须交给新的 model-native reviewer subagent——OSpec 不运行本地 reviewer CLI——并写回对应 decision 与 evidence
- 多 worker 执行服从 `runtimeAdapter.selected.nativeSubagent`，只在所选 native adapter 支持并行时并行。capability 缺失、过期或 target 不匹配时必须阻断，不得回退到 Orca、agent CLI 或 current controller
- required pending decision 未选择或跳过前不得继续 dispatch
- finish plan 状态为 ready 且没有 required pending decision 时，继续运行 `ospec finalize`；`ospec archive ... --check` 只是可选的 dry-run 预览，检查通过后不要停在这里

## 文档语言

- 所有 change 产物都用项目采用的文档语言书写
- 产品界面语言可以与 OSpec change 文档语言不同，不得由一方推断另一方
- change 一旦以某种语言创建，后续更新必须延续该语言，除非项目规则显式要求切换

## 可选步骤

- 是否启用可选步骤以 `.skillrc.workflow` 为准，proposal 中的 flags 必须与之兼容
- 被激活的可选步骤必须进入 `tasks.md` 和 `verification.md`；对 goal 还必须进入 `artifacts/agents/task-graph.json`

## 归档约束

出现以下情况不得归档：

- 文档未同步、索引未重建，或可选步骤未通过
- `verification.md` 未完成，或 verification evidence 为 failed、blocked、stale
- review artifacts 仍有未解决 decision；task 级或最终 review decision 为 `PENDING`、`NEEDS_CHANGES` 或 `BLOCKED`
- 已记录的 debug evidence 为 blocked，或只确认根因而没有后续 fixed 记录
- 对 goal，`artifacts/agents/task-graph.json` 存在未解决 task 状态、无效依赖、缺失执行细节，或顶层 `status` 不是 `completed`
- 对 goal，`artifacts/agents/worker-status.md` 仍有未解决 worker 状态

强制归档必须由用户显式接受，CLI 自行强制其确认参数。完整契约写在你所在 profile 本就会读的文件里：经典 change 读 `for-ai/change-protocol.md`，goal 读 `for-ai/execution-protocol.md`。

## 执行要求

- 先读 `.skillrc`，再根据当前 brief 或 dispatch packet 按需打开相关 change 文件、目标文件和索引文档
- 绝不整读 `SKILL.index.json`——它会随归档持续膨胀。用 `ospec docs locate --feature <slug>` 或 `ospec docs locate --affects <路径>` 直接跳到描述该行为的那一节；只有关键词时才用 `ospec index query <keyword...>`。`docs/project/feature-catalog.md` 每个已声明功能一行，不要扫描全部 archived changes
- 已完成功能条目同时链接归档证据和任务声明的长期项目文档。项目文档 frontmatter 可以增加 `features`、`modules`、`aliases`，让人和 AI 从功能名或模块名直接定位
- 声明的文档更新只有在 dispatch 到 complete 的证据表明确实发生了规范化内容变化时才算完成，文件存在本身不是证明
- 每个已归档的普通 change 和 goal 由其索引条目加归档目录直接提供：`ospec changes show <归档名>` 按需渲染摘要、affects、文件清单与验证命令，`docs/project/changes/` 下不再生成任何文件。archive 和 finalize 会重建功能目录与知识索引，但绝不删除或覆盖人工维护的 architecture、module、API 正文——引擎对人工文档的唯一写入是 `ospec:last-change` 溯源注释
- 任何 claim 必须以实际文件状态为准，不得凭口头描述跳过门禁
