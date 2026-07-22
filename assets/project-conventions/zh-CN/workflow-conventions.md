---
name: project-workflow-conventions
title: 工作流执行规范
tags: [conventions, workflow, change, ospec]
---

# 工作流执行规范

## 目标

本文档用于固定项目中的 OSpec 执行流程，确保需求从规划到实现、验证、归档都有统一步骤。

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

## Workflow Profiles

- `workflow_profile_id: change` 是小功能和常规改动的 1.0 快速流程：`proposal.md`、`tasks.md`、实现、`verification.md`、`review.md` 和 `state.json`
- `workflow_profile_id: goal` 是复杂工作的全流程：增加 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、文档 review、worker/reviewer 交接、最终 review、worker status 和 evidence 门禁
- 小功能使用 `ospec new` / `ospec-change`，复杂功能使用 `ospec goal` / `ospec-goal`

## Goal 设计起草

- AI 辅助执行 goal 时，必须先基于需求、`proposal.md` 和项目上下文起草或更新 `design.md`，再编辑 `implementation-plan.md`、`tasks.md` 或代码
- 执行经典 change 时，不要创建 `design.md`、`implementation-plan.md`、task graph、worker packets 或 goal review artifacts，除非用户明确升级为 goal
- `Announce-Before-Act`：绝不静默执行——宣告 OSpec skill 与阶段、命令与产物、所选 runtime adapter、worker 数量与实际机制，以及进度被哪个门禁阻塞
- `Brainstorm-First`：每个 goal 开局先做一次简短头脑风暴再锁定设计，把方向、架构、API、数据、UI、风险、范围的未决问题逐个问用户；优先升起持久 decision gate 而非静默假设，仅当用户明确让 AI 自行决定时才在 `design.md` 写入假设并标注待确认
- `implementation-plan.md` 必须从已确认的 `design.md` 推导，并明确目标文件、预期结果、验证命令、依赖、可并行任务和冲突
- `artifacts/agents/task-graph.json` 必须从 `implementation-plan.md` 推导；每个 task 必须包含 id、状态、依赖、并行安全性、冲突、目标文件、验证命令、预期结果和 worker 角色。生成的串行 task 还必须包含 `serial_reason`；显式限制为单 worker 时记录 `maxParallelReason`。超过六个目标的 task 必须拆分，或用具体的 `scope_reason` 说明其原子边界
- 可选白名单是额外边界：使用 CAS 和显式扩权确认从任务图 derive/check/apply 精确权限；重复 configure 参数是替换而非追加
- `tasks.md` 必须从 `artifacts/agents/task-graph.json` 推导；若 `tasks.md` 已存在但上游文档仍是模板，先补上游文档再对齐任务
- 执行经典 change 时，`tasks.md` 直接从 `proposal.md` 和实现范围推导

## 状态约束

- 以 `state.json` 为当前执行状态依据
- `verification.md` 不能替代 `state.json`
- 若状态文件与执行文件冲突，先修正状态再继续
- 对 goal，`artifacts/agents/task-graph.json` 记录机器可读的 task 状态、依赖、冲突约束、目标文件和验证命令
- 进入已有项目时，用 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`；它只记录 active change、queued change、queue-run、cache fingerprint 和安全下一步命令上下文
- 开始或恢复单个 active Goal 时，用 `ospec execute bootstrap [changes/active/<goal>]` 写入带 project session brief snapshot 的 `bootstrap.json` 和 `bootstrap.md`，然后按其中的下一步安全动作继续。经典 Change 改用 `ospec progress`、顶层 `ospec verify` 和 `ospec finalize`
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` 写入 `handoff.json` 和 `handoff.md`；该命令只记录 project session brief snapshot、目标工具映射和安全规则
- 派生 task graph 前，依次运行 `ospec execute preflight [changes/active/<change>] --stage design` 和 `--stage plan`，生成确定性 inline preflight packet 与 approval artifacts；两步通过后再派生或刷新 task graph，任何阶段都不启动 reviewer child。普通 red test、对应生产实现和 green/refactor 证据应放在同一个原子 task
- task graph 派生后，Loop 必须在 workspace 或 worker 派发前执行一次独立 combined planning review。最多允许一次整体规划修复和一次 fresh re-review；重复失败必须稳定停止
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 在 `artifacts/agents/workspace-status.json`（`workspace-status.json`）中记录 git 工作区安全状态；已有 Goal 只允许非 `PENDING` 任务目标文件、由已启动任务声明的 build/typecheck 验证精确派生且位于其包内的 `tsconfig.tsbuildinfo`，或当前哈希校验通过的 `ospec update` 证明所归属的脏路径，其余脏路径显示 `needs_isolation`
- 需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<change>]` 写入 `workflow-route.json` 和 `workflow-route.md`；该命令只记录 workflow routing artifacts，不会编辑源码
- 方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门；向用户展示 `artifacts/agents/decisions/index.md` 或 decision report 的 `Chat Prompt`，required pending decision 未选择或跳过前不得继续 dispatch
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `worktree-plan.json` 和 `worktree-plan.md`；该命令只记录计划，不会运行 `git worktree add`
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `finish-plan.json` 和 `finish-plan.md`；该命令只记录 readiness 和命令文本，不会 finalize、archive、push、merge 或删除 worktree。当 finish plan 状态为 ready 且没有 required pending decision 时，继续运行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只用于可选 dry-run 预览，检查通过后不要停在这里
- 需要 task 级持久交接时，用 `ospec execute dispatch` 生成并行安全的 worker 任务包批次和 `artifacts/agents/execution-session.json`；每个 packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior，避免不同工具交接时误判读上下文、编辑、验证和记录完成的边界；用 `--task` 指定单个任务，用 `--limit` 限制派发批次大小；用 `ospec execute complete` 记录 worker 结果；当 complete 记录 `NEEDS_CONTEXT` 或 `BLOCKED` 时，会生成 `artifacts/agents/blockers/`
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` 写入 `launch-plan.json` 和 `launch-plan.md`；只有当前有效且 target 匹配的 session capability 才能选择 `runtimeAdapter.selected.nativeSubagent`
- 多 worker 执行服从 `runtimeAdapter.selected.nativeSubagent`：只在所选 native adapter 支持并行时启动安全 batch。capability 缺失、过期或 target 不匹配时必须阻断，不能回退到 Orca、agent CLI 或 current controller
- `execute orchestrate`、`launch --run --command`、`review --run --command` 与 `loop watch` 已移除，并在任何进程或 run artifact 创建前失败。修复 blocked、needs-context 或 failed work 后，用 `ospec execute retry` 重新派发；已完成任务必须显式 `--force` 才能 retry
- `ospec execute dispatch` 与 `complete` 也会同步 `artifacts/agents/worker-status.md`；人工修改 task graph、execution session、review artifacts、debug evidence 或 verification checklist 后，用 `ospec execute sync` 重建 worker 状态
- 每个 worker task 完成后，如果 Goal 由 controller Loop 管理，用 `ospec loop tick [changes/active/<change>]` 生成合并 code reviewer action，并原子绑定真实 executor provenance；只有非 controller 流程才直接运行 `ospec execute review ... --task <task-id>`。task 级 review 决策写入 `artifacts/reviews/tasks/<task-id>/review.md`，依赖任务会等这一次合并 review 通过后才可派发
- 所有 task 级 review 通过且 task graph 完成后，controller Loop 用下一次 `ospec loop tick` 生成最终整体 review；只有非 controller 流程才直接运行不带 `--task` 的 `ospec execute review`
- review packet 必须交给新的 model-native reviewer subagent；OSpec 不运行本地 reviewer CLI。reviewer 完成后写回对应 decision 与 evidence
- review artifact 有非 `PENDING` 决策后，用 `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` 写入 `artifacts/agents/review-feedback-plan.json` 和 `artifacts/agents/review-feedback-plan.md`；继续派发工作前要明确接受、修订、澄清或阻塞处理；当反馈改变范围、方向、API、UI、风险或已接受取舍时创建 required user decision
- 调试是 change 的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 在 `artifacts/agents/debug-evidence.json` 下记录根因和修复证据
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 在 `artifacts/agents/tdd-evidence.json` 下记录 TDD cycle evidence
- 运行最新项目检查后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` 在 `artifacts/agents/verification-evidence.json` 下记录验证证据
- `ospec session` 以及 `ospec execute bootstrap`、`handoff`、`preflight`、`workspace`、plan 模式 `worktree`、`finish`、`dispatch`、`launch`、`collect`、`retry`、`complete`、`review`、`debug`、`tdd`、`verify` 与 `sync` 只更新 OSpec artifacts；除 `workspace`、`worktree` 与 `finish` 会读取 git 状态外，不直接编辑项目源码。controller 只通过所选 model-native subagent adapter 派发 worker
- task graph 存在未解决状态、无效依赖、缺失执行细节，或顶层 `status` 不是 `completed` 时不得归档
- `artifacts/agents/worker-status.md` 记录 implementer、spec reviewer、quality reviewer 和 controller 状态
- 每个 task 的一次合并 review（`artifacts/reviews/tasks/<task-id>/review.md`）必须通过；单一的最终 `artifacts/reviews/final-review.md` 必须通过
- task 级或最终 review decision 为 `PENDING`、`NEEDS_CHANGES` 或 `BLOCKED` 时会阻止 archive
- 任一 worker 状态仍为 `PENDING`、`NEEDS_CONTEXT` 或 `BLOCKED` 时，不得标记 change 完成；归档前 `controller_status` 必须为 `DONE`

## 文档语言

- 项目采用中文 protocol 时，`proposal.md`、`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/planning-preflights/`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/review-feedback-plan.md`、`tasks.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/final-review.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`verification.md`、`review.md` 必须保持中文
- 产品界面语言可以按业务使用英文，但不得把产品语言自动映射为 OSpec change 文档语言
- 若当前 change 文档已用中文创建，后续更新必须延续中文，除非项目规则显式要求切换为英文

## 可选步骤

- 是否启用可选步骤，以 `.skillrc.workflow` 为准
- proposal 中的 flags 必须与 workflow 配置兼容
- 被激活的可选步骤必须进入 `tasks.md` 和 `verification.md`；对 goal，还必须进入 `artifacts/agents/task-graph.json`

## 插件阻断

- 是否启用插件能力，以 `.skillrc.plugins` 为准
- 如果当前 change 激活了 `stitch_design_review`，必须先检查 `artifacts/stitch/approval.json`
- 如果 `approval.json.preview_url` 为空或 `submitted_at` 为空，先执行 `ospec plugins run stitch <change-path>` 生成预览，再把预览地址发给用户验收
- `ospec plugins run stitch <change-path>` 默认走已配置的 Stitch provider 适配器；如果项目显式覆写 `.skillrc.plugins.stitch.runner`，则走自定义 Stitch bridge / wrapper
- 使用自定义 runner 时，可通过 `token_env` 约束额外 token；使用内建 Gemini 适配器时，通常应在 `%USERPROFILE%/.gemini/settings.json` 的 `mcpServers.stitch` 中配置认证信息
- 可通过 `ospec plugins doctor stitch <project-path>` 检查 runner、provider CLI、stitch MCP 与认证提示状态
- 涉及 Stitch / Checkpoint 安装、provider 切换、doctor 修复、MCP、认证配置或插件启用时，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本，不得为通过检查而临时拼出另一套配置
- 对启用了 Checkpoint 的 change，必须先为变更涉及的运行时页面配置 route/flow 断言、accessibility 预期、视觉基线、截图/trace、console/network 证据，再把自动化门禁视为可审查
- Checkpoint gate 的可审查状态要求 `artifacts/checkpoint/gate.json` 同时满足 `status: passed`、`evidence.status: complete`，并且每个激活 checkpoint step 的 evidence 都完整；如果 runner 通过但缺少截图、trace、视觉 diff 证据、route/flow 覆盖或 assertion，不得视为可归档
- 如果仓库里没有 Stitch 规范文档，则使用内建基线：`gemini` 改 `%USERPROFILE%/.gemini/settings.json` 的 `mcpServers.stitch.httpUrl` 与 `headers.X-Goog-Api-Key`；`codex` 改 `%USERPROFILE%/.codex/config.toml` 的 `[mcp_servers.stitch]`，并设置 `type = "http"`、`url = "https://stitch.googleapis.com/mcp"`、`X-Goog-Api-Key`
- 如果内建 `codex` provider 下只读调用正常，但写操作卡在本地未真正进入 `mcp_tool_call`，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目覆写了自定义 Codex runner / wrapper，自定义运行链也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 当 `approval.json.status` 不是 `approved` 时，不得继续声称 change 已通过设计审核或可归档
- 记录审批结果时，优先使用 `ospec plugins approve stitch <change-path>` 或 `ospec plugins reject stitch <change-path>`

## 归档约束

- 文档未同步时不得归档
- 索引未重建时不得归档
- 可选步骤未通过时不得归档
- 对 goal，`artifacts/agents/task-graph.json` 存在未解决 task 状态、无效依赖或缺失执行细节时不得归档
- 对 goal，`artifacts/agents/worker-status.md` 仍有未解决 worker 状态时不得归档
- 已记录的 debug evidence 为 blocked，或只确认根因但没有后续 fixed 记录时不得归档
- review artifacts 仍有未解决 decision 时不得归档
- verification evidence 为 failed、blocked 或 stale 时不得归档
- `verification.md` 未完成时不得归档

## 执行要求

- 任何 AI 或人工执行 change 时，都必须先读取 `.skillrc` 和 `SKILL.index.json`，再根据当前 brief 或 dispatch packet 按需打开相关 change 文件、目标文件和索引文档
- 使用 `docs/project/feature-index.md` 和 `SKILL.index.json.archived_changes` 定位已完成功能，不要扫描全部 archived changes
- 已完成功能条目同时链接归档证据和任务声明的长期项目文档。项目文档 frontmatter 可以增加 `features`、`modules`、`aliases`，让人和 AI 能从功能名或模块名直接定位。
- 声明的文档更新只有在 dispatch 到 complete 的证据表明确实发生了规范化内容变化时才算完成；文件存在本身不能证明文档已更新。
- 每个已归档的普通 change 和 goal 都有一份由 OSpec 生成并索引的 `docs/project/changes/<归档路径>.md`。归档消失后可以安全重建或清理由 OSpec 生成的 change 文档，但清理绝不删除人工文档，归档也绝不覆盖同路径人工文档。
- archive 和 finalize 会刷新自动生成的功能定位文档与知识索引，但不会覆盖人工维护的 architecture、module 或 API 正文
- 任何 claim 必须以实际文件状态为准，不得凭口头描述跳过门禁

## Stitch Canonical Project

- 同一个仓库默认只维护一个 Stitch project，保存在 `.skillrc.plugins.stitch.project`。
- 第一次成功执行 `ospec plugins run stitch <change-path>` 时，如果还没有 canonical project，应该把返回的 project ID 自动保存到 `.skillrc`。
- 后续所有 UI change 都必须复用这个 canonical Stitch project，而不是为每个 change 新建一个新 project。
- 如果 Stitch 返回了不同的 project ID，应视为异常结果，不能直接接受。
