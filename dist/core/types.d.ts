export type ProjectMode = 'lite' | 'standard' | 'full';
export type ProjectLayout = 'classic' | 'nested';
export type WorkflowProfileId = 'change' | 'goal';
export type HookCheckPolicy = 'off' | 'warn' | 'error';
export type AgentModelProfileId = 'mechanical' | 'standard' | 'strong_reasoning' | 'review' | 'final_review';
export interface AgentModelProfileConfig {
    default?: string;
    targets?: Record<string, string>;
}
export type ChangeSummaryStatus = 'pass' | 'warn' | 'fail';
export type FeatureStatus = 'queued' | 'draft' | 'proposed' | 'planned' | 'implementing' | 'verifying' | 'ready_to_archive' | 'archived';
export interface ArchiveConfig {
    layout: 'flat' | 'month-day';
}
/**
 * 7.6: how an unmet documentation obligation is reported at the archive gate.
 * `warn` for one release cycle -- a gate that blocks on day one is a gate that
 * gets worked around. Only `DocsObligationService.applyMode` reads this; the
 * satisfaction decision itself is mode-blind, so the two modes cannot drift.
 */
export type DocsObligationMode = 'warn' | 'strict';
export interface DocsContractConfig {
    mode: DocsObligationMode;
}
/** What kind of documentation work an obligation asks for. */
export type DocsObligationKind = 'update_section' | 'create_section' | 'correct_section' | 'verify_section'
/** Design/ADR binding: confirm the decision still holds, or mark it superseded. */
 | 'verify_decision'
/** Project-doc binding: confirm the structural overview is still accurate. */
 | 'verify_structure' | 'mark_status' | 'edit';
export type DocsObligationLevel = 'required' | 'optional';
export interface DocsObligationEvidence {
    /**
     * The explicit "I looked and it is still accurate" confirmation. Accepted
     * ONLY for `verification_only` obligations; on any other kind it is refused,
     * because otherwise every obligation would become self-certifying.
     */
    verified_unchanged?: boolean;
    confirmed_at?: string;
    note?: string;
}
export interface DocsObligationBaseline {
    exists: boolean;
    /** sha256 of the target SECTION at planning time; null when absent. */
    section_hash: string | null;
    captured_at: string;
}
/**
 * A located documentation obligation. Lives in `state.json.docs_obligations`,
 * identically for the classic and goal workflows, which is what lets the
 * archive gate read one place regardless of profile.
 */
export interface DocsObligation {
    id: string;
    /** Originating `change_type`, verbatim after alias folding. Diagnostic only. */
    change_type: string;
    kind: DocsObligationKind;
    level: DocsObligationLevel;
    /** Feature slug, when one resolved. Absent when no document exists yet. */
    feature?: string;
    /** Repo-relative document path, `/` separators, no fragment. */
    path: string;
    /** Heading text exactly as written; '' when the section does not exist yet. */
    section: string;
    /**
     * `path#section`, or bare `path` when there is no section. Split fields are
     * authoritative: a heading may legally contain '#', so re-splitting this is
     * lossy. It exists so the AI and the checklist have one string to show.
     */
    target: string;
    verification_only: boolean;
    reason: string;
    suggestion?: string;
    baseline?: DocsObligationBaseline;
    evidence?: DocsObligationEvidence;
}
export interface DocsObligationVerdict {
    id: string;
    level: DocsObligationLevel;
    status: 'satisfied' | 'unsatisfied';
    message: string;
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
    /** 7.6. Absent means `warn`, the default for this release cycle. */
    docs_contract?: DocsContractConfig;
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
        model_profiles?: Partial<Record<AgentModelProfileId, AgentModelProfileConfig>>;
    };
}
export interface FeatureState {
    version: string;
    feature: string;
    mode: ProjectMode;
    workflow_profile_id?: WorkflowProfileId;
    status: FeatureStatus;
    current_step: string;
    affects: string[];
    /**
     * Phase 7 feature slugs this change touches. Written at creation by 7.5's
     * feature capture and again at archive time by 7.7; both tracks arrived at
     * the same field, and it is one field rather than two on purpose. The index
     * unions it with the proposal's `features:` when the change is archived
     * (contract 6.2), so the two are kept consistent rather than one shadowing
     * the other.
     */
    features?: string[];
    /**
     * 7.6: the located documentation obligations for this change. THE record --
     * the task graph's `documentation_updates` and the classic closeout checklist
     * are derived delivery surfaces, not sources. If they ever disagree with this
     * list, this list wins.
     */
    docs_obligations?: DocsObligation[];
    completed: string[];
    pending: string[];
    blocked_by: string[];
    queued_at?: string;
    activated_at?: string;
    queue_source?: string;
    activation_source?: string;
    last_updated: string;
    /**
     * 7.7: the `path#section` targets this change updated, resolved from the
     * slugs above against the index's `feature_docs` map at archive time.
     */
    doc_updates?: string[];
}
export interface ProposalFrontmatter {
    name: string;
    status: 'queued' | 'active' | 'archived';
    created: string;
    affects: string[];
    flags: string[];
    /**
     * Phase 7 feature slugs this change touches (7.5). Always emitted, possibly
     * `[]` -- a change may legitimately match no feature, and the list can be
     * filled in during planning. These are `SkillIndex.feature_docs` slugs, NOT
     * the unrelated `IndexDocument.features`; see the naming trap in the wave-1
     * contract 6.1.
     */
    features?: string[];
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
/**
 * The documentation category a document or binding belongs to, inferred from
 * its path under `docs/`. `feature` is `docs/features/` (the living feature
 * documents); the rest mirror the sibling directory names. Anything outside
 * the recognised tree is `other`, never a guess.
 */
export type DocBindingKind = 'project' | 'api' | 'design' | 'planning' | 'feature' | 'product' | 'other';
export interface IndexDocument {
    file: string;
    title: string;
    tags: string[];
    kind: DocBindingKind;
    sections: Record<string, SkillSection>;
    /**
     * NOT feature slugs. This is the pre-existing `features:` frontmatter list,
     * merged with the `feature` (= change name) of every archived change that
     * listed this document in `project_documents`. Phase 7 feature slugs live in
     * `SkillIndex.feature_docs`, which is a different namespace with a different
     * meaning. Do not cross-read them.
     */
    features?: string[];
    modules?: string[];
    aliases?: string[];
}
/**
 * One `<!-- ospec:feature <slug> code:a,b -->` declaration, bound to the
 * heading it sits under.
 *
 * `start`/`end` are indices into the document's NORMALISED BODY -- the file
 * read as UTF-8, BOM stripped, CRLF/CR folded to LF, with the YAML frontmatter
 * block removed. That is the same coordinate space as `SkillSection.start/end`,
 * so one `slice(start, end)` yields the heading line plus the whole section:
 *
 *   const body = parseFrontmatterDocument(
 *     readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'),
 *   ).content;
 *   const section = body.slice(declaration.start, declaration.end);
 *
 * `end` is the start of the next heading whose level is <= this one's, or the
 * body length. Sub-headings therefore stay INSIDE the feature -- which is why
 * this is not `sections[heading].end`, whose next-heading-of-any-level rule
 * would cut the section at its first `###`.
 */
export interface FeatureDeclaration {
    slug: string;
    heading: string;
    level: number;
    start: number;
    end: number;
    /** Repo-relative path prefixes, de-duplicated and sorted. May be empty. */
    code: string[];
    /** Archive name from a trailing `<!-- ospec:last-change ... -->`, if present. */
    last_change?: string;
}
/** A `FeatureDeclaration` plus the document it was found in. */
export interface FeatureDocEntry extends FeatureDeclaration {
    file: string;
    /**
     * The documentation category of the declaring document, inferred from its
     * path at registration time. Absent in indexes built before 2.1; readers
     * treat a missing value as `feature`.
     */
    kind?: DocBindingKind;
}
export interface ArchivedChangeIndexEntry {
    /** The CHANGE name, not a feature slug. Predates Phase 7; kept as-is. */
    feature: string;
    summary: string;
    affects: string[];
    archive: string;
    completed_at: string | null;
    documents: string[];
    project_documents?: string[];
    /** Phase 7 feature slugs this change touched. Always emitted, possibly `[]`. */
    features?: string[];
    /** `path#section` targets this change updated. Always emitted, possibly `[]`. */
    doc_updates?: string[];
    target_files?: string[];
    verification_commands?: string[];
    workflow_profile?: string;
    disposition?: 'completed' | 'forced';
    completion_status?: 'completed' | 'incomplete';
    accepted_risk?: boolean;
    force_archive_reason?: string;
    failing_checks?: string[];
    archived_at?: string;
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
    documents?: Record<string, IndexDocument>;
    archived_changes?: ArchivedChangeIndexEntry[];
    /**
     * Feature slug -> the living feature-document section that declares it.
     * Keyed by slug (sorted), which is why it is a sibling of `documents` rather
     * than a field inside it: `documents` is keyed by path.
     */
    feature_docs?: Record<string, FeatureDocEntry>;
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
    workflowProfile: WorkflowProfileId;
    activatedSteps: string[];
    summaryStatus: ChangeSummaryStatus;
    failCount: number;
    warnCount: number;
    archiveReady: boolean;
    checks: ChangeStatusCheck[];
    closeoutState?: FeatureState;
}
export interface ActiveChangeStatusReport {
    totalActiveChanges: number;
    totals: Record<ChangeSummaryStatus, number>;
    changes: ActiveChangeStatusItem[];
    /**
     * M-race1: changes whose `state.json` could not be parsed. They are absent
     * from `changes` because nothing true can be said about their status, but
     * they are named here so "unreadable" never renders as "not present".
     */
    damagedChanges: Array<{
        name: string;
        reason: string;
    }>;
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
export interface QueueRunTaskGraphSnapshot {
    exists: boolean;
    path: string;
    status: string;
    taskCount: number;
    readyCount: number;
    dispatchableCount: number;
    runningCount: number;
    completedCount: number;
    concernCount: number;
    blockedCount: number;
    invalidCount: number;
    issueCount: number;
    nextInstruction: string | null;
}
export interface QueueRunStatusReport {
    currentRun: QueueRunRecord | null;
    stage: string | null;
    activeChange: {
        name: string;
        path: string;
        status: FeatureState['status'];
    } | null;
    taskGraph: QueueRunTaskGraphSnapshot | null;
    queuedChanges: QueuedChangeStatusItem[];
    logTail: string[];
    nextInstruction: string | null;
}
export type WorkflowStep = 'proposal_complete' | 'tasks_complete' | 'implementation_complete' | 'skill_updated' | 'index_regenerated' | 'tests_passed' | 'verification_passed' | 'archived';
