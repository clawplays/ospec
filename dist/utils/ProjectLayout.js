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
exports.normalizeProjectLayout = normalizeProjectLayout;
exports.getProjectLayout = getProjectLayout;
exports.getProjectManagedRoot = getProjectManagedRoot;
exports.toManagedRelativePath = toManagedRelativePath;
exports.resolveManagedPath = resolveManagedPath;
exports.getChangeDir = getChangeDir;
exports.resolveManagedInputPath = resolveManagedInputPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const ROOT_VISIBLE_RELATIVE_PATHS = new Set([
    constants_1.FILE_NAMES.SKILLRC,
    constants_1.FILE_NAMES.README,
    '.ospec',
]);
function normalizeProjectLayout(input) {
    return input === 'nested' || input === 'classic' ? input : undefined;
}
function getProjectLayout(input) {
    if (typeof input === 'string') {
        return normalizeProjectLayout(input) || 'classic';
    }
    return normalizeProjectLayout(input?.projectLayout) || 'classic';
}
function getProjectManagedRoot(rootDir, input) {
    const layout = getProjectLayout(input);
    return layout === 'nested' ? path.join(rootDir, '.ospec') : rootDir;
}
function toManagedRelativePath(relativePath, input) {
    const normalizedRelativePath = String(relativePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
    if (!normalizedRelativePath) {
        return normalizedRelativePath;
    }
    const layout = getProjectLayout(input);
    if (layout !== 'nested' ||
        ROOT_VISIBLE_RELATIVE_PATHS.has(normalizedRelativePath) ||
        normalizedRelativePath.startsWith('.ospec/')) {
        return normalizedRelativePath;
    }
    return path.posix.join('.ospec', normalizedRelativePath);
}
function resolveManagedPath(rootDir, relativePath, input) {
    return path.join(rootDir, ...toManagedRelativePath(relativePath, input).split('/'));
}
function getChangeDir(rootDir, bucket, featureName, input) {
    return resolveManagedPath(rootDir, `${constants_1.DIR_NAMES.CHANGES}/${bucket}/${featureName}`, input);
}
function resolveManagedInputPath(rootDir, candidatePath, input) {
    const layout = getProjectLayout(input);
    const resolvedCandidatePath = path.isAbsolute(candidatePath)
        ? candidatePath
        : path.resolve(rootDir, candidatePath);
    if (layout !== 'nested' || fs.existsSync(resolvedCandidatePath)) {
        return resolvedCandidatePath;
    }
    const normalizedCandidatePath = String(candidatePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
    if (normalizedCandidatePath.startsWith('changes/') ||
        normalizedCandidatePath.startsWith('for-ai/') ||
        normalizedCandidatePath.startsWith('knowledge/') ||
        normalizedCandidatePath.startsWith('docs/') ||
        normalizedCandidatePath.startsWith('src/') ||
        normalizedCandidatePath.startsWith('tests/') ||
        normalizedCandidatePath === constants_1.FILE_NAMES.SKILL_MD ||
        normalizedCandidatePath === constants_1.FILE_NAMES.SKILL_INDEX) {
        return resolveManagedPath(rootDir, normalizedCandidatePath, layout);
    }
    return resolvedCandidatePath;
}
