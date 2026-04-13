/**
 * Feature update system.
 * Handles feature updates and migrations.
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
     * Update feature properties.
     */
    updateFeature(featurePath: string, options: UpdateOptions): Promise<FeatureState>;
    /**
     * Batch update features.
     */
    batchUpdateFeatures(projectDir: string, filter: (state: FeatureState) => boolean, updates: UpdateOptions): Promise<FeatureState[]>;
    /**
     * Migrate a feature version.
     */
    migrateFeature(featurePath: string, targetVersion: string): Promise<void>;
    /**
     * Record update history.
     */
    private logUpdate;
    /**
     * Get update history.
     */
    getUpdateLogs(): UpdateLog[];
    /**
     * Clear the log.
     */
    clearLogs(): void;
}
export declare const featureUpdater: FeatureUpdater;
