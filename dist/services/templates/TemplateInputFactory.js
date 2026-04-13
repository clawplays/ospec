"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateInputFactory = void 0;
const constants_1 = require("../../core/constants");
class TemplateInputFactory {
    normalizeFeatureTemplateInput(input) {
        if (typeof input === 'string') {
            const englishDefaults = this.getFeatureDefaults('en-US');
            return {
                feature: input,
                mode: 'standard',
                placement: 'active',
                affects: [],
                flags: [],
                optionalSteps: [],
                background: englishDefaults.background,
                goals: [...englishDefaults.goals],
                inScope: [...englishDefaults.inScope],
                outOfScope: [...englishDefaults.outOfScope],
                acceptanceCriteria: [...englishDefaults.acceptanceCriteria],
                projectContext: this.normalizeFeatureProjectContext(),
                documentLanguage: 'en-US',
                projectRoot: undefined,
                documentPath: undefined,
            };
        }
        const documentLanguage = this.normalizeDocumentLanguage(input.documentLanguage);
        const localizedDefaults = this.getFeatureDefaults(documentLanguage);
        const normalized = {
            feature: input.feature,
            mode: input.mode ?? 'standard',
            placement: input.placement === constants_1.DIR_NAMES.QUEUED
                ? constants_1.DIR_NAMES.QUEUED
                : constants_1.DIR_NAMES.ACTIVE,
            affects: input.affects ?? [],
            flags: input.flags ?? [],
            optionalSteps: input.optionalSteps ?? [],
            background: input.background?.trim() || localizedDefaults.background,
            goals: input.goals?.map(item => item.trim()).filter(Boolean) ?? [...localizedDefaults.goals],
            inScope: input.inScope?.map(item => item.trim()).filter(Boolean) ?? [...localizedDefaults.inScope],
            outOfScope: input.outOfScope?.map(item => item.trim()).filter(Boolean) ?? [...localizedDefaults.outOfScope],
            acceptanceCriteria: input.acceptanceCriteria?.map(item => item.trim()).filter(Boolean) ?? [...localizedDefaults.acceptanceCriteria],
            projectContext: this.normalizeFeatureProjectContext(input.projectContext),
            documentLanguage,
            projectRoot: typeof input.projectRoot === 'string' && input.projectRoot.trim().length > 0 ? input.projectRoot.trim() : undefined,
            documentPath: typeof input.documentPath === 'string' && input.documentPath.trim().length > 0 ? input.documentPath.trim() : undefined,
        };
        if (!input.background?.trim()) {
            normalized.background = localizedDefaults.background;
        }
        if (!input.goals?.some(item => item.trim().length > 0)) {
            normalized.goals = [...localizedDefaults.goals];
        }
        if (!input.inScope?.some(item => item.trim().length > 0)) {
            normalized.inScope = [...localizedDefaults.inScope];
        }
        if (!input.outOfScope?.some(item => item.trim().length > 0)) {
            normalized.outOfScope = [...localizedDefaults.outOfScope];
        }
        if (!input.acceptanceCriteria?.some(item => item.trim().length > 0)) {
            normalized.acceptanceCriteria = [...localizedDefaults.acceptanceCriteria];
        }
        return normalized;
    }
    normalizeProjectBootstrapInput(input, fallbackName, mode, inferredDefaults, presetDefaults) {
        const normalizedInputProjectName = input?.projectName?.trim();
        const normalizedInputSummary = input?.summary?.trim();
        const normalizedInputArchitecture = input?.architecture?.trim();
        const normalizedInputTechStack = (input?.techStack ?? []).map(item => item.trim()).filter(Boolean);
        const normalizedInputModules = (input?.modules ?? []).map(item => item.trim()).filter(Boolean);
        const normalizedInputApiAreas = (input?.apiAreas ?? []).map(item => item.trim()).filter(Boolean);
        const normalizedInputDesignDocs = (input?.designDocs ?? []).map(item => item.trim()).filter(Boolean);
        const normalizedInputPlanningDocs = (input?.planningDocs ?? []).map(item => item.trim()).filter(Boolean);
        const inferredTechStack = (inferredDefaults?.techStack ?? []).map(item => item.trim()).filter(Boolean);
        const inferredModules = (inferredDefaults?.modules ?? []).map(item => item.trim()).filter(Boolean);
        const inferredApiAreas = (inferredDefaults?.apiAreas ?? []).map(item => item.trim()).filter(Boolean);
        const inferredDesignDocs = (inferredDefaults?.designDocs ?? []).map(item => item.trim()).filter(Boolean);
        const inferredPlanningDocs = (inferredDefaults?.planningDocs ?? []).map(item => item.trim()).filter(Boolean);
        const presetTechStack = (presetDefaults?.techStack ?? []).map(item => item.trim()).filter(Boolean);
        const presetModules = (presetDefaults?.modules ?? []).map(item => item.trim()).filter(Boolean);
        const presetApiAreas = (presetDefaults?.apiAreas ?? []).map(item => item.trim()).filter(Boolean);
        const presetDesignDocs = (presetDefaults?.designDocs ?? []).map(item => item.trim()).filter(Boolean);
        const presetPlanningDocs = (presetDefaults?.planningDocs ?? []).map(item => item.trim()).filter(Boolean);
        const presetSummary = presetDefaults?.summary?.trim();
        const presetArchitecture = presetDefaults?.architecture?.trim();
        const documentLanguage = this.normalizeDocumentLanguage(input?.documentLanguage);
        const localizedBootstrapDefaults = this.getBootstrapDefaults(documentLanguage, fallbackName);
        const placeholderText = localizedBootstrapDefaults.placeholder;
        const defaultSummary = localizedBootstrapDefaults.summary;
        const defaultArchitecture = localizedBootstrapDefaults.architecture;
        const projectName = normalizedInputProjectName || fallbackName;
        const summary = normalizedInputSummary ||
            presetSummary ||
            defaultSummary;
        const techStack = normalizedInputTechStack.length > 0
            ? Array.from(new Set(normalizedInputTechStack))
            : inferredTechStack.length > 0
                ? Array.from(new Set(inferredTechStack))
                : presetTechStack.length > 0
                    ? Array.from(new Set(presetTechStack))
                    : [placeholderText];
        const architecture = normalizedInputArchitecture ||
            presetArchitecture ||
            defaultArchitecture;
        const modules = normalizedInputModules.length > 0
            ? Array.from(new Set(normalizedInputModules))
            : inferredModules.length > 0
                ? Array.from(new Set(inferredModules))
                : presetModules.length > 0
                    ? Array.from(new Set(presetModules))
                    : ['core', 'modules/<module>'];
        const apiAreas = normalizedInputApiAreas.length > 0
            ? Array.from(new Set(normalizedInputApiAreas))
            : inferredApiAreas.length > 0
                ? Array.from(new Set(inferredApiAreas))
                : presetApiAreas.length > 0
                    ? Array.from(new Set(presetApiAreas))
                    : [placeholderText];
        const designDocs = normalizedInputDesignDocs.length > 0
            ? Array.from(new Set(normalizedInputDesignDocs))
            : inferredDesignDocs.length > 0
                ? Array.from(new Set(inferredDesignDocs))
                : presetDesignDocs.length > 0
                    ? Array.from(new Set(presetDesignDocs))
                    : [placeholderText];
        const planningDocs = normalizedInputPlanningDocs.length > 0
            ? Array.from(new Set(normalizedInputPlanningDocs))
            : inferredPlanningDocs.length > 0
                ? Array.from(new Set(inferredPlanningDocs))
                : presetPlanningDocs.length > 0
                    ? Array.from(new Set(presetPlanningDocs))
                    : [placeholderText];
        const executeScaffoldCommands = Boolean(input?.executeScaffoldCommands);
        const fieldSources = {
            projectName: normalizedInputProjectName ? 'user' : 'placeholder',
            summary: normalizedInputSummary ? 'user' : presetSummary ? 'preset' : 'placeholder',
            techStack: normalizedInputTechStack.length > 0
                ? 'user'
                : inferredTechStack.length > 0
                    ? 'inferred'
                    : presetTechStack.length > 0
                        ? 'preset'
                        : 'placeholder',
            architecture: normalizedInputArchitecture
                ? 'user'
                : presetArchitecture
                    ? 'preset'
                    : 'placeholder',
            modules: normalizedInputModules.length > 0
                ? 'user'
                : inferredModules.length > 0
                    ? 'inferred'
                    : presetModules.length > 0
                        ? 'preset'
                        : 'placeholder',
            apiAreas: normalizedInputApiAreas.length > 0
                ? 'user'
                : inferredApiAreas.length > 0
                    ? 'inferred'
                    : presetApiAreas.length > 0
                        ? 'preset'
                        : 'placeholder',
            designDocs: normalizedInputDesignDocs.length > 0
                ? 'user'
                : inferredDesignDocs.length > 0
                    ? 'inferred'
                    : presetDesignDocs.length > 0
                        ? 'preset'
                        : 'placeholder',
            planningDocs: normalizedInputPlanningDocs.length > 0
                ? 'user'
                : inferredPlanningDocs.length > 0
                    ? 'inferred'
                    : presetPlanningDocs.length > 0
                        ? 'preset'
                        : 'placeholder',
        };
        const userProvidedFields = this.pickFieldKeys(fieldSources, 'user');
        const inferredFields = this.pickFieldKeys(fieldSources, 'inferred');
        const placeholderFields = this.pickFieldKeys(fieldSources, 'placeholder');
        const usedFallbacks = [...inferredFields, ...placeholderFields];
        const modulePlans = this.buildPlannedFiles(modules, 'module', value => this.normalizeModuleDisplayName(value), slug => `${constants_1.DIR_NAMES.SRC}/${constants_1.DIR_NAMES.MODULES}/${slug}/${constants_1.FILE_NAMES.SKILL_MD}`, displayName => displayName.toLowerCase() === 'core');
        const moduleApiPlans = this.buildModuleApiPlans(modulePlans);
        const apiAreaPlans = this.buildPlannedFiles(apiAreas, 'api', value => this.normalizeDocDisplayName(value, constants_1.DIR_NAMES.API), slug => `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/${slug}.md`);
        const designDocPlans = this.buildPlannedFiles(designDocs, 'design', value => this.normalizeDocDisplayName(value, constants_1.DIR_NAMES.DESIGN), slug => `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.DESIGN}/${slug}.md`);
        const planningDocPlans = this.buildPlannedFiles(planningDocs, 'plan', value => this.normalizeDocDisplayName(value, constants_1.DIR_NAMES.PLANNING), slug => `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.PLANNING}/${slug}.md`);
        return {
            projectPresetId: input?.projectPresetId ?? null,
            projectName,
            summary,
            techStack,
            architecture,
            modules,
            apiAreas,
            designDocs,
            planningDocs,
            documentLanguage,
            executeScaffoldCommands,
            mode,
            modulePlans,
            moduleApiPlans,
            apiAreaPlans,
            designDocPlans,
            planningDocPlans,
            fieldSources,
            usedFallbacks,
            userProvidedFields,
            inferredFields,
            placeholderFields,
        };
    }
    normalizeFeatureProjectContext(context) {
        return {
            projectDocs: context?.projectDocs ?? [],
            moduleSkills: context?.moduleSkills ?? [],
            apiDocs: context?.apiDocs ?? [],
            designDocs: context?.designDocs ?? [],
            planningDocs: context?.planningDocs ?? [],
        };
    }
    normalizeDocumentLanguage(input) {
        if (input === 'zh-CN' || input === 'en-US' || input === 'ja-JP' || input === 'ar') {
            return input;
        }
        return 'en-US';
    }
    pickFieldKeys(fieldSources, source) {
        return Object.entries(fieldSources)
            .filter(([, value]) => value === source)
            .map(([key]) => key);
    }
    isPlaceholderItem(value) {
        const normalized = value.trim().toLowerCase();
        return (normalized.length === 0 ||
            normalized === '待补充' ||
            normalized === '未定' ||
            normalized === 'قيد التحديد' ||
            normalized === 'سيتم تحديده' ||
            normalized === 'todo' ||
            normalized === 'tbd' ||
            normalized.includes('<') ||
            normalized.includes('>'));
    }
    getFeatureDefaults(documentLanguage) {
        switch (documentLanguage) {
            case 'zh-CN':
                return {
                    background: '为什么要做这个 change？当前存在哪些问题？',
                    goals: ['做完之后能解决什么问题？用户或开发者能得到什么？'],
                    inScope: ['待补充'],
                    outOfScope: ['待补充'],
                    acceptanceCriteria: ['条件一', '条件二'],
                };
            case 'ja-JP':
                return {
                    background: 'なぜこの change が必要ですか。現在どのような問題がありますか。',
                    goals: ['この change の完了後に何が解決され、ユーザーや開発者は何を得られますか。'],
                    inScope: ['未定'],
                    outOfScope: ['未定'],
                    acceptanceCriteria: ['受け入れ条件 1', '受け入れ条件 2'],
                };
            case 'ar':
                return {
                    background: 'لماذا نحتاج إلى هذا التغيير؟ ما المشكلة الموجودة حالياً؟',
                    goals: ['ما المشكلة التي ستُحل بعد هذا التغيير؟ وما الفائدة للمستخدمين أو للمطورين؟'],
                    inScope: ['قيد التحديد'],
                    outOfScope: ['قيد التحديد'],
                    acceptanceCriteria: ['معيار قبول 1', 'معيار قبول 2'],
                };
            default:
                return {
                    background: 'Why is this change needed? What problem exists today?',
                    goals: ['What problem is solved after this change? What do users or developers gain?'],
                    inScope: ['TBD'],
                    outOfScope: ['TBD'],
                    acceptanceCriteria: ['Acceptance item 1', 'Acceptance item 2'],
                };
        }
    }
    getBootstrapDefaults(documentLanguage, fallbackName) {
        switch (documentLanguage) {
            case 'zh-CN':
                return {
                    placeholder: '待补充',
                    summary: `${fallbackName} 已通过 OSpec 初始化，当前已具备按 change 推进交付的基础条件。请继续补充缺失的项目上下文。`,
                    architecture: 'OSpec 已初始化协议壳和基础项目知识文档，后续可结合仓库实际方向继续细化架构。',
                };
            case 'ja-JP':
                return {
                    placeholder: '未定',
                    summary: `${fallbackName} は OSpec によって初期化され、change ベースで進めるための基本状態が整いました。リポジトリの方向性が明確になるにつれて不足しているプロジェクト文脈を補ってください。`,
                    architecture: 'OSpec はプロトコルシェルと基本的なプロジェクト知識ドキュメントを初期化しました。リポジトリの方向性が明確になるにつれて、アーキテクチャ詳細を調整してください。',
                };
            case 'ar':
                return {
                    placeholder: 'قيد التحديد',
                    summary: `تمت تهيئة ${fallbackName} بواسطة OSpec وأصبح جاهزاً مبدئياً للتسليم المعتمد على changes. أكمل سياق المشروع الناقص كلما أصبحت صورة المستودع أوضح.`,
                    architecture: 'قام OSpec بتهيئة غلاف البروتوكول ووثائق معرفة المشروع الأساسية. حسّن تفاصيل المعمارية مع اتضاح اتجاه المستودع.',
                };
            default:
                return {
                    placeholder: 'TBD',
                    summary: `${fallbackName} has been initialized with OSpec and is ready for change-based delivery. Fill in the missing project context as the repository becomes clearer.`,
                    architecture: 'OSpec initialized the protocol shell and baseline project knowledge docs. Refine the architecture details as the repository direction becomes clearer.',
                };
        }
    }
    slugify(value) {
        return value
            .toLowerCase()
            .replace(/\.md$/i, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    normalizeModuleDisplayName(value) {
        return value
            .replace(/^src[\\/]+modules[\\/]+/i, '')
            .replace(/^modules[\\/]+/i, '')
            .replace(/[\\/]+/g, ' ')
            .trim();
    }
    normalizeDocDisplayName(value, section) {
        const normalizedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return value
            .replace(new RegExp(`^docs[\\\\/]${normalizedSection}[\\\\/]`, 'i'), '')
            .replace(/\.md$/i, '')
            .replace(/[\\/]+/g, ' ')
            .trim();
    }
    buildPlannedFiles(items, prefix, normalizeDisplayName, buildPath, shouldSkip) {
        const plans = [];
        const usedSlugs = new Set();
        for (const item of items) {
            const displayName = normalizeDisplayName(item);
            if (!displayName || this.isPlaceholderItem(displayName) || shouldSkip?.(displayName)) {
                continue;
            }
            const baseSlug = this.slugify(displayName) || prefix;
            let slug = baseSlug;
            let counter = 2;
            while (usedSlugs.has(slug)) {
                slug = `${baseSlug}-${counter}`;
                counter += 1;
            }
            usedSlugs.add(slug);
            const relativePath = buildPath(slug).replace(/\\/g, '/');
            plans.push({
                name: slug,
                displayName,
                fileName: relativePath.split('/').pop() || relativePath,
                path: relativePath,
            });
        }
        return plans;
    }
    buildModuleApiPlans(modulePlans) {
        return modulePlans.map(plan => ({
            name: `module-${plan.name}`,
            displayName: `${plan.displayName} module api`,
            fileName: `module-${plan.name}.md`,
            path: `${constants_1.DIR_NAMES.DOCS}/${constants_1.DIR_NAMES.API}/module-${plan.name}.md`,
        }));
    }
}
exports.TemplateInputFactory = TemplateInputFactory;
