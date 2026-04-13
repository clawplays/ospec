/**
 * State persistence system.
 * Handles state persistence, loading, and version control.
 */
import { FeatureState } from '../core/types';
export interface StateSnapshot {
    timestamp: string;
    version: string;
    hash: string;
    state: FeatureState;
}
export interface StateDiff {
    added: string[];
    removed: string[];
    modified: Record<string, {
        old: any;
        new: any;
    }>;
}
export declare class StatePersistence {
    private stateCache;
    private snapshots;
    /**
     * Save a state snapshot.
     */
    saveSnapshot(featurePath: string, state: FeatureState): Promise<StateSnapshot>;
    /**
     * Load state.
     */
    loadState(featurePath: string): Promise<FeatureState | null>;
    /**
     * Compare two states.
     */
    compareStates(oldState: FeatureState, newState: FeatureState): StateDiff;
    /**
     * Generate a state hash.
     */
    private generateHash;
    /**
     * Get state history.
     */
    getStateHistory(): StateSnapshot[];
    /**
     * Restore a previous snapshot.
     */
    restoreSnapshot(index: number): Promise<FeatureState | null>;
    /**
     * Clear the cache.
     */
    clearCache(): void;
    /**
     * Get cache statistics.
     */
    getCacheStats(): {
        cachedItems: number;
        snapshots: number;
        memory: string;
    };
}
export declare const statePersistence: StatePersistence;
