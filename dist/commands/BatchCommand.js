"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchCommand = void 0;
const advanced_1 = require("../advanced");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class BatchCommand extends BaseCommand_1.BaseCommand {
    async execute(action, projectPath) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getBatchHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'export': {
                    const result = await advanced_1.batchOperations.exportFeatures(targetPath, {});
                    console.log(`\nExported ${result.count} features\n`);
                    break;
                }
                case 'stats': {
                    const stats = await advanced_1.batchOperations.getStatistics(targetPath);
                    console.log('\nStatistics:');
                    console.log(`Total: ${stats.total}\n`);
                    for (const [status, count] of Object.entries(stats.byStatus)) {
                        console.log(`${status}: ${count}`);
                    }
                    console.log();
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getBatchHelpText)());
            }
        }
        catch (error) {
            this.error(`Batch operation failed: ${error}`);
            throw error;
        }
    }
}
exports.BatchCommand = BatchCommand;