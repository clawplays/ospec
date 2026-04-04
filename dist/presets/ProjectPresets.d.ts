import { ProjectMode } from '../core/types';
export type ProjectPresetId = 'official-site' | 'nextjs-web';
export type ProjectPresetDocumentLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ar';
export interface ProjectPresetFirstChangeSuggestion {
    name: string;
    background: string;
    goals: string[];
    inScope: string[];
    outOfScope: string[];
    acceptanceCriteria: string[];
    affects: string[];
    flags: string[];
}
export interface ProjectPresetDefinition {
    id: ProjectPresetId;
    name: string;
    description: string;
    recommendedMode: ProjectMode;
    recommendedTechStack: string[];
    architecture: string;
    modules: string[];
    apiAreas: string[];
    designDocs: string[];
    planningDocs: string[];
    keywords: string[];
    buildFirstChangeSuggestion: (language: ProjectPresetDocumentLanguage, projectName: string) => ProjectPresetFirstChangeSuggestion;
}
interface LocalizedProjectPresetContent {
    name: string;
    description: string;
    architecture: string;
    designDocs: string[];
    planningDocs: string[];
}
export declare const PROJECT_PRESETS: ProjectPresetDefinition[];
export declare const getProjectPresetById: (presetId?: string | null) => ProjectPresetDefinition | undefined;
export declare const getLocalizedProjectPresetContent: (presetId: ProjectPresetId | null | undefined, language: ProjectPresetDocumentLanguage) => LocalizedProjectPresetContent | null;
export declare const inferProjectPresetFromDescription: (description: string) => ProjectPresetDefinition | undefined;
export declare const getProjectPresetFirstChangeSuggestion: (presetId: ProjectPresetId | null | undefined, language: ProjectPresetDocumentLanguage, projectName: string) => ProjectPresetFirstChangeSuggestion | null;
export {};
