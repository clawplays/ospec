"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeExecutionAdapterService = void 0;
exports.createRuntimeExecutionAdapterService = createRuntimeExecutionAdapterService;
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const COMMAND_TIMEOUT_MS = 2500;
const RESOLUTION_CACHE_TTL_MS = 30000;
const PERSISTENT_CACHE_VERSION = '2.0';
/**
 * Resolves the concrete worker adapter for the current runtime. Detection is capability-based:
 * an Orca process name is never sufficient without a callable CLI and current-worktree proof.
 */
class RuntimeExecutionAdapterService {
    constructor(commandRunner = defaultCommandRunner, platform = process.platform, pathExists = fs_1.existsSync) {
        this.commandRunner = commandRunner;
        this.platform = platform;
        this.pathExists = pathExists;
        this.resolutionCache = new Map();
    }
    resolve(input) {
        const env = input.env ?? process.env;
        const target = String(input.target || 'generic').trim().toLowerCase() || 'generic';
        const preference = normalizePreference(input.preference ?? env.OSPEC_EXECUTION_ADAPTER);
        const strict = input.strict ?? normalizeBoolean(env.OSPEC_EXECUTION_ADAPTER_STRICT) ?? false;
        const projectRoot = this.pathApi().resolve(input.projectRoot);
        const now = input.now ?? new Date();
        const cacheKey = this.cacheKey({
            projectRoot,
            target,
            preference,
            strict,
            independent: input.requiresIndependentWorker === true,
            capability: input.capability,
            env,
        });
        const cached = this.resolutionCache.get(cacheKey);
        if (cached && cached.expiresAt > now.getTime())
            return cached.resolution;
        if (cached)
            this.resolutionCache.delete(cacheKey);
        const persistent = this.readPersistentCache(input.cacheFilePath, cacheKey, now);
        if (persistent) {
            this.resolutionCache.set(cacheKey, persistent);
            return persistent.resolution;
        }
        const candidates = [
            this.probeOrca(projectRoot, target, env),
            this.probeNative(target, input.capability, now),
            this.probeTargetCli(projectRoot, target),
            this.buildGenericCandidate(input.requiresIndependentWorker === true),
        ];
        const matching = preference === 'auto'
            ? candidates
            : candidates.filter(candidate => candidate.kind === preference);
        let selected = matching.find(candidate => candidate.available) || null;
        const warnings = [];
        if (preference !== 'auto' && !selected) {
            const reason = matching.map(candidate => candidate.reason).join('; ') || `No ${preference} adapter is registered for target ${target}.`;
            if (strict) {
                warnings.push(`Strict adapter preference "${preference}" is unavailable: ${reason}`);
            }
            else {
                warnings.push(`Preferred adapter "${preference}" is unavailable; continuing through the safe fallback chain: ${reason}`);
                selected = candidates.find(candidate => candidate.available) || null;
            }
        }
        if (!selected) {
            warnings.push(input.requiresIndependentWorker
                ? 'No independent worker adapter is available; the generic current-controller fallback is intentionally disabled for independent work.'
                : 'No executable adapter is available for this runtime.');
        }
        const resolution = {
            version: '1.0',
            preference,
            strict,
            target,
            selectedAdapterId: selected?.id || null,
            selected,
            fallbackOrder: candidates.map(candidate => candidate.id),
            candidates,
            blocked: selected === null,
            warnings,
        };
        this.resolutionCache.set(cacheKey, {
            expiresAt: now.getTime() + RESOLUTION_CACHE_TTL_MS,
            resolution,
        });
        this.writePersistentCache(input.cacheFilePath, cacheKey, now, resolution);
        return resolution;
    }
    probeOrca(projectRoot, target, env) {
        const agentCommand = target === 'gpt' ? 'codex' : target;
        if (!['codex', 'gpt', 'claude', 'gemini', 'opencode', 'cursor', 'copilot'].includes(target)) {
            return this.unavailable('orca-terminal', 'orca', `Orca cannot infer an agent command for target ${target}.`);
        }
        const declaredWorktree = extractOrcaWorktreePath(env.ORCA_WORKTREE_ID || env.ORCA_WORKSPACE_ID);
        if (declaredWorktree && !isSameOrAncestor(declaredWorktree, projectRoot, this.platform)) {
            return this.unavailable('orca-terminal', 'orca', `Orca environment identifies a different worktree (${declaredWorktree}).`, false);
        }
        const probes = [];
        const configured = String(env.OSPEC_ORCA_CLI || '').trim();
        if (configured)
            probes.push(configured);
        if (this.platform === 'win32' && env.LOCALAPPDATA) {
            probes.push(path.win32.join(env.LOCALAPPDATA, 'Programs', 'orca', 'resources', 'bin', 'orca.cmd'));
        }
        if (this.platform === 'linux')
            probes.push('orca-ide', 'orca-dev', 'orca');
        else
            probes.push('orca', 'orca-dev', 'orca-ide');
        const failures = [];
        for (const bin of unique(probes)) {
            if (!this.isCommandAvailable(bin, projectRoot)) {
                failures.push(`${bin}: not on PATH`);
                continue;
            }
            const status = this.runCommand(bin, ['status', '--json'], projectRoot);
            if (status.status !== 0 || !parseJson(status.stdout)) {
                failures.push(`${bin}: status probe failed${diagnosticSuffix(status)}`);
                continue;
            }
            const current = this.runCommand(bin, ['worktree', 'current', '--json'], projectRoot);
            const currentJson = current.status === 0 ? parseJson(current.stdout) : null;
            if (!currentJson) {
                failures.push(`${bin}: current worktree probe failed${diagnosticSuffix(current)}`);
                continue;
            }
            const owned = extractPaths(currentJson).some(candidate => isSameOrAncestor(candidate, projectRoot, this.platform));
            if (!owned) {
                failures.push(`${bin}: current worktree does not own ${projectRoot}`);
                continue;
            }
            return {
                id: 'orca-terminal',
                kind: 'orca',
                available: true,
                verified: true,
                reason: `Verified by ${bin} status and current-worktree probes.`,
                binary: bin,
                workspaceOwned: true,
                supportsParallel: true,
                requiresControllerAction: false,
                commandTemplates: [
                    this.commandTemplate(bin, ['terminal', 'create', '--worktree', 'active', '--title', '<task-title>', '--command', agentCommand, '--json']),
                    this.commandTemplate(bin, ['terminal', 'wait', '--terminal', '<terminal-handle>', '--for', 'tui-idle', '--timeout-ms', '60000', '--json']),
                    this.commandTemplate(bin, ['terminal', 'send', '--terminal', '<terminal-handle>', '--text', '<adapter-packet-prompt>', '--enter', '--json']),
                ],
            };
        }
        return this.unavailable('orca-terminal', 'orca', `No verified Orca CLI/worktree pair (${failures.join('; ') || 'no CLI candidates'}).`, failures.some(item => item.includes('does not own')) ? false : null);
    }
    probeNative(target, capability, now) {
        const expiresAt = capability?.expiresAt ? Date.parse(capability.expiresAt) : Number.NaN;
        const current = capability?.controllerAvailable === true
            && capability.nativeSubagentCapability === 'supported'
            && Number.isFinite(expiresAt)
            && expiresAt > now.getTime();
        return {
            id: `${target}-harness-native`,
            kind: 'native',
            available: current,
            verified: current,
            reason: current
                ? `Current session-bound harness capability authorizes the ${target} native adapter.`
                : `No current session-bound native-subagent capability authorizes target ${target}.`,
            binary: null,
            workspaceOwned: null,
            supportsParallel: current,
            requiresControllerAction: true,
            commandTemplates: [],
        };
    }
    probeTargetCli(projectRoot, target) {
        const binary = target === 'gpt' ? 'codex' : target;
        const supported = ['codex', 'gpt', 'claude', 'gemini', 'opencode'].includes(target);
        if (!supported) {
            return this.unavailable(`${target}-cli`, 'cli', `No safe direct CLI contract is registered for target ${target}.`);
        }
        const available = this.isCommandAvailable(binary, projectRoot);
        const args = target === 'claude'
            ? ['-p', '<adapter-packet-prompt>']
            : target === 'codex' || target === 'gpt'
                ? ['exec', '<adapter-packet-prompt>']
                : target === 'gemini'
                    ? ['-p', '<adapter-packet-prompt>']
                    : ['run', '<adapter-packet-prompt>'];
        return {
            id: `${binary}-cli`,
            kind: 'cli',
            available,
            verified: available,
            reason: available ? `${binary} is callable without a shell.` : `${binary} is not on PATH.`,
            binary,
            workspaceOwned: null,
            supportsParallel: available,
            requiresControllerAction: false,
            commandTemplates: available ? [{ bin: binary, args }] : [],
        };
    }
    buildGenericCandidate(independent) {
        return {
            id: 'generic-current-controller',
            kind: 'generic',
            available: !independent,
            verified: true,
            reason: independent
                ? 'Independent work cannot fall back to the same controller context.'
                : 'Execute serially in the current controller context without claiming a child process.',
            binary: null,
            workspaceOwned: null,
            supportsParallel: false,
            requiresControllerAction: true,
            commandTemplates: [],
        };
    }
    unavailable(id, kind, reason, workspaceOwned = null) {
        return {
            id,
            kind,
            available: false,
            verified: false,
            reason,
            binary: null,
            workspaceOwned,
            supportsParallel: false,
            requiresControllerAction: false,
            commandTemplates: [],
        };
    }
    isCommandAvailable(bin, cwd) {
        if (this.pathApi().isAbsolute(bin))
            return this.pathExists(bin);
        const result = this.platform === 'win32'
            ? this.commandRunner('where', [bin], { cwd, timeoutMs: COMMAND_TIMEOUT_MS })
            : this.commandRunner('sh', ['-lc', 'command -v "$1"', 'ospec-probe', bin], { cwd, timeoutMs: COMMAND_TIMEOUT_MS });
        return result.status === 0 && result.stdout.trim().length > 0;
    }
    runCommand(bin, args, cwd) {
        const invocation = this.resolveInvocation(bin, args);
        return this.commandRunner(invocation.bin, invocation.args, {
            cwd,
            timeoutMs: COMMAND_TIMEOUT_MS,
            environment: invocation.environment,
        });
    }
    commandTemplate(bin, args) {
        return this.resolveInvocation(bin, args);
    }
    resolveInvocation(bin, args) {
        const pathApi = this.pathApi();
        if (this.platform === 'win32' && pathApi.basename(bin).toLowerCase() === 'orca.cmd') {
            const resourcesDir = pathApi.resolve(pathApi.dirname(bin), '..');
            const electron = pathApi.resolve(resourcesDir, '..', 'Orca.exe');
            const cli = pathApi.join(resourcesDir, 'app.asar.unpacked', 'out', 'cli', 'index.js');
            if (this.pathExists(electron) && this.pathExists(cli)) {
                return {
                    bin: electron,
                    args: [cli, ...args],
                    environment: {
                        ELECTRON_RUN_AS_NODE: '1',
                        NODE_OPTIONS: '',
                        NODE_REPL_EXTERNAL_MODULE: '',
                    },
                };
            }
        }
        return { bin, args };
    }
    pathApi() {
        return this.platform === 'win32' ? path.win32 : path.posix;
    }
    cacheKey(input) {
        return JSON.stringify({
            projectRoot: input.projectRoot,
            target: input.target,
            preference: input.preference,
            strict: input.strict,
            independent: input.independent,
            capability: input.capability
                ? {
                    source: input.capability.probeSource,
                    native: input.capability.nativeSubagentCapability,
                    controller: input.capability.controllerAvailable,
                    expiresAt: input.capability.controllerAvailable
                        && input.capability.nativeSubagentCapability === 'supported'
                        ? input.capability.expiresAt
                        : null,
                }
                : null,
            orca: {
                cli: input.env.OSPEC_ORCA_CLI || null,
                localAppData: input.env.LOCALAPPDATA || null,
                worktree: input.env.ORCA_WORKTREE_ID || input.env.ORCA_WORKSPACE_ID || null,
                terminal: input.env.ORCA_TERMINAL_HANDLE || null,
            },
        });
    }
    readPersistentCache(cacheFilePath, cacheKey, now) {
        if (!cacheFilePath)
            return null;
        try {
            const raw = JSON.parse((0, fs_1.readFileSync)(path.resolve(cacheFilePath), 'utf8'));
            const entry = raw.version === PERSISTENT_CACHE_VERSION
                ? raw.entries?.[cacheKey]
                : raw.version === '1.0' && raw.cacheKey === cacheKey
                    ? raw
                    : undefined;
            const expiresAt = Date.parse(String(entry?.expiresAt || ''));
            if (!entry
                || !Number.isFinite(expiresAt)
                || expiresAt <= now.getTime()
                || !isValidCachedResolution(entry.resolution))
                return null;
            return { expiresAt, resolution: entry.resolution };
        }
        catch {
            return null;
        }
    }
    writePersistentCache(cacheFilePath, cacheKey, now, resolution) {
        if (!cacheFilePath)
            return;
        const resolved = path.resolve(cacheFilePath);
        try {
            (0, fs_1.mkdirSync)(path.dirname(resolved), { recursive: true });
            let entries = {};
            try {
                const existing = JSON.parse((0, fs_1.readFileSync)(resolved, 'utf8'));
                if (existing.version === PERSISTENT_CACHE_VERSION && existing.entries) {
                    entries = Object.fromEntries(Object.entries(existing.entries).filter(([, entry]) => {
                        const expiresAt = Date.parse(String(entry?.expiresAt || ''));
                        return Number.isFinite(expiresAt) && expiresAt > now.getTime() && isValidCachedResolution(entry?.resolution);
                    }));
                }
            }
            catch {
                // Missing, legacy, or partially written caches are replaced below.
            }
            entries[cacheKey] = {
                generatedAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + RESOLUTION_CACHE_TTL_MS).toISOString(),
                resolution,
            };
            (0, fs_1.writeFileSync)(resolved, `${JSON.stringify({
                version: PERSISTENT_CACHE_VERSION,
                entries,
            }, null, 2)}\n`, { encoding: 'utf8' });
        }
        catch {
            // Cache writes are an optimization and must never block execution.
        }
    }
}
exports.RuntimeExecutionAdapterService = RuntimeExecutionAdapterService;
function defaultCommandRunner(bin, args, options) {
    const result = (0, child_process_1.spawnSync)(bin, args, {
        cwd: options.cwd,
        env: options.environment ? { ...process.env, ...options.environment } : process.env,
        encoding: 'utf8',
        timeout: options.timeoutMs,
        windowsHide: true,
        shell: false,
        maxBuffer: 1024 * 1024,
    });
    return {
        status: typeof result.status === 'number' ? result.status : null,
        stdout: String(result.stdout || ''),
        stderr: String(result.stderr || ''),
        error: result.error?.message,
    };
}
function normalizePreference(value) {
    const normalized = String(value || 'auto').trim().toLowerCase();
    return normalized === 'orca' || normalized === 'native' || normalized === 'cli' || normalized === 'generic'
        ? normalized
        : 'auto';
}
function normalizeBoolean(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes')
        return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no')
        return false;
    return null;
}
function parseJson(value) {
    try {
        const parsed = JSON.parse(String(value || '').trim());
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        return null;
    }
}
function extractPaths(value, key = '') {
    if (typeof value === 'string') {
        return /(?:^|_)(?:path|root|cwd)$/i.test(key) || /(?:Path|Root|Cwd)$/.test(key) ? [value] : [];
    }
    if (Array.isArray(value))
        return value.flatMap(item => extractPaths(item));
    if (!value || typeof value !== 'object')
        return [];
    return Object.entries(value).flatMap(([childKey, child]) => extractPaths(child, childKey));
}
function isSameOrAncestor(candidate, projectRoot, platform) {
    const pathApi = platform === 'win32' ? path.win32 : path.posix;
    const resolvedCandidate = pathApi.resolve(candidate);
    const relative = pathApi.relative(resolvedCandidate, projectRoot);
    return relative === '' || (!relative.startsWith('..') && !pathApi.isAbsolute(relative));
}
function diagnosticSuffix(result) {
    const detail = result.error || result.stderr.trim();
    return detail ? ` (${detail.slice(0, 180)})` : '';
}
function extractOrcaWorktreePath(value) {
    const normalized = String(value || '').trim();
    const separator = normalized.indexOf('::');
    if (separator < 0 || separator + 2 >= normalized.length)
        return null;
    return normalized.slice(separator + 2).trim() || null;
}
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
function isValidCachedResolution(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return candidate.version === '1.0'
        && typeof candidate.target === 'string'
        && typeof candidate.blocked === 'boolean'
        && Array.isArray(candidate.fallbackOrder)
        && Array.isArray(candidate.candidates)
        && (candidate.selectedAdapterId === null || typeof candidate.selectedAdapterId === 'string');
}
function createRuntimeExecutionAdapterService() {
    return new RuntimeExecutionAdapterService();
}
