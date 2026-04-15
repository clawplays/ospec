export type ProjectMode = 'lite' | 'standard' | 'full';
export type ProjectLayout = 'classic' | 'nested';
export type HookCheckPolicy = 'off' | 'warn' | 'error';
export type ChangeSummaryStatus = 'pass' | 'warn' | 'fail';
export type FeatureStatus = 'queued' | 'draft' | 'proposed' | 'planned' | 'implementing' | 'verifying' | 'ready_to_archive' | 'archived';
export interface StitchPageDesignReviewCapabilityConfig {
    enabled: boolean;
    step: string;
    activate_when_flags: string[];
}
export interface StitchCommandRunnerConfig {
    mode: 'command';
    command: string;
    args: string[];
    cwd: string;
    timeout_ms: number;
    token_env: string;
    extra_env: Record<string, string>;
}
export interface StitchPluginConfig {
    enabled: boolean;
    blocking: boolean;
    project?: {
        project_id: string;
        project_url: string;
        save_on_first_run: boolean;
        enforce_single_project: boolean;
    };
    gemini?: {
        model: string;
        auto_switch_on_limit: boolean;
        save_on_fallback: boolean;
    };
    codex?: {
        model: string;
        mcp_server: string;
    };
    runner: StitchCommandRunnerConfig;
    provider?: string;
    capabilities: {
        page_design_review: StitchPageDesignReviewCapabilityConfig;
    };
}
export interface CheckpointCapabilityConfig {
    enabled: boolean;
    step: string;
    activate_when_flags: string[];
}
export interface CheckpointCommandConfig {
    command: string;
    args: string[];
    cwd: string;
    timeout_ms: number;
}
export interface CheckpointAuthCommandConfig extends CheckpointCommandConfig {
    when: string;
}
export interface CheckpointRuntimeConfig {
    base_url: string;
    startup: CheckpointCommandConfig;
    readiness: {
        type: string;
        url: string;
        timeout_ms: number;
    };
    auth: CheckpointAuthCommandConfig;
    shutdown: CheckpointCommandConfig;
    storage_state: string;
}
export interface CheckpointRunnerConfig {
    mode: 'command';
    command: string;
    args: string[];
    cwd: string;
    timeout_ms: number;
    token_env: string;
    extra_env: Record<string, string>;
}
export interface CheckpointPluginConfig {
    enabled: boolean;
    blocking: boolean;
    runtime: CheckpointRuntimeConfig;
    runner: CheckpointRunnerConfig;
    capabilities: {
        ui_review: CheckpointCapabilityConfig;
        flow_check: CheckpointCapabilityConfig;
    };
    stitch_integration: {
        enabled: boolean;
        auto_pass_stitch_review: boolean;
    };
}
export interface SkillrcPluginsConfig {
    stitch?: StitchPluginConfig;
    checkpoint?: CheckpointPluginConfig;
    [name: string]: any;
}
export interface ArchiveConfig {
    layout: 'flat' | 'month-day';
}
export interface SkillrcConfig {
    version: string;
    mode: ProjectMode;
    ospecCliVersion?: string;
    projectLayout?: ProjectLayout;
    documentLanguage?: 'en-US' | 'zh-CN' | 'ja-JP' | 'ar';
    hooks: {
        'pre-commit': boolean;
        'post-merge': boolean;
        'spec-check': HookCheckPolicy;
        'change-check'?: HookCheckPolicy;
        'index-check'?: HookCheckPolicy;
    };
    index: {
        include?: string[];
        exclude?: string[];
    };
    archive?: ArchiveConfig;
    plugins?: SkillrcPluginsConfig;
    workflow?: {
        core_required: string[];
        optional_steps: Record<string, {
            enabled: boolean;
            when: string[];
        }>;
        archive_gate: {
            require_verification: boolean;
            require_skill_update: boolean;
            require_index_regenerated: boolean;
            require_optional_steps_passed: boolean;
        };
        feature_flags: {
            supported: string[];
        };
    };
}
export interface FeatureState {
    version: string;
    feature: string;
    mode: ProjectMode;
    workflow_profile_id?: string;
    status: FeatureStatus;
    current_step: string;
    affects: string[];
    completed: string[];
    pending: string[];
    blocked_by: string[];
    queued_at?: string;
    activated_at?: string;
    queue_source?: string;
    activation_source?: string;
    last_updated: string;
}
export interface ProposalFrontmatter {
    name: string;
    status: 'queued' | 'active' | 'archived';
    created: string;
    affects: string[];
    flags: string[];
}
export interface SkillFrontmatter {
    name: string;
    title?: string;
    tags: string[];
}
export interface SkillSection {
    level: number;
    title: string;
    start: number;
    end: number;
    tags?: string[];
}
export interface IndexModule {
    file: string;
    title: string;
    tags: string[];
    sections: Record<string, SkillSection>;
}
export interface SkillIndex {
    version: string;
    generated: string;
    git_commit: string | null;
    active_changes: string[];
    stats: {
        totalFiles: number;
        totalModules: number;
        totalSections: number;
    };
    modules: Record<string, IndexModule>;
    tagIndex: Record<string, string[]>;
}
export interface CommandResult {
    success: boolean;
    message: string;
    data?: unknown;
    error?: string;
}
export type ProjectStructureLevel = 'none';
export interface ProjectStructureCheck {
    key: string;
    path: string;
    exists: boolean;
    required: boolean;
    category: 'core' | 'knowledge';
}
export interface ProjectStructureUpgradeSuggestion {
    code: string;
    title: string;
    description: string;
    paths: string[];
}
export interface ProjectStructureStatus {
    initialized: boolean;
    level: ProjectStructureLevel;
    checks: ProjectStructureCheck[];
    missingRequired: string[];
    missingRecommended: string[];
    upgradeSuggestions: ProjectStructureUpgradeSuggestion[];
}
export interface ProjectSummary {
    name: string;
    path: string;
    mode: ProjectMode | null;
    initialized: boolean;
    structureLevel: ProjectStructureLevel;
    createdAt: string | null;
    activeChangeCount: number;
    docsRootExists: boolean;
    forAiExists: boolean;
    skillIndexExists: boolean;
}
export interface ProjectDocumentStatusItem {
    key: string;
    path: string;
    exists: boolean;
    required: boolean;
    updatedAt: string | null;
}
export interface DocsStatus {
    total: number;
    existing: number;
    coverage: number;
    items: ProjectDocumentStatusItem[];
    apiDocs: ApiDocInfo[];
    designDocs: KnowledgeDocInfo[];
    planningDocs: KnowledgeDocInfo[];
    missingRequired: string[];
    missingRecommended: string[];
    updatedAt: string | null;
}
export interface SkillFileInfo {
    key: string;
    path: string;
    exists: boolean;
    title: string | null;
    tags: string[];
    sectionCount: number;
    sectionTitles: string[];
}
export interface ModuleInfo {
    name: string;
    path: string;
    skillPath: string;
    skillExists: boolean;
}
export interface ApiDocInfo {
    name: string;
    path: string;
    exists: boolean;
    updatedAt: string | null;
}
export interface KnowledgeDocInfo {
    name: string;
    path: string;
    exists: boolean;
    updatedAt: string | null;
}
export interface SkillsStatus {
    totalSkillFiles: number;
    existing: number;
    missingRecommended: string[];
    rootSkills: SkillFileInfo[];
    moduleSkills: SkillFileInfo[];
    modules: ModuleInfo[];
    skillIndex: {
        exists: boolean;
        path: string;
        updatedAt: string | null;
        latestSourceUpdatedAt: string | null;
        needsRebuild: boolean;
        stale: boolean;
        reasons: string[];
        stats: SkillIndex['stats'] | null;
    };
}
export interface ExecutionFeatureSummary {
    name: string;
    status: FeatureState['status'];
    progress: number;
    currentStep: string;
    flags: string[];
    description: string;
}
export interface ExecutionStatus {
    totalActiveChanges: number;
    byStatus: Record<string, number>;
    activeChanges: ExecutionFeatureSummary[];
}
export interface QueuedChangeStatusItem {
    name: string;
    path: string;
    status: FeatureState['status'];
    currentStep: string;
    flags: string[];
    description: string;
    queuedAt: string | null;
    source: string | null;
}
export interface ChangeStatusCheck {
    name: string;
    status: ChangeSummaryStatus;
    message: string;
}
export interface ActiveChangeStatusItem extends ExecutionFeatureSummary {
    path: string;
    activatedSteps: string[];
    summaryStatus: ChangeSummaryStatus;
    failCount: number;
    warnCount: number;
    archiveReady: boolean;
    checks: ChangeStatusCheck[];
}
export interface ActiveChangeStatusReport {
    totalActiveChanges: number;
    totals: Record<ChangeSummaryStatus, number>;
    changes: ActiveChangeStatusItem[];
}
export type QueueRunProfileId = 'manual-safe' | 'archive-chain';
export type QueueRunStatus = 'running' | 'paused' | 'failed' | 'completed';
export interface QueueRunChangeRef {
    name: string;
    path: string;
    status: FeatureState['status'];
    recordedAt: string;
    note?: string | null;
}
export interface QueueRunRecord {
    id: string;
    status: QueueRunStatus;
    executor: 'manual-bridge';
    profileId: QueueRunProfileId;
    mode: 'single-active-sequential';
    projectPath: string;
    startedAt: string;
    updatedAt: string;
    stoppedAt: string | null;
    completedAt: string | null;
    currentChange: string | null;
    currentChangePath: string | null;
    completedChanges: QueueRunChangeRef[];
    remainingChanges: string[];
    failedChange: QueueRunChangeRef | null;
    logPath: string;
    lastInstruction: string | null;
}
export interface QueueRunStatusReport {
    currentRun: QueueRunRecord | null;
    stage: string | null;
    activeChange: {
        name: string;
        path: string;
        status: FeatureState['status'];
    } | null;
    queuedChanges: QueuedChangeStatusItem[];
    logTail: string[];
    nextInstruction: string | null;
}
export type WorkflowStep = 'proposal_complete' | 'tasks_complete' | 'implementation_complete' | 'skill_updated' | 'index_regenerated' | 'tests_passed' | 'verification_passed' | 'archived';
