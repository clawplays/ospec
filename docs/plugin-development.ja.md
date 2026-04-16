# プラグイン開発

各公式 OSpec プラグインパッケージには次が必要です。

- `ospecPlugin` を持つ `package.json`
- `en-US`、`zh-CN`、`ja-JP`、`ar` のローカライズ文書
- 任意の `skills/`
- 任意の `knowledge/`
- `.ospec/plugins/<id>/` にコピーされる `scaffold/`
- `ospecPlugin.hooks` に定義した runtime hook

## メタデータ規則

- `ospecPlugin.id` は `plugins/<id>/` と一致させる
- パッケージ名は `@clawplays/ospec-plugin-<id>` を使う
- capability 名は安定した id とする
- step 名は workflow 向け optional step id とする

## Runtime 規則

- runtime hook は JSON を出力する
- OSpec は hook 出力を読み取り `gate.json`、`result.json`、`summary.md` を書く
- blocking step は最終的に `passed` または `approved` で終わる必要がある
