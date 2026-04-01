# 使い方

## 一般的なコマンド

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins status [path]
ospec plugins enable stitch [path]
```

## 推奨されるフロー

新規ディレクトリの場合：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

推奨されるユーザー向けシーケンス：

- リポジトリを初期化する
- 1つの変更（change）で1つの要件を実行する
- プロジェクト固有のフローでデプロイと検証を行い、その後 `ospec verify` を実行する
- 検証済みの変更を `ospec finalize` でアーカイブする

`ospec init` は、リポジトリを `change-ready`（変更準備完了）状態にすることを目指しています：

- プロトコルシェルの作成
- ベースラインのプロジェクト知識ドキュメントの生成
- 利用可能な場合は既存のプロジェクトドキュメントを再利用
- 文脈が不足している場合、AI支援フローでプロジェクトの概要や技術スタックについて1つの簡潔なフォローアップを質問
- それでも文脈が不足している場合は、プレースホルダードキュメントにフォールバック
- 最初の変更を自動的に作成しない
- ビジネススキャフォールドを自動的に適用しない

初期化中にプロジェクトのコンテキストを渡したい場合は、直接実行できます：

```bash
ospec init [path] --summary "内部管理ポータル" --tech-stack node,react,postgres
ospec init [path] --architecture "APIと共有認証を備えたシングルウェブアプリ" --document-language ja-JP
```

直接的なCLI初期化は非対話型のままです。リポジトリに使用可能なプロジェクト説明がなく、フラグも渡さない場合でも、OSpecはプレースホルダードキュメントを生成し、`ospec new` の準備が整った状態にします。

トラブルシューティングのために明示的なプロジェクトスナップショットが必要な場合は、`ospec status [path]` が引き続き利用可能ですが、推奨フローのデフォルトの最初のステップではなくなりました。

## プロジェクト知識の維持

リポジトリがすでに初期化されており、プロジェクト知識ドキュメントを更新、修復、またはバックフィルしたい場合は、`docs generate` を使用します：

```bash
ospec docs generate [path]
```

ユースケース：

- 古いリポジトリが新しい `change-ready` 初期化フローの前に初期化されていた
- プロジェクトドキュメントが削除されたか、内容が古くなった
- 新しいモジュールやAPIを追加し、知識レイヤーを更新したい

`docs generate` は以下の動作をします：

- プロジェクト知識ドキュメントを更新
- スキャフォールドを明示的な状態に保つ
- 最初の変更を自動的に作成しない
- `docs/project/bootstrap-summary.md` を作成しない

## キューフロー

複数の変更をキューとして明示的に管理したい場合：

```bash
ospec queue add <change-name> [path]
ospec queue status [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
```

キューモードは明示的なままです：

- デフォルトのワークフローは引き続き1つのアクティブな変更です
- キューモードは、`queue` または `run` を明示的に使用した場合にのみ開始されます
- `manual-safe` は実行をマニュアルに保ち、キューの追跡または進行のみを明示的に行います
- `archive-chain` は、明示的な `run step` でのみ確定し、進行します

## 既存プロジェクトのアップグレード

すでに初期化されているプロジェクトの場合：

```bash
npm install -g @clawplays/ospec-cli@0.3.0
ospec update [path]
```

このリポジトリからローカルにインストールした場合：

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` は以下のことを行います：

- プロトコルドキュメントの更新
- プロジェクトツールとGitフックの更新
- 管理されている `ospec` および `ospec-change` スキルの同期
- すでに有効になっているプラグインの管理されたワークスペースアセットの更新

`ospec update [path]` は以下のことは行いません：

- プラグインを自動的に有効化または無効化しない
- 既存のアクティブな変更を新しいプラグインワークフローに自動的に移行しない
- Stitchの承認を完了させたり、プラグインのレビュー成果物を自動的に作成したりしない

古いプロジェクトでまだプロジェクト知識ドキュメントが不足している場合は、以下を再実行してください：

```bash
ospec init [path]
```

または、ドキュメントのメンテナンスのみを行いたい場合は：

```bash
ospec docs generate [path]
```

## 進捗とクローズアウト

実行中の主なコマンドは以下の通りです：

```bash
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

`ospec finalize` は標準的なクローズアウトパスです。変更を検証し、インデックスを更新し、変更をアーカイブします。Gitのコミットは、別の手動ステップとして残されます。
