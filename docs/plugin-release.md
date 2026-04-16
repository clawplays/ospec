# Plugin Release

Plugin packages are published through the plugin release workflow, separately from the main CLI package flow.

## Recommended Automation Model

For official plugin packages, the recommended long-term automation model is:

1. Keep the shared plugin workflow in `.github/workflows/publish-plugin.yml`
2. Configure one reusable `NPM_TOKEN` secret in `clawplays/ospec-src`
3. Publish every plugin through the same workflow

This is the only fully automated path for brand-new plugin packages because npm Trusted Publishing is configured per package after the package already exists.

The workflow still keeps `id-token: write` enabled so existing packages may also use npm OIDC trust later, but the plugin system should assume `NPM_TOKEN` is the always-available automation path.

## GitHub Actions Setup

1. Create a granular npm access token for the `@clawplays` scope with:
   - package read and write access
   - bypass 2FA enabled
   - package selection broad enough to cover future official plugins
2. Add the token to the GitHub repository as the `NPM_TOKEN` secret.
3. Keep plugin package metadata accurate:
   - `name`
   - `version`
   - `repository`
   - `homepage`
   - `bugs`
4. Merge the workflow changes to `main`.

When the source repository is private, the workflow automatically publishes without `--provenance` because npm provenance currently requires a public GitHub source repository.

## Local Flow

1. Update `plugins/<id>/`
2. Run `npm run plugins:check -- --plugin <id>`
3. Optionally run `npm run plugins:pack -- --plugin <id>`
4. Tag the release as `plugin-<id>@<version>`
5. Publish through the plugin workflow or with `npm run plugins:publish -- --plugin <id>`

## GitHub Actions Flow

1. Commit and push the plugin changes.
2. Push a tag named `plugin-<id>@<version>`.
3. GitHub Actions validates the plugin metadata and publishes the package.
4. The same workflow also supports `workflow_dispatch` for manual retries.

You can also run the workflow manually with `workflow_dispatch` and pass:

- `plugin_id`
- `expected_version` (optional)
- `ref` (optional)

## Adding a New Official Plugin

1. Create `plugins/<id>/package.json`.
2. Add the plugin entry to `plugins/catalog.json`.
3. Run `npm run plugins:sync`.
4. Run `npm run plugins:check -- --plugin <id>`.
5. Optionally run `npm run plugins:pack -- --plugin <id>` to review the tarball contents.
6. Merge the plugin to `main`.
7. Publish the plugin through the shared workflow using `NPM_TOKEN`.
8. Keep the public plugin registry snapshot in `clawplays/ospec/plugins/registry.json` in sync so existing CLI installs can discover the new plugin without waiting for the next CLI npm release.

No workflow changes are required for a new plugin as long as it follows the same `plugins/<id>` layout and tag format.

## Main Package Boundary

- `@clawplays/ospec-cli` keeps its existing package release flow
- plugin package source trees stay excluded from the release-repo export
- the public release repo now carries `plugins/registry.json` so official plugin metadata can be refreshed independently of plugin package publishing
