# External Plugins

OSpec supports npm-installed external plugins.

## User Flow

1. Discover plugins with `ospec plugins list`
2. Inspect one plugin with `ospec plugins info <id>`
3. Install a plugin globally with `ospec plugins install <id>`
4. Enable it in a project with `ospec plugins enable <id> <project-path>`
5. Validate it with `ospec plugins doctor <id> <project-path>`
6. Run it with `ospec plugins run <id> <change-path>`
7. Update one installed plugin with `ospec plugins update <id>`
8. Update every installed plugin with `ospec plugins update --all`

## Update Scope

- `ospec update [path]` is project-scoped and only updates plugins that are enabled in that project
- `ospec plugins update --all` is machine-scoped and updates every installed plugin recorded by OSpec
- if an installed plugin package was manually deleted, `ospec plugins update --all` attempts to restore it before upgrading
- AI / `/ospec` flows should only run `ospec plugins update --all` when the user explicitly asks to update all installed plugins

## Package Model

- Plugins are published as npm packages
- Package names use `@clawplays/ospec-plugin-<id>`
- The main CLI stays in `@clawplays/ospec-cli`
- Official plugins are npm-installed packages, not built into the CLI package
- Official plugin discovery uses the bundled registry snapshot in `assets/plugins/registry.json`
- When available, the CLI also refreshes official plugin metadata from the public registry snapshot exposed through `clawplays/ospec`
- Newly published official plugins become discoverable to existing CLI installs after that public registry snapshot is refreshed

## Asset Model

- `runtime`: executable review or automation logic
- `skill`: prompt bundles for Codex and Claude
- `knowledge`: docs or future RAG-ready assets
