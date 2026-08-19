"use strict";
/**
 * Tolerant `contract_version` parsing for task-graph documents.
 *
 * M-misc6: `graphContract.split('.').map(Number)` in three places, then
 * `Number.isFinite(contractMajor) && (major > 1 || (major === 1 && ...))`.
 * `Number('v1')` is `NaN`, so a `contract_version` of `v1.9.0` -- the spelling
 * every git tag in this repo uses -- made `requiresSerialReason` and
 * `requiresScopeReason` BOTH false, and the two schema checks they gate
 * silently stopped running. A graph missing a serial reason or a scope reason
 * passed validation because of a leading letter.
 *
 * The same applied to `1.9.0-rc.1`: the patch parsed as `NaN`, which is fine
 * at major 2 and silently wrong at exactly `1.8.x`.
 *
 * This is a deliberately small parser rather than the `semver` dependency,
 * because `src/tools/build-index.ts` carries the third copy and is built-ins
 * only -- `ospec update` copies it into the user's
 * `.ospec/tools/build-index-auto.cjs`, where no `require('semver')` resolves.
 * A duplicate held in step by a test beats a dependency one of the three
 * callers cannot have.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseContractVersion = parseContractVersion;
exports.contractVersionAtLeast = contractVersionAtLeast;
/**
 * `1`, `1.9`, `1.9.0`, ` v1.9.0 `, `1.9.0-rc.1`, `1.9.0+build` -> a version.
 * Anything with no leading number at all -> null, which every caller reads as
 * "no contract declared", the same as before.
 */
function parseContractVersion(raw) {
    const match = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(raw ?? ''));
    if (!match)
        return null;
    return {
        major: Number(match[1]),
        minor: match[2] === undefined ? 0 : Number(match[2]),
        patch: match[3] === undefined ? 0 : Number(match[3]),
    };
}
/** Whether `raw` parses to a version at or above `major.minor.patch`. */
function contractVersionAtLeast(raw, major, minor, patch) {
    const parsed = parseContractVersion(raw);
    if (!parsed)
        return false;
    if (parsed.major !== major)
        return parsed.major > major;
    if (parsed.minor !== minor)
        return parsed.minor > minor;
    return parsed.patch >= patch;
}
