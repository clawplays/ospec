# Checkpoint プラグイン仕様書

このドキュメントでは、まずユーザーが `checkpoint` をどのように使用するかを説明し、その後に詳細な技術仕様を記載します。

## 概要

`checkpoint` は、実行中のページ検査、フロー検証、および自動化された品質ゲート（検問）に使用されます。

適したシナリオ：

- 重要な送信フロー
- 検収前のページおよびインタラクションのチェック
- UI、フロー、インターフェース、および最終結果の自動確認が必要な変更（change）

主な役割：

- 自動化されたチェックの実行
- ゲート結果の生成
- チェックが合格するまで `verify / archive / finalize` をブロックする

## プラグインの有効化方法

AI 対話方式：

```text
OSpec を使用して Checkpoint プラグインを有効化してください。
```

スキル方式：

```text
$ospec を使用して Checkpoint プラグインを有効化してください。
```

コマンドライン：

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

## 有効化後の設定

`checkpoint` を有効にした後、少なくとも以下の項目を補完する必要があります：

1. `base_url`
2. `routes.yaml`
3. `flows.yaml`
4. ログイン状態またはログインスクリプト
5. 起動コマンドと準備完了チェック（プロジェクトに直接アクセスできない場合）

### 1. `base_url`

`checkpoint` を初めて有効にする際は、必ず `--base-url` を指定する必要があります。

このアドレスは、自動化チェックが実際にアクセスするアプリケーションのアドレスです。例：

- `http://127.0.0.1:3000`
- `http://localhost:4173`

### 2. `routes.yaml`

`.ospec/plugins/checkpoint/routes.yaml` に以下を明記します：

- どのページをチェックするか
- 各ページで使用するビューポート
- 対応するベースラインスクリーンショットまたはデザインベースライン
- 無視する領域
- ページ上の重要なテキストや UI 要件

### 3. `flows.yaml`

`.ospec/plugins/checkpoint/flows.yaml` に以下を明記します：

- 重要なフローの開始点
- 中間ステップ
- アサーション（期待される結果）が必要なインターフェース
- アサーションが必要なビジネス上の最終状態

### 4. ログイン状態またはログインスクリプト

フローがログインに依存している場合、少なくとも以下のいずれかを準備する必要があります：

- `.ospec/plugins/checkpoint/auth/storage-state.json`
- `.ospec/plugins/checkpoint/auth/login.js` のようなログインスクリプト

ログイン状態がないと、自動化チェック時に多くの実際のフローが失敗します。

### 5. 起動コマンドと準備完了チェック

プロジェクトが「自然に実行されている」状態でない場合は、`.skillrc.plugins.checkpoint.runtime` に以下を補完します：

- `startup`
- `readiness`
- `shutdown`

一般的な方法：

- `docker compose up -d` で起動
- ヘルスチェック URL でサービスが準備完了になるまで待機
- 実行後に環境を停止

## 生成される内容

有効化後、プロジェクト内に Checkpoint 関連の以下の項目が表示されます：

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/routes.yaml`
- `.ospec/plugins/checkpoint/flows.yaml`
- `.ospec/plugins/checkpoint/baselines/`
- `.ospec/plugins/checkpoint/auth/`
- `.ospec/plugins/checkpoint/cache/`

特定の change に紐づく実行結果は以下に保存されます：

- `changes/active/<change>/artifacts/checkpoint/`

## 推奨ワークフロー

1. プロジェクトの初期化：`ospec init .`
2. Checkpoint を有効化：`ospec plugins enable checkpoint . --base-url <url>`
3. `routes.yaml`、`flows.yaml`、ログイン状態、および実行環境を設定
4. 診断を実行：`ospec plugins doctor checkpoint .`
5. 自動検証が必要な change を作成
6. チェックを実行：`ospec plugins run checkpoint <change-path>`
7. チェック合格後、`ospec verify` と `ospec finalize` を実行

## 本プラグインの使用タイミング

以下の変更（change）に対して Checkpoint を有効化またはトリガーすることを推奨します：

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

文言の修正のみやドキュメントのみの変更の場合、通常 Checkpoint は不要です。

## 詳細な技術仕様

このドキュメントは、OSpec における `checkpoint` プラグインの目標、実行規約、および実装の境界を定義し、その後の議論や段階的な実装において制約が失われないようにします。

以降に記載される以下の名称：

- `Checkpoint プラグイン`
- `checkpoint MVP`
- `Playwright Auto-Review プラグイン`

は、明示的に変更されない限り、このドキュメントを指します。

## 1. 背景

`stitch` はデザイン成果物とデザインレビューゲートを扱いますが、実際のプロジェクトではアーカイブ前に別の種類の自動化されたゲートが必要です：

- ページがデザインと一致しているか？
- レイアウト、改行、重なり、フォント、色、コントラストなどの UI 問題はないか？
- 機能フローは実行可能か？
- フロントエンドとバックエンドのデータは一致しているか？

これらの機能は、デザインの生成や手動承認ではなく、実行時の自動チェックに属するため、`stitch` には含まれません。

そのため、`stitch` と対になるプラグインとして以下を導入します：

- `checkpoint`

`checkpoint` は、変更をアーカイブする前に自動チェックを実行します。有効化されたすべてのチェックが合格した場合のみ、アーカイブが許可されます。

## 2. 確定済みの決定事項

実装に関する確定事項：

1. `checkpoint` と `stitch` は対等なプラグインであり、`checkpoint` は `stitch` の配下ではありません。
2. `checkpoint` のデフォルトの実行エンジン（executor）は `Playwright` ですが、プラグインの意味論は実行エンジン名に縛られません。
3. 初めて有効化する際は `base_url` が必須です。
4. フェーズ 1 では 1 つの `base_url` のみをサポートし、マルチ環境の切り替えは行いません。
5. `checkpoint` は自動化されたゲートプラグインであり、`approve / reject` のような手動承認コマンドは導入しません。

6. プロジェクトで `stitch` が有効になっており、現在の change で `stitch_design_review` が有効な場合、`checkpoint` は優先的に Stitch がエクスポートしたデザインベースラインを再利用します。
7. `stitch` が無効な場合、`checkpoint` はリポジトリ内のベースラインスクリーンショットとテキスト要件をデザインチェックのベースラインとして使用します。
8. プロジェクトにローカル起動機能がない可能性があるため、`checkpoint` はカスタムの起動コマンドをサポートする必要があります。`docker compose` が利用可能な場合、それを使用してテスト環境を起動することを推奨します。
9. ログイン状態はサポートされる標準機能であり、デフォルトで `storageState` またはカスタムのログインスクリプトを使用します。
10. データの正確性チェックは、Playwright のページ/インターフェースアサーションと、カスタムのバックエンド最終状態アサーションコマンドの 2 つの部分で構成されます。
11. `checkpoint` は change フラグに基づいて特定の機能（capability）のみを有効にすることを許可し、すべての変更でフルセットのチェックを行う必要はありません。
12. 推奨される実装順序は、まず `ui_review` を、その後に `flow_check` を実施することです。

## 3. 用語の定義

### 3.1 Plugin

`plugin` は拡張機能の提供元を指します。本プラグイン名は以下に固定されます：

- `checkpoint`

### 3.2 Capability

`checkpoint` MVP は 2 つの機能に分割されます：

- `ui_review`
- `flow_check`

### 3.3 Optional Step

`checkpoint` は、ワークフローに 2 つのオプションステップを追加します：

- `checkpoint_ui_review`
- `checkpoint_flow_check`

### 3.4 Plugin Workspace

`plugin workspace` は、プロジェクトレベルで再利用可能な、単一の change に依存しないプラグイン作業ディレクトリを指します。`checkpoint` の作業ディレクトリは以下に固定されます：

```text
.ospec/plugins/checkpoint/
```

### 3.5 Gate Artifact

`gate artifact` は、`verify / archive / finalize` ゲート判定に使用されるマシンリーダブルな結果を指します。`checkpoint` のメインゲートファイルは以下に固定されます：

```text
changes/active/<change>/artifacts/checkpoint/gate.json
```

## 4. MVP の目標

MVP の目標は、一度に完全なテストプラットフォームを構築することではなく、アーカイブ前の自動化されたゲートを実行できるようにすることです：

1. プロジェクトは `checkpoint` プラグインを有効化できる。
2. 新しい change は、フラグに基づいて `checkpoint_ui_review` と `checkpoint_flow_check` を有効化できる。
3. プラグインは対象プロジェクトを起動または接続し、`base_url` に基づいて Playwright フローを実行できる。
4. `ui_review` は、Stitch のエクスポートまたはリポジトリのベースラインスクリーンショットに基づいてページチェックを実行できる。
5. `flow_check` は、重要なフロー、インターフェースアサーション、およびカスタムバックエンドアサーションを実行できる。
6. `verify / archive / finalize` は、`gate.json` に基づいてフローをブロックできる。
7. `stitch` が同時に有効な場合、`checkpoint` の合格時に Stitch の承認ステータスを自動的に同期できる。

## 5. MVP の非目標（対象外）

以下の内容は第 1 段階の実装目標に含まれません：

1. マルチ環境マトリックス実行。
2. 汎用データベースドライバーまたはデータベース直接接続アダプター層。
3. 汎用レコーダーまたはフルリプレイプラットフォーム。
4. 完全なビジュアル AI スコアリングプラットフォーム。
5. すべてのビジネスフレームワークに対する一括ビルトイン対応。
6. 手動承認 UI または手動注釈システム。

## 6. 統一ディレクトリ規約

すべてのプラグインは、今後以下の 3 層ディレクトリモデルを採用します：

- プロジェクトレベル設定：`.skillrc.plugins.<plugin>`
- プロジェクトレベル作業ディレクトリ：`.ospec/plugins/<plugin>/`
- change レベル成果物ディレクトリ：`changes/active/<change>/artifacts/<plugin>/`

したがって、`checkpoint` は以下を採用します：

- `.skillrc.plugins.checkpoint`
- `.ospec/plugins/checkpoint/`
- `changes/active/<change>/artifacts/checkpoint/`

### 6.1 `checkpoint` プロジェクトレベル作業ディレクトリ

推奨構造：

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

- `routes.yaml`: ページ検査対象、ルート、ビューポート、ベースラインソース、無視領域、テキスト要件。
- `flows.yaml`: フローのエントリポイント、ステップ、インターフェースアサーション、カスタムバックエンドアサーションコマンド。
- `baselines/`: リポジトリ内のベースラインスクリーンショット。
- `auth/`: ログイン状態ファイル、認証スクリプトテンプレート、および手順（例：`storage-state.json`, `login.example.js`）。
- `cache/`: 一時的なキャッシュ、中間エクスポート結果。

### 6.2 `checkpoint` Change レベル成果物ディレクトリ

推奨構造：

```text
changes/active/<change>/artifacts/checkpoint/
  gate.json
  result.json
  summary.md
  screenshots/
  diffs/
  traces/
```

- `gate.json`: アーカイブゲート判定のエントリポイント。
- `result.json`: 生の構造化結果。
- `summary.md`: 人間が読むための概要。
- `screenshots/`: 実際のスクリーンショット。
- `diffs/`: ビジュアルの差分画像。
- `traces/`: Playwright のトレース、HAR、ログなど。

## 13. Stitch との連携規約

プロジェクトで `stitch` と `checkpoint` の両方が有効であり、現在の change で `stitch_design_review` と `checkpoint_ui_review` の両方が有効な場合、以下のルールに従います：

1. `checkpoint_ui_review` は、Stitch がエクスポートしたルート/テーマのベースラインを優先的に読み込みます。
2. Stitch が比較可能なスクリーンショットをエクスポートしていない場合、`checkpoint_ui_review` はデザイン整合性チェックの完了を宣言できません。
3. `checkpoint_ui_review` が合格し、`stitch_integration.auto_pass_stitch_review = true` の場合、`checkpoint` は `artifacts/stitch/approval.json` を `approved` に自動的に同期できます。
4. `checkpoint_ui_review` が失敗した場合、Stitch の承認は自動的に付与されません。

これは、`stitch` がデザイン成果物と構造のゲートを担当し、`checkpoint` が実行時のページ整合性と自動フローのゲートを担当することを意味します。

## 14. ゲート成果物

### 14.1 `gate.json` 推奨構造

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

### 14.2 `status` の値

- `pending`
- `passed`
- `failed`

## 15. CLI コマンド設計

- `ospec plugins status [path]`
- `ospec plugins enable checkpoint [path] --base-url <url>`
- `ospec plugins disable checkpoint [path]`
- `ospec plugins doctor checkpoint [path]`
- `ospec plugins run checkpoint <change-path>`

注意：`checkpoint` は自動ゲートであるため、`approve` や `reject` コマンドは提供しません。

## 16. Verify / Archive / Finalize の挙動

### 16.1 `verify`

いずれかの `checkpoint` ステップが有効な場合、以下のチェックが追加されます：

1. `artifacts/checkpoint/gate.json` が存在する。
2. `gate.json.status` が `passed` である。
3. 有効化された各 `checkpoint` ステップが `passed` である。
4. リンクされている場合、Stitch 承認が同期されている。

### 16.2 `archive`

いずれかの `checkpoint` ステップが有効で、`blocking = true` の場合：

- `gate.json.status != passed` の場合、アーカイブがブロックされます。
- 有効化されたステップが失敗したか、重要な問題が残っている場合、アーカイブがブロックされます。

## 17. 実装順序

1. **フェーズ 1: スキーマとプロジェクトレベルの作業ディレクトリ**: `.skillrc.plugins.checkpoint` と `.ospec/plugins/checkpoint/` のディレクトリ構造を定義します。
2. **フェーズ 2: `ui_review` ゲート**: Playwright のページチェックとゲート結果の実装を行います。
3. **フェーズ 3: Stitch との連携**: `checkpoint_ui_review` と Stitch の承認同期を実装します。
4. **フェーズ 4: `flow_check` ゲート**: 重要なフローとアサーションを実装します。

## 18. 本ドキュメントの目的

`checkpoint` を実装する際は、このドキュメントで範囲を確認してください。逸脱が必要な場合は、まずドキュメントを更新してください。これにより、`checkpoint` が `stitch` と明確な境界を持つ、独立した自動ゲートプラグインとして維持されます。