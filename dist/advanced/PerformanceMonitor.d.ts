/**
 * Performance monitoring system.
 * Tracks and optimizes system performance.
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
     * Start timing.
     */
    start(label: string): void;
    /**
     * Stop timing and record the result.
     */
    end(label: string, metadata?: Record<string, any>): number;
    /**
     * Get statistics.
     */
    getSummary(label?: string): PerformanceSummary | Record<string, PerformanceSummary>;
    /**
     * Calculate statistics.
     */
    private calculateSummary;
    /**
     * Get raw metrics.
     */
    getMetrics(label?: string): PerformanceMetric[] | Record<string, PerformanceMetric[]>;
    /**
     * Clear metrics.
     */
    clear(label?: string): void;
    /**
     * Generate a performance report.
     */
    generateReport(): string;
}
export declare const performanceMonitor: PerformanceMonitor;
