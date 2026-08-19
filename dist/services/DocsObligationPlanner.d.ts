import { DocsObligation, SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
import { FeatureCaptureService } from './FeatureCaptureService';
import { DocsObligationService } from './DocsObligationService';
/**
 * 7.6 delivery: turn a change's obligations into the two surfaces the AI
 * actually reads, and write the record they are derived from.
 *
 * THE RECORD is `state.json.docs_obligations`. Both surfaces below are
 * regenerated from it and neither is authoritative:
 *
 *   goal    -> `task-graph.json` tasks[].documentation_updates gains the
 *              obligation's document path, and the task's `target_files` gains
 *              it too (the existing gate requires that pairing).
 *   classic -> a closeout checklist item in `tasks.md` carrying the resolved
 *              `path#section`.
 *
 * The whole point of resolving the target here is that the AI never has to
 * search for where to write. A checklist item that says "update the docs" is
 * the thing this replaces.
 */
export interface ObligationPlanResult {
    changeType: string;
    obligations: DocsObligation[];
    features: string[];
    /**
     * Non-empty when `features` was resolved from `affects` because nothing was
     * declared. These slugs generate real obligations but are NOT written back
     * into the proposal -- the declaration stays the AI's to confirm.
     */
    features_via_affects: string[];
    /** Delivery surfaces actually written; empty on a dry run. */
    written: string[];
    mode: 'warn' | 'strict';
}
/**
 * The `documentation_updates` gate stores PATHS, not `path#section`: it
 * resolves each entry on the filesystem and hashes it. Injecting a fragment
 * would make every entry an unsafe path and fail the change for a reason that
 * has nothing to do with documentation. The section half travels in the
 * obligation record, which is where the AI reads it from.
 */
export declare function obligationDocumentPath(obligation: DocsObligation): string;
export declare class DocsObligationPlanner {
    private readonly fileService;
    private readonly obligations;
    private readonly capture;
    constructor(fileService: FileService, obligations: DocsObligationService, capture: FeatureCaptureService);
    /**
     * Generate this change's obligations from its proposal, stamp each with its
     * planning-time baseline, and (when `apply`) write the record plus both
     * delivery surfaces.
     */
    plan(projectRoot: string, featureDir: string, options?: {
        apply?: boolean;
        config?: SkillrcConfig | null;
    }): Promise<ObligationPlanResult>;
    /**
     * Keep the ORIGINAL baseline and any recorded evidence for an obligation that
     * this run regenerated unchanged (same target, same kind).
     *
     * Without this, re-running `--apply` re-baselines against the CURRENT
     * document, and both failure directions are real:
     *
     *  - run it after doing the documentation work and the new baseline equals
     *    the finished text, so the obligation can never be satisfied without a
     *    second, pointless edit;
     *  - run it after `ospec docs confirm` and the recorded `verified_unchanged`
     *    is silently dropped, so a refactor that was properly confirmed starts
     *    failing again with no explanation.
     *
     * Re-planning should decide WHICH obligations exist, not erase what is
     * already known about the ones that survive. An obligation whose kind or
     * target changed is genuinely a different obligation and is re-baselined.
     */
    private carryForward;
    /**
     * Goal delivery. Appends the obligation's document to every task that already
     * declares `documentation_updates`, or -- when no task does -- to the LAST
     * task, so the obligation lands somewhere a worker will see it rather than
     * being silently dropped.
     */
    private injectIntoTaskGraph;
    /**
     * Classic delivery. Replaces the managed block in `tasks.md` in place, so
     * running the planner twice does not accumulate duplicate checklist items --
     * the same idempotence rule 7.7 applies to the traceability comment.
     */
    private injectIntoClassicChecklist;
    /**
     * Record the explicit "I looked and it is still accurate" confirmation for a
     * verification-type obligation.
     *
     * Refuses on any other kind, loudly. Accepting it everywhere would turn every
     * obligation into a self-certified one, which is the same shape as a gate
     * that passes because nothing was checked.
     */
    confirmUnchanged(featureDir: string, obligationId: string, note?: string): Promise<{
        ok: boolean;
        message: string;
    }>;
}
export declare function createDocsObligationPlanner(fileService: FileService, obligations: DocsObligationService, capture: FeatureCaptureService): DocsObligationPlanner;
