# Installation

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

## Plugin Installation

If you primarily use OSpec through AI / `$ospec`, start like this:

```text
$ospec open Stitch for this project.
$ospec open Checkpoint for this project.
```

These requests should be handled as: check whether the plugin is already installed globally, install only when missing, then enable it in the current project.

Strict AI rule:

1. Check whether the plugin is already installed globally with `ospec plugins info <plugin>` or `ospec plugins installed`.
2. If it is already installed, do not reinstall it just because this is a different project.
3. Reuse the existing installed plugin and run `ospec plugins enable ...` in the new project.
4. Only run `ospec plugins install <plugin>` when the plugin is not installed yet or the user explicitly asks to reinstall or upgrade it.
5. Only run `ospec plugins update --all` when the user explicitly asks to update every installed plugin on the machine.

Command line fallback:

```bash
ospec plugins list
ospec plugins install stitch
ospec plugins install checkpoint
```

Then enable them in the target project:

```bash
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

Notes:

- `ospec plugins list` shows the plugins you can use
- `ospec plugins install <plugin>` performs the explicit global install
- `ospec plugins update <plugin>` updates one globally installed plugin package
- `ospec plugins update --all` updates every globally installed plugin package recorded by OSpec
- in AI / `$ospec` flows, "open Stitch / Checkpoint" should first check whether the plugin is already installed globally, then install only when missing, and finally enable it in the current project
- plugin installation is global and shared across projects; enable is project-local
- once a plugin is already installed globally, later projects should reuse it and only run enable
- the plugin package's own npm dependencies are installed together with `ospec plugins install <plugin>`
- Checkpoint also installs its required target-project review dependencies during `ospec plugins enable checkpoint ...`
- after enable, the plugin's detailed docs are synced into `.ospec/plugins/<plugin>/docs/`

## Managed Skills

- `ospec init [path]` and `ospec update [path]` sync the managed `ospec` and `ospec-change` skills for Codex
- `ospec update [path]` repairs older OSpec projects with an existing OSpec footprint, restores missing packages for already-enabled plugins, and auto-upgrades already-enabled plugin packages when a newer compatible version is available
- `ospec update [path]` does not upgrade globally installed plugins that are not enabled in the current project
- `ospec plugins update --all` is the explicit machine-wide plugin update command
- Claude Code sync also runs when `CLAUDE_HOME` or an existing `~/.claude` home is present
