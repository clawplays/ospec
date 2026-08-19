<h1><a href="https://ospec.ai/" target="_blank" rel="noopener noreferrer">OSpec.ai</a></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/v/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@clawplays/ospec-cli"><img src="https://img.shields.io/npm/dm/%40clawplays%2Fospec-cli?style=for-the-badge&logo=npm&label=downloads&cacheSeconds=300" alt="npm downloads"></a>
  <a href="https://github.com/clawplays/ospec/stargazers"><img src="https://img.shields.io/github/stars/clawplays/ospec?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/github/license/clawplays/ospec?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/badge/npm-8%2B-CB3837?style=flat-square&logo=npm&logoColor=white" alt="npm 8+">
  <img src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/workflow-3_steps-0F766E?style=flat-square" alt="3-step workflow">
</p>

<p align="center">
  <a href="../README.md">English</a> |
  <a href="README.zh-CN.md">中文</a> |
  <strong>日本語</strong> |
  <a href="README.ar.md">العربية</a>
</p>

OSpec の公式 CLI パッケージは `@clawplays/ospec-cli`、公式コマンドは `ospec` です。OSpec は AI coding agents 向けの spec-driven かつ agentic なワークフローフレームワークで、spec-driven development（SDD）と Loop Engineering（検証可能な「計画 → 実行 → 検証」のゴールループ）を Claude Code、Codex、Gemini、OpenCode、MCP ベースのエージェント、そして素の CLI ワークフローにもたらします。


<p align="center">
  <a href="prompt-guide.ja.md">プロンプトガイド</a> |
  <a href="usage.ja.md">使い方</a> |
  <a href="project-overview.ja.md">概要</a> |
  <a href="installation.ja.md">インストール</a> |
  <a href="skills-installation.ja.md">スキルのインストール</a> |
  <a href="https://github.com/clawplays/ospec/issues">Issues</a>
</p>

## なぜ OSpec なのか

AI コーディングアシスタントは強力ですが、要件がチャット履歴にしか残らないと、確認・レビュー・クローズアウトが難しくなります。OSpec は軽量なワークフローレイヤーを加えることで、コードを書く前とリリース後の両方で change の文脈をリポジトリに残します。

- **要件をリポジトリ内のスペックファイルに**: OSpec は要件を proposal、design、計画、tasks、レビュー、検証エビデンスなどのファイルに落とし、チャット履歴ではなくリポジトリに残します——どのアシスタント（Codex/GPT、Claude Code、Gemini、OpenCode、または素の CLI）でも前の作業の続きから進められます。
- **`ospec change` —— 日常の高速フロー**: 1 つの要件を 1 つの active change として、短い `init -> change -> verify/finalize` で進め、軽量でレビューしやすく保ちます。
- **`ospec goal` —— エンジニアリング品質の規律**: コードを書く前にブレインストーミングして設計を固定し、作業をタスクグラフに分割して並列サブエージェントを派遣し、TDD と独立レビュアーによるコードレビューを徹底し、「完了」とする前に再確認可能なテスト/検証エビデンスを求めます。
- **`ospec goal` は統一 fast quality loop**: deterministic preflight、combined planning review、task 実行・review、final review、verification を 1 つの予測可能なフローで進めます。

## npm でインストール

```bash
npm install -g @clawplays/ospec-cli
```

公式パッケージ: `@clawplays/ospec-cli`  
公式コマンド: `ospec`  
インストール確認: `ospec --help`

## クイックスタート

OSpec の利用は、この 3 ステップだけです：

1. プロジェクトディレクトリで OSpec を初期化する
2. 要件、ドキュメント更新、バグ修正のための change を作成して進める
3. 受け入れ完了後にその change をアーカイブする

### 1. プロジェクトディレクトリで初期化する

推奨プロンプト:

```text
OSpec でこのプロジェクトを初期化してください。
```

Claude / Codex skill:

```text
/ospec でこのプロジェクトを初期化してください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language ja-JP
```

メモ:

- `--summary`: 生成ドキュメントに書き込むプロジェクト概要
- `--tech-stack`: `node,react,postgres` のようなカンマ区切りの技術スタック
- `--architecture`: 短いアーキテクチャ説明
- `--document-language`: 生成ドキュメントの言語。`en-US`、`zh-CN`、`ja-JP`、`ar` から選択
- 言語解決優先順位: 明示的な `--document-language` -> 既存のプロジェクト文書 / `.ospec/for-ai/*`（または旧 `for-ai/*`） / asset manifest -> `en-US`
- 通常の `init` では `.ospec/knowledge/src/` や `.ospec/knowledge/tests/` のような任意の知識マップは生成されません
- 値を渡した場合はその内容を使ってドキュメントを生成します
- 値を渡さない場合は既存ドキュメントを優先利用し、無ければ補完用のプレースホルダを生成します

</details>

### 2. Change を作成して進める

要件実装、ドキュメント更新、リファクタ、バグ修正はこの流れを使います。

推奨プロンプト:

```text
OSpec でこの要件の change を作成して進めてください。
```

Claude / Codex skill:

```text
/ospec-change でこの要件の change を作成して進めてください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec change docs-homepage-refresh .
ospec change fix-login-timeout .
ospec change update-billing-copy .
```

</details>

### 3. 受け入れ完了後にアーカイブする

デプロイ、テスト、QA、またはその他の受け入れ確認が終わった後に、確認済みの change をアーカイブします。

推奨プロンプト:

```text
OSpec で承認済みの change をアーカイブしてください。
```

Claude / Codex skill:

```text
/ospec で承認済みの change をアーカイブしてください。
```

<details>
<summary>コマンドライン</summary>

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

ユーザーが未解決リスクを明示的に受容した場合だけ force archive を使います：

```bash
ospec finalize changes/active/<change-name> --force-archive --confirm-force-archive <正確な-change-名> --reason "未解決の受け入れリスクを承認"
```

新規プロジェクトでは `ospec init` の既定レイアウトは nested です。リポジトリ直下に残るのは `.skillrc` と `README.md` だけで、change や `SKILL`、`for-ai` などの管理ファイルは `.ospec/` 配下に置かれます。
CLI は `changes/active/<change-name>` の短縮パスも受け付けますが、nested プロジェクトでの実体パスは `.ospec/changes/active/<change-name>` です。

メモ:

- 先にプロジェクト固有のデプロイ、テスト、QA を実行します
- `ospec verify` で change がアーカイブ可能か確認します
- `ospec finalize` でインデックスを再構築し、change をアーカイブします
- force archive は失敗または `NOT_VERIFIED` evidence を pass に変更しません。force flag、正確な名前の再確認、監査理由が必要です。state 欠落、`issued`、`running` の Loop item は引き続きブロックし、全 item が `completed`、`failed`、`expired` の履歴 pointer は保持できます。archive は `forced`、`incomplete`、`accepted-risk` と表示されます

</details>

### Goal ワークフロー — フルフロー＋ハード強制

ユーザーがフルワークフローを明示的に選択した場合だけ `ospec goal <goal-name>` を使います。選択済みの Change は複雑さ、ファイル数、risk、batch size によって Goal へ自動昇格しません。

Change は compact な stage-aware guidance、現在の AI による 1 回の lightweight review、derived closeout を使います。verification、documentation、review の gate がすべて通れば、`APPROVED` または `APPROVED_WITH_CONCERNS` は自動的に finalize と archive が可能です。明示的な batch は queue で直列実行されます。

**あなたは goal を起こして要件を説明するだけ。** 残りの `ospec` コマンドはすべて AI が自分で実行し、あなたはチャットで質問に答えるだけです（`Zero-Setup`）。

goal は **セッションスコープの fast quality loop** として動作します。design/plan deterministic preflight の後に task graph を導出し、workspace/worker dispatch 前に独立 combined planning review を 1 回実行します。planning repair 1 回と delta re-review 最大 1 回までです。planning 内容を変更しない executor 失敗は許容量を再アームし、findings がすべて medium 以下なら repair 後に `APPROVED_WITH_CONCERNS` として決定論的に確定します。controller は `ospec loop run --once --compact-json` を使い、現在の harness が報告した native subagent capability だけで action を実行します。capacity 不明時の implementation 既定並列数は 3 で、より大きい session-bound capacity があれば安全な範囲で 5-10 などを設定できます。optional allowlist は明示設定時だけ追加境界になります。詳細は [loop-engineering.md](loop-engineering.md) を参照してください。

各 goal で AI が守る体験契約：

- **Announce-Before-Act**：どの skill・段階か、これから実行する `ospec execute …` コマンドと生成物、何体の subagent を派遣するかを宣言し、常に進行状況が見えるようにします。
- **Brainstorm-First**：設計を確定する前に、方向・アーキテクチャ・API・データ・UI・リスク・スコープの未決事項を 1 つずつ、ネイティブの質問 UI（Claude Code：AskUserQuestion）で尋ね、黙って仮定しません。
- **永続的な決定ゲート**：未決の選択は `ospec execute decision …` で記録し、required な決定はあなたが答えるまでワーカー派遣をブロックします。

Claude Code のハード強制（一度だけ。Claude Code では AI が自動で実行します）：

```bash
ospec session hook --target claude --apply
```

これは `.ospec/hooks/claude/` に hook バンドルを書き込み、`.claude/settings.json` に冪等にマージします（可逆）。hook は次のことを行います：

- ツールレベルで subagent 派遣と `ospec` コマンドをすべて宣告し、
- required な決定が未解決の間は subagent 派遣をハードブロックし、
- 毎ターン Announce-Before-Act / Brainstorm-First 契約を再確認します。

hook はセッション開始時に読み込まれるため、次の Claude Code セッションから有効になります。

## npm で更新

既存の OSpec プロジェクトでは、npm で CLI をアップグレードしたあと、プロジェクトディレクトリで次のコマンドを実行してプロジェクト内の OSpec ファイルを更新します:

```bash
ospec update
```

`ospec update` は classic レイアウトを nested レイアウトへ自動移行しません。古い classic プロジェクトを新しいレイアウトへ切り替えたい場合は、`ospec layout migrate --to nested` を明示的に実行してください。

## OSpec の動作イメージ

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. USER REQUEST                                               │
│     "OSpec, create and advance a change for this task."       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. INIT TO CHANGE-READY                                       │
│     ospec init                                                 │
│     - .skillrc                                                 │
│     - .ospec/                                                  │
│     - README.md                                                │
│     - .ospec/changes/active + .ospec/changes/archived          │
│     - .ospec/SKILL.md + .ospec/SKILL.index.json + .ospec/for-ai│
│     - .ospec/docs/project/* baseline knowledge docs            │
│     - reuse docs or fall back to placeholders                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EXECUTION                                                  │
│     ospec change <change-name>                                 │
│     ospec progress                                             │
│     ospec execute bootstrap / handoff / preflight / status    │
│     ospec execute next                                         │
│     ospec execute workspace / worktree / finish                │
│     ospec execute dispatch / review                            │
│     ospec execute debug                                        │
│     ospec execute tdd                                          │
│     ospec execute verify                                       │
│     ospec execute sync                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DEPLOY + VALIDATE                                          │
│     project deploy / test / QA                                 │
│     ospec verify                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ARCHIVE                                                    │
│     ospec finalize                                             │
│     rebuild index + archive                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 3 つの主要概念

| 概念 | 説明 |
|------|------|
| **Protocol Shell** | ルートの `.skillrc` と `README.md`、そして change 状態、`SKILL`、index、`for-ai`、project docs を含む `.ospec/` 配下の managed files から成る最小の協調骨格 |
| **Project Knowledge Layer** | `docs/project/*`、レイヤード skill ファイル、index 状態など AI が継続的に参照するコンテキスト |
| **Active Change** | 1 つの要件専用の実行コンテナ。通常 `proposal.md`、`design.md`、`implementation-plan.md`、`artifacts/agents/task-graph.json`、`tasks.md`、handoff artifacts、document-review artifacts、review artifacts、`artifacts/agents/worker-status.md`、`state.json`、`verification.md`、`review.md` を持つ |

## 主な機能

- **change-ready 初期化**: `ospec init` が protocol shell と基礎ドキュメントを一度に生成
- **ガイド付き初期化**: AI 支援時は不足している概要や技術スタックを 1 回だけ確認可能
- **ドキュメント保守**: `ospec docs generate` で後から知識レイヤを更新・修復
- **change 実行の追跡**: proposal、design、implementation plan、task graph、tasks、handoff artifacts、document-review artifacts、worker status、state、verification、review を継続的に揃える
- **task graph controller**: `ospec execute bootstrap` で project session brief snapshot を含む one-change startup/resume snapshot と次の安全な action を記録し、`handoff` で project session brief snapshot を含む cross-tool worker handoff guide を外部 worker を起動せずに記録し、`preflight` で project session brief snapshot を含む task 実行前の design / implementation-plan reviewer packet を作成し、`status` と `next` で controller 状態と安全な次 task 候補を表示し、`workspace` で worker handoff 前の git workspace safety を記録し、`worktree` で isolated-worktree preparation plan を記録し、`finish` で closeout readiness を記録し、`dispatch` と `complete` で project session brief snapshot、worker profile、target tool mapping 付きの parallel-safe な worker packet と task 結果を OSpec artifact として記録し、`NEEDS_CONTEXT` または `BLOCKED` には blocker escalation を書き、`--limit` で dispatch batch size を制限でき、`review` で project session brief snapshot を含む task 完了後の統合 code review packet（spec compliance と code quality を一度に確認）を作成し、`debug` で symptom、hypothesis、root cause、fix evidence を記録し、`tdd` で red/green/refactor の test-cycle evidence を記録し、`verify` で fresh verification evidence を記録し、`sync` で execution と review artifacts から `worker-status.md` を再構築
- **生きた feature ドキュメントとロケータ**: 人が管理する文書内の feature セクションを `<!-- ospec:feature <slug> code:<パス> -->` で宣言。`docs/project/feature-catalog.md` は宣言済み feature ごとに 1 行（slug、一文、`文書#セクション`、状態、最新アーカイブ）を持ち、`ospec docs locate --feature <slug>` / `--affects <パス>` がそのセクションの位置と行範囲を返すため、AI は文書全体ではなく 1 セクションだけを読む
- **アーカイブのオンデマンド表示**: アーカイブは index エントリを書き、カタログ行を更新し、`ospec:last-change` トレーサビリティコメントを冪等に書く。`docs/project/changes/` 配下にファイルは生成されず、`ospec changes show <アーカイブ名>` が要約・影響範囲・ファイル一覧・検証コマンドをオンデマンドに表示する
- **文書義務**: 計画時に `ospec docs obligations --apply` が `change_type` と feature 一覧（空なら `affects` を `code:` 宣言で解決）から義務を導出し、`ファイル#セクション` まで解決済みの対象を書き込む。fix は該当セクションが修正前の誤った挙動を記述していないか確認し、refactor は正確さを検証して無変更なら `ospec docs confirm` で `verified_unchanged` を記録する。`.skillrc` の `docs_contract.mode: warn|strict` が未達の必須義務を警告にするかアーカイブ阻止にするかを決める。`ospec docs audit` は `code:` パスが変わったのに文書が動いていないセクションを列挙し、`ospec docs migrate` は旧生成文書を 4 段階のゲート付きで feature ドキュメントへ移行する
- **キュー支援**: `queue` と `run` で複数 change の明示的な実行を管理
- **標準クローズアウト**: `finalize` が検証、feature カタログと knowledge index の再構築、アーカイブを行う

## ドキュメント

### コアドキュメント

- [Prompt Guide](prompt-guide.ja.md)
- [Usage](usage.ja.md)
- [Project Overview](project-overview.ja.md)
- [Installation](installation.ja.md)
- [Skills Installation](skills-installation.ja.md)

## リポジトリ構成

```text
dist/                       コンパイル済み CLI ランタイム
assets/                     管理対象プロトコル資産、hooks、skill payload
docs/                       公開ドキュメント
scripts/                    リリースとインストール補助スクリプト
.ospec/templates/hooks/     パッケージ同梱の Git hook テンプレート
```

## License

This project is licensed under the [MIT License](../LICENSE).
