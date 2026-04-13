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
exports.ProgressCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
class ProgressCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath) {
        try {
            const targetPath = featurePath && !path.isAbsolute(featurePath)
                ? (0, ProjectLayout_1.resolveManagedInputPath)(process.cwd(), featurePath, await services_1.services.configManager.loadConfig(process.cwd()).catch(() => null))
                : featurePath || process.cwd();
            this.logger.info(`Checking progress for change at ${targetPath}`);
            const statePath = path.join(targetPath, constants_1.FILE_NAMES.STATE);
            if (!(await services_1.services.fileService.exists(statePath))) {
                throw new Error('Change state file not found.');
            }
            const featureState = await services_1.services.fileService.readJSON(statePath);
            const statuses = [
                'draft',
                'proposed',
                'planned',
                'implementing',
                'verifying',
                'ready_to_archive',
                'archived',
            ];
            const completedPhases = Math.max(statuses.indexOf(featureState.status), 0);
            const totalPhases = statuses.length - 1;
            const percentage = Math.round((completedPhases / totalPhases) * 100);
            const barLength = 30;
            const filledLength = Math.round((completedPhases / totalPhases) * barLength);
            const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
            console.log('\nWorkflow Progress:');
            console.log('==================\n');
            console.log(`Change: ${featureState.feature}`);
            console.log(`Status: ${featureState.status}`);
            console.log(`Current Step: ${featureState.current_step}\n`);
            console.log(`Progress: [${bar}] ${percentage}%`);
            console.log(`Completed: ${completedPhases}/${totalPhases} phases\n`);
            console.log('Completed Items:');
            if ((featureState.completed || []).length === 0) {
                console.log('  - None');
            }
            else {
                featureState.completed.forEach((step) => {
                    console.log(`  - ${step}`);
                });
            }
            console.log('\nPending Items:');
            if ((featureState.pending || []).length === 0) {
                console.log('  - None');
            }
            else {
                featureState.pending.slice(0, 5).forEach((step) => {
                    console.log(`  - ${step}`);
                });
                if (featureState.pending.length > 5) {
                    console.log(`  ... and ${featureState.pending.length - 5} more`);
                }
            }
            console.log('\n' + '='.repeat(20) + '\n');
        }
        catch (error) {
            this.error(`Failed to check progress: ${error}`);
            throw error;
        }
    }
}
exports.ProgressCommand = ProgressCommand;
