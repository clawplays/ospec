"use strict";
/**
 * 特性更新系统
 * 处理特性的更新和迁移
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
exports.featureUpdater = exports.FeatureUpdater = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
const constants_1 = require("../core/constants");
class FeatureUpdater {
    constructor() {
        this.updateLogs = [];
    }
    /**
     * 更新特性属性
     */
    async updateFeature(featurePath, options) {
        const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
        const state = await services_1.services.fileService.readJSON(statePath);
        const changes = {};
        // 更新状态
        if (options.status && options.status !== state.status) {
            changes.status = options.status;
            state.status = options.status;
        }
        // 更新描述（存在proposal中）
        if (options.description) {
            const proposalPath = path.join(featurePath, 'proposal', 'PROPOSAL.md');
            const proposalExists = await services_1.services.fileService.exists(proposalPath);
            if (proposalExists) {
                changes.description = options.description;
            }
        }
        // 更新标签
        if (options.tags && JSON.stringify(options.tags) !== JSON.stringify(state.pending)) {
            changes.tags = options.tags;
        }
        // 更新受影响模块
        if (options.affects && JSON.stringify(options.affects) !== JSON.stringify(state.affects)) {
            changes.affects = options.affects;
            state.affects = options.affects;
        }
        // 记录更新日志
        if (Object.keys(changes).length > 0) {
            this.logUpdate('property', changes);
            state.last_updated = new Date().toISOString();
            await services_1.services.fileService.writeJSON(statePath, state);
        }
        return state;
    }
    /**
     * 批量更新特性
     */
    async batchUpdateFeatures(projectDir, filter, updates) {
        const featuresDir = path.join(projectDir, 'features');
        const features = [];
        try {
            const featureFolders = await services_1.services.fileService.readDir(featuresDir);
            for (const featureName of featureFolders) {
                const featurePath = path.join(featuresDir, featureName);
                const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
                const exists = await services_1.services.fileService.exists(statePath);
                if (!exists)
                    continue;
                const state = await services_1.services.fileService.readJSON(statePath);
                if (filter(state)) {
                    const updated = await this.updateFeature(featurePath, updates);
                    features.push(updated);
                }
            }
        }
        catch (error) {
            services_1.services.logger.warn(`Failed to batch update: ${error}`);
        }
        return features;
    }
    /**
     * 迁移特性版本
     */
    async migrateFeature(featurePath, targetVersion) {
        const statePath = path.join(featurePath, constants_1.FILE_NAMES.STATE);
        const state = await services_1.services.fileService.readJSON(statePath);
        const oldVersion = state.version;
        state.version = targetVersion;
        state.last_updated = new Date().toISOString();
        await services_1.services.fileService.writeJSON(statePath, state);
        this.logUpdate('metadata', {
            versionMigration: { from: oldVersion, to: targetVersion },
        });
    }
    /**
     * 记录更新日志
     */
    logUpdate(type, changes) {
        const log = {
            timestamp: new Date().toISOString(),
            type,
            changes,
        };
        this.updateLogs.push(log);
    }
    /**
     * 获取更新日志
     */
    getUpdateLogs() {
        return this.updateLogs;
    }
    /**
     * 清空日志
     */
    clearLogs() {
        this.updateLogs = [];
    }
}
exports.FeatureUpdater = FeatureUpdater;
exports.featureUpdater = new FeatureUpdater();