# Vibe Coding / Spec Flow Working Document for Current Project

## 1. Purpose of Document

This document is used to organize the spec processes that are actually still in use in the current repository and are intended to be retained.

The core changes after this round of adjustments are:

- Initialization is no longer split into two mandatory steps: "protocol shell initialization + first docs generate"
- `ospec init` now directly brings the repository to a state ready for submitting changes
- `ospec docs generate` is moved down to a follow-up maintenance command
- Dashboard has been removed; the flow is unified back to the CLI

## 2. Current Mainline Process

The current project converges into a four-stage mainline:

1. Initialization to `change-ready`
2. Active change execution
3. Deployment and verification
4. Requirement archiving

The corresponding common commands are:

```bash
ospec init [path]
ospec new <change-name> [path]
ospec progress [changes/active/<change>]
ospec verify [changes/active/<change>]
ospec finalize [changes/active/<change>]
```

If you only need to maintain the project knowledge layer later, use:

```bash
ospec docs generate [path]
```

## 3. Structural Judgment After Initialization

In the current implementation, the structural level is fixed to only use:

- `none`

The following will no longer be used:

- `basic`
- `full`

This means that judgments after initialization no longer rely on structural level names, but directly look at:

- Whether it is initialized
- Whether it is `change-ready`
- Whether docs coverage is complete
- Whether active changes exist
- Whether the current change is ready for archiving

## 4. Current Spec Layering

### 4.1 Protocol Shell

The protocol shell focuses on the collaboration rules themselves. Core files include:

- `.skillrc`
- `.ospec/`
- `changes/active/`
- `changes/archived/`
- `SKILL.md`
- `SKILL.index.json`
- `for-ai/*`

### 4.2 Project Knowledge Layer

The project's long-term knowledge layer is mainly placed in:

- `docs/project/overview.md`
- `docs/project/tech-stack.md`
- `docs/project/architecture.md`
- `docs/project/module-map.md`
- `docs/project/api-overview.md`

These documents are generated for the first time by `ospec init` by default; if they need to be refreshed or repaired later, they are handled by `ospec docs generate`.

### 4.3 Execution Spec for a Single Change

The fixed protocol files for each active change are:

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

The true source for execution status remains:

- `state.json`

## 5. Current Execution Order

The recommended order for a single change remains:

1. Read context and constraints
2. Create or update `proposal.md`
3. Create or update `tasks.md`
4. Implement code
5. Update affected `SKILL.md`
6. Rebuild `SKILL.index.json`
7. Complete `verification.md`
8. Archive after passing the archive gate

## 6. Relationship Between verify and archive

### `ospec verify`

Currently acts more like a pre-check, mainly checking:

- Whether `proposal.md / tasks.md / verification.md` exist
- Whether activated optional steps are covered by documentation
- Whether the checklist still has unchecked items
- Whether the current status in `state.json` is reasonable

### `ospec archive`

Currently the true archiving gate, with stricter requirements:

- `state.json.status == ready_to_archive`
- `verification_passed`
- `skill_updated`
- `index_regenerated`
- Activated optional steps have entered `passed_optional_steps`
- `tasks.md` and `verification.md` no longer have unchecked items

### `ospec finalize`

Currently still the standard official closeout entry, used to string together:

- verify
- index refresh
- archive

## 7. Initialization and AI Follow-up Supplement

When a user expresses "initialize project using OSpec" through an AI prompt, the current recommended behavior is:

1. Directly enter the initialization flow
2. If project description documents already exist, reuse them directly
3. If sufficient context is missing, ask only once about project summary or tech stack
4. If the user does not supplement, continue initialization anyway and generate placeholder documents to be filled in
5. After initialization is complete, the repository should be directly ready for `ospec new`

When a user executes `ospec init` directly in the terminal:

- No conversational follow-up questions
- Directly drop placeholder project documents
- Ensure the result is still `change-ready`

## 8. Items Removed in This Round

### 8.1 Dashboard

Dashboard-related code and commands have been removed.

The current repository no longer retains:

- Dashboard command entry
- Dashboard server code
- Dashboard static frontend assets
- Dashboard-related help text

### 8.2 `basic / full` Structural Levels

Structural judgment only retains `none`.

When discussing the flow later, the following will no longer be used:

- This repository is now `basic`
- This repository is now `full`

Unified to discussing:

- Whether it is initialized
- Whether it is `change-ready`
- Whether the knowledge layer is complete
- Whether a change is in execution
- Whether it is ready for archiving
