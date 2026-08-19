"use strict";
/**
 * F7: environment hygiene for spawned child processes.
 *
 * A blanket `/KEY|SECRET|TOKEN|PASSWORD/i` strip breaks npm authentication --
 * `NODE_AUTH_TOKEN`, `NPM_TOKEN` and `npm_config__auth` all match the pattern
 * and all are load-bearing for a private-registry install. So the strip is
 * scoped by *spawn class* rather than applied to every child, and the allowlist
 * below is the written-down contract for what survives.
 *
 * The classification errs toward not stripping: an over-strip silently breaks a
 * user's package install, while an under-strip only leaves a variable visible to
 * a process this repo already trusts enough to launch.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHILD_ENV_ALLOWLIST = exports.SECRET_ENV_NAME_PATTERN = void 0;
exports.isSecretEnvName = isSecretEnvName;
exports.stripsSecrets = stripsSecrets;
exports.sanitizeChildEnv = sanitizeChildEnv;
exports.listStrippedEnvNames = listStrippedEnvNames;
/** The names F7 names. Matching is on the variable name, never the value. */
exports.SECRET_ENV_NAME_PATTERN = /KEY|SECRET|TOKEN|PASSWORD/i;
/**
 * Written down before the implementation, per F7. These survive the strip even
 * when their name matches the pattern above, because removing them breaks the
 * child rather than protecting anything.
 *
 * `PATH` and `HOME` are first by requirement; neither matches the pattern
 * today, and they are listed anyway so the guarantee does not depend on the
 * pattern staying as narrow as it is now.
 */
exports.CHILD_ENV_ALLOWLIST = [
    // Required by F7, on every platform.
    'PATH',
    'HOME',
    // POSIX essentials.
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'LOGNAME',
    'PWD',
    'SHELL',
    'SHLVL',
    'SSH_AUTH_SOCK',
    'TERM',
    'TMPDIR',
    'TZ',
    'USER',
    // Windows essentials. `ComSpec`, `PATHEXT` and `SystemRoot` in particular
    // are what `spawnSafe` resolves a command through; without them a Windows
    // child cannot be launched at all.
    'ALLUSERSPROFILE',
    'APPDATA',
    'COMPUTERNAME',
    'COMSPEC',
    'HOMEDRIVE',
    'HOMEPATH',
    'LOCALAPPDATA',
    'NUMBER_OF_PROCESSORS',
    'OS',
    'PATHEXT',
    'PROCESSOR_ARCHITECTURE',
    'PROCESSOR_IDENTIFIER',
    'PROGRAMDATA',
    'PROGRAMFILES',
    'PROGRAMFILES(X86)',
    'PROGRAMW6432',
    'PUBLIC',
    'SYSTEMDRIVE',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'USERDOMAIN',
    'USERNAME',
    'USERPROFILE',
    'WINDIR',
    // Node's own.
    'NODE',
    'NODE_OPTIONS',
    'NODE_PATH',
];
const ALLOWLIST = new Set(exports.CHILD_ENV_ALLOWLIST.map(name => name.toUpperCase()));
/** Classes that keep the environment they were given, verbatim. */
const NON_STRIPPING_CLASSES = new Set([
    'package-manager',
    'internal-tooling',
]);
function isSecretEnvName(name) {
    return exports.SECRET_ENV_NAME_PATTERN.test(name) && !ALLOWLIST.has(String(name).toUpperCase());
}
/** Whether a spawn of this class has its environment filtered at all. */
function stripsSecrets(spawnClass) {
    return !NON_STRIPPING_CLASSES.has(spawnClass);
}
/**
 * The environment to hand a child of `spawnClass`. Always returns a fresh
 * object, so a caller can never mutate `process.env` through the result.
 */
function sanitizeChildEnv(env = process.env, spawnClass = 'worker') {
    const source = env || {};
    const result = {};
    const strip = stripsSecrets(spawnClass);
    for (const name of Object.keys(source)) {
        const value = source[name];
        if (value === undefined)
            continue;
        if (strip && isSecretEnvName(name))
            continue;
        result[name] = value;
    }
    return result;
}
/** Names `sanitizeChildEnv` would drop. For diagnostics and for tests. */
function listStrippedEnvNames(env = process.env, spawnClass = 'worker') {
    if (!stripsSecrets(spawnClass))
        return [];
    return Object.keys(env || {}).filter(name => env[name] !== undefined && isSecretEnvName(name)).sort();
}
