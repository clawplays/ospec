"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHelpAction = isHelpAction;
exports.getDocsHelpText = getDocsHelpText;
exports.getSkillsHelpText = getSkillsHelpText;
exports.getSkillHelpText = getSkillHelpText;
exports.getIndexHelpText = getIndexHelpText;
exports.getWorkflowHelpText = getWorkflowHelpText;
exports.getPluginsHelpText = getPluginsHelpText;
exports.getBatchHelpText = getBatchHelpText;
exports.getChangesHelpText = getChangesHelpText;
exports.getQueueHelpText = getQueueHelpText;
exports.getRunHelpText = getRunHelpText;
exports.getExecuteHelpText = getExecuteHelpText;
exports.getSessionHelpText = getSessionHelpText;
const HELP_ACTIONS = new Set(['help', '--help', '-h']);
function isHelpAction(action) {
    return HELP_ACTIONS.has(action || '');
}
function getDocsHelpText() {
    return `
Docs Commands:
  ospec docs status [path]    - show project docs coverage and missing items
  ospec docs generate [path]  - refresh, repair, or backfill the project knowledge layer after initialization
                               - does not create business scaffold or docs/project/bootstrap-summary.md
  ospec docs sync-protocol [path] - refresh protocol/AI adopted docs for an existing project
                                   - affects future work only; does not migrate existing changes
  ospec docs help             - show docs command help
`;
}
function getSkillsHelpText() {
    return `
Skills Commands:
  ospec skills status [path]  - show layered skill coverage and index status
  ospec skills help           - show skills command help
`;
}
function getSkillHelpText() {
    return `
Skill Package Commands:
  ospec skill status [skill-name] [dir]          - inspect one Codex OSpec skill; managed skills are ospec, ospec-change, and ospec-goal
  ospec skill install [skill-name] [dir]         - install one Codex OSpec skill; managed skills are ospec, ospec-change, and ospec-goal
  ospec skill status-claude [skill-name] [dir]   - inspect one Claude Code OSpec skill; managed skills are ospec, ospec-change, and ospec-goal
  ospec skill install-claude [skill-name] [dir]  - install one Claude Code OSpec skill; managed skills are ospec, ospec-change, and ospec-goal
  ospec skill author [dir]                       - show OSpec-native skill authoring workflow guidance
  ospec skill check [dir]                        - check a local skill package before install or publication
  ospec skill help                  - show skill command help
`;
}
function getIndexHelpText() {
    return `
Index Commands:
  ospec index check [path]  - inspect index presence, freshness, and stats
  ospec index build [path]  - rebuild SKILL.index.json
  ospec index help          - show index command help
`;
}
function getWorkflowHelpText() {
    return `
Workflow Commands:
  ospec workflow show [path]        - show workflow configuration for the project
  ospec workflow list-flags [path]  - list supported workflow flags
  ospec workflow set-mode <mode> [path] - switch the project workflow mode and sync .skillrc.workflow
  ospec workflow help               - show workflow command help
`;
}
function getPluginsHelpText() {
    return `
Plugins Commands:
  ospec plugins list [--json]           - list official and installed npm plugins with current npm metadata when available
  ospec plugins info <plugin> [--json]  - show one plugin's package, version, manifest, and install status
  ospec plugins install <plugin|package> - install one plugin globally with npm and cache its knowledge assets locally
  ospec plugins installed [--json]      - list globally installed OSpec plugins from ~/.ospec/plugins/installed.json
  ospec plugins update <plugin> [--check] - check or update one globally installed plugin package
  ospec plugins update --all [--check]  - check or update every globally installed plugin package recorded by OSpec
  ospec plugins status [path]          - show plugin and capability status
  ospec plugins doctor stitch [path]   - validate the configured Stitch provider adapter or custom Stitch runner config
  ospec plugins doctor checkpoint [path] - validate checkpoint base_url, workspace scaffold, target-project deps, and runner config
  ospec plugins enable stitch [path]   - enable Stitch for new changes by default
  ospec plugins enable checkpoint [path] --base-url <url> - enable checkpoint, save the runtime base URL, and auto-install checkpoint deps into the target project
  ospec plugins disable stitch [path]  - disable Stitch for new changes by default
  ospec plugins disable checkpoint [path] - disable checkpoint for new changes by default; does not uninstall project deps
  ospec plugins run stitch <path>      - run the configured Stitch provider adapter or custom runner and submit a preview
  ospec plugins run checkpoint <path>  - run checkpoint automation, write gate/result artifacts, and sync passed optional steps
  ospec plugins approve stitch <path>  - mark Stitch design review approved and sync verification.md
  ospec plugins reject stitch <path>   - mark Stitch design review rejected and sync verification.md
  ospec plugins help                   - show plugins command help
`;
}
function getBatchHelpText() {
    return `
Batch Commands:
  ospec batch export [path]  - export change data in batch
  ospec batch stats [path]   - show aggregated change statistics
  ospec batch help           - show batch command help
`;
}
function getChangesHelpText() {
    return `
Changes Commands:
  ospec changes status [path]  - show PASS/WARN/FAIL protocol status for every active change
  ospec finalize [path]        - verify and archive a completed change before commit
  ospec changes help           - show changes command help
`;
}
function getQueueHelpText() {
    return `
Queue Commands:
  ospec queue status [path]                    - show queued changes without activating them
  ospec queue add <change-name> [path] [--flags flag1,flag2] - create a queued change explicitly
  ospec queue activate <change-name> [path]    - move one queued change into changes/active
  ospec queue next [path]                      - activate the next queued change
  ospec queue help                             - show queue command help
`;
}
function getRunHelpText() {
    return `
Run Commands:
  ospec run start [path] [--profile manual-safe|archive-chain] - start explicit queue tracking
  ospec run status [path]                                      - show queue run status and active task graph snapshot
  ospec run step [path]                                        - advance one explicit queue step
  ospec run resume [path]                                      - resume a paused or failed queue run
  ospec run stop [path]                                        - pause the current queue run
  ospec run logs [path]                                        - show recent queue run log lines
  ospec run help                                               - show run command help
`;
}
function getExecuteHelpText() {
    return `
Execute Commands:
  Goal-only unless noted; classic Changes use ospec progress, top-level ospec verify, and ospec finalize.
  ospec execute bootstrap [goal-path|project-path] - write a one-Goal startup/resume snapshot with project session brief context and next safe action
  ospec execute handoff [goal-path|project-path] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] - write a cross-harness worker handoff guide with native agent mapping and project session context
  ospec execute preflight [goal-path|project-path] [--stage design|plan] [--force] - run or reuse a zero-token deterministic planning preflight
  ospec execute status [goal-path|project-path] [--brief] - show task graph controller state; prefer --brief and the emitted packet path for controller loops
  ospec execute next [goal-path|project-path]   - show dispatchable next task(s)
  ospec execute route [goal-path|project-path]  - write a workflow-route artifact with the next recommended OSpec command
  ospec execute workspace [goal-path|project-path] - inspect git workspace safety and write workspace-status artifacts
  ospec execute worktree [goal-path|project-path] [--branch name] [--path path] [--base ref] - write an isolated worktree preparation plan without creating it
  ospec execute worktree [goal-path|project-path] --create [--branch name] [--path path] [--base ref] - explicitly run git worktree add and record the result
  ospec execute worktree [goal-path|project-path] --cleanup [--path path] - explicitly run git worktree remove for the planned or provided worktree path
  ospec execute finish [goal-path|project-path] [--target main] [--remote origin] - write a closeout readiness plan without finalizing, merging, pushing, or deleting worktrees
  ospec execute dispatch [goal-path|project-path] [--task task-id] [--limit N] - create parallel-safe worker dispatch packet(s) with session context, worker profiles, and target tool mapping
  ospec execute launch [goal-path|project-path] [--task task-id] [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--dry-run] [--json] - write the capability-based runtime adapter launch plan without starting workers; --json prints the machine-readable artifact
  ospec execute collect [goal-path|project-path] [--task task-id] [--run run-id] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."] - collect a worker run into task completion state
  ospec execute retry [goal-path|project-path] --task task-id [--run run-id] [--summary "..."] [--force] - reopen a blocked or failed task and create a fresh dispatch packet
  ospec execute complete <task-id> [goal-path|project-path] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."] [--usage-file usage.json] - record a worker result and ingest the dispatch usage sidecar automatically when present; NEEDS_CONTEXT/BLOCKED writes blocker escalation artifacts
  ospec execute defer-blocker <task-id> [goal-path|project-path] --reason "..." - explicitly defer a durable external acceptance blocker to final review so dependency-safe implementation can continue; the task stays BLOCKED and finalization/archive remain gated
  ospec execute sync [goal-path|project-path]   - sync worker status, bootstrap/state.json, and the project session brief
  ospec execute review [goal-path|project-path] [--task task-id] [--stage spec|quality] - create a non-controller task-level or final review packet; controller Goals use ospec loop tick
  ospec execute feedback [goal-path|project-path] [--stage spec|quality] [--summary "..."] - write a review feedback handling plan without editing source files
  ospec execute repair [goal-path|project-path] - convert all NEEDS_CHANGES final-review findings into one grouped repair task and dispatch
  ospec execute decision [change-path|project-path] --id id --question "..." --option id:label:impact --option id:label:impact [--recommended id] [--required|--optional] - record a durable user choice gate that can block dispatch until selected
  ospec execute decision [change-path|project-path] --id id --select option-id --answered-by user [--summary "..."] - record the user's selected option with explicit provenance and unblock required decision gates
  ospec execute debug [goal-path|project-path] --phase reproduce|isolate|hypothesize|fix|verify --symptom "..." --root-cause "..." [--status CONFIRMED|FIXED|BLOCKED|SKIPPED] [--hypothesis "..."] [--command "..."] [--summary "..."] - record staged debugging evidence
  ospec execute tdd [goal-path|project-path] --phase red|green|refactor --command "npm test -- focused" [--status PASSED|FAILED|BLOCKED|SKIPPED] [--exit-code 1] [--test "..."] [--summary "..."] - record TDD cycle evidence
  ospec execute require-verification [goal-path|project-path] --id id --kind browser|e2e|test|lint|build|manual|other --description "..." [--required|--optional] - persist a verification surface that final verification and archive must enforce
  ospec execute verify [goal-path|project-path] --command "npm test" [--status PASSED|FAILED|BLOCKED|SKIPPED] [--satisfies requirement-id] [--exit-code N] [--summary "..."] - record verification evidence; PASSED requires --exit-code 0
  ospec execute help                              - show execute command help
`;
}
function getSessionHelpText() {
    return `
Session Commands:
  ospec session [path]             - write .ospec/session-brief.json and .ospec/session-brief.md with active change, queue, cache fingerprint, and safe next command context
  ospec session hook [path]        - write session-start and using-ospec hook artifacts, plus the Claude Code hook bundle under .ospec/hooks/claude/
  ospec session [path] --hook      - same as ospec session hook [path]
  ospec session hook [path] --apply        - also merge the OSpec hooks into .claude/settings.json (idempotent, reversible)
  ospec session hook [path] --target claude - select the harness hook bundle to generate (default: claude)
`;
}
