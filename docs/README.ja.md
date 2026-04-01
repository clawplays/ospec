<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec.ai</a></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads&cacheSeconds=300" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">中文</a> |
  <strong>日本語</strong> |
  <a href="README.ar.md">العربية</a>
</p>

OSpec は AI 対話コラボレーション向けのドキュメント駆動開発ワークフローです。最初にドキュメントで要件と変更を明確にし、その後 AI との協調で実装、検証、アーカイブを進めます。

<p align="center">
  <a href="README.md">ドキュメント</a> |
  <a href="prompt-guide.ja.md">プロンプトガイド</a> |
  <a href="usage.ja.md">使い方</a> |
  <a href="project-overview.ja.md">概要</a> |
  <a href="installation.ja.md">インストール</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## npm でインストール

```bash
npm install -g @clawplays/ospec-cli
```

## 推奨プロンプト

OSpec の利用は、ほとんどの場合この 3 ステップで十分です。

1. プロジェクトディレクトリで OSpec を初期化する
2. 要件、ドキュメント更新、バグ修正のための change を作成して進める
3. 受け入れ完了後にその change をアーカイブする

### 1. プロジェクトディレクトリで初期化する

推奨プロンプト:

```text
OSpec を使ってこのプロジェクトを初期化してください。
```

Claude / Codex skill:

```text
$ospec を使ってこのプロジェクトを初期化してください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language ja-JP
```

メモ:

- `--summary`: 生成ドキュメントに書き込むプロジェクト概要
- `--tech-stack`: `node,react,postgres` のようなカンマ区切りの技術スタック
- `--architecture`: 短いアーキテクチャ説明
- `--document-language`: 生成ドキュメントの言語。通常は `en-US`、`zh-CN`、`ja-JP`
- 値を渡した場合はその内容を使ってドキュメントを生成します
- 値を渡さない場合は既存ドキュメントを優先利用し、無ければ補完用のプレースホルダを生成します

</details>

### 2. Change を作成して進める

要件実装、ドキュメント更新、リファクタ、バグ修正はこの流れを使います。

推奨プロンプト:

```text
OSpec を使ってこの要件の change を作成して進めてください。
```

Claude / Codex skill:

```text
$ospec-change を使ってこの要件の change を作成して進めてください。
```

![OSpec Change slash command example](assets/ospecchange-slash-command.ja.svg)

<details>
<summary>コマンドライン</summary>

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

</details>

### 3. 受け入れ完了後にアーカイブする

デプロイ、テスト、QA、またはその他の受け入れ確認が終わった後に、確認済みの change をアーカイブします。

推奨プロンプト:

```text
OSpec を使って承認済みの change をアーカイブしてください。
```

Claude / Codex skill:

```text
$ospec を使って承認済みの change をアーカイブしてください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

メモ:

- 先にプロジェクト固有のデプロイ、テスト、QA を実行します
- `ospec verify` で change がアーカイブ可能か確認します
- `ospec finalize` でインデックスを再構築し、change をアーカイブします

</details>

## OSpec の動作イメージ

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                               │
│     "Use OSpec to create and advance a change for this task."  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INIT TO CHANGE-READY                                       │
│     ospec init                                                 │
│     - .skillrc                                                 │
│     - .ospec/                                                  │
│     - changes/active + changes/archived                        │
│     - root SKILL files and for-ai guidance                     │
│     - docs/project/* baseline knowledge docs                   │
│     - reuse docs or fall back to placeholders                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EXECUTION                                                  │
│     ospec new <change-name>                                    │
│     ospec progress                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DEPLOY + VALIDATE                                          │
│     project deploy / test / QA                                 │
│     ospec verify                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ARCHIVE                                                    │
│     ospec finalize                                             │
│     rebuild index + archive                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 3 つの主要概念

| 概念 | 説明 |
|------|------|
| **Protocol Shell** | `.skillrc`、`.ospec/`、`changes/`、ルートの `SKILL.md`、`SKILL.index.json`、`for-ai/` を含む最小の協調骨格 |
| **Project Knowledge Layer** | `docs/project/*`、レイヤード skill ファイル、index 状態など AI が継続的に参照するコンテキスト |
| **Active Change** | 1 つの要件専用の実行コンテナ。通常 `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` を持つ |

## 主な機能

- **change-ready 初期化**: `ospec init` が protocol shell と基礎ドキュメントを一度に生成
- **ガイド付き初期化**: AI 支援時は不足している概要や技術スタックを 1 回だけ確認可能
- **ドキュメント保守**: `ospec docs generate` で後から知識レイヤを更新・修復
- **change 実行の追跡**: proposal、tasks、state、verification、review を継続的に揃える
- **キュー支援**: `queue` と `run` で複数 change の明示的な実行を管理
- **プラグインゲート**: Stitch のデザインレビューと Checkpoint の自動化チェックをサポート
- **標準クローズアウト**: `finalize` が検証、インデックス再構築、アーカイブを行う

## プラグイン機能

OSpec には、文書駆動ワークフローに UI レビューとフロー検証を追加する 2 つのオプションプラグインがあります。

### Stitch

Stitch はページデザインレビューとプレビュー共有に使います。ランディングページや UI 変更が多い change に向いています。

AI 対話:

```text
OSpec を使って Stitch プラグインを有効にしてください。
```

Claude / Codex skill:

```text
$ospec を使って Stitch プラグインを有効にしてください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec plugins enable stitch .
```

</details>

### Checkpoint

Checkpoint は画面フロー検証と自動チェックに使います。重要フローや受け入れ前のランタイム検証に向いています。

AI 対話:

```text
OSpec を使って Checkpoint プラグインを有効にしてください。
```

Claude / Codex skill:

```text
$ospec を使って Checkpoint プラグインを有効にしてください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
```

メモ:

- `--base-url` は自動チェック対象となる起動中アプリの URL を指定します

</details>

## ドキュメント

### コアドキュメント

- [Docs Index](README.md)
- [Prompt Guide](prompt-guide.ja.md)
- [Usage](usage.ja.md)
- [Project Overview](project-overview.ja.md)
- [Installation](installation.ja.md)
- [Skills Installation](skills-installation.ja.md)

### プラグイン仕様

- [Stitch Plugin Spec](stitch-plugin-spec.ja.md)
- [Checkpoint Plugin Spec](checkpoint-plugin-spec.ja.md)

## リポジトリ構成

```text
dist/                       コンパイル済み CLI ランタイム
assets/                     管理対象プロトコル資産、hooks、skill payload
docs/                       公開ドキュメント
scripts/                    リリースとインストール補助スクリプト
.ospec/templates/hooks/     パッケージ同梱の Git hook テンプレート
```

## License

This project is licensed under the [MIT License](../LICENSE).
