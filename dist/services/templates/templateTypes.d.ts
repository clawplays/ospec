import { ProjectMode } from '../../core/types';
import { ProjectPresetId } from '../../presets/ProjectPresets';
export type TemplateDocumentLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ar';
export interface FeatureTemplateInput {
    feature: string;
    mode?: ProjectMode;
    placement?: 'active' | 'queued';
    affects?: string[];
    flags?: string[];
    optionalSteps?: string[];
    background?: string;
    goals?: string[];
    inScope?: string[];
    outOfScope?: string[];
    acceptanceCriteria?: string[];
    projectContext?: FeatureProjectContext;
    documentLanguage?: TemplateDocumentLanguage;
}
export interface NormalizedFeatureTemplateInput {
    feature: string;
    mode: ProjectMode;
    placement: 'active' | 'queued';
    affects: string[];
    flags: string[];
    optionalSteps: string[];
    background: string;
    goals: string[];
    inScope: string[];
    outOfScope: string[];
    acceptanceCriteria: string[];
    projectContext: FeatureProjectContext;
    documentLanguage: TemplateDocumentLanguage;
}
export interface FeatureProjectReference {
    title: string;
    path: string;
}
export interface FeatureProjectContext {
    projectDocs?: FeatureProjectReference[];
    moduleSkills?: FeatureProjectReference[];
    apiDocs?: FeatureProjectReference[];
    designDocs?: FeatureProjectReference[];
    planningDocs?: FeatureProjectReference[];
}
export interface ProjectBootstrapInput {
    projectPresetId?: ProjectPresetId | null;
    projectName?: string;
    summary?: string;
    techStack?: string[];
    architecture?: string;
    modules?: string[];
    apiAreas?: string[];
    designDocs?: string[];
    planningDocs?: string[];
    documentLanguage?: TemplateDocumentLanguage;
    executeScaffoldCommands?: boolean;
}
export type BootstrapFieldKey = 'projectName' | 'summary' | 'techStack' | 'architecture' | 'modules' | 'apiAreas' | 'designDocs' | 'planningDocs';
export type BootstrapFieldSource = 'user' | 'inferred' | 'preset' | 'placeholder';
export interface PlannedProjectFile {
    name: string;
    displayName: string;
    fileName: string;
    path: string;
}
export interface NormalizedProjectBootstrapInput {
    projectPresetId: ProjectPresetId | null;
    projectName: string;
    summary: string;
    techStack: string[];
    architecture: string;
    modules: string[];
    apiAreas: string[];
    designDocs: string[];
    planningDocs: string[];
    documentLanguage: TemplateDocumentLanguage;
    executeScaffoldCommands: boolean;
    mode: ProjectMode;
    modulePlans: PlannedProjectFile[];
    moduleApiPlans: PlannedProjectFile[];
    apiAreaPlans: PlannedProjectFile[];
    designDocPlans: PlannedProjectFile[];
    planningDocPlans: PlannedProjectFile[];
    fieldSources: Record<BootstrapFieldKey, BootstrapFieldSource>;
    usedFallbacks: BootstrapFieldKey[];
    userProvidedFields: BootstrapFieldKey[];
    inferredFields: BootstrapFieldKey[];
    placeholderFields: BootstrapFieldKey[];
}
//# sourceMappingURL=templateTypes.d.ts.map
