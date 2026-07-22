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
- ユーザーが Change を選択した場合は `ospec change` / `ospec-change` を使い、`ospec new` は alias として残す。複雑さ、flags、ファイル数、risk、batch size に関係なく 1.0 の高速フロー（`proposal.md`、`tasks.md`、実装、`verification.md`、`review.md`、`state.json`）に留める
- ユーザーが Goal を明示的に選択した場合だけ `ospec goal` / `ospec-goal` を使う
- `ospec execute …` コントローラ層（bootstrap、preflight、dispatch、launch、review、worktree、finish、collect、retry、sync）と goal 専用 artifacts はすべて `workflow_profile_id: goal` に属する。`workflow_profile_id: change` では、classic fast flow を維持し、controller 層や goal artifacts を読まず・実行せず、`proposal.md` と `tasks.md` を編集し、実装し、`verification.md` と `review.md` を記録してから top-level `ospec verify` と `ospec finalize` で閉じる。durable なユーザー選択には共有の `ospec execute decision` だけを使える
- AI 支援で goal を進める場合は、`proposal.md` の後、`implementation-plan.md`、`tasks.md`、コードを編集する前に `design.md` を作成または更新する。classic change では、ユーザーが明示的に goal へ昇格させない限り goal-only files を作成しない
- `Announce-Before-Act`: ワークフローを黙って実行しない。OSpec skill・段階、コマンドと生成物、選択された model-native subagent adapter、worker 数、current session capability、blocking gate を伝える
- `Brainstorm-First`: 各 goal は設計を確定する前に短いブレインストーミングから始める。方向、アーキテクチャ、API、データ、UI、リスク、スコープの未決事項を 1 つずつユーザーに質問し、黙って仮定しない。必要に応じて `ospec brainstorm [path] --topic "..."` で探索を保存する。いずれかが本当に未決のときは、黙って仮定を記録するより durable な decision gate を上げることを優先する。ユーザーが明示的に委任した、または不在のときだけ `design.md` に仮定を記録し、要確認の仮定として明記する
- change がユーザー選択を待つ必要がある場合は `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` で durable decision gate を記録し、decision report の `Chat Prompt` または `artifacts/agents/decisions/index.md` を提示してから、`ospec execute decision [changes/active/<change>] --id <id> --select <option-id>` で回答を記録する
- 利用可能ならネイティブの質問 UI で決定の選択肢を提示してから記録する（Claude Code では `AskUserQuestion`）。Claude Code では `ospec session hook --target claude --apply` が hook を導入し、毎ターンこの契約を再確認し、required な決定が未解決の間は subagent 派遣を強制ブロックする。ネイティブのピッカーがない harness（Codex、Gemini、Cursor、Copilot、OpenCode）では、代わりに decision report の `Chat Prompt` をチャットに提示して尋ねる——尋ねる手順はどの harness でも同じであり、`ospec execute dispatch` はどの harness でも required な決定が未解決の間ブロックするので、どの harness でも質問を省略しない
- goal では `design.md` から `implementation-plan.md` を作成または更新し、対象ファイル、期待結果、検証コマンド、依存関係、並行可能な作業、競合を記録する
- goal では `implementation-plan.md` から `artifacts/agents/task-graph.json` を導く。各 task には id、状態、依存関係、並行安全性、競合、対象ファイル、検証コマンド、期待結果、worker role を含める。`target_files` が他の ready task と重ならず、依存もない task はすべて `parallelizable: true` にする。task 同士がファイルを共有するか実際に依存する場合のみ `parallelizable: false` を残し、`serial_reason` と `conflicts_with` を記録する。すべてを既定で直列にせず、安全な graph を 1 worker に制限する場合は `maxParallelReason` を記録する。6 個を超える `target_files` は task を分割し、1 つの atomic verification boundary が必要な場合だけ具体的な `scope_reason` を記録する
- optional allowlist は安全な置換であり、暗黙の追加ではない。追加境界が必要な場合だけ `ospec loop allowlist derive/check/apply --from-task-graph` を使い、CAS 差分と権限拡張を明示的に確認する。
- design/plan stage は deterministic inline preflight を使い、その後に独立した combined planning review を 1 回実行する。grouped planning repair と fresh re-review は各 1 回だけ許可し、再失敗は安定して block する。
- review repair は収束させる。共有ファイルを変更する downstream task は推移的 upstream の regression obligation を継承する。既定の 2 round は収束しきい値であり、structured finding ID が変化すれば自動続行する。同じ ID でも structured finding fingerprint と直前に許可された repair scope 内の code snapshot が両方変化した場合だけ続行できる。continuous mode では、停滞した task または final finding 集合に、その正確な scope と finding ID に対する durable strategy escalation を 1 回だけ発行する。root cause の再評価と focused regression を要求する packet を 1 回実行し、同じ集合が停滞したままなら停止する。strict mode は設定済み上限を維持する。final review が `BLOCKED` の場合は blocker の解決まで停止し、grouped repair に進めない。変化しない作業を繰り返すために上限を引き上げてはならない。
- すべての harness で native child の待機を bounded にする。Codex/GPT の `wait_agent`、Claude Task polling、その他の native wait は 60 秒以内に戻る。この 60 秒は controller poll 1 回の上限であり、child runtime の上限ではない。各 live child を `heartbeatDueAt` 前に更新し、完了時は action の `loop finalize` で evidence と result を atomic に保存して poll ごとに再 tick する。child は action deadline まで複数 poll にまたがって実行でき、evidence 完了後には bounded result grace がある。capacity 不明時の implementation は既定の並列数 3 を使用し、安全な review 並列性は維持する。harness が現在のより大きな child capacity を確実に把握できる場合は active controller session に結び付けて報告し、必要に応じて `maxParallel` を引き上げられるが、capacity を推測したり古い値を再利用してはならない。
- 成功した bounded controller poll は、claim 済みの live child の短期 lease を更新するが、absolute deadline は延長しない。短期 lease 境界から bounded な 60 秒 wait 以内に到着した poll は同じ claim 済み item を更新できるが、期限切れ result の直接送信は拒否し、実際に失われた item は expire し、absolute deadline は動かさない。retryable な dependent work は worker retry より先に不足する prerequisite review を実行する。cross-task finding の追加 path は task graph の完了済み owner に属する場合だけ許可し、完全な scope を snapshot 化して変更された owner を再 review する。記録済み cross-task owner が未承認の間、その review または repair を新しい implementation と retryable worker より優先し、競合しない他の reviewer は並列実行できる。service 未指定の full Docker Compose rebuild の前には project release guidance を確認し、無関係な service があれば明示的な service 名を使用する。
- one active Goal を開始または再開するときは、`ospec execute bootstrap [changes/active/<goal>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、そこにある次の安全な action に従う。classic Change は `ospec progress`、top-level `ospec verify`、`ospec finalize` を使う
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|cursor|copilot|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書く。このコマンドは project session brief snapshot、target tool mapping、safety rules のみを記録し、worker 起動や source file 編集は行わない
- task graph 導出前に `ospec execute preflight [changes/active/<change>] --stage design`、続いて `--stage plan` を実行し、project session brief snapshot を含む deterministic inline preflight packet と approval artifact を作成する。両方の preflight 通過後に task graph を導出または更新する。コマンドは reviewer child、shell command、worker status 同期、source file 編集を実行しない。通常の red test、production implementation、green/refactor evidence は 1 つの atomic task にまとめる
- task 作業を割り当てる前に、`ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` で controller 状態と安全な次の task 候補を確認する
- Use `ospec execute route [changes/active/<change>]` to write `artifacts/agents/workflow-route.json` and `artifacts/agents/workflow-route.md` with the next recommended OSpec command; this records workflow routing artifacts only and does not edit source files.
- direction、architecture、API、UI、risk、scope に明示的な user choice が必要な場合は `ospec execute decision [changes/active/<change>] ...` を使う。required pending decisions は bootstrap/status/finish と `artifacts/agents/decisions/index.md` に表示され、selected または skipped まで dispatch をブロックする
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で `artifacts/agents/workspace-status.json` と `artifacts/agents/workspace-status.md` を書く。既存 Goal の再開では、非 `PENDING` task の target file、開始済み task の宣言済み build/typecheck 検証から導出される package-local の exact `tsconfig.tsbuildinfo`、または現在のハッシュ検証済み `ospec update` provenance に正確に属する dirty path だけを許可し、それ以外は `needs_isolation` のままにする
- isolated worktree を作成する前に、`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録する。このコマンドは準備計画のみを記録し、`git worktree add` は実行しない
- final closeout の前に、`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録する。このコマンドは readiness と command text のみを記録し、finalize、archive、push、merge、worktree 削除は実行しない。finish plan の status が ready で required pending decision がない場合は、続けて `ospec finalize [changes/active/<change>]` を実行する。`ospec archive ... --check` は任意の dry-run preview のみで、通過後にそこで止めない
- 準備ができたら closeout は自動：`ospec verify [changes/active/<change>]` が通過し、required pending decision や blocking なプラグイン gate がない場合は、自分で `ospec finalize [changes/active/<change>]` を実行する——通過した `ospec verify` や `ospec archive ... --check`（`--check` は preview のみ）で止まらず、ユーザーの依頼を待たない。closeout を止めるのは gate が本当に人を必要とするときだけ：未回答の required decision、未承認の blocking プラグイン gate（例：Stitch や Checkpoint）、verify や archive が報告する実際の blocker、またはユーザーが archive 前に preview/承認を明示的に求めた場合
- 強制 archive はユーザーが明示した例外であり、自動 fallback ではない。失敗 gate とすべての `NOT_VERIFIED` 項目を報告する。pending Loop pointer が残っていても、全 item が永続的に `completed`、`failed`、`expired` のいずれかなら安全である。状態欠落、`issued`、`running` は引き続き archive を阻止する。その後 `ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <正確な-change-名> --reason "<受容するリスク>"` を実行する。失敗を pass に書き換えず、archive は incomplete / accepted-risk のままにする。
- 決定ゲートと brainstorm の選択肢はユーザーのもの：**推奨オプションを自動選択したり、自分でゲートを resolve したりしない**——能力ラダー（ネイティブ質問 UI → plan/承認 UI → 素のチャットテキスト）で各ゲートをユーザーに提示し、ユーザーの実際の選択を待つ。required ゲートはユーザーが答えるまで実装とディスパッチをブロックし、`recommended` はユーザーに見せるヒントにすぎない
- あなたが作成するすべての change ドキュメントと brainstorm は、プロジェクトのドキュメント言語（`.skillrc` の `documentLanguage` / 管理対象の `for-ai/` ガイダンス）で書く。1 つの change 内で中国語と英語を混在させない
- `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` で parallel-safe な worker packet batch と `artifacts/agents/execution-session.json` を作成する。各 packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれる。`ospec execute complete <task-id> ...` で worker 結果を記録する。`--task` は明示的な単一 task、`--limit` は dispatch batch size の上限に使う。これらのコマンドは `artifacts/agents/worker-status.md` も同期し、OSpec artifacts のみを更新し、外部 worker は起動しない。結果が `NEEDS_CONTEXT` または `BLOCKED` の場合、`complete` は `artifacts/agents/blockers/` に blocker escalation を書く
- 外部/手動 acceptance を無関係な実装 task の critical path に置かない。durable implementation があり、外部 acceptance だけが未取得で `BLOCKED` の場合、ユーザーが final gate への延期を明示的に承認した後で `ospec execute defer-blocker <task-id> [change-path] --reason "..."` を実行する。task は blocked・未チェックのまま dependency-safe な実装だけを続行し、実証が揃うまで final review、verify、finalize、archive は引き続きブロックする
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--dry-run] [--json]` で launch plan を書く。`runtimeAdapter` は current かつ target-bound な model-native subagent capability のみを受け入れる。single-task dispatch はこの plan を自動生成する
- `runtimeAdapter.selected.nativeSubagent` を実行し、安全な batch だけを並列 dispatch する。capability がない、または期限切れの場合は block し、agent CLI や current controller に fallback しない
- `IDE-CONTROLLER-AUTO-DISPATCH`: すべての Goal は同じ実行可能な fast quality workflow を使う。IDE AI が tick -> model-native subagent で全 `actions[]` を実行 -> heartbeat/result evidence -> 即時 tick を担当する。`actions[]` が空で `pending` がある場合は観察のみで再 dispatch しない
- agent CLI execution は削除された。`execute orchestrate`、`launch --run --command`、`review --run --command`、`loop watch` は process 起動や run artifact 作成の前に失敗する。native work の再実行には `ospec execute retry` を使う
- controller-owned Goal では、各 worker task 完了後に `ospec loop tick [changes/active/<change>]` で実 executor provenance に結び付いた統合 review と task-scoped package を作成する。`ospec execute review ... --task <task-id>` を直接使うのは non-controller workflow のみとする
- task review は、その task の正確な canonical `artifacts/agents/worker-reports/<task-id>.md` を target snapshot に結び付ける。repair が編集できるのは同じ task の正確な report path だけであり、別 task の report と任意の controller artifact は引き続き block する。legacy finding が snapshot 未登録の canonical report を指す場合は、history を手編集せず、Loop が発行する fresh task-review action を実行してから repair する
- task graph で `documentation_updates` を有効にした場合、各 task に配列を持たせ（不要なら `[]`）、宣言した docs path を同じ task の `target_files` に含め、dispatch から complete までの有意な content change evidence を残す。既存 baseline が完了時に missing になったことを evidence が証明する reviewed deletion は有効な変更である。複数 repair attempt では finalize が最初の baseline と最後の完了状態を比較し、workspace がその path の最新 declared owner evidence と一致することを要求するため、古い変更や後続の reversion は通過しない。controller closeout が最後の worker dispatch 後に宣言 path を変更した場合、その最終状態を許可できるのは、より後に実行され、executor provenance が有効で、現在の target snapshot と完全一致する APPROVED task review だけであり、meaningful-change chain の代わりにはならない。baseline のない旧 run は宣言文書が現在も存在する場合だけ互換性を保ち、未検証と表示する。
- task graph 完了後の final review も controller Loop の次の `ospec loop tick` で発行する。`--task` なしの `ospec execute review` を直接使うのは non-controller workflow のみとする
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

- design/plan deterministic preflight、task graph 導出、独立 combined planning review の順に実行し、grouped planning repair と fresh re-review は各 1 回までとする。
- `.skillrc.workflow.model_profiles` は `mechanical`、`standard`、`strong_reasoning`、`review`、`final_review` logical profile を target-specific model に対応付ける。未設定時は harness default と packet warning を使う。
- command runner は `OSPEC_USAGE_FILE` で normalized usage を自動集計し、`--usage-file` は手動 override として残る。`execution-metrics.json` は capability tier、model profile、workflow stage 別に集計し、complete/partial/missing coverage を報告する。
- actionable な review finding は stable ID、severity、category、message、file/line evidence、requirement refs、repair scope を持つ隣接 `*.findings.json` にも記録する。壊れた structured findings は暗黙に fallback せず blocking とする。
- archive 後、`docs/project/feature-index.md` は archive evidence と task が宣言した既存の永続 project document の両方をリンクし、`SKILL.index.json.documents` は AI 検索用の feature association を持つ。
- finalize/archive は classic change と goal ごとにローカライズされた `docs/project/changes/<archive-path>.md` を生成し、`SKILL.index.json.documents` と `archived_changes` に追加し、`feature-index.md` からリンクする。いずれかの link が欠けた場合は postcondition を失敗させる。active change を移動する前に、preflight は生成先にある人所有の文書の上書きを拒否し、管理対象の出力ディレクトリが書き込み可能であることを確認する。
- `ospec execute repair [change-path]` は final review が `NEEDS_CHANGES` の場合だけ全 findings を含む 1 repair task を作り、既存の dispatch、complete、task review、final review gate を再利用する。
