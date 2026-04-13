"use strict";
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o)
                if (Object.prototype.hasOwnProperty.call(o, k))
                    ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                if (k[i] !== "default")
                    result[k[i]] = mod[k[i]];
        result.default = mod;
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommand = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class RunCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', ...args) {
        try {
            const normalizedAction = action || 'status';
            if ((0, subcommandHelp_1.isHelpAction)(normalizedAction)) {
                this.info((0, subcommandHelp_1.getRunHelpText)());
                return;
            }
            switch (normalizedAction) {
                case 'start':
                    await this.start(args);
                    return;
                case 'status':
                    await this.status(args[0]);
                    return;
                case 'step':
                case 'tick':
                case 'advance':
                    await this.step(args[0]);
                    return;
                case 'resume':
                    await this.resume(args[0]);
                    return;
                case 'stop':
                case 'pause':
                    await this.stop(args[0]);
                    return;
                case 'logs':
                    await this.logs(args[0]);
                    return;
                default:
                    this.info((0, subcommandHelp_1.getRunHelpText)());
            }
        }
        catch (error) {
            this.error(`Run command failed: ${error}`);
            throw error;
        }
    }
    async start(args) {
        const parsed = this.parseStartArgs(args);
        const targetPath = path.resolve(parsed.projectPath || process.cwd());
        const report = await services_1.services.runService.start(targetPath, {
            profileId: parsed.profileId,
        });
        this.printReport(report, targetPath);
    }
    async status(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const report = await services_1.services.runService.getStatusReport(targetPath);
        this.printReport(report, targetPath);
    }
    async step(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const report = await services_1.services.runService.step(targetPath);
        this.printReport(report, targetPath);
    }
    async resume(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const report = await services_1.services.runService.resume(targetPath);
        this.printReport(report, targetPath);
    }
    async stop(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const report = await services_1.services.runService.stop(targetPath);
        this.printReport(report, targetPath);
    }
    async logs(projectPath) {
        const targetPath = path.resolve(projectPath || process.cwd());
        const lines = await services_1.services.runService.getLogTail(targetPath, 30);
        console.log('\nQueue Run Logs');
        console.log('==============\n');
        if (lines.length === 0) {
            console.log('No queue run logs yet.\n');
            return;
        }
        for (const line of lines) {
            console.log(line);
        }
        console.log('');
    }
    printReport(report, projectPath) {
        console.log('\nQueue Run Status');
        console.log('================\n');
        console.log(`Project: ${projectPath}`);
        if (!report.currentRun) {
            console.log('Run: idle');
            console.log(`Queued changes: ${report.queuedChanges.length}`);
            if (report.nextInstruction) {
                console.log(`Next: ${report.nextInstruction}`);
            }
            console.log('');
            return;
        }
        console.log(`Run ID: ${report.currentRun.id}`);
        console.log(`Status: ${report.currentRun.status}`);
        if (report.stage) {
            console.log(`Stage: ${report.stage}`);
        }
        console.log(`Executor: ${report.currentRun.executor}`);
        console.log(`Profile: ${report.currentRun.profileId}`);
        console.log(`Started at: ${report.currentRun.startedAt}`);
        console.log(`Updated at: ${report.currentRun.updatedAt}`);
        console.log(`Completed changes: ${report.currentRun.completedChanges.length}`);
        console.log(`Queued remaining: ${report.currentRun.remainingChanges.length}`);
        if (report.activeChange) {
            console.log(`Active change: ${report.activeChange.name} [${report.activeChange.status}]`);
            console.log(`Active path: ${report.activeChange.path}`);
        }
        else {
            console.log('Active change: none');
        }
        if (report.currentRun.failedChange) {
            console.log(`Failed marker: ${report.currentRun.failedChange.name}`);
            if (report.currentRun.failedChange.note) {
                console.log(`Failure note: ${report.currentRun.failedChange.note}`);
            }
        }
        if (report.queuedChanges.length > 0) {
            console.log('\nQueued changes:');
            for (const change of report.queuedChanges) {
                console.log(`  - ${change.name} [${change.status}]`);
            }
        }
        if (report.nextInstruction) {
            console.log('\nNext instruction:');
            console.log(`  ${report.nextInstruction}`);
        }
        if (report.logTail.length > 0) {
            console.log('\nRecent log lines:');
            for (const line of report.logTail.slice(-10)) {
                console.log(`  ${line}`);
            }
        }
        console.log('');
    }
    parseStartArgs(args) {
        let projectPath;
        let profileId;
        for (let index = 0; index < args.length; index += 1) {
            const value = args[index];
            if (!value) {
                continue;
            }
            if (value === '--profile') {
                profileId = args[index + 1];
                if (!profileId) {
                    throw new Error('Run start requires a value after --profile.');
                }
                index += 1;
                continue;
            }
            if (value.startsWith('--profile=')) {
                profileId = value.slice('--profile='.length);
                if (!profileId) {
                    throw new Error('Run start requires a value after --profile=');
                }
                continue;
            }
            if (value.startsWith('--')) {
                throw new Error(`Unknown run start flag: ${value}`);
            }
            if (!projectPath) {
                projectPath = value;
                continue;
            }
            throw new Error(`Unexpected run start argument: ${value}`);
        }
        return {
            projectPath,
            profileId,
        };
    }
}
exports.RunCommand = RunCommand;
