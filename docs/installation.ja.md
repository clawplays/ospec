# インストール

OSpec は公式 CLI パッケージ `@clawplays/ospec-cli` をインストールし、`ospec` コマンドで使います。

## 必要条件

- Node.js `>= 18`
- npm `>= 8`

## npm からインストール

```bash
npm install -g @clawplays/ospec-cli
```

## 確認

```bash
ospec --version
ospec --help
```

## プラグインのインストール方法

OSpec を主に AI / `$ospec` で使う場合は、まず次のように依頼します。

```text
$ospec このプロジェクトで Stitch プラグインを開いてください。
$ospec このプロジェクトで Checkpoint プラグインを開いてください。
```

この依頼は「まずグローバルインストール済みか確認し、未インストールならインストールし、その後で現在のプロジェクトに対して有効化する」として扱います。

厳格な AI ルール:

1. まず `ospec plugins info <plugin>` または `ospec plugins installed` で、そのプラグインが既にグローバルインストール済みか確認します。
2. 既に入っている場合は、別プロジェクトだからという理由で再インストールしません。
3. 既存のインストールを再利用し、新しいプロジェクトでは `ospec plugins enable ...` だけを実行します。
4. `ospec plugins install <plugin>` を実行するのは、未インストールの場合か、ユーザーが再インストール / 更新を明示した場合だけです。
5. `ospec plugins update --all` を実行するのは、ユーザーが「インストール済みプラグインを全部更新したい」と明示した場合だけです。

コマンドラインの補足:

```bash
ospec plugins list
ospec plugins install stitch
ospec plugins install checkpoint
```

その後、対象プロジェクトで有効化します。

```bash
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

補足:

- `ospec plugins list` で利用可能なプラグインを確認します
- `ospec plugins install <plugin>` で明示的にインストールします
- `ospec plugins update <plugin>` はグローバルに入っている単一プラグインを更新します
- `ospec plugins update --all` は OSpec が記録しているグローバルインストール済みプラグインをすべて更新します
- AI / `$ospec` で「Stitch / Checkpoint を開いて」と頼まれた場合は、まずグローバルインストール済みか確認し、未インストールならインストールし、その後に有効化します
- プラグインのインストールはグローバル共有で、有効化はプロジェクト単位です
- 既にグローバルインストール済みなら、他のプロジェクトでは再利用して有効化だけを行います
- `ospec plugins install <plugin>` を実行すると、プラグインパッケージ自身の npm 依存も一緒にインストールされます
- Checkpoint では、`ospec plugins enable checkpoint ...` 時に対象プロジェクト側のレビュー依存も追加でインストールされます
- 有効化後、詳細なプラグイン文書は `.ospec/plugins/<plugin>/docs/` に同期されます

## Managed Skills

- `ospec init [path]` と `ospec update [path]` は Codex 向けの `ospec` と `ospec-change` managed skills を同期します
- `ospec update [path]` は古い OSpec プロジェクトを修復し、現在のプロジェクトで有効化されているプラグインについては、欠けているグローバルパッケージの復旧と互換バージョンへの自動更新を行います
- `ospec update [path]` は現在のプロジェクトで有効化されていないグローバルプラグインは更新しません
- `ospec plugins update --all` は明示的な「インストール済みプラグインを全部更新する」コマンドです
- `CLAUDE_HOME` または既存の `~/.claude` がある場合は Claude Code にも同期します
