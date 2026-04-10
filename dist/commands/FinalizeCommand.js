"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizeCommand = void 0;
const path = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
const VerifyCommand_1 = require("./VerifyCommand");
class FinalizeCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath) {
        try {
            const targetPath = featurePath || process.cwd();
            this.info(`Finalizing change at ${targetPath}`);
            const verifyCmd = new VerifyCommand_1.VerifyCommand();
            await verifyCmd.execute(targetPath);
            const result = await services_1.services.projectService.finalizeChange(path.resolve(targetPath));
            this.success(`Change finalized: ${result.archivePath}`);
        }
        catch (error) {
            this.error(`Finalize failed: ${error}`);
            throw error;
        }
    }
}
exports.FinalizeCommand = FinalizeCommand;