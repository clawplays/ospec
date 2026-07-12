# OSpec 上下文效率与流程回归测试报告

- 测试日期：2026-07-11
- 优化前基线：`725df2aec28f0e9fc35c273e4a4ce0f5fb1e74b2`（`HEAD`）
- 优化后候选：同一 `HEAD` 上的当前未提交工作区
- 模型：`gpt-5.6-sol`（本机已配置默认模型）
- 推理档位：`low`
- 执行方式：独立会话、只读沙箱、固定结构化输出

## 结论

第一阶段 A/B 结果支持这次优化方向，但样本量不足以宣称所有项目都稳定节省 50%。两个场景合计：

- 输入 token 从 `161,593` 降到 `96,906`，减少 `40.03%`。
- 输入加输出 token 从 `162,985` 降到 `97,649`，减少 `40.09%`。
- 扣除缓存输入后，输入加输出 token 从 `55,977` 降到 `35,185`，减少 `37.14%`。
- 工具调用从 `15` 次降到 `4` 次，减少 `73.33%`。
- 模型阶段总耗时从 `92.19s` 降到 `60.37s`，减少 `34.52%`。
- 优化前后都在所有样本中识别出植入缺陷，质量门禁均为 `2/2`。
- 第二阶段把 dispatch 固定开销再降低 `38.90%`，没有新增模型调用或 token 消耗。
- 第三阶段把典型 review package Git 进程从 `6` 个降到 `4` 个，7 次交叉中位耗时降低 `32.66%`，同样不改变 token 消耗。

中型文档场景的输入 token 减少 `48.52%`，接近 50%；小型场景减少 `28.19%`。文档越大、任务越聚焦，按需加载带来的收益越明显。

## 测试方法

benchmark runner 位于 `scripts/benchmark-context-efficiency.js`。它执行以下步骤：

1. 从 Git `HEAD` 提取优化前的 `dist` 运行时。
2. 使用当前工作区的 `dist` 作为优化后候选。
3. 为两个版本创建内容完全相同的隔离项目和 change。
4. 分别调用真实 `TaskGraphExecutionService.dispatch()` 生成 worker packet。
5. 用相同模型、外层提示词、输出 schema 和只读权限启动独立会话。
6. 从执行器 `turn.completed.usage` 采集输入、缓存输入和输出 token。
7. 记录工具调用、耗时和结构化质量结果。

优化前 packet 要求每个 worker 读取 `proposal.md`、`design.md`、`implementation-plan.md`、`tasks.md` 和 `task-graph.json`。优化后 packet 内嵌任务上下文、全局约束和接口，只在存在明确缺口时按需打开核心文档。

两个夹具都在 `src/request-policy.js` 植入同一个缺陷：空白字符串被标准化为空字符串，而任务契约要求返回 `null`。只有准确返回要求编号、目标文件和缺陷说明才算通过质量门禁。

## Live A/B 结果

| 场景 | 版本 | 核心文档字节 | Packet 字节 | 输入 token | 缓存输入 | 输出 token | 工具调用 | 耗时 | 质量 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 小型 | 优化前 | 17,533 | 3,873 | 67,481 | 46,336 | 540 | 7 | 53.51s | 1/1 |
| 小型 | 优化后 | 17,533 | 4,389 | 48,458 | 31,232 | 387 | 2 | 29.89s | 1/1 |
| 中型 | 优化前 | 49,564 | 3,876 | 94,112 | 60,672 | 852 | 8 | 38.68s | 1/1 |
| 中型 | 优化后 | 49,564 | 4,392 | 48,448 | 31,232 | 356 | 2 | 30.47s | 1/1 |

正式四个样本合计使用 `260,634` 个输入加输出 token，其中 `169,472` 个为缓存输入。为验证本机执行器 usage 采集链路，另有一个可计量探针使用 `15,090` token；还有若干启动兼容性探针没有返回 usage，因此本次工作的实际总消耗高于 `275,724`，无法严谨给出精确总数。401 认证失败探针没有进入模型，不计 token。

## 第一阶段确定性指标

优化后的 packet 比优化前约大 `516` 字节，因为它携带了任务上下文、全局约束、接口和索引定位说明。这个增加是有意的：一次增加约 0.5 KB，换取不再默认加载 17.5 KB 至 49.6 KB 的核心文档集合。

dispatch 生成本身存在可测量的固定开销：

| 场景 | 优化前 | 优化后 | 增量 |
| --- | ---: | ---: | ---: |
| 小型 | 35.53ms | 169.88ms | +134.35ms |
| 中型 | 25.30ms | 175.64ms | +150.34ms |

新增开销主要来自 Git 基线、工作区状态归因和执行指标写入。相对于模型阶段，端到端仍明显更快；但这个固定开销应在后续版本中通过复用 Git 快照和批量指标写入继续优化。

## 第二阶段固定开销优化

第二阶段根据 benchmark 内部阶段剖析完成两项优化：

- 使用一次 `git status --porcelain=v2 --branch` 同时取得完整 HEAD SHA 和 clean/dirty 状态，替代 `rev-parse` 加 `status` 两个进程。
- dirty 判定只需要知道是否存在变更，因此使用 normal 级未跟踪扫描，并关闭重命名和 ahead/behind 计算；旧 Git 不支持 porcelain v2 时仍回退到原流程。
- 同一阶段的多个 execution metrics 先并行统计文件大小，再合并为一次 JSON 读写；多任务 dispatch、completion 和 review packet/package 都不会逐项重写 metrics 文件。

同一 runner、同一夹具的无模型复测结果：

| 场景 | 第二阶段前 | 第二阶段后 | 降低 |
| --- | ---: | ---: | ---: |
| 小型 dispatch | 190.04ms | 123.98ms | 34.76% |
| 中型 dispatch | 229.81ms | 132.56ms | 42.32% |
| 两场景合计 | 419.85ms | 256.54ms | 38.90% |
| Git 阶段合计 | 352.71ms（4 次进程） | 196.79ms（2 次进程） | 44.21% |

第二阶段没有重新运行 live 模型 A/B，因此没有新增模型 token。它只优化控制器固定开销，第一阶段的 token、工具调用和缺陷检出结果保持不变。

## 第三阶段评审快照优化

任务评审和最终评审的 review package 原来分别运行 status、baseline 校验、HEAD、log、diff stat 和完整 diff。第三阶段做了以下收敛：

- 使用一次 porcelain-v2 status 同时取得完整 HEAD 和所有工作区状态，取消单独的 `rev-parse HEAD`。
- 当 dispatch baseline 与当前 HEAD 相同时，不再运行结果必为空的 `git log baseline..HEAD`。
- baseline commit 校验、diff stat 和完整 diff 继续保留，避免为了减少调用而削弱审计证据。
- porcelain-v2 解析测试覆盖已暂存修改、重命名、未跟踪目标文件和越界文件。

默认 dry-run runner 在隔离的中型夹具上交叉执行旧、新 Git 策略各 7 次：

| 指标 | 优化前 | 优化后 | 变化 |
| --- | ---: | ---: | ---: |
| Git 进程数 | 6 | 4 | -33.33% |
| 中位耗时 | 412.84ms | 278.01ms | -32.66% |

这项优化没有改变 dispatch/review packet 内容，也没有启动模型，因此第一阶段约 `40%` 的 token 降幅保持不变，没有额外 token 收益或消耗。

## 流程回归范围

本轮实现和回归测试覆盖：

- finalize/archive 后重建项目文档索引。
- `SKILL.index.json` 包含项目文档与归档 change 定位信息。
- 损坏 frontmatter 不会让已归档功能从索引中消失。
- 单次任务评审和单次最终评审保持独立、只读和可追溯。
- review package 覆盖 commit、工作区状态、diff、未跟踪文件和越界文件。
- dispatch 在一次 Git 快照中保留完整基线 SHA 和 clean/dirty 归因，旧 Git 保持兼容回退。
- 同一执行阶段的 metrics 批量写入，且两任务 dispatch 只产生一次 metrics 文件写操作。
- review package 复用 status-v2 的 HEAD 与文件状态，并在 HEAD 未变化时跳过空 commit log，同时保留 baseline 校验、stat 和完整 diff。
- `documentation_updates` 路径必须安全、存在并属于任务目标文件。
- 旧 task graph 在未启用 `documentation_updates` 合同时保持兼容。
- session 重入保留项目索引摘要。
- blocker 明确标记需要人工判断和升级原因。
- 多语言协议、源码、`dist` 和发布包保持同步。

## 第四阶段：会话 Hook 与根 Skill 固定上下文

本阶段不调用模型，因此新增模型 token 消耗为 `0`。基准脚本从 `HEAD` 读取旧 Hook，并与当前工作区 Hook 在同一空决策 fixture 上分别模拟 10、20、40 轮会话；第 1 轮为 `SessionStart`，后续为 `UserPromptSubmit`。

静态契约大小为 `641` UTF-8 字节。当前版本只在第 1 轮注入；普通 prompt 没有 required decision 时输出为空，`PreToolUse(Task)` 的 required-decision 硬阻断保持不变。

| 会话轮数 | 旧版直接注入 | 当前直接注入 | 直接字节减少 | 旧版历史携带字节 | 当前历史携带字节 | 历史携带减少 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 6,410 | 641 | 90.00% | 35,255 | 6,410 | 81.82% |
| 20 | 12,820 | 641 | 95.00% | 134,610 | 12,820 | 90.48% |
| 40 | 25,640 | 641 | 97.50% | 525,620 | 25,640 | 95.12% |

“历史携带字节”按一段上下文从注入轮次起在后续每轮继续进入输入计算，是未考虑缓存、压缩和上下文裁剪的确定性上界，不等于供应商账单 token。按约 4 个 ASCII 字节/token 粗略换算，20 轮直接注入约从 `3,205` token 降到 `160` token；实际 token 收益必须由真实执行器 usage 再确认。

根 `SKILL.md` 从 `30,432` 字节、410 行缩减为 `8,159` 字节、96 行，字节减少 `73.19%`。根文件现在只保留初始化、change/goal 路由、决策、安全、文档与归档不变量，把命令全集和阶段细节路由到 `SKILL.index.json`、`docs/project/feature-index.md`、当前 packet、`for-ai/` 协议和 CLI help。该值是文件字节变化，不直接宣称同等 token 降幅。

复现时运行：

```bash
node scripts/benchmark-context-efficiency.js --output .local/context-efficiency-next.json
```

结果 JSON 的 `hookContextStrategy` 保存每轮注入字节、直接注入总量和历史携带总量。

## 本轮验证结果

以下检查均在写入本报告后重新执行并通过：

- `npm run build`：重建 92 个 TypeScript 映射模块，并校验 184 个文件的运行时闭包与 token parity。
- `npm run test:run`：63 个测试文件、377 个测试全部通过。
- `npm run typecheck`：通过。
- `npm run lint`：190 个文件通过，无 warning。
- `npm run format:check`：98 个文件通过。
- `npm run release:check`：发布包 dry-run 通过，共 226 个文件。
- `npm audit`：生产与开发依赖均为 0 个已知漏洞；`js-yaml` 已更新到 4.3.0，Vitest 已更新到 4.1.10。
- `node scripts/benchmark-context-efficiency.js --baseline-ref 725df2aec28f0e9fc35c273e4a4ce0f5fb1e74b2 --output ...`：小型、中型和大型场景均成功生成优化前/优化后 packet，固定 baseline、读取策略和空 live 统计判定符合预期。
- 同一基准命令的 `hookContextStrategy`：10/20/40 轮无决策会话的直接注入字节分别减少 90.00%/95.00%/97.50%，没有模型调用。
- `git diff --check`：通过。
- 禁止名称扫描：通过，源码、文档、测试和发布内容中未发现被禁止的外部项目名称。
- Unicode replacement character 扫描：通过。

## 限制与下一步

- 每个场景目前只有一组 live A/B，结果会受供应商缓存和网络波动影响。
- 报告中的首轮样本仍只有一次，因此不能计算稳定区间；runner 现在会按场景和重复轮次交叉 baseline/current 顺序，后续运行不再固定先后顺序。
- 当前基准只验证聚焦 worker 的上下文读取，没有覆盖大型跨模块实现、任务评审和最终评审的完整模型调用。
- 下一阶段应对小型、中型和大型场景至少各重复三次，同时查看中位数、范围、95% 置信区间和植入缺陷检出率。
- dispatch 和 review Git 快照已完成第二、第三阶段优化；下一性能热点是 review package 中仍然串行执行的 baseline 校验、diff stat 和完整 diff。
- 只有多轮结果仍稳定后，才适合对外表达节省区间；当前合理表述是“本次第一阶段样本减少约 28% 至 49%，合计约 40%”。

## 复现

无模型成本，只生成并比较 packet：

```bash
node scripts/benchmark-context-efficiency.js --baseline-ref 725df2aec28f0e9fc35c273e4a4ce0f5fb1e74b2 --output .local/context-efficiency.json
```

执行真实模型 A/B：

```bash
node scripts/benchmark-context-efficiency.js --baseline-ref 725df2aec28f0e9fc35c273e4a4ce0f5fb1e74b2 --live --model gpt-5.6-sol --repetitions 3 --reasoning-effort low --output .local/context-efficiency-live.json
```

`--live` 会消耗模型 token。增加 `--repetitions` 前，应先估算预算并固定模型配置。

无论是否使用 `--live`，结果 JSON 都会包含 `reviewGitStrategy`：旧、新 review Git 策略各交叉运行 7 次的进程数、原始耗时和中位数。

## 第五阶段：准确性与可复现性加固

2026-07-12 的后续实现没有重新调用真实模型，因此新增模型 token 消耗为 `0`。本阶段补齐以下准确性能力：

- runner 增加大型文档场景，并用 `--baseline-ref` 接收可复现基线；运行开始时把 ref 解析成固定 commit，后续所有 baseline 文件和 Hook 都从该 commit 读取。
- 每组重复样本输出均值、中位数、最小值、最大值、样本标准差和 95% 置信区间；只有一个样本时置信区间明确为 `null`。
- baseline/current 按 repetition 配对，分别输出 input/output token、耗时和工具调用降幅的分布及区间，并保留每个植入缺陷是否被两边同时检出的质量门禁。
- execution metrics 区分完整、部分、缺失 usage，保存来源与实际观测字段；未上报字段不再被解释成已测得的零。
- 文档更新保存 dispatch/complete 的规范化内容 hash，空格和多余空行不能冒充有效更新；功能索引直接链接本次维护的长期项目文档。
- review 同时保留 Markdown 与结构化 findings sidecar，repair 使用稳定 ID、严重度、文件/行证据和修复范围，而不只依赖 Markdown 标题猜测。
- `adaptive` 只有在目标文档显式声明低风险且四种管理语言的风险扫描均未发现信号时才内联；缺失或无法解析的风险上下文保守进入独立审查。
- 每个成功归档的普通 change 和 goal 都生成一份本地化的 `docs/project/changes/<归档路径>.md`，包含摘要、影响范围、实现文件、验证命令、长期项目文档和归档证据链接；功能索引与 AI 索引直接引用它。
- 正式归档先预检索引/文档写入，再在移动和重建后验证 `archived_changes`、`SKILL.index.json.documents`、自动 change 文档和 `feature-index.md` 四者一致。只读 index snapshot 也能从 archive 路径恢复已生成文档，避免重复误报 stale。
- `docs/project/changes/` 清理只删除带 `generated: true` 与 `generator: ospec-archive-knowledge` 标记、且对应归档已不存在的文件；人工文档不删除。
- 归档预检在移动 active change 前对 archive、change 文档和两个索引的输出目录执行真实写入探针；如果自动 change 文档路径已有人工内容，归档会停止且 active change 保持原位。索引构建器也独立拒绝覆盖该内容。
- release repository 导出清单显式包含 `scripts/benchmark-context-efficiency.js`，inventory 与真实同步测试同时防止后续 `release:sync-local` 删除 runner。
- 新增无网络的 1.5.0、1.5.1、1.6.0、1.6.1 升级矩阵；逐版本验证 nested 布局、自定义配置、禁用 hook、active goal/change、archive、两个索引、每-change 文档和连续第二次 `ospec update`。

三次 live A/B 按首轮实际消耗线性估算约需 `78 万` input+output token；五次约需 `130 万`。这是测试预算估算，不是新的实测消耗。正式对外更新节省区间前，应先取得至少三次重复结果。
