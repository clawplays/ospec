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
const subcommandHelp_1 = require("./utils/subcommandHelp");
const services_1 = require("./services");
const BaseCommand_1 = require("./commands/BaseCommand");
const outputBudget_1 = require("./utils/outputBudget");
const CLI_VERSION = '2.0.2';
function showInitUsage() {
    console.log((0, subcommandHelp_1.getInitUsageText)());
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
function parseUpdateCommandArgs(commandArgs) {
    let rootDir;
    const options = {};
    for (const arg of commandArgs) {
        if (arg === '--help' || arg === '-h' || arg === 'help') {
            console.log((0, subcommandHelp_1.getUpdateHelpText)());
            process.exit(0);
        }
        if (arg === '--clean-plugin-steps') {
            options.cleanPluginSteps = true;
            continue;
        }
        if (!rootDir && !arg.startsWith('--')) {
            rootDir = arg;
            continue;
        }
        console.error(`Error: unexpected argument "${arg}"`);
        console.log((0, subcommandHelp_1.getUpdateUsageText)());
        process.exit(1);
    }
    return { rootDir, options };
}
function showFinalizeUsage() {
    console.log((0, subcommandHelp_1.getFinalizeUsageText)());
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
function parseNewCommandArgs(commandArgs, commandName = 'new') {
    const featureName = commandArgs[0];
    let rootDir;
    const flags = [];
    const features = [];
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
                console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
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
        // 7.5: repeated `--feature <slug>` is the non-interactive capture path,
        // valid for `change`, `goal` and `new` alike. Commas also split, because
        // a comma can never be part of a slug, so accepting them can only help.
        if (arg === '--feature') {
            const rawFeature = commandArgs[index + 1];
            if (!rawFeature || rawFeature.startsWith('--')) {
                console.error('--feature requires a feature slug value.');
                console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
                process.exit(1);
            }
            features.push(...rawFeature.split(/[,\s]+/).map(slug => slug.trim()).filter(Boolean));
            index += 1;
            continue;
        }
        if (arg.startsWith('--feature=')) {
            features.push(...arg.slice('--feature='.length).split(/[,\s]+/).map(slug => slug.trim()).filter(Boolean));
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
                console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
                process.exit(1);
            }
            if (!value || value.startsWith('--')) {
                console.error(`${flag} requires a value.`);
                console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
                process.exit(1);
            }
            if (arg === flag)
                index += 1;
            return value.trim().toLowerCase();
        };
        const targetValue = requireGoalOption('--target', goalOnlyValue('--target'));
        if (targetValue !== undefined) {
            // M-cfg5: see LoopCommand.configure. The goal usage string has
            // advertised `grok` all along; this validator refused it.
            const allowed = new Set(['codex', 'gpt', 'claude', 'gemini', 'grok', 'opencode', 'cursor', 'copilot', 'shell', 'generic']);
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
            console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
            process.exit(1);
        }
        if (!rootDir) {
            rootDir = arg;
            continue;
        }
        console.error(`Unexpected argument for new: ${arg}`);
        console.error((0, subcommandHelp_1.getNewLikeUsage)(commandName));
        process.exit(1);
    }
    return {
        featureName,
        rootDir,
        flags: Array.from(new Set(flags)),
        features: Array.from(new Set(features)),
        target,
        executionModel,
        harnessInteractive,
        nativeSubagentCapability,
        nativeGoalCapability,
    };
}
async function main() {
    try {
        // Phase 5 / F3. `--max-output-chars` is a global, output-only flag, so
        // it is stripped here instead of being taught to every command parser
        // (all of which reject unknown flags on purpose).
        const { args, ...budgetFlags } = (0, outputBudget_1.extractOutputBudgetArgs)(process.argv.slice(2));
        // One install point for the whole CLI: every byte a command writes to
        // stdout or stderr passes through the budget, whatever wrote it.
        await BaseCommand_1.BaseCommand.runWithOutputBudget(args, budgetFlags, () => dispatch(args));
    }
    catch (error) {
        services_1.services.logger.error('CLI Error:', error);
        process.exit(1);
    }
}
async function dispatch(args) {
    if (args.length === 0) {
        showHelp();
        return;
    }
    const command = args[0];
    const commandArgs = args.slice(1);
    // Help routing happens before dispatch so no command class ever sees a
    // help flag as a positional argument and acts on it.
    if (command === 'help' || command === '--help' || command === '-h') {
        const rawTopic = commandArgs[0];
        if (rawTopic === undefined) {
            showHelp();
            return;
        }
        // "ospec help --help" asks about the help command itself.
        const topic = rawTopic === '--help' || rawTopic === '-h' ? 'help' : rawTopic;
        const topicHelp = (0, subcommandHelp_1.getCommandHelpText)(topic);
        if (topicHelp === undefined) {
            console.error((0, subcommandHelp_1.getUnknownHelpTopicText)(topic));
            process.exit(1);
        }
        console.log(topicHelp);
        return;
    }
    if ((0, subcommandHelp_1.isHelpRequest)(commandArgs)) {
        // The global help promises every command accepts --help, so the
        // version aliases have to resolve to the topic they dispatch to.
        const helpTopic = command === '-v' || command === '--version' ? 'version' : command;
        const commandHelp = (0, subcommandHelp_1.getCommandHelpText)(helpTopic);
        if (commandHelp === undefined) {
            console.error(`Unknown command: ${command}`);
            showHelp();
            process.exit(1);
        }
        console.log(commandHelp);
        return;
    }
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
                console.log((0, subcommandHelp_1.getNewLikeUsage)(command));
                process.exit(1);
            }
            const { featureName, rootDir, flags, features } = parseNewCommandArgs(commandArgs, command);
            const newCmd = new NewCommand_1.NewCommand();
            await newCmd.execute(featureName, rootDir, {
                flags,
                features,
                workflowProfile: 'change',
            });
            break;
        }
        case 'goal': {
            if (commandArgs.length === 0) {
                console.error('Error: goal name is required');
                console.log((0, subcommandHelp_1.getNewLikeUsage)('goal'));
                process.exit(1);
            }
            const { featureName, rootDir, flags, features, target, executionModel, harnessInteractive, nativeSubagentCapability, nativeGoalCapability, } = parseNewCommandArgs(commandArgs, 'goal');
            const goalCmd = new GoalCommand_1.GoalCommand();
            await goalCmd.execute(featureName, rootDir, {
                flags,
                features,
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
            const repair = commandArgs.includes('--repair');
            const archiveArgs = commandArgs.filter(arg => arg !== '--check' && arg !== '--repair');
            const archiveCmd = new ArchiveCommand_1.ArchiveCommand();
            const archiveResult = await archiveCmd.run(archiveArgs[0], { checkOnly, repair });
            /*

             * M-misc2: `ArchiveCommand` used to call `process.exit(1)`

             * itself. The exit code is decided here now, for the same

             * reason every other command's is: the command reports, the

             * CLI translates. `process.exitCode` rather than

             * `process.exit()` so the blockers already written to stdout

             * are flushed before the process ends.

             */
            if (archiveResult?.status === 'blocked') {
                // `process` is a NAMESPACE import in this file, and TS
                // treats namespace members as read-only, so
                // `process.exitCode = 1` does not compile here.
                // `globalThis.process` is the same object at run time.
                globalThis.process.exitCode = 1;
            }
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
        case 'changes': {
            const changesCmd = new ChangesCommand_1.ChangesCommand();
            // 7.7b: `changes show <archive>` takes flags, so the rest of
            // the argv goes through rather than just the second token.
            await changesCmd.execute(commandArgs[0] || 'status', commandArgs[1], commandArgs.slice(2));
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
            // Every Phase 7 docs subcommand takes flags -- `locate` its
            // selector, `obligations`/`confirm` their ids, `migrate` its
            // phase -- so the rest of the argv is forwarded verbatim. The
            // option readers look only for their own `--flag`, which makes
            // a positional in that list inert.
            //
            // `commandArgs[1]` stays the positional path, and a flag in
            // that slot is NOT mistaken for one. That guard is load-bearing
            // now: `ospec docs migrate --plan` run from inside a project
            // would otherwise resolve its project root to the string
            // "--plan".
            await docsCmd.execute(commandArgs[0] || 'status', commandArgs[1] && !commandArgs[1].startsWith('--') ? commandArgs[1] : undefined, commandArgs.slice(1));
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
            await indexCmd.execute(commandArgs[0] || 'check', commandArgs[0] === 'query' ? undefined : commandArgs[1], commandArgs.slice(1));
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
            const parsedUpdateArgs = parseUpdateCommandArgs(commandArgs);
            const updateCmd = new UpdateCommand_1.UpdateCommand();
            await updateCmd.execute(parsedUpdateArgs.rootDir, parsedUpdateArgs.options);
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
function showHelp() {
    console.log((0, subcommandHelp_1.getGlobalHelpText)(CLI_VERSION));
}
/**
 * Only run the CLI when this module is the process entry point.
 * Importing the package as a library (dist/index.js -> ./cli) must never
 * parse the host process argv, print help, or call process.exit.
 * The dist build emits CommonJS, so require.main identity is the guard.
 */
function isProcessEntryPoint() {
    return typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
}
if (isProcessEntryPoint()) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
