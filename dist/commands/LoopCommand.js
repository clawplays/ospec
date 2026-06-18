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
exports.LoopCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const BaseCommand_1 = require("./BaseCommand");
const LOOP_ACTIONS = ['run', 'watch', 'status', 'pause', 'resume', 'level', 'tick-plan'];
class LoopCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', ...args) {
        try {
            const normalized = (action || 'status').toLowerCase();
            switch (normalized) {
                case 'run':
                    await this.run(args);
                    return;
                case 'watch':
                    await this.watch(args);
                    return;
                case 'tick-plan':
                    await this.tickPlan(args[0]);
                    return;
                case 'status':
                    await this.status(args[0]);
                    return;
                case 'pause':
                    await this.pause(args[0]);
                    return;
                case 'resume':
                    await this.resume(args[0]);
                    return;
                case 'level':
                    await this.level(args);
                    return;
                default:
                    this.info(`Usage: ospec loop <${LOOP_ACTIONS.join('|')}> [path] [--level L1|L2|L3]`);
            }
        }
        catch (error) {
            this.error(`Loop command failed: ${error}`);
            throw error;
        }
    }
    async run(args) {
        const inputPath = args.find(arg => !arg.startsWith('--'));
        const changePath = await this.resolveChangePath(inputPath);
        const project = await this.resolveProjectRoot(changePath);
        const result = await services_1.services.loopService.runOnce(changePath, {
            trigger: 'cli',
            projectRoot: project.projectRoot,
            layoutConfig: project.config,
        });
        console.log('\nLoop Tick');
        console.log('=========\n');
        console.log(`Change path: ${result.changePath}`);
        console.log(`Iteration: ${result.iteration}`);
        console.log(`Status: ${result.status}`);
        console.log(`Step: ${result.currentStep}`);
        if (result.pending) {
            console.log(`Pending action: ${result.pending.actionId} (${result.pending.status})`);
        }
        if (result.stopped) {
            console.log(`Stopped: ${result.stopReason || 'yes'}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    async tickPlan(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const plan = await services_1.services.loopService.buildControllerTickPlan(changePath);
        console.log('\nController Tick Plan');
        console.log('====================\n');
        console.log(`Execution model: ${plan.executionModel}`);
        console.log(`Interval: ${plan.interval}`);
        console.log(`Native loop capability: ${plan.nativeLoopCapability}`);
        console.log('\nInstructions:');
        for (const instruction of plan.instructions) {
            console.log(`  - ${instruction}`);
        }
        console.log('');
    }
    /**
     * Session-bound in-process watcher (CLI-driven). Runs ticks on an interval until the loop
     * stops/pauses/finishes, a STOP sentinel appears, max ticks is reached, or the process exits
     * (closing the session). It is NOT persistent — it dies with this process.
     */
    async watch(args) {
        const inputPath = args.find(arg => !arg.startsWith('--'));
        const changePath = await this.resolveChangePath(inputPath);
        const project = await this.resolveProjectRoot(changePath);
        const config = await services_1.services.loopService.readConfig(changePath);
        const intervalOverride = this.parseFlagValue(args, '--interval');
        const intervalLabel = intervalOverride || config.schedule.interval;
        const intervalMs = this.parseIntervalMs(intervalLabel);
        const maxTicks = this.parseMaxTicks(args);
        this.info(`Watching loop (session-bound, interval ${intervalLabel}). Press Ctrl-C or close the session to stop.`);
        let ticks = 0;
        let active = true;
        const stop = () => { active = false; };
        process.once('SIGINT', stop);
        while (active) {
            const result = await services_1.services.loopService.runOnce(changePath, {
                trigger: 'watch',
                projectRoot: project.projectRoot,
                layoutConfig: project.config,
            });
            ticks += 1;
            console.log(`[tick ${ticks}] iteration=${result.iteration} status=${result.status} step=${result.currentStep}`);
            if (result.stopped || result.status === 'done' || result.status === 'paused' || result.status === 'stopped') {
                this.info(`Watch ending: loop status is ${result.status}.`);
                break;
            }
            if (maxTicks !== null && ticks >= maxTicks) {
                this.info(`Watch reached --max-ticks ${maxTicks}.`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        process.removeListener('SIGINT', stop);
    }
    parseIntervalMs(interval) {
        const match = String(interval || '').trim().match(/^(\d+)\s*(ms|s|m|h)?$/i);
        if (!match) {
            return 600000;
        }
        const value = Number(match[1]);
        const unit = (match[2] || 'm').toLowerCase();
        const factor = unit === 'ms' ? 1 : unit === 's' ? 1000 : unit === 'h' ? 3600000 : 60000;
        return Math.max(1, value * factor);
    }
    parseFlagValue(args, flag) {
        for (let index = 0; index < args.length; index += 1) {
            if (args[index] === flag) {
                return args[index + 1];
            }
            if (args[index].startsWith(`${flag}=`)) {
                return args[index].slice(`${flag}=`.length);
            }
        }
        return undefined;
    }
    parseMaxTicks(args) {
        for (let index = 0; index < args.length; index += 1) {
            if (args[index] === '--max-ticks') {
                return Math.max(1, Number(args[index + 1]) || 1);
            }
            if (args[index].startsWith('--max-ticks=')) {
                return Math.max(1, Number(args[index].slice('--max-ticks='.length)) || 1);
            }
        }
        return null;
    }
    async resolveProjectRoot(changePath) {
        let current = path.resolve(changePath);
        while (true) {
            if (await services_1.services.fileService.exists(path.join(current, constants_1.FILE_NAMES.SKILLRC))) {
                const config = await services_1.services.configManager.loadConfig(current).catch(() => null);
                return { projectRoot: current, config };
            }
            const parent = path.dirname(current);
            if (parent === current) {
                return { projectRoot: path.resolve(changePath), config: null };
            }
            current = parent;
        }
    }
    async status(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        if (!(await services_1.services.loopService.exists(changePath))) {
            this.warn('No loop is initialized for this change (only goal-profile changes create a loop).');
            return;
        }
        const config = await services_1.services.loopService.readConfig(changePath);
        const state = await services_1.services.loopService.readState(changePath);
        console.log('\nLoop Status');
        console.log('===========\n');
        console.log(`Change path: ${changePath}`);
        console.log(`Level: ${config.level}`);
        console.log(`Primitive: ${config.primitive}`);
        console.log(`Execution model: ${config.executionModel}`);
        console.log(`Schedule: ${config.schedule.interval} (${config.schedule.lifecycle})`);
        console.log(`Status: ${state.status}`);
        console.log(`Iteration: ${state.iteration}`);
        console.log(`Current step: ${state.currentStep}`);
        console.log(`Last tick: ${state.lastTickTs || 'never'}`);
        console.log(`Pending action: ${state.pendingControllerAction ? state.pendingControllerAction.actionId : 'none'}`);
        if (config.capability) {
            console.log(`Native loop capability: ${config.capability.nativeLoopCapability} (${config.capability.probeSource})`);
        }
        console.log('');
    }
    async pause(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.pause(changePath);
        this.success(`Loop paused (status: ${state.status}). Run "ospec loop resume" to continue.`);
    }
    async resume(inputPath) {
        const changePath = await this.resolveChangePath(inputPath);
        const state = await services_1.services.loopService.resume(changePath);
        this.success(`Loop resumed (status: ${state.status}).`);
    }
    async level(args) {
        let inputPath;
        let level;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--level') {
                level = args[index + 1];
                index += 1;
                continue;
            }
            if (arg.startsWith('--level=')) {
                level = arg.slice('--level='.length);
                continue;
            }
            if (!arg.startsWith('--') && /^L[123]$/i.test(arg) && !level) {
                level = arg;
                continue;
            }
            if (!arg.startsWith('--') && !inputPath) {
                inputPath = arg;
                continue;
            }
        }
        const normalized = String(level || '').trim().toUpperCase();
        if (normalized !== 'L1' && normalized !== 'L2' && normalized !== 'L3') {
            throw new Error(`Loop level must be L1, L2, or L3 (received ${level || '(empty)'}).`);
        }
        const changePath = await this.resolveChangePath(inputPath);
        const config = await services_1.services.loopService.setLevel(changePath, normalized);
        this.success(`Loop level set to ${config.level}.`);
    }
    async resolveChangePath(inputPath) {
        const cwd = process.cwd();
        const config = await services_1.services.configManager.loadConfig(cwd).catch(() => null);
        const candidatePath = inputPath
            ? (path.isAbsolute(inputPath) ? inputPath : (0, ProjectLayout_1.resolveManagedInputPath)(cwd, inputPath, config))
            : cwd;
        const resolved = path.resolve(candidatePath);
        if (await services_1.services.fileService.exists(path.join(resolved, constants_1.FILE_NAMES.STATE))) {
            return resolved;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(resolved);
        if (activeNames.length === 0) {
            throw new Error('No active change found. Pass a change path or run from a project with one active change.');
        }
        if (activeNames.length > 1) {
            throw new Error(`Multiple active changes found: ${activeNames.join(', ')}. Pass one change path explicitly.`);
        }
        const projectConfig = await services_1.services.configManager.loadConfig(resolved).catch(() => null);
        return (0, ProjectLayout_1.resolveManagedPath)(resolved, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, projectConfig);
    }
}
exports.LoopCommand = LoopCommand;
