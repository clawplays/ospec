"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBatchTarget = isBatchTarget;
exports.escapeCommandForCmd = escapeCommandForCmd;
exports.quoteForCmd = quoteForCmd;
exports.resolveWindowsCommandFile = resolveWindowsCommandFile;
exports.composeWindowsCommandLine = composeWindowsCommandLine;
exports.createSpawnSafeSpec = createSpawnSafeSpec;
exports.createSpawnSyncSafeSpec = createSpawnSyncSafeSpec;
exports.spawnSafe = spawnSafe;
exports.spawnSyncSafe = spawnSyncSafe;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** cross-spawn's metacharacter set (`lib/util/escape.js`). */
const CMD_META_CHARACTERS = /([()\][%!^"`<>&|;, *?])/g;
/**
 * `.bat` / `.cmd` targets hand `%*` back to cmd.exe, so every argument is parsed
 * a second time. Metacharacters therefore need a second escape pass for those
 * targets and only those targets (CVE-2024-27980 / "BatBadBut").
 */
const BATCH_TARGET_PATTERN = /\.(?:bat|cmd)$/i;
/**
 * Targets CreateProcess can launch on its own. cross-spawn skips the cmd.exe
 * wrapper for these, which keeps the process tree flat and keeps the arguments
 * away from cmd's parser entirely.
 */
const DIRECTLY_EXECUTABLE_PATTERN = /\.(?:com|exe)$/i;
const DEFAULT_PATH_EXTENSIONS = '.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC';
/** True when cmd.exe will re-parse this target's arguments a second time. */
function isBatchTarget(command) {
    return BATCH_TARGET_PATTERN.test(String(command || ''));
}
/** cross-spawn's `escape.command`: escape metacharacters, do not quote. */
function escapeCommandForCmd(command) {
    return String(command).replace(CMD_META_CHARACTERS, '^$1');
}
/**
 * cross-spawn's `escape.argument`.
 *
 * The two backslash rules are the CommandLineToArgvW rules: a run of
 * backslashes is only special when it is followed by a double quote, either a
 * literal one or the closing quote this function adds. In both cases the whole
 * run must be doubled.
 */
function quoteForCmd(value, doubleEscapeMetaCharacters = false) {
    let quoted = String(value);
    // A run of backslashes followed by a double quote: double the run, escape the quote.
    quoted = quoted.replace(/(\\*)"/g, '$1$1\\"');
    // A run of backslashes at the end of the value: the closing quote follows it, so double the run.
    quoted = quoted.replace(/(\\*)$/, '$1$1');
    quoted = `"${quoted}"`.replace(CMD_META_CHARACTERS, '^$1');
    if (doubleEscapeMetaCharacters) {
        quoted = quoted.replace(CMD_META_CHARACTERS, '^$1');
    }
    return quoted;
}
function readEnvValue(env, name) {
    if (!env) {
        return '';
    }
    const upper = env[name.toUpperCase()];
    if (typeof upper === 'string' && upper.length > 0) {
        return upper;
    }
    const capitalized = env[`${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`];
    if (typeof capitalized === 'string' && capitalized.length > 0) {
        return capitalized;
    }
    const lower = env[name.toLowerCase()];
    return typeof lower === 'string' ? lower : '';
}
function listPathExtensions(env) {
    const raw = readEnvValue(env, 'PATHEXT') || readEnvValue(process.env, 'PATHEXT') || DEFAULT_PATH_EXTENSIONS;
    return raw
        .split(';')
        .map(entry => entry.trim())
        .filter(Boolean);
}
function isExistingFile(candidate) {
    try {
        return fs_1.default.statSync(candidate).isFile();
    }
    catch {
        return false;
    }
}
function resolveInDirectory(directory, base, extensions) {
    if (path_1.default.extname(base)) {
        const direct = path_1.default.join(directory, base);
        if (isExistingFile(direct)) {
            return direct;
        }
    }
    for (const extension of extensions) {
        const candidate = path_1.default.join(directory, `${base}${extension}`);
        if (isExistingFile(candidate)) {
            return candidate;
        }
    }
    return '';
}
/**
 * Resolve what cmd.exe would actually launch for `command`, so the caller can
 * tell a batch shim from a real executable. Mirrors cmd's own lookup: the
 * working directory first, then PATH, each probed with PATHEXT.
 *
 * Returns '' when nothing matches. Callers must treat that as "not a batch
 * file": cmd builtins and app-execution aliases resolve to nothing here and
 * none of them re-parse `%*`, while a genuinely missing command fails to start
 * either way.
 */
function resolveWindowsCommandFile(command, env = process.env, cwd) {
    const raw = String(command || '');
    if (!raw) {
        return '';
    }
    const extensions = listPathExtensions(env || process.env);
    if (raw.includes('/') || raw.includes('\\')) {
        const base = path_1.default.basename(raw);
        const directory = path_1.default.dirname(raw);
        return resolveInDirectory(directory, base, extensions);
    }
    const searchPath = readEnvValue(env || process.env, 'PATH') || readEnvValue(process.env, 'PATH');
    const directories = [];
    if (typeof cwd === 'string' && cwd.length > 0) {
        directories.push(cwd);
    }
    for (const entry of searchPath.split(';')) {
        const trimmed = entry.trim().replace(/^"(.*)"$/, '$1');
        if (trimmed) {
            directories.push(trimmed);
        }
    }
    for (const directory of directories) {
        const resolved = resolveInDirectory(directory, raw, extensions);
        if (resolved) {
            return resolved;
        }
    }
    return '';
}
/**
 * Build the single `cmd /d /s /c "..."` argument. `doubleEscapeMetaCharacters`
 * defaults to whatever `command` itself looks like; pass it explicitly when the
 * caller has resolved the target through PATH/PATHEXT and knows better.
 */
function composeWindowsCommandLine(command, args = [], doubleEscapeMetaCharacters = isBatchTarget(command)) {
    const escapedCommand = escapeCommandForCmd(command);
    const escapedArgs = args.map(argument => quoteForCmd(argument, doubleEscapeMetaCharacters));
    return `"${[escapedCommand, ...escapedArgs].join(' ')}"`;
}
function toCwdString(cwd) {
    return typeof cwd === 'string' ? cwd : '';
}
function createSpawnSafeSpec(command, args = [], options = {}, platform = process.platform) {
    // A caller that explicitly asked for a shell owns its own quoting; honour it
    // instead of silently overriding the request.
    if (options.shell) {
        return {
            command,
            args: [...args],
            options: { ...options },
        };
    }
    if (platform !== 'win32') {
        return {
            command,
            args: [...args],
            options: { ...options, shell: false },
        };
    }
    const commandFile = resolveWindowsCommandFile(command, options.env || process.env, toCwdString(options.cwd)) || command;
    if (DIRECTLY_EXECUTABLE_PATTERN.test(commandFile)) {
        // CreateProcess can launch this directly, so Node's own argument escaping
        // applies and cmd.exe never sees the arguments.
        return {
            command,
            args: [...args],
            options: { ...options, shell: false },
        };
    }
    return {
        command: process.env.ComSpec || 'cmd.exe',
        args: ['/d', '/s', '/c', composeWindowsCommandLine(command, args, isBatchTarget(commandFile))],
        options: {
            ...options,
            shell: false,
            windowsVerbatimArguments: true,
        },
    };
}
function createSpawnSyncSafeSpec(command, args = [], options, platform = process.platform) {
    const spec = createSpawnSafeSpec(command, args, options, platform);
    return {
        command: spec.command,
        args: spec.args,
        options: spec.options,
    };
}
function spawnSafe(command, args = [], options = {}) {
    const spec = createSpawnSafeSpec(command, args, options);
    return (0, child_process_1.spawn)(spec.command, spec.args, spec.options);
}
function spawnSyncSafe(command, args = [], options) {
    const spec = createSpawnSyncSafeSpec(command, args, options);
    return (0, child_process_1.spawnSync)(spec.command, spec.args, spec.options);
}
