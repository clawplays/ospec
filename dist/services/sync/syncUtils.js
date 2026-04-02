"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPackageManifest = exports.listProjectKnowledgeDocs = exports.findNearestSkillFile = exports.extractManagedFingerprint = exports.upsertManagedSection = exports.createFingerprint = exports.isAnalyzablePath = exports.isCodeLikePath = exports.relativePath = exports.resolveChangeRoot = void 0;
const crypto_1 = require("crypto");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const MANAGED_PREFIX = 'OSPEC-DOC-SYNC';
const PROJECT_DOCS = [
    'docs/project/overview.md',
    'docs/project/tech-stack.md',
    'docs/project/architecture.md',
    'docs/project/module-map.md',
    'docs/project/api-overview.md',
];
function resolveChangeRoot(changePath) {
    const resolvedPath = (0, path_1.resolve)(changePath || process.cwd());
    const normalized = resolvedPath.split(path_1.sep);
    const changeIndex = normalized.lastIndexOf('changes');
    if (changeIndex > 0) {
        return normalized.slice(0, changeIndex).join(path_1.sep);
    }
    return resolvedPath;
}
exports.resolveChangeRoot = resolveChangeRoot;
function relativePath(rootDir, targetPath) {
    return (0, path_1.relative)(rootDir, targetPath).replace(/\\/g, '/');
}
exports.relativePath = relativePath;
function isCodeLikePath(filePath) {
    return /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/i.test(filePath);
}
exports.isCodeLikePath = isCodeLikePath;
function isAnalyzablePath(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    if (!normalized) {
        return false;
    }
    if (normalized.startsWith('changes/') ||
        normalized.startsWith('docs/') ||
        normalized.startsWith('project-docs/') ||
        normalized.startsWith('.ospec/') ||
        normalized === 'SKILL.index.json') {
        return false;
    }
    return normalized === 'package.json' || normalized === '.skillrc' || isCodeLikePath(normalized);
}
exports.isAnalyzablePath = isAnalyzablePath;
function createFingerprint(analysis) {
    const payload = {
        changeName: analysis.changeName,
        affectedFiles: analysis.affectedFiles.map(item => ({
            path: item.path,
            type: item.type,
            linesAdded: item.linesAdded,
            linesDeleted: item.linesDeleted,
        })),
        affectedModules: analysis.affectedModules,
        codeChanges: analysis.codeChanges.map(item => ({
            file: item.file,
            type: item.type,
            name: item.name,
            changeType: item.changeType,
            signature: item.signature || '',
        })),
    };
    return (0, crypto_1.createHash)('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 12);
}
exports.createFingerprint = createFingerprint;
function blockStart(id) {
    return `<!-- ${MANAGED_PREFIX}:${id}:START -->`;
}
function blockEnd(id) {
    return `<!-- ${MANAGED_PREFIX}:${id}:END -->`;
}
function fingerprintLine(id, fingerprint) {
    return `<!-- ${MANAGED_PREFIX}:${id}:FINGERPRINT:${fingerprint} -->`;
}
function upsertManagedSection(content, id, title, body, fingerprint) {
    const normalized = String(content || '').replace(/\r\n?/g, '\n').trimEnd();
    const block = [
        blockStart(id),
        fingerprintLine(id, fingerprint),
        title,
        '',
        body.trim(),
        blockEnd(id),
    ].join('\n');
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`<!-- ${MANAGED_PREFIX}:${escapedId}:START -->[\\s\\S]*?<!-- ${MANAGED_PREFIX}:${escapedId}:END -->`, 'm');
    if (pattern.test(normalized)) {
        return `${normalized.replace(pattern, block)}\n`;
    }
    const spacer = normalized.length === 0 ? '' : '\n\n';
    return `${normalized}${spacer}${block}\n`;
}
exports.upsertManagedSection = upsertManagedSection;
function extractManagedFingerprint(content, id) {
    const normalized = String(content || '').replace(/\r\n?/g, '\n');
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalized.match(new RegExp(`<!-- ${MANAGED_PREFIX}:${escapedId}:FINGERPRINT:([a-f0-9]{12}) -->`));
    return match ? match[1] : null;
}
exports.extractManagedFingerprint = extractManagedFingerprint;
async function findNearestSkillFile(rootDir, filePath) {
    const absoluteFile = (0, path_1.resolve)(rootDir, filePath);
    let currentDir = (0, path_1.dirname)(absoluteFile);
    const absoluteRoot = (0, path_1.resolve)(rootDir);
    while (currentDir.startsWith(absoluteRoot)) {
        const candidate = (0, path_1.join)(currentDir, 'SKILL.md');
        if (await (0, fs_extra_1.pathExists)(candidate)) {
            return candidate;
        }
        if (currentDir === absoluteRoot) {
            break;
        }
        currentDir = (0, path_1.dirname)(currentDir);
    }
    const rootSkill = (0, path_1.join)(absoluteRoot, 'SKILL.md');
    return (await (0, fs_extra_1.pathExists)(rootSkill)) ? rootSkill : null;
}
exports.findNearestSkillFile = findNearestSkillFile;
function listProjectKnowledgeDocs() {
    return [...PROJECT_DOCS];
}
exports.listProjectKnowledgeDocs = listProjectKnowledgeDocs;
async function readPackageManifest(rootDir) {
    const packagePath = (0, path_1.join)(rootDir, 'package.json');
    if (!(await (0, fs_extra_1.pathExists)(packagePath))) {
        return null;
    }
    return (0, fs_extra_1.readJson)(packagePath);
}
exports.readPackageManifest = readPackageManifest;
