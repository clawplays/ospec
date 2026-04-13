/**
 * Caching layer.
 * Optimizes performance and reduces disk access.
 */
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    ttl?: number;
}
export declare class CachingLayer<T = any> {
    private cache;
    private stats;
    private maxSize;
    private cleanupInterval?;
    constructor(maxSize?: number);
    /**
     * Set a cache value.
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Get a cache value.
     */
    get(key: string): T | null;
    /**
     * Check whether a key exists.
     */
    has(key: string): boolean;
    /**
     * Delete a cache entry.
     */
    delete(key: string): boolean;
    /**
     * Clear the cache.
     */
    clear(): void;
    /**
     * Get cache size.
     */
    size(): number;
    /**
     * Get cache statistics.
     */
    getStats(): {
        hits: number;
        misses: number;
        evictions: number;
        hitRate: number;
        currentSize: number;
        maxSize: number;
    };
    /**
     * Start cleaning expired entries.
     */
    private startCleanup;
    /**
     * Stop cleanup.
     */
    stopCleanup(): void;
    /**
     * Dispose the cache.
     */
    destroy(): void;
}
export declare const cachingLayer: CachingLayer<any>;
