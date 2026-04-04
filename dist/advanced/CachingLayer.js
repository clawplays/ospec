"use strict";
/**
 * 缓存层系统
 * 优化性能和减少磁盘访问
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
     * 设置缓存值
     */
    set(key, value, ttl) {
        // 如果超过最大大小，移除最旧的条目
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
     * 获取缓存值
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        // 检查是否过期
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        this.stats.hits++;
        return entry.value;
    }
    /**
     * 检查键是否存在
     */
    has(key) {
        return this.get(key) !== null;
    }
    /**
     * 删除缓存
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
    }
    /**
     * 获取缓存大小
     */
    size() {
        return this.cache.size;
    }
    /**
     * 获取统计信息
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
     * 启动清理过期条目
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
        }, 60000); // 每分钟检查一次
        // Do not keep unrelated CLI commands alive just because the cache module was imported.
        this.cleanupInterval.unref?.();
    }
    /**
     * 停止清理
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * 销毁缓存
     */
    destroy() {
        this.stopCleanup();
        this.clear();
    }
}
exports.CachingLayer = CachingLayer;
exports.cachingLayer = new CachingLayer();