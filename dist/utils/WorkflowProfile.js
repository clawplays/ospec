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
exports.GOAL_ONLY_RELATIVE_PATHS = exports.GOAL_WORKFLOW_PROFILE = exports.CHANGE_WORKFLOW_PROFILE = void 0;
exports.normalizeWorkflowProfileId = normalizeWorkflowProfileId;
exports.inferWorkflowProfileFromChangeDir = inferWorkflowProfileFromChangeDir;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const constants_1 = require("../core/constants");
exports.CHANGE_WORKFLOW_PROFILE = 'change';
exports.GOAL_WORKFLOW_PROFILE = 'goal';
exports.GOAL_ONLY_RELATIVE_PATHS = [
    constants_1.FILE_NAMES.DESIGN,
    constants_1.FILE_NAMES.IMPLEMENTATION_PLAN,
    path.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.TASK_GRAPH),
    path.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW),
    path.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.CODE_QUALITY_REVIEW),
    path.join(constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.AGENTS, constants_1.FILE_NAMES.AGENT_WORKER_STATUS),
];
function normalizeWorkflowProfileId(input) {
    const value = String(input || '').trim().toLowerCase();
    if (value === exports.CHANGE_WORKFLOW_PROFILE || value === 'simple' || value === 'classic') {
        return exports.CHANGE_WORKFLOW_PROFILE;
    }
    if (value === exports.GOAL_WORKFLOW_PROFILE || value === 'full' || value === 'agent') {
        return exports.GOAL_WORKFLOW_PROFILE;
    }
    return null;
}
async function inferWorkflowProfileFromChangeDir(changePath, state) {
    const explicit = normalizeWorkflowProfileId(state?.workflow_profile_id);
    if (explicit) {
        return explicit;
    }
    for (const relativePath of exports.GOAL_ONLY_RELATIVE_PATHS) {
        if ((0, fs_1.existsSync)(path.join(changePath, relativePath))) {
            return exports.GOAL_WORKFLOW_PROFILE;
        }
    }
    return exports.CHANGE_WORKFLOW_PROFILE;
}
