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
exports.analyzeGoalReviewSummary = analyzeGoalReviewSummary;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const helpers_1 = require("./helpers");
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
/**
 * For Goals, review.md is a derived summary that `ospec execute sync` rewrites
 * from artifacts/reviews/final-review.md. Archive readiness requires the
 * summary to carry the derivation marker, the same decision, and a complete
 * checklist so an untouched scaffold template can no longer be archived.
 */
async function analyzeGoalReviewSummary(fileService, changePath) {
    const finalPath = path.join(changePath, constants_1.DIR_NAMES.ARTIFACTS, constants_1.DIR_NAMES.REVIEWS, constants_1.FILE_NAMES.FINAL_REVIEW);
    const summaryPath = path.join(changePath, constants_1.FILE_NAMES.REVIEW);
    const readDecision = async (filePath) => {
        try {
            const document = (0, helpers_1.parseFrontmatterDocument)(await fileService.readFile(filePath));
            const decision = String(document.data?.decision || '').trim().toUpperCase();
            return decision || 'PENDING';
        }
        catch {
            return 'PENDING';
        }
    };
    if (!(await fileService.exists(finalPath))) {
        return {
            aligned: false,
            finalDecision: 'PENDING',
            summaryDecision: 'PENDING',
            message: 'artifacts/reviews/final-review.md is missing, so the derived review.md summary cannot be aligned',
        };
    }
    const finalDecision = await readDecision(finalPath);
    if (!(await fileService.exists(summaryPath))) {
        return {
            aligned: false,
            finalDecision,
            summaryDecision: 'PENDING',
            message: 'review.md is missing; run ospec execute sync to derive it from the final review',
        };
    }
    let summaryDecision = 'PENDING';
    let sourceMarked = false;
    let hasUnchecked = true;
    try {
        const summary = (0, helpers_1.parseFrontmatterDocument)(await fileService.readFile(summaryPath));
        summaryDecision = String(summary.data?.decision || '').trim().toUpperCase() || 'PENDING';
        sourceMarked = String(summary.data?.review_source || '').trim() === 'artifacts/reviews/final-review.md';
        hasUnchecked = /^\s*[-*+]\s+\[ \]\s+/m.test(summary.content);
    }
    catch {
        // Fall through with the not-aligned defaults.
    }
    const aligned = sourceMarked
        && finalDecision !== 'PENDING'
        && summaryDecision === finalDecision
        && !hasUnchecked;
    return {
        aligned,
        finalDecision,
        summaryDecision,
        message: aligned
            ? 'review.md is synced to the final review decision'
            : 'review.md is not synced to artifacts/reviews/final-review.md; run ospec execute sync before archiving',
    };
}
