# 经典 Change 协议

用户选择 OSpec change 时使用这个精简协议。profile 选择权属于用户：不得因为复杂度、flags、文件数量或批量任务而把 change 自动升级、拒绝或替换成 Goal。

## 上下文

开始时只读 `.skillrc`、`proposal.md`、`tasks.md` 和 `state.json`；索引条目用 `ospec index query <关键词...>` 按需检索，不要通读整个 `SKILL.index.json`。进入验证时再读 `verification.md`，收口时再读 `review.md`。只有缺少本文件、启用了阻塞插件或某条规则确实有歧义时，才读取完整 `ai-guide.md` 或 `execution-protocol.md`。

## 生命周期

1. 新工作使用 `ospec change <change-name> [path]`；`ospec new` 保留为兼容别名。
2. 已有匹配的 active change 时继续它，不要重复创建。
3. 批量 change 进入 queue，在共享工作区依次执行。工作区必须串行使用：闭环（verify/finalize/archive）会阻塞在超出 proposal `affects` 与文档契约范围的未提交文件上；发现无主脏文件时先提交、暂存或隔离，并如实声明 `affects`，不得把并发会话的改动卷入归档。
4. 只维护 `proposal.md`、`tasks.md`、`state.json`、`verification.md` 和 `review.md`；不要创建 Goal 的设计、计划、task graph、worker 或 review provenance artifacts。
5. 只运行与实际改动有关的项目检查，并把命令和结果记录到 `verification.md`；不得强制执行无关的 build、lint、test、TDD 或 debug 命令。
6. 当前 AI 完成一次轻量 review。`APPROVED` 和 `APPROVED_WITH_CONCERNS` 可以自动收口；`PENDING`、`NEEDS_CHANGES` 和 `BLOCKED` 必须停止。
7. 需要显式预览时运行 `ospec verify`。实现、验证、文档策略、插件门禁和 review 都满足后，立即运行 `ospec finalize`；finalize 自动同步 classic state 并原子归档。

## 文档策略

把 `change_type` 设置为 `bugfix`、`feature`、`maintenance` 或 `docs`，把 `documentation_impact` 设置为 `none` 或 `required`。

- bugfix 可以用 `none`，但必须写具体 `documentation_reason`；如果改变用户行为、API 或运行契约，仍需更新文档。
- feature 或 docs change 必须使用 `required`，并在 `documentation_updates` 中列出至少一个真实项目、模块、API 或用户文档。
- 自动生成的 `docs/project/changes/...` 归档摘要不算 feature 文档。
- 只有模块规则、AI 指令或使用契约改变时才更新 `SKILL.md`。
- `SKILL.index.json` 在归档后自动重建，不是手工 task。

只有真实用户决策、验证失败、review 未解决、阻塞插件门禁或用户明确暂停时才停止。
