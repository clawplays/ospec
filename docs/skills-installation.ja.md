# スキルのインストール

OSpec を主に AI で使う場合は、小さな通常変更には `/ospec-change`、複雑な full workflow には `/ospec-goal` を使ってください。このページの明示的な skill コマンドは、直接インストール、同期、トラブルシュートが必要な場合にだけ使います。

推奨プロンプト:

```text
/ospec を使ってこのプロジェクトを初期化してください。
/ospec を使ってこのディレクトリのプロジェクト知識レイヤーを更新または修復してください。まだ change は作成しないでください。
/ospec-change を使ってこの要件の change を作成して進めてください。
/ospec-goal を使ってこの要件の full goal を作成して進めてください。
```

管理対象スキル:

- `ospec`
- `ospec-change`
- `ospec-goal`

これらの3つのスキルは、以下によって自動的に同期されます:

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` と `ospec update` は常に Codex を同期します。また、`CLAUDE_HOME` または既存の `~/.claude` ホームが存在する場合は、Claude Code も同期します。

既存プロジェクトでは、`ospec update [path]` は管理アセットを更新する前に、古い OSpec の痕跡を修復します。

## Codex

管理対象スキルの確認:

```bash
ospec skill status ospec
ospec skill status ospec-change
ospec skill status ospec-goal
```

管理対象スキルを明示的にインストールまたは同期:

```bash
ospec skill install ospec
ospec skill install ospec-change
ospec skill install ospec-goal
```

既定の場所:

```text
~/.codex/skills/
```

別のスキルを明示的にインストール:

```bash
ospec skill install ospec-init
```

## Claude Code

管理対象スキルの確認:

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
ospec skill status-claude ospec-goal
```

管理対象スキルを明示的にインストールまたは同期:

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
ospec skill install-claude ospec-goal
```

既定の場所:

```text
~/.claude/skills/
```

別のスキルを明示的にインストール:

```bash
ospec skill install-claude ospec-init
```

## プロンプト名

新しいプロンプトでは `/ospec` を優先します。

ユーザー意図が「change を作成して進める」ことに特化している場合は `/ospec-change` を使います。

小さな通常変更を作成して進める場合は `/ospec-change` を使います。設計、実装計画、task graph、worker/review、evidence gates が必要な場合は `/ospec-goal` を使います。

`/ospec-cli` は、古い自動化や習慣がまだレガシー名を参照している場合にだけ使います。
