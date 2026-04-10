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
exports.StateManager = void 0;
exports.createStateManager = createStateManager;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const errors_1 = require("../core/errors");
class StateManager {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async readState(featurePath) {
        const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
        try {
            return await this.fileService.readJSON(statePath);
        }
        catch {
            throw new errors_1.FeatureNotFoundError(featurePath);
        }
    }
    async writeState(featurePath, state) {
        const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
        state.last_updated = new Date().toISOString();
        await this.fileService.writeJSON(statePath, state);
    }
    validateTransition(currentStatus, targetStatus) {
        const allowedTransitions = constants_1.STATE_TRANSITIONS[currentStatus];
        return Boolean(allowedTransitions && allowedTransitions.includes(targetStatus));
    }
    async transitionStatus(featurePath, targetStatus) {
        const state = await this.readState(featurePath);
        const currentStatus = state.status;
        if (!this.validateTransition(currentStatus, targetStatus)) {
            throw new errors_1.InvalidStateTransitionError(currentStatus, targetStatus);
        }
        state.status = targetStatus;
        state.current_step = targetStatus;
        await this.writeState(featurePath, state);
    }
    createInitialState(feature, affects, mode = 'standard', options = {}) {
        const now = new Date().toISOString();
        if (options.queued) {
            return {
                version: '1.0',
                feature,
                mode,
                status: 'queued',
                current_step: 'queued',
                affects,
                completed: [],
                pending: [
                    'proposal_complete',
                    'tasks_complete',
                    'implementation_complete',
                    'skill_updated',
                    'index_regenerated',
                    'tests_passed',
                    'verification_passed',
                    'archived',
                ],
                blocked_by: ['awaiting_activation'],
                queued_at: now,
                queue_source: options.source ?? 'queue',
                last_updated: now,
            };
        }
        return {
            version: '1.0',
            feature,
            mode,
            status: 'draft',
            current_step: 'write_proposal',
            affects,
            completed: [],
            pending: [
                'proposal_complete',
                'tasks_complete',
                'implementation_complete',
                'skill_updated',
                'index_regenerated',
                'tests_passed',
                'verification_passed',
                'archived',
            ],
            blocked_by: ['missing_proposal'],
            last_updated: now,
        };
    }
}
exports.StateManager = StateManager;
function createStateManager(fileService) {
    return new StateManager(fileService);
}