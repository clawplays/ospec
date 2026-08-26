"use strict";
/**
 * 7.4. `docs/project/feature-catalog.md` -- one row per living feature.
 *
 * This replaces `feature-index.md`, and the difference is the whole point.
 * `feature-index.md` was keyed by ARCHIVED CHANGE: it grew one prose block per
 * archive forever, so it answered "what happened" and never answered "where is
 * the behaviour described". The catalogue is keyed by FEATURE SLUG, so it has
 * exactly as many rows as the project has features, and each row is a pointer
 * to the section that describes one.
 *
 * The row format is fixed here rather than at each call site because 7.7
 * (track C) rewrites affected rows at archive time and must not reimplement
 * it. `updateFeatureCatalogRows` at the bottom is that primitive.
 *
 * VERBATIM TWIN. The pure functions in this file are duplicated word for word
 * in `src/tools/build-index.ts`, which is copied out of the package into
 * `.ospec/tools/build-index-auto.cjs` where no relative require resolves back
 * here. `tests/services/p7-feature-catalog.test.mjs` compares the two copies
 * as text. Change both.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_CATALOG_RELATIVE_PATH = void 0;
exports.featureSummarySentence = featureSummarySentence;
exports.featureStatusFromSection = featureStatusFromSection;
exports.headingAnchor = headingAnchor;
exports.escapeTableCell = escapeTableCell;
exports.catalogRelativeLink = catalogRelativeLink;
exports.featureCatalogCopy = featureCatalogCopy;
exports.renderFeatureCatalog = renderFeatureCatalog;
exports.buildFeatureCatalogRow = buildFeatureCatalogRow;
exports.sliceSectionFromRaw = sliceSectionFromRaw;
exports.updateFeatureCatalogRows = updateFeatureCatalogRows;
exports.renderCatalogFromIndex = renderCatalogFromIndex;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const helpers_1 = require("../utils/helpers");
/** Repo-relative location of the generated catalogue. */
exports.FEATURE_CATALOG_RELATIVE_PATH = 'docs/project/feature-catalog.md';
const FEATURE_DOC_STATUS_VALUES = ['active', 'deprecated', 'removed'];
/* ── pure helpers, duplicated verbatim in src/tools/build-index.ts ─────── */
/**
 * The one-liner for a row: the section's first sentence, truncated at 120
 * characters.
 *
 * "First sentence" means the first sentence of the first PROSE paragraph --
 * the heading, the declaration comment, the traceability comment, and any
 * fenced block are not prose and describing a feature as "<!-- ospec:feature"
 * would make the catalogue useless. Truncation cuts on a word boundary when
 * one is available, because a row ending mid-word reads as corruption.
 */
function featureSummarySentence(sectionText, limit = 120) {
    const lines = String(sectionText ?? '').replace(/\r\n?/g, '\n').split('\n');
    const prose = [];
    let fenced = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(```|~~~)/.test(trimmed)) {
            fenced = !fenced;
            continue;
        }
        if (fenced)
            continue;
        if (!trimmed) {
            if (prose.length > 0)
                break;
            continue;
        }
        if (trimmed.startsWith('#'))
            continue;
        if (trimmed.startsWith('<!--'))
            continue;
        if (/^([-*+]|\d+\.)\s/.test(trimmed))
            continue;
        if (trimmed.startsWith('>'))
            continue;
        if (trimmed.startsWith('|'))
            continue;
        prose.push(trimmed);
    }
    const paragraph = prose.join(' ').replace(/\s+/g, ' ').trim();
    if (!paragraph)
        return '';
    // A sentence ends at `.`/`!`/`?` followed by whitespace or end of text. The
    // lookahead keeps `v1.2` and `e.g. x` from ending a sentence mid-token.
    const match = paragraph.match(/^.*?[.!?](?=\s|$)/);
    const sentence = (match ? match[0] : paragraph).trim();
    if (sentence.length <= limit)
        return sentence;
    const cut = sentence.slice(0, limit);
    const boundary = cut.lastIndexOf(' ');
    return `${(boundary > limit / 2 ? cut.slice(0, boundary) : cut).trimEnd()}...`;
}
/**
 * Reads `<!-- ospec:status <state> -->` from a section. An unknown or
 * absent state is `active`: a catalogue that refuses to render because someone
 * typed `depricated` is worse than one that renders the row and lets the
 * author see it is still listed as active.
 */
function featureStatusFromSection(sectionText) {
    const lines = String(sectionText ?? '').replace(/\r\n?/g, '\n').split('\n');
    for (const line of lines) {
        const match = line.trim().match(/^<!--\s*ospec:status\s+([a-z-]+)\s*-->$/);
        if (!match)
            continue;
        const value = match[1];
        if (FEATURE_DOC_STATUS_VALUES.includes(value))
            return value;
    }
    return 'active';
}
/**
 * GitHub-style heading anchor, for the href half of the section link.
 *
 * Unicode-aware: `\w` matched only `[A-Za-z0-9_]`, which deleted every CJK
 * character -- a pure-Chinese heading anchored to an empty `#` and a mixed one
 * to fragments like `#-http-`, so no rendered catalogue link could jump.
 * GitHub and VS Code both keep Unicode letters and digits; now so does this.
 */
function headingAnchor(heading) {
    return String(heading ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_\- ]+/gu, '')
        .replace(/\s+/g, '-');
}
/** A `|` inside a cell would end it; a newline would end the row. */
function escapeTableCell(value) {
    return String(value ?? '')
        .replace(/\r\n?/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\|/g, '\\|')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Posix-relative link from `docs/project/` to a repo-relative target. Written
 * out rather than delegated to `path.relative` so the twin in build-index.ts
 * produces identical text on Windows without a separator fixup.
 */
function catalogRelativeLink(fromDir, targetRepoPath) {
    const from = String(fromDir ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
    const to = String(targetRepoPath ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
    let shared = 0;
    while (shared < from.length && shared < to.length && from[shared] === to[shared])
        shared += 1;
    const up = new Array(from.length - shared).fill('..');
    const down = to.slice(shared);
    return [...up, ...down].join('/') || '.';
}
function featureCatalogCopy(documentLanguage) {
    if (documentLanguage === 'zh-CN') {
        return {
            title: '项目功能目录',
            guidance: '由 OSpec 从文档中的 `<!-- ospec:feature -->` 声明生成，请勿手工编辑。只读某一个功能的章节：`ospec docs locate --feature <slug>`。',
            empty: '尚未声明任何功能。在功能文档的章节标题下写 `<!-- ospec:feature <slug> -->` 即可登记。',
            columnFeature: '功能',
            columnSummary: '一句话说明',
            columnSection: '章节',
            columnStatus: '状态',
            columnLastChange: '最后变更',
            noSummary: '（该章节没有正文描述）',
            noLastChange: '—',
        };
    }
    if (documentLanguage === 'ja-JP') {
        return {
            title: 'プロジェクト機能カタログ',
            guidance: '文書内の `<!-- ospec:feature -->` 宣言から OSpec が生成します。手で編集しないでください。1 つの機能の節だけを読むには `ospec docs locate --feature <slug>` を使用します。',
            empty: 'まだ宣言された機能はありません。機能文書の見出しの下に `<!-- ospec:feature <slug> -->` を書くと登録されます。',
            columnFeature: '機能',
            columnSummary: '一文の説明',
            columnSection: '節',
            columnStatus: '状態',
            columnLastChange: '最終変更',
            noSummary: '(この節に本文の説明がありません)',
            noLastChange: '—',
        };
    }
    if (documentLanguage === 'ar') {
        return {
            title: 'فهرس ميزات المشروع',
            guidance: 'يُنشئه OSpec من إعلانات `<!-- ospec:feature -->` في وثائق المشروع؛ لا تحرره يدوياً. لقراءة قسم ميزة واحدة فقط استخدم `ospec docs locate --feature <slug>`.',
            empty: 'لا توجد ميزات معلنة بعد. اكتب `<!-- ospec:feature <slug> -->` تحت عنوان القسم لتسجيلها.',
            columnFeature: 'الميزة',
            columnSummary: 'وصف بجملة واحدة',
            columnSection: 'القسم',
            columnStatus: 'الحالة',
            columnLastChange: 'آخر تغيير',
            noSummary: '(لا يوجد نص وصفي في هذا القسم)',
            noLastChange: '—',
        };
    }
    return {
        title: 'Project Feature Catalog',
        guidance: 'Generated by OSpec from the `<!-- ospec:feature -->` declarations in the project documents; do not edit by hand. To read one feature\'s section instead of this file, run `ospec docs locate --feature <slug>`.',
        empty: 'No features declared yet. Write `<!-- ospec:feature <slug> -->` under a section heading to register one.',
        columnFeature: 'Feature',
        columnSummary: 'One line',
        columnSection: 'Section',
        columnStatus: 'Status',
        columnLastChange: 'Last change',
        noSummary: '(no prose description in this section)',
        noLastChange: '—',
    };
}
/**
 * THE row format. One line per feature: slug, one sentence, `doc#section`
 * link, status, last-change archive link.
 *
 * `archiveLinks` maps an archive NAME to its repo-relative archive directory,
 * so a row can link the archive that last touched the feature. A name with no
 * entry falls back to the conventional `changes/archived/<name>` -- the link
 * may dangle, and a dangling link to the right place beats no link at all.
 */
function renderFeatureCatalog(rows, copy, archiveLinks = {}, 
// The catalogue's own repo-relative directory, which every href is relative
// to. Hardcoding the classic location made every nested-layout link resolve
// through a doubled `.ospec/` and 404 -- the caller resolves the real
// location through the project layout. Classic output is unchanged: from
// `docs/project` and `.ospec/docs/project` alike, a sibling feature document
// renders as `../features/<file>`.
catalogDir = 'docs/project') {
    const lines = [
        '---',
        'name: project-feature-catalog',
        `title: ${copy.title}`,
        'tags: [project, features, catalog, ai-index]',
        'generated: true',
        '---',
        '',
        `# ${copy.title}`,
        '',
        `> ${copy.guidance}`,
        '',
    ];
    if (rows.length === 0) {
        lines.push(copy.empty, '');
        return `${lines.join('\n').trimEnd()}\n`;
    }
    lines.push(`| ${copy.columnFeature} | ${copy.columnSummary} | ${copy.columnSection} | ${copy.columnStatus} | ${copy.columnLastChange} |`, '| --- | --- | --- | --- | --- |');
    for (const row of rows) {
        const sectionHref = `${catalogRelativeLink(catalogDir, row.file)}#${headingAnchor(row.heading)}`;
        const section = `[${escapeTableCell(row.location)}](${sectionHref})`;
        const summary = escapeTableCell(row.summary) || copy.noSummary;
        // The href targets the archive's proposal.md, not the archive directory:
        // an editor's markdown link cannot open a directory (VS Code reports
        // "cannot open directory" and jumps nowhere), and proposal.md is the one
        // file every archive is guaranteed to carry -- the archive action moves it
        // there. The fallback for an unindexed name is resolved through the same
        // managed prefix as the catalogue itself (catalogDir is always
        // `<prefix>docs/project` by construction), because the bare classic path
        // walked OUT of `.ospec/` on a nested project. It may still dangle; a
        // dangling link to the right FILE path beats one nothing can open.
        const managedPrefix = catalogDir.replace(/docs\/project$/, '');
        const lastChange = row.lastChange
            ? `[${escapeTableCell(row.lastChange)}](${catalogRelativeLink(catalogDir, `${archiveLinks[row.lastChange] || `${managedPrefix}changes/archived/${row.lastChange}`}/proposal.md`)})`
            : copy.noLastChange;
        // The kind rides in the status cell (CLI vocabulary, English like the
        // status values), NOT in the slug cell: readCatalogRows extracts the slug
        // from the backticked first cell, and the archive-time row assertion
        // matches on it exactly. Feature rows are unchanged, so a pre-P8
        // catalogue diff stays empty.
        const status = row.kind && row.kind !== 'feature' ? `${row.status} · ${row.kind}` : row.status;
        lines.push(`| \`${escapeTableCell(row.slug)}\` | ${summary} | ${section} | ${status} | ${lastChange} |`);
    }
    lines.push('');
    return `${lines.join('\n').trimEnd()}\n`;
}
/**
 * Build one row from a feature entry and the text of its section.
 *
 * `sectionText` is the slice `body.slice(entry.start, entry.end)` in the
 * contract's coordinate space (4). Passing the raw file instead gives the
 * wrong text on any CRLF checkout.
 */
function buildFeatureCatalogRow(entry, sectionText) {
    return {
        slug: entry.slug,
        heading: entry.heading,
        file: entry.file,
        location: `${entry.file}#${entry.heading}`,
        summary: featureSummarySentence(sectionText),
        status: featureStatusFromSection(sectionText),
        kind: entry.kind ?? 'feature',
        lastChange: typeof entry.last_change === 'string' ? entry.last_change : '',
    };
}
/**
 * Slice one feature's section out of a document's raw contents, in the
 * contract's coordinate space. Returns '' when the offsets do not fit the
 * document, which happens when the index is stale relative to the file.
 */
function sliceSectionFromRaw(rawContent, entry) {
    const raw = String(rawContent ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const body = (0, helpers_1.parseFrontmatterDocument)(raw).content;
    const start = Number(entry?.start);
    const end = Number(entry?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end))
        return '';
    if (start < 0 || end < start || end > body.length)
        return '';
    return body.slice(start, end);
}
/* ── the primitive track C calls at archive time ──────────────────────── */
function compareSlugs(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
async function readJsonQuietly(target) {
    try {
        const raw = await fs_1.promises.readFile(target, 'utf8');
        return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    }
    catch {
        return null;
    }
}
/**
 * Regenerate `docs/project/feature-catalog.md`, forcing `last_change` to
 * `archiveName` for the named slugs.
 *
 * This is the primitive 7.7 calls at archive time, and the forcing is why it
 * exists: at that moment the index has not been rebuilt and the
 * `<!-- ospec:last-change -->` comment may not be written yet, so a plain
 * regeneration would emit the PREVIOUS archive for the features this change
 * just touched. Passing the archive name makes the row correct immediately;
 * the next index rebuild reaches the same answer from the document.
 *
 * It never throws. An archive must not fail because a catalogue row could not
 * be refreshed, so everything recoverable comes back in `warnings` and
 * `missing` (7.7's rule: warn, do not block).
 */
async function updateFeatureCatalogRows(projectRoot, options = {}) {
    const requested = Array.from(new Set((options.slugs || []).map(slug => String(slug || '').trim()).filter(Boolean)));
    const archiveName = String(options.archiveName || '').trim();
    const result = {
        path: exports.FEATURE_CATALOG_RELATIVE_PATH,
        written: false,
        rows: 0,
        updated: [],
        missing: [],
        warnings: [],
    };
    try {
        const config = await readJsonQuietly(path_1.default.join(projectRoot, constants_1.FILE_NAMES.SKILLRC));
        const indexPath = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, constants_1.FILE_NAMES.SKILL_INDEX, config);
        const index = await readJsonQuietly(indexPath);
        if (!index) {
            result.warnings.push(`${constants_1.FILE_NAMES.SKILL_INDEX} is missing or unreadable; the catalogue was left alone.`);
            return result;
        }
        const catalogPath = (0, ProjectLayout_1.resolveManagedPath)(projectRoot, exports.FEATURE_CATALOG_RELATIVE_PATH, config);
        result.path = path_1.default.relative(projectRoot, catalogPath).replace(/\\/g, '/');
        const previous = await fs_1.promises.readFile(catalogPath, 'utf8').catch(() => null);
        const { content, rows } = await renderCatalogFromIndex(projectRoot, config, index, {
            forcedLastChange: archiveName ? { slugs: requested, archiveName } : null,
            warnings: result.warnings,
        });
        result.rows = rows.length;
        const known = new Set(rows.map(row => row.slug));
        result.missing = requested.filter(slug => !known.has(slug)).sort(compareSlugs);
        for (const slug of result.missing) {
            result.warnings.push(`feature "${slug}" has no <!-- ospec:feature --> declaration; no catalogue row was written for it.`);
        }
        // "Updated" means the row's TEXT changed, not that it was requested --
        // reporting a no-op as an update would make 7.7's log lie.
        const previousRows = new Map(rowLinesBySlug(previous || ''));
        const nextRows = new Map(rowLinesBySlug(content));
        result.updated = requested
            .filter(slug => known.has(slug) && previousRows.get(slug) !== nextRows.get(slug))
            .sort(compareSlugs);
        if (previous !== content) {
            await fs_1.promises.mkdir(path_1.default.dirname(catalogPath), { recursive: true });
            await fs_1.promises.writeFile(catalogPath, content, 'utf8');
            result.written = true;
        }
    }
    catch (error) {
        result.warnings.push(`feature catalogue update failed: ${error?.message || error}`);
    }
    return result;
}
/** Row lines keyed by slug, for a text-level before/after comparison. */
function rowLinesBySlug(content) {
    return String(content ?? '')
        .split('\n')
        .map(line => {
        const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
        return match ? [match[1], line] : null;
    })
        .filter((entry) => entry !== null);
}
/**
 * Shared rendering path: read every declared feature's document once, slice
 * each section, and render. Used by `updateFeatureCatalogRows` and by
 * `IndexBuilder.writeFeatureCatalog`.
 */
async function renderCatalogFromIndex(projectRoot, config, index, options = {}) {
    const featureDocs = index?.feature_docs && typeof index.feature_docs === 'object'
        ? index.feature_docs
        : {};
    const forced = options.forcedLastChange;
    const forcedSlugs = new Set(forced ? forced.slugs : []);
    const documentCache = new Map();
    const rows = [];
    for (const slug of Object.keys(featureDocs).sort(compareSlugs)) {
        const entry = featureDocs[slug];
        if (!entry || typeof entry !== 'object')
            continue;
        const file = String(entry.file || '');
        if (!documentCache.has(file)) {
            const absolute = path_1.default.join(projectRoot, ...file.split('/'));
            documentCache.set(file, await fs_1.promises.readFile(absolute, 'utf8').catch(() => null));
        }
        const raw = documentCache.get(file);
        if (raw === null || raw === undefined) {
            options.warnings?.push(`feature "${slug}" points at ${file}, which could not be read; its row has no description.`);
        }
        const row = buildFeatureCatalogRow(entry, raw ? sliceSectionFromRaw(raw, entry) : '');
        if (forced && forcedSlugs.has(slug))
            row.lastChange = forced.archiveName;
        rows.push(row);
    }
    const archiveLinks = {};
    for (const change of Array.isArray(index?.archived_changes) ? index.archived_changes : []) {
        const name = String(change?.feature || '');
        const archive = String(change?.archive || '');
        if (name && archive)
            archiveLinks[name] = archive;
    }
    const copy = featureCatalogCopy(config?.documentLanguage);
    const catalogDir = path_1.default
        .relative(projectRoot, path_1.default.dirname((0, ProjectLayout_1.resolveManagedPath)(projectRoot, exports.FEATURE_CATALOG_RELATIVE_PATH, config)))
        .replace(/\\/g, '/');
    return { content: renderFeatureCatalog(rows, copy, archiveLinks, catalogDir), rows };
}
