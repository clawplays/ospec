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
exports.PostSyncMaintenanceService = void 0;
exports.createPostSyncMaintenanceService = createPostSyncMaintenanceService;
const os_1 = require("os");
const path = __importStar(require("path"));
const LEGACY_PLUGIN_SKILL_NAMES = ['ospec-stitch', 'ospec-checkpoint'];
class PostSyncMaintenanceService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async runManagedSkillPostprocessing() {
        const tasks = [
            await this.removeLegacyPluginSkills(),
        ];
        return {
            removedPaths: tasks.flatMap(task => task.removedPaths),
            tasks,
        };
    }
    async removeLegacyPluginSkills() {
        const removedPaths = [];
        for (const targetPath of this.getLegacyPluginSkillPaths()) {
            if (!(await this.fileService.exists(targetPath))) {
                continue;
            }
            await this.fileService.remove(targetPath);
            removedPaths.push(targetPath);
        }
        return {
            taskId: 'legacy-plugin-skills',
            removedPaths,
        };
    }
    getLegacyPluginSkillPaths() {
        const paths = new Set();
        for (const provider of ['codex', 'claude']) {
            const providerHome = this.resolveProviderHome(provider);
            for (const skillName of LEGACY_PLUGIN_SKILL_NAMES) {
                paths.add(path.join(providerHome, 'skills', skillName));
            }
        }
        return Array.from(paths).sort((left, right) => left.localeCompare(right));
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
}
exports.PostSyncMaintenanceService = PostSyncMaintenanceService;
function createPostSyncMaintenanceService(fileService) {
    return new PostSyncMaintenanceService(fileService);
}
