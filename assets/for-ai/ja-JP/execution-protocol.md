---
name: project-execution-protocol
title: 実行プロトコル
tags: [ai, protocol, ospec]
---

# AI 実行プロトコル

## プロジェクトに入るたびに最初に読むもの

1. `.skillrc`
2. `.ospec/session-brief.md` があれば先に読む。なければ initialized project で `ospec session [path]` を実行して作成する
3. `SKILL.index.json`
4. `docs/project/naming-conventions.md`
5. `docs/project/skill-conventions.md`
6. `docs/project/workflow-conventions.md`
7. 現在の change ファイル: `proposal.md / design.md / implementation-plan.md / artifacts/agents/task-graph.json / artifacts/agents/bootstrap.md / artifacts/agents/handoff.md / artifacts/agents/document-review-dispatches/ / artifacts/agents/launch-plan.md / artifacts/agents/review-feedback-plan.md / tasks.md / artifacts/reviews/design-review.md / artifacts/reviews/implementation-plan-review.md / artifacts/reviews/spec-compliance.md / artifacts/reviews/code-quality.md / artifacts/agents/worker-status.md / artifacts/agents/debug-evidence.json / state.json / verification.md`
8. `stitch_design_review` がある場合は `artifacts/stitch/approval.json`
9. Stitch / Checkpoint の provider、MCP、認証、インストール、または有効化設定を変更する必要がある場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須ルール

- `proposal.md`、`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/review-feedback-plan.md`、`tasks.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json`、`artifacts/agents/verification-evidence.json`、`verification.md`、`review.md` はプロジェクト採用の文書言語で維持する
- 製品 UI やサイト locale が英語中心でも、それだけを理由に change 文書を英語へ書き換えない
- 現在の change 文書が既に中国語なら、プロジェクトルールが明示的に英語切り替えを要求しない限り中国語のまま続ける
- proposal/design/implementation-plan/task-graph/tasks/review-artifacts/worker-status を飛ばして完了を主張しない
- 既存の OSpec project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書く。active changes、queued changes、queue-run state、cache fingerprint、次の安全な command のみを記録し、worker 起動、test 実行、git inspect、archive、source file 編集は行わない
- `tdd_cycle`、`root_cause_debug`、`verification_evidence` など有効化された built-in quality policy steps は、archive-gated `optional_steps` として扱う。closeout 前に `tasks.md`、`verification.md`、対応する evidence artifacts で coverage を記録する
- AI 支援で change を進める場合は、`proposal.md` の後、`implementation-plan.md`、`tasks.md`、コードを編集する前に `design.md` を作成または更新する
- 不足している判断がアーキテクチャ、API、データ、UI、リスクを実質的に変える場合だけ、短い設計質問を 1 つ行う。それ以外は仮定を `design.md` に記録する
- `design.md` から `implementation-plan.md` を作成または更新し、対象ファイル、期待結果、検証コマンド、依存関係、並行可能な作業、競合を記録する
- `implementation-plan.md` から `artifacts/agents/task-graph.json` を導く。各 task には id、状態、依存関係、並行安全性、競合、対象ファイル、検証コマンド、期待結果、worker role を含める
- one active change を開始または再開するときは、`ospec execute bootstrap [changes/active/<change>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、そこにある次の安全な action に従う
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録し、worker 起動や source file 編集は行わない
- implementation tasks を導出または dispatch する前に、`ospec execute doc-review [changes/active/<change>] [--stage design|plan]` で `artifacts/agents/document-review-dispatches/` 配下に project session brief snapshot を含む document reviewer packet を作成し、`artifacts/reviews/design-review.md` または `artifacts/reviews/implementation-plan-review.md` を用意する。design review 承認後に implementation plan review を dispatch する。このコマンドは artifacts のみを記録し、reviewer 起動、shell command 実行、worker status 同期、source file 編集は行わない
- task 作業を割り当てる前に、`ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` で controller 状態と安全な次の task 候補を確認する
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で `artifacts/agents/workspace-status.json` と `artifacts/agents/workspace-status.md` を書く。status が `needs_isolation` の場合は、workspace を clean にするか isolated git worktree に移してから parallel dispatch する
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録する。このコマンドは準備計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない
- `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` で parallel-safe な worker packet batch と `artifacts/agents/execution-session.json` を作成する。各 packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれる。`ospec execute complete <task-id> ...` で worker 結果を記録する。`--task` は明示的な単一 task、`--limit` は dispatch batch size の上限に使う。これらのコマンドは `artifacts/agents/worker-status.md` も同期し、OSpec artifacts のみを更新し、外部 worker は起動しない。結果が `NEEDS_CONTEXT` または `BLOCKED` の場合、`complete` は `artifacts/agents/blockers/` に blocker escalation を書く
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]` で native agent launch plan を書く。Codex/GPT は `spawn_agent`/`wait_agent`/`close_agent`、Claude Code は Task、Gemini は `@generalist`、OpenCode は `@mention` を使うよう controlling AI に指示する。この command 自体は worker 起動や shell command 実行を行わない
- multi-worker execution は current harness native subagents が default。`ospec execute dispatch` で safe packet を作り、`launch-plan.md` を読んで、各 safe packet に native worker agent を dispatch し、結果を `ospec execute complete` で記録する
- `ospec execute orchestrate [changes/active/<change>] --command "..."` は native subagents が使えない場合だけの final CLI fallback。fallback mode は explicit command template で worker command を並行実行し、`artifacts/agents/orchestration-runs/` と task graph collect を記録する
- explicit `--run --command` on `ospec execute launch ... --run --command "..."` は native subagents が使えない、または明示的に bypass する場合だけの single-worker CLI fallback。その後 `ospec execute collect ...` で fallback task result を記録する。修正済み blocked/needs-context/failed work は `ospec execute retry` で再 dispatch する
- 各 worker task 完了後、`ospec execute review [changes/active/<change>] --task <task-id> --stage spec`、続けて `--stage quality` を使って task-level reviewer handoff packet を作成する。task-level decisions は `artifacts/reviews/tasks/<task-id>/` に保存され、両方が承認されるまで dependent task は dispatch されない
- すべての task-level review が承認され task graph が完了した後、`--task` なしの `ospec execute review [changes/active/<change>] [--stage spec|quality]` で final whole-change reviewer handoff packet を `artifacts/agents/review-dispatches/` に作成する。final spec review 承認前に final quality review を割り当てない
- explicit `ospec execute review ... --run --command "..."` の場合のみ local reviewer command を実行し、`artifacts/agents/review-runs/` を記録する。`--decision` がある場合は review decision も書き戻せる
- review artifact が non-`PENDING` decision を持つ場合は `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` で `artifacts/agents/review-feedback-plan.json` と `artifacts/agents/review-feedback-plan.md` を書く。追加作業を dispatch する前に accept、revise、clarify、blocked の handling を明確にする
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED` で `artifacts/agents/debug-evidence.json` を記録する。`CONFIRMED` は root cause の隔離、`FIXED` は verified fix、`BLOCKED` は verify failure を意味する
- focused test 実行後、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で `artifacts/agents/tdd-evidence.json` を記録する。red は通常、期待どおり失敗する test を記録し、green/refactor は passing result を記録する
- fresh project verification commands を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED` で `artifacts/agents/verification-evidence.json` を記録する。chat summary だけで完了を主張しない
- task graph、execution session、review artifacts、debug evidence、verification checklist を手動編集した後は、`ospec execute sync [changes/active/<change>]` で `artifacts/agents/worker-status.md` を再構築する
- `tasks.md` は `artifacts/agents/task-graph.json` から導く。tasks が既にあり上流文書がテンプレートのままなら、先に上流文書を更新してから tasks を整合させる
- `artifacts/agents/task-graph.json` に未解決の task 状態、無効な依存関係、不足した実行詳細、またはトップレベル `status` が `completed` でない状態がある場合は archive しない
- 各 task-level spec review をその task の quality review より先に完了し、final `artifacts/reviews/spec-compliance.md` を final `artifacts/reviews/code-quality.md` より先に完了する。未解決の task-level または final review decision は archive をブロックする
- 実装と review の間は `artifacts/agents/worker-status.md` を implementer、spec reviewer、quality reviewer、controller の状態と揃える
- worker 状態が `PENDING`、`NEEDS_CONTEXT`、`BLOCKED` のままなら完了と見なさない。archive 前に `controller_status` は `DONE` でなければならない
- 実行状態の正は `state.json` とする
- 有効化された optional step は `artifacts/agents/task-graph.json`、`tasks.md`、`verification.md` に出現していなければならない
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
