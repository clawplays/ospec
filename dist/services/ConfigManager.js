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
exports.ConfigManager = void 0;
exports.resetForwardCompatWarnings = resetForwardCompatWarnings;
exports.createConfigManager = createConfigManager;
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const constants_1 = require("../core/constants");
const errors_1 = require("../core/errors");
const ConfigurableWorkflow_1 = require("../workflow/ConfigurableWorkflow");
const ProjectLayout_1 = require("../utils/ProjectLayout");
/*
 * M-cfg1: the `.skillrc` `workflow` block is a closed vocabulary, and every key
 * in it is a setting a user expects to see take effect.
 *
 * Two independent defects lived in the old normaliser, and they compounded:
 *
 *  1. NOTHING was deep-merged. `archive_gate`, `optional_steps` and
 *     `feature_flags` were each REPLACED wholesale by whatever object the user
 *     wrote, so `archive_gate: { require_verification: false }` did not mean
 *     "relax one gate" -- it meant "and make the other three `undefined`",
 *     which `ArchiveGate` then reads as falsey and skips. Worse, the merge ran
 *     only on the `!Array.isArray(core_required)` branch: the moment a user
 *     listed their own `core_required`, the function returned their raw
 *     `workflow` object verbatim and `archive_gate`, `optional_steps` and
 *     `feature_flags` vanished entirely.
 *  2. Unknown keys were silently dropped. `optional:` instead of
 *     `optional_steps:`, or a `model_profiles` entry named `unsupported`, cost
 *     the user nothing at parse time and did nothing at run time. That is the
 *     failure mode this item exists to end: a user staring at a setting that
 *     has no effect and no diagnostic.
 *
 * The vocabulary below is the fail-loud gate. It is deliberately scoped to the
 * `workflow` subtree: top-level `.skillrc` keys still pass through the
 * `...rest` spread in `normalizeConfig`, because that spread is what preserves
 * forward-compatible fields written by a newer CLI.
 *
 * ---------------------------------------------------------------------------
 * MAJOR-4: how a typo is told apart from forward compatibility
 * ---------------------------------------------------------------------------
 *
 * M-cfg1 closed the silent-drop hole and, in doing so, closed forward
 * compatibility inside `workflow` as well. Three of the four scopes it gates
 * (`optional_steps`, `model_profiles`, and `workflow` itself) are NAME-spaces a
 * future release is expected to extend, so a `.skillrc` written by a newer
 * ospec made an older one throw from `loadConfig` AND from `loadConfigOrNull`
 * -- and because the project-root discovery walk goes through
 * `loadConfigOrNull`, that meant failing every command that resolves a project,
 * not just the archive gate.
 *
 * The rule now is:
 *
 *   An unknown key inside `workflow` is a TYPO -- and throws -- unless the file
 *   declares a `version` this CLI does not know, in which case it is FORWARD
 *   COMPATIBILITY: tolerated, PRESERVED, and warned about once.
 *
 * Why this rule and not a heuristic. The tempting alternative is to guess from
 * the shape of the key -- edit distance to a known one, a naming convention --
 * and every version of that guess is wrong for some real input: `require_skill`
 * is one character from `require_skill_update` and is also exactly what a
 * future gate flag would be called. Version gating is decidable, needs no
 * guessing, and puts the obligation where it can actually be met: a release
 * that adds a `workflow` key must bump `version`, and then every older client
 * reads its config. That obligation was the thing the reviewers observed
 * nothing in the tree recorded; it is now a property of the format.
 *
 * M-cfg1's value is kept intact. A config at a version this CLI knows -- which
 * is every config in the wild today, and every config a user hand-edits -- still
 * fails loud on an unknown key, still names the offender, and still lists the
 * vocabulary. What changed is only the case M-cfg1 never intended to cover.
 *
 * Tolerated does not mean ignored: an unknown key is copied through to the
 * normalised config so that a later `saveConfig` round-trips it rather than
 * deleting a newer release's setting, and a warning naming every tolerated key
 * goes to stderr once per file per process. A silently-ignored setting is still
 * a bug, in this direction too.
 *
 * `loadConfigOrNull` therefore keeps rethrowing `ConfigError`: with the forward
 * case no longer throwing, everything that still throws is a genuine typo, and
 * degrading that to `null` would put the silent drop straight back.
 */
/**
 * The newest `.skillrc` schema version this CLI understands. A file declaring
 * anything higher is from the future, and its unknown `workflow` keys are
 * tolerated rather than refused.
 */
const CONFIG_SCHEMA_VERSION = '4.0';
/**
 * True when `version` names a schema newer than this CLI's.
 *
 * Compared field by field as integers, so `4.10` is newer than `4.9` -- a
 * lexicographic compare gets that backwards. Anything unparseable is NOT
 * treated as newer: an unknown-shaped version is far more likely to be a
 * damaged file than a message from the future, and treating it as the future
 * would disable the typo gate for exactly the files that most need it.
 */
function isFutureSchemaVersion(version) {
    if (typeof version !== 'string')
        return false;
    const parse = (value) => {
        const trimmed = value.trim();
        if (!/^\d+(?:\.\d+)*$/.test(trimmed))
            return null;
        return trimmed.split('.').map(part => Number.parseInt(part, 10));
    };
    const declared = parse(version);
    const known = parse(CONFIG_SCHEMA_VERSION);
    if (!declared || !known)
        return false;
    for (let index = 0; index < Math.max(declared.length, known.length); index += 1) {
        const left = declared[index] ?? 0;
        const right = known[index] ?? 0;
        if (left !== right)
            return right < left;
    }
    return false;
}
/** Only the entries of `value` whose keys are in `keys`. */
function pickKeys(value, keys) {
    return Object.fromEntries(keys.map(key => [key, value[key]]));
}
/**
 * Already-warned (version, keys) pairs.
 *
 * `loadConfig` is called many times per command and its cache is per
 * ConfigManager, so without this the warning would repeat. Keyed on the content
 * of the warning rather than on a file path so that two different projects with
 * different future keys each get told once.
 */
const warnedForwardKeys = new Set();
/**
 * Tell the user, once, that this CLI is reading a config from a newer ospec and
 * which keys it did not act on.
 *
 * Tolerating a key silently would be the same defect M-cfg1 exists to end,
 * pointed the other way: the user would have a setting that has no effect and
 * no diagnostic. The difference is that here the remedy is "upgrade", not "fix
 * your typo", so it is a warning on stderr rather than a thrown error -- the
 * command can still do useful work.
 */
function warnAboutToleratedKeys(version, forward) {
    if (forward.tolerated.length === 0)
        return;
    const keys = [...forward.tolerated].sort();
    const signature = `${String(version)}::${keys.join(',')}`;
    if (warnedForwardKeys.has(signature))
        return;
    warnedForwardKeys.add(signature);
    console.warn(`[ospec] .skillrc declares version ${String(version)}, which is newer than this CLI understands `
        + `(${CONFIG_SCHEMA_VERSION}). These settings were preserved but NOT applied: ${keys.join(', ')}. `
        + 'Upgrade ospec to use them.');
}
/** Test seam: forget which forward-compat warnings have been emitted. */
function resetForwardCompatWarnings() {
    warnedForwardKeys.clear();
}
const WORKFLOW_KEYS = ['archive_gate', 'core_required', 'feature_flags', 'model_profiles', 'optional_steps'];
const ARCHIVE_GATE_KEYS = ['require_index_regenerated', 'require_optional_steps_passed', 'require_skill_update', 'require_verification'];
const FEATURE_FLAGS_KEYS = ['supported'];
const OPTIONAL_STEP_NAMES = [
    'adr', 'api_change_doc', 'code_review', 'db_change_doc', 'design_doc',
    'plan_doc', 'root_cause_debug', 'security_review', 'tdd_cycle', 'verification_evidence',
];
const OPTIONAL_STEP_KEYS = ['enabled', 'when'];
const MODEL_PROFILE_NAMES = ['final_review', 'mechanical', 'review', 'standard', 'strong_reasoning'];
const MODEL_PROFILE_KEYS = ['default', 'targets'];
/**
 * Throws a `ConfigError` naming every unknown key and what was allowed -- or,
 * when the file declares a schema version this CLI does not know, records them
 * as tolerated and RETURNS them so the caller can preserve them.
 *
 * See the MAJOR-4 note in the header for why the verdict hangs on the declared
 * version rather than on the shape of the key.
 */
function assertKnownKeys(value, allowed, scope, gate) {
    const unknown = Object.keys(value).filter(key => !allowed.includes(key)).sort();
    if (unknown.length === 0)
        return [];
    if (gate.future) {
        gate.tolerated.push(...unknown.map(key => `${scope}.${key}`));
        return unknown;
    }
    throw new errors_1.ConfigError(`.skillrc ${scope} has unknown key${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}. `
        + `Known keys: ${[...allowed].sort().join(', ')}.`, { scope, unknown, known: [...allowed].sort() });
}
/** A plain object, or `undefined` for anything that cannot carry keys. */
function asPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : undefined;
}
/**
 * A `.skillrc` gate flag. Only a real boolean is accepted: `"false"` is a
 * truthy string, and letting it through is the same silent-no-effect defect
 * the unknown-key gate above exists to stop.
 */
function requireBoolean(value, scope, fallback) {
    if (value === undefined)
        return fallback;
    if (typeof value !== 'boolean') {
        throw new errors_1.ConfigError(`.skillrc ${scope} must be true or false, not ${JSON.stringify(value)}.`, { scope, value });
    }
    return value;
}
function normalizeArchiveGate(preset, raw, forward) {
    const gate = asPlainObject(raw);
    if (raw !== undefined && !gate) {
        throw new errors_1.ConfigError('.skillrc workflow.archive_gate must be an object.', { scope: 'workflow.archive_gate' });
    }
    if (!gate)
        return { ...preset };
    const tolerated = assertKnownKeys(gate, ARCHIVE_GATE_KEYS, 'workflow.archive_gate', forward);
    // Deep merge: an absent flag keeps the preset's value instead of becoming
    // `undefined`. This is the whole point of the item.
    return {
        // A future release's gate flag is carried through untouched. This CLI
        // cannot enforce it -- it does not know what it means -- but dropping it
        // would delete the setting on the next `saveConfig`.
        ...pickKeys(gate, tolerated),
        ...Object.fromEntries(ARCHIVE_GATE_KEYS.map(key => [
            key,
            requireBoolean(gate[key], `workflow.archive_gate.${key}`, preset[key]),
        ])),
    };
}
function normalizeOptionalSteps(preset, raw, forward) {
    const steps = asPlainObject(raw);
    if (raw !== undefined && !steps) {
        throw new errors_1.ConfigError('.skillrc workflow.optional_steps must be an object.', { scope: 'workflow.optional_steps' });
    }
    if (!steps)
        return structuredClone(preset);
    const toleratedNames = assertKnownKeys(steps, OPTIONAL_STEP_NAMES, 'workflow.optional_steps', forward);
    const merged = structuredClone(preset);
    for (const [name, value] of Object.entries(steps)) {
        // A step name this CLI does not know: it has no preset to merge into and
        // no `enabled`/`when` semantics here, so it is carried through verbatim
        // rather than validated against a vocabulary that does not describe it.
        if (toleratedNames.includes(name)) {
            merged[name] = structuredClone(value);
            continue;
        }
        const step = asPlainObject(value);
        if (!step) {
            throw new errors_1.ConfigError(`.skillrc workflow.optional_steps.${name} must be an object.`, { scope: `workflow.optional_steps.${name}` });
        }
        const toleratedKeys = assertKnownKeys(step, OPTIONAL_STEP_KEYS, `workflow.optional_steps.${name}`, forward);
        merged[name] = {
            ...pickKeys(step, toleratedKeys),
            enabled: requireBoolean(step.enabled, `workflow.optional_steps.${name}.enabled`, merged[name].enabled),
            // `when` is a list, so a supplied list replaces rather than merges:
            // a user narrowing the triggers must be able to narrow them.
            when: step.when === undefined
                ? merged[name].when
                : normalizeStringList(step.when, `workflow.optional_steps.${name}.when`),
        };
    }
    return merged;
}
function normalizeStringList(value, scope) {
    if (!Array.isArray(value)) {
        throw new errors_1.ConfigError(`.skillrc ${scope} must be an array of strings.`, { scope, value });
    }
    return value.map(item => String(item).trim()).filter(item => item.length > 0);
}
function normalizeFeatureFlags(preset, raw, forward) {
    const flags = asPlainObject(raw);
    if (raw !== undefined && !flags) {
        throw new errors_1.ConfigError('.skillrc workflow.feature_flags must be an object.', { scope: 'workflow.feature_flags' });
    }
    if (!flags)
        return { supported: [...preset.supported] };
    const tolerated = assertKnownKeys(flags, FEATURE_FLAGS_KEYS, 'workflow.feature_flags', forward);
    return {
        ...pickKeys(flags, tolerated),
        supported: flags.supported === undefined
            ? [...preset.supported]
            : normalizeStringList(flags.supported, 'workflow.feature_flags.supported'),
    };
}
function normalizeModelProfiles(raw, forward) {
    const profiles = asPlainObject(raw);
    if (raw !== undefined && !profiles) {
        throw new errors_1.ConfigError('.skillrc workflow.model_profiles must be an object.', { scope: 'workflow.model_profiles' });
    }
    if (!profiles)
        return {};
    const toleratedNames = assertKnownKeys(profiles, MODEL_PROFILE_NAMES, 'workflow.model_profiles', forward);
    return Object.fromEntries(Object.entries(profiles).map(([profile, value]) => {
        // A profile name from a newer release: carried through verbatim, for the
        // same reason an unknown optional step is.
        if (toleratedNames.includes(profile)) {
            return [profile, structuredClone(value)];
        }
        const entry = asPlainObject(value);
        if (!entry) {
            throw new errors_1.ConfigError(`.skillrc workflow.model_profiles.${profile} must be an object.`, { scope: `workflow.model_profiles.${profile}` });
        }
        const toleratedKeys = assertKnownKeys(entry, MODEL_PROFILE_KEYS, `workflow.model_profiles.${profile}`, forward);
        // Target names are harness identifiers, not a closed vocabulary, so
        // they are normalised rather than gated; blank entries are dropped.
        const targets = asPlainObject(entry.targets)
            ? Object.fromEntries(Object.entries(entry.targets)
                .map(([target, model]) => [String(target).trim(), String(model ?? '').trim()])
                .filter(([target, model]) => target.length > 0 && model.length > 0))
            : {};
        const defaultModel = typeof entry.default === 'string' ? entry.default.trim() : '';
        return [profile, {
                ...pickKeys(entry, toleratedKeys),
                ...(defaultModel ? { default: defaultModel } : {}),
                ...(Object.keys(targets).length > 0 ? { targets } : {}),
            }];
    }));
}
/**
 * `core_required` is a list, so a supplied list replaces the preset's. The
 * legacy migration below is unchanged: a graph that still names both
 * pre-2.0 review steps collapses them into the single `final_review`.
 */
function normalizeCoreRequired(preset, raw) {
    if (raw === undefined)
        return [...preset];
    const coreRequired = normalizeStringList(raw, 'workflow.core_required');
    const legacyReviewSteps = ['spec_compliance_review', 'code_quality_review'];
    if (!legacyReviewSteps.every(step => coreRequired.includes(step))) {
        return coreRequired;
    }
    const firstLegacyReview = Math.min(...legacyReviewSteps.map(step => coreRequired.indexOf(step)));
    const withoutLegacyReviews = coreRequired.filter(step => !legacyReviewSteps.includes(step));
    if (!withoutLegacyReviews.includes('final_review')) {
        withoutLegacyReviews.splice(firstLegacyReview, 0, 'final_review');
    }
    return withoutLegacyReviews;
}
function normalizeWorkflowConfig(workflow, mode, forward) {
    /*
     * The result is always a fresh object graph. The old code returned the
     * module-level `WORKFLOW_PRESETS[mode]` object itself on the absent-block
     * path, and `loadConfig` documents that "callers mutate what they get
     * back" -- so one caller assigning to `config.workflow.core_required`
     * rewrote the preset for every later reader in the process.
     */
    const preset = ConfigurableWorkflow_1.WORKFLOW_PRESETS[mode] || ConfigurableWorkflow_1.WORKFLOW_PRESETS.full;
    const block = asPlainObject(workflow);
    if (!block) {
        return structuredClone(preset);
    }
    const tolerated = assertKnownKeys(block, WORKFLOW_KEYS, 'workflow', forward);
    return {
        // A whole subtree this CLI has no normaliser for. Preserved so it
        // survives a load/save round trip by an older client.
        ...pickKeys(block, tolerated),
        core_required: normalizeCoreRequired(preset.core_required, block.core_required),
        optional_steps: normalizeOptionalSteps(preset.optional_steps, block.optional_steps, forward),
        archive_gate: normalizeArchiveGate(preset.archive_gate, block.archive_gate, forward),
        feature_flags: normalizeFeatureFlags(preset.feature_flags, block.feature_flags, forward),
        model_profiles: normalizeModelProfiles(block.model_profiles, forward),
    };
}
class ConfigManager {
    constructor(fileService) {
        /**
         * S3: `.skillrc` parse cache, keyed by absolute config path.
         *
         * `loadConfig` was the single hottest read in the CLI -- `ProjectService`
         * calls it per document definition, per skill file, per docs directory and
         * per module scan, so one `ospec status` re-read and re-normalised the same
         * ~3 KB file 26 times. The cache is per-process and per-instance only;
         * nothing is written to disk, so there is no cache file to go stale,
         * corrupt, or disagree with another process.
         *
         * Invalidation has two independent layers, and either one alone is enough:
         *  1. every `loadConfig` reads the file and only reuses an entry whose
         *     content hashes identically -- this covers writers we never see,
         *     including `LegacyPluginMigrationService`, which writes `.skillrc`
         *     straight through `FileService` during `ospec update`, and it cannot
         *     be defeated by restoring an mtime or matching a byte count;
         *  2. `saveConfig` explicitly drops the entry it just overwrote, and
         *     `invalidate`/`invalidateAll` are public for any writer that bypasses
         *     `saveConfig`.
         *
         * FIX-4: both layers key on the BYTES, which is complete for the one thing
         * this remembers -- the parse -- and was not complete for everything the
         * hit path was skipping. `assertProjectConfigUsable` also reads the
         * filesystem, so it is now re-run on a hit rather than being inside the
         * part that gets skipped. Anything added to `loadConfig` later belongs on
         * the same side of that line unless it is provably a function of the bytes
         * alone.
         */
        this.skillrcCache = new Map();
        this.fileService = fileService;
    }
    /** Drops the memoised `.skillrc` parse for one project root. */
    invalidate(rootDir) {
        this.skillrcCache.delete(this.getConfigCacheKey(rootDir));
    }
    /** Drops every memoised `.skillrc` parse. */
    invalidateAll() {
        this.skillrcCache.clear();
    }
    /*
     * FIX-2 (n2): on Windows and macOS the filesystem is case-insensitive, so
     * `C:\Proj` and `C:\proj` are the same `.skillrc` -- but `path.resolve`
     * preserves the caller's spelling, so each spelling took its own cache
     * entry. Never stale (under FIX-1 every entry is re-verified against a hash
     * of the bytes just read), just an extra parse and an extra copy of the
     * config held forever. Case-fold the key where the platform is
     * case-insensitive, and only there: on Linux the two spellings really are
     * two different files.
     */
    getConfigCacheKey(rootDir) {
        const resolved = path.resolve(rootDir, constants_1.FILE_NAMES.SKILLRC);
        return process.platform === 'win32' || process.platform === 'darwin'
            ? resolved.toLowerCase()
            : resolved;
    }
    /**
     * FIX-G1: this is the `.skillrc` read behind `ProjectService` and every
     * command, and it used to be the *only* one with no damage gate --
     * `normalizeConfig` just ran `normalizeProjectLayout(config.projectLayout)
     * || 'classic'` and a damaged or incomplete layout field became "classic",
     * silently, on a physically nested project. The two index builders each
     * grew their own copy of the guard (F23/F29) while this one kept guessing,
     * so `ospec index build` wrote 7 `for-ai/*` documents into the classic root
     * through `ProjectService.rebuildIndex` *before* `IndexBuilder.write` ever
     * reached the guard, and `ospec update` wrote 16 root-level paths and still
     * exited 0.
     *
     * The gate now lives at the parse boundary that every caller shares. A
     * damaged config throws `DamagedConfigError`, which is deliberately a
     * DIFFERENT error from `ProjectNotInitializedError`: "there is no project
     * here" is a routine, degradable condition and "this project's config is
     * damaged" is not, and collapsing the two is exactly how the damage kept
     * getting swallowed. Callers that want to degrade on an absent project use
     * `loadConfigOrNull`.
     */
    async loadConfig(rootDir) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        const cacheKey = this.getConfigCacheKey(rootDir);
        let contents;
        try {
            contents = await this.fileService.readFile(configPath);
        }
        catch (error) {
            // FIX-G1: "not there" and "there but unreadable" were the same
            // `catch` here, and that is the whole difference between a
            // directory that is not a project and a project whose config is
            // damaged. An empty, truncated or merge-conflicted `.skillrc`
            // reported "not initialized", every `.catch(() => null)` degraded
            // it to the classic default, and `rebuildIndex` wrote seven
            // `for-ai/*` documents into the root of a nested project.
            // `FileService.readFile` wraps the libuv error, so the real code
            // is one level down in `details.error`.
            const cause = error?.details?.error || error;
            if (cause?.code === 'ENOENT' || cause?.code === 'ENOTDIR') {
                throw new errors_1.ProjectNotInitializedError(`Cannot load .skillrc from ${rootDir}`);
            }
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, cause?.code === 'EISDIR'
                ? 'is a directory, not a file'
                : `unreadable (${cause?.code || cause?.message || 'unknown error'})`);
        }
        /*
         * FIX-1/D2: the cache decision is made on the bytes just read, so the
         * hit path and the parse path are looking at exactly the same content.
         * There is no window between the check and the use.
         */
        const contentHash = (0, crypto_1.createHash)('sha256').update(contents, 'utf8').digest('hex');
        const cached = this.skillrcCache.get(cacheKey);
        if (cached && cached.hash === contentHash) {
            /*
             * FIX-4: a hit skips the PARSE. It must not skip the gate.
             *
             * What this cache remembers: the normalised config these exact
             * bytes parse to. That is a pure function of the bytes, so the
             * content hash is a complete key for it and no byte-level attack
             * (mtime restore, same-size rewrite, delete-and-recreate) can serve
             * a stale parse.
             *
             * `assertProjectConfigUsable` is NOT a pure function of the bytes.
             * `describeAbsentProjectLayout` -> `findNestedManagedMarker` reads
             * the filesystem for a `.ospec/` tree, so its answer changes when a
             * branch switch, a restore or another agent materialises that tree
             * while `.skillrc` still lacks `projectLayout`. Returning early
             * here skipped it, and the thing it guards is the P0-10 / FIX-G1
             * damage: a nested project silently treated as classic, and a
             * second document tree written into its root. A cache hit is not
             * allowed to un-fix a Phase 1 bug, so the gate runs on both paths
             * and only the parse is saved.
             */
            (0, ProjectLayout_1.assertProjectConfigUsable)(rootDir, configPath, cached.raw);
            // Callers mutate what they get back (`config.mode = ...` before
            // `saveConfig`), so handing out the cached object itself would let
            // one caller poison every later reader.
            return structuredClone(cached.config);
        }
        let raw;
        try {
            raw = JSON.parse(contents.replace(/^\uFEFF/, ''));
        }
        catch (error) {
            throw (0, ProjectLayout_1.createDamagedConfigError)(configPath, `invalid JSON (${error?.message || 'parse failed'})`);
        }
        (0, ProjectLayout_1.assertProjectConfigUsable)(rootDir, configPath, raw);
        let config;
        try {
            config = this.normalizeConfig(raw);
        }
        catch (error) {
            /*
             * M-cfg1: this `catch` used to turn EVERY normalisation failure
             * into "project not initialized", which would have swallowed the
             * new unknown-key diagnostic whole -- a user with a typo in
             * `.skillrc` would have been told their project does not exist.
             * A `ConfigError` is a deliberate, specific verdict about a file
             * that IS there; only the unclassified rest degrades.
             */
            if (error instanceof errors_1.ConfigError)
                throw error;
            throw new errors_1.ProjectNotInitializedError(`Cannot load .skillrc from ${rootDir}`);
        }
        // No settle window and no freshness condition: the entry is keyed on
        // the content it was parsed from, so a file written one microsecond ago
        // is exactly as safe to remember as one written last week. Error paths
        // above return before here and deliberately never populate the cache.
        this.skillrcCache.set(cacheKey, {
            hash: contentHash,
            config: structuredClone(config),
            raw: structuredClone(raw),
        });
        return config;
    }
    /**
     * FIX-G1: the replacement for `loadConfig(rootDir).catch(() => null)`.
     *
     * That idiom was the whole bug class: 25 sites turned *any* config failure
     * into `null`, `getProjectLayout(null)` returned `'classic'`, and the
     * caller carried on writing into the project root. Degrading is right for
     * "this directory is not an OSpec project" and wrong for "this project's
     * `.skillrc` is damaged", so this helper degrades on exactly the first and
     * propagates the second.
     */
    async loadConfigOrNull(rootDir) {
        try {
            return await this.loadConfig(rootDir);
        }
        catch (error) {
            if ((0, ProjectLayout_1.isDamagedConfigError)(error))
                throw error;
            /*
             * M-cfg1: an unknown `workflow` key is the same kind of verdict as
             * a damaged config -- the file is there, and it says something the
             * CLI refuses to guess about. Degrading it to `null` here would
             * put the silent drop straight back: the caller would fall through
             * to its own default and the user's typo would still do nothing.
             */
            if (error instanceof errors_1.ConfigError)
                throw error;
            return null;
        }
    }
    async saveConfig(rootDir, config) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        await this.fileService.writeJSON(configPath, config);
        // S3: `ospec init`, `ospec update`, `ospec workflow set` and
        // `ospec layout` all land here. Dropping the entry is belt-and-braces
        // next to the mtime check, but it is the layer that does not depend on
        // filesystem timestamp behaviour.
        this.invalidate(rootDir);
    }
    async getMode(rootDir) {
        const config = await this.loadConfig(rootDir);
        return config.mode;
    }
    async isInitialized(rootDir) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        return this.fileService.exists(configPath);
    }
    async createDefaultConfig(mode = 'full') {
        // Cloned for the same reason `normalizeWorkflowConfig` clones: this
        // value is handed to `saveConfig`, and callers mutate it in place.
        const workflow = structuredClone(ConfigurableWorkflow_1.WORKFLOW_PRESETS[mode] || ConfigurableWorkflow_1.WORKFLOW_PRESETS.full);
        const defaultPolicy = mode === 'lite' ? 'off' : 'error';
        return {
            version: '4.0',
            mode,
            ospecCliVersion: await this.getPackageVersion() || undefined,
            projectLayout: 'nested',
            hooks: {
                'pre-commit': true,
                'post-merge': true,
                'spec-check': defaultPolicy,
                'change-check': defaultPolicy,
                'index-check': defaultPolicy,
            },
            index: {
                exclude: ['node_modules/**', 'dist/**', '*.test.*'],
            },
            archive: {
                layout: 'month-day',
            },
            // 7.6. `warn` for one release cycle: a documentation gate that
            // blocks on day one is a gate that gets worked around, and the
            // obligation list has to earn trust on real projects first.
            docs_contract: {
                mode: 'warn',
            },
            workflow,
        };
    }
    normalizeDocumentLanguage(input) {
        return input === 'en-US' || input === 'zh-CN' || input === 'ja-JP' || input === 'ar'
            ? input
            : undefined;
    }
    normalizeCliVersion(input) {
        return typeof input === 'string' && input.trim().length > 0
            ? input.trim()
            : undefined;
    }
    normalizeConfig(config) {
        /*
         * Plugins were removed in OSpec 2.0. Dropping the `plugins:` line from
         * the returned object is NOT enough: the `...config` spread below would
         * carry a legacy `plugins` block straight through, and `saveConfig`
         * writes the config back verbatim -- so a dead, un-normalised block
         * would survive in `.skillrc` forever. Strip the key explicitly.
         */
        const { plugins: _removedPluginsConfig, ...rest } = config;
        /*
         * MAJOR-4. `future` is decided once, from the file's declared version,
         * and handed to every workflow normaliser: whether an unknown key is a
         * typo or a message from a newer release is a property of the FILE, not
         * of the key, so it must not be re-decided per scope.
         */
        const forward = {
            future: isFutureSchemaVersion(config.version),
            tolerated: [],
        };
        const mode = ['lite', 'standard', 'full'].includes(config.mode) ? config.mode : 'full';
        const archive = config.archive && typeof config.archive === 'object' ? config.archive : {};
        const docsContract = config.docs_contract && typeof config.docs_contract === 'object'
            ? config.docs_contract
            : {};
        const hooks = config.hooks || {
            'pre-commit': true,
            'post-merge': true,
            'spec-check': 'error',
        };
        const fallbackPolicy = hooks['spec-check'] ?? 'error';
        const workflow = normalizeWorkflowConfig(config.workflow, mode, forward);
        warnAboutToleratedKeys(config.version, forward);
        const normalizedHooks = {
            'pre-commit': hooks['pre-commit'] !== false,
            'post-merge': hooks['post-merge'] !== false,
            'spec-check': fallbackPolicy,
            'change-check': hooks['change-check'] ?? fallbackPolicy,
            'index-check': hooks['index-check'] ?? fallbackPolicy,
        };
        const legacyWarnDefaults = config.version === '3.0' &&
            config.mode !== 'lite' &&
            normalizedHooks['pre-commit'] &&
            normalizedHooks['post-merge'] &&
            normalizedHooks['spec-check'] === 'warn' &&
            normalizedHooks['change-check'] === 'warn' &&
            normalizedHooks['index-check'] === 'warn';
        return {
            ...rest,
            version: config.version === '3.0' ? '4.0' : config.version,
            mode,
            ospecCliVersion: this.normalizeCliVersion(config.ospecCliVersion),
            projectLayout: (0, ProjectLayout_1.normalizeProjectLayout)(config.projectLayout) || 'classic',
            documentLanguage: this.normalizeDocumentLanguage(config.documentLanguage),
            archive: {
                layout: archive.layout === 'month-day' ? 'month-day' : 'flat',
            },
            // Anything other than the literal `strict` normalises to `warn`,
            // including a typo. Failing open is correct HERE and only here: the
            // alternative is that a misspelt config silently starts blocking
            // archives, which is the surprise this release cycle exists to
            // avoid. `ospec docs obligations` reports the effective mode.
            docs_contract: {
                mode: docsContract.mode === 'strict' ? 'strict' : 'warn',
            },
            hooks: {
                ...normalizedHooks,
                ...(legacyWarnDefaults
                    ? {
                        'spec-check': 'error',
                        'change-check': 'error',
                        'index-check': 'error',
                    }
                    : {}),
            },
            workflow,
        };
    }
    async getPackageVersion() {
        try {
            const packageJson = await this.fileService.readJSON(path.join(path.resolve(__dirname, '../..'), 'package.json'));
            return typeof packageJson.version === 'string' && packageJson.version.trim().length > 0
                ? packageJson.version.trim()
                : null;
        }
        catch {
            return null;
        }
    }
}
exports.ConfigManager = ConfigManager;
function createConfigManager(fileService) {
    return new ConfigManager(fileService);
}
