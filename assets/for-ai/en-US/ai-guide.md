---
name: project-ai-guide
title: AI Guide
tags: [ai, guide, ospec]
---

# AI Guide

## What This Is

The entry pointer for the project-adopted AI rules copied from the OSpec mother spec. Follow the project-adopted rules under `for-ai/` instead of improvising from the mother repo; where they differ from the mother spec, the project-adopted rules win. This file is a router: every rule it names is stated in full in the protocol file for your profile, and this file never asks you to open a document your profile forbids.

## Who Reads What

- **Classic change** (`workflow_profile_id: change`, `ospec change` / `ospec-change`): read `for-ai/change-protocol.md`. It is the whole flow — `proposal.md`, `tasks.md`, implementation, `verification.md`, `review.md`, `state.json` — and it stays that way regardless of complexity, flags, file count, risk, or batch size. Do not read or run the `ospec execute …` controller layer.
- **Goal** (`workflow_profile_id: goal`, `ospec goal` / `ospec-goal`, any `ospec execute …` / `ospec loop …` work): the `ospec-goal` skill carries the operating rules — session brief, design and plan, task graph, dispatch, launch, review, evidence, closeout, and archive gates. `for-ai/execution-protocol.md` is the authoritative detail behind them; open it when a named situation needs that detail, not as a step of entering the layer.
- **Project conventions**, loaded on demand rather than up front: `for-ai/naming-conventions.md`, `for-ai/skill-conventions.md`, `for-ai/workflow-conventions.md`, `for-ai/development-guide.md`.

## Working Order

1. Read `.skillrc` for layout, document language, workflow policy, and model profiles.
2. Route with `ospec index query <keyword...>`. Never read `SKILL.index.json` wholesale — it grows without bound as changes archive.
3. Read the current session brief, bootstrap, dispatch, review, or repair packet, then open only the change artifacts, target files, and indexed docs that packet names.
4. Follow the skill for the active profile. Open the protocol file listed above only when a named situation needs the detail behind a rule.

Write every change document and brainstorm you author in the project's document language (`.skillrc` `documentLanguage`); never infer it from product copy, site locale, or an "English-first" requirement, and do not mix languages within one change.

Two contracts every profile needs — the decision-gate ladder and force archive — are stated in full where your profile is already sent, so read them there and nowhere else: `for-ai/change-protocol.md` for a classic change, `for-ai/execution-protocol.md` for a goal. Force archive always requires explicit user acceptance and is never automatic.
