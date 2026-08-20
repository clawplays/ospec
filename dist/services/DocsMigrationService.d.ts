/**
 * 7.9: `ospec docs migrate` -- the four-phase pipeline that lets an existing
 * project stop carrying the artefacts 7.7 stopped producing.
 *
 * THE OWNER SET THE PRINCIPLE EXPLICITLY, and it is the reason this is a
 * pipeline rather than a delete command: read every old document, convert its
 * content into the new design, have the engine VERIFY coverage is complete,
 * and only then allow deletion. Phase 4 is unreachable until phase 3 says
 * every old knowledge document's archive is either represented in a living
 * feature section or has been explicitly declared pure history by a person.
 *
 *   1. `--plan`      engine, deterministic. Inventory + cluster + draft skeletons.
 *   2. (no flag)     AI. Rewrites the drafts into behaviour descriptions. The
 *                    engine does not write prose; the skill docs carry the
 *                    instructions, in four languages.
 *   3. `--verify`    engine gate. Refuses to proceed on any gap.
 *   4. `--finalize`  destructive, requires `--apply`. Prints and records the
 *                    file list BEFORE deleting it.
 *
 * Every phase is dry-run unless `--apply` is passed, which is what "全程默认
 * dry-run 语义" asks for: `ospec docs migrate --plan` shows what it would
 * create and creates nothing.
 */
export declare const MIGRATION_STATE_FILE = "docs-migration.json";
export declare const MIGRATION_PLAN_FILE = "docs-migration-plan.json";
export declare const LEGACY_GENERATOR = "ospec-archive-knowledge";
export declare const DRAFT_MARKER = "<!-- ospec:migration-draft -->";
export interface MigrationArchivePlan {
    archive: string;
    feature: string;
    summary: string;
    affects: string[];
    target_files: string[];
    verification_commands: string[];
    /** Candidate feature group, or null when nothing could be inferred. */
    group: string | null;
    /** The legacy knowledge document for this archive, when one exists on disk. */
    knowledge_document: string | null;
    /**
     * Set to `true` BY A PERSON, in the plan file, to mean "pure history, no
     * surviving feature". Phase 3 accepts it in place of a traceability comment.
     * `--plan` preserves it across re-runs; nothing in the engine ever sets it.
     */
    historical: boolean;
}
export interface MigrationGroupPlan {
    domain: string;
    document: string;
    archives: string[];
    paths: string[];
}
export interface MigrationPlan {
    version: '1.0';
    legacy: {
        knowledge_documents: string[];
        feature_index: string | null;
        indexed_generated_documents: string[];
    };
    archives: MigrationArchivePlan[];
    groups: MigrationGroupPlan[];
    unclassified: string[];
}
export interface MigrationState {
    version: '1.0';
    phase: 'planned' | 'verified' | 'finalized';
    planned_at?: string;
    verified_at?: string;
    finalized_at?: string;
    deleted_files?: string[];
    plan_file?: string;
}
export interface PlanResult {
    plan: MigrationPlan;
    /** Repository-relative paths this phase wrote, or would write on --apply. */
    writes: string[];
    drafts: {
        path: string;
        content: string;
    }[];
    applied: boolean;
    /** Archives whose human-set fields were carried over from a previous plan. */
    preserved: string[];
}
export interface VerifyGap {
    kind: 'unmapped-archive'
    /** In the inventory finalize deletes from, but claimed by no archive. */
     | 'unmapped-document' | 'draft-remaining' | 'duplicate-slug' | 'index-rebuild' | 'catalog';
    detail: string;
}
export interface VerifyResult {
    ok: boolean;
    gaps: VerifyGap[];
    checked: {
        archives: number;
        mapped: number;
        historical: number;
        features: number;
    };
}
export interface FinalizeResult {
    applied: boolean;
    /** Printed and recorded BEFORE anything is removed. */
    deleted: string[];
    kept: string[];
    notes: string[];
}
/**
 * The domain segment of a repository path: the first segment that is not a
 * source root, with any extension dropped.
 *
 * `src/auth/session.ts` -> `auth`; `packages/core/src/index.ts` -> `core`;
 * `README.md` -> `readme`. Deterministic and boring on purpose -- this only
 * has to produce a CANDIDATE grouping for a person to correct in phase 2, and
 * a clever heuristic that is wrong in an interesting way is worse than a dull
 * one that is wrong in an obvious way.
 */
export declare function domainOfPath(candidate: string): string | null;
/**
 * The candidate group for one archive: the domain that the most of its paths
 * agree on. Ties break by code point so two machines produce the same plan.
 */
export declare function clusterArchive(paths: string[]): string | null;
/** The draft-skeleton wording an AI or a person reads, per document language. */
export interface MigrationDraftCopy {
    title(domain: string): string;
    guide: string[];
    toBeRewritten: string;
    whatTheChangeSaid: string;
    affects: string;
    files: string;
    verifiedBy: string;
    archive: string;
    fullDetail: string;
}
/**
 * Same rule as `featureCatalogCopy` and the obligation engine's copy table:
 * text the engine writes INTO a project document follows the project's
 * `documentLanguage`. The `name:` slug, `status: draft` and the DRAFT_MARKER
 * comment stay machine strings -- verify greps for them verbatim.
 */
export declare function migrationDraftCopy(documentLanguage: string | undefined): MigrationDraftCopy;
export declare class DocsMigrationService {
    private resolve;
    statePath(projectRoot: string): Promise<string>;
    planPath(projectRoot: string): Promise<string>;
    readState(projectRoot: string): Promise<MigrationState | null>;
    readPlan(projectRoot: string): Promise<MigrationPlan | null>;
    private writeState;
    /**
     * Every legacy artefact on disk: documents carrying
     * `generator: ospec-archive-knowledge`, the generated feature-index, and any
     * generated-document entry still sitting in a committed `documents` map.
     *
     * Detection is by FRONTMATTER MARKER, not by path. A human-owned file under
     * docs/project/changes/ is not a legacy artefact and must never be swept up
     * -- now that nothing generates into that directory, a person is free to
     * keep notes there.
     */
    inventory(projectRoot: string): Promise<MigrationPlan['legacy']>;
    /**
     * Phase 1. Deterministic: the same tree produces the same plan, so a re-run
     * after an interruption is safe and a diff between two runs is meaningful.
     *
     * Re-running MERGES rather than clobbers. `historical` and a corrected
     * `group` are set by a person, in the plan file, between phases 1 and 3 --
     * so regenerating the plan must carry them over or the pipeline would eat
     * the human judgement it depends on. That is also what makes the pipeline
     * resumable: re-run `--plan` at any point and the human edits survive.
     */
    plan(projectRoot: string, options?: {
        apply?: boolean;
    }): Promise<PlanResult>;
    /**
     * The draft skeleton. Raw material for the AI, marked unmistakably as such:
     * `status: draft` in frontmatter, the DRAFT_MARKER comment, and a sentence
     * per section saying what has to replace it. It deliberately carries NO
     * `ospec:feature` declaration -- phase 2 adds those, and a draft that
     * registered slugs would make the index treat unfinished material as a
     * living feature document.
     */
    private renderDraft;
    /**
     * Phase 3. The gate. Every gap is COLLECTED and listed rather than thrown on
     * the first one -- someone finishing a migration wants the whole remaining
     * list, not one item at a time.
     */
    verify(projectRoot: string): Promise<VerifyResult>;
    /** Every document under docs/ still carrying a draft marker. */
    findDrafts(projectRoot: string): Promise<string[]>;
    /**
     * Phase 4. Destructive, and gated twice: `verify` must have passed, and
     * `--apply` must be present.
     *
     * The deleted list is computed and RETURNED before anything is removed, so
     * the caller prints it and it reaches the completion record even if a delete
     * fails halfway. "Print and record before deleting" is the auditability
     * requirement, and doing it after would make the record a description of
     * what survived rather than of what was destroyed.
     */
    finalize(projectRoot: string, options?: {
        apply?: boolean;
    }): Promise<FinalizeResult>;
    /**
     * True when feature-index.md has been frozen by track A's 7.4 -- it carries
     * `historical: true` in its frontmatter, which is the latch that stops the
     * index build regenerating it. A frozen file is safe to delete because
     * nothing will write it back.
     */
    private isFrozenFeatureIndex;
    private pruneEmptyDirectories;
    /**
     * What `ospec update` needs: is there anything to migrate? It MENTIONS the
     * command and never runs it -- an upgrade that silently deleted a project's
     * documents would be the worst possible reading of "update".
     */
    detectUnmigrated(projectRoot: string): Promise<{
        found: boolean;
        counts: {
            knowledgeDocuments: number;
        };
    }>;
}
export declare const docsMigrationService: DocsMigrationService;
