import { ChangeStatusCheck, DocsObligation, DocsObligationMode, DocsObligationVerdict, FeatureDocEntry } from '../core/types';
import { FileService } from './FileService';
export declare const DOCS_OBLIGATION_CHANGE_TYPES: readonly ["feature", "fix", "refactor", "perf", "deprecate", "remove", "docs"];
export type DocsObligationLanguage = 'zh-CN' | 'en-US' | 'ja-JP' | 'ar';
export interface DocsObligationGenerationInput {
    changeType: string;
    /** Feature slugs captured by 7.5. May be empty. */
    features?: string[];
    /** `SkillIndex.feature_docs`, the resolved-target source. */
    featureDocs?: Record<string, FeatureDocEntry>;
    /** Used only to name a plausible new document when nothing resolves. */
    changeName?: string;
    language?: DocsObligationLanguage;
}
export interface DocsObligationEvaluationInput {
    obligations: DocsObligation[];
    projectRoot: string;
}
/**
 * The `affects` fallback: which declared features' `code:` prefixes cover the
 * paths this change says it touches.
 *
 * `features:` is the AI's confirmed declaration and stays authoritative -- this
 * is consulted ONLY when that list is empty. Without it, a change whose
 * `affects` lands squarely inside a documented feature still generated the
 * degraded optional obligation, because the engine read one field and never
 * looked at the other -- the exact information was already on disk, resolvable
 * by `docs locate --affects`, and ignored. Matching reuses `codePrefixMatches`
 * so this cannot drift from what `docs locate` would answer for the same path.
 */
export declare function resolveFeaturesFromAffects(affects: string[], featureDocs: Record<string, FeatureDocEntry>): string[];
export declare class DocsObligationService {
    private readonly fileService;
    constructor(fileService: FileService);
    /** Fold the legacy vocabulary onto the design-doc 3 vocabulary. */
    normalizeChangeType(changeType: string): string;
    /**
     * The change_type -> obligation table from the design doc 3.
     *
     * Note what is deliberately NOT here: an `unclassified` fallback that invents
     * a required obligation. An unrecognised change_type produces NO obligation,
     * because guessing a target would point the AI at the wrong section, and a
     * confidently wrong location is worse than none.
     */
    generate(input: DocsObligationGenerationInput): DocsObligation[];
    private slugify;
    /**
     * Hash the obligation's target SECTION, not the whole file. A feature
     * document holds many features; hashing the file would mark every obligation
     * in it satisfied the moment a single unrelated section was touched -- a gate
     * that passes for work that was never done.
     *
     * Falls back to the whole body when the section cannot be located, and
     * returns null when the file does not exist.
     */
    hashTarget(projectRoot: string, obligation: Pick<DocsObligation, 'path' | 'section' | 'feature'>): Promise<string | null>;
    private resolveSafe;
    /** Stamp each obligation with the state of its target at planning time. */
    captureBaselines(projectRoot: string, obligations: DocsObligation[]): Promise<DocsObligation[]>;
    /**
     * THE single satisfaction decision. Mode-blind by construction: nothing in
     * this method reads `docs_contract.mode`, so warn and strict cannot form
     * different opinions about whether an obligation was met.
     */
    evaluate(input: DocsObligationEvaluationInput): Promise<DocsObligationVerdict[]>;
    /**
     * Map verdicts onto gate checks. This is the ONLY place `mode` is read.
     *
     * `warn` is the default for one release cycle: a gate that blocks on day one
     * is a gate that gets worked around, and the obligation list has to earn
     * trust on real projects before it can refuse an archive.
     */
    applyMode(verdicts: DocsObligationVerdict[], mode: DocsObligationMode): ChangeStatusCheck[];
}
export declare function createDocsObligationService(fileService: FileService): DocsObligationService;
