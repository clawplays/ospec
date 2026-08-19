---
name: project-workflow-conventions
title: ワークフロー実行規約
tags: [conventions, workflow, change, ospec]
---

# ワークフロー実行規約

この文書はプロジェクト内の OSpec 実行フローを固定し、要件が planning、implementation、verification、archive を一貫した gate で通過できるようにします。ここに書くのはプロジェクト規約だけです。`ospec execute ...` のコマンド一覧、フラグ、各サブコマンドが書き出す成果物は再掲しません。必要なときは `ospec help execute` または `ospec help <subcommand>` を実行します。`for-ai/execution-protocol.md` は、名指しの goal controller の状況がルールの背後の詳細を必要とするときに読むのであって、この層に入る手順として読むのではありません。

## Workflow Profiles

- `workflow_profile_id: change` は小さな通常変更の高速フロー: `proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`
- `workflow_profile_id: goal` は複雑な作業の full flow: `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、document review、worker/reviewer handoff、final review、worker status、evidence gates を追加する
- classic changes には `ospec change` / `ospec-change` を使い、goals には `ospec goal` / `ospec-goal` を使う。`ospec new` は `ospec change` の互換エイリアスにすぎない

## 標準順序

1. プロジェクト文脈と影響範囲を確認する
2. `proposal.md` を作成または更新する
3. classic change では `proposal.md` から直接 `tasks.md` を作成または更新する
4. goal では `design.md` を作成または更新する
5. goal では `implementation-plan.md` を作成または更新する
6. goal では `artifacts/agents/task-graph.json` を作成または更新する
7. `tasks.md` を作成または更新する
8. `state.json` に従って実装を進める
9. goal では document、task-level、final review gates を完了する
10. goal では `artifacts/agents/worker-status.md` を更新する
11. 関連する `SKILL.md` を更新する
12. `SKILL.index.json` を再生成する
13. `verification.md` を完了させる
14. 現在の workflow profile の gate 通過後にだけ archive する

各成果物は 1 つ上の成果物から導き、上流を先に直します。`tasks.md` が既にあり上流文書がテンプレートのままなら、先に上流文書を更新してから tasks を整合させます。classic change では、ユーザーが明示的に goal へ昇格させない限り `design.md`、`implementation-plan.md`、task graph、worker packets、goal review artifacts を作成しません。task graph の必須フィールド、`serial_reason` / `maxParallelReason` / `scope_reason`、optional allowlist の規則は `for-ai/execution-protocol.md` にだけ定義します。

- `Announce-Before-Act`: ワークフローを黙って実行しない。OSpec skill・段階、コマンドと生成物、blocking gate を伝える。goal controller 層では選択された runtime adapter、worker 数、実際の機構も併せて伝える
- `Brainstorm-First`: goal の設計を確定する前に、方向・アーキテクチャ・API・データ・UI・リスク・スコープの未決事項を出し、黙った仮定より durable な decision gate を優先する。decision gate の完全な契約は、その profile が元々読む文書に書いてある。classic change は `for-ai/change-protocol.md`、goal は `for-ai/execution-protocol.md` を読む。この契約はどの harness でも拘束力を持つ。Claude 専用で任意導入の session hook は実行時に再注入するだけで、契約の出所ではない

## 状態制約

- 実行状態の正は `state.json` とし、`verification.md` は代わりにならない。状態ファイルと実行ファイルが矛盾する場合はまず状態を直す
- goal では `artifacts/agents/task-graph.json` が機械可読な task 状態、依存関係、競合、対象ファイル、検証コマンドを保持し、`artifacts/agents/worker-status.md` が implementer、spec reviewer、quality reviewer、controller の状態を保持する。どちらかを手動編集した後は `ospec execute sync` で再構築する
- 進捗チェックリストは実態を反映する: proposal.md の受け入れ基準は検証エビデンス通過時にチェックし（`[verify:<id>]` 付き項目は sync が自動チェック）、未チェック項目は archive をブロックする。Goal の review.md は sync が final review から派生し、手動編集は禁止
- worker 状態が `PENDING`、`NEEDS_CONTEXT`、`BLOCKED` のままなら change を完了扱いしない。archive 前に `controller_status` は `DONE` でなければならない

## 実行コマンドの境界

- `ospec execute ...` の各サブコマンドは OSpec artifacts だけを更新する。`workspace`、`worktree`、`finish` が git state を読む場合を除き、project source file は直接編集しない
- 順序は固定: `preflight --stage design` → `--stage plan` → task graph 導出 → combined planning review 1 回 → workspace 確認と worker dispatch
- 通常の red test、production implementation、green/refactor evidence は 1 つの atomic task にまとめる
- 各 task の統合 review（`artifacts/reviews/tasks/<task-id>/review.md`）が通るまで dependent task は dispatch されない。単一の final `artifacts/reviews/final-review.md` が通って初めて archive できる。review packet は必ず fresh model-native reviewer subagent に dispatch し（OSpec は local reviewer CLI を実行しない）、matching decision と evidence を記録する
- multi-worker execution は `runtimeAdapter.selected.nativeSubagent` に従い、選択された native adapter が並列をサポートするときだけ並列化する。capability がない、期限切れ、target 不一致の場合は block し、Orca、agent CLI、current controller に fallback しない
- required pending decision が残っている間は dispatch しない
- finish plan の status が ready で required pending decision がない場合は `ospec finalize` を実行する。`ospec archive ... --check` は任意の dry-run preview にすぎず、通過してもそこで止めない

## 文書言語

- すべての change 成果物はプロジェクト採用文書言語で書く
- 製品 UI 言語と OSpec change 文書言語は異なってよく、片方からもう片方を推測しない
- ある言語で作成された change は、プロジェクトルールが明示的に切り替えを要求しない限りその言語で継続する

## optional steps

- optional step の有効化は `.skillrc.workflow` で管理し、proposal flags はその設定と整合していなければならない
- 有効化された optional step は `tasks.md` と `verification.md` に必ず出す。goal では `artifacts/agents/task-graph.json` にも出す

## Archive Gates

次の場合は archive しない:

- 文書が古い、index が古い、または optional steps が通過していない
- `verification.md` が未完了、または verification evidence が failed、blocked、stale
- review artifacts に未解決の decision がある。task-level または final の review decision が `PENDING`、`NEEDS_CHANGES`、`BLOCKED`
- 記録済み debug evidence が blocked、または root cause の確認のみで後続の fixed 記録がない
- goal で `artifacts/agents/task-graph.json` に未解決状態、無効な依存関係、不足した実行詳細があるか、トップレベル `status` が `completed` でない
- goal で `artifacts/agents/worker-status.md` に未解決の worker 状態がある

force archive はユーザーの明示的な受け入れを要し、CLI が独自の確認フラグを強制する。完全な契約は、その profile が元々読む文書に書いてある。classic change は `for-ai/change-protocol.md`、goal は `for-ai/execution-protocol.md` を読む。

## 実行要件

- 最初に `.skillrc` を読み、現在の brief または dispatch packet から必要な change ファイル、対象ファイル、索引済み文書だけを開く
- `SKILL.index.json` を丸ごと読まない。archive が増えるほど無制限に膨らむため、`ospec docs locate --feature <slug>` または `ospec docs locate --affects <path>` でその挙動を説明する節に直接飛ぶ。キーワードしかない場合のみ `ospec index query <keyword...>` を使う。`docs/project/feature-catalog.md` は宣言済み feature ごとに 1 行を持つ。すべての archived changes を走査しない
- 完了 feature entry は archive evidence と task が宣言した永続 project document の両方をリンクする。project document frontmatter に `features`、`modules`、`aliases` を追加すると、人と AI が feature 名または module 名から直接ルーティングできる
- 宣言済み documentation update は dispatch から complete までの evidence が正規化 content の有意な変更を示した場合だけ完了とする。file の存在だけでは証明にならない
- archive 済みの classic change と goal は index エントリとアーカイブディレクトリから直接提供される：`ospec changes show <archive>` が要約、affects、ファイル一覧、検証コマンドをオンデマンドに表示し、`docs/project/changes/` 配下には何も生成されない。archive と finalize は機能カタログと knowledge index を再構築するが、人が管理する architecture、module、API の本文は削除も上書きもしない——エンジンが人所有の文書へ行う唯一の書き込みは `ospec:last-change` トレーサビリティコメントである
- 完了の主張は必ず実際のファイル状態と一致させ、説明で gate を飛ばさない
