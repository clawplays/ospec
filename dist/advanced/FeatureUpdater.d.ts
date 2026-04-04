/**
 * 特性更新系统
 * 处理特性的更新和迁移
 */
import { FeatureState, FeatureStatus } from '../core/types';
export interface UpdateOptions {
    status?: FeatureStatus;
    description?: string;
    tags?: string[];
    affects?: string[];
}
export interface UpdateLog {
    timestamp: string;
    type: 'status' | 'property' | 'metadata';
    changes: Record<string, any>;
    author?: string;
}
export declare class FeatureUpdater {
    private updateLogs;
    /**
     * 更新特性属性
     */
    updateFeature(featurePath: string, options: UpdateOptions): Promise<FeatureState>;
    /**
     * 批量更新特性
     */
    batchUpdateFeatures(projectDir: string, filter: (state: FeatureState) => boolean, updates: UpdateOptions): Promise<FeatureState[]>;
    /**
     * 迁移特性版本
     */
    migrateFeature(featurePath: string, targetVersion: string): Promise<void>;
    /**
     * 记录更新日志
     */
    private logUpdate;
    /**
     * 获取更新日志
     */
    getUpdateLogs(): UpdateLog[];
    /**
     * 清空日志
     */
    clearLogs(): void;
}
export declare const featureUpdater: FeatureUpdater;