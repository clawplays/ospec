---
name: project-ai-guide
title: AI ガイド
tags: [ai, guide, ospec]
---

# AI ガイド

## 目的

この文書は OSpec 母仕様からコピーされた、プロジェクト採用済みの AI ガイドです。AI は母リポジトリの規則を即興で当てはめるのではなく、まずこのプロジェクト採用ルールに従う必要があります。

## 作業順序

1. `.skillrc` を読む
2. `SKILL.index.json` を読む
3. `docs/project/` 配下のプロジェクト採用ルールを読む
4. 関連する `SKILL.md` を読む
5. 現在の change 実行ファイルを読む
6. Stitch が有効で、現在の change が `stitch_design_review` を有効化している場合は、先に `artifacts/stitch/approval.json` を確認する
7. Stitch / Checkpoint のインストール、provider 切り替え、doctor 修復、MCP 設定、認証設定、またはプラグイン有効化が必要な場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須動作

- `proposal.md`、`tasks.md`、`verification.md`、`review.md` はプロジェクト採用の文書言語で維持する
- 製品 UI、サイト locale、または「英語優先」という要件だけから change 文書言語を推測しない
- プロジェクト採用プロトコルが中国語、または現在の change 文書がすでに中国語なら、明示的なルール変更がない限り change 文書は中国語のまま維持する
- 目的の文書を読む前に、まず index を使って知識の所在を確認する
- 実装作業前にプロジェクト採用ルールを読む
- `stitch_design_review` が有効で `approval.json.preview_url` または `submitted_at` が空なら、まず `ospec plugins run stitch <change-path>` を実行して preview を生成し、その URL をユーザーに送る
- `.skillrc.plugins.stitch.project.project_id` が既に設定されている場合は、その Stitch project を再利用し、新しい project を作成しない
- `.skillrc.plugins.stitch.project.project_id` が空なら、最初に成功した Stitch 実行を canonical project として以後も再利用する
- `stitch_design_review` が有効で `approval.json.status != approved` の間は、デザインレビューゲートで停止する
- Stitch のページレビューでは、各業務ルートにつき canonical layout を 1 つだけ維持する
- `light/dark` を作る場合は同じ canonical screen から派生し、モジュール順、情報設計、CTA の位置、構成を変えない
- 対応するページが既にある場合は `edit existing screen` または `duplicate existing canonical screen and derive a theme variant` を優先する
- すべての Stitch 成果物には、route、canonical dark/light screen id、派生関係、archived screen id を含む `screen mapping` が必要
- 古い画面、探索案、置き換え済み画面は canonical 画面と並列の main page として残さず、archive または rename する
- canonical 選定、theme pairing、screen mapping、重複整理が欠けている場合は、レビュー完了とみなさない
- `ospec plugins run stitch <change-path>` は既定で設定済み provider adapter を使う。`.skillrc.plugins.stitch.runner` を明示的に上書きしている場合のみ custom runner を使う
- custom runner で `token_env` を使う場合は、対応する環境変数が設定済みかを確認する
- runner、Gemini CLI、Codex CLI、stitch MCP、認証準備が不明な場合は、まず `ospec plugins doctor stitch <project-path>` を実行する
- `plugins doctor stitch` が選択 provider のチェックで PASS 以外を返したら、必要な CLI の導入と stitch MCP / API token 設定をユーザーに依頼する
- Stitch のインストール、provider 切り替え、doctor 修復、MCP 設定、認証設定では、まずプロジェクト文書言語に一致するリポジトリ内のローカライズ済み Stitch 仕様を読む。Gemini / Codex の設定形をそのまま使い、回避目的の別設定を即興で作らない
- 内蔵 `codex` provider が read-only 呼び出しでは成功するのに `create_project`、`generate_screen`、`edit_screens` が止まる場合は、`codex exec --dangerously-bypass-approvals-and-sandbox` が実際に使われているか確認する
- プロジェクトが `.skillrc.plugins.stitch.runner` を明示的に上書きし、それでも Codex が Stitch 書き込みを担当する場合は、その custom runner / wrapper でも `--dangerously-bypass-approvals-and-sandbox` を渡す
- 重要なコード変更後は `SKILL.md` を同期する
- 必要に応じて `SKILL.index.json` を再生成する

## プロジェクト採用ルール優先

- 命名規約: `docs/project/naming-conventions.md`
- SKILL 規約: `docs/project/skill-conventions.md`
- ワークフロー規約: `docs/project/workflow-conventions.md`
- 開発ガイド: `docs/project/development-guide.md`
