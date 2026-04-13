/**
 * Index regeneration engine.
 * Rebuilds the project feature index.
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
     * Generate the complete index.
     */
    regenerateIndex(projectDir: string): Promise<ProjectIndex>;
    /**
     * Persist the index file.
     */
    private saveIndex;
    /**
     * Read the existing index.
     */
    readIndex(projectDir: string): Promise<ProjectIndex | null>;
    /**
     * Get index statistics.
     */
    getIndexStats(projectDir: string): Promise<ProjectIndex['stats']>;
    /**
     * Validate index integrity.
     */
    validateIndex(projectDir: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
export declare const indexRegenerator: IndexRegenerator;
