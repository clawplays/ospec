# 插件开发

每个官方 OSpec 插件包应包含：

- 带 `ospecPlugin` 的 `package.json`
- `en-US`、`zh-CN`、`ja-JP`、`ar` 四种语言文档
- 可选的 `skills/`
- 可选的 `knowledge/`
- 会复制到 `.ospec/plugins/<id>/` 的 `scaffold/` 资产
- 在 `ospecPlugin.hooks` 中声明的 runtime hook

## 元数据规则

- `ospecPlugin.id` 必须与 `plugins/<id>/` 目录名一致
- 包名必须是 `@clawplays/ospec-plugin-<id>`
- capability 名称是稳定 id
- step 名称是 workflow 对外的 optional step id

## Runtime 规则

- runtime hook 应输出 JSON
- OSpec 会读取 hook 输出并写入 `gate.json`、`result.json`、`summary.md`
- 阻断型插件步骤最终必须是 `passed` 或 `approved`
