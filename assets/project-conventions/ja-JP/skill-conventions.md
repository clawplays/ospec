---
name: project-skill-conventions
title: SKILL 規約
tags: [conventions, skill, ospec]
---

# SKILL 規約

## 目的

このファイルはレイヤー化された `SKILL.md` の責務境界を固定し、AI が index を使って正しい知識文書へ一貫して到達できるようにします。

## レイヤー構造

- ルート `SKILL.md`: プロジェクト入口マップ
- `docs/SKILL.md`: docs ハブ
- `src/SKILL.md`: ソースマップ
- `src/core/SKILL.md`: コア基盤レイヤー
- `src/modules/<module>/SKILL.md`: モジュール知識単位
- `tests/SKILL.md`: テスト戦略と入口

## 作成ルール

- `SKILL.md` は将来計画ではなく現在の事実を記述する
- モジュール `SKILL.md` は責務、構造、API、依存関係、テスト期待を扱う
- API や境界が変わったら関連する `SKILL.md` を更新する
- 新しいモジュールを作成したら、その `SKILL.md` を追加する

## index との関係

- `SKILL.index.json` は発見用であり、`SKILL.md` の代替ではない
- `SKILL.md` 更新後は index を再生成する
- AI はまず index を読み、その後に対象 `SKILL.md` を読む
