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
5. 現在の brief または dispatch packet を最初に読み、現在の段階に必要な change artifact、対象ファイル、索引済みの project/archive 文書だけを開く。すべての goal artifact を既定で読み込まない
6. Stitch が有効で、現在の change が `stitch_design_review` を有効化している場合は、先に `artifacts/stitch/approval.json` を確認する
7. Stitch / Checkpoint のインストール、provider 切り替え、doctor 修復、MCP 設定、認証設定、またはプラグイン有効化が必要な場合は、先にプロジェクト文書言語に一致するリポジトリ内のローカライズ済みプラグイン仕様を読む。一致する言語ファイルがない場合のみ他言語版へフォールバックする

## 必須動作

- `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` と、goal-only artifacts（`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/agents/bootstrap.md`、`artifacts/agents/handoff.md`、`artifacts/agents/planning-preflights/`、`artifacts/agents/workspace-status.md`、`artifacts/agents/worktree-plan.md`、`artifacts/agents/finish-plan.md`、`artifacts/agents/launch-plan.md`、`artifacts/agents/worker-runs/`、`artifacts/agents/review-runs/`、`artifacts/agents/retries/`、`artifacts/agents/blockers/`、`artifacts/agents/decisions/`、`artifacts/agents/review-feedback-plan.md`、`artifacts/reviews/design-review.md`、`artifacts/reviews/implementation-plan-review.md`、`artifacts/reviews/final-review.md`、`artifacts/agents/worker-status.md`、`artifacts/agents/debug-evidence.json`、`artifacts/agents/tdd-evidence.json`、`artifacts/agents/verification-evidence.json`）はプロジェクト採用の文書言語で維持する
- 製品 UI、サイト locale、または「英語優先」という要件だけから change 文書言語を推測しない
- プロジェクト採用プロトコルが中国語、または現在の change 文書がすでに中国語なら、明示的なルール変更がない限り change 文書は中国語のまま維持する
- 目的の文書を読む前に、まず index を使って知識の所在を確認する
- 既存の OSpec project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書き、active work の `change` / `goal` profile、queued change、queue run、cache fingerprint、profile-aware な次の command を記録する。classic Change は 5 つの core file を直接読み、Goal だけが `ospec execute bootstrap` を使う
- `tdd_cycle`、`root_cause_debug`、`verification_evidence` など有効化された built-in quality policy steps は、archive-gated `optional_steps` として扱う。closeout 前に `tasks.md`、`verification.md`、対応する evidence artifacts で coverage を記録する
- ユーザーが Change を選択した場合は `ospec change` / `ospec-change` を使い、`ospec new` は alias として残す。複雑さ、flags、ファイル数、risk、batch size に関係なく 1.0 の高速フロー（`proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`）に留める
- ユーザーが Goal を明示的に選択した場合だけ `ospec goal` / `ospec-goal` を使う
- `ospec execute …` コントローラ層（bootstrap、preflight、dispatch、launch、review、worktree、finish、collect、retry、sync）と goal 専用 artifacts はすべて `workflow_profile_id: goal` に属する。`workflow_profile_id: change` では、classic fast flow を維持し、controller 層や goal artifacts を読まず・実行せず、`proposal.md` と `tasks.md` を編集し、実装し、`verification.md` と `review.md` を記録してから top-level `ospec verify` と `ospec finalize` で閉じる。durable なユーザー選択には共有の `ospec execute decision` だけを使える
- AI 支援で goal を進める場合、ユーザーに `design.md` や `implementation-plan.md` の手書きを求めない。要件、`proposal.md`、プロジェクト文脈からそれらを作成または更新してから `artifacts/agents/task-graph.json` を導出し、`tasks.md` やコードを編集する
- classic change では、ユーザーが明示的に goal へ昇格させない限り goal-only files を作成しない
- `Announce-Before-Act`: ワークフローを黙って実行しない。OSpec skill・段階、コマンドと生成物、選択された model-native subagent adapter、worker 数、current session capability、blocking gate を伝える
- `Brainstorm-First`: 各 goal は設計を確定する前に短いブレインストーミングから始める。方向、アーキテクチャ、API、データ、UI、リスク、スコープの未決事項を 1 つずつユーザーに質問し、黙って仮定しない。必要に応じて `ospec brainstorm [path] --topic "..."` で探索を保存する。いずれかが本当に未決のときは、黙って仮定を書くより durable な decision gate を上げることを優先する。ユーザーが明示的に委任した、または不在のときだけ `design.md` に仮定を記録し、要確認の仮定として明記する
- change がユーザー選択を待つ必要がある場合は `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` で durable decision gate を記録し、decision report の `Chat Prompt` または `artifacts/agents/decisions/index.md` を提示してから、`ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` で回答を記録する
- goal では `implementation-plan.md` は `design.md` から導き、`artifacts/agents/task-graph.json` は `implementation-plan.md` から導き、`tasks.md` は task graph から導く。既存 tasks は上流文書の更新後に整合させる。classic change では `tasks.md` を `proposal.md` と実装範囲から直接導く
- one active Goal を開始または再開するときは、`ospec execute bootstrap [changes/active/<goal>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、そこにある次の安全な action に従う。active dispatch がある場合、bootstrap は対応する `ospec execute launch ... --task ...` command を推奨する。classic Change は `ospec progress`、top-level `ospec verify`、`ospec finalize` を使う
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録し、worker 起動や source file 編集は行わない
- task graph を導出する前に、`ospec execute preflight [changes/active/<change>] --stage design`、続いて `--stage plan` を実行する。どちらも deterministic inline readiness preflight と監査可能な approval artifact の記録だけを行い、reviewer child は起動しない。両方が通過した後に `task-graph.json` を導出または更新する。通常の red test、production implementation、green/refactor evidence は、test harness 自体が独立して再利用可能な成果物でない限り、1 つの atomic task にまとめる
- ready、blocked、running、completed と安全な次 task 候補を確認する必要がある場合は、`ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` を使って controller view を確認する
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で git workspace safety を記録する。既存 Goal では、非 `PENDING` task の target file、開始済み task の宣言済み build/typecheck 検証から導出される package-local の exact `tsconfig.tsbuildinfo`、または現在のハッシュ検証済み `ospec update` provenance に属する dirty path だけを保持でき、それ以外は `needs_isolation` のままにする
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録する。このコマンドは準備計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない。finish plan の status が ready で required pending decision がない場合は、続けて `ospec finalize [changes/active/<change>]` を実行する。`ospec archive ... --check` は任意の dry-run preview のみで、通過後にそこで止めない
- 準備ができたら closeout は自動：`ospec verify [changes/active/<change>]` が通過し、required pending decision や blocking なプラグイン gate がない場合は、自分で `ospec finalize [changes/active/<change>]` を実行する——通過した `ospec verify` や `ospec archive ... --check`（`--check` は preview のみ）で止まらず、ユーザーの依頼を待たない。closeout を止めるのは gate が本当に人を必要とするときだけ：未回答の required decision、未承認の blocking プラグイン gate（例：Stitch や Checkpoint）、verify や archive が報告する実際の blocker、またはユーザーが archive 前に preview/承認を明示的に求めた場合
- 強制 archive はユーザーが明示した例外であり、自動 fallback ではない。失敗 gate とすべての `NOT_VERIFIED` 項目を報告する。pending Loop pointer が残っていても、全 item が永続的に `completed`、`failed`、`expired` のいずれかなら安全である。状態欠落、`issued`、`running` は引き続き archive を阻止する。その後 `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <正確な-change-名> --reason "<受容するリスク>"` を実行する。失敗を pass に書き換えず、archive は incomplete / accepted-risk のままにする。
- 決定ゲートと brainstorm の選択肢はユーザーのもの：**推奨オプションを自動選択したり、自分でゲートを resolve したりしない**——能力ラダー（ネイティブ質問 UI → plan/承認 UI → 素のチャットテキスト）で各ゲートをユーザーに提示し、ユーザーの実際の選択を待つ。required ゲートはユーザーが答えるまで実装とディスパッチをブロックし、`recommended` はユーザーに見せるヒントにすぎない
- あなたが作成するすべての change ドキュメントと brainstorm は、プロジェクトのドキュメント言語（`.skillrc` の `documentLanguage` / 管理対象の `for-ai/` ガイダンス）で書く。1 つの change 内で中国語と英語を混在させない
- task-level の永続 handoff には `ospec execute dispatch` と `ospec execute complete` を使う。packet には project session brief snapshot、worker profile、target tool mapping を含め、`--task` と `--limit` で範囲を指定する。controller-owned Goal の task/final review は `ospec loop tick [changes/active/<change>]` で発行し、`artifacts/agents/review-dispatches/` を実 executor provenance に関連付ける。`ospec execute review` は non-controller workflow のみとし、review 後は `ospec execute feedback`、手動変更後は `ospec execute sync` を使う
- トークン節約（gate は変えない）：`ospec execute …` と `ospec loop status` に `--brief` を付け、brief status と action の packet path から進める。再 review では prior findings sidecar/resolution summary を先に読み、task graph、worker status、launch plan、goal documents 全体は必要時だけ開く
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot] [--dry-run] [--json]` で launch plan を書く。`runtimeAdapter` は current かつ target-bound な model-native subagent capability のみを受け入れ、native primitive を示す
- `runtimeAdapter.selected.nativeSubagent` を実行し、安全な batch だけを並列 dispatch する。capability がない、または期限切れの場合は block し、agent CLI や current controller に fallback しない
- `IDE-CONTROLLER-AUTO-DISPATCH`: すべての Goal は同じ実行可能な fast quality workflow を使う。IDE AI が tick -> model-native subagent で全 `actions[]` を実行 -> 各 child を一度 claim -> wait の間は `loop poll` -> `tickNow=true` のときだけ完全 tick を担当する。`actions[]` が空で `pending` がある場合は観察状態であり、wait/poll のみで再 dispatch しない
- agent CLI execution は削除された。`execute orchestrate`、`launch --run --command`、`review --run --command`、`loop watch` は process 起動や run artifact 作成の前に失敗する。native work の再実行には `ospec execute retry` を使う
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." --status FIXED` で root cause と fix evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- focused test 実行後は、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で TDD cycle evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- fresh project checks を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED --exit-code 0` で verification evidence を記録する。このコマンドは evidence の記録のみを行い、shell command は実行しない
- `ospec execute preflight` は artifacts のみを記録し、reviewer 起動、shell command 実行、worker status 同期、source file 編集は行わない
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

## 実行効率ポリシー

- design/plan deterministic preflight、task graph 導出、独立 combined planning review の順に実行する。grouped planning repair 1 回と delta re-review 最大 1 回までとし、planning 内容を変更しない executor 失敗は許容量を再アームし、findings がすべて medium 以下なら repair 後に `APPROVED_WITH_CONCERNS` として決定論的に確定する。task review、final combined review、verification は引き続き必須。
- 進捗チェックリストは実態を反映する：proposal.md の受け入れ基準は検証エビデンス通過時にチェック（`[verify:<id>]` 付き項目は `ospec execute sync` が自動チェック）し、未チェック項目は archive をブロックする。Goal の review.md は sync が final review から派生する。手動編集は禁止。
- worker/reviewer の logical model profile は launch override を含む実際の dispatch target に対して解決する。requested/configured model と provider-observed model を分離し、provider/usage evidence がなければ observed model は unknown とする。
- command runner は `OSPEC_USAGE_FILE` を受け取り sidecar を自動集計する。`ospec execute complete ... --usage-file usage.json` は手動入力として残す。metrics は source、observed fields、complete/partial/missing coverage を記録し、未報告値を測定済み 0 として扱わない。
- reviewer は人向け Markdown と、stable ID、severity、category、message、file/line evidence、requirement refs、repair scope を持つ隣接 `*.findings.json` を書く。旧 Markdown は repair 前に互換 sidecar へ変換する。
- 同じ root defect が狭まる間は finding ID を維持する。収束しきい値を超えた後、OSpec は structured finding fingerprint と直前に許可された repair scope 内の code snapshot が両方変化した場合だけ同じ ID を続行する。新しい ID の捏造や evidence の言い換えだけで repair を強制しない。
- 宣言された各 `documentation_updates` path について dispatch と complete が正規化 content hash を保存する。新規 run で有意な変更がなければ documentation gate は失敗し、baseline のない旧 run は未検証と表示する。archive index は完了 feature から更新済みの永続 project document を直接リンクする。
- finalize/archive が成功するたびに、archive 済み change または goal 用のローカライズされた `docs/project/changes/<archive-path>.md` を 1 つ生成し、両方の index がリンクすることを検証する。active change を移動する前に、archive preflight は生成先にある人所有の文書の上書きを拒否し、管理対象の出力ディレクトリが書き込み可能であることを確認する。この共通 change record は必要な architecture、API、module、operation 文書の代わりにはならない。
- final review が `NEEDS_CHANGES` の場合、required decisions 解決後に `ospec execute repair` で全 findings を 1 repair task にまとめ、covering verification、task review、final re-review を各 1 回行う。
