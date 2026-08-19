---
name: project-naming-conventions
title: プロジェクト命名規約
tags: [conventions, naming, ospec]
---

# 命名規約

## 目的

このファイルは OSpec 母仕様をプロジェクト内に取り込んだものです。AI と人間が場当たり的な命名を発明しないよう、プロジェクト内の命名規則を固定します。

## 基本ルール

- ディレクトリ、モジュール、change 名は小文字の kebab-case を使う
- flags と optional steps は小文字の snake_case を使う
- ワークフロープロトコルファイルは固定ファイル名を保つ
- API 文書は意味のある kebab-case 名を使う

## change 名

- `changes/active/<change-name>/` を使う
- 例: `add-token-refresh`
- 日付、空白、大文字、意味の薄いラベルは避ける

## モジュール名

- モジュールディレクトリは意味のある英語名を使う
- 例: `src/modules/auth`, `src/modules/content`
- 各モジュールはルートに `SKILL.md` を置く

## 文書名

- プロジェクト文書は `docs/project/`
- 設計文書は `docs/design/`
- 計画文書は `docs/planning/`
- API 文書は `docs/api/`
- 活きた機能文書は `docs/features/`

## 機能 slug の命名

- 機能 slug は小文字 kebab-case で、`^[a-z0-9]+(-[a-z0-9]+)*$` に一致します
- slug はプロジェクト全体で一意です。重複すると `ospec index build` が失敗し、両方の場所を示します
- slug はインラインで宣言します。`docs/features/<領域>.md` の `##` 見出し直下、最初の非空行に `<!-- ospec:feature <slug> code:src/a/,src/b/ -->` を置きます
- change ではなく振る舞いに名前を付けます。`fix-login-bug-2026` ではなく `login-timeout` です
- 宣言のないセクションは単に機能ではなく、それは許容されます

## 固定プロトコルファイル

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

## 実行要件

- 新しいディレクトリ、モジュール、change、ワークフロー flag を追加する前にこのファイルを確認する
- 実装がこのファイルから逸脱した場合は、まずコードと文書を整合させる

