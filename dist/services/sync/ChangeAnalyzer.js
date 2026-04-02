"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeAnalyzer = exports.ChangeAnalyzer = void 0;
const child_process_1 = require("child_process");
const path_1 = require("path");
const util_1 = require("util");
const FileService_1 = require("../FileService");
const syncUtils_1 = require("./syncUtils");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class ChangeAnalyzer {
    constructor(fileService = FileService_1.fileService) {
        this.fileService = fileService;
    }
    async analyzeChange(changePath) {
        const resolvedChangePath = (0, path_1.resolve)(changePath || process.cwd());
        const rootDir = (0, syncUtils_1.resolveChangeRoot)(resolvedChangePath);
        const state = await this.readStateFile(resolvedChangePath);
        const featureName = typeof state.feature === 'string' && state.feature.trim().length > 0
            ? state.feature
            : (0, path_1.basename)(resolvedChangePath);
        const changeMap = new Map();
        for (const change of await this.getGitChanges(rootDir)) {
            changeMap.set(change.path, change);
        }
        const declaredAffects = Array.isArray(state.affects) ? state.affects : [];
        for (const affectedPath of declaredAffects) {
            const normalized = String(affectedPath || '').replace(/\\/g, '/');
            if (!(0, syncUtils_1.isAnalyzablePath)(normalized) || changeMap.has(normalized)) {
                continue;
            }
            changeMap.set(normalized, {
                path: normalized,
                type: 'modified',
                linesAdded: 0,
                linesDeleted: 0,
            });
        }
        const affectedFiles = Array.from(changeMap.values())
            .filter(item => (0, syncUtils_1.isAnalyzablePath)(item.path))
            .sort((left, right) => left.path.localeCompare(right.path));
        const codeChanges = [];
        for (const fileChange of affectedFiles) {
            if (!(0, syncUtils_1.isCodeLikePath)(fileChange.path) || fileChange.type === 'deleted') {
                continue;
            }
            codeChanges.push(...await this.extractCodeChanges(rootDir, fileChange));
        }
        const affectedModules = Array.from(new Set(affectedFiles
            .map(item => this.toModuleName(item.path))
            .filter(Boolean)))
            .sort((left, right) => left.localeCompare(right));
        return {
            changeName: featureName,
            changePath: resolvedChangePath,
            rootDir,
            affectedFiles,
            affectedModules,
            codeChanges,
            summary: this.buildSummary(featureName, affectedFiles, affectedModules, codeChanges),
        };
    }
    async readStateFile(changePath) {
        const statePath = (0, path_1.join)(changePath, 'state.json');
        if (!(await this.fileService.exists(statePath))) {
            return {};
        }
        return this.fileService.readJSON(statePath);
    }
    async getGitChanges(rootDir) {
        const gitDir = (0, path_1.join)(rootDir, '.git');
        if (!(await this.fileService.exists(gitDir))) {
            return [];
        }
        const [statusOutput, stagedStats, workingStats] = await Promise.all([
            this.execGit(rootDir, ['status', '--porcelain', '--untracked-files=all']),
            this.execGit(rootDir, ['diff', '--cached', '--numstat']),
            this.execGit(rootDir, ['diff', '--numstat']),
        ]);
        const lineStats = this.mergeLineStats(stagedStats, workingStats);
        return String(statusOutput || '')
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(Boolean)
            .map(line => this.parseStatusLine(line, lineStats))
            .filter(Boolean);
    }
    async execGit(rootDir, args) {
        try {
            const result = await execFileAsync('git', args, {
                cwd: rootDir,
                windowsHide: true,
            });
            return result.stdout || '';
        }
        catch {
            return '';
        }
    }
    mergeLineStats(...outputs) {
        const stats = new Map();
        for (const output of outputs) {
            for (const line of String(output || '').split(/\r?\n/).filter(Boolean)) {
                const [addedRaw, deletedRaw, filePathRaw] = line.split('\t');
                if (!filePathRaw) {
                    continue;
                }
                const filePath = filePathRaw.replace(/\\/g, '/');
                const existing = stats.get(filePath) || { linesAdded: 0, linesDeleted: 0 };
                existing.linesAdded += Number(addedRaw) || 0;
                existing.linesDeleted += Number(deletedRaw) || 0;
                stats.set(filePath, existing);
            }
        }
        return stats;
    }
    parseStatusLine(line, lineStats) {
        const statusCode = line.slice(0, 2).trim();
        const pathFragment = line.slice(3).trim();
        const normalizedPath = pathFragment.includes(' -> ')
            ? pathFragment.split(' -> ').pop().trim().replace(/\\/g, '/')
            : pathFragment.replace(/\\/g, '/');
        if (!(0, syncUtils_1.isAnalyzablePath)(normalizedPath)) {
            return null;
        }
        const type = statusCode === '??' || statusCode.includes('A')
            ? 'added'
            : statusCode.includes('D')
                ? 'deleted'
                : 'modified';
        const metrics = lineStats.get(normalizedPath) || { linesAdded: 0, linesDeleted: 0 };
        return {
            path: normalizedPath,
            type,
            linesAdded: metrics.linesAdded,
            linesDeleted: metrics.linesDeleted,
        };
    }
    async extractCodeChanges(rootDir, fileChange) {
        const absolutePath = (0, path_1.join)(rootDir, fileChange.path);
        if (!(await this.fileService.exists(absolutePath))) {
            return [];
        }
        const content = await this.fileService.readFile(absolutePath);
        const patterns = [
            {
                type: 'class',
                regex: /(?:^|\n)(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
                signature: match => `class ${match[1]}`,
                include: (name) => !this.isGeneratedSymbol(name),
            },
            {
                type: 'function',
                regex: /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g,
                signature: match => `function ${match[1]}(${(match[2] || '').trim()})`,
                include: (name) => !this.isGeneratedSymbol(name),
            },
            {
                type: 'interface',
                regex: /(?:^|\n)(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/g,
                signature: match => `interface ${match[1]}`,
                include: (name) => !this.isGeneratedSymbol(name),
            },
            {
                type: 'type',
                regex: /(?:^|\n)(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/g,
                signature: match => `type ${match[1]}`,
                include: (name) => !this.isGeneratedSymbol(name),
            },
            {
                type: 'constant',
                regex: /(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g,
                signature: match => `const ${match[1]}`,
                include: (name, line) => {
                    if (this.isGeneratedSymbol(name)) {
                        return false;
                    }
                    if (/require\s*\(/.test(line) || /__import[A-Za-z]+/.test(line)) {
                        return false;
                    }
                    return /^[A-Z0-9_]+$/.test(name) || /^create[A-Z]/.test(name) || /Async$/.test(name);
                },
            },
        ];
        const seen = new Set();
        const results = [];
        for (const pattern of patterns) {
            const regex = new RegExp(pattern.regex);
            let match = regex.exec(content);
            while (match) {
                const name = match[1];
                const line = content.slice(match.index, content.indexOf('\n', match.index) === -1 ? content.length : content.indexOf('\n', match.index));
                if (typeof pattern.include === 'function' && !pattern.include(name, line)) {
                    match = regex.exec(content);
                    continue;
                }
                const key = `${pattern.type}:${name}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({
                        file: fileChange.path,
                        type: pattern.type,
                        name,
                        changeType: fileChange.type,
                        signature: pattern.signature(match),
                        jsdoc: this.extractJsDoc(content, match.index),
                    });
                }
                match = regex.exec(content);
            }
        }
        return results.sort((left, right) => {
            if (left.file !== right.file) {
                return left.file.localeCompare(right.file);
            }
            return left.name.localeCompare(right.name);
        });
    }
    extractJsDoc(content, matchIndex) {
        const windowStart = Math.max(0, matchIndex - 400);
        const prefix = content.slice(windowStart, matchIndex);
        const matches = prefix.match(/\/\*\*([\s\S]*?)\*\//g);
        if (!matches || matches.length === 0) {
            return undefined;
        }
        const last = matches[matches.length - 1];
        return last
            .replace(/^\/\*\*|\*\/$/g, '')
            .split('\n')
            .map(line => line.replace(/^\s*\*\s?/, '').trim())
            .filter(Boolean)
            .join(' ');
    }
    toModuleName(filePath) {
        const parts = String(filePath || '').split('/').filter(Boolean);
        if (parts.length === 0) {
            return '';
        }
        if (parts.length === 1) {
            return parts[0];
        }
        return `${parts[0]}/${parts[1]}`;
    }
    buildSummary(featureName, affectedFiles, affectedModules, codeChanges) {
        const filePart = `${affectedFiles.length} file(s)`;
        const modulePart = `${affectedModules.length} module(s)`;
        const changePart = `${codeChanges.length} symbol(s)`;
        return `${featureName}: detected ${filePart}, ${modulePart}, ${changePart}`;
    }
    isGeneratedSymbol(name) {
        return /^__/.test(name) || /_\d+$/.test(name);
    }
}
exports.ChangeAnalyzer = ChangeAnalyzer;
const createChangeAnalyzer = (fileService) => new ChangeAnalyzer(fileService);
exports.createChangeAnalyzer = createChangeAnalyzer;
