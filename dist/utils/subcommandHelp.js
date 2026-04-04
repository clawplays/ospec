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
  ospec skill status [skill-name] [dir]          - inspect one Codex OSpec skill; managed skills are ospec and ospec-change
  ospec skill install [skill-name] [dir]         - install one Codex OSpec skill; managed skills are ospec and ospec-change
  ospec skill status-claude [skill-name] [dir]   - inspect one Claude Code OSpec skill; managed skills are ospec and ospec-change
  ospec skill install-claude [skill-name] [dir]  - install one Claude Code OSpec skill; managed skills are ospec and ospec-change
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
  ospec plugins list [path]            - list plugins available in the project config
  ospec plugins status [path]          - show plugin and capability status
  ospec plugins doctor stitch [path]   - validate the configured Stitch provider adapter or custom Stitch runner config
  ospec plugins doctor checkpoint [path] - validate checkpoint base_url, workspace scaffold, and runner config
  ospec plugins enable stitch [path]   - enable Stitch for new changes by default
  ospec plugins enable checkpoint [path] --base-url <url> - enable checkpoint and save the runtime base URL
  ospec plugins disable stitch [path]  - disable Stitch for new changes by default
  ospec plugins disable checkpoint [path] - disable checkpoint for new changes by default
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
  ospec run status [path]                                      - show current queue run status
  ospec run step [path]                                        - advance one explicit queue step
  ospec run resume [path]                                      - resume a paused or failed queue run
  ospec run stop [path]                                        - pause the current queue run
  ospec run logs [path]                                        - show recent queue run log lines
  ospec run help                                               - show run command help
`;
}
