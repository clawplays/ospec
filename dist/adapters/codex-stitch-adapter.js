#!/usr/bin/env node
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
function fail(message, details, code = 'generic') {
    const suffix = details ? ` ${details}` : '';
    process.stderr.write(`Codex Stitch adapter failed [${code}]: ${message}${suffix}\n`);
    process.exit(1);
}
function parseArgs(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        if (!current.startsWith('--')) {
            continue;
        }
        const next = argv[index + 1];
        if (!next || next.startsWith('--')) {
            result[current.slice(2)] = 'true';
            continue;
        }
        result[current.slice(2)] = next;
        index += 1;
    }
    return result;
}
function readFileIfExists(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return '';
    }
    return fs.readFileSync(filePath, 'utf8');
}
function readJsonIfExists(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function truncate(text, maxLength) {
    const normalized = String(text || '').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength)}\n...[truncated]`;
}
function parseBooleanFlag(value, defaultValue = false) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }
    return defaultValue;
}
function inspectCodexStitchConfig(settingsText) {
    const normalized = String(settingsText || '');
    const stitchMatch = normalized.match(/\[mcp_servers\.stitch\]([\s\S]*?)(?=\r?\n\[|$)/i);
    const stitchBlock = stitchMatch ? stitchMatch[1] : '';
    const httpHeadersMatch = normalized.match(/\[mcp_servers\.stitch\.http_headers\]([\s\S]*?)(?=\r?\n\[|$)/i);
    const httpHeadersBlock = httpHeadersMatch ? httpHeadersMatch[1] : '';
    return {
        stitchConfigured: Boolean(stitchMatch),
        stitchTransportHttp: /(^|\r?\n)\s*type\s*=\s*["']http["']/i.test(stitchBlock),
        stitchUrlConfigured: /(^|\r?\n)\s*url\s*=\s*["']https:\/\/stitch\.googleapis\.com\/mcp["']/i.test(stitchBlock),
        stitchAuthConfigured: /(^|\r?\n)\s*headers\s*=\s*\{[\s\S]*?\bX-Goog-Api-Key\b\s*=\s*["'][^"']+["'][\s\S]*?\}/i.test(stitchBlock)
            || /\bX-Goog-Api-Key\b\s*=\s*["'][^"']+["']/i.test(httpHeadersBlock),
    };
}
function inspectCodexSettings() {
    const settingsPath = path.join(os.homedir(), '.codex', 'config.toml');
    if (!fs.existsSync(settingsPath)) {
        return {
            settingsPath,
            exists: false,
            stitchConfigured: false,
            stitchTransportHttp: false,
            stitchUrlConfigured: false,
            stitchAuthConfigured: false,
        };
    }
    try {
        const settings = fs.readFileSync(settingsPath, 'utf8');
        const stitchConfig = inspectCodexStitchConfig(settings);
        return {
            settingsPath,
            exists: true,
            stitchConfigured: stitchConfig.stitchConfigured,
            stitchTransportHttp: stitchConfig.stitchTransportHttp,
            stitchUrlConfigured: stitchConfig.stitchUrlConfigured,
            stitchAuthConfigured: stitchConfig.stitchAuthConfigured,
        };
    }
    catch {
        return {
            settingsPath,
            exists: true,
            stitchConfigured: false,
            stitchTransportHttp: false,
            stitchUrlConfigured: false,
            stitchAuthConfigured: false,
        };
    }
}
function resolveCodexCommand(projectPath) {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    const lookup = spawnSync(locator, ['codex'], {
        cwd: projectPath,
        encoding: 'utf8',
        shell: false,
    });
    if (lookup.error || lookup.status !== 0) {
        return '';
    }
    const lines = String(lookup.stdout || '').trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (process.platform === 'win32') {
        return lines.find(line => /\.(cmd|exe|bat)$/i.test(line)) || lines[0] || '';
    }
    return lines[0] || '';
}
function escapeCmdArg(value) {
    const normalized = String(value ?? '');
    if (!/[\s"]/u.test(normalized)) {
        return normalized;
    }
    return `"${normalized.replace(/"/g, '""')}"`;
}
function runCodex(codexCommand, args, options) {
    if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(codexCommand)) {
        const commandPrefix = /\s/u.test(codexCommand) ? `"${codexCommand}"` : codexCommand;
        const commandLine = `${commandPrefix}${args.length > 0 ? ` ${args.map(escapeCmdArg).join(' ')}` : ''}`;
        return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], {
            ...options,
            shell: false,
        });
    }
    return spawnSync(codexCommand, args, {
        ...options,
        shell: false,
    });
}
function classifyCodexCliFailure(details) {
    const normalized = String(details || '').trim();
    const lower = normalized.toLowerCase();
    if (/authentication|login|unauthorized|forbidden|auth/i.test(normalized)) {
        return {
            code: 'auth',
            message: 'Codex CLI authentication is not ready. Complete Codex CLI login/API configuration, then retry.',
        };
    }
    if (/enotfound|eai_again|getaddrinfo|network|timed out|timeout|socket hang up/i.test(lower)) {
        return {
            code: 'network',
            message: 'Codex CLI could not reach the upstream service. Check network/DNS access, then retry.',
        };
    }
    if (/mcp|stitch/i.test(lower) && /not found|unknown|missing|failed/i.test(lower)) {
        return {
            code: 'mcp_unavailable',
            message: 'Codex CLI could not use the stitch MCP server. Check ~/.codex/config.toml and MCP auth configuration, then retry.',
        };
    }
    return {
        code: 'generic',
        message: 'Codex CLI exited with an error.',
    };
}
function buildPrompt(changePath, projectPath, changeName, proposal, tasks, stateJson, canonicalProject) {
    const prompt = [
        'You are the OSpec built-in Stitch adapter running through Codex CLI in non-interactive mode.',
        'Use the MCP server named "stitch" to create or update a reviewable page design preview for the current change.',
        'Do not ask the user questions. Do not return prose outside the required JSON.',
        'Return only one JSON object with this exact shape:',
        '{"preview_url":"https://...","summary_markdown":"...","notes":"...","artifacts":[]}',
        'Rules:',
        '- You must use the stitch MCP path, not a fake placeholder URL.',
        '- preview_url must be a real review URL if the operation succeeds.',
        '- summary_markdown should be reviewer-facing markdown summarizing the generated page and what to check.',
        '- notes should be short and mention important assumptions or blockers.',
        '- artifacts should be an array of objects or strings if any files/screenshots/URLs were produced; otherwise [].',
        '',
        `Project path: ${projectPath}`,
        `Change path: ${changePath}`,
        `Change name: ${changeName}`,
        '',
        'Change state.json:',
        '```json',
        truncate(JSON.stringify(stateJson || {}, null, 2), 12000),
        '```',
        '',
        'proposal.md:',
        '```markdown',
        truncate(proposal, 16000),
        '```',
        '',
        'tasks.md:',
        '```markdown',
        truncate(tasks, 12000),
        '```',
    ];
    if (canonicalProject?.projectId) {
        prompt.push('', 'Canonical Stitch project requirements:', `- Reuse the existing Stitch project ID: ${canonicalProject.projectId}`);
        if (canonicalProject.projectUrl) {
            prompt.push(`- Existing canonical project URL: ${canonicalProject.projectUrl}`);
        }
        prompt.push('- Do not create a new Stitch project.');
        prompt.push('- Add or update pages/nodes inside the existing project and return a preview URL from that same project ID.');
    }
    return prompt.join('\n');
}
function extractJsonCandidate(text) {
    const normalized = String(text || '').trim();
    if (!normalized) {
        return null;
    }
    const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
        return fencedMatch[1].trim();
    }
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        return objectMatch[0].trim();
    }
    return null;
}
function normalizeStitchPreviewUrl(previewUrl) {
    const normalized = String(previewUrl || '').trim();
    if (!normalized) {
        return {
            value: '',
            original: '',
            normalized: false,
        };
    }
    try {
        const parsed = new URL(normalized);
        if (parsed.hostname === 'stitch.canvas.google.com') {
            const match = parsed.pathname.match(/^\/projects\/([^/]+)\/screens\/([^/?#]+)/i);
            if (match) {
                return {
                    value: `https://stitch.withgoogle.com/projects/${match[1]}?node-id=${match[2]}`,
                    original: normalized,
                    normalized: true,
                };
            }
        }
        if (parsed.hostname === 'stitch.withgoogle.com' || parsed.hostname === 'stitch.google.com') {
            const match = parsed.pathname.match(/^\/projects\/([^/?#]+)/i);
            if (match) {
                const canonical = new URL(`https://stitch.withgoogle.com/projects/${match[1]}`);
                const nodeId = parsed.searchParams.get('node-id') || parsed.searchParams.get('node_id') || '';
                if (nodeId) {
                    canonical.searchParams.set('node-id', nodeId);
                }
                const nextValue = canonical.toString();
                return {
                    value: nextValue,
                    original: normalized,
                    normalized: nextValue !== normalized,
                };
            }
        }
    }
    catch {
    }
    return {
        value: normalized,
        original: normalized,
        normalized: false,
    };
}
function normalizeResult(parsed, fallbackResponse, requestedModel) {
    const result = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    const rawPreviewUrl = typeof result.preview_url === 'string'
        ? result.preview_url.trim()
        : typeof result.previewUrl === 'string'
            ? result.previewUrl.trim()
            : '';
    const summaryMarkdown = typeof result.summary_markdown === 'string'
        ? result.summary_markdown.trim()
        : typeof result.summaryMarkdown === 'string'
            ? result.summaryMarkdown.trim()
            : '';
    const notes = typeof result.notes === 'string'
        ? result.notes.trim()
        : typeof result.message === 'string'
            ? result.message.trim()
            : '';
    const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    if (!rawPreviewUrl) {
        const urlMatch = String(fallbackResponse || '').match(/https?:\/\/\S+/i);
        if (urlMatch) {
            const normalizedPreviewUrl = normalizeStitchPreviewUrl(urlMatch[0]);
            return {
                preview_url: normalizedPreviewUrl.value,
                summary_markdown: summaryMarkdown,
                notes,
                artifacts,
                metadata: {
                    adapter: 'codex-cli-stitch',
                    fallback_url_extracted: true,
                    ...(requestedModel ? { codex_model: requestedModel } : {}),
                    ...(normalizedPreviewUrl.normalized
                        ? { original_preview_url: normalizedPreviewUrl.original }
                        : {}),
                },
            };
        }
        fail('Codex response did not include preview_url.', truncate(String(fallbackResponse || ''), 1000));
    }
    const normalizedPreviewUrl = normalizeStitchPreviewUrl(rawPreviewUrl);
    return {
        preview_url: normalizedPreviewUrl.value,
        summary_markdown: summaryMarkdown,
        notes,
        artifacts,
        metadata: {
            adapter: 'codex-cli-stitch',
            ...(requestedModel ? { codex_model: requestedModel } : {}),
            ...(normalizedPreviewUrl.normalized
                ? { original_preview_url: normalizedPreviewUrl.original }
                : {}),
        },
    };
}
const args = parseArgs(process.argv.slice(2));
const changePath = path.resolve(args.change || process.env.OSPEC_STITCH_CHANGE_PATH || process.cwd());
const projectPath = path.resolve(args.project || process.env.OSPEC_STITCH_PROJECT_PATH || process.cwd());
const requestedModel = String(args.model || process.env.OSPEC_STITCH_CODEX_MODEL || '').trim();
const bypassApprovals = parseBooleanFlag(args['dangerously-bypass-approvals-and-sandbox']
    || process.env.OSPEC_STITCH_CODEX_BYPASS_APPROVALS_AND_SANDBOX, true);
const codexCommand = resolveCodexCommand(projectPath);
if (!codexCommand) {
    fail('Codex CLI is not available. Install it first.', '', 'missing_cli');
}
const codexCheck = runCodex(codexCommand, ['--version'], {
    cwd: projectPath,
    encoding: 'utf8',
});
if (codexCheck.error || codexCheck.status !== 0) {
    fail('Codex CLI is not available. Install it first.', '', 'missing_cli');
}
const codexSettings = inspectCodexSettings();
if (!codexSettings.exists) {
    fail(`Codex config not found at ${codexSettings.settingsPath}. Configure Codex CLI and the stitch MCP server first.`, '', 'missing_config');
}
if (!codexSettings.stitchConfigured) {
    fail(`Codex stitch MCP is not configured in ${codexSettings.settingsPath}. Add [mcp_servers.stitch] before using the built-in adapter.`, '', 'missing_mcp');
}
if (!codexSettings.stitchTransportHttp) {
    fail(`Codex stitch MCP in ${codexSettings.settingsPath} must set type = "http". Follow the Codex snippet from the repo-local localized Stitch plugin spec.`, '', 'missing_transport');
}
if (!codexSettings.stitchUrlConfigured) {
    fail(`Codex stitch MCP in ${codexSettings.settingsPath} must set url = "https://stitch.googleapis.com/mcp". Follow the Codex snippet from the repo-local localized Stitch plugin spec.`, '', 'missing_url');
}
if (!codexSettings.stitchAuthConfigured) {
    fail(`Codex stitch MCP in ${codexSettings.settingsPath} must set X-Goog-Api-Key in headers or [mcp_servers.stitch.http_headers]. Follow the Codex snippet from the repo-local localized Stitch plugin spec.`, '', 'missing_auth');
}
const statePath = path.join(changePath, 'state.json');
const proposalPath = path.join(changePath, 'proposal.md');
const tasksPath = path.join(changePath, 'tasks.md');
const stateJson = readJsonIfExists(statePath);
const changeName = stateJson?.feature || path.basename(changePath);
const canonicalProject = {
    projectId: String(process.env.OSPEC_STITCH_CANONICAL_PROJECT_ID || '').trim(),
    projectUrl: String(process.env.OSPEC_STITCH_CANONICAL_PROJECT_URL || '').trim(),
};
const prompt = buildPrompt(changePath, projectPath, changeName, readFileIfExists(proposalPath), readFileIfExists(tasksPath), stateJson, canonicalProject);
const outputPath = path.join(os.tmpdir(), `ospec-codex-stitch-${process.pid}-${Date.now()}.txt`);
const codexArgs = ['exec', '--skip-git-repo-check', '-C', projectPath];
if (bypassApprovals) {
    codexArgs.push('--dangerously-bypass-approvals-and-sandbox');
}
if (requestedModel) {
    codexArgs.push('-m', requestedModel);
}
codexArgs.push('-o', outputPath, '-');
const runResult = runCodex(codexCommand, codexArgs, {
    cwd: projectPath,
    encoding: 'utf8',
    input: prompt,
    maxBuffer: 10 * 1024 * 1024,
    env: {
        ...process.env,
        OSPEC_STITCH_CHANGE_PATH: changePath,
        OSPEC_STITCH_PROJECT_PATH: projectPath,
    },
});
if (runResult.error) {
    fail('Failed to execute Codex CLI.', runResult.error.message, 'generic');
}
if (runResult.status !== 0) {
    const details = String(runResult.stderr || runResult.stdout || '').trim();
    const failure = classifyCodexCliFailure(details);
    fail(failure.message, truncate(details, 1200), failure.code);
}
const rawResponse = readFileIfExists(outputPath) || String(runResult.stdout || '').trim();
try {
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
}
catch {
}
const responseJsonBlock = extractJsonCandidate(rawResponse);
let parsedResponse = null;
if (responseJsonBlock) {
    try {
        parsedResponse = JSON.parse(responseJsonBlock);
    }
    catch {
        parsedResponse = null;
    }
}
process.stdout.write(`${JSON.stringify(normalizeResult(parsedResponse, rawResponse, requestedModel))}\n`);