#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes', 'for-ai']);
const INDEX_FILE = 'SKILL.index.json';
const SKILL_FILE = 'SKILL.md';
async function main() {
    try {
        const action = process.argv[2] || 'build';
        const rootDir = process.cwd();
        switch (action) {
            case 'build':
                await writeIndex(rootDir, { silent: false });
                break;
            case 'hook-check':
                process.exitCode = await runHookCheck(rootDir, process.argv[3] || 'pre-commit');
                break;
            default:
                console.error(`[ospec] unknown action: ${action}`);
                process.exitCode = 1;
        }
    }
    catch (error) {
        console.error(`[ospec] ${error.message}`);
        process.exitCode = 1;
    }
}
async function runHookCheck(rootDir, event) {
    const config = await loadHookConfig(rootDir);
    if (event === 'pre-commit' && config.preCommit === false) {
        return 0;
    }
    if (event === 'post-merge' && config.postMerge === false) {
        return 0;
    }
    const activeChanges = await listActiveChanges(rootDir);
    if (activeChanges.length === 0) {
        console.log('[ospec] no active changes, hook check skipped');
        return 0;
    }
    const stagedFiles = event === 'pre-commit' ? getStagedFiles(rootDir) : [];
    if (event === 'pre-commit') {
        const relevantPaths = stagedFiles.filter(isHookRelevantPath);
        if (relevantPaths.length === 0) {
            console.log('[ospec] no staged OSpec files, hook check skipped');
            return 0;
        }
    }
    let shouldBlock = false;
    const shouldCheckIndex = config.indexCheck !== 'off' &&
        (event === 'post-merge' || stagedFiles.some(filePath => isIndexRelevantPath(filePath)));
    if (shouldCheckIndex) {
        const indexStatus = await computeIndexStatus(rootDir);
        if (indexStatus.stale) {
            console.log('[ospec] SKILL.index.json is stale');
            console.log('[ospec] run "ospec index build" or "node .ospec/tools/build-index-auto.cjs" to refresh it');
            if (event === 'pre-commit' && config.indexCheck === 'error') {
                shouldBlock = true;
            }
        }
        else {
            console.log('[ospec] SKILL.index.json is up to date');
        }
    }
    if (event === 'pre-commit' && config.changeCheck !== 'off') {
        const affectedChanges = collectAffectedChanges(stagedFiles, activeChanges);
        if (affectedChanges.length === 0) {
            console.log('[ospec] no active change files staged, change summary skipped');
        }
        else {
            console.log('[ospec] active change summary');
            for (const changeName of affectedChanges) {
                const summary = await buildChangeSummary(rootDir, changeName, config);
                if (!summary) {
                    continue;
                }
                console.log(`${summary.summaryStatus.toUpperCase()} ${summary.name} [${summary.status}] ${summary.progress}%`);
                const issues = summary.checks.filter(check => check.status !== 'pass');
                if (issues.length === 0) {
                    console.log('  protocol files and checklists are aligned');
                }
                else {
                    for (const issue of issues) {
                        console.log(`  ${issue.status.toUpperCase()} ${issue.name}: ${issue.message}`);
                    }
                }
                if (summary.summaryStatus !== 'pass' && config.changeCheck === 'error') {
                    shouldBlock = true;
                }
            }
        }
    }
    if (shouldBlock) {
        console.log('[ospec] hook blocked by current hook policy');
        return 1;
    }
    return 0;
}
async function writeIndex(rootDir, options) {
    const indexPath = path.join(rootDir, INDEX_FILE);
    const nextIndex = await buildIndex(rootDir);
    const currentIndex = await readJsonIfExists(indexPath);
    if (currentIndex && isSameIndex(currentIndex, nextIndex)) {
        if (!options.silent) {
            console.log('[ospec] SKILL.index.json already up to date');
            printIndexStats(currentIndex);
        }
        return { changed: false, index: currentIndex };
    }
    const output = {
        ...nextIndex,
        generated: new Date().toISOString(),
    };
    await fsp.writeFile(indexPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    if (!options.silent) {
        console.log('[ospec] SKILL.index.json rebuilt');
        printIndexStats(output);
    }
    return { changed: true, index: output };
}
async function computeIndexStatus(rootDir) {
    const currentIndex = await readJsonIfExists(path.join(rootDir, INDEX_FILE));
    const nextIndex = await buildIndex(rootDir);
    return {
        stale: !currentIndex || !isSameIndex(currentIndex, nextIndex),
        currentIndex,
        nextIndex,
    };
}
async function buildIndex(rootDir) {
    const modules = {};
    const tagIndex = {};
    let totalFiles = 0;
    let totalSections = 0;
    await walk(rootDir, async fullPath => {
        totalFiles += 1;
        const relativePath = normalizePath(path.relative(rootDir, fullPath));
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        const moduleName = parsed.frontmatter.name || relativePath;
        const title = parsed.frontmatter.title || parsed.frontmatter.name || relativePath;
        const tags = Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [];
        totalSections += Object.keys(parsed.sections).length;
        modules[moduleName] = {
            file: relativePath,
            title,
            tags,
            sections: parsed.sections,
        };
        for (const tag of tags) {
            if (!tagIndex[tag]) {
                tagIndex[tag] = [];
            }
            tagIndex[tag].push(moduleName);
        }
    });
    for (const tag of Object.keys(tagIndex).sort((left, right) => left.localeCompare(right))) {
        tagIndex[tag] = tagIndex[tag].sort((left, right) => left.localeCompare(right));
    }
    const activeChanges = await listActiveChanges(rootDir);
    return {
        version: '1.0',
        generated: new Date().toISOString(),
        git_commit: null,
        active_changes: activeChanges,
        stats: {
            totalFiles,
            totalModules: Object.keys(modules).length,
            totalSections,
        },
        modules,
        tagIndex,
    };
}
async function walk(currentDir, onSkillFile) {
    const entries = (await fsp.readdir(currentDir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                await walk(fullPath, onSkillFile);
            }
            continue;
        }
        if (entry.name === SKILL_FILE) {
            await onSkillFile(fullPath);
        }
    }
}
async function buildChangeSummary(rootDir, changeName, config) {
    const featureDir = path.join(rootDir, 'changes', 'active', changeName);
    const state = await readJsonIfExists(path.join(featureDir, 'state.json'));
    if (!state) {
        return null;
    }
    const proposalPath = path.join(featureDir, 'proposal.md');
    const tasksPath = path.join(featureDir, 'tasks.md');
    const verificationPath = path.join(featureDir, 'verification.md');
    const proposalExists = await exists(proposalPath);
    const tasksExists = await exists(tasksPath);
    const verificationExists = await exists(verificationPath);
    const checks = [
        {
            name: 'proposal.md',
            status: proposalExists ? 'pass' : 'fail',
            message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing',
        },
        {
            name: 'tasks.md',
            status: tasksExists ? 'pass' : 'fail',
            message: tasksExists ? 'Tasks file exists' : 'tasks.md is missing',
        },
        {
            name: 'verification.md',
            status: verificationExists ? 'pass' : 'fail',
            message: verificationExists ? 'Verification file exists' : 'verification.md is missing',
        },
    ];
    let flags = [];
    let activatedSteps = [];
    if (proposalExists) {
        const proposal = parseFrontmatter(await fsp.readFile(proposalPath, 'utf8'));
        flags = ensureArray(proposal.data.flags);
        activatedSteps = getActivatedSteps(config.workflow, flags);
        const unsupportedFlags = flags.filter(flag => !ensureArray(config.workflow?.feature_flags?.supported).includes(flag));
        checks.push({
            name: 'proposal.flags',
            status: 'pass',
            message: activatedSteps.length > 0
                ? `Activated optional steps: ${activatedSteps.join(', ')}`
                : 'No optional steps activated',
        });
        if (unsupportedFlags.length > 0) {
            checks.push({
                name: 'proposal.unsupported_flags',
                status: 'warn',
                message: `Unsupported flags: ${unsupportedFlags.join(', ')}`,
            });
        }
    }
    if (tasksExists) {
        const tasks = analyzeWorkflowChecklistDocument(await fsp.readFile(tasksPath, 'utf8'), {
            name: 'tasks.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...tasks.checks);
    }
    if (verificationExists) {
        const verification = analyzeWorkflowChecklistDocument(await fsp.readFile(verificationPath, 'utf8'), {
            name: 'verification.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['status', 'string'],
                ['optional_steps', 'array'],
                ['passed_optional_steps', 'array'],
            ],
        });
        checks.push(...verification.checks);
    }
    const hasProtocolIssues = checks.some(check => check.status !== 'pass');
    if (state.status === 'archived') {
        checks.push({
            name: 'archive.location',
            status: 'fail',
            message: 'state.json.status is archived but the change is still under changes/active',
        });
    }
    else if (state.status === 'ready_to_archive' && !hasProtocolIssues) {
        checks.push({
            name: 'archive.pending',
            status: 'warn',
            message: `Change is ready to archive. Run "ospec archive changes/active/${changeName}" before commit.`,
        });
    }
    const failCount = checks.filter(check => check.status === 'fail').length;
    const warnCount = checks.filter(check => check.status === 'warn').length;
    return {
        name: state.feature || changeName,
        status: state.status || 'draft',
        progress: calculateProgress(state),
        summaryStatus: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
        checks,
    };
}
function calculateProgress(state) {
    const completed = Array.isArray(state.completed) ? state.completed.length : 0;
    const pending = Array.isArray(state.pending) ? state.pending.length : 0;
    const total = completed + pending;
    if (total === 0) {
        return 0;
    }
    return Math.round((completed / total) * 100);
}
function collectAffectedChanges(stagedFiles, activeChanges) {
    const affected = new Set();
    for (const filePath of stagedFiles) {
        const match = filePath.match(/^changes\/active\/([^/]+)\//);
        if (match) {
            affected.add(match[1]);
        }
    }
    if (affected.size === 0 && stagedFiles.includes('.skillrc')) {
        for (const changeName of activeChanges) {
            affected.add(changeName);
        }
    }
    return Array.from(affected).sort((left, right) => left.localeCompare(right));
}
function isHookRelevantPath(filePath) {
    return filePath === '.skillrc' || isIndexRelevantPath(filePath);
}
function isIndexRelevantPath(filePath) {
    return filePath === SKILL_FILE || /(^|\/)SKILL\.md$/.test(filePath) || filePath.startsWith('changes/active/');
}
async function listActiveChanges(rootDir) {
    const activeDir = path.join(rootDir, 'changes', 'active');
    if (!(await exists(activeDir))) {
        return [];
    }
    return (await fsp.readdir(activeDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((left, right) => left.localeCompare(right));
}
async function loadHookConfig(rootDir) {
    const config = (await readJsonIfExists(path.join(rootDir, '.skillrc'))) || {};
    const hooks = config.hooks || {};
    const fallback = hooks['spec-check'] || 'error';
    const normalized = {
        preCommit: hooks['pre-commit'] !== false,
        postMerge: hooks['post-merge'] !== false,
        changeCheck: hooks['change-check'] || fallback,
        indexCheck: hooks['index-check'] || fallback,
    };
    const legacyWarnDefaults = config.version === '3.0' &&
        config.mode !== 'lite' &&
        normalized.preCommit &&
        normalized.postMerge &&
        fallback === 'warn' &&
        normalized.changeCheck === 'warn' &&
        normalized.indexCheck === 'warn';
    return {
        preCommit: normalized.preCommit,
        postMerge: normalized.postMerge,
        changeCheck: legacyWarnDefaults ? 'error' : normalized.changeCheck,
        indexCheck: legacyWarnDefaults ? 'error' : normalized.indexCheck,
        workflow: config.workflow || {},
    };
}
function getActivatedSteps(workflowConfig, flags) {
    const optionalSteps = workflowConfig && workflowConfig.optional_steps ? workflowConfig.optional_steps : {};
    const activated = [];
    for (const [stepName, stepConfig] of Object.entries(optionalSteps)) {
        if (!stepConfig || stepConfig.enabled === false) {
            continue;
        }
        const when = ensureArray(stepConfig.when);
        if (when.some(flag => flags.includes(flag))) {
            activated.push(stepName);
        }
    }
    return activated.sort((left, right) => left.localeCompare(right));
}
function getStagedFiles(rootDir) {
    const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
        cwd: rootDir,
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        return [];
    }
    return result.stdout
        .split(/\r?\n/)
        .map(item => normalizePath(item.trim()))
        .filter(Boolean);
}
function parseSkillFile(content) {
    const normalizedContent = normalizeLineEndings(content);
    const parsed = parseFrontmatter(normalizedContent);
    return {
        frontmatter: {
            name: typeof parsed.data.name === 'string' ? parsed.data.name : undefined,
            title: typeof parsed.data.title === 'string' ? parsed.data.title : undefined,
            tags: ensureArray(parsed.data.tags),
        },
        sections: extractSections(parsed.body),
    };
}
function analyzeWorkflowChecklistDocument(content, options) {
    const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
    let parsed = null;
    let parseError = null;
    if (hasFrontmatter) {
        try {
            parsed = parseFrontmatter(content, { strict: true });
        }
        catch (error) {
            parseError = error;
        }
    }
    const data = parsed?.data ?? {};
    const optionalStepsFieldValid = Array.isArray(data.optional_steps);
    const optionalSteps = optionalStepsFieldValid ? ensureArray(data.optional_steps) : [];
    const invalidRequiredFields = options.requiredFields
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const checklistItems = parsed?.body.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
    const uncheckedItems = parsed?.body.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
    const checklistStructureValid = checklistItems.length > 0;
    let frontmatterMessage = `${options.name} frontmatter parsed successfully`;
    if (!hasFrontmatter) {
        frontmatterMessage = `${options.name} is missing a valid frontmatter block`;
    }
    else if (parseError) {
        frontmatterMessage = `${options.name} frontmatter cannot be parsed: ${parseError.message}`;
    }
    let requiredFieldsMessage = `${options.name} has all required frontmatter fields`;
    if (!hasFrontmatter || parseError) {
        requiredFieldsMessage = `Cannot validate required fields in ${options.name} because frontmatter is invalid`;
    }
    else if (invalidRequiredFields.length > 0) {
        requiredFieldsMessage = `Missing or invalid required fields in ${options.name}: ${invalidRequiredFields.join(', ')}`;
    }
    let optionalStepsMessage = `All activated optional steps are present in ${options.name}`;
    if (!optionalStepsFieldValid) {
        optionalStepsMessage = `${options.name} frontmatter field optional_steps must be an array`;
    }
    else if (missingActivatedSteps.length > 0) {
        optionalStepsMessage = `Missing optional steps in ${options.name}: ${missingActivatedSteps.join(', ')}`;
    }
    let checklistStatus = 'pass';
    let checklistMessage = `${options.name} checklist is complete`;
    if (!hasFrontmatter || parseError) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} checklist cannot be validated because frontmatter is invalid`;
    }
    else if (!checklistStructureValid) {
        checklistStatus = 'fail';
        checklistMessage = `${options.name} must contain at least one Markdown checklist item`;
    }
    else if (uncheckedItems.length > 0) {
        checklistStatus = 'warn';
        checklistMessage = `${options.name} still has unchecked items`;
    }
    return {
        optionalSteps,
        checks: [
            {
                name: `${options.name}.frontmatter`,
                status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                message: frontmatterMessage,
            },
            {
                name: `${options.name}.required_fields`,
                status: hasFrontmatter && parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: requiredFieldsMessage,
            },
            {
                name: `${options.name}.optional_steps`,
                status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                message: optionalStepsMessage,
            },
            {
                name: `${options.name}.checklist`,
                status: checklistStatus,
                message: checklistMessage,
            },
        ],
    };
}
function normalizeLineEndings(content) {
    return String(content || '').replace(/\r\n?/g, '\n');
}
function parseFrontmatter(content, options = {}) {
    const normalizedContent = normalizeLineEndings(content);
    const match = normalizedContent.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
        return { data: {}, body: normalizedContent };
    }
    const data = {};
    const lines = match[1].split('\n');
    let currentKey = null;
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineNumber = index + 1;
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        if (/^\s*-\s+/.test(line) && currentKey) {
            if (!Array.isArray(data[currentKey])) {
                data[currentKey] = [];
            }
            data[currentKey].push(parseValue(line.replace(/^\s*-\s+/, '').trim(), options, {
                key: currentKey,
                lineNumber,
            }));
            continue;
        }
        if (/^\s*-\s+/.test(line) && options.strict) {
            throw createFrontmatterParseError('Unexpected list item outside an array field', lineNumber);
        }
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) {
            if (options.strict) {
                throw createFrontmatterParseError(`Invalid frontmatter line: ${trimmed}`, lineNumber);
            }
            currentKey = null;
            continue;
        }
        const key = keyMatch[1];
        const rawValue = keyMatch[2].trim();
        data[key] = parseValue(rawValue, options, { key, lineNumber });
        currentKey = Array.isArray(data[key]) && rawValue === '' ? key : null;
    }
    return {
        data,
        body: normalizedContent.slice(match[0].length),
    };
}
function isValidFrontmatterField(value, type) {
    if (type === 'string') {
        return typeof value === 'string' && value.trim().length > 0;
    }
    if (type === 'string_or_date') {
        return ((typeof value === 'string' && value.trim().length > 0) ||
            (value instanceof Date && !Number.isNaN(value.getTime())));
    }
    if (type === 'array') {
        return Array.isArray(value);
    }
    return false;
}
function parseValue(rawValue, options = {}, context = {}) {
    if (rawValue === '') {
        return [];
    }
    if (rawValue === '[]') {
        return [];
    }
    if (rawValue === 'true') {
        return true;
    }
    if (rawValue === 'false') {
        return false;
    }
    if (options.strict) {
        validateFrontmatterValue(rawValue, context);
    }
    if (/^\[(.*)\]$/.test(rawValue)) {
        const inner = rawValue.slice(1, -1).trim();
        if (!inner) {
            return [];
        }
        return splitInlineArray(inner, options, context);
    }
    return stripQuotes(rawValue);
}
function validateFrontmatterValue(rawValue, context) {
    const startsArray = rawValue.startsWith('[');
    const endsArray = rawValue.endsWith(']');
    if (startsArray !== endsArray) {
        throw createFrontmatterParseError(`Unterminated inline array for ${context.key || 'field'}`, context.lineNumber);
    }
    if (!rawValue) {
        return;
    }
    const quote = rawValue[0];
    if ((quote === '"' || quote === "'") && rawValue[rawValue.length - 1] !== quote) {
        throw createFrontmatterParseError(`Unterminated quoted string for ${context.key || 'field'}`, context.lineNumber);
    }
}
function splitInlineArray(inner, options = {}, context = {}) {
    const values = [];
    let current = '';
    let activeQuote = null;
    for (let index = 0; index < inner.length; index += 1) {
        const char = inner[index];
        if (activeQuote) {
            current += char;
            if (char === activeQuote && inner[index - 1] !== '\\') {
                activeQuote = null;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            activeQuote = char;
            current += char;
            continue;
        }
        if (char === ',') {
            const parsed = parseValue(current.trim(), {}, context);
            if (parsed !== '') {
                values.push(parsed);
            }
            current = '';
            continue;
        }
        current += char;
    }
    if (activeQuote && options.strict) {
        throw createFrontmatterParseError(`Unterminated quoted string in inline array for ${context.key || 'field'}`, context.lineNumber);
    }
    const parsed = parseValue(current.trim(), {}, context);
    if (parsed !== '') {
        values.push(parsed);
    }
    return values.filter(value => value !== '');
}
function stripQuotes(value) {
    return value.replace(/^['"]|['"]$/g, '');
}
function createFrontmatterParseError(message, lineNumber) {
    const error = new Error(lineNumber ? `line ${lineNumber}: ${message}` : message);
    error.name = 'FrontmatterParseError';
    return error;
}
function extractSections(content) {
    const sections = {};
    const matches = [];
    const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        matches.push({
            level: match[1].length,
            title: match[2].trim(),
            start: match.index,
        });
    }
    for (let index = 0; index < matches.length; index += 1) {
        const current = matches[index];
        const next = matches[index + 1];
        sections[current.title] = {
            level: current.level,
            title: current.title,
            start: current.start,
            end: next ? next.start : content.length,
        };
    }
    return sections;
}
function ensureArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }
    return [];
}
function isSameIndex(left, right) {
    return JSON.stringify(stripVolatileFields(left)) === JSON.stringify(stripVolatileFields(right));
}
function stripVolatileFields(index) {
    const clone = JSON.parse(JSON.stringify(index));
    delete clone.generated;
    return clone;
}
function printIndexStats(index) {
    console.log(`[ospec] files ${index.stats.totalFiles}, modules ${index.stats.totalModules}, sections ${index.stats.totalSections}`);
    console.log(`[ospec] active changes: ${index.active_changes.join(', ') || 'none'}`);
}
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}
async function exists(targetPath) {
    try {
        await fsp.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function readJsonIfExists(targetPath) {
    if (!(await exists(targetPath))) {
        return null;
    }
    return JSON.parse(await fsp.readFile(targetPath, 'utf8'));
}
main();