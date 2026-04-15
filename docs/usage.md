# Usage

## Common Commands

```bash
ospec status [path]
ospec init [path]
ospec docs status [path]
ospec docs generate [path]
ospec changes status [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
ospec skill status
ospec skill install
ospec skill status-claude
ospec skill install-claude
ospec update [path]
ospec plugins list
ospec plugins install <plugin>
ospec plugins installed
ospec plugins update <plugin>
ospec plugins update --all
ospec plugins status [path]
ospec plugins enable stitch [path]
ospec plugins enable checkpoint [path] --base-url <url>
```

## Plugin Quick Start

AI / `$ospec`:

- asking to "open Stitch" should first check whether Stitch is already installed globally, install it only when missing, then enable it in the current project
- asking to "open Checkpoint" should first check whether Checkpoint is already installed globally, install it only when missing, then enable it in the current project
- detailed plugin setup docs are synced into `.ospec/plugins/<plugin>/docs/` after enable
- before installing, check `ospec plugins info <plugin>` or `ospec plugins installed`
- if the plugin is already installed globally, skip install and just enable it in the current project
- do not run `ospec plugins update --all` unless the user explicitly asks to update every installed plugin on the machine

Command line:

```bash
ospec plugins list
ospec plugins info stitch
ospec plugins install stitch
ospec plugins enable stitch [path]
```

```bash
ospec plugins list
ospec plugins info checkpoint
ospec plugins install checkpoint
ospec plugins enable checkpoint [path] --base-url <url>
```

## Recommended Flow

For a fresh directory:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

New projects initialized by `ospec init [path]` use the nested layout by default: keep `.skillrc` and `README.md` at the repository root, and place other OSpec-managed files under `.ospec/`.
Plain init does not create optional knowledge maps such as `.ospec/knowledge/src/` or `.ospec/knowledge/tests/`.
CLI commands still accept shorthand such as `changes/active/<change>`, but the physical path in nested projects is `.ospec/changes/active/<change>`.
If you want to convert an older classic project to the new layout, run `ospec layout migrate --to nested`.

## Upgrading An Existing Project

```bash
npm install -g @clawplays/ospec-cli@1.0.2
ospec update [path]
```

If you installed from this repository locally:

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` refreshes protocol docs, tooling, managed skills, archive layout metadata, and assets for already-enabled plugins.
It can also repair older OSpec projects that still have an OSpec footprint but are missing newer core runtime directories, and it normalizes legacy root `build-index-auto.*` tooling plus legacy Stitch plugin keys in `.skillrc`.
For nested projects with legacy knowledge still stored under `.ospec/src/` or `.ospec/tests/`, `ospec update [path]` migrates those paths into `.ospec/knowledge/src/` and `.ospec/knowledge/tests/`.
If an already-enabled plugin is missing globally, `ospec update [path]` attempts to restore that package before syncing project assets.
When an already-enabled plugin has a newer compatible npm package version available, `ospec update [path]` upgrades that global plugin package automatically and prints the version transition.
It does not upgrade plugins that are installed globally but not enabled in the current project.
It does not upgrade the CLI itself.
It does not migrate a classic project layout to nested automatically.
Use `ospec layout migrate --to nested` when you want the new nested layout.
It does not install brand-new plugins automatically, and it does not enable plugins or migrate active / queued changes automatically.

## Updating All Installed Plugins

Use this only when you explicitly want a machine-wide plugin update, not a project-scoped refresh:

```bash
ospec plugins update --all
```

Useful variants:

```bash
ospec plugins update stitch
ospec plugins update --all --check
```

`ospec plugins update --all` checks every globally installed plugin recorded by OSpec and upgrades each one when a newer compatible version is available.
If a recorded installed plugin package was manually deleted, this command also attempts to restore it before upgrading.
AI / `$ospec` flows should only run `ospec plugins update --all` when the user explicitly asks to update all installed plugins.
