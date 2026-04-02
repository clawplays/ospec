# Stitch 插件 Roadmap

## 目标

本文档用于记录 `stitch` 插件在当前规范文档之外的后续扩展方向，帮助后续分阶段推进，而不把所有能力一次性压进当前实现。

## 当前已完成

- 项目级插件启用/停用
- workflow 注入 `stitch_design_review`
- `verify` / `archive` 门禁
- `ospec plugins run stitch`
- `ospec plugins approve stitch` / `reject stitch`
- `ospec plugins doctor stitch`
- `approval.json` / `summary.md` / `result.json`
- AI 协议与 skill 提示联动
- 内建 `Gemini CLI + stitch MCP` 默认 runner
- 缺少 Gemini CLI / stitch MCP / auth hint 时的明确诊断提示

## 阶段 A：Gemini CLI MCP 适配器

目标：把当前已可用的内建 Gemini 适配路径继续做深，补齐更强的执行稳定性和标准化约束。

当前状态：已部分落地。

建议内容：

- 固化 `gemini-stitch-adapter` 的输入输出契约
- 进一步提升 Gemini CLI 返回结果到 OSpec 的 `preview_url / summary_markdown / metadata / artifacts` 契约稳定性
- 增加更强的执行前探针，区分“已安装”与“可真实调用”
- 当本机未安装 Gemini CLI、未配置 `stitch` MCP、缺少认证、或 Gemini 上游不可达时，给出更精确提示

需要用户配合：

- 在真实环境下验证 Gemini CLI 能成功调用 stitch MCP 并返回可审阅的 preview URL
- 如需更稳的结构化返回，提供 stitch MCP 的推荐提示词或调用约束

## 阶段 B：内建 Stitch API Adapter

目标：不再依赖外部 wrapper，直接由 OSpec 内建 Stitch API 适配层。

建议内容：

- 直接读项目或用户级 token 配置
- 直接发起 Stitch 页面生成 / 更新请求
- 轮询任务状态并生成最终 `preview_url`
- 失败时写入结构化错误到 `result.json`

需要用户配合：

- 提供稳定 API 文档
- 提供鉴权方式和限流策略
- 提供错误码/任务状态语义

## 阶段 C：更丰富的审阅产物

目标：让 `stitch_design_review` 不只是一个 URL，而是一套可审阅产物。

建议内容：

- 预览截图
- 页面版本号或 revision ID
- 本次设计摘要
- 设计 diff / 改动说明
- 人工审阅备注模板

## 阶段 D：多 Capability

目标：一个 `stitch` 插件支持多个子能力。

候选 capability：

- `page_design_review`
- `component_design_review`
- `variant_comparison`
- `landing_page_generation`

每个 capability 需要定义：

- step 名称
- 触发 flags
- 是否 blocking
- 产物结构
- AI 应插入的流程位置

## 阶段 E：多插件协同

目标：不仅支持 `stitch`，还支持更多 plugin 在 workflow 中协同存在。

建议内容：

- 多 plugin 并行启用
- plugin step 顺序控制
- 同类 blocking gate 的冲突解决
- 更通用的 `result.json / approval.json` 规范抽象

## 阶段 F：健康检查与可观测性

目标：让插件系统更容易排障和运营。

建议内容：

- 预览 URL 可达性检查
- runner 执行耗时统计
- 最近一次运行摘要
- 更强的 `doctor` 输出
- 可选 debug 日志

## 当前最推荐的下一步

如果优先考虑你当前的真实落地效率，建议顺序是：

1. 先做“Gemini CLI MCP 适配器”
2. 再补“更丰富的审阅产物”
3. 最后再考虑“内建 Stitch API Adapter”

原因：

- 你当前电脑已经安装 Gemini CLI 且配置了 stitch MCP
- 这条路径最接近你现在的真实使用方式
- 能最快把“新 change → Stitch 预览 → 用户验收 → 继续 change”跑成完整生产流程
