"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalizeCommand = void 0;
const fs = require("fs").promises;
const path = require("path");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
class FinalizeCommand extends BaseCommand_1.BaseCommand {
    async execute(featurePath, options = {}) {
        try {
            const targetPath = featurePath || process.cwd();
            if (options.reason !== undefined && options.reasonFile !== undefined) {
                throw new Error('Use either --reason or --reason-file, not both.');
            }
            const reason = options.reasonFile !== undefined
                ? await fs.readFile(path.resolve(process.cwd(), options.reasonFile), 'utf8')
                : options.reason;
            this.info(`Finalizing change at ${targetPath}`);
            const result = await services_1.services.projectService.finalizeChange(path.resolve(targetPath), {
                forceArchive: options.forceArchive,
                confirmForceArchive: options.confirmForceArchive,
                reason,
            });
            this.success(`${options.forceArchive ? 'Change force-archived' : 'Change finalized'}: ${result.archivePath}`);
        }
        catch (error) {
            this.error(`Finalize failed: ${error}`);
            throw error;
        }
    }
}
exports.FinalizeCommand = FinalizeCommand;
