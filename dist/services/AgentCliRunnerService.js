"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCliRunnerService = void 0;
exports.createAgentCliRunnerService = createAgentCliRunnerService;
const child_process_1 = require("child_process");
const DEFAULT_AGENT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
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
            env: options.env ? { ...process.env, ...options.env } : process.env,
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
    /**
     * Asynchronously run an external agent in a fresh process. The binary and argument vector are
     * passed directly to spawn, so prompt text is never interpreted by a shell.
     */
    async runAsync(options) {
        const startedAt = Date.now();
        const command = this.buildCommand(options.target, options.prompt);
        const dryRun = options.dryRun !== false;
        const available = this.isAvailable(command.bin);
        if (dryRun || !available) {
            return {
                command,
                dryRun,
                executed: false,
                available,
                exitCode: null,
                stdout: '',
                stderr: '',
                durationMs: Math.max(0, Date.now() - startedAt),
                timedOut: false,
                outputTruncated: false,
            };
        }
        return new Promise(resolve => {
            const child = (0, child_process_1.spawn)(command.bin, command.args, {
                cwd: options.cwd,
                env: options.env ? { ...process.env, ...options.env } : process.env,
                shell: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: process.platform !== 'win32',
                windowsHide: true,
            });
            const stdoutChunks = [];
            const stderrChunks = [];
            let capturedBytes = 0;
            let outputTruncated = false;
            let timedOut = false;
            let spawnError = null;
            const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
                ? options.timeoutMs
                : DEFAULT_AGENT_TIMEOUT_MS;
            const maxOutputBytes = typeof options.maxOutputBytes === 'number' && options.maxOutputBytes > 0
                ? Math.floor(options.maxOutputBytes)
                : DEFAULT_MAX_OUTPUT_BYTES;
            const capture = (target, chunk) => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                const remaining = Math.max(0, maxOutputBytes - capturedBytes);
                if (remaining > 0)
                    target.push(buffer.subarray(0, remaining));
                capturedBytes += Math.min(buffer.length, remaining);
                if (buffer.length > remaining)
                    outputTruncated = true;
            };
            const timeout = setTimeout(() => {
                timedOut = true;
                this.terminateProcessTree(child.pid, () => child.kill());
            }, timeoutMs);
            child.stdout?.on('data', chunk => {
                capture(stdoutChunks, chunk);
            });
            child.stderr?.on('data', chunk => {
                capture(stderrChunks, chunk);
            });
            child.once('error', error => {
                spawnError = error;
            });
            child.once('close', exitCode => {
                clearTimeout(timeout);
                const truncationMarker = outputTruncated ? '\n[output truncated]' : '';
                const stdout = `${Buffer.concat(stdoutChunks).toString('utf8')}${truncationMarker}`;
                const capturedStderr = Buffer.concat(stderrChunks).toString('utf8');
                resolve({
                    command,
                    dryRun: false,
                    executed: true,
                    available: true,
                    exitCode: typeof exitCode === 'number' ? exitCode : null,
                    stdout,
                    stderr: spawnError
                        ? `${capturedStderr}${capturedStderr && !capturedStderr.endsWith('\n') ? '\n' : ''}${spawnError.message}`
                        : capturedStderr,
                    durationMs: Math.max(0, Date.now() - startedAt),
                    timedOut,
                    outputTruncated,
                });
            });
        });
    }
    terminateProcessTree(pid, fallback) {
        if (!pid) {
            fallback();
            return;
        }
        try {
            if (process.platform === 'win32') {
                const killer = (0, child_process_1.spawn)('taskkill', ['/pid', String(pid), '/T', '/F'], {
                    stdio: 'ignore',
                    windowsHide: true,
                });
                killer.once('error', fallback);
                return;
            }
            process.kill(-pid, 'SIGTERM');
        }
        catch {
            fallback();
        }
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
