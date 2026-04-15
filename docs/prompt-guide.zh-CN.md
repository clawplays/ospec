# 提示词文档

## 原则

给 OSpec 的提示词应该尽量短，只表达清楚意图，不需要把内部检查清单整段写进去。

OSpec 应该在内部自动展开检查、初始化、知识层维护和 change 流程这些规则。

## 推荐提示词

日常使用 OSpec，可以直接理解为 3 类操作：

1. 初始化项目
2. 为文档更新、需求开发或 Bug 修复创建并推进一个 change
3. 在需求验收通过后归档这个 change

### 1. 初始化项目

推荐提示词：

```text
使用 OSpec 初始化这个项目。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 初始化这个项目。
```

等价命令行：

```bash
ospec init .
ospec init . --summary "运营后台"
ospec init . --summary "运营后台" --tech-stack node,react,postgres
ospec init . --architecture "单体 Web 应用 + API + 统一鉴权" --document-language zh-CN
```

这里的含义是：

- `ospec init` 会把仓库直接带到 `change-ready`
- 如果当前是 AI 协作流程且缺少上下文，可以只追问一次项目概况或技术栈
- 如果用户不补充，也继续初始化，并生成待补充的默认文档

### 2. 创建并推进一个 Change

推荐提示词：

```text
使用 OSpec 为这个需求创建并推进一个 change。
```

Claude / Codex Skill 方式：

```text
使用 $ospec-change 为这个需求创建并推进一个 change。
```

等价命令行：

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

### 3. 验收通过后归档

推荐提示词：

```text
使用 OSpec 归档这个已验收通过的 change。
```

Claude / Codex Skill 方式：

```text
使用 $ospec 归档这个已验收通过的 change。
```

等价命令行：

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

这里的含义是：

- 先完成你项目自己的部署、测试、QA 或验收流程
- 再使用 `ospec verify` 检查当前 change 是否满足归档条件
- 最后使用 `ospec finalize` 重建索引并归档这个已验收通过的 change

## 边界说明

通常不需要在每次提示里重复这些内容：

- 初始化文件清单
- 协议壳校验步骤
- 每次都重复强调“不要默认生成 Web 模板”
- 反复强调“不要默认启动队列”

这些应该由 OSpec CLI 和已安装 skills 作为默认规则来保证。
