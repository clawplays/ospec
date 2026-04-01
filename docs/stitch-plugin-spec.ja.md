# Stitch プラグイン仕様書

このドキュメントでは、まずユーザーが `stitch` をどのように使用するかを説明し、その後に詳細な技術仕様を記載します。

## 概要

`stitch` は、ページのデザインレビューおよびプレビューのコラボレーションに使用されます。

適したシナリオ：

- ランディングページ、マーケティングページ、キャンペーンページ
- UI の変更が大きいページの要件
- 開発を続行するかどうかを決定する前に、デザインのプレビューを確認する必要がある変更（change）

主な役割：

- ページプレビューの生成または提出
- 手動による承認の待機
- 承認されるまで `verify / archive / finalize` をブロックする

## プラグインの有効化方法

AI 対話方式：

```text
OSpec を使用して Stitch プラグインを有効化してください。
```

スキル方式：

```text
$ospec を使用して Stitch プラグインを有効化してください。
```

コマンドライン：

```bash
ospec plugins enable stitch .
```

## 有効化後の設定

`stitch` を有効にした後、通常は以下の 3 つのことを完了する必要があります：

1. プロバイダーの選択
2. Stitch 認証の設定
3. 診断を実行し、ローカルマシンとプロジェクトの両方が準備できていることを確認する

### 1. プロバイダーの選択

デフォルトのプロバイダーは `gemini` ですが、`codex` に切り替えることも可能です。

ほとんどのユーザーはランナー（runner）を変更する必要はありません。`.skillrc.plugins.stitch.provider` でどれが使用されているかを確認するだけです。

### 2. Stitch 認証の設定

`gemini` を使用する場合：

- `~/.gemini/settings.json` で `stitch` MCP を設定します。
- `X-Goog-Api-Key` を設定します。

例：

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

`codex` を使用する場合：

- `~/.codex/config.toml` で `stitch` MCP を設定します。
- 同様に `X-Goog-Api-Key` が必要です。

例：

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

### 3. 診断（Doctor Check）を実行する

```bash
ospec plugins doctor stitch .
```

このコマンドは以下を確認します：

- プラグインが有効になっているか
- プロバイダーが設定されているか
- ローカルの CLI が使用可能か
- Stitch MCP と認証が準備できているか

## 生成される内容

有効化後、プロジェクト内に Stitch 関連の以下の項目が表示されます：

- `.skillrc.plugins.stitch`
- `.ospec/plugins/stitch/project.json`
- `.ospec/plugins/stitch/exports/`
- `.ospec/plugins/stitch/baselines/`
- `.ospec/plugins/stitch/cache/`

特定の change に紐づく承認成果物は以下に保存されます：

- `changes/active/<change>/artifacts/stitch/`

## 推奨ワークフロー

1. プロジェクトの初期化：`ospec init .`
2. Stitch を有効化：`ospec plugins enable stitch .`
3. プロバイダーと認証を設定：`ospec plugins doctor stitch .`
4. UI 関連の change を作成
5. Stitch を実行：`ospec plugins run stitch <change-path>`
6. 生成された `preview_url` を承認者に送る
7. 承認後、次を実行：`ospec plugins approve stitch <change-path>`
8. `ospec verify` および `ospec finalize` を実行

## 本プラグインの使用タイミング

以下の変更（change）に対して使用することを推奨します：

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

## 詳細な技術仕様

このドキュメントは、OSpec における `stitch` プラグインの目標、実行規約、および実装の境界を定義します。

## 1. 背景

プロジェクトのデリバリーにおいて、ページ開発には手動でのレビューが必要なことがよくあります。`stitch` はそのためのブリッジを提供し、変更がアーカイブされる前に手動承認が必要であることを保証します。

## 2. 確定済みの決定事項

1. 本プラグイン名は `stitch` です。
2. デフォルトのプロバイダーは `gemini` です。
3. change は `stitch_design_review` オプションステップを有効にできます。
4. `stitch` はプロジェクトレベルの作業ディレクトリ `.ospec/plugins/stitch/` を使用します。
5. ゲート成果物は `changes/active/<change>/artifacts/stitch/` に保存されます。
6. `verify / archive / finalize` コマンドは `stitch` ゲートを尊重します。

## 6. ディレクトリ構造規約

- プロジェクトレベル設定：`.skillrc.plugins.stitch`
- プロジェクトレベル作業ディレクトリ：`.ospec/plugins/stitch/`
- change レベル成果物：`changes/active/<change>/artifacts/stitch/`

### 6.1 `stitch` プロジェクトレベル作業ディレクトリ

```text
.ospec/plugins/stitch/
  project.json
  exports/
  baselines/
  cache/
```

- `project.json`: Stitch プロジェクト ID と設定。
- `exports/`: 比較用のスクリーンショットまたはデザインファイル。
- `baselines/`: 参照用デザインベースライン。
- `cache/`: 中間データキャッシュ。

### 6.2 `stitch` Change レベル成果物ディレクトリ

```text
changes/active/<change>/artifacts/stitch/
  approval.json
  summary.md
  result.json
```

- `approval.json`: 承認ステータス（`pending`, `approved`, `rejected`）。
- `summary.md`: レビュー結果の要約。
- `result.json`: `preview_url` を含む構造化された実行結果。

## 14. CLI コマンド

- `ospec plugins status`
- `ospec plugins enable stitch`
- `ospec plugins doctor stitch`
- `ospec plugins run stitch <change-path>`
- `ospec plugins approve stitch <change-path>`
- `ospec plugins reject stitch <change-path>`

## 17. ランタイムブリッジ仕様

現在のバージョンは Stitch ランタイムブリッジを以下の規約に従って実装しています：

### 17.1 プロジェクト設定

`Gemini CLI + stitch MCP` または `Codex CLI + stitch MCP` の適応パスをビルトインで提供します。

デフォルトのランナー設定（オーバーライドされていない場合）：

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
  "timeout_ms": 900000
}
```

### 17.1.1 プロバイダー選択

`.skillrc.plugins.stitch.provider` で `gemini` または `codex` を選択します。

### 17.6 実行結果成果物

`result.json` には以下が含まれます：

- 実行タイムスタンプ
- ランナーコマンドとパラメータ
- 解析された `preview_url`
- ビジュアル比較用の `screen_mapping`

### 17.7 Checkpoint との連携規約

`checkpoint` が有効で、`checkpoint_ui_review` がアクティブな場合：

1. `stitch` は `.ospec/plugins/stitch/exports/` に比較可能なスクリーンショットをエクスポートする必要があります。
2. `result.json` はこれらのエクスポートをルート/テーマにマップする必要があります。
3. これらのエクスポートがない場合、`checkpoint` は自動的なビジュアル整合性チェックを行えません。

## 18. 本ドキュメントの目的

Stitch プラグインを実装または拡張する際は、このドキュメントに従って境界を維持し、対話を通じてデザイン詳細が失われないようにしてください。
