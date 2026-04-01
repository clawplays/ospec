"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {

    return (mod && mod.__esModule) ? mod : { "default": mod };

};

Object.defineProperty(exports, "__esModule", { value: true });

exports.SkillCommand = void 0;

const os_1 = __importDefault(require("os"));

const path_1 = __importDefault(require("path"));

const services_1 = require("../services");

const subcommandHelp_1 = require("../utils/subcommandHelp");

const BaseCommand_1 = require("./BaseCommand");

const ACTION_SKILLS = [

    {

        name: 'ospec-init',

        title: 'OSpec Init',

        description: 'Initialize an OSpec repository to change-ready state without creating the first change automatically.',

        shortDescription: 'Initialize OSpec to change-ready',

        defaultPrompt: 'Use $ospec-init to initialize the target directory with ospec init so the repository ends in change-ready state. Reuse existing project docs when available. If the repository lacks a usable project overview and you are in an AI-assisted flow, ask one concise question for project summary or tech stack before calling ospec init with those inputs; if the user declines, run plain ospec init and allow placeholder docs. Verify the protocol-shell files and project knowledge docs on disk. Do not create the first change automatically.',

        markdown: `# OSpec Init



Use this action when the user intent is initialization.



## Guardrails



- use \`ospec init [path]\` so the repository ends in change-ready state

- verify \`.skillrc\`, \`.ospec/\`, \`changes/\`, \`SKILL.md\`, \`SKILL.index.json\`, \`build-index-auto.cjs\`, \`for-ai/\`, and \`docs/project/\` files on disk

- if project overview context is missing and AI can ask follow-up questions, ask for a brief summary or tech stack before initialization; if the user declines, fall back to placeholder docs

- use \`ospec status [path]\` only when you want an explicit summary or troubleshooting snapshot

- do not assume a web template when the project type is unclear

- do not create the first change unless explicitly requested



## Commands



\`\`\`bash

ospec init [path]

ospec init [path] --summary "..." --tech-stack node,react

ospec status [path]

\`\`\`

`,

    },

    {

        name: 'ospec-inspect',

        title: 'OSpec Inspect',

        description: 'Inspect an existing repository to determine OSpec initialization level, docs coverage, skills coverage, and active change posture.',

        shortDescription: 'Inspect OSpec project state',

        defaultPrompt: 'Use $ospec-inspect to inspect the current repository state with ospec status, ospec docs status, ospec skills status, and ospec changes status. Prefer diagnosis before mutation.',

        markdown: `# OSpec Inspect



Use this action when the user wants to understand current project posture before changing anything.



## Commands



\`\`\`bash

ospec status [path]

ospec docs status [path]

ospec skills status [path]

ospec changes status [path]

\`\`\`



## Rules



- prefer inspection before initialization or backfill

- call out whether the repo is initialized and whether project knowledge docs are complete

`,

    },

    {

        name: 'ospec-backfill',

        title: 'OSpec Backfill',

        description: 'Refresh or repair the project knowledge layer for an initialized repository without creating a change.',

        shortDescription: 'Refresh project knowledge layer',

        defaultPrompt: 'Use $ospec-backfill to refresh, repair, or backfill the project knowledge layer for an initialized repository. Prefer ospec docs generate when you only need docs maintenance, keep scaffold explicit, and do not create the first change automatically.',

        markdown: `# OSpec Backfill



Use this action after the repository is already initialized and the project knowledge docs need maintenance.



## Guardrails



- require an initialized repository first

- prefer \`ospec docs generate [path]\`

- do not apply business scaffold during docs backfill

- do not generate \`docs/project/bootstrap-summary.md\`

- do not create a change unless explicitly requested



## Commands



\`\`\`bash

ospec docs status [path]

ospec docs generate [path]

ospec skills status [path]

ospec index check [path]

\`\`\`

`,

    },

    {

        name: 'ospec-change',

        title: 'OSpec Change',

        description: 'Create or advance an active change inside an OSpec project while respecting workflow files and optional-step activation.',

        shortDescription: 'Create or advance a change',

        defaultPrompt: 'Use $ospec-change to handle a requirement through the full OSpec change lifecycle. Inspect project state first, read the project-adopted for-ai guidance before writing, preserve the project document language already established in for-ai and existing change files, and work inside changes/active/<change>. Default to one active change and do not enter queue mode unless the user explicitly asks to split work into multiple changes, create a queue, or execute a queue. When queue behavior is explicitly requested, derive an ordered kebab-case list of change names, use ospec queue add to create queued changes, and use ospec run manual-safe only when the user explicitly asks to run the queue. Use verify, archive-check, or finalize for closeout. If Stitch installation, provider switching, doctor remediation, MCP setup, or auth setup is involved, read the repo-local Stitch plugin spec first and use its documented config snippet instead of inventing a replacement. If that spec is missing, use these built-in baselines: Gemini uses %USERPROFILE%/.gemini/settings.json with mcpServers.stitch.httpUrl and headers.X-Goog-Api-Key; Codex uses %USERPROFILE%/.codex/config.toml with [mcp_servers.stitch], type="http", url="https://stitch.googleapis.com/mcp", and X-Goog-Api-Key in headers or [mcp_servers.stitch.http_headers].',

        markdown: `# OSpec Change



Use this skill when the user says things like "use ospec change to do a requirement".



## Scope



This skill is the single entry for the full change lifecycle inside an initialized OSpec project:

- requirement intake

- change naming or matching

- proposal and task refinement

- implementation guidance

- progress tracking

- verification

- archive readiness check

- finalize closeout



## Read Order



1. \`.skillrc\`

2. \`SKILL.index.json\`

3. \`for-ai/ai-guide.md\`

4. \`for-ai/execution-protocol.md\`

5. \`changes/active/<change>/proposal.md\`

6. \`changes/active/<change>/tasks.md\`

7. \`changes/active/<change>/state.json\`

8. \`changes/active/<change>/verification.md\`

9. \`changes/active/<change>/review.md\`



## Language



- Follow the project-adopted document language from \`for-ai/\` and existing change docs.

- Keep Chinese projects in Chinese unless the repo explicitly adopts English.



## Required Logic



1. Inspect repository state first when posture is unclear.

2. If the repo is not initialized, stop at initialization guidance instead of forcing a change.

3. If the request is a new requirement, derive a concise kebab-case change name and create it.

4. If the matching active change already exists, continue it instead of duplicating it.

5. Treat \`changes/active/<change>/\` as the execution container.

6. Keep \`proposal.md\`, \`tasks.md\`, \`state.json\`, \`verification.md\`, and \`review.md\` aligned with actual execution and with the project's established document language.

7. Use OSpec closeout commands instead of inventing a parallel process.



## Commands



\`\`\`bash

ospec status [path]

ospec new <change-name> [path]

ospec changes status [path]

ospec progress [changes/active/<change>]

ospec verify [changes/active/<change>]

ospec archive [changes/active/<change>] --check

ospec finalize [changes/active/<change>]

\`\`\`



## Guardrails



- Do not assume dashboard workflows exist.

- Do not refer to \`basic\` or \`full\` structure levels.

- Do not confuse repository initialization with change execution.

- Do not claim completion until implementation, verification notes, and closeout status are aligned.

- If real project tests exist, run or recommend them separately from \`ospec verify\`.

`,

    },

    {

        name: 'ospec-verify',

        title: 'OSpec Verify',

        description: 'Verify a OSpec change and inspect aggregated PASS/WARN/FAIL status across all active changes before commit or archive.',

        shortDescription: 'Verify changes and summaries',

        defaultPrompt: 'Use $ospec-verify to verify change protocol completeness with ospec verify and ospec changes status. Highlight PASS, WARN, and FAIL items before archive or commit.',

        markdown: `# OSpec Verify



Use this action when validating delivery readiness.



## Commands



\`\`\`bash

ospec verify [changes/active/<change>]

ospec changes status [path]

ospec index check [path]

\`\`\`



## Rules



- show PASS, WARN, and FAIL clearly

- incomplete checklists are warnings

- missing protocol files or optional-step coverage are failures

`,

    },

    {

        name: 'ospec-archive',

        title: 'OSpec Archive',

        description: 'Archive a completed OSpec change after checking workflow gates, and support an explicit check-only mode when needed.',

        shortDescription: 'Archive a completed change',

        defaultPrompt: 'Use $ospec-archive to archive a completed OSpec change. Check readiness first, then run ospec archive on the active change path. If you only need a dry check, use ospec archive --check.',

        markdown: `# OSpec Archive



Use this action when a change is complete and should be archived before commit.



## Commands



\`\`\`bash

ospec archive [changes/active/<change>]

ospec archive [changes/active/<change>] --check

ospec verify [changes/active/<change>]

ospec changes status [path]

\`\`\`



## Rules



- state.json.status must be \`ready_to_archive\`

- verification and optional-step coverage must already be complete

- archive before commit; do not expect commit to archive automatically

- use \`--check\` only when you want readiness output without executing archive

`,

    },

    {

        name: 'ospec-finalize',

        title: 'OSpec Finalize',

        description: 'Run the standard change closeout flow, verify protocol completeness, refresh the index, and archive the completed change before commit.',

        shortDescription: 'Finalize a completed change',

        defaultPrompt: 'Use $ospec-finalize to close a completed OSpec change. Run the preflight verification, rebuild the index, move the change through archive, and leave the repository ready for manual commit.',

        markdown: `# OSpec Finalize



Use this action when implementation is complete and the change should be closed before commit.



## Commands



\`\`\`bash

ospec finalize [changes/active/<change>]

ospec changes status [path]

\`\`\`



## Rules



- finalize is the default closeout path for a completed change

- it should verify protocol completeness before archive

- it should archive before commit

- Git commit remains manual unless the project explicitly adds optional automation

`,

    },

];

class SkillCommand extends BaseCommand_1.BaseCommand {

    async execute(action = 'status', skillNameOrTargetDir, targetDir) {

        try {

            if ((0, subcommandHelp_1.isHelpAction)(action)) {

                this.info((0, subcommandHelp_1.getSkillHelpText)());

                return;

            }

            const { provider, verb } = this.resolveAction(action);
            const selection = this.resolveSkillSelection(skillNameOrTargetDir, targetDir);

            switch (verb) {

                case 'install': {

                    const result = await this.installSkill(provider, selection.skillName, selection.targetDir);

                    this.success(`Installed ospec ${result.providerLabel} skill: ${result.skillName}`);
                    this.info(`  target: ${result.targetDir}`);

                    break;

                }

                case 'status': {

                    const result = await this.getInstalledSkillStatus(provider, selection.skillName, selection.targetDir);

                    console.log(`\n${result.providerLabel} Skill Status`);

                    console.log(`${'='.repeat(`${result.providerLabel} Skill Status`.length)}\n`);

                    console.log(`Skill: ${result.skillName}`);
                    console.log(`Target: ${result.targetDir}`);
                    console.log(`In sync: ${result.inSync ? 'yes' : 'no'}`);

                    for (const asset of result.assets) {

                        console.log(`  ${asset.relativePath}: ${asset.exists ? 'present' : 'missing'}`);

                    }

                    if (result.missingFiles.length > 0) {

                        console.log('\nMissing files:');

                        for (const item of result.missingFiles) {

                            console.log(`  - ${item}`);

                        }

                    }

                    if (result.driftedFiles.length > 0) {

                        console.log('\nOut-of-sync files:');

                        for (const item of result.driftedFiles) {

                            console.log(`  - ${item}`);

                        }

                    }

                    if (!result.inSync) {

                        console.log(`\nRecommendation: run "ospec skill ${this.getInstallAction(provider)} ${result.skillName}${selection.targetDir ? ` ${selection.targetDir}` : ''}" to sync this skill.`);

                    }

                    console.log('');

                    break;

                }

            }

        }

        catch (error) {

            this.error(`Skill command failed: ${error}`);

            throw error;

        }

    }

    resolveAction(action) {

        switch (action) {

            case 'install':

                return { provider: 'codex', verb: 'install' };

            case 'status':

                return { provider: 'codex', verb: 'status' };

            case 'install-claude':

                return { provider: 'claude', verb: 'install' };

            case 'status-claude':

                return { provider: 'claude', verb: 'status' };

            default:

                throw new Error(`Unknown skill action: ${action}`);

        }

    }

    getInstallAction(provider) {

        return provider === 'claude' ? 'install-claude' : 'install';

    }

    resolveSkillSelection(skillNameOrTargetDir, targetDir) {

        const first = String(skillNameOrTargetDir || '').trim();
        const second = String(targetDir || '').trim();

        if (second && !this.isKnownSkillName(first)) {

            throw new Error(`Unknown skill name: ${first}`);

        }

        if (first && this.isKnownSkillName(first)) {

            return {

                skillName: first,

                targetDir: second || undefined,

            };

        }

        if (first && !second && first.startsWith('ospec')) {

            throw new Error(`Unknown skill name: ${first}`);

        }

        return {

            skillName: 'ospec-change',

            targetDir: first || undefined,

        };

    }

    isKnownSkillName(skillName) {

        return this.getAvailableSkillNames().includes(skillName);

    }

    getAvailableSkillNames() {

        return ['ospec', ...ACTION_SKILLS.map(skill => skill.name), 'ospec-cli'];

    }

    async installSkill(provider, skillName, targetDir) {

        const skillPackage = await this.buildSkillPackage(provider, skillName, targetDir);

        await this.syncSkillFiles(skillPackage.assets, skillPackage.targetDir);

        return this.getInstalledSkillStatus(provider, skillName, targetDir);

    }

    async getInstalledSkillStatus(provider, skillName, targetDir) {

        const skillPackage = await this.buildSkillPackage(provider, skillName, targetDir);

        const assets = await Promise.all(skillPackage.assets.map(async (asset) => {

            const absolutePath = path_1.default.join(skillPackage.targetDir, asset.relativePath);

            const exists = await services_1.services.fileService.exists(absolutePath);

            const inSync = exists && (await services_1.services.fileService.readFile(absolutePath)) === asset.content;

            return {

                relativePath: asset.relativePath,

                absolutePath,

                exists,

                inSync,

            };

        }));

        return {

            provider,

            providerLabel: provider === 'claude' ? 'Claude Code' : 'Codex',

            skillName,

            targetDir: skillPackage.targetDir,

            assets,

            inSync: assets.every(asset => asset.inSync),

            missingFiles: assets.filter(asset => !asset.exists).map(asset => asset.absolutePath),

            driftedFiles: assets.filter(asset => asset.exists && !asset.inSync).map(asset => asset.absolutePath),

        };

    }

    async buildSkillPackage(provider, skillName, targetDir) {

        const resolvedTargetDir = this.resolveTargetDir(provider, skillName, targetDir);

        if (skillName === 'ospec-cli') {

            const compatibilityFiles = await this.buildLegacyAliasPackage(provider, resolvedTargetDir);

            return {

                name: 'ospec-cli',

                targetDir: resolvedTargetDir,

                assets: compatibilityFiles.assets,

            };

        }

        const definition = await this.getSkillDefinition(skillName);

        return {

            name: definition.name,

            targetDir: resolvedTargetDir,

            assets: await this.buildPackageAssets(provider, definition),

        };

    }

    async getSkillDefinition(skillName) {

        if (skillName === 'ospec') {

            return this.buildPrimarySkillDefinition();

        }

        const definition = ACTION_SKILLS.find(skill => skill.name === skillName);

        if (!definition) {

            throw new Error(`Unknown skill name: ${skillName}`);

        }

        return definition;

    }

    async buildPrimarySkillDefinition() {

        const sourceFiles = this.resolvePrimarySourceFiles();

        const sourceSkillMd = await services_1.services.fileService.readFile(sourceFiles.skillMdPath);

        const sourceSkillYaml = await services_1.services.fileService.readFile(sourceFiles.skillYamlPath);

        const sourceOpenaiYaml = await services_1.services.fileService.readFile(sourceFiles.openaiYamlPath);

        return {

            name: 'ospec',

            title: 'OSpec',

            description: 'Protocol-shell-first OSpec workflow for inspection, change-ready initialization, docs maintenance, change execution, verification, and archive readiness.',

            shortDescription: 'Inspect, initialize, and operate OSpec projects',

            defaultPrompt: this.extractInterfaceDefaultPrompt(sourceSkillYaml, sourceOpenaiYaml),

            markdown: sourceSkillMd,

            skillYaml: sourceSkillYaml,

            openaiYaml: sourceOpenaiYaml,

        };

    }

    async buildPackageAssets(provider, definition) {

        if (provider === 'claude') {

            return [

                {

                    relativePath: 'SKILL.md',

                    content: this.withClaudeFrontmatter(definition.name, definition.description, this.stripFrontmatter(this.buildSkillMarkdown(definition))),

                },

            ];

        }

        return [

            {

                relativePath: 'SKILL.md',

                content: this.buildSkillMarkdown(definition),

            },

            {

                relativePath: 'skill.yaml',

                content: definition.skillYaml || this.buildCodexSkillYaml(definition),

            },

            {

                relativePath: 'agents/openai.yaml',

                content: definition.openaiYaml || this.buildOpenAiYaml(definition),

            },

        ];

    }

    async buildLegacyAliasPackage(provider, targetDir) {

        if (provider === 'claude') {

            return {

                targetDir,

                assets: [

                    {

                        relativePath: 'SKILL.md',

                        content: this.withClaudeFrontmatter('ospec-cli', 'Legacy compatibility alias for the OSpec skill in Claude Code. Use when existing prompts, automation, or habits still refer to ospec-cli.', this.stripFrontmatter(this.buildCodexLegacyAliasFiles().skillMd)),

                    },

                ],

            };

        }

        const compatibilityFiles = this.buildCodexLegacyAliasFiles();

        return {

            targetDir,

            assets: [

                { relativePath: 'SKILL.md', content: compatibilityFiles.skillMd },

                { relativePath: 'skill.yaml', content: compatibilityFiles.skillYaml },

                { relativePath: 'agents/openai.yaml', content: compatibilityFiles.openaiYaml },

            ],

        };

    }

    async syncSkillFiles(assets, targetDir) {

        await services_1.services.fileService.ensureDir(targetDir);

        for (const asset of assets) {

            const absolutePath = path_1.default.join(targetDir, asset.relativePath);

            await services_1.services.fileService.ensureDir(path_1.default.dirname(absolutePath));

            await services_1.services.fileService.writeFile(absolutePath, asset.content);

        }

    }

    async isPackageInSync(assets, targetDir) {

        for (const asset of assets) {

            const absolutePath = path_1.default.join(targetDir, asset.relativePath);

            if (!(await services_1.services.fileService.exists(absolutePath))) {

                return false;

            }

            if ((await services_1.services.fileService.readFile(absolutePath)) !== asset.content) {

                return false;

            }

        }

        return true;

    }

    buildCodexSkillYaml(definition) {

        return `name: ${definition.name}

title: ${definition.title}

description: ${definition.description}

version: 5.1.0

author: OSpec Team

license: MIT



interface:

  display_name: "${definition.title}"

  short_description: "${definition.shortDescription}"

  default_prompt: "${this.escapeYaml(definition.defaultPrompt)}"

`;

    }

    buildOpenAiYaml(definition) {

        return `interface:

  display_name: "${definition.title}"

  short_description: "${definition.shortDescription}"

  default_prompt: "${this.escapeYaml(definition.defaultPrompt)}"

`;

    }

    resolvePackageRoot() {

        return path_1.default.resolve(__dirname, '..', '..');

    }

    resolvePrimarySourceFiles() {

        const packageRoot = this.resolvePackageRoot();

        return {

            skillMdPath: path_1.default.join(packageRoot, 'SKILL.md'),

            skillYamlPath: path_1.default.join(packageRoot, 'skill.yaml'),

            openaiYamlPath: path_1.default.join(packageRoot, 'agents', 'openai.yaml'),

        };

    }

    withClaudeFrontmatter(name, description, markdownBody) {

        return `---

name: ${name}

description: ${description}

---



${markdownBody.trimStart()}`;

    }

    stripFrontmatter(markdown) {

        return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

    }

    buildSkillMarkdown(definition) {

        if (/^---\r?\n/.test(definition.markdown)) {

            return this.ensureFrontmatterDescription(definition.markdown, definition.description);

        }

        return `---

name: ${definition.name}

description: ${definition.description}

tags: [ospec, cli, workflow]

---



${definition.markdown.trimStart()}`;

    }

    ensureFrontmatterDescription(markdown, description) {

        if (!/^---\r?\n/.test(markdown)) {

            return markdown;

        }

        if (/^---\r?\n[\s\S]*?\r?\ndescription:\s+/m.test(markdown)) {

            return markdown;

        }

        return markdown.replace(/^---\r?\n/, `---\ndescription: ${description}\n`);

    }

    escapeYaml(value) {

        return value.replace(/"/g, '\\"');

    }

    extractInterfaceDefaultPrompt(skillYaml, openaiYaml) {

        const match = skillYaml.match(/default_prompt:\s*"([\s\S]*?)"/) ||

            openaiYaml.match(/default_prompt:\s*"([\s\S]*?)"/);

        return match?.[1]?.replace(/\\"/g, '"') || 'Use $ospec to operate this OSpec project.';

    }

    buildCodexLegacyAliasFiles() {

        return {

            skillMd: `---

name: ospec-cli

description: Legacy compatibility alias for the OSpec skill. Use when existing prompts, automation, or habits still refer to ospec-cli; follow the same OSpec workflow, but prefer the newer $ospec skill name in fresh prompts.

---



# OSpec CLI Legacy Alias



This skill is a compatibility wrapper for the main \`ospec\` skill.



Prefer this prompt style for new work:



1. \`Use ospec to initialize this directory\`

2. \`Use ospec to inspect this repository\`

3. \`Use ospec to refresh or repair the project knowledge layer\`

4. \`Use ospec to create and advance a change for this requirement\`



Always keep these guardrails:



- protocol shell first

- no assumed web template when the project type is unclear

- no business scaffold during plain init

- no automatic first change



Use the same command surface:



\`\`\`bash

ospec status [path]

ospec init [path]

ospec docs generate [path]

ospec changes status [path]

ospec skill status

ospec skill install

ospec skill status-claude

ospec skill install-claude

\`\`\`

`,

            skillYaml: `name: ospec-cli

title: OSpec CLI (Legacy Alias)

description: Legacy compatibility alias that redirects ospec-cli skill usage to the newer ospec skill name.

version: 5.1.0

author: OSpec Team

license: MIT



interface:

  display_name: "OSpec CLI"

  short_description: "Legacy alias for the OSpec skill"

  default_prompt: "Use $ospec to initialize this directory according to OSpec rules: init should end in change-ready state, reuse existing docs when available, ask for missing summary or tech stack in AI-assisted flows before falling back to placeholder docs, avoid assumed web templates when the project type is unclear, and do not create the first change automatically."

`,

            openaiYaml: `interface:

  display_name: "OSpec CLI"

  short_description: "Legacy alias for the OSpec skill"

  default_prompt: "Use $ospec to initialize this directory according to OSpec rules: init should end in change-ready state, reuse existing docs when available, ask for missing summary or tech stack in AI-assisted flows before falling back to placeholder docs, avoid assumed web templates when the project type is unclear, and do not create the first change automatically."

`,

        };

    }

    resolveTargetDir(provider, skillName, targetDir) {

        if (targetDir) {

            return targetDir;

        }

        return path_1.default.join(this.resolveProviderHome(provider), 'skills', skillName);

    }

    resolveProviderHome(provider) {

        const envHome = provider === 'claude'

            ? String(process.env.CLAUDE_HOME || '').trim()

            : String(process.env.CODEX_HOME || '').trim();

        if (envHome) {

            return path_1.default.resolve(envHome);

        }

        return provider === 'claude'

            ? path_1.default.join(os_1.default.homedir(), '.claude')

            : path_1.default.join(os_1.default.homedir(), '.codex');

    }

}

exports.SkillCommand = SkillCommand;

//# sourceMappingURL=SkillCommand.js.map
