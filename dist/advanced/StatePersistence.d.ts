/**
 * 状态持久化系统
 * 处理状态的保存、加载和版本控制
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
     * 保存状态快照
     */
    saveSnapshot(featurePath: string, state: FeatureState): Promise<StateSnapshot>;
    /**
     * 加载状态
     */
    loadState(featurePath: string): Promise<FeatureState | null>;
    /**
     * 比较两个状态
     */
    compareStates(oldState: FeatureState, newState: FeatureState): StateDiff;
    /**
     * 生成状态哈希
     */
    private generateHash;
    /**
     * 获取状态历史
     */
    getStateHistory(): StateSnapshot[];
    /**
     * 恢复到之前的快照
     */
    restoreSnapshot(index: number): Promise<FeatureState | null>;
    /**
     * 清空缓存
     */
    clearCache(): void;
    /**
     * 获取缓存统计
     */
    getCacheStats(): {
        cachedItems: number;
        snapshots: number;
        memory: string;
    };
}
export declare const statePersistence: StatePersistence;