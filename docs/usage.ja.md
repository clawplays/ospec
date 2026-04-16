# 使い方

OSpec を主に AI で使う場合は、まず短い `/ospec` または `/ospec-change` を使ってください。このページの CLI コマンドは、フォールバックや明示的な自動化が必要なときに使います。

## よく使うコマンド

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
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
npm install -g @clawplays/ospec-cli@1.0.2
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
