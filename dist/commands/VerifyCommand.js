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
exports.VerifyCommand = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const VerificationService_1 = require("../services/VerificationService");
class VerifyCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath) {
        try {
            const targetPath = featurePath && !path.isAbsolute(featurePath)
                ? (0, ProjectLayout_1.resolveManagedInputPath)(process.cwd(), featurePath, await services_1.services.configManager.loadConfig(process.cwd()).catch(() => null))
                : featurePath || process.cwd();
            this.logger.info(`Verifying change at ${targetPath}`);
            // Keep the index fresh for the verification context. Idempotent (a no-op when the
            // index is already current) and best-effort — never block verification on it.
            await services_1.services.projectService.rebuildIndexForPath(targetPath, { syncAssets: false }).catch(() => null);
            const outcome = await (0, VerificationService_1.createVerificationService)().verify(targetPath);
            console.log('\nChange Verification Results:');
            console.log('====================\n');
            for (const check of outcome.checks) {
                const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
                console.log(`${icon} ${check.name}: ${check.message}`);
            }
            console.log('\n' + '='.repeat(24));
            console.log(`Summary: ${outcome.summary}`);
            console.log('='.repeat(24) + '\n');
            if (outcome.passed) {
                this.success('All verifications passed');
            }
            else {
                this.warn('Some verifications failed');
                process.exit(1);
            }
        }
        catch (error) {
            this.error(`Verification failed: ${error}`);
            throw error;
        }
    }
}
exports.VerifyCommand = VerifyCommand;
