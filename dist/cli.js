#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const process = __importStar(require("process"));
const ArchiveCommand_1 = require("./commands/ArchiveCommand");
const BatchCommand_1 = require("./commands/BatchCommand");
const BrainstormCommand_1 = require("./commands/BrainstormCommand");
const ChangesCommand_1 = require("./commands/ChangesCommand");
const DocsCommand_1 = require("./commands/DocsCommand");
const FinalizeCommand_1 = require("./commands/FinalizeCommand");
const IndexCommand_1 = require("./commands/IndexCommand");
const InitCommand_1 = require("./commands/InitCommand");
const NewCommand_1 = require("./commands/NewCommand");
const GoalCommand_1 = require("./commands/GoalCommand");
const PlanCommand_1 = require("./commands/PlanCommand");
const QueueCommand_1 = require("./commands/QueueCommand");
const ProgressCommand_1 = require("./commands/ProgressCommand");
const PluginsCommand_1 = require("./commands/PluginsCommand");
const UpdateCommand_1 = require("./commands/UpdateCommand");
const SkillCommand_1 = require("./commands/SkillCommand");
const SkillsCommand_1 = require("./commands/SkillsCommand");
const StatusCommand_1 = require("./commands/StatusCommand");
const RunCommand_1 = require("./commands/RunCommand");
const ExecuteCommand_1 = require("./commands/ExecuteCommand");
const LoopCommand_1 = require("./commands/LoopCommand");
const TriageCommand_1 = require("./commands/TriageCommand");
const SessionCommand_1 = require("./commands/SessionCommand");
const VerifyCommand_1 = require("./commands/VerifyCommand");
const WorkflowCommand_1 = require("./commands/WorkflowCommand");
const LayoutCommand_1 = require("./commands/LayoutCommand");
const services_1 = require("./services");
const CLI_VERSION = '1.9.1';
function showInitUsage() {
    console.log('Usage: ospec init [root-dir] [--summary "..."] [--tech-stack node,react] [--architecture "..."] [--document-language en-US|zh-CN|ja-JP|ar]');
}
function parseInitCommandArgs(commandArgs) {
    let rootDir;
    const options = {};
    for (let index = 0; index < commandArgs.length; index += 1) {
        const arg = commandArgs[index];
        if (arg === '--help' || arg === '-h' || arg === 'help') {
            showInitUsage();
            process.exit(0);
        }
        if (arg === '--summary') {
            const value = commandArgs[index + 1];
            if (!value || value.startsWith('--')) {
                console.error('Error: --summary requires a value');
                showInitUsage();
                process.exit(1);
            }
            options.summary = value.trim();
            index += 1;
            continue;
        }
        if (arg.startsWith('--summary=')) {
            options.summary = arg.slice('--summary='.length).trim();
            continue;
        }
        if (arg === '--tech-stack') {
            const value = commandArgs[index + 1];
            if (!value || value.startsWith('--')) {
                console.error('Error: --tech-stack requires a comma-separated value');
                showInitUsage();
                process.exit(1);
            }
            options.techStack = value.split(',').map(item => item.trim()).filter(Boolean);
            index += 1;
            continue;
        }
        if (arg.startsWith('--tech-stack=')) {
            options.techStack = arg.slice('--tech-stack='.length).split(',').map(item => item.trim()).filter(Boolean);
            continue;
        }
        if (arg === '--architecture') {
            const value = commandArgs[index + 1];
            if (!value || value.startsWith('--')) {
                console.error('Error: --architecture requires a value');
                showInitUsage();
                process.exit(1);
            }
            options.architecture = value.trim();
            index += 1;
            continue;
        }
        if (arg.startsWith('--architecture=')) {
            options.architecture = arg.slice('--architecture='.length).trim();
            continue;
        }
        if (arg === '--document-language' || arg === '--lang') {
            const value = commandArgs[index + 1];
            if (!value || value.startsWith('--')) {
                console.error('Error: --document-language requires a value');
                showInitUsage();
                process.exit(1);
            }
            options.documentLanguage = value.trim();
            index += 1;
            continue;
        }
        if (arg.startsWith('--document-language=')) {
            options.documentLanguage = arg.slice('--document-language='.length).trim();
            continue;
        }
        if (arg.startsWith('--lang=')) {
            options.documentLanguage = arg.slice('--lang='.length).trim();
            continue;
        }
        if (!rootDir) {
            rootDir = arg;
            continue;
        }
        console.error(`Error: unexpected argument "${arg}"`);
        showInitUsage();
        process.exit(1);
    }
    return {
        rootDir,
        options,
    };
}
function showFinalizeUsage() {
    console.log('Usage: ospec finalize [changes/active/<change>] [--force-archive --confirm-force-archive <exact-change-name> (--reason "..." | --reason-file <path>)]');
}
function parseFinalizeCommandArgs(commandArgs) {
    let featurePath;
    const options = {};
    const readValue = (index, flag) => {
        const value = commandArgs[index + 1];
        if (!value || value.startsWith('--')) {
            console.error(`Error: ${flag} requires a value`);
            showFinalizeUsage();
            process.exit(1);
        }
        return value;
    };
    for (let index = 0; index < commandArgs.length; index += 1) {
        const arg = commandArgs[index];
        if (arg === '--help' || arg === '-h' || arg === 'help') {
            showFinalizeUsage();
            process.exit(0);
        }
        if (arg === '--force-archive') {
            options.forceArchive = true;
            continue;
        }
        if (arg === '--confirm-force-archive') {
            options.confirmForceArchive = readValue(index, arg);
            index += 1;
            continue;
        }
        if (arg.startsWith('--confirm-force-archive=')) {
            options.confirmForceArchive = arg.slice('--confirm-force-archive='.length);
            continue;
        }
        if (arg === '--reason') {
            options.reason = readValue(index, arg);
            index += 1;
            continue;
        }
        if (arg.startsWith('--reason=')) {
            options.reason = arg.slice('--reason='.length);
            continue;
        }
        if (arg === '--reason-file') {
            options.reasonFile = readValue(index, arg);
            index += 1;
            continue;
        }
        if (arg.startsWith('--reason-file=')) {
            options.reasonFile = arg.slice('--reason-file='.length);
            continue;
        }
        if (arg.startsWith('--')) {
            console.error(`Error: unknown finalize option "${arg}"`);
            showFinalizeUsage();
            process.exit(1);
        }
        if (featurePath === undefined) {
            featurePath = arg;
            continue;
        }
        console.error(`Error: unexpected finalize argument "${arg}"`);
        showFinalizeUsage();
        process.exit(1);
    }
    if (options.reason !== undefined && options.reasonFile !== undefined) {
        console.error('Error: use either --reason or --reason-file, not both');
        showFinalizeUsage();
        process.exit(1);
    }
    return { featurePath, options };
}
function getNewLikeUsage(commandName) {
    return commandName === 'goal'
        ? 'Usage: ospec goal <goal-name> [root-dir] [--flags flag1,flag2] [--target codex|gpt|claude|gemini|opencode|cursor|copilot] [--execution-model controller] [--harness-interactive true|false] [--native-subagents supported|unknown|unsupported] [--native-goal supported|unknown|unsupported]'
        : `Usage: ospec ${commandName} <change-name> [root-dir] [--flags flag1,flag2]`;
}
function parseNewCommandArgs(commandArgs, commandName = 'new') {
    const featureName = commandArgs[0];
    let rootDir;
    const flags = [];
    let target;
    let executionModel;
    let harnessInteractive;
    let nativeSubagentCapability;
    let nativeGoalCapability;
    for (let index = 1; index < commandArgs.length; index += 1) {
        const arg = commandArgs[index];
        if (arg === '--flags') {
            const rawFlags = commandArgs[index + 1];
            if (!rawFlags || rawFlags.startsWith('--')) {
                console.error(getNewLikeUsage(commandName));
                process.exit(1);
            }
            flags.push(...rawFlags.split(/[,\s]+/).map(flag => flag.trim()).filter(Boolean));
            index += 1;
            continue;
        }
        if (arg.startsWith('--flags=')) {
            flags.push(...arg.slice('--flags='.length).split(/[,\s]+/).map(flag => flag.trim()).filter(Boolean));
            continue;
        }
        const goalOnlyValue = (flag) => arg === flag
            ? commandArgs[index + 1]
            : arg.startsWith(`${flag}=`)
                ? arg.slice(flag.length + 1)
                : undefined;
        const requireGoalOption = (flag, value) => {
            if (value === undefined)
                return undefined;
            if (commandName !== 'goal') {
                console.error(`Unknown option for ${commandName}: ${flag} (only valid for ospec goal)`);
                console.error(getNewLikeUsage(commandName));
                process.exit(1);
            }
            if (!value || value.startsWith('--')) {
                console.error(`${flag} requires a value.`);
                console.error(getNewLikeUsage(commandName));
                process.exit(1);
            }
            if (arg === flag)
                index += 1;
            return value.trim().toLowerCase();
        };
        const targetValue = requireGoalOption('--target', goalOnlyValue('--target'));
        if (targetValue !== undefined) {
            const allowed = new Set(['codex', 'gpt', 'claude', 'gemini', 'opencode', 'cursor', 'copilot', 'shell', 'generic']);
            if (!allowed.has(targetValue)) {
                console.error(`Invalid --target value for goal: ${targetValue}`);
                process.exit(1);
            }
            target = targetValue;
            continue;
        }
        const executionModelValue = requireGoalOption('--execution-model', goalOnlyValue('--execution-model'));
        if (executionModelValue !== undefined) {
            if (executionModelValue !== 'controller') {
                console.error(`Invalid --execution-model value for goal: ${executionModelValue} (only controller is supported; agent CLI execution was removed)`);
                process.exit(1);
            }
            executionModel = executionModelValue;
            continue;
        }
        const interactiveValue = requireGoalOption('--harness-interactive', goalOnlyValue('--harness-interactive'));
        if (interactiveValue !== undefined) {
            if (interactiveValue !== 'true' && interactiveValue !== 'false') {
                console.error(`Invalid --harness-interactive value for goal: ${interactiveValue} (expected true or false)`);
                process.exit(1);
            }
            harnessInteractive = interactiveValue === 'true';
            continue;
        }
        const parseCapability = (flag, value) => {
            const normalized = requireGoalOption(flag, value);
            if (normalized === undefined)
                return undefined;
            if (normalized !== 'supported' && normalized !== 'unknown' && normalized !== 'unsupported') {
                console.error(`Invalid ${flag} value for goal: ${normalized} (expected supported, unknown, or unsupported)`);
                process.exit(1);
            }
            return normalized;
        };
        const subagentsValue = parseCapability('--native-subagents', goalOnlyValue('--native-subagents'));
        if (subagentsValue !== undefined) {
            nativeSubagentCapability = subagentsValue;
            continue;
        }
        const goalCapabilityValue = parseCapability('--native-goal', goalOnlyValue('--native-goal'));
        if (goalCapabilityValue !== undefined) {
            nativeGoalCapability = goalCapabilityValue;
            continue;
        }
        if (arg.startsWith('--')) {
            console.error(`Unknown option for ${commandName}: ${arg}`);
            console.error(getNewLikeUsage(commandName));
            process.exit(1);
        }
        if (!rootDir) {
            rootDir = arg;
            continue;
        }
        console.error(`Unexpected argument for new: ${arg}`);
        console.error(getNewLikeUsage(commandName));
        process.exit(1);
    }
    return {
        featureName,
        rootDir,
        flags: Array.from(new Set(flags)),
        target,
        executionModel,
        harnessInteractive,
        nativeSubagentCapability,
        nativeGoalCapability,
    };
}
async function main() {
    try {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            showHelp();
            return;
        }
        const command = args[0];
        const commandArgs = args.slice(1);
        switch (command) {
            case 'init': {
                const initCmd = new InitCommand_1.InitCommand();
                const { rootDir, options } = parseInitCommandArgs(commandArgs);
                await initCmd.execute(rootDir, options);
                break;
            }
            case 'change':
            case 'new': {
                if (commandArgs.length === 0) {
                    console.error('Error: change name is required');
                    console.log(getNewLikeUsage(command));
                    process.exit(1);
                }
                const { featureName, rootDir, flags } = parseNewCommandArgs(commandArgs, command);
                const newCmd = new NewCommand_1.NewCommand();
                await newCmd.execute(featureName, rootDir, {
                    flags,
                    workflowProfile: 'change',
                });
                break;
            }
            case 'goal': {
                if (commandArgs.length === 0) {
                    console.error('Error: goal name is required');
                    console.log(getNewLikeUsage('goal'));
                    process.exit(1);
                }
                const { featureName, rootDir, flags, target, executionModel, harnessInteractive, nativeSubagentCapability, nativeGoalCapability, } = parseNewCommandArgs(commandArgs, 'goal');
                const goalCmd = new GoalCommand_1.GoalCommand();
                await goalCmd.execute(featureName, rootDir, {
                    flags,
                    target,
                    executionModel,
                    harnessInteractive,
                    nativeSubagentCapability,
                    nativeGoalCapability,
                });
                break;
            }
            case 'brainstorm': {
                const brainstormCmd = new BrainstormCommand_1.BrainstormCommand();
                await brainstormCmd.execute(...commandArgs);
                break;
            }
            case 'plan': {
                const planCmd = new PlanCommand_1.PlanCommand();
                await planCmd.execute(...commandArgs);
                break;
            }
            case 'verify': {
                const verifyCmd = new VerifyCommand_1.VerifyCommand();
                await verifyCmd.execute(commandArgs[0]);
                break;
            }
            case 'progress': {
                const progressCmd = new ProgressCommand_1.ProgressCommand();
                await progressCmd.execute(commandArgs[0]);
                break;
            }
            case 'archive': {
                const checkOnly = commandArgs.includes('--check');
                const archiveArgs = commandArgs.filter(arg => arg !== '--check');
                const archiveCmd = new ArchiveCommand_1.ArchiveCommand();
                await archiveCmd.execute(archiveArgs[0], { checkOnly });
                break;
            }
            case 'finalize': {
                const finalizeCmd = new FinalizeCommand_1.FinalizeCommand();
                const { featurePath, options } = parseFinalizeCommandArgs(commandArgs);
                await finalizeCmd.execute(featurePath, options);
                break;
            }
            case 'status': {
                const statusCmd = new StatusCommand_1.StatusCommand();
                await statusCmd.execute(commandArgs[0]);
                break;
            }
            case 'session': {
                const sessionCmd = new SessionCommand_1.SessionCommand();
                await sessionCmd.execute(...commandArgs);
                break;
            }
            case 'batch': {
                if (commandArgs.length === 0) {
                    console.error('Error: batch action is required');
                    console.log('Usage: ospec batch <action> [root-dir]');
                    process.exit(1);
                }
                const batchCmd = new BatchCommand_1.BatchCommand();
                await batchCmd.execute(commandArgs[0], commandArgs[1]);
                break;
            }
            case 'changes': {
                const changesCmd = new ChangesCommand_1.ChangesCommand();
                await changesCmd.execute(commandArgs[0] || 'status', commandArgs[1]);
                break;
            }
            case 'queue': {
                const queueCmd = new QueueCommand_1.QueueCommand();
                await queueCmd.execute(commandArgs[0] || 'status', ...commandArgs.slice(1));
                break;
            }
            case 'run': {
                const runCmd = new RunCommand_1.RunCommand();
                await runCmd.execute(commandArgs[0] || 'status', ...commandArgs.slice(1));
                break;
            }
            case 'execute': {
                const executeCmd = new ExecuteCommand_1.ExecuteCommand();
                await executeCmd.execute(commandArgs[0] || 'status', ...commandArgs.slice(1));
                break;
            }
            case 'loop': {
                const loopCmd = new LoopCommand_1.LoopCommand();
                await loopCmd.execute(commandArgs[0] || 'status', ...commandArgs.slice(1));
                break;
            }
            case 'triage': {
                const triageCmd = new TriageCommand_1.TriageCommand();
                await triageCmd.execute(commandArgs[0] || 'list', ...commandArgs.slice(1));
                break;
            }
            case 'docs': {
                const docsCmd = new DocsCommand_1.DocsCommand();
                await docsCmd.execute(commandArgs[0] || 'status', commandArgs[1]);
                break;
            }
            case 'skills': {
                const skillsCmd = new SkillsCommand_1.SkillsCommand();
                await skillsCmd.execute(commandArgs[0] || 'status', commandArgs[1]);
                break;
            }
            case 'skill': {
                const skillCmd = new SkillCommand_1.SkillCommand();
                await skillCmd.execute(commandArgs[0] || 'status', commandArgs[1], commandArgs[2]);
                break;
            }
            case 'index': {
                const indexCmd = new IndexCommand_1.IndexCommand();
                await indexCmd.execute(commandArgs[0] || 'check', commandArgs[1]);
                break;
            }
            case 'plugins': {
                const pluginsCmd = new PluginsCommand_1.PluginsCommand();
                await pluginsCmd.execute(commandArgs[0] || 'status', ...commandArgs.slice(1));
                break;
            }
            case 'workflow': {
                const workflowCmd = new WorkflowCommand_1.WorkflowCommand();
                await workflowCmd.execute(commandArgs[0] || 'show', ...commandArgs.slice(1));
                break;
            }
            case 'layout': {
                const layoutCmd = new LayoutCommand_1.LayoutCommand();
                await layoutCmd.execute(commandArgs[0] || 'help', ...commandArgs.slice(1));
                break;
            }
            case 'update': {
                const updateCmd = new UpdateCommand_1.UpdateCommand();
                await updateCmd.execute(commandArgs[0]);
                break;
            }
            case 'help':
            case '-h':
            case '--help':
                showHelp();
                break;
            case 'version':
            case '-v':
            case '--version':
                console.log(`OSpec CLI v${CLI_VERSION}`);
                break;
            default:
                console.error(`Unknown command: ${command}`);
                showHelp();
                process.exit(1);
        }
    }
    catch (error) {
        services_1.services.logger.error('CLI Error:', error);
        process.exit(1);
    }
}
function showHelp() {
    console.log(`
OSpec CLI v${CLI_VERSION}

Usage: ospec <command> [options]

Commands:
  init [root-dir]           Initialize OSpec to a change-ready state
  change <name> [root]      Create a classic fast-flow change (supports --flags)
  new <change-name> [root]  Backward-compatible alias for ospec change
  goal <goal-name> [root]   Create a full OSpec goal (supports --flags)
  brainstorm [path]         Write an optional pre-change brainstorm artifact
  plan [path]               Write an optional implementation plan draft
  verify [path]             Verify change completion
  progress [path]           Show workflow progress
  archive [path] [--check]  Archive a ready change or only check readiness
  status [path]             Show project status
  session [path]            Write a project session brief and safe next command
  finalize [path]           Verify and archive, or force-archive with explicit double confirmation
  batch <action> [path]     Batch operations (export, stats)
  changes [action] [path]   Active change summaries (status)
  queue [action] [path]     Explicit queue helpers (status, add, activate, next)
  run [action] [path]       Explicit queue runner helpers (start, status, step, resume, stop)
  execute [action] [path]   Task graph controller helpers (bootstrap, handoff, preflight, status, next, workspace, worktree, finish, dispatch, launch, complete, repair)
  loop [action] [path]      Goal loop controller (run/tick, status, heartbeat, result, recover, configure, pause, resume)
  triage [action] [path]    Triage inbox helpers (list, claim, promote)
  docs [action] [path]      Docs helpers (status, generate)
  skills [action] [path]    Skills status helpers (status)
  plugins [action] [path]   Plugin helpers (available, info, install, installed, update, list, status, enable, disable, approve, reject)
  skill [action] [skill] [dir] Skill package helpers (managed skills: ospec, ospec-change, ospec-goal)
  index [action] [path]     Index helpers (check, build)
  workflow [action]         Workflow configuration (show, list-flags)
  layout [action]           Project layout helpers (migrate)
  update [path]             Repair legacy projects, refresh docs/tooling/skills, and auto-upgrade enabled plugins
  help, -h, --help          Show this help message
  version, -v, --version    Show version

Examples:
  ospec init
  ospec init . --summary "Internal admin portal" --tech-stack node,react,postgres
  ospec change onboarding-flow
  ospec change landing-refresh . --flags ui_change,page_design
  ospec goal billing-refactor . --flags complex_feature,multi_file_change
  ospec goal billing-refactor . --target codex --execution-model controller --harness-interactive true --native-subagents supported
  ospec brainstorm . --topic "Improve onboarding conversion" --change onboarding-flow
  ospec brainstorm . --topic "Explore dashboard UX" --visual
  ospec plan ./changes/active/onboarding-flow
  ospec plan . --change ./changes/active/onboarding-flow --apply
  ospec verify ./changes/active/onboarding-flow
  ospec progress ./changes/active/onboarding-flow
  ospec archive ./changes/active/onboarding-flow
  ospec archive ./changes/active/onboarding-flow --check
  ospec finalize ./changes/active/onboarding-flow
  ospec finalize ./changes/active/onboarding-flow --force-archive --confirm-force-archive onboarding-flow --reason "Accepted incomplete verification risk"
  ospec status
  ospec session
  ospec session hook .
  ospec queue add login-refresh . --flags ui_change
  ospec queue status
  ospec queue next
  ospec run start . --profile manual-safe
  ospec run step
  ospec execute status ./changes/active/onboarding-flow
  ospec execute bootstrap ./changes/active/onboarding-flow
  ospec execute handoff ./changes/active/onboarding-flow --target codex
  ospec execute preflight ./changes/active/onboarding-flow --stage design
  ospec execute next ./changes/active/onboarding-flow
  ospec execute workspace ./changes/active/onboarding-flow
  ospec execute worktree ./changes/active/onboarding-flow --branch ospec/onboarding-flow
  ospec execute worktree ./changes/active/onboarding-flow --create --branch ospec/onboarding-flow
  ospec execute worktree ./changes/active/onboarding-flow --cleanup --path ../ospec-onboarding-flow
  ospec execute finish ./changes/active/onboarding-flow --target main --remote origin
  ospec execute dispatch ./changes/active/onboarding-flow --task task-1
  ospec execute launch ./changes/active/onboarding-flow --target codex
  ospec execute complete task-1 ./changes/active/onboarding-flow --status DONE --summary "Implemented and verified"
  ospec execute complete task-1 ./changes/active/onboarding-flow --status DONE --usage-file ./usage.json
  ospec execute defer-blocker task-1 ./changes/active/onboarding-flow --reason "Device acceptance will be completed before final review"
  ospec execute repair ./changes/active/onboarding-flow
  ospec loop heartbeat ./changes/active/onboarding-flow --action-item worker-1 --executor child-1
  ospec loop result ./changes/active/onboarding-flow --action-item worker-1 --executor child-1 --exit-code 0 --summary "completed"
  ospec loop recover ./changes/active/onboarding-flow --force
  ospec docs status
  ospec docs generate
  ospec docs sync-protocol
  ospec skills status
  ospec plugins list
  ospec plugins info stitch
  ospec plugins install stitch
  ospec plugins installed
  ospec plugins update stitch
  ospec plugins update --all
  ospec plugins status
  ospec plugins enable stitch
  ospec plugins enable checkpoint . --base-url http://127.0.0.1:3000
  # enable checkpoint also auto-installs playwright/pixelmatch/pngjs into the target project
  ospec plugins run checkpoint ./changes/active/onboarding-flow
  ospec plugins approve stitch ./changes/active/onboarding-flow
  ospec skill status ospec
  ospec skill install ospec
  ospec skill status ospec-change
  ospec skill install ospec-change
  ospec skill status ospec-goal
  ospec skill install ospec-goal
  ospec skill install ospec-init
  ospec skill status-claude ospec
  ospec skill install-claude ospec
  ospec index build
  ospec batch stats
  ospec changes status
  ospec workflow show
  ospec workflow set-mode full
  ospec layout migrate --to nested
  ospec update .
`);
}
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
