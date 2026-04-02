# インストール

## 要件

- Node.js `>= 18`
- npm `>= 8`

## npm からインストールする

```bash
npm install -g @clawplays/ospec-cli
```

## 検証

```bash
ospec --version
ospec --help
```

## 管理対象スキル

- `ospec init [path]` と `ospec update [path]` は、Codex 向けに管理対象の `ospec` と `ospec-change` スキルを同期します
- `CLAUDE_HOME` または既存の `~/.claude` ホームがある場合は、Claude Code にも同期します
- 同じ管理対象スキルがすでにローカルにある場合は、パッケージ版で上書きされます

別の OSpec スキルが必要な場合は、例えば次のように明示的にインストールしてください：

```bash
ospec skill install ospec-init
```
