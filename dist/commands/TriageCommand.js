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
exports.TriageCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const BaseCommand_1 = require("./BaseCommand");
class TriageCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'list', ...args) {
        try {
            const normalized = (action || 'list').toLowerCase();
            switch (normalized) {
                case 'list':
                    await this.list(args[0]);
                    return;
                case 'claim':
                    await this.claim(args);
                    return;
                case 'promote':
                    await this.promote(args);
                    return;
                default:
                    this.info('Usage: ospec triage <list|claim|promote> [path] [--id <id>] [--by <name>]');
            }
        }
        catch (error) {
            this.error(`Triage command failed: ${error}`);
            throw error;
        }
    }
    async list(inputPath) {
        const { projectRoot, config } = await this.resolveProject(inputPath);
        const items = await services_1.services.triageService.list(projectRoot, config);
        console.log('\nTriage Inbox');
        console.log('============\n');
        console.log(`Inbox: ${services_1.services.triageService.inboxPath(projectRoot, config)}`);
        if (items.length === 0) {
            console.log('No triage items.');
            console.log('');
            return;
        }
        for (const item of items) {
            console.log(`- [${item.severity}] ${item.id}${item.claimed ? ` (claimed by ${item.claimedBy})` : ''}`);
            console.log(`    ${item.title}`);
            console.log(`    Suggested: ${item.suggestedAction}`);
        }
        console.log('');
    }
    async claim(args) {
        const { inputPath, id, by } = this.parseArgs(args);
        if (!id) {
            throw new Error('Triage claim requires --id <id>.');
        }
        const { projectRoot, config } = await this.resolveProject(inputPath);
        const item = await services_1.services.triageService.claim(projectRoot, config, id, by || 'user');
        this.success(`Claimed triage item ${item.id} for ${item.claimedBy}.`);
    }
    async promote(args) {
        const { inputPath, id, by } = this.parseArgs(args);
        if (!id) {
            throw new Error('Triage promote requires --id <id>.');
        }
        const { projectRoot, config } = await this.resolveProject(inputPath);
        const items = await services_1.services.triageService.list(projectRoot, config);
        const target = items.find(entry => entry.id === id);
        if (!target) {
            throw new Error(`Triage item ${id} not found.`);
        }
        await services_1.services.triageService.claim(projectRoot, config, id, by || 'user');
        const changeName = target.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) || 'triage-followup';
        this.success(`Promoted ${id}. Create the follow-up work with:`);
        console.log(`  ${(0, helpers_1.formatCliCommand)('ospec', 'queue', 'add', changeName, projectRoot)}`);
    }
    parseArgs(args) {
        let inputPath;
        let id;
        let by;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--id') {
                id = args[index + 1];
                index += 1;
                continue;
            }
            if (arg.startsWith('--id=')) {
                id = arg.slice('--id='.length);
                continue;
            }
            if (arg === '--by') {
                by = args[index + 1];
                index += 1;
                continue;
            }
            if (arg.startsWith('--by=')) {
                by = arg.slice('--by='.length);
                continue;
            }
            if (!arg.startsWith('--') && !inputPath) {
                inputPath = arg;
                continue;
            }
        }
        return { inputPath, id, by };
    }
    async resolveProject(inputPath) {
        const start = inputPath ? path.resolve(inputPath) : process.cwd();
        let current = start;
        while (true) {
            if (await services_1.services.fileService.exists(path.join(current, constants_1.FILE_NAMES.SKILLRC))) {
                const config = await services_1.services.configManager.loadConfigOrNull(current);
                return { projectRoot: current, config };
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        throw new Error('Unable to locate an initialized project (.skillrc) from the provided path.');
    }
}
exports.TriageCommand = TriageCommand;
