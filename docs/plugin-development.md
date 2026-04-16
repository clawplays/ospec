# Plugin Development

Each official OSpec plugin package should contain:

- `package.json` with `ospecPlugin`
- localized docs for `en-US`, `zh-CN`, `ja-JP`, and `ar`
- optional `skills/`
- optional `knowledge/`
- `scaffold/` assets copied into `.ospec/plugins/<id>/`
- runtime hooks declared in `ospecPlugin.hooks`

## Metadata Rules

- `ospecPlugin.id` must match the `plugins/<id>/` directory name
- package name must be `@clawplays/ospec-plugin-<id>`
- capability names are stable ids
- step names are the workflow-facing optional step ids

## Runtime Rules

- runtime hooks should emit JSON
- OSpec reads hook output and writes `gate.json`, `result.json`, and `summary.md`
- blocking plugin steps must end in `passed` or `approved`
