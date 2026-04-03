---
name: project-development-guide
title: プロジェクト開発ガイド
tags: [conventions, development, ospec]
---

# プロジェクト開発ガイド

## 目的

このファイルは、プロジェクト計画、知識レイヤー、実行レイヤー、AI 協業ルールをつなぐ、プロジェクト採用済みの開発ガイドです。

## ベースライン

- 長期的なプロジェクト知識は `docs/project/` に置く
- 現在の事実はレイヤー化された `SKILL.md` に置く
- change 実行は `changes/active/<change>/` に置く
- AI 実行の入口は `for-ai/` に置く

## 推奨フロー

1. プロジェクト採用規約を確認する
2. プロジェクト知識レイヤーと関連 `SKILL.md` を読む
3. active change に入る
4. 実装後に文書と index を同期する

## 避けること

- AI にその場で命名規則を発明させない
- 長期作業で `changes/` を迂回しない
- 知識レイヤーを更新せずにコードだけ変えない
