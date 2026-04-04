import { FeatureState } from '../core/types';
export interface SkillMetadata {
    name: string;
    version: string;
    description?: string;
    tags?: string[];
    dependencies?: string[];
    lastUpdated?: string;
}
export declare class SkillUpdateEngine {
    generateSkillIndex(featureDir: string): Promise<Record<string, SkillMetadata>>;
    updateSkill(featureDir: string, skillName: string, content: string, metadata?: Partial<SkillMetadata>): Promise<void>;
    getSkillHistory(featureDir: string, skillName: string): Promise<Array<{
        version: string;
        date: string;
        changes: string[];
    }>>;
    validateSkillUpdate(featureState: FeatureState): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    exportSkillPackage(featureDir: string): Promise<Buffer>;
}
export declare const skillUpdateEngine: SkillUpdateEngine;