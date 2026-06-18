import { ActiveChangeStatusItem, ActiveChangeStatusReport, DocsStatus, ExecutionStatus, KnowledgeDocInfo, ModuleInfo, ProjectMode, ProjectStructureStatus, ProjectSummary, SkillsStatus } from '../core/types';
import type { ChangeStatusCheck } from '../core/types';
import { ConfigManager } from './ConfigManager';
import { FileService } from './FileService';
import { IndexBuilder } from './IndexBuilder';
import { ProjectAssetService } from './ProjectAssetService';
import { ProjectScaffoldCommandExecutionResult, ProjectScaffoldCommandPlan, ProjectScaffoldCommandService } from './ProjectScaffoldCommandService';
import { ProjectScaffoldPlan, ProjectScaffoldService } from './ProjectScaffoldService';
import { SkillParser } from './SkillParser';
import { TemplateEngine } from './TemplateEngine';
import { FeatureProjectContext, ProjectBootstrapInput } from './TemplateEngine';
import { ProjectPresetFirstChangeSuggestion } from '../presets/ProjectPresets';
interface BootstrapStructurePolicy {
    minimumRequiredPaths: string[];
    recommendedPaths: string[];
    compatibleMissingRecommendedPaths: string[];
}
interface BootstrapAssetPlan {
    directCopyFiles: string[];
    templateGeneratedFiles: string[];
    runtimeGeneratedFiles: string[];
    localizedCopySources: Array<{
        targetRelativePath: string;
        sourceRelativePath: string;
    }>;
}
interface BootstrapFieldPolicy {
    key: string;
    required: boolean;
    allowPlaceholder: boolean;
}
interface AssetManifestEntry {
    id: string;
    strategy: 'direct_copy' | 'template_generated' | 'runtime_generated';
    category: string;
    description: string;
    targetRelativePath: string;
    sourceRelativePath: string | null;
    overwritePolicy: 'if_missing' | 'rebuild';
    exists: boolean;
}
declare const AGENT_WORKER_ALLOWED_STATUSES: readonly ["DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED", "PENDING"];
export type AgentWorkerStatusValue = typeof AGENT_WORKER_ALLOWED_STATUSES[number];
export type AgentWorkerStatusField = 'implementer_status' | 'spec_reviewer_status' | 'quality_reviewer_status' | 'controller_status';
export interface AgentWorkerStatusAnalysis {
    statuses: Record<AgentWorkerStatusField, string>;
    checklistComplete: boolean;
    archiveReady: boolean;
    blockers: string[];
    checks: ChangeStatusCheck[];
}
declare const TASK_GRAPH_ALLOWED_STATUSES: readonly ["DONE", "DONE_WITH_CONCERNS", "IN_PROGRESS", "NEEDS_CONTEXT", "BLOCKED", "PENDING"];
export type TaskGraphTaskStatus = typeof TASK_GRAPH_ALLOWED_STATUSES[number];
export interface TaskGraphTask {
    id: string;
    title: string;
    status: string;
    depends_on: string[];
    parallelizable: boolean;
    conflicts_with: string[];
    target_files: string[];
    verification_commands: string[];
    expected_result: string;
    worker_role: string;
    review?: {
        spec?: string;
        quality?: string;
        spec_artifact?: string;
        quality_artifact?: string;
    };
}
export interface TaskGraphAnalysis {
    optionalSteps: string[];
    taskCount: number;
    statuses: Record<string, string>;
    archiveReady: boolean;
    blockers: string[];
    checks: ChangeStatusCheck[];
}
declare const REVIEW_ARTIFACT_ALLOWED_DECISIONS: readonly ["APPROVED", "APPROVED_WITH_CONCERNS", "NEEDS_CHANGES", "BLOCKED", "PENDING"];
export type ReviewArtifactDecision = typeof REVIEW_ARTIFACT_ALLOWED_DECISIONS[number];
export type ReviewArtifactRole = 'spec_compliance_reviewer' | 'code_quality_reviewer';
export interface ReviewArtifactAnalysis {
    optionalSteps: string[];
    decision: string;
    checklistComplete: boolean;
    archiveReady: boolean;
    blockers: string[];
    checks: ChangeStatusCheck[];
}
export interface ProjectAssetStatus {
    exists: boolean;
    path: string;
    generatedAt: string | null;
    summary: {
        directCopy: number;
        templateGenerated: number;
        runtimeGenerated: number;
    };
    directCopy: AssetManifestEntry[];
    templateGenerated: AssetManifestEntry[];
    runtimeGenerated: AssetManifestEntry[];
}
export interface ProjectInitializationResult {
    projectName: string;
    mode: ProjectMode;
    projectPresetId: string | null;
    documentLanguage: string;
    executeScaffoldCommands: boolean;
    scaffoldPlan: ProjectScaffoldPlan | null;
    commandPlan: ProjectScaffoldCommandPlan | null;
    commandExecution: ProjectScaffoldCommandExecutionResult;
    scaffoldCreatedFiles: string[];
    scaffoldSkippedFiles: string[];
    scaffoldCreatedDirectories: string[];
    scaffoldSkippedDirectories: string[];
    directCopyCreatedFiles: string[];
    directCopySkippedFiles: string[];
    hookInstalledFiles: string[];
    hookSkippedFiles: string[];
    runtimeGeneratedFiles: string[];
    recoveryFilePath: string | null;
    firstChangeSuggestion: ProjectPresetFirstChangeSuggestion | null;
}
export interface ProjectKnowledgeGenerationResult {
    projectName: string;
    mode: ProjectMode;
    projectPresetId: string | null;
    documentLanguage: string;
    createdFiles: string[];
    refreshedFiles: string[];
    skippedFiles: string[];
    directCopyCreatedFiles: string[];
    directCopySkippedFiles: string[];
    hookInstalledFiles: string[];
    hookSkippedFiles: string[];
    runtimeGeneratedFiles: string[];
    firstChangeSuggestion: ProjectPresetFirstChangeSuggestion | null;
}
export interface ProjectProtocolSyncResult {
    projectName: string;
    mode: ProjectMode;
    documentLanguage: string;
    createdFiles: string[];
    refreshedFiles: string[];
    skippedFiles: string[];
}
export declare class ProjectService {
    private fileService;
    private configManager;
    private templateEngine;
    private indexBuilder;
    private skillParser;
    private projectAssetService;
    private projectScaffoldService;
    private projectScaffoldCommandService;
    constructor(fileService: FileService, configManager: ConfigManager, templateEngine: TemplateEngine, indexBuilder: IndexBuilder, skillParser: SkillParser, projectAssetService: ProjectAssetService, projectScaffoldService: ProjectScaffoldService, projectScaffoldCommandService: ProjectScaffoldCommandService);
    private getProjectLayout;
    private getManagedRootDir;
    private resolveManagedPath;
    private toProjectRelativePath;
    initializeProject(rootDir: string, mode: ProjectMode, input?: ProjectBootstrapInput): Promise<ProjectInitializationResult>;
    generateProjectKnowledge(rootDir: string, input?: ProjectBootstrapInput): Promise<ProjectKnowledgeGenerationResult>;
    syncProtocolGuidance(rootDir: string): Promise<ProjectProtocolSyncResult>;
    initializeProtocolShellProject(rootDir: string, mode: ProjectMode, input?: ProjectBootstrapInput): Promise<ProjectInitializationResult>;
    detectProjectStructure(rootDir: string): Promise<ProjectStructureStatus>;
    getProjectSummary(rootDir: string): Promise<ProjectSummary>;
    getProjectAssetStatus(rootDir: string): Promise<ProjectAssetStatus>;
    scanProjectDocs(rootDir: string): Promise<DocsStatus>;
    scanModules(rootDir: string): Promise<ModuleInfo[]>;
    scanApiDocs(rootDir: string): Promise<KnowledgeDocInfo[]>;
    scanDesignDocs(rootDir: string): Promise<KnowledgeDocInfo[]>;
    scanPlanningDocs(rootDir: string): Promise<KnowledgeDocInfo[]>;
    scanSkillHierarchy(rootDir: string): Promise<SkillsStatus>;
    getExecutionStatus(rootDir: string): Promise<ExecutionStatus>;
    getActiveChangeStatusReport(rootDir: string): Promise<ActiveChangeStatusReport>;
    getActiveChangeStatusItem(featurePath: string): Promise<ActiveChangeStatusItem>;
    listActiveChangeNames(rootDir: string): Promise<string[]>;
    finalizeChange(featurePath: string): Promise<{
        archivePath: string;
        change: ActiveChangeStatusItem;
    }>;
    /**
     * Move brainstorms linked to a change into that change's archive folder so the archived change
     * is self-contained and `.ospec/brainstorms/` does not accumulate orphans. A brainstorm is
     * linked when its `changeName` equals the feature, or (when it has no `changeName`) when its
     * directory id equals the feature. Unlinked exploration brainstorms are left in place.
     */
    archiveLinkedBrainstorms(projectRoot: string, feature: string, archivePath: string): Promise<string[]>;
    rebaseMovedChangeMarkdownLinks(previousChangePath: string, nextChangePath: string): Promise<void>;
    getFeatureProjectContext(rootDir: string, affects?: string[]): Promise<FeatureProjectContext>;
    getDocsStatus(rootDir: string): Promise<DocsStatus>;
    getSkillsStatus(rootDir: string): Promise<SkillsStatus>;
    getIndexStatus(rootDir: string): Promise<SkillsStatus['skillIndex']>;
    getBootstrapUpgradePlan(rootDir: string): Promise<ProjectBootstrapInput>;
    previewBootstrap(rootDir: string, mode: ProjectMode, input?: ProjectBootstrapInput): Promise<{
        projectPresetId: string | null;
        projectName: string;
        mode: ProjectMode;
        summary: string;
        techStack: string[];
        modules: string[];
        apiAreas: string[];
        designDocs: string[];
        planningDocs: string[];
        moduleSkillFiles: string[];
        moduleApiDocFiles: string[];
        apiDocFiles: string[];
        designDocFiles: string[];
        planningDocFiles: string[];
        files: string[];
        inferredModules: string[];
        fieldPolicy: BootstrapFieldPolicy[];
        structurePolicy: BootstrapStructurePolicy;
        assetPlan: BootstrapAssetPlan;
        scaffoldPlan: ProjectScaffoldPlan | null;
        commandPlan: ProjectScaffoldCommandPlan | null;
        firstChangeSuggestion: ProjectPresetFirstChangeSuggestion | null;
        usedFallbacks: string[];
        fieldSources: Record<string, string>;
    }>;
    inferBootstrapModules(rootDir: string): Promise<string[]>;
    getBootstrapFieldPolicy(): BootstrapFieldPolicy[];
    getBootstrapStructurePolicy(rootDir: string): BootstrapStructurePolicy;
    private buildBootstrapPreview;
    rebuildIndex(rootDir: string): Promise<SkillsStatus['skillIndex']>;
    private getDirectorySkeleton;
    private getProtocolShellDirectorySkeleton;
    private getKnowledgeLayerDirectorySkeleton;
    private getMinimumRuntimeStructureDefinitions;
    private getProtocolShellRecommendedDefinitions;
    private getProjectKnowledgeStructureDefinitions;
    private getStructureDefinitions;
    private getDocumentDefinitions;
    private getRootSkillDefinitions;
    private toDocumentStatusItem;
    private toSkillFileInfo;
    private writeIfMissing;
    private normalizeProjectBootstrap;
    private writeProjectKnowledgeLayer;
    private writeGeneratedFile;
    private isProtocolShellRootSkill;
    private createEmptyScaffoldResult;
    private applyProjectScaffoldPhase;
    private getProtocolShellTemplateGeneratedPaths;
    private getFullBootstrapTemplateGeneratedPaths;
    private getExistingOptionalKnowledgeGeneratedPaths;
    private getBootstrapAssetPlan;
    private renderProtocolShellRootSkill;
    private writeBootstrapSummary;
    private renderBootstrapSummary;
    private describeCommandExecutionStatus;
    private getPresetDefaults;
    private getFirstChangeSuggestion;
    private calculateProgress;
    private extractDescription;
    private buildActiveChangeStatusItem;
    private getGoalDocumentReviewChecks;
    private analyzeChecklistDocument;
    analyzeTaskGraphDocument(filePath: string, activatedSteps: string[]): Promise<TaskGraphAnalysis>;
    analyzeReviewArtifactDocument(filePath: string, name: string, expectedReviewerRole: ReviewArtifactRole, activatedSteps: string[]): Promise<ReviewArtifactAnalysis>;
    analyzeAgentWorkerStatusDocument(filePath: string): Promise<AgentWorkerStatusAnalysis>;
    private analyzeVerificationDocument;
    private analyzeVerificationEvidenceForVerificationDocument;
    private analyzeTddEvidenceForVerificationDocument;
    private analyzeDebugEvidenceForVerificationDocument;
    private maxUpdatedAt;
    private getLatestUpdatedAt;
    private shouldRebuildIndex;
    private getIndexRebuildReasons;
    private buildUpgradeSuggestions;
    private filterKnowledgeDocsByAffects;
    private toRelativePath;
    private findProjectRootFromPath;
    private toSlug;
    private scanDocsInDirectory;
}
export declare const createProjectService: (fileService: FileService, configManager: ConfigManager, templateEngine: TemplateEngine, indexBuilder: IndexBuilder, skillParser: SkillParser, projectAssetService: ProjectAssetService, projectScaffoldService: ProjectScaffoldService, projectScaffoldCommandService: ProjectScaffoldCommandService) => ProjectService;
export {};
