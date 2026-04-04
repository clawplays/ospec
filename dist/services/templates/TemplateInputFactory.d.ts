import { ProjectMode } from '../../core/types';
import { FeatureTemplateInput, NormalizedFeatureTemplateInput, NormalizedProjectBootstrapInput, ProjectBootstrapInput } from './templateTypes';
export declare class TemplateInputFactory {
    normalizeFeatureTemplateInput(input: string | FeatureTemplateInput): NormalizedFeatureTemplateInput;
    normalizeProjectBootstrapInput(input: ProjectBootstrapInput | undefined, fallbackName: string, mode: ProjectMode, inferredDefaults?: Partial<ProjectBootstrapInput>, presetDefaults?: Partial<ProjectBootstrapInput>): NormalizedProjectBootstrapInput;
    private normalizeFeatureProjectContext;
    private normalizeDocumentLanguage;
    private pickFieldKeys;
    private isPlaceholderItem;
    private slugify;
    private normalizeModuleDisplayName;
    private normalizeDocDisplayName;
    private buildPlannedFiles;
    private buildModuleApiPlans;
}