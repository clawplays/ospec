# Skills Installation

If you primarily use OSpec through AI, prefer `/ospec-change` for small routine work and `/ospec-goal` for complex full-workflow work. Use the explicit skill commands on this page only when you need direct install, sync, or troubleshooting.

Recommended prompts:

```text
/ospec initialize this project.
/ospec refresh or repair the project knowledge layer for this directory. Do not create a change yet.
/ospec-change create and advance a small change for this requirement.
/ospec-goal create and advance a full goal for this requirement.
```

Managed skills:

- `ospec`
- `ospec-change`
- `ospec-goal`

These two skills are synced automatically by:

- `npm install -g .`
- `ospec init [path]`
- `ospec update [path]`

`ospec init` and `ospec update` always sync Codex. They also sync Claude Code when `CLAUDE_HOME` or an existing `~/.claude` home is present.

For existing projects, `ospec update [path]` also repairs older OSpec footprints before refreshing managed assets.

## Codex

Check one managed skill:

```bash
ospec skill status ospec
ospec skill status ospec-change
ospec skill status ospec-goal
```

Install or sync one managed skill explicitly:

```bash
ospec skill install ospec
ospec skill install ospec-change
ospec skill install ospec-goal
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
ospec skill status-claude ospec-goal
```

Install or sync one managed skill explicitly:

```bash
ospec skill install-claude ospec
ospec skill install-claude ospec-change
ospec skill install-claude ospec-goal
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

Use `/ospec-change` when the user intent is a small or routine change. Use `/ospec-goal` when the work needs design docs, implementation planning, task graphs, workers, reviews, or evidence gates.

Use `/ospec-cli` only when older automation or habits still reference the legacy name.
