# プラグイン公開

プラグインパッケージは、メイン CLI パッケージとは別のプラグイン公開フローで公開します。

## 推奨する自動化モデル

公式プラグインでは、長期的には次の形を推奨します。

1. `.github/workflows/publish-plugin.yml` を共通で使う
2. `clawplays/ospec-src` に再利用可能な `NPM_TOKEN` を 1 つ設定する
3. すべてのプラグインを同じ workflow で公開する

新しいプラグインの初回公開を完全自動化するには、この方式が最も現実的です。npm Trusted Publishing は通常、パッケージが存在した後にパッケージ単位で設定するためです。

workflow には `id-token: write` も残してあるので、既存パッケージを後から npm OIDC trust に接続することもできます。ただし、プラグイン公開の標準経路は `NPM_TOKEN` と考えてください。

## GitHub Actions の設定

1. `@clawplays` scope 用の granular npm token を作成する
   - `Read and write`
   - `bypass 2FA` を有効化
   - 今後の公式プラグインも含められる範囲を選ぶ
2. GitHub リポジトリ secret として `NPM_TOKEN` を追加する
3. プラグインパッケージのメタデータを正しく保つ
   - `name`
   - `version`
   - `repository`
   - `homepage`
   - `bugs`
4. workflow の変更を `main` に反映する

ソースリポジトリが private の場合、npm provenance は public GitHub repository を必要とするため、workflow は自動的に `--provenance` なしで公開します。

## ローカル手順

1. `plugins/<id>/` を更新する
2. `npm run plugins:check -- --plugin <id>` を実行する
3. 必要なら `npm run plugins:pack -- --plugin <id>` で tarball を確認する
4. `plugin-<id>@<version>` のタグを作る
5. プラグイン workflow か `npm run plugins:publish -- --plugin <id>` で公開する

## GitHub Actions 手順

1. プラグインの変更を commit / push する
2. `plugin-<id>@<version>` 形式のタグを push する
3. GitHub Actions がメタデータを検証して npm に公開する
4. 同じ workflow は `workflow_dispatch` による手動再実行にも対応している

`workflow_dispatch` では次を指定できます。

- `plugin_id`
- `expected_version`（任意）
- `ref`（任意）

## 新しい公式プラグインを追加する場合

1. `plugins/<id>/package.json` を作成する
2. `plugins/catalog.json` にエントリを追加する
3. `npm run plugins:sync` を実行する
4. `npm run plugins:check -- --plugin <id>` を実行する
5. 必要なら `npm run plugins:pack -- --plugin <id>` で公開内容を確認する
6. `main` に反映する
7. 共通 workflow と `NPM_TOKEN` で初回バージョンを公開する
8. `clawplays/ospec/plugins/registry.json` の公開 plugin registry snapshot を同期しておくことで、既存 CLI でも次回 main CLI npm リリースを待たずに新しい公式プラグインを検出できるようにする

`plugins/<id>` の構成と `plugin-<id>@<version>` のタグ規約を守る限り、新しい workflow 変更は不要です。

## メインパッケージ境界

- `@clawplays/ospec-cli` は既存のメインパッケージ公開フローを維持する
- プラグインのソースツリーは引き続き release-repo export の対象外とする
- ただし公開 release repo には `plugins/registry.json` を含め、公式プラグインのメタデータを個別に更新できるようにする
