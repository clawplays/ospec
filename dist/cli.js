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
const ChangesCommand_1 = require("./commands/ChangesCommand");
const DocsCommand_1 = require("./commands/DocsCommand");
const FinalizeCommand_1 = require("./commands/FinalizeCommand");
const IndexCommand_1 = require("./commands/IndexCommand");
const InitCommand_1 = require("./commands/InitCommand");
const NewCommand_1 = require("./commands/NewCommand");
const QueueCommand_1 = require("./commands/QueueCommand");
const ProgressCommand_1 = require("./commands/ProgressCommand");
const PluginsCommand_1 = require("./commands/PluginsCommand");
const UpdateCommand_1 = require("./commands/UpdateCommand");
const SkillCommand_1 = require("./commands/SkillCommand");
const SkillsCommand_1 = require("./commands/SkillsCommand");
const StatusCommand_1 = require("./commands/StatusCommand");
const RunCommand_1 = require("./commands/RunCommand");
const VerifyCommand_1 = require("./commands/VerifyCommand");
const WorkflowCommand_1 = require("./commands/WorkflowCommand");
const services_1 = require("./services");
const CLI_VERSION = '0.3.10';
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
function parseNewCommandArgs(commandArgs) {
    const featureName = commandArgs[0];
    let rootDir;
    const flags = [];
    for (let index = 1; index < commandArgs.length; index += 1) {
        const arg = commandArgs[index];
        if (arg === '--flags') {
            const rawFlags = commandArgs[index + 1];
            if (!rawFlags || rawFlags.startsWith('--')) {
                console.error('Usage: ospec new <change-name> [root-dir] [--flags flag1,flag2]');
                process.exit(1);
            }
            flags.push(...rawFlags.split(',').map(flag => flag.trim()).filter(Boolean));
            index += 1;
            continue;
        }
        if (arg.startsWith('--flags=')) {
            flags.push(...arg.slice('--flags='.length).split(',').map(flag => flag.trim()).filter(Boolean));
            continue;
        }
        if (arg.startsWith('--')) {
            console.error(`Unknown option for new: ${arg}`);
            console.error('Usage: ospec new <change-name> [root-dir] [--flags flag1,flag2]');
            process.exit(1);
        }
        if (!rootDir) {
            rootDir = arg;
            continue;
        }
        console.error(`Unexpected argument for new: ${arg}`);
        console.error('Usage: ospec new <change-name> [root-dir] [--flags flag1,flag2]');
        process.exit(1);
    }
    return {
        featureName,
        rootDir,
        flags: Array.from(new Set(flags)),
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
            case 'new': {
                if (commandArgs.length === 0) {
                    console.error('Error: change name is required');
                    console.log('Usage: ospec new <change-name> [root-dir] [--flags flag1,flag2]');
                    process.exit(1);
                }
                const { featureName, rootDir, flags } = parseNewCommandArgs(commandArgs);
                const newCmd = new NewCommand_1.NewCommand();
                await newCmd.execute(featureName, rootDir, { flags });
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
                await finalizeCmd.execute(commandArgs[0]);
                break;
            }
            case 'status': {
                const statusCmd = new StatusCommand_1.StatusCommand();
                await statusCmd.execute(commandArgs[0]);
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
  new <change-name> [root]  Create a new change (supports --flags)
  verify [path]             Verify change completion
  progress [path]           Show workflow progress
  archive [path] [--check]  Archive a ready change or only check readiness
  status [path]             Show project status
  finalize [path]           Verify a completed change and archive it before commit
  batch <action> [path]     Batch operations (export, stats)
  changes [action] [path]   Active change summaries (status)
  queue [action] [path]     Explicit queue helpers (status, add, activate, next)
  run [action] [path]       Explicit queue runner helpers (start, status, step, resume, stop)
  docs [action] [path]      Docs helpers (status, generate)
  skills [action] [path]    Skills status helpers (status)
  plugins [action] [path]   Plugin helpers (list, status, enable, disable, approve, reject)
  skill [action] [skill] [dir] Skill package helpers (managed skills: ospec, ospec-change)
  index [action] [path]     Index helpers (check, build)
  workflow [action]         Workflow configuration (show, list-flags)
  update [path]             Refresh protocol docs, tooling, hooks, and installed skills; does not enable or migrate plugins
  help, -h, --help          Show this help message
  version, -v, --version    Show version

Examples:
  ospec init
  ospec init . --summary "Internal admin portal" --tech-stack node,react,postgres
  ospec new onboarding-flow
  ospec new landing-refresh . --flags ui_change,page_design
  ospec verify ./changes/active/onboarding-flow
  ospec progress ./changes/active/onboarding-flow
  ospec archive ./changes/active/onboarding-flow
  ospec archive ./changes/active/onboarding-flow --check
  ospec finalize ./changes/active/onboarding-flow
  ospec status
  ospec queue add login-refresh . --flags ui_change
  ospec queue status
  ospec queue next
  ospec run start . --profile manual-safe
  ospec run step
  ospec docs status
  ospec docs generate
  ospec docs sync-protocol
  ospec skills status
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
  ospec skill install ospec-init
  ospec skill status-claude ospec
  ospec skill install-claude ospec
  ospec index build
  ospec batch stats
  ospec changes status
  ospec workflow show
  ospec workflow set-mode full
  ospec update .
`);
}
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});