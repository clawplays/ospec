"use strict";
/**
 * 状态持久化系统
 * 处理状态的保存、加载和版本控制
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
exports.statePersistence = exports.StatePersistence = void 0;
const path = __importStar(require("path"));
const services_1 = require("../services");
class StatePersistence {
    constructor() {
        this.stateCache = new Map();
        this.snapshots = [];
    }
    /**
     * 保存状态快照
     */
    async saveSnapshot(featurePath, state) {
        const hash = this.generateHash(state);
        const snapshot = {
            timestamp: new Date().toISOString(),
            version: state.version,
            hash,
            state: JSON.parse(JSON.stringify(state)), // Deep copy
        };
        this.snapshots.push(snapshot);
        // 限制保留最后100个快照
        if (this.snapshots.length > 100) {
            this.snapshots = this.snapshots.slice(-100);
        }
        return snapshot;
    }
    /**
     * 加载状态
     */
    async loadState(featurePath) {
        const cacheKey = featurePath;
        // 检查缓存
        if (this.stateCache.has(cacheKey)) {
            return this.stateCache.get(cacheKey);
        }
        try {
            const stateFile = path.join(featurePath, 'state.json');
            const state = await services_1.services.fileService.readJSON(stateFile);
            // 缓存状态
            this.stateCache.set(cacheKey, state);
            return state;
        }
        catch (error) {
            services_1.services.logger.warn(`Failed to load state from ${featurePath}`);
            return null;
        }
    }
    /**
     * 比较两个状态
     */
    compareStates(oldState, newState) {
        const diff = {
            added: [],
            removed: [],
            modified: {},
        };
        // 比较基本属性
        const keys = new Set([
            ...Object.keys(oldState),
            ...Object.keys(newState),
        ]);
        for (const key of keys) {
            if (!(key in oldState)) {
                diff.added.push(key);
            }
            else if (!(key in newState)) {
                diff.removed.push(key);
            }
            else if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
                diff.modified[key] = {
                    old: oldState[key],
                    new: newState[key],
                };
            }
        }
        return diff;
    }
    /**
     * 生成状态哈希
     */
    generateHash(state) {
        const content = JSON.stringify(state);
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
    /**
     * 获取状态历史
     */
    getStateHistory() {
        return this.snapshots;
    }
    /**
     * 恢复到之前的快照
     */
    async restoreSnapshot(index) {
        if (index < 0 || index >= this.snapshots.length) {
            return null;
        }
        return this.snapshots[index].state;
    }
    /**
     * 清空缓存
     */
    clearCache() {
        this.stateCache.clear();
    }
    /**
     * 获取缓存统计
     */
    getCacheStats() {
        const cachedItems = this.stateCache.size;
        const snapshots = this.snapshots.length;
        const memory = `${(JSON.stringify(this.snapshots).length / 1024).toFixed(2)}KB`;
        return {
            cachedItems,
            snapshots,
            memory,
        };
    }
}
exports.StatePersistence = StatePersistence;
exports.statePersistence = new StatePersistence();