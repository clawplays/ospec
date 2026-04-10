#!/usr/bin/env node
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
function fail(message, details, code = 'generic') {
    const suffix = details ? ` ${details}` : '';
    process.stderr.write(`Gemini Stitch adapter failed [${code}]: ${message}${suffix}\n`);
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
function inspectGeminiStitchConfig(settings) {
    const stitch = settings?.mcpServers?.stitch;
    const headers = stitch?.headers && typeof stitch.headers === 'object' ? stitch.headers : {};
    return {
        stitchConfigured: Boolean(stitch && typeof stitch === 'object'),
        stitchType: typeof stitch?.type === 'string' ? stitch.type : '',
        stitchHttpUrlConfigured: typeof stitch?.httpUrl === 'string' && stitch.httpUrl.trim() === 'https://stitch.googleapis.com/mcp',
        stitchAuthConfigured: typeof headers['X-Goog-Api-Key'] === 'string' && headers['X-Goog-Api-Key'].trim().length > 0,
    };
}
function inspectGeminiSettings() {
    const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
    if (!fs.existsSync(settingsPath)) {
        return {
            settingsPath,
            exists: false,
            stitchConfigured: false,
            stitchType: '',
            stitchHttpUrlConfigured: false,
            stitchAuthConfigured: false,
        };
    }
    try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const stitchConfig = inspectGeminiStitchConfig(settings);
        return {
            settingsPath,
            exists: true,
            stitchConfigured: stitchConfig.stitchConfigured,
            stitchType: stitchConfig.stitchType,
            stitchHttpUrlConfigured: stitchConfig.stitchHttpUrlConfigured,
            stitchAuthConfigured: stitchConfig.stitchAuthConfigured,
        };
    }
    catch {
        return {
            settingsPath,
            exists: true,
            stitchConfigured: false,
            stitchType: '',
            stitchHttpUrlConfigured: false,
            stitchAuthConfigured: false,
        };
    }
}
function resolveGeminiCommand(projectPath) {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    const lookup = spawnSync(locator, ['gemini'], {
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
function runGemini(geminiCommand, args, options) {
    if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(geminiCommand)) {
        const commandPrefix = /\s/u.test(geminiCommand) ? `"${geminiCommand}"` : geminiCommand;
        const commandLine = `${commandPrefix}${args.length > 0 ? ` ${args.map(escapeCmdArg).join(' ')}` : ''}`;
        return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', commandLine], {
            ...options,
            shell: false,
        });
    }
    return spawnSync(geminiCommand, args, {
        ...options,
        shell: false,
    });
}
function classifyGeminiCliFailure(details, requestedModel) {
    const normalized = String(details || '').trim();
    const lower = normalized.toLowerCase();
    const modelLabel = requestedModel ? ` ${requestedModel}` : '';
    if (/error authenticating|authentication|login|unauthorized|forbidden|auth/i.test(normalized)) {
        return {
            code: 'auth',
            message: 'Gemini CLI authentication is not ready. Complete Gemini CLI login/API configuration, then retry.',
        };
    }
    if (/enotfound|eai_again|getaddrinfo|network|timed out|timeout|socket hang up/i.test(lower)) {
        return {
            code: 'network',
            message: 'Gemini CLI could not reach the upstream service. Check network/DNS access, then retry.',
        };
    }
    if (/rate limit|quota|too many requests|resource exhausted|429/i.test(lower)) {
        return {
            code: 'rate_limit',
            message: `Gemini model${modelLabel} hit a rate limit or quota. Retry later or switch models.`,
        };
    }
    if (/unknown model|invalid model|unsupported model|model.*not found|model.*not available|model.*unavailable|permission.*model|does not support model|404/i.test(lower)) {
        return {
            code: 'model_unavailable',
            message: `Gemini model${modelLabel} is unavailable for this environment. Choose a different model.`,
        };
    }
    return {
        code: 'generic',
        message: `Gemini CLI exited with an error${modelLabel}.`,
    };
}
function buildPrompt(changePath, projectPath, changeName, proposal, tasks, stateJson, canonicalProject) {
    const prompt = [
        'You are the OSpec built-in Stitch adapter running in non-interactive mode.',
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
                    adapter: 'gemini-cli-stitch',
                    fallback_url_extracted: true,
                    ...(requestedModel ? { gemini_model: requestedModel } : {}),
                    ...(normalizedPreviewUrl.normalized
                        ? { original_preview_url: normalizedPreviewUrl.original }
                        : {}),
                },
            };
        }
        fail('Gemini response did not include preview_url.', truncate(String(fallbackResponse || ''), 1000));
    }
    const normalizedPreviewUrl = normalizeStitchPreviewUrl(rawPreviewUrl);
    return {
        preview_url: normalizedPreviewUrl.value,
        summary_markdown: summaryMarkdown,
        notes,
        artifacts,
        metadata: {
            adapter: 'gemini-cli-stitch',
            ...(requestedModel ? { gemini_model: requestedModel } : {}),
            ...(normalizedPreviewUrl.normalized
                ? { original_preview_url: normalizedPreviewUrl.original }
                : {}),
        },
    };
}
const args = parseArgs(process.argv.slice(2));
const changePath = path.resolve(args.change || process.env.OSPEC_STITCH_CHANGE_PATH || process.cwd());
const projectPath = path.resolve(args.project || process.env.OSPEC_STITCH_PROJECT_PATH || process.cwd());
const geminiCommand = resolveGeminiCommand(projectPath);
if (!geminiCommand) {
    fail('Gemini CLI is not available. Install it first with `npm install -g @google/gemini-cli`.');
}
const geminiCheck = runGemini(geminiCommand, ['--version'], {
    cwd: projectPath,
    encoding: 'utf8',
});
if (geminiCheck.error || geminiCheck.status !== 0) {
    fail('Gemini CLI is not available. Install it first with `npm install -g @google/gemini-cli`.');
}
const geminiSettings = inspectGeminiSettings();
if (!geminiSettings.exists) {
    fail(`Gemini settings not found at ${geminiSettings.settingsPath}. Configure Gemini CLI and the stitch MCP server first.`);
}
if (!geminiSettings.stitchConfigured) {
    fail(`Gemini CLI stitch MCP is not configured in ${geminiSettings.settingsPath}. Add mcpServers.stitch before using the built-in adapter.`);
}
if (!geminiSettings.stitchHttpUrlConfigured) {
    fail(`Gemini CLI stitch MCP in ${geminiSettings.settingsPath} must set httpUrl = "https://stitch.googleapis.com/mcp". Follow the Gemini snippet from the repo-local localized Stitch plugin spec.`);
}
if (!geminiSettings.stitchAuthConfigured) {
    fail(`Gemini CLI stitch MCP in ${geminiSettings.settingsPath} must set headers["X-Goog-Api-Key"]. Follow the Gemini snippet from the repo-local localized Stitch plugin spec.`);
}
const statePath = path.join(changePath, 'state.json');
const proposalPath = path.join(changePath, 'proposal.md');
const tasksPath = path.join(changePath, 'tasks.md');
const stateJson = readJsonIfExists(statePath);
const changeName = stateJson?.feature || path.basename(changePath);
const requestedModel = String(args.model || process.env.OSPEC_STITCH_GEMINI_MODEL || '').trim();
const canonicalProject = {
    projectId: String(process.env.OSPEC_STITCH_CANONICAL_PROJECT_ID || '').trim(),
    projectUrl: String(process.env.OSPEC_STITCH_CANONICAL_PROJECT_URL || '').trim(),
};
const prompt = buildPrompt(changePath, projectPath, changeName, readFileIfExists(proposalPath), readFileIfExists(tasksPath), stateJson, canonicalProject);
const geminiArgs = ['-y', '--output-format', 'json', '--allowed-mcp-server-names', 'stitch'];
if (requestedModel) {
    geminiArgs.push('--model', requestedModel);
}
const runResult = runGemini(geminiCommand, geminiArgs, {
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
    fail('Failed to execute Gemini CLI.', runResult.error.message, 'generic');
}
if (runResult.status !== 0) {
    const details = String(runResult.stderr || runResult.stdout || '').trim();
    const failure = classifyGeminiCliFailure(details, requestedModel);
    fail(failure.message, truncate(details, 1200), failure.code);
}
const rawStdout = String(runResult.stdout || '').trim();
const jsonBlock = extractJsonCandidate(rawStdout);
if (!jsonBlock) {
    fail('Gemini CLI did not return JSON output.', truncate(rawStdout, 1200));
}
let geminiEnvelope;
try {
    geminiEnvelope = JSON.parse(jsonBlock);
}
catch (error) {
    fail('Failed to parse Gemini CLI JSON envelope.', error instanceof Error ? error.message : String(error));
}
const responseText = typeof geminiEnvelope?.response === 'string' ? geminiEnvelope.response.trim() : '';
if (!responseText) {
    fail('Gemini CLI response body is empty.', truncate(rawStdout, 1200));
}
const responseJsonBlock = extractJsonCandidate(responseText);
let parsedResponse = null;
if (responseJsonBlock) {
    try {
        parsedResponse = JSON.parse(responseJsonBlock);
    }
    catch {
        parsedResponse = null;
    }
}
process.stdout.write(`${JSON.stringify(normalizeResult(parsedResponse, responseText, requestedModel))}\n`);