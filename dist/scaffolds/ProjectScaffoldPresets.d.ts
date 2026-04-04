import { ProjectPresetDocumentLanguage, ProjectPresetId } from '../presets/ProjectPresets';
export interface ProjectScaffoldFileDefinition {
    path: string;
    category: 'config' | 'app' | 'library' | 'static';
    purpose: string;
}
export interface ProjectScaffoldDefinition {
    presetId: ProjectPresetId;
    title: string;
    description: string;
    framework: string;
    installCommand: string;
    directories: string[];
    files: ProjectScaffoldFileDefinition[];
}
export declare const PROJECT_SCAFFOLD_PRESETS: ProjectScaffoldDefinition[];
export declare const getProjectScaffoldPreset: (presetId?: ProjectPresetId | null) => ProjectScaffoldDefinition | undefined;
export declare const getLocalizedProjectScaffoldMeta: (presetId: ProjectPresetId, language: ProjectPresetDocumentLanguage) => Pick<ProjectScaffoldDefinition, "title" | "description" | "framework" | "installCommand">;
export declare const getLocalizedProjectScaffoldPurpose: (filePath: string, language: ProjectPresetDocumentLanguage) => string;