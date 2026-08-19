"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePathSafely = removePathSafely;
const fs_1 = require("fs");
async function removePathSafely(targetPath) {
    let stats;
    try {
        stats = await fs_1.promises.lstat(targetPath);
    }
    catch (error) {
        if (error?.code === 'ENOENT')
            return;
        throw error;
    }
    // The whole point: a link is unlinked, so only the link dies and never
    // whatever it points at. `fs.rm` on a directory symlink would otherwise be
    // asked to recurse, and a Windows junction reads as a directory.
    if (stats.isSymbolicLink()) {
        try {
            await fs_1.promises.unlink(targetPath);
        }
        catch (error) {
            const code = error?.code;
            // Windows directory symlinks and junctions need rmdir, not unlink.
            if (code === 'EPERM' || code === 'EISDIR') {
                await fs_1.promises.rmdir(targetPath);
                return;
            }
            throw error;
        }
        return;
    }
    await fs_1.promises.rm(targetPath, { recursive: true, force: true });
}
