#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'changes']);
const KNOWLEDGE_ROOTS = ['for-ai/', 'docs/project/'];
const INDEX_FILE = 'SKILL.index.json';
const SKILL_FILE = 'SKILL.md';
// A managed file is indexed when it is a SKILL.md module or a Markdown knowledge
// document under a knowledge root. Keep this predicate identical in IndexBuilder.ts.
function isIndexableManagedFile(managedRelativePath, fileName) {
    if (fileName === SKILL_FILE) {
        return true;
    }
    if (!fileName.toLowerCase().endsWith('.md')) {
        return false;
    }
    return KNOWLEDGE_ROOTS.some(root => managedRelativePath.startsWith(root));
}
// Best-effort HEAD commit the index reflects. Null outside a git work tree. Treated
// as a volatile field in comparisons so a new commit never makes the index "stale".
function resolveGitCommit(rootDir) {
    try {
        const result = spawnSync('git', ['rev-parse', 'HEAD'], {
            cwd: rootDir,
            encoding: 'utf8',
        });
        if (result.status !== 0) {
            return null;
        }
        const commit = String(result.stdout || '').trim();
        return commit.length > 0 ? commit : null;
    }
    catch {
        return null;
    }
}
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
    const layout = await getProjectLayout(rootDir);
    const indexPath = resolveManagedPath(rootDir, INDEX_FILE, layout);
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
    const layout = await getProjectLayout(rootDir);
    const currentIndex = await readJsonIfExists(resolveManagedPath(rootDir, INDEX_FILE, layout));
    const nextIndex = await buildIndex(rootDir);
    return {
        stale: !currentIndex || !isSameIndex(currentIndex, nextIndex),
        currentIndex,
        nextIndex,
    };
}
async function buildIndex(rootDir) {
    const layout = await getProjectLayout(rootDir);
    const managedRoot = getManagedRoot(rootDir, layout);
    const modules = {};
    const tagIndex = {};
    let totalFiles = 0;
    let totalSections = 0;
    await walk(managedRoot, async fullPath => {
        const relativePath = normalizeManagedRelativePath(rootDir, fullPath, layout);
        if (!isIndexableManagedFile(relativePath, path.basename(fullPath))) {
            return;
        }
        totalFiles += 1;
        const content = await fsp.readFile(fullPath, 'utf8');
        const parsed = parseSkillFile(content);
        const preferredName = parsed.frontmatter.name || relativePath;
        // Disambiguate a name collision (e.g. two frontmatter-less docs sharing an H1) by the
        // unique managed-relative path so neither module is silently overwritten/lost.
        const moduleName = modules[preferredName] ? relativePath : preferredName;
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
            if (!tagIndex[tag].includes(moduleName)) {
                tagIndex[tag].push(moduleName);
            }
        }
    });
    for (const tag of Object.keys(tagIndex).sort((left, right) => left.localeCompare(right))) {
        tagIndex[tag] = tagIndex[tag].sort((left, right) => left.localeCompare(right));
    }
    const activeChanges = await listActiveChanges(rootDir, layout);
    return {
        version: '1.0',
        generated: new Date().toISOString(),
        git_commit: resolveGitCommit(rootDir),
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
        await onSkillFile(fullPath);
    }
}
async function buildChangeSummary(rootDir, changeName, config) {
    const layout = await getProjectLayout(rootDir);
    const featureDir = resolveManagedPath(rootDir, `changes/active/${changeName}`, layout);
    const state = await readJsonIfExists(path.join(featureDir, 'state.json'));
    if (!state) {
        return null;
    }
    const proposalPath = path.join(featureDir, 'proposal.md');
    const designPath = path.join(featureDir, 'design.md');
    const implementationPlanPath = path.join(featureDir, 'implementation-plan.md');
    const taskGraphPath = path.join(featureDir, 'artifacts', 'agents', 'task-graph.json');
    const specComplianceReviewPath = path.join(featureDir, 'artifacts', 'reviews', 'spec-compliance.md');
    const codeQualityReviewPath = path.join(featureDir, 'artifacts', 'reviews', 'code-quality.md');
    const agentWorkerStatusPath = path.join(featureDir, 'artifacts', 'agents', 'worker-status.md');
    const tasksPath = path.join(featureDir, 'tasks.md');
    const verificationPath = path.join(featureDir, 'verification.md');
    const proposalExists = await exists(proposalPath);
    const designExists = await exists(designPath);
    const implementationPlanExists = await exists(implementationPlanPath);
    const taskGraphExists = await exists(taskGraphPath);
    const specComplianceReviewExists = await exists(specComplianceReviewPath);
    const codeQualityReviewExists = await exists(codeQualityReviewPath);
    const agentWorkerStatusExists = await exists(agentWorkerStatusPath);
    const tasksExists = await exists(tasksPath);
    const verificationExists = await exists(verificationPath);
    const checks = [
        {
            name: 'proposal.md',
            status: proposalExists ? 'pass' : 'fail',
            message: proposalExists ? 'Proposal file exists' : 'proposal.md is missing',
        },
        {
            name: 'design.md',
            status: designExists ? 'pass' : 'fail',
            message: designExists ? 'Design file exists' : 'design.md is missing',
        },
        {
            name: 'implementation-plan.md',
            status: implementationPlanExists ? 'pass' : 'fail',
            message: implementationPlanExists ? 'Implementation plan file exists' : 'implementation-plan.md is missing',
        },
        {
            name: 'artifacts/agents/task-graph.json',
            status: taskGraphExists ? 'pass' : 'fail',
            message: taskGraphExists ? 'Task graph artifact exists' : 'artifacts/agents/task-graph.json is missing',
        },
        {
            name: 'artifacts/reviews/spec-compliance.md',
            status: specComplianceReviewExists ? 'pass' : 'fail',
            message: specComplianceReviewExists
                ? 'Spec compliance review artifact exists'
                : 'artifacts/reviews/spec-compliance.md is missing',
        },
        {
            name: 'artifacts/reviews/code-quality.md',
            status: codeQualityReviewExists ? 'pass' : 'fail',
            message: codeQualityReviewExists
                ? 'Code quality review artifact exists'
                : 'artifacts/reviews/code-quality.md is missing',
        },
        {
            name: 'artifacts/agents/worker-status.md',
            status: agentWorkerStatusExists ? 'pass' : 'fail',
            message: agentWorkerStatusExists ? 'Agent worker status file exists' : 'artifacts/agents/worker-status.md is missing',
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
    if (designExists) {
        const design = analyzeWorkflowChecklistDocument(await fsp.readFile(designPath, 'utf8'), {
            name: 'design.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...design.checks);
    }
    if (implementationPlanExists) {
        const implementationPlan = analyzeWorkflowChecklistDocument(await fsp.readFile(implementationPlanPath, 'utf8'), {
            name: 'implementation-plan.md',
            activatedSteps,
            requiredFields: [
                ['feature', 'string'],
                ['created', 'string_or_date'],
                ['optional_steps', 'array'],
            ],
        });
        checks.push(...implementationPlan.checks);
    }
    if (taskGraphExists) {
        const taskGraph = analyzeTaskGraphDocument(await fsp.readFile(taskGraphPath, 'utf8'), {
            activatedSteps,
        });
        checks.push(...taskGraph.checks);
    }
    if (specComplianceReviewExists) {
        const specComplianceReview = analyzeReviewArtifactDocument(await fsp.readFile(specComplianceReviewPath, 'utf8'), {
            name: 'artifacts/reviews/spec-compliance.md',
            expectedReviewerRole: 'spec_compliance_reviewer',
            activatedSteps,
        });
        checks.push(...specComplianceReview.checks);
    }
    if (codeQualityReviewExists) {
        const codeQualityReview = analyzeReviewArtifactDocument(await fsp.readFile(codeQualityReviewPath, 'utf8'), {
            name: 'artifacts/reviews/code-quality.md',
            expectedReviewerRole: 'code_quality_reviewer',
            activatedSteps,
        });
        checks.push(...codeQualityReview.checks);
    }
    if (agentWorkerStatusExists) {
        const agentWorkerStatus = analyzeAgentWorkerStatusDocument(await fsp.readFile(agentWorkerStatusPath, 'utf8'));
        checks.push(...agentWorkerStatus.checks);
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
        const match = filePath.match(/^(?:\.ospec\/)?changes\/active\/([^/]+)\//);
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
    return (filePath === SKILL_FILE ||
        /(^|\/)SKILL\.md$/.test(filePath) ||
        filePath.startsWith('changes/active/') ||
        filePath.startsWith('.ospec/changes/active/') ||
        isKnowledgeDocPath(filePath));
}
function isKnowledgeDocPath(filePath) {
    if (!filePath.toLowerCase().endsWith('.md')) {
        return false;
    }
    const managedRelativePath = filePath.startsWith('.ospec/') ? filePath.slice('.ospec/'.length) : filePath;
    return KNOWLEDGE_ROOTS.some(root => managedRelativePath.startsWith(root));
}
async function listActiveChanges(rootDir, layout) {
    const resolvedLayout = layout || (await getProjectLayout(rootDir));
    const activeDir = resolveManagedPath(rootDir, 'changes/active', resolvedLayout);
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
// Frontmatter name/title derivation MUST match SkillParser (used by IndexBuilder):
// fall back to the document H1 so both builders key modules and titles identically.
function extractDocumentTitle(body) {
    const match = body.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() || null;
}
function parseSkillFile(content) {
    const normalizedContent = normalizeLineEndings(content);
    const parsed = parseFrontmatter(normalizedContent);
    const title = typeof parsed.data.title === 'string' && parsed.data.title.trim().length > 0
        ? parsed.data.title.trim()
        : extractDocumentTitle(parsed.body);
    const name = typeof parsed.data.name === 'string' && parsed.data.name.trim().length > 0
        ? parsed.data.name.trim()
        : title || 'Unknown';
    return {
        frontmatter: {
            name,
            title: title || undefined,
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
const TASK_GRAPH_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'IN_PROGRESS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const TASK_GRAPH_TERMINAL_STATUSES = ['DONE', 'DONE_WITH_CONCERNS'];
function analyzeTaskGraphDocument(content, options) {
    const name = 'artifacts/agents/task-graph.json';
    let data = {};
    let parseError = null;
    try {
        const parsed = JSON.parse(content);
        data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
    catch (error) {
        parseError = error;
    }
    const optionalStepsFieldValid = Array.isArray(data.optional_steps);
    const optionalSteps = optionalStepsFieldValid ? ensureArray(data.optional_steps) : [];
    const tasksFieldValid = Array.isArray(data.tasks);
    const tasks = tasksFieldValid ? data.tasks : [];
    const invalidRequiredFields = [
        ['version', 'string'],
        ['feature', 'string'],
        ['status', 'string'],
        ['optional_steps', 'array'],
        ['tasks', 'array'],
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const taskSchemaIssues = [];
    const dependencyIssues = [];
    const invalidStatuses = [];
    const unresolvedStatuses = [];
    const concernStatuses = [];
    const executionDetailIssues = [];
    const taskIds = new Set();
    const duplicateTaskIds = new Set();
    if (tasksFieldValid && tasks.length === 0) {
        taskSchemaIssues.push('tasks must contain at least one task');
    }
    for (const [index, task] of tasks.entries()) {
        const taskLabel = `tasks[${index}]`;
        if (!task || typeof task !== 'object' || Array.isArray(task)) {
            taskSchemaIssues.push(`${taskLabel} must be an object`);
            continue;
        }
        const taskId = typeof task.id === 'string' ? task.id.trim() : '';
        if (!taskId) {
            taskSchemaIssues.push(`${taskLabel}.id must be a non-empty string`);
        }
        else if (taskIds.has(taskId)) {
            duplicateTaskIds.add(taskId);
        }
        else {
            taskIds.add(taskId);
        }
        if (typeof task.title !== 'string' || task.title.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.title must be a non-empty string`);
        }
        if (typeof task.status !== 'string' || task.status.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.status must be a non-empty string`);
        }
        if (!Array.isArray(task.depends_on)) {
            taskSchemaIssues.push(`${taskLabel}.depends_on must be an array`);
        }
        if (typeof task.parallelizable !== 'boolean') {
            taskSchemaIssues.push(`${taskLabel}.parallelizable must be a boolean`);
        }
        if (!Array.isArray(task.conflicts_with)) {
            taskSchemaIssues.push(`${taskLabel}.conflicts_with must be an array`);
        }
        if (!Array.isArray(task.target_files)) {
            taskSchemaIssues.push(`${taskLabel}.target_files must be an array`);
        }
        if (!Array.isArray(task.verification_commands)) {
            taskSchemaIssues.push(`${taskLabel}.verification_commands must be an array`);
        }
        if (typeof task.expected_result !== 'string' || task.expected_result.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.expected_result must be a non-empty string`);
        }
        if (typeof task.worker_role !== 'string' || task.worker_role.trim().length === 0) {
            taskSchemaIssues.push(`${taskLabel}.worker_role must be a non-empty string`);
        }
        if (taskId) {
            const status = typeof task.status === 'string' ? task.status.trim().toUpperCase() : '';
            if (!TASK_GRAPH_ALLOWED_STATUSES.includes(status)) {
                invalidStatuses.push(`${taskId}=${status || '(missing)'}`);
            }
            else if (!TASK_GRAPH_TERMINAL_STATUSES.includes(status)) {
                unresolvedStatuses.push(`${taskId}=${status}`);
            }
            else if (status === 'DONE_WITH_CONCERNS') {
                concernStatuses.push(taskId);
            }
            if (!Array.isArray(task.target_files) || task.target_files.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                executionDetailIssues.push(`${taskId}.target_files`);
            }
            if (!Array.isArray(task.verification_commands) || task.verification_commands.filter((value) => typeof value === 'string' && value.trim().length > 0).length === 0) {
                executionDetailIssues.push(`${taskId}.verification_commands`);
            }
            const expectedResult = typeof task.expected_result === 'string' ? task.expected_result.trim() : '';
            if (!expectedResult || expectedResult.toUpperCase() === 'TBD') {
                executionDetailIssues.push(`${taskId}.expected_result`);
            }
        }
    }
    for (const duplicateId of duplicateTaskIds) {
        taskSchemaIssues.push(`duplicate task id: ${duplicateId}`);
    }
    if (tasksFieldValid && taskSchemaIssues.length === 0) {
        const dependenciesByTask = new Map();
        for (const task of tasks) {
            const taskId = task.id.trim();
            const dependencies = task.depends_on.filter((value) => typeof value === 'string' && value.trim().length > 0);
            dependenciesByTask.set(taskId, dependencies);
            for (const dependency of dependencies) {
                if (dependency === taskId) {
                    dependencyIssues.push(`${taskId} cannot depend on itself`);
                }
                else if (!taskIds.has(dependency)) {
                    dependencyIssues.push(`${taskId} depends on unknown task ${dependency}`);
                }
            }
        }
        const visiting = new Set();
        const visited = new Set();
        const visit = (taskId, chain) => {
            if (visited.has(taskId)) {
                return;
            }
            if (visiting.has(taskId)) {
                dependencyIssues.push(`dependency cycle detected: ${[...chain, taskId].join(' -> ')}`);
                return;
            }
            visiting.add(taskId);
            for (const dependency of dependenciesByTask.get(taskId) ?? []) {
                if (taskIds.has(dependency)) {
                    visit(dependency, [...chain, taskId]);
                }
            }
            visiting.delete(taskId);
            visited.add(taskId);
        };
        for (const taskId of taskIds) {
            visit(taskId, []);
        }
    }
    const graphCompleted = data.status === 'completed';
    let statusMessage = `${name} task statuses are archive-ready`;
    let statusCheckStatus = 'pass';
    if (invalidStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Invalid task statuses in ${name}: ${invalidStatuses.join(', ')}`;
    }
    else if (unresolvedStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Unresolved task statuses in ${name}: ${unresolvedStatuses.join(', ')}`;
    }
    else if (!graphCompleted) {
        statusCheckStatus = 'fail';
        statusMessage = `${name} status must be completed before archiving`;
    }
    else if (concernStatuses.length > 0) {
        statusCheckStatus = 'warn';
        statusMessage = `${name} tasks completed with concerns: ${concernStatuses.join(', ')}`;
    }
    return {
        checks: [
            {
                name: `${name}.json`,
                status: parseError === null ? 'pass' : 'fail',
                message: parseError ? `${name} JSON cannot be parsed: ${parseError.message}` : `${name} JSON parsed successfully`,
            },
            {
                name: `${name}.required_fields`,
                status: parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: parseError
                    ? `Cannot validate required fields in ${name} because JSON is invalid`
                    : invalidRequiredFields.length > 0
                        ? `Missing or invalid required fields in ${name}: ${invalidRequiredFields.join(', ')}`
                        : `${name} has all required fields`,
            },
            {
                name: `${name}.optional_steps`,
                status: optionalStepsFieldValid && missingActivatedSteps.length === 0 ? 'pass' : 'fail',
                message: !optionalStepsFieldValid
                    ? `${name} field optional_steps must be an array`
                    : missingActivatedSteps.length > 0
                        ? `Missing optional steps in ${name}: ${missingActivatedSteps.join(', ')}`
                        : `All activated optional steps are present in ${name}`,
            },
            {
                name: `${name}.task_schema`,
                status: taskSchemaIssues.length === 0 ? 'pass' : 'fail',
                message: taskSchemaIssues.length > 0
                    ? `Invalid task graph schema in ${name}: ${taskSchemaIssues.join(', ')}`
                    : `${name} task schema is valid`,
            },
            {
                name: `${name}.dependencies`,
                status: dependencyIssues.length === 0 ? 'pass' : 'fail',
                message: dependencyIssues.length > 0
                    ? `Invalid task dependencies in ${name}: ${dependencyIssues.join(', ')}`
                    : `${name} dependencies are valid`,
            },
            {
                name: `${name}.task_statuses`,
                status: statusCheckStatus,
                message: statusMessage,
            },
            {
                name: `${name}.execution_details`,
                status: executionDetailIssues.length === 0 ? 'pass' : 'fail',
                message: executionDetailIssues.length > 0
                    ? `Incomplete task execution details in ${name}: ${executionDetailIssues.join(', ')}`
                    : `${name} task execution details are complete`,
            },
        ],
    };
}
const REVIEW_ARTIFACT_ALLOWED_DECISIONS = [
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
    'NEEDS_CHANGES',
    'BLOCKED',
    'PENDING',
];
const REVIEW_ARTIFACT_TERMINAL_DECISIONS = ['APPROVED', 'APPROVED_WITH_CONCERNS'];
function analyzeReviewArtifactDocument(content, options) {
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
    const invalidRequiredFields = [
        ['feature', 'string'],
        ['created', 'string_or_date'],
        ['status', 'string'],
        ['reviewer_role', 'string'],
        ['decision', 'string'],
        ['optional_steps', 'array'],
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    if (data.reviewer_role !== options.expectedReviewerRole && !invalidRequiredFields.includes('reviewer_role')) {
        invalidRequiredFields.push('reviewer_role');
    }
    const missingActivatedSteps = optionalStepsFieldValid
        ? options.activatedSteps.filter(step => !optionalSteps.includes(step))
        : [...options.activatedSteps];
    const decision = typeof data.decision === 'string' ? data.decision.trim().toUpperCase() : '';
    const invalidDecision = decision.length > 0 && !REVIEW_ARTIFACT_ALLOWED_DECISIONS.includes(decision);
    const unresolvedDecision = !REVIEW_ARTIFACT_TERMINAL_DECISIONS.includes(decision);
    const concernDecision = decision === 'APPROVED_WITH_CONCERNS';
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
    let decisionMessage = `${options.name} decision is archive-ready`;
    let decisionStatus = 'pass';
    if (!hasFrontmatter || parseError) {
        decisionStatus = 'fail';
        decisionMessage = `Cannot validate decision in ${options.name} because frontmatter is invalid`;
    }
    else if (invalidDecision) {
        decisionStatus = 'fail';
        decisionMessage = `Invalid review decision in ${options.name}: ${decision}`;
    }
    else if (unresolvedDecision) {
        decisionStatus = 'fail';
        decisionMessage = `Unresolved review decision in ${options.name}: ${decision || '(missing)'}`;
    }
    else if (concernDecision) {
        decisionStatus = 'warn';
        decisionMessage = `${options.name} approved with concerns`;
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
                name: `${options.name}.decision`,
                status: decisionStatus,
                message: decisionMessage,
            },
            {
                name: `${options.name}.checklist`,
                status: checklistStatus,
                message: checklistMessage,
            },
        ],
    };
}
const AGENT_WORKER_ALLOWED_STATUSES = [
    'DONE',
    'DONE_WITH_CONCERNS',
    'NEEDS_CONTEXT',
    'BLOCKED',
    'PENDING',
];
const AGENT_WORKER_TERMINAL_STATUSES = ['DONE', 'DONE_WITH_CONCERNS'];
function analyzeAgentWorkerStatusDocument(content) {
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
    const statusFields = [
        'implementer_status',
        'spec_reviewer_status',
        'quality_reviewer_status',
        'controller_status',
    ];
    const invalidRequiredFields = [
        ['feature', 'string'],
        ['created', 'string_or_date'],
        ['status', 'string'],
        ...statusFields.map(field => [field, 'string']),
    ]
        .filter(([fieldName, fieldType]) => !isValidFrontmatterField(data[fieldName], fieldType))
        .map(([fieldName]) => fieldName);
    const statuses = Object.fromEntries(statusFields.map(field => [field, typeof data[field] === 'string' ? data[field].trim().toUpperCase() : '']));
    const invalidStatuses = Object.entries(statuses)
        .filter(([, status]) => !AGENT_WORKER_ALLOWED_STATUSES.includes(status))
        .map(([field, status]) => `${field}=${status || '(missing)'}`);
    const unresolvedStatuses = [
        ...['implementer_status', 'spec_reviewer_status', 'quality_reviewer_status']
            .filter(field => !AGENT_WORKER_TERMINAL_STATUSES.includes(statuses[field]))
            .map(field => `${field}=${statuses[field] || '(missing)'}`),
        ...(statuses.controller_status === 'DONE' ? [] : [`controller_status=${statuses.controller_status || '(missing)'}`]),
    ];
    const concernStatuses = Object.entries(statuses)
        .filter(([, status]) => status === 'DONE_WITH_CONCERNS')
        .map(([field]) => field);
    const checklistItems = parsed?.body.match(/^\s*-\s+\[(?: |x|X)\]\s+.+$/gm) ?? [];
    const uncheckedItems = parsed?.body.match(/^\s*-\s+\[ \]\s+.+$/gm) ?? [];
    const checklistStructureValid = checklistItems.length > 0;
    let frontmatterMessage = 'artifacts/agents/worker-status.md frontmatter parsed successfully';
    if (!hasFrontmatter) {
        frontmatterMessage = 'artifacts/agents/worker-status.md is missing a valid frontmatter block';
    }
    else if (parseError) {
        frontmatterMessage = `artifacts/agents/worker-status.md frontmatter cannot be parsed: ${parseError.message}`;
    }
    let requiredFieldsMessage = 'artifacts/agents/worker-status.md has all required frontmatter fields';
    if (!hasFrontmatter || parseError) {
        requiredFieldsMessage = 'Cannot validate required fields in artifacts/agents/worker-status.md because frontmatter is invalid';
    }
    else if (invalidRequiredFields.length > 0) {
        requiredFieldsMessage = `Missing or invalid required fields in artifacts/agents/worker-status.md: ${invalidRequiredFields.join(', ')}`;
    }
    let statusMessage = 'Agent worker statuses are archive-ready';
    let statusCheckStatus = 'pass';
    if (!hasFrontmatter || parseError) {
        statusCheckStatus = 'fail';
        statusMessage = 'Cannot validate agent worker statuses because frontmatter is invalid';
    }
    else if (invalidStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Invalid agent worker statuses: ${invalidStatuses.join(', ')}`;
    }
    else if (unresolvedStatuses.length > 0) {
        statusCheckStatus = 'fail';
        statusMessage = `Unresolved agent worker statuses: ${unresolvedStatuses.join(', ')}`;
    }
    else if (concernStatuses.length > 0) {
        statusCheckStatus = 'warn';
        statusMessage = `Agent workers completed with concerns: ${concernStatuses.join(', ')}`;
    }
    let checklistStatus = 'pass';
    let checklistMessage = 'artifacts/agents/worker-status.md checklist is complete';
    if (!hasFrontmatter || parseError) {
        checklistStatus = 'fail';
        checklistMessage = 'artifacts/agents/worker-status.md checklist cannot be validated because frontmatter is invalid';
    }
    else if (!checklistStructureValid) {
        checklistStatus = 'fail';
        checklistMessage = 'artifacts/agents/worker-status.md must contain at least one Markdown checklist item';
    }
    else if (uncheckedItems.length > 0) {
        checklistStatus = 'warn';
        checklistMessage = 'artifacts/agents/worker-status.md still has unchecked items';
    }
    return {
        checks: [
            {
                name: 'artifacts/agents/worker-status.md.frontmatter',
                status: hasFrontmatter && parseError === null ? 'pass' : 'fail',
                message: frontmatterMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.required_fields',
                status: hasFrontmatter && parseError === null && invalidRequiredFields.length === 0 ? 'pass' : 'fail',
                message: requiredFieldsMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.worker_statuses',
                status: statusCheckStatus,
                message: statusMessage,
            },
            {
                name: 'artifacts/agents/worker-status.md.checklist',
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
// Index sections record only heading level + title. Byte offsets were dropped in 1.6.0:
// nothing slices content by them and they were the largest token cost in the index.
function extractSections(content) {
    const sections = {};
    const headingRegex = /^(#{1,6})\s+(.+?)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        const title = match[2].trim();
        sections[title] = {
            level: match[1].length,
            title,
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
    delete clone.git_commit;
    return clone;
}
function printIndexStats(index) {
    console.log(`[ospec] files ${index.stats.totalFiles}, modules ${index.stats.totalModules}, sections ${index.stats.totalSections}`);
    console.log(`[ospec] active changes: ${index.active_changes.join(', ') || 'none'}`);
}
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}
function getManagedRoot(rootDir, layout) {
    return layout === 'nested' ? path.join(rootDir, '.ospec') : rootDir;
}
function resolveManagedPath(rootDir, relativePath, layout) {
    const normalizedRelativePath = normalizePath(relativePath).replace(/^\.\/+/, '');
    if (layout !== 'nested' || normalizedRelativePath === '.skillrc' || normalizedRelativePath === 'README.md' || normalizedRelativePath === '.ospec' || normalizedRelativePath.startsWith('.ospec/')) {
        return path.join(rootDir, ...normalizedRelativePath.split('/'));
    }
    return path.join(rootDir, '.ospec', ...normalizedRelativePath.split('/'));
}
function hasClassicManagedMarkers(rootDir) {
    return [
        'changes',
        'for-ai',
        'docs/project',
        SKILL_FILE,
        INDEX_FILE,
    ].some(relativePath => fs.existsSync(path.join(rootDir, ...relativePath.split('/'))));
}
function normalizeManagedRelativePath(rootDir, fullPath, layout) {
    const relativePath = normalizePath(path.relative(rootDir, fullPath));
    if (layout !== 'nested') {
        return relativePath;
    }
    return relativePath.startsWith('.ospec/')
        ? relativePath.slice('.ospec/'.length)
        : relativePath;
}
async function getProjectLayout(rootDir) {
    const config = (await readJsonIfExists(path.join(rootDir, '.skillrc'))) || {};
    if (config?.projectLayout !== 'nested') {
        return 'classic';
    }
    if (fs.existsSync(path.join(rootDir, '.ospec'))) {
        return 'nested';
    }
    return hasClassicManagedMarkers(rootDir) ? 'classic' : 'nested';
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
// Run as a standalone script (the deployed .ospec/tools/build-index-auto.cjs) only when
// invoked directly. When required by the package (e.g. IndexBuilder), expose the canonical
// index algorithm so the writer and the hook share one implementation.
if (require.main === module) {
    main();
}
module.exports = {
    buildIndex,
    writeIndex,
    computeIndexStatus,
    resolveGitCommit,
    getProjectLayout,
    resolveManagedPath,
};
