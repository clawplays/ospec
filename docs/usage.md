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



## Global AI Skills

`npm install -g .` installs:

- the `OSpec Change` skill at `~/.codex/skills/ospec-change`
- the same `OSpec Change` skill at `~/.claude/skills/ospec-change`

Use the skill picker in Codex or Claude Code to start or continue the OSpec change workflow.

If you also want another OSpec skill, install it explicitly with:

```bash

ospec skill install
ospec skill install ospec-init
ospec skill install-claude ospec-init

```



## Recommended Flow







For a fresh directory:







```bash



ospec status [path]



ospec init [path]



```







If you explicitly want to build the project knowledge layer:







```bash



ospec docs generate [path]



```







If you explicitly want to start a requirement:







```bash



ospec new <change-name> [path]



```







If you explicitly want to manage multiple changes as a queue:

```bash

ospec queue add <change-name> [path]

ospec queue status [path]

ospec run start [path] --profile manual-safe

ospec run step [path]

```

Queue mode stays explicit:

- the default workflow is still one active change
- queue mode starts only when you explicitly use `queue` or `run`
- `manual-safe` keeps execution manual and only tracks or advances the queue explicitly
- `archive-chain` only finalizes and advances on an explicit `run step`

When a change is complete, close it out with:







```bash



ospec finalize [changes/active/<change>]



```







## Upgrading An Existing Project



For a project that is already initialized, use this sequence:



```bash



npm install -g @clawplays/ospec-cli@0.1.1



ospec update [path]



```



If you install from this local repository, the equivalent flow is:



```bash



npm install -g .



ospec update [path]



```



`ospec update [path]` will:

- refresh protocol docs
- refresh project tooling and Git hooks
- sync the managed `ospec-change` skills
- refresh managed workspace assets for plugins that are already enabled

`ospec update [path]` will not:

- enable or disable plugins automatically
- migrate existing active changes into a new plugin workflow automatically
- complete Stitch review steps or create plugin review artifacts for you

If you want Stitch in an existing project, still run:

```bash

ospec plugins enable stitch [path]
ospec plugins status [path]

```

If the project already has active changes, decide explicitly whether those old changes should join the new Stitch flow; `update` does not migrate them for you.



## Init Expectations







Plain initialization is intentionally minimal:







- it creates the OSpec protocol shell



- it does not create a web template or business scaffold by default



- it does not create the first change automatically



- Git hooks should stay quiet until active changes exist







## Progress And Checks







Use these commands when execution has started:







```bash



ospec changes status [path]



ospec progress [changes/active/<change>]



ospec verify [changes/active/<change>]



ospec archive [changes/active/<change>]



ospec finalize [changes/active/<change>]



```







`ospec finalize` is the standard closeout path. It verifies the completed change, refreshes the index, archives the change, and leaves the repository ready for manual commit.
