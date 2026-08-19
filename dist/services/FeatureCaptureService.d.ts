import { FeatureDocEntry, SkillrcConfig } from '../core/types';
import { FileService } from './FileService';
export interface FeatureSuggestion {
    slug: string;
    file: string;
    heading: string;
    /** Why this slug was suggested, in words the AI and a human can both read. */
    reason: string;
    /** Higher is a better match. Used only for ordering. */
    score: number;
}
export interface FeatureCaptureResult {
    /** The slugs to write into `features:`. Explicit `--feature` values only. */
    features: string[];
    /** Candidates for the AI (or a human) to confirm. Never auto-accepted. */
    suggestions: FeatureSuggestion[];
    /** `--feature` values that name no declared slug. Kept, with a warning. */
    unknown: string[];
    /** `--feature` values rejected by the slug grammar. Never written. */
    invalid: string[];
}
export declare class FeatureCaptureService {
    private readonly fileService;
    constructor(fileService: FileService);
    /**
     * Read `feature_docs` out of the committed index. Returns `{}` for a project
     * with no index, no declarations, or an unreadable index -- suggestion is a
     * convenience, and a damaged index must not block creating a change.
     */
    readFeatureDocs(rootDir: string, config?: Pick<SkillrcConfig, 'projectLayout'> | null): Promise<Record<string, FeatureDocEntry>>;
    /**
     * Split a change name (or any phrase) into scoring keywords. `kebab-case`,
     * `snake_case`, `camelCase` and spaces all decompose; stop words and
     * single-character fragments drop out.
     */
    keywords(text: string): string[];
    /**
     * Suggest feature slugs for a change, from `affects` paths and from keywords
     * in the change name.
     *
     * Two independent signals, deliberately scored differently:
     *  - an `affects` path covered by a feature's `code:` prefix is near-certain,
     *    so it outranks everything and orders by longest matching prefix, exactly
     *    as contract 2.2 defines for `docs locate --affects`;
     *  - a keyword shared with the slug or heading is a hint, nothing more.
     */
    suggest(featureDocs: Record<string, FeatureDocEntry>, input: {
        changeName?: string;
        affects?: string[];
    }): FeatureSuggestion[];
    /**
     * Turn the raw repeated `--feature` values plus the project index into the
     * list to write and the candidates to show.
     *
     * An unknown-but-well-formed slug is KEPT, not dropped. A change may legally
     * introduce the first document for a feature that does not exist yet, and
     * refusing the slug would make the new-feature case the awkward one. A slug
     * that violates the grammar is dropped, because wave 1 fails the index
     * rebuild on it (contract 5) and writing it would wedge the project later.
     */
    capture(rootDir: string, input: {
        changeName?: string;
        affects?: string[];
        features?: string[];
    }, config?: Pick<SkillrcConfig, 'projectLayout'> | null): Promise<FeatureCaptureResult>;
}
export declare function createFeatureCaptureService(fileService: FileService): FeatureCaptureService;
