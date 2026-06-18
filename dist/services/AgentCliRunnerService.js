"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCliRunnerService = void 0;
exports.createAgentCliRunnerService = createAgentCliRunnerService;
const child_process_1 = require("child_process");
class AgentCliRunnerService {
    /**
     * Build the exact external command for a target. Pure; never emits `claude --goal`.
     */
    buildCommand(target, prompt) {
        if (target === 'claude') {
            return { bin: 'claude', args: ['-p', prompt], display: `claude -p ${this.quote(prompt)}` };
        }
        // codex and gpt both use the Codex CLI non-interactive entrypoint.
        return { bin: 'codex', args: ['exec', prompt], display: `codex exec ${this.quote(prompt)}` };
    }
    /** Detect whether a CLI binary is on PATH (cross-platform). */
    isAvailable(bin) {
        const probe = process.platform === 'win32'
            ? (0, child_process_1.spawnSync)('where', [bin], { encoding: 'utf8' })
            : (0, child_process_1.spawnSync)('command', ['-v', bin], { encoding: 'utf8', shell: true });
        return probe.status === 0 && String(probe.stdout || '').trim().length > 0;
    }
    /**
     * Resolve the command for a target+prompt and, unless dry-run, execute it.
     * Detection failures and dry-run both return without throwing.
     */
    run(options) {
        const command = this.buildCommand(options.target, options.prompt);
        const dryRun = options.dryRun !== false; // default dry-run
        const available = this.isAvailable(command.bin);
        if (dryRun || !available) {
            return { command, dryRun, executed: false, available, exitCode: null, stdout: '', stderr: '' };
        }
        const result = (0, child_process_1.spawnSync)(command.bin, command.args, {
            encoding: 'utf8',
            timeout: options.timeoutMs,
            cwd: options.cwd,
        });
        return {
            command,
            dryRun: false,
            executed: true,
            available: true,
            exitCode: typeof result.status === 'number' ? result.status : null,
            stdout: String(result.stdout || ''),
            stderr: String(result.stderr || ''),
        };
    }
    quote(value) {
        if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
            return value;
        }
        return `"${value.replace(/"/g, '\\"')}"`;
    }
}
exports.AgentCliRunnerService = AgentCliRunnerService;
function createAgentCliRunnerService() {
    return new AgentCliRunnerService();
}
