---
name: project-workflow-conventions
title: ワークフロー実行規約
tags: [conventions, workflow, change, ospec]
---

# ワークフロー実行規約

## 目的

この文書はプロジェクト内の OSpec 実行フローを固定し、要件が planning、implementation、verification、archive を一貫した gate で通過できるようにします。

## 標準順序

1. プロジェクト文脈と影響範囲を確認する
2. `proposal.md` を作成または更新する
3. `tasks.md` を作成または更新する
4. `state.json` に従って実装を進める
5. 関連する `SKILL.md` を更新する
6. `SKILL.index.json` を再生成する
7. `verification.md` を完了させる
8. すべての gate 通過後にだけ archive する

## 状態制約

- 実行状態の正は `state.json` とする
- `verification.md` は `state.json` の代わりにならない
- 状態ファイルと実行ファイルが矛盾する場合は、まず状態を直す

## 文書言語

- `proposal.md`、`tasks.md`、`verification.md`、`review.md` はプロジェクト採用文書言語で維持する
- 製品 UI 言語と OSpec change 文書言語は異なってよく、片方からもう片方を推測しない
- change が中国語で作成されている場合は、プロジェクトルールが明示的に英語切り替えを要求しない限り中国語で継続する

## optional steps

- optional step の有効化は `.skillrc.workflow` で管理する
- proposal flags は workflow 設定と整合していなければならない
- 有効化された optional step は `tasks.md` と `verification.md` に必ず出す

## Plugin Gates

- プラグイン機能は `.skillrc.plugins` で管理する
- Stitch / Checkpoint のインストール、provider 切り替え、doctor 修復、MCP、認証設定、またはプラグイン有効化に関わる場合は、まずプロジェクト採用文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む
- その言語の仕様書が存在しない場合のみ、別言語の仕様書へフォールバックする
