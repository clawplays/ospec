# 現在のプロジェクトの Vibe Coding / Spec フロー作業文書

## 1. 文書の目的

この文書は、現在のリポジトリで実際にまだ使用されており、今後も保持する予定の spec フローを整理するためのものです。

今回の調整後の核心的な変化は以下の通りです：

- 初期化が「プロトコルシェル初期化 ＋ 初回の docs generate」の2つの必須ステップに分割されなくなりました。
- `ospec init` は、リポジトリを直接「変更（change）を提案可能な状態」にします。
- `ospec docs generate` は、後続のメンテナンスコマンドに格下げされました。
- ダッシュボードが削除され、フローは CLI に統一されました。

## 2. 現在のフローのメインライン

現在のプロジェクトは、以下の4つのステージからなるメインラインに収束しています：

1. 「変更準備完了（change-ready）」への初期化
2. アクティブな変更（active change）の実行
3. デプロイと検証
4. 要件のアーカイブ

対応する常用コマンドは以下の通りです：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

後でプロジェクト知識レイヤーのメンテナンスのみが必要な場合は、以下を使用します：

```bash
ospec docs generate [path]
```

## 3. 初期化後の構造判断

現在の実装では、構造レベル（structural level）は固定で以下のみを使用します：

- `none`

以下は今後使用されません：

- `basic`
- `full`

これは、初期化後の判断が構造レベル名に依存しなくなることを意味し、直接以下の点を確認します：

- 初期化されているか
- 「変更準備完了（change-ready）」になっているか
- ドキュメントの網羅率が完全か
- アクティブな変更が存在するか
- 現在の変更がアーカイブ可能か

## 4. 現在の spec レイヤー分け

### 4.1 プロトコルシェル

プロトコルシェルはコラボレーションルール自体に焦点を当てます。コアファイルには以下が含まれます：

- `.skillrc`
- `.ospec/`
- `changes/active/`
- `changes/archived/`
- `SKILL.md`
- `SKILL.index.json`
- `for-ai/*`

### 4.2 プロジェクト知識レイヤー

プロジェクトの長期的な知識レイヤーは主に以下に配置されます：

- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `docs/project/module-map.md`
- `docs/project/api-overview.md`

これらのドキュメントは、デフォルトで `ospec init` によって初回生成されます。後で更新や修復が必要な場合は、`ospec docs generate` に任せます。

### 4.3 単一の変更（change）の実行 spec

各アクティブな変更の固定プロトコルファイルは以下の通りです：

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

実行状態の「真のソース（真源）」は引き続き以下となります：

- `state.json`

## 5. 現在の実行順序

単一の変更の推奨順序は引き続き以下の通りです：

1. コンテキストと制約の読み取り
2. `proposal.md` の作成または更新
3. `tasks.md` の作成または更新
4. コードの実装
5. 影響を受ける `SKILL.md` の更新
6. `SKILL.index.json` の再構築
7. `verification.md` の完了
8. アーカイブゲートを通過した後にアーカイブ

## 6. verify と archive の関係

### `ospec verify`

現在は事前チェック（プレチェック）のような役割で、主に以下を確認します：

- `proposal.md / tasks.md / verification.md` が存在するか
- 有効化されたオプションステップ（activated optional steps）がドキュメントでカバーされているか
- チェックリストに未チェック項目が残っていないか
- `state.json` の現在の状態が妥当か

### `ospec archive`

現在は真のアーカイブゲートであり、より厳格な要件が求められます：

- `state.json.status == ready_to_archive` であること
- `verification_passed` であること
- `skill_updated` であること
- `index_regenerated` であること
- 有効化されたオプションステップが `passed_optional_steps` に入っていること
- `tasks.md` と `verification.md` に未チェック項目がないこと

### `ospec finalize`

現在は引き続き標準的な公式の締めくくりエントリであり、以下を一連の流れとして実行します：

- verify
- index refresh（インデックス更新）
- archive

## 7. 初期化と AI によるフォローアップ補充

ユーザーが AI プロンプトを通じて「OSpec を使用してプロジェクトを初期化する」と伝えた場合、現在の推奨動作は以下の通りです：

1. 直接初期化フローに入る
2. すでにプロジェクト説明ドキュメントがある場合は、それを直接再利用する
3. 十分なコンテキストが不足している場合、プロジェクトの概要や技術スタックについて1回だけ追問する
4. ユーザーが補充しない場合でも、初期化を継続し、補充が必要な占位ドキュメントを生成する
5. 初期化完了後、リポジトリは直接 `ospec new` が可能な状態になる必要がある

ユーザーがターミナルで直接 `ospec init` を実行した場合：

- 対話形式の追問は行わない
- 直接、占位プロジェクトドキュメントを配置する
- 結果が引き続き `change-ready` であることを保証する

## 8. 今回の削除項目

### 8.1 ダッシュボード（Dashboard）

ダッシュボード関連のコードとコマンドは削除されました。

現在のリポジトリには以下は保持されません：

- ダッシュボードのコマンドエントリ
- ダッシュボードのサーバーコード
- ダッシュボードの静的フロントエンドアセット
- ダッシュボード関連のヘルプ文言

### 8.2 `basic / full` 構造レベル

構造判断は `none` のみを保持します。

今後フローを議論する際、以下は使用されません：

- このリポジトリは現在 `basic` である
- このリポジトリは現在 `full` である

以下のような議論に統一されます：

- 初期化されているか
- 「変更準備完了（change-ready）」になっているか
- 知識レイヤーが完全か
- 変更（change）が実行中か
- アーカイブ可能か
