/**
 * P8.5 -- `ospec docs coverage` and the `ospec docs bind` pipeline: how a
 * project with existing documentation (and existing undocumented code) is
 * brought under the binding engine.
 *
 * Coverage is the INVERSE of `ospec docs audit`. Audit walks the bindings and
 * asks "did the code move while the document stood still?"; coverage walks the
 * CODE surface and asks "which areas have no binding at all?" -- the areas the
 * obligation engine cannot see, because obligations are generated from
 * bindings and nothing else.
 *
 * Bind mirrors the `ospec docs migrate` pipeline shape, because that shape has
 * already survived contact with real projects:
 *
 *   1. `--plan [--apply]`   engine, deterministic. Inventory every unbound
 *                           document and every uncovered code area, suggest a
 *                           slug/heading/code for each from on-disk evidence,
 *                           and write `docs-binding-plan.json`. Never edits a
 *                           document.
 *   2. (no flag)            a person. Adjudicates each entry: `bind`,
 *                           `reference`, `historical`, or -- for uncovered
 *                           areas -- `create` / `uncovered_accepted`. Edits
 *                           slugs, headings and code paths freely.
 *   3. `--execute [--apply]` engine, mechanical. Inserts the adjudicated
 *                           `<!-- ospec:doc -->` declarations and writes draft
 *                           skeletons for `create` areas. A declaration
 *                           comment is derived data; PROSE IS NEVER WRITTEN.
 *   4. `--verify`           engine gate. Lists everything still unadjudicated
 *                           or unapplied, and fails while any gap remains.
 *
 * Re-running `--plan --apply` MERGES: a verdict a person has set, and the
 * slug/heading/code fields they may have edited, are never regenerated --
 * only the evidence refreshes. That is the same contract migrate's plan file
 * keeps for `historical` and regrouping.
 */
export declare const BINDING_PLAN_FILE = "docs-binding-plan.json";
export type BindingVerdict = 'pending' | 'bind' | 'reference' | 'historical';
export type MissingVerdict = 'pending' | 'create' | 'uncovered_accepted';
export interface BindingPlanEntry {
    file: string;
    kind: DocBindingKind;
    verdict: BindingVerdict;
    /** Suggested (then human-owned) binding target. */
    slug: string;
    heading: string;
    code: string[];
    evidence: {
        /** Archived changes that listed this document as updated. */
        archives: string[];
        /** Candidate code prefixes, most frequent first, with their source. */
        candidates: {
            prefix: string;
            source: 'archive' | 'module' | 'git';
        }[];
    };
}
export interface MissingDocEntry {
    /** The uncovered code area, as a repo-relative path prefix. */
    area: string;
    verdict: MissingVerdict;
    slug: string;
    suggested_path: string;
    archive_count: number;
    /** Of those, archives that recorded no documentation update at all. */
    undocumented_count: number;
    archives: string[];
}
export interface BindingPlan {
    version: string;
    generated: string;
    entries: BindingPlanEntry[];
    missing: MissingDocEntry[];
}
export interface CoverageArea {
    area: string;
    source: 'module' | 'affects';
    covered: boolean;
    accepted: boolean;
    archive_count: number;
    undocumented_count: number;
    archives: string[];
}
export interface CoverageResult {
    available: boolean;
    reason?: string;
    areas: CoverageArea[];
    bound_prefixes: number;
    uncovered: number;
    accepted: number;
}
export interface BindExecuteResult {
    applied: boolean;
    declared: {
        file: string;
        slug: string;
    }[];
    drafted: {
        file: string;
        slug: string;
    }[];
    skipped: {
        file: string;
        reason: string;
    }[];
    writes: string[];
}
export interface BindVerifyResult {
    ok: boolean;
    gaps: {
        kind: string;
        detail: string;
    }[];
    checked: {
        entries: number;
        missing: number;
    };
}
export declare class DocsBindingService {
    private resolve;
    planPath(projectRoot: string): Promise<string>;
    readPlan(projectRoot: string): Promise<BindingPlan | null>;
    private readIndex;
    private git;
    /**
     * The code surface, as a deterministic list of AREAS: the directory of every
     * module SKILL.md, plus the leading segments of every code path an archived
     * change ever declared in `affects` that no module area already covers.
     * Index-only and cheap on purpose -- coverage runs as a report, not a gate.
     */
    private enumerateAreas;
    /** Archived changes whose `affects` reach into the given area. */
    private archivesTouching;
    coverage(projectRoot: string): Promise<CoverageResult>;
    /**
     * Candidate code prefixes for one document, from the three evidence sources.
     * Ranked by how many independent observations point at each prefix; capped
     * so a suggestion stays a suggestion and not a dump.
     */
    private suggestCode;
    plan(projectRoot: string, options?: {
        apply?: boolean;
        git?: boolean;
    }): Promise<{
        plan: BindingPlan;
        preserved: number;
        writes: string[];
    }>;
    /**
     * Insert one `<!-- ospec:doc -->` line under the entry's heading. The BOM
     * and the file's dominant line-ending style survive; a mixed-EOL file is
     * normalised to that dominant style. Returns a reason instead of guessing
     * when the heading is gone or the section already carries a declaration.
     *
     * Fence-aware, and it MUST be: `parseFeatureDeclarations` skips fenced
     * lines, so matching a heading that only exists inside a ``` block would
     * write the declaration into a user's example, the validating parse would
     * still pass (it sees no fenced declaration), and the slug would never
     * register -- a pipeline deadlock the fence flags prevent.
     */
    private insertDeclaration;
    private draftSkeleton;
    execute(projectRoot: string, options?: {
        apply?: boolean;
    }): Promise<BindExecuteResult>;
    verify(projectRoot: string): Promise<BindVerifyResult>;
}
export declare const docsBindingService: DocsBindingService;
export declare const RETIRED_DOCS_DIR = "changes/archived/retired-docs";
export interface RetireEntry {
    file: string;
    to: string;
    title?: string;
    superseded_by?: string;
}
export interface RetireResult {
    applied: boolean;
    retired: RetireEntry[];
    refused: {
        file: string;
        reason: string;
    }[];
    manifest: string | null;
}
/**
 * P8: `ospec docs retire` -- the destructive end of the document lifecycle,
 * shaped like `docs migrate --finalize`: a person marks a document
 * `status: deprecated` first, the engine collects, prints, RECORDS, and only
 * then moves. Nothing is ever plain-deleted; a retired document goes to
 * `changes/archived/retired-docs/<original path>` with a manifest row saying
 * when and why, because "delete" in this system always means "archive".
 *
 * The one guard: a deprecated document whose bindings still point at living
 * code is refused unless it names a `superseded_by`. Retiring the only
 * documentation of code that still exists is the exact loss this pipeline
 * exists to prevent; naming a successor is the explicit statement that the
 * knowledge lives somewhere else now.
 */
import { DocBindingKind } from '../core/types';
export declare class DocsRetireService {
    private resolve;
    retire(projectRoot: string, options?: {
        apply?: boolean;
    }): Promise<RetireResult>;
}
export declare const docsRetireService: DocsRetireService;
