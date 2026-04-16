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
exports.InitCommand = void 0;
const os_1 = require("os");
const path = __importStar(require("path"));
const services_1 = require("../services");
const helpers_1 = require("../utils/helpers");
const BaseCommand_1 = require("./BaseCommand");
const SkillCommand_1 = require("./SkillCommand");
const PostSyncMaintenanceService_1 = require("../services/PostSyncMaintenanceService");
class InitCommand extends BaseCommand_1.BaseCommand {
    async execute(rootDir, input = {}) {
        try {
            const targetDir = rootDir || process.cwd();
            this.logger.info(`Initializing OSpec project at ${targetDir}`);
            const structure = await services_1.services.projectService.detectProjectStructure(targetDir);
            let protocolShellCreated = false;
            if (!structure.initialized) {
                const config = await services_1.services.configManager.createDefaultConfig('full');
                await services_1.services.projectService.initializeProtocolShellProject(targetDir, config.mode, {
                    projectName: path.basename(targetDir),
                    ...input,
                });
                protocolShellCreated = true;
            }
            else {
                this.info('  Protocol shell already present; reconciling the repository to a change-ready state');
            }
            const result = await services_1.services.projectService.generateProjectKnowledge(targetDir, input);
            const skillResult = await this.syncInstalledSkills();
            const postSyncMaintenance = await this.runPostSyncMaintenance();
            this.success(`Project initialized to change-ready state at ${targetDir}`);
            this.info(`  Protocol shell: ${protocolShellCreated ? 'created' : 'already present'}`);
            this.info(`  Project knowledge: ${result.createdFiles.length} created, ${result.refreshedFiles.length} refreshed, ${result.skippedFiles.length} skipped`);
            this.info(`  Document language: ${result.documentLanguage}`);
            this.info(`  Codex skills: ${this.formatManagedSkills(skillResult.codex)}`);
            if (skillResult.claude.length > 0) {
                this.info(`  Claude skills: ${this.formatManagedSkills(skillResult.claude)}`);
            }
            if (postSyncMaintenance.removedPaths.length > 0) {
                this.info(`  stale plugin skills removed: ${postSyncMaintenance.removedPaths.length}`);
            }
            if (input.summary || (Array.isArray(input.techStack) && input.techStack.length > 0) || input.architecture) {
                this.info('  Applied user-provided project context to the generated knowledge docs');
            }
            if (result.firstChangeSuggestion) {
                this.info(`  Suggested first change: ${result.firstChangeSuggestion.name}`);
            }
            this.info(`  Next: ${(0, helpers_1.formatCliCommand)('ospec', 'new', '<change-name>', targetDir)}`);
        }
        catch (error) {
            this.error(`Failed to initialize project: ${error}`);
            throw error;
        }
    }
    getManagedSkillNames() {
        return ['ospec', 'ospec-change'];
    }
    formatManagedSkills(results) {
        return results.map(result => result.skillName).join(', ');
    }
    async syncInstalledSkills() {
        const skillCommand = new SkillCommand_1.SkillCommand();
        const codex = [];
        for (const skillName of this.getManagedSkillNames()) {
            codex.push(await skillCommand.installSkill('codex', skillName));
        }
        const claude = [];
        if (await this.shouldSyncClaudeSkills()) {
            for (const skillName of this.getManagedSkillNames()) {
                claude.push(await skillCommand.installSkill('claude', skillName));
            }
        }
        return { codex, claude };
    }
    async runPostSyncMaintenance() {
        const maintenanceService = new PostSyncMaintenanceService_1.PostSyncMaintenanceService(services_1.services.fileService);
        return maintenanceService.runManagedSkillPostprocessing();
    }
    resolveProviderHome(provider) {
        const envHome = provider === 'claude'
            ? String(process.env.CLAUDE_HOME || '').trim()
            : String(process.env.CODEX_HOME || '').trim();
        if (envHome) {
            return path.resolve(envHome);
        }
        return provider === 'claude'
            ? path.join((0, os_1.homedir)(), '.claude')
            : path.join((0, os_1.homedir)(), '.codex');
    }
    async shouldSyncClaudeSkills() {
        const claudeHome = this.resolveProviderHome('claude');
        if (String(process.env.CLAUDE_HOME || '').trim()) {
            return true;
        }
        return services_1.services.fileService.exists(claudeHome);
    }
}
exports.InitCommand = InitCommand;
