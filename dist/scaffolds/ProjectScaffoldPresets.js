"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalizedProjectScaffoldPurpose = exports.getLocalizedProjectScaffoldMeta = exports.getProjectScaffoldPreset = exports.PROJECT_SCAFFOLD_PRESETS = void 0;
exports.PROJECT_SCAFFOLD_PRESETS = [
    {
        presetId: 'official-site',
        title: 'Official Site Scaffold',
        description: 'Bootstrap a Next.js App Router website with docs, blog, admin, auth, and shared content services.',
        framework: 'Next.js + TypeScript + Tailwind CSS',
        installCommand: 'npm install && npm run dev',
        directories: [
            'app',
            'app/api',
            'app/api/health',
            'app/admin',
            'app/blog',
            'app/docs',
            'app/login',
            'public',
            'src',
            'src/components',
            'src/lib',
            'src/lib/auth',
            'src/lib/content',
        ],
        files: [
            { path: '.gitignore', category: 'config', purpose: 'Ignore Next.js build and dependency outputs.' },
            { path: 'package.json', category: 'config', purpose: 'Define Next.js runtime and development dependencies.' },
            { path: 'tsconfig.json', category: 'config', purpose: 'Provide TypeScript compiler settings for the app.' },
            { path: 'next-env.d.ts', category: 'config', purpose: 'Expose Next.js ambient types.' },
            { path: 'next.config.mjs', category: 'config', purpose: 'Enable strict Next.js runtime defaults.' },
            { path: 'postcss.config.js', category: 'config', purpose: 'Wire Tailwind CSS into PostCSS.' },
            { path: 'tailwind.config.ts', category: 'config', purpose: 'Scan app and src files for Tailwind classes.' },
            { path: 'app/globals.css', category: 'app', purpose: 'Define shared visual tokens and page-level styling.' },
            { path: 'app/layout.tsx', category: 'app', purpose: 'Provide the global shell and metadata.' },
            { path: 'app/page.tsx', category: 'app', purpose: 'Render the marketing homepage.' },
            { path: 'app/docs/page.tsx', category: 'app', purpose: 'Render the docs landing page.' },
            { path: 'app/blog/page.tsx', category: 'app', purpose: 'Render the changelog and blog surface.' },
            { path: 'app/admin/page.tsx', category: 'app', purpose: 'Render the CMS/admin entry surface.' },
            { path: 'app/login/page.tsx', category: 'app', purpose: 'Render the auth/login entry surface.' },
            { path: 'app/api/health/route.ts', category: 'app', purpose: 'Expose a basic health endpoint.' },
            { path: 'src/components/site-shell.tsx', category: 'library', purpose: 'Provide the shared navigation shell.' },
            { path: 'src/components/home-hero.tsx', category: 'library', purpose: 'Render the homepage hero section.' },
            { path: 'src/lib/content/navigation.ts', category: 'library', purpose: 'Define shared navigation and content entry points.' },
            { path: 'src/lib/auth/session.ts', category: 'library', purpose: 'Stub the auth session boundary for future implementation.' },
        ],
    },
    {
        presetId: 'nextjs-web',
        title: 'Next.js Web App Scaffold',
        description: 'Bootstrap a standard Next.js application with account, auth, and API surfaces.',
        framework: 'Next.js + TypeScript + Tailwind CSS',
        installCommand: 'npm install && npm run dev',
        directories: [
            'app',
            'app/account',
            'app/api',
            'app/api/health',
            'app/login',
            'public',
            'src',
            'src/components',
            'src/lib',
            'src/lib/auth',
            'src/lib/navigation',
        ],
        files: [
            { path: '.gitignore', category: 'config', purpose: 'Ignore Next.js build and dependency outputs.' },
            { path: 'package.json', category: 'config', purpose: 'Define Next.js runtime and development dependencies.' },
            { path: 'tsconfig.json', category: 'config', purpose: 'Provide TypeScript compiler settings for the app.' },
            { path: 'next-env.d.ts', category: 'config', purpose: 'Expose Next.js ambient types.' },
            { path: 'next.config.mjs', category: 'config', purpose: 'Enable strict Next.js runtime defaults.' },
            { path: 'postcss.config.js', category: 'config', purpose: 'Wire Tailwind CSS into PostCSS.' },
            { path: 'tailwind.config.ts', category: 'config', purpose: 'Scan app and src files for Tailwind classes.' },
            { path: 'app/globals.css', category: 'app', purpose: 'Define shared visual tokens and page-level styling.' },
            { path: 'app/layout.tsx', category: 'app', purpose: 'Provide the global shell and metadata.' },
            { path: 'app/page.tsx', category: 'app', purpose: 'Render the primary product homepage.' },
            { path: 'app/account/page.tsx', category: 'app', purpose: 'Render the account surface.' },
            { path: 'app/login/page.tsx', category: 'app', purpose: 'Render the auth/login entry surface.' },
            { path: 'app/api/health/route.ts', category: 'app', purpose: 'Expose a basic health endpoint.' },
            { path: 'src/components/site-shell.tsx', category: 'library', purpose: 'Provide the shared navigation shell.' },
            { path: 'src/lib/navigation/primary-nav.ts', category: 'library', purpose: 'Define app navigation entry points.' },
            { path: 'src/lib/auth/session.ts', category: 'library', purpose: 'Stub the auth session boundary for future implementation.' },
        ],
    },
];
const getProjectScaffoldPreset = (presetId) => exports.PROJECT_SCAFFOLD_PRESETS.find(preset => preset.presetId === presetId);
exports.getProjectScaffoldPreset = getProjectScaffoldPreset;
const getLocalizedProjectScaffoldMeta = (presetId, language) => {
    if (presetId === 'official-site') {
        return language === 'zh-CN'
            ? {
                title: '官网站点脚手架',
                description: '初始化一个包含 docs、blog、admin、auth 与共享内容服务的 Next.js App Router 官网骨架。',
                framework: 'Next.js + TypeScript + Tailwind CSS',
                installCommand: 'npm install && npm run dev',
            }
            : {
                title: 'Official Site Scaffold',
                description: 'Bootstrap a Next.js App Router website with docs, blog, admin, auth, and shared content services.',
                framework: 'Next.js + TypeScript + Tailwind CSS',
                installCommand: 'npm install && npm run dev',
            };
    }
    return language === 'zh-CN'
        ? {
            title: 'Next.js Web 应用脚手架',
            description: '初始化一个包含 account、auth 与 API 边界的标准 Next.js Web 应用骨架。',
            framework: 'Next.js + TypeScript + Tailwind CSS',
            installCommand: 'npm install && npm run dev',
        }
        : {
            title: 'Next.js Web App Scaffold',
            description: 'Bootstrap a standard Next.js application with account, auth, and API surfaces.',
            framework: 'Next.js + TypeScript + Tailwind CSS',
            installCommand: 'npm install && npm run dev',
        };
};
exports.getLocalizedProjectScaffoldMeta = getLocalizedProjectScaffoldMeta;
const getLocalizedProjectScaffoldPurpose = (filePath, language) => {
    if (language !== 'zh-CN') {
        const matchedPreset = exports.PROJECT_SCAFFOLD_PRESETS.find(preset => preset.files.some(file => file.path === filePath));
        return matchedPreset?.files.find(file => file.path === filePath)?.purpose || '';
    }
    const zhPurposes = {
        '.gitignore': '忽略 Next.js 构建产物与依赖目录。',
        'package.json': '定义 Next.js 运行时与开发依赖。',
        'tsconfig.json': '提供应用的 TypeScript 编译配置。',
        'next-env.d.ts': '暴露 Next.js 环境类型定义。',
        'next.config.mjs': '启用默认的 Next.js 严格运行配置。',
        'postcss.config.js': '把 Tailwind CSS 接入 PostCSS。',
        'tailwind.config.ts': '扫描 app 与 src 中的 Tailwind 类名。',
        'app/globals.css': '定义共享视觉变量与页面级样式。',
        'app/layout.tsx': '提供全局页面壳与元数据。',
        'app/page.tsx': '渲染首页或主站入口页面。',
        'app/docs/page.tsx': '渲染文档中心入口页面。',
        'app/blog/page.tsx': '渲染博客与更新日志入口页面。',
        'app/admin/page.tsx': '渲染 CMS 与后台入口页面。',
        'app/login/page.tsx': '渲染登录与鉴权入口页面。',
        'app/account/page.tsx': '渲染账户中心入口页面。',
        'app/api/health/route.ts': '提供基础健康检查接口。',
        'src/components/site-shell.tsx': '提供共享的站点导航壳。',
        'src/components/home-hero.tsx': '渲染首页英雄区块。',
        'src/lib/content/navigation.ts': '定义共享导航与内容入口。',
        'src/lib/navigation/primary-nav.ts': '定义应用导航入口。',
        'src/lib/auth/session.ts': '预留后续鉴权会话边界实现。',
    };
    return zhPurposes[filePath] || '';
};
exports.getLocalizedProjectScaffoldPurpose = getLocalizedProjectScaffoldPurpose;