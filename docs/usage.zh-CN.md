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
ospec new <change-name> [path]
ospec goal <goal-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute route [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]
ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] --run --command "..." [--timeout-ms N] # fallback only
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..." [--timeout-ms N] [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]
ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]
ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:影响 --option id:label:影响 [--recommended id] [--required|--optional]
ospec execute decision [changes/active/<change>] --id <id> --select <option-id> [--summary "..."]
ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
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
ospec new <change-name> [path]
# 全流程工作使用：
ospec goal <goal-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change 与 Goal 文档

`ospec new <change-name> [path]` 创建经典快速流程文件：`proposal.md`、`tasks.md`、`state.json`、`verification.md` 和 `review.md`。`ospec goal <goal-name> [path]` 才创建全流程的 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md` 和 `artifacts/agents/worker-status.md`。

goal 以**会话内循环**的方式运行：它一轮轮地规划、执行、验证，直到工作被测试证明完成。创建时选定安全级——`ospec goal <name> --level L1|L2|L3`（默认 L1）：**L1** 只把发现项写入 triage 收件箱、不改任何代码；**L2** 会改代码但在关键决策处暂停等你确认；**L3** 在你设定的 allowlist 内无人值守运行。用 `ospec loop run/watch/status/pause/resume/level` 驱动，用 `ospec triage list/claim/promote` 处理发现项，用 pause / `STOP` 文件 / 关闭会话来停止。`ospec change` 保持不变。详见 [loop-engineering.md](loop-engineering.md)。

- 每个 goal 都遵守三条体验契约：`Announce-Before-Act`（AI 宣告当前 skill 与阶段、每条 `ospec execute …` 命令及产物、每次子 agent 派发）、`Brainstorm-First`（锁定设计前，把方向、架构、API、数据、UI、风险、范围等未决问题逐个用原生提问 UI——Claude Code 用 AskUserQuestion——询问）、`Zero-Setup`（每一条 `ospec` 命令都由 AI 自己执行，你只需起一个 goal 并描述需求）。
- workflow flags 可以激活内建 agent 质量策略步骤：`tdd_cycle`、`root_cause_debug` 和 `verification_evidence`。被激活的步骤会写入 change frontmatter 的 `optional_steps`，并且必须在 `tasks.md`、`verification.md` 和归档就绪检查中被覆盖。
- 用 `proposal.md` 记录为什么要做、范围和验收标准。
- 进入已有 OSpec 项目时，用 `ospec session [path]` 写入 `.ospec/session-brief.json` 和 `.ospec/session-brief.md`，快速记录 active change、队列、cache fingerprint 和下一条安全命令。它只是项目入口简报，不替代 active change 的 `ospec execute bootstrap`。
- 用 `ospec session hook [path]` 写入 `.ospec/hooks/session-start.json`、`.ospec/hooks/session-start.md`、`.ospec/hooks/using-ospec.json` 和 `.ospec/hooks/using-ospec.md`，供不同 harness 按需接入 session-start。这些 artifacts 会告诉 Codex、Claude、Gemini、OpenCode、Cursor、Copilot 和 generic harness 启动时应该注入什么：刷新 session brief、在只有一个 active change 时运行 active-change bootstrap、读取 decision/plugin gate 来源，并按安全下一步命令继续。这个 hook 不启动 worker、不运行测试、不检查 git、不归档、不编辑源码。加上 `--target claude --apply` 还会在 `.ospec/hooks/claude/` 写入 Claude Code hook bundle 并幂等合并进 `.claude/settings.json`；这些 hook 在工具层宣告每次子 agent 派发和每条 `ospec` 命令，存在未决 required 决策时硬阻断子 agent 派发，并每轮重申 `Announce-Before-Act` / `Brainstorm-First` 契约（从下一次 Claude Code 会话开始生效）。
- 只有需要在创建 change 前保留探索过程时，才用 `ospec brainstorm [path] --topic "..."` 写入 `.ospec/brainstorms/`；加 `--visual` 会额外生成本地静态 HTML companion，加 `--decision-gates` 会在能解析 active change 时，把方向、范围和验证风险选择写成 durable user decision gates。这个命令不会创建 change。
- 用 `ospec plan [path] --change changes/active/<change>` 在 `.ospec/plans/<id>/plan-draft.md` 生成计划草稿；只有确认要覆盖该 change 的 `implementation-plan.md` 时才加 `--apply`。
- 在 `ospec-goal` 中，用 `design.md` 在实现前记录选定方案、关键取舍、影响边界、风险和未决问题。
- 在 `ospec-goal` 中，用 `implementation-plan.md` 把设计转成 agent 可执行步骤，明确文件、预期结果、验证命令、依赖和冲突。
- 在 `ospec-goal` 中，用 `artifacts/agents/task-graph.json` 保存机器可读执行图：task ID、依赖、并行安全性、冲突、目标文件、验证命令、预期结果、worker 角色和 task 状态。
- 使用显式队列 runner 时，可用 `ospec run status [path]` 同时查看当前 queue run 和 active change task graph 快照，包括已完成、运行中、可分派、阻塞、无效任务数量和下一步动作。
- `ospec run start`、`run resume`、`run step` 和 `run status` 的下一步提示会参考 active task graph；如果有可分派任务，会提示 `ospec execute dispatch ...`。runner 仍然不会自动派发 worker，也不会编辑源码。
- 开始或恢复单个 active change 时，用 `ospec execute bootstrap [changes/active/<change>]` 写入带 project session brief snapshot 的 `artifacts/agents/bootstrap.json` 和 `artifacts/agents/bootstrap.md`，然后按它输出的下一步安全动作继续。已有 active dispatch 时，bootstrap 会推荐对应的 `ospec execute launch ... --task ...` 命令。
- change 需要在 agent、工具、worktree、shell 或人工操作者之间交接时，用 `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` 写入 `artifacts/agents/handoff.json` 和 `artifacts/agents/handoff.md`。它会记录 project session brief snapshot、目标工具映射、命令序列、安全规则和缺失上下文警告。
- 实现派发前，可用 `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` 生成带 project session brief snapshot 的 `artifacts/agents/document-review-dispatches/*` 交接包，以及 `artifacts/reviews/design-review.md` 或 `artifacts/reviews/implementation-plan-review.md`；design review 通过后才能派发 plan review。
- 用 `ospec execute status [changes/active/<change>]` 或 `ospec execute next [changes/active/<change>]` 查看控制器状态和下一批安全可分派任务。需要把下一条 OSpec 命令持久化给人或 AI 接手时，用 `ospec execute route [changes/active/<change>]` 写入 `artifacts/agents/workflow-route.json` 和 `workflow-route.md`。
- 当方向、架构、API、UI、风险或范围需要用户明确选择时，用 `ospec execute decision [changes/active/<change>] ...` 记录决策门。required pending decision 会出现在 `bootstrap`、`status` 和 `finish` 中，并阻止 worker dispatch，直到用 `--select <option-id>` 记录选择，或明确 `--skip`。
- 派发 worker 前，用 `ospec execute workspace [changes/active/<change>]` 写入 `artifacts/agents/workspace-status.json` 和 `artifacts/agents/workspace-status.md`；如果状态是 `needs_isolation`，先清理当前工作区或转到隔离 git worktree，再做并行派发。
- 创建隔离 worktree 前，用 `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` 写入 `artifacts/agents/worktree-plan.json` 和 `artifacts/agents/worktree-plan.md`。plan 模式只记录推荐 branch、path、base ref、生命周期步骤、cleanup 指南、branch retention 指南和命令文本，不会运行 git。
- 只有明确希望 OSpec 执行 `git worktree add` 时，才用 `ospec execute worktree [changes/active/<change>] --create ...`；结果会写入 `artifacts/agents/worktree-runs/`。
- 只有明确希望 OSpec 执行 `git worktree remove` 时，才用 `ospec execute worktree [changes/active/<change>] --cleanup [--path path]`；cleanup 只移除 worktree，不删除分支、不 push、不 merge、不归档、不运行测试。
- 最终收尾前，用 `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` 写入 `artifacts/agents/finish-plan.json` 和 `artifacts/agents/finish-plan.md`。它会检查 task graph、review、verification evidence、worker status 和 git 清洁度，只记录建议命令，以及 PR、merge、branch retention、worktree cleanup 的决策提示，不会执行。当 finish plan 已 ready 且没有 required pending decision 时，继续执行 `ospec finalize [changes/active/<change>]`；`ospec archive ... --check` 只是可选 dry-run 预览。
- 用 `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` 生成一批并行安全的 `artifacts/agents/dispatches/*` worker 任务包和 `artifacts/agents/execution-session.json`。每个 packet 都包含 project session brief snapshot 和 worker profile，说明 capability tier、recommended target、target tool mapping、rationale 和 required behavior，方便把复杂任务交给更强的 worker，把简单任务保持轻量，并明确不同目标工具如何读取上下文、编辑文件、运行验证和记录完成。再用 `ospec execute complete <task-id> ...` 记录 worker 结果。用 `--task` 指定单个任务，用 `--limit` 限制批次大小。required pending user decision 会阻止 dispatch。这两个命令也会同步 `artifacts/agents/worker-status.md`；当 completion 记录 `NEEDS_CONTEXT` 或 `BLOCKED` 时，OSpec 会写入 `artifacts/agents/blockers/` 升级记录，供 controller 跟进。
- dispatch 后用 `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run]` 写入 native agent 启动计划。它会记录当前控制 AI 应该如何使用所在 harness 的原生 agent 机制：Codex/GPT 用 `spawn_agent` / `wait_agent` / `close_agent`，Claude Code 用 Task，Gemini 用 `@generalist`，OpenCode 用 `@mention`，Cursor 用 Agent/task chat，Copilot 用 CLI/coding-agent task。OSpec 会写入 `artifacts/agents/launch-plan.json` 和 `artifacts/agents/launch-plan.md`，要求存在一个 active dispatch 且 workspace 状态为 ready，但不会自己启动 worker 或运行 shell 命令。
- 默认多 worker 执行路径是当前 harness 的原生 subagent：先用 `ospec execute dispatch` 生成并行安全 batch，查看 `launch-plan.md`，再由当前 AI 会话为每个安全 packet 启动一个原生 worker agent。每个结果都用 `ospec execute complete` 记录。
- 只有当前 AI harness 不支持原生 subagent 时，才把 `ospec execute orchestrate [changes/active/<change>] --command "..."` 当作最后 CLI fallback。fallback 模式下，OSpec 会读取或创建当前并行安全 dispatch batch，为每个 packet 渲染 harness 命令模板并发执行，写入 `artifacts/agents/orchestration-runs/`，然后把 worker run collect 回 task graph。
- 只有原生 subagent 不可用或被明确绕过时，才用 `ospec execute launch ... --run --command "..."` 作为单 worker CLI fallback。OSpec 会把 stdout/stderr、退出码、timeout 和 run 记录写入 `artifacts/agents/worker-runs/`；随后用 `ospec execute collect ...` 把这次 run 收集为 task 完成状态。
- blocked、needs-context 或 failed worker run 的问题修复后，用 `ospec execute retry [changes/active/<change>] --task task-id` 写入 `artifacts/agents/retries/`，把 task 重新打开，并生成新的 dispatch packet。已完成任务不会被默认重试；确需覆盖时必须显式传 `--force`。
- 每个 worker task 完成后，用 `ospec execute review [changes/active/<change>] --task <task-id> --stage spec`，再用 `--stage quality` 做单任务 review。单任务 review 决策写入 `artifacts/reviews/tasks/<task-id>/`，依赖任务会等这两个 review 通过后才可派发。
- task graph 完成后，用不带 `--task` 的 `ospec execute review [changes/active/<change>] [--stage spec|quality]` 生成最终 whole-change `artifacts/agents/review-dispatches/*` reviewer 交接包。不传 `--stage` 时，OSpec 会先派发最终 spec review，等 spec 通过后再派发最终 quality review。
- 只有你明确传入 `ospec execute review ... --run --command "..."` 时，OSpec 才会运行本地 reviewer 命令，并把 run 记录写入 `artifacts/agents/review-runs/`；如果同时提供 `--decision`，OSpec 会把决策写回对应单任务或最终 review artifact。`--timeout-ms` 可限制 reviewer 命令最长运行时间。
- review artifact 有非 `PENDING` 决策后，用 `ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]` 写入 `artifacts/agents/review-feedback-plan.json` 和 `artifacts/agents/review-feedback-plan.md`。它会记录是接受、修订、澄清还是解除阻塞；当反馈影响范围、方向、API、UI、风险或已接受取舍时，会创建 required user decision gate，避免盲目套用 reviewer 建议。
- 调试是变更的一部分时，用 `ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` 记录分阶段的 `artifacts/agents/debug-evidence.json` 和单次 debug evidence report。`CONFIRMED` 表示该阶段证据已确认，`FIXED` 表示修复已验证，`BLOCKED` 会让 verify 失败。
- 运行聚焦测试后，用 `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` 记录 `artifacts/agents/tdd-evidence.json` 和单次 TDD evidence report。red 必须先记录实现前不通过的聚焦测试；green 必须有前置 red `FAILED` 记录；refactor 必须有前置通过的 green/refactor 证据；`SKIPPED` 必须写清具体原因。
- 运行最新项目检查后，用 `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` 记录 `artifacts/agents/verification-evidence.json` 和单次验证 evidence report。
- 用 `ospec execute sync [changes/active/<change>]` 在人工编辑 task graph、execution session、review artifacts 或 verification checklist 后重建 `artifacts/agents/worker-status.md`。
- 用 `tasks.md` 把已确认的执行计划拆成可执行任务。
- 先用 `artifacts/reviews/spec-compliance.md` 确认“做的是对的”，再用 `artifacts/reviews/code-quality.md` 确认“做得足够好”。
- 用 `artifacts/agents/worker-status.md` 记录 implementer、spec reviewer、quality reviewer 和 controller 状态。
- 在 AI / `/ospec-change` 流程中，AI 只保持小流程所需的 `proposal.md`、`tasks.md`、实现、`verification.md` 和 `review.md` 对齐。
- 在 AI / `/ospec-goal` 流程中，AI 会基于需求、`proposal.md` 和项目上下文起草或更新 `design.md`、`implementation-plan.md` 与 `artifacts/agents/task-graph.json`；你只需要审阅假设，或修正关键决策。
- Task graph 状态值为 `DONE`、`DONE_WITH_CONCERNS`、`IN_PROGRESS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING`；归档前顶层 `status` 必须为 `"completed"`，且所有 task 必须为 `DONE` 或 `DONE_WITH_CONCERNS`。
- `ospec execute bootstrap`、`handoff`、`doc-review`、`status`、`next` 和 `route` 都不会编辑项目源码；其中 `bootstrap`、`handoff`、`doc-review` 与 `route` 会写自己的 artifacts。`workspace`、plan 模式的 `worktree` 与 `finish` 只检查 git/artifact 状态并写 workspace/worktree/finish artifacts；`dispatch`、`launch`、`collect`、`retry`、`complete`、`review`、`feedback`、`decision`、`debug`、`tdd`、`verify` 和 `sync` 只更新 OSpec artifacts、task graph、decisions、launch-plan、worker-runs、review-runs、retries、review-dispatch、review-feedback-plan、debug-evidence、tdd-evidence、verification-evidence 或 worker-status 状态，不会直接编辑项目源码。原生 subagent 由当前 AI harness 启动；只有显式传入 `execute worktree --create`、`execute worktree --cleanup`、fallback `execute orchestrate --command "..."`、fallback `execute launch --run --command "..."` 或 `execute review --run --command "..."` 时才会运行 shell 命令。
- Worker 状态值为 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING`；完成前必须解决 worker 状态，且 `controller_status` 必须为 `DONE`。
- 对 `change` profile，`ospec verify [changes/active/<change>]` 只强制经典快速流程文件。对 `goal` profile，它还会强制 `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、document review artifacts、final review artifacts、verification evidence 和 `artifacts/agents/worker-status.md`。
- 保持 `design.md` 简洁；它的作用是提高任务拆解准确性，不是替代长期项目文档。

新项目执行 `ospec init [path]` 后，默认使用 nested 布局：仓库根目录保留 `.skillrc` 与 `README.md`，其余 OSpec 托管文件写入 `.ospec/`。
普通 `init` 不会默认创建 `.ospec/knowledge/src/` 或 `.ospec/knowledge/tests/` 这类可选知识地图目录。
命令行仍然接受 `changes/active/<change>` 这类简写；在 nested 项目里，对应的实际目录是 `.ospec/changes/active/<change>`。
如果你要把旧的 classic 项目迁移到新布局，请显式运行 `ospec layout migrate --to nested`。

## 从 Session Hook 到 Finish 的流程

当一个 AI harness 要围绕单个 active change 执行，并且需要保留用户选择和运行时证据时，推荐使用这条流程：

1. 每次项目刷新后运行 `ospec session hook [path]`，让 harness 在 session start 注入 `.ospec/hooks/using-ospec.md`。
2. 恢复 change 时运行 `ospec execute bootstrap [changes/active/<change>]`，先按它给出的 next instruction 继续，不要直接派发任务。
3. 如果 bootstrap 或 status 显示 pending decision，打开 `artifacts/agents/decisions/index.md`，把对应 decision report 里的 `Chat Prompt` 展示给用户，再用 `ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` 记录选择。
4. 先运行 `ospec execute workspace [changes/active/<change>]`，再运行 `ospec execute dispatch [changes/active/<change>]`。适配器需要机器可读启动数据时使用 `ospec execute launch ... --json`；只有原生 agent 不可用时才用 `--run --command` 作为 CLI fallback。
5. 对启用 Checkpoint 的 change，运行 `ospec plugins doctor checkpoint [path]`，并在 closeout 前修复 `routes.yaml`、`flows.yaml`、baseline、screenshots、traces、console/network evidence、accessibility evidence 和 assertions。
6. 用 `ospec execute status`、`ospec execute next` 和 `ospec execute finish` 确认 Checkpoint evidence readiness。required decisions 未解决或 active Checkpoint evidence 未完整时，finish、verify 和 archive 都会阻塞。

## 升级已有项目

推荐提示词：

```text
/ospec 刷新或修复这个目录的项目知识层。先不要创建 change。
```

```bash
npm install -g @clawplays/ospec-cli@1.3.1
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
