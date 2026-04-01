# スキルのインストール

管理対象スキル：

- `ospec`
- `ospec-change`

これらの2つのスキルは、以下によって自動的に同期されます：

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` および `ospec update` は常にCodexを同期します。また、`CLAUDE_HOME` または既存の `~/.claude` ホームが存在する場合は、Claude Codeも同期します。

## Codex

管理対象スキルの確認：

```bash
ospec skill status ospec
ospec skill status ospec-change
```

管理対象スキルを明示的にインストールまたは同期：

```bash
ospec skill install ospec
ospec skill install ospec-change
```

デフォルトの場所：

```text
~/.codex/skills/
```

他のスキルを明示的にインストール：

```bash
ospec skill install ospec-init
```

## Claude Code

管理対象スキルの確認：

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
```

管理対象スキルを明示的にインストールまたは同期：

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
```

デフォルトの場所：

```text
~/.claude/skills/
```

他のスキルを明示的にインストール：

```bash
ospec skill install-claude ospec-init
```

## プロンプトの命名規則

新しいプロンプトでは `$ospec` を優先して使用してください。

ユーザーの意図が特に「変更を作成または進める」ことである場合は、`$ospec-change` を使用してください。

`$ospec-cli` は、古い自動化や習慣が依然としてレガシー名を参照している場合にのみ使用してください。
