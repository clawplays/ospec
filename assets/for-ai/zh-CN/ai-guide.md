---
name: project-ai-guide
title: AI Guide
tags: [ai, guide, ospec]
---

# AI 开发指南

## 这是什么

从 OSpec 母版复制到项目中的采用版 AI 规则的入口指路文件。必须优先遵循 `for-ai/` 下的项目采用版规则，而不是回到母版仓库重新自由发挥；与母版存在差异时以项目内采用版为准。本文件是路由：它提到的每条规则都在你所属 profile 的协议文件里被完整陈述，而且它绝不会让你去打开你这条路径禁止打开的文档。

## 谁读哪一份

- **经典 change**（`workflow_profile_id: change`，`ospec change` / `ospec-change`）：读 `for-ai/change-protocol.md`。它就是完整流程——`proposal.md`、`tasks.md`、实现、`verification.md`、`review.md`、`state.json`——且不因复杂度、flags、文件数量、风险或批量任务而改变。不要读取或运行 `ospec execute …` 控制层。
- **Goal**（`workflow_profile_id: goal`，`ospec goal` / `ospec-goal`，以及任何 `ospec execute …` / `ospec loop …` 工作）：操作规则由 `ospec-goal` 技能承载——session brief、design 与 plan、task graph、dispatch、launch、review、evidence、收尾与归档门禁。`for-ai/execution-protocol.md` 是这些规则背后的权威细则；只有具体场景需要该细则时才打开，而不是把它当成进入该层的步骤。
- **项目规范**，按需加载而非默认整读：`for-ai/naming-conventions.md`、`for-ai/skill-conventions.md`、`for-ai/workflow-conventions.md`、`for-ai/development-guide.md`。

## 工作顺序

1. 读 `.skillrc`，了解布局、文档语言、workflow 策略和 model profiles。
2. 用 `ospec index query <关键词...>` 检索定位。绝不通读整个 `SKILL.index.json`——它会随 change 归档无限增长。
3. 读当前的 session brief、bootstrap、dispatch、review 或 repair packet，然后只打开该 packet 点名的 change artifacts、目标文件和索引文档。
4. 按当前 profile 对应的技能执行。只有具体场景需要某条规则背后的细则时，才打开上面列出的协议文件。

你产出的每个 change 文档和 brainstorm 都要用项目的文档语言（`.skillrc` 的 `documentLanguage`）书写，不得从页面文案、站点默认语言或“English-first”需求反推语言，同一个 change 内也不要混用语言。

每个 profile 都需要的两份契约——决策门禁阶梯和强制归档——已经在你这条路径本来就会读到的文件里被完整陈述，只在那里读，不要去别处找：classic change 看 `for-ai/change-protocol.md`，goal 看 `for-ai/execution-protocol.md`。强制归档始终需要用户明确接受，永远不是自动行为。
