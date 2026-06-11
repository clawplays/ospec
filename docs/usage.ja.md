# 使い方

OSpec を主に AI で使う場合は、まず短い `/ospec` または `/ospec-change` を使ってください。このページの CLI コマンドは、フォールバックや明示的な自動化が必要なときに使います。

## よく使うコマンド

```bash
ospec status [path]
ospec session [path]
ospec session hook [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual]
ospec plan [path] [--change changes/active/<change>] [--from-brainstorm file] [--output id] [--apply]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec run status [path]
ospec execute bootstrap [changes/active/<change>]
ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]
ospec execute doc-review [changes/active/<change>] [--stage design|plan]
ospec execute status [changes/active/<change>]
ospec execute next [changes/active/<change>]
ospec execute workspace [changes/active/<change>]
ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --create [--branch name] [--path path] [--base ref]
ospec execute worktree [changes/active/<change>] --cleanup [--path path]
ospec execute finish [changes/active/<change>] [--target main] [--remote origin]
ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]
ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only
ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] --run --command "..." [--timeout-ms N] # fallback only
ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]
ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]
ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..." [--timeout-ms N] [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]
ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]
ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."
ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."
ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."
ospec execute sync [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

## プラグインの最短手順

推奨プロンプト:

```text
/ospec このプロジェクトで Stitch プラグインを開いてください。
/ospec このプロジェクトで Checkpoint プラグインを開いてください。
```

AI / `/ospec`:

- 「Stitch を開いて」と言われたら、まず Stitch がグローバルインストール済みか確認し、未インストールならインストールし、その後で現在のプロジェクトに対して有効化する意味として扱います
- 「Checkpoint を開いて」と言われたら、まず Checkpoint がグローバルインストール済みか確認し、未インストールならインストールし、その後で現在のプロジェクトに対して有効化する意味として扱います
- 詳細なプラグイン文書は、有効化後に `.ospec/plugins/<plugin>/docs/` へ同期されます
- インストール前に `ospec plugins info <plugin>` または `ospec plugins installed` を確認します
- プラグインがすでにグローバルインストール済みなら、インストールはスキップして現在のプロジェクトでの有効化だけを行います
- `ospec plugins update --all` は、ユーザーが「インストール済みプラグインを全部更新したい」と明示した場合にだけ実行します

コマンドライン:

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

## 推奨フロー

推奨プロンプト:

```text
/ospec でこのプロジェクトを初期化してください。
/ospec-change でこの要件の change を作成して進めてください。
/ospec で承認済みの change をアーカイブしてください。
```

新しいディレクトリでは次の流れを推奨します。

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

## Change 設計文書

`ospec new <change-name> [path]` は、通常の `proposal.md` / `tasks.md` フローの周辺に `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`artifacts/reviews/spec-compliance.md`、`artifacts/reviews/code-quality.md`、`artifacts/agents/worker-status.md` を作成します。

- workflow flags は built-in agent quality policy steps として `tdd_cycle`、`root_cause_debug`、`verification_evidence` を有効化できます。有効化された steps は change frontmatter の `optional_steps` に書かれ、`tasks.md`、`verification.md`、archive readiness で coverage が必要です。
- `proposal.md` には、変更理由、範囲、受け入れ条件を記録します。
- 既存の OSpec project に入るときは `ospec session [path]` で `.ospec/session-brief.json` と `.ospec/session-brief.md` を書き、active change、queue、cache fingerprint、次の安全な command context を記録します。これは project entry brief であり、active change の `ospec execute bootstrap` を置き換えません。
- `ospec session hook [path]` は `.ospec/hooks/session-start.json` と `.ospec/hooks/session-start.md` を書き、harness の session-start 統合を opt-in にします。この hook は session brief の更新だけを行い、worker 起動、test 実行、git inspect、archive、source file 編集は行いません。
- `ospec brainstorm [path] --topic "..."` は、change 作成前の探索 artifact を `.ospec/brainstorms/` に残したい場合だけ使います。`--visual` を付けると local static HTML companion も作成します。この command は change を作成しません。
- `ospec plan [path] --change changes/active/<change>` は `.ospec/plans/<id>/plan-draft.md` に plan draft を作成します。その change の `implementation-plan.md` を更新するときだけ `--apply` を付けます。
- `design.md` には、実装前に採用方針、主なトレードオフ、影響する境界、リスク、未解決事項を記録します。
- `implementation-plan.md` には、設計を agent 実行可能な手順へ変換し、ファイル、期待結果、検証コマンド、依存関係、競合を記録します。
- `artifacts/agents/task-graph.json` には、task ID、依存関係、並行安全性、競合、対象ファイル、検証コマンド、期待結果、worker role、task 状態を機械可読な実行グラフとして記録します。
- explicit queue runner を使う場合は、`ospec run status [path]` で現在の queue run と active change task graph snapshot を確認できます。completed、running、dispatchable、blocked、invalid の件数と next action を表示します。
- `ospec run start`、`run resume`、`run step`、`run status` の next instruction は active task graph を参照します。dispatchable work がある場合は `ospec execute dispatch ...` を示しますが、runner は worker dispatch や source file 編集を行いません。
- one active change を開始または再開するときは、`ospec execute bootstrap [changes/active/<change>]` で project session brief snapshot を含む `artifacts/agents/bootstrap.json` と `artifacts/agents/bootstrap.md` を書き、出力された次の安全な action に従います。active dispatch が既にある場合、bootstrap は対応する `ospec execute launch ... --task ...` command を推奨します。
- change を agent、tool、worktree、shell、human operator の間で引き渡すときは、`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]` で `artifacts/agents/handoff.json` と `artifacts/agents/handoff.md` を書きます。project session brief snapshot、target tool mapping、command sequence、safety rules、missing-context warnings を記録します。
- implementation dispatch の前に `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` を使うと、project session brief snapshot を含む `artifacts/agents/document-review-dispatches/*` packet と `artifacts/reviews/design-review.md` または `artifacts/reviews/implementation-plan-review.md` を作成します。design review が approved になる前に plan review は dispatch しません。
- `ospec execute status [changes/active/<change>]` または `ospec execute next [changes/active/<change>]` で、controller 状態と次に安全に割り当てられる task 候補を確認します。
- worker handoff の前に `ospec execute workspace [changes/active/<change>]` で `artifacts/agents/workspace-status.json` と `artifacts/agents/workspace-status.md` を記録します。status が `needs_isolation` の場合は、workspace を clean にするか isolated git worktree に移してから parallel dispatch します。
- isolated worktree を作成する前に `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` で `artifacts/agents/worktree-plan.json` と `artifacts/agents/worktree-plan.md` を記録します。plan mode は recommended branch、path、base ref、command text のみを記録し、git は実行しません。
- `ospec execute worktree [changes/active/<change>] --create ...` は、OSpec に `git worktree add` を実行させたい場合だけ明示的に使います。結果は `artifacts/agents/worktree-runs/` に記録されます。
- `ospec execute worktree [changes/active/<change>] --cleanup [--path path]` は、OSpec に `git worktree remove` を実行させたい場合だけ明示的に使います。cleanup は branch 削除、push、merge、archive、test 実行を行いません。
- final closeout の前に `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` で `artifacts/agents/finish-plan.json` と `artifacts/agents/finish-plan.md` を記録します。task graph、reviews、verification evidence、worker status、git cleanliness を確認し、suggested commands のみを記録して実行しません。
- `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` で parallel-safe な `artifacts/agents/dispatches/*` の worker packet batch と `artifacts/agents/execution-session.json` を作成します。各 packet には project session brief snapshot と、capability tier、recommended target、target tool mapping、rationale、required behavior を示す worker profile が含まれ、複雑な task を強い worker に、単純な task を軽量 worker に振り分けやすくします。`ospec execute complete <task-id> ...` で worker 結果を記録します。`--task` は明示的な単一 task、`--limit` は batch size の上限に使います。どちらも `artifacts/agents/worker-status.md` を同期します。completion が `NEEDS_CONTEXT` または `BLOCKED` を記録した場合、OSpec は controller follow-up 用に `artifacts/agents/blockers/` escalation files を書きます。
- dispatch 後は `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]` で native agent launch plan を書きます。Codex/GPT は `spawn_agent`/`wait_agent`/`close_agent`、Claude Code は Task、Gemini は `@generalist`、OpenCode は `@mention` を使うよう controlling AI に指示します。この command 自体は worker 起動や shell command 実行を行いません。
- multi-worker execution は current harness native subagents が default です。`ospec execute dispatch` で safe packet を作り、`launch-plan.md` を読んで、各 safe packet に native worker agent を dispatch し、結果を `ospec execute complete` で記録します。
- `ospec execute orchestrate [changes/active/<change>] --command "..."` は native subagents が使えない場合だけの final CLI fallback です。fallback mode は explicit command template で worker command を並行実行し、`artifacts/agents/orchestration-runs/` と task graph collect を記録します。
- `ospec execute launch ... --run --command "..."` は native subagents が使えない、または明示的に bypass する場合だけの single-worker CLI fallback です。OSpec は stdout/stderr、exit code、timeout metadata を `artifacts/agents/worker-runs/` に記録します。その後 `ospec execute collect ...` でその run を task completion state に変換します。
- blocked、needs-context、failed の worker run を修正した後は、`ospec execute retry [changes/active/<change>] --task task-id` を使います。`artifacts/agents/retries/` を書き、task を reopen し、新しい dispatch packet を作成します。完了済み task は explicit `--force` が必要です。
- 各 worker task 完了後、`ospec execute review [changes/active/<change>] --task <task-id> --stage spec`、続けて `--stage quality` を使います。task-level review decision は `artifacts/reviews/tasks/<task-id>/` に保存され、dependent task は両方の review が承認されるまで dispatch されません。
- すべての task-level review が承認され task graph が完了した後、`--task` なしの `ospec execute review [changes/active/<change>] [--stage spec|quality]` で final whole-change `artifacts/agents/review-dispatches/*` reviewer handoff packet を作成します。`--stage` を省略すると final spec review を先に割り当て、final spec 承認後に final quality review を割り当てます。
- `ospec execute review ... --run --command "..."` は、OSpec に local reviewer command を実行させたい場合だけ明示的に使います。OSpec は run を `artifacts/agents/review-runs/` に記録し、`--decision` がある場合は対応する task-level または final review artifact を更新できます。
- review artifact が non-`PENDING` decision を持つ場合は `ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]` で `artifacts/agents/review-feedback-plan.json` と `artifacts/agents/review-feedback-plan.md` を書きます。追加作業を dispatch する前に、feedback を accept、revise、clarify、unblock のどれで扱うか記録します。
- debugging が change の一部だった場合、`ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED` で `artifacts/agents/debug-evidence.json` と debug evidence report を記録します。`CONFIRMED` は root cause の隔離、`FIXED` は verified fix、`BLOCKED` は verify failure を意味します。
- focused test 実行後、`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` で `artifacts/agents/tdd-evidence.json` と cycle ごとの evidence report を記録します。red phase は通常、期待どおり失敗する test を記録し、green/refactor phase は passing result を記録します。
- fresh project checks を実行した後、`ospec execute verify [changes/active/<change>] --command "..." --status PASSED` で `artifacts/agents/verification-evidence.json` と run ごとの evidence report を記録します。
- `ospec execute sync [changes/active/<change>]` は、task graph、execution session、review artifacts、verification checklist を手動編集した後に `artifacts/agents/worker-status.md` を再構築します。
- `tasks.md` には、確認済みの実行計画を実行可能な作業へ分解します。
- task-level spec review を先に使い、その後同じ task の quality review で確認します。final review では `artifacts/reviews/spec-compliance.md` を先に使い、その後 `artifacts/reviews/code-quality.md` で確認します。
- `artifacts/agents/worker-status.md` には implementer、spec reviewer、quality reviewer、controller の状態を記録します。
- AI / `/ospec-change` フローでは、AI が要件、`proposal.md`、プロジェクト文脈から `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json` を作成または更新します。ユーザーは仮定の確認や重要判断の修正だけを行えば十分です。
- CLI のみのフローでは、`tasks.md` の前に `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json` を手動編集し、その後で `ospec verify [changes/active/<change>]` を実行できます。
- Task graph の状態値は `DONE`、`DONE_WITH_CONCERNS`、`IN_PROGRESS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING` です。archive 準備にはトップレベルの `status: "completed"` と、全 task の `DONE` または `DONE_WITH_CONCERNS` が必要です。
- `ospec execute bootstrap`、`handoff`、`doc-review`、`status`、`next` は、`bootstrap`、`handoff`、`doc-review` が自身の artifacts を書く点を除いて read-only です。`workspace`、plan mode の `worktree`、`finish` は git/artifact state を inspect して workspace/worktree/finish artifacts を書くだけです。`dispatch`、`launch`、`collect`、`retry`、`complete`、`review`、`feedback`、`debug`、`tdd`、`verify`、`sync` は OSpec artifacts、task graph、launch-plan、worker-runs、review-runs、retries、review-dispatch、review-feedback-plan、debug-evidence、tdd-evidence、verification-evidence、worker-status 状態だけを更新し、project source file を直接編集しません。native subagent は current AI harness が起動します。shell command は `execute worktree --create`、`execute worktree --cleanup`、fallback `execute orchestrate --command "..."`、fallback `execute launch --run --command "..."` または `execute review --run --command "..."` が明示された場合だけ実行されます。
- Worker 状態値は `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`、`PENDING` です。完了には worker 状態が解決済みで、`controller_status` が `DONE` である必要があります。
- `design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、review artifacts、または `artifacts/agents/worker-status.md` が存在しない、または形式が壊れている場合、`ospec verify [changes/active/<change>]` は失敗します。文書 checklist に未チェック項目が残っている場合は警告します。
- `design.md` は簡潔に保ちます。役割はタスク分解の精度を上げることであり、長期的なプロジェクト文書の代替ではありません。

新規プロジェクトで `ospec init [path]` を実行すると、既定で nested レイアウトを使います。リポジトリ直下に残るのは `.skillrc` と `README.md` だけで、OSpec が管理する他のファイルは `.ospec/` に入ります。
通常の `init` では `.ospec/knowledge/src/` や `.ospec/knowledge/tests/` のような任意の知識マップは作成しません。
CLI は `changes/active/<change>` のような短縮パスも受け付けますが、nested プロジェクトでの実体パスは `.ospec/changes/active/<change>` です。
古い classic プロジェクトを新しいレイアウトへ移行したい場合は、明示的に `ospec layout migrate --to nested` を実行してください。

## 既存プロジェクトの更新

推奨プロンプト:

```text
/ospec を使ってこのディレクトリのプロジェクト知識レイヤーを更新または修復してください。まだ change は作成しないでください。
```

```bash
npm install -g @clawplays/ospec-cli@1.1.0
ospec update [path]
```

このリポジトリからローカルに入れた場合:

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` は、プロトコル文書、ツール、managed skills、アーカイブレイアウトのメタデータ、そして有効化済みプラグインの資産を更新します。
さらに、OSpec の痕跡は残っているものの新しいコア実行ディレクトリが欠けている古い OSpec プロジェクトを修復し、ルートの `build-index-auto.*` や `.skillrc` 内の旧 Stitch キーも正規化します。
もし nested プロジェクトに古い `.ospec/src/` または `.ospec/tests/` の知識ディレクトリが残っている場合、`ospec update [path]` はそれらを `.ospec/knowledge/src/` と `.ospec/knowledge/tests/` に移行します。
有効化済みプラグインのグローバルパッケージが手動で削除されていた場合、`ospec update [path]` はまずそのパッケージの復旧を試みてからプロジェクト資産の同期を続けます。
有効化済みプラグインに、より新しい互換 npm バージョンがある場合、`ospec update [path]` はそのグローバルプラグインパッケージを自動で更新し、旧バージョンから新バージョンへの遷移を表示します。
現在のプロジェクトで有効化されていないグローバルプラグインは更新しません。
CLI 本体は自動更新しません。
新規プラグインの自動インストールや自動有効化、active / queued changes の自動移行は行いません。

## インストール済みプラグインを全部更新する

推奨プロンプト:

```text
/ospec このマシンに入っているプラグインを全部更新してください。
```

現在のプロジェクトだけでなく、マシン上のインストール済みプラグインをまとめて更新したい場合は、明示的に次を使います。

`ospec update [path]` は classic レイアウトを nested レイアウトへ自動移行することはありません。新しいレイアウトへ切り替えたい場合は、`ospec layout migrate --to nested` を個別に実行してください。

```bash
ospec plugins update --all
```

よく使う派生:

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

`ospec plugins update --all` は、OSpec が記録しているグローバルインストール済みプラグインをすべて確認し、より新しい互換バージョンがあれば順に更新します。
インストール済みプラグインのパッケージが手動で削除されていた場合は、まず復旧を試みてから更新します。
AI / `/ospec` では、ユーザーが「インストール済みプラグインを全部更新したい」と明示した場合にだけ `ospec plugins update --all` を実行してください。
