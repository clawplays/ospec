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
exports.normalizeProjectLayout = normalizeProjectLayout;
exports.createDamagedConfigError = createDamagedConfigError;
exports.createContradictoryLayoutError = createContradictoryLayoutError;
exports.isDamagedConfigError = isDamagedConfigError;
exports.findNestedManagedMarker = findNestedManagedMarker;
exports.describeAbsentProjectLayout = describeAbsentProjectLayout;
exports.describeNonObjectConfig = describeNonObjectConfig;
exports.assertProjectConfigUsable = assertProjectConfigUsable;
exports.getProjectLayout = getProjectLayout;
exports.getProjectManagedRoot = getProjectManagedRoot;
exports.toManagedRelativePath = toManagedRelativePath;
exports.resolveManagedPath = resolveManagedPath;
exports.getChangeDir = getChangeDir;
exports.resolveManagedInputPath = resolveManagedInputPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const ROOT_VISIBLE_RELATIVE_PATHS = new Set([
    constants_1.FILE_NAMES.SKILLRC,
    constants_1.FILE_NAMES.README,
    '.ospec',
]);
function normalizeProjectLayout(input) {
    return input === 'nested' || input === 'classic' ? input : undefined;
}
/**
 * FIX-G1: this is the shared home of the `.skillrc` damage policy. It used to
 * live in `src/services/IndexBuilder.ts`, which meant only the two index
 * builders enforced it while `ConfigManager.loadConfig` -- the read every other
 * entry point goes through -- kept guessing. `ConfigManager` cannot import
 * `IndexBuilder` (that is the write path, not a util), so the policy moved down
 * here where both can reach it. `src/tools/build-index.ts` is deliberately
 * dependency-free (it is the standalone pre-commit bundle and imports nothing
 * from `src/`), so it still carries its own copy; the copies are asserted
 * byte-identical by `tests/services/p0-10-11-index-builder-cli-path.test.mjs`.
 */
function createDamagedConfigError(configPath, reason) {
    const error = new Error([
        `.skillrc is damaged and cannot be parsed: ${reason}`,
        `  file: ${configPath}`,
        '  recover with one of:',
        '    1. git checkout -- .skillrc            (restore the committed copy)',
        '    2. edit .skillrc and remove the merge-conflict markers or leading BOM',
        '    3. if .skillrc is a directory or another non-file, remove it and',
        '       restore the file in its place',
        '  then re-run this command. Rebuilding the index does not depend on a',
        '  readable SKILL.index.json, so "ospec index build" self-heals a damaged',
        '  index as soon as .skillrc parses again.',
    ].join('\n'));
    error.ospecDamagedConfig = true;
    return error;
}
/**
 * FIX-G1: a *missing* `projectLayout` on a project that is physically nested is
 * a different failure from a corrupted one, and the recovery steps for a
 * corrupted file ("remove the merge-conflict markers") are useless here -- the
 * file parses, it just does not say where this project keeps its documents.
 * Same `ospecDamagedConfig` marker so `runHookCheck` keeps swallowing it rather
 * than blocking every commit until the file is repaired.
 *
 * Kept byte-identical to `createContradictoryLayoutError` in
 * `src/tools/build-index.ts`.
 */
function createContradictoryLayoutError(configPath, reason) {
    const error = new Error([
        `.skillrc does not describe this project's layout: ${reason}`,
        `  file: ${configPath}`,
        '  recover with one of:',
        '    1. git checkout -- .skillrc            (restore the committed copy)',
        '    2. add "projectLayout": "nested" to .skillrc, if this project keeps',
        '       its documents under .ospec/ (that is what is on disk)',
        '    3. add "projectLayout": "classic" to .skillrc, if the .ospec/ tree is',
        '       stale and the project root is the real one',
        '  then re-run this command. Defaulting to "classic" is refused here',
        '  because it would write a second, divergent document tree into the',
        '  project root next to the .ospec/ one.',
    ].join('\n'));
    error.ospecDamagedConfig = true;
    return error;
}
function isDamagedConfigError(error) {
    return Boolean(error)
        && typeof error === 'object'
        && error.ospecDamagedConfig === true;
}
// F29: the two fields a rebuild cannot recover by looking around.
const VALID_PROJECT_LAYOUTS = ['nested', 'classic'];
const VALID_DOCUMENT_LANGUAGES = ['en-US', 'zh-CN', 'ja-JP', 'ar'];
/**
 * FIX-G1: the first on-disk marker proving this project physically keeps its
 * managed documents under `.ospec/`, or null. Named rather than boolean so the
 * error can quote the evidence.
 *
 * The list is the mirror image of `hasClassicManagedMarkers` in
 * `src/tools/build-index.ts` -- the paths that only ever exist because an
 * ospec-managed NESTED tree was written. `.ospec/tools`, `.ospec/plugins` and
 * `.ospec/cache` are deliberately absent: `FILE_NAMES.BUILD_INDEX_SCRIPT` is
 * `.ospec/tools/build-index-auto.cjs` and the default plugin `workspace_root`
 * is `.ospec/plugins/<name>` in BOTH layouts, so either one would report a
 * classic project as nested. The literals are spelled out rather than taken
 * from `FILE_NAMES` so this body stays byte-identical to the copy in
 * `src/tools/build-index.ts`, which imports nothing from `src/`.
 */
function findNestedManagedMarker(rootDir) {
    for (const relativePath of ['changes', 'for-ai', 'docs/project', 'knowledge', 'SKILL.md', 'SKILL.index.json']) {
        if (fs.existsSync(path.join(rootDir, '.ospec', ...relativePath.split('/')))) {
            return `.ospec/${relativePath}`;
        }
    }
    return null;
}
/**
 * FIX-G1: `projectLayout` ABSENT is not the same as `projectLayout` absent AND
 * a populated `.ospec/` tree sitting right there.
 *
 * F29 closed the corrupted-VALUE route and wrote "absent is fine (both have a
 * documented default)" into its own comment. That was wrong in exactly one
 * situation, and it is the situation the whole guard exists for: a `.skillrc`
 * that merely LOSES the layout line -- `{}`, or a config that kept
 * `documentLanguage` and dropped `projectLayout` -- still silently flipped a
 * nested project to classic, exit 0, no warning, and wrote 12 root-level paths
 * (`ospec index build`) / 4 (`build-index`) next to the real `.ospec` tree.
 * That is the identical damage F29's own comment describes, one level out.
 *
 * From the config alone "absent" is genuinely ambiguous -- a real classic
 * project legitimately has no `projectLayout`. From the FILESYSTEM it is not
 * ambiguous at all, so the layout is detected from disk and the CONTRADICTION
 * is what fails: absent + no nested tree keeps the documented classic default
 * (nothing changes for real classic projects, including pre-`projectLayout`
 * legacy ones), absent + a nested tree refuses.
 *
 * An EXPLICIT `"projectLayout": "classic"` is deliberately still honoured even
 * with a nested tree present: that is a user statement, not a guess, and it is
 * the only way to walk back a half-finished `ospec layout migrate`.
 *
 * Kept byte-identical to `describeAbsentProjectLayout` in
 * `src/tools/build-index.ts`.
 */
function describeAbsentProjectLayout(config, rootDir) {
    if (!config || typeof config !== 'object' || Array.isArray(config))
        return null;
    const record = config;
    const declared = Object.prototype.hasOwnProperty.call(record, 'projectLayout')
        ? record.projectLayout
        : undefined;
    if (declared !== undefined)
        return null;
    const marker = findNestedManagedMarker(rootDir);
    if (!marker)
        return null;
    return `projectLayout is absent, but ${marker} exists, so this project physically keeps its documents under .ospec/ and defaulting to "classic" would write a second document tree into the project root`;
}
/**
 * A `.skillrc` that parses but is not a JSON object -- or whose layout /
 * language field is not one of the values that field is allowed to take -- is
 * damage, not a config.
 *
 * F23: `getProjectLayout` accepts a bare `ProjectLayout` string as well as a
 * config object -- internal callers legitimately hand it an already-resolved
 * layout -- so a `.skillrc` whose entire content is the JSON string `"nested"`
 * was read by `IndexBuilder.ts` as *the layout* and by `build-index.ts` as a
 * config with no `projectLayout` at all. Same file, same damage, two different
 * layouts, silently, which is exactly the wrong-layout data loss P0-10 exists
 * to close. The parse boundary is the only place that can tell a config from a
 * layout, so it is where the shape is enforced: anything that is not a plain
 * object takes the same fail-loud path as unparseable JSON.
 *
 * F29: guarding the CONTAINER was not enough. `{"projectLayout": null}`,
 * `{"projectLayout": 123}`, `{"projectLayout": ["nested"]}` and a one-character
 * typo `{"projectLayout": "nsted"}` are all valid objects, so they walked past
 * the F23 gate -- and `normalizeProjectLayout(input) || 'classic'` then treated
 * "damaged" as "absent" and silently flipped a NESTED project to classic.
 * `documentLanguage` has the same property one level down: an unrecognized
 * value silently rewrites every archived knowledge document on a zh-CN /
 * ja-JP / ar project into English. A field that decides where data is written
 * may not be guessed at, so an unrecognized value is damage and takes the
 * identical fail-loud path.
 *
 * Kept byte-identical to `describeNonObjectConfig` in
 * `src/tools/build-index.ts`; `tests/services/p0-10-*` asserts both entry
 * points still emit the same message for every damage shape.
 */
function describeNonObjectConfig(value) {
    if (value === null)
        return 'not a JSON object (got null)';
    if (Array.isArray(value))
        return 'not a JSON object (got an array)';
    if (typeof value !== 'object')
        return `not a JSON object (got a ${typeof value})`;
    return describeUnrecognizedConfigField(value, 'projectLayout', VALID_PROJECT_LAYOUTS)
        || describeUnrecognizedConfigField(value, 'documentLanguage', VALID_DOCUMENT_LANGUAGES);
}
/**
 * Kept byte-identical to `describeUnrecognizedConfigField` in
 * `src/tools/build-index.ts`.
 */
function describeUnrecognizedConfigField(config, field, allowed) {
    if (!Object.prototype.hasOwnProperty.call(config, field))
        return null;
    const value = config[field];
    if (value === undefined)
        return null;
    if (typeof value === 'string' && allowed.includes(value))
        return null;
    const shown = typeof value === 'string'
        ? JSON.stringify(value)
        : value === null
            ? 'null'
            : Array.isArray(value)
                ? 'an array'
                : typeof value === 'object'
                    ? 'an object'
                    : `a ${typeof value}`;
    return `${field} is ${shown}, which is not one of ${allowed.map(option => JSON.stringify(option)).join(', ')}`;
}
/**
 * FIX-G1: the single gate every `.skillrc` read passes through before the
 * parsed value is allowed to decide where anything is written. It throws, and
 * the throw is the point -- the previous shape of this bug was always some
 * caller turning a failed/degraded config read into `null` or `{}` and then
 * carrying on to write files.
 *
 * Returns the value so a caller can write `const config = assert...(...)`.
 * `onDamage` is the index builders' build-warning sink -- they say the damage
 * out loud as well as throwing, so it is visible even where the throw is
 * caught (`runHookCheck`).
 */
function assertProjectConfigUsable(rootDir, configPath, value, onDamage) {
    const shapeReason = describeNonObjectConfig(value);
    if (shapeReason) {
        onDamage?.(shapeReason);
        throw createDamagedConfigError(configPath, shapeReason);
    }
    const layoutReason = describeAbsentProjectLayout(value, rootDir);
    if (layoutReason) {
        onDamage?.(layoutReason);
        throw createContradictoryLayoutError(configPath, layoutReason);
    }
    return value;
}
function getProjectLayout(input) {
    if (typeof input === 'string') {
        return normalizeProjectLayout(input) || 'classic';
    }
    return normalizeProjectLayout(input?.projectLayout) || 'classic';
}
function getProjectManagedRoot(rootDir, input) {
    const layout = getProjectLayout(input);
    return layout === 'nested' ? path.join(rootDir, '.ospec') : rootDir;
}
function toManagedRelativePath(relativePath, input) {
    const normalizedRelativePath = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
    if (!normalizedRelativePath) {
        return normalizedRelativePath;
    }
    const layout = getProjectLayout(input);
    if (layout !== 'nested' ||
        ROOT_VISIBLE_RELATIVE_PATHS.has(normalizedRelativePath) ||
        normalizedRelativePath.startsWith('.ospec/')) {
        return normalizedRelativePath;
    }
    return path.posix.join('.ospec', normalizedRelativePath);
}
function resolveManagedPath(rootDir, relativePath, input) {
    return path.join(rootDir, ...toManagedRelativePath(relativePath, input).split('/'));
}
function getChangeDir(rootDir, bucket, featureName, input) {
    return resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${bucket}/${featureName}`, input);
}
function resolveManagedInputPath(rootDir, candidatePath, input) {
    const layout = getProjectLayout(input);
    const resolvedCandidatePath = path.isAbsolute(candidatePath)
        ? candidatePath
        : path.resolve(rootDir, candidatePath);
    if (layout !== 'nested' || fs.existsSync(resolvedCandidatePath)) {
        return resolvedCandidatePath;
    }
    const normalizedCandidatePath = String(candidatePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
    if (normalizedCandidatePath.startsWith('changes/') ||
        normalizedCandidatePath.startsWith('for-ai/') ||
        normalizedCandidatePath.startsWith('knowledge/') ||
        normalizedCandidatePath.startsWith('docs/') ||
        normalizedCandidatePath.startsWith('src/') ||
        normalizedCandidatePath.startsWith('tests/') ||
        normalizedCandidatePath === constants_1.FILE_NAMES.SKILL_MD ||
        normalizedCandidatePath === constants_1.FILE_NAMES.SKILL_INDEX) {
        return resolveManagedPath(rootDir, normalizedCandidatePath, layout);
    }
    return resolvedCandidatePath;
}
