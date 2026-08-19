---
name: project-ai-guide
title: AI ガイド
tags: [ai, guide, ospec]
---

# AI ガイド

## この文書について

OSpec 母仕様からコピーされた、プロジェクト採用済み AI ルールへの入口です。母リポジトリの規則を即興で当てはめるのではなく、まず `for-ai/` 配下のプロジェクト採用ルールに従ってください。母仕様と異なる場合はプロジェクト採用ルールが優先します。この文書はルーターです。ここで名前を挙げるルールはすべて、あなたの profile のプロトコル文書に完全な形で書かれており、この文書があなたの経路で禁じられている文書を開かせることはありません。

## どれを読むか

- **classic change**（`workflow_profile_id: change`、`ospec change` / `ospec-change`）：`for-ai/change-protocol.md` を読みます。それが全フローです——`proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`——複雑さ、flags、ファイル数、risk、batch size に関係なく変わりません。`ospec execute …` コントローラ層は読まず・実行しません。
- **Goal**（`workflow_profile_id: goal`、`ospec goal` / `ospec-goal`、および `ospec execute …` / `ospec loop …` の作業）：運用ルールは `ospec-goal` スキルが持ちます——session brief、design と plan、task graph、dispatch、launch、review、evidence、closeout と archive gate。`for-ai/execution-protocol.md` はその背後にある正典の詳細です。名指しの状況がその詳細を必要とするときに開くのであって、この層に入る手順として開くのではありません。
- **プロジェクト規約**（既定で全読せず、必要になったときだけ開く）：`for-ai/naming-conventions.md`、`for-ai/skill-conventions.md`、`for-ai/workflow-conventions.md`、`for-ai/development-guide.md`。

## 作業順序

1. `.skillrc` を読み、レイアウト、文書言語、workflow ポリシー、model profiles を把握する。
2. `ospec index query <キーワード...>` で引く。`SKILL.index.json` 全体は決して読まない——change の archive とともに際限なく増えるため。
3. 現在の session brief、bootstrap、dispatch、review、repair packet を読み、その packet が名指しした change artifact、対象ファイル、索引済み文書だけを開く。
4. 現在の profile のスキルに従う。上に挙げたプロトコル文書は、名指しの状況がルールの背後の詳細を必要とするときにだけ開く。

作成するすべての change ドキュメントと brainstorm は、プロジェクトのドキュメント言語（`.skillrc` の `documentLanguage`）で書きます。製品コピー、サイトのロケール、「English-first」という要求から推測してはいけません。1 つの change 内で言語を混在させません。

どの profile にも必要な 2 つの契約（decision gate の ladder と強制 archive）は、あなたの経路がもともと読む文書の中に完全な形で書かれています。そこだけを読み、他所を探さないでください。classic change は `for-ai/change-protocol.md`、goal は `for-ai/execution-protocol.md` です。強制 archive は常にユーザーの明示的な承諾が必要で、自動的に行われることはありません。
