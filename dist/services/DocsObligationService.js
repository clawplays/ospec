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
exports.DocsObligationService = exports.DOCS_OBLIGATION_CHANGE_TYPES = void 0;
exports.resolveFeaturesFromAffects = resolveFeaturesFromAffects;
exports.createDocsObligationService = createDocsObligationService;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const helpers_1 = require("../utils/helpers");
const FeatureLocator_1 = require("./FeatureLocator");
const SkillParser_1 = require("./SkillParser");
/**
 * Phase 7.6 -- the localised documentation-obligation engine.
 *
 * At planning time this turns a change's `change_type` plus its captured
 * feature slugs (7.5) into obligations that already carry the resolved
 * `path#section`. The point is that the AI never has to search for where to
 * write: the target is decided once, by the engine, from the index.
 *
 * Three properties are load-bearing and each is pinned by a test:
 *
 *  1. SATISFACTION IS COMPUTED FROM A BASELINE, NOT SELF-DECLARED. Every
 *     obligation records the hash of its target section AT GENERATION TIME.
 *     "Satisfied" means the section moved away from that baseline. Without the
 *     baseline the only available check would be "the file exists", which is
 *     the check-that-checks-nothing this project keeps shipping.
 *
 *  2. ONE EVALUATOR, TWO MODES. `evaluate()` does not know what mode is
 *     configured; it returns `satisfied | unsatisfied` per obligation.
 *     `applyMode()` maps that onto pass/warn/fail afterwards. Warn and strict
 *     therefore cannot disagree about WHETHER an obligation is met -- only
 *     about what that costs. Two independent inferences would drift.
 *
 *  3. A VERIFICATION-TYPE OBLIGATION ACCEPTS ZERO DIFF PLUS AN EXPLICIT
 *     CONFIRMATION. Refactors must be able to say "I looked, it is still
 *     accurate" without making a cosmetic edit. `verified_unchanged: true` is
 *     that statement, and it is stored because it is not observable from the
 *     filesystem. It is accepted ONLY for `verification_only` obligations.
 */
/** The design doc 3 vocabulary, plus the legacy set the validator already had. */
const LEGACY_CHANGE_TYPE_ALIASES = {
    bugfix: 'fix',
    maintenance: 'refactor',
};
exports.DOCS_OBLIGATION_CHANGE_TYPES = [
    'feature', 'fix', 'refactor', 'perf', 'deprecate', 'remove', 'docs',
];
function copy(language, table) {
    if (language === 'zh-CN')
        return table.zh;
    if (language === 'ja-JP')
        return table.ja;
    if (language === 'ar')
        return table.ar;
    return table.en;
}
/**
 * The wording an AI reads, in all four supported document languages (G2). The
 * text is deliberately imperative and names the exact target, because this
 * string is the whole instruction -- there is no second place to look.
 */
const OBLIGATION_COPY = {
    update_section: {
        zh: '更新 {target}：描述该功能修改后的行为与逻辑流程。',
        en: 'Update {target}: describe this feature\'s behaviour and logic flow as it now works.',
        ja: '{target} を更新し、この機能の変更後の挙動とロジックフローを記述する。',
        ar: 'حدّث {target}: صف سلوك هذه الميزة وتدفقها المنطقي بصيغته الحالية.',
    },
    create_section: {
        zh: '在 {target} 新建功能节：写明行为与流程，并加上 <!-- ospec:feature --> 声明和 code: 路径。',
        en: 'Create the feature section at {target}: write its behaviour and flow, and add the <!-- ospec:feature --> declaration with its code: paths.',
        ja: '{target} に機能セクションを新設し、挙動とフローを記述して <!-- ospec:feature --> 宣言と code: パスを追加する。',
        ar: 'أنشئ قسم الميزة في {target}: اكتب سلوكها وتدفقها، وأضف إعلان <!-- ospec:feature --> مع مسارات code:.',
    },
    correct_section: {
        zh: '打开 {target}，核对文档描述的行为是否是修复前的错误行为；是则改为修复后的逻辑。文档未提及且行为对外可见时补一句。',
        en: 'Open {target} and check whether the documented behaviour is the pre-fix wrong behaviour; if it is, correct it to the fixed logic. If the behaviour is user-visible and undocumented, add a sentence.',
        ja: '{target} を開き、記載された挙動が修正前の誤った挙動かを確認する。該当すれば修正後のロジックに直す。未記載かつ外部から見える挙動なら一文を追加する。',
        ar: 'افتح {target} وتحقق مما إذا كان السلوك الموثّق هو السلوك الخاطئ قبل الإصلاح؛ إن كان كذلك فصحّحه إلى المنطق بعد الإصلاح. وإذا كان السلوك مرئيًا للمستخدم وغير موثّق فأضف جملة.',
    },
    verify_section: {
        zh: '行为未变：核对 {target} 仍然准确，并更新 code: 路径引用。确认无需修改时记录 verified_unchanged。',
        en: 'Behaviour is unchanged: confirm {target} is still accurate and update its code: path references. Record verified_unchanged when no edit is needed.',
        ja: '挙動は不変：{target} が依然として正確かを確認し、code: パス参照を更新する。修正不要なら verified_unchanged を記録する。',
        ar: 'السلوك لم يتغيّر: تأكّد من أن {target} ما زال دقيقًا وحدّث مراجع مسارات code:. سجّل verified_unchanged عند عدم الحاجة لأي تعديل.',
    },
    verify_decision: {
        zh: '核对 {target}：确认该设计决策在本次变更后仍然成立；若已被推翻或修改，在该节标记 Superseded 并链接替代方案或归档。确认无需修改时记录 verified_unchanged。',
        en: 'Check {target}: confirm the design decision still holds after this change; if it was overturned or amended, mark the section Superseded and link the replacement. Record verified_unchanged when no edit is needed.',
        ja: '{target} を確認し、本変更後もこの設計判断が成立しているかを確かめる。覆された・修正された場合は該当節に Superseded を記し、代替案や archive をリンクする。修正不要なら verified_unchanged を記録する。',
        ar: 'راجع {target}: تأكد أن قرار التصميم ما زال قائمًا بعد هذا التغيير؛ وإن نُقض أو عُدّل فضع علامة Superseded في القسم واربط البديل. سجّل verified_unchanged عند عدم الحاجة لأي تعديل.',
    },
    verify_structure: {
        zh: '核对 {target}：确认架构/模块结构描述在本次变更后仍然准确；新增或移除模块时更新该节。确认无需修改时记录 verified_unchanged。',
        en: 'Check {target}: confirm the architecture/module overview is still accurate after this change; update it when a module was added or removed. Record verified_unchanged when no edit is needed.',
        ja: '{target} を確認し、本変更後もアーキテクチャ／モジュール構成の記述が正確かを確かめる。モジュールの追加・削除があれば更新する。修正不要なら verified_unchanged を記録する。',
        ar: 'راجع {target}: تأكد أن وصف البنية/الوحدات ما زال دقيقًا بعد هذا التغيير؛ وحدّثه عند إضافة وحدة أو إزالتها. سجّل verified_unchanged عند عدم الحاجة لأي تعديل.',
    },
    mark_status: {
        zh: '在 {target} 标记该功能的状态（deprecated / removed），并同步功能目录。',
        en: 'Mark this feature\'s status (deprecated / removed) at {target}, and sync the feature catalogue.',
        ja: '{target} で該当機能の状態（deprecated / removed）を明示し、機能カタログを同期する。',
        ar: 'حدّد حالة هذه الميزة (deprecated / removed) في {target}، وزامن فهرس الميزات.',
    },
    edit: {
        zh: '编辑 {target}：本次变更的目标即文档本身。',
        en: 'Edit {target}: the documentation edit is itself the goal of this change.',
        ja: '{target} を編集する：本変更の目的は文書そのものである。',
        ar: 'حرّر {target}: تعديل الوثيقة هو هدف هذا التغيير نفسه.',
    },
};
const NO_DOCUMENT_SUGGESTION = {
    zh: '该变更没有对应的功能文档，义务已降级为可选。若这段行为值得长期记录，建议在 {target} 建档；琐碎修复可以直接跳过。',
    en: 'This change has no feature document, so the obligation is optional. If the behaviour is worth recording long-term, consider creating {target}; a trivial fix may simply skip it.',
    ja: 'この変更に対応する機能文書がないため、義務は任意に降格された。長期的に記録する価値がある挙動なら {target} の新規作成を検討する。些細な修正はスキップしてよい。',
    ar: 'لا يوجد مستند ميزة لهذا التغيير، لذا صار الالتزام اختياريًا. إذا كان السلوك جديرًا بالتوثيق طويل الأمد ففكّر في إنشاء {target}؛ أما الإصلاح البسيط فيمكن تخطيه.',
};
/**
 * The `affects` fallback: which declared features' `code:` prefixes cover the
 * paths this change says it touches.
 *
 * `features:` is the AI's confirmed declaration and stays authoritative -- this
 * is consulted ONLY when that list is empty. Without it, a change whose
 * `affects` lands squarely inside a documented feature still generated the
 * degraded optional obligation, because the engine read one field and never
 * looked at the other -- the exact information was already on disk, resolvable
 * by `docs locate --affects`, and ignored. Matching reuses `codePrefixMatches`
 * so this cannot drift from what `docs locate` would answer for the same path.
 */
function resolveFeaturesFromAffects(affects, featureDocs) {
    const slugs = new Set();
    for (const affected of affects ?? []) {
        if (!String(affected || '').trim())
            continue;
        for (const [slug, entry] of Object.entries(featureDocs ?? {})) {
            const prefixes = Array.isArray(entry?.code) ? entry.code : [];
            if (prefixes.some(prefix => (0, FeatureLocator_1.codePrefixMatches)(String(prefix), affected))) {
                slugs.add(entry.slug || slug);
            }
        }
    }
    return Array.from(slugs).sort();
}
class DocsObligationService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    /** Fold the legacy vocabulary onto the design-doc 3 vocabulary. */
    normalizeChangeType(changeType) {
        const normalized = String(changeType || '').trim().toLowerCase();
        return LEGACY_CHANGE_TYPE_ALIASES[normalized] ?? normalized;
    }
    /**
     * The change_type -> obligation table from the design doc 3.
     *
     * Note what is deliberately NOT here: an `unclassified` fallback that invents
     * a required obligation. An unrecognised change_type produces NO obligation,
     * because guessing a target would point the AI at the wrong section, and a
     * confidently wrong location is worse than none.
     */
    generate(input) {
        const changeType = this.normalizeChangeType(input.changeType);
        const language = input.language;
        const featureDocs = input.featureDocs ?? {};
        const slugs = Array.from(new Set((input.features ?? []).filter(Boolean)));
        const resolved = slugs
            .map(slug => ({ slug, entry: featureDocs[slug] }))
            .filter((item) => Boolean(item.entry));
        const unresolved = slugs.filter(slug => !featureDocs[slug]);
        /**
         * The binding's documentation kind decides which CONTRACT it carries.
         * `feature` and `api` sections describe living behaviour, so the
         * change_type table below applies to them unchanged. A `design` section is
         * a decision -- it is never "updated to the new behaviour", it either
         * still holds or is superseded, so every code change type maps to one
         * verification-type obligation. `project` overviews verify the same way.
         * `planning` and `product` documents are reference material and get NO
         * obligation: forcing them to move with code is exactly the documentation
         * bloat the fix degradation exists to avoid. A missing kind is a pre-2.1
         * index, which only ever indexed feature documents.
         */
        const contractOf = (entry) => {
            const kind = entry.kind ?? 'feature';
            if (kind === 'planning' || kind === 'product')
                return 'none';
            if (kind === 'design')
                return 'decision';
            if (kind === 'project')
                return 'structure';
            return 'behaviour';
        };
        const behaviourBound = resolved.filter(item => contractOf(item.entry) === 'behaviour');
        const decisionBound = resolved.filter(item => contractOf(item.entry) === 'decision');
        const structureBound = resolved.filter(item => contractOf(item.entry) === 'structure');
        const obligations = [];
        const push = (kind, level, targetPath, section, feature, suggestion) => {
            const target = section ? `${targetPath}#${section}` : targetPath;
            obligations.push({
                id: `docs-${obligations.length + 1}`,
                change_type: changeType,
                kind,
                level,
                ...(feature ? { feature } : {}),
                path: targetPath,
                section,
                target,
                verification_only: kind === 'verify_section' || kind === 'verify_decision' || kind === 'verify_structure',
                reason: copy(language, OBLIGATION_COPY[kind]).replace('{target}', target),
                ...(suggestion ? { suggestion } : {}),
            });
        };
        /** Where a feature that has no document yet would plausibly be written. */
        const draftPathFor = (slug) => `docs/features/${slug}.md`;
        switch (changeType) {
            case 'feature': {
                for (const { slug, entry } of behaviourBound) {
                    push('update_section', 'required', entry.file, entry.heading, slug);
                }
                for (const slug of unresolved) {
                    push('create_section', 'required', draftPathFor(slug), '', slug);
                }
                // A feature change with NO behaviour-contract binding is the
                // brand-new-feature case, and it still owes a document. This fires on
                // an empty `features:` -- the omission hole -- and equally when every
                // declared slug resolved to a planning/product/design/project
                // binding: verifying an ADR is not documenting the new behaviour, so
                // reference-kind slugs must not become the opt-out the empty list was
                // barred from being. That is the hole the `fix` degradation below is
                // deliberately NOT: a fix may skip documentation, a new feature may
                // not.
                if (behaviourBound.length === 0 && unresolved.length === 0) {
                    push('create_section', 'required', draftPathFor(this.slugify(input.changeName) || 'untitled'), '', undefined);
                }
                break;
            }
            case 'fix': {
                for (const { slug, entry } of behaviourBound) {
                    push('correct_section', 'required', entry.file, entry.heading, slug);
                }
                // The deliberate degradation. A fix with no feature document must not
                // be forced to invent one -- that is documentation bloat, and the plan
                // calls it out by name. The obligation still EXISTS so the suggestion
                // is delivered; it is simply optional, and optional never fails a gate.
                for (const slug of unresolved) {
                    push('create_section', 'optional', draftPathFor(slug), '', slug, copy(language, NO_DOCUMENT_SUGGESTION).replace('{target}', draftPathFor(slug)));
                }
                // Same trigger shape as the feature branch above: no
                // behaviour-contract binding at all, whether by omission or because
                // every declared slug resolved to a reference-kind document.
                if (behaviourBound.length === 0 && unresolved.length === 0) {
                    const draft = draftPathFor(this.slugify(input.changeName) || 'untitled');
                    push('create_section', 'optional', draft, '', undefined, copy(language, NO_DOCUMENT_SUGGESTION).replace('{target}', draft));
                }
                break;
            }
            case 'refactor':
            case 'perf': {
                // Verification-type: cost is near zero and zero diff is a legal result.
                for (const { slug, entry } of behaviourBound) {
                    push('verify_section', 'required', entry.file, entry.heading, slug);
                }
                break;
            }
            case 'deprecate':
            case 'remove': {
                for (const { slug, entry } of behaviourBound) {
                    push('mark_status', 'required', entry.file, entry.heading, slug);
                }
                break;
            }
            case 'docs': {
                // The edit is itself the goal for every kind that carries a contract.
                // Planning and product bindings stay reference material even here --
                // one rule, no exceptions, so the "planning/product generate no
                // obligation" statement in the protocol stays literally true.
                for (const { slug, entry } of [...behaviourBound, ...decisionBound, ...structureBound]) {
                    push('edit', 'required', entry.file, entry.heading, slug);
                }
                break;
            }
            default:
                break;
        }
        // Decision and structure bindings verify under EVERY code change type:
        // the question "does this still hold?" is the same whether the code moved
        // for a feature, a fix or a refactor. Zero diff plus `ospec docs confirm`
        // satisfies them, so the cost of a held decision is one command.
        if (['feature', 'fix', 'refactor', 'perf', 'deprecate', 'remove'].includes(changeType)) {
            for (const { slug, entry } of decisionBound) {
                push('verify_decision', 'required', entry.file, entry.heading, slug);
            }
            for (const { slug, entry } of structureBound) {
                push('verify_structure', 'required', entry.file, entry.heading, slug);
            }
        }
        return obligations;
    }
    slugify(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    /**
     * Hash the obligation's target SECTION, not the whole file. A feature
     * document holds many features; hashing the file would mark every obligation
     * in it satisfied the moment a single unrelated section was touched -- a gate
     * that passes for work that was never done.
     *
     * Falls back to the whole body when the section cannot be located, and
     * returns null when the file does not exist.
     */
    async hashTarget(projectRoot, obligation) {
        const resolved = this.resolveSafe(projectRoot, obligation.path);
        if (!resolved || !(await this.fileService.exists(resolved)))
            return null;
        let raw;
        try {
            raw = await this.fileService.readFile(resolved);
        }
        catch {
            return null;
        }
        const body = (0, helpers_1.parseFrontmatterDocument)(raw.replace(/\r\n?/g, '\n')).content;
        let slice = body;
        if (obligation.feature) {
            try {
                const declaration = (0, SkillParser_1.parseFeatureDeclarations)(body, obligation.path)
                    .find(entry => entry.slug === obligation.feature);
                if (declaration)
                    slice = body.slice(declaration.start, declaration.end);
            }
            catch {
                // A malformed declaration elsewhere in the file must not make the gate
                // unevaluable; fall back to the whole body, which is stricter, not
                // looser -- it can only report MORE change, never less.
            }
        }
        return (0, crypto_1.createHash)('sha256')
            .update(slice.split('\n').map(line => line.trimEnd()).join('\n').trim(), 'utf8')
            .digest('hex');
    }
    resolveSafe(projectRoot, relativePath) {
        const normalized = String(relativePath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
        if (!normalized || path.isAbsolute(normalized))
            return null;
        const resolved = path.resolve(projectRoot, ...normalized.split('/'));
        const relative = path.relative(projectRoot, resolved);
        return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
            ? resolved
            : null;
    }
    /** Stamp each obligation with the state of its target at planning time. */
    async captureBaselines(projectRoot, obligations) {
        const stamped = [];
        for (const obligation of obligations) {
            const hash = await this.hashTarget(projectRoot, obligation);
            stamped.push({
                ...obligation,
                baseline: {
                    exists: hash !== null,
                    section_hash: hash,
                    captured_at: new Date().toISOString(),
                },
            });
        }
        return stamped;
    }
    /**
     * THE single satisfaction decision. Mode-blind by construction: nothing in
     * this method reads `docs_contract.mode`, so warn and strict cannot form
     * different opinions about whether an obligation was met.
     */
    async evaluate(input) {
        const verdicts = [];
        for (const obligation of input.obligations ?? []) {
            const current = await this.hashTarget(input.projectRoot, obligation);
            const baseline = obligation.baseline;
            const confirmedUnchanged = obligation.evidence?.verified_unchanged === true;
            // A verification-type obligation is the ONLY one that a zero diff can
            // satisfy, and only with the explicit confirmation alongside it.
            if (obligation.verification_only && confirmedUnchanged) {
                verdicts.push({
                    id: obligation.id,
                    level: obligation.level,
                    status: 'satisfied',
                    message: `${obligation.target}: confirmed still accurate with no edit required (verified_unchanged).`,
                });
                continue;
            }
            // `verified_unchanged` on a non-verification obligation is refused, not
            // ignored. Silently accepting it would turn every obligation into a
            // self-certified one, which is the gate-that-checks-nothing failure.
            if (!obligation.verification_only && confirmedUnchanged) {
                verdicts.push({
                    id: obligation.id,
                    level: obligation.level,
                    status: 'unsatisfied',
                    message: `${obligation.target}: verified_unchanged is only accepted for verification-type obligations; a ${obligation.kind} obligation needs a real edit.`,
                });
                continue;
            }
            if (!baseline) {
                verdicts.push({
                    id: obligation.id,
                    level: obligation.level,
                    status: 'unsatisfied',
                    message: `${obligation.target}: no planning-time baseline was recorded, so this obligation cannot be verified. Regenerate obligations for this change.`,
                });
                continue;
            }
            const changed = baseline.exists
                ? current !== null && current !== baseline.section_hash
                : current !== null;
            verdicts.push({
                id: obligation.id,
                level: obligation.level,
                status: changed ? 'satisfied' : 'unsatisfied',
                message: changed
                    ? `${obligation.target}: documentation changed since the obligation was recorded.`
                    : baseline.exists
                        ? `${obligation.target}: unchanged since the obligation was recorded, and no explicit confirmation was given.`
                        : `${obligation.target}: still does not exist.`,
            });
        }
        return verdicts;
    }
    /**
     * Map verdicts onto gate checks. This is the ONLY place `mode` is read.
     *
     * `warn` is the default for one release cycle: a gate that blocks on day one
     * is a gate that gets worked around, and the obligation list has to earn
     * trust on real projects before it can refuse an archive.
     */
    applyMode(verdicts, mode) {
        if (verdicts.length === 0) {
            return [{
                    name: 'docs_obligations',
                    status: 'pass',
                    message: 'No documentation obligations were generated for this change.',
                }];
        }
        return verdicts.map(verdict => ({
            name: `docs_obligations.${verdict.id}`,
            status: verdict.status === 'satisfied'
                ? 'pass'
                // An optional obligation NEVER fails, in either mode. That is what
                // makes a fix with no feature document archivable.
                : verdict.level === 'optional'
                    ? 'warn'
                    : mode === 'strict' ? 'fail' : 'warn',
            message: verdict.status === 'satisfied'
                ? verdict.message
                : `${verdict.message}${verdict.level === 'optional'
                    ? ' (optional)'
                    : mode === 'strict' ? '' : ' (docs_contract.mode is warn; set it to strict to block archiving)'}`,
        }));
    }
}
exports.DocsObligationService = DocsObligationService;
function createDocsObligationService(fileService) {
    return new DocsObligationService(fileService);
}
