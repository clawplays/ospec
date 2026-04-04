/**
 * 缓存层系统
 * 优化性能和减少磁盘访问
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
     * 设置缓存值
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * 获取缓存值
     */
    get(key: string): T | null;
    /**
     * 检查键是否存在
     */
    has(key: string): boolean;
    /**
     * 删除缓存
     */
    delete(key: string): boolean;
    /**
     * 清空缓存
     */
    clear(): void;
    /**
     * 获取缓存大小
     */
    size(): number;
    /**
     * 获取统计信息
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
     * 启动清理过期条目
     */
    private startCleanup;
    /**
     * 停止清理
     */
    stopCleanup(): void;
    /**
     * 销毁缓存
     */
    destroy(): void;
}
export declare const cachingLayer: CachingLayer<any>;