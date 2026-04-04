"use strict";
/**
 * 索引再生成引擎
 * 重新生成项目的功能索引
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
     * 生成完整索引
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
                    // 如果没有状态文件，跳过
                    services_1.services.logger.warn(`No state file for feature: ${featureName}`);
                }
            }
        }
        catch (error) {
            services_1.services.logger.warn(`Features directory not found: ${featuresDir}`);
        }
        // 生成统计数据
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
        // 保存索引文件
        await this.saveIndex(projectDir, index);
        return index;
    }
    /**
     * 保存索引文件
     */
    async saveIndex(projectDir, index) {
        const indexPath = path.join(projectDir, constants_1.FILE_NAMES.INDEX);
        await services_1.services.fileService.writeJSON(indexPath, index);
    }
    /**
     * 读取现有索引
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
     * 获取索引统计
     */
    async getIndexStats(projectDir) {
        const index = await this.readIndex(projectDir);
        return index?.stats || { total: 0, draft: 0, active: 0, completed: 0 };
    }
    /**
     * 验证索引完整性
     */
    async validateIndex(projectDir) {
        const index = await this.readIndex(projectDir);
        const errors = [];
        if (!index) {
            errors.push('Index file not found');
            return { valid: false, errors };
        }
        // 验证所有条目
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