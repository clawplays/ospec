# 插件发布

插件包通过插件发布流程发布，并与主 CLI 包的发布流程分离。

## 推荐自动化方案

官方插件包的长期推荐方案是：

1. 统一复用 `.github/workflows/publish-plugin.yml`
2. 在 `clawplays/ospec-src` 仓库里配置一个可复用的 `NPM_TOKEN`
3. 所有插件都通过同一个 workflow 发布

这是新插件首发时唯一真正全自动的方案，因为 npm Trusted Publishing 是按“包”配置的，通常要在包已经存在后才能继续配置。

workflow 仍然保留了 `id-token: write`，这样已经存在的包后续如果要接入 npm OIDC trust 也可以继续使用；但插件体系本身应当把 `NPM_TOKEN` 视为始终可用的自动发布路径。

## GitHub Actions 配置

1. 创建一个面向 `@clawplays` scope 的 granular npm token，要求：
   - `Read and write`
   - 开启 `bypass 2FA`
   - 选择范围足够覆盖未来的新官方插件
2. 把这个 token 保存为 GitHub 仓库 secret：`NPM_TOKEN`
3. 保持插件包元数据正确：
   - `name`
   - `version`
   - `repository`
   - `homepage`
   - `bugs`
4. 确保 workflow 变更已经合并到 `main`

如果源仓库是 private，workflow 会自动去掉 `--provenance`，因为 npm provenance 目前要求 GitHub 源仓库必须是 public。

## 本地流程

1. 更新 `plugins/<id>/`
2. 运行 `npm run plugins:check -- --plugin <id>`
3. 可选运行 `npm run plugins:pack -- --plugin <id>` 预览打包内容
4. 打 tag：`plugin-<id>@<version>`
5. 通过插件 workflow 或 `npm run plugins:publish -- --plugin <id>` 发布

## GitHub Actions 流程

1. 提交并推送插件变更
2. 推送名为 `plugin-<id>@<version>` 的 tag
3. GitHub Actions 校验插件元数据并发布 npm 包
4. 同一个 workflow 也支持 `workflow_dispatch` 手动重试

`workflow_dispatch` 可传入：

- `plugin_id`
- `expected_version`（可选）
- `ref`（可选）

## 新增官方插件

1. 创建 `plugins/<id>/package.json`
2. 在 `plugins/catalog.json` 中添加条目
3. 运行 `npm run plugins:sync`
4. 运行 `npm run plugins:check -- --plugin <id>`
5. 可选运行 `npm run plugins:pack -- --plugin <id>` 检查发布包内容
6. 合并到 `main`
7. 通过共享 workflow 和 `NPM_TOKEN` 发布首个版本
8. 保持 `clawplays/ospec/plugins/registry.json` 这份公开插件 registry 快照同步更新，这样已经安装过 CLI 的用户在“不升级主 CLI npm 包”的情况下也能发现这个新官方插件

只要插件继续遵守 `plugins/<id>` 目录结构和 `plugin-<id>@<version>` tag 规则，就不需要再修改 workflow。

## 主包边界

- `@clawplays/ospec-cli` 保持现有主包发布流程
- 插件源码目录仍然排除在 release-repo export 之外
- 公开 release repo 现在会携带 `plugins/registry.json`，这样官方插件元数据可以独立于插件包发布进行刷新
