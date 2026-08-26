# Classic Change プロトコル

ユーザーが OSpec change を選んだ場合は、この簡潔なプロトコルを使います（`ospec change` / `ospec-change`。`ospec new` は alias として残ります）。profile の選択はユーザーに属し、複雑さ、flags、ファイル数、risk、batch 数を理由に change を Goal へ自動昇格、拒否、置換してはいけません。`ospec goal` / `ospec-goal` はユーザーが Goal を明示的に選択した場合だけ使います。

`ospec execute …` コントローラ層と goal 専用 artifacts はすべて `workflow_profile_id: goal` に属します。change では読まず・実行せず、ユーザーが明示的に昇格させない限り goal 専用ファイルも作りません。durable なユーザー選択のための共有 `ospec execute decision` だけが引き続き使えます。

## コンテキスト

開始時は `.skillrc`、`proposal.md`、`tasks.md`、`state.json` だけを読みます。index の関連項目は `ospec index query <キーワード...>` で必要な分だけ取得し、`SKILL.index.json` 全体を読まないでください。検証時に `verification.md`、closeout 時に `review.md` を読みます。実行状態の source of truth は `state.json` です。文書と `state.json` が食い違う場合は、文書の値をそのまま報告せず `state.json` に合わせて整合させます。

本ファイルが classic 契約の全体であり、ここにしか書かれていない規則を他所へ探しに行く必要はありません。`for-ai/execution-protocol.md` は goal コントローラ層のものであり、この profile は開いてはいけません。本ファイルがない場合は `for-ai/ai-guide.md` から現在の profile のプロトコルへ戻ってください。

## ライフサイクル

1. 新規作業は `ospec change <change-name> [path]` で作成し、`ospec new` は互換 alias として残します。コマンドは候補 feature を表示するが**一つも自動適用しない**——直ちに確認する：該当する slug を `--feature <slug>` で渡すか `proposal.md` の `features:` に書く。適切な候補がなければ空のままにして planning で補う。この一覧が文書義務機構全体を駆動する。省略するとすべての義務が optional に降格する。
2. 一致する active change が既にあれば重複作成せず継続します。
3. batch change は queue に入れ、共有 worktree で順番に実行します。worktree は直列で使用します。closeout（verify/finalize/archive）は proposal の `affects` と文書契約の範囲外にある未コミットファイルでブロックされるため、帰属不明の変更は先にコミット・stash・隔離し、`affects` を正しく宣言し、並行セッションの編集をアーカイブに紛れ込ませないでください。
4. `proposal.md`、`tasks.md`、`state.json`、`verification.md`、`review.md` だけを同期し（`tasks.md` は `proposal.md` と実装範囲から直接導きます）、Goal の design、plan、task graph、worker、review provenance artifacts は作りません。
5. 実際の change に関連する project check だけを実行して command と結果を `verification.md` に記録します。無関係な build、lint、test、TDD、debug は要求しません。有効化された optional step はすべて `tasks.md` と `verification.md` に現れ、合格したものは `verification.md` frontmatter の `passed_optional_steps` に列挙します。archive はこのフィールドを検証し、有効化された step が欠けている間はブロックします。
6. 現在の AI が軽量 review を 1 回行います。`APPROVED` と `APPROVED_WITH_CONCERNS` は自動 closeout 可能で、`PENDING`、`NEEDS_CHANGES`、`BLOCKED` は停止します。
7. 状況確認には `ospec progress` を使います。明示的な preview が必要なら `ospec verify` を実行します。実装、検証、文書方針、review が完了したら直ちに `ospec finalize` を実行し、classic state を同期して atomic に archive します。

## 文書方針

`change_type` は `feature`、`fix`、`refactor`、`perf`、`deprecate`、`remove`、`docs` のいずれかにします。旧表記の `bugfix` と `maintenance` も引き続き受理され、それぞれ `fix` と `refactor` に畳み込まれます。`documentation_impact` は `none` または `required` にします。

- bugfix は具体的な `documentation_reason` があれば `none` を使えます。ただしユーザー動作、API、運用契約を変える場合は文書更新が必要です。
- feature または docs change は `required` とし、`documentation_updates` に実際の project、module、API、user document を 1 つ以上記録します。
- 旧版が生成した `docs/project/changes/...` archive summary（OSpec はもう生成しない）は feature 文書に数えません。
- module rule、AI instruction、usage contract が変わる場合だけ `SKILL.md` を更新します。
- `SKILL.index.json` は archive 後に自動再構築され、手動 task ではありません。

### 機能文書

活きた機能文書は `docs/features/<領域>.md` で、機能ごとに `##` セクションを 1 つ持ちます。人間が所有し、あなたは change の中で編集します。engine が本文を書くことはありません。セクション見出しと本文はプロジェクトの `documentLanguage` で書きます（slug と `code:` パスは英語 kebab-case のまま）。`ospec docs migrate` フェーズ 2 の書き直しも同じルールに従います。

バインディングは機能文書に限られません。`docs/api/`・`docs/design/`・`docs/project/` 配下の文書セクションも `<!-- ospec:doc <slug> code:... -->` で宣言できます——`ospec:feature` と同じ構文・同じプロジェクト全体の slug 空間で、文書カテゴリ（kind）はパスから自動判定されます。`docs/planning/` と `docs/product/` は参照資料です：宣言も検索も可能ですが、義務は生成されません。

機能宣言はインラインです。見出し直下の最初の非空行に置き、それ以外の場所には書きません。ファイルの frontmatter に `features:` の一覧はありません。slug とセクションの結び付きが局所に留まるため、セクションを移動しても壊れず、同じ事実の二つ目の写しも生まれません。

```markdown
## Login timeout

<!-- ospec:feature login-timeout code:src/auth/,src/session/ -->

用途、振る舞い、ロジックの流れ、境界と制約。

<!-- ospec:last-change 2026-08-14-fix-login-timeout -->
```

- slug は小文字 kebab-case（`^[a-z0-9]+(-[a-z0-9]+)*$`）で、プロジェクト全体で一意です。重複すると `ospec index build` が失敗し、両方の場所を示します。
- `code:` は任意で、リポジトリ相対のパス接頭辞をカンマ区切りで並べます。空白とバックスラッシュは使えません。
- 宣言のないセクションは単に機能ではありません。これは許容され、エラーではありません。
- 機能セクションは同じか浅いレベルの次の見出しまで続くので、`###` の小見出しも機能に含まれます。
- `ospec:last-change` コメントは `ospec archive` が書き込み、置き換えます。1 セクションにつき最大 1 つとし、手で維持しないでください。

### 文書義務

本変更を「どこに書くべきか」はエンジンが決めるため、探す必要はない。計画期に `ospec docs obligations --apply` を実行すると、各義務には解決済みの `path#section` が付与されている。

義務は `change_type` と変更の `features:` 一覧から導出される。`features:` が空のとき、エンジンは proposal の `affects` を `code:` 宣言で解決するフォールバックを行う（`docs locate --affects` と同一のマッチング）。明示的な宣言が常に優先で、フォールバックは安全網にすぎない：

| `change_type` | 義務 |
|---|---|
| `feature` | 当該機能の挙動とフローを記述する節を更新する。新規機能なら当該節を新設する |
| `fix` | 当該節を開き、記載された挙動が**修正前の誤った挙動**かを確認する。該当すれば修正後のロジックに直す。**対応する機能文書がない場合、義務は任意に降格し建文書の提案が付く** —— 些細な修正が文書の肥大を強いてはならない |
| `refactor`、`perf` | 検証型：当該節が依然として正確かを確認し、`code:` パスを更新する |
| `deprecate`、`remove` | 当該節の状態を明示し、カタログを同期する |
| `docs` | 編集そのものが義務である |

バインディングの kind がその契約を決める。`feature` と `api` のセクションは生きた挙動を記述し、上の表に従う。`design`（ADR／決定）のセクションは、どのコード系 change_type でも検証型の `verify_decision` 義務を 1 つ生成する——決定がまだ成立しているかを確認し、覆された・修正された場合はそのセクションに Superseded を記して代替や archive をリンクする。`project`（アーキテクチャ／総覧）のセクションは同様に `verify_structure` を生成する。どちらもゼロ diff + `ospec docs confirm` を受け入れ、refactor の検証型義務と完全に同じ扱いである。

検証型義務は**ゼロ diff + 明示的な確認**を受け入れる。リファクタが記載済みの挙動を実際に何も変えていない場合は、装飾的な修正をせず `ospec docs confirm --id <義務 id>` で記録する。この確認は他の種類の義務では一律拒否される——自己申告の義務は何も検証していないからである。

`.skillrc` の `docs_contract.mode` は `warn` か `strict` を取り、本リリースサイクルの既定は `warn`：未達の義務は Archive ゲートで報告されるがブロックはしない。義務が満たされたかの判定は両モードで同一であり、異なるのは結果だけである。任意の義務はどちらのモードでもブロックしない。

`ospec docs audit` を定期的に実行する。`ospec:last-change` が指す Archive 以降に `code:` パスが変更されたにもかかわらず文書が変わっていない機能節を列挙する——義務機構が防ごうとしているドリフトそのものである。読み取り専用で、ビルドを失敗させることはない。

既存プロジェクトの取り込みには、まず `ospec docs coverage`（読み取り専用）でどのコード領域にもバインディングがないかを確認し、次に 4 段階の bind パイプラインを実行する——`ospec docs bind --plan --apply` → `docs-binding-plan.json` の各エントリを人が判定 → `ospec docs bind --execute --apply` → `ospec docs bind --verify`。既存文書をバインドし、未カバー領域には草案スケルトンを生成する。engine が書くのは宣言とスケルトンだけで、本文は決して書かない。

### 既存プロジェクトの移行

機能文書より前のプロジェクトには、change ごとに生成された文書が `docs/project/changes/` にあります。OSpec はもう生成しません。`ospec docs migrate` が 4 つのフェーズでそれらを置き換えます。`ospec update` は案内するだけで、移行も削除も行いません。

1. **`ospec docs migrate --plan --apply`**（エンジン）：旧文書を棚卸しし、パス接頭辞で archive を候補グループに分類し、`docs-migration-plan.json` と `docs/features/<領域>.md` の草案スケルトンを出力します。
2. **このフェーズはあなたが行います。** エンジンは本文を書きません。
3. **`ospec docs migrate --verify`**（エンジンのゲート）：欠落が残っている限り拒否します。
4. **`ospec docs migrate --finalize --apply`**（破壊的）：ファイル一覧を出力・記録してから削除します。

あなたの担当はフェーズ 2 で、草案を 1 つずつ処理します。

- まず草案の素材を読み、次に各項目の裏にある実際の evidence を読みます。要約・ファイル・検証コマンドは `ospec changes show <アーカイブ名>` で、判断の経緯は archive の `proposal.md` / `verification.md` / `review.md` で確認します。その領域を既に扱っている人が書いた文書も読んでください。良い記述が既にあるなら、複製ではなく移動します。
- 各 `##` セクションを、その機能が**今どう動くか**の記述に書き直します。目的・振る舞い・ロジックフロー・境界と制約です。変更履歴ではありません。change を見たことがない読者でも現在の挙動を理解できる必要があります。複数の旧 change が 1 つのセクションにまとまるのが普通で、バグ修正だけの change はたいてい 1 文の訂正で足ります。
- 各見出しの下に `<!-- ospec:feature <slug> code:<パス> -->` 宣言を追加し、そのセクションが対象とする最新の archive を指す `<!-- ospec:last-change <アーカイブ名> -->` 行を追加します。フェーズ 3 はこのコメントで旧文書が引き継がれたことを確認します。
- 草案マーカーを削除します。frontmatter の `status: draft` 行、`<!-- ospec:migration-draft -->` コメント、説明ブロックです。1 つでも残っていればフェーズ 3 は拒否します。
- 自由に再グループ化してください。エンジンの分類は推測にすぎません。外れていれば plan ファイルの `groups` と `group` を編集するか、文書間でセクションを移動します。
- **存続する機能がない** change（依存更新、revert、単発の雑務）には、無理にセクションを作らないでください。`docs-migration-plan.json` でその archive を `"historical": true` にします。これがフェーズ 3 の受け入れる「純粋な履歴」の明示的宣言で、人だけが設定できます。
- 迷ったら historical にする前にユーザーに確認してください。内容の行き先がない文書を削除することこそ、このパイプラインが防ぐためにある唯一の結末です。

`--plan --apply` はいつ再実行しても安全です。あなたが付けた `historical` と再グループ化は保持され、書き直し済みの草案が上書きされることはありません。

## Decision Gate

decision gate と brainstorm の選択肢はユーザーのものです。`recommended` を自分で選んだり gate を自分で解決したりしてはいけません。`recommended` はユーザーに提示するヒントであって、あなたが取れる選択ではありません。

すべての gate は capability ladder の順で提示します。harness に native な質問 UI があればそれ（Claude Code `AskUserQuestion`、Gemini `ask_user`）、なければ plan/approval UI（例：Codex plan モード）、それもなければ decision report の `Chat Prompt` をそのままチャットに出します。どの経路でも必ずユーザーに尋ねて実際の回答を待ちます。違うのは提示方法だけで、required な未決 decision はどの harness でも同じように実装と closeout をブロックします。質問は 1 回に 1 つです。

durable な gate は `ospec execute decision [changes/active/<change>] --id <id> --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required]` で記録し、ユーザーの回答は `--select <option-id> --answered-by user` で記録します。この共有 decision command が、classic change で使える唯一の `ospec execute …` command です。`ospec brainstorm` を実行した場合は未回答テンプレートのまま放置せず、`ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user` で各回答を記録します。

gate を開くのは本物の分岐だけです。排他的な API 形状、競合する UI 方針、データモデルや保存先の選択、破壊的または戻しにくい操作、ユーザーの依頼と衝突する scope 変更が該当します。定型で曖昧さのない作業では gate を開かず、妥当な既定値で進めて前提を `proposal.md` に記録します。

Claude Code では managed session hook がこの契約を実行時に再注入し、required な未決 decision がある間は subagent dispatch を強制的にブロックします。`ospec session hook --target claude --apply` で一度だけ導入します。この hook は 1 つの harness 向けの利便機能であって契約の出所ではありません。上記のルールは Codex、Gemini、Grok、OpenCode、Cursor、Copilot、および hook 未導入の Claude Code でもそのまま適用されます。

## 強制 Archive

強制 archive はユーザーが明示した例外であり、自動 fallback ではありません。緊急度、blocker、「早く終わらせて」という依頼から権限を推測してはいけません。

1. まず失敗している gate とすべての `NOT_VERIFIED` 項目をユーザーに報告し、その受容を情報に基づくものにします。
2. ユーザーが未完了の作業を明示的に受け入れた後にのみ、`ospec finalize [changes/active/<change>] --force-archive --confirm-force-archive <正確な-change-名> --reason "<受容するリスク>"` を実行します。正確な名前の確認と空でない reason は CLI 自身が強制します。
3. 失敗と `NOT_VERIFIED` の証拠を保持します。強制 archive が回避するのは完了 gate だけで、失敗した check と pending 状態はそのまま残り、archive は incomplete / accepted-risk として扱われ、完了した振る舞いとして説明してはいけません。

実際のユーザー判断、検証失敗、未解決 review、明示的 pause の場合だけ停止します。
