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
3. 创建或更新 `design.md`
4. 创建或更新 `implementation-plan.md`
5. 创建或更新 `artifacts/agents/task-graph.json`
6. 创建或更新 `tasks.md`
7. 根据 `state.json` 推进实现
8. 为每个已完成 worker task 完成 task 级 spec 与 quality review
9. 派发并完成最终 `artifacts/reviews/spec-compliance.md` 与 `artifacts/reviews/code-quality.md`
10. 更新 `artifacts/agents/worker-status.md`
11. 更新相关 `SKILL.md`
12. 重建 `SKILL.index.json`
13. 完成 `verification.md`
14. 满足门禁后再归档

## 设计起草

- AI 辅助执行 change 时，必须先基于需求、`proposal.md` 和项目上下文起草或更新 `design.md`，再编辑 `implementation-plan.md`、`tasks.md` 或代码
- 只有缺失决策会实质影响架构、API、数据、UI 或风险时，才提出一个简短设计问题；否则把假设写入 `design.md`
- `implementation-plan.md` 必须从已确认的 `design.md` 推导，并明确目标文件、预期结果、验证命令、依赖、可并行任务和冲突
- `artifacts/agents/task-graph.json` 必须从 `implementation-plan.md` 推导；每个 task 必须包含 id、状态、依赖、并行安全性、冲突、目标文件、验证命令、预期结果和 worker 角色
- `tasks.md` 必须从 `artifacts/agents/task-graph.json` 推导；若 `tasks.md` 已存在但上游文档仍是模板，先补上游文档再对齐任务

## 状态约束

- 以 `state.json` 为当前执行状态依据
- `verification.md` 不能替代 `state.json`
- 若状态文件与执行文件冲突，先修正状态再继续
- `artifacts/agents/task-graph.json` 记录机器可读的 task 状态、依赖、冲突约束、目标文件和验证命令
- 进入已有项目时，用 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`；它只记录 active change、queued change、queue-run、cache fingerprint 和安全下一步命令上下文
- 开始或恢复单个 active change 时，用 `ospec execute bootstrap [changes/active/<change>]` 写入带 project session brief snapshot 的 `bootstrap.json` 和 `bootstrap.md`，然后按其中的下一步安全动作继续
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` 写入 `handoff.json` 和 `handoff.md`；该命令只记录 project session brief snapshot、目标工具映射和安全规则
- 推导或派发实现任务前，用 `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` 生成带 project session brief snapshot 的 `artifacts/agents/document-review-dispatches/` 交接包，并创建 `artifacts/reviews/design-review.md` 或 `artifacts/reviews/implementation-plan-review.md`；design review 通过后才能派发 implementation plan review
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 记录 git 工作区安全状态；当 `workspace-status.json` 显示 `needs_isolation` 时，先暂停并行派发
- 需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<change>]` 写入 `workflow-route.json` 和 `workflow-route.md`；该命令只记录 workflow routing artifacts，不会编辑源码
- 方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门；向用户展示 `artifacts/agents/decisions/index.md` 或 decision report 的 `Chat Prompt`，required pending decision 未选择或跳过前不得继续 dispatch
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `worktree-plan.json` 和 `worktree-plan.md`；该命令只记录计划，不会运行 `git worktree add`
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `finish-plan.json` 和 `finish-plan.md`；该命令只记录 readiness 和命令文本，不会 finalize、archive、push、merge 或删除 worktree。当 finish plan 状态为 ready 且没有 required pending decision 时，继续运行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只用于可选 dry-run 预览，检查通过后不要停在这里
- 需要 task 级持久交接时，用 `ospec execute dispatch` 生成并行安全的 worker 任务包批次和 `artifacts/agents/execution-session.json`；每个 packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior，避免不同工具交接时误判读上下文、编辑、验证和记录完成的边界；用 `--task` 指定单个任务，用 `--limit` 限制派发批次大小；用 `ospec execute complete` 记录 worker 结果；当 complete 记录 `NEEDS_CONTEXT` 或 `BLOCKED` 时，会生成 `artifacts/agents/blockers/`
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` 写入 `launch-plan.json` 和 `launch-plan.md`；这是给当前控制 AI 使用的默认 native agent 启动 artifact，包含 Codex/GPT `spawn_agent`、Claude Code Task、Gemini `@generalist`、OpenCode `@mention`、Cursor Agent/task chat、Copilot CLI/coding-agent task 的调度说明。适配器需要 stdout 上的 machine-readable launch artifact 时使用 `--json`
- 默认多 worker 执行路径是当前 harness 原生 subagent：先 dispatch 安全 packet，查看 `launch-plan.md`，再为每个安全 packet 启动一个 native agent，并用 `ospec execute complete` 记录结果
- 只有当前 harness 不支持原生 subagent 时，才用 `ospec execute orchestrate [changes/active/<change>] --command "..." [--limit N] [--max-rounds N] [--timeout-ms N]` 作为最后 CLI fallback；fallback 模式渲染显式 command template、并发运行 worker command，把结果 collect 回 task graph，并报告 failed-worker retry commands
- 只有原生 subagent 不可用或被明确绕过时，才用 `--run --command`（即 `ospec execute launch ... --run --command "..."`）作为单 worker CLI fallback；随后用 `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` 记录 fallback 任务结果。修复 blocked、needs-context 或 failed work 后，用 `ospec execute retry` 重新派发；已完成任务必须显式 `--force` 才能 retry
- `ospec execute dispatch` 与 `complete` 也会同步 `artifacts/agents/worker-status.md`；人工修改 task graph、execution session、review artifacts、debug evidence 或 verification checklist 后，用 `ospec execute sync` 重建 worker 状态
- 每个 worker task 完成后，先用 `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`，再用 `--stage quality` 生成 task 级 reviewer 交接包。task 级 review 决策写入 `artifacts/reviews/tasks/<task-id>/`，依赖任务会等这两个 review 通过后才可派发
- 所有 task 级 review 通过且 task graph 完成后，用不带 `--task` 的 `ospec execute review [changes/active/<change>] [--stage spec|quality]` 在 `artifacts/agents/review-dispatches/` 下生成最终 whole-change reviewer 交接包；最终 spec review 通过前不得派发最终 quality review
- 只有显式使用 `ospec execute review ... --run --command "..."` 时才运行本地 reviewer 命令，并写入 `artifacts/agents/review-runs/`；提供 `--decision` 时可写回对应 review artifact
- review artifact 有非 `PENDING` 决策后，用 `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` 写入 `artifacts/agents/review-feedback-plan.json` 和 `artifacts/agents/review-feedback-plan.md`；继续派发工作前要明确接受、修订、澄清或阻塞处理；当反馈改变范围、方向、API、UI、风险或已接受取舍时创建 required user decision
- 调试是 change 的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 在 `artifacts/agents/debug-evidence.json` 下记录根因和修复证据
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 在 `artifacts/agents/tdd-evidence.json` 下记录 TDD cycle evidence
- 运行最新项目检查后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` 在 `artifacts/agents/verification-evidence.json` 下记录验证证据
- `ospec session` 以及 `ospec execute bootstrap`、`handoff`、`doc-review`、`workspace`、plan 模式 `worktree`、`finish`、`dispatch`、`launch`、`collect`、`retry`、`complete`、`review`、`debug`、`tdd`、`verify` 与 `sync` 只更新 OSpec artifacts；除 `workspace`、`worktree` 与 `finish` 会读取 git 状态外，不直接编辑项目源码。原生 subagent 由当前 AI harness 启动；只有显式 `worktree --create`、`worktree --cleanup`、fallback `launch --run --command`、`review --run --command` 或 fallback `orchestrate` 才运行 shell 命令
- task graph 存在未解决状态、无效依赖、缺失执行细节，或顶层 `status` 不是 `completed` 时不得归档
- `artifacts/agents/worker-status.md` 记录 implementer、spec reviewer、quality reviewer 和 controller 状态
- 每个 task 级 spec review 必须先通过，才能做该 task 的 quality review；最终 `artifacts/reviews/spec-compliance.md` 必须先通过，才能做最终 `artifacts/reviews/code-quality.md`
- task 级或最终 review decision 为 `PENDING`、`NEEDS_CHANGES` 或 `BLOCKED` 时会阻止 archive
- 任一 worker 状态仍为 `PENDING`、`NEEDS_CONTEXT` 或 `BLOCKED` 时，不得标记 change 完成；归档前 `controller_status` 必须为 `DONE`

## 文档语言

- 项目采用中文 protocol 时，`proposal.md`、`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/review-feedback-plan.md`、`tasks.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`verification.md`、`review.md` 必须保持中文
- 产品界面语言可以按业务使用英文，但不得把产品语言自动映射为 OSpec change 文档语言
- 若当前 change 文档已用中文创建，后续更新必须延续中文，除非项目规则显式要求切换为英文

## 可选步骤

- 是否启用可选步骤，以 `.skillrc.workflow` 为准
- proposal 中的 flags 必须与 workflow 配置兼容
- 被激活的可选步骤必须进入 `artifacts/agents/task-graph.json`、`tasks.md` 和 `verification.md`

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
- `artifacts/agents/task-graph.json` 存在未解决 task 状态、无效依赖或缺失执行细节时不得归档
- `artifacts/agents/worker-status.md` 仍有未解决 worker 状态时不得归档
- 已记录的 debug evidence 为 blocked，或只确认根因但没有后续 fixed 记录时不得归档
- review artifacts 仍有未解决 decision 时不得归档
- verification evidence 为 failed、blocked 或 stale 时不得归档
- `verification.md` 未完成时不得归档

## 执行要求

- 任何 AI 或人工执行 change 时，都必须先读取 `.skillrc`、`SKILL.index.json` 和当前 change 文件
- 任何 claim 必须以实际文件状态为准，不得凭口头描述跳过门禁

## Stitch Canonical Project

- 同一个仓库默认只维护一个 Stitch project，保存在 `.skillrc.plugins.stitch.project`。
- 第一次成功执行 `ospec plugins run stitch <change-path>` 时，如果还没有 canonical project，应该把返回的 project ID 自动保存到 `.skillrc`。
- 后续所有 UI change 都必须复用这个 canonical Stitch project，而不是为每个 change 新建一个新 project。
- 如果 Stitch 返回了不同的 project ID，应视为异常结果，不能直接接受。
