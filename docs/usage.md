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
ospec plugins status [path]
ospec plugins enable stitch [path]
```

## Recommended Flow

For a fresh directory:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

Recommended user-facing sequence:

- initialize the repository
- execute one requirement in a change
- deploy and validate with your project-specific flow, then run `ospec verify`
- archive the validated change with `ospec finalize`

`ospec init` now aims to leave the repository in a `change-ready` state:

- create the protocol shell
- generate baseline project knowledge docs
- reuse existing project docs when available
- ask one concise follow-up for project summary or tech stack in AI-assisted flows when context is missing
- fall back to placeholder docs when context is still missing
- do not create the first change automatically
- do not apply business scaffold automatically

If you want to pass project context during init, you can do it directly:

```bash
ospec init [path] --summary "Internal admin portal" --tech-stack node,react,postgres
ospec init [path] --architecture "Single web app with API and shared auth" --document-language en-US
ospec init [path] --architecture "Support workspace" --document-language ja-JP
ospec init [path] --architecture "Customer operations portal" --document-language ar
```

Language resolution priority during init:

- in AI-assisted flows: explicit language request in the conversation -> current conversation language -> persisted project language in `.skillrc`
- in CLI flows: explicit `--document-language` -> persisted project language in `.skillrc` -> inferred from existing project docs / `for-ai/*` / asset manifest
- fallback `en-US`

Project language persistence:

- OSpec stores the selected project document language in `.skillrc`
- later `for-ai` guidance refreshes, `ospec new`, and `ospec update` reuse that persisted project language by default
- change the project language explicitly if you want future generated docs to switch languages

Direct CLI init stays non-interactive. If the repository has no usable project description and you do not pass flags, OSpec should still generate placeholder docs and leave the repository ready for `ospec new`.

If you want an explicit project snapshot for troubleshooting, `ospec status [path]` is still available, but it is no longer the default first step in the recommended flow.

## Project Knowledge Maintenance

Use `docs generate` when the repository is already initialized and you want to refresh, repair, or backfill project knowledge docs:

```bash
ospec docs generate [path]
```

Use cases:

- an older repository was initialized before the new `change-ready` init flow
- project docs were deleted or drifted out of date
- you added new modules or APIs and want the knowledge layer refreshed

`docs generate`:

- refreshes project knowledge docs
- keeps scaffold explicit
- does not create the first change automatically
- does not create `docs/project/bootstrap-summary.md`

## Queue Flow

If you explicitly want to manage multiple changes as a queue:

```bash
ospec queue add <change-name> [path]
ospec queue status [path]
ospec run start [path] --profile manual-safe
ospec run step [path]
```

Queue mode stays explicit:

- the default workflow is still one active change
- if one active change already exists, use `ospec progress` to continue it and use `ospec queue add` for additional work instead of creating another active change
- queue mode starts only when you explicitly use `queue` or `run`
- `manual-safe` keeps execution manual and only tracks or advances the queue explicitly
- `archive-chain` only finalizes and advances on an explicit `run step`

## Upgrading An Existing Project

For a project that is already initialized:

```bash
npm install -g @clawplays/ospec-cli@0.4.0
ospec update [path]
```

This upgrades the official OSpec CLI package `@clawplays/ospec-cli` and keeps the `ospec` command in sync.

If you installed from this repository locally:

```bash
npm install -g .
ospec update [path]
```

`ospec update [path]` will:

- refresh protocol docs
- refresh project tooling and Git hooks
- migrate legacy root-level `build-index-auto.cjs` / `build-index-auto.js` into `.ospec/tools/build-index-auto.cjs`
- sync managed `ospec` and `ospec-change` skills
- refresh managed workspace assets for already-enabled plugins
- backfill `.skillrc.documentLanguage` for older projects when the language can be recovered from existing project assets

`ospec update [path]` will not:

- enable or disable plugins automatically
- migrate existing active changes into a new plugin workflow automatically
- complete Stitch approval or create plugin review artifacts for you

If an older project is still missing project knowledge docs, rerun:

```bash
ospec init [path]
```

or, if you only want docs maintenance:

```bash
ospec docs generate [path]
```

## Progress And Closeout

During execution, the main commands are:

```bash
ospec changes status [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec archive [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

`ospec finalize` is the standard closeout path. It verifies the change, refreshes the index, archives the change, and leaves Git commit as a separate manual step.
