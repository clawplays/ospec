"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectScaffoldService = exports.ProjectScaffoldService = void 0;
const path_1 = __importDefault(require("path"));
const ProjectScaffoldPresets_1 = require("../scaffolds/ProjectScaffoldPresets");
class ProjectScaffoldService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    getPlan(normalized) {
        const preset = (0, ProjectScaffoldPresets_1.getProjectScaffoldPreset)(normalized.projectPresetId);
        if (!preset) {
            return null;
        }
        const localizedMeta = (0, ProjectScaffoldPresets_1.getLocalizedProjectScaffoldMeta)(preset.presetId, normalized.documentLanguage);
        return {
            presetId: preset.presetId,
            title: localizedMeta.title,
            description: localizedMeta.description,
            framework: localizedMeta.framework,
            installCommand: localizedMeta.installCommand,
            directories: [...preset.directories],
            files: preset.files.map(file => ({
                ...file,
                purpose: (0, ProjectScaffoldPresets_1.getLocalizedProjectScaffoldPurpose)(file.path, normalized.documentLanguage) || file.purpose,
            })),
            newDirectories: [...preset.directories],
            existingDirectories: [],
            newFiles: preset.files.map(file => file.path),
            existingFiles: [],
        };
    }
    async getPlanForProject(rootDir, normalized) {
        const basePlan = this.getPlan(normalized);
        if (!basePlan) {
            return null;
        }
        const newDirectories = [];
        const existingDirectories = [];
        for (const directory of basePlan.directories) {
            const targetPath = path_1.default.join(rootDir, ...directory.split('/'));
            if (await this.fileService.exists(targetPath)) {
                existingDirectories.push(directory);
            }
            else {
                newDirectories.push(directory);
            }
        }
        const newFiles = [];
        const existingFiles = [];
        for (const file of basePlan.files) {
            const targetPath = path_1.default.join(rootDir, ...file.path.split('/'));
            if (await this.fileService.exists(targetPath)) {
                existingFiles.push(file.path);
            }
            else {
                newFiles.push(file.path);
            }
        }
        return {
            ...basePlan,
            newDirectories,
            existingDirectories,
            newFiles,
            existingFiles,
        };
    }
    getGeneratedPaths(normalized) {
        const plan = this.getPlan(normalized);
        if (!plan) {
            return [];
        }
        return plan.files.map(file => file.path);
    }
    async applyScaffold(rootDir, normalized) {
        const plan = await this.getPlanForProject(rootDir, normalized);
        const preset = (0, ProjectScaffoldPresets_1.getProjectScaffoldPreset)(normalized.projectPresetId);
        if (!plan || !preset) {
            return null;
        }
        const createdDirectories = [];
        const skippedDirectories = [];
        for (const directory of preset.directories) {
            await this.fileService.ensureDir(path_1.default.join(rootDir, ...directory.split('/')));
            if (plan.existingDirectories.includes(directory)) {
                skippedDirectories.push(directory);
            }
            else {
                createdDirectories.push(directory);
            }
        }
        const createdFiles = [];
        const skippedFiles = [];
        for (const file of preset.files) {
            const targetPath = path_1.default.join(rootDir, ...file.path.split('/'));
            if (await this.fileService.exists(targetPath)) {
                skippedFiles.push(file.path);
                continue;
            }
            await this.fileService.writeFile(targetPath, this.renderFileContent(file.path, preset, normalized));
            createdFiles.push(file.path);
        }
        return {
            plan,
            createdDirectories,
            skippedDirectories,
            createdFiles,
            skippedFiles,
        };
    }
    renderFileContent(filePath, preset, normalized) {
        switch (filePath) {
            case '.gitignore':
                return `node_modules
.next
out
dist
coverage
.env
.env.local
`;
            case 'package.json':
                return this.renderPackageJson(normalized);
            case 'tsconfig.json':
                return `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
            case 'next-env.d.ts':
                return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is auto-generated by Next.js.
`;
            case 'next.config.mjs':
                return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`;
            case 'postcss.config.js':
                return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
            case 'tailwind.config.ts':
                return `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;
            case 'app/globals.css':
                return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  --background: #f5efe3;
  --foreground: #111111;
  --surface: #fffaf2;
  --surface-strong: #f1e7d6;
  --line: #d8ccb8;
  --accent: #b65a2a;
  --accent-strong: #8e3f18;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: radial-gradient(circle at top, rgba(182, 90, 42, 0.18), transparent 32%), var(--background);
  color: var(--foreground);
  font-family: "Segoe UI", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}
`;
            case 'app/layout.tsx':
                return `import type { Metadata } from 'next';
import './globals.css';
import { SiteShell } from '../src/components/site-shell';

export const metadata: Metadata = {
  title: '${this.escapeTemplateString(normalized.projectName)}',
  description: '${this.escapeTemplateString(normalized.summary)}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="${this.getHtmlLang(normalized.documentLanguage)}">
      <body>
        <SiteShell>${'\n'}          {children}${'\n'}        </SiteShell>
      </body>
    </html>
  );
}
`;
            case 'app/page.tsx':
                return this.renderHomePage(normalized);
            case 'app/docs/page.tsx':
                return this.renderSectionPage(normalized, normalized.documentLanguage === 'zh-CN'
                    ? '文档中心'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ドキュメントセンター'
                        : normalized.documentLanguage === 'ar'
                            ? 'مركز الوثائق'
                            : 'Docs Center', normalized.documentLanguage === 'zh-CN'
                    ? '在这里沉淀架构说明、API 边界和团队执行流程。'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ここでアーキテクチャ、API 境界、チームの実行フローをまとめます。'
                        : normalized.documentLanguage === 'ar'
                            ? 'دوّن هنا المعمارية وحدود API ومسارات تنفيذ الفريق في مكان واحد.'
                            : 'Document architecture, API boundaries, and team workflows in one place.');
            case 'app/blog/page.tsx':
                return this.renderSectionPage(normalized, normalized.documentLanguage === 'zh-CN'
                    ? '博客与更新日志'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ブログと変更履歴'
                        : normalized.documentLanguage === 'ar'
                            ? 'المدونة وسجل التغييرات'
                            : 'Blog & Changelog', normalized.documentLanguage === 'zh-CN'
                    ? '在这里发布产品更新、版本发布说明和技术长文。'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ここで製品アップデート、リリースノート、技術記事を公開します。'
                        : normalized.documentLanguage === 'ar'
                            ? 'انشر هنا تحديثات المنتج وملاحظات الإصدار والمقالات التقنية الطويلة.'
                            : 'Publish product updates, release notes, and long-form technical posts.');
            case 'app/admin/page.tsx':
                return this.renderSectionPage(normalized, normalized.documentLanguage === 'zh-CN'
                    ? '后台控制台'
                    : normalized.documentLanguage === 'ja-JP'
                        ? '管理コンソール'
                        : normalized.documentLanguage === 'ar'
                            ? 'وحدة التحكم الإدارية'
                            : 'Admin Console', normalized.documentLanguage === 'zh-CN'
                    ? '在这里承接内容工作流、发布条目和审核队列。'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ここでコンテンツワークフロー、公開項目、レビュー待ちキューを扱います。'
                        : normalized.documentLanguage === 'ar'
                            ? 'أدر هنا سير عمل المحتوى وعناصر النشر وطوابير المراجعة التحريرية.'
                            : 'Operate content workflows, release entries, and editorial review queues.');
            case 'app/login/page.tsx':
                return this.renderSectionPage(normalized, normalized.documentLanguage === 'zh-CN'
                    ? '鉴权入口'
                    : normalized.documentLanguage === 'ja-JP'
                        ? '認証入口'
                        : normalized.documentLanguage === 'ar'
                            ? 'بوابة المصادقة'
                            : 'Authentication', normalized.documentLanguage === 'zh-CN'
                    ? '后续可在这里接入身份提供方、角色策略和团队登录流程。'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ここで将来の ID プロバイダー、権限ポリシー、チーム向けサインインフローを接続できます。'
                        : normalized.documentLanguage === 'ar'
                            ? 'اربط هنا لاحقاً مزود الهوية وسياسات الأدوار ومسارات تسجيل دخول الفريق.'
                            : 'Connect your future identity provider, role policies, and staff sign-in flows here.');
            case 'app/account/page.tsx':
                return this.renderSectionPage(normalized, normalized.documentLanguage === 'zh-CN'
                    ? '账户中心'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'アカウント'
                        : normalized.documentLanguage === 'ar'
                            ? 'الحساب'
                            : 'Account', normalized.documentLanguage === 'zh-CN'
                    ? '在这里管理登录用户的工作区、个人资料和团队级设置。'
                    : normalized.documentLanguage === 'ja-JP'
                        ? 'ここでログイン済みユーザーのワークスペース、プロフィール、チーム設定を管理します。'
                        : normalized.documentLanguage === 'ar'
                            ? 'أدِر هنا مساحة عمل المستخدم المسجّل وملفه الشخصي وإعدادات الفريق.'
                            : 'Manage the signed-in user workspace, profile, and team-level settings.');
            case 'app/api/health/route.ts':
                return `export async function GET() {
  return Response.json({
    ok: true,
    project: '${this.escapeTemplateString(normalized.projectName)}',
    preset: '${normalized.projectPresetId ?? ''}',
    modules: ${JSON.stringify(normalized.modules)},
  });
}
`;
            case 'src/components/site-shell.tsx':
                return this.renderSiteShell(normalized, preset);
            case 'src/components/home-hero.tsx':
                return this.renderHomeHero(normalized);
            case 'src/lib/content/navigation.ts':
                return this.renderNavigationFile(normalized, preset);
            case 'src/lib/navigation/primary-nav.ts':
                return this.renderNavigationFile(normalized, preset);
            case 'src/lib/auth/session.ts':
                return `export interface AppSession {
  userId: string;
  email: string;
  roles: string[];
}

export async function getCurrentSession(): Promise<AppSession | null> {
  return null;
}
`;
            default:
                return `# Placeholder for ${filePath}\n`;
        }
    }
    renderPackageJson(normalized) {
        return `${JSON.stringify({
            name: this.toPackageName(normalized.projectName),
            version: '0.1.0',
            private: true,
            scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint',
            },
            dependencies: {
                next: '^15.1.0',
                react: '^19.0.0',
                'react-dom': '^19.0.0',
            },
            devDependencies: {
                '@types/node': '^22.10.1',
                '@types/react': '^19.0.0',
                '@types/react-dom': '^19.0.0',
                autoprefixer: '^10.4.20',
                eslint: '^9.17.0',
                'eslint-config-next': '^15.1.0',
                postcss: '^8.4.49',
                tailwindcss: '^3.4.17',
                typescript: '^5.7.2',
            },
        }, null, 2)}
`;
    }
    renderHomePage(normalized) {
        const copy = this.getCopy(normalized);
        const moduleCards = normalized.modules
            .filter(moduleName => !this.isPlaceholder(moduleName))
            .slice(0, 6)
            .map(moduleName => `        <li className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3">
          <div className="text-sm font-semibold text-stone-900">${this.escapeTemplateString(moduleName)}</div>
        </li>`)
            .join('\n');
        return `import { HomeHero } from '../src/components/home-hero';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <HomeHero />
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-stone-200 bg-[var(--surface)] p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">${copy.projectSummary}</p>
          <p className="mt-4 text-lg leading-8 text-stone-700">${this.escapeTemplateString(normalized.summary)}</p>
        </article>
        <article className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">${copy.initialModules}</p>
          <ul className="mt-4 grid gap-3">
${moduleCards || `            <li className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">${copy.fillModulesHint}</li>`}
          </ul>
        </article>
      </section>
    </main>
  );
}
`;
    }
    renderSectionPage(normalized, title, description) {
        const copy = this.getCopy(normalized);
        return `export default function SectionPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="rounded-[2rem] border border-stone-200 bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">${copy.projectLabel}</p>
        <h1 className="mt-4 text-4xl font-semibold text-stone-950">${title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-stone-700">${description}</p>
      </section>
    </main>
  );
}
`;
    }
    renderSiteShell(normalized, preset) {
        const copy = this.getCopy(normalized);
        const importPath = preset.presetId === 'nextjs-web' ? '../lib/navigation/primary-nav' : '../lib/content/navigation';
        return `import Link from 'next/link';
import { navigationItems } from '${importPath}';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold text-stone-950">
            ${this.escapeTemplateString(normalized.projectName)}
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
            {navigationItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-stone-200 px-3 py-2 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 pt-5 text-xs uppercase tracking-[0.2em] text-stone-500">
        ${copy.scaffoldBadge}
      </div>
      {children}
    </div>
  );
}
`;
    }
    renderHomeHero(normalized) {
        const copy = this.getCopy(normalized);
        return `export function HomeHero() {
  return (
    <section className="rounded-[2.5rem] border border-stone-200 bg-[linear-gradient(135deg,_rgba(182,90,42,0.18),_rgba(255,250,242,0.88))] px-8 py-14 shadow-sm">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-600">${copy.heroBadge}</p>
      <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight text-stone-950">
        ${this.escapeTemplateString(normalized.projectName)}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        ${this.escapeTemplateString(normalized.summary)}
      </p>
    </section>
  );
}
`;
    }
    renderNavigationFile(normalized, preset) {
        const copy = this.getCopy(normalized);
        const candidates = preset.presetId === 'nextjs-web'
            ? [
                { href: '/', label: copy.navHome, module: 'web' },
                { href: '/account', label: copy.navAccount, module: 'account' },
                { href: '/login', label: copy.navLogin, module: 'auth' },
            ]
            : [
                { href: '/', label: copy.navHome, module: 'web' },
                { href: '/docs', label: copy.navDocs, module: 'docs' },
                { href: '/blog', label: copy.navBlog, module: 'content' },
                { href: '/admin', label: copy.navAdmin, module: 'admin' },
                { href: '/login', label: copy.navLogin, module: 'auth' },
            ];
        const activeModules = new Set(normalized.modules
            .map(item => item.trim().toLowerCase())
            .filter(Boolean));
        const items = candidates.filter(item => activeModules.size === 0 || activeModules.has(item.module));
        return `export const navigationItems = ${JSON.stringify(items.map(item => ({ href: item.href, label: item.label })), null, 2)} as const;
`;
    }
    toPackageName(projectName) {
        const slug = projectName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || 'ospec-project';
    }
    isPlaceholder(value) {
        const normalized = value.trim().toLowerCase();
        return (!normalized ||
            normalized === '待补充' ||
            normalized === '未定' ||
            normalized === 'قيد التحديد' ||
            normalized === 'todo' ||
            normalized === 'tbd' ||
            normalized.includes('<') ||
            normalized.includes('>'));
    }
    escapeTemplateString(value) {
        return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }
    getHtmlLang(documentLanguage) {
        if (documentLanguage === 'zh-CN') {
            return 'zh-CN';
        }
        if (documentLanguage === 'ja-JP') {
            return 'ja';
        }
        if (documentLanguage === 'ar') {
            return 'ar';
        }
        return 'en';
    }
    getCopy(normalized) {
        if (normalized.documentLanguage === 'zh-CN') {
            return {
                heroBadge: 'OSpec 脚手架',
                scaffoldBadge: '已通过 OSpec 生成业务框架骨架',
                projectSummary: '项目简介',
                initialModules: '初始模块',
                fillModulesHint: '后续请在 OSpec 项目文档中继续补全模块规划。',
                projectLabel: '项目页面',
                navHome: '首页',
                navDocs: '文档',
                navBlog: '博客',
                navAdmin: '后台',
                navLogin: '登录',
                navAccount: '账户',
            };
        }
        if (normalized.documentLanguage === 'ja-JP') {
            return {
                heroBadge: 'OSpec スキャフォールド',
                scaffoldBadge: 'OSpec により業務 scaffold を生成済み',
                projectSummary: 'プロジェクト概要',
                initialModules: '初期モジュール',
                fillModulesHint: 'OSpec のプロジェクト文書でモジュール計画をさらに補ってください。',
                projectLabel: 'プロジェクトページ',
                navHome: 'ホーム',
                navDocs: 'Docs',
                navBlog: 'ブログ',
                navAdmin: 'Admin',
                navLogin: 'ログイン',
                navAccount: 'アカウント',
            };
        }
        if (normalized.documentLanguage === 'ar') {
            return {
                heroBadge: 'هيكل OSpec',
                scaffoldBadge: 'تم توليد scaffold الأعمال بواسطة OSpec',
                projectSummary: 'ملخص المشروع',
                initialModules: 'الوحدات الأولية',
                fillModulesHint: 'واصل تحسين تخطيط الوحدات في وثائق مشروع OSpec.',
                projectLabel: 'صفحة المشروع',
                navHome: 'الرئيسية',
                navDocs: 'الوثائق',
                navBlog: 'المدونة',
                navAdmin: 'الإدارة',
                navLogin: 'تسجيل الدخول',
                navAccount: 'الحساب',
            };
        }
        return {
            heroBadge: 'OSpec Scaffold',
            scaffoldBadge: 'Business scaffold generated by OSpec',
            projectSummary: 'Project Summary',
            initialModules: 'Initial Modules',
            fillModulesHint: 'Continue refining module planning in OSpec project docs.',
            projectLabel: 'Project Page',
            navHome: 'Home',
            navDocs: 'Docs',
            navBlog: 'Blog',
            navAdmin: 'Admin',
            navLogin: 'Login',
            navAccount: 'Account',
        };
    }
}
exports.ProjectScaffoldService = ProjectScaffoldService;
const createProjectScaffoldService = (fileService) => new ProjectScaffoldService(fileService);
exports.createProjectScaffoldService = createProjectScaffoldService;
//# sourceMappingURL=ProjectScaffoldService.js.map
