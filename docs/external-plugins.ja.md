# 外部プラグイン

OSpec は npm でインストールする外部プラグインをサポートします。

## 利用フロー

1. `ospec plugins list` で一覧を見る
2. `ospec plugins info <id>` で詳細を見る
3. `ospec plugins install <id>` でグローバルにインストールする
4. `ospec plugins enable <id> <project-path>` でプロジェクトに有効化する
5. `ospec plugins doctor <id> <project-path>` で診断する
6. `ospec plugins run <id> <change-path>` で実行する
7. `ospec plugins update <id>` でインストール済みプラグインを 1 つ更新する
8. `ospec plugins update --all` でインストール済みプラグインをすべて更新する

## 更新範囲

- `ospec update [path]` はプロジェクトスコープで動作し、そのプロジェクトで有効化されているプラグインだけを更新します
- `ospec plugins update --all` はマシンスコープで動作し、OSpec が記録しているインストール済みプラグインをすべて更新します
- インストール済みプラグインのパッケージが手動で削除されていた場合、`ospec plugins update --all` は更新前にその復旧を試みます
- AI / `/ospec` フローでは、ユーザーがインストール済みプラグインをすべて更新したいと明示した場合にだけ `ospec plugins update --all` を実行してください

## パッケージモデル

- プラグインは npm パッケージとして配布されます
- パッケージ名は `@clawplays/ospec-plugin-<id>` を使います
- メイン CLI は引き続き `@clawplays/ospec-cli` です
- 公式プラグインはすべて npm インストール型であり、CLI 本体に組み込まれてはいません
- 公式プラグインの検出には、まず CLI に同梱された `assets/plugins/registry.json` snapshot が使われます
- 利用可能な場合は、CLI は `clawplays/ospec` が公開する `plugins/registry.json` から最新の公式プラグインメタデータも取得します
- 新しい公式プラグインは、その公開 registry snapshot が更新されると、次の CLI npm リリースを待たずに既存 CLI から検出できるようになります

## アセットモデル

- `runtime`: 実行可能なレビューや自動化ロジック
- `skill`: Codex / Claude 向けプロンプトバンドル
- `knowledge`: ドキュメントや将来の RAG 向け資産
