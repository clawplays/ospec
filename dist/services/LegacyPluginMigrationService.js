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
exports.LegacyPluginMigrationService = exports.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH = void 0;
exports.createLegacyPluginMigrationService = createLegacyPluginMigrationService;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const ProjectLayout_1 = require("../utils/ProjectLayout");
/*
 * Written as a block comment rather than JSDoc on purpose: a file-leading `/**`
 * sitting between the CommonJS requires and the first declaration is what the
 * dist build's `moveLeadingDocCommentAfterUseStrict` canonicalization step
 * exists to relocate, and `tests/build/build-canonicalization-report.test.mjs`
 * pins how many files still need it.
 *
 * OSpec 2.0 deleted the plugin system. Deleting the code is only half of the
 * job: every project initialized before 2.0 still carries the plugin-era
 * guidance that the old CLI generated into the project's OWN managed files.
 *
 * The load-bearing one is the `## Plugin Gates` section in the project root
 * `SKILL.md`. It tells the agent to treat a change as BLOCKED until a Stitch
 * approval artifact says `approved`, and no surviving command can ever produce
 * that artifact -- so an upgraded project silently instructs its own agent to
 * wait forever. `SKILL.index.json` routes agents straight to it by heading.
 *
 * Scope boundary, deliberately hard: `.ospec/plugins/` is NEVER touched. It
 * holds irreplaceable user data (routes.yaml, flows.yaml, project.json, auth
 * storage-state) that no reinstall can regenerate. This service only rewrites
 * files OSpec itself generated, and it records what it removed so the change is
 * auditable instead of silent.
 */
/** The `## Plugin Gates` heading in every locale the 1.x templates emitted. */
const PLUGIN_GATE_HEADINGS = [
    'Plugin Gates',
    '插件阻断',
    'プラグインゲート',
    'بوابات الإضافات',
];
/**
 * The 1.x "Entry Sequence" step 1 listed `plugins` among the things `.skillrc`
 * configures. The section itself is still correct, so the whole section must
 * not be dropped -- only the dead noun. One rewrite per locale, each anchored
 * on the literal the 1.x template emitted.
 */
const ENTRY_SEQUENCE_PLUGIN_MENTIONS = [
    {
        from: '`.skillrc` for layout, document language, workflow policy, plugins, and model profiles.',
        to: '`.skillrc` for layout, document language, workflow policy, and model profiles.',
    },
    {
        from: '`.skillrc`：布局、文档语言、工作流策略、插件与模型档案。',
        to: '`.skillrc`：布局、文档语言、工作流策略与模型档案。',
    },
    {
        from: '`.skillrc`: レイアウト、文書言語、ワークフロー方針、プラグイン、モデルプロファイル。',
        to: '`.skillrc`: レイアウト、文書言語、ワークフロー方針、モデルプロファイル。',
    },
    {
        from: '`.skillrc` للتخطيط ولغة الوثائق وسياسة سير العمل والإضافات وملفات النماذج.',
        to: '`.skillrc` للتخطيط ولغة الوثائق وسياسة سير العمل وملفات النماذج.',
    },
];
/** Workflow steps that only ever existed because a plugin contributed them. */
const PLUGIN_CONTRIBUTED_STEPS = [
    'stitch_design_review',
    'checkpoint_ui_review',
    'checkpoint_flow_check',
];
exports.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH = '.ospec/plugin-migration.json';
const EMPTY_RESULT = {
    performed: false,
    removals: [],
    rewrittenPaths: [],
};
function hashText(value) {
    return (0, crypto_1.createHash)('sha256').update(value, 'utf8').digest('hex');
}
function toRelativePath(rootDir, targetPath) {
    return path.relative(rootDir, targetPath).replace(/\\/g, '/');
}
class LegacyPluginMigrationService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    /**
     * Pure text surgery on a generated SKILL.md body. Returns the rewritten
     * content plus one removal record per edit, or null when nothing matched.
     *
     * Section removal is heading-scoped: it drops the `## <plugin gate>` line and
     * everything under it up to the next heading of the same or higher level, so
     * a section that is not last in the file does not swallow its successors.
     */
    stripPluginGuidanceFromSkillMarkdown(content) {
        const removals = [];
        let next = content;
        for (const heading of PLUGIN_GATE_HEADINGS) {
            const stripped = this.removeMarkdownSection(next, heading);
            if (!stripped) {
                continue;
            }
            next = stripped.content;
            removals.push({
                kind: 'plugin-gates-section',
                detail: `## ${heading}`,
                removedContentHash: hashText(stripped.removedText),
            });
        }
        for (const mention of ENTRY_SEQUENCE_PLUGIN_MENTIONS) {
            if (!next.includes(mention.from)) {
                continue;
            }
            next = next.split(mention.from).join(mention.to);
            removals.push({
                kind: 'entry-sequence-mention',
                detail: mention.from,
                removedContentHash: hashText(mention.from),
            });
        }
        return { content: next, removals };
    }
    /**
     * Removes the project's plugin-era guidance from the managed root SKILL.md.
     * Called from the protocol-guidance sync so `ospec update`, `ospec docs
     * sync-protocol`, `ospec docs generate`, and `ospec layout migrate` all
     * repair it -- and so the index rebuild that follows the sync re-routes
     * agents away from the removed heading in the same run.
     */
    async migrateProjectSkillGuidance(rootDir, config) {
        const skillPath = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.FILE_NAMES.SKILL_MD, (0, ProjectLayout_1.getProjectLayout)(config || undefined));
        if (!(await this.fileService.exists(skillPath))) {
            return EMPTY_RESULT;
        }
        const before = await this.fileService.readFile(skillPath);
        const { content: after, removals } = this.stripPluginGuidanceFromSkillMarkdown(before);
        if (removals.length === 0 || after === before) {
            return EMPTY_RESULT;
        }
        const relativePath = toRelativePath(rootDir, skillPath);
        await this.fileService.writeFile(skillPath, after);
        return {
            performed: true,
            removals: removals.map(removal => ({ ...removal, path: relativePath })),
            rewrittenPaths: [relativePath],
        };
    }
    /**
     * Removes a dead `plugins` block from `.skillrc`, keeping a verbatim copy in
     * the returned removal record.
     *
     * `ConfigManager.normalizeConfig` already strips the key, but only on the way
     * out of `loadConfig` -- and `ospec update` reaches `saveConfig` only when it
     * has some OTHER reason to write (a CLI version bump, an archive layout fix).
     * On an already-current project it never writes, so the block survives every
     * update forever. This reads the raw file and rewrites it unconditionally.
     */
    async migrateSkillrcPlugins(rootDir) {
        const configPath = path.join(rootDir, constants_1.FILE_NAMES.SKILLRC);
        const rawConfig = await this.readRawSkillrc(configPath);
        if (!rawConfig || !Object.prototype.hasOwnProperty.call(rawConfig, 'plugins')) {
            return EMPTY_RESULT;
        }
        const removedConfig = rawConfig.plugins;
        const { plugins: _removedPlugins, ...rest } = rawConfig;
        await this.fileService.writeJSON(configPath, rest);
        return {
            performed: true,
            removals: [this.describeRemovedSkillrcPlugins(removedConfig)],
            rewrittenPaths: [constants_1.FILE_NAMES.SKILLRC],
        };
    }
    /**
     * Reads the `plugins` block straight off disk without going through
     * `ConfigManager`, which normalizes it away. Returns `undefined` when the
     * file is absent, unreadable, or carries no `plugins` key.
     *
     * `ospec update` calls this before anything else so that a legacy-project
     * repair -- which round-trips `.skillrc` through `ConfigManager.saveConfig`
     * and drops the block on the way -- cannot make the removal unrecordable.
     */
    async readRawSkillrcPlugins(rootDir) {
        const rawConfig = await this.readRawSkillrc(path.join(rootDir, constants_1.FILE_NAMES.SKILLRC));
        if (!rawConfig || !Object.prototype.hasOwnProperty.call(rawConfig, 'plugins')) {
            return undefined;
        }
        return rawConfig.plugins;
    }
    /** The audit record for one removed `.skillrc` `plugins` block. */
    describeRemovedSkillrcPlugins(removedConfig) {
        const removedNames = removedConfig && typeof removedConfig === 'object' && !Array.isArray(removedConfig)
            ? Object.keys(removedConfig).sort()
            : [];
        return {
            path: constants_1.FILE_NAMES.SKILLRC,
            kind: 'skillrc-plugins-block',
            detail: removedNames.length > 0
                ? `plugins: ${removedNames.join(', ')}`
                : 'plugins block',
            removedContentHash: hashText(JSON.stringify(removedConfig ?? null)),
            removedConfig,
        };
    }
    async readRawSkillrc(configPath) {
        if (!(await this.fileService.exists(configPath))) {
            return null;
        }
        try {
            const rawConfig = await this.fileService.readJSON(configPath);
            return rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
                ? rawConfig
                : null;
        }
        catch {
            // A damaged `.skillrc` is reported by the config loader with recovery
            // steps. Silently rewriting it here would destroy the evidence.
            return null;
        }
    }
    /**
     * Opt-in (`ospec update --clean-plugin-steps`). Drops plugin-contributed
     * steps from the `optional_steps` frontmatter of every active and queued
     * change's `tasks.md` and `verification.md`.
     */
    async migrateChangePluginSteps(rootDir, config, options = {}) {
        const removals = [];
        const rewrittenPaths = [];
        const changesRoot = (0, ProjectLayout_1.resolveManagedPath)(rootDir, constants_1.DIR_NAMES.CHANGES, (0, ProjectLayout_1.getProjectLayout)(config || undefined));
        for (const bucket of ['active', 'queued']) {
            const bucketRoot = path.join(changesRoot, bucket);
            if (!(await this.fileService.exists(bucketRoot))) {
                continue;
            }
            const entryNames = (await this.fileService.readDir(bucketRoot)).sort((left, right) => left.localeCompare(right));
            for (const entryName of entryNames) {
                const changeDir = path.join(bucketRoot, entryName);
                const stat = await this.fileService.stat(changeDir).catch(() => null);
                if (!stat?.isDirectory()) {
                    continue;
                }
                for (const documentName of ['tasks.md', 'verification.md']) {
                    const documentPath = path.join(changeDir, documentName);
                    const removal = await this.stripPluginStepsFromChangeDocument(rootDir, documentPath, options.dryRun === true);
                    if (!removal) {
                        continue;
                    }
                    removals.push(removal);
                    rewrittenPaths.push(removal.path);
                }
            }
        }
        return {
            performed: removals.length > 0,
            removals,
            rewrittenPaths,
        };
    }
    /**
     * Records what the migration removed. Written only when something was
     * actually removed, so a repeat `ospec update` on an already-migrated project
     * leaves the file byte-identical instead of churning its timestamp.
     */
    async writeProvenance(rootDir, input) {
        if (input.removals.length === 0) {
            return null;
        }
        const provenancePath = path.join(rootDir, ...exports.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH.split('/'));
        const previousRemovals = await this.readPreviousRemovals(provenancePath);
        await this.fileService.writeJSON(provenancePath, {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            ospecCliVersion: input.cliVersion,
            source: input.source,
            reason: 'OSpec 2.0 removed the plugin system; these plugin-era instructions could never be satisfied again.',
            preserved: ['.ospec/plugins/'],
            removals: [...previousRemovals, ...input.removals],
        });
        return exports.PLUGIN_MIGRATION_PROVENANCE_RELATIVE_PATH;
    }
    /**
     * Earlier runs stay in the file: a project can be migrated in two steps
     * (automatic first, then `--clean-plugin-steps`), and the second run must not
     * erase the audit trail of the first.
     */
    async readPreviousRemovals(provenancePath) {
        if (!(await this.fileService.exists(provenancePath))) {
            return [];
        }
        try {
            const previous = await this.fileService.readJSON(provenancePath);
            return Array.isArray(previous?.removals)
                ? previous.removals
                : [];
        }
        catch {
            return [];
        }
    }
    async stripPluginStepsFromChangeDocument(rootDir, documentPath, dryRun) {
        if (!(await this.fileService.exists(documentPath))) {
            return null;
        }
        const before = (await this.fileService.readFile(documentPath)).replace(/^﻿/, '');
        const frontmatterPattern = /^---(\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;
        const frontmatterMatch = frontmatterPattern.exec(before);
        if (!frontmatterMatch) {
            return null;
        }
        const rewrite = this.stripPluginStepsFromFrontmatterText(frontmatterMatch[2]);
        if (!rewrite) {
            return null;
        }
        if (!dryRun) {
            // Replacer function, not a replacement string: the frontmatter body can
            // contain `$` sequences that a string replacement would expand.
            const after = before.replace(frontmatterPattern, (_match, open, _body, close) => `---${open}${rewrite.frontmatterText}${close}`);
            await this.fileService.writeFile(documentPath, after);
        }
        return {
            path: toRelativePath(rootDir, documentPath),
            kind: 'change-plugin-steps',
            detail: Array.from(new Set(rewrite.removedSteps.map(entry => entry.field)))
                .map(field => `${field}: ${rewrite.removedSteps.filter(entry => entry.field === field).map(entry => entry.step).join(', ')}`)
                .join('; '),
            removedContentHash: hashText(JSON.stringify(rewrite.removedSteps)),
        };
    }
    /**
     * Edits the plugin steps out of the frontmatter TEXT rather than round-tripping
     * it through the YAML loader.
     *
     * A load/dump cycle rewrites every other key on the way back out -- notably
     * `created: 2026-08-15`, which js-yaml reads as a Date and re-emits as a full
     * ISO timestamp. These are the user's own change records; the opt-in cleanup
     * must not restyle the rest of the file to reach one list.
     *
     * Handles both shapes the field appears in: the flow list the CLI writes
     * (`optional_steps: ["a", "b"]`) and the block list a hand edit produces.
     */
    stripPluginStepsFromFrontmatterText(frontmatterText) {
        const lines = frontmatterText.split('\n');
        const removedSteps = [];
        const dropLineIndexes = new Set();
        for (let index = 0; index < lines.length; index += 1) {
            const fieldMatch = /^(optional_steps|passed_optional_steps)\s*:\s*(.*?)(\r?)$/.exec(lines[index]);
            if (!fieldMatch) {
                continue;
            }
            const field = fieldMatch[1];
            const inlineValue = fieldMatch[2].trim();
            const lineEnding = fieldMatch[3];
            if (inlineValue.startsWith('[')) {
                const parsedList = this.parseFlowList(inlineValue);
                if (!parsedList) {
                    continue;
                }
                const kept = parsedList.filter(step => !PLUGIN_CONTRIBUTED_STEPS.includes(step));
                if (kept.length === parsedList.length) {
                    continue;
                }
                for (const step of parsedList.filter(step => PLUGIN_CONTRIBUTED_STEPS.includes(step))) {
                    removedSteps.push({ field, step });
                }
                lines[index] = `${field}: [${kept.map(step => JSON.stringify(step)).join(', ')}]${lineEnding}`;
                continue;
            }
            if (inlineValue.length > 0) {
                continue;
            }
            for (let itemIndex = index + 1; itemIndex < lines.length; itemIndex += 1) {
                const itemMatch = /^\s*-\s*(.*)$/.exec(lines[itemIndex]);
                if (!itemMatch) {
                    break;
                }
                const step = itemMatch[1].trim().replace(/^["']|["']$/g, '');
                if (!PLUGIN_CONTRIBUTED_STEPS.includes(step)) {
                    continue;
                }
                removedSteps.push({ field, step });
                dropLineIndexes.add(itemIndex);
            }
        }
        if (removedSteps.length === 0) {
            return null;
        }
        return {
            frontmatterText: lines.filter((_line, index) => !dropLineIndexes.has(index)).join('\n'),
            removedSteps,
        };
    }
    /** `["a", "b"]` -> `['a', 'b']`, or null when the text is not a plain flow list. */
    parseFlowList(value) {
        try {
            const parsed = JSON.parse(value.replace(/'/g, '"'));
            return Array.isArray(parsed) && parsed.every(item => typeof item === 'string')
                ? parsed
                : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Removes `#### <heading>` and its body up to the next heading at the same or
     * a higher level. Returns null when the heading is absent.
     */
    removeMarkdownSection(content, heading) {
        const lines = content.split('\n');
        const startIndex = lines.findIndex(line => /^(#{1,6})\s+(.*)$/.test(line)
            && line.replace(/^#{1,6}\s+/, '').trim() === heading);
        if (startIndex === -1) {
            return null;
        }
        const level = /^(#{1,6})/.exec(lines[startIndex])[1].length;
        let endIndex = lines.length;
        for (let index = startIndex + 1; index < lines.length; index += 1) {
            const match = /^(#{1,6})\s+\S/.exec(lines[index]);
            if (match && match[1].length <= level) {
                endIndex = index;
                break;
            }
        }
        const removedText = lines.slice(startIndex, endIndex).join('\n');
        const remaining = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];
        // A section removed from the end of the file leaves the blank separator
        // line that preceded it; trailing whitespace churn would otherwise show up
        // as a spurious diff on every later managed-file comparison.
        while (remaining.length > 0 && remaining[remaining.length - 1].trim() === '') {
            remaining.pop();
        }
        return {
            content: `${remaining.join('\n')}\n`,
            removedText,
        };
    }
}
exports.LegacyPluginMigrationService = LegacyPluginMigrationService;
function createLegacyPluginMigrationService(fileService) {
    return new LegacyPluginMigrationService(fileService);
}
