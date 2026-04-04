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
exports.batchOperations = exports.BatchOperations = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
class BatchOperations {
    async queryFeatures(projectDir, query) {
        const featuresDir = path.join(projectDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
        const results = [];
        try {
            const featureFolders = await services_1.services.fileService.readDir(featuresDir);
            for (const featureName of featureFolders) {
                const featurePath = path.join(featuresDir, featureName);
                const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
                if (!(await services_1.services.fileService.exists(statePath))) {
                    continue;
                }
                const state = await services_1.services.fileService.readJSON(statePath);
                if (this.matchesQuery(state, query)) {
                    results.push(state);
                }
            }
        }
        catch (error) {
            services_1.services.logger.warn(`Query failed: ${error}`);
        }
        return results;
    }
    async batchOperation(projectDir, query, operation) {
        const result = {
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };
        const features = await this.queryFeatures(projectDir, query);
        const featuresDir = path.join(projectDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
        for (const feature of features) {
            try {
                await operation(feature, path.join(featuresDir, feature.feature));
                result.successful++;
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    feature: feature.feature,
                    error: String(error),
                });
            }
        }
        return result;
    }
    async exportFeatures(projectDir, query) {
        const features = await this.queryFeatures(projectDir, query);
        return {
            count: features.length,
            features,
            timestamp: new Date().toISOString(),
        };
    }
    async importFeatures(projectDir, features) {
        const result = {
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };
        const featuresDir = path.join(projectDir, constants_1.DIR_NAMES.CHANGES, constants_1.DIR_NAMES.ACTIVE);
        for (const feature of features) {
            try {
                const featurePath = path.join(featuresDir, feature.feature);
                const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
                if (await services_1.services.fileService.exists(statePath)) {
                    result.skipped++;
                    continue;
                }
                await services_1.services.fileService.ensureDir(featurePath);
                await services_1.services.fileService.writeJSON(statePath, feature);
                result.successful++;
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    feature: feature.feature,
                    error: String(error),
                });
            }
        }
        return result;
    }
    async getStatistics(projectDir) {
        const features = await this.queryFeatures(projectDir, {});
        const stats = {
            total: features.length,
            byStatus: {},
            byMode: {},
        };
        for (const feature of features) {
            if (!stats.byStatus[feature.status]) {
                stats.byStatus[feature.status] = 0;
            }
            stats.byStatus[feature.status]++;
            if (!stats.byMode[feature.mode]) {
                stats.byMode[feature.mode] = 0;
            }
            stats.byMode[feature.mode]++;
        }
        return stats;
    }
    matchesQuery(state, query) {
        if (query.status && state.status !== query.status) {
            return false;
        }
        if (query.tags && query.tags.length > 0) {
            const hasMatchingTag = query.tags.some(tag => (state.pending || []).includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }
        return true;
    }
}
exports.BatchOperations = BatchOperations;
exports.batchOperations = new BatchOperations();