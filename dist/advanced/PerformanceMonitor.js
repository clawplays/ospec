"use strict";
/**
 * 性能监控系统
 * 跟踪和优化系统性能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
    }
    /**
     * 开始计时
     */
    start(label) {
        this.startTimes.set(label, Date.now());
    }
    /**
     * 结束计时并记录
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
        // 限制每个标签最多保存1000条记录
        const metricList = this.metrics.get(label);
        if (metricList.length > 1000) {
            metricList.shift();
        }
        return duration;
    }
    /**
     * 获取统计信息
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
     * 计算统计数据
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
     * 获取原始指标
     */
    getMetrics(label) {
        if (label) {
            return this.metrics.get(label) || [];
        }
        return Object.fromEntries(this.metrics);
    }
    /**
     * 清空指标
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
     * 生成性能报告
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