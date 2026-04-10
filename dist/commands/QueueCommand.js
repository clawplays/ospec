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
exports.QueueCommand = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
const NewCommand_1 = require("./NewCommand");
class QueueCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', ...args) {
        try {
            const normalizedAction = action || 'status';
            if ((0, subcommandHelp_1.isHelpAction)(normalizedAction)) {
                this.info((0, subcommandHelp_1.getQueueHelpText)());
                return;
            }
            switch (normalizedAction) {
                case 'status':
                case 'list':
                    await this.showStatus(args[0]);
                    return;
                case 'add':
                    await this.add(args);
                    return;
                case 'activate':
                    if (!args[0]) {
                        console.error('Usage: ospec queue activate <change-name> [path]');
                        process.exit(1);
                    }
                    await this.activate(args[0], args[1]);
                    return;
                case 'next':
                    await this.activateNext(args[0]);
                    return;
                default:
                    this.info((0, subcommandHelp_1.getQueueHelpText)());
            }
        }
        catch (error) {
            this.error(`Queue command failed: ${error}`);
            throw error;
        }
    }
    async add(args) {
        const parsed = this.parseAddArgs(args);
        if (!parsed.changeName) {
            console.error('Usage: ospec queue add <change-name> [path] [--flags flag1,flag2]');
            process.exit(1);
        }
        const newCommand = new NewCommand_1.NewCommand();
        await newCommand.execute(parsed.changeName, parsed.projectPath, {
            flags: parsed.flags,
            placement: 'queued',
            source: 'queue',
        });
    }
    async showStatus(rootDir) {
        const targetDir = path.resolve(rootDir || process.cwd());
        const queuedChanges = await services_1.services.queueService.getQueuedChanges(targetDir);
        console.log('\nQueued Changes');
        console.log('==============\n');
        console.log(`Total queued: ${queuedChanges.length}\n`);
        if (queuedChanges.length === 0) {
            console.log('No queued changes.\n');
            return;
        }
        queuedChanges.forEach((change, index) => {
            console.log(`${index + 1}. ${change.name}`);
            console.log(`   Path: ${change.path}`);
            console.log(`   Status: ${change.status}`);
            console.log(`   Current step: ${change.currentStep}`);
            if (change.flags.length > 0) {
                console.log(`   Flags: ${change.flags.join(', ')}`);
            }
            console.log(`   Queued at: ${change.queuedAt ?? 'unknown'}`);
            console.log(`   Source: ${change.source ?? 'unknown'}`);
            console.log('');
        });
    }
    async activate(changeName, rootDir) {
        const targetDir = path.resolve(rootDir || process.cwd());
        const activated = await services_1.services.queueService.activateQueuedChange(targetDir, changeName, 'queue');
        this.success(`Queued change ${changeName} activated at ${activated.path}`);
    }
    async activateNext(rootDir) {
        const targetDir = path.resolve(rootDir || process.cwd());
        const activated = await services_1.services.queueService.activateNextQueuedChange(targetDir, 'queue');
        if (!activated) {
            this.success('No queued changes to activate.');
            return;
        }
        this.success(`Activated next queued change: ${activated.name}`);
    }
    parseAddArgs(args) {
        const changeName = args[0];
        let projectPath;
        const flags = [];
        for (let index = 1; index < args.length; index += 1) {
            const value = args[index];
            if (value === '--flags') {
                const rawFlags = args[index + 1];
                if (!rawFlags || rawFlags.startsWith('--')) {
                    throw new Error('Queue add requires a value after --flags.');
                }
                flags.push(...rawFlags.split(',').map(flag => flag.trim()).filter(Boolean));
                index += 1;
                continue;
            }
            if (value.startsWith('--flags=')) {
                flags.push(...value.slice('--flags='.length).split(',').map(flag => flag.trim()).filter(Boolean));
                continue;
            }
            if (value.startsWith('--')) {
                throw new Error(`Unknown queue add flag: ${value}`);
            }
            if (!projectPath) {
                projectPath = value;
                continue;
            }
            throw new Error(`Unexpected queue add argument: ${value}`);
        }
        return {
            changeName,
            projectPath,
            flags: Array.from(new Set(flags)),
        };
    }
}
exports.QueueCommand = QueueCommand;