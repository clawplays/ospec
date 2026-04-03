# プロジェクトの概要

## OSpecとは

OSpecは、AI支援開発のためのドキュメント駆動型のワークフローです。まずドキュメントで要件と変更を定義し、その後AIとのコラボレーションを通じて実装、検証、およびアーカイブを推進するのに役立ちます。

ドキュメントを要件と変更の「信頼できる唯一の情報源（Source of Truth）」として扱います。初期化時にまずコラボレーションルールとベースラインのプロジェクト知識をセットアップし、その後、明示的な変更コンテナ（change containers）を通じてAIが実装を推進できるようにします。

## コア原則

- `ospec init` は、中途半端なブートストラップ状態ではなく、リポジトリを「変更準備完了（change-ready）」状態にする必要があります。
- AI支援による初期化では、リポジトリのコンテキストが不足している場合、プロジェクトの概要や技術スタックについて、1つの簡潔なフォローアップを質問できます。
- 通常のCLI初期化は非対話型のままで、コンテキストが利用できない場合はプレースホルダーのプロジェクトドキュメントにフォールバックします。
- `ospec docs generate` は、プロジェクト知識ドキュメントの更新、修復、またはバックフィルのための、後続のメンテナンスコマンドです。
- 最初の変更（change）は依然として明示的です。初期化によって実行タスクが自動的に作成されることはありません。
- 推奨されるユーザー向けフローは `init -> execute -> deploy/validate -> archive` です。
- キューの実行は明示的なままです。ユーザーが実際に複数の変更のオーケストレーションを望む場合にのみ使用してください。

## 主なユースケース

- 一貫したAIの動作を求めるリポジトリ
- 変更の実行を可視化し、レビュー可能にしたいチーム
- Web、CLI、Unity、Godot、バックエンド、またはプロトコル専用のリポジトリになる可能性のあるプロジェクト
- CodexとClaude Codeの両方で同じワークフローを必要とする環境

## OSpec の比較

[Spec Kit](https://github.github.com/spec-kit/) と比べると、Spec Kit は実行可能な仕様、より厚い計画フェーズ、多段の精緻化を重視します。OSpec はより薄い change コンテナと短いデフォルトフローで配達とアーカイブまで進めます。

[Kiro](https://kiro.dev/docs/specs/) と比べると、Kiro は specs、steering、hooks、MCP、powers を含む、より広いプラットフォームです。OSpec は既存のアシスタントと併用しやすい repo-native な workflow レイヤーに集中しています。

[OpenSpec](https://github.com/Fission-AI/OpenSpec) と比べると、OpenSpec は `/opsx` コマンド、proposal/specs/design/tasks の成果物、幅広いツール統合を含む artifact-guided workflow を採用しています。OSpec はデフォルトワークフローをより小さく保ち、1 つの明示的な active change と標準的な `verify -> finalize` のクローズアウトに重心を置いています。

## 現在の機能

- 「変更準備完了（change-ready）」の初期化
- プロジェクト知識の維持
- アクティブな変更のワークフロー管理
- 標準的な `finalize -> archive -> commit-ready`（コミット準備完了）のクローズアウトフロー
- 集約された `PASS / WARN / FAIL` の変更ステータス
- アクティブな変更に対するGitフックの適用
- CodexおよびClaude Codeのスキルのインストールと同期

## コマンドモデル

新規ディレクトリの場合、通常の順序は以下の通りです：

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

後でドキュメントのメンテナンスのみが必要な場合は、以下を使用します：

```bash
ospec docs generate [path]
```

デフォルトのデリバリーフローではなく、トラブルシューティング用のスナップショットが必要な場合は、別途 `ospec status [path]` を使用してください。
