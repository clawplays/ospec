# プロンプトガイド

## 原則

OSpec へのプロンプトは、長い内部チェックリストではなく、短く意図を伝える形が基本です。

点検、初期化、知識レイヤの保守、change の進行ルールは、OSpec 側で内部的に展開される前提です。

## 推奨プロンプト

日常的な利用は、次の 3 つに分けて考えると分かりやすくなります。

1. プロジェクトを初期化する
2. 要件、ドキュメント更新、バグ修正のための change を作成して進める
3. 受け入れ完了後にその change をアーカイブする

### 1. プロジェクトを初期化する

推奨プロンプト:

```text
OSpec を使ってこのプロジェクトを初期化してください。
```

Claude / Codex skill:

```text
$ospec を使ってこのプロジェクトを初期化してください。
```

等価なコマンドライン:

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language ja-JP
```

意味:

- `ospec init` はリポジトリを change-ready の状態まで進めます
- AI 支援が有効で、かつプロジェクト文脈が不足している場合は、概要や技術スタックを 1 回だけ確認できます
- 追加情報がなくても初期化は継続され、補完用のプレースホルダ文書が生成されます

### 2. Change を作成して進める

推奨プロンプト:

```text
OSpec を使ってこの要件の change を作成して進めてください。
```

Claude / Codex skill:

```text
$ospec-change を使ってこの要件の change を作成して進めてください。
```

等価なコマンドライン:

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

### 3. 受け入れ完了後にアーカイブする

推奨プロンプト:

```text
OSpec を使って承認済みの change をアーカイブしてください。
```

Claude / Codex skill:

```text
$ospec を使って承認済みの change をアーカイブしてください。
```

等価なコマンドライン:

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

意味:

- 先にプロジェクト固有のデプロイ、テスト、QA、または受け入れフローを完了します
- 次に `ospec verify` で change がアーカイブ可能な状態か確認します
- 最後に `ospec finalize` でインデックスを再構築し、承認済みの change をアーカイブします

## 境界

通常、毎回のプロンプトで次の内容を繰り返す必要はありません。

- init 時の内部ファイルチェックリスト
- protocol shell の確認手順
- 「毎回 Web テンプレートを作らないこと」のような注意書き
- 「デフォルトで queue モードを始めないこと」のような注意書き

これらは OSpec CLI とインストール済み skill の既定ルールとして処理されるべきです。
