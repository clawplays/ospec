"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI_COMMAND_NAMES = exports.CLI_COMMANDS = void 0;
exports.isHelpAction = isHelpAction;
exports.hasHelpFlag = hasHelpFlag;
exports.isHelpRequest = isHelpRequest;
exports.getDocsHelpText = getDocsHelpText;
exports.getSkillsHelpText = getSkillsHelpText;
exports.getSkillHelpText = getSkillHelpText;
exports.getIndexHelpText = getIndexHelpText;
exports.getWorkflowHelpText = getWorkflowHelpText;
exports.getChangesHelpText = getChangesHelpText;
exports.getQueueHelpText = getQueueHelpText;
exports.getRunHelpText = getRunHelpText;
exports.getExecuteHelpText = getExecuteHelpText;
exports.getSessionHelpText = getSessionHelpText;
exports.getInitUsageText = getInitUsageText;
exports.getInitHelpText = getInitHelpText;
exports.getFinalizeUsageText = getFinalizeUsageText;
exports.getFinalizeHelpText = getFinalizeHelpText;
exports.getNewLikeUsage = getNewLikeUsage;
exports.getChangeHelpText = getChangeHelpText;
exports.getGoalHelpText = getGoalHelpText;
exports.getBrainstormHelpText = getBrainstormHelpText;
exports.getPlanHelpText = getPlanHelpText;
exports.getVerifyHelpText = getVerifyHelpText;
exports.getProgressHelpText = getProgressHelpText;
exports.getArchiveHelpText = getArchiveHelpText;
exports.getStatusHelpText = getStatusHelpText;
exports.getTriageHelpText = getTriageHelpText;
exports.getLayoutHelpText = getLayoutHelpText;
exports.getUpdateUsageText = getUpdateUsageText;
exports.getUpdateHelpText = getUpdateHelpText;
exports.getLoopHelpText = getLoopHelpText;
exports.getHelpTopicHelpText = getHelpTopicHelpText;
exports.getVersionHelpText = getVersionHelpText;
exports.resolveStdoutContract = resolveStdoutContract;
exports.getCommandHelpText = getCommandHelpText;
exports.getGlobalHelpText = getGlobalHelpText;
exports.getUnknownHelpTopicText = getUnknownHelpTopicText;
const HELP_ACTIONS = new Set(['help', '--help', '-h']);
const HELP_FLAGS = new Set(['--help', '-h']);
function isHelpAction(action) {
    return HELP_ACTIONS.has(action || '');
}
/**
 * A `--help`/`-h` anywhere in a subcommand's arguments is a help request, never
 * a positional value. Commands must print help and exit 0 without acting.
 */
function hasHelpFlag(commandArgs) {
    return commandArgs.some(arg => HELP_FLAGS.has(arg));
}
/**
 * Asking for help must never be mistaken for naming something. Both the flag
 * forms and the bare `help` word in the leading positional slot are help
 * requests, so `ospec goal help` prints help instead of creating a goal
 * literally named "help".
 */
function isHelpRequest(commandArgs) {
    return hasHelpFlag(commandArgs) || commandArgs[0] === 'help';
}
function getDocsHelpText() {
    return `
Docs Commands:
  ospec docs status [path]    - show project docs coverage and missing items
  ospec docs generate [path]  - refresh, repair, or backfill the project knowledge layer after initialization
                               - does not create business scaffold or docs/project/bootstrap-summary.md
  ospec docs sync-protocol [path] - refresh protocol/AI adopted docs for an existing project
                                   - affects future work only; does not migrate existing changes
  ospec docs locate --feature <slug> | --affects <path> [--path <dir>] [--limit N] [--json]
                              - find the ONE feature section to read: path#heading + line range
                              - --affects resolves through the code: declarations, most specific first
  ospec docs obligations [change-path] [--apply] [--json]
                              - show this change's located documentation obligations
                              - read-only without --apply; --apply records them and
                                injects the resolved target into the change
  ospec docs confirm [change-path] --id <obligation-id> [--note "..."]
                              - record a verification-type obligation as verified_unchanged,
                                for a refactor that genuinely changed no documented behaviour
  ospec docs audit [path] [--json]
                              - list feature sections whose code: paths changed since the
                                archive named by their ospec:last-change comment (read-only)
  ospec docs migrate [path] --plan [--apply]     - inventory the old generated documents, cluster the archives into candidate feature groups, and write docs/features/<domain>.md draft skeletons
  ospec docs migrate [path] --verify             - gate: refuse to proceed unless every old knowledge document maps to a feature section or is marked historical
  ospec docs migrate [path] --finalize [--apply] - delete the old generated documents, after printing and recording the list
                                   - every phase is a dry run without --apply; only --finalize --apply deletes anything
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
  ospec index query <keyword...> [--path <dir>] [--limit N] [--json] - return only the index entries matching the keywords; use this instead of reading the whole SKILL.index.json
  ospec index gc [path] [--apply] [--json] - list archived_changes entries whose archive directory is gone; --apply removes them
  ospec index tool-path     - print the installed CLI's own build-index tool path (used by the git hooks)
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
function getChangesHelpText() {
    return `
Changes Commands:
  ospec changes status [path]  - show PASS/WARN/FAIL protocol status for every active change
  ospec changes show <archive> [--md|--json] [--path <dir>] - render an archived change (summary, affects, files, verification commands, evidence links) from the index and the archive directory; writes nothing. The archive name matches by prefix or keyword.
  ospec finalize [path]        - verify and archive a completed change before commit
  ospec changes help           - show changes command help
`;
}
function getQueueHelpText() {
    return `
Queue Commands:
  ospec queue status [path]                    - show queued changes without activating them (alias: ospec queue list)
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
  ospec run step [path]                                        - advance one explicit queue step (aliases: ospec run tick, ospec run advance)
  ospec run resume [path]                                      - resume a paused or failed queue run
  ospec run stop [path]                                        - pause the current queue run (alias: ospec run pause)
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
  ospec execute status [goal-path|project-path] [--brief] [--repair] - show task graph controller state (read-only; --repair also reconciles goal progress and takes the task-graph mutation lease); prefer --brief and the emitted packet path for controller loops
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
  ospec execute complete <task-id> [goal-path|project-path] --report-file report.json [--usage-file usage.json] - preferred: record a worker result from a validated structured report (status/summary/changedPaths/evidence/concerns); the Markdown human view is rendered from it to artifacts/agents/worker-reports/<task-id>.md
  ospec execute complete <task-id> [goal-path|project-path] [--status DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED] [--summary "..."] [--usage-file usage.json] - record a worker result and ingest the dispatch usage sidecar automatically when present; NEEDS_CONTEXT/BLOCKED writes blocker escalation artifacts
  ospec execute review-decision [goal-path|project-path] --review artifacts/reviews/... --decision-file decision.json - settle an issued review from a validated JSON decision; writes the review Markdown and the sibling *.findings.json so severities are explicit instead of parsed from Markdown
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
  ospec session hook [path] --target claude - claude is the only supported harness hook bundle and the default; every other target is rejected
`;
}
function getInitUsageText() {
    return 'Usage: ospec init [root-dir] [--summary "..."] [--tech-stack node,react] [--architecture "..."] [--document-language en-US|zh-CN|ja-JP|ar]';
}
function getInitHelpText() {
    return getInitUsageText();
}
function getFinalizeUsageText() {
    return 'Usage: ospec finalize [changes/active/<change>] [--force-archive --confirm-force-archive <exact-change-name> (--reason "..." | --reason-file <path>)]';
}
function getFinalizeHelpText() {
    return `
Finalize Commands:
  ${getFinalizeUsageText()}
  ospec finalize [path]  - verify a change and archive it in one step
  --force-archive        - archive without a passing verification; requires --confirm-force-archive and a reason
Examples:
  ospec finalize ./changes/active/onboarding-flow
  ospec finalize ./changes/active/onboarding-flow --force-archive --confirm-force-archive onboarding-flow --reason "Accepted incomplete verification risk"
`;
}
function getNewLikeUsage(commandName) {
    return commandName === 'goal'
        ? 'Usage: ospec goal <goal-name> [root-dir] [--flags flag1,flag2] [--feature slug]... [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--execution-model controller] [--harness-interactive true|false] [--native-subagents supported|unknown|unsupported] [--native-goal supported|unknown|unsupported]'
        : `Usage: ospec ${commandName} <change-name> [root-dir] [--flags flag1,flag2] [--feature slug]...`;
}
function getChangeHelpText(commandName = 'change') {
    const alias = commandName === 'change' ? 'ospec new' : 'ospec change';
    return `
Change Commands:
  ${getNewLikeUsage(commandName)}
  Creates a classic fast-flow change under changes/active/<change-name>.
  --flags flag1,flag2  - workflow flags (for example high_risk, multi_file_change)
                         Run ospec workflow list-flags for this project's exact set.
  --feature slug       - a feature document slug this change touches; repeat for several.
                         Omit it and the command prints candidates to confirm; the
                         list may also stay empty and be filled in during planning.
  Alias: ${alias}
  Full OSpec goals use ospec goal instead.
Examples:
  ospec ${commandName} onboarding-flow
  ospec ${commandName} landing-refresh . --flags high_risk,multi_file_change
  ospec ${commandName} login-timeout-fix . --feature login-timeout
`;
}
function getGoalHelpText() {
    return `
Goal Commands:
  ${getNewLikeUsage('goal')}
  Creates a full OSpec goal with document, task graph, worker, review, and evidence workflow.
  --flags flag1,flag2   - workflow flags (for example complex_feature, multi_file_change)
  --feature slug        - a feature document slug this goal touches; repeat for several
  --target              - worker harness the goal is written for
  --execution-model     - controller (only supported model)
  --harness-interactive - true|false
  --native-subagents / --native-goal - supported|unknown|unsupported
  Drive the goal afterwards with ospec execute and ospec loop.
Examples:
  ospec goal billing-refactor . --flags complex_feature,multi_file_change
  ospec goal billing-refactor . --target codex --execution-model controller --harness-interactive true --native-subagents supported
`;
}
function getBrainstormHelpText() {
    return `
Brainstorm Commands:
  ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual] [--decision-gates] - write an optional pre-change brainstorm artifact
  ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> --answered-by user [--note "..."] - record a brainstorm decision gate answer
`;
}
function getPlanHelpText() {
    return `
Plan Commands:
  ospec plan [path] [--change change-path] [--from-brainstorm file] [--output id] [--apply] - write an optional implementation plan draft
  --apply  - write the plan into the change instead of leaving it as a draft
`;
}
function getVerifyHelpText() {
    return `
Verify Commands:
  ospec verify [change-path]  - verify change completion and refresh verification evidence
  Resolves the active change when no path is given.
Examples:
  ospec verify ./changes/active/onboarding-flow
`;
}
function getProgressHelpText() {
    return `
Progress Commands:
  ospec progress [change-path]  - show workflow progress for one change
  Resolves the active change when no path is given.
Examples:
  ospec progress ./changes/active/onboarding-flow
`;
}
function getArchiveHelpText() {
    return `
Archive Commands:
  ospec archive [change-path]           - archive a ready change into changes/archived
  ospec archive [change-path] --check   - only check archive readiness; read-only, never moves files and never repairs the task graph
  ospec archive [change-path] --check --repair - as --check, but also reconcile and repair goal progress (takes the task-graph mutation lease)
Examples:
  ospec archive ./changes/active/onboarding-flow --check
  ospec archive ./changes/active/onboarding-flow --check --repair
`;
}
function getStatusHelpText() {
    return `
Status Commands:
  ospec status [path]  - show project status: layout, active changes, queue, docs, and skills
Examples:
  ospec status
  ospec status .
`;
}
function getTriageHelpText() {
    return `
Triage Commands:
  ospec triage list [path]                 - list triage inbox items
  ospec triage claim [path] --id <id> [--by <name>] - claim one triage item
  ospec triage promote [path] --id <id>    - promote one triage item into the change queue
`;
}
function getLayoutHelpText() {
    return `
Layout Commands:
  ospec layout migrate [path] --to nested  - migrate a classic project layout to the nested .ospec layout
`;
}
function getUpdateUsageText() {
    return 'Usage: ospec update [path] [--clean-plugin-steps]';
}
function getUpdateHelpText() {
    return `
Update Commands:
  ${getUpdateUsageText()}
  ospec update [path]  - repair legacy projects and refresh docs/tooling/skills
  --clean-plugin-steps - also drop plugin-era optional_steps from active and queued
                         change documents; off by default because those are your own
                         change records and the stale entries are inert
  Removes pre-2.0 plugin guidance from managed files automatically and records what
  it removed in .ospec/plugin-migration.json. .ospec/plugins/ is user data and is
  never modified.
  Safe to re-run; it does not create or archive changes.
Examples:
  ospec update .
  ospec update . --clean-plugin-steps
`;
}
function getLoopHelpText() {
    return `
Loop Commands:
  Controller loop for Goals; classic Changes use ospec execute and ospec verify.
  ospec loop step [goal-path] --batch-file <path|-> [--json] [--no-tick] [--max-batch-chars N] - preferred: apply a whole batch (claims + results) and tick in ONE call, then emit the next action batch as compact JSON; replaces heartbeat x N + finalize x N + run --once
  ospec loop run|tick [goal-path] [--once] [--json] [--compact-json] - run one controller iteration and emit the next action items; budgets and concurrency come from ospec loop configure, not from flags
  ospec loop status [goal-path] [--brief] [--json]    - show loop state, leases, and budgets
  ospec loop poll [goal-path] [--json]                - return one loop-state snapshot immediately, including tickNow; it never waits for a change
  ospec loop tick-plan [goal-path]                    - show the next tick plan without executing it
  ospec loop pause [goal-path] / ospec loop resume [goal-path] - pause or resume the loop
  ospec loop configure [goal-path] [flags] - persist loop configuration; repeated allowlist flags replace the whole list instead of appending
    scheduling: [--interval text] [--max-iterations N|none] [--expires-at iso|none] [--budget-minutes N|none] [--budget-tokens N|none]
    concurrency: [--max-parallel N] [--max-parallel-reason text|none] [--continue-while-progressing true|false] [--no-progress-limit N]
    review: [--review-every N] [--review-gating strict|optimistic] [--max-task-repair-rounds N] [--max-final-repair-rounds N]
    harness: [--target codex|gpt|claude|gemini|grok|opencode|cursor|copilot|shell|generic] [--execution-model controller] [--harness-interactive true|false] [--native-subagents supported|unknown|unsupported] [--native-goal supported|unknown|unsupported] [--native-harness-metadata json|none]
    allowlist: [--test-command "..."] [--allow-path path] [--allow-command cmd] [--allow-command-policy json]
    limits: [--fresh-context true|false] [--prompt-max-chars N] [--implementation-max-runtime-minutes N] [--review-max-runtime-minutes N] [--verification-max-runtime-minutes N] [--evidence-result-grace-minutes N]
  ospec loop allowlist <derive|check|apply|clear> [goal-path] [--json] - manage the command allowlist
    derive|check|apply require --from-task-graph; apply also requires --expected-current-hash and --expected-candidate-hash from a fresh derive/check, and accepts [--expected-task-graph-hash H] [--approve-expansion]; clear requires --confirm
  ospec loop heartbeat [goal-path] --action-item <id> --executor <id> [--lease-ms N] - renew a worker lease (per-item fallback; prefer the "claims" array of ospec loop step)
  ospec loop result [goal-path] --action-item <id> --executor <id> [--exit-code N] [--tokens-used N] [--timed-out] [--summary "..."] - record a worker result
  ospec loop finalize [goal-path] --action-item <id> --executor <id> [--exit-code N] [--tokens-used N] [--timed-out] [--summary "..."] - record a final worker result
  ospec loop recover [goal-path] [--force]            - recover expired leases and stuck loop state
`;
}
function getHelpTopicHelpText() {
    return `
Help Commands:
  ospec help             - show the compact command list
  ospec help <command>   - show one command's help
  ospec <command> --help - same as ospec help <command>
  An unknown help topic fails with exit 1 and lists the valid topics.
`;
}
function getVersionHelpText() {
    return `
Version Commands:
  ospec version   - print the OSpec CLI version
  ospec -v, ospec --version - aliases for ospec version
`;
}
/** Shorthand for the common answer, kept readable in the table below. */
const PROSE = { mode: 'never' };
/**
 * `loop` is the one command with a machine-parsed DEFAULT.
 *
 * `loop step` is Phase 5 / F1's batched controller round-trip: `--compact-json`
 * is its default, so it emits a JSON document on every invocation including the
 * failure path, with no flag in argv to notice. Sniffing argv would classify the
 * flagship command of this phase as prose and cut its document in half.
 *
 * It is deliberately NOT declared `selfReducing`. `loop step` does reduce its
 * own payload semantically -- dropping optional fields, then paginating actions
 * -- and could therefore have taken the exemption. It does not, because track A
 * set its own `--max-batch-chars` default to 24576, strictly below the 32768
 * structured cap here. Its reduction always binds first, so the cap below is a
 * backstop that a real batch never reaches, and a cap that never fires is easier
 * to reason about than an exemption that has to be remembered. If a future
 * command cannot order its thresholds that way, the exemption is still there:
 * add it to `selfReducingActions`, or call
 * `declareSelfReducingStructuredOutput()` at run time.
 *
 * Every other `loop` action -- run, tick, status, poll, configure, allowlist --
 * prints prose unless `--json`, `--compact-json` or `--brief` asks otherwise.
 */
const LOOP_STDOUT = {
    mode: 'actions',
    actions: ['step'],
};
/** Flags that escalate any command to machine-parsed stdout. */
const MACHINE_OUTPUT_FLAGS = new Set(['--json', '--compact-json', '--brief']);
/**
 * Answer "is this invocation's stdout parsed by a machine?" from the registry
 * declaration first and the flags second.
 *
 * `args` is the full command line as typed, starting with the command word.
 */
function resolveStdoutContract(args) {
    const commandName = args[0];
    const action = args[1];
    const entry = exports.CLI_COMMANDS.find(candidate => candidate.name === commandName);
    const declared = entry?.machineParsedStdout;
    let machineParsed = false;
    let selfReducing = false;
    if (declared?.mode === 'always') {
        machineParsed = true;
        selfReducing = Boolean(action && declared.selfReducingActions?.includes(action));
    }
    else if (declared?.mode === 'actions' && action && declared.actions.includes(action)) {
        machineParsed = true;
        selfReducing = Boolean(declared.selfReducingActions?.includes(action));
    }
    if (!machineParsed) {
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (MACHINE_OUTPUT_FLAGS.has(arg)) {
                machineParsed = true;
                break;
            }
            if (arg === '--format' && String(args[index + 1] || '').trim().toLowerCase() === 'json') {
                machineParsed = true;
                break;
            }
            if (arg.startsWith('--format=') && arg.slice('--format='.length).trim().toLowerCase() === 'json') {
                machineParsed = true;
                break;
            }
        }
    }
    return { machineParsed, selfReducing };
}
/**
 * Single source of truth for CLI routing help. Every `case` label in the
 * cli.ts command switch has exactly one entry here, so `--help` and
 * `ospec help <topic>` can never diverge from the commands that exist.
 */
exports.CLI_COMMANDS = [
    { name: 'init', signature: 'init [root-dir]', summary: 'Initialize OSpec to a change-ready state', help: getInitHelpText, machineParsedStdout: PROSE },
    { name: 'update', signature: 'update [path]', summary: 'Repair legacy projects and refresh docs/tooling/skills', help: getUpdateHelpText, machineParsedStdout: PROSE },
    { name: 'layout', signature: 'layout [action]', summary: 'Project layout helpers (migrate)', help: getLayoutHelpText, machineParsedStdout: PROSE },
    { name: 'change', signature: 'change <name> [root]', summary: 'Create a classic fast-flow change (alias: new)', help: () => getChangeHelpText('change'), machineParsedStdout: PROSE },
    { name: 'new', signature: 'new <change-name> [root]', summary: 'Backward-compatible alias for ospec change', help: () => getChangeHelpText('new'), hidden: true, machineParsedStdout: PROSE },
    { name: 'goal', signature: 'goal <goal-name> [root]', summary: 'Create a full OSpec goal', help: getGoalHelpText, machineParsedStdout: PROSE },
    { name: 'brainstorm', signature: 'brainstorm [path]', summary: 'Optional pre-change brainstorm artifact', help: getBrainstormHelpText, machineParsedStdout: PROSE },
    { name: 'plan', signature: 'plan [path]', summary: 'Optional implementation plan draft', help: getPlanHelpText, machineParsedStdout: PROSE },
    { name: 'queue', signature: 'queue [action] [path]', summary: 'Queue helpers (status, add, activate, next)', help: getQueueHelpText, machineParsedStdout: PROSE },
    { name: 'run', signature: 'run [action] [path]', summary: 'Queue runner (start, status, step, resume, stop)', help: getRunHelpText, machineParsedStdout: PROSE },
    { name: 'triage', signature: 'triage [action] [path]', summary: 'Triage inbox helpers (list, claim, promote)', help: getTriageHelpText, machineParsedStdout: PROSE },
    { name: 'execute', signature: 'execute [action] [path]', summary: 'Task graph controller helpers', help: getExecuteHelpText, machineParsedStdout: PROSE },
    { name: 'loop', signature: 'loop [action] [path]', summary: 'Goal loop controller', help: getLoopHelpText, machineParsedStdout: LOOP_STDOUT },
    { name: 'session', signature: 'session [path]', summary: 'Session brief and safe next command', help: getSessionHelpText, machineParsedStdout: PROSE },
    { name: 'status', signature: 'status [path]', summary: 'Project status', help: getStatusHelpText, machineParsedStdout: PROSE },
    { name: 'progress', signature: 'progress [path]', summary: 'Workflow progress for one change', help: getProgressHelpText, machineParsedStdout: PROSE },
    { name: 'changes', signature: 'changes [action] [path]', summary: 'Active change summaries', help: getChangesHelpText, machineParsedStdout: PROSE },
    { name: 'index', signature: 'index [action] [path]', summary: 'Index helpers (check, build, query, gc)', help: getIndexHelpText, machineParsedStdout: PROSE },
    { name: 'workflow', signature: 'workflow [action]', summary: 'Workflow configuration (show, list-flags, set-mode)', help: getWorkflowHelpText, machineParsedStdout: PROSE },
    { name: 'docs', signature: 'docs [action] [path]', summary: 'Docs helpers (status, generate, sync-protocol, locate, obligations, confirm, audit, migrate)', help: getDocsHelpText, machineParsedStdout: PROSE },
    { name: 'skills', signature: 'skills [action] [path]', summary: 'Skills status helpers', help: getSkillsHelpText, machineParsedStdout: PROSE },
    { name: 'skill', signature: 'skill [action] [skill]', summary: 'Skill package helpers', help: getSkillHelpText, machineParsedStdout: PROSE },
    { name: 'verify', signature: 'verify [path]', summary: 'Verify change completion', help: getVerifyHelpText, machineParsedStdout: PROSE },
    { name: 'archive', signature: 'archive [path] [--check] [--repair]', summary: 'Archive a ready change or only check readiness', help: getArchiveHelpText, machineParsedStdout: PROSE },
    { name: 'finalize', signature: 'finalize [path]', summary: 'Verify and archive (supports force-archive)', help: getFinalizeHelpText, machineParsedStdout: PROSE },
    { name: 'help', signature: 'help [command]', summary: "Show this help, or one command's help", help: getHelpTopicHelpText, machineParsedStdout: PROSE },
    { name: 'version', signature: 'version, -v, --version', summary: 'Show version', help: getVersionHelpText, machineParsedStdout: PROSE },
];
exports.CLI_COMMAND_NAMES = exports.CLI_COMMANDS.map(entry => entry.name);
function getCommandHelpText(commandName) {
    const entry = exports.CLI_COMMANDS.find(candidate => candidate.name === commandName);
    return entry ? entry.help() : undefined;
}
/**
 * Compact routing help. Detail lives behind `ospec <command> --help` so the
 * default output stays cheap for agents to read.
 */
function getGlobalHelpText(version) {
    const width = exports.CLI_COMMANDS.reduce((longest, entry) => (entry.hidden ? longest : Math.max(longest, entry.signature.length)), 0);
    const rows = exports.CLI_COMMANDS
        .filter(entry => !entry.hidden)
        .map(entry => `  ${entry.signature.padEnd(width)}  ${entry.summary}`)
        .join('\n');
    return `
OSpec CLI v${version}

Usage: ospec <command> [options]
Help:  ospec <command> --help   |   ospec help <command>

Commands:
${rows}

Every command accepts --help, -h, or a leading "help", prints only help, and never acts on it.

Global output flags (every command; same names as the OSPEC_* env vars):
  --max-output-chars <n|off>             readable cap, default 5120 (first 4096 + last 1024)
  --max-structured-output-chars <n|off>  separate cap for --json/--compact-json/--brief, default 32768
Over the cap the complete text is written to artifacts/spill/<ts>-<cmd>.txt and referenced inline. Machine
output is never cut, only replaced by one valid JSON line with "ospecOutputSpill": true. "off" removes a
cap: a DEBUGGING ESCAPE HATCH, not a normal mode. Help output is never capped and never spills.
`;
}
function getUnknownHelpTopicText(topic) {
    const topics = exports.CLI_COMMANDS.filter(entry => !entry.hidden).map(entry => entry.name).join(', ');
    return `Unknown help topic: ${topic}\nValid topics: ${topics}\nRun "ospec help" for the command list.`;
}
