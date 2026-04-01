# インストール

## 要件

- Node.js `>= 18`
- npm `>= 8`

## このリポジトリからインストールする

OSpecリリースリポジトリ内で実行してください：

```bash
npm install
npm install -g .
```

## 検証

```bash
ospec --version
ospec --help
```

## オプションの検証

使用する前にパッケージ化されたリリースの動作を検証したい場合：

```bash
npm run release:smoke
```

## 注意事項

- `npm install` はローカルのランタイム依存関係をインストールします。
- `npm install -g .` は、現在のリリースをグローバルな `ospec` コマンドとして利用可能にし、CodexおよびClaude Code向けに管理されている `ospec` および `ospec-change` スキルを自動的に同期します。
- `ospec init [path]` および `ospec update [path]` も、Codex向け、および `CLAUDE_HOME` または既存の `~/.claude` ホームが存在する場合はClaude Code向けに、同じ管理されたスキルのペアを同期します。
- 一致する管理対象スキルがすでにローカルにインストールされている場合、自動同期によって最新のパッケージ版で上書きされます。
- 他のOSpecスキルが必要な場合は、例えば `ospec skill install ospec-init` のように、明示的にインストールしてください。
- このリポジトリは、開発ソースのワークフローではなく、リリースの成果物と公開ドキュメントを提供します。
