/**
 * F7: every delete-class operation goes through an `lstat` check first.
 *
 * P0-9 built the same guard for the release scripts
 * (`scripts/export-release-repo.js#removePathSafely`). That copy is not
 * reusable from here and this one is not reusable from there:
 *
 * - `src/` cannot import `scripts/`: `package.json#files` publishes `dist/**`
 *   and exactly one script (`scripts/postinstall.js`), so an installed CLI
 *   would find no such module.
 * - `scripts/` importing `dist/` inverts the direction
 *   `scripts/verify-dist-runtime-closure.js` exists to pin, and the release
 *   scripts must run against a checkout whose `dist/` may be mid-rebuild.
 *
 * So the *rule* is shared and the code is not, and
 * `tests/services/p5c-symlink-delete-guard.test.mjs` pins both copies against
 * the same behaviour so they cannot drift apart silently.
 */
export declare function removePathSafely(targetPath: string): Promise<void>;
