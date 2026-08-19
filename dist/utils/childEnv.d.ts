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
/**
 * - `worker` / `verification`: commands run on behalf of a change. These strip.
 *   Nothing in `src/` is in this class today -- Phase P and Phase 4 removed
 *   every worker and verification spawn -- so the class exists for the spawn
 *   sites that route through here next, and is the fail-closed default.
 * - `package-manager`: npm/yarn/pnpm. Never strips; registry auth must survive.
 * - `internal-tooling`: this repo's own `git` queries. Never strips; `git`
 *   reads credentials through helpers and `GIT_ASKPASS`, and pulling a variable
 *   out from under a credential helper would break a private-remote fetch to
 *   guard against a leak a local `rev-parse` cannot produce.
 */
export type ChildSpawnClass = 'worker' | 'verification' | 'package-manager' | 'internal-tooling';
/** The names F7 names. Matching is on the variable name, never the value. */
export declare const SECRET_ENV_NAME_PATTERN: RegExp;
/**
 * Written down before the implementation, per F7. These survive the strip even
 * when their name matches the pattern above, because removing them breaks the
 * child rather than protecting anything.
 *
 * `PATH` and `HOME` are first by requirement; neither matches the pattern
 * today, and they are listed anyway so the guarantee does not depend on the
 * pattern staying as narrow as it is now.
 */
export declare const CHILD_ENV_ALLOWLIST: readonly string[];
export declare function isSecretEnvName(name: string): boolean;
/** Whether a spawn of this class has its environment filtered at all. */
export declare function stripsSecrets(spawnClass: ChildSpawnClass): boolean;
/**
 * The environment to hand a child of `spawnClass`. Always returns a fresh
 * object, so a caller can never mutate `process.env` through the result.
 */
export declare function sanitizeChildEnv(env?: NodeJS.ProcessEnv, spawnClass?: ChildSpawnClass): NodeJS.ProcessEnv;
/** Names `sanitizeChildEnv` would drop. For diagnostics and for tests. */
export declare function listStrippedEnvNames(env?: NodeJS.ProcessEnv, spawnClass?: ChildSpawnClass): string[];
