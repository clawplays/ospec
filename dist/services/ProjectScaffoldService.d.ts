import { FileService } from './FileService';
import { NormalizedProjectBootstrapInput } from './TemplateEngine';
import { ProjectScaffoldFileDefinition } from '../scaffolds/ProjectScaffoldPresets';
export interface ProjectScaffoldPlan {
    presetId: string;
    title: string;
    description: string;
    framework: string;
    installCommand: string;
    directories: string[];
    files: Array<ProjectScaffoldFileDefinition>;
    newDirectories: string[];
    existingDirectories: string[];
    newFiles: string[];
    existingFiles: string[];
}
export interface ProjectScaffoldApplyResult {
    plan: ProjectScaffoldPlan | null;
    createdDirectories: string[];
    skippedDirectories: string[];
    createdFiles: string[];
    skippedFiles: string[];
}
export declare class ProjectScaffoldService {
    private readonly fileService;
    constructor(fileService: FileService);
    getPlan(normalized: NormalizedProjectBootstrapInput): ProjectScaffoldPlan | null;
    getPlanForProject(rootDir: string, normalized: NormalizedProjectBootstrapInput): Promise<ProjectScaffoldPlan | null>;
    getGeneratedPaths(normalized: NormalizedProjectBootstrapInput): string[];
    applyScaffold(rootDir: string, normalized: NormalizedProjectBootstrapInput): Promise<ProjectScaffoldApplyResult | null>;
    private renderFileContent;
    private renderPackageJson;
    private renderHomePage;
    private renderSectionPage;
    private renderSiteShell;
    private renderHomeHero;
    private renderNavigationFile;
    private toPackageName;
    private isPlaceholder;
    private escapeTemplateString;
    private getCopy;
}
export declare const createProjectScaffoldService: (fileService: FileService) => ProjectScaffoldService;