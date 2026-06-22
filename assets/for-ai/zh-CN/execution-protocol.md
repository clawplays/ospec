---
name: project-execution-protocol
title: Execution Protocol
tags: [ai, protocol, ospec]
---

# AI 执行协议

## 每次进入项目时必须先读

1. `.skillrc`
2. 若 `.ospec/session-brief.md` 已存在则先读；否则在已初始化项目里运行 `ospec session [path]` 创建它
3. `SKILL.index.json`
4. `docs/project/naming-conventions.md`
5. `docs/project/skill-conventions.md`
6. `docs/project/workflow-conventions.md`
7. 当前 change 文件。`workflow_profile_id: change` 读取 `proposal.md`、`tasks.md`、`state.json`、`verification.md` 和 `review.md`；`workflow_profile_id: goal` 还要读取 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/decisions/`、`artifacts/agents/review-feedback-plan.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json` 和 `artifacts/agents/verification-evidence.json`
8. 如存在 `stitch_design_review`，读取 `artifacts/stitch/approval.json`
9. 如要处理 Stitch / Checkpoint 的 provider、MCP、认证、安装或启用配置，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本

## 强制规则

- 项目 adopted protocol 为中文时，`proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` 和所有 goal-only artifacts 必须保持中文，包括 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、document review、worker/review、status 与 evidence artifacts
- 不得因为页面文案是英文、产品默认语言是英文或需求写有 “English-first” 就把 change 文档改写成英文
- 若当前 change 文档已经是中文，后续续写、修订和补充必须继续使用中文，除非项目规则显式要求切换
- 不得跳过当前 workflow profile 要求的文件和门禁直接声称完成
- 进入已有 OSpec 项目时，用 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`；它只记录 active changes、queued changes、queue-run 状态、cache fingerprint 和安全下一步命令，不启动 worker、不运行测试、不检查 git、不归档、不编辑源码。只有需要接入 harness session-start 时，才用 `ospec session hook [path]` 写入 `.ospec/hooks/` 下的可选 hook artifacts，其中 `using-ospec.md` 会记录 session-start 注入步骤、harness targets、active-change bootstrap 指引，以及 decision/plugin gate 来源
- 只有需要 change 前探索记录时，才用 `ospec brainstorm [path] --topic "..."` 写入 `.ospec/brainstorms/`；`--visual` 会额外生成本地静态 HTML companion，且该命令不会创建 change
- 用 `ospec plan [path] --change changes/active/<change>` 生成 `.ospec/plans/` 下的可选 plan draft；只有明确要更新该 change 的 `implementation-plan.md` 时才传 `--apply`
- 将已激活的内建质量策略步骤（如 `tdd_cycle`、`root_cause_debug`、`verification_evidence`）视为受归档门禁约束的 `optional_steps`；收尾前必须在 `tasks.md`、`verification.md` 和对应 evidence artifacts 中覆盖
- 小功能和常规改动使用 `ospec new` / `ospec-change`，保持 1.0 快速流程：`proposal.md`、`tasks.md`、实现、`verification.md`、`review.md` 和 `state.json`
- 复杂工作使用 `ospec goal` / `ospec-goal`，才启用 `design.md`、`implementation-plan.md`、task graph、文档 review、worker/reviewer 交接和 evidence 门禁
- `ospec execute …` 控制层（bootstrap、doc-review、dispatch、launch、review、worktree、finish、collect、retry、sync）和所有 goal-only artifacts 都属于 `workflow_profile_id: goal`。对 `workflow_profile_id: change`，保持经典快速流程——不要读取或运行 execute 层或 goal artifacts；编辑 `proposal.md` 和 `tasks.md`、实现、记录 `verification.md` 和 `review.md`，再用 `ospec verify` 和 `ospec finalize` 收尾——除非用户明确要求对这个 change 做 agent/worker 执行
- AI 辅助执行 goal 时，必须在完成 `proposal.md` 后、编辑 `implementation-plan.md`、`tasks.md` 或代码前，先起草或更新 `design.md`。执行经典 change 时，不要创建 goal-only 文件，除非用户明确升级为 goal
- `Announce-Before-Act`：绝不静默执行流程。用一句话宣告当前使用哪个 OSpec skill 及所处阶段；即将运行哪个 `ospec execute ...` 命令、会写出什么产物；派发多少个原生 subagent、走哪种机制（Claude Code 用 `Task`、Codex/GPT 用 `spawn_agent`/`wait_agent`/`close_agent`、Gemini 用 `@generalist`、OpenCode 用 `@mention`）；进度被门禁挡住时说明被什么挡住、如何解锁
- `Brainstorm-First`：每个 goal 开局先做一次简短头脑风暴再锁定设计。把方向、架构、API、数据、UI、风险、范围的未决问题逐个抛给用户，而不是默默假设；需要时用 `ospec brainstorm [path] --topic "..."` 持久化探索。任一项真正开放时，优先升起持久 decision gate 让用户选择，而不是记录静默假设；仅当用户明确让 AI 自行决定或不可用时，才在 `design.md` 写入假设并标注为待确认
- 当 change 必须等待用户选择后才能继续时，用 `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:影响 --option id:label:影响 [--recommended id] [--required]` 写入持久 decision gate，向用户展示 decision report 的 `Chat Prompt` 或 `artifacts/agents/decisions/index.md`，再用 `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` 记录用户选择
- 有原生提问 UI 时优先用它展示决策选项（Claude Code 用 `AskUserQuestion`）再记录选择；在 Claude Code 里，`ospec session hook --target claude --apply` 会安装 hook，每轮重申该契约，并在存在未决 required 决策时硬阻断子 agent 派发。在没有原生选择器的 harness（Codex、Gemini、Cursor、Copilot、OpenCode）上，改为把 decision report 的 `Chat Prompt` 贴到对话里向用户提问——提问这一步在所有 harness 上都一样，而且 `ospec execute dispatch` 在所有 harness 上都会因未决 required 决策而阻断，所以任何 harness 都不要跳过提问
- 对 goal，必须从 `design.md` 起草或更新 `implementation-plan.md`，明确目标文件、预期结果、验证命令、依赖、可并行任务和冲突
- 对 goal，必须从 `implementation-plan.md` 推导 `artifacts/agents/task-graph.json`；每个 task 必须包含 id、状态、依赖、并行安全性、冲突、目标文件、验证命令、预期结果和 worker 角色
- 开始或恢复单个 active change 时，用 `ospec execute bootstrap [changes/active/<change>]` 写入带 project session brief snapshot 的 `artifacts/agents/bootstrap.json` 和 `artifacts/agents/bootstrap.md`，然后按其中的下一步安全动作继续
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` 写入 `artifacts/agents/handoff.json` 和 `artifacts/agents/handoff.md`；它只记录 project session brief snapshot、目标工具映射和安全规则，不会启动 worker 或编辑源码
- 推导或派发实现任务前，用 `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` 在 `artifacts/agents/document-review-dispatches/` 下生成带 project session brief snapshot 的文档 reviewer 交接包，并创建 `artifacts/reviews/design-review.md` 或 `artifacts/reviews/implementation-plan-review.md`；design review 通过后才能派发 implementation plan review。该命令只记录 artifacts，不会启动 reviewer、运行 shell 命令、同步 worker status 或编辑源码
- 分派任务前，用 `ospec execute status [changes/active/<change>]` 或 `ospec execute next [changes/active/<change>]` 查看 controller 状态和下一批安全可分派任务
- 需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<change>]` 写入 `artifacts/agents/workflow-route.json` 和 `artifacts/agents/workflow-route.md`；该命令只记录 workflow routing artifacts，不会编辑源码。
- 方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门；required pending decision 会出现在 bootstrap/status/finish 中，也会汇总到 `artifacts/agents/decisions/index.md`，并阻止 dispatch，直到被选择或跳过
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 写入 `artifacts/agents/workspace-status.json` 和 `artifacts/agents/workspace-status.md`；如果状态为 `needs_isolation`，先清理当前工作区或转入隔离 git worktree，再进行并行派发
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `artifacts/agents/worktree-plan.json` 和 `artifacts/agents/worktree-plan.md`；plan 模式只记录准备计划，不会运行 git。只有显式传 `--create` 时才运行 `git worktree add`，只有显式传 `--cleanup` 时才运行 `git worktree remove`；两者都会写入 `artifacts/agents/worktree-runs/`，cleanup 不删除分支
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `artifacts/agents/finish-plan.json` 和 `artifacts/agents/finish-plan.md`；该命令只记录 readiness 和命令文本，不会 finalize、archive、push、merge 或删除 worktree。当 finish plan 状态为 ready 且没有 required pending decision 时，继续运行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只用于可选 dry-run 预览，检查通过后不要停在这里
- 准备好就自动收尾：当 `ospec verify [changes/active/<change>]` 通过、且没有 required pending decision 或 blocking 插件 gate 时，自己运行 `ospec finalize [changes/active/<change>]`——不要停在通过的 `ospec verify` 或 `ospec archive ... --check`（`--check` 只是预览），也不要等用户来要求。只有当某个 gate 确实需要人工时才暂停收尾：尚未答复的 required decision、未批准的 blocking 插件 gate（如 Stitch 或 Checkpoint）、verify 或 archive 报出的真实 blocker，或用户明确要求先预览或批准再归档
- 决策门和 brainstorm 选项属于用户：**绝不要自动选"推荐项"、也不要自己 resolve 决策门**——用能力阶梯（原生问答 UI → Plan/审批 UI → 纯聊天文字）把每个门呈现给用户，等用户真正回答；required 门在用户回答前会阻塞实现与派发，`recommended` 只是给用户看的提示
- 你产出的每个 change 文档和 brainstorm 都要用项目的文档语言（`.skillrc` 的 `documentLanguage` / 托管 `for-ai/` 指引）书写；同一个 change 内不要中英文混用
- 用 `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` 生成并行安全的 worker 任务包批次和 `artifacts/agents/execution-session.json`；每个 packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior。用 `ospec execute complete <task-id> ...` 记录 worker 结果。用 `--task` 指定单个任务，用 `--limit` 限制派发批次大小。这些命令也会同步 `artifacts/agents/worker-status.md`，只更新 OSpec artifacts，不启动外部 worker；required pending user decision 会阻止 dispatch；当结果是 `NEEDS_CONTEXT` 或 `BLOCKED` 时，`complete` 会在 `artifacts/agents/blockers/` 下写入 blocker escalation
- 省 token（不改变任何步骤）：`ospec execute …` 命令带 `--brief` 读精简摘要而非完整报告；用 `ospec execute status --brief` 驱动每一步，不要每轮都重读完整的 `task-graph.json`、`worker-status.md` 或 `launch-plan.md`——产物仍完整写盘，只在需要细节时才打开
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` 写入 native agent 启动计划；它告诉当前控制 AI 如何使用所在 harness 的原生 agent 机制：Codex/GPT 用 `spawn_agent`/`wait_agent`/`close_agent`，Claude Code 用 Task，Gemini 用 `@generalist`，OpenCode 用 `@mention`，Cursor 用 Agent/task chat，Copilot 用 CLI/coding-agent task。适配器需要 stdout 上的 machine-readable launch artifact 时使用 `--json`。这个命令自身不会启动 worker、运行 shell 命令或编辑源码
- 默认多 worker 执行路径是当前 harness 的原生 subagent：用 `ospec execute dispatch` 创建安全 packet，查看 `launch-plan.md`，再由当前 AI 会话为每个安全 packet 启动一个原生 worker agent，并用 `ospec execute complete` 记录结果
- 只有当前 AI harness 不支持原生 subagent 时，才用 `ospec execute orchestrate [changes/active/<change>] --command "..."` 作为最后 CLI fallback；fallback 模式会渲染显式 command template，并发运行 worker command，写入 `artifacts/agents/orchestration-runs/`，collect 结果，并报告 failed-worker retry commands
- 只有原生 subagent 不可用或被明确绕过时，才用 `--run --command`（即 `ospec execute launch ... --run --command "..."`）作为单 worker CLI fallback；它会写入 `artifacts/agents/worker-runs/`，随后用 `ospec execute collect ...` 记录 fallback task result。修复 blocked、needs-context 或 failed work 后，用 `ospec execute retry` 重新派发；已完成任务默认不得 retry，除非显式 `--force`
- worker 记录 `DONE` 或 `DONE_WITH_CONCERNS` 后，用 `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`，再用 `--stage quality` 生成单任务 reviewer 交接包；单任务决策写入 `artifacts/reviews/tasks/<task-id>/`，依赖任务会等该任务 spec 与 quality review 都通过后才可派发
- 所有单任务 review 通过且 task graph 完成后，用不带 `--task` 的 `ospec execute review [changes/active/<change>] [--stage spec|quality]` 在 `artifacts/agents/review-dispatches/` 下生成最终 whole-change reviewer 交接包；最终 spec review 通过前不得派发最终 quality review
- 只有显式使用 `ospec execute review ... --run --command "..."` 时，OSpec 才会运行本地 reviewer 命令并写入 `artifacts/agents/review-runs/`；提供 `--decision` 时可写回单任务或最终 review decision
- review artifact 有非 `PENDING` 决策后，用 `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` 写入 `artifacts/agents/review-feedback-plan.json` 和 `artifacts/agents/review-feedback-plan.md`；继续派发工作前，必须明确接受、修订、澄清或解除阻塞；当反馈影响范围、方向、API、UI、风险或已接受取舍时创建 required user decision gate
- 调试是 change 的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 记录 `artifacts/agents/debug-evidence.json`；`CONFIRMED` 表示隔离根因，`FIXED` 表示修复已验证，`BLOCKED` 会让 verify 失败
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 记录 `artifacts/agents/tdd-evidence.json`；red 必须先记录实现前不通过的聚焦测试，green 必须有前置 red `FAILED` 记录，refactor 必须有前置通过的 green/refactor 证据，`SKIPPED` 必须写明具体原因
- 运行最新项目验证命令后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` 记录 `artifacts/agents/verification-evidence.json`；不得只用聊天摘要声称完成
- 人工修改 task graph、execution session、review artifacts、debug evidence 或 verification checklist 后，用 `ospec execute sync [changes/active/<change>]` 重建 `artifacts/agents/worker-status.md`
- 对 goal，`tasks.md` 必须从 `artifacts/agents/task-graph.json` 推导；如果任务已存在但上游文档仍是模板，先补上游文档，再对齐任务。对经典 change，`tasks.md` 直接从 `proposal.md` 和实现范围推导
- 对 goal，`artifacts/agents/task-graph.json` 中存在未解决 task 状态、无效依赖、缺失执行细节，或顶层 `status` 不是 `completed` 时，不得 archive
- 每个任务必须先完成该任务的 spec review，再完成该任务的 quality review；最终阶段必须先完成 `artifacts/reviews/spec-compliance.md`，再完成 `artifacts/reviews/code-quality.md`；未解决的单任务或最终 review decision 会阻止 archive
- 实现和 review 阶段必须保持 `artifacts/agents/worker-status.md` 与 implementer、spec reviewer、quality reviewer 和 controller 状态一致
- 任一 worker 状态仍为 `PENDING`、`NEEDS_CONTEXT` 或 `BLOCKED` 时，不得把 change 视为完成；归档前 `controller_status` 必须为 `DONE`
- 必须以 `state.json` 作为执行状态依据
- 被激活的可选步骤必须进入 `tasks.md` 和 `verification.md`；对 goal，还必须进入 `artifacts/agents/task-graph.json`
- 如果 `stitch_design_review` 已激活且 `approval.json.preview_url` 为空或 `submitted_at` 为空，先运行 `ospec plugins run stitch <change-path>` 提交设计预览
- Stitch 设计评审必须遵守“一 route 一套 canonical layout”；同一路由下的非 canonical screen 必须明确标记为 `archive / old / exploration`
- 如需 `light/dark` 主题变体，必须基于同一 canonical layout 做视觉主题转换；不得重排模块、改 section grouping、改 CTA placement、改 navigation structure
- 如果项目中已经存在对应页面，必须优先 `edit existing screen` 或 `duplicate existing canonical screen and derive a theme variant`
- 每次 Stitch 交付必须输出 `screen mapping`，至少包含 route、canonical dark/light screen id、derived 关系、archived screen ids
- 旧稿、探索稿、被替换 screen 不得与 canonical screen 混放为同级主页面
- 运行 Stitch 前，优先视为走内建 `stitch` 插件的已配置 provider；只有项目显式覆写 `.skillrc.plugins.stitch.runner` 时才按自定义 runner 处理
- 如项目使用自定义 runner 且配置了 `token_env`，必须确认对应环境变量已设置
- 若本地 Stitch bridge、Gemini CLI、Codex CLI、stitch MCP 或认证状态不明确，先执行 `ospec plugins doctor stitch <project-path>`
- 若 `plugins doctor stitch` 暴露 provider / MCP / auth 问题，先回到与项目文档语言一致的仓库内本地化 Stitch 规范修正配置；不得脱离该文档另造一套 `command` / `args` / `env` 或 stdio proxy 配置
- 如果内建 `codex` provider 下只读调用正常，但 `create_project`、`generate_screen`、`edit_screens` 等写操作在本地卡住，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目显式覆写 `.skillrc.plugins.stitch.runner` 且仍使用 Codex 发起 Stitch 写操作，自定义 runner / wrapper 也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 如果 `stitch_design_review` 已激活且 `approval.json.status != approved`，不得把 change 视为可继续实现、可完成或可归档
- 如果缺失 canonical 说明、theme pairing 说明、screen mapping，或仍存在未归档重复 screen，不得把 change 视为已通过设计审核
- `SKILL.md` 与索引未同步时不得视为完成

## 项目采用版优先

如果项目内规范与母版规范存在差异，应以项目内采用版为准。

## Stitch Canonical Project

- 读取 `.skillrc.plugins.stitch.project.project_id` 作为仓库级固定 Stitch project ID。
- 如果该字段为空，第一次成功的 Stitch 提交会成为 canonical project。
- 如果后续运行返回了不同的 project ID，必须停止并提示异常，不能直接写入审批结果。

## Stitch Provider Baseline

- 如果项目内存在与项目文档语言一致的本地化 Stitch 规范，provider / MCP / auth 配置优先以该文档为准。
- 如果项目内没有该文档，且走内建 `gemini` provider，默认配置基线是 `%USERPROFILE%/.gemini/settings.json` 中的 `mcpServers.stitch.httpUrl = "https://stitch.googleapis.com/mcp"`，并在 `headers` 中设置 `X-Goog-Api-Key`。
- 如果项目内没有该文档，且走内建 `codex` provider，默认配置基线是 `%USERPROFILE%/.codex/config.toml` 中的 `[mcp_servers.stitch]`，要求 `type = "http"`、`url = "https://stitch.googleapis.com/mcp"`，并在 `headers` 或 `[mcp_servers.stitch.http_headers]` 中设置 `X-Goog-Api-Key`。
- 内建 `codex` provider 的 Stitch 写操作默认应带 `--dangerously-bypass-approvals-and-sandbox`；若改用自定义 runner，则该放行参数也必须由自定义 runner 显式承担。

## Stitch Theme Variant Prompt Contract

- 涉及 `light/dark` 主题变体时，prompt 必须明确包含：
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`
