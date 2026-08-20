# 经典 Change 协议

用户选择 OSpec change 时使用这个精简协议（`ospec change` / `ospec-change`，`ospec new` 保留为别名）。profile 选择权属于用户：不得因为复杂度、flags、文件数量、风险或批量任务而把 change 自动升级、拒绝或替换成 Goal；只有用户明确选择 Goal 时才使用 `ospec goal` / `ospec-goal`。

`ospec execute …` 控制层和所有 goal-only artifacts 都属于 `workflow_profile_id: goal`：在 change 里既不读也不运行它们，除非用户明确升级这项工作，否则不要创建 goal-only 文件。只有共用的 `ospec execute decision` 仍可用于记录持久用户选择。

## 上下文

开始时只读 `.skillrc`、`proposal.md`、`tasks.md` 和 `state.json`；索引条目用 `ospec index query <关键词...>` 按需检索，不要通读整个 `SKILL.index.json`。进入验证时再读 `verification.md`，收口时再读 `review.md`。`state.json` 是执行状态的唯一权威来源：文档与 `state.json` 不一致时，以 `state.json` 为准去对齐，不要直接汇报文档里的值。

本文件就是完整的 classic 契约，不存在只写在别处的规则，因此无需再去查 `for-ai/execution-protocol.md`（那是 goal 控制层，本 profile 不得打开它）。若本文件缺失，用 `for-ai/ai-guide.md` 路由回当前 profile 对应的协议文件。

## 生命周期

1. 新工作使用 `ospec change <change-name> [path]`；`ospec new` 保留为兼容别名。命令会打印候选功能且**不会自动应用**——立即确认：相关的 slug 用 `--feature <slug>` 传入或写进 `proposal.md` 的 `features:`；没有合适候选就保持为空，在规划期补上。这个列表驱动整个文档义务机制，漏掉它义务会降级为可选。
2. 已有匹配的 active change 时继续它，不要重复创建。
3. 批量 change 进入 queue，在共享工作区依次执行。工作区必须串行使用：闭环（verify/finalize/archive）会阻塞在超出 proposal `affects` 与文档契约范围的未提交文件上；发现无主脏文件时先提交、暂存或隔离，并如实声明 `affects`，不得把并发会话的改动卷入归档。
4. 只维护 `proposal.md`、`tasks.md`、`state.json`、`verification.md` 和 `review.md`，其中 `tasks.md` 直接从 `proposal.md` 和实现范围推导；不要创建 Goal 的设计、计划、task graph、worker 或 review provenance artifacts。
5. 只运行与实际改动有关的项目检查，并把命令和结果记录到 `verification.md`；不得强制执行无关的 build、lint、test、TDD 或 debug 命令。所有已激活的可选步骤都必须出现在 `tasks.md` 和 `verification.md` 中，并把已通过的步骤写入 `verification.md` frontmatter 的 `passed_optional_steps` 字段——归档会校验该字段，缺少任何已激活步骤都会阻塞归档。
6. 当前 AI 完成一次轻量 review。`APPROVED` 和 `APPROVED_WITH_CONCERNS` 可以自动收口；`PENDING`、`NEEDS_CHANGES` 和 `BLOCKED` 必须停止。
7. 用 `ospec progress` 查看状态。需要显式预览时运行 `ospec verify`。实现、验证、文档策略和 review 都满足后，立即运行 `ospec finalize`；finalize 自动同步 classic state 并原子归档。

## 文档策略

把 `change_type` 设置为 `feature`、`fix`、`refactor`、`perf`、`deprecate`、`remove` 或 `docs`；旧写法 `bugfix` 与 `maintenance` 仍然接受，分别折算为 `fix` 与 `refactor`。把 `documentation_impact` 设置为 `none` 或 `required`。

- bugfix 可以用 `none`，但必须写具体 `documentation_reason`；如果改变用户行为、API 或运行契约，仍需更新文档。
- feature 或 docs change 必须使用 `required`，并在 `documentation_updates` 中列出至少一个真实项目、模块、API 或用户文档。
- 旧版遗留的 `docs/project/changes/...` 归档摘要（OSpec 已不再生成）不算 feature 文档。
- 只有模块规则、AI 指令或使用契约改变时才更新 `SKILL.md`。
- `SKILL.index.json` 在归档后自动重建，不是手工 task。

### 功能文档

活功能文档是 `docs/features/<领域>.md`，每个功能一个 `##` 节。文档由人类拥有，你在 change 内编辑；引擎从不代写正文。节标题与正文一律使用项目的 `documentLanguage` 撰写（slug 与 `code:` 路径保持英文 kebab-case 除外）；`ospec docs migrate` 阶段 2 的改写同样遵守。

功能声明写在行内：紧贴节标题下的第一个非空行，且只写在那里。文件 frontmatter 里没有 `features:` 列表——slug 与节的绑定保持就地，节被移动后依然成立，也不会出现同一事实的第二份副本。

```markdown
## Login timeout

<!-- ospec:feature login-timeout code:src/auth/,src/session/ -->

用途、行为、逻辑流程、边界与约束。

<!-- ospec:last-change 2026-08-14-fix-login-timeout -->
```

- slug 用小写 kebab-case（`^[a-z0-9]+(-[a-z0-9]+)*$`），在全项目内唯一。重复的 slug 会让 `ospec index build` 报错，并同时给出两处位置。
- `code:` 可选，列出仓库相对的路径前缀，用逗号分隔，不含空格和反斜杠。
- 没有声明的节就不是功能，这是允许的，不是错误。
- 功能节延伸到下一个同级或更高层级的标题，所以其中的 `###` 子标题属于该功能。
- `ospec:last-change` 注释由 `ospec archive` 写入并替换，每节至多一条，不要手工维护。

### 文档义务

引擎负责决定本次变更「该写到哪里」，你不需要自己去搜。规划期执行 `ospec docs obligations --apply`，每条义务都已带上解析好的 `path#section`。

义务由 `change_type` 与变更的 `features:` 列表推导。`features:` 为空时，引擎会用 proposal 的 `affects` 经 `code:` 声明回退解析（与 `docs locate --affects` 同一套匹配）；显式声明仍然优先，回退只是防漏网：

| `change_type` | 义务 |
|---|---|
| `feature` | 更新描述该功能行为与流程的节；功能全新则新建该节 |
| `fix` | 打开该节，核对文档描述的行为是否是**修复前的错误行为**；是则改为修复后的逻辑。**无对应功能文档时义务降级为可选并附建档建议** —— 琐碎修复不该被逼出文档膨胀 |
| `refactor`、`perf` | 验证型：确认该节仍然准确，并更新其 `code:` 路径 |
| `deprecate`、`remove` | 标记该节状态，并同步功能目录 |
| `docs` | 编辑本身即义务 |

验证型义务接受**零 diff + 显式确认**：重构确实没有改变任何已记录的行为时，执行 `ospec docs confirm --id <义务 id>` 记录，而不是做一次装饰性修改。该确认在其它类型的义务上一律拒绝——自证的义务等于没有验证。

`.skillrc` 中的 `docs_contract.mode` 取 `warn` 或 `strict`，本版本周期默认 `warn`：未满足的义务会在归档门提示，但不阻塞归档。两种模式对「义务是否满足」的判定完全一致，区别只在后果。可选义务在任何模式下都不阻塞。

定期执行 `ospec docs audit`：它列出那些 `code:` 路径自 `ospec:last-change` 指向的归档以来发生了变更、而文档本身未动的功能节——正是义务机制要预防的漂移。该命令只读，且从不让构建失败。

### 迁移存量项目

早于功能文档的项目在 `docs/project/changes/` 下带有按 change 生成的文档。OSpec 已不再生成它们；`ospec docs migrate` 分四个阶段替换它们。`ospec update` 只做提示——它从不迁移、从不删除。

1. **`ospec docs migrate --plan --apply`**（引擎）：盘点旧文档，按路径前缀把归档聚类为候选分组，输出 `docs-migration-plan.json` 与 `docs/features/<领域>.md` 草稿骨架。
2. **本阶段由你完成。** 引擎不代写正文。
3. **`ospec docs migrate --verify`**（引擎门禁）：只要还有缺口就拒绝放行。
4. **`ospec docs migrate --finalize --apply`**（破坏性）：先打印并记录文件清单，然后删除。

你的职责是阶段 2，逐份草稿处理：

- 先读草稿里的原始素材，再读每条背后的真实证据：用 `ospec changes show <归档名>` 看摘要、文件与验证命令，用归档里的 `proposal.md` / `verification.md` / `review.md` 看推理过程。也要读项目里已有的人写文档——如果已有好的描述，把它迁移过来，不要复制一份。
- 把每个 `##` 节改写成对该功能**当前行为**的描述：用途、行为、逻辑流程、边界与约束。这不是变更日志：没见过这些 change 的读者也必须能读懂当前行为。多个旧 change 通常会收敛成一节；只修了 BUG 的 change 通常只需修正一句话。
- 在每个标题下补 `<!-- ospec:feature <slug> code:<路径> -->` 声明，并补一行 `<!-- ospec:last-change <归档名> -->` 指向该节覆盖的最新归档。阶段 3 正是用这条注释证明旧文档已被承接。
- 删掉草稿标记：frontmatter 里的 `status: draft` 行、`<!-- ospec:migration-draft -->` 注释、以及说明块。只要还有残留，阶段 3 就会拒绝。
- 可以自由重新分组。引擎的聚类只是猜测；猜错时就改 plan 文件里的 `groups` 与 `group`，或直接在文档之间搬动节。
- 对**没有存活功能**的 change——依赖升级、回滚、一次性杂务——不要硬造一节。在 `docs-migration-plan.json` 里把该归档标为 `"historical": true`。这就是阶段 3 接受的「纯历史」显式声明，且只能由人来标。
- 拿不准时先问用户再标 historical。删掉一份内容无处安放的文档，正是这条管线要防止的唯一后果。

任何时候重跑 `--plan --apply` 都是安全的：它会保留你标的 `historical` 与重新分组，也绝不覆盖你已经改写过的草稿。

## 决策门禁

决策门禁和 brainstorm 选项属于用户。不得自行选中 `recommended` 选项，也不得自行解决门禁——`recommended` 只是展示给用户的建议，不是你可以替用户做的选择。

按能力阶梯依次呈现每个门禁：优先使用 harness 原生提问 UI（Claude Code `AskUserQuestion`、Gemini `ask_user`），没有就用它的 plan/approval UI（例如 Codex plan 模式），再没有就把决策报告的 `Chat Prompt` 以纯文本发到对话里。无论哪种方式你都必须真的向用户提问并等待真实答复，差别只在呈现形式；required 状态的待决策在所有 harness 上同样阻塞实现与收口。一次只问一个问题。

用 `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:影响 --option id:label:影响 [--recommended id] [--required]` 记录持久门禁，再用 `--select <option-id> --answered-by user` 记录用户的答复。这条共用的 decision 命令是 classic change 唯一可用的 `ospec execute …` 命令。如果运行过 `ospec brainstorm`，不要把它留成未回答的模板：用 `ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user` 记录每个答复。

只有真正的分叉才开门禁——互斥的 API 形态、竞争的 UI 方案、数据模型或存储选择、破坏性或难以回滚的操作、与用户诉求冲突的范围变化。对例行且无歧义的工作，直接采用合理默认值并把假设写进 `proposal.md`，不要开门禁。

在 Claude Code 中，托管 session hook 会在运行时重新注入该契约，并在存在 required 待决策时硬阻塞子代理派发；用 `ospec session hook --target claude --apply` 安装一次即可。该 hook 只是单一 harness 的便利手段，不是本契约的来源：以上规则在 Codex、Gemini、Grok、OpenCode、Cursor、Copilot，以及尚未安装 hook 的 Claude Code 上同样有效。

## 强制归档

强制归档是用户明确授权的例外，永远不是自动兜底手段，也不得从紧急程度、阻塞项或“赶紧收尾”的要求中推断授权。

1. 先向用户报告失败的门禁和每一项 `NOT_VERIFIED` 证据，让这份接受是知情的。
2. 只有用户明确接受这份未完成的工作后，才运行 `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <精确-change-名称> --reason "<已接受风险>"`。CLI 自己会强制校验精确名称确认和非空 reason。
3. 保留失败与 `NOT_VERIFIED` 证据。强制归档只绕过完成度门禁：失败检查和 pending 状态都被保留，归档被标记为不完整、风险自担，绝不能被描述成已完成的行为。

只有真实用户决策、验证失败、review 未解决或用户明确暂停时才停止。
