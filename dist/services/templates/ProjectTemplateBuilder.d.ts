import { ProjectMode } from '../../core/types';
import { TemplateBuilderBase } from './TemplateBuilderBase';
import { TemplateInputFactory } from './TemplateInputFactory';
import { ProjectBootstrapInput } from './templateTypes';
export declare class ProjectTemplateBuilder extends TemplateBuilderBase {
    private readonly inputs;
    constructor(inputs: TemplateInputFactory);
    generateProjectReadmeTemplate(fallbackName: string, mode: ProjectMode, input?: ProjectBootstrapInput): string;
    generateRootSkillTemplate(fallbackName: string, mode: ProjectMode, input?: ProjectBootstrapInput): string;
    generateDocsSkillTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateSrcSkillTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateCoreSkillTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateTestsSkillTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateProjectOverviewTemplate(fallbackName: string, mode: ProjectMode, input?: ProjectBootstrapInput): string;
    generateTechStackTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateArchitectureTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateModuleMapTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateApiOverviewTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateDesignDocsTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generatePlanningDocsTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateApiDocsTemplate(fallbackName: string, input?: ProjectBootstrapInput): string;
    generateModuleSkillTemplate(fallbackName: string, moduleName: string, input?: ProjectBootstrapInput, moduleSlug?: string): string;
    generateApiAreaDocTemplate(fallbackName: string, apiAreaName: string, input?: ProjectBootstrapInput): string;
    generateModuleApiDocTemplate(fallbackName: string, moduleName: string, input?: ProjectBootstrapInput, moduleSlug?: string): string;
    generateDesignDocTemplate(fallbackName: string, docName: string, input?: ProjectBootstrapInput): string;
    generatePlanningDocTemplate(fallbackName: string, docName: string, input?: ProjectBootstrapInput): string;
    generateAiGuideTemplate(input?: ProjectBootstrapInput): string;
    generateExecutionProtocolTemplate(input?: ProjectBootstrapInput): string;
    /**
     * @deprecated Legacy classic-only index generator. NOT used for deployment: the
     * managed `.ospec/tools/build-index-auto.cjs` is direct-copied from `dist/tools/build-index.js`
     * (compiled from `src/tools/build-index.ts`), which is the canonical implementation kept in
     * lockstep with `IndexBuilder`. This template lacks nested-layout, knowledge-doc indexing,
     * git_commit, and active-changes scanning and should not be revived without reconciling all three.
     */
    generateBuildIndexScriptTemplate(): string;
    private getProjectContext;
    private getPresetModuleSkillBody;
    private getPresetApiAreaDocBody;
    private getPresetModuleApiDocBody;
    private getPresetDesignDocBody;
    private getPresetPlanningDocBody;
    private slugify;
}
