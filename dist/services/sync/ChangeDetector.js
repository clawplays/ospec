"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChangeDetector = exports.ChangeDetector = void 0;
const child_process_1 = require("child_process");
const path_1 = require("path");
const util_1 = require("util");
const FileService_1 = require("../FileService");
const syncUtils_1 = require("./syncUtils");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class ChangeDetector {
    constructor(fileService = FileService_1.fileService) {
        this.fileService = fileService;
    }
    async detectChanges(rootDir, options = {}) {
        const resolvedRootDir = (0, path_1.resolve)(rootDir || process.cwd());
        const gitPath = (0, path_1.join)(resolvedRootDir, '.git');
        if (!(await this.fileService.exists(gitPath))) {
            return [];
        }
        const statusOutput = await this.execGit(resolvedRootDir, ['status', '--porcelain', '--untracked-files=all']);
        const filePatterns = this.normalizePatterns(options.filePatterns);
        const excludePatterns = this.normalizePatterns(options.excludePatterns);
        const changes = [];
        const seen = new Set();
        for (const line of String(statusOutput || '').split(/\r?\n/).filter(Boolean)) {
            const parsed = this.parseStatusLine(line, options.staged === true);
            if (!parsed) {
                continue;
            }
            if (filePatterns.length > 0 && !this.matchesAnyPattern(parsed.path, filePatterns)) {
                continue;
            }
            if (excludePatterns.length > 0 && this.matchesAnyPattern(parsed.path, excludePatterns)) {
                continue;
            }
            if (!seen.has(parsed.path)) {
                seen.add(parsed.path);
                changes.push(parsed);
            }
        }
        return changes.sort((left, right) => left.path.localeCompare(right.path));
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
    parseStatusLine(line, stagedOnly) {
        const normalizedLine = String(line || '').trimEnd();
        if (!normalizedLine) {
            return null;
        }
        const x = normalizedLine[0] || ' ';
        const y = normalizedLine[1] || ' ';
        const isUntracked = x === '?' && y === '?';
        if (stagedOnly) {
            if (isUntracked || x === ' ') {
                return null;
            }
        }
        else if (!isUntracked && x === ' ' && y === ' ') {
            return null;
        }
        const pathFragment = normalizedLine.slice(3).trim();
        const normalizedPath = pathFragment.includes(' -> ')
            ? pathFragment.split(' -> ').pop().trim().replace(/\\/g, '/')
            : pathFragment.replace(/\\/g, '/');
        if (!(0, syncUtils_1.isAnalyzablePath)(normalizedPath)) {
            return null;
        }
        const statusPair = normalizedLine.slice(0, 2);
        const type = statusPair === '??' || statusPair.includes('A')
            ? 'added'
            : statusPair.includes('D')
                ? 'deleted'
                : 'modified';
        return {
            path: normalizedPath,
            type,
        };
    }
    normalizePatterns(patterns) {
        if (!patterns) {
            return [];
        }
        const source = Array.isArray(patterns) ? patterns : [patterns];
        return source
            .flatMap(pattern => String(pattern || '').split(','))
            .map(pattern => pattern.trim().replace(/^['"]|['"]$/g, '').replace(/\\/g, '/'))
            .filter(Boolean);
    }
    matchesAnyPattern(filePath, patterns) {
        return patterns.some(pattern => this.matchesPattern(filePath, pattern));
    }
    matchesPattern(filePath, pattern) {
        const regex = this.globToRegExp(pattern);
        return regex.test(filePath);
    }
    globToRegExp(pattern) {
        let regex = '^';
        const normalized = String(pattern || '').replace(/\\/g, '/');
        for (let index = 0; index < normalized.length; index += 1) {
            const char = normalized[index];
            const next = normalized[index + 1];
            if (char === '*') {
                if (next === '*') {
                    const afterNext = normalized[index + 2];
                    if (afterNext === '/') {
                        regex += '(?:.*/)?';
                        index += 2;
                    }
                    else {
                        regex += '.*';
                        index += 1;
                    }
                }
                else {
                    regex += '[^/]*';
                }
                continue;
            }
            if (char === '?') {
                regex += '.';
                continue;
            }
            if ('\\.[]{}()+-^$|'.includes(char)) {
                regex += `\\${char}`;
                continue;
            }
            regex += char;
        }
        regex += '$';
        return new RegExp(regex);
    }
}
exports.ChangeDetector = ChangeDetector;
const createChangeDetector = (fileService) => new ChangeDetector(fileService);
exports.createChangeDetector = createChangeDetector;
