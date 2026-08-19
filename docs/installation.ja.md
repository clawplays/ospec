# インストール

OSpec を主に AI / `/ospec` で使う場合は、まず短い `/ospec` プロンプトを優先してください。このページの CLI 手順は、明示的なローカルセットアップやトラブルシュート用です。

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

## Managed Skills

- `ospec init [path]` と `ospec update [path]` は Codex 向けの `ospec`、`ospec-change`、`ospec-goal` managed skills を同期します
- `CLAUDE_HOME` または既存の `~/.claude` がある場合は Claude Code にも同期します
