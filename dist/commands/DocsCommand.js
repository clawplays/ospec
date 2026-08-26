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
exports.DocsCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const DocsBindingService_1 = require("../services/DocsBindingService");
const DocsMigrationService_1 = require("../services/DocsMigrationService");
const FeatureLocator_1 = require("../services/FeatureLocator");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const subcommandHelp_1 = require("../utils/subcommandHelp");
const BaseCommand_1 = require("./BaseCommand");
class DocsCommand extends BaseCommand_1.BaseCommand {
    async execute(action = 'status', projectPath, options = []) {
        try {
            if ((0, subcommandHelp_1.isHelpAction)(action)) {
                this.info((0, subcommandHelp_1.getDocsHelpText)());
                return;
            }
            const targetPath = projectPath || process.cwd();
            switch (action) {
                case 'locate': {
                    await this.locate(options);
                    break;
                }
                case 'obligations': {
                    await this.runObligations(targetPath, options);
                    break;
                }
                case 'confirm': {
                    await this.runConfirm(targetPath, options);
                    break;
                }
                case 'audit': {
                    await this.runAudit(targetPath, options);
                    break;
                }
                case 'coverage': {
                    await this.runCoverage(targetPath, options);
                    break;
                }
                case 'bind': {
                    await this.runBind(targetPath, options);
                    break;
                }
                case 'retire': {
                    await this.runRetire(targetPath, options);
                    break;
                }
                case 'migrate': {
                    await this.migrate(targetPath, options);
                    break;
                }
                case 'generate': {
                    const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
                    if (!structure.initialized) {
                        throw new Error('Project is not initialized. Run "ospec init" first.');
                    }
                    const result = await services_1.services.projectService.generateProjectKnowledge(targetPath);
                    console.log('\nProject Knowledge Synced');
                    console.log('======================\n');
                    console.log(`Project: ${result.projectName}`);
                    console.log(`Mode: ${result.mode}`);
                    console.log(`Created files: ${result.createdFiles.length}`);
                    console.log(`Refreshed files: ${result.refreshedFiles.length}`);
                    console.log(`Skipped existing files: ${result.skippedFiles.length}`);
                    console.log(`Direct-copy assets created: ${result.directCopyCreatedFiles.length}`);
                    console.log(`Hooks installed: ${result.hookInstalledFiles.length}`);
                    console.log(`Runtime-generated files: ${result.runtimeGeneratedFiles.join(', ') || '-'}`);
                    console.log('Purpose: refresh, repair, or backfill project knowledge docs after initialization');
                    console.log('Business scaffold: not applied by docs generate');
                    console.log('Bootstrap summary: not generated by docs generate');
                    if (result.firstChangeSuggestion) {
                        console.log(`Suggested first change: ${result.firstChangeSuggestion.name}`);
                    }
                    console.log('');
                    break;
                }
                case 'sync-protocol': {
                    const structure = await services_1.services.projectService.detectProjectStructure(targetPath);
                    if (!structure.initialized) {
                        throw new Error('Project is not initialized. Run "ospec init" first.');
                    }
                    const result = await services_1.services.projectService.syncProtocolGuidance(targetPath);
                    console.log('\nProtocol Guidance Synced');
                    console.log('========================\n');
                    console.log(`Project: ${result.projectName}`);
                    console.log(`Mode: ${result.mode}`);
                    console.log(`Document language: ${result.documentLanguage}`);
                    console.log(`Created files: ${result.createdFiles.length}`);
                    console.log(`Refreshed files: ${result.refreshedFiles.length}`);
                    console.log(`Skipped files: ${result.skippedFiles.length}`);
                    if (result.refreshedFiles.length > 0) {
                        console.log(`Refreshed: ${result.refreshedFiles.join(', ')}`);
                    }
                    if (result.createdFiles.length > 0) {
                        console.log(`Created: ${result.createdFiles.join(', ')}`);
                    }
                    console.log('Scope: protocol/AI guidance only; existing changes are not migrated.');
                    console.log('');
                    break;
                }
                case 'status': {
                    const docs = await services_1.services.projectService.getDocsStatus(targetPath);
                    console.log('\nDocs Status');
                    console.log('===========\n');
                    console.log(`Coverage: ${docs.coverage}% (${docs.existing}/${docs.total})`);
                    console.log(`Updated: ${docs.updatedAt ?? 'unknown'}`);
                    console.log('\nTracked docs:');
                    for (const item of docs.items) {
                        console.log(`  ${item.exists ? '✓' : '✗'} ${item.path}`);
                    }
                    if (docs.apiDocs.length > 0) {
                        console.log('\nAPI docs:');
                        for (const item of docs.apiDocs) {
                            console.log(`  ✓ ${item.path}`);
                        }
                    }
                    if (docs.designDocs.length > 0) {
                        console.log('\nDesign docs:');
                        for (const item of docs.designDocs) {
                            console.log(`  ✓ ${item.path}`);
                        }
                    }
                    if (docs.planningDocs.length > 0) {
                        console.log('\nPlanning docs:');
                        for (const item of docs.planningDocs) {
                            console.log(`  ✓ ${item.path}`);
                        }
                    }
                    if (docs.missingRequired.length > 0) {
                        console.log('\nMissing required docs:');
                        for (const item of docs.missingRequired) {
                            console.log(`  - ${item}`);
                        }
                    }
                    if (docs.missingRecommended.length > 0) {
                        console.log('\nMissing recommended docs:');
                        for (const item of docs.missingRecommended) {
                            console.log(`  - ${item}`);
                        }
                    }
                    console.log('');
                    break;
                }
                default:
                    this.info((0, subcommandHelp_1.getDocsHelpText)());
            }
        }
        catch (error) {
            this.error(`Docs command failed: ${error}`);
            throw error;
        }
    }
    /**
     * 7.3 `ospec docs locate`. Answers "which section describes this?" with a
     * `path#heading`, a line range to read, and nothing else.
     *
     * The output budget is HARD: <= 200 tokens, measured, for every branch
     * including a multi-hit. A locator that costs more than the section it
     * saves is worse than no locator, so every line here earns its place --
     * `--json` is emitted unindented for the same reason (indentation was ~86%
     * of a previously measured payload in this repository).
     */
    async locate(rawArgs) {
        let feature = null;
        let affects = null;
        let json = false;
        let limit = 5;
        let targetPath = process.cwd();
        const takeValue = (flag, inline, next) => {
            if (inline !== null) {
                if (!inline)
                    throw new Error(`${flag} requires a value`);
                return { value: inline, consumed: false };
            }
            if (!next || next.startsWith('--'))
                throw new Error(`${flag} requires a value`);
            return { value: next, consumed: true };
        };
        for (let index = 0; index < rawArgs.length; index += 1) {
            const arg = rawArgs[index];
            if (arg === 'locate')
                continue;
            const [flag, ...rest] = arg.startsWith('--') && arg.includes('=')
                ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
                : [arg];
            const inline = rest.length > 0 ? rest[0] : null;
            if (flag === '--json') {
                json = true;
                continue;
            }
            if (flag === '--feature') {
                const taken = takeValue('--feature', inline, rawArgs[index + 1]);
                feature = taken.value;
                if (taken.consumed)
                    index += 1;
                continue;
            }
            if (flag === '--affects') {
                const taken = takeValue('--affects', inline, rawArgs[index + 1]);
                affects = taken.value;
                if (taken.consumed)
                    index += 1;
                continue;
            }
            if (flag === '--path') {
                const taken = takeValue('--path', inline, rawArgs[index + 1]);
                targetPath = taken.value;
                if (taken.consumed)
                    index += 1;
                continue;
            }
            if (flag === '--limit') {
                const taken = takeValue('--limit', inline, rawArgs[index + 1]);
                const value = Number(taken.value);
                if (!Number.isInteger(value) || value < 1)
                    throw new Error('--limit requires a positive integer');
                limit = value;
                if (taken.consumed)
                    index += 1;
                continue;
            }
            if (flag.startsWith('--'))
                throw new Error(`Unknown docs locate flag: ${flag}`);
            throw new Error('Usage: ospec docs locate --feature <slug> | --affects <path> [--path <dir>] [--limit N] [--json]');
        }
        if (!feature && !affects) {
            throw new Error('Usage: ospec docs locate --feature <slug> | --affects <path> [--path <dir>] [--limit N] [--json]');
        }
        if (feature && affects) {
            throw new Error('ospec docs locate takes --feature or --affects, not both.');
        }
        const status = await services_1.services.projectService.getIndexStatus(targetPath);
        if (!status.exists) {
            throw new Error(`SKILL.index.json not found at ${status.path}; run "ospec index build" first.`);
        }
        const raw = await services_1.services.fileService.readFile(status.path);
        const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
        const query = feature ? { feature } : { affects: affects };
        const result = feature
            ? (0, FeatureLocator_1.locateByFeature)(index, feature)
            : (0, FeatureLocator_1.locateByAffects)(index, affects);
        const selected = result.matches.slice(0, limit);
        await this.attachReadRanges(targetPath, selected);
        if (json) {
            // Unindented on purpose: this command's whole value is that its
            // answer is cheaper than the scan it replaces.
            console.log(JSON.stringify({
                version: '1.0',
                query,
                totalMatches: result.matches.length,
                matches: selected.map(entry => ({
                    slug: entry.slug,
                    kind: entry.kind ?? 'feature',
                    file: entry.file,
                    heading: entry.heading,
                    location: `${entry.file}#${entry.heading}`,
                    lines: entry.lines ?? null,
                    chars: [entry.start, entry.end],
                    bytes: entry.bytes ?? null,
                    code: entry.code,
                    matched_prefix: entry.matched_prefix ?? null,
                    last_change: entry.last_change ?? null,
                })),
                candidates: result.candidates,
            }));
            return;
        }
        if (selected.length === 0) {
            const subject = feature ? `feature "${feature}"` : `path ${affects}`;
            console.log(`no feature document for ${subject}`);
            if (result.candidates.length > 0) {
                console.log(`closest: ${result.candidates.map(item => `${item.slug} (${item.file}#${item.heading})`).join('; ')}`);
            }
            else {
                console.log('no near candidates; run "ospec index query <keyword>" or declare one with <!-- ospec:feature <slug> -->');
            }
            return;
        }
        if (result.matches.length > selected.length) {
            console.log(`${result.matches.length} matches, showing ${selected.length} (most specific first; --limit for more)`);
        }
        for (const entry of selected) {
            console.log(`${entry.file}#${entry.heading}`);
            const range = entry.lines
                ? `read lines ${entry.lines[0]}-${entry.lines[1]} (${entry.bytes} B)`
                : `read chars ${entry.start}-${entry.end} (file unreadable; index may be stale)`;
            const via = entry.matched_prefix ? ` via ${entry.matched_prefix}` : '';
            // The kind tells the reader what CONTRACT the section carries --
            // behaviour (feature), interface (api), decision (design) -- so it
            // is only worth a token when it is not the default.
            const kind = entry.kind && entry.kind !== 'feature' ? ` [${entry.kind}]` : '';
            console.log(`  ${entry.slug}${kind} | ${range}${via}`);
            if (entry.last_change)
                console.log(`  last-change ${entry.last_change}`);
        }
    }
    /**
     * Line ranges come from the document, not the index: the index stores
     * character offsets into a normalised body (contract 4) and no reader
     * tool takes those. An unreadable document degrades to the character
     * range rather than to a guess.
     */
    async attachReadRanges(projectRoot, matches) {
        const cache = new Map();
        for (const entry of matches) {
            const file = String(entry.file || '');
            if (!file)
                continue;
            if (!cache.has(file)) {
                const absolute = path.join(projectRoot, ...file.split('/'));
                cache.set(file, await services_1.services.fileService.readFile(absolute).catch(() => null));
            }
            const content = cache.get(file);
            if (!content)
                continue;
            const located = (0, FeatureLocator_1.locateLines)(content, entry);
            if (!located)
                continue;
            entry.lines = located.lines;
            entry.bytes = located.bytes;
        }
    }
    /**
     * `ospec docs obligations [change-path] [--apply] [--json]`
     *
     * Read-only unless `--apply`. Generating and showing without writing is the
     * default because the obligation list changes what the archive gate checks,
     * and an operator should be able to see it before it takes effect.
     */
    async runObligations(inputPath, options) {
        const apply = options.includes('--apply');
        const asJson = options.includes('--json');
        const { projectRoot, changeDir } = await this.resolveChange(inputPath);
        const config = await services_1.services.configManager.loadConfigOrNull(projectRoot);
        const result = await services_1.services.docsObligationPlanner.plan(projectRoot, changeDir, { apply, config });
        if (asJson) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nDocumentation Obligations');
        console.log('=========================\n');
        console.log(`Change: ${path.basename(changeDir)}`);
        console.log(`Change type: ${result.changeType || '(unset)'}`);
        console.log(`Features: ${result.features.join(', ') || 'none'}${result.features_via_affects.length > 0
            ? ' (resolved from affects via code: declarations; confirm them in proposal.md features:)'
            : ''}`);
        console.log(`Contract mode: ${result.mode}${result.mode === 'warn' ? ' (unmet obligations warn; they do not block archiving)' : ' (unmet required obligations block archiving)'}`);
        console.log(`Obligations: ${result.obligations.length}\n`);
        for (const obligation of result.obligations) {
            console.log(`  ${obligation.id}  [${obligation.level}] ${obligation.kind}`);
            console.log(`    target: ${obligation.target}`);
            console.log(`    ${obligation.reason}`);
            if (obligation.suggestion)
                console.log(`    ${obligation.suggestion}`);
            if (obligation.verification_only) {
                console.log(`    No edit needed? ospec docs confirm --id ${obligation.id}`);
            }
        }
        if (result.obligations.length === 0) {
            console.log('  None. This change type generates no documentation obligation,');
            console.log('  or it declares no features. Neither blocks archiving.');
        }
        console.log(apply
            ? `\nWritten: ${result.written.join(', ') || 'nothing (no writable surface found)'}`
            : '\nDry run. Re-run with --apply to record these and inject them into the change.');
        console.log('');
    }
    /**
     * `ospec docs confirm [change-path] --id <obligation-id> [--note "..."]`
     *
     * The `verified_unchanged` path: a refactor that genuinely changed no
     * documented behaviour records that fact instead of making a cosmetic edit.
     */
    async runConfirm(inputPath, options) {
        const readOption = (flag) => {
            const index = options.indexOf(flag);
            if (index >= 0 && options[index + 1] && !options[index + 1].startsWith('--')) {
                return options[index + 1];
            }
            const inline = options.find(item => item.startsWith(`${flag}=`));
            return inline ? inline.slice(flag.length + 1) : undefined;
        };
        const id = readOption('--id');
        if (!id) {
            throw new Error('ospec docs confirm requires --id <obligation-id>. Run "ospec docs obligations" to list them.');
        }
        const { changeDir } = await this.resolveChange(inputPath);
        const result = await services_1.services.docsObligationPlanner.confirmUnchanged(changeDir, id, readOption('--note'));
        if (!result.ok)
            throw new Error(result.message);
        this.success(result.message);
    }
    /**
     * `ospec docs audit [path] [--json]` -- 7.8 drift detection. Read-only.
     *
     * Exit status stays 0 even when drift is found: this is a report people and
     * AIs are meant to run periodically, not a gate. Making it non-zero would
     * put it in CI, where a slowly-drifting document would block unrelated work.
     */
    async runAudit(projectPath, options) {
        const targetPath = path.resolve(projectPath);
        const config = await services_1.services.configManager.loadConfigOrNull(targetPath);
        if (options.includes('--stale')) {
            const staleResult = await services_1.services.docsAuditService.stale(targetPath, config);
            if (options.includes('--json')) {
                console.log(JSON.stringify(staleResult, null, 2));
                return;
            }
            console.log('\nDocumentation Staleness Audit');
            console.log('=============================\n');
            if (!staleResult.available) {
                console.log(staleResult.reason);
                console.log('');
                return;
            }
            console.log(`Bindings and documents scanned: ${staleResult.scanned}`);
            console.log(`Stale signals: ${staleResult.stale.length}\n`);
            for (const entry of staleResult.stale) {
                const target = entry.heading ? `${entry.file}#${entry.heading}` : entry.file;
                console.log(`  [${entry.signal}] ${target}`);
                console.log(`    ${entry.detail}`);
            }
            if (staleResult.stale.length === 0) {
                console.log('  No stale signals: no dead bindings, no unmarked superseded decisions, no deprecated documents queued.');
            }
            else {
                console.log('\nNext: mark dead documents "status: deprecated" (plus superseded_by when a');
                console.log('successor exists), then run "ospec docs retire" to collect them.');
            }
            console.log('');
            return;
        }
        const result = await services_1.services.docsAuditService.audit(targetPath, config);
        if (options.includes('--json')) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nDocumentation Drift Audit');
        console.log('=========================\n');
        if (!result.available) {
            console.log(result.reason);
            console.log('');
            return;
        }
        console.log(`Features scanned: ${result.scanned}`);
        console.log(`Drifted: ${result.drifted.length}`);
        console.log(`Not examined: ${result.skipped.length}\n`);
        for (const entry of result.drifted) {
            // The kind tells the reader what kind of contract drifted --
            // behaviour, interface or decision -- worth a token only when it
            // is not the default.
            const kind = entry.kind && entry.kind !== 'feature' ? ` [${entry.kind}]` : '';
            console.log(`  ${entry.target}${kind}`);
            console.log(`    ${entry.summary}`);
        }
        if (result.drifted.length === 0 && result.scanned > 0) {
            // Never claim more than was actually examined. "No drift" alongside
            // "Not examined: 1" would read as a clean bill of health for a
            // feature this command never compared.
            const examined = result.scanned - result.skipped.length;
            console.log(examined === result.scanned
                ? '  No drift: every feature with code: paths and a traceability comment is current.'
                : `  No drift among the ${examined} feature(s) that could be compared. The rest were not examined -- see below.`);
        }
        if (result.skipped.length > 0) {
            // Printed, never folded into "clean". A feature that could not be
            // examined is not a feature that passed.
            console.log('\n  Not examined:');
            for (const entry of result.skipped) {
                console.log(`    ${entry.slug}: ${entry.reason}`);
            }
        }
        console.log('');
    }
    /**
     * Resolve `[change-path]` the same way `ospec execute` and `ospec loop` do:
     * an explicit path, else the single active change. Refusing to guess
     * between several active changes is deliberate.
     */
    async resolveChange(inputPath) {
        const resolved = path.resolve(inputPath);
        if (await services_1.services.fileService.exists(path.join(resolved, 'state.json'))) {
            return { projectRoot: await this.findProjectRoot(resolved), changeDir: resolved };
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(resolved);
        if (activeNames.length === 0) {
            throw new Error('No active change found. Pass a change path, or run from a project with one active change.');
        }
        if (activeNames.length > 1) {
            throw new Error(`Multiple active changes found: ${activeNames.join(', ')}. Pass one change path explicitly.`);
        }
        const config = await services_1.services.configManager.loadConfigOrNull(resolved);
        return {
            projectRoot: resolved,
            changeDir: (0, ProjectLayout_1.resolveManagedPath)(resolved, `${constants_1.DIR_NAMES.CHANGES}/${constants_1.DIR_NAMES.ACTIVE}/${activeNames[0]}`, config),
        };
    }
    async findProjectRoot(changeDir) {
        let current = changeDir;
        for (let depth = 0; depth < 8; depth += 1) {
            const parent = path.dirname(current);
            if (parent === current)
                break;
            current = parent;
            if (await services_1.services.fileService.exists(path.join(current, '.skillrc')))
                return current;
        }
        return path.resolve(changeDir, '..', '..', '..');
    }
    /**
     * 7.9. Four phases, and the flags are the phase selector rather than a
     * mode: `--plan`, `--verify`, `--finalize`. Nothing writes without
     * `--apply`, and `--finalize --apply` is the only thing that deletes.
     */
    /**
     * `ospec docs coverage [path] [--json]`. The inverse of `docs audit`:
     * which code areas have no binding at all, ordered as a work list --
     * busiest undocumented areas first. Read-only, never fails the build.
     */
    async runCoverage(projectRoot, options) {
        const json = options.includes('--json');
        const result = await DocsBindingService_1.docsBindingService.coverage(projectRoot);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nDocumentation Coverage');
        console.log('======================\n');
        if (!result.available) {
            console.log(`Not available: ${result.reason}`);
            console.log('');
            return;
        }
        console.log(`Code areas: ${result.areas.length}`);
        console.log(`Bound code prefixes: ${result.bound_prefixes}`);
        console.log(`Uncovered: ${result.uncovered}`);
        if (result.accepted > 0)
            console.log(`Accepted as uncovered: ${result.accepted}`);
        const uncovered = result.areas.filter(area => !area.covered && !area.accepted);
        if (uncovered.length > 0) {
            console.log('\nUncovered areas (busiest undocumented first):');
            for (const area of uncovered) {
                const evidence = area.archive_count > 0
                    ? ` — ${area.archive_count} archived change(s), ${area.undocumented_count} with no doc update${area.archives.length > 0 ? ` (e.g. ${area.archives.join(', ')})` : ''}`
                    : '';
                console.log(`  ${area.area} [${area.source}]${evidence}`);
            }
            console.log('\nNext: "ospec docs bind --plan --apply" proposes bindings and draft documents for these.');
        }
        else {
            console.log('\nEvery enumerated code area is covered by at least one binding.');
        }
        console.log('');
    }
    /**
     * `ospec docs bind [path] [--plan|--execute|--verify] [--apply] [--json]`.
     * The staged onboarding pipeline: plan (engine) -> adjudicate (person) ->
     * execute (engine, mechanical) -> verify (gate). Prose is never written by
     * the engine; declarations and draft skeletons are.
     */
    async runBind(projectRoot, options) {
        const apply = options.includes('--apply');
        const json = options.includes('--json');
        const stage = options.includes('--verify')
            ? 'verify'
            : options.includes('--execute')
                ? 'execute'
                : 'plan';
        if (stage === 'plan') {
            const result = await DocsBindingService_1.docsBindingService.plan(projectRoot, {
                apply,
                git: !options.includes('--no-git'),
            });
            if (json) {
                console.log(JSON.stringify({ ...result.plan, writes: result.writes }, null, 2));
                return;
            }
            console.log('\nDocs Binding — Stage 1: plan');
            console.log('============================\n');
            console.log(`Unbound documents: ${result.plan.entries.length}`);
            console.log(`Uncovered code areas: ${result.plan.missing.length}`);
            if (result.preserved > 0) {
                console.log(`Carried your adjudications forward for ${result.preserved} entr(ies).`);
            }
            const pending = result.plan.entries.filter(entry => entry.verdict === 'pending').length;
            const missingPending = result.plan.missing.filter(item => item.verdict === 'pending').length;
            console.log(`Awaiting a verdict: ${pending} document(s), ${missingPending} area(s)`);
            console.log('');
            console.log(apply ? 'Wrote:' : 'Would write (re-run with --apply):');
            for (const target of (apply ? result.writes : [DocsBindingService_1.BINDING_PLAN_FILE]))
                console.log(`  ${target}`);
            console.log('');
            console.log(`Next: set each entry's verdict in ${DocsBindingService_1.BINDING_PLAN_FILE} (bind / reference /`);
            console.log('historical; create / uncovered_accepted for areas), adjust slugs and code');
            console.log('paths, then run "ospec docs bind --execute --apply".');
            console.log('');
            return;
        }
        if (stage === 'execute') {
            const result = await DocsBindingService_1.docsBindingService.execute(projectRoot, { apply });
            if (json) {
                console.log(JSON.stringify(result, null, 2));
                return;
            }
            console.log('\nDocs Binding — Stage 3: execute');
            console.log('===============================\n');
            console.log(`${apply ? 'Declared' : 'Would declare'} ${result.declared.length} binding(s):`);
            for (const item of result.declared)
                console.log(`  ${item.file} <- ospec:doc ${item.slug}`);
            console.log(`${apply ? 'Drafted' : 'Would draft'} ${result.drafted.length} skeleton(s):`);
            for (const item of result.drafted)
                console.log(`  ${item.file} <- ospec:doc ${item.slug}`);
            if (result.skipped.length > 0) {
                console.log('\nSkipped:');
                for (const item of result.skipped)
                    console.log(`  ${item.file}: ${item.reason}`);
            }
            console.log('');
            if (apply)
                console.log('Index rebuilt. Next: "ospec docs bind --verify".');
            else
                console.log('Dry run; re-run with --apply to write.');
            console.log('');
            return;
        }
        const result = await DocsBindingService_1.docsBindingService.verify(projectRoot);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nDocs Binding — Stage 4: verify');
        console.log('==============================\n');
        console.log(`Plan entries: ${result.checked.entries} document(s), ${result.checked.missing} area(s)`);
        console.log('');
        if (result.ok) {
            console.log('PASS — every entry is adjudicated and applied.');
            console.log('');
            return;
        }
        console.log(`REFUSED — ${result.gaps.length} gap(s):`);
        for (const gap of result.gaps)
            console.log(`  [${gap.kind}] ${gap.detail}`);
        console.log('');
        throw new Error(`Docs binding verification refused: ${result.gaps.length} gap(s) remain.`);
    }
    /**
     * `ospec docs retire [path] [--apply] [--json]`. Collects every document
     * marked `status: deprecated`, prints the list, and -- only with --apply
     * -- records a manifest row and moves each file into
     * `changes/archived/retired-docs/`. Deletion always means archival here.
     */
    async runRetire(projectRoot, options) {
        const apply = options.includes('--apply');
        const json = options.includes('--json');
        const result = await DocsBindingService_1.docsRetireService.retire(projectRoot, { apply });
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log('\nDocs Retire');
        console.log('===========\n');
        // Printed before anything moved, which is the point.
        console.log(`${apply ? 'Retired' : 'Would retire'} ${result.retired.length} document(s):`);
        for (const entry of result.retired) {
            console.log(`  ${entry.file} -> ${entry.to}${entry.superseded_by ? `  (superseded by ${entry.superseded_by})` : ''}`);
        }
        if (result.refused.length > 0) {
            console.log('\nRefused:');
            for (const entry of result.refused)
                console.log(`  ${entry.file}: ${entry.reason}`);
        }
        console.log('');
        if (apply && result.retired.length > 0) {
            console.log('Recorded in the retired-docs manifest before moving. Index rebuilt;');
            console.log('the documents map, catalogue and docs map no longer list them.');
        }
        else if (!apply) {
            console.log('Dry run; re-run with --apply to record the manifest and move the files.');
            console.log('Mark a document with frontmatter "status: deprecated" to queue it here.');
        }
        console.log('');
    }
    async migrate(projectRoot, options) {
        const apply = options.includes('--apply');
        const phase = options.includes('--finalize')
            ? 'finalize'
            : options.includes('--verify')
                ? 'verify'
                : 'plan';
        if (phase === 'plan') {
            const result = await DocsMigrationService_1.docsMigrationService.plan(projectRoot, { apply });
            const { plan } = result;
            console.log('\nDocs Migration — Phase 1: plan');
            console.log('==============================\n');
            console.log(`Legacy knowledge documents: ${plan.legacy.knowledge_documents.length}`);
            console.log(`Generated feature index:    ${plan.legacy.feature_index || '-'}`);
            console.log(`Archived changes:           ${plan.archives.length}`);
            console.log(`Candidate feature groups:   ${plan.groups.length}`);
            console.log('');
            for (const group of plan.groups) {
                console.log(`  ${group.domain} -> ${group.document} (${group.archives.length} change(s))`);
            }
            if (plan.unclassified.length > 0) {
                console.log('');
                console.log(`Could not be classified (${plan.unclassified.length}) — group these by hand in the plan file:`);
                for (const archive of plan.unclassified)
                    console.log(`  ${archive}`);
            }
            if (result.preserved.length > 0) {
                console.log('');
                console.log(`Carried your edits forward for ${result.preserved.length} archive(s): ${result.preserved.join(', ')}`);
            }
            console.log('');
            console.log(apply ? 'Wrote:' : 'Would write (re-run with --apply):');
            for (const target of result.writes)
                console.log(`  ${target}`);
            console.log('');
            console.log('Next: rewrite each draft section as a behaviour description, add its');
            console.log('<!-- ospec:feature <slug> code:<paths> --> declaration, delete the draft');
            console.log('markers, then run "ospec docs migrate --verify".');
            console.log('');
            return;
        }
        if (phase === 'verify') {
            const result = await DocsMigrationService_1.docsMigrationService.verify(projectRoot);
            console.log('\nDocs Migration — Phase 3: verify');
            console.log('================================\n');
            console.log(`Archives with a legacy document: ${result.checked.archives}`);
            console.log(`  mapped to a feature section:   ${result.checked.mapped}`);
            console.log(`  marked historical:             ${result.checked.historical}`);
            console.log(`Feature declarations found:      ${result.checked.features}`);
            console.log('');
            if (result.ok) {
                console.log('PASS — every old knowledge document is accounted for.');
                console.log('Next: "ospec docs migrate --finalize" to preview the deletion.');
                console.log('');
                return;
            }
            console.log(`REFUSED — ${result.gaps.length} gap(s):`);
            for (const gap of result.gaps)
                console.log(`  [${gap.kind}] ${gap.detail}`);
            console.log('');
            console.log('Nothing will be deleted until every gap above is closed.');
            console.log('');
            // A gate that reports failure through stdout only is a gate no
            // script can act on.
            throw new Error(`Docs migration verification refused: ${result.gaps.length} gap(s) remain.`);
        }
        const result = await DocsMigrationService_1.docsMigrationService.finalize(projectRoot, { apply });
        console.log('\nDocs Migration — Phase 4: finalize');
        console.log('==================================\n');
        // Printed before the deletion happened, which is the point.
        console.log(`${apply ? 'Deleted' : 'Would delete'} ${result.deleted.length} file(s):`);
        for (const target of result.deleted)
            console.log(`  ${target}`);
        if (result.kept.length > 0) {
            console.log('');
            console.log(`Kept ${result.kept.length} file(s):`);
            for (const target of result.kept)
                console.log(`  ${target}`);
        }
        if (result.notes.length > 0) {
            console.log('');
            for (const note of result.notes)
                console.log(`  note: ${note}`);
        }
        console.log('');
        if (result.applied) {
            console.log('Recorded in .ospec/docs-migration.json before deleting. Index rebuilt.');
            console.log('"ospec changes show <archive>" and "ospec index query" still serve every');
            console.log('archive above — only the carrier changed.');
        }
        console.log('');
    }
}
exports.DocsCommand = DocsCommand;
