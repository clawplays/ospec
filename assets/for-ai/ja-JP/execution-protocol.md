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
7. 現在の brief または dispatch packet。`SKILL.index.json` と `docs/project/feature-index.md` を使い、現在の段階に必要な change artifact、対象ファイル、索引済み文書だけを開く
8. `stitch_design_review` がある場合は `artifacts/stitch/approval.json`
9. Stitch / Checkpoint の provider、MCP、認証、インストール、または有効化設定を変更する必要がある場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須ルール

- `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` と、goal-only artifacts はプロジェクト採用の文書言語で維持する
- 製品 UI やサイト locale が英語中心でも、それだけを理由に change 文書を英語へ書き換えない
- 現在の change 文書が既に中国語なら、プロジェクトルールが明示的に英語切り替えを要求しない限り中国語のまま続ける
- 現在の workflow profile が要求する files と gates を飛ばして完了を主張しない
- 既存の OSpec project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書く。active changes、queued changes、queue-run state、cache fingerprint、次の安全な command のみを記録し、worker 起動、test 実行、git inspect、archive、source file 編集は行わない
- `tdd_cycle`、`root_cause_debug`、`verification_evidence` など有効化された built-in quality policy steps は、archive-gated `optional_steps` として扱う。closeout 前に `tasks.md`、`verification.md`、対応する evidence artifacts で coverage を記録する
- 小さな通常変更には `ospec new` / `ospec-change` を使い、1.0 の高速フロー（`proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`）に留める
- 複雑な作業には `ospec goal` / `ospec-goal` を使い、`design.md`、`implementation-plan.md`、task graph、document review、worker/reviewer handoff、evidence gates を有効にする
- `ospec execute …` コントローラ層（bootstrap、doc-review、dispatch、launch、review、worktree、finish、collect、retry、sync）と goal 専用 artifacts はすべて `workflow_profile_id: goal` に属する。`workflow_profile_id: change` では、クラシックな高速フローを維持し、execute 層や goal artifacts を読まず・実行せず、`proposal.md` と `tasks.md` を編集し、実装し、`verification.md` と `review.md` を記録してから `ospec verify` と `ospec finalize` で閉じる——ユーザーがこの change での agent/worker 実行を明示的に求めない限り
- AI 支援で goal を進める場合は、`proposal.md` の後、`implementation-plan.md`、`tasks.md`、コードを編集する前に `design.md` を作成または更新する。classic change では、ユーザーが明示的に goal へ昇格させない限り goal-only files を作成しない
- `Announce-Before-Act`: ワークフローを黙って実行しない。OSpec skill・段階、コマンドと生成物、選択された model-native subagent adapter、worker 数、current session capability、blocking gate を伝える
- `Brainstorm-First`: 各 goal は設計を確定する前に短いブレインストーミングから始める。方向、アーキテクチャ、API、データ、UI、リスク、スコープの未決事項を 1 つずつユーザーに質問し、黙って仮定しない。必要に応じて `ospec brainstorm [path] --topic "..."` で探索を保存する。いずれかが本当に未決のときは、黙って仮定を記録するより durable な decision gate を上げることを優先する。ユーザーが明示的に委任した、または不在のときだけ `design.md` に仮定を記録し、要確認の仮定として明記する
- change がユーザー選択を待つ必要がある場合は `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` で durable decision gate を記録し、decision report の `Chat Prompt` または `artifacts/agents/decisions/index.md` を提示してから、`ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` で回答を記録する
- 利用可能ならネイティブの質問 UI で決定の選択肢を提示してから記録する（Claude Code では `AskUserQuestion`）。Claude Code では `ospec session hook --target claude --apply` が hook を導入し、毎ターンこの契約を再確認し、required な決定が未解決の間は subagent 派遣を強制ブロックする。ネイティブのピッカーがない harness（Codex、Gemini、Cursor、Copilot、OpenCode）では、代わりに decision report の `Chat Prompt` をチャットに提示して尋ねる——尋ねる手順はどの harness でも同じであり、`ospec execute dispatch` はどの harness でも required な決定が未解決の間ブロックするので、どの harness でも質問を省略しない
- goal では `design.md` から `implementation-plan.md` を作成または更新し、対象ファイル、期待結果、検証コマンド、依存関係、並行可能な作業、競合を記録する
- goal では `implementation-plan.md` から `artifacts/agents/task-graph.json` を導く。各 task には id、状態、依存関係、並行安全性、競合、対象ファイル、検証コマンド、期待結果、worker role を含める。`target_files` が他の ready task と重ならず、依存もない task はすべて `parallelizable: true` にする。task 同士がファイルを共有するか実際に依存する場合のみ `parallelizable: false` を残し、`serial_reason` と `conflicts_with` を記録する。すべてを既定で直列にせず、安全な graph を 1 worker に制限する場合は `maxParallelReason` を記録する。6 個を超える `target_files` は task を分割し、1 つの atomic verification boundary が必要な場合だけ具体的な `scope_reason` を記録する
- L3 allowlist は安全な置換であり、暗黙の追加ではない。`ospec loop allowlist derive/check/apply --from-task-graph` を優先し、CAS に結び付いた差分を確認して、意図した権限拡張だけを明示的に承認する。
- specialist document review には round/time guard がある。前回の findings sidecar と resolution evidence を先に確認し、その後 current document 全体を review する。cache/pending reuse と同じ dispatch の recovery は round を消費せず、`--force` は guard を迂回しない。
- review repair は収束させる。共有ファイルを変更する downstream task は推移的 upstream の regression obligation を継承し、task review と grouped final review の自動 repair はそれぞれ既定で 2 round までとする。final review が `BLOCKED` の場合は blocker の解決まで停止し、grouped repair に進めない。未解決 findings を示してユーザーの明示的承認を得るまで `--max-task-repair-rounds` または `--max-final-repair-rounds` を引き上げない。
- すべての harness で native child の待機を bounded にする。Codex/GPT の `wait_agent`、Claude Task polling、その他の native wait は 60 秒以内に戻る。この 60 秒は controller poll 1 回の上限であり、child runtime の上限ではない。各 live child を `heartbeatDueAt` 前に更新し、完了時は action の `loop finalize` で evidence と result を atomic に保存して poll ごとに再 tick する。child は action deadline まで複数 poll にまたがって実行でき、evidence 完了後には bounded result grace がある。capacity 不明時は implementation batch を 2 件までに制限するが、安全な review 並列性は維持する。
- one active change を開始または再開するときは、`ospec execute bootstrap [changes/active/<change>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、そこにある次の安全な action に従う
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録し、worker 起動や source file 編集は行わない
- implementation tasks を導出または dispatch する前に、`ospec execute doc-review [changes/active/<change>] [--stage design|plan]` で `artifacts/agents/document-review-dispatches/` 配下に project session brief snapshot を含む document reviewer packet を作成し、`artifacts/reviews/design-review.md` または `artifacts/reviews/implementation-plan-review.md` を用意する。design review 承認後に implementation plan review を dispatch する。このコマンドは artifacts のみを記録し、reviewer 起動、shell command 実行、worker status 同期、source file 編集は行わない
- task 作業を割り当てる前に、`ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` で controller 状態と安全な次の task 候補を確認する
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- direction、architecture、API、UI、risk、scope に明示的な user choice が必要な場合は `ospec execute decision [changes/active/<change>] ...` を使う。required pending decisions は bootstrap/status/finish と `artifacts/agents/decisions/index.md` に表示され、selected または skipped まで dispatch をブロックする
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で `artifacts/agents/workspace-status.json` と `artifacts/agents/workspace-status.md` を書く。status が `needs_isolation` の場合は、workspace を clean にするか isolated git worktree に移してから parallel dispatch する
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録する。このコマンドは準備計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない。finish plan の status が ready で required pending decision がない場合は、続けて `ospec finalize [changes/active/<change>]` を実行する。`ospec archive ... --check` は任意の dry-run preview のみで、通過後にそこで止めない
- 準備ができたら closeout は自動：`ospec verify [changes/active/<change>]` が通過し、required pending decision や blocking なプラグイン gate がない場合は、自分で `ospec finalize [changes/active/<change>]` を実行する——通過した `ospec verify` や `ospec archive ... --check`（`--check` は preview のみ）で止まらず、ユーザーの依頼を待たない。closeout を止めるのは gate が本当に人を必要とするときだけ：未回答の required decision、未承認の blocking プラグイン gate（例：Stitch や Checkpoint）、verify や archive が報告する実際の blocker、またはユーザーが archive 前に preview/承認を明示的に求めた場合
- 決定ゲートと brainstorm の選択肢はユーザーのもの：**推奨オプションを自動選択したり、自分でゲートを resolve したりしない**——能力ラダー（ネイティブ質問 UI → plan/承認 UI → 素のチャットテキスト）で各ゲートをユーザーに提示し、ユーザーの実際の選択を待つ。required ゲートはユーザーが答えるまで実装とディスパッチをブロックし、`recommended` はユーザーに見せるヒントにすぎない
- あなたが作成するすべての change ドキュメントと brainstorm は、プロジェクトのドキュメント言語（`.skillrc` の `documentLanguage` / 管理対象の `for-ai/` ガイダンス）で書く。1 つの change 内で中国語と英語を混在させない
- `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` で parallel-safe な worker packet batch と `artifacts/agents/execution-session.json` を作成する。各 packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれる。`ospec execute complete <task-id> ...` で worker 結果を記録する。`--task` は明示的な単一 task、`--limit` は dispatch batch size の上限に使う。これらのコマンドは `artifacts/agents/worker-status.md` も同期し、OSpec artifacts のみを更新し、外部 worker は起動しない。結果が `NEEDS_CONTEXT` または `BLOCKED` の場合、`complete` は `artifacts/agents/blockers/` に blocker escalation を書く
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` で launch plan を書く。`runtimeAdapter` は current かつ target-bound な model-native subagent capability のみを受け入れる。single-task dispatch はこの plan を自動生成する
- `runtimeAdapter.selected.nativeSubagent` を実行し、安全な batch だけを並列 dispatch する。capability がない、または期限切れの場合は block し、agent CLI や current controller に fallback しない
- `IDE-CONTROLLER-AUTO-DISPATCH`: L1 は report-only。L2/L3 では IDE AI が tick -> 各 action の `runtimeAdapter.selected.nativeSubagent` で全 `actions[]` を実行 -> heartbeat/result evidence -> 即時 tick を担当する。`actions[]` が空で `pending` がある場合は観察のみで再 dispatch しない
- agent CLI execution は削除された。`execute orchestrate`、`launch --run --command`、`review --run --command`、`loop watch` は process 起動や run artifact 作成の前に失敗する。native work の再実行には `ospec execute retry` を使う
- 各 worker task 完了後、`ospec execute review [changes/active/<change>] --task <task-id>` で統合 review と task-scoped `artifacts/agents/review-packages/*.diff` を作成する。reviewer は package を一度読み、広範な Git 探索を繰り返さない。サイズと所要時間は `artifacts/agents/execution-metrics.json` に記録される
- task graph で `documentation_updates` を有効にした場合、各 task に配列を持たせ（不要なら `[]`）、宣言した docs path を同じ task の `target_files` に含め、archive 前に存在させ、dispatch から complete までの有意な content change evidence を残す。baseline のない旧 run は互換性を保つが未検証と表示する。
- すべての task-level review が承認され task graph が完了した後、`--task` なしの `ospec execute review [changes/active/<change>]` で 1 つの統合 final whole-change code reviewer handoff packet を `artifacts/agents/review-dispatches/` に作成する。これは単一 `artifacts/reviews/final-review.md`・1 つの decision
- review artifact が non-`PENDING` decision を持つ場合は `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` で `artifacts/agents/review-feedback-plan.json` と `artifacts/agents/review-feedback-plan.md` を書く。追加作業を dispatch する前に accept、revise、clarify、blocked の handling を明確にし、feedback が scope、direction、API、UI、risk、accepted tradeoffs を変える場合は required user decision gate を作成する
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` で `artifacts/agents/debug-evidence.json` を記録する。`CONFIRMED` は root cause の隔離、`FIXED` は verified fix、`BLOCKED` は verify failure を意味する
- focused test 実行後、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で `artifacts/agents/tdd-evidence.json` を記録する。red は通常、期待どおり失敗する test を記録し、green/refactor は passing result を記録する
- fresh project verification commands を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` で `artifacts/agents/verification-evidence.json` を記録する。chat summary だけで完了を主張しない
- task graph、execution session、review artifacts、debug evidence、verification checklist を手動編集した後は、`ospec execute sync [changes/active/<change>]` で `artifacts/agents/worker-status.md` を再構築する
- トークン節約（どの手順も変えない）：`ospec execute …` に `--brief` を付けて完全なレポートではなく簡潔な要約を読み、毎ターン `task-graph.json` / `worker-status.md` / `launch-plan.md` 全体を読み直す代わりに `ospec execute status --brief` で各ステップを駆動する——artifact は完全な形でディスクに書かれるので、詳細が必要なときだけ開く
- goal では `tasks.md` は `artifacts/agents/task-graph.json` から導く。tasks が既にあり上流文書がテンプレートのままなら、先に上流文書を更新してから tasks を整合させる。classic change では `tasks.md` を `proposal.md` と実装範囲から直接導く
- goal では `artifacts/agents/task-graph.json` に未解決の task 状態、無効な依存関係、不足した実行詳細、またはトップレベル `status` が `completed` でない状態がある場合は archive しない
- 各 task の統合 review（`artifacts/reviews/tasks/<task-id>/review.md`）を完了し、単一の final `artifacts/reviews/final-review.md` を完了する。未解決の task-level または final review decision は archive をブロックする
- 実装と review の間は `artifacts/agents/worker-status.md` を implementer、spec reviewer、quality reviewer、controller の状態と揃える
- worker 状態が `PENDING`、`NEEDS_CONTEXT`、`BLOCKED` のままなら完了と見なさない。archive 前に `controller_status` は `DONE` でなければならない
- 実行状態の正は `state.json` とする
- 有効化された optional step は `tasks.md` と `verification.md` に出現していなければならない。goal では `artifacts/agents/task-graph.json` にも出現していなければならない
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

## コンテキストと修復ポリシー

- `.skillrc.workflow.document_review_policy` の既定値は `always`。`adaptive` は対象文書が `risk_level: low`（または `none`）を明示し、risk signal がない場合だけ deterministic inline preflight を使う。risk context の欠落、言語判定不能、解析失敗では独立 reviewer を dispatch する。
- `.skillrc.workflow.model_profiles` は `mechanical`、`standard`、`strong_reasoning`、`review`、`final_review` logical profile を target-specific model に対応付ける。未設定時は harness default と packet warning を使う。
- command runner は `OSPEC_USAGE_FILE` で normalized usage を自動集計し、`--usage-file` は手動 override として残る。`execution-metrics.json` は capability tier、model profile、workflow stage 別に集計し、complete/partial/missing coverage を報告する。
- actionable な review finding は stable ID、severity、category、message、file/line evidence、requirement refs、repair scope を持つ隣接 `*.findings.json` にも記録する。壊れた structured findings は暗黙に fallback せず blocking とする。
- archive 後、`docs/project/feature-index.md` は archive evidence と task が宣言した既存の永続 project document の両方をリンクし、`SKILL.index.json.documents` は AI 検索用の feature association を持つ。
- finalize/archive は classic change と goal ごとにローカライズされた `docs/project/changes/<archive-path>.md` を生成し、`SKILL.index.json.documents` と `archived_changes` に追加し、`feature-index.md` からリンクする。いずれかの link が欠けた場合は postcondition を失敗させる。active change を移動する前に、preflight は生成先にある人所有の文書の上書きを拒否し、管理対象の出力ディレクトリが書き込み可能であることを確認する。
- `ospec execute repair [change-path]` は final review が `NEEDS_CHANGES` の場合だけ全 findings を含む 1 repair task を作り、既存の dispatch、complete、task review、final review gate を再利用する。
