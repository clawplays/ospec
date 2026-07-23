# 使用说明

如果你主要通过 AI 使用 OSpec，先使用简短的 `/ospec` 或 `/ospec-change` 提示词。小功能优先用 `/ospec-change`，复杂全流程工作用 `/ospec-goal`；这页里的 CLI 命令用于回退方案或显式自动化。

## 常用命令

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec change <change-name> [path]
ospec goal <goal-name> [path] [--target ...] [--execution-model controller]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec loop status [changes/active/<change>] [--brief|--json]
ospec loop run [changes/active/<change>] --once --json
ospec loop tick [changes/active/<change>] --json
ospec loop heartbeat [changes/active/<change>] --action-item <id> --executor <child-id>
ospec loop finalize [changes/active/<change>] --action-item <id> --executor <child-id> --exit-code 0 --summary "..."
ospec loop recover [changes/active/<change>] --force
ospec loop configure [changes/active/<change>] --max-parallel N --max-parallel-reason "..." --max-task-repair-rounds N --max-final-repair-rounds N --continue-while-progressing true|false
ospec loop allowlist derive [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist check [changes/active/<change>] --from-task-graph [--json]
ospec loop allowlist apply [changes/active/<change>] --from-task-graph --expected-current-hash H --expected-candidate-hash H [--expected-task-graph-hash H] [--approve-expansion]
ospec loop allowlist clear [changes/active/<change>] --confirm
ospec execute bootstrap [changes/active/<goal>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]
ospec execute preflight [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."
ospec execute review [changes/active/<change>] [--task task-id]
ospec execute feedback [changes/active/<change>] [--summary "..."]
ospec execute repair [changes/active/<change>]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:影响 --option id:label:影响 [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute require-verification [changes/active/<change>] --id <id> --kind browser|e2e|test|lint|build|manual|other --description "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --satisfies <id> --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <精确-change-名称> (--reason "..." | --reason-file <path>)
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

`loop configure --allow-path`、`--allow-command` 和 `--allow-command-policy` 用于配置可选的额外边界，会替换所选的完整白名单分组并打印差异。优先使用基于任务图的 `derive -> check -> apply` 流程；apply 使用 CAS 哈希，权限扩大必须显式传入 `--approve-expansion`。

## 当前工作流行为

- **强制归档：**仅在用户明确接受未解决风险后使用。必须同时提供 `--force-archive`、与 change 名称完全一致的 `--confirm-force-archive` 和非空原因。失败及 `NOT_VERIFIED` 证据不会被改写。保留的 Controller 指针只有在至少包含一个 item，且全部 item 都已持久化为 `completed`、`failed` 或 `expired` 时才安全；缺失状态、`issued`、`running` 或其它非终态仍会阻断。归档会明确标记为 `forced`、`incomplete` 和 `accepted-risk`。
- **Review 收敛：**规划文档统一使用确定性 inline preflight，不启动 reviewer child，也不预留 reviewer token。task/final repair 仍使用有界收敛阈值；同一 finding 只有在指纹和授权 repair scope 快照都发生有效变化时才能继续，重复、循环、只改措辞或只改代码都会停止。
- **外部验收：**`ospec execute defer-blocker` 要求已有持久 external blocker、完成的 dispatch 证据和明确用户授权。它允许依赖安全的实现继续，但 task 仍保持 blocked，final review、verify、finalize 和 archive 仍受门禁约束。
- **Repair 所有权：**prerequisite review 先于依赖它的 retry。跨任务 repair 路径必须属于已声明且完成的 owner，使用冻结 scope，并在批准失效时触发 fresh owner review。task review 会快照同一 task 的 canonical worker report；允许精确修复该 report，旧版或陈旧 evidence 必须先经过 fresh review，不能改写历史。
- **文档 closeout：**经过 review 的创建和删除都是有效状态变化。证据从首个 baseline 聚合到最终 completed dispatch，workspace 必须匹配最新 declared-owner evidence。后续权威 APPROVED review 可以绑定精确最终快照，但不能替代 meaningful-change 证据链。`ospec execute sync` 会更新多语言 worker status 和 Combined review checklist。
- **Classic Change：**`ospec change` 是首选快速流程，`ospec new` 继续作为别名。用户选择的 Change 不会自动升级为 Goal。它使用精简分阶段指导、当前 AI 的一次轻量 review、实用文档规则、自动派生 closeout、一次 finalize 索引重建和串行 queue。其它门禁全部通过时，`APPROVED` 和 `APPROVED_WITH_CONCERNS` 可以自动归档。
- **Controller 与并发：**单次 native wait 必须在 60 秒内返回，但存活 child 会在持续续 heartbeat 时运行到绝对期限。未知 native capacity 的 implementation 默认并发是 3，不是 2；更大的 session-bound 正整数 capacity 可在依赖、文件冲突、共享资源、token 和 `maxParallel` 都允许时支持 5-10 等配置。新的串行 task 必须填写 `serial_reason`，超过六个 target 的 task 必须拆分或声明 `scope_reason`。

## 插件快速开始

推荐提示词：

```text
/ospec 帮我在当前项目打开 Stitch 插件。
/ospec 帮我在当前项目打开 Checkpoint 插件。
```

AI / `/ospec`：

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

推荐提示词：

```text
/ospec 初始化这个项目。
/ospec-change 为这个需求创建并推进一个 change。
/ospec-goal 为这个需求创建并推进一个完整 goal。
/ospec 归档这个已验收通过的 change。
```

新目录建议这样开始：

```bash
ospec init [path]
ospec change <change-name> [path]
# 全流程工作使用：
ospec goal <goal-name> [path] [--target ...] [--execution-model controller]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

以上 `ospec execute` task-graph/controller 命令除 `ospec execute decision` 外都只用于 Goal；`decision` 由 Change 与 Goal 共用来记录持久用户选择。经典 Change 直接使用 `ospec progress`、当前 AI 实现、顶层 `ospec verify`、轻量 `review.md` 和 `ospec finalize`，不得生成 Goal bootstrap、task graph、worker dispatch 或 Loop artifacts。

## Change 与 Goal 文档

`ospec change <change-name> [path]` 创建经典快速流程文件：`proposal.md`、`tasks.md`、`state.json`、`verification.md` 和 `review.md`；`ospec new` 仍是兼容别名。`ospec goal <goal-name> [path]` 才创建全流程的 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/reviews/final-review.md` 和 `artifacts/agents/worker-status.md`。

goal 以**会话内 task graph 循环**运行，并统一使用一条快速质量流程。IDE-native 执行必须显式报告真实 harness。依次运行 design/plan 确定性预检、派生 task graph，再在 workspace 和 worker 派发前完成一次独立 combined planning review；最多允许一次整体规划修复和一次差量复审；未改动规划内容的执行器失败会重新武装修复额度，修复后 findings 全部不高于 medium 时确定性通过为 `APPROVED_WITH_CONCERNS`。controller 使用 `ospec loop run --once --compact-json` 获取精简 action，逐个记录 heartbeat 和 result。可选白名单可增加精确 path/command 边界。详见 [loop-engineering.md](loop-engineering.md)。

- 每个 goal 都遵守三条体验契约：`Announce-Before-Act`（AI 宣告当前 skill 与阶段、每条 `ospec execute …` 命令及产物、每次子 agent 派发）、`Brainstorm-First`（锁定设计前，把方向、架构、API、数据、UI、风险、范围等未决问题逐个用原生提问 UI——Claude Code 用 AskUserQuestion——询问）、`Zero-Setup`（每一条 `ospec` 命令都由 AI 自己执行，你只需起一个 goal 并描述需求）。
- workflow flags 可以激活内建 agent 质量策略步骤：`tdd_cycle`、`root_cause_debug` 和 `verification_evidence`。被激活的步骤会写入 change frontmatter 的 `optional_steps`，并且必须在 `tasks.md`、`verification.md` 和归档就绪检查中被覆盖。
- 用 `proposal.md` 记录为什么要做、范围和验收标准。
- 进入已有 OSpec 项目时，用 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`，记录 active work、`change` 或 `goal` profile、队列、cache fingerprint 和按 profile 生成的下一步命令。Change 直接从五个经典文件继续，只有 Goal 才运行 `ospec execute bootstrap`。
- 用 `ospec session hook [path]` 写入 `.ospec/hooks/session-start.json`、`.ospec/hooks/session-start.md`、`.ospec/hooks/using-ospec.json` 和 `.ospec/hooks/using-ospec.md`，供不同 harness 按需接入 session-start。这些 artifacts 会告诉 Codex、Claude、Gemini、OpenCode、Cursor、Copilot 和 generic harness：刷新 session brief、按 profile 选择命令、只为 active Goal 运行 bootstrap，并读取 decision/plugin gate 来源。这个 hook 不启动 worker、不运行测试、不检查 git、不归档、不编辑源码。加上 `--target claude --apply` 还会在 `.ospec/hooks/claude/` 写入 Claude Code hook bundle 并幂等合并进 `.claude/settings.json`；这些 hook 在工具层宣告每次子 agent 派发和每条 `ospec` 命令，存在未决 required 决策时硬阻断子 agent 派发，并每轮重申 `Announce-Before-Act` / `Brainstorm-First` 契约（从下一次 Claude Code 会话开始生效）。
- 只有需要在创建 change 前保留探索过程时，才用 `ospec brainstorm [path] --topic "..."` 写入 `.ospec/brainstorms/`；加 `--visual` 会额外生成本地静态 HTML companion，加 `--decision-gates` 会在能解析 active change 时，把方向、范围和验证风险选择写成 durable user decision gates。这个命令不会创建 change。
- 用 `ospec plan [path] --change changes/active/<change>` 在 `.ospec/plans/<id>/plan-draft.md` 生成计划草稿；只有确认要覆盖该 change 的 `implementation-plan.md` 时才加 `--apply`。
- 在 `ospec-goal` 中，用 `design.md` 在实现前记录选定方案、关键取舍、影响边界、风险和未决问题。
- 在 `ospec-goal` 中，用 `implementation-plan.md` 把设计转成 agent 可执行步骤，明确文件、预期结果、验证命令、依赖和冲突。
- 在 `ospec-goal` 中，用 `artifacts/agents/task-graph.json` 保存机器可读执行图：task ID、依赖、并行安全性、冲突、目标文件、验证命令、预期结果、worker 角色和 task 状态。
- 把每个 loop action 引用的 dispatch、review 或 verification packet path 当作权威上下文，不要把整个 goal 内嵌到每个 worker。持久化 task 状态与 review/verification evidence 会驱动 fresh retry、合并的最终 review repair 和下一次 tick。连续模式下，停滞的 finding 集合会获得一次持久化根因策略升级，之后才停止重复工作。
- 使用显式队列 runner 时，可用 `ospec run status [path]` 同时查看当前 queue run 和 active change task graph 快照，包括已完成、运行中、可分派、阻塞、无效任务数量和下一步动作。
- `ospec run start`、`run resume`、`run step` 和 `run status` 的下一步提示会参考 active task graph；如果有可分派任务，会提示 `ospec execute dispatch ...`。runner 仍然不会自动派发 worker，也不会编辑源码。
- 开始或恢复单个 active Goal 时，用 `ospec execute bootstrap [changes/active/<goal>]` 写入带 project session brief snapshot 的 `artifacts/agents/bootstrap.json` 和 `artifacts/agents/bootstrap.md`，然后按它输出的下一步安全动作继续。已有 active dispatch 时，bootstrap 会推荐对应的 `ospec execute launch ... --task ...` 命令。
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]` 写入 `artifacts/agents/handoff.json` 和 `artifacts/agents/handoff.md`。它会记录 project session brief snapshot、目标工具映射、命令序列、安全规则和缺失上下文警告。
- 派生 task graph 前，依次运行 `ospec execute preflight [changes/active/<change>] --stage design` 和 `--stage plan`。两步都执行确定性 inline 就绪检查并记录 approval evidence，不启动 reviewer child；两步通过后再派生或刷新 graph，并由 Loop 发出一次合并规划复审。
- 用 `ospec execute status [changes/active/<goal>]` 或 `ospec execute next [changes/active/<goal>]` 查看 Goal 控制器状态和下一批安全可分派任务。需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<goal>]` 写入 `artifacts/agents/workflow-route.json` 和 `workflow-route.md`。
- 当方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门。required pending decision 会出现在 `bootstrap`、`status` 和 `finish` 中，并阻止 worker dispatch，直到用 `--select <option-id> --answered-by user` 记录选择，或用相同来源标记明确 `--skip`。
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 写入 `artifacts/agents/workspace-status.json` 和 `artifacts/agents/workspace-status.md`；如果状态是 `needs_isolation`，先清理当前工作区或转到隔离 git worktree，再做并行派发。
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `artifacts/agents/worktree-plan.json` 和 `artifacts/agents/worktree-plan.md`。plan 模式只记录推荐 branch、path、base ref、生命周期步骤、cleanup 指南、branch retention 指南和命令文本，不会运行 git。
- 只有明确希望 OSpec 执行 `git worktree add` 时，才用 `ospec execute worktree [changes/active/<change>] --create ...`；结果会写入 `artifacts/agents/worktree-runs/`。
- 只有明确希望 OSpec 执行 `git worktree remove` 时，才用 `ospec execute worktree [changes/active/<change>] --cleanup [--path path]`；cleanup 只移除 worktree，不删除分支、不 push、不 merge、不归档、不运行测试。
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `artifacts/agents/finish-plan.json` 和 `artifacts/agents/finish-plan.md`。它会检查 task graph、review、verification evidence、worker status 和 git 清洁度，只记录建议命令，以及 PR、merge、branch retention、worktree cleanup 的决策提示，不会执行。当 finish plan 已 ready 且没有 required pending decision 时，继续执行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只是可选 dry-run 预览。
- 用 `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` 生成一批并行安全的 `artifacts/agents/dispatches/*` worker 任务包和 `artifacts/agents/execution-session.json`。每个 packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior，方便把复杂任务交给更强的 worker，把简单任务保持轻量，并明确不同目标工具如何读取上下文、编辑文件、运行验证和记录完成。再用 `ospec execute complete <task-id> ...` 记录 worker 结果。用 `--task` 指定单个任务，用 `--limit` 限制批次大小。required pending user decision 会阻止 dispatch。这两个命令也会同步 `artifacts/agents/worker-status.md`；当 completion 记录 `NEEDS_CONTEXT` 或 `BLOCKED` 时，OSpec 会写入 `artifacts/agents/blockers/` 升级记录，供 controller 跟进。
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot] [--dry-run]` 写入 agent 启动计划。`runtimeAdapter` 只接受当前、target 匹配的模型原生 subagent capability，并给出该模型的 native primitive。OSpec 会写入 `artifacts/agents/launch-plan.json` 和 `artifacts/agents/launch-plan.md`，要求存在 active dispatch 且 workspace 为 ready，但不会自行启动 worker 进程。
- 多 worker 执行服从 `runtimeAdapter.selected.nativeSubagent`：先生成并行安全 batch；所选 adapter 支持并行时，每个安全 packet 启动一个 worker。capability 缺失、过期或 target 不匹配时必须阻断，不得降级到 agent CLI 或当前 controller。所有 native wait 单次最多 60 秒，每个完成结果都立即持久化并重新 tick。
- `ospec execute orchestrate`、`ospec execute launch ... --run --command "..."` 和 `ospec execute review ... --run --command "..."` 已移除 agent 执行能力；它们会在启动进程或创建 run artifact 之前返回迁移错误。
- blocked、needs-context 或 failed worker run 的问题修复后，用 `ospec execute retry [changes/active/<change>] --task task-id` 写入 `artifacts/agents/retries/`，把 task 重新打开，并生成新的 dispatch packet。已完成任务不会被默认重试；确需覆盖时必须显式传 `--force`。
- 只有用户明确授权把已记录的外部验收义务延期到最终门时，才使用 `ospec execute defer-blocker <task-id> [changes/active/<change>] --reason "..."`。该命令不会把 task 标记完成，也不会补造缺失证据；它只让那些仅等待该 blocker 的任务恢复为可派发。
- controller-owned Goal 在 worker task 完成后以及 task graph 完成后，都用 `ospec loop tick [changes/active/<change>]` 派发 task/final review 并绑定真实 executor provenance；只有非 controller 流程才直接运行 `ospec execute review`。
- review artifact 有非 `PENDING` 决策后，用 `ospec execute feedback [changes/active/<change>] [--summary "..."]` 写入 `artifacts/agents/review-feedback-plan.json` 和 `artifacts/agents/review-feedback-plan.md`。它会记录是接受、修订、澄清还是解除阻塞；当反馈影响范围、方向、API、UI、风险或已接受取舍时，会创建 required user decision gate，避免盲目套用 reviewer 建议。
- 调试是变更的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 记录分阶段的 `artifacts/agents/debug-evidence.json` 和单次 debug evidence report。`CONFIRMED` 表示该阶段证据已确认，`FIXED` 表示修复已验证，`BLOCKED` 会让 verify 失败。
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 记录 `artifacts/agents/tdd-evidence.json` 和单次 TDD evidence report。red 必须先记录实现前不通过的聚焦测试；green 必须有前置 red `FAILED` 记录；refactor 必须有前置通过的 green/refactor 证据；`SKIPPED` 必须写清具体原因。
- 用 `ospec execute require-verification` 持久化用户要求的浏览器、E2E 或人工验证面；通过可重复的 `--satisfies <id>` 绑定最新通过证据，缺失或陈旧时最终验证与归档都会阻断。
- 运行最新项目检查后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` 记录 `artifacts/agents/verification-evidence.json` 和单次验证 evidence report；缺少显式退出码 0 的 PASSED 证据会被拒绝。
- 用 `ospec execute sync [changes/active/<change>]` 统一同步 worker status、bootstrap 派生的 `state.json` 和项目 session brief。
- 用 `tasks.md` 把已确认的执行计划拆成可执行任务。
- 用单一的 `artifacts/reviews/final-review.md` 一次性记录“做的是对的”（spec 符合性）和“做得足够好”（代码质量）的合并决策。
- 用 `artifacts/agents/worker-status.md` 记录 implementer、spec reviewer、quality reviewer 和 controller 状态。
- 在 AI / `/ospec-change` 流程中，AI 只保持小流程所需的 `proposal.md`、`tasks.md`、实现、`verification.md` 和 `review.md` 对齐。
- 在 AI / `/ospec-goal` 流程中，AI 会基于需求、`proposal.md` 和项目上下文起草或更新 `design.md`、`implementation-plan.md` 与 `artifacts/agents/task-graph.json`；你只需要审阅假设，或修正关键决策。
- Task graph 状态值为 `DONE`、`DONE_WITH_CONCERNS`、`IN_PROGRESS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING`；归档前顶层 `status` 必须为 `"completed"`，且所有 task 必须为 `DONE` 或 `DONE_WITH_CONCERNS`。
- Goal-only 的 `ospec execute bootstrap`、`handoff`、`preflight`、`status`、`next` 和 `route` 都不会编辑项目源码；各 artifact 命令只写其声明的状态。当前模型 controller 通过 `runtimeAdapter.selected.nativeSubagent` 启动 worker；OSpec 不执行 agent CLI。
- Worker 状态值为 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING`；完成前必须解决 worker 状态，且 `controller_status` 必须为 `DONE`。
- 对 `change` profile，`ospec verify [changes/active/<change>]` 只强制经典快速流程文件。对 `goal` profile，它还会强制 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、document review artifacts、final review artifacts、verification evidence 和 `artifacts/agents/worker-status.md`。
- 保持 `design.md` 简洁；它的作用是提高任务拆解准确性，不是替代长期项目文档。

新项目执行 `ospec init [path]` 后，默认使用 nested 布局：仓库根目录保留 `.skillrc` 与 `README.md`，其余 OSpec 托管文件写入 `.ospec/`。
普通 `init` 不会默认创建 `.ospec/knowledge/src/` 或 `.ospec/knowledge/tests/` 这类可选知识地图目录。
命令行仍然接受 `changes/active/<change>` 这类简写；在 nested 项目里，对应的实际目录是 `.ospec/changes/active/<change>`。
如果你要把旧的 classic 项目迁移到新布局，请显式运行 `ospec layout migrate --to nested`。

## Goal 从 Session Hook 到 Finish 的流程

当一个 AI harness 要围绕单个 active Goal 执行，并且需要保留用户选择和运行时证据时，推荐使用这条流程；经典 Change 不进入 controller 流程：

1. 每次项目刷新后运行 `ospec session hook [path]`，让 harness 在 session start 注入 `.ospec/hooks/using-ospec.md`。
2. 恢复 Goal 时运行 `ospec execute bootstrap [changes/active/<goal>]`，先按它给出的 next instruction 继续，不要直接派发任务。
3. 如果 bootstrap 或 status 显示 pending decision，打开 `artifacts/agents/decisions/index.md`，把对应 decision report 里的 `Chat Prompt` 展示给用户，再用 `ospec execute decision [changes/active/<change>] --id <id> --select <option-id> --answered-by user` 记录选择。
4. 先运行 `ospec execute workspace [changes/active/<change>]`，再运行 `ospec execute dispatch [changes/active/<change>]`。使用 `ospec execute launch ... --json` 读取机器可读的 native subagent contract，由当前模型 harness 派发并记录真实 child result。
5. 对启用 Checkpoint 的 change，运行 `ospec plugins doctor checkpoint [path]`，并在 closeout 前修复 `routes.yaml`、`flows.yaml`、baseline、screenshots、traces、console/network evidence、accessibility evidence 和 assertions。
6. 用 `ospec execute status`、`ospec execute next` 和 `ospec execute finish` 确认 Checkpoint evidence readiness。required decisions 未解决或 active Checkpoint evidence 未完整时，finish、verify 和 archive 都会阻塞。

## 升级已有项目

推荐提示词：

```text
/ospec 刷新或修复这个目录的项目知识层。先不要创建 change。
```

```bash
npm install -g @clawplays/ospec-cli@1.9.6
ospec update [path]
```

如果你是从当前仓库本地安装：

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` 会刷新协议文档、工具链、托管 skills、归档布局元数据，以及已启用插件的项目资产。
它也可以修复仍然保留 OSpec 痕迹、但缺少较新核心运行目录的旧项目，并规范化旧项目结构，例如把根目录里的 `build-index-auto.*` 工具迁移到 `.ospec/tools/`，并整理 `.skillrc` 里的旧版 Stitch 插件键。
如果 nested 项目里还保留着旧的 `.ospec/src/` 或 `.ospec/tests/` 知识目录，`ospec update [path]` 会把它们迁移到 `.ospec/knowledge/src/` 和 `.ospec/knowledge/tests/`。
如果某个已启用插件已经在全局安装记录中，但包被用户手动删除了，`ospec update [path]` 会先尝试自动补装，再继续同步项目资产。
如果某个已启用插件存在更新的兼容 npm 版本，`ospec update [path]` 会自动升级这个全局插件包，并输出从旧版本到新版本的升级明细。
它不会升级当前项目里未启用的全局插件。
它不会自动升级 CLI 本身。
它不会自动把 classic 布局迁移成 nested 布局。
如果你需要切换到新布局，请单独运行 `ospec layout migrate --to nested`。
它不会自动安装全新插件，也不会自动启用插件，或自动迁移 active / queued changes。

## 更新所有已安装插件

推荐提示词：

```text
/ospec 更新这台机器上所有已安装的插件。
```

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
AI / `/ospec` 只有在用户明确要求“更新所有已安装插件”时，才应该运行 `ospec plugins update --all`。
