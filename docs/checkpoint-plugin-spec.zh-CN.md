# Checkpoint 插件规范文档

这份文档先讲用户怎么用 `checkpoint`，再保留后面的详细技术规范。

## 先看这个插件是干什么的

`checkpoint` 用来做运行中的页面检查、流程验证和自动化门禁。

适合的场景：

- 关键提交流程
- 验收前的页面与交互检查
- 需要自动化确认 UI、流程、接口和最终结果的 change

它的核心作用是：

- 运行自动化检查
- 生成门禁结果
- 在检查没通过前阻断 `verify / archive / finalize`

## 用户怎么打开这个插件

AI 对话方式：

```text
使用 OSpec 帮我打开 Checkpoint 插件。
```

Skill 方式：

```text
使用 $ospec 帮我打开 Checkpoint 插件。
```

命令行：

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

打开约束：

- 启用默认内建 Checkpoint / Playwright runner 时，OSpec 会自动在目标项目里安装 `playwright`、`pixelmatch`、`pngjs`
- 如果你是通过 AI 对话或 AI 聊天让助手“打开 Checkpoint 插件”，必须让它把这一步执行完成，插件才算真正打开成功
- 如果自动安装失败，`enable checkpoint` 应直接失败，不能留下“看起来已启用、但运行时依赖没装好”的半完成状态
- 关闭插件时只关闭 `.skillrc.plugins.checkpoint` 的启用状态，不自动卸载这些项目依赖

## 打开后你还需要配置什么

启用 `checkpoint` 后，最少要把下面这些内容补齐：

1. `base_url`
2. 确认自动安装的依赖已经进入目标项目
3. `routes.yaml`
4. `flows.yaml`
5. 登录态或登录脚本
6. 启动命令与就绪检查（如果项目不能直接访问）

### 1. `base_url`

`checkpoint` 第一次启用时必须带 `--base-url`。

这个地址就是自动化检查实际访问的应用地址，例如：

- `http://127.0.0.1:3000`
- `http://localhost:4173`

### 2. `routes.yaml`

你要在 `.ospec/plugins/checkpoint/routes.yaml` 里写清楚：

- 要检查哪些页面
- 每个页面用什么视口
- 对应的基线截图或设计基线
- 哪些区域需要忽略
- 页面上有哪些关键文本或 UI 要求

### 3. 自动安装的依赖

默认内建 runner 依赖以下项目侧依赖：

- `playwright`
- `pixelmatch`
- `pngjs`

这些依赖不再由 OSpec 主包随包携带，而是在你启用 Checkpoint 时自动安装到目标项目里。

这意味着：

- 主包更轻
- 只有真正启用 Checkpoint 的项目才需要承担这些依赖
- AI 聊天里说“打开 Checkpoint 插件”时，不能只写配置，必须把自动安装走完
- 关闭插件时不需要删除这些依赖；后续重新打开可直接复用

### 4. `routes.yaml`

你要在 `.ospec/plugins/checkpoint/flows.yaml` 里写清楚：

- 关键流程从哪里开始
- 中间步骤怎么走
- 需要断言哪些接口结果
- 需要断言哪些业务最终状态

### 5. `flows.yaml`

你要在 `.ospec/plugins/checkpoint/flows.yaml` 里写清楚：

- 关键流程从哪里开始
- 中间步骤怎么走
- 需要断言哪些接口结果
- 需要断言哪些业务最终状态

### 6. 登录态或登录脚本

如果流程依赖登录，你至少需要准备其中一种：

- `.ospec/plugins/checkpoint/auth/storage-state.json`
- `.ospec/plugins/checkpoint/auth/login.js` 之类的登录脚本

如果没有登录态，很多真实流程在自动化检查时跑不通。

### 7. 启动命令与就绪检查

如果你的项目不是“天然已经跑起来”的，还需要在 `.skillrc.plugins.checkpoint.runtime` 里补这些内容：

- `startup`
- `readiness`
- `shutdown`

最常见的做法是：

- 用 `docker compose up -d` 启动
- 用健康检查 URL 等待服务 ready
- 跑完后再关闭环境

## 打开后会生成什么

启用后，项目里会出现这些和 Checkpoint 相关的内容：

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/routes.yaml`
- `.ospec/plugins/checkpoint/flows.yaml`
- `.ospec/plugins/checkpoint/baselines/`
- `.ospec/plugins/checkpoint/auth/`
- `.ospec/plugins/checkpoint/cache/`

真正和某个 change 绑定的执行结果，会放在：

- `changes/active/<change>/artifacts/checkpoint/`

## 推荐使用流程

1. 初始化项目：`ospec init .`
2. 打开 Checkpoint：`ospec plugins enable checkpoint . --base-url <url>`
3. 确认目标项目已经自动安装 `playwright`、`pixelmatch`、`pngjs`
4. 配好 `routes.yaml`、`flows.yaml`、登录态和运行环境
5. 跑一次检查：`ospec plugins doctor checkpoint .`
6. 创建一个需要自动化验证的 change
7. 执行检查：`ospec plugins run checkpoint <change-path>`
8. 检查通过后，再执行 `ospec verify` 和 `ospec finalize`

## 什么时候应该用这个插件

建议在这些 change 上启用或触发 Checkpoint：

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

如果只是文案修改或纯文档变更，一般不需要 Checkpoint。

## 下面是详细技术规范

本文档用于固定 OSpec 中 `checkpoint` 插件的目标、运行契约与实施边界，避免后续在多轮讨论、分阶段实现与上下文压缩时丢失关键约束。

后续如果提到：

- `Checkpoint 插件`
- `checkpoint 规范`
- `Playwright 自动审查插件`

默认都以本文档为准，除非有新的明确变更。

## 1. 背景

`stitch` 解决的是设计产物与设计评审门禁；但真实项目在归档前还需要另一类自动化门禁：

- 页面是否和设计一致
- 页面是否存在布局、换行、遮挡、字体、颜色、对比度等 UI 问题
- 功能流程是否可跑通
- 前后端数据是否一致

这类能力不适合继续塞进 `stitch`，因为它属于运行时自动化检查，而不是设计生成或人工设计审批。

因此新增与 `stitch` 同级的插件：

- `checkpoint`

`checkpoint` 负责在 change 归档前运行自动化检查；只有激活的检查项全部通过，change 才允许归档。

## 2. 已确认决策

以下内容已经确认，后续实现默认按此执行：

1. `checkpoint` 与 `stitch` 是同级 plugin，不挂在 `stitch` 下面。
2. `checkpoint` 的默认执行器是 `Playwright`，但插件语义不与执行器名字绑定。
3. 第一次在项目中启用 `checkpoint` 时，必须提供一个 `base_url`。
4. 使用默认内建 runner 启用 `checkpoint` 时，必须自动把 `playwright`、`pixelmatch`、`pngjs` 安装到目标项目。
5. AI 聊天或 AI 对话中所谓“打开 Checkpoint 插件”，默认就包含这一步自动安装；如果安装未完成，就不算启用成功。
6. 关闭 `checkpoint` 只关闭插件，不自动卸载此前装到项目里的这些依赖。
7. 当前只支持一个 `base_url`，不做多环境切换。
8. `checkpoint` 是自动化门禁插件，不引入 `approve / reject` 人工审批命令。
9. 如果项目启用了 `stitch`，且当前 change 同时激活了 `stitch_design_review`，则 `checkpoint` 优先复用 Stitch 导出的设计基线。
10. 如果项目没有启用 `stitch`，则 `checkpoint` 以仓库内基线截图与文本要求作为设计检查基线。
11. 项目可能没有本地启动能力，因此 `checkpoint` 需要支持项目自定义启动命令；若项目可用 `docker compose`，应优先建议项目通过它启动测试环境。
12. 登录态是受支持的标准能力；默认采用 `storageState` 或项目自定义登录脚本。
13. 数据正确性检查默认由两部分组成：Playwright 的页面/接口断言，以及项目自定义的后端最终态断言命令。
14. `checkpoint` 允许按 change flags 只激活部分 capability，而不是所有变更都跑全套检查。
15. 推荐实施顺序是先落 `ui_review`，再落 `flow_check`。

## 3. 术语定义

### 3.1 Plugin

`plugin` 表示一种可扩展能力来源。

本插件名固定为：

- `checkpoint`

### 3.2 Capability

`checkpoint` 拆成两个 capability：

- `ui_review`
- `flow_check`

### 3.3 Optional Step

`checkpoint` 向 workflow 贡献两个 optional step：

- `checkpoint_ui_review`
- `checkpoint_flow_check`

### 3.4 Plugin Workspace

`plugin workspace` 表示项目级、可复用、非单次 change 独有的插件工作目录。

`checkpoint` 的项目级工作目录固定为：

```text
.ospec/plugins/checkpoint/
```

### 3.5 Gate Artifact

`gate artifact` 表示用于 `verify / archive / finalize` 门禁判定的机器可读结果。

`checkpoint` 的主门禁文件固定为：

```text
changes/active/<change>/artifacts/checkpoint/gate.json
```

## 4. 目标

这里的目标不是一次做完整测试平台，而是先跑通归档前自动化门禁：

1. 项目可以启用 `checkpoint` 插件。
2. 新 change 能按 flags 激活 `checkpoint_ui_review` 与 `checkpoint_flow_check`。
3. 插件可以启动或接入目标项目，并基于 `base_url` 执行 Playwright 流程。
4. `ui_review` 能基于 Stitch 导出或仓库基线截图进行页面检查。
5. `flow_check` 能跑关键流程、接口断言和项目自定义后端断言。
6. `verify / archive / finalize` 能基于 `gate.json` 阻断流程。
7. 当项目同时启用 `stitch` 时，`checkpoint` 可在通过后自动同步 Stitch 审批状态。

## 5. 非目标

以下内容当前不在实现范围内：

1. 多环境矩阵执行
2. 通用数据库驱动或数据库直连适配层
3. 通用录制器或全量回放平台
4. 完整视觉 AI 判分平台
5. 所有业务框架的一次性内建适配
6. 人工审批 UI 或人工批注系统

## 6. 统一目录约定

所有插件后续统一采用三层目录模型：

- 项目级配置：`.skillrc.plugins.<plugin>`
- 项目级工作目录：`.ospec/plugins/<plugin>/`
- change 级产物目录：`changes/active/<change>/artifacts/<plugin>/`

因此 `checkpoint` 固定采用：

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/`
- `changes/active/<change>/artifacts/checkpoint/`

### 6.1 `checkpoint` 项目级工作目录

推荐结构：

```text
.ospec/plugins/checkpoint/
  routes.yaml
  flows.yaml
  baselines/
  auth/
    README.md
    login.example.js
  cache/
```

说明：

- `routes.yaml`
  - 页面检查目标、路由、视口、基线来源、忽略区域、文本要求
- `flows.yaml`
  - 流程入口、步骤、接口断言、项目自定义后端断言命令
- `baselines/`
  - 仓库内基线截图
- `auth/`
  - 登录态文件、auth 脚本模板与说明，如 `storage-state.json`、`login.example.js`
- `cache/`
  - 临时缓存、导出中间结果

### 6.2 `checkpoint` change 级产物目录

推荐结构：

```text
changes/active/<change>/artifacts/checkpoint/
  gate.json
  result.json
  summary.md
  screenshots/
  diffs/
  traces/
```

说明：

- `gate.json`
  - 归档门禁判定入口
- `result.json`
  - 原始结构化结果
- `summary.md`
  - 面向人工阅读的摘要
- `screenshots/`
  - 实际截图
- `diffs/`
  - 视觉差异图
- `traces/`
  - Playwright trace、HAR、日志等

## 7. 插件配置模型

推荐结构：

```json
{
  "plugins": {
    "checkpoint": {
      "enabled": true,
      "blocking": true,
      "runtime": {
        "base_url": "http://127.0.0.1:3000",
        "startup": {
          "command": "docker",
          "args": ["compose", "up", "-d"],
          "cwd": "${project_path}",
          "timeout_ms": 600000
        },
        "readiness": {
          "type": "url",
          "url": "http://127.0.0.1:3000/health",
          "timeout_ms": 180000
        },
        "auth": {
          "command": "node",
          "args": [".ospec/plugins/checkpoint/auth/login.js"],
          "cwd": "${project_path}",
          "timeout_ms": 300000,
          "when": "missing_storage_state"
        },
        "shutdown": {
          "command": "docker",
          "args": ["compose", "down"],
          "cwd": "${project_path}"
        },
        "storage_state": ".ospec/plugins/checkpoint/auth/storage-state.json"
      },
      "runner": {
        "mode": "command",
        "command": "node",
        "args": [
          "${ospec_package_path}/dist/adapters/playwright-checkpoint-adapter.js",
          "--change",
          "${change_path}",
          "--project",
          "${project_path}"
        ],
        "cwd": "${project_path}",
        "timeout_ms": 900000,
        "token_env": "",
        "extra_env": {}
      },
      "capabilities": {
        "ui_review": {
          "enabled": true,
          "step": "checkpoint_ui_review",
          "activate_when_flags": ["ui_change", "page_design", "landing_page"]
        },
        "flow_check": {
          "enabled": true,
          "step": "checkpoint_flow_check",
          "activate_when_flags": ["feature_flow", "api_change", "backend_change", "integration_change"]
        }
      },
      "stitch_integration": {
        "enabled": true,
        "auto_pass_stitch_review": true
      }
    }
  }
}
```

### 7.1 字段说明

- `enabled`
  - 是否启用 `checkpoint`
- `blocking`
  - 是否将 `checkpoint` 作为硬门禁
- `runtime.base_url`
  - 自动化访问的唯一基地址
- `runtime.startup`
  - 启动项目或测试环境的命令
- `runtime.readiness`
  - 启动后的可用性探测规则
- `runtime.auth`
  - 项目自定义登录脚本；通常用于在 review 前生成或刷新 `storage_state`
- `runtime.shutdown`
  - 自动化完成后的关闭命令
- `runtime.storage_state`
  - 登录态文件
- `runner`
  - 执行器入口，默认内建 Playwright adapter
- `capabilities.ui_review`
  - 页面一致性与 UI 质量检查
- `capabilities.flow_check`
  - 流程、接口与后端断言检查
- `stitch_integration.enabled`
  - 是否开启 Stitch 协作能力
- `stitch_integration.auto_pass_stitch_review`
  - 当 `checkpoint_ui_review` 通过时，是否自动同步 Stitch 审批为 `approved`

## 8. Change 激活规则

### 8.1 `checkpoint_ui_review`

当以下条件全部满足时，激活 `checkpoint_ui_review`：

1. `plugins.checkpoint.enabled = true`
2. `plugins.checkpoint.capabilities.ui_review.enabled = true`
3. 当前 change 的 flags 命中：
   - `ui_change`
   - `page_design`
   - `landing_page`

### 8.2 `checkpoint_flow_check`

当以下条件全部满足时，激活 `checkpoint_flow_check`：

1. `plugins.checkpoint.enabled = true`
2. `plugins.checkpoint.capabilities.flow_check.enabled = true`
3. 当前 change 的 flags 命中：
   - `feature_flow`
   - `api_change`
   - `backend_change`
   - `integration_change`

### 8.3 影响范围

- 默认只影响新建 change
- 已存在 active change 不自动注入
- 老 change 如需纳入插件流程，后续手动调整
- 一个 change 可以只激活其中一个 capability

## 9. 基线策略

### 9.1 优先使用 Stitch 导出

如果项目启用了 `stitch`，且当前 change 激活了 `stitch_design_review`，则 `checkpoint_ui_review` 的首选基线来源为：

- `.ospec/plugins/stitch/exports/`
- 或 `artifacts/stitch/result.json` 中声明的可比较导出路径

在这种模式下，Stitch 需要为每个 route/theme 产出可用于比对的截图或等效文件路径。

### 9.2 仓库内基线截图回退

如果项目未启用 `stitch`，或当前 change 未激活 `stitch_design_review`，则 `checkpoint_ui_review` 改用：

- `.ospec/plugins/checkpoint/baselines/` 中的仓库内基线截图
- `routes.yaml` 中的文本要求

### 9.3 文本要求

截图并不能表达所有设计意图，因此每个 route 仍可在 `routes.yaml` 中追加文本要求，例如：

- 不允许标题换行
- Hero CTA 必须在首屏
- 右侧统计卡片必须与标题顶部对齐
- 仅允许颜色 token 改变，不允许模块顺序变化

## 10. 执行生命周期

`ospec plugins run checkpoint <change-path>` 的预期流程如下：

1. 校验项目已启用 `checkpoint`
2. 校验当前 change 至少激活了一个 `checkpoint` step
3. 校验 `base_url` 已配置
4. 按需执行 `startup` 命令
5. 通过 `readiness` 探测目标环境是否可访问
6. 载入 `storage_state` 或执行项目自定义登录脚本
7. 执行 `ui_review` / `flow_check`
8. 写入 `gate.json`、`result.json`、`summary.md`
9. 按需执行 `shutdown` 命令
10. 如果配置了 Stitch 联动且满足条件，自动同步 Stitch 审批状态

### 10.1 登录态约定

如果页面 review 或 flow check 需要登录，推荐使用：

- `runtime.storage_state`
  - 指定 Playwright storage state 的输出位置
- `runtime.auth`
  - 在 review 前执行项目自定义登录脚本

推荐约定如下：

1. `runtime.auth.command` 负责执行项目内的登录脚本
2. 登录脚本读取 `OSPEC_CHECKPOINT_BASE_URL`
3. 登录脚本把 storage state 写入 `OSPEC_CHECKPOINT_STORAGE_STATE`
4. `runtime.auth.when = missing_storage_state` 时，仅在 storage state 缺失时执行
5. `runtime.auth.when = always` 时，每次 review 前都刷新登录态

可供登录脚本使用的环境变量至少应包括：

- `OSPEC_CHECKPOINT_BASE_URL`
- `OSPEC_CHECKPOINT_PROJECT_PATH`
- `OSPEC_CHECKPOINT_CHANGE_PATH`
- `OSPEC_CHECKPOINT_STORAGE_STATE`
- `OSPEC_CHECKPOINT_OSPEC_PACKAGE_PATH`

脚手架建议在：

```text
.ospec/plugins/checkpoint/auth/login.example.js
```

提供一个可复制的模板，项目自行改成真实登录逻辑。

## 11. UI Review 默认检查项

`checkpoint_ui_review` 默认应覆盖：

- 页面截图差异
- 横向滚动与异常溢出
- 元素遮挡、裁切、错位
- 文本换行、截断、超出容器
- 字体 fallback 或字体族错误
- 颜色偏差与 token 漂移
- 基本对比度问题
- 多视口检查

### 11.1 视口策略

第二阶段建议项目在 `routes.yaml` 中按 route 定义一个视口矩阵：

- `desktop`
- `tablet`
- `mobile`

未显式声明时，默认至少跑一个桌面视口；推荐对关键页面同时跑 `desktop` 与 `mobile`。

### 11.2 忽略与容差

为避免动态内容导致误报，项目可以配置：

- 忽略区域
- 忽略选择器
- 视觉 diff 阈值
- 可接受的动态时间窗口

### 11.3 声明式语义检查

第二阶段开始，`routes.yaml` 不只负责 route 与 baseline，还应允许项目声明关键 UI 约束，例如：

- `required_visible`
  - 关键标题、CTA、表单入口必须在当前视口中可见
- `selectors.no_overlap`
  - 两个关键模块不允许互相遮挡
- `typography`
  - 指定 selector 的字体族、字号、字重、单行/最大行数约束
- `colors`
  - 指定 selector 的 `color` / `background-color` / `border-color` 等颜色期望值
- `contrast`
  - 指定 selector 集合的最小对比度阈值
- `ignore_selectors`
  - 对动态轮播、广告位、时间戳等噪声区域做忽略

推荐示例：

```yaml
defaults:
  viewports:
    - desktop
    - mobile
  diff_threshold: 0.01
  wait_after_load_ms: 300
  ignore_selectors:
    - "[data-checkpoint-ignore]"
  contrast:
    - name: text-default
      selectors: ["h1", "h2", "h3", "p", "a", "button", "label"]
      min_ratio: 4.5
      max_issues: 6

routes:
  - name: home
    path: /
    baseline:
      desktop: baselines/home-desktop.png
      mobile: baselines/home-mobile.png
    required_visible:
      - h1
      - a[href]
    selectors:
      no_overlap:
        - name: hero-copy-vs-stats
          first: .hero-copy
          second: .hero-stats
    typography:
      - selector: h1
        font_family_includes: ["Inter", "system-ui"]
        font_size_min: 40
        font_weight_min: 600
        single_line: true
    colors:
      - selector: a[href]
        property: color
        equals: "#2563eb"
        tolerance: 18
    requirements:
      - Hero title must remain on one line on desktop
      - Primary CTA must stay above the fold
```

### 11.4 Issue 分类建议

第二阶段开始，`checkpoint` 产生的 issue 不应只包含一行文本，而应至少结构化出：

- `code`
- `category`
- `severity`
- `route`
- `viewport`
- `flow`
- `selector`
- `message`
- `evidence`

推荐分类：

- `layout`
  - 重叠、错位、越界、diff 导致的主要几何回归
- `visibility`
  - 元素缺失、隐藏、被遮挡
- `typography`
  - 换行、截断、字重、字号、字体族
- `design-token`
  - 颜色、对比度、视觉 token 漂移
- `responsive`
  - 仅在特定 breakpoint 出现的问题
- `flow`
  - 用户流程执行失败
- `data`
  - API / JSON / 文本断言失败
- `runtime`
  - 启动、readiness、Playwright、auth 执行失败
- `config`
  - routes / flows / baseline / storage_state 等配置缺失

## 12. Flow Check 默认检查项

`checkpoint_flow_check` 默认应覆盖：

- 流程是否可跑通
- 关键接口是否按预期返回
- 页面展示是否与接口结果一致
- 项目自定义后端断言命令是否通过

### 12.1 项目自定义后端断言

OSpec 不内建数据库直连适配层，而是要求项目在 `flows.yaml` 中定义自有断言命令，例如：

```yaml
assert_command: npm run qa:assert-order-created
```

OSpec 负责调度、记录结果、纳入门禁；命令本身由项目负责实现。

## 13. 与 Stitch 的协作约定

当项目同时启用 `stitch` 与 `checkpoint`，且当前 change 同时激活：

- `stitch_design_review`
- `checkpoint_ui_review`

则遵循以下规则：

1. `checkpoint_ui_review` 优先读取 Stitch 导出的 route/theme 基线。
2. 若 Stitch 未导出可比较截图，则 `checkpoint_ui_review` 不得宣称完成设计一致性检查。
3. 若 `checkpoint_ui_review` 通过，且 `stitch_integration.auto_pass_stitch_review = true`，则 `checkpoint` 可以自动把 `artifacts/stitch/approval.json` 同步为 `approved`。
4. 若 `checkpoint_ui_review` 失败，则 Stitch 不得被自动放行。

这意味着：

- `stitch` 负责设计产物与设计结构门禁
- `checkpoint` 负责运行时页面一致性与自动化流程门禁

两者组合通过后，change 才允许直接归档。

## 14. 门禁产物

### 14.1 `gate.json` 建议结构

```json
{
  "plugin": "checkpoint",
  "status": "passed",
  "blocking": true,
  "executed_at": "2026-03-29T08:00:00Z",
  "steps": {
    "checkpoint_ui_review": {
      "status": "passed",
      "issues": []
    },
    "checkpoint_flow_check": {
      "status": "passed",
      "issues": []
    }
  },
  "stitch_sync": {
    "attempted": true,
    "status": "approved"
  },
  "issues": []
}
```

### 14.2 `status` 取值

建议支持：

- `pending`
- `passed`
- `failed`

### 14.3 `result.json` 建议内容

至少应记录：

- 执行时间
- runner 命令、参数、cwd、timeout
- `base_url`
- 实际跑过的 route / flow
- 截图路径
- diff 路径
- trace 路径
- 接口断言结果
- 项目自定义断言结果
- Stitch 联动结果

其中 issue 建议采用类似结构：

```json
{
  "code": "element_overlap",
  "category": "layout",
  "severity": "error",
  "step": "checkpoint_ui_review",
  "route": "home",
  "viewport": "mobile",
  "selector": ".hero-copy",
  "message": "Selectors \".hero-copy\" and \".hero-stats\" overlap on home [mobile].",
  "evidence": {
    "first": ".hero-copy",
    "second": ".hero-stats",
    "overlap_area": 184
  }
}
```

### 14.4 `summary.md` 建议内容

至少应结构化总结：

- 哪些页面通过 / 失败
- 哪些流程通过 / 失败
- issue category / severity 汇总
- 主要 UI 问题
- 主要功能或数据问题
- Stitch 是否已自动同步

## 15. CLI 命令设计

### 15.1 启用与诊断

- `ospec plugins status [path]`
- `ospec plugins enable checkpoint [path] --base-url <url>`
- `ospec plugins disable checkpoint [path]`
- `ospec plugins doctor checkpoint [path]`

说明：

- `enable checkpoint` 必须要求提供 `base_url`
- `enable checkpoint` 在默认内建 runner 下必须自动安装目标项目依赖：`playwright`、`pixelmatch`、`pngjs`
- AI 聊天让助手“打开 Checkpoint 插件”时，必须执行到自动安装完成，不能只停在写配置
- `disable checkpoint` 不负责卸载项目依赖
- 若 CLI 运行在非交互环境，未提供 `--base-url` 时应直接报错

### 15.2 执行命令

- `ospec plugins run checkpoint <change-path>`

`checkpoint` 不提供：

- `approve`
- `reject`

因为它是自动化门禁，而非人工审批门禁。

## 16. Verify / Archive / Finalize 行为

### 16.1 `verify`

当任一 `checkpoint` step 被激活时，新增检查：

1. `artifacts/checkpoint/gate.json` 是否存在
2. `gate.json.status` 是否为 `passed`
3. 被激活的每个 `checkpoint` step 是否都为 `passed`
4. `summary.md` 或 `result.json` 是否包含可核验结果
5. `tasks.md` / `verification.md` 是否覆盖相应 step
6. 若启用了 Stitch 联动，且当前 change 激活了 `stitch_design_review`，则 `artifacts/stitch/approval.json` 是否已同步为 `approved`

### 16.2 `archive`

当任一 `checkpoint` step 被激活且 `blocking = true` 时：

- `gate.json.status != passed` 则阻断 archive
- 任一激活 step 未通过则阻断 archive
- 存在未解决的关键 issue 则阻断 archive
- 若要求 Stitch 联动但 Stitch 未同步通过，则阻断 archive

### 16.3 `finalize`

`finalize` 仍走：

`verify -> archive`

因此 `checkpoint` 的阻断只需接入 `verify/archive` 即可生效。

## 17. 实施顺序

### 阶段 1：Schema 与项目级工作目录

目标：

- `.skillrc.plugins.checkpoint` 可表达配置
- `.ospec/plugins/checkpoint/` 目录约定固定下来
- `plugins enable checkpoint` / `plugins doctor checkpoint` 可落地

### 阶段 2：`ui_review` 门禁

目标：

- 跑通 Playwright 页面检查
- 写入 `gate.json` / `result.json` / `summary.md`
- `verify/archive` 可据此阻断

### 阶段 3：与 Stitch 联动

目标：

- 接入 `.ospec/plugins/stitch/exports/`
- `checkpoint_ui_review` 通过后自动同步 Stitch 审批

### 阶段 4：`flow_check` 门禁

目标：

- 跑通关键流程
- 接入接口断言
- 接入项目自定义后端断言命令

## 18. 当前文档的执行意义

后续实现 `checkpoint` 时：

- 先对照本文档确认范围
- 每一阶段只做该阶段范围内的事情
- 如需偏离本文档，先明确改文档，再改代码

这样可以保证：

- `checkpoint` 不会退化成随意堆功能的“自动化大杂烩”
- 它与 `stitch` 的边界保持清楚
- 所有后续插件都能复用统一目录与门禁约定
