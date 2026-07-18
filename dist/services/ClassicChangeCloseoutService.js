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
exports.ClassicChangeCloseoutService = void 0;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const helpers_1 = require("../utils/helpers");
const CHANGE_TYPES = new Set(['bugfix', 'feature', 'maintenance', 'docs']);
const DOCUMENTATION_IMPACTS = new Set(['none', 'required']);
const REVIEW_DECISIONS = new Set([
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
    'NEEDS_CHANGES',
    'BLOCKED',
    'PENDING',
]);
const APPROVED_REVIEW_DECISIONS = new Set([
    'APPROVED',
    'APPROVED_WITH_CONCERNS',
]);
class ClassicChangeCloseoutService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async analyzeDocumentationContract(projectRoot, proposalPath) {
        if (!(await this.fileService.exists(proposalPath))) {
            return {
                changeType: '',
                impact: '',
                updates: [],
                archiveReady: false,
                checks: [
                    {
                        name: 'change.documentation_contract',
                        status: 'fail',
                        message: 'proposal.md is required before documentation impact can be assessed',
                    },
                ],
            };
        }
        let document;
        try {
            document = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(proposalPath));
        }
        catch (error) {
            return {
                changeType: '',
                impact: '',
                updates: [],
                archiveReady: false,
                checks: [
                    {
                        name: 'change.documentation_contract',
                        status: 'fail',
                        message: `proposal.md documentation contract cannot be parsed: ${error?.message || error}`,
                    },
                ],
            };
        }
        const changeType = String(document.data?.change_type || '')
            .trim()
            .toLowerCase();
        const impact = String(document.data?.documentation_impact || '')
            .trim()
            .toLowerCase();
        const reason = String(document.data?.documentation_reason || '').trim();
        const updates = Array.isArray(document.data?.documentation_updates)
            ? Array.from(new Set(document.data.documentation_updates
                .map((item) => String(item || '')
                .trim()
                .replace(/\\/g, '/')
                .replace(/^\.\//, ''))
                .filter(Boolean)))
            : [];
        const checks = [];
        const typeValid = CHANGE_TYPES.has(changeType);
        checks.push({
            name: 'change.change_type',
            status: typeValid ? 'pass' : 'fail',
            message: typeValid
                ? `Change type is ${changeType}`
                : 'proposal.md change_type must be bugfix, feature, maintenance, or docs',
        });
        const impactValid = DOCUMENTATION_IMPACTS.has(impact);
        checks.push({
            name: 'change.documentation_impact',
            status: impactValid ? 'pass' : 'fail',
            message: impactValid
                ? `Documentation impact is ${impact}`
                : 'proposal.md documentation_impact must be none or required',
        });
        const typeRequiresDocumentation = changeType === 'feature' || changeType === 'docs';
        const typeImpactValid = !typeRequiresDocumentation || impact === 'required';
        checks.push({
            name: 'change.documentation_policy',
            status: typeImpactValid ? 'pass' : 'fail',
            message: typeImpactValid
                ? typeRequiresDocumentation
                    ? `${changeType} changes require real documentation updates`
                    : `${changeType || 'unclassified'} changes may record no documentation impact when justified`
                : `${changeType} changes must set documentation_impact to required`,
        });
        const noneContractValid = impact !== 'none' || (updates.length === 0 && reason.length > 0);
        checks.push({
            name: 'change.documentation_none_reason',
            status: noneContractValid ? 'pass' : 'fail',
            message: noneContractValid
                ? impact === 'none'
                    ? 'No documentation impact is justified and no update paths are declared'
                    : 'Documentation updates are required'
                : impact === 'none' && updates.length > 0
                    ? 'documentation_updates must be empty when documentation_impact is none'
                    : 'documentation_reason is required when documentation_impact is none',
        });
        const requiredContractValid = impact !== 'required' || updates.length > 0;
        checks.push({
            name: 'change.documentation_updates',
            status: requiredContractValid ? 'pass' : 'fail',
            message: requiredContractValid
                ? impact === 'required'
                    ? `${updates.length} real documentation update path(s) declared`
                    : 'No documentation update paths are required'
                : 'documentation_updates must name at least one real project document when documentation_impact is required',
        });
        for (const update of updates) {
            const validation = await this.validateDocumentationPath(projectRoot, update);
            checks.push({
                name: `change.documentation_updates.${update}`,
                status: validation.ready ? 'pass' : 'fail',
                message: validation.message,
            });
        }
        return {
            changeType,
            impact,
            updates,
            archiveReady: checks.every(check => check.status !== 'fail'),
            checks,
        };
    }
    async analyzeReview(reviewPath) {
        if (!(await this.fileService.exists(reviewPath))) {
            return {
                decision: '',
                checklistComplete: false,
                archiveReady: false,
                checks: [
                    {
                        name: 'review.md',
                        status: 'fail',
                        message: 'review.md is required for classic change closeout',
                    },
                ],
            };
        }
        let document;
        try {
            document = (0, helpers_1.parseFrontmatterDocument)(await this.fileService.readFile(reviewPath));
        }
        catch (error) {
            return {
                decision: '',
                checklistComplete: false,
                archiveReady: false,
                checks: [
                    {
                        name: 'review.md',
                        status: 'fail',
                        message: `review.md cannot be parsed: ${error?.message || error}`,
                    },
                ],
            };
        }
        const decision = String(document.data?.decision || '')
            .trim()
            .toUpperCase();
        const decisionValid = REVIEW_DECISIONS.has(decision);
        const decisionApproved = APPROVED_REVIEW_DECISIONS.has(decision);
        const checklistMatches = Array.from(document.content.matchAll(/^\s*-\s+\[([ xX])\]\s+.+$/gm));
        const checklistComplete = checklistMatches.length > 0 &&
            checklistMatches.every(match => match[1].toLowerCase() === 'x');
        const checks = [
            {
                name: 'review.md.decision',
                status: decisionApproved
                    ? decision === 'APPROVED_WITH_CONCERNS'
                        ? 'warn'
                        : 'pass'
                    : 'fail',
                message: decisionValid
                    ? decisionApproved
                        ? `Classic change review decision is ${decision}`
                        : `Classic change review remains ${decision}`
                    : 'review.md decision must be APPROVED, APPROVED_WITH_CONCERNS, NEEDS_CHANGES, BLOCKED, or PENDING',
            },
            {
                name: 'review.md.checklist',
                status: checklistComplete ? 'pass' : 'fail',
                message: checklistComplete
                    ? 'Classic change review checklist is complete'
                    : 'review.md must contain a fully checked lightweight review checklist',
            },
        ];
        return {
            decision,
            checklistComplete,
            archiveReady: decisionApproved && checklistComplete,
            checks,
        };
    }
    async analyzePluginGates(changePath, activatedSteps, workflow) {
        const checks = [];
        if (activatedSteps.includes('stitch_design_review')) {
            const approvalPath = path.join(changePath, 'artifacts', 'stitch', 'approval.json');
            const exists = await this.fileService.exists(approvalPath);
            let approved = false;
            if (exists) {
                const approval = await this.fileService.readJSON(approvalPath);
                approved =
                    approval.step === 'stitch_design_review' &&
                        approval.status === 'approved' &&
                        typeof approval.preview_url === 'string' &&
                        approval.preview_url.trim().length > 0 &&
                        typeof approval.submitted_at === 'string' &&
                        approval.submitted_at.trim().length > 0;
            }
            checks.push({
                name: 'stitch.approval',
                status: approved ? 'pass' : 'fail',
                message: approved
                    ? 'Stitch design review is approved with complete evidence'
                    : 'Stitch design review approval with preview URL and submission timestamp is required',
            });
        }
        const checkpointSteps = activatedSteps.filter(step => step === 'checkpoint_ui_review' || step === 'checkpoint_flow_check');
        if (checkpointSteps.length > 0) {
            const checkpointDir = path.join(changePath, 'artifacts', 'checkpoint');
            const gatePath = path.join(checkpointDir, 'gate.json');
            const gateExists = await this.fileService.exists(gatePath);
            let ready = false;
            if (gateExists) {
                const gate = await this.fileService.readJSON(gatePath);
                ready =
                    gate.plugin === 'checkpoint' &&
                        gate.status === 'passed' &&
                        gate.evidence?.status === 'complete' &&
                        checkpointSteps.every(step => gate.steps?.[step]?.status === 'passed' &&
                            gate.evidence?.by_step?.[step]?.status === 'complete') &&
                        ((await this.fileService.exists(path.join(checkpointDir, 'result.json'))) ||
                            (await this.fileService.exists(path.join(checkpointDir, 'summary.md'))));
            }
            checks.push({
                name: 'checkpoint.gate',
                status: ready ? 'pass' : 'fail',
                message: ready
                    ? 'Checkpoint gate and evidence are complete'
                    : 'Checkpoint gate, per-step evidence, and result or summary are required',
            });
        }
        const externalCapabilities = workflow
            .getPluginCapabilities()
            .filter(capability => capability.plugin !== 'stitch' &&
            capability.plugin !== 'checkpoint' &&
            activatedSteps.includes(capability.step));
        const stepsByPlugin = new Map();
        for (const capability of externalCapabilities) {
            stepsByPlugin.set(capability.plugin, [
                ...(stepsByPlugin.get(capability.plugin) || []),
                capability.step,
            ]);
        }
        for (const [pluginName, pluginSteps] of stepsByPlugin) {
            const pluginDir = path.join(changePath, 'artifacts', pluginName);
            const gatePath = path.join(pluginDir, 'gate.json');
            const gateExists = await this.fileService.exists(gatePath);
            let ready = false;
            if (gateExists) {
                const gate = await this.fileService.readJSON(gatePath);
                ready =
                    gate.plugin === pluginName &&
                        (gate.status === 'passed' || gate.status === 'approved') &&
                        pluginSteps.every(step => {
                            const status = gate.steps?.[step]?.status;
                            return status === 'passed' || status === 'approved';
                        }) &&
                        ((await this.fileService.exists(path.join(pluginDir, 'result.json'))) ||
                            (await this.fileService.exists(path.join(pluginDir, 'summary.md'))));
            }
            checks.push({
                name: `${pluginName}.gate`,
                status: ready ? 'pass' : 'fail',
                message: ready
                    ? `${pluginName} gate and artifacts are complete`
                    : `${pluginName} approved gate plus result or summary is required`,
            });
        }
        return {
            archiveReady: checks.every(check => check.status !== 'fail'),
            checks,
        };
    }
    deriveCloseoutState(state, input) {
        const completed = new Set(state.completed || []);
        const setStep = (step, ready) => {
            if (ready)
                completed.add(step);
            else
                completed.delete(step);
        };
        setStep('proposal_complete', input.proposalReady && input.documentationReady);
        setStep('tasks_complete', input.tasksReady);
        setStep('implementation_complete', input.tasksReady);
        setStep('tests_passed', input.verificationReady);
        setStep('verification_passed', input.verificationReady && input.reviewReady);
        const ready = input.proposalReady &&
            input.tasksReady &&
            input.verificationReady &&
            input.reviewReady &&
            input.documentationReady &&
            input.pluginsReady;
        const managedSteps = [
            'proposal_complete',
            'tasks_complete',
            'implementation_complete',
            'tests_passed',
            'verification_passed',
            'archived',
        ];
        const pending = managedSteps.filter(step => !completed.has(step));
        const status = ready
            ? 'ready_to_archive'
            : !input.proposalReady || !input.documentationReady
                ? 'draft'
                : !input.tasksReady
                    ? 'implementing'
                    : 'verifying';
        return {
            ...state,
            status,
            current_step: status,
            completed: Array.from(completed).sort((left, right) => left.localeCompare(right)),
            pending,
            blocked_by: ready ? [] : ['classic_change_closeout_incomplete'],
        };
    }
    async validateDocumentationPath(projectRoot, relativePath) {
        if (!relativePath || path.isAbsolute(relativePath)) {
            return {
                ready: false,
                message: `Documentation update path must be a relative project path: ${relativePath || '(empty)'}`,
            };
        }
        const normalized = relativePath.replace(/\\/g, '/');
        const lower = normalized.toLowerCase();
        if (lower.startsWith('docs/project/changes/') ||
            lower.startsWith('.ospec/docs/project/changes/')) {
            return {
                ready: false,
                message: `Generated archive summaries do not satisfy feature documentation: ${normalized}`,
            };
        }
        if (lower.startsWith('.ospec/changes/') ||
            lower.startsWith('changes/')) {
            return {
                ready: false,
                message: `Change protocol files are not durable project documentation: ${normalized}`,
            };
        }
        const resolved = path.resolve(projectRoot, ...normalized.split('/'));
        const relative = path.relative(projectRoot, resolved);
        if (!relative ||
            relative === '..' ||
            relative.startsWith(`..${path.sep}`) ||
            path.isAbsolute(relative)) {
            return {
                ready: false,
                message: `Documentation update path escapes the project root: ${normalized}`,
            };
        }
        const segments = lower.split('/');
        const inDocumentationTree = segments.some(segment => ['docs', 'documentation', 'knowledge'].includes(segment));
        const proseDocument = /\.(md|mdx|rst|adoc)$/i.test(normalized);
        const namedDocument = /(^|\/)(readme|changelog|skill)(\.[^/]+)?$/i.test(normalized) ||
            /(^|\/)(openapi|asyncapi)(\.[^/]+)?$/i.test(normalized);
        const structuredDocumentation = inDocumentationTree && /\.(yaml|yml|json)$/i.test(normalized);
        const documentationLike = proseDocument || namedDocument || structuredDocumentation;
        if (!documentationLike) {
            return {
                ready: false,
                message: `Declared documentation update is not a recognized durable document: ${normalized}`,
            };
        }
        const stat = await fs_1.promises.stat(resolved).catch(() => null);
        if (!stat) {
            return {
                ready: false,
                message: `Declared documentation update does not exist: ${normalized}`,
            };
        }
        if (!stat.isFile()) {
            return {
                ready: false,
                message: `Declared documentation update is not a file: ${normalized}`,
            };
        }
        return {
            ready: true,
            message: `Real project documentation update is present: ${normalized}`,
        };
    }
}
exports.ClassicChangeCloseoutService = ClassicChangeCloseoutService;
