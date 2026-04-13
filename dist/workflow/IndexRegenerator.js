"use strict";
/**
 * Index regeneration engine.
 * Rebuilds the project feature index.
 */
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
exports.indexRegenerator = exports.IndexRegenerator = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const constants_1 = require("../core/constants");
class IndexRegenerator {
    /**
     * Generate the complete index.
     */
    async regenerateIndex(projectDir) {
        const featuresDir = path.join(projectDir, 'features');
        const features = [];
        try {
            const featureFolders = await services_1.services.fileService.readDir(featuresDir);
            for (const featureName of featureFolders) {
                const featurePath = path.join(featuresDir, featureName);
                const stat = await services_1.services.fileService.stat(featurePath);
                if (!stat.isDirectory())
                    continue;
                try {
                    const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
                    const state = await services_1.services.fileService.readJSON(statePath);
                    features.push({
                        name: featureName,
                        path: featurePath,
                        status: state.status || 'unknown',
                        lastUpdated: state.last_updated || new Date().toISOString(),
                        tags: state.tags || [],
                    });
                }
                catch (error) {
                    // Skip entries with no state file.
                    services_1.services.logger.warn(`No state file for feature: ${featureName}`);
                }
            }
        }
        catch (error) {
            services_1.services.logger.warn(`Features directory not found: ${featuresDir}`);
        }
        // Generate summary statistics.
        const stats = {
            total: features.length,
            draft: features.filter(f => f.status === 'draft').length,
            active: features.filter(f => f.status === 'active').length,
            completed: features.filter(f => f.status === 'completed').length,
        };
        const index = {
            version: '1.0',
            generated: new Date().toISOString(),
            features: features.sort((a, b) => a.name.localeCompare(b.name)),
            stats,
        };
        // Persist the index file.
        await this.saveIndex(projectDir, index);
        return index;
    }
    /**
     * Persist the index file.
     */
    async saveIndex(projectDir, index) {
        const indexPath = path.join(projectDir, constants_1.FILE_NAMES.INDEX);
        await services_1.services.fileService.writeJSON(indexPath, index);
    }
    /**
     * Read the existing index.
     */
    async readIndex(projectDir) {
        try {
            const indexPath = path.join(projectDir, constants_1.FILE_NAMES.INDEX);
            return await services_1.services.fileService.readJSON(indexPath);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get index statistics.
     */
    async getIndexStats(projectDir) {
        const index = await this.readIndex(projectDir);
        return index?.stats || { total: 0, draft: 0, active: 0, completed: 0 };
    }
    /**
     * Validate index integrity.
     */
    async validateIndex(projectDir) {
        const index = await this.readIndex(projectDir);
        const errors = [];
        if (!index) {
            errors.push('Index file not found');
            return { valid: false, errors };
        }
        // Validate all entries.
        for (const entry of index.features) {
            const statePath = path.join(entry.path, constants_1.FILE_NAMES.STATE);
            const exists = await services_1.services.fileService.exists(statePath);
            if (!exists) {
                errors.push(`State file missing for feature: ${entry.name}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.IndexRegenerator = IndexRegenerator;
exports.indexRegenerator = new IndexRegenerator();
