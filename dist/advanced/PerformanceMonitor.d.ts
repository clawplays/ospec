/**
 * 性能监控系统
 * 跟踪和优化系统性能
 */
export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: string;
    metadata?: Record<string, any>;
}
export interface PerformanceSummary {
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    count: number;
    operationsPerSecond: number;
}
export declare class PerformanceMonitor {
    private metrics;
    private startTimes;
    /**
     * 开始计时
     */
    start(label: string): void;
    /**
     * 结束计时并记录
     */
    end(label: string, metadata?: Record<string, any>): number;
    /**
     * 获取统计信息
     */
    getSummary(label?: string): PerformanceSummary | Record<string, PerformanceSummary>;
    /**
     * 计算统计数据
     */
    private calculateSummary;
    /**
     * 获取原始指标
     */
    getMetrics(label?: string): PerformanceMetric[] | Record<string, PerformanceMetric[]>;
    /**
     * 清空指标
     */
    clear(label?: string): void;
    /**
     * 生成性能报告
     */
    generateReport(): string;
}
export declare const performanceMonitor: PerformanceMonitor;