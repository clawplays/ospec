# Classic Change プロトコル

ユーザーが OSpec change を選んだ場合は、この簡潔なプロトコルを使います。profile の選択はユーザーに属し、複雑さ、flags、ファイル数、batch 数を理由に change を Goal へ自動昇格、拒否、置換してはいけません。

## コンテキスト

開始時は `.skillrc`、`proposal.md`、`tasks.md`、`state.json` だけを読みます。index の関連項目は `ospec index query <キーワード...>` で必要な分だけ取得し、`SKILL.index.json` 全体を読まないでください。検証時に `verification.md`、closeout 時に `review.md` を読みます。本ファイルがない、blocking plugin が有効、または特定ルールが曖昧な場合だけ完全な `ai-guide.md` や `execution-protocol.md` を読みます。

## ライフサイクル

1. 新規作業は `ospec change <change-name> [path]` で作成し、`ospec new` は互換 alias として残します。
2. 一致する active change が既にあれば重複作成せず継続します。
3. batch change は queue に入れ、共有 worktree で順番に実行します。worktree は直列で使用します。closeout（verify/finalize/archive）は proposal の `affects` と文書契約の範囲外にある未コミットファイルでブロックされるため、帰属不明の変更は先にコミット・stash・隔離し、`affects` を正しく宣言し、並行セッションの編集をアーカイブに紛れ込ませないでください。
4. `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` だけを同期し、Goal の design、plan、task graph、worker、review provenance artifacts は作りません。
5. 実際の change に関連する project check だけを実行して command と結果を `verification.md` に記録します。無関係な build、lint、test、TDD、debug は要求しません。
6. 現在の AI が軽量 review を 1 回行います。`APPROVED` と `APPROVED_WITH_CONCERNS` は自動 closeout 可能で、`PENDING`、`NEEDS_CHANGES`、`BLOCKED` は停止します。
7. 明示的な preview が必要なら `ospec verify` を実行します。実装、検証、文書方針、plugin gate、review が完了したら直ちに `ospec finalize` を実行し、classic state を同期して atomic に archive します。

## 文書方針

`change_type` は `bugfix`、`feature`、`maintenance`、`docs`、`documentation_impact` は `none` または `required` にします。

- bugfix は具体的な `documentation_reason` があれば `none` を使えます。ただしユーザー動作、API、運用契約を変える場合は文書更新が必要です。
- feature または docs change は `required` とし、`documentation_updates` に実際の project、module、API、user document を 1 つ以上記録します。
- 自動生成される `docs/project/changes/...` archive summary は feature 文書に数えません。
- module rule、AI instruction、usage contract が変わる場合だけ `SKILL.md` を更新します。
- `SKILL.index.json` は archive 後に自動再構築され、手動 task ではありません。

実際のユーザー判断、検証失敗、未解決 review、blocking plugin gate、明示的 pause の場合だけ停止します。
