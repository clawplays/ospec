# Prompt Guide

## Principle

Prompt OSpec with short intent, not with long internal checklists.

OSpec should expand the inspection, initialization, docs-maintenance, and change rules internally.

## Recommended Prompts

In normal delivery work, OSpec usage can be explained in 3 parts:

1. initialize the project
2. create and advance one change for a requirement, documentation update, or bug fix
3. archive the accepted change after deployment and validation are complete

### 1. Initialize The Project

Recommended prompt:

```text
Use OSpec to initialize this project.
```

Claude / Codex skill form:

```text
Use $ospec to initialize this project.
```

Equivalent CLI:

```bash
ospec init .
ospec init . --summary "Internal admin portal for operations"
ospec init . --summary "Internal admin portal for operations" --tech-stack node,react,postgres
ospec init . --architecture "Single web app with API and shared auth" --document-language en-US
```

What this means:

- `ospec init` should take the repository to a change-ready state
- if AI assistance is available and project context is missing, OSpec can ask once for summary or tech stack
- if no extra context is provided, OSpec should still continue with placeholder docs

### 2. Create And Advance One Change

Recommended prompt:

```text
Use OSpec to create and advance a change for this requirement.
```

Claude / Codex skill form:

```text
Use $ospec-change to create and advance a change for this requirement.
```

![OSpec Change slash command example](assets/ospecchange-slash-command.svg)

Equivalent CLI:

```bash
ospec new docs-homepage-refresh .
ospec new fix-login-timeout .
ospec new update-billing-copy .
```

### 3. Archive After Acceptance

Recommended prompt:

```text
Use OSpec to archive this accepted change.
```

Claude / Codex skill form:

```text
Use $ospec to archive this accepted change.
```

Equivalent CLI:

```bash
ospec verify changes/active/<change-name>
ospec finalize changes/active/<change-name>
```

What this means:

- first complete your project-specific deployment, test, QA, or acceptance flow
- then use `ospec verify` to confirm the change is ready
- finally use `ospec finalize` to rebuild indexes and archive the accepted change

## Prompt Boundaries

You usually do not need to repeat:

- the internal file checklist for init
- protocol-shell verification steps
- warnings like "do not create a web template" on every prompt
- warnings like "do not start queue mode" on every prompt

Those are OSpec defaults and should be enforced by the CLI and the installed skills.
