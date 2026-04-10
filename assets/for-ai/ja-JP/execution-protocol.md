---
name: project-execution-protocol
title: 実行プロトコル
tags: [ai, protocol, ospec]
---

# AI 実行プロトコル

## プロジェクトに入るたびに最初に読むもの

1. `.skillrc`
2. `SKILL.index.json`
3. `docs/project/naming-conventions.md`
4. `docs/project/skill-conventions.md`
5. `docs/project/workflow-conventions.md`
6. 現在の change ファイル: `proposal.md / tasks.md / state.json / verification.md`
7. `stitch_design_review` がある場合は `artifacts/stitch/approval.json`
8. Stitch / Checkpoint の provider、MCP、認証、インストール、または有効化設定を変更する必要がある場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須ルール

- `proposal.md`、`tasks.md`、`verification.md`、`review.md` はプロジェクト採用の文書言語で維持する
- 製品 UI やサイト locale が英語中心でも、それだけを理由に change 文書を英語へ書き換えない
- 現在の change 文書が既に中国語なら、プロジェクトルールが明示的に英語切り替えを要求しない限り中国語のまま続ける
- proposal/tasks を飛ばして実装へ直行しない
- 実行状態の正は `state.json` とする
- 有効化された optional step は `tasks.md` と `verification.md` に出現していなければならない
- `stitch_design_review` が有効で `approval.json.preview_url` または `submitted_at` が空なら、まず `ospec plugins run stitch <change-path>` を実行して preview を提出する
- Stitch のデザインレビューでは、ルートごとに canonical layout を 1 つだけ維持する。非 canonical 画面は `archive / old / exploration` として明示する
- `light/dark` の theme 変体では canonical layout を維持し、モジュール再配置、セクション再編、CTA 移動、ナビ構造変更をしない
- 対応ページが既にある場合は `edit existing screen` または `duplicate existing canonical screen and derive a theme variant` を優先する
- Stitch 成果物は route、canonical dark/light screen id、派生関係、archived screen id を含む `screen mapping` を必ず出力する
- 古い画面、探索画面、置き換え済み画面を canonical 画面の横に main page として残さない
- `.skillrc.plugins.stitch.project.project_id` が存在する場合は、その Stitch project を再利用し、この change 用に別 project を作成しない
- canonical Stitch project がまだ空なら、最初に成功した Stitch 提出が canonical project になる
- Stitch 実行前は、既定では設定済み provider が使われるとみなす。`.skillrc.plugins.stitch.runner` が明示的に上書きされている場合のみ custom runner を使う
- custom runner で `token_env` を使う場合は、対応する環境変数が設定済みか確認する
- ローカル Stitch bridge、Gemini CLI、Codex CLI、stitch MCP、認証準備が不明なら、まず `ospec plugins doctor stitch <project-path>` を実行する
- `plugins doctor stitch` が provider、MCP、認証の問題を示した場合は、まずプロジェクト文書言語に一致するリポジトリ内のローカライズ済み Stitch 仕様に戻る。その仕様外の代替設定を作らない
- 内蔵 `codex` provider が read-only 呼び出しは完了できるのに `create_project`、`generate_screen`、`edit_screens` が止まる場合は、`codex exec --dangerously-bypass-approvals-and-sandbox` が使われているか確認する
- プロジェクトが `.skillrc.plugins.stitch.runner` を明示的に上書きしつつ Codex で Stitch 書き込みを行う場合は、custom runner / wrapper でも `--dangerously-bypass-approvals-and-sandbox` を渡す
- `stitch_design_review` が有効で `approval.json.status != approved` の間は、その change を継続実装、完了、archive 可能と扱わない
- canonical 選定、theme pairing、screen mapping、重複整理が欠けている場合は、デザインレビュー通過とみなさない
- `SKILL.md` と index がずれている状態を完了扱いしない
