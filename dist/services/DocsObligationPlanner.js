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
exports.DocsObligationPlanner = void 0;
exports.obligationDocumentPath = obligationDocumentPath;
exports.createDocsObligationPlanner = createDocsObligationPlanner;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const helpers_1 = require("../utils/helpers");
const DocsObligationService_1 = require("./DocsObligationService");
/**
 * The `documentation_updates` gate stores PATHS, not `path#section`: it
 * resolves each entry on the filesystem and hashes it. Injecting a fragment
 * would make every entry an unsafe path and fail the change for a reason that
 * has nothing to do with documentation. The section half travels in the
 * obligation record, which is where the AI reads it from.
 */
function obligationDocumentPath(obligation) {
    return obligation.path;
}
class DocsObligationPlanner {
    constructor(fileService, obligations, capture) {
        this.fileService = fileService;
        this.obligations = obligations;
        this.capture = capture;
    }
    /**
     * Generate this change's obligations from its proposal, stamp each with its
     * planning-time baseline, and (when `apply`) write the record plus both
     * delivery surfaces.
     */
    async plan(projectRoot, featureDir, options = {}) {
        const config = options.config ?? null;
        const proposalPath = path.join(featureDir, constants_1.FILE_NAMES.PROPOSAL);
        const statePath = path.join(featureDir, constants_1.FILE_NAMES.STATE);
        const mode = config?.docs_contract?.mode === 'strict' ? 'strict' : 'warn';
        let changeType = '';
        let proposalFeatures = [];
        let proposalAffects = [];
        if (await this.fileService.exists(proposalPath)) {
            const proposal = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
            changeType = String(proposal.data?.change_type || '').trim().toLowerCase();
            proposalFeatures = Array.isArray(proposal.data?.features)
                ? proposal.data.features.map((slug) => String(slug || '').trim()).filter(Boolean)
                : [];
            proposalAffects = Array.isArray(proposal.data?.affects)
                ? proposal.data.affects.map((entry) => String(entry || '').trim()).filter(Boolean)
                : [];
        }
        let stateFeatures = [];
        let changeName = path.basename(featureDir);
        let existing = [];
        if (await this.fileService.exists(statePath)) {
            const state = await this.fileService.readJSON(statePath);
            stateFeatures = Array.isArray(state?.features)
                ? state.features.map((slug) => String(slug || '').trim()).filter(Boolean)
                : [];
            if (typeof state?.feature === 'string' && state.feature.trim())
                changeName = state.feature.trim();
            existing = Array.isArray(state?.docs_obligations) ? state.docs_obligations : [];
        }
        // Union, exactly as the index does when it archives the change.
        const declared = Array.from(new Set([...proposalFeatures, ...stateFeatures])).sort();
        const featureDocs = await this.capture.readFeatureDocs(projectRoot, config);
        // The affects fallback. Only when NOTHING was declared: a declared list is
        // the AI's confirmed statement and adding to it silently would create
        // obligations nobody agreed to. An empty list plus an `affects` that lands
        // inside a documented feature, though, is the forgotten-confirmation case,
        // and degrading to optional there let the whole contract go unenforced.
        const viaAffects = declared.length === 0
            ? (0, DocsObligationService_1.resolveFeaturesFromAffects)(proposalAffects, featureDocs)
            : [];
        const features = declared.length > 0 ? declared : viaAffects;
        const generated = this.obligations.generate({
            changeType,
            features,
            featureDocs,
            changeName,
            language: config?.documentLanguage,
        });
        const stamped = this.carryForward(existing, await this.obligations.captureBaselines(projectRoot, generated));
        const written = [];
        if (options.apply) {
            if (await this.fileService.exists(statePath)) {
                const state = await this.fileService.readJSON(statePath);
                state.docs_obligations = stamped;
                state.last_updated = new Date().toISOString();
                await this.fileService.writeJSON(statePath, state);
                written.push(path.relative(projectRoot, statePath).replace(/\\/g, '/'));
            }
            const taskGraph = await this.injectIntoTaskGraph(projectRoot, featureDir, stamped);
            if (taskGraph)
                written.push(taskGraph);
            const tasks = await this.injectIntoClassicChecklist(projectRoot, featureDir, stamped);
            if (tasks)
                written.push(tasks);
        }
        return { changeType, obligations: stamped, features, features_via_affects: viaAffects, written, mode };
    }
    /**
     * Keep the ORIGINAL baseline and any recorded evidence for an obligation that
     * this run regenerated unchanged (same target, same kind).
     *
     * Without this, re-running `--apply` re-baselines against the CURRENT
     * document, and both failure directions are real:
     *
     *  - run it after doing the documentation work and the new baseline equals
     *    the finished text, so the obligation can never be satisfied without a
     *    second, pointless edit;
     *  - run it after `ospec docs confirm` and the recorded `verified_unchanged`
     *    is silently dropped, so a refactor that was properly confirmed starts
     *    failing again with no explanation.
     *
     * Re-planning should decide WHICH obligations exist, not erase what is
     * already known about the ones that survive. An obligation whose kind or
     * target changed is genuinely a different obligation and is re-baselined.
     */
    carryForward(existing, generated) {
        if (existing.length === 0)
            return generated;
        const key = (item) => `${item.kind} ${item.target}`;
        const previous = new Map(existing.map(item => [key(item), item]));
        return generated.map(item => {
            const prior = previous.get(key(item));
            if (!prior)
                return item;
            return {
                ...item,
                ...(prior.baseline ? { baseline: prior.baseline } : {}),
                ...(prior.evidence ? { evidence: prior.evidence } : {}),
            };
        });
    }
    /**
     * Goal delivery. Appends the obligation's document to every task that already
     * declares `documentation_updates`, or -- when no task does -- to the LAST
     * task, so the obligation lands somewhere a worker will see it rather than
     * being silently dropped.
     */
    async injectIntoTaskGraph(projectRoot, featureDir, obligations) {
        const graphPath = path.join(featureDir, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.TASK_GRAPH);
        if (obligations.length === 0 || !(await this.fileService.exists(graphPath)))
            return null;
        let graph;
        try {
            graph = await this.fileService.readJSON(graphPath);
        }
        catch {
            return null;
        }
        const tasks = Array.isArray(graph?.tasks) ? graph.tasks : [];
        if (tasks.length === 0)
            return null;
        // Only REQUIRED obligations are injected as contract entries. An optional
        // one is a suggestion; making it a gate entry would defeat its own point.
        const documents = Array.from(new Set(obligations.filter(item => item.level === 'required').map(obligationDocumentPath).filter(Boolean)));
        if (documents.length === 0)
            return null;
        const carriers = tasks.filter((task) => Array.isArray(task?.documentation_updates));
        const targets = carriers.length > 0 ? carriers : [tasks[tasks.length - 1]];
        for (const task of targets) {
            const updates = new Set([
                ...(Array.isArray(task.documentation_updates) ? task.documentation_updates : []),
                ...documents,
            ]);
            task.documentation_updates = Array.from(updates).sort();
            // The existing gate fails an update that is not also a target file, so
            // the pairing is written here rather than left for the worker to notice.
            const targetFiles = new Set([
                ...(Array.isArray(task.target_files) ? task.target_files : []),
                ...documents,
            ]);
            task.target_files = Array.from(targetFiles).sort();
        }
        await this.fileService.writeJSON(graphPath, graph);
        return path.relative(projectRoot, graphPath).replace(/\\/g, '/');
    }
    /**
     * Classic delivery. Replaces the managed block in `tasks.md` in place, so
     * running the planner twice does not accumulate duplicate checklist items --
     * the same idempotence rule 7.7 applies to the traceability comment.
     */
    async injectIntoClassicChecklist(projectRoot, featureDir, obligations) {
        const tasksPath = path.join(featureDir, constants_1.FILE_NAMES.TASKS);
        if (obligations.length === 0 || !(await this.fileService.exists(tasksPath)))
            return null;
        const begin = '<!-- ospec:docs-obligations:begin -->';
        const end = '<!-- ospec:docs-obligations:end -->';
        const lines = [
            begin,
            '',
            '### Documentation obligations',
            '',
            ...obligations.map(item => `- [ ] ${item.target}${item.level === 'optional' ? ' _(optional)_' : ''} — ${item.reason}`
                + (item.suggestion ? `\n      ${item.suggestion}` : '')
                + (item.verification_only
                    ? `\n      No edit needed? Record it: ospec docs confirm --id ${item.id}`
                    : '')),
            '',
            end,
        ].join('\n');
        const original = await this.fileService.readFile(tasksPath);
        const blockPattern = new RegExp(`${begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
        const updated = blockPattern.test(original)
            ? original.replace(blockPattern, lines)
            : `${original.replace(/\s*$/, '')}\n\n${lines}\n`;
        if (updated === original)
            return null;
        await this.fileService.writeFile(tasksPath, updated);
        return path.relative(projectRoot, tasksPath).replace(/\\/g, '/');
    }
    /**
     * Record the explicit "I looked and it is still accurate" confirmation for a
     * verification-type obligation.
     *
     * Refuses on any other kind, loudly. Accepting it everywhere would turn every
     * obligation into a self-certified one, which is the same shape as a gate
     * that passes because nothing was checked.
     */
    async confirmUnchanged(featureDir, obligationId, note) {
        const statePath = path.join(featureDir, constants_1.FILE_NAMES.STATE);
        if (!(await this.fileService.exists(statePath))) {
            return { ok: false, message: 'This change has no state.json, so it has no obligations to confirm.' };
        }
        const state = await this.fileService.readJSON(statePath);
        const obligations = Array.isArray(state?.docs_obligations) ? state.docs_obligations : [];
        const obligation = obligations.find(item => item.id === obligationId);
        if (!obligation) {
            return {
                ok: false,
                message: obligations.length === 0
                    ? 'This change has no documentation obligations. Run "ospec docs obligations --apply" first.'
                    : `No obligation with id ${obligationId}. Known ids: ${obligations.map(item => item.id).join(', ')}.`,
            };
        }
        if (!obligation.verification_only) {
            return {
                ok: false,
                message: `${obligationId} is a ${obligation.kind} obligation, not a verification-type one. `
                    + 'Zero diff plus a confirmation is only accepted where the behaviour genuinely did not change '
                    + `(refactor / perf). Edit ${obligation.target} instead.`,
            };
        }
        obligation.evidence = {
            ...(obligation.evidence ?? {}),
            verified_unchanged: true,
            confirmed_at: new Date().toISOString(),
            ...(note ? { note } : {}),
        };
        state.docs_obligations = obligations;
        state.last_updated = new Date().toISOString();
        await this.fileService.writeJSON(statePath, state);
        return { ok: true, message: `${obligationId} (${obligation.target}) recorded as verified_unchanged.` };
    }
}
exports.DocsObligationPlanner = DocsObligationPlanner;
function createDocsObligationPlanner(fileService, obligations, capture) {
    return new DocsObligationPlanner(fileService, obligations, capture);
}
