import { FeatureState } from '../core/types';
export interface BatchOperationResult {
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{
        feature: string;
        error: string;
    }>;
}
export interface BatchQuery {
    status?: string;
    tags?: string[];
    minProgress?: number;
    maxProgress?: number;
    createdAfter?: string;
    createdBefore?: string;
}
export declare class BatchOperations {
    queryFeatures(projectDir: string, query: BatchQuery): Promise<FeatureState[]>;
    batchOperation(projectDir: string, query: BatchQuery, operation: (state: FeatureState, featurePath: string) => Promise<void>): Promise<BatchOperationResult>;
    exportFeatures(projectDir: string, query: BatchQuery): Promise<{
        count: number;
        features: FeatureState[];
        timestamp: string;
    }>;
    importFeatures(projectDir: string, features: FeatureState[]): Promise<BatchOperationResult>;
    getStatistics(projectDir: string): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byMode: Record<string, number>;
    }>;
    private matchesQuery;
}
export declare const batchOperations: BatchOperations;
