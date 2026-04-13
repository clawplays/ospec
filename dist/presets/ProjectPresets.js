"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectPresetFirstChangeSuggestion = exports.inferProjectPresetFromDescription = exports.getLocalizedProjectPresetContent = exports.getProjectPresetById = exports.PROJECT_PRESETS = void 0;
const buildOfficialSiteSuggestion = (language, projectName) => {
    switch (language) {
        case 'zh-CN':
            return {
                name: 'launch-official-site-foundation',
                background: `${projectName} 已完成初始框架搭建，下一步需要把官网首页、文档入口、内容流和后台入口串成第一版可演示链路。`,
                goals: [
                    '打通首页、文档中心、博客/更新日志、后台入口的主导航',
                    '沉淀官网内容模块与后台内容流的第一版边界',
                    '让首个 change 明确承接官网 MVP 的实现路径',
                ],
                inScope: ['web', 'docs', 'content', 'admin', 'auth'],
                outOfScope: ['复杂权限模型', '正式 CMS 实现', '多语言内容系统'],
                acceptanceCriteria: [
                    '首页可导航到 docs、blog、admin、login',
                    'docs/blog/admin 页面具备清晰的占位结构与模块说明',
                    'proposal/tasks/verification 明确覆盖官网 MVP 范围',
                ],
                affects: ['web', 'docs', 'content', 'admin', 'auth'],
                flags: ['multi_file_change'],
            };
        case 'ja-JP':
            return {
                name: 'launch-official-site-foundation',
                background: `${projectName} の初期骨格は整いました。次の change では、ホームページ、docs 導線、コンテンツフロー、admin 入口を最初の実演可能な縦スライスとして接続する必要があります。`,
                goals: [
                    'ホーム、docs、blog、admin、login をまたぐ主要ナビゲーションを接続する',
                    '公式サイト向けの最初の content / admin 境界を定義する',
                    '最初の change を公式サイト MVP の具体的な実装単位にする',
                ],
                inScope: ['web', 'docs', 'content', 'admin', 'auth'],
                outOfScope: ['高度な RBAC', '本番向け CMS 連携', '完全な多言語コンテンツ基盤'],
                acceptanceCriteria: [
                    'ホームから docs、blog、admin、login へ遷移できる',
                    'docs / blog / admin ページにプレースホルダー構造とモジュール意図がある',
                    'proposal / tasks / verification が公式サイト MVP 範囲を明確にカバーする',
                ],
                affects: ['web', 'docs', 'content', 'admin', 'auth'],
                flags: ['multi_file_change'],
            };
        case 'ar':
            return {
                name: 'launch-official-site-foundation',
                background: `أصبح لدى ${projectName} هيكل أولي جاهز. يجب أن يربط التغيير التالي بين الصفحة الرئيسية ومدخل docs وتدفق المحتوى ومدخل الإدارة ليشكّل أول شريحة عمودية قابلة للعرض.`,
                goals: [
                    'ربط التنقل الرئيسي بين الصفحة الرئيسية وdocs والمدونة والإدارة وتسجيل الدخول',
                    'تحديد أول حدود واضحة بين content وadmin للموقع الرسمي',
                    'تحويل أول change إلى شريحة تنفيذية واضحة لـ MVP الموقع الرسمي',
                ],
                inScope: ['web', 'docs', 'content', 'admin', 'auth'],
                outOfScope: ['نماذج صلاحيات معقدة', 'تكامل CMS إنتاجي', 'منظومة محتوى متعددة اللغات كاملة'],
                acceptanceCriteria: [
                    'يمكن التنقل من الصفحة الرئيسية إلى docs والمدونة والإدارة وتسجيل الدخول',
                    'تحتوي صفحات docs والمدونة والإدارة على هياكل مؤقتة واضحة ونية وحدات مفهومة',
                    'تغطي proposal وtasks وverification نطاق MVP الموقع الرسمي بوضوح',
                ],
                affects: ['web', 'docs', 'content', 'admin', 'auth'],
                flags: ['multi_file_change'],
            };
        default:
            return {
                name: 'launch-official-site-foundation',
                background: `${projectName} has the initial scaffold in place. The next change should connect the homepage, docs entry, content flow, and admin entry into the first demonstrable vertical slice.`,
                goals: [
                    'Connect homepage navigation across home, docs, blog, admin, and login',
                    'Define the first content and admin workflow boundaries for the official site',
                    'Turn the first change into a concrete MVP delivery slice',
                ],
                inScope: ['web', 'docs', 'content', 'admin', 'auth'],
                outOfScope: ['advanced RBAC', 'production CMS integration', 'full multilingual content system'],
                acceptanceCriteria: [
                    'Homepage navigation reaches docs, blog, admin, and login',
                    'docs/blog/admin pages expose clear placeholder structures and module intent',
                    'proposal/tasks/verification cover the official-site MVP slice',
                ],
                affects: ['web', 'docs', 'content', 'admin', 'auth'],
                flags: ['multi_file_change'],
            };
    }
};
const buildNextjsWebSuggestion = (language, projectName) => {
    switch (language) {
        case 'zh-CN':
            return {
                name: 'establish-web-app-shell',
                background: `${projectName} 已初始化基础 Web App 骨架，下一步需要把首页、账户、登录与基础 API 入口连成第一版产品骨架。`,
                goals: [
                    '打通首页、账户页与登录页的基础导航',
                    '明确 auth api / user api 的第一版职责边界',
                    '让首个 change 形成可持续迭代的产品外壳',
                ],
                inScope: ['web', 'account', 'auth', 'api'],
                outOfScope: ['支付流程', '复杂后台模块', '完整通知系统'],
                acceptanceCriteria: [
                    '首页、账户页、登录页导航可达',
                    'auth api 与 user api 文档已能支撑首轮实现',
                    '首个 change 文档明确产品骨架的交付范围',
                ],
                affects: ['web', 'account', 'auth', 'api'],
                flags: ['multi_file_change'],
            };
        case 'ja-JP':
            return {
                name: 'establish-web-app-shell',
                background: `${projectName} には基本的な Web App の骨格があります。次の change では、ホーム、アカウント画面、ログイン導線、基本 API を接続して最初のプロダクトシェルを作る必要があります。`,
                goals: [
                    'ホーム、アカウント、ログインをまたぐ基本ナビゲーションを接続する',
                    'auth api と user api の最初の責務境界を定義する',
                    '最初の change を継続的に拡張できるプロダクトシェルの節目にする',
                ],
                inScope: ['web', 'account', 'auth', 'api'],
                outOfScope: ['決済フロー', '複雑な管理モジュール', '完全な通知システム'],
                acceptanceCriteria: [
                    'ホーム、アカウント、ログイン画面へ移動できる',
                    'auth api と user api の文書が最初の実装スライスを支えられる',
                    '最初の change 文書が初期プロダクトシェルの範囲を明確に示す',
                ],
                affects: ['web', 'account', 'auth', 'api'],
                flags: ['multi_file_change'],
            };
        case 'ar':
            return {
                name: 'establish-web-app-shell',
                background: `أصبح لدى ${projectName} هيكل أساسي لتطبيق ويب. يجب أن يربط التغيير التالي بين الصفحة الرئيسية وسطح الحساب وتدفق تسجيل الدخول وواجهة API الأساسية لبناء أول غلاف منتج.`,
                goals: [
                    'ربط التنقل الأساسي بين الصفحة الرئيسية والحساب وتسجيل الدخول',
                    'تحديد أول حدود مسؤولية بين auth api وuser api',
                    'تحويل أول change إلى محطة واضحة لغلاف منتج قابل للتوسع',
                ],
                inScope: ['web', 'account', 'auth', 'api'],
                outOfScope: ['المدفوعات', 'وحدات إدارة معقدة', 'أنظمة إشعارات كاملة'],
                acceptanceCriteria: [
                    'يمكن الوصول إلى الصفحة الرئيسية والحساب وتسجيل الدخول',
                    'وثائق auth api وuser api كافية لشريحة التنفيذ الأولى',
                    'تحدد وثائق أول change نطاق غلاف المنتج الأولي بوضوح',
                ],
                affects: ['web', 'account', 'auth', 'api'],
                flags: ['multi_file_change'],
            };
        default:
            return {
                name: 'establish-web-app-shell',
                background: `${projectName} now has the base web-app scaffold. The next change should connect the homepage, account surface, login flow, and base API surface into the first product shell.`,
                goals: [
                    'Connect navigation across home, account, and login',
                    'Define the first auth api and user api ownership boundaries',
                    'Turn the first change into a maintainable product shell milestone',
                ],
                inScope: ['web', 'account', 'auth', 'api'],
                outOfScope: ['payments', 'complex admin modules', 'full notification systems'],
                acceptanceCriteria: [
                    'Home, account, and login surfaces are navigable',
                    'auth api and user api docs are sufficient for the first implementation slice',
                    'The first change documents clearly scope the initial product shell',
                ],
                affects: ['web', 'account', 'auth', 'api'],
                flags: ['multi_file_change'],
            };
    }
};
exports.PROJECT_PRESETS = [
    {
        id: 'official-site',
        name: 'Official Site',
        description: 'Marketing website with docs center, blog or changelog, admin content management, and auth.',
        recommendedMode: 'full',
        recommendedTechStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js'],
        architecture: 'Use a web/documentation/content architecture with a dedicated admin surface and shared auth boundaries.',
        modules: ['web', 'docs', 'content', 'admin', 'auth'],
        apiAreas: ['content api', 'auth api', 'admin api'],
        designDocs: ['ui information architecture', 'content model', 'cms workflow'],
        planningDocs: ['delivery plan', 'launch checklist'],
        keywords: ['官网', 'website', 'official site', 'docs', 'documentation', 'blog', 'changelog', 'cms', '公式サイト', 'ドキュメント', 'ブログ', '変更履歴', 'موقع', 'توثيق', 'مدونة', 'سجل التغييرات'],
        buildFirstChangeSuggestion: buildOfficialSiteSuggestion,
    },
    {
        id: 'nextjs-web',
        name: 'Next.js Web App',
        description: 'General-purpose Next.js web product with web, account, and API surfaces.',
        recommendedMode: 'standard',
        recommendedTechStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js'],
        architecture: 'Use a web-first architecture with shared auth/account boundaries and clear API ownership.',
        modules: ['web', 'account', 'auth', 'api'],
        apiAreas: ['auth api', 'user api'],
        designDocs: ['ui information architecture', 'system architecture'],
        planningDocs: ['delivery plan'],
        keywords: ['next.js', 'nextjs', 'react', 'web app', 'web', 'portal', 'ウェブアプリ', 'ポータル', 'تطبيق ويب', 'بوابة'],
        buildFirstChangeSuggestion: buildNextjsWebSuggestion,
    },
];
const getProjectPresetById = (presetId) => exports.PROJECT_PRESETS.find(preset => preset.id === presetId);
exports.getProjectPresetById = getProjectPresetById;
const getLocalizedProjectPresetContent = (presetId, language) => {
    if (!presetId) {
        return null;
    }
    if (presetId === 'official-site') {
        switch (language) {
            case 'zh-CN':
                return {
                    name: '官网站点',
                    description: '用于官网展示、文档中心、博客/更新日志、后台内容管理与鉴权的一体化官网项目。',
                    architecture: '采用 web / docs / content 分层，并提供独立 admin 面与共享 auth 边界。',
                    designDocs: ['界面信息架构', '内容模型', 'CMS 工作流'],
                    planningDocs: ['交付计划', '上线检查清单'],
                };
            case 'ja-JP':
                return {
                    name: '公式サイト',
                    description: '公式サイト、docs センター、ブログ / 変更履歴、admin コンテンツ管理、auth をまとめた一体型プロジェクト。',
                    architecture: 'web / docs / content の分離を基本にし、専用の admin 面と共有 auth 境界を持つ構成を採用します。',
                    designDocs: ['UI 情報設計', 'コンテンツモデル', 'CMS ワークフロー'],
                    planningDocs: ['配信計画', 'ローンチチェックリスト'],
                };
            case 'ar':
                return {
                    name: 'الموقع الرسمي',
                    description: 'مشروع موحد للموقع الرسمي مع مركز docs ومدونة أو سجل تغييرات وإدارة محتوى عبر admin مع auth.',
                    architecture: 'اعتمد معمارية web / docs / content مع سطح admin مخصص وحدود auth مشتركة.',
                    designDocs: ['هيكلة معلومات الواجهة', 'نموذج المحتوى', 'سير عمل CMS'],
                    planningDocs: ['خطة التسليم', 'قائمة فحص الإطلاق'],
                };
            default:
                return {
                    name: 'Official Site',
                    description: 'Marketing website with docs center, blog or changelog, admin content management, and auth.',
                    architecture: 'Use a web/documentation/content architecture with a dedicated admin surface and shared auth boundaries.',
                    designDocs: ['ui information architecture', 'content model', 'cms workflow'],
                    planningDocs: ['delivery plan', 'launch checklist'],
                };
        }
    }
    if (presetId === 'nextjs-web') {
        switch (language) {
            case 'zh-CN':
                return {
                    name: 'Next.js Web 应用',
                    description: '适用于标准 Web 产品的 Next.js 项目骨架，内置 web、account、auth 与 API 边界。',
                    architecture: '采用以 web 为中心的架构，并保持 account / auth / api 的清晰职责边界。',
                    designDocs: ['界面信息架构', '系统架构'],
                    planningDocs: ['交付计划'],
                };
            case 'ja-JP':
                return {
                    name: 'Next.js Web アプリ',
                    description: 'web、account、auth、API の境界を備えた汎用的な Next.js Web プロダクト用の初期構成です。',
                    architecture: 'web を中心にしつつ、auth / account の共有境界と明確な API 所有権を持つ構成を採用します。',
                    designDocs: ['UI 情報設計', 'システムアーキテクチャ'],
                    planningDocs: ['配信計画'],
                };
            case 'ar':
                return {
                    name: 'تطبيق ويب Next.js',
                    description: 'هيكل مشروع Next.js عام لمنتج ويب مع أسطح web وaccount وAPI وحدود واضحة.',
                    architecture: 'اعتمد معمارية تتمحور حول web مع حدود auth/account مشتركة وملكية API واضحة.',
                    designDocs: ['هيكلة معلومات الواجهة', 'معمارية النظام'],
                    planningDocs: ['خطة التسليم'],
                };
            default:
                return {
                    name: 'Next.js Web App',
                    description: 'General-purpose Next.js web product with web, account, and API surfaces.',
                    architecture: 'Use a web-first architecture with shared auth/account boundaries and clear API ownership.',
                    designDocs: ['ui information architecture', 'system architecture'],
                    planningDocs: ['delivery plan'],
                };
        }
    }
    return null;
};
exports.getLocalizedProjectPresetContent = getLocalizedProjectPresetContent;
const inferProjectPresetFromDescription = (description) => {
    const normalized = description.toLowerCase();
    const scores = exports.PROJECT_PRESETS.map(preset => {
        const matchedKeywords = preset.keywords.filter(keyword => normalized.includes(keyword.toLowerCase()));
        const weightedScore = matchedKeywords.reduce((score, keyword) => {
            const normalizedKeyword = keyword.toLowerCase();
            if (['官网', 'official site', 'website', 'docs', 'documentation', 'blog', 'changelog', 'cms', '公式サイト', 'ドキュメント', 'ブログ', '変更履歴', 'موقع', 'توثيق', 'مدونة', 'سجل التغييرات'].includes(normalizedKeyword)) {
                return score + 3;
            }
            if (['next.js', 'nextjs', 'react', 'web app', 'portal', 'ウェブアプリ', 'ポータル', 'تطبيق ويب', 'بوابة'].includes(normalizedKeyword)) {
                return score + 2;
            }
            return score + 1;
        }, 0);
        return {
            preset,
            weightedScore,
            matchedKeywordCount: matchedKeywords.length,
        };
    })
        .filter(item => item.matchedKeywordCount > 0)
        .sort((left, right) => {
        if (right.weightedScore !== left.weightedScore) {
            return right.weightedScore - left.weightedScore;
        }
        if (right.matchedKeywordCount !== left.matchedKeywordCount) {
            return right.matchedKeywordCount - left.matchedKeywordCount;
        }
        return 0;
    });
    return scores[0]?.preset;
};
exports.inferProjectPresetFromDescription = inferProjectPresetFromDescription;
const getProjectPresetFirstChangeSuggestion = (presetId, language, projectName) => {
    const preset = (0, exports.getProjectPresetById)(presetId);
    if (!preset) {
        return null;
    }
    return preset.buildFirstChangeSuggestion(language, projectName);
};
exports.getProjectPresetFirstChangeSuggestion = getProjectPresetFirstChangeSuggestion;
