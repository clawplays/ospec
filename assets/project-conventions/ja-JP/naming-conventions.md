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

## 固定プロトコルファイル

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`
