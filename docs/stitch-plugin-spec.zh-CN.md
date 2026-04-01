# Stitch 插件规范文档

这份文档先讲用户怎么用 `stitch`，再保留后面的详细技术规范。

## 先看这个插件是干什么的

`stitch` 用来做页面设计审核与预览协作。

适合的场景：

- 落地页、营销页、活动页
- UI 变化比较大的页面需求
- 需要先看设计预览，再决定是否继续推进开发的 change

它的核心作用是：

- 生成或提交页面预览
- 等待人工审核通过
- 在审核通过前阻断 `verify / archive / finalize`

## 用户怎么打开这个插件

AI 对话方式：

```text
使用 OSpec 帮我打开 Stitch 插件。
```

Skill 方式：

```text
使用 $ospec 帮我打开 Stitch 插件。
```

命令行：

```bash
ospec plugins enable stitch .
```

## 打开后你还需要配置什么

启用 `stitch` 后，通常还要完成这 3 件事：

1. 选择 provider
2. 配置 Stitch 认证
3. 跑一次 doctor，确认本机和项目都准备好了

### 1. 选择 provider

默认 provider 是 `gemini`，也可以切到 `codex`。

大多数用户不需要改 runner，只需要确认 `.skillrc.plugins.stitch.provider` 用的是哪一个即可。

### 2. 配置 Stitch 认证

如果你用 `gemini`：

- 在 `~/.gemini/settings.json` 里配置 `stitch` MCP
- 配上 `X-Goog-Api-Key`

示例：

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

如果你用 `codex`：

- 在 `~/.codex/config.toml` 里配置 `stitch` MCP
- 同样需要 `X-Goog-Api-Key`

示例：

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

### 3. 跑一次 doctor

```bash
ospec plugins doctor stitch .
```

这个命令会帮你检查：

- 插件是否已启用
- provider 是否配置好
- 本机 CLI 是否可用
- Stitch MCP 与认证是否就绪

## 打开后会生成什么

启用后，项目里会出现这些和 Stitch 相关的内容：

- `.skillrc.plugins.stitch`
- `.ospec/plugins/stitch/project.json`
- `.ospec/plugins/stitch/exports/`
- `.ospec/plugins/stitch/baselines/`
- `.ospec/plugins/stitch/cache/`

真正和某个 change 绑定的审核产物，会放在：

- `changes/active/<change>/artifacts/stitch/`

## 推荐使用流程

1. 初始化项目：`ospec init .`
2. 打开 Stitch 插件：`ospec plugins enable stitch .`
3. 配好 provider 与认证：`ospec plugins doctor stitch .`
4. 创建一个 UI 类 change
5. 运行 Stitch：`ospec plugins run stitch <change-path>`
6. 把生成的 `preview_url` 发给审核人
7. 审核通过后执行：`ospec plugins approve stitch <change-path>`
8. 再继续 `ospec verify` 和 `ospec finalize`

如果审核不通过，可以执行：

```bash
ospec plugins reject stitch <change-path>
```

## 什么时候应该用这个插件

建议在这些 change 上启用或触发 Stitch：

- `ui_change`
- `page_design`
- `landing_page`

如果一个 change 主要是后端逻辑、接口调整或数据修复，通常不需要 Stitch。

## 下面是详细技术规范

本文档用于固定 OSpec 中 `stitch` 插件的当前规范、运行契约与扩展边界，避免后续在多轮对话、上下文压缩、分阶段实现时丢失关键约束。

后续如果提到：

- `Stitch 插件`
- `stitch 规范`
- `插件化工作流`

默认都以本文档为准，除非有新的明确变更。

## 1. 背景

当前 OSpec 的 change workflow 已有：

- 基于 flag 激活的 optional steps
- `verify / archive / finalize` 门禁链路

但当前的 optional steps 更偏“流程门禁能力”，并不是完整的插件机制。

我们希望在此基础上引入一个通用的插件层，让项目可以按需开启额外能力。第一个插件是 `stitch`：

- 本地完成设计或设计草稿准备
- 走 Stitch API / Stitch 页面产出流程
- 输出 Stitch 页面给用户验收
- 验收通过后，change 才允许继续推进

该能力必须具备阻断性，不能只是文档提示。

## 2. 已确认决策

以下内容已经确认，后续实现默认按此执行：

1. 长期方案采用 `plugins` 架构，而不是把 Stitch 硬编码成单个固定 optional step。
2. workflow 内部仍然通过 optional steps 落地，plugin 负责贡献 step。
3. 必须支持项目初始化后再启用插件。
4. 中途启用插件时，默认只影响新 change；旧 change 后续手动调整。
5. Stitch 插件能力独立于仓库初始化时的默认状态存在。
6. 先写清插件规范，再按文档逐步实现，避免上下文丢失。

## 3. 术语定义

为了避免后续讨论混乱，统一使用下面几个概念：

### 3.1 Plugin

`plugin` 表示一种可扩展能力来源。

例如：

- `stitch`
- 未来可能的 `figma-review`
- 未来可能的 `security-scan`

plugin 本身不直接等于某一个 workflow step。

### 3.2 Capability

`capability` 表示某个 plugin 提供的一项子能力。

例如 `stitch` 未来可能有：

- 页面设计验收
- 落地页快速原型生成
- 页面变体对比

当前只做第一项：页面设计验收。

### 3.3 Optional Step

`optional step` 是 workflow 中的具体流程节点。

当前由 `stitch` 插件注入的第一个 step 命名为：

`stitch_design_review`

### 3.4 Approval Artifact

`approval artifact` 表示用于门禁判定的机器可读产物。

当前 Stitch 的审批产物文件为：

`changes/active/<change>/artifacts/stitch/approval.json`

## 4. 目标

这里的目标不是一次做完整插件平台，而是优先跑通一条完整闭环：

1. 项目可以启用 `stitch` 插件
2. `stitch` 可以向 workflow 贡献 step
3. 新建 change 时能够按规则激活该 step
4. `tasks.md` / `verification.md` 能体现该 step
5. `verify / archive / finalize` 可以依据审批结果阻断流程

## 5. 非目标

以下内容当前不在实现范围内：

1. 完整通用插件市场
2. 多插件复杂依赖图
3. 老 change 自动批量调整
4. Stitch 所有未来能力一次实现
5. 一开始就做完美的动态加载体系

## 6. 当前范围边界

当前，OSpec 主要负责：

- 插件启用状态
- workflow step 注入
- 模板对齐
- 审批产物门禁
- 命令与配置入口

当前，Stitch 的“真正页面生成执行器”可以分两层考虑：

### 6.1 OSpec 必须负责的部分

- 知道某个 change 是否需要 Stitch 审核
- 知道 Stitch 审核是否已通过
- 在未通过时阻断后续流程

### 6.2 可后续增强的部分

- 直接调用 Stitch API
- 自动生成预览地址
- 自动抓取页面元信息
- 自动生成截图或 HTML 导出

也就是说，当前可以先把“门禁 + 数据契约”做稳，再逐步加真实 Stitch 执行链路。

## 7. 插件配置模型

在项目 `.skillrc` 中增加 `plugins` 配置。

推荐结构：

```json
{
  "plugins": {
    "stitch": {
      "enabled": true,
      "blocking": true,
      "capabilities": {
        "page_design_review": {
          "enabled": true,
          "step": "stitch_design_review",
          "activate_when_flags": ["ui_change", "page_design", "landing_page"]
        }
      }
    }
  }
}
```

### 7.1 字段说明

- `enabled`
  - 是否启用 Stitch 插件
- `blocking`
  - 是否把 Stitch 审批作为硬门禁
- `capabilities.page_design_review.enabled`
  - 是否启用页面设计验收能力
- `step`
  - 该能力向 workflow 贡献的 optional step 名
- `activate_when_flags`
  - 哪些 proposal flags 会激活该 step

### 7.2 仓库级插件工作目录

从当前版本起，插件统一采用三层目录模型：

- 项目级配置：`.skillrc.plugins.<plugin>`
- 项目级工作目录：`.ospec/plugins/<plugin>/`
- change 级产物目录：`changes/active/<change>/artifacts/<plugin>/`

因此 `stitch` 固定采用：

- `.skillrc.plugins.stitch`
- `.ospec/plugins/stitch/`
- `changes/active/<change>/artifacts/stitch/`

推荐的仓库级工作目录结构：

```text
.ospec/plugins/stitch/
  project.json
  exports/
  baselines/
  cache/
```

说明：

- `project.json`
  - 仓库级 Stitch workspace 元数据
- `exports/`
  - 仓库可复用的 Stitch 导出物、截图与映射
- `baselines/`
  - 供其他插件复用的仓库级设计基线
- `cache/`
  - 临时缓存与中间结果

change 级产物仍只放在：

```text
changes/active/<change>/artifacts/stitch/
```

两者职责必须分开：

- `.ospec/plugins/stitch/`
  - 放仓库级、可复用、非单次 change 独有的数据
- `artifacts/stitch/`
  - 放当前 change 的审批与执行结果

## 8. Change 激活规则

默认激活 flag：

- `ui_change`
- `page_design`
- `landing_page`

### 8.1 激活条件

当以下条件全部满足时，激活 `stitch_design_review`：

1. 项目启用了 `plugins.stitch.enabled = true`
2. `plugins.stitch.capabilities.page_design_review.enabled = true`
3. 当前 change 的 `proposal.md` flags 中命中了 `activate_when_flags`

### 8.2 影响范围

- 默认只影响新建 change
- 已存在 active change 不自动注入该 step
- 老 change 如需纳入插件流程，后续手动调整

## 9. Workflow 集成方式

### 9.1 总体原则

最终 workflow 不是只看内置流程，也不是只看 plugins，而是：

`core workflow + plugin-contributed steps = effective workflow`

### 9.2 运行时合成结果

对某个 change，系统最终要能得到：

- core steps
- 内置 activated optional steps
- plugin 注入并被激活的 steps

当前只新增一类 plugin step：

- `stitch_design_review`

### 9.3 推荐插入语义

对 Stitch 页面设计验收能力，推荐流程语义如下：

- 插入位置：在 proposal/tasks 确定之后、实现完成之前
- 阻断点：未通过时，不应进入正常实现收口

在不大改状态机的前提下，先通过 `verify/archive/finalize` 阶段阻断，同时在 `tasks.md` 中明确该步骤优先完成。

后续增强阶段，再把它提升为更强的执行期阻断。

## 10. 产物设计

### 10.1 必需产物目录

```text
changes/active/<change>/artifacts/stitch/
```

### 10.2 必需审批文件

```text
changes/active/<change>/artifacts/stitch/approval.json
```

### 10.3 推荐补充说明文件

```text
changes/active/<change>/artifacts/stitch/summary.md
```

在 `page_design_review` 场景下，`summary.md` 不再只是可选备注；如果 runner 没有把完整的结构化映射写入 `result.json`，则必须在 `summary.md` 中补齐同等信息。

### 10.4 `approval.json` 建议结构

```json
{
  "plugin": "stitch",
  "capability": "page_design_review",
  "step": "stitch_design_review",
  "status": "pending",
  "blocking": true,
  "preview_url": "",
  "submitted_at": "",
  "reviewed_at": "",
  "reviewer": "",
  "notes": "",
  "review_contract": {
    "canonical_layout_rule_passed": false,
    "theme_pairing_rule_passed": false,
    "edit_derive_first_rule_passed": false,
    "screen_mapping_attached": false,
    "archive_rule_passed": false,
    "naming_convention_rule_passed": false,
    "unresolved_duplicates": []
  }
}
```

### 10.5 `status` 取值

当前先只支持三种：

- `pending`
- `approved`
- `rejected`

### 10.6 门禁规则

如果 `stitch_design_review` 被激活：

- `approval.json` 必须存在
- `status` 必须为 `approved`
- `review_contract` 中各项规则必须全部为通过状态
- `review_contract.unresolved_duplicates` 必须为空
- `result.json` 或 `summary.md` 中必须存在可核验的 `screen mapping`
- 否则不得通过归档门禁

### 10.7 页面评审硬约束

以下规则不是建议，而是 `stitch_design_review` 的硬约束。

#### Canonical Layout Rule

- 每个业务页面 / route 只能有一个 canonical layout。
- 同一路由下如存在多个 screen，必须明确区分：
  - 哪一个是 canonical
  - 哪一些是 `archive / old / exploration`
- 非 canonical screen 不得继续作为主评审对象，不得在审批结果中被写为 canonical screen。

典型 route 包括但不限于：

- `Homepage`
- `Login`
- `Verify`
- `Novel Detail`
- `Chapter Reader`

#### Theme Pairing Rule

- `Light` 与 `Dark` 必须是同一 canonical layout 的主题变体，不允许重新生成不同排版。
- 允许变化的内容仅限：
  - `color tokens`
  - `surface hierarchy`
  - `shadows`
  - `contrast`
  - `illustration treatment`
  - `decorative accents`
- 不允许变化的内容包括：
  - `information architecture`
  - `module order`
  - `section grouping`
  - `CTA placement`
  - `card structure`
  - `core spacing rhythm`
  - `navigation structure`

#### Edit/Derive First Rule

- 如果项目中已经存在对应页面，必须优先：
  - `edit existing screen`
  - `duplicate existing canonical screen and derive a theme variant`
- 不得默认通过重新生成一个“看起来相似”的新页面来充当 `light` 或 `dark` 版本。

#### Archive Rule

- 旧 screen、探索稿、被替换 screen 不得与 canonical screen 混放为同级主页面。
- 这些 screen 必须被重命名或归档，例如：
  - `Archive / Homepage / Old 01`
  - `Archive / Homepage / Exploration 02`

#### Naming Convention Rule

- Screen 命名必须显式带 `route + theme`，推荐格式：
  - `Homepage / Dark`
  - `Homepage / Light`
  - `Login / Dark`
  - `Login / Light`
  - `Verify / Dark`
  - `Verify / Light`
  - `Novel Detail / Dark`
  - `Novel Detail / Light`
  - `Chapter Reader / Dark`
  - `Chapter Reader / Light`
- 禁止使用无法判断关系的命名，例如：
  - `Homepage Final`
  - `Homepage New`
  - `Homepage Illuminated`
  - `Homepage Premium`
- 除非这些名字前面已经带 canonical route 和 theme 标记。

#### Review Gate Rule

- Stitch 评审不能只检查“是否有页面”，还必须检查：
  - 是否一路由一套 canonical layout
  - 是否 `light/dark` 一一对应
  - 是否存在未归档的重复 screen
  - 是否给出了完整的 `screen mapping`
- 以上任一项缺失，都不得视为评审完成。

#### Default Behavior Rule

- 如果 change 没有显式声明其他策略，默认行为必须是：
  - 选择现有 canonical screen
  - 从 canonical screen 派生 theme variant
  - 不新增不必要的替代 layout
  - 不保留未标记用途的重复 screen

### 10.8 `screen mapping` 与结构化交付要求

每次 Stitch 交付必须输出 `screen mapping`，至少包含：

- `route/page name`
- `canonical_dark_screen_id`
- `canonical_light_screen_id`
- `whether one is derived from the other`
- `archived_screen_ids`

推荐格式示例：

```text
Homepage: Dark xxx, Light yyy, Derived: yes, Archived: [zzz]
Login: Dark aaa, Light bbb, Derived: yes, Archived: []
```

如当前 change 明确只覆盖单主题，`canonical_dark_screen_id` 或 `canonical_light_screen_id` 也不得无说明留空；应显式标记 `out_of_scope` 并在说明中写明原因。

`result.json` 推荐至少包含如下结构：

```json
{
  "screen_mapping": [
    {
      "route": "Homepage",
      "canonical_dark_screen_id": "xxx",
      "canonical_light_screen_id": "yyy",
      "derived_from_other_theme": true,
      "archived_screen_ids": ["zzz"],
      "notes": ""
    }
  ],
  "canonical_screens_selected": [
    {
      "route": "Homepage",
      "screen_id": "xxx",
      "theme": "dark"
    }
  ],
  "theme_paired_screens_created_or_updated": [
    {
      "route": "Homepage",
      "screen_id": "yyy",
      "theme": "light",
      "derived_from_screen_id": "xxx"
    }
  ],
  "archived_or_replaced_screens": ["zzz"],
  "unresolved_duplicates": []
}
```

`summary.md` 也必须以结构化方式复述以下内容：

- `canonical screens selected`
- `theme-paired screens created/updated`
- `archived/replaced screens`
- `unresolved duplicates`

## 11. 模板改造要求

当 `stitch_design_review` 被激活时：

### 11.1 `proposal.md`

- 保持 flags 作为激活来源
- 不强制增加额外字段

### 11.2 `tasks.md`

- `optional_steps` 中必须包含 `stitch_design_review`
- checklist 中应出现与 Stitch 验收相关的任务提示

建议语义：

- 先选择或确认每个 route 的 canonical screen
- 如需主题变体，基于 canonical screen 执行 edit / duplicate / derive
- 生成 Stitch 页面预览
- 输出 `screen mapping` 并归档重复 screen
- 提交用户验收
- 审批通过后继续实现

### 11.3 `verification.md`

- `optional_steps` 中必须包含 `stitch_design_review`
- `passed_optional_steps` 在通过后必须包含 `stitch_design_review`
- 应增加对 `approval.json` 的核验说明
- 应增加对 `screen mapping`、canonical 选择、theme pairing 与 archive 结果的核验说明

## 12. CLI 命令设计

建议分步做，不一次铺满。

### 12.1 第一批命令

- `ospec plugins list [path]`
- `ospec plugins status [path]`
- `ospec plugins enable stitch [path]`
- `ospec plugins disable stitch [path]`

### 12.2 第二批命令

- `ospec plugins approve stitch <change-path>`
- `ospec plugins reject stitch <change-path>`

### 12.3 后续增强命令

- `ospec plugins run stitch <change-path>`
- `ospec plugins migrate stitch <change-path>`

## 13. Verify / Archive / Finalize 行为

### 13.1 `verify`

当 `stitch_design_review` 已激活时，新增检查：

1. `approval.json` 是否存在
2. `approval.json.step` 是否匹配 `stitch_design_review`
3. `approval.json.status` 是否为 `approved`
4. `approval.json.review_contract` 中各项规则是否全部为通过
5. `approval.json.review_contract.unresolved_duplicates` 是否为空
6. `result.json` 或 `summary.md` 是否包含可核验的 `screen mapping`
7. `tasks.md` / `verification.md` 是否覆盖该 step

### 13.2 `archive`

当 `stitch_design_review` 已激活且为 blocking step 时：

- `approval.json.status != approved` 则阻断 archive
- `passed_optional_steps` 未包含 `stitch_design_review` 则阻断 archive
- `review_contract` 任一规则未通过则阻断 archive
- 存在未归档重复 screen 或未解决的 canonical 冲突则阻断 archive
- 缺失 `screen mapping` 或无法确认 `light/dark` 是否为同一 layout 派生则阻断 archive

### 13.3 `finalize`

`finalize` 仍走：

`verify -> archive`

因此 Stitch 阻断无需在 `finalize` 里额外重复实现，只要接入 `verify/archive` 即可生效。

## 14. 实施顺序

后续实现严格按以下阶段推进，避免上下文发散。

### 阶段 1：Schema 与合成层

目标：让项目配置能表达 Stitch 插件能力。

本阶段完成后应具备：

- `.skillrc.plugins.stitch` 可被读取
- 系统能计算 `stitch_design_review` 是否激活
- 不要求已经有 CLI 开关命令

### 阶段 2：模板与门禁接入

目标：让 change 文档和 `verify/archive` 能识别 Stitch。

本阶段完成后应具备：

- 新 change 能写入 Stitch optional step
- `verify/archive/finalize` 能基于 `approval.json` 阻断

### 阶段 3：插件命令入口

目标：让项目级启用和停用可以通过命令操作。

本阶段完成后应具备：

- `plugins status`
- `plugins enable stitch`
- `plugins disable stitch`

### 阶段 4：审批写入命令

目标：把人工审批结果固化为机器可读产物。

本阶段完成后应具备：

- `plugins approve stitch`
- `plugins reject stitch`

### 阶段 5：Skill 与 AI 协议适配

目标：让 `ospec-change` 在项目开启 Stitch 时，AI 能知道必须先完成 Stitch 审核。

本阶段完成后应具备：

- skill 文档知道项目存在 Stitch 插件
- AI 读到激活 step 时，先检查 Stitch 产物与审批状态

## 15. 首阶段实现建议

为了尽快落地，推荐先做：

1. `.skillrc.plugins.stitch` schema
2. workflow effective step 计算
3. `ospec new` 模板注入
4. `verify/archive` 读取 `approval.json`

也就是先把 OSpec 自己的“控制平面”打通。

Stitch API 真实调用可以放在下一步，不影响当前工作流价值。

## 16. 后续扩展方向

后续可以扩展：

1. 同一 plugin 提供多个 capability
2. 多 plugin 并行启用
3. 更强的执行时阻断
4. 老 change 的手动调整方案
5. Stitch API 自动执行器
6. Stitch 产物截图、摘要、版本对比

## 17. 当前文档的执行意义

后续实现 Stitch 插件时：

- 先对照本文档确认阶段
- 每一阶段只做该阶段范围内的事情
- 如需偏离本文档，先明确改文档，再改代码

这样可以保证：

- 多轮对话不丢设计细节
- 功能逐步落地，不一次性失控
- 代码实现始终围绕已确认方案推进

## 17. 当前已落地的 runtime bridge

当前版本已经实现 Stitch 的 runtime bridge，约定如下：

### 17.1 项目配置

当前版本默认内建 `Gemini CLI + stitch MCP` 适配路径。

如果项目没有显式覆写 `.skillrc.plugins.stitch.runner`，则默认等价于：

```json
{
  "mode": "command",
  "command": "node",
  "args": [
    "${ospec_package_path}/dist/adapters/gemini-stitch-adapter.js",
    "--change",
    "{change_path}",
    "--project",
    "{project_path}"
  ],
  "cwd": "{project_path}",
  "timeout_ms": 900000,
  "token_env": "",
  "extra_env": {}
}
```

说明：

- 默认路径优先复用本机 Gemini CLI 已配置好的 `stitch` MCP
- 如需接入自定义 Stitch bridge / wrapper，仍可显式覆写 `.skillrc.plugins.stitch.runner`
- `token_env` 可留空；不留空时，执行前必须存在对应环境变量
- `args` / `cwd` / `extra_env` 支持 `{change_path}`、`{project_path}`、`{approval_path}`、`{summary_path}`、`{result_path}`、`{change_name}`、`${ospec_package_path}` 占位符
- 使用内建 Gemini 适配器时，认证通常不通过 `token_env`，而是通过 `%USERPROFILE%/.gemini/settings.json` 中的 `mcpServers.stitch` 完成

### 17.1.1 内置 runner 的 provider 切换

如果项目只使用内置 runner，那么 Stitch 实际走哪个适配器，以 `.skillrc.plugins.stitch.provider` 为准。

可选值：

- `gemini`
- `codex`

切换完成后，建议执行：

```bash
ospec plugins doctor stitch .
```

#### 切到 Gemini

1. 把 `.skillrc.plugins.stitch.provider` 设为 `gemini`
2. 在 `C:\Users\{UserName}\.gemini\settings.json` 中增加：

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

#### 切到 Codex

1. 把 `.skillrc.plugins.stitch.provider` 设为 `codex`
2. 在 `C:\Users\{UserName}\.codex\config.toml` 中增加：

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

#### Codex 写操作放行约定

- 已确认某些环境下，`codex exec` 对 Stitch MCP 写操作可能卡在本地放行链路，表现为 `list_projects` 正常，但 `create_project`、`generate_screen`、`edit_screens` 等写操作在进入 `mcp_tool_call` 前停住。
- 这类现象优先视为本地 Codex CLI 写操作放行问题，不要先误判成 Stitch 服务端超时、MCP 不通或 API Key 错误。
- 使用内建 Codex Stitch 适配器时，OSpec 应默认通过 `codex exec --dangerously-bypass-approvals-and-sandbox` 发起 Stitch MCP 写操作。
- 如果项目显式覆写 `.skillrc.plugins.stitch.runner`，自定义 Stitch bridge / wrapper 也必须显式带上 `--dangerously-bypass-approvals-and-sandbox`，否则只读调用可能正常，但写操作仍会卡住。
- 第一次成功创建 canonical Stitch project 后，必须把返回的 project ID 回写到 `.skillrc.plugins.stitch.project.project_id`。

如果项目没有使用自定义 runner，那么切换 `provider` 后，内置 runner 会自动改用对应的 Stitch 适配器。

### 17.2 命令入口

```bash
ospec plugins run stitch <change-path>
```

该命令会：

1. 校验项目已启用 `stitch`
2. 校验当前 change 已激活 `stitch_design_review`
3. 调用内建 Gemini Stitch 适配器或项目自定义 Stitch bridge / MCP 包装命令
4. 把结果回写到 `artifacts/stitch/approval.json`
5. 在有说明内容或需要补齐结构化 `screen mapping` 时写入 `artifacts/stitch/summary.md`
6. 把 `verification.md` 中的 `passed_optional_steps.stitch_design_review` 清空回待审批状态

### 17.3 stdout 输出契约

runner 标准输出支持两种形式：

1. JSON：

```json
{
  "preview_url": "http://127.0.0.1:3000/stitch-preview/home",
  "summary_markdown": "# Home Preview\n\n- hero updated",
  "notes": "submitted by local stitch bridge",
  "screen_mapping": [
    {
      "route": "Homepage",
      "canonical_dark_screen_id": "xxx",
      "canonical_light_screen_id": "yyy",
      "derived_from_other_theme": true,
      "archived_screen_ids": ["zzz"]
    }
  ],
  "canonical_screens_selected": [
    {
      "route": "Homepage",
      "screen_id": "xxx",
      "theme": "dark"
    }
  ],
  "theme_paired_screens_created_or_updated": [
    {
      "route": "Homepage",
      "screen_id": "yyy",
      "theme": "light",
      "derived_from_screen_id": "xxx"
    }
  ],
  "archived_or_replaced_screens": ["zzz"],
  "unresolved_duplicates": []
}
```

2. 纯文本：

```text
http://127.0.0.1:3000/stitch-preview/home
```

其中：

- `preview_url` 必填
- `summary_markdown` 可选
- `notes` 可选
- `screen_mapping` 在页面设计评审场景下为必填
- `unresolved_duplicates` 必须显式返回；存在值时不得审批通过

纯文本输出只应作为 legacy fallback。对于已启用 `page_design_review` 硬约束的项目，若 runner 只返回纯文本 URL，则必须通过 `result.json` 或 `summary.md` 补齐 canonical、theme pairing、archive 与 `screen mapping` 信息；否则该结果不得进入审批通过状态。

### 17.4 AI 协议配合

要让 AI 在新 change 中自动进入 Stitch 预览流程，需要：

1. 项目启用 Stitch：`ospec plugins enable stitch .`
2. 项目同步最新协议文档：`ospec docs sync-protocol .`
3. 若走默认路径，用户本机需安装 `@google/gemini-cli`，并在 `%USERPROFILE%/.gemini/settings.json` 中配置 `mcpServers.stitch` 及所需认证
4. 若走自定义路径，用户在项目环境中配置好 runner 和所需 token env

涉及 `light/dark` 主题变体时，prompt 必须明确写出以下约束：

- `Use the existing canonical screen as the base`
- `Keep the same layout structure`
- `Do not reorder modules`
- `Do not create a different composition`
- `Only transform the visual theme`

AI 默认行为必须是：

- 优先选择现有 canonical screen
- 基于 canonical screen 执行 edit / duplicate / derive
- 不新增不必要的替代 layout
- 不保留未标记用途的重复页面

完成后，AI 在检测到 `stitch_design_review` 已激活且尚未提交预览时，应优先运行：

```bash
ospec plugins run stitch <change-path>
```

拿到 `preview_url` 后再发给用户验收，只有在 `ospec plugins approve stitch <change-path>` 之后，change 才应继续推进；如果缺失 canonical 说明、theme pairing 说明、`screen mapping` 或仍存在未归档重复 screen，则不得视为可审批状态。
### 17.5 runner 自检

当前版本新增：

```bash
ospec plugins doctor stitch <project-path>
```

该命令会检查：

- Stitch 插件是否已启用
- `page_design_review` capability 是否开启
- 默认 / 自定义 runner 是否可解析并可执行
- `token_env` 是否已设置
- Gemini CLI 是否存在
- `%USERPROFILE%/.gemini/settings.json` 是否存在
- `mcpServers.stitch` 是否存在
- stitch MCP 是否带有认证配置提示（如 header / env）
- 当 provider 为 `codex` 时，会额外提示当前是否走内建写操作放行路径；若使用自定义 runner，则会提示必须自行补上 `--dangerously-bypass-approvals-and-sandbox`

### 17.6 运行结果产物

除了 `approval.json` 和 `summary.md` 之外，当前版本还会写入：

```text
changes/active/<change>/artifacts/stitch/result.json
```

该文件用于保存本次 Stitch bridge / MCP 运行结果，包括：

- 执行时间
- runner 命令、参数、cwd、timeout
- 解析后的 `preview_url`
- 可选的 `summary_markdown`
- 可选的 `metadata`
- 可选的 `artifacts`
- 必填的 `screen_mapping`
- `canonical_screens_selected`
- `theme_paired_screens_created_or_updated`
- `archived_or_replaced_screens`
- `unresolved_duplicates`

如果 runner 返回 `summary_path`，OSpec 会读取对应文件内容并同步生成 `summary.md`。

### 17.7 与 Checkpoint 的协作约定

如果项目同时启用了 `checkpoint`，且当前 change 同时激活了：

- `stitch_design_review`
- `checkpoint_ui_review`

则 Stitch 还应额外满足以下约定：

1. 为每个 route/theme 导出可比较的截图或等效文件路径。
2. 导出物应优先写入 `.ospec/plugins/stitch/exports/`。
3. `result.json` 中应能反向定位这些导出物。
4. 如果没有可比较导出物，`checkpoint_ui_review` 不得宣称完成基于设计基线的一致性检查。

也就是说，`preview_url` 足够支持人工查看，但不足以支持 `checkpoint` 的自动视觉比对；如需两者协作，必须额外提供仓库可复用的导出基线。
