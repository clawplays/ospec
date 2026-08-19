import type { FeatureDeclaration } from '../core/types';
export interface TraceabilityUpdate {
    slug: string;
    file: string;
    action: 'replaced' | 'appended' | 'unchanged';
}
export interface TraceabilityResult {
    updates: TraceabilityUpdate[];
    warnings: string[];
}
export declare function renderLastChangeComment(archiveName: string): string;
/**
 * The archive name must be a single non-whitespace token (contract 2.3). A
 * name with a space in it would parse back as a different token and make the
 * next replacement miss, so it is refused here rather than written.
 */
export declare function isWritableArchiveName(archiveName: string): boolean;
/**
 * Put the comment in one section of one already-split body.
 *
 * Exported for the idempotency test, which needs to assert the second call is
 * a pure no-op at the string level rather than inferring it from the file.
 */
export declare function applyToSection(body: string, declaration: Pick<FeatureDeclaration, 'start' | 'end'>, archiveName: string): {
    body: string;
    action: TraceabilityUpdate['action'];
};
/**
 * Record `archiveName` as the last change of every feature in `slugs`.
 *
 * `featureDocs` is the index's `feature_docs` map, used ONLY to find which file
 * declares each slug. Never throws; the caller archives regardless.
 */
export declare function writeTraceabilityComments(projectRoot: string, featureDocs: Record<string, {
    file?: string;
}> | undefined, slugs: string[], archiveName: string): Promise<TraceabilityResult>;
