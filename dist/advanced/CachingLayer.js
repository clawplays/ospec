"use strict";
/**
 * Caching layer.
 * Optimizes performance and reduces disk access.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachingLayer = exports.CachingLayer = void 0;
class CachingLayer {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
        };
        this.maxSize = 1000;
        this.maxSize = maxSize;
        this.startCleanup();
    }
    /**
     * Set a cache value.
     */
    set(key, value, ttl) {
        // Remove the oldest entry when the cache exceeds the maximum size.
        if (this.cache.size >= this.maxSize) {
            const oldestKey = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
            if (oldestKey) {
                this.cache.delete(oldestKey);
                this.stats.evictions++;
            }
        }
        const entry = {
            key,
            value,
            timestamp: Date.now(),
            ttl,
        };
        this.cache.set(key, entry);
    }
    /**
     * Get a cache value.
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        // Check whether the entry has expired.
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        this.stats.hits++;
        return entry.value;
    }
    /**
     * Check whether a key exists.
     */
    has(key) {
        return this.get(key) !== null;
    }
    /**
     * Delete a cache entry.
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear the cache.
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache size.
     */
    size() {
        return this.cache.size;
    }
    /**
     * Get cache statistics.
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0';
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            hitRate: parseFloat(hitRate),
            currentSize: this.cache.size,
            maxSize: this.maxSize,
        };
    }
    /**
     * Start cleaning expired entries.
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let removed = 0;
            for (const [key, entry] of this.cache.entries()) {
                if (entry.ttl && now - entry.timestamp > entry.ttl) {
                    this.cache.delete(key);
                    removed++;
                }
            }
            if (removed > 0) {
                this.stats.evictions += removed;
            }
        }, 60000); // Check once per minute.
        // Do not keep unrelated CLI commands alive just because the cache module was imported.
        this.cleanupInterval.unref?.();
    }
    /**
     * Stop cleanup.
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Dispose the cache.
     */
    destroy() {
        this.stopCleanup();
        this.clear();
    }
}
exports.CachingLayer = CachingLayer;
exports.cachingLayer = new CachingLayer();
