"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexCommand = void 0;
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class IndexCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'check', projectPath) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getIndexHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'build': {
                    const index = await services_1.services.projectService.rebuildIndex(targetPath);
                    this.success(`Index rebuilt at ${index.path}`);
                    if (index.stats) {
                        this.info(`  Files: ${index.stats.totalFiles}, Modules: ${index.stats.totalModules}, Sections: ${index.stats.totalSections}`);
                    }
                    break;
                }
                case 'check': {
                    const index = await services_1.services.projectService.getIndexStatus(targetPath);
                    console.log('\nIndex Status');
                    console.log('============\n');
                    console.log(`Present: ${index.exists ? 'yes' : 'no'}`);
                    console.log(`Path: ${index.path}`);
                    console.log(`Updated: ${index.updatedAt ?? 'unknown'}`);
                    console.log(`Needs rebuild: ${index.needsRebuild ? 'yes' : 'no'}`);
                    console.log(`Stale: ${index.stale ? 'yes' : 'no'}`);
                    console.log(`Latest source update: ${index.latestSourceUpdatedAt ?? 'unknown'}`);
                    if (index.stats) {
                        console.log(`Stats: ${index.stats.totalFiles} files, ${index.stats.totalModules} modules, ${index.stats.totalSections} sections`);
                    }
                    if (index.reasons.length > 0) {
                        console.log('Reasons:');
                        for (const reason of index.reasons) {
                            console.log(`  - ${reason}`);
                        }
                    }
                    console.log('');
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getIndexHelpText)());
            }
        }
        catch (error) {
            this.error(`Index command failed: ${error}`);
            throw error;
        }
    }
}
exports.IndexCommand = IndexCommand;
