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
exports.docsMigrationService = exports.DocsMigrationService = exports.DRAFT_MARKER = exports.LEGACY_GENERATOR = exports.MIGRATION_PLAN_FILE = exports.MIGRATION_STATE_FILE = void 0;
exports.domainOfPath = domainOfPath;
exports.clusterArchive = clusterArchive;
exports.migrationDraftCopy = migrationDraftCopy;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const helpers_1 = require("../utils/helpers");
const FeatureCatalogPort_1 = require("./FeatureCatalogPort");
/**
 * 7.9: `ospec docs migrate` -- the four-phase pipeline that lets an existing
 * project stop carrying the artefacts 7.7 stopped producing.
 *
 * THE OWNER SET THE PRINCIPLE EXPLICITLY, and it is the reason this is a
 * pipeline rather than a delete command: read every old document, convert its
 * content into the new design, have the engine VERIFY coverage is complete,
 * and only then allow deletion. Phase 4 is unreachable until phase 3 says
 * every old knowledge document's archive is either represented in a living
 * feature section or has been explicitly declared pure history by a person.
 *
 *   1. `--plan`      engine, deterministic. Inventory + cluster + draft skeletons.
 *   2. (no flag)     AI. Rewrites the drafts into behaviour descriptions. The
 *                    engine does not write prose; the skill docs carry the
 *                    instructions, in four languages.
 *   3. `--verify`    engine gate. Refuses to proceed on any gap.
 *   4. `--finalize`  destructive, requires `--apply`. Prints and records the
 *                    file list BEFORE deleting it.
 *
 * Every phase is dry-run unless `--apply` is passed, which is what "全程默认
 * dry-run 语义" asks for: `ospec docs migrate --plan` shows what it would
 * create and creates nothing.
 */
exports.MIGRATION_STATE_FILE = 'docs-migration.json';
exports.MIGRATION_PLAN_FILE = 'docs-migration-plan.json';
exports.LEGACY_GENERATOR = 'ospec-archive-knowledge';
exports.DRAFT_MARKER = '<!-- ospec:migration-draft -->';
/** Source roots stripped before a path's domain segment is read. */
const SOURCE_ROOTS = new Set(['src', 'lib', 'app', 'packages', 'source', 'apps']);
function toRelative(rootDir, absolute) {
    return path.relative(rootDir, absolute).replace(/\\/g, '/');
}
async function pathExists(target) {
    try {
        await fs_1.promises.stat(target);
        return true;
    }
    catch {
        return false;
    }
}
async function readJsonOrNull(target) {
    try {
        return JSON.parse((await fs_1.promises.readFile(target, 'utf8')).replace(/^﻿/, ''));
    }
    catch {
        return null;
    }
}
/**
 * The domain segment of a repository path: the first segment that is not a
 * source root, with any extension dropped.
 *
 * `src/auth/session.ts` -> `auth`; `packages/core/src/index.ts` -> `core`;
 * `README.md` -> `readme`. Deterministic and boring on purpose -- this only
 * has to produce a CANDIDATE grouping for a person to correct in phase 2, and
 * a clever heuristic that is wrong in an interesting way is worse than a dull
 * one that is wrong in an obvious way.
 */
function domainOfPath(candidate) {
    const segments = String(candidate || '')
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .split('/')
        .filter(Boolean);
    for (const segment of segments) {
        if (SOURCE_ROOTS.has(segment.toLowerCase()))
            continue;
        const slug = segment
            .replace(/\.[^.]+$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || null;
    }
    return null;
}
/**
 * The candidate group for one archive: the domain that the most of its paths
 * agree on. Ties break by code point so two machines produce the same plan.
 */
function clusterArchive(paths) {
    const counts = new Map();
    for (const candidate of paths) {
        const domain = domainOfPath(candidate);
        if (!domain)
            continue;
        counts.set(domain, (counts.get(domain) || 0) + 1);
    }
    if (counts.size === 0)
        return null;
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : 1))[0][0];
}
/**
 * Same rule as `featureCatalogCopy` and the obligation engine's copy table:
 * text the engine writes INTO a project document follows the project's
 * `documentLanguage`. The `name:` slug, `status: draft` and the DRAFT_MARKER
 * comment stay machine strings -- verify greps for them verbatim.
 */
function migrationDraftCopy(documentLanguage) {
    if (documentLanguage === 'zh-CN') {
        return {
            title: domain => `${domain} 功能`,
            guide: [
                '> **这是迁移原始素材，不是文档。** 下面每一节罗列的是过去的变更做了什么。',
                '> 请把每一节改写成该功能**现在**的行为描述——用途、行为、逻辑流程、边界，',
                '> 然后在标题下加上 `<!-- ospec:feature <slug> code:<paths> -->` 声明，',
                '> 并删除本引导块与 frontmatter 的 `status: draft` 行。',
                '> 整个项目完成后运行 `ospec docs migrate --verify`。',
            ],
            toBeRewritten: '_待改写为行为描述。_',
            whatTheChangeSaid: '变更摘要',
            affects: '影响范围',
            files: '文件',
            verifiedBy: '验证命令',
            archive: '归档',
            fullDetail: '完整详情',
        };
    }
    if (documentLanguage === 'ja-JP') {
        return {
            title: domain => `${domain} 機能`,
            guide: [
                '> **これは移行の生素材であり、文書ではありません。** 以下の各セクションは過去の変更内容の羅列です。',
                '> 各セクションをその機能の**現在の**挙動の説明——目的・挙動・ロジックフロー・境界——に書き直し、',
                '> 見出しの下に `<!-- ospec:feature <slug> code:<paths> -->` 宣言を追加した上で、',
                '> このブロックと frontmatter の `status: draft` 行を削除してください。',
                '> プロジェクト全体が完了したら `ospec docs migrate --verify` を実行します。',
            ],
            toBeRewritten: '_挙動の説明として書き直してください。_',
            whatTheChangeSaid: '変更の要約',
            affects: '影響範囲',
            files: 'ファイル',
            verifiedBy: '検証コマンド',
            archive: 'アーカイブ',
            fullDetail: '詳細',
        };
    }
    if (documentLanguage === 'ar') {
        return {
            title: domain => `ميزات ${domain}`,
            guide: [
                '> **هذه مادة خام للترحيل، وليست توثيقًا.** كل قسم أدناه يسرد ما فعلته التغييرات السابقة.',
                '> أعد كتابة كل قسم كوصف لسلوك الميزة **الحالي** — الغرض والسلوك وتدفق المنطق والحدود —',
                '> ثم أضف إعلان `<!-- ospec:feature <slug> code:<paths> -->` تحت العنوان،',
                '> واحذف هذه الفقرة وسطر `status: draft` من الـ frontmatter.',
                '> شغّل `ospec docs migrate --verify` بعد اكتمال المشروع كله.',
            ],
            toBeRewritten: '_يُعاد كتابته كوصف للسلوك._',
            whatTheChangeSaid: 'ملخص التغيير',
            affects: 'نطاق التأثير',
            files: 'الملفات',
            verifiedBy: 'أوامر التحقق',
            archive: 'الأرشيف',
            fullDetail: 'التفاصيل الكاملة',
        };
    }
    return {
        title: domain => `${domain} features`,
        guide: [
            '> **This is migration raw material, not documentation.** Every section',
            '> below lists what past changes did. Rewrite each one as a description of',
            '> what the feature DOES NOW -- purpose, behaviour, logic flow, boundaries',
            '> -- then add its `<!-- ospec:feature <slug> code:<paths> -->` declaration',
            '> under the heading, and delete this block and the `status: draft` line.',
            '> Run `ospec docs migrate --verify` when the whole project is done.',
        ],
        toBeRewritten: '_To be rewritten as a behaviour description._',
        whatTheChangeSaid: 'What the change said',
        affects: 'Affects',
        files: 'Files',
        verifiedBy: 'Verified by',
        archive: 'Archive',
        fullDetail: 'Full detail',
    };
}
class DocsMigrationService {
    async resolve(projectRoot, relativePath) {
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        const config = await services.configManager.loadConfigOrNull(projectRoot);
        return (0, ProjectLayout_1.resolveManagedPath)(projectRoot, relativePath, config);
    }
    async statePath(projectRoot) {
        return this.resolve(projectRoot, exports.MIGRATION_STATE_FILE);
    }
    async planPath(projectRoot) {
        return this.resolve(projectRoot, exports.MIGRATION_PLAN_FILE);
    }
    async readState(projectRoot) {
        return readJsonOrNull(await this.statePath(projectRoot));
    }
    async readPlan(projectRoot) {
        return readJsonOrNull(await this.planPath(projectRoot));
    }
    async writeState(projectRoot, next) {
        const target = await this.statePath(projectRoot);
        await fs_1.promises.mkdir(path.dirname(target), { recursive: true });
        await fs_1.promises.writeFile(target, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    }
    /**
     * Every legacy artefact on disk: documents carrying
     * `generator: ospec-archive-knowledge`, the generated feature-index, and any
     * generated-document entry still sitting in a committed `documents` map.
     *
     * Detection is by FRONTMATTER MARKER, not by path. A human-owned file under
     * docs/project/changes/ is not a legacy artefact and must never be swept up
     * -- now that nothing generates into that directory, a person is free to
     * keep notes there.
     */
    async inventory(projectRoot) {
        const docsProject = await this.resolve(projectRoot, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}`);
        const knowledgeRoot = path.join(docsProject, 'changes');
        const knowledgeDocuments = [];
        const visit = async (dir) => {
            let entries;
            try {
                entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await visit(full);
                    continue;
                }
                if (!entry.name.endsWith('.md'))
                    continue;
                try {
                    const document = (0, helpers_1.parseFrontmatterDocument)(await fs_1.promises.readFile(full, 'utf8'));
                    if (document.data?.generator === exports.LEGACY_GENERATOR) {
                        knowledgeDocuments.push(toRelative(projectRoot, full));
                    }
                }
                catch {
                    // Unparseable frontmatter is not proof of a generated document, and
                    // guessing here would delete someone's file.
                }
            }
        };
        await visit(knowledgeRoot);
        const featureIndexAbsolute = path.join(docsProject, 'feature-index.md');
        const featureIndex = (await pathExists(featureIndexAbsolute))
            ? toRelative(projectRoot, featureIndexAbsolute)
            : null;
        // Residue only survives in a committed index that has not been rebuilt --
        // 7.2 stopped inserting these, so a fresh build drops them by itself.
        const indexPath = await this.resolve(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX);
        const index = await readJsonOrNull(indexPath);
        const indexedGenerated = Object.keys(index?.documents || {})
            .filter(documentPath => knowledgeDocuments.includes(documentPath)
            || (featureIndex !== null && documentPath === featureIndex))
            .sort();
        return {
            knowledge_documents: knowledgeDocuments.sort(),
            feature_index: featureIndex,
            indexed_generated_documents: indexedGenerated,
        };
    }
    /**
     * Phase 1. Deterministic: the same tree produces the same plan, so a re-run
     * after an interruption is safe and a diff between two runs is meaningful.
     *
     * Re-running MERGES rather than clobbers. `historical` and a corrected
     * `group` are set by a person, in the plan file, between phases 1 and 3 --
     * so regenerating the plan must carry them over or the pipeline would eat
     * the human judgement it depends on. That is also what makes the pipeline
     * resumable: re-run `--plan` at any point and the human edits survive.
     */
    async plan(projectRoot, options = {}) {
        const legacy = await this.inventory(projectRoot);
        const indexPath = await this.resolve(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX);
        const index = await readJsonOrNull(indexPath);
        const entries = Array.isArray(index?.archived_changes) ? index.archived_changes : [];
        const previous = await this.readPlan(projectRoot);
        const previousByArchive = new Map((previous?.archives || []).map(item => [item.archive, item]));
        const preserved = [];
        const archives = [];
        for (const entry of entries) {
            const archive = String(entry?.archive || '');
            if (!archive)
                continue;
            const affects = (entry.affects || []).map(String);
            const targetFiles = (entry.target_files || []).map(String);
            const inferred = clusterArchive([...affects, ...targetFiles]);
            const prior = previousByArchive.get(archive);
            // A person may have corrected the group or flagged the archive as pure
            // history. Both survive a re-plan.
            const group = prior && prior.group !== inferredGroupFor(prior) ? prior.group : inferred;
            const historical = prior?.historical === true;
            if (prior && (historical || group !== inferred))
                preserved.push(archive);
            archives.push({
                archive,
                feature: String(entry.feature || ''),
                summary: String(entry.summary || ''),
                affects,
                target_files: targetFiles,
                verification_commands: (entry.verification_commands || []).map(String),
                group,
                knowledge_document: legacyDocumentFor(archive, legacy.knowledge_documents),
                historical,
            });
        }
        archives.sort((left, right) => (left.archive < right.archive ? -1 : 1));
        // Where a feature document LIVES, resolved through the project's layout.
        // This was `docs/features/<domain>.md` joined onto the repository root,
        // which is right for a classic project and wrong for the nested one
        // `ospec init` creates by default: there the documents belong under
        // `.ospec/docs/features/`, and only that tree is indexed. So on a default
        // project phase 1 wrote its drafts somewhere the index never reads, phase 2
        // put the `ospec:feature` declarations there, and phase 3 then reported
        // "Feature declarations found: 0" and refused forever -- the pipeline could
        // not be completed at all. Found by running phases 1-4 on a real
        // `ospec init` fixture.
        const featureDocsRoot = toRelative(projectRoot, await this.resolve(projectRoot, `${constants_1.DIR_NAMES.DOCS}/features`));
        const groupMap = new Map();
        for (const item of archives) {
            if (!item.group)
                continue;
            const existing = groupMap.get(item.group) || {
                domain: item.group,
                document: `${featureDocsRoot}/${item.group}.md`,
                archives: [],
                paths: [],
            };
            existing.archives.push(item.archive);
            existing.paths.push(...item.affects, ...item.target_files);
            groupMap.set(item.group, existing);
        }
        const groups = [...groupMap.values()]
            .map(group => ({
            ...group,
            archives: group.archives.sort(),
            paths: [...new Set(group.paths)].sort(),
        }))
            .sort((left, right) => (left.domain < right.domain ? -1 : 1));
        const plan = {
            version: '1.0',
            legacy,
            archives,
            groups,
            unclassified: archives.filter(item => !item.group).map(item => item.archive).sort(),
        };
        // The skeleton wording follows the project's documentLanguage, exactly as
        // the catalogue and the obligation copy already do. English used to be
        // hardcoded here; found on a real zh-CN project whose whole draft guidance
        // came out in the wrong language.
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        const config = await services.configManager.loadConfigOrNull(projectRoot);
        const copy = migrationDraftCopy(config?.documentLanguage);
        const drafts = groups.map(group => ({
            path: group.document,
            content: this.renderDraft(projectRoot, group, archives, copy),
        }));
        const planFile = toRelative(projectRoot, await this.planPath(projectRoot));
        const writes = [planFile, ...drafts.map(draft => draft.path)];
        if (options.apply) {
            const planAbsolute = await this.planPath(projectRoot);
            await fs_1.promises.mkdir(path.dirname(planAbsolute), { recursive: true });
            await fs_1.promises.writeFile(planAbsolute, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
            for (const draft of drafts) {
                const absolute = path.join(projectRoot, ...draft.path.split('/'));
                // A draft NEVER overwrites a document that is no longer a draft: once
                // the AI has rewritten it in phase 2 it is human-owned, and a re-plan
                // must not throw that away. This is the resume path's sharp edge.
                if (await pathExists(absolute)) {
                    const existing = await fs_1.promises.readFile(absolute, 'utf8');
                    if (!existing.includes(exports.DRAFT_MARKER))
                        continue;
                }
                await fs_1.promises.mkdir(path.dirname(absolute), { recursive: true });
                await fs_1.promises.writeFile(absolute, draft.content, 'utf8');
            }
            await this.writeState(projectRoot, {
                version: '1.0',
                phase: 'planned',
                planned_at: new Date().toISOString(),
                plan_file: planFile,
            });
        }
        return { plan, writes, drafts, applied: options.apply === true, preserved: preserved.sort() };
    }
    /**
     * The draft skeleton. Raw material for the AI, marked unmistakably as such:
     * `status: draft` in frontmatter, the DRAFT_MARKER comment, and a sentence
     * per section saying what has to replace it. It deliberately carries NO
     * `ospec:feature` declaration -- phase 2 adds those, and a draft that
     * registered slugs would make the index treat unfinished material as a
     * living feature document.
     */
    renderDraft(projectRoot, group, archives, copy) {
        const members = archives.filter(item => group.archives.includes(item.archive));
        const lines = [
            '---',
            `name: ${group.domain}-features`,
            `title: ${copy.title(group.domain)}`,
            'status: draft',
            '---',
            '',
            exports.DRAFT_MARKER,
            '',
            `# ${copy.title(group.domain)}`,
            '',
            ...copy.guide,
            '',
        ];
        for (const member of members) {
            lines.push(`## ${member.feature || member.archive}`, '');
            lines.push(exports.DRAFT_MARKER, '');
            lines.push(copy.toBeRewritten, '');
            if (member.summary)
                lines.push(`- ${copy.whatTheChangeSaid}: ${member.summary}`);
            if (member.affects.length > 0)
                lines.push(`- ${copy.affects}: ${member.affects.join(', ')}`);
            if (member.target_files.length > 0) {
                lines.push(`- ${copy.files}: ${member.target_files.map(file => `\`${file}\``).join(', ')}`);
            }
            if (member.verification_commands.length > 0) {
                lines.push(`- ${copy.verifiedBy}: ${member.verification_commands.map(c => `\`${c}\``).join(', ')}`);
            }
            lines.push(`- ${copy.archive}: [${member.archive}](${path.posix.relative(`${constants_1.DIR_NAMES.DOCS}/features`, member.archive)})`);
            lines.push(`- ${copy.fullDetail}: \`ospec changes show ${path.posix.basename(member.archive)}\``);
            lines.push('');
        }
        return `${lines.join('\n').trimEnd()}\n`;
    }
    /**
     * Phase 3. The gate. Every gap is COLLECTED and listed rather than thrown on
     * the first one -- someone finishing a migration wants the whole remaining
     * list, not one item at a time.
     */
    async verify(projectRoot) {
        const gaps = [];
        const plan = await this.readPlan(projectRoot);
        if (!plan) {
            return {
                ok: false,
                gaps: [{ kind: 'unmapped-archive', detail: 'No migration plan found. Run "ospec docs migrate --plan --apply" first.' }],
                checked: { archives: 0, mapped: 0, historical: 0, features: 0 },
            };
        }
        // Rebuild the index so the verification runs against the current tree, and
        // so a duplicate slug or a malformed declaration surfaces HERE rather than
        // after the deletion.
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        let index = null;
        try {
            index = await services.indexBuilder.build(projectRoot);
        }
        catch (error) {
            gaps.push({ kind: 'index-rebuild', detail: `index rebuild failed: ${error?.message || error}` });
        }
        const featureDocs = index?.feature_docs || {};
        const declaredLastChanges = new Set();
        for (const entry of Object.values(featureDocs)) {
            const lastChange = String(entry?.last_change || '').trim();
            if (lastChange)
                declaredLastChanges.add(lastChange);
        }
        // The inventory is re-read rather than taken from the plan: the plan may be
        // hours old, and `finalize` deletes what the inventory holds NOW, so that
        // is the list this gate has to be answerable for.
        const legacyDocuments = (await this.inventory(projectRoot)).knowledge_documents;
        // 1. Every archive that has a legacy knowledge document must be mapped to
        //    a feature section, or explicitly declared historical.
        let mapped = 0;
        let historical = 0;
        const withLegacyDocument = plan.archives.filter(item => item.knowledge_document);
        for (const item of withLegacyDocument) {
            if (item.historical) {
                historical += 1;
                continue;
            }
            const archiveName = path.posix.basename(item.archive);
            if (declaredLastChanges.has(archiveName) || declaredLastChanges.has(item.archive)) {
                mapped += 1;
                continue;
            }
            gaps.push({
                kind: 'unmapped-archive',
                detail: `${item.archive} (${item.knowledge_document}) is not referenced by any <!-- ospec:last-change --> comment, and is not marked "historical": true in ${exports.MIGRATION_PLAN_FILE}.`,
            });
        }
        // 1b. Every INVENTORIED legacy document must belong to some archive.
        //
        // The two halves match differently: `inventory` finds a legacy document by
        // its `generator:` frontmatter, wherever it sits, while `legacyDocumentFor`
        // attaches it to an archive by reconstructing the exact path the deleted
        // generator would have used. A document the inventory found and the
        // attachment did not is therefore invisible to check 1 -- and `finalize`
        // deletes everything the INVENTORY holds. So without this, a project whose
        // documents sit anywhere unexpected (an older generator layout, or a human
        // who moved one) gets "PASS -- every old knowledge document is accounted
        // for" and then loses them, which is the deletion this pipeline exists to
        // prevent. Caught by driving phases 1-4 on a fixture whose documents were
        // flat rather than nested: verify reported 0 archives with a legacy
        // document, passed, and finalize still listed all three for deletion.
        const attached = new Set(plan.archives.map(item => item.knowledge_document).filter(Boolean));
        for (const document of legacyDocuments) {
            if (attached.has(document))
                continue;
            gaps.push({
                kind: 'unmapped-document',
                detail: `${document} is a generated knowledge document that no archived change claims, so nothing has carried its content forward -- but finalize would delete it. Move it to the path its archive expects, or delete it yourself if it is genuinely obsolete.`,
            });
        }
        // 2. No draft markers anywhere under docs/.
        for (const draft of await this.findDrafts(projectRoot)) {
            gaps.push({
                kind: 'draft-remaining',
                detail: `${draft} is still a migration draft (${exports.DRAFT_MARKER} or "status: draft").`,
            });
        }
        // 3. Slug uniqueness and index rebuild are both covered by the build above:
        //    a duplicate slug makes it throw, which lands in `index-rebuild`. The
        //    separate kind exists so the message can say which it was.
        if (index && Object.keys(featureDocs).length === 0 && withLegacyDocument.some(i => !i.historical)) {
            gaps.push({
                kind: 'duplicate-slug',
                detail: 'No feature declarations were found in the project, so nothing can be mapped. Phase 2 has not been done.',
            });
        }
        // 4. The catalogue, when the project has one.
        // Resolved through the project's layout, not joined onto the root. A
        // nested-layout project keeps its catalogue under `.ospec/`, so a
        // root-relative join finds nothing, and both readers below would then
        // silently do the wrong thing -- verify would skip its check and finalize
        // would conclude no catalogue exists. Same class of bug as the one the
        // FeatureCatalogPort read had.
        const catalogAbsolute = await this.resolve(projectRoot, FeatureCatalogPort_1.FEATURE_CATALOG_RELATIVE_PATH);
        if (await pathExists(catalogAbsolute)) {
            const catalog = await fs_1.promises.readFile(catalogAbsolute, 'utf8').catch(() => '');
            const missing = Object.keys(featureDocs).filter(slug => !catalog.includes(slug)).sort();
            if (missing.length > 0) {
                gaps.push({
                    kind: 'catalog',
                    detail: `${FeatureCatalogPort_1.FEATURE_CATALOG_RELATIVE_PATH} has no row for ${missing.join(', ')}. Run "ospec index build".`,
                });
            }
        }
        const ok = gaps.length === 0;
        if (ok) {
            await this.writeState(projectRoot, {
                ...(await this.readState(projectRoot)),
                version: '1.0',
                phase: 'verified',
                verified_at: new Date().toISOString(),
            });
        }
        return {
            ok,
            gaps,
            checked: {
                archives: withLegacyDocument.length,
                mapped,
                historical,
                features: Object.keys(featureDocs).length,
            },
        };
    }
    /** Every document under docs/ still carrying a draft marker. */
    async findDrafts(projectRoot) {
        const docsRoot = await this.resolve(projectRoot, constants_1.DIR_NAMES.DOCS);
        const found = [];
        const visit = async (dir) => {
            let entries;
            try {
                entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await visit(full);
                    continue;
                }
                if (!entry.name.endsWith('.md'))
                    continue;
                const raw = await fs_1.promises.readFile(full, 'utf8').catch(() => '');
                if (!raw)
                    continue;
                let isDraft = raw.includes(exports.DRAFT_MARKER);
                if (!isDraft) {
                    try {
                        isDraft = (0, helpers_1.parseFrontmatterDocument)(raw).data?.status === 'draft';
                    }
                    catch {
                        isDraft = false;
                    }
                }
                if (isDraft)
                    found.push(toRelative(projectRoot, full));
            }
        };
        await visit(docsRoot);
        return found.sort();
    }
    /**
     * Phase 4. Destructive, and gated twice: `verify` must have passed, and
     * `--apply` must be present.
     *
     * The deleted list is computed and RETURNED before anything is removed, so
     * the caller prints it and it reaches the completion record even if a delete
     * fails halfway. "Print and record before deleting" is the auditability
     * requirement, and doing it after would make the record a description of
     * what survived rather than of what was destroyed.
     */
    async finalize(projectRoot, options = {}) {
        const notes = [];
        const plan = await this.readPlan(projectRoot);
        if (!plan) {
            throw new Error('No migration plan found. Run "ospec docs migrate --plan --apply" first.');
        }
        const verification = await this.verify(projectRoot);
        if (!verification.ok) {
            const listed = verification.gaps.map(gap => `  - [${gap.kind}] ${gap.detail}`).join('\n');
            throw new Error(`Refusing to finalize: ${verification.gaps.length} gap(s) remain.\n${listed}\n`
                + 'Every old knowledge document must map to a feature section or be marked "historical": true before anything is deleted.');
        }
        const legacy = await this.inventory(projectRoot);
        const deleted = [...legacy.knowledge_documents];
        const kept = [];
        // feature-index.md: deleting it is 7.9's decision to offer, and track A's
        // 7.4 is what makes it a real decision. Before 7.4 the file was still
        // GENERATED, so deleting it would have been theatre -- the next index build
        // wrote it straight back. After 7.4 nothing regenerates it: an existing one
        // is frozen once into pure link lines, latched by `historical: true`, and a
        // project that never had one never gets one. So the deletion sticks.
        //
        // Both signals are checked rather than just one: the freeze latch is the
        // direct evidence, and an existing catalogue is the reason the file is
        // redundant. Either alone is enough.
        //
        // Neither present means the project has an unfrozen feature-index.md and no
        // catalogue -- it has not rebuilt its index since upgrading. The file is
        // kept, because the frozen render is what carries the archive links forward
        // and it has not been written yet.
        // Resolved through the project's layout, not joined onto the root. A
        // nested-layout project keeps its catalogue under `.ospec/`, so a
        // root-relative join finds nothing, and both readers below would then
        // silently do the wrong thing -- verify would skip its check and finalize
        // would conclude no catalogue exists. Same class of bug as the one the
        // FeatureCatalogPort read had.
        const catalogAbsolute = await this.resolve(projectRoot, FeatureCatalogPort_1.FEATURE_CATALOG_RELATIVE_PATH);
        const catalogExists = await pathExists(catalogAbsolute);
        if (legacy.feature_index) {
            const frozen = await this.isFrozenFeatureIndex(projectRoot, legacy.feature_index);
            if (frozen || catalogExists) {
                deleted.push(legacy.feature_index);
            }
            else {
                kept.push(legacy.feature_index);
                notes.push(`${legacy.feature_index} was kept: it has not been frozen yet and there is no ${FeatureCatalogPort_1.FEATURE_CATALOG_RELATIVE_PATH}, so this project has not rebuilt its index since upgrading. Run "ospec index build" -- it freezes this file into its archive-link form and writes the catalogue -- then re-run finalize, which will delete it.`);
            }
        }
        if (legacy.indexed_generated_documents.length > 0) {
            notes.push(`${legacy.indexed_generated_documents.length} generated document(s) still appear in the committed index's documents map; the rebuild below drops them.`);
        }
        if (!options.apply) {
            notes.push('Dry run. Re-run with --apply to delete these files.');
            return { applied: false, deleted: deleted.sort(), kept: kept.sort(), notes };
        }
        // Record BEFORE deleting.
        await this.writeState(projectRoot, {
            ...(await this.readState(projectRoot)),
            version: '1.0',
            phase: 'finalized',
            finalized_at: new Date().toISOString(),
            deleted_files: deleted.sort(),
        });
        for (const relativePath of deleted) {
            await fs_1.promises.rm(path.join(projectRoot, ...relativePath.split('/')), { force: true });
        }
        // Prune the directories the deleted documents lived in, but only when they
        // are empty -- a human-owned file down there keeps its directory.
        await this.pruneEmptyDirectories(path.join(await this.resolve(projectRoot, `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PROJECT}`), 'changes'));
        const { services } = await Promise.resolve().then(() => __importStar(require('./index')));
        await services.indexBuilder.write(projectRoot);
        return { applied: true, deleted: deleted.sort(), kept: kept.sort(), notes };
    }
    /**
     * True when feature-index.md has been frozen by track A's 7.4 -- it carries
     * `historical: true` in its frontmatter, which is the latch that stops the
     * index build regenerating it. A frozen file is safe to delete because
     * nothing will write it back.
     */
    async isFrozenFeatureIndex(projectRoot, relativePath) {
        try {
            const raw = await fs_1.promises.readFile(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
            return (0, helpers_1.parseFrontmatterDocument)(raw).data?.historical === true;
        }
        catch {
            return false;
        }
    }
    async pruneEmptyDirectories(root) {
        const visit = async (dir) => {
            let entries;
            try {
                entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            }
            catch {
                return false;
            }
            let empty = true;
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (!(await visit(path.join(dir, entry.name))))
                        empty = false;
                }
                else {
                    empty = false;
                }
            }
            if (empty) {
                await fs_1.promises.rmdir(dir).catch(() => undefined);
                return true;
            }
            return false;
        };
        await visit(root);
    }
    /**
     * What `ospec update` needs: is there anything to migrate? It MENTIONS the
     * command and never runs it -- an upgrade that silently deleted a project's
     * documents would be the worst possible reading of "update".
     */
    async detectUnmigrated(projectRoot) {
        const legacy = await this.inventory(projectRoot).catch(() => null);
        const knowledgeDocuments = legacy?.knowledge_documents.length || 0;
        return { found: knowledgeDocuments > 0, counts: { knowledgeDocuments } };
    }
}
exports.DocsMigrationService = DocsMigrationService;
/** The knowledge document a given archive would have had, if it is on disk. */
function legacyDocumentFor(archive, documents) {
    const normalized = archive.replace(/\\/g, '/').replace(/^\.\//, '');
    const marker = 'changes/archived/';
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex < 0)
        return null;
    const prefix = normalized.slice(0, markerIndex);
    const suffix = normalized.slice(markerIndex + marker.length);
    if (!suffix)
        return null;
    const expected = `${prefix}docs/project/changes/${suffix}.md`;
    return documents.includes(expected) ? expected : null;
}
/**
 * What the previous run would have inferred for an archive, so a re-plan can
 * tell "the engine guessed this" from "a person corrected it".
 */
function inferredGroupFor(prior) {
    return clusterArchive([...(prior.affects || []), ...(prior.target_files || [])]);
}
exports.docsMigrationService = new DocsMigrationService();
