import { ProjectLayout, SkillrcConfig } from '../core/types';
export declare function normalizeProjectLayout(input: any): ProjectLayout | undefined;
export type DamagedConfigError = Error & {
    ospecDamagedConfig?: true;
};
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
export declare function createDamagedConfigError(configPath: string, reason: string): DamagedConfigError;
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
export declare function createContradictoryLayoutError(configPath: string, reason: string): DamagedConfigError;
export declare function isDamagedConfigError(error: unknown): error is DamagedConfigError;
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
export declare function findNestedManagedMarker(rootDir: string): string | null;
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
export declare function describeAbsentProjectLayout(config: unknown, rootDir: string): string | null;
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
export declare function describeNonObjectConfig(value: unknown): string | null;
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
export declare function assertProjectConfigUsable<T>(rootDir: string, configPath: string, value: T, onDamage?: (reason: string) => void): T;
export declare function getProjectLayout(input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): ProjectLayout;
export declare function getProjectManagedRoot(rootDir: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function toManagedRelativePath(relativePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function resolveManagedPath(rootDir: string, relativePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function getChangeDir(rootDir: string, bucket: string, featureName: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
export declare function resolveManagedInputPath(rootDir: string, candidatePath: string, input?: Pick<SkillrcConfig, 'projectLayout'> | ProjectLayout | null): string;
