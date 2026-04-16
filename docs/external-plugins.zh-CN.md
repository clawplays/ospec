# 外接插件

OSpec 支持通过 npm 安装外接插件。

## 用户流程

1. 用 `ospec plugins list` 查看插件
2. 用 `ospec plugins info <id>` 查看插件详情
3. 用 `ospec plugins install <id>` 全局安装插件
4. 用 `ospec plugins enable <id> <project-path>` 在项目中启用
5. 用 `ospec plugins doctor <id> <project-path>` 检查插件
6. 用 `ospec plugins run <id> <change-path>` 执行插件
7. 用 `ospec plugins update <id>` 更新单个已安装插件
8. 用 `ospec plugins update --all` 更新所有已安装插件

## 更新范围

- `ospec update [path]` 是项目范围的更新，只会更新当前项目里已启用的插件
- `ospec plugins update --all` 是机器范围的更新，会更新 OSpec 记录的所有已安装插件
- 如果某个已安装插件的包被手动删除，`ospec plugins update --all` 会先尝试恢复，再继续升级
- AI / `/ospec` 流程只有在用户明确要求更新机器上所有已安装插件时，才应执行 `ospec plugins update --all`

## 包模型

- 插件通过 npm 包发布
- 包名统一为 `@clawplays/ospec-plugin-<id>`
- 主 CLI 仍然是 `@clawplays/ospec-cli`
- 官方插件都是通过 npm 安装的包，不再内置在 CLI 包里
- 官方插件的发现默认使用 CLI 自带的 `assets/plugins/registry.json` 快照
- 如果公开 registry 快照可用，CLI 也会从 `clawplays/ospec` 提供的公开 `plugins/registry.json` 拉取最新官方插件元数据
- 新发布的官方插件在公开 registry 快照刷新后，就能被已经安装的 CLI 发现，而不必等下一次主 CLI npm 发版

## 资产模型

- `runtime`：可执行的评审或自动化逻辑
- `skill`：Codex 与 Claude 的提示词包
- `knowledge`：文档或未来可接 RAG 的知识资产
