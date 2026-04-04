/**
 * 高级功能层导出
 */
export { FeatureUpdater, featureUpdater } from './FeatureUpdater';
export type { UpdateOptions, UpdateLog } from './FeatureUpdater';
export { StatePersistence, statePersistence } from './StatePersistence';
export type { StateSnapshot, StateDiff } from './StatePersistence';
export { BatchOperations, batchOperations } from './BatchOperations';
export type { BatchOperationResult, BatchQuery } from './BatchOperations';
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
export type { PerformanceMetric, PerformanceSummary } from './PerformanceMonitor';
export { CachingLayer, cachingLayer } from './CachingLayer';
export type { CacheEntry } from './CachingLayer';