---
name: project-ai-guide
title: AI ガイド
tags: [ai, guide, ospec]
---

# AI ガイド

## 目的

この文書は OSpec 母仕様からコピーされた、プロジェクト採用済みの AI ガイドです。AI は母リポジトリの規則を即興で当てはめるのではなく、まずこのプロジェクト採用ルールに従う必要があります。

## 作業順序

1. `.skillrc` を読む
2. `SKILL.index.json` を読む
3. `docs/project/` 配下のプロジェクト採用ルールを読む
4. 関連する `SKILL.md` を読む
5. 現在の change 実行ファイルを読む。`workflow_profile_id: change` の場合は `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` を読む。`workflow_profile_id: goal` の場合は、さらに `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/decisions/`、`artifacts/agents/review-feedback-plan.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/final-review.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json`、`artifacts/agents/verification-evidence.json` を読む
6. Stitch が有効で、現在の change が `stitch_design_review` を有効化している場合は、先に `artifacts/stitch/approval.json` を確認する
7. Stitch / Checkpoint のインストール、provider 切り替え、doctor 修復、MCP 設定、認証設定、またはプラグイン有効化が必要な場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須動作

- `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` と、goal-only artifacts（`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/document-review-dispatches/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/decisions/`、`artifacts/agents/review-feedback-plan.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/final-review.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json`、`artifacts/agents/verification-evidence.json`）はプロジェクト採用の文書言語で維持する
- 製品 UI、サイト locale、または「英語優先」という要件だけから change 文書言語を推測しない
- プロジェクト採用プロトコルが中国語、または現在の change 文書がすでに中国語なら、明示的なルール変更がない限り change 文書は中国語のまま維持する
- 目的の文書を読む前に、まず index を使って知識の所在を確認する
- 既存の OSpec project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書き、active change、queued change、queue run、cache fingerprint、次の安全な command context を記録する。この project entry brief は active-change の `ospec execute bootstrap` を置き換えない
- `tdd_cycle`、`root_cause_debug`、`verification_evidence` など有効化された built-in quality policy steps は、archive-gated `optional_steps` として扱う。closeout 前に `tasks.md`、`verification.md`、対応する evidence artifacts で coverage を記録する
- 小さな通常変更には `ospec new` / `ospec-change` を使い、1.0 の高速フロー（`proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`）に留める
- 複雑な作業には `ospec goal` / `ospec-goal` を使い、`design.md`、`implementation-plan.md`、task graph、document review、worker/reviewer handoff、evidence gates を有効にする
- `ospec execute …` コントローラ層（bootstrap、doc-review、dispatch、launch、review、worktree、finish、collect、retry、sync）と goal 専用 artifacts はすべて `workflow_profile_id: goal` に属する。`workflow_profile_id: change` では、クラシックな高速フローを維持し、execute 層や goal artifacts を読まず・実行せず、`proposal.md` と `tasks.md` を編集し、実装し、`verification.md` と `review.md` を記録してから `ospec verify` と `ospec finalize` で閉じる——ユーザーがこの change での agent/worker 実行を明示的に求めない限り
- AI 支援で goal を進める場合、ユーザーに `design.md` や `implementation-plan.md` の手書きを求めない。要件、`proposal.md`、プロジェクト文脈からそれらを作成または更新してから `artifacts/agents/task-graph.json` を導出し、`tasks.md` やコードを編集する
- classic change では、ユーザーが明示的に goal へ昇格させない限り goal-only files を作成しない
- `Announce-Before-Act`: ワークフローを黙って実行しない。どの OSpec skill を使い、どの段階かを 1 行で宣言し、これから実行する `ospec execute ...` コマンドと生成する成果物、ネイティブ subagent を何体・どの機構で派遣するか（Claude Code は `Task`、Codex/GPT は `spawn_agent`/`wait_agent`/`close_agent`、Gemini は `@generalist`、OpenCode は `@mention`）、進行が止まったときに何のゲートがブロックしているかを伝える
- `Brainstorm-First`: 各 goal は設計を確定する前に短いブレインストーミングから始める。方向、アーキテクチャ、API、データ、UI、リスク、スコープの未決事項を 1 つずつユーザーに質問し、黙って仮定しない。必要に応じて `ospec brainstorm [path] --topic "..."` で探索を保存する。いずれかが本当に未決のときは、黙って仮定を書くより durable な decision gate を上げることを優先する。ユーザーが明示的に委任した、または不在のときだけ `design.md` に仮定を記録し、要確認の仮定として明記する
- change がユーザー選択を待つ必要がある場合は `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` で durable decision gate を記録し、decision report の `Chat Prompt` または `artifacts/agents/decisions/index.md` を提示してから、`ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` で回答を記録する
- goal では `implementation-plan.md` は `design.md` から導き、`artifacts/agents/task-graph.json` は `implementation-plan.md` から導き、`tasks.md` は task graph から導く。既存 tasks は上流文書の更新後に整合させる。classic change では `tasks.md` を `proposal.md` と実装範囲から直接導く
- one active change を開始または再開するときは、`ospec execute bootstrap [changes/active/<change>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、そこにある次の安全な action に従う。active dispatch がある場合、bootstrap は対応する `ospec execute launch ... --task ...` command を推奨する
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録し、worker 起動や source file 編集は行わない
- implementation tasks を導出または dispatch する前に、`ospec execute doc-review [changes/active/<change>] [--stage design|plan]` で `artifacts/agents/document-review-dispatches/` 配下に project session brief snapshot を含む document reviewer packet を作成し、`artifacts/reviews/design-review.md` または `artifacts/reviews/implementation-plan-review.md` を用意する。design review 承認後に implementation plan review を dispatch する
- ready、blocked、running、completed と安全な次 task 候補を確認する必要がある場合は、`ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` を使って controller view を確認する
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で git workspace safety を記録する。status が `needs_isolation` の場合は、workspace を clean にするか isolated git worktree に移してから parallel dispatch する
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録する。このコマンドは準備計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない。finish plan の status が ready で required pending decision がない場合は、続けて `ospec finalize [changes/active/<change>]` を実行する。`ospec archive ... --check` は任意の dry-run preview のみで、通過後にそこで止めない
- 準備ができたら closeout は自動：`ospec verify [changes/active/<change>]` が通過し、required pending decision や blocking なプラグイン gate がない場合は、自分で `ospec finalize [changes/active/<change>]` を実行する——通過した `ospec verify` や `ospec archive ... --check`（`--check` は preview のみ）で止まらず、ユーザーの依頼を待たない。closeout を止めるのは gate が本当に人を必要とするときだけ：未回答の required decision、未承認の blocking プラグイン gate（例：Stitch や Checkpoint）、verify や archive が報告する実際の blocker、またはユーザーが archive 前に preview/承認を明示的に求めた場合。closeout は必ず `ospec finalize`（または `ospec archive`）で行い、change ディレクトリを手動で移動しない——finalize は同じ瞬間にその change に紐づく brainstorm も一緒にアーカイブする。review が人手またはデバイス検証待ち（`decision` が `APPROVED` でない）で finalize が not-ready を報告する場合は、ユーザーが確認した承認をその review に記録してから `ospec finalize` を再実行し、ファイル移動で回避しない
- 決定ゲートと brainstorm の選択肢はユーザーのもの：**推奨オプションを自動選択したり、自分でゲートを resolve したりしない**——能力ラダー（ネイティブ質問 UI → plan/承認 UI → 素のチャットテキスト）で各ゲートをユーザーに提示し、ユーザーの実際の選択を待つ。required ゲートはユーザーが答えるまで実装とディスパッチをブロックし、`recommended` はユーザーに見せるヒントにすぎない
- あなたが作成するすべての change ドキュメントと brainstorm は、プロジェクトのドキュメント言語（`.skillrc` の `documentLanguage` / 管理対象の `for-ai/` ガイダンス）で書く。1 つの change 内で中国語と英語を混在させない
- task-level の永続 handoff artifacts が必要な場合は、`ospec execute dispatch` で parallel-safe な worker packet batch を作成し、`ospec execute complete` で worker 結果を記録する。各 dispatch packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれる。結果が `NEEDS_CONTEXT` または `BLOCKED` の場合、`complete` は `artifacts/agents/blockers/` を書く。`--task` は明示的な単一 task、`--limit` は dispatch batch size の上限に使う。各 worker task 完了後は `ospec execute review [changes/active/<change>] --task <task-id>` で統合 review（spec compliance と code quality を一度に確認）を行い、dependent task はその 1 回の統合 review が承認されるまで dispatch されない。すべての task-level review が承認され task graph が完了した後は、`--task` なしの `ospec execute review` で 1 つの統合 final whole-change code reviewer handoff packet を作成する。review decision が non-`PENDING` の場合は `ospec execute feedback` で `artifacts/agents/review-feedback-plan.md` を書く。実行または review artifacts を手動編集した後は `ospec execute sync` で `worker-status.md` を再構築する
- トークン節約（どの手順も変えない）：`ospec execute …` に `--brief` を付けて完全なレポートではなく簡潔な要約を読み、毎ターン `task-graph.json` / `worker-status.md` / `launch-plan.md` 全体を読み直す代わりに `ospec execute status --brief` で各ステップを駆動する——artifact は完全な形でディスクに書かれるので、詳細が必要なときだけ開く
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic] [--dry-run] [--json]` で native agent launch plan を書く。Codex/GPT は `spawn_agent`/`wait_agent`/`close_agent`、Claude Code は Task、Gemini は `@generalist`、OpenCode は `@mention`、Cursor は Agent/task chat、Copilot は CLI/coding-agent task を使うよう controlling AI に指示する。adapter が stdout の machine-readable launch artifact を必要とする場合は `--json` を使う。この command 自体は worker 起動や shell command 実行を行わない
- multi-worker execution は current harness native subagents が default。`ospec execute dispatch` で safe packet を作り、`launch-plan.md` を読んで、各 safe packet に native worker agent を dispatch し、結果を `ospec execute complete` で記録する
- `ospec execute orchestrate [changes/active/<change>] --command "..."` は native subagents が使えない場合だけの final CLI fallback。fallback mode は explicit command template で worker command を並行実行し、`artifacts/agents/orchestration-runs/` と task graph collect を記録し、failed-worker retry commands を報告する
- explicit `--run --command` on `ospec execute launch ... --run --command "..."` は native subagents が使えない、または明示的に bypass する場合だけの single-worker CLI fallback。その後 `ospec execute collect ...` で fallback task result を記録する。修正済み blocked/needs-context/failed work は `ospec execute retry` で再 dispatch する
- explicit `ospec execute review ... --run --command "..."` の場合のみ local reviewer command を実行し、`artifacts/agents/review-runs/` を記録する。`--decision` がある場合は review decision も書き戻せる
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` で root cause と fix evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- focused test 実行後は、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で TDD cycle evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- fresh project checks を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED` で verification evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- `ospec execute doc-review` は artifacts のみを記録し、reviewer 起動、shell command 実行、worker status 同期、source file 編集は行わない
- goal では `artifacts/agents/task-graph.json` に未解決の task 状態、無効な依存関係、対象ファイル不足、検証コマンド不足、またはトップレベル `status` が `completed` でない状態がある場合は archive しない
- 実装後は各 task の統合 review（`artifacts/reviews/tasks/<task-id>/review.md`）を完了し、単一の final `artifacts/reviews/final-review.md` を完了する。未解決の task-level または final review decision は archive をブロックする
- 実装と review の間は `artifacts/agents/worker-status.md` を implementer、spec reviewer、quality reviewer、controller の状態と揃える
- worker 状態が `PENDING`、`NEEDS_CONTEXT`、`BLOCKED` のままなら完了を主張しない。archive 前に `controller_status` は `DONE` でなければならない
- 実装作業前にプロジェクト採用ルールを読む
- `stitch_design_review` が有効で `approval.json.preview_url` または `submitted_at` が空なら、まず `ospec plugins run stitch <change-path>` を実行して preview を生成し、その URL をユーザーに送る
- `.skillrc.plugins.stitch.project.project_id` が既に設定されている場合は、その Stitch project を再利用し、新しい project を作成しない
- `.skillrc.plugins.stitch.project.project_id` が空なら、最初に成功した Stitch 実行を canonical project として以後も再利用する
- `stitch_design_review` が有効で `approval.json.status != approved` の間は、デザインレビューゲートで停止する
- Stitch のページレビューでは、各業務ルートにつき canonical layout を 1 つだけ維持する
- `light/dark` を作る場合は同じ canonical screen から派生し、モジュール順、情報設計、CTA の位置、構成を変えない
- 対応するページが既にある場合は `edit existing screen` または `duplicate existing canonical screen and derive a theme variant` を優先する
- すべての Stitch 成果物には、route、canonical dark/light screen id、派生関係、archived screen id を含む `screen mapping` が必要
- 古い画面、探索案、置き換え済み画面は canonical 画面と並列の main page として残さず、archive または rename する
- canonical 選定、theme pairing、screen mapping、重複整理が欠けている場合は、レビュー完了とみなさない
- `ospec plugins run stitch <change-path>` は既定で設定済み provider adapter を使う。`.skillrc.plugins.stitch.runner` を明示的に上書きしている場合のみ custom runner を使う
- custom runner で `token_env` を使う場合は、対応する環境変数が設定済みかを確認する
- runner、Gemini CLI、Codex CLI、stitch MCP、認証準備が不明な場合は、まず `ospec plugins doctor stitch <project-path>` を実行する
- `plugins doctor stitch` が選択 provider のチェックで PASS 以外を返したら、必要な CLI の導入と stitch MCP / API token 設定をユーザーに依頼する
- Stitch のインストール、provider 切り替え、doctor 修復、MCP 設定、認証設定では、まずプロジェクト文書言語に一致するリポジトリ内のローカライズ済み Stitch 仕様を読む。Gemini / Codex の設定形をそのまま使い、回避目的の別設定を即興で作らない
- 内蔵 `codex` provider が read-only 呼び出しでは成功するのに `create_project`、`generate_screen`、`edit_screens` が止まる場合は、`codex exec --dangerously-bypass-approvals-and-sandbox` が実際に使われているか確認する
- プロジェクトが `.skillrc.plugins.stitch.runner` を明示的に上書きし、それでも Codex が Stitch 書き込みを担当する場合は、その custom runner / wrapper でも `--dangerously-bypass-approvals-and-sandbox` を渡す
- 重要なコード変更後は `SKILL.md` を同期する
- 必要に応じて `SKILL.index.json` を再生成する

## プロジェクト採用ルール優先

- 命名規約: `docs/project/naming-conventions.md`
- SKILL 規約: `docs/project/skill-conventions.md`
- ワークフロー規約: `docs/project/workflow-conventions.md`
- 開発ガイド: `docs/project/development-guide.md`
