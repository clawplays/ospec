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
import { SkillrcConfig } from '../core/types';
import { ReviewArtifactRole } from '../utils/ReviewArtifacts';
import { LegacyPluginRemoval } from './LegacyPluginMigrationService';
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
    documentation_updates?: string[];
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
export interface DocumentationUpdateAnalysis {
    enabled: boolean;
    declared: string[];
    checks: ChangeStatusCheck[];
}
export interface FinalizeChangeOptions {
    forceArchive?: boolean;
    confirmForceArchive?: string;
    reason?: string;
}
declare const REVIEW_ARTIFACT_ALLOWED_DECISIONS: readonly ["APPROVED", "APPROVED_WITH_CONCERNS", "NEEDS_CHANGES", "BLOCKED", "PENDING"];
export type ReviewArtifactDecision = typeof REVIEW_ARTIFACT_ALLOWED_DECISIONS[number];
export type { ReviewArtifactRole } from '../utils/ReviewArtifacts';
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
    verifiedFiles: string[];
    /**
     * Plugin-era guidance removed from the managed root SKILL.md during this
     * sync. Empty on every project that was never touched by a 1.x CLI.
     */
    pluginGuidanceRemovals: LegacyPluginRemoval[];
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
    private legacyPluginMigrationService;
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
    /**
     * Guards against silent evidence loss through Git: when the change's
     * documents are tracked but its artifacts directory is caught by a
     * .gitignore rule (a global "artifacts/" pattern is a common footgun),
     * every review, verification, and loop artifact would vanish from any
     * clone or merge while the archive looks complete on this disk. Blocks
     * only that inconsistent state; wholly-untracked changes (deliberate
     * local-only projects) and non-Git directories pass.
     */
    assessArchiveEvidenceTracking(featureDir: string): {
        level: 'ok' | 'block';
        message: string | null;
    };
    getActiveChangeStatusItem(featurePath: string): Promise<ActiveChangeStatusItem>;
    /**
     * S4: the cheap `totalActiveChanges`.
     *
     * Deliberately matches what `getActiveChangeStatusReport` counts rather
     * than what the old uninitialised branch counted: that report keeps only
     * directories `buildActiveChangeStatusItem` could build, and it returns
     * `null` for a directory with no `state.json`. Counting every directory
     * would have been cheaper still and would have quietly changed the number
     * `ospec status` prints for any project with a stray directory under
     * `changes/active`.
     */
    countActiveChangeDirectories(rootDir: string, config?: SkillrcConfig | null): Promise<number>;
    listActiveChangeNames(rootDir: string): Promise<string[]>;
    finalizeChange(featurePath: string, options?: FinalizeChangeOptions): Promise<{
        archivePath: string;
        change: ActiveChangeStatusItem;
    }>;
    private finalizeChangeAttempt;
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
    private assertForceArchiveHasNoPendingLoopAction;
    /**
     * 7.7 renamed this from `preflightArchivedKnowledgeWrite` and deleted its
     * knowledge-document half along with the generator.
     *
     * What remains is the part that was never about knowledge documents: prove
     * the archive target is inside the managed tree, and prove every directory
     * finalize is about to write to is actually writable, BEFORE the
     * irreversible move. Discovering a read-only `docs/project` after the
     * change directory has already been moved is how a half-archived change
     * happens.
     */
    preflightArchiveWrite(projectRoot: string, archivePath: string): Promise<void>;
    /**
     * 7.7 rewrote this from `assertArchivedKnowledgeIndexed`.
     *
     * The old assertion guaranteed a generated knowledge document existed and
     * was linked. That document is gone, so keeping the old shape would mean
     * asserting nothing -- and this repository has shipped enough checks that
     * pass while checking nothing that replacing one with a tautology is the
     * specific failure to avoid here. The guarantee is restated against what
     * now carries the information:
     *
     *   1. the archived_changes entry exists -- the durable record, and what
     *      `ospec changes show` and `ospec index query` both read;
     *   2. the archive is linked from feature-index.md, so a reader with only
     *      the docs tree can still reach the evidence;
     *   3. forced archives are still visibly forced: in the entry, in the
     *      preserved force record, and in the generated index;
     *   4. every feature slug this change declared has a catalogue row -- but
     *      ONLY when a catalogue exists. A project that has not migrated has no
     *      catalogue, and refusing to archive over that would make 7.7
     *      unshippable for exactly the projects 7.9 exists to migrate.
     */
    assertArchivedChangeIndexed(projectRoot: string, archivePath: string, expectations?: {
        disposition?: 'forced';
    }): Promise<void>;
    /**
     * The feature slugs a change declares, from the two sources contract 6.2
     * names: the proposal's frontmatter `features:` (written by 7.5) and
     * `state.json.features`. Invalid entries are DROPPED rather than thrown on,
     * exactly as `readFeatureSlugList` does for the index -- an archive is
     * immutable history and a slug written before the naming rule existed must
     * not be able to wedge archiving forever.
     */
    readDeclaredFeatureSlugs(changeDir: string): Promise<string[]>;
    /**
     * Resolve feature slugs to the `path#section` targets contract 6.2 stores in
     * `state.json.doc_updates`. Reads the index that exists NOW, before the
     * archive's rebuild: `feature_docs` describes the human documents, which the
     * change has already finished editing.
     */
    computeDocUpdates(projectRoot: string, slugs: string[]): Promise<string[]>;
    /**
     * The archive-time write into the docs: update the catalogue rows for every
     * feature this change touched, then write the traceability comment into
     * each of those feature sections.
     *
     * NEVER THROWS, and that is a deliberate design decision rather than
     * defensive habit. By the time this runs the change has already been moved
     * into `changes/archived/` and the index already records it -- the work is
     * archived. A read-only docs tree, a feature document someone is mid-edit
     * on, or a catalogue that has not been generated yet are all reasons to
     * tell the user something was skipped, and none of them are reasons to fail
     * an operation that has already succeeded. Returns the warnings for the
     * caller to print.
     */
    /**
     * The archive gate's half of track B's 7.6: VERIFY the obligations B
     * recorded. This never produces them and never recomputes whether one is
     * satisfied -- it reads `state.json.docs_obligations` (the one location B
     * writes for both workflows) and asks B's evaluator, because a second
     * inference path is how warn mode and strict mode drift apart.
     *
     * Returns the messages; `warn` is the default for this release cycle per
     * the plan, so the caller prints them. Only `docs_contract.mode: strict`
     * turns an unsatisfied REQUIRED obligation into a refusal, and that is the
     * caller's decision, not this method's.
     */
    verifyDocsObligations(projectRoot: string, changeDir: string): Promise<{
        mode: 'warn' | 'strict';
        blocking: string[];
        advisory: string[];
        warnings: string[];
    }>;
    recordArchiveTraceability(projectRoot: string, archivePath: string): Promise<string[]>;
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
    private readChangeStateOrThrow;
    private buildActiveChangeStatusItem;
    private getGoalDocumentReviewChecks;
    private analyzeChecklistDocument;
    analyzeTaskGraphDocument(filePath: string, activatedSteps: string[]): Promise<TaskGraphAnalysis>;
    /**
     * 7.6: evaluate this change's documentation obligations and map them onto
     * gate checks.
     *
     * Reads `state.json.docs_obligations` -- the single record, written at
     * planning time for both workflow profiles. A change with no obligations
     * produces one passing check and nothing else; that is the honest result
     * for a project that has not adopted feature documents, and it is why the
     * check is named even when the list is empty, so an empty list is visible
     * in the gate output rather than silently absent.
     */
    analyzeDocsObligations(rootDir: string, featureDir: string): Promise<ChangeStatusCheck[]>;
    /**
     * 7.6: an empty obligation list is not automatically innocent.
     *
     * `docs_obligations` is written by `ospec docs obligations --apply` at
     * planning time. Nothing forces that command to run, so without this check a
     * change could skip the entire documentation contract by simply never
     * invoking it -- and the gate would report nothing at all, which reads
     * exactly like "this change owed no documentation". That is the
     * gate-passes-because-the-list-was-empty failure this phase exists to avoid.
     *
     * So when the list is empty, re-derive what this change's `change_type`
     * WOULD generate. If the answer is "nothing", the empty list is honest and
     * one passing check says so. If the answer is "something", the operator is
     * told the obligations were never recorded.
     *
     * This is a `warn` in BOTH modes, deliberately. It reports a process step
     * that was skipped, not an unmet obligation, and blocking on it would
     * punish every project that has not adopted the engine yet.
     */
    private reportMissingDocsObligations;
    analyzeDocumentationUpdates(featureDir: string): Promise<DocumentationUpdateAnalysis>;
    analyzeReviewArtifactDocument(filePath: string, name: string, expectedReviewerRole: ReviewArtifactRole, activatedSteps: string[]): Promise<ReviewArtifactAnalysis>;
    analyzeAgentWorkerStatusDocument(filePath: string): Promise<AgentWorkerStatusAnalysis>;
    private analyzeVerificationDocument;
    private analyzeVerificationEvidenceForVerificationDocument;
    private analyzeTddEvidenceForVerificationDocument;
    private analyzeDebugEvidenceForVerificationDocument;
    private maxUpdatedAt;
    private collectKnowledgeIndexSourcePaths;
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
