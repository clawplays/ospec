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
exports.docsRetireService = exports.DocsRetireService = exports.RETIRED_DOCS_DIR = exports.docsBindingService = exports.DocsBindingService = exports.BINDING_PLAN_FILE = void 0;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const FeatureLocator_1 = require("./FeatureLocator");
const SkillParser_1 = require("./SkillParser");
const ChecklistScan_1 = require("../utils/ChecklistScan");
const helpers_1 = require("../utils/helpers");
/**
 * P8.5 -- `ospec docs coverage` and the `ospec docs bind` pipeline: how a
 * project with existing documentation (and existing undocumented code) is
 * brought under the binding engine.
 *
 * Coverage is the INVERSE of `ospec docs audit`. Audit walks the bindings and
 * asks "did the code move while the document stood still?"; coverage walks the
 * CODE surface and asks "which areas have no binding at all?" -- the areas the
 * obligation engine cannot see, because obligations are generated from
 * bindings and nothing else.
 *
 * Bind mirrors the `ospec docs migrate` pipeline shape, because that shape has
 * already survived contact with real projects:
 *
 *   1. `--plan [--apply]`   engine, deterministic. Inventory every unbound
 *                           document and every uncovered code area, suggest a
 *                           slug/heading/code for each from on-disk evidence,
 *                           and write `docs-binding-plan.json`. Never edits a
 *                           document.
 *   2. (no flag)            a person. Adjudicates each entry: `bind`,
 *                           `reference`, `historical`, or -- for uncovered
 *                           areas -- `create` / `uncovered_accepted`. Edits
 *                           slugs, headings and code paths freely.
 *   3. `--execute [--apply]` engine, mechanical. Inserts the adjudicated
 *                           `<!-- ospec:doc -->` declarations and writes draft
 *                           skeletons for `create` areas. A declaration
 *                           comment is derived data; PROSE IS NEVER WRITTEN.
 *   4. `--verify`           engine gate. Lists everything still unadjudicated
 *                           or unapplied, and fails while any gap remains.
 *
 * Re-running `--plan --apply` MERGES: a verdict a person has set, and the
 * slug/heading/code fields they may have edited, are never regenerated --
 * only the evidence refreshes. That is the same contract migrate's plan file
 * keeps for `historical` and regrouping.
 */
exports.BINDING_PLAN_FILE = 'docs-binding-plan.json';
/** Path prefixes that are never a CODE area. */
const NON_CODE_PREFIXES = [
    'docs/', '.ospec/', 'changes/', 'for-ai/', 'knowledge/', 'cache/',
    'node_modules/', '.git/',
];
function isCodePath(value) {
    const normalized = (0, FeatureLocator_1.normalizeLocatePath)(value);
    if (!normalized || !normalized.includes('/'))
        return false;
    if (NON_CODE_PREFIXES.some(prefix => normalized.startsWith(prefix)))
        return false;
    const base = normalized.split('/').pop() || '';
    return base !== constants_1.FILE_NAMES.SKILL_MD && base !== constants_1.FILE_NAMES.SKILL_INDEX;
}
/** Collapse a path to its leading one-or-two segments -- the "area" unit. */
function areaOf(value) {
    const segments = (0, FeatureLocator_1.normalizeLocatePath)(value).split('/').filter(Boolean);
    return segments.slice(0, Math.min(2, Math.max(1, segments.length - 1))).join('/');
}
function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\.md$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
async function readJsonOrNull(target) {
    try {
        const raw = await fs_1.promises.readFile(target, 'utf8');
        return JSON.parse(raw.replace(/^\uFEFF/, ''));
    }
    catch {
        return null;
    }
}
function compareCodepoints(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
/**
 * A repo-relative path that stays inside the repository. The plan file and
 * the index are both on-disk JSON a person (or a corruption) can edit, so
 * every path read from them is validated before it reaches the filesystem --
 * the same stance `DocsObligationService.resolveSafe` takes.
 */
function isSafeRelativePath(value) {
    const normalized = String(value || '').trim().replace(/\\/g, '/');
    if (!normalized || path.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized))
        return false;
    return !normalized.split('/').includes('..');
}
class DocsBindingService {
    async resolve(projectRoot, relativePath) {
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        const config = await services.configManager.loadConfigOrNull(projectRoot);
        return (0, ProjectLayout_1.resolveManagedPath)(projectRoot, relativePath, config);
    }
    async planPath(projectRoot) {
        return this.resolve(projectRoot, exports.BINDING_PLAN_FILE);
    }
    async readPlan(projectRoot) {
        return readJsonOrNull(await this.planPath(projectRoot));
    }
    async readIndex(projectRoot) {
        return readJsonOrNull(await this.resolve(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX));
    }
    git(cwd, args) {
        return (0, child_process_1.spawnSync)('git', args, { cwd, encoding: 'utf8', windowsHide: true });
    }
    /**
     * The code surface, as a deterministic list of AREAS: the directory of every
     * module SKILL.md, plus the leading segments of every code path an archived
     * change ever declared in `affects` that no module area already covers.
     * Index-only and cheap on purpose -- coverage runs as a report, not a gate.
     */
    enumerateAreas(index) {
        const areas = new Map();
        for (const module of Object.values(index.modules ?? {})) {
            const dir = (0, FeatureLocator_1.normalizeLocatePath)(path.posix.dirname(String(module.file || '')));
            if (!dir || dir === '.' || !isCodePath(`${dir}/x`))
                continue;
            areas.set(dir, 'module');
        }
        const moduleAreas = [...areas.keys()];
        for (const change of index.archived_changes ?? []) {
            for (const affected of change.affects ?? []) {
                if (!isCodePath(affected))
                    continue;
                if (moduleAreas.some(area => (0, FeatureLocator_1.codePrefixMatches)(area, affected)))
                    continue;
                const area = areaOf(affected);
                if (area && !areas.has(area))
                    areas.set(area, 'affects');
            }
        }
        return areas;
    }
    /** Archived changes whose `affects` reach into the given area. */
    archivesTouching(index, area) {
        return (index.archived_changes ?? []).filter(change => (change.affects ?? []).some(affected => isCodePath(affected) && (0, FeatureLocator_1.codePrefixMatches)(area, affected)));
    }
    async coverage(projectRoot) {
        const index = await this.readIndex(projectRoot);
        if (!index) {
            return {
                available: false,
                reason: 'No SKILL.index.json. Run "ospec index build" first.',
                areas: [], bound_prefixes: 0, uncovered: 0, accepted: 0,
            };
        }
        const plan = await this.readPlan(projectRoot);
        const accepted = new Set((plan?.missing ?? [])
            .filter(item => item.verdict === 'uncovered_accepted')
            .map(item => (0, FeatureLocator_1.normalizeLocatePath)(item.area)));
        const boundPrefixes = Object.values(index.feature_docs ?? {})
            .flatMap(entry => (Array.isArray(entry.code) ? entry.code : []))
            .map(FeatureLocator_1.normalizeLocatePath)
            .filter(Boolean);
        const areas = [];
        for (const [area, source] of this.enumerateAreas(index)) {
            // Covered when any binding lives inside the area, or claims a prefix
            // that contains it. Either direction means "some section answers for
            // this code".
            const covered = boundPrefixes.some(prefix => (0, FeatureLocator_1.codePrefixMatches)(area, prefix) || (0, FeatureLocator_1.codePrefixMatches)(prefix, area));
            const touching = this.archivesTouching(index, area);
            const undocumented = touching.filter(change => (change.doc_updates ?? []).length === 0);
            areas.push({
                area,
                source,
                covered,
                accepted: accepted.has(area),
                archive_count: touching.length,
                undocumented_count: undocumented.length,
                archives: undocumented.slice(0, 3).map(change => change.feature),
            });
        }
        // The report is a work list, so the order is the priority order: the
        // busiest undocumented areas first.
        areas.sort((left, right) => Number(left.covered) - Number(right.covered)
            || right.undocumented_count - left.undocumented_count
            || right.archive_count - left.archive_count
            || compareCodepoints(left.area, right.area));
        return {
            available: true,
            areas,
            bound_prefixes: new Set(boundPrefixes).size,
            uncovered: areas.filter(area => !area.covered && !area.accepted).length,
            accepted: areas.filter(area => !area.covered && area.accepted).length,
        };
    }
    /**
     * Candidate code prefixes for one document, from the three evidence sources.
     * Ranked by how many independent observations point at each prefix; capped
     * so a suggestion stays a suggestion and not a dump.
     */
    suggestCode(projectRoot, file, index, useGit) {
        const counts = new Map();
        const bump = (prefix, source) => {
            const existing = counts.get(prefix);
            if (existing)
                existing.count += 1;
            else
                counts.set(prefix, { count: 1, source });
        };
        // 1. Archive co-occurrence: changes that recorded updating this document
        //    also recorded which code they touched.
        const referencing = (index.archived_changes ?? []).filter(change => (change.project_documents ?? []).includes(file)
            || (change.doc_updates ?? []).some(update => update === file || update.startsWith(`${file}#`)));
        for (const change of referencing) {
            for (const affected of change.affects ?? []) {
                if (isCodePath(affected))
                    bump(areaOf(affected), 'archive');
            }
        }
        // 2. Module-name match: `module-web.md` names the `web` module.
        const base = path.posix.basename((0, FeatureLocator_1.normalizeLocatePath)(file)).replace(/\.md$/i, '').toLowerCase();
        for (const [name, module] of Object.entries(index.modules ?? {})) {
            const moduleName = String(name).toLowerCase();
            if (!moduleName || !base.split(/[^a-z0-9]+/).includes(moduleName))
                continue;
            const dir = (0, FeatureLocator_1.normalizeLocatePath)(path.posix.dirname(String(module.file || '')));
            if (dir && dir !== '.' && isCodePath(`${dir}/x`))
                bump(dir, 'module');
        }
        // 3. Git co-change: code the last thirty commits touched alongside this
        //    document. Two steps, necessarily: a pathspec on `git log --name-only`
        //    filters the FILE LISTING too, so the one-call form only ever printed
        //    the document itself and the signal was dead. Degrades to nothing
        //    outside a repository.
        if (useGit) {
            const log = this.git(projectRoot, ['log', '-n', '30', '--format=%H', '--', file]);
            const hashes = !log.error && log.status === 0
                ? log.stdout.split('\n').map(line => line.trim()).filter(line => /^[0-9a-f]{40}$/.test(line))
                : [];
            if (hashes.length > 0) {
                const show = this.git(projectRoot, ['show', '--name-only', '--format=', ...hashes]);
                if (!show.error && show.status === 0) {
                    for (const line of show.stdout.split('\n')) {
                        const candidate = line.trim();
                        if (candidate && candidate !== file && isCodePath(candidate)) {
                            bump(areaOf(candidate), 'git');
                        }
                    }
                }
            }
        }
        const candidates = [...counts.entries()]
            .sort((left, right) => right[1].count - left[1].count || compareCodepoints(left[0], right[0]))
            .slice(0, 5)
            .map(([prefix, meta]) => ({ prefix, source: meta.source }));
        return { archives: referencing.slice(0, 5).map(change => change.feature), candidates };
    }
    async plan(projectRoot, options = {}) {
        const index = await this.readIndex(projectRoot);
        if (!index)
            throw new Error('No SKILL.index.json. Run "ospec index build" first.');
        const prior = await this.readPlan(projectRoot);
        const priorEntries = new Map((prior?.entries ?? []).map(entry => [entry.file, entry]));
        const priorMissing = new Map((prior?.missing ?? []).map(item => [(0, FeatureLocator_1.normalizeLocatePath)(item.area), item]));
        const useGit = options.git !== false
            && !this.git(projectRoot, ['rev-parse', '--is-inside-work-tree']).error;
        const boundFiles = new Set(Object.values(index.feature_docs ?? {}).map(entry => entry.file));
        // EVERY prior slug is reserved up front -- entries and missing areas
        // alike, regardless of walk order. Reserving them lazily let a NEW
        // document that sorts earlier claim a slug a human-adjudicated row
        // already owned, and the plan then carried two rows with one slug.
        const usedSlugs = new Set(Object.keys(index.feature_docs ?? {}));
        for (const priorEntry of priorEntries.values()) {
            if (priorEntry.slug)
                usedSlugs.add(priorEntry.slug);
        }
        for (const priorItem of priorMissing.values()) {
            if (priorItem.slug)
                usedSlugs.add(priorItem.slug);
        }
        let preserved = 0;
        const entries = [];
        // The legacy array-shaped `documents` form has no path keys to plan
        // against; treat it like an empty map, the same stance `retire()` and
        // `index query` take.
        const documents = index.documents && typeof index.documents === 'object' && !Array.isArray(index.documents)
            ? Object.entries(index.documents).sort((left, right) => compareCodepoints(left[0], right[0]))
            : [];
        for (const [file, document] of documents) {
            if (boundFiles.has(file))
                continue;
            const kind = document.kind ?? (0, SkillParser_1.inferBindingKind)(file);
            const evidence = this.suggestCode(projectRoot, file, index, useGit);
            const priorEntry = priorEntries.get(file);
            if (priorEntry) {
                // The verdict and the binding fields belong to the person once the
                // plan exists; only the evidence refreshes.
                preserved += 1;
                entries.push({ ...priorEntry, kind, evidence });
                continue;
            }
            let slug = slugify(path.posix.basename(file));
            if (!slug || usedSlugs.has(slug))
                slug = slugify(`${kind}-${path.posix.basename(file)}`);
            const base = slug;
            for (let attempt = 2; usedSlugs.has(slug); attempt += 1)
                slug = `${base}-${attempt}`;
            usedSlugs.add(slug);
            entries.push({
                file,
                kind,
                // Product and planning documents are reference material by default --
                // the obligation engine never targets them -- so the plan pre-fills
                // the verdict a person would almost always choose. Still overridable.
                verdict: kind === 'product' || kind === 'planning' ? 'reference' : 'pending',
                slug,
                heading: Object.keys(document.sections ?? {})[0] || '',
                code: evidence.candidates.map(candidate => candidate.prefix),
                evidence,
            });
        }
        const coverage = await this.coverage(projectRoot);
        const missing = [];
        for (const area of coverage.areas) {
            if (area.covered)
                continue;
            const priorItem = priorMissing.get((0, FeatureLocator_1.normalizeLocatePath)(area.area));
            if (priorItem) {
                preserved += 1;
                missing.push({
                    ...priorItem,
                    archive_count: area.archive_count,
                    undocumented_count: area.undocumented_count,
                    archives: area.archives,
                });
                continue;
            }
            // Missing-area slugs share the ONE project-wide namespace with every
            // other binding, so they uniquify against it like entry slugs do --
            // otherwise `docs/design/src-widgets.md` and the uncovered area
            // `src/widgets` both suggested `src-widgets`, and execute wrote two
            // declarations that bricked the next index build.
            let slug = slugify(area.area) || 'area';
            const slugBase = slug;
            for (let attempt = 2; usedSlugs.has(slug); attempt += 1)
                slug = `${slugBase}-${attempt}`;
            usedSlugs.add(slug);
            missing.push({
                area: area.area,
                verdict: 'pending',
                slug,
                suggested_path: `docs/features/${slug}.md`,
                archive_count: area.archive_count,
                undocumented_count: area.undocumented_count,
                archives: area.archives,
            });
        }
        const plan = {
            version: '1.0',
            generated: new Date().toISOString(),
            entries,
            missing,
        };
        const writes = [];
        if (options.apply) {
            const target = await this.planPath(projectRoot);
            await fs_1.promises.mkdir(path.dirname(target), { recursive: true });
            await fs_1.promises.writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
            writes.push(target);
        }
        return { plan, preserved, writes };
    }
    /**
     * Insert one `<!-- ospec:doc -->` line under the entry's heading. The BOM
     * and the file's dominant line-ending style survive; a mixed-EOL file is
     * normalised to that dominant style. Returns a reason instead of guessing
     * when the heading is gone or the section already carries a declaration.
     *
     * Fence-aware, and it MUST be: `parseFeatureDeclarations` skips fenced
     * lines, so matching a heading that only exists inside a ``` block would
     * write the declaration into a user's example, the validating parse would
     * still pass (it sees no fenced declaration), and the slug would never
     * register -- a pipeline deadlock the fence flags prevent.
     */
    insertDeclaration(raw, entry) {
        const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
        // A lone CR (no LF) is a line break for the fence flags but not for the
        // /\r?\n/ split below, so every index after it would be misaligned and
        // the fence guard silently wrong. Refusing is the honest move; the file
        // needs its line endings fixed before an engine edits it.
        if (/\r(?!\n)/.test(raw)) {
            return { reason: 'the file contains a bare CR line ending; normalise its line endings first' };
        }
        const eol = raw.includes('\r\n') ? '\r\n' : '\n';
        const lines = raw.slice(bom.length).split(/\r?\n/);
        const fenced = (0, ChecklistScan_1.fencedLineFlags)(raw.slice(bom.length).replace(/\r\n?/g, '\n'));
        const headingIndex = lines.findIndex((line, index) => {
            if (fenced[index])
                return false;
            const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
            return match !== null && match[2].trim() === entry.heading;
        });
        if (headingIndex < 0) {
            return { reason: `heading "${entry.heading}" not found outside code fences; fix the heading in ${exports.BINDING_PLAN_FILE}` };
        }
        let probe = headingIndex + 1;
        while (probe < lines.length && lines[probe].trim() === '')
            probe += 1;
        if (probe < lines.length && !fenced[probe] && /ospec:(?:feature|doc)\b/.test(lines[probe])) {
            return { reason: `the section under "${entry.heading}" already carries a declaration` };
        }
        const declaration = `<!-- ospec:doc ${entry.slug}${entry.code.length > 0 ? ` code:${entry.code.join(',')}` : ''} -->`;
        const next = [...lines.slice(0, headingIndex + 1), '', declaration, ...lines.slice(headingIndex + 1)];
        const content = bom + next.join(eol);
        // Fail loudly BEFORE writing if the result would not parse -- a plan row
        // with a malformed slug or code path must not brick the next index build.
        (0, SkillParser_1.parseFeatureDeclarations)((0, helpers_1.parseFrontmatterDocument)(content.replace(/\r\n?/g, '\n')).content, entry.file);
        return { content };
    }
    draftSkeleton(item) {
        const title = item.area;
        const codeSuffix = ` code:${(0, FeatureLocator_1.normalizeLocatePath)(item.area)}/`;
        return [
            '---',
            `title: ${title}`,
            'status: draft',
            '---',
            '',
            `# ${title}`,
            '',
            `<!-- ospec:doc ${item.slug}${codeSuffix} -->`,
            '<!-- ospec:binding-draft -->',
            '',
            '_Describe the current behaviour of this area: purpose, behaviour, logic',
            'flow, boundaries and constraints. Then delete this line, the',
            '`ospec:binding-draft` comment and the `status: draft` frontmatter line._',
            '',
            ...(item.archives.length > 0
                ? [
                    'Source material:',
                    ...item.archives.map(name => `- \`ospec changes show ${name}\``),
                    '',
                ]
                : []),
        ].join('\n');
    }
    async execute(projectRoot, options = {}) {
        const plan = await this.readPlan(projectRoot);
        if (!plan)
            throw new Error(`No ${exports.BINDING_PLAN_FILE}. Run "ospec docs bind --plan --apply" first.`);
        const index = await this.readIndex(projectRoot);
        const declaredSlugs = new Set(Object.keys(index?.feature_docs ?? {}));
        const result = {
            applied: options.apply === true,
            declared: [], drafted: [], skipped: [], writes: [],
        };
        for (const entry of plan.entries) {
            if (entry.verdict !== 'bind')
                continue;
            if (declaredSlugs.has(entry.slug)) {
                result.skipped.push({ file: entry.file, reason: `slug "${entry.slug}" is already declared` });
                continue;
            }
            if (!isSafeRelativePath(entry.file)) {
                result.skipped.push({ file: entry.file, reason: 'path is absolute or escapes the repository' });
                continue;
            }
            const absolute = path.join(projectRoot, ...entry.file.split('/'));
            let raw;
            try {
                raw = await fs_1.promises.readFile(absolute, 'utf8');
            }
            catch {
                result.skipped.push({ file: entry.file, reason: 'file is unreadable or gone' });
                continue;
            }
            // A malformed hand-edited row (a bad slug, a code path with a space)
            // makes the validating parse throw; that is ONE row's problem, not the
            // run's -- aborting here left earlier writes applied but unreported and
            // the index never rebuilt.
            let inserted;
            try {
                inserted = this.insertDeclaration(raw, entry);
            }
            catch (error) {
                inserted = { reason: `the declaration would not parse: ${error?.message || error}` };
            }
            if ('reason' in inserted) {
                result.skipped.push({ file: entry.file, reason: inserted.reason });
                continue;
            }
            if (options.apply)
                await fs_1.promises.writeFile(absolute, inserted.content, 'utf8');
            // Claimed only on SUCCESS: two rows hand-edited onto one slug are still
            // caught before the second write, but a row that failed its own checks
            // does not block a later same-slug row with a misleading reason.
            declaredSlugs.add(entry.slug);
            result.declared.push({ file: entry.file, slug: entry.slug });
            result.writes.push(entry.file);
        }
        for (const item of plan.missing) {
            if (item.verdict !== 'create')
                continue;
            // Draft slugs live in the same namespace as entry slugs and existing
            // bindings; a collision here is refused for the same brick-the-build
            // reason as above.
            if (declaredSlugs.has(item.slug)) {
                result.skipped.push({ file: item.suggested_path, reason: `slug "${item.slug}" is already declared` });
                continue;
            }
            if (!isSafeRelativePath(item.suggested_path)) {
                result.skipped.push({ file: item.suggested_path, reason: 'path is absolute or escapes the repository' });
                continue;
            }
            const target = await this.resolve(projectRoot, item.suggested_path);
            let exists = true;
            try {
                await fs_1.promises.access(target);
            }
            catch {
                exists = false;
            }
            if (exists) {
                result.skipped.push({ file: item.suggested_path, reason: 'draft already exists' });
                continue;
            }
            if (options.apply) {
                await fs_1.promises.mkdir(path.dirname(target), { recursive: true });
                await fs_1.promises.writeFile(target, this.draftSkeleton(item), 'utf8');
            }
            declaredSlugs.add(item.slug);
            result.drafted.push({ file: item.suggested_path, slug: item.slug });
            result.writes.push(item.suggested_path);
        }
        if (options.apply && (result.declared.length > 0 || result.drafted.length > 0)) {
            const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
            await services.projectService.rebuildIndex(projectRoot);
        }
        return result;
    }
    async verify(projectRoot) {
        const plan = await this.readPlan(projectRoot);
        if (!plan)
            throw new Error(`No ${exports.BINDING_PLAN_FILE}. Run "ospec docs bind --plan --apply" first.`);
        const index = await this.readIndex(projectRoot);
        const gaps = [];
        // The plan is hand-edited JSON, so an unknown verdict is a TYPO, not an
        // adjudication -- "historcal" must not sail through the one gate whose
        // job is to refuse gaps.
        const ENTRY_VERDICTS = new Set(['pending', 'bind', 'reference', 'historical']);
        const MISSING_VERDICTS = new Set(['pending', 'create', 'uncovered_accepted']);
        for (const entry of plan.entries) {
            if (!ENTRY_VERDICTS.has(entry.verdict)) {
                gaps.push({
                    kind: 'invalid',
                    detail: `${entry.file}: unknown verdict "${entry.verdict}" -- use bind, reference or historical in ${exports.BINDING_PLAN_FILE}.`,
                });
            }
            else if (entry.verdict === 'pending') {
                gaps.push({
                    kind: 'unadjudicated',
                    detail: `${entry.file}: verdict is still "pending" -- set bind, reference or historical in ${exports.BINDING_PLAN_FILE}.`,
                });
            }
            else if (entry.verdict === 'bind') {
                // Declared is not enough: the slug must be declared BY THIS document.
                // When two rows were hand-edited onto one slug, execute declares it
                // into the first file and skips the second -- a slug-only check then
                // certified the second document as bound while it never was.
                const declared = index?.feature_docs?.[entry.slug];
                if (!declared) {
                    gaps.push({
                        kind: 'unbound',
                        detail: `${entry.file}: verdict is "bind" but slug "${entry.slug}" is not declared -- run "ospec docs bind --execute --apply".`,
                    });
                }
                else if (declared.file !== entry.file) {
                    gaps.push({
                        kind: 'misbound',
                        detail: `${entry.file}: slug "${entry.slug}" is declared by ${declared.file}, not by this document -- give this row its own slug in ${exports.BINDING_PLAN_FILE}.`,
                    });
                }
            }
        }
        for (const item of plan.missing) {
            if (!MISSING_VERDICTS.has(item.verdict)) {
                gaps.push({
                    kind: 'invalid',
                    detail: `${item.area}: unknown verdict "${item.verdict}" -- use create or uncovered_accepted in ${exports.BINDING_PLAN_FILE}.`,
                });
                continue;
            }
            if (item.verdict === 'pending') {
                gaps.push({
                    kind: 'unadjudicated',
                    detail: `${item.area}: uncovered area is still "pending" -- set create or uncovered_accepted in ${exports.BINDING_PLAN_FILE}.`,
                });
                continue;
            }
            if (item.verdict !== 'create')
                continue;
            if (!isSafeRelativePath(item.suggested_path)) {
                gaps.push({
                    kind: 'invalid',
                    detail: `${item.area}: suggested_path "${item.suggested_path}" is absolute or escapes the repository -- fix it in ${exports.BINDING_PLAN_FILE}.`,
                });
                continue;
            }
            const target = await this.resolve(projectRoot, item.suggested_path);
            let raw = null;
            try {
                raw = await fs_1.promises.readFile(target, 'utf8');
            }
            catch {
                raw = null;
            }
            if (raw === null) {
                gaps.push({
                    kind: 'undrafted',
                    detail: `${item.area}: verdict is "create" but ${item.suggested_path} does not exist -- run "ospec docs bind --execute --apply".`,
                });
            }
            else if (raw.includes('ospec:binding-draft') || /^status:\s*draft\s*$/m.test(raw)) {
                gaps.push({
                    kind: 'draft',
                    detail: `${item.suggested_path}: still a draft -- describe the current behaviour, then remove the draft markers.`,
                });
            }
        }
        return {
            ok: gaps.length === 0,
            gaps,
            checked: { entries: plan.entries.length, missing: plan.missing.length },
        };
    }
}
exports.DocsBindingService = DocsBindingService;
exports.docsBindingService = new DocsBindingService();
exports.RETIRED_DOCS_DIR = 'changes/archived/retired-docs';
/** The first sibling of `base` that does not exist yet: base, base-2, base-3... */
async function uniqueTargetPath(base) {
    const extension = path.extname(base);
    const stem = base.slice(0, base.length - extension.length);
    let candidate = base;
    for (let attempt = 2;; attempt += 1) {
        try {
            await fs_1.promises.access(candidate);
        }
        catch {
            return candidate;
        }
        candidate = `${stem}-${attempt}${extension}`;
    }
}
/**
 * P8: `ospec docs retire` -- the destructive end of the document lifecycle,
 * shaped like `docs migrate --finalize`: a person marks a document
 * `status: deprecated` first, the engine collects, prints, RECORDS, and only
 * then moves. Nothing is ever plain-deleted; a retired document goes to
 * `changes/archived/retired-docs/<original path>` with a manifest row saying
 * when and why, because "delete" in this system always means "archive".
 *
 * The one guard: a deprecated document whose bindings still point at living
 * code is refused unless it names a `superseded_by`. Retiring the only
 * documentation of code that still exists is the exact loss this pipeline
 * exists to prevent; naming a successor is the explicit statement that the
 * knowledge lives somewhere else now.
 */
class DocsRetireService {
    async resolve(projectRoot, relativePath) {
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        const config = await services.configManager.loadConfigOrNull(projectRoot);
        return (0, ProjectLayout_1.resolveManagedPath)(projectRoot, relativePath, config);
    }
    async retire(projectRoot, options = {}) {
        const index = await readJsonOrNull(await this.resolve(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX));
        if (!index)
            throw new Error('No SKILL.index.json. Run "ospec index build" first.');
        const documents = index.documents && typeof index.documents === 'object' && !Array.isArray(index.documents)
            ? Object.keys(index.documents).sort()
            : [];
        const bindingsByFile = new Map();
        for (const entry of Object.values(index.feature_docs ?? {})) {
            const file = String(entry.file || '');
            if (!bindingsByFile.has(file))
                bindingsByFile.set(file, []);
            bindingsByFile.get(file).push({
                slug: entry.slug,
                code: Array.isArray(entry.code) ? entry.code : [],
            });
        }
        const result = { applied: options.apply === true, retired: [], refused: [], manifest: null };
        const retireRoot = await this.resolve(projectRoot, exports.RETIRED_DOCS_DIR);
        for (const file of documents) {
            if (!isSafeRelativePath(file))
                continue;
            const absolute = path.join(projectRoot, ...file.split('/'));
            let raw;
            try {
                raw = await fs_1.promises.readFile(absolute, 'utf8');
            }
            catch {
                continue;
            }
            let data = {};
            try {
                data = (0, helpers_1.parseFrontmatterDocument)(raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')).data ?? {};
            }
            catch {
                continue;
            }
            if (data.status !== 'deprecated')
                continue;
            const supersededBy = typeof data.superseded_by === 'string' && data.superseded_by.trim()
                ? data.superseded_by.trim()
                : undefined;
            if (!supersededBy) {
                const alive = [];
                for (const binding of bindingsByFile.get(file) ?? []) {
                    for (const prefix of binding.code) {
                        const target = path.join(projectRoot, ...String(prefix).replace(/\/+$/, '').split('/'));
                        let exists = true;
                        try {
                            await fs_1.promises.access(target);
                        }
                        catch {
                            exists = false;
                        }
                        if (exists) {
                            alive.push(binding.slug);
                            break;
                        }
                    }
                }
                if (alive.length > 0) {
                    result.refused.push({
                        file,
                        reason: `binding(s) ${alive.join(', ')} still point at code that exists; name a superseded_by in the frontmatter, or keep the document`,
                    });
                    continue;
                }
            }
            // The recorded `to` is the REAL destination relative to the project
            // root -- in a nested layout the retire root itself lives under
            // `.ospec/`, so deriving it from the bare constant wrote a recovery
            // record pointing at a path that did not exist. Overwrite is never
            // allowed: if the same document path was retired before, the new copy
            // gets a numbered sibling, because "archive" that clobbers its own
            // previous archive is just deletion with extra steps.
            const target = await uniqueTargetPath(path.join(retireRoot, ...file.split('/')));
            result.retired.push({
                file,
                to: path.relative(projectRoot, target).replace(/\\/g, '/'),
                ...(typeof data.title === 'string' && data.title ? { title: data.title } : {}),
                ...(supersededBy ? { superseded_by: supersededBy } : {}),
            });
        }
        if (options.apply && result.retired.length > 0) {
            // Manifest FIRST, moves second: if the move is interrupted, the record
            // of what was being retired and why already exists.
            const manifestPath = path.join(retireRoot, 'manifest.json');
            const manifest = (await readJsonOrNull(manifestPath))
                ?? { version: '1.0', entries: [] };
            const retiredAt = new Date().toISOString();
            manifest.entries.push(...result.retired.map(entry => ({ ...entry, retired_at: retiredAt })));
            await fs_1.promises.mkdir(retireRoot, { recursive: true });
            await fs_1.promises.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
            result.manifest = manifestPath;
            for (const entry of result.retired) {
                const from = path.join(projectRoot, ...entry.file.split('/'));
                const to = path.join(projectRoot, ...entry.to.split('/'));
                await fs_1.promises.mkdir(path.dirname(to), { recursive: true });
                await fs_1.promises.rename(from, to);
            }
            const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
            await services.projectService.rebuildIndex(projectRoot);
        }
        return result;
    }
}
exports.DocsRetireService = DocsRetireService;
exports.docsRetireService = new DocsRetireService();
