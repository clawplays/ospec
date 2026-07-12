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
exports.ClaudeHookService = void 0;
exports.createClaudeHookService = createClaudeHookService;
const path = __importStar(require("path"));
/**
 * Generates and installs the OSpec Claude Code hook bundle that hard-enforces
 * the Announce-Before-Act and Brainstorm-First contracts inside Claude Code.
 *
 * The bundle is always written under `.ospec/hooks/claude/`. Merging it into the
 * project's `.claude/settings.json` is opt-in via `apply`, idempotent, and
 * reversible (OSpec-managed entries are identified by the hook script path).
 */
const HOOK_DIR_PARTS = ['.ospec', 'hooks', 'claude'];
const HOOK_SCRIPT_NAME = 'ospec-claude-hook.cjs';
const HOOK_SCRIPT_POSIX = '.ospec/hooks/claude/ospec-claude-hook.cjs';
const HOOK_COMMAND_ARG = `\${CLAUDE_PROJECT_DIR}/${HOOK_SCRIPT_POSIX}`;
const FRAGMENT_NAME = 'claude-settings.hooks.json';
const README_NAME = 'README.md';
const HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse'];
class ClaudeHookService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    getPackageRoot() {
        return path.resolve(__dirname, '../..');
    }
    hookEntry() {
        return { type: 'command', command: 'node', args: [HOOK_COMMAND_ARG] };
    }
    buildSettingsFragment() {
        return {
            hooks: {
                SessionStart: [{ matcher: 'startup|clear|compact', hooks: [this.hookEntry()] }],
                UserPromptSubmit: [{ hooks: [this.hookEntry()] }],
                PreToolUse: [
                    { matcher: 'Task', hooks: [this.hookEntry()] },
                    { matcher: 'Bash', hooks: [this.hookEntry()] },
                ],
            },
        };
    }
    isOSpecHookGroup(group) {
        const hooks = group?.hooks;
        if (!Array.isArray(hooks)) {
            return false;
        }
        return hooks.some(hook => Array.isArray(hook?.args) &&
            hook.args.some(arg => typeof arg === 'string' && arg.includes(HOOK_SCRIPT_POSIX)));
    }
    /**
     * Idempotently merges the OSpec hook groups into a settings object. Existing
     * OSpec-managed groups are replaced (not duplicated); other hooks are kept.
     */
    mergeIntoSettings(settings) {
        const base = settings && typeof settings === 'object' && !Array.isArray(settings)
            ? { ...settings }
            : {};
        const before = JSON.stringify(base.hooks ?? null);
        const hooks = base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks)
            ? { ...base.hooks }
            : {};
        const fragment = this.buildSettingsFragment().hooks;
        for (const event of HOOK_EVENTS) {
            const existing = Array.isArray(hooks[event]) ? hooks[event] : [];
            const preserved = existing.filter(group => !this.isOSpecHookGroup(group));
            hooks[event] = [...preserved, ...fragment[event]];
        }
        const next = { ...base, hooks };
        const changed = JSON.stringify(hooks) !== before;
        return { settings: next, changed };
    }
    renderReadme() {
        return [
            '# OSpec Claude Code Hooks',
            '',
            'This bundle hard-enforces the OSpec harness contract inside Claude Code.',
            '',
            '- `ospec-claude-hook.cjs` — the hook handler (Node, no dependencies).',
            '- `claude-settings.hooks.json` — the `hooks` block to merge into your Claude settings.',
            '',
            '## What it does',
            '',
            '- `SessionStart(startup|clear|compact)`: injects the static `Announce-Before-Act` and `Brainstorm-First` contract once; resume does not reinject it.',
            '- `UserPromptSubmit`: stays silent unless a required decision is pending, then injects only that dynamic reminder.',
            '- `PreToolUse(Task)`: announces every subagent dispatch, and blocks dispatch while a required decision is pending.',
            '- `PreToolUse(Bash)` for `ospec ...`: announces the command; shell-executing fallbacks (`--run`, `orchestrate`) escalate to a user prompt.',
            '',
            '## Install',
            '',
            'Run `ospec session hook --target claude --apply` to merge automatically, or merge',
            '`claude-settings.hooks.json` into `.claude/settings.json` by hand. Re-running is idempotent;',
            'remove the OSpec entries (those whose args reference this script) to uninstall.',
            '',
        ].join('\n');
    }
    async install(targetPath, options = {}) {
        const root = path.resolve(targetPath);
        const hookDir = path.join(root, ...HOOK_DIR_PARTS);
        const scriptDest = path.join(hookDir, HOOK_SCRIPT_NAME);
        const fragmentPath = path.join(hookDir, FRAGMENT_NAME);
        const readmePath = path.join(hookDir, README_NAME);
        const scriptSrc = path.join(this.getPackageRoot(), 'assets', 'hooks', 'claude', HOOK_SCRIPT_NAME);
        await this.fileService.ensureDir(hookDir);
        const scriptContent = await this.fileService.readFile(scriptSrc);
        await this.fileService.writeFile(scriptDest, scriptContent);
        await this.fileService.writeJSON(fragmentPath, this.buildSettingsFragment());
        await this.fileService.writeFile(readmePath, this.renderReadme());
        let applied = false;
        let settingsChanged = false;
        let settingsPath = null;
        if (options.apply) {
            settingsPath = path.join(root, '.claude', 'settings.json');
            let existing = {};
            if (await this.fileService.exists(settingsPath)) {
                try {
                    existing = await this.fileService.readJSON(settingsPath);
                }
                catch {
                    // Never clobber a settings file we cannot parse — the user may have
                    // hand-edited config we would silently destroy.
                    throw new Error(`Refusing to overwrite unparseable ${settingsPath}. Fix the JSON or merge ${fragmentPath} into it by hand.`);
                }
            }
            const merged = this.mergeIntoSettings(existing);
            await this.fileService.ensureDir(path.dirname(settingsPath));
            await this.fileService.writeJSON(settingsPath, merged.settings);
            applied = true;
            settingsChanged = merged.changed;
        }
        return { scriptPath: scriptDest, fragmentPath, readmePath, applied, settingsPath, settingsChanged };
    }
}
exports.ClaudeHookService = ClaudeHookService;
function createClaudeHookService(fileService) {
    return new ClaudeHookService(fileService);
}
