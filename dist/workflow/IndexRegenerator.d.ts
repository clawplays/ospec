/**
 * 索引再生成引擎
 * 重新生成项目的功能索引
 */
export interface IndexEntry {
    name: string;
    path: string;
    status: string;
    lastUpdated: string;
    tags?: string[];
}
export interface ProjectIndex {
    version: string;
    generated: string;
    features: IndexEntry[];
    stats: {
        total: number;
        draft: number;
        active: number;
        completed: number;
    };
}
export declare class IndexRegenerator {
    /**
     * 生成完整索引
     */
    regenerateIndex(projectDir: string): Promise<ProjectIndex>;
    /**
     * 保存索引文件
     */
    private saveIndex;
    /**
     * 读取现有索引
     */
    readIndex(projectDir: string): Promise<ProjectIndex | null>;
    /**
     * 获取索引统计
     */
    getIndexStats(projectDir: string): Promise<ProjectIndex['stats']>;
    /**
     * 验证索引完整性
     */
    validateIndex(projectDir: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
export declare const indexRegenerator: IndexRegenerator;