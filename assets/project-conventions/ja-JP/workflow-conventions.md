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
3. `design.md` を作成または更新する
4. `implementation-plan.md` を作成または更新する
5. `artifacts/agents/task-graph.json` を作成または更新する
6. `tasks.md` を作成または更新する
7. `state.json` に従って実装を進める
8. 完了した各 worker task の task-level spec review と quality review を完了する
9. final `artifacts/reviews/spec-compliance.md` と `artifacts/reviews/code-quality.md` を割り当てて完了する
10. `artifacts/agents/worker-status.md` を更新する
11. 関連する `SKILL.md` を更新する
12. `SKILL.index.json` を再生成する
13. `verification.md` を完了させる
14. すべての gate 通過後にだけ archive する

## 設計作成

- AI 支援で change を進める場合は、要件、`proposal.md`、プロジェクト文脈から `design.md` を作成または更新してから `implementation-plan.md`、`tasks.md`、コードを編集する
- 不足判断がアーキテクチャ、API、データ、UI、リスクを実質的に変える場合だけ、短い設計質問を 1 つ行う。それ以外は仮定を `design.md` に記録する
- `implementation-plan.md` は確定した `design.md` から導き、対象ファイル、期待結果、検証コマンド、依存関係、並行可能な作業、競合を記録する
- `artifacts/agents/task-graph.json` は `implementation-plan.md` から導く。各 task には id、状態、依存関係、並行安全性、競合、対象ファイル、検証コマンド、期待結果、worker role を含める
- `tasks.md` は `artifacts/agents/task-graph.json` から導く。`tasks.md` が既にあり上流文書がテンプレートのままなら、先に上流文書を更新してから tasks を整合させる

## 状態制約

- 実行状態の正は `state.json` とする
- `verification.md` は `state.json` の代わりにならない
- 状態ファイルと実行ファイルが矛盾する場合は、まず状態を直す
- `artifacts/agents/task-graph.json` は機械可読な task 状態、依存関係、競合制約、対象ファイル、検証コマンドを記録する
- 既存 project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書く。active change、queued change、queue-run、cache fingerprint、次の安全な command context のみを記録する
- one active change を開始または再開するときは、`ospec execute bootstrap [changes/active/<change>]` で project session brief snapshot を含む `bootstrap.json` と `bootstrap.md` を書き、そこにある次の安全な action に従う
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` で `handoff.json` と `handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録する
- implementation tasks を導出または dispatch する前に、`ospec execute doc-review [changes/active/<change>] [--stage design|plan]` で project session brief snapshot を含む `artifacts/agents/document-review-dispatches/` packet と `artifacts/reviews/design-review.md` または `artifacts/reviews/implementation-plan-review.md` を作成する。design review 承認後に implementation plan review を dispatch する
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で git workspace safety を記録する。`workspace-status.json` が `needs_isolation` を示す場合は parallel dispatch を止める
- Use `ospec execute route [changes/active/<change>]` to write `workflow-route.json` and `workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files
- direction、architecture、API、UI、risk、scope に明示的な user choice が必要な場合は `ospec execute decision [changes/active/<change>] ...` を使う。`artifacts/agents/decisions/index.md` または decision report の `Chat Prompt` を提示し、required pending decision が selected または skipped になるまで dispatch しない
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `worktree-plan.json` と `worktree-plan.md` を記録する。このコマンドは計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `finish-plan.json` と `finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない
- task-level の永続 handoff artifact が必要な場合は `ospec execute dispatch` で parallel-safe な worker packet batch と `artifacts/agents/execution-session.json` を作成する。各 packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれる。`--task` は明示的な単一 task、`--limit` は dispatch batch size の上限に使い、`ospec execute complete` で worker 結果を記録する。`complete` が `NEEDS_CONTEXT` または `BLOCKED` を記録した場合は `artifacts/agents/blockers/` が生成される
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` で `launch-plan.json` と `launch-plan.md` を書く。これは current harness の native agent launch artifact であり、Codex/GPT `spawn_agent`、Claude Code Task、Gemini `@generalist`、OpenCode `@mention`、Cursor Agent/task chat、Copilot CLI/coding-agent task の guidance を含む。adapter が stdout の machine-readable launch artifact を必要とする場合は `--json` を使う
- multi-worker execution は current harness native subagents が default。safe packet を dispatch し、`launch-plan.md` を確認し、各 safe packet に native agent を起動し、結果を `ospec execute complete` で記録する
- `ospec execute orchestrate [changes/active/<change>] --command "..." [--limit N] [--max-rounds N] [--timeout-ms N]` は native subagents が使えない場合だけの final CLI fallback。fallback は explicit command template で worker command を並行実行し、task graph に collect し、failed-worker retry commands を報告する
- explicit `--run --command`（`ospec execute launch ... --run --command "..."`）は native subagents が使えない、または明示的に bypass する場合だけの single-worker CLI fallback。その後 `ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]` で fallback task result を記録する。修正済み blocked/needs-context/failed work は `ospec execute retry` で `artifacts/agents/retries/` を書いて再 dispatch する。完了済み task は `--force` が必要
- `ospec execute dispatch` と `complete` は `artifacts/agents/worker-status.md` も同期する。task graph、execution session、review artifacts、debug evidence、verification checklist を手動編集した後は `ospec execute sync` で worker 状態を再構築する
- 各 worker task 完了後、`ospec execute review [changes/active/<change>] --task <task-id> --stage spec`、続けて `--stage quality` を使い、task-level reviewer handoff packet を作成する。task-level review decision は `artifacts/reviews/tasks/<task-id>/` に保存され、両方が承認されるまで dependent task は dispatch されない
- すべての task-level review が承認され task graph が完了した後、`--task` なしの `ospec execute review [changes/active/<change>] [--stage spec|quality]` で project session brief snapshot を含む final whole-change reviewer handoff packet を `artifacts/agents/review-dispatches/` に作成する。final spec review 承認前に final quality review を割り当てない
- explicit `ospec execute review ... --run --command "..."` の場合のみ local reviewer command を実行し、`artifacts/agents/review-runs/` を書く。`--decision` がある場合は matching review artifact を更新できる
- review artifact が non-`PENDING` decision を持つ場合は `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` で `artifacts/agents/review-feedback-plan.json` と `artifacts/agents/review-feedback-plan.md` を書く。追加作業を dispatch する前に accept、revise、clarify、blocked の handling を明確にし、feedback が scope、direction、API、UI、risk、accepted tradeoffs を変える場合は required user decision を作成する
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` で `artifacts/agents/debug-evidence.json` に root cause と fix evidence を記録する
- focused test 実行後、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で `artifacts/agents/tdd-evidence.json` に TDD cycle evidence を記録する
- fresh project checks を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED` で `artifacts/agents/verification-evidence.json` に verification evidence を記録する
- `ospec session` と `ospec execute bootstrap`、`handoff`、`doc-review`、`workspace`、plan-mode `worktree`、`finish`、`dispatch`、`launch`、`collect`、`retry`、`complete`、`review`、`debug`、`tdd`、`verify`、`sync` は OSpec artifacts のみを更新する。`workspace`、`worktree`、`finish` が git state を読む場合を除き、project source file は直接編集しない。native subagent は current AI harness が起動する。shell command は explicit `worktree --create`、`worktree --cleanup`、fallback `launch --run --command`、`review --run --command`、または fallback `orchestrate` の場合のみ実行する
- task graph に未解決状態、無効な依存関係、不足した実行詳細、またはトップレベル `status` が `completed` でない状態がある場合は archive しない
- `artifacts/agents/worker-status.md` は implementer、spec reviewer、quality reviewer、controller の状態を記録する
- 各 task-level spec review はその task の quality review より先に通過し、final `artifacts/reviews/spec-compliance.md` は final `artifacts/reviews/code-quality.md` より先に通過する
- task-level と final の review decision が `PENDING`、`NEEDS_CHANGES`、`BLOCKED` の場合は archive をブロックする
- 記録済み debug evidence が blocked、または root cause の確認のみで後続の fixed 記録がない場合は archive をブロックする
- verification evidence が failed、blocked、stale の場合は archive をブロックする
- worker 状態が `PENDING`、`NEEDS_CONTEXT`、`BLOCKED` のままなら change を完了扱いしない。archive 前に `controller_status` は `DONE` でなければならない

## 文書言語

- `proposal.md`、`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/review-feedback-plan.md`、`tasks.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`verification.md`、`review.md` はプロジェクト採用文書言語で維持する
- 製品 UI 言語と OSpec change 文書言語は異なってよく、片方からもう片方を推測しない
- change が中国語で作成されている場合は、プロジェクトルールが明示的に英語切り替えを要求しない限り中国語で継続する

## optional steps

- optional step の有効化は `.skillrc.workflow` で管理する
- proposal flags は workflow 設定と整合していなければならない
- 有効化された optional step は `artifacts/agents/task-graph.json`、`tasks.md`、`verification.md` に必ず出す

## Plugin Gates

- プラグイン機能は `.skillrc.plugins` で管理する
- Stitch / Checkpoint のインストール、provider 切り替え、doctor 修復、MCP、認証設定、またはプラグイン有効化に関わる場合は、まずプロジェクト採用文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む
- その言語の仕様書が存在しない場合のみ、別言語の仕様書へフォールバックする
- Checkpoint が有効な change では、変更された runtime surface に route/flow assertions、accessibility 期待値、visual baselines、screenshots/traces、console/network evidence を設定してから自動 gate を review-ready とみなす
- Checkpoint gate が review-ready になるには `artifacts/checkpoint/gate.json` が `status: passed`、`evidence.status: complete`、かつ active checkpoint step ごとの evidence が complete である必要がある。runner が passing でも screenshots、traces、visual diff evidence、route/flow coverage、assertions が不足している場合は archive-ready ではない
