"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizeCommand = void 0;
const path = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
class FinalizeCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath) {
        try {
            const targetPath = featurePath || process.cwd();
            this.info(`Finalizing change at ${targetPath}`);
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
