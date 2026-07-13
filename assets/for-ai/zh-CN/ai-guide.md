---
name: project-ai-guide
title: AI Guide
tags: [ai, guide, ospec]
---

# AI 开发指南

## 目标

本文档是从 OSpec 母版复制到项目中的采用版 AI 指南。AI 必须优先遵循项目内采用版规则，而不是回到母版仓库重新自由发挥。

## Working Order

1. 读取 `.skillrc`
2. 读取 `SKILL.index.json`
3. 读取 `docs/project/` 下的项目采用版规范
4. 读取相关 `SKILL.md`
5. 先读取当前 brief 或 dispatch packet；只打开当前阶段需要的 change artifacts、目标文件，以及索引定位出的项目或归档文档，不要默认加载全部 goal artifacts
6. 如果项目启用了 Stitch，且当前 change 激活了 `stitch_design_review`，优先检查 `artifacts/stitch/approval.json`
7. 如果要处理 Stitch / Checkpoint 的安装、provider 切换、doctor 修复、MCP、认证配置或插件启用，先读取与项目文档语言一致的仓库内本地化插件规范；只有该语言文件缺失时，才回退到其他语言版本

## 必须遵守

- 文档语言按项目 adopted protocol 执行；如果项目采用中文协议，则 `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` 和所有 goal-only artifacts 必须保持中文，包括 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/decisions/`、`artifacts/agents/review-feedback-plan.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/final-review.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json` 和 `artifacts/agents/verification-evidence.json`
- 产品界面文案、站点默认语言或 “English-first” 业务策略，不得自动推导为 change 文档应改成英文
- 若当前 change 已存在中文内容，后续更新必须延续中文，除非项目规则显式声明文档语言切换为英文
- 先按索引定位，再读目标知识文件
- 进入已有 OSpec 项目时，先运行 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`，记录 active change、queued change、queue run、cache fingerprint 和安全下一步命令；该项目入口简报不替代 active change 的 `ospec execute bootstrap`。只有需要接入 harness 启动流程时，才用 `ospec session hook [path]` 写入可选 hook artifacts，包括用于 session-start 注入的 `.ospec/hooks/using-ospec.md`、harness target 元数据、active-change bootstrap 指引，以及 decision/plugin gate 来源
- 只有需要 change 前探索记录时，才用 `ospec brainstorm [path] --topic "..."`；只有需要计划草稿时，才用 `ospec plan [path] --change changes/active/<change>`，且只有确认要更新 `implementation-plan.md` 时才传 `--apply`
- 将已激活的内建质量策略步骤（如 `tdd_cycle`、`root_cause_debug`、`verification_evidence`）视为受归档门禁约束的 `optional_steps`；收尾前必须在 `tasks.md`、`verification.md` 和对应 evidence artifacts 中覆盖
- 小功能和常规改动使用 `ospec new` / `ospec-change`，保持 1.0 快速流程：`proposal.md`、`tasks.md`、实现、`verification.md`、`review.md` 和 `state.json`
- 复杂工作使用 `ospec goal` / `ospec-goal`，才启用 `design.md`、`implementation-plan.md`、task graph、文档 review、worker/reviewer 交接和 evidence 门禁
- `ospec execute …` 控制层（bootstrap、doc-review、dispatch、launch、review、worktree、finish、collect、retry、sync）和所有 goal-only artifacts 都属于 `workflow_profile_id: goal`。对 `workflow_profile_id: change`，保持经典快速流程——不要读取或运行 execute 层或 goal artifacts；编辑 `proposal.md` 和 `tasks.md`、实现、记录 `verification.md` 和 `review.md`，再用 `ospec verify` 和 `ospec finalize` 收尾——除非用户明确要求对这个 change 做 agent/worker 执行
- AI 辅助执行 goal 时，不要求用户手写 `design.md` 或 `implementation-plan.md`；必须先基于需求、`proposal.md` 和项目上下文起草或更新它们，再推导 `artifacts/agents/task-graph.json`、编辑 `tasks.md` 或代码
- 执行经典 change 时，不要创建 goal-only 文件，除非用户明确把该工作升级为 goal
- `Announce-Before-Act`：绝不静默执行流程。宣告 OSpec skill 与阶段、命令与产物、所选 runtime adapter、worker 数量与实际机制，以及阻塞门禁和解锁条件
- `Brainstorm-First`：每个 goal 开局先做一次简短头脑风暴再锁定设计。把方向、架构、API、数据、UI、风险、范围的未决问题逐个抛给用户，而不是默默假设；需要时用 `ospec brainstorm [path] --topic "..."` 持久化探索。任一项真正开放时，优先升起持久 decision gate 让用户选择，而不是写下静默假设；仅当用户明确让 AI 自行决定或不可用时，才在 `design.md` 写入假设并标注为待确认
- 当 change 必须等待用户选择后才能继续时，用 `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:影响 --option id:label:影响 [--recommended id] [--required]` 写入持久 decision gate，向用户展示 decision report 的 `Chat Prompt` 或 `artifacts/agents/decisions/index.md`，再用 `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` 记录用户选择
- 执行 goal 时，`implementation-plan.md` 必须从 `design.md` 推导，`artifacts/agents/task-graph.json` 必须从 `implementation-plan.md` 推导，`tasks.md` 必须从 task graph 推导；若任务已存在，先更新上游文档，再回头对齐任务。执行经典 change 时，`tasks.md` 直接从 `proposal.md` 和实现范围推导
- 开始或恢复单个 active change 时，用 `ospec execute bootstrap [changes/active/<change>]` 写入带 project session brief snapshot 的 `artifacts/agents/bootstrap.json` 和 `artifacts/agents/bootstrap.md`，然后按其中的下一步安全动作继续；已有 active dispatch 时，bootstrap 会推荐对应的 `ospec execute launch ... --task ...` 命令
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` 写入 `artifacts/agents/handoff.json` 和 `artifacts/agents/handoff.md`；它只记录 project session brief snapshot、目标工具映射和安全规则，不会启动 worker 或编辑源码
- 推导或派发实现任务前，用 `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` 生成文档 reviewer 交接包。specialist 模式按独立 `runtimeAdapter` 执行，立即 claim 真实 executor id，等待 Markdown 和结构化 findings 后 complete；design review 验证通过后才能派发 implementation plan review
- 需要查看 ready、blocked、running、completed 和下一批安全任务时，用 `ospec execute status [changes/active/<change>]` 或 `ospec execute next [changes/active/<change>]` 查看 controller 视图
- 需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<change>]` 写入 `artifacts/agents/workflow-route.json` 和 `artifacts/agents/workflow-route.md`；该命令只记录 workflow routing artifacts，不会编辑源码。
- 方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门；required pending decision 会出现在 bootstrap/status/finish 中，也会汇总到 `artifacts/agents/decisions/index.md`，并阻止 dispatch，直到被选择或跳过
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 记录 git 工作区安全状态；如果状态为 `needs_isolation`，先清理当前工作区或转入隔离 git worktree，再进行并行派发
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `artifacts/agents/worktree-plan.json` 和 `artifacts/agents/worktree-plan.md`；plan 模式不会运行 git。只有显式 `--create` 才运行 `git worktree add`，只有显式 `--cleanup` 才运行 `git worktree remove`；两者都会记录 `artifacts/agents/worktree-runs/`
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `artifacts/agents/finish-plan.json` 和 `artifacts/agents/finish-plan.md`；该命令只记录 readiness 和命令文本，不会 finalize、archive、push、merge 或删除 worktree。当 finish plan 状态为 ready 且没有 required pending decision 时，继续运行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只用于可选 dry-run 预览，检查通过后不要停在这里
- 准备好就自动收尾：当 `ospec verify [changes/active/<change>]` 通过、且没有 required pending decision 或 blocking 插件 gate 时，自己运行 `ospec finalize [changes/active/<change>]`——不要停在通过的 `ospec verify` 或 `ospec archive ... --check`（`--check` 只是预览），也不要等用户来要求。只有当某个 gate 确实需要人工时才暂停收尾：尚未答复的 required decision、未批准的 blocking 插件 gate（如 Stitch 或 Checkpoint）、verify 或 archive 报出的真实 blocker，或用户明确要求先预览或批准再归档
- 决策门和 brainstorm 选项属于用户：**绝不要自动选"推荐项"、也不要自己 resolve 决策门**——用能力阶梯（原生问答 UI → Plan/审批 UI → 纯聊天文字）把每个门呈现给用户，等用户真正回答；required 门在用户回答前会阻塞实现与派发，`recommended` 只是给用户看的提示
- 你产出的每个 change 文档和 brainstorm 都要用项目的文档语言（`.skillrc` 的 `documentLanguage` / 托管 `for-ai/` 指引）书写；同一个 change 内不要中英文混用
- 需要 task 级持久交接时，用 `ospec execute dispatch` 生成并行安全的 worker 任务包批次，用 `ospec execute complete` 记录 worker 结果；每个 dispatch packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior；required pending user decision 会阻止 dispatch；当结果是 `NEEDS_CONTEXT` 或 `BLOCKED` 时，`complete` 会写入 `artifacts/agents/blockers/`；用 `--task` 指定单个任务，用 `--limit` 限制派发批次大小；每个 worker 返回 `DONE` 或 `DONE_WITH_CONCERNS` 后，用 `ospec execute review [changes/active/<change>] --task <task-id>` 做一次合并 review（一次同时审 spec 符合性与代码质量），依赖任务会等这一次合并 review 通过后才可派发；所有单任务 review 通过且 task graph 完成后，再用不带 `--task` 的 `ospec execute review` 生成一个合并的最终整体 code review 交接包；最终 review 决策不是 `PENDING` 后，用 `ospec execute feedback` 写入 `artifacts/agents/review-feedback-plan.md`；人工改过执行或 review artifacts 后，用 `ospec execute sync` 重建 `worker-status.md`
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` 写入启动计划；`runtimeAdapter` 按已验证 Orca ownership、当前 harness-native capability、可用 target CLI、串行 generic current controller 排序。Orca 进程名本身不能证明 ownership
- 多 worker 执行服从 `runtimeAdapter.selected`：只在所选 adapter 支持并行时启动安全 batch；普通任务可退回串行 current controller，独立 review 必须使用独立 adapter
- goal 集成循环使用 controller 模式时，不要停在初始化或让用户手工运行 Loop 命令。运行 `ospec loop run [change] --once --json`，通过每个 action 的 `runtimeAdapter.selected` 执行，持久化 heartbeat/result evidence，再无需用户提示地继续 tick；每个 worker 只读取引用的 packet
- `IDE-CONTROLLER-AUTO-DISPATCH`：L1 只报告；L2/L3 由 IDE 主 AI 负责 tick -> 通过每个 action 的所选 runtime adapter 执行全部 `actions[]` -> 写 heartbeat/result evidence -> 立即再 tick。`actions[]` 为空但存在 `pending` 时只观察，绝不能重派
- CLI-driven 模式下，`ospec loop watch` 是会话内执行器，会为 action 启动 fresh `claude -p` / `codex exec` 进程，并行执行 ready batch，执行后立即重新观察 evidence，只在没有 ready action 时等待；pause、`STOP`、完成、预算、无进展断路器、理解复核门或进程退出都会停止它。不支持直接 CLI target 时使用 controller 模式
- required decision 会阻断所有安全级。L1 不产生可执行 action；L3 还要求 path 和 command allowlist 都非空，并阻断越界目标文件或验证命令
- 省 token（不改变任何门禁）：`ospec execute …` 命令带 `--brief`，用 `ospec execute status --brief` 驱动每一步，并消费 loop action 引用的 packet path；不要每轮重读或内嵌完整 `task-graph.json`、`worker-status.md`、`launch-plan.md` 或全部 goal 文档——完整产物仍写盘，只在需要细节时打开
- 只有所选 adapter 或记录的 fallback order 选择显式 CLI orchestration 时，才用 `ospec execute orchestrate [changes/active/<change>] --command "..."`，并且只运行 adapter 允许的 batch
- 所选 target-CLI adapter 需要单 worker runner，或前序 adapter 在 claim ownership 前失败时，用 `--run --command`；随后用 `ospec execute collect ...` 记录结果。修复 blocked、needs-context 或 failed work 后，用 `ospec execute retry` 重新派发；已完成任务默认不得 retry，除非显式 `--force`
- 只有显式使用 `ospec execute review ... --run --command "..."` 时，OSpec 才会运行本地 reviewer 命令并写入 `artifacts/agents/review-runs/`；提供 `--decision` 时可写回单任务或最终 review decision
- 调试是 change 的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 记录根因和修复证据；该命令只记录 evidence，不会运行 shell 命令
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 记录 TDD cycle evidence；该命令只记录 evidence，不会运行 shell 命令
- 运行最新项目检查后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` 记录验证证据；该命令只记录 evidence，不会运行 shell 命令
- `ospec execute doc-review` 只记录 artifacts，不会启动 reviewer、运行 shell 命令、同步 worker status 或编辑源码；shell 只会通过显式 worktree create/cleanup、fallback `launch --run --command`、`review --run --command`、带 command template 的 fallback `orchestrate`，或已配置的 CLI-driven `ospec loop watch` 执行
- 对 goal，`artifacts/agents/task-graph.json` 中存在未解决 task 状态、无效依赖、缺失目标文件、缺失验证命令，或顶层 `status` 不是 `completed` 时，不得 archive
- 实现后每个任务必须完成该任务的一次合并 review（`artifacts/reviews/tasks/<task-id>/review.md`）；最终阶段必须完成单一的 `artifacts/reviews/final-review.md`；未解决的单任务或最终 review decision 会阻止 archive
- 实现和 review 阶段必须保持 `artifacts/agents/worker-status.md` 与 implementer、spec reviewer、quality reviewer 和 controller 状态一致
- 任一 worker 状态仍为 `PENDING`、`NEEDS_CONTEXT` 或 `BLOCKED` 时，不得声称完成；归档前 `controller_status` 必须为 `DONE`
- 先看项目采用版规范，再进入实现
- 如果 `stitch_design_review` 已激活且 `approval.json.preview_url` 为空或 `submitted_at` 为空，先执行 `ospec plugins run stitch <change-path>` 生成预览，再把预览地址发给用户验收
- 如果 `stitch_design_review` 已激活且 `approval.json.status != approved`，先停在设计审核门禁
- Stitch 页面评审必须遵守“一 route 一套 canonical layout”；不得让同一路由同时存在多个未标记用途的主 layout
- 如需补齐 `light/dark`，必须基于同一 canonical screen 做主题变体；不得重排模块、改信息架构、改 CTA 位置或生成新的不同构图
- 项目中已存在对应页面时，优先 `edit existing screen` 或 `duplicate existing canonical screen and derive a theme variant`
- 每次 Stitch 交付都必须给出 `screen mapping`，至少包含 route、canonical dark/light screen id、是否由另一主题派生、归档 screen ids
- 旧稿、探索稿、被替换 screen 必须归档或重命名，不能继续与 canonical screen 并列为主页面
- 如果缺失 canonical 说明、theme pairing、screen mapping，或仍存在未归档重复 screen，不得把该 review 视为完成
- `ospec plugins run stitch <change-path>` 默认会走已配置的 Stitch provider 适配器；只有在项目显式覆写 `.skillrc.plugins.stitch.runner` 时才走自定义 runner
- 如果项目使用自定义 runner 且配置了 `token_env`，运行前必须确认对应环境变量已设置
- runner、Gemini CLI、Codex CLI、stitch MCP 或认证状态不确定时，先执行 `ospec plugins doctor stitch <project-path>` 自检
- 若 `plugins doctor stitch` 提示所选 provider 的关键检查不是 PASS，先提示用户安装对应 CLI 并补全相应用户配置中的 stitch MCP / API token 设置
- 涉及 Stitch 安装、provider 切换、doctor 修复、MCP 或认证配置时，必须先读取与项目文档语言一致的仓库内本地化 Stitch 规范，直接采用其中的 Gemini / Codex 配置片段，不得为了让 `doctor` 通过而自行拼接 `command` / `args` / `env` 或 stdio proxy 配置
- 如果内建 `codex` provider 下只读调用正常，但 `create_project`、`generate_screen`、`edit_screens` 这类写操作卡在本地，优先检查是否真正走了 `codex exec --dangerously-bypass-approvals-and-sandbox`
- 如果项目显式覆写 `.skillrc.plugins.stitch.runner` 且仍由 Codex 负责 Stitch 写操作，自定义 runner / wrapper 也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`
- 修改代码后同步更新 `SKILL.md`
- 必要时重建 `SKILL.index.json`

## 项目采用版优先

- 命名规范：`docs/project/naming-conventions.md`
- SKILL 规范：`docs/project/skill-conventions.md`
- 工作流规范：`docs/project/workflow-conventions.md`
- 项目开发指南：`docs/project/development-guide.md`

## Stitch Canonical Project

- 如 `.skillrc.plugins.stitch.project.project_id` 已存在，必须复用该 Stitch project。
- 如该字段为空，把第一次成功的 Stitch 运行结果视为仓库 canonical project，并在后续 change 中持续复用。
- 不要为单个 change 新建新的 Stitch project，除非用户明确要求。

## Stitch Provider Baseline

- 如果仓库里存在与项目文档语言一致的本地化 Stitch 规范，优先使用文档中的原始配置片段。
- 如果仓库里没有这份规范，但需要启用内建 Stitch provider，默认基线如下。
- `gemini`：修改 `%USERPROFILE%/.gemini/settings.json`，使用 `mcpServers.stitch.httpUrl` 和 `headers.X-Goog-Api-Key`。

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

- `codex`：修改 `%USERPROFILE%/.codex/config.toml`，使用 HTTP transport、固定 Stitch MCP URL，以及 `X-Goog-Api-Key` header。
- `codex` 内建适配器默认应通过 `codex exec --dangerously-bypass-approvals-and-sandbox` 发起 Stitch 写操作；如果项目改用自定义 runner，该放行参数也必须由自定义 runner 承担。

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

## Stitch Canonical Layout

- 每个业务 route 只能有一个 canonical layout。
- `Light` 和 `Dark` 必须是一对 theme variants，而不是两个不同 layout。
- 涉及 theme variant 的 prompt 必须明确包含：
  - `Use the existing canonical screen as the base`
  - `Keep the same layout structure`
  - `Do not reorder modules`
  - `Do not create a different composition`
  - `Only transform the visual theme`

## 执行效率策略

- `.skillrc.workflow.document_review_policy` 默认 `always`；`adaptive` 只有在目标文档显式声明 `risk_level: low`（或 `none`），且没有 API、安全、迁移、数据、架构、外部集成或范围风险信号时才使用确定性 inline preflight。风险上下文缺失或无法解析时必须派独立 reviewer。
- worker/reviewer 使用逻辑 model profile；实际模型从 `.skillrc.workflow.model_profiles` 按 target 解析，未配置时明确回退 harness 默认。
- 命令执行器会收到 `OSPEC_USAGE_FILE` 并自动归集该 sidecar；`ospec execute complete ... --usage-file usage.json` 继续作为手工入口。指标必须记录来源、实际观测字段和 complete/partial/missing 覆盖率，未上报的计数不能显示成已测得的零。
- reviewer 同时写人类可读 Markdown 和相邻的 `*.findings.json`，其中包含稳定 ID、严重度、类别、问题说明、文件/行证据、需求引用和修复范围。旧 Markdown 在 repair 前会生成兼容 sidecar。
- 对每个声明的 `documentation_updates` 路径，dispatch 与 complete 记录规范化内容 hash。新流程中文件存在但没有有效内容变化时，文档门禁失败；没有历史基线的旧流程标记为无法验证。归档索引会从已完成功能直接链接本次更新的长期项目文档。
- 每次成功 finalize/archive 都会为归档的 change 或 goal 生成一份本地化的 `docs/project/changes/<归档路径>.md`，并验证两个索引都链接它。移动 active change 前，归档预检会拒绝覆盖该路径上的人工文档，并验证托管输出目录可写。这份通用 change 记录不能代替必须维护的架构、API、模块或运行文档。
- 最终 review 为 `NEEDS_CHANGES` 时，解决 required decisions 后用 `ospec execute repair` 把全部 findings 合成一个 repair task，再各运行一次 covering verification、task review 和 final re-review。
