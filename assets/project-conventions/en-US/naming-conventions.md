---
name: project-naming-conventions
title: Project Naming Conventions
tags: [conventions, naming, ospec]
---

# Naming Conventions

## Goal

This file is the project-adopted copy of the OSpec mother spec. It fixes naming rules inside the project so AI and humans do not invent naming patterns ad hoc.

## Core Rules

- Directories, modules, and change names use lowercase kebab-case
- Flags and optional steps use lowercase snake_case
- Workflow protocol files keep their fixed filenames
- API docs use semantic kebab-case names

## Change Names

- Use `changes/active/<change-name>/`
- Example: `add-token-refresh`
- Avoid dates, spaces, uppercase names, and non-semantic labels

## Module Names

- Module directories use semantic English names
- Example: `src/modules/auth`, `src/modules/content`
- Each module keeps its `SKILL.md` at the module root

## Document Names

- Project docs live in `docs/project/`
- Design docs live in `docs/design/`
- Planning docs live in `docs/planning/`
- API docs live in `docs/api/`
- Living feature docs live in `docs/features/`

## Feature Slugs

- Feature slugs use lowercase kebab-case and match `^[a-z0-9]+(-[a-z0-9]+)*$`
- A slug is unique across the whole project; a duplicate fails `ospec index build` and names both locations
- A slug is declared inline, on the first non-blank line under its `##` heading in `docs/features/<domain>.md`: `<!-- ospec:feature <slug> code:src/a/,src/b/ -->`
- Name the behaviour, not the change: `login-timeout`, not `fix-login-bug-2026`
- A section with no declaration is simply not a feature, which is allowed

## Fixed Protocol Files

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

## Execution Requirement

- Check this file before adding a new directory, module, change, or workflow flag
- If implementation diverges from this file, bring the code and docs back into alignment first

