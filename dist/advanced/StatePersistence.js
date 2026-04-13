"use strict";
/**
 * State persistence system.
 * Handles state persistence, loading, and version control.
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
     * Save a state snapshot.
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
        // Keep only the latest 100 snapshots.
        if (this.snapshots.length > 100) {
            this.snapshots = this.snapshots.slice(-100);
        }
        return snapshot;
    }
    /**
     * Load state.
     */
    async loadState(featurePath) {
        const cacheKey = featurePath;
        // Check the cache first.
        if (this.stateCache.has(cacheKey)) {
            return this.stateCache.get(cacheKey);
        }
        try {
            const stateFile = path.join(featurePath, 'state.json');
            const state = await services_1.services.fileService.readJSON(stateFile);
            // Cache the loaded state.
            this.stateCache.set(cacheKey, state);
            return state;
        }
        catch (error) {
            services_1.services.logger.warn(`Failed to load state from ${featurePath}`);
            return null;
        }
    }
    /**
     * Compare two states.
     */
    compareStates(oldState, newState) {
        const diff = {
            added: [],
            removed: [],
            modified: {},
        };
        // Compare basic properties.
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
     * Generate a state hash.
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
     * Get state history.
     */
    getStateHistory() {
        return this.snapshots;
    }
    /**
     * Restore a previous snapshot.
     */
    async restoreSnapshot(index) {
        if (index < 0 || index >= this.snapshots.length) {
            return null;
        }
        return this.snapshots[index].state;
    }
    /**
     * Clear the cache.
     */
    clearCache() {
        this.stateCache.clear();
    }
    /**
     * Get cache statistics.
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
