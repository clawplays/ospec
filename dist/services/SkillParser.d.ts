/**
 * SKILL parsing service.
 */
import { DocBindingKind, FeatureDeclaration, FeatureDocEntry, SkillFrontmatter, SkillSection } from '../core/types';
interface ParsedSkillFrontmatter {
    data: SkillFrontmatter;
    content: string;
}
export declare class SkillParser {
    /**
     * Parse SKILL.md frontmatter and content.
     */
    parseFrontmatter(content: string): ParsedSkillFrontmatter;
    /**
     * Extract heading structure from Markdown.
     */
    extractSections(content: string): Record<string, SkillSection>;
    /**
     * Fully parse a SKILL.md file.
     */
    parseSkillFile(content: string): {
        frontmatter: SkillFrontmatter;
        sections: Record<string, SkillSection>;
        content: string;
    };
    /**
     * Feature declarations in a document's NORMALISED BODY.
     *
     * Pass the same string whose `sections` you hold -- `parseSkillFile`'s
     * `content`, or `parseFrontmatterDocument(...).content` -- so the offsets
     * land in one coordinate space. Throws on a malformed declaration; returns
     * `[]` for a document that simply declares no features.
     */
    extractFeatureDeclarations(body: string, filePath?: string): FeatureDeclaration[];
    /**
     * The exact text of a declared feature's section, from a RAW file read.
     *
     * The one supported way to turn `(start, end)` back into prose. Callers
     * that slice a raw CRLF file themselves get the wrong bytes on Windows,
     * which is why this exists instead of a documented recipe alone.
     */
    sliceFeatureSection(rawContent: string, declaration: Pick<FeatureDeclaration, 'start' | 'end'>): string;
    private extractDocumentTitle;
}
export declare const skillParser: SkillParser;
/**
 * Every feature declared in one document, in document order.
 *
 * Fenced code blocks are skipped for BOTH headings and declarations, so the
 * convention can be written out inside a ``` block without registering itself
 * as a feature, and a fenced `## example` cannot truncate a real feature's
 * range. `extractSections` does not skip fences -- a documented difference, and
 * the safe direction to differ in.
 *
 * Throws on anything malformed. It never throws on ABSENCE: a section with no
 * declaration is not a feature, and that is a normal document, not an error.
 */
export declare function parseFeatureDeclarations(content: string, filePath?: string): FeatureDeclaration[];
/**
 * The documentation category a declaring document belongs to, from its
 * repo-relative path. `docs/features/` maps to `feature`; the sibling
 * directories map to their own names; anything outside the recognised tree is
 * `other`, never a guess. Works for classic (`docs/...`) and nested
 * (`.ospec/docs/...`) layouts alike, because both carry the `docs/<dir>/`
 * segment pair.
 */
export declare function inferBindingKind(relativePath: string): DocBindingKind;
/**
 * Adds one document's declarations to the project-wide slug map, failing on a
 * duplicate slug.
 *
 * B4 fail-loud. A slug is the only handle `ospec docs locate` has, so two
 * sections answering to one slug is an ambiguity no later stage can resolve,
 * and a silent last-writer-wins would make a feature's documentation vanish
 * from the index without a word. The message names BOTH locations, because
 * "duplicate slug x" alone leaves the reader grepping.
 *
 * The two paths are sorted before printing -- plain code-unit order, which
 * only decides which is printed first -- so the message does not depend on
 * walk order.
 */
export declare function registerFeatureDeclarations(featureDocs: Record<string, FeatureDocEntry>, file: string, declarations: FeatureDeclaration[]): void;
/**
 * Feature slugs read off an archived change's `proposal.md` / `state.json`.
 *
 * 7.2. Unlike a live feature document, an ARCHIVE is immutable history: an old
 * proposal carrying a slug that predates the naming rule must not be able to
 * wedge `ospec index build` forever. So an entry that is not a valid slug is
 * dropped here rather than thrown on. The fail-loud rule applies where the
 * author can still act -- a declaration in a living document.
 */
export declare function readFeatureSlugList(value: unknown): string[];
/**
 * `path#section` targets an archived change updated.
 *
 * The path half is normalised the way every other indexed path is -- POSIX
 * separators, no leading `./` -- so a Windows-authored `docs\features\a.md#X`
 * and a POSIX one land on the same string. The section half is left exactly as
 * written, because a heading may legitimately contain a backslash.
 */
export declare function readDocUpdateList(value: unknown): string[];
export {};
