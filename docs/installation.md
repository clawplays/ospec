# Installation

If you primarily use OSpec through AI / `/ospec`, start with a short `/ospec` prompt first. Use the CLI install steps on this page when you need explicit local setup or troubleshooting.

Install the official OSpec CLI package `@clawplays/ospec-cli` and run the `ospec` command.

## Requirements

- Node.js `>= 18`
- npm `>= 8`

## Install From npm

```bash
npm install -g @clawplays/ospec-cli
```

## Verify

```bash
ospec --version
ospec --help
```

## Managed Skills

- `ospec init [path]` and `ospec update [path]` sync the managed `ospec`, `ospec-change`, and `ospec-goal` skills for Codex
- Claude Code sync also runs when `CLAUDE_HOME` or an existing `~/.claude` home is present
