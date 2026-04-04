"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsCommand = void 0;
const services_1 = require("../services");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class SkillsCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', projectPath) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getSkillsHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'status': {
                    const skills = await services_1.services.projectService.getSkillsStatus(targetPath);
                    console.log('\nSkills Status');
                    console.log('=============\n');
                    console.log(`Skill files: ${skills.existing}/${skills.totalSkillFiles}`);
                    console.log(`Index: ${skills.skillIndex.exists ? 'present' : 'missing'}`);
                    console.log(`Index needs rebuild: ${skills.skillIndex.needsRebuild ? 'yes' : 'no'}`);
                    if (skills.skillIndex.updatedAt) {
                        console.log(`Index updated: ${skills.skillIndex.updatedAt}`);
                    }
                    if (skills.skillIndex.latestSourceUpdatedAt) {
                        console.log(`Latest skill update: ${skills.skillIndex.latestSourceUpdatedAt}`);
                    }
                    if (skills.skillIndex.stats) {
                        console.log(`Index stats: ${skills.skillIndex.stats.totalFiles} files, ${skills.skillIndex.stats.totalModules} modules, ${skills.skillIndex.stats.totalSections} sections`);
                    }
                    if (skills.skillIndex.reasons.length > 0) {
                        console.log('Index rebuild reasons:');
                        for (const reason of skills.skillIndex.reasons) {
                            console.log(`  - ${reason}`);
                        }
                    }
                    console.log('\nRoot skills:');
                    for (const skill of skills.rootSkills) {
                        console.log(`  ${skill.exists ? '✓' : '✗'} ${skill.path}`);
                    }
                    if (skills.moduleSkills.length > 0) {
                        console.log('\nModule skills:');
                        for (const skill of skills.moduleSkills) {
                            console.log(`  ${skill.exists ? '✓' : '✗'} ${skill.path}`);
                        }
                    }
                    if (skills.missingRecommended.length > 0) {
                        console.log('\nMissing recommended skills:');
                        for (const item of skills.missingRecommended) {
                            console.log(`  - ${item}`);
                        }
                    }
                    console.log('');
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getSkillsHelpText)());
            }
        }
        catch (error) {
            this.error(`Skills command failed: ${error}`);
            throw error;
        }
    }
}
exports.SkillsCommand = SkillsCommand;