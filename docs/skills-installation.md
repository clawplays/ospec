# Skills Installation

If you primarily use OSpec through AI, prefer short `/ospec` and `/ospec-change` prompts first. Use the explicit skill commands on this page only when you need direct install, sync, or troubleshooting.

Recommended prompts:

```text
/ospec initialize this project.
/ospec refresh or repair the project knowledge layer for this directory. Do not create a change yet.
/ospec-change create and advance a change for this requirement.
```

Managed skills:

- `ospec`
- `ospec-change`

These two skills are synced automatically by:

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` and `ospec update` always sync Codex. They also sync Claude Code when `CLAUDE_HOME` or an existing `~/.claude` home is present.

For existing projects, `ospec update [path]` also repairs older OSpec footprints, reinstalls missing packages for already-enabled plugins, and upgrades those enabled plugin packages when a newer compatible version is available.
It does not update globally installed plugins that are not enabled in the current project.
If you want a machine-wide plugin update, use `ospec plugins update --all` explicitly.

## Codex

Check one managed skill:

```bash
ospec skill status ospec
ospec skill status ospec-change
```

Install or sync one managed skill explicitly:

```bash
ospec skill install ospec
ospec skill install ospec-change
```

Default location:

```text
~/.codex/skills/
```

Install another skill explicitly:

```bash
ospec skill install ospec-init
```

## Claude Code

Check one managed skill:

```bash
ospec skill status-claude ospec
ospec skill status-claude ospec-change
```

Install or sync one managed skill explicitly:

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
```

Default location:

```text
~/.claude/skills/
```

Install another skill explicitly:

```bash
ospec skill install-claude ospec-init
```

## Prompt Naming

Prefer `/ospec` in new prompts.

Use `/ospec-change` when the user intent is specifically "create or advance a change".

Use `/ospec-cli` only when older automation or habits still reference the legacy name.
