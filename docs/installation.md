# Installation

## Requirements

- Node.js `>= 18`
- npm `>= 8`

## Install From This Repository

Run inside the OSpec release repository:

```bash
npm install
npm install -g .
```

## Verify

```bash
ospec --version
ospec --help
```

## Optional Validation

If you want to verify the packaged release behavior before using it:

```bash
npm run release:smoke
```

## Notes

- `npm install` installs the local runtime dependencies
- `npm install -g .` makes the current release available as the global `ospec` command and automatically syncs the managed `ospec` and `ospec-change` skills for Codex and Claude Code
- `ospec init [path]` and `ospec update [path]` also sync the same managed skill pair for Codex, and for Claude Code when `CLAUDE_HOME` or an existing `~/.claude` home is present
- If a matching managed skill is already installed locally, the automatic sync overwrites it with the latest packaged version
- If you want another OSpec skill, install it explicitly, for example `ospec skill install ospec-init`
- this repository ships the release assets and public docs, not the development source workflow
