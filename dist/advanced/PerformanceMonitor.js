"use strict";
/**
 * Performance monitoring system.
 * Tracks and optimizes system performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
    }
    /**
     * Start timing.
     */
    start(label) {
        this.startTimes.set(label, Date.now());
    }
    /**
     * Stop timing and record the result.
     */
    end(label, metadata) {
        const startTime = this.startTimes.get(label);
        if (!startTime) {
            console.warn(`Performance timer '${label}' was not started`);
            return 0;
        }
        const duration = Date.now() - startTime;
        this.startTimes.delete(label);
        const metric = {
            name: label,
            duration,
            timestamp: new Date().toISOString(),
            metadata,
        };
        if (!this.metrics.has(label)) {
            this.metrics.set(label, []);
        }
        this.metrics.get(label).push(metric);
        // Keep at most 1,000 records per label.
        const metricList = this.metrics.get(label);
        if (metricList.length > 1000) {
            metricList.shift();
        }
        return duration;
    }
    /**
     * Get statistics.
     */
    getSummary(label) {
        if (label) {
            return this.calculateSummary(label);
        }
        const summary = {};
        for (const key of this.metrics.keys()) {
            summary[key] = this.calculateSummary(key);
        }
        return summary;
    }
    /**
     * Calculate statistics.
     */
    calculateSummary(label) {
        const metricList = this.metrics.get(label) || [];
        if (metricList.length === 0) {
            return {
                totalDuration: 0,
                averageDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                count: 0,
                operationsPerSecond: 0,
            };
        }
        const durations = metricList.map(m => m.duration);
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const averageDuration = totalDuration / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        const operationsPerSecond = (durations.length / (totalDuration / 1000)) || 0;
        return {
            totalDuration,
            averageDuration: Math.round(averageDuration * 100) / 100,
            minDuration,
            maxDuration,
            count: durations.length,
            operationsPerSecond: Math.round(operationsPerSecond * 100) / 100,
        };
    }
    /**
     * Get raw metrics.
     */
    getMetrics(label) {
        if (label) {
            return this.metrics.get(label) || [];
        }
        return Object.fromEntries(this.metrics);
    }
    /**
     * Clear metrics.
     */
    clear(label) {
        if (label) {
            this.metrics.delete(label);
        }
        else {
            this.metrics.clear();
        }
    }
    /**
     * Generate a performance report.
     */
    generateReport() {
        const summary = this.getSummary();
        const lines = ['Performance Report', '==================\n'];
        for (const [label, stats] of Object.entries(summary)) {
            lines.push(`${label}:`);
            lines.push(`  Average: ${stats.averageDuration.toFixed(2)}ms`);
            lines.push(`  Min/Max: ${stats.minDuration}ms / ${stats.maxDuration}ms`);
            lines.push(`  Count: ${stats.count}`);
            lines.push(`  Ops/sec: ${stats.operationsPerSecond}`);
            lines.push('');
        }
        return lines.join('\n');
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
exports.performanceMonitor = new PerformanceMonitor();
