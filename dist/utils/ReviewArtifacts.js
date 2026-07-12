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
exports.resolveGoalReviewArtifacts = resolveGoalReviewArtifacts;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
async function resolveGoalReviewArtifacts(fileService, changePath) {
    const reviewsDir = path.join(changePath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS);
    const combined = {
        path: path.join(reviewsDir, constants_1.FILE_NAMES.FINAL_REVIEW),
        name: 'artifacts/reviews/final-review.md',
        role: 'code_reviewer',
    };
    if (await fileService.exists(combined.path)) {
        return { mode: 'combined', artifacts: [combined], missing: [] };
    }
    const legacy = [
        {
            path: path.join(reviewsDir, constants_1.FILE_NAMES.SPEC_COMPLIANCE_REVIEW),
            name: 'artifacts/reviews/spec-compliance.md',
            role: 'spec_compliance_reviewer',
        },
        {
            path: path.join(reviewsDir, constants_1.FILE_NAMES.CODE_QUALITY_REVIEW),
            name: 'artifacts/reviews/code-quality.md',
            role: 'code_quality_reviewer',
        },
    ];
    const exists = await Promise.all(legacy.map(item => fileService.exists(item.path)));
    const artifacts = legacy.filter((_item, index) => exists[index]);
    const missing = legacy.filter((_item, index) => !exists[index]).map(item => item.name);
    return {
        mode: artifacts.length > 0 ? 'legacy' : 'missing',
        artifacts,
        missing: artifacts.length > 0 ? missing : [combined.name],
    };
}
