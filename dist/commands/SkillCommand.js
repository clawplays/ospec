"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillCommand = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
const ACTION_SKILLS = [
    {
        name: 'ospec-init',
        title: 'OSpec Init',
        description: 'Initialize an OSpec repository to change-ready state without creating the first change automatically.',
        shortDescription: 'Initialize OSpec to change-ready',
        defaultPrompt: 'Use $ospec-init to initialize the target directory with ospec init so the repository ends in change-ready state. Reuse existing project docs when available. In AI-assisted init, map an explicit language request or the current conversation language to --document-language instead of assuming a brand-new repo will infer it. If the repository lacks a usable project overview and you are in an AI-assisted flow, ask one concise question for project summary or tech stack before calling ospec init with those inputs; if the user declines, run plain ospec init and allow placeholder docs. Verify the protocol-shell files and project knowledge docs on disk. Do not create the first change automatically.',
        markdown: `# OSpec Init



Use this action when the user intent is initialization.



## Guardrails



- use \`ospec init [path]\` so the repository ends in change-ready state

- in AI-assisted init, map an explicit language request or the current conversation language to \`--document-language\`

- verify root \`.skillrc\` and \`README.md\`, plus managed OSpec files under \`.ospec/\` including \`.ospec/SKILL.md\`, \`.ospec/SKILL.index.json\`, \`.ospec/changes/\`, \`.ospec/tools/build-index-auto.cjs\`, \`.ospec/for-ai/\`, and \`.ospec/docs/project/\` on disk for new projects

- if project overview context is missing and AI can ask follow-up questions, ask for a brief summary or tech stack before initialization; if the user declines, fall back to placeholder docs

- use \`ospec status [path]\` only when you want an explicit summary or troubleshooting snapshot

- do not assume a web template when the project type is unclear

- do not create the first change unless explicitly requested



## Commands



\`\`\`bash

ospec init [path]

ospec init [path] --document-language zh-CN

ospec init [path] --summary "..." --tech-stack node,react

ospec status [path]

\`\`\`

`,
    },
    {
        name: 'ospec-inspect',
        title: 'OSpec Inspect',
        description: 'Inspect an existing repository to determine OSpec initialization level, docs coverage, skills coverage, and active change posture.',
        shortDescription: 'Inspect OSpec project state',
        defaultPrompt: 'Use $ospec-inspect to inspect the current repository state with ospec status, ospec docs status, ospec skills status, and ospec changes status. Prefer diagnosis before mutation.',
        markdown: `# OSpec Inspect



Use this action when the user wants to understand current project posture before changing anything.



## Commands



\`\`\`bash

ospec status [path]

ospec docs status [path]

ospec skills status [path]

ospec changes status [path]

\`\`\`



## Rules



- prefer inspection before initialization or backfill

- call out whether the repo is initialized and whether project knowledge docs are complete

`,
    },
    {
        name: 'ospec-backfill',
        title: 'OSpec Backfill',
        description: 'Refresh or repair the project knowledge layer for an initialized repository without creating a change.',
        shortDescription: 'Refresh project knowledge layer',
        defaultPrompt: 'Use $ospec-backfill to refresh, repair, or backfill the project knowledge layer for an initialized repository. Prefer ospec docs generate when you only need docs maintenance, keep scaffold explicit, and do not create the first change automatically.',
        markdown: `# OSpec Backfill



Use this action after the repository is already initialized and the project knowledge docs need maintenance.



## Guardrails



- require an initialized repository first

- prefer \`ospec docs generate [path]\`

- do not apply business scaffold during docs backfill

- do not generate \`docs/project/bootstrap-summary.md\`

- do not create a change unless explicitly requested



## Commands



\`\`\`bash

ospec docs status [path]

ospec docs generate [path]

ospec skills status [path]

ospec index check [path]

\`\`\`

`,
    },
    {
        name: 'ospec-change',
        title: 'OSpec Change',
        description: 'Create or advance an active change inside an OSpec project while respecting workflow files and optional-step activation.',
        shortDescription: 'Create or advance a change',
        defaultPrompt: 'Use $ospec-change to handle a requirement through the full OSpec change lifecycle. Inspect project state first, read the project-adopted guidance under `.ospec/for-ai/` (or legacy `for-ai/`) before writing, preserve the project document language already established in managed guidance and existing change files, and work inside the active change container. During normal AI-assisted change execution, draft or update `design.md` from the requirement, `proposal.md`, and project context before editing `implementation-plan.md`, deriving `artifacts/agents/task-graph.json`, editing `tasks.md`, or editing code; ask one concise design question only when the missing decision materially changes architecture, API, data, UI, or risk, otherwise record assumptions in `design.md`. Then draft or update `implementation-plan.md` from `design.md`, including target files, expected results, verification commands, dependencies, parallelizable work, and conflicts. Derive `artifacts/agents/task-graph.json` from `implementation-plan.md` before deriving `tasks.md`; each task must record status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role. When starting or resuming one active change, use `ospec execute bootstrap [changes/active/<change>]` to write `artifacts/agents/bootstrap.json` and `artifacts/agents/bootstrap.md` with the project session brief snapshot, then follow its next safe action; when an active dispatch is waiting, bootstrap recommends the matching `ospec execute launch ... --task ...` command. Use `ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]` when moving a change between agents, tools, worktrees, shells, or human operators; it writes `artifacts/agents/handoff.json` and `artifacts/agents/handoff.md` with the project session brief snapshot, target tool mapping, and safety rules, but does not launch workers or edit source files. Before assigning task work, use `ospec execute doc-review [changes/active/<change>] [--stage design|plan]` to create document reviewer packets with the project session brief snapshot under `artifacts/agents/document-review-dispatches/` and review artifacts at `artifacts/reviews/design-review.md` or `artifacts/reviews/implementation-plan-review.md`; design review must be approved before implementation plan review, and this command records artifacts only without launching reviewers, running shell commands, syncing worker status, or editing source files. Before assigning task work, use `ospec execute status [changes/active/<change>]` or `ospec execute next [changes/active/<change>]` when you need a controller view of ready, blocked, running, completed, and safe next task candidates. Before worker handoff, use `ospec execute workspace [changes/active/<change>]` to record git workspace safety in `artifacts/agents/workspace-status.json` and `artifacts/agents/workspace-status.md`; if status is `needs_isolation`, clean the workspace or move work into an isolated git worktree before parallel dispatch. Use `ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]` to write `artifacts/agents/worktree-plan.json` and `artifacts/agents/worktree-plan.md` before creating an isolated worktree; this command records a plan only and does not run `git worktree add`. Use `ospec execute finish [changes/active/<change>] [--target main] [--remote origin]` to write `artifacts/agents/finish-plan.json` and `artifacts/agents/finish-plan.md` before finalize, archive, push, PR, merge, or worktree cleanup; this command records readiness and command text only. Use `ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]` to create a parallel-safe batch of worker packets and `artifacts/agents/execution-session.json`; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior. Then use `ospec execute complete <task-id> ...` to record worker results; use `--task` for one explicit task and `--limit` to cap dispatch batch size. These commands also sync `artifacts/agents/worker-status.md`, update OSpec artifacts only, and leave native subagent dispatch to the current AI harness; `complete` writes blocker escalation artifacts under `artifacts/agents/blockers/` when the result is `NEEDS_CONTEXT` or `BLOCKED`. Use `ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]` after dispatch to write `artifacts/agents/launch-plan.json` and `artifacts/agents/launch-plan.md`; this is the native agent launch artifact and tells the controlling AI how to use the current harness native agent mechanism (`spawn_agent`/`wait_agent`/`close_agent` for Codex/GPT, Task for Claude Code, `@generalist` for Gemini, and `@mention` for OpenCode). It requires one active dispatch and ready workspace status, and does not start workers, run shell commands, or edit source files by itself. Default to current-harness native subagents for multi-worker execution: create parallel-safe packets with `ospec execute dispatch`, inspect `launch-plan.md`, then dispatch one native agent per safe packet in the current AI session. Use `ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N]` only as the final CLI fallback when the current AI harness cannot dispatch native subagents; the fallback renders an explicit command template, runs worker commands concurrently, records `artifacts/agents/orchestration-runs/`, captures worker runs, and collects results unless `--no-collect` is passed. Native subagent dispatch is the default path; only explicit fallback `--run --command` on `ospec execute launch ... --run --command "..."`, or fallback `ospec execute orchestrate` with an explicit command template, runs local worker commands and captures `artifacts/agents/worker-runs/`; collect launch runs with `ospec execute collect`, and use `ospec execute retry` to reopen corrected blocked, needs-context, or failed work with `artifacts/agents/retries/`; completed tasks require explicit `--force`. Use `ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]` after each completed worker task to create task-level reviewer packets with the project session brief snapshot; task decisions are stored under `artifacts/reviews/tasks/<task-id>/`, and dependent tasks must not dispatch until task spec and quality reviews are approved. Use `ospec execute review [changes/active/<change>] [--stage spec|quality]` without `--task` after all task-level reviews are approved and the task graph is completed to create final whole-change reviewer packets with the project session brief snapshot under `artifacts/agents/review-dispatches/`; do not dispatch final quality review before final spec review is approved. Only explicit `ospec execute review ... --run --command "..."` runs a local reviewer command, captures `artifacts/agents/review-runs/`, and can write the matching task-level or final review decision when `--decision` is provided. Use `ospec execute feedback [changes/active/<change>] [--stage spec|quality]` after a review artifact has a non-`PENDING` decision to write `artifacts/agents/review-feedback-plan.json` and `artifacts/agents/review-feedback-plan.md`; this records how to accept, revise, clarify, or unblock review feedback without editing source files or launching workers. When debugging is part of the change, use `ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED` to record `artifacts/agents/debug-evidence.json`; this command records evidence only and does not run shell commands. After focused test runs, use `ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..." --status ...` to record `artifacts/agents/tdd-evidence.json`; this command records evidence only and does not run shell commands. After running fresh project checks, use `ospec execute verify [changes/active/<change>] --command "..." --status PASSED` to record `artifacts/agents/verification-evidence.json`; this command records evidence only and does not run shell commands. Use `ospec execute sync [changes/active/<change>]` after manual task graph, execution-session, review artifact, debug evidence, or verification checklist edits to rebuild `artifacts/agents/worker-status.md`. Do not archive while the task graph has unresolved task statuses, invalid dependencies, missing execution details, or top-level `status` other than `completed`. After implementation, complete each task-level spec review before the same task quality review, then complete final `artifacts/reviews/spec-compliance.md` before final `artifacts/reviews/code-quality.md`; do not archive while any task-level or final review decision is `PENDING`, `NEEDS_CHANGES`, or `BLOCKED`. During implementation and review, keep `artifacts/agents/worker-status.md` aligned with implementer, spec reviewer, quality reviewer, and controller statuses; do not claim completion while any worker status is `PENDING`, `NEEDS_CONTEXT`, or `BLOCKED`, and the controller status must be `DONE` before archive. In new nested projects the physical change directory lives under `.ospec/changes/active/<change>`, while CLI shorthand like `changes/active/<change>` is still accepted. Default to one active change and do not enter queue mode unless the user explicitly asks to split work into multiple changes, create a queue, or execute a queue. When queue behavior is explicitly requested, derive an ordered kebab-case list of change names, use ospec queue add to create queued changes, and use ospec run manual-safe only when the user explicitly asks to run the queue. Use verify, archive-check, finish-plan, or finalize for closeout. For plugin discovery use ospec plugins list or ospec plugins info. Before any npm plugin install step, check ospec plugins info <plugin> or ospec plugins installed first. If the plugin is already installed globally, reuse it and only enable it in the current project. For npm plugin installation use ospec plugins install only when the plugin is not installed yet or the user explicitly asks to reinstall or upgrade it. If the user asks to open or use Stitch or Checkpoint, do not reinstall by default: check whether it is already installed globally first, install only when missing, then enable/doctor/run/approve/reject in the current project as needed. Treat `ospec update [path]` as project-scoped: it repairs the current project and only upgrades plugins that are enabled in that project. Do not run `ospec plugins update --all` unless the user explicitly asks to update every installed plugin on the machine. If Stitch, Checkpoint, or any external plugin installation, provider switching, doctor remediation, MCP setup, auth setup, or plugin enablement is involved, read the localized plugin docs under .ospec/plugins/<plugin>/docs/ first; if they are missing, install or enable the plugin to sync them before changing config.',
        markdown: `# OSpec Change



Use this skill when the user says things like "use ospec change to do a requirement".



## Scope



This skill is the single entry for the full change lifecycle inside an initialized OSpec project:

- requirement intake

- change naming or matching

- proposal, design, implementation-plan, task graph, review artifacts, agent worker status, and task refinement

- implementation guidance

- progress tracking

- verification

- archive readiness check

- finalize closeout



## Read Order



1. \`.skillrc\`

2. \`.ospec/SKILL.index.json\` for nested projects, or root \`SKILL.index.json\` for legacy classic projects

3. \`.ospec/for-ai/ai-guide.md\` for nested projects, or legacy \`for-ai/ai-guide.md\`

4. \`.ospec/for-ai/execution-protocol.md\` for nested projects, or legacy \`for-ai/execution-protocol.md\`

5. \`.ospec/changes/active/<change>/proposal.md\` for nested projects, or legacy \`changes/active/<change>/proposal.md\`

6. \`.ospec/changes/active/<change>/design.md\` for nested projects, or legacy \`changes/active/<change>/design.md\`

7. \`.ospec/changes/active/<change>/implementation-plan.md\` for nested projects, or legacy \`changes/active/<change>/implementation-plan.md\`

8. \`.ospec/changes/active/<change>/artifacts/agents/task-graph.json\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/task-graph.json\`
9. \`.ospec/changes/active/<change>/artifacts/agents/bootstrap.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/bootstrap.md\`
10. \`.ospec/changes/active/<change>/artifacts/agents/handoff.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/handoff.md\`
11. \`.ospec/changes/active/<change>/artifacts/agents/document-review-dispatches/\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/document-review-dispatches/\`
12. \`.ospec/changes/active/<change>/artifacts/agents/workspace-status.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/workspace-status.md\`
13. \`.ospec/changes/active/<change>/artifacts/agents/worktree-plan.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/worktree-plan.md\`
14. \`.ospec/changes/active/<change>/artifacts/agents/finish-plan.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/finish-plan.md\`
15. \`.ospec/changes/active/<change>/artifacts/agents/launch-plan.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/launch-plan.md\`
16. \`.ospec/changes/active/<change>/artifacts/agents/worker-runs/\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/worker-runs/\`
17. \`.ospec/changes/active/<change>/artifacts/agents/review-runs/\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/review-runs/\`
18. \`.ospec/changes/active/<change>/artifacts/agents/retries/\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/retries/\`
19. \`.ospec/changes/active/<change>/tasks.md\` for nested projects, or legacy \`changes/active/<change>/tasks.md\`
20. \`.ospec/changes/active/<change>/artifacts/reviews/design-review.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/reviews/design-review.md\`
21. \`.ospec/changes/active/<change>/artifacts/reviews/implementation-plan-review.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/reviews/implementation-plan-review.md\`
22. \`.ospec/changes/active/<change>/artifacts/reviews/spec-compliance.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/reviews/spec-compliance.md\`
23. \`.ospec/changes/active/<change>/artifacts/reviews/code-quality.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/reviews/code-quality.md\`
24. \`.ospec/changes/active/<change>/artifacts/agents/worker-status.md\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/worker-status.md\`

21. \`.ospec/changes/active/<change>/artifacts/agents/debug-evidence.json\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/debug-evidence.json\`

22. \`.ospec/changes/active/<change>/artifacts/agents/tdd-evidence.json\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/tdd-evidence.json\`

23. \`.ospec/changes/active/<change>/artifacts/agents/verification-evidence.json\` for nested projects, or legacy \`changes/active/<change>/artifacts/agents/verification-evidence.json\`

24. \`.ospec/changes/active/<change>/state.json\` for nested projects, or legacy \`changes/active/<change>/state.json\`

25. \`.ospec/changes/active/<change>/verification.md\` for nested projects, or legacy \`changes/active/<change>/verification.md\`

26. \`.ospec/changes/active/<change>/review.md\` for nested projects, or legacy \`changes/active/<change>/review.md\`



## Language



- Follow the project-adopted document language from managed \`for-ai/\` guidance and existing change docs.

- Keep Chinese projects in Chinese unless the repo explicitly adopts English.



## Design Drafting



- Do not ask the user to hand-write \`design.md\` during normal AI-assisted change execution.

- After creating or finding the active change, draft or update \`design.md\` from the user requirement, \`proposal.md\`, and project context before editing \`implementation-plan.md\`, deriving \`artifacts/agents/task-graph.json\`, editing \`tasks.md\`, or editing code.

- Ask at most one concise question only when a missing decision would materially change architecture, API, data, UI, or risk. Otherwise record explicit assumptions in \`design.md\`.

- \`design.md\` must cover the selected approach, key tradeoffs, affected boundaries, risks, constraints, open questions, and why the resulting tasks are valid.

- Draft or update \`implementation-plan.md\` from \`design.md\` before deriving \`artifacts/agents/task-graph.json\` and \`tasks.md\`.

- \`implementation-plan.md\` must identify target files, expected results, verification commands, dependencies, parallelizable work, and conflicts.

- Derive \`artifacts/agents/task-graph.json\` from \`implementation-plan.md\` before deriving \`tasks.md\`; each task must record status, dependencies, parallel safety, conflicts, target files, verification commands, expected result, and worker role.

- Use \`ospec execute bootstrap [changes/active/<change>]\` when starting or resuming a single active change to write \`artifacts/agents/bootstrap.json\` and \`artifacts/agents/bootstrap.md\` with the project session brief snapshot; follow its next safe action before dispatch, launch, review, verification, or finish. When an active dispatch is waiting, bootstrap recommends the matching \`ospec execute launch ... --task ...\` command.

- Use \`ospec execute status [changes/active/<change>]\` or \`ospec execute next [changes/active/<change>]\` to inspect controller state and safe next task candidates before assigning task work.

- Use \`ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]\` when moving a change between agents, tools, worktrees, shells, or human operators; it writes \`artifacts/agents/handoff.json\` and \`artifacts/agents/handoff.md\` with the project session brief snapshot, target tool mapping, and safety rules, but does not launch workers or edit source files.

- Use \`ospec execute doc-review [changes/active/<change>] [--stage design|plan]\` before deriving or dispatching implementation tasks to create document reviewer packets with the project session brief snapshot under \`artifacts/agents/document-review-dispatches/\` and review artifacts at \`artifacts/reviews/design-review.md\` or \`artifacts/reviews/implementation-plan-review.md\`; design review must be approved before implementation plan review. This command records artifacts only and does not launch reviewers, run shell commands, sync worker status, or edit source files.

- Before worker handoff, use \`ospec execute workspace [changes/active/<change>]\` to record git workspace safety in \`artifacts/agents/workspace-status.json\` and \`artifacts/agents/workspace-status.md\`. If status is \`needs_isolation\`, clean the workspace or move work into an isolated git worktree before parallel dispatch.

- Use \`ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]\` to write \`artifacts/agents/worktree-plan.json\` and \`artifacts/agents/worktree-plan.md\` before creating an isolated worktree; this command records a plan only and does not run \`git worktree add\`.

- Use \`ospec execute finish [changes/active/<change>] [--target main] [--remote origin]\` to write \`artifacts/agents/finish-plan.json\` and \`artifacts/agents/finish-plan.md\` before finalize, archive, push, PR, merge, or worktree cleanup; this command records readiness and command text only.

- Use \`ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]\` to create a parallel-safe batch of worker packets and \`artifacts/agents/execution-session.json\`; each packet includes the project session brief snapshot and a worker profile with capability tier, recommended target, target tool mapping, rationale, and required behavior. Use \`ospec execute complete <task-id> ...\` to record worker results. Use \`--task\` for one explicit task and \`--limit\` to cap dispatch batch size. These commands also sync \`artifacts/agents/worker-status.md\`, update OSpec artifacts only, and leave native subagent dispatch to the current AI harness; \`complete\` writes blocker escalation artifacts under \`artifacts/agents/blockers/\` when the result is \`NEEDS_CONTEXT\` or \`BLOCKED\`.

- Use \`ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]\` after dispatch to write the native agent launch plan; it tells the controlling AI how to use the current harness mechanism: Codex/GPT \`spawn_agent\`/\`wait_agent\`/\`close_agent\`, Claude Code Task, Gemini \`@generalist\`, and OpenCode \`@mention\`. It requires one active dispatch and ready workspace status, and does not start workers, run shell commands, or edit source files by itself.

- Default to current-harness native subagents for multi-worker execution: create parallel-safe packets with \`ospec execute dispatch\`, inspect \`launch-plan.md\`, then dispatch one native agent per safe packet in the current AI session. Use \`ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N]\` only as the final CLI fallback when the current AI harness cannot dispatch native subagents; the fallback renders an explicit command template, runs worker commands concurrently, records \`artifacts/agents/orchestration-runs/\`, captures worker runs, and collects results unless \`--no-collect\` is passed.

- Use \`--run --command\` with \`ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] --run --command "..." [--timeout-ms N]\` only as single-worker CLI fallback when native subagents are unavailable or explicitly bypassed; it captures stdout, stderr, exit code, timeout metadata, and run metadata under \`artifacts/agents/worker-runs/\`, then use \`ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id]\` to record the task result.

- Use \`ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--force]\` after a blocked, needs-context, or failed run has been corrected; it writes \`artifacts/agents/retries/\`, reopens the task, and creates a fresh dispatch packet. Completed tasks require explicit \`--force\`.

- Use \`ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]\` after each completed worker task to create task-level reviewer packets with the project session brief snapshot; task decisions are stored under \`artifacts/reviews/tasks/<task-id>/\`, and dependent tasks must not dispatch until task spec and quality reviews are approved.

- Use \`ospec execute review [changes/active/<change>] [--stage spec|quality]\` without \`--task\` after all task-level reviews are approved and the task graph is completed to create final whole-change reviewer packets with the project session brief snapshot under \`artifacts/agents/review-dispatches/\`; do not dispatch final quality review before final spec review is approved.

- Use \`ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..."\` only when explicitly asked to run a local reviewer command; it captures review stdout/stderr under \`artifacts/agents/review-runs/\` and can update the matching task-level or final review artifact when \`--decision\` is provided.

- Use \`ospec execute feedback [changes/active/<change>] [--stage spec|quality]\` after a review artifact has a non-\`PENDING\` decision to write \`artifacts/agents/review-feedback-plan.json\` and \`artifacts/agents/review-feedback-plan.md\`; this records how to accept, revise, clarify, or unblock review feedback and does not edit source files or launch workers.

- Use \`ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED\` when debugging is part of the change to record \`artifacts/agents/debug-evidence.json\`. This command records evidence only and does not run shell commands.

- Use \`ospec execute tdd [changes/active/<change>] --phase red|green|refactor --command "..."\` after focused test runs to record \`artifacts/agents/tdd-evidence.json\`. This command records evidence only and does not run shell commands.

- Use \`ospec execute verify [changes/active/<change>] --command "..."\` after running fresh project checks to record \`artifacts/agents/verification-evidence.json\`. This command records evidence only and does not run shell commands.

- Use \`ospec execute sync [changes/active/<change>]\` after manual task graph, execution-session, review artifact, debug evidence, or verification checklist edits to rebuild \`artifacts/agents/worker-status.md\`.

- Do not archive while \`artifacts/agents/task-graph.json\` has unresolved task statuses, invalid dependencies, missing execution details, or top-level \`status\` other than \`completed\`.

- If \`tasks.md\` already exists but \`design.md\` or \`implementation-plan.md\` is still a template, update those upstream docs first, then reconcile \`tasks.md\` to match them.

- After implementation, complete each task-level spec review before the same task quality review, then complete final \`artifacts/reviews/spec-compliance.md\` before final \`artifacts/reviews/code-quality.md\`.

- Do not archive while any task-level or final review decision is \`PENDING\`, \`NEEDS_CHANGES\`, or \`BLOCKED\`.

- During implementation and review, keep \`artifacts/agents/worker-status.md\` aligned with implementer, spec reviewer, quality reviewer, and controller statuses.

- Do not claim completion while any worker status is \`PENDING\`, \`NEEDS_CONTEXT\`, or \`BLOCKED\`; the controller status must be \`DONE\` before archive.



## Required Logic



1. Inspect repository state first when posture is unclear.

2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.

3. If the request is a new requirement, derive a concise kebab-case change name and create it.

4. If the matching active change already exists, continue it instead of duplicating it.

5. Treat the managed active change directory as the execution container. In nested projects that is \`.ospec/changes/active/<change>/\`, while CLI shorthand such as \`changes/active/<change>\` is still acceptable.

6. Keep \`proposal.md\`, \`design.md\`, \`implementation-plan.md\`, \`artifacts/agents/task-graph.json\`, \`artifacts/agents/bootstrap.md\`, \`artifacts/agents/handoff.md\`, \`artifacts/agents/document-review-dispatches/\`, \`artifacts/agents/workspace-status.md\`, \`artifacts/agents/worktree-plan.md\`, \`artifacts/agents/finish-plan.md\`, \`artifacts/agents/launch-plan.md\`, \`artifacts/agents/worker-runs/\`, \`artifacts/agents/review-runs/\`, \`artifacts/agents/retries/\`, \`artifacts/agents/review-feedback-plan.md\`, \`tasks.md\`, \`artifacts/reviews/design-review.md\`, \`artifacts/reviews/implementation-plan-review.md\`, \`artifacts/reviews/spec-compliance.md\`, \`artifacts/reviews/code-quality.md\`, \`artifacts/agents/worker-status.md\`, \`artifacts/agents/debug-evidence.json\`, \`artifacts/agents/tdd-evidence.json\`, \`artifacts/agents/verification-evidence.json\`, \`state.json\`, \`verification.md\`, and \`review.md\` aligned with actual execution and with the project's established document language.

7. Use OSpec closeout commands instead of inventing a parallel process.

8. Use \`ospec plugins list\` or \`ospec plugins info\` before assuming an npm plugin exists.

9. Treat plugin installation and project enablement as separate actions unless the user explicitly asks for both.



## Commands



\`\`\`bash

ospec status [path]

ospec new <change-name> [path]

ospec changes status [path]

ospec execute bootstrap [changes/active/<change>]

ospec execute handoff [changes/active/<change>] [--target codex|gpt|claude|gemini|opencode|shell|generic]

ospec execute doc-review [changes/active/<change>] [--stage design|plan]

ospec execute status [changes/active/<change>]

ospec execute next [changes/active/<change>]

ospec execute workspace [changes/active/<change>]

ospec execute worktree [changes/active/<change>] [--branch name] [--path path] [--base ref]

ospec execute finish [changes/active/<change>] [--target main] [--remote origin]

ospec execute dispatch [changes/active/<change>] [--task task-id] [--limit N]

ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] [--dry-run]

ospec execute orchestrate [changes/active/<change>] --command "..." [--target codex|gpt|claude|gemini|opencode|shell|generic] [--limit N] [--max-rounds N] [--timeout-ms N] # fallback only

ospec execute launch [changes/active/<change>] [--task task-id] [--target codex|gpt|claude|gemini|opencode|shell|generic] --run --command "..." [--timeout-ms N] # fallback only

ospec execute collect [changes/active/<change>] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."]

ospec execute retry [changes/active/<change>] --task task-id [--run run-id] [--summary "..."] [--force]

ospec execute complete <task-id> [changes/active/<change>] --status DONE --summary "..."

ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality]

ospec execute review [changes/active/<change>] [--task task-id] [--stage spec|quality] --run --command "..." [--decision APPROVED|APPROVED_WITH_CONCERNS|NEEDS_CHANGES|BLOCKED|PENDING] [--summary "..."]

ospec execute feedback [changes/active/<change>] [--stage spec|quality] [--summary "..."]

ospec execute debug [changes/active/<change>] --symptom "..." --root-cause "..." --status FIXED --command "npm test -- focused" --summary "..."

ospec execute tdd [changes/active/<change>] --phase red --command "npm test -- focused" --status FAILED --exit-code 1 --summary "..."

ospec execute tdd [changes/active/<change>] --phase green --command "npm test -- focused" --status PASSED --exit-code 0 --summary "..."

ospec execute verify [changes/active/<change>] --command "npm test" --status PASSED --exit-code 0 --summary "..."

ospec execute sync [changes/active/<change>]

ospec progress [changes/active/<change>]

ospec verify [changes/active/<change>]

ospec archive [changes/active/<change>] --check

ospec finalize [changes/active/<change>]

ospec plugins list

ospec plugins info <plugin>

ospec plugins install <plugin>

\`\`\`



## Guardrails



- Do not assume dashboard workflows exist.

- Do not refer to \`basic\` or \`full\` structure levels.

- Do not confuse repository initialization with change execution.

- Do not claim completion until implementation, verification notes, and closeout status are aligned.

- If real project tests exist, run or recommend them separately from \`ospec verify\`.

`,
    },
    {
        name: 'ospec-verify',
        title: 'OSpec Verify',
        description: 'Verify a OSpec change and inspect aggregated PASS/WARN/FAIL status across all active changes before commit or archive.',
        shortDescription: 'Verify changes and summaries',
        defaultPrompt: 'Use $ospec-verify to verify change protocol completeness with ospec verify and ospec changes status. Highlight PASS, WARN, and FAIL items before archive or commit.',
        markdown: `# OSpec Verify



Use this action when validating delivery readiness.



## Commands



\`\`\`bash

ospec verify [changes/active/<change>]

ospec changes status [path]

ospec index check [path]

\`\`\`



## Rules



- show PASS, WARN, and FAIL clearly

- incomplete checklists are warnings

- missing protocol files or optional-step coverage are failures

`,
    },
    {
        name: 'ospec-archive',
        title: 'OSpec Archive',
        description: 'Archive a completed OSpec change after checking workflow gates, and support an explicit check-only mode when needed.',
        shortDescription: 'Archive a completed change',
        defaultPrompt: 'Use $ospec-archive to archive a completed OSpec change. Check readiness first, then run ospec archive on the active change path. If you only need a dry check, use ospec archive --check.',
        markdown: `# OSpec Archive



Use this action when a change is complete and should be archived before commit.



## Commands



\`\`\`bash

ospec archive [changes/active/<change>]

ospec archive [changes/active/<change>] --check

ospec verify [changes/active/<change>]

ospec changes status [path]

\`\`\`



## Rules



- state.json.status must be \`ready_to_archive\`

- verification and optional-step coverage must already be complete

- archive before commit; do not expect commit to archive automatically

- use \`--check\` only when you want readiness output without executing archive

`,
    },
    {
        name: 'ospec-finalize',
        title: 'OSpec Finalize',
        description: 'Run the standard change closeout flow, verify protocol completeness, refresh the index, and archive the completed change before commit.',
        shortDescription: 'Finalize a completed change',
        defaultPrompt: 'Use $ospec-finalize to close a completed OSpec change. Run the preflight verification, rebuild the index, move the change through archive, and leave the repository ready for manual commit.',
        markdown: `# OSpec Finalize



Use this action when implementation is complete and the change should be closed before commit.



## Commands



\`\`\`bash

ospec finalize [changes/active/<change>]

ospec changes status [path]

\`\`\`



## Rules



- finalize is the default closeout path for a completed change

- it should verify protocol completeness before archive

- it should archive before commit

- Git commit remains manual unless the project explicitly adds optional automation

`,
    },
];
class SkillCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', skillNameOrTargetDir, targetDir) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getSkillHelpText)());
                return;
            }
            const { provider, verb } = this.resolveAction(action);
            const selection = this.resolveSkillSelection(skillNameOrTargetDir, targetDir);
            switch (verb) {
                case 'install': {
                    const result = await this.installSkill(provider, selection.skillName, selection.targetDir);
                    this.success(`Installed ospec ${result.providerLabel} skill: ${result.skillName}`);
                    this.info(`  target: ${result.targetDir}`);
                    break;
                }
                case 'status': {
                    const result = await this.getInstalledSkillStatus(provider, selection.skillName, selection.targetDir);
                    console.log(`\n${result.providerLabel} Skill Status`);
                    console.log(`${'='.repeat(`${result.providerLabel} Skill Status`.length)}\n`);
                    console.log(`Skill: ${result.skillName}`);
                    console.log(`Target: ${result.targetDir}`);
                    console.log(`In sync: ${result.inSync ? 'yes' : 'no'}`);
                    for (const asset of result.assets) {
                        console.log(`  ${asset.relativePath}: ${asset.exists ? 'present' : 'missing'}`);
                    }
                    if (result.missingFiles.length > 0) {
                        console.log('\nMissing files:');
                        for (const item of result.missingFiles) {
                            console.log(`  - ${item}`);
                        }
                    }
                    if (result.driftedFiles.length > 0) {
                        console.log('\nOut-of-sync files:');
                        for (const item of result.driftedFiles) {
                            console.log(`  - ${item}`);
                        }
                    }
                    if (!result.inSync) {
                        console.log(`\nRecommendation: run "${(0, helpers_1.formatCliCommand)('ospec', 'skill', this.getInstallAction(provider), result.skillName, selection.targetDir)}" to sync this skill.`);
                    }
                    console.log('');
                    break;
                }
            }
        }
        catch (error) {
            this.error(`Skill command failed: ${error}`);
            throw error;
        }
    }
    resolveAction(action) {
        switch (action) {
            case 'install':
                return { provider: 'codex', verb: 'install' };
            case 'status':
                return { provider: 'codex', verb: 'status' };
            case 'install-claude':
                return { provider: 'claude', verb: 'install' };
            case 'status-claude':
                return { provider: 'claude', verb: 'status' };
            default:
                throw new Error(`Unknown skill action: ${action}`);
        }
    }
    getInstallAction(provider) {
        return provider === 'claude' ? 'install-claude' : 'install';
    }
    resolveSkillSelection(skillNameOrTargetDir, targetDir) {
        const first = String(skillNameOrTargetDir || '').trim();
        const second = String(targetDir || '').trim();
        if (second && !this.isKnownSkillName(first)) {
            throw new Error(`Unknown skill name: ${first}`);
        }
        if (first && this.isKnownSkillName(first)) {
            return {
                skillName: first,
                targetDir: second || undefined,
            };
        }
        if (first && !second && first.startsWith('ospec')) {
            throw new Error(`Unknown skill name: ${first}`);
        }
        return {
            skillName: 'ospec-change',
            targetDir: first || undefined,
        };
    }
    isKnownSkillName(skillName) {
        return this.getAvailableSkillNames().includes(skillName);
    }
    getAvailableSkillNames() {
        return ['ospec', ...ACTION_SKILLS.map(skill => skill.name), 'ospec-cli'];
    }
    async installSkill(provider, skillName, targetDir) {
        const skillPackage = await this.buildSkillPackage(provider, skillName, targetDir);
        await this.syncSkillFiles(skillPackage.assets, skillPackage.targetDir);
        return this.getInstalledSkillStatus(provider, skillName, targetDir);
    }
    async getInstalledSkillStatus(provider, skillName, targetDir) {
        const skillPackage = await this.buildSkillPackage(provider, skillName, targetDir);
        const assets = await Promise.all(skillPackage.assets.map(async (asset) => {
            const absolutePath = path_1.default.join(skillPackage.targetDir, asset.relativePath);
            const exists = await services_1.services.fileService.exists(absolutePath);
            const inSync = exists && (await services_1.services.fileService.readFile(absolutePath)) === asset.content;
            return {
                relativePath: asset.relativePath,
                absolutePath,
                exists,
                inSync,
            };
        }));
        return {
            provider,
            providerLabel: provider === 'claude' ? 'Claude Code' : 'Codex',
            skillName,
            targetDir: skillPackage.targetDir,
            assets,
            inSync: assets.every(asset => asset.inSync),
            missingFiles: assets.filter(asset => !asset.exists).map(asset => asset.absolutePath),
            driftedFiles: assets.filter(asset => asset.exists && !asset.inSync).map(asset => asset.absolutePath),
        };
    }
    async buildSkillPackage(provider, skillName, targetDir) {
        const resolvedTargetDir = this.resolveTargetDir(provider, skillName, targetDir);
        if (skillName === 'ospec-cli') {
            const compatibilityFiles = await this.buildLegacyAliasPackage(provider, resolvedTargetDir);
            return {
                name: 'ospec-cli',
                targetDir: resolvedTargetDir,
                assets: compatibilityFiles.assets,
            };
        }
        const definition = await this.getSkillDefinition(skillName);
        return {
            name: definition.name,
            targetDir: resolvedTargetDir,
            assets: await this.buildPackageAssets(provider, definition),
        };
    }
    async getSkillDefinition(skillName) {
        if (skillName === 'ospec') {
            return this.buildPrimarySkillDefinition();
        }
        const definition = ACTION_SKILLS.find(skill => skill.name === skillName);
        if (!definition) {
            throw new Error(`Unknown skill name: ${skillName}`);
        }
        return definition;
    }
    async buildPrimarySkillDefinition() {
        const sourceFiles = this.resolvePrimarySourceFiles();
        const sourceSkillMd = await services_1.services.fileService.readFile(sourceFiles.skillMdPath);
        const sourceSkillYaml = await services_1.services.fileService.readFile(sourceFiles.skillYamlPath);
        const sourceOpenaiYaml = await services_1.services.fileService.readFile(sourceFiles.openaiYamlPath);
        return {
            name: 'ospec',
            title: 'OSpec',
            description: 'Protocol-shell-first OSpec workflow for inspection, change-ready initialization, docs maintenance, change execution, verification, and archive readiness.',
            shortDescription: 'Inspect, initialize, and operate OSpec projects',
            defaultPrompt: this.extractInterfaceDefaultPrompt(sourceSkillYaml, sourceOpenaiYaml),
            markdown: sourceSkillMd,
            skillYaml: sourceSkillYaml,
            openaiYaml: sourceOpenaiYaml,
        };
    }
    async buildPackageAssets(provider, definition) {
        if (provider === 'claude') {
            return [
                {
                    relativePath: 'SKILL.md',
                    content: this.withClaudeFrontmatter(definition.name, definition.description, this.stripFrontmatter(this.buildSkillMarkdown(definition))),
                },
            ];
        }
        return [
            {
                relativePath: 'SKILL.md',
                content: this.buildSkillMarkdown(definition),
            },
            {
                relativePath: 'skill.yaml',
                content: definition.skillYaml || this.buildCodexSkillYaml(definition),
            },
            {
                relativePath: 'agents/openai.yaml',
                content: definition.openaiYaml || this.buildOpenAiYaml(definition),
            },
        ];
    }
    async buildLegacyAliasPackage(provider, targetDir) {
        if (provider === 'claude') {
            return {
                targetDir,
                assets: [
                    {
                        relativePath: 'SKILL.md',
                        content: this.withClaudeFrontmatter('ospec-cli', 'Legacy compatibility alias for the OSpec skill in Claude Code. Use when existing prompts, automation, or habits still refer to ospec-cli.', this.stripFrontmatter(this.buildCodexLegacyAliasFiles().skillMd)),
                    },
                ],
            };
        }
        const compatibilityFiles = this.buildCodexLegacyAliasFiles();
        return {
            targetDir,
            assets: [
                { relativePath: 'SKILL.md', content: compatibilityFiles.skillMd },
                { relativePath: 'skill.yaml', content: compatibilityFiles.skillYaml },
                { relativePath: 'agents/openai.yaml', content: compatibilityFiles.openaiYaml },
            ],
        };
    }
    async syncSkillFiles(assets, targetDir) {
        await services_1.services.fileService.ensureDir(targetDir);
        for (const asset of assets) {
            const absolutePath = path_1.default.join(targetDir, asset.relativePath);
            await services_1.services.fileService.ensureDir(path_1.default.dirname(absolutePath));
            await services_1.services.fileService.writeFile(absolutePath, asset.content);
        }
    }
    async isPackageInSync(assets, targetDir) {
        for (const asset of assets) {
            const absolutePath = path_1.default.join(targetDir, asset.relativePath);
            if (!(await services_1.services.fileService.exists(absolutePath))) {
                return false;
            }
            if ((await services_1.services.fileService.readFile(absolutePath)) !== asset.content) {
                return false;
            }
        }
        return true;
    }
    buildCodexSkillYaml(definition) {
        return `name: ${definition.name}

title: ${definition.title}

description: ${definition.description}

author: OSpec Team

license: MIT



interface:

  display_name: "${definition.title}"

  short_description: "${definition.shortDescription}"

  default_prompt: "${this.escapeYaml(definition.defaultPrompt)}"

`;
    }
    buildOpenAiYaml(definition) {
        return `interface:

  display_name: "${definition.title}"

  short_description: "${definition.shortDescription}"

  default_prompt: "${this.escapeYaml(definition.defaultPrompt)}"

`;
    }
    resolvePackageRoot() {
        return path_1.default.resolve(__dirname, '..', '..');
    }
    resolvePrimarySourceFiles() {
        const packageRoot = this.resolvePackageRoot();
        return {
            skillMdPath: path_1.default.join(packageRoot, 'SKILL.md'),
            skillYamlPath: path_1.default.join(packageRoot, 'skill.yaml'),
            openaiYamlPath: path_1.default.join(packageRoot, 'agents', 'openai.yaml'),
        };
    }
    withClaudeFrontmatter(name, description, markdownBody) {
        return `---

name: ${name}

description: ${description}

---



${markdownBody.trimStart()}`;
    }
    stripFrontmatter(markdown) {
        return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    }
    buildSkillMarkdown(definition) {
        if (/^---\r?\n/.test(definition.markdown)) {
            return this.ensureFrontmatterDescription(definition.markdown, definition.description);
        }
        return `---

name: ${definition.name}

description: ${definition.description}

tags: [ospec, cli, workflow]

---



${definition.markdown.trimStart()}`;
    }
    ensureFrontmatterDescription(markdown, description) {
        if (!/^---\r?\n/.test(markdown)) {
            return markdown;
        }
        if (/^---\r?\n[\s\S]*?\r?\ndescription:\s+/m.test(markdown)) {
            return markdown;
        }
        return markdown.replace(/^---\r?\n/, `---\ndescription: ${description}\n`);
    }
    escapeYaml(value) {
        return value.replace(/"/g, '\\"');
    }
    extractInterfaceDefaultPrompt(skillYaml, openaiYaml) {
        const match = skillYaml.match(/default_prompt:\s*"([\s\S]*?)"/) ||
            openaiYaml.match(/default_prompt:\s*"([\s\S]*?)"/);
        return match?.[1]?.replace(/\\"/g, '"') || 'Use $ospec to operate this OSpec project.';
    }
    buildCodexLegacyAliasFiles() {
        return {
            skillMd: `---

name: ospec-cli

description: Legacy compatibility alias for the OSpec skill. Use when existing prompts, automation, or habits still refer to ospec-cli; follow the same OSpec workflow, but prefer the newer $ospec skill name in fresh prompts.

---



# OSpec CLI Legacy Alias



This skill is a compatibility wrapper for the main \`ospec\` skill.



Prefer this prompt style for new work:



1. \`Use ospec to initialize this directory\`

2. \`Use ospec to inspect this repository\`

3. \`Use ospec to refresh or repair the project knowledge layer\`

4. \`Use ospec to create and advance a change for this requirement\`



Always keep these guardrails:



- protocol shell first

- no assumed web template when the project type is unclear

- no business scaffold during plain init

- no automatic first change



Use the same command surface:



\`\`\`bash

ospec status [path]

ospec init [path]

ospec docs generate [path]

ospec changes status [path]

ospec skill status

ospec skill install

ospec skill status-claude

ospec skill install-claude

\`\`\`

`,
            skillYaml: `name: ospec-cli

title: OSpec CLI (Legacy Alias)

description: Legacy compatibility alias that redirects ospec-cli skill usage to the newer ospec skill name.

author: OSpec Team

license: MIT



interface:

  display_name: "OSpec CLI"

  short_description: "Legacy alias for the OSpec skill"

  default_prompt: "Use $ospec to initialize this directory according to OSpec rules: init should end in change-ready state, reuse existing docs when available, map an explicit language request or the current conversation language to --document-language during AI-assisted init instead of assuming a brand-new repo will infer it, ask for missing summary or tech stack in AI-assisted flows before falling back to placeholder docs, avoid assumed web templates when the project type is unclear, and do not create the first change automatically."

`,
            openaiYaml: `interface:

  display_name: "OSpec CLI"

  short_description: "Legacy alias for the OSpec skill"

  default_prompt: "Use $ospec to initialize this directory according to OSpec rules: init should end in change-ready state, reuse existing docs when available, map an explicit language request or the current conversation language to --document-language during AI-assisted init instead of assuming a brand-new repo will infer it, ask for missing summary or tech stack in AI-assisted flows before falling back to placeholder docs, avoid assumed web templates when the project type is unclear, and do not create the first change automatically."

`,
        };
    }
    resolveTargetDir(provider, skillName, targetDir) {
        if (targetDir) {
            return targetDir;
        }
        return path_1.default.join(this.resolveProviderHome(provider), 'skills', skillName);
    }
    resolveProviderHome(provider) {
        const envHome = provider === 'claude'
            ? String(process.env.CLAUDE_HOME || '').trim()
            : String(process.env.CODEX_HOME || '').trim();
        if (envHome) {
            return path_1.default.resolve(envHome);
        }
        return provider === 'claude'
            ? path_1.default.join(os_1.default.homedir(), '.claude')
            : path_1.default.join(os_1.default.homedir(), '.codex');
    }
}
exports.SkillCommand = SkillCommand;
