"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalCommand = void 0;
const NewCommand_1 = require("./NewCommand");
class GoalCommand extends NewCommand_1.NewCommand {
    async execute(featureName, rootDir, options = {}) {
        await super.execute(featureName, rootDir, {
            ...options,
            workflowProfile: 'goal',
        });
    }
}
exports.GoalCommand = GoalCommand;
