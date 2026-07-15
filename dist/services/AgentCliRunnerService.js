"use strict";
/**
 * @deprecated Agent CLI processes were removed from OSpec execution. The
 * current model harness must dispatch its own native subagents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCliRunnerService = void 0;
exports.createAgentCliRunnerService = createAgentCliRunnerService;
const REMOVAL_MESSAGE = 'Agent CLI execution was removed. Dispatch this packet through the current model harness native subagent API.';
/** @deprecated Use the runtime adapter nativeSubagent contract. */
class AgentCliRunnerService {
    buildCommand(_target, _prompt) {
        throw new Error(REMOVAL_MESSAGE);
    }
    isAvailable(_bin) {
        return false;
    }
    run(_options) {
        throw new Error(REMOVAL_MESSAGE);
    }
    async runAsync(_options) {
        throw new Error(REMOVAL_MESSAGE);
    }
}
exports.AgentCliRunnerService = AgentCliRunnerService;
/** @deprecated Use RuntimeExecutionAdapterService. */
function createAgentCliRunnerService() {
    return new AgentCliRunnerService();
}
